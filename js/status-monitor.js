/**
 * Monitoring silencieux des statuts des cartes
 * Ne fait que compter et signaler les erreurs importantes
 */

window.statusMonitor = {
    errorCount: 0,
    lastCheck: null,
    
    /**
     * Vérifie silencieusement la cohérence des statuts
     */
    async checkStatus() {
        try {
            if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
                return;
            }
            
            const localMaps = await window.ptmAuth.getWorkedMaps();
            const monitorToken = window.ptmAuth.getToken();
            const response = await fetch('https://api.ptm.huma-num.fr/auth/admin/galligeo/georeferenced-maps-by-users', {
                headers: monitorToken ? { 'Authorization': `Bearer ${monitorToken}` } : {}
            });
            
            if (!response.ok) return;
            
            const apiData = await response.json();
            if (apiData.status !== 'ok' || !apiData.users) return;
            
            const userProfile = await window.ptmAuth.getUserProfile();
            const userOrcid = userProfile?.orcid || userProfile?.orcid_id;
            const currentUser = apiData.users.find(user => 
                user.orcid_id === userOrcid || user.orcid === userOrcid
            );
            
            if (!currentUser) return;
            
            // Compter les incohérences
            let inconsistencies = 0;
            
            for (const apiMap of currentUser.georeferenced_maps) {
                const localMap = localMaps.find(map => map.ark === apiMap.ark);
                if (!localMap || localMap.status !== apiMap.status) {
                    inconsistencies++;
                }
            }
            
            this.lastCheck = new Date();
            
            // Signaler uniquement si beaucoup d'incohérences
            if (inconsistencies > 3) {
                console.warn(`Status monitoring: ${inconsistencies} incohérences détectées`);
                this.errorCount++;
            }
            
        } catch (error) {
            this.errorCount++;
            if (this.errorCount > 5) {
                console.error('Status monitoring: erreurs répétées', error);
            }
        }
    }
};

// Vérification périodique discrète
document.addEventListener('userLoggedIn', function() {
    // Première vérification après 30 secondes
    setTimeout(() => {
        window.statusMonitor.checkStatus();
    }, 30000);
    
    // Puis toutes les 10 minutes
    setInterval(() => {
        window.statusMonitor.checkStatus();
    }, 600000);
});