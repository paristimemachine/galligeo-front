/**
 * Gestionnaire pour vérifier les capacités du serveur de géoréférencement
 * et adapter le comportement selon le support des utilisateurs anonymes
 */
class GeoreferencingCapabilityChecker {
    constructor() {
        this.capabilities = null;
        this.lastCheck = null;
        this.checkInterval = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Vérifie si le serveur supporte les requêtes anonymes
     */
    async checkAnonymousSupport() {
        const now = Date.now();
        
        // Cache la vérification pendant 5 minutes
        if (this.capabilities && this.lastCheck && (now - this.lastCheck) < this.checkInterval) {
            return this.capabilities;
        }

        try {
            console.log('🔍 Vérification des capacités du serveur de géoréférencement...');
            
            // Test avec une requête légère sur l'endpoint health de l'API Galligeo
            const healthUrl = 'https://api.ptm.huma-num.fr/galligeo/health';
            const testResponse = await fetch(healthUrl, {
                method: 'GET',
                headers: {
                    'X-Anonymous-Test': 'true',
                    'X-Client-Type': 'galligeo-capability-check'
                }
            });

            this.capabilities = {
                anonymous: testResponse.ok || testResponse.status !== 401,
                lastCheck: now,
                serverStatus: testResponse.status
            };

            this.lastCheck = now;
            
            console.log('📊 Capacités serveur:', this.capabilities);
            
        } catch (error) {
            console.warn('❌ Impossible de vérifier les capacités du serveur:', error);
            
            // Assumé que l'anonyme n'est pas supporté en cas d'erreur
            this.capabilities = {
                anonymous: false,
                lastCheck: now,
                error: error.message
            };
        }

        return this.capabilities;
    }

    /**
     * Affiche un avertissement si le géoréférencement anonyme n'est pas disponible
     */
    async showAnonymousWarningIfNeeded() {
        if (window.ptmAuth && window.ptmAuth.isAuthenticated()) {
            return; // Utilisateur connecté, pas besoin d'avertissement
        }

        const capabilities = await this.checkAnonymousSupport();
        
        if (!capabilities.anonymous) {
            // Au lieu d'une bannière, on met à jour les tooltips des boutons
            this.updateButtonTooltipsForLimitation();
        }
    }

    /**
     * Met à jour les tooltips des boutons pour indiquer les limitations
     */
    updateButtonTooltipsForLimitation() {
        const georefButton = document.getElementById('btn_georef');
        if (georefButton) {
            georefButton.title = 'Géoréférencement actuellement réservé aux utilisateurs connectés. Cliquez pour plus d\'infos.';
        }
        
        console.log('💡 Pour utiliser le géoréférencement, connectez-vous avec ORCID');
    }

    /**
     * Affiche une notification sur les limitations du géoréférencement anonyme
     * DÉSACTIVÉE - Remplacée par des tooltips discrets
     */
    displayAnonymousLimitation() {
        // Plus de bannière fixe - on utilise juste les tooltips et messages d'erreur
        console.log('⚠️ Géoréférencement limité aux utilisateurs connectés');
        return;
    }

    /**
     * Masque l'avertissement d'anonyme
     * DÉSACTIVÉE - Plus de bannières à masquer
     */
    hideAnonymousWarning() {
        // Plus de bannière à masquer
        console.log('🔕 Nettoyage des avertissements anonymes (désactivé)');
    }

    /**
     * Suggère des alternatives pour les utilisateurs anonymes
     */
    suggestAlternatives() {
        console.log('💡 Alternatives pour les utilisateurs anonymes:');
        console.log('1. Connexion ORCID pour accès complet');
        console.log('2. Sauvegarde locale des points de contrôle');
        console.log('3. Migration automatique lors de la connexion');
        
        return {
            login: 'https://api.ptm.huma-num.fr/auth/login?redirect_url=' + encodeURIComponent(window.location.href),
            localSave: true,
            migration: true
        };
    }
}

// Instance globale
window.georefCapabilityChecker = new GeoreferencingCapabilityChecker();

// Vérification automatique au chargement
document.addEventListener('DOMContentLoaded', async () => {
    // Attendre un peu que tout soit chargé
    setTimeout(async () => {
        if (window.georefCapabilityChecker) {
            await window.georefCapabilityChecker.showAnonymousWarningIfNeeded();
        }
    }, 2000);
});

// Écouter les changements d'authentification
document.addEventListener('userLoggedIn', () => {
    if (window.georefCapabilityChecker) {
        window.georefCapabilityChecker.hideAnonymousWarning();
    }
});

document.addEventListener('userLoggedOut', async () => {
    if (window.georefCapabilityChecker) {
        await window.georefCapabilityChecker.showAnonymousWarningIfNeeded();
    }
});

// Fonction utilitaire globale
window.checkGeorefCapabilities = () => {
    if (window.georefCapabilityChecker) {
        return window.georefCapabilityChecker.checkAnonymousSupport();
    }
    return Promise.resolve({ anonymous: false, error: 'Checker non disponible' });
};