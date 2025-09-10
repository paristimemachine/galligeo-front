/**
 * Orchestrateur de tests Galligeo
 * Système d'exécution et de rapport des tests de non-régression
 */

class GalligeoTestRunner {
    
    constructor() {
        this.config = window.GALLIGEO_TEST_CONFIG || {};
        this.results = {
            summary: {},
            details: {},
            reports: [],
            startTime: null,
            endTime: null,
            duration: 0
        };
        this.isRunning = false;
    }
    
    /**
     * Exécuter tous les tests de régression
     */
    async runAllRegressionTests() {
        if (this.isRunning) {
            TestUtils.log('warning', 'Tests déjà en cours d\'exécution');
            return this.results;
        }
        
        this.isRunning = true;
        this.results.startTime = new Date();
        
        TestUtils.log('info', '🚀 Début de l\'exécution des tests de non-régression Galligeo');
        TestUtils.log('info', `Version: ${window.GALLIGEO_VERSION || 'unknown'}`);
        TestUtils.log('info', `Environnement: ${this.config.ENVIRONMENT || 'development'}`);
        
        try {
            // 1. Tests Backend/API
            await this.runBackendTests();
            
            // 2. Tests Frontend
            await this.runFrontendTests();
            
            // 3. Tests d'intégration
            await this.runIntegrationTests();
            
            // 4. Tests E2E (optionnels selon configuration)
            if (this.config.RUN_E2E_TESTS !== false) {
                await this.runE2ETests();
            }
            
            // 5. Génération du rapport final
            this.generateFinalReport();
            
        } catch (error) {
            TestUtils.log('error', 'Erreur durant l\'exécution des tests', error);
            this.results.error = error.message;
        } finally {
            this.results.endTime = new Date();
            this.results.duration = this.results.endTime - this.results.startTime;
            this.isRunning = false;
        }
        
        return this.results;
    }
    
    /**
     * Exécuter les tests backend/API
     */
    async runBackendTests() {
        TestUtils.log('info', '📡 Exécution des tests Backend/API');
        
        const backendResults = {
            galligeoAPI: null,
            ptmAuthAPI: null,
            tileServerAPI: null,
            passed: 0,
            failed: 0,
            total: 0
        };
        
        try {
            // Test de l'API Galligeo
            if (typeof window.GalligeoAPITests !== 'undefined') {
                const galligeoTests = new window.GalligeoAPITests();
                backendResults.galligeoAPI = await galligeoTests.runAllTests();
                TestUtils.log('info', '✅ Tests API Galligeo terminés');
            }
            
            // Test de l'API PTM Auth
            if (typeof window.PTMAuthAPITests !== 'undefined') {
                const authTests = new window.PTMAuthAPITests();
                backendResults.ptmAuthAPI = await authTests.runAllTests();
                TestUtils.log('info', '✅ Tests API PTM Auth terminés');
            }
            
            // Test du serveur de tuiles
            if (typeof window.TileServerTests !== 'undefined') {
                const tileTests = new window.TileServerTests();
                backendResults.tileServerAPI = await tileTests.runAllTests();
                TestUtils.log('info', '✅ Tests Tile Server terminés');
            }
            
            // Compilation des résultats
            this.compileTestResults(backendResults, 'backend');
            
        } catch (error) {
            TestUtils.log('error', 'Erreur lors des tests backend', error);
            backendResults.error = error.message;
        }
        
        this.results.details.backend = backendResults;
    }
    
    /**
     * Exécuter les tests frontend
     */
    async runFrontendTests() {
        TestUtils.log('info', '🎨 Exécution des tests Frontend');
        
        const frontendResults = {
            georeferencing: null,
            authentication: null,
            settingsManager: null,
            passed: 0,
            failed: 0,
            total: 0
        };
        
        try {
            // Test de l'interface de géoréférencement
            if (typeof window.GeoreferencingInterfaceTests !== 'undefined') {
                const georefTests = new window.GeoreferencingInterfaceTests();
                frontendResults.georeferencing = await georefTests.runAllTests();
                TestUtils.log('info', '✅ Tests interface géoréférencement terminés');
            }
            
            // Test de l'authentification
            if (typeof window.AuthenticationTests !== 'undefined') {
                const authTests = new window.AuthenticationTests();
                frontendResults.authentication = await authTests.runAllTests();
                TestUtils.log('info', '✅ Tests authentification terminés');
            }
            
            // Test du gestionnaire de paramètres
            if (typeof window.SettingsManagerTests !== 'undefined') {
                const settingsTests = new window.SettingsManagerTests();
                frontendResults.settingsManager = await settingsTests.runAllTests();
                TestUtils.log('info', '✅ Tests gestionnaire paramètres terminés');
            }
            
            // Compilation des résultats
            this.compileTestResults(frontendResults, 'frontend');
            
        } catch (error) {
            TestUtils.log('error', 'Erreur lors des tests frontend', error);
            frontendResults.error = error.message;
        }
        
        this.results.details.frontend = frontendResults;
    }
    
    /**
     * Exécuter les tests d'intégration
     */
    async runIntegrationTests() {
        TestUtils.log('info', '🔗 Exécution des tests d\'intégration');
        
        const integrationResults = {
            workflows: null,
            passed: 0,
            failed: 0,
            total: 0
        };
        
        try {
            if (typeof window.IntegrationTests !== 'undefined') {
                const integrationTests = new window.IntegrationTests();
                integrationResults.workflows = await integrationTests.runAllTests();
                TestUtils.log('info', '✅ Tests d\'intégration terminés');
            }
            
            this.compileTestResults(integrationResults, 'integration');
            
        } catch (error) {
            TestUtils.log('error', 'Erreur lors des tests d\'intégration', error);
            integrationResults.error = error.message;
        }
        
        this.results.details.integration = integrationResults;
    }
    
    /**
     * Exécuter les tests E2E
     */
    async runE2ETests() {
        TestUtils.log('info', '🎭 Exécution des tests End-to-End');
        
        const e2eResults = {
            userScenarios: null,
            passed: 0,
            failed: 0,
            total: 0
        };
        
        try {
            if (typeof window.E2ETests !== 'undefined') {
                const e2eTests = new window.E2ETests();
                e2eResults.userScenarios = await e2eTests.runAllTests();
                TestUtils.log('info', '✅ Tests E2E terminés');
            }
            
            this.compileTestResults(e2eResults, 'e2e');
            
        } catch (error) {
            TestUtils.log('error', 'Erreur lors des tests E2E', error);
            e2eResults.error = error.message;
        }
        
        this.results.details.e2e = e2eResults;
    }
    
    /**
     * Compiler les résultats d'une catégorie de tests
     */
    compileTestResults(categoryResults, categoryName) {
        let totalPassed = 0;
        let totalFailed = 0;
        let totalTests = 0;
        
        for (const [key, value] of Object.entries(categoryResults)) {
            if (value && typeof value === 'object' && value.summary) {
                totalPassed += value.summary.passed || 0;
                totalFailed += value.summary.failed || 0;
                totalTests += value.summary.total || 0;
            }
        }
        
        categoryResults.passed = totalPassed;
        categoryResults.failed = totalFailed;
        categoryResults.total = totalTests;
        categoryResults.successRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(2) : 0;
        
        TestUtils.log('info', 
            `📊 ${categoryName}: ${totalPassed}/${totalTests} tests réussis (${categoryResults.successRate}%)`
        );
    }
    
    /**
     * Générer le rapport final
     */
    generateFinalReport() {
        TestUtils.log('info', '📋 Génération du rapport final');
        
        // Calculs globaux
        let totalPassed = 0;
        let totalFailed = 0;
        let totalTests = 0;
        let categoriesWithErrors = [];
        
        for (const [category, results] of Object.entries(this.results.details)) {
            if (results) {
                totalPassed += results.passed || 0;
                totalFailed += results.failed || 0;
                totalTests += results.total || 0;
                
                if (results.error) {
                    categoriesWithErrors.push(category);
                }
            }
        }
        
        const globalSuccessRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(2) : 0;
        
        this.results.summary = {
            total: totalTests,
            passed: totalPassed,
            failed: totalFailed,
            successRate: globalSuccessRate,
            duration: this.results.duration,
            categoriesWithErrors,
            timestamp: new Date().toISOString()
        };
        
        // Génération du rapport HTML
        this.generateHTMLReport();
        
        // Génération du rapport JSON
        this.generateJSONReport();
        
        // Log du résumé
        this.logFinalSummary();
    }
    
    /**
     * Générer le rapport HTML
     */
    generateHTMLReport() {
        const reportHTML = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport de Tests Galligeo - ${new Date().toLocaleDateString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; }
        .card.success { border-left-color: #28a745; }
        .card.warning { border-left-color: #ffc107; }
        .card.danger { border-left-color: #dc3545; }
        .metric { font-size: 2em; font-weight: bold; color: #007bff; }
        .details { margin-top: 20px; }
        .category { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .category-header { background: #007bff; color: white; padding: 10px; font-weight: bold; }
        .category-content { padding: 15px; }
        .test-result { margin: 5px 0; padding: 5px; border-radius: 4px; }
        .test-passed { background: #d4edda; color: #155724; }
        .test-failed { background: #f8d7da; color: #721c24; }
        .test-skipped { background: #fff3cd; color: #856404; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f8f9fa; }
        .timestamp { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Rapport de Tests de Non-Régression</h1>
            <h2>Galligeo - ${new Date().toLocaleDateString('fr-FR')}</h2>
        </div>
        
        <div class="summary">
            <div class="card ${this.results.summary.successRate >= 90 ? 'success' : this.results.summary.successRate >= 70 ? 'warning' : 'danger'}">
                <h3>Taux de Réussite Global</h3>
                <div class="metric">${this.results.summary.successRate}%</div>
            </div>
            <div class="card">
                <h3>Tests Exécutés</h3>
                <div class="metric">${this.results.summary.total}</div>
            </div>
            <div class="card success">
                <h3>Tests Réussis</h3>
                <div class="metric">${this.results.summary.passed}</div>
            </div>
            <div class="card ${this.results.summary.failed > 0 ? 'danger' : ''}">
                <h3>Tests Échoués</h3>
                <div class="metric">${this.results.summary.failed}</div>
            </div>
            <div class="card">
                <h3>Durée d'Exécution</h3>
                <div class="metric">${Math.round(this.results.summary.duration / 1000)}s</div>
            </div>
        </div>
        
        <div class="details">
            ${this.generateCategoryReportsHTML()}
        </div>
        
        <div class="timestamp">
            Rapport généré le ${new Date().toLocaleString('fr-FR')}
        </div>
    </div>
</body>
</html>`;
        
        // Sauvegarder le rapport HTML
        const blob = new Blob([reportHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `galligeo-test-report-${new Date().toISOString().split('T')[0]}.html`;
        
        // Ajouter le lien de téléchargement à la page
        const downloadSection = document.createElement('div');
        downloadSection.innerHTML = `
            <div style="margin: 20px 0; padding: 15px; background: #e7f3ff; border-radius: 8px;">
                <h4>📥 Télécharger le Rapport</h4>
                <a href="${url}" download="${a.download}" style="color: #007bff; text-decoration: none;">
                    📄 ${a.download}
                </a>
            </div>
        `;
        
        document.body.appendChild(downloadSection);
    }
    
    /**
     * Générer les rapports HTML par catégorie
     */
    generateCategoryReportsHTML() {
        let html = '';
        
        for (const [category, results] of Object.entries(this.results.details)) {
            if (!results) continue;
            
            html += `
            <div class="category">
                <div class="category-header">
                    ${this.getCategoryIcon(category)} ${this.getCategoryTitle(category)}
                    (${results.passed}/${results.total} - ${results.successRate}%)
                </div>
                <div class="category-content">
                    ${this.generateCategoryContentHTML(results)}
                </div>
            </div>`;
        }
        
        return html;
    }
    
    /**
     * Obtenir l'icône d'une catégorie
     */
    getCategoryIcon(category) {
        const icons = {
            backend: '📡',
            frontend: '🎨',
            integration: '🔗',
            e2e: '🎭'
        };
        return icons[category] || '🧪';
    }
    
    /**
     * Obtenir le titre d'une catégorie
     */
    getCategoryTitle(category) {
        const titles = {
            backend: 'Tests Backend/API',
            frontend: 'Tests Frontend',
            integration: 'Tests d\'Intégration',
            e2e: 'Tests End-to-End'
        };
        return titles[category] || category;
    }
    
    /**
     * Générer le contenu HTML d'une catégorie
     */
    generateCategoryContentHTML(results) {
        let html = '';
        
        for (const [key, value] of Object.entries(results)) {
            if (value && typeof value === 'object' && value.summary && value.results) {
                html += `
                <h4>${key}</h4>
                <div>
                    ${value.results.map(result => `
                        <div class="test-result test-${result.status || 'unknown'}">
                            ${result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️'} 
                            ${result.name || 'Test sans nom'}
                            ${result.error ? ` - ${result.error}` : ''}
                        </div>
                    `).join('')}
                </div>`;
            }
        }
        
        return html;
    }
    
    /**
     * Générer le rapport JSON
     */
    generateJSONReport() {
        const jsonReport = JSON.stringify(this.results, null, 2);
        
        // Sauvegarder dans localStorage pour référence
        localStorage.setItem('galligeo_test_results', jsonReport);
        
        // Créer un fichier téléchargeable
        const blob = new Blob([jsonReport], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `galligeo-test-results-${new Date().toISOString().split('T')[0]}.json`;
        
        TestUtils.log('info', `📄 Rapport JSON sauvegardé: ${a.download}`);
    }
    
    /**
     * Afficher le résumé final dans la console
     */
    logFinalSummary() {
        const { summary } = this.results;
        
        console.log('\n' + '='.repeat(80));
        console.log('🎯 RÉSUMÉ FINAL DES TESTS DE NON-RÉGRESSION GALLIGEO');
        console.log('='.repeat(80));
        console.log(`📊 Tests exécutés: ${summary.total}`);
        console.log(`✅ Tests réussis: ${summary.passed}`);
        console.log(`❌ Tests échoués: ${summary.failed}`);
        console.log(`📈 Taux de réussite: ${summary.successRate}%`);
        console.log(`⏱️ Durée: ${Math.round(summary.duration / 1000)}s`);
        
        if (summary.categoriesWithErrors.length > 0) {
            console.log(`⚠️ Catégories avec erreurs: ${summary.categoriesWithErrors.join(', ')}`);
        }
        
        console.log(`🕐 Terminé le: ${new Date().toLocaleString('fr-FR')}`);
        console.log('='.repeat(80));
        
        // Recommandations
        if (summary.successRate < 70) {
            console.log('🚨 ATTENTION: Taux de réussite faible, vérification nécessaire avant déploiement');
        } else if (summary.successRate < 90) {
            console.log('⚠️ AVERTISSEMENT: Quelques tests échouent, investigation recommandée');
        } else {
            console.log('🎉 EXCELLENT: Tous les tests passent, prêt pour le déploiement');
        }
    }
    
    /**
     * Exécuter uniquement une catégorie de tests
     */
    async runSpecificCategory(category) {
        TestUtils.log('info', `🎯 Exécution des tests: ${category}`);
        
        switch (category) {
            case 'backend':
                await this.runBackendTests();
                break;
            case 'frontend':
                await this.runFrontendTests();
                break;
            case 'integration':
                await this.runIntegrationTests();
                break;
            case 'e2e':
                await this.runE2ETests();
                break;
            default:
                throw new Error(`Catégorie de tests inconnue: ${category}`);
        }
        
        return this.results.details[category];
    }
}

// Export pour utilisation globale
window.GalligeoTestRunner = GalligeoTestRunner;

// Pour Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GalligeoTestRunner;
}
