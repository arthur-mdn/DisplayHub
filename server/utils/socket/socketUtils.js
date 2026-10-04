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

const associateScreenSocket = (screenId, socketId) => {
    socketMap[socketId] = {screenId, added: Date.now()};
};

const associateSocketDebug = (socketId, debugScreen) => {
    socketMap[socketId] = {screenId: debugScreen._id, debugScreen, added: Date.now()};
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

const getSocketId = (lookingForThisScreenId) => {
    for (const socketId in socketMap) {
        if (socketMap[socketId].screenId === lookingForThisScreenId) {
            return socketId;
        }
    }
    return null;
};

const getScreenId = (lookingForThisSocketId) => {
    if (!socketMap[lookingForThisSocketId]) {
        return [null, null];
    }
    const screenId = socketMap[lookingForThisSocketId].screenId ?? null;
    const debugScreen = socketMap[lookingForThisSocketId].debugScreen ?? null;
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

    if (debugScreen) {
        return {socketId, debugScreen: sanitizeScreen(debugScreen), added: socketMap[socketId].added};
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
    emitScreenDeletion,
    getScreenSocketMap,
    getSocketList,
    getSocketDetails,
    getSocketIdWithThisAssociationCode,
    associateAdminSocket,
    getAdminSocketId,
    getAdminId,
    removeAdminSocketId,
    getAdminSocketList,
    emitToAllAdmins,
    emitSocketListToAllAdmins,
    getSocketObject,
    emitMessageToSocket
};
