import test from 'node:test';
import assert from 'node:assert/strict';
import { gate, find } from './notebook-trash-review-fixture.mjs';
import { todoState } from './core.mjs';
import { copyRecord, recoveryStore, recoveryUi, saves, primaryStatus, textOf } from './draft-recovery-test-fixture.mjs';

const check = (name, body) => test(name, { timeout: 20000 }, body);
const editedCopy = (store, title, body) => store.when(s => [...s.rows.values()].some(row => row.title === title && row.body === body));
const listCopy = (store, title) => [...store.rows.values()].find(row => row.title === title);
async function settledUI(predicate, message) {
  for (let turn = 0; turn < 80; turn++) { if (predicate()) return; await Promise.resolve(); }
  assert.fail(message);
}

check('draft recovery preserves unsaved fields and parent/type across a remount and creates no note until an acknowledged explicit Save', async t => {
  const f = await recoveryUi(t); const before = f.read();
  await f.click(f.byText('New to-do')); await f.type('Note title', 'Unsaved recoverable task');
  await f.type('Notebook', f.child); await f.type('Note tags', 'work,  field'); await f.type('Markdown note', 'Recover these 🧪 words');
  await editedCopy(f.store, 'Unsaved recoverable task', 'Recover these 🧪 words'); await f.mount(); await f.refresh();
  assert.equal(saves(f).length, 0); assert.deepEqual(f.read(), before);
  const recover = f.recoverButton('Unsaved recoverable task', true); assert.equal(recover.disabled, true);
  assert.match(textOf(f.entry('Unsaved recoverable task')), /may already (?:have )?completed/i);
  await f.acknowledge('Unsaved recoverable task'); await f.click(recover);
  assert.deepEqual(f.fields(), ['Unsaved recoverable task', 'Recover these 🧪 words', 'work,  field', f.child]);
  assert.equal(saves(f).length, 0); assert.deepEqual(f.read(), before);
  assert.equal(primaryStatus(f).textContent, 'Recovery copy opened. Saving creates a separate note.');
  await f.click(f.byText('Save note'));
  assert.equal(saves(f).length, 1); assert.equal(saves(f)[0].input.newTodo, true); assert.equal(saves(f)[0].input.revision, 0);
  assert.equal(saves(f)[0].input.id, undefined);
  const created = Object.values(f.read().notes).filter(note => note.id !== f.original.id);
  assert.equal(created.length, 1); assert.equal(created[0].notebookId, f.child); assert.equal(created[0].revision, 1);
  assert.deepEqual(todoState(created[0]), { isTodo: true, due: 0, completed: 0 }); assert.deepEqual(created[0].history, []);
});

check('recovery provenance never becomes an in-place update even when the original note advanced to a newer revision', async t => {
  const f = await recoveryUi(t);
  f.store.rows.set(copyRecord().id, copyRecord({ title: 'Separate recovered note', sourceNoteId: f.original.id, sourceRevision: 1, notebookId: f.child }));
  const advanced = await f.call('save', { ...f.original, body: 'A newer actual saved revision' });
  await f.refresh(); await f.acknowledge('Separate recovered note'); await f.click(f.recoverButton('Separate recovered note'));
  assert.equal(saves(f).length, 0); await f.click(f.byText('Save note'));
  assert.equal(saves(f).length, 1); assert.equal(saves(f)[0].input.id, undefined); assert.equal(saves(f)[0].input.revision, 0);
  assert.equal('newTodo' in saves(f)[0].input, false);
  assert.deepEqual(f.read().notes[f.original.id], advanced);
  const copy = Object.values(f.read().notes).find(note => note.title === 'Separate recovered note');
  assert(copy); assert.notEqual(copy.id, f.original.id); assert.equal(copy.revision, 1); assert.equal(copy.notebookId, f.child);
});

check('an unacknowledged committed first Save recovers only as an explicitly chosen separate copy after reload', async t => {
  const g = gate(); let hold = true; t.after(g.release);
  const f = await recoveryUi(t, { hook: async ({ action, input }) => { if (action === 'save' && input.newTodo && hold) { hold = false; g.enter(); await g.held; } } });
  await f.click(f.byText('New to-do')); await f.type('Note title', 'Ambiguous first Save'); await f.type('Markdown note', 'First committed words');
  const pending = f.click(f.byText('Save note')); await g.started;
  const committed = Object.values(f.read().notes).find(note => note.title === 'Ambiguous first Save'); assert(committed);
  await f.type('Markdown note', 'Newer words before reload'); await editedCopy(f.store, 'Ambiguous first Save', 'Newer words before reload');
  assert.equal(listCopy(f.store, 'Ambiguous first Save').pendingSave, true);
  await f.mount(); await f.refresh();
  const recover = f.recoverButton('Ambiguous first Save', true); assert.equal(recover.disabled, true);
  assert.equal(saves(f).length, 1); assert.match(textOf(f.entry('Ambiguous first Save')), /may already (?:have )?completed/i);
  await f.acknowledge('Ambiguous first Save'); await f.click(recover); assert.equal(saves(f).length, 1);
  await f.click(f.byText('Save note')); g.release(); await pending;
  const matches = Object.values(f.read().notes).filter(note => note.title === 'Ambiguous first Save');
  assert.equal(matches.length, 2); assert.notEqual(matches[0].id, matches[1].id);
  assert.deepEqual(f.read().notes[committed.id], committed);
  assert(matches.some(note => note.id !== committed.id && note.body === 'Newer words before reload' && todoState(note).isTodo));
});

check('an old held Save cannot clear or rewrite a newer editor recovery owner', async t => {
  const g = gate(); let hold = true; t.after(g.release);
  const f = await recoveryUi(t, { hook: async ({ action }) => { if (action === 'save' && hold) { hold = false; g.enter(); await g.held; } } });
  await f.type('Note title', 'Old submitted editor'); await f.type('Markdown note', 'Old submitted body');
  const pending = f.click(f.byText('Save note')); await g.started;
  await f.click(f.byText('New note')); await f.type('Note title', 'Newer owner'); await f.type('Markdown note', 'Keep this later editor');
  await editedCopy(f.store, 'Newer owner', 'Keep this later editor');
  const owned = structuredClone(listCopy(f.store, 'Newer owner')), status = primaryStatus(f).textContent;
  g.release(); await pending; await f.refresh();
  assert.deepEqual(f.store.rows.get(owned.id), owned); assert.equal(primaryStatus(f).textContent, status);
  assert.deepEqual(f.fields().slice(0, 2), ['Newer owner', 'Keep this later editor']);
});

check('quota and corrupt-list failures preserve the active draft and do not prevent explicit server Save', async t => {
  const store = recoveryStore(), f = await recoveryUi(t, { store });
  store.failPut = Object.assign(new Error('Synthetic browser quota denied'), { name: 'QuotaExceededError' });
  await f.type('Note title', 'Still save this note'); await f.type('Markdown note', 'Keep despite quota');
  await store.when(s => s.puts.some(row => row.body === 'Keep despite quota'));
  await settledUI(() => /quota denied/i.test(f.byLabel('Draft recovery status').textContent), 'The asynchronous storage failure must be visible before any explicit refresh');
  assert.match(f.byLabel('Draft recovery status').textContent, /Recovery copy could not be saved\. Your draft is still open:.*quota denied/i);
  const fields = f.fields(); store.failList = new Error('Malformed stored recovery record refused'); await f.refresh();
  assert.deepEqual(f.fields(), fields); assert.equal(saves(f).length, 0);
  await f.click(f.byText('Save note'));
  assert.equal(saves(f).length, 1); assert(Object.values(f.read().notes).some(note => note.title === fields[0] && note.body === fields[1]));
});

check('discarding an older displayed version cannot delete another tab newer recovery record', async t => {
  const initial = copyRecord({ title: 'Cross-tab preserved', notebookId: '__default__' }), store = recoveryStore([initial]);
  const f = await recoveryUi(t, { store }); await f.refresh();
  const entry = f.entry(initial.title), discard = find(entry, node => node.tagName === 'button' && node.textContent === 'Discard recovery copy');
  const newer = copyRecord({ title: initial.title, body: 'Another tab newer text', version: 2, updatedAt: initial.updatedAt + 1 }); store.rows.set(newer.id, newer);
  await f.click(discard);
  assert.deepEqual(store.removes.at(-1), { id: initial.id, version: 1 }); assert.deepEqual(store.rows.get(newer.id), newer);
  assert.equal(saves(f).length, 0); await f.refresh(); await f.acknowledge(newer.title); await f.click(f.recoverButton(newer.title));
  assert.equal(f.byLabel('Markdown note').value, newer.body); assert.equal(saves(f).length, 0);
});

check('explicit recovery discard leaves the active editor intact and later typing starts a fresh recoverable identity', async t => {
  const f = await recoveryUi(t); await f.type('Note title', 'Editable after discard'); await f.type('Markdown note', 'Before deliberate discard');
  await editedCopy(f.store, 'Editable after discard', 'Before deliberate discard'); await f.refresh();
  const old = structuredClone(listCopy(f.store, 'Editable after discard')), before = f.fields();
  const discard = find(f.entry(old.title), node => node.tagName === 'button' && node.textContent === 'Discard recovery copy');
  await f.click(discard); assert.equal(f.store.rows.has(old.id), false); assert.deepEqual(f.fields(), before); assert.equal(saves(f).length, 0);
  await f.type('Markdown note', 'After deliberate discard'); await editedCopy(f.store, 'Editable after discard', 'After deliberate discard');
  const later = listCopy(f.store, 'Editable after discard'); assert.notEqual(later.id, old.id); assert.equal(f.store.rows.has(old.id), false);
});

check('discard cancellation and exports preserve the unsaved recovery boundary without treating a copy as a saved item', async t => {
  const f = await recoveryUi(t); await f.click(f.byText('New to-do')); await f.type('Note title', 'Export-excluded copy'); await f.type('Markdown note', 'Only a browser recovery record');
  await editedCopy(f.store, 'Export-excluded copy', 'Only a browser recovery record');
  const before = structuredClone(listCopy(f.store, 'Export-excluded copy')), fields = f.fields(); window.confirm = () => false;
  await f.click(f.byText('New note')); assert.deepEqual(f.fields(), fields); assert.deepEqual(f.store.rows.get(before.id), before);
  const json = JSON.parse((await f.call('export')).content); assert.equal(json.notes.length, 1); assert.equal(json.notes[0].id, f.original.id);
  assert.equal((await f.call('jex-export')).notes, 1); assert.equal(saves(f).length, 0);
  await f.mount(); await f.refresh(); const ack = find(f.entry(before.title), node => node.attributes['aria-label'] === 'I want a separate note from this recovery copy');
  assert.equal(Boolean(ack.checked), false); assert.equal(f.recoverButton(before.title, true).disabled, true);
});

check('rapid input retains at most one active storage write and one latest pending snapshot while preserving the final complete text', async t => {
  const store = recoveryStore(), put = store.put.bind(store), held = gate(); let active = 0, maximum = 0, calls = 0;
  t.after(held.release);
  store.put = async value => {
    calls++; active++; maximum = Math.max(maximum, active);
    try { if (calls === 1) { held.enter(); await held.held; } return await put(value); }
    finally { active--; }
  };
  const f = await recoveryUi(t, { store }); await f.type('Note title', 'Coalesced recovery'); await held.started;
  let latest;
  for (let index = 0; index < 80; index++) { latest = index + ':' + 'text'.repeat(1024); await f.type('Markdown note', latest); }
  assert.equal(calls, 1); assert.equal(maximum, 1);
  held.release(); await editedCopy(store, 'Coalesced recovery', latest); await f.refresh();
  assert(calls <= 2, 'Only the active write and latest coalesced snapshot may reach the store');
  assert.equal(maximum, 1); assert.equal(f.byLabel('Markdown note').value, latest); assert.equal(saves(f).length, 0);
});

check('a delayed recovery-open read cannot replace later typing or a newly selected editor', async t => {
  const source = copyRecord({ title: 'Delayed recovery entry' }), store = recoveryStore([source]), originalList = store.list.bind(store);
  let pendingGate = null;
  store.list = async () => { const result = await originalList(), held = pendingGate; pendingGate = null; if (held) { held.enter(); await held.held; } return result; };
  const f = await recoveryUi(t, { store });
  for (const changeEditor of [false, true]) {
    await f.refresh(); await f.acknowledge(source.title); const held = gate(); t.after(held.release); pendingGate = held;
    const opening = f.click(f.recoverButton(source.title)); await held.started;
    if (changeEditor) await f.click(f.byText('New note'));
    const title = 'Later owner ' + changeEditor, body = 'Typing while recovery read is delayed ' + changeEditor;
    await f.type('Note title', title); await f.type('Markdown note', body); await editedCopy(store, title, body);
    const fields = f.fields(), status = primaryStatus(f).textContent, own = structuredClone(listCopy(store, title));
    held.release(); await opening;
    assert.deepEqual(f.fields(), fields); assert.equal(primaryStatus(f).textContent, status); assert.deepEqual(store.rows.get(own.id), own);
    assert.deepEqual(store.rows.get(source.id), source); assert.equal(saves(f).length, 0);
  }
});

check('a missing recovered notebook has an explicit default-Notes warning before a separate copy can be saved', async t => {
  const source = copyRecord({ title: 'Missing notebook recovery', notebookId: '2179354e-f960-4703-a60e-25dacdf3ca3f' }), store = recoveryStore([source]);
  const f = await recoveryUi(t, { store }), before = f.read(); await f.refresh();
  await f.acknowledge(source.title); await f.click(f.recoverButton(source.title));
  assert.equal(f.byLabel('Notebook').value, '__default__');
  assert.equal(primaryStatus(f).textContent, 'Recovery copy opened. Its earlier notebook is unavailable. This separate copy will be saved to Notes unless you choose another notebook.');
  assert.deepEqual(f.read(), before); assert.equal(saves(f).length, 0);
  await f.click(f.byText('Save note'));
  const created = Object.values(f.read().notes).find(note => note.title === source.title);
  assert(created); assert.equal(created.notebook, 'Notes'); assert.notEqual(created.id, f.original.id); assert.equal(created.revision, 1);
});
