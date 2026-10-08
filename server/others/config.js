const required = ['SECRET_KEY', 'DB_URI'];

for (const key of required) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

const scheme = process.env.VITE_SCHEME || 'http';
const cookieSecure = process.env.COOKIE_SECURE === 'true' || scheme === 'https';

module.exports = {
    dbUri: process.env.DB_URI,
    port: process.env.VITE_SERVER_PORT,
    clientUrl: scheme + '://' + process.env.VITE_CLIENT_URL,
    adminUrl: scheme + '://' + process.env.VITE_ADMIN_URL,
    secretKey: process.env.SECRET_KEY,
    openWeatherApiKey: process.env.OPEN_WEATHER_API_KEY,
    cookieSecure
};
