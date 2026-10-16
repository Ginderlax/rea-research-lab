import test from 'node:test';
import assert from 'node:assert/strict';
import { ui, gate, find } from './notebook-trash-review-fixture.mjs';
import { todoState } from './core.mjs';
const status = f => find(f.root, node => node.attributes.role === 'status');
const mutations = f => f.calls.filter(row => row.action.startsWith('todo-'));

test('saved-note UI converts, completes, reopens, edits/clears due metadata and filters actual saved results', async t => {
  const f = await ui(t); await f.open();
  assert.equal(f.byText('Mark complete').disabled, true); await f.click(f.byText('Convert to to-do')); assert.equal(todoState(f.read().notes[f.note.id]).isTodo, true);
  await f.click(f.byText('Mark complete')); assert.ok(todoState(f.read().notes[f.note.id]).completed); await f.click(f.byText('Mark incomplete')); assert.equal(todoState(f.read().notes[f.note.id]).completed, 0);
  const due = f.byLabel('To-do due date in local time'); due.value = '2027-04-05T12:34:56.123'; await f.click(f.byText('Set due date')); assert.equal(todoState(f.read().notes[f.note.id]).due, new Date('2027-04-05T12:34:56.123').getTime());
  await f.click(f.byText('Clear due date')); assert.equal(todoState(f.read().notes[f.note.id]).due, 0);
  const filter = f.byLabel('Filter note type'); filter.value = 'notes'; await filter.onchange(); assert.equal(find(f.root, node => node.tagName === 'button' && node.textContent.startsWith('A note ·')), null);
  filter.value = 'open'; await filter.onchange(); assert.ok(find(f.root, node => node.tagName === 'button' && node.textContent.startsWith('A note ·')));
  await f.click(f.byText('Convert to note')); assert.deepEqual(todoState(f.read().notes[f.note.id]), { isTodo: false, due: 0, completed: 0 });
});

test('unsaved drafts submit no to-do command and retain every typed field', async t => {
  const f = await ui(t); await f.open(); f.type(f.byLabel('Note title'), 'Newer title'); f.type(f.byLabel('Note tags'), 'new-tag'); f.type(f.byLabel('Markdown note'), 'Newer body'); const before = JSON.stringify(f.read()), count = mutations(f).length;
  await f.click(f.byText('Convert to to-do')); assert.match(status(f).textContent, /Save your draft/); assert.equal(mutations(f).length, count); assert.equal(JSON.stringify(f.read()), before); assert.equal(f.byLabel('Note title').value, 'Newer title'); assert.equal(f.byLabel('Markdown note').value, 'Newer body');
});

test('blank or invalid due inputs submit nothing; unchanged millisecond precision is retained', async t => {
  const f = await ui(t); await f.open(); await f.click(f.byText('Convert to to-do')); const due = f.byLabel('To-do due date in local time'), before = mutations(f).length;
  for (const value of ['', 'invalid', '1960-01-01T00:00:00.000']) { due.value = value; await f.click(f.byText('Set due date')); assert.equal(mutations(f).length, before); }
  due.value = '2027-04-05T12:34:56.123'; await f.click(f.byText('Set due date')); const saved = todoState(f.read().notes[f.note.id]).due, revision = f.read().notes[f.note.id].revision; await f.click(f.byText('Set due date'));
  assert.equal(todoState(f.read().notes[f.note.id]).due, saved); assert.equal(f.read().notes[f.note.id].revision, revision); assert.match(status(f).textContent, /already current/);
});

test('actual committed held response blocks duplicate mutations and preserves a newer typed draft at the new revision', async t => {
  const g = gate(); let hold = true; const f = await ui(t, async ({ action }) => { if (action === 'todo-type' && hold) { g.enter(); await g.held; } }); await f.open();
  const pending = f.click(f.byText('Convert to to-do')); await g.started; assert.equal(todoState(f.read().notes[f.note.id]).isTodo, true); assert.equal(f.byText('Convert to to-do').disabled, true);
  await f.byText('Convert to to-do').onclick(); assert.equal(mutations(f).length, 1);
  f.type(f.byLabel('Markdown note'), 'Typed while committed response was held'); hold = false; g.release(); await pending;
  assert.equal(f.byLabel('Markdown note').value, 'Typed while committed response was held'); assert.match(status(f).textContent, /newer note draft is retained/);
  await f.click(f.byText('Save note')); assert.equal(f.read().notes[f.note.id].body, 'Typed while committed response was held'); assert.equal(f.read().notes[f.note.id].revision, 3); assert.equal(todoState(f.read().notes[f.note.id]).isTodo, true);
});

test('selecting a new draft while a committed response is held keeps the new editor ownership', async t => {
  const g = gate(); const f = await ui(t, async ({ action }) => { if (action === 'todo-type') { g.enter(); await g.held; } }); await f.open(); const pending = f.click(f.byText('Convert to to-do')); await g.started;
  await f.click(f.byText('New note')); f.type(f.byLabel('Note title'), 'Independent draft'); f.type(f.byLabel('Markdown note'), 'Must survive'); g.release(); await pending;
  assert.equal(f.byLabel('Note title').value, 'Independent draft'); assert.equal(f.byLabel('Markdown note').value, 'Must survive'); assert.equal(f.byText('Convert to to-do').disabled, true); assert.equal(todoState(f.read().notes[f.note.id]).isTodo, true);
});

test('disposing after actual commit suppresses every late read/publication without undoing saved state', async t => {
  const g = gate(); const f = await ui(t, async ({ action }) => { if (action === 'todo-type') { g.enter(); await g.held; } }); await f.open(); const pending = f.click(f.byText('Convert to to-do')); await g.started;
  f.dispose(); const text = status(f).textContent, count = f.calls.length; g.release(); await pending;
  assert.equal(status(f).textContent, text); assert.equal(f.calls.length, count); assert.equal(todoState(f.read().notes[f.note.id]).isTodo, true); await f.byText('Convert to to-do').onclick(); assert.equal(f.calls.length, count);
});

test('failed persistence restores enabled controls and supports a later explicit retry', async t => {
  const f = await ui(t); await f.open(); const before = JSON.stringify(f.read()), set = f.store.set; f.store.set = async () => { throw new Error('Synthetic to-do write denied'); };
  await f.click(f.byText('Convert to to-do')); assert.equal(JSON.stringify(f.read()), before); assert.equal(f.byText('Convert to to-do').disabled, false); assert.match(status(f).textContent, /write denied/);
  f.store.set = set; await f.click(f.byText('Convert to to-do')); assert.equal(todoState(f.read().notes[f.note.id]).isTodo, true); assert.equal(f.byText('Convert to note').disabled, false);
});

test('a held rejected write cannot publish its failure into a newer note editor generation', async t => {
  const f = await ui(t); await f.open(); const g = gate(), set = f.store.set, before = JSON.stringify(f.read());
  f.store.set = async () => { g.enter(); await g.held; throw new Error('Synthetic held rejected to-do write'); };
  const pending = f.click(f.byText('Convert to to-do')); await g.started; await f.click(f.byText('New note')); f.type(f.byLabel('Note title'), 'New editor owns this'); f.type(f.byLabel('Markdown note'), 'New draft content'); const ownedStatus = status(f).textContent;
  g.release(); await pending; f.store.set = set;
  assert.equal(JSON.stringify(f.read()), before); assert.equal(f.byLabel('Note title').value, 'New editor owns this'); assert.equal(f.byLabel('Markdown note').value, 'New draft content'); assert.equal(status(f).textContent, ownedStatus); assert.match(ownedStatus, /Unsaved draft/); assert.equal(mutations(f).length, 1);
});

test('typing after accepted state while list refresh is held retains the newer unsaved-draft status', async t => {
  const g = gate(); let hold = false; const f = await ui(t, async ({ action }) => { if (hold && action === 'list') { g.enter(); await g.held; } }); await f.open(); hold = true;
  const pending = f.click(f.byText('Convert to to-do')); await g.started; assert.equal(todoState(f.read().notes[f.note.id]).isTodo, true); assert.ok(f.byText('Convert to note'));
  f.type(f.byLabel('Note title'), 'Typed after acceptance'); f.type(f.byLabel('Markdown note'), 'Not yet saved'); const ownedStatus = status(f).textContent; hold = false; g.release(); await pending;
  assert.equal(f.byLabel('Note title').value, 'Typed after acceptance'); assert.equal(f.byLabel('Markdown note').value, 'Not yet saved'); assert.equal(status(f).textContent, ownedStatus); assert.match(ownedStatus, /Unsaved draft/);
  await f.click(f.byText('Save note')); assert.equal(f.read().notes[f.note.id].body, 'Not yet saved'); assert.equal(f.read().notes[f.note.id].title, 'Typed after acceptance'); assert.equal(todoState(f.read().notes[f.note.id]).isTodo, true);
});
