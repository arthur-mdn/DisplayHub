const {verify} = require('jsonwebtoken');
const Screen = require('../../models/Screen');
const User = require('../../models/User');
const socketUtils = require('./socketUtils');
const {checkUserPermissionsOfThisScreen, isUserSuperAdmin} = require('../../others/checkUserPermissions');
const {generateDeviceToken, hashDeviceToken} = require('../../others/deviceToken');
const config = require('../../others/config');

async function assertActiveSession(userId, tokenVersion) {
    const user = await User.findById(userId).select('tokenVersion status userRole');
    if (!user) return null;
    if (user.status && ['disabled', 'pending', 'blocked'].includes(user.status)) {
        return null;
    }
    if ((user.tokenVersion || 0) !== tokenVersion) {
        return null;
    }
    return user;
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

        assertActiveSession(userId, tokenVersion).then((user) => {
            if (!user) {
                socket.disconnect();
                return;
            }

            console.log('Admin connected:', socket.id, userId);
            socketUtils.associateAdminSocket(userId, socket.id);

            const withValidSession = (handler) => async (...args) => {
                const activeUser = await assertActiveSession(userId, tokenVersion);
                if (!activeUser) {
                    socket.emit('session_revoked');
                    socket.disconnect(true);
                    return;
                }
                return handler(...args);
            };

            socket.on('admin_request_client_control', withValidSession(async (data) => {
                const {screenId, command, commandId, value} = data;
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

            socket.on('adminAskSocketDetails', withValidSession(async (targetSocketId) => {
                if (!await isUserSuperAdmin(userId)) {
                    console.log('Unauthorized adminAskSocketDetails from', userId);
                    return;
                }
                const socketDetails = await socketUtils.getSocketDetails(targetSocketId, {includeAssociationCode: true});
                socket.emit('adminSocketDetails', socketDetails);
            }));

            socket.on('adminAskSocketRefresh', withValidSession(async (targetSocketId) => {
                if (!await isUserSuperAdmin(userId)) {
                    console.log('Unauthorized adminAskSocketRefresh from', userId);
                    return;
                }
                try {
                    const screenSocket = io.sockets.sockets.get(targetSocketId);
                    if (screenSocket) {
                        screenSocket.emit('refresh');
                    }
                } catch (error) {
                    console.error('Erreur lors du refresh de l\'écran:', error);
                }
            }));

            socket.on('adminOrderToChangeScreenId', withValidSession(async (data) => {
                if (!await isUserSuperAdmin(userId)) {
                    console.log('Unauthorized adminOrderToChangeScreenId from', userId);
                    return;
                }
                const targetSocket = io.sockets.sockets.get(data.socketId);
                if (!targetSocket) {
                    console.log('SocketId not found');
                    return;
                }
                try {
                    const screen = await Screen.findById(data.newScreenId).select('+deviceTokenHash');
                    if (!screen) {
                        console.log('Screen not found');
                        return;
                    }
                    const deviceToken = generateDeviceToken();
                    screen.deviceTokenHash = hashDeviceToken(deviceToken);
                    screen.deviceTokenIssuedAt = new Date();
                    await screen.save();

                    targetSocket.emit('adminChangeScreenId', {
                        _id: screen._id.toString(),
                        deviceToken
                    });
                } catch (error) {
                    console.log(error);
                }
            }));

            socket.on('adminOrderToResetScreen', withValidSession(async (data) => {
                if (!await isUserSuperAdmin(userId)) {
                    console.log('Unauthorized adminOrderToResetScreen from', userId);
                    return;
                }
                if (!socketUtils.isSocketConnected(data.socketId)) {
                    console.log('SocketId not found');
                    return;
                }
                const targetSocket = io.sockets.sockets.get(data.socketId);
                if (targetSocket) {
                    targetSocket.emit('screen_deleted');
                }
            }));

            socket.on('disconnect', async () => {
                console.log(`Admin disconnected: ${userId}`);
                socketUtils.removeAdminSocketId(socket.id);
            });
        }).catch(() => {
            socket.disconnect();
        });
    } catch (err) {
        console.log('Invalid session token, disconnecting');
        socket.disconnect();
    }
};
