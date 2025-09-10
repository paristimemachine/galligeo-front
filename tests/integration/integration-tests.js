/**
 * Tests d'intégration (Integration Tests)
 * Tests de non-régression pour les workflows complets de Galligeo
 */

class IntegrationTests {
    
    constructor() {
        this.config = window.GALLIGEO_TEST_CONFIG || {};
        this.selectors = this.config.SELECTORS || {};
        this.testData = this.config.TEST_DATA || {};
        this.results = [];
    }
    
    /**
     * Exécuter tous les tests d'intégration
     */
    async runAllTests() {
        TestUtils.log('info', 'Début des tests d\'intégration');
        
        const tests = [
            this.testCompleteGeoreferencingWorkflow.bind(this),
            this.testAuthenticationIntegration.bind(this),
            this.testDataPersistenceWorkflow.bind(this),
            this.testAPICoordination.bind(this),
            this.testSettingsWorkflow.bind(this),
            this.testBackupRestoreWorkflow.bind(this),
            this.testErrorHandlingWorkflow.bind(this),
            this.testMultiMapSynchronization.bind(this)
        ];
        
        for (const test of tests) {
            try {
                await test();
            } catch (error) {
                TestUtils.log('error', `Test failed: ${test.name}`, error);
                this.results.push({
                    name: test.name,
                    status: 'failed',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        return TestUtils.generateReport('Integration Tests', this.results);
    }
    
    /**
     * Test du workflow complet de géoréférencement
     */
    async testCompleteGeoreferencingWorkflow() {
        TestUtils.log('info', 'Test du workflow complet de géoréférencement');
        
        // 1. Chargement d'une carte ARK
        const arkInput = TestAssert.assertElementExists(this.selectors.arkInput);
        const loadButton = TestAssert.assertElementExists(this.selectors.loadButton);
        
        // Simuler la saisie d'un ARK valide
        arkInput.value = this.testData.validArks[0];
        arkInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Attendre que le bouton soit activé
        await TestUtils.waitForCondition(
            () => !loadButton.disabled,
            'Le bouton de chargement doit être activé'
        );
        
        // 2. Simuler le chargement de la carte
        TestAssert.assertTrue(
            typeof window.loadImageFromArk === 'function',
            'La fonction loadImageFromArk doit être disponible'
        );
        
        // Mock de la réponse API pour éviter les appels réels
        const originalFetch = window.fetch;
        window.fetch = async (url) => {
            if (url.includes('gallica.bnf.fr')) {
                return {
                    ok: true,
                    json: async () => ({
                        tileUrl: 'https://example.com/tiles/{z}/{x}/{y}.jpg',
                        bounds: [[48.8566, 2.3522], [48.8566, 2.3522]],
                        title: 'Test Map'
                    })
                };
            }
            return originalFetch(url);
        };
        
        try {
            // Simuler le chargement
            if (typeof window.loadImageFromArk === 'function') {
                await window.loadImageFromArk(this.testData.validArks[0]);
            }
            
            // 3. Vérifier l'initialisation des cartes
            await TestUtils.waitForCondition(
                () => window.leftMap && window.rightMap,
                'Les cartes gauche et droite doivent être initialisées'
            );
            
            // 4. Créer des points de contrôle
            const controlPoints = this.testData.controlPoints;
            for (let i = 0; i < Math.min(controlPoints.length, 4); i++) {
                const point = controlPoints[i];
                
                // Simuler l'ajout d'un point de contrôle
                if (typeof window.addControlPoint === 'function') {
                    window.addControlPoint(point.left, point.right, point.id);
                }
            }
            
            // 5. Vérifier que le géoréférencement est possible
            await TestUtils.waitForCondition(
                () => {
                    const georefButton = document.querySelector(this.selectors.georefButton);
                    return georefButton && !georefButton.disabled;
                },
                'Le bouton de géoréférencement doit être activé'
            );
            
            // 6. Simuler le géoréférencement
            if (typeof window.performGeoreferencing === 'function') {
                const result = await window.performGeoreferencing();
                TestAssert.assertTrue(
                    result && result.success,
                    'Le géoréférencement doit réussir'
                );
            }
            
            // 7. Vérifier la génération de tuiles
            if (typeof window.generateTiles === 'function') {
                const tilesResult = await window.generateTiles();
                TestAssert.assertTrue(
                    tilesResult && tilesResult.tileUrl,
                    'La génération de tuiles doit réussir'
                );
            }
            
        } finally {
            // Restaurer fetch
            window.fetch = originalFetch;
        }
        
        this.results.push({
            name: 'testCompleteGeoreferencingWorkflow',
            status: 'passed',
            ark: this.testData.validArks[0],
            pointsAdded: Math.min(this.testData.controlPoints.length, 4),
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test de l'intégration de l'authentification
     */
    async testAuthenticationIntegration() {
        TestUtils.log('info', 'Test de l\'intégration de l\'authentification');
        
        // 1. État initial non authentifié
        let wasAuthenticated = false;
        if (window.ptmAuth) {
            wasAuthenticated = window.ptmAuth.isAuthenticated();
            if (wasAuthenticated) {
                // Simuler une déconnexion temporaire
                window.ptmAuth.token = null;
                window.ptmAuth.userInfo = null;
            }
        }
        
        // 2. Vérifier les éléments conditionnels
        const authRequiredElements = document.querySelectorAll('[data-auth-required]');
        for (const element of authRequiredElements) {
            TestAssert.assertTrue(
                element.style.display === 'none' || element.disabled,
                'Les éléments nécessitant l\'authentification doivent être cachés/désactivés'
            );
        }
        
        // 3. Simuler une authentification
        if (window.ptmAuth) {
            window.ptmAuth.token = 'test_token_integration';
            window.ptmAuth.userInfo = {
                name: 'Test User Integration',
                email: 'test@integration.com',
                institution: 'Test Institution'
            };
            
            // 4. Déclencher la mise à jour de l'interface
            if (typeof window.updateAuthenticationUI === 'function') {
                window.updateAuthenticationUI();
            }
            
            // 5. Vérifier que les éléments sont maintenant disponibles
            for (const element of authRequiredElements) {
                TestAssert.assertFalse(
                    element.style.display === 'none' && element.disabled,
                    'Les éléments nécessitant l\'authentification doivent être visibles/activés'
                );
            }
            
            // 6. Test de sauvegarde des données utilisateur
            if (typeof window.saveUserData === 'function') {
                const testData = {
                    settings: { algorithm: 'polynomial' },
                    workedMaps: ['test_ark']
                };
                
                try {
                    await window.saveUserData(testData);
                    TestUtils.log('info', 'Sauvegarde des données utilisateur réussie');
                } catch (error) {
                    TestUtils.log('warning', 'Sauvegarde des données utilisateur échouée: ' + error.message);
                }
            }
            
            // 7. Restaurer l'état original
            if (!wasAuthenticated) {
                window.ptmAuth.token = null;
                window.ptmAuth.userInfo = null;
            }
        }
        
        this.results.push({
            name: 'testAuthenticationIntegration',
            status: 'passed',
            originallyAuthenticated: wasAuthenticated,
            authRequiredElements: authRequiredElements.length,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test du workflow de persistance des données
     */
    async testDataPersistenceWorkflow() {
        TestUtils.log('info', 'Test du workflow de persistance des données');
        
        // 1. Créer un état complet de l'application
        const completeState = {
            ark: this.testData.validArks[0],
            settings: {
                algorithm: 'helmert',
                quality: 'hd',
                compression: true
            },
            controlPoints: this.testData.controlPoints.slice(0, 3),
            emprise: this.testData.emprise,
            metadata: {
                title: 'Test Integration Map',
                date: new Date().toISOString(),
                author: 'Integration Test'
            }
        };
        
        // 2. Sauvegarde locale
        const localBackupKey = 'galligeo_integration_backup';
        localStorage.setItem(localBackupKey, JSON.stringify(completeState));
        
        // Vérifier la sauvegarde locale
        const localBackup = JSON.parse(localStorage.getItem(localBackupKey) || '{}');
        TestAssert.assertEqual(
            localBackup.ark,
            completeState.ark,
            'La sauvegarde locale doit préserver l\'ARK'
        );
        
        // 3. Sauvegarde serveur (si authentifié)
        if (window.ptmAuth && window.ptmAuth.isAuthenticated()) {
            if (typeof window.saveToServer === 'function') {
                try {
                    const serverBackupId = await window.saveToServer(completeState);
                    TestAssert.assertTrue(
                        !!serverBackupId,
                        'La sauvegarde serveur doit retourner un ID'
                    );
                    
                    // 4. Restauration depuis le serveur
                    if (typeof window.loadFromServer === 'function') {
                        const restoredState = await window.loadFromServer(serverBackupId);
                        TestAssert.assertEqual(
                            restoredState.ark,
                            completeState.ark,
                            'La restauration serveur doit préserver les données'
                        );
                    }
                    
                } catch (error) {
                    TestUtils.log('warning', 'Sauvegarde serveur non disponible: ' + error.message);
                }
            }
        }
        
        // 5. Test de synchronisation automatique
        if (typeof window.syncData === 'function') {
            try {
                await window.syncData();
                TestUtils.log('info', 'Synchronisation automatique testée');
            } catch (error) {
                TestUtils.log('warning', 'Synchronisation non disponible: ' + error.message);
            }
        }
        
        // 6. Nettoyage
        localStorage.removeItem(localBackupKey);
        
        this.results.push({
            name: 'testDataPersistenceWorkflow',
            status: 'passed',
            stateSize: JSON.stringify(completeState).length,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test de coordination entre APIs
     */
    async testAPICoordination() {
        TestUtils.log('info', 'Test de coordination entre APIs');
        
        // Mock des APIs pour les tests
        const originalFetch = window.fetch;
        let apiCallCount = 0;
        
        window.fetch = async (url) => {
            apiCallCount++;
            
            if (url.includes('api.ptm.huma-num.fr/galligeo')) {
                return {
                    ok: true,
                    json: async () => ({
                        success: true,
                        tileUrl: 'https://example.com/tiles/{z}/{x}/{y}.jpg',
                        metadata: { algorithm: 'polynomial' }
                    })
                };
            }
            
            if (url.includes('gallica.bnf.fr')) {
                return {
                    ok: true,
                    json: async () => ({
                        manifest: 'https://example.com/manifest.json',
                        title: 'Test Map'
                    })
                };
            }
            
            if (url.includes('nakala.fr')) {
                return {
                    ok: true,
                    json: async () => ({
                        depositId: 'test_deposit_123',
                        status: 'success'
                    })
                };
            }
            
            return originalFetch(url);
        };
        
        try {
            // 1. Test de séquence d'APIs coordonnées
            const testArk = this.testData.validArks[0];
            
            // Gallica API pour les métadonnées
            if (typeof window.getGallicaMetadata === 'function') {
                const gallicaData = await window.getGallicaMetadata(testArk);
                TestAssert.assertTrue(
                    gallicaData && gallicaData.title,
                    'Les métadonnées Gallica doivent être récupérées'
                );
            }
            
            // Galligeo API pour le géoréférencement
            if (typeof window.callGalligeoAPI === 'function') {
                const georefData = await window.callGalligeoAPI({
                    ark: testArk,
                    controlPoints: this.testData.controlPoints.slice(0, 3),
                    algorithm: 'polynomial'
                });
                
                TestAssert.assertTrue(
                    georefData && georefData.tileUrl,
                    'Le géoréférencement doit retourner une URL de tuiles'
                );
            }
            
            // Nakala API pour le dépôt (simulation)
            if (typeof window.depositToNakala === 'function') {
                const depositData = await window.depositToNakala({
                    ark: testArk,
                    georefData: { tileUrl: 'test_url' }
                });
                
                TestAssert.assertTrue(
                    depositData && depositData.depositId,
                    'Le dépôt Nakala doit retourner un ID'
                );
            }
            
            // 2. Vérifier la coordination des appels
            TestAssert.assertTrue(
                apiCallCount >= 3,
                'Au moins 3 appels API doivent être effectués'
            );
            
        } finally {
            // Restaurer fetch
            window.fetch = originalFetch;
        }
        
        this.results.push({
            name: 'testAPICoordination',
            status: 'passed',
            apiCallCount,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test du workflow de gestion des paramètres
     */
    async testSettingsWorkflow() {
        TestUtils.log('info', 'Test du workflow de gestion des paramètres');
        
        // 1. Charger les paramètres par défaut
        if (typeof window.loadDefaultSettings === 'function') {
            const defaultSettings = window.loadDefaultSettings();
            TestAssert.assertTrue(
                defaultSettings && typeof defaultSettings === 'object',
                'Les paramètres par défaut doivent être chargés'
            );
        }
        
        // 2. Modifier les paramètres
        const newSettings = {
            algorithm: 'helmert',
            quality: 'uhd',
            advanced: {
                tolerance: 0.1,
                iterations: 200
            }
        };
        
        if (typeof window.updateSettings === 'function') {
            window.updateSettings(newSettings);
        }
        
        // 3. Vérifier la mise à jour de l'interface
        const algorithmSelect = document.querySelector('[name="algorithm"]');
        if (algorithmSelect) {
            TestAssert.assertEqual(
                algorithmSelect.value,
                newSettings.algorithm,
                'L\'interface doit refléter les nouveaux paramètres'
            );
        }
        
        // 4. Test de validation automatique
        if (typeof window.validateCurrentSettings === 'function') {
            const validation = window.validateCurrentSettings();
            TestAssert.assertTrue(
                validation.valid || validation === true,
                'Les paramètres modifiés doivent être valides'
            );
        }
        
        // 5. Sauvegarde automatique
        if (typeof window.autoSaveSettings === 'function') {
            window.autoSaveSettings();
            
            // Vérifier la sauvegarde
            const savedSettings = localStorage.getItem('galligeo_autosave_settings');
            TestAssert.assertTrue(
                !!savedSettings,
                'Les paramètres doivent être sauvegardés automatiquement'
            );
        }
        
        this.results.push({
            name: 'testSettingsWorkflow',
            status: 'passed',
            settingsUpdated: true,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test du workflow de sauvegarde/restauration
     */
    async testBackupRestoreWorkflow() {
        TestUtils.log('info', 'Test du workflow de sauvegarde/restauration');
        
        // 1. Créer un état de travail
        const workState = {
            ark: this.testData.validArks[0],
            controlPoints: this.testData.controlPoints.slice(0, 2),
            settings: { algorithm: 'polynomial', quality: 'hd' },
            timestamp: new Date().toISOString()
        };
        
        // 2. Créer une sauvegarde
        let backupId = null;
        if (typeof window.createBackup === 'function') {
            backupId = window.createBackup(workState);
            TestAssert.assertTrue(
                !!backupId,
                'La création de sauvegarde doit retourner un ID'
            );
        }
        
        // 3. Modifier l'état
        if (typeof window.clearWorkspace === 'function') {
            window.clearWorkspace();
        }
        
        // 4. Restaurer la sauvegarde
        if (backupId && typeof window.restoreBackup === 'function') {
            const restored = window.restoreBackup(backupId);
            TestAssert.assertEqual(
                restored.ark,
                workState.ark,
                'La restauration doit récupérer l\'état original'
            );
        }
        
        // 5. Test de sauvegarde périodique
        if (typeof window.enablePeriodicBackup === 'function') {
            window.enablePeriodicBackup(5000); // 5 secondes pour le test
            
            // Simuler un changement d'état
            await TestUtils.delay(100);
            
            if (typeof window.disablePeriodicBackup === 'function') {
                window.disablePeriodicBackup();
            }
        }
        
        this.results.push({
            name: 'testBackupRestoreWorkflow',
            status: 'passed',
            backupId,
            restored: !!backupId,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test du workflow de gestion d'erreurs
     */
    async testErrorHandlingWorkflow() {
        TestUtils.log('info', 'Test du workflow de gestion d\'erreurs');
        
        // 1. Test d'ARK invalide
        const invalidArk = 'invalid_ark_123';
        if (typeof window.loadImageFromArk === 'function') {
            try {
                await window.loadImageFromArk(invalidArk);
                TestUtils.log('warning', 'Aucune erreur détectée pour ARK invalide');
            } catch (error) {
                TestAssert.assertTrue(
                    error.message.includes('invalid') || error.message.includes('not found'),
                    'Une erreur appropriée doit être levée pour ARK invalide'
                );
            }
        }
        
        // 2. Test d'erreur réseau (simulation)
        const originalFetch = window.fetch;
        window.fetch = async () => {
            throw new Error('Network error simulation');
        };
        
        try {
            if (typeof window.callGalligeoAPI === 'function') {
                await window.callGalligeoAPI({ test: true });
            }
        } catch (error) {
            TestAssert.assertTrue(
                error.message.includes('Network'),
                'Les erreurs réseau doivent être gérées'
            );
        } finally {
            window.fetch = originalFetch;
        }
        
        // 3. Test de récupération d'erreur
        if (typeof window.handleError === 'function') {
            const testError = new Error('Test error');
            const handled = window.handleError(testError);
            TestAssert.assertTrue(
                handled !== false,
                'Les erreurs doivent être gérées par le système'
            );
        }
        
        this.results.push({
            name: 'testErrorHandlingWorkflow',
            status: 'passed',
            errorsSimulated: 2,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test de synchronisation multi-cartes
     */
    async testMultiMapSynchronization() {
        TestUtils.log('info', 'Test de synchronisation multi-cartes');
        
        // Vérifier que les cartes sont initialisées
        if (!window.leftMap || !window.rightMap) {
            TestUtils.log('warning', 'Cartes non initialisées, test ignoré');
            this.results.push({
                name: 'testMultiMapSynchronization',
                status: 'skipped',
                reason: 'Maps not initialized',
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        // 1. Test de synchronisation de vue
        const testCenter = [48.8566, 2.3522];
        const testZoom = 10;
        
        window.leftMap.setView(testCenter, testZoom);
        
        // Attendre la synchronisation
        await TestUtils.delay(100);
        
        const rightCenter = window.rightMap.getCenter();
        const rightZoom = window.rightMap.getZoom();
        
        TestAssert.assertTrue(
            Math.abs(rightCenter.lat - testCenter[0]) < 0.01,
            'La latitude doit être synchronisée'
        );
        
        TestAssert.assertTrue(
            Math.abs(rightCenter.lng - testCenter[1]) < 0.01,
            'La longitude doit être synchronisée'
        );
        
        TestAssert.assertEqual(
            rightZoom,
            testZoom,
            'Le zoom doit être synchronisé'
        );
        
        // 2. Test de synchronisation des couches
        if (window.leftMap.eachLayer && window.rightMap.eachLayer) {
            let leftLayers = 0;
            let rightLayers = 0;
            
            window.leftMap.eachLayer(() => leftLayers++);
            window.rightMap.eachLayer(() => rightLayers++);
            
            TestUtils.log('info', `Couches synchronisées: gauche=${leftLayers}, droite=${rightLayers}`);
        }
        
        this.results.push({
            name: 'testMultiMapSynchronization',
            status: 'passed',
            centerSynced: true,
            zoomSynced: true,
            timestamp: new Date().toISOString()
        });
    }
}

// Export pour utilisation globale
window.IntegrationTests = IntegrationTests;

// Pour Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntegrationTests;
}
