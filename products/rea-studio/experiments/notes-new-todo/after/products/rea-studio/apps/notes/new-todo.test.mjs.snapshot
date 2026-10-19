import test from 'node:test';
import assert from 'node:assert/strict';
import { memory, gate } from './notebook-trash-review-fixture.mjs';
import { todoState } from './core.mjs';
import { readJex } from './jex.mjs';

test('New to-do first save commits its note, notebook and initial open state in one state write', async () => {
  const f = memory(), set = f.store.set, commits = [];
  f.store.set = async (key, value) => { commits.push({ key, value: structuredClone(value) }); await set(key, value); };
  const note = await f.call('save', { title: 'One atomic task', body: 'First body', tags: ['task'], newTodo: true });
  assert.equal(commits.length, 1); assert.equal(commits[0].key, 'notes-state-v2');
  const first = commits[0].value.notes[note.id];
  assert.deepEqual(todoState(first), { isTodo: true, due: 0, completed: 0 });
  assert.equal(first.revision, 1); assert.deepEqual(first.history, []); assert.equal(first.createdAt, first.updatedAt);
  assert.equal(first.title, 'One atomic task'); assert.equal(first.body, 'First body'); assert.deepEqual(first.tags, ['task']);
  assert.equal(commits[0].value.records[first.notebookId].title, 'Notes');
  assert.deepEqual((await f.call('list', { todoFilter: 'open' })).notes.map(row => row.id), [note.id]);
  assert.equal((await f.call('list', { todoFilter: 'notes' })).total, 0);
});

test('New to-do rejects ambiguous creation flags and existing-note flags without any state mutation', async () => {
  const f = memory(), before = JSON.stringify(f.read());
  for (const newTodo of [null, 0, 1, 'true', {}, []]) {
    await assert.rejects(f.call('save', { title: 'Invalid', newTodo }), /explicit Boolean flag/);
    assert.equal(JSON.stringify(f.read()), before);
  }
  const ordinary = await f.call('save', { title: 'Ordinary note', newTodo: false });
  assert.equal(todoState(ordinary).isTodo, false); const saved = JSON.stringify(f.read());
  for (const newTodo of [true, false]) {
    await assert.rejects(f.call('save', { id: ordinary.id, revision: ordinary.revision, title: 'Must not overwrite', newTodo }), /only valid for an unsaved note/);
    assert.equal(JSON.stringify(f.read()), saved);
  }
  await assert.rejects(f.call('save', { title: '', newTodo: true }), /Give the note a title/);
  assert.equal(JSON.stringify(f.read()), saved);
});

test('New to-do failed state persistence leaves no partial note or notebook and permits explicit retry', async () => {
  const f = memory(), set = f.store.set, before = JSON.stringify(f.read());
  f.store.set = async () => { throw new Error('Synthetic new task persistence denied'); };
  await assert.rejects(f.call('save', { title: 'Retry task', notebook: 'Atomic folder', newTodo: true }), /persistence denied/);
  assert.equal(JSON.stringify(f.read()), before);
  f.store.set = set;
  const note = await f.call('save', { title: 'Retry task', notebook: 'Atomic folder', newTodo: true });
  assert.equal(Object.keys(f.read().notes).length, 1); assert.equal(note.revision, 1);
  assert.deepEqual(todoState(note), { isTodo: true, due: 0, completed: 0 });
  assert.equal((await f.call('notebook-list')).notebooks.filter(row => row.title === 'Atomic folder').length, 1);
});

test('New to-do snapshots caller fields before waiting for the serialized state queue', async () => {
  const f = memory(), g = gate(), set = f.store.set; let hold = true;
  f.store.set = async (key, value) => { if (hold) { hold = false; g.enter(); await g.held; } return set(key, value); };
  const first = f.call('save', { title: 'Queue owner' }); await g.started;
  const input = { title: 'Captured task', body: 'Captured body', tags: ['captured'], notebook: 'Captured folder', newTodo: true };
  const pending = f.call('save', input);
  input.title = 'Changed after call'; input.body = 'Changed body'; input.tags.push('not-captured'); input.notebook = 'Wrong folder'; input.newTodo = false;
  g.release(); await first; const note = await pending;
  assert.equal(note.title, 'Captured task'); assert.equal(note.body, 'Captured body'); assert.equal(note.notebook, 'Captured folder'); assert.deepEqual(note.tags, ['captured']);
  assert.deepEqual(todoState(note), { isTodo: true, due: 0, completed: 0 });
});

test('New to-do ordinary edits and saved-version restore preserve its initial task state', async () => {
  const f = memory(); let note = await f.call('save', { title: 'History task', body: 'Initial task body', newTodo: true });
  note = await f.call('save', { id: note.id, revision: note.revision, title: note.title, body: 'Edited body', notebookId: note.notebookId, tags: [] });
  assert.deepEqual(todoState(note), { isTodo: true, due: 0, completed: 0 }); assert.equal(note.history[0].body, 'Initial task body');
  note = (await f.call('todo-due', { id: note.id, revision: note.revision, due: 1_800_000_000_123 })).note;
  note = (await f.call('todo-completed', { id: note.id, revision: note.revision, completed: true })).note;
  assert.ok(todoState(note).completed > 0);
  note = await f.call('history-restore', { id: note.id, revision: note.revision, historyRevision: 1 });
  assert.equal(note.revision, 5); assert.equal(note.body, 'Initial task body');
  assert.deepEqual(todoState(note), { isTodo: true, due: 0, completed: 0 });
});

test('New to-do JEX preserves its supported task fields, parent and tags while excluding local history', async () => {
  const f = memory(); let note = await f.call('save', { title: 'JEX task', body: 'Task **body**', tags: ['work'], newTodo: true });
  note = await f.call('save', { id: note.id, revision: note.revision, title: note.title, body: 'Saved body revision two', notebookId: note.notebookId, tags: note.tags });
  const archive = await f.call('jex-export'), parsed = readJex(Buffer.from(archive.base64, 'base64')), id = note.id.replaceAll('-', ''), record = parsed.records.get(id);
  assert.equal(record.props.is_todo, '1'); assert.equal(record.props.todo_due, '0'); assert.equal(record.props.todo_completed, '0');
  assert.equal(record.props.parent_id, note.notebookId); assert.equal(record.body, note.body); assert.equal(record.title, note.title);
  assert.equal([...parsed.records.values()].filter(row => row.type === 6 && row.props.note_id === id).length, 1);
  const restored = memory(); await restored.call('jex-import', { base64: archive.base64 }); const imported = await restored.call('get', { id });
  assert.deepEqual(todoState(imported), { isTodo: true, due: 0, completed: 0 }); assert.deepEqual(imported.history, []); assert.deepEqual(imported.tags, ['work']);
});
