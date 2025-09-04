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
add_draw_on_leaflet(left_map,  layer_img_pts_left, layer_img_emprise_left);
var layer_img_pts_right = add_wms_layers(right_map);
add_draw_on_leaflet(right_map, layer_img_pts_right);

// Ajouter le contrôle rose des vents uniquement à la carte gauche
var compassControl = L.control.compassRotation({
    position: 'bottomright'
});
left_map.addControl(compassControl);

//disabled draw button
activateDrawButton(false);

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

function add_draw_on_leaflet(map, drawnItems, empriseItems = drawnItems) {
    var drawToolBarPosition = 'topleft';

    if( map == left_map ) {
        drawToolBarPosition = 'topright';
    }
    if( map == right_map ) {
        drawToolBarPosition = 'topleft';
    }

    // console.log(drawToolBarPosition);

    // définir l'ordre des boutons selon la carte
    const drawOptions = map === left_map
        ? {
            marker: {
                icon: new customMarker()
            },
            polygon: true,
            polyline: false,
            rectangle: false,
            circle: false,
            circlemarker: false
        }
        : {
            polygon: false,
            marker: {
                icon: new customMarker()
            },
            polyline: false,
            rectangle: false,
            circle: false,
            circlemarker: false
        };

    var drawControl = new L.Control.Draw({
        position: drawToolBarPosition,
        draw: drawOptions,
        edit: {
            featureGroup: drawnItems
        }
    });

    L.drawLocal.draw.toolbar.buttons.marker = "Saisir des points de contrôle";
    L.drawLocal.draw.toolbar.buttons.polygon = "Saisir une emprise";
    
    map.addControl(drawControl);

    map.on(L.Draw.Event.DELETED, function (event) {
        var layer = event.layer;
        
        console.log("del point " + layer);
    });

    //event on toolbar
    let lastPolygon = null;

    map.on(L.Draw.Event.CREATED, function (event) {
        var type  = event.layerType,
            layer = event.layer;

        console.log(type);

        if (type === 'marker') {
            var latlong = layer.getLatLng();

            // Ajout du log lors de la saisie d'un point
            console.log('Point saisi:', latlong.lat, latlong.lng);

            //write in table
            tablebody = document.getElementById('table_body')

            //has to be the first point
            if( map === left_map & first_gallimap_clicked == false) {
                
                const row = document.createElement("tr");
                temp_row = row;
                randomColor = Math.floor(Math.random()*16777215).toString(16);

                //point A is % on img
                // on y = report from a 10 ratio in degrees
                // on x report from the wh ratio to 10, then %
                //console.log(-latlong.lat/10)
                //console.log(latlong.lng/10)
                //console.log(ratio_wh_img)
                var latlong_percent = L.latLng(-latlong.lat/10, (latlong.lng / ratio_wh_img) / 10);

                pointA_temp = new Point(latlong_percent);

                layer.bindTooltip(count_points.toString(),
                                { //specific number, {
                                permanent : true,
                                direction : 'auto',
                                className : "labels-points"
                            }
                            );

                drawnItems.addLayer(layer);

                // document.querySelector('#georef_points').innerHTML += '(' + count_points + ') : ' + '(img)' + latlong_percent;

                document.getElementById('table-control-points').hidden = false;

                first_gallimap_clicked = !first_gallimap_clicked;

                const cell1 = document.createElement("td");
                const cellText1 = document.createTextNode(latlong_percent);
                cell1.appendChild(cellText1);
                row.appendChild(cell1);
                tablebody.appendChild(row);
            
            }

            if( map === right_map & first_gallimap_clicked == true) {

                var pointa_pointb_temp = new PointA_PointB(pointA_temp, new Point(latlong));

                list_georef_points.push(pointa_pointb_temp);

                layer.bindTooltip(count_points.toString(),
                                { //specific number, {
                                permanent : true,
                                direction : 'auto',
                                // className : "my-labels"
                            }
                            );

                drawnItems.addLayer(layer);

                // document.querySelector('#georef_points').innerHTML += ' --> ' + '(geo)' + latlong + '\n';

                first_gallimap_clicked = !first_gallimap_clicked;
                count_points++;

                const cell2 = document.createElement("td");
                const cellText2 = document.createTextNode(latlong);
                cell2.appendChild(cellText2);
                temp_row.appendChild(cell2);
                
                tablebody.appendChild(temp_row);

            }

            if(count_points>=3) {
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

        if (type === 'polygon' && map === left_map) {
            if (lastPolygon) empriseItems.removeLayer(lastPolygon);
            empriseItems.addLayer(layer);
            layer.setStyle({
                fillColor: POLYGON_FILL_COLOR,
                color:     POLYGON_STROKE_COLOR
            });
            if (layer.editing) layer.editing.enable();

            // log polygon -> WKT
            // console.log('Polygon WKT:', polygonToWKT(layer));

            // the polygon layer converted in an array of tuple
            var polygon = layer.getLatLngs()[0];
            var polygonArray = [];
            polygon.forEach(function (point) {
                var convertedPoint = L.latLng(-point.lat/10, (point.lng / ratio_wh_img) / 10);
                polygonArray.push([convertedPoint.lng, convertedPoint.lat]);
            });
            // add the first point to the end of the array
            polygonArray.push(polygonArray[0]);
            console.log(polygonArray);
            // console.log('Polygon:', polygonArray);
            // console.log('Polygon:', polygon);

            // convert polygonArray to json
            // Convert polygonArray to JSON with index keys
            // var polygonJson = {};
            // polygonArray.forEach((point, index) => {
            //    polygonJson[index] = {
            //        long: point[0],
            //        lat: point[1]
            //    };
            //});

            // const polyJson = {}
            // arr.forEach((pt, i) => { polyJson[i] = { long: pt[0], lat: pt[1] }; });
            const polyJson = [];
            polygonArray.forEach((pt, i) => { polyJson.push(new PointCrop(pt[1], pt[0]))});
            list_points_polygon_crop =  polyJson
            console.log('Vertex ajouté, poly JSON:', list_points_polygon_crop );


            lastPolygon = layer;
        }
        
    });
    
    // map.on('draw.edited', function (event) {
    //     var layers = event.layers;
        
    //     console.log('Event edit');

    //     layers.eachLayer(function (layer) {
    //         if (layer instanceof L.Polygon && map === left_map) {
    //             // Update lastPolygon reference if needed
    //             lastPolygon = layer;
                
    //             console.log('Polygon edited:', layer);


    //             // the polygon layer converted in an array of tuple
    //             var polygon = layer.getLatLngs()[0];
    //             var polygonArray = [];
    //             polygon.forEach(function (point) {
    //                 var convertedPoint = L.latLng(-point.lat/10, (point.lng / ratio_wh_img) / 10);
    //                 polygonArray.push([convertedPoint.lng, convertedPoint.lat]);
    //             });
    //             // add the first point to the end of the array
    //             polygonArray.push(polygonArray[0]);
    //             // console.log('Edited Polygon Array:', polygonArray);
                
    //             // Convert polygonArray to JSON with index keys
    //             var polygonJson = {};
    //             polygonArray.forEach((point, index) => {
    //                 polygonJson[index] = {
    //                     lat: point[1],
    //                     lng: point[0]
    //                 };
    //             });
    //             list_points_polygon_crop =  JSON.stringify(polygonJson)
    //             console.log('Edited Polygon JSON:', JSON.stringify(polygonJson));
    //         }
    //     });
    // });

    // capture de l'ajout de sommets en cours de dessin
    map.on(L.Draw.Event.DRAWVERTEX, function (event) {
        if (map === left_map) {
            // à ce stade, lastPolygon n'est pas encore défini : on récupère via event.layer
            const layer = event.layer || lastPolygon;
            if (!layer) return;
            const coords = layer.getLatLngs()[0];
            const arr = [];
            coords.forEach(pt => {
                const c = L.latLng(-pt.lat/10, (pt.lng/ratio_wh_img)/10);
                arr.push([c.lng, c.lat]);
            });
            arr.push(arr[0]);
            // const polyJson = {}
            // arr.forEach((pt, i) => { polyJson[i] = { long: pt[0], lat: pt[1] }; });
            const polyJson = [];
            // arr.forEach((pt, i) => { polyJson.push({ long: pt[0], lat: pt[1] }) });
            polygonArray.forEach((pt, i) => { polyJson.push(new PointCrop(pt[1], pt[0]))});
            list_points_polygon_crop =  polyJson
            console.log('Vertex ajouté, poly JSON:', list_points_polygon_crop );
        }
    });

    // capture des modifications de sommets lors de l'édition
    map.on(L.Draw.Event.EDITVERTEX, function (event) {
        if (lastPolygon && map === left_map) {
            const coords = lastPolygon.getLatLngs()[0];
            const arr = [];
            coords.forEach(pt => {
                const c = L.latLng(-pt.lat/10, (pt.lng/ratio_wh_img)/10);
                arr.push([c.lng, c.lat]);
            });
            arr.push(arr[0]);
            // const polyJson = {}
            // arr.forEach((pt, i) => { polyJson[i] = { long: pt[0], lat: pt[1] }; });
            const polyJson = [];
            // arr.forEach((pt, i) => { polyJson.push({ long: pt[0], lat: pt[1] }) });
            polygonArray.forEach((pt, i) => { polyJson.push(new PointCrop(pt[1], pt[0]))});
            list_points_polygon_crop =  polyJson
            console.log('Vertex ajouté, poly JSON:', list_points_polygon_crop );
        }
    });

}

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

function activateDrawButton(state) {
    //get button draw control
    var buttons_marker = document.getElementsByClassName("leaflet-draw-draw-marker");
    var buttons_polygon = document.getElementsByClassName("leaflet-draw-draw-polygon");

    for (let index1 = 0; index1 < buttons_marker.length; index1++) {
        button = buttons_marker[index1];
        if (state) {
            // enable button
            button.onClick = null;
            button.className = "leaflet-draw-draw-marker leaflet-draw-toolbar-button-enabled";
        } else {
            // disable button
            button.onClick = "preventEventDefault(); return false";
            button.className = "leaflet-draw-draw-marker draw-control-disabled";
        }
    }

    for (let index2 = 0; index2 < buttons_polygon.length; index2++) {
        button = buttons_polygon[index2];
        if (state) {
            // enable button
            button.onClick = null;
            button.className = "leaflet-draw-draw-polygon leaflet-draw-toolbar-button-enabled";
        } else {
            // disable button
            button.onClick = "preventEventDefault(); return false";
            button.className = "leaflet-draw-draw-polygon draw-control-disabled";
        }
    }
}
