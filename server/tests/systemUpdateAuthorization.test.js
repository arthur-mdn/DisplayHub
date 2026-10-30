const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {signSystemUpdate} = require('../others/systemUpdateAuthorization');

test('server signs a short-lived fixed-purpose authorization, not remote command arguments', () => {
    const {privateKey, publicKey} = crypto.generateKeyPairSync('ed25519');
    const pem = privateKey.export({type: 'pkcs8', format: 'pem'});
    const now = 1800000000000;
    const token = signSystemUpdate({nonce: 'a'.repeat(64), expiresAt: now + 90000, command: 'arbitrary'}, pem, now);
    assert.deepEqual(token.payload, {action: 'system_update', nonce: 'a'.repeat(64), issuedAt: now, expiresAt: now + 60000});
    assert(crypto.verify(null, Buffer.from(JSON.stringify(token.payload)), publicKey, Buffer.from(token.signature, 'base64url')));
});

test('missing key, stale challenge and malformed nonce are rejected', () => {
    assert.throws(() => signSystemUpdate({nonce: 'a'.repeat(64), expiresAt: Date.now() + 90000}, ''));
    assert.throws(() => signSystemUpdate({nonce: '$(reboot)', expiresAt: Date.now() + 90000}, 'invalid'));
    assert.throws(() => signSystemUpdate({nonce: 'a'.repeat(64), expiresAt: 1}, 'invalid'));
});
