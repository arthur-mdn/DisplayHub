const {getAllowedOrigins} = require('./allowedOrigins');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getRequestOrigin(req) {
    const origin = req.get('Origin');
    if (origin) return origin;

    const referer = req.get('Referer');
    if (!referer) return null;

    try {
        return new URL(referer).origin;
    } catch {
        return null;
    }
}

function requireTrustedOrigin(req, res, next) {
    if (!MUTATING_METHODS.has(req.method)) {
        return next();
    }

    const requestOrigin = getRequestOrigin(req);
    const allowedOrigins = getAllowedOrigins();

    if (!requestOrigin) {
        if (process.env.NODE_ENV !== 'production') {
            return next();
        }
        return res.status(403).json({error: 'Origin non autorisée'});
    }

    if (!allowedOrigins.includes(requestOrigin)) {
        return res.status(403).json({error: 'Origin non autorisée'});
    }

    return next();
}

module.exports = {requireTrustedOrigin};
