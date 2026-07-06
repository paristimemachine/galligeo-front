/**
 * Indicateur de qualité des points de contrôle (colonne "Q").
 *
 * Après chaque changement de la table des points de contrôle, on envoie la liste
 * des paires complètes à une API de contrôle qualité qui renvoie, pour chaque
 * point, un vecteur d'erreur résiduelle (dx, dy, norme, unité).
 *
 * IMPORTANT : le backend de cette API n'existe pas encore (endpoint à créer,
 * voir doc/CONTROL_POINTS_QUALITY_API.md). Tant qu'il ne répond pas avec succès,
 * la colonne Q affiche un état neutre "Indisponible" — c'est le comportement
 * normal aujourd'hui, pas une erreur à corriger.
 */
(function () {
  const URL_QUALITY_API = (typeof urlToAPI !== 'undefined'
    ? urlToAPI
    : 'https://api.ptm.huma-num.fr/galligeo/georef/') + 'quality/';

  // Nombre minimal de paires complètes avant d'envoyer une requête (en dessous,
  // un résidu n'a pas vraiment de sens pour une transformation géométrique).
  const MIN_POINTS_FOR_QUALITY_CHECK = 3;

  // Anti-rafale : un seul appel réseau après une série de changements rapprochés.
  const DEBOUNCE_MS = 500;

  // Seuils de classification couleur — PLACEHOLDERS à ajuster une fois le
  // backend réel en place et de vraies distributions de résidus observées.
  // Unité supposée "pixel" par défaut ; voir doc/CONTROL_POINTS_QUALITY_API.md.
  const QUALITY_THRESHOLDS = { good: 3, warning: 10 };

  // Facteur d'exagération visuelle du vecteur d'erreur affiché sur la carte
  // (sinon souvent invisible à l'échelle réelle). À revoir selon l'unité
  // effectivement renvoyée par le backend (pixel vs unité de carte).
  const VECTOR_DISPLAY_SCALE = 20;

  let debounceTimer = null;
  let showVectors = false;
  let vectorsLayerGroup = null;

  /**
   * Reproduit uniquement la logique d'authentification de georef_api_post()
   * (js/front_interactions.js), sans les effets de bord spécifiques au
   * géoréférencement réel (mise à jour des tuiles, statut des cartes, etc.)
   * qui n'ont pas leur place dans un simple contrôle qualité.
   */
  async function buildAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const isAuthenticated = window.ptmAuth && window.ptmAuth.isAuthenticated();

    if (isAuthenticated) {
      const token = window.ptmAuth.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } else if (window.ptmAuth) {
      try {
        const anonymousToken = await window.ptmAuth.getValidAnonymousToken();
        headers['Authorization'] = `Bearer ${anonymousToken}`;
      } catch (tokenError) {
        console.warn('⚠️ Token JWT anonyme indisponible pour le contrôle qualité:', tokenError.message);
      }
      headers['X-Anonymous-Mode'] = 'true';
      headers['X-Client-Type'] = 'galligeo-anonymous';
    }

    return headers;
  }

  function getQualityStatus(norm) {
    if (typeof norm !== 'number' || !isFinite(norm)) return 'unavailable';
    if (norm <= QUALITY_THRESHOLDS.good) return 'good';
    if (norm <= QUALITY_THRESHOLDS.warning) return 'warning';
    return 'bad';
  }

  /**
   * Construit le contenu HTML de la cellule Q pour une paire de points.
   * Utilisé à la fois par advanced-input-system.js (rendu initial de la ligne)
   * et par ce module (rafraîchissement après réponse de l'API).
   */
  function renderQualityBadge(pair) {
    if (!pair.isComplete()) {
      return '<span class="fr-text--sm" style="opacity:0.6;">—</span>';
    }

    const quality = pair.quality;

    if (!quality || quality.status === 'pending') {
      return '<span class="fr-badge fr-badge--sm" title="Contrôle qualité en cours...">En attente</span>';
    }

    if (quality.status === 'unavailable') {
      return '<span class="fr-badge fr-badge--sm" title="Le service de contrôle qualité n\'est pas encore disponible.">Indisponible</span>';
    }

    const modifierClass = {
      good: 'fr-badge--success',
      warning: 'fr-badge--warning',
      bad: 'fr-badge--error'
    }[quality.status] || '';

    const normLabel = typeof quality.norm === 'number' ? quality.norm.toFixed(2) : '?';
    const unitLabel = quality.unit === 'map' ? 'u.c.' : 'px';

    return `
      <button type="button"
              class="fr-badge ${modifierClass} fr-badge--sm control-points-quality-badge"
              onclick="window.controlPointsQuality.openDetail(${pair.id})"
              title="Voir le détail du vecteur d'erreur">
        ${normLabel} ${unitLabel}
      </button>
    `;
  }

  /**
   * Ne touche que les cellules Q déjà présentes dans le DOM (sans reconstruire
   * toute la table), pour éviter de redéclencher updateControlPointsTable()
   * (et donc scheduleCheck()) en boucle.
   */
  function refreshQualityCells() {
    (window.pointPairs || []).forEach(pair => {
      const cell = document.querySelector(`[data-quality-cell="${pair.id}"]`);
      if (cell) cell.innerHTML = renderQualityBadge(pair);
    });

    if (showVectors) redrawAllVectors();
  }

  function scheduleCheck() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runQualityCheck, DEBOUNCE_MS);
  }

  async function runQualityCheck() {
    const completePairs = (window.pointPairs || []).filter(pair => pair.isComplete());

    if (completePairs.length < MIN_POINTS_FOR_QUALITY_CHECK) {
      return;
    }

    completePairs.forEach(pair => { pair.quality = { status: 'pending' }; });
    refreshQualityCells();

    const payload = {
      gallica_ark_url: (typeof base_url !== 'undefined' ? base_url : '') + (window.input_ark || ''),
      image_width: document.image_width_scaled || document.width_image,
      image_height: document.image_height_scaled || document.height_image,
      gcp_pairs: completePairs.map(pair => new PointA_PointB(
        new Point({ lat: pair.leftPoint.lat, lng: pair.leftPoint.lng }),
        new Point({ lat: pair.rightPoint.lat, lng: pair.rightPoint.lng })
      ))
    };

    try {
      const headers = await buildAuthHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(URL_QUALITY_API, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const residuals = Array.isArray(data.residuals) ? data.residuals : [];

      completePairs.forEach((pair, index) => {
        const residual = residuals[index];
        if (!residual) {
          pair.quality = { status: 'unavailable' };
          return;
        }
        pair.quality = {
          status: getQualityStatus(residual.norm),
          dx: residual.dx,
          dy: residual.dy,
          norm: residual.norm,
          unit: residual.unit
        };
      });
    } catch (error) {
      // Cas normal aujourd'hui : le backend n'existe pas encore. On ne dérange
      // pas l'utilisateur avec une alerte pour un appel silencieux — juste un
      // état neutre "Indisponible" et une trace en console pour le debug.
      console.warn('ℹ️ Contrôle qualité indisponible (backend pas encore implémenté):', error.message);
      completePairs.forEach(pair => { pair.quality = { status: 'unavailable' }; });
    }

    refreshQualityCells();
  }

  function openDetail(pointId) {
    const pair = (window.pointPairs || []).find(p => p.id === pointId);
    if (!pair) return;

    const titleEl = document.getElementById('fr-modal-point-quality-title-id');
    const bodyEl = document.getElementById('fr-modal-point-quality-body');
    if (titleEl) titleEl.textContent = pointId;

    if (bodyEl) {
      const quality = pair.quality;
      if (!quality || quality.status === 'pending' || quality.status === 'unavailable') {
        bodyEl.innerHTML = `
          <div class="fr-alert fr-alert--info">
            <p>Le service de contrôle qualité n'est pas encore disponible. Cette fonctionnalité affichera ici le détail du vecteur d'erreur résiduelle une fois le backend en place.</p>
          </div>
        `;
      } else {
        const unitLabel = quality.unit === 'map' ? 'unités de carte' : 'pixels';
        bodyEl.innerHTML = `
          <ul class="fr-text--sm">
            <li><strong>Écart en X (dx) :</strong> ${quality.dx?.toFixed?.(3) ?? '?'} ${unitLabel}</li>
            <li><strong>Écart en Y (dy) :</strong> ${quality.dy?.toFixed?.(3) ?? '?'} ${unitLabel}</li>
            <li><strong>Norme du vecteur :</strong> ${quality.norm?.toFixed?.(3) ?? '?'} ${unitLabel}</li>
          </ul>
        `;
      }
    }

    const modal = document.getElementById('fr-modal-point-quality');
    if (!modal) return;

    // Passe par l'API DSFR quand l'instance est disponible (gère focus/backdrop/echap) ;
    // repli sur l'API native <dialog> sinon (l'instance DSFR peut ne pas être enregistrée
    // selon le contexte de chargement de la page).
    const dsfrInstance = window.dsfr ? window.dsfr(modal) : null;
    if (dsfrInstance && dsfrInstance.modal) {
      dsfrInstance.modal.disclose();
    } else if (typeof modal.showModal === 'function') {
      modal.showModal();
    }
  }

  function ensureVectorsLayerGroup() {
    if (!vectorsLayerGroup) {
      vectorsLayerGroup = L.layerGroup();
    }
    return vectorsLayerGroup;
  }

  function clearErrorVectors() {
    if (vectorsLayerGroup) vectorsLayerGroup.clearLayers();
  }

  /**
   * Dessine le vecteur d'erreur d'une paire sur la carte correspondante
   * (carte gauche/source si l'unité est en pixels, carte droite/cible si
   * l'unité est en unité de carte). Convention de signe (dx = longitude ou
   * colonne pixel, dy = latitude ou ligne pixel) à confirmer une fois le
   * contrat réel du backend connu — voir doc/CONTROL_POINTS_QUALITY_API.md.
   */
  function drawErrorVector(pair) {
    const quality = pair.quality;
    if (!quality || !['good', 'warning', 'bad'].includes(quality.status)) return;

    const targetMap = quality.unit === 'map' ? window.right_map : window.left_map;
    const point = quality.unit === 'map' ? pair.rightPoint : pair.leftPoint;
    if (!targetMap || !point) return;

    const from = [point.lat, point.lng];
    const to = [
      point.lat + (quality.dy || 0) * VECTOR_DISPLAY_SCALE,
      point.lng + (quality.dx || 0) * VECTOR_DISPLAY_SCALE
    ];

    const color = { good: '#18753c', warning: '#b34000', bad: '#ce0500' }[quality.status];

    const line = L.polyline([from, to], { color, weight: 2 });
    const tip = L.circleMarker(to, { radius: 3, color, fillColor: color, fillOpacity: 1 });

    const group = ensureVectorsLayerGroup();
    group.addLayer(line);
    group.addLayer(tip);

    if (!targetMap.hasLayer(group)) {
      group.addTo(targetMap);
    }
  }

  function redrawAllVectors() {
    clearErrorVectors();
    if (!showVectors) return;
    (window.pointPairs || []).forEach(drawErrorVector);
  }

  function toggleVectors(checked) {
    showVectors = !!checked;
    if (showVectors) {
      redrawAllVectors();
    } else {
      clearErrorVectors();
    }
  }

  function init() {
    const toggle = document.getElementById('toggle-show-error-vectors');
    if (toggle) {
      toggle.addEventListener('change', function () {
        toggleVectors(this.checked);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.controlPointsQuality = {
    scheduleCheck,
    renderBadge: renderQualityBadge,
    openDetail,
    toggleVectors
  };
})();
