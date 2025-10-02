/**
 * Script de diagnostic d'authentification pour Galligeo
 * À intégrer temporairement sur les pages principales pour débugger
 */

(function() {
    // Éviter les exécutions multiples
    if (window.galligeoAuthDiagnostic) return;
    window.galligeoAuthDiagnostic = true;

    console.log('🔍 === DIAGNOSTIC AUTHENTIFICATION GALLIGEO ===');
    
    // Fonction utilitaire de logging
    function logDiag(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    // Vérifier la disponibilité des systèmes d'authentification
    function checkAuthSystems() {
        logDiag('Vérification des systèmes d\'authentification...');
        
        // Ancien système
        const oldAuth = window.ptmAuthOld;
        if (oldAuth) {
            logDiag('Ancien système (ptmAuthOld) disponible', 'success');
        } else {
            logDiag('Ancien système non trouvé', 'warning');
        }
        
        // Nouveau système fixe
        const newAuthFixed = window.ptmAuthFixed;
        if (newAuthFixed) {
            logDiag('Nouveau système fixe (ptmAuthFixed) disponible', 'success');
        } else {
            logDiag('Nouveau système fixe non trouvé', 'error');
        }
        
        // Système wrapper
        const wrapper = window.ptmAuth;
        if (wrapper) {
            logDiag('Système wrapper (ptmAuth) disponible', 'success');
            if (wrapper.fixed) {
                logDiag('Wrapper correctement lié au système fixe', 'success');
            } else {
                logDiag('Wrapper non lié au système fixe', 'error');
            }
        } else {
            logDiag('Système wrapper non trouvé', 'error');
        }
    }

    // Vérifier l'état des tokens
    function checkTokens() {
        logDiag('Vérification des tokens...');
        
        // Token authentifié
        const authToken = localStorage.getItem('ptm_auth_token');
        if (authToken) {
            logDiag(`Token authentifié trouvé: ${authToken.substring(0, 30)}...`);
            try {
                const payload = JSON.parse(atob(authToken.split('.')[1]));
                const exp = new Date(payload.exp * 1000);
                const now = new Date();
                if (exp > now) {
                    logDiag(`Token valide jusqu'à: ${exp.toLocaleString()}`, 'success');
                } else {
                    logDiag(`Token expiré depuis: ${exp.toLocaleString()}`, 'error');
                }
            } catch (e) {
                logDiag('Token invalide (format incorrect)', 'error');
            }
        } else {
            logDiag('Aucun token authentifié trouvé');
        }
        
        // Token anonyme
        const anonToken = localStorage.getItem('anonymous_token');
        const anonExpires = localStorage.getItem('anonymous_token_expires');
        if (anonToken) {
            logDiag(`Token anonyme trouvé: ${anonToken.substring(0, 30)}...`);
            if (anonExpires) {
                const exp = new Date(parseInt(anonExpires));
                const now = new Date();
                if (exp > now) {
                    logDiag(`Token anonyme valide jusqu'à: ${exp.toLocaleString()}`, 'success');
                } else {
                    logDiag(`Token anonyme expiré depuis: ${exp.toLocaleString()}`, 'warning');
                }
            }
        } else {
            logDiag('Aucun token anonyme trouvé');
        }
    }

    // Test basique de connectivité
    async function testBasicConnectivity() {
        if (!window.ptmAuthFixed) {
            logDiag('Système fixe non disponible pour les tests', 'error');
            return;
        }

        logDiag('Test de connectivité API...');
        
        try {
            const connectivity = await window.ptmAuthFixed.testApiConnectivity();
            logDiag(`Résultats connectivité: ${JSON.stringify(connectivity)}`);
            
            if (connectivity.authenticated) {
                logDiag('API authentifiée fonctionnelle', 'success');
            } else if (connectivity.anonymous_simple || connectivity.anonymous_token) {
                logDiag('Mode anonyme fonctionnel', 'success');
            } else {
                logDiag('Aucune API fonctionnelle', 'error');
            }
        } catch (error) {
            logDiag(`Erreur test connectivité: ${error.message}`, 'error');
        }
    }

    // Diagnostic complet
    async function runFullDiagnostic() {
        logDiag('=== DÉBUT DIAGNOSTIC COMPLET ===');
        
        checkAuthSystems();
        checkTokens();
        await testBasicConnectivity();
        
        // Afficher les détails de la page
        logDiag(`Page courante: ${window.location.pathname}`);
        logDiag(`URL complète: ${window.location.href}`);
        
        // Vérifier les ARK dans l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const ark = urlParams.get('ark');
        if (ark) {
            logDiag(`ARK détecté dans l'URL: ${ark}`, 'success');
        } else {
            logDiag('Aucun ARK dans l\'URL');
        }
        
        logDiag('=== FIN DIAGNOSTIC ===');
    }

    // Créer une interface de debug si nous sommes en mode dev
    function createDebugInterface() {
        if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) {
            return; // Pas en développement
        }

        const debugPanel = document.createElement('div');
        debugPanel.id = 'galligeo-auth-debug';
        debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 10px;
            border-radius: 5px;
            z-index: 10000;
            font-family: monospace;
            font-size: 12px;
            max-width: 300px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;
        
        debugPanel.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">🔧 Debug Auth</div>
            <button onclick="window.galligeoAuthDiagnostic.runFullDiagnostic()" style="margin: 2px; padding: 4px 8px; font-size: 11px;">Diagnostic</button>
            <button onclick="window.galligeoAuthDiagnostic.testAuth()" style="margin: 2px; padding: 4px 8px; font-size: 11px;">Test Auth</button>
            <button onclick="document.getElementById('galligeo-auth-debug').remove()" style="margin: 2px; padding: 4px 8px; font-size: 11px;">Fermer</button>
        `;
        
        document.body.appendChild(debugPanel);
        
        // Auto-supprimer après 30 secondes
        setTimeout(() => {
            if (document.getElementById('galligeo-auth-debug')) {
                debugPanel.remove();
            }
        }, 30000);
    }

    // Test rapide d'authentification
    async function testAuth() {
        if (!window.ptmAuthFixed) {
            logDiag('Système d\'authentification non disponible', 'error');
            return;
        }

        logDiag('Test rapide d\'authentification...');
        
        if (window.ptmAuthFixed.isAuthenticated()) {
            logDiag('Utilisateur authentifié détecté', 'success');
            try {
                const profile = await window.ptmAuthFixed.getUserProfile();
                logDiag(`Profil: ${profile.name || 'N/A'}`, 'success');
            } catch (error) {
                logDiag(`Erreur récupération profil: ${error.message}`, 'error');
            }
        } else {
            logDiag('Utilisateur non authentifié - test mode anonyme...');
            try {
                await window.ptmAuthFixed.getValidAnonymousToken();
                logDiag('Mode anonyme fonctionnel', 'success');
            } catch (error) {
                logDiag(`Mode anonyme non fonctionnel: ${error.message}`, 'warning');
            }
        }
    }

    // Exposer les fonctions pour debug manuel
    window.galligeoAuthDiagnostic = {
        runFullDiagnostic,
        testAuth,
        checkAuthSystems,
        checkTokens,
        testBasicConnectivity
    };

    // Exécution automatique
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            runFullDiagnostic();
            createDebugInterface();
        }, 1000);
    });

    // Si DOM déjà chargé
    if (document.readyState === 'loading') {
        // DOM pas encore chargé, l'événement sera déclenché
    } else {
        // DOM déjà chargé
        setTimeout(() => {
            runFullDiagnostic();
            createDebugInterface();
        }, 1000);
    }

    logDiag('Script de diagnostic chargé');
})();