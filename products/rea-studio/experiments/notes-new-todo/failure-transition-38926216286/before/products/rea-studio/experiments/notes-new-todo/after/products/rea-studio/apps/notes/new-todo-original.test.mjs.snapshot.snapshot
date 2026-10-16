// Isolated test-only execution of authenticated AGPL-3.0-or-later Joplin helpers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { memory } from './notebook-trash-review-fixture.mjs';
import { todoState } from './core.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
const sourceCommit = '7e2765a3857754d12dbadea442b60ceaf9d4b23d';
const sources = {
  note: ['./results/notebooks-followup/stage/original/packages/lib/models/Note.ts.snapshot.snapshot', 45302, '5f1a200dc970179ad6fd193f7ffc47f09f88261cff8f893ccc793517ebbe9647'],
  base: ['./results/notebooks-followup/stage/original/packages/lib/BaseModel.ts.snapshot.snapshot', 26960, 'c0a19f6d2d689cc75de99e4ba57058ec02f9171c5b5b3c739aa45d11d5920fde'],
  command: ['../../experiments/notes-new-todo/original/packages/app-desktop/gui/WindowCommandsAndDialogs/commands/newTodo.ts.snapshot', 591, '218a695d94fafb17d1650dc0601ca4c684628c9a1a6c923887d73937211aef6f'],
  newNote: ['../../experiments/notes-new-todo/original/packages/app-desktop/gui/WindowCommandsAndDialogs/commands/newNote.ts.snapshot', 1341, 'f5f0e9f3a5f9f2188b99c51778dbb88e5d99d3ab6e2cf0ae0ec879cdb99c0eed'],
};
async function original(key) {
  const [name, bytes, digest] = sources[key], value = await readFile(new URL(name, import.meta.url));
  assert.equal(value.length, bytes); assert.equal(sha(value), digest); return value.toString('utf8');
}
function method(source, name, owner) {
  const marker = `public static ${name}(`, start = source.indexOf(marker);
  assert.ok(start >= 0); assert.equal(source.indexOf(marker, start + 1), -1);
  const open = source.indexOf('{', start); let depth = 0;
  for (let at = open; at < source.length; at++) {
    if (source[at] === '{') depth++;
    if (source[at] === '}' && --depth === 0) {
      const text = source.slice(start, at + 1);
      return { text, binding: { owner, name, startLine: source.slice(0, start).split('\n').length, endLine: source.slice(0, at + 1).split('\n').length, sha256: sha(text) } };
    }
  }
  throw new Error('Pinned method did not terminate');
}

test('four new-task parent/type results match exact released Note.new and newTodo helpers over a declared field adapter', async () => {
  const noteSource = await original('note'), baseSource = await original('base');
  const slices = [method(baseSource, 'new', 'BaseModel'), method(noteSource, 'new', 'Note'), method(noteSource, 'newTodo', 'Note')];
  const wrapper = `class BaseModel { static fields(){return [{name:'parent_id',default:''},{name:'is_todo',default:0},{name:'adapterSentinel',default:'retained'}];} ${slices[0].text} }; class Note extends BaseModel { ${slices[1].text} ${slices[2].text} }; Note;`;
  const OriginalNote = vm.runInNewContext(stripTypeScriptTypes(wrapper), {}, { timeout: 1000 });
  const f = memory(), seed = await f.call('save', { title: 'Default notebook seed' });
  let tree = await f.call('notebook-list'); const parent = await f.call('notebook-create', { title: 'Parent', revision: tree.revision });
  const child = await f.call('notebook-create', { title: 'Child', parentId: parent.notebook.id, revision: parent.revision });
  const parents = ['', seed.notebookId, parent.notebook.id, child.notebook.id]; let comparisons = 0;
  for (const parentId of parents) {
    const reference = OriginalNote.newTodo(parentId), candidate = await f.call('save', { title: 'New task ' + comparisons, notebookId: parentId, newTodo: true });
    assert.equal(candidate.notebookId, reference.parent_id); assert.equal(todoState(candidate).isTodo, Boolean(reference.is_todo));
    assert.equal(reference.adapterSentinel, 'retained'); assert.deepEqual(todoState(candidate), { isTodo: true, due: 0, completed: 0 }); comparisons++;
  }
  assert.equal(comparisons, 4);
  console.log(JSON.stringify({ notesNewTodoOriginalHelperComparisons: { sourceCommit, sourcePins: { note: sources.note.slice(1), base: sources.base.slice(1) }, bindings: slices.map(row => row.binding), comparisons, comparedFields: ['parent_id', 'is_todo'], fieldsAdapter: ['parent_id', 'is_todo', 'adapterSentinel'], dueAndCompletionZerosAreCandidateOnlyChecks: true, originalDatabaseExecutions: 0, originalGuiExecutions: 0, originalFullApplicationExecutions: 0, countsAddedToTestGroups: false } }));
});

test('two desktop New to-do command argument results match candidate body/type requests without executing original persistence', async () => {
  const command = await original('command'), newNote = await original('newNote'), enabled = /export const newNoteEnabledConditions = '([^']+)';/.exec(newNote);
  assert.ok(enabled); const marker = 'export const runtime = ', at = command.indexOf(marker); assert.ok(at >= 0); assert.equal(command.indexOf(marker, at + 1), -1);
  const runtimeSource = command.slice(at + marker.length), calls = [], delegated = { forwardedByAdapter: true };
  const runtime = vm.runInNewContext(stripTypeScriptTypes('const runtime = ' + runtimeSource + '\nruntime();'), { newNoteEnabledConditions: enabled[1], CommandService: { instance: () => ({ execute: async (...args) => { calls.push(args); return delegated; } }) } }, { timeout: 1000 });
  assert.equal(runtime.enabledCondition, 'oneFolderSelected && selectedFolderIsValid && !inConflictFolder && !folderIsReadOnly && !folderIsTrash');
  const f = memory(); let comparisons = 0;
  for (const body of ['', 'Task α\nSecond line with **Markdown**']) {
    const result = body ? await runtime.execute({}, body) : await runtime.execute({}); assert.equal(result, delegated);
    const args = calls.at(-1); assert.deepEqual(args, ['newNote', body, true]);
    const request = { title: 'Command task ' + comparisons, body, newTodo: true }, candidate = await f.call('save', request);
    assert.equal(candidate.body, args[1]); assert.equal(todoState(candidate).isTodo, args[2]); comparisons++;
  }
  assert.equal(comparisons, 2); assert.equal(calls.length, 2);
  console.log(JSON.stringify({ notesNewTodoOriginalCommandComparisons: { sourceCommit, commandSource: { bytes: sources.command[1], sha256: sources.command[2] }, newNoteSource: { bytes: sources.newNote[1], sha256: sources.newNote[2] }, runtimeFactorySliceSha256: sha(runtimeSource), comparisons, comparedArguments: ['body', 'isTodo'], delegatedCommand: 'newNote', actualNewNoteCommandExecuted: false, originalProvisionalSaveExecuted: false, originalDatabaseExecutions: 0, originalGuiExecutions: 0, originalFullApplicationExecutions: 0, countsAddedToTestGroups: false, policyDifference: 'The original desktop newNote command performs a provisional save. The candidate stores no note until explicit Save.' } }));
});
