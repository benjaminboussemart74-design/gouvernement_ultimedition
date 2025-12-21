#!/usr/bin/env node
/**
 * Réordonne les biographies de chaque ministre par bioSection puis par sortIndex.
 * Utilise data/ministers/index.json comme manifest.
 *
 * Usage: node scripts/sort-biographies.js
 */

const fs = require('fs');
const path = require('path');

const INDEX_FILE = path.join(__dirname, '..', 'data', 'ministers', 'index.json');

if (!fs.existsSync(INDEX_FILE)) {
  console.error('❌ Index introuvable:', INDEX_FILE);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
if (!Array.isArray(manifest) || manifest.length === 0) {
  console.error('❌ Index vide ou invalide');
  process.exit(1);
}

const normaliseSection = (value) =>
  (value || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

let updated = 0;
manifest.forEach((entry) => {
  if (!entry?.file) return;
  const filePath = path.join(__dirname, '..', entry.file);
  if (!fs.existsSync(filePath)) return;

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!Array.isArray(data.biography)) return;

  const sortedBio = [...data.biography].sort((a, b) => {
    const sectA = normaliseSection(a?.bioSection);
    const sectB = normaliseSection(b?.bioSection);
    if (sectA !== sectB) return sectA.localeCompare(sectB, 'fr');
    const idxA = typeof a?.sortIndex === 'number' ? a.sortIndex : 999;
    const idxB = typeof b?.sortIndex === 'number' ? b.sortIndex : 999;
    return idxA - idxB;
  });

  const original = JSON.stringify(data.biography);
  const reordered = JSON.stringify(sortedBio);
  if (original !== reordered) {
    data.biography = sortedBio;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    updated += 1;
  }
});

console.log(`✅ Biographies réordonnées pour ${updated} fiche(s) sur ${manifest.length}`);
