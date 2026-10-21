// Test-only original execution. Run only in an approved hosted Node 24+ environment.
// AGPL-3.0-or-later; exact originals and provenance are preserved in the study folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { parseSearchQuery, compileStructuredSearch } from '../../../apps/notes/search-query.mjs';

const originalRoot = new URL('../../notes-search-grammar/original/', import.meta.url);
// This NEW diagnostic derivative preserves the released functions and all80
// fixtures. It records actual results before the same strict assertions.
assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
for (const [key, value] of Object.entries({ CI:'true', GITHUB_ACTIONS:'true', RUNNER_ENVIRONMENT:'github-hosted', RUNNER_OS:'Windows', RUNNER_ARCH:'X64', GITHUB_REPOSITORY:'Ginderlax/rea-research-lab', GITHUB_REF:'refs/heads/experiment/notes-open-todos-first-20261021-r1', GITHUB_EVENT_NAME:'push', GITHUB_JOB:'notes46-observed-values' })) assert.equal(process.env[key], value, key);
assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA));
for (const key of ['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT']) assert(/^[1-9][0-9]*$/.test(process.env[key]));
const outputRoot = path.resolve(process.env.REA_SEARCH_VALUE_EVIDENCE ?? '');
assert(path.isAbsolute(process.env.REA_SEARCH_VALUE_EVIDENCE ?? ''));
for (let at=outputRoot;;) { assert(!fs.lstatSync(at).isSymbolicLink()); const parent=path.dirname(at); if(parent===at)break; at=parent; }
assert.equal(fs.realpathSync(outputRoot).toLowerCase(), outputRoot.toLowerCase());
const relativeOutput=path.relative(fs.realpathSync(process.env.RUNNER_TEMP),outputRoot);
assert(relativeOutput&&!path.isAbsolute(relativeOutput)&&relativeOutput!=='..'&&!relativeOutput.startsWith('..'+path.sep));
const outputFile=path.join(outputRoot,'original-search-values.jsonl');
const descriptor=fs.openSync(outputFile,'wx');
let observedBytes=0;
const observedCounts={parser:0,'metadata-sql':0};
const writeObserved=value=>{const bytes=Buffer.from(JSON.stringify(value)+'\n');assert(bytes.length<=64*1024);observedBytes+=bytes.length;assert(observedBytes<=1024*1024);assert.equal(fs.writeSync(descriptor,bytes),bytes.length);};
const observedAttempt={sourceCommit:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,job:process.env.GITHUB_JOB};
writeObserved({schema:'rea-search-original-observed-values-header/v1',...observedAttempt,expectedParserCases:48,expectedMetadataSQLCases:32,originalFullApplicationExecuted:false,originalPersistedSearchDatabaseExecuted:false,FTSOrRankCompared:false});
function observeValue(kind,query,value){assert(Object.hasOwn(observedCounts,kind));const caseIndex=observedCounts[kind]++;writeObserved({schema:'rea-search-original-observed-case/v1',...observedAttempt,kind,caseIndex,query,...value,originalSourcePins:pins,recordedBeforeStrictAssertion:true});}
test.after(()=>{const complete=observedCounts.parser===48&&observedCounts['metadata-sql']===32;try{writeObserved({schema:'rea-search-original-observed-values-footer/v1',...observedAttempt,observedCounts,complete,records:observedCounts.parser+observedCounts['metadata-sql'],assertionOutcomeMustBeReadFromActualTAP:true,compatibilityCoverageCases:80,TAPParentAndChildResultsExpected:82,fullParity:false,superiority:false});}finally{fs.closeSync(descriptor);}assert.equal(complete,true,'Every actual comparison value must be recorded');});

const pins = {
  'packages/lib/services/search/filterParser.ts': { bytes: 4501, sha256: 'e0e0d0690664748c563fabac620ac74839312dcb17cd351f16130f1918d17653', gitBlob: '97bb6ffc6f5300767cad1123e03e725b585d22ae' },
  'packages/lib/services/search/queryBuilder.ts': { bytes: 16896, sha256: 'fd6a671fa6b305116c10163f417e35474764005f73e39ffd5ab24521db6acfcb', gitBlob: 'bad8f89695186a40248db6e1baf75cdf16ce4754' },
};
async function original(path, adapt = source => source) {
  const bytes = await readFile(new URL(path, originalRoot)), pin = pins[path];
  assert.equal(bytes.length, pin.bytes); assert.equal(createHash('sha256').update(bytes).digest('hex'), pin.sha256);
  assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), pin.gitBlob);
  const source = adapt(bytes.toString('utf8'));
  const stripped = stripTypeScriptTypes(source, { mode: 'transform', sourceUrl: `pinned-joplin-3.6.14/${path}` });
  return (await import(`data:text/javascript;base64,${Buffer.from(stripped).toString('base64')}#${pin.sha256}`)).default;
}
const capture = (parse, query) => { try { return { value: parse(query) }; } catch (error) { return { error: error.message }; } };

export const parserCases = Object.freeze([
  '', 'cat dog', '"shopping list"', '-spam', 'office -trash', '-"private memo"',
  'title:"hello world"', '-body:"secret draft"', 'title:"hello-world_test"', 'title:"unfinished',
  'notebook:"Team Alpha"', 'notebook:Work*', 'tag:* -tag:spam', 'tag:be*ful', 'tag:50%', 'tag:a_b',
  'TyPe:todo', 'type:note', 'type:TODO', '-type:todo', 'iscompleted:0', 'iscompleted:1', '-iscompleted:0', 'iscompleted:true',
  'boddy:hello', 'title:hello:world', 'https://example.invalid/path', 'title:', 'title:""', 'cat\tdog',
  'any:0 cat dog', 'any:1 cat -dog', '-any:1', 'any:', 'created:20260101', '-updated:year-1', '-due:day+7',
  'latitude:40 -latitude:50', 'longitude:1 altitude:2', 'resource:image/*', 'sourceurl:https://example.invalid/a:b',
  'id:abcdef', 'tag:"unfinished phrase', 'title:one"two"three', '"one""two"', 'title:-word', '*cat', 'title:cat*',
]);
test('48 bounded query/error results equal the exact standalone original filter parser', async t => {
  const parseOriginal = await original('packages/lib/services/search/filterParser.ts');
  assert.equal(parserCases.length, 48);
  for (const query of parserCases) await t.test(JSON.stringify(query), () => {
    const actual = capture(parseSearchQuery, query), expected = capture(parseOriginal, query);
    observeValue('parser', query, { original: expected, replacement: actual });
    assert.deepEqual(actual, expected);
  });
});

const folder = (id, title, parent_id = '') => ({ type: 2, title, props: { id, parent_id } });
const folders = [folder('a', 'Lab'), folder('b', 'Child', 'a'), folder('c', 'Other'), folder('d', 'Lab', 'c'), folder('e', 'Deep', 'b'), folder('f', 'Archive')];
const records = Object.fromEntries(folders.map(row => [row.props.id, row]));
const rows = [
  { id: 'n1', title: 'Plan', body: 'ready', notebookId: 'a', tags: ['Work', 'office'], todo: { isTodo: false, due: 0, completed: 0 } },
  { id: 'n2', title: 'Task', body: 'ready', notebookId: 'b', tags: ['work', 'important'], todo: { isTodo: true, due: 0, completed: 0 } },
  { id: 'n3', title: 'Done', body: 'archived', notebookId: 'd', tags: ['spam'], todo: { isTodo: true, due: 0, completed: 10 } },
  { id: 'n4', title: 'Untagged', body: 'ready', notebookId: 'c', tags: [], todo: { isTodo: false, due: 0, completed: 0 } },
  { id: 'n5', title: 'Deep note', body: 'ready', notebookId: 'e', tags: ['R&D_1', '50%', 'Équipe'], todo: { isTodo: false, due: 0, completed: 0 } },
  { id: 'n6', title: 'Other task', body: 'ready', notebookId: 'f', tags: ['R&Dx1', '5000', 'équipe'], todo: { isTodo: true, due: 0, completed: 20 } },
];
export const metadataCases = Object.freeze([
  'tag:work', 'tag:work -tag:important', 'tag:work tag:important', 'tag:*', '-tag:*', '-tag:spam',
  'tag:"R&D_1"', 'tag:50%', 'tag:Équipe', 'tag:équipe', 'tag:wo*', 'tag:office -tag:spam',
  'type:note', 'type:todo', 'iscompleted:0', 'iscompleted:1', 'type:note iscompleted:0',
  'notebook:Lab', 'notebook:Child', 'notebook:Lab notebook:Archive', 'notebook:Lab -notebook:Child',
  '-notebook:Lab', 'notebook:*', 'notebook:La_', 'notebook:"Lab / Child"',
  'notebook:Lab type:todo', 'notebook:Lab tag:important', 'notebook:Other -tag:spam',
  'notebook:Archive iscompleted:1', 'notebook:NoSuchNotebook', '-notebook:NoSuchNotebook',
  'notebook:Lab -notebook:Lab',
]);
test('32 metadata-only predicates equal original query-builder SQL on synthetic SQLite', async t => {
  const parseOriginal = await original('packages/lib/services/search/filterParser.ts');
  const buildOriginal = await original('packages/lib/services/search/queryBuilder.ts', source => {
    // Preserve every original function body. Only the unused date-service import is denied.
    const statement = "import time from '../../time';";
    assert.equal(source.split(statement).length - 1, 1);
    return source.replace(statement, "const time = new Proxy({}, { get() { throw new Error('Date adapter is outside this metadata-only original study'); } });");
  });
  const database = new DatabaseSync(':memory:'); t.after(() => database.close());
  database.exec('CREATE TABLE notes(id TEXT, title TEXT, body TEXT, parent_id TEXT, is_todo INTEGER, todo_completed INTEGER, user_created_time INTEGER, user_updated_time INTEGER); CREATE TABLE folders(id TEXT, title TEXT, parent_id TEXT); CREATE TABLE tags(id TEXT, title TEXT); CREATE TABLE note_tags(note_id TEXT, tag_id TEXT);');
  const addFolder = database.prepare('INSERT INTO folders VALUES(?,?,?)'), addNote = database.prepare('INSERT INTO notes VALUES(?,?,?,?,?,?,?,?)'), addTag = database.prepare('INSERT INTO tags VALUES(?,?)'), addLink = database.prepare('INSERT INTO note_tags VALUES(?,?)');
  for (const row of folders) addFolder.run(row.props.id, row.title, row.props.parent_id);
  let tagId = 0;
  for (const row of rows) {
    addNote.run(row.id, row.title, row.body, row.notebookId, Number(row.todo.isTodo), row.todo.completed, 1, 2);
    for (const tag of row.tags) { const id = String(++tagId); addTag.run(id, tag); addLink.run(row.id, id); }
  }
  assert.equal(metadataCases.length, 32);
  for (const query of metadataCases) await t.test(query, () => {
    const { query: sql, params } = buildOriginal(parseOriginal(query), false);
    const expected = database.prepare(sql).all(...params).map(row => row.id).sort();
    const actual = rows.filter(compileStructuredSearch(query, records).matches).map(row => row.id).sort();
    observeValue('metadata-sql', query, { SQL: sql, params, originalResultIds: expected, replacementResultIds: actual });
    assert.deepEqual(actual, expected);
  });
});
