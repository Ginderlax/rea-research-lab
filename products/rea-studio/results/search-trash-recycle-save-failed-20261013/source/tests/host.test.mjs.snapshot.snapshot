import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { request } from 'node:http';
import { start } from '../server.mjs';
import { createStore, createWorkspace } from '../lib/storage.mjs';

async function temporary(t) {
  const directory = await fs.mkdtemp(join(tmpdir(), 'rea-studio-test-'));
  t.after(async () => {
    assert.ok(resolve(directory).startsWith(resolve(tmpdir())) && directory.includes('rea-studio-test-'));
    await fs.rm(directory, { recursive: true, force: true });
  });
  return directory;
}

test('record persistence, isolated keys and atomic replacement', async t => {
  const directory = await temporary(t);
  const store = await createStore(join(directory, 'records'));
  await store.set('first', { value: 1 });
  await store.set('first', { value: 2 });
  const reopened = await createStore(join(directory, 'records'));
  assert.deepEqual(await reopened.get('first'), { value: 2 });
  assert.deepEqual(await reopened.list(), ['first']);
  assert.deepEqual(await reopened.get('missing', []), []);
  await assert.rejects(store.set('../escape', {}), /Invalid record key/);
  assert.deepEqual((await fs.readdir(join(directory, 'records'))), ['first.json']);
});

test('workspace confinement rejects traversal, absolute paths and reserved names', async t => {
  const directory = await temporary(t);
  const workspace = await createWorkspace(join(directory, 'files'));
  assert.equal(workspace.resolve('nested/notes.txt'), join(directory, 'files', 'nested', 'notes.txt'));
  for (const path of ['../outside', 'a/../../outside', '..\\outside', 'C:\\outside', '/outside', '\\server\\share', 'CON', 'folder./a']) assert.throws(() => workspace.resolve(path));
  await fs.mkdir(workspace.resolve('nested'));
  await fs.writeFile(workspace.resolve('nested/notes.txt'), 'local');
  assert.equal(relative(workspace.root, workspace.resolve('nested/notes.txt')), join('nested', 'notes.txt'));
});

test('loopback host serves applications and enforces origin and session boundaries', async t => {
  const directory = await temporary(t);
  const instance = await start({ port: 0, dataDir: directory });
  t.after(() => instance.close());
  const health = await fetch(`${instance.url}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).applications, 10);
  const page = await fetch(instance.url);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.match(await page.text(), /REA Studio/);
  const session = await (await fetch(`${instance.url}/api/session`)).json();
  assert.equal(session.token, instance.token);
  assert.ok(session.apps.every(app => !app.fullFeatureParity && !app.universalSuperiorityEstablished));
  const noToken = await fetch(`${instance.url}/api/notes/list`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(noToken.status, 403);
  const badOrigin = await fetch(`${instance.url}/api/session`, { headers: { Origin: 'https://unrelated.example' } });
  assert.equal(badOrigin.status, 403);
  const badHostStatus = await new Promise((resolveStatus, reject) => {
    const req = request(`${instance.url}/api/session`, { headers: { Host: 'unrelated.example' } }, res => { res.resume(); resolveStatus(res.statusCode); });
    req.on('error', reject); req.end();
  });
  assert.equal(badHostStatus, 403);
  const hiddenBackend = await fetch(`${instance.url}/apps/vault/server.mjs`);
  assert.equal(hiddenBackend.status, 404);
  const invalidJson = await fetch(`${instance.url}/api/notes/list`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-REA-Token': instance.token }, body: '{broken' });
  assert.equal(invalidJson.status, 400);
  const oversized = await fetch(`${instance.url}/api/notes/list`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-REA-Token': instance.token }, body: 'x'.repeat(13 * 1024 * 1024) });
  assert.equal(oversized.status, 413);
  assert.match((await oversized.json()).error, /size limit/);
  const streamedStatus = await new Promise((resolveStatus, reject) => {
    const req = request(`${instance.url}/api/notes/list`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-REA-Token': instance.token } }, res => { res.resume(); resolveStatus(res.statusCode); });
    req.on('error', reject);
    const chunk = Buffer.alloc(1024 * 1024, 120);
    for (let i = 0; i < 13; i++) req.write(chunk);
    req.end();
  });
  assert.equal(streamedStatus, 413);
  assert.equal((await fetch(`${instance.url}/api/health`)).status, 200);
});
