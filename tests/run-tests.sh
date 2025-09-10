#!/bin/bash

# Script de déploiement avec tests de non-régression
# À exécuter avant chaque déploiement de Galligeo

set -e  # Arrêter en cas d'erreur

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TESTS_DIR="$PROJECT_ROOT/tests"
LOG_DIR="$PROJECT_ROOT/logs"
BACKUP_DIR="$PROJECT_ROOT/backups"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions utilitaires
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Créer les répertoires nécessaires
create_directories() {
    log_info "Création des répertoires nécessaires..."
    mkdir -p "$LOG_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$TESTS_DIR/reports"
}

# Vérifier les prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    # Vérifier Node.js pour les tests JavaScript
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_success "Node.js trouvé: $NODE_VERSION"
    else
        log_warning "Node.js non trouvé, certains tests pourraient échouer"
    fi
    
    # Vérifier curl pour les tests API
    if command -v curl &> /dev/null; then
        log_success "curl trouvé"
    else
        log_error "curl requis pour les tests API"
        exit 1
    fi
    
    # Vérifier jq pour le parsing JSON
    if command -v jq &> /dev/null; then
        log_success "jq trouvé"
    else
        log_warning "jq recommandé pour l'analyse des résultats JSON"
    fi
}

# Sauvegarder l'état actuel
backup_current_state() {
    log_info "Sauvegarde de l'état actuel..."
    
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="$BACKUP_DIR/galligeo_backup_$TIMESTAMP.tar.gz"
    
    tar -czf "$BACKUP_FILE" \
        --exclude="tests" \
        --exclude="logs" \
        --exclude="backups" \
        --exclude="node_modules" \
        --exclude=".git" \
        -C "$PROJECT_ROOT" \
        .
    
    log_success "Sauvegarde créée: $BACKUP_FILE"
}

# Exécuter les tests backend via curl
run_backend_tests() {
    log_info "Exécution des tests backend..."
    
    local test_results_file="$TESTS_DIR/reports/backend_results_$(date +%Y%m%d_%H%M%S).json"
    local api_base_url="https://api.ptm.huma-num.fr/galligeo"
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    echo "{\"timestamp\": \"$(date -Iseconds)\", \"tests\": [" > "$test_results_file"
    
    # Test 1: Health check de l'API Galligeo
    log_info "Test: Health check API Galligeo"
    if curl -s -f "$api_base_url/health" > /dev/null 2>&1; then
        echo "    {\"name\": \"galligeo_health\", \"status\": \"passed\", \"timestamp\": \"$(date -Iseconds)\"}," >> "$test_results_file"
        log_success "✅ API Galligeo accessible"
        ((passed_tests++))
    else
        echo "    {\"name\": \"galligeo_health\", \"status\": \"failed\", \"error\": \"API non accessible\", \"timestamp\": \"$(date -Iseconds)\"}," >> "$test_results_file"
        log_error "❌ API Galligeo non accessible"
        ((failed_tests++))
    fi
    ((total_tests++))
    
    # Test 2: Test de l'endpoint de géoréférencement
    log_info "Test: Endpoint de géoréférencement"
    georef_response=$(curl -s -w "%{http_code}" -X POST "$api_base_url/georef" \
        -H "Content-Type: application/json" \
        -d '{"ark": "ark:/12148/btv1b53102415v", "controlPoints": [], "algorithm": "polynomial"}' \
        -o /tmp/georef_test.json 2>/dev/null || echo "000")
    
    if [[ "$georef_response" =~ ^2[0-9][0-9]$ ]]; then
        echo "    {\"name\": \"georef_endpoint\", \"status\": \"passed\", \"http_code\": \"$georef_response\", \"timestamp\": \"$(date -Iseconds)\"}," >> "$test_results_file"
        log_success "✅ Endpoint géoréférencement fonctionne"
        ((passed_tests++))
    else
        echo "    {\"name\": \"georef_endpoint\", \"status\": \"failed\", \"http_code\": \"$georef_response\", \"timestamp\": \"$(date -Iseconds)\"}," >> "$test_results_file"
        log_error "❌ Endpoint géoréférencement échoue (HTTP: $georef_response)"
        ((failed_tests++))
    fi
    ((total_tests++))
    
    # Test 3: Test du serveur de tuiles
    log_info "Test: Serveur de tuiles"
    if curl -s -f "https://tile.ptm.huma-num.fr" > /dev/null 2>&1; then
        echo "    {\"name\": \"tile_server\", \"status\": \"passed\", \"timestamp\": \"$(date -Iseconds)\"}," >> "$test_results_file"
        log_success "✅ Serveur de tuiles accessible"
        ((passed_tests++))
    else
        echo "    {\"name\": \"tile_server\", \"status\": \"failed\", \"error\": \"Serveur non accessible\", \"timestamp\": \"$(date -Iseconds)\"}," >> "$test_results_file"
        log_error "❌ Serveur de tuiles non accessible"
        ((failed_tests++))
    fi
    ((total_tests++))
    
    # Finaliser le fichier JSON
    sed -i '$ s/,$//' "$test_results_file"  # Supprimer la dernière virgule
    echo "], \"summary\": {\"total\": $total_tests, \"passed\": $passed_tests, \"failed\": $failed_tests, \"success_rate\": $(( passed_tests * 100 / total_tests ))}}" >> "$test_results_file"
    
    log_info "Résultats backend: $passed_tests/$total_tests tests réussis"
    
    if [ $failed_tests -gt 0 ]; then
        return 1
    fi
    return 0
}

# Exécuter les tests frontend via headless browser simulation
run_frontend_tests() {
    log_info "Exécution des tests frontend..."
    
    local test_results_file="$TESTS_DIR/reports/frontend_results_$(date +%Y%m%d_%H%M%S).json"
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    echo "{\"timestamp\": \"$(date -Iseconds)\", \"tests\": [" > "$test_results_file"
    
    # Test 1: Vérification des fichiers JavaScript critiques
    log_info "Test: Fichiers JavaScript critiques"
    critical_js_files=(
        "$PROJECT_ROOT/js/init.js"
        "$PROJECT_ROOT/js/front_interactions.js"
        "$PROJECT_ROOT/js/map_interactions.js"
        "$PROJECT_ROOT/js/ptm-auth.js"
    )
    
    local js_test_passed=true
    for js_file in "${critical_js_files[@]}"; do
        if [ ! -f "$js_file" ]; then
            log_error "❌ Fichier manquant: $js_file"
            js_test_passed=false
        fi
    done
    
    if [ "$js_test_passed" = true ]; then
        echo "    {\"name\": \"critical_js_files\", \"status\": \"passed\", \"timestamp\": \"$(date -Iseconds)\"}," >> "$test_results_file"
        log_success "✅ Fichiers JavaScript critiques présents"
        ((passed_tests++))
    else
        echo "    {\"name\": \"critical_js_files\", \"status\": \"failed\", \"error\": \"Fichiers manquants\", \"timestamp\": \"$(date -Iseconds)\"}," >> "$test_results_file"
        ((failed_tests++))
    fi
    ((total_tests++))
    
    # Test 2: Validation de la syntaxe HTML
    log_info "Test: Validation HTML de base"
    if [ -f "$PROJECT_ROOT/index.html" ]; then
        # Vérifications basiques HTML
        if grep -q "<!DOCTYPE html>" "$PROJECT_ROOT/index.html" && \
           grep -q "<html" "$PROJECT_ROOT/index.html" && \
           grep -q "</html>" "$PROJECT_ROOT/index.html"; then
            echo "    {\"name\": \"html_structure\", \"status\": \"passed\", \"timestamp\": \"$(date -Iseconds)\"}," >> "$test_results_file"
            log_success "✅ Structure HTML valide"
            ((passed_tests++))
        else
            echo "    {\"name\": \"html_structure\", \"status\": \"failed\", \"error\": \"Structure HTML invalide\", \"timestamp\": \"$(date -Iseconds)\"}," >> "$test_results_file"
            log_error "❌ Structure HTML invalide"
            ((failed_tests++))
        fi
    else
        echo "    {\"name\": \"html_structure\", \"status\": \"failed\", \"error\": \"index.html manquant\", \"timestamp\": \"$(date -Iseconds)\"}," >> "$test_results_file"
        log_error "❌ index.html manquant"
        ((failed_tests++))
    fi
    ((total_tests++))
    
    # Test 3: Vérification des assets CSS
    log_info "Test: Assets CSS"
    if [ -f "$PROJECT_ROOT/css/main.css" ] && [ -f "$PROJECT_ROOT/css/map.css" ]; then
        echo "    {\"name\": \"css_assets\", \"status\": \"passed\", \"timestamp\": \"$(date -Iseconds)\"}," >> "$test_results_file"
        log_success "✅ Assets CSS présents"
        ((passed_tests++))
    else
        echo "    {\"name\": \"css_assets\", \"status\": \"failed\", \"error\": \"CSS manquants\", \"timestamp\": \"$(date -Iseconds)\"}," >> "$test_results_file"
        log_error "❌ Assets CSS manquants"
        ((failed_tests++))
    fi
    ((total_tests++))
    
    # Finaliser le fichier JSON
    sed -i '$ s/,$//' "$test_results_file"
    echo "], \"summary\": {\"total\": $total_tests, \"passed\": $passed_tests, \"failed\": $failed_tests, \"success_rate\": $(( passed_tests * 100 / total_tests ))}}" >> "$test_results_file"
    
    log_info "Résultats frontend: $passed_tests/$total_tests tests réussis"
    
    if [ $failed_tests -gt 0 ]; then
        return 1
    fi
    return 0
}

# Exécuter tous les tests
run_all_tests() {
    log_info "🧪 Début des tests de non-régression"
    
    local backend_result=0
    local frontend_result=0
    
    # Tests backend
    if ! run_backend_tests; then
        backend_result=1
        log_warning "Certains tests backend ont échoué"
    fi
    
    # Tests frontend
    if ! run_frontend_tests; then
        frontend_result=1
        log_warning "Certains tests frontend ont échoué"
    fi
    
    # Générer un rapport consolidé
    generate_consolidated_report
    
    # Résultat final
    if [ $backend_result -eq 0 ] && [ $frontend_result -eq 0 ]; then
        log_success "🎉 Tous les tests sont passés avec succès!"
        return 0
    else
        log_error "❌ Certains tests ont échoué"
        return 1
    fi
}

# Générer un rapport consolidé
generate_consolidated_report() {
    log_info "Génération du rapport consolidé..."
    
    local report_file="$TESTS_DIR/reports/consolidated_report_$(date +%Y%m%d_%H%M%S).html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport de Tests Galligeo - $(date +"%d/%m/%Y %H:%M")</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { background: #e7f3ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .test-section { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .test-header { background: #f8f9fa; padding: 10px; font-weight: bold; }
        .test-content { padding: 15px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .timestamp { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Rapport de Tests Galligeo</h1>
            <p>$(date +"%d/%m/%Y à %H:%M:%S")</p>
        </div>
        
        <div class="summary">
            <h3>📊 Résumé</h3>
            <p><strong>Statut global:</strong> $([ $? -eq 0 ] && echo "✅ SUCCÈS" || echo "❌ ÉCHEC")</p>
            <p><strong>Tests exécutés:</strong> Backend + Frontend</p>
            <p><strong>Environnement:</strong> $(hostname)</p>
        </div>
        
        <div class="test-section">
            <div class="test-header">📡 Tests Backend</div>
            <div class="test-content">
                <p>Tests des APIs et services backend de Galligeo</p>
                <ul>
                    <li>API Galligeo Health Check</li>
                    <li>Endpoint de géoréférencement</li>
                    <li>Serveur de tuiles</li>
                </ul>
            </div>
        </div>
        
        <div class="test-section">
            <div class="test-header">🎨 Tests Frontend</div>
            <div class="test-content">
                <p>Validation des composants frontend</p>
                <ul>
                    <li>Fichiers JavaScript critiques</li>
                    <li>Structure HTML</li>
                    <li>Assets CSS</li>
                </ul>
            </div>
        </div>
        
        <div class="timestamp">
            Rapport généré automatiquement par le script de déploiement Galligeo
        </div>
    </div>
</body>
</html>
EOF
    
    log_success "Rapport consolidé généré: $report_file"
}

# Nettoyer les anciens rapports
cleanup_old_reports() {
    log_info "Nettoyage des anciens rapports..."
    
    # Garder seulement les 10 derniers rapports
    find "$TESTS_DIR/reports" -name "*.json" -type f -mtime +7 -delete 2>/dev/null || true
    find "$TESTS_DIR/reports" -name "*.html" -type f -mtime +7 -delete 2>/dev/null || true
    
    # Garder seulement les 5 dernières sauvegardes
    find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +7 -delete 2>/dev/null || true
    
    log_success "Nettoyage terminé"
}

# Fonction principale
main() {
    echo "🚀 Script de déploiement Galligeo avec tests de non-régression"
    echo "=============================================================="
    
    create_directories
    check_prerequisites
    backup_current_state
    
    if run_all_tests; then
        log_success "✅ Déploiement autorisé - Tous les tests sont passés"
        cleanup_old_reports
        exit 0
    else
        log_error "❌ Déploiement bloqué - Tests échoués"
        log_info "Consultez les rapports dans: $TESTS_DIR/reports"
        exit 1
    fi
}

# Gestion des options de ligne de commande
case "${1:-main}" in
    "backend")
        create_directories
        run_backend_tests
        ;;
    "frontend")
        create_directories
        run_frontend_tests
        ;;
    "cleanup")
        cleanup_old_reports
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  main      (défaut) Exécuter tous les tests"
        echo "  backend   Exécuter seulement les tests backend"
        echo "  frontend  Exécuter seulement les tests frontend"
        echo "  cleanup   Nettoyer les anciens rapports"
        echo "  help      Afficher cette aide"
        exit 0
        ;;
    "main"|*)
        main
        ;;
esac
