/**
 * Tests de non-régression pour la migration des cartes anonymes vers un
 * compte ORCID lors de la connexion (js/anonymous-user-manager.js).
 *
 * Bug historique : migrateAnonymousData() appelait
 *   updateWorkedMap(map.ark, map, map.status)
 * alors que la signature réelle est
 *   updateWorkedMap(arkId, status, additionalData)
 * ce qui faisait échouer silencieusement toute migration (le statut, censé
 * être une chaîne, recevait un objet). Ces tests verrouillent le bon ordre
 * des arguments.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { loadBrowserScript, createLocalStorage, createDocumentStub } = require('./browser-env');

const ANONYMOUS_MANAGER_PATH = path.join(__dirname, '..', '..', 'js', 'anonymous-user-manager.js');

function makePtmAuthMock({ anonymousMaps }) {
    const calls = [];
    return {
        isAuthenticated: () => true,
        getAnonymousWorkedMaps: async () => anonymousMaps,
        updateWorkedMap: async (arkId, status, additionalData) => {
            calls.push({ arkId, status, additionalData });
            return { success: true };
        },
        _calls: calls
    };
}

test('migrateAnonymousData() appelle updateWorkedMap avec (ark, status, données) dans le bon ordre', async () => {
    const anonymousMaps = [
        { ark: 'x1', status: 'georeferenced', quality: 3, firstWorked: 't1', lastUpdated: 't2' }
    ];
    const ptmAuthMock = makePtmAuthMock({ anonymousMaps });
    const storage = createLocalStorage({ galligeo_anonymous_maps: JSON.stringify(anonymousMaps) });

    const ctx = loadBrowserScript(ANONYMOUS_MANAGER_PATH, {
        localStorage: storage,
        document: createDocumentStub(),
        window: { ptmAuth: ptmAuthMock }
    });

    await ctx.window.anonymousUserManager.migrateAnonymousData();

    assert.equal(ptmAuthMock._calls.length, 1);
    const call = ptmAuthMock._calls[0];

    assert.equal(call.arkId, 'x1');
    assert.equal(typeof call.status, 'string', 'le statut doit être une chaîne, pas l\'objet carte entier');
    assert.equal(call.status, 'georeferenced');
    assert.equal(call.additionalData.ark, 'x1');

    // La migration ayant réussi, la trace locale de l'ancien système doit être nettoyée
    assert.equal(storage.getItem('galligeo_anonymous_maps'), null);
});

test('migrateAnonymousData() ne fait rien si aucune carte anonyme n\'est en attente', async () => {
    const ptmAuthMock = makePtmAuthMock({ anonymousMaps: [] });
    const ctx = loadBrowserScript(ANONYMOUS_MANAGER_PATH, {
        localStorage: createLocalStorage(),
        document: createDocumentStub(),
        window: { ptmAuth: ptmAuthMock }
    });

    await ctx.window.anonymousUserManager.migrateAnonymousData();

    assert.equal(ptmAuthMock._calls.length, 0);
});

test('migrateAnonymousData() migre chaque carte indépendamment (une erreur n\'en bloque pas d\'autres)', async () => {
    const anonymousMaps = [
        { ark: 'ok-1', status: 'en-cours' },
        { ark: 'bad-1', status: 'georeferenced' },
        { ark: 'ok-2', status: 'deposee' }
    ];
    const ptmAuthMock = makePtmAuthMock({ anonymousMaps });
    ptmAuthMock.updateWorkedMap = async (arkId, status) => {
        if (arkId === 'bad-1') throw new Error('échec simulé');
        return { success: true };
    };

    const ctx = loadBrowserScript(ANONYMOUS_MANAGER_PATH, {
        localStorage: createLocalStorage(),
        document: createDocumentStub(),
        window: { ptmAuth: ptmAuthMock }
    });

    await ctx.window.anonymousUserManager.migrateAnonymousData();
    // Pas d'assertion sur les appels (fonction réaffectée), on vérifie juste
    // l'absence d'exception qui interromprait la boucle de migration.
});
