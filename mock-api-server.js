/**
 * Mock API Server pour les cartes géoréférencées
 * Serveur simple pour tester la fonctionnalité en attendant l'API complète
 */

const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Données d'exemple étendues
const mockGeoreferencedMaps = [
    {
        ark: 'btv1b53121232b',
        title: 'Paris en 1944 - Girard et Barrère',
        creator: 'Girard et Barrère',
        date: '1944',
        period: '20e',
        georeferenced_by: 'Marie Dubois',
        georeferenced_date: '2024-09-15T10:30:00Z',
        description: 'Plan de Paris pendant la Seconde Guerre mondiale',
        status: 'georeferenced'
    },
    {
        ark: 'btv1b532480876',
        title: 'Carte des fils télégraphiques de France',
        creator: 'Administration des Postes et Télégraphes',
        date: '1889',
        period: '19e',
        georeferenced_by: 'Jean Cartographe',
        georeferenced_date: '2024-09-10T14:20:00Z',
        description: 'Réseau télégraphique français à la fin du XIXe siècle',
        status: 'georeferenced'
    },
    {
        ark: 'btv1b8441346h',
        title: 'Plan de la ville d\'Amiens',
        creator: 'Cartographe Municipal',
        date: '1848',
        period: '19e',
        georeferenced_by: 'Sophie Martin',
        georeferenced_date: '2024-09-05T09:15:00Z',
        description: 'Plan détaillé d\'Amiens au milieu du XIXe siècle',
        status: 'georeferenced'
    },
    {
        ark: 'btv1b55005834k',
        title: 'Plan de Lyon',
        creator: 'Géomètre Municipal',
        date: '1872',
        period: '19e',
        georeferenced_by: 'Pierre Historien',
        georeferenced_date: '2024-08-28T16:45:00Z',
        description: 'Plan cadastral de Lyon en 1872',
        status: 'georeferenced'
    },
    {
        ark: 'btv1b531452899',
        title: 'Carte du Royaume de France',
        creator: 'Nicolas Sanson',
        date: '1652',
        period: 'moderne',
        georeferenced_by: 'Anne Géographe',
        georeferenced_date: '2024-08-20T11:15:00Z',
        description: 'Carte générale du royaume de France au XVIIe siècle',
        status: 'georeferenced'
    },
    {
        ark: 'btv1b53047456r',
        title: 'Plan de Marseille',
        creator: 'Ingénieur des Ports',
        date: '1750',
        period: 'moderne',
        georeferenced_by: 'Marc Provence',
        georeferenced_date: '2024-08-15T13:30:00Z',
        description: 'Plan du port et de la ville de Marseille',
        status: 'georeferenced'
    },
    {
        ark: 'btv1b84513960',
        title: 'Carte de l\'Île-de-France',
        creator: 'Jean-Baptiste Bourguignon d\'Anville',
        date: '1740',
        period: 'moderne',
        georeferenced_by: 'Julie Région',
        georeferenced_date: '2024-08-10T10:00:00Z',
        description: 'Carte détaillée de la région parisienne',
        status: 'georeferenced'
    },
    {
        ark: 'btv1b53100234m',
        title: 'Plan de Bordeaux',
        creator: 'Architecte Voyer',
        date: '1785',
        period: 'moderne',
        georeferenced_by: 'Vincent Aquitaine',
        georeferenced_date: '2024-08-05T15:20:00Z',
        description: 'Plan de la ville de Bordeaux avec ses extensions',
        status: 'georeferenced'
    },
    {
        ark: 'btv1b530875432',
        title: 'Carte de Normandie',
        creator: 'Pierre Mortier',
        date: '1550',
        period: 'renaissance',
        georeferenced_by: 'Émilie Normandie',
        georeferenced_date: '2024-07-30T12:45:00Z',
        description: 'Première carte détaillée de la Normandie',
        status: 'georeferenced'
    },
    {
        ark: 'btv1b531087654',
        title: 'Plan de Versailles',
        creator: 'Premier Architecte du Roi',
        date: '1685',
        period: 'moderne',
        georeferenced_by: 'Thomas Royal',
        georeferenced_date: '2024-07-25T14:10:00Z',
        description: 'Plan du château et de la ville de Versailles',
        status: 'georeferenced'
    },
    {
        ark: 'btv1b53098765q',
        title: 'Carte de la Bretagne',
        creator: 'Nicolas Tassin',
        date: '1630',
        period: 'moderne',
        georeferenced_by: 'Françoise Bretagne',
        georeferenced_date: '2024-07-20T09:30:00Z',
        description: 'Carte générale de la Bretagne',
        status: 'georeferenced'
    },
    {
        ark: 'btv1b55023456z',
        title: 'Plan de Toulouse',
        creator: 'Ingénieur du Languedoc',
        date: '1760',
        period: 'moderne',
        georeferenced_by: 'Lucien Occitanie',
        georeferenced_date: '2024-07-15T16:15:00Z',
        description: 'Plan de la ville rose au XVIIIe siècle',
        status: 'georeferenced'
    }
];

// Route pour récupérer toutes les cartes géoréférencées
app.get('/public/galligeo/georeferenced-maps', (req, res) => {
    console.log('Requête pour les cartes géoréférencées reçue');
    
    // Simulation d'un délai réseau
    setTimeout(() => {
        res.json({
            maps: mockGeoreferencedMaps,
            total: mockGeoreferencedMaps.length,
            timestamp: new Date().toISOString()
        });
    }, 500); // 500ms de délai
});

// Route pour les statistiques
app.get('/public/galligeo/georeferenced-stats', (req, res) => {
    console.log('Requête pour les statistiques reçue');
    
    const stats = {
        totalMaps: mockGeoreferencedMaps.length,
        uniqueContributors: new Set(mockGeoreferencedMaps.map(m => m.georeferenced_by)).size,
        recentMaps: mockGeoreferencedMaps.filter(m => {
            const date = new Date(m.georeferenced_date);
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).length,
        byPeriod: {
            'moyen-age': mockGeoreferencedMaps.filter(m => m.period === 'moyen-age').length,
            'renaissance': mockGeoreferencedMaps.filter(m => m.period === 'renaissance').length,
            'moderne': mockGeoreferencedMaps.filter(m => m.period === 'moderne').length,
            '19e': mockGeoreferencedMaps.filter(m => m.period === '19e').length,
            '20e': mockGeoreferencedMaps.filter(m => m.period === '20e').length
        }
    };
    
    res.json(stats);
});

// Route de test
app.get('/test', (req, res) => {
    res.json({ 
        message: 'Mock API Server pour Galligeo - Cartes géoréférencées',
        status: 'running',
        timestamp: new Date().toISOString(),
        availableEndpoints: [
            'GET /public/galligeo/georeferenced-maps',
            'GET /public/galligeo/georeferenced-stats',
            'GET /test'
        ]
    });
});

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint non trouvé',
        availableEndpoints: [
            'GET /public/galligeo/georeferenced-maps',
            'GET /public/galligeo/georeferenced-stats',
            'GET /test'
        ]
    });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Mock API Server démarré sur le port ${PORT}`);
    console.log(`📍 Endpoints disponibles :`);
    console.log(`   - GET http://localhost:${PORT}/public/galligeo/georeferenced-maps`);
    console.log(`   - GET http://localhost:${PORT}/public/galligeo/georeferenced-stats`);
    console.log(`   - GET http://localhost:${PORT}/test`);
    console.log(`\n💡 Pour tester : curl http://localhost:${PORT}/test`);
});

module.exports = app;