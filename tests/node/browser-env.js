/**
 * Environnement navigateur minimal pour exécuter en Node.js les scripts front
 * de Galligeo (ptm-auth.js, anonymous-user-manager.js, ...) sans dépendance
 * externe (pas de jsdom). Suffisant pour tester la logique d'attribution
 * utilisateur, indépendamment du rendu DOM.
 */
const fs = require('fs');
const vm = require('vm');
const nodeCrypto = require('crypto');

function createLocalStorage(initial = {}) {
    const store = new Map(Object.entries(initial));
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => store.set(key, String(value)),
        removeItem: (key) => store.delete(key),
        clear: () => store.clear(),
        _store: store
    };
}

function createDocumentStub() {
    const listeners = {};
    const fakeElement = () => ({
        style: {},
        classList: { add() {}, remove() {}, contains: () => false },
        dataset: {},
        addEventListener() {},
        removeEventListener() {},
        appendChild() {},
        insertBefore() {},
        remove() {},
        parentNode: null
    });

    return {
        addEventListener(type, handler) {
            (listeners[type] = listeners[type] || []).push(handler);
        },
        removeEventListener() {},
        getElementById() { return null; },
        querySelector() { return null; },
        createElement: fakeElement,
        body: fakeElement(),
        _listeners: listeners
    };
}

/**
 * Charge un fichier JS "navigateur" dans un contexte vm isolé.
 * @param {string} filePath - chemin absolu du script à charger
 * @param {object} options
 * @param {object} [options.localStorage] - instance créée par createLocalStorage()
 * @param {object} [options.window] - objet window pré-rempli (ex: window.ptmAuth mocké)
 * @param {function} [options.fetch] - implémentation mock de fetch
 * @param {string} [options.href] - URL courante simulée
 */
function loadBrowserScript(filePath, options = {}) {
    const localStorage = options.localStorage || createLocalStorage();
    const document = options.document || createDocumentStub();
    const location = {
        href: options.href || 'https://ptm.huma-num.fr/galligeo/',
        hash: options.hash || '',
        search: options.search || '',
        pathname: options.pathname || '/galligeo/'
    };

    const window = Object.assign(
        { location, history: { replaceState() {} }, addEventListener() {}, removeEventListener() {} },
        options.window || {}
    );

    const context = {
        window,
        document,
        localStorage,
        console,
        fetch: options.fetch || (async () => { throw new Error('fetch non mocké dans ce test'); }),
        crypto: { randomUUID: () => nodeCrypto.randomUUID() },
        atob: (b64) => Buffer.from(b64, 'base64').toString('binary'),
        btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
        URLSearchParams,
        AbortController,
        setTimeout,
        clearTimeout,
        Date,
        Math,
        JSON,
        Promise
    };

    vm.createContext(context);
    const source = fs.readFileSync(filePath, 'utf8');
    vm.runInContext(source, context, { filename: filePath });

    return context;
}

/** Construit un faux JWT (non signé, suffisant pour les tests du payload). */
function makeFakeJwt(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `${header}.${body}.signature`;
}

module.exports = { loadBrowserScript, createLocalStorage, createDocumentStub, makeFakeJwt };
