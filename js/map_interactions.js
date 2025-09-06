// var cloneLayer = require('leaflet-clonelayer');
// import { OpenStreetMapProvider } from 'leaflet-geosearch';

const POLYGON_FILL_COLOR = 'rgba(255, 0, 0, 0)';
const POLYGON_STROKE_COLOR = 'rgba(0, 55, 255)';

var left_map = L.map('map-left', {
    center: [47, 2],
    zoomSnap: 0.1,
    zoomDelta: 0.25,
    zoom: 6.2,
    // laoding control
    loadingControl: true,
    // Activer la rotation avec le plugin leaflet-rotate
    rotate: true,
    bearing: 0
});

var right_map = L.map('map-right', {
    center: [47, 2],
    zoomSnap: 0.1,
    zoomDelta: 0.25,
    zoom: 6.2,
    // laoding control
    loadingControl: true
});

var customMarker= L.Icon.extend({
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

    var loadingControl = L.Control.loading({
        separate: true
    });
    map.addControl(loadingControl);

    return { points: drawnItems, emprise: drawnItemsEmprise };
}

function add_wms_layers(map) {

    //available layers

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
    baseLayers['Humanitarian'].addTo(map);

    map.zoomControl.setPosition('topright');

    var layerControl = L.control.layers(baseLayers, overlays, {collapsed:true, position: 'topright'})
    layerControl.addTo(map);

    L.Control.geocoder().addTo(map);

    var loadingControl = L.Control.loading({
        separate: true,
        position: 'topright'
    });
    map.addControl(loadingControl);
    
    return drawnItems;
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
            var metadataControl = new L.Control.MetadataInfo();
            left_map.addControl(metadataControl);
            
            // Rendre le contrôle disponible globalement
            window.metadataControl = metadataControl;
            return true;
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
    
    // Initialiser le système de saisie avancé
    setTimeout(function() {
        if (typeof setupAdvancedInputSystem === 'function') {
            setupAdvancedInputSystem();
        } else {
            console.warn('Système de saisie avancé non disponible. Vérifiez que advanced-input-system.js est chargé.');
        }
    }, 1000);
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
