/**
 * Synchronisation optionnelle du centrage/zoom entre la carte gauche (image non géoréférencée)
 * et la carte droite (fond géographique), à partir des points de contrôle communs.
 *
 * Principe : avec au moins 2 paires de points complètes, on calcule la transformation de
 * similarité (rotation + échelle + translation) qui fait le mieux correspondre les points
 * de la carte gauche à ceux de la carte droite, dans l'espace projeté (indépendant du zoom
 * courant et de la rotation d'affichage). Quand l'utilisateur déplace/zoome une carte, on
 * applique cette transformation (ou son inverse) pour repositionner l'autre carte.
 */

(function() {
    let syncEnabled = false;
    let syncing = false; // évite les boucles de rappel entre les deux cartes
    let initialized = false; // évite un double câblage si les deux voies d'init se déclenchent

    function getCompletePairs() {
        return (window.pointPairs || []).filter(pair => pair.isComplete());
    }

    function projectPoint(map, pointData) {
        const coords = pointData.originalCoords || { lat: pointData.lat, lng: pointData.lng };
        return map.project(L.latLng(coords.lat, coords.lng), 0);
    }

    // a = argmin_{a,t} Σ |R_i - (a·L_i + t)|², a et les points étant traités comme des complexes
    function computeSimilarityTransform() {
        if (typeof left_map === 'undefined' || typeof right_map === 'undefined') {
            return null;
        }

        const pairs = getCompletePairs();
        if (pairs.length < 2) {
            return null;
        }

        const leftPts = pairs.map(pair => projectPoint(left_map, pair.leftPoint));
        const rightPts = pairs.map(pair => projectPoint(right_map, pair.rightPoint));

        const n = leftPts.length;
        const centroidL = { x: 0, y: 0 };
        const centroidR = { x: 0, y: 0 };
        leftPts.forEach(p => { centroidL.x += p.x / n; centroidL.y += p.y / n; });
        rightPts.forEach(p => { centroidR.x += p.x / n; centroidR.y += p.y / n; });

        let numX = 0, numY = 0, den = 0;
        for (let i = 0; i < n; i++) {
            const dLx = leftPts[i].x - centroidL.x, dLy = leftPts[i].y - centroidL.y;
            const dRx = rightPts[i].x - centroidR.x, dRy = rightPts[i].y - centroidR.y;
            // conj(dL) * dR
            numX += dLx * dRx + dLy * dRy;
            numY += dLx * dRy - dLy * dRx;
            den += dLx * dLx + dLy * dLy;
        }

        if (den === 0) {
            return null;
        }

        const a = { x: numX / den, y: numY / den }; // a = échelle · (cosθ, sinθ)
        const scale = Math.sqrt(a.x * a.x + a.y * a.y);
        if (!isFinite(scale) || scale === 0) {
            return null;
        }

        return { a, scale, centroidL, centroidR };
    }

    function multiplyComplex(a, p) {
        return { x: a.x * p.x - a.y * p.y, y: a.x * p.y + a.y * p.x };
    }

    function invertComplex(a) {
        const norm2 = a.x * a.x + a.y * a.y;
        return { x: a.x / norm2, y: -a.y / norm2 };
    }

    function syncRightFromLeft(transform) {
        const centerL = left_map.project(left_map.getCenter(), 0);
        const delta = { x: centerL.x - transform.centroidL.x, y: centerL.y - transform.centroidL.y };
        const rotated = multiplyComplex(transform.a, delta);
        const centerR = L.point(rotated.x + transform.centroidR.x, rotated.y + transform.centroidR.y);
        const newLatLng = right_map.unproject(centerR, 0);
        const newZoom = left_map.getZoom() - Math.log2(transform.scale);

        syncing = true;
        right_map.setView(newLatLng, newZoom, { animate: false });
        syncing = false;
    }

    function syncLeftFromRight(transform) {
        const centerR = right_map.project(right_map.getCenter(), 0);
        const delta = { x: centerR.x - transform.centroidR.x, y: centerR.y - transform.centroidR.y };
        const aInv = invertComplex(transform.a);
        const rotated = multiplyComplex(aInv, delta);
        const centerL = L.point(rotated.x + transform.centroidL.x, rotated.y + transform.centroidL.y);
        const newLatLng = left_map.unproject(centerL, 0);
        const newZoom = right_map.getZoom() + Math.log2(transform.scale);
        const bearingDeg = Math.atan2(transform.a.y, transform.a.x) * 180 / Math.PI;

        syncing = true;
        left_map.setView(newLatLng, newZoom, { animate: false });
        if (typeof left_map.setBearing === 'function') {
            left_map.setBearing(bearingDeg);
        }
        syncing = false;
    }

    function onLeftMoveEnd() {
        if (!syncEnabled || syncing) return;
        const transform = computeSimilarityTransform();
        if (!transform) return;
        syncRightFromLeft(transform);
    }

    function onRightMoveEnd() {
        if (!syncEnabled || syncing) return;
        const transform = computeSimilarityTransform();
        if (!transform) return;
        syncLeftFromRight(transform);
    }

    function updateToggleAvailability() {
        const toggle = document.getElementById('toggle-sync-views');
        if (!toggle) return;

        const available = getCompletePairs().length >= 2;
        toggle.disabled = !available;

        if (!available && toggle.checked) {
            toggle.checked = false;
            syncEnabled = false;
        }
    }

    function setupViewSync() {
        if (initialized) return true;

        const toggle = document.getElementById('toggle-sync-views');
        if (!toggle || typeof left_map === 'undefined' || left_map === null ||
            typeof right_map === 'undefined' || right_map === null) {
            return false;
        }

        initialized = true;

        toggle.addEventListener('change', function() {
            syncEnabled = this.checked;
            if (syncEnabled) {
                // Recale immédiatement la carte droite sur la carte gauche à l'activation
                const transform = computeSimilarityTransform();
                if (transform) {
                    syncRightFromLeft(transform);
                }
            }
        });

        document.addEventListener('controlPointsChanged', updateToggleAvailability);
        updateToggleAvailability();

        left_map.on('moveend', onLeftMoveEnd);
        right_map.on('moveend', onRightMoveEnd);

        return true;
    }

    // `initializeMaps()` peut s'exécuter de façon synchrone pendant le chargement de
    // map_interactions.js, donc l'événement 'mapsInitialized' peut avoir déjà été émis
    // avant que ce script (chargé juste après) ait pu s'enregistrer. On tente donc une
    // initialisation immédiate, avec l'événement en repli si les cartes ne sont pas encore prêtes.
    if (!setupViewSync()) {
        document.addEventListener('mapsInitialized', setupViewSync);
    }
})();
