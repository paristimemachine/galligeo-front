/**
 * Gestionnaire de la galerie des cartes géoréférencées
 * Version adaptée avec sélection multiple pour création d'atlas
 */
class GalerieManager {
    constructor() {
        this.allMaps = [];
        this.filteredMaps = [];
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.isLoading = false;
        this.currentSearchTerm = '';
        this.currentPeriodFilter = '';
        this.currentViewMode = 'cards';
        
        // Cache pour les métadonnées Gallica
        this.metadataCache = new Map();
        
        this.initializeEventListeners();
    }

    /**
     * Initialise les écouteurs d'événements
     */
    initializeEventListeners() {
        // Recherche
        const searchInput = document.getElementById('search-input');
        const searchButton = document.getElementById('search-button');
        
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.performSearch();
            }, 300));
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }
        
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                this.performSearch();
            });
        }

        // Filtre par période
        const periodFilter = document.getElementById('period-filter');
        if (periodFilter) {
            periodFilter.addEventListener('change', () => {
                this.currentPeriodFilter = periodFilter.value;
                this.applyFilters();
            });
        }

        // Toggle vue cartes/tableau
        const viewCards = document.getElementById('view-cards');
        const viewTable = document.getElementById('view-table');
        
        if (viewCards) {
            viewCards.addEventListener('change', () => {
                if (viewCards.checked) {
                    this.switchView('cards');
                }
            });
        }
        
        if (viewTable) {
            viewTable.addEventListener('change', () => {
                if (viewTable.checked) {
                    this.switchView('table');
                }
            });
        }
    }

    /**
     * Fonction de debounce pour limiter les appels de recherche
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Initialise la page
     */
    async init() {
        try {
            await this.loadAllGeoreferencedMaps();
            this.updateStatistics();
            this.displayMaps();
        } catch (error) {
            console.error('Erreur initialisation galerie:', error);
            this.displayError('Erreur lors du chargement des cartes géoréférencées');
        }
    }

    /**
     * Charge toutes les cartes géoréférencées depuis l'API
     */
    async loadAllGeoreferencedMaps() {
        this.isLoading = true;
        
        try {
            const maps = await window.ptmAuth.getAllGeoreferencedMaps();
            
            // Enrichir les données avec les métadonnées Gallica
            for (const map of maps) {
                try {
                    const metadata = await this.getGallicaMetadata(map.ark);
                    if (metadata && !metadata.error) {
                        map.title = metadata.metadata['Titre'] || map.title;
                        map.creator = metadata.metadata['Créateur'] || map.creator;
                        map.date = metadata.metadata['Date'] || map.date;
                        map.thumbnailUrl = metadata.thumbnailUrl;
                        map.gallicaUrl = metadata.gallicaUrl;
                    }
                    map.period = this.determinePeriodFromDate(map.date);
                } catch (error) {
                    // Métadonnées non critiques, continuer silencieusement
                }
            }
            
            this.allMaps = maps;
            this.filteredMaps = [...this.allMaps];
            
        } catch (error) {
            console.error('Erreur chargement API:', error);
            await this.loadExampleMaps();
        }
        
        this.isLoading = false;
    }

    /**
     * Charge des cartes d'exemple en cas d'indisponibilité de l'API
     */
    async loadExampleMaps() {
        const exampleMaps = [
            {
                ark: 'btv1b53121232b',
                title: 'Paris en 1944 - Girard et Barrère',
                creator: 'Girard et Barrère',
                date: '1944',
                period: '20e',
                georeferenced_by: 'Utilisateur Test',
                georeferenced_date: '2024-09-15T10:30:00Z',
                description: 'Plan de Paris pendant la Seconde Guerre mondiale'
            },
            {
                ark: 'btv1b532480876',
                title: 'Carte des fils télégraphiques de France',
                creator: 'Administration des Postes et Télégraphes',
                date: '1889',
                period: '19e',
                georeferenced_by: 'Expert Carto',
                georeferenced_date: '2024-09-10T14:20:00Z',
                description: 'Réseau télégraphique français à la fin du XIXe siècle'
            },
            {
                ark: 'btv1b8441346h',
                title: 'Plan de la ville d\'Amiens',
                creator: 'Cartographe Municipal',
                date: '1848',
                period: '19e',
                georeferenced_by: 'Historien Local',
                georeferenced_date: '2024-09-05T09:15:00Z',
                description: 'Plan détaillé d\'Amiens au milieu du XIXe siècle'
            }
        ];

        // Enrichir avec les métadonnées Gallica
        for (const map of exampleMaps) {
            try {
                const metadata = await this.getGallicaMetadata(map.ark);
                if (metadata && !metadata.error) {
                    map.title = metadata.metadata['Titre'] || map.title;
                    map.creator = metadata.metadata['Créateur'] || map.creator;
                    map.date = metadata.metadata['Date'] || map.date;
                    map.thumbnailUrl = metadata.thumbnailUrl;
                    map.gallicaUrl = metadata.gallicaUrl;
                }
            } catch (error) {
                // Continuer silencieusement
            }
        }

        this.allMaps = exampleMaps;
        this.filteredMaps = [...this.allMaps];
    }

    /**
     * Récupère les métadonnées Gallica pour un ARK donné (avec cache)
     */
    async getGallicaMetadata(arkId) {
        // Vérifier le cache
        if (this.metadataCache.has(arkId)) {
            return this.metadataCache.get(arkId);
        }

        try {
            const manifestUrl = `https://openapi.bnf.fr/iiif/presentation/v3/ark:/12148/${arkId}/manifest.json`;
            
            const response = await fetch(manifestUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
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
            const thumbnailUrl = `https://openapi.bnf.fr/iiif/image/v3/ark:/12148/${arkId}/f1/full/,480/0/default.webp`;
 
            const result = {
                arkId,
                metadata,
                thumbnailUrl,
                gallicaUrl: `https://gallica.bnf.fr/ark:/12148/${arkId}`
            };

            // Mettre en cache
            this.metadataCache.set(arkId, result);
            
            return result;
            
        } catch (error) {
            const errorResult = {
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

            // Mettre en cache même les erreurs pour éviter de refaire les appels
            this.metadataCache.set(arkId, errorResult);
            return errorResult;
        }
    }

    /**
     * Détermine la période historique à partir d'une date
     */
    determinePeriodFromDate(dateString) {
        if (!dateString) return '';
        
        // Extraire l'année de la date (formats variés possibles)
        const yearMatch = dateString.match(/(\d{4})/);
        if (!yearMatch) return '';
        
        const year = parseInt(yearMatch[1]);
        
        if (year < 1453) return 'moyen-age';
        if (year >= 1453 && year < 1600) return 'renaissance';
        if (year >= 1600 && year < 1800) return 'moderne';
        if (year >= 1800 && year < 1900) return '19e';
        if (year >= 1900) return '20e';
        
        return '';
    }

    /**
     * Met à jour les statistiques affichées en haut de page
     */
    async updateStatistics() {
        const totalCount = document.getElementById('total-count');
        const contributorsCount = document.getElementById('contributors-count');
        const recentCount = document.getElementById('recent-count');

        if (totalCount) {
            totalCount.innerHTML = `
                <span class="fr-icon-map-2-fill" aria-hidden="true"></span>
                ${this.allMaps.length}
            `;
        }

        // Calculer le nombre de contributeurs uniques
        const uniqueContributors = new Set(this.allMaps.map(map => map.georeferenced_by)).size;
        if (contributorsCount) {
            contributorsCount.innerHTML = `
                <span class="fr-icon-team-fill" aria-hidden="true"></span>
                ${uniqueContributors}
            `;
        }

        // Calculer le nombre de cartes géoréférencées ce mois-ci
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const recentMaps = this.allMaps.filter(map => {
            const georefDate = new Date(map.georeferenced_date);
            return georefDate.getMonth() === currentMonth && georefDate.getFullYear() === currentYear;
        });

        if (recentCount) {
            recentCount.innerHTML = `
                <span class="fr-icon-calendar-fill" aria-hidden="true"></span>
                ${recentMaps.length}
            `;
        }

        // Optionnel : récupérer des statistiques plus avancées depuis l'API
        try {
            const stats = await window.ptmAuth.getGeoreferencedMapsStats();
            if (stats) {
                // Mettre à jour avec les vraies statistiques si disponibles
                if (stats.totalMaps !== undefined && totalCount) {
                    totalCount.innerHTML = `
                        <span class="fr-icon-map-2-fill" aria-hidden="true"></span>
                        ${stats.totalMaps}
                    `;
                }
                if (stats.uniqueContributors !== undefined && contributorsCount) {
                    contributorsCount.innerHTML = `
                        <span class="fr-icon-team-fill" aria-hidden="true"></span>
                        ${stats.uniqueContributors}
                    `;
                }
                if (stats.recentMaps !== undefined && recentCount) {
                    recentCount.innerHTML = `
                        <span class="fr-icon-calendar-fill" aria-hidden="true"></span>
                        ${stats.recentMaps}
                    `;
                }
            }
        } catch (error) {
            // Utiliser les statistiques locales
        }
    }

    /**
     * Effectue une recherche dans les cartes
     */
    performSearch() {
        const searchInput = document.getElementById('search-input');
        this.currentSearchTerm = searchInput?.value?.toLowerCase() || '';
        this.applyFilters();
    }

    /**
     * Applique les filtres de recherche et de période
     */
    applyFilters() {
        this.filteredMaps = this.allMaps.filter(map => {
            // Filtre de recherche
            const searchMatch = !this.currentSearchTerm || 
                map.title?.toLowerCase().includes(this.currentSearchTerm) ||
                map.creator?.toLowerCase().includes(this.currentSearchTerm) ||
                map.date?.toLowerCase().includes(this.currentSearchTerm) ||
                map.description?.toLowerCase().includes(this.currentSearchTerm) ||
                map.georeferenced_by?.toLowerCase().includes(this.currentSearchTerm);

            // Filtre de période
            const periodMatch = !this.currentPeriodFilter || map.period === this.currentPeriodFilter;

            return searchMatch && periodMatch;
        });

        this.currentPage = 1; // Revenir à la première page
        this.displayMaps();
    }

    /**
     * Change le mode d'affichage (cartes/tableau)
     */
    switchView(viewMode) {
        this.currentViewMode = viewMode;
        
        const cardsContainer = document.getElementById('cards-container');
        const tableContainer = document.getElementById('table-container');

        if (viewMode === 'cards') {
            cardsContainer.style.display = 'block';
            tableContainer.style.display = 'none';
        } else {
            cardsContainer.style.display = 'none';
            tableContainer.style.display = 'block';
        }

        this.displayMaps();
    }

    /**
     * Affiche les cartes selon le mode sélectionné
     */
    displayMaps() {
        if (this.currentViewMode === 'cards') {
            this.displayAsCards();
        } else {
            this.displayAsTable();
        }
        
        this.updatePagination();
    }

    /**
     * Affiche les cartes en mode carte (cards) avec sélection
     */
    displayAsCards() {
        const cardsGrid = document.getElementById('cards-grid');
        if (!cardsGrid) return;

        // Calculer les indices pour la pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const mapsToShow = this.filteredMaps.slice(startIndex, endIndex);

        if (mapsToShow.length === 0) {
            cardsGrid.innerHTML = `
                <div class="fr-col-12">
                    <div class="fr-alert fr-alert--info">
                        <p>Aucune carte géoréférencée trouvée pour votre recherche.</p>
                    </div>
                </div>
            `;
            return;
        }

        const cardsHTML = mapsToShow.map(map => this.generateSelectableCardHTML(map)).join('');
        cardsGrid.innerHTML = cardsHTML;
    }

    /**
     * Génère le HTML pour une carte individuelle sélectionnable
     */
    generateSelectableCardHTML(map) {
        const title = map.title || 'Titre non disponible';
        const creator = map.creator || '';
        const date = map.date || '';
        const arkId = map.ark;
        const thumbnailUrl = map.thumbnailUrl;
        const gallicaUrl = map.gallicaUrl || `https://gallica.bnf.fr/ark:/12148/${arkId}`;
        const georefUrl = `../georef/?ark=${arkId}`;
        const georefBy = map.georeferenced_by || 'Utilisateur anonyme';
        const georefDate = map.georeferenced_date ? 
            new Date(map.georeferenced_date).toLocaleDateString('fr-FR') : '';

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
                <div class="fr-card fr-enlarge-link selectable-card" onclick="toggleMapSelection('${arkId}', this)" data-ark="${arkId}">
                    <div class="selection-checkbox"></div>
                    <div class="fr-card__body">
                        <div class="fr-card__content">
                            <h3 class="fr-card__title">
                                <a href="${georefUrl}" class="fr-card__link">${title}</a>
                            </h3>
                            ${description ? `<p class="fr-card__desc">${description}</p>` : ''}
                            <p class="fr-card__detail fr-icon-user-line">Par ${georefBy}</p>
                            ${georefDate ? `<p class="fr-card__detail fr-icon-calendar-line">${georefDate}</p>` : ''}
                        </div>
                        <div class="fr-card__start">
                            <ul class="fr-tags-group">
                                <li><p class="fr-tag fr-tag--green-emeraude">Géoréférencée</p></li>
                                <li><p class="fr-tag fr-tag--blue-france">Gallica</p></li>
                            </ul>
                        </div>
                    </div>
                    ${thumbnailUrl ? `
                    <div class="fr-card__header">
                        <div class="fr-card__img">
                            <img class="fr-responsive-img card-image" 
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
     * Affiche les cartes en mode tableau avec sélection
     */
    displayAsTable() {
        const tableBody = document.getElementById('table-body');
        if (!tableBody) return;

        // Calculer les indices pour la pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const mapsToShow = this.filteredMaps.slice(startIndex, endIndex);

        if (mapsToShow.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="fr-text--center">
                        Aucune carte géoréférencée trouvée pour votre recherche.
                    </td>
                </tr>
            `;
            return;
        }

        const rowsHTML = mapsToShow.map(map => this.generateSelectableTableRowHTML(map)).join('');
        tableBody.innerHTML = rowsHTML;
    }

    /**
     * Génère une ligne de tableau sélectionnable pour une carte
     */
    generateSelectableTableRowHTML(map) {
        const title = map.title || 'Titre non disponible';
        const creator = map.creator || '';
        const date = map.date || '';
        const arkId = map.ark;
        const gallicaUrl = map.gallicaUrl || `https://gallica.bnf.fr/ark:/12148/${arkId}`;
        const georefUrl = `../georef/?ark=${arkId}`;
        const georefBy = map.georeferenced_by || 'Utilisateur anonyme';
        const georefDate = map.georeferenced_date ? 
            new Date(map.georeferenced_date).toLocaleDateString('fr-FR') : '';

        return `
            <tr class="selectable-row" onclick="toggleRowSelection('${arkId}', this)" data-ark="${arkId}">
                <td>
                    <input type="checkbox" class="row-checkbox" onchange="handleRowCheckboxChange('${arkId}', this)" onclick="event.stopPropagation()">
                </td>
                <td>
                    <span class="fr-link">${title}</span>
                </td>
                <td>${creator}</td>
                <td>${date}</td>
                <td>${georefBy}</td>
                <td>${georefDate}</td>
                <td>
                    <div class="fr-btns-group fr-btns-group--sm">
                        <a href="${georefUrl}" class="fr-btn fr-btn--sm fr-btn--tertiary" onclick="event.stopPropagation()">
                            Voir géoréf.
                        </a>
                        <a href="${gallicaUrl}" target="_blank" rel="noopener" class="fr-btn fr-btn--sm fr-btn--secondary" onclick="event.stopPropagation()">
                            Gallica
                        </a>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Met à jour la pagination
     */
    updatePagination() {
        const totalPages = Math.ceil(this.filteredMaps.length / this.itemsPerPage);
        const paginationNav = document.getElementById('pagination-nav');
        
        if (!paginationNav) return;

        if (totalPages <= 1) {
            paginationNav.style.display = 'none';
            return;
        }

        paginationNav.style.display = 'block';
        const paginationList = paginationNav.querySelector('.fr-pagination__list');
        
        if (!paginationList) return;

        let paginationHTML = '';

        // Bouton précédent
        if (this.currentPage > 1) {
            paginationHTML += `
                <li>
                    <button class="fr-pagination__link fr-pagination__link--prev fr-pagination__link--lg-label" 
                            onclick="window.galerieManager.goToPage(${this.currentPage - 1})">
                        Précédent
                    </button>
                </li>
            `;
        }

        // Pages numérotées (logique simplifiée)
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === this.currentPage;
            paginationHTML += `
                <li>
                    <button class="fr-pagination__link ${isActive ? 'fr-pagination__link--current' : ''}" 
                            ${isActive ? 'aria-current="page"' : ''}
                            onclick="window.galerieManager.goToPage(${i})">
                        ${i}
                    </button>
                </li>
            `;
        }

        // Bouton suivant
        if (this.currentPage < totalPages) {
            paginationHTML += `
                <li>
                    <button class="fr-pagination__link fr-pagination__link--next fr-pagination__link--lg-label" 
                            onclick="window.galerieManager.goToPage(${this.currentPage + 1})">
                        Suivant
                    </button>
                </li>
            `;
        }

        paginationList.innerHTML = paginationHTML;
    }

    /**
     * Navigation vers une page spécifique
     */
    goToPage(pageNumber) {
        this.currentPage = pageNumber;
        this.displayMaps();
        
        // Remonter en haut de la page
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Affiche un message d'erreur
     */
    displayError(message) {
        const cardsGrid = document.getElementById('cards-grid');
        const tableBody = document.getElementById('table-body');

        const errorHTML = `
            <div class="fr-col-12">
                <div class="error-message">
                    <div class="fr-alert fr-alert--error">
                        <h3 class="fr-alert__title">Erreur de chargement</h3>
                        <p>${message}</p>
                        <button class="fr-btn fr-btn--sm fr-mt-2w" onclick="window.galerieManager.init()">
                            Réessayer
                        </button>
                    </div>
                </div>
            </div>
        `;

        if (cardsGrid) {
            cardsGrid.innerHTML = errorHTML;
        }

        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="fr-text--center">
                        ${message}
                        <br>
                        <button class="fr-btn fr-btn--sm fr-mt-2w" onclick="window.galerieManager.init()">
                            Réessayer
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

// Fonctions globales pour la gestion de la sélection
function toggleMapSelection(arkId, element) {
    if (window.selectedMaps.has(arkId)) {
        window.selectedMaps.delete(arkId);
        element.classList.remove('selected');
    } else {
        window.selectedMaps.add(arkId);
        element.classList.add('selected');
    }
    
    window.updateSelectionUI();
}

function toggleRowSelection(arkId, element) {
    const checkbox = element.querySelector('.row-checkbox');
    if (window.selectedMaps.has(arkId)) {
        window.selectedMaps.delete(arkId);
        element.classList.remove('selected');
        checkbox.checked = false;
    } else {
        window.selectedMaps.add(arkId);
        element.classList.add('selected');
        checkbox.checked = true;
    }
    
    window.updateSelectionUI();
}

function handleRowCheckboxChange(arkId, checkbox) {
    const row = checkbox.closest('tr');
    if (checkbox.checked) {
        window.selectedMaps.add(arkId);
        row.classList.add('selected');
    } else {
        window.selectedMaps.delete(arkId);
        row.classList.remove('selected');
    }
    
    window.updateSelectionUI();
}

// Instance globale
window.galerieManager = new GalerieManager();

// Export pour usage dans d'autres modules si nécessaire
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GalerieManager;
}
