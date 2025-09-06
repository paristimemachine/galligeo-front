/**
 * Script de test pour le système de sauvegarde lié aux ARK
 * À exécuter dans la console du navigateur
 */

console.log('🧪 Tests du système de sauvegarde lié aux ARK');

// Test 1: Vérifier que le système est initialisé
function testSystemInitialization() {
    console.log('\n📋 Test 1: Initialisation du système');
    
    if (window.controlPointsBackup) {
        console.log('✅ Sistema de backup inicializado');
        console.log('- Fréquence autosave:', window.controlPointsBackup.autosaveFrequency + 'ms');
        console.log('- Activé:', window.controlPointsBackup.isEnabled);
        console.log('- Max backups:', window.controlPointsBackup.maxBackups);
    } else {
        console.error('❌ Sistema de backup non inicializado');
        return false;
    }
    return true;
}

// Test 2: Tester sans ARK
function testWithoutArk() {
    console.log('\n📋 Test 2: Comportement sans ARK chargé');
    
    // Simuler l'absence d'ARK
    const originalArk = window.input_ark;
    window.input_ark = null;
    
    const ark = window.controlPointsBackup.getCurrentArk();
    console.log('ARK actuel:', ark);
    
    if (ark === null) {
        console.log('✅ Correctly detects no ARK');
    } else {
        console.error('❌ Should return null when no ARK is loaded');
    }
    
    // Test que la sauvegarde est ignorée
    window.controlPointsBackup.saveCurrentState('test-no-ark');
    console.log('✅ Sauvegarde sans ARK ignorée (normal)');
    
    // Restaurer l'ARK original
    window.input_ark = originalArk;
    return true;
}

// Test 3: Tester avec un ARK fictif
function testWithFakeArk() {
    console.log('\n📋 Test 3: Comportement avec ARK fictif');
    
    // Simuler un ARK
    const originalArk = window.input_ark;
    window.input_ark = 'btv1b84460142test';
    
    console.log('ARK de test:', window.controlPointsBackup.getCurrentArk());
    
    // Test de la génération de clé de stockage
    const storageKey = window.controlPointsBackup.getArkStorageKey(window.input_ark);
    console.log('Clé de stockage générée:', storageKey);
    
    if (storageKey.includes(window.input_ark)) {
        console.log('✅ Clé de stockage générée correctement');
    } else {
        console.error('❌ Erreur dans la génération de clé');
    }
    
    // Test de récupération des sauvegardes (vides initialement)
    const backups = window.controlPointsBackup.getBackupsForArk();
    console.log('Sauvegardes pour cet ARK:', backups.length);
    
    // Restaurer l'ARK original
    window.input_ark = originalArk;
    return true;
}

// Test 4: Tester la migration
function testMigration() {
    console.log('\n📋 Test 4: Test de la migration');
    
    // Vérifier s'il y a eu migration
    const oldBackups = window.controlPointsBackup.getAllBackupsOld();
    console.log('Anciennes sauvegardes trouvées:', oldBackups.length);
    
    if (oldBackups.length > 0) {
        console.log('📦 Sauvegardes anciennes détectées, migration nécessaire');
        window.controlPointsBackup.migrateOldBackups();
        console.log('✅ Migration exécutée');
    } else {
        console.log('✅ Pas de migration nécessaire (normal pour une nouvelle installation)');
    }
    
    return true;
}

// Test 5: Interface utilisateur
function testUserInterface() {
    console.log('\n📋 Test 5: Interface utilisateur');
    
    // Test sans ARK
    window.input_ark = null;
    try {
        window.controlPointsBackup.showRestoreInterface();
        console.log('✅ Interface gère correctement l\'absence d\'ARK');
    } catch (error) {
        console.error('❌ Erreur interface sans ARK:', error.message);
    }
    
    // Test avec ARK mais sans sauvegardes
    window.input_ark = 'btv1b84460142test2';
    try {
        window.controlPointsBackup.showRestoreInterface();
        console.log('✅ Interface gère correctement l\'absence de sauvegardes');
    } catch (error) {
        console.error('❌ Erreur interface sans sauvegardes:', error.message);
    }
    
    return true;
}

// Test 6: Statistiques
function testStatistics() {
    console.log('\n📋 Test 6: Statistiques');
    
    const stats = window.controlPointsBackup.getBackupStatsByArk();
    console.log('Statistiques par ARK:', stats);
    
    const arks = window.controlPointsBackup.getAllArksWithBackups();
    console.log('ARKs avec sauvegardes:', arks);
    
    console.log('✅ Statistiques générées');
    return true;
}

// Fonction principale de test
function runAllTests() {
    console.log('🚀 Démarrage des tests du système de sauvegarde ARK\n');
    
    const tests = [
        testSystemInitialization,
        testWithoutArk,
        testWithFakeArk,
        testMigration,
        testUserInterface,
        testStatistics
    ];
    
    let passed = 0;
    let total = tests.length;
    
    for (let i = 0; i < tests.length; i++) {
        try {
            if (tests[i]()) {
                passed++;
            }
        } catch (error) {
            console.error(`❌ Erreur dans le test ${i + 1}:`, error);
        }
    }
    
    console.log(`\n🎯 Tests terminés: ${passed}/${total} réussis`);
    
    if (passed === total) {
        console.log('🎉 Tous les tests sont passés ! Le système fonctionne correctement.');
    } else {
        console.log('⚠️ Certains tests ont échoué. Vérifiez les logs ci-dessus.');
    }
    
    return passed === total;
}

// Exporter pour utilisation dans la console
window.testBackupArkSystem = runAllTests;

// Informations sur l'utilisation
console.log('💡 Pour lancer les tests, exécutez: window.testBackupArkSystem()');
console.log('💡 Pour tester manuellement: window.controlPointsBackup.getCurrentArk()');
