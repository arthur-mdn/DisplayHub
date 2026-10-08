const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const config = require('../others/config');
const {
    SESSION_EXPIRES_IN,
    getSessionCookieOptions,
    getClearSessionCookieOptions
} = require('../others/cookieOptions');
const {rateLimit} = require('../others/rateLimit');

const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyFn: (req) => `${req.ip}:${(req.body?.email || '').toLowerCase()}`
});

const authIpRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    keyFn: (req) => `auth-ip:${req.ip}`
});

function signSessionToken(user) {
    return jwt.sign(
        {userId: user._id, tokenVersion: user.tokenVersion || 0},
        config.secretKey,
        {expiresIn: SESSION_EXPIRES_IN}
    );
}

router.post('/auth/login', authIpRateLimit, loginRateLimit, async (req, res) => {
    const {email, password} = req.body;

    try {
        const user = await User.findOne({email: email});
        if (!user) {
            return res.status(401).json({message: 'Utilisateur non trouvé'});
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({success: false, message: 'Mot de passe incorrect'});
        }

        if (user.status && ['disabled', 'pending', 'blocked'].includes(user.status)) {
            return res.status(401).json({message: 'Compte désactivé'});
        }

        user.lastLogin = Date.now();
        await user.save();

        const token = signSessionToken(user);
        res.cookie('session_token', token, getSessionCookieOptions());
        res.json({message: 'Authentification réussie'});
    } catch (error) {
        res.status(500).json({message: 'Erreur serveur'});
    }
});

router.post('/auth/register', authIpRateLimit, loginRateLimit, async (req, res) => {
    try {
        const {email, password, lastName, firstName} = req.body;

        const existingUser = await User.findOne({email});
        if (existingUser) {
            return res.status(400).json({message: 'Un compte avec cette adresse e-mail existe déjà.'});
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            lastName,
            firstName,
            email,
            password: hashedPassword,
            tokenVersion: 0
        });

        await newUser.save();

        const token = signSessionToken(newUser);
        res.cookie('session_token', token, getSessionCookieOptions());

        res.status(201).json({message: 'Inscription réussie'});
    } catch (error) {
        res.status(500).json({message: 'Erreur serveur: ' + error});
    }
});

router.get('/auth/validate-session', async (req, res) => {
    const token = req.cookies['session_token'];
    if (!token) {
        return res.json({isAuthenticated: false});
    }
    try {
        const decoded = jwt.verify(token, config.secretKey);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.json({isAuthenticated: false, message: 'Utilisateur non trouvé'});
        }

        if (user.status && ['disabled', 'pending', 'blocked'].includes(user.status)) {
            return res.json({isAuthenticated: false, message: 'Compte désactivé'});
        }

        if ((user.tokenVersion || 0) !== (decoded.tokenVersion ?? 0)) {
            return res.json({isAuthenticated: false, message: 'Session révoquée'});
        }

        user.lastLogin = Date.now();
        await user.save();

        user.password = undefined;

        res.json({isAuthenticated: true, user: user});
    } catch (err) {
        res.json({isAuthenticated: false});
    }
});

router.post('/auth/logout', async (req, res) => {
    const token = req.cookies['session_token'];
    if (token) {
        try {
            const decoded = jwt.verify(token, config.secretKey);
            await User.findByIdAndUpdate(decoded.userId, {$inc: {tokenVersion: 1}});
            const socketUtils = require('../utils/socket/socketUtils');
            socketUtils.disconnectAdminSocketsForUser(decoded.userId);
        } catch (error) {
            // ignore invalid token on logout
        }
    }
    res.clearCookie('session_token', getClearSessionCookieOptions());
    res.json({message: 'Déconnexion réussie'});
});

module.exports = router;
