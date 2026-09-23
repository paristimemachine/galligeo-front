/**
 * Détection de carte déjà géoréférencée.
 *
 * Avant de charger une image Gallica (saisie manuelle ou lien Cartoquête avec
 * arkid), on vérifie auprès de l'API si cet ARK/cette feuille a déjà été
 * géoréférencé. Si oui, on affiche une modale qui laisse le choix à
 * l'utilisateur : consulter le résultat existant, ou tout de même proposer
 * une nouvelle version.
 *
 * Doc API lookup : https://api.ptm.huma-num.fr/galligeo/docs#/Georeferencing/lookup_lookup_get
 */
(function () {
    const LOOKUP_API_BASE = 'https://api.ptm.huma-num.fr/galligeo';
    // Endpoint public (pas d'auth requise) qui liste, par utilisateur, les cartes
    // qu'il a géoréférencées : sert à afficher "qui et quand" en complément du lookup.
    const USERS_MAPS_API = 'https://api.ptm.huma-num.fr/auth/admin/galligeo/georeferenced-maps-by-users';
    const CONTRIBUTORS_CACHE_TTL_MS = 2 * 60 * 1000;

    let contributorsCache = null; // { fetchedAt, byArk: Map<ark, entry[]> }

    async function lookupArk(arkId, folioNum) {
        const arkUrl = base_url + arkId;
        const params = new URLSearchParams({ ark_url: arkUrl });
        if (folioNum) params.set('page', String(folioNum));

        const response = await fetch(`${LOOKUP_API_BASE}/lookup?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`Lookup HTTP ${response.status}`);
        }
        return response.json();
    }

    async function getContributorsIndex() {
        if (contributorsCache && (Date.now() - contributorsCache.fetchedAt) < CONTRIBUTORS_CACHE_TTL_MS) {
            return contributorsCache.byArk;
        }

        const response = await fetch(USERS_MAPS_API);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();

        const byArk = new Map();
        (data.users || []).forEach(user => {
            (user.georeferenced_maps || []).forEach(map => {
                const list = byArk.get(map.ark) || [];
                list.push({
                    name: user.full_name || user.first_name || 'Utilisateur inconnu',
                    status: map.status,
                    firstWorked: map.firstWorked,
                    lastUpdated: map.lastUpdated,
                    quality: map.quality
                });
                byArk.set(map.ark, list);
            });
        });

        contributorsCache = { fetchedAt: Date.now(), byArk };
        return byArk;
    }

    async function fetchContributors(arkId) {
        try {
            const index = await getContributorsIndex();
            return index.get(arkId) || [];
        } catch (error) {
            console.warn('⚠️ Impossible de récupérer la liste des contributeurs:', error);
            return [];
        }
    }

    function formatDate(isoString) {
        if (!isoString) return '';
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function escapeHtml(str) {
        return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function renderContributorsList(contributors) {
        if (!contributors || contributors.length === 0) {
            return '';
        }

        const items = contributors.map(c => {
            const when = formatDate(c.lastUpdated || c.firstWorked);
            const whenLabel = when ? ` — ${when}` : '';
            return `<li>${escapeHtml(c.name)}${whenLabel}</li>`;
        }).join('');

        return `
            <p class="fr-mb-1w"><strong>Qui a géoréférencé cette carte :</strong></p>
            <ul class="fr-mb-2w">${items}</ul>
        `;
    }

    function getModalElements() {
        return {
            modal: document.getElementById('fr-modal-ark-duplicate'),
            body: document.getElementById('fr-modal-ark-duplicate-body'),
            btnConsult: document.getElementById('btn-ark-duplicate-consult'),
            btnProceed: document.getElementById('btn-ark-duplicate-proceed'),
            btnCancel: document.getElementById('btn-ark-duplicate-cancel')
        };
    }

    function openModal(modal) {
        try {
            const dsfrInstance = window.dsfr ? window.dsfr(modal) : null;
            const dsfrModal = dsfrInstance ? dsfrInstance.modal : null;
            if (dsfrModal) {
                dsfrModal.disclose();
            } else {
                modal.showModal();
            }
        } catch (error) {
            console.error('Erreur lors de l\'ouverture de la modale de doublon:', error);
            modal.showModal();
        }
    }

    function closeModal(modal) {
        try {
            const dsfrInstance = window.dsfr ? window.dsfr(modal) : null;
            const dsfrModal = dsfrInstance ? dsfrInstance.modal : null;
            if (dsfrModal) {
                dsfrModal.conceal();
            } else {
                modal.close();
            }
        } catch (error) {
            console.error('Erreur lors de la fermeture de la modale de doublon:', error);
        }
    }

    function showDuplicateModal(arkId, folioNum, contributors) {
        return new Promise((resolve) => {
            const { modal, body, btnConsult, btnProceed, btnCancel } = getModalElements();

            if (!modal || !body || !btnConsult || !btnProceed || !btnCancel) {
                console.error('Modale de doublon introuvable dans le DOM, on continue sans avertir.');
                resolve('proceed');
                return;
            }

            const folio = 'f' + (folioNum || 1);

            body.innerHTML = `
                <div class="fr-alert fr-alert--info fr-mb-2w">
                    <p class="fr-alert__title">Cette carte a déjà été géoréférencée</p>
                    <p>La feuille <strong>${escapeHtml(folio)}</strong> de l'ARK <strong>${escapeHtml(arkId)}</strong> existe déjà dans Galligeo.</p>
                </div>
                ${renderContributorsList(contributors)}
                <p>Vous pouvez consulter le résultat existant, ou proposer une nouvelle version de ce géoréférencement.</p>
            `;

            let settled = false;
            const finish = (choice) => {
                if (settled) return;
                settled = true;
                closeModal(modal);
                resolve(choice);
            };

            btnConsult.onclick = () => {
                window.open('./georef/?ark=' + arkId + '&f=' + folio, '_blank').focus();
                finish('cancel');
            };
            btnProceed.onclick = () => finish('proceed');
            btnCancel.onclick = () => finish('cancel');

            // Fermeture via la croix ou Échap : on considère que l'utilisateur annule.
            modal.addEventListener('close', () => finish('cancel'), { once: true });

            openModal(modal);

            setTimeout(() => {
                const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) firstFocusable.focus();
            }, 100);
        });
    }

    /**
     * Vérifie si l'ARK/feuille demandé a déjà été géoréférencé et, le cas
     * échéant, demande à l'utilisateur comment procéder.
     *
     * @returns {Promise<'proceed'|'cancel'>} 'proceed' pour continuer le
     *   chargement normal, 'cancel' si l'utilisateur a choisi de consulter
     *   l'existant (ou a fermé la modale) et que le chargement doit s'arrêter.
     */
    async function checkAndPrompt(arkId, folioNum) {
        let lookup;
        try {
            lookup = await lookupArk(arkId, folioNum);
        } catch (error) {
            console.warn('⚠️ Vérification de doublon impossible, on continue normalement:', error);
            return 'proceed';
        }

        if (!lookup || !lookup.found) {
            return 'proceed';
        }

        const doneEntries = (lookup.entries || []).filter(e => e.status === 'done' || e.is_georef);
        if (doneEntries.length === 0) {
            return 'proceed';
        }

        const contributors = await fetchContributors(arkId);

        return showDuplicateModal(arkId, folioNum, contributors);
    }

    window.GallicaDuplicateCheck = {
        checkAndPrompt,
        lookupArk,
        fetchContributors
    };
})();
