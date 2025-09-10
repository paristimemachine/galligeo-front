/**
 * Utilitaires pour les tests Galligeo
 * Fonctions helper communes à tous les types de tests
 */

/**
 * Classe utilitaire pour les tests
 */
class TestUtils {
    
    /**
     * Attendre qu'un élément soit présent dans le DOM
     * @param {string} selector - Sélecteur CSS
     * @param {number} timeout - Timeout en ms
     * @returns {Promise<Element>}
     */
    static async waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkElement = () => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    reject(new Error(`Élément ${selector} non trouvé après ${timeout}ms`));
                    return;
                }
                
                requestAnimationFrame(checkElement);
            };
            
            checkElement();
        });
    }
    
    /**
     * Attendre qu'un élément disparaisse du DOM
     * @param {string} selector - Sélecteur CSS
     * @param {number} timeout - Timeout en ms
     * @returns {Promise<void>}
     */
    static async waitForElementToDisappear(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkElement = () => {
                const element = document.querySelector(selector);
                if (!element) {
                    resolve();
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    reject(new Error(`Élément ${selector} toujours présent après ${timeout}ms`));
                    return;
                }
                
                requestAnimationFrame(checkElement);
            };
            
            checkElement();
        });
    }
    
    /**
     * Simuler un clic sur un élément
     * @param {string|Element} elementOrSelector - Élément ou sélecteur
     */
    static click(elementOrSelector) {
        const element = typeof elementOrSelector === 'string' 
            ? document.querySelector(elementOrSelector)
            : elementOrSelector;
            
        if (!element) {
            throw new Error(`Élément non trouvé: ${elementOrSelector}`);
        }
        
        element.click();
    }
    
    /**
     * Simuler la saisie de texte dans un input
     * @param {string|Element} elementOrSelector - Élément ou sélecteur
     * @param {string} text - Texte à saisir
     */
    static type(elementOrSelector, text) {
        const element = typeof elementOrSelector === 'string' 
            ? document.querySelector(elementOrSelector)
            : elementOrSelector;
            
        if (!element) {
            throw new Error(`Élément non trouvé: ${elementOrSelector}`);
        }
        
        element.value = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    /**
     * Attendre un délai
     * @param {number} ms - Délai en millisecondes
     * @returns {Promise<void>}
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Créer des points de contrôle de test
     * @param {Array} points - Tableau de points {leftPoint, rightPoint}
     */
    static createTestControlPoints(points) {
        // Nettoyer les points existants
        if (window.pointPairs) {
            window.pointPairs.length = 0;
        } else {
            window.pointPairs = [];
        }
        
        points.forEach((point, index) => {
            const pointPair = {
                id: index + 1,
                leftPoint: {
                    lat: point.leftPoint.lat,
                    lng: point.leftPoint.lng,
                    marker: null
                },
                rightPoint: {
                    lat: point.rightPoint.lat,
                    lng: point.rightPoint.lng,
                    marker: null
                },
                isComplete: () => true
            };
            
            window.pointPairs.push(pointPair);
        });
        
        // Mettre à jour les données de géoréférencement
        if (typeof updateGeoreferencingData === 'function') {
            updateGeoreferencingData();
        }
    }
    
    /**
     * Vérifier l'état d'authentification
     * @returns {boolean}
     */
    static isAuthenticated() {
        return window.ptmAuth && window.ptmAuth.isAuthenticated();
    }
    
    /**
     * Simuler une connexion utilisateur de test
     */
    static async mockAuthentication() {
        if (window.ptmAuth) {
            // Simuler un token de test
            window.ptmAuth.token = 'test_token_123';
            window.ptmAuth.userInfo = {
                name: 'Test User',
                email: 'test@example.com',
                institution: 'Test Institution',
                orcid: '0000-0000-0000-0000'
            };
        }
    }
    
    /**
     * Vérifier qu'une API répond
     * @param {string} url - URL de l'API
     * @param {object} options - Options de la requête
     * @returns {Promise<Response>}
     */
    static async checkApiHealth(url, options = {}) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeout);
            return response;
        } catch (error) {
            clearTimeout(timeout);
            throw error;
        }
    }
    
    /**
     * Générer un rapport de test
     * @param {string} testName - Nom du test
     * @param {Array} results - Résultats des tests
     * @returns {object}
     */
    static generateReport(testName, results) {
        const passed = results.filter(r => r.status === 'passed').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const skipped = results.filter(r => r.status === 'skipped').length;
        
        return {
            testName,
            timestamp: new Date().toISOString(),
            summary: {
                total: results.length,
                passed,
                failed,
                skipped,
                passRate: results.length > 0 ? (passed / results.length * 100).toFixed(2) + '%' : '0%'
            },
            results,
            environment: window.GALLIGEO_TEST_CONFIG?.CURRENT_ENV || 'unknown'
        };
    }
    
    /**
     * Logger pour les tests
     * @param {string} level - Niveau de log (info, warn, error)
     * @param {string} message - Message
     * @param {object} data - Données additionnelles
     */
    static log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        switch (level) {
            case 'error':
                console.error(logMessage, data);
                break;
            case 'warn':
                console.warn(logMessage, data);
                break;
            default:
                console.log(logMessage, data);
        }
    }
    
    /**
     * Capturer une capture d'écran (si supporté)
     * @param {string} filename - Nom du fichier
     */
    static async takeScreenshot(filename) {
        if ('html2canvas' in window) {
            try {
                const canvas = await html2canvas(document.body);
                const link = document.createElement('a');
                link.download = filename;
                link.href = canvas.toDataURL();
                link.click();
            } catch (error) {
                this.log('warn', 'Impossible de prendre une capture d\'écran', error);
            }
        }
    }
    
    /**
     * Vérifier les performances d'une fonction
     * @param {Function} fn - Fonction à mesurer
     * @param {string} name - Nom de la mesure
     * @returns {Promise<any>}
     */
    static async measurePerformance(fn, name) {
        const startTime = performance.now();
        const result = await fn();
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.log('info', `Performance ${name}: ${duration.toFixed(2)}ms`);
        
        return {
            result,
            duration,
            name
        };
    }
    
    /**
     * Valider la structure d'un objet
     * @param {object} obj - Objet à valider
     * @param {object} schema - Schéma de validation
     * @returns {boolean}
     */
    static validateSchema(obj, schema) {
        for (const [key, type] of Object.entries(schema)) {
            if (!(key in obj)) {
                this.log('error', `Propriété manquante: ${key}`);
                return false;
            }
            
            if (typeof obj[key] !== type) {
                this.log('error', `Type incorrect pour ${key}: attendu ${type}, reçu ${typeof obj[key]}`);
                return false;
            }
        }
        
        return true;
    }
}

/**
 * Classe pour les assertions de test
 */
class TestAssert {
    
    static assertTrue(condition, message = 'Assertion failed') {
        if (!condition) {
            throw new Error(message);
        }
    }
    
    static assertFalse(condition, message = 'Assertion failed') {
        if (condition) {
            throw new Error(message);
        }
    }
    
    static assertEqual(actual, expected, message = 'Values are not equal') {
        if (actual !== expected) {
            throw new Error(`${message}. Expected: ${expected}, Actual: ${actual}`);
        }
    }
    
    static assertNotEqual(actual, expected, message = 'Values should not be equal') {
        if (actual === expected) {
            throw new Error(`${message}. Both values are: ${actual}`);
        }
    }
    
    static assertContains(container, item, message = 'Item not found in container') {
        if (!container.includes(item)) {
            throw new Error(`${message}. Container: ${container}, Item: ${item}`);
        }
    }
    
    static assertElementExists(selector, message = 'Element not found') {
        const element = document.querySelector(selector);
        if (!element) {
            throw new Error(`${message}. Selector: ${selector}`);
        }
        return element;
    }
    
    static assertElementVisible(selector, message = 'Element not visible') {
        const element = this.assertElementExists(selector, message);
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') {
            throw new Error(`${message}. Element is hidden. Selector: ${selector}`);
        }
        return element;
    }
    
    static async assertApiResponse(url, expectedStatus = 200, message = 'API response assertion failed') {
        try {
            const response = await TestUtils.checkApiHealth(url);
            if (response.status !== expectedStatus) {
                throw new Error(`${message}. Expected status: ${expectedStatus}, Actual: ${response.status}`);
            }
            return response;
        } catch (error) {
            throw new Error(`${message}. Error: ${error.message}`);
        }
    }
}

// Export pour utilisation globale
window.TestUtils = TestUtils;
window.TestAssert = TestAssert;

// Pour Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TestUtils, TestAssert };
}
