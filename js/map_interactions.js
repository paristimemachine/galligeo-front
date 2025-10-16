const POLYGON_FILL_COLOR = 'rgba(255, 0, 0, 0)';
const POLYGON_STROKE_COLOR = 'rgba(0, 55, 255)';

var left_map, right_map, customMarker;

/**
 * Initialise les cartes et composants Leaflet
 */
function initializeMaps() {
    console.log('🗺️ Initialisation des cartes Leaflet');
    
    if (window.maps_initialized) {
        console.log('⚠️ Les cartes sont déjà initialisées (marqueur global)');
        return;
    }
    
    if (typeof left_map !== 'undefined' && left_map !== null) {
        console.log('⚠️ Cartes déjà initialisées, ignoré la double initialisation');
        return;
    }
    
    const leftContainer = document.getElementById('map-left');
    const rightContainer = document.getElementById('map-right');
    
    if (!leftContainer || !rightContainer) {
        console.error('❌ Conteneurs de cartes non trouvés');
        return;
    }
    
    if (leftContainer._leaflet_id || rightContainer._leaflet_id) {
        console.warn('⚠️ Conteneurs déjà utilisés par Leaflet, nettoyage nécessaire');
        if (leftContainer._leaflet_id) {
            delete leftContainer._leaflet_id;
        }
        if (rightContainer._leaflet_id) {
            delete rightContainer._leaflet_id;
        }
    }
    
    left_map = L.map('map-left', {
        center: [47, 2],
        zoomSnap: 0.1,
        zoomDelta: 0.25,
        zoom: 6.2,
        loadingControl: true,
        rotate: true,
        bearing: 0
    });

    right_map = L.map('map-right', {
        center: [47, 2],
        zoomSnap: 0.1,
        zoomDelta: 0.25,
        zoom: 6.2,
        loadingControl: true
    });

    customMarker = L.Icon.extend({
        options: {
            shadowUrl: null,
            iconAnchor: new L.Point(12, 12),
            iconSize: new L.Point(24, 24),
            iconUrl: "img/x.svg",
        }
    });

// Contrôle rose des vents personnalisé utilisant leaflet-rotate
L.Control.CompassRotation = L.Control.extend({
    options: {
        position: 'bottomright'
    },

    initialize: function(options) {
        L.setOptions(this, options);
        this._isDragging = false;
    },

    onAdd: function(map) {
        this._map = map;
        
        var container = L.DomUtil.create('div', 'leaflet-control-compass-rotation leaflet-bar leaflet-control');
        
        var compassDiv = L.DomUtil.create('div', 'compass-rose', container);
        var northLabel = L.DomUtil.create('div', 'north-label', compassDiv);
        northLabel.innerHTML = '0°';
        
        var resetBtn = L.DomUtil.create('div', 'compass-reset-btn', container);
        resetBtn.innerHTML = 'Reset';
        resetBtn.title = 'Remettre à zéro la rotation';
        
        this._compassDiv = compassDiv;
        this._resetBtn = resetBtn;
        this._northLabel = northLabel;
        
        // Événements pour la rotation
        L.DomEvent.on(compassDiv, 'mousedown', this._onMouseDown, this);
        L.DomEvent.on(resetBtn, 'click', this._resetRotation, this);
        
        // Empêcher la propagation des événements de la carte
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        
        // Mettre à jour l'affichage selon la rotation actuelle
        this._updateCompassDisplay();
        
        return container;
    },

    _onMouseDown: function(e) {
        if (e.target === this._resetBtn) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        this._startAngle = this._getAngleFromEvent(e);
        this._startBearing = this._map.getBearing() || 0;
        this._isDragging = true;
        
        L.DomEvent.on(document, 'mousemove', this._onMouseMove, this);
        L.DomEvent.on(document, 'mouseup', this._onMouseUp, this);
        
        L.DomUtil.addClass(document.body, 'leaflet-dragging');
    },

    _onMouseMove: function(e) {
        if (!this._isDragging) return;
        
        var currentAngle = this._getAngleFromEvent(e);
        var deltaAngle = currentAngle - this._startAngle;
        var newBearing = this._startBearing + deltaAngle;
        
        // Utiliser la méthode setBearing du plugin leaflet-rotate
        this._map.setBearing(newBearing);
        this._updateCompassDisplay();
    },

    _onMouseUp: function(e) {
        this._isDragging = false;
        
        L.DomEvent.off(document, 'mousemove', this._onMouseMove, this);
        L.DomEvent.off(document, 'mouseup', this._onMouseUp, this);
        
        L.DomUtil.removeClass(document.body, 'leaflet-dragging');
    },

    _getAngleFromEvent: function(e) {
        var rect = this._compassDiv.getBoundingClientRect();
        var centerX = rect.left + rect.width / 2;
        var centerY = rect.top + rect.height / 2;
        
        var deltaX = e.clientX - centerX;
        var deltaY = e.clientY - centerY;
        
        return Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    },

    _updateCompassDisplay: function() {
        var bearing = this._map.getBearing() || 0;
        this._compassDiv.style.transform = 'rotate(' + bearing + 'deg)';
    },

    _resetRotation: function(e) {
        e.stopPropagation();
        this._map.setBearing(0);
        this._updateCompassDisplay();
    },

    onRemove: function() {
        // Nettoyage si nécessaire
    }
});

// Factory function
L.control.compassRotation = function(options) {
    return new L.Control.CompassRotation(options);
};

// appel des layers neutres
var { points: layer_img_pts_left, emprise: layer_img_emprise_left } = add_neutral_control_layer(left_map);
var layer_img_pts_right = add_wms_layers(right_map);

// Exposer ces variables globalement pour les autres scripts
window.layer_img_pts_left = layer_img_pts_left;
window.layer_img_pts_right = layer_img_pts_right;
window.layer_img_emprise_left = layer_img_emprise_left;

// Ajouter le contrôle rose des vents uniquement à la carte gauche
var compassControl = L.control.compassRotation({
    position: 'bottomright'
});
left_map.addControl(compassControl);

function add_neutral_control_layer(map) {

    var drawnItems         = new L.FeatureGroup();
    var drawnItemsEmprise  = new L.FeatureGroup();
    drawnItems.addTo(map);
    drawnItemsEmprise.addTo(map);
    var overlays = {
        "Georef points": drawnItems,
        "Emprise": drawnItemsEmprise
    };

    map.zoomControl.setPosition('topleft');

    var layerControl = L.control.layers({}, overlays, {collapsed:true, position: 'topleft'})
    layerControl.addTo(map);

    // Vérifier si le plugin Loading est disponible
    if (L.Control.loading) {
        var loadingControl = L.Control.loading({
            separate: true
        });
        map.addControl(loadingControl);
    } else {
        console.warn('⚠️ Plugin L.Control.loading non disponible');
    }

    return { points: drawnItems, emprise: drawnItemsEmprise };
}

function add_wms_layers(map) {

    //available layers

    var OpenStreetMap_classique = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        maxZoom: 21,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>'
    });

    var OpenStreetMap_France = L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    var OpenStreetMap_HOT = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        maxZoom: 21,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>'
    });

    var OpenStreetMap_BLK = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
        maxZoom: 21,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>'
    });

    var OpenTopoMap = L.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 21,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://opentopomap.org/" target="_blank">Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>'
    });

    var IGN_Plan_actuel = L.tileLayer(
        "https://data.geopf.fr/wmts?" +
        "&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0" +
        "&STYLE=normal" +
        "&TILEMATRIXSET=PM" +
        "&FORMAT=image/png" +
        "&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2" +
        "&TILEMATRIX={z}" +
        "&TILEROW={y}" +
        "&TILECOL={x}",
        {
            attribution: "IGN-F/Geoportail",
            minNativeZoom: 0,
            maxNativeZoom: 19,
            minZoom: 0,
            maxZoom: 21,
            tileSize: 256
        }
    );

    var IGN_Scan1950_Histo = L.tileLayer(
        "https://data.geopf.fr/wmts?" +
        "&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0" +
        "&STYLE=normal" +
        "&TILEMATRIXSET=PM" +
        "&FORMAT=image/jpeg" +
        "&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN50.1950" +
        "&TILEMATRIX={z}" +
        "&TILEROW={y}" +
        "&TILECOL={x}",
        {
            attribution: "IGN-F/Geoportail",
            minNativeZoom: 3,
            maxNativeZoom: 15,
            minZoom: 0,
            maxZoom: 21,
            tileSize: 256
        }
    );

    var IGN_EtatMajor40 = L.tileLayer(
        "https://data.geopf.fr/wmts?" +
        "&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0" +
        "&STYLE=normal" +
        "&TILEMATRIXSET=PM" +
        "&FORMAT=image/jpeg" +
        "&LAYER=GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40" +
        "&TILEMATRIX={z}" +
        "&TILEROW={y}" +
        "&TILECOL={x}",
        {
            attribution: "IGN-F/Geoportail",
            minNativeZoom: 6,
            maxNativeZoom: 15,
            minZoom: 0,
            maxZoom: 21,
            tileSize: 256
        }
    );

    var Ehess_IGN_Cassini = L.tileLayer.wms('https://ws.sogefi-web.com/wms?', {
        layers: 'Carte_Cassini',
        maxZoom: 21,
        attribution : 'EHESS/IGN/SOGEFI'
    });

    let CassiniBNFIGN = L.tileLayer(
        "https://data.geopf.fr/wmts?" +
        "&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0" +
        "&STYLE=normal" +
        "&TILEMATRIXSET=PM_6_14" +
        "&FORMAT=image/png" +
        "&LAYER=BNF-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI" +
        "&TILEMATRIX={z}" +
        "&TILEROW={y}" +
        "&TILECOL={x}",
        {
            attribution: "BnF/IGN-F/Geoportail",
            minNativeZoom: 0,
            maxNativeZoom: 19,
            minZoom: 0,
            maxZoom: 21,
            tileSize: 256
        }
      )

    var baseLayers = {
        "OSM Classique" : OpenStreetMap_classique,
        "OSM France" : OpenStreetMap_France,
        "Humanitarian" : OpenStreetMap_HOT,
        "Black" : OpenStreetMap_BLK,
        "OpenTopoMap" : OpenTopoMap,
        "Plan IGN" : IGN_Plan_actuel,
        "IGN Scan50 Histo" : IGN_Scan1950_Histo,
        "IGN Etat-Major 40" : IGN_EtatMajor40,
        "Carte de Cassini" : Ehess_IGN_Cassini,
        "Carte de Cassini [BNF]" : CassiniBNFIGN,
    };

    var drawnItems = new L.FeatureGroup();
    drawnItems.addTo(map);
    var overlays = {
        "Georef points": drawnItems,
    };

    //set active and default layer
    baseLayers['OSM Classique'].addTo(map);

    map.zoomControl.setPosition('topright');

    var layerControl = L.control.layers(baseLayers, overlays, {collapsed:true, position: 'topright'})
    layerControl.addTo(map);

    // Vérifier si le plugin Geocoder est disponible
    if (L.Control.geocoder) {
        L.Control.geocoder().addTo(map);
    } else {
        console.warn('⚠️ Plugin L.Control.geocoder non disponible');
    }

    // Vérifier si le plugin Loading est disponible
    if (L.Control.loading) {
        var loadingControl = L.Control.loading({
            separate: true,
            position: 'topright'
        });
        map.addControl(loadingControl);
    } else {
        console.warn('⚠️ Plugin L.Control.loading non disponible');
    }
    
    return drawnItems;
}

// Contrôle de transparence pour la carte géoréférencée (carte droite)
L.Control.OpacityControl = L.Control.extend({
    options: {
        position: 'topright'
    },

    onAdd: function(map) {
        this._map = map;
        
        var container = L.DomUtil.create('div', 'leaflet-control-opacity leaflet-bar leaflet-control');
        container.style.backgroundColor = 'white';
        container.style.padding = '10px';
        container.style.minWidth = '200px';
        
        var title = L.DomUtil.create('div', 'opacity-control-title', container);
        title.innerHTML = '<strong>Transparence de la carte</strong>';
        title.style.marginBottom = '8px';
        title.style.fontSize = '12px';
        
        var sliderContainer = L.DomUtil.create('div', 'opacity-slider-container', container);
        sliderContainer.style.display = 'flex';
        sliderContainer.style.alignItems = 'center';
        sliderContainer.style.gap = '10px';
        
        var slider = L.DomUtil.create('input', 'opacity-slider', sliderContainer);
        slider.type = 'range';
        slider.min = '0';
        slider.max = '100';
        slider.value = '100';
        slider.style.flex = '1';
        slider.style.cursor = 'pointer';
        
        var valueDisplay = L.DomUtil.create('span', 'opacity-value', sliderContainer);
        valueDisplay.innerHTML = '100%';
        valueDisplay.style.minWidth = '40px';
        valueDisplay.style.fontSize = '12px';
        valueDisplay.style.textAlign = 'right';
        
        this._slider = slider;
        this._valueDisplay = valueDisplay;
        
        // Événement pour changer l'opacité
        L.DomEvent.on(slider, 'input', this._onSliderChange, this);
        
        // Empêcher la propagation des événements
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        
        // Masquer le contrôle par défaut (sera affiché quand un layer géoréférencé est ajouté)
        container.style.display = 'none';
        this._container = container;
        
        return container;
    },

    _onSliderChange: function(e) {
        var opacity = e.target.value / 100;
        this._valueDisplay.innerHTML = e.target.value + '%';
        
        // Changer l'opacité du layer géoréférencé actuel
        if (window.currentGeoreferencedLayer) {
            window.currentGeoreferencedLayer.setOpacity(opacity);
        }
    },
    
    show: function() {
        if (this._container) {
            this._container.style.display = 'block';
        }
    },
    
    hide: function() {
        if (this._container) {
            this._container.style.display = 'none';
        }
    },
    
    reset: function() {
        if (this._slider) {
            this._slider.value = 100;
            this._valueDisplay.innerHTML = '100%';
        }
    },

    onRemove: function() {
        if (this._slider) {
            L.DomEvent.off(this._slider, 'input', this._onSliderChange, this);
        }
    }
});

// Factory function
L.control.opacityControl = function(options) {
    return new L.Control.OpacityControl(options);
};

// Ajouter le contrôle d'opacité à la carte droite
var opacityControl = L.control.opacityControl({
    position: 'topright'
});
right_map.addControl(opacityControl);

// Exposer le contrôle globalement
window.opacityControl = opacityControl;

// Contrôle de métadonnées pour la carte gauche
L.Control.MetadataInfo = L.Control.extend({
    options: {
        position: 'bottomleft'
    },

    onAdd: function(map) {
        var container = L.DomUtil.create('div', 'leaflet-control-metadata-info leaflet-bar leaflet-control');
        
        var button = L.DomUtil.create('a', 'leaflet-control-metadata-button', container);
        button.href = '#';
        button.title = 'Afficher les métadonnées Gallica';
        button.innerHTML = '<span class="fr-icon-file-text-line" aria-hidden="true"></span>';
        
        L.DomEvent.on(button, 'click', this._onClick, this);
        L.DomEvent.disableClickPropagation(button);
        
        this._button = button;
        this._container = container;
        
        // Créer le panneau immédiatement pour qu'il soit disponible
        this._createMetadataPanel();
        
        return container;
    },

    _onClick: function(e) {
        L.DomEvent.preventDefault(e);
        this._toggleMetadataPanel();
    },

    _toggleMetadataPanel: function() {
        // Créer ou afficher/masquer le panneau de métadonnées
        var existingPanel = document.getElementById('metadata-info-panel');
        
        if (existingPanel) {
            if (existingPanel.style.display === 'none') {
                existingPanel.style.display = 'block';
                this._button.classList.add('active');
            } else {
                existingPanel.style.display = 'none';
                this._button.classList.remove('active');
            }
        } else {
            this._createMetadataPanel();
        }
    },

    _createMetadataPanel: function() {
        // Créer le panneau de métadonnées
        var panel = L.DomUtil.create('div', 'metadata-info-panel', document.body);
        panel.id = 'metadata-info-panel';
        panel.style.display = 'none'; // Caché par défaut
        
        var header = L.DomUtil.create('div', 'metadata-panel-header', panel);
        header.innerHTML = `
            <h3 class="fr-h6">Métadonnées Gallica</h3>
            <button class="fr-btn fr-btn--close fr-btn--tertiary-no-outline" onclick="document.getElementById('metadata-info-panel').style.display='none'; document.querySelector('.leaflet-control-metadata-button').classList.remove('active')">
                <span class="fr-icon-close-line" aria-hidden="true"></span>
            </button>
        `;
        
        var content = L.DomUtil.create('div', 'metadata-panel-content', panel);
        content.id = 'metadata-panel-content';
        content.innerHTML = '<p class="fr-text--sm">Chargez une image Gallica pour voir les métadonnées.</p>';
        
        // Empêcher la propagation des événements de clic sur le panneau
        L.DomEvent.disableClickPropagation(panel);
    },

    updateContent: function(metadataHtml) {
        var content = document.getElementById('metadata-panel-content');
        if (content) {
            content.innerHTML = metadataHtml;
        } else {
            console.warn('Élément metadata-panel-content non trouvé');
        }
    }
});

// Initialiser le nouveau système de saisie lorsque le fichier est chargé
document.addEventListener('DOMContentLoaded', function() {
    // Fonction pour initialiser le contrôle de métadonnées
    function initMetadataControl() {
        if (typeof left_map !== 'undefined' && left_map && !window.metadataControl) {
            console.log('Initialisation du contrôle de métadonnées');
            
            // Vérifier que L.Control.MetadataInfo est défini
            if (typeof L !== 'undefined' && L.Control && L.Control.MetadataInfo) {
                var metadataControl = new L.Control.MetadataInfo();
                left_map.addControl(metadataControl);
                
                // Rendre le contrôle disponible globalement
                window.metadataControl = metadataControl;
                return true;
            } else {
                console.warn('⚠️ L.Control.MetadataInfo non encore défini');
                return false;
            }
        }
        return false;
    }
    
    // Essayer d'initialiser immédiatement
    if (!initMetadataControl()) {
        // Si pas encore possible, attendre et réessayer
        let attempts = 0;
        const maxAttempts = 50; // 10 secondes maximum
        
        const retryInterval = setInterval(() => {
            attempts++;
            
            if (initMetadataControl() || attempts >= maxAttempts) {
                clearInterval(retryInterval);
                if (attempts >= maxAttempts) {
                    console.warn('Impossible d\'initialiser le contrôle de métadonnées : carte gauche non disponible');
                }
            }
        }, 200); // Essayer toutes les 200ms
    }
    
});

/**
 * Fonction utilitaire pour s'assurer que le contrôle de métadonnées est disponible
 * Peut être appelée depuis d'autres scripts si nécessaire
 */
window.ensureMetadataControlAvailable = function() {
    return new Promise((resolve, reject) => {
        if (window.metadataControl) {
            resolve(window.metadataControl);
            return;
        }
        
        // Essayer d'initialiser
        if (typeof left_map !== 'undefined' && left_map) {
            console.log('Initialisation forcée du contrôle de métadonnées');
            var metadataControl = new L.Control.MetadataInfo();
            left_map.addControl(metadataControl);
            window.metadataControl = metadataControl;
            resolve(metadataControl);
            return;
        }
        
        // Attendre que la carte soit disponible
        let attempts = 0;
        const maxAttempts = 25; // 5 secondes
        
        const retryInterval = setInterval(() => {
            attempts++;
            
            if (typeof left_map !== 'undefined' && left_map) {
                var metadataControl = new L.Control.MetadataInfo();
                left_map.addControl(metadataControl);
                window.metadataControl = metadataControl;
                clearInterval(retryInterval);
                resolve(metadataControl);
            } else if (attempts >= maxAttempts) {
                clearInterval(retryInterval);
                reject(new Error('Impossible d\'initialiser le contrôle de métadonnées'));
            }
        }, 200);
    });
};

// Fin de l'initialisation différée dans initializeMaps
    // Initialiser les autres composants qui dépendent de Leaflet
    console.log('🎯 Initialisation des composants additionnels');
    
    // Définir le contrôle de métadonnées maintenant que Leaflet est disponible
    if (!L.Control.MetadataInfo) {
        defineMetadataControl();
    }
    
    // Ajouter les autres initialisations ici si nécessaire
    document.dispatchEvent(new CustomEvent('mapsInitialized'));
    
    // Notifier aussi que les layers sont disponibles
    document.dispatchEvent(new CustomEvent('layersInitialized', {
        detail: { 
            layer_img_pts_left, 
            layer_img_pts_right, 
            layer_img_emprise_left,
            left_map,
            right_map
        }
    }));
    
    // Initialiser le système de saisie avancé maintenant que tout est prêt
    setTimeout(function() {
        if (typeof setupAdvancedInputSystem === 'function') {
            console.log('🎯 Initialisation du système de saisie avancé');
            setupAdvancedInputSystem();
        } else {
            console.warn('Système de saisie avancé non disponible. Vérifiez que advanced-input-system.js est chargé.');
        }
    }, 100); // Délai réduit car les variables sont maintenant disponibles
}

/**
 * Définit le contrôle de métadonnées Leaflet
 */
function defineMetadataControl() {
    if (typeof L === 'undefined') {
        console.warn('⚠️ Leaflet non disponible pour définir MetadataControl');
        return;
    }
    
    // Contrôle de métadonnées pour la carte gauche
    L.Control.MetadataInfo = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function(map) {
            var container = L.DomUtil.create('div', 'leaflet-control-metadata-info leaflet-bar leaflet-control');
            
            var button = L.DomUtil.create('a', 'leaflet-control-metadata-button', container);
            button.href = '#';
            button.title = 'Afficher les métadonnées Gallica';
            button.innerHTML = '<span class="fr-icon-file-text-line" aria-hidden="true"></span>';
            
            L.DomEvent.on(button, 'click', this._onClick, this);
            L.DomEvent.disableClickPropagation(button);
            
            this._button = button;
            this._container = container;
            
            return container;
        },

        _onClick: function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (window.metadataDict && Object.keys(window.metadataDict).length > 0) {
                this._showMetadata();
            } else {
                console.log('Aucune métadonnée disponible');
                this._showNoMetadata();
            }
        },

        _showMetadata: function() {
            var metadata = window.metadataDict;
            
            var content = '<h3>Métadonnées Gallica</h3>';
            
            if (metadata.title) {
                content += '<p><strong>Titre :</strong> ' + metadata.title + '</p>';
            }
            
            if (metadata.creator) {
                content += '<p><strong>Créateur :</strong> ' + metadata.creator + '</p>';
            }
            
            if (metadata.date) {
                content += '<p><strong>Date :</strong> ' + metadata.date + '</p>';
            }
            
            if (metadata.description) {
                content += '<p><strong>Description :</strong> ' + metadata.description + '</p>';
            }
            
            if (metadata.source) {
                content += '<p><strong>Source :</strong> <a href="' + metadata.source + '" target="_blank">Voir sur Gallica</a></p>';
            }
            
            this._showModal('Métadonnées', content);
        },

        _showNoMetadata: function() {
            this._showModal('Métadonnées', '<p>Aucune métadonnée disponible pour cette carte.</p>');
        },

        _showModal: function(title, content) {
            // Créer une modale simple
            var modalOverlay = L.DomUtil.create('div', 'metadata-modal-overlay');
            modalOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            var modal = L.DomUtil.create('div', 'metadata-modal', modalOverlay);
            modal.style.cssText = `
                background: white;
                border-radius: 8px;
                padding: 20px;
                max-width: 500px;
                max-height: 70vh;
                overflow-y: auto;
                position: relative;
            `;
            
            var closeButton = L.DomUtil.create('button', 'metadata-modal-close', modal);
            closeButton.innerHTML = '×';
            closeButton.style.cssText = `
                position: absolute;
                top: 10px;
                right: 15px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
            `;
            
            var modalContent = L.DomUtil.create('div', 'metadata-modal-content', modal);
            modalContent.innerHTML = content;
            
            // Fermer la modale
            var closeModal = function() {
                document.body.removeChild(modalOverlay);
            };
            
            L.DomEvent.on(closeButton, 'click', closeModal);
            L.DomEvent.on(modalOverlay, 'click', function(e) {
                if (e.target === modalOverlay) {
                    closeModal();
                }
            });
            
            document.body.appendChild(modalOverlay);
        }
    });
    
    console.log('✅ L.Control.MetadataInfo défini');
}

// Enregistrer l'initialisation avec le nouveau système unifié
if (typeof window.LeafletLoader !== 'undefined') {
    window.LeafletLoader.whenReady(initializeMaps, 'map_interactions_init');
} else if (typeof whenLeafletReady === 'function') {
    // Compatibilité avec l'ancien système
    whenLeafletReady(initializeMaps, 'map_interactions_init');
} else {
    console.warn('⚠️ Système de queue Leaflet non disponible - initialisation directe');
    if (typeof L !== 'undefined') {
        initializeMaps();
    } else {
        console.error('❌ Leaflet non disponible pour initialisation directe');
    }
}
