const uuid = require('uuid');
const Screen = require('../../models/Screen');
const socketUtils = require('./socketUtils');
const {updateWeatherData} = require('../weatherUtils');
const {verifyDeviceToken} = require('../../others/deviceToken');
const {sanitizeScreen} = require('../../others/sanitizeScreen');

async function assertDeviceAccess(screenId, deviceToken) {
    if (!screenId || !deviceToken) {
        return null;
    }
    const screen = await Screen.findById(screenId).select('+deviceTokenHash');
    if (!screen || !screen.deviceTokenHash) {
        return null;
    }
    if (!verifyDeviceToken(deviceToken, screen.deviceTokenHash)) {
        return null;
    }
    return screen;
}

module.exports = (io, socket) => {
    console.log('Raspberry Pi connected:', socket.id);

    socket.on('associate', async (data) => {
        const {screenId, deviceToken} = data || {};
        const screen = await assertDeviceAccess(screenId, deviceToken);
        if (!screen) {
            socket.emit('error', 'Identité appareil invalide');
            return;
        }
        await Screen.findByIdAndUpdate(screenId, {status: 'online'});
        await socketUtils.associateScreenSocket(screenId, socket.id);
    });

    socket.on('request_code', async () => {
        const [screenId] = socketUtils.getScreenId(socket.id);
        try {
            if (screenId) {
                await Screen.findByIdAndUpdate(screenId, {status: 'offline'});
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'écran:', error);
        }
        const uniqueCode = uuid.v4();
        await socketUtils.associateSocketWaitingForConfiguration(socket.id, uniqueCode);
        socket.emit('receive_code', uniqueCode);
        await socketUtils.emitSocketListToAllAdmins();
    });

    socket.on('update_weather', async (data) => {
        const {screenId, deviceToken} = data || {};
        const screen = await assertDeviceAccess(screenId, deviceToken);
        if (!screen) {
            socket.emit('error', 'Identité appareil invalide');
            return;
        }
        try {
            const withMeteo = await Screen.findById(screenId).populate('meteo');
            const weatherId = withMeteo?.meteo?.weatherId;
            if (!weatherId) {
                return;
            }
            const updatedScreen = await updateWeatherData(screenId, weatherId);
            await Screen.findByIdAndUpdate(screenId, {status: 'online'});
            const populated = await Screen.findById(screenId)
                .populate('users.user', 'email firstName lastName')
                .populate('logo')
                .populate('featured_image')
                .populate('icons')
                .populate('photos')
                .populate('meteo')
                .select('-deviceTokenHash');
            socket.emit('config_updated', sanitizeScreen(populated || updatedScreen));
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la météo:', error);
        }
    });

    socket.on('update_config', async (data) => {
        try {
            const {screenId, deviceToken} = data || {};
            const screen = await assertDeviceAccess(screenId, deviceToken);
            if (!screen) {
                socket.emit('error', 'Identité appareil invalide');
                return;
            }
            await socketUtils.associateScreenSocket(screenId, socket.id);
            await Screen.findByIdAndUpdate(screenId, {status: 'online'});
            const populated = await Screen.findById(screenId)
                .populate('users.user', 'email firstName lastName')
                .populate('logo')
                .populate('featured_image')
                .populate('icons')
                .populate('photos')
                .populate('meteo')
                .select('-deviceTokenHash');
            socket.emit('config_updated', sanitizeScreen(populated || screen));
            for (const user of screen.users) {
                const userId = user.user?._id || user.user;
                const adminSocketId = socketUtils.getAdminSocketId(userId);
                if (adminSocketId) {
                    const adminSocket = io.sockets.sockets.get(adminSocketId);
                    if (adminSocket) {
                        adminSocket.emit('screen_status', {screenId, status: 'online'});
                    }
                }
            }
        } catch (error) {
            console.error('Erreur lors de la récupération de la configuration:', error);
            socket.emit('error', 'Erreur lors de la récupération de la configuration');
        }
        await socketUtils.emitSocketListToAllAdmins();
    });

    socket.on('client_control_response', async (data) => {
        const [screenId] = socketUtils.getScreenId(socket.id);
        if (!screenId) return;
        const screen = await Screen.findById(screenId);
        if (!screen) return;
        for (const user of screen.users) {
            const userId = user.user?._id || user.user;
            const adminSocketId = socketUtils.getAdminSocketId(userId);
            if (adminSocketId) {
                const adminSocket = io.sockets.sockets.get(adminSocketId);
                if (adminSocket) {
                    adminSocket.emit('server_forward_client_response_to_admin', data);
                }
            }
        }
    });

    socket.on('askDebug', async (screenPayload) => {
        try {
            const parsed = typeof screenPayload === 'string' ? JSON.parse(screenPayload) : screenPayload;
            if (!parsed || !parsed._id) {
                return;
            }
            await socketUtils.associateSocketDebug(socket.id, {_id: parsed._id, name: parsed.name || 'debug'});
            await socketUtils.emitSocketListToAllAdmins();
        } catch (error) {
            console.error('askDebug invalid payload');
        }
    });

    socket.on('disconnect', async () => {
        try {
            const screenId = socketUtils.removeSocketId(socket.id);
            if (screenId) {
                await Screen.findByIdAndUpdate(screenId, {status: 'offline'});
                console.log('Screen disconnected:', screenId);
                const screen = await Screen.findById(screenId);
                if (screen) {
                    for (const user of screen.users) {
                        const userId = user.user?._id || user.user;
                        const adminSocketId = socketUtils.getAdminSocketId(userId);
                        if (adminSocketId) {
                            const adminSocket = io.sockets.sockets.get(adminSocketId);
                            if (adminSocket) {
                                adminSocket.emit('screen_status', {screenId, status: 'offline'});
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('ecran non trouvé', error);
        }
        await socketUtils.emitSocketListToAllAdmins();
    });

    socket.conn.on('pingTimeout', async () => {
        const screenId = socketUtils.removeSocketId(socket.id);
        if (screenId) {
            await Screen.findByIdAndUpdate(screenId, {status: 'offline'});
        }
        await socketUtils.emitSocketListToAllAdmins();
    });
};
