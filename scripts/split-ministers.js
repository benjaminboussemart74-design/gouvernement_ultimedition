#!/usr/bin/env node
/**
 * Génère un fichier JSON par ministre à partir d'un fichier unique (ex: export JSON brut)
 * pour rendre les biographies et collaborateurs plus lisibles.
 * 
 * L'entrée par défaut était data/ministers.json (désormais supprimé).
 * Passez un chemin explicite si vous avez un fichier source à éclater.
 *
 * Usage: node scripts/split-ministers.js path/to/source.json
 */

const fs = require('fs');
const path = require('path');

const SOURCE_FILE = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', 'data', 'ministers.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'ministers');
const INDEX_FILE = path.join(OUTPUT_DIR, 'index.json');

if (!fs.existsSync(SOURCE_FILE)) {
  console.error(`❌ Fichier source introuvable: ${SOURCE_FILE}`);
  console.error('ℹ️  Fournissez un chemin explicite: node scripts/split-ministers.js path/to/source.json');
  process.exit(1);
}

let ministers;
try {
  ministers = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf-8'));
} catch (error) {
  console.error('❌ Erreur de parsing JSON:', error.message);
  process.exit(1);
}

if (!Array.isArray(ministers)) {
  console.error('❌ Le fichier source doit contenir un tableau');
  process.exit(1);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Nettoyer les anciens fichiers JSON générés
fs.readdirSync(OUTPUT_DIR)
  .filter((file) => file.endsWith('.json'))
  .forEach((file) => fs.unlinkSync(path.join(OUTPUT_DIR, file)));

const slugify = (input, fallback) => {
  if (!input || typeof input !== 'string') {
    return fallback;
  }

  const ascii = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const slug = ascii.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return slug || fallback;
};

const manifest = ministers.map((minister, index) => {
  const safeId = minister.id || `minister-${index + 1}`;
  const slug = slugify(minister.name, safeId).slice(0, 80);
  const fileName = `${slug}-${safeId}.json`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  const payload = {
    ...minister,
    biography: Array.isArray(minister.biography) ? minister.biography : [],
    collaborators: Array.isArray(minister.collaborators) ? minister.collaborators : [],
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');

  return {
    id: minister.id,
    name: minister.name,
    role: minister.role,
    portfolio: minister.portfolio,
    file: path.join('data', 'ministers', fileName),
  };
});

fs.writeFileSync(INDEX_FILE, JSON.stringify(manifest, null, 2), 'utf-8');

console.log(`✅ ${manifest.length} fichiers générés dans ${path.relative(process.cwd(), OUTPUT_DIR)}`);
console.log(`📄 Index disponible: ${path.relative(process.cwd(), INDEX_FILE)}`);
