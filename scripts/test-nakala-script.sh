#!/bin/bash
# Script de test pour vérifier le chargement de nakala_test_deposit.js

echo "=== Vérification du fichier nakala_test_deposit.js ==="
echo ""

# Vérifier que le fichier existe
if [ -f "js/nakala_test_deposit.js" ]; then
    echo "✅ Le fichier existe"
    echo "   Taille: $(du -h js/nakala_test_deposit.js | cut -f1)"
else
    echo "❌ Le fichier n'existe pas!"
    exit 1
fi

# Vérifier la première ligne
echo ""
echo "=== Première ligne du fichier ==="
head -1 js/nakala_test_deposit.js

# Vérifier que le script est référencé dans index.html
echo ""
echo "=== Référence dans index.html ==="
if grep -q "nakala_test_deposit.js" index.html; then
    echo "✅ Script référencé dans index.html:"
    grep "nakala_test_deposit.js" index.html
else
    echo "❌ Script NON référencé dans index.html!"
    exit 1
fi

# Vérifier la syntaxe JavaScript
echo ""
echo "=== Vérification syntaxe JavaScript ==="
if node -c js/nakala_test_deposit.js 2>&1; then
    echo "✅ Aucune erreur de syntaxe"
else
    echo "❌ Erreur de syntaxe détectée!"
    exit 1
fi

# Test de chargement avec curl (si le serveur tourne sur 8081)
echo ""
echo "=== Test de chargement HTTP ==="
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/js/nakala_test_deposit.js | grep -q "200"; then
    echo "✅ Le fichier est accessible via HTTP (code 200)"
else
    echo "⚠️  Le serveur ne répond pas sur le port 8081"
    echo "   Assurez-vous que le serveur Python est démarré:"
    echo "   python3 -m http.server 8081"
fi

echo ""
echo "=== Résumé ==="
echo "Si tous les tests sont OK (✅), le problème vient probablement du cache du navigateur."
echo ""
echo "Solutions:"
echo "1. Vider le cache du navigateur (Ctrl + Shift + R)"
echo "2. Ouvrir en navigation privée"
echo "3. Dans la console (F12), vérifier: typeof deposerSurNakala"
echo ""
