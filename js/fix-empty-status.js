/**
 * Script de correction pour les cartes avec statut vide {}
 * 
 * Ce script identifie toutes les cartes qui ont un objet status vide {}
 * au lieu d'avoir un statut défini ('en-cours', 'georeferenced', 'deposee')
 * et corrige automatiquement ces statuts.
 * 
 * UTILISATION:
 * 1. Ouvrir la console développeur
 * 2. S'assurer d'être connecté avec ORCID
 * 3. Exécuter: await window.fixEmptyStatus.checkAndFix()
 * 
 * DIAGNOSTIC SEULEMENT (sans correction):
 * await window.fixEmptyStatus.diagnose()
 */

window.fixEmptyStatus = {
    /**
     * Diagnostic: identifie les cartes avec statut vide sans les corriger
     */
    async diagnose() {
        console.log('🔍 DIAGNOSTIC: Recherche des cartes avec statut vide...\n');
        
        try {
            if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
                console.error('❌ Vous devez être connecté pour exécuter ce diagnostic');
                alert('Veuillez vous connecter avec ORCID pour exécuter ce diagnostic.');
                return;
            }
            
            // Récupérer les données utilisateur
            const data = await window.ptmAuth.getGalligeoData();
            const rec_ark = data.rec_ark || [];
            
            console.log(`📊 Nombre total de cartes: ${rec_ark.length}`);
            
            // Identifier les cartes avec statut vide
            const emptyStatusMaps = rec_ark.filter(map => {
                return !map.status || 
                       (typeof map.status === 'object' && Object.keys(map.status).length === 0);
            });
            
            if (emptyStatusMaps.length === 0) {
                console.log('✅ Aucune carte avec statut vide trouvée!\n');
                alert('Aucune carte avec statut vide trouvée. Tout est OK!');
                return;
            }
            
            console.log(`⚠️  ${emptyStatusMaps.length} carte(s) avec statut vide trouvée(s):\n`);
            
            // Analyser chaque carte
            for (const map of emptyStatusMaps) {
                console.log(`\n📍 ARK: ${map.ark}`);
                console.log(`   Statut actuel: ${JSON.stringify(map.status)}`);
                console.log(`   Qualité: ${map.quality || 'non défini'}`);
                console.log(`   Première modif: ${map.firstWorked || 'non défini'}`);
                console.log(`   Dernière modif: ${map.lastUpdated || 'non défini'}`);
                
                // Vérifier si la carte est géoréférencée sur le serveur
                const isGeoreferenced = await this.checkIfMapIsGeoreferenced(map.ark);
                console.log(`   Géoréférencée sur serveur: ${isGeoreferenced ? '✓ OUI' : '✗ NON'}`);
                
                if (isGeoreferenced) {
                    console.log(`   ➜ Statut recommandé: "georeferenced"`);
                } else {
                    console.log(`   ➜ Statut recommandé: "en-cours"`);
                }
            }
            
            console.log('\n' + '='.repeat(60));
            console.log(`RÉSUMÉ: ${emptyStatusMaps.length} carte(s) à corriger`);
            console.log('='.repeat(60));
            console.log('\nPour corriger automatiquement, exécutez:');
            console.log('await window.fixEmptyStatus.checkAndFix()');
            
            return {
                total: rec_ark.length,
                emptyStatus: emptyStatusMaps.length,
                maps: emptyStatusMaps
            };
            
        } catch (error) {
            console.error('❌ Erreur lors du diagnostic:', error);
            alert('Erreur lors du diagnostic. Voir la console pour plus de détails.');
            throw error;
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
            console.log(`   ⚠️  Impossible de vérifier le statut de géoréférencement pour ${arkId}`);
            return false;
        }
    },
    
    /**
     * Vérifie et corrige toutes les cartes avec statut vide
     */
    async checkAndFix() {
        console.log('🔧 CORRECTION: Recherche et correction des cartes avec statut vide...\n');
        
        try {
            if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
                console.error('❌ Vous devez être connecté pour exécuter cette correction');
                alert('Veuillez vous connecter avec ORCID pour exécuter cette correction.');
                return;
            }
            
            // Récupérer les données utilisateur
            const data = await window.ptmAuth.getGalligeoData();
            const rec_ark = data.rec_ark || [];
            
            console.log(`📊 Nombre total de cartes: ${rec_ark.length}`);
            
            // Identifier les cartes avec statut vide
            const emptyStatusMaps = rec_ark.filter(map => {
                return !map.status || 
                       (typeof map.status === 'object' && Object.keys(map.status).length === 0);
            });
            
            if (emptyStatusMaps.length === 0) {
                console.log('✅ Aucune carte avec statut vide trouvée!\n');
                alert('Aucune carte avec statut vide trouvée. Tout est OK!');
                return;
            }
            
            console.log(`⚠️  ${emptyStatusMaps.length} carte(s) avec statut vide trouvée(s)\n`);
            
            // Préparer les corrections
            const corrections = [];
            
            for (const map of emptyStatusMaps) {
                console.log(`\n🔍 Analyse: ${map.ark}`);
                
                // Vérifier si la carte est géoréférencée sur le serveur
                const isGeoreferenced = await this.checkIfMapIsGeoreferenced(map.ark);
                
                const newStatus = isGeoreferenced ? 'georeferenced' : 'en-cours';
                
                console.log(`   Statut actuel: ${JSON.stringify(map.status)}`);
                console.log(`   Nouveau statut: "${newStatus}"`);
                console.log(`   Géoréférencée: ${isGeoreferenced ? 'OUI' : 'NON'}`);
                
                corrections.push({
                    ark: map.ark,
                    oldStatus: map.status,
                    newStatus: newStatus,
                    isGeoreferenced: isGeoreferenced,
                    firstWorked: map.firstWorked,
                    lastUpdated: map.lastUpdated,
                    quality: map.quality || 2
                });
            }
            
            // Demander confirmation
            console.log('\n' + '='.repeat(60));
            console.log('CORRECTIONS À APPLIQUER:');
            console.log('='.repeat(60));
            corrections.forEach((corr, index) => {
                console.log(`${index + 1}. ${corr.ark}`);
                console.log(`   ${JSON.stringify(corr.oldStatus)} → "${corr.newStatus}"`);
            });
            console.log('='.repeat(60));
            
            const confirmMessage = 
                `${corrections.length} carte(s) avec statut vide détectée(s).\n\n` +
                `Corrections proposées:\n` +
                corrections.map((c, i) => `${i+1}. ${c.ark}: → "${c.newStatus}"`).join('\n') +
                `\n\nVoulez-vous appliquer ces corrections ?`;
            
            if (!confirm(confirmMessage)) {
                console.log('❌ Corrections annulées par l\'utilisateur');
                return;
            }
            
            // Appliquer les corrections
            console.log('\n🔧 Application des corrections...\n');
            let successCount = 0;
            let errorCount = 0;
            
            for (const correction of corrections) {
                try {
                    console.log(`   Correction de ${correction.ark}...`);
                    
                    await window.ptmAuth.updateMapStatus(
                        correction.ark, 
                        correction.newStatus, 
                        {
                            quality: correction.quality,
                            firstWorked: correction.firstWorked,
                            lastUpdated: new Date().toISOString()
                        }
                    );
                    
                    console.log(`   ✅ ${correction.ark} corrigé avec succès`);
                    successCount++;
                    
                } catch (error) {
                    console.error(`   ❌ Erreur lors de la correction de ${correction.ark}:`, error);
                    errorCount++;
                }
            }
            
            // Résumé final
            console.log('\n' + '='.repeat(60));
            console.log('RÉSUMÉ DES CORRECTIONS:');
            console.log('='.repeat(60));
            console.log(`✅ Réussies: ${successCount}`);
            console.log(`❌ Échouées: ${errorCount}`);
            console.log(`📊 Total: ${corrections.length}`);
            console.log('='.repeat(60) + '\n');
            
            if (successCount > 0) {
                alert(
                    `Corrections appliquées avec succès!\n\n` +
                    `✅ ${successCount} carte(s) corrigée(s)\n` +
                    `${errorCount > 0 ? `❌ ${errorCount} erreur(s)` : ''}`
                );
                
                // Recharger l'affichage si on est sur la page galerie
                if (window.workedMapsManager && document.getElementById('worked-maps-container')) {
                    console.log('🔄 Rechargement de l\'affichage des cartes...');
                    await window.workedMapsManager.displayWorkedMaps();
                }
            } else {
                alert('Aucune correction n\'a pu être appliquée. Voir la console pour plus de détails.');
            }
            
            return {
                total: corrections.length,
                success: successCount,
                errors: errorCount,
                corrections: corrections
            };
            
        } catch (error) {
            console.error('❌ Erreur lors de la correction:', error);
            alert('Erreur lors de la correction. Voir la console pour plus de détails.');
            throw error;
        }
    },
    
    /**
     * Correction rapide: corrige toutes les cartes avec statut vide en "en-cours"
     * sans vérifier le serveur de tuiles (plus rapide mais moins précis)
     */
    async quickFix(defaultStatus = 'en-cours') {
        console.log(`🚀 CORRECTION RAPIDE: Mise à jour vers "${defaultStatus}"...\n`);
        
        try {
            if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
                console.error('❌ Vous devez être connecté pour exécuter cette correction');
                alert('Veuillez vous connecter avec ORCID pour exécuter cette correction.');
                return;
            }
            
            const validStatuses = ['en-cours', 'georeferenced', 'deposee'];
            if (!validStatuses.includes(defaultStatus)) {
                console.error(`❌ Statut invalide: "${defaultStatus}". Doit être: ${validStatuses.join(', ')}`);
                return;
            }
            
            // Récupérer les données utilisateur
            const data = await window.ptmAuth.getGalligeoData();
            const rec_ark = data.rec_ark || [];
            
            // Identifier les cartes avec statut vide
            const emptyStatusMaps = rec_ark.filter(map => {
                return !map.status || 
                       (typeof map.status === 'object' && Object.keys(map.status).length === 0);
            });
            
            if (emptyStatusMaps.length === 0) {
                console.log('✅ Aucune carte avec statut vide trouvée!');
                alert('Aucune carte avec statut vide trouvée. Tout est OK!');
                return;
            }
            
            const confirmMessage = 
                `${emptyStatusMaps.length} carte(s) avec statut vide détectée(s).\n\n` +
                `Toutes seront mises à jour vers le statut: "${defaultStatus}"\n\n` +
                `Voulez-vous continuer ?`;
            
            if (!confirm(confirmMessage)) {
                console.log('❌ Correction annulée par l\'utilisateur');
                return;
            }
            
            let successCount = 0;
            
            for (const map of emptyStatusMaps) {
                try {
                    await window.ptmAuth.updateMapStatus(
                        map.ark, 
                        defaultStatus,
                        {
                            quality: map.quality || 2,
                            firstWorked: map.firstWorked,
                            lastUpdated: new Date().toISOString()
                        }
                    );
                    successCount++;
                    console.log(`✅ ${map.ark} → "${defaultStatus}"`);
                } catch (error) {
                    console.error(`❌ Erreur pour ${map.ark}:`, error);
                }
            }
            
            console.log(`\n✅ ${successCount}/${emptyStatusMaps.length} corrections appliquées`);
            alert(`Corrections appliquées: ${successCount}/${emptyStatusMaps.length}`);
            
            // Recharger l'affichage si on est sur la page galerie
            if (window.workedMapsManager && document.getElementById('worked-maps-container')) {
                await window.workedMapsManager.displayWorkedMaps();
            }
            
            return { success: successCount, total: emptyStatusMaps.length };
            
        } catch (error) {
            console.error('❌ Erreur lors de la correction rapide:', error);
            throw error;
        }
    }
};

// Exposer les fonctions pour un accès facile depuis la console
window.diagnoseEmptyStatus = window.fixEmptyStatus.diagnose.bind(window.fixEmptyStatus);
window.fixAllEmptyStatus = window.fixEmptyStatus.checkAndFix.bind(window.fixEmptyStatus);

console.log('📦 Script fix-empty-status.js chargé');
console.log('💡 Utilisation:');
console.log('   - Diagnostic: await window.fixEmptyStatus.diagnose()');
console.log('   - Correction: await window.fixEmptyStatus.checkAndFix()');
console.log('   - Correction rapide: await window.fixEmptyStatus.quickFix("en-cours")');
