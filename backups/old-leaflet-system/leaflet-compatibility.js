/**
 * Patch de compatibilité pour les scripts dépendant de Leaflet
 * Recrée des variables globales quand les cartes sont initialisées
 */

// Écouter l'événement d'initialisation des cartes
document.addEventListener('mapsInitialized', function() {
    console.log('📍 Cartes initialisées - mise à jour des variables globales');
    
    // S'assurer que les variables globales sont disponibles
    if (typeof left_map !== 'undefined' && typeof right_map !== 'undefined') {
        // Exposer globalement pour compatibilité
        window.left_map = left_map;
        window.right_map = right_map;
        window.customMarker = customMarker;
        
        console.log('✅ Variables de cartes exportées globalement');
        
        // Notifier les autres scripts que les cartes sont prêtes
        document.dispatchEvent(new CustomEvent('leafletMapsReady', {
            detail: { left_map, right_map, customMarker }
        }));
    } else {
        console.error('❌ Cartes non définies après initialisation');
    }
});

// Fonction d'aide pour vérifier si les cartes sont prêtes
function areMapsReady() {
    return window.left_map && window.right_map && typeof window.left_map.addLayer === 'function';
}

// Fonction d'aide pour exécuter du code quand les cartes sont prêtes
function whenMapsReady(callback, name = 'anonymous') {
    if (areMapsReady()) {
        console.log(`✅ Cartes prêtes - exécution immédiate: ${name}`);
        try {
            callback();
        } catch (error) {
            console.error(`❌ Erreur dans ${name}:`, error);
        }
    } else {
        console.log(`⏳ Cartes non prêtes - attente: ${name}`);
        document.addEventListener('leafletMapsReady', function() {
            console.log(`▶️ Exécution différée: ${name}`);
            try {
                callback();
            } catch (error) {
                console.error(`❌ Erreur dans l'exécution différée de ${name}:`, error);
            }
        }, { once: true });
    }
}

// Exposer les fonctions globalement
window.areMapsReady = areMapsReady;
window.whenMapsReady = whenMapsReady;

console.log('🔧 Patch de compatibilité Leaflet chargé');
