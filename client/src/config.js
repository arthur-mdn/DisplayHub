const config = {
    clientUrl: import.meta.env.VITE_SCHEME + '://' + import.meta.env.VITE_CLIENT_URL,
    serverUrl: import.meta.env.VITE_SCHEME + '://' + import.meta.env.VITE_SERVER_URL,
    adminUrl: import.meta.env.VITE_SCHEME + '://' + import.meta.env.VITE_ADMIN_URL,
    cookieDomain: import.meta.env.VITE_COOKIE_DOMAIN,
    clientPort: import.meta.env.VITE_CLIENT_PORT,
    piServerUrl: import.meta.env.VITE_PI_SERVER_URL || 'http://127.0.0.1:3002'
};

export default config;
