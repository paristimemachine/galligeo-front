/**
 * Script de diagnostic pour le passage du statut "en-cours" vers "georeferenced"
 * 
 * Ce script aide à diagnostiquer pourquoi une carte reste en statut "en-cours"
 * après un géoréférencement réussi.
 */

window.diagnoseGeoreferencedStatus = {
    /**
     * Vérifie le statut d'une carte spécifique
     */
    async checkMapStatus(arkId) {
        console.log('═'.repeat(60));
        console.log(`🔍 DIAGNOSTIC: Statut de la carte ${arkId}`);
        console.log('═'.repeat(60));
        
        try {
            // 1. Vérifier l'authentification
            console.log('\n1️⃣ État de l\'authentification:');
            console.log('   - ptmAuth disponible:', !!window.ptmAuth);
            console.log('   - Authentifié:', window.ptmAuth?.isAuthenticated());
            
            if (window.ptmAuth?.isAuthenticated()) {
                const profile = await window.ptmAuth.getUserProfile();
                console.log('   - Utilisateur:', profile?.name || 'Non disponible');
            }
            
            // 2. Vérifier le statut dans la base de données
            console.log('\n2️⃣ Statut dans la base de données:');
            const data = await window.ptmAuth.getGalligeoData();
            const map = data.rec_ark.find(m => m.ark === arkId);
            
            if (!map) {
                console.error('   ❌ Carte non trouvée dans la base de données');
                return false;
            }
            
            console.log('   Données complètes:', JSON.stringify(map, null, 2));
            console.log('   - ARK:', map.ark);
            console.log('   - Statut:', map.status);
            console.log('   - Type du statut:', typeof map.status);
            console.log('   - Qualité:', map.quality);
            console.log('   - Première modif:', map.firstWorked);
            console.log('   - Dernière modif:', map.lastUpdated);
            
            // 3. Vérifier si la carte est réellement géoréférencée sur le serveur
            console.log('\n3️⃣ Vérification sur le serveur de tuiles:');
            const tileUrl = `https://tile.ptm.huma-num.fr/tiles/ark/12148/${arkId}/0/0/0.png`;
            console.log('   URL testée:', tileUrl);
            
            try {
                const response = await fetch(tileUrl, { method: 'HEAD' });
                const isGeoreferenced = response.ok;
                
                console.log('   - Réponse serveur:', response.status, response.statusText);
                console.log('   - Géoréférencée:', isGeoreferenced ? '✅ OUI' : '❌ NON');
                
                // 4. Analyse de cohérence
                console.log('\n4️⃣ Analyse de cohérence:');
                
                if (isGeoreferenced && map.status === 'en-cours') {
                    console.error('   ❌ INCOHÉRENCE: Carte géoréférencée sur le serveur mais statut "en-cours"');
                    console.log('   ➜ Le statut devrait être "georeferenced"');
                    return {
                        issue: 'status_not_updated',
                        recommendation: 'update_to_georeferenced'
                    };
                } else if (isGeoreferenced && map.status === 'georeferenced') {
                    console.log('   ✅ COHÉRENT: Carte géoréférencée et statut correct');
                    return { issue: null, status: 'ok' };
                } else if (!isGeoreferenced && map.status === 'georeferenced') {
                    console.warn('   ⚠️  INCOHÉRENCE: Statut "georeferenced" mais carte absente du serveur');
                    return {
                        issue: 'tiles_missing',
                        recommendation: 're_georeference'
                    };
                } else {
                    console.log('   ✅ COHÉRENT: Statut "en-cours" et pas encore géoréférencée');
                    return { issue: null, status: 'in_progress' };
                }
                
            } catch (error) {
                console.error('   ❌ Erreur lors de la vérification du serveur:', error);
                return { issue: 'server_check_failed', error: error.message };
            }
            
        } catch (error) {
            console.error('❌ Erreur lors du diagnostic:', error);
            return { issue: 'diagnostic_failed', error: error.message };
        }
    },
    
    /**
     * Tente de corriger automatiquement le statut d'une carte
     */
    async fixMapStatus(arkId) {
        console.log('═'.repeat(60));
        console.log(`🔧 CORRECTION: Mise à jour du statut de ${arkId}`);
        console.log('═'.repeat(60));
        
        try {
            // Diagnostic d'abord
            const diagnosis = await this.checkMapStatus(arkId);
            
            if (!diagnosis || diagnosis.issue !== 'status_not_updated') {
                console.log('\n⚠️  Pas de correction nécessaire ou impossible');
                return false;
            }
            
            // Demander confirmation
            console.log('\n📋 Action proposée: Mettre à jour le statut vers "georeferenced"');
            
            if (!confirm(`Voulez-vous mettre à jour le statut de la carte ${arkId} vers "georeferenced" ?`)) {
                console.log('❌ Correction annulée par l\'utilisateur');
                return false;
            }
            
            // Appliquer la correction
            console.log('\n🔄 Application de la correction...');
            
            await window.ptmAuth.updateMapStatus(arkId, 'georeferenced', {
                quality: 2,
                lastUpdated: new Date().toISOString()
            });
            
            console.log('✅ Statut mis à jour avec succès');
            
            // Vérification post-correction
            console.log('\n✓ Vérification post-correction:');
            const data = await window.ptmAuth.getGalligeoData();
            const map = data.rec_ark.find(m => m.ark === arkId);
            
            console.log('   - Nouveau statut:', map.status);
            console.log('   - Dernière mise à jour:', map.lastUpdated);
            
            if (map.status === 'georeferenced') {
                console.log('\n✅ CORRECTION RÉUSSIE');
                alert('Statut mis à jour avec succès vers "georeferenced"');
                
                // Recharger l'affichage si on est sur la galerie
                if (window.workedMapsManager && document.getElementById('worked-maps-container')) {
                    await window.workedMapsManager.displayWorkedMaps();
                }
                
                return true;
            } else {
                console.error('\n❌ ÉCHEC: Le statut n\'a pas été mis à jour');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de la correction:', error);
            alert('Erreur lors de la correction. Voir la console.');
            return false;
        }
    },
    
    /**
     * Analyse toutes les cartes pour détecter les incohérences
     */
    async analyzeAllMaps() {
        console.clear();
        console.log('═'.repeat(60));
        console.log('🔍 ANALYSE GLOBALE: Toutes les cartes');
        console.log('═'.repeat(60));
        
        try {
            const data = await window.ptmAuth.getGalligeoData();
            const maps = data.rec_ark || [];
            
            console.log(`\n📊 Nombre total de cartes: ${maps.length}\n`);
            
            const issues = [];
            
            for (const map of maps) {
                console.log(`Analyse: ${map.ark}...`);
                
                // Vérifier sur le serveur
                const tileUrl = `https://tile.ptm.huma-num.fr/tiles/ark/12148/${map.ark}/0/0/0.png`;
                
                try {
                    const response = await fetch(tileUrl, { method: 'HEAD' });
                    const isGeoreferenced = response.ok;
                    
                    // Détecter les incohérences
                    if (isGeoreferenced && map.status === 'en-cours') {
                        issues.push({
                            type: 'status_not_updated',
                            ark: map.ark,
                            currentStatus: map.status,
                            expectedStatus: 'georeferenced',
                            lastUpdated: map.lastUpdated
                        });
                        console.log(`  ❌ Incohérence: géoréférencée mais statut "en-cours"`);
                    } else if (!isGeoreferenced && map.status === 'georeferenced') {
                        issues.push({
                            type: 'tiles_missing',
                            ark: map.ark,
                            currentStatus: map.status,
                            lastUpdated: map.lastUpdated
                        });
                        console.log(`  ⚠️  Incohérence: statut "georeferenced" mais tuiles manquantes`);
                    } else {
                        console.log(`  ✅ Cohérent`);
                    }
                    
                } catch (error) {
                    console.log(`  ⚠️  Erreur de vérification`);
                }
            }
            
            // Résumé
            console.log('\n' + '═'.repeat(60));
            console.log('RÉSUMÉ DES INCOHÉRENCES:');
            console.log('═'.repeat(60));
            
            if (issues.length === 0) {
                console.log('✅ Aucune incohérence détectée\n');
                alert('✅ Aucune incohérence détectée. Tous les statuts sont cohérents.');
                return { issues: [], total: maps.length };
            }
            
            // Grouper par type
            const statusNotUpdated = issues.filter(i => i.type === 'status_not_updated');
            const tilesMissing = issues.filter(i => i.type === 'tiles_missing');
            
            console.log(`\n❌ Cartes géoréférencées avec statut "en-cours": ${statusNotUpdated.length}`);
            statusNotUpdated.forEach(issue => {
                console.log(`   - ${issue.ark} (dernière modif: ${issue.lastUpdated})`);
            });
            
            console.log(`\n⚠️  Cartes avec statut "georeferenced" mais tuiles manquantes: ${tilesMissing.length}`);
            tilesMissing.forEach(issue => {
                console.log(`   - ${issue.ark} (dernière modif: ${issue.lastUpdated})`);
            });
            
            console.log('\n' + '═'.repeat(60));
            
            // Proposer correction automatique
            if (statusNotUpdated.length > 0) {
                console.log('\n💡 Pour corriger les statuts non mis à jour:');
                console.log('   await window.diagnoseGeoreferencedStatus.fixAllStatusIssues()');
            }
            
            return {
                issues: issues,
                statusNotUpdated: statusNotUpdated.length,
                tilesMissing: tilesMissing.length,
                total: maps.length
            };
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'analyse:', error);
            throw error;
        }
    },
    
    /**
     * Corrige automatiquement tous les statuts non mis à jour
     */
    async fixAllStatusIssues() {
        console.log('═'.repeat(60));
        console.log('🔧 CORRECTION AUTOMATIQUE: Tous les statuts');
        console.log('═'.repeat(60));
        
        try {
            const analysis = await this.analyzeAllMaps();
            const toFix = analysis.issues.filter(i => i.type === 'status_not_updated');
            
            if (toFix.length === 0) {
                console.log('\n✅ Aucune correction nécessaire');
                return;
            }
            
            const message = 
                `${toFix.length} carte(s) géoréférencée(s) ont un statut "en-cours".\n\n` +
                `Cartes concernées:\n` +
                toFix.map(i => `  - ${i.ark}`).join('\n') +
                `\n\nVoulez-vous les mettre à jour vers "georeferenced" ?`;
            
            if (!confirm(message)) {
                console.log('❌ Correction annulée');
                return;
            }
            
            console.log('\n🔄 Correction en cours...\n');
            
            let successCount = 0;
            let errorCount = 0;
            
            for (const issue of toFix) {
                try {
                    console.log(`   Correction de ${issue.ark}...`);
                    
                    await window.ptmAuth.updateMapStatus(issue.ark, 'georeferenced', {
                        quality: 2,
                        lastUpdated: new Date().toISOString()
                    });
                    
                    console.log(`   ✅ ${issue.ark} corrigé`);
                    successCount++;
                    
                } catch (error) {
                    console.error(`   ❌ Erreur pour ${issue.ark}:`, error);
                    errorCount++;
                }
            }
            
            console.log('\n' + '═'.repeat(60));
            console.log('RÉSUMÉ DES CORRECTIONS:');
            console.log('═'.repeat(60));
            console.log(`✅ Réussies: ${successCount}`);
            console.log(`❌ Échouées: ${errorCount}`);
            console.log(`📊 Total: ${toFix.length}`);
            console.log('═'.repeat(60));
            
            alert(
                `Corrections terminées:\n\n` +
                `✅ ${successCount} réussie(s)\n` +
                `${errorCount > 0 ? `❌ ${errorCount} échec(s)` : ''}`
            );
            
            // Recharger l'affichage si on est sur la galerie
            if (window.workedMapsManager && document.getElementById('worked-maps-container')) {
                await window.workedMapsManager.displayWorkedMaps();
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de la correction automatique:', error);
            throw error;
        }
    }
};

// Exposer les fonctions pour un accès facile
window.checkMapStatus = (arkId) => window.diagnoseGeoreferencedStatus.checkMapStatus(arkId);
window.fixMapStatus = (arkId) => window.diagnoseGeoreferencedStatus.fixMapStatus(arkId);
window.analyzeAllMaps = () => window.diagnoseGeoreferencedStatus.analyzeAllMaps();

console.log('📦 Script diagnose-georeferenced-status.js chargé');
console.log('💡 Commandes disponibles:');
console.log('   - Vérifier une carte: await window.checkMapStatus("btv1b530066245")');
console.log('   - Corriger une carte: await window.fixMapStatus("btv1b530066245")');
console.log('   - Analyser toutes: await window.analyzeAllMaps()');
console.log('   - Corriger toutes: await window.diagnoseGeoreferencedStatus.fixAllStatusIssues()');
