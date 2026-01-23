/**
 * Script de migration des métadonnées Gallica
 * 
 * Ce script enrichit les cartes existantes avec leurs métadonnées Gallica
 * (titre, producteur, date) pour éviter les appels répétés à l'API.
 * 
 * OBJECTIF : Préparer la migration vers un stockage en base de données
 * 
 * UTILISATION :
 * 1. Ouvrir la galerie dans un navigateur
 * 2. Ouvrir la console développeur (F12)
 * 3. Exécuter : await migrateExistingMapsMetadata()
 * 
 * Date : 23 janvier 2026
 */

// Rate limiter pour respecter les limites de l'API Gallica
class MigrationRateLimiter {
    constructor(maxRequestsPerSecond = 2) {
        this.delay = 1000 / maxRequestsPerSecond;
        this.lastCallTime = 0;
    }
    
    async throttle() {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastCallTime;
        if (timeSinceLastCall < this.delay) {
            await new Promise(resolve => 
                setTimeout(resolve, this.delay - timeSinceLastCall)
            );
        }
        this.lastCallTime = Date.now();
    }
}

/**
 * Récupère les métadonnées Gallica pour une carte
 */
async function fetchGallicaMetadataForMigration(arkId) {
    try {
        const manifestUrl = `https://openapi.bnf.fr/iiif/presentation/v3/ark:/12148/${arkId}/manifest.json`;
        
        const response = await fetch(manifestUrl);
        
        if (!response.ok) {
            throw new Error(`Erreur Gallica API: ${response.status}`);
        }
        
        const manifest = await response.json();
        
        // Extraction titre
        let title = 'Titre non disponible';
        if (manifest.summary) {
            if (typeof manifest.summary === 'object') {
                title = manifest.summary.none?.[0] || manifest.summary.fr?.[0] || manifest.summary.en?.[0] || title;
            } else {
                title = manifest.summary;
            }
        } else if (manifest.label) {
            if (typeof manifest.label === 'object') {
                title = manifest.label.none?.[0] || manifest.label.fr?.[0] || manifest.label.en?.[0] || title;
            } else {
                title = manifest.label;
            }
        }
        
        // Extraction producteur
        let producer = 'Bibliothèque nationale de France';
        if (manifest.requiredStatement && manifest.requiredStatement.value) {
            const attrValue = manifest.requiredStatement.value;
            producer = attrValue.none?.[0] || attrValue.fr?.[0] || attrValue.en?.[0] || producer;
        }
        
        // Extraction date
        let date = '';
        if (manifest.metadata && Array.isArray(manifest.metadata)) {
            manifest.metadata.forEach(item => {
                let label = '';
                if (item.label) {
                    if (typeof item.label === 'object') {
                        label = item.label.fr?.[0] || item.label.en?.[0] || item.label.none?.[0] || '';
                    } else {
                        label = item.label;
                    }
                }
                
                if (label && label.toLowerCase().includes('date')) {
                    if (item.value) {
                        if (typeof item.value === 'object') {
                            date = item.value.none?.[0] || item.value.fr?.[0] || item.value.en?.[0] || '';
                        } else {
                            date = item.value;
                        }
                    }
                }
            });
        }
        
        return {
            title: title,
            producer: producer,
            date: date,
            fetched_at: new Date().toISOString()
        };
        
    } catch (error) {
        console.error(`Erreur récupération métadonnées ${arkId}:`, error);
        return null;
    }
}

/**
 * Sauvegarde les métadonnées enrichies via l'API PTM
 * 
 * NOTE : Cette fonction nécessite que le backend soit mis à jour pour accepter
 * le champ 'gallica_metadata'. En attendant, elle log les données à sauvegarder.
 */
async function saveEnrichedMetadata(arkId, metadata) {
    const token = window.ptmAuth.getToken();
    
    if (!token) {
        console.warn(`⚠️  Utilisateur non authentifié - impossible de sauvegarder ${arkId}`);
        return false;
    }
    
    // Structure des données à envoyer
    const payload = {
        ark: arkId,
        gallica_metadata: metadata
    };
    
    console.log(`💾 Données à sauvegarder pour ${arkId}:`, payload);
    
    // TODO: Décommenter quand le backend sera prêt
    /*
    try {
        const response = await fetch('https://api.ptm.huma-num.fr/auth/app/galligeo/update-metadata', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status}`);
        }
        
        return true;
        
    } catch (error) {
        console.error(`❌ Erreur sauvegarde ${arkId}:`, error);
        return false;
    }
    */
    
    // En attendant, on simule une sauvegarde réussie
    return true;
}

/**
 * Fonction principale de migration
 * 
 * Enrichit toutes les cartes géoréférencées avec leurs métadonnées Gallica
 */
async function migrateExistingMapsMetadata() {
    console.log('🚀 === DÉBUT MIGRATION MÉTADONNÉES GALLICA ===');
    console.log('');
    
    // Récupérer toutes les cartes géoréférencées
    let maps = [];
    
    // Vérifier si on a accès à realMapsData (galerie)
    if (typeof realMapsData !== 'undefined' && realMapsData.length > 0) {
        maps = realMapsData;
        console.log(`📊 ${maps.length} cartes trouvées dans realMapsData`);
    } else {
        // Fallback : récupérer via l'API
        console.log('📡 Récupération des cartes depuis l\'API...');
        try {
            const result = await fetchGeoreferencedMaps();
            if (result.success && result.data) {
                maps = result.data;
                console.log(`📊 ${maps.length} cartes récupérées depuis l'API`);
            }
        } catch (error) {
            console.error('❌ Impossible de récupérer les cartes:', error);
            return;
        }
    }
    
    if (maps.length === 0) {
        console.log('ℹ️  Aucune carte à migrer');
        return;
    }
    
    // Statistiques
    const stats = {
        total: maps.length,
        success: 0,
        failed: 0,
        skipped: 0,
        startTime: Date.now()
    };
    
    const rateLimiter = new MigrationRateLimiter(2); // 2 req/s max
    
    console.log('');
    console.log(`⏳ Estimation temps : ~${Math.round(maps.length * 0.5)} secondes`);
    console.log('');
    
    // Traiter chaque carte
    for (let i = 0; i < maps.length; i++) {
        const map = maps[i];
        const arkId = map.ark;
        
        console.log(`[${i+1}/${maps.length}] ${arkId}...`);
        
        // Vérifier si métadonnées déjà présentes
        if (map.gallica_title && map.gallica_producer) {
            console.log(`  ⏭️  Métadonnées déjà présentes, skip`);
            stats.skipped++;
            continue;
        }
        
        try {
            // Rate limiting
            await rateLimiter.throttle();
            
            // Récupérer métadonnées
            const metadata = await fetchGallicaMetadataForMigration(arkId);
            
            if (!metadata) {
                console.log(`  ❌ Échec récupération métadonnées`);
                stats.failed++;
                continue;
            }
            
            console.log(`  ✅ "${metadata.title.substring(0, 50)}${metadata.title.length > 50 ? '...' : ''}"`);
            console.log(`     ${metadata.producer} ${metadata.date ? `- ${metadata.date}` : ''}`);
            
            // Sauvegarder (ou logger pour l'instant)
            const saved = await saveEnrichedMetadata(arkId, metadata);
            
            if (saved) {
                stats.success++;
            } else {
                stats.failed++;
            }
            
        } catch (error) {
            console.error(`  ❌ Erreur:`, error.message);
            stats.failed++;
        }
        
        // Progression toutes les 10 cartes
        if ((i + 1) % 10 === 0) {
            const elapsed = Math.round((Date.now() - stats.startTime) / 1000);
            const remaining = Math.round((maps.length - i - 1) * 0.5);
            console.log('');
            console.log(`📈 Progression : ${i+1}/${maps.length} (${Math.round((i+1)/maps.length*100)}%)`);
            console.log(`   ✅ Succès: ${stats.success} | ❌ Échecs: ${stats.failed} | ⏭️  Skippés: ${stats.skipped}`);
            console.log(`   ⏱️  Temps écoulé: ${elapsed}s | Temps restant: ~${remaining}s`);
            console.log('');
        }
    }
    
    // Rapport final
    const totalTime = Math.round((Date.now() - stats.startTime) / 1000);
    
    console.log('');
    console.log('🎉 === MIGRATION TERMINÉE ===');
    console.log('');
    console.log('📊 STATISTIQUES :');
    console.log(`   Total cartes     : ${stats.total}`);
    console.log(`   ✅ Succès        : ${stats.success}`);
    console.log(`   ❌ Échecs        : ${stats.failed}`);
    console.log(`   ⏭️  Déjà enrichies: ${stats.skipped}`);
    console.log(`   ⏱️  Temps total   : ${totalTime}s`);
    console.log('');
    
    if (stats.failed > 0) {
        console.warn('⚠️  Certaines cartes n\'ont pas pu être enrichies. Voir logs ci-dessus.');
    }
    
    if (stats.success > 0) {
        console.log('💡 NOTE : Les métadonnées ont été loggées dans la console.');
        console.log('   Une fois le backend mis à jour, relancer le script pour la sauvegarde réelle.');
    }
}

/**
 * Fonction de test sur une seule carte
 */
async function testMetadataMigration(arkId) {
    console.log(`🧪 Test migration pour ${arkId}`);
    
    const rateLimiter = new MigrationRateLimiter(2);
    await rateLimiter.throttle();
    
    const metadata = await fetchGallicaMetadataForMigration(arkId);
    
    if (metadata) {
        console.log('✅ Métadonnées récupérées:', metadata);
        
        const saved = await saveEnrichedMetadata(arkId, metadata);
        console.log(`💾 Sauvegarde: ${saved ? 'Succès' : 'Échec'}`);
        
        return metadata;
    } else {
        console.log('❌ Échec récupération métadonnées');
        return null;
    }
}

/**
 * Fonction pour exporter les métadonnées en JSON
 * Utile pour backup ou import manuel
 */
async function exportMetadataToJSON() {
    console.log('📤 Export des métadonnées en JSON...');
    
    let maps = [];
    if (typeof realMapsData !== 'undefined') {
        maps = realMapsData;
    } else {
        const result = await fetchGeoreferencedMaps();
        maps = result.data || [];
    }
    
    const rateLimiter = new MigrationRateLimiter(2);
    const enrichedMaps = [];
    
    for (let i = 0; i < maps.length; i++) {
        const map = maps[i];
        
        console.log(`[${i+1}/${maps.length}] Récupération ${map.ark}...`);
        
        await rateLimiter.throttle();
        const metadata = await fetchGallicaMetadataForMigration(map.ark);
        
        enrichedMaps.push({
            ark: map.ark,
            georeferenced_by: map.georeferenced_by,
            georeferenced_date: map.georeferenced_date,
            gallica_metadata: metadata
        });
    }
    
    const json = JSON.stringify(enrichedMaps, null, 2);
    
    // Créer un fichier téléchargeable
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gallica-metadata-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    console.log('✅ Export terminé !');
}

// Exposer les fonctions globalement pour utilisation dans la console
window.migrateExistingMapsMetadata = migrateExistingMapsMetadata;
window.testMetadataMigration = testMetadataMigration;
window.exportMetadataToJSON = exportMetadataToJSON;

console.log('✅ Script de migration chargé !');
console.log('');
console.log('📖 COMMANDES DISPONIBLES :');
console.log('   await migrateExistingMapsMetadata()  - Migrer toutes les cartes');
console.log('   await testMetadataMigration("arkId") - Tester sur une carte');
console.log('   await exportMetadataToJSON()         - Exporter en JSON');
console.log('');
