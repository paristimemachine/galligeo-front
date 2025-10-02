/**
 * Module d'authentification PTM - Version corrigée conforme à la doc backend
 * Basé sur la documentation API PTM v2025-10-02
 * 
 * MISE À JOUR: Support des tokens JWT anonymes (disponible depuis oct 2025)
 */
class PTMAuthFixed {
    constructor() {
        this.baseUrl = 'https://api.ptm.huma-num.fr/auth';
        this.token = null;
        this.userInfo = null;
        this.anonymousUser = '0000-GALLI-ANONY-ME00';
    }

    /**
     * Récupère le token JWT depuis le localStorage ou l'URL
     */
    getToken() {
        if (this.token) {
            return this.token;
        }

        // Vérifier l'URL (après connexion ORCID)
        const hash = window.location.hash;
        if (hash.includes('token=')) {
            const tokenMatch = hash.match(/token=([^&]+)/);
            if (tokenMatch) {
                this.token = tokenMatch[1];
                localStorage.setItem('ptm_auth_token', this.token);
                window.location.hash = '';
                console.log('✅ Token ORCID extrait de l\'URL');
                return this.token;
            }
        }

        // Vérifier le localStorage
        const localToken = localStorage.getItem('ptm_auth_token');
        if (localToken) {
            this.token = localToken;
            return this.token;
        }

        return null;
    }

    /**
     * Vérifie si l'utilisateur est authentifié
     */
    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;

        // Vérifier l'expiration du token JWT
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            return payload.exp && payload.exp > now;
        } catch (error) {
            console.warn('⚠️ Token invalide:', error);
            return false;
        }
    }

    /**
     * Connexion ORCID - Redirige vers la page de connexion PTM
     */
    loginOrcid() {
        const redirectUrl = encodeURIComponent(window.location.href);
        const loginUrl = `${this.baseUrl}/login?redirect_url=${redirectUrl}`;
        console.log('🔐 Redirection vers connexion ORCID:', loginUrl);
        window.location.href = loginUrl;
    }

    /**
     * Génère un token JWT anonyme selon la nouvelle API backend
     * NOUVEAU: Le backend supporte maintenant les tokens JWT anonymes !
     */
    async generateAnonymousToken() {
        try {
            console.log('🔐 Génération token JWT anonyme...');
            console.log('📍 URL actuelle:', window.location.href);
            console.log('📍 URL API:', `${this.baseUrl}/anonymous-token`);
            
            const requestConfig = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Anonymous-User': this.anonymousUser,
                    'X-Client-Identifier': 'galligeo-frontend'
                },
                body: JSON.stringify({
                    app: 'galligeo',
                    purpose: 'ark_submission'
                })
            };
            
            console.log('📤 Configuration requête:', JSON.stringify(requestConfig, null, 2));
            
            const response = await fetch(`${this.baseUrl}/anonymous-token`, requestConfig);

            console.log('📥 Réponse reçue:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text().catch(() => response.statusText);
                throw new Error(`Erreur ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            const token = data.token;
            
            // Stocker avec expiration (1h par défaut)
            const expiresIn = data.expires_in || 3600;
            const expirationTime = Date.now() + (expiresIn * 1000);
            
            localStorage.setItem('anonymous_token', token);
            localStorage.setItem('anonymous_token_expires', expirationTime.toString());
            
            console.log(`✅ Token JWT anonyme généré (expire dans ${expiresIn/60} min)`);
            return token;
            
        } catch (error) {
            console.error('❌ Erreur génération token JWT anonyme:', error);
            console.error('   Type erreur:', error.constructor.name);
            console.error('   Message:', error.message);
            
            // Diagnostic CORS
            if (error.message === 'Failed to fetch') {
                console.error('⚠️ DIAGNOSTIC CORS:');
                console.error('   - Si vous êtes sur http://localhost ou file://, c\'est normal (CORS bloque)');
                console.error('   - Vous devez accéder via https://ptm.huma-num.fr/galligeo/');
                console.error('   - URL actuelle:', window.location.href);
            }
            
            throw error;
        }
    }

    /**
     * Récupère un token JWT anonyme valide
     */
    async getValidAnonymousToken() {
        const existingToken = localStorage.getItem('anonymous_token');
        const expirationTime = localStorage.getItem('anonymous_token_expires');
        
        if (existingToken && expirationTime) {
            const expiration = parseInt(expirationTime);
            const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
            
            if (expiration > fiveMinutesFromNow) {
                console.log('✅ Token JWT anonyme existant encore valide');
                return existingToken;
            }
        }
        
        // Token expiré ou inexistant, générer un nouveau
        console.log('🔄 Génération nouveau token JWT anonyme...');
        return await this.generateAnonymousToken();
    }

    /**
     * Déconnexion
     */
    logout() {
        this.token = null;
        this.userInfo = null;
        localStorage.removeItem('ptm_auth_token');
        localStorage.removeItem('anonymous_token');
        localStorage.removeItem('anonymous_token_expires');
        console.log('👋 Déconnexion effectuée');
    }

    /**
     * Récupère les informations du profil utilisateur
     */
    async getUserProfile() {
        try {
            return await this.authenticatedApiCall('/user/profile', {
                method: 'GET'
            });
        } catch (error) {
            console.error('❌ Erreur récupération profil:', error);
            throw error;
        }
    }

    /**
     * Appel API authentifié (utilisateur ORCID)
     */
    async authenticatedApiCall(endpoint, options = {}) {
        const token = this.getToken();
        if (!token) {
            throw new Error('Non authentifié. Veuillez vous connecter avec ORCID.');
        }

        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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
                this.logout();
                throw new Error('Session expirée. Veuillez vous reconnecter.');
            }
            
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Erreur API: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Appel API anonyme - Mode simple avec headers (FALLBACK)
     * Utilisé si le token JWT n'est pas disponible
     */
    async anonymousApiCall(endpoint, options = {}) {
        console.log('ℹ️ Appel API anonyme en mode simple (headers)');
        
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'X-Anonymous-Mode': 'true',
            'X-Anonymous-User': this.anonymousUser
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
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Erreur API anonyme: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Appel API anonyme avec token JWT (MODE RECOMMANDÉ)
     */
    async anonymousApiCallWithToken(endpoint, options = {}) {
        const token = await this.getValidAnonymousToken();
        
        console.log('🔐 Appel API anonyme avec token JWT');
        
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Erreur API anonyme JWT: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Récupère les données Galligeo pour utilisateur authentifié
     */
    async getGalligeoData() {
        try {
            return await this.authenticatedApiCall('/app/galligeo/data', {
                method: 'GET'
            });
        } catch (error) {
            console.error('❌ Erreur récupération données Galligeo authentifiées:', error);
            throw error;
        }
    }

    /**
     * Sauvegarde les données Galligeo pour utilisateur authentifié  
     */
    async saveGalligeoData(data) {
        try {
            // Valider la structure selon la doc backend
            const validatedData = this.validateGalligeoData(data);
            
            return await this.authenticatedApiCall('/app/galligeo/data', {
                method: 'POST',
                body: JSON.stringify(validatedData)
            });
        } catch (error) {
            console.error('❌ Erreur sauvegarde données Galligeo authentifiées:', error);
            throw error;
        }
    }

    /**
     * Récupère les données Galligeo pour utilisateur anonyme
     * PRIORITÉ: Utilise le token JWT si disponible, sinon fallback sur mode simple
     */
    async getGalligeoDataAnonymous() {
        try {
            // Essayer d'abord avec token JWT (recommandé)
            try {
                console.log('📥 Récupération données Galligeo anonymes (avec JWT)...');
                return await this.anonymousApiCallWithToken('/app/galligeo/data', {
                    method: 'GET'
                });
            } catch (jwtError) {
                console.warn('⚠️ JWT non disponible, fallback sur mode simple:', jwtError.message);
                // Fallback sur mode simple avec headers X-Anonymous-*
                return await this.anonymousApiCall('/app/galligeo/data', {
                    method: 'GET'
                });
            }
        } catch (error) {
            console.error('❌ Erreur récupération données Galligeo anonymes:', error);
            throw error;
        }
    }

    /**
     * Sauvegarde les données Galligeo pour utilisateur anonyme
     * PRIORITÉ: Utilise le token JWT si disponible, sinon fallback sur mode simple
     */
    async saveGalligeoDataAnonymous(data) {
        try {
            // Valider la structure selon la doc backend
            const validatedData = this.validateGalligeoData(data);
            
            // Essayer d'abord avec token JWT (recommandé)
            try {
                console.log('💾 Sauvegarde données Galligeo anonymes (avec JWT)...');
                return await this.anonymousApiCallWithToken('/app/galligeo/data', {
                    method: 'POST',
                    body: JSON.stringify(validatedData)
                });
            } catch (jwtError) {
                console.warn('⚠️ JWT non disponible, fallback sur mode simple:', jwtError.message);
                // Fallback sur mode simple avec headers X-Anonymous-*
                return await this.anonymousApiCall('/app/galligeo/data', {
                    method: 'POST',
                    body: JSON.stringify(validatedData)
                });
            }
        } catch (error) {
            console.error('❌ Erreur sauvegarde données Galligeo anonymes:', error);
            throw error;
        }
    }

    /**
     * Valide et formate les données selon la structure backend
     */
    validateGalligeoData(data) {
        const validated = {
            rec_ark: [],
            settings: {}
        };

        // Gérer rec_ark selon la doc backend
        if (data.rec_ark && Array.isArray(data.rec_ark)) {
            validated.rec_ark = data.rec_ark.map(item => ({
                ark: item.ark,                                    // OBLIGATOIRE
                status: item.status,                              // OBLIGATOIRE
                quality: item.quality || 2,                      // Optionnel: 1-4
                firstWorked: item.firstWorked || new Date().toISOString(),  // Optionnel
                lastUpdated: item.lastUpdated || new Date().toISOString()   // Optionnel
            }));
        }

        // Gérer les settings
        if (data.settings && typeof data.settings === 'object') {
            validated.settings = { ...data.settings };
        }

        return validated;
    }

    /**
     * Sauvegarde le statut d'une carte ARK spécifique
     */
    async saveMapStatus(arkId, status, additionalData = {}) {
        const mapData = {
            ark: arkId,
            status: status,
            quality: additionalData.quality || 2,
            firstWorked: additionalData.firstWorked || new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        try {
            // Récupérer les données existantes
            let existingData;
            if (this.isAuthenticated()) {
                existingData = await this.getGalligeoData();
            } else {
                existingData = await this.getGalligeoDataAnonymous();
            }

            // Fusionner avec les données existantes
            const rec_ark = existingData.rec_ark || [];
            const existingIndex = rec_ark.findIndex(item => item.ark === arkId);

            if (existingIndex >= 0) {
                // Mettre à jour l'entrée existante
                rec_ark[existingIndex] = { ...rec_ark[existingIndex], ...mapData };
            } else {
                // Ajouter nouvelle entrée
                rec_ark.push(mapData);
            }

            const updatedData = {
                rec_ark: rec_ark,
                settings: existingData.settings || {}
            };

            // Sauvegarder selon le mode d'authentification
            if (this.isAuthenticated()) {
                return await this.saveGalligeoData(updatedData);
            } else {
                return await this.saveGalligeoDataAnonymous(updatedData);
            }

        } catch (error) {
            console.error('❌ Erreur sauvegarde statut carte:', error);
            throw error;
        }
    }

    /**
     * Sauvegarde le statut en mode anonyme (fonction wrapper pour compatibilité)
     */
    async saveAnonymousMapStatus(arkId, status, additionalData = {}) {
        // S'assurer qu'on n'est pas authentifié
        if (this.isAuthenticated()) {
            console.warn('⚠️ Utilisateur authentifié, utiliser saveMapStatus() à la place');
            return this.saveMapStatus(arkId, status, additionalData);
        }

        return this.saveMapStatus(arkId, status, additionalData);
    }

    /**
     * Récupère toutes les cartes avec un statut spécifique
     */
    async getMapsByStatus(status) {
        try {
            let data;
            if (this.isAuthenticated()) {
                data = await this.getGalligeoData();
            } else {
                data = await this.getGalligeoDataAnonymous();
            }

            return (data.rec_ark || []).filter(item => item.status === status);
        } catch (error) {
            console.error('❌ Erreur récupération cartes par statut:', error);
            throw error;
        }
    }

    /**
     * Test de connectivité API (pour diagnostic)
     */
    async testApiConnectivity() {
        const results = {
            authenticated: false,
            anonymous: false,
            anonymousJWT: false,
            errors: []
        };

        // Test authentifié si token disponible
        if (this.isAuthenticated()) {
            try {
                await this.getGalligeoData();
                results.authenticated = true;
                console.log('✅ API authentifiée fonctionne');
            } catch (error) {
                results.errors.push(`Auth: ${error.message}`);
                console.error('❌ API authentifiée échoue:', error);
            }
        }

        // Test anonyme avec JWT
        try {
            await this.getGalligeoDataAnonymous();
            results.anonymousJWT = true;
            console.log('✅ API anonyme JWT fonctionne');
        } catch (error) {
            results.errors.push(`Anonymous JWT: ${error.message}`);
            console.error('❌ API anonyme JWT échoue:', error);
        }

        // Test anonyme mode simple
        try {
            await this.anonymousApiCall('/app/galligeo/data', { method: 'GET' });
            results.anonymous = true;
            console.log('✅ API anonyme simple fonctionne');
        } catch (error) {
            results.errors.push(`Anonymous simple: ${error.message}`);
            console.error('❌ API anonyme simple échoue:', error);
        }

        return results;
    }
}

// Instance globale
window.ptmAuthFixed = new PTMAuthFixed();
console.log('✅ PTMAuthFixed chargé et initialisé');
