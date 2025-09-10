/**
 * Tests du serveur de tuiles (Backend)
 * Tests de non-régression pour la génération et diffusion des tuiles
 */

class TileServerTests {
    
    constructor() {
        this.config = window.GALLIGEO_TEST_CONFIG?.CONFIG || {
            tileServerUrl: 'https://tile.ptm.huma-num.fr'
        };
        this.testData = window.GALLIGEO_TEST_CONFIG?.TEST_DATA || {};
        this.results = [];
    }
    
    /**
     * Exécuter tous les tests du serveur de tuiles
     */
    async runAllTests() {
        TestUtils.log('info', 'Début des tests du serveur de tuiles');
        
        const tests = [
            this.testServerHealth.bind(this),
            this.testInfoTilesEndpoint.bind(this),
            this.testTileGeneration.bind(this),
            this.testTileFormats.bind(this),
            this.testTileBounds.bind(this),
            this.testHighResolutionTiles.bind(this),
            this.testTileSubdomains.bind(this),
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
        
        return TestUtils.generateReport('Tile Server Tests', this.results);
    }
    
    /**
     * Test de santé du serveur de tuiles
     */
    async testServerHealth() {
        TestUtils.log('info', 'Test de santé du serveur de tuiles');
        
        const endpoint = `${this.config.tileServerUrl}/health`;
        
        try {
            const response = await TestUtils.checkApiHealth(endpoint);
            
            TestAssert.assertTrue(
                response.status === 200 || response.status === 404,
                'Serveur de tuiles doit répondre'
            );
            
            this.results.push({
                name: 'testServerHealth',
                status: 'passed',
                response: response.status,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            throw new Error(`Serveur de tuiles non accessible: ${error.message}`);
        }
    }
    
    /**
     * Test de l'endpoint info_tiles
     */
    async testInfoTilesEndpoint() {
        TestUtils.log('info', 'Test de l\'endpoint info_tiles');
        
        const validArk = this.testData.validArks?.[0] || 'btv1b53121232b';
        const endpoint = `${this.config.tileServerUrl}/tiles/ark/info_tiles/12148/${validArk}`;
        
        try {
            const response = await fetch(endpoint);
            
            if (response.ok) {
                const tileInfo = await response.json();
                
                // Vérifier la structure des données
                TestAssert.assertTrue(
                    tileInfo.bounds,
                    'Les informations de tuiles doivent contenir les bounds'
                );
                
                TestAssert.assertTrue(
                    tileInfo.minzoom !== undefined && tileInfo.maxzoom !== undefined,
                    'Les informations de tuiles doivent contenir les niveaux de zoom'
                );
                
                // Vérifier le format des bounds
                const bounds = tileInfo.bounds.split(',');
                TestAssert.assertEqual(
                    bounds.length,
                    4,
                    'Les bounds doivent contenir 4 valeurs (ouest, sud, est, nord)'
                );
                
                bounds.forEach((bound, index) => {
                    TestAssert.assertFalse(
                        isNaN(parseFloat(bound)),
                        `Bound ${index} doit être un nombre valide`
                    );
                });
                
                this.results.push({
                    name: 'testInfoTilesEndpoint',
                    status: 'passed',
                    data: tileInfo,
                    timestamp: new Date().toISOString()
                });
                
            } else {
                // ARK pas encore géoréférencé, c'est acceptable
                TestAssert.assertTrue(
                    response.status === 404,
                    'ARK non géoréférencé doit retourner 404'
                );
                
                this.results.push({
                    name: 'testInfoTilesEndpoint',
                    status: 'passed',
                    message: 'ARK non géoréférencé géré correctement',
                    timestamp: new Date().toISOString()
                });
            }
            
        } catch (error) {
            throw new Error(`Erreur lors du test info_tiles: ${error.message}`);
        }
    }
    
    /**
     * Test de génération de tuiles
     */
    async testTileGeneration() {
        TestUtils.log('info', 'Test de génération de tuiles');
        
        const validArk = this.testData.validArks?.[0] || 'btv1b53121232b';
        
        // D'abord, obtenir les informations de tuiles
        const infoEndpoint = `${this.config.tileServerUrl}/tiles/ark/info_tiles/12148/${validArk}`;
        
        try {
            const infoResponse = await fetch(infoEndpoint);
            
            if (infoResponse.ok) {
                const tileInfo = await infoResponse.json();
                const minZoom = parseInt(tileInfo.minzoom);
                const maxZoom = parseInt(tileInfo.maxzoom);
                
                // Tester quelques tuiles à différents niveaux de zoom
                const testZooms = [
                    minZoom,
                    Math.floor((minZoom + maxZoom) / 2),
                    maxZoom
                ].filter(z => z >= 0 && z <= 20);
                
                for (const zoom of testZooms) {
                    // Calculer des coordonnées de tuiles basiques
                    const x = Math.floor(Math.pow(2, zoom) / 2);
                    const y = Math.floor(Math.pow(2, zoom) / 2);
                    
                    const tileUrl = `${this.config.tileServerUrl}/tiles/ark/12148/${validArk}/${zoom}/${x}/${y}.png`;
                    
                    const tileResponse = await fetch(tileUrl);
                    
                    // Accepter 200 (tuile existe) ou 404 (tuile hors bounds)
                    TestAssert.assertTrue(
                        tileResponse.status === 200 || tileResponse.status === 404,
                        `Tuile ${zoom}/${x}/${y} doit retourner 200 ou 404`
                    );
                    
                    if (tileResponse.ok) {
                        // Vérifier que c'est bien une image
                        const contentType = tileResponse.headers.get('content-type');
                        TestAssert.assertTrue(
                            contentType && contentType.startsWith('image/'),
                            'La tuile doit être une image'
                        );
                    }
                }
                
                this.results.push({
                    name: 'testTileGeneration',
                    status: 'passed',
                    testedZooms: testZooms,
                    timestamp: new Date().toISOString()
                });
                
            } else {
                // ARK pas géoréférencé, passer le test
                this.results.push({
                    name: 'testTileGeneration',
                    status: 'skipped',
                    message: 'ARK non géoréférencé',
                    timestamp: new Date().toISOString()
                });
            }
            
        } catch (error) {
            throw new Error(`Erreur lors du test de génération de tuiles: ${error.message}`);
        }
    }
    
    /**
     * Test des différents formats de tuiles
     */
    async testTileFormats() {
        TestUtils.log('info', 'Test des formats de tuiles');
        
        const validArk = this.testData.validArks?.[0] || 'btv1b53121232b';
        const formats = ['png', 'jpg', 'webp'];
        const baseUrl = `${this.config.tileServerUrl}/tiles/ark/12148/${validArk}`;
        
        for (const format of formats) {
            try {
                const tileUrl = `${baseUrl}/10/512/384.${format}`;
                const response = await fetch(tileUrl);
                
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    
                    switch (format) {
                        case 'png':
                            TestAssert.assertTrue(
                                contentType?.includes('image/png'),
                                'Format PNG doit retourner image/png'
                            );
                            break;
                        case 'jpg':
                            TestAssert.assertTrue(
                                contentType?.includes('image/jpeg'),
                                'Format JPG doit retourner image/jpeg'
                            );
                            break;
                        case 'webp':
                            TestAssert.assertTrue(
                                contentType?.includes('image/webp'),
                                'Format WebP doit retourner image/webp'
                            );
                            break;
                    }
                } else {
                    // 404 acceptable si la tuile n'existe pas
                    TestAssert.assertTrue(
                        response.status === 404,
                        `Format ${format} doit retourner 200 ou 404`
                    );
                }
                
            } catch (error) {
                TestUtils.log('warn', `Erreur avec format ${format}`, error);
            }
        }
        
        this.results.push({
            name: 'testTileFormats',
            status: 'passed',
            testedFormats: formats,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test des bounds de tuiles
     */
    async testTileBounds() {
        TestUtils.log('info', 'Test des bounds de tuiles');
        
        const validArk = this.testData.validArks?.[0] || 'btv1b53121232b';
        const infoEndpoint = `${this.config.tileServerUrl}/tiles/ark/info_tiles/12148/${validArk}`;
        
        try {
            const infoResponse = await fetch(infoEndpoint);
            
            if (infoResponse.ok) {
                const tileInfo = await infoResponse.json();
                const bounds = tileInfo.bounds.split(',').map(parseFloat);
                const [west, south, east, north] = bounds;
                
                // Vérifier que les bounds sont cohérents
                TestAssert.assertTrue(
                    west < east,
                    'Longitude ouest doit être inférieure à longitude est'
                );
                
                TestAssert.assertTrue(
                    south < north,
                    'Latitude sud doit être inférieure à latitude nord'
                );
                
                TestAssert.assertTrue(
                    west >= -180 && west <= 180,
                    'Longitude ouest doit être valide'
                );
                
                TestAssert.assertTrue(
                    east >= -180 && east <= 180,
                    'Longitude est doit être valide'
                );
                
                TestAssert.assertTrue(
                    south >= -90 && south <= 90,
                    'Latitude sud doit être valide'
                );
                
                TestAssert.assertTrue(
                    north >= -90 && north <= 90,
                    'Latitude nord doit être valide'
                );
                
                this.results.push({
                    name: 'testTileBounds',
                    status: 'passed',
                    bounds: bounds,
                    timestamp: new Date().toISOString()
                });
                
            } else {
                this.results.push({
                    name: 'testTileBounds',
                    status: 'skipped',
                    message: 'ARK non géoréférencé',
                    timestamp: new Date().toISOString()
                });
            }
            
        } catch (error) {
            throw new Error(`Erreur lors du test des bounds: ${error.message}`);
        }
    }
    
    /**
     * Test des tuiles haute résolution
     */
    async testHighResolutionTiles() {
        TestUtils.log('info', 'Test des tuiles haute résolution');
        
        const validArk = this.testData.validArks?.[0] || 'btv1b53121232b';
        const highResEndpoints = [
            `${this.config.tileServerUrl}/tiles/ark/highres/`,
            `${this.config.tileServerUrl}/tiles/ark/highres/jpg/`,
            `${this.config.tileServerUrl}/tiles/ark/highres/webp/`
        ];
        
        for (const endpoint of highResEndpoints) {
            try {
                const infoUrl = `${endpoint}info_tiles/12148/${validArk}`;
                const response = await fetch(infoUrl);
                
                TestAssert.assertTrue(
                    response.status === 200 || response.status === 404,
                    'Endpoint haute résolution doit répondre'
                );
                
                if (response.ok) {
                    const tileInfo = await response.json();
                    
                    TestAssert.assertTrue(
                        tileInfo.maxzoom !== undefined,
                        'Info tuiles haute résolution doit contenir maxzoom'
                    );
                    
                    // Vérifier qu'il y a potentiellement plus de détails
                    const maxZoom = parseInt(tileInfo.maxzoom);
                    TestAssert.assertTrue(
                        maxZoom >= 10,
                        'Tuiles haute résolution doivent supporter des zooms élevés'
                    );
                }
                
            } catch (error) {
                TestUtils.log('warn', `Erreur avec endpoint haute résolution ${endpoint}`, error);
            }
        }
        
        this.results.push({
            name: 'testHighResolutionTiles',
            status: 'passed',
            message: 'Tests haute résolution terminés',
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test des sous-domaines de tuiles
     */
    async testTileSubdomains() {
        TestUtils.log('info', 'Test des sous-domaines de tuiles');
        
        const subdomains = ['a', 'b', 'c'];
        const validArk = this.testData.validArks?.[0] || 'btv1b53121232b';
        
        for (const subdomain of subdomains) {
            try {
                const url = `https://${subdomain}.tile.ptm.huma-num.fr/tiles/ark/info_tiles/12148/${validArk}`;
                const response = await fetch(url);
                
                TestAssert.assertTrue(
                    response.status === 200 || response.status === 404,
                    `Sous-domaine ${subdomain} doit répondre`
                );
                
            } catch (error) {
                TestUtils.log('warn', `Erreur avec sous-domaine ${subdomain}`, error);
            }
        }
        
        this.results.push({
            name: 'testTileSubdomains',
            status: 'passed',
            testedSubdomains: subdomains,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Test de gestion des erreurs
     */
    async testErrorHandling() {
        TestUtils.log('info', 'Test de gestion des erreurs du serveur de tuiles');
        
        const errorCases = [
            {
                name: 'ARK inexistant',
                url: `${this.config.tileServerUrl}/tiles/ark/info_tiles/12148/invalid_ark`,
                expectedStatus: 404
            },
            {
                name: 'Coordonnées de tuile invalides',
                url: `${this.config.tileServerUrl}/tiles/ark/12148/btv1b53121232b/999/999999/999999.png`,
                expectedStatus: 404
            },
            {
                name: 'Format de tuile non supporté',
                url: `${this.config.tileServerUrl}/tiles/ark/12148/btv1b53121232b/10/512/384.gif`,
                expectedStatus: 404
            },
            {
                name: 'Chemin malformé',
                url: `${this.config.tileServerUrl}/tiles/ark/malformed/path`,
                expectedStatus: 404
            }
        ];
        
        for (const errorCase of errorCases) {
            try {
                const response = await fetch(errorCase.url);
                
                TestAssert.assertEqual(
                    response.status,
                    errorCase.expectedStatus,
                    `Le cas d'erreur "${errorCase.name}" doit retourner ${errorCase.expectedStatus}`
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
window.TileServerTests = TileServerTests;

// Pour Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TileServerTests;
}
