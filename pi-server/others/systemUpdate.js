const crypto = require('crypto');
const fs = require('fs/promises');
const {execFile} = require('child_process');
const {promisify} = require('util');

const PUBLIC_KEY_PATH = '/etc/displayhub/system-update-public.pem';
const UNIT_PATH = '/etc/systemd/system/displayhub-system-update.service';
const STATUS_PATH = '/var/lib/displayhub-system-update/status.json';
const COOLDOWN_MS = 15 * 60 * 1000;
const STATES = new Set(['running', 'succeeded', 'failed']);
const PHASES = new Set(['refreshing', 'installing', 'finished']);

function failure(message, status = 400) {
    return Object.assign(new Error(message), {status});
}

function createSystemUpdater({readFile = fs.readFile, run = promisify(execFile), now = Date.now} = {}) {
    const challenges = new Map();
    let starting = false;
    let lastStart = 0;

    async function publicKey() {
        await readFile(UNIT_PATH, 'utf8');
        const key = crypto.createPublicKey(await readFile(PUBLIC_KEY_PATH, 'utf8'));
        if (key.asymmetricKeyType !== 'ed25519') throw failure('Clé locale invalide', 503);
        return key;
    }

    async function available() {
        try { await publicKey(); return true; } catch { return false; }
    }

    async function serviceIsActive() {
        try {
            const {stdout} = await run('/usr/bin/systemctl', ['show', '--property=ActiveState', '--value', 'displayhub-system-update.service'], {
                timeout: 5000, maxBuffer: 4096
            });
            return ['active', 'activating', 'reloading'].includes(stdout.trim());
        } catch {
            throw failure('État du service de maintenance indisponible', 503);
        }
    }

    async function status() {
        let value;
        try { value = JSON.parse(await readFile(STATUS_PATH, 'utf8')); } catch (error) {
            if (error.code !== 'ENOENT') throw failure('État de maintenance illisible', 503);
            value = null;
        }
        if (lastStart && (!value || value.startedAt < lastStart - 5000)) {
            if (now() - lastStart > 30000 && !await serviceIsActive()) {
                return {state: 'failed', startedAt: lastStart, rebootRequired: false};
            }
            return {state: 'starting', startedAt: lastStart, rebootRequired: false};
        }
        if (!value) return {state: 'idle', rebootRequired: false};
        if (!STATES.has(value.state) || !PHASES.has(value.phase) || !Number.isSafeInteger(value.startedAt)) {
            throw failure('État de maintenance invalide', 503);
        }
        // A power loss can leave a running status file behind; do not claim that
        // an interrupted update succeeded or prevent maintenance forever.
        if (value.state === 'running' && now() - value.startedAt > 30000 && !await serviceIsActive()) {
            value = {...value, state: 'failed', phase: 'finished'};
        }
        return {
            state: value.state, phase: value.phase, startedAt: value.startedAt,
            finishedAt: Number.isSafeInteger(value.finishedAt) ? value.finishedAt : null,
            rebootRequired: value.rebootRequired === true
        };
    }

    async function challenge() {
        await publicKey();
        const time = now();
        for (const [nonce, expiresAt] of challenges) if (expiresAt <= time) challenges.delete(nonce);
        if (challenges.size >= 8) throw failure('Trop de confirmations en attente', 429);
        const nonce = crypto.randomBytes(32).toString('hex');
        const expiresAt = time + 90000;
        challenges.set(nonce, expiresAt);
        return {nonce, expiresAt};
    }

    async function start(authorization) {
        if (starting) throw failure('Une mise à jour est déjà demandée', 409);
        starting = true;
        try {
            const key = await publicKey();
            const p = authorization?.payload;
            const signature = authorization?.signature;
            const time = now();
            if (!p || Object.keys(authorization).length !== 2 || Object.keys(p).length !== 4 ||
                p.action !== 'system_update' || typeof p.nonce !== 'string' ||
                !/^[a-f0-9]{64}$/.test(p.nonce) || !Number.isSafeInteger(p.issuedAt) ||
                !Number.isSafeInteger(p.expiresAt) || p.issuedAt > time + 5000 ||
                p.expiresAt <= time || p.expiresAt > p.issuedAt + 60000 ||
                typeof signature !== 'string' || !/^[A-Za-z0-9_-]{86}$/.test(signature)) {
                throw failure('Autorisation invalide ou expirée', 403);
            }
            const payload = {action: p.action, nonce: p.nonce, issuedAt: p.issuedAt, expiresAt: p.expiresAt};
            if (!crypto.verify(null, Buffer.from(JSON.stringify(payload)), key, Buffer.from(signature, 'base64url'))) {
                throw failure('Signature non autorisée', 403);
            }
            const expiresAt = challenges.get(p.nonce);
            if (!expiresAt || expiresAt <= time || p.expiresAt > expiresAt) {
                throw failure('Confirmation absente, expirée ou déjà utilisée', 403);
            }
            const current = await status();
            if (['running', 'starting'].includes(current.state)) throw failure('Mise à jour déjà en cours', 409);
            if (time - Math.max(lastStart, current.startedAt || 0) < COOLDOWN_MS) {
                throw failure('Attendez 15 minutes entre deux mises à jour', 429);
            }
            if (now() >= p.expiresAt) throw failure('Autorisation expirée ; recommencez', 403);
            challenges.delete(p.nonce);
            lastStart = time;
            try {
                await run('/usr/bin/sudo', ['-n', '/usr/bin/systemctl', 'start', '--no-block', 'displayhub-system-update.service'], {
                    timeout: 10000, maxBuffer: 16384
                });
            } catch {
                lastStart = 0;
                throw failure('Service de maintenance indisponible ; vérifier son installation locale', 503);
            }
            return {state: 'starting', startedAt: time, rebootRequired: false};
        } finally {
            starting = false;
        }
    }

    return {available, challenge, start, status};
}

module.exports = {createSystemUpdater};
