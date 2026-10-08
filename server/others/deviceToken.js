const crypto = require('crypto');

function generateDeviceToken() {
    return crypto.randomBytes(32).toString('hex');
}

function hashDeviceToken(token) {
    if (typeof token !== 'string' || !token) {
        throw new Error('Invalid device token');
    }
    return crypto.createHash('sha256').update(token).digest('hex');
}

function verifyDeviceToken(token, hash) {
    if (typeof token !== 'string' || !token || typeof hash !== 'string' || !hash) {
        return false;
    }
    try {
        const tokenHash = hashDeviceToken(token);
        return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
    } catch {
        return false;
    }
}

module.exports = {generateDeviceToken, hashDeviceToken, verifyDeviceToken};
