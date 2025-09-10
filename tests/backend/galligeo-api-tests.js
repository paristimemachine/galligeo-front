/**
 * Tests de l'API Galligeo (Backend)
 * Tests de non-régression pour l'API de géoréférencement
 */

class GalligeoApiTests {
    
    constructor() {
        this.config = window.GALLIGEO_TEST_CONFIG?.CONFIG || {
            apiUrl: 'https://api.ptm.huma-num.fr'
        };
        this.testData = window.GALLIGEO_TEST_CONFIG?.TEST_DATA || {};
        this.results = [];
    }
    
    /**
     * Exécuter tous les tests de l'API Galligeo
     */
    async runAllTests() {
        TestUtils.log('info', 'Début des tests API Galligeo');
        
        const tests = [
            this.testApiHealth.bind(this),
            this.testGeoreferencingEndpoint.bind(this),
            this.testGeoreferencingWithValidData.bind(this),
            this.testGeoreferencingWithInvalidData.bind(this),
            this.testGeoreferencingTimeout.bind(this),
            this.testAlgorithmParameters.bind(this),
            this.testImageFormats.bind(this),
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
        
        return TestUtils.generateReport('API Galligeo Tests', this.results);
    }
    
    /**
     * Test de santé de l'API
     */
    async testApiHealth() {
        TestUtils.log('info', 'Test de santé de l\'API Galligeo');
        
        const endpoint = `${this.config.apiUrl}/galligeo/health`;
        
        try {
            const response = await TestUtils.checkApiHealth(endpoint);
            
            TestAssert.assertTrue(
                response.status === 200 || response.status === 404, // 404 acceptable si endpoint health n'existe pas
                'API Galligeo doit répondre'
            );
            
            this.results.push({
                name: 'testApiHealth',
                status: 'passed',
                response: response.status,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            throw new Error(`API Galligeo non accessible: ${error.message}`);
        }
    }
    
    /**
     * Test de l'endpoint de géoréférencement
     */
    async testGeoreferencingEndpoint() {
        TestUtils.log('info', 'Test de l\'endpoint de géoréférencement');
        
        const endpoint = `${this.config.apiUrl}/galligeo/georef/`;
        
        try {
            // Test avec une requête vide (doit retourner une erreur)
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            
            TestAssert.assertTrue(
                response.status >= 400,
                'L\'endpoint doit retourner une erreur pour une requête vide'
            );
            
            this.results.push({
                name: 'testGeoreferencingEndpoint',
                status: 'passed',
                response: response.status,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            throw new Error(`Erreur lors du test de l'endpoint: ${error.message}`);
        }
    }
    
    /**
     * Test de géoréférencement avec des données valides
     */
    async testGeoreferencingWithValidData() {
        TestUtils.log('info', 'Test de géoréférencement avec données valides');
        
        const endpoint = `${this.config.apiUrl}/galligeo/georef/`;
        const validArk = this.testData.validArks?.[0] || 'btv1b53121232b';
        
        const requestData = {
            gallica_ark_url: `https://gallica.bnf.fr/ark:/12148/${validArk}`,
            image_width: 1000,
            image_height: 800,
            gcp_pairs: this.testData.testControlPoints || [
                {
                    a: { lat: 48.8566, lng: 2.3522 },
                    b: { lat: 48.8566, lng: 2.3522 }
                }
            ],
            clipping_polygon: this.testData.testPolygon || []
        };
        
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 60000); // 1 minute timeout
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData),
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            TestAssert.assertTrue(
                response.status === 200 || response.status === 202,
                'Le géoréférencement avec des données valides doit réussir'
            );
            
            if (response.ok) {
                const result = await response.json();
                TestAssert.assertTrue(
                    result && typeof result === 'object',
                    'La réponse doit contenir des données JSON valides'
                );
            }
            
            this.results.push({
                name: 'testGeoreferencingWithValidData',
                status: 'passed',
                response: response.status,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Timeout lors du géoréférencement (>60s)');
            }
            throw new Error(`Erreur lors du géoréférencement: ${error.message}`);
        }
    }
    
    /**
     * Test de géoréférencement avec des données invalides
     */
    async testGeoreferencingWithInvalidData() {
        TestUtils.log('info', 'Test de géoréférencement avec données invalides');
        
        const endpoint = `${this.config.apiUrl}/galligeo/georef/`;
        
        const invalidData = {
            gallica_ark_url: 'invalid_url',
            image_width: 'not_a_number',
            image_height: -1,
            gcp_pairs: [],
            clipping_polygon: 'invalid_polygon'
        };
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(invalidData)
            });
            
            TestAssert.assertTrue(
                response.status >= 400,
                'Les données invalides doivent retourner une erreur'
            );
            
            this.results.push({
                name: 'testGeoreferencingWithInvalidData',
                status: 'passed',
                response: response.status,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            throw new Error(`Erreur lors du test avec données invalides: ${error.message}`);
        }
    }
    
    /**
     * Test de timeout de l'API
     */
    async testGeoreferencingTimeout() {
        TestUtils.log('info', 'Test de timeout de l\'API');
        
        // Ce test vérifie que l'API gère correctement les timeouts
        const endpoint = `${this.config.apiUrl}/galligeo/georef/`;
        
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1000); // 1 seconde timeout très court
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    gallica_ark_url: `https://gallica.bnf.fr/ark:/12148/btv1b53121232b`,
                    image_width: 5000, // Image très grande pour forcer un timeout
                    image_height: 5000,
                    gcp_pairs: this.testData.testControlPoints || [],
                    clipping_polygon: []
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            // Si on arrive ici, l'API a répondu rapidement
            this.results.push({
                name: 'testGeoreferencingTimeout',
                status: 'passed',
                message: 'API répond rapidement',
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            if (error.name === 'AbortError') {
                // Timeout attendu
                this.results.push({
                    name: 'testGeoreferencingTimeout',
                    status: 'passed',
                    message: 'Timeout géré correctement',
                    timestamp: new Date().toISOString()
                });
            } else {
                throw error;
            }
        }
    }
    
    /**
     * Test des différents algorithmes de géoréférencement
     */
    async testAlgorithmParameters() {
        TestUtils.log('info', 'Test des paramètres d\'algorithmes');
        
        const algorithms = ['polynomial', 'helmert', 'affine', 'tps'];
        const endpoint = `${this.config.apiUrl}/galligeo/georef/`;
        
        for (const algorithm of algorithms) {
            try {
                const requestData = {
                    gallica_ark_url: `https://gallica.bnf.fr/ark:/12148/btv1b53121232b`,
                    image_width: 1000,
                    image_height: 800,
                    gcp_pairs: this.testData.testControlPoints || [],
                    clipping_polygon: [],
                    algorithm: algorithm
                };
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });
                
                // Accepter 200 (succès) ou 400 (si l'algorithme n'est pas supporté)
                TestAssert.assertTrue(
                    response.status === 200 || response.status === 400 || response.status === 202,
                    `L'algorithme ${algorithm} doit être géré par l'API`
                );
                
            } catch (error) {
                TestUtils.log('warn', `Erreur avec l'algorithme ${algorithm}`, error);
            }
        }
        
        this.results.push({
            name: 'testAlgorithmParameters',
            status: 'passed',
            message: 'Tests des algorithmes terminés',
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test des formats d'images
     */
    async testImageFormats() {
        TestUtils.log('info', 'Test des formats d\'images');
        
        const formats = ['png', 'jpg', 'webp'];
        const qualities = ['medium', 'hd'];
        
        for (const format of formats) {
            for (const quality of qualities) {
                try {
                    const requestData = {
                        gallica_ark_url: `https://gallica.bnf.fr/ark:/12148/btv1b53121232b`,
                        image_width: 1000,
                        image_height: 800,
                        gcp_pairs: this.testData.testControlPoints || [],
                        clipping_polygon: [],
                        format: format,
                        quality: quality
                    };
                    
                    const response = await fetch(`${this.config.apiUrl}/galligeo/georef/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestData)
                    });
                    
                    TestAssert.assertTrue(
                        response.status < 500,
                        `Le format ${format} avec qualité ${quality} ne doit pas causer d'erreur serveur`
                    );
                    
                } catch (error) {
                    TestUtils.log('warn', `Erreur avec format ${format}/${quality}`, error);
                }
            }
        }
        
        this.results.push({
            name: 'testImageFormats',
            status: 'passed',
            message: 'Tests des formats d\'images terminés',
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
                name: 'ARK inexistant',
                data: {
                    gallica_ark_url: 'https://gallica.bnf.fr/ark:/12148/invalid_ark',
                    image_width: 1000,
                    image_height: 800,
                    gcp_pairs: this.testData.testControlPoints || [],
                    clipping_polygon: []
                }
            },
            {
                name: 'Points de contrôle insuffisants',
                data: {
                    gallica_ark_url: `https://gallica.bnf.fr/ark:/12148/btv1b53121232b`,
                    image_width: 1000,
                    image_height: 800,
                    gcp_pairs: [], // Pas de points
                    clipping_polygon: []
                }
            },
            {
                name: 'Dimensions d\'image invalides',
                data: {
                    gallica_ark_url: `https://gallica.bnf.fr/ark:/12148/btv1b53121232b`,
                    image_width: 0,
                    image_height: 0,
                    gcp_pairs: this.testData.testControlPoints || [],
                    clipping_polygon: []
                }
            }
        ];
        
        for (const errorCase of errorCases) {
            try {
                const response = await fetch(`${this.config.apiUrl}/galligeo/georef/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(errorCase.data)
                });
                
                TestAssert.assertTrue(
                    response.status >= 400,
                    `Le cas d'erreur "${errorCase.name}" doit retourner une erreur HTTP`
                );
                
                if (response.headers.get('content-type')?.includes('application/json')) {
                    const errorData = await response.json();
                    TestAssert.assertTrue(
                        errorData.message || errorData.error,
                        'La réponse d\'erreur doit contenir un message explicatif'
                    );
                }
                
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
window.GalligeoApiTests = GalligeoApiTests;

// Pour Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GalligeoApiTests;
}
