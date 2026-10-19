// Hosted experiment only. Uses the real local HTTP boundary on the owned runner.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { start } from '../../../server.mjs';

async function host(t) {
  const data = await mkdtemp(path.join(os.tmpdir(), 'rea-search-http-'));
  const server = await start({ port: 0, dataDir: data });
  t.after(async () => {
    await server.close();
    assert(path.resolve(data).startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert(path.basename(data).startsWith('rea-search-http-'));
    await rm(data, { recursive: true, force: true });
  });
  async function request(action, input = {}, token = server.token) {
    const response = await fetch(server.url + '/api/notes/' + action, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-rea-token': token }, body: JSON.stringify(input),
    });
    return { status: response.status, body: await response.json() };
  }
  async function call(action, input) { const response = await request(action, input); assert.equal(response.status, 200); return response.body.result; }
  return { request, call, state: () => readFile(path.join(data, 'notes/records/notes-state-v2.json')) };
}

test('real HTTP Filters field/metadata constraints preserve omitted and simple search behavior', async t => {
  const f = await host(t);
  const a = await f.call('save', { title: 'Release plan', body: 'ready for review', notebook: 'Lab', tags: ['work'] });
  await f.call('save', { title: 'Other', body: 'Release plan archived', notebook: 'Lab', tags: ['spam'] });
  const bytes = await f.state();
  const omitted = await f.call('list', { search: 'work ready' });
  assert.deepEqual(await f.call('list', { search: 'work ready', searchMode: 'simple' }), omitted);
  assert.deepEqual(omitted.notes.map(row => row.id), [a.id]);
  assert.deepEqual((await f.call('list', { search: 'title:"Release plan" -body:archived tag:work', searchMode: 'filters' })).notes.map(row => row.id), [a.id]);
  assert.deepEqual(await f.state(), bytes);
});

test('real HTTP structured selectors retain type/completion/trash restrictions and session authentication', async t => {
  const f = await host(t);
  const note = await f.call('save', { title: 'Note', body: 'ready', notebook: 'Lab', tags: ['work'] });
  const todo = await f.call('save', { title: 'Task', body: 'ready', notebook: 'Lab', tags: ['work'], newTodo: true });
  await f.call('delete', { id: note.id, revision: note.revision });
  const before = await f.state();
  const query = { searchMode: 'filters', search: 'notebook:Lab type:todo iscompleted:0 tag:work' };
  assert.deepEqual((await f.call('list', query)).notes.map(row => row.id), [todo.id]);
  assert.equal((await f.call('list', { ...query, todoFilter: 'notes' })).total, 0);
  assert.equal((await f.call('list', { ...query, trash: true })).total, 0);
  assert.equal((await f.request('list', query, 'invalid-session-token')).status, 403);
  assert.deepEqual(await f.state(), before);
});

test('real HTTP unsupported/malformed filters return errors while all persisted source-state bytes remain unchanged', async t => {
  const f = await host(t); await f.call('save', { title: 'Retained', body: 'unchanged' });
  const before = await f.state();
  for (const input of [{ searchMode: 'unknown' }, { searchMode: 'filters', search: 'any:1' }, { searchMode: 'filters', search: 'title:plan*' }, { searchMode: 'filters', search: 'x'.repeat(501) }]) {
    const response = await f.request('list', input); assert.equal(response.status, 400); assert.equal(typeof response.body.error, 'string');
    assert.deepEqual(await f.state(), before);
  }
});
