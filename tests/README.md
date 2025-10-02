# Tests de Non-Régression Galligeo

# Tests Galligeo

Ce dossier contient tous les tests pour le projet Galligeo, organisés par catégorie.

## 📁 Structure des tests

### `/html/` - Tests d'interface
- `test-incremental-writes.html` - Tests du système d'écriture incrémentale optimisé ⭐
- `validation-jwt-production.html` - Validation JWT en production
- `test-jwt-anonyme.html` - Tests d'authentification JWT anonyme
- `test-api-*.html` - Tests des API
- `test-cartes-georeferencees.html` - Tests des cartes géoréférencées
- `test-georef-anonyme.html` - Tests de géoréférencement anonyme
- `test-migration.html` - Tests de migration
- `test-points-sans-carte.html` - Tests des points de contrôle sans carte
- `test-structure-galligeo.html` - Tests de structure
- Autres fichiers de test HTML legacy

### `/js/` - Scripts de test JavaScript
- `test-runner.js` - Lanceur de tests principal
- `ptm-auth-test.js` - Tests d'authentification PTM
- `anonymous-georef-test.js` - Tests de géoréférencement anonyme
- `test-worked-maps.js` - Tests des cartes travaillées
- `test-deposit-button.js` - Tests du bouton de dépôt
- `debug-*.js` - Scripts de debug
- `init-test.js` - Tests d'initialisation
- `nakala_test_deposit.js` - Tests de dépôt Nakala

### `/mock/` - Serveurs mock et données de test
- `mock-api-server.js` - Serveur mock API simple
- `mock-api-server-complet.js` - Serveur mock API complet

### `/integration/` - Tests d'intégration
- Tests end-to-end complexes

### `/e2e/` - Tests end-to-end
- Tests de bout en bout automatisés

### `/backend/` - Tests backend
- Tests spécifiques au backend

### `/frontend/` - Tests frontend
- Tests spécifiques au frontend

### `/config/` - Configuration des tests
- Fichiers de configuration pour les tests

### `/reports/` - Rapports de tests
- Rapports générés automatiquement

## 🚀 Démarrage rapide

### Test principal (système optimisé)
```bash
# Ouvrir dans le navigateur
https://app.ptm.huma-num.fr/galligeo/tests/html/test-incremental-writes.html
```

### Lancer tous les tests
```bash
cd tests
./run-tests.sh
```

## ⭐ Tests prioritaires

1. **`html/test-incremental-writes.html`** - Système d'écriture incrémentale optimisé
2. **`html/validation-jwt-production.html`** - Validation JWT production
3. **`html/test-jwt-anonyme.html`** - Authentification anonyme

## 📝 Notes

- Les fichiers de test ont été nettoyés et organisés le 2 octobre 2025
- L'ancien système de tests dispersés a été centralisé
- Tous les fichiers mock et debug ont été déplacés dans cette structure

## 📁 Structure

```
tests/
├── config/
│   ├── test-config.js          # Configuration centralisée des tests
│   └── test-utils.js            # Utilitaires et fonctions helper
├── backend/
│   ├── galligeo-api-tests.js    # Tests API Galligeo
│   ├── ptm-auth-api-tests.js    # Tests API PTM Auth
│   └── tile-server-tests.js     # Tests serveur de tuiles
├── frontend/
│   ├── georeferencing-interface-tests.js  # Tests interface géoréférencement
│   ├── authentication-tests.js           # Tests authentification
│   └── settings-manager-tests.js         # Tests gestionnaire paramètres
├── integration/
│   └── integration-tests.js     # Tests d'intégration complets
├── e2e/
│   └── e2e-tests.js            # Tests End-to-End (scénarios utilisateur)
├── reports/                    # Rapports de tests générés
├── index.html                  # Interface web des tests
├── test-runner.js              # Orchestrateur principal
├── run-tests.sh               # Script bash pour CI/CD
└── README.md                  # Cette documentation
```

## 🚀 Utilisation

### Interface Web

1. Ouvrir `tests/index.html` dans un navigateur
2. Cliquer sur "🚀 Lancer Tous les Tests"
3. Consulter les résultats en temps réel

### Ligne de Commande (CI/CD)

```bash
# Tous les tests
./tests/run-tests.sh

# Tests spécifiques
./tests/run-tests.sh backend
./tests/run-tests.sh frontend

# Aide
./tests/run-tests.sh help
```

### Intégration JavaScript

```javascript
// Charger et exécuter tous les tests
const testRunner = new GalligeoTestRunner();
const results = await testRunner.runAllRegressionTests();

// Tests par catégorie
const backendResults = await testRunner.runSpecificCategory('backend');
const frontendResults = await testRunner.runSpecificCategory('frontend');
```

## 🧪 Types de Tests

### 1. Tests Backend/API (📡)

**Objectif :** Valider les APIs et services backend

**Tests inclus :**
- API Galligeo (géoréférencement, métadonnées)
- API PTM Auth (authentification ORCID)
- Serveur de tuiles
- Endpoints de sauvegarde et récupération

**Exemple :**
```javascript
const galligeoTests = new GalligeoAPITests();
const results = await galligeoTests.runAllTests();
```

### 2. Tests Frontend (🎨)

**Objectif :** Valider l'interface utilisateur et les interactions

**Tests inclus :**
- Interface de géoréférencement
- Système d'authentification
- Gestionnaire de paramètres
- Fonctionnalités des cartes

**Exemple :**
```javascript
const georefTests = new GeoreferencingInterfaceTests();
const results = await georefTests.runAllTests();
```

### 3. Tests d'Intégration (🔗)

**Objectif :** Valider les workflows complets

**Tests inclus :**
- Workflow de géoréférencement complet
- Intégration authentification
- Persistance des données
- Coordination entre APIs

**Exemple :**
```javascript
const integrationTests = new IntegrationTests();
const results = await integrationTests.runAllTests();
```

### 4. Tests End-to-End (🎭)

**Objectif :** Simuler les scénarios utilisateur réels

**Tests inclus :**
- Nouvel utilisateur
- Utilisateur expérimenté
- Récupération d'erreurs
- Interface responsive

**Exemple :**
```javascript
const e2eTests = new E2ETests();
const results = await e2eTests.runAllTests();
```

## ⚙️ Configuration

### Variables d'Environnement

```javascript
// Dans test-config.js
const GALLIGEO_TEST_CONFIG = {
    ENVIRONMENT: 'production', // ou 'staging', 'development'
    API_URLS: {
        GALLIGEO: 'https://api.ptm.huma-num.fr/galligeo',
        PTM_AUTH: 'https://auth.ptm.huma-num.fr',
        TILE_SERVER: 'https://tile.ptm.huma-num.fr'
    },
    TIMEOUTS: {
        SHORT: 5000,
        MEDIUM: 15000,
        LONG: 30000
    },
    RUN_E2E_TESTS: true
};
```

### Données de Test

```javascript
// ARKs valides pour les tests
const validArks = [
    'ark:/12148/btv1b53102415v',
    'ark:/12148/btv1b8446697c',
    'ark:/12148/btv1b10722234c'
];

// Points de contrôle de test
const controlPoints = [
    {
        id: 'test_point_1',
        left: { lat: 48.8566, lng: 2.3522 },
        right: { lat: 48.8566, lng: 2.3522 }
    }
];
```

## 📊 Rapports

### Rapport HTML

- Interface web interactive
- Statistiques détaillées
- Téléchargement automatique
- Historique des exécutions

### Rapport JSON

```json
{
  "summary": {
    "total": 45,
    "passed": 42,
    "failed": 3,
    "successRate": "93.33%",
    "duration": 12500
  },
  "details": {
    "backend": { "passed": 8, "failed": 0, "total": 8 },
    "frontend": { "passed": 15, "failed": 2, "total": 17 },
    "integration": { "passed": 12, "failed": 1, "total": 13 },
    "e2e": { "passed": 7, "failed": 0, "total": 7 }
  }
}
```

## 🔧 Développement

### Ajouter de Nouveaux Tests

1. **Test Backend :**
```javascript
// Dans backend/mon-nouveau-test.js
class MonNouveauTest {
    async testMonAPI() {
        const response = await fetch('/api/mon-endpoint');
        TestAssert.assertEqual(response.status, 200);
    }
}
```

2. **Test Frontend :**
```javascript
// Dans frontend/mon-test-ui.js
class MonTestUI {
    async testBouton() {
        const bouton = TestAssert.assertElementExists('#mon-bouton');
        bouton.click();
        await TestUtils.waitForCondition(() => bouton.disabled);
    }
}
```

3. **Intégrer dans le Runner :**
```javascript
// Dans test-runner.js
async runBackendTests() {
    // Ajouter le nouveau test
    if (typeof window.MonNouveauTest !== 'undefined') {
        const test = new window.MonNouveauTest();
        results.monTest = await test.runAllTests();
    }
}
```

### Debugging

```javascript
// Activer les logs détaillés
TestUtils.setLogLevel('debug');

// Mock pour les tests
TestUtils.mockAuthentication();
TestUtils.mockAPIResponse('/api/test', { success: true });

// Assertions personnalisées
TestAssert.assertElementVisible('#element');
TestAssert.assertAPIResponse(response, expectedData);
```

## 🚨 CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/tests.yml
name: Tests de Non-Régression
on: [push, pull_request]
jobs:
  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Tests
        run: ./tests/run-tests.sh
      - name: Upload Reports
        uses: actions/upload-artifact@v2
        with:
          name: test-reports
          path: tests/reports/
```

### GitLab CI

```yaml
# .gitlab-ci.yml
test:
  stage: test
  script:
    - ./tests/run-tests.sh
  artifacts:
    reports:
      junit: tests/reports/*.xml
    paths:
      - tests/reports/
```

## 📋 Checklist Déploiement

Avant chaque déploiement, vérifier :

- [ ] ✅ Tous les tests backend passent (100%)
- [ ] ✅ Tests frontend critiques passent (>95%)
- [ ] ✅ Tests d'intégration principaux passent (>90%)
- [ ] ✅ Pas de régression détectée
- [ ] ✅ APIs externes accessibles
- [ ] ✅ Authentification fonctionnelle
- [ ] ✅ Interface responsive

## 🆘 Dépannage

### Tests qui Échouent

1. **Erreurs de réseau :**
   - Vérifier la connectivité
   - Valider les URLs d'API
   - Contrôler les timeouts

2. **Erreurs d'authentification :**
   - Vérifier les tokens
   - Contrôler les permissions
   - Valider les cookies

3. **Erreurs d'interface :**
   - Vérifier les sélecteurs CSS
   - Contrôler le timing
   - Valider le DOM

### Performance

```javascript
// Optimiser les tests lents
TestUtils.setParallelExecution(true);
TestUtils.setTimeout('SHORT', 2000);

// Ignorer les tests non critiques
if (ENVIRONMENT === 'production') {
    TestConfig.RUN_E2E_TESTS = false;
}
```

## 📚 Références

- [API Galligeo](../doc/API_INTEGRATION.md)
- [Authentification PTM](../doc/AUTHENTICATION.md)
- [Guide de Sauvegarde](../doc/GUIDE_SAUVEGARDE.md)
- [Système de Versions](../doc/VERSION_SYSTEM.md)

## 🤝 Contribution

1. Créer une branche pour vos tests
2. Ajouter les tests suivant les conventions
3. Vérifier que tous les tests passent
4. Créer une pull request

---

**Dernière mise à jour :** ${new Date().toLocaleDateString('fr-FR')}  
**Version :** 1.0.0  
**Mainteneur :** Équipe Galligeo PTM
