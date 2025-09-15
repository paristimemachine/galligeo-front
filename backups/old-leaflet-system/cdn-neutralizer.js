/**
 * Neutralisation des CDN externes sur WiFi public
 * Remplace automatiquement les liens CDN par les versions locales
 */

(function() {
    'use strict';
    
    // Attendre que le DOM soit chargé
    document.addEventListener('DOMContentLoaded', function() {
        // Vérifier si on est en mode WiFi public
        const isHttps = window.location.protocol === 'https:';
        const isProduction = window.location.hostname.includes('ptm.huma-num.fr');
        
        // IMPORTANT : Vérifier aussi si les CDN externes fonctionnent
        if (isHttps && isProduction && shouldNeutralizeCDN()) {
            console.warn('🔄 Mode WiFi public confirmé - neutralisation des CDN externes');
            neutralizeExternalCDNs();
        } else {
            console.log('🌐 Réseau normal détecté - CDN externes conservés');
        }
    });
    
    /**
     * Vérifie si on doit vraiment neutraliser les CDN
     */
    function shouldNeutralizeCDN() {
        // Si le mode fallback d'urgence est activé, neutraliser
        if (window.LEAFLET_FALLBACK_MODE) {
            return true;
        }
        
        // Sinon, tester rapidement si les CDN sont accessibles
        return false; // Par défaut, on fait confiance aux CDN
    }
    
    function neutralizeExternalCDNs() {
        // Mapping des CDN vers les versions locales
        const cdnMappings = {
            // Leaflet CSS
            'https://unpkg.com/leaflet@1.9.3/dist/leaflet.css': '/galligeo/node_modules/leaflet/dist/leaflet.css',
            // Leaflet JS
            'https://unpkg.com/leaflet@1.9.3/dist/leaflet.js': '/galligeo/node_modules/leaflet/dist/leaflet.js',
            // Control Loading JS
            'https://cdn.jsdelivr.net/npm/leaflet-loading@0.1.24/src/Control.Loading.js': '/galligeo/assets/Control.Loading.js',
            // Control Geocoder CSS - fallback local
            'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css': '/galligeo/css/Control.Geocoder.css'
            // Note: Leaflet Draw retiré car non utilisé dans cette application
        };
        
        let replacements = 0;
        
        // Remplacer les CSS
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            const originalHref = link.href;
            if (cdnMappings[originalHref]) {
                console.log(`🔄 Remplacement CSS: ${originalHref} → ${cdnMappings[originalHref]}`);
                link.href = cdnMappings[originalHref];
                replacements++;
            }
        });
        
        // Remplacer les scripts
        document.querySelectorAll('script[src]').forEach(script => {
            const originalSrc = script.src;
            if (cdnMappings[originalSrc]) {
                console.log(`🔄 Remplacement JS: ${originalSrc} → ${cdnMappings[originalSrc]}`);
                
                // Créer un nouveau script avec la source locale
                const newScript = document.createElement('script');
                newScript.src = cdnMappings[originalSrc];
                newScript.async = false;
                
                // Remplacer l'ancien script
                script.parentNode.insertBefore(newScript, script);
                script.remove();
                replacements++;
            } else if (originalSrc.includes('unpkg.com') || originalSrc.includes('rawgithub.com')) {
                // Désactiver les scripts CDN sans fallback
                console.warn(`⚠️ Script CDN désactivé (pas de fallback): ${originalSrc}`);
                script.remove();
                replacements++;
            }
        });
        
        if (replacements > 0) {
            console.log(`✅ ${replacements} CDN externes neutralisés et remplacés`);
            
            // Notifier le remplacement
            document.dispatchEvent(new CustomEvent('cdnNeutralized', {
                detail: { replacements: replacements }
            }));
        }
    }
})();
