/**
 * Gestionnaire des cartes travaillées par l'utilisateur
 * Gère l'affichage et la traçabilité des cartes géoréférencées
 */
class WorkedMapsManager {
    constructor() {
        this.workedMaps = [];
        this.statusLabels = {
            'en-cours': 'En cours',
            'georeferenced': 'Géoréférencée',
            'deposee': 'Déposée'
        };
        this.statusColors = {
            'en-cours': 'fr-tag--blue-france',
            'georeferenced': 'fr-tag--green-emeraude',
            'deposee': 'fr-tag--purple-glycine'
        };
    }

    /**
     * Charge les cartes travaillées depuis l'API ou le localStorage
     */
    async loadWorkedMaps() {
        try {
            console.log('Chargement des cartes travaillées...');
            
            let workedMaps = [];
            
            // Vérifier si l'utilisateur est connecté
            if (window.ptmAuth && window.ptmAuth.isAuthenticated()) {
                // Utilisateur connecté : charger depuis l'API
                workedMaps = await window.ptmAuth.getWorkedMaps();
                console.log('Cartes travaillées récupérées depuis l\'API:', workedMaps);
            } else {
                // Utilisateur anonyme : charger depuis le localStorage
                workedMaps = window.ptmAuth.getAnonymousWorkedMaps();
                console.log('Cartes travaillées récupérées depuis le localStorage (anonyme):', workedMaps);
            }
            
            this.workedMaps = workedMaps;
            return workedMaps;
        } catch (error) {
            console.error('Erreur lors du chargement des cartes travaillées:', error);
            return [];
        }
    }

    /**
     * Récupère les métadonnées Gallica pour un ARK donné
     * Réutilise la logique du CartoqueteManager
     */
    async getGallicaMetadata(arkId) {
        try {
            const manifestUrl = `https://openapi.bnf.fr/iiif/presentation/v3/ark:/12148/${arkId}/manifest.json`;
            console.log(`Chargement des métadonnées pour ${arkId}`);
            
            const response = await fetch(manifestUrl);
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Extraire les métadonnées utiles (format IIIF v3)
            const metadata = {};
            
            // Récupérer le canvas (items[0] dans IIIF v3)
            const canvas = data.items && data.items[0];
            
            // Ajouter les dimensions si disponibles
            if (canvas && canvas.height && canvas.width) {
                if (!data.metadata) data.metadata = [];
                data.metadata.push(
                    { label: { fr: ['Hauteur'], en: ['Height'] }, value: { none: [canvas.height] } },
                    { label: { fr: ['Largeur'], en: ['Width'] }, value: { none: [canvas.width] } }
                );
            }

            // Traduction des labels
            const labelMapping = {
                'Title': 'Titre',
                'Creator': 'Créateur',
                'Publisher': 'Éditeur',
                'Date': 'Date',
                'Format': 'Format',
                'Language': 'Langue',
                'Type': 'Type',
                'Height': 'Hauteur',
                'Width': 'Largeur',
                'Source': 'Source',
                'Relation': 'Relation',
                'Coverage': 'Couverture',
                'Rights': 'Droits',
                'Description': 'Description',
                'Subject': 'Sujet',
                'Contributor': 'Contributeur',
                'Identifier': 'Identifiant',
                'Shelfmark': 'Cote',
                'Repository': 'Référentiel',
                'Digitised by': 'Numérisé par',
            };

            // Construire le dictionnaire de métadonnées (format IIIF v3)
            if (data.metadata) {
                data.metadata.forEach(element => {
                    // Extraire le label (peut être dans différentes langues)
                    let label = element.label;
                    if (typeof label === 'object') {
                        label = label.fr?.[0] || label.en?.[0] || label.none?.[0] || '';
                    }
                    
                    const frenchLabel = labelMapping[label] || label;
                    
                    // Extraire la valeur (peut être dans différentes langues)
                    let value = element.value;
                    if (typeof value === 'object') {
                        value = value.fr?.[0] || value.en?.[0] || value.none?.[0] || '';
                    }
                    
                    if (Array.isArray(value)) {
                        metadata[frenchLabel] = value.join(', ');
                    } else {
                        metadata[frenchLabel] = value;
                    }
                });
            }

            // Générer l'URL de la vignette
            const thumbnailUrl = this.generateThumbnailUrl(arkId);
            
            return {
                arkId,
                metadata,
                thumbnailUrl,
                gallicaUrl: `https://gallica.bnf.fr/ark:/12148/${arkId}`
            };
            
        } catch (error) {
            console.error(`Erreur lors du chargement des métadonnées pour ${arkId}:`, error);
            return {
                arkId,
                metadata: {
                    'Titre': 'Métadonnées non disponibles',
                    'Créateur': 'Inconnu',
                    'Date': 'Inconnue'
                },
                thumbnailUrl: null,
                gallicaUrl: `https://gallica.bnf.fr/ark:/12148/${arkId}`,
                error: true
            };
        }
    }

    /**
     * Génère l'URL de la vignette pour un ARK
     */
    generateThumbnailUrl(arkId) {
        // Utiliser l'API IIIF pour générer une vignette de 300px de large
        return `https://gallica.bnf.fr/iiif/ark:/12148/${arkId}/f1/full/300,/0/native.jpg`;
    }

    /**
     * Génère une carte DSFR pour une carte travaillée
     */
    generateCardHTML(workedMap, metadata) {
        const title = metadata.metadata['Titre'] || 'Titre non disponible';
        const creator = metadata.metadata['Créateur'] || '';
        const date = metadata.metadata['Date'] || '';
        const arkId = workedMap.ark;
        const thumbnailUrl = metadata.thumbnailUrl;
        const gallicaUrl = metadata.gallicaUrl;
        const georefUrl = `https://app.ptm.huma-num.fr/galligeo/georef/?ark=${arkId}`;
        const status = workedMap.status || 'en-cours';
        const statusLabel = this.statusLabels[status];
        const statusColor = this.statusColors[status];

        // Construire la description
        let description = '';
        if (creator && date) {
            description = `${creator} - ${date}`;
        } else if (creator) {
            description = creator;
        } else if (date) {
            description = date;
        }

        // Construire les liens selon le statut
        let linksHTML = '';
        
        // Lien vers Gallica (toujours présent)
        linksHTML += `<p class="fr-card__desc">
            <a href="${gallicaUrl}" target="_blank" rel="noopener">Voir la notice Gallica</a>
        </p>`;

        // Liens spécifiques selon le statut
        if (status === 'en-cours') {
            linksHTML += `<p class="fr-card__desc">
                <a href="${georefUrl}" target="_blank" rel="noopener">Continuer le géoréférencement</a>
            </p>`;
        } else if (status === 'georeferenced') {
            linksHTML += `<p class="fr-card__desc">
                <a href="${georefUrl}" target="_blank" rel="noopener">Voir le géoréférencement</a>
            </p>`;
            // Ajouter un bouton pour proposer le dépôt sur Nakala
            linksHTML += `<p class="fr-card__desc">
                <button class="fr-btn fr-btn--sm fr-btn--secondary fr-btn--deposit" 
                        onclick="window.workedMapsManager.openDepositModalForMap('${arkId}')"
                        title="Déposer cette carte géoréférencée sur Nakala">
                    <span class="fr-icon-upload-line" aria-hidden="true"></span>
                    Déposer sur Nakala
                </button>
            </p>`;
        } else if (status === 'deposee') {
            linksHTML += `<p class="fr-card__desc">
                <a href="${georefUrl}" target="_blank" rel="noopener">Voir le géoréférencement</a>
            </p>`;
            
            // Ajouter le lien Nakala si disponible
            if (workedMap.doi) {
                linksHTML += `<p class="fr-card__desc">
                    <a href="https://doi.org/${workedMap.doi}" target="_blank" rel="noopener">Voir sur Nakala</a>
                </p>`;
            }
        }

        // Informations de traçabilité
        const firstWorked = workedMap.firstWorked ? new Date(workedMap.firstWorked).toLocaleDateString('fr-FR') : '';
        const lastUpdated = workedMap.lastUpdated ? new Date(workedMap.lastUpdated).toLocaleDateString('fr-FR') : '';

        return `
            <div class="fr-col-md-6 fr-col">
                <div class="fr-card">
                    <div class="fr-card__body">
                        <div class="fr-card__content">
                            <h4 class="fr-card__title">
                                <a href="${gallicaUrl}" target="_blank" rel="noopener">${title}</a>
                            </h4>
                            ${description ? `<p class="fr-card__desc">${description}</p>` : ''}
                            ${linksHTML}
                            <div class="fr-card__start">
                                <ul class="fr-tags-group">
                                    <li><p class="fr-tag ${statusColor}">${statusLabel}</p></li>
                                    <li><p class="fr-tag fr-tag--blue-france">Galligeo</p></li>
                                </ul>
                                <p class="fr-card__detail fr-icon-map-pin-2-fill">Carte travaillée</p>
                                ${firstWorked ? `<p class="fr-card__detail fr-icon-calendar-line">Première fois: ${firstWorked}</p>` : ''}
                                ${lastUpdated ? `<p class="fr-card__detail fr-icon-refresh-line">Dernière modification: ${lastUpdated}</p>` : ''}
                            </div>
                        </div>
                    </div>
                    ${thumbnailUrl && !metadata.error ? `
                    <div class="fr-card__header">
                        <div class="fr-card__img">
                            <img class="fr-responsive-img" 
                                 src="${thumbnailUrl}" 
                                 alt="${title}"
                                 onerror="this.parentElement.style.display='none';" />
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Affiche toutes les cartes travaillées dans l'onglet "Mes cartes"
     */
    async displayWorkedMaps() {
        try {
            console.log('Affichage des cartes travaillées...');
            
            // Chercher le conteneur des cartes travaillées
            let workedMapsContainer = document.getElementById('worked-maps-container');
            
            if (!workedMapsContainer) {
                console.warn('Conteneur des cartes travaillées non trouvé');
                return;
            }

            // Afficher un indicateur de chargement
            workedMapsContainer.innerHTML = `
                <div class="fr-col-12">
                    <div class="fr-alert fr-alert--info">
                        <p>Chargement de vos cartes travaillées...</p>
                    </div>
                </div>
            `;

            // Charger les cartes travaillées
            const workedMaps = await this.loadWorkedMaps();
            
            if (workedMaps.length === 0) {
                // Cacher la section des cartes travaillées s'il n'y en a pas
                const workedMapsSection = document.getElementById('worked-maps-section');
                if (workedMapsSection) {
                    workedMapsSection.style.display = 'none';
                }
                
                workedMapsContainer.innerHTML = `
                    <div class="fr-col-12">
                        <div class="fr-alert fr-alert--info">
                            <p>Aucune carte travaillée trouvée. Commencez à géoréférencer une carte pour qu'elle apparaisse ici.</p>
                        </div>
                    </div>
                `;
                return;
            }

            // Charger les métadonnées pour chaque carte travaillée
            const cardsHTML = [];
            for (const workedMap of workedMaps) {
                try {
                    const metadata = await this.getGallicaMetadata(workedMap.ark);
                    const cardHTML = this.generateCardHTML(workedMap, metadata);
                    cardsHTML.push(cardHTML);
                } catch (error) {
                    console.error(`Erreur pour la carte travaillée ${workedMap.ark}:`, error);
                    // Continuer avec les autres cartes
                }
            }

            // Afficher toutes les cartes
            if (cardsHTML.length > 0) {
                workedMapsContainer.innerHTML = cardsHTML.join('');
                
                // Afficher la section des cartes travaillées
                const workedMapsSection = document.getElementById('worked-maps-section');
                if (workedMapsSection) {
                    workedMapsSection.style.display = 'block';
                }
                
                console.log(`${cardsHTML.length} cartes travaillées affichées`);
            } else {
                // Cacher la section des cartes travaillées en cas d'erreur
                const workedMapsSection = document.getElementById('worked-maps-section');
                if (workedMapsSection) {
                    workedMapsSection.style.display = 'none';
                }
                
                workedMapsContainer.innerHTML = `
                    <div class="fr-col-12">
                        <div class="fr-alert fr-alert--warning">
                            <p>Erreur lors du chargement des métadonnées des cartes travaillées.</p>
                        </div>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Erreur lors de l\'affichage des cartes travaillées:', error);
            
            // Cacher la section des cartes travaillées en cas d'erreur
            const workedMapsSection = document.getElementById('worked-maps-section');
            if (workedMapsSection) {
                workedMapsSection.style.display = 'none';
            }
            
            const workedMapsContainer = document.getElementById('worked-maps-container');
            if (workedMapsContainer) {
                workedMapsContainer.innerHTML = `
                    <div class="fr-col-12">
                        <div class="fr-alert fr-alert--error">
                            <p>Erreur lors du chargement des cartes travaillées.</p>
                        </div>
                    </div>
                `;
            }
        }
    }

    /**
     * Ajoute une carte à la liste des cartes travaillées
     * Appelé quand l'utilisateur commence à créer des points sur une carte
     */
    async addWorkedMap(arkId, mapData = {}) {
        try {
            console.log(`Ajout de la carte ${arkId} aux cartes travaillées`);
            
            if (window.ptmAuth && window.ptmAuth.isAuthenticated()) {
                // Utilisateur connecté : utiliser l'API
                await window.ptmAuth.updateWorkedMap(arkId, mapData, 'en-cours');
            } else {
                // Utilisateur anonyme : sauvegarder localement
                await window.ptmAuth.saveAnonymousMapStatus(arkId, 'en-cours', mapData);
            }
            
            console.log(`Carte ${arkId} ajoutée avec succès`);
            
            // Recharger l'affichage si nous sommes sur la page "Mes cartes"
            if (document.getElementById('worked-maps-container')) {
                await this.displayWorkedMaps();
            }
            
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'ajout de la carte travaillée:', error);
            return false;
        }
    }

    /**
     * Met à jour le statut d'une carte travaillée
     */
    async updateMapStatus(arkId, status, additionalData = {}) {
        try {
            let result;
            
            if (window.ptmAuth && window.ptmAuth.isAuthenticated()) {
                // Utilisateur connecté : utiliser l'API
                result = await window.ptmAuth.updateMapStatus(arkId, status, additionalData);
            } else {
                // Utilisateur anonyme : sauvegarder localement
                result = await window.ptmAuth.saveAnonymousMapStatus(arkId, status, additionalData);
            }
            
            // Recharger l'affichage si nous sommes sur la page "Mes cartes"
            if (document.getElementById('worked-maps-container')) {
                await this.displayWorkedMaps();
            }
            
            return result;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du statut de la carte:', error);
            return false;
        }
    }

    /**
     * Initialise le gestionnaire après connexion
     */
    async init() {
        console.log('Initialisation du gestionnaire des cartes travaillées...');
        await this.displayWorkedMaps();
    }

    /**
     * Ouvre la modale de dépôt pour une carte spécifique
     * @param {string} arkId - L'identifiant ARK de la carte
     */
    async openDepositModalForMap(arkId) {
        console.log(`Ouverture de la modale de dépôt pour la carte ${arkId}`);
        
        // Vérifier que l'utilisateur est connecté
        if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
            alert('Vous devez être connecté pour déposer une carte. Veuillez vous connecter d\'abord.');
            return;
        }
        
        try {
            // Définir la carte courante pour le dépôt
            window.input_ark = arkId;
            
            // Charger les métadonnées de la carte pour préremplir le formulaire
            await this.loadMapForDeposit(arkId);
            
            // Préremplir les informations utilisateur dans la modale
            await this.prefillUserDataInModal();
            
            // Ouvrir la modale de dépôt
            const modal = document.getElementById('fr-modal-deposit');
            if (modal) {
                modal.showModal();
            } else {
                console.error('Modale de dépôt non trouvée');
                alert('Erreur : modale de dépôt non trouvée.');
            }
        } catch (error) {
            console.error('Erreur lors de l\'ouverture de la modale de dépôt:', error);
            alert('Erreur lors de l\'ouverture de la modale de dépôt. Veuillez réessayer.');
        }
    }

    /**
     * Prérempli les données utilisateur dans la modale de dépôt
     */
    async prefillUserDataInModal() {
        try {
            // Récupérer le profil utilisateur
            const userProfile = await window.ptmAuth.getUserProfile();
            
            if (userProfile) {
                // Préremplir le nom et prénom si les champs existent
                const nameField = document.getElementById('input-family-name-1');
                const firstNameField = document.getElementById('input-firstname-1');
                const institutionField = document.getElementById('input-institution');
                
                if (nameField && userProfile.name) {
                    // Si le nom complet est disponible, essayer de le diviser
                    const nameParts = userProfile.name.split(' ');
                    if (nameParts.length > 1) {
                        nameField.value = nameParts[nameParts.length - 1]; // Dernier mot = nom de famille
                        if (firstNameField) {
                            firstNameField.value = nameParts.slice(0, -1).join(' '); // Reste = prénom(s)
                        }
                    } else {
                        nameField.value = userProfile.name;
                    }
                }
                
                if (institutionField && userProfile.institution) {
                    institutionField.value = userProfile.institution;
                }
                
                console.log('Données utilisateur préremplies dans la modale');
            }
        } catch (error) {
            console.error('Erreur lors du préremplissage des données utilisateur:', error);
            // Ne pas bloquer l'ouverture de la modale pour cette erreur
        }
    }

    /**
     * Charge une carte spécifique pour le dépôt
     * @param {string} arkId - L'identifiant ARK de la carte
     */
    async loadMapForDeposit(arkId) {
        try {
            console.log(`Chargement de la carte ${arkId} pour dépôt...`);
            
            // Récupérer les métadonnées de la carte
            const metadata = await this.getGallicaMetadata(arkId);
            
            // Définir les variables globales nécessaires pour le dépôt
            // Utiliser les labels français pour compatibilité IIIF v3
            window.metadataDict = {
                'Titre': metadata.metadata['Titre'] || 'Titre non disponible',
                'Créateur': metadata.metadata['Créateur'] || 'Créateur non disponible',
                'Date': metadata.metadata['Date'] || '',
                'Cote': metadata.metadata['Cote'] || 'BNF Gallica',
                'Images Source': metadata.gallicaUrl || `https://gallica.bnf.fr/ark:/12148/${arkId}`
            };
            
            // Vérifier s'il y a des points de contrôle en mémoire
            if (!window.pointPairs || window.pointPairs.length === 0) {
                console.warn('Aucun point de contrôle trouvé en mémoire.');
                
                // Essayer de récupérer les points de contrôle sauvegardés
                const hasBackupPoints = await this.tryRestoreControlPoints(arkId);
                
                if (!hasBackupPoints) {
                    // Créer des points de contrôle par défaut et informer l'utilisateur
                    this.createDefaultControlPoints(arkId);
                    
                    // Afficher un avertissement à l'utilisateur
                    const warningMessage = `
                        Attention : Aucun point de contrôle n'a été trouvé pour cette carte.
                        Des points de contrôle par défaut ont été créés pour permettre le dépôt,
                        mais ils ne correspondent pas au géoréférencement réel de la carte.
                        
                        Pour déposer des points de contrôle précis, veuillez d'abord retourner
                        sur la page de géoréférencement et sauvegarder vos points.
                    `;
                    
                    if (confirm(warningMessage + '\n\nSouhaitez-vous continuer le dépôt avec les points par défaut ?')) {
                        console.log('Utilisateur a accepté de continuer avec les points par défaut');
                    } else {
                        throw new Error('Dépôt annulé par l\'utilisateur');
                    }
                }
            }
            
            console.log('Carte chargée pour dépôt:', window.metadataDict);
            console.log('Points de contrôle disponibles:', window.pointPairs?.length || 0);
            
        } catch (error) {
            console.error('Erreur lors du chargement de la carte pour dépôt:', error);
            throw error;
        }
    }

    /**
     * Essaie de restaurer les points de contrôle depuis la sauvegarde
     * @param {string} arkId - L'identifiant ARK de la carte
     * @returns {boolean} - True si des points ont été restaurés
     */
    async tryRestoreControlPoints(arkId) {
        try {
            if (window.controlPointsBackup && typeof window.controlPointsBackup.getBackupsForArk === 'function') {
                const backups = window.controlPointsBackup.getBackupsForArk(arkId);
                
                if (backups && backups.length > 0) {
                    // Prendre la sauvegarde la plus récente
                    const latestBackup = backups[0];
                    
                    console.log('Points de contrôle trouvés dans la sauvegarde:', latestBackup);
                    
                    // Restaurer les points
                    if (typeof window.controlPointsBackup.restoreFromBackup === 'function') {
                        await window.controlPointsBackup.restoreFromBackup(latestBackup);
                        console.log('Points de contrôle restaurés depuis la sauvegarde');
                        return true;
                    }
                }
            }
        } catch (error) {
            console.error('Erreur lors de la restauration des points de contrôle:', error);
        }
        
        return false;
    }

    /**
     * Crée des points de contrôle par défaut pour une carte (fallback)
     * @param {string} arkId - L'identifiant ARK de la carte
     */
    createDefaultControlPoints(arkId) {
        console.log(`Création de points de contrôle par défaut pour ${arkId}`);
        
        // Créer une structure minimale de points de contrôle
        // Ceci est un fallback - idéalement les points devraient être récupérés depuis l'API
        window.pointPairs = [{
            id: 1,
            leftPoint: { lat: 48.8566, lng: 2.3522 }, // Paris par défaut
            rightPoint: { lat: 48.8566, lng: 2.3522 },
            isComplete: () => true
        }];
        
        console.log('Points de contrôle par défaut créés');
    }
}

// Instance globale
window.workedMapsManager = new WorkedMapsManager();

// Écouter les événements de connexion/déconnexion
document.addEventListener('userLoggedIn', async (event) => {
    console.log('Utilisateur connecté, chargement des cartes travaillées...');
    await window.workedMapsManager.init();
});

document.addEventListener('userLoggedOut', async () => {
    console.log('Utilisateur déconnecté, basculement vers les cartes anonymes');
    
    // Recharger les cartes anonymes
    await window.workedMapsManager.init();
});

// Écouteur pour l'onglet "Mes cartes" - recharger les cartes travaillées quand l'onglet est activé
document.addEventListener('DOMContentLoaded', () => {
    const cartesTab = document.getElementById('tabpanel-cartes');
    if (cartesTab) {
        cartesTab.addEventListener('click', async () => {
            console.log('Clic sur l\'onglet "Mes cartes"');
            if (window.workedMapsManager) {
                await window.workedMapsManager.displayWorkedMaps();
            }
        });
    }
});

/**
 * Fonctions utilitaires globales pour l'intégration avec d'autres parties du code
 */

// Fonction globale pour ajouter rapidement une carte aux cartes travaillées
window.addWorkedMap = function(arkId, mapData = {}) {
    if (window.workedMapsManager) {
        return window.workedMapsManager.addWorkedMap(arkId, mapData);
    }
    return Promise.resolve(false);
};

// Fonction globale pour mettre à jour le statut d'une carte
// MISE À JOUR : Utilise maintenant le système PTMAuth optimisé
window.updateMapStatus = function(arkId, status, additionalData = {}) {
    if (window.ptmAuth) {
        // Utiliser le nouveau système optimisé selon le type d'utilisateur
        if (window.ptmAuth.isAuthenticated()) {
            return window.ptmAuth.updateWorkedMap(arkId, status, additionalData);
        } else {
            return window.ptmAuth.saveAnonymousMapStatus(arkId, status, additionalData);
        }
    }
    // Fallback vers l'ancien système si PTMAuth n'est pas disponible
    else if (window.workedMapsManager) {
        return window.workedMapsManager.updateMapStatus(arkId, status, additionalData);
    }
    return Promise.resolve(false);
};
