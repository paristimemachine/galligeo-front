/**
 * GUIDE RAPIDE - Correction des statuts vides
 * ============================================
 * 
 * Ce fichier contient les commandes essentielles pour diagnostiquer et corriger
 * les cartes qui ont un statut vide {} dans la base de données.
 * 
 * COMMANDES DISPONIBLES:
 * ----------------------
 * 
 * 1. DIAGNOSTIC (ne modifie rien)
 *    await window.diagnoseEmptyStatus()
 * 
 * 2. CORRECTION AUTOMATIQUE (recommandé)
 *    await window.fixAllEmptyStatus()
 * 
 * 3. CORRECTION RAPIDE (met tout en "en-cours")
 *    await window.fixEmptyStatus.quickFix('en-cours')
 * 
 * 4. VÉRIFIER TOUTES LES CARTES
 *    const data = await window.ptmAuth.getGalligeoData()
 *    console.table(data.rec_ark.map(m => ({
 *        ark: m.ark, 
 *        status: m.status, 
 *        type: typeof m.status
 *    })))
 * 
 * PRÉREQUIS:
 * ----------
 * - Être connecté avec ORCID
 * - Ouvrir la console développeur (F12)
 * 
 * DOCUMENTATION COMPLÈTE:
 * -----------------------
 * Voir: doc/FIX_EMPTY_STATUS.md
 */

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('  GUIDE RAPIDE - Correction des statuts vides');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('📋 Commandes disponibles:');
console.log('');
console.log('  1. Diagnostic:');
console.log('     await window.diagnoseEmptyStatus()');
console.log('');
console.log('  2. Correction automatique:');
console.log('     await window.fixAllEmptyStatus()');
console.log('');
console.log('  3. Correction rapide:');
console.log('     await window.fixEmptyStatus.quickFix("en-cours")');
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
