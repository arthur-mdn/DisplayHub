const ALLOWED_EDITOR_PERMISSIONS = [
    'name',
    'featured_image',
    'logo',
    'icons',
    'meteo',
    'directions',
    'photos',
    'dark_mode',
    'text_slides',
    'allowed_users',
    'control',
    'avanced_settings'
];

function normalizeAssignableRole(role) {
    if (!role || role === 'user' || role === 'editor') {
        return 'editor';
    }
    return null;
}

function sanitizeAssignablePermissions(permissions) {
    if (!Array.isArray(permissions)) {
        return [];
    }
    return [...new Set(permissions.filter((permission) => ALLOWED_EDITOR_PERMISSIONS.includes(permission)))];
}

module.exports = {
    ALLOWED_EDITOR_PERMISSIONS,
    normalizeAssignableRole,
    sanitizeAssignablePermissions
};
