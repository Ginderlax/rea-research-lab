import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { start } from '../../server.mjs';
test('editor HTTP file operations survive a host restart and retain traversal protection', async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'rea-editor-http-')); let host = await start({ port: 0, dataDir });
  t.after(async () => { await host.close(); assert.ok(path.resolve(dataDir).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(dataDir).startsWith('rea-editor-http-')); await rm(dataDir, { recursive: true, force: true }); });
  async function call(action, input) { const response = await fetch(`${host.url}/api/editor/${action}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-rea-token': host.token }, body: JSON.stringify(input) }); const payload = await response.json(); assert.equal(response.status, 200, payload.error); return payload.result; }
  const initial = await call('save', { path: 'demo/hello.txt', content: 'Persistent 🧪\n', revision: null });
  await host.close(); host = await start({ port: 0, dataDir });
  const reopened = await call('read', { path: initial.path }); assert.equal(reopened.content, initial.content); assert.equal(reopened.revision, initial.revision);
  const diff = await call('diff', { before: reopened.content, after: 'Persistent 🧪\nUpdated\n' }); assert.equal(diff.cost, 1);
  const response = await fetch(`${host.url}/api/editor/read`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-rea-token': host.token }, body: JSON.stringify({ path: '../outside.txt' }) }); assert.equal(response.status, 400); assert.match((await response.json()).error, /traversal/);
  assert.equal((await fetch(`${host.url}/apps/editor/client.mjs`)).status, 200);
});
