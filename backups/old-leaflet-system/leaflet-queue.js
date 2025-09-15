/**
 * Gestionnaire d'attente pour Leaflet
 * Permet de différer l'exécution de code jusqu'à ce que Leaflet soit disponible
 */

// Queue des fonctions en attente de Leaflet
let leafletQueue = [];
let leafletReady = false;

/**
 * Vérifie si Leaflet est déjà disponible
 */
function isLeafletAvailable() {
    return window.L && typeof window.L.map === 'function';
}

/**
 * Exécute une fonction quand Leaflet est disponible
 * @param {Function} callback - Fonction à exécuter
 * @param {string} name - Nom pour le debug
 */
function whenLeafletReady(callback, name = 'anonymous') {
    if (isLeafletAvailable()) {
        console.log(`✅ Leaflet disponible - exécution immédiate: ${name}`);
        try {
            callback();
        } catch (error) {
            console.error(`❌ Erreur dans ${name}:`, error);
        }
    } else {
        console.log(`⏳ Leaflet non disponible - ajout à la queue: ${name}`);
        leafletQueue.push({ callback, name });
    }
}

/**
 * Traite la queue des fonctions en attente
 */
function processLeafletQueue() {
    if (!isLeafletAvailable()) {
        console.warn('⚠️ Tentative de traitement de la queue mais Leaflet non disponible');
        return;
    }
    
    leafletReady = true;
    console.log(`🚀 Traitement de la queue Leaflet (${leafletQueue.length} éléments)`);
    
    while (leafletQueue.length > 0) {
        const { callback, name } = leafletQueue.shift();
        console.log(`▶️ Exécution différée: ${name}`);
        
        try {
            callback();
        } catch (error) {
            console.error(`❌ Erreur dans l'exécution différée de ${name}:`, error);
        }
    }
    
    console.log('✅ Queue Leaflet traitée complètement');
}

/**
 * Réinitialise le système (pour les tests)
 */
function resetLeafletQueue() {
    leafletQueue = [];
    leafletReady = false;
}

// Écouter les événements Leaflet
document.addEventListener('leafletReady', function(event) {
    console.log(`🎉 Événement leafletReady reçu (source: ${event.detail.source})`);
    processLeafletQueue();
});

document.addEventListener('leafletFailed', function(event) {
    console.error('💥 Leaflet a échoué définitivement:', event.detail.error);
    
    // Afficher une notification d'erreur critique
    showCriticalLeafletError();
});

/**
 * Affiche une erreur critique si Leaflet ne peut pas se charger
 */
function showCriticalLeafletError() {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'leaflet-critical-error';
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ff7675;
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 99999;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        max-width: 400px;
    `;
    
    errorDiv.innerHTML = `
        <h3 style="margin: 0 0 10px 0;">⚠️ Erreur Critique</h3>
        <p style="margin: 0 0 15px 0;">
            La bibliothèque cartographique (Leaflet) ne peut pas se charger sur ce réseau.
        </p>
        <p style="margin: 0 0 15px 0; font-size: 14px;">
            Essayez de changer de réseau ou contactez l'administrateur.
        </p>
        <button onclick="document.getElementById('leaflet-critical-error').remove(); location.reload();" style="
            background: white;
            color: #ff7675;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
        ">Recharger la page</button>
    `;
    
    document.body.appendChild(errorDiv);
}

// Vérification périodique si Leaflet devient disponible spontanément
let leafletCheckInterval = setInterval(() => {
    if (isLeafletAvailable() && !leafletReady) {
        console.log('🔍 Leaflet détecté par vérification périodique');
        clearInterval(leafletCheckInterval);
        
        document.dispatchEvent(new CustomEvent('leafletReady', { 
            detail: { source: 'periodic_check' } 
        }));
    }
}, 200);

// Arrêter la vérification après 10 secondes
setTimeout(() => {
    if (leafletCheckInterval) {
        clearInterval(leafletCheckInterval);
        leafletCheckInterval = null;
    }
}, 10000);

// Exposer les fonctions globalement
window.whenLeafletReady = whenLeafletReady;
window.isLeafletAvailable = isLeafletAvailable;
window.processLeafletQueue = processLeafletQueue;
window.resetLeafletQueue = resetLeafletQueue;
window.leafletQueue = leafletQueue;
