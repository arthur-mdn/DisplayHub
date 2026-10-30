const crypto = require('crypto');

const SYSTEM_UPDATE_COMMANDS = new Set(['prepareSystemUpdate', 'systemUpdate', 'systemUpdateStatus']);

function signSystemUpdate(challenge, privateKeyPem = process.env.PI_SYSTEM_UPDATE_PRIVATE_KEY, now = Date.now()) {
    if (!privateKeyPem) throw new Error('Clé de mise à jour système absente sur le serveur');
    if (!challenge || !/^[a-f0-9]{64}$/.test(challenge.nonce || '') ||
        !Number.isSafeInteger(challenge.expiresAt) || challenge.expiresAt <= now + 1000) {
        throw new Error('Confirmation expirée ou invalide ; recommencez');
    }
    const key = crypto.createPrivateKey(privateKeyPem.replace(/\\n/g, '\n'));
    if (key.asymmetricKeyType !== 'ed25519') throw new Error('Une clé Ed25519 est requise');
    const payload = {
        action: 'system_update',
        nonce: challenge.nonce,
        issuedAt: now,
        expiresAt: Math.min(challenge.expiresAt, now + 60000)
    };
    return {
        payload,
        signature: crypto.sign(null, Buffer.from(JSON.stringify(payload)), key).toString('base64url')
    };
}

module.exports = {SYSTEM_UPDATE_COMMANDS, signSystemUpdate};
