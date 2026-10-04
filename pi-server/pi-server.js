require('dotenv').config();
const express = require('express');
const cors = require('cors');
const {execFile} = require('child_process');
const config = require('./others/config');

const app = express();
const appVersion = 'pi-0.0.42';

app.use(cors({
    origin: config.clientUrl,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

function requireApiToken(req, res, next) {
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

app.get('/', requireApiToken, async (req, res) => {
    let availableCommands = ['shutdown', 'reboot', 'update'];
    let defaultValues = {};

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

app.post('/execute', requireApiToken, async (req, res) => {
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
