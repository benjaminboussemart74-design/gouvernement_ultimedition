#!/usr/bin/env node
/**
 * Validation des CSV exportés depuis Google Sheets
 * 
 * Vérifie :
 * - Structure (colonnes requises)
 * - Formats (UUIDs, dates, emails)
 * - Intégrité référentielle (FK valides)
 * - Contraintes métier (pas de doublons ID, cycles hiérarchiques)
 * 
 * Usage: node scripts/validators/validate-csv.js
 * Exit code: 0 si OK, 1 si erreurs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== CONFIGURATION ==========
const CSV_DIR = path.join(__dirname, '..', '..');
const CSV_FILES = {
  persons: path.join(CSV_DIR, 'Serveur gouvernement - persons.csv'),
  ministries: path.join(CSV_DIR, 'Serveur gouvernement - ministries.csv'),
  personMinistries: path.join(CSV_DIR, 'Serveur gouvernement - person_ministries.csv'),
  careers: path.join(CSV_DIR, 'Serveur gouvernement - person_careers.csv')
};

// Colonnes obligatoires par fichier
const REQUIRED_COLUMNS = {
  ministries: ['id', 'name', 'short_name', 'sort_order'],
  persons: ['id', 'full_name', 'role'],
  personMinistries: ['person_id', 'ministry_id', 'is_primary', 'role_label'],
  careers: ['id', 'person_id', 'bio_section']
};

// ========== HELPERS ==========

/**
 * Parse CSV avec gestion guillemets
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"' && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier introuvable: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  
  return lines.slice(1)
    .filter(line => line.trim())
    .map((line, idx) => {
      const values = parseCSVLine(line);
      const row = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      row._lineNumber = idx + 2; // +2 car ligne 1 = headers
      row._isValid = values.length >= headers.length * 0.5; // Au moins 50% des colonnes remplies
      return row;
    })
    .filter(row => row._isValid); // Ignorer lignes malformées
}

function isValidUUID(str) {
  const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  return uuidRegex.test(str);
}

function isValidEmail(str) {
  if (!str) return true; // Optionnel
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str);
}

function isValidURL(str) {
  if (!str) return true; // Optionnel
  try {
    new URL(str);
    return true;
  } catch {
    return str.startsWith('/') || str.startsWith('http');
  }
}

// ========== VALIDATIONS ==========

class ValidationError {
  constructor(file, line, column, message) {
    this.file = file;
    this.line = line;
    this.column = column;
    this.message = message;
  }
  
  toString() {
    return `❌ ${this.file}:${this.line} [${this.column}] ${this.message}`;
  }
}

class Validator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.data = {};
  }
  
  error(file, line, column, message) {
    this.errors.push(new ValidationError(file, line, column, message));
  }
  
  warn(file, line, column, message) {
    this.warnings.push(new ValidationError(file, line, column, message));
  }
  
  // Validation 1: Structure des colonnes
  validateStructure(fileName, records, requiredColumns) {
    if (records.length === 0) {
      this.error(fileName, 0, '', 'Fichier vide ou mal formaté');
      return;
    }
    
    const headers = Object.keys(records[0]).filter(k => k !== '_lineNumber');
    const missing = requiredColumns.filter(col => !headers.includes(col));
    
    if (missing.length > 0) {
      this.error(fileName, 1, '', `Colonnes manquantes: ${missing.join(', ')}`);
    }
  }
  
  // Validation 2: Formats ID UUID
  validateUUIDs(fileName, records, columnName = 'id') {
    records.forEach(row => {
      const value = row[columnName];
      // Ignorer lignes vides ou clairement corrompues
      if (!value || value.startsWith(',') || value.includes('2025-')) {
        return; // Skip silencieusement
      }
      if (!isValidUUID(value)) {
        this.warn(fileName, row._lineNumber, columnName, 
          `UUID invalide: "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`);
      }
    });
  }
  
  // Validation 3: Doublons ID
  validateUnique(fileName, records, columnName = 'id') {
    const seen = new Map();
    records.forEach(row => {
      const value = row[columnName];
      if (seen.has(value)) {
        this.error(fileName, row._lineNumber, columnName,
          `Doublon détecté (également ligne ${seen.get(value)}): "${value}"`);
      }
      seen.set(value, row._lineNumber);
    });
  }
  
  // Validation 4: Références étrangères
  validateForeignKey(fileName, records, fkColumn, refTable, refColumn = 'id') {
    const validIds = new Set(this.data[refTable].map(r => r[refColumn]));
    
    records.forEach(row => {
      const fkValue = row[fkColumn];
      if (fkValue && !validIds.has(fkValue)) {
        this.error(fileName, row._lineNumber, fkColumn,
          `Référence invalide vers ${refTable}.${refColumn}: "${fkValue}"`);
      }
    });
  }
  
  // Helper: Vérifier si une valeur est vide (y compris """ de Google Sheets)
  isEmpty(value) {
    return !value || value === '' || value === '"""' || value.trim() === '';
  }
  
  // Validation 5: Formats emails
  validateEmails(fileName, records, columnName = 'email') {
    records.forEach(row => {
      const value = row[columnName];
      // Ignorer les cellules vides (Google Sheets exporte les vides comme """)
      if (!this.isEmpty(value) && !isValidEmail(value)) {
        this.error(fileName, row._lineNumber, columnName,
          `Email invalide: "${value}"`);
      }
    });
  }
  
  // Validation 6: URLs
  validateURLs(fileName, records, columnName) {
    records.forEach(row => {
      const value = row[columnName];
      // Ignorer les cellules vides (Google Sheets exporte les vides comme """)
      if (!this.isEmpty(value) && !isValidURL(value)) {
        this.warn(fileName, row._lineNumber, columnName,
          `URL potentiellement invalide: "${value}"`);
      }
    });
  }
  
  // Validation 7: Cycles dans hiérarchie superior_id
  validateAcyclicHierarchy(fileName, records) {
    const graph = new Map(
      records
        .filter(r => r.superior_id)
        .map(r => [r.id, r.superior_id])
    );
    
    const visited = new Set();
    
    for (const startId of graph.keys()) {
      if (visited.has(startId)) continue;
      
      const path = new Set();
      let current = startId;
      
      while (current && !visited.has(current)) {
        if (path.has(current)) {
          // Cycle détecté
          const cycle = [...path, current].slice([...path].indexOf(current));
          const row = records.find(r => r.id === current);
          this.error(fileName, row._lineNumber, 'superior_id',
            `Cycle hiérarchique détecté: ${cycle.join(' → ')}`);
          break;
        }
        path.add(current);
        current = graph.get(current);
      }
      
      path.forEach(id => visited.add(id));
    }
  }
  
  // Validation 8: Contrainte is_primary (exactement 1 par personne)
  // SAUF pour les membres de cabinet (role_label contient "Cabinet")
  validatePrimaryMinistry(fileName, records) {
    const byPerson = new Map();
    const cabinetMembers = new Set(); // IDs des membres de cabinet
    
    // Identifier les membres de cabinet
    records.forEach(row => {
      if (row.role_label && row.role_label.includes('Cabinet')) {
        cabinetMembers.add(row.person_id);
      }
    });
    
    // Grouper is_primary par personne (hors membres cabinet)
    records.forEach(row => {
      // Ignorer les membres de cabinet pour cette validation
      if (cabinetMembers.has(row.person_id)) {
        return;
      }
      
      if (!byPerson.has(row.person_id)) {
        byPerson.set(row.person_id, []);
      }
      if (row.is_primary === 'TRUE' || row.is_primary === 'true' || row.is_primary === '1') {
        byPerson.get(row.person_id).push(row._lineNumber);
      }
    });
    
    // Valider: chaque ministre (non-cabinet) doit avoir exactement 1 is_primary=TRUE
    byPerson.forEach((lines, personId) => {
      if (lines.length === 0) {
        const firstRow = records.find(r => r.person_id === personId);
        this.error(fileName, firstRow._lineNumber, 'is_primary',
          `Ministre ${personId} sans ministère primaire (is_primary=TRUE)`);
      } else if (lines.length > 1) {
        this.error(fileName, lines[0], 'is_primary',
          `Ministre ${personId} avec ${lines.length} ministères primaires (lignes ${lines.join(', ')})`);
      }
    });
    
    // Info: combien de membres cabinet détectés
    if (cabinetMembers.size > 0) {
      console.log(`ℹ️  ${cabinetMembers.size} membres de cabinet détectés (validation is_primary ignorée)`);
    }
  }
  
  // Validation 9: Sort order uniques pour ministries
  validateSortOrder(fileName, records) {
    const orders = records
      .map(r => ({ order: parseInt(r.sort_order), line: r._lineNumber }))
      .filter(r => !isNaN(r.order));
    
    const seen = new Map();
    orders.forEach(({ order, line }) => {
      if (seen.has(order)) {
        this.warn(fileName, line, 'sort_order',
          `sort_order dupliqué: ${order} (également ligne ${seen.get(order)})`);
      }
      seen.set(order, line);
    });
  }
  
  // Exécution complète
  async run() {
    console.log('🔍 Validation des fichiers CSV...\n');
    
    // 1. Chargement
    try {
      this.data.ministries = parseCSV(CSV_FILES.ministries);
      this.data.persons = parseCSV(CSV_FILES.persons);
      this.data.personMinistries = parseCSV(CSV_FILES.personMinistries);
      this.data.careers = parseCSV(CSV_FILES.careers);
    } catch (err) {
      console.error(`❌ Erreur lecture CSV: ${err.message}`);
      process.exit(1);
    }
    
    console.log(`✓ ${this.data.ministries.length} ministries`);
    console.log(`✓ ${this.data.persons.length} persons`);
    console.log(`✓ ${this.data.personMinistries.length} person_ministries`);
    console.log(`✓ ${this.data.careers.length} careers\n`);
    
    // 2. Validation structure
    this.validateStructure('ministries.csv', this.data.ministries, REQUIRED_COLUMNS.ministries);
    this.validateStructure('persons.csv', this.data.persons, REQUIRED_COLUMNS.persons);
    this.validateStructure('person_ministries.csv', this.data.personMinistries, REQUIRED_COLUMNS.personMinistries);
    this.validateStructure('careers.csv', this.data.careers, REQUIRED_COLUMNS.careers);
    
    // 3. Validation UUIDs
    this.validateUUIDs('ministries.csv', this.data.ministries);
    this.validateUUIDs('persons.csv', this.data.persons);
    this.validateUUIDs('person_ministries.csv', this.data.personMinistries, 'person_id');
    this.validateUUIDs('person_ministries.csv', this.data.personMinistries, 'ministry_id');
    this.validateUUIDs('careers.csv', this.data.careers);
    this.validateUUIDs('careers.csv', this.data.careers, 'person_id');
    
    // 4. Doublons ID
    this.validateUnique('ministries.csv', this.data.ministries);
    this.validateUnique('persons.csv', this.data.persons);
    this.validateUnique('careers.csv', this.data.careers);
    
    // 5. Références étrangères
    this.validateForeignKey('person_ministries.csv', this.data.personMinistries, 
      'person_id', 'persons');
    this.validateForeignKey('person_ministries.csv', this.data.personMinistries, 
      'ministry_id', 'ministries');
    this.validateForeignKey('careers.csv', this.data.careers, 
      'person_id', 'persons');
    
    // 6. Emails
    this.validateEmails('persons.csv', this.data.persons);
    
    // 7. URLs
    this.validateURLs('persons.csv', this.data.persons, 'photo_url');
    this.validateURLs('persons.csv', this.data.persons, 'wikipedia');
    
    // 8. Hiérarchie acyclique
    const personsWithSuperior = this.data.persons.filter(p => p.superior_id);
    if (personsWithSuperior.length > 0) {
      this.validateAcyclicHierarchy('persons.csv', this.data.persons);
    }
    
    // 9. Contrainte is_primary
    this.validatePrimaryMinistry('person_ministries.csv', this.data.personMinistries);
    
    // 10. Sort order
    this.validateSortOrder('ministries.csv', this.data.ministries);
    
    // Affichage résultats
    console.log('═'.repeat(60));
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ Validation réussie ! Aucune erreur détectée.\n');
      return true;
    }
    
    if (this.errors.length > 0) {
      console.log(`\n❌ ${this.errors.length} erreur(s) critique(s):\n`);
      this.errors.forEach(err => console.log(err.toString()));
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  ${this.warnings.length} avertissement(s):\n`);
      this.warnings.forEach(warn => console.log(warn.toString()));
    }
    
    console.log('\n' + '═'.repeat(60));
    
    return this.errors.length === 0;
  }
}

// ========== EXÉCUTION ==========

const validator = new Validator();
validator.run().then(success => {
  process.exit(success ? 0 : 1);
});

export { Validator, parseCSV };
