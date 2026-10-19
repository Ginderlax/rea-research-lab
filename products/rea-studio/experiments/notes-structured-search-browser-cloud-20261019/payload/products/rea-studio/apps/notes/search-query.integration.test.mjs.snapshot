import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from './server.mjs';

function fixture() {
  const data = new Map(); let writes = 0;
  const store = { get: async (key, fallback) => structuredClone(data.get(key) ?? fallback), set: async (key, value) => { writes++; data.set(key, structuredClone(value)); }, list: async prefix => [...data.keys()].filter(key => key.startsWith(prefix)) };
  return { call: (action, input) => handle({ action, input, store }), snapshot: () => JSON.stringify([...data]), writes: () => writes };
}

test('existing omitted/simple mode stays AND substring over metadata, explicit Filters adds field constraints', async () => {
  const f = fixture();
  const first = await f.call('save', { title: 'Release plan', body: 'ready for review', notebook: 'Lab', tags: ['work'] });
  const second = await f.call('save', { title: 'Other', body: 'Release plan archived', notebook: 'Lab', tags: ['spam'] });
  const before = f.snapshot(), writes = f.writes();
  const legacy = await f.call('list', { search: 'work ready' });
  assert.deepEqual(await f.call('list', { search: 'work ready', searchMode: 'simple' }), legacy);
  assert.deepEqual(legacy.notes.map(note => note.id), [first.id]);
  assert.deepEqual((await f.call('list', { search: 'title:"Release plan" -body:archived', searchMode: 'filters' })).notes.map(note => note.id), [first.id]);
  assert.equal((await f.call('list', { search: 'title:Release', searchMode: 'simple' })).total, 0);
  assert.equal((await f.call('list', { search: 'work', searchMode: 'filters' })).total, 0);
  assert.equal((await f.call('list', { search: 'tag:work', searchMode: 'filters' })).notes[0].id, first.id);
  assert.equal((await f.call('get', { id: second.id })).body, second.body);
  assert.equal(f.snapshot(), before); assert.equal(f.writes(), writes);
});

test('existing selectors remain independent restrictions and search does not expose saved trash', async () => {
  const f = fixture();
  const normal = await f.call('save', { title: 'Plan', body: 'ready', notebook: 'Lab', tags: ['work'] });
  const todo = await f.call('save', { title: 'Task', body: 'ready', notebook: 'Lab', tags: ['work'], newTodo: true });
  await f.call('delete', { id: normal.id, revision: normal.revision });
  const before = f.snapshot(), writes = f.writes();
  const call = extra => f.call('list', { search: 'notebook:Lab tag:work', searchMode: 'filters', ...extra });
  assert.deepEqual((await call({})).notes.map(note => note.id), [todo.id]);
  assert.equal((await call({ tag: 'spam' })).total, 0);
  assert.equal((await call({ todoFilter: 'notes' })).total, 0);
  assert.deepEqual((await call({ trash: true })).notes.map(note => note.id), [normal.id]);
  assert.equal((await call({ notebookId: 'f'.repeat(32) })).total, 0);
  assert.equal(f.snapshot(), before); assert.equal(f.writes(), writes);
});

test('invalid mode and malformed/unsupported queries preserve every persisted byte and write count', async () => {
  const f = fixture(); await f.call('save', { title: 'Retained', body: 'draft recovery remains separate' });
  const before = f.snapshot(), writes = f.writes();
  for (const input of [{ searchMode: 'unknown' }, { searchMode: false }, { searchMode: 'filters', search: 'any:1' }, { searchMode: 'filters', search: '-type:todo' }, { searchMode: 'filters', search: 'type:TODO' }, { searchMode: 'filters', search: 'title:plan*' }, { searchMode: 'filters', search: 'x'.repeat(501) }, { searchMode: 'filters', search: '\0' }]) {
    await assert.rejects(f.call('list', input)); assert.equal(f.snapshot(), before); assert.equal(f.writes(), writes);
  }
});
