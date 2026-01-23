/**
 * Script de détection et nettoyage des doublons dans galligeo_data
 * 
 * Usage depuis la console navigateur (sur une page avec ptmAuth chargé):
 *   const script = document.createElement('script');
 *   script.src = '/scripts/check-duplicates.js';
 *   document.head.appendChild(script);
 * 
 * Puis:
 *   await checkDuplicates()
 *   await removeDuplicates() // Si doublons détectés
 */

/**
 * Vérifie s'il y a des doublons dans rec_ark
 */
window.checkDuplicates = async function() {
    console.log('🔍 Vérification des doublons...');
    
    try {
        const data = await window.ptmAuth.getGalligeoData();
        
        if (!data || !data.rec_ark) {
            console.log('❌ Aucune donnée trouvée');
            return null;
        }
        
        const rec_ark = data.rec_ark;
        console.log(`📊 Total d'entrées: ${rec_ark.length}`);
        
        // Compter les occurrences de chaque ARK
        const arkCounts = {};
        const duplicates = {};
        
        rec_ark.forEach((item, index) => {
            const ark = item.ark;
            if (!arkCounts[ark]) {
                arkCounts[ark] = [];
            }
            arkCounts[ark].push({ index, item });
        });
        
        // Identifier les doublons
        Object.keys(arkCounts).forEach(ark => {
            if (arkCounts[ark].length > 1) {
                duplicates[ark] = arkCounts[ark];
            }
        });
        
        const duplicateCount = Object.keys(duplicates).length;
        const uniqueCount = Object.keys(arkCounts).length;
        
        console.log(`📊 Statistiques:`);
        console.log(`   • ARK uniques: ${uniqueCount}`);
        console.log(`   • ARK dupliqués: ${duplicateCount}`);
        console.log(`   • Entrées en trop: ${rec_ark.length - uniqueCount}`);
        
        if (duplicateCount > 0) {
            console.log('');
            console.log('⚠️  DOUBLONS DÉTECTÉS:');
            
            Object.keys(duplicates).forEach(ark => {
                const copies = duplicates[ark];
                console.log(`\n   ${ark} (${copies.length} copies):`);
                copies.forEach(({ index, item }) => {
                    console.log(`      [${index}] status: ${item.status}, firstWorked: ${item.firstWorked}`);
                    if (item.gallica_title) {
                        console.log(`           ✅ Avec métadonnées: "${item.gallica_title}"`);
                    } else {
                        console.log(`           ⚠️  Sans métadonnées`);
                    }
                });
            });
            
            console.log('');
            console.log('💡 Pour supprimer les doublons, lancez: await removeDuplicates()');
        } else {
            console.log('✅ Aucun doublon détecté');
        }
        
        return {
            total: rec_ark.length,
            unique: uniqueCount,
            duplicates: duplicateCount,
            duplicatesList: duplicates
        };
        
    } catch (error) {
        console.error('❌ Erreur vérification doublons:', error);
        return null;
    }
};

/**
 * Supprime les doublons en gardant la version la plus complète
 * (priorité: avec métadonnées Gallica > plus récente)
 */
window.removeDuplicates = async function() {
    console.log('🧹 Nettoyage des doublons...');
    
    try {
        const data = await window.ptmAuth.getGalligeoData();
        
        if (!data || !data.rec_ark) {
            console.log('❌ Aucune donnée trouvée');
            return false;
        }
        
        const rec_ark = data.rec_ark;
        console.log(`📊 Entrées avant nettoyage: ${rec_ark.length}`);
        
        // Grouper par ARK
        const arkGroups = {};
        
        rec_ark.forEach(item => {
            const ark = item.ark;
            if (!arkGroups[ark]) {
                arkGroups[ark] = [];
            }
            arkGroups[ark].push(item);
        });
        
        // Pour chaque groupe, garder la meilleure version
        const cleanedRecArk = [];
        let removedCount = 0;
        
        Object.keys(arkGroups).forEach(ark => {
            const copies = arkGroups[ark];
            
            if (copies.length === 1) {
                // Pas de doublon, garder tel quel
                cleanedRecArk.push(copies[0]);
            } else {
                // Doublons détectés, garder le meilleur
                removedCount += copies.length - 1;
                
                // Trier par priorité:
                // 1. Avec métadonnées Gallica
                // 2. Plus récent (lastUpdated ou firstWorked)
                copies.sort((a, b) => {
                    // Priorité 1: métadonnées
                    const aHasMeta = !!a.gallica_title;
                    const bHasMeta = !!b.gallica_title;
                    if (aHasMeta && !bHasMeta) return -1;
                    if (!aHasMeta && bHasMeta) return 1;
                    
                    // Priorité 2: plus récent
                    const aDate = new Date(a.lastUpdated || a.firstWorked || 0);
                    const bDate = new Date(b.lastUpdated || b.firstWorked || 0);
                    return bDate - aDate;
                });
                
                const kept = copies[0];
                cleanedRecArk.push(kept);
                
                console.log(`   ✅ ${ark}: gardé ${kept.gallica_title ? 'avec métadonnées' : 'sans métadonnées'}, supprimé ${copies.length - 1} doublon(s)`);
            }
        });
        
        console.log('');
        console.log(`📊 Résultat:`);
        console.log(`   • Avant: ${rec_ark.length} entrées`);
        console.log(`   • Après: ${cleanedRecArk.length} entrées`);
        console.log(`   • Supprimés: ${removedCount} doublons`);
        
        // Sauvegarder les données nettoyées
        console.log('');
        console.log('💾 Sauvegarde des données nettoyées...');
        
        const updatedData = {
            rec_ark: cleanedRecArk,
            settings: data.settings || {}
        };
        
        await window.ptmAuth.saveGalligeoData(updatedData);
        
        console.log('✅ Données nettoyées et sauvegardées');
        console.log('💡 Rechargez la page pour voir les changements');
        
        return {
            before: rec_ark.length,
            after: cleanedRecArk.length,
            removed: removedCount
        };
        
    } catch (error) {
        console.error('❌ Erreur nettoyage doublons:', error);
        return false;
    }
};

console.log('✅ Script de détection des doublons chargé');
console.log('');
console.log('📖 COMMANDES:');
console.log('   await checkDuplicates()    - Vérifier les doublons');
console.log('   await removeDuplicates()   - Supprimer les doublons');
console.log('');
