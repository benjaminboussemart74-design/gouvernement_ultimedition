#!/usr/bin/env node
/*
  Test script: fetch one person and their careers from Supabase REST
  Populate a minimal modal HTML using jsdom and print results.
  Usage: (from project root)
    npm install jsdom
    node scripts/test_modal_population.js
*/

const path = require('path');
const https = require('https');
const { URL, URLSearchParams } = require('url');

const configPath = path.resolve(process.cwd(), 'config', 'supabase.js');
let supabaseConfig;
try {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  supabaseConfig = require(configPath);
} catch (err) {
  console.error('Unable to load config/supabase.js:', err.message);
  process.exit(2);
}

const SUPABASE_URL = supabaseConfig && supabaseConfig.url ? supabaseConfig.url : '';
const SUPABASE_ANON_KEY = supabaseConfig && supabaseConfig.anonKey ? supabaseConfig.anonKey : '';
const SUPABASE_PERSONS_TABLE = supabaseConfig && supabaseConfig.ministersTable ? supabaseConfig.ministersTable : 'persons';
const SUPABASE_BIOGRAPHY_VIEW = supabaseConfig && supabaseConfig.biographyView ? supabaseConfig.biographyView : 'biography_entries_view';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials. Provide SUPABASE_URL and SUPABASE_ANON_KEY via environment variables or config/supabase.local.json.');
  process.exit(3);
}

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

async function fetchOnePerson() {
  const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${SUPABASE_PERSONS_TABLE}`;
  const q = `${endpoint}?select=*&limit=1`;
  const res = await httpGet(q, {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: 'application/json',
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`persons request failed: ${res.status} ${res.statusText} - ${res.body}`);
  }
  const data = JSON.parse(res.body);
  return data[0] || null;
}

async function fetchBiographyFor(personId) {
  const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${SUPABASE_BIOGRAPHY_VIEW}`;
  const params = new URLSearchParams({
    person_id: `eq.${personId}`,
    order: 'category.asc,sort_weight.asc,start_date_nullsafe.desc,created_at.desc',
  });
  const q = `${endpoint}?${params.toString()}`;
  const res = await httpGet(q, {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: 'application/json',
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`biography request failed: ${res.status} ${res.statusText} - ${res.body}`);
  }
  return JSON.parse(res.body);
}

async function run() {
  console.log('Supabase:', SUPABASE_URL);
  console.log('Persons table:', SUPABASE_PERSONS_TABLE);
  console.log('Biography view:', SUPABASE_BIOGRAPHY_VIEW);

  const person = await fetchOnePerson();
  if (!person) {
    console.log('No person returned from persons table. Aborting.');
    process.exit(5);
  }
  console.log('Fetched person id:', person.id || '(no id field)');

  let biography = [];
  try {
    biography = await fetchBiographyFor(person.id);
  } catch (err) {
    console.warn('Could not fetch biography:', err.message);
  }

  // Lazily require jsdom (ensure installed)
  let JSDOM;
  try {
    JSDOM = require('jsdom').JSDOM;
  } catch (e) {
    console.error('jsdom is not installed. Run: npm install jsdom');
    process.exit(6);
  }

  const modalHTML = `
  <div class="modal" id="minister-modal">
    <div class="modal-body">
      <div class="modal-layout">
        <div class="modal-module modal-module--photo">
          <div class="modal-photo-frame">
            <img class="modal-photo" id="modal-photo" src="" alt="" />
          </div>
        </div>
        <div class="modal-module modal-module--identity">
          <p class="modal-role" id="modal-role"></p>
          <h3 class="modal-identity-title" id="modal-title"></h3>
          <p class="modal-portfolio" id="modal-portfolio"></p>
        </div>
        <div class="modal-module modal-module--description">
          <p class="modal-description" id="modal-description"></p>
        </div>
        <section class="modal-module modal-module--biography" hidden>
          <div class="modal-biography">
            <h4 class="modal-module-title">Biographie</h4>
            <div class="biography-groups" id="modal-biography-root"></div>
          </div>
        </section>
      </div>
    </div>
  </div>
  `;

  const dom = new JSDOM(modalHTML);
  const doc = dom.window.document;

  // Populate fields - best-effort mapping (adjust to your persons schema)
  const photoEl = doc.getElementById('modal-photo');
  const roleEl = doc.getElementById('modal-role');
  const titleEl = doc.getElementById('modal-title');
  const portfolioEl = doc.getElementById('modal-portfolio');
  const descEl = doc.getElementById('modal-description');
  const biographySection = doc.querySelector('.modal-module--biography');
  const biographyRoot = doc.getElementById('modal-biography-root');

  // Common field names in the app: full_name, job_title, portfolio, bio, mission, photo_url
  const fullName = person.full_name || person.name || person.display_name || '';
  const jobTitle = person.job_title || person.job || person.role || '';
  const portfolio = person.portfolio || person.poste || '';
  const bio = person.bio || person.description || '';
  const photo = person.photo || person.avatar_url || person.photo_url || '';

  if (photoEl && photo) photoEl.setAttribute('src', photo);
  if (roleEl) roleEl.textContent = jobTitle || '';
  if (titleEl) titleEl.textContent = fullName || '';
  if (portfolioEl) portfolioEl.textContent = portfolio || '';
  if (descEl) descEl.textContent = bio || '';
  // mission field removed from modal; no assignment

  if (Array.isArray(biography) && biography.length > 0 && biographyRoot) {
    biographySection.removeAttribute('hidden');
    const groups = new Map();
    biography.forEach((entry) => {
      const category = entry && entry.category ? entry.category : 'Autres';
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(entry);
    });
    groups.forEach((items, category) => {
      const wrapper = doc.createElement('article');
      wrapper.className = 'biography-group';
      const heading = doc.createElement('h5');
      heading.textContent = category;
      wrapper.appendChild(heading);
      const list = doc.createElement('ul');
      list.className = 'biography-list';
      items.forEach((entry) => {
        const parts = [];
        const start = entry.start_text || entry.start_date || '';
        const end = entry.end_text || entry.end_date || '';
        if (start && end) {
          parts.push(`${start} → ${end}`);
        } else if (start) {
          parts.push(start);
        } else if (end) {
          parts.push(end);
        }
        if (entry.title) parts.push(entry.title);
        if (entry.org) parts.push(entry.org);
        const item = doc.createElement('li');
        item.textContent = parts.join(' — ');
        list.appendChild(item);
      });
      wrapper.appendChild(list);
      biographyRoot.appendChild(wrapper);
    });
  }

  console.log('--- Populated modal HTML ---\n');
  console.log(dom.serialize());
  console.log('\n--- Summary ---');
  console.log('Person:', fullName || '(no name)');
  console.log('Job title:', jobTitle || '(no job title)');
  console.log('Biography rows fetched:', biography.length);
  console.log('Biography section visible:', !biographySection.hasAttribute('hidden'));

  process.exit(0);
}

run().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
