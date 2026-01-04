#!/usr/bin/env node
/**
 * Script de vérification de sécurité avant déploiement
 * Vérifie les points critiques de sécurité dans le code
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Couleurs pour le terminal
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m'
};

let hasErrors = false;
let hasWarnings = false;

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
    hasErrors = true;
    log(`❌ ERREUR: ${message}`, 'red');
}

function warning(message) {
    hasWarnings = true;
    log(`⚠️  WARNING: ${message}`, 'yellow');
}

function success(message) {
    log(`✅ ${message}`, 'green');
}

function info(message) {
    log(`ℹ️  ${message}`, 'blue');
}

// ============================================
// VÉRIFICATIONS DE SÉCURITÉ
// ============================================

function checkFile(filePath, checks) {
    if (!existsSync(filePath)) {
        warning(`Fichier non trouvé: ${filePath}`);
        return;
    }

    const content = readFileSync(filePath, 'utf-8');
    
    checks.forEach(check => {
        const { pattern, message, type = 'error', exclude } = check;
        const regex = new RegExp(pattern, 'gi');
        const matches = [...content.matchAll(regex)];
        
        if (matches.length > 0) {
            // Filtrer les exclusions
            const filteredMatches = exclude 
                ? matches.filter(m => !new RegExp(exclude, 'i').test(m[0]))
                : matches;
            
            if (filteredMatches.length > 0) {
                const logFunc = type === 'error' ? error : warning;
                logFunc(`${message} (${filteredMatches.length} occurrence(s) dans ${filePath})`);
                
                // Afficher les premières occurrences
                filteredMatches.slice(0, 3).forEach(match => {
                    const lines = content.substring(0, match.index).split('\n');
                    const lineNumber = lines.length;
                    log(`  Ligne ${lineNumber}: ${match[0].substring(0, 80)}...`, 'reset');
                });
            }
        }
    });
}

// ============================================
// 1. VÉRIFICATION DES CLÉS API ET SECRETS
// ============================================
log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bold');
log('1️⃣  VÉRIFICATION DES CLÉS API ET SECRETS', 'bold');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'bold');

const secretChecks = [
    {
        pattern: '(api[_-]?key|apikey)\\s*[:=]\\s*["\']?[a-zA-Z0-9]{20,}',
        message: 'Clé API potentiellement exposée détectée',
        exclude: 'secrets\\.GOOGLE_SHEET_ID|example|placeholder|test'
    },
    {
        pattern: '(secret|password|token)\\s*[:=]\\s*["\'][^"\']{8,}["\']',
        message: 'Secret/Password/Token potentiellement exposé',
        exclude: 'type.*=.*password|secretary|New repository secret|GOOGLE_SHEET_ID'
    },
    {
        pattern: 'supabase.*anon.*key',
        message: 'Clé Supabase exposée (ancien code à nettoyer)',
    },
    {
        pattern: 'sk-[a-zA-Z0-9]{48}',
        message: 'Clé OpenAI exposée',
    }
];

checkFile(join(rootDir, 'index.html'), secretChecks);
checkFile(join(rootDir, 'script.js'), secretChecks);
checkFile(join(rootDir, 'vite.config.js'), secretChecks);

// ============================================
// 2. VÉRIFICATION DES CONSOLE.LOG
// ============================================
log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bold');
log('2️⃣  VÉRIFICATION DES CONSOLE.LOG', 'bold');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'bold');

const consoleChecks = [
    {
        pattern: 'console\\.(log|warn|error|debug|info)\\s*\\(',
        message: 'console.log détecté (peut exposer des informations)',
        type: 'warning',
        exclude: 'console\\.error.*catch|// console\\.'
    }
];

checkFile(join(rootDir, 'script.js'), consoleChecks);

// ============================================
// 3. VÉRIFICATION DES SOURCEMAPS
// ============================================
log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bold');
log('3️⃣  VÉRIFICATION DES SOURCEMAPS', 'bold');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'bold');

const viteConfigPath = join(rootDir, 'vite.config.js');
if (existsSync(viteConfigPath)) {
    const viteConfig = readFileSync(viteConfigPath, 'utf-8');
    
    if (/sourcemap:\s*true/i.test(viteConfig)) {
        error('Sourcemaps activés en production (sourcemap: true)');
        info('Conseil: Définir sourcemap: false dans vite.config.js');
    } else if (/sourcemap:\s*false/i.test(viteConfig)) {
        success('Sourcemaps désactivés en production');
    } else {
        warning('Configuration sourcemap non trouvée dans vite.config.js');
    }
}

// ============================================
// 4. VÉRIFICATION DU GITIGNORE
// ============================================
log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bold');
log('4️⃣  VÉRIFICATION DU .gitignore', 'bold');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'bold');

const gitignorePath = join(rootDir, '.gitignore');
if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, 'utf-8');
    const requiredPatterns = [
        { pattern: 'node_modules', name: 'node_modules/' },
        { pattern: 'dist', name: 'dist/' },
        { pattern: '\\.env', name: '.env' }
    ];
    
    requiredPatterns.forEach(({ pattern, name }) => {
        if (new RegExp(pattern, 'i').test(gitignore)) {
            success(`${name} présent dans .gitignore`);
        } else {
            warning(`${name} absent du .gitignore`);
        }
    });
}

// ============================================
// 5. VÉRIFICATION DES MÉTADONNÉES HTML
// ============================================
log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bold');
log('5️⃣  VÉRIFICATION DES MÉTADONNÉES HTML', 'bold');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'bold');

const indexPath = join(rootDir, 'index.html');
if (existsSync(indexPath)) {
    const html = readFileSync(indexPath, 'utf-8');
    
    // Title
    if (/<title>\s*<\/title>/.test(html) || !/<title>/.test(html)) {
        error('Balise <title> vide ou manquante');
    } else {
        success('Balise <title> présente et non vide');
    }
    
    // Meta description
    if (/<meta\s+name=["']description["']/i.test(html)) {
        success('Meta description présente');
    } else {
        warning('Meta description manquante (SEO)');
    }
    
    // CSP (Content Security Policy)
    if (/<meta\s+http-equiv=["']Content-Security-Policy["']/i.test(html)) {
        success('Content Security Policy définie');
    } else {
        warning('Content Security Policy non définie (sécurité renforcée recommandée)');
        info('Conseil: Ajouter <meta http-equiv="Content-Security-Policy" content="...">');
    }
}

// ============================================
// 6. VÉRIFICATION XSS (Cross-Site Scripting)
// ============================================
log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bold');
log('6️⃣  VÉRIFICATION XSS (Cross-Site Scripting)', 'bold');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'bold');

const xssChecks = [
    {
        pattern: '\\.innerHTML\\s*=\\s*[^e]',
        message: 'Utilisation de .innerHTML sans escapeHTML() détectée',
        type: 'warning',
        exclude: 'innerHTML\\s*=\\s*["\']\\s*["\']|escapeHTML'
    },
    {
        pattern: 'eval\\s*\\(',
        message: 'Utilisation de eval() détectée (dangereux)',
        type: 'error'
    },
    {
        pattern: 'document\\.write\\s*\\(',
        message: 'Utilisation de document.write() détectée',
        type: 'warning'
    }
];

checkFile(join(rootDir, 'script.js'), xssChecks);

// ============================================
// 7. VÉRIFICATION DES DÉPENDANCES
// ============================================
log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bold');
log('7️⃣  VÉRIFICATION DES DÉPENDANCES', 'bold');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'bold');

const packagePath = join(rootDir, 'package.json');
if (existsSync(packagePath)) {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const depCount = Object.keys(allDeps).length;
    
    if (depCount === 0) {
        success('Aucune dépendance externe (site 100% statique)');
    } else {
        info(`${depCount} dépendance(s) trouvée(s)`);
        info('Conseil: Exécuter "npm audit" pour vérifier les vulnérabilités');
    }
}

// ============================================
// RÉSUMÉ FINAL
// ============================================
log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bold');
log('📊 RÉSUMÉ DE L\'AUDIT DE SÉCURITÉ', 'bold');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'bold');

if (hasErrors) {
    log('❌ AUDIT ÉCHOUÉ - Des problèmes de sécurité critiques ont été détectés', 'red');
    log('\nAction requise: Corriger les erreurs avant de déployer en production\n', 'red');
    process.exit(1);
} else if (hasWarnings) {
    log('⚠️  AUDIT RÉUSSI AVEC AVERTISSEMENTS', 'yellow');
    log('\nRecommandation: Examiner les avertissements avant de déployer\n', 'yellow');
    process.exit(0);
} else {
    log('✅ AUDIT RÉUSSI - Aucun problème de sécurité détecté', 'green');
    log('\n🚀 Le site est prêt pour le déploiement en production\n', 'green');
    process.exit(0);
}
