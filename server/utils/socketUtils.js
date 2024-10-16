// utils/socketUtils.js
let io = null;
const screenSocketMap = {};

const setIo = (newIo) => {
    io = newIo;
};

const emitConfigUpdate = (screenId, updatedScreen) => {
    const socketId = getSocketId(screenId);
    if (socketId && io.sockets.sockets.get(socketId)) {
        io.to(socketId).emit('config_updated', updatedScreen);
    }
};
const emitScreenDeletion = (screenId) => {
    const socketId = getSocketId(screenId);
    if (socketId && io.sockets.sockets.get(socketId)) {
        io.to(socketId).emit('screen_deleted');
    }
};

const associateScreenSocket = (screenId, socketId) => {
    screenSocketMap[screenId] = socketId;
};

const getSocketId = (screenId) => {
    return screenSocketMap[screenId];
};

const getScreenId = (socketId) => {
    for (const screenId in screenSocketMap) {
        if (screenSocketMap[screenId] === socketId) {
            return screenId;
        }
    }
    return null;
}

const removeSocketId = (socketId) => {
    for (const screenId in screenSocketMap) {
        if (screenSocketMap[screenId] === socketId) {
            delete screenSocketMap[screenId];
            return screenId;
        }
    }
    return null;
};


module.exports = { setIo, emitConfigUpdate, associateScreenSocket, removeSocketId, getScreenId, getSocketId, emitScreenDeletion };
