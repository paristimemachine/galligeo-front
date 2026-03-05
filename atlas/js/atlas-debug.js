console.log('🔍 Vérification Leaflet.Sync:', typeof L !== 'undefined' && typeof L.Map !== 'undefined' && typeof L.Map.prototype.sync);
if (typeof L !== 'undefined' && L.Map && typeof L.Map.prototype.sync === 'function') {
    console.log('✅ Leaflet.Sync est bien chargé et actif');
} else {
    console.error('❌ Leaflet.Sync n\'est pas disponible');
}
