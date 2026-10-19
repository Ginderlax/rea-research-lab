// Test-only original helper execution; upstream AGPL-3.0-or-later notices apply.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { changeTodo, todoState } from './core.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const sourceHash = '5f1a200dc970179ad6fd193f7ffc47f09f88261cff8f893ccc793517ebbe9647';
const sourceUrl = 'https://github.com/laurent22/joplin/blob/7e2765a3857754d12dbadea442b60ceaf9d4b23d/packages/lib/models/Note.ts';
function selectedMethod(text, name) {
  const start = text.indexOf(`public static ${name}(`); if (start < 0 || text.indexOf(`public static ${name}(`, start + 1) >= 0) throw new Error('Original helper must occur exactly once.');
  const open = text.indexOf('{', start); let depth = 0;
  for (let at = open; at < text.length; at++) {
    if (text[at] === '{') depth++;
    if (text[at] === '}' && --depth === 0) { const source = text.slice(start, at + 1); return { source, name, startLine: text.slice(0, start).split('\n').length, endLine: text.slice(0, at + 1).split('\n').length, sha256: digest(source) }; }
  }
  throw new Error('Original helper did not terminate.');
}
const fields = value => ({ is_todo: Number(value.is_todo), todo_due: Number(value.todo_due), todo_completed: Number(value.todo_completed) });
const candidateFields = value => { const state = todoState(value); return { is_todo: Number(state.isTodo), todo_due: state.due, todo_completed: state.completed }; };

test('20 finite to-do field transitions match two authenticated released Joplin helpers with a fixed clock', async () => {
  const bytes = await readFile(new URL('./results/notebooks-followup/stage/original/packages/lib/models/Note.ts.snapshot.snapshot', import.meta.url)); assert.equal(bytes.length, 45302); assert.equal(digest(bytes), sourceHash);
  const slices = ['changeNoteType', 'toggleTodoCompleted'].map(name => selectedMethod(bytes.toString('utf8'), name)), now = 1_790_000_000_123;
  const OriginalNote = vm.runInNewContext(stripTypeScriptTypes(`class Note {\n${slices.map(row => row.source).join('\n')}\n}; Note;`), { Date: { now: () => now } }, { timeout: 1000 });
  let conversionComparisons = 0, completionComparisons = 0;
  for (const is_todo of [0, 1]) for (const todo_due of [0, 1700000000123]) for (const todo_completed of [0, 1600000000456]) for (const type of ['note', 'todo']) {
    const input = { id: 'a'.repeat(32), title: 'Retained', body: 'Unchanged body', is_todo, todo_due, todo_completed, author: 'Original author' }, before = structuredClone(input);
    const original = OriginalNote.changeNoteType(input, type), changed = changeTodo({ joplin: { props: Object.fromEntries(Object.entries(input).map(([key, value]) => [key, String(value)])) } }, { action: 'todo-type', type }, now);
    const actual = candidateFields(changed);
    assert.deepEqual(actual, fields(original)); assert.deepEqual(input, before); assert.equal(original.author, input.author); assert.equal(original.body, input.body); conversionComparisons++;
  }
  for (const todo_due of [0, 1700000000123]) for (const todo_completed of [0, 1600000000456]) {
    const input = { is_todo: 1, todo_due, todo_completed, author: 'Retained' }, before = structuredClone(input), original = OriginalNote.toggleTodoCompleted(input);
    const candidate = changeTodo({ todo: { isTodo: true, due: todo_due, completed: todo_completed } }, { action: 'todo-completed', completed: !todo_completed }, now);
    assert.deepEqual(candidateFields(candidate), fields(original)); assert.deepEqual(input, before); assert.equal(original.author, 'Retained'); completionComparisons++;
  }
  assert.equal(conversionComparisons, 16); assert.equal(completionComparisons, 4);
  console.log(JSON.stringify({ notesTodoOriginalComparisons: { sourceUrl, sourceSha256: sourceHash, bindings: slices.map(({ source, ...binding }) => binding), conversionComparisons, completionComparisons, clock: now, originalFullApplicationExecutions: 0, originalDatabaseExecutions: 0, originalGuiSessions: 0, scope: 'Only two exact helpers. API persistence, revisions, due editing, filters and UI are candidate-only checks. Same-state explicit API no-ops and shared/locked-note refusal are app policies.' } }));
});
