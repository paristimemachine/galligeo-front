# Scripts JavaScript - Galligeo

## Scripts de correction et maintenance

### fix-empty-status.js
**Correction des statuts vides dans la base de données**

Identifie et corrige automatiquement les cartes qui ont un objet `status: {}` vide au lieu d'un statut valide.

**Utilisation :**
```javascript
// Diagnostic seul
await window.fixEmptyStatus.diagnose()

// Correction automatique (recommandé)
await window.fixEmptyStatus.checkAndFix()

// Correction rapide vers un statut par défaut
await window.fixEmptyStatus.quickFix('en-cours')
```

**Documentation complète :** `doc/FIX_EMPTY_STATUS.md`

---

### fix-empty-status-guide.js
**Guide rapide pour la correction des statuts**

Affiche dans la console les commandes principales pour corriger les statuts vides.

---

### test-status-validation.js
**Tests de validation des statuts**

Suite de tests pour vérifier que la validation des statuts fonctionne correctement.

**Utilisation :**
```javascript
await window.testStatus()
```

**Tests effectués :**
- ✅ Acceptation des statuts valides (`'en-cours'`, `'georeferenced'`, `'deposee'`)
- ✅ Rejet des statuts invalides (vides, objets, mauvais type)
- ✅ Ordre correct des paramètres

---

### status-fixer.js
**Correction des statuts de géoréférencement manquants**

Script pour synchroniser les statuts entre l'API et les cartes réellement géoréférencées sur le serveur.

**Utilisation :**
```javascript
await window.fixStatus()
```

---

### status-monitor.js
**Surveillance silencieuse des statuts**

Vérifie périodiquement la cohérence des statuts entre le local et l'API.

---

### auto-status-correction.js
**Correction automatique des statuts au démarrage**

Corrige automatiquement les incohérences de statuts lors du chargement de l'application.

---

## Statuts valides

Les trois statuts possibles pour une carte :

| Statut | Description | Utilisation |
|--------|-------------|-------------|
| `'en-cours'` | Carte en cours de géoréférencement | Carte chargée, points en cours de création |
| `'georeferenced'` | Carte géoréférencée | Géoréférencement terminé et validé |
| `'deposee'` | Carte déposée sur Nakala | Carte archivée avec DOI |

⚠️ **Important** : Le statut doit toujours être une **chaîne de caractères**, jamais un objet vide `{}`.

---

## Résolution des problèmes

### Statuts vides en base
Si vous trouvez des cartes avec `status: {}` :

1. Ouvrir la console (F12)
2. Se connecter avec ORCID
3. Exécuter : `await window.fixAllEmptyStatus()`

### Vérifier les statuts
```javascript
const data = await window.ptmAuth.getGalligeoData();
console.table(data.rec_ark.map(m => ({
    ark: m.ark,
    status: m.status,
    type: typeof m.status
})));
```

Tous les statuts doivent avoir `type: "string"`.

---

## Historique des corrections

- **2025-10-06** : Correction bug statuts vides + validation stricte
- Voir `CHANGELOG.md` pour plus de détails
