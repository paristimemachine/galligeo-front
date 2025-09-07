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
     * Charge les cartes travaillées depuis l'API
     */
    async loadWorkedMaps() {
        try {
            console.log('Chargement des cartes travaillées...');
            
            // Vérifier si l'utilisateur est connecté
            if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
                console.log('Utilisateur non authentifié, pas de cartes travaillées à charger');
                return [];
            }

            const workedMaps = await window.ptmAuth.getWorkedMaps();
            console.log('Cartes travaillées récupérées:', workedMaps);
            
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
            const manifestUrl = `https://gallica.bnf.fr/iiif/ark:/12148/${arkId}/manifest.json`;
            console.log(`Chargement des métadonnées pour ${arkId}`);
            
            const response = await fetch(manifestUrl);
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Extraire les métadonnées utiles
            const metadata = {};
            const canvas = data.sequences[0].canvases[0];
            
            // Ajouter les dimensions
            data.metadata.push(
                { label: 'Height', value: canvas.height },
                { label: 'Width', value: canvas.width }
            );

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

            // Construire le dictionnaire de métadonnées
            data.metadata.forEach(element => {
                const frenchLabel = labelMapping[element.label] || element.label;
                
                if (Array.isArray(element.value)) {
                    metadata[frenchLabel] = element.value.map(item => item['@value'] || item).join(', ');
                } else {
                    metadata[frenchLabel] = element.value;
                }
            });

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
            
            if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
                console.log('Utilisateur non authentifié, impossible d\'ajouter la carte');
                return false;
            }

            await window.ptmAuth.updateWorkedMap(arkId, mapData, 'en-cours');
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
            console.log(`Mise à jour du statut de la carte ${arkId} vers ${status}`);
            
            if (!window.ptmAuth || !window.ptmAuth.isAuthenticated()) {
                console.log('Utilisateur non authentifié, impossible de mettre à jour la carte');
                return false;
            }

            await window.ptmAuth.updateMapStatus(arkId, status, additionalData);
            console.log(`Statut de la carte ${arkId} mis à jour avec succès`);
            
            // Recharger l'affichage si nous sommes sur la page "Mes cartes"
            if (document.getElementById('worked-maps-container')) {
                await this.displayWorkedMaps();
            }
            
            return true;
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
}

// Instance globale
window.workedMapsManager = new WorkedMapsManager();

// Écouter les événements de connexion/déconnexion
document.addEventListener('userLoggedIn', async (event) => {
    console.log('Utilisateur connecté, chargement des cartes travaillées...');
    await window.workedMapsManager.init();
});

document.addEventListener('userLoggedOut', () => {
    console.log('Utilisateur déconnecté, masquage des cartes travaillées');
    
    // Cacher la section des cartes travaillées
    const workedMapsSection = document.getElementById('worked-maps-section');
    if (workedMapsSection) {
        workedMapsSection.style.display = 'none';
    }
    
    const workedMapsContainer = document.getElementById('worked-maps-container');
    if (workedMapsContainer) {
        workedMapsContainer.innerHTML = `
            <div class="fr-col-12">
                <div class="fr-notice fr-notice--info">
                    <div class="fr-container">
                        <div class="fr-notice__body">
                            <p>Connectez-vous pour voir vos cartes travaillées.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
});

// Écouteur pour l'onglet "Mes cartes" - recharger les cartes travaillées quand l'onglet est activé
document.addEventListener('DOMContentLoaded', () => {
    const cartesTab = document.getElementById('tabpanel-cartes');
    if (cartesTab) {
        cartesTab.addEventListener('click', async () => {
            console.log('Clic sur l\'onglet "Mes cartes"');
            if (window.ptmAuth && window.ptmAuth.isAuthenticated() && window.workedMapsManager) {
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
window.updateMapStatus = function(arkId, status, additionalData = {}) {
    if (window.workedMapsManager) {
        return window.workedMapsManager.updateMapStatus(arkId, status, additionalData);
    }
    return Promise.resolve(false);
};
