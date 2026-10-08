const Screen = require('../models/Screen');
const User = require('../models/User');
const express = require('express');
const router = express.Router();
const verifyToken = require('../others/verifyToken');
const {checkUserPermissions, isUserSuperAdmin} = require('../others/checkUserPermissions');
const cityList = require('../datas/villesFR_NoDoubles.json');
const socketUtils = require('../utils/socket/socketUtils');
const axios = require('axios');
const Meteo = require('../models/Meteo');
const Image = require('../models/Image');
const {updateWeatherData} = require('../utils/weatherUtils');
const mongoose = require('mongoose');
const {processScreenObj} = require('../others/sanitizeScreen');
const {upload, removeUploadedFiles, validateUploadedFiles, enforceScreenUploadQuota} = require('../others/uploadUtils');
const {normalizeAssignableRole, sanitizeAssignablePermissions} = require('../others/screenRoles');

async function ensureScreenMember(req, res, next) {
    try {
        const screen = await Screen.findOne({_id: req.selectedScreen, 'users.user': req.user.userId});
        if (!screen) {
            return res.status(404).send({error: 'Écran non trouvé ou non autorisé'});
        }
        req.screen = screen;
        next();
    } catch (error) {
        res.status(500).send({error: 'Erreur serveur'});
    }
}

function toIdString(value) {
    if (value == null) return '';
    const id = value._id ?? value;
    return id?.toString?.() || String(id);
}

function assertOwnedIdList(currentIds, newOrder) {
    if (!Array.isArray(newOrder)) {
        return {ok: false, error: 'newOrder doit être un tableau'};
    }
    const current = currentIds.map(toIdString);
    const next = newOrder.map(toIdString);
    if (next.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
        return {ok: false, error: 'Identifiant invalide dans newOrder'};
    }
    if (next.length !== current.length) {
        return {ok: false, error: 'newOrder doit contenir exactement les éléments existants'};
    }
    const currentSet = new Set(current);
    const nextSet = new Set(next);
    if (currentSet.size !== nextSet.size) {
        return {ok: false, error: 'newOrder contient des doublons ou des éléments étrangers'};
    }
    for (const id of nextSet) {
        if (!currentSet.has(id)) {
            return {ok: false, error: 'Identifiant extérieur à cet écran'};
        }
    }
    return {ok: true, ids: next};
}

function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            console.error(error);
            if (!res.headersSent) {
                res.status(500).send({error: 'Erreur serveur'});
            }
        });
    };
}


router.get('/screens', verifyToken, asyncHandler(async (req, res) => {
    const screens = await Screen.find({"users.user": req.user.userId});
    if (screens) {
        res.send({success: true, screens});
    } else {
        res.status(404).send({error: 'Aucun écran trouvé'});
    }
}));

router.get('/screens/:id', verifyToken, asyncHandler(async (req, res) => {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({error: 'ID invalide'});
    }
    try {
        const screen = await Screen.findOne({_id: id, "users.user": req.user.userId}).populate('users.user');
        if (!screen) {
            return res.status(404).send({error: 'Écran non trouvé'});
        }
        const screenObj = processScreenObj(screen, req.user.userId);
        res.send({success: true, screenObj});
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'écran:', error);
        res.status(500).send({error: 'Erreur serveur'});
    }
}));

const hasPermission = async (userId, screenId, attribute) => {
    const screen = await Screen.findById(screenId).populate('users.user');
    const user = screen.users.find(u => u.user._id.toString() === userId);
    if (!user) return false;

    // creators have all permissions
    if (user.role === 'creator') return true;

    return user.permissions.includes(attribute);
};

router.post('/screens/update', verifyToken, ensureScreenMember, upload.fields([
    {name: 'logo', maxCount: 1},
    {name: 'featured_image', maxCount: 1}
]), asyncHandler(async (req, res) => {
    const screenId = req.selectedScreen;
    const userId = req.user.userId;
    try {
        if (req.files && !validateUploadedFiles(req.files)) {
            return res.status(400).send({error: 'Fichier image invalide'});
        }
        if (req.files) {
            const quota = await enforceScreenUploadQuota(screenId, req.files);
            if (!quota.ok) {
                return res.status(400).send({error: quota.error});
            }
        }

        let screen = req.screen;

        if (req.files && req.files['logo']) {
            if (!await hasPermission(userId, screenId, 'logo')) {
                removeUploadedFiles(req.files);
                return res.status(403).send({error: 'Permission refusée'});
            }
            const newLogo = new Image({
                screen: screenId,
                type: 'logo',
                value: req.files['logo'][0].path,
                where: 'server'
            });
            await newLogo.save();
            screen.logo = newLogo._id;
            await screen.save();
        }

        if (req.body['featured_image'] && req.body['featured_image'] === "DELETE-FEATURED-IMAGE" && await hasPermission(userId, screenId, "featured_image")) {
            const defaultFeaturedImage = await Image.findOne({system: "default-featured-image"});
            screen.featured_image = defaultFeaturedImage._id;
        }

        if (req.files && req.files['featured_image']) {
            if (!await hasPermission(userId, screenId, 'featured_image')) {
                removeUploadedFiles(req.files);
                return res.status(403).send({error: 'Permission refusée'});
            }
            const newFeaturedImage = new Image({
                screen: screenId,
                type: 'featured_image',
                value: req.files['featured_image'][0].path,
                where: 'server'
            });
            await newFeaturedImage.save();
            screen.featured_image = newFeaturedImage._id;
            await screen.save();
        }

        const {attribute, value} = req.body;
        if (attribute) {
            if (attribute === "meteo.city") {
                if (!await hasPermission(userId, screenId, "meteo")) {
                    return res.status(403).send({error: 'Permission refusée'});
                }
                screen = await updateWeatherData(screenId, value);
            } else if (attribute === "config.meteo_corner") {
                if (!await hasPermission(userId, screenId, "meteo")) {
                    return res.status(403).send({error: 'Permission refusée'});
                }
                const allowedCorners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
                if (!allowedCorners.includes(value)) {
                    return res.status(400).send({error: 'Coin météo invalide'});
                }
                if (!screen.config) {
                    screen.config = {};
                }
                screen.config.meteo_corner = value;
            } else if (attribute === 'dark_mode') {
                if (!await hasPermission(userId, screenId, "dark_mode")) {
                    return res.status(403).send({error: 'Permission refusée'});
                }
                if (value && value.ranges) {
                    screen.dark_mode = value;
                }
            } else if (attribute === 'textSlides') {
                if (!await hasPermission(userId, screenId, "text_slides")) {
                    return res.status(403).send({error: 'Permission refusée'});
                }
                if (value && value.ranges) {
                    screen.text_slides = value;
                }
            } else if (attribute === 'name') {
                if (!await hasPermission(userId, screenId, "name")) {
                    return res.status(403).send({error: 'Permission refusée'});
                }
                if (value) {
                    screen.name = value;
                }
            } else if (attribute === 'logo') {
                if (!await hasPermission(userId, screenId, "logo")) {
                    return res.status(403).send({error: 'Permission refusée'});
                }
                screen.logo = undefined;
            } else {
                return res.status(400).send({error: 'Attribut non pris en charge'});
            }
        }

        const updatedScreen = await screen.save();
        const populatedScreen = await updatedScreen.populateFields();

        const screenObj = processScreenObj(populatedScreen, userId);
        socketUtils.emitConfigUpdate(screenId, populatedScreen);
        res.send({success: true, screenObj: screenObj});
    } catch (error) {
        removeUploadedFiles(req.files);
        console.error('Erreur lors de la mise à jour :', error);
        res.status(500).send({error: 'Erreur serveur'});
    }
}));


router.delete('/screens/', verifyToken, asyncHandler(async (req, res) => {
    const screenId = req.selectedScreen;

    try {
        const screen = await Screen.findOne({_id: screenId, 'users.user': req.user.userId}).populate('users.user');

        if (!screen) {
            return res.status(404).send({error: 'Écran non trouvé ou non autorisé'});
        }

        const membership = screen.users.find((u) => u.user._id.toString() === req.user.userId);
        const superAdmin = await isUserSuperAdmin(req.user.userId);
        if (!superAdmin && (!membership || membership.role !== 'creator')) {
            return res.status(403).send({error: 'Seul le créateur peut supprimer cet écran'});
        }

        await Screen.findByIdAndDelete(screenId);
        socketUtils.emitScreenDeletion(screenId);

        res.send({success: true, message: 'Écran supprimé avec succès'});
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'écran:', error);
        res.status(500).send({error: 'Erreur serveur lors de la suppression de l\'écran'});
    }
}));


router.post('/screens/icons', verifyToken, checkUserPermissions(['icons']), upload.array('icon', 10), asyncHandler(async (req, res) => {
    const screenId = req.selectedScreen;

    const screen = await Screen.findOne({_id: screenId, 'users.user': req.user.userId});

    if (!screen) {
        removeUploadedFiles(req.files);
        return res.status(404).send({error: 'Écran non trouvé ou non autorisé'});
    }

    if (req.files && !validateUploadedFiles(req.files)) {
        return res.status(400).send({error: 'Fichier image invalide'});
    }
    if (req.files) {
        const quota = await enforceScreenUploadQuota(screenId, req.files);
        if (!quota.ok) {
            return res.status(400).send({error: quota.error});
        }
    }

    if (req.files) {
        for (const file of req.files) {
            const newIcon = new Image({
                screen: screenId,
                type: 'icon',
                value: file.path,
                where: 'server'
            });
            await newIcon.save();
            screen.icons.push(newIcon._id);
        }
        await screen.save();
        const updatedScreen = await screen.populateFields();
        socketUtils.emitConfigUpdate(screenId, updatedScreen);
        const screenObj = processScreenObj(updatedScreen, req.user.userId);
        res.send({success: true, screen: screenObj});
    } else {
        res.status(400).send({error: 'Aucun fichier fourni'});
    }
}));

router.post('/screens/icons/addDefault', verifyToken, checkUserPermissions(["icons"]), asyncHandler(async (req, res) => {
    const screenId = req.selectedScreen
    const {iconId} = req.body;

    const screen = await Screen.findOne({_id: screenId, "users.user": req.user.userId});

    if (!screen) {
        return res.status(404).send({error: 'Écran non trouvé ou non autorisé'});
    }

    const defaultIcon = await Image.findOne({system: "default-icon", _id: iconId});
    if (!defaultIcon) {
        return res.status(404).send({error: 'Icône par défaut non trouvée'});
    }

    try {
        screen.icons.push(defaultIcon._id);
        await screen.save();
        const updatedScreen = await screen.populateFields();
        socketUtils.emitConfigUpdate(screenId, updatedScreen);
        const screenObj = processScreenObj(updatedScreen, req.user.userId);
        res.send({success: true, screen: screenObj});
    } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'icône par défaut:', error);
        res.status(500).send({error: 'Erreur serveur'});
    }
}));

router.delete('/screens/icons', verifyToken, checkUserPermissions(["icons"]), asyncHandler(async (req, res) => {
    const screenId = req.selectedScreen;

    const screen = await Screen.findOne({_id: screenId, "users.user": req.user.userId});
    if (!screen) {
        return res.status(404).send({error: 'Écran non trouvé ou non autorisé'});
    }

    const {iconId} = req.body;

    if (!iconId) {
        return res.status(400).send({error: 'Paramètres manquants'});
    }

    try {
        // delete from Screen the icon with ._id = iconId
        const updatedScreen = await Screen.findByIdAndUpdate(screenId, {$pull: {icons: iconId}}, {new: true});
        const populatedScreen = await updatedScreen.populateFields();
        socketUtils.emitConfigUpdate(screenId, populatedScreen);
        const screenObj = processScreenObj(populatedScreen, req.user.userId);
        res.send({success: true, screenObj});
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'icone:', error);
        res.status(500).send({error: 'Erreur serveur'});
    }
}));


router.post('/screens/icons/reorder', verifyToken, checkUserPermissions(["icons"]), asyncHandler(async (req, res) => {
    const screenId = req.selectedScreen
    const {newOrder} = req.body;

    const screen = await Screen.findOne({_id: screenId, "users.user": req.user.userId});

    if (!screen) {
        return res.status(404).send({error: 'Écran non trouvé ou non autorisé'});
    }

    const ownership = assertOwnedIdList(screen.icons || [], newOrder);
    if (!ownership.ok) {
        return res.status(400).send({error: ownership.error});
    }

    try {
        const updatedScreen = await Screen.findByIdAndUpdate(screenId, {'icons': ownership.ids}, {new: true});
        socketUtils.emitConfigUpdate(screenId, updatedScreen);
        const screenObj = processScreenObj(updatedScreen, req.user.userId);
        res.send({success: true, screen: screenObj});
    } catch (error) {
        console.error('Erreur lors de la réorganisation des icônes:', error);
        res.status(500).send({error: 'Erreur serveur'});
    }
}));


router.post('/screens/directions', verifyToken, checkUserPermissions(["directions"]), asyncHandler(async (req, res) => {
    const screenId = req.selectedScreen
    const screen = await Screen.findOne({_id: screenId, "users.user": req.user.userId});

    if (!screen) {
        return res.status(404).send({error: 'Écran non trouvé ou non autorisé'});
    }
    try {
        const newDirection = req.body;
        screen.directions.push(newDirection);
        await screen.save();
        socketUtils.emitConfigUpdate(screenId, screen);
        const screenObj = processScreenObj(screen, req.user.userId);
        res.send({success: true, screenObj});
    } catch (error) {
        console.error('Erreur lors de l\'ajout d\'une direction:', error);
        res.status(500).send({error: 'Erreur serveur'});
    }
}));

router.delete('/screens/directions/:directionId', verifyToken, checkUserPermissions(["directions"]), asyncHandler(async (req, res) => {
    const screenId = req.selectedScreen;
    const screen = await Screen.findOne({_id: screenId, "users.user": req.user.userId});

    if (!screen) {
        return res.status(404).send({error: 'Écran non trouvé ou non autorisé'});
    }
    try {
        const {directionId} = req.params;
        screen.directions = screen.directions.filter(direction => direction._id.toString() !== directionId);
        await screen.save();
        socketUtils.emitConfigUpdate(screenId, screen);
        const screenObj = processScreenObj(screen, req.user.userId);
        res.send({success: true, screenObj});
    } catch (error) {
        console.error('Erreur lors de la suppression d\'une direction:', error);
        res.status(500).send({error: 'Erreur serveur'});
    }
}));

router.put('/screens/directions/:directionId', verifyToken, checkUserPermissions(["directions"]), asyncHandler(async (req, res) => {
    const screenId = req.selectedScreen;
    const screen = await Screen.findOne({_id: screenId, "users.user": req.user.userId});

    if (!screen) {
        return res.status(404).send({error: 'Écran non trouvé ou non autorisé'});
    }
    try {
        const {directionId} = req.params;
        const updatedDirection = req.body;
        const directionIndex = screen.directions.findIndex(direction => direction._id.toString() === directionId);
        if (directionIndex === -1) {
            return res.status(404).send({error: 'Direction non trouvée'});
        }
        screen.directions[directionIndex] = updatedDirection;
        await screen.save();
        socketUtils.emitConfigUpdate(screenId, screen);
        const screenObj = processScreenObj(screen, req.user.userId);
        res.send({success: true, screenObj});
    } catch (error) {
        console.error('Erreur lors de la mise à jour d\'une direction:', error);
        res.status(500).send({error: 'Erreur serveur'});
    }
}));

router.post('/screens/directions/reorder', verifyToken, checkUserPermissions(["directions"]), asyncHandler(async (req, res) => {
    const screenId = req.selectedScreen;
    const screen = await Screen.findOne({_id: screenId, "users.user": req.user.userId});

    if (!screen) {
        return res.status(404).send({error: 'Écran non trouvé ou non autorisé'});
    }

    const newOrder = req.body.newOrder;
    if (!Array.isArray(newOrder)) {
        return res.status(400).send({error: 'newOrder doit être un tableau'});
    }
    const ownership = assertOwnedIdList(
        (screen.directions || []).map((d) => d._id),
        newOrder.map((d) => d?._id)
    );
    if (!ownership.ok) {
        return res.status(400).send({error: ownership.error});
    }

    try {
        screen.directions = newOrder;
        await screen.save();
        socketUtils.emitConfigUpdate(screenId, screen);
        const screenObj = processScreenObj(screen, req.user.userId);
        res.send({success: true, screenObj});
    } catch (error) {
        console.error('Erreur lors de la réorganisation des directions:', error);
        res.status(500).send({error: 'Erreur serveur'});
    }
}));

router.post('/screens/photos', verifyToken, checkUserPermissions(["photos"]), upload.array('photos', 10), asyncHandler(async (req, res) => {
    const screenId = req.selectedScreen;
    const screen = await Screen.findOne({_id: screenId, "users.user": req.user.userId});

    if (!screen) {
        removeUploadedFiles(req.files);
        return res.status(404).send({error: 'Écran non trouvé ou non autorisé'});
    }
    if (req.files && !validateUploadedFiles(req.files)) {
        return res.status(400).send({error: 'Fichier image invalide'});
    }
    if (req.files) {
        const quota = await enforceScreenUploadQuota(screenId, req.files);
        if (!quota.ok) {
            return res.status(400).send({error: quota.error});
        }
    }
    if (req.files) {

        for (const file of req.files) {
            const newPhoto = new Image({
                screen: screenId,
                type: 'photo',
                value: file.path,
                where: 'server'
            });
            await newPhoto.save();
            screen.photos.push(newPhoto._id);
        }
        await screen.save();
        const updatedScreen = await screen.populateFields();
        socketUtils.emitConfigUpdate(screenId, updatedScreen);
        const screenObj = processScreenObj(updatedScreen, req.user.userId);
        res.send({success: true, screen: screenObj});
    } else {
        res.status(400).send({error: 'Aucun fichier fourni'});
    }
}));

router.delete('/screens/photos', verifyToken, checkUserPermissions(["photos"]), asyncHandler(async (req, res) => {
    const screenId = req.selectedScreen;
    const {photoId} = req.body;
    const screen = await Screen.findOne({_id: screenId, "users.user": req.user.userId});

    if (!screen) {
        return res.status(404).send({error: 'Écran non trouvé ou non autorisé'});
    }

    if (!photoId) {
        return res.status(400).send({error: 'Paramètres manquants'});
    }

    try {

        const updatedScreen = await Screen.findByIdAndUpdate(screenId, {$pull: {photos: photoId}}, {new: true});
        const populatedScreen = await updatedScreen.populateFields();
        socketUtils.emitConfigUpdate(screenId, populatedScreen);
        const screenObj = processScreenObj(populatedScreen, req.user.userId);
        res.send({success: true, screenObj});
    } catch (error) {
        console.error('Erreur lors de la suppression de la photo:', error);
        res.status(500).send({error: 'Erreur serveur'});
    }
}));


router.post('/screens/photos/reorder', verifyToken, checkUserPermissions(["photos"]), asyncHandler(async (req, res) => {
    const screenId = req.selectedScreen;
    const {newOrder} = req.body;
    const screen = await Screen.findOne({_id: screenId, "users.user": req.user.userId});

    if (!screen) {
        return res.status(404).send({error: 'Écran non trouvé ou non autorisé'});
    }

    const ownership = assertOwnedIdList(screen.photos || [], newOrder);
    if (!ownership.ok) {
        return res.status(400).send({error: ownership.error});
    }

    try {
        const updatedScreen = await Screen.findByIdAndUpdate(screenId, {'photos': ownership.ids}, {new: true});
        socketUtils.emitConfigUpdate(screenId, updatedScreen);
        const screenObj = processScreenObj(updatedScreen, req.user.userId);
        res.send({success: true, screen: screenObj});
    } catch (error) {
        console.error('Erreur lors de la réorganisation des photos:', error);
        res.status(500).send({error: 'Erreur serveur'});
    }
}));


router.post('/screens/updateConfig', verifyToken, checkUserPermissions(["avanced_settings"]), asyncHandler(async (req, res) => {
    const screenId = req.selectedScreen;
    const configUpdates = req.body;
    let screen = await Screen.findOne({_id: screenId, "users.user": req.user.userId});

    if (!screen) {
        return res.status(404).send({error: 'Écran non trouvé ou non autorisé'});
    }
    try {

        for (const key in configUpdates) {
            if (configUpdates.hasOwnProperty(key)) {
                screen.config[key] = configUpdates[key];
            }
        }

        const updatedScreen = await screen.save();
        socketUtils.emitConfigUpdate(screenId, updatedScreen);
        const screenObj = processScreenObj(updatedScreen, req.user.userId);
        res.send({success: true, screen: screenObj});
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la configuration :', error);
        res.status(500).send({error: 'Erreur serveur'});
    }
}));


router.post('/screens/users', verifyToken, checkUserPermissions(["allowed_users"]), asyncHandler(async (req, res) => {
    const screenId = req.selectedScreen;
    const {userEmail, role, permissions} = req.body;

    const screen = await Screen.findById(screenId);
    if (!screen) return res.status(404).send({error: 'Écran non trouvé'});

    const user = await User.findOne({email: userEmail});
    if (!user) return res.status(404).send({error: 'Utilisateur non trouvé'});

    const isUserAdded = screen.users.some(u => u.user.toString() === user._id.toString());
    if (isUserAdded) return res.status(400).send({error: 'Utilisateur déjà ajouté'});

    const safeRole = normalizeAssignableRole(role);
    if (!safeRole) {
        return res.status(400).send({error: 'Rôle non autorisé'});
    }

    screen.users.push({
        user: user._id,
        role: safeRole,
        permissions: sanitizeAssignablePermissions(permissions)
    });
    await screen.save();

    res.send({success: true, message: 'Utilisateur ajouté avec succès'});
}));


router.put('/screens/users/:userId', verifyToken, checkUserPermissions(["allowed_users"]), asyncHandler(async (req, res) => {
    const {userId} = req.params;
    const screenId = req.selectedScreen;
    const {permissions, role} = req.body;

    const screen = await Screen.findById(screenId);
    if (!screen) return res.status(404).send({error: 'Écran non trouvé'});

    const userIndex = screen.users.findIndex(u => u.user.toString() === userId);
    if (userIndex === -1) return res.status(404).send({error: 'Utilisateur non trouvé sur cet écran'});

    if (screen.users[userIndex].role === 'creator') {
        return res.status(403).send({error: 'Impossible de modifier le créateur de l\'écran'});
    }

    if (role !== undefined) {
        const safeRole = normalizeAssignableRole(role);
        if (!safeRole) {
            return res.status(400).send({error: 'Rôle non autorisé'});
        }
        screen.users[userIndex].role = safeRole;
    }

    screen.users[userIndex].permissions = sanitizeAssignablePermissions(permissions);
    await screen.save();

    res.send({success: true, message: 'Permissions modifiées avec succès'});
}));

router.delete('/screens/users/:userId', verifyToken, checkUserPermissions(["allowed_users"]), asyncHandler(async (req, res) => {
    const {userId} = req.params;
    const screenId = req.selectedScreen;

    const screen = await Screen.findById(screenId);
    if (!screen) return res.status(404).send({error: 'Écran non trouvé'});

    const member = screen.users.find(u => u.user.toString() === userId);
    if (!member) {
        return res.status(404).send({error: 'Utilisateur non trouvé sur cet écran'});
    }
    if (member.role === 'creator') {
        return res.status(403).send({error: 'Impossible de supprimer le créateur de l\'écran'});
    }

    screen.users = screen.users.filter(u => u.user.toString() !== userId);
    await screen.save();

    res.send({success: true, message: 'Utilisateur supprimé avec succès'});
}));


module.exports = router;