async function load_ark_picture() {
        console.log("load ark picture");

        var map = left_map;

        map.fire('dataloading');

        var input = document.querySelector('#search-784-input').value;

        if (input == '' | input == null) {
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

        window.input_ark = input_ark;

        console.log(input_ark)

        try {
            const wait = await load_oai_metada(input_ark);
            
            console.log('🔍 Vérification après load_oai_metada');
            console.log('document.height_image:', document.height_image);
            console.log('document.width_image:', document.width_image);
            
            if (!document.height_image || !document.width_image) {
                console.log('⚠️ Dimensions non disponibles dans le manifest, tentative avec l\'API Image IIIF...');
                const dimensions = await load_image_dimensions_from_iiif_image_api(input_ark);
                
                if (!dimensions) {
                    console.error('❌ Impossible de récupérer les dimensions de l\'image depuis les deux APIs');
                    alert('Erreur: Impossible de récupérer les dimensions de l\'image. Veuillez réessayer.');
                    map.fire('dataload');
                    return;
                }
            }
            
            if (window.ensureMetadataControlAvailable && !window.metadataControl) {
                console.log('Tentative d\'initialisation du contrôle de métadonnées après chargement');
                try {
                    await window.ensureMetadataControlAvailable();
                } catch (error) {
                    console.warn('Impossible d\'initialiser le contrôle de métadonnées:', error);
                }
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement des métadonnées:', error);
            document.querySelector('#search-784-input').value = "L'API de Gallica ne répond pas...";
            map.fire('dataload');
            return;
        }
        
        if (!document.height_image || !document.width_image) {
            console.error('❌ Les dimensions de l\'image n\'ont pas pu être récupérées');
            alert('Erreur: Impossible de récupérer les dimensions de l\'image. Veuillez réessayer.');
            map.fire('dataload');
            return;
        }
        
        console.log(`📐 Dimensions de l'image chargées: ${document.width_image} x ${document.height_image}`);
        
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
        
        console.log(`📐 Dimensions scalées calculées: ${document.image_width_scaled} x ${document.image_height_scaled}`);
        
        var string_url = 'https://openapi.bnf.fr/iiif/image/v3/ark:/12148/'+input_ark+'/f1/full/3200,/0/default.webp';

        console.log(string_url);

        try {
            imageUrl = await window.GallicaIIIFAuth.loadImageObjectUrl(string_url);
        } catch (error) {
            console.error('❌ Erreur lors du chargement de l\'image IIIF authentifiée:', error);
            alert('Erreur: Impossible de récupérer l\'image depuis Gallica. Veuillez réessayer.');
            map.fire('dataload');
            return;
        }

        var img = new Image();
            img.onload = function() {

            map.crs = L.CRS.Simple;
            map.maxZoom = 22;
            map.minZoom = 1;

            var map_width = img.width * 10 / img.height;
            ratio_wh_img = img.width / img.height;
            var bounds = [[0,0], [-10,map_width]];

            map.setView([-5, map_width/2], 6);

            imgoverlay = L.imageOverlay(imageUrl, bounds).addTo(map);

            imgoverlay.on('load',function(e){
                console.log("dataload image overlay")
                map.fire('dataload');
            });

        }
        img.src = imageUrl;

        //manage display hidden and visible div : map / video
        // Vérifier que l'élément existe avant de le supprimer (peut être null au 2e chargement)
        const startupContainer = document.getElementById('map-container-left-at-startup');
        if (startupContainer) {
            startupContainer.remove();
        }

        document.getElementById('map-container-left').style.display = "block";
        document.getElementById('map-container-left').style.visibility = 'visible';
        left_map.invalidateSize();

        document.getElementById('titre-etape-georef').textContent = "Créer au moins 3 points de contrôle";
        document.getElementById('etape-suite').textContent = "Puis cliquer sur Géoréférencer";
        document.getElementById('steps').setAttribute('data-fr-current-step', '2');

        if (window.controlPointsBackup && input_ark) {
            setTimeout(() => {
                window.controlPointsBackup.checkForAutoRestore();
                
                if (typeof updateBackupButtonsState === 'function') {
                    updateBackupButtonsState();
                }
            }, 500);
        }
    
}

/**
 * Récupère les dimensions de l'image depuis l'API Image IIIF v3
 * Utilisé comme fallback si le manifest ne contient pas les dimensions
 */
async function load_image_dimensions_from_iiif_image_api(input_ark) {
    const infoUrl = `https://openapi.bnf.fr/iiif/image/v3/ark:/12148/${input_ark}/f1/info.json`;
    
    console.log('🔍 Tentative de récupération des dimensions depuis l\'API Image IIIF:', infoUrl);
    
    try {
        const response = await window.GallicaIIIFAuth.fetch(infoUrl);
        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.width && data.height) {
            document.width_image = data.width;
            document.height_image = data.height;
            console.log('✅ Dimensions récupérées depuis l\'API Image IIIF:', data.width, 'x', data.height);
            return { width: data.width, height: data.height };
        } else {
            console.warn('⚠️ L\'API Image IIIF ne contient pas de dimensions');
            return null;
        }
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des dimensions depuis l\'API Image IIIF:', error);
        return null;
    }
}

async function load_oai_metada(input_ark) {
        
        var string_url = 'https://openapi.bnf.fr/iiif/presentation/v3/ark:/12148/'+ input_ark +'/manifest.json'

        // var input = document.querySelector('#ark_url').value;
        // input_ark = input.substr(input.lastIndexOf("/")+1);
        // string_url += input_ark;
        // console.log(string_url);

        return window.GallicaIIIFAuth.fetch(string_url)
        .then(response => response.json())
        .then(data => {
            var inner_html_metadata = '';
            // Utiliser la variable globale
            window.metadataDict = window.metadataDict || {};

            // Extraire l'URL Gallica depuis le champ homepage du manifest IIIF v3
            if (data.homepage && Array.isArray(data.homepage) && data.homepage.length > 0) {
                const gallicaHomepage = data.homepage[0];
                if (gallicaHomepage.id && gallicaHomepage.id.includes('gallica.bnf.fr')) {
                    window.metadataDict['Images Source'] = gallicaHomepage.id;
                    window.metadataDict['Source Images'] = gallicaHomepage.id;
                }
            }

            // Récupérer le canvas (items[0] dans IIIF v3)
            const canvas = data.items && data.items[0];
            
            console.log('📊 Manifest IIIF chargé');
            console.log('📊 Canvas trouvé:', canvas ? 'OUI' : 'NON');
            if (canvas) {
                console.log('📊 Dimensions du canvas:', canvas.width, 'x', canvas.height);
            }
            
            // Ajouter les dimensions si disponibles
            if (canvas && canvas.height && canvas.width) {
                if (!data.metadata) data.metadata = [];
                data.metadata.push(
                    { label: { fr: ['Hauteur'], en: ['Height'] }, value: { none: [canvas.height] } },
                    { label: { fr: ['Largeur'], en: ['Width'] }, value: { none: [canvas.width] } }
                );
                document.height_image = canvas.height;
                document.width_image  = canvas.width;
                console.log('✅ Dimensions de l\'image définies:', document.width_image, 'x', document.height_image);
            } else {
                console.error('❌ Impossible de récupérer les dimensions du canvas');
                console.log('Canvas:', canvas);
            }

            const metadataOrder = [
                'Title','Titre','Creator','Créateur','Publisher','Éditeur','Date','Format',
                'Language','Langue','Type','Height','Hauteur','Width','Largeur','Source',
                'Subject','Sujet','Description','Relation','Coverage','Couverture',
                'Rights','Droits','Identifier','Identifiant','Shelfmark','Cote','Repository','Référentiel',
                'Digitised by','Numérisé par','Source Images','Images Source','Metadata Source','Source meta-données'
            ];
            
            // Normaliser les métadonnées IIIF v3
            const normalizedMetadata = (data.metadata || []).map(element => {
                // Extraire le label
                let label = '';
                if (element.label) {
                    if (typeof element.label === 'object') {
                        label = element.label.en?.[0] || element.label.fr?.[0] || element.label.none?.[0] || '';
                    } else {
                        label = element.label;
                    }
                }
                
                // Extraire la valeur
                let value = '';
                if (element.value) {
                    if (typeof element.value === 'object') {
                        value = element.value.en?.[0] || element.value.fr?.[0] || element.value.none?.[0] || '';
                    } else {
                        value = element.value;
                    }
                }
                
                return { label, value };
            });
            
            const ordered = metadataOrder
                .map(lbl => normalizedMetadata.find(el => el.label === lbl))
                .filter(Boolean);
            const remaining = normalizedMetadata.filter(el => !metadataOrder.includes(el.label));
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
                window.metadataDict[frenchLabel] = element.value;
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

            console.log('Métadonnées chargées:', window.metadataDict);

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
    // Fonction pour essayer de mettre à jour le panneau
    function tryUpdatePanel() {
        if (!window.metadataControl) {
            return false;
        }
        
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
        return true;
    }
    
    // Essayer immédiatement
    if (tryUpdatePanel()) {
        return;
    }
    
    // Si le contrôle n'est pas disponible, attendre et réessayer
    let attempts = 0;
    const maxAttempts = 20; // 4 secondes maximum
    
    const retryInterval = setInterval(() => {
        attempts++;
        
        if (tryUpdatePanel() || attempts >= maxAttempts) {
            clearInterval(retryInterval);
            if (attempts >= maxAttempts) {
                console.warn('Impossible de mettre à jour le panneau de métadonnées : contrôle non disponible');
            }
        }
    }, 200); // Essayer toutes les 200ms
}
