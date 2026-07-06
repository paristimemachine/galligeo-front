/**
 * Tests pour l'affichage, dans l'interface d'admin, de contributeurs
 * anonymes distincts (chacun avec son propre identifiant technique) au lieu
 * d'un unique libellé générique indifférencié.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { loadBrowserScript, createDocumentStub } = require('./browser-env');

const ADMIN_JS_PATH = path.join(__dirname, '..', '..', 'admin', 'js', 'admin.js');

function loadAdmin() {
    return loadBrowserScript(ADMIN_JS_PATH, { document: createDocumentStub() });
}

test('formatUserName distingue deux contributeurs anonymes différents', () => {
    const ctx = loadAdmin();

    const userA = { orcid_id: 'anon-3f2a1c9e-45b6-4d21-9c3a-1234567890ab' };
    const userB = { orcid_id: 'anon-9b7e0d11-8888-4444-aaaa-abcdefabcdef' };

    const labelA = ctx.formatUserName(userA);
    const labelB = ctx.formatUserName(userB);

    assert.notEqual(labelA, labelB, 'deux anonymes différents ne doivent pas porter le même libellé');
    assert.match(labelA, /Anonyme/);
    assert.match(labelA, /3f2a1c9e/, 'le libellé doit contenir un fragment de l\'identifiant pour le distinguer');
    assert.match(labelB, /9b7e0d11/);
});

test('formatUserName signale distinctement l\'ancien compte anonyme partagé (bug historique)', () => {
    const ctx = loadAdmin();
    const legacyUser = { orcid_id: '0000-GALLI-ANONY-ME00' };

    const label = ctx.formatUserName(legacyUser);

    assert.match(label, /Anonyme/);
    assert.match(label, /partagé/i);
});

test('formatUserName conserve le nom réel pour un utilisateur ORCID authentifié', () => {
    const ctx = loadAdmin();
    const realUser = { given_name: 'Eric', family_name: 'Mermet', orcid_id: '0000-0001-9186-0492' };

    assert.equal(ctx.formatUserName(realUser), 'Eric Mermet');
});

test('renderOrcidCell ne crée pas de lien orcid.org trompeur pour un id anonyme', () => {
    const ctx = loadAdmin();

    const anonCell = ctx.renderOrcidCell('anon-3f2a1c9e-45b6-4d21-9c3a-1234567890ab');
    const realCell = ctx.renderOrcidCell('0000-0001-9186-0492');

    assert.ok(!anonCell.includes('orcid.org'), 'un identifiant anonyme ne doit jamais pointer vers orcid.org');
    assert.ok(realCell.includes('https://orcid.org/0000-0001-9186-0492'), 'un vrai ORCID garde son lien cliquable');
});

test('isAnonymousOrcid reconnaît le nouveau format par appareil et l\'ancien format partagé', () => {
    const ctx = loadAdmin();

    assert.equal(ctx.isAnonymousOrcid('anon-xxxx'), true);
    assert.equal(ctx.isAnonymousOrcid('0000-GALLI-ANONY-ME00'), true);
    assert.equal(ctx.isAnonymousOrcid('0000-0001-9186-0492'), false);
    assert.equal(ctx.isAnonymousOrcid(''), false);
});
