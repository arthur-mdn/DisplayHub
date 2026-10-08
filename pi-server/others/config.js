if (!process.env.PI_API_TOKEN) {
    throw new Error('Missing required environment variable: PI_API_TOKEN');
}

module.exports = {
    port: process.env.PORT || process.env.PI_SERVER_PORT || 3002,
    clientUrl: process.env.CLIENT_URL || process.env.VITE_SCHEME + '://' + process.env.VITE_CLIENT_URL,
    apiToken: process.env.PI_API_TOKEN
};
