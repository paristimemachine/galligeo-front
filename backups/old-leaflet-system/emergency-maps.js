/**
 * Solution d'urgence pour l'initialisation des cartes
 * Ce script détecte si Leaflet est chargé et initialise les cartes
 */

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Vérification de l\'état de Leaflet...');
    
    // Si on est en mode fallback, démarrer immédiatement
    if (window.LEAFLET_FALLBACK_MODE) {
        console.log('🚨 Mode fallback activé - attente du chargement Leaflet d\'urgence');
        waitForEmergencyLeaflet();
    } else {
        // Mode normal
        setTimeout(initMapsWhenReady, 100);
    }
    
    // Fonction spéciale pour attendre le Leaflet d'urgence
    function waitForEmergencyLeaflet() {
        const checkInterval = setInterval(() => {
            if (window.LEAFLET_EMERGENCY_LOADED && typeof L !== 'undefined') {
                console.log('✅ Leaflet d\'urgence prêt - initialisation immédiate');
                clearInterval(checkInterval);
                initMapsWhenReady();
            } else if (window.LEAFLET_EMERGENCY_FAILED) {
                console.error('❌ Leaflet d\'urgence échoué - tentative normale');
                clearInterval(checkInterval);
                initMapsWhenReady();
            }
        }, 50); // Vérification très fréquente
        
        // Timeout de sécurité
        setTimeout(() => {
            clearInterval(checkInterval);
            console.warn('⏰ Timeout Leaflet d\'urgence - tentative normale');
            initMapsWhenReady();
        }, 5000);
    }
    
    // Fonction pour initialiser les cartes quand Leaflet est prêt
    function initMapsWhenReady() {
        if (typeof L !== 'undefined' && L.map) {
            console.log('✅ Leaflet disponible - initialisation des cartes d\'urgence');
            
            // Vérifier que les conteneurs existent
            const leftContainer = document.getElementById('map-left');
            const rightContainer = document.getElementById('map-right');
            
            if (!leftContainer || !rightContainer) {
                console.error('❌ Conteneurs de cartes non trouvés');
                return;
            }
            
            // Éviter la double initialisation
            if (window.left_map || window.right_map) {
                console.log('ℹ️ Cartes déjà initialisées');
                return;
            }
            
            try {
                // Initialiser les cartes
                window.left_map = L.map('map-left', {
                    center: [47, 2],
                    zoomSnap: 0.1,
                    zoomDelta: 0.25,
                    zoom: 6.2,
                    loadingControl: true,
                    rotate: true,
                    bearing: 0
                });

                window.right_map = L.map('map-right', {
                    center: [47, 2],
                    zoomSnap: 0.1,
                    zoomDelta: 0.25,
                    zoom: 6.2,
                    loadingControl: true
                });
                
                // Icône personnalisée
                window.customMarker = L.Icon.extend({
                    options: {
                        shadowUrl: null,
                        iconAnchor: new L.Point(12, 12),
                        iconSize: new L.Point(24, 24),
                        iconUrl: "img/x.svg",
                    }
                });
                
                console.log('🗺️ Cartes d\'urgence initialisées avec succès');
                
                // Notifier que les cartes sont prêtes
                document.dispatchEvent(new CustomEvent('emergencyMapsReady', {
                    detail: {
                        left_map: window.left_map,
                        right_map: window.right_map,
                        customMarker: window.customMarker
                    }
                }));
                
                // Continuer avec l'initialisation des contrôles
                setTimeout(initControls, 500);
                
            } catch (error) {
                console.error('❌ Erreur lors de l\'initialisation d\'urgence:', error);
            }
        } else {
            console.log('⏳ Leaflet non encore disponible, nouvelle tentative...');
            setTimeout(initMapsWhenReady, 200);
        }
    }
    
    // Fonction pour initialiser les contrôles de base
    function initControls() {
        if (!window.left_map || !window.right_map) return;
        
        try {
            console.log('🎛️ Initialisation des contrôles de base');
            
            // Ajouter les tuiles de base
            const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            });
            
            window.left_map.addLayer(osmLayer);
            window.right_map.addLayer(osmLayer.clone || osmLayer);
            
            console.log('✅ Contrôles de base initialisés');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation des contrôles:', error);
        }
    }
    
    // Démarrer la vérification
    setTimeout(initMapsWhenReady, 100);
});

console.log('🚑 Script d\'urgence pour les cartes chargé');
