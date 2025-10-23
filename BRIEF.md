# BRIEF – One Page Interactive Gouvernement Lecornu II

## Qu’est-ce que ce projet ?

Cette page web interactive présente la composition du gouvernement Lecornu II, inspirée de la charte graphique Rumeur Publique (palette de couleurs, typographie Space Grotesk, rectangles arrondis, responsive, modale accessible).

## Structure du projet

- `index.html` : Squelette de la page, navigation, sections, modale.
- `styles.css` : Charte graphique complète (couleurs, typographie, layout, responsive).
- `script.js` : Interactions (filtres, recherche, modale accessible).
- `assets/placeholder-minister.svg` : Image de remplacement pour les ministres.
- `data/ministers.json` : Fichier de données pour alimenter la liste des ministres.
- `BRIEF.md` : Ce résumé explicatif.

## Fonctionnalités principales

- Affichage des ministres sous forme de cartes cliquables.
- Filtres par rôle et recherche instantanée.
- Modale accessible pour afficher la fiche détaillée d’un ministre.
- Responsive mobile et desktop.
- Palette de 14 couleurs, typographie Space Grotesk, rectangles arrondis (radius 10px).

## Comment personnaliser ?

- Pour ajouter des ministres, remplissez le fichier `data/ministers.json` avec des objets contenant :
  - `name` (nom du ministre)
  - `role` (leader, minister-state, minister, secretary, collaborator)
  - `portfolio` (intitulé du portefeuille)
  - `photo` (URL ou chemin vers la photo)
  - `description`, `mission`, `contact` (optionnels)

Exemple d’entrée :
```json
[
  {
    "name": "Jean Dupont",
    "role": "minister",
    "portfolio": "Ministre de l’Économie",
    "photo": "assets/jean-dupont.jpg",
    "description": "Expert en finances publiques.",
    "mission": "Piloter la politique économique.",
    "contact": "jean.dupont@gouv.fr"
  }
]
```

## Auteur

Ce projet a été généré automatiquement par GitHub Copilot, sur demande de l’utilisateur.

---
Pour toute question ou personnalisation, demandez simplement !
