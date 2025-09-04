/**
 * Module d'authentification et d'interaction avec l'API PTM
 */
class PTMAuth {
    constructor() {
        this.baseUrl = 'https://api.ptm.huma-num.fr';
        this.token = null;
        this.userInfo = null;
    }

    /**
     * Récupère le token JWT depuis le localStorage ou les cookies
     */
    getToken() {
        if (this.token) {
            return this.token;
        }

        // Vérifier le localStorage
        const localToken = localStorage.getItem('ptm_auth_token');
        if (localToken) {
            this.token = localToken;
            return this.token;
        }

        // Vérifier les cookies
        const cookieToken = this.getCookie('ptm_auth_token');
        if (cookieToken) {
            this.token = cookieToken;
            return this.token;
        }

        return null;
    }

    /**
     * Récupère un cookie par son nom
     */
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return null;
    }

    /**
     * Définit le token d'authentification
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem('ptm_auth_token', token);
    }

    /**
     * Vérifie si l'utilisateur est authentifié
     */
    isAuthenticated() {
        return this.getToken() !== null;
    }

    /**
     * Fait un appel API avec authentification
     */
    async apiCall(endpoint, options = {}) {
        const token = this.getToken();
        
        if (!token) {
            throw new Error('Token d\'authentification manquant');
        }

        const defaultHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        const response = await fetch(`${this.baseUrl}${endpoint}`, config);
        
        if (!response.ok) {
            if (response.status === 401) {
                // Token expiré ou invalide
                this.logout();
                throw new Error('Session expirée. Veuillez vous reconnecter.');
            }
            
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Erreur API: ${response.status}`);
        }

        // Vérifier que la réponse est bien en JSON avant de la parser
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Réponse du serveur non valide (format non-JSON)');
        }

        return response.json();
    }

    /**
     * Sauvegarde les données d'une application spécifique
     */
    async saveAppData(appName, data) {
        return this.apiCall(`/auth/app/${appName}/data`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * Récupère les données d'une application spécifique
     */
    async getAppData(appName) {
        return this.apiCall(`/auth/app/${appName}/data`, {
            method: 'GET'
        });
    }

    /**
     * Supprime les données d'une application spécifique
     */
    async deleteAppData(appName) {
        return this.apiCall(`/auth/app/${appName}/data`, {
            method: 'DELETE'
        });
    }

    /**
     * Récupère le profil utilisateur
     */
    async getUserProfile() {
        if (this.userInfo) {
            return this.userInfo;
        }

        this.userInfo = await this.apiCall('/auth/profile', {
            method: 'GET'
        });

        return this.userInfo;
    }

    /**
     * Sauvegarde le profil utilisateur
     */
    async saveUserProfile(profileData) {
        const result = await this.apiCall('/auth/profile', {
            method: 'POST',
            body: JSON.stringify(profileData)
        });

        // Mettre à jour le cache local
        this.userInfo = { ...this.userInfo, ...profileData };
        
        return result;
    }

    /**
     * Liste les applications utilisées par l'utilisateur
     */
    async getUserApps() {
        return this.apiCall('/auth/user/apps', {
            method: 'GET'
        });
    }

    /**
     * Déconnexion
     */
    logout() {
        this.token = null;
        this.userInfo = null;
        localStorage.removeItem('ptm_auth_token');
        
        // Rediriger vers la page de connexion
        window.location.href = `${this.baseUrl}/auth/login?redirect_url=${encodeURIComponent(window.location.href)}`;
    }

    /**
     * Vérifie l'état de l'authentification et récupère les infos utilisateur
     */
    async checkAuthStatus() {
        if (!this.isAuthenticated()) {
            return false;
        }

        try {
            await this.getUserProfile();
            return true;
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'authentification:', error);
            
            // Si c'est une erreur de format JSON, c'est probablement que l'utilisateur n'est pas connecté
            if (error.message && error.message.includes('JSON')) {
                // Nettoyer le token invalide
                this.logout();
            }
            
            return false;
        }
    }

    /**
     * Récupère spécifiquement les paramètres Galligeo de l'utilisateur
     */
    async getGalligeoSettings() {
        try {
            const data = await this.getAppData('galligeo');
            return data?.settings || null;
        } catch (error) {
            console.error('Erreur lors de la récupération des paramètres Galligeo:', error);
            return null;
        }
    }

    /**
     * Sauvegarde spécifiquement les paramètres Galligeo
     */
    async saveGalligeoSettings(settings) {
        try {
            const data = {
                settings: settings,
                lastUpdated: new Date().toISOString()
            };
            return await this.saveAppData('galligeo', data);
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des paramètres Galligeo:', error);
            throw error;
        }
    }

    /**
     * Récupère spécifiquement les données Cartoquete de l'utilisateur
     */
    async getCartoqueteData() {
        try {
            const data = await this.getAppData('cartoquete');
            return data || null;
        } catch (error) {
            console.error('Erreur lors de la récupération des données Cartoquete:', error);
            return null;
        }
    }

    /**
     * Récupère spécifiquement les favoris Cartoquete de l'utilisateur
     */
    async getCartoqueteFavorites() {
        try {
            const data = await this.getCartoqueteData();
            return data?.favoris || [];
        } catch (error) {
            console.error('Erreur lors de la récupération des favoris Cartoquete:', error);
            return [];
        }
    }
}

// Instance globale
window.ptmAuth = new PTMAuth();

/**
 * Gestionnaire spécifique pour les paramètres Galligeo
 */
class GalligeoSettingsAPI {
    constructor() {
        this.appName = 'galligeo';
    }

    /**
     * Sauvegarde les paramètres Galligeo
     */
    async saveSettings(settings) {
        try {
            const data = {
                version: "1.0",
                settings: settings,
                last_updated: new Date().toISOString()
            };

            const result = await window.ptmAuth.saveAppData(this.appName, data);
            console.log('Paramètres sauvegardés sur le serveur:', result);
            
            return result;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des paramètres:', error);
            throw error;
        }
    }

    /**
     * Charge les paramètres Galligeo depuis le serveur
     */
    async loadSettings() {
        try {
            const data = await window.ptmAuth.getAppData(this.appName);
            
            if (data && data.settings) {
                console.log('Paramètres chargés depuis le serveur:', data.settings);
                return data.settings;
            }
            
            return null;
        } catch (error) {
            console.error('Erreur lors du chargement des paramètres:', error);
            // Ne pas rethrow l'erreur pour permettre le fonctionnement en mode local
            return null;
        }
    }

    /**
     * Supprime les paramètres Galligeo du serveur
     */
    async deleteSettings() {
        try {
            const result = await window.ptmAuth.deleteAppData(this.appName);
            console.log('Paramètres supprimés du serveur:', result);
            return result;
        } catch (error) {
            console.error('Erreur lors de la suppression des paramètres:', error);
            throw error;
        }
    }

    /**
     * Synchronise les paramètres entre local et serveur
     */
    async syncSettings(localSettings) {
        try {
            // Charger les paramètres du serveur
            const serverSettings = await this.loadSettings();
            
            if (!serverSettings) {
                // Pas de paramètres sur le serveur, envoyer les paramètres locaux
                if (localSettings && Object.keys(localSettings).length > 0) {
                    await this.saveSettings(localSettings);
                    return localSettings;
                }
                return null;
            }
            
            // Comparer les timestamps ou versions si disponibles
            const localTimestamp = localStorage.getItem('galligeo-settings-timestamp');
            const serverTimestamp = serverSettings.last_updated || new Date(0).toISOString();
            
            if (localTimestamp && localTimestamp > serverTimestamp) {
                // Les paramètres locaux sont plus récents
                await this.saveSettings(localSettings);
                return localSettings;
            } else {
                // Les paramètres du serveur sont plus récents
                return serverSettings;
            }
            
        } catch (error) {
            console.error('Erreur lors de la synchronisation:', error);
            // En cas d'erreur, utiliser les paramètres locaux
            return localSettings;
        }
    }
}

// Instance globale pour les paramètres Galligeo
window.galligeoSettingsAPI = new GalligeoSettingsAPI();
