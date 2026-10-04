const Screen = require('../models/Screen');
const express = require('express');
const router = express.Router();
const verifyToken = require('../others/verifyToken');
const cityList = require('../datas/villesFR_NoDoubles.json');
const socketUtils = require('../utils/socket/socketUtils');
const Image = require('../models/Image');
const {generateDeviceToken, hashDeviceToken} = require('../others/deviceToken');
const {sanitizeScreen, processScreenObj} = require('../others/sanitizeScreen');

router.post('/associate-screen', verifyToken, async (req, res) => {
    const {code} = req.body;

    try {
        const existingScreen = await Screen.findOne({code});
        if (existingScreen) {
            return res.status(400).send({error: 'Ce code est déjà associé à un écran.'});
        }

        const socketId = socketUtils.getSocketIdWithThisAssociationCode(code);
        if (!socketId) {
            return res.status(404).send({error: 'Code non trouvé'});
        }

        const socket = await socketUtils.getSocketObject(socketId);
        if (!socket) {
            return res.status(500).send({error: 'Connexion socket non trouvée'});
        }

        const defaultLogo = await Image.findOne({system: 'default-logo'});
        const deviceToken = generateDeviceToken();
        const newScreen = new Screen({
            code,
            users: [{user: req.user.userId, role: 'creator'}],
            logo: defaultLogo?._id,
            deviceTokenHash: hashDeviceToken(deviceToken),
            deviceTokenIssuedAt: new Date()
        });
        await newScreen.save();

        const screen = await Screen.findById(newScreen._id)
            .populate('users.user', 'email firstName lastName')
            .populate('logo')
            .populate('featured_image')
            .select('-deviceTokenHash');

        const payloadForClient = {
            ...sanitizeScreen(screen),
            deviceToken
        };
        await socketUtils.emitMessageToSocket(socketId, 'associate', payloadForClient);
        await socketUtils.associateScreenSocket(newScreen._id.toString(), socketId);

        const screenForAdmin = processScreenObj(screen, req.user.userId);
        res.send({success: true, screen: screenForAdmin, message: 'Écran associé avec succès.'});
    } catch (error) {
        console.error('Erreur lors de l\'association de l\'écran:', error);
        res.status(500).send({error: 'Erreur serveur'});
    }
});

router.get('/autocomplete/:query', (req, res) => {
    const query = req.params.query.toLowerCase();
    if (query.length < 2) {
        return res.json([]);
    }

    const filteredCities = cityList
        .filter(city =>
            city.name.toLowerCase().replace(/\s+/g, '-').startsWith(query.replace(/\s+/g, '-')) &&
            city.country === 'FR'
        )
        .map(city => ({id: city.id, name: city.name, country: city.country}));

    res.json(filteredCities);
});

router.use((err, req, res, next) => {
    if (err) {
        res.status(400).json({error: err.message});
    } else {
        next();
    }
});

module.exports = router;
