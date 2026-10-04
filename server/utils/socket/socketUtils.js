const Screen = require('../../models/Screen');
const User = require('../../models/User');
const {sanitizeScreen} = require('../../others/sanitizeScreen');

let io = null;
const socketMap = {};
const adminSocketMap = {};

const setIo = (newIo) => {
    io = newIo;
};

const emitConfigUpdate = (screenId, updatedScreen) => {
    const socketId = getSocketId(screenId);
    if (socketId && io.sockets.sockets.get(socketId)) {
        io.to(socketId).emit('config_updated', sanitizeScreen(updatedScreen));
    }
};

const emitScreenDeletion = (screenId) => {
    const socketId = getSocketId(screenId);
    if (socketId && io.sockets.sockets.get(socketId)) {
        io.to(socketId).emit('screen_deleted');
    }
};

const clearScreenSocketBindings = (screenId, exceptSocketId = null) => {
    const id = screenId?.toString?.() || screenId;
    for (const socketId of Object.keys(socketMap)) {
        if (exceptSocketId && socketId === exceptSocketId) continue;
        if (socketMap[socketId].screenId?.toString?.() === id || socketMap[socketId].screenId === id) {
            delete socketMap[socketId];
        }
    }
};

const associateScreenSocket = (screenId, socketId) => {
    clearScreenSocketBindings(screenId, socketId);
    socketMap[socketId] = {screenId: screenId.toString(), added: Date.now()};
};

const associateSocketDebug = (socketId, debugScreen) => {
    socketMap[socketId] = {
        debugOnly: true,
        debugScreen: {
            _id: debugScreen?._id,
            name: debugScreen?.name || 'debug'
        },
        added: Date.now()
    };
};

const associateSocketWaitingForConfiguration = (socketId, associationCode) => {
    socketMap[socketId] = {associationCode, added: Date.now()};
};

const associateAdminSocket = (adminId, socketId) => {
    adminSocketMap[socketId] = adminId.toString();
};

const getAdminSocketId = (adminId) => {
    for (const socketId in adminSocketMap) {
        if (adminSocketMap[socketId] === adminId.toString()) {
            return socketId;
        }
    }
    return null;
};

const getAdminSocketIdsForUser = (adminId) => {
    const ids = [];
    for (const socketId in adminSocketMap) {
        if (adminSocketMap[socketId] === adminId.toString()) {
            ids.push(socketId);
        }
    }
    return ids;
};

const getAdminId = (socketId) => {
    return adminSocketMap[socketId] ?? null;
};

const removeAdminSocketId = (socketId) => {
    if (adminSocketMap[socketId]) {
        const adminId = adminSocketMap[socketId];
        delete adminSocketMap[socketId];
        return adminId;
    }
    return null;
};

const disconnectAdminSocketsForUser = (adminId) => {
    if (!io) return;
    for (const socketId of getAdminSocketIdsForUser(adminId)) {
        const socket = io.sockets.sockets.get(socketId);
        delete adminSocketMap[socketId];
        if (socket) {
            socket.emit('session_revoked');
            socket.disconnect(true);
        }
    }
};

const getSocketId = (lookingForThisScreenId) => {
    const id = lookingForThisScreenId?.toString?.() || lookingForThisScreenId;
    for (const socketId in socketMap) {
        if (socketMap[socketId].debugOnly) continue;
        if (socketMap[socketId].screenId === id) {
            return socketId;
        }
    }
    return null;
};

const hasOtherSocketForScreen = (screenId, exceptSocketId) => {
    const id = screenId?.toString?.() || screenId;
    for (const socketId in socketMap) {
        if (socketId === exceptSocketId) continue;
        if (socketMap[socketId].debugOnly) continue;
        if (socketMap[socketId].screenId === id) {
            return true;
        }
    }
    return false;
};

const getScreenId = (lookingForThisSocketId) => {
    if (!socketMap[lookingForThisSocketId]) {
        return [null, null];
    }
    const entry = socketMap[lookingForThisSocketId];
    if (entry.debugOnly) {
        return [null, entry.debugScreen ?? null];
    }
    const screenId = entry.screenId ?? null;
    const debugScreen = entry.debugScreen ?? null;
    return [screenId, debugScreen];
};

const removeSocketId = (socketId) => {
    if (socketMap[socketId]) {
        const [screenId] = getScreenId(socketId);
        delete socketMap[socketId];
        return screenId;
    }
    return null;
};

const getScreenSocketMap = () => {
    return socketMap;
};

const isSocketConnected = (socketId) => {
    return Boolean(socketMap[socketId]);
};

const getSocketIdWithThisAssociationCode = (associationCode) => {
    for (const socketId in socketMap) {
        if (socketMap[socketId].associationCode === associationCode) {
            return socketId;
        }
    }
    return null;
};

async function getSocketDetails(socketId, {includeAssociationCode = true} = {}) {
    if (!socketMap[socketId]) {
        return false;
    }
    const [screenId, debugScreen] = getScreenId(socketId);

    if (socketMap[socketId].debugOnly || debugScreen) {
        return {socketId, debugScreen: sanitizeScreen(debugScreen), added: socketMap[socketId].added, debugOnly: true};
    }
    if (socketMap[socketId].associationCode) {
        const details = {socketId, added: socketMap[socketId].added, waiting: true};
        if (includeAssociationCode) {
            details.associationCode = socketMap[socketId].associationCode;
        }
        return details;
    }
    try {
        const screen = await Screen.findById(screenId)
            .populate('users.user', 'email firstName lastName')
            .select('-deviceTokenHash');
        return {socketId, screen: sanitizeScreen(screen), added: socketMap[socketId].added};
    } catch (error) {
        return {socketId, screen: {name: 'Écran inconnu', status: 'offline'}, added: socketMap[socketId].added};
    }
}

async function getSocketList({includeAssociationCode = true} = {}) {
    const socketList = getScreenSocketMap();
    const socketListArray = [];
    for (const socketId in socketList) {
        const socketDetails = await getSocketDetails(socketId, {includeAssociationCode});
        socketListArray.push(socketDetails);
    }
    return socketListArray;
}

async function getAdminSocketList() {
    return {...adminSocketMap};
}

async function getSuperAdminSocketIds() {
    const ids = [];
    for (const socketId of Object.keys(adminSocketMap)) {
        const userId = adminSocketMap[socketId];
        try {
            const user = await User.findById(userId).select('userRole');
            if (user && user.userRole === 'superadmin') {
                ids.push(socketId);
            }
        } catch (error) {
            console.error('Erreur superadmin check:', error);
        }
    }
    return ids;
}

async function emitToAllAdmins(message, data) {
    const adminSocketList = await getAdminSocketList();
    Object.keys(adminSocketList).forEach((socketId) => {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
            socket.emit(message, data);
        }
    });
}

async function emitScreenStatusToMembers(screenId, status) {
    try {
        const screen = await Screen.findById(screenId);
        if (!screen) return;
        for (const user of screen.users) {
            const userId = user.user?._id || user.user;
            for (const adminSocketId of getAdminSocketIdsForUser(userId)) {
                const adminSocket = io.sockets.sockets.get(adminSocketId);
                if (adminSocket) {
                    adminSocket.emit('screen_status', {screenId, status});
                }
            }
        }
    } catch (error) {
        console.error('Erreur emitScreenStatusToMembers:', error);
    }
}

async function emitSocketListToAllAdmins() {
    const socketListArray = await getSocketList({includeAssociationCode: true});
    const superAdminSocketIds = await getSuperAdminSocketIds();
    for (const socketId of superAdminSocketIds) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
            socket.emit('adminSocketList', socketListArray);
        }
    }
}

async function getSocketObject(socketId) {
    return io.sockets.sockets.get(socketId);
}

async function emitMessageToSocket(socketId, message, data) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
        socket.emit(message, data);
    }
}

module.exports = {
    setIo,
    emitConfigUpdate,
    associateScreenSocket,
    associateSocketDebug,
    associateSocketWaitingForConfiguration,
    isSocketConnected,
    removeSocketId,
    getScreenId,
    getSocketId,
    hasOtherSocketForScreen,
    emitScreenDeletion,
    getScreenSocketMap,
    getSocketList,
    getSocketDetails,
    getSocketIdWithThisAssociationCode,
    associateAdminSocket,
    getAdminSocketId,
    getAdminSocketIdsForUser,
    getAdminId,
    removeAdminSocketId,
    disconnectAdminSocketsForUser,
    getAdminSocketList,
    emitToAllAdmins,
    emitScreenStatusToMembers,
    emitSocketListToAllAdmins,
    getSocketObject,
    emitMessageToSocket
};
