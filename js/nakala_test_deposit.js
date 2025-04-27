async function deposerSurNakala() {

    // Configuration
    const API_URL       = 'https://apitest.nakala.fr'; // ou production 'https://api.nakala.fr'

    const UPLOAD_EP = API_URL + '/datas/uploads';
    const CREATE_EP = API_URL + '/datas';

    const COLLECTION_ID = '10.34847/nkl.c57c6ep9';

    const apiKey = '01234567-89ab-cdef-0123-456789abcdef'

    const nom = document.getElementById('input-family-name-1').value;
    const prenom = document.getElementById('input-firstname-1').value;
    const institution = document.getElementById('input-institution').value;


    // 1. Récupérer votre “fichier local” via fetch
    //    (ATTN: le chemin doit être servi par votre serveur web)
    const fileResp = await fetch('js/coords.txt');
    if (!fileResp.ok) {
        return alert(`Impossible de charger coords.txt (${fileResp.status})`);
    }
    const fileBlob = await fileResp.blob();

    // 2. Préparer l'uploadForm et y ajouter le Blob
    const uploadForm = new FormData();
    // Le troisième argument donne le nom du fichier côté Nakala
    uploadForm.append('file', fileBlob, 'coords.txt');

    // 3. Envoyer sur /datas/uploads
    const uploadResp = await fetch(UPLOAD_EP, {
        method: 'POST',
        headers: { 'X-API-KEY': apiKey },
        body: uploadForm
    });
    if (!uploadResp.ok) {
        const errText = await uploadResp.text();
        console.error('Échec upload:', uploadResp.status, errText);
        return alert('Erreur lors de l’upload de coords.txt');
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
    const url_tile_ptm_sub = 'https://{s}.tile.ptm.huma-num.fr/tiles/ark/12148/' + input_ark + '/{x}/{y}/{z}.png';

    const DESCRIPTION = "L'image géoréférencée est visible sur le site de Gallica, à l'adresse suivante : " + url_gallica + '\n\n' +
        "Cette image a été géoréférencée par le projet Galligeo, qui vise à rendre accessible la cartographie historique de la BnF dans un format géoréférencée. "  + '\n\n' +
        "Les points de contrôle ont été créés par des bénévoles, et sont disponibles sous la forme d'un fichier points.txt dans le dépôt"  + '\n\n' +
        "La carte géoréférencée est visible à l'adresse suivante : " +  url_app_ptm + '\n\n' +
        "Le flux de tuile peut être utilisé dans un SIG, avec l'URL suivante : " + url_tile_ptm_sub + '\n\n' +
        "Les données sont disponibles sous la licence " + LICENSE + ", et peuvent être utilisées pour des projets de recherche ou d'enseignement."  + '\n\n' +
        "Pour toute question, vous pouvez contacter l'équipe de GallicaGeo à l'adresse suivante : galligeo@ptm.huma-num.fr"

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
    // Handle fuzzy dates like "18.." (1800-1899)
    if (formattedDate.match(/^\d{2}\.\.$/)) {
        formattedDate = formattedDate.replace('..', '00');
    }
    // Ensure we have a valid 4-digit year
    if (formattedDate && formattedDate.length >= 4) {
        metas.push({
            "value": formattedDate.substring(0, 4),  // Take only first 4 characters
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
            description: 'Coordinates file'
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

        // fermer la modale
        document.getElementById('fr-modal-deposit').style.display = 'none';


        // add final stepper
        document.getElementById('titre-etape-georef').textContent = "Fin : consulter le dépôt sur <a href='https://test.nakala.fr/collection/10.34847/nkl.c57c6ep9' target='_blank'>Nakala</a>";
        document.getElementById('etape-suite').innerHTML = "Consulter la collection sur <a href='https://test.nakala.fr/collection/10.34847/nkl.c57c6ep9' target='_blank'>Nakala</a>";
        document.getElementById('steps').setAttribute('data-fr-current-step', '4');

    } catch (error) {
        console.error('Erreur lors du dépôt sur Nakala:', error);
        alert('Erreur lors du dépôt sur Nakala. Veuillez vérifier la console pour plus de détails.');
    }
}