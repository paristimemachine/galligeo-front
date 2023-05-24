// Init all vars
var mapsPlaceholder = [];

function Point(latlong) {
    this.long = latlong.lng;
    this.lat = latlong.lat;
}

function PointA_PointB(a, b){
    this.source_point = a;
    this.target_point = b;
}

var pointA_temp;

var list_georef_points = [];

var first_gallimap_clicked = false;

var count_points = 0;
var randomColor;
var input_ark = 0;
var imageUrl;

var ratio_wh_img = 0

var temp_row;

var base_url = 'https://gallica.bnf.fr/ark:/12148/';

// var urlToAPI = 'http://127.0.0.1:8000/georef/';
const urlToAPI = "https://ptm01.huma-num.fr/api/galligeo/georef/";

let height_image;
let width_image;

let image_width_scaled;
let image_height_scaled;

const URL_TILE_SERVER = "https://ptm01.huma-num.fr/api/galligeo/tiles/";