/**
 * Tests de validation du statut lors du dépôt sur Nakala
 * 
 * Ce script teste que le statut 'deposee' et le DOI sont correctement
 * sauvegardés lors d'un dépôt sur Nakala.
 */

window.testNakalaDepositStatus = {
    /**
     * Teste que le statut 'deposee' avec DOI est correctement sauvegardé
     */
    async testDepositStatus() {
        console.log('🧪 TEST: Statut dépôt Nakala avec DOI');
        console.log('─'.repeat(50));
        
        if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
            console.error('❌ Vous devez être connecté pour exécuter ce test');
            alert('Veuillez vous connecter avec ORCID pour exécuter ce test.');
            return false;
        }
        
        const testArk = 'test_nakala_deposit_' + Date.now();
        const testDoi = '10.34847/nkl.test' + Date.now();
        
        try {
            console.log(`\n1️⃣ Création d'une carte de test avec statut "en-cours"`);
            await window.ptmAuth.saveMapStatus(testArk, 'en-cours', {
                quality: 2
            });
            console.log('   ✅ Carte créée avec statut "en-cours"');
            
            console.log(`\n2️⃣ Simulation géoréférencement -> statut "georeferenced"`);
            await window.ptmAuth.saveMapStatus(testArk, 'georeferenced', {
                quality: 3
            });
            console.log('   ✅ Statut mis à jour vers "georeferenced"');
            
            console.log(`\n3️⃣ Simulation dépôt Nakala -> statut "deposee" avec DOI`);
            await window.ptmAuth.saveMapStatus(testArk, 'deposee', {
                doi: testDoi,
                quality: 3
            });
            console.log('   ✅ Statut mis à jour vers "deposee" avec DOI');
            
            console.log(`\n4️⃣ Vérification de la sauvegarde`);
            const data = await window.ptmAuth.getGalligeoData();
            const savedMap = data.rec_ark.find(m => m.ark === testArk);
            
            if (!savedMap) {
                console.error('   ❌ Carte non trouvée dans les données sauvegardées');
                return false;
            }
            
            console.log('   Données sauvegardées:', JSON.stringify(savedMap, null, 2));
            
            // Vérifications
            const checks = [
                {
                    name: 'Statut est "deposee"',
                    test: savedMap.status === 'deposee',
                    actual: savedMap.status
                },
                {
                    name: 'DOI est présent',
                    test: !!savedMap.doi,
                    actual: savedMap.doi
                },
                {
                    name: 'DOI correspond au test',
                    test: savedMap.doi === testDoi,
                    actual: savedMap.doi
                },
                {
                    name: 'Quality est conservée',
                    test: savedMap.quality === 3,
                    actual: savedMap.quality
                }
            ];
            
            let allPassed = true;
            console.log('\n   Vérifications:');
            checks.forEach(check => {
                const icon = check.test ? '✅' : '❌';
                console.log(`   ${icon} ${check.name}: ${check.actual}`);
                if (!check.test) allPassed = false;
            });
            
            console.log(`\n5️⃣ Nettoyage: suppression de la carte de test`);
            // Supprimer la carte de test
            const rec_ark = data.rec_ark.filter(m => m.ark !== testArk);
            await window.ptmAuth.saveGalligeoData({
                rec_ark: rec_ark,
                settings: data.settings || {}
            });
            console.log('   ✅ Carte de test supprimée');
            
            return allPassed;
            
        } catch (error) {
            console.error('   ❌ Erreur:', error);
            return false;
        }
    },
    
    /**
     * Teste que le DOI est conservé lors de mises à jour ultérieures
     */
    async testDoiPersistence() {
        console.log('\n🧪 TEST: Persistance du DOI après dépôt');
        console.log('─'.repeat(50));
        
        if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
            console.error('❌ Vous devez être connecté pour exécuter ce test');
            return false;
        }
        
        const testArk = 'test_doi_persistence_' + Date.now();
        const testDoi = '10.34847/nkl.persist' + Date.now();
        
        try {
            console.log(`\n1️⃣ Création carte + dépôt avec DOI`);
            await window.ptmAuth.saveMapStatus(testArk, 'deposee', {
                doi: testDoi,
                quality: 3
            });
            console.log(`   ✅ Carte déposée avec DOI: ${testDoi}`);
            
            console.log(`\n2️⃣ Mise à jour de la qualité (sans DOI dans les params)`);
            await window.ptmAuth.saveMapStatus(testArk, 'deposee', {
                quality: 4  // Pas de DOI dans additionalData
            });
            console.log('   ✅ Qualité mise à jour');
            
            console.log(`\n3️⃣ Vérification que le DOI est toujours présent`);
            const data = await window.ptmAuth.getGalligeoData();
            const savedMap = data.rec_ark.find(m => m.ark === testArk);
            
            if (!savedMap) {
                console.error('   ❌ Carte non trouvée');
                return false;
            }
            
            console.log('   Données:', JSON.stringify(savedMap, null, 2));
            
            const doiPresent = savedMap.doi === testDoi;
            const qualityUpdated = savedMap.quality === 4;
            
            console.log(`   ${doiPresent ? '✅' : '❌'} DOI conservé: ${savedMap.doi}`);
            console.log(`   ${qualityUpdated ? '✅' : '❌'} Qualité mise à jour: ${savedMap.quality}`);
            
            console.log(`\n4️⃣ Nettoyage`);
            const rec_ark = data.rec_ark.filter(m => m.ark !== testArk);
            await window.ptmAuth.saveGalligeoData({
                rec_ark: rec_ark,
                settings: data.settings || {}
            });
            console.log('   ✅ Carte de test supprimée');
            
            return doiPresent && qualityUpdated;
            
        } catch (error) {
            console.error('   ❌ Erreur:', error);
            return false;
        }
    },
    
    /**
     * Teste l'affichage d'une carte déposée dans la galerie
     */
    async testDepositedCardDisplay() {
        console.log('\n🧪 TEST: Affichage carte déposée dans la galerie');
        console.log('─'.repeat(50));
        
        if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
            console.error('❌ Vous devez être connecté pour exécuter ce test');
            return false;
        }
        
        if (!window.workedMapsManager) {
            console.error('❌ workedMapsManager non disponible');
            return false;
        }
        
        const testArk = 'btv1b8626440v'; // Carte de test existante
        const testDoi = '10.34847/nkl.display' + Date.now();
        
        try {
            console.log(`\n1️⃣ Création d'une carte déposée avec DOI`);
            await window.ptmAuth.saveMapStatus(testArk, 'deposee', {
                doi: testDoi,
                quality: 4
            });
            console.log('   ✅ Carte déposée créée');
            
            console.log(`\n2️⃣ Récupération des cartes travaillées`);
            const workedMaps = await window.ptmAuth.getWorkedMaps();
            const depositedMap = workedMaps.find(m => m.ark === testArk);
            
            if (!depositedMap) {
                console.error('   ❌ Carte non trouvée dans les cartes travaillées');
                return false;
            }
            
            console.log('   ✅ Carte trouvée:', depositedMap);
            console.log(`   - Statut: ${depositedMap.status}`);
            console.log(`   - DOI: ${depositedMap.doi}`);
            
            console.log(`\n3️⃣ Test génération HTML de la carte`);
            const metadata = await window.workedMapsManager.getGallicaMetadata(testArk);
            const cardHTML = window.workedMapsManager.generateCardHTML(depositedMap, metadata);
            
            // Vérifier que le HTML contient les éléments attendus
            const checks = [
                {
                    name: 'Tag "Déposée" présent',
                    test: cardHTML.includes('Déposée') || cardHTML.includes('deposee')
                },
                {
                    name: 'Lien DOI présent',
                    test: cardHTML.includes(testDoi) || cardHTML.includes('doi.org')
                },
                {
                    name: 'Lien Nakala présent',
                    test: cardHTML.includes('Voir sur Nakala')
                }
            ];
            
            let allPassed = true;
            checks.forEach(check => {
                const icon = check.test ? '✅' : '❌';
                console.log(`   ${icon} ${check.name}`);
                if (!check.test) allPassed = false;
            });
            
            console.log(`\n4️⃣ Nettoyage`);
            const data = await window.ptmAuth.getGalligeoData();
            const rec_ark = data.rec_ark.filter(m => m.ark !== testArk);
            await window.ptmAuth.saveGalligeoData({
                rec_ark: rec_ark,
                settings: data.settings || {}
            });
            console.log('   ✅ Carte de test supprimée');
            
            return allPassed;
            
        } catch (error) {
            console.error('   ❌ Erreur:', error);
            return false;
        }
    },
    
    /**
     * Exécute tous les tests
     */
    async runAllTests() {
        console.clear();
        console.log('═'.repeat(60));
        console.log('  SUITE DE TESTS - Dépôt Nakala et statut "deposee"');
        console.log('═'.repeat(60));
        
        if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
            console.error('❌ Vous devez être connecté pour exécuter les tests');
            alert('Veuillez vous connecter avec ORCID pour exécuter les tests.');
            return;
        }
        
        let allPassed = true;
        
        // Test 1: Statut deposee avec DOI
        const test1 = await this.testDepositStatus();
        allPassed = allPassed && test1;
        
        // Test 2: Persistance du DOI
        const test2 = await this.testDoiPersistence();
        allPassed = allPassed && test2;
        
        // Test 3: Affichage dans la galerie
        const test3 = await this.testDepositedCardDisplay();
        allPassed = allPassed && test3;
        
        // Résumé
        console.log('\n' + '═'.repeat(60));
        console.log('  RÉSUMÉ DES TESTS');
        console.log('═'.repeat(60));
        console.log(`  Test 1 (Dépôt avec DOI):      ${test1 ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`  Test 2 (Persistance DOI):     ${test2 ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`  Test 3 (Affichage galerie):   ${test3 ? '✅ PASS' : '❌ FAIL'}`);
        console.log('═'.repeat(60));
        
        if (allPassed) {
            console.log('✅ TOUS LES TESTS SONT PASSÉS');
            alert('✅ Tous les tests de dépôt Nakala sont passés !');
        } else {
            console.log('❌ CERTAINS TESTS ONT ÉCHOUÉ');
            alert('❌ Certains tests de dépôt Nakala ont échoué. Voir la console.');
        }
        console.log('═'.repeat(60));
        
        return allPassed;
    }
};

// Exposer la fonction de test pour un accès facile
window.testNakalaDeposit = window.testNakalaDepositStatus.runAllTests.bind(window.testNakalaDepositStatus);

console.log('📦 Script test-nakala-deposit-status.js chargé');
console.log('💡 Pour exécuter les tests: await window.testNakalaDeposit()');
