/**
 * Tests de non-régression sur l'attribution utilisateur du géoréférencement.
 *
 * Contexte : plusieurs bugs ont causé un mélange des contributions de
 * personnes différentes (cartes anonymes fusionnées sous une même identité,
 * migration de cartes anonymes vers le mauvais compte). Ces tests verrouillent
 * les comportements corrigés pour éviter une régression silencieuse.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { loadBrowserScript, createLocalStorage, makeFakeJwt } = require('./browser-env');

const PTM_AUTH_PATH = path.join(__dirname, '..', '..', 'js', 'ptm-auth.js');
const OLD_SHARED_ANONYMOUS_ID = '0000-GALLI-ANONY-ME00';

test('identifiant anonyme : ne réutilise plus la constante partagée historique', () => {
    const ctx = loadBrowserScript(PTM_AUTH_PATH);
    assert.notEqual(ctx.window.ptmAuth.anonymousUser, OLD_SHARED_ANONYMOUS_ID);
});

test('identifiant anonyme : reste stable après un "rechargement de page" (même appareil)', () => {
    const storage = createLocalStorage();

    const ctx1 = loadBrowserScript(PTM_AUTH_PATH, { localStorage: storage });
    const id1 = ctx1.window.ptmAuth.anonymousUser;

    // Simule un rechargement complet de page : nouveau contexte JS,
    // même localStorage physique (même navigateur/appareil).
    const ctx2 = loadBrowserScript(PTM_AUTH_PATH, { localStorage: storage });
    const id2 = ctx2.window.ptmAuth.anonymousUser;

    assert.equal(id1, id2, 'l\'identifiant anonyme doit être persisté en localStorage, pas régénéré à chaque chargement');
});

test('identifiant anonyme : deux appareils différents obtiennent des identités différentes', () => {
    const ctxA = loadBrowserScript(PTM_AUTH_PATH, { localStorage: createLocalStorage() });
    const ctxB = loadBrowserScript(PTM_AUTH_PATH, { localStorage: createLocalStorage() });

    assert.notEqual(
        ctxA.window.ptmAuth.anonymousUser,
        ctxB.window.ptmAuth.anonymousUser,
        'deux navigateurs distincts ne doivent jamais partager le même identifiant anonyme'
    );
});

test('getAnonymousWorkedMaps() renvoie les cartes en-cours/georeferenced/deposee (et non toujours [])', async () => {
    const storage = createLocalStorage({
        // Token anonyme déjà valide : pas besoin de mocker l'endpoint /anonymous-token
        anonymous_token: 'fake-anonymous-jwt',
        anonymous_token_expires: String(Date.now() + 60 * 60 * 1000)
    });

    const fetchCalls = [];
    const fetchMock = async (url, config) => {
        fetchCalls.push({ url, config });
        if (url.endsWith('/app/galligeo/data') && config.method === 'GET') {
            return {
                ok: true,
                json: async () => ({
                    rec_ark: [
                        { ark: 'a1', status: 'en-cours' },
                        { ark: 'a2', status: 'georeferenced' },
                        { ark: 'a3', status: 'deposee' },
                        { ark: 'a4', status: 'worked' } // ancienne valeur invalide, ne doit jamais matcher
                    ]
                })
            };
        }
        throw new Error(`Appel fetch non attendu dans ce test: ${url}`);
    };

    const ctx = loadBrowserScript(PTM_AUTH_PATH, { localStorage: storage, fetch: fetchMock });

    const workedMaps = await ctx.window.ptmAuth.getAnonymousWorkedMaps();

    assert.equal(workedMaps.length, 3, 'seules les 3 cartes à statut valide doivent être retournées');
    assert.deepEqual(workedMaps.map(m => m.ark).sort(), ['a1', 'a2', 'a3']);

    // Confirme que l'appel a bien utilisé le token JWT anonyme persistant par appareil
    const dataCall = fetchCalls.find(c => c.url.endsWith('/app/galligeo/data'));
    assert.equal(dataCall.config.headers['Authorization'], 'Bearer fake-anonymous-jwt');
});

test('saveMapStatus() met à jour une entrée existante sans écraser les autres cartes de l\'utilisateur', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const fakeToken = makeFakeJwt({ sub: 'user-1', orcid: '0000-0000-0000-0001', exp: futureExp });
    const storage = createLocalStorage({ ptm_auth_token: fakeToken });

    let savedBody = null;
    const fetchMock = async (url, config) => {
        if (url.endsWith('/app/galligeo/data') && config.method === 'GET') {
            return {
                ok: true,
                json: async () => ({
                    rec_ark: [
                        { ark: 'a1', status: 'en-cours', quality: 2 },
                        { ark: 'a2', status: 'georeferenced', quality: 3 }
                    ]
                })
            };
        }
        if (url.endsWith('/app/galligeo/data') && config.method === 'POST') {
            savedBody = JSON.parse(config.body);
            return { ok: true, json: async () => ({ success: true }) };
        }
        throw new Error(`Appel fetch non attendu: ${url} ${config.method}`);
    };

    const ctx = loadBrowserScript(PTM_AUTH_PATH, { localStorage: storage, fetch: fetchMock });

    await ctx.window.ptmAuth.saveMapStatus('a1', 'georeferenced', { quality: 4 });

    assert.ok(savedBody, 'la sauvegarde POST doit avoir été appelée');
    assert.equal(savedBody.rec_ark.length, 2, 'la carte a2 ne doit pas disparaître');

    const a1 = savedBody.rec_ark.find(m => m.ark === 'a1');
    const a2 = savedBody.rec_ark.find(m => m.ark === 'a2');
    assert.equal(a1.status, 'georeferenced');
    assert.equal(a1.quality, 4);
    assert.equal(a2.status, 'georeferenced', 'la carte a2, non concernée par cette mise à jour, doit rester inchangée');
    assert.equal(a2.quality, 3);
});
