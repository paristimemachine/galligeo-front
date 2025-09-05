// =====================================================================
// NOUVEAU SYSTÈME DE SAISIE AMÉLIORÉ - UI/UX OPTIMISÉ
// =====================================================================

// Nouvelle structure pour les points appariés
function ControlPointPair(id, leftPoint = null, rightPoint = null) {
    this.id = id;
    this.leftPoint = leftPoint; // {lat, lng, marker, originalCoords}
    this.rightPoint = rightPoint; // {lat, lng, marker, originalCoords}
    this.isComplete = function() {
        return this.leftPoint !== null && this.rightPoint !== null;
    };
}

function setupAdvancedInputSystem() {
    console.log('Configuration du système de saisie avancé...');
    
    // Supprimer les anciens contrôles Leaflet Draw
    removeOldDrawControls();
    
    // Configurer les événements des contrôles
    setupControlEvents();
    
    // Configurer les événements de clic sur les cartes
    setupMapClickEvents();
    
    // Configurer le survol et déplacement des points
    setupPointInteractions();
    
    // Initialiser l'état
    updateInputState();
    
    console.log('Système de saisie avancé configuré avec succès');
}

function removeOldDrawControls() {
    // Supprimer tous les contrôles de dessin existants
    if (typeof left_map !== 'undefined') {
        left_map.eachLayer(function(layer) {
            if (layer instanceof L.Control.Draw) {
                left_map.removeControl(layer);
            }
        });
    }
    
    if (typeof right_map !== 'undefined') {
        right_map.eachLayer(function(layer) {
            if (layer instanceof L.Control.Draw) {
                right_map.removeControl(layer);
            }
        });
    }
}

function setupControlEvents() {
    // Événement pour le toggle principal (Saisie/Verrouillé)
    const toggleInput = document.getElementById('toggle');
    if (toggleInput) {
        toggleInput.addEventListener('change', function() {
            window.isInputLocked = this.checked;
            updateInputState();
        });
    }
    
    // Événements pour les contrôles segmentés
    const pointsRadio = document.getElementById('segmented-1');
    const empriseRadio = document.getElementById('segmented-2');
    
    if (pointsRadio) {
        pointsRadio.addEventListener('change', function() {
            if (this.checked && !window.isInputLocked) {
                window.currentInputMode = 'points';
                updateInputState();
            }
        });
    }
    
    if (empriseRadio) {
        empriseRadio.addEventListener('change', function() {
            if (this.checked && !window.isInputLocked) {
                window.currentInputMode = 'emprise';
                updateInputState();
            }
        });
    }
}

function updateInputState() {
    if (window.isInputLocked) {
        window.inputMode = 'disabled';
        setMapCursors('default');
        console.log('Saisie verrouillée');
    } else {
        window.inputMode = window.currentInputMode;
        if (window.inputMode === 'points') {
            setMapCursors('crosshair');
            console.log('Mode saisie points activé');
        } else if (window.inputMode === 'emprise') {
            setMapCursors('crosshair');
            console.log('Mode saisie emprise activé');
        }
    }
    
    // Mettre à jour l'interface
    updateUIForInputMode();
}

function setMapCursors(cursor) {
    if (typeof left_map !== 'undefined') {
        left_map.getContainer().style.cursor = cursor;
    }
    if (typeof right_map !== 'undefined') {
        right_map.getContainer().style.cursor = cursor;
    }
}

function setupMapClickEvents() {
    // Événements de clic pour la carte gauche
    if (typeof left_map !== 'undefined') {
        left_map.on('click', function(e) {
            handleMapClick(e, 'left');
        });
        
        // Double-clic pour finaliser l'emprise
        left_map.on('dblclick', function(e) {
            if (window.inputMode === 'emprise' && window.currentPolygon && window.currentPolygon.points.length >= 3) {
                finalizeEmprise();
                L.DomEvent.stopPropagation(e);
            }
        });
    }
    
    // Événements de clic pour la carte droite
    if (typeof right_map !== 'undefined') {
        right_map.on('click', function(e) {
            handleMapClick(e, 'right');
        });
    }
}

function handleMapClick(event, mapSide) {
    if (window.inputMode === 'disabled' || window.isInputLocked) {
        console.log('Saisie verrouillée - clic ignoré');
        return;
    }
    
    const map = mapSide === 'left' ? left_map : right_map;
    const layer = mapSide === 'left' ? layer_img_pts_left : layer_img_pts_right;
    
    if (window.inputMode === 'points') {
        handlePointClick(event, mapSide, map, layer);
    } else if (window.inputMode === 'emprise' && mapSide === 'left') {
        handleEmpriseClick(event, map);
    }
}

function handlePointClick(event, mapSide, map, layer) {
    const latLng = event.latlng;
    
    // Créer un nouveau marqueur
    const marker = L.marker(latLng, {
        icon: new customMarker(),
        draggable: true
    });
    
    // Trouver ou créer la paire de points appropriée
    let pointPair = findOrCreatePointPair(mapSide);
    
    // Convertir les coordonnées si nécessaire (pour la carte gauche)
    let processedCoords = latLng;
    if (mapSide === 'left') {
        processedCoords = L.latLng(-latLng.lat/10, (latLng.lng / ratio_wh_img) / 10);
    }
    
    // Ajouter le point à la paire
    if (mapSide === 'left') {
        pointPair.leftPoint = {
            lat: processedCoords.lat,
            lng: processedCoords.lng,
            marker: marker,
            originalCoords: latLng
        };
    } else {
        pointPair.rightPoint = {
            lat: latLng.lat,
            lng: latLng.lng,
            marker: marker,
            originalCoords: latLng
        };
    }
    
    // Configurer le tooltip avec le numéro
    marker.bindTooltip(pointPair.id.toString(), {
        permanent: true,
        direction: 'auto',
        className: "labels-points"
    });
    
    // Ajouter le marqueur à la carte
    layer.addLayer(marker);
    
    // Configurer les événements de drag
    setupMarkerDragEvents(marker, pointPair, mapSide);
    
    // Mettre à jour la table des points de contrôle
    updateControlPointsTable();
    
    // Ne plus forcer l'alternance automatique - laisser l'utilisateur choisir
    // L'utilisateur peut maintenant saisir plusieurs points consécutifs sur la même carte
    
    // Vérifier si le géoréférencement peut être activé
    checkGeoreferencingAvailability();
    
    console.log(`Point ${pointPair.id} ajouté sur la carte ${mapSide}:`, processedCoords);
}

function findOrCreatePointPair(mapSide) {
    // Permettre la saisie de plusieurs points consécutifs sur la même carte
    // sans forcer l'alternance
    
    // Chercher une paire incomplète qui peut accueillir un point sur cette carte
    let targetPair = null;
    
    for (let pair of window.pointPairs) {
        if (mapSide === 'left' && !pair.leftPoint) {
            targetPair = pair;
            break;
        } else if (mapSide === 'right' && !pair.rightPoint) {
            targetPair = pair;
            break;
        }
    }
    
    // Si aucune paire existante ne peut accueillir le point, créer une nouvelle paire
    if (!targetPair) {
        window.pointCounter++;
        targetPair = new ControlPointPair(window.pointCounter);
        window.pointPairs.push(targetPair);
    }
    
    return targetPair;
}

function switchActiveMap() {
    // Alterner entre les cartes pour faciliter la saisie
    if (window.activeMap === 'left') {
        window.activeMap = 'right';
    } else {
        window.activeMap = 'left';
    }
    
    updateUIForInputMode();
}

function setupMarkerDragEvents(marker, pointPair, mapSide) {
    marker.on('dragstart', function() {
        if (window.isInputLocked) {
            console.log('Déplacement interdit - saisie verrouillée');
            return false;
        }
        window.isDragging = true;
    });
    
    marker.on('drag', function(e) {
        if (window.isInputLocked) {
            // Remettre le marqueur à sa position initiale
            e.target.setLatLng(e.target._originalLatLng || e.target.getLatLng());
            return false;
        }
    });
    
    marker.on('dragend', function(e) {
        if (window.isInputLocked) {
            // Remettre le marqueur à sa position initiale
            e.target.setLatLng(e.target._originalLatLng || e.target.getLatLng());
            window.isDragging = false;
            return false;
        }
        
        window.isDragging = false;
        const newLatLng = e.target.getLatLng();
        
        // Mettre à jour les coordonnées dans la paire
        let processedCoords = newLatLng;
        if (mapSide === 'left') {
            processedCoords = L.latLng(-newLatLng.lat/10, (newLatLng.lng / ratio_wh_img) / 10);
        }
        
        if (mapSide === 'left' && pointPair.leftPoint) {
            pointPair.leftPoint.lat = processedCoords.lat;
            pointPair.leftPoint.lng = processedCoords.lng;
            pointPair.leftPoint.originalCoords = newLatLng;
        } else if (mapSide === 'right' && pointPair.rightPoint) {
            pointPair.rightPoint.lat = newLatLng.lat;
            pointPair.rightPoint.lng = newLatLng.lng;
            pointPair.rightPoint.originalCoords = newLatLng;
        }
        
        // Mettre à jour la table
        updateControlPointsTable();
        
        console.log(`Point ${pointPair.id} déplacé sur la carte ${mapSide}:`, processedCoords);
    });
    
    // Sauvegarder la position initiale
    marker._originalLatLng = marker.getLatLng();
    
    // Événement de survol pour indiquer que le point peut être déplacé
    marker.on('mouseover', function() {
        if (!window.isDragging && !window.isInputLocked) {
            marker.getElement().style.cursor = 'move';
        }
    });
    
    marker.on('mouseout', function() {
        if (!window.isDragging) {
            marker.getElement().style.cursor = 'pointer';
        }
    });
}

function handleEmpriseClick(event, map) {
    // Logique pour la saisie d'emprise (polygone fermé)
    if (!window.currentPolygon) {
        // Commencer un nouveau polygone
        window.currentPolygon = {
            points: [],
            layer: null,
            tempLayer: null
        };
    }
    
    const latLng = event.latlng;
    window.currentPolygon.points.push(latLng);
    
    // Supprimer les anciens layers temporaires
    if (window.currentPolygon.layer) {
        layer_img_emprise_left.removeLayer(window.currentPolygon.layer);
    }
    if (window.currentPolygon.tempLayer) {
        layer_img_emprise_left.removeLayer(window.currentPolygon.tempLayer);
    }
    
    if (window.currentPolygon.points.length === 1) {
        // Premier point - juste afficher un marqueur temporaire
        window.currentPolygon.tempLayer = L.circleMarker(latLng, {
            color: POLYGON_STROKE_COLOR,
            radius: 5,
            weight: 2
        });
        layer_img_emprise_left.addLayer(window.currentPolygon.tempLayer);
        
    } else if (window.currentPolygon.points.length === 2) {
        // Deuxième point - afficher une ligne
        window.currentPolygon.tempLayer = L.polyline(window.currentPolygon.points, {
            color: POLYGON_STROKE_COLOR,
            weight: 2,
            dashArray: '5, 5'
        });
        layer_img_emprise_left.addLayer(window.currentPolygon.tempLayer);
        
    } else if (window.currentPolygon.points.length >= 3) {
        // Trois points ou plus - créer un polygone fermé
        const closedPoints = [...window.currentPolygon.points];
        
        // Fermer automatiquement le polygone si on a au moins 3 points
        window.currentPolygon.layer = L.polygon(closedPoints, {
            fillColor: POLYGON_FILL_COLOR,
            color: POLYGON_STROKE_COLOR,
            weight: 3,
            fillOpacity: 0.2
        });
        
        layer_img_emprise_left.addLayer(window.currentPolygon.layer);
        
        // Rendre le polygone éditable
        if (window.currentPolygon.layer.editing) {
            window.currentPolygon.layer.editing.enable();
        }
        
        // Convertir pour les données
        updatePolygonData();
        
        console.log('Polygone d\'emprise créé avec', window.currentPolygon.points.length, 'points');
    }
    
    // Mettre à jour l'interface
    updateUIForInputMode();
}

function updatePolygonData() {
    if (!window.currentPolygon || window.currentPolygon.points.length < 3) return;
    
    const polygonArray = [];
    window.currentPolygon.points.forEach(function(point) {
        const convertedPoint = L.latLng(-point.lat/10, (point.lng / ratio_wh_img) / 10);
        polygonArray.push([convertedPoint.lng, convertedPoint.lat]);
    });
    
    // Fermer le polygone
    polygonArray.push(polygonArray[0]);
    
    // Convertir en format attendu
    const polyJson = [];
    polygonArray.forEach((pt, i) => {
        polyJson.push(new PointCrop(pt[1], pt[0]));
    });
    
    list_points_polygon_crop = polyJson;
    console.log('Données polygone mises à jour:', list_points_polygon_crop);
}

function updateControlPointsTable() {
    const tableBody = document.getElementById('table_body');
    if (!tableBody) return;
    
    // Vider la table
    tableBody.innerHTML = '';
    
    // Remplir avec toutes les paires (complètes et incomplètes)
    if (window.pointPairs.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 2;
        cell.textContent = 'Aucun point saisi';
        cell.style.textAlign = 'center';
        cell.style.fontStyle = 'italic';
        row.appendChild(cell);
        tableBody.appendChild(row);
    } else {
        window.pointPairs.forEach(pair => {
            const row = document.createElement('tr');
            
            // Cellule pour le point gauche (image)
            const leftCell = document.createElement('td');
            if (pair.leftPoint) {
                const leftCoords = `${pair.id}. (${pair.leftPoint.lat.toFixed(3)}, ${pair.leftPoint.lng.toFixed(3)})`;
                leftCell.innerHTML = `
                    <div class="point-info">
                        <span class="point-coords">${leftCoords}</span>
                        <button class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm point-delete-btn" 
                                onclick="removeIndividualPoint(${pair.id}, 'left')" 
                                title="Supprimer ce point"
                                ${window.isInputLocked ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}>
                            <span class="fr-icon-close-circle-fill" aria-hidden="true"></span>
                        </button>
                    </div>
                `;
                leftCell.style.color = '#000091'; // Bleu DSFR pour les points existants
            } else {
                leftCell.textContent = `${pair.id}. (non saisi)`;
                leftCell.style.color = '#666';
                leftCell.style.fontStyle = 'italic';
            }
            row.appendChild(leftCell);
            
            // Cellule pour le point droit (géo)
            const rightCell = document.createElement('td');
            if (pair.rightPoint) {
                const rightCoords = `${pair.id}. (${pair.rightPoint.lat.toFixed(3)}, ${pair.rightPoint.lng.toFixed(3)})`;
                rightCell.innerHTML = `
                    <div class="point-info">
                        <span class="point-coords">${rightCoords}</span>
                        <button class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm point-delete-btn" 
                                onclick="removeIndividualPoint(${pair.id}, 'right')" 
                                title="Supprimer ce point">
                            <span class="fr-icon-close-circle-fill" aria-hidden="true"></span>
                        </button>
                    </div>
                `;
                rightCell.style.color = '#000091'; // Bleu DSFR pour les points existants
            } else {
                rightCell.textContent = `${pair.id}. (non saisi)`;
                rightCell.style.color = '#666';
                rightCell.style.fontStyle = 'italic';
            }
            row.appendChild(rightCell);
            
            // Marquer visuellement les paires complètes
            if (pair.isComplete()) {
                row.style.backgroundColor = '#f9f8f6'; // Fond léger pour les paires complètes
                row.style.borderLeft = '3px solid #18753c'; // Bordure verte DSFR
            }
            
            tableBody.appendChild(row);
        });
    }
    
    // Mettre à jour les données pour l'API
    updateGeoreferencingData();
    
    // Afficher la table si elle contient des données
    const tableContainer = document.getElementById('table-control-points');
    if (tableContainer && window.pointPairs.length > 0) {
        tableContainer.hidden = false;
        
        // Mettre à jour le titre du tableau
        const tableTitle = tableContainer.querySelector('.fr-accordion__btn');
        if (tableTitle) {
            const completePairs = window.pointPairs.filter(pair => pair.isComplete()).length;
            const totalPairs = window.pointPairs.length;
            tableTitle.textContent = `Points de contrôle (${completePairs}/${totalPairs} paires complètes)`;
        }
    } else if (tableContainer) {
        tableContainer.hidden = true;
    }
}

function updateGeoreferencingData() {
    // Mettre à jour list_georef_points pour l'API
    list_georef_points = [];
    
    window.pointPairs.forEach(pair => {
        if (pair.isComplete()) {
            const pointAB = new PointA_PointB(
                new Point({ lat: pair.leftPoint.lat, lng: pair.leftPoint.lng }),
                new Point({ lat: pair.rightPoint.lat, lng: pair.rightPoint.lng })
            );
            list_georef_points.push(pointAB);
        }
    });
    
    // Mettre à jour le compteur global pour compatibilité
    count_points = window.pointPairs.filter(pair => pair.isComplete()).length;
    
    console.log('Données de géoréférencement mises à jour:', list_georef_points);
}

function checkGeoreferencingAvailability() {
    const completePairs = window.pointPairs.filter(pair => pair.isComplete()).length;
    const totalPoints = window.pointPairs.length;
    const leftPoints = window.pointPairs.filter(pair => pair.leftPoint).length;
    const rightPoints = window.pointPairs.filter(pair => pair.rightPoint).length;
    
    // Mettre à jour le message de statut avec les informations détaillées
    const statusElement = document.getElementById('input-status');
    if (statusElement) {
        if (completePairs === 0) {
            statusElement.textContent = `Points saisis : ${leftPoints} gauche, ${rightPoints} droite - Aucune paire complète`;
        } else {
            statusElement.textContent = `${completePairs} paire(s) complète(s) sur ${totalPoints} points`;
        }
    }
    
    // Mettre à jour le compteur global pour compatibilité
    count_points = completePairs;
    
    if (completePairs >= 3) {
        // Utiliser la fonction dédiée pour gérer l'état du bouton
        if (typeof setGeoreferencingButtonState === 'function') {
            if (window.ptmAuth && window.ptmAuth.isAuthenticated()) {
                setGeoreferencingButtonState('normal', 'Géoréférencer', 'Géoréférencer cette carte');
            } else {
                setGeoreferencingButtonState('disabled', 'Géoréférencer', 'Connectez-vous pour utiliser le géoréférencement');
            }
        } else {
            // Fallback vers l'ancienne méthode si la fonction n'est pas disponible
            if (window.ptmAuth && window.ptmAuth.isAuthenticated()) {
                const btnGeorefs = document.getElementById('btn_georef');
                if (btnGeorefs) btnGeorefs.disabled = false;
            } else {
                console.log('Géoréférencement nécessite une connexion utilisateur');
                const btnGeorefs = document.getElementById('btn_georef');
                if (btnGeorefs) {
                    btnGeorefs.disabled = true;
                    btnGeorefs.title = 'Connectez-vous pour utiliser le géoréférencement';
                }
            }
        }
    } else {
        // Pas assez de paires complètes
        if (typeof setGeoreferencingButtonState === 'function') {
            setGeoreferencingButtonState('disabled', 'Géoréférencer', `Minimum 3 paires de points requis (${completePairs}/3)`);
        } else {
            const btnGeorefs = document.getElementById('btn_georef');
            if (btnGeorefs) {
                btnGeorefs.disabled = true;
                btnGeorefs.title = `Minimum 3 paires de points requis (${completePairs}/3)`;
            }
        }
    }
    
    // Mettre à jour l'état général des boutons
    if (typeof updateButtonsForAuth === 'function') {
        updateButtonsForAuth();
    }
}

function updateUIForInputMode() {
    // Mise à jour de l'affichage selon le mode actif
    const statusElement = document.getElementById('input-status');
    const helpElement = document.getElementById('input-help');
    
    // Supprimer les classes d'état précédentes
    if (typeof left_map !== 'undefined') {
        left_map.getContainer().classList.remove('active-map', 'input-mode-points', 'input-mode-emprise', 'input-disabled');
    }
    if (typeof right_map !== 'undefined') {
        right_map.getContainer().classList.remove('active-map', 'input-mode-points', 'input-mode-emprise', 'input-disabled');
    }
    
    if (statusElement) {
        if (window.inputMode === 'disabled') {
            statusElement.textContent = 'Saisie verrouillée';
            if (typeof left_map !== 'undefined') left_map.getContainer().classList.add('input-disabled');
            if (typeof right_map !== 'undefined') right_map.getContainer().classList.add('input-disabled');
            
            if (helpElement) {
                helpElement.textContent = 'Désactivez le verrou pour commencer la saisie';
                helpElement.className = 'input-help-message';
            }
        } else if (window.inputMode === 'points') {
            const completePairs = getCompletePairCount();
            statusElement.textContent = `Saisie de points (${completePairs} paires) - Carte ${window.activeMap === 'left' ? 'gauche' : 'droite'} active`;
            
            // Ajouter les classes CSS appropriées
            if (typeof left_map !== 'undefined') left_map.getContainer().classList.add('input-mode-points');
            if (typeof right_map !== 'undefined') right_map.getContainer().classList.add('input-mode-points');
            
            // Marquer la carte active
            if (window.activeMap === 'left' && typeof left_map !== 'undefined') {
                left_map.getContainer().classList.add('active-map');
            } else if (window.activeMap === 'right' && typeof right_map !== 'undefined') {
                right_map.getContainer().classList.add('active-map');
            }
            
            if (helpElement) {
                helpElement.textContent = `Cliquez sur la carte ${window.activeMap === 'left' ? 'gauche' : 'droite'} pour ajouter un point de contrôle`;
                helpElement.className = 'input-help-message active';
            }
        } else if (window.inputMode === 'emprise') {
            statusElement.textContent = 'Saisie d\'emprise sur la carte gauche';
            if (typeof left_map !== 'undefined') left_map.getContainer().classList.add('input-mode-emprise', 'active-map');
            if (typeof right_map !== 'undefined') right_map.getContainer().classList.add('input-disabled');
            
            if (helpElement) {
                const currentPointCount = window.currentPolygon ? window.currentPolygon.points.length : 0;
                if (currentPointCount === 0) {
                    helpElement.textContent = 'Cliquez sur la carte gauche pour commencer le polygone d\'emprise';
                } else if (currentPointCount < 3) {
                    helpElement.textContent = `Polygone: ${currentPointCount} points - Ajoutez au moins 3 points`;
                } else {
                    helpElement.textContent = `Polygone: ${currentPointCount} points - Cliquez pour ajouter d\'autres points`;
                }
                helpElement.className = 'input-help-message active';
            }
        }
    }
    
    // Gestion des boutons de suppression selon l'état de verrouillage
    updateClearButtonsState();
}

function updateClearButtonsState() {
    const btnClearPoints = document.getElementById('btn_clear_points');
    const btnClearEmprise = document.getElementById('btn_clear_emprise');
    
    if (btnClearPoints) {
        if (window.isInputLocked) {
            btnClearPoints.disabled = true;
            btnClearPoints.style.opacity = '0.5';
            btnClearPoints.style.cursor = 'not-allowed';
            btnClearPoints.title = 'Désactivez le verrou pour effacer les points';
        } else {
            btnClearPoints.disabled = false;
            btnClearPoints.style.opacity = '1';
            btnClearPoints.style.cursor = 'pointer';
            btnClearPoints.title = 'Effacer tous les points de contrôle';
        }
    }
    
    if (btnClearEmprise) {
        if (window.isInputLocked) {
            btnClearEmprise.disabled = true;
            btnClearEmprise.style.opacity = '0.5';
            btnClearEmprise.style.cursor = 'not-allowed';
            btnClearEmprise.title = 'Désactivez le verrou pour effacer l\'emprise';
        } else {
            btnClearEmprise.disabled = false;
            btnClearEmprise.style.opacity = '1';
            btnClearEmprise.style.cursor = 'pointer';
            btnClearEmprise.title = 'Effacer l\'emprise sélectionnée';
        }
    }
}

function setupPointInteractions() {
    // Cette fonction sera appelée pour configurer les interactions avancées
    // comme le survol et le déplacement des points
    console.log('Interactions des points configurées');
}

// Fonction pour réinitialiser la saisie
function resetInputSystem() {
    // Supprimer tous les marqueurs
    window.pointPairs.forEach(pair => {
        if (pair.leftPoint && pair.leftPoint.marker) {
            layer_img_pts_left.removeLayer(pair.leftPoint.marker);
        }
        if (pair.rightPoint && pair.rightPoint.marker) {
            layer_img_pts_right.removeLayer(pair.rightPoint.marker);
        }
    });
    
    // Supprimer le polygone
    if (window.currentPolygon) {
        if (window.currentPolygon.layer) {
            layer_img_emprise_left.removeLayer(window.currentPolygon.layer);
        }
        if (window.currentPolygon.tempLayer) {
            layer_img_emprise_left.removeLayer(window.currentPolygon.tempLayer);
        }
    }
    
    // Réinitialiser les variables
    window.pointPairs = [];
    window.pointCounter = 0;
    window.currentPolygon = null;
    window.activeMap = 'left';
    list_georef_points = [];
    list_points_polygon_crop = [];
    count_points = 0;
    
    // Réinitialiser l'interface
    updateControlPointsTable();
    updateUIForInputMode();
    
    console.log('Système de saisie réinitialisé');
}

// Fonction pour obtenir le nombre de paires complètes
function getCompletePairCount() {
    return window.pointPairs.filter(pair => pair.isComplete()).length;
}

// Fonctions utilitaires pour le nouveau système de saisie

/**
 * Fonction pour supprimer un point individuel d'une paire
 * @param {number} pointId - ID de la paire
 * @param {string} side - 'left' ou 'right'
 */
function removeIndividualPoint(pointId, side) {
    if (window.isInputLocked) {
        console.log('Suppression interdite - saisie verrouillée');
        alert('La saisie est verrouillée. Désactivez le verrou pour supprimer des points.');
        return;
    }
    
    const pairIndex = window.pointPairs.findIndex(pair => pair.id === pointId);
    if (pairIndex === -1) return;
    
    const pair = window.pointPairs[pairIndex];
    
    if (side === 'left' && pair.leftPoint) {
        // Supprimer le marqueur de la carte
        if (pair.leftPoint.marker) {
            layer_img_pts_left.removeLayer(pair.leftPoint.marker);
        }
        pair.leftPoint = null;
    } else if (side === 'right' && pair.rightPoint) {
        // Supprimer le marqueur de la carte
        if (pair.rightPoint.marker) {
            layer_img_pts_right.removeLayer(pair.rightPoint.marker);
        }
        pair.rightPoint = null;
    }
    
    // Si la paire est maintenant vide, la supprimer complètement
    if (!pair.leftPoint && !pair.rightPoint) {
        window.pointPairs.splice(pairIndex, 1);
    }
    
    // Mettre à jour l'interface
    updateControlPointsTable();
    checkGeoreferencingAvailability();
    
    console.log(`Point ${pointId} ${side} supprimé`);
}

// Rendre la fonction disponible globalement
window.removeIndividualPoint = removeIndividualPoint;

/**
 * Fonction pour supprimer un point spécifique
 * @param {number} pointId - ID du point à supprimer
 */
function removeControlPoint(pointId) {
    const pairIndex = window.pointPairs.findIndex(pair => pair.id === pointId);
    if (pairIndex === -1) return;
    
    const pair = window.pointPairs[pairIndex];
    
    // Supprimer les marqueurs des cartes
    if (pair.leftPoint && pair.leftPoint.marker) {
        layer_img_pts_left.removeLayer(pair.leftPoint.marker);
    }
    if (pair.rightPoint && pair.rightPoint.marker) {
        layer_img_pts_right.removeLayer(pair.rightPoint.marker);
    }
    
    // Supprimer la paire de la liste
    window.pointPairs.splice(pairIndex, 1);
    
    // Mettre à jour l'interface
    updateControlPointsTable();
    checkGeoreferencingAvailability();
    
    console.log(`Point de contrôle ${pointId} supprimé`);
}

/**
 * Fonction pour supprimer tous les points
 */
function clearAllControlPoints() {
    if (window.isInputLocked) {
        console.log('Suppression interdite - saisie verrouillée');
        alert('La saisie est verrouillée. Désactivez le verrou pour supprimer tous les points.');
        return;
    }
    
    resetInputSystem();
}

/**
 * Fonction pour supprimer l'emprise
 */
function clearEmprise() {
    if (window.isInputLocked) {
        console.log('Suppression d\'emprise interdite - saisie verrouillée');
        alert('La saisie est verrouillée. Désactivez le verrou pour supprimer l\'emprise.');
        return;
    }
    
    if (window.currentPolygon) {
        if (window.currentPolygon.layer) {
            layer_img_emprise_left.removeLayer(window.currentPolygon.layer);
        }
        if (window.currentPolygon.tempLayer) {
            layer_img_emprise_left.removeLayer(window.currentPolygon.tempLayer);
        }
        window.currentPolygon = null;
    }
    
    list_points_polygon_crop = [];
    updateUIForInputMode();
    console.log('Emprise supprimée');
}

/**
 * Fonction pour finaliser l'emprise actuelle
 */
function finalizeEmprise() {
    if (window.currentPolygon && window.currentPolygon.points.length >= 3) {
        // Forcer la fermeture du polygone
        updatePolygonData();
        console.log('Emprise finalisée avec', window.currentPolygon.points.length, 'points');
        return true;
    }
    return false;
}

/**
 * Fonction pour vérifier l'égalité des points sur les deux cartes
 */
function validatePointParity() {
    const leftPointsCount = window.pointPairs.filter(pair => pair.leftPoint !== null).length;
    const rightPointsCount = window.pointPairs.filter(pair => pair.rightPoint !== null).length;
    const completePairsCount = window.pointPairs.filter(pair => pair.isComplete()).length;
    
    return {
        leftPoints: leftPointsCount,
        rightPoints: rightPointsCount,
        completePairs: completePairsCount,
        isValid: leftPointsCount === rightPointsCount && completePairsCount >= 3
    };
}

/**
 * Fonction pour exporter les données de géoréférencement
 */
function exportGeoreferencingData() {
    const validation = validatePointParity();
    
    if (!validation.isValid) {
        console.warn('Données de géoréférencement non valides:', validation);
        return null;
    }
    
    return {
        points: list_georef_points,
        polygon: list_points_polygon_crop,
        pointCount: validation.completePairs
    };
}

// Exposer les fonctions principales au contexte global
window.setupAdvancedInputSystem = setupAdvancedInputSystem;
window.ControlPointPair = ControlPointPair;
window.resetInputSystem = resetInputSystem;
window.clearAllControlPoints = clearAllControlPoints;
window.clearEmprise = clearEmprise;
window.getCompletePairCount = getCompletePairCount;
window.exportGeoreferencingData = exportGeoreferencingData;
window.removeControlPoint = removeControlPoint;
window.validatePointParity = validatePointParity;
window.finalizeEmprise = finalizeEmprise;

console.log('Système de saisie avancé chargé et prêt');
