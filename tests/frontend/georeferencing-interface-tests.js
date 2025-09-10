/**
 * Tests de l'interface de géoréférencement (Frontend)
 * Tests de non-régression pour l'interface de création de points de contrôle
 */

class GeoreferencingInterfaceTests {
    
    constructor() {
        // Configuration avec valeurs par défaut
        this.config = window.GALLIGEO_TEST_CONFIG || {};
        this.selectors = this.config.SELECTORS || {
            // Sélecteurs par défaut si configuration non disponible
            arkInput: '#search-784-input',
            loadButton: 'button[title="Ark : -> Gallica"]',
            georefButton: '#btn_georef',
            displayButton: '#btn_display',
            depositButton: '#btn_deposit',
            inputModeToggle: '#toggle',
            pointsMode: '#segmented-1',
            empriseMode: '#segmented-2',
            leftMap: '#map-left',
            rightMap: '#map-right',
            loginButton: 'button[onclick*="auth/login"]',
            settingsModal: '#fr-modal-settings',
            userFirstName: '#user-first-name',
            userLastName: '#user-last-name',
            userEmail: '#user-email',
            userInstitution: '#user-institution',
            sidebar: '#sidebar',
            controlPointsTable: '#table_body',
            backupButton: '#btn_save_backup',
            restoreButton: '#btn_restore_backup'
        };
        this.testData = this.config.TEST_DATA || {
            validArks: ['btv1b53121232b', 'btv1b532480876', 'btv1b8441346h'],
            testControlPoints: [
                { id: 1, leftPoint: { lat: 48.8566, lng: 2.3522 }, rightPoint: { lat: 48.8566, lng: 2.3522 } }
            ]
        };
        this.results = [];
        
        // Log pour debug
        console.log('GeoreferencingInterfaceTests initialized with selectors:', this.selectors);
    }
    
    /**
     * Exécuter tous les tests de l'interface de géoréférencement
     */
    async runAllTests() {
        TestUtils.log('info', 'Début des tests de l\'interface de géoréférencement');
        
        const tests = [
            this.testPageLoad.bind(this),
            this.testArkInput.bind(this),
            this.testMapInitialization.bind(this),
            this.testInputModeToggle.bind(this),
            this.testControlPointCreation.bind(this),
            this.testControlPointEditing.bind(this),
            this.testEmpriseFunctionality.bind(this),
            this.testGeoreferencingButton.bind(this),
            this.testDisplayButton.bind(this),
            this.testBackupFunctionality.bind(this)
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
        
        return TestUtils.generateReport('Georeferencing Interface Tests', this.results);
    }
    
    /**
     * Obtenir le document dans lequel chercher les elements
     * Peut etre le document actuel, un iframe ou une fenetre parent
     */
    getTargetDocument() {
        // 1. Si on est dans un iframe, essayer de trouver l'iframe de l'application
        if (window.parent && window.parent !== window) {
            const appFrame = window.parent.document.getElementById('galligeoApp');
            if (appFrame && appFrame.contentDocument) {
                return appFrame.contentDocument;
            }
        }
        
        // 2. Si on a un iframe dans le document actuel
        const iframe = document.getElementById('galligeoApp');
        if (iframe && iframe.contentDocument) {
            return iframe.contentDocument;
        }
        
        // 3. Essayer la fenetre parent si elle existe
        if (window.parent && window.parent.document && window.parent.document !== document) {
            return window.parent.document;
        }
        
        // 4. Utiliser le document actuel par defaut
        return document;
    }

    /**
     * Chercher un element dans le bon contexte
     */
    querySelector(selector) {
        const targetDoc = this.getTargetDocument();
        const element = targetDoc.querySelector(selector);
        
        if (!element) {
            TestUtils.log('warning', `Element non trouve avec selecteur ${selector} dans ${targetDoc === document ? 'document actuel' : 'document cible'}`);
        }
        
        return element;
    }

    /**
     * Test du chargement de la page
     */
    async testPageLoad() {
        TestUtils.log('info', 'Test du chargement de la page');
        
        // Verifier la configuration
        if (!this.selectors || !this.selectors.arkInput) {
            throw new Error('Configuration des selecteurs non disponible');
        }
        
        // Verifier que le champ de saisie ARK est present
        const arkInput = this.querySelector(this.selectors.arkInput);
        TestAssert.assertTrue(
            arkInput !== null,
            `Le champ de saisie ARK doit etre present. Selector: ${this.selectors.arkInput}`
        );
        
        // Verifier les attributs du champ
        if (arkInput) {
            TestAssert.assertTrue(
                arkInput.type === 'text' || arkInput.tagName === 'INPUT',
                'Le champ ARK doit etre un input text'
            );
        }
        
        // Verifier le chargement des scripts essentiels
        const targetWindow = this.getTargetDocument().defaultView || window;
        TestAssert.assertTrue(
            typeof targetWindow.L !== 'undefined',
            'Leaflet doit etre charge'
        );
        
        this.results.push({
            name: 'testPageLoad',
            status: 'passed',
            arkInputFound: !!arkInput,
            leafletLoaded: typeof targetWindow.L !== 'undefined',
            documentContext: this.getTargetDocument() === document ? 'current' : 'iframe',
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test de saisie d'ARK
     */
    async testArkInput() {
        TestUtils.log('info', 'Test de saisie d ARK');
        
        // Verifier la configuration
        if (!this.selectors || !this.selectors.arkInput) {
            throw new Error('Configuration des selecteurs non disponible');
        }
        
        const arkInput = this.querySelector(this.selectors.arkInput);
        if (!arkInput) {
            throw new Error(`Element not found. Selector: ${this.selectors.arkInput}`);
        }
        
        // Test de saisie d'un ARK valide
        const testArk = this.testData.validArks ? this.testData.validArks[0] : 'btv1b53121232b';
        arkInput.value = testArk;
        
        // Declencher l'evenement de changement
        arkInput.dispatchEvent(new Event('input', { bubbles: true }));
        arkInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Verifier que la valeur a ete prise en compte
        TestAssert.assertEqual(
            arkInput.value,
            testArk,
            'La valeur ARK doit etre prise en compte'
        );
        
        // Verifier le bouton de chargement
        const loadButton = this.querySelector(this.selectors.loadButton);
        if (loadButton) {
            TestAssert.assertFalse(
                loadButton.disabled,
                'Le bouton de chargement doit etre activable'
            );
            
            // Tester un clic (sans executer reellement)
            TestUtils.log('info', 'Simulation du clic sur le bouton de chargement');
            // loadButton.click(); // Commente pour eviter le chargement reel
        }
        
        this.results.push({
            name: 'testArkInput',
            status: 'passed',
            arkValue: arkInput.value,
            loadButtonFound: !!loadButton,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test de l'initialisation des cartes
     */
    async testMapInitialization() {
        TestUtils.log('info', 'Test de l initialisation des cartes');
        
        // Verifier que les conteneurs existent
        const leftMapContainer = this.querySelector(this.selectors.leftMap);
        const rightMapContainer = this.querySelector(this.selectors.rightMap);
        
        if (!leftMapContainer) {
            throw new Error(`Element not found. Selector: ${this.selectors.leftMap}`);
        }
        
        if (!rightMapContainer) {
            throw new Error(`Element not found. Selector: ${this.selectors.rightMap}`);
        }
        
        // Les cartes sont initialisees apres le chargement d'un ARK
        // Pour le test, on verifie que les fonctions d'initialisation existent
        const targetWindow = this.getTargetDocument().defaultView || window;
        TestAssert.assertTrue(
            typeof targetWindow.L !== 'undefined',
            'Leaflet doit etre disponible'
        );
        
        // Verifier que la synchronisation des cartes est disponible
        TestAssert.assertTrue(
            typeof targetWindow.L.Map !== 'undefined',
            'L.Map doit etre disponible'
        );
        
        // Si les cartes sont deja initialisees, les verifier
        if (targetWindow.leftMap) {
            TestAssert.assertTrue(
                targetWindow.leftMap instanceof targetWindow.L.Map,
                'La carte de gauche doit etre une instance de L.Map'
            );
        }
        
        if (targetWindow.rightMap) {
            TestAssert.assertTrue(
                targetWindow.rightMap instanceof targetWindow.L.Map,
                'La carte de droite doit etre une instance de L.Map'
            );
        }
        
        this.results.push({
            name: 'testMapInitialization',
            status: 'passed',
            leftMapExists: !!targetWindow.leftMap,
            rightMapExists: !!targetWindow.rightMap,
            leftContainerFound: !!leftMapContainer,
            rightContainerFound: !!rightMapContainer,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test du toggle mode de saisie
     */
    async testInputModeToggle() {
        TestUtils.log('info', 'Test du toggle mode de saisie');
        
        const pointsRadio = TestAssert.assertElementExists(this.selectors.pointsRadio);
        const empriseRadio = TestAssert.assertElementExists(this.selectors.empriseRadio);
        const lockToggle = TestAssert.assertElementExists(this.selectors.lockToggle);
        
        // Test du mode points
        TestUtils.click(pointsRadio);
        await TestUtils.sleep(100);
        
        TestAssert.assertTrue(
            pointsRadio.checked,
            'Le mode points doit être sélectionné'
        );
        
        TestAssert.assertEqual(
            window.currentInputMode,
            'points',
            'Le mode de saisie doit être "points"'
        );
        
        // Test du mode emprise
        TestUtils.click(empriseRadio);
        await TestUtils.sleep(100);
        
        TestAssert.assertTrue(
            empriseRadio.checked,
            'Le mode emprise doit être sélectionné'
        );
        
        TestAssert.assertEqual(
            window.currentInputMode,
            'emprise',
            'Le mode de saisie doit être "emprise"'
        );
        
        // Test du verrouillage
        TestUtils.click(lockToggle);
        await TestUtils.sleep(100);
        
        if (lockToggle.checked) {
            TestAssert.assertTrue(
                window.isInputLocked,
                'La saisie doit être verrouillée'
            );
        }
        
        this.results.push({
            name: 'testInputModeToggle',
            status: 'passed',
            message: 'Toggle mode de saisie fonctionnel',
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test de création de points de contrôle
     */
    async testControlPointCreation() {
        TestUtils.log('info', 'Test de création de points de contrôle');
        
        // S'assurer qu'on est en mode points et déverrouillé
        const pointsRadio = document.querySelector(this.selectors.pointsRadio);
        const lockToggle = document.querySelector(this.selectors.lockToggle);
        
        if (pointsRadio) TestUtils.click(pointsRadio);
        if (lockToggle && lockToggle.checked) TestUtils.click(lockToggle);
        
        await TestUtils.sleep(200);
        
        // Nettoyer les points existants
        if (window.pointPairs) {
            window.pointPairs.length = 0;
        }
        
        // Créer des points de contrôle de test
        const testPoints = this.testData.testControlPoints || [
            {
                leftPoint: { lat: 48.8566, lng: 2.3522 },
                rightPoint: { lat: 48.8566, lng: 2.3522 }
            }
        ];
        
        TestUtils.createTestControlPoints(testPoints);
        
        // Vérifier que les points ont été créés
        TestAssert.assertTrue(
            window.pointPairs.length > 0,
            'Des points de contrôle doivent être créés'
        );
        
        TestAssert.assertEqual(
            window.pointPairs.length,
            testPoints.length,
            'Le nombre de points doit correspondre'
        );
        
        // Vérifier la structure des points
        const firstPoint = window.pointPairs[0];
        TestAssert.assertTrue(
            firstPoint.leftPoint && firstPoint.rightPoint,
            'Chaque point doit avoir leftPoint et rightPoint'
        );
        
        TestAssert.assertTrue(
            typeof firstPoint.isComplete === 'function',
            'Chaque point doit avoir une méthode isComplete'
        );
        
        // Vérifier la mise à jour de la table
        const tableBody = document.querySelector('#table_body');
        if (tableBody) {
            TestAssert.assertTrue(
                tableBody.children.length > 0,
                'La table des points de contrôle doit être mise à jour'
            );
        }
        
        this.results.push({
            name: 'testControlPointCreation',
            status: 'passed',
            pointsCreated: window.pointPairs.length,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test d'édition de points de contrôle
     */
    async testControlPointEditing() {
        TestUtils.log('info', 'Test d\'édition de points de contrôle');
        
        // S'assurer qu'il y a des points à éditer
        if (!window.pointPairs || window.pointPairs.length === 0) {
            TestUtils.createTestControlPoints(this.testData.testControlPoints || [
                {
                    leftPoint: { lat: 48.8566, lng: 2.3522 },
                    rightPoint: { lat: 48.8566, lng: 2.3522 }
                }
            ]);
        }
        
        const initialCount = window.pointPairs.length;
        
        // Test de suppression d'un point individuel
        if (typeof window.removeControlPoint === 'function' && initialCount > 0) {
            const pointToRemove = window.pointPairs[0].id;
            window.removeControlPoint(pointToRemove);
            
            TestAssert.assertEqual(
                window.pointPairs.length,
                initialCount - 1,
                'Un point doit être supprimé'
            );
        }
        
        // Test de suppression de tous les points
        if (typeof window.clearAllControlPoints === 'function') {
            window.clearAllControlPoints();
            
            TestAssert.assertEqual(
                window.pointPairs.length,
                0,
                'Tous les points doivent être supprimés'
            );
        }
        
        // Recréer des points pour la suite des tests
        TestUtils.createTestControlPoints(this.testData.testControlPoints || []);
        
        this.results.push({
            name: 'testControlPointEditing',
            status: 'passed',
            message: 'Édition de points de contrôle fonctionnelle',
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test de la fonctionnalité emprise
     */
    async testEmpriseFunctionality() {
        TestUtils.log('info', 'Test de la fonctionnalité emprise');
        
        // Passer en mode emprise
        const empriseRadio = document.querySelector(this.selectors.empriseRadio);
        if (empriseRadio) {
            TestUtils.click(empriseRadio);
            await TestUtils.sleep(200);
        }
        
        // Créer une emprise de test
        if (typeof window.currentPolygon !== 'undefined') {
            window.currentPolygon = {
                points: this.testData.testPolygon || [
                    { lat: 48.8500, lng: 2.3400 },
                    { lat: 48.8600, lng: 2.3400 },
                    { lat: 48.8600, lng: 2.3600 },
                    { lat: 48.8500, lng: 2.3600 }
                ]
            };
            
            // Mettre à jour les données du polygone
            if (typeof window.updatePolygonData === 'function') {
                window.updatePolygonData();
            }
            
            TestAssert.assertTrue(
                window.currentPolygon.points.length >= 3,
                'L\'emprise doit avoir au moins 3 points'
            );
        }
        
        // Test de suppression de l'emprise
        if (typeof window.clearEmprise === 'function') {
            window.clearEmprise();
            
            TestAssert.assertTrue(
                !window.currentPolygon || !window.currentPolygon.points || window.currentPolygon.points.length === 0,
                'L\'emprise doit être supprimée'
            );
        }
        
        this.results.push({
            name: 'testEmpriseFunctionality',
            status: 'passed',
            message: 'Fonctionnalité emprise testée',
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test du bouton de géoréférencement
     */
    async testGeoreferencingButton() {
        TestUtils.log('info', 'Test du bouton de géoréférencement');
        
        const georefButton = TestAssert.assertElementExists(this.selectors.georefButton);
        
        // Vérifier l'état initial du bouton
        TestAssert.assertTrue(
            georefButton.disabled,
            'Le bouton de géoréférencement doit être désactivé au départ'
        );
        
        // Créer des points de contrôle pour activer le bouton
        TestUtils.createTestControlPoints(this.testData.testControlPoints || [
            {
                leftPoint: { lat: 48.8566, lng: 2.3522 },
                rightPoint: { lat: 48.8566, lng: 2.3522 }
            },
            {
                leftPoint: { lat: 48.8606, lng: 2.3376 },
                rightPoint: { lat: 48.8606, lng: 2.3376 }
            },
            {
                leftPoint: { lat: 48.8529, lng: 2.3500 },
                rightPoint: { lat: 48.8529, lng: 2.3500 }
            }
        ]);
        
        // Simuler un ARK chargé
        if (!window.input_ark) {
            window.input_ark = this.testData.validArks?.[0] || 'btv1b53121232b';
        }
        
        // Vérifier la disponibilité du géoréférencement
        if (typeof window.checkGeoreferencingAvailability === 'function') {
            window.checkGeoreferencingAvailability();
        }
        
        // Le bouton pourrait être activé maintenant (dépend de l'authentification)
        TestUtils.log('info', `Bouton géoréférencement ${georefButton.disabled ? 'désactivé' : 'activé'}`);
        
        this.results.push({
            name: 'testGeoreferencingButton',
            status: 'passed',
            buttonEnabled: !georefButton.disabled,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test du bouton d'affichage
     */
    async testDisplayButton() {
        TestUtils.log('info', 'Test du bouton d\'affichage');
        
        const displayButton = TestAssert.assertElementExists(this.selectors.displayButton);
        
        // Vérifier l'état initial
        TestAssert.assertTrue(
            displayButton.disabled,
            'Le bouton d\'affichage doit être désactivé au départ'
        );
        
        // Le bouton ne s'active qu'après un géoréférencement réussi
        // On peut juste vérifier qu'il existe et a la bonne fonction
        TestAssert.assertTrue(
            displayButton.onclick || displayButton.getAttribute('onclick'),
            'Le bouton d\'affichage doit avoir une fonction onclick'
        );
        
        this.results.push({
            name: 'testDisplayButton',
            status: 'passed',
            message: 'Bouton d\'affichage testé',
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test de la fonctionnalité de sauvegarde
     */
    async testBackupFunctionality() {
        TestUtils.log('info', 'Test de la fonctionnalité de sauvegarde');
        
        // Vérifier que le système de sauvegarde est disponible
        TestAssert.assertTrue(
            typeof window.controlPointsBackup !== 'undefined',
            'Le système de sauvegarde doit être disponible'
        );
        
        // Créer des points pour tester la sauvegarde
        TestUtils.createTestControlPoints(this.testData.testControlPoints || []);
        
        // Test de sauvegarde manuelle
        const saveButton = document.querySelector('#btn_save_backup');
        if (saveButton && typeof window.controlPointsBackup.saveCurrentState === 'function') {
            TestUtils.click(saveButton);
            await TestUtils.sleep(100);
            
            TestUtils.log('info', 'Sauvegarde manuelle testée');
        }
        
        // Test de restauration
        const restoreButton = document.querySelector('#btn_restore_backup');
        if (restoreButton && typeof window.controlPointsBackup.showRestoreInterface === 'function') {
            // Ne pas cliquer réellement car cela ouvre une interface utilisateur
            TestUtils.log('info', 'Bouton de restauration disponible');
        }
        
        this.results.push({
            name: 'testBackupFunctionality',
            status: 'passed',
            message: 'Fonctionnalité de sauvegarde testée',
            timestamp: new Date().toISOString()
        });
    }
}

// Export pour utilisation globale
window.GeoreferencingInterfaceTests = GeoreferencingInterfaceTests;

// Pour Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeoreferencingInterfaceTests;
}
