# Système de Versioning Automatique - Galligeo

## Vue d'ensemble

Galligeo implémente un système de versioning automatique basé sur Git qui génère automatiquement les numéros de version en fonction des commits et de l'historique du dépôt.

## Fonctionnalités

### 1. Génération Automatique de Version
- **Version sémantique** : Basée sur `package.json` (ex: v1.0.0)
- **Numéro de build** : Basé sur le nombre total de commits
- **Hash de commit** : Identifiant unique du commit actuel
- **Informations de build** : Date, environnement, contributeurs

### 2. Affichage dans l'Interface
- **Footer discret** : Version courte affichée dans le footer
- **Détails interactifs** : Clic pour afficher plus d'informations
- **Console développeur** : Double-clic pour afficher tous les détails

### 3. Automatisation Git
- **Hook post-commit** : Génère automatiquement la version après chaque commit
- **Hook pre-push** : Vérifie et met à jour la version avant chaque push

## Structure des Fichiers

```
├── scripts/
│   └── build-version.js     # Script principal de génération
├── js/
│   └── version.js           # Version générée pour le front-end
├── version.json             # Informations complètes de version
├── .git/hooks/
│   ├── post-commit          # Hook automatique après commit
│   └── pre-push             # Hook automatique avant push
└── package.json             # Configuration de base
```

## Utilisation

### Génération Manuelle
```bash
# Générer les fichiers de version
npm run build-version

# Ou directement
node scripts/build-version.js
```

### Informations de Version Disponibles

#### Dans le code JavaScript :
```javascript
// Obtenir toutes les informations de version
const version = window.getAppVersion();

// Afficher dans la console
window.showVersionInfo();

// Accès direct aux données
console.log(window.APP_VERSION.displayVersion);
console.log(window.APP_VERSION.git.hash);
console.log(window.APP_VERSION.buildNumber);
```

#### Structure de `window.APP_VERSION` :
```javascript
{
  "version": "1.0.0",                    // Version sémantique
  "fullVersion": "1.0.0.44",            // Version avec build
  "displayVersion": "v1.0.0 (build 44)", // Version d'affichage
  "shortDisplayVersion": "v1.0.0",       // Version courte
  "detailedVersion": "1.0.0.44+38742cb", // Version détaillée
  "buildNumber": 44,                     // Numéro de build
  "git": {
    "hash": "38742cb",                   // Hash court du commit
    "hashFull": "38742cb99e1...",        // Hash complet du commit
    "branch": "main",                    // Branche actuelle
    "commitCount": 44,                   // Nombre total de commits
    "lastCommitDate": "2025-09-05T06:54:22.000Z", // Date du dernier commit
    "lastCommitMessage": "change footer", // Message du dernier commit
    "isDirty": false,                    // Modifications non commitées
    "contributors": ["Eric Mermet", "Eric"] // Contributeurs récents
  },
  "build": {
    "timestamp": "2025-09-05T07:01:42.561Z", // Date de génération
    "environment": "development",             // Environnement
    "buildId": "38742cb-1757055702561"       // ID unique de build
  },
  "project": {
    "name": "galligeo-front",
    "description": "Interface de géoréférencement...",
    "author": "Paris Time Machine"
  }
}
```

## Intégration dans l'Interface

### Footer
La version est affichée discrètement dans le footer :
- **Affichage normal** : `v1.0.0`
- **Au clic** : `v1.0.0 (build 44) • Build 44 • 38742cb • 05/09/2025`
- **Double-clic** : Affichage complet dans la console

### Styles CSS
```css
.version-info {
    font-family: 'Courier New', monospace;
    opacity: 0.7;
    font-size: 0.85em;
    color: #666;
}

.version-info:hover {
    opacity: 1;
    color: #000091;
}
```

## Configuration

### Modification de la Version de Base
Modifier la propriété `version` dans `package.json` :
```json
{
  "version": "1.2.0"
}
```

### Personnalisation du Script
Le script `scripts/build-version.js` peut être modifié pour :
- Changer le format de version
- Ajouter d'autres métadonnées
- Modifier les informations affichées

### Variables d'Environnement
- `NODE_ENV` : Définit l'environnement de build (development, production)

## Workflow de Développement

### 1. Développement Local
```bash
# Travailler normalement
git add .
git commit -m "Nouvelle fonctionnalité"
# → Le hook post-commit génère automatiquement la version
```

### 2. Déploiement
```bash
git push origin main
# → Le hook pre-push met à jour la version avant l'envoi
```

### 3. Vérification
- Vérifier dans le footer de l'application
- Double-cliquer sur la version pour voir les détails
- Consulter `version.json` pour les informations complètes

## Dépannage

### Le script ne fonctionne pas
1. Vérifier que Node.js est installé : `node --version`
2. Vérifier les permissions des hooks : `ls -la .git/hooks/`
3. Exécuter manuellement : `node scripts/build-version.js`

### Version non mise à jour
1. Vérifier que les hooks sont exécutables
2. Régénérer manuellement : `npm run build-version`
3. Vérifier les erreurs dans la console navigateur

### Informations Git manquantes
1. Vérifier que vous êtes dans un dépôt Git
2. Vérifier les permissions du dossier `.git`
3. Le script fonctionne même sans Git (mode dégradé)

## Avantages

1. **Traçabilité** : Chaque version est liée à un commit spécifique
2. **Automatisation** : Pas d'intervention manuelle nécessaire
3. **Transparence** : Informations complètes disponibles pour les développeurs
4. **Discrétion** : Affichage non intrusif pour les utilisateurs finaux
5. **Robustesse** : Fonctionne même en cas d'erreur Git

## Évolutions Futures

- Intégration avec les tags Git pour les versions majeures
- Génération automatique de changelog
- Notifications de nouvelle version
- Intégration avec les systèmes de CI/CD
