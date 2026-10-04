const crypto = require('crypto');

function generateDeviceToken() {
    return crypto.randomBytes(32).toString('hex');
}

function hashDeviceToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function verifyDeviceToken(token, hash) {
    if (!token || !hash) return false;
    const tokenHash = hashDeviceToken(token);
    try {
        return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
    } catch {
        return false;
    }
}

module.exports = {generateDeviceToken, hashDeviceToken, verifyDeviceToken};
