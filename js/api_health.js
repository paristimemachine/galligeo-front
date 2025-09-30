/**
 * Système de surveillance de la santé des APIs
 * Surveille l'état de l'API Gallica et du serveur de tuiles PTM
 */

class APIHealthMonitor {
    constructor() {
        this.gallicaStatus = 'unknown';
        this.ptmTileStatus = 'unknown';
        this.checkInterval = 30000; // Vérification toutes les 30 secondes
        this.timeoutDuration = 10000; // Timeout de 10 secondes
        
        // URLs à tester
        // TEMPORAIRE: URL de test IIIF - à remplacer par un endpoint health dédié
        this.gallicaTestUrl = 'https://gallica.bnf.fr/iiif/ark:/12148/btv1b90017179/f15/info.json';
        // TEMPORAIRE: URL de test pour le serveur de tuiles PTM - à remplacer par un endpoint health dédié
        this.ptmTileTestUrl = 'https://tile.ptm.huma-num.fr/tiles/ark/info_tiles/12148/btv1b53121232b';
        
        // Fallback si l'endpoint temporaire n'existe pas
        this.ptmTileFallbackUrl = 'https://ptm.huma-num.fr/tiles/osm/{z}/{x}/{y}.png';
        
        this.intervalId = null;
        
        this.init();
    }
    
    init() {
        console.log('Initialisation du moniteur de santé des APIs');
        
        // Vérification initiale
        this.checkAllServices();
        
        // Lancement du monitoring périodique
        this.startMonitoring();
        
        // Ajouter les indicateurs au DOM
        this.addHealthIndicators();
    }
    
    addHealthIndicators() {
        const footerParagraph = document.querySelector('.footer p');
        if (!footerParagraph) {
            console.warn('Élément footer non trouvé, impossible d\'ajouter les indicateurs de santé');
            return;
        }
        
        // Créer le conteneur des indicateurs de santé
        const healthContainer = document.createElement('span');
        healthContainer.id = 'api-health-indicators';
        healthContainer.style.cssText = `
            margin-left: auto;
            display: inline-flex;
            gap: 8px;
            align-items: center;
            margin-right: 10px;
        `;
        
        // Indicateur Gallica
        const gallicaIndicator = this.createIndicator('gallica', 'API Gallica');
        
        // Indicateur PTM Tiles
        const ptmIndicator = this.createIndicator('ptm', 'Serveur PTM');
        
        healthContainer.appendChild(gallicaIndicator);
        healthContainer.appendChild(ptmIndicator);
        
        // Ajouter à la fin du paragraphe du footer
        footerParagraph.appendChild(healthContainer);
    }
    
    createIndicator(type, label) {
        const indicator = document.createElement('span');
        indicator.className = 'api-health-indicator';
        indicator.id = `health-${type}`;
        indicator.title = `${label}: Vérification en cours...`;
        indicator.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.8em;
            padding: 2px 6px;
            border-radius: 3px;
            background-color: #f0f0f0;
            color: #666;
            cursor: help;
        `;
        
        const dot = document.createElement('span');
        dot.className = 'status-dot';
        dot.style.cssText = `
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #999;
            display: inline-block;
        `;
        
        const text = document.createElement('span');
        text.textContent = type.toUpperCase();
        text.style.fontSize = '0.75em';
        
        indicator.appendChild(dot);
        indicator.appendChild(text);
        
        return indicator;
    }
    
    updateIndicator(type, status, message = '') {
        const indicator = document.getElementById(`health-${type}`);
        if (!indicator) return;
        
        const dot = indicator.querySelector('.status-dot');
        const label = type === 'gallica' ? 'API Gallica' : 'Serveur PTM';
        
        // Couleurs et styles selon le statut
        let color, bgColor, title;
        
        switch (status) {
            case 'healthy':
                color = '#00AA00';
                bgColor = '#f0fff0';
                title = `${label}: Opérationnel`;
                break;
            case 'error':
                color = '#FF0000';
                bgColor = '#fff0f0';
                title = `${label}: Indisponible${message ? ` (${message})` : ''}`;
                break;
            case 'warning':
                color = '#FF8800';
                bgColor = '#fff8f0';
                title = `${label}: Dégradé${message ? ` (${message})` : ''}`;
                break;
            default:
                color = '#999';
                bgColor = '#f0f0f0';
                title = `${label}: Statut inconnu`;
        }
        
        if (dot) {
            dot.style.backgroundColor = color;
        }
        
        indicator.style.backgroundColor = bgColor;
        indicator.title = title;
        
        // Ajouter une animation lors du changement de statut
        indicator.style.transition = 'all 0.3s ease';
    }
    
    async checkGallicaHealth() {
        try {
            console.log('Vérification de l\'état de l\'API Gallica IIIF...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);
            
            // Test avec l'endpoint IIIF info.json (temporaire - en attendant un endpoint health)
            const response = await fetch(this.gallicaTestUrl, {
                method: 'GET', // Utiliser GET pour récupérer le JSON d'info IIIF
                signal: controller.signal,
                mode: 'cors'
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                // Vérifier en plus que le contenu JSON est valide pour l'API IIIF
                try {
                    const data = await response.json();
                    // Vérifier que c'est bien un document IIIF valide
                    if (data && (data['@context'] || data.protocol)) {
                        this.gallicaStatus = 'healthy';
                        this.updateIndicator('gallica', 'healthy');
                        console.log('API Gallica IIIF: OK');
                    } else {
                        this.gallicaStatus = 'warning';
                        this.updateIndicator('gallica', 'warning', 'Réponse inattendue');
                        console.warn('API Gallica IIIF: Réponse JSON invalide');
                    }
                } catch (jsonError) {
                    this.gallicaStatus = 'warning';
                    this.updateIndicator('gallica', 'warning', 'JSON invalide');
                    console.warn('API Gallica IIIF: Erreur parsing JSON');
                }
            } else {
                this.gallicaStatus = 'error';
                this.updateIndicator('gallica', 'error', `HTTP ${response.status}`);
                console.warn(`API Gallica IIIF: Erreur HTTP ${response.status}`);
            }
            
        } catch (error) {
            this.gallicaStatus = 'error';
            
            if (error.name === 'AbortError') {
                this.updateIndicator('gallica', 'error', 'Timeout');
                console.warn('API Gallica IIIF: Timeout');
            } else {
                this.updateIndicator('gallica', 'error', error.message);
                console.warn('API Gallica IIIF: Erreur', error);
            }
        }
    }
    
    async checkPTMTileHealth() {
        try {
            console.log('Vérification de l\'état du serveur PTM...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);
            
            let response;
            
            // Essayer d'abord l'endpoint temporaire info_tiles
            try {
                response = await fetch(this.ptmTileTestUrl, {
                    method: 'GET',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    // Vérifier que la réponse contient des informations sur les tuiles
                    try {
                        const data = await response.json();
                        // Vérifier que c'est bien une réponse d'info tuiles valide
                        // L'endpoint info_tiles PTM renvoie un objet avec des propriétés comme name, type, bounds, etc.
                        if (data && typeof data === 'object' && 
                            (data.name || data.type || data.bounds || data.maxzoom || data.tiles || data.tileInfo || data.layers || data.status)) {
                            this.ptmTileStatus = 'healthy';
                            this.updateIndicator('ptm', 'healthy');
                            console.log('Serveur PTM (info_tiles): OK');
                        } else {
                            this.ptmTileStatus = 'warning';
                            this.updateIndicator('ptm', 'warning', 'Réponse inattendue');
                            console.warn('Serveur PTM: Réponse JSON inattendue', data);
                        }
                    } catch (jsonError) {
                        // Si ce n'est pas du JSON, mais que le statut HTTP est OK
                        if (response.status === 200) {
                            this.ptmTileStatus = 'healthy';
                            this.updateIndicator('ptm', 'healthy');
                            console.log('Serveur PTM: OK (réponse non-JSON)');
                        } else {
                            this.ptmTileStatus = 'warning';
                            this.updateIndicator('ptm', 'warning', 'Format inattendu');
                            console.warn('Serveur PTM: Réponse dans un format inattendu');
                        }
                    }
                } else {
                    this.ptmTileStatus = 'warning';
                    this.updateIndicator('ptm', 'warning', `HTTP ${response.status}`);
                    console.warn(`Serveur PTM: Réponse HTTP ${response.status}`);
                }
                
            } catch (infoTilesError) {
                // Si l'endpoint info_tiles n'existe pas, essayer le fallback avec une tuile OSM
                console.log('Endpoint info_tiles non disponible, test avec une tuile OSM...');
                
                const fallbackController = new AbortController();
                const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), this.timeoutDuration);
                
                response = await fetch(this.ptmTileFallbackUrl.replace('{z}', '0').replace('{x}', '0').replace('{y}', '0'), {
                    method: 'HEAD',
                    signal: fallbackController.signal
                });
                
                clearTimeout(fallbackTimeoutId);
                
                if (response.ok) {
                    this.ptmTileStatus = 'healthy';
                    this.updateIndicator('ptm', 'healthy');
                    console.log('Serveur PTM (fallback): OK');
                } else {
                    this.ptmTileStatus = 'warning';
                    this.updateIndicator('ptm', 'warning', `HTTP ${response.status}`);
                    console.warn(`Serveur PTM (fallback): Réponse HTTP ${response.status}`);
                }
            }
            
        } catch (error) {
            this.ptmTileStatus = 'error';
            
            if (error.name === 'AbortError') {
                this.updateIndicator('ptm', 'error', 'Timeout');
                console.warn('Serveur PTM: Timeout');
            } else {
                this.updateIndicator('ptm', 'error', error.message);
                console.warn('Serveur PTM: Erreur', error);
            }
        }
    }
    
    async checkAllServices() {
        // Exécuter les vérifications en parallèle
        await Promise.allSettled([
            this.checkGallicaHealth(),
            this.checkPTMTileHealth()
        ]);
    }
    
    startMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        
        this.intervalId = setInterval(() => {
            this.checkAllServices();
        }, this.checkInterval);
        
        console.log(`Monitoring des APIs démarré (vérification toutes les ${this.checkInterval/1000}s)`);
    }
    
    stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('Monitoring des APIs arrêté');
        }
    }
    
    // Méthodes publiques pour obtenir le statut
    getGallicaStatus() {
        return this.gallicaStatus;
    }
    
    getPTMStatus() {
        return this.ptmTileStatus;
    }
    
    getOverallStatus() {
        if (this.gallicaStatus === 'healthy' && this.ptmTileStatus === 'healthy') {
            return 'healthy';
        } else if (this.gallicaStatus === 'error' || this.ptmTileStatus === 'error') {
            return 'error';
        } else {
            return 'warning';
        }
    }
    
    // Méthode pour forcer une vérification immédiate
    async forceCheck() {
        console.log('Vérification forcée des APIs...');
        await this.checkAllServices();
    }
}

// Instance globale
let apiHealthMonitor;

// Initialisation automatique quand le DOM est prêt
document.addEventListener('DOMContentLoaded', function() {
    // Attendre un peu pour s'assurer que la version est affichée
    setTimeout(() => {
        apiHealthMonitor = new APIHealthMonitor();
        
        // Rendre accessible globalement
        window.apiHealthMonitor = apiHealthMonitor;
    }, 1000);
});

// Export pour les tests ou usage externe
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIHealthMonitor;
}