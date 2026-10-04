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

async function markScreenOnline(screenId) {
    await Screen.findByIdAndUpdate(screenId, {status: 'online'});
    await socketUtils.emitScreenStatusToMembers(screenId, 'online');
}

async function markScreenOfflineIfUnused(screenId, exceptSocketId = null) {
    if (!screenId) return;
    if (socketUtils.hasOtherSocketForScreen(screenId, exceptSocketId)) {
        return;
    }
    await Screen.findByIdAndUpdate(screenId, {status: 'offline'});
    await socketUtils.emitScreenStatusToMembers(screenId, 'offline');
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
        await socketUtils.associateScreenSocket(screenId, socket.id);
        await markScreenOnline(screenId);
        await socketUtils.emitSocketListToAllAdmins();
    });

    socket.on('request_code', async () => {
        const [previousScreenId] = socketUtils.getScreenId(socket.id);
        const uniqueCode = uuid.v4();
        await socketUtils.associateSocketWaitingForConfiguration(socket.id, uniqueCode);
        if (previousScreenId) {
            await markScreenOfflineIfUnused(previousScreenId, socket.id);
        }
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
            await updateWeatherData(screenId, weatherId);
            await socketUtils.associateScreenSocket(screenId, socket.id);
            await markScreenOnline(screenId);
            const populated = await Screen.findById(screenId)
                .populate('users.user', 'email firstName lastName')
                .populate('logo')
                .populate('featured_image')
                .populate('icons')
                .populate('photos')
                .populate('meteo')
                .select('-deviceTokenHash');
            socket.emit('config_updated', sanitizeScreen(populated));
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
            await markScreenOnline(screenId);
            const populated = await Screen.findById(screenId)
                .populate('users.user', 'email firstName lastName')
                .populate('logo')
                .populate('featured_image')
                .populate('icons')
                .populate('photos')
                .populate('meteo')
                .select('-deviceTokenHash');
            socket.emit('config_updated', sanitizeScreen(populated || screen));
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
            for (const adminSocketId of socketUtils.getAdminSocketIdsForUser(userId)) {
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
            if (!parsed || typeof parsed !== 'object') {
                return;
            }
            await socketUtils.associateSocketDebug(socket.id, {
                _id: parsed._id || null,
                name: parsed.name || 'debug'
            });
            await socketUtils.emitSocketListToAllAdmins();
        } catch (error) {
            console.error('askDebug invalid payload');
        }
    });

    socket.on('disconnect', async () => {
        try {
            const screenId = socketUtils.removeSocketId(socket.id);
            if (screenId) {
                console.log('Screen disconnected:', screenId);
                await markScreenOfflineIfUnused(screenId);
            }
        } catch (error) {
            console.error('ecran non trouvé', error);
        }
        await socketUtils.emitSocketListToAllAdmins();
    });

    socket.conn.on('pingTimeout', async () => {
        const screenId = socketUtils.removeSocketId(socket.id);
        if (screenId) {
            await markScreenOfflineIfUnused(screenId);
        }
        await socketUtils.emitSocketListToAllAdmins();
    });
};
