import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from './server.mjs';
import { todoState, changeTodo, todoMatches, todoTimestamp } from './core.mjs';
import { readJex } from './jex.mjs';

function fixture() {
  const data = new Map(); let writes = 0;
  const store = { get: async (key, fallback) => structuredClone(data.get(key) ?? fallback), set: async (key, value) => { writes++; data.set(key, structuredClone(value)); }, list: async prefix => [...data.keys()].filter(key => key.startsWith(prefix)) };
  return { data, store, writes: () => writes, call: (action, input = {}) => handle({ action, input, store }) };
}
const defaults = { isTodo: false, due: 0, completed: 0 };
const command = (call, note, action, fields) => call(action, { id: note.id, revision: note.revision, ...fields });

test('conversion, completion/reopening and due dates persist without changing title/body/identity/notebook/tags', async () => {
  const { call } = fixture(); let note = await call('save', { title: 'Release checklist', body: 'Keep body 🧪', notebook: 'Study', tags: ['release'] }); const before = structuredClone(note);
  note = (await command(call, note, 'todo-type', { type: 'todo' })).note;
  assert.deepEqual(todoState(note), { ...defaults, isTodo: true });
  note = (await command(call, note, 'todo-due', { due: 1_790_000_000_123 })).note;
  const lower = Date.now(); note = (await command(call, note, 'todo-completed', { completed: true })).note; const upper = Date.now();
  assert.ok(note.todo.completed >= lower && note.todo.completed <= upper); assert.equal(note.todo.due, 1_790_000_000_123);
  note = (await command(call, note, 'todo-completed', { completed: false })).note; assert.equal(note.todo.completed, 0);
  note = (await command(call, note, 'todo-type', { type: 'note' })).note; assert.deepEqual(note.todo, defaults);
  for (const key of ['id', 'title', 'body', 'notebook', 'notebookId', 'createdAt']) assert.equal(note[key], before[key]); assert.deepEqual(note.tags, before.tags); assert.equal(note.revision, 6);
});

test('already desired state is an explicit no-write/no-revision no-op but a stale no-op still rejects', async () => {
  const f = fixture(); let note = await f.call('save', { title: 'Idempotent' });
  const firstWrites = f.writes(); assert.equal((await command(f.call, note, 'todo-type', { type: 'note' })).changed, false); assert.equal(f.writes(), firstWrites);
  note = (await command(f.call, note, 'todo-type', { type: 'todo' })).note;
  const writes = f.writes(), before = JSON.stringify([...f.data]);
  for (const [action, fields] of [['todo-type', { type: 'todo' }], ['todo-completed', { completed: false }], ['todo-due', { due: 0 }]]) assert.equal((await command(f.call, note, action, fields)).changed, false);
  assert.equal(f.writes(), writes); assert.equal(JSON.stringify([...f.data]), before);
  await assert.rejects(f.call('todo-type', { id: note.id, revision: note.revision - 1, type: 'todo' }), /changed/);
});

test('all malformed commands and unsupported transitions reject before persistence', async () => {
  const f = fixture(); let note = await f.call('save', { title: 'Strict' });
  await assert.rejects(command(f.call, note, 'todo-completed', { completed: true }), /Convert/); await assert.rejects(command(f.call, note, 'todo-due', { due: 1 }), /Convert/);
  note = (await command(f.call, note, 'todo-type', { type: 'todo' })).note; const before = JSON.stringify([...f.data]);
  for (const type of ['', 'task', 1, null, undefined]) await assert.rejects(command(f.call, note, 'todo-type', { type }), /note or todo/);
  for (const completed of [0, 1, 'true', null, undefined]) await assert.rejects(command(f.call, note, 'todo-completed', { completed }), /Boolean/);
  for (const due of [-1, 0.1, NaN, Infinity, '1', null, undefined, 8.64e15 + 1]) await assert.rejects(command(f.call, note, 'todo-due', { due }), /timestamp/);
  assert.equal(JSON.stringify([...f.data]), before); assert.equal(todoTimestamp(8.64e15), 8.64e15);
});

test('concurrent explicit completion commands accept one revision and reject the stale rival', async () => {
  const f = fixture(); let note = await f.call('save', { title: 'Race' }); note = (await command(f.call, note, 'todo-type', { type: 'todo' })).note;
  const outcomes = await Promise.allSettled([true, false].map(completed => command(f.call, note, 'todo-completed', { completed })));
  assert.equal(outcomes.filter(row => row.status === 'fulfilled').length, 1); assert.equal(outcomes.filter(row => row.status === 'rejected').length, 1); assert.ok(todoState(await f.call('get', { id: note.id })).completed);
});

test('request primitives are frozen before a queued store read and cannot change command ownership', async () => {
  const f = fixture(), first = await f.call('save', { title: 'First' }), other = await f.call('save', { title: 'Other' });
  const input = { id: first.id, revision: first.revision, type: 'todo' }, pending = f.call('todo-type', input); input.id = other.id; input.type = 'note'; input.revision = -1;
  assert.equal((await pending).note.id, first.id); assert.equal(todoState(await f.call('get', { id: first.id })).isTodo, true); assert.equal(todoState(await f.call('get', { id: other.id })).isTodo, false);
});

test('failed atomic persistence preserves prior state and an explicit retry succeeds', async () => {
  const f = fixture(), note = await f.call('save', { title: 'Atomic' }), before = JSON.stringify([...f.data]), set = f.store.set;
  f.store.set = async () => { throw new Error('Synthetic metadata write denied'); };
  await assert.rejects(command(f.call, note, 'todo-type', { type: 'todo' }), /write denied/); assert.equal(JSON.stringify([...f.data]), before);
  f.store.set = set; assert.equal((await command(f.call, note, 'todo-type', { type: 'todo' })).note.revision, 2);
});

test('history restores captured to-do metadata as a fresh revision; earlier snapshots without this field retain current state', async () => {
  const f = fixture(); let note = await f.call('save', { title: 'History' }); note = (await command(f.call, note, 'todo-type', { type: 'todo' })).note; note = (await command(f.call, note, 'todo-due', { due: 99 })).note; const revision = note.revision;
  note = (await command(f.call, note, 'todo-completed', { completed: true })).note;
  note = await f.call('history-restore', { id: note.id, revision: note.revision, historyRevision: revision }); assert.deepEqual(note.todo, { isTodo: true, due: 99, completed: 0 });
  const saved = f.data.get('notes-state-v2'); delete saved.notes[note.id].history[0].todo;
  const restored = await f.call('history-restore', { id: note.id, revision: note.revision, historyRevision: 1 }); assert.deepEqual(restored.todo, note.todo);
});

test('JEX roundtrip carries edited local to-do fields and independent JSON copies retain validated state', async () => {
  const f = fixture(); let note = await f.call('save', { title: 'Export' }); note = (await command(f.call, note, 'todo-type', { type: 'todo' })).note; note = (await command(f.call, note, 'todo-due', { due: 123 })).note;
  const jex = await f.call('jex-export'), record = readJex(Buffer.from(jex.base64, 'base64')).records.get(note.id.replaceAll('-', '')); assert.equal(record.props.is_todo, '1'); assert.equal(record.props.todo_due, '123'); assert.equal(record.props.todo_completed, '0');
  const target = fixture(); await target.call('jex-import', { base64: jex.base64 }); assert.deepEqual(todoState(await target.call('get', { id: record.props.id })), note.todo);
  const bundle = await f.call('export'), result = await target.call('import-bundle', { content: bundle.content }); assert.deepEqual(todoState(await target.call('get', { id: result.ids[0] })), note.todo);
  const invalid = JSON.parse(bundle.content); invalid.notes[0].todo.due = -1; const before = JSON.stringify([...target.data]); await assert.rejects(target.call('import-bundle', { content: JSON.stringify(invalid) }), /timestamp/); assert.equal(JSON.stringify([...target.data]), before);
});

test('import-style metadata is read without normalization; changing type resets only due/completion fields', async () => {
  const note = { title: 'Retain', body: 'body', joplin: { props: { is_todo: '1', todo_due: '123', todo_completed: '456', author: 'Author' } } }, before = structuredClone(note);
  assert.deepEqual(todoState(note), { isTodo: true, due: 123, completed: 456 }); assert.equal(changeTodo(note, { action: 'todo-type', type: 'todo' }, 999), note);
  const changed = changeTodo(note, { action: 'todo-type', type: 'note' }, 999); assert.deepEqual(changed.todo, defaults); assert.deepEqual(changed.joplin, before.joplin); assert.deepEqual(note, before);
});

test('all five app filters distinguish note/open/completed state and combine with existing text/tag/notebook/trash filters', async () => {
  const f = fixture(), note = await f.call('save', { title: 'plain', tags: ['study'], notebook: 'Lab' }); let open = await f.call('save', { title: 'open', tags: ['study'], notebook: 'Lab' }), done = await f.call('save', { title: 'done', tags: ['other'] });
  open = (await command(f.call, open, 'todo-type', { type: 'todo' })).note; done = (await command(f.call, done, 'todo-type', { type: 'todo' })).note; done = (await command(f.call, done, 'todo-completed', { completed: true })).note;
  for (const [todoFilter, expected] of [['all', 3], ['notes', 1], ['todos', 2], ['open', 1], ['completed', 1]]) assert.equal((await f.call('list', { todoFilter })).total, expected);
  assert.equal((await f.call('list', { todoFilter: 'open', tag: 'study', search: 'open', notebook: 'Lab' })).notes[0].id, open.id);
  await command(f.call, open, 'delete', {}); assert.equal((await f.call('list', { todoFilter: 'open' })).total, 0); assert.equal((await f.call('list', { todoFilter: 'open', trash: true })).total, 1);
  await assert.rejects(f.call('list', { todoFilter: 'unknown' }), /filter/); await assert.rejects(fixture().call('list', { todoFilter: 'unknown' }), /filter/); assert.equal(todoMatches(note, 'notes'), true);
});

test('trashed, shared and locked note commands reject without changing saved bytes', async () => {
  const f = fixture(); let note = await f.call('save', { title: 'Bounded permissions' }); note = await command(f.call, note, 'delete', {}); let before = JSON.stringify([...f.data]); await assert.rejects(command(f.call, note, 'todo-type', { type: 'todo' }), /Restore/); assert.equal(JSON.stringify([...f.data]), before);
  note = await command(f.call, note, 'restore', {});
  for (const props of [{ share_id: 'shared' }, { is_locked: '1' }]) { const state = f.data.get('notes-state-v2'); state.notes[note.id].joplin = { props }; before = JSON.stringify([...f.data]); await assert.rejects(command(f.call, note, 'todo-type', { type: 'todo' }), /outside/); assert.equal(JSON.stringify([...f.data]), before); }
});
