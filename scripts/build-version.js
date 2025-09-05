#!/usr/bin/env node

/**
 * Script de génération automatique de version basé sur Git
 * Génère un fichier version.json avec les informations de version
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getGitInfo() {
    try {
        // Obtenir le hash du commit actuel (court)
        const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
        
        // Obtenir le hash du commit actuel (complet)
        const commitHashFull = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
        
        // Obtenir la branche actuelle
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
        
        // Obtenir le nombre total de commits
        const commitCount = parseInt(execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim());
        
        // Obtenir la date du dernier commit
        const lastCommitDate = execSync('git log -1 --format=%ci', { encoding: 'utf8' }).trim();
        
        // Obtenir le message du dernier commit
        const lastCommitMessage = execSync('git log -1 --format=%s', { encoding: 'utf8' }).trim();
        
        // Vérifier s'il y a des modifications non commitées
        let isDirty = false;
        try {
            const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
            isDirty = status.length > 0;
        } catch (e) {
            // Ignore les erreurs de git status
        }
        
        // Obtenir la liste des derniers contributeurs
        const contributors = execSync('git log --format="%an" -10', { encoding: 'utf8' })
            .split('\n')
            .filter(name => name.trim())
            .filter((name, index, array) => array.indexOf(name) === index) // Supprimer les doublons
            .slice(0, 5); // Garder les 5 premiers contributeurs uniques
        
        return {
            commitHash,
            commitHashFull,
            branch,
            commitCount,
            lastCommitDate: new Date(lastCommitDate).toISOString(),
            lastCommitMessage,
            isDirty,
            contributors
        };
    } catch (error) {
        console.warn('Impossible d\'obtenir les informations Git:', error.message);
        return {
            commitHash: 'unknown',
            commitHashFull: 'unknown',
            branch: 'unknown',
            commitCount: 0,
            lastCommitDate: new Date().toISOString(),
            lastCommitMessage: 'Information non disponible',
            isDirty: false,
            contributors: []
        };
    }
}

function generateVersion() {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    const gitInfo = getGitInfo();
    
    // Génération du numéro de version sémantique basé sur le package.json et Git
    const baseVersion = packageJson.version || '1.0.0';
    const [major, minor, patch] = baseVersion.split('.').map(Number);
    
    // Version sémantique étendue avec informations Git
    const semanticVersion = `${major}.${minor}.${patch}`;
    const buildNumber = gitInfo.commitCount;
    const fullVersion = `${semanticVersion}.${buildNumber}`;
    
    // Version d'affichage courte pour l'interface
    const displayVersion = `v${semanticVersion} (build ${buildNumber})`;
    const shortDisplayVersion = `v${semanticVersion}`;
    
    // Version complète avec hash de commit
    const detailedVersion = `${fullVersion}+${gitInfo.commitHash}${gitInfo.isDirty ? '-dirty' : ''}`;
    
    const versionInfo = {
        // Versions principales
        version: semanticVersion,
        fullVersion: fullVersion,
        displayVersion: displayVersion,
        shortDisplayVersion: shortDisplayVersion,
        detailedVersion: detailedVersion,
        buildNumber: buildNumber,
        
        // Informations Git
        git: {
            hash: gitInfo.commitHash,
            hashFull: gitInfo.commitHashFull,
            branch: gitInfo.branch,
            commitCount: gitInfo.commitCount,
            lastCommitDate: gitInfo.lastCommitDate,
            lastCommitMessage: gitInfo.lastCommitMessage,
            isDirty: gitInfo.isDirty,
            contributors: gitInfo.contributors
        },
        
        // Métadonnées de build
        build: {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            buildId: `${gitInfo.commitHash}-${Date.now()}`
        },
        
        // Informations du projet
        project: {
            name: packageJson.name || 'galligeo-front',
            description: packageJson.description || '',
            author: packageJson.author || 'Paris Time Machine'
        }
    };
    
    return versionInfo;
}

function writeVersionFile(versionInfo) {
    const versionPath = path.join(__dirname, '..', 'version.json');
    
    try {
        fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2), 'utf8');
        console.log(`✅ Fichier de version généré: ${versionPath}`);
        console.log(`📦 Version: ${versionInfo.displayVersion}`);
        console.log(`🔨 Build: ${versionInfo.buildNumber}`);
        console.log(`📝 Commit: ${versionInfo.git.hash} (${versionInfo.git.branch})`);
        if (versionInfo.git.isDirty) {
            console.log(`⚠️  Répertoire de travail modifié (non committé)`);
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'écriture du fichier de version:', error.message);
        process.exit(1);
    }
}

function generateVersionJS() {
    const versionInfo = generateVersion();
    
    // Générer un fichier JavaScript pour l'utilisation côté client
    const jsContent = `// Version générée automatiquement - Ne pas modifier manuellement
// Généré le ${versionInfo.build.timestamp}

window.APP_VERSION = ${JSON.stringify(versionInfo, null, 2)};

// Fonction utilitaire pour obtenir les informations de version
window.getAppVersion = function() {
    return window.APP_VERSION;
};

// Fonction pour afficher la version dans la console
window.showVersionInfo = function() {
    const version = window.getAppVersion();
    console.group('📦 Galligeo - Informations de version');
    console.log('Version:', version.displayVersion);
    console.log('Build:', version.buildNumber);
    console.log('Commit:', version.git.hash, '(' + version.git.branch + ')');
    console.log('Date de build:', new Date(version.build.timestamp).toLocaleString('fr-FR'));
    console.log('Dernier commit:', version.git.lastCommitMessage);
    console.log('Contributeurs récents:', version.git.contributors.join(', '));
    console.groupEnd();
};

// Afficher automatiquement les informations de version en mode développement
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🚀 Galligeo ' + window.APP_VERSION.displayVersion + ' - Mode développement');
    setTimeout(window.showVersionInfo, 1000);
}
`;
    
    const jsPath = path.join(__dirname, '..', 'js', 'version.js');
    
    try {
        fs.writeFileSync(jsPath, jsContent, 'utf8');
        console.log(`✅ Fichier JavaScript de version généré: ${jsPath}`);
    } catch (error) {
        console.error('❌ Erreur lors de l\'écriture du fichier JS de version:', error.message);
    }
    
    return versionInfo;
}

// Exécution principale
function main() {
    console.log('🔧 Génération des informations de version...');
    
    const versionInfo = generateVersionJS();
    writeVersionFile(versionInfo);
    
    console.log('✨ Génération terminée avec succès !');
}

// Exécuter si ce script est appelé directement
if (require.main === module) {
    main();
}

module.exports = {
    generateVersion,
    generateVersionJS,
    getGitInfo
};
