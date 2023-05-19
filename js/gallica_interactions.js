async function load_ark_picture() {
        console.log("load ark picture");

        //var string_url = document.querySelector('#ark_url').value + '/f1/0,0,15000,10000/full/0/native.jpg';

        var map = left_map;

        //waiting animation on map
        map.fire('dataloading');

        var input = document.querySelector('#search-784-input').value;

        if (input == '' | input == null) {
            // document.querySelector('#search-784-input').style = 'background-color : red';
            document.querySelector('#search-784-input').value = '!!!! Entrer une url Ark Gallica !!!!';
            return;
        }

        input_ark = input.substr(input.lastIndexOf("/")+1);

        //first get metadata
        try {
            const wait = await load_oai_metada(input_ark);
        } catch (error) {
            document.querySelector('#search-784-input').value = "L'API de Gallica ne répond pas...";
        }
        
        height_temp = Math.floor(parseInt(document.height_image)/3);

        //limit approximatively to 2Mo of map
        //a better algo can be found
        if( height_temp >= 3200){
            height_temp = 3200;
        }

        // Poor resolution bases on 1/3 of heigth full res
        //var string_url = 'https://gallica.bnf.fr/ark:/12148/' + input_ark + '/highres';
        var string_url = 'https://gallica.bnf.fr/iiif/ark:/12148/'+input_ark+'/f1/full/'+ height_temp +'/0/native.jpg';
        // var string_url = 'https://gallica.bnf.fr/ark:/12148/' + input_ark + '/f1.highres';
        
        // Doesn't work
        // var string_url = 'https://gallica.bnf.fr/view3if/ga/ark:/12148/btv1b84434526';

        // Native resolution
        // var string_url = 'https://gallica.bnf.fr/iiif/ark:/12148/btv1b84434526/f1/full/3335,/0/native.jpg';
        // var string_url = 'https://gallica.bnf.fr/iiif/ark:/12148/btv1b84434526/f1/full/full/0/native.jpg';
        console.log(string_url);

        imageUrl = string_url;

        var img = new Image();
            img.onload = function() {

            map.crs = L.CRS.Simple;
            map.maxZoom = 22;
            map.minZoom = 1;

            var map_width = img.width * 10 / img.height;
            ratio_wh_img = img.width / img.height;
            // console.log(map_width)
            var bounds = [[0,0], [-10,map_width]];

            map.setView([-5, map_width/2], 6);

            imgoverlay = L.imageOverlay(imageUrl, bounds).addTo(map);

            imgoverlay.on('load',function(e){
                console.log("dataload image overlay")
                map.fire('dataload');
            });

        }
        img.src = string_url;

        //manage display hidden and visible div : map / video
        document.getElementById('map-container-left-at-startup').style.display = "none";
        document.getElementById('map-container-left-at-startup').style.visibility = "hidden";
        document.getElementById('map-container-left').style.display = "block";
        document.getElementById('map-container-left').style.visibility = 'visible';
        left_map.invalidateSize();

        document.getElementById('metadata').hidden = false;

        activateDrawButton(true);

        document.getElementById('titre-etape-georef').textContent = "Créer des poitns de contrôle";
        // document.getElementById('etape-georef').textContent = "Étape 2 sur 4";
        document.getElementById('etape-suite').textContent = "Cliquer sur Géoréférencer";
        document.getElementById('steps').setAttribute('data-fr-current-step', '2');
    
}

async function load_oai_metada(input_ark) {
        
        var string_url = 'https://gallica.bnf.fr/iiif/ark:/12148/'+ input_ark +'/manifest.json'

        // var input = document.querySelector('#ark_url').value;
        // input_ark = input.substr(input.lastIndexOf("/")+1);
        // string_url += input_ark;
        // console.log(string_url);

        return fetch(string_url)
        .then(response => response.json())
        .then(data => {
            var inner_html_metadata = '';
            data.metadata.forEach(element => {
                // console.log(element);
                inner_html_metadata += '<b>'+element.label+' : </b>' + element.value+'<br>';
            });

            inner_html_metadata += '<b> Height: </b>' + data.sequences[0].canvases[0].height+'<br>';
            inner_html_metadata += '<b> Width: </b>' + data.sequences[0].canvases[0].width+'<br>';
            document.height_image = data.sequences[0].canvases[0].height;
            document.width_image  = data.sequences[0].canvases[0].width;

            document.getElementById('text-metadata').innerHTML = inner_html_metadata;

        });

        //methods with xml API
        //var string_url = 'https://gallica.bnf.fr/services/OAIRecord?ark='
        //  var httpRequest = new XMLHttpRequest();
        //  httpRequest.open('POST', string_url, true);
        //  httpRequest.setRequestHeader( 'Access-Control-Allow-Headers', '*');
        //  httpRequest.setRequestHeader( 'Access-Control-Allow-Methods', '*');
        //  httpRequest.setRequestHeader( 'Access-Control-Allow-Origin', '*');
        //  httpRequest.setRequestHeader( 'Content-Type', 'application/json' );
        //  httpRequest.onerror = function(XMLHttpRequest, textStatus, errorThrown) {
        //    console.log( 'The data failed to load :(' );
        //    console.log(JSON.stringify(XMLHttpRequest));
        //  };
        //  httpRequest.onload = function() {
        //    console.log('SUCCESS!');
        //    console.log(JSON.stringify(XMLHttpRequest));
        //  }
        //  httpRequest.send();
        //  console.log('?');

}
