/**
 * Gestionnaire des paramètres de l'application
 * Utilise le FormGenerator pour créer dynamiquement le formulaire de paramètres
 */
class SettingsManager {
    constructor() {
        this.formGenerator = new FormGenerator('./config/settings-form.json');
        this.settings = {};
    }

    /**
     * Initialise le gestionnaire des paramètres
     */
    async init(containerId) {
        try {
            // Charger la configuration
            await this.formGenerator.loadConfig();
            
            // Générer le formulaire
            const form = this.formGenerator.generateForm(containerId);
            
            // Charger les paramètres sauvegardés
            this.loadSettings();
            
            // Configurer les gestionnaires d'événements
            this.setupEventHandlers();
            
            console.log('Gestionnaire des paramètres initialisé avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des paramètres:', error);
        }
    }

    /**
     * Configure les gestionnaires d'événements
     */
    setupEventHandlers() {
        // Gestionnaire de soumission du formulaire
        this.formGenerator.onSubmit(async (data, event) => {
            await this.saveSettings(data);
        });

        // Gestionnaire pour détecter les changements en temps réel (optionnel)
        const form = document.getElementById('settings-form');
        if (form) {
            form.addEventListener('change', (event) => {
                // Optionnel: sauvegarder automatiquement à chaque changement
                // const data = this.formGenerator.getFormData();
                // this.saveSettings(data);
            });
        }
    }

    /**
     * Charge les paramètres depuis le localStorage et/ou le serveur
     */
    async loadSettings() {
        try {
            // Charger les paramètres locaux d'abord
            const localSettings = this.loadLocalSettings();
            
            // Si l'utilisateur est authentifié, essayer de charger les paramètres du serveur
            if (window.ptmAuth && window.ptmAuth.isAuthenticated()) {
                try {
                    console.log('Utilisateur authentifié, chargement des paramètres depuis le serveur...');
                    const cloudSettings = await window.ptmAuth.getGalligeoSettings();
                    
                    if (cloudSettings) {
                        // Utiliser les paramètres du cloud
                        this.settings = cloudSettings;
                        this.saveLocalSettings(this.settings); // Synchroniser le localStorage
                        this.formGenerator.populateForm(this.settings);
                        console.log('Paramètres chargés depuis le serveur:', this.settings);
                        
                        // Déclencher un événement pour notifier l'application
                        this.notifySettingsLoaded(this.settings, 'cloud');
                        return;
                    } else {
                        console.log('Aucun paramètre trouvé sur le serveur, utilisation des paramètres locaux');
                    }
                } catch (error) {
                    console.warn('Erreur lors du chargement depuis le serveur, utilisation des paramètres locaux:', error);
                }
            }
            
            // Utiliser les paramètres locaux ou appliquer les valeurs par défaut
            if (localSettings && Object.keys(localSettings).length > 0) {
                this.settings = localSettings;
                this.formGenerator.populateForm(this.settings);
                console.log('Paramètres locaux chargés:', this.settings);
                this.notifySettingsLoaded(this.settings, 'local');
            } else {
                // Premier chargement - appliquer les valeurs par défaut
                this.applyDefaultSettings();
                this.notifySettingsLoaded(this.settings, 'default');
            }
            
        } catch (error) {
            console.error('Erreur lors du chargement des paramètres:', error);
            // En cas d'erreur, appliquer les valeurs par défaut
            this.applyDefaultSettings();
            this.notifySettingsLoaded(this.settings, 'error');
        }
    }

    /**
     * Charge les paramètres depuis le localStorage uniquement
     */
    loadLocalSettings() {
        try {
            const savedSettings = localStorage.getItem('galligeo-settings');
            if (savedSettings) {
                return JSON.parse(savedSettings);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des paramètres locaux:', error);
        }
        return {};
    }

    /**
     * Sauvegarde les paramètres dans le localStorage uniquement
     */
    saveLocalSettings(settings) {
        try {
            localStorage.setItem('galligeo-settings', JSON.stringify(settings));
            localStorage.setItem('galligeo-settings-timestamp', new Date().toISOString());
        } catch (error) {
            console.error('Erreur lors de la sauvegarde locale:', error);
        }
    }

    /**
     * Applique les valeurs par défaut définies dans la configuration
     */
    applyDefaultSettings() {
        const defaultSettings = {};
        
        if (this.formGenerator.config && this.formGenerator.config.fields) {
            this.formGenerator.config.fields.forEach(field => {
                if (field.defaultValue !== undefined) {
                    defaultSettings[field.name] = field.defaultValue;
                }
            });
        }
        
        if (Object.keys(defaultSettings).length > 0) {
            this.settings = defaultSettings;
            this.saveSettings(this.settings);
            console.log('Valeurs par défaut appliquées:', this.settings);
        }
    }

    /**
     * Sauvegarde les paramètres dans le localStorage et sur le serveur
     */
    async saveSettings(data) {
        try {
            // Mettre à jour les paramètres locaux
            this.settings = { ...this.settings, ...data };
            
            // Sauvegarder localement
            this.saveLocalSettings(this.settings);
            
            // Si l'utilisateur est authentifié, sauvegarder sur le serveur
            if (window.ptmAuth && window.ptmAuth.isAuthenticated()) {
                try {
                    await window.ptmAuth.saveGalligeoSettings(this.settings);
                    this.showNotification('Paramètres sauvegardés avec succès', 'success');
                    console.log('Paramètres sauvegardés sur le serveur:', this.settings);
                } catch (serverError) {
                    console.warn('Erreur serveur, sauvegarde locale uniquement:', serverError);
                    this.showNotification('Paramètres sauvegardés localement (erreur serveur)', 'warning');
                }
            } else {
                this.showNotification('Paramètres sauvegardés localement', 'info');
                console.log('Paramètres sauvegardés localement (utilisateur non connecté):', this.settings);
            }
            
            // Émettre un événement personnalisé pour notifier les autres composants
            const event = new CustomEvent('settingsUpdated', { 
                detail: { settings: this.settings } 
            });
            document.dispatchEvent(event);
            
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des paramètres:', error);
            this.showNotification('Erreur lors de la sauvegarde', 'error');
        }
    }

    /**
     * Notifie que les paramètres ont été chargés
     */
    notifySettingsLoaded(settings, source) {
        const event = new CustomEvent('settingsLoaded', {
            detail: { 
                settings: settings,
                source: source // 'cloud', 'local', 'default', 'error'
            }
        });
        document.dispatchEvent(event);
        
        console.log(`Paramètres chargés depuis: ${source}`, settings);
    }

    /**
     * Récupère un paramètre spécifique
     */
    getSetting(key, defaultValue = null) {
        return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
    }

    /**
     * Définit un paramètre spécifique
     */
    setSetting(key, value) {
        this.settings[key] = value;
        localStorage.setItem('galligeo-settings', JSON.stringify(this.settings));
    }

    /**
     * Remet les paramètres à leurs valeurs par défaut
     */
    async resetSettings() {
        if (confirm('Êtes-vous sûr de vouloir remettre tous les paramètres à leurs valeurs par défaut ?')) {
            try {
                // Vider les paramètres actuels
                this.settings = {};
                localStorage.removeItem('galligeo-settings');
                localStorage.removeItem('galligeo-settings-timestamp');
                
                // Appliquer les valeurs par défaut
                this.applyDefaultSettings();
                
                // Repeupler le formulaire avec les valeurs par défaut
                this.formGenerator.populateForm(this.settings);
                
                // Si l'utilisateur est authentifié, supprimer aussi du serveur
                if (window.ptmAuth && window.ptmAuth.isAuthenticated()) {
                    try {
                        await window.galligeoSettingsAPI.deleteSettings();
                        // Puis sauvegarder les nouvelles valeurs par défaut
                        await window.galligeoSettingsAPI.saveSettings(this.settings);
                        this.showNotification('Paramètres remis aux valeurs par défaut', 'success');
                    } catch (serverError) {
                        console.warn('Erreur serveur lors de la réinitialisation:', serverError);
                        this.showNotification('Paramètres remis aux valeurs par défaut (localement)', 'warning');
                    }
                } else {
                    this.showNotification('Paramètres remis aux valeurs par défaut', 'info');
                }
                
            } catch (error) {
                console.error('Erreur lors de la réinitialisation:', error);
                this.showNotification('Erreur lors de la réinitialisation', 'error');
            }
        }
    }

    /**
     * Exporte les paramètres au format JSON
     */
    exportSettings() {
        const dataStr = JSON.stringify(this.settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'galligeo-settings.json';
        link.click();
    }

    /**
     * Importe des paramètres depuis un fichier JSON
     */
    importSettings(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedSettings = JSON.parse(e.target.result);
                this.settings = importedSettings;
                this.saveSettings(this.settings);
                this.formGenerator.populateForm(this.settings);
                this.showNotification('Paramètres importés avec succès', 'success');
            } catch (error) {
                console.error('Erreur lors de l\'importation:', error);
                this.showNotification('Erreur lors de l\'importation du fichier', 'error');
            }
        };
        reader.readAsText(file);
    }

    /**
     * Affiche une notification (à adapter selon votre système de notifications)
     */
    showNotification(message, type = 'info') {
        // Si vous utilisez le système de notifications DSFR
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Créer une notification DSFR temporaire
        const notification = document.createElement('div');
        const alertClass = type === 'success' ? 'info' : 
                          type === 'warning' ? 'warning' : 
                          type === 'error' ? 'error' : 'info';
        
        notification.className = `fr-alert fr-alert--${alertClass} fr-alert--sm`;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <p class="fr-alert__title">${message}</p>
        `;
        
        // Ajouter les styles d'animation si pas encore présents
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Ajouter la notification
        document.body.appendChild(notification);
        
        // Supprimer après 4 secondes avec animation
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    /**
     * Recharge les paramètres après connexion de l'utilisateur
     * Cette méthode est appelée quand l'utilisateur se connecte
     */
    async reloadSettingsAfterLogin() {
        try {
            console.log('Rechargement des paramètres après connexion...');
            
            // Recharger les paramètres depuis le serveur
            const cloudSettings = await window.ptmAuth.getGalligeoSettings();
            
            if (cloudSettings) {
                // Merge avec les paramètres locaux existants
                const currentSettings = this.loadLocalSettings();
                const mergedSettings = { ...currentSettings, ...cloudSettings };
                
                this.settings = mergedSettings;
                this.saveLocalSettings(this.settings);
                
                // Mettre à jour le formulaire s'il est ouvert
                if (this.formGenerator && this.formGenerator.config) {
                    this.formGenerator.populateForm(this.settings);
                }
                
                console.log('Paramètres rechargés après connexion:', this.settings);
                this.showNotification('Paramètres synchronisés avec le serveur', 'success');
                
                // Notifier l'application du chargement des nouveaux paramètres
                this.notifySettingsLoaded(this.settings, 'cloud-reconnect');
            } else {
                console.log('Aucun paramètre trouvé sur le serveur après connexion');
                this.showNotification('Paramètres utilisateur non trouvés sur le serveur', 'info');
            }
        } catch (error) {
            console.error('Erreur lors du rechargement des paramètres après connexion:', error);
            this.showNotification('Erreur lors de la synchronisation', 'error');
        }
    }
}

// Initialisation globale
window.settingsManager = new SettingsManager();

// Fonction d'initialisation à appeler quand la modale s'ouvre
async function initSettingsForm() {
    try {
        await window.settingsManager.init('settings-form-container');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation du formulaire de paramètres:', error);
    }
}
