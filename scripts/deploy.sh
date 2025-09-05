#!/bin/bash

# Script de déploiement pour Galligeo
# Configure l'environnement et génère la version automatiquement

set -e  # Arrêter en cas d'erreur

# Couleurs pour la sortie
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'aide
show_help() {
    echo -e "${BLUE}🚀 Script de déploiement Galligeo${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --env ENV        Définir l'environnement (development, production)"
    echo "  -v, --verbose        Mode verbeux"
    echo "  -h, --help          Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 --env production"
    echo "  $0 -e development -v"
}

# Variables par défaut
ENVIRONMENT="production"
VERBOSE=false

# Parser les arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Option inconnue: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Validation de l'environnement
if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}❌ Environnement invalide: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Les environnements supportés sont: development, production${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Déploiement Galligeo${NC}"
echo -e "📂 Répertoire: $(pwd)"
echo -e "🌍 Environnement: ${ENVIRONMENT}"
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [[ ! -f "package.json" ]] || [[ ! -d "scripts" ]]; then
    echo -e "${RED}❌ Erreur: Ce script doit être exécuté depuis la racine du projet Galligeo${NC}"
    exit 1
fi

# Fonction de log verbeux
log_verbose() {
    if [[ "$VERBOSE" == true ]]; then
        echo -e "${YELLOW}🔍 $1${NC}"
    fi
}

# Définir la variable d'environnement
export NODE_ENV="$ENVIRONMENT"
log_verbose "Variable NODE_ENV définie sur: $NODE_ENV"

# Vérifier que Node.js est disponible
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js non trouvé. Veuillez installer Node.js.${NC}"
    exit 1
fi

log_verbose "Version Node.js: $(node --version)"

# Installer les dépendances si nécessaire
if [[ ! -d "node_modules" ]]; then
    echo -e "${YELLOW}📥 Installation des dépendances...${NC}"
    npm install
else
    log_verbose "Dépendances déjà installées"
fi

# Générer les informations de version
echo -e "${YELLOW}🔧 Génération des informations de version...${NC}"
npm run build-version

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ Version générée avec succès${NC}"
else
    echo -e "${RED}❌ Erreur lors de la génération de version${NC}"
    exit 1
fi

# Afficher les informations de version
echo ""
echo -e "${BLUE}📦 Version déployée:${NC}"
npm run version-info

# Message de fin
echo ""
echo -e "${GREEN}✨ Déploiement terminé avec succès !${NC}"

# Instructions supplémentaires selon l'environnement
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo ""
    echo -e "${BLUE}📋 Instructions pour la production:${NC}"
    echo -e "  • Vérifiez que les fichiers version.json et js/version.js sont bien générés"
    echo -e "  • La version sera affichée discrètement dans le footer de l'application"
    echo -e "  • Double-cliquez sur la version dans le footer pour voir les détails"
elif [[ "$ENVIRONMENT" == "development" ]]; then
    echo ""
    echo -e "${BLUE}📋 Instructions pour le développement:${NC}"
    echo -e "  • Les informations de version s'afficheront automatiquement dans la console"
    echo -e "  • Utilisez 'make version-info' pour voir les détails de version"
    echo -e "  • Les hooks Git mettront automatiquement à jour la version à chaque commit"
fi
