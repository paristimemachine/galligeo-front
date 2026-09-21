const urlParams = new URLSearchParams(window.location.search);
ark = urlParams.get('ark');
const folioParam = urlParams.get('f');

if(ark) {
    document.getElementById('search-784-input').value = base_url + ark + (folioParam ? '/' + folioParam + '.item' : '');

    console.log('Chargement d\'une carte via l\'URL avec ARK:', ark, 'feuille:', folioParam || 'f1');
    
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (window.workedMapsManager && ark) {
                window.workedMapsManager.addWorkedMap(ark).catch(error => {
                    // Erreur silencieuse
                });
            }
        }, 3000);
    });
    
    if (window.ensureMetadataControlAvailable) {
        window.ensureMetadataControlAvailable()
            .then(() => {
                console.log('Contrôle de métadonnées initialisé, chargement de la carte');
                load_ark_picture();
            })
            .catch((error) => {
                console.warn('Impossible d\'initialiser le contrôle de métadonnées:', error);
                load_ark_picture();
            });
    } else {
        console.log('Fonction ensureMetadataControlAvailable non disponible, chargement avec délai');
        setTimeout(() => {
            load_ark_picture();
        }, 1500);
    }
}