/**
 * Galligeo — Interface d'Administration
 * Accès restreint : ORCID 0000-0001-9186-0492 (Eric Mermet)
 *
 * API PTM utilisée :
 *   GET  /auth/admin/galligeo/georeferenced-maps-by-users   → tous les users + leurs cartes
 *   GET  /auth/app/galligeo/atlas                           → tous les atlas publics
 *   GET  /auth/app/galligeo/atlas?owner=ORCID&include_private=true → atlas d'un user
 *   POST /auth/app/galligeo/data                            → sauvegarde données user (propre compte)
 *   POST /auth/admin/galligeo/users/{orcid}/data            → modification données user (admin)
 *   DELETE /auth/app/galligeo/atlas/{atlasId}               → suppression atlas
 *   POST /auth/app/galligeo/update-metadata                 → mise à jour métadonnées carte
 */

'use strict';

// ─── CONSTANTES ─────────────────────────────────────────────────────────────

const ADMIN_ORCID        = '0000-0001-9186-0492';
const API_BASE           = 'https://api.ptm.huma-num.fr/auth';
const GALLICA_THUMB_BASE = 'https://openapi.bnf.fr/iiif/image/v3/ark:/12148';

// ─── ÉTAT GLOBAL ────────────────────────────────────────────────────────────

let allUsersData   = [];   // { orcid_id, name, georeferenced_maps[] }
let allMapsData    = [];   // vue aplatie : { ark, status, users[], ... }
let allAtlasData   = [];   // atlas de l'API

// ─── HELPERS UTILISATEURS ────────────────────────────────────────────────────

/**
 * Retourne le nom complet d'un objet user (prénom + nom ou name ou ORCID).
 */
function formatUserName(user) {
  if (!user) return '—';
  const given  = user.given_name  || user.givenName  || user.first_name  || '';
  const family = user.family_name || user.familyName || user.last_name   || '';
  if (given || family) return `${given} ${family}`.trim();
  const orcid  = user.orcid_id || user.orcid || '';
  return user.name || user.display_name || orcid || '—';
}

/**
 * Cherche un utilisateur dans allUsersData par son ORCID.
 */
function getUserByOrcid(orcid) {
  return allUsersData.find(u => (u.orcid_id || u.orcid) === orcid) || null;
}

// ─── INIT ────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', async () => {
  await checkAdminAccess();
});

/**
 * Vérifie que l'utilisateur connecté est bien l'admin autorisé.
 */
async function checkAdminAccess() {
  const loadingEl    = document.getElementById('loading-screen');
  const deniedEl     = document.getElementById('access-denied');
  const interfaceEl  = document.getElementById('admin-interface');

  // Attendre que ptmAuth soit disponible
  if (!window.ptmAuth) {
    window.ptmAuth = new PTMAuthFixed();
  }

  const authStatus = await window.ptmAuth.checkAuthStatus();

  if (!authStatus.authenticated) {
    loadingEl.style.display  = 'none';
    deniedEl.style.display   = 'flex';
    return;
  }

  const orcid = authStatus.user?.orcid || authStatus.user?.sub;

  if (orcid !== ADMIN_ORCID) {
    loadingEl.style.display  = 'none';
    deniedEl.style.display   = 'flex';
    return;
  }

  // Accès autorisé
  loadingEl.style.display  = 'none';
  interfaceEl.style.display = 'block';

  // Afficher l'info de l'utilisateur dans le header
  const name = authStatus.user.name || 'Eric Mermet';
  document.getElementById('admin-user-info').innerHTML = `
    <span class="fr-btn fr-btn--tertiary-no-outline fr-icon-user-line" style="color:#000091; cursor:default;">
      ${escapeHtml(name)}
    </span>
    <button class="fr-btn fr-btn--secondary fr-btn--sm" onclick="doLogout()">Déconnexion</button>
  `;

  // Charger les données
  await loadAllData();
}

// ─── CHARGEMENT DES DONNÉES ───────────────────────────────────────────────────

/**
 * Charge toutes les données (utilisateurs + cartes + atlas).
 */
async function loadAllData() {
  await Promise.all([
    loadUsersAndMaps(),
    loadAtlas()
  ]);
  // Re-rendre l'atlas maintenant que allUsersData est peuplé
  // (les deux chargent en parallèle, atlas peut finir avant users)
  if (allAtlasData.length > 0) renderAtlasTable(allAtlasData);
  updateStats();
}

/**
 * Récupère la liste exhaustive de tous les utilisateurs avec leurs cartes.
 * Endpoint admin : GET /auth/admin/galligeo/georeferenced-maps-by-users
 */
async function loadUsersAndMaps() {
  setLoading('users', true);
  setLoading('maps', true);
  clearError('users');
  clearError('maps');

  try {
    const token    = window.ptmAuth.getToken();
    const response = await fetch(`${API_BASE}/admin/galligeo/georeferenced-maps-by-users`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    if (!response.ok) {
      throw new Error(`Erreur API ${response.status} : ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'ok' || !data.users) {
      throw new Error('Structure de réponse inattendue (status !== ok ou users absent)');
    }

    allUsersData = data.users;

    // Construire une vue aplatie carte → utilisateurs
    const mapsIndex = {}; // ark → { ark, status, users[], titles, dates }

    for (const user of allUsersData) {
      const maps = user.georeferenced_maps || user.maps || [];
      for (const map of maps) {
        const ark = map.ark;
        if (!mapsIndex[ark]) {
          mapsIndex[ark] = {
            ark,
            status:      map.status || 'unknown',
            gallicaTitle:    map.gallica_title    || '',
            gallicaProducer: map.gallica_producer || '',
            gallicaDate:     map.gallica_date     || '',
            lastUpdated:  map.lastUpdated || map.last_updated || '',
            doi:          map.doi || '',
            users: []
          };
        }
        mapsIndex[ark].users.push({
          orcid:      user.orcid_id || user.orcid,
          name:       formatUserName(user),
          givenName:  user.given_name  || user.first_name  || '',
          familyName: user.family_name || user.last_name   || ''
        });
        // Prendre le statut le plus récent (si plusieurs users ont la même carte)
        if (map.lastUpdated > mapsIndex[ark].lastUpdated) {
          mapsIndex[ark].lastUpdated = map.lastUpdated;
          mapsIndex[ark].status      = map.status;
        }
      }
    }

    allMapsData = Object.values(mapsIndex);

    renderUsersTable(allUsersData);
    renderMapsTable(allMapsData);

  } catch (err) {
    console.error('Erreur chargement utilisateurs/cartes:', err);
    showError('users', `Impossible de charger les utilisateurs : ${err.message}`);
    showError('maps',  `Impossible de charger les cartes : ${err.message}`);
  } finally {
    setLoading('users', false);
    setLoading('maps',  false);
  }
}

/**
 * Charge tous les atlas (publics + privés via ORCID admin).
 */
async function loadAtlas() {
  setLoading('atlas', true);
  clearError('atlas');

  try {
    const token = window.ptmAuth.getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // Récupérer les atlas publics
    const [pubResp, privResp] = await Promise.all([
      fetch(`${API_BASE}/app/galligeo/atlas`, { headers }),
      fetch(`${API_BASE}/app/galligeo/atlas?owner=${encodeURIComponent(ADMIN_ORCID)}&include_private=true`, { headers })
    ]);

    const atlasMap = {};

    if (pubResp.ok) {
      const pubData = await pubResp.json();
      const list = Array.isArray(pubData) ? pubData : (pubData.atlas || pubData.atlases || []);
      for (const a of list) atlasMap[a.id] = a;
    }

    if (privResp.ok) {
      const privData = await privResp.json();
      const list = Array.isArray(privData) ? privData : (privData.atlas || privData.atlases || []);
      for (const a of list) atlasMap[a.id] = { ...atlasMap[a.id], ...a };
    }

    allAtlasData = Object.values(atlasMap);
    renderAtlasTable(allAtlasData);
    updateStats();

  } catch (err) {
    console.error('Erreur chargement atlas:', err);
    showError('atlas', `Impossible de charger les atlas : ${err.message}`);
  } finally {
    setLoading('atlas', false);
  }
}

// ─── RENDU DES TABLEAUX ───────────────────────────────────────────────────────

function renderUsersTable(users) {
  const tbody = document.getElementById('users-tbody');
  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="fr-text--center fr-py-4w">Aucun utilisateur trouvé</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => {
    const maps      = user.georeferenced_maps || user.maps || [];
    const orcid     = user.orcid_id || user.orcid || '—';
    const fullName  = escapeHtml(formatUserName(user));
    const enCours   = maps.filter(m => m.status === 'en-cours').length;
    const georef    = maps.filter(m => m.status === 'georeferenced').length;
    const deposee   = maps.filter(m => m.status === 'deposee').length;

    return `
      <tr>
        <td>
          <strong>${fullName}</strong><br>
          <a href="https://orcid.org/${escapeHtml(orcid)}" target="_blank" rel="noopener"
             class="fr-link fr-text--sm" style="font-family:monospace;">${escapeHtml(orcid)}</a>
        </td>
        <td><strong>${maps.length}</strong></td>
        <td>${enCours > 0 ? `<span class="status-badge status-en-cours">${enCours}</span>` : '0'}</td>
        <td>${georef  > 0 ? `<span class="status-badge status-georef">${georef}</span>`   : '0'}</td>
        <td>${deposee > 0 ? `<span class="status-badge status-deposee">${deposee}</span>` : '0'}</td>
        <td>${maps.length > 0 ? `<strong>${maps.length}</strong>` : '<span class="fr-text--mention-grey">0</span>'}</td>
        <td>${enCours > 0 ? `<span class="status-badge status-en-cours">${enCours}</span>` : '0'}</td>
        <td>${georef  > 0 ? `<span class="status-badge status-georef">${georef}</span>`   : '0'}</td>
        <td>${deposee > 0 ? `<span class="status-badge status-deposee">${deposee}</span>` : '0'}</td>
        <td class="action-btn-group">
          <button class="fr-btn fr-btn--sm fr-btn--tertiary fr-icon-eye-line"
            title="Voir le détail"
            onclick='openUserDetail(${JSON.stringify(orcid)})'>
            Détail
          </button>
        </td>
      </tr>`;
  }).join('');
}

function renderMapsTable(maps) {
  const tbody = document.getElementById('maps-tbody');
  if (!maps || maps.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="fr-text--center fr-py-4w">Aucune carte trouvée</td></tr>';
    return;
  }

  tbody.innerHTML = maps.map(map => {
    const ark       = map.ark || '—';
    const thumb     = `${GALLICA_THUMB_BASE}/${encodeURIComponent(ark)}/f1/full/,80/0/default.webp`;
    const title     = escapeHtml(map.gallicaTitle || ark);
    const status    = map.status || 'unknown';
    const statusBadge = renderStatusBadge(status);
    const lastUpd   = map.lastUpdated ? new Date(map.lastUpdated).toLocaleDateString('fr-FR') : '—';
    const usersHtml = (map.users || []).map(u => {
      const uName = escapeHtml(u.name || u.orcid);
      const uOrcid = escapeHtml(u.orcid);
      return `<span class="user-pill">
        <strong>${uName}</strong><br>
        <span style="font-family:monospace;font-size:0.7rem;color:#666;">${uOrcid}</span>
      </span>`;
    }).join(' ');

    const userCount = (map.users || []).length;

    return `
      <tr data-ark="${escapeHtml(ark)}" data-status="${escapeHtml(status)}" data-search="${escapeHtml((title + ' ' + ark + ' ' + (map.users || []).map(u => u.name+' '+u.orcid).join(' ')).toLowerCase())}">
        <td>
          <img src="${escapeHtml(thumb)}" alt="Vignette ${escapeHtml(ark)}" class="map-thumb"
               onerror="this.style.display='none'">
        </td>
        <td>
          <a href="https://gallica.bnf.fr/ark:/12148/${escapeHtml(ark)}" target="_blank" rel="noopener"
             class="fr-link fr-text--sm" title="Voir sur Gallica">
            ${escapeHtml(ark)}
          </a>
          ${map.doi ? `<br><span class="fr-text--sm fr-text--mention-grey">DOI: ${escapeHtml(map.doi)}</span>` : ''}
        </td>
        <td>${title !== escapeHtml(ark) ? title : '<em class="fr-text--mention-grey">Non renseigné</em>'}</td>
        <td>${statusBadge}</td>
        <td>
          ${usersHtml || '<em class="fr-text--mention-grey">Aucun</em>'}
          ${userCount > 1 ? `<br><span class="fr-badge fr-badge--warning fr-badge--sm fr-mt-1w">⚠ ${userCount} utilisateurs</span>` : ''}
        </td>
        <td>${lastUpd}</td>
        <td class="action-btn-group">
          <button class="fr-btn fr-btn--sm fr-btn--tertiary fr-icon-edit-line fr-mb-1w"
            title="Modifier les métadonnées"
            onclick='openMapMeta(${JSON.stringify(ark)}, ${JSON.stringify(map)})'>
            Métadonnées
          </button>
          ${(map.users || []).map(u => {
            const label = escapeHtml(u.name || u.orcid);
            return `<button class="fr-btn fr-btn--sm fr-btn--tertiary fr-btn--error fr-icon-delete-line fr-mb-1w"
              title="Retirer de ${label} (${escapeHtml(u.orcid)})"
              onclick='openDeleteMapModal(${JSON.stringify(ark)}, ${JSON.stringify(u.orcid)}, ${JSON.stringify(u.name || u.orcid)})'>
              Retirer de ${label}
            </button>`;
          }).join('')}
        </td>
      </tr>`;
  }).join('');
}

function renderAtlasTable(atlases) {
  const tbody = document.getElementById('atlas-tbody');
  if (!atlases || atlases.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="fr-text--center fr-py-4w">Aucun atlas trouvé</td></tr>';
    return;
  }

  tbody.innerHTML = atlases.map(a => {
    const name     = escapeHtml(a.name || '—');
    const ownerOrcid = a.owner_orcid || a.owner || a.created_by || '';
    const ownerUser  = ownerOrcid ? getUserByOrcid(ownerOrcid) : null;
    const ownerName  = ownerUser ? escapeHtml(formatUserName(ownerUser)) : '';
    const nbMaps   = (a.ark_ids || a.maps || []).length;
    const mode     = escapeHtml(a.display_mode || a.mode || 'diachronique');
    const isPublic = a.is_public !== false;
    const created  = a.created_at ? new Date(a.created_at).toLocaleDateString('fr-FR') : '—';
    const atlasId  = a.id;
    const slug     = a.url || a.slug || '';

    return `
      <tr>
        <td>
          <strong>${name}</strong>
          ${slug ? `<br><a href="${escapeHtml(slug)}" target="_blank" class="fr-link fr-text--sm" rel="noopener">${escapeHtml(slug)}</a>` : ''}
        </td>
        <td>
          ${ownerName ? `<strong>${ownerName}</strong><br>` : ''}
          <a href="https://orcid.org/${escapeHtml(ownerOrcid)}" target="_blank" rel="noopener"
             class="fr-link fr-text--sm" style="font-family:monospace;">${escapeHtml(ownerOrcid || '—')}</a>
        </td>
        <td>${nbMaps}</td>
        <td><span class="fr-badge fr-badge--blue-cumulus fr-badge--sm">${mode}</span></td>
        <td>
          ${isPublic
            ? '<span class="fr-badge fr-badge--success fr-badge--sm">Public</span>'
            : '<span class="fr-badge fr-badge--sm">Privé</span>'}
        </td>
        <td>${created}</td>
        <td class="action-btn-group">
          ${slug ? `<a class="fr-btn fr-btn--sm fr-btn--tertiary fr-icon-eye-line fr-mb-1w" href="${escapeHtml(slug)}" target="_blank" rel="noopener">Voir</a>` : ''}
          <button class="fr-btn fr-btn--sm fr-btn--tertiary fr-btn--error fr-icon-delete-line"
            onclick='confirmDeleteAtlas(${JSON.stringify(atlasId)}, ${JSON.stringify(a.name)})'>
            Supprimer
          </button>
        </td>
      </tr>`;
  }).join('');
}

// ─── FILTRAGE ─────────────────────────────────────────────────────────────────

function filterUsers(query) {
  const q = query.toLowerCase().trim();
  const rows = document.querySelectorAll('#users-tbody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = q === '' || text.includes(q) ? '' : 'none';
  });
}

function filterMaps(query) {
  const q      = query.toLowerCase().trim();
  const status = document.getElementById('filter-status').value;
  const rows   = document.querySelectorAll('#maps-tbody tr');
  rows.forEach(row => {
    const search  = (row.dataset.search || row.textContent).toLowerCase();
    const rowStat = row.dataset.status || '';
    const matchQ  = q === '' || search.includes(q);
    const matchS  = status === '' || rowStat === status;
    row.style.display = (matchQ && matchS) ? '' : 'none';
  });
}

function filterAtlas(query) {
  const q = query.toLowerCase().trim();
  const rows = document.querySelectorAll('#atlas-tbody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = q === '' || text.includes(q) ? '' : 'none';
  });
}

// ─── ONGLETS ─────────────────────────────────────────────────────────────────

function switchTab(tab) {
  ['users', 'maps', 'atlas'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('active', t === tab);
    const btn = document.getElementById(`tab-btn-${t}`);
    btn.classList.toggle('active', t === tab);
    btn.setAttribute('aria-selected', t === tab ? 'true' : 'false');
  });
}

// ─── MODALES ─────────────────────────────────────────────────────────────────

function openUserDetail(orcid) {
  const user = allUsersData.find(u => (u.orcid_id || u.orcid) === orcid);
  if (!user) return;

  const maps       = user.georeferenced_maps || user.maps || [];
  const body       = document.getElementById('modal-user-detail-body');
  const fullName   = escapeHtml(formatUserName(user));
  const givenName  = escapeHtml(user.given_name  || user.first_name  || '');
  const familyName = escapeHtml(user.family_name || user.last_name   || '');

  body.innerHTML = `
    <dl class="fr-grid-row fr-grid-row--gutters fr-mb-1w">
      <dt class="fr-col-4"><strong>ORCID</strong></dt>
      <dd class="fr-col-8"><a href="https://orcid.org/${escapeHtml(orcid)}" target="_blank" rel="noopener" class="fr-link"><code>${escapeHtml(orcid)}</code></a></dd>
      <dt class="fr-col-4"><strong>Nom complet</strong></dt>
      <dd class="fr-col-8">${fullName}</dd>
      ${givenName ? `<dt class="fr-col-4">Prénom</dt><dd class="fr-col-8">${givenName}</dd>` : ''}
      ${familyName ? `<dt class="fr-col-4">Nom</dt><dd class="fr-col-8">${familyName}</dd>` : ''}
    </dl>
    <p><strong>Nombre de cartes :</strong> ${maps.length}</p>
    <hr class="fr-hr fr-my-2w">
    <h3 class="fr-h6">Cartes associées</h3>
    ${maps.length === 0 ? '<p class="fr-text--mention-grey">Aucune carte</p>' : `
    <table class="fr-table fr-table--bordered fr-table--sm">
      <thead>
        <tr>
          <th>ARK</th>
          <th>Titre</th>
          <th>Statut</th>
          <th>Dernière màj</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${maps.map(m => `
          <tr>
            <td><a href="https://gallica.bnf.fr/ark:/12148/${escapeHtml(m.ark)}" target="_blank" rel="noopener" class="fr-link">${escapeHtml(m.ark)}</a></td>
            <td>${escapeHtml(m.gallica_title || '—')}</td>
            <td>${renderStatusBadge(m.status)}</td>
            <td>${m.lastUpdated ? new Date(m.lastUpdated).toLocaleDateString('fr-FR') : '—'}</td>
            <td>
              <button class="fr-btn fr-btn--sm fr-btn--error fr-icon-delete-line"
                onclick='openDeleteMapModal(${JSON.stringify(m.ark)}, ${JSON.stringify(orcid)}, ${JSON.stringify(user.name || orcid)})'>
                Retirer
              </button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`}
  `;

  openModal('modal-user-detail');
}

function openMapMeta(ark, mapData) {
  document.getElementById('meta-ark-id').value    = ark;
  document.getElementById('meta-title').value     = mapData.gallicaTitle   || '';
  document.getElementById('meta-producer').value  = mapData.gallicaProducer || '';
  document.getElementById('meta-date').value      = mapData.gallicaDate    || '';
  document.getElementById('meta-status').value    = mapData.status || 'en-cours';
  document.getElementById('meta-user-orcid').value = (mapData.users && mapData.users[0]) ? mapData.users[0].orcid : '';

  const feedback = document.getElementById('meta-save-feedback');
  feedback.style.display = 'none';

  openModal('modal-map-meta');
}

function openDeleteMapModal(ark, userOrcid, userName) {
  document.getElementById('delete-map-ark').value   = ark;
  document.getElementById('delete-map-orcid').value = userOrcid;
  document.getElementById('delete-map-confirm-text').textContent =
    `Voulez-vous vraiment retirer la carte « ${ark} » du compte de ${userName} (${userOrcid}) ?`;

  const feedback = document.getElementById('delete-map-feedback');
  feedback.style.display = 'none';

  const btn = document.getElementById('delete-map-confirm-btn');
  btn.disabled = false;

  openModal('modal-delete-map');
}

// ─── ACTIONS ─────────────────────────────────────────────────────────────────

/**
 * Sauvegarde les métadonnées d'une carte pour un utilisateur donné.
 * Utilise POST /auth/admin/galligeo/users/{orcid}/data pour modifier les données d'un autre user.
 */
async function saveMapMetadata() {
  const ark        = document.getElementById('meta-ark-id').value;
  const userOrcid  = document.getElementById('meta-user-orcid').value;
  const newTitle   = document.getElementById('meta-title').value.trim();
  const newProd    = document.getElementById('meta-producer').value.trim();
  const newDate    = document.getElementById('meta-date').value.trim();
  const newStatus  = document.getElementById('meta-status').value;
  const feedback   = document.getElementById('meta-save-feedback');

  feedback.style.display = 'none';

  const token = window.ptmAuth.getToken();
  if (!token) {
    showFeedback(feedback, 'error', 'Token manquant. Reconnectez-vous.');
    return;
  }

  try {
    // Si on a un utilisateur cible, on tente de modifier via l'endpoint admin
    if (userOrcid) {
      await adminModifyUserMap(userOrcid, ark, {
        status:              newStatus,
        gallica_title:       newTitle   || undefined,
        gallica_producer:    newProd    || undefined,
        gallica_date:        newDate    || undefined,
        lastUpdated:         new Date().toISOString()
      });
    } else {
      // Fallback : utiliser update-metadata (si disponible)
      const resp = await fetch(`${API_BASE}/app/galligeo/update-metadata`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          ark,
          gallica_title:    newTitle   || undefined,
          gallica_producer: newProd    || undefined,
          gallica_date:     newDate    || undefined
        })
      });
      if (!resp.ok) throw new Error(`Erreur API ${resp.status}`);
    }

    showFeedback(feedback, 'success', 'Métadonnées enregistrées avec succès.');
    // Mettre à jour notre cache local
    const mapEntry = allMapsData.find(m => m.ark === ark);
    if (mapEntry) {
      mapEntry.gallicaTitle    = newTitle;
      mapEntry.gallicaProducer = newProd;
      mapEntry.gallicaDate     = newDate;
      mapEntry.status          = newStatus;
    }
    // Rafraîchir le tableau
    filterMaps(document.getElementById('search-maps').value);

  } catch (err) {
    console.error('Erreur sauvegarde métadonnées:', err);
    showFeedback(feedback, 'error', `Erreur : ${err.message}`);
  }
}

/**
 * Retire une carte du profil d'un utilisateur (suppression de la mauvaise attribution).
 */
async function confirmDeleteMapFromUser() {
  const ark       = document.getElementById('delete-map-ark').value;
  const orcid     = document.getElementById('delete-map-orcid').value;
  const feedback  = document.getElementById('delete-map-feedback');
  const btn       = document.getElementById('delete-map-confirm-btn');

  feedback.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<span class="fr-icon-loader-line fr-mr-1w" aria-hidden="true"></span>Suppression…';

  try {
    await adminRemoveMapFromUser(orcid, ark);

    showFeedback(feedback, 'success', `La carte ${ark} a été retirée du profil ${orcid}.`);

    // Mettre à jour les données locales
    const user = allUsersData.find(u => (u.orcid_id || u.orcid) === orcid);
    if (user) {
      const maps = user.georeferenced_maps || user.maps || [];
      const idx  = maps.findIndex(m => m.ark === ark);
      if (idx >= 0) maps.splice(idx, 1);
    }

    // Mettre à jour allMapsData
    const mapEntry = allMapsData.find(m => m.ark === ark);
    if (mapEntry) {
      mapEntry.users = mapEntry.users.filter(u => u.orcid !== orcid);
      if (mapEntry.users.length === 0) {
        allMapsData = allMapsData.filter(m => m.ark !== ark);
      }
    }

    // Re-rendre les tableaux
    renderUsersTable(allUsersData);
    renderMapsTable(allMapsData);
    updateStats();

  } catch (err) {
    console.error('Erreur suppression carte:', err);
    const msg = escapeHtml(err.message).replace(/\n/g, '<br>');
    showFeedback(feedback, 'error', msg, true);
    btn.disabled = false;
    btn.innerHTML = '<span class="fr-icon-delete-line fr-mr-1w" aria-hidden="true"></span>Confirmer la suppression';
  }
}

/**
 * Suppression d'un atlas.
 */
async function confirmDeleteAtlas(atlasId, atlasName) {
  if (!confirm(`Supprimer l'atlas « ${atlasName} » (id: ${atlasId}) ? Cette action est irréversible.`)) return;

  const token = window.ptmAuth.getToken();
  try {
    const resp = await fetch(`${API_BASE}/app/galligeo/atlas/${encodeURIComponent(atlasId)}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error(`Erreur API ${resp.status}`);

    allAtlasData = allAtlasData.filter(a => a.id !== atlasId);
    renderAtlasTable(allAtlasData);
    updateStats();
    alert(`Atlas « ${atlasName} » supprimé.`);

  } catch (err) {
    alert(`Erreur lors de la suppression : ${err.message}`);
  }
}

// ─── FONCTIONS ADMIN API ──────────────────────────────────────────────────────

/**
 * Modifie les métadonnées d'une carte pour un utilisateur.
 *
 * - Si l'utilisateur cible est l'admin lui-même → son propre endpoint PUT /app/galligeo/data.
 * - Si c'est un autre utilisateur → erreur explicite (pas d'endpoint admin en écriture disponible).
 */
async function adminModifyUserMap(userOrcid, ark, updateFields) {
  if (userOrcid !== ADMIN_ORCID) {
    throw new Error(
      `L'API PTM ne propose pas encore d'endpoint admin en écriture pour les données d'autres utilisateurs.\n` +
      `Pour modifier la carte ${ark} de l'utilisateur ${userOrcid}, contactez l'équipe backend PTM afin d'activer cet endpoint.`
    );
  }

  // Carte appartenant à l'admin : utiliser son propre endpoint
  const existingData = await window.ptmAuth.getGalligeoData();
  const rec_ark = existingData.rec_ark || [];
  const idx = rec_ark.findIndex(m => m.ark === ark);

  if (idx >= 0) {
    rec_ark[idx] = { ...rec_ark[idx], ...updateFields };
  } else {
    rec_ark.push({ ark, ...updateFields });
  }

  return await window.ptmAuth.saveGalligeoData({ ...existingData, rec_ark });
}

/**
 * Retire une carte du profil d'un utilisateur.
 *
 * - Si l'utilisateur cible est l'admin lui-même → son propre endpoint.
 * - Si c'est un autre utilisateur → erreur explicite (pas d'endpoint admin en écriture disponible).
 */
async function adminRemoveMapFromUser(userOrcid, ark) {
  if (userOrcid !== ADMIN_ORCID) {
    throw new Error(
      `L'API PTM ne propose pas encore d'endpoint admin en écriture pour les données d'autres utilisateurs.\n` +
      `Pour supprimer la carte ${ark} du compte ${userOrcid}, contactez l'équipe backend PTM.`
    );
  }

  // Carte appartenant à l'admin : lire, filtrer, remettre
  const existingData = await window.ptmAuth.getGalligeoData();
  const rec_ark = (existingData.rec_ark || []).filter(m => m.ark !== ark);
  return await window.ptmAuth.saveGalligeoData({ ...existingData, rec_ark });
}

// ─── STATISTIQUES ─────────────────────────────────────────────────────────────

function updateStats() {
  document.getElementById('stat-users').textContent = allUsersData.length;
  document.getElementById('stat-maps').textContent  = allMapsData.length;
  document.getElementById('stat-georef').textContent = allMapsData.filter(m => m.status === 'georeferenced').length;
  document.getElementById('stat-atlas').textContent  = allAtlasData.length;
}

// ─── UTILITAIRES ─────────────────────────────────────────────────────────────

function renderStatusBadge(status) {
  const map = {
    'en-cours':     ['status-en-cours',  'En cours'],
    'georeferenced':['status-georef',    'Géoréférencée'],
    'deposee':      ['status-deposee',   'Déposée']
  };
  const [cls, label] = map[status] || ['status-unknown', status || 'Inconnu'];
  return `<span class="status-badge ${cls}">${label}</span>`;
}

function setLoading(section, state) {
  const el = document.getElementById(`${section}-loading`);
  if (el) el.style.display = state ? 'block' : 'none';
}

function showError(section, message) {
  const el = document.getElementById(`${section}-error`);
  if (!el) return;
  el.innerHTML = `<p class="fr-alert__title">Erreur</p><p>${escapeHtml(message)}</p>`;
  el.className = 'fr-alert fr-alert--error fr-mb-2w';
  el.style.display = 'block';
}

function clearError(section) {
  const el = document.getElementById(`${section}-error`);
  if (el) el.style.display = 'none';
}

/**
 * Affiche un feedback dans un élément alerte DSFR.
 * @param {HTMLElement} el
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {string} message  — texte brut (sera échappé) ou HTML pré-traité si isHtml=true
 * @param {boolean} isHtml  — passer true si le message contient déjà du HTML sûr (<br> etc.)
 */
function showFeedback(el, type, message, isHtml = false) {
  el.className     = `fr-alert fr-alert--${type} fr-mb-2w`;
  el.innerHTML     = `<p>${isHtml ? message : escapeHtml(message)}</p>`;
  el.style.display = 'block';
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function redirectToLogin() {
  const redirectUrl = encodeURIComponent(window.location.href);
  window.location.href = `${API_BASE}/login?redirect_url=${redirectUrl}`;
}

function doLogout() {
  window.ptmAuth.logout();
  window.location.reload();
}

// ─── MODALES CUSTOM ───────────────────────────────────────────────────

function openModal(id) {
  document.getElementById(id).classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('is-open');
  document.body.style.overflow = '';
}

function closeModalOnOverlay(event, id) {
  if (event.target === event.currentTarget) closeModal(id);
}

// Fermeture au clavier (Echap)
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.admin-modal-overlay.is-open').forEach(m => closeModal(m.id));
  }
});
