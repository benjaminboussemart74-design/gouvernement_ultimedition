#!/usr/bin/env node
// Quick tester: queries the Supabase REST endpoint for the careers table
// Usage: node scripts/test_supabase_careers.js

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const configPath = path.resolve(process.cwd(), 'config', 'supabase.js');
if (!fs.existsSync(configPath)) {
  console.error('Could not find config/supabase.js. Please ensure you run this from the project root.');
  process.exit(2);
}

const raw = fs.readFileSync(configPath, 'utf8');

function extractVar(name, src) {
  const re = new RegExp(name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + "\\s*=\\s*['\"]([^'\"]+)['\"]");
  const m = src.match(re);
  return m ? m[1] : null;
}

const SUPABASE_URL = extractVar('window.SUPABASE_URL', raw) || extractVar('SUPABASE_URL', raw);
const SUPABASE_ANON_KEY = extractVar('window.SUPABASE_ANON_KEY', raw) || extractVar('SUPABASE_ANON_KEY', raw);
const SUPABASE_CAREERS_TABLE = extractVar('window.SUPABASE_CAREERS_TABLE', raw) || extractVar('SUPABASE_CAREERS_TABLE', raw) || 'person_careers';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in config/supabase.js');
  process.exit(3);
}

const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${SUPABASE_CAREERS_TABLE}`;

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + (u.search || ''),
      port: u.port || 443,
      method: 'GET',
      headers,
    };

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

async function run() {
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('Careers table:', SUPABASE_CAREERS_TABLE);
  console.log('Querying', endpoint, '\n');

  try {
    const q = `${endpoint}?select=*&limit=50`;
    const res = await httpGet(q, {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
    });

    const { status, statusText, body } = res;
    if (status < 200 || status >= 300) {
      console.error('Request failed:', status, statusText);
      try {
        console.error('Body:', JSON.parse(body));
      } catch (e) {
        console.error('Body (raw):', body);
      }
      process.exit(4);
    }

    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      console.error('Failed to parse JSON response:', e.message);
      console.error('Raw body:', body);
      process.exit(7);
    }

    console.log('Returned rows:', Array.isArray(data) ? data.length : 'unknown');
    if (Array.isArray(data) && data.length > 0) {
      console.log('\nSample rows (first 5):');
      console.log(JSON.stringify(data.slice(0, 5), null, 2));
      process.exit(0);
    } else {
      console.log('No rows returned. The table may be empty or inaccessible.');
      process.exit(5);
    }
  } catch (err) {
    console.error('Fetch error:', err.message || err);
    process.exit(6);
  }
}

run();
