async function deposerSurNakala(apiKey_in, collection_id_in) {

    // Configuration
    const API_URL_TEST = 'https://apitest.nakala.fr'; // ou production 'https://api.nakala.fr'
    const API_URL_PROD = 'https://api.nakala.fr';

    const API_URL = API_URL_PROD

    const UPLOAD_EP = API_URL + '/datas/uploads';
    const CREATE_EP = API_URL + '/datas';

    const COLLECTION_ID = collection_id_in || '10.34847/nkl.f8eev8l7'; // par défaut, la collection de test
    const apiKey = apiKey_in || '01234567-89ab-cdef-0123-456789abcdef' // par défaut, la clé d'API de test

    // Utiliser les données de l'utilisateur connecté ou les champs du formulaire
    let nom, prenom, institution;
    
    if (isLoggedIn && userData) {
        // Utiliser les données de l'utilisateur connecté et préremplir les champs
        nom = userData.name ? userData.name.split(' ').pop() : document.getElementById('input-family-name-1').value;
        prenom = userData.name ? userData.name.split(' ').slice(0, -1).join(' ') : document.getElementById('input-firstname-1').value;
        institution = userData.institution || document.getElementById('input-institution').value;
        
        // Préremplir les champs du formulaire si ils sont vides
        if (!document.getElementById('input-family-name-1').value && nom) {
            document.getElementById('input-family-name-1').value = nom;
        }
        if (!document.getElementById('input-firstname-1').value && prenom) {
            document.getElementById('input-firstname-1').value = prenom;
        }
        if (!document.getElementById('input-institution').value && institution) {
            document.getElementById('input-institution').value = institution;
        }
    } else {
        // Utiliser les valeurs des champs du formulaire
        nom = document.getElementById('input-family-name-1').value;
        prenom = document.getElementById('input-firstname-1').value;
        institution = document.getElementById('input-institution').value;
    }

    // 1. Générer le fichier de points de contrôle à partir des données actuelles
    if (!window.pointPairs || window.pointPairs.length === 0) {
        return alert('Aucun point de contrôle disponible pour le dépôt.');
    }
    
    // Générer le contenu du fichier points de contrôle
    let coordsContent = "# Points de contrôle générés par GallicaGeo\n";
    coordsContent += "# Format: id, lat_image, lng_image, lat_geo, lng_geo\n";
    
    const completePairs = window.pointPairs.filter(pair => pair.isComplete());
    if (completePairs.length === 0) {
        return alert('Aucune paire de points complète disponible pour le dépôt.');
    }
    
    completePairs.forEach(pair => {
        coordsContent += `${pair.id},${pair.leftPoint.lat},${pair.leftPoint.lng},${pair.rightPoint.lat},${pair.rightPoint.lng}\n`;
    });
    
    // Créer un Blob avec le contenu généré
    const fileBlob = new Blob([coordsContent], { type: 'text/plain' });

    // 2. Préparer l'uploadForm et y ajouter le Blob
    const uploadForm = new FormData();
    // Le troisième argument donne le nom du fichier côté Nakala
    uploadForm.append('file', fileBlob, 'points_controle.csv');

    // 3. Envoyer sur /datas/uploads
    const uploadResp = await fetch(UPLOAD_EP, {
        method: 'POST',
        headers: { 'X-API-KEY': apiKey },
        body: uploadForm
    });
    if (!uploadResp.ok) {
        const errText = await uploadResp.text();
        console.error('Échec upload:', uploadResp.status, errText);
        return alert("Erreur lors de l'upload du fichier de points de contrôle");
    }
    const { name: uploadedName, sha1: uploadedSha1 } = await uploadResp.json();
    console.log('Upload OK:', uploadedName, uploadedSha1);

    console.log('Nom:', nom);
    console.log('Prénom:', prenom);
    console.log('Institution:', institution);

    const nakalaTypeDict = {
        "Article de journal": "http://purl.org/coar/resource_type/c_6501",
        "Texte":              "http://purl.org/coar/resource_type/c_18cf",
        "Image":              "http://purl.org/coar/resource_type/c_c513",
        "Carte":              "http://purl.org/coar/resource_type/c_12cd"
    };

    //atention, il faut que le type soit dans le dictionnaire dans les termes en français, voir dans gallica_interactions.js
    const DATATYPE     = nakalaTypeDict['Carte'];
    const TITLE        = metadataDict['Titre'];
    const CREATED_DATE = new Date().toISOString().split('T')[0];
    const LICENSE      = 'CC-BY-4.0';
    const AUTHORS = [metadataDict['Cote']];
    console.log('log authour ' + AUTHORS);
    if (AUTHORS.length === 0) {
        AUTHORS.push('BNF Gallica');
    }
    const CONTRIBUTORS = [prenom + ' ' + nom + ' (' + institution + ')'];

    // to do, il pourrait y avoir d'autres mots clés entrés par l'utlisateur
    const KEYWORDS = [
        'carte',
        'georeferencement',
        'données géohistoriques'
    ]

    const url_gallica = metadataDict['Source Images'];
    const url_app_ptm = 'https://app.ptm.huma-num.fr/galligeo/georef/?ark=' + input_ark;
    const url_tile_ptm_sub = 'https://{s}.tile.ptm.huma-num.fr/tiles/ark/12148/' + input_ark + '/{z}/{x}/{y}.png';

    const DESCRIPTION = "L'image source est visible sur le site de Gallica, à l'adresse suivante : " + url_gallica + '\n\n' +
        "Cette image a été géoréférencée par le projet Galligeo, qui vise à rendre accessible la cartographie historique de la BnF dans un format géoréférencé. "  + '\n\n' +
        "Les points de contrôle ont été créés par des bénévoles, et sont disponibles sous la forme d'un fichier CSV dans le dépôt contenant les coordonnées des paires de points de contrôle (image/géographique)"  + '\n\n' +
        "La carte géoréférencée est visible à l'adresse suivante : " +  url_app_ptm + '\n\n' +
        "Le flux de tuile peut être utilisé dans un SIG, avec l'URL suivante : " + url_tile_ptm_sub + '\n\n' +
        "Les données sont disponibles sous la licence " + LICENSE + ", et peuvent être utilisées pour des projets de recherche ou d'enseignement."  + '\n\n' +
        "Pour toute question, vous pouvez contacter l'équipe de GallicaGeo à l'adresse suivante : ptm-galligeo@listes.huma-num.fr"

    const metas = [];

    metas.push({
        "value": DATATYPE,
        "typeUri": "http://www.w3.org/2001/XMLSchema#anyURI",
        "propertyUri": "http://nakala.fr/terms#type"
    });
    // Sanitize title to avoid problematic characters
    const sanitizedTitle = TITLE.replace(/[<>:"\/\\|?*&]/g, '_');
    metas.push({
        "value": sanitizedTitle,
        "lang": "fr",
        "typeUri": "http://www.w3.org/2001/XMLSchema#string",
        "propertyUri": "http://nakala.fr/terms#title"
    });
    for (const auth of AUTHORS) {
        const [surname, given] = auth.split(',').map(x => x.trim());
        metas.push({
            "value": { "surname": surname, "givenname": given },
            "propertyUri": "http://nakala.fr/terms#creator"
        });
    }
    for (const keyword of KEYWORDS) {
        metas.push({
            "value": keyword,
            "typeUri": "http://www.w3.org/2001/XMLSchema#string",
            "propertyUri": "http://purl.org/dc/terms/subject"
        });
    }
    metas.push({
        "value": DESCRIPTION,
        "lang": "fr",
        "typeUri": "http://www.w3.org/2001/XMLSchema#string",
        "propertyUri": "http://purl.org/dc/terms/description"
    });
    for (const contributor of CONTRIBUTORS) {
        metas.push({
            "value": contributor,
            "typeUri": "http://www.w3.org/2001/XMLSchema#string",
            "propertyUri": "http://purl.org/dc/terms/contributor"
        });
    }
    // metas.push({
    //     "value": CREATED_DATE,
    //     "typeUri": "http://www.w3.org/2001/XMLSchema#string",
    //     "propertyUri": "http://nakala.fr/terms#created"
    // });
    // Format the date to ensure it's 4 digits
    let formattedDate = metadataDict['Date'] || '';
    
    // Handle various fuzzy date formats
    if (formattedDate) {
        console.log('Date originale:', formattedDate);
        
        // Handle "1..." (1000-1999) - doit être testé en premier
        if (formattedDate.match(/^\d\.\.\.$/)) {
            formattedDate = formattedDate.replace('...', '000');
            console.log('Après transformation 1...:', formattedDate);
        }
        // Handle "18.." (1800-1899)
        else if (formattedDate.match(/^\d{2}\.\.$/)) {
            formattedDate = formattedDate.replace('..', '00');
            console.log('Après transformation 18..:', formattedDate);
        }
        // Handle "1.." (1000-1099)
        else if (formattedDate.match(/^\d\.\.$/)) {
            formattedDate = formattedDate.replace('..', '00');
            console.log('Après transformation 1..:', formattedDate);
        }
        // Handle patterns like "185." (1850-1859)
        else if (formattedDate.match(/^\d{3}\.$/)) {
            formattedDate = formattedDate.replace('.', '0');
            console.log('Après transformation 185.:', formattedDate);
        }
        // Handle patterns like "18." (1800-1809) 
        else if (formattedDate.match(/^\d{2}\.$/)) {
            formattedDate = formattedDate.replace('.', '00');
            console.log('Après transformation 18.:', formattedDate);
        }
        // Handle patterns with question marks "185?" or "18??"
        else if (formattedDate.match(/^\d+\?+$/)) {
            formattedDate = formattedDate.replace(/\?/g, '0');
            console.log('Après transformation ?:', formattedDate);
        }
        // Fallback: Extract only digits and pad if necessary
        else {
            const digitsOnly = formattedDate.replace(/[^\d]/g, '');
            if (digitsOnly.length > 0) {
                // Pad with zeros to make it 4 digits if less than 4
                if (digitsOnly.length < 4) {
                    formattedDate = digitsOnly.padEnd(4, '0');
                } else {
                    formattedDate = digitsOnly.substring(0, 4);
                }
                console.log('Après extraction chiffres:', formattedDate);
            }
        }
    }
    
    // Ensure we have a valid 4-digit year (between 1000 and current year + 100)
    const currentYear = new Date().getFullYear();
    const yearNumber = parseInt(formattedDate);
    if (formattedDate && formattedDate.length === 4 && 
        !isNaN(yearNumber) && yearNumber >= 1000 && yearNumber <= currentYear + 100) {
        metas.push({
            "value": formattedDate,
            "typeUri": "http://www.w3.org/2001/XMLSchema#string",
            "propertyUri": "http://nakala.fr/terms#created"
        });
    }
    metas.push({
        "value": LICENSE,
        "typeUri": "http://www.w3.org/2001/XMLSchema#string",
        "propertyUri": "http://nakala.fr/terms#license"
    });

    // URL
    metas.push({
        "value": url_app_ptm,
        "typeUri": "http://www.w3.org/2001/XMLSchema#anyURI",
        "propertyUri": "http://purl.org/dc/terms/references"
    });

    metas.push({
        "value": url_tile_ptm_sub,
        "typeUri": "http://www.w3.org/2001/XMLSchema#string",
        "propertyUri": "http://purl.org/dc/terms/references"
    });

    const data = {
        collectionsIds: [COLLECTION_ID],
        files: [{
            name:        uploadedName,
            sha1:        uploadedSha1,
            embargoed:   '2025-03-27',
            description: 'Points de contrôle CSV (coordonnées image/géographique)'
          }],
        status: "published",
        metas: metas,
    };
    
    if (!apiKey) {
        alert('Veuillez entrer une clé d\'API Nakala.');
        return;
    }

    if (!nom || !prenom || !institution) {
        alert('Veuillez remplir tous les champs : nom, prénom, institution.');
        return;
    }

    try {
        const response = await fetch(CREATE_EP, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept':       'application/json',
                'X-API-KEY': apiKey},
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const ct = response.headers.get('content-type') || '';
            const errBody = ct.includes('application/json')
              ? await response.json()
              : await response.text();
            console.error('Erreur API Nakala:', response.status, errBody);
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(errBody)}`);
        }

        const result = await response.json();
        alert('Dépôt réussi sur Nakala !');
        console.log(result);
        
        // Mettre à jour le statut de la carte vers "déposée" avec le DOI
        console.log('Tentative de mise à jour du statut après dépôt sur Nakala:');
        console.log('- window.workedMapsManager:', !!window.workedMapsManager);
        console.log('- window.input_ark:', window.input_ark);
        console.log('- result.doi:', result.doi);
        
        if (window.workedMapsManager && window.input_ark && result.doi) {
            console.log(`Mise à jour du statut de ${window.input_ark} vers 'deposee' avec DOI ${result.doi}`);
            window.workedMapsManager.updateMapStatus(window.input_ark, 'deposee', { 
                doi: result.doi 
            }).then(updateResult => {
                console.log('Mise à jour du statut de dépôt réussie:', updateResult);
            }).catch(error => {
                console.error('Erreur lors de la mise à jour du statut de la carte après dépôt:', error);
            });
        } else {
            console.warn('Impossible de mettre à jour le statut après dépôt:', {
                workedMapsManager: !!window.workedMapsManager,
                input_ark: !!window.input_ark,
                doi: !!result.doi
            });
        }

        // fermer la modale
        document.getElementById('fr-modal-deposit').style.display = 'none';


        // add final stepper
        // Au lieu de textContent, utilisez innerHTML :
        document.getElementById('titre-etape-georef').innerHTML =
        `Fin : consulter le dépôt sur
        <a href="https://nakala.fr/collection/${COLLECTION_ID}" target="_blank">
            Nakala
        </a>`;

        document.getElementById('etape-suite').innerHTML =
        `Consulter la collection sur
        <a href="https://nakala.fr/collection/${COLLECTION_ID}" target="_blank">
            Nakala
        </a>`;

        document.getElementById('steps').setAttribute('data-fr-current-step', '4');

    } catch (error) {
        console.error('Erreur lors du dépôt sur Nakala:', error);
        alert('Erreur lors du dépôt sur Nakala. Veuillez vérifier la console pour plus de détails.');
    }
}
