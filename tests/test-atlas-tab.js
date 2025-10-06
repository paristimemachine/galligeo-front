/**
 * Tests rapides pour l'onglet "Mes atlas"
 * À exécuter dans la console du navigateur sur index.html
 */

console.log('🧪 Tests de l\'onglet "Mes atlas"');
console.log('═══════════════════════════════════════');

// Test 1 : Vérifier que les fonctions sont disponibles
console.log('\n📋 Test 1 : Vérification des fonctions globales');
const functions = [
    'loadUserAtlas',
    'confirmDeleteAtlas', 
    'deleteAtlas'
];

functions.forEach(fn => {
    if (typeof window[fn] === 'function') {
        console.log(`✅ window.${fn} est défini`);
    } else {
        console.error(`❌ window.${fn} n'est PAS défini`);
    }
});

// Test 2 : Vérifier la présence des éléments DOM
console.log('\n📋 Test 2 : Vérification des éléments DOM');
const elements = {
    'atlas-list-container': 'Conteneur principal',
    'atlas-loading': 'Indicateur de chargement',
    'atlas-status-message': 'Message de statut',
    'tabpanel-atlas': 'Onglet "Mes atlas"',
    'tabpanel-atlas-panel': 'Panel de l\'onglet'
};

Object.entries(elements).forEach(([id, description]) => {
    const element = document.getElementById(id);
    if (element) {
        console.log(`✅ ${description} (id="${id}") trouvé`);
    } else {
        console.error(`❌ ${description} (id="${id}") NON trouvé`);
    }
});

// Test 3 : Vérifier PTMAuth
console.log('\n📋 Test 3 : Vérification de PTMAuth');
if (window.ptmAuth) {
    console.log('✅ window.ptmAuth est disponible');
    
    if (typeof window.ptmAuth.getToken === 'function') {
        console.log('✅ window.ptmAuth.getToken() existe');
        const token = window.ptmAuth.getToken();
        if (token) {
            console.log('✅ Token présent (utilisateur connecté)');
        } else {
            console.log('ℹ️ Pas de token (utilisateur non connecté)');
        }
    } else {
        console.error('❌ window.ptmAuth.getToken() n\'existe pas');
    }
    
    if (typeof window.ptmAuth.getUserProfile === 'function') {
        console.log('✅ window.ptmAuth.getUserProfile() existe');
    } else {
        console.error('❌ window.ptmAuth.getUserProfile() n\'existe pas');
    }
} else {
    console.error('❌ window.ptmAuth n\'est PAS disponible');
}

// Test 4 : Vérifier l'écouteur d'événement sur l'onglet
console.log('\n📋 Test 4 : Vérification de l\'écouteur d\'événement');
const atlasTab = document.getElementById('tabpanel-atlas');
if (atlasTab) {
    // On ne peut pas vraiment vérifier qu'un listener est attaché,
    // mais on peut vérifier que l'élément existe
    console.log('✅ Onglet atlas trouvé - écouteur probablement attaché');
    console.log('ℹ️ Cliquez sur l\'onglet pour tester le chargement des atlas');
} else {
    console.error('❌ Onglet atlas non trouvé - écouteur non attaché');
}

// Test 5 : Simuler un clic sur l'onglet (optionnel)
console.log('\n📋 Test 5 : Simulation de clic (optionnel)');
console.log('ℹ️ Pour tester automatiquement, exécutez : simulateAtlasTabClick()');

window.simulateAtlasTabClick = function() {
    const atlasTab = document.getElementById('tabpanel-atlas');
    if (atlasTab) {
        console.log('🖱️ Simulation du clic sur l\'onglet...');
        atlasTab.click();
        setTimeout(() => {
            const container = document.getElementById('atlas-list-container');
            if (container && container.innerHTML.length > 100) {
                console.log('✅ Contenu chargé dans le conteneur');
            } else {
                console.log('⚠️ Le conteneur semble vide - vérifiez les logs API');
            }
        }, 1000);
    } else {
        console.error('❌ Impossible de trouver l\'onglet atlas');
    }
};

// Résumé
console.log('\n═══════════════════════════════════════');
console.log('✅ Tests terminés');
console.log('\n📝 Commandes disponibles :');
console.log('  • window.loadUserAtlas() - Charger les atlas manuellement');
console.log('  • window.simulateAtlasTabClick() - Simuler un clic sur l\'onglet');
console.log('\n💡 Pour tester complètement :');
console.log('  1. Ouvrez la modale des paramètres');
console.log('  2. Cliquez sur l\'onglet "Mes atlas"');
console.log('  3. Vérifiez que les atlas s\'affichent');
console.log('═══════════════════════════════════════\n');
