showLegend = true;

input = document.getElementById('search-784-input');

// when the btn is clicked print info in console 
// input.addEventListener('click', (ev)=>{
//     // console.log("Btn clicked");
//   });

input.addEventListener('keypress', (event)=>{

// event.keyCode or event.which  property will have the code of the pressed key
let keyCode = event.keyCode ? event.keyCode : event.which;

// 13 points the enter key
if(keyCode === 13) {
    // call click function of the button
    load_ark_picture();
}
    
});

function toggleLegend(){
    
    var toggle_right = document.getElementById("toggle-right-map");

    if(showLegend){
        //when hiding
        document.getElementById("sidebar").hidden = true;
        //rotate img
        document.getElementById("nav-tools-bar-inner-legend-filter-icon2-inner").style.transform = "rotate(180deg)";

        showLegend = false;

        // if(toggle_right.checked){
            document.getElementById("map-container-left").className = "fr-col-6";// fr-col-lg-10 fr-col-md-12 fr-col-sm-12";
            document.getElementById("map-container-right").className = "fr-col-6";// fr-col-lg-10 fr-col-md-12 fr-col-sm-12";
            document.getElementById("map-container-right").hidden = false;// fr-col-lg-10 fr-col-md-12 fr-col-sm-12";
            
            document.getElementById("map-container-left-at-startup").className = "fr-col-6";

            
            document.getElementById("map-container-left-at-startup").className = "fr-col-6";

    }
    else
    {
        //when showing
        document.getElementById("sidebar").hidden = false;
        document.getElementById("sidebar").className = "fr-col-2";
        
        //rotate img
        document.getElementById("nav-tools-bar-inner-legend-filter-icon2-inner").style.transform = "rotate(0deg)";
        showLegend = true;

        // if(toggle_right.checked){
            document.getElementById("map-container-left").className = "fr-col-5";// fr-col-lg-10 fr-col-md-12 fr-col-sm-12";
            document.getElementById("map-container-right").className = "fr-col-5";// fr-col-lg-10 fr-col-md-12 fr-col-sm-12";
            document.getElementById("map-container-right").hidden = false;// fr-col-lg-10 fr-col-md-12 fr-col-sm-12";

            document.getElementById("map-container-left-at-startup").className = "fr-col-5";
            document.getElementById("map-container-left-at-startup").className = "fr-col-5";

    }
    setTimeout(function(){ left_map.invalidateSize()}, 200);
    setTimeout(function(){ right_map.invalidateSize()}, 200);
    // document.getElementById("nav-tools-bar-inner-legend-filter-icon2-inner").className = "nav-tools-bar-inner-legend-filter-icon2-inner-rotate";
}

var stringToHTML = function (str) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(str, 'text/html');
    return doc.body;
};

function click_georef(image, points, polygon, input_ark) {

    console.log("click on georef")
    console.log(points)
    console.log(polygon)
function click_georef(image, points, polygon, input_ark) {

    console.log("click on georef")
    console.log(points)
    console.log(polygon)

    var urlToRessource = base_url + input_ark;
    // var points_serialized = JSON.stringify(points);

    //waiting animation on map
    right_map.fire('dataloading');

   georef_api_post(urlToAPI, { 
     "gallica_ark_url": urlToRessource,
     "image_width": document.image_width_scaled,
     "image_height": document.image_height_scaled,
     "gcp_pairs": points
   }).then((data) => {
     console.log(data);
   });
}

function display_result(input_ark) {
  window.open('./georef/?ark=' + input_ark, '_blank').focus();
}

async function georef_api_post(url = urlToAPI, data = {}) {
  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow",
    referrerPolicy: "no-referrer",
    body: JSON.stringify(data),
  });

  if (response.ok) {
    document.getElementById('btn_display').disabled = false;
    right_map.fire('dataload');
    console.log("Carte géoréférencée !");

    console.log(input_ark)

    // let galligeoLayer = L.tileLayer(URL_TILE_SERVER + 'tiles/12148/' + input_ark + '/{z}/{x}/{y}.png', {
    //   // minNativeZoom: json.minzoom,
    //   // maxNativeZoom: json.maxzoom,
    //   minZoom: 10,
    //   maxZoom: 23,
    //   // bounds: tile_bounds,
    //   attribution: '&copy; Gallica / PTM - Galligeo'
    // }).addTo(right_map);

//     const URL_TILE_SERVER = "https://tile.ptm.huma-num.fr/tiles/ark/";
// const URL_TILE_SERVER_SUB = "https://{s}.tile.ptm.huma-num.fr/tiles/ark/";

    // https://tile.ptm.huma-num.fr/tiles/ark/tiles/12148/btv1b530293076/16/33012/23827.png

    // https://a.tile.ptm.huma-num.fr/tiles/ark/12148/btv1b530293076/17/66031/47651.png

    let galligeoLayer = L.tileLayer(URL_TILE_SERVER_SUB + '12148/' + input_ark + '/{z}/{x}/{y}.png', {
      // minNativeZoom: parseInt(json.minzoom),
      // maxNativeZoom: parseInt(json.maxzoom),
      minZoom: 10,
      maxZoom: 19,
      // bounds: tile_bounds,
      attribution: '&copy; Gallica / PTM - Galligeo'
    }).addTo(right_map);

    galligeoLayer.bringToFront();

    document.getElementById('btn_deposit').disabled = false;

    // add stepper
    document.getElementById('titre-etape-georef').textContent = "Consulter la carte géoréférencée";
    // document.getElementById('etape-georef').textContent = "Étape 2 sur 4";
    document.getElementById('etape-suite').textContent = "Déposer le résultat sur Nakala";
    document.getElementById('steps').setAttribute('data-fr-current-step', '3');

  
  }
  return response.json();
}

function clkGeoserver(){
    var checked = document.getElementById("checkbox-geoserverptm").checked;

    if(checked){
        document.getElementById("group-checkbox-geoserverptm").className = "fr-checkbox-group";
        document.getElementById("checkbox-geoserverptm-ok").style.visibility = 'visible';
        document.getElementById("checkbox-geoserverptm-ok").style.display = 'block';
        document.getElementById("checkbox-geoserverptm-error").style.visibility = 'hidden';
        document.getElementById("checkbox-geoserverptm-error").style.display = 'none';
    }else{
        document.getElementById("group-checkbox-geoserverptm").className = "fr-checkbox-group fr-checkbox-group--error";
        document.getElementById("checkbox-geoserverptm-ok").style.visibility = 'hidden';
        document.getElementById("checkbox-geoserverptm-ok").style.display = 'none';
        document.getElementById("checkbox-geoserverptm-error").style.visibility = 'visible';
        document.getElementById("checkbox-geoserverptm-error").style.display = 'block';
    }

}

function clkNakalaDepot(){
  var checked = document.getElementById("checkbox-nakala").checked;

    if(checked){
      document.getElementById("group-checkbox-nakala").className = "fr-checkbox-group";
      document.getElementById("checkbox-nakala-ok").style.visibility = 'visible';
      document.getElementById("checkbox-nakala-ok").style.display = 'block';
      document.getElementById("checkbox-nakala-error").style.visibility = 'hidden';
      document.getElementById("checkbox-nakala-error").style.display = 'none';
  }else{
      document.getElementById("group-checkbox-nakala").className = "fr-checkbox-group fr-checkbox-group--error";
      document.getElementById("checkbox-nakala-ok").style.visibility = 'hidden';
      document.getElementById("checkbox-nakala-ok").style.display = 'none';
      document.getElementById("checkbox-nakala-error").style.visibility = 'visible';
      document.getElementById("checkbox-nakala-error").style.display = 'block';
  }

}