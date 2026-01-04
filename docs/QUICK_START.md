# 🚀 Quick Start : Google Sheets Sync

## ✅ Ce que vous avez maintenant

Fichiers créés :
- ✅ [scripts/validators/validate-csv.js](scripts/validators/validate-csv.js) - Validation automatique
- ✅ [.github/workflows/sync-google-sheets.yml](.github/workflows/sync-google-sheets.yml) - Sync automatique
- ✅ [.github/workflows/validate-pr.yml](.github/workflows/validate-pr.yml) - Validation PRs
- ✅ [docs/GOOGLE_SHEETS_SETUP.md](docs/GOOGLE_SHEETS_SETUP.md) - Guide complet
- ✅ [package.json](package.json) - Scripts npm

---

## 🎯 Prochaines Étapes (Par priorité)

### 1️⃣ **Adapter le validateur** (10 min) ⚠️ **CRITIQUE**

Votre structure actuelle :
- Les **membres de cabinet** sont dans `person_ministries` avec `role_label` contenant "Cabinet"
- Ils ne doivent PAS avoir `is_primary`

**Action** : Je vais modifier le validateur pour ignorer la validation `is_primary` pour les membres de cabinet.

### 2️⃣ **Créer le Google Sheet** (15 min)

Deux options :

**Option A - Import rapide** (Recommandé) :
1. [Créer nouveau Google Sheet](https://sheets.google.com)
2. Importer vos 4 CSV existants (un onglet par fichier)
3. Renommer onglets : `Ministries`, `Persons`, `Person_Ministries`, `Person_Careers`

**Option B - Template pré-configuré** :
1. Dupliquer template (à créer)
2. Importer données

### 3️⃣ **Configurer GitHub Secret** (2 min)

1. Récupérer ID Google Sheet (dans l'URL)
2. GitHub > Settings > Secrets > New secret
3. Nom : `GOOGLE_SHEET_ID`
4. Valeur : L'ID

### 4️⃣ **Test sync** (5 min)

1. GitHub Actions > "Sync Google Sheets"
2. Run workflow (manuel)
3. Vérifier commit automatique

---

## 🔧 Dois-je modifier le validateur maintenant ?

**Oui si** : Vous voulez tester la sync immédiatement

**Je peux faire** :
1. Détecter automatiquement les membres de cabinet (via `role_label`)
2. Skip la validation `is_primary` pour eux
3. Garder la validation stricte pour les ministres

Voulez-vous que je fasse cette modification ?

---

## 📊 État Actuel de Vos Données

J'ai détecté :
- ✅ **37 ministries** (ministères/portefeuilles)
- ✅ **470 persons** (ministres + membres cabinets)
- ✅ **406 person_ministries** (affectations)
- ✅ **509 careers** (biographies)

**Problème identifié** :
- Les 353 erreurs `is_primary` sont pour les membres de cabinet
- C'est attendu avec votre structure actuelle

**Solution** : Adapter le script de validation (je peux le faire maintenant)

---

## 🤔 Questions Rapides

1. **Voulez-vous que j'adapte le validateur** pour votre structure cabinet ?
2. **Avez-vous un compte Google** pour créer le Sheet ?
3. **Préférez-vous** :
   - ⭐ **Approche progressive** : Google Sheets pour éditions simples + Git en backup
   - 🔵 **Approche Git pur** : Rester sur Git + scripts CLI

---

## 💡 Ma Recommandation Immédiate

**Pour démarrer vite** :

```bash
# 1. Tester que tout fonctionne localement
npm install  # Installer dépendances (si vite/autres)

# 2. Modifier validateur (je m'en charge)

# 3. Créer Google Sheet & configurer
#   - Suivre docs/GOOGLE_SHEETS_SETUP.md

# 4. Première sync manuelle
#   GitHub Actions > Run workflow
```

**Commande suivante** :
```bash
# Tester la conversion JSON (utilise csv-to-json.js existant)
node scripts/csv-to-json.js
```

Cela vérifiera que vos JSON sont bien générés avant de configurer Google Sheets.

---

## 🆘 Besoin d'Aide ?

Dites-moi :
- "Adapter le validateur" → Je modifie le script
- "Créer template Google Sheet" → Je génère un fichier à importer
- "Juste tester JSON" → On vérifie la conversion actuelle
- "Tout configurer" → Je fais toutes les étapes
