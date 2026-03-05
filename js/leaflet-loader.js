/**
 * ========================================================================
 * GESTIONNAIRE UNIFIÉ LEAFLET - Solution complète pour tous réseaux
 * ========================================================================
 * 
 * Ce fichier remplace les 6 fichiers précédents :
 * - leaflet-emergency.js
 * - cdn-neutralizer.js  
 * - resource-fallback.js
 * - leaflet-queue.js
 * - leaflet-compatibility.js
 * - emergency-maps.js
 */

(function() {
    'use strict';
    
    // =====================================================================
    // 1. DÉTECTION DU CONTEXTE RÉSEAU
    // =====================================================================
    
    const NetworkContext = {
        isHttps: window.location.protocol === 'https:',
        isProduction: window.location.hostname.includes('ptm.huma-num.fr'),
        get isPublicWifi() {
            return this.isHttps && this.isProduction;
        },
        cdnBlocked: false,
        initialized: false
    };
    
    // =====================================================================
    // 2. CONFIGURATION DES RESSOURCES
    // =====================================================================
    
    const RESOURCES = {
        // CSS Essentiels
        'https://unpkg.com/leaflet@1.9.3/dist/leaflet.css': {
            type: 'css',
            fallback: '/galligeo/node_modules/leaflet/dist/leaflet.css',
            essential: true
        },
        'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css': {
            type: 'css',
            fallback: '/galligeo/css/Control.Geocoder.css',
            essential: false
        },
        'https://rawgithub.com/ebrelsford/Leaflet.loading/master/src/Control.Loading.css': {
            type: 'css',
            fallback: '/galligeo/js/external/Control.Loading.css',
            essential: false
        },
        
        // JavaScript Essentiels
        'https://unpkg.com/leaflet@1.9.3/dist/leaflet.js': {
            type: 'js',
            fallback: '/galligeo/node_modules/leaflet/dist/leaflet.js',
            essential: true,
            globalCheck: () => window.L && typeof window.L.map === 'function'
        },
        'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js': {
            type: 'js',
            fallback: null, // Pas de fallback local
            essential: false,
            globalCheck: () => window.L && window.L.Control && window.L.Control.Geocoder
        },
        'https://rawgithub.com/ebrelsford/Leaflet.loading/master/src/Control.Loading.js': {
            type: 'js',
            fallback: '/galligeo/js/external/Control.Loading.js',
            essential: false,
            globalCheck: () => window.L && window.L.Control && window.L.Control.Loading
        },
        'https://unpkg.com/leaflet-rotate@0.2.8/dist/leaflet-rotate-src.js': {
            type: 'js',
            fallback: null,
            essential: false,
            globalCheck: () => window.L && window.L.Map && window.L.Map.prototype.setBearing
        }
    };
    
    // =====================================================================
    // 3. GESTIONNAIRE DE QUEUE POUR LEAFLET
    // =====================================================================
    
    const LeafletQueue = {
        queue: [],
        ready: false,
        
        add(callback, name = 'anonymous') {
            if (this.ready && this.isLeafletAvailable()) {
                try {
                    callback();
                } catch (e) {
                    console.error(`Erreur dans ${name}:`, e);
                }
            } else {
                this.queue.push({ callback, name });
                console.log(`📋 Ajouté à la queue Leaflet: ${name}`);
            }
        },
        
        process() {
            if (!this.isLeafletAvailable()) {
                console.warn('⚠️ Tentative de traitement de la queue sans Leaflet disponible');
                return;
            }
            
            this.ready = true;
            console.log(`🚀 Traitement de ${this.queue.length} éléments en queue`);
            
            while (this.queue.length > 0) {
                const { callback, name } = this.queue.shift();
                try {
                    callback();
                    console.log(`✅ Exécuté: ${name}`);
                } catch (e) {
                    console.error(`❌ Erreur dans ${name}:`, e);
                }
            }
        },
        
        isLeafletAvailable() {
            return window.L && typeof window.L.map === 'function';
        }
    };
    
    // =====================================================================
    // 4. GESTIONNAIRE DE FALLBACK
    // =====================================================================
    
    const FallbackManager = {
        
        async testCdnAvailability() {
            if (!NetworkContext.isPublicWifi) {
                return true; // Réseau normal, faire confiance aux CDN
            }
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                
                const response = await fetch('https://unpkg.com/leaflet@1.9.3/dist/leaflet.js', {
                    method: 'HEAD',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                return response.ok;
            } catch (e) {
                console.warn('🚫 CDN détecté comme bloqué:', e.message);
                return false;
            }
        },
        
        async activateIfNeeded() {
            if (!NetworkContext.isPublicWifi) {
                console.log('🌐 Réseau normal - CDN conservés');
                return false;
            }
            
            const cdnAvailable = await this.testCdnAvailability();
            
            if (!cdnAvailable) {
                console.warn('🔄 CDN bloqués - activation du mode fallback');
                NetworkContext.cdnBlocked = true;
                window.LEAFLET_FALLBACK_MODE = true;
                this.replaceCdnLinks();
                return true;
            }
            
            return false;
        },
        
        replaceCdnLinks() {
            let replacements = 0;
            
            // Remplacer les CSS
            document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                const resource = RESOURCES[link.href];
                if (resource && resource.fallback) {
                    console.log(`🔄 CSS: ${link.href} → ${resource.fallback}`);
                    link.href = resource.fallback;
                    replacements++;
                }
            });
            
            // Remplacer les scripts
            document.querySelectorAll('script[src]').forEach(script => {
                const resource = RESOURCES[script.src];
                if (resource && resource.fallback) {
                    console.log(`🔄 JS: ${script.src} → ${resource.fallback}`);
                    
                    const newScript = document.createElement('script');
                    newScript.src = resource.fallback;
                    newScript.async = false;
                    
                    script.parentNode.insertBefore(newScript, script);
                    script.remove();
                    replacements++;
                }
            });
            
            if (replacements > 0) {
                console.log(`✅ ${replacements} ressources remplacées par les fallbacks`);
                document.dispatchEvent(new CustomEvent('cdnFallbackActivated', {
                    detail: { replacements }
                }));
            }
        },
        
        async loadFallbackIfNeeded(url, resource) {
            if (!resource.essential || !resource.fallback) {
                return false;
            }
            
            try {
                if (resource.type === 'css') {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = resource.fallback;
                    document.head.appendChild(link);
                    return true;
                } else if (resource.type === 'js') {
                    return new Promise((resolve) => {
                        const script = document.createElement('script');
                        script.src = resource.fallback;
                        script.onload = () => resolve(true);
                        script.onerror = () => resolve(false);
                        document.head.appendChild(script);
                    });
                }
            } catch (e) {
                console.error(`Erreur chargement fallback ${resource.fallback}:`, e);
                return false;
            }
        }
    };
    
    // =====================================================================
    // 5. GESTIONNAIRE D'INITIALISATION
    // =====================================================================
    
    const InitManager = {
        
        async initialize() {
            console.log('🚀 Initialisation du gestionnaire Leaflet unifié');
            
            // 1. Détecter le contexte réseau et activer fallback si nécessaire
            const fallbackActivated = await FallbackManager.activateIfNeeded();
            
            // 2. Attendre que Leaflet soit disponible
            await this.waitForLeaflet();
            
            // 3. Traiter la queue
            LeafletQueue.process();
            
            // 4. Initialiser les cartes si la fonction existe
            this.initializeMapsIfAvailable();
            
            // 5. Exposer les utilitaires globalement
            this.exposeGlobalUtilities();
            
            NetworkContext.initialized = true;
            console.log('✅ Gestionnaire Leaflet initialisé');
        },
        
        async waitForLeaflet() {
            return new Promise((resolve) => {
                const checkLeaflet = () => {
                    if (LeafletQueue.isLeafletAvailable()) {
                        console.log('✅ Leaflet disponible');
                        resolve();
                    } else {
                        setTimeout(checkLeaflet, 50);
                    }
                };
                checkLeaflet();
            });
        },
        
        initializeMapsIfAvailable() {
            if (window.maps_initialized) {
                console.log('ℹ️ Les cartes sont déjà initialisées');
                return;
            }
            
            if (typeof initializeMaps === 'function') {
                console.log('🗺️ Initialisation des cartes');
                window.maps_initialized = true;
                initializeMaps();
            } else {
                console.log('ℹ️ Fonction initializeMaps non encore disponible, ajout à la queue');
                LeafletQueue.add(() => {
                    if (!window.maps_initialized && typeof initializeMaps === 'function') {
                        console.log('🗺️ Initialisation des cartes depuis la queue');
                        window.maps_initialized = true;
                        initializeMaps();
                    }
                }, 'initializeMaps');
            }
        },
        
        exposeGlobalUtilities() {
            window.LeafletLoader = {
                whenReady: (callback, name) => LeafletQueue.add(callback, name),
                isReady: () => LeafletQueue.ready && LeafletQueue.isLeafletAvailable(),
                getNetworkContext: () => ({ ...NetworkContext })
            };
            
            window.whenLeafletReady = window.LeafletLoader.whenReady;
        }
    };
    
    // =====================================================================
    // 6. DÉMARRAGE AUTOMATIQUE
    // =====================================================================
    
    // Démarrage immédiat ou au chargement du DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => InitManager.initialize());
    } else {
        InitManager.initialize();
    }
    
    document.addEventListener('leafletMapsReady', function(event) {
        if (event.detail) {
            Object.assign(window, event.detail);
            console.log('🔗 Variables de cartes exposées globalement');
        }
    });
    
})();
