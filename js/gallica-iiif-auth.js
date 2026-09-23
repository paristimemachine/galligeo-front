/**
 * Authentification + accès centralisé aux API IIIF de la BnF, via l'API
 * interne passe-plat de PTM (https://api.ptm.huma-num.fr/bnf) qui porte
 * elle-même l'autorisation côté BnF :
 *   - IIIF Presentation API  (.../bnf/iiif/manifest/{ark_repo_id}/{ark_id})
 *   - IIIF Image Request API (.../bnf/iiif/image/{ark_repo_id}/{ark_id}/f{n}/.../default.{fmt})
 *   - IIIF Image Information API (.../bnf/iiif/image/{ark_repo_id}/{ark_id}/f{n}/info.json)
 *
 * Documentation de l'API : https://api.ptm.huma-num.fr/bnf/docs
 *
 * Ce module centralise :
 *   - la construction des URL de l'API (un seul endroit à maintenir si l'API évolue)
 *   - la récupération et la mise en cache du jeton (renouvelé automatiquement
 *     avant son expiration — 15 minutes côté API — tant que la page reste active)
 *   - un wrapper `fetch` qui ajoute l'en-tête Authorization et retente une fois
 *     en cas de jeton expiré (401)
 *   - un helper pour charger les images IIIF (qui ne peuvent pas porter d'en-tête
 *     Authorization via un simple <img src="...">) : on les récupère en blob puis
 *     on assigne une URL objet locale à l'élément <img>.
 */

(function (global) {
    const BNF_API_BASE = 'https://api.ptm.huma-num.fr/bnf';
    const ARK_REPO_ID = '12148';
    const TOKEN_ENDPOINT = `${BNF_API_BASE}/token`;
    // Durée de vie par défaut si l'API ne renvoie pas expires_in
    const DEFAULT_TTL_MS = 5 * 60 * 1000;
    // Marge de sécurité pour considérer le jeton en cache comme expiré un peu
    // avant son expiration réelle (dérive d'horloge, latence réseau...)
    const SAFETY_MARGIN_MS = 30 * 1000;
    // Marge utilisée pour le renouvellement PROACTIF (tant que la page reste
    // active) : le jeton interne expire au bout de 15 minutes, on le renouvelle
    // donc bien avant ce délai sans attendre qu'un appel échoue en 401.
    const PROACTIVE_REFRESH_MARGIN_MS = 60 * 1000;
    // Nombre de chargements d'images simultanés (évite de saturer l'API BnF)
    const IMAGE_CONCURRENCY = 6;
    // Délai avant de retenter une requête ayant échoué en erreur réseau/CORS
    // (cf. commentaire sur `fetch()` ci-dessous)
    const NETWORK_RETRY_DELAY_MS = 800;

    class GallicaIIIFAuth {
        constructor() {
            this._token = null;
            this._tokenExpiresAt = 0;
            this._tokenPromise = null;
            this._refreshTimeoutId = null;
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
                    this._scheduleProactiveRefresh(ttlMs);

                    return this._token;
                } finally {
                    this._tokenPromise = null;
                }
            })();

            return this._tokenPromise;
        }

        /**
         * Renouvelle le jeton en arrière-plan avant son expiration réelle, tant
         * que la page reste ouverte — évite de dépendre d'un appel applicatif
         * (ou d'un 401) pour déclencher le renouvellement.
         */
        _scheduleProactiveRefresh(ttlMs) {
            if (this._refreshTimeoutId) {
                clearTimeout(this._refreshTimeoutId);
            }
            const delay = Math.max(ttlMs - PROACTIVE_REFRESH_MARGIN_MS, SAFETY_MARGIN_MS);
            this._refreshTimeoutId = setTimeout(() => {
                this.getToken(true).catch((error) => {
                    console.warn('Renouvellement proactif du jeton API BnF échoué:', error);
                });
            }, delay);
        }

        /**
         * URL du manifeste IIIF Presentation v3 pour un ark donné.
         */
        buildManifestUrl(arkId) {
            return `${BNF_API_BASE}/iiif/manifest/${ARK_REPO_ID}/${encodeURIComponent(arkId)}`;
        }

        /**
         * URL info.json (IIIF Image Information API) pour une vue donnée.
         * `view` accepte indifféremment un numéro (1) ou un folio préfixé ("f1").
         */
        buildImageInfoUrl(arkId, view = 1) {
            const viewNumber = String(view).replace(/^f/i, '');
            return `${BNF_API_BASE}/iiif/image/${ARK_REPO_ID}/${encodeURIComponent(arkId)}/f${viewNumber}/info.json`;
        }

        /**
         * URL de récupération d'image (IIIF Image Request API).
         * `view` accepte indifféremment un numéro (1) ou un folio préfixé ("f1").
         */
        buildImageUrl(arkId, view = 1, options = {}) {
            const {
                region = 'full',
                size = ',480',
                rotation = '0',
                quality = 'default',
                fmt = 'webp'
            } = options;
            const viewNumber = String(view).replace(/^f/i, '');
            return `${BNF_API_BASE}/iiif/image/${ARK_REPO_ID}/${encodeURIComponent(arkId)}/f${viewNumber}/${region}/${size}/${rotation}/${quality}.${fmt}`;
        }

        /**
         * Raccourci pour une vignette (utilisé par les galeries de cartes).
         */
        buildThumbnailUrl(arkId, view = 1, height = 480) {
            return this.buildImageUrl(arkId, view, { size: `,${height}` });
        }

        /**
         * Équivalent authentifié de `fetch()` pour les URL de l'API BnF.
         * Retente une fois avec un jeton renouvelé si la réponse est 401.
         *
         * NB : l'API BnF passe-plat ne renvoie pas toujours l'en-tête CORS
         * Access-Control-Allow-Origin sur ses réponses d'erreur (401/400...),
         * probablement lorsqu'elle-même reçoit ponctuellement un refus de
         * l'upstream BnF (jeton interne à l'API en cours de renouvellement côté
         * serveur). Dans ce cas le navigateur bloque la réponse en CORS et
         * `fetch()` lève une erreur générique, sans code HTTP exploitable ici :
         * impossible de détecter le 401 pour appliquer le retry ci-dessus. On
         * retente donc une fois après un court délai sur toute erreur réseau,
         * ces échecs étant le plus souvent transitoires côté API.
         */
        async fetch(url, options = {}, _isRetry = false) {
            const token = await this.getToken();

            const headers = new Headers(options.headers || {});
            headers.set('Authorization', `Bearer ${token}`);

            let response;
            try {
                response = await fetch(url, Object.assign({}, options, { headers }));
            } catch (networkError) {
                if (_isRetry) {
                    throw networkError;
                }
                await new Promise((resolve) => setTimeout(resolve, NETWORK_RETRY_DELAY_MS));
                return this.fetch(url, options, true);
            }

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
