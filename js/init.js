// Init all vars
let mapsPlaceholder = [];

function Point(latlong) {
    this.long = latlong.lng;
    this.lat = latlong.lat;
}

function PointA_PointB(a, b){
    this.source_point = a;
    this.target_point = b;
}

function PointCrop(lat, long) {
    this.lat = lat;
    this.long = long;
}

let pointA_temp;

let list_georef_points = [];
let list_points_polygon_crop = [];

let first_gallimap_clicked = false;

let count_points = 0;
let randomColor;
let input_ark = 0;
let imageUrl;

let ratio_wh_img = 0

let temp_row;

let base_url = 'https://gallica.bnf.fr/ark:/12148/';

// var urlToAPI = 'http://127.0.0.1:8000/georef/';
const urlToAPI = "https://api.ptm.huma-num.fr/galligeo/georef/";

let height_image;
let width_image;

let image_width_scaled;
let image_height_scaled;

// const URL_TILE_SERVER = "https://api.ptm.huma-num.fr/tiles/";

const URL_TILE_SERVER = "https://tile.ptm.huma-num.fr/tiles/ark/";
const URL_TILE_SERVER_SUB = "https://{s}.tile.ptm.huma-num.fr/tiles/ark/";

// Variables globales pour le nouveau système de saisie
// Déclarées ici pour être disponibles dans tous les fichiers
window.inputMode = 'disabled';
window.currentInputMode = 'points';
window.activeMap = 'left';
window.pointCounter = 0;
window.isInputLocked = false;
window.pointPairs = [];
window.currentPolygon = null;
window.isDragging = false;
