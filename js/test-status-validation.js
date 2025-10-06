/**
 * Tests de validation des statuts
 * 
 * Ce script teste la validation stricte des statuts implémentée dans ptm-auth.js
 * pour s'assurer qu'aucun statut vide ne peut être créé.
 */

window.testStatusValidation = {
    /**
     * Teste que les statuts valides sont acceptés
     */
    async testValidStatuses() {
        console.log('🧪 TEST: Statuts valides');
        console.log('─'.repeat(50));
        
        const validStatuses = ['en-cours', 'georeferenced', 'deposee'];
        const testArk = 'test_' + Date.now();
        
        for (const status of validStatuses) {
            try {
                console.log(`\n  Testing status: "${status}"`);
                
                // Tenter de sauvegarder avec ce statut
                await window.ptmAuth.saveMapStatus(testArk, status, {
                    quality: 2
                });
                
                console.log(`  ✅ Statut "${status}" accepté`);
                
            } catch (error) {
                console.error(`  ❌ Statut "${status}" rejeté (ne devrait pas arriver):`, error.message);
                return false;
            }
        }
        
        console.log('\n✅ Tous les statuts valides sont acceptés');
        return true;
    },
    
    /**
     * Teste que les statuts invalides sont rejetés
     */
    async testInvalidStatuses() {
        console.log('\n🧪 TEST: Statuts invalides (doivent être rejetés)');
        console.log('─'.repeat(50));
        
        const invalidStatuses = [
            undefined,      // Non défini
            null,          // Null
            '',            // Chaîne vide
            {},            // Objet vide
            'invalid',     // Statut non reconnu
            'worked',      // Ancien statut (plus valide)
            'GEOREFERENCED', // Mauvaise casse
            123,           // Nombre
            true           // Booléen
        ];
        
        const testArk = 'test_' + Date.now();
        let allRejected = true;
        
        for (const status of invalidStatuses) {
            try {
                console.log(`\n  Testing invalid status: ${JSON.stringify(status)}`);
                
                // Tenter de sauvegarder avec ce statut invalide
                await window.ptmAuth.saveMapStatus(testArk, status, {
                    quality: 2
                });
                
                // Si on arrive ici, c'est que la validation n'a pas fonctionné
                console.error(`  ❌ Statut ${JSON.stringify(status)} accepté (ne devrait PAS être accepté)`);
                allRejected = false;
                
            } catch (error) {
                // C'est le comportement attendu
                console.log(`  ✅ Statut ${JSON.stringify(status)} rejeté correctement`);
                console.log(`     Message: ${error.message}`);
            }
        }
        
        if (allRejected) {
            console.log('\n✅ Tous les statuts invalides sont correctement rejetés');
        } else {
            console.log('\n❌ Certains statuts invalides ont été acceptés');
        }
        
        return allRejected;
    },
    
    /**
     * Teste l'ordre des paramètres dans updateWorkedMap
     */
    async testParameterOrder() {
        console.log('\n🧪 TEST: Ordre des paramètres dans updateWorkedMap');
        console.log('─'.repeat(50));
        
        const testArk = 'test_order_' + Date.now();
        
        try {
            // Test avec le bon ordre: (arkId, status, additionalData)
            console.log('\n  Test avec bon ordre: updateWorkedMap(arkId, "en-cours", {quality: 3})');
            await window.ptmAuth.updateWorkedMap(testArk, 'en-cours', { quality: 3 });
            console.log('  ✅ Bon ordre accepté');
            
            // Vérifier que les données sont bien enregistrées
            const data = await window.ptmAuth.getGalligeoData();
            const savedMap = data.rec_ark.find(m => m.ark === testArk);
            
            if (savedMap && savedMap.status === 'en-cours' && savedMap.quality === 3) {
                console.log('  ✅ Données correctement enregistrées');
                console.log(`     status: ${JSON.stringify(savedMap.status)} (type: ${typeof savedMap.status})`);
                console.log(`     quality: ${savedMap.quality}`);
                return true;
            } else {
                console.error('  ❌ Données incorrectes:', savedMap);
                return false;
            }
            
        } catch (error) {
            console.error('  ❌ Erreur:', error.message);
            return false;
        }
    },
    
    /**
     * Exécute tous les tests
     */
    async runAllTests() {
        console.clear();
        console.log('═'.repeat(60));
        console.log('  SUITE DE TESTS - Validation des statuts');
        console.log('═'.repeat(60));
        
        if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
            console.error('❌ Vous devez être connecté pour exécuter les tests');
            alert('Veuillez vous connecter avec ORCID pour exécuter les tests.');
            return;
        }
        
        let allPassed = true;
        
        // Test 1: Statuts valides
        const test1 = await this.testValidStatuses();
        allPassed = allPassed && test1;
        
        // Test 2: Statuts invalides
        const test2 = await this.testInvalidStatuses();
        allPassed = allPassed && test2;
        
        // Test 3: Ordre des paramètres
        const test3 = await this.testParameterOrder();
        allPassed = allPassed && test3;
        
        // Résumé
        console.log('\n' + '═'.repeat(60));
        console.log('  RÉSUMÉ DES TESTS');
        console.log('═'.repeat(60));
        console.log(`  Test 1 (Statuts valides):     ${test1 ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`  Test 2 (Statuts invalides):   ${test2 ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`  Test 3 (Ordre paramètres):    ${test3 ? '✅ PASS' : '❌ FAIL'}`);
        console.log('═'.repeat(60));
        
        if (allPassed) {
            console.log('✅ TOUS LES TESTS SONT PASSÉS');
        } else {
            console.log('❌ CERTAINS TESTS ONT ÉCHOUÉ');
        }
        console.log('═'.repeat(60));
        
        return allPassed;
    }
};

// Exposer la fonction de test pour un accès facile
window.testStatus = window.testStatusValidation.runAllTests.bind(window.testStatusValidation);

console.log('📦 Script test-status-validation.js chargé');
console.log('💡 Pour exécuter les tests: await window.testStatus()');
