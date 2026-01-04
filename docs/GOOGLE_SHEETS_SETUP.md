# 📊 Configuration Google Sheets + Sync Git

Guide pas-à-pas pour mettre en place la synchronisation Google Sheets → Git.

## 🎯 Objectif

Permettre aux contributeurs d'éditer les données dans Google Sheets (interface familière) tout en conservant Git comme source de vérité avec historique complet et validation automatique.

---

## 📋 Étape 1 : Créer le Google Sheet

### 1.1 Créer nouveau document

1. Aller sur [Google Sheets](https://sheets.google.com)
2. Créer un nouveau document vide
3. Renommer : **"Gouvernement Lecornu II - Base de données"**

### 1.2 Créer les onglets

Créer 4 onglets (renommer exactement comme indiqué) :

- `Ministries`
- `Persons`
- `Person_Ministries`
- `Person_Careers`

### 1.3 Importer les données existantes

Pour chaque onglet :

1. Ouvrir le fichier CSV correspondant (`Serveur gouvernement - xxx.csv`)
2. Dans Google Sheets : **Fichier > Importer > Upload**
3. Choisir **"Remplacer l'onglet actuel"**
4. Délimiteur : **Virgule**
5. Importer

---

## 🔧 Étape 2 : Configurer les validations Google Sheets

### Onglet `Ministries`

#### Colonnes à protéger (verrouiller)

Sélectionner colonne **A** (id) → **Données > Protéger les feuilles et plages**
- ✅ Cocher "Sauf certaines cellules"
- Laisser vide = personne ne peut modifier

#### Listes déroulantes

**Colonne `category`** (E) :
1. Sélectionner toute la colonne E (sauf en-tête)
2. **Données > Validation des données**
3. Critères : **Liste d'éléments**
4. Valeurs : `ministre,ministre-delegue,autre`
5. ✅ Afficher liste déroulante
6. ❌ Rejeter la saisie si les données ne sont pas valides

### Onglet `Persons`

#### Listes déroulantes

**Colonne `role`** :
- Valeurs : `minister,minister-delegate,minister-state,president,leader,secretary`

**Colonne `party`** :
- Valeurs : `Renaissance,Les Républicains,MoDem,Horizons,LIOT,Sans étiquette`

#### Validation email

**Colonne `email`** :
1. Sélectionner colonne email
2. Validation : **Texte > Contient** `@`
3. Ou : **Expression régulière** : `^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`

### Onglet `Person_Ministries`

**Colonne `is_primary`** :
- Validation : **Liste d'éléments** : `TRUE,FALSE`

#### Mise en forme conditionnelle

Repérer visuellement les erreurs :

1. Sélectionner colonne `is_primary`
2. **Format > Mise en forme conditionnelle**
3. Règle : **Formule personnalisée**
   ```
   =COUNTIF($C:$C,"TRUE")=0
   ```
4. Style : Fond rouge (aucun TRUE = erreur)

---

## 🔐 Étape 3 : Partager le Google Sheet

### Option A : Partage public (lecture seule)

1. Cliquer **Partager** (en haut à droite)
2. **Modifier en "Tous les utilisateurs disposant du lien"**
3. Rôle : **Lecteur** (pour GitHub Actions)
4. Copier le lien

**OU**

### Option B : Partage avec permissions

1. Ajouter les collaborateurs par email
2. Rôles :
   - **Éditeur** : Contributeurs (modifient données)
   - **Commentateur** : Relecteurs (suggèrent)
   - **Lecteur** : Consultation

---

## 🔑 Étape 4 : Configurer GitHub Actions

### 4.1 Récupérer l'ID du Google Sheet

Dans l'URL du Google Sheet :
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
                                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                      Copier cette partie = GOOGLE_SHEET_ID
```

### 4.2 Ajouter le secret GitHub

1. Aller sur votre dépôt GitHub
2. **Settings > Secrets and variables > Actions**
3. Cliquer **New repository secret**
4. Nom : `GOOGLE_SHEET_ID`
5. Valeur : Coller l'ID copié
6. **Add secret**

### 4.3 Tester la synchronisation

1. GitHub : Aller dans **Actions**
2. Sélectionner workflow **"Sync Google Sheets → Git"**
3. Cliquer **Run workflow** (bouton droit)
4. Cocher "force_sync" si besoin
5. **Run workflow**

Attendre 1-2 minutes → vérifier que le workflow est ✅ vert

---

## 📝 Étape 5 : Workflow Contributeur

### Pour ajouter/modifier un ministre

1. **Ouvrir Google Sheets**
2. **Onglet `Persons`** → Ajouter ligne
3. Remplir :
   - `id` : **Laisser vide** (généré auto) OU utiliser [UUID Generator](https://www.uuidgenerator.net/)
   - `full_name` : Prénom NOM
   - `role` : Choisir dans liste déroulante
   - `party` : Choisir dans liste
   - `photo_url` : URL complète
   - `description` : Texte libre
4. **Onglet `Person_Ministries`** → Associer ministère(s)
   - `person_id` : Copier ID depuis onglet Persons
   - `ministry_id` : Copier ID depuis onglet Ministries
   - `is_primary` : **TRUE** pour ministère principal, **FALSE** pour les autres
   - `role_label` : Ex: "Ministre de l'Intérieur"
5. **Enregistrer** (auto)

### Synchronisation automatique

- **Toutes les 2 heures** : GitHub Actions récupère les changements
- **Manuel** : Actions > Sync Google Sheets > Run workflow

### Vérification

Après 2h (ou sync manuel) :
1. Aller sur GitHub
2. Vérifier commit "sync: Mise à jour depuis Google Sheets"
3. Vérifier fichiers `data/ministers/*.json` générés

---

## 🚨 Troubleshooting

### ❌ Erreur "Failed to download CSV"

**Cause** : Google Sheet pas public OU mauvais ID

**Solution** :
1. Vérifier partage (Option A ci-dessus)
2. Vérifier `GOOGLE_SHEET_ID` dans secrets GitHub
3. Tester l'URL manuellement :
   ```
   https://docs.google.com/spreadsheets/d/VOTRE_ID/gviz/tq?tqx=out:csv&sheet=Ministries
   ```

### ❌ Validation CSV échoue

**Cause** : Données invalides (UUID, références)

**Solution** :
1. Lire les logs GitHub Actions (détail erreurs)
2. Corriger dans Google Sheets
3. Re-sync

### ❌ Colonnes manquantes

**Cause** : Onglet renommé ou structure modifiée

**Solution** :
- Noms onglets exacts : `Ministries`, `Persons`, `Person_Ministries`, `Person_Careers`
- Ne pas supprimer colonnes requises

---

## 📊 Template Google Sheets

**Option rapide** : Dupliquer le template pré-configuré

👉 [Template Google Sheets Gouvernement](https://docs.google.com/spreadsheets/d/TEMPLATE_ID/copy)
*(à créer après import initial)*

---

## ⚙️ Configuration Avancée (Optionnel)

### Générer UUID automatiquement (Google Apps Script)

1. Dans Google Sheets : **Extensions > Apps Script**
2. Coller le code :

```javascript
function generateUUID() {
  return Utilities.getUuid();
}

function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const row = e.range.getRow();
  const col = e.range.getColumn();
  
  // Si ajout ligne dans Persons et colonne A (id) vide
  if (sheet.getName() === 'Persons' && col !== 1 && row > 1) {
    const idCell = sheet.getRange(row, 1);
    if (!idCell.getValue()) {
      idCell.setValue(generateUUID());
    }
  }
}
```

3. **Enregistrer** (icône disquette)
4. Maintenant : ajouter ligne → UUID auto dans colonne A

---

## 📞 Support

Questions ? Ouvrir une [Issue GitHub](../../issues/new) avec label `google-sheets`.
