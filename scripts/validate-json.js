#!/usr/bin/env node
/**
 * Script de validation des fichiers data/ministers/ (index + fiches individuelles)
 * 
 * Vérifie la structure et l'intégrité des fichiers générés.
 * 
 * Usage: node scripts/validate-json.js
 */

const fs = require('fs');
const path = require('path');

const INDEX_FILE = path.join(__dirname, '..', 'data', 'ministers', 'index.json');
const VALID_ROLES = ['president', 'leader', 'minister-state', 'minister', 'minister-delegate', 'ministre-delegue', 'secretary'];

console.log('🔍 Validation de data/ministers/...\n');

// ========== CHARGEMENT ==========

if (!fs.existsSync(INDEX_FILE)) {
  console.error('❌ Index introuvable:', INDEX_FILE);
  process.exit(1);
}

let manifest;
try {
  const content = fs.readFileSync(INDEX_FILE, 'utf-8');
  manifest = JSON.parse(content);
} catch (error) {
  console.error('❌ Erreur de parsing JSON:', error.message);
  process.exit(1);
}

if (!Array.isArray(manifest)) {
  console.error('❌ Le fichier index doit contenir un tableau JSON');
  process.exit(1);
}

if (manifest.length === 0) {
  console.error('❌ Le fichier index est vide');
  process.exit(1);
}

console.log(`✓ Index chargé: ${manifest.length} entrées\n`);

// ========== VALIDATION ==========

const errors = [];
const warnings = [];
const ministers = [];
const seenIds = new Set();

manifest.forEach((entry, idx) => {
  const prefix = `Index #${idx + 1}`;
  if (!entry || typeof entry !== 'object') {
    errors.push(`${prefix}: entrée invalide`);
    return;
  }

  if (!entry.file) {
    errors.push(`${prefix}: champ 'file' manquant`);
    return;
  }

  const filePath = path.join(__dirname, '..', entry.file);
  if (!fs.existsSync(filePath)) {
    errors.push(`${prefix}: fichier introuvable ${entry.file}`);
    return;
  }

  let minister;
  try {
    minister = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    ministers.push(minister);
  } catch (error) {
    errors.push(`${prefix}: JSON invalide dans ${entry.file} (${error.message})`);
    return;
  }

  if (minister.id && seenIds.has(minister.id)) {
    warnings.push(`${prefix}: id dupliqué ${minister.id}`);
  }
  if (minister.id) {
    seenIds.add(minister.id);
  }
});

ministers.forEach((minister, idx) => {
  const prefix = `Ministre #${idx + 1}`;
  
  // Champs obligatoires
  if (!minister.id) {
    errors.push(`${prefix}: champ 'id' manquant`);
  }
  
  if (!minister.name || minister.name.trim() === '') {
    errors.push(`${prefix} (${minister.id}): champ 'name' manquant ou vide`);
  }
  
  if (!minister.role) {
    errors.push(`${prefix} (${minister.name}): champ 'role' manquant`);
  } else if (!VALID_ROLES.includes(minister.role)) {
    errors.push(`${prefix} (${minister.name}): rôle invalide "${minister.role}". Valeurs autorisées: ${VALID_ROLES.join(', ')}`);
  }
  
  // Champs optionnels mais importants
  if (!minister.portfolio) {
    warnings.push(`${prefix} (${minister.name}): 'portfolio' vide`);
  }
  
  if (!minister.photo || minister.photo === '') {
    warnings.push(`${prefix} (${minister.name}): 'photo' vide`);
  }
  
  // Vérification des photos locales
  if (minister.photo && minister.photo.startsWith('assets/')) {
    const photoPath = path.join(__dirname, '..', minister.photo);
    if (!fs.existsSync(photoPath)) {
      errors.push(`${prefix} (${minister.name}): photo introuvable: ${minister.photo}`);
    }
  }
  
  // Vérification ministries
  if (!Array.isArray(minister.ministries)) {
    errors.push(`${prefix} (${minister.name}): 'ministries' doit être un tableau`);
  } else if (minister.ministries.length === 0 && minister.role !== 'president') {
    warnings.push(`${prefix} (${minister.name}): aucun ministère associé`);
  }
  
  // Vérification biography
  if (!Array.isArray(minister.biography)) {
    errors.push(`${prefix} (${minister.name}): 'biography' doit être un tableau`);
  }
  
  // Vérification collaborators
  if (!Array.isArray(minister.collaborators)) {
    errors.push(`${prefix} (${minister.name}): 'collaborators' doit être un tableau`);
  }
  
  // Vérification delegates
  if (!Array.isArray(minister.delegates)) {
    errors.push(`${prefix} (${minister.name}): 'delegates' doit être un tableau`);
  }
});

// ========== STATISTIQUES ==========

console.log('📊 Statistiques:\n');

const roleCount = {};
ministers.forEach(m => {
  roleCount[m.role] = (roleCount[m.role] || 0) + 1;
});

Object.entries(roleCount).forEach(([role, count]) => {
  console.log(`  - ${role}: ${count}`);
});

const withBio = ministers.filter(m => m.biography && m.biography.length > 0).length;
const withPhoto = ministers.filter(m => m.photo && m.photo !== '').length;
const withCollabs = ministers.filter(m => m.collaborators && m.collaborators.length > 0).length;

console.log(`\n  - Avec biographie: ${withBio}/${ministers.length}`);
console.log(`  - Avec photo: ${withPhoto}/${ministers.length}`);
console.log(`  - Avec collaborateurs: ${withCollabs}/${ministers.length}`);

// ========== RÉSULTAT ==========

console.log('\n' + '='.repeat(50));

if (errors.length > 0) {
  console.error(`\n❌ ${errors.length} erreur(s) détectée(s):\n`);
  errors.forEach(err => console.error(`  - ${err}`));
}

if (warnings.length > 0) {
  console.warn(`\n⚠️  ${warnings.length} avertissement(s):\n`);
  warnings.slice(0, 10).forEach(warn => console.warn(`  - ${warn}`));
  if (warnings.length > 10) {
    console.warn(`  ... et ${warnings.length - 10} autre(s) avertissement(s)`);
  }
}

if (errors.length === 0) {
  console.log('\n✅ Validation réussie ! Le fichier est conforme.\n');
  process.exit(0);
} else {
  console.log('\n');
  process.exit(1);
}
