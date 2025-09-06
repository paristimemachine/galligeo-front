/**
 * Script de test rapide pour la détection ARK
 * À exécuter dans la console après avoir chargé une carte
 */

// Test manuel de détection ARK
function quickTestArkDetection() {
    console.log('🚀 Test rapide de détection ARK');
    
    // 1. Vérifier les variables globales
    console.log('\n📋 Variables globales:');
    console.log('- window.input_ark:', window.input_ark);
    console.log('- global input_ark:', typeof input_ark !== 'undefined' ? input_ark : 'undefined');
    
    // 2. Vérifier la détection par le système de backup
    if (window.controlPointsBackup) {
        const detectedArk = window.controlPointsBackup.getCurrentArk();
        console.log('- getCurrentArk():', detectedArk);
        
        if (detectedArk) {
            console.log('\n✅ ARK détecté avec succès !');
            
            // 3. Vérifier les sauvegardes pour cet ARK
            const backups = window.controlPointsBackup.getBackupsForArk(detectedArk);
            console.log('💾 Sauvegardes pour cet ARK:', backups.length);
            
            if (backups.length > 0) {
                console.log('📋 Sauvegardes disponibles:');
                backups.forEach((backup, index) => {
                    console.log(`  ${index + 1}. ${backup.timestamp} - ${backup.data.pointPairs?.length || 0} points`);
                });
                
                // 4. Test de la restauration automatique
                console.log('\n🔄 Test de la restauration automatique...');
                window.controlPointsBackup.checkForAutoRestore();
            } else {
                console.log('📭 Aucune sauvegarde trouvée pour cet ARK');
            }
        } else {
            console.log('\n❌ Aucun ARK détecté');
            console.log('💡 Assurez-vous d\'avoir chargé une carte Gallica');
        }
    } else {
        console.error('❌ Système de backup non initialisé');
    }
}

// Instructions d'utilisation
console.log('💡 Pour tester la détection ARK après avoir chargé une carte:');
console.log('   quickTestArkDetection()');
console.log('');
console.log('💡 Autres fonctions de test disponibles:');
console.log('   window.testArkDetection()');
console.log('   window.testForceAutoRestore()');

// Exporter la fonction
window.quickTestArkDetection = quickTestArkDetection;
