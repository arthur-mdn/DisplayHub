const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {createSystemUpdater} = require('../others/systemUpdate');
const {signSystemUpdate} = require('../../server/others/systemUpdateAuthorization');

function fixture() {
    const keys = crypto.generateKeyPairSync('ed25519');
    const privateKey = keys.privateKey.export({type: 'pkcs8', format: 'pem'});
    const publicKey = keys.publicKey.export({type: 'spki', format: 'pem'});
    let time = 1800000000000;
    let state;
    let active = 'inactive';
    const calls = [];
    const updater = createSystemUpdater({
        now: () => time,
        readFile: async (path) => {
            if (path.endsWith('.pem')) return publicKey;
            if (path.endsWith('.service')) return '[Service]';
            if (state) return JSON.stringify(state);
            throw Object.assign(new Error('absent'), {code: 'ENOENT'});
        },
        run: async (file, args) => {
            if (file === '/usr/bin/systemctl') return {stdout: active};
            calls.push({file, args});
        }
    });
    return {updater, privateKey, calls, now: () => time, advance: ms => {time += ms;},
        state: s => {state = s;}, active: s => {active = s;}};
}

test('valid signature starts only the fixed unit; replay is refused', async () => {
    const f = fixture();
    const token = signSystemUpdate(await f.updater.challenge(), f.privateKey, f.now());
    assert.equal((await f.updater.start(token)).state, 'starting');
    assert.deepEqual(f.calls, [{file: '/usr/bin/sudo', args: ['-n', '/usr/bin/systemctl', 'start', '--no-block', 'displayhub-system-update.service']}]);
    await assert.rejects(f.updater.start(token), {status: 403});
    assert.equal(f.calls.length, 1);
});

test('unsigned, forged, expired and modified requests never run a privileged command', async () => {
    const f = fixture();
    const challenge = await f.updater.challenge();
    const token = signSystemUpdate(challenge, f.privateKey, f.now());
    await assert.rejects(f.updater.start({}), {status: 403});
    const wrongKey = fixture().privateKey;
    await assert.rejects(f.updater.start(signSystemUpdate(challenge, wrongKey, f.now())), {status: 403});
    await assert.rejects(f.updater.start({...token, payload: {...token.payload, command: 'reboot'}}), {status: 403});
    await assert.rejects(f.updater.start({...token, payload: {...token.payload, action: 'reboot'}}), {status: 403});
    f.advance(60001);
    await assert.rejects(f.updater.start(token), {status: 403});
    assert.equal(f.calls.length, 0);
});

test('a challenge issued by another Pi is refused even with a valid server signature', async () => {
    const f = fixture();
    const other = fixture();
    const token = signSystemUpdate(await other.updater.challenge(), f.privateKey, f.now());
    await assert.rejects(f.updater.start(token), {status: 403});
    assert.equal(f.calls.length, 0);
});

test('concurrent submissions trigger at most one start and cooldown survives agent restart', async () => {
    const f = fixture();
    const token = signSystemUpdate(await f.updater.challenge(), f.privateKey, f.now());
    const result = await Promise.allSettled([f.updater.start(token), f.updater.start(token)]);
    assert.equal(result.filter(x => x.status === 'fulfilled').length, 1);
    assert.equal(f.calls.length, 1);
    const restarted = fixture();
    restarted.state({state: 'succeeded', phase: 'finished', startedAt: restarted.now() - 60000});
    await assert.rejects(restarted.updater.start(signSystemUpdate(await restarted.updater.challenge(), restarted.privateKey, restarted.now())), {status: 429});
    assert.equal(restarted.calls.length, 0);
});

test('second-resolution root timestamps do not hide running state; interrupted jobs become failed', async () => {
    const f = fixture();
    await f.updater.start(signSystemUpdate(await f.updater.challenge(), f.privateKey, f.now()));
    f.state({state: 'running', phase: 'installing', startedAt: f.now() - 800});
    assert.equal((await f.updater.status()).state, 'running');
    f.advance(31000);
    f.active('inactive');
    assert.equal((await f.updater.status()).state, 'failed');
});

test('missing public key or unit disables availability and fails closed', async () => {
    const updater = createSystemUpdater({readFile: async () => {throw new Error('missing');}, run: async () => {assert.fail('must not execute');}});
    assert.equal(await updater.available(), false);
    await assert.rejects(updater.start({}));
});
