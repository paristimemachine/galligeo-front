/**
 * Gestionnaire pour les fonctionnalités des utilisateurs anonymes
 * Affiche des informations et gère les limitations pour les utilisateurs non connectés
 */
class AnonymousUserManager {
    constructor() {
        this.init();
    }

    async init() {
        // Vérifier si l'utilisateur est anonyme et afficher les informations appropriées
        this.updateUIForAnonymousUser();
        this.addAnonymousUserNotifications();
    }

    /**
     * Met à jour l'interface utilisateur pour les utilisateurs anonymes
     */
    updateUIForAnonymousUser() {
        if (window.ptmAuth && !window.ptmAuth.isAuthenticated()) {
            // Plus de bannière - seulement les tooltips discrets
            this.addTooltipsForAnonymousFeatures();
        }
    }

    /**
     * Affiche une bannière d'information pour les utilisateurs anonymes
     * DÉSACTIVÉE - Causait des problèmes de layout
     */
    showAnonymousUserBanner() {
        // Fonction désactivée pour éviter les problèmes de sticky footer
        console.log('🔕 Bannière anonyme désactivée (problèmes de layout)');
        return;
    }

    /**
     * Ajoute des tooltips explicatifs pour les fonctionnalités disponibles en mode anonyme
     */
    addTooltipsForAnonymousFeatures() {
        // Tooltip pour le bouton de géoréférencement - informatif uniquement
        const georefButton = document.getElementById('btn_georef');
        if (georefButton && !georefButton.disabled) {
            // Seulement ajouter une mention discrète dans le tooltip existant
            const originalTitle = georefButton.title;
            if (originalTitle && !originalTitle.includes('Mode anonyme')) {
                georefButton.title = `${originalTitle} (Mode anonyme - sauvegarde locale)`;
            }
        }

        // Tooltip pour le bouton de dépôt
        const depositButton = document.getElementById('btn_deposit');
        if (depositButton) {
            const originalTitle = depositButton.title || 'Déposer sur Nakala';
            if (!originalTitle.includes('Connectez-vous')) {
                depositButton.title = 'Connectez-vous pour déposer sur Nakala';
            }
        }
    }

    /**
     * Ajoute des notifications contextuelles pour les utilisateurs anonymes
     */
    addAnonymousUserNotifications() {
        // Notification après géoréférencement réussi
        this.addPostGeorefNotification();
    }

    /**
     * Notification affichée après un géoréférencement réussi pour les utilisateurs anonymes
     */
    addPostGeorefNotification() {
        // Écouter les événements de géoréférencement réussi
        document.addEventListener('georeferencing-success', (event) => {
            if (window.ptmAuth && !window.ptmAuth.isAuthenticated()) {
                this.showPostGeorefMessage();
            }
        });
    }

    /**
     * Affiche un message après géoréférencement pour les utilisateurs anonymes
     */
    showPostGeorefMessage() {
        const existingMessage = document.getElementById('anonymous-georef-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const message = document.createElement('div');
        message.id = 'anonymous-georef-message';
        message.className = 'fr-alert fr-alert--success fr-mt-2w';
        message.innerHTML = `
            <p class="fr-alert__title">Géoréférencement réussi !</p>
            <p>Votre carte a été géoréférencée et sauvegardée localement. 
            Pour sauvegarder vos travaux de manière permanente et les synchroniser entre appareils, 
            <a href="https://api.ptm.huma-num.fr/auth/login?redirect_url=${encodeURIComponent(window.location.href)}" 
               class="fr-link">connectez-vous avec ORCID</a>.</p>
        `;

        // Insérer après le bouton de géoréférencement
        const georefButton = document.getElementById('btn_georef');
        if (georefButton && georefButton.parentNode) {
            georefButton.parentNode.insertBefore(message, georefButton.nextSibling);
            
            // Supprimer le message après 10 secondes
            setTimeout(() => {
                if (message.parentNode) {
                    message.remove();
                }
            }, 10000);
        }
    }

    /**
     * Affiche des informations sur les données sauvegardées localement
     */
    showLocalStorageInfo() {
        const anonymousMaps = window.ptmAuth.getAnonymousWorkedMaps();
        if (anonymousMaps.length > 0) {
            console.log(`${anonymousMaps.length} carte(s) sauvegardée(s) localement en mode anonyme`);
            
            const infoElement = document.createElement('div');
            infoElement.className = 'fr-callout fr-callout--brown-caramel fr-mt-2w';
            infoElement.innerHTML = `
                <h3 class="fr-callout__title">Données locales</h3>
                <p class="fr-callout__text">
                    Vous avez ${anonymousMaps.length} carte(s) géoréférencée(s) sauvegardée(s) localement.
                    Ces données restent sur cet appareil uniquement.
                </p>
            `;

            // Ajouter l'information dans la section appropriée
            const container = document.getElementById('worked-maps-container');
            if (container) {
                container.insertBefore(infoElement, container.firstChild);
            }
        }
    }

    /**
     * Migre les données anonymes vers un compte utilisateur lors de la connexion
     */
    async migrateAnonymousData() {
        if (window.ptmAuth && window.ptmAuth.isAuthenticated()) {
            const anonymousMaps = window.ptmAuth.getAnonymousWorkedMaps();
            
            if (anonymousMaps.length > 0) {
                console.log(`Migration de ${anonymousMaps.length} cartes anonymes vers le compte utilisateur...`);
                
                let migratedCount = 0;
                for (const map of anonymousMaps) {
                    try {
                        await window.ptmAuth.updateWorkedMap(map.ark, map, map.status);
                        migratedCount++;
                    } catch (error) {
                        console.error(`Erreur lors de la migration de la carte ${map.ark}:`, error);
                    }
                }
                
                if (migratedCount > 0) {
                    // Supprimer les données anonymes après migration réussie
                    localStorage.removeItem('galligeo_anonymous_maps');
                    
                    // Afficher une notification de migration réussie
                    this.showMigrationSuccessMessage(migratedCount);
                }
            }
        }
    }

    /**
     * Affiche un message de migration réussie
     */
    showMigrationSuccessMessage(count) {
        const message = document.createElement('div');
        message.className = 'fr-alert fr-alert--success fr-mt-2w';
        message.innerHTML = `
            <p class="fr-alert__title">Migration réussie</p>
            <p>${count} carte(s) ont été migrées depuis votre stockage local vers votre compte.</p>
        `;

        const mainContent = document.querySelector('main') || document.body;
        mainContent.insertBefore(message, mainContent.firstChild);
        
        // Supprimer le message après 8 secondes
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 8000);
    }
}

// Instance globale
window.anonymousUserManager = new AnonymousUserManager();

// Écouter les événements de connexion pour migrer les données
document.addEventListener('userLoggedIn', async () => {
    await window.anonymousUserManager.migrateAnonymousData();
});

// Écouter les changements d'état d'authentification
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier périodiquement l'état d'authentification pour mettre à jour l'UI
    setInterval(() => {
        window.anonymousUserManager.updateUIForAnonymousUser();
    }, 5000);
});