import test from 'node:test';
import assert from 'node:assert/strict';
import { ui, gate, find } from './notebook-trash-review-fixture.mjs';
import { todoState } from './core.mjs';
const status = f => find(f.root, node => node.attributes.role === 'status');
const saves = f => f.calls.filter(row => row.action === 'save');
const typeDraft = (f, title, body = 'Draft task body') => { f.type(f.byLabel('Note title'), title); f.type(f.byLabel('Markdown note'), body); };
const created = f => Object.values(f.read().notes).filter(note => note.id !== f.note.id);

test('New to-do starts an unsaved typed draft and creates an open task only on explicit Save', async t => {
  const f = await ui(t), before = JSON.stringify(f.read()), calls = f.calls.length;
  await f.click(f.byText('New to-do')); assert.equal(f.calls.length, calls); assert.equal(JSON.stringify(f.read()), before);
  assert.match(status(f).textContent, /New to-do draft/); assert.equal(f.byText('Mark complete').disabled, true);
  typeDraft(f, 'First explicit task'); f.type(f.byLabel('Note tags'), 'work');
  const notebook = f.byLabel('Notebook'); notebook.value = f.child; notebook.oninput();
  await f.click(f.byText('Save note'));
  assert.equal(saves(f).length, 1); assert.equal(saves(f)[0].input.newTodo, true); assert.equal(created(f).length, 1);
  const note = created(f)[0]; assert.equal(note.notebookId, f.child); assert.equal(note.revision, 1); assert.deepEqual(note.history, []);
  assert.deepEqual(todoState(note), { isTodo: true, due: 0, completed: 0 }); assert.deepEqual(note.tags, ['work']);
  assert.equal(f.byText('Mark complete').disabled, false); assert.match(status(f).textContent, /Saved revision 1/);
});

test('New to-do honours discard cancellation and New note resets an accepted task draft type', async t => {
  const f = await ui(t); typeDraft(f, 'Keep this ordinary draft', 'Keep this body'); const before = JSON.stringify(f.read());
  window.confirm = () => false; await f.click(f.byText('New to-do'));
  assert.equal(f.byLabel('Note title').value, 'Keep this ordinary draft'); assert.equal(f.byLabel('Markdown note').value, 'Keep this body'); assert.equal(JSON.stringify(f.read()), before);
  window.confirm = () => true; await f.click(f.byText('New to-do')); typeDraft(f, 'Discarded task draft');
  await f.click(f.byText('New note')); typeDraft(f, 'Ordinary after task'); await f.click(f.byText('Save note'));
  assert.equal(saves(f).length, 1); assert.equal('newTodo' in saves(f)[0].input, false); assert.equal(todoState(created(f)[0]).isTodo, false);
});

test('New to-do real committed held save blocks duplicates and retains a newer body at the returned revision', async t => {
  const g = gate(); let hold = true;
  const f = await ui(t, async ({ action, input }) => { if (action === 'save' && input.newTodo && hold) { g.enter(); await g.held; } });
  await f.click(f.byText('New to-do')); typeDraft(f, 'Held task', 'First submitted body'); const pending = f.click(f.byText('Save note')); await g.started;
  assert.equal(created(f).length, 1); assert.equal(created(f)[0].body, 'First submitted body'); assert.equal(todoState(created(f)[0]).isTodo, true);
  assert.equal(f.byText('Save note').disabled, true); await f.byText('Save note').onclick(); assert.equal(saves(f).length, 1);
  f.type(f.byLabel('Markdown note'), 'Newer body while response is held'); hold = false; g.release(); await pending;
  assert.equal(f.byLabel('Markdown note').value, 'Newer body while response is held'); assert.match(status(f).textContent, /newer draft is retained/);
  await f.click(f.byText('Save note')); const note = created(f)[0];
  assert.equal(saves(f).length, 2); assert.equal(saves(f)[1].input.id, note.id); assert.equal(saves(f)[1].input.revision, 1); assert.equal('newTodo' in saves(f)[1].input, false);
  assert.equal(note.revision, 2); assert.equal(note.body, 'Newer body while response is held'); assert.equal(todoState(note).isTodo, true); assert.equal(created(f).length, 1);
});

test('New note owns the editor after an older New to-do creation response was held after commit', async t => {
  const g = gate(); const f = await ui(t, async ({ action, input }) => { if (action === 'save' && input.newTodo) { g.enter(); await g.held; } });
  await f.click(f.byText('New to-do')); typeDraft(f, 'Older committed task'); const pending = f.click(f.byText('Save note')); await g.started;
  await f.click(f.byText('New note')); typeDraft(f, 'New editor note', 'New editor body'); const ownedStatus = status(f).textContent;
  g.release(); await pending;
  assert.equal(f.byLabel('Note title').value, 'New editor note'); assert.equal(f.byLabel('Markdown note').value, 'New editor body'); assert.equal(status(f).textContent, ownedStatus);
  assert.equal(created(f).length, 1); assert.equal(todoState(created(f)[0]).isTodo, true);
  await f.click(f.byText('Save note')); assert.equal(created(f).length, 2); assert.equal(todoState(created(f).find(note => note.title === 'New editor note')).isTodo, false);
});

test('disposing a New to-do view after committed save suppresses every late publication and request', async t => {
  const g = gate(); const f = await ui(t, async ({ action, input }) => { if (action === 'save' && input.newTodo) { g.enter(); await g.held; } });
  await f.click(f.byText('New to-do')); typeDraft(f, 'Committed before dispose'); const pending = f.click(f.byText('Save note')); await g.started;
  f.dispose(); const text = status(f).textContent, calls = f.calls.length; g.release(); await pending;
  assert.equal(status(f).textContent, text); assert.equal(f.calls.length, calls); assert.equal(created(f).length, 1); assert.equal(todoState(created(f)[0]).isTodo, true);
  await f.byText('Save note').onclick(); await f.byText('New to-do').onclick(); assert.equal(f.calls.length, calls); assert.equal(status(f).textContent, text);
});

test('failed New to-do persistence retains draft type and fields then supports one explicit retry', async t => {
  const f = await ui(t), set = f.store.set; await f.click(f.byText('New to-do')); typeDraft(f, 'Retry this task', 'Keep these words'); const before = JSON.stringify(f.read());
  f.store.set = async () => { throw new Error('Synthetic new-task write denied'); }; await f.click(f.byText('Save note'));
  assert.equal(JSON.stringify(f.read()), before); assert.equal(f.byLabel('Note title').value, 'Retry this task'); assert.equal(f.byLabel('Markdown note').value, 'Keep these words'); assert.match(status(f).textContent, /write denied/); assert.equal(f.byText('Save note').disabled, false);
  f.store.set = set; await f.click(f.byText('Save note')); assert.equal(saves(f).length, 2); assert.equal(saves(f)[1].input.newTodo, true); assert.equal(created(f).length, 1); assert.equal(created(f)[0].revision, 1); assert.equal(todoState(created(f)[0]).isTodo, true);
});

test('a held rejected New to-do write cannot publish its failure over a newer draft owner', async t => {
  const f = await ui(t), g = gate(), set = f.store.set; await f.click(f.byText('New to-do')); typeDraft(f, 'Rejected older task'); const before = JSON.stringify(f.read());
  f.store.set = async () => { g.enter(); await g.held; throw new Error('Synthetic held new-task denial'); };
  const pending = f.click(f.byText('Save note')); await g.started; await f.click(f.byText('New note')); typeDraft(f, 'New owner', 'Still unsaved'); const ownedStatus = status(f).textContent;
  g.release(); await pending; f.store.set = set;
  assert.equal(JSON.stringify(f.read()), before); assert.equal(f.byLabel('Note title').value, 'New owner'); assert.equal(f.byLabel('Markdown note').value, 'Still unsaved'); assert.equal(status(f).textContent, ownedStatus); assert.equal(f.byText('Save note').disabled, false);
});

test('committed New to-do save reports refresh failure separately and preserves a newer draft across a held rejected list reply', async t => {
  const g = gate(); let rejectNext = false, hold = false;
  const f = await ui(t, async ({ action }) => {
    if (action === 'list' && rejectNext) {
      rejectNext = false;
      if (hold) { g.enter(); await g.held; }
      throw new Error('Synthetic list response rejected after saved state committed');
    }
  });
  await f.click(f.byText('New to-do')); typeDraft(f, 'First committed task'); rejectNext = true;
  await f.click(f.byText('Save note'));
  const first = created(f).find(note => note.title === 'First committed task'); assert.ok(first); assert.equal(first.revision, 1); assert.equal(todoState(first).isTodo, true);
  assert.match(status(f).textContent, /Saved revision 1\. Could not refresh the note list:/);
  await f.click(f.byText('New to-do')); typeDraft(f, 'Second committed task', 'Body already committed'); rejectNext = true; hold = true;
  const pending = f.click(f.byText('Save note')); await g.started;
  const second = created(f).find(note => note.title === 'Second committed task'); assert.ok(second); assert.equal(second.revision, 1); assert.equal(second.body, 'Body already committed');
  f.type(f.byLabel('Markdown note'), 'Newer unsaved body while accepted list response is held'); const ownedStatus = status(f).textContent;
  g.release(); await pending;
  assert.equal(status(f).textContent, ownedStatus); assert.match(ownedStatus, /Unsaved draft/); assert.equal(f.byLabel('Markdown note').value, 'Newer unsaved body while accepted list response is held'); assert.equal(f.byText('Save note').disabled, false);
  await f.click(f.byText('Save note')); const final = f.read().notes[second.id];
  assert.equal(saves(f).at(-1).input.id, second.id); assert.equal(saves(f).at(-1).input.revision, 1); assert.equal('newTodo' in saves(f).at(-1).input, false);
  assert.equal(final.revision, 2); assert.equal(final.body, 'Newer unsaved body while accepted list response is held'); assert.equal(todoState(final).isTodo, true); assert.equal(created(f).length, 2);
});
