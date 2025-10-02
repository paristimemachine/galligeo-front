/**
 * Wrapper de compatibilité pour remplacer l'ancien système d'authentification
 * Assure la transition transparente vers le nouveau système conforme à la doc backend
 */

// Sauvegarder l'ancien système s'il existe
window.ptmAuthOld = window.ptmAuth;

// Wrapper pour l'ancien système PTMAuth
class PTMAuthWrapper {
    constructor() {
        // Utiliser le nouveau système fixe en interne
        this.fixed = window.ptmAuthFixed;
        this.baseUrl = this.fixed.baseUrl;
        this.token = null;
        this.userInfo = null;
    }

    // === MÉTHODES DE COMPATIBILITÉ AVEC L'ANCIEN SYSTÈME ===

    getToken() {
        return this.fixed.getToken();
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('ptm_auth_token', token);
        this.fixed.token = token;
    }

    isAuthenticated() {
        return this.fixed.isAuthenticated();
    }

    setCurrentUser(username) {
        console.log(`👤 Utilisateur défini: ${username}`);
    }

    async checkAuthStatus() {
        return this.fixed.isAuthenticated();
    }

    logout() {
        this.fixed.logout();
        this.token = null;
        this.userInfo = null;
    }

    // === MÉTHODES D'API MODERNISÉES ===

    async apiCall(endpoint, options = {}) {
        return this.fixed.authenticatedApiCall(endpoint, options);
    }

    async saveAppData(appName, data, arkId = null) {
        if (appName === 'galligeo') {
            return this.fixed.saveGalligeoData(data);
        }
        // Pour d'autres apps, utiliser l'API générique
        return this.fixed.authenticatedApiCall(`/app/${appName}/data`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getAppData(appName, arkId = null) {
        if (appName === 'galligeo') {
            return this.fixed.getGalligeoData();
        }
        // Pour d'autres apps, utiliser l'API générique
        let endpoint = `/app/${appName}/data`;
        if (arkId) {
            endpoint += `?ark=${encodeURIComponent(arkId)}`;
        }
        return this.fixed.authenticatedApiCall(endpoint, { method: 'GET' });
    }

    async deleteAppData(appName, arkId = null) {
        let endpoint = `/app/${appName}/data`;
        if (arkId) {
            endpoint += `?ark=${encodeURIComponent(arkId)}`;
        }
        return this.fixed.authenticatedApiCall(endpoint, { method: 'DELETE' });
    }

    async getUserProfile() {
        if (this.userInfo) {
            return this.userInfo;
        }
        this.userInfo = await this.fixed.getUserProfile();
        return this.userInfo;
    }

    async saveUserProfile(profileData) {
        const result = await this.fixed.authenticatedApiCall('/profile', {
            method: 'POST',
            body: JSON.stringify(profileData)
        });
        this.userInfo = { ...this.userInfo, ...profileData };
        return result;
    }

    async getUserApps() {
        return this.fixed.authenticatedApiCall('/user/apps', { method: 'GET' });
    }

    // === MÉTHODES GALLIGEO SPÉCIFIQUES ===

    async getGalligeoSettings(arkId = null) {
        try {
            const data = await this.fixed.getGalligeoData();
            return data?.settings || null;
        } catch (error) {
            console.error('Erreur récupération paramètres Galligeo:', error);
            return null;
        }
    }

    async saveGalligeoSettings(settings, arkId = null) {
        try {
            // Récupérer les données existantes
            let existingData = { rec_ark: [], settings: {} };
            try {
                existingData = await this.fixed.getGalligeoData() || existingData;
            } catch (error) {
                console.warn('Pas de données existantes, création nouvelle structure');
            }

            // Mettre à jour les settings
            const updatedData = {
                ...existingData,
                settings: settings,
                lastUpdated: new Date().toISOString()
            };

            return await this.fixed.saveGalligeoData(updatedData);
        } catch (error) {
            console.error('Erreur sauvegarde paramètres Galligeo:', error);
            throw error;
        }
    }

    async getWorkedMaps() {
        try {
            const data = await this.fixed.getGalligeoData();
            return data?.rec_ark || [];
        } catch (error) {
            console.error('Erreur récupération cartes travaillées:', error);
            return [];
        }
    }

    async updateWorkedMap(arkId, mapData, status = 'worked') {
        return this.fixed.saveMapStatus(arkId, status, mapData);
    }

    async updateMapStatus(arkId, status, additionalData = {}) {
        return this.fixed.saveMapStatus(arkId, status, additionalData);
    }

    async removeWorkedMap(arkId) {
        try {
            const data = await this.fixed.getGalligeoData();
            if (data && data.rec_ark) {
                const filteredMaps = data.rec_ark.filter(map => map.ark !== arkId);
                const updatedData = { ...data, rec_ark: filteredMaps };
                return await this.fixed.saveGalligeoData(updatedData);
            }
        } catch (error) {
            console.error('Erreur suppression carte travaillée:', error);
            throw error;
        }
    }

    // === MÉTHODES ANONYMES AVEC RÉTROCOMPATIBILITÉ ===

    getAnonymousWorkedMaps() {
        try {
            // Nouvelle structure d'abord
            const newStructure = localStorage.getItem('galligeo_anonymous_structure');
            if (newStructure) {
                const data = JSON.parse(newStructure);
                return data.rec_ark || [];
            }
            
            // Ancienne structure
            const oldData = localStorage.getItem('galligeo_anonymous_maps');
            return oldData ? JSON.parse(oldData) : [];
        } catch (error) {
            console.error('Erreur récupération cartes anonymes:', error);
            return [];
        }
    }

    getAnonymousGalligeoStructure() {
        try {
            const data = localStorage.getItem('galligeo_anonymous_structure');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Erreur récupération structure anonyme:', error);
            return null;
        }
    }

    async saveAnonymousMapStatus(arkId, status, additionalData = {}) {
        try {
            // 1. Sauvegarder localement
            await this.saveAnonymousMapToLocalStorage(arkId, status, additionalData);
            
            // 2. Essayer la sauvegarde API avec le nouveau système
            try {
                await this.fixed.saveMapStatus(arkId, status, additionalData);
                console.log(`✅ Carte anonyme ${arkId} sauvegardée (local + API)`);
            } catch (apiError) {
                console.warn('⚠️ Sauvegarde API échouée, local OK:', apiError.message);
            }
            
            return {
                ark: arkId,
                status: status,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Erreur sauvegarde carte anonyme:', error);
            throw error;
        }
    }

    async saveAnonymousMapToLocalStorage(arkId, status, additionalData = {}) {
        try {
            let galligeoData = JSON.parse(localStorage.getItem('galligeo_anonymous_structure') || '{}');
            
            if (!galligeoData.rec_ark) galligeoData.rec_ark = [];
            
            const existingMapIndex = galligeoData.rec_ark.findIndex(map => map.ark === arkId);
            const now = new Date().toISOString();
            
            const mapRecord = {
                ark: arkId,
                status: status,
                quality: additionalData.quality || 2,
                firstWorked: existingMapIndex >= 0 ? galligeoData.rec_ark[existingMapIndex].firstWorked : now,
                lastUpdated: now,
                ...additionalData
            };
            
            if (existingMapIndex >= 0) {
                galligeoData.rec_ark[existingMapIndex] = mapRecord;
            } else {
                galligeoData.rec_ark.push(mapRecord);
            }
            
            localStorage.setItem('galligeo_anonymous_structure', JSON.stringify(galligeoData));
            console.log(`📁 Structure anonyme mise à jour pour ${arkId}`);
            
            return mapRecord;
        } catch (error) {
            console.error('Erreur sauvegarde localStorage anonyme:', error);
            throw error;
        }
    }

    removeAnonymousMap(arkId) {
        try {
            let galligeoData = JSON.parse(localStorage.getItem('galligeo_anonymous_structure') || '{}');
            
            if (galligeoData.rec_ark) {
                galligeoData.rec_ark = galligeoData.rec_ark.filter(map => map.ark !== arkId);
                localStorage.setItem('galligeo_anonymous_structure', JSON.stringify(galligeoData));
            }
            
            console.log(`Carte anonyme ${arkId} supprimée`);
        } catch (error) {
            console.error('Erreur suppression carte anonyme:', error);
        }
    }

    getAnonymousUserProfile() {
        return {
            first_name: 'Utilisateur',
            last_name: 'Anonyme',
            email: 'anonymous@galligeo.local',
            orcid_id: null,
            institution: 'Non renseigné',
            isAnonymous: true
        };
    }

    getUserAuthStatus() {
        const isAuth = this.isAuthenticated();
        return {
            isAuthenticated: isAuth,
            isAnonymous: !isAuth,
            userType: isAuth ? 'authenticated' : 'anonymous'
        };
    }

    // === NOUVELLES MÉTHODES AVEC LE SYSTÈME FIXE ===

    async generateAnonymousToken() {
        return this.fixed.generateAnonymousToken();
    }

    async getValidAnonymousToken() {
        return this.fixed.getValidAnonymousToken();
    }

    async saveAnonymousMapToAPI(arkId, status, additionalData = {}) {
        return this.fixed.saveMapStatus(arkId, status, additionalData);
    }

    async getAnonymousDataFromAPI() {
        return this.fixed.getGalligeoDataAnonymous();
    }

    async getUserDataFromAPI() {
        return this.fixed.getGalligeoData();
    }

    // === MÉTHODES DE DIAGNOSTIC ===

    async testApiConnectivity() {
        return this.fixed.testApiConnectivity();
    }

    async diagnoseAuthentication() {
        return this.fixed.diagnoseAuthentication();
    }
}

// Remplacer l'ancien système par le wrapper
window.ptmAuth = new PTMAuthWrapper();

// Wrapper pour GalligeoSettingsAPI 
class GalligeoSettingsAPIWrapper {
    constructor() {
        this.appName = 'galligeo';
    }

    async saveSettings(settings, arkId = null) {
        return window.ptmAuth.saveGalligeoSettings(settings, arkId);
    }

    async loadSettings(arkId = null) {
        return window.ptmAuth.getGalligeoSettings(arkId);
    }

    async deleteSettings(arkId = null) {
        try {
            return await window.ptmAuth.deleteAppData(this.appName, arkId);
        } catch (error) {
            console.error('Erreur suppression paramètres:', error);
            throw error;
        }
    }

    async syncSettings(localSettings) {
        try {
            const serverSettings = await this.loadSettings();
            
            if (!serverSettings) {
                if (localSettings && Object.keys(localSettings).length > 0) {
                    await this.saveSettings(localSettings);
                    return localSettings;
                }
                return null;
            }
            
            const localTimestamp = localStorage.getItem('galligeo-settings-timestamp');
            const serverTimestamp = serverSettings.last_updated || new Date(0).toISOString();
            
            if (localTimestamp && localTimestamp > serverTimestamp) {
                await this.saveSettings(localSettings);
                return localSettings;
            } else {
                return serverSettings;
            }
            
        } catch (error) {
            console.error('Erreur synchronisation:', error);
            return localSettings;
        }
    }
}

// Remplacer l'ancien gestionnaire de paramètres
window.galligeoSettingsAPI = new GalligeoSettingsAPIWrapper();

// Fonctions utilitaires pour migration
window.migrateToNewAuth = function() {
    console.log('🔄 Migration vers le nouveau système d\'authentification...');
    
    // Vérifier s'il y a des données à migrer
    const oldMaps = localStorage.getItem('galligeo_anonymous_maps');
    if (oldMaps) {
        try {
            const maps = JSON.parse(oldMaps);
            const newStructure = {
                rec_ark: maps,
                settings: {
                    "input-scale": "100000",
                    "select-quality": "medium"
                }
            };
            localStorage.setItem('galligeo_anonymous_structure', JSON.stringify(newStructure));
            console.log('✅ Données anonymes migrées vers la nouvelle structure');
        } catch (error) {
            console.error('❌ Erreur migration données anonymes:', error);
        }
    }
    
    console.log('✅ Migration terminée');
};

// Auto-migration au chargement
document.addEventListener('DOMContentLoaded', function() {
    window.migrateToNewAuth();
});

console.log('🔧 Système d\'authentification mis à jour - compatible avec l\'ancien code');
console.log('💡 Utilisez window.ptmAuth (nouveau) ou window.ptmAuthFixed (direct)');
console.log('🔍 Debug: window.ptmAuth.diagnoseAuthentication()');