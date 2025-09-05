#!/usr/bin/env node

/**
 * Script utilitaire pour afficher les informations de version du projet
 */

const fs = require('fs');
const path = require('path');

function displayVersionInfo() {
    const versionPath = path.join(__dirname, '..', 'version.json');
    
    try {
        if (!fs.existsSync(versionPath)) {
            console.log('❌ Fichier version.json non trouvé. Exécutez "npm run build-version" d\'abord.');
            return;
        }
        
        const versionInfo = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
        
        console.log('📦 Galligeo - Informations de version');
        console.log('═'.repeat(50));
        console.log(`🏷️  Version affichée    : ${versionInfo.displayVersion}`);
        console.log(`🔢 Version complète     : ${versionInfo.detailedVersion}`);
        console.log(`🔨 Numéro de build      : ${versionInfo.buildNumber}`);
        console.log(`📝 Dernier commit       : ${versionInfo.git.hash} (${versionInfo.git.branch})`);
        console.log(`💬 Message              : ${versionInfo.git.lastCommitMessage}`);
        console.log(`📅 Date de build        : ${new Date(versionInfo.build.timestamp).toLocaleString('fr-FR')}`);
        console.log(`🌍 Environnement        : ${versionInfo.build.environment}`);
        console.log(`👥 Contributeurs        : ${versionInfo.git.contributors.join(', ')}`);
        
        if (versionInfo.git.isDirty) {
            console.log(`⚠️  Statut               : Répertoire modifié (non committé)`);
        } else {
            console.log(`✅ Statut               : Propre`);
        }
        
        console.log('═'.repeat(50));
        
        // Informations de déploiement
        console.log('\n🚀 Informations de déploiement :');
        console.log(`   - Fichier JavaScript : js/version.js`);
        console.log(`   - Variable globale   : window.APP_VERSION`);
        console.log(`   - Footer application : ${versionInfo.shortDisplayVersion}`);
        
    } catch (error) {
        console.error('❌ Erreur lors de la lecture des informations de version:', error.message);
    }
}

// Exécuter si ce script est appelé directement
if (require.main === module) {
    displayVersionInfo();
}

module.exports = { displayVersionInfo };
