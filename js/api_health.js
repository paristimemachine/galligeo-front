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
        this.gallicaTestUrl = 'https://gallica.bnf.fr/api/iiif/ark:/12148/btv1b53060669r/f1/info.json';
        this.ptmTileTestUrl = 'https://ptm.huma-num.fr/tiles/health';
        
        // Fallback si l'endpoint health n'existe pas
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
        const versionInfo = document.getElementById('app-version-info');
        if (!versionInfo) {
            console.warn('Élément version non trouvé, impossible d\'ajouter les indicateurs de santé');
            return;
        }
        
        // Créer le conteneur des indicateurs de santé
        const healthContainer = document.createElement('span');
        healthContainer.id = 'api-health-indicators';
        healthContainer.style.cssText = `
            margin-left: 10px;
            display: inline-flex;
            gap: 8px;
            align-items: center;
        `;
        
        // Indicateur Gallica
        const gallicaIndicator = this.createIndicator('gallica', 'API Gallica');
        
        // Indicateur PTM Tiles
        const ptmIndicator = this.createIndicator('ptm', 'Serveur PTM');
        
        healthContainer.appendChild(gallicaIndicator);
        healthContainer.appendChild(ptmIndicator);
        
        // Insérer après le span version-display
        const versionDisplay = document.getElementById('version-display');
        if (versionDisplay && versionDisplay.parentNode) {
            versionDisplay.parentNode.insertBefore(healthContainer, versionDisplay.nextSibling);
        }
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
            console.log('Vérification de l\'état de l\'API Gallica...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);
            
            const response = await fetch(this.gallicaTestUrl, {
                method: 'HEAD', // Utiliser HEAD pour éviter de télécharger le contenu
                signal: controller.signal,
                mode: 'cors'
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                this.gallicaStatus = 'healthy';
                this.updateIndicator('gallica', 'healthy');
                console.log('API Gallica: OK');
            } else {
                this.gallicaStatus = 'error';
                this.updateIndicator('gallica', 'error', `HTTP ${response.status}`);
                console.warn(`API Gallica: Erreur HTTP ${response.status}`);
            }
            
        } catch (error) {
            this.gallicaStatus = 'error';
            
            if (error.name === 'AbortError') {
                this.updateIndicator('gallica', 'error', 'Timeout');
                console.warn('API Gallica: Timeout');
            } else {
                this.updateIndicator('gallica', 'error', error.message);
                console.warn('API Gallica: Erreur', error);
            }
        }
    }
    
    async checkPTMTileHealth() {
        try {
            console.log('Vérification de l\'état du serveur PTM...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);
            
            let response;
            
            // Essayer d'abord l'endpoint dédié à la santé
            try {
                response = await fetch(this.ptmTileTestUrl, {
                    method: 'GET',
                    signal: controller.signal
                });
            } catch (healthError) {
                // Si l'endpoint health n'existe pas, tester avec une tuile OSM
                console.log('Endpoint health non disponible, test avec une tuile...');
                response = await fetch(this.ptmTileFallbackUrl.replace('{z}', '0').replace('{x}', '0').replace('{y}', '0'), {
                    method: 'HEAD',
                    signal: controller.signal
                });
            }
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                this.ptmTileStatus = 'healthy';
                this.updateIndicator('ptm', 'healthy');
                console.log('Serveur PTM: OK');
            } else {
                this.ptmTileStatus = 'warning';
                this.updateIndicator('ptm', 'warning', `HTTP ${response.status}`);
                console.warn(`Serveur PTM: Réponse HTTP ${response.status}`);
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