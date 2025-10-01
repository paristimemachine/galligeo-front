// UEL Galligeo with an akr as params
const urlParams = new URLSearchParams(window.location.search);
// urlParams.forEach((value, key) => {
//     console.log(`${key}: ${value}`);
// });
ark = urlParams.get('ark');

if(ark) {
    document.getElementById('search-784-input').value = base_url + ark;
    
    // S'assurer que le contrôle de métadonnées est disponible avant de charger l'image
    console.log('Chargement d\'une carte via l\'URL avec ARK:', ark);
    
    // Ajouter la carte à la liste des cartes travaillées si l'utilisateur est connecté
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (window.ptmAuth && window.ptmAuth.isAuthenticated() && window.workedMapsManager && ark) {
                window.workedMapsManager.addWorkedMap(ark).catch(error => {
                    // Erreur silencieuse
                });
            }
        }, 3000); // Attendre que tout soit bien initialisé
    });
    
    if (window.ensureMetadataControlAvailable) {
        window.ensureMetadataControlAvailable()
            .then(() => {
                console.log('Contrôle de métadonnées initialisé, chargement de la carte');
                load_ark_picture();
            })
            .catch((error) => {
                console.warn('Impossible d\'initialiser le contrôle de métadonnées:', error);
                // Charger quand même la carte, les métadonnées seront disponibles plus tard
                load_ark_picture();
            });
    } else {
        // Fallback : attendre un peu puis charger
        console.log('Fonction ensureMetadataControlAvailable non disponible, chargement avec délai');
        setTimeout(() => {
            load_ark_picture();
        }, 1500);
    }
}