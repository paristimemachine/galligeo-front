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

/**
 * Gère l'état du bouton de géoréférencement
 * @param {string} state - 'loading', 'normal', 'disabled'
 * @param {string} customText - Texte personnalisé (optionnel)
 * @param {string} customTitle - Titre personnalisé pour le tooltip (optionnel)
 */
function setGeoreferencingButtonState(state, customText = null, customTitle = null) {
    const btnGeorefs = document.getElementById('btn_georef');
    if (!btnGeorefs) return;
    
    // Sauvegarder la largeur initiale si pas encore fait
    if (!btnGeorefs.dataset.originalWidth) {
        btnGeorefs.dataset.originalWidth = window.getComputedStyle(btnGeorefs).width;
    }
    
    switch(state) {
        case 'loading':
            btnGeorefs.disabled = true;
            btnGeorefs.style.backgroundColor = '#e74c3c';
            btnGeorefs.style.borderColor = '#e74c3c';
            btnGeorefs.style.color = '#ffffff';
            btnGeorefs.textContent = customText || 'Géoref en cours...';
            btnGeorefs.style.cursor = 'not-allowed';
            btnGeorefs.style.width = btnGeorefs.dataset.originalWidth; // Maintenir la largeur
            btnGeorefs.style.minWidth = btnGeorefs.dataset.originalWidth; // Force la largeur minimale
            btnGeorefs.classList.add('fr-btn--loading');
            btnGeorefs.title = customTitle || 'Traitement en cours, veuillez patienter...';
            break;
            
        case 'normal':
            btnGeorefs.disabled = false;
            btnGeorefs.style.backgroundColor = '';
            btnGeorefs.style.borderColor = '';
            btnGeorefs.style.color = '';
            btnGeorefs.textContent = customText || 'Géoréférencer';
            btnGeorefs.style.cursor = '';
            btnGeorefs.style.width = ''; // Retour à la largeur automatique
            btnGeorefs.style.minWidth = ''; // Retour à la largeur minimale automatique
            btnGeorefs.classList.remove('fr-btn--loading');
            btnGeorefs.title = customTitle || 'Géoréférencer cette carte';
            break;
            
        case 'disabled':
            btnGeorefs.disabled = true;
            btnGeorefs.style.backgroundColor = '';
            btnGeorefs.style.borderColor = '';
            btnGeorefs.style.color = '';
            btnGeorefs.textContent = customText || 'Géoréférencer';
            btnGeorefs.style.cursor = 'not-allowed';
            btnGeorefs.style.width = ''; // Retour à la largeur automatique
            btnGeorefs.style.minWidth = ''; // Retour à la largeur minimale automatique
            btnGeorefs.classList.remove('fr-btn--loading');
            btnGeorefs.title = customTitle || 'Action non disponible';
            break;
    }
}


function click_georef(image, points, polygon, input_ark) {

    console.log("click on georef")
    console.log(points)
    console.log(polygon)
    
    // Vérifier le statut d'authentification et informer l'utilisateur
    const isAuthenticated = window.ptmAuth && window.ptmAuth.isAuthenticated();
    console.log(`🔐 Géoréférencement demandé - Authentifié: ${isAuthenticated}`);
    
    if (!isAuthenticated) {
        console.log('⚠️ Mode anonyme - le géoréférencement pourrait ne pas fonctionner selon la configuration serveur');
        // Note: On continue quand même, l'erreur sera gérée dans georef_api_post si nécessaire
    }

    // Bloquer le bouton et le passer en état de chargement
    setGeoreferencingButtonState('loading');

    var urlToRessource = base_url + input_ark;
    // var points_serialized = JSON.stringify(points);

    //waiting animation on map
    right_map.fire('dataloading');

    // Vérifier que les dimensions de l'image sont définies
    const imageWidth = document.image_width_scaled || document.width_image;
    const imageHeight = document.image_height_scaled || document.height_image;
    
    if (!imageWidth || !imageHeight) {
        console.error('❌ Dimensions de l\'image non disponibles');
        alert('Erreur: Les dimensions de l\'image ne sont pas disponibles. Veuillez recharger l\'image.');
        setGeoreferencingButtonState('normal');
        right_map.fire('dataload');
        return;
    }
    
    console.log(`📐 Dimensions de l'image: ${imageWidth} x ${imageHeight}`);

   georef_api_post(urlToAPI, { 
     "gallica_ark_url": urlToRessource,
     "image_width": imageWidth,
     "image_height": imageHeight,
     "gcp_pairs": points,
     "clipping_polygon": polygon
   }).then((data) => {
     console.log(data);
     // Le bouton sera réactivé dans georef_api_post en cas de succès
   }).catch((error) => {
     console.error('Erreur lors du géoréférencement:', error);
     right_map.fire('dataload'); // Arrêter l'animation de chargement
     
     // Réactiver le bouton en cas d'erreur
     setGeoreferencingButtonState('normal');
     
     // Message d'erreur adapté selon le type d'erreur
     let userMessage = 'Erreur lors du géoréférencement.';
     
     if (error.message) {
       if (error.message.includes('422') || error.message.includes('authentification')) {
         // Erreur d'authentification - proposer la connexion
         const isAnonymous = !window.ptmAuth || !window.ptmAuth.isAuthenticated();
         if (isAnonymous) {
           userMessage = `⚠️ Géoréférencement actuellement limité aux utilisateurs connectés.

Cliquez sur "Se connecter avec ORCID" en haut à droite pour accéder au géoréférencement.

Vos points de contrôle resteront sauvegardés et seront transférés lors de votre connexion.`;
         } else {
           userMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.';
         }
       } else if (error.message.includes('Timeout')) {
         userMessage = 'Le géoréférencement prend trop de temps. Veuillez réessayer avec moins de points ou une image plus petite.';
       } else {
         userMessage = `Erreur: ${error.message}`;
       }
     }
     
     alert(userMessage);
   });
}

function display_result(input_ark) {
  window.open('./georef/?ark=' + input_ark, '_blank').focus();
}

async function georef_api_post(url = urlToAPI, data = {}) {
  // Préparer les headers avec authentification si disponible
  const headers = {
    "Content-Type": "application/json",
  };
  
  const isAuthenticated = window.ptmAuth && window.ptmAuth.isAuthenticated();
  console.log(`🔐 Géoréférencement - Utilisateur authentifié: ${isAuthenticated}`);
  
  // Préparer les données avec l'utilisateur approprié
  const apiData = { ...data };
  
  // Ajouter le token d'authentification si l'utilisateur est connecté
  if (isAuthenticated) {
    const token = window.ptmAuth.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🎫 Token d\'authentification ajouté');
    }
    // L'API utilisera l'utilisateur authentifié depuis le token
  } else {
    // Pour les utilisateurs anonymes, forcer l'utilisateur anonyme dans les données
    console.log('🔓 Utilisateur anonyme - préparation des headers et données...');
    
    // IMPORTANT: Ajouter l'utilisateur anonyme dans les données pour l'écriture en base
    apiData.user_orcid_id = '0000-GALLI-ANONY-ME00';
    
    // Headers pour identifier la requête anonyme
    const anonymousSession = 'anonymous-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    headers['X-Anonymous-Session'] = anonymousSession;
    headers['X-Anonymous-Mode'] = 'true';
    headers['X-Client-Type'] = 'galligeo-anonymous';
    
    console.log(`🔓 Session anonyme créée: ${anonymousSession}`);
    console.log(`👤 Utilisateur anonyme défini: ${apiData.user_orcid_id}`);
  }
  
  console.log(`📡 Envoi vers: ${url}`);
  console.log(`📦 Données:`, apiData);
  console.log(`📋 Headers:`, headers);

  // Créer un AbortController pour gérer le timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

  try {
    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: headers,
      redirect: "follow",
      referrerPolicy: "no-referrer",
      body: JSON.stringify(apiData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      document.getElementById('btn_display').disabled = false;
      right_map.fire('dataload');
      console.log("Carte géoréférencée !");

      console.log(input_ark)

    // Réactiver le bouton de géoréférencement après succès
    setGeoreferencingButtonState('normal');

    // Mettre à jour le statut de la carte vers "géoréférencée"
    // Pour les utilisateurs connectés, utiliser la nouvelle API optimisée
    if (window.ptmAuth && window.ptmAuth.isAuthenticated() && window.input_ark) {
      window.ptmAuth.updateWorkedMap(window.input_ark, 'georeferenced', {
        quality: 2 // Qualité par défaut pour géoréférencement réussi
      }).catch(error => {
        console.error('Erreur lors de la mise à jour du statut de la carte (utilisateur connecté):', error);
      });
    } 
    // Pour les utilisateurs anonymes, sauvegarder localement ET en API
    else if (window.input_ark && window.ptmAuth) {
      window.ptmAuth.saveAnonymousMapStatus(window.input_ark, 'georeferenced', { 
        quality: 2  // Qualité par défaut pour géoréférencement réussi
      }).catch(error => {
        console.error('Erreur lors de la sauvegarde locale du statut de la carte:', error);
      });
    }

    // Supprimer l'ancien layer géoréférencé s'il existe
    if (window.currentGeoreferencedLayer) {
      console.log("🔄 Suppression de l'ancien layer géoréférencé pour rafraîchir la vue");
      right_map.removeLayer(window.currentGeoreferencedLayer);
      window.currentGeoreferencedLayer = null;
      
      // Réinitialiser le contrôle d'opacité
      if (window.opacityControl) {
        window.opacityControl.reset();
      }
    }

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

    // Créer le nouveau layer avec un timestamp pour forcer le refresh du cache
    const timestamp = new Date().getTime();
    let galligeoLayer = L.tileLayer(URL_TILE_SERVER_SUB + '12148/' + input_ark + '/{z}/{x}/{y}.png?t=' + timestamp, {
      // minNativeZoom: parseInt(json.minzoom),
      // maxNativeZoom: parseInt(json.maxzoom),
      minZoom: 10,
      maxZoom: 19,
      // bounds: tile_bounds,
      attribution: '&copy; Gallica / PTM - Galligeo'
    }).addTo(right_map);

    galligeoLayer.bringToFront();
    
    // Stocker la référence du layer pour pouvoir le supprimer plus tard
    window.currentGeoreferencedLayer = galligeoLayer;
    
    // Afficher le contrôle d'opacité
    if (window.opacityControl) {
      console.log("🎨 Affichage du contrôle de transparence");
      window.opacityControl.show();
    }

    document.getElementById('btn_deposit').disabled = false;

    // add stepper
    document.getElementById('titre-etape-georef').textContent = "Consulter la carte géoréférencée";
    // document.getElementById('etape-georef').textContent = "Étape 2 sur 4";
    document.getElementById('etape-suite').textContent = "Déposer le résultat sur Nakala";
    document.getElementById('steps').setAttribute('data-fr-current-step', '3');

    return response.json();
  } else {
    // En cas d'erreur HTTP, gérer spécifiquement selon le statut
    setGeoreferencingButtonState('normal');
    right_map.fire('dataload');
    
    // Récupérer le détail de l'erreur depuis la réponse
    let errorMessage = `Erreur serveur: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.message || errorData.error) {
        errorMessage += ` - ${errorData.message || errorData.error}`;
      }
      
      // Gestion spécifique pour les erreurs 422 en mode anonyme
      if (response.status === 422) {
        if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
          console.warn('⚠️ Erreur 422 en mode anonyme - l\'API pourrait ne pas supporter les utilisateurs anonymes');
          console.warn('💡 Solution: Se connecter avec ORCID pour accéder au géoréférencement');
          
          errorMessage = `Le serveur de géoréférencement nécessite une authentification.
          
Deux options s'offrent à vous :
1. Connectez-vous avec votre compte ORCID pour accéder au géoréférencement complet
2. Ou attendez que l'équipe active le géoréférencement anonyme

Votre session de travail (points de contrôle) est sauvegardée localement et sera transférée lors de votre connexion.`;
        } else {
          errorMessage += '\n\nVeuillez vérifier votre token d\'authentification ou vous reconnecter.';
        }
      } else if (response.status === 401) {
        errorMessage = 'Authentification requise. Veuillez vous connecter pour utiliser le géoréférencement.';
      } else if (response.status === 403) {
        errorMessage = 'Accès refusé. Votre compte n\'a pas les permissions nécessaires pour le géoréférencement.';
      } else if (response.status === 500) {
        errorMessage = 'Erreur interne du serveur. Veuillez réessayer plus tard ou contacter l\'équipe technique.';
      }
    } catch (parseError) {
      console.warn('Impossible de parser la réponse d\'erreur:', parseError);
    }
    
    throw new Error(errorMessage);
  }
  } catch (error) {
    clearTimeout(timeoutId);
    
    // En cas d'erreur (timeout, réseau, etc.), réactiver le bouton
    setGeoreferencingButtonState('normal');
    right_map.fire('dataload');
    
    if (error.name === 'AbortError') {
      throw new Error('Timeout: Le géoréférencement prend trop de temps (>5min)');
    }
    
    throw error;
  }
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
