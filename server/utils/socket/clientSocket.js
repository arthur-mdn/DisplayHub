const uuid = require('uuid');
const mongoose = require('mongoose');
const Screen = require('../../models/Screen');
const socketUtils = require('./socketUtils');
const {updateWeatherData} = require('../weatherUtils');
const {verifyDeviceToken} = require('../../others/deviceToken');
const {sanitizeScreen} = require('../../others/sanitizeScreen');

function safeHandler(handler) {
    return async (...args) => {
        try {
            await handler(...args);
        } catch (error) {
            console.error('Client socket handler error:', error);
            try {
                args[args.length - 1]?.();
            } catch {
                // ignore ack failures
            }
        }
    };
}

async function assertDeviceAccess(screenId, deviceToken) {
    if (typeof deviceToken !== 'string' || !deviceToken) {
        return null;
    }
    const id = typeof screenId === 'string' ? screenId : screenId?.toString?.();
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return null;
    }
    const screen = await Screen.findById(id).select('+deviceTokenHash');
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

    socket.on('associate', safeHandler(async (data) => {
        const {screenId, deviceToken} = data || {};
        const screen = await assertDeviceAccess(screenId, deviceToken);
        if (!screen) {
            socket.emit('error', 'Identité appareil invalide');
            return;
        }
        await socketUtils.associateScreenSocket(screen._id, socket.id);
        await markScreenOnline(screen._id);
        await socketUtils.emitSocketListToAllAdmins();
    }));

    socket.on('request_code', safeHandler(async () => {
        const [previousScreenId] = socketUtils.getScreenId(socket.id);
        const uniqueCode = uuid.v4();
        await socketUtils.associateSocketWaitingForConfiguration(socket.id, uniqueCode);
        if (previousScreenId) {
            await markScreenOfflineIfUnused(previousScreenId, socket.id);
        }
        socket.emit('receive_code', uniqueCode);
        await socketUtils.emitSocketListToAllAdmins();
    }));

    socket.on('update_weather', safeHandler(async (data) => {
        const {screenId, deviceToken} = data || {};
        const screen = await assertDeviceAccess(screenId, deviceToken);
        if (!screen) {
            socket.emit('error', 'Identité appareil invalide');
            return;
        }
        const withMeteo = await Screen.findById(screen._id).populate('meteo');
        const weatherId = withMeteo?.meteo?.weatherId;
        if (!weatherId) {
            return;
        }
        await updateWeatherData(screen._id, weatherId);
        await socketUtils.associateScreenSocket(screen._id, socket.id);
        await markScreenOnline(screen._id);
        const populated = await Screen.findById(screen._id)
            .populate('users.user', 'email firstName lastName')
            .populate('logo')
            .populate('featured_image')
            .populate('icons')
            .populate('photos')
            .populate('meteo')
            .select('-deviceTokenHash');
        socket.emit('config_updated', sanitizeScreen(populated));
    }));

    socket.on('update_config', safeHandler(async (data) => {
        const {screenId, deviceToken} = data || {};
        const screen = await assertDeviceAccess(screenId, deviceToken);
        if (!screen) {
            socket.emit('error', 'Identité appareil invalide');
            return;
        }
        await socketUtils.associateScreenSocket(screen._id, socket.id);
        await markScreenOnline(screen._id);
        const populated = await Screen.findById(screen._id)
            .populate('users.user', 'email firstName lastName')
            .populate('logo')
            .populate('featured_image')
            .populate('icons')
            .populate('photos')
            .populate('meteo')
            .select('-deviceTokenHash');
        socket.emit('config_updated', sanitizeScreen(populated || screen));
        await socketUtils.emitSocketListToAllAdmins();
    }));

    socket.on('client_control_response', safeHandler(async (data) => {
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
    }));

    socket.on('askDebug', safeHandler(async (screenPayload) => {
        const parsed = typeof screenPayload === 'string' ? JSON.parse(screenPayload) : screenPayload;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return;
        }
        await socketUtils.associateSocketDebug(socket.id, {
            _id: typeof parsed._id === 'string' ? parsed._id : null,
            name: typeof parsed.name === 'string' ? parsed.name : 'debug'
        });
        await socketUtils.emitSocketListToAllAdmins();
    }));

    socket.on('disconnect', safeHandler(async () => {
        const screenId = socketUtils.removeSocketId(socket.id);
        if (screenId) {
            console.log('Screen disconnected:', screenId);
            await markScreenOfflineIfUnused(screenId);
        }
        await socketUtils.emitSocketListToAllAdmins();
    }));

    socket.conn.on('pingTimeout', safeHandler(async () => {
        const screenId = socketUtils.removeSocketId(socket.id);
        if (screenId) {
            await markScreenOfflineIfUnused(screenId);
        }
        await socketUtils.emitSocketListToAllAdmins();
    }));
};
