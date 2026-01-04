# Rapport de migration - Projet Gouvernement Lecornu II

**Date** : 21 decembre 2025  
**Auteur** : Benjamin Boussemart  
**Objet** : Migration de l'architecture applicative vers une solution 100% statique

---

## Objet de la migration

J'ai realise la migration complete du projet "Gouvernement Lecornu II" d'une architecture basee sur Supabase (backend PostgreSQL) vers une solution 100% statique deployee sur GitHub Pages. Cette migration elimine toute dependance externe et simplifie considerablement la maintenance du projet.

## Contexte et motivations

Le projet initial etait dependant d'une base de donnees Supabase avec les contraintes suivantes :
- Cles API exposees dans le code HTML
- Complexite de gestion des regles RLS (Row Level Security)
- Risques de securite lies a l'exposition des identifiants
- Couts potentiels lies a l'utilisation du service
- Dependance a un service externe pour le fonctionnement

J'ai donc decide de migrer vers une architecture statique pour :
- Eliminer tout risque de securite lie aux cles API
- Simplifier la maintenance et les deploiements
- Reduire les couts d'hebergement
- Ameliorer les performances de chargement

## Donnees migrees

J'ai extrait et converti les donnees suivantes depuis la base Supabase :

| Categorie | Quantite | Details |
|-----------|----------|---------|
| Ministres | 36 | 1 Premier ministre + 19 ministres + 15 ministres delegues + 1 president |
| Premier ministre | 1 | Francois Bayrou |
| Ministres | 19 | Portefeuilles principaux |
| Ministres delegues | 15 | Sous-portefeuilles |
| President | 1 | Emmanuel Macron |
| Biographies | 507 | Entrees detaillees de carriere |
| Collaborateurs | 374 | Avec photos, poles thematiques et grades |
| Ministeres | 36 | Configurations completes |

## Échec de la migration - Retour à Supabase

**Date de l'échec** : 21 décembre 2025

Après avoir investi plusieurs heures dans le développement d'une architecture statique complexe, j'ai décidé d'abandonner cette approche et de revenir à Supabase. Voici les raisons de cet échec :

### Problèmes rencontrés

#### 1. Complexité excessive
- **Multiples scripts Python** : csv_to_json.py, create_user_excel.py, excel_to_csv.py, consolidate_ministers.py
- **Workflows GitHub Actions** complexes pour automatiser les conversions
- **Dépendances techniques** : Python, openpyxl, pandas, etc.
- **Maintenance lourde** : Chaque modification nécessite de comprendre le pipeline complet

#### 2. Expérience utilisateur dégradée
- **Pas d'interface d'édition intuitive** : Les utilisateurs doivent soit :
  - Éditer des fichiers CSV (trop technique)
  - Utiliser Excel avec conversion manuelle
  - Apprendre à utiliser Netlify CMS (encore une couche de complexité)
- **Risque d'erreur élevé** : Conversions multiples = risques de pertes de données
- **Formation nécessaire** : Les contributeurs doivent comprendre le workflow complet

#### 3. Coûts cachés
- **Temps de développement** : Plusieurs jours pour créer et déboguer les scripts
- **Temps de maintenance** : Chaque évolution nécessite de modifier plusieurs scripts
- **Support utilisateur** : Formation et assistance pour les non-techniciens
- **Risques de régression** : Modifications qui cassent le pipeline de conversion

### Solutions tentées (et abandonnées)

#### Approche Excel + Python
```
Excel → CSV → Python → JSON → Site
```
- Création d'un Excel "user-friendly" avec instructions
- Scripts de conversion automatique
- Interface familière mais pipeline complexe

#### Approche Netlify CMS
```
CMS Web → JSON individuels → Consolidation → Site
```
- Interface d'administration web moderne
- Configuration YAML pour les formulaires
- Consolidation automatique via GitHub Actions

#### Approche CSV pure
```
CSV direct → Python → JSON → Site
```
- Édition directe dans des fichiers texte
- Pas de dépendances Excel
- Mais trop technique pour les utilisateurs finaux

### Retour à Supabase

Face à cette complexité excessive, j'ai décidé de revenir à l'architecture initiale avec Supabase :

#### Avantages retrouvés
- ✅ **Simplicité d'utilisation** : Interface connue et maîtrisée
- ✅ **Pas de pipeline complexe** : Données directement dans la base
- ✅ **Évolutivité facile** : Ajout de fonctionnalités sans casser le workflow
- ✅ **Maintenance réduite** : Pas de scripts à maintenir
- ✅ **Sécurité gérée** : Authentification et autorisations déjà en place

#### Compromis acceptés
- 🔸 **Dépendance externe** : Supabase comme service tiers
- 🔸 **Coûts potentiels** : Selon l'utilisation du service
- 🔸 **Clés API exposées** : Nécessite une gestion sécurisée

### Conclusion

Cette tentative de migration vers une architecture 100% statique a démontré que la simplicité d'utilisation pour les utilisateurs finaux prime souvent sur les considérations techniques d'indépendance. Le coût de développement et de maintenance d'un système complexe peut rapidement dépasser les bénéfices théoriques.

**Leçon apprise** : Une solution simple et fonctionnelle vaut mieux qu'une architecture parfaite mais inutilisable en pratique.

---

## Architecture actuelle (Supabase)

## Modifications techniques realisees

### Code JavaScript nettoye
J'ai supprime toutes les references a Supabase :
- Suppression de `ensureSupabaseClient()`
- Suppression de `fetchMinistersFromSupabase()`
- Suppression de `fetchMinistersFromView()`
- Suppression de `fetchBiographyForPersonFallback()`
- Suppression de `serverSearch()`

### Suppression des fonctionnalites d'impression
Conformement aux consignes recues, j'ai supprime tout le code relatif a l'impression :
- Suppression de `printSheetContainer`
- Suppression de `ensurePrintSheetContainer()`
- Suppression de `cleanupPrintSheet()`
- Suppression de `ensureCollaboratorsForPrint()`
- Commentaire de `handleExportMinisterClick()`
- Commentaire de `printMinisterSheet()`

### CSS nettoye
J'ai commente ou supprime les regles CSS liees a l'impression :
- Commentaire du bloc `@media print`
- Regle `body.print-all { display: none; }`
- Regle `.modal-footer-cta { display: none; }`

### Structure de donnees optimisee
J'ai reorganise les donnees selon cette structure :
---

## État actuel du projet

Le projet est revenu à son architecture initiale avec Supabase. Toutes les modifications techniques réalisées pour la migration statique ont été supprimées :

### Code remis en état
- **Réactivation de Supabase** : Toutes les références à Supabase ont été restaurées
- **Fonctionnalités d'impression** : Remises en place selon les spécifications
- **Données** : Le projet utilise à nouveau la base Supabase comme source de vérité

### Scripts supprimés
Tous les scripts de conversion développés ont été supprimés :
- `csv_to_json.py`
- `create_user_excel.py`
- `excel_to_csv.py`
- `populate_excel_from_csv.py`
- `consolidate_ministers.py`

### Workflows supprimés
Les workflows GitHub Actions complexes ont été supprimés pour éviter toute automatisation inutile.

## Tests realises
   - Sélectionner le ministre dans la liste
   - Modifier les champs souhaités
   - Sauvegarder et publier

### Workflow automatique
- Chaque modification via le CMS crée un commit Git
- Le workflow GitHub Actions consolide automatiquement les données
- Le site se met à jour automatiquement via le déploiement Netlify

## Tests realises

### Tests fonctionnels (avec Supabase)
- Verification du chargement des donnees : OK
- Test de la recherche par nom : OK
- Test des filtres par role/parti : OK
- Test des modals de biographie : OK
- Test de l'affichage des collaborateurs : OK
- Serveur local : Fonctionne sur http://localhost:8000
- Console navigateur : Connexion Supabase fonctionnelle

## Documentation produite

### Sections couvertes
- Description fonctionnelle du projet
- Guide d'installation et de demarrage
- Procedures de mise a jour des donnees
- Guide de deploiement GitHub Pages
- Resolution des problemes courants

## Audit de securite (avril 2026)

### Risques observes
- **Surface XSS via donnees de contenu** : plusieurs rendus HTML interpolent directement les champs fournis par les fichiers statiques (noms, roles, descriptions) dans des templates `innerHTML` sans echappement, ce qui permettrait a une donnees malveillante de declencher du script dans le navigateur (ex. cartes du cabinet du Premier ministre dans la modale).【F:script.js†L2237-L2257】
- **Donnees personnelles en clair** : les fichiers CSV versions « serveur » contiennent des informations nominatives et des emails de collaborateurs, exposes tels quels dans le depot et donc sur GitHub Pages, avec un risque de fuite de donnees personnelles ou d’exploitation pour du phishing.【F:Serveur gouvernement - persons.csv†L1-L6】
- **Dépendances externes non controlees** : le chargement direct de Google Fonts et d’images distantes implique une exposition aux politiques de tiers (tracking, availability) et aucun mecanisme CSP ou SRI n’encadre ces ressources pour limiter les risques d’injection ou de compromission en cas de takeover DNS/CDN.【F:index.html†L24-L27】【F:Serveur gouvernement - persons.csv†L1-L6】
- **Configuration Supabase cote client** : le helper `fetch-ministernode.js` attend des variables `SUPABASE_URL`/`SUPABASE_ANON_KEY` cote navigateur pour interroger la vue `vw_ministernode`, ce qui imposerait d’exposer la cle anonyme au front et de reposer uniquement sur les regles RLS si cette voie etait reutilisee.【F:config/fetch-ministernode.js†L8-L45】

### Recommandations prioritaires
- Remplacer les constructions `innerHTML` par du DOM `textContent`/`setAttribute` avec une validation stricte des URLs d’images et echappement systematique des textes issus des donnees.
- Extraire ou pseudonymiser les emails/identifiants sensibles des CSV publics, et documenter le statut RGPD de ces jeux de donnees avant tout deploiement.
- Auto-heberger les polices et images critiques, ajouter une politique CSP et, si des CDN restent necessaires, utiliser l’integrite de sous-ressource (SRI) et des allowlists precises.
- Si Supabase est reintroduit, limiter la creation du client au back-end (ou a un worker protege), n’exposer aucune cle dans le front et imposer des regles RLS minimales.

### Archives conservees
- MIGRATION-README.md : Archive du guide de migration avortée
- MIGRATION-COMPLETE.md : Archive du rapport de migration

## 📊 Comment fonctionne le système de gestion des données

### Architecture actuelle : Google Sheets → GitHub → Git

Le projet utilise une **synchronisation unidirectionnelle** depuis Google Sheets vers Git via GitHub Actions.

```
Google Sheets (SOURCE DE VÉRITÉ)
       ↓ Synchronisation automatique (toutes les 2h) ou manuelle
   GitHub Actions
       ↓ Validation + Conversion CSV → JSON
   Repository Git
       ↓ Génération automatique
   Site Web (GitHub Pages)
```

⚠️ **Important** : Les modifications locales des fichiers CSV ou JSON seront **écrasées** lors de la prochaine synchronisation.

---

### 🔗 Accès à Google Sheets

**URL du Google Sheet** : [https://docs.google.com/spreadsheets/d/1jlJPjC7nlc4awxSVq0ZVg2xJjQTq1X04b9fCmqWRjSM](https://docs.google.com/spreadsheets/d/1jlJPjC7nlc4awxSVq0ZVg2xJjQTq1X04b9fCmqWRjSM)

**4 onglets principaux** :
1. **Ministries** : Liste des ministères (36 ministères)
2. **Persons** : Ministres et collaborateurs (450 personnes)
3. **Person_Ministries** : Liens personnes ↔ ministères (401 affectations)
4. **Person_Careers** : Biographies et carrières (507 entrées)

---

### ➕ Ajouter un ministre

1. **Dans l'onglet "Persons"**, ajouter une ligne :
   ```
   id: [Générer UUID v4]
   full_name: Prénom NOM
   role: minister | minister-delegate | minister-state | secretary
   party: Renaissance | MoDem | LR | etc.
   job_title: (optionnel)
   photo_url: https://... (optionnel)
   description: Biographie courte (optionnel)
   created_at: 2026-01-04T19:00:00+00:00
   updated_at: 2026-01-04T19:00:00+00:00
   ```

2. **Dans l'onglet "Person_Ministries"**, créer le lien :
   ```
   person_id: [UUID du ministre]
   ministry_id: [UUID du ministère]
   is_primary: TRUE (pour le ministre principal)
   role_label: "Ministre" | "Ministre délégué" | etc.
   sort_order: 1
   ```

3. **Dans l'onglet "Person_Careers"** (optionnel), ajouter sa biographie :
   ```
   id: [Générer UUID v4]
   person_id: [UUID du ministre]
   bio_section: education | career | political | achievements
   title: Titre de l'entrée
   description: Texte détaillé
   display_order: 1
   ```

4. **Déclencher la synchronisation** :
   - Automatique : attendre max 2h
   - Manuel : GitHub → Actions → "Sync Google Sheets → Git" → Run workflow

---

### 👥 Ajouter un collaborateur

1. **Dans l'onglet "Persons"** :
   ```
   id: [UUID v4]
   full_name: Prénom NOM
   role: collaborator
   superior_id: [UUID du ministre de rattachement]
   cabinet_role: "Conseiller diplomatique" | "Directeur de cabinet" | etc.
   cabinet_order: 1, 2, 3... (ordre d'affichage)
   photo_url: (optionnel)
   ```

2. **Dans l'onglet "Person_Ministries"** :
   ```
   person_id: [UUID du collaborateur]
   ministry_id: [UUID du ministère]
   is_primary: FALSE (toujours FALSE pour les collaborateurs)
   role_label: "Cabinet du ministre"
   sort_order: [position]
   ```

💡 **Astuce** : Le validateur détecte automatiquement les collaborateurs si `role_label` contient "Cabinet".

---

### 🏛️ Ajouter un ministère

1. **Dans l'onglet "Ministries"** :
   ```
   id: [UUID v4]
   name: Ministère de la Transformation numérique
   short_name: Numérique
   color: #8B5CF6 (code hex)
   icon: (optionnel)
   sort_order: 20 (position d'affichage)
   superior_id: [UUID ministère parent] ou vide si autonome
   ```

2. **Affecter un ministre** via "Person_Ministries" (voir section ministre ci-dessus)

---

### ❌ Supprimer un ministre ou collaborateur

1. **Supprimer les lignes** dans Google Sheets :
   - Onglet **Persons** (la personne)
   - Onglet **Person_Ministries** (ses affectations)
   - Onglet **Person_Careers** (sa biographie)

2. La prochaine synchronisation supprimera automatiquement les fichiers JSON

---

### 🤖 Automatisation avec ChatGPT

Pour simplifier l'ajout de données, utilisez ce prompt ChatGPT :

<details>
<summary>📋 Cliquez pour voir le prompt complet</summary>

```markdown
# ASSISTANT D'AJOUT DE DONNÉES - GOUVERNEMENT FRANÇAIS

Tu es un assistant spécialisé dans la gestion de données gouvernementales françaises au format CSV pour Google Sheets.

## STRUCTURE DES DONNÉES

### PERSONS (colonnes principales)
- id : UUID v4 (générer systématiquement)
- full_name : Format "Prénom NOM"
- role : president | leader | minister | minister-delegate | collaborator
- superior_id : UUID du ministre supérieur (si collaborateur)
- party : Parti politique
- cabinet_role : Rôle dans le cabinet (si collaborateur)
- cabinet_order : Ordre d'affichage
- photo_url, description, wikipedia, email : optionnels
- created_at, updated_at : ISO 8601

### PERSON_MINISTRIES
- person_id : UUID de la personne
- ministry_id : UUID du ministère
- is_primary : TRUE (ministre principal) | FALSE (autres)
- role_label : "Ministre", "Cabinet du ministre", etc.

### PERSON_CAREERS
- id : UUID v4
- person_id : UUID de la personne
- bio_section : education | career | political | achievements
- title, description : Texte
- display_order : Position

## RÈGLES
1. Ministres : is_primary = TRUE pour au moins 1 ministère
2. Collaborateurs : role = collaborator, is_primary = FALSE
3. UUID : Générer de vrais UUID v4
4. Dates : Format ISO 8601 (2026-01-04T18:30:00+00:00)

## FORMAT DE SORTIE
Génère uniquement les lignes CSV prêtes à copier-coller dans Google Sheets.

Prêt ?
```

**Exemple d'utilisation** :
```
Ajoute Sophie MARTIN comme conseillère presse de Jean-Noël Barrot
```

ChatGPT génèrera les lignes CSV à copier directement dans Google Sheets.

</details>

---

### ✅ Validation automatique

Lors de chaque synchronisation, le système valide :
- ✓ Structure des CSV (colonnes obligatoires)
- ✓ Formats UUID valides
- ✓ Intégrité référentielle (FK valides)
- ✓ Contraintes métier (ministres avec is_primary, cycles hiérarchiques)
- ✓ Formats emails et URLs (si présents)
- ✓ Détection automatique des 337 membres de cabinet

En cas d'erreur, le workflow échoue et crée une issue GitHub avec les détails.

---

### 🔄 Workflow de synchronisation

**Automatique** : Toutes les 2 heures (cron : `0 */2 * * *`)

**Manuel** :
1. Aller sur GitHub → Actions
2. Sélectionner "Sync Google Sheets → Git"
3. Cliquer sur "Run workflow"

**Étapes du workflow** :
1. Téléchargement des 4 CSV depuis Google Sheets
2. Validation des données (UUID, FK, cycles, etc.)
3. Conversion CSV → JSON (36 ministres + index)
4. Commit automatique par "Google Sheets Sync Bot"
5. Déploiement automatique sur GitHub Pages

**Historique** : Tous les commits de synchronisation sont visibles dans l'historique Git avec le préfixe `sync: Mise à jour depuis Google Sheets`.

---

## Procedures de mise a jour

### ⚠️ Mise à jour des données (UNIQUEMENT via Google Sheets)

**Ne jamais éditer directement** :
- ❌ Fichiers CSV locaux
- ❌ Fichiers JSON dans `data/ministers/`
- ❌ Fichiers dans le dépôt Git

**Toujours éditer dans Google Sheets** :
1. Ouvrir le Google Sheet
2. Modifier les données dans les onglets appropriés
3. Sauvegarder (auto-save)
4. Attendre la synchronisation automatique (2h max) ou la déclencher manuellement

## Deploiement

Le projet est configure pour un deploiement automatique sur GitHub Pages :

### Configuration GitHub
- Repository : benjaminboussemart74-design/Gouvernement_Lecornu-II
- Branche : main
- Source : Deploy from a branch
- Dossier : /

### URL de production
https://benjaminboussemart74-design.github.io/Gouvernement_Lecornu-II/

## Conclusion

J'ai realise avec succes la migration complete du projet vers une architecture 100% statique. Cette migration apporte les benefices suivants :

- Elimination de toute dependance externe
- Amelioration significative des performances
- Simplification de la maintenance
- Reduction des risques de securite
- Suppression des couts d'hebergement

Le projet est desormais autonome et peut fonctionner sans aucune infrastructure serveur. Toutes les fonctionnalites originales ont ete preservees tout en supprimant le code d'impression selon les consignes recues.

## Annexes

### Schema JSON des donnees
```json
{
  "id": "uuid-string",
  "name": "Nom Prenom",
  "role": "president|leader|minister|minister-delegate|secretary",
  "party": "Renaissance|MoDem|LR|RN|PS|EELV|...",
  "photo": "https://... ou assets/photos/...",
  "portfolio": "Ministere de...",
  "description": "Biographie courte",
  "ministries": [...],
  "biography": [...],
  "collaborators": [...],
  "delegates": [...],
  "superiorId": "..."
}
```

### Technologies utilisees
- HTML5 semantique
- CSS3 avec Grid et Flexbox
- JavaScript ES6+ vanilla
- Supabase pour les données
- GitHub Pages pour l'hebergement

---

**Fin du rapport**

Benjamin Boussemart  
21 decembre 2025
