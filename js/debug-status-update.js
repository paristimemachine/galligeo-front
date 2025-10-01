/**
 * Script de débogage pour tester la mise à jour des statuts des cartes
 */

window.debugStatusUpdate = {
    /**
     * Teste la mise à jour du statut après géoréférencement
     */
    async testGeoreferencingStatusUpdate(arkId = 'btv1b53121232b') {
        console.log('=== Test de mise à jour du statut après géoréférencement ===');
        
        try {
            // Vérifier que les composants nécessaires sont disponibles
            console.log('Vérification des composants:');
            console.log('- window.ptmAuth:', !!window.ptmAuth);
            console.log('- window.workedMapsManager:', !!window.workedMapsManager);
            console.log('- window.input_ark:', window.input_ark);
            
            if (!window.ptmAuth) {
                throw new Error('PTMAuth non disponible');
            }
            
            if (!window.ptmAuth.isAuthenticated()) {
                throw new Error('Utilisateur non authentifié');
            }
            
            if (!window.workedMapsManager) {
                throw new Error('WorkedMapsManager non disponible');
            }
            
            // Tester la mise à jour du statut
            console.log(`Mise à jour du statut pour ${arkId} vers "georeferenced"`);
            
            const result = await window.workedMapsManager.updateMapStatus(arkId, 'georeferenced');
            
            if (result) {
                console.log('✅ Mise à jour du statut réussie');
                
                // Vérifier que la mise à jour est bien sauvegardée
                const workedMaps = await window.ptmAuth.getWorkedMaps();
                const updatedMap = workedMaps.find(map => map.ark === arkId);
                
                if (updatedMap && updatedMap.status === 'georeferenced') {
                    console.log('✅ Statut correctement sauvegardé dans la base de données');
                    console.log('Carte mise à jour:', updatedMap);
                } else {
                    console.log('❌ Statut non trouvé ou incorrect dans la base de données');
                    console.log('Cartes travaillées:', workedMaps);
                }
            } else {
                console.log('❌ Erreur lors de la mise à jour du statut');
            }
            
        } catch (error) {
            console.error('❌ Erreur durante le test:', error);
        }
    },
    
    /**
     * Teste la mise à jour du statut après dépôt
     */
    async testDepositStatusUpdate(arkId = 'btv1b53121232b') {
        console.log('=== Test de mise à jour du statut après dépôt ===');
        
        try {
            // Simuler un dépôt avec DOI
            const testDoi = '10.34847/nkl.test123';
            
            console.log(`Mise à jour du statut pour ${arkId} vers "deposee" avec DOI ${testDoi}`);
            
            const result = await window.workedMapsManager.updateMapStatus(arkId, 'deposee', { 
                doi: testDoi 
            });
            
            if (result) {
                console.log('✅ Mise à jour du statut de dépôt réussie');
                
                // Vérifier la sauvegarde
                const workedMaps = await window.ptmAuth.getWorkedMaps();
                const updatedMap = workedMaps.find(map => map.ark === arkId);
                
                if (updatedMap && updatedMap.status === 'deposee' && updatedMap.doi === testDoi) {
                    console.log('✅ Statut de dépôt correctement sauvegardé');
                    console.log('Carte déposée:', updatedMap);
                } else {
                    console.log('❌ Statut de dépôt non trouvé ou incorrect');
                    console.log('Cartes travaillées:', workedMaps);
                }
            } else {
                console.log('❌ Erreur lors de la mise à jour du statut de dépôt');
            }
            
        } catch (error) {
            console.error('❌ Erreur durante le test de dépôt:', error);
        }
    },
    
    /**
     * Teste la récupération des cartes depuis l'API de la galerie
     */
    async testGalleryAPI() {
        console.log('=== Test de l\'API de la galerie ===');
        
        try {
            const response = await fetch('https://api.ptm.huma-num.fr/auth/admin/galligeo/georeferenced-maps-by-users');
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Données de l\'API galerie:', data);
            
            if (data.status === 'ok' && data.users) {
                let totalMaps = 0;
                let statusCounts = {};
                
                data.users.forEach(user => {
                    console.log(`Utilisateur: ${user.full_name || 'Anonyme'} (${user.orcid_id})`);
                    user.georeferenced_maps.forEach(map => {
                        totalMaps++;
                        statusCounts[map.status] = (statusCounts[map.status] || 0) + 1;
                        console.log(`  - ${map.ark}: ${map.status} (dernière mise à jour: ${map.lastUpdated})`);
                    });
                });
                
                console.log(`Total cartes: ${totalMaps}`);
                console.log('Répartition par statut:', statusCounts);
            }
            
        } catch (error) {
            console.error('❌ Erreur lors du test de l\'API galerie:', error);
        }
    },
    
    /**
     * Compare les données locales avec l'API
     */
    async testDataConsistency() {
        console.log('=== Test de cohérence des données ===');
        
        try {
            // Récupérer les données locales
            if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
                console.log('Utilisateur non connecté, impossible de comparer les données locales');
                return;
            }
            
            const localMaps = await window.ptmAuth.getWorkedMaps();
            console.log('Cartes locales:', localMaps);
            
            // Récupérer les données de l'API galerie
            const response = await fetch('https://api.ptm.huma-num.fr/auth/admin/galligeo/georeferenced-maps-by-users');
            const apiData = await response.json();
            
            if (apiData.status === 'ok' && apiData.users) {
                // Trouver l'utilisateur actuel dans les données API
                const userProfile = await window.ptmAuth.getUserProfile();
                const currentUser = apiData.users.find(user => 
                    user.orcid_id === userProfile?.orcid_id
                );
                
                if (currentUser) {
                    console.log('Cartes de l\'utilisateur dans l\'API:', currentUser.georeferenced_maps);
                    
                    // Comparer
                    const localArks = localMaps.map(m => m.ark).sort();
                    const apiArks = currentUser.georeferenced_maps.map(m => m.ark).sort();
                    
                    console.log('ARKs locaux:', localArks);
                    console.log('ARKs API:', apiArks);
                    
                    const missing = localArks.filter(ark => !apiArks.includes(ark));
                    const extra = apiArks.filter(ark => !localArks.includes(ark));
                    
                    if (missing.length > 0) {
                        console.log('❌ Cartes présentes localement mais absentes de l\'API:', missing);
                    }
                    
                    if (extra.length > 0) {
                        console.log('❌ Cartes présentes dans l\'API mais absentes localement:', extra);
                    }
                    
                    if (missing.length === 0 && extra.length === 0) {
                        console.log('✅ Cohérence des ARKs: OK');
                        
                        // Vérifier les statuts
                        for (const localMap of localMaps) {
                            const apiMap = currentUser.georeferenced_maps.find(m => m.ark === localMap.ark);
                            if (apiMap && apiMap.status !== localMap.status) {
                                console.log(`❌ Différence de statut pour ${localMap.ark}: local="${localMap.status}", API="${apiMap.status}"`);
                            }
                        }
                    }
                    
                } else {
                    console.log('Utilisateur actuel non trouvé dans les données API');
                }
            }
            
        } catch (error) {
            console.error('❌ Erreur lors du test de cohérence:', error);
        }
    },
    
    /**
     * Lance tous les tests
     */
    async runAllTests(arkId = 'btv1b53121232b') {
        console.log('🔍 Lancement des tests de diagnostic complets...');
        
        await this.testGalleryAPI();
        await this.testDataConsistency();
        
        if (window.ptmAuth && window.ptmAuth.isAuthenticated()) {
            await this.testGeoreferencingStatusUpdate(arkId);
            await this.testDepositStatusUpdate(arkId);
        } else {
            console.log('⚠️  Connectez-vous pour tester les mises à jour de statut');
        }
        
        console.log('🔍 Tests terminés');
    }
};

// Pour faciliter l'utilisation depuis la console
window.testStatus = window.debugStatusUpdate.runAllTests.bind(window.debugStatusUpdate);

console.log('Script de débogage des statuts chargé. Utilisez window.testStatus() pour lancer les tests.');