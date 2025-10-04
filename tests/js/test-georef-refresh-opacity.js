/**
 * Script de test pour les fonctionnalités de refresh et contrôle d'opacité
 * À exécuter dans la console du navigateur après avoir chargé l'application
 */

(function() {
    console.log('🧪 === TEST GEOREF REFRESH & OPACITY CONTROL ===');
    console.log('');
    
    // Test 1 : Vérification des variables globales
    console.log('📋 Test 1 : Variables globales');
    console.log('  → window.currentGeoreferencedLayer:', 
                typeof window.currentGeoreferencedLayer !== 'undefined' ? '✓ OK' : '✗ MANQUANT');
    console.log('  → window.opacityControl:', 
                typeof window.opacityControl !== 'undefined' ? '✓ OK' : '✗ MANQUANT');
    console.log('');
    
    // Test 2 : Vérification du contrôle d'opacité
    if (typeof window.opacityControl !== 'undefined') {
        console.log('📋 Test 2 : Méthodes du contrôle d\'opacité');
        console.log('  → show():', typeof window.opacityControl.show === 'function' ? '✓ OK' : '✗ MANQUANT');
        console.log('  → hide():', typeof window.opacityControl.hide === 'function' ? '✓ OK' : '✗ MANQUANT');
        console.log('  → reset():', typeof window.opacityControl.reset === 'function' ? '✓ OK' : '✗ MANQUANT');
        console.log('');
    } else {
        console.warn('⚠️  Contrôle d\'opacité non disponible - Les cartes sont-elles initialisées ?');
        console.log('');
    }
    
    // Test 3 : Vérification du layer actuel
    console.log('📋 Test 3 : Layer géoréférencé');
    if (window.currentGeoreferencedLayer) {
        console.log('  → Layer actif:', '✓ OUI');
        console.log('  → Type:', window.currentGeoreferencedLayer.constructor.name);
        console.log('  → Opacité actuelle:', window.currentGeoreferencedLayer.options.opacity || 1);
    } else {
        console.log('  → Layer actif:', 'Non (normal si aucun géoréférencement effectué)');
    }
    console.log('');
    
    // Test 4 : Vérification des cartes
    console.log('📋 Test 4 : Cartes Leaflet');
    console.log('  → left_map:', typeof left_map !== 'undefined' ? '✓ OK' : '✗ MANQUANT');
    console.log('  → right_map:', typeof right_map !== 'undefined' ? '✓ OK' : '✗ MANQUANT');
    console.log('');
    
    // Fonctions utilitaires de test
    console.log('🔧 Fonctions utilitaires disponibles :');
    console.log('  → testOpacityControl() : Tester le contrôle d\'opacité');
    console.log('  → testLayerRefresh() : Tester le refresh du layer');
    console.log('  → showOpacityControl() : Afficher le contrôle');
    console.log('  → hideOpacityControl() : Masquer le contrôle');
    console.log('  → resetOpacity() : Réinitialiser l\'opacité à 100%');
    console.log('  → setOpacity(value) : Définir l\'opacité (0-100)');
    console.log('');
    
    // Fonction de test du contrôle d'opacité
    window.testOpacityControl = function() {
        console.log('🧪 Test du contrôle d\'opacité...');
        
        if (!window.opacityControl) {
            console.error('✗ Contrôle d\'opacité non disponible');
            return;
        }
        
        if (!window.currentGeoreferencedLayer) {
            console.warn('⚠️  Aucun layer géoréférencé actif');
            console.log('💡 Effectuez d\'abord un géoréférencement');
            return;
        }
        
        console.log('1. Affichage du contrôle...');
        window.opacityControl.show();
        
        setTimeout(() => {
            console.log('2. Test de l\'opacité à 50%...');
            window.currentGeoreferencedLayer.setOpacity(0.5);
            
            setTimeout(() => {
                console.log('3. Test de l\'opacité à 100%...');
                window.currentGeoreferencedLayer.setOpacity(1.0);
                
                setTimeout(() => {
                    console.log('4. Réinitialisation...');
                    window.opacityControl.reset();
                    console.log('✓ Test terminé avec succès');
                }, 1000);
            }, 1000);
        }, 1000);
    };
    
    // Fonction de test du refresh
    window.testLayerRefresh = function() {
        console.log('🧪 Test du refresh du layer...');
        
        if (!window.currentGeoreferencedLayer) {
            console.warn('⚠️  Aucun layer géoréférencé actif');
            console.log('💡 Effectuez d\'abord un géoréférencement');
            return;
        }
        
        console.log('Layer actuel:', window.currentGeoreferencedLayer);
        console.log('URL du layer:', window.currentGeoreferencedLayer._url);
        
        if (window.currentGeoreferencedLayer._url.includes('?t=')) {
            console.log('✓ Le timestamp est présent dans l\'URL (cache-busting actif)');
        } else {
            console.warn('⚠️  Aucun timestamp détecté dans l\'URL');
        }
        
        console.log('💡 Pour tester le refresh : modifier les points et cliquer à nouveau sur "Géoréférencer"');
    };
    
    // Fonctions de contrôle direct
    window.showOpacityControl = function() {
        if (window.opacityControl) {
            window.opacityControl.show();
            console.log('✓ Contrôle d\'opacité affiché');
        } else {
            console.error('✗ Contrôle non disponible');
        }
    };
    
    window.hideOpacityControl = function() {
        if (window.opacityControl) {
            window.opacityControl.hide();
            console.log('✓ Contrôle d\'opacité masqué');
        } else {
            console.error('✗ Contrôle non disponible');
        }
    };
    
    window.resetOpacity = function() {
        if (window.opacityControl) {
            window.opacityControl.reset();
            console.log('✓ Opacité réinitialisée à 100%');
        } else {
            console.error('✗ Contrôle non disponible');
        }
    };
    
    window.setOpacity = function(value) {
        if (!window.currentGeoreferencedLayer) {
            console.error('✗ Aucun layer géoréférencé actif');
            return;
        }
        
        if (value < 0 || value > 100) {
            console.error('✗ Valeur invalide. Utilisez une valeur entre 0 et 100');
            return;
        }
        
        const opacity = value / 100;
        window.currentGeoreferencedLayer.setOpacity(opacity);
        console.log(`✓ Opacité définie à ${value}%`);
    };
    
    console.log('✅ Script de test chargé avec succès');
    console.log('');
})();
