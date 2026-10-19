// Runs only in the exact hosted branch/job below. Never invoke locally.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const PREFIX = 'products/rea-studio/experiments/notes-structured-search-cloud-20261019';
const SELF = PREFIX + '/run-experiment.mjs';
const WORKFLOW = '.github/workflows/notes-structured-search-experiment-cloud.yml';
const PLAN = { path: PREFIX + '/SOURCE-PLAN.json', bytes: 76743, sha256: '4387144781e0a2c7417115bb55c41ad191b3508f962b3175a6341e6c453a6731' };
const BASELINE = '2a8482b42784eb262d6d5b82e62d8d1220dc4821';
const BRANCH = 'refs/heads/experiment/notes-structured-search-20261019';
const root = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
const sourceLimits = { files: 256, individualBytes: 512 * 1024, rawBytes: 8 * 1024 * 1024, depth: 32 };
const outputLimit = 1024 * 1024, testTimeout = 180000;
const legacyObservation = 'products/rea-studio/.local/notes-notebook-trash-observations/trash-original.json';
const allowedChildEnvironment = new Set(['PATH', 'PATHEXT', 'SYSTEMROOT', 'COMSPEC', 'TEMP', 'TMP', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'LOCALAPPDATA', 'APPDATA', 'CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH']);
const childEnvironment = extra => ({ ...Object.fromEntries(Object.entries(process.env).filter(([key]) => allowedChildEnvironment.has(key.toUpperCase()))), ...extra });
const id = data => ({ bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') });
const pin = row => ({ bytes: row.bytes, sha256: row.sha256 });
const blob = data => createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
const execution = () => Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_REF', 'GITHUB_EVENT_NAME', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY', 'GITHUB_JOB'].map(key => [key, process.env[key]]));
function safe(name) {
  assert(typeof name === 'string' && name.length > 0 && name.length < 2048 && !name.startsWith('/') && !/[\\:\x00-\x1f\x7f<>"|?*]/.test(name));
  assert(name.split('/').every(part => part && part !== '.' && part !== '..' && part === part.replace(/[ .]+$/, '') && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)));
  return name;
}
function within(parent, child) { const rel = path.relative(parent, child); return !!rel && !path.isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + path.sep); }
function noLinks(filename) { let at = path.resolve(filename); while (true) { assert(!fs.lstatSync(at).isSymbolicLink(), 'No linked source/evidence ancestor: ' + at); const next = path.dirname(at); if (at === next) break; at = next; } assert.equal(fs.realpathSync(filename).toLowerCase(), path.resolve(filename).toLowerCase()); }
function read(directory, name, cap = sourceLimits.individualBytes) { const filename = path.join(directory, safe(name)); assert(within(directory, filename)); noLinks(filename); const stat = fs.lstatSync(filename); assert(stat.isFile() && stat.size <= cap); const bytes = fs.readFileSync(filename); assert.equal(bytes.length, stat.size); return bytes; }
function write(name, bytes) { assert(bytes.length <= 8 * 1024 * 1024); const target = path.join(evidence, safe(name)); assert(within(evidence, target)); fs.mkdirSync(path.dirname(target), { recursive: true }); noLinks(path.dirname(target)); fs.writeFileSync(target, bytes, { flag: 'wx' }); assert.deepEqual(read(evidence, name, 8 * 1024 * 1024), bytes); }
const json = (name, value) => write(name, Buffer.from(JSON.stringify(value, null, 2) + '\n'));
function git(args) { const value = spawnSync('git', args, { cwd: root, shell: false, windowsHide: true, timeout: 30000, maxBuffer: 32 * 1024 * 1024 }); assert.equal(value.error, undefined); assert.equal(value.status, 0, value.stderr?.toString()); return value.stdout; }
function tree(revision) { const rows = new Map(); for (const text of git(['ls-tree', '-r', '-z', '--full-tree', revision]).toString().split('\0').filter(Boolean)) { const match = /^(\d{6}) (blob|commit) ([0-9a-f]{40})\t(.+)$/.exec(text); assert(match); assert(!rows.has(match[4])); rows.set(match[4], { mode: match[1], kind: match[2], gitBlob: match[3] }); } return rows; }
function gitStatus() { return git(['status', '--porcelain=v1', '-z', '--untracked-files=all']).toString().split('\0').filter(Boolean).map(row => ({ status: row.slice(0, 2), path: row.slice(3) })).sort((a, b) => a.path.localeCompare(b.path)); }
function noteNames(directory, depth = 0) { assert(depth <= sourceLimits.depth); noLinks(directory); const names = []; for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { if (entry.name === 'results') continue; assert(!entry.isSymbolicLink()); const full = path.join(directory, entry.name); if (entry.isDirectory()) names.push(...noteNames(full, depth + 1)); else { assert(entry.isFile()); names.push(path.relative(root, full).replaceAll('\\', '/')); } } return names.sort(); }
function hosted() {
  assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
  for (const [key, value] of Object.entries({ CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', RUNNER_OS: 'Windows', RUNNER_ARCH: 'X64', GITHUB_REPOSITORY: 'Ginderlax/rea-research-lab', GITHUB_REF: BRANCH, GITHUB_EVENT_NAME: 'push', GITHUB_JOB: 'structured-search-finite' })) assert.equal(process.env[key], value, key);
  for (const key of ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) assert(/^[1-9][0-9]*$/.test(process.env[key]));
  assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA)); assert.equal(git(['rev-parse', 'HEAD']).toString().trim(), process.env.GITHUB_SHA);
  assert.deepEqual(git(['rev-list', '--parents', '-n', '1', 'HEAD']).toString().trim().split(' '), [process.env.GITHUB_SHA, BASELINE]);
  assert.equal(git(['rev-parse', '--show-object-format']).toString().trim(), 'sha1');
  assert.equal(path.resolve(fileURLToPath(import.meta.url)).toLowerCase(), path.join(root, SELF).toLowerCase()); noLinks(root);
}
hosted();
const args = process.argv.slice(2); assert.equal(args.length, 4); assert.equal(args[0], '--phase'); assert(['compose', 'finite', 'postcheck'].includes(args[1])); assert.equal(args[2], '--evidence');
const phase = args[1]; assert(path.isAbsolute(args[3]));
const temporary = fs.realpathSync(process.env.RUNNER_TEMP); const evidence = fs.realpathSync(args[3]); noLinks(evidence);
assert(within(temporary, evidence) && !within(root, evidence));
const currentTree = tree('HEAD'), baseTree = tree(BASELINE);
function committed(name, bytes) { const row = currentTree.get(name); assert(row && row.mode === '100644' && row.kind === 'blob'); assert.equal(blob(bytes), row.gitBlob, 'Committed byte identity: ' + name); return row; }
const planBytes = read(root, PLAN.path); assert.deepEqual(id(planBytes), pin(PLAN)); committed(PLAN.path, planBytes);
const plan = JSON.parse(planBytes);
assert.equal(plan.schema, 'rea-notes-structured-search-hosted-source-plan/v1'); assert.equal(plan.baselineCommit, BASELINE); assert.equal(plan.branch, BRANCH); assert.equal(plan.exactOverlayTargets, 18); assert.equal(plan.baselineNotesSources.length, 41); assert.equal(plan.composedNotesSources.length, 46);
assert.deepEqual(plan.limits.source, sourceLimits); assert.equal(plan.sourceOverlay, true); assert.equal(plan.productionInstallation, false); assert.equal(plan.historicalReceiptsRebound, false);
const packageNames = [...plan.packagedFiles.map(row => row.path), PLAN.path, SELF, WORKFLOW].sort();
assert.equal(new Set(packageNames).size, packageNames.length);
assert.deepEqual(git(['diff', '--name-only', '-z', BASELINE, 'HEAD']).toString().split('\0').filter(Boolean).sort(), packageNames);
for (const name of packageNames) { safe(name); assert(name === WORKFLOW || name.startsWith(PREFIX + '/')); assert(!baseTree.has(name)); committed(name, read(root, name)); }
for (const row of plan.packagedFiles) assert.deepEqual(id(read(root, row.path)), pin(row));
const transitions = plan.transitions; assert.equal(transitions.length, 18); assert.equal(new Set(transitions.map(row => row.path)).size, 18);
for (const row of transitions) { safe(row.path); assert(!packageNames.includes(row.path)); assert.equal(row.afterImage.path, PREFIX + '/payload/' + row.path + '.snapshot'); assert.deepEqual(id(read(root, row.afterImage.path)), pin(row.after)); if (row.before) { assert(baseTree.has(row.path)); assert.equal(baseTree.get(row.path).gitBlob, row.before.gitBlob); } else assert(!baseTree.has(row.path)); }
const dirty = transitions.map(row => ({ status: row.before ? ' M' : '??', path: row.path })).sort((a, b) => a.path.localeCompare(b.path));
function capture(kind, composed, save = true) {
  const definitions = composed ? plan.composedNotesSources : plan.baselineNotesSources;
  const actualNotes = noteNames(path.join(root, 'products/rea-studio/apps/notes'));
  const actualStatus = gitStatus(), authenticationErrors = [];
  const check = (name, body) => { try { body(); } catch (error) { authenticationErrors.push({ path: name, name: error.name, message: String(error.message).slice(0, 4000) }); } };
  check('Git worktree status', () => assert.deepEqual(actualStatus, composed ? dirty : []));
  check('Actual physical Notes census', () => assert.deepEqual(actualNotes, definitions.map(row => row.path).sort()));
  const expected = new Map([...definitions, ...plan.baselineDependencies, ...plan.studySources, ...plan.packagedFiles].filter(row => composed || !plan.studySources.some(item => item.path === row.path)).map(row => [row.path, row]));
  // Three cycle-free Git-authenticated collector roles have no in-plan SHA literals.
  for (const name of [PLAN.path, SELF, WORKFLOW]) expected.set(name, { path: name });
  // Preserve bounded unexpected Notes bytes as failed diagnostic evidence too.
  for (const name of actualNotes) if (!expected.has(name)) expected.set(name, { path: name });
  const rows = []; let total = 0;
  assert(expected.size <= sourceLimits.files);
  for (const [name, row] of [...expected].sort(([a], [b]) => a.localeCompare(b))) {
    if (!fs.existsSync(path.join(root, name))) { authenticationErrors.push({ path: name, name: 'MissingSource', message: 'Declared source is absent; its contents cannot be captured' }); continue; }
    const bytes = read(root, name); total += bytes.length; assert(total <= sourceLimits.rawBytes);
    if (row.sha256) check(name, () => assert.deepEqual(id(bytes), pin(row), name));
    const changed = transitions.find(item => item.path === name);
    check(name, () => { if (!(composed && changed)) { const metadata = committed(name, bytes); if (!packageNames.includes(name)) { assert(baseTree.has(name)); assert.deepEqual(metadata, baseTree.get(name)); } } else assert.deepEqual(id(bytes), pin(changed.after)); if (row.gitBlob && !(composed && changed)) assert.equal(blob(bytes), row.gitBlob); });
    const record = { path: name, ...id(bytes), gitBlob: blob(bytes), intendedEpoch: composed && changed ? 'exact-reviewed-overlay' : packageNames.includes(name) ? 'committed-experiment-package' : 'baseline2a848' };
    rows.push(record); if (save) write('source-' + kind + '/' + name + '.snapshot', bytes);
  }
  check('Exact selected source count', () => assert.equal(rows.length, composed ? plan.captureCounts.composed : plan.captureCounts.baseline));
  const result = { schema: 'rea-notes-search-source-capture/v1', execution: execution(), phase: kind, sourceCommit: process.env.GITHUB_SHA, baselineCommit: BASELINE, sourcePlan: id(planBytes), composed, sourceOverlay: composed, productionInstallation: false, historicalReceiptsRebound: false, files: rows.length, rawBytes: total, limits: sourceLimits, actualNotes, actualStatus, rows, contentsPreserved: save, sourceAuthenticated: authenticationErrors.length === 0, authenticationErrors };
  if (save) json('source-' + kind + '.json', result);
  assert.equal(authenticationErrors.length, 0, 'Source authentication failed; bounded observed source bytes and errors were preserved when capture was requested'); return result;
}
function sameAttempt(receipt) { assert.deepEqual(receipt.execution, execution()); assert.equal(receipt.sourceCommit, process.env.GITHUB_SHA); assert.deepEqual(receipt.sourcePlan, id(planBytes)); }
function composition() { const receipt = JSON.parse(read(evidence, 'composition.json')); sameAttempt(receipt); assert.equal(receipt.status, 'composed-unexecuted'); assert.equal(receipt.exactOverlayTargets, 18); const current = capture('reauthentication', true, false); assert.deepEqual(current.rows, receipt.composed.rows); return { receipt, current }; }
function totals(output) { const result = {}; for (const key of ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) { const values = [...output.matchAll(new RegExp('^# ' + key + ' ([0-9]+)\\r?$', 'gm'))]; assert.equal(values.length, 1, 'Exactly one real TAP summary: ' + key); result[key] = Number(values[0][1]); } return result; }
async function run(row, index) {
  const folder = 'tests/' + String(index + 1).padStart(2, '0') + '-' + path.basename(row.path); const start = new Date().toISOString();
  const chunks = { stdout: [], stderr: [] }, sizes = { stdout: 0, stderr: 0 }; let overflow = false, timedOut = false, failure = null;
  const observations = path.join(evidence, 'observations/' + String(index + 1).padStart(2, '0'));
  fs.mkdirSync(observations, { recursive: true }); noLinks(observations);
  if (row.path.endsWith('/notebook-trash.test.mjs')) assert(!fs.existsSync(path.join(root, legacyObservation)), 'No stale legacy observation may be reused');
  const result = await new Promise(resolve => {
    const child = spawn(process.execPath, ['--test', '--test-reporter=tap', '--test-concurrency=1', row.path], { cwd: root, windowsHide: true, shell: false, env: childEnvironment({ NOTES_REVIEW_OUTPUT: pathToFileURL(observations + path.sep).href }) });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, testTimeout);
    for (const channel of ['stdout', 'stderr']) child[channel].on('data', bytes => { const remaining = outputLimit - sizes[channel]; if (remaining > 0) { const saved = bytes.subarray(0, remaining); chunks[channel].push(saved); sizes[channel] += saved.length; } if (bytes.length > remaining) { overflow = true; child.kill(); } });
    child.once('error', error => { failure = { name: error.name, message: error.message }; });
    child.once('close', (code, signal) => { clearTimeout(timer); resolve({ code, signal }); });
  });
  const stdout = Buffer.concat(chunks.stdout), stderr = Buffer.concat(chunks.stderr); write(folder + '/stdout.txt', stdout); write(folder + '/stderr.txt', stderr);
  let legacyOutput = null;
  if (row.path.endsWith('/notebook-trash.test.mjs') && fs.existsSync(path.join(root, legacyObservation))) { const bytes = read(root, legacyObservation); write(folder + '/legacy-trash-original.json', bytes); legacyOutput = { path: legacyObservation, ...id(bytes), newlyWrittenInThisAttempt: true }; }
  let summary = null, qualificationError = null;
  try { summary = totals(stdout.toString('utf8')); assert.equal(failure, null); assert.equal(overflow, false); assert.equal(timedOut, false); assert.equal(result.code, 0); assert.equal(result.signal, null); assert.equal(summary.fail + summary.cancelled + summary.skipped + summary.todo, 0); assert.equal(summary.pass, summary.tests); assert(summary.tests >= row.minimumResults); if (row.exactResults !== null) assert.equal(summary.tests, row.exactResults); for (const title of row.requiredTopTitles) assert(stdout.toString().includes('# Subtest: ' + title)); }
  catch (error) { qualificationError = { name: error.name, message: error.message }; }
  const receipt = { path: row.path, role: row.role, startedAt: start, endedAt: new Date().toISOString(), command: [process.execPath, '--test', '--test-reporter=tap', '--test-concurrency=1', row.path], ...result, failure, timedOut, overflow, rawLogsComplete: !overflow, stdout: id(stdout), stderr: id(stderr), legacyOutput, observedTAP: summary, expected: row, status: qualificationError ? 'failed' : 'passed', qualificationError };
  json(folder + '/result.json', receipt); return receipt;
}
let record = { schema: 'rea-notes-search-hosted-' + phase + '/v1', execution: execution(), sourceCommit: process.env.GITHUB_SHA, baselineCommit: BASELINE, sourcePlan: id(planBytes), status: 'failed', sourceOverlay: true, productionInstallation: false, historicalReceiptsRebound: false, originalFullApplicationExecutions: 0, browserExecutions: 0, fullParity: false, superiority: false };
try {
  if (phase === 'compose') {
    assert(!fs.existsSync(path.join(root, legacyObservation)), 'Fresh owned runner must have no legacy output');
    const baseline = capture('baseline', false);
    for (const row of transitions) { if (row.before) assert.deepEqual(id(read(root, row.path)), pin(row.before)); else assert(!fs.existsSync(path.join(root, row.path))); const bytes = read(root, row.afterImage.path); assert.deepEqual(id(bytes), pin(row.after)); const target = path.join(root, row.path); fs.mkdirSync(path.dirname(target), { recursive: true }); noLinks(path.dirname(target)); fs.writeFileSync(target, bytes, { flag: row.before ? 'w' : 'wx' }); assert.deepEqual(id(read(root, row.path)), pin(row.after)); }
    const composed = capture('composed', true);
    record = { ...record, status: 'composed-unexecuted', exactOverlayTargets: 18, baseline, composed, productOrOriginalExecutions: 0 };
  } else if (phase === 'finite') {
    const { receipt, current } = composition(); const results = []; record.tests = results;
    const tar = spawnSync('tar', ['--version'], { cwd: root, shell: false, windowsHide: true, timeout: 30000, maxBuffer: 64 * 1024, env: childEnvironment({}) });
    write('native-tar-stdout.txt', tar.stdout ?? Buffer.alloc(0)); write('native-tar-stderr.txt', tar.stderr ?? Buffer.alloc(0));
    record.nativeTar = { status: tar.status, signal: tar.signal, error: tar.error ? { name: tar.error.name, message: tar.error.message } : null, stdout: id(tar.stdout ?? Buffer.alloc(0)), stderr: id(tar.stderr ?? Buffer.alloc(0)), fallbackAllowed: false };
    assert.equal(tar.error, undefined); assert.equal(tar.status, 0); assert.equal(tar.signal, null);
    for (const [index, row] of plan.tests.entries()) { const before = capture('test-reauthentication', true, false); assert.deepEqual(before.rows, current.rows); results.push(await run(row, index)); record.observedTests = results.reduce((sum, item) => sum + (item.observedTAP?.tests ?? 0), 0); const after = capture('test-reauthentication', true, false); assert.deepEqual(after.rows, current.rows); }
    record = { ...record, compositionReceipt: id(read(evidence, 'composition.json')), status: results.every(row => row.status === 'passed') ? 'passed' : 'failed', sourceFiles: current.files, tests: results, observedTests: results.reduce((sum, row) => sum + (row.observedTAP?.tests ?? 0), 0), rawLogsComplete: results.every(row => row.rawLogsComplete), exactOriginalParserCasesExpected: 48, exactOriginalMetadataSQLCasesExpected: 32, originalComparisonScope: plan.originalComparisonScope, broaderRemainingSearch: plan.remainingSearch, realBrowserAcceptance: false, performanceMeasured: false };
    if (record.status !== 'passed') process.exitCode = 1;
  } else {
    const after = capture('postrun', true); const { receipt } = composition(); assert.deepEqual(after.rows, receipt.composed.rows);
    record = { ...record, status: 'source-verified', compositionReceipt: id(read(evidence, 'composition.json')), after, sourceStable: true, productOrOriginalExecutions: 0 };
  }
} catch (error) { record.failure = { name: error.name, message: error.message, stack: String(error.stack).slice(0, 16000) }; process.exitCode = 1; }
json(phase === 'compose' ? 'composition.json' : phase + '.json', record);
console.log(JSON.stringify({ phase, status: record.status, sourceCommit: record.sourceCommit, observedTests: record.observedTests ?? null, fullParity: false, superiority: false }));
