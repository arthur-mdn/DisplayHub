const config = {
    clientUrl: import.meta.env.VITE_SCHEME + '://' + import.meta.env.VITE_CLIENT_URL,
    serverUrl: import.meta.env.VITE_SCHEME + '://' + import.meta.env.VITE_SERVER_URL,
    adminUrl: import.meta.env.VITE_SCHEME + '://' + import.meta.env.VITE_ADMIN_URL,
    cookieDomain: import.meta.env.VITE_COOKIE_DOMAIN,
    adminPort: import.meta.env.VITE_ADMIN_PORT
};

export default config;