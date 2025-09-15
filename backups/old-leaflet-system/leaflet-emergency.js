/**
 * Script d'urgence IMMÉDIAT pour WiFi public
 * Se charge avant tout autre script pour garantir la disponibilité de Leaflet
 */

(function() {
    'use strict';
    
    // Détection immédiate du WiFi public
    const isHttps = window.location.protocol === 'https:';
    const isProduction = window.location.hostname.includes('ptm.huma-num.fr');
    const isPublicWifi = isHttps && isProduction;
    
    // Test rapide si on peut accéder aux CDN
    let cdnBlocked = false;
    
    if (isPublicWifi) {
        // Sur HTTPS production, tester si les CDN sont vraiment bloqués
        const testLink = document.createElement('link');
        testLink.rel = 'prefetch';
        testLink.href = 'https://unpkg.com/leaflet@1.9.3/dist/leaflet.js';
        testLink.onerror = () => { cdnBlocked = true; };
        document.head.appendChild(testLink);
        
        // Attendre un peu pour le test
        setTimeout(() => {
            if (cdnBlocked || !testLink.sheet) {
                injectEmergencyLeaflet();
            }
        }, 100);
    }
    
    function injectEmergencyLeaflet() {
        console.warn('🚨 URGENCE: WiFi public détecté - injection immédiate de Leaflet');
        
        // Créer les éléments de manière synchrone
        const leafletCSS = document.createElement('link');
        leafletCSS.rel = 'stylesheet';
        leafletCSS.href = 'node_modules/leaflet/dist/leaflet.css';
        leafletCSS.type = 'text/css';
        
        const leafletJS = document.createElement('script');
        leafletJS.src = 'node_modules/leaflet/dist/leaflet.js';
        leafletJS.type = 'text/javascript';
        leafletJS.async = false; // CRITIQUE: chargement synchrone
        
        // Injection immédiate dans le DOM
        const head = document.head || document.getElementsByTagName('head')[0];
        head.appendChild(leafletCSS);
        head.appendChild(leafletJS);
        
        console.log('⚡ Leaflet injecté en mode urgence');
        
        // Marquer globalement qu'on est en mode fallback
        window.LEAFLET_FALLBACK_MODE = true;
        
        // Écouter le chargement
        leafletJS.onload = function() {
            console.log('✅ Leaflet d\'urgence chargé');
            window.LEAFLET_EMERGENCY_LOADED = true;
        };
        
        leafletJS.onerror = function() {
            console.error('❌ Échec critique du chargement Leaflet d\'urgence');
            window.LEAFLET_EMERGENCY_FAILED = true;
        };
    }
})();
