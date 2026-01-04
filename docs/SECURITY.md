# 🔒 Guide de Sécurité

## Audit de Sécurité Automatique

Ce projet inclut un script d'audit de sécurité qui vérifie automatiquement les points critiques avant le déploiement.

### Utilisation

```bash
# Exécuter l'audit manuellement
npm run security

# L'audit est aussi exécuté automatiquement avant chaque build
npm run build  # Lance d'abord npm run security
```

### Points Vérifiés

#### 1️⃣ **Clés API et Secrets**
- ✅ Détecte les clés API exposées dans le code
- ✅ Vérifie l'absence de passwords/tokens en dur
- ✅ Identifie les anciennes clés Supabase à nettoyer

#### 2️⃣ **Console.log**
- ⚠️ Alerte sur les console.log en production
- ℹ️ Les logs peuvent exposer des informations sensibles

#### 3️⃣ **Sourcemaps**
- ✅ Vérifie que `sourcemap: false` en production
- 🔐 Empêche l'exposition du code source

#### 4️⃣ **.gitignore**
- ✅ Vérifie la présence de `node_modules/`
- ✅ Vérifie la présence de `dist/`
- ✅ Vérifie la présence de `.env`

#### 5️⃣ **Métadonnées HTML**
- ✅ Vérifie la présence du `<title>`
- ✅ Vérifie la meta description (SEO)
- ⚠️ Recommande Content Security Policy

#### 6️⃣ **XSS (Cross-Site Scripting)**
- ⚠️ Détecte l'utilisation de `.innerHTML` sans escapeHTML()
- ✅ Vérifie l'absence de `eval()`
- ✅ Vérifie l'absence de `document.write()`

#### 7️⃣ **Dépendances**
- ℹ️ Compte les dépendances npm
- 💡 Recommande `npm audit` pour les vulnérabilités

## Résultats de l'Audit

### ✅ Audit Réussi
```
✅ AUDIT RÉUSSI - Aucun problème de sécurité détecté
🚀 Le site est prêt pour le déploiement en production
```
**Code de sortie**: 0 (le build continue)

### ⚠️ Audit avec Avertissements
```
⚠️ AUDIT RÉUSSI AVEC AVERTISSEMENTS
Recommandation: Examiner les avertissements avant de déployer
```
**Code de sortie**: 0 (le build continue)
**Action**: Examiner les warnings mais le déploiement est possible

### ❌ Audit Échoué
```
❌ AUDIT ÉCHOUÉ - Des problèmes de sécurité critiques ont été détectés
Action requise: Corriger les erreurs avant de déployer en production
```
**Code de sortie**: 1 (le build s'arrête)
**Action**: Corriger les erreurs critiques avant de continuer

## Avertissements Actuels

### ⚠️ Utilisation de .innerHTML
**Impact**: Risque XSS si les données ne sont pas filtrées

**État actuel**: Acceptable car :
- Les données viennent de fichiers JSON locaux (pas d'input utilisateur)
- Une fonction `escapeHTML()` existe dans le code
- Les données sont considérées comme fiables

**Amélioration possible**: 
```javascript
// Au lieu de
element.innerHTML = data;

// Utiliser
element.innerHTML = escapeHTML(data);
```

### ⚠️ Content Security Policy (CSP)
**Impact**: Protection renforcée contre XSS

**Amélioration recommandée**:
Ajouter dans `index.html` :
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline' fonts.googleapis.com; 
               font-src 'self' fonts.gstatic.com; 
               img-src 'self' data: https:;">
```

### ℹ️ Vulnérabilités npm
**État**: 2 vulnérabilités modérées dans esbuild (dépendance de Vite)

**Impact**: 
- Affecte uniquement le serveur de développement
- Pas d'impact sur le site en production (fichiers statiques)
- Le risque est que pendant le développement, un site malveillant puisse lire les réponses du dev server

**Actions possibles**:
```bash
# Mettre à jour Vite (peut casser des choses)
npm audit fix --force

# Ou accepter le risque (dev uniquement)
# Le site en production n'est pas affecté
```

## Bonnes Pratiques

### ✅ Ce qui est bien fait
1. ✅ Pas de clés API exposées
2. ✅ Pas de secrets en dur dans le code
3. ✅ Sourcemaps désactivés en production
4. ✅ .gitignore correctement configuré
5. ✅ Titre et description pour le SEO
6. ✅ Console.log de debug retirés
7. ✅ Fonction escapeHTML() disponible

### 🎯 Recommandations supplémentaires

#### Pour la production
1. Ajouter une CSP (Content Security Policy)
2. Configurer HTTPS uniquement (via GitHub Pages/Netlify)
3. Ajouter des headers de sécurité (X-Frame-Options, etc.)

#### Pour le développement
1. Ne jamais commiter de fichiers `.env`
2. Utiliser des secrets GitHub pour les clés API
3. Réviser régulièrement les dépendances avec `npm audit`

## Checklist de Déploiement

Avant chaque déploiement en production :

- [ ] `npm run security` passe sans erreur critique
- [ ] `npm audit` vérifié (vulnérabilités acceptées ou corrigées)
- [ ] `npm run build` réussit
- [ ] `npm run preview` testé localement
- [ ] Pas de données sensibles dans le code
- [ ] Les logs de debug sont retirés
- [ ] Le .gitignore est à jour

## Support

Pour toute question de sécurité :
1. Vérifier ce guide
2. Exécuter `npm run security`
3. Consulter les logs détaillés
4. Ouvrir une issue GitHub si nécessaire
