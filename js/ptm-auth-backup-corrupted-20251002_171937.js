/**
 * PTM Authentication Service - Version JWT Anonyme
 * Gestion de l'authentification avec support des tokens JWT temporaires pour utilisateurs anonymes
 */

class PTMAuth {
    constructor() {
        this.baseUrl = 'https://api.ptm.huma-num.fr';
        this.authToken = null;
        this.userInfo = null;
    }

    /**
     * Initialise le service d'authentification
     */
    async init() {
        console.log('🚀 Initialisation PTM Auth Service');
        
        // Vérifier si l'utilisateur est connecté
        const token = this.getStoredToken();
        if (token) {
            try {
                this.authToken = token;
       /**
     * Nettoie toutes les données anonymes du localStorage
     */
    clearAnonymousData() {
        localStorage.removeItem('galligeo_anonymous_structure');
        localStorage.removeItem('anonymous_token');
        localStorage.removeItem('anonymous_token_expires');
        console.log('🧹 Données anonymes nettoyées');
    }

    // ==============================================
    // MÉTHODES D'AUTHENTIFICATION ESSENTIELLES
    // ==============================================

    /**
     * Vérifie si l'utilisateur est authentifié
     */
    isAuthenticated() {
        return this.currentUser !== null && this.currentUser !== undefined && this.currentUser !== '';
    }

    /**
     * Définit l'utilisateur actuel
     */
    setCurrentUser(username) {
        this.currentUser = username;
        console.log(`👤 Utilisateur défini: ${username}`);
    }

    /**
     * Vérifie le statut d'authentification (méthode utilisée par d'autres modules)
     */
    async checkAuthStatus() {
        // Cette méthode existe pour compatibilité avec l'ancien système
        // Elle retourne simplement l'état d'authentification actuel
        return this.isAuthenticated();
    }

    /**
     * Déconnecte l'utilisateur
     */
    signOut() {
        this.currentUser = null;
        this.authToken = null;
        localStorage.removeItem('authToken');
        console.log('👋 Utilisateur déconnecté');
    }
}   this.userInfo = await this.getUserInfo();
                console.log('✅ Utilisateur connecté:', this.userInfo.orcid_id);
            } catch (error) {
                console.warn('⚠️ Token invalide, nettoyage automatique');
                this.logout();
            }
        } else {
            console.log('👤 Mode anonyme activé');
        }
    }

    /**
     * Récupère le token stocké
     */
    getStoredToken() {
        return localStorage.getItem('ptm_auth_token');
    }

    /**
     * Stocke le token
     */
    setStoredToken(token) {
        localStorage.setItem('ptm_auth_token', token);
    }

    /**
     * Vérifie si l'utilisateur est connecté
     */
    isLoggedIn() {
        return this.authToken !== null && this.userInfo !== null;
    }

    /**
     * Récupère les informations de l'utilisateur actuel
     */
    getCurrentUser() {
        return this.userInfo;
    }

    /**
     * Appel générique à l'API PTM
     */
    async apiCall(endpoint, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.authToken) {
            config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, config);
        
        if (response.status === 401) {
            this.logout();
            throw new Error('Session expirée');
        }

        return response;
    }

    /**
     * Récupère les informations utilisateur
     */
    async getUserInfo() {
        if (!this.authToken) return null;
        
        const response = await this.apiCall('/auth/user-info');
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Impossible de récupérer les informations utilisateur');
    }

    /**
     * Connexion utilisateur
     */
    login() {
        window.location.href = `${this.baseUrl}/auth/login?redirect_url=${encodeURIComponent(window.location.href)}`;
    }

    /**
     * Déconnexion
     */
    logout() {
        this.authToken = null;
        this.userInfo = null;
        localStorage.removeItem('ptm_auth_token');
        localStorage.removeItem('anonymous_token');
        localStorage.removeItem('anonymous_token_expires');
        console.log('👋 Déconnexion effectuée');
    }

    // ==============================================
    // GESTION DES TOKENS JWT ANONYMES
    // ==============================================

    /**
     * Génère un token JWT temporaire pour l'utilisateur anonyme
     */
    async generateAnonymousToken() {
        try {
            console.log('🔑 Génération du token anonyme...');
            
            const response = await fetch(`${this.baseUrl}/auth/anonymous-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Anonymous-User': '0000-GALLI-ANONY-ME00',
                    'X-Client-Identifier': 'galligeo-frontend'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Erreur génération token: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
            }
            
            const tokenData = await response.json();
            console.log('✅ Token anonyme généré:', {
                expires_in: tokenData.expires_in,
                user_id: tokenData.user_id,
                allowed_apps: tokenData.allowed_apps
            });
            
            // Stocker le token et son expiration
            const expirationTime = Date.now() + (tokenData.expires_in * 1000);
            localStorage.setItem('anonymous_token', tokenData.token);
            localStorage.setItem('anonymous_token_expires', expirationTime.toString());
            
            return tokenData.token;
            
        } catch (error) {
            console.error('❌ Erreur génération token anonyme:', error);
            throw error;
        }
    }

    /**
     * Récupère un token anonyme valide (génère un nouveau si nécessaire)
     */
    async getValidAnonymousToken() {
        try {
            const existingToken = localStorage.getItem('anonymous_token');
            const expirationTime = localStorage.getItem('anonymous_token_expires');
            
            // Vérifier si le token existe et n'est pas expiré (avec marge de 5 minutes)
            if (existingToken && expirationTime) {
                const expiration = parseInt(expirationTime);
                const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
                
                if (expiration > fiveMinutesFromNow) {
                    console.log('🔄 Réutilisation du token anonyme existant');
                    return existingToken;
                }
            }
            
            // Générer un nouveau token
            console.log('🆕 Génération d\'un nouveau token anonyme');
            return await this.generateAnonymousToken();
            
        } catch (error) {
            console.error('❌ Erreur récupération token anonyme:', error);
            throw error;
        }
    }

    /**
     * Vérifie la validité d'un token anonyme
     */
    async verifyAnonymousToken(token) {
        try {
            const response = await fetch(`${this.baseUrl}/auth/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            return response.ok;
        } catch (error) {
            console.error('❌ Erreur vérification token:', error);
            return false;
        }
    }

    // ==============================================
    // GESTION DES CARTES GÉORÉFÉRENCÉES ANONYMES
    // ==============================================

    /**
     * Sauvegarde le statut d'une carte pour un utilisateur anonyme
     * Version optimisée avec fusion intelligente backend
     */
    async saveAnonymousMapStatus(arkId, status, additionalData = {}) {
        try {
            console.log(`💾 Sauvegarde carte anonyme: ${arkId} - ${status}`);
            
            // 1. Sauvegarder en local d'abord
            const localResult = await this.saveAnonymousMapToLocalStorage(arkId, status, additionalData);
            
            // 2. Ensuite sauvegarde API avec fusion intelligente
            try {
                await this.saveMapToAPI(arkId, status, additionalData, true); // true = mode anonyme
                console.log('✅ Sauvegarde complète (local + API avec fusion intelligente)');
            } catch (apiError) {
                console.warn('⚠️ Sauvegarde API échouée, local OK:', apiError.message);
            }
            
            return localResult;
        } catch (error) {
            console.error('❌ Erreur sauvegarde carte anonyme:', error);
            throw error;
        }
    }

    /**
     * Sauvegarde locale d'une carte anonyme
     */
    async saveAnonymousMapToLocalStorage(arkId, status, additionalData = {}) {
        try {
            // Récupérer la structure galligeo existante
            let galligeoData = JSON.parse(localStorage.getItem('galligeo_anonymous_structure') || '{}');
            
            // Initialiser la structure si nécessaire
            if (!galligeoData.galligeo) {
                galligeoData.galligeo = {
                    arkId: "general-settings",
                    rec_ark: [],
                    settings: {
                        "input-scale": "100000",
                        "select-algo": "helmert",
                        "select-quality": "medium",
                        "select-resample": "nearest",
                        "checkbox-matrice": true,
                        "checkbox-autosave": true,
                        "input-max-backups": "3",
                        "checkbox-compression": true,
                        "checkbox-transparent": false,
                        "select-backup-frequency": "300"
                    },
                    lastUpdated: new Date().toISOString()
                };
            }
            
            if (!galligeoData.cartoquete) {
                galligeoData.cartoquete = {
                    favoris: []
                };
            }
            
            // Chercher si la carte existe déjà
            const existingMapIndex = galligeoData.galligeo.rec_ark.findIndex(map => map.ark === arkId);
            const now = new Date().toISOString();
            
            const mapRecord = {
                ark: arkId,
                status: status,
                quality: additionalData.quality || 2,
                firstWorked: existingMapIndex >= 0 ? galligeoData.galligeo.rec_ark[existingMapIndex].firstWorked : now,
                lastUpdated: now,
                ...additionalData
            };
            
            // Mettre à jour ou ajouter la carte
            if (existingMapIndex >= 0) {
                galligeoData.galligeo.rec_ark[existingMapIndex] = mapRecord;
                console.log(`📝 Carte ${arkId} mise à jour localement`);
            } else {
                galligeoData.galligeo.rec_ark.push(mapRecord);
                console.log(`➕ Carte ${arkId} ajoutée localement`);
            }
            
            // Mettre à jour la timestamp globale
            galligeoData.galligeo.lastUpdated = now;
            
            // Sauvegarder dans localStorage
            localStorage.setItem('galligeo_anonymous_structure', JSON.stringify(galligeoData));
            
            return mapRecord;
            
        } catch (error) {
            console.error('❌ Erreur sauvegarde locale:', error);
            throw error;
        }
    }

    /**
     * Sauvegarde une carte via l'API PTM avec fusion intelligente backend
     * Fonctionne pour les utilisateurs anonymes et authentifiés
     */
    async saveMapToAPI(arkId, status, additionalData = {}, isAnonymous = false) {
        try {
            console.log(`📡 Sauvegarde ${isAnonymous ? 'anonyme' : 'authentifiée'} de ${arkId} via API PTM`);
            
            // Préparer les données de la carte uniquement (pas toute la structure)
            const now = new Date().toISOString();
            const mapData = {
                ark: arkId,
                status: status,
                quality: additionalData.quality || 2,
                lastUpdated: now,
                // Conserver firstWorked si fourni, sinon utiliser maintenant
                firstWorked: additionalData.firstWorked || now,
                ...additionalData
            };

            // Structure optimisée pour fusion intelligente backend
            const payload = {
                galligeo: {
                    operation: 'upsert_map', // Indique au backend de fusionner intelligemment
                    map: mapData
                }
            };

            // Préparer les headers selon le type d'utilisateur
            let headers = {
                'Content-Type': 'application/json'
            };

            if (isAnonymous) {
                // Utilisateur anonyme : utiliser token JWT
                const token = await this.getValidAnonymousToken();
                headers.Authorization = `Bearer ${token}`;
                console.log('🔑 Utilisation token JWT anonyme');
            } else {
                // Utilisateur authentifié : utiliser token standard
                if (!this.authToken) {
                    throw new Error('Utilisateur non authentifié');
                }
                headers.Authorization = `Bearer ${this.authToken}`;
                console.log('🔑 Utilisation token utilisateur authentifié');
            }
            
            const url = `${this.baseUrl}/auth/app/galligeo/data`;
            console.log(`� URL: ${url}`);
            console.log('� Données optimisées:', payload);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                // Gestion spéciale pour tokens anonymes expirés
                if (response.status === 401 && isAnonymous) {
                    console.warn('🔄 Token anonyme expiré, renouvellement...');
                    localStorage.removeItem('anonymous_token');
                    localStorage.removeItem('anonymous_token_expires');
                    
                    // Réessayer une seule fois avec un nouveau token
                    const newToken = await this.generateAnonymousToken();
                    const retryResponse = await fetch(url, {
                        method: 'POST',
                        headers: {
                            ...headers,
                            'Authorization': `Bearer ${newToken}`
                        },
                        body: JSON.stringify(payload)
                    });
                    
                    if (!retryResponse.ok) {
                        const retryErrorData = await retryResponse.json().catch(() => ({}));
                        throw new Error(`Erreur API (retry): ${retryResponse.status} ${retryResponse.statusText} - ${retryErrorData.message || ''}`);
                    }
                    
                    const retryResult = await retryResponse.json();
                    console.log('✅ Carte sauvegardée en API (après renouvellement token):', retryResult);
                    return retryResult;
                }
                
                throw new Error(`Erreur API: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
            }
            
            const result = await response.json();
            console.log(`✅ Carte ${arkId} sauvegardée en API avec fusion intelligente:`, result);
            return result;
            
        } catch (error) {
            console.error(`❌ Erreur sauvegarde API ${isAnonymous ? 'anonyme' : 'authentifiée'}:`, error);
            throw error;
        }
    }

    /**
     * Récupère les données anonymes depuis l'API
     */
    async getAnonymousDataFromAPI() {
        try {
            console.log('📖 Récupération des données anonymes depuis l\'API');
            
            const token = await this.getValidAnonymousToken();
            
            const response = await fetch(`${this.baseUrl}/auth/app/galligeo/data`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Données anonymes récupérées depuis l\'API');
                return data;
            } else if (response.status === 404) {
                console.log('ℹ️ Aucune donnée trouvée sur l\'API (normal pour un nouvel utilisateur)');
                return null;
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Erreur API: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
            }
            
        } catch (error) {
            console.error('❌ Erreur récupération données API:', error);
            return null; // Ne pas faire échouer si l'API est indisponible
        }
    }

    /**
     * Supprime une carte de la liste des cartes anonymes
     */
    removeAnonymousMap(arkId) {
        try {
            // Récupérer la structure galligeo
            let galligeoData = JSON.parse(localStorage.getItem('galligeo_anonymous_structure') || '{}');
            
            if (galligeoData.galligeo && galligeoData.galligeo.rec_ark) {
                // Filtrer la carte à supprimer
                galligeoData.galligeo.rec_ark = galligeoData.galligeo.rec_ark.filter(map => map.ark !== arkId);
                galligeoData.galligeo.lastUpdated = new Date().toISOString();
                
                // Sauvegarder la structure mise à jour
                localStorage.setItem('galligeo_anonymous_structure', JSON.stringify(galligeoData));
                
                console.log(`🗑️ Carte ${arkId} supprimée de la liste anonyme`);
                
                // Tenter de synchroniser avec l'API
                this.saveAnonymousMapToAPI(arkId, 'removed').catch(error => {
                    console.warn('⚠️ Synchronisation API échouée après suppression:', error.message);
                });
            }
        } catch (error) {
            console.error('❌ Erreur suppression carte anonyme:', error);
        }
    }

    /**
     * Récupère la liste des cartes travaillées par l'utilisateur anonyme
     */
    getAnonymousWorkedMaps() {
        try {
            const galligeoData = JSON.parse(localStorage.getItem('galligeo_anonymous_structure') || '{}');
            return galligeoData.galligeo?.rec_ark || [];
        } catch (error) {
            console.error('❌ Erreur récupération cartes anonymes:', error);
            return [];
        }
    }

    /**
     * Récupère la structure galligeo complète pour l'utilisateur anonyme
     */
    getAnonymousGalligeoStructure() {
        try {
            const data = localStorage.getItem('galligeo_anonymous_structure');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('❌ Erreur récupération structure galligeo:', error);
            return null;
        }
    }

    // ==============================================
    // GESTION DES CARTES GÉORÉFÉRENCÉES AUTHENTIFIÉES
    // ==============================================

    /**
     * Met à jour le statut d'une carte pour un utilisateur authentifié
     * Version optimisée avec fusion intelligente backend
     */
    async updateWorkedMap(arkId, status, additionalData = {}) {
        if (!this.isAuthenticated()) {
            throw new Error('Utilisateur non authentifié');
        }

        try {
            console.log(`💾 Mise à jour carte authentifiée: ${arkId} - ${status}`);
            
            // Directement via API (pas de localStorage pour les utilisateurs authentifiés)
            const result = await this.saveMapToAPI(arkId, status, additionalData, false); // false = mode authentifié
            console.log('✅ Carte mise à jour (API avec fusion intelligente)');
            return result;
            
        } catch (error) {
            console.error('❌ Erreur mise à jour carte authentifiée:', error);
            throw error;
        }
    }

    /**
     * Met à jour le statut d'une carte spécifique pour un utilisateur authentifié
     */
    async updateMapStatus(arkId, status, additionalData = {}) {
        return this.updateWorkedMap(arkId, status, additionalData);
    }

    /**
     * Récupère les données utilisateur authentifié depuis l'API
     */
    async getUserDataFromAPI() {
        if (!this.isAuthenticated()) {
            throw new Error('Utilisateur non authentifié');
        }

        try {
            console.log('📖 Récupération des données utilisateur depuis l\'API');
            
            const response = await fetch(`${this.baseUrl}/auth/app/galligeo/data`, {
                method: 'GET',
                headers: {
                    'X-USER': this.currentUser,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Données utilisateur récupérées:', data);
                return data;
            } else {
                console.warn('⚠️ Aucune donnée utilisateur trouvée ou erreur API');
                return null;
            }
        } catch (error) {
            console.error('❌ Erreur récupération données utilisateur:', error);
            return null;
        }
    }

    // ==============================================
    // CARTES GÉORÉFÉRENCÉES PUBLIQUES
    // ==============================================

    /**
     * Récupère toutes les cartes géoréférencées publiques
     */
    async getGeoreferencedMaps() {
        try {
            const response = await fetch(`${this.baseUrl}/public/galligeo/georeferenced-maps`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.maps || [];
            } else {
                console.error('Erreur récupération cartes géoréférencées:', response.statusText);
                return [];
            }
        } catch (error) {
            console.error('Erreur réseau cartes géoréférencées:', error);
            return [];
        }
    }

    /**
     * Récupère les statistiques des cartes géoréférencées
     */
    async getGeoreferencedStats() {
        try {
            const response = await fetch(`${this.baseUrl}/public/galligeo/georeferenced-stats`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                return await response.json();
            } else {
                console.error('Erreur récupération stats:', response.statusText);
                return null;
            }
        } catch (error) {
            console.error('Erreur réseau stats:', error);
            return null;
        }
    }

    // ==============================================
    // UTILITAIRES DE DEBUG
    // ==============================================

    /**
     * Affiche les informations de debug pour l'authentification
     */
    debugInfo() {
        console.group('🔍 PTM Auth Debug Info');
        console.log('Base URL:', this.baseUrl);
        console.log('Connecté:', this.isLoggedIn());
        console.log('Utilisateur:', this.userInfo);
        console.log('Token utilisateur:', this.authToken ? '***' : 'null');
        
        const anonymousToken = localStorage.getItem('anonymous_token');
        const anonymousExpires = localStorage.getItem('anonymous_token_expires');
        console.log('Token anonyme:', anonymousToken ? '***' : 'null');
        console.log('Expiration anonyme:', anonymousExpires ? new Date(parseInt(anonymousExpires)).toLocaleString() : 'null');
        
        const galligeoData = this.getAnonymousGalligeoStructure();
        console.log('Cartes anonymes:', galligeoData?.galligeo?.rec_ark?.length || 0);
        console.groupEnd();
    }

    /**
     * Nettoie toutes les données anonymes
     */
    clearAnonymousData() {
        localStorage.removeItem('galligeo_anonymous_structure');
        localStorage.removeItem('anonymous_token');
        localStorage.removeItem('anonymous_token_expires');
        console.log('🧹 Données anonymes nettoyées');
    }
}

// Export pour utilisation globale
window.PTMAuth = PTMAuth;