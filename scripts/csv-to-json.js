#!/usr/bin/env node
/**
 * Script de conversion CSV → JSON pour migration Supabase → GitHub Pages
 * 
 * Lit les 4 fichiers CSV exportés de Supabase et génère data/ministers.json
 * avec toutes les jointures nécessaires.
 * 
 * Usage: node scripts/csv-to-json.js
 */

const fs = require('fs');
const path = require('path');

// ========== CONFIGURATION ==========
const CSV_DIR = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'ministers.json');

const CSV_FILES = {
  persons: path.join(CSV_DIR, 'Serveur gouvernement - persons.csv'),
  ministries: path.join(CSV_DIR, 'Serveur gouvernement - ministries.csv'),
  personMinistries: path.join(CSV_DIR, 'Serveur gouvernement - person_ministries.csv'),
  careers: path.join(CSV_DIR, 'Serveur gouvernement - person_careers.csv')
};

// Rôles considérés comme "ministres" (pas collaborateurs)
const MINISTER_ROLES = new Set([
  'president',
  'leader',
  'minister-state',
  'minister',
  'minister-delegate',
  'ministre-delegue',
  'secretary'
]);

// ========== HELPERS ==========

/**
 * Parse simple CSV (sans gestion des guillemets complexes)
 * Pour un CSV plus complexe, utilisez une librairie comme papaparse
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, i) => {
      obj[header.trim()] = values[i]?.trim() || '';
    });
    return obj;
  });
}

/**
 * Parse date format dd/mm/yyyy → yyyy-mm-dd
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  
  // Si déjà au format ISO (yyyy-mm-dd)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.split('T')[0]; // Enlever l'heure si présente
  }
  
  // Format dd/mm/yyyy
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

/**
 * Nettoie une valeur (enlève espaces, remplace vides par null)
 */
function clean(value) {
  if (value == null || value === '') return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

// ========== CHARGEMENT DES CSV ==========

console.log('📂 Chargement des CSV...');

const personsRaw = parseCSV(CSV_FILES.persons);
const ministriesRaw = parseCSV(CSV_FILES.ministries);
const personMinistriesRaw = parseCSV(CSV_FILES.personMinistries);
const careersRaw = parseCSV(CSV_FILES.careers);

console.log(`  ✓ ${personsRaw.length} personnes`);
console.log(`  ✓ ${ministriesRaw.length} ministères`);
console.log(`  ✓ ${personMinistriesRaw.length} relations person_ministries`);
console.log(`  ✓ ${careersRaw.length} entrées biographiques`);

// ========== INDEXATION ==========

// Index des ministères par ID
const ministriesById = new Map();
ministriesRaw.forEach(m => {
  ministriesById.set(m.id, {
    id: m.id,
    name: clean(m.name),
    shortName: clean(m.short_name),
    color: clean(m.color),
    category: clean(m.category),
    sortOrder: parseInt(m.sort_order) || 999,
    parentMinistryId: clean(m.parent_ministry_id)
  });
});

// Index des relations person_ministries par person_id
const ministriesByPerson = new Map();
personMinistriesRaw.forEach(pm => {
  const personId = pm.person_id;
  if (!personId) return;
  
  if (!ministriesByPerson.has(personId)) {
    ministriesByPerson.set(personId, []);
  }
  
  ministriesByPerson.get(personId).push({
    ministryId: clean(pm.ministry_id),
    isPrimary: pm.is_primary === 'TRUE' || pm.is_primary === 'true' || pm.is_primary === '1',
    roleLabel: clean(pm.role_label),
    startDate: parseDate(pm.start_date),
    endDate: parseDate(pm.end_date)
  });
});

// Index des biographies par person_id
const careersByPerson = new Map();
careersRaw.forEach(c => {
  const personId = c.person_id;
  if (!personId) return;
  
  if (!careersByPerson.has(personId)) {
    careersByPerson.set(personId, []);
  }
  
  careersByPerson.get(personId).push({
    title: clean(c.title),
    organization: clean(c.organisation),
    bioSection: clean(c.bio_section),
    startDate: parseDate(c.start_date),
    endDate: parseDate(c.end_date),
    eventDate: parseDate(c.event_date),
    eventText: clean(c.event_text),
    ongoing: c.ongoing === 'TRUE' || c.ongoing === 'true',
    sortIndex: parseInt(c.sort_index) || 999
  });
});

// Trier les biographies par sort_index
careersByPerson.forEach(careers => {
  careers.sort((a, b) => a.sortIndex - b.sortIndex);
});

// Index des collaborateurs par superior_id
const collaboratorsBySuperior = new Map();
personsRaw
  .filter(p => p.role === 'collaborator')
  .forEach(collab => {
    const superiorId = collab.superior_id;
    if (!superiorId) return;
    
    if (!collaboratorsBySuperior.has(superiorId)) {
      collaboratorsBySuperior.set(superiorId, []);
    }
    
    collaboratorsBySuperior.get(superiorId).push(clean(collab.full_name));
  });

// ========== CONSTRUCTION DES MINISTRES ==========

console.log('\n🔧 Construction des données ministres...');

const ministers = personsRaw
  .filter(person => MINISTER_ROLES.has(person.role))
  .map(person => {
    const personId = person.id;
    
    // Récupérer les ministères liés
    const pmLinks = ministriesByPerson.get(personId) || [];
    const ministries = pmLinks
      .map(link => {
        const ministry = ministriesById.get(link.ministryId);
        if (!ministry) return null;
        
        return {
          id: ministry.id,
          name: ministry.name,
          shortName: ministry.shortName,
          color: ministry.color,
          isPrimary: link.isPrimary,
          roleLabel: link.roleLabel
        };
      })
      .filter(Boolean);
    
    // Trier : primary en premier, puis alphabétique
    ministries.sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) {
        return a.isPrimary ? -1 : 1;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
    
    // Portfolio = nom du ministère primary (ou premier ministère)
    const primaryMinistry = ministries.find(m => m.isPrimary) || ministries[0];
    const portfolio = primaryMinistry?.name || 'Portefeuille à préciser';
    
    // Biographie
    const biography = careersByPerson.get(personId) || [];
    
    // Collaborateurs
    const collaborators = collaboratorsBySuperior.get(personId) || [];
    
    return {
      id: personId,
      name: clean(person.full_name) || 'Nom inconnu',
      role: person.role,
      email: clean(person.email) || '',
      party: clean(person.party) || '',
      photo: clean(person.photo_url) || '',
      portfolio,
      description: clean(person.description) || '',
      ministries,
      superiorId: clean(person.superior_id),
      delegates: [], // Sera calculé après
      biography,
      collaborators
    };
  });

// Calculer les delegates (ministres délégués rattachés)
const delegateRoles = new Set(['minister-delegate', 'ministre-delegue', 'secretary']);
ministers.forEach(minister => {
  minister.delegates = ministers
    .filter(m => m.superiorId === minister.id && delegateRoles.has(m.role))
    .map(m => m.id);
});

console.log(`  ✓ ${ministers.length} ministres générés`);

// ========== SAUVEGARDE JSON ==========

console.log(`\n💾 Sauvegarde dans ${path.relative(process.cwd(), OUTPUT_FILE)}...`);

fs.writeFileSync(
  OUTPUT_FILE,
  JSON.stringify(ministers, null, 2),
  'utf-8'
);

console.log('✅ Conversion terminée avec succès !');
console.log(`\n📊 Statistiques :`);
console.log(`   - ${ministers.length} ministres`);
console.log(`   - ${ministers.filter(m => m.role === 'leader').length} premier ministre`);
console.log(`   - ${ministers.filter(m => m.role === 'minister').length} ministres`);
console.log(`   - ${ministers.filter(m => delegateRoles.has(m.role)).length} ministres délégués/secrétaires d'État`);
console.log(`   - ${ministers.reduce((sum, m) => sum + m.biography.length, 0)} entrées biographiques`);
console.log(`   - ${ministers.reduce((sum, m) => sum + m.collaborators.length, 0)} collaborateurs indexés`);
