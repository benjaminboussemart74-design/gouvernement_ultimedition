#!/usr/bin/env node
// Test modal population for a specific person id
// Usage: node scripts/test_modal_for_id.js <person_uuid>

const path = require('path');
const https = require('https');
const { URL, URLSearchParams } = require('url');

const personId = process.argv[2] || process.env.PERSON_ID;
if (!personId) {
  console.error('Usage: node scripts/test_modal_for_id.js <person_uuid>');
  process.exit(2);
}

const configPath = path.resolve(process.cwd(), 'config', 'supabase.js');
let supabaseConfig;
try {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  supabaseConfig = require(configPath);
} catch (err) {
  console.error('Unable to load config/supabase.js:', err.message);
  process.exit(3);
}

const SUPABASE_URL = supabaseConfig && supabaseConfig.url ? supabaseConfig.url : '';
const SUPABASE_ANON_KEY = supabaseConfig && supabaseConfig.anonKey ? supabaseConfig.anonKey : '';
const SUPABASE_PERSONS_TABLE = supabaseConfig && supabaseConfig.ministersTable ? supabaseConfig.ministersTable : 'persons';
const SUPABASE_BIOGRAPHY_VIEW = supabaseConfig && supabaseConfig.biographyView ? supabaseConfig.biographyView : 'person_careers';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials. Provide SUPABASE_URL et SUPABASE_ANON_KEY via environnement ou config/supabase.local.json.');
  process.exit(4);
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

async function fetchPersonById(id) {
  const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${SUPABASE_PERSONS_TABLE}`;
  const q = `${endpoint}?id=eq.${id}`;
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

async function fetchBiographyFor(id) {
  const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${SUPABASE_BIOGRAPHY_VIEW}`;
  const params = new URLSearchParams({
    person_id: `eq.${id}`,
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

(async function(){
  try {
    console.log('Fetching person id:', personId);
    const person = await fetchPersonById(personId);
    if (!person) {
      console.error('Person not found.');
      process.exit(5);
    }
    const biography = await fetchBiographyFor(personId).catch((e)=>{ console.warn('biography fetch failed:', e.message); return []; });

    const JSDOM = require('jsdom').JSDOM;
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
    const photoEl = doc.getElementById('modal-photo');
    const roleEl = doc.getElementById('modal-role');
    const titleEl = doc.getElementById('modal-title');
    const portfolioEl = doc.getElementById('modal-portfolio');
    const descEl = doc.getElementById('modal-description');
    const biographySection = doc.querySelector('.modal-module--biography');
    const biographyRoot = doc.getElementById('modal-biography-root');

    const fullName = person.full_name || person.name || '';
    const jobTitle = person.job_title || person.job || person.role || '';
    const portfolio = person.portfolio || '';
    const bio = person.bio || person.description || '';
    const photo = person.photo || person.avatar_url || person.photo_url || '';

    if (photoEl && photo) photoEl.setAttribute('src', photo);
    if (roleEl) roleEl.textContent = jobTitle || '';
    if (titleEl) titleEl.textContent = fullName || '';
    if (portfolioEl) portfolioEl.textContent = portfolio || '';
    if (descEl) descEl.textContent = bio || '';

    if (Array.isArray(biography) && biography.length > 0 && biographyRoot) {
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
          const li = doc.createElement('li');
          li.textContent = [
            entry.start_text || entry.start_date || '',
            entry.end_text || entry.end_date || '',
            entry.title || '',
            entry.org || '',
          ].filter(Boolean).join(' — ');
          list.appendChild(li);
        });
        wrapper.appendChild(list);
        biographyRoot.appendChild(wrapper);
      });
      biographySection.removeAttribute('hidden');
    }

    console.log('--- Modal for person:', fullName, '('+personId+') ---');
    console.log('Job title:', jobTitle);
    console.log('Biography entries fetched:', biography.length);
    console.log('Biography section visible:', !biographySection.hasAttribute('hidden'));
    console.log('\n--- Rendered HTML snippet ---\n');
    console.log(dom.serialize());

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
