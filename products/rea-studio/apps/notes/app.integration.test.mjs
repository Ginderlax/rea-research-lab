import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { start } from '../../server.mjs';
import { readJex } from './jex.mjs';
test('notes HTTP save/history/export/trash survive host restarts on real disk', async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'rea-notes-http-')); let host = await start({ port: 0, dataDir });
  t.after(async () => { await host.close(); assert.ok(path.resolve(dataDir).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(dataDir).startsWith('rea-notes-http-')); await rm(dataDir, { recursive: true, force: true }); });
  async function call(action, input = {}) { const response = await fetch(`${host.url}/api/notes/${action}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-rea-token': host.token }, body: JSON.stringify(input) }); const payload = await response.json(); assert.equal(response.status, 200, payload.error); return payload.result; }
  let note = await call('save', { title: 'Persistent note', body: '# Original 🧪', tags: ['test'], notebook: 'Lab' });
  note = await call('save', { ...note, body: '# Second 🧪' });
  await host.close(); host = await start({ port: 0, dataDir });
  const opened = await call('get', { id: note.id }); assert.equal(opened.body, '# Second 🧪'); assert.equal(opened.history[0].body, '# Original 🧪');
  assert.equal((await call('list', { search: 'Second', tag: 'test' })).total, 1);
  const exported = await call('export', {}); assert.equal(JSON.parse(exported.content).notes[0].id, note.id);
  note = await call('delete', { id: note.id, revision: note.revision }); assert.equal((await call('list')).total, 0);
  await host.close(); host = await start({ port: 0, dataDir }); assert.equal((await call('list', { trash: true })).total, 1);
  await call('restore', { id: note.id, revision: note.revision }); assert.equal((await call('list')).total, 1);
  assert.equal((await fetch(`${host.url}/apps/notes/markdown.mjs`)).status, 200);
});
test('JEX imports and binary attachments survive HTTP host restarts with exact IDs and metadata', async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'rea-notes-http-')); let host = await start({ port: 0, dataDir });
  t.after(async () => { await host.close(); assert.ok(path.resolve(dataDir).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(dataDir).startsWith('rea-notes-http-')); await rm(dataDir, { recursive: true, force: true }); });
  async function call(action, input = {}) { const response = await fetch(`${host.url}/api/notes/${action}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-rea-token': host.token }, body: JSON.stringify(input) }); const payload = await response.json(); assert.equal(response.status, 200, payload.error); return payload.result; }
  const fixture = await readFile(new URL('./fixtures/pinned-joplin.jex', import.meta.url));
  await call('jex-import', { base64: fixture.toString('base64') });
  await host.close(); host = await start({ port: 0, dataDir });
  let note = await call('get', { id: '3'.repeat(32) }); assert.equal(note.notebook, 'Research / Experiments');
  const oldBinary = await call('attachment-get', { noteId: note.id, id: '5'.repeat(32) }); assert.deepEqual(Buffer.from(oldBinary.base64, 'base64'), Buffer.from([0, 1, 127, 128, 255]));
  const added = await call('attachment-add', { id: note.id, revision: note.revision, filename: 'http.txt', mime: 'text/plain', base64: Buffer.from('HTTP 🧪').toString('base64') });
  await host.close(); host = await start({ port: 0, dataDir });
  note = await call('get', { id: note.id }); assert.equal(note.revision, 2); assert.ok(note.body.includes(added.attachment.id));
  const restored = await call('attachment-get', { noteId: note.id, id: added.attachment.id }); assert.equal(Buffer.from(restored.base64, 'base64').toString('utf8'), 'HTTP 🧪');
  const exported = readJex(Buffer.from((await call('jex-export')).base64, 'base64')); assert.equal(exported.resources.size, 2); assert.equal(exported.records.get(note.id).props.author, note.joplin.props.author); assert.equal(exported.records.get(note.id).props.parent_id, '2'.repeat(32));
});
