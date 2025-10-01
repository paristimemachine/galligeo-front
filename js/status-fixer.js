/**
 * Script de correction pour mettre à jour les statuts des cartes géoréférencées
 * Ce script identifie les cartes qui ont été géoréférencées mais dont le statut
 * n'a pas été correctement mis à jour dans la base de données.
 */

window.statusFixer = {
    /**
     * Corrige les statuts des cartes géoréférencées manquantes
     */
    async fixMissingGeoreferencedStatus() {
        console.log('🔧 Correction des statuts des cartes géoréférencées...');
        
        try {
            if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
                console.log('❌ Utilisateur non connecté, impossible de corriger les statuts');
                return;
            }
            
            // 1. Récupérer les cartes travaillées localement
            const localMaps = await window.ptmAuth.getWorkedMaps();
            console.log('Cartes travaillées localement:', localMaps.length);
            
            // 2. Récupérer les cartes depuis l'API galerie
            const response = await fetch('https://api.ptm.huma-num.fr/auth/admin/galligeo/georeferenced-maps-by-users');
            const apiData = await response.json();
            
            if (apiData.status !== 'ok' || !apiData.users) {
                throw new Error('Données invalides depuis l\'API galerie');
            }
            
            // 3. Trouver l'utilisateur actuel
            const userProfile = await window.ptmAuth.getUserProfile();
            const currentUser = apiData.users.find(user => 
                user.orcid_id === userProfile?.orcid_id
            );
            
            if (!currentUser) {
                console.log('Utilisateur actuel non trouvé dans l\'API galerie');
                return;
            }
            
            console.log(`Cartes de l'utilisateur dans l'API: ${currentUser.georeferenced_maps.length}`);
            
            // 4. Identifier les cartes avec des statuts incohérents
            const fixesToApply = [];
            
            for (const apiMap of currentUser.georeferenced_maps) {
                const localMap = localMaps.find(map => map.ark === apiMap.ark);
                
                if (!localMap) {
                    // Carte dans l'API mais pas localement - l'ajouter
                    fixesToApply.push({
                        type: 'add',
                        ark: apiMap.ark,
                        status: apiMap.status,
                        lastUpdated: apiMap.lastUpdated,
                        firstWorked: apiMap.firstWorked
                    });
                } else if (localMap.status !== apiMap.status) {
                    // Statut différent - mettre à jour
                    fixesToApply.push({
                        type: 'update',
                        ark: apiMap.ark,
                        oldStatus: localMap.status,
                        newStatus: apiMap.status,
                        lastUpdated: apiMap.lastUpdated
                    });
                }
            }
            
            // 5. Identifier les cartes "en-cours" qui devraient être "georeferenced"
            // (cartes présentes localement mais avec un mauvais statut)
            for (const localMap of localMaps) {
                if (localMap.status === 'en-cours') {
                    // Vérifier si cette carte a été réellement géoréférencée
                    // en vérifiant si elle existe sur le serveur de tuiles
                    const isGeoreferenced = await this.checkIfMapIsGeoreferenced(localMap.ark);
                    
                    if (isGeoreferenced) {
                        fixesToApply.push({
                            type: 'update',
                            ark: localMap.ark,
                            oldStatus: 'en-cours',
                            newStatus: 'georeferenced',
                            lastUpdated: new Date().toISOString()
                        });
                    }
                }
            }
            
            console.log(`Corrections à appliquer: ${fixesToApply.length}`);
            fixesToApply.forEach(fix => {
                console.log(`- ${fix.type}: ${fix.ark} ${fix.oldStatus ? `(${fix.oldStatus} → ${fix.newStatus})` : `(ajouter: ${fix.status})`}`);
            });
            
            // 6. Appliquer les corrections
            if (fixesToApply.length > 0) {
                const applyFixes = confirm(
                    `${fixesToApply.length} correction(s) de statut ont été identifiées.\n\n` +
                    fixesToApply.map(fix => 
                        `${fix.ark}: ${fix.oldStatus ? `${fix.oldStatus} → ${fix.newStatus}` : `ajouter (${fix.status})`}`
                    ).join('\n') +
                    '\n\nVoulez-vous appliquer ces corrections ?'
                );
                
                if (applyFixes) {
                    let successCount = 0;
                    
                    for (const fix of fixesToApply) {
                        try {
                            if (fix.type === 'add') {
                                await window.ptmAuth.updateWorkedMap(fix.ark, {
                                    firstWorked: fix.firstWorked,
                                    lastUpdated: fix.lastUpdated
                                }, fix.status);
                            } else {
                                await window.ptmAuth.updateMapStatus(fix.ark, fix.newStatus, {
                                    lastUpdated: fix.lastUpdated
                                });
                            }
                            successCount++;
                            console.log(`✅ Correction appliquée pour ${fix.ark}`);
                        } catch (error) {
                            console.error(`❌ Erreur lors de la correction de ${fix.ark}:`, error);
                        }
                    }
                    
                    console.log(`🎉 ${successCount}/${fixesToApply.length} corrections appliquées avec succès`);
                    
                    if (successCount > 0) {
                        alert(`Corrections appliquées avec succès!\n${successCount} carte(s) corrigée(s).`);
                    }
                } else {
                    console.log('Corrections annulées par l\'utilisateur');
                }
            } else {
                console.log('✅ Aucune correction nécessaire, tous les statuts sont cohérents');
                alert('Tous les statuts des cartes sont déjà cohérents !');
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de la correction des statuts:', error);
            alert('Erreur lors de la correction des statuts. Voir la console pour plus de détails.');
        }
    },
    
    /**
     * Vérifie si une carte est réellement géoréférencée sur le serveur
     */
    async checkIfMapIsGeoreferenced(arkId) {
        try {
            // Vérifier si la carte existe sur le serveur de tuiles
            const tileUrl = `https://tile.ptm.huma-num.fr/tiles/ark/12148/${arkId}/0/0/0.png`;
            
            const response = await fetch(tileUrl, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            console.log(`Impossible de vérifier le statut de géoréférencement pour ${arkId}:`, error);
            return false;
        }
    },
    
    /**
     * Synchronise les données utilisateur avec l'API
     */
    async syncWithAPI() {
        console.log('🔄 Synchronisation avec l\'API...');
        
        try {
            if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
                console.log('❌ Utilisateur non connecté');
                return;
            }
            
            // Forcer le rechargement des données depuis l'API
            const freshData = await window.ptmAuth.getWorkedMaps();
            console.log('Données fraîches récupérées:', freshData);
            
            // Recharger l'affichage
            if (window.workedMapsManager && typeof window.workedMapsManager.displayWorkedMaps === 'function') {
                await window.workedMapsManager.displayWorkedMaps();
            }
            
            console.log('✅ Synchronisation terminée');
            
        } catch (error) {
            console.error('❌ Erreur lors de la synchronisation:', error);
        }
    }
};

// Faciliter l'accès depuis la console
window.fixStatus = window.statusFixer.fixMissingGeoreferencedStatus.bind(window.statusFixer);
window.syncData = window.statusFixer.syncWithAPI.bind(window.statusFixer);

console.log('Script de correction des statuts chargé. Utilisez:');
console.log('- window.fixStatus() pour corriger les statuts incohérents');
console.log('- window.syncData() pour synchroniser avec l\'API');