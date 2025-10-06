// Bing
const bingAerial = new L.BingLayer('AtpNIxEZLSN40SwkHvqVlUMSwMExSusN9Ga7g3bkmFTe8ncCrS9hLlJqHq1qR-WE', {
  maxZoom: 19
});

const ESRIWorldImagery = new L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png', {
  minZoom: 4,
  maxZoom: 19,
  attribution: '&copy; ESRI World Imagery'
});

const layerNames = [ "1895", "1892", "1845", "1838" ]
const layerIds = [ "btv1b530761213", "btv1b8445742g", "btv1b84432387", "btv1b531027643" ]
const URL_TILE_SERVER = "https://tile.ptm.huma-num.fr/tiles/ark/";
const URL_TILE_SERVER_SUB = "https://{s}.tile.ptm.huma-num.fr/tiles/ark/";
const params = new URLSearchParams(document.location.search);
// const ark = params.get("ark");

async function getLayerFromArk(ark, name) {
  const urlInfo = URL_TILE_SERVER + "info_tiles/12148/" + ark;

  let response = await fetch(urlInfo);
  if (response.ok) {
    let rjson = await response.json();
    const bounds = rjson.bounds.split(",");
    const long = (parseFloat(bounds[0]) + parseFloat(bounds[2])) / 2;
    const lat = (parseFloat(bounds[1]) + parseFloat(bounds[3])) / 2;
    const zoom = Math.floor((parseInt(rjson.minzoom) + parseInt(rjson.maxzoom)) / 2);

    const corner1 = L.latLng(parseFloat(bounds[1]), parseFloat(bounds[0]));
    const corner2 = L.latLng(parseFloat(bounds[3]), parseFloat(bounds[2]));
    const tileBounds = L.latLngBounds(corner1, corner2);

    let layer = new L.tileLayer(URL_TILE_SERVER_SUB + '12148/' + ark + '/{z}/{x}/{y}.png', {
      minNativeZoom: parseInt(rjson.minzoom),
      maxNativeZoom: parseInt(rjson.maxzoom),
      minZoom: 4,
      maxZoom: 19,
      bounds: tileBounds,
      attribution: '&copy; <a href="https://gallica.bnf.fr/ark:/12148/' + ark + '/" target="_blank">BnF - Gallica</a> / PTM - Galligeo',
      name: name
    });

    return layer;
  } else {
    throw new Error("La référence ARK (" + ark + ") ne semble pas encore être géoréférencée.");
    return null;
  }
}

async function getOverlays() {
//  let overlayers = [ bingAerial ];
  let overlayers = [ ESRIWorldImagery ];
  for (let i = 0; i < layerNames.length; i++) {
    let l = await getLayerFromArk(layerIds[i], layerNames[i]);
    overlayers.push(l);
  }
  return overlayers;
}


/*  
  function displayMessage(message) {
    const div = document.getElementById("map");
    const content = document.createTextNode(message);
    div.appendChild(content);
    // document.body.append(div);
  }
*/

/*
    const slider = document.getElementById("opacityRange");
    slider.style.display = "block";

    slider.oninput = function() {
      galligeoLayer.setOpacity(this.value / 100);
    }
  }
*/
