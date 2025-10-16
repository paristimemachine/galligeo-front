/**
 * Test de validation du workflow de géoréférencement
 * Avec le nouveau système d'authentification conforme à la doc backend
 */

class GeorefWorkflowTester {
    constructor() {
        this.testResults = [];
        this.testArk = null;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const entry = { timestamp, message, type };
        this.testResults.push(entry);
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`[${timestamp}] ${icon} ${message}`);
        
        return entry;
    }

    async testGeorefWorkflow() {
        this.log('🗺️ === TEST WORKFLOW GÉORÉFÉRENCEMENT ===');
        
        if (!window.ptmAuth) {
            this.log('Système d\'authentification non disponible', 'error');
            return false;
        }

        try {
            this.testArk = `btv1b${Date.now()}_test_georef`;
            this.log(`Test avec ARK: ${this.testArk}`);

            await this.testMarkAsWorked();
            await this.testAddControlPoints();
            await this.testMarkAsGeoreferenced();
            await this.testVerifySave();
            await this.testDataRetrieval();

            this.log('✅ Workflow de géoréférencement terminé avec succès', 'success');
            return true;

        } catch (error) {
            this.log(`❌ Erreur dans le workflow: ${error.message}`, 'error');
            return false;
        }
    }

    // Test mode anonyme
    async testAnonymousGeoref() {
        this.log('👤 === TEST GÉORÉFÉRENCEMENT ANONYME ===');

        try {
            const testArk = `btv1b${Date.now()}_anon_test`;
            
            // Test sauvegarde anonyme
            const result = await window.ptmAuth.saveAnonymousMapStatus(testArk, 'worked', {
                quality: 2,
                notes: 'Test géoréférencement anonyme'
            });

            this.log(`Sauvegarde anonyme OK: ${JSON.stringify(result)}`, 'success');

            // Marquer comme géoréférencée
            await window.ptmAuth.saveAnonymousMapStatus(testArk, 'georeferenced', {
                quality: 3,
                controlPoints: 4
            });

            this.log('Géoréférencement anonyme terminé', 'success');
            return true;

        } catch (error) {
            this.log(`Erreur géoréférencement anonyme: ${error.message}`, 'error');
            return false;
        }
    }

    // Test mode authentifié
    async testAuthenticatedGeoref() {
        this.log('🔐 === TEST GÉORÉFÉRENCEMENT AUTHENTIFIÉ ===');

        if (!window.ptmAuth.isAuthenticated()) {
            this.log('Utilisateur non authentifié - test ignoré', 'warning');
            return true;
        }

        try {
            const testArk = `btv1b${Date.now()}_auth_test`;
            
            // Test sauvegarde authentifiée
            const result = await window.ptmAuth.saveMapStatus(testArk, 'worked', {
                quality: 3,
                notes: 'Test géoréférencement authentifié'
            });

            this.log(`Sauvegarde authentifiée OK: ${JSON.stringify(result)}`, 'success');

            // Marquer comme géoréférencée
            await window.ptmAuth.saveMapStatus(testArk, 'georeferenced', {
                quality: 4,
                controlPoints: 6,
                algorithm: 'helmert'
            });

            this.log('Géoréférencement authentifié terminé', 'success');
            return true;

        } catch (error) {
            this.log(`Erreur géoréférencement authentifié: ${error.message}`, 'error');
            return false;
        }
    }

    async testMarkAsWorked() {
        this.log('📍 Test: Marquer carte comme en cours...');
        
        const result = await window.ptmAuth.saveMapStatus ? 
            window.ptmAuth.saveMapStatus(this.testArk, 'worked', {
                quality: 1,
                startedAt: new Date().toISOString()
            }) :
            window.ptmAuth.saveAnonymousMapStatus(this.testArk, 'worked', {
                quality: 1,
                startedAt: new Date().toISOString()
            });

        this.log('Carte marquée comme en cours', 'success');
        return result;
    }

    async testAddControlPoints() {
        this.log('🎯 Test: Simulation ajout points de contrôle...');
        
        // Simuler l'ajout de points de contrôle
        const controlPoints = [
            { x: 2.3522, y: 48.8566, map_x: 100, map_y: 200 },
            { x: 2.3622, y: 48.8466, map_x: 200, map_y: 300 },
            { x: 2.3422, y: 48.8666, map_x: 150, map_y: 250 },
            { x: 2.3722, y: 48.8366, map_x: 250, map_y: 350 }
        ];

        // Sauvegarder avec les points de contrôle
        const updateFunction = window.ptmAuth.saveMapStatus || window.ptmAuth.saveAnonymousMapStatus;
        const result = await updateFunction.call(window.ptmAuth, this.testArk, 'worked', {
            quality: 2,
            controlPoints: controlPoints,
            pointCount: controlPoints.length
        });

        this.log(`${controlPoints.length} points de contrôle ajoutés`, 'success');
        return result;
    }

    async testMarkAsGeoreferenced() {
        this.log('🗺️ Test: Marquer comme géoréférencée...');
        
        const updateFunction = window.ptmAuth.saveMapStatus || window.ptmAuth.saveAnonymousMapStatus;
        const result = await updateFunction.call(window.ptmAuth, this.testArk, 'georeferenced', {
            quality: 4,
            algorithm: 'helmert',
            rmsError: 2.5,
            completedAt: new Date().toISOString()
        });

        this.log('Carte marquée comme géoréférencée', 'success');
        return result;
    }

    async testVerifySave() {
        this.log('💾 Test: Vérification sauvegarde...');
        
        try {
            let data;
            if (window.ptmAuth.isAuthenticated()) {
                data = await window.ptmAuth.getAppData('galligeo');
            } else {
                data = await window.ptmAuth.getAnonymousDataFromAPI();
            }

            if (data && data.rec_ark) {
                const savedMap = data.rec_ark.find(map => map.ark === this.testArk);
                if (savedMap) {
                    this.log(`Carte retrouvée: statut=${savedMap.status}, qualité=${savedMap.quality}`, 'success');
                    return true;
                } else {
                    this.log('Carte non trouvée dans les données sauvegardées', 'warning');
                    return false;
                }
            } else {
                this.log('Aucune donnée récupérée', 'warning');
                return false;
            }
        } catch (error) {
            this.log(`Erreur vérification: ${error.message}`, 'warning');
            return false;
        }
    }

    async testDataRetrieval() {
        this.log('📊 Test: Récupération données...');
        
        try {
            let workedMaps;
            if (window.ptmAuth.isAuthenticated()) {
                workedMaps = await window.ptmAuth.getWorkedMaps();
            } else {
                workedMaps = window.ptmAuth.getAnonymousWorkedMaps();
            }

            const mapCount = workedMaps ? workedMaps.length : 0;
            this.log(`${mapCount} carte(s) travaillée(s) récupérée(s)`, 'success');
            
            return workedMaps;
        } catch (error) {
            this.log(`Erreur récupération: ${error.message}`, 'error');
            return [];
        }
    }

    // Test des paramètres/settings
    async testSettingsWorkflow() {
        this.log('⚙️ === TEST WORKFLOW PARAMÈTRES ===');

        try {
            const testSettings = {
                "input-scale": "50000",
                "select-quality": "high",
                "select-algo": "polynomial",
                "checkbox-autosave": true,
                "test-timestamp": new Date().toISOString()
            };

            // Sauvegarder les paramètres
            await window.ptmAuth.saveGalligeoSettings(testSettings);
            this.log('Paramètres sauvegardés', 'success');

            // Récupérer les paramètres
            const retrievedSettings = await window.ptmAuth.getGalligeoSettings();
            this.log(`Paramètres récupérés: ${JSON.stringify(retrievedSettings)}`, 'success');

            return true;
        } catch (error) {
            this.log(`Erreur workflow paramètres: ${error.message}`, 'error');
            return false;
        }
    }

    // Test complet
    async runAllTests() {
        this.log('🚀 === DÉBUT TESTS COMPLETS GÉORÉFÉRENCEMENT ===');
        
        const results = {
            workflow: false,
            anonymous: false,
            authenticated: false,
            settings: false
        };

        // Test workflow de base
        results.workflow = await this.testGeorefWorkflow();

        // Test mode anonyme
        results.anonymous = await this.testAnonymousGeoref();

        // Test mode authentifié (si applicable)
        results.authenticated = await this.testAuthenticatedGeoref();

        // Test paramètres
        results.settings = await this.testSettingsWorkflow();

        // Résumé
        this.log('📊 === RÉSUMÉ DES TESTS ===');
        this.log(`Workflow général: ${results.workflow ? 'PASS' : 'FAIL'}`, results.workflow ? 'success' : 'error');
        this.log(`Mode anonyme: ${results.anonymous ? 'PASS' : 'FAIL'}`, results.anonymous ? 'success' : 'error');
        this.log(`Mode authentifié: ${results.authenticated ? 'PASS' : 'FAIL'}`, results.authenticated ? 'success' : 'error');
        this.log(`Paramètres: ${results.settings ? 'PASS' : 'FAIL'}`, results.settings ? 'success' : 'error');

        const passedTests = Object.values(results).filter(r => r).length;
        const totalTests = Object.keys(results).length;
        
        this.log(`🎯 Résultat final: ${passedTests}/${totalTests} tests réussis`, passedTests === totalTests ? 'success' : 'warning');

        return results;
    }

    // Nettoyer les données de test
    async cleanup() {
        this.log('🧹 Nettoyage des données de test...');
        
        if (this.testArk) {
            try {
                if (window.ptmAuth.isAuthenticated()) {
                    await window.ptmAuth.removeWorkedMap(this.testArk);
                } else {
                    window.ptmAuth.removeAnonymousMap(this.testArk);
                }
                this.log('Données de test supprimées', 'success');
            } catch (error) {
                this.log(`Erreur nettoyage: ${error.message}`, 'warning');
            }
        }
    }

    // Afficher les résultats
    displayResults() {
        console.log('\n📋 === JOURNAL COMPLET DES TESTS ===');
        this.testResults.forEach(entry => {
            const icon = entry.type === 'success' ? '✅' : entry.type === 'error' ? '❌' : entry.type === 'warning' ? '⚠️' : 'ℹ️';
            console.log(`[${entry.timestamp}] ${icon} ${entry.message}`);
        });
    }
}

// Instance globale
window.GeorefWorkflowTester = GeorefWorkflowTester;

// Fonction de test rapide
window.testGeorefWorkflow = async function() {
    const tester = new GeorefWorkflowTester();
    const results = await tester.runAllTests();
    tester.displayResults();
    await tester.cleanup();
    return results;
};

console.log('🧪 GeorefWorkflowTester chargé - utilisez window.testGeorefWorkflow()');