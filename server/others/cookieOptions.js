const config = require('./config');

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_EXPIRES_IN = '7d';

function getSessionCookieOptions() {
    const isSecure = config.cookieSecure;
    return {
        httpOnly: true,
        path: '/',
        maxAge: SESSION_MAX_AGE_MS,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax'
    };
}

function getClearSessionCookieOptions() {
    const options = getSessionCookieOptions();
    delete options.maxAge;
    return options;
}

module.exports = {
    SESSION_MAX_AGE_MS,
    SESSION_EXPIRES_IN,
    getSessionCookieOptions,
    getClearSessionCookieOptions
};
