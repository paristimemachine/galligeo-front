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

// Nouveau système de saisie amélioré
setupAdvancedInputSystem();

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

// =====================================================================
// NOUVEAU SYSTÈME DE SAISIE AMÉLIORÉ - UI/UX OPTIMISÉ
// =====================================================================

// Variables globales pour le nouveau système (définies dans init.js)
// Utilisation des variables window pour assurer la portée globale

// Nouvelle structure pour les points appariés
function ControlPointPair(id, leftPoint = null, rightPoint = null) {
    this.id = id;
    this.leftPoint = leftPoint; // {lat, lng, marker}
    this.rightPoint = rightPoint; // {lat, lng, marker}
    this.isComplete = function() {
        return this.leftPoint !== null && this.rightPoint !== null;
    };
}

function setupAdvancedInputSystem() {
    console.log('Configuration du système de saisie avancé...');
    
    // Supprimer les anciens contrôles Leaflet Draw
    removeOldDrawControls();
    
    // Configurer les événements des contrôles
    setupControlEvents();
    
    // Configurer les événements de clic sur les cartes
    setupMapClickEvents();
    
    // Configurer le survol et déplacement des points
    setupPointInteractions();
    
    // Initialiser l'état
    updateInputState();
    
    console.log('Système de saisie avancé configuré avec succès');
}

// Exposer les fonctions principales au contexte global
window.setupAdvancedInputSystem = setupAdvancedInputSystem;
window.ControlPointPair = ControlPointPair;

function removeOldDrawControls() {
    // Supprimer tous les contrôles de dessin existants
    left_map.eachLayer(function(layer) {
        if (layer instanceof L.Control.Draw) {
            left_map.removeControl(layer);
        }
    });
    
    right_map.eachLayer(function(layer) {
        if (layer instanceof L.Control.Draw) {
            right_map.removeControl(layer);
        }
    });
}

function setupControlEvents() {
    // Événement pour le toggle principal (Saisie/Verrouillé)
    const toggleInput = document.getElementById('toggle');
    if (toggleInput) {
        toggleInput.addEventListener('change', function() {
            window.isInputLocked = this.checked;
            updateInputState();
        });
    }
    
    // Événements pour les contrôles segmentés
    const pointsRadio = document.getElementById('segmented-1');
    const empriseRadio = document.getElementById('segmented-2');
    
    if (pointsRadio) {
        pointsRadio.addEventListener('change', function() {
            if (this.checked && !window.isInputLocked) {
                window.currentInputMode = 'points';
                updateInputState();
            }
        });
    }
    
    if (empriseRadio) {
        empriseRadio.addEventListener('change', function() {
            if (this.checked && !window.isInputLocked) {
                window.currentInputMode = 'emprise';
                updateInputState();
            }
        });
    }
}

function updateInputState() {
    if (window.isInputLocked) {
        window.inputMode = 'disabled';
        setMapCursors('default');
        console.log('Saisie verrouillée');
    } else {
        window.inputMode = window.currentInputMode;
        if (window.inputMode === 'points') {
            setMapCursors('crosshair');
            console.log('Mode saisie points activé');
        } else if (window.inputMode === 'emprise') {
            setMapCursors('crosshair');
            console.log('Mode saisie emprise activé');
        }
    }
    
    // Mettre à jour l'interface
    updateUIForInputMode();
}

function setMapCursors(cursor) {
    left_map.getContainer().style.cursor = cursor;
    right_map.getContainer().style.cursor = cursor;
}

function updateUIForInputMode() {
    // Mise à jour de l'affichage selon le mode actif
    const statusElement = document.getElementById('input-status');
    const helpElement = document.getElementById('input-help');
    
    // Supprimer les classes d'état précédentes
    left_map.getContainer().classList.remove('active-map', 'input-mode-points', 'input-mode-emprise', 'input-disabled');
    right_map.getContainer().classList.remove('active-map', 'input-mode-points', 'input-mode-emprise', 'input-disabled');
    
    if (statusElement) {
        if (inputMode === 'disabled') {
            statusElement.textContent = 'Saisie verrouillée';
            left_map.getContainer().classList.add('input-disabled');
            right_map.getContainer().classList.add('input-disabled');
            
            if (helpElement) {
                helpElement.textContent = 'Désactivez le verrou pour commencer la saisie';
                helpElement.className = 'input-help-message';
            }
        } else if (inputMode === 'points') {
            const completePairs = getCompletePairCount();
            statusElement.textContent = `Saisie de points (${completePairs} paires) - Carte ${activeMap === 'left' ? 'gauche' : 'droite'} active`;
            
            // Ajouter les classes CSS appropriées
            left_map.getContainer().classList.add('input-mode-points');
            right_map.getContainer().classList.add('input-mode-points');
            
            // Marquer la carte active
            if (activeMap === 'left') {
                left_map.getContainer().classList.add('active-map');
            } else {
                right_map.getContainer().classList.add('active-map');
            }
            
            if (helpElement) {
                helpElement.textContent = `Cliquez sur la carte ${activeMap === 'left' ? 'gauche' : 'droite'} pour ajouter un point de contrôle`;
                helpElement.className = 'input-help-message active';
            }
        } else if (inputMode === 'emprise') {
            statusElement.textContent = 'Saisie d\'emprise sur la carte gauche';
            left_map.getContainer().classList.add('input-mode-emprise', 'active-map');
            right_map.getContainer().classList.add('input-disabled');
            
            if (helpElement) {
                const currentPointCount = currentPolygon ? currentPolygon.points.length : 0;
                if (currentPointCount === 0) {
                    helpElement.textContent = 'Cliquez sur la carte gauche pour commencer le polygone d\'emprise';
                } else if (currentPointCount < 3) {
                    helpElement.textContent = `Polygone: ${currentPointCount} points - Ajoutez au moins 3 points`;
                } else {
                    helpElement.textContent = `Polygone: ${currentPointCount} points - Cliquez pour ajouter d'autres points`;
                }
                helpElement.className = 'input-help-message active';
            }
        }
    }
}

function setupMapClickEvents() {
    // Événements de clic pour la carte gauche
    left_map.on('click', function(e) {
        handleMapClick(e, 'left');
    });
    
    // Événements de clic pour la carte droite
    right_map.on('click', function(e) {
        handleMapClick(e, 'right');
    });
    
    // Double-clic pour finaliser l'emprise sur la carte gauche
    left_map.on('dblclick', function(e) {
        if (inputMode === 'emprise' && currentPolygon && currentPolygon.points.length >= 3) {
            finalizeEmprise();
            // Empêcher l'ajout d'un point supplémentaire
            L.DomEvent.stopPropagation(e);
        }
    });
}

function handleMapClick(event, mapSide) {
    if (window.inputMode === 'disabled') return;
    
    const map = mapSide === 'left' ? left_map : right_map;
    const layer = mapSide === 'left' ? layer_img_pts_left : layer_img_pts_right;
    
    if (window.inputMode === 'points') {
        handlePointClick(event, mapSide, map, layer);
    } else if (window.inputMode === 'emprise' && mapSide === 'left') {
        handleEmpriseClick(event, map);
    }
}

function handlePointClick(event, mapSide, map, layer) {
    const latLng = event.latlng;
    
    // Créer un nouveau marqueur
    const marker = L.marker(latLng, {
        icon: new customMarker(),
        draggable: true
    });
    
    // Trouver ou créer la paire de points appropriée
    let pointPair = findOrCreatePointPair();
    
    // Convertir les coordonnées si nécessaire (pour la carte gauche)
    let processedCoords = latLng;
    if (mapSide === 'left') {
        processedCoords = L.latLng(-latLng.lat/10, (latLng.lng / ratio_wh_img) / 10);
    }
    
    // Ajouter le point à la paire
    if (mapSide === 'left') {
        pointPair.leftPoint = {
            lat: processedCoords.lat,
            lng: processedCoords.lng,
            marker: marker,
            originalCoords: latLng
        };
    } else {
        pointPair.rightPoint = {
            lat: latLng.lat,
            lng: latLng.lng,
            marker: marker,
            originalCoords: latLng
        };
    }
    
    // Configurer le tooltip avec le numéro
    marker.bindTooltip(pointPair.id.toString(), {
        permanent: true,
        direction: 'auto',
        className: "labels-points"
    });
    
    // Ajouter le marqueur à la carte
    layer.addLayer(marker);
    
    // Configurer les événements de drag
    setupMarkerDragEvents(marker, pointPair, mapSide);
    
    // Mettre à jour la table des points de contrôle
    updateControlPointsTable();
    
    // Alterner automatiquement la carte active
    switchActiveMap();
    
    // Vérifier si le géoréférencement peut être activé
    checkGeoreferencingAvailability();
    
    console.log(`Point ${pointPair.id} ajouté sur la carte ${mapSide}:`, processedCoords);
}

function findOrCreatePointPair() {
    // Chercher une paire incomplète
    let incompletePair = window.pointPairs.find(pair => !pair.isComplete());
    
    if (!incompletePair) {
        // Créer une nouvelle paire
        window.pointCounter++;
        incompletePair = new ControlPointPair(window.pointCounter);
        window.pointPairs.push(incompletePair);
    }
    
    return incompletePair;
}

function switchActiveMap() {
    // Alterner entre les cartes pour faciliter la saisie
    if (window.activeMap === 'left') {
        window.activeMap = 'right';
    } else {
        window.activeMap = 'left';
    }
    
    updateUIForInputMode();
}

function setupMarkerDragEvents(marker, pointPair, mapSide) {
    marker.on('dragstart', function() {
        window.isDragging = true;
    });
    
    marker.on('dragend', function(e) {
        window.isDragging = false;
        const newLatLng = e.target.getLatLng();
        
        // Mettre à jour les coordonnées dans la paire
        let processedCoords = newLatLng;
        if (mapSide === 'left') {
            processedCoords = L.latLng(-newLatLng.lat/10, (newLatLng.lng / ratio_wh_img) / 10);
        }
        
        if (mapSide === 'left' && pointPair.leftPoint) {
            pointPair.leftPoint.lat = processedCoords.lat;
            pointPair.leftPoint.lng = processedCoords.lng;
            pointPair.leftPoint.originalCoords = newLatLng;
        } else if (mapSide === 'right' && pointPair.rightPoint) {
            pointPair.rightPoint.lat = newLatLng.lat;
            pointPair.rightPoint.lng = newLatLng.lng;
            pointPair.rightPoint.originalCoords = newLatLng;
        }
        
        // Mettre à jour la table
        updateControlPointsTable();
        
        console.log(`Point ${pointPair.id} déplacé sur la carte ${mapSide}:`, processedCoords);
    });
    
    // Événement de survol pour indiquer que le point peut être déplacé
    marker.on('mouseover', function() {
        if (!window.isDragging) {
            marker.getElement().style.cursor = 'move';
        }
    });
    
    marker.on('mouseout', function() {
        if (!window.isDragging) {
            marker.getElement().style.cursor = 'pointer';
        }
    });
}

function handleEmpriseClick(event, map) {
    // Logique pour la saisie d'emprise (polygone fermé)
    if (!window.currentPolygon) {
        // Commencer un nouveau polygone
        window.currentPolygon = {
            points: [],
            layer: null,
            tempLayer: null
        };
    }
    
    const latLng = event.latlng;
    window.currentPolygon.points.push(latLng);
    
    // Supprimer les anciens layers temporaires
    if (window.currentPolygon.layer) {
        layer_img_emprise_left.removeLayer(window.currentPolygon.layer);
    }
    if (window.currentPolygon.tempLayer) {
        layer_img_emprise_left.removeLayer(window.currentPolygon.tempLayer);
    }
    
    if (window.currentPolygon.points.length === 1) {
        // Premier point - juste afficher un marqueur temporaire
        window.currentPolygon.tempLayer = L.circleMarker(latLng, {
            color: POLYGON_STROKE_COLOR,
            radius: 5,
            weight: 2
        });
        layer_img_emprise_left.addLayer(window.currentPolygon.tempLayer);
        
    } else if (window.currentPolygon.points.length === 2) {
        // Deuxième point - afficher une ligne
        window.currentPolygon.tempLayer = L.polyline(window.currentPolygon.points, {
            color: POLYGON_STROKE_COLOR,
            weight: 2,
            dashArray: '5, 5'
        });
        layer_img_emprise_left.addLayer(window.currentPolygon.tempLayer);
        
    } else if (window.currentPolygon.points.length >= 3) {
        // Trois points ou plus - créer un polygone fermé
        const closedPoints = [...window.currentPolygon.points];
        
        // Fermer automatiquement le polygone si on a au moins 3 points
        window.currentPolygon.layer = L.polygon(closedPoints, {
            fillColor: POLYGON_FILL_COLOR,
            color: POLYGON_STROKE_COLOR,
            weight: 3,
            fillOpacity: 0.2
        });
        
        layer_img_emprise_left.addLayer(window.currentPolygon.layer);
        
        // Rendre le polygone éditable
        if (window.currentPolygon.layer.editing) {
            window.currentPolygon.layer.editing.enable();
        }
        
        // Convertir pour les données
        updatePolygonData();
        
        console.log('Polygone d\'emprise créé avec', window.currentPolygon.points.length, 'points');
    }
    
    // Mettre à jour l'interface
    updateUIForInputMode();
}

function updatePolygonData() {
    if (!currentPolygon || currentPolygon.points.length < 3) return;
    
    const polygonArray = [];
    currentPolygon.points.forEach(function(point) {
        const convertedPoint = L.latLng(-point.lat/10, (point.lng / ratio_wh_img) / 10);
        polygonArray.push([convertedPoint.lng, convertedPoint.lat]);
    });
    
    // Fermer le polygone
    polygonArray.push(polygonArray[0]);
    
    // Convertir en format attendu
    const polyJson = [];
    polygonArray.forEach((pt, i) => {
        polyJson.push(new PointCrop(pt[1], pt[0]));
    });
    
    list_points_polygon_crop = polyJson;
    console.log('Données polygone mises à jour:', list_points_polygon_crop);
}

function updateControlPointsTable() {
    const tableBody = document.getElementById('table_body');
    if (!tableBody) return;
    
    // Vider la table
    tableBody.innerHTML = '';
    
    // Remplir avec les paires complètes
    pointPairs.forEach(pair => {
        if (pair.isComplete()) {
            const row = document.createElement('tr');
            
            // Cellule pour le point gauche (image)
            const leftCell = document.createElement('td');
            const leftCoords = `(${pair.leftPoint.lat.toFixed(6)}, ${pair.leftPoint.lng.toFixed(6)})`;
            leftCell.textContent = leftCoords;
            row.appendChild(leftCell);
            
            // Cellule pour le point droit (géo)
            const rightCell = document.createElement('td');
            const rightCoords = `(${pair.rightPoint.lat.toFixed(6)}, ${pair.rightPoint.lng.toFixed(6)})`;
            rightCell.textContent = rightCoords;
            row.appendChild(rightCell);
            
            tableBody.appendChild(row);
        }
    });
    
    // Mettre à jour les données pour l'API
    updateGeoreferencingData();
    
    // Afficher la table si elle contient des données
    const tableContainer = document.getElementById('table-control-points');
    if (tableContainer && pointPairs.some(pair => pair.isComplete())) {
        tableContainer.hidden = false;
    }
}

function updateGeoreferencingData() {
    // Mettre à jour list_georef_points pour l'API
    list_georef_points = [];
    
    pointPairs.forEach(pair => {
        if (pair.isComplete()) {
            const pointAB = new PointA_PointB(
                new Point({ lat: pair.leftPoint.lat, lng: pair.leftPoint.lng }),
                new Point({ lat: pair.rightPoint.lat, lng: pair.rightPoint.lng })
            );
            list_georef_points.push(pointAB);
        }
    });
    
    // Mettre à jour le compteur global pour compatibilité
    count_points = pointPairs.filter(pair => pair.isComplete()).length;
    
    console.log('Données de géoréférencement mises à jour:', list_georef_points);
}

function checkGeoreferencingAvailability() {
    const completePairs = pointPairs.filter(pair => pair.isComplete()).length;
    
    if (completePairs >= 3) {
        // Utiliser la fonction dédiée pour gérer l'état du bouton
        if (typeof setGeoreferencingButtonState === 'function') {
            if (window.ptmAuth && window.ptmAuth.isAuthenticated()) {
                setGeoreferencingButtonState('normal', 'Géoréférencer', 'Géoréférencer cette carte');
            } else {
                setGeoreferencingButtonState('disabled', 'Géoréférencer', 'Connectez-vous pour utiliser le géoréférencement');
            }
        } else {
            // Fallback vers l'ancienne méthode si la fonction n'est pas disponible
            if (window.ptmAuth && window.ptmAuth.isAuthenticated()) {
                document.getElementById('btn_georef').disabled = false;
            } else {
                console.log('Géoréférencement nécessite une connexion utilisateur');
                document.getElementById('btn_georef').disabled = true;
                document.getElementById('btn_georef').title = 'Connectez-vous pour utiliser le géoréférencement';
            }
        }
    }
    
    // Mettre à jour l'état général des boutons
    if (typeof updateButtonsForAuth === 'function') {
        updateButtonsForAuth();
    }
}

function updatePolygonData() {
    if (!currentPolygon || currentPolygon.points.length < 3) return;
    
    const polygonArray = [];
    currentPolygon.points.forEach(function(point) {
        const convertedPoint = L.latLng(-point.lat/10, (point.lng / ratio_wh_img) / 10);
        polygonArray.push([convertedPoint.lng, convertedPoint.lat]);
    });
    
    // Fermer le polygone
    polygonArray.push(polygonArray[0]);
    
    // Convertir en format attendu
    const polyJson = [];
    polygonArray.forEach((pt, i) => {
        polyJson.push(new PointCrop(pt[1], pt[0]));
    });
    
    list_points_polygon_crop = polyJson;
    console.log('Données polygone mises à jour:', list_points_polygon_crop);
}

function updateUIForInputMode() {
    // Mise à jour de l'affichage selon le mode actif
    const statusElement = document.getElementById('input-status');
    const helpElement = document.getElementById('input-help');
    
    // Supprimer les classes d'état précédentes
    left_map.getContainer().classList.remove('active-map', 'input-mode-points', 'input-mode-emprise', 'input-disabled');
    right_map.getContainer().classList.remove('active-map', 'input-mode-points', 'input-mode-emprise', 'input-disabled');
    
    if (statusElement) {
        if (inputMode === 'disabled') {
            statusElement.textContent = 'Saisie verrouillée';
            left_map.getContainer().classList.add('input-disabled');
            right_map.getContainer().classList.add('input-disabled');
            
            if (helpElement) {
                helpElement.textContent = 'Désactivez le verrou pour commencer la saisie';
                helpElement.className = 'input-help-message';
            }
        } else if (inputMode === 'points') {
            const completePairs = getCompletePairCount();
            statusElement.textContent = `Saisie de points (${completePairs} paires) - Carte ${activeMap === 'left' ? 'gauche' : 'droite'} active`;
            
            // Ajouter les classes CSS appropriées
            left_map.getContainer().classList.add('input-mode-points');
            right_map.getContainer().classList.add('input-mode-points');
            
            // Marquer la carte active
            if (activeMap === 'left') {
                left_map.getContainer().classList.add('active-map');
            } else {
                right_map.getContainer().classList.add('active-map');
            }
            
            if (helpElement) {
                helpElement.textContent = `Cliquez sur la carte ${window.activeMap === 'left' ? 'gauche' : 'droite'} pour ajouter un point de contrôle`;
                helpElement.className = 'input-help-message active';
            }
        } else if (window.inputMode === 'emprise') {
            statusElement.textContent = 'Saisie d\'emprise sur la carte gauche';
            left_map.getContainer().classList.add('input-mode-emprise', 'active-map');
            right_map.getContainer().classList.add('input-disabled');
            
            if (helpElement) {
                const currentPointCount = window.currentPolygon ? window.currentPolygon.points.length : 0;
                if (currentPointCount === 0) {
                    helpElement.textContent = 'Cliquez sur la carte gauche pour commencer le polygone d\'emprise';
                } else if (currentPointCount < 3) {
                    helpElement.textContent = `Polygone: ${currentPointCount} points - Ajoutez au moins 3 points`;
                } else {
                    helpElement.textContent = `Polygone: ${currentPointCount} points - Cliquez pour ajouter d\'autres points`;
                }
                helpElement.className = 'input-help-message active';
            }
            }
        }
    }
}

function updateGeoreferencingData() {
    // Mettre à jour list_georef_points pour l'API
    list_georef_points = [];
    
    pointPairs.forEach(pair => {
        if (pair.isComplete()) {
            const pointAB = new PointA_PointB(
                new Point({ lat: pair.leftPoint.lat, lng: pair.leftPoint.lng }),
                new Point({ lat: pair.rightPoint.lat, lng: pair.rightPoint.lng })
            );
            list_georef_points.push(pointAB);
        }
    });
    
    // Mettre à jour le compteur global pour compatibilité
    count_points = pointPairs.filter(pair => pair.isComplete()).length;
    
    console.log('Données de géoréférencement mises à jour:', list_georef_points);
}

function checkGeoreferencingAvailability() {
    const completePairs = pointPairs.filter(pair => pair.isComplete()).length;
    
    if (completePairs >= 3) {
        // Utiliser la fonction dédiée pour gérer l'état du bouton
        if (typeof setGeoreferencingButtonState === 'function') {
            if (window.ptmAuth && window.ptmAuth.isAuthenticated()) {
                setGeoreferencingButtonState('normal', 'Géoréférencer', 'Géoréférencer cette carte');
            } else {
                setGeoreferencingButtonState('disabled', 'Géoréférencer', 'Connectez-vous pour utiliser le géoréférencement');
            }
        } else {
            // Fallback vers l'ancienne méthode si la fonction n'est pas disponible
            if (window.ptmAuth && window.ptmAuth.isAuthenticated()) {
                document.getElementById('btn_georef').disabled = false;
            } else {
                console.log('Géoréférencement nécessite une connexion utilisateur');
                document.getElementById('btn_georef').disabled = true;
                document.getElementById('btn_georef').title = 'Connectez-vous pour utiliser le géoréférencement';
            }
        }
    }
    
    // Mettre à jour l'état général des boutons
    if (typeof updateButtonsForAuth === 'function') {
        updateButtonsForAuth();
    }
}

function setupPointInteractions() {
    // Cette fonction sera appelée pour configurer les interactions avancées
    // comme le survol et le déplacement des points
    console.log('Interactions des points configurées');
}

// Fonction pour réinitialiser la saisie
function resetInputSystem() {
    // Supprimer tous les marqueurs
    pointPairs.forEach(pair => {
        if (pair.leftPoint && pair.leftPoint.marker) {
            layer_img_pts_left.removeLayer(pair.leftPoint.marker);
        }
        if (pair.rightPoint && pair.rightPoint.marker) {
            layer_img_pts_right.removeLayer(pair.rightPoint.marker);
        }
    });
    
    // Supprimer le polygone
    if (currentPolygon && currentPolygon.layer) {
        layer_img_emprise_left.removeLayer(currentPolygon.layer);
    }
    
    // Réinitialiser les variables
    pointPairs = [];
    pointCounter = 0;
    currentPolygon = null;
    activeMap = 'left';
    list_georef_points = [];
    list_points_polygon_crop = [];
    
    // Réinitialiser l'interface
    updateControlPointsTable();
    updateUIForInputMode();
    
    console.log('Système de saisie réinitialisé');
}

// Fonction pour obtenir le nombre de paires complètes
function getCompletePairCount() {
    return pointPairs.filter(pair => pair.isComplete()).length;
}

// =====================================================================
// FIN DU NOUVEAU SYSTÈME DE SAISIE
// =====================================================================

// conversion d'un layer Polygon Leaflet en WKT
// function polygonToWKT(layer) {
//     const ring = layer.getLatLngs()[0];
//     const coords = ring.map(p => {
//         const convertedPoint = L.latLng(-p.lat/10, (p.lng / ratio_wh_img) / 10);
//         return `${convertedPoint.lng} ${convertedPoint.lat}`;
//     }).join(', ');
//     return `POLYGON((${coords}))`;
// }

// const provider = new window.GeoSearch.OpenStreetMapProvider();
// //     const search = new GeoSearch.GeoSearchControl({
// //       provider: provider,
// //       style: 'bar', //can be also button
// //       updateMap: true,
// //       autoClose: true,
// //       autoComplete: true, // optional: true|false  - default true
// //       autoCompleteDelay: 250, // optional: number      - default 250
// //     }).addTo(right_map);

// // const search = new GeoSearch.GeoSearchControl({
// //     provider: provider, // required
// //     style: 'bar', // optional: bar|button  - default button
// // }).addTo(right_map);

// const search = new GeoSearch.GeoSearchControl({
//     provider: new GeoSearch.OpenStreetMapProvider(),
//   });

// right_map.addControl(search);

// Fonctions utilitaires pour le nouveau système de saisie

/**
 * Fonction pour supprimer un point spécifique
 * @param {number} pointId - ID du point à supprimer
 */
function removeControlPoint(pointId) {
    const pairIndex = pointPairs.findIndex(pair => pair.id === pointId);
    if (pairIndex === -1) return;
    
    const pair = pointPairs[pairIndex];
    
    // Supprimer les marqueurs des cartes
    if (pair.leftPoint && pair.leftPoint.marker) {
        layer_img_pts_left.removeLayer(pair.leftPoint.marker);
    }
    if (pair.rightPoint && pair.rightPoint.marker) {
        layer_img_pts_right.removeLayer(pair.rightPoint.marker);
    }
    
    // Supprimer la paire de la liste
    pointPairs.splice(pairIndex, 1);
    
    // Mettre à jour l'interface
    updateControlPointsTable();
    checkGeoreferencingAvailability();
    
    console.log(`Point de contrôle ${pointId} supprimé`);
}

/**
 * Fonction pour supprimer tous les points
 */
function clearAllControlPoints() {
    resetInputSystem();
}

/**
 * Fonction pour supprimer l'emprise
 */
function clearEmprise() {
    if (currentPolygon) {
        if (currentPolygon.layer) {
            layer_img_emprise_left.removeLayer(currentPolygon.layer);
        }
        if (currentPolygon.tempLayer) {
            layer_img_emprise_left.removeLayer(currentPolygon.tempLayer);
        }
        currentPolygon = null;
    }
    
    list_points_polygon_crop = [];
    updateUIForInputMode();
    console.log('Emprise supprimée');
}

/**
 * Fonction pour finaliser l'emprise actuelle
 */
function finalizeEmprise() {
    if (currentPolygon && currentPolygon.points.length >= 3) {
        // Forcer la fermeture du polygone
        updatePolygonData();
        console.log('Emprise finalisée avec', currentPolygon.points.length, 'points');
        return true;
    }
    return false;
}

/**
 * Fonction pour vérifier l'égalité des points sur les deux cartes
 */
function validatePointParity() {
    const leftPointsCount = pointPairs.filter(pair => pair.leftPoint !== null).length;
    const rightPointsCount = pointPairs.filter(pair => pair.rightPoint !== null).length;
    const completePairsCount = pointPairs.filter(pair => pair.isComplete()).length;
    
    return {
        leftPoints: leftPointsCount,
        rightPoints: rightPointsCount,
        completePairs: completePairsCount,
        isValid: leftPointsCount === rightPointsCount && completePairsCount >= 3
    };
}

/**
 * Fonction pour exporter les données de géoréférencement
 */
function exportGeoreferencingData() {
    const validation = validatePointParity();
    
    if (!validation.isValid) {
        console.warn('Données de géoréférencement non valides:', validation);
        return null;
    }
    
    return {
        points: list_georef_points,
        polygon: list_points_polygon_crop,
        pointCount: validation.completePairs
    };
}
