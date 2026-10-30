const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');
const {createSystemUpdater} = require('../others/systemUpdate');
const {signSystemUpdate} = require('../../server/others/systemUpdateAuthorization');

test('HTTP maintenance requires trusted origin and a one-time signature; execute cannot bypass it', async () => {
    const keys = crypto.generateKeyPairSync('ed25519');
    const pem = keys.privateKey.export({type: 'pkcs8', format: 'pem'});
    let starts = 0;
    const updater = createSystemUpdater({
        readFile: async file => {
            if (file.endsWith('.pem')) return keys.publicKey.export({type: 'spki', format: 'pem'});
            if (file.endsWith('.service')) return '[Service]';
            throw Object.assign(new Error('absent'), {code: 'ENOENT'});
        },
        run: async () => {starts++;}
    });
    const app = express();
    app.listen = () => {};
    const expressFactory = Object.assign(() => app, express);
    const dependencies = {
        dotenv: {config() {}}, express: expressFactory, cors: require('cors'),
        child_process: {execFile() {assert.fail('unexpected subprocess');}},
        './others/config': {clientUrl: 'https://client.example.test', apiToken: 'test-only'},
        './others/systemUpdate': {createSystemUpdater: () => updater}
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pi-server.js'), 'utf8'), {
        require: name => {assert(name in dependencies, name); return dependencies[name];},
        console: {log() {}, error() {}}
    });
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    const headers = {Origin: 'https://client.example.test', 'Content-Type': 'application/json'};
    try {
        let response = await fetch(`${url}/system-update/start`, {method: 'POST', headers, body: '{}'});
        assert.equal(response.status, 403);
        response = await fetch(`${url}/system-update/challenge`, {headers});
        assert.equal(response.headers.get('cache-control'), 'no-store');
        const {challenge} = await response.json();
        const body = JSON.stringify(signSystemUpdate(challenge, pem));
        response = await fetch(`${url}/system-update/start`, {method: 'POST', headers: {...headers, Origin: 'https://other.example.test'}, body});
        assert.equal(response.status, 403);
        response = await fetch(`${url}/system-update/start`, {method: 'POST', headers, body});
        assert.equal(response.status, 202);
        response = await fetch(`${url}/system-update/start`, {method: 'POST', headers, body});
        assert.equal(response.status, 403);
        response = await fetch(`${url}/execute`, {method: 'POST', headers, body: JSON.stringify({command: 'systemUpdate', value: JSON.parse(body)})});
        assert.equal(response.status, 400);
        assert.equal(starts, 1);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});
