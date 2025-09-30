# Galerie des cartes géoréférencées

Ce dossier contient la galerie complète des cartes géoréférencées de Galligeo, accessible via l'URL `/galligeo/galerie/`.

## Fonctionnalités

### 🗺️ Affichage des cartes
- **Vue en cartes** : Affichage en grille avec vignettes Gallica
- **Vue en tableau** : Affichage tabulaire détaillé
- **Pagination** : Navigation par pages pour les grandes collections
- **Recherche** : Recherche textuelle dans les titres, créateurs, dates et descriptions
- **Filtrage** : Filtrage par période historique

### ✅ Sélection multiple
- **Sélection de cartes** : Clic sur les cartes pour les sélectionner
- **Sélection en tableau** : Cases à cocher dans la vue tableau
- **Barre d'outils** : Interface sticky pour gérer la sélection
- **Compteur** : Affichage du nombre de cartes sélectionnées
- **Actions** : Boutons pour créer un atlas ou effacer la sélection

### 📊 Statistiques
- **Nombre total** de cartes géoréférencées
- **Nombre de contributeurs** uniques
- **Cartes récentes** géoréférencées ce mois-ci

## Structure des fichiers

```
galerie/
├── index.html          # Page principale de la galerie
├── galerie.js          # Logique JavaScript avec sélection
├── galerie.css         # Styles spécifiques à la galerie
└── README.md           # Cette documentation
```

## Architecture technique

### Classes JavaScript

#### `GalerieManager`
Classe principale qui gère :
- Chargement des données depuis l'API PTM
- Récupération des métadonnées Gallica via IIIF
- Gestion des vues (cartes/tableau)
- Pagination et filtrage
- Cache des métadonnées

### Fonctions de sélection
- `toggleMapSelection(arkId, element)` : Sélection/désélection de carte
- `toggleRowSelection(arkId, element)` : Sélection/désélection de ligne
- `updateSelectionUI()` : Mise à jour de l'interface de sélection
- `clearSelection()` : Effacement de la sélection
- `createAtlas()` : Création d'atlas (à implémenter)

### API utilisées

#### API PTM (Authentification requise)
- `getAllGeoreferencedMaps()` : Récupération de toutes les cartes
- `getGeoreferencedMapsStats()` : Statistiques des cartes

#### API Gallica IIIF
- Manifestes IIIF pour les métadonnées
- Vignettes haute résolution
- Liens vers les documents Gallica

### Fallback et développement
En cas d'indisponibilité de l'API PTM, le système utilise des données d'exemple pour permettre le développement et les tests.

## Styles CSS

### Sélection
- `.selectable-card` : Cartes cliquables avec effets hover
- `.selected` : État sélectionné avec bordure bleue
- `.selection-checkbox` : Cases à cocher sur les cartes
- `.selectable-row` : Lignes de tableau sélectionnables

### Interface
- `.selection-toolbar` : Barre d'outils sticky
- `.statistics-card` : Cartes de statistiques
- `.atlas-creation-btn` : Bouton de création d'atlas

### Responsive
- Adaptation mobile pour la barre d'outils
- Optimisation des tailles de cartes
- Amélioration de l'accessibilité

## Intégration

### Authentification
La galerie utilise le système d'authentification PTM via `ptm-auth.js`. L'utilisateur doit être connecté pour accéder aux fonctionnalités complètes.

### Navigation
- Accessible via l'URL : `https://app.ptm.huma-num.fr/galligeo/galerie/`
- Liens vers le géoréférenceur : `../georef/?ark={arkId}`
- Liens vers Gallica : `https://gallica.bnf.fr/ark:/12148/{arkId}`

### Données
Les données sont récupérées en temps réel depuis :
1. L'API PTM pour les informations de géoréférencement
2. L'API Gallica IIIF pour les métadonnées et vignettes

## Développement futur

### Atlas
La fonction `createAtlas()` est actuellement un placeholder. Elle devra :
1. Valider la sélection (minimum 2 cartes)
2. Créer une nouvelle vue agrégée
3. Permettre la visualisation simultanée des cartes sélectionnées
4. Sauvegarder les atlas créés

### Améliorations possibles
- Tri des colonnes en vue tableau
- Filtres avancés (par contributeur, date de géoréférencement)
- Export des sélections
- Partage d'atlas via URL
- Prévisualisation des cartes au survol

## Tests

Pour tester la galerie :
1. Naviguer vers `/galligeo/galerie/`
2. Vérifier l'affichage des cartes
3. Tester la recherche et les filtres
4. Basculer entre vues cartes/tableau
5. Sélectionner plusieurs cartes
6. Vérifier la barre d'outils de sélection

La galerie utilise des données d'exemple si l'API PTM n'est pas disponible, permettant un développement et des tests continus.