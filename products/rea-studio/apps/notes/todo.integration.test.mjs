import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { start } from '../../server.mjs';
import { readJex } from './jex.mjs';
import { todoState } from './core.mjs';

async function setup(t) {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'rea-notes-todo-http-')); let host = await start({ port: 0, dataDir });
  t.after(async () => { await host.close(); assert.equal(path.dirname(dataDir), path.resolve(os.tmpdir())); assert.ok(path.basename(dataDir).startsWith('rea-notes-todo-http-')); await rm(dataDir, { recursive: true, force: true }); });
  const call = async (action, input = {}, expectedStatus = 200) => { const response = await fetch(`${host.url}/api/notes/${action}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-rea-token': host.token }, body: JSON.stringify(input) }); const payload = await response.json(); assert.equal(response.status, expectedStatus, payload.error); return payload.result ?? payload; };
  return { call, staticResponse: pathname => fetch(new URL(pathname, host.url)), restart: async () => { await host.close(); host = await start({ port: 0, dataDir }); } };
}

test('real HTTP cold restarts retain to-do transitions, history, due metadata and static browser module delivery', async t => {
  const f = await setup(t); let note = await f.call('save', { title: 'Cold restart', body: 'saved body' }); note = (await f.call('todo-type', { id: note.id, revision: note.revision, type: 'todo' })).note; note = (await f.call('todo-due', { id: note.id, revision: note.revision, due: 1_800_000_000_123 })).note;
  await f.restart(); let opened = await f.call('get', { id: note.id }); assert.deepEqual(todoState(opened), { isTodo: true, due: 1_800_000_000_123, completed: 0 });
  opened = (await f.call('todo-completed', { id: opened.id, revision: opened.revision, completed: true })).note; const completed = opened.todo.completed;
  await f.restart(); opened = await f.call('get', { id: note.id }); assert.equal(opened.todo.completed, completed); assert.equal(opened.history.at(-1).todo.completed, 0); assert.equal((await f.call('list', { todoFilter: 'completed' })).notes[0].id, note.id);
  opened = await f.call('history-restore', { id: opened.id, revision: opened.revision, historyRevision: 3 }); assert.equal(opened.todo.completed, 0); assert.equal(opened.todo.due, 1_800_000_000_123);
  const sha = value => createHash('sha256').update(value).digest('hex'), clientResponse = await f.staticResponse('/apps/notes/client.mjs'); assert.equal(clientResponse.status, 200);
  const clientBytes = Buffer.from(await clientResponse.arrayBuffer()), expectedClient = await readFile(new URL('./client.mjs', import.meta.url)); assert.deepEqual(clientBytes, expectedClient); assert.equal(sha(clientBytes), sha(expectedClient));
  const imports = [...clientBytes.toString('utf8').matchAll(/import\s+\{[^}]+\}\s+from\s+'(\.\/[a-z-]+\.mjs)'/g)].map(match => match[1]); assert.deepEqual(imports, ['./markdown.mjs', './core.mjs', './draft-recovery.mjs']);
  const delivered = [];
  for (const specifier of imports) {
    const url = new URL(specifier, clientResponse.url), response = await f.staticResponse(url); assert.equal(response.status, 200, specifier); assert.equal(response.headers.get('content-type'), 'text/javascript; charset=utf-8');
    const actual = Buffer.from(await response.arrayBuffer()), expected = await readFile(new URL(specifier, import.meta.url)); assert.deepEqual(actual, expected); assert.equal(sha(actual), sha(expected)); delivered.push({ path: url.pathname, bytes: actual.length, sha256: sha(actual) });
  }
  assert.equal((await f.staticResponse('/apps/notes/todo.mjs')).status, 404);
  console.log(JSON.stringify({ notesTodoActualHttpModuleDelivery: { client: { bytes: clientBytes.length, sha256: sha(clientBytes) }, delivered, unchangedPublicModuleBoundary: false, explicitlyAddedRecoveryModule: true, actualBrowserExecution: false } }));
});

test('editing imported to-do preserves exact resource bytes, IDs, relationships and unrelated JEX metadata over restart/export', async t => {
  const f = await setup(t), bytes = await readFile(new URL('./fixtures/pinned-joplin.jex', import.meta.url)); await f.call('jex-import', { base64: bytes.toString('base64') }); const before = readJex(Buffer.from((await f.call('jex-export')).base64, 'base64')); let note = await f.call('get', { id: '3'.repeat(32) });
  note = (await f.call('todo-type', { id: note.id, revision: note.revision, type: 'note' })).note; note = (await f.call('todo-type', { id: note.id, revision: note.revision, type: 'todo' })).note; note = (await f.call('todo-due', { id: note.id, revision: note.revision, due: 1_800_000_000_123 })).note;
  await f.restart(); const result = await f.call('jex-export'), after = readJex(Buffer.from(result.base64, 'base64')), record = after.records.get(note.id), old = before.records.get(note.id);
  assert.equal(record.props.is_todo, '1'); assert.equal(record.props.todo_due, '1800000000123'); assert.equal(record.props.todo_completed, '0');
  for (const key of ['id', 'parent_id', 'created_time', 'user_created_time', 'author', 'source_url', 'latitude', 'longitude', 'altitude', 'application_data']) assert.equal(record.props[key], old.props[key]);
  assert.equal(record.title, old.title); assert.equal(record.body, old.body); assert.deepEqual(after.resources.get('5'.repeat(32)).bytes, before.resources.get('5'.repeat(32)).bytes); assert.deepEqual(after.records.get('7'.repeat(32)), before.records.get('7'.repeat(32)));
  const binary = await f.call('attachment-get', { noteId: note.id, id: '5'.repeat(32) }); assert.deepEqual(Buffer.from(binary.base64, 'base64'), before.resources.get('5'.repeat(32)).bytes);
});
