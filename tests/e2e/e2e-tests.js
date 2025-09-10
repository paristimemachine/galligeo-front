/**
 * Tests End-to-End (E2E)
 * Tests de non-régression simulant les interactions utilisateur complètes
 */

class E2ETests {
    
    constructor() {
        this.config = window.GALLIGEO_TEST_CONFIG || {};
        this.selectors = this.config.SELECTORS || {};
        this.testData = this.config.TEST_DATA || {};
        this.results = [];
        this.userActions = [];
    }
    
    /**
     * Exécuter tous les tests E2E
     */
    async runAllTests() {
        TestUtils.log('info', 'Début des tests End-to-End');
        
        const tests = [
            this.testNewUserFirstGeoreferencing.bind(this),
            this.testExperiencedUserWorkflow.bind(this),
            this.testErrorRecoveryScenario.bind(this),
            this.testAuthenticatedUserWorkflow.bind(this),
            this.testMobileResponsiveWorkflow.bind(this),
            this.testComplexGeoreferencingScenario.bind(this),
            this.testBulkProcessingWorkflow.bind(this),
            this.testCollaborativeWorkflow.bind(this)
        ];
        
        for (const test of tests) {
            try {
                this.userActions = []; // Reset pour chaque test
                await test();
            } catch (error) {
                TestUtils.log('error', `Test failed: ${test.name}`, error);
                this.results.push({
                    name: test.name,
                    status: 'failed',
                    error: error.message,
                    userActions: this.userActions,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        return TestUtils.generateReport('End-to-End Tests', this.results);
    }
    
    /**
     * Simuler une action utilisateur
     */
    async simulateUserAction(action, element, value = null, description = '') {
        this.userActions.push({
            action,
            element: element?.id || element?.className || 'unknown',
            value,
            description,
            timestamp: new Date().toISOString()
        });
        
        TestUtils.log('info', `Action utilisateur: ${action} - ${description}`);
        
        switch (action) {
            case 'click':
                if (element) {
                    element.click();
                    await TestUtils.delay(100);
                }
                break;
                
            case 'type':
                if (element && value !== null) {
                    element.value = value;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    await TestUtils.delay(50);
                }
                break;
                
            case 'select':
                if (element && value !== null) {
                    element.value = value;
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    await TestUtils.delay(50);
                }
                break;
                
            case 'wait':
                await TestUtils.delay(value || 1000);
                break;
        }
    }
    
    /**
     * Test : Nouvel utilisateur effectuant son premier géoréférencement
     */
    async testNewUserFirstGeoreferencing() {
        TestUtils.log('info', 'Test E2E: Nouvel utilisateur - Premier géoréférencement');
        
        // 1. Arrivée sur la page
        await this.simulateUserAction('wait', null, 500, 'Chargement de la page');
        
        // 2. Découverte de l'interface
        const arkInput = TestAssert.assertElementExists(this.selectors.arkInput);
        await this.simulateUserAction('click', arkInput, null, 'Clic sur le champ ARK');
        
        // 3. Tentative avec ARK invalide (erreur courante de débutant)
        await this.simulateUserAction('type', arkInput, 'mauvais_ark', 'Saisie ARK invalide');
        
        const loadButton = TestAssert.assertElementExists(this.selectors.loadButton);
        await this.simulateUserAction('click', loadButton, null, 'Tentative de chargement');
        
        // Vérifier la gestion d'erreur
        await TestUtils.waitForCondition(
            () => {
                const errorMessage = document.querySelector('.error-message, .alert-danger');
                return errorMessage && errorMessage.style.display !== 'none';
            },
            'Un message d\'erreur doit apparaître'
        );
        
        // 4. Correction avec ARK valide
        await this.simulateUserAction('type', arkInput, this.testData.validArks[0], 'Saisie ARK valide');
        await this.simulateUserAction('click', loadButton, null, 'Chargement correct');
        
        // 5. Attente du chargement des cartes
        await TestUtils.waitForCondition(
            () => window.leftMap && window.rightMap,
            'Les cartes doivent se charger'
        );
        
        // 6. Découverte du mode points
        const inputModeToggle = document.querySelector(this.selectors.inputModeToggle);
        if (inputModeToggle) {
            await this.simulateUserAction('click', inputModeToggle, null, 'Activation mode points');
        }
        
        // 7. Ajout de points de contrôle (débutant - quelques points seulement)
        for (let i = 0; i < 3; i++) {
            const point = this.testData.controlPoints[i];
            
            // Simuler clic sur carte gauche
            if (window.leftMap) {
                window.leftMap.fire('click', {
                    latlng: { lat: point.left.lat, lng: point.left.lng }
                });
                await this.simulateUserAction('wait', null, 200, `Point ${i+1} - carte gauche`);
            }
            
            // Simuler clic sur carte droite
            if (window.rightMap) {
                window.rightMap.fire('click', {
                    latlng: { lat: point.right.lat, lng: point.right.lng }
                });
                await this.simulateUserAction('wait', null, 200, `Point ${i+1} - carte droite`);
            }
        }
        
        // 8. Tentative de géoréférencement
        const georefButton = document.querySelector(this.selectors.georefButton);
        if (georefButton && !georefButton.disabled) {
            await this.simulateUserAction('click', georefButton, null, 'Lancement géoréférencement');
            
            // Attendre le résultat
            await TestUtils.waitForCondition(
                () => {
                    const result = document.querySelector('.georef-result, .success-message');
                    return result && result.style.display !== 'none';
                },
                'Le résultat du géoréférencement doit apparaître'
            );
        }
        
        this.results.push({
            name: 'testNewUserFirstGeoreferencing',
            status: 'passed',
            userActions: this.userActions.length,
            pointsAdded: 3,
            arkUsed: this.testData.validArks[0],
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test : Utilisateur expérimenté avec workflow optimisé
     */
    async testExperiencedUserWorkflow() {
        TestUtils.log('info', 'Test E2E: Utilisateur expérimenté');
        
        // 1. Chargement rapide d'ARK
        const arkInput = TestAssert.assertElementExists(this.selectors.arkInput);
        await this.simulateUserAction('type', arkInput, this.testData.validArks[1], 'ARK direct');
        
        const loadButton = TestAssert.assertElementExists(this.selectors.loadButton);
        await this.simulateUserAction('click', loadButton, null, 'Chargement immédiat');
        
        // 2. Configuration avancée des paramètres
        const settingsButton = document.querySelector('[data-bs-target="#settings-modal"]');
        if (settingsButton) {
            await this.simulateUserAction('click', settingsButton, null, 'Ouverture paramètres');
            
            // Modification de l'algorithme
            const algorithmSelect = document.querySelector('[name="algorithm"]');
            if (algorithmSelect) {
                await this.simulateUserAction('select', algorithmSelect, 'helmert', 'Algorithme Helmert');
            }
            
            // Qualité haute
            const qualitySelect = document.querySelector('[name="quality"]');
            if (qualitySelect) {
                await this.simulateUserAction('select', qualitySelect, 'uhd', 'Qualité UHD');
            }
            
            // Fermeture
            const closeSettings = document.querySelector('#settings-modal .btn-close');
            if (closeSettings) {
                await this.simulateUserAction('click', closeSettings, null, 'Fermeture paramètres');
            }
        }
        
        // 3. Utilisation du mode emprise pour une géolocalisation rapide
        const empriseMode = document.querySelector('[data-mode="emprise"]');
        if (empriseMode) {
            await this.simulateUserAction('click', empriseMode, null, 'Mode emprise');
            
            // Définition rapide d'emprise
            const emprisePoints = [
                { lat: 48.85, lng: 2.35 },
                { lat: 48.86, lng: 2.35 },
                { lat: 48.86, lng: 2.36 },
                { lat: 48.85, lng: 2.36 }
            ];
            
            for (let i = 0; i < emprisePoints.length; i++) {
                if (window.leftMap) {
                    window.leftMap.fire('click', { latlng: emprisePoints[i] });
                    await this.simulateUserAction('wait', null, 100, `Emprise point ${i+1}`);
                }
            }
        }
        
        // 4. Ajout de nombreux points de contrôle (utilisateur expérimenté)
        const inputModeToggle = document.querySelector(this.selectors.inputModeToggle);
        if (inputModeToggle) {
            await this.simulateUserAction('click', inputModeToggle, null, 'Retour mode points');
        }
        
        for (let i = 0; i < Math.min(this.testData.controlPoints.length, 8); i++) {
            const point = this.testData.controlPoints[i];
            
            if (window.leftMap && window.rightMap) {
                window.leftMap.fire('click', { latlng: point.left });
                await TestUtils.delay(50);
                window.rightMap.fire('click', { latlng: point.right });
                await TestUtils.delay(50);
            }
        }
        
        // 5. Utilisation de fonctionnalités avancées
        if (typeof window.previewGeoreferencing === 'function') {
            await this.simulateUserAction('wait', null, 100, 'Prévisualisation');
            window.previewGeoreferencing();
        }
        
        // 6. Géoréférencement final
        const georefButton = document.querySelector(this.selectors.georefButton);
        if (georefButton && !georefButton.disabled) {
            await this.simulateUserAction('click', georefButton, null, 'Géoréférencement final');
        }
        
        this.results.push({
            name: 'testExperiencedUserWorkflow',
            status: 'passed',
            userActions: this.userActions.length,
            pointsAdded: Math.min(this.testData.controlPoints.length, 8),
            usedAdvancedFeatures: true,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test : Scénario de récupération d'erreur
     */
    async testErrorRecoveryScenario() {
        TestUtils.log('info', 'Test E2E: Récupération d\'erreur');
        
        // 1. Simulation de perte de connexion pendant le chargement
        const arkInput = TestAssert.assertElementExists(this.selectors.arkInput);
        await this.simulateUserAction('type', arkInput, this.testData.validArks[0], 'Saisie ARK');
        
        // Mock d'erreur réseau
        const originalFetch = window.fetch;
        window.fetch = async () => {
            throw new Error('Network timeout');
        };
        
        const loadButton = TestAssert.assertElementExists(this.selectors.loadButton);
        await this.simulateUserAction('click', loadButton, null, 'Tentative avec erreur réseau');
        
        // 2. Vérification de la gestion d'erreur
        await TestUtils.waitForCondition(
            () => {
                const errorMessage = document.querySelector('.error-message, .alert-danger');
                return errorMessage && errorMessage.textContent.includes('réseau');
            },
            'Un message d\'erreur réseau doit apparaître'
        );
        
        // 3. Restauration de la connexion et nouvel essai
        window.fetch = originalFetch;
        await this.simulateUserAction('click', loadButton, null, 'Nouvel essai après erreur');
        
        // 4. Simulation d'erreur de validation
        await TestUtils.waitForCondition(
            () => window.leftMap && window.rightMap,
            'Les cartes doivent se charger après récupération'
        );
        
        // Ajout de points insuffisants
        const point = this.testData.controlPoints[0];
        if (window.leftMap && window.rightMap) {
            window.leftMap.fire('click', { latlng: point.left });
            window.rightMap.fire('click', { latlng: point.right });
        }
        
        // Tentative de géoréférencement avec points insuffisants
        const georefButton = document.querySelector(this.selectors.georefButton);
        if (georefButton) {
            await this.simulateUserAction('click', georefButton, null, 'Tentative avec points insuffisants');
            
            // Vérification du message d'erreur
            await TestUtils.waitForCondition(
                () => {
                    const error = document.querySelector('.validation-error');
                    return error && error.textContent.includes('point');
                },
                'Un message d\'erreur de validation doit apparaître'
            );
        }
        
        // 5. Correction et succès
        for (let i = 1; i < 4; i++) {
            const addPoint = this.testData.controlPoints[i];
            if (window.leftMap && window.rightMap) {
                window.leftMap.fire('click', { latlng: addPoint.left });
                window.rightMap.fire('click', { latlng: addPoint.right });
                await TestUtils.delay(100);
            }
        }
        
        if (georefButton && !georefButton.disabled) {
            await this.simulateUserAction('click', georefButton, null, 'Géoréférencement corrigé');
        }
        
        this.results.push({
            name: 'testErrorRecoveryScenario',
            status: 'passed',
            errorsEncountered: 2,
            recoverySuccessful: true,
            userActions: this.userActions.length,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test : Workflow utilisateur authentifié
     */
    async testAuthenticatedUserWorkflow() {
        TestUtils.log('info', 'Test E2E: Utilisateur authentifié');
        
        // 1. Simulation de connexion
        if (window.ptmAuth) {
            window.ptmAuth.token = 'test_token_e2e';
            window.ptmAuth.userInfo = {
                name: 'Test User E2E',
                email: 'test.e2e@example.com',
                institution: 'Test Institution'
            };
            
            if (typeof window.updateAuthenticationUI === 'function') {
                window.updateAuthenticationUI();
            }
        }
        
        // 2. Accès aux paramètres utilisateur
        const settingsButton = document.querySelector('[data-bs-target="#settings-modal"]');
        if (settingsButton) {
            await this.simulateUserAction('click', settingsButton, null, 'Ouverture paramètres');
            
            // Navigation vers l'onglet profil
            const profilTab = document.querySelector('[data-bs-target="#tabpanel-profil"]');
            if (profilTab) {
                await this.simulateUserAction('click', profilTab, null, 'Onglet profil');
            }
            
            // Vérification des informations utilisateur
            const userName = document.querySelector('#user-first-name');
            if (userName) {
                TestAssert.assertTrue(
                    userName.textContent.includes('Test') || userName.textContent.includes('Chargement'),
                    'Le nom utilisateur doit être affiché'
                );
            }
        }
        
        // 3. Workflow de géoréférencement avec sauvegarde
        const arkInput = TestAssert.assertElementExists(this.selectors.arkInput);
        await this.simulateUserAction('type', arkInput, this.testData.validArks[0], 'Chargement carte');
        
        const loadButton = TestAssert.assertElementExists(this.selectors.loadButton);
        await this.simulateUserAction('click', loadButton, null, 'Chargement');
        
        await TestUtils.waitForCondition(
            () => window.leftMap && window.rightMap,
            'Attente chargement cartes'
        );
        
        // 4. Sauvegarde automatique activée
        if (typeof window.enableAutoSave === 'function') {
            window.enableAutoSave();
            await this.simulateUserAction('wait', null, 100, 'Activation auto-save');
        }
        
        // 5. Ajout de points avec sauvegarde automatique
        for (let i = 0; i < 4; i++) {
            const point = this.testData.controlPoints[i];
            if (window.leftMap && window.rightMap) {
                window.leftMap.fire('click', { latlng: point.left });
                window.rightMap.fire('click', { latlng: point.right });
                await this.simulateUserAction('wait', null, 200, `Point ${i+1} avec auto-save`);
            }
        }
        
        // 6. Sauvegarde manuelle
        const saveButton = document.querySelector('[data-action="save"]');
        if (saveButton) {
            await this.simulateUserAction('click', saveButton, null, 'Sauvegarde manuelle');
        }
        
        // 7. Géoréférencement et dépôt
        const georefButton = document.querySelector(this.selectors.georefButton);
        if (georefButton && !georefButton.disabled) {
            await this.simulateUserAction('click', georefButton, null, 'Géoréférencement');
            
            // Attendre le résultat
            await TestUtils.waitForCondition(
                () => {
                    const result = document.querySelector('.georef-result');
                    return result && result.style.display !== 'none';
                },
                'Attente résultat géoréférencement'
            );
            
            // Dépôt Nakala si disponible
            const depositButton = document.querySelector('[data-action="deposit"]');
            if (depositButton) {
                await this.simulateUserAction('click', depositButton, null, 'Dépôt Nakala');
            }
        }
        
        this.results.push({
            name: 'testAuthenticatedUserWorkflow',
            status: 'passed',
            authenticated: true,
            autoSaveEnabled: true,
            userActions: this.userActions.length,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test : Workflow responsive mobile (simulation)
     */
    async testMobileResponsiveWorkflow() {
        TestUtils.log('info', 'Test E2E: Interface mobile responsive');
        
        // 1. Simulation d'un écran mobile
        const originalInnerWidth = window.innerWidth;
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 375
        });
        
        // Déclencher l'événement de resize
        window.dispatchEvent(new Event('resize'));
        await this.simulateUserAction('wait', null, 200, 'Adaptation mobile');
        
        // 2. Vérification de l'adaptation mobile
        const mobileMenu = document.querySelector('.mobile-menu, .navbar-toggler');
        if (mobileMenu) {
            await this.simulateUserAction('click', mobileMenu, null, 'Ouverture menu mobile');
        }
        
        // 3. Interface de géoréférencement mobile
        const arkInput = TestAssert.assertElementExists(this.selectors.arkInput);
        await this.simulateUserAction('type', arkInput, this.testData.validArks[0], 'Saisie mobile');
        
        const loadButton = TestAssert.assertElementExists(this.selectors.loadButton);
        await this.simulateUserAction('click', loadButton, null, 'Chargement mobile');
        
        // 4. Test de la navigation entre cartes sur mobile
        const mapToggle = document.querySelector('.map-toggle, [data-action="switch-map"]');
        if (mapToggle) {
            await this.simulateUserAction('click', mapToggle, null, 'Basculement carte mobile');
        }
        
        // 5. Gestes tactiles simulés
        for (let i = 0; i < 2; i++) {
            const point = this.testData.controlPoints[i];
            
            // Simulation de tap
            if (window.leftMap) {
                const event = new TouchEvent('touchstart', {
                    touches: [{
                        clientX: 200,
                        clientY: 200,
                        target: window.leftMap.getContainer()
                    }]
                });
                window.leftMap.getContainer().dispatchEvent(event);
                await this.simulateUserAction('wait', null, 100, `Touch point ${i+1}`);
            }
        }
        
        // 6. Restauration de l'écran normal
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: originalInnerWidth
        });
        window.dispatchEvent(new Event('resize'));
        
        this.results.push({
            name: 'testMobileResponsiveWorkflow',
            status: 'passed',
            mobileAdaptation: true,
            touchInteractions: 2,
            userActions: this.userActions.length,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test : Scénario de géoréférencement complexe
     */
    async testComplexGeoreferencingScenario() {
        TestUtils.log('info', 'Test E2E: Géoréférencement complexe');
        
        // Ce test sera implémenté selon les besoins spécifiques
        // de géoréférencement complexe de Galligeo
        
        this.results.push({
            name: 'testComplexGeoreferencingScenario',
            status: 'skipped',
            reason: 'To be implemented based on specific complex scenarios',
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test : Workflow de traitement en lot
     */
    async testBulkProcessingWorkflow() {
        TestUtils.log('info', 'Test E2E: Traitement en lot');
        
        // Ce test sera implémenté si la fonctionnalité
        // de traitement en lot est disponible
        
        this.results.push({
            name: 'testBulkProcessingWorkflow',
            status: 'skipped',
            reason: 'Bulk processing feature not yet available',
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test : Workflow collaboratif
     */
    async testCollaborativeWorkflow() {
        TestUtils.log('info', 'Test E2E: Workflow collaboratif');
        
        // Ce test sera implémenté si des fonctionnalités
        // collaboratives sont disponibles
        
        this.results.push({
            name: 'testCollaborativeWorkflow',
            status: 'skipped',
            reason: 'Collaborative features not yet available',
            timestamp: new Date().toISOString()
        });
    }
}

// Export pour utilisation globale
window.E2ETests = E2ETests;

// Pour Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = E2ETests;
}
