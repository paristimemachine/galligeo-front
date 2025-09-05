/**
 * Gestionnaire de sauvegarde temporaire des points de contrôle
 * Permet de sauvegarder automatiquement les points de contrôle en local
 * et de les restaurer en cas de perte de connexion ou de rafraîchissement de la page
 */
class ControlPointsBackup {
    constructor() {
        this.storageKey = 'galligeo-control-points-backup';
        this.autosaveInterval = null;
        this.isEnabled = true;
        this.maxBackups = 10; // Sera mis à jour par les paramètres
        this.autosaveFrequency = 30000; // 30 secondes par défaut
        this.lastSaveTime = null;
        
        // Écouter les changements de paramètres
        this.setupSettingsListener();
        
        // Charger les paramètres initiaux
        this.loadSettingsAndApply();
        
        // Démarrer la sauvegarde automatique
        this.startAutosave();
        
        // Écouter les événements de fermeture de page
        this.setupPageUnloadHandler();
        
        // Écouter les changements de points de contrôle
        this.setupControlPointsListener();
    }

    /**
     * Démarre la sauvegarde automatique selon la fréquence configurée
     */
    startAutosave() {
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
        }
        
        if (this.isEnabled) {
            // Utiliser la fréquence configurée
            this.autosaveInterval = setInterval(() => {
                this.saveCurrentState();
            }, this.autosaveFrequency);
        }
    }

    /**
     * Configure l'écoute des changements de paramètres
     */
    setupSettingsListener() {
        document.addEventListener('settingsUpdated', (event) => {
            this.applySettings(event.detail.settings);
        });

        document.addEventListener('settingsLoaded', (event) => {
            this.applySettings(event.detail.settings);
        });
    }

    /**
     * Charge et applique les paramètres initiaux
     */
    loadSettingsAndApply() {
        // Utiliser les paramètres du settingsManager s'il existe
        if (window.settingsManager && window.settingsManager.settings) {
            this.applySettings(window.settingsManager.settings);
        } else {
            // Sinon, essayer de charger depuis localStorage
            const savedSettings = localStorage.getItem('galligeo-settings');
            if (savedSettings) {
                try {
                    const settings = JSON.parse(savedSettings);
                    this.applySettings(settings);
                } catch (error) {
                    console.warn('Erreur lors du chargement des paramètres locaux:', error);
                }
            }
        }
    }

    /**
     * Applique les paramètres de sauvegarde
     */
    applySettings(settings) {
        // Activer/désactiver la sauvegarde automatique
        const autosaveEnabled = settings['checkbox-autosave'] !== undefined ? settings['checkbox-autosave'] : true;
        
        // Fréquence de sauvegarde (en secondes, convertir en millisecondes)
        const frequency = parseInt(settings['select-backup-frequency']) || 30;
        this.autosaveFrequency = frequency * 1000;
        
        // Nombre maximum de sauvegardes
        this.maxBackups = parseInt(settings['input-max-backups']) || 10;
        
        // Activer/désactiver selon les paramètres
        this.setEnabled(autosaveEnabled);
    }

    /**
     * Arrête la sauvegarde automatique
     */
    stopAutosave() {
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
            this.autosaveInterval = null;
        }
    }

    /**
     * Configure l'écoute des événements de fermeture de page
     */
    setupPageUnloadHandler() {
        window.addEventListener('beforeunload', () => {
            this.saveCurrentState('page-unload');
        });
        
        // Sauvegarder aussi lors de la perte de focus (changement d'onglet)
        window.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveCurrentState('visibility-change');
            }
        });
    }

    /**
     * Configure l'écoute des changements de points de contrôle
     */
    setupControlPointsListener() {
        // Observer les mutations du DOM pour détecter les changements de tableau
        const observer = new MutationObserver(() => {
            // Déclencher la sauvegarde avec un délai pour éviter trop d'appels
            this.debouncedSave();
        });

        // Observer le tableau des points de contrôle s'il existe
        const tableBody = document.getElementById('table_body');
        if (tableBody) {
            observer.observe(tableBody, { 
                childList: true, 
                subtree: true,
                attributes: true,
                characterData: true
            });
        }

        // Écouter aussi les événements personnalisés si ils existent
        document.addEventListener('controlPointsChanged', () => {
            this.debouncedSave();
        });
    }

    /**
     * Sauvegarde avec debounce pour éviter trop d'appels
     */
    debouncedSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(() => {
            this.saveCurrentState('user-action');
        }, 1000); // Attendre 1 seconde après le dernier changement
    }

    /**
     * Sauvegarde l'état actuel des points de contrôle
     */
    saveCurrentState(trigger = 'auto') {
        if (!this.isEnabled) {
            return;
        }

        try {
            const currentState = this.getCurrentControlPointsState();
            
            // Ne sauvegarder que s'il y a des données
            if (!currentState || (!currentState.pointPairs?.length && !currentState.polygon?.length)) {
                return;
            }

            const backup = {
                timestamp: new Date().toISOString(),
                trigger: trigger,
                sessionId: this.getOrCreateSessionId(),
                data: currentState,
                metadata: {
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    arkId: window.input_ark || null
                }
            };

            // Récupérer les sauvegardes existantes
            const existingBackups = this.getAllBackups();
            
            // Ajouter la nouvelle sauvegarde au début
            existingBackups.unshift(backup);
            
            // Limiter le nombre de sauvegardes
            if (existingBackups.length > this.maxBackups) {
                existingBackups.splice(this.maxBackups);
            }

            // Sauvegarder dans localStorage
            localStorage.setItem(this.storageKey, JSON.stringify(existingBackups));
            this.lastSaveTime = new Date();
            
            // Émettre un événement pour notifier la sauvegarde
            this.notifyBackupSaved(backup);

        } catch (error) {
            console.error('Erreur lors de la sauvegarde des points de contrôle:', error);
        }
    }

    /**
     * Récupère l'état actuel des points de contrôle
     */
    getCurrentControlPointsState() {
        const state = {
            pointPairs: [],
            polygon: [],
            settings: {},
            version: '1.0'
        };

        try {
            // Récupérer les points de contrôle du nouveau système
            if (window.pointPairs && Array.isArray(window.pointPairs)) {
                state.pointPairs = window.pointPairs.map(pair => ({
                    id: pair.id,
                    leftPoint: pair.leftPoint ? {
                        lat: pair.leftPoint.lat,
                        lng: pair.leftPoint.lng,
                        originalCoords: pair.leftPoint.originalCoords
                    } : null,
                    rightPoint: pair.rightPoint ? {
                        lat: pair.rightPoint.lat,
                        lng: pair.rightPoint.lng,
                        originalCoords: pair.rightPoint.originalCoords
                    } : null,
                    isComplete: pair.isComplete()
                }));
            }

            // Récupérer l'emprise/polygone
            if (window.currentPolygon && window.currentPolygon.points && window.currentPolygon.points.length > 0) {
                state.polygon = window.currentPolygon.points.map(point => ({
                    lat: point.lat,
                    lng: point.lng
                }));
            }

            // Aussi vérifier list_points_polygon_crop (ancienne structure)
            if ((!state.polygon || state.polygon.length === 0) && window.list_points_polygon_crop && window.list_points_polygon_crop.length > 0) {
                state.polygon = window.list_points_polygon_crop.map(point => ({
                    lat: point.lat,
                    lng: point.long || point.lng
                }));
            }

            // Récupérer les paramètres de géoréférencement si disponibles
            if (window.settingsManager && window.settingsManager.settings) {
                state.settings = { ...window.settingsManager.settings };
            }

            // Informations contextuelles
            state.arkId = window.input_ark || null;
            state.pointCounter = window.pointCounter || 0;
            state.inputMode = window.inputMode || 'disabled';
            state.currentInputMode = window.currentInputMode || 'points';

        } catch (error) {
            console.error('Erreur lors de la récupération de l\'état actuel:', error);
        }

        return state;
    }

    /**
     * Récupère ou crée un ID de session unique
     */
    getOrCreateSessionId() {
        let sessionId = sessionStorage.getItem('galligeo-session-id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('galligeo-session-id', sessionId);
        }
        return sessionId;
    }

    /**
     * Récupère toutes les sauvegardes existantes
     */
    getAllBackups() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Erreur lors de la récupération des sauvegardes:', error);
            return [];
        }
    }

    /**
     * Récupère la dernière sauvegarde
     */
    getLatestBackup() {
        const backups = this.getAllBackups();
        return backups.length > 0 ? backups[0] : null;
    }

    /**
     * Restaure un état sauvegardé
     */
    async restoreBackup(backup) {
        if (!backup || !backup.data) {
            console.error('Sauvegarde invalide');
            return false;
        }

        try {
            console.log('Restauration de la sauvegarde');

            // Vider l'état actuel
            if (typeof window.resetInputSystem === 'function') {
                window.resetInputSystem();
            }

            const data = backup.data;

            // Restaurer les points de contrôle
            if (data.pointPairs && Array.isArray(data.pointPairs)) {
                // Attendre que le système soit prêt
                await this.waitForSystemReady();

                // Restaurer les paires de points
                window.pointPairs = [];
                window.pointCounter = data.pointCounter || 0;

                for (const pairData of data.pointPairs) {
                    const pair = new ControlPointPair(pairData.id);
                    
                    // Restaurer le point gauche
                    if (pairData.leftPoint) {
                        const leftMarker = this.createMarkerFromData(pairData.leftPoint, pairData.id, 'left');
                        pair.leftPoint = {
                            lat: pairData.leftPoint.lat,
                            lng: pairData.leftPoint.lng,
                            marker: leftMarker,
                            originalCoords: pairData.leftPoint.originalCoords
                        };
                        
                        if (window.layer_img_pts_left) {
                            window.layer_img_pts_left.addLayer(leftMarker);
                        }
                    }

                    // Restaurer le point droit
                    if (pairData.rightPoint) {
                        const rightMarker = this.createMarkerFromData(pairData.rightPoint, pairData.id, 'right');
                        pair.rightPoint = {
                            lat: pairData.rightPoint.lat,
                            lng: pairData.rightPoint.lng,
                            marker: rightMarker,
                            originalCoords: pairData.rightPoint.originalCoords
                        };
                        
                        if (window.layer_img_pts_right) {
                            window.layer_img_pts_right.addLayer(rightMarker);
                        }
                    }

                    window.pointPairs.push(pair);
                }
            }

            // Restaurer l'emprise/polygone
            if (data.polygon && Array.isArray(data.polygon) && data.polygon.length > 0) {
                // Nettoyer l'ancienne emprise si elle existe
                if (window.currentPolygon) {
                    if (window.currentPolygon.layer && window.layer_img_emprise_left) {
                        window.layer_img_emprise_left.removeLayer(window.currentPolygon.layer);
                    }
                    if (window.currentPolygon.tempLayer && window.layer_img_emprise_left) {
                        window.layer_img_emprise_left.removeLayer(window.currentPolygon.tempLayer);
                    }
                }
                
                // Restaurer la structure currentPolygon
                window.currentPolygon = {
                    points: data.polygon.map(p => L.latLng(p.lat, p.lng)),
                    layer: null,
                    tempLayer: null
                };
                
                // Aussi mettre à jour l'ancienne structure pour compatibilité
                window.list_points_polygon_crop = data.polygon.map(p => ({
                    lat: p.lat,
                    long: p.lng
                }));
                
                // Forcer la création du layer visuel
                if (window.currentPolygon.points.length >= 3) {
                    try {
                        // Créer le polygone Leaflet avec le style habituel
                        const polygon = L.polygon(window.currentPolygon.points, {
                            fillColor: window.POLYGON_FILL_COLOR || 'rgba(255, 0, 0, 0)',
                            color: window.POLYGON_STROKE_COLOR || 'rgba(0, 55, 255)',
                            weight: 3,
                            fillOpacity: 0.2
                        });
                        
                        // Ajouter au layer
                        if (window.layer_img_emprise_left) {
                            window.layer_img_emprise_left.addLayer(polygon);
                            window.currentPolygon.layer = polygon;
                        }
                    } catch (error) {
                        console.error('Erreur lors de la création du layer d\'emprise:', error);
                    }
                }
                
                // Mettre à jour les données du polygone
                if (typeof window.updatePolygonData === 'function') {
                    window.updatePolygonData();
                }
            } else {
                // Pas d'emprise à restaurer
                window.currentPolygon = null;
                window.list_points_polygon_crop = [];
            }

            // Restaurer les paramètres
            if (data.settings && window.settingsManager) {
                window.settingsManager.settings = { ...data.settings };
            }

            // Mettre à jour l'interface
            if (typeof window.updateControlPointsTable === 'function') {
                window.updateControlPointsTable();
            }
            
            if (typeof window.checkGeoreferencingAvailability === 'function') {
                window.checkGeoreferencingAvailability();
            }

            this.notifyBackupRestored(backup);
            
            return true;

        } catch (error) {
            console.error('Erreur lors de la restauration:', error);
            return false;
        }
    }

    /**
     * Crée un marqueur à partir des données sauvegardées
     */
    createMarkerFromData(pointData, pointId, side) {
        const originalCoords = pointData.originalCoords || { lat: pointData.lat, lng: pointData.lng };
        const latLng = L.latLng(originalCoords.lat, originalCoords.lng);
        
        const marker = L.marker(latLng, {
            icon: typeof customMarker === 'function' ? new customMarker() : new L.Icon.Default(),
            draggable: true
        });

        // Ajouter le tooltip
        marker.bindTooltip(pointId.toString(), {
            permanent: true,
            direction: 'auto',
            className: "labels-points"
        });

        // Configurer les événements de drag si la fonction existe
        if (typeof window.setupMarkerDragEvents === 'function') {
            const pointPair = window.pointPairs.find(p => p.id === pointId) || { id: pointId };
            window.setupMarkerDragEvents(marker, pointPair, side);
        }

        return marker;
    }

    /**
     * Attend que le système soit prêt pour la restauration
     */
    async waitForSystemReady() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 secondes max
            
            const checkReady = () => {
                attempts++;
                if (window.ControlPointPair && window.layer_img_pts_left && window.layer_img_pts_right) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    resolve(); // Continuer même si pas complètement prêt
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
        });
    }

    /**
     * Vérifie s'il y a des sauvegardes disponibles pour restauration
     */
    hasBackupsAvailable() {
        const backups = this.getAllBackups();
        return backups.length > 0;
    }

    /**
     * Affiche une interface de restauration
     */
    showRestoreInterface() {
        const backups = this.getAllBackups();
        
        if (backups.length === 0) {
            alert('Aucune sauvegarde disponible');
            return;
        }

        const modal = document.getElementById('fr-modal-backup-restore');
        const container = document.getElementById('backup-list-container');
        
        if (!modal || !container) {
            console.error('Modale de sauvegarde non trouvée dans le DOM');
            return;
        }

        // Remplir le contenu de la modale
        container.innerHTML = backups.map((backup, index) => `
            <div class="fr-card fr-my-2w">
                <div class="fr-card__body">
                    <div class="fr-card__content">
                        <h4 class="fr-card__title">
                            ${new Date(backup.timestamp).toLocaleString('fr-FR')}
                        </h4>
                        <p class="fr-card__desc">
                            Type: ${backup.trigger === 'auto' ? 'Automatique' : 'Manuelle'}<br>
                            Points: ${backup.data?.pointPairs?.length || 0}<br>
                            Emprise: ${backup.data?.polygon?.length > 0 ? 'Oui' : 'Non'}
                        </p>
                        <div class="fr-card__footer">
                            <button class="fr-btn fr-btn--sm" onclick="window.controlPointsBackup.restoreBackupByIndex(${index}).then(() => window.controlPointsBackup.closeBackupModal())">
                                Restaurer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Ouvrir la modale en utilisant le système DSFR
        try {
            // Utiliser showModal() pour les navigateurs modernes
            modal.showModal();
            
            // Ajouter la classe DSFR pour l'ouverture
            modal.classList.add('fr-modal--opened');
            
            // S'assurer que la modale est visible (correction pour DSFR)
            modal.setAttribute('open', '');
            
            // Focus sur le premier élément focusable
            setTimeout(() => {
                const firstFocusableElement = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (firstFocusableElement) {
                    firstFocusableElement.focus();
                }
            }, 100);
            
        } catch (error) {
            console.error('Erreur lors de l\'ouverture de la modale:', error);
            // Fallback pour les navigateurs plus anciens
            modal.classList.add('fr-modal--opened');
            modal.setAttribute('open', '');
        }
    }

    /**
     * Ferme la modale de restauration
     */
    closeBackupModal() {
        const modal = document.getElementById('fr-modal-backup-restore');
        if (modal) {
            try {
                // Utiliser close() pour les navigateurs modernes
                modal.close();
                
                // Retirer la classe DSFR d'ouverture
                modal.classList.remove('fr-modal--opened');
                
                // S'assurer que la modale est cachée (correction pour DSFR)
                modal.removeAttribute('open');
                
            } catch (error) {
                console.error('Erreur lors de la fermeture de la modale:', error);
                // Fallback pour les navigateurs plus anciens
                modal.classList.remove('fr-modal--opened');
                modal.removeAttribute('open');
            }
        }
    }

    /**
     * Restaure une sauvegarde par son index
     */
    async restoreBackupByIndex(index) {
        try {
            const backups = this.getAllBackups();
            if (index >= 0 && index < backups.length) {
                const success = await this.restoreBackup(backups[index]);
                return success;
            } else {
                console.error('Index de sauvegarde invalide:', index);
                this.showNotification('Index de sauvegarde invalide', 'error');
                return false;
            }
        } catch (error) {
            console.error('Erreur lors de la restauration par index:', error);
            this.showNotification('Erreur lors de la restauration: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * Supprime toutes les sauvegardes
     */
    clearAllBackups() {
        if (confirm('Êtes-vous sûr de vouloir supprimer toutes les sauvegardes ?')) {
            localStorage.removeItem(this.storageKey);
            this.showNotification('Toutes les sauvegardes ont été supprimées', 'info');
        }
    }

    /**
     * Vide toutes les sauvegardes en toute sécurité (pour la modale)
     */
    clearAllBackupsSafely() {
        try {
            if (confirm('Êtes-vous sûr de vouloir supprimer toutes les sauvegardes ?')) {
                localStorage.removeItem(this.storageKey);
                this.closeBackupModal();
                this.showNotification('Toutes les sauvegardes ont été supprimées', 'success');
            }
        } catch (error) {
            console.error('Erreur lors de la suppression des sauvegardes:', error);
            this.showNotification('Erreur lors de la suppression: ' + error.message, 'error');
        }
    }

    /**
     * Obtient le libellé d'un déclencheur
     */
    getTriggerLabel(trigger) {
        const labels = {
            'auto': 'Automatique',
            'user-action': 'Action utilisateur',
            'page-unload': 'Fermeture de page',
            'visibility-change': 'Changement d\'onglet',
            'manual': 'Manuel'
        };
        return labels[trigger] || trigger;
    }

    /**
     * Vérifie automatiquement s'il faut proposer une restauration au démarrage
     */
    async checkForAutoRestore() {
        // Ne pas restaurer automatiquement s'il y a déjà des points
        if (window.pointPairs && window.pointPairs.length > 0) {
            return;
        }

        const latestBackup = this.getLatestBackup();
        
        if (!latestBackup) {
            return;
        }

        // Proposer la restauration si la sauvegarde est récente (moins de 24h)
        const backupAge = Date.now() - new Date(latestBackup.timestamp).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 heures

        if (backupAge < maxAge && latestBackup.data.pointPairs?.length > 0) {
            const pointsCount = latestBackup.data.pointPairs.length;
            const polygonInfo = latestBackup.data.polygon?.length ? ` et une emprise` : '';
            
            if (confirm(`Une sauvegarde récente a été trouvée avec ${pointsCount} paire(s) de points${polygonInfo}.\n\nVoulez-vous la restaurer ?`)) {
                const success = await this.restoreBackup(latestBackup);
                if (success) {
                    this.showNotification('Sauvegarde restaurée automatiquement', 'success');
                }
            }
        }
    }

    /**
     * Notifie qu'une sauvegarde a été effectuée
     */
    notifyBackupSaved(backup) {
        const event = new CustomEvent('controlPointsBackupSaved', {
            detail: { backup }
        });
        document.dispatchEvent(event);
    }

    /**
     * Notifie qu'une sauvegarde a été restaurée
     */
    notifyBackupRestored(backup) {
        const event = new CustomEvent('controlPointsBackupRestored', {
            detail: { backup }
        });
        document.dispatchEvent(event);
    }

    /**
     * Active ou désactive la sauvegarde automatique
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (enabled) {
            this.startAutosave();
        } else {
            this.stopAutosave();
        }
    }

    /**
     * Affiche une notification
     */
    showNotification(message, type = 'info') {
        // Utiliser le système de notification du settings-manager s'il existe
        if (window.settingsManager && typeof window.settingsManager.showNotification === 'function') {
            window.settingsManager.showNotification(message, type);
        } else {
            // Fallback : alerte simple
            alert(message);
        }
    }

    /**
     * Obtient des statistiques sur les sauvegardes
     */
    getBackupStats() {
        const backups = this.getAllBackups();
        
        return {
            total: backups.length,
            latest: backups[0]?.timestamp || null,
            totalPoints: backups.reduce((sum, backup) => sum + (backup.data.pointPairs?.length || 0), 0),
            enabled: this.isEnabled,
            lastSave: this.lastSaveTime
        };
    }
}

// Initialisation globale
window.controlPointsBackup = new ControlPointsBackup();

// Rendre certaines fonctions disponibles globalement pour les boutons HTML
window.restoreBackupByIndex = function(index) {
    return window.controlPointsBackup.restoreBackupByIndex(index);
};

// Fonction pour vérifier la restauration automatique au démarrage
document.addEventListener('DOMContentLoaded', () => {
    // Attendre un peu que le système soit initialisé
    setTimeout(async () => {
        await window.controlPointsBackup.checkForAutoRestore();
    }, 2000);
});

console.log('Module de sauvegarde des points de contrôle chargé');

// Fonction de test globale pour debug
window.testBackupSystem = function() {
    console.log('🧪 Test du système de sauvegarde');
    
    if (window.controlPointsBackup) {
        const currentState = window.controlPointsBackup.getCurrentControlPointsState();
        
        console.log('📊 État actuel capturé:', {
            points: currentState.pointPairs?.length || 0,
            polygon: currentState.polygon?.length || 0,
            emprisePoints: window.currentPolygon?.points?.length || 0,
            listPolygonCrop: window.list_points_polygon_crop?.length || 0
        });
        
        // Afficher les détails de l'emprise
        if (window.currentPolygon && window.currentPolygon.points) {
            console.log('🗺️ Détails emprise currentPolygon:', window.currentPolygon.points.map(p => ({lat: p.lat, lng: p.lng})));
        }
        
        if (window.list_points_polygon_crop && window.list_points_polygon_crop.length > 0) {
            console.log('📋 Détails list_points_polygon_crop:', window.list_points_polygon_crop.map(p => ({lat: p.lat, lng: p.long || p.lng})));
        }
        
        console.log('💾 Forcer une sauvegarde...');
        window.controlPointsBackup.saveCurrentState('test-manual');
        
        const backups = window.controlPointsBackup.getAllBackups();
        console.log('📚 Sauvegardes existantes:', backups.length);
        
        if (backups.length > 0) {
            console.log('📋 Dernière sauvegarde:', backups[0]);
        }
    } else {
        console.error('❌ System de sauvegarde non initialisé');
    }
};

// Fonction de test pour la restauration
window.testBackupRestore = function() {
    console.log('🔄 Test de restauration');
    
    if (window.controlPointsBackup) {
        const backups = window.controlPointsBackup.getAllBackups();
        if (backups.length > 0) {
            console.log('🔄 Restauration de la dernière sauvegarde...');
            window.controlPointsBackup.restoreBackup(backups[0]).then(success => {
                console.log('Restauration réussie:', success);
                
                // Vérifier l'état après restauration
                setTimeout(() => {
                    console.log('État après restauration:', {
                        points: window.pointPairs?.length || 0,
                        emprise: window.currentPolygon?.points?.length || 0,
                        listPolygonCrop: window.list_points_polygon_crop?.length || 0
                    });
                }, 500);
            });
        } else {
            console.log('❌ Aucune sauvegarde disponible pour restaurer');
        }
    }
};

// Fonction de test pour la modale
window.testBackupModal = function() {
    console.log('🖼️ Test de la modale de restauration');
    
    if (window.controlPointsBackup) {
        const backups = window.controlPointsBackup.getAllBackups();
        console.log('📚 Nombre de sauvegardes:', backups.length);
        
        if (backups.length > 0) {
            console.log('📋 Contenu des sauvegardes:', backups.map(b => ({
                timestamp: b.timestamp,
                trigger: b.trigger,
                points: b.data?.pointPairs?.length || 0,
                polygon: b.data?.polygon?.length || 0
            })));
            
            // Tester l'ouverture de la modale
            window.controlPointsBackup.showRestoreInterface();
        } else {
            console.log('❌ Aucune sauvegarde pour tester la modale');
        }
    }
};

// Fonction pour tester le bouton sauver
window.testSaveButton = function() {
    console.log('💾 Test du bouton sauver');
    
    const saveBtn = document.getElementById('btn_save_backup');
    if (saveBtn) {
        console.log('Bouton sauver trouvé, état:', {
            disabled: saveBtn.disabled,
            opacity: saveBtn.style.opacity,
            title: saveBtn.title
        });
        
        // Simuler un clic
        if (!saveBtn.disabled) {
            console.log('🖱️ Simulation d\'un clic sur sauver...');
            saveBtn.click();
        } else {
            console.log('❌ Bouton désactivé');
        }
    } else {
        console.error('❌ Bouton sauver non trouvé');
    }
};

// Configuration des event listeners pour la modale de restauration
document.addEventListener('DOMContentLoaded', function() {
    // Gestion du bouton de fermeture
    const closeButton = document.querySelector('#fr-modal-backup-restore .fr-link--close');
    if (closeButton) {
        closeButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.controlPointsBackup.closeBackupModal();
        });
    }
    
    // Gestion du bouton "Annuler" dans le footer
    const cancelButton = document.querySelector('#fr-modal-backup-restore button[aria-controls="fr-modal-backup-restore"]');
    if (cancelButton) {
        cancelButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.controlPointsBackup.closeBackupModal();
        });
    }
    
    // Gestion de la fermeture par Échap
    const modal = document.getElementById('fr-modal-backup-restore');
    if (modal) {
        modal.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                window.controlPointsBackup.closeBackupModal();
            }
        });
        
        // Gestion du clic sur le backdrop
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                window.controlPointsBackup.closeBackupModal();
            }
        });
    }
});
