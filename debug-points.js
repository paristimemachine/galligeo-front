/**
 * Script de débogage pour vérifier l'état des points de contrôle
 * À exécuter dans la console du navigateur
 */

function debugControlPoints() {
    console.log('=== DÉBOGAGE DES POINTS DE CONTRÔLE ===');
    
    console.log('1. window.pointPairs:', window.pointPairs);
    console.log('2. Nombre de pointPairs:', window.pointPairs ? window.pointPairs.length : 'undefined');
    
    if (window.pointPairs && window.pointPairs.length > 0) {
        console.log('3. Détail des pointPairs:');
        window.pointPairs.forEach((pair, index) => {
            console.log(`   Paire ${index + 1} (ID: ${pair.id}):`);
            console.log(`     - Point gauche:`, pair.leftPoint);
            console.log(`     - Point droit:`, pair.rightPoint);
            console.log(`     - Est complète:`, pair.isComplete());
        });
        
        const completePairs = window.pointPairs.filter(pair => pair.isComplete()).length;
        console.log(`4. Nombre de paires complètes: ${completePairs}`);
    }
    
    console.log('5. list_georef_points:', list_georef_points);
    console.log('6. Longueur de list_georef_points:', list_georef_points ? list_georef_points.length : 'undefined');
    console.log('7. count_points:', count_points);
    
    // Test de updateGeoreferencingData
    console.log('8. Test de updateGeoreferencingData():');
    if (typeof updateGeoreferencingData === 'function') {
        updateGeoreferencingData();
        console.log('   - Après updateGeoreferencingData, list_georef_points:', list_georef_points);
    } else {
        console.log('   - updateGeoreferencingData n\'est pas définie');
    }
    
    console.log('=== FIN DU DÉBOGAGE ===');
}

// Ajouter la fonction à window pour qu'elle soit accessible depuis la console
window.debugControlPoints = debugControlPoints;

console.log('Script de débogage chargé. Tapez debugControlPoints() dans la console pour diagnostiquer.');
