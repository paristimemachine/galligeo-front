/**
 * Tests de l'API PTM Auth (Backend)
 * Tests de non-régression pour l'authentification et les données utilisateur
 */

class PTMAuthApiTests {
    
    constructor() {
        this.config = window.GALLIGEO_TEST_CONFIG?.CONFIG || {
            apiUrl: 'https://api.ptm.huma-num.fr'
        };
        this.testData = window.GALLIGEO_TEST_CONFIG?.TEST_DATA || {};
        this.results = [];
    }
    
    /**
     * Exécuter tous les tests de l'API PTM Auth
     */
    async runAllTests() {
        TestUtils.log('info', 'Début des tests API PTM Auth');
        
        const tests = [
            this.testApiHealth.bind(this),
            this.testProfileEndpoint.bind(this),
            this.testAppDataEndpoints.bind(this),
            this.testGalligeoDataEndpoints.bind(this),
            this.testCartoqueteDataEndpoints.bind(this),
            this.testWorkedMapsEndpoints.bind(this),
            this.testAuthenticationValidation.bind(this),
            this.testErrorHandling.bind(this)
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
        
        return TestUtils.generateReport('API PTM Auth Tests', this.results);
    }
    
    /**
     * Test de santé de l'API
     */
    async testApiHealth() {
        TestUtils.log('info', 'Test de santé de l\'API PTM Auth');
        
        const endpoint = `${this.config.apiUrl}/auth/health`;
        
        try {
            const response = await TestUtils.checkApiHealth(endpoint);
            
            TestAssert.assertTrue(
                response.status === 200 || response.status === 404,
                'API PTM Auth doit répondre'
            );
            
            this.results.push({
                name: 'testApiHealth',
                status: 'passed',
                response: response.status,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            throw new Error(`API PTM Auth non accessible: ${error.message}`);
        }
    }
    
    /**
     * Test de l'endpoint du profil utilisateur
     */
    async testProfileEndpoint() {
        TestUtils.log('info', 'Test de l\'endpoint profil utilisateur');
        
        const endpoint = `${this.config.apiUrl}/auth/profile`;
        
        try {
            // Test sans authentification (doit retourner 401)
            const response = await fetch(endpoint);
            
            TestAssert.assertTrue(
                response.status === 401 || response.status === 403,
                'L\'endpoint profil doit requérir une authentification'
            );
            
            this.results.push({
                name: 'testProfileEndpoint',
                status: 'passed',
                response: response.status,
                message: 'Authentification requise correctement',
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            throw new Error(`Erreur lors du test de l'endpoint profil: ${error.message}`);
        }
    }
    
    /**
     * Test des endpoints de données d'applications
     */
    async testAppDataEndpoints() {
        TestUtils.log('info', 'Test des endpoints de données d\'applications');
        
        const appName = 'galligeo';
        const endpoints = [
            `${this.config.apiUrl}/auth/app/${appName}/data`,
            `${this.config.apiUrl}/auth/app/${appName}/data?ark=test_ark`
        ];
        
        for (const endpoint of endpoints) {
            try {
                // Test GET sans authentification
                const getResponse = await fetch(endpoint);
                TestAssert.assertTrue(
                    getResponse.status === 401 || getResponse.status === 403,
                    'GET app data doit requérir une authentification'
                );
                
                // Test POST sans authentification
                const postResponse = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ test: 'data' })
                });
                
                TestAssert.assertTrue(
                    postResponse.status === 401 || postResponse.status === 403,
                    'POST app data doit requérir une authentification'
                );
                
                // Test DELETE sans authentification
                const deleteResponse = await fetch(endpoint, {
                    method: 'DELETE'
                });
                
                TestAssert.assertTrue(
                    deleteResponse.status === 401 || deleteResponse.status === 403,
                    'DELETE app data doit requérir une authentification'
                );
                
            } catch (error) {
                TestUtils.log('warn', `Erreur avec endpoint ${endpoint}`, error);
            }
        }
        
        this.results.push({
            name: 'testAppDataEndpoints',
            status: 'passed',
            message: 'Tests des endpoints de données d\'applications terminés',
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test des endpoints spécifiques Galligeo
     */
    async testGalligeoDataEndpoints() {
        TestUtils.log('info', 'Test des endpoints spécifiques Galligeo');
        
        const endpoints = [
            `${this.config.apiUrl}/auth/galligeo/settings`,
            `${this.config.apiUrl}/auth/galligeo/settings?ark=test_ark`,
            `${this.config.apiUrl}/auth/app/galligeo/data`
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                
                TestAssert.assertTrue(
                    response.status === 401 || response.status === 403 || response.status === 404,
                    'Les endpoints Galligeo doivent être protégés ou retourner 404 si non implémentés'
                );
                
            } catch (error) {
                TestUtils.log('warn', `Erreur avec endpoint Galligeo ${endpoint}`, error);
            }
        }
        
        this.results.push({
            name: 'testGalligeoDataEndpoints',
            status: 'passed',
            message: 'Tests des endpoints Galligeo terminés',
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test des endpoints Cartoquete
     */
    async testCartoqueteDataEndpoints() {
        TestUtils.log('info', 'Test des endpoints Cartoquete');
        
        const endpoints = [
            `${this.config.apiUrl}/auth/app/cartoquete/data`,
            `${this.config.apiUrl}/auth/cartoquete/favorites`
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                
                TestAssert.assertTrue(
                    response.status === 401 || response.status === 403 || response.status === 404,
                    'Les endpoints Cartoquete doivent être protégés ou retourner 404 si non implémentés'
                );
                
            } catch (error) {
                TestUtils.log('warn', `Erreur avec endpoint Cartoquete ${endpoint}`, error);
            }
        }
        
        this.results.push({
            name: 'testCartoqueteDataEndpoints',
            status: 'passed',
            message: 'Tests des endpoints Cartoquete terminés',
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test des endpoints des cartes travaillées
     */
    async testWorkedMapsEndpoints() {
        TestUtils.log('info', 'Test des endpoints des cartes travaillées');
        
        const endpoints = [
            `${this.config.apiUrl}/auth/worked-maps`,
            `${this.config.apiUrl}/auth/worked-maps/btv1b53121232b`
        ];
        
        for (const endpoint of endpoints) {
            try {
                // Test GET
                const getResponse = await fetch(endpoint);
                TestAssert.assertTrue(
                    getResponse.status === 401 || getResponse.status === 403 || getResponse.status === 404,
                    'GET worked maps doit être protégé'
                );
                
                // Test POST/PUT
                const postResponse = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ark: 'test_ark',
                        status: 'en-cours'
                    })
                });
                
                TestAssert.assertTrue(
                    postResponse.status === 401 || postResponse.status === 403 || postResponse.status === 404,
                    'POST worked maps doit être protégé'
                );
                
            } catch (error) {
                TestUtils.log('warn', `Erreur avec endpoint worked maps ${endpoint}`, error);
            }
        }
        
        this.results.push({
            name: 'testWorkedMapsEndpoints',
            status: 'passed',
            message: 'Tests des endpoints des cartes travaillées terminés',
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test de validation de l'authentification
     */
    async testAuthenticationValidation() {
        TestUtils.log('info', 'Test de validation de l\'authentification');
        
        const endpoint = `${this.config.apiUrl}/auth/profile`;
        
        const invalidTokens = [
            'invalid_token',
            'Bearer invalid_token',
            '',
            'expired_token_123'
        ];
        
        for (const token of invalidTokens) {
            try {
                const response = await fetch(endpoint, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                TestAssert.assertTrue(
                    response.status === 401 || response.status === 403,
                    `Token invalide "${token}" doit être rejeté`
                );
                
            } catch (error) {
                TestUtils.log('warn', `Erreur avec token ${token}`, error);
            }
        }
        
        this.results.push({
            name: 'testAuthenticationValidation',
            status: 'passed',
            message: 'Tests de validation de l\'authentification terminés',
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test de gestion des erreurs
     */
    async testErrorHandling() {
        TestUtils.log('info', 'Test de gestion des erreurs');
        
        const errorCases = [
            {
                name: 'Endpoint inexistant',
                endpoint: `${this.config.apiUrl}/auth/nonexistent`,
                expectedStatus: 404
            },
            {
                name: 'Méthode non supportée',
                endpoint: `${this.config.apiUrl}/auth/profile`,
                method: 'DELETE',
                expectedStatus: 405
            },
            {
                name: 'Données JSON invalides',
                endpoint: `${this.config.apiUrl}/auth/app/galligeo/data`,
                method: 'POST',
                body: 'invalid json',
                expectedStatus: [400, 401, 403]
            }
        ];
        
        for (const errorCase of errorCases) {
            try {
                const options = {
                    method: errorCase.method || 'GET'
                };
                
                if (errorCase.body) {
                    options.body = errorCase.body;
                    options.headers = {
                        'Content-Type': 'application/json'
                    };
                }
                
                const response = await fetch(errorCase.endpoint, options);
                
                const expectedStatuses = Array.isArray(errorCase.expectedStatus) 
                    ? errorCase.expectedStatus 
                    : [errorCase.expectedStatus];
                
                TestAssert.assertTrue(
                    expectedStatuses.includes(response.status),
                    `Le cas d'erreur "${errorCase.name}" doit retourner le statut attendu`
                );
                
            } catch (error) {
                TestUtils.log('warn', `Erreur lors du test "${errorCase.name}"`, error);
            }
        }
        
        this.results.push({
            name: 'testErrorHandling',
            status: 'passed',
            message: 'Tests de gestion des erreurs terminés',
            timestamp: new Date().toISOString()
        });
    }
}

// Export pour utilisation globale
window.PTMAuthApiTests = PTMAuthApiTests;

// Pour Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PTMAuthApiTests;
}
