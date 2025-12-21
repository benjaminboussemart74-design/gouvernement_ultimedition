# BRIEF – One Page Interactive Gouvernement Lecornu II# BRIEF – One Page Interactive Gouvernement Lecornu II
J'ai réalisé ce projet dans le cadre de mon travail à rumeur publique, je ne suis pas développeur web, je n'ai pas la prétention à en être un. Je code avec des connaissances basiques que j'ai accumulé et avec beaucoup d'abdgnétation et avec un peu (beaucoup) d'aide de copilot. 

## Qu'est-ce que ce projet ?## Qu’est-ce que ce projet ?



Cette application web interactive présente la composition complète du gouvernement Lecornu II avec une interface moderne, accessible et responsive. Le projet inclut un système complet de gestion des ministres, de leurs délégués, des collaborateurs de cabinet, et des biographies détaillées, le tout connecté à une base de données Supabase.Cette page web interactive présente la composition du gouvernement Lecornu II, inspirée de la charte graphique Rumeur Publique (palette de couleurs, typographie Space Grotesk, rectangles arrondis, responsive, modale accessible).



L'interface s'inspire de la charte graphique Rumeur Publique avec la typographie Space Grotesk, une palette de couleurs étendue pour les partis politiques, et des composants modulaires et réutilisables.## Structure du projet



---- `index.html` : Squelette de la page, navigation, sections, modale.

- `styles.css` : Charte graphique complète (couleurs, typographie, layout, responsive).

## Architecture du projet- `script.js` : Interactions (filtres, recherche, modale accessible).

- `assets/placeholder-minister.svg` : Image de remplacement pour les ministres.

### Structure des fichiers- `data/ministers.json` : Fichier de données pour alimenter la liste des ministres.

- `BRIEF.md` : Ce résumé explicatif.

```

Gouvernement_Lecornu-II/## Fonctionnalités principales

├── index.html                  # Page principale

├── script.js                   # Logique JavaScript principale (4500+ lignes)- Affichage des ministres sous forme de cartes cliquables.

├── styles.css                  # Styles principaux- Filtres par rôle et recherche instantanée.

├── BRIEF.md                    # Documentation (ce fichier)- Modale accessible pour afficher la fiche détaillée d’un ministre.

├── assets/                     # Ressources visuelles- Responsive mobile et desktop.

│   ├── LogoRP_*.svg/png       # Logos Rumeur Publique (variantes)- Palette de 14 couleurs, typographie Space Grotesk, rectangles arrondis (radius 10px).

│   ├── Havelock-Stencil.otf   # Polices personnalisées

│   └── placeholder-minister.svg## Comment personnaliser ?

├── config/                     # Configuration Supabase

│   ├── supabase.js            # Client Supabase principal- Pour ajouter des ministres, remplissez le fichier `data/ministers.json` avec des objets contenant :

│   ├── supabase-lite-client.js # Client léger  - `name` (nom du ministre)

│   ├── supabase.local.js      # Configuration locale (git-ignoré)  - `role` (leader, minister-state, minister, secretary, collaborator)

│   └── fetch-ministernode.js  # Requêtes spécifiques  - `portfolio` (intitulé du portefeuille)

├── scripts/                    # Scripts utilitaires et tests  - `photo` (URL ou chemin vers la photo)

│   ├── organigrammes.js       # Affichage organigramme interactif  - `description`, `mission`, `contact` (optionnels)

│   ├── cabinet-tree-rpc.js    # Arborescence des cabinets

│   ├── floating-loupe.js      # Loupe flottante sur organigrammesExemple d’entrée :

│   ├── test_*.js              # Scripts de test Supabase```json

│   ├── validate_*.js          # Scripts de validation[

│   └── README_TEST_CAREERS.md # Documentation des tests  {

└── styles/                     # Styles modulaires    "name": "Jean Dupont",

    ├── base.css               # Styles de base    "role": "minister",

    ├── components.css         # Composants réutilisables    "portfolio": "Ministre de l’Économie",

    ├── cabinet-tree.css       # Styles arborescence cabinet    "photo": "assets/jean-dupont.jpg",

    ├── org-style.css          # Styles organigramme    "description": "Expert en finances publiques.",

    └── organigramme.css       # Styles organigramme alternatif    "mission": "Piloter la politique économique.",

```    "contact": "jean.dupont@gouv.fr"

  }

---]

```

## Fonctionnalités principales


### 1. Affichage et navigation des ministres

#### Grille des ministres
- **Cartes interactives** : Chaque ministre est affiché dans une carte avec photo, nom, rôle, portefeuille, et badge de parti politique
- **Affichage hiérarchique** : Les leaders (Président, Premier ministre) sont mis en avant dans une section dédiée
- **Design responsive** : Layout adaptatif avec colonnes automatiques (CSS Grid auto-fit)
- **États de chargement** : Overlays animés avec durée minimale de 2 secondes pour une UX fluide

#### Système de rôles
Le projet gère 8 types de rôles différents :
- `president` : Président de la République
- `leader` : Premier ministre
- `minister-state` : Ministre d'État
- `minister` : Ministre
- `minister-delegate` / `ministre-delegue` : Ministre délégué
- `secretary` : Secrétaire d'État
- `collaborator` : Collaborateur de cabinet

#### Hiérarchie des ministères
- Ordre de tri personnalisable (20 ministères prédéfinis)
- Normalisation des noms pour le matching
- Support multi-ministères par personne

### 2. Système de recherche et filtres avancés

#### Recherche textuelle
- **Recherche en temps réel** : Debounce de 220ms pour optimiser les performances
- **Champs recherchés** : Nom, portefeuille, ministères associés
- **Normalisation** : Suppression des accents et casse insensible

#### Filtres disponibles
1. **Filtre par rôle** : Boutons rapides pour filtrer par type de ministre
2. **Filtre par parti politique** : Menu déroulant dynamique avec 25+ partis supportés
3. **Filtre "Cabinet renseigné"** : Affiche uniquement les ministres ayant des délégués
4. **Filtre "Bio disponible"** : Affiche uniquement les ministres avec biographie

#### Tri
- Par rôle (priorité hiérarchique + ordre ministériel)
- Alphabétique (A-Z)
- Par portefeuille


### 3. Gestion des partis politiques

#### 25+ partis supportés
Le système reconnaît et affiche les partis suivants :
- **Majorité** : Renaissance, Horizons, MoDem, PRV, Centristes, UDI
- **Droite** : Les Républicains, DLF
- **Extrême droite** : RN, Reconquête, Patriotes
- **Gauche** : PS, Place Publique, Génération.s, EELV
- **Gauche radicale** : PCF, LFI, NPA, LO
- **Autres** : PRG, POI, Animaliste, Volt, Régionalistes
- **Sans étiquette** : Détection automatique

#### Fonctionnalités
- **Normalisation intelligente** : Multiples variantes acceptées par parti
- **Couleurs personnalisées** : 14 partis avec couleur CSS dédiée
- **Badges visuels** : Affichage élégant avec attribut `data-party` pour le styling
- **Fallback automatique** : Gestion des partis sans étiquette

### 4. Modale de détail ministre

#### Contenu
- Photo haute résolution avec fallback
- Nom, rôle et portefeuille
- Badge du parti politique
- Biographie complète
- Liste des ministères associés
- Section des délégués (ministres délégués et secrétaires d'État)
- Module biographie détaillé (voir section dédiée)
- Arborescence du cabinet (collaborateurs)

#### Fonctionnalités UX
- **Ouverture fluide** : Animation d'apparition
- **Fermeture multiple** : Bouton close, clic backdrop, touche Escape
- **État de chargement** : Overlay avec durée minimale garantie
- **Export PDF** : Génération d'une fiche imprimable (voir section dédiée)
- **Accessibilité** : Gestion du focus, ARIA labels, navigation clavier

### 5. Module biographie avancé

#### Parsing de dates intelligent
Le système parse automatiquement plusieurs formats de dates en français :
- Formats ISO : `YYYY-MM-DD`, `YYYY-MM`, `YYYY`
- Plages : `2024-2025`, `2024 – 2025`
- Mois français : `septembre 2024`, `15 septembre 2024`, `sept. 2024`
- Abréviations : Support de toutes les abréviations de mois (`janv.`, `févr.`, etc.)
- Extraction automatique : Trouve l'année dans n'importe quelle chaîne

**Note technique** : Les regex pour les dates utilisent un double-échappement (`\\d`, `\\s`) dans les constructeurs `RegExp()` pour garantir que les séquences d'échappement arrivent intactes au moteur regex (conformité CodeQL).

#### Catégories de biographie
Affichage organisé par sections prédéfinies :
1. Gouvernement
2. Assemblée nationale
3. Sénat
4. Parti politique
5. Mandats locaux
6. Collectivités locales
7. Société civile
8. Vie professionnelle
9. Administrations et associations
10. Formation académique

#### Fonctionnalités
- **Normalisation des entrées** : Support JSON, arrays, strings avec bullet points
- **Tri intelligent** : Par `sort_index` puis par date de début (DESC)
- **Statut actuel** : Détection automatique des postes en cours
- **Formatage de périodes** : Affichage "Année début – Année fin" ou "Depuis Année"
- **Couleurs personnalisées** : Support de couleurs par catégorie (via `--biography-accent`)
- **Événements ponctuels** : Support des dates ponctuelles (`event_date` / `event_text`)

#### Source de données
- Table Supabase : `person_careers` (ou vue configurée via `SUPABASE_BIOGRAPHY_VIEW`)
- Chargement asynchrone à l'ouverture de la modale
- Cache des biographies pour éviter les requêtes multiples

### 6. Système de cabinet et collaborateurs

#### Gestion hiérarchique
- **Récupération récursive** : Charge tous les collaborateurs d'un ministre et leurs subordonnés
- **Ordre personnalisable** : Tri par `cabinet_order` depuis la base de données
- **Grades de cabinet** : Système de grades hiérarchiques

#### Grades reconnus
- Directeur/rice de cabinet (`DIRECAB`)
- Adjoint au directeur de cabinet (`DIRECAB-ADJ`)
- Chef·fe de cabinet (`CHEFCAB`)
- Adjoint au chef de cabinet (`CHEFCAB-ADJ`)
- Chef·fe de pôle (`CHEFPOLE`)
- Conseiller·ère (`CONSEILLER`)

#### Affichage
- **Lanes hiérarchiques** : Organisation visuelle par niveaux (Direction, Chefs de cabinet, Conseillers)
- **Cartes collaborateur** : Nom, rôle, grade, email, pôle
- **Avatars générés** : Initiales si pas de photo
- **Fallback automatique** : Gestion des grades non reconnus

#### Intégration
- Champs supportés : `full_name`, `photo_url`, `cabinet_role`, `job_title`, `collab_grade`, `email`, `cabinet_order`, `pole_name`
- Mapping automatique des grades avec alias
- Cache des collaborateurs pour performances

### 7. Organigrammes interactifs

#### Script `organigrammes.js`
- **Affichage hiérarchique** : Arborescence visuelle du Premier ministre ou Président
- **Bascule dynamique** : Boutons pour switcher entre PM et Président
- **Avatars générés** : SVG avec initiales si pas de photo
- **Panel de détails** : Overlay pour voir les informations complètes d'un collaborateur
- **Refresh** : Rechargement des données à la demande

#### Script `cabinet-tree-rpc.js`
- Fonctions RPC pour récupérer l'arborescence complète
- Support de la profondeur de récursion
- Optimisations de requêtes

#### Loupe flottante (`floating-loupe.js`)
- Zoom interactif sur les organigrammes complexes
- Suivi du curseur avec effet de loupe
- Activation/désactivation selon la densité

### 8. Intégration Supabase

#### Configuration
- **Multi-environnement** : Support dev/prod via fichiers de config
- **Variables d'environnement** : Lecture depuis `window`, meta tags HTML, ou fichiers locaux
- **Client léger** : Option `supabase-lite-client.js` pour réduire le bundle
- **Sécurité** : Anon key pour accès public, pas de clés secrètes côté client

#### Tables et vues utilisées
1. **`persons`** : Informations principales des personnes
   - Champs : `id`, `full_name`, `role`, `photo_url`, `party`, `superior_id`, `job_title`, etc.
2. **`person_ministries`** : Associations personnes ↔ ministères
   - Champs : `person_id`, `ministry_id`, `role_label`, `is_primary`
3. **`ministries`** : Liste des ministères
   - Champs : `id`, `label`, `short_label`, `color`
4. **`person_careers`** : Entrées de biographie
   - Champs : `person_id`, `bio_section`, `title`, `organisation`, `start_date`, `end_date`, `sort_index`, `ongoing`
5. **Vues personnalisées** : `vw_ministernode`, `person_careers_view` (optionnelles)

#### Requêtes optimisées
- Sélection de colonnes spécifiques
- Filtres côté serveur
- Tri et limit pour réduire la bande passante
- Jointures pour récupérer délégués et ministères

### 9. Export PDF

#### Fonctionnalité
- **Bouton d'export dans la modale** : Génère une fiche imprimable du ministre
- **Template dédié** : Layout optimisé pour l'impression
- **Contenu exporté** :
  - En-tête avec branding Rumeur Maps
  - Photo et informations principales
  - Biographie
  - Missions
  - Contact
  - Liste des collaborateurs de cabinet
  - Footer avec CTA discret

#### Technique
- Génération d'un conteneur `#print-sheet` temporaire
- Application de la classe `.print-single` au body
- Utilisation de `window.print()` natif
- Nettoyage automatique après impression
- Media queries CSS pour styles d'impression

### 10. Gestion des images

#### Système de fallback global
- **Détection automatique** : Écoute des événements `error` sur toutes les images
- **Fallback hiérarchique** :
  1. Image spécifiée (Supabase storage, URL absolue, ou chemin relatif)
  2. Placeholder SVG par défaut
  3. Logo Rumeur Publique (pour avatars manquants)
- **MutationObserver** : Gestion des images ajoutées dynamiquement
- **Protection des leaders** : Pas de fallback automatique pour Président/PM

#### Support Supabase Storage
- Détection automatique des chemins `bucket/path/file.ext`
- Construction d'URLs publiques : `${SUPABASE_URL}/storage/v1/object/public/${path}`
- Support des chemins déjà formés
- Gestion des data URIs et URLs absolues

### 11. Accessibilité (A11Y)

#### Conformité WCAG
- **Rôles ARIA** : `role="listitem"`, `role="dialog"`, `aria-label`, etc.
- **États dynamiques** : `aria-busy`, `aria-expanded`, `aria-disabled`
- **Gestion du focus** : Piège de focus dans la modale, restoration après fermeture
- **Navigation clavier** : Support complet (Tab, Escape, Enter)
- **Labels explicites** : Tous les contrôles ont des labels lisibles

#### UX inclusive
- Contraste de couleurs suffisant
- Tailles de clic généreuses (min 44x44px)
- Messages de feedback clairs
- États de chargement visibles
- Pas de clignotement ou animations agressives

### 12. Responsive Design

#### Breakpoints
- Mobile : < 768px
- Tablette : 768px - 1024px
- Desktop : > 1024px

#### Adaptations
- **Grille** : 1 colonne → 2 colonnes → 3+ colonnes (auto-fit)
- **Navigation** : Menu hamburger sur mobile
- **Modale** : Plein écran sur mobile, centrée sur desktop
- **Cartes** : Empilage vertical sur mobile
- **Typographie** : Échelle fluide avec clamp()

---

## Scripts de test et validation

### Tests Supabase

#### `test_supabase_careers.js`
- Vérifie l'accès à la table `person_careers`
- Affiche un échantillon de lignes
- Diagnostique les erreurs de connexion

#### `test_modal_population.js`
- Teste le remplissage de la modale avec des données réelles
- Vérifie le chargement des biographies

#### `test_modal_for_id.js`
- Teste l'ouverture de la modale pour un ID spécifique

#### `test_card_accent.js`
- Vérifie l'application des couleurs d'accent par parti

### Scripts de validation

#### `validate_lecornu.js`
- Valide la structure des données du gouvernement Lecornu II
- Vérifie la cohérence des relations hiérarchiques

#### `validate_careers_order.js`
- Valide l'ordre des entrées de biographie
- Vérifie les `sort_index` et les dates

### Utilitaires

#### `run_script_in_jsdom.js`
- Permet d'exécuter des tests dans un environnement JSDOM
- Simule un navigateur pour les tests Node.js

---

## Configuration et personnalisation

### Environnement Supabase

#### Fichier `config/supabase.local.js` (créer depuis l'exemple)
```javascript
export const SUPABASE_URL = 'https://votre-projet.supabase.co';
export const SUPABASE_ANON_KEY = 'votre-anon-key';
export const SUPABASE_BIOGRAPHY_VIEW = 'person_careers'; // ou votre vue
export const SUPABASE_CAREERS_TABLE = 'person_careers';
```

#### Configuration alternative via HTML meta tags
```html
<meta name="supabase-url" content="https://..." />
<meta name="supabase-anon-key" content="..." />
```

### Personnalisation des partis

Pour ajouter un parti politique :

1. **Ajouter au mapping** dans `script.js` :
```javascript
const PARTY_MAP = new Map([
  // ... existants
  ["nouveau-parti", "Nouveau Parti"],
  ["np", "Nouveau Parti"], // alias
]);
```

2. **Ajouter la couleur** (optionnel) :
```javascript
const PARTY_COLORS = {
  // ... existants
  "Nouveau Parti": "#HEXCOLOR",
};
```

3. **Ajouter le style CSS** (optionnel) dans `styles.css` :
```css
[data-party="Nouveau Parti"] {
  --accent-color: #HEXCOLOR;
}
```

### Personnalisation de l'ordre des ministères

Modifier la constante `MINISTRY_ORDER` dans `script.js` :
```javascript
const MINISTRY_ORDER = [
  "Premier ministre",
  "Votre ministère 1",
  "Votre ministère 2",
  // ...
];
```

### Ajout de catégories de biographie

Modifier `BIOGRAPHY_CATEGORY_ORDER` dans `script.js` :
```javascript
const BIOGRAPHY_CATEGORY_ORDER = [
  'Gouvernement',
  'Votre nouvelle catégorie',
  // ...
];
```

---

## Structure de données attendue

### Table `persons`
```sql
CREATE TABLE persons (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT, -- 'leader', 'president', 'minister', etc.
  photo_url TEXT,
  party TEXT,
  job_title TEXT,
  superior_id UUID REFERENCES persons(id),
  cabinet_role TEXT,
  collab_grade TEXT,
  cabinet_order INTEGER,
  pole_name TEXT,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Table `person_ministries`
```sql
CREATE TABLE person_ministries (
  person_id UUID REFERENCES persons(id),
  ministry_id UUID REFERENCES ministries(id),
  role_label TEXT, -- 'Ministre délégué chargé de...', etc.
  is_primary BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (person_id, ministry_id)
);
```

### Table `ministries`
```sql
CREATE TABLE ministries (
  id UUID PRIMARY KEY,
  label TEXT NOT NULL,
  short_label TEXT,
  color TEXT -- HEX color for accent
);
```

### Table `person_careers`
```sql
CREATE TABLE person_careers (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES persons(id),
  bio_section TEXT, -- 'Gouvernement', 'Formation académique', etc.
  title TEXT,
  organisation TEXT,
  start_date DATE,
  end_date DATE,
  ongoing BOOLEAN DEFAULT FALSE,
  sort_index INTEGER,
  color TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Fonctionnalités techniques avancées

### Normalisation de texte
- Suppression des accents (NFD + regex)
- Conversion en minuscules
- Gestion des espaces insécables
- Utilisé pour recherche, matching de partis, etc.

### Debouncing
- Recherche textuelle : 220ms
- Redimensionnement fenêtre : 160ms

### Gestion d'état
- Variables globales pour ministres, filtres, tri
- Cache des collaborateurs par ministre
- Cache des biographies

### Performance
- Sélection de colonnes spécifiques dans les requêtes
- Limit sur les résultats Supabase
- MutationObserver avec throttling implicite
- CSS Grid auto-fit pour layout performant

### Regex dynamiques sécurisées
- Échappement des métacaractères regex
- Double-échappement des backslashes pour `\d`, `\s` dans RegExp constructor
- Correction CodeQL appliquée pour éviter les failles

### Gestion des outlines CSS
- **Suppression des outlines par défaut** : `outline: none;` sur les inputs et boutons en focus pour éviter les contours disgracieux du navigateur
- **Outlines d'accessibilité** : `outline: 2px solid var(--color-panthere); outline-offset: 2px;` sur les sélecteurs `:focus-visible` pour indiquer la navigation au clavier
- **Équilibre UX/Accessibilité** : Les outlines natives sont supprimées mais remplacées par des indicateurs d'accessibilité modernes utilisant `:focus-visible`

---

## Maintenance et évolution

### Ajout d'un ministre
1. Insérer dans la table `persons` avec le bon `role`
2. Associer aux ministères via `person_ministries`
3. (Optionnel) Ajouter des entrées dans `person_careers`
4. (Optionnel) Ajouter des collaborateurs avec `superior_id`

### Modification de la hiérarchie
- Mettre à jour le champ `superior_id` dans `persons`
- Le système reconstruit automatiquement les arborescences

### Ajout de scripts de validation
1. Créer un fichier dans `scripts/`
2. Importer les configs nécessaires depuis `config/`
3. Documenter dans `scripts/README_*.md`

---

## Dépendances

### Externes (CDN)
- **Supabase JS Client** : Géré via script dans HTML (v2+)
- **Google Fonts** : Space Grotesk (300, 400, 500, 600, 700)

### Internes
- Aucune dépendance npm
- Vanilla JavaScript ES6+
- CSS moderne (Grid, Flexbox, Custom Properties)

---

## Support navigateurs

### Navigateurs supportés
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

### Fonctionnalités utilisées
- ES6+ (let/const, arrow functions, template literals, async/await)
- CSS Grid et Flexbox
- CSS Custom Properties (variables CSS)
- Fetch API
- IntersectionObserver (optionnel)
- MutationObserver

---

## Licence et crédits

### Auteurs
- Développement initial : GitHub Copilot
- Maintenance et évolutions : Benjamin Boussemart dans le cadre de son travail en alternance à Rumeur Publique

### Assets
- Logos Rumeur Publique : © Rumeur Publique
- Police Space Grotesk : Google Fonts (SIL Open Font License)
- Police Havelock : Licence à vérifier

---

## FAQ et dépannage

### La modale ne s'ouvre pas
- Vérifier la console pour les erreurs JavaScript
- Vérifier que Supabase est correctement configuré
- Vérifier que le `person_id` existe dans la base

### Les images ne s'affichent pas
- Vérifier les URLs dans `photo_url`
- Vérifier la configuration Supabase Storage
- Vérifier les permissions RLS sur le bucket

### Les biographies sont vides
- Vérifier que la table/vue `person_careers` existe
- Vérifier les permissions RLS
- Vérifier le `person_id` dans les entrées

### Les filtres ne fonctionnent pas
- Vérifier que les données ont bien les champs `role`, `party`, etc.
- Vérifier la console pour les erreurs
- Réinitialiser les filtres avec le bouton reset

### CodeQL signale des problèmes de regex
- Les échappements de regex dans les constructeurs RegExp sont corrects
- Les month names sont échappés avant insertion dans le pattern
- Si CodeQL persiste, vérifier la version de l'analyseur

---

## Roadmap et améliorations futures

### Fonctionnalités prévues
- [ ] Export Excel des résultats filtrés
- [ ] Mode comparaison (afficher 2 ministres côte à côte)
- [ ] Historique des gouvernements (navigation temporelle)
- [ ] Mode dark automatique (prefers-color-scheme)
- [ ] PWA (Progressive Web App) avec offline support
- [ ] Graphiques statistiques (répartition par parti, genre, etc.)
- [ ] Timeline interactive des carrières
- [ ] Recherche avancée par date de nomination
- [ ] Notifications de changements (via RSS ou webhooks)
- [ ] Intégration réseaux sociaux (partage de fiches)

### Optimisations techniques
- [ ] Lazy loading des images
- [ ] Virtual scrolling pour grandes listes
- [ ] Service Worker pour cache intelligent
- [ ] Compression des assets
- [ ] Tree-shaking du client Supabase
- [ ] Migration vers TypeScript (optionnel)
- [ ] Tests unitaires avec Jest
- [ ] Tests E2E avec Playwright

---

## Contact et support

Pour toute question, personnalisation ou signalement de bug :
- Créer une issue sur le repository GitHub
- Contacter Rumeur Publique

---

**Dernière mise à jour** : 21 décembre 2025
