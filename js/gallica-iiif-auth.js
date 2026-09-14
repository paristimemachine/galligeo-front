/**
 * Authentification pour les API IIIF de la BnF (openapi.bnf.fr)
 *
 * Depuis la mise en place du nouveau portail openapi.bnf.fr, les appels aux API
 * suivantes nécessitent un jeton Bearer obtenu via l'API PTM :
 *   - IIIF Presentation API  (.../iiif/presentation/v3/ark:/12148/{id}/manifest.json)
 *   - IIIF Image Request API (.../iiif/image/v3/ark:/12148/{id}/f{n}/.../default.{fmt})
 *   - IIIF Image Information API (.../iiif/image/v3/ark:/12148/{id}/f{n}/info.json)
 *
 * Ce module centralise :
 *   - la récupération et la mise en cache du jeton (avec renouvellement automatique)
 *   - un wrapper `fetch` qui ajoute l'en-tête Authorization et retente une fois
 *     en cas de jeton expiré (401)
 *   - un helper pour charger les images IIIF (qui ne peuvent pas porter d'en-tête
 *     Authorization via un simple <img src="...">) : on les récupère en blob puis
 *     on assigne une URL objet locale à l'élément <img>.
 */

(function (global) {
    const TOKEN_ENDPOINT = 'https://api.ptm.huma-num.fr/gallica-auth/token';
    // Durée de vie par défaut si l'API ne renvoie pas expires_in
    const DEFAULT_TTL_MS = 5 * 60 * 1000;
    // Marge de sécurité pour renouveler le jeton avant son expiration réelle
    const SAFETY_MARGIN_MS = 10 * 1000;
    // Nombre de chargements d'images simultanés (évite de saturer l'API BnF)
    const IMAGE_CONCURRENCY = 6;

    class GallicaIIIFAuth {
        constructor() {
            this._token = null;
            this._tokenExpiresAt = 0;
            this._tokenPromise = null;
        }

        /**
         * Récupère un jeton valide (depuis le cache mémoire ou via un nouvel appel).
         */
        async getToken(forceRefresh = false) {
            const now = Date.now();

            if (!forceRefresh && this._token && now < this._tokenExpiresAt) {
                return this._token;
            }

            if (this._tokenPromise) {
                return this._tokenPromise;
            }

            this._tokenPromise = (async () => {
                try {
                    const response = await fetch(TOKEN_ENDPOINT);
                    if (!response.ok) {
                        throw new Error(`Impossible d'obtenir le jeton Gallica (HTTP ${response.status})`);
                    }
                    const data = await response.json();
                    if (!data || !data.access_token) {
                        throw new Error('Réponse invalide de l\'API de jeton Gallica (access_token manquant)');
                    }

                    this._token = data.access_token;
                    const ttlMs = data.expires_in ? data.expires_in * 1000 : DEFAULT_TTL_MS;
                    this._tokenExpiresAt = Date.now() + Math.max(ttlMs - SAFETY_MARGIN_MS, 0);

                    return this._token;
                } finally {
                    this._tokenPromise = null;
                }
            })();

            return this._tokenPromise;
        }

        /**
         * Équivalent authentifié de `fetch()` pour les URL openapi.bnf.fr.
         * Retente une fois avec un jeton renouvelé si la réponse est 401.
         */
        async fetch(url, options = {}, _isRetry = false) {
            const token = await this.getToken();

            const headers = new Headers(options.headers || {});
            headers.set('Authorization', `Bearer ${token}`);

            const response = await fetch(url, Object.assign({}, options, { headers }));

            if (response.status === 401 && !_isRetry) {
                await this.getToken(true);
                return this.fetch(url, options, true);
            }

            return response;
        }

        /**
         * Charge une image IIIF authentifiée et retourne une URL objet (blob:)
         * utilisable comme src d'un <img>.
         */
        async loadImageObjectUrl(url) {
            const response = await this.fetch(url);
            if (!response.ok) {
                throw new Error(`Erreur chargement image Gallica (HTTP ${response.status})`);
            }
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        }

        /**
         * Assigne à un <img> le contenu (authentifié) d'une URL IIIF.
         * Déclenche un évènement 'error' natif sur l'élément en cas d'échec,
         * afin que les gestionnaires onerror existants (masquage, fallback...)
         * continuent de fonctionner sans modification.
         */
        async setImageSrc(imgEl, url) {
            try {
                const objectUrl = await this.loadImageObjectUrl(url);
                imgEl.src = objectUrl;
            } catch (error) {
                console.warn('Erreur chargement image Gallica authentifiée:', error);
                imgEl.dispatchEvent(new Event('error'));
            }
        }

        /**
         * Charge en parallèle (avec une limite de chargements simultanés pour ne
         * pas saturer l'API BnF) une liste d'éléments <img data-gallica-src="...">.
         */
        _loadImages(images) {
            let cursor = 0;
            const runNext = async () => {
                const index = cursor++;
                if (index >= images.length) {
                    return;
                }
                const imgEl = images[index];
                const url = imgEl.getAttribute('data-gallica-src');
                imgEl.removeAttribute('data-gallica-src');
                await this.setImageSrc(imgEl, url);
                await runNext();
            };

            const workers = [];
            for (let i = 0; i < Math.min(IMAGE_CONCURRENCY, images.length); i++) {
                workers.push(runNext());
            }
            return Promise.all(workers);
        }

        /**
         * Recherche dans `root` tous les <img data-gallica-src="..."> en attente.
         * Comme un <img src="..."> classique ne peut pas porter d'en-tête
         * Authorization, on récupère chaque image en blob puis on assigne une
         * URL objet locale à l'élément <img>.
         *
         * Reproduit le chargement paresseux qu'assurait auparavant
         * `loading="lazy"` sur ces <img> (utilisé par les grilles de galerie qui
         * peuvent contenir beaucoup de vignettes) : avec IntersectionObserver,
         * seules les images qui entrent dans le viewport (ou à proximité) sont
         * effectivement chargées, pour ne pas solliciter l'API BnF pour des
         * vignettes jamais vues. Fallback en chargement immédiat si
         * IntersectionObserver n'est pas disponible.
         */
        hydrateImages(root = document) {
            const images = Array.from(root.querySelectorAll('img[data-gallica-src]'));
            if (images.length === 0) {
                return Promise.resolve();
            }

            if (typeof IntersectionObserver === 'undefined') {
                return this._loadImages(images);
            }

            return new Promise((resolve) => {
                let pending = images.length;
                const done = () => {
                    pending--;
                    if (pending <= 0) resolve();
                };

                const observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting) return;
                        observer.unobserve(entry.target);
                        const url = entry.target.getAttribute('data-gallica-src');
                        entry.target.removeAttribute('data-gallica-src');
                        this.setImageSrc(entry.target, url).then(done);
                    });
                }, { rootMargin: '200px' });

                images.forEach((imgEl) => observer.observe(imgEl));
            });
        }
    }

    global.GallicaIIIFAuth = new GallicaIIIFAuth();
})(window);
