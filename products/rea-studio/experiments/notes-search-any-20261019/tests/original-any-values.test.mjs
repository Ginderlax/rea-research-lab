// Source-assisted AGPL-3.0-or-later study. Reuses the preserved study NOTICE/COPYING.
// Actual original execution is permitted only in the independently authenticated hosted campaign.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { DatabaseSync } from 'node:sqlite';

const EPOCH = 'notes-search-any-original-comparison-v1';
const PARENT = 'ab26bf14bc1a55a723566bbafb3ca391c3ef671c';
// Exact six declared hosted overlays. The campaign independently authenticates their payloads.
const TARGETS = [
  { path: 'products/rea-studio/apps/notes/search-query.mjs', before: { bytes: 7557, sha256: '8ff7de2badbaf3726bc03ffd848a4b68a6c05c6c8ad94bc0d7b70f403690064d', gitBlob: 'ba253dcf7fe425a9acd18070a6f8b53089c16767' }, after: { bytes: 8564, sha256: 'a8c90608778aea07bc027ac8ccd853bac069a27b79fb1032cf8ff607413a8868', gitBlob: '9def8d4200eaf2c467c7dd0a95db4dacb61be209' } },
  { path: 'products/rea-studio/apps/notes/search-query.test.mjs', before: { bytes: 4836, sha256: 'b674309b52a4191751178049b5b878f1f9ed806d4d1b74d4c4c8caef311ca97b', gitBlob: 'cabd79fc321caf0e41cc75c262f386208be21399' }, after: { bytes: 9141, sha256: '11722cbbc5b790611c6653514556ef2831d21dfec32ed2b352751f3c5e43645a', gitBlob: 'e1a7685b64171398d1ea3f620d641741ade90e32' } },
  { path: 'products/rea-studio/apps/notes/search-query.integration.test.mjs', before: { bytes: 3648, sha256: 'ca5d578b5c080e6994ff3b17d9d03c7d2cdf68398314a91cfcba43c41f2cf975', gitBlob: '995d5787ba6f487f17064add32a1dc2a6b1ad210' }, after: { bytes: 6948, sha256: 'bf00dc48b418687b7b4dbc69ba65c130fc271512ff7a0539c464a3630681ba8d', gitBlob: '838debe02ee8690f7eb5833c18aec532eb0f47fb' } },
  { path: 'products/rea-studio/apps/notes/search-query.ui.test.mjs', before: { bytes: 2722, sha256: '8b2475bd16f2760d548084f01230fa7b9cacdd57709d636b6d677b7f88dca3bf', gitBlob: '77014d417fb0efa5a92d1bf639d92be5ec6d4165' }, after: { bytes: 6739, sha256: '2473657cbd547698ab86e0d073e8dcaaef3cb6350e36d07a27e37b24995838d8', gitBlob: '083da442a20b7599202736f045addf0a2424ff45' } },
  { path: 'products/rea-studio/apps/notes/README.md', before: { bytes: 26685, sha256: '9567a32b8de57bf0f1c6cc882228ab4cdca92609eabe65a28d1f180395fc3d4c', gitBlob: 'c2838d071b0b53f8f6531c567ea982fba21d7c32' }, after: { bytes: 28887, sha256: 'cd8a93222688008adac05478d976c5a622931a913c2db53e66459c7d9edf170e', gitBlob: '7452618f7118d7770d1638558c68ac1081c98dfd' } },
  { path: 'products/rea-studio/experiments/notes46-installed-search-20261019/tests/search-http.test.mjs', before: { bytes: 3772, sha256: 'a136f101c64716d79e4d6701dbc1e371658adac0b85b17a52895dbcf95f03e45', gitBlob: '909de7cbd01f4c23aca0cf1978521e1a1cdd6282' }, after: { bytes: 6960, sha256: '18a281e2af67dfc771829a2b412f6e7a8ffeedbe23e8bb045928c675e35adc3f', gitBlob: 'ff35bd6c4dda65904d66bfb96b5d87b0e4125566' } },
];
const DATA_PIN = Object.freeze({ bytes: 24506, sha256: 'f807d384aabd1f81d75e828d6c2f194470738f27f51b97755298406eec7dbef7' });
const ORIGINAL_PINS = Object.freeze({
  'packages/lib/services/search/filterParser.ts': Object.freeze({ bytes: 4501, sha256: 'e0e0d0690664748c563fabac620ac74839312dcb17cd351f16130f1918d17653', gitBlob: '97bb6ffc6f5300767cad1123e03e725b585d22ae' }),
  'packages/lib/services/search/queryBuilder.ts': Object.freeze({ bytes: 16896, sha256: 'fd6a671fa6b305116c10163f417e35474764005f73e39ffd5ab24521db6acfcb', gitBlob: 'bad8f89695186a40248db6e1baf75cdf16ce4754' }),
});
const COUNTS = Object.freeze({ parser: 16, 'metadata-sql': 32, 'notebook-diagnostic': 8 });
const MAX_LINE_BYTES = 64 * 1024, MAX_FILE_BYTES = 512 * 1024;
const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const originalRoot = new URL('../../notes-search-grammar/original/', import.meta.url);
const identity = bytes => ({ bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
const gitBlob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
function noLinks(filename) {
  assert(path.isAbsolute(filename));
  for (let current = path.resolve(filename);;) {
    const stat = fs.lstatSync(current); assert(!stat.isSymbolicLink());
    const parent = path.dirname(current); if (current === parent) break; current = parent;
  }
  assert.equal(fs.realpathSync(filename).toLowerCase(), path.resolve(filename).toLowerCase());
}
function inside(parent, filename) {
  const relative = path.relative(parent, filename);
  return Boolean(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
}
function ordinary(filename, maximum) {
  noLinks(filename); const stat = fs.lstatSync(filename);
  assert(stat.isFile() && stat.size <= maximum);
  const bytes = fs.readFileSync(filename); assert.equal(bytes.length, stat.size); return bytes;
}
function git(args) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.toUpperCase().startsWith('GIT_')));
  Object.assign(env, { GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never', GIT_OPTIONAL_LOCKS: '0', GIT_NO_LAZY_FETCH: '1' });
  const result = spawnSync('git', ['--no-replace-objects', ...args], { cwd: root, env, shell: false, windowsHide: true, timeout: 30000, maxBuffer: 4096 });
  assert.equal(result.error, undefined); assert.equal(result.status, 0); assert.equal(result.signal, null); return result.stdout.toString().trimEnd();
}
assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
for (const [name, expected] of Object.entries({
  CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', RUNNER_OS: 'Windows', RUNNER_ARCH: 'X64',
  GITHUB_REPOSITORY: 'Ginderlax/rea-research-lab', GITHUB_SERVER_URL: 'https://github.com', GITHUB_EVENT_NAME: 'push',
  GITHUB_REF: 'refs/heads/experiment/notes-search-any-20261019', GITHUB_JOB: 'notes-any-observed-values',
})) assert.equal(process.env[name], expected, name);
assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA ?? ''));
for (const name of ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) assert(/^[1-9][0-9]*$/.test(process.env[name] ?? ''));
noLinks(root); assert.equal(git(['rev-parse', 'HEAD']), process.env.GITHUB_SHA);
assert.equal(git(['rev-list', '--parents', '-n', '1', 'HEAD']), process.env.GITHUB_SHA + ' ' + PARENT);
const statusLines = git(['status', '--porcelain=v1', '--untracked-files=all']).split(/\r?\n/).sort();
assert.deepEqual(statusLines, TARGETS.map(row => ' M ' + row.path).sort());
for (const row of TARGETS) {
  for (const commit of ['HEAD', PARENT]) {
    assert.equal(git(['rev-parse', commit + ':' + row.path]), row.before.gitBlob);
    assert.equal(Number(git(['cat-file', '-s', commit + ':' + row.path])), row.before.bytes);
  }
  const actual = ordinary(path.join(root, ...row.path.split('/')), 512 * 1024);
  assert.deepEqual(identity(actual), { bytes: row.after.bytes, sha256: row.after.sha256 });
  assert.equal(gitBlob(actual), row.after.gitBlob);
}

const caseBytes = ordinary(fileURLToPath(new URL('../ANY-CASES.json', import.meta.url)), 128 * 1024);
assert.deepEqual(identity(caseBytes), DATA_PIN);
const data = JSON.parse(caseBytes);
assert.equal(data.schema, 'rea-search-any-case-data/v1'); assert.equal(data.sourceEpoch, EPOCH);
assert.deepEqual(data.counts, COUNTS); assert.deepEqual(data.originalSourcePins, ORIGINAL_PINS);
assert.equal(data.cases.length, 56); assert.equal(data.topLevelNodes.length, 3);
const ids = new Set(), indexes = { parser: 0, 'metadata-sql': 0, 'notebook-diagnostic': 0 };
for (let ordinal = 0; ordinal < data.cases.length; ordinal++) {
  const row = data.cases[ordinal];
  assert(Object.hasOwn(COUNTS, row.kind)); assert.equal(row.ordinal, ordinal); assert.equal(row.caseIndex, indexes[row.kind]++);
  assert(typeof row.id === 'string' && !ids.has(row.id)); ids.add(row.id);
  assert(typeof row.query === 'string' && row.query.length <= 500 && !/[\0\r\n\t\\#]/.test(row.query));
  assert.equal(row.comparisonRequired, row.kind !== 'notebook-diagnostic');
}
assert.deepEqual(indexes, COUNTS);
const expectedTitles = Object.entries(COUNTS).map(([kind]) => ({
  title: data.topLevelNodes.find(node => node.children[0]?.title.startsWith(data.cases.find(row => row.kind === kind).id + ' '))?.title,
  children: data.cases.filter(row => row.kind === kind).map(row => ({ title: row.id + ' ' + row.query, children: [] })),
}));
assert.deepEqual(data.topLevelNodes, expectedTitles);

const temporary = process.env.RUNNER_TEMP, observed = process.env.REA_ANY_OBSERVATIONS;
assert(typeof temporary === 'string' && path.isAbsolute(temporary)); noLinks(temporary);
assert(typeof observed === 'string' && path.isAbsolute(observed)); noLinks(observed);
assert(fs.lstatSync(observed).isDirectory()); assert(inside(fs.realpathSync(temporary), observed) && !inside(root, observed));
const output = path.join(observed, 'original-any-values.jsonl');
const outputFD = fs.openSync(output, 'wx');
let outputBytes = 0, outputLines = 0, caseRows = 0;
const counts = { parser: 0, 'metadata-sql': 0, 'notebook-diagnostic': 0 };
const binding = () => ({ sourceEpoch: EPOCH, sourceCommit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT, job: process.env.GITHUB_JOB });
function append(value) {
  const bytes = Buffer.from(JSON.stringify(value) + '\n');
  assert(bytes.length <= MAX_LINE_BYTES && outputBytes + bytes.length <= MAX_FILE_BYTES && outputLines < 58);
  assert.equal(fs.writeSync(outputFD, bytes), bytes.length); outputBytes += bytes.length; outputLines++;
}
function record(row, details) {
  assert.equal(row.ordinal, caseRows, 'Actual observed case order');
  append({ schema: 'rea-search-any-original-observed-case/v1', ...binding(), kind: row.kind, caseId: row.id, caseIndex: row.caseIndex, ordinal: row.ordinal, query: row.query,
    originalSourcePins: ORIGINAL_PINS, recordedBeforeStrictAssertion: true, comparisonRequired: row.comparisonRequired, ...details });
  counts[row.kind]++; caseRows++;
}
after(() => {
  try {
    append({ schema: 'rea-search-any-original-observed-footer/v1', ...binding(), observedCounts: counts, complete: caseRows === 56 && Object.entries(COUNTS).every(([kind, count]) => counts[kind] === count),
      records: caseRows, assertionOutcomeMustBeReadFromActualTAP: true, TAPParentAndChildResultsExpected: 59,
      originalFullApplicationExecuted: false, originalPersistedSearchDatabaseExecuted: false, FTSOrRankCompared: false, fullParity: false, superiority: false });
    fs.fsyncSync(outputFD);
  } finally { fs.closeSync(outputFD); }
});
append({ schema: 'rea-search-any-original-observed-header/v1', ...binding(), caseData: DATA_PIN, originalSourcePins: ORIGINAL_PINS,
  expectedCounts: COUNTS, expectedCaseRows: 56, expectedPhysicalLines: 58, expectedTAPResults: 59,
  notebookDiagnosticLanes: data.diagnosticLanes, originalFullApplicationExecuted: false, originalPersistedSearchDatabaseExecuted: false, FTSOrRankCompared: false });

async function original(filename, adapt = source => source) {
  assert(Object.hasOwn(ORIGINAL_PINS, filename));
  const bytes = ordinary(fileURLToPath(new URL(filename, originalRoot)), 64 * 1024);
  assert.deepEqual(identity(bytes), { bytes: ORIGINAL_PINS[filename].bytes, sha256: ORIGINAL_PINS[filename].sha256 });
  assert.equal(gitBlob(bytes), ORIGINAL_PINS[filename].gitBlob);
  const transformed = stripTypeScriptTypes(adapt(bytes.toString('utf8')), { mode: 'transform', sourceUrl: 'pinned-joplin-3.6.14/' + filename });
  return (await import('data:text/javascript;base64,' + Buffer.from(transformed).toString('base64') + '#' + ORIGINAL_PINS[filename].sha256)).default;
}
const parseOriginal = await original('packages/lib/services/search/filterParser.ts');
const buildOriginal = await original('packages/lib/services/search/queryBuilder.ts', source => {
  const statement = "import time from '../../time';";
  assert.equal(source.split(statement).length - 1, 1);
  // This import is unused by these fixtures. Every original function body is retained.
  return source.replace(statement, "const time = new Proxy({}, { get() { throw new Error('Date adapter is outside this ANY metadata-only study'); } });");
});
const { parseSearchQuery, compileStructuredSearch } = await import('../../../apps/notes/search-query.mjs');
function errorValue(error) {
  assert(error && typeof error.name === 'string' && typeof error.message === 'string');
  assert(error.name.length <= 200 && error.message.length <= 16384);
  return { name: error.name, message: error.message, code: typeof error.code === 'string' ? error.code : null,
    errcode: Number.isInteger(error.errcode) ? error.errcode : null, errstr: typeof error.errstr === 'string' ? error.errstr : null };
}
function capture(operation) { try { return { value: operation() }; } catch (error) { return { error: errorValue(error) }; } }
function freeze(value) { if (value && typeof value === 'object' && !Object.isFrozen(value)) { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; }
const records = freeze(Object.fromEntries(data.fixture.folders.map(folder => [folder.id, { type: 2, title: folder.title, props: { id: folder.id, parent_id: folder.parent } }])));
const rows = freeze(data.fixture.notes.map(note => ({ id: note.id, title: note.title, body: note.body, notebookId: note.folder, tags: [...note.tags], todo: { isTodo: note.todo, due: 0, completed: note.completed } })));
const fixtureBefore = JSON.stringify({ records, rows });
const columns = 'rowid,id,title,body,parent_id,is_todo,todo_completed,user_created_time,user_updated_time';
const expectedDatabaseRows = data.fixture.notes.map((note, index) => ({ rowid: index + 1, id: note.id, title: note.title, body: note.body, parent_id: note.folder, is_todo: Number(note.todo), todo_completed: note.completed, user_created_time: 1, user_updated_time: 2 }));
function databaseRows(database, name) {
  assert(['notes', 'notes_fts'].includes(name));
  return database.prepare('SELECT ' + columns + ' FROM ' + name + ' ORDER BY rowid').all().map(row => ({ ...row }));
}
function metadataDatabase() {
  const database = new DatabaseSync(':memory:');
  try {
    database.exec('CREATE TABLE notes(id TEXT,title TEXT,body TEXT,parent_id TEXT,is_todo INTEGER,todo_completed INTEGER,user_created_time INTEGER,user_updated_time INTEGER); CREATE TABLE folders(id TEXT,title TEXT,parent_id TEXT); CREATE TABLE tags(id TEXT,title TEXT); CREATE TABLE note_tags(note_id TEXT,tag_id TEXT);');
    const addFolder = database.prepare('INSERT INTO folders VALUES(?,?,?)');
    const addNote = database.prepare('INSERT INTO notes(' + columns + ') VALUES(?,?,?,?,?,?,?,?,?)');
    const addTag = database.prepare('INSERT INTO tags VALUES(?,?)'), addLink = database.prepare('INSERT INTO note_tags VALUES(?,?)');
    for (const folder of data.fixture.folders) addFolder.run(folder.id, folder.title, folder.parent);
    let tagId = 0;
    for (let index = 0; index < rows.length; index++) {
      const note = rows[index]; addNote.run(index + 1, note.id, note.title, note.body, note.notebookId, Number(note.todo.isTodo), note.todo.completed, 1, 2);
      for (const tag of note.tags) { const id = String(++tagId); addTag.run(id, tag); addLink.run(note.id, id); }
    }
    assert.deepEqual(databaseRows(database, 'notes'), expectedDatabaseRows);
    assert.equal(database.prepare("SELECT count(*) AS n FROM sqlite_schema WHERE name='notes_fts'").get().n, 0);
    return database;
  } catch (error) { database.close(); throw error; }
}
function addPlainMirror(database) {
  const sql = 'CREATE TABLE notes_fts(id TEXT,title TEXT,body TEXT,parent_id TEXT,is_todo INTEGER,todo_completed INTEGER,user_created_time INTEGER,user_updated_time INTEGER)';
  database.exec(sql);
  database.exec('INSERT INTO notes_fts(' + columns + ') SELECT ' + columns + ' FROM notes ORDER BY rowid');
  const notesRows = databaseRows(database, 'notes'), mirrorRows = databaseRows(database, 'notes_fts');
  assert.deepEqual(notesRows, expectedDatabaseRows); assert.deepEqual(mirrorRows, notesRows);
  const definition = database.prepare("SELECT type,sql FROM sqlite_schema WHERE name='notes_fts'").get();
  assert.equal(definition.type, 'table'); assert.equal(/VIRTUAL\s+TABLE/i.test(definition.sql), false);
  return { schema: 'rea-any-notebook-plain-rowid-mirror/v1', databaseKind: 'synthetic in-memory SQLite ordinary table, not FTS', sqliteVersion: database.prepare('SELECT sqlite_version() AS version').get().version,
    actualCreateTableSQL: definition.sql, notesRows, mirrorRows, rowidIdAndContentEqual: true, originalSQLRewritten: false, originalFunctionBodiesRewritten: false, virtualFTSTableCreated: false, FTSOrRankCompared: false };
}
function originalSQL(database, query) {
  let terms, built;
  try { terms = parseOriginal(query); } catch (error) { return { builderReturned: false, sqliteAttempted: false, stage: 'parser', outcome: { error: errorValue(error) } }; }
  try { built = buildOriginal(terms, false); } catch (error) { return { builderReturned: false, sqliteAttempted: false, stage: 'query-builder', parsedTerms: terms, outcome: { error: errorValue(error) } }; }
  assert(typeof built.query === 'string' && Array.isArray(built.params));
  const outcome = capture(() => database.prepare(built.query).all(...built.params).map(note => note.id).sort());
  return { builderReturned: true, sqliteAttempted: true, stage: 'sqlite-execution', parsedTerms: terms, SQL: built.query, params: built.params, outcome };
}
function replacement(query) { return capture(() => rows.filter(compileStructuredSearch(query, records).matches).map(note => note.id).sort()); }
function family(kind) { return data.cases.filter(row => row.kind === kind); }
function title(kind) { return data.topLevelNodes[Object.keys(COUNTS).indexOf(kind)].title; }

test(title('parser'), { concurrency: false }, async t => {
  for (const row of family('parser')) await t.test(row.id + ' ' + row.query, () => {
    const original = capture(() => parseOriginal(row.query)), actual = capture(() => parseSearchQuery(row.query));
    record(row, { original, replacement: actual });
    assert.deepEqual(actual, original);
  });
});
test(title('metadata-sql'), { concurrency: false }, async t => {
  const database = metadataDatabase(); t.after(() => database.close());
  for (const row of family('metadata-sql')) await t.test(row.id + ' ' + row.query, () => {
    const original = originalSQL(database, row.query), actual = replacement(row.query);
    record(row, { SQL: original.SQL ?? null, params: original.params ?? null, original: original.outcome, replacement: actual,
      originalResultIds: original.outcome.value ?? null, replacementResultIds: actual.value ?? null, originalExecution: { builderReturned: original.builderReturned, sqliteAttempted: original.sqliteAttempted, stage: original.stage } });
    assert.equal(original.builderReturned, true); assert.equal(original.sqliteAttempted, true);
    assert(Object.hasOwn(original.outcome, 'value')); assert(Object.hasOwn(actual, 'value'));
    assert.deepEqual(actual.value, original.outcome.value);
    assert.equal(JSON.stringify({ records, rows }), fixtureBefore);
  });
});
test(title('notebook-diagnostic'), { concurrency: false }, async t => {
  const laneA = metadataDatabase(); t.after(() => laneA.close());
  const laneB = metadataDatabase(); t.after(() => laneB.close());
  const mirrorVerification = addPlainMirror(laneB);
  for (const row of family('notebook-diagnostic')) await t.test(row.id + ' ' + row.query, () => {
    const originalA = originalSQL(laneA, row.query), originalB = originalSQL(laneB, row.query), actual = replacement(row.query);
    record(row, { laneA: originalA, laneB: originalB, replacement: actual, mirrorVerification,
      diagnosticScope: 'Actual unmodified original query-builder outcomes on two explicit synthetic schemas; no forced original/replacement agreement or FTS claim.' });
    assert.equal(row.comparisonRequired, false);
    for (const original of [originalA, originalB]) { assert.equal(original.builderReturned, true); assert.equal(original.sqliteAttempted, true); assert(typeof original.SQL === 'string'); }
    assert(Object.hasOwn(actual, 'value'), 'Supported notebook query must return replacement IDs; equality to original diagnostic lanes is not asserted');
    assert.deepEqual(databaseRows(laneA, 'notes'), expectedDatabaseRows);
    assert.deepEqual(databaseRows(laneB, 'notes'), expectedDatabaseRows);
    assert.deepEqual(databaseRows(laneB, 'notes_fts'), expectedDatabaseRows);
    assert.equal(JSON.stringify({ records, rows }), fixtureBefore);
  });
});
