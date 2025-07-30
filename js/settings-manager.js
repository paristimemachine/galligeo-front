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
        this.formGenerator.onSubmit((data, event) => {
            this.saveSettings(data);
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
     * Charge les paramètres depuis le localStorage
     */
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('galligeo-settings');
            if (savedSettings) {
                this.settings = JSON.parse(savedSettings);
                this.formGenerator.populateForm(this.settings);
                console.log('Paramètres chargés:', this.settings);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des paramètres:', error);
        }
    }

    /**
     * Sauvegarde les paramètres dans le localStorage
     */
    saveSettings(data) {
        try {
            this.settings = { ...this.settings, ...data };
            localStorage.setItem('galligeo-settings', JSON.stringify(this.settings));
            
            // Afficher une notification de succès (si vous avez un système de notifications)
            this.showNotification('Paramètres sauvegardés avec succès', 'success');
            
            console.log('Paramètres sauvegardés:', this.settings);
            
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
    resetSettings() {
        if (confirm('Êtes-vous sûr de vouloir remettre tous les paramètres à leurs valeurs par défaut ?')) {
            this.settings = {};
            localStorage.removeItem('galligeo-settings');
            
            // Réinitialiser le formulaire
            const form = document.getElementById('settings-form');
            if (form) {
                form.reset();
            }
            
            this.showNotification('Paramètres remis à zéro', 'info');
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
        
        // Exemple d'implémentation simple avec une alerte
        // À remplacer par votre système de notifications préféré
        if (type === 'error') {
            alert(`Erreur: ${message}`);
        } else if (type === 'success') {
            // Vous pouvez implémenter une notification de succès plus élégante
            console.log(`Succès: ${message}`);
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
