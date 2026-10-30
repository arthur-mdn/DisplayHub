require('dotenv').config();
const express = require('express');
const cors = require('cors');
const {execFile} = require('child_process');
const config = require('./others/config');
const {createSystemUpdater} = require('./others/systemUpdate');
const systemUpdater = createSystemUpdater();

const app = express();
const appVersion = 'pi-0.0.44';

app.use(cors({
    origin: config.clientUrl,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Fast installation probe: no DDC commands, credentials or sensitive status.
app.get('/health', (req, res) => res.json({ok: true, appVersion}));

function requireTrustedBrowser(req, res, next) {
    res.set('Cache-Control', 'no-store');
    if (req.get('Origin') !== config.clientUrl) {
        return res.status(403).json({error: 'Origine non autorisée'});
    }
    next();
}

const updateEndpoint = (handler) => async (req, res) => {
    try { await handler(req, res); } catch (error) {
        res.status(error.status || 503).json({error: error.status ? error.message : 'Maintenance système non configurée sur ce Pi'});
    }
};

app.get('/system-update', requireTrustedBrowser, requireLocalOrApiToken, updateEndpoint(async (req, res) => {
    res.json({systemUpdate: await systemUpdater.status()});
}));
app.get('/system-update/challenge', requireTrustedBrowser, requireLocalOrApiToken, updateEndpoint(async (req, res) => {
    res.json({challenge: await systemUpdater.challenge()});
}));
app.post('/system-update/start', requireTrustedBrowser, requireLocalOrApiToken, updateEndpoint(async (req, res) => {
    const systemUpdate = await systemUpdater.start(req.body);
    res.status(202).json({message: 'Mise à jour système demandée, sans redémarrage automatique', systemUpdate});
}));

function isLocalRequest(req) {
    const remote = req.socket.remoteAddress || '';
    return remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
}

function requireLocalOrApiToken(req, res, next) {
    if (isLocalRequest(req)) {
        return next();
    }
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token || token !== config.apiToken) {
        return res.status(401).send('Unauthorized');
    }
    next();
}

const executeFile = (file, args = []) => {
    return new Promise((resolve, reject) => {
        execFile(file, args, (error, stdout, stderr) => {
            if (error) {
                reject(`exec error: ${error}`);
            } else {
                resolve({stdout, stderr});
            }
        });
    });
};

app.get('/', requireLocalOrApiToken, async (req, res) => {
    let availableCommands = ['shutdown', 'reboot'];
    if (config.agentUpdatesEnabled) availableCommands.push('update');
    let defaultValues = {};

    if (await systemUpdater.available()) {
        availableCommands.push('prepareSystemUpdate', 'systemUpdate', 'systemUpdateStatus');
    }

    try {
        const detectOutput = await executeFile('ddcutil', ['detect']);
        if (!detectOutput.stdout.includes('Invalid display')) {
            const brightnessOutput = await executeFile('ddcutil', ['getvcp', '0x10']);
            const brightnessValue = brightnessOutput.stdout.match(/current value\s*=\s*(\d+)/);
            if (brightnessValue) {
                defaultValues.brightness = parseInt(brightnessValue[1], 10);
                availableCommands.push('brightness');
            }
        }
    } catch (error) {
        console.error(error);
    } finally {
        res.json({appVersion, availableCommands, defaultValues});
    }
});

app.post('/execute', requireLocalOrApiToken, async (req, res) => {
    const command = req.body.command;
    const value = req.body.value;

    if (!command) {
        return res.status(400).send('No command provided.');
    }

    try {
        switch (command) {
            case 'shutdown':
                res.send('Shutting down...');
                await executeFile('sudo', ['shutdown', 'now']);
                break;
            case 'reboot':
                res.send('Rebooting...');
                await executeFile('sudo', ['reboot']);
                break;
            case 'update': {
                if (!config.agentUpdatesEnabled) return res.status(403).send('Agent géré par l’installateur ; relancer celui-ci pour mettre à jour son code.');
                const output = await executeFile('git', ['pull']);
                if (!output.stdout.includes('Already up to date.') && !output.stdout.includes('Déjà à jour.')) {
                    res.json({message: 'Updating and rebooting...'});
                    await executeFile('sudo', ['reboot']);
                } else {
                    res.json({message: 'Already up to date.'});
                }
                break;
            }
            case 'brightness': {
                const brightness = Number(value);
                if (!Number.isInteger(brightness) || brightness < 0 || brightness > 100) {
                    return res.status(400).send('Brightness must be an integer between 0 and 100.');
                }
                const detectOutput = await executeFile('ddcutil', ['detect']);
                if (!detectOutput.stdout.includes('Invalid display')) {
                    await executeFile('ddcutil', ['setvcp', '10', String(brightness)]);
                    const brightnessOutput = await executeFile('ddcutil', ['getvcp', '0x10']);
                    const brightnessValue = brightnessOutput.stdout.match(/current value\s*=\s*(\d+)/);
                    if (brightnessValue) {
                        res.json({
                            message: `Brightness set to ${brightnessValue[1]}.`,
                            valueConfirmed: parseInt(brightnessValue[1], 10)
                        });
                    } else {
                        res.status(500).send('Failed to get current brightness value.');
                    }
                } else {
                    res.status(500).send('Monitor not supported.');
                }
                break;
            }
            default:
                res.status(400).send('Invalid command.');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error: ' + error);
    }
});

app.listen(config.port, '127.0.0.1', () => {
    console.log(`Pi-server listening on 127.0.0.1:${config.port}`);
});
