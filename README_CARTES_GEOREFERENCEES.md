# 🗺️ Cartes Géoréférencées - Guide d'utilisation

## Vue d'ensemble

La nouvelle page **"Cartes géoréférencées"** permet de découvrir et explorer toutes les cartes historiques géolocalisées par la communauté Galligeo. Cette interface publique met en valeur le travail collaboratif de géoréférencement effectué sur les documents de Gallica.

## 🚀 Accès à la fonctionnalité

### Depuis la page d'accueil
- **Bouton header** : "Cartes géoréférencées" (bleu, avec icône carte)
- **Menu navigation** : Lien dans le menu hamburger

### URL directe
```
https://app.ptm.huma-num.fr/galligeo/cartes-georeferencees.html
```

## 🔍 Fonctionnalités

### Recherche intelligente
- **Temps réel** : Résultats instantanés pendant la saisie
- **Multi-critères** : Recherche dans titre, créateur, date, description, contributeur
- **Exemple de recherches** :
  - "Paris" → trouve toutes les cartes de Paris
  - "1944" → trouve les cartes de cette année
  - "Girard" → trouve les cartes de ce créateur

### Filtres par période
- **Moyen Âge** : Cartes antérieures à 1453
- **Renaissance** : XVe-XVIe siècles (1453-1600)
- **Époque moderne** : XVIIe-XVIIIe siècles (1600-1800)
- **XIXe siècle** : 1800-1900
- **XXe siècle** : Après 1900

### Modes d'affichage

#### 🎴 Mode Cartes (par défaut)
- **Vignettes visuelles** : Images issues de Gallica
- **Métadonnées complètes** : Titre, créateur, date, contributeur
- **Actions directes** :
  - Clic sur la carte → Voir le géoréférencement
  - "Voir sur Gallica" → Notice originale

#### 📊 Mode Tableau
- **Vue compacte** : Plus d'informations par écran
- **Colonnes** : Titre, Créateur, Date, Géoréférencé par, Date de géoréférencement
- **Actions groupées** : Boutons Géoréférencement et Gallica

### Pagination
- **12 éléments par page** (mode cartes)
- **Navigation intuitive** : Précédent/Suivant + numéros
- **Retour en haut** : Scroll automatique lors du changement de page

## 📊 Statistiques

En haut de page, découvrez :
- **Nombre total** de cartes géoréférencées
- **Nombre de contributeurs** uniques
- **Activité récente** (cartes du mois en cours)

## 🛠️ Pour les développeurs

### Lancement du serveur mock (développement)

```bash
# Installation des dépendances
npm install

# Lancement du serveur API mock
npm run mock-api

# Ou développement complet (API + frontend)
npm run dev-with-api
```

Le serveur mock simule l'API sur `http://localhost:3001` avec :
- `/public/galligeo/georeferenced-maps` : Liste des cartes
- `/public/galligeo/georeferenced-stats` : Statistiques
- `/test` : Test de fonctionnement

### Architecture technique

```
cartes-georeferencees.html
├── CSS : DSFR + styles personnalisés
├── JS : cartes-georeferencees.js (logique principale)
└── API : 
    ├── PTM Auth (données utilisateurs)
    ├── Gallica IIIF (métadonnées)
    └── Mock Server (développement)
```

### Intégration API

#### Endpoint principal
```javascript
GET /public/galligeo/georeferenced-maps
Response: {
  maps: [
    {
      ark: "btv1b53121232b",
      title: "Paris en 1944",
      creator: "Girard et Barrère",
      date: "1944",
      georeferenced_by: "utilisateur",
      georeferenced_date: "2024-09-15T10:30:00Z",
      status: "georeferenced"
    }
  ],
  total: 150
}
```

#### Statistiques
```javascript
GET /public/galligeo/georeferenced-stats
Response: {
  totalMaps: 150,
  uniqueContributors: 25,
  recentMaps: 12,
  byPeriod: { ... }
}
```

### Fallback et résilience

En cas d'indisponibilité de l'API :
- **Données d'exemple** : Cartes pré-configurées affichées
- **Métadonnées Gallica** : Récupération directe via IIIF
- **Fonctionnement dégradé** : Toutes les fonctionnalités restent accessibles

## 🎯 Cas d'usage

### Pour le grand public
- **Découverte** : Explorer l'histoire cartographique
- **Recherche thématique** : Trouver des cartes par lieu ou époque
- **Valorisation** : Comprendre l'intérêt du géoréférencement

### Pour les chercheurs
- **Corpus** : Vue d'ensemble des cartes géoréférencées
- **Méthodologie** : Comprendre les contributions communautaires
- **Accès direct** : Liens vers géoréférencements et sources

### Pour les contributeurs
- **Motivation** : Voir son travail valorisé publiquement
- **Inspiration** : Découvrir d'autres géoréférencements
- **Communauté** : Identifier les autres contributeurs

## 🔧 Maintenance et évolutions

### Améliorations possibles
- **Géolocalisation** : Filtres par zone géographique
- **Qualité** : Indicateurs de précision du géoréférencement
- **Social** : Commentaires et évaluations communautaires
- **Export** : Téléchargement de listes, formats standards

### Surveillance
- **Performance** : Temps de chargement des vignettes Gallica
- **Usage** : Analytics sur les recherches populaires
- **Erreurs** : Monitoring des échecs de récupération Gallica

## 📞 Support

Pour toute question ou problème :
- **Code source** : [GitHub Galligeo](https://github.com/paristimemachine/galligeo-front)
- **Documentation** : `doc/CARTES_GEOREFERENCEES_FEATURE.md`
- **Issues** : Signalement via GitHub Issues

---

*Cette fonctionnalité s'inscrit dans la mission de valorisation du patrimoine cartographique numérique et de promotion du travail collaboratif de géoréférencement.*