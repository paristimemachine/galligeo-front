/**
 * Script de test pour vérifier que la sauvegarde des paramètres fonctionne 
 * même sans ARK défini (utilise 'general-settings' comme ARK par défaut)
 */

console.log('=== Test de sauvegarde des paramètres sans ARK ===');

// Simuler l'absence d'ARK
const originalArk = window.input_ark;
window.input_ark = null;

console.log('ARK actuel:', window.input_ark);
console.log('ARK effectif qui sera utilisé: general-settings');

// Paramètres de test
const testSettings = {
    'select-algo': 'polynomial',
    'select-resample': 'bilinear',
    'select-quality': 'medium',
    'checkbox-compression': true,
    'checkbox-transparent': false,
    'checkbox-matrice': true,
    'input-scale': 100000,
    'checkbox-autosave': true,
    'select-backup-frequency': '120',
    'input-max-backups': 10
};

console.log('Paramètres à sauvegarder:', testSettings);

// Tester la sauvegarde
if (window.ptmAuth && window.ptmAuth.isAuthenticated()) {
    window.ptmAuth.saveGalligeoSettings(testSettings)
        .then(() => {
            console.log('✓ Sauvegarde réussie sans ARK (utilise general-settings)');
            return window.ptmAuth.getGalligeoSettings();
        })
        .then((loadedSettings) => {
            console.log('✓ Paramètres rechargés:', loadedSettings);
            console.log('=== Test terminé avec succès ===');
        })
        .catch((error) => {
            console.error('✗ Erreur lors du test:', error);
        })
        .finally(() => {
            // Restaurer l'ARK original
            window.input_ark = originalArk;
        });
} else {
    console.warn('Utilisateur non authentifié - impossible de tester la sauvegarde cloud');
    window.input_ark = originalArk;
}
