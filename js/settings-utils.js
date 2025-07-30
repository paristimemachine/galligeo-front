/**
 * Utilitaires pour accéder aux paramètres de l'application
 * Ce fichier fournit des fonctions pratiques pour récupérer les paramètres
 * depuis n'importe où dans l'application
 */

// Constantes pour les clés de paramètres (évite les erreurs de frappe)
const SETTINGS_KEYS = {
    ALGORITHM: 'select-algo',
    RESAMPLE_METHOD: 'select-resample',
    IMAGE_QUALITY: 'select-quality',
    COMPRESSION: 'checkbox-compression',
    TRANSPARENCY: 'checkbox-transparent',
    SAVE_MATRIX: 'checkbox-matrice',
    START_SCALE: 'input-scale'
};

/**
 * Récupère l'algorithme de géoréférencement par défaut
 * @returns {string} L'algorithme sélectionné ('polynomial', 'helmert', 'affine', 'tps')
 */
function getDefaultAlgorithm() {
    return getAppSetting(SETTINGS_KEYS.ALGORITHM, 'polynomial');
}

/**
 * Récupère la méthode de rééchantillonage par défaut
 * @returns {string} La méthode sélectionnée ('nearest', 'bilinear', 'cubic', 'lanczos')
 */
function getDefaultResampleMethod() {
    return getAppSetting(SETTINGS_KEYS.RESAMPLE_METHOD, 'bilinear');
}

/**
 * Récupère la qualité d'image Gallica par défaut
 * @returns {string} La qualité sélectionnée ('medium', 'hd')
 */
function getDefaultImageQuality() {
    return getAppSetting(SETTINGS_KEYS.IMAGE_QUALITY, 'hd');
}

/**
 * Vérifie si la compression des images est activée
 * @returns {boolean} true si la compression est activée
 */
function isCompressionEnabled() {
    return getAppSetting(SETTINGS_KEYS.COMPRESSION, true);
}

/**
 * Vérifie si la transparence du fond est activée
 * @returns {boolean} true si la transparence est activée
 */
function isTransparencyEnabled() {
    return getAppSetting(SETTINGS_KEYS.TRANSPARENCY, false);
}

/**
 * Vérifie si la sauvegarde de la matrice de points est activée
 * @returns {boolean} true si la sauvegarde est activée
 */
function isMatrixSaveEnabled() {
    return getAppSetting(SETTINGS_KEYS.SAVE_MATRIX, true);
}

/**
 * Récupère l'échelle de démarrage par défaut
 * @returns {number} L'échelle par défaut (ex: 100000 pour 1/100.000)
 */
function getDefaultStartScale() {
    return getAppSetting(SETTINGS_KEYS.START_SCALE, 100000);
}

/**
 * Récupère tous les paramètres sous forme d'objet
 * @returns {object} Objet contenant tous les paramètres
 */
function getAllSettings() {
    return {
        algorithm: getDefaultAlgorithm(),
        resampleMethod: getDefaultResampleMethod(),
        imageQuality: getDefaultImageQuality(),
        compression: isCompressionEnabled(),
        transparency: isTransparencyEnabled(),
        matrixSave: isMatrixSaveEnabled(),
        startScale: getDefaultStartScale()
    };
}

/**
 * Applique les paramètres à un processus de géoréférencement
 * @param {object} georefParams - Paramètres de géoréférencement à modifier
 * @returns {object} Paramètres modifiés avec les valeurs des paramètres utilisateur
 */
function applySettingsToGeoreference(georefParams = {}) {
    return {
        ...georefParams,
        algorithm: georefParams.algorithm || getDefaultAlgorithm(),
        resampleMethod: georefParams.resampleMethod || getDefaultResampleMethod(),
        imageQuality: georefParams.imageQuality || getDefaultImageQuality(),
        compression: georefParams.compression !== undefined ? georefParams.compression : isCompressionEnabled(),
        transparency: georefParams.transparency !== undefined ? georefParams.transparency : isTransparencyEnabled(),
        saveMatrix: georefParams.saveMatrix !== undefined ? georefParams.saveMatrix : isMatrixSaveEnabled(),
        startScale: georefParams.startScale || getDefaultStartScale()
    };
}

/**
 * Construit l'URL Gallica avec la qualité appropriée
 * @param {string} baseUrl - URL de base Gallica
 * @returns {string} URL modifiée avec les paramètres de qualité
 */
function buildGallicaUrl(baseUrl) {
    const quality = getDefaultImageQuality();
    
    // Si l'URL contient déjà des paramètres de qualité, les remplacer
    // Sinon, ajouter le paramètre de qualité
    if (baseUrl.includes('quality=')) {
        return baseUrl.replace(/quality=[^&]+/, `quality=${quality}`);
    } else {
        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}quality=${quality}`;
    }
}

/**
 * Obtient les paramètres de transformation pour GDAL
 * @returns {object} Paramètres formatés pour GDAL
 */
function getGDALTransformParams() {
    return {
        '-t_srs': 'EPSG:4326', // Projection de sortie par défaut
        '-s_srs': 'EPSG:4326', // Projection source par défaut
        '-r': getDefaultResampleMethod(),
        '-co': isCompressionEnabled() ? ['COMPRESS=JPEG', 'QUALITY=85'] : [],
        '-srcnodata': isTransparencyEnabled() ? '0' : null,
        '-dstnodata': isTransparencyEnabled() ? '0' : null
    };
}

/**
 * Valide les paramètres avant utilisation
 * @returns {object} Résultat de la validation avec les erreurs éventuelles
 */
function validateSettings() {
    const errors = [];
    const settings = getAllSettings();
    
    // Vérifier l'algorithme
    const validAlgorithms = ['polynomial', 'helmert', 'affine', 'tps'];
    if (!validAlgorithms.includes(settings.algorithm)) {
        errors.push(`Algorithme invalide: ${settings.algorithm}`);
    }
    
    // Vérifier la méthode de rééchantillonage
    const validMethods = ['nearest', 'bilinear', 'cubic', 'lanczos'];
    if (!validMethods.includes(settings.resampleMethod)) {
        errors.push(`Méthode de rééchantillonage invalide: ${settings.resampleMethod}`);
    }
    
    // Vérifier la qualité
    const validQualities = ['medium', 'hd'];
    if (!validQualities.includes(settings.imageQuality)) {
        errors.push(`Qualité d'image invalide: ${settings.imageQuality}`);
    }
    
    // Vérifier l'échelle
    if (settings.startScale < 1000 || settings.startScale > 10000000) {
        errors.push(`Échelle de démarrage invalide: ${settings.startScale}`);
    }
    
    return {
        valid: errors.length === 0,
        errors: errors,
        settings: settings
    };
}

// Export des fonctions pour utilisation globale
window.GalligeoSettings = {
    KEYS: SETTINGS_KEYS,
    getDefaultAlgorithm,
    getDefaultResampleMethod,
    getDefaultImageQuality,
    isCompressionEnabled,
    isTransparencyEnabled,
    isMatrixSaveEnabled,
    getDefaultStartScale,
    getAllSettings,
    applySettingsToGeoreference,
    buildGallicaUrl,
    getGDALTransformParams,
    validateSettings
};

// Pour la compatibilité avec l'ancien code
window.getDefaultAlgorithm = getDefaultAlgorithm;
window.getDefaultResampleMethod = getDefaultResampleMethod;
window.getDefaultImageQuality = getDefaultImageQuality;
