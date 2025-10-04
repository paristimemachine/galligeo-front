let map;
let overlays = [];
let overlaysFlags = [];
const lat = 43.948;
const long = 4.807;
const mapZoom = 16;
const mapMaxZoom = 19
const mapPreferCanvas = true;
let currentLayer;

const slider = document.getElementById("opacityRange");

let osm = new L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    // attribution: 'Map data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Tiles courtesy of <a href="http://openstreetmap.org/">OpenStreetMap</a>',
    maxNativeZoom: 18,
    maxZoom: mapMaxZoom
});

async function init() {
  overlays = await getOverlays();

  map = new L.Map('map', {
    center: new L.LatLng(lat, long),
    zoom: mapZoom,
    maxZoom: mapMaxZoom,
    preferCanvas: mapPreferCanvas
  });

  osm.addTo(map);

  for (let i = 0 ; i < overlays.length ; i++) {
    overlays[i].setZIndex(i+1);
    overlaysFlags.push(false);
  }
  initSlider();
}

(async () => {
    await init();
})();

function addRemoveOverlayMap(overlayIndex) {
  let index = overlaysFlags.indexOf(true);

  if (index === -1) {
    slider.value = 100;
    currentLayer = overlays[overlayIndex];
    map.addLayer(overlays[overlayIndex]);
    overlaysFlags[overlayIndex] = true;
    document.getElementById("button" + overlayIndex).style.fontWeight = 'bold';
  } else {
    if (index === overlayIndex) {
      slider.value = 100;
      currentLayer.setOpacity(1);
      currentLayer = null;
      map.removeLayer(overlays[overlayIndex]);
      overlaysFlags[overlayIndex] = false;
      document.getElementById("button" + index).style.fontWeight = 'normal';
    } else {
      map.removeLayer(overlays[index]);
      overlaysFlags[index] = false;
      document.getElementById("button" + index).style.fontWeight = 'normal';
      slider.value = 100;
      currentLayer.setOpacity(1);
      currentLayer = overlays[overlayIndex];
      map.addLayer(overlays[overlayIndex]);
      overlaysFlags[overlayIndex] = true;
      document.getElementById("button" + overlayIndex).style.fontWeight = 'bold';
    }
  }
}

function initSlider() {
  slider.style.display = "block";

  slider.oninput = function() {
    if (currentLayer) {
      currentLayer.setOpacity(this.value / 100);
    }
  }
}
