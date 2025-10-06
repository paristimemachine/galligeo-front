# Changelog Galligeo

## [2025-10-06] - Centrage automatique sur l'emprise des tuiles dans l'atlas

### ✨ Nouvelles fonctionnalités (New Features)

- **Centrage automatique sur l'emprise des tuiles** : Les atlas se centrent maintenant automatiquement sur la zone géographique réelle couverte par les cartes
  - **API info_tiles** : Utilisation de `https://tile.ptm.huma-num.fr/tiles/ark/info_tiles/12148/{arkid}` pour récupérer les bounds
  - **Calcul d'emprise combinée** : Pour les atlas multi-cartes, calcul de l'emprise maximale (min/max x/y)
  - **Centrage automatique** : Application au chargement de l'atlas
  - **Bouton manuel** : Nouveau bouton "Centrer sur les cartes" pour recentrer à tout moment
  - **Gestion multi-modes** : Fonctionne en mode simple et en mode éclaté

- **Logo Galligeo dans le header** : Ajout du logo dans le header de l'atlas pour la cohérence visuelle
  - **Position** : En haut du header, au-dessus de la barre d'informations
  - **Lien** : Cliquable, retour à l'accueil de Galligeo
  - **Responsive** : 50px sur desktop, 40px sur mobile
  - **Accessibilité** : Alt text et tooltip

- **Fonctions JavaScript ajoutées** :
  - `fetchTileInfo(arkId)` : Récupère les informations de tuiles depuis l'API PTM
  - `calculateCombinedBounds(tilesInfoArray)` : Calcule l'emprise maximale pour plusieurs cartes
  - `fitToTilesBounds()` : Centre la vue sur l'emprise calculée avec gestion du loading

### 🎨 Interface utilisateur (UI/UX)

- **Nouveau bouton** : "Centrer sur les cartes" dans la barre de contrôle de l'atlas
  - Style DSFR avec icône focus/centrage
  - Positionné avant le bouton de basculement de vue
  - Tooltip explicatif
  - Indicateur de chargement pendant le calcul

- **Logo dans le header** :
  - Design cohérent avec l'application principale
  - Navigation intuitive vers l'accueil
  - Branding Galligeo maintenu dans toute l'application

### 🔧 Technique (Technical)

- **Requêtes parallèles** : Utilisation de `Promise.all()` pour récupérer les infos de toutes les cartes simultanément
- **Gestion d'erreur robuste** : 
  - Cartes sans données de bounds ignorées
  - Fallback sur vue France par défaut si aucune donnée disponible
  - Logs console informatifs
- **Padding intelligent** : Marge de 20px pour éviter que les cartes touchent les bords
- **Format de données** : Parsing des bounds au format `"minLng,minLat,maxLng,maxLat"`

### 📊 Performance

- **Optimisation** : Requêtes API parallèles pour réduire le temps d'attente
- **Mise en cache** : Les informations de tuiles pourraient être mises en cache (évolution future)
- **Responsive** : Fonctionne correctement sur tous les formats d'écran

### 📚 Documentation (Documentation)

- **Nouveau** : `doc/ATLAS_TILES_BOUNDS_FEATURE.md` - Documentation technique complète
- **Nouveau** : `doc/ATLAS_TILES_BOUNDS_TESTING.md` - Guide de test de la fonctionnalité

### 🔮 Évolutions possibles

- Mémorisation de la vue préférée de l'utilisateur
- Animation de transition lors du centrage
- Affichage visuel des bounds de chaque carte
- Export des coordonnées de l'emprise
- Zoom intelligent selon la densité des cartes

---

## [2025-10-06] - Onglet "Mes atlas" fonctionnel dans l'application principale

### ✨ Nouvelles fonctionnalités (New Features)

- **Onglet "Mes atlas" dans la modale des paramètres** : L'onglet affiche maintenant la liste complète des atlas créés par l'utilisateur
  - **Interface** : Cartes avec détails (type, nombre de cartes, date de création, statut public/privé)
  - **Actions** : Visualisation d'un atlas (nouvel onglet) et suppression (avec confirmation)
  - **États** : Gestion des cas utilisateur non connecté, sans atlas, ou avec atlas
  - **Synchronisation** : Les atlas créés dans la galerie apparaissent automatiquement

- **Fonctions JavaScript ajoutées** :
  - `loadUserAtlas()` : Charge les atlas depuis l'API PTM
  - `displayAtlasList()` : Génère et affiche le HTML de la liste des atlas
  - `confirmDeleteAtlas()` : Demande confirmation avant suppression
  - `deleteAtlas()` : Supprime un atlas via l'API avec animation
  - `showAtlasNotification()` : Affiche des notifications temporaires (succès/erreur)

### 🎨 Interface utilisateur (UI/UX)

- **Cartes atlas** : Design cohérent avec le système DSFR
  - Icône selon le mode (diachronique 🕐 ou voisinage 🗂️)
  - Badge de statut (Public/Privé)
  - Informations claires (type, nombre de cartes, date)
  - Boutons d'action (Voir, Supprimer)

- **Animations** : 
  - Indicateur de chargement pendant les appels API
  - Transition fluide lors de la suppression (slide + fade out)
  - Notifications temporaires avec disparition automatique après 5 secondes

### 🔗 Intégration (Integration)

- **API PTM** :
  - `GET /auth/app/galligeo/atlas?owner={orcid}&include_private=true` : Récupération des atlas
  - `DELETE /auth/app/galligeo/atlas/{atlasId}` : Suppression d'un atlas
  
- **Gestion des erreurs** :
  - 401 Unauthorized : Message "Session expirée"
  - 403 Forbidden : Message "Droits insuffisants"
  - 404 Not Found : Message "Atlas introuvable"
  - Erreurs réseau : Messages appropriés

- **Cohérence avec la galerie** : Code identique pour faciliter la maintenance

### 📚 Documentation (Documentation)

- **Nouveau** : `doc/ATLAS_TAB_MAIN_APP.md` - Documentation technique complète
- **Nouveau** : `doc/ATLAS_TAB_SUMMARY.md` - Résumé visuel des modifications
- **Nouveau** : `doc/ATLAS_TAB_DEV_GUIDE.md` - Guide pour les développeurs

### 🔧 Technique (Technical)

- **Initialisation** : Chargement automatique au clic sur l'onglet "Mes atlas"
- **Sécurité** : Vérification de l'authentification pour toutes les opérations
- **Performance** : Chargement à la demande (pas de polling automatique)
- **Debug** : Fonctions exposées globalement (`window.loadUserAtlas()`, etc.)

### 📝 Fichiers modifiés

- `index.html` : 
  - HTML de l'onglet "Mes atlas" (lignes ~700-750)
  - Code JavaScript de gestion des atlas (lignes ~1730-2020)

---

## [2025-10-06] - Correction des statuts vides et dépôt Nakala

### 🐛 Corrections critiques (Critical Bugfixes)

- **Statuts vides en base de données** : Correction du bug créant des objets `status: {}` au lieu de chaînes
  - **Cause** : Ordre incorrect des paramètres dans `worked-maps-manager.js` ligne 381
  - **Avant** : `updateWorkedMap(arkId, mapData, 'en-cours')` ❌ 
  - **Après** : `updateWorkedMap(arkId, 'en-cours', mapData)` ✅
  - **Impact** : Les cartes ajoutées avaient un statut vide `{}` au lieu de `"en-cours"`

- **DOI non sauvegardé lors du dépôt Nakala** : Correction de la perte du DOI
  - **Problème** : Le DOI passé dans `additionalData` n'était pas transféré vers l'objet sauvegardé
  - **Solution 1** : Ajout du DOI dans `saveMapStatus()` si présent dans `additionalData`
  - **Solution 2** : Conservation du DOI dans `validateGalligeoData()` lors de la validation
  - **Impact** : Le DOI est maintenant correctement sauvegardé et affiché dans la galerie

- **Statut non mis à jour après géoréférencement** : Amélioration des logs et diagnostic
  - **Problème** : Les cartes restent en statut `"en-cours"` après géoréférencement réussi
  - **Cause** : Erreurs silencieuses lors de la mise à jour du statut (`.catch()` sans `.then()`)
  - **Solution** : Ajout de logs détaillés avec `.then()` et messages d'erreur explicites
  - **Outil** : Nouveau script `diagnose-georeferenced-status.js` pour identifier et corriger
  - **Impact** : Les erreurs de mise à jour de statut sont maintenant visibles et corrigeables

### 🛡️ Prévention (Protection)

- **Validation stricte des statuts** dans `ptm-auth.js` :
  - Vérifie que le statut est défini et non vide
  - Vérifie que le statut est une chaîne de caractères
  - Vérifie que le statut fait partie des valeurs autorisées : `'en-cours'`, `'georeferenced'`, `'deposee'`
  - Lance une erreur explicite si le statut est invalide
  - **Résultat** : Impossible de créer de nouveaux statuts vides

### 🔧 Outils de correction (Migration Tools)

- **Nouveau script** : `js/fix-empty-status.js`
  - `diagnose()` : Identifie les cartes avec statut vide (sans modification)
  - `checkAndFix()` : Correction automatique intelligente basée sur la présence sur le serveur de tuiles
  - `quickFix()` : Correction rapide vers un statut par défaut

- **Nouveau script** : `js/diagnose-georeferenced-status.js`
  - `checkMapStatus(arkId)` : Diagnostic complet du statut d'une carte spécifique
  - `fixMapStatus(arkId)` : Correction du statut d'une carte
  - `analyzeAllMaps()` : Analyse globale de toutes les cartes pour détecter les incohérences
  - `fixAllStatusIssues()` : Correction automatique de toutes les cartes avec statut incorrect
  
- **Commandes console** :
  ```javascript
  // Statuts vides
  await window.diagnoseEmptyStatus()    // Diagnostic
  await window.fixAllEmptyStatus()      // Correction automatique
  
  // Statuts non mis à jour après géoréférencement
  await window.checkMapStatus('ark')    // Vérifier une carte
  await window.fixMapStatus('ark')      // Corriger une carte
  await window.analyzeAllMaps()         // Analyser toutes les cartes
  ```

### 🧪 Tests (Testing)

- **Nouveau script** : `js/test-status-validation.js`
  - Teste l'acceptation des statuts valides
  - Teste le rejet des statuts invalides (vides, incorrects, mauvais type)
  - Teste l'ordre correct des paramètres
  - **Commande** : `await window.testStatus()`

- **Nouveau script** : `js/test-nakala-deposit-status.js`
  - Teste la sauvegarde du statut 'deposee' avec DOI
  - Teste la persistance du DOI lors de mises à jour ultérieures
  - Teste l'affichage des cartes déposées dans la galerie
  - **Commande** : `await window.testNakalaDeposit()`

### 📝 Documentation

- **Nouveau document** : `doc/FIX_EMPTY_STATUS.md`
  - Explication détaillée du problème et de sa cause
  - Guide d'utilisation du script de correction
  - Exemples de sortie console
  - Instructions de vérification post-correction

### 📦 Fichiers modifiés

1. `js/worked-maps-manager.js` - Correction ordre des paramètres
2. `js/ptm-auth.js` - Validation stricte des statuts + sauvegarde du DOI
3. `js/front_interactions.js` - Amélioration logs mise à jour statut après géoréférencement
4. `js/fix-empty-status.js` - Script de migration (nouveau)
5. `js/fix-empty-status-guide.js` - Guide rapide (nouveau)
6. `js/diagnose-georeferenced-status.js` - Diagnostic statuts géoréférencés (nouveau)
7. `js/test-status-validation.js` - Tests de validation (nouveau)
8. `js/test-nakala-deposit-status.js` - Tests dépôt Nakala (nouveau)
9. `index.html` - Chargement des nouveaux scripts
10. `doc/FIX_EMPTY_STATUS.md` - Documentation complète (nouveau)
11. `doc/NAKALA_DEPOSIT_STATUS.md` - Documentation dépôt Nakala (nouveau)
12. `doc/FIX_GEOREFERENCED_STATUS_UPDATE.md` - Documentation statut géoréf (nouveau)

### ⚠️ Action requise

Les utilisateurs ayant des cartes avec des problèmes de statut doivent exécuter les scripts de correction :

**1. Pour les statuts vides `{}`:**
```javascript
await window.fixAllEmptyStatus()
```

**2. Pour les cartes géoréférencées avec statut "en-cours":**
```javascript
await window.analyzeAllMaps()  // Analyse d'abord
// Puis suivre les recommandations affichées
```

**3. Vérification globale recommandée:**
```javascript
// Vérifier les statuts vides
await window.diagnoseEmptyStatus()

// Vérifier les incohérences de géoréférencement
await window.analyzeAllMaps()
```

---

## [2025-10-04] - Menu utilisateur déroulant dans la galerie (v2)

### ✨ Nouvelles fonctionnalités (Added)

- **Menu utilisateur déroulant dans la galerie** : Reproduction exacte du comportement de l'application principale
  - Bouton utilisateur cliquable affichant le nom complet (couleur #00ac8c)
  - Menu déroulant au clic avec informations complètes :
    - Nom, Prénom, ORCID, Email, Institution
  - Bouton "Paramètres" ouvrant l'application principale dans un nouvel onglet
  - Bouton "Se déconnecter" avec rechargement automatique de la page
  - Fermeture automatique du menu lors d'un clic en dehors

### 🔧 Fonctions JavaScript ajoutées

- `toggleUserMenu()` : Bascule l'affichage du menu déroulant
- `loadUserProfile()` : Charge le profil utilisateur complet depuis l'API
- `logout()` : Gère la déconnexion et le rechargement de la page
- Event listener pour fermer le menu au clic en dehors

### 🎨 Styles CSS ajoutés

- Styles complets pour `.user-menu-toggle` et `.user-dropdown-menu`
- Effets hover et états actifs
- Responsive design pour mobile (< 768px)
- Z-index élevés pour rester au-dessus des autres éléments

### 📝 Documentation

- Mise à jour de `doc/GALERIE_USER_MENU.md` avec architecture complète du menu déroulant
- Documentation des flux d'utilisation et des tests recommandés

---

## [2025-10-04] - Correction authentification galerie

### 🐛 Corrections (Bugfixes)

- **Authentification galerie**: Correction de l'erreur `window.ptmAuth.checkAuthStatus is not a function`
  - Ajout de la méthode `setToken()` dans `ptm-auth.js`
  - Ajout de la méthode `checkAuthStatus()` asynchrone dans `ptm-auth.js`
  - Correction de `checkAuthenticationStatus()` dans `galerie/index.html`
  - Support du paramètre `access_token` dans l'URL en plus de `token`

### 📝 Documentation

- Ajout de `doc/FIX_GALERIE_AUTH.md` : documentation complète de la correction
- Ajout de `tests/test-galerie-auth.html` : page de test du système d'authentification

### ✨ Améliorations

- Meilleure gestion du retour d'authentification ORCID
- Affichage cohérent du statut d'authentification dans la galerie

### 🔧 Fichiers modifiés

- `js/ptm-auth.js` : Ajout de `setToken()` et `checkAuthStatus()`
- `galerie/index.html` : Système de menu déroulant et fonctions d'authentification

---

## Format du Changelog

Ce fichier suit le format [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

### Types de changements

- **Added** (Ajouté) : nouvelles fonctionnalités
- **Changed** (Modifié) : modifications de fonctionnalités existantes
- **Deprecated** (Obsolète) : fonctionnalités bientôt supprimées
- **Removed** (Supprimé) : fonctionnalités supprimées
- **Fixed** (Corrigé) : corrections de bugs
- **Security** (Sécurité) : corrections de vulnérabilités
