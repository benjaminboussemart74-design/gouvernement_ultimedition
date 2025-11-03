#!/usr/bin/env node
/*
  Validate careers dates and ordering for a given person_id.

  - Fetches rows from `person_careers` (Supabase REST) for the given person_id
  - Checks that each entry has at least one displayable date (start/end/event)
  - Verifies ordering rules used by the front:
      1) Sections (bio_section) sorted by minimal sort_index ascending
      2) Items within a section sorted by sort_index ascending

  Usage:
    node scripts/validate_careers_order.js <PERSON_ID>

  It reads Supabase credentials from config/supabase.js
*/

const https = require('https');
const path = require('path');

const personId = (process.argv[2] || '').trim();
if (!personId) {
  console.error('Usage: node scripts/validate_careers_order.js <PERSON_ID>');
  process.exit(2);
}

const configPath = path.resolve(process.cwd(), 'config', 'supabase.js');
let cfg;
try {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  cfg = require(configPath);
} catch (err) {
  console.error('Unable to load config/supabase.js:', err.message);
  process.exit(3);
}

const SUPABASE_URL = (cfg && cfg.url) || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (cfg && cfg.anonKey) || process.env.SUPABASE_ANON_KEY || '';
const CAREERS_TABLE = (cfg && (cfg.biographyView || cfg.careersTable)) || 'person_careers';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase URL/ANON KEY. Provide them in config/supabase.js or env.');
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

const isoLike = (s) => /^\d{4}(-\d{2}(-\d{2})?)?$/.test(s);

function hasDisplayableDate(row) {
  const s = row.start_date ? String(row.start_date) : '';
  const e = row.end_date ? String(row.end_date) : '';
  const ev = row.event_date ? String(row.event_date) : '';
  return Boolean((s && isoLike(s)) || (e && isoLike(e)) || (ev && isoLike(ev)));
}

function sortGroupsByMinIndex(groups) {
  const entries = Array.from(groups.entries()).map(([section, items]) => {
    const minIdx = Math.min(
      ...items.map((it) => (Number.isFinite(it.sort_index) ? it.sort_index : Number.POSITIVE_INFINITY))
    );
    return { section, items, minIdx };
  });
  entries.sort((a, b) => (a.minIdx === b.minIdx ? a.section.localeCompare(b.section, 'fr') : a.minIdx - b.minIdx));
  return entries;
}

async function run() {
  const base = SUPABASE_URL.replace(/\/$/, '');
  const endpoint = `${base}/rest/v1/${CAREERS_TABLE}`;
  const params = new URLSearchParams({
    person_id: `eq.${personId}`,
    order: 'sort_index.asc,start_date.desc,created_at.desc',
  });
  const url = `${endpoint}?${params.toString()}`;

  const res = await httpGet(url, {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: 'application/json',
  });
  if (res.status < 200 || res.status >= 300) {
    console.error('Supabase request failed:', res.status, res.statusText, res.body);
    process.exit(5);
  }
  const rows = JSON.parse(res.body);

  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('No careers rows for person_id:', personId);
    process.exit(0);
  }

  // Group by bio_section
  const bySection = new Map();
  rows.forEach((r) => {
    const s = (r.bio_section || 'Autres').trim() || 'Autres';
    if (!bySection.has(s)) bySection.set(s, []);
    bySection.get(s).push(r);
  });

  const issues = [];

  // 1) Validate dates presence
  rows.forEach((r, i) => {
    if (!hasDisplayableDate(r)) {
      issues.push({
        type: 'date-missing',
        index: i,
        message: `No valid date in row ${i + 1} (title: ${r.title || '—'})`,
      });
    }
  });

  // 2) Validate items order inside each section (sort_index ascending)
  for (const [section, items] of bySection.entries()) {
    const indices = items.map((r) => (Number.isFinite(r.sort_index) ? r.sort_index : Number.POSITIVE_INFINITY));
    for (let i = 1; i < indices.length; i += 1) {
      if (indices[i] < indices[i - 1]) {
        issues.push({
          type: 'bad-order-section',
          section,
          message: `Section "${section}": sort_index not ascending at position ${i} (${indices[i - 1]} -> ${indices[i]})`,
        });
        break;
      }
    }
  }

  // 3) Compute and show sections order by minimal sort_index (as in the UI)
  const orderedSections = sortGroupsByMinIndex(bySection).map((e) => e.section);

  // Report
  console.log('Checked careers for person:', personId);
  console.log('Total rows:', rows.length);
  console.log('Sections (by minimal sort_index):', orderedSections.join(' | '));

  if (issues.length) {
    console.log('\nIssues found:', issues.length);
    issues.forEach((it) => console.log('-', it.message));
    process.exit(1);
  }

  console.log('\nOK: dates present and ordering by sort_index looks consistent.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Error:', err && err.message ? err.message : err);
  process.exit(1);
});

