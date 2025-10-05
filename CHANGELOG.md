# Changelog Galligeo

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
