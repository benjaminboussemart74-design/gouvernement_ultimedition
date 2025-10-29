#!/usr/bin/env node
/*
  Test script: fetch one person and their careers from Supabase REST
  Populate a minimal modal HTML using jsdom and print results.
  Usage: (from project root)
    npm install jsdom
    node scripts/test_modal_population.js
*/

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const configPath = path.resolve(process.cwd(), 'config', 'supabase.js');
if (!fs.existsSync(configPath)) {
  console.error('config/supabase.js not found. Run from project root.');
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
const SUPABASE_PERSONS_TABLE = extractVar('window.SUPABASE_MINISTERS_TABLE', raw) || extractVar('SUPABASE_MINISTERS_TABLE', raw) || 'persons';
const SUPABASE_CAREERS_TABLE = extractVar('window.SUPABASE_CAREERS_TABLE', raw) || extractVar('SUPABASE_CAREERS_TABLE', raw) || 'person_careers';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in config/supabase.js');
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

async function fetchCareersFor(personId) {
  const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${SUPABASE_CAREERS_TABLE}`;
  const q = `${endpoint}?person_id=eq.${personId}&order=start_date.desc`;
  const res = await httpGet(q, {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: 'application/json',
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`careers request failed: ${res.status} ${res.statusText} - ${res.body}`);
  }
  return JSON.parse(res.body);
}

async function run() {
  console.log('Supabase:', SUPABASE_URL);
  console.log('Persons table:', SUPABASE_PERSONS_TABLE);
  console.log('Careers table:', SUPABASE_CAREERS_TABLE);

  const person = await fetchOnePerson();
  if (!person) {
    console.log('No person returned from persons table. Aborting.');
    process.exit(5);
  }
  console.log('Fetched person id:', person.id || '(no id field)');

  let careers = [];
  try {
    careers = await fetchCareersFor(person.id);
  } catch (err) {
    console.warn('Could not fetch careers:', err.message);
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
        <section class="modal-module modal-module--career" hidden>
          <h4 class="modal-module-title">Carrière</h4>
          <ul class="modal-career-list" id="modal-career-list"></ul>
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
  const careerSection = doc.querySelector('.modal-module--career');
  const careerList = doc.getElementById('modal-career-list');

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

  if (Array.isArray(careers) && careers.length > 0) {
    careerSection.removeAttribute('hidden');
    careers.forEach((c) => {
      const li = doc.createElement('li');
      // format dates
      const sd = c.start_date || c.start || '';
      const ed = c.end_date || c.end || '';
      const period = sd ? (ed ? `${sd} → ${ed}` : `${sd} → présent`) : '';
      const title = c.title || c.position || '';
      const org = c.organisation || c.organization || c.org || '';
      li.textContent = `${period} — ${title}${org ? ' — ' + org : ''}`;
      careerList.appendChild(li);
    });
  }

  console.log('--- Populated modal HTML ---\n');
  console.log(dom.serialize());
  console.log('\n--- Summary ---');
  console.log('Person:', fullName || '(no name)');
  console.log('Job title:', jobTitle || '(no job title)');
  console.log('Careers rows fetched:', careers.length);
  console.log('Career section visible:', !careerSection.hasAttribute('hidden'));

  process.exit(0);
}

run().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
