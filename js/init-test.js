/**
 * Test d'initialisation pour vérifier que tous les composants sont bien chargés
 */

// Attendre que la page soit complètement chargée
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== Test d\'initialisation des composants ===');
    
    setTimeout(() => {
        console.log('Tests après 2 secondes:');
        console.log('- window.ptmAuth:', !!window.ptmAuth);
        console.log('- window.workedMapsManager:', !!window.workedMapsManager);
        console.log('- window.addWorkedMap:', typeof window.addWorkedMap);
        console.log('- window.updateMapStatus:', typeof window.updateMapStatus);
        console.log('- window.controlPointsBackup:', !!window.controlPointsBackup);
        
        if (window.ptmAuth) {
            console.log('- ptmAuth.isAuthenticated():', window.ptmAuth.isAuthenticated());
        }
        
        // Test simple de fonction de mise à jour
        if (window.workedMapsManager && typeof window.workedMapsManager.updateMapStatus === 'function') {
            console.log('✅ WorkedMapsManager.updateMapStatus est disponible');
        } else {
            console.log('❌ WorkedMapsManager.updateMapStatus n\'est pas disponible');
        }
        
        // Ajouter des fonctions de test globales pour faciliter le debug
        window.testStatusUpdate = async function(arkId = 'btv1b53121232b') {
            console.log('Test de mise à jour du statut...');
            
            if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
                console.log('Utilisateur non connecté');
                return false;
            }
            
            if (!window.workedMapsManager) {
                console.log('WorkedMapsManager non disponible');
                return false;
            }
            
            try {
                const result = await window.workedMapsManager.updateMapStatus(arkId, 'georeferenced');
                console.log('Résultat du test:', result);
                return result;
            } catch (error) {
                console.error('Erreur pendant le test:', error);
                return false;
            }
        };
        
        console.log('Fonction de test disponible: window.testStatusUpdate(arkId)');
        
    }, 2000);
});

// Test plus approfondi après authentification
document.addEventListener('userLoggedIn', function(event) {
    console.log('Utilisateur connecté, lancement des tests approfondis...');
    
    setTimeout(async () => {
        try {
            // Tester la récupération des cartes travaillées
            if (window.ptmAuth && window.ptmAuth.getWorkedMaps) {
                const workedMaps = await window.ptmAuth.getWorkedMaps();
                console.log('Cartes travaillées récupérées:', workedMaps.length);
                
                if (workedMaps.length > 0) {
                    console.log('Première carte:', workedMaps[0]);
                }
            }
            
        } catch (error) {
            console.error('Erreur lors des tests après connexion:', error);
        }
    }, 1000);
});