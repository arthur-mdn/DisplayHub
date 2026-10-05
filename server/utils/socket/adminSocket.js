const {verify} = require('jsonwebtoken');
const Screen = require('../../models/Screen');
const User = require('../../models/User');
const socketUtils = require('./socketUtils');
const {checkUserPermissionsOfThisScreen, isUserSuperAdmin} = require('../../others/checkUserPermissions');
const {generateDeviceToken, hashDeviceToken} = require('../../others/deviceToken');
const config = require('../../others/config');

async function assertActiveSession(sessionToken, expectedUserId, expectedTokenVersion) {
    let decoded;
    try {
        decoded = verify(sessionToken, config.secretKey);
    } catch {
        return null;
    }

    if (!decoded?.userId || decoded.userId.toString() !== expectedUserId.toString()) {
        return null;
    }
    if ((decoded.tokenVersion ?? 0) !== expectedTokenVersion) {
        return null;
    }
    if (!decoded.exp || decoded.exp * 1000 <= Date.now()) {
        return null;
    }

    const user = await User.findById(expectedUserId).select('tokenVersion status userRole');
    if (!user) return null;
    if (user.status && ['disabled', 'pending', 'blocked'].includes(user.status)) {
        return null;
    }
    if ((user.tokenVersion || 0) !== expectedTokenVersion) {
        return null;
    }
    return user;
}

function safeHandler(handler) {
    return async (...args) => {
        try {
            await handler(...args);
        } catch (error) {
            console.error('Admin socket handler error:', error);
        }
    };
}

module.exports = (io, socket) => {
    const cookies = socket.handshake.headers.cookie || '';
    const sessionToken = cookies.split('; ').find(row => row.startsWith('session_token='))?.split('=')[1];

    if (!sessionToken) {
        console.log('Session token not found, disconnecting');
        socket.disconnect();
        return;
    }

    try {
        const decoded = verify(sessionToken, config.secretKey);
        const userId = decoded.userId;
        const tokenVersion = decoded.tokenVersion ?? 0;

        assertActiveSession(sessionToken, userId, tokenVersion).then((user) => {
            if (!user) {
                socket.disconnect();
                return;
            }

            console.log('Admin connected:', socket.id, userId);
            socketUtils.associateAdminSocket(userId, socket.id);

            const withValidSession = (handler) => safeHandler(async (...args) => {
                const activeUser = await assertActiveSession(sessionToken, userId, tokenVersion);
                if (!activeUser) {
                    socket.emit('session_revoked');
                    socket.disconnect(true);
                    return;
                }
                return handler(...args);
            });

            socket.on('admin_request_client_control', withValidSession(async (data) => {
                const {screenId, command, commandId, value} = data || {};
                const screen = await Screen.findById(screenId);
                const permissionGranted = await checkUserPermissionsOfThisScreen('control', screenId, userId);

                if (!permissionGranted) {
                    socket.emit('server_forward_client_response_to_admin', {commandId, error: 'Permission refusée'});
                    return;
                }

                if (screen) {
                    const socketId = socketUtils.getSocketId(screenId);
                    if (socketId) {
                        const screenSocket = io.sockets.sockets.get(socketId);
                        if (screenSocket) {
                            screenSocket.emit('server_send_control_to_client', {command, commandId, value});
                        } else {
                            socket.emit('server_forward_client_response_to_admin', {
                                commandId,
                                error: 'Écran non connecté'
                            });
                        }
                    } else {
                        socket.emit('server_forward_client_response_to_admin', {commandId, error: 'Écran non connecté'});
                    }
                } else {
                    socket.emit('server_forward_client_response_to_admin', {commandId, error: 'Écran non trouvé'});
                }
            }));

            socket.on('adminAskSocketList', withValidSession(async () => {
                if (!await isUserSuperAdmin(userId)) {
                    console.log('Unauthorized adminAskSocketList from', userId);
                    return;
                }
                const socketListArray = await socketUtils.getSocketList({includeAssociationCode: true});
                socket.emit('adminSocketList', socketListArray);
            }));

            socket.on('adminAskSocketDetails', withValidSession(async (payload) => {
                if (!await isUserSuperAdmin(userId)) {
                    console.log('Unauthorized adminAskSocketDetails from', userId);
                    return;
                }
                let socketDetails = false;
                if (typeof payload === 'string') {
                    socketDetails = await socketUtils.getSocketDetails(payload, {includeAssociationCode: true});
                } else if (payload?.screenId) {
                    socketDetails = await socketUtils.getSocketDetailsByScreenId(payload.screenId, {includeAssociationCode: true});
                } else if (payload?.socketId) {
                    socketDetails = await socketUtils.getSocketDetails(payload.socketId, {includeAssociationCode: true});
                }
                socket.emit('adminSocketDetails', socketDetails || {error: 'not_found'});
            }));

            socket.on('adminAskSocketRefresh', withValidSession(async (payload) => {
                if (!await isUserSuperAdmin(userId)) {
                    console.log('Unauthorized adminAskSocketRefresh from', userId);
                    return;
                }
                const targetSocketId = socketUtils.resolveLiveSocketId(payload);
                const screenSocket = targetSocketId ? io.sockets.sockets.get(targetSocketId) : null;
                if (screenSocket) {
                    screenSocket.emit('refresh');
                }
            }));

            socket.on('adminOrderToChangeScreenId', withValidSession(async (data) => {
                if (!await isUserSuperAdmin(userId)) {
                    console.log('Unauthorized adminOrderToChangeScreenId from', userId);
                    return;
                }
                const targetSocketId = socketUtils.resolveLiveSocketId(data);
                const targetSocket = targetSocketId ? io.sockets.sockets.get(targetSocketId) : null;
                if (!targetSocket) {
                    console.log('SocketId not found');
                    return;
                }
                const screen = await Screen.findById(data.newScreenId).select('+deviceTokenHash');
                if (!screen) {
                    console.log('Screen not found');
                    return;
                }

                const deviceToken = generateDeviceToken();
                screen.deviceTokenHash = hashDeviceToken(deviceToken);
                screen.deviceTokenIssuedAt = new Date();
                await screen.save();

                socketUtils.disconnectScreenSockets(screen._id, {
                    exceptSocketId: targetSocketId,
                    event: 'screen_deleted'
                });
                await Screen.findByIdAndUpdate(screen._id, {status: 'offline'});
                await socketUtils.emitScreenStatusToMembers(screen._id, 'offline');

                targetSocket.emit('adminChangeScreenId', {
                    _id: screen._id.toString(),
                    deviceToken
                });
                await socketUtils.emitSocketListToAllAdmins();
            }));

            socket.on('adminOrderToResetScreen', withValidSession(async (data) => {
                if (!await isUserSuperAdmin(userId)) {
                    console.log('Unauthorized adminOrderToResetScreen from', userId);
                    return;
                }
                const targetSocketId = socketUtils.resolveLiveSocketId(data);
                if (!targetSocketId || !socketUtils.isSocketConnected(targetSocketId)) {
                    console.log('SocketId not found');
                    return;
                }
                const targetSocket = io.sockets.sockets.get(targetSocketId);
                if (targetSocket) {
                    targetSocket.emit('screen_deleted');
                }
            }));

            socket.on('disconnect', safeHandler(async () => {
                console.log(`Admin disconnected: ${userId}`);
                socketUtils.removeAdminSocketId(socket.id);
            }));
        }).catch(() => {
            socket.disconnect();
        });
    } catch (err) {
        console.log('Invalid session token, disconnecting');
        socket.disconnect();
    }
};
