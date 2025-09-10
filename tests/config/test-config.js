/**
 * Configuration des tests Galligeo
 * Centralise les URLs, données de test et paramètres
 */

// Configuration des environnements
const ENVIRONMENTS = {
    production: {
        baseUrl: 'https://app.ptm.huma-num.fr/galligeo',
        apiUrl: 'https://api.ptm.huma-num.fr',
        tileServerUrl: 'https://tile.ptm.huma-num.fr',
        nakalaApiUrl: 'https://api.nakala.fr'
    },
    staging: {
        baseUrl: 'https://staging.ptm.huma-num.fr/galligeo',
        apiUrl: 'https://api-staging.ptm.huma-num.fr',
        tileServerUrl: 'https://tile-staging.ptm.huma-num.fr',
        nakalaApiUrl: 'https://apitest.nakala.fr'
    },
    development: {
        baseUrl: 'http://localhost:8000',
        apiUrl: 'http://localhost:8001',
        tileServerUrl: 'http://localhost:8002',
        nakalaApiUrl: 'https://apitest.nakala.fr'
    }
};

// Environnement actuel (peut être surchargé par variable d'environnement)
const CURRENT_ENV = process.env.GALLIGEO_TEST_ENV || 'production';
const CONFIG = ENVIRONMENTS[CURRENT_ENV];

// Données de test standardisées
const TEST_DATA = {
    // ARKs de test connus et géoréférencés
    validArks: [
        'btv1b53121232b', // Paris 1944
        'btv1b532480876', // Carte des fils télégraphiques
        'btv1b8441346h'   // Amiens 1848
    ],
    
    // ARK invalide pour les tests d'erreur
    invalidArks: [
        'invalid_ark_123',
        'btv1b999999999'
    ],
    
    // Points de contrôle de test
    testControlPoints: [
        {
            id: 1,
            leftPoint: { lat: 48.8566, lng: 2.3522 },
            rightPoint: { lat: 48.8566, lng: 2.3522 }
        },
        {
            id: 2,
            leftPoint: { lat: 48.8606, lng: 2.3376 },
            rightPoint: { lat: 48.8606, lng: 2.3376 }
        },
        {
            id: 3,
            leftPoint: { lat: 48.8529, lng: 2.3500 },
            rightPoint: { lat: 48.8529, lng: 2.3500 }
        }
    ],
    
    // Polygone d'emprise de test
    testPolygon: [
        { lat: 48.8500, lng: 2.3400 },
        { lat: 48.8600, lng: 2.3400 },
        { lat: 48.8600, lng: 2.3600 },
        { lat: 48.8500, lng: 2.3600 }
    ],
    
    // Utilisateur de test (anonymisé)
    testUser: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        institution: 'Test Institution',
        orcid: '0000-0000-0000-0000'
    },
    
    // Clés API de test
    testApiKeys: {
        nakala: process.env.NAKALA_TEST_API_KEY || '01234567-89ab-cdef-0123-456789abcdef',
        collection: process.env.NAKALA_TEST_COLLECTION || '10.34847/nkl.f8eev8l7'
    }
};

// Paramètres de géoréférencement
const GEOREF_PARAMS = {
    algorithms: ['polynomial', 'helmert', 'affine', 'tps'],
    resampleMethods: ['nearest', 'bilinear', 'cubic', 'lanczos'],
    imageQualities: ['medium', 'hd'],
    compressionOptions: [true, false],
    transparencyOptions: [true, false]
};

// Timeouts pour les tests
const TIMEOUTS = {
    short: 5000,      // 5 secondes
    medium: 30000,    // 30 secondes
    long: 300000,     // 5 minutes (géoréférencement)
    api: 10000,       // 10 secondes pour les API
    ui: 3000          // 3 secondes pour les interactions UI
};

// Sélecteurs CSS pour les éléments de l'interface
const SELECTORS = {
    // Interface de géoréférencement
    arkInput: '#search-784-input',
    loadButton: 'button[title="Ark : -> Gallica"]',
    georefButton: '#btn_georef',
    displayButton: '#btn_display',
    depositButton: '#btn_deposit',
    
    // Système de saisie
    inputModeToggle: '#toggle',
    pointsMode: '#segmented-1',
    empriseMode: '#segmented-2',
    
    // Cartes
    leftMap: '#map-left',
    rightMap: '#map-right',
    
    // Authentification
    loginButton: 'button[onclick*="auth/login"]',
    settingsModal: '#fr-modal-settings',
    userFirstName: '#user-first-name',
    userLastName: '#user-last-name',
    userEmail: '#user-email',
    userInstitution: '#user-institution',
    
    // Navigation et contrôles
    sidebar: '#sidebar',
    controlPointsTable: '#table_body',
    backupButton: '#btn_save_backup',
    restoreButton: '#btn_restore_backup'
};

// Messages d'erreur attendus
const ERROR_MESSAGES = {
    invalidArk: 'Cette référence ARK',
    notGeoreferenced: 'n\'est pas encore géoréférencée',
    authenticationRequired: 'Vous devez être connecté',
    missingControlPoints: 'Aucun point de contrôle',
    serverError: 'Erreur serveur',
    networkError: 'Erreur réseau'
};

// Configuration des tests de performance
const PERFORMANCE_THRESHOLDS = {
    pageLoad: 3000,           // 3s pour le chargement de page
    arkLoad: 5000,            // 5s pour charger un ARK
    georeferencingTime: 300000, // 5min max pour géoréférencement
    apiResponse: 2000,        // 2s pour les réponses API
    tileLoad: 1000           // 1s pour charger les tuiles
};

// Export de la configuration
window.GALLIGEO_TEST_CONFIG = {
    ENVIRONMENTS,
    CURRENT_ENV,
    CONFIG,
    TEST_DATA,
    GEOREF_PARAMS,
    TIMEOUTS,
    SELECTORS,
    ERROR_MESSAGES,
    PERFORMANCE_THRESHOLDS
};

// Pour Node.js (si utilisé avec des outils de test)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ENVIRONMENTS,
        CURRENT_ENV,
        CONFIG,
        TEST_DATA,
        GEOREF_PARAMS,
        TIMEOUTS,
        SELECTORS,
        ERROR_MESSAGES,
        PERFORMANCE_THRESHOLDS
    };
}
