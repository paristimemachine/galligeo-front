/**
 * Gestionnaire des cartes Cartoquete
 * Charge et affiche les favoris depuis l'API PTM Auth
 */
class CartoqueteManager {
    constructor() {
        this.favorites = [];
    }

    /**
     * Charge les favoris Cartoquete depuis l'API
     */
    async loadFavorites() {
        try {
            console.log('Chargement des favoris Cartoquete...');
            
            // Vérifier si l'utilisateur est connecté via les variables globales d'api_interactions.js
            if (!isLoggedIn || !authToken) {
                console.log('Utilisateur non authentifié, pas de favoris à charger');
                return [];
            }

            // Récupérer la liste des applications de l'utilisateur
            const appsResponse = await authenticatedFetch('https://api.ptm.huma-num.fr/auth/user/apps');
            
            if (!appsResponse.ok) {
                throw new Error(`Erreur API: ${appsResponse.status}`);
            }
            
            const userAppsData = await appsResponse.json();
            console.log('Applications utilisateur:', userAppsData);
            
            // L'API retourne {'user': sub, 'applications': ['galligeo', 'cartoquete', ...]}
            const userApps = userAppsData.applications || [];
            
            // Vérifier si l'utilisateur a l'application Cartoquete
            if (!userApps.includes('cartoquete')) {
                console.log('L\'utilisateur n\'a pas d\'application Cartoquete');
                return [];
            }
            
            // Récupérer les données spécifiques de l'application Cartoquete
            const cartoqueteResponse = await authenticatedFetch('https://api.ptm.huma-num.fr/auth/app/cartoquete/data');
            
            if (!cartoqueteResponse.ok) {
                if (cartoqueteResponse.status === 404) {
                    console.log('Aucune donnée Cartoquete trouvée pour cet utilisateur');
                    return [];
                }
                throw new Error(`Erreur API Cartoquete: ${cartoqueteResponse.status}`);
            }
            
            const cartoqueteData = await cartoqueteResponse.json();
            console.log('Données Cartoquete récupérées:', cartoqueteData);
            
            // Extraire les favoris des données Cartoquete
            const favorites = cartoqueteData.favoris || [];
            console.log('Favoris Cartoquete récupérés:', favorites);
            
            this.favorites = favorites;
            return favorites;
        } catch (error) {
            console.error('Erreur lors du chargement des favoris Cartoquete:', error);
            return [];
        }
    }

    /**
     * Récupère les métadonnées Gallica pour un ARK donné
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
        // Utiliser l'API IIIF v3 pour générer une vignette de 480px de hauteur en format webp
        return `https://openapi.bnf.fr/iiif/image/v3/ark:/12148/${arkId}/f1/full/,480/0/default.webp`;
    }

    /**
     * Génère une carte DSFR pour un favori (style galerie compact)
     */
    generateCardHTML(favorite, metadata) {
        const title = metadata.metadata['Titre'] || 'Titre non disponible';
        const creator = metadata.metadata['Créateur'] || '';
        const date = metadata.metadata['Date'] || '';
        const arkId = favorite.ark;
        const thumbnailUrl = metadata.thumbnailUrl;
        const gallicaUrl = metadata.gallicaUrl;
        const georefUrl = `https://app.ptm.huma-num.fr/galligeo/?ark=${arkId}`;

        // Construire la description
        let description = '';
        if (creator && date) {
            description = `${creator} - ${date}`;
        } else if (creator) {
            description = creator;
        } else if (date) {
            description = date;
        }

        return `
            <div class="fr-col-12 fr-col-md-6 fr-col-lg-4">
                <div class="fr-card fr-enlarge-link">
                    <div class="fr-card__body">
                        <div class="fr-card__content">
                            <h3 class="fr-card__title">
                                <a href="${georefUrl}" target="_blank" rel="noopener">${title}</a>
                            </h3>
                            ${description ? `<p class="fr-card__desc">${description}</p>` : ''}
                            <p class="fr-card__desc">
                                <a href="${gallicaUrl}" target="_blank" rel="noopener">Voir la notice Gallica</a>
                            </p>
                        </div>
                        <div class="fr-card__start">
                            <ul class="fr-tags-group">
                                <li><p class="fr-tag fr-tag--blue-france">Cartoquete</p></li>
                                <li><p class="fr-tag fr-tag--yellow-tournesol">Favoris</p></li>
                            </ul>
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
     * Affiche tous les favoris dans l'onglet "Mes cartes"
     */
    async displayFavorites() {
        try {
            console.log('Affichage des favoris Cartoquete...');
            
            // Chercher le conteneur des favoris, avec fallback pour les tests
            let favoritesContainer = document.getElementById('cartoquete-favorites-container');
            
            if (!favoritesContainer) {
                console.warn('Conteneur des favoris Cartoquete non trouvé, tentative de création...');
                // Pour les pages de test, créer le conteneur s'il n'existe pas
                const parentContainer = document.getElementById('favorites-container');
                if (parentContainer) {
                    parentContainer.innerHTML = '<div class="fr-grid-row fr-grid-row--gutters" id="cartoquete-favorites-container"></div>';
                    favoritesContainer = document.getElementById('cartoquete-favorites-container');
                } else {
                    console.error('Impossible de trouver un conteneur pour les favoris');
                    return;
                }
            }

            // Afficher un indicateur de chargement
            favoritesContainer.innerHTML = `
                <div class="fr-col-12">
                    <div class="fr-alert fr-alert--info">
                        <p>Chargement des favoris Cartoquete...</p>
                    </div>
                </div>
            `;

            // Charger les favoris
            const favorites = await this.loadFavorites();
            
            if (favorites.length === 0) {
                // Cacher la section des favoris s'il n'y en a pas
                const favoritesSection = document.getElementById('cartoquete-favorites-section');
                if (favoritesSection) {
                    favoritesSection.style.display = 'none';
                }
                
                favoritesContainer.innerHTML = `
                    <div class="fr-col-12">
                        <div class="fr-alert fr-alert--info">
                            <p>Aucun favori Cartoquete trouvé.</p>
                        </div>
                    </div>
                `;
                return;
            }

            // Charger les métadonnées pour chaque favori
            const cardsHTML = [];
            for (const favorite of favorites) {
                try {
                    const metadata = await this.getGallicaMetadata(favorite.ark);
                    const cardHTML = this.generateCardHTML(favorite, metadata);
                    cardsHTML.push(cardHTML);
                } catch (error) {
                    console.error(`Erreur pour le favori ${favorite.ark}:`, error);
                    // Continuer avec les autres favoris
                }
            }

            // Afficher toutes les cartes
            if (cardsHTML.length > 0) {
                favoritesContainer.innerHTML = cardsHTML.join('');
                
                // Afficher la section des favoris Cartoquete
                const favoritesSection = document.getElementById('cartoquete-favorites-section');
                if (favoritesSection) {
                    favoritesSection.style.display = 'block';
                }
                
                console.log(`${cardsHTML.length} favoris Cartoquete affichés`);
                console.log('HTML généré:', cardsHTML.join(''));
                console.log('Conteneur après ajout:', favoritesContainer);
            } else {
                // Cacher la section des favoris en cas d'erreur
                const favoritesSection = document.getElementById('cartoquete-favorites-section');
                if (favoritesSection) {
                    favoritesSection.style.display = 'none';
                }
                
                favoritesContainer.innerHTML = `
                    <div class="fr-col-12">
                        <div class="fr-alert fr-alert--warning">
                            <p>Erreur lors du chargement des métadonnées des favoris.</p>
                        </div>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Erreur lors de l\'affichage des favoris:', error);
            
            // Cacher la section des favoris en cas d'erreur
            const favoritesSection = document.getElementById('cartoquete-favorites-section');
            if (favoritesSection) {
                favoritesSection.style.display = 'none';
            }
            
            const favoritesContainer = document.getElementById('cartoquete-favorites-container');
            if (favoritesContainer) {
                favoritesContainer.innerHTML = `
                    <div class="fr-col-12">
                        <div class="fr-alert fr-alert--error">
                            <p>Erreur lors du chargement des favoris Cartoquete.</p>
                        </div>
                    </div>
                `;
            }
        }
    }

    /**
     * Initialise le gestionnaire après connexion
     */
    async init() {
        console.log('Initialisation du gestionnaire Cartoquete...');
        await this.displayFavorites();
    }
}

// Instance globale
window.cartoqueteManager = new CartoqueteManager();

// Écouter les événements de connexion/déconnexion
document.addEventListener('userLoggedIn', async (event) => {
    console.log('Utilisateur connecté, chargement des favoris Cartoquete...');
    await window.cartoqueteManager.init();
});

document.addEventListener('userLoggedOut', () => {
    console.log('Utilisateur déconnecté, masquage des favoris Cartoquete');
    
    // Cacher la section des favoris
    const favoritesSection = document.getElementById('cartoquete-favorites-section');
    if (favoritesSection) {
        favoritesSection.style.display = 'none';
    }
    
    const favoritesContainer = document.getElementById('cartoquete-favorites-container');
    if (favoritesContainer) {
        favoritesContainer.innerHTML = `
            <div class="fr-col-12">
                <div class="fr-notice fr-notice--info">
                    <div class="fr-container">
                        <div class="fr-notice__body">
                            <p>Connectez-vous pour voir vos favoris Cartoquete.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
});

document.addEventListener('userNotLoggedIn', () => {
    console.log('Utilisateur non connecté, affichage du message par défaut');
    
    // Cacher la section des favoris
    const favoritesSection = document.getElementById('cartoquete-favorites-section');
    if (favoritesSection) {
        favoritesSection.style.display = 'none';
    }
    
    const favoritesContainer = document.getElementById('cartoquete-favorites-container');
    if (favoritesContainer) {
        favoritesContainer.innerHTML = `
            <div class="fr-col-12">
                <div class="fr-notice fr-notice--info">
                    <div class="fr-container">
                        <div class="fr-notice__body">
                            <p>Connectez-vous pour voir vos favoris Cartoquete.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
});

// Écouteur pour l'onglet "Mes cartes" - recharger les favoris quand l'onglet est activé
document.addEventListener('DOMContentLoaded', () => {
    const cartesTab = document.getElementById('tabpanel-cartes');
    if (cartesTab) {
        cartesTab.addEventListener('click', async () => {
            console.log('Clic sur l\'onglet "Mes cartes"');
            if (isLoggedIn && window.cartoqueteManager) {
                await window.cartoqueteManager.displayFavorites();
            }
        });
    }
});
