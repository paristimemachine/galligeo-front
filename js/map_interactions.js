// var cloneLayer = require('leaflet-clonelayer');
// import { OpenStreetMapProvider } from 'leaflet-geosearch';

var left_map = L.map('map-left', {
    center: [47, 2],
    zoomSnap: 0.1,
    zoomDelta: 0.25,
    zoom: 6.2,
});

var right_map = L.map('map-right', {
    center: [47, 2],
    zoomSnap: 0.1,
    zoomDelta: 0.25,
    zoom: 6.2,
    // Tell the map to use a loading control
    loadingControl: true
});

var customMarker= L.Icon.extend({
    options: {
        shadowUrl: null,
        iconAnchor: new L.Point(12, 12),
        iconSize: new L.Point(24, 24),
        iconUrl: "https://icons.getbootstrap.com/assets/icons/x.svg",
    }
});

var layer_img_pts_left = add_neutral_control_layer(left_map);
add_draw_on_leaflet(left_map, layer_img_pts_left);
var layer_img_pts_right = add_wms_layers(right_map);
add_draw_on_leaflet(right_map, layer_img_pts_right);

//disabled draw button
activateDrawButton(false);

function add_neutral_control_layer(map) {

    var drawnItems = new L.FeatureGroup();
    var drawnItemsEmprise = new L.FeatureGroup();
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

    return drawnItems;
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

    var IGN_Plan_actuel = L.tileLayer.wms('https://wxs.ign.fr/cartes/geoportail/r/wms?', {
        layers: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
        maxZoom: 21,
        attribution : 'IGN'
    });

    var IGN_Scan1950_Histo = L.tileLayer.wms('https://wxs.ign.fr/cartes/geoportail/r/wms?', {
        layers: 'GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN50.1950',
        maxZoom: 21,
        attribution : 'IGN'
    });

    var IGN_EtatMajor40 = L.tileLayer.wms('https://wxs.ign.fr/cartes/geoportail/r/wms?', {
        layers: 'GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40',
        maxZoom: 21,
        attribution : 'IGN'
    });

    var Ehess_IGN_Cassini = L.tileLayer.wms('https://ws.sogefi-web.com/wms?', {
        layers: 'Carte_Cassini',
        maxZoom: 21,
        attribution : 'EHESS/IGN/SOGEFI'
    });

    var baseLayers = {
        "Humanitarian" : OpenStreetMap_HOT,
        "Black" : OpenStreetMap_BLK,
        "OpenTopoMap" : OpenTopoMap,
        "Plan IGN" : IGN_Plan_actuel,
        "IGN Scan50 Histo" : IGN_Scan1950_Histo,
        "IGN Etat-Major 40" : IGN_EtatMajor40,
        "Carte de Cassini" : Ehess_IGN_Cassini,
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
    
    return drawnItems;
}

function add_draw_on_leaflet(map, drawnItems) {

    var drawToolBarPosition = 'topleft';

    if( map == left_map ) {
        drawToolBarPosition = 'topright';
    }
    if( map == right_map ) {
        drawToolBarPosition = 'topleft';
    }

    // console.log(drawToolBarPosition);

    var drawControl = new L.Control.Draw({
        position: drawToolBarPosition,
        draw: {
            polygon: true,
            marker: {
                icon: new customMarker()
            },
            polyline : false,
            rectangle : false,
            circle : false,
            circlemarker : false
            },
        edit: {
            featureGroup: drawnItems,

        }
    });

    L.drawLocal.draw.toolbar.buttons.polygon = "Saisir une emprise";
    L.drawLocal.draw.toolbar.buttons.marker = "Saisir des points de contrôle";
    map.addControl(drawControl);

    map.on(L.Draw.Event.DELETED, function (event) {
        var layer = event.layer;
        
        console.log("del point " + layer);
    });

    //event on toolbar
    map.on(L.Draw.Event.CREATED, function (event) {
        
        var type = event.layerType,
        layer = event.layer;

        console.log(type);
        
        if (type === 'marker') {
            // Do marker specific actions for markers
            // console.log(latlong);
            var latlong = layer.getLatLng();
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
                document.getElementById('btn_georef').disabled = false;
            }
        }

        if (type === 'polygon') {
            map.addLayer(layer);
        }
        
    });

}

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