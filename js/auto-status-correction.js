/**
 * Script d'auto-correction pour les cartes géoréférencées manquantes
 * Ce script s'exécute automatiquement lors de la connexion pour s'assurer
 * que toutes les cartes géoréférencées sont bien ajoutées à la liste des cartes travaillées
 */

window.autoStatusCorrection = {
    
    /**
     * Corrige automatiquement les statuts lors de la connexion
     */
    async performAutoCorrection() {
        try {
            if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
                return;
            }
            
            const response = await fetch('https://api.ptm.huma-num.fr/auth/admin/galligeo/georeferenced-maps-by-users');
            
            if (!response.ok) {
                return;
            }
            
            const apiData = await response.json();
            
            if (apiData.status !== 'ok' || !apiData.users) {
                return;
            }
            
            const userProfile = await window.ptmAuth.getUserProfile();
            const userOrcid = userProfile?.orcid || userProfile?.orcid_id;
            
            const currentUser = apiData.users.find(user => 
                user.orcid_id === userOrcid || user.orcid === userOrcid
            );
            
            if (!currentUser || !currentUser.georeferenced_maps) {
                return;
            }
            
            const localMaps = await window.ptmAuth.getWorkedMaps();
            const localArks = localMaps.map(map => map.ark);
            
            let correctionsMade = 0;
            
            for (const apiMap of currentUser.georeferenced_maps) {
                if (!localArks.includes(apiMap.ark)) {
                    try {
                        await window.ptmAuth.saveMapStatus(apiMap.ark, apiMap.status, {
                            firstWorked: apiMap.firstWorked,
                            lastUpdated: apiMap.lastUpdated,
                            quality: apiMap.quality || 2
                        });
                        
                        correctionsMade++;
                        
                    } catch (error) {
                        console.error(`❌ Erreur lors de l'ajout automatique de ${apiMap.ark}:`, error);
                    }
                } else {
                    const localMap = localMaps.find(map => map.ark === apiMap.ark);
                    if (localMap && localMap.status !== apiMap.status) {
                        try {
                            await window.ptmAuth.saveMapStatus(apiMap.ark, apiMap.status, {
                                firstWorked: localMap.firstWorked,
                                lastUpdated: apiMap.lastUpdated,
                                quality: apiMap.quality || localMap.quality || 2
                            });
                            
                            correctionsMade++;
                            
                        } catch (error) {
                            console.error(`❌ Erreur lors de la correction de statut de ${apiMap.ark}:`, error);
                        }
                    }
                }
            }
            
            if (correctionsMade > 0) {
                if (window.workedMapsManager && document.getElementById('worked-maps-container')) {
                    setTimeout(() => {
                        window.workedMapsManager.displayWorkedMaps();
                    }, 1000);
                }
            }
            
        } catch (error) {
        }
    }
};

document.addEventListener('userLoggedIn', async function(event) {
    setTimeout(() => {
        window.autoStatusCorrection.performAutoCorrection();
    }, 2000);
});