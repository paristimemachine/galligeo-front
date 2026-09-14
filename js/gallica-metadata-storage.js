/**
 * Système de stockage local des métadonnées Gallica
 * 
 * Ce module permet de stocker les métadonnées Gallica (titre, producteur, date)
 * directement dans la base de données PTM pour éviter les appels répétés à l'API Gallica.
 * 
 * UTILISATION :
 * 1. Lors du géoréférencement : sauvegarder automatiquement les métadonnées
 * 2. Dans la galerie : utiliser les métadonnées stockées au lieu d'appeler Gallica
 * 3. Migration : enrichir les cartes existantes progressivement
 * 
 * Date : 23 janvier 2026
 * 
 * NOTE : Ce module nécessite que RateLimiter soit défini avant son chargement
 */

class GallicaMetadataStorage {
    constructor() {
        this.cache = new Map();
        // Utiliser RateLimiter si disponible, sinon créer un throttle simple
        if (typeof RateLimiter !== 'undefined') {
            this.rateLimiter = new RateLimiter(1); // 1 req/s pour éviter quota
        } else {
            // Fallback simple si RateLimiter n'est pas disponible
            this.rateLimiter = {
                delay: 1000,
                lastCallTime: 0,
                async throttle() {
                    const now = Date.now();
                    const timeSinceLastCall = now - this.lastCallTime;
                    if (timeSinceLastCall < this.delay) {
                        await new Promise(resolve => setTimeout(resolve, this.delay - timeSinceLastCall));
                    }
                    this.lastCallTime = Date.now();
                }
            };
        }
    }
    
    /**
     * Récupère les métadonnées d'une carte depuis l'API Gallica
     * Avec retry automatique si quota dépassé
     */
    async fetchFromGallica(arkId, retryOnQuota = true) {
        try {
            await this.rateLimiter.throttle();
            
            const manifestUrl = `https://openapi.bnf.fr/iiif/presentation/v3/ark:/12148/${arkId}/manifest.json`;
            const response = await window.GallicaIIIFAuth.fetch(manifestUrl);
            
            if (!response.ok) {
                // Gérer erreur quota
                if (response.status === 429) {
                    const errorData = await response.json().catch(() => null);
                    if (errorData && errorData.nextAccessTime) {
                        const nextAccessTime = errorData.nextAccessTime;
                        
                        if (retryOnQuota) {
                            // Calculer temps d'attente
                            const nextAccess = new Date(nextAccessTime);
                            const now = new Date();
                            const waitMs = nextAccess - now;
                            
                            if (waitMs > 0 && waitMs < 3600000) { // Max 1 heure
                                const waitMinutes = Math.ceil(waitMs / 60000);
                                console.warn(`⏳ Quota dépassé pour ${arkId}. Attente ${waitMinutes} minutes jusqu'à ${nextAccessTime}...`);
                                
                                // Attendre + petite marge de sécurité
                                await this.sleep(waitMs + 5000); // +5 secondes de marge
                                
                                console.log(`✅ Quota réinitialisé, nouvelle tentative pour ${arkId}...`);
                                // Retry récursif (sans retry infini)
                                return await this.fetchFromGallica(arkId, false);
                            }
                        }
                        
                        throw new Error(`QUOTA_EXCEEDED:${nextAccessTime}`);
                    }
                }
                throw new Error(`HTTP ${response.status}`);
            }
            
            const manifest = await response.json();
            
            // Fonction helper pour extraire valeur des champs IIIF v3
            const extractValue = (field) => {
                if (!field) return '';
                if (typeof field === 'string') return field;
                if (typeof field === 'object') {
                    return field.fr?.[0] || field.en?.[0] || field.none?.[0] || '';
                }
                return '';
            };
            
            // Chercher dans metadata array
            const metadataMap = {};
            if (manifest.metadata && Array.isArray(manifest.metadata)) {
                manifest.metadata.forEach(item => {
                    const label = extractValue(item.label);
                    const value = extractValue(item.value);
                    if (label && value) {
                        metadataMap[label.toLowerCase()] = value;
                    }
                });
            }
            
            // Extraction titre (ordre de priorité)
            let title = metadataMap['titre'] || metadataMap['title'];
            if (!title && manifest.summary) {
                title = extractValue(manifest.summary);
            }
            if (!title && manifest.label) {
                title = extractValue(manifest.label);
            }
            if (!title) {
                title = 'Titre non disponible';
            }
            
            // Extraction producteur (ordre de priorité)
            let producer = metadataMap['editeur'] || 
                          metadataMap['publisher'] ||
                          metadataMap['éditeur'];
            
            if (!producer && manifest.requiredStatement?.value) {
                producer = extractValue(manifest.requiredStatement.value);
            }
            if (!producer && manifest.provider?.[0]?.label) {
                producer = extractValue(manifest.provider[0].label);
            }
            if (!producer) {
                producer = 'Bibliothèque nationale de France';
            }
            
            // Extraction date
            let date = metadataMap['date'] || 
                      metadataMap['date de publication'] ||
                      metadataMap['publication date'] ||
                      '';
            
            // URL vignette
            const thumbnailUrl = `https://openapi.bnf.fr/iiif/image/v3/ark:/12148/${arkId}/f1/full/,480/0/default.webp`;
            
            return {
                title: title,
                producer: producer,
                date: date,
                thumbnailUrl: thumbnailUrl,
                fetchedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`Erreur récupération métadonnées ${arkId}:`, error);
            throw error;
        }
    }
    
    /**
     * Fonction helper pour attendre (sleep)
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Sauvegarde les métadonnées pour une carte dans la base PTM
     */
    async saveMetadata(arkId, metadata) {
        try {
            // Convertir les noms de champs courts en noms complets
            const fullMetadata = {
                gallica_title: metadata.title,
                gallica_producer: metadata.producer,
                gallica_date: metadata.date,
                gallica_thumbnail_url: metadata.thumbnailUrl,
                metadata_fetched_at: metadata.fetchedAt
            };
            
            // Récupérer les données existantes
            let existingData;
            if (window.ptmAuth.isAuthenticated()) {
                existingData = await window.ptmAuth.getGalligeoData();
            } else {
                existingData = await window.ptmAuth.getGalligeoDataAnonymous();
            }
            
            // Trouver ou créer l'entrée pour cette carte
            const rec_ark = existingData.rec_ark || [];
            const existingIndex = rec_ark.findIndex(item => item.ark === arkId);
            
            if (existingIndex >= 0) {
                // Fusionner avec les données existantes
                rec_ark[existingIndex] = {
                    ...rec_ark[existingIndex],
                    ...fullMetadata
                };
            } else {
                // Créer nouvelle entrée
                rec_ark.push({
                    ark: arkId,
                    status: 'georeferenced', // Par défaut
                    ...fullMetadata
                });
            }
            
            const updatedData = {
                rec_ark: rec_ark,
                settings: existingData.settings || {}
            };
            
            // Sauvegarder selon le mode d'authentification
            if (window.ptmAuth.isAuthenticated()) {
                await window.ptmAuth.saveGalligeoData(updatedData);
            } else {
                await window.ptmAuth.saveGalligeoDataAnonymous(updatedData);
            }
            
            console.log(`✅ Métadonnées sauvegardées pour ${arkId}`);
            return true;
            
        } catch (error) {
            console.error(`❌ Erreur sauvegarde métadonnées ${arkId}:`, error);
            return false;
        }
    }

    /**
     * Sauvegarde les métadonnées de plusieurs cartes en un seul aller-retour
     * (1 GET + 1 POST vers /app/galligeo/data), au lieu d'un aller-retour par carte.
     * Utilisé par la galerie qui découvre plusieurs cartes sans métadonnées lors
     * d'un même chargement de page.
     * @param {Array<{ark, gallica_title, gallica_producer, gallica_date, gallica_thumbnail_url, metadata_fetched_at}>} entries
     */
    async saveMetadataBatch(entries) {
        if (!entries || entries.length === 0) {
            return true;
        }

        try {
            let existingData;
            if (window.ptmAuth.isAuthenticated()) {
                existingData = await window.ptmAuth.getGalligeoData();
            } else {
                existingData = await window.ptmAuth.getGalligeoDataAnonymous();
            }

            const rec_ark = existingData.rec_ark || [];

            entries.forEach(({ ark, ...fullMetadata }) => {
                const existingIndex = rec_ark.findIndex(item => item.ark === ark);
                if (existingIndex >= 0) {
                    rec_ark[existingIndex] = { ...rec_ark[existingIndex], ...fullMetadata };
                } else {
                    rec_ark.push({ ark, status: 'georeferenced', ...fullMetadata });
                }
            });

            const updatedData = {
                rec_ark: rec_ark,
                settings: existingData.settings || {}
            };

            if (window.ptmAuth.isAuthenticated()) {
                await window.ptmAuth.saveGalligeoData(updatedData);
            } else {
                await window.ptmAuth.saveGalligeoDataAnonymous(updatedData);
            }

            console.log(`✅ Métadonnées sauvegardées en lot pour ${entries.length} carte(s)`);
            return true;

        } catch (error) {
            console.error(`❌ Erreur sauvegarde en lot des métadonnées:`, error);
            return false;
        }
    }
    
    /**
     * Récupère les métadonnées pour une carte (cache ou API ou base)
     */
    async getMetadata(arkId, mapData = null) {
        // 1. Vérifier le cache mémoire
        if (this.cache.has(arkId)) {
            return { ...this.cache.get(arkId), source: 'cache' };
        }
        
        // 2. Vérifier si métadonnées déjà en base (via mapData)
        if (mapData && mapData.gallica_title) {
            const metadata = {
                gallica_title: mapData.gallica_title,
                gallica_producer: mapData.gallica_producer || 'Bibliothèque nationale de France',
                gallica_date: mapData.gallica_date || '',
                gallica_thumbnail_url: mapData.gallica_thumbnail_url || this.getDefaultThumbnail(arkId),
                source: 'database'
            };
            this.cache.set(arkId, metadata);
            return metadata;
        }
        
        // 3. Récupérer depuis Gallica
        try {
            const metadata = await this.fetchFromGallica(arkId);
            this.cache.set(arkId, metadata);
            
            // Sauvegarder en base de manière asynchrone (ne pas bloquer)
            this.saveMetadata(arkId, metadata).catch(err => {
                console.warn(`⚠️ Impossible de sauvegarder métadonnées ${arkId}:`, err);
            });
            
            return { ...metadata, source: 'gallica' };
            
        } catch (error) {
            // 4. Fallback : données par défaut
            if (error.message.startsWith('QUOTA_EXCEEDED:')) {
                const nextAccessTime = error.message.split(':')[1];
                console.warn(`⏳ Quota dépassé jusqu'à ${nextAccessTime}`);
            }
            
            return {
                gallica_title: `Carte ${arkId}`,
                gallica_producer: 'Bibliothèque nationale de France',
                gallica_date: '',
                gallica_thumbnail_url: this.getDefaultThumbnail(arkId),
                source: 'default',
                error: error.message
            };
        }
    }
    
    /**
     * Génère l'URL de vignette par défaut
     */
    getDefaultThumbnail(arkId) {
        return `https://openapi.bnf.fr/iiif/image/v3/ark:/12148/${arkId}/f1/full/,480/0/default.webp`;
    }
    
    /**
     * Enrichit une carte existante avec ses métadonnées
     */
    async enrichMap(arkId, forceRefresh = false) {
        console.log(`🔄 Enrichissement ${arkId}...`);
        
        try {
            // Vérifier si déjà enrichie (sauf si forceRefresh)
            if (!forceRefresh) {
                const existingData = await window.ptmAuth.getGalligeoData();
                const existing = existingData.rec_ark?.find(m => m.ark === arkId);
                if (existing?.gallica_title) {
                    console.log(`⏭️  ${arkId} déjà enrichi: "${existing.gallica_title}"`);
                    return { success: true, skipped: true, metadata: {
                        title: existing.gallica_title,
                        producer: existing.gallica_producer,
                        date: existing.gallica_date
                    }};
                }
            }
            
            const metadata = await this.fetchFromGallica(arkId);
            const saved = await this.saveMetadata(arkId, metadata);
            
            if (saved) {
                console.log(`✅ ${arkId} enrichi: "${metadata.title}"`);
                return { success: true, metadata };
            } else {
                console.warn(`⚠️ ${arkId} récupéré mais non sauvegardé`);
                return { success: false, metadata, saved: false };
            }
            
        } catch (error) {
            console.error(`❌ ${arkId} erreur:`, error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Enrichit toutes les cartes géoréférencées progressivement
     * Avec gestion automatique du quota (attente et reprise)
     */
    async enrichAllMaps(maps, onProgress = null) {
        console.log(`🚀 Enrichissement de ${maps.length} cartes...`);
        console.log('💡 Le script attend automatiquement si le quota est dépassé');
        
        const stats = {
            total: maps.length,
            success: 0,
            failed: 0,
            skipped: 0,
            waitedForQuota: 0,
            errors: []
        };
        
        for (let i = 0; i < maps.length; i++) {
            const map = maps[i];
            
            // Skip si déjà enrichi
            if (map.gallica_title) {
                console.log(`[${i+1}/${maps.length}] ${map.ark} déjà enrichi`);
                stats.skipped++;
                if (onProgress) onProgress(i + 1, maps.length, stats);
                continue;
            }
            
            // Enrichir avec retry automatique
            let retryCount = 0;
            let success = false;
            
            while (!success && retryCount < 3) {
                try {
                    const result = await this.enrichMap(map.ark);
                    
                    if (result.success) {
                        stats.success++;
                        success = true;
                    } else {
                        stats.failed++;
                        stats.errors.push({ ark: map.ark, error: result.error });
                        break; // Pas de retry si erreur non-quota
                    }
                    
                } catch (error) {
                    if (error.message.startsWith('QUOTA_EXCEEDED:')) {
                        // Quota dépassé, on a déjà attendu dans fetchFromGallica
                        stats.waitedForQuota++;
                        retryCount++;
                        
                        if (retryCount < 3) {
                            console.log(`🔄 Retry ${retryCount}/3 pour ${map.ark}...`);
                        } else {
                            console.error(`❌ ${map.ark} : échec après 3 tentatives`);
                            stats.failed++;
                            stats.errors.push({ ark: map.ark, error: 'Max retries exceeded' });
                            break;
                        }
                    } else {
                        stats.failed++;
                        stats.errors.push({ ark: map.ark, error: error.message });
                        break;
                    }
                }
            }
            
            if (onProgress) onProgress(i + 1, maps.length, stats);
            
            // Log progression toutes les 5 cartes
            if ((i + 1) % 5 === 0 || i === maps.length - 1) {
                console.log(`📊 Progression: ${i+1}/${maps.length} - ✅ ${stats.success}, ❌ ${stats.failed}, ⏭️  ${stats.skipped}, ⏳ ${stats.waitedForQuota}`);
            }
        }
        
        console.log('');
        console.log('✅ Enrichissement terminé');
        console.log(`   ✅ Succès: ${stats.success}`);
        console.log(`   ❌ Échecs: ${stats.failed}`);
        console.log(`   ⏭️  Skippés: ${stats.skipped}`);
        console.log(`   ⏳ Attentes quota: ${stats.waitedForQuota}`);
        
        if (stats.errors.length > 0) {
            console.log('');
            console.log('❌ Cartes en erreur :');
            stats.errors.forEach(err => {
                console.log(`   - ${err.ark}: ${err.error}`);
            });
        }
        
        return stats;
    }
    /**
     * Enrichir toutes les cartes avec reprise automatique
     * Sauvegarde la progression dans localStorage
     * Peut être interrompu et repris sans perte de données
     */
    async enrichAllMapsRobust(maps, onProgress = null) {
        console.log(`🚀 Démarrage de l'enrichissement robuste de ${maps.length} cartes...`);
        console.log('   Cette opération peut être interrompue et reprise automatiquement');
        
        const stats = {
            success: 0,
            failed: 0,
            skipped: 0,
            waitedForQuota: 0,
            errors: []
        };

        // Récupérer la progression sauvegardée
        const savedProgress = localStorage.getItem('gallica_migration_progress');
        let startIndex = 0;
        if (savedProgress) {
            const progress = JSON.parse(savedProgress);
            startIndex = progress.lastProcessedIndex + 1;
            if (startIndex < maps.length) {
                console.log(`📂 Reprise depuis la carte ${startIndex + 1}/${maps.length}`);
            } else {
                console.log('✅ Migration déjà complète');
                localStorage.removeItem('gallica_migration_progress');
                return stats;
            }
        }

        for (let i = startIndex; i < maps.length; i++) {
            const map = maps[i];
            let retryCount = 0;
            let success = false;
            
            // Retry loop avec maximum 10 tentatives par carte
            while (!success && retryCount < 10) {
                try {
                    const result = await this.enrichMap(map.ark);
                    
                    if (result.success) {
                        if (result.skipped) {
                            stats.skipped++;
                        } else {
                            stats.success++;
                        }
                        success = true;
                        
                        // Sauvegarder la progression
                        localStorage.setItem('gallica_migration_progress', JSON.stringify({
                            lastProcessedIndex: i,
                            timestamp: new Date().toISOString(),
                            stats: stats
                        }));
                    } else {
                        stats.failed++;
                        stats.errors.push({ ark: map.ark, error: result.error });
                        break; // Pas de retry si erreur non-quota
                    }
                    
                } catch (error) {
                    if (error.message.startsWith('QUOTA_EXCEEDED:')) {
                        // Quota dépassé, on a déjà attendu dans fetchFromGallica
                        stats.waitedForQuota++;
                        retryCount++;
                        
                        console.log(`🔄 Retry ${retryCount}/10 pour ${map.ark} après attente quota...`);
                        
                        if (retryCount >= 10) {
                            console.error(`❌ ${map.ark} : échec après 10 tentatives`);
                            stats.failed++;
                            stats.errors.push({ ark: map.ark, error: 'Max retries exceeded (10 attempts)' });
                            break;
                        }
                    } else {
                        stats.failed++;
                        stats.errors.push({ ark: map.ark, error: error.message });
                        break;
                    }
                }
            }
            
            if (onProgress) onProgress(i + 1, maps.length, stats);
            
            // Log progression toutes les 5 cartes
            if ((i + 1) % 5 === 0 || i === maps.length - 1) {
                console.log(`📊 Progression: ${i+1}/${maps.length} - ✅ ${stats.success}, ❌ ${stats.failed}, ⏭️  ${stats.skipped}, ⏳ ${stats.waitedForQuota}`);
            }
        }
        
        // Nettoyage de la progression sauvegardée
        localStorage.removeItem('gallica_migration_progress');
        
        console.log('');
        console.log('✅ Enrichissement robuste terminé');
        console.log(`   ✅ Succès: ${stats.success}`);
        console.log(`   ❌ Échecs: ${stats.failed}`);
        console.log(`   ⏭️  Skippés: ${stats.skipped}`);
        console.log(`   ⏳ Attentes quota: ${stats.waitedForQuota}`);
        
        if (stats.errors.length > 0) {
            console.log('');
            console.log('❌ Cartes en erreur:');
            stats.errors.forEach(err => {
                console.log(`   - ${err.ark}: ${err.error}`);
            });
        }
        
        return stats;
    }
}

// Instance globale
window.gallicaMetadataStorage = new GallicaMetadataStorage();

// Fonctions helper pour console
window.enrichMap = (arkId) => window.gallicaMetadataStorage.enrichMap(arkId);
window.enrichAllMaps = (maps) => window.gallicaMetadataStorage.enrichAllMaps(maps);
window.enrichAllMapsRobust = (maps, onProgress) => window.gallicaMetadataStorage.enrichAllMapsRobust(maps, onProgress);

// Fonction helper pour charger les cartes si pas déjà en mémoire
async function loadMapsIfNeeded() {
    if (window.realMapsData && window.realMapsData.length > 0) {
        return window.realMapsData;
    }
    
    console.log('📡 Chargement des cartes géoréférencées depuis l\'API...');
    
    try {
        const response = await fetch('https://api.ptm.huma-num.fr/auth/admin/galligeo/georeferenced-maps-by-users');
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'ok' && data.users) {
            const maps = [];
            
            data.users.forEach(user => {
                user.georeferenced_maps.forEach(map => {
                    maps.push({
                        ark: map.ark,
                        status: map.status,
                        gallica_title: map.gallica_title,
                        gallica_producer: map.gallica_producer,
                        gallica_date: map.gallica_date,
                        gallica_thumbnail_url: map.gallica_thumbnail_url,
                        metadata_fetched_at: map.metadata_fetched_at
                    });
                });
            });
            
            console.log(`✅ ${maps.length} cartes chargées depuis l'API`);
            return maps;
        } else {
            throw new Error('Format de données invalide');
        }
        
    } catch (error) {
        console.error('❌ Erreur récupération cartes:', error);
        throw error;
    }
}

// Fonction de migration simplifiée qui utilise la version robuste
window.migrerToutesLesMetadonnees = async function() {
    // Charger les cartes depuis l'API si pas déjà en mémoire
    let maps;
    try {
        maps = await loadMapsIfNeeded();
    } catch (error) {
        console.error('❌ Impossible de charger les cartes géoréférencées');
        console.log('💡 Vérifiez votre connexion et que l\'API est accessible');
        return;
    }
    
    if (!maps || maps.length === 0) {
        console.error('❌ Aucune carte géoréférencée trouvée');
        return;
    }
    
    console.log('🚀 MIGRATION ROBUSTE DES MÉTADONNÉES GALLICA');
    console.log('='.repeat(60));
    console.log(`📊 ${maps.length} cartes à traiter`);
    console.log(`⏱️  Durée estimée: ~${Math.ceil(maps.length / 60)} minutes (1 req/s)`);
    console.log('');
    console.log('✨ FONCTIONNALITÉS :');
    console.log('   • Attente automatique si quota dépassé');
    console.log('   • Jusqu\'à 10 tentatives par carte');
    console.log('   • Sauvegarde de la progression dans localStorage');
    console.log('   • Peut être interrompu et repris (F5 puis relancer)');
    console.log('');
    
    return await window.gallicaMetadataStorage.enrichAllMapsRobust(
        maps,
        (current, total, stats) => {
            // Callback de progression (optionnel)
        }
    );
};

console.log('✅ Module GallicaMetadataStorage chargé');
console.log('');
console.log('📖 COMMANDES DISPONIBLES :');
console.log('   await enrichMap("btv1b8441261v")           - Enrichir une carte');
console.log('   await enrichAllMaps(realMapsData)         - Enrichir toutes les cartes (basique)');
console.log('   await enrichAllMapsRobust(realMapsData)   - Enrichir avec reprise automatique');
console.log('   await migrerToutesLesMetadonnees()        - 🌟 RECOMMANDÉ : Migration complète');
console.log('');
