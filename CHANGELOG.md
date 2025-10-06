# Changelog Galligeo

## [2025-10-06] - Correction des statuts vides dans la base de données

### 🐛 Corrections critiques (Critical Bugfixes)

- **Statuts vides en base de données** : Correction du bug créant des objets `status: {}` au lieu de chaînes
  - **Cause** : Ordre incorrect des paramètres dans `worked-maps-manager.js` ligne 381
  - **Avant** : `updateWorkedMap(arkId, mapData, 'en-cours')` ❌ 
  - **Après** : `updateWorkedMap(arkId, 'en-cours', mapData)` ✅
  - **Impact** : Les cartes ajoutées avaient un statut vide `{}` au lieu de `"en-cours"`

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
  
- **Commandes console** :
  ```javascript
  await window.diagnoseEmptyStatus()    // Diagnostic
  await window.fixAllEmptyStatus()      // Correction automatique
  ```

### 🧪 Tests (Testing)

- **Nouveau script** : `js/test-status-validation.js`
  - Teste l'acceptation des statuts valides
  - Teste le rejet des statuts invalides (vides, incorrects, mauvais type)
  - Teste l'ordre correct des paramètres
  - **Commande** : `await window.testStatus()`

### 📝 Documentation

- **Nouveau document** : `doc/FIX_EMPTY_STATUS.md`
  - Explication détaillée du problème et de sa cause
  - Guide d'utilisation du script de correction
  - Exemples de sortie console
  - Instructions de vérification post-correction

### 📦 Fichiers modifiés

1. `js/worked-maps-manager.js` - Correction ordre des paramètres
2. `js/ptm-auth.js` - Validation stricte des statuts
3. `js/fix-empty-status.js` - Script de migration (nouveau)
4. `js/fix-empty-status-guide.js` - Guide rapide (nouveau)
5. `js/test-status-validation.js` - Tests de validation (nouveau)
6. `index.html` - Chargement du script fix-empty-status.js
7. `doc/FIX_EMPTY_STATUS.md` - Documentation complète (nouveau)

### ⚠️ Action requise

Les utilisateurs ayant des cartes avec statut vide doivent exécuter le script de correction :
1. Se connecter avec ORCID
2. Ouvrir la console (F12)
3. Exécuter : `await window.fixAllEmptyStatus()`

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
