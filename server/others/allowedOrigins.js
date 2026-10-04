const config = require('./config');

function expandOrigin(origin) {
    if (!origin) return [];
    const variants = new Set([origin]);
    try {
        const url = new URL(origin);
        if (url.hostname === 'localhost') {
            variants.add(`${url.protocol}//127.0.0.1${url.port ? ':' + url.port : ''}`);
        }
        if (url.hostname === '127.0.0.1') {
            variants.add(`${url.protocol}//localhost${url.port ? ':' + url.port : ''}`);
        }
    } catch {
        // ignore invalid origin
    }
    return [...variants];
}

function getAllowedOrigins() {
    return [...new Set([
        ...expandOrigin(config.clientUrl),
        ...expandOrigin(config.adminUrl)
    ])];
}

function getClientOrigins() {
    return expandOrigin(config.clientUrl);
}

function getAdminOrigins() {
    return expandOrigin(config.adminUrl);
}

module.exports = {
    getAllowedOrigins,
    getClientOrigins,
    getAdminOrigins
};
