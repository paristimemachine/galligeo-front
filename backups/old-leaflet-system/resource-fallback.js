/**
 * Système de fallback pour les ressources externes bloquées par CORS
 * Détecte les échecs de chargement et bascule vers les versions locales
 */

// Configuration des ressources avec leurs fallbacks locaux
const RESOURCE_FALLBACKS = {
    // CSS
    'https://unpkg.com/leaflet@1.9.3/dist/leaflet.css': {
        type: 'css',
        fallback: 'node_modules/leaflet/dist/leaflet.css',
        essential: true
    },
    // Leaflet Draw retiré - non utilisé dans cette application
    'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css': {
        type: 'css',
        fallback: 'css/Control.Geocoder.css', // À créer si nécessaire
        essential: false
    },
    'https://rawgithub.com/ebrelsford/Leaflet.loading/master/src/Control.Loading.css': {
        type: 'css',
        fallback: 'assets/Control.Loading.css',
        essential: false
    },
    
    // JavaScript
    'https://unpkg.com/leaflet@1.9.3/dist/leaflet.js': {
        type: 'js',
        fallback: 'node_modules/leaflet/dist/leaflet.js',
        essential: true,
        globalCheck: () => window.L !== undefined
    },
    'https://unpkg.com/leaflet-geosearch@3.1.0/dist/bundle.min.js': {
        type: 'js',
        fallback: 'node_modules/leaflet-geosearch/dist/bundle.min.js',
        essential: false,
        globalCheck: () => window.GeoSearch !== undefined
    }
};

/**
 * État du système de fallback
 */
let fallbackState = {
    cssFailures: 0,
    jsFailures: 0,
    totalFailures: 0,
    isPublicWifi: false,
    fallbacksLoaded: []
};

/**
 * Détecte si on est sur un WiFi public problématique
 */
function detectPublicWifiIssues() {
    const isHttps = window.location.protocol === 'https:';
    const isProduction = window.location.hostname.includes('ptm.huma-num.fr');
    return isHttps && isProduction;
}

/**
 * Chargement préemptif de Leaflet si WiFi public détecté
 */
function preloadLeafletIfNeeded() {
    if (detectPublicWifiIssues()) {
        console.warn('📶 WiFi public détecté - préchargement IMMÉDIAT de Leaflet');
        
        // Bloquer l'exécution pour charger Leaflet de manière synchrone
        const script = document.createElement('script');
        script.src = 'node_modules/leaflet/dist/leaflet.js';
        script.async = false; // CRITIQUE : chargement synchrone
        
        // CSS aussi
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'node_modules/leaflet/dist/leaflet.css';
        
        script.onload = () => {
            console.log('🚀 Leaflet préchargé IMMÉDIATEMENT');
            // Notifier que Leaflet est disponible
            document.dispatchEvent(new CustomEvent('leafletReady', { 
                detail: { source: 'immediate_preload' } 
            }));
        };
        
        script.onerror = () => {
            console.error('❌ Échec du préchargement IMMÉDIAT');
        };
        
        // Insérer en PREMIER dans le head pour priorité absolue
        document.head.insertBefore(script, document.head.firstChild);
        document.head.insertBefore(css, document.head.firstChild);
        
        return true;
    }
    return false;
}

/**
 * Crée un élément CSS avec fallback
 */
function createCssElement(href, fallbackHref) {
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        
        // Timeout pour détecter les échecs
        const timeout = setTimeout(() => {
            console.warn(`⏰ Timeout CSS: ${href}`);
            loadFallbackCss(fallbackHref).then(resolve).catch(reject);
        }, 5000);

        link.onload = () => {
            clearTimeout(timeout);
            console.log(`✅ CSS chargé: ${href}`);
            resolve(link);
        };

        link.onerror = () => {
            clearTimeout(timeout);
            console.warn(`❌ Échec CSS: ${href}, tentative fallback: ${fallbackHref}`);
            fallbackState.cssFailures++;
            fallbackState.totalFailures++;
            loadFallbackCss(fallbackHref).then(resolve).catch(reject);
        };

        link.href = href;
        document.head.appendChild(link);
    });
}

/**
 * Charge un CSS de fallback
 */
function loadFallbackCss(fallbackHref) {
    return new Promise((resolve, reject) => {
        const fallbackLink = document.createElement('link');
        fallbackLink.rel = 'stylesheet';
        fallbackLink.type = 'text/css';
        
        fallbackLink.onload = () => {
            console.log(`✅ CSS fallback chargé: ${fallbackHref}`);
            fallbackState.fallbacksLoaded.push(fallbackHref);
            resolve(fallbackLink);
        };

        fallbackLink.onerror = () => {
            console.error(`❌ Échec CSS fallback: ${fallbackHref}`);
            reject(new Error(`Fallback CSS failed: ${fallbackHref}`));
        };

        fallbackLink.href = fallbackHref;
        document.head.appendChild(fallbackLink);
    });
}

/**
 * Crée un élément JavaScript avec fallback
 */
function createJsElement(src, fallbackSrc, globalCheck) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        
        // Timeout pour détecter les échecs
        const timeout = setTimeout(() => {
            console.warn(`⏰ Timeout JS: ${src}`);
            loadFallbackJs(fallbackSrc, globalCheck).then(resolve).catch(reject);
        }, 10000);

        script.onload = () => {
            clearTimeout(timeout);
            
            // Vérifier si la variable globale est définie (pour détecter les échecs silencieux)
            if (globalCheck && !globalCheck()) {
                console.warn(`❌ Variable globale non définie après chargement: ${src}`);
                fallbackState.jsFailures++;
                fallbackState.totalFailures++;
                loadFallbackJs(fallbackSrc, globalCheck).then(resolve).catch(reject);
                return;
            }
            
            console.log(`✅ JS chargé: ${src}`);
            resolve(script);
        };

        script.onerror = () => {
            clearTimeout(timeout);
            console.warn(`❌ Échec JS: ${src}, tentative fallback: ${fallbackSrc}`);
            fallbackState.jsFailures++;
            fallbackState.totalFailures++;
            loadFallbackJs(fallbackSrc, globalCheck).then(resolve).catch(reject);
        };

        script.src = src;
        document.head.appendChild(script);
    });
}

/**
 * Charge un JavaScript de fallback
 */
function loadFallbackJs(fallbackSrc, globalCheck) {
    return new Promise((resolve, reject) => {
        const fallbackScript = document.createElement('script');
        
        fallbackScript.onload = () => {
            // Vérifier la variable globale après chargement du fallback
            if (globalCheck && !globalCheck()) {
                console.error(`❌ Variable globale non définie après fallback: ${fallbackSrc}`);
                reject(new Error(`Fallback JS failed - global check: ${fallbackSrc}`));
                return;
            }
            
            console.log(`✅ JS fallback chargé: ${fallbackSrc}`);
            fallbackState.fallbacksLoaded.push(fallbackSrc);
            resolve(fallbackScript);
        };

        fallbackScript.onerror = () => {
            console.error(`❌ Échec JS fallback: ${fallbackSrc}`);
            reject(new Error(`Fallback JS failed: ${fallbackSrc}`));
        };

        fallbackScript.src = fallbackSrc;
        document.head.appendChild(fallbackScript);
    });
}

/**
 * Surveille les erreurs de chargement des ressources existantes
 */
function monitorExistingResources() {
    fallbackState.isPublicWifi = detectPublicWifiIssues();
    
    // Surveiller les liens CSS
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        if (link.href && link.href.startsWith('http') && !link.href.includes(window.location.hostname)) {
            link.addEventListener('error', () => {
                console.warn(`🚨 Échec détecté sur CSS existant: ${link.href}`);
                fallbackState.cssFailures++;
                fallbackState.totalFailures++;
                
                // Chercher un fallback configuré
                const config = RESOURCE_FALLBACKS[link.href];
                if (config && config.fallback) {
                    loadFallbackCss(config.fallback).catch(err => {
                        console.error(`Impossible de charger le fallback CSS: ${config.fallback}`, err);
                    });
                }
            });
        }
    });

    // Surveiller les scripts
    document.querySelectorAll('script[src]').forEach(script => {
        if (script.src && script.src.startsWith('http') && !script.src.includes(window.location.hostname)) {
            script.addEventListener('error', () => {
                console.warn(`🚨 Échec détecté sur JS existant: ${script.src}`);
                fallbackState.jsFailures++;
                fallbackState.totalFailures++;
                
                // Chercher un fallback configuré
                const config = RESOURCE_FALLBACKS[script.src];
                if (config && config.fallback) {
                    loadFallbackJs(config.fallback, config.globalCheck).catch(err => {
                        console.error(`Impossible de charger le fallback JS: ${config.fallback}`, err);
                    });
                }
            });
        }
    });
}

/**
 * Affiche un rapport sur l'état des ressources
 */
function reportResourceStatus() {
    if (fallbackState.totalFailures > 0) {
        console.warn(`📊 Rapport de fallback:`);
        console.warn(`   CSS échués: ${fallbackState.cssFailures}`);
        console.warn(`   JS échués: ${fallbackState.jsFailures}`);
        console.warn(`   Total échecs: ${fallbackState.totalFailures}`);
        console.warn(`   Fallbacks chargés: ${fallbackState.fallbacksLoaded.length}`);
        console.warn(`   WiFi public détecté: ${fallbackState.isPublicWifi ? 'Oui' : 'Non'}`);
        
        if (fallbackState.fallbacksLoaded.length > 0) {
            console.info(`✅ Fallbacks réussis:`, fallbackState.fallbacksLoaded);
        }
        
        // Notifier l'application principale
        document.dispatchEvent(new CustomEvent('resourceFallbackReport', { 
            detail: fallbackState 
        }));
    }
}

/**
 * Vérifie si Leaflet est disponible et fonctionnel
 */
function checkLeafletAvailability() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 30; // 3 secondes max
        
        const checkInterval = setInterval(() => {
            attempts++;
            
            if (window.L && typeof window.L.map === 'function') {
                clearInterval(checkInterval);
                console.log('✅ Leaflet est disponible et fonctionnel');
                
                // Notifier que Leaflet est prêt
                document.dispatchEvent(new CustomEvent('leafletReady', { 
                    detail: { source: 'normal_load' } 
                }));
                
                resolve(true);
                return;
            }
            
            if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.error('❌ Leaflet non disponible après 3 secondes');
                resolve(false);
            }
        }, 100);
    });
}

/**
 * Charge Leaflet de manière forcée et synchrone
 */
function forceLoadLeaflet() {
    return new Promise((resolve, reject) => {
        console.log('🔄 Chargement forcé de Leaflet...');
        
        const script = document.createElement('script');
        script.src = 'node_modules/leaflet/dist/leaflet.js';
        
        script.onload = () => {
            // Attendre un peu que L soit bien défini
            setTimeout(() => {
                if (window.L && typeof window.L.map === 'function') {
                    console.log('✅ Leaflet forcé chargé avec succès');
                    
                    // Notifier que Leaflet est prêt
                    document.dispatchEvent(new CustomEvent('leafletReady', { 
                        detail: { source: 'force_load' } 
                    }));
                    
                    resolve(true);
                } else {
                    console.error('❌ Leaflet chargé mais L non défini');
                    reject(new Error('Leaflet loaded but L undefined'));
                }
            }, 100);
        };
        
        script.onerror = () => {
            console.error('❌ Échec du chargement forcé de Leaflet');
            reject(new Error('Failed to force load Leaflet'));
        };
        
        document.head.appendChild(script);
    });
}

/**
 * Initialise le système de fallback
 */
function initResourceFallback() {
    console.log('🔄 Initialisation du système de fallback des ressources');
    
    // Détecter immédiatement si on est sur WiFi public
    fallbackState.isPublicWifi = detectPublicWifiIssues();
    
    if (fallbackState.isPublicWifi) {
        console.warn('📶 WiFi public détecté - surveillance renforcée des ressources');
        
        // Précharger Leaflet si nécessaire
        const preloaded = preloadLeafletIfNeeded();
        if (preloaded) {
            console.log('🚀 Préchargement Leaflet initié');
        }
    }
    
    // Commencer la surveillance
    monitorExistingResources();
    
    // Rapport après 4 secondes (plus de temps pour le préchargement)
    setTimeout(reportResourceStatus, 4000);
    
    // Vérification spécifique de Leaflet après 1.5 secondes
    setTimeout(async () => {
        const leafletOk = await checkLeafletAvailability();
        if (!leafletOk) {
            console.error('🚨 Leaflet non fonctionnel - chargement forcé');
            
            // Charger Leaflet en mode forcé
            try {
                await forceLoadLeaflet();
                console.log('✅ Leaflet chargé en mode forcé');
            } catch (error) {
                console.error('❌ Échec total du chargement Leaflet:', error);
                
                // Dernier recours : notifier l'échec
                document.dispatchEvent(new CustomEvent('leafletFailed', { 
                    detail: { error: error.message } 
                }));
            }
        }
    }, 1500);
}

/**
 * Affiche une notification de fallback à l'utilisateur
 */
function showFallbackNotification() {
    // Éviter les doublons
    if (document.getElementById('fallback-notification')) {
        return;
    }
    
    const notification = document.createElement('div');
    notification.id = 'fallback-notification';
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #fdcb6e;
        border: 2px solid #e17055;
        border-radius: 8px;
        padding: 15px;
        max-width: 350px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: Arial, sans-serif;
        animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 10px;">
            <span style="font-size: 20px;">🔄</span>
            <div style="flex: 1;">
                <h4 style="margin: 0 0 5px 0; color: #2d3436; font-size: 14px;">Ressources de secours chargées</h4>
                <p style="margin: 0; font-size: 12px; line-height: 1.3; color: #636e72;">
                    Certaines ressources externes ont été remplacées par des versions locales pour contourner les restrictions réseau.
                </p>
            </div>
            <button onclick="hideFallbackNotification()" style="
                background: none; 
                border: none; 
                font-size: 16px; 
                cursor: pointer; 
                color: #636e72;
                padding: 0;
                width: 20px;
                height: 20px;
            ">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-masquer après 8 secondes
    setTimeout(() => {
        if (document.getElementById('fallback-notification')) {
            hideFallbackNotification();
        }
    }, 8000);
}

/**
 * Masque la notification de fallback
 */
function hideFallbackNotification() {
    const notification = document.getElementById('fallback-notification');
    if (notification) {
        notification.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => notification.remove(), 300);
    }
}

// Écouter les rapports de fallback pour afficher des notifications
document.addEventListener('resourceFallbackReport', (event) => {
    const state = event.detail;
    if (state.fallbacksLoaded.length > 0) {
        showFallbackNotification();
    }
});

// Exposer les fonctions globalement
window.initResourceFallback = initResourceFallback;
window.fallbackState = fallbackState;
window.hideFallbackNotification = hideFallbackNotification;
window.preloadLeafletIfNeeded = preloadLeafletIfNeeded;
window.forceLoadLeaflet = forceLoadLeaflet;

// Auto-initialisation IMMÉDIATE pour le préchargement
if (detectPublicWifiIssues()) {
    console.warn('🚨 WiFi public détecté - chargement IMMÉDIAT du fallback');
    
    // Charger Leaflet de manière synchrone IMMÉDIATEMENT
    const leafletScript = document.createElement('script');
    leafletScript.src = 'node_modules/leaflet/dist/leaflet.js';
    leafletScript.async = false; // Synchrone
    
    const leafletCSS = document.createElement('link');
    leafletCSS.rel = 'stylesheet';
    leafletCSS.href = 'node_modules/leaflet/dist/leaflet.css';
    
    // Insérer en PREMIER
    document.head.insertBefore(leafletCSS, document.head.firstChild);
    document.head.insertBefore(leafletScript, document.head.firstChild);
    
    console.log('⚡ Scripts Leaflet injectés en priorité absolue');
}

// Initialisation complète selon l'état du DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResourceFallback);
} else {
    initResourceFallback();
}
