/**
 * Module d'authentification et d'interaction avec l'API PTM
 */
class PTMAuth {
    constructor() {
        this.baseUrl = 'https://api.ptm.huma-num.fr/auth';
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
     * Définit l'utilisateur actuel
     */
    setCurrentUser(username) {
        this.currentUser = username;
        console.log(`👤 Utilisateur défini: ${username}`);
    }

    /**
     * Vérifie le statut d'authentification (pour compatibilité)
     */
    async checkAuthStatus() {
        return this.isAuthenticated();
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
     * Sauvegarde les données d'une application spécifique, optionnellement pour un ARK donné
     */
    async saveAppData(appName, data, arkId = null) {
        let endpoint = `/app/${appName}/data`;
        const bodyData = { ...data };
        
        if (arkId) {
            bodyData.arkId = arkId;
        }
        
        return this.apiCall(endpoint, {
            method: 'POST',
            body: JSON.stringify(bodyData)
        });
    }

    /****
     * Récupère les données d'une application spécifique, optionnellement pour un ARK donné
     */
    async getAppData(appName, arkId = null) {
        let endpoint = `/app/${appName}/data`;
        if (arkId) {
            endpoint += `?ark=${encodeURIComponent(arkId)}`;
        }
        
        return this.apiCall(endpoint, {
            method: 'GET'
        });
    }

    /**
     * Supprime les données d'une application spécifique, optionnellement pour un ARK donné
     */
    async deleteAppData(appName, arkId = null) {
        let endpoint = `/app/${appName}/data`;
        if (arkId) {
            endpoint += `?ark=${encodeURIComponent(arkId)}`;
        }
        
        return this.apiCall(endpoint, {
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

        this.userInfo = await this.apiCall('/profile', {
            method: 'GET'
        });

        return this.userInfo;
    }

    /**
     * Sauvegarde le profil utilisateur
     */
    async saveUserProfile(profileData) {
        const result = await this.apiCall('/profile', {
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
        return this.apiCall('/user/apps', {
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
        window.location.href = `${this.baseUrl}/login?redirect_url=${encodeURIComponent(window.location.href)}`;
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
     * Récupère spécifiquement les paramètres Galligeo de l'utilisateur pour un ARK donné
     * Si aucun ARK n'est fourni, récupère les paramètres généraux de l'application
     */
    async getGalligeoSettings(arkId = null) {
        try {
            const currentArk = arkId || window.input_ark;
            
            // Utiliser un ARK spécial pour les paramètres généraux
            const effectiveArk = currentArk || 'general-settings';
            const data = await this.getAppData('galligeo', effectiveArk);
            
            return data?.settings || null;
        } catch (error) {
            console.error('Erreur lors de la récupération des paramètres Galligeo:', error);
            return null;
        }
    }

    /**
     * Sauvegarde spécifiquement les paramètres Galligeo pour un ARK donné
     * Si aucun ARK n'est fourni, sauvegarde les paramètres généraux de l'application
     */
    async saveGalligeoSettings(settings, arkId = null) {
        try {
            const currentArk = arkId || window.input_ark;
            
            const data = {
                settings: settings,
                lastUpdated: new Date().toISOString(),
                arkId: currentArk || null
            };
            
            // Utiliser un ARK spécial pour les paramètres généraux
            const effectiveArk = currentArk || 'general-settings';
            return await this.saveAppData('galligeo', data, effectiveArk);
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

    /**
     * Récupère les cartes travaillées par l'utilisateur
     */
    async getWorkedMaps() {
        try {
            const data = await this.getAppData('galligeo');
            return data?.rec_ark || [];
        } catch (error) {
            console.error('Erreur lors de la récupération des cartes travaillées:', error);
            return [];
        }
    }

    /**
     * Ajoute ou met à jour une carte dans la liste des cartes travaillées
     * @param {string} arkId - L'identifiant ARK de la carte
     * @param {object} mapData - Les données de la carte (métadonnées, statut, etc.)
     * @param {string} status - Le statut de la carte ('en-cours', 'georeferenced', 'deposee')
     */
    async updateWorkedMap(arkId, mapData, status = 'en-cours') {
        try {
            const currentData = await this.getAppData('galligeo') || {};
            const workedMaps = currentData.rec_ark || [];
            
            // Vérifier si la carte existe déjà
            const existingMapIndex = workedMaps.findIndex(map => map.ark === arkId);
            
            const mapRecord = {
                ark: arkId,
                status: status,
                lastUpdated: new Date().toISOString(),
                firstWorked: existingMapIndex >= 0 ? workedMaps[existingMapIndex].firstWorked : new Date().toISOString(),
                ...mapData
            };
            
            if (existingMapIndex >= 0) {
                // Mettre à jour la carte existante
                workedMaps[existingMapIndex] = mapRecord;
            } else {
                // Ajouter une nouvelle carte
                workedMaps.push(mapRecord);
            }
            
            // Sauvegarder les données mises à jour
            const updatedData = {
                ...currentData,
                rec_ark: workedMaps
            };
            
            return await this.saveAppData('galligeo', updatedData);
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la carte travaillée:', error);
            throw error;
        }
    }

    /**
     * Met à jour le statut d'une carte travaillée
     * @param {string} arkId - L'identifiant ARK de la carte
     * @param {string} status - Le nouveau statut ('en-cours', 'georeferenced', 'deposee')
     * @param {object} additionalData - Données supplémentaires (ex: DOI pour les cartes déposées)
     */
    async updateMapStatus(arkId, status, additionalData = {}) {
        try {
            const currentData = await this.getAppData('galligeo') || {};
            const workedMaps = currentData.rec_ark || [];
            
            const mapIndex = workedMaps.findIndex(map => map.ark === arkId);
            if (mapIndex >= 0) {
                workedMaps[mapIndex] = {
                    ...workedMaps[mapIndex],
                    status: status,
                    lastUpdated: new Date().toISOString(),
                    ...additionalData
                };
                
                const updatedData = {
                    ...currentData,
                    rec_ark: workedMaps
                };
                
                return await this.saveAppData('galligeo', updatedData);
            } else {
                throw new Error('Carte non trouvée dans la liste des cartes travaillées');
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour du statut de la carte:', error);
            throw error;
        }
    }

    /**
     * Supprime une carte de la liste des cartes travaillées
     * @param {string} arkId - L'identifiant ARK de la carte
     */
    async removeWorkedMap(arkId) {
        try {
            const currentData = await this.getAppData('galligeo') || {};
            const workedMaps = currentData.rec_ark || [];
            
            const filteredMaps = workedMaps.filter(map => map.ark !== arkId);
            
            const updatedData = {
                ...currentData,
                rec_ark: filteredMaps
            };
            
            return await this.saveAppData('galligeo', updatedData);
        } catch (error) {
            console.error('Erreur lors de la suppression de la carte travaillée:', error);
            throw error;
        }
    }

    /**
     * Récupère toutes les cartes géoréférencées de tous les utilisateurs
     * Cette méthode utilise un endpoint public qui agrège les données
     */
    async getAllGeoreferencedMaps() {
        try {
            const response = await fetch(`${this.baseUrl}/public/galligeo/georeferenced-maps`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur API: ${response.status}`);
            }

            const data = await response.json();
            return data.maps || [];
        } catch (error) {
            console.error('Erreur lors de la récupération de toutes les cartes géoréférencées:', error);
            throw error;
        }
    }

    /**
     * Récupère les statistiques publiques des cartes géoréférencées
     */
    async getGeoreferencedMapsStats() {
        try {
            const response = await fetch(`${this.baseUrl}/public/galligeo/georeferenced-stats`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur API: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            throw error;
        }
    }

    /**
     * Gestion des cartes géoréférencées pour les utilisateurs anonymes
     * Les données sont stockées dans le localStorage avec une clé spéciale
     */
    getAnonymousWorkedMaps() {
        try {
            // Essayer d'abord la nouvelle structure
            const newStructure = localStorage.getItem('galligeo_anonymous_structure');
            if (newStructure) {
                const data = JSON.parse(newStructure);
                return data.galligeo?.rec_ark || [];
            }
            
            // Fallback vers l'ancienne structure pour rétrocompatibilité
            const oldData = localStorage.getItem('galligeo_anonymous_maps');
            return oldData ? JSON.parse(oldData) : [];
        } catch (error) {
            console.error('Erreur lors de la récupération des cartes anonymes:', error);
            return [];
        }
    }

    /**
     * Récupère la structure galligeo complète pour un utilisateur anonyme
     */
    getAnonymousGalligeoStructure() {
        try {
            const data = localStorage.getItem('galligeo_anonymous_structure');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Erreur lors de la récupération de la structure galligeo anonyme:', error);
            return null;
        }
    }

    /**
     * Sauvegarde le statut d'une carte pour un utilisateur anonyme
     */
    async saveAnonymousMapStatus(arkId, status, additionalData = {}) {
        try {
            // 1. Sauvegarder en localStorage dans la nouvelle structure
            await this.saveAnonymousMapToLocalStorage(arkId, status, additionalData);
            
            // 2. Envoyer à l'API avec l'utilisateur anonyme
            await this.saveAnonymousMapToAPI(arkId, status, additionalData);
            
            console.log(`Carte anonyme ${arkId} sauvegardée avec le statut '${status}' (local + API)`);
            
            return {
                ark: arkId,
                status: status,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la carte anonyme:', error);
            throw error;
        }
    }

    /**
     * Sauvegarde une carte anonyme en localStorage dans la structure galligeo
     */
    async saveAnonymousMapToLocalStorage(arkId, status, additionalData = {}) {
        try {
            // Récupérer ou créer la structure galligeo
            let galligeoData = JSON.parse(localStorage.getItem('galligeo_anonymous_structure') || '{}');
            
            // Initialiser la structure si elle n'existe pas
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
                quality: additionalData.quality || 2, // Qualité par défaut pour géoréférencement
                firstWorked: existingMapIndex >= 0 ? galligeoData.galligeo.rec_ark[existingMapIndex].firstWorked : now,
                lastUpdated: now,
                ...additionalData
            };
            
            if (existingMapIndex >= 0) {
                galligeoData.galligeo.rec_ark[existingMapIndex] = mapRecord;
            } else {
                galligeoData.galligeo.rec_ark.push(mapRecord);
            }
            
            // Mettre à jour la date de dernière modification globale
            galligeoData.galligeo.lastUpdated = now;
            
            // Sauvegarder en localStorage
            localStorage.setItem('galligeo_anonymous_structure', JSON.stringify(galligeoData));
            console.log(`📁 Structure galligeo anonyme mise à jour pour ${arkId}`);
            
            return mapRecord;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde localStorage anonyme:', error);
            throw error;
        }
    }

    /**
     * Envoie les données de carte anonyme à l'API avec l'utilisateur 0000-GALLI-ANONY-ME00
     */
    async saveAnonymousMapToAPI(arkId, status, additionalData = {}) {
        try {
            // Récupérer la structure galligeo actuelle depuis localStorage
            const galligeoData = this.getAnonymousGalligeoStructure() || {
                galligeo: {
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
                },
                cartoquete: {
                    favoris: []
                }
            };

            // Utiliser l'API existante /app/galligeo/data avec authentification spéciale
            const endpoint = '/app/galligeo/data';
            const url = `${this.baseUrl}${endpoint}`;
            
            // Headers pour requête anonyme - utiliser un token spécial ou header
            const headers = {
                'Content-Type': 'application/json',
                'X-Anonymous-Mode': 'true',
                'X-Client-Type': 'galligeo-anonymous',
                'X-Anonymous-Session': 'anonymous-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                'X-Anonymous-User': '0000-GALLI-ANONY-ME00'
            };
            
            console.log(`📡 Envoi carte anonyme ${arkId} à l'API pour utilisateur 0000-GALLI-ANONY-ME00`);
            console.log(`� URL: ${url}`);
            console.log('� Données API:', galligeoData);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(galligeoData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Erreur API: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
            }
            
            const result = await response.json();
            console.log('✅ Carte anonyme sauvegardée en API:', result);
            return result;
            
        } catch (error) {
            console.error('Erreur lors de l\'envoi à l\'API anonyme:', error);
            // Ne pas faire échouer la sauvegarde locale si l'API échoue
            console.warn('⚠️ Sauvegarde API échouée, mais sauvegarde locale conservée');
            return { success: false, error: error.message };
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
            }
            
            // Aussi supprimer de l'ancienne structure si elle existe (rétrocompatibilité)
            const oldData = localStorage.getItem('galligeo_anonymous_maps');
            if (oldData) {
                const anonymousMaps = JSON.parse(oldData);
                const filteredMaps = anonymousMaps.filter(map => map.ark !== arkId);
                localStorage.setItem('galligeo_anonymous_maps', JSON.stringify(filteredMaps));
            }
            
            console.log(`Carte anonyme ${arkId} supprimée de la structure galligeo`);
        } catch (error) {
            console.error('Erreur lors de la suppression de la carte anonyme:', error);
        }
    }

    /**
     * Crée un profil utilisateur temporaire pour les utilisateurs anonymes
     */
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

    /**
     * Version étendue de isAuthenticated qui indique le type d'utilisateur
     */
    getUserAuthStatus() {
        const isAuth = this.isAuthenticated();
        return {
            isAuthenticated: isAuth,
            isAnonymous: !isAuth,
            userType: isAuth ? 'authenticated' : 'anonymous'
        };
    }

    // ==============================================
    // SYSTÈME D'ÉCRITURE INCRÉMENTALE OPTIMISÉ
    // ==============================================

    /**
     * Génère un token JWT pour utilisateur anonyme
     */
    async generateAnonymousToken() {
        try {
            console.log('🔐 Génération token JWT anonyme...');
            
            const response = await fetch(`${this.baseUrl}/anonymous-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: '0000-GALLI-ANONY-ME00',
                    client_id: 'galligeo-frontend',
                    app: 'galligeo',
                    purpose: 'ark_submission',
                    anonymous: true
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = `API anonyme indisponible: ${response.status} ${response.statusText}`;
                
                if (response.status === 403) {
                    console.warn('⚠️ Utilisateur anonyme non autorisé - fonctionnement en mode local uniquement');
                } else if (response.status === 404) {
                    console.warn('⚠️ Endpoint anonyme non trouvé - fonctionnement en mode local uniquement');
                } else {
                    console.error('❌ Erreur API anonyme:', errorMsg, errorData);
                }
                
                throw new Error(`${errorMsg} - ${errorData.error || 'Mode local uniquement'}`);
            }

            const data = await response.json();
            const token = data.token;
            
            // Stocker le token avec expiration (selon expires_in ou 1 heure par défaut)
            const expiresIn = data.expires_in || 3600; // 3600 secondes = 1 heure
            const expirationTime = Date.now() + (expiresIn * 1000);
            localStorage.setItem('anonymous_token', token);
            localStorage.setItem('anonymous_token_expires', expirationTime.toString());
            
            console.log('✅ Token JWT anonyme généré');
            console.log(`ℹ️ Token expire dans ${expiresIn / 60} minutes`);
            return token;
            
        } catch (error) {
            console.error('❌ Erreur génération token anonyme:', error);
            throw error;
        }
    }

    /**
     * Récupère un token anonyme valide (génère si nécessaire)
     */
    async getValidAnonymousToken() {
        const existingToken = localStorage.getItem('anonymous_token');
        const expirationTime = localStorage.getItem('anonymous_token_expires');
        
        if (existingToken && expirationTime) {
            const expiration = parseInt(expirationTime);
            const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
            
            // Si le token expire dans plus de 5 minutes, on peut l'utiliser
            if (expiration > fiveMinutesFromNow) {
                console.log('✅ Token anonyme existant encore valide');
                return existingToken;
            }
        }
        
        // Token expiré ou inexistant, essayer de générer un nouveau
        try {
            console.log('🔄 Génération d\'un nouveau token anonyme...');
            return await this.generateAnonymousToken();
        } catch (error) {
            console.warn('⚠️ API JWT anonyme non disponible, fonctionnement en localStorage uniquement');
            console.log('ℹ️ Le système continuera en mode hors ligne pour les utilisateurs anonymes');
            // Retourner null pour indiquer qu'on fonctionne sans API
            return null;
        }
    }

    /**
     * Sauvegarde une carte pour un utilisateur anonyme (localStorage + API optionnel)
     */
    async saveAnonymousMapStatus(arkId, status, additionalData = {}) {
        try {
            console.log(`💾 Sauvegarde carte anonyme: ${arkId} - ${status}`);
            
            // 1. Sauvegarder en local d'abord (toujours)
            const localResult = await this.saveAnonymousMapToLocalStorage(arkId, status, additionalData);
            
            // 2. Essayer la sauvegarde API avec fusion intelligente (optionnel)
            try {
                await this.saveMapToAPI(arkId, status, additionalData, true); // true = mode anonyme
                console.log('✅ Sauvegarde complète (local + API avec fusion intelligente)');
            } catch (apiError) {
                console.warn('⚠️ Sauvegarde API échouée, local OK:', apiError.message);
                console.log('ℹ️ L\'application continue en mode hors ligne');
                // Continuer avec le localStorage seulement - pas d'erreur fatale
            }
            
            return localResult;
        } catch (error) {
            console.error('❌ Erreur sauvegarde carte anonyme:', error);
            throw error;
        }
    }

    /**
     * Sauvegarde optimisée avec fusion intelligente backend
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

            // Headers et URL selon le type d'utilisateur
            let headers = { 'Content-Type': 'application/json' };
            let url = `${this.baseUrl}/app/galligeo/data`;

            if (isAnonymous) {
                const token = await this.getValidAnonymousToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                } else {
                    // Pas de token disponible, impossible de sauvegarder en API
                    throw new Error('Token anonyme non disponible, sauvegarde localStorage uniquement');
                }
            } else {
                // Pour les utilisateurs authentifiés, utiliser le token JWT
                const token = this.getToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                } else {
                    throw new Error('Token d\'authentification non disponible');
                }
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                // Pour les utilisateurs anonymes, essayer de renouveler le token si 401
                if (isAnonymous && response.status === 401) {
                    console.log('🔄 Token expiré, renouvellement...');
                    localStorage.removeItem('anonymous_token');
                    localStorage.removeItem('anonymous_token_expires');
                    
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
     * Met à jour le statut d'une carte pour un utilisateur authentifié
     */
    async updateWorkedMap(arkId, status, additionalData = {}) {
        if (!this.isAuthenticated()) {
            throw new Error('Utilisateur non authentifié');
        }

        try {
            console.log(`💾 Mise à jour carte authentifiée: ${arkId} - ${status}`);
            const result = await this.saveMapToAPI(arkId, status, additionalData, false);
            console.log('✅ Carte mise à jour (API avec fusion intelligente)');
            return result;
        } catch (error) {
            console.error('❌ Erreur mise à jour carte authentifiée:', error);
            throw error;
        }
    }

    /**
     * Alias pour updateWorkedMap
     */
    async updateMapStatus(arkId, status, additionalData = {}) {
        return this.updateWorkedMap(arkId, status, additionalData);
    }

    /**
     * Sauvegarde en localStorage pour utilisateur anonyme
     */
    async saveAnonymousMapToLocalStorage(arkId, status, additionalData = {}) {
        try {
            const existingData = JSON.parse(localStorage.getItem('galligeo_anonymous_structure') || '{}');
            
            if (!existingData.galligeo) existingData.galligeo = {};
            if (!existingData.galligeo.workedMaps) existingData.galligeo.workedMaps = {};
            
            const now = new Date().toISOString();
            existingData.galligeo.workedMaps[arkId] = {
                ark: arkId,
                status: status,
                quality: additionalData.quality || 2,
                lastUpdated: now,
                firstWorked: existingData.galligeo.workedMaps[arkId]?.firstWorked || now,
                ...additionalData
            };
            
            localStorage.setItem('galligeo_anonymous_structure', JSON.stringify(existingData));
            console.log('✅ Carte sauvegardée en localStorage');
            return existingData.galligeo.workedMaps[arkId];
        } catch (error) {
            console.error('❌ Erreur sauvegarde localStorage:', error);
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
            
            const response = await fetch(`${this.baseUrl}/app/galligeo/data`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Données anonymes récupérées:', data);
                return data;
            } else {
                console.warn('⚠️ Aucune donnée anonyme trouvée ou erreur API');
                return null;
            }
        } catch (error) {
            console.error('❌ Erreur récupération données anonymes:', error);
            return null;
        }
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
            
            const response = await fetch(`${this.baseUrl}/app/galligeo/data`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`,
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
     * Sauvegarde les paramètres Galligeo pour un ARK spécifique
     */
    async saveSettings(settings, arkId = null) {
        try {
            const currentArk = arkId || window.input_ark;
            if (!currentArk) {
                throw new Error('Aucun ARK spécifié pour la sauvegarde');
            }

            const data = {
                version: "1.0",
                settings: settings,
                last_updated: new Date().toISOString(),
                arkId: currentArk
            };

            const result = await window.ptmAuth.saveAppData(this.appName, data, currentArk);
            console.log(`Paramètres sauvegardés sur le serveur pour ARK ${currentArk}:`, result);
            
            return result;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des paramètres:', error);
            throw error;
        }
    }

    /**
     * Charge les paramètres Galligeo depuis le serveur pour un ARK spécifique
     */
    async loadSettings(arkId = null) {
        try {
            const currentArk = arkId || window.input_ark;
            if (!currentArk) {
                console.log('Aucun ARK spécifié, pas de chargement possible');
                return null;
            }

            const data = await window.ptmAuth.getAppData(this.appName, currentArk);
            
            if (data && data.settings) {
                console.log(`Paramètres chargés depuis le serveur pour ARK ${currentArk}:`, data.settings);
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
     * Supprime les paramètres Galligeo du serveur pour un ARK spécifique
     */
    async deleteSettings(arkId = null) {
        try {
            const currentArk = arkId || window.input_ark;
            if (!currentArk) {
                throw new Error('Aucun ARK spécifié pour la suppression');
            }

            const result = await window.ptmAuth.deleteAppData(this.appName, currentArk);
            console.log(`Paramètres supprimés du serveur pour ARK ${currentArk}:`, result);
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
