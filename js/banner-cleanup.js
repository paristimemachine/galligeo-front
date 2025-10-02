/**
 * Script de nettoyage pour supprimer les bannières anonymes existantes
 * À exécuter pour nettoyer l'interface si des bannières ont été créées
 */

function cleanupAnonymousBanners() {
    console.log('🧹 Nettoyage des bannières anonymes...');
    
    // Liste des IDs de bannières à supprimer
    const bannersToRemove = [
        'anonymous-user-banner',
        'anonymous-banner', 
        'anonymous-georef-warning',
        'anonymous-georef-message'
    ];
    
    let removedCount = 0;
    
    bannersToRemove.forEach(bannerId => {
        const banner = document.getElementById(bannerId);
        if (banner) {
            banner.remove();
            removedCount++;
            console.log(`✅ Bannière supprimée: ${bannerId}`);
        }
    });
    
    // Supprimer aussi toutes les notices avec des classes spécifiques
    const noticeElements = document.querySelectorAll('.fr-notice, .fr-alert');
    noticeElements.forEach(notice => {
        const text = notice.textContent || '';
        if (text.includes('Mode anonyme') || 
            text.includes('anonyme') || 
            text.includes('Géoréférencement limité') ||
            text.includes('connecter')) {
            notice.remove();
            removedCount++;
            console.log('✅ Notice anonyme supprimée');
        }
    });
    
    if (removedCount === 0) {
        console.log('ℹ️ Aucune bannière à supprimer');
    } else {
        console.log(`🎉 ${removedCount} bannière(s) supprimée(s)`);
    }
    
    return removedCount;
}

// Fonction pour vérifier l'état du sticky footer
function checkStickyFooter() {
    console.log('👁️ Vérification du sticky footer...');
    
    const footer = document.querySelector('footer');
    if (footer) {
        const computedStyle = window.getComputedStyle(footer);
        console.log('Footer styles:', {
            position: computedStyle.position,
            bottom: computedStyle.bottom,
            marginTop: computedStyle.marginTop,
            height: computedStyle.height
        });
        
        const rect = footer.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        console.log('Footer position:', {
            top: rect.top,
            bottom: rect.bottom,
            viewportHeight: viewportHeight,
            isAtBottom: rect.bottom >= viewportHeight - 10 // Tolérance de 10px
        });
    } else {
        console.log('❌ Footer non trouvé');
    }
}

// Fonction pour optimiser le layout sans bannières
function optimizeLayoutWithoutBanners() {
    console.log('⚡ Optimisation du layout sans bannières...');
    
    // S'assurer qu'il n'y a pas d'espacement supplémentaire en haut
    const main = document.querySelector('main');
    if (main) {
        // Réinitialiser les marges du main si nécessaires
        const computedStyle = window.getComputedStyle(main);
        if (computedStyle.paddingTop) {
            console.log('Main padding-top:', computedStyle.paddingTop);
        }
    }
    
    // Vérifier que le header n'a pas d'éléments ajoutés
    const header = document.querySelector('.fr-header');
    if (header) {
        const nextSibling = header.nextElementSibling;
        if (nextSibling && (nextSibling.classList.contains('fr-notice') || 
                           nextSibling.classList.contains('fr-alert'))) {
            console.log('⚠️ Élément suspect trouvé après le header:', nextSibling);
        }
    }
}

// Exécution automatique au chargement
document.addEventListener('DOMContentLoaded', () => {
    // Attendre un peu pour que les autres scripts s'exécutent
    setTimeout(() => {
        cleanupAnonymousBanners();
        optimizeLayoutWithoutBanners();
        checkStickyFooter();
    }, 1000);
});

// Observer les mutations pour détecter l'ajout dynamique de bannières
const bannerObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
                const element = node;
                if (element.classList && 
                    (element.classList.contains('fr-notice') || 
                     element.classList.contains('fr-alert'))) {
                    
                    const text = element.textContent || '';
                    if (text.includes('Mode anonyme') || 
                        text.includes('Géoréférencement limité')) {
                        console.log('🚫 Bannière anonyme détectée et supprimée:', element);
                        element.remove();
                    }
                }
            }
        });
    });
});

// Observer le body pour les ajouts dynamiques
bannerObserver.observe(document.body, {
    childList: true,
    subtree: true
});

// Fonctions globales
window.cleanupAnonymousBanners = cleanupAnonymousBanners;
window.checkStickyFooter = checkStickyFooter;
window.optimizeLayoutWithoutBanners = optimizeLayoutWithoutBanners;

console.log('🔧 Script de nettoyage des bannières anonymes chargé');
console.log('📋 Fonctions disponibles: cleanupAnonymousBanners(), checkStickyFooter(), optimizeLayoutWithoutBanners()');