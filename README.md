# Galligeo

**Interface de géoréférencement pour cartes historiques avec intégration Gallica**

Galligeo est une application web développée par [Paris Time Machine](https://ptm.huma-num.fr/) qui permet de géoréférencer des cartes historiques issues de la bibliothèque numérique Gallica (BnF). L'outil offre une interface intuitive pour créer des points de contrôle et transformer des cartes anciennes en couches géographiques modernes utilisables dans des systèmes d'information géographique.

## 🎯 Contexte et objectifs

### Paris Time Machine
Paris Time Machine est un projet de recherche multidisciplinaire visant à reconstruire l'évolution spatio-temporelle de Paris depuis le XVIIIe siècle. L'objectif est de créer un système d'information géographique historique (SIGH) permettant aux chercheurs, institutions culturelles et au grand public d'explorer et d'analyser l'histoire urbaine parisienne.

### Partenariats
- **Bibliothèque nationale de France (BnF) / Datalab** : Accès aux collections numériques via Gallica
- **Huma-Num** : Infrastructure de recherche numérique pour les sciences humaines et sociales
- **CNRS** : Soutien scientifique et technique

### Galligeo dans l'écosystème PTM
Galligeo s'inscrit dans une chaîne de traitement géo-historique plus large :
1. **Acquisition** : Cartes historiques depuis Gallica
2. **Géoréférencement** : Transformation géographique (Galligeo)
3. **Stockage** : Dépôt sur Nakala pour pérennisation
4. **Visualisation** : Intégration dans les outils de cartographie PTM
5. **Analyse** : Exploitation dans les projets de recherche

## Fonctionnalités principales

### Géoréférencement interactif
- **Interface double carte** : Carte historique (source) et carte moderne (référence)
- **Création de points de contrôle** : Minimum 3 points pour la transformation géométrique
- **Algorithmes de transformation** : Polynomial, projective, spline
- **Prévisualisation en temps réel** : Vérification du résultat avant validation

### Intégration Gallica
- **Recherche par ARK** : Chargement direct depuis les identifiants Gallica
- **Métadonnées automatiques** : Récupération des informations descriptives
- **Support multi-format** : JPEG, WebP, PNG selon la qualité souhaitée
- **API IIIF** : Exploitation des standards d'interopérabilité des images

### Authentification et personnalisation
- **Connexion ORCID** : Authentification via l'identifiant chercheur
- **Sauvegarde cloud** : Synchronisation des paramètres utilisateur
- **Profils personnalisés** : Configuration persistante des préférences
- **Favoris Cartoquete** : Intégration avec l'application de collecte de cartes

### Export et diffusion
- **Dépôt Nakala** : Archivage pérenne des résultats
- **Formats multiples** : Tuiles web, GeoTIFF, métadonnées
- **Qualité configurable** : Résolution et compression ajustables
- **Partage public** : URLs de consultation des cartes géoréférencées

## Architecture technique

### Technologies frontend
- **HTML5/CSS3** : Interface responsive avec le Design System FR
- **JavaScript ES6+** : Logique métier côté client
- **Leaflet.js** : Bibliothèque cartographique interactive
- **Leaflet-draw** : Outils de dessin pour les points de contrôle
- **Leaflet-geosearch** : Géocodage et recherche géographique

### APIs et services
- **API PTM Auth** : Authentification et gestion des utilisateurs
- **API Gallica** : Accès aux images et métadonnées
- **API IIIF** : Standard pour les images patrimoniales
- **API Nakala** : Dépôt et archivage des données

### Infrastructure
- **Serveur de tuiles** : Generation et diffusion des cartes géoréférencées
- **Base de données PostgreSQL** : Stockage des paramètres utilisateur
- **Huma-Num** : Hébergement et distribution

## 🔧 Installation et développement

### Prérequis
- Node.js (version 16+)
- npm ou yarn
- Serveur web (Apache, Nginx, ou serveur de développement)

### Installation
```bash
# Cloner le dépôt
git clone https://github.com/paristimemachine/galligeo-front.git
cd galligeo-front

# Installer les dépendances
make install
# ou
npm install

# Générer la version
make version
```

### Développement
```bash
# Mode développement
make dev

# Serveur local (exemple avec Python)
python -m http.server 8000

# Accès : http://localhost:8000
```

### Build et déploiement
```bash
# Build complet
make build

# Déploiement (selon votre environnement)
./scripts/deploy.sh
```

## Configuration

### Variables d'environnement
Les URLs des APIs peuvent être configurées dans les fichiers JavaScript :
- `js/ptm-auth.js` : URL de l'API d'authentification PTM
- `js/front_interactions.js` : URL de l'API de géoréférencement
- `js/gallica_interactions.js` : URLs des services Gallica

### Paramètres utilisateur
Les paramètres sont configurables via `config/settings-form.json` :
- Algorithmes de transformation géométrique
- Méthodes de rééchantillonnage
- Qualité des images
- Options d'export

## Authentification

Galligeo utilise le système d'authentification PTM basé sur ORCID :
1. **Connexion** : Redirection vers le service ORCID
2. **Token JWT** : Récupération sécurisée de l'identité
3. **Profil** : Accès aux informations chercheur
4. **Synchronisation** : Sauvegarde cloud des préférences

## 📊 Workflow de géoréférencement

1. **Sélection de la carte** : ARK Gallica ou URL personnalisée
2. **Chargement** : Affichage de la carte historique et moderne
3. **Points de contrôle** : Placement de minimum 3 points correspondants
4. **Configuration** : Choix de l'algorithme et des paramètres
5. **Transformation** : Calcul de la géométrie de référencement
6. **Validation** : Prévisualisation du résultat
7. **Export** : Génération des tuiles et métadonnées
8. **Archivage** : Dépôt optionnel sur Nakala

## 🌐 APIs utilisées

### ORCID & PTM Auth
- **Authentification** : Gestion des sessions utilisateur
- **Profils** : Informations personnelles et institutionnelles
- **Paramètres** : Sauvegarde sur Huma-Num des informations de profils

### API Gallica (BnF)
- **Images** : Accès aux documents numérisés
- **Métadonnées** : Informations descriptives des documents
- **IIIF** : Standard d'interopérabilité des images

### API Nakala (Huma-Num)
- **Dépôt** : Archivage des cartes géoréférencées
- **Métadonnées** : Description standardisée
- **DOI** : Attribution d'identifiants pérennes

## Tests et qualité

### Tests d'intégration
- `test-api-integration.html` : Tests de l'API PTM Auth
- `test-cartoquete-favorites.html` : Tests des favoris Cartoquete
- `test-modal-integration.html` : Tests d'intégration modale

### Validation
- Validation des transformations géométriques
- Vérification de la qualité des métadonnées
- Tests de compatibilité navigateurs

## 📚 Documentation

- [`doc/API_INTEGRATION.md`](doc/API_INTEGRATION.md) : Intégration avec l'API PTM
- [`doc/AUTHENTICATION.md`](doc/AUTHENTICATION.md) : Système d'authentification
- [`doc/FORM_GENERATOR.md`](doc/FORM_GENERATOR.md) : Générateur de formulaires
- [`VERSION_SYSTEM.md`](VERSION_SYSTEM.md) : Système de versioning

## 🤝 Contribution

1. Fork du projet
2. Création d'une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit des changements (`git commit -m 'Add some AmazingFeature'`)
4. Push de la branche (`git push origin feature/AmazingFeature`)
5. Ouverture d'une Pull Request

## 📄 Licence

Ce projet est sous licence ###. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👥 Équipe

**Paris Time Machine Team**
- Direction scientifique : consortium Huma-Num Projets Time Machine
- Développement : Eric Mermet, Eric Grosso
- Partenaires : BnF, Huma-Num, CNRS

## 📞 Contact

- **Site web** : [https://ptm.huma-num.fr/](https://ptm.huma-num.fr/)
- **Galligeo** : [https://app.ptm.huma-num.fr/galligeo/](https://app.ptm.huma-num.fr/galligeo/)
- **Issues** : [GitHub Issues](https://github.com/paristimemachine/galligeo-front/issues)

---

*Galligeo est développé dans le cadre du consortium Huma-Num Projets Time Machine, soutenu par le CNRS et hébergé sur l'infrastructure Huma-Num.*
