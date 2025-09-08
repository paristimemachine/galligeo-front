/**
 * Test pour le bouton de dépôt dans les cartes géoréférencées
 */

// Fonction de test pour le bouton de dépôt
async function testDepositButton() {
    console.log('=== Test du bouton de dépôt ===');
    
    // Vérifier que le gestionnaire des cartes travaillées existe
    if (!window.workedMapsManager) {
        console.error('WorkedMapsManager non disponible');
        return;
    }
    
    // Simuler une carte avec le statut "georeferenced"
    const testMap = {
        ark: 'btv1b532480876',
        status: 'georeferenced',
        firstWorked: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };
    
    // Simuler des métadonnées
    const testMetadata = {
        metadata: {
            'Titre': 'Test Carte Géoréférencée',
            'Créateur': 'Test Créateur',
            'Date': '1850'
        },
        gallicaUrl: 'https://gallica.bnf.fr/ark:/12148/btv1b532480876',
        thumbnailUrl: 'https://gallica.bnf.fr/iiif/ark:/12148/btv1b532480876/f1/full/300,/0/native.jpg'
    };
    
    console.log('Génération du HTML de la carte...');
    const cardHTML = window.workedMapsManager.generateCardHTML(testMap, testMetadata);
    
    // Vérifier que le bouton de dépôt est présent
    if (cardHTML.includes('Déposer sur Nakala')) {
        console.log('✅ Bouton de dépôt trouvé dans le HTML');
    } else {
        console.error('❌ Bouton de dépôt non trouvé dans le HTML');
    }
    
    // Vérifier que l'onclick est correct
    if (cardHTML.includes('openDepositModalForMap')) {
        console.log('✅ Fonction onclick correcte');
    } else {
        console.error('❌ Fonction onclick incorrecte');
    }
    
    console.log('HTML généré:', cardHTML);
}

// Fonction de test pour la modale de dépôt
async function testDepositModal() {
    console.log('=== Test de la modale de dépôt ===');
    
    if (!window.workedMapsManager) {
        console.error('WorkedMapsManager non disponible');
        return;
    }
    
    const testArkId = 'btv1b532480876';
    
    try {
        console.log(`Test d'ouverture de la modale pour ${testArkId}...`);
        
        // Simuler l'authentification si nécessaire
        if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
            console.warn('Utilisateur non authentifié - le test sera limité');
        }
        
        // Tester la méthode loadMapForDeposit
        await window.workedMapsManager.loadMapForDeposit(testArkId);
        
        console.log('✅ loadMapForDeposit fonctionne');
        console.log('metadataDict:', window.metadataDict);
        console.log('pointPairs:', window.pointPairs?.length || 0);
        
    } catch (error) {
        console.error('❌ Erreur lors du test de la modale:', error);
    }
}

// Fonction pour tester différents statuts de cartes
function testCardStatusRendering() {
    console.log('=== Test du rendu selon les statuts ===');
    
    if (!window.workedMapsManager) {
        console.error('WorkedMapsManager non disponible');
        return;
    }
    
    const testMetadata = {
        metadata: {
            'Titre': 'Test Carte',
            'Créateur': 'Test Créateur',
            'Date': '1850'
        },
        gallicaUrl: 'https://gallica.bnf.fr/ark:/12148/btv1b532480876',
        thumbnailUrl: 'https://gallica.bnf.fr/iiif/ark:/12148/btv1b532480876/f1/full/300,/0/native.jpg'
    };
    
    const statuses = ['en-cours', 'georeferenced', 'deposee'];
    
    statuses.forEach(status => {
        const testMap = {
            ark: 'btv1b532480876',
            status: status,
            firstWorked: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        if (status === 'deposee') {
            testMap.doi = '10.34847/nkl.test123';
        }
        
        const cardHTML = window.workedMapsManager.generateCardHTML(testMap, testMetadata);
        
        console.log(`\n--- Statut: ${status} ---`);
        
        if (status === 'georeferenced') {
            if (cardHTML.includes('Déposer sur Nakala')) {
                console.log('✅ Bouton de dépôt présent pour statut "georeferenced"');
            } else {
                console.error('❌ Bouton de dépôt manquant pour statut "georeferenced"');
            }
        } else {
            if (!cardHTML.includes('Déposer sur Nakala')) {
                console.log(`✅ Bouton de dépôt absent pour statut "${status}" (attendu)`);
            } else {
                console.error(`❌ Bouton de dépôt présent pour statut "${status}" (non attendu)`);
            }
        }
        
        if (status === 'deposee' && testMap.doi) {
            if (cardHTML.includes('Voir sur Nakala')) {
                console.log('✅ Lien Nakala présent pour carte déposée');
            } else {
                console.error('❌ Lien Nakala manquant pour carte déposée');
            }
        }
    });
}

// Exporter les fonctions de test pour utilisation dans la console
window.testDepositButton = testDepositButton;
window.testDepositModal = testDepositModal;
window.testCardStatusRendering = testCardStatusRendering;

// Fonction pour exécuter tous les tests
window.runAllDepositTests = async function() {
    console.log('🧪 Exécution de tous les tests pour le bouton de dépôt...\n');
    
    await testDepositButton();
    console.log('\n');
    await testDepositModal();
    console.log('\n');
    testCardStatusRendering();
    
    console.log('\n✅ Tous les tests terminés');
};

console.log('Tests du bouton de dépôt chargés. Utilisez runAllDepositTests() pour les exécuter.');
