/**
 * Galligeo Atlas Viewer
 * Visualiseur d'atlas cartographiques avec support IIIF
 */

// Configuration globale
const CONFIG = {
    API_BASE_URL: 'https://api.ptm.huma-num.fr/auth/app/galligeo/atlas',
    DEFAULT_CENTER: [46.603354, 1.888334],
    DEFAULT_ZOOM: 6,
    MIN_ZOOM: 3,
    MAX_ZOOM: 20,
    OSM_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
};

// État global
let atlasData = null;
let mapsData = [];
let maps = {
    single: null,
    left: null,
    right: null
};
let layers = [];
let currentView = 'single';
let syncEnabled = false;

// Fonction pour attendre que PTMAuth soit prêt (instance globale : window.ptmAuth)
async function waitForPTMAuth() {
    if (typeof window.ptmAuth !== 'undefined' && window.ptmAuth) {
        return window.ptmAuth;
    }
    // Attendre maximum 1 seconde pour les atlas publics
    return new Promise((resolve) => {
        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            if (typeof window.ptmAuth !== 'undefined' && window.ptmAuth) {
                clearInterval(checkInterval);
                console.log('✅ PTMAuth chargé');
                resolve(window.ptmAuth);
            } else if (attempts > 10) { // 10 * 100ms = 1s
                clearInterval(checkInterval);
                console.warn('⚠️ PTMAuth non disponible, continuons sans authentification');
                resolve(null);
            }
        }, 100);
    });
}

// Titres/dates Gallica mis en cache côté serveur (ark → valeur), lus depuis /app/galligeo/data
// pour éviter de refaire un appel au manifest IIIF de la BnF pour des cartes déjà géoréférencées
let cachedTitlesByArk = {};
let cachedDatesByArk = {};

async function loadCachedTitles(ptmAuth) {
    if (!ptmAuth || typeof ptmAuth.isAuthenticated !== 'function' || !ptmAuth.isAuthenticated()) {
        return;
    }
    try {
        const data = await ptmAuth.getGalligeoData();
        (data.rec_ark || []).forEach(item => {
            if (item.ark && item.gallica_title) {
                cachedTitlesByArk[item.ark] = item.gallica_title;
            }
            if (item.ark && item.gallica_date) {
                cachedDatesByArk[item.ark] = item.gallica_date;
            }
        });
        console.log(`📂 ${Object.keys(cachedTitlesByArk).length} titre(s) récupéré(s) depuis le cache interne`);
    } catch (error) {
        console.warn('⚠️ Impossible de récupérer les titres en cache depuis /app/galligeo/data:', error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Attendre que PTMAuth soit prêt
        const ptmAuth = await waitForPTMAuth();
        if (ptmAuth && typeof ptmAuth.checkAuthStatus === 'function') {
            await ptmAuth.checkAuthStatus();
        }
        await loadCachedTitles(ptmAuth);

        const slug = getAtlasSlugFromURL();
        if (!slug) {
            showError('URL invalide', 'Le format d\'URL attendu est : /atlas/?slug={slug}');
            return;
        }
        
        await loadAtlasData(slug);
        initializeMaps();
        await loadMapsMetadata();
        generateLayerControls();
        setupEventListeners();
        
        document.getElementById('loading-overlay').classList.add('hidden');
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        showError('Erreur de chargement', error.message);
    }
});

function getAtlasSlugFromURL() {
    // Essayer d'abord de récupérer depuis les paramètres d'URL
    const urlParams = new URLSearchParams(window.location.search);
    const slugFromParam = urlParams.get('slug') || urlParams.get('id');
    if (slugFromParam) {
        console.log('🔍 Slug extrait des paramètres:', slugFromParam);
        return slugFromParam;
    }
    
    // Sinon, essayer d'extraire depuis le chemin
    const path = window.location.pathname;
    const match = path.match(/\/atlas\/([^\/]+)\/?$/);
    if (match && match[1] !== 'index.html') {
        console.log('🔍 Slug extrait du chemin:', match[1]);
        return match[1];
    }
    
    console.error('❌ Impossible d\'extraire le slug de:', window.location.href);
    return null;
}

async function loadAtlasData(urlSlug) {
    updateLoadingMessage('Chargement des informations de l\'atlas...');
    
    try {
        const token = (typeof window.ptmAuth !== 'undefined' && window.ptmAuth && typeof window.ptmAuth.getToken === 'function')
            ? window.ptmAuth.getToken()
            : null;
        const headers = {
            'Accept': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(CONFIG.API_BASE_URL, { headers });
        
        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
        }
        
        const responseData = await response.json();
        console.log('📊 Données reçues de l\'API:', responseData);
        console.log('📊 Type de données:', typeof responseData, Array.isArray(responseData));
        
        // Gérer le cas où la réponse est un objet avec une propriété contenant les atlas
        let allAtlas = responseData;
        if (!Array.isArray(responseData)) {
            // Si ce n'est pas un tableau, chercher une propriété qui pourrait contenir les atlas
            if (responseData.data && Array.isArray(responseData.data)) {
                allAtlas = responseData.data;
            } else if (responseData.atlas && Array.isArray(responseData.atlas)) {
                allAtlas = responseData.atlas;
            } else if (responseData.items && Array.isArray(responseData.items)) {
                allAtlas = responseData.items;
            } else {
                // Si c'est un objet unique, le mettre dans un tableau
                allAtlas = [responseData];
            }
        }
        
        console.log('📋 Liste des atlas:', allAtlas);
        console.log('📋 Nombre d\'atlas:', allAtlas.length);
        
        // Trouver l'atlas : supporter à la fois le slug simple et l'ancienne URL complète
        atlasData = allAtlas.find(a => {
            let atlasSlug = a.url || '';
            // Si l'URL contient ://, extraire juste le slug
            if (atlasSlug.includes('://')) {
                atlasSlug = atlasSlug.split('/').filter(Boolean).pop();
            }
            console.log('🔍 Comparaison:', atlasSlug, '===', urlSlug, '?', atlasSlug === urlSlug);
            return atlasSlug === urlSlug || a.url === urlSlug;
        });
        
        if (!atlasData) {
            throw new Error(`Atlas introuvable: ${urlSlug}`);
        }
        
        document.getElementById('atlas-title').textContent = atlasData.name || 'Atlas sans nom';
        
        const typeBadge = document.getElementById('atlas-type-badge');
        if (atlasData.display_mode === 'diachronique') {
            typeBadge.textContent = 'Diachronique';
            typeBadge.className = 'atlas-type-badge diachronique';
        } else {
            typeBadge.textContent = 'Voisinage';
            typeBadge.className = 'atlas-type-badge voisinage';
        }
        
        document.title = `${atlasData.name} - Galligeo`;
        
        console.log('Atlas chargé:', atlasData);
        
    } catch (error) {
        console.error('Erreur lors du chargement de l\'atlas:', error);
        throw error;
    }
}

// Récupère le titre et la date Gallica/BnF d'un ark depuis le manifest IIIF
async function fetchBnFMetadata(arkId) {
    const result = { title: null, date: null };
    try {
        const url = `https://openapi.bnf.fr/iiif/presentation/v3/ark:/12148/${arkId}/manifest.json`;
        const response = await fetch(url);
        if (!response.ok) return result;

        const data = await response.json();
        if (!data.metadata) return result;

        for (const el of data.metadata) {
            const label = (typeof el.label === 'object'
                ? (el.label.fr?.[0] || el.label.en?.[0] || el.label.none?.[0] || '')
                : String(el.label || '')).toLowerCase();

            const value = typeof el.value === 'object'
                ? (el.value.fr?.[0] || el.value.en?.[0] || el.value.none?.[0] || '')
                : String(el.value || '');
            if (!value) continue;

            if (!result.title && (label === 'titre' || label === 'title')) {
                result.title = value;
            } else if (!result.date && label === 'date') {
                result.date = value;
            }
        }
        return result;
    } catch (error) {
        console.warn(`⚠️ Impossible de récupérer les métadonnées BnF pour ${arkId}:`, error);
        return result;
    }
}

async function loadMapsMetadata() {
    updateLoadingMessage('Chargement des métadonnées des cartes...');

    if (!atlasData || !atlasData.ark_ids || atlasData.ark_ids.length === 0) {
        throw new Error('Aucune carte associée à cet atlas');
    }

    // Pour le serveur PTM, on n'a pas besoin de charger les tuiles IIIF, seulement le titre.
    // Priorité : cache interne (/app/galligeo/data, déjà en mémoire) → manifest IIIF BnF en fallback,
    // pour éviter de solliciter inutilement l'API Gallica (cf. doc/GALLICA_METADATA_CACHING.md)
    mapsData = await Promise.all(atlasData.ark_ids.map(async (arkId, index) => {
        // Normaliser l'ARK ID (enlever le préfixe ark:/12148/ s'il existe)
        let cleanArkId = arkId.replace(/^ark:\/12148\//, '');
        let title = cachedTitlesByArk[cleanArkId] || cachedTitlesByArk[arkId];
        let date = cachedDatesByArk[cleanArkId] || cachedDatesByArk[arkId];

        if (!title) {
            const bnf = await fetchBnFMetadata(cleanArkId);
            title = bnf.title;
            date = date || bnf.date;
        }

        const displayTitle = title
            ? (date ? `${title} (${date})` : title)
            : `Carte ${index + 1}`;

        return {
            arkId: cleanArkId,
            index: index,
            title: displayTitle,
            tileUrl: `https://{s}.tile.ptm.huma-num.fr/tiles/ark/12148/${cleanArkId}/{z}/{x}/{y}.png`
        };
    }));

    console.log('Métadonnées des cartes chargées:', mapsData);

    // Centrer la vue initiale sur la carte affichée par défaut
    await tryToFitBounds();
}

// Fonction pour récupérer les informations de tuiles pour une carte
async function fetchTileInfo(arkId) {
    try {
        const infoUrl = `https://tile.ptm.huma-num.fr/tiles/ark/info_tiles/12148/${arkId}`;
        const response = await fetch(infoUrl);
        
        if (!response.ok) {
            console.warn(`⚠️ Impossible de récupérer les info_tiles pour ${arkId}`);
            return null;
        }
        
        const info = await response.json();
        
        // Parser les bounds (format: "minLng,minLat,maxLng,maxLat")
        if (info.bounds) {
            const [minLng, minLat, maxLng, maxLat] = info.bounds.split(',').map(parseFloat);
            return {
                arkId: arkId,
                bounds: {
                    minLng: minLng,
                    minLat: minLat,
                    maxLng: maxLng,
                    maxLat: maxLat
                },
                minzoom: parseInt(info.minzoom) || 11,
                maxzoom: parseInt(info.maxzoom) || 16,
                name: info.name
            };
        }
        
        return null;
    } catch (error) {
        console.warn(`⚠️ Erreur lors de la récupération des info_tiles pour ${arkId}:`, error);
        return null;
    }
}

// Fonction pour calculer l'emprise maximale de plusieurs cartes
function calculateCombinedBounds(tilesInfoArray) {
    if (!tilesInfoArray || tilesInfoArray.length === 0) {
        return null;
    }
    
    // Filtrer les résultats valides
    const validInfos = tilesInfoArray.filter(info => info && info.bounds);
    
    if (validInfos.length === 0) {
        return null;
    }
    
    // Calculer l'emprise maximale
    let minLng = validInfos[0].bounds.minLng;
    let minLat = validInfos[0].bounds.minLat;
    let maxLng = validInfos[0].bounds.maxLng;
    let maxLat = validInfos[0].bounds.maxLat;
    
    for (let i = 1; i < validInfos.length; i++) {
        const bounds = validInfos[i].bounds;
        minLng = Math.min(minLng, bounds.minLng);
        minLat = Math.min(minLat, bounds.minLat);
        maxLng = Math.max(maxLng, bounds.maxLng);
        maxLat = Math.max(maxLat, bounds.maxLat);
    }
    
    return {
        minLng: minLng,
        minLat: minLat,
        maxLng: maxLng,
        maxLat: maxLat
    };
}

// Fonction pour centrer la carte sur l'emprise des tuiles
async function fitToTilesBounds() {
    try {
        updateLoadingMessage('Calcul de l\'emprise des tuiles...');
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.remove('hidden');
        
        // Récupérer les informations de toutes les cartes en parallèle
        const tilesInfoPromises = mapsData.map(mapData => fetchTileInfo(mapData.arkId));
        const tilesInfoArray = await Promise.all(tilesInfoPromises);
        
        // Calculer l'emprise combinée
        const combinedBounds = calculateCombinedBounds(tilesInfoArray);
        
        if (!combinedBounds) {
            console.warn('⚠️ Aucune information de bounds disponible');
            loadingOverlay.classList.add('hidden');
            return;
        }
        
        // Créer un objet Leaflet bounds
        const bounds = L.latLngBounds(
            [combinedBounds.minLat, combinedBounds.minLng],
            [combinedBounds.maxLat, combinedBounds.maxLng]
        );
        
        // Centrer la/les carte(s) sur les bounds
        if (currentView === 'single') {
            maps.single.fitBounds(bounds, { padding: [20, 20] });
        } else {
            maps.left.fitBounds(bounds, { padding: [20, 20] });
            maps.right.fitBounds(bounds, { padding: [20, 20] });
        }
        
        console.log('📍 Vue centrée sur l\'emprise des tuiles:', combinedBounds);
        console.log(`📊 ${tilesInfoArray.filter(i => i).length} carte(s) traitée(s)`);
        
        loadingOverlay.classList.add('hidden');
        
    } catch (error) {
        console.error('❌ Erreur lors du centrage sur les tuiles:', error);
        document.getElementById('loading-overlay').classList.add('hidden');
    }
}

// Fonction pour centrer la vue initiale sur la carte affichée par défaut (la première, seule visible au chargement)
async function tryToFitBounds() {
    try {
        const firstMap = mapsData[0];
        if (!firstMap) throw new Error('Aucune carte à centrer');

        const info = await fetchTileInfo(firstMap.arkId);
        if (!info || !info.bounds) throw new Error('Bounds indisponibles pour la carte affichée');

        const bounds = L.latLngBounds(
            [info.bounds.minLat, info.bounds.minLng],
            [info.bounds.maxLat, info.bounds.maxLng]
        );

        // Ne centrer que la carte visible (maps.single) : maps.left/right sont masquées
        // (display:none) tant que la vue éclatée n'est pas active, et un fitBounds sur un
        // conteneur caché calcule un zoom invalide. Elles sont recentrées sur la vue courante
        // au moment du passage en vue éclatée (cf. switchToSplitView).
        maps.single.fitBounds(bounds, { padding: [20, 20] });

        console.log('📍 Vue initiale centrée sur l\'emprise de la carte affichée:', firstMap.arkId, bounds);
    } catch (error) {
        console.warn('⚠️ Impossible de récupérer les bounds de la carte affichée, utilisation des bounds par défaut:', error.message);

        // Bounds par défaut pour la France
        const franceBounds = L.latLngBounds(
            [41.3, -5.2],  // Sud-Ouest (Perpignan)
            [51.1, 9.6]    // Nord-Est (Strasbourg)
        );
        maps.single.fitBounds(franceBounds);
        console.log('📍 Bounds par défaut (France) appliqués');
    }
}

// Cette fonction n'est plus utilisée avec le serveur PTM
async function fetchGallicaMetadata(arkId, index) {
    try {
        // Normaliser l'ARK ID
        let cleanArkId = arkId.replace(/^ark:\/12148\//, '');
        
        const infoUrl = `https://gallica.bnf.fr/iiif/ark:/12148/${cleanArkId}/f1/info.json`;
        const response = await fetch(infoUrl);
        
        if (!response.ok) {
            throw new Error(`Erreur IIIF: ${response.status}`);
        }
        
        const metadata = await response.json();
        
        return {
            arkId: arkId,
            index: index,
            title: `Carte ${index + 1}`,
            infoUrl: infoUrl,
            width: metadata.width,
            height: metadata.height,
            metadata: metadata
        };
        
    } catch (error) {
        console.error(`Erreur chargement métadonnées ${arkId}:`, error);
        return {
            arkId: arkId,
            index: index,
            title: `Carte ${index + 1}`,
            error: error.message
        };
    }
}

function initializeMaps() {
    updateLoadingMessage('Initialisation des cartes...');
    
    maps.single = L.map('map-single', {
        center: CONFIG.DEFAULT_CENTER,
        zoom: CONFIG.DEFAULT_ZOOM,
        minZoom: CONFIG.MIN_ZOOM,
        maxZoom: CONFIG.MAX_ZOOM
    });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: CONFIG.OSM_ATTRIBUTION,
        maxZoom: 19
    }).addTo(maps.single);
    
    maps.left = L.map('map-left', {
        center: CONFIG.DEFAULT_CENTER,
        zoom: CONFIG.DEFAULT_ZOOM,
        minZoom: CONFIG.MIN_ZOOM,
        maxZoom: CONFIG.MAX_ZOOM
    });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: CONFIG.OSM_ATTRIBUTION,
        maxZoom: 19
    }).addTo(maps.left);
    
    maps.right = L.map('map-right', {
        center: CONFIG.DEFAULT_CENTER,
        zoom: CONFIG.DEFAULT_ZOOM,
        minZoom: CONFIG.MIN_ZOOM,
        maxZoom: CONFIG.MAX_ZOOM
    });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: CONFIG.OSM_ATTRIBUTION,
        maxZoom: 19
    }).addTo(maps.right);
    
    console.log('Cartes initialisées');
}

function generateLayerControls() {
    const container = document.getElementById('layer-controls');
    const noLayersMsg = document.getElementById('no-layers-message');
    
    container.innerHTML = '';
    layers = [];
    
    if (!mapsData || mapsData.length === 0) {
        noLayersMsg.style.display = 'block';
        return;
    }
    
    noLayersMsg.style.display = 'none';
    
    mapsData.forEach((mapData, index) => {
        let tileLayer = null;
        
        if (!mapData.error && mapData.tileUrl) {
            // Utiliser les tuiles PTM standard au lieu d'IIIF
            tileLayer = L.tileLayer(mapData.tileUrl, {
                attribution: 'Tuiles <a href="https://ptm.huma-num.fr" target="_blank">PTM</a> - <a href="https://huma-num.fr" target="_blank">Huma-Num</a>',
                minZoom: CONFIG.MIN_ZOOM,
                maxZoom: CONFIG.MAX_ZOOM,
                subdomains: ['a', 'b', 'c'], // Pour la répartition de charge
                tileSize: 256
            });
        }
        
        const layer = {
            id: `layer-${index}`,
            title: mapData.title,
            arkId: mapData.arkId,
            visible: index === 0,
            opacity: 1,
            splitView: 'none',
            tileLayer: tileLayer,
            error: mapData.error
        };
        
        layers.push(layer);
        
        const layerItem = createLayerControlElement(layer);
        container.appendChild(layerItem);
        
        if (layer.visible && layer.tileLayer && !layer.error) {
            layer.tileLayer.setOpacity(layer.opacity).addTo(maps.single);
        }
    });
}

function createLayerControlElement(layer) {
    const div = document.createElement('div');
    div.className = 'layer-item';
    div.id = `control-${layer.id}`;
    
    let html = `
        <div class="layer-header">
            <div class="layer-title" title="${escapeHtml(layer.title)}">
                <span class="fr-icon-map-pin-2-line" aria-hidden="true"></span>
                <span>${escapeHtml(layer.title)}</span>
            </div>
            <label class="toggle-switch">
                <input type="checkbox" 
                       id="toggle-${layer.id}"
                       ${layer.visible ? 'checked' : ''}
                       ${layer.error ? 'disabled' : ''}
                       onchange="toggleLayer('${layer.id}')">
                <span class="toggle-slider"></span>
            </label>
        </div>
    `;
    
    if (layer.error) {
        html += `
            <div class="layer-error">
                <span class="fr-icon-error-warning-line" aria-hidden="true"></span>
                <span class="fr-text--xs">Erreur: ${escapeHtml(layer.error)}</span>
            </div>
        `;
    } else {
        html += `
            <div class="layer-controls">
                <div class="opacity-control">
                    <label for="opacity-${layer.id}" class="fr-text--xs">
                        Opacité: <span id="opacity-value-${layer.id}">${Math.round(layer.opacity * 100)}%</span>
                    </label>
                    <input type="range" 
                           id="opacity-${layer.id}"
                           class="opacity-slider"
                           min="0" 
                           max="100" 
                           value="${Math.round(layer.opacity * 100)}"
                           oninput="updateOpacity('${layer.id}', this.value)">
                </div>
                
                <div class="split-selector" style="display: ${currentView === 'split' ? 'block' : 'none'};">
                    <fieldset class="fr-segmented fr-segmented--sm">
                        <legend class="fr-segmented__legend fr-text--xs">Affichage en vue éclatée</legend>
                        <div class="fr-segmented__elements">
                            <div class="fr-segmented__element">
                                <input value="none" type="radio" id="split-${layer.id}-none" name="split-${layer.id}"
                                       ${layer.splitView === 'none' ? 'checked' : ''}
                                       onchange="setSplitView('${layer.id}', 'none')">
                                <label class="fr-label" for="split-${layer.id}-none">Masquée</label>
                            </div>
                            <div class="fr-segmented__element">
                                <input value="left" type="radio" id="split-${layer.id}-left" name="split-${layer.id}"
                                       ${layer.splitView === 'left' ? 'checked' : ''}
                                       onchange="setSplitView('${layer.id}', 'left')">
                                <label class="fr-label" for="split-${layer.id}-left">Gauche</label>
                            </div>
                            <div class="fr-segmented__element">
                                <input value="right" type="radio" id="split-${layer.id}-right" name="split-${layer.id}"
                                       ${layer.splitView === 'right' ? 'checked' : ''}
                                       onchange="setSplitView('${layer.id}', 'right')">
                                <label class="fr-label" for="split-${layer.id}-right">Droite</label>
                            </div>
                        </div>
                    </fieldset>
                </div>
            </div>
        `;
    }

    div.innerHTML = html;
    return div;
}

function toggleLayer(layerId) {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !layer.tileLayer) return;
    
    const checkbox = document.getElementById(`toggle-${layerId}`);
    layer.visible = checkbox.checked;
    
    if (currentView === 'single') {
        if (layer.visible) {
            layer.tileLayer.setOpacity(layer.opacity).addTo(maps.single);
        } else {
            maps.single.removeLayer(layer.tileLayer);
        }
    } else {
        updateSplitViewLayers();
    }
}

function updateOpacity(layerId, value) {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !layer.tileLayer) return;
    
    layer.opacity = value / 100;
    layer.tileLayer.setOpacity(layer.opacity);
    
    document.getElementById(`opacity-value-${layerId}`).textContent = `${value}%`;
}

function setSplitView(layerId, view) {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    layer.splitView = view;

    if (currentView === 'split') {
        updateSplitViewLayers();
    }
}

function updateSplitViewLayers() {
    layers.forEach(layer => {
        if (layer.tileLayer) {
            maps.left.removeLayer(layer.tileLayer);
            maps.right.removeLayer(layer.tileLayer);
        }
    });
    
    layers.forEach(layer => {
        if (!layer.visible || !layer.tileLayer) return;
        
        if (layer.splitView === 'left') {
            layer.tileLayer.setOpacity(layer.opacity).addTo(maps.left);
        } else if (layer.splitView === 'right') {
            layer.tileLayer.setOpacity(layer.opacity).addTo(maps.right);
        }
    });
}

function switchToSingleView() {
    currentView = 'single';

    // Masquer la vue split et afficher la vue simple
    const singleView = document.getElementById('single-view');
    const splitView = document.getElementById('split-view');

    singleView.style.display = 'block';
    splitView.style.display = 'none';

    const viewToggle = document.getElementById('toggle-view-mode');
    if (viewToggle) viewToggle.checked = false;

    // visibility (et non display) pour ne pas décaler les autres contrôles de la barre
    document.getElementById('sync-toggle-container').style.visibility = 'hidden';

    // Le choix "gauche/droite" n'a de sens qu'en vue éclatée
    document.querySelectorAll('.split-selector').forEach(el => {
        el.style.display = 'none';
    });

    if (syncEnabled) {
        unsyncMaps();
    }

    layers.forEach(layer => {
        if (layer.tileLayer) {
            maps.left.removeLayer(layer.tileLayer);
            maps.right.removeLayer(layer.tileLayer);
            
            if (layer.visible) {
                layer.tileLayer.setOpacity(layer.opacity).addTo(maps.single);
            }
        }
    });
    
    setTimeout(() => {
        maps.single.invalidateSize();
    }, 100);
}

function switchToSplitView() {
    currentView = 'split';

    // Masquer la vue simple et afficher la vue split
    const singleView = document.getElementById('single-view');
    const splitView = document.getElementById('split-view');

    singleView.style.display = 'none';
    splitView.style.display = 'flex';

    const viewToggle = document.getElementById('toggle-view-mode');
    if (viewToggle) viewToggle.checked = true;

    document.getElementById('sync-toggle-container').style.visibility = 'visible';

    document.querySelectorAll('.split-selector').forEach(el => {
        el.style.display = 'block';
    });

    // S'assurer qu'une couche est affichée à gauche et une à droite (sinon vue vide)
    ensureSplitLayersAssigned();

    layers.forEach(layer => {
        if (layer.tileLayer) {
            maps.single.removeLayer(layer.tileLayer);
        }
    });

    updateSplitViewLayers();

    // Repartir du centre/zoom déjà affiché en mode simple plutôt que de la vue par défaut
    const center = maps.single.getCenter();
    const zoom = maps.single.getZoom();
    maps.left.setView(center, zoom, { animate: false });
    maps.right.setView(center, zoom, { animate: false });

    setTimeout(() => {
        maps.left.invalidateSize();
        maps.right.invalidateSize();
    }, 100);

    if (!syncEnabled) {
        syncMaps();
    }
}

// S'assure qu'au moins une couche est assignée à gauche et une à droite en vue éclatée,
// sans modifier les choix déjà faits manuellement par l'utilisateur
function ensureSplitLayersAssigned() {
    const eligible = layers.filter(l => l.tileLayer && !l.error);
    if (eligible.length === 0) return;

    const hasLeft = eligible.some(l => l.splitView === 'left');
    const hasRight = eligible.some(l => l.splitView === 'right');
    const unassigned = eligible.filter(l => l.splitView === 'none');

    if (!hasLeft) {
        (unassigned.shift() || eligible[0]).splitView = 'left';
    }
    if (!hasRight) {
        (unassigned.shift() || eligible.find(l => l.splitView !== 'left') || eligible[0]).splitView = 'right';
    }

    layers.forEach(layer => {
        const radio = document.getElementById(`split-${layer.id}-${layer.splitView}`);
        if (radio) radio.checked = true;
    });
}

function syncMaps() {
    if (!maps.left || !maps.right) {
        console.error('❌ Impossible de synchroniser : cartes non initialisées');
        return;
    }
    
    // Si Leaflet.Sync n'est pas disponible, utiliser une synchronisation manuelle
    if (typeof maps.left.sync !== 'function') {
        console.warn('⚠️ Leaflet.Sync non disponible, utilisation de la synchronisation manuelle');
        enableManualSync();
        syncEnabled = true;
        
        const syncToggle = document.getElementById('toggle-sync');
        if (syncToggle) syncToggle.checked = true;
        return;
    }
    
    try {
        maps.left.sync(maps.right);
        maps.right.sync(maps.left);
        
        syncEnabled = true;
        
        const syncToggle = document.getElementById('toggle-sync');
        if (syncToggle) syncToggle.checked = true;
        
        console.log('✅ Cartes synchronisées avec Leaflet.Sync');
    } catch (error) {
        console.error('❌ Erreur lors de la synchronisation:', error);
    }
}

function unsyncMaps() {
    if (!maps.left || !maps.right) {
        console.error('❌ Impossible de désynchroniser : cartes non initialisées');
        return;
    }
    
    // Si Leaflet.Sync n'est pas disponible, désactiver la synchronisation manuelle
    if (typeof maps.left.unsync !== 'function') {
        console.warn('⚠️ Leaflet.Sync non disponible, désactivation de la synchronisation manuelle');
        disableManualSync();
        syncEnabled = false;
        
        const syncToggle = document.getElementById('toggle-sync');
        if (syncToggle) syncToggle.checked = false;
        return;
    }
    
    try {
        maps.left.unsync(maps.right);
        maps.right.unsync(maps.left);
        
        syncEnabled = false;
        
        const syncToggle = document.getElementById('toggle-sync');
        if (syncToggle) syncToggle.checked = false;
        
        console.log('✅ Cartes désynchronisées');
    } catch (error) {
        console.error('❌ Erreur lors de la désynchronisation:', error);
    }
}

// Variables pour la synchronisation manuelle
let leftMoveHandler, rightMoveHandler, leftZoomHandler, rightZoomHandler;

// Synchronisation manuelle (fallback si Leaflet.Sync ne fonctionne pas)
function enableManualSync() {
    // Éviter les boucles infinies avec des flags
    let isSyncing = false;
    
    leftMoveHandler = function() {
        if (isSyncing) return;
        isSyncing = true;
        maps.right.setView(maps.left.getCenter(), maps.left.getZoom(), {animate: false});
        setTimeout(() => { isSyncing = false; }, 50);
    };
    
    rightMoveHandler = function() {
        if (isSyncing) return;
        isSyncing = true;
        maps.left.setView(maps.right.getCenter(), maps.right.getZoom(), {animate: false});
        setTimeout(() => { isSyncing = false; }, 50);
    };
    
    maps.left.on('moveend', leftMoveHandler);
    maps.right.on('moveend', rightMoveHandler);
    
    console.log('✅ Synchronisation manuelle activée');
}

function disableManualSync() {
    if (leftMoveHandler) maps.left.off('moveend', leftMoveHandler);
    if (rightMoveHandler) maps.right.off('moveend', rightMoveHandler);
    
    leftMoveHandler = null;
    rightMoveHandler = null;
    
    console.log('✅ Synchronisation manuelle désactivée');
}

function setupEventListeners() {
    // Toggle DSFR de bascule de vue (simple / éclatée)
    const viewToggle = document.getElementById('toggle-view-mode');
    if (viewToggle) {
        viewToggle.addEventListener('change', function() {
            if (this.checked) {
                switchToSplitView();
            } else {
                switchToSingleView();
            }
        });
    }


    // Toggle DSFR de synchronisation
    const syncToggle = document.getElementById('toggle-sync');
    if (syncToggle) {
        syncToggle.addEventListener('change', function() {
            if (this.checked) {
                syncMaps();
            } else {
                unsyncMaps();
            }
        });
    }
    
    // Redimensionnement de la fenêtre
    window.addEventListener('resize', () => {
        Object.values(maps).forEach(map => {
            if (map) map.invalidateSize();
        });
    });
    
    setupResizableDivider();
}

function setupResizableDivider() {
    const divider = document.getElementById('map-divider');
    const splitView = document.getElementById('split-view');
    const leftMap = document.getElementById('map-left');
    const rightMap = document.getElementById('map-right');
    
    let isResizing = false;
    
    divider.addEventListener('mousedown', (e) => {
        isResizing = true;
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const containerRect = splitView.getBoundingClientRect();
        const offsetX = e.clientX - containerRect.left;
        const percentage = (offsetX / containerRect.width) * 100;
        
        if (percentage > 10 && percentage < 90) {
            leftMap.style.flex = `0 0 ${percentage}%`;
            rightMap.style.flex = `1`;
            
            setTimeout(() => {
                maps.left.invalidateSize();
                maps.right.invalidateSize();
            }, 10);
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
        }
    });
}

function updateLoadingMessage(message) {
    const msgElement = document.getElementById('loading-message');
    if (msgElement) {
        msgElement.textContent = message;
    }
}

function showError(title, message) {
    const overlay = document.getElementById('loading-overlay');
    overlay.innerHTML = `
        <div class="error-message">
            <span class="fr-icon-error-warning-fill" 
                  style="font-size: 3rem; color: var(--text-default-error); display: block; margin-bottom: 1rem;"
                  aria-hidden="true"></span>
            <h2 class="fr-h4">${escapeHtml(title)}</h2>
            <p class="fr-text--sm">${escapeHtml(message)}</p>
            <a href="../galerie/" class="fr-btn fr-btn--secondary" style="margin-top: 1rem;">
                Retour à la galerie
            </a>
        </div>
    `;
    overlay.classList.remove('hidden');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
