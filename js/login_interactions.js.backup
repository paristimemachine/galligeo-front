/**
 * Script pour la page login.html
 * Gère l'affichage dynamique des informations utilisateur
 * Utilise les fonctions d'authentification de api_interactions.js
 */

/**
 * Récupère le token JWT depuis l'URL (fragment) ou le localStorage
 */
function getAuthToken() {
    // D'abord, vérifier s'il y a un token dans l'URL (après connexion)
    const hash = window.location.hash;
    if (hash.includes('token=')) {
        const tokenMatch = hash.match(/token=([^&]+)/);
        if (tokenMatch) {
            const token = tokenMatch[1];
            localStorage.setItem('ptm_auth_token', token);
            // Nettoyer l'URL
            window.location.hash = '';
            return token;
        }
    }
    
    // Sinon, vérifier le localStorage (utilise la même clé que api_interactions.js)
    return localStorage.getItem('ptm_auth_token');
}

/**
 * Vérifie l'état de connexion de l'utilisateur au chargement de la page
 * Utilise la fonction checkAuthStatus de api_interactions.js si disponible
 */
async function checkAuthStatusForLogin() {
    // Si api_interactions.js est chargé, utiliser ses fonctions
    if (typeof window.checkAuthStatus === 'function') {
        try {
            await window.checkAuthStatus();
            
            // Récupérer les données globales d'api_interactions.js
            if (window.isLoggedIn && window.userData) {
                updateUserProfile();
                return window.userData;
            }
        } catch (error) {
            console.warn('Erreur lors de l\'appel de checkAuthStatus global:', error);
            // Continuer avec notre propre vérification en cas d\'erreur
        }
    }
    
    // Sinon, faire notre propre vérification
    const token = getAuthToken();
    
    if (!token) {
        showNotLoggedInMessage();
        return null;
    }

    try {
        // Utiliser la nouvelle route /api/profile pour récupérer le profil complet
        const response = await fetch(`${AUTH_API_BASE}/api/profile`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const profileData = await response.json();
            
            // Récupérer aussi les données du token JWT pour avoir l'ORCID
            const tokenResponse = await fetch(`${AUTH_API_BASE}/data`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            let tokenData = {};
            if (tokenResponse.ok) {
                tokenData = await tokenResponse.json();
            }
            
            // Combiner les données du profil et du token
            const userData = {
                orcid: tokenData.sub || '',
                name: tokenData.name || `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim(),
                first_name: profileData.first_name || '',
                last_name: profileData.last_name || '',
                email: profileData.email || '',
                institution: profileData.institution || ''
            };
            
            updateUserProfileDisplay(userData);
            return userData;
        } else {
            // Token invalide ou expiré
            localStorage.removeItem('ptm_auth_token');
            showNotLoggedInMessage();
            return null;
        }
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
        showNotLoggedInMessage();
        return null;
    }
}

/**
 * Met à jour l'affichage des informations du profil utilisateur
 */
function updateUserProfileDisplay(userData = null) {
    // Utiliser les données globales ou celles passées en paramètre
    const userInfo = userData || (window.userData && window.isLoggedIn ? window.userData : null);
    
    if (!userInfo) return;
    
    // Mettre à jour le titre de la page
    const pageTitle = document.querySelector('h1');
    if (pageTitle) {
        const displayName = userInfo.name || `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || userInfo.orcid;
        pageTitle.textContent = `Mon Galligeo - ${displayName}`;
    }
    
    // Mettre à jour les informations dans le panel profil
    updateProfilePanel(userInfo);
}

/**
 * Sauvegarde le profil utilisateur via l'API
 */
async function saveUserProfile(profileData) {
    const token = localStorage.getItem('ptm_auth_token');
    
    if (!token) {
        console.error('Token d\'authentification manquant');
        return false;
    }
    
    try {
        const response = await fetch(`${AUTH_API_BASE}/api/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(profileData)
        });
        
        if (response.ok) {
            const updatedData = await response.json();
            console.log('Profil mis à jour avec succès:', updatedData);
            
            // Recharger les données utilisateur
            await checkAuthStatus();
            
            return true;
        } else {
            console.error('Erreur lors de la mise à jour du profil:', response.status);
            return false;
        }
    } catch (error) {
        console.error('Erreur réseau lors de la mise à jour du profil:', error);
        return false;
    }
}

/**
 * Met à jour le panneau de profil avec les données utilisateur
 */
function updateProfilePanel(userData) {
    // Panneau informations personnelles
    const firstNameSpan = document.getElementById('user-first-name');
    const lastNameSpan = document.getElementById('user-last-name');
    const orcidSpan = document.getElementById('user-orcid');
    const emailSpan = document.getElementById('user-email');
    const institutionSpan = document.getElementById('user-institution');
    
    if (firstNameSpan) firstNameSpan.textContent = userData.first_name || 'Non renseigné';
    if (lastNameSpan) lastNameSpan.textContent = userData.last_name || 'Non renseigné';
    if (orcidSpan) orcidSpan.textContent = userData.orcid || 'Non renseigné';
    if (emailSpan) emailSpan.textContent = userData.email || 'Non renseigné';
    if (institutionSpan) institutionSpan.textContent = userData.institution || 'Non renseigné';
    
    // Pré-remplir les formulaires d'édition s'ils existent
    const firstNameInput = document.getElementById('edit-first-name');
    const lastNameInput = document.getElementById('edit-last-name');
    const emailInput = document.getElementById('edit-email');
    const institutionInput = document.getElementById('edit-institution');
    
    if (firstNameInput) firstNameInput.value = userData.first_name || '';
    if (lastNameInput) lastNameInput.value = userData.last_name || '';
    if (emailInput) emailInput.value = userData.email || '';
    if (institutionInput) institutionInput.value = userData.institution || '';
}

/**
 * Affiche un message pour les utilisateurs non connectés
 */
function showNotLoggedInMessage() {
    const main = document.querySelector('main');
    if (!main) return;
    
    main.innerHTML = `
        <div class="fr-container fr-pt-6w fr-pb-6w">
            <div class="fr-alert fr-alert--info">
                <h3 class="fr-alert__title">Connexion requise</h3>
                <p>Vous devez être connecté pour accéder à cette page.</p>
                <p>
                    <a href="ggo.html" class="fr-btn fr-btn--secondary">
                        Retourner à l'accueil
                    </a>
                    <button class="fr-btn" 
                            onclick="window.location.href='https://api.ptm.huma-num.fr/auth/login?redirect_url=https://app.ptm.huma-num.fr/galligeo/login.html'">
                        Se connecter avec ORCID
                    </button>
                </p>
            </div>
        </div>
    `;
}

/**
 * Ajoute un bouton de déconnexion dans l'en-tête
 */
function addLogoutButton() {
    if (!isLoggedIn) return;
    
    const header = document.querySelector('.fr-header__brand');
    if (!header) return;
    
    const logoutButton = document.createElement('div');
    logoutButton.style.position = 'absolute';
    logoutButton.style.top = '10px';
    logoutButton.style.right = '20px';
    logoutButton.innerHTML = `
        <button class="fr-btn fr-btn--sm fr-icon-logout-box-r-line" onclick="logout()">
            Se déconnecter
        </button>
    `;
    
    header.style.position = 'relative';
    header.appendChild(logoutButton);
}

/**
 * Déconnecte l'utilisateur
 */
async function logout() {
    try {
        // Supprimer le token du localStorage
        localStorage.removeItem('ptm_auth_token');
        authToken = null;
        
        // Rediriger vers la page d'accueil après déconnexion
        window.location.href = 'ggo.html';
        
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        // Rediriger quand même en cas d'erreur
        window.location.href = 'ggo.html';
    }
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', async function() {
    await checkAuthStatusForLogin();
    
    // Ajouter un bouton de déconnexion si l'utilisateur est connecté
    const isUserLoggedIn = window.isLoggedIn || (localStorage.getItem('ptm_auth_token') !== null);
    if (isUserLoggedIn) {
        addLogoutButton();
    }
});
