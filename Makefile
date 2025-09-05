# Makefile pour Galligeo
# Commandes utiles pour le développement et le déploiement

.PHONY: help version version-info build clean install dev

# Afficher l'aide
help:
	@echo "🛠️  Galligeo - Commandes disponibles"
	@echo "════════════════════════════════════"
	@echo "  make version      - Générer les fichiers de version"
	@echo "  make version-info - Afficher les informations de version"
	@echo "  make build        - Build complet (version + autres)"
	@echo "  make dev          - Mode développement"
	@echo "  make install      - Installer les dépendances"
	@echo "  make clean        - Nettoyer les fichiers générés"
	@echo "  make help         - Afficher cette aide"

# Générer la version
version:
	@echo "🔧 Génération de la version..."
	npm run build-version

# Afficher les informations de version
version-info:
	@echo "📦 Informations de version actuelles :"
	npm run version-info

# Build complet
build: version
	@echo "✅ Build terminé"

# Mode développement
dev: version
	@echo "🚀 Mode développement prêt"

# Installer les dépendances
install:
	@echo "📥 Installation des dépendances..."
	npm install

# Nettoyer
clean:
	@echo "🧹 Nettoyage des fichiers générés..."
	@rm -f version.json js/version.js
	@echo "✅ Nettoyage terminé"

# Par défaut, afficher l'aide
default: help
