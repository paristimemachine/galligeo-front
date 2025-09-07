/**
 * Script de test pour la fonctionnalité des cartes travaillées
 * À utiliser dans la console du navigateur pour tester les fonctionnalités
 */

// Test 1: Vérifier que les gestionnaires sont chargés
function testManagersLoaded() {
    console.log('=== Test 1: Vérification du chargement des gestionnaires ===');
    console.log('PTM Auth:', !!window.ptmAuth);
    console.log('Worked Maps Manager:', !!window.workedMapsManager);
    console.log('Cartoquete Manager:', !!window.cartoqueteManager);
    console.log('Utilisateur connecté:', window.ptmAuth ? window.ptmAuth.isAuthenticated() : false);
}

// Test 2: Ajouter une carte de test
async function testAddWorkedMap() {
    console.log('=== Test 2: Ajout d\'une carte de test ===');
    
    if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
        console.error('Utilisateur non connecté');
        return;
    }
    
    const testArk = 'btv1b532480876'; // ARK de test
    const testData = {
        title: 'Carte de test',
        creator: 'Test Créateur',
        date: '2025'
    };
    
    try {
        const result = await window.workedMapsManager.addWorkedMap(testArk, testData);
        console.log('Résultat ajout carte:', result);
    } catch (error) {
        console.error('Erreur lors de l\'ajout:', error);
    }
}

// Test 3: Mettre à jour le statut d'une carte
async function testUpdateMapStatus() {
    console.log('=== Test 3: Mise à jour du statut d\'une carte ===');
    
    if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
        console.error('Utilisateur non connecté');
        return;
    }
    
    const testArk = 'btv1b532480876';
    
    try {
        // Test avec le statut "georeferenced"
        const result1 = await window.workedMapsManager.updateMapStatus(testArk, 'georeferenced');
        console.log('Mise à jour vers "georeferenced":', result1);
        
        // Test avec le statut "deposee" et un DOI
        const result2 = await window.workedMapsManager.updateMapStatus(testArk, 'deposee', { 
            doi: '10.34847/nkl.test123' 
        });
        console.log('Mise à jour vers "deposee":', result2);
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
    }
}

// Test 4: Charger et afficher les cartes travaillées
async function testDisplayWorkedMaps() {
    console.log('=== Test 4: Affichage des cartes travaillées ===');
    
    try {
        const workedMaps = await window.workedMapsManager.loadWorkedMaps();
        console.log('Cartes travaillées chargées:', workedMaps);
        
        if (document.getElementById('worked-maps-container')) {
            await window.workedMapsManager.displayWorkedMaps();
            console.log('Affichage mis à jour');
        } else {
            console.log('Conteneur d\'affichage non trouvé (pas sur la page principale)');
        }
    } catch (error) {
        console.error('Erreur lors de l\'affichage:', error);
    }
}

// Test 5: Tester les fonctions utilitaires globales
async function testGlobalFunctions() {
    console.log('=== Test 5: Fonctions utilitaires globales ===');
    
    console.log('addWorkedMap disponible:', typeof window.addWorkedMap === 'function');
    console.log('updateMapStatus disponible:', typeof window.updateMapStatus === 'function');
    
    if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
        console.error('Utilisateur non connecté');
        return;
    }
    
    const testArk = 'btv1b532480877'; // Autre ARK pour test
    
    try {
        // Test de la fonction globale d'ajout
        const result1 = await window.addWorkedMap(testArk, { 
            title: 'Test global', 
            creator: 'Global Test' 
        });
        console.log('Résultat addWorkedMap global:', result1);
        
        // Test de la fonction globale de mise à jour
        const result2 = await window.updateMapStatus(testArk, 'georeferenced');
        console.log('Résultat updateMapStatus global:', result2);
    } catch (error) {
        console.error('Erreur avec les fonctions globales:', error);
    }
}

// Fonction pour lancer tous les tests
async function runAllTests() {
    console.log('🚀 Démarrage des tests de la fonctionnalité cartes travaillées');
    console.log('================================================================');
    
    testManagersLoaded();
    
    if (window.ptmAuth && window.ptmAuth.isAuthenticated()) {
        await testAddWorkedMap();
        await testUpdateMapStatus();
        await testDisplayWorkedMaps();
        await testGlobalFunctions();
    } else {
        console.warn('⚠️  Certains tests nécessitent une connexion utilisateur');
    }
    
    console.log('================================================================');
    console.log('✅ Tests terminés');
}

// Exposer les fonctions de test globalement
window.testWorkedMaps = {
    runAllTests,
    testManagersLoaded,
    testAddWorkedMap,
    testUpdateMapStatus,
    testDisplayWorkedMaps,
    testGlobalFunctions
};

console.log('📋 Tests des cartes travaillées chargés');
console.log('Utilisation: window.testWorkedMaps.runAllTests() ou fonctions individuelles');
console.log('Fonctions disponibles:', Object.keys(window.testWorkedMaps));
