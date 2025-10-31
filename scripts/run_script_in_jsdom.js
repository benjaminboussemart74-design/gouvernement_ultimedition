#!/usr/bin/env node
/*
  Run the real `script.js` inside a jsdom environment.
  Usage: node scripts/run_script_in_jsdom.js

  This creates a JSDOM using the project's `index.html`, injects a small
  fake Supabase client that proxies to the REST API using the anon key,
  then injects `script.js` into the page and lets it run. Finally it
  waits for the initial data load and prints a short report (number of
  minister cards, presence of a specific person).
*/

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const https = require('https');
const { URL } = require('url');

const projectRoot = process.cwd();
const indexPath = path.join(projectRoot, 'index.html');
const scriptPath = path.join(projectRoot, 'script.js');
const configPath = path.join(projectRoot, 'config', 'supabase.js');

if (!fs.existsSync(indexPath) || !fs.existsSync(scriptPath) || !fs.existsSync(configPath)) {
  console.error('Missing required files (index.html, script.js or config/supabase.js). Run from project root.');
  process.exit(2);
}

let indexHtml = fs.readFileSync(indexPath, 'utf8');
const scriptJs = fs.readFileSync(scriptPath, 'utf8');

function sanitizeIndexHtml(html) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost' });
  const { document } = dom.window;

  const selectorsToStrip = [
    'link[rel="stylesheet"]',
    'link[rel="preconnect"]',
    'link[rel="preload"]',
    'link[rel="modulepreload"]',
    'link[rel="dns-prefetch"]',
    'script',
  ];

  selectorsToStrip.forEach((selector) => {
    const nodes = document.querySelectorAll(selector);
    nodes.forEach((node) => node.parentNode && node.parentNode.removeChild(node));
  });

  return dom.serialize();
}

indexHtml = sanitizeIndexHtml(indexHtml);

let supabaseConfig;
try {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  supabaseConfig = require(configPath);
} catch (err) {
  console.error('Unable to load config/supabase.js:', err.message);
  process.exit(3);
}

const SUPABASE_URL = supabaseConfig && supabaseConfig.url ? supabaseConfig.url : '';
const SUPABASE_ANON_KEY = supabaseConfig && supabaseConfig.anonKey ? supabaseConfig.anonKey : '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabase URL/Key not found. Configure SUPABASE_URL and SUPABASE_ANON_KEY via environment variables or config/supabase.local.json.');
  process.exit(3);
}

// Minimal helper to perform GET requests
function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { hostname: u.hostname, path: u.pathname + (u.search || ''), port: u.port || 443, method: 'GET', headers };
    const req = https.request(opts, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, statusText: res.statusMessage, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

// Build fake supabase client that proxies to REST endpoints
function createFakeSupabaseClient(baseUrl, anonKey) {
  baseUrl = baseUrl.replace(/\/$/, '');
  function Query(table) {
    this.table = table;
    this._select = '*';
    this._filters = [];
    this._orders = [];
    this._limit = null;
  }
  Query.prototype.select = function (sel) { this._select = sel || '*'; return this; };
  Query.prototype.eq = function (col, val) { this._filters.push({ type: 'eq', col, val }); return this; };
  Query.prototype.in = function (col, arr) { this._filters.push({ type: 'in', col, val: arr }); return this; };
  Query.prototype.ilike = function (col, pattern) { this._filters.push({ type: 'ilike', col, val: pattern }); return this; };
  Query.prototype.order = function (col, opts) {
    const dir = opts && opts.ascending === false ? 'desc' : 'asc';
    const foreign = opts && typeof opts.foreignTable === 'string' ? opts.foreignTable : null;
    this._orders.push({ col, dir, foreign });
    return this;
  };
  Query.prototype.limit = function (n) { this._limit = n; return this; };

  // make it awaitable: implement then
  Query.prototype.then = async function (resolve, reject) {
    try {
      const params = [];
      if (this._select) {
        let sel = String(this._select).replace(/\s+/g, ' ').trim();
        sel = sel.replace(/\s*\(\s*/g, '(').replace(/\s*\)\s*/g, ')').replace(/\s*,\s*/g, ',');
        params.push(`select=${encodeURIComponent(sel)}`);
      }
      this._filters.forEach((f) => {
        if (f.type === 'eq') {
          params.push(`${encodeURIComponent(f.col)}=eq.${encodeURIComponent(String(f.val))}`);
        } else if (f.type === 'in') {
          const list = Array.isArray(f.val) ? f.val.join(',') : String(f.val);
          params.push(`${encodeURIComponent(f.col)}=in.(${encodeURIComponent(list)})`);
        } else if (f.type === 'ilike') {
          params.push(`${encodeURIComponent(f.col)}=ilike.${encodeURIComponent(String(f.val))}`);
        }
      });
      if (this._orders.length) {
        this._orders.forEach((o) => {
          if (!o || !o.col) return;
          const prefix = o.foreign ? `${encodeURIComponent(o.foreign)}.` : '';
          params.push(`order=${prefix}${encodeURIComponent(o.col)}.${o.dir}`);
        });
      }
      if (this._limit != null) params.push(`limit=${encodeURIComponent(String(this._limit))}`);

      const qs = params.length ? `?${params.join('&')}` : '';
      const url = `${baseUrl}/rest/v1/${this.table}${qs}`;
      const res = await httpGet(url, { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: 'application/json' });
      if (res.status >= 200 && res.status < 300) {
        const data = JSON.parse(res.body || '[]');
        return resolve({ data, error: null });
      }
      // non-2xx
      let err = { message: res.body };
      try { err = JSON.parse(res.body); } catch (e) { /* keep raw */ }
      return resolve({ data: null, error: err });
    } catch (e) {
      return resolve({ data: null, error: { message: e.message } });
    }
  };

  return {
    from(table) { return new Query(table); }
  };
}

(async function run() {
  const dom = new JSDOM(indexHtml, { runScripts: "dangerously", resources: "usable", url: 'http://localhost' });
  const { window } = dom;

  // Inject SUPABASE globals and fake client before loading script.js
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
  window.supabase = { createClient: () => createFakeSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY) };

  // Also provide fetch (node doesn't include in older versions); jsdom provides fetch on window
  // Append script content into DOM so it runs in the page context
  const s = window.document.createElement('script');
  s.textContent = fs.readFileSync(scriptPath, 'utf8');
  window.document.body.appendChild(s);

  // Wait for loadMinisters to complete; script.js calls loadMinisters in initApp during DOMContentLoaded.
  // We'll poll until grid has child nodes or timeout.
  const gridSelector = '#ministers-grid';
  const waitUntil = Date.now() + 8000; // 8s timeout
  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  while (Date.now() < waitUntil) {
    const grid = window.document.querySelector(gridSelector);
    if (grid && grid.querySelectorAll('.minister-card').length) break;
    await sleep(200);
  }

  const grid = window.document.querySelector(gridSelector);
  const count = grid ? grid.querySelectorAll('.minister-card').length : 0;
  console.log('Minister cards rendered:', count);

  // Check for Gérald Darmanin card
  const darmanin = window.document.querySelector('[data-person-id="1a08d2d3-06b2-424f-acb5-567047e5b25c"]');
  console.log('Gérald Darmanin card present:', Boolean(darmanin));

  if (darmanin) {
    console.log('Card HTML snippet:\n', darmanin.outerHTML.slice(0, 800));
  }

  // Also test opening modal for Darmanin using the openModal function if defined
  if (typeof window.openModal === 'function') {
    try {
      // find minister data in script's ministers array
      const person = window.ministers && window.ministers.find((p) => String(p.id) === '1a08d2d3-06b2-424f-acb5-567047e5b25c');
      if (person) {
        window.openModal(person);
        const modal = window.document.getElementById('minister-modal');
        const bioSection = modal ? modal.querySelector('.modal-module--biography') : null;
        const bioLists = modal ? modal.querySelectorAll('.biography-list li').length : 0;
        console.log('Modal opened, biography entries:', bioLists, 'biography section visible:', bioSection && !bioSection.hasAttribute('hidden'));
      }
    } catch (e) {
      console.warn('Could not call openModal:', e.message);
    }
  }

  // serialize a small portion for debugging
  console.log('\n--- Partial page HTML (ministers grid) ---\n');
  console.log(grid ? grid.innerHTML.slice(0, 2000) : '(no grid)');

  process.exit(0);
})();
