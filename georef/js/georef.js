const URL_TILE_SERVER = "https://tile.ptm.huma-num.fr/tiles/ark/";
const URL_TILE_SERVER_SUB = "https://{s}.tile.ptm.huma-num.fr/tiles/ark/";
const params = new URLSearchParams(document.location.search);
const ark = params.get("ark");
// Numéro de feuille (f1, f2, ...) pour les documents Gallica à plusieurs feuillets.
// Le serveur de tuiles ne sait pas encore distinguer les feuilles d'un même ark ;
// on lit et propage déjà le paramètre pour ne pas avoir à retoucher le front
// une fois que le backend saura l'exploiter.
const folio = params.get("f") || "f1";

const url_info = URL_TILE_SERVER + "info_tiles/12148/" + ark;

get_info_tile();

async function get_info_tile() {
  fetch(url_info).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error("Cette référence ARK (" + ark + ") n'est pas encore géoréférencée.");
  })
  .then((responseJson) => {
    initMap(responseJson);
  })
  .catch((error) => {
    displayMessage("Cette référence ARK (" + ark + ") n'est pas encore géoréférencée.");
  });
}

function displayMessage(message) {
  const div = document.getElementById("map");
  const content = document.createTextNode(message);
  div.appendChild(content);
}

window.currentTileUrl = "";

function showResultHeader(map) {
  window.currentTileUrl = URL_TILE_SERVER + '12148/' + ark + '/{z}/{x}/{y}.png';

  const header = document.getElementById("result-header");
  header.style.display = "flex";

  renderMapMetadata(null);
  layoutBelowHeader(map);

  fetchArkMetadata(ark).then((metadata) => {
    renderMapMetadata(metadata);
    layoutBelowHeader(map);
  });
}

function layoutBelowHeader(map) {
  const headerHeight = document.getElementById("result-header").offsetHeight;
  document.getElementById("map").style.top = headerHeight + "px";

  map.invalidateSize();
}

function renderMapMetadata(metadata) {
  const container = document.getElementById("map-metadata");
  const gallicaUrl = `https://gallica.bnf.fr/ark:/12148/${ark}/${folio}.item`;
  const title = (metadata && metadata.title) || ark;
  const parts = metadata ? [metadata.producer, metadata.date].filter(Boolean).join(" — ") : "";

  container.innerHTML =
    '<div class="title-row">' +
      '<a class="map-title" href="' + gallicaUrl + '" target="_blank" rel="noopener" title="' + escapeHtml(title) + '">' + escapeHtml(title) + '</a>' +
      '<a class="gallica-link" href="' + gallicaUrl + '" target="_blank" rel="noopener" title="Voir la notice Gallica">' +
        '<img src="../img/gallica_logo.svg" alt="Voir la notice Gallica">' +
      '</a>' +
    '</div>' +
    (parts ? '<p class="fr-text--xs">' + escapeHtml(parts) + '</p>' : '') +
    '<div class="tile-url-row">' +
      '<p class="fr-text--xs tile-url" title="' + escapeHtml(window.currentTileUrl) + '">' + escapeHtml(window.currentTileUrl) + '</p>' +
      '<button id="tile-url-copy-btn" type="button" class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-clipboard-line" onclick="copyTileUrl()" title="Copier le lien XYZ du flux de tuiles"></button>' +
    '</div>';
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function fetchArkMetadata(arkId) {
  try {
    const manifestUrl = window.GallicaIIIFAuth.buildManifestUrl(arkId);
    const response = await window.GallicaIIIFAuth.fetch(manifestUrl);
    if (!response.ok) {
      throw new Error(`Erreur Gallica Manifest: ${response.status}`);
    }
    const manifest = await response.json();

    let title = '';
    if (manifest.summary) {
      const summary = manifest.summary;
      title = typeof summary === 'object'
        ? (summary.none?.[0] || summary.fr?.[0] || summary.en?.[0] || '')
        : summary;
    } else if (manifest.label) {
      const label = manifest.label;
      title = typeof label === 'object'
        ? (label.none?.[0] || label.fr?.[0] || label.en?.[0] || '')
        : label;
    }

    let producer = '';
    if (manifest.requiredStatement && manifest.requiredStatement.value) {
      const value = manifest.requiredStatement.value;
      producer = value.none?.[0] || value.fr?.[0] || value.en?.[0] || '';
    }

    let date = '';
    if (Array.isArray(manifest.metadata)) {
      manifest.metadata.forEach((item) => {
        let label = '';
        if (item.label) {
          label = typeof item.label === 'object'
            ? (item.label.fr?.[0] || item.label.en?.[0] || item.label.none?.[0] || '')
            : item.label;
        }
        if (label && label.toLowerCase().includes('date') && item.value) {
          date = typeof item.value === 'object'
            ? (item.value.none?.[0] || item.value.fr?.[0] || item.value.en?.[0] || '')
            : item.value;
        }
      });
    }

    return { title, producer, date };
  } catch (error) {
    console.warn("Impossible de récupérer les métadonnées Gallica:", error);
    return null;
  }
}

function copyTileUrl() {
  const url = window.currentTileUrl;
  if (!url) return;

  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById("tile-url-copy-btn");
    const originalTitle = btn.title;
    btn.classList.remove("fr-icon-clipboard-line");
    btn.classList.add("fr-icon-check-line");
    btn.title = "Lien copié !";
    setTimeout(() => {
      btn.classList.remove("fr-icon-check-line");
      btn.classList.add("fr-icon-clipboard-line");
      btn.title = originalTitle;
    }, 2000);
  }).catch((error) => {
    console.error("Erreur lors de la copie du lien des tuiles:", error);
    alert(url);
  });
}

function createBaseLayers() {
  const OpenStreetMap_classique = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 21,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>'
  });

  const OpenStreetMap_France = L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  const OpenStreetMap_HOT = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 21,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>'
  });

  const OpenStreetMap_BLK = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
    maxZoom: 21,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>'
  });

  const OpenTopoMap = L.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 21,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://opentopomap.org/" target="_blank">Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>'
  });

  const IGN_Plan_actuel = L.tileLayer(
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

  const IGN_Ortho = L.tileLayer(
    "https://data.geopf.fr/wmts?" +
    "&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0" +
    "&STYLE=normal" +
    "&TILEMATRIXSET=PM" +
    "&FORMAT=image/jpeg" +
    "&LAYER=ORTHOIMAGERY.ORTHOPHOTOS" +
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

  const IGN_Scan1950_Histo = L.tileLayer(
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

  const IGN_EtatMajor40 = L.tileLayer(
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

  const Ehess_IGN_Cassini = L.tileLayer.wms('https://ws.sogefi-web.com/wms?', {
    layers: 'Carte_Cassini',
    maxZoom: 21,
    attribution: 'EHESS/IGN/SOGEFI'
  });

  const CassiniBNFIGN = L.tileLayer(
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
  );

  return {
    "OSM Classique": OpenStreetMap_classique,
    "OSM France": OpenStreetMap_France,
    "Humanitarian": OpenStreetMap_HOT,
    "Black": OpenStreetMap_BLK,
    "OpenTopoMap": OpenTopoMap,
    "Plan IGN": IGN_Plan_actuel,
    "IGN Ortho": IGN_Ortho,
    "IGN Scan50 Histo": IGN_Scan1950_Histo,
    "IGN Etat-Major 40": IGN_EtatMajor40,
    "Carte de Cassini": Ehess_IGN_Cassini,
    "Carte de Cassini [BNF]": CassiniBNFIGN
  };
}

// Contrôle de transparence pour la carte géoréférencée, identique à celui de l'interface principale.
L.Control.OpacityControl = L.Control.extend({
  options: {
    position: 'topright'
  },

  onAdd: function(map) {
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

    L.DomEvent.on(slider, 'input', this._onSliderChange, this);
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    return container;
  },

  _onSliderChange: function(e) {
    var opacity = e.target.value / 100;
    this._valueDisplay.innerHTML = e.target.value + '%';
    if (this._layer) {
      this._layer.setOpacity(opacity);
    }
  },

  setLayer: function(layer) {
    this._layer = layer;
  },

  onRemove: function() {
    if (this._slider) {
      L.DomEvent.off(this._slider, 'input', this._onSliderChange, this);
    }
  }
});

L.control.opacityControl = function(options) {
  return new L.Control.OpacityControl(options);
};

function initMap(json) {
  const bounds = json.bounds.split(",");
  const long = (parseFloat(bounds[0]) + parseFloat(bounds[2])) / 2;
  const lat = (parseFloat(bounds[1]) + parseFloat(bounds[3])) / 2;
  const zoom = Math.floor((parseInt(json.minzoom) + parseInt(json.maxzoom)) / 2);

  const corner1 = L.latLng(parseFloat(bounds[1]), parseFloat(bounds[0]));
  const corner2 = L.latLng(parseFloat(bounds[3]), parseFloat(bounds[2]));
  const tile_bounds = L.latLngBounds(corner1, corner2);

  let map = L.map('map').setView([lat, long], zoom);

  const baseLayers = createBaseLayers();
  baseLayers['OSM Classique'].addTo(map);

  let galligeoLayer = L.tileLayer(URL_TILE_SERVER_SUB + '12148/' + ark + '/{z}/{x}/{y}.png', {
    minNativeZoom: parseInt(json.minzoom),
    maxNativeZoom: parseInt(json.maxzoom),
    minZoom: 4,
    maxZoom: 19,
    bounds: tile_bounds,
    attribution: '&copy; Gallica / PTM - Galligeo'
  }).addTo(map);

  const overlays = {
    "Carte Galligeo": galligeoLayer
  };

  L.control.layers(baseLayers, overlays, { collapsed: true, position: 'topright' }).addTo(map);
  map.zoomControl.setPosition('topright');

  const opacityControl = L.control.opacityControl({ position: 'topright' });
  opacityControl.addTo(map);
  opacityControl.setLayer(galligeoLayer);

  showResultHeader(map);
}

function openExternalLink(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function initializeVersionDisplay() {
  const versionDisplay = document.getElementById('version-display');
  const versionDetails = document.getElementById('version-details');
  const versionBuild = document.getElementById('version-build');
  const versionCommit = document.getElementById('version-commit');
  const versionDate = document.getElementById('version-date');

  if (!versionDisplay) return;

  function updateVersionInfo() {
    if (window.APP_VERSION) {
      const version = window.APP_VERSION;

      versionDisplay.textContent = version.shortDisplayVersion;
      versionDisplay.style.cursor = 'pointer';
      versionDisplay.title = 'Cliquer pour plus d\'informations';

      if (versionBuild) {
        versionBuild.textContent = ` • Build ${version.buildNumber}`;
      }
      if (versionCommit) {
        versionCommit.textContent = ` • ${version.git.hash}`;
      }
      if (versionDate) {
        const buildDate = new Date(version.build.timestamp);
        versionDate.textContent = ` • ${buildDate.toLocaleDateString('fr-FR')}`;
      }

      let detailsVisible = false;
      versionDisplay.addEventListener('click', function() {
        detailsVisible = !detailsVisible;

        if (detailsVisible) {
          versionDisplay.textContent = version.displayVersion;
          if (versionDetails) versionDetails.style.display = 'inline';
          versionDisplay.title = 'Cliquer pour réduire';
        } else {
          versionDisplay.textContent = version.shortDisplayVersion;
          if (versionDetails) versionDetails.style.display = 'none';
          versionDisplay.title = 'Cliquer pour plus d\'informations';
        }
      });

      versionDisplay.addEventListener('dblclick', function() {
        if (window.showVersionInfo) {
          window.showVersionInfo();
        }
      });
    } else {
      setTimeout(updateVersionInfo, 100);
    }
  }

  updateVersionInfo();
}

initializeVersionDisplay();
