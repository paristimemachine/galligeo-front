/**
 * Indicateur de qualité des points de contrôle (colonne "Q").
 *
 * Après chaque changement de la table des points de contrôle, on envoie la liste
 * des paires complètes à l'API de contrôle qualité (service dédié, indépendant du
 * géoréférencement réel) qui renvoie, pour chaque point, une estimation d'erreur
 * en mètres et un tracé GeoJSON prêt à poser sur la carte.
 *
 * Doc API : https://api.ptm.huma-num.fr/galligeo-quality/docs
 * Contrat détaillé : voir doc/CONTROL_POINTS_QUALITY_API.md
 */
(function () {
  const QUALITY_API_BASE = 'https://api.ptm.huma-num.fr/galligeo-quality/';
  const QUALITY_SUMMARY_URL = QUALITY_API_BASE + 'quality/summary';

  // Nombre minimal de paires complètes avant d'envoyer une requête (imposé par
  // l'API elle-même : en dessous, un résidu n'a pas de sens statistiquement).
  const MIN_POINTS_FOR_QUALITY_CHECK = 3;

  // Anti-rafale : un seul appel réseau après une série de changements rapprochés.
  const DEBOUNCE_MS = 500;

  // Facteur d'exagération du vecteur d'erreur dessiné sur la carte (paramètre
  // ?exaggeration= de l'API : ne modifie que le tracé GeoJSON, jamais error_m).
  // À l'échelle réelle une erreur de quelques dizaines de mètres est invisible
  // sur une carte ancienne de plusieurs dizaines de km.
  const VECTOR_EXAGGERATION = 20;

  const SEVERITY_BADGE_CLASS = { ok: 'fr-badge--success', watch: 'fr-badge--warning', high: 'fr-badge--error' };
  const SEVERITY_LABEL_FR = { ok: 'Bonne', watch: 'À surveiller', high: 'Mauvaise', unusable: 'Inutilisable' };

  // Les valeurs de select-algo (réglages utilisateur, voir settings-utils.js)
  // correspondent directement aux noms de modèle attendus par l'API qualité
  // (helmert, affine, polynomial2, polynomial3, tps).

  // Nombre minimal de paires exigé par l'API pour chaque modèle (voir
  // GET /galligeo-quality/transformations). En dessous, la requête échoue en
  // 422 si on force ce modèle : mieux vaut alors laisser l'API choisir seule.
  const API_TRANSFORMATION_MIN_GCPS = {
    helmert: 2,
    affine: 3,
    polynomial2: 6,
    polynomial3: 10,
    tps: 3
  };

  let debounceTimer = null;
  let showVectors = false;
  let vectorsLayerGroup = null;
  let lastVectorsGeoJSON = null;
  let lastOverallSummary = null;

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
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
      return '<span class="fr-badge fr-badge--sm" title="Le service de contrôle qualité est momentanément indisponible.">Indisponible</span>';
    }

    if (quality.status === 'problem') {
      const message = quality.message || 'Ces points ne permettent pas de calculer une qualité (points dupliqués, alignés...).';
      return `
        <button type="button"
                class="fr-badge fr-badge--sm fr-badge--error control-points-quality-badge"
                onclick="window.controlPointsQuality.openDetail(${pair.id})"
                title="${escapeHtml(message)}">
          Problème
        </button>
      `;
    }

    const modifierClass = SEVERITY_BADGE_CLASS[quality.severity] || '';
    const errorLabel = typeof quality.errorM === 'number' ? `${quality.errorM.toFixed(0)} m` : '?';
    const flags = [];
    if (quality.outlier) flags.push('point suspect');
    if (quality.unchecked) flags.push('non contrôlé');
    const flagMarker = flags.length ? ' ⚠' : '';

    return `
      <button type="button"
              class="fr-badge ${modifierClass} fr-badge--sm control-points-quality-badge"
              onclick="window.controlPointsQuality.openDetail(${pair.id})"
              title="Voir le détail du point${flags.length ? ' — ' + flags.join(', ') : ''}">
        ${errorLabel}${flagMarker}
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

  function updateSummaryBanner() {
    const el = document.getElementById('control-points-quality-summary');
    if (!el) return;

    if (!lastOverallSummary) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }

    const summary = lastOverallSummary;
    el.hidden = false;

    if (!summary.feasible) {
      el.innerHTML = `<p class="fr-text--sm fr-mb-0"><span class="fr-badge fr-badge--sm fr-badge--error">Calcul impossible</span> ${escapeHtml(summary.message || summary.problem || '')}</p>`;
      return;
    }

    const modifierClass = SEVERITY_BADGE_CLASS[summary.severity] || '';
    const severityLabel = SEVERITY_LABEL_FR[summary.severity] || summary.severity;
    const rmseLabel = typeof summary.loo_rmse_m === 'number' ? `${summary.loo_rmse_m.toFixed(0)} m` : '?';
    const modelLabel = summary.chosen === 'recommended' ? `${summary.transformation} (recommandé)` : summary.transformation;

    el.innerHTML = `
      <p class="fr-text--sm fr-mb-0">
        Qualité globale : <span class="fr-badge ${modifierClass} fr-badge--sm">${severityLabel}</span>
        — erreur attendue ≈ ${rmseLabel} — modèle : ${escapeHtml(modelLabel)}
      </p>
    `;
  }

  function scheduleCheck() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runQualityCheck, DEBOUNCE_MS);
  }

  async function runQualityCheck() {
    const completePairs = (window.pointPairs || []).filter(pair => pair.isComplete());

    if (completePairs.length < MIN_POINTS_FOR_QUALITY_CHECK) {
      completePairs.forEach(pair => { pair.quality = null; });
      lastVectorsGeoJSON = null;
      lastOverallSummary = null;
      refreshQualityCells();
      updateSummaryBanner();
      return;
    }

    completePairs.forEach(pair => { pair.quality = { status: 'pending' }; });
    refreshQualityCells();

    const selectedAlgorithm = typeof getDefaultAlgorithm === 'function' ? getDefaultAlgorithm() : 'polynomial2';
    // Pas assez de points pour ce modèle précis (ex. polynomial2 exige 6 GCP) :
    // on n'envoie pas `transformation`, l'API retombe alors sur son choix
    // automatique plutôt que de renvoyer une erreur 422.
    const apiTransformation = (selectedAlgorithm && completePairs.length >= (API_TRANSFORMATION_MIN_GCPS[selectedAlgorithm] || 0))
      ? selectedAlgorithm
      : null;

    const payload = {
      gcp_pairs: completePairs.map(pair => new PointA_PointB(
        new Point({ lat: pair.leftPoint.lat, lng: pair.leftPoint.lng }),
        new Point({ lat: pair.rightPoint.lat, lng: pair.rightPoint.lng })
      )),
      image_width: document.image_width_scaled || document.width_image,
      image_height: document.image_height_scaled || document.height_image,
      transformation: apiTransformation
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${QUALITY_SUMMARY_URL}?vectors=true&exaggeration=${VECTOR_EXAGGERATION}`, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      lastOverallSummary = data;

      if (!data.feasible) {
        // Points dégénérés pour ce modèle (dupliqués, alignés...) : rien à
        // calculer, mais le message de l'API explique quoi corriger.
        completePairs.forEach(pair => {
          pair.quality = { status: 'problem', message: data.message || data.problem };
        });
        lastVectorsGeoJSON = null;
      } else {
        const features = (data.vectors && Array.isArray(data.vectors.features)) ? data.vectors.features : [];
        const byIndex = {};
        features.forEach(feature => { byIndex[feature.properties.index] = feature; });

        completePairs.forEach((pair, index) => {
          const feature = byIndex[index];
          if (!feature) {
            pair.quality = { status: 'unavailable' };
            return;
          }
          const props = feature.properties;
          pair.quality = {
            status: 'ready',
            severity: props.severity,
            errorM: props.error_m,
            outlier: props.outlier,
            unchecked: props.unchecked,
            highLeverage: props.high_leverage,
            residualColPx: props.residual_col_px,
            residualRowPx: props.residual_row_px,
            transformation: data.transformation,
            chosen: data.chosen
          };
        });
        lastVectorsGeoJSON = data.vectors;
      }
    } catch (error) {
      console.warn('⚠️ Contrôle qualité indisponible:', error.message);
      completePairs.forEach(pair => { pair.quality = { status: 'unavailable' }; });
      lastVectorsGeoJSON = null;
      lastOverallSummary = null;
    }

    refreshQualityCells();
    updateSummaryBanner();
    if (showVectors) redrawAllVectors();
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
            <p>Le contrôle qualité n'est pas disponible pour ce point pour le moment.</p>
          </div>
        `;
      } else if (quality.status === 'problem') {
        bodyEl.innerHTML = `
          <div class="fr-alert fr-alert--warning">
            <p>${escapeHtml(quality.message || "Le calcul de qualité n'est pas possible avec ces points.")}</p>
          </div>
        `;
      } else {
        const severityLabel = SEVERITY_LABEL_FR[quality.severity] || quality.severity;
        const notes = [];
        if (quality.outlier) notes.push('point suspect (erreur trop grande pour être due au hasard)');
        if (quality.unchecked) notes.push("non contrôlé par les autres points : une erreur de saisie dessus passerait inaperçue");
        if (quality.highLeverage) notes.push('forte influence sur le calcul (point isolé ou en bordure)');

        bodyEl.innerHTML = `
          <ul class="fr-text--sm">
            <li><strong>Erreur estimée :</strong> ${quality.errorM?.toFixed?.(1) ?? '?'} m</li>
            <li><strong>Qualité :</strong> ${severityLabel}</li>
            <li><strong>Modèle utilisé :</strong> ${escapeHtml(quality.transformation || '?')}${quality.chosen === 'recommended' ? ' (recommandé automatiquement)' : ''}</li>
            ${quality.residualColPx != null ? `<li><strong>Écart sur l'image :</strong> ${quality.residualColPx.toFixed(1)} px (colonne), ${quality.residualRowPx.toFixed(1)} px (ligne)</li>` : ''}
            ${notes.length ? `<li><strong>À noter :</strong> ${notes.map(escapeHtml).join(' ; ')}</li>` : ''}
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
   * Dessine le tracé GeoJSON renvoyé par l'API sur la carte cible (droite,
   * coordonnées géographiques) : une ligne par point, de sa position réelle
   * vers la position que donnerait le modèle, avec les couleurs déjà fournies
   * dans les propriétés (stroke / marker-color).
   */
  function redrawAllVectors() {
    clearErrorVectors();
    if (!showVectors || !lastVectorsGeoJSON || !window.right_map) return;

    const group = ensureVectorsLayerGroup();

    L.geoJSON(lastVectorsGeoJSON, {
      style: (feature) => ({ color: feature.properties.stroke || '#3388ff', weight: 2 }),
      onEachFeature: (feature, layer) => {
        group.addLayer(layer);
        const coords = feature.geometry && feature.geometry.coordinates;
        if (coords && coords.length === 2) {
          const [lng, lat] = coords[1];
          const color = feature.properties['marker-color'] || feature.properties.stroke || '#3388ff';
          group.addLayer(L.circleMarker([lat, lng], { radius: 3, color, fillColor: color, fillOpacity: 1 }));
        }
      }
    });

    if (!window.right_map.hasLayer(group)) {
      group.addTo(window.right_map);
    }
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

    initQuickAlgoDropdown();
  }

  const QUICK_ALGO_LABELS = {
    polynomial2: 'Polynomial 2',
    polynomial3: 'Polynomial 3',
    helmert: 'Helmert',
    affine: 'Affine',
    tps: 'TPS'
  };

  /**
   * Menu déroulant compact sous le bouton "Géoréférencer" : un raccourci vers
   * le même réglage select-algo que l'onglet Paramètres, pour tester un
   * modèle sans naviguer jusque-là. Le choix sauvegarde immédiatement (via
   * settingsManager, qui émet settingsUpdated) et ne déclenche PAS le
   * géoréférencement lui-même, qui reste réservé au bouton dédié.
   */
  function initQuickAlgoDropdown() {
    const dropdown = document.getElementById('quick-algo-dropdown');
    const toggle = document.getElementById('quick-algo-toggle');
    const menu = document.getElementById('quick-algo-menu');
    if (!dropdown || !toggle || !menu) return;

    const items = Array.from(menu.querySelectorAll('.quick-algo-dropdown__item'));
    let lastKnownAlgorithm = typeof getDefaultAlgorithm === 'function' ? getDefaultAlgorithm() : null;

    function applySelection(algorithm) {
      items.forEach(item => {
        item.setAttribute('aria-checked', String(item.dataset.algo === algorithm));
      });
      if (QUICK_ALGO_LABELS[algorithm]) {
        toggle.title = `Algorithme pour le contrôle qualité : ${QUICK_ALGO_LABELS[algorithm]}. Cliquer pour changer.`;
      }
    }
    applySelection(lastKnownAlgorithm);

    function positionMenu() {
      // Le menu est en position:fixed (voir main.css) pour passer au-dessus
      // de la carte Leaflet, donc sa position ne suit plus automatiquement
      // le bouton : on la recalcule à chaque ouverture à partir de sa
      // position réelle à l'écran.
      const rect = toggle.getBoundingClientRect();
      menu.style.top = `${rect.bottom + 2}px`;
      menu.style.left = `${rect.left}px`;
    }

    // Un modèle n'est proposable que si le nombre de paires complètes
    // actuel atteint son minimum de GCP (voir API_TRANSFORMATION_MIN_GCPS /
    // GET /galligeo-quality/transformations) ET qu'il n'est pas marqué
    // data-unavailable (affine/tps : pas encore prêts côté backend qualité,
    // indépendamment du nombre de points).
    function updateItemsAvailability() {
      const completeCount = (window.pointPairs || []).filter(pair => pair.isComplete()).length;
      items.forEach(item => {
        const algorithm = item.dataset.algo;
        const minGcps = parseInt(item.dataset.minGcps, 10) || (API_TRANSFORMATION_MIN_GCPS[algorithm] || 0);
        const backendUnavailable = item.dataset.unavailable === 'true';
        const notEnoughPoints = completeCount < minGcps;
        const hint = item.querySelector('.quick-algo-dropdown__hint');

        item.disabled = backendUnavailable || notEnoughPoints;

        if (backendUnavailable) {
          item.title = 'Bientôt disponible';
        } else if (notEnoughPoints) {
          item.title = `Nécessite au moins ${minGcps} points de contrôle (actuellement ${completeCount})`;
          if (hint) hint.textContent = `(nécessite ${minGcps} points, ${completeCount} actuellement)`;
        } else {
          item.title = '';
          if (hint) hint.textContent = '';
        }
      });
    }

    function openMenu() {
      updateItemsAvailability();
      positionMenu();
      menu.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
    }
    function closeMenu() {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function () {
      if (menu.hidden) openMenu(); else closeMenu();
    });

    document.addEventListener('click', function (event) {
      if (!dropdown.contains(event.target)) closeMenu();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !menu.hidden) {
        closeMenu();
        toggle.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (!menu.hidden) positionMenu();
    });
    window.addEventListener('scroll', function () {
      if (!menu.hidden) positionMenu();
    }, true);

    items.forEach(item => {
      item.addEventListener('click', function () {
        if (item.disabled) return;
        const algorithm = item.dataset.algo;
        closeMenu();
        if (window.settingsManager && typeof window.settingsManager.saveSettings === 'function') {
          window.settingsManager.saveSettings({ 'select-algo': algorithm });
        }
      });
    });

    // window.settingsManager.init() charge les réglages (localStorage puis,
    // si connecté, le cloud) de façon asynchrone : à l'exécution de init()
    // ci-dessus, getDefaultAlgorithm() peut encore renvoyer la valeur par
    // défaut. settingsLoaded est émis une fois le vrai chargement terminé.
    document.addEventListener('settingsLoaded', function (event) {
      const loadedAlgorithm = event.detail && event.detail.settings ? event.detail.settings['select-algo'] : undefined;
      if (loadedAlgorithm !== undefined) {
        lastKnownAlgorithm = loadedAlgorithm;
        applySelection(loadedAlgorithm);
      }
    });

    document.addEventListener('settingsUpdated', function (event) {
      const newAlgorithm = event.detail && event.detail.settings ? event.detail.settings['select-algo'] : undefined;
      if (newAlgorithm !== undefined && newAlgorithm !== lastKnownAlgorithm) {
        lastKnownAlgorithm = newAlgorithm;
        applySelection(newAlgorithm);
        scheduleCheck();
      }
    });
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
