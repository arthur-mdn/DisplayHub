const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {SYSTEM_UPDATE_COMMANDS} = require('../others/systemUpdateAuthorization');

async function fixture() {
    const actor = {userRole: 'user', status: 'active', tokenVersion: 0};
    const handlers = {};
    const forwarded = [];
    const replies = [];
    let signatures = 0;
    const dependencies = {
        jsonwebtoken: {verify: () => ({userId: 'actor', tokenVersion: 0, exp: Math.floor(Date.now() / 1000) + 3600})},
        '../../models/Screen': {findById: async () => ({_id: 'screen'})},
        '../../models/User': {findById: () => ({select: async () => actor})},
        './socketUtils': {associateAdminSocket() {}, getSocketId: () => 'device'},
        '../../others/checkUserPermissions': {checkUserPermissionsOfThisScreen: async () => true, isUserSuperAdmin: async () => actor.userRole === 'superadmin'},
        '../../others/deviceToken': {}, '../../others/config': {secretKey: 'test-only'},
        '../../others/systemUpdateAuthorization': {SYSTEM_UPDATE_COMMANDS, signSystemUpdate: value => {signatures++; return {signed: value};}}
    };
    const context = {module: {exports: {}}, require: name => {
        assert(name in dependencies, name);
        return dependencies[name];
    }, console: {log() {}, info() {}, error() {}}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../utils/socket/adminSocket.js'), 'utf8'), context);
    context.module.exports({sockets: {sockets: new Map([['device', {emit: (event, value) => forwarded.push(value)}]])}}, {
        id: 'admin', handshake: {headers: {cookie: 'session_token=test'}},
        on: (event, fn) => {handlers[event] = fn;}, emit: (event, value) => replies.push({event, value}), disconnect() {}
    });
    await new Promise(resolve => setImmediate(resolve));
    return {actor, forwarded, replies, signatures: () => signatures,
        command: (command, value) => handlers.admin_request_client_control({screenId: 'screen', commandId: 'test-id', command, value})};
}

test('ordinary control permission never grants system maintenance or a signing oracle', async () => {
    const f = await fixture();
    for (const command of SYSTEM_UPDATE_COMMANDS) await f.command(command, {nonce: 'a'.repeat(64)});
    assert.equal(f.forwarded.length, 0);
    assert.equal(f.signatures(), 0);
    assert.equal(f.replies.length, 3);
});

test('superadmin gets a server-generated authorization; arbitrary commands remain refused', async () => {
    const f = await fixture();
    f.actor.userRole = 'superadmin';
    await f.command('systemUpdate', {nonce: 'a'.repeat(64)});
    assert.equal(f.signatures(), 1);
    assert(f.forwarded[0].value.signed);
    await f.command('apt-get install arbitrary');
    assert.equal(f.forwarded.length, 1);
});

test('blocked or revoked sessions cannot trigger maintenance', async () => {
    const f = await fixture();
    f.actor.userRole = 'superadmin';
    f.actor.status = 'blocked';
    await f.command('systemUpdate', {});
    f.actor.status = 'active';
    f.actor.tokenVersion = 1;
    await f.command('systemUpdate', {});
    assert.equal(f.forwarded.length, 0);
    assert.equal(f.signatures(), 0);
});
