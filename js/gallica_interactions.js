let metadataDict = {};

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

        var splitUrl = input.split('/');
        
        console.log(splitUrl);
        console.log(splitUrl[5]);
        if( splitUrl[5].length > 13) {
            temp_string = splitUrl[5]
            temp_string2 = temp_string.split(".");
            console.log(' . ' +temp_string2);
            input_ark = temp_string2[0];
        }else{
            input_ark = splitUrl[5];
        }

        // Assurer que window.input_ark est aussi défini pour le système de sauvegarde
        window.input_ark = input_ark;

        console.log(input_ark)

        var splitUrl = input.split('/');
        
        console.log(splitUrl);
        console.log(splitUrl[5]);
        if( splitUrl[5].length > 13) {
            temp_string = splitUrl[5]
            temp_string2 = temp_string.split(".");
            console.log(' . ' +temp_string2);
            input_ark = temp_string2[0];
        }else{
            input_ark = splitUrl[5];
        }

        // Assurer que window.input_ark est aussi défini pour le système de sauvegarde
        window.input_ark = input_ark;

        console.log(input_ark)

        //first get metadata
        try {
            const wait = await load_oai_metada(input_ark);
        } catch (error) {
            document.querySelector('#search-784-input').value = "L'API de Gallica ne répond pas...";
        }
        
        // const size_img_max = 15000000; // around 2Mo
        const size_img_max = 8500000; // around 1.9Mo
        let size_img = document.height_image * document.width_image;
        let ratio_img = size_img / size_img_max;
        let ratio_wh = document.width_image / document.height_image;
        let square_root_ratio_img = Math.sqrt(ratio_img);

        if( size_img >= size_img_max){
            height_temp = Math.floor(parseInt(document.height_image / square_root_ratio_img));
            width_temp = Math.floor(parseInt(height_temp * ratio_wh));
        }else{
            height_temp = document.height_image;
            width_temp = document.width_image;
        }

        document.image_width_scaled = width_temp;
        document.image_height_scaled = height_temp;

        // console.log("width : " + document.width_image )
        // console.log("heigth : " + document.height_image )
        // console.log("ratio calc : " + ratio_img )
        // console.log("heigth calc : " + height_temp )
        
        // Poor resolution bases on size approx 2Mo

        //var string_url = 'https://gallica.bnf.fr/ark:/12148/' + input_ark + '/highres';
        var string_url = 'https://gallica.bnf.fr/iiif/ark:/12148/'+input_ark+'/f1/full/'+ '3200' +'/0/native.jpg';
        https://gallica.bnf.fr/iiif/ark:/12148/btv1b84460142/f1/full/full/0/native.jpg
        // var string_url = 'https://gallica.bnf.fr/iiif/ark:/12148/'+input_ark+'/f1/full/full/0/native.jpg';
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
        // document.getElementById('map-container-left-at-startup').style.display = "none";
        // document.getElementById('map-container-left-at-startup').style.visibility = "hidden";
        document.getElementById('map-container-left-at-startup').remove()

        document.getElementById('map-container-left').style.display = "block";
        document.getElementById('map-container-left').style.visibility = 'visible';
        left_map.invalidateSize();

        // L'élément metadata a été déplacé vers le contrôle sur la carte
        // Plus besoin de le rendre visible ici

        // L'ancienne fonction activateDrawButton n'existe plus avec le nouveau système
        // Le système de saisie avancé est maintenant géré par les contrôles toggle et segmentés

        document.getElementById('titre-etape-georef').textContent = "Créer au moins 3 points de contrôle";
        // document.getElementById('etape-georef').textContent = "Étape 2 sur 4";
        document.getElementById('etape-suite').textContent = "Puis cliquer sur Géoréférencer";
        document.getElementById('steps').setAttribute('data-fr-current-step', '2');

        // Vérifier s'il y a des sauvegardes à restaurer pour cet ARK
        if (window.controlPointsBackup && input_ark) {
            setTimeout(() => {
                window.controlPointsBackup.checkForAutoRestore();
                
                // Mettre à jour l'état des boutons de sauvegarde
                if (typeof updateBackupButtonsState === 'function') {
                    updateBackupButtonsState();
                }
            }, 500); // Petit délai pour s'assurer que tout est initialisé
        }
    
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
            metadataDict = metadataDict || {};

            const canvas = data.sequences[0].canvases[0];
            data.metadata.push(
                { label: 'Height', value: canvas.height },
                { label: 'Width',  value: canvas.width  }
            );
            document.height_image = canvas.height;
            document.width_image  = canvas.width;

            const metadataOrder = [
                'Title','Creator','Publisher','Date','Format',
                'Language','Type','Height','Width','Source',
                'Subject','Description','Relation','Coverage',
                'Rights','Identifier','Shelfmark','Repository',
                'Digitised by','Source Images','Metadata Source'
            ];
            const ordered = metadataOrder
                .map(lbl => data.metadata.find(el => el.label === lbl))
                .filter(Boolean);
            const remaining = data.metadata.filter(el => !metadataOrder.includes(el.label));
            const sortedMetadata = ordered.concat(remaining);

            sortedMetadata.forEach(element => {

                // Conversion des labels en français
                let frenchLabel = element.label;
                const labelMapping = {
                    'Title': 'Titre',
                    'Creator': 'Créateur',
                    'Publisher': 'Éditeur',
                    'Date': 'Date',
                    'Format': 'Format',
                    'Language': 'Langue',
                    'Type': 'Type',
                    'Height' : 'Hauteur',
                    'Width' : 'Largeur',
                    'Source': 'Source',
                    'Relation': 'Relation',
                    'Coverage': 'Couverture',
                    'Rights': 'Droits',
                    'Source Images': 'Images Source',
                    'Metadata Source': 'Source des Métadonnées',
                    'Description': 'Description',
                    'Subject': 'Sujet',
                    'Contributor': 'Contributeur',
                    'Identifier': 'Identifiant',
                    'Shelfmark' : 'Cote',
                    'Repository' : 'Référentiel',
                    'Digitised by' : 'Numérisé par',
                };
                
                // Si le label existe utiliser la version française
                if (labelMapping[element.label]) {
                    frenchLabel = labelMapping[element.label];
                } else {
                    frenchLabel = element.label;
                }
                
                // Stocker dans le dictionnaire avec le label traduit
                metadataDict[frenchLabel] = element.value;
                // formater les champs URL en lien
                if (element.label === 'Source Images' || element.label === 'Metadata Source') {
                    inner_html_metadata += '<b>' + frenchLabel + ' : </b>'
                        + '<a href="' + element.value + '" target="_blank">' + element.value + '</a><br>';
                } else if (element.label === 'Relation') {
                    // Check if the Relation field contains a URL
                    const urlRegex = /(https?:\/\/[^\s]+)/g;
                    const text = element.value;
                    // Replace URLs with clickable links
                    const formattedText = text.replace(urlRegex, url => 
                        `<a href="${url}" target="_blank">${url}</a>`);
                    inner_html_metadata += '<b>' + frenchLabel + ' : </b>' + formattedText + '<br>';
                } else {
                    // Handle case where value is an array (e.g., Format field)
                    if (Array.isArray(element.value)) {
                        let values = element.value.map(item => item['@value'] || item).join(', ');
                        inner_html_metadata += '<b>' + frenchLabel + ' : </b>' + values + '<br>';
                    } else {
                        inner_html_metadata += '<b>' + frenchLabel + ' : </b>' + element.value + '<br>';
                    }
                }
            });

            console.log(metadataDict);

            // Mise à jour de l'ancienne interface (pour compatibilité)
            const oldMetadataElement = document.getElementById('text-metadata');
            if (oldMetadataElement) {
                oldMetadataElement.innerHTML = inner_html_metadata;
            }
            
            // Mise à jour du nouveau panneau de métadonnées
            updateMetadataPanel(sortedMetadata);

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

/**
 * Met à jour le panneau de métadonnées avec un style amélioré
 * @param {Array} metadata - Tableau des métadonnées
 */
function updateMetadataPanel(metadata) {
    if (!window.metadataControl) return;
    
    let formattedHtml = '';
    
    const labelMapping = {
        'Title': 'Titre',
        'Creator': 'Créateur',
        'Publisher': 'Éditeur',
        'Date': 'Date',
        'Format': 'Format',
        'Language': 'Langue',
        'Type': 'Type',
        'Height' : 'Hauteur',
        'Width' : 'Largeur',
        'Source': 'Source',
        'Relation': 'Relation',
        'Coverage': 'Couverture',
        'Rights': 'Droits',
        'Source Images': 'Images Source',
        'Metadata Source': 'Source des Métadonnées',
        'Subject': 'Sujet',
        'Description': 'Description',
        'Identifier': 'Identifiant',
        'Shelfmark': 'Cote',
        'Repository': 'Dépôt',
        'Digitised by': 'Numérisé par'
    };
    
    metadata.forEach(element => {
        if (!element) return;
        
        const frenchLabel = labelMapping[element.label] || element.label;
        let value = element.value;
        
        // Traitement spécial pour les URLs
        if (element.label === 'Source Images' || element.label === 'Metadata Source') {
            value = `<a href="${value}" target="_blank" class="metadata-url">${value}</a>`;
        } else if (Array.isArray(value)) {
            value = value.map(item => item['@value'] || item).join(', ');
        } else if (typeof value === 'string' && value.length > 100) {
            // Formater les textes longs
            value = value.replace(/(.{80})/g, '$1<br>');
        }
        
        formattedHtml += `
            <div class="metadata-item">
                <span class="metadata-label">${frenchLabel}</span>
                <div class="metadata-value">${value}</div>
            </div>
        `;
    });
    
    if (formattedHtml === '') {
        formattedHtml = '<p class="fr-text--sm">Aucune métadonnée disponible.</p>';
    }
    
    // Mettre à jour le contenu du panneau
    window.metadataControl.updateContent(formattedHtml);
}
