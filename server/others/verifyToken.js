const jwt = require('jsonwebtoken');
const config = require('./config');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
    const token = req.cookies['session_token'];
    const selectedScreen = req.cookies['selectedScreen'];
    if (!token) {
        return res.status(403).send('Un token est requis pour l\'authentification');
    }
    try {
        const decoded = jwt.verify(token, config.secretKey);
        const user = await User.findById(decoded.userId).select('tokenVersion status');
        if (!user) {
            return res.status(401).send('Token invalide');
        }
        if (user.status && ['disabled', 'pending', 'blocked'].includes(user.status)) {
            return res.status(401).send('Compte désactivé');
        }
        if ((user.tokenVersion || 0) !== (decoded.tokenVersion ?? 0)) {
            return res.status(401).send('Session révoquée');
        }
        req.user = decoded;
        req.selectedScreen = selectedScreen;
        return next();
    } catch (err) {
        return res.status(401).send('Token invalide');
    }
};

module.exports = verifyToken;
