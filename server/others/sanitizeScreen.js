function sanitizeUserEntry(entry) {
    if (!entry) return entry;
    const role = entry.role;
    const creation = entry.creation;
    const permissions = entry.permissions;
    const rawUser = entry.user;

    if (!rawUser || typeof rawUser !== 'object') {
        return {role, creation, permissions, user: rawUser};
    }

    return {
        role,
        creation,
        permissions,
        user: {
            _id: rawUser._id,
            email: rawUser.email,
            firstName: rawUser.firstName,
            lastName: rawUser.lastName
        }
    };
}

function sanitizeScreen(screen) {
    if (!screen) return screen;

    const screenObj = typeof screen.toObject === 'function' ? screen.toObject() : {...screen};

    delete screenObj.deviceTokenHash;
    delete screenObj.__v;

    if (Array.isArray(screenObj.users)) {
        screenObj.users = screenObj.users.map(sanitizeUserEntry);
    }

    return screenObj;
}

function processScreenObj(screen, currentUserId) {
    const screenObj = sanitizeScreen(screen);

    const user = (screen.users || []).find((u) => {
        const id = u.user?._id?.toString?.() || u.user?.toString?.();
        return id === currentUserId;
    });

    if (user && user.role === 'creator') {
        screenObj.permissions = ['creator'];
    } else {
        screenObj.permissions = user?.permissions || [];
    }

    screenObj.users = (screenObj.users || []).filter((u) => {
        const id = u.user?._id?.toString?.();
        return id !== currentUserId;
    });

    return screenObj;
}

module.exports = {sanitizeScreen, processScreenObj};
