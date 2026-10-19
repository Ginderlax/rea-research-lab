import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { start } from '../../server.mjs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ownedHost(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rea-draft-recovery-http-'));
  let host = null;
  const close = async () => { const current = host; host = null; if (current) await current.close(); };
  t.after(async () => {
    await close();
    assert(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert(path.basename(root).startsWith('rea-draft-recovery-http-'));
    await rm(root, { recursive: true, force: true });
  });
  return {
    root, close,
    get host() { return host; },
    async start(name, port = 0) { assert.equal(host, null); host = await start({ port, dataDir: path.join(root, name) }); return host; },
    async request(action, input = {}, extraHeaders = {}) {
      const response = await fetch(host.url + '/api/notes/' + action, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-rea-token': host.token, ...extraHeaders },
        body: JSON.stringify(input),
      });
      return { response, value: await response.json() };
    },
    async call(action, input = {}) {
      const { response, value } = await this.request(action, input);
      assert.equal(response.status, 200, value.error); return value.result;
    },
  };
}

test('draft recovery scope persists for the same workspace, differs at the same origin for another workspace, and never edits saved notes', async t => {
  const f = await ownedHost(t); await f.start('workspace-a');
  const note = await f.call('save', { title: 'Saved boundary', body: 'Original saved bytes', tags: ['kept'] });
  const stateFile = path.join(f.host.dataDir, 'notes', 'records', 'notes-state-v2.json');
  const savedBefore = await readFile(stateFile);
  const scopes = await Promise.all(Array.from({ length: 4 }, () => f.call('draft-recovery-scope')));
  const first = scopes[0].scope; assert.match(first, uuid);
  assert(scopes.every(value => value.scope === first));
  assert.deepEqual(await readFile(stateFile), savedBefore);
  assert.deepEqual(await f.call('get', { id: note.id }), note);
  const originalOrigin = f.host.url, port = Number(new URL(originalOrigin).port), oldToken = f.host.token;
  await f.close(); await f.start('workspace-a', port);
  assert.equal(f.host.url, originalOrigin); assert.notEqual(f.host.token, oldToken);
  assert.equal((await f.call('draft-recovery-scope')).scope, first);
  assert.deepEqual(await readFile(stateFile), savedBefore);
  const rejected = await f.request('draft-recovery-scope', {}, { 'x-rea-token': oldToken });
  assert.equal(rejected.response.status, 403);
  await f.close(); await f.start('workspace-b', port);
  assert.equal(f.host.url, originalOrigin);
  const second = (await f.call('draft-recovery-scope')).scope;
  assert.match(second, uuid); assert.notEqual(second, first);
  assert.equal((await f.call('list')).total, 0);
  await f.close(); await f.start('workspace-a', port);
  assert.equal((await f.call('draft-recovery-scope')).scope, first);
  assert.deepEqual(await readFile(stateFile), savedBefore);
});

test('draft recovery public module delivery is byte exact and scope access retains the host token and origin boundaries', async t => {
  const f = await ownedHost(t); await f.start('workspace');
  const moduleResponse = await fetch(f.host.url + '/apps/notes/draft-recovery.mjs');
  assert.equal(moduleResponse.status, 200);
  assert.match(moduleResponse.headers.get('content-type'), /^text\/javascript\b/);
  assert.deepEqual(Buffer.from(await moduleResponse.arrayBuffer()), await readFile(new URL('./draft-recovery.mjs', import.meta.url)));
  for (const name of ['/apps/backup/draft-recovery.mjs', '/apps/notes/server.mjs', '/apps/notes/draft-recovery.http.test.mjs', '/apps/notes/draft-recovery.mjs.snapshot']) {
    assert.equal((await fetch(f.host.url + name)).status, 404, name);
  }
  const missingToken = await f.request('draft-recovery-scope', {}, { 'x-rea-token': '' });
  assert.equal(missingToken.response.status, 403);
  const foreignOrigin = await f.request('draft-recovery-scope', {}, { origin: 'https://foreign.invalid' });
  assert.equal(foreignOrigin.response.status, 403);
  const wrongType = await fetch(f.host.url + '/api/notes/draft-recovery-scope', {
    method: 'POST', headers: { 'x-rea-token': f.host.token, 'content-type': 'text/plain' }, body: '{}',
  });
  assert.equal(wrongType.status, 415);
  assert.match((await f.call('draft-recovery-scope')).scope, uuid);
});
