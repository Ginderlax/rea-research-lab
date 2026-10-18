// Hosted-only R2 source epoch; one exact prior test strengthening is declared.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

assert.equal(process.platform, 'win32');
assert.equal(process.version, 'v24.16.0');
assert.equal(process.env.CI, 'true');
assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
assert.equal(process.env.RUNNER_OS, 'Windows');
assert.equal(process.env.RUNNER_ARCH, 'X64');
assert.equal(process.env.GITHUB_REPOSITORY, 'Ginderlax/rea-research-lab');
assert.equal(process.env.GITHUB_REF, 'refs/heads/experiment/notes-draft-recovery-20261018');
assert.equal(process.env.GITHUB_EVENT_NAME, 'push');
const args = process.argv.slice(2);
assert.equal(args.length, 6);
assert.equal(args[0], '--phase');
assert(['before', 'finite', 'browser', 'after'].includes(args[1]));
assert.equal(args[2], '--role');
assert(['finite', 'browser'].includes(args[3]));
assert.equal(args[4], '--evidence');
assert(path.isAbsolute(args[5]));
const phase = args[1], role = args[3];
if (['finite', 'browser'].includes(phase)) assert.equal(phase, role);
assert.equal(process.env.GITHUB_JOB, role === 'finite' ? 'draft-recovery-finite' : 'draft-recovery-real-chromium');
for (const key of ['GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'RUNNER_TEMP']) assert(process.env[key]);
assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA));
const studio = fileURLToPath(new URL('../', import.meta.url));
const repository = path.resolve(studio, '../..');
const temporary = fs.realpathSync(process.env.RUNNER_TEMP);
const within = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep);
};
assert(within(temporary, path.resolve(args[5])));
fs.mkdirSync(args[5], { recursive: true });
const evidence = fs.realpathSync(args[5]);
assert(within(temporary, evidence));
assert(!within(repository, evidence));
assert(!fs.lstatSync(evidence).isSymbolicLink());
const execution = Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_REF', 'GITHUB_EVENT_NAME', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY', 'GITHUB_JOB'].map(key => [key, process.env[key]]));
const limits = { files: 2000, individualBytes: 8 * 1024 * 1024, sourceBytes: 64 * 1024 * 1024, outputBytesPerStream: 8 * 1024 * 1024, depth: 128 };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = bytes => ({ bytes: bytes.length, sha256: hash(bytes) });
const pin = value => ({ bytes: value.bytes, sha256: value.sha256 });
const safe = name => {
  assert(typeof name === 'string' && name && !name.includes('\\') && !name.includes(':') && !name.includes('\0') && !name.startsWith('/'));
  assert(name.split('/').every(part => part && part !== '.' && part !== '..'));
  return name;
};
function readFile(root, name, limit = limits.individualBytes) {
  let filename = root;
  for (const part of safe(name).split('/')) {
    filename = path.join(filename, part);
    assert(!fs.lstatSync(filename).isSymbolicLink(), 'No source/evidence links: ' + name);
  }
  const item = fs.lstatSync(filename);
  assert(item.isFile() && item.size <= limit, 'Bounded ordinary file required: ' + name);
  const bytes = fs.readFileSync(filename);
  assert.equal(bytes.length, item.size);
  return bytes;
}
const readSource = name => readFile(repository, name);
const readEvidence = name => readFile(evidence, name);
const json = name => JSON.parse(readEvidence(name));
function writeBytes(name, bytes) {
  assert(bytes.length <= limits.individualBytes);
  const filename = path.join(evidence, safe(name));
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, bytes, { flag: 'wx' });
}
const write = (name, value) => writeBytes(name, Buffer.from(JSON.stringify(value, null, 2) + '\n'));
function git(arguments_, maxBuffer = 32 * 1024 * 1024) {
  const result = spawnSync('git', arguments_, { cwd: repository, shell: false, windowsHide: true, timeout: 30000, maxBuffer });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr?.toString('utf8'));
  return result.stdout;
}
const floorPath = 'products/rea-studio/scripts/notes-draft-recovery-regression-floor.json';
const workflowPath = '.github/workflows/notes-draft-recovery-experiment-cloud.yml';
const collectorPath = 'products/rea-studio/scripts/verify-notes-draft-recovery-cloud.mjs';
const transitionedTestPath = 'products/rea-studio/apps/notes/todo.integration.test.mjs';
const testBeforePath = 'products/rea-studio/experiments/notes-draft-recovery/transitions/todo.integration.test.mjs.before.snapshot';
const exactTestReplacements = [
  { before: "assert.deepEqual(imports, ['./markdown.mjs', './core.mjs']);", after: "assert.deepEqual(imports, ['./markdown.mjs', './core.mjs', './draft-recovery.mjs']);" },
  { before: 'unchangedPublicModuleBoundary: true, actualBrowserExecution: false', after: 'unchangedPublicModuleBoundary: false, explicitlyAddedRecoveryModule: true, actualBrowserExecution: false' },
];
const required = [workflowPath, collectorPath, floorPath,
  testBeforePath,
  'products/rea-studio/experiments/notes-draft-recovery/transitions/README.md',
  'products/rea-studio/apps/notes/draft-recovery.mjs',
  'products/rea-studio/apps/notes/draft-recovery.test.mjs',
  'products/rea-studio/apps/notes/draft-recovery.ui.test.mjs',
  'products/rea-studio/apps/notes/draft-recovery.http.test.mjs',
  'products/rea-studio/browser-tests/notes-draft-recovery.spec.mjs',
  'products/rea-studio/browser-tests/notes-draft-recovery.storage.spec.mjs',
  'products/rea-studio/browser-tests/playwright.notes-draft-recovery.config.mjs',
  'products/rea-studio/experiments/notes-draft-recovery/README.md',
  'products/rea-studio/experiments/notes-draft-recovery/BASELINE.json'];
const directories = ['apps', 'lib', 'public', 'browser-tests', 'scripts', 'tests'];
function eligible(name) {
  if (required.includes(name)) return true;
  if (!name.startsWith('products/rea-studio/')) return false;
  const relative = name.slice('products/rea-studio/'.length), parts = relative.split('/');
  if (['server.mjs', 'catalog.mjs', 'package.json'].includes(relative)) return true;
  if (parts.some(part => ['node_modules', '.local', 'results'].includes(part))) return false;
  if (relative.startsWith('apps/notes/')) return true;
  return directories.includes(parts[0]) && /\.(mjs|json|html|css|ps1)$/.test(parts.at(-1));
}
function tree() {
  const raw = git(['ls-tree', '-r', '-z', '--full-tree', 'HEAD', '--', 'products/rea-studio', workflowPath]);
  const objects = new Map(), rawRows = new Map();
  for (const row of raw.toString('utf8').split('\0').filter(Boolean)) {
    const match = /^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/.exec(row);
    assert(match, 'Only ordinary committed source blobs are allowed');
    safe(match[3]); assert(!objects.has(match[3])); objects.set(match[3], match[2]); rawRows.set(match[3], row);
  }
  return { objects, rawRows };
}
function committed(name, objects) {
  const bytes = readSource(name);
  const oid = createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
  assert.equal(oid, objects.get(name), 'Source differs from exact committed Git blob: ' + name);
  return bytes;
}
function regressionFloor(objects) {
  const raw = committed(floorPath, objects), value = JSON.parse(raw);
  assert.equal(value.schema, 'rea-notes-draft-recovery-regression-floor/v2');
  assert.equal(value.baselineGitCommit, '698d2e301765d1b878fb251b3d59dadb5a3c9bac');
  assert.equal(value.sourceTransitionParent, '3b4cfc3d14af3254273c666ab0c919965ab93dbe');
  assert.deepEqual(value.priorTestFilePolicy, { originalPinsRetained: 21, unchangedCurrentFiles: 20, explicitlyStrengthenedFiles: 1, retainedNamedResults: 111 });
  assert.equal(value.sourceOnly, true);
  assert.equal(value.priorTestFileCount, 21); assert.equal(value.priorNamedResultCount, 111);
  assert.equal(value.priorTests.length, 21); assert.equal(value.priorNamedResults.length, 111);
  assert.equal(new Set(value.priorTests.map(row => row.path)).size, 21);
  assert.equal(new Set(value.priorNamedResults).size, 111);
  assert.deepEqual([...value.newTestFiles].sort(), ['apps/notes/draft-recovery.http.test.mjs', 'apps/notes/draft-recovery.test.mjs', 'apps/notes/draft-recovery.ui.test.mjs']);
  assert.equal(value.newNamedResults.length, 17, 'Freeze the independently authored seventeen new finite checks before dispatch');
  assert.equal(new Set(value.newNamedResults).size, 17);
  assert(value.newNamedResults.every(name => !value.priorNamedResults.includes(name)));
  assert.equal(value.browserUITitles.length, 4); assert.equal(new Set(value.browserUITitles).size, 4);
  assert.equal(value.browserStorageTitles.length, 8); assert.equal(new Set(value.browserStorageTitles).size, 8);
  assert.equal(new Set([...value.browserUITitles, ...value.browserStorageTitles]).size, 12);
  assert.equal(value.originalInputs.length, 64);
  assert.equal(new Set(value.originalInputs.map(row => row.path)).size, 64);
  assert.equal(value.unchangedTooling.length, 2);
  assert.equal(value.historicalReceiptsRebound, false);
  assert.equal(value.fullParity, false); assert.equal(value.superiority, false);
  assert.equal(value.testTransitions.length, 1);
  const transition = value.testTransitions[0];
  assert.equal(transition.path, transitionedTestPath);
  assert.equal(transition.beforeSnapshotPath, testBeforePath);
  assert.deepEqual(transition.exactReplacements, exactTestReplacements);
  const prior = value.priorTests.find(row => row.path === transitionedTestPath); assert(prior);
  assert.deepEqual(transition.before, { gitBlob: prior.gitBlob, ...pin(prior) });
  assert.deepEqual(transition.after, { bytes: 5864, sha256: '7252a94a7b89afba359a6efccba2cd078a520fd268ccbe82ff242fe66ec5ca40' });
  const before = committed(testBeforePath, objects);
  assert.deepEqual(identity(before), pin(prior));
  assert.equal(createHash('sha1').update(Buffer.from('blob ' + before.length + '\0')).update(before).digest('hex'), prior.gitBlob);
  let expectedAfter = before;
  for (const replacement of exactTestReplacements) {
    const oldBytes = Buffer.from(replacement.before), newBytes = Buffer.from(replacement.after);
    const offset = expectedAfter.indexOf(oldBytes);
    assert(offset >= 0 && expectedAfter.lastIndexOf(oldBytes) === offset, 'Exactly one occurrence of the declared test-only byte replacement is required');
    expectedAfter = Buffer.concat([expectedAfter.subarray(0, offset), newBytes, expectedAfter.subarray(offset + oldBytes.length)]);
  }
  const after = committed(transitionedTestPath, objects);
  assert.deepEqual(after, expectedAfter, 'The existing delivery test may change only by its two explicitly reviewed byte replacements');
  assert.deepEqual(identity(after), pin(transition.after));
  for (const row of [...value.priorTests.filter(row => row.path !== transitionedTestPath), ...value.originalInputs, ...value.unchangedTooling]) {
    const bytes = committed(safe(row.path), objects);
    assert.deepEqual(identity(bytes), pin(row), 'Frozen regression/original/tool input changed: ' + row.path);
    if (row.gitBlob) assert.equal(objects.get(row.path), row.gitBlob);
  }
  const tests = [...value.priorTests.map(row => row.path.slice('products/rea-studio/'.length)), ...value.newTestFiles].sort();
  const actual = [...objects.keys()].filter(name => name.startsWith('products/rea-studio/apps/notes/') && !name.includes('/results/') && name.endsWith('.test.mjs')).map(name => name.slice('products/rea-studio/'.length)).sort();
  assert.deepEqual(actual, tests, 'No omitted or additional active Notes finite tests');
  return { raw, value, tests };
}
function census(capturePrefix = null) {
  assert.equal(git(['rev-parse', 'HEAD']).toString('utf8').trim(), process.env.GITHUB_SHA);
  assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']).toString('utf8'), '', 'Source checkout must remain clean');
  const { objects, rawRows } = tree(), floor = regressionFloor(objects);
  for (const name of required) assert(objects.has(name), 'Missing committed experiment source: ' + name);
  const names = [...new Set([...objects.keys()].filter(eligible).concat(floor.value.originalInputs.map(row => row.path)))].sort();
  assert(names.length <= limits.files);
  const actualActive = [];
  function walk(directory, depth = 0) {
    assert(depth <= limits.depth);
    const item = fs.lstatSync(directory); assert(item.isDirectory() && !item.isSymbolicLink());
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (['node_modules', '.local', 'results'].includes(entry.name)) continue;
      assert(!entry.isSymbolicLink());
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(filename, depth + 1);
      else {
        assert(entry.isFile());
        const name = path.relative(repository, filename).replaceAll('\\', '/');
        if (eligible(name)) actualActive.push(name);
      }
    }
  }
  for (const name of directories) walk(path.join(studio, name));
  for (const name of ['server.mjs', 'catalog.mjs', 'package.json']) actualActive.push('products/rea-studio/' + name);
  const activeExpected = [...objects.keys()].filter(name => eligible(name) && !required.includes(name)).sort();
  assert.deepEqual(actualActive.filter(name => !required.includes(name)).sort(), activeExpected, 'Complete active six-directory filesystem/Git source closure');
  const rows = []; let total = 0;
  for (const name of names) {
    const bytes = committed(name, objects); total += bytes.length;
    assert(total <= limits.sourceBytes);
    rows.push({ path: name, gitBlob: objects.get(name), ...identity(bytes) });
    if (capturePrefix) writeBytes(capturePrefix + '/' + name + '.snapshot', bytes);
  }
  const selectedTree = Buffer.from(names.map(name => rawRows.get(name) + '\0').join(''));
  if (capturePrefix) writeBytes(capturePrefix + '/GIT-TREE.selected.raw', selectedTree);
  return { rows, bytes: total, floor, gitTree: { ...identity(selectedTree), scope: 'Exact raw Git rows for the complete selected active source closure and fixed original inputs' }, sourceCommit: process.env.GITHUB_SHA };
}
function sameAttempt(value) {
  assert.deepEqual(value.execution, execution);
  assert.equal(value.sourceCommit, process.env.GITHUB_SHA);
  assert.equal(value.role, role);
}
const record = { schema: 'rea-notes-draft-recovery-experiment-cloud/v2', phase, role, status: 'running', sourceCommit: process.env.GITHUB_SHA,
  sourceEpoch: 'explicit-canonical-save-and-delivery-transition-r2', historicalFailureSourceCommit: '3b4cfc3d14af3254273c666ab0c919965ab93dbe',
  execution, startedAtUtc: new Date().toISOString(), limits, children: [], sourceOverlay: false, sourceMutationPerformed: false,
  installedAcceptance: false, historicalReceiptsRebound: false, originalFullApplicationExecutions: 0,
  originalAutosaveComparison: false, fullParity: false, superiority: false, failure: null };
const recordName = 'draft-recovery-' + role + '-' + phase + '.json';
let active = null, interrupted = null;
function saveRecord() {
  const target = path.join(evidence, recordName), next = target + '.pending';
  fs.writeFileSync(next, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  fs.renameSync(next, target);
}
function killOwnedChild(child) {
  if (child?.pid && child.exitCode === null) {
    const killed = spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, timeout: 10000, stdio: 'ignore' });
    if (killed.status !== 0) child.kill('SIGKILL');
  }
}
const handlers = new Map(['SIGINT', 'SIGTERM', 'SIGBREAK'].map(signal => [signal, () => {
  interrupted = signal;
  active?.stop('interrupted by ' + signal);
}]));
for (const [signal, handler] of handlers) process.on(signal, handler);
async function run(arguments_, label, timeoutMs, environment = {}) {
  assert(!interrupted);
  const stdoutName = label + '-stdout.txt', stderrName = label + '-stderr.txt';
  const streams = [fs.openSync(path.join(evidence, stdoutName), 'wx'), fs.openSync(path.join(evidence, stderrName), 'wx')];
  const childRecord = { label, command: [process.execPath, ...arguments_], timeoutMs, cwd: studio, startedAtUtc: new Date().toISOString(), stdout: stdoutName, stderr: stderrName, outputBytes: [0, 0], rawLogsComplete: true, stopReason: null, closeObserved: false };
  record.children.push(childRecord); saveRecord();
  let child;
  try {
    await new Promise(resolve => {
      let ended = false, forced, timeout;
      const finish = (exitCode, signal, closeObserved) => {
        if (ended) return; ended = true;
        clearTimeout(timeout); clearTimeout(forced);
        Object.assign(childRecord, { exitCode, signal, closeObserved, completedAtUtc: new Date().toISOString() });
        active = null; resolve();
      };
      const stop = reason => {
        if (childRecord.stopReason) return;
        childRecord.stopReason = reason;
        killOwnedChild(child);
        forced = setTimeout(() => finish(null, null, false), 15000);
      };
      child = spawn(process.execPath, arguments_, { cwd: studio, shell: false, windowsHide: true, env: { ...process.env, ...environment }, stdio: ['ignore', 'pipe', 'pipe'] });
      active = { child, stop };
      childRecord.pid = child.pid ?? null;
      for (const [index, stream] of [child.stdout, child.stderr].entries()) stream.on('data', bytes => {
        childRecord.outputBytes[index] += bytes.length;
        if (childRecord.outputBytes[index] > limits.outputBytesPerStream) {
          childRecord.rawLogsComplete = false; stop('raw output exceeded its fixed bound'); return;
        }
        fs.writeFileSync(streams[index], bytes);
        (index === 0 ? process.stdout : process.stderr).write(bytes);
      });
      child.on('error', error => { childRecord.spawnError = { name: error.name, message: error.message }; finish(null, null, false); });
      child.on('close', (code, signal) => finish(code, signal, true));
      timeout = setTimeout(() => stop('child exceeded its fixed deadline'), timeoutMs);
    });
  } finally {
    for (const fd of streams) { fs.fsyncSync(fd); fs.closeSync(fd); }
    saveRecord();
  }
  assert(childRecord.closeObserved && childRecord.exitCode === 0 && childRecord.signal === null && childRecord.stopReason === null && !childRecord.spawnError && childRecord.rawLogsComplete && !interrupted, 'Owned hosted child failed: ' + label);
  childRecord.stdoutIdentity = identity(readEvidence(stdoutName)); childRecord.stderrIdentity = identity(readEvidence(stderrName));
}
function finiteResults(floor) {
  const text = readEvidence('finite-stdout.txt').toString('utf8');
  assert(text.startsWith('TAP version 13\n') || text.startsWith('TAP version 13\r\n'));
  assert(!/^\s*not ok\b/m.test(text));
  const names = [...text.matchAll(/^# Subtest: (.+)\r?$/gm)].map(match => match[1]);
  const expected = [...floor.value.priorNamedResults, ...floor.value.newNamedResults];
  assert.equal(names.length, 128); assert.equal(new Set(names).size, 128);
  assert.deepEqual([...names].sort(), [...expected].sort(), 'Exact unchanged111 plus seventeen new result names required');
  const oks = [...text.matchAll(/^ok ([0-9]+) - (.+)\r?$/gm)];
  assert.equal(oks.length, 128);
  for (let index = 0; index < oks.length; index++) {
    assert.equal(Number(oks[index][1]), index + 1);
    assert.equal(oks[index][2], names[index]);
  }
  for (const [name, count] of Object.entries({ tests: 128, suites: 0, pass: 128, fail: 0, cancelled: 0, skipped: 0, todo: 0 })) {
    const rows = [...text.matchAll(new RegExp('^# ' + name + ' ([0-9]+)\\r?$', 'gm'))];
    assert.equal(rows.length, 1); assert.equal(Number(rows[0][1]), count);
  }
  assert.equal([...text.matchAll(/^1\.\.128\r?$/gm)].length, 1);
  return { tests: 128, pass: 128, fail: 0, skipped: 0, cancelled: 0, todo: 0, retainedPriorNamedChecks: 111, unchangedPriorTestFiles: 20, explicitlyStrengthenedPriorTestFiles: 1, newCandidateOnlyTests: 17, names,
    originalComparisonScope: 'Unchanged legacy tests execute pinned original helper slices. No original full application or database and no autosave/crash-recovery comparison.' };
}
async function browserPrerequisites(objects) {
  const acquisition = json('browser-tooling-acquisition.json');
  assert.equal(acquisition.schema, 'rea-cloud-browser-tooling-acquisition/v1');
  assert.equal(acquisition.status, 'acquired');
  const acquisitionExecution = { ...execution };
  for (const key of ['GITHUB_JOB', 'GITHUB_REF', 'GITHUB_EVENT_NAME']) delete acquisitionExecution[key];
  assert.deepEqual(acquisition.execution, acquisitionExecution);
  assert.equal(acquisition.sourceCommit, process.env.GITHUB_SHA);
  assert.equal(acquisition.productTests, 0); assert.equal(acquisition.applicationSourcesChanged, false);
  assert.equal(acquisition.historicalReceiptsRebound, false);
  assert.equal(acquisition.children.length, 2);
  for (const child of acquisition.children) {
    assert.equal(child.exitCode, 0); assert.equal(child.signal, null); assert.equal(child.closeObserved, true); assert.equal(child.stopReason, null); assert.equal(child.spawnError, undefined);
  }
  const tools = path.join(studio, 'browser-tests');
  for (const name of ['@playwright/test', 'playwright', 'playwright-core']) assert.equal(JSON.parse(readFile(tools, 'node_modules/' + name + '/package.json')).version, '1.64.1');
  const metadata = committed('products/rea-studio/browser-tests/browser-metadata.json', objects);
  assert.deepEqual(readFile(tools, 'node_modules/playwright-core/browsers.json'), metadata);
  assert.deepEqual(acquisition.toolingSource.package, identity(committed('products/rea-studio/browser-tests/package.json', objects)));
  assert.deepEqual(acquisition.toolingSource.lock, identity(committed('products/rea-studio/browser-tests/package-lock.json', objects)));
  assert.deepEqual(acquisition.toolingSource.browserMetadata, identity(metadata));
  const cache = fs.realpathSync(process.env.PLAYWRIGHT_BROWSERS_PATH);
  assert(within(temporary, cache));
  const { chromium } = await import(pathToFileURL(path.join(tools, 'node_modules/playwright/index.mjs')).href);
  const executable = fs.realpathSync(chromium.executablePath());
  assert(within(cache, executable)); assert(executable.split(path.sep).includes('chromium-1248'));
  assert.equal(acquisition.browserImage.executable, executable);
  assert.equal(acquisition.browserImage.revision, '1248'); assert.equal(acquisition.browserImage.expectedVersion, '156.0.8078.4');
  const hash_ = createHash('sha256'); let bytes = 0;
  for await (const chunk of fs.createReadStream(executable)) { hash_.update(chunk); bytes += chunk.length; }
  assert.deepEqual({ bytes, sha256: hash_.digest('hex') }, pin(acquisition.browserImage));
  return { acquisition: identity(readEvidence('browser-tooling-acquisition.json')), browserImage: acquisition.browserImage };
}
function browserResults(floor) {
  const report = json('playwright-results.json'), specs = [];
  const visit = suite => { specs.push(...(suite.specs ?? [])); for (const nested of suite.suites ?? []) visit(nested); };
  for (const suite of report.suites) visit(suite);
  assert.deepEqual(report.errors, []);
  assert.equal(specs.length, 12);
  assert.deepEqual(specs.map(spec => spec.title).sort(), [...floor.value.browserUITitles, ...floor.value.browserStorageTitles].sort());
  for (const spec of specs) {
    assert.equal(spec.ok, true); assert.equal(spec.tests.length, 1);
    const test = spec.tests[0]; assert.equal(test.status, 'expected'); assert.equal(test.results.length, 1);
    assert.equal(test.results[0].status, 'passed'); assert.equal(test.results[0].retry, 0);
    const normalized = spec.file.replaceAll('\\', '/').split('/').at(-1);
    assert.equal(normalized, floor.value.browserUITitles.includes(spec.title) ? 'notes-draft-recovery.spec.mjs' : 'notes-draft-recovery.storage.spec.mjs');
  }
  assert.deepEqual([report.stats.expected, report.stats.unexpected, report.stats.skipped, report.stats.flaky], [12, 0, 0, 0]);
  const cases = fs.readdirSync(evidence).filter(name => /^notes-draft-case-[0-9a-f]{20}\.json$/.test(name));
  assert.equal(cases.length, 4);
  const observations = cases.map(name => ({ name, value: json(name) }));
  assert.deepEqual(observations.map(row => row.value.title).sort(), [...floor.value.browserUITitles].sort());
  for (const row of observations) {
    const value = row.value;
    assert.equal(value.schema, 'rea-notes-draft-recovery-real-browser-case/v1');
    assert(typeof value.testId === 'string' && value.testId.length > 0 && value.testId.length <= 200);
    assert.equal(row.name, 'notes-draft-case-' + hash(Buffer.from(value.title)).slice(0, 20) + '.json');
    assert.equal(value.sourceCommit, process.env.GITHUB_SHA); assert.equal(String(value.runId), process.env.GITHUB_RUN_ID); assert.equal(String(value.attempt), process.env.GITHUB_RUN_ATTEMPT);
    assert.deepEqual(value.errors, []);
    assert.equal(value.browserName, 'chromium'); assert.equal(value.browserVersion, '156.0.8078.4');
    assert.equal(value.realBrowser, true); assert.equal(value.actualHTTP, true); assert.equal(value.retry, 0);
    for (const key of ['contextClosed', 'hostClosed', 'dataRemoved', 'heldRoutesFinished']) assert.equal(value.cleanup[key], true, 'UI scenario cleanup: ' + key);
    assert(Array.isArray(value.requests)); assert(Array.isArray(value.observations));
  }
  const storageNames = ['storage-01-persistence.json', 'storage-02-atomic-versions.json', 'storage-03-capacity-utf8.json', 'storage-04-corrupt-preservation.json', 'storage-05-injected-abort.json', 'storage-06-blocked-open-control.json', 'storage-07-versionchange-close.json', 'storage-08-workspace-isolation.json'];
  assert.deepEqual(fs.readdirSync(evidence).filter(name => /^storage-[0-9][0-9]-.*\.json$/.test(name)).sort(), [...storageNames].sort());
  const storageObservations = storageNames.map(name => { const value = json(name); assert(value && typeof value === 'object' && !Array.isArray(value)); return { path: name, ...identity(readEvidence(name)) }; });
  return { tests: 12, pass: 12, fail: 0, skipped: 0, flaky: 0, retries: 0, realUI: 4, realIndexedDB: 8, storageObservations,
    UIObservations: observations.map(row => ({ path: row.name, title: row.value.title, ...identity(readEvidence(row.name)) })), originalProductExecutions: 0, originalAutosaveComparison: false };
}
function evidenceCensus() {
  const rows = []; let bytes = 0;
  function walk(directory, relative = '', depth = 0) {
    assert(depth <= limits.depth);
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      assert(!item.isSymbolicLink());
      const name = relative + item.name, filename = path.join(directory, item.name);
      if (item.isDirectory()) walk(filename, name + '/', depth + 1);
      else {
        assert(item.isFile());
        if (name === recordName || name === recordName + '.pending') continue;
        const content = readEvidence(name); rows.push({ path: name, ...identity(content) }); bytes += content.length;
        assert(rows.length <= 5000 && bytes <= 96 * 1024 * 1024);
      }
    }
  }
  walk(evidence); return { rows: rows.sort((a, b) => a.path.localeCompare(b.path)), bytes, excludesOwnTerminalRecord: true };
}

let before;
saveRecord();
try {
  if (phase === 'before') {
    const current = census('source-before');
    write('draft-recovery-' + role + '-source-before.json', current.rows);
    record.sourceAuthentication = { files: current.rows.length, bytes: current.bytes, gitTree: current.gitTree, originalPriorPinsPreserved: 21, unchangedPriorTestFiles: 20, explicitlyStrengthenedPriorTestFiles: 1, retainedPriorNamedResults: 111, capturedOriginalInputs: 64 };
    record.sourceStable = true; record.status = 'source-verified-unexecuted';
  } else {
    const receipt = json('draft-recovery-' + role + '-before.json'); sameAttempt(receipt);
    assert.equal(receipt.status, 'source-verified-unexecuted');
    before = json('draft-recovery-' + role + '-source-before.json');
    const current = census(phase === 'after' ? 'source-after' : null);
    assert.deepEqual(current.rows, before, 'Execution inputs differ from the before snapshot');
    record.beforeReceipt = identity(readEvidence('draft-recovery-' + role + '-before.json'));
    record.regressionFloor = identity(current.floor.raw);
    if (phase === 'after') {
      write('draft-recovery-' + role + '-source-after.json', current.rows);
      record.sourceStable = true; record.sourceAuthentication = receipt.sourceAuthentication;
      const prior = json('draft-recovery-' + role + '-' + role + '.json'); sameAttempt(prior);
      record.executionAttempt = identity(readEvidence('draft-recovery-' + role + '-' + role + '.json'));
      record.executionStatus = prior.status;
      record.status = 'source-verified';
    } else if (phase === 'finite') {
      record.fixedTestFiles = current.floor.tests;
      const observationRoot = path.join(evidence, 'notes-observations'); fs.mkdirSync(observationRoot);
      await run(['--test', '--test-reporter=tap', '--test-concurrency=1', ...current.floor.tests], 'finite', 20 * 60000,
        { NOTES_REVIEW_OUTPUT: pathToFileURL(observationRoot + path.sep).href });
      record.finite = finiteResults(current.floor);
      record.productTests = 128; record.status = 'passed';
    } else {
      const { objects } = tree(); Object.assign(record, await browserPrerequisites(objects));
      assert(path.isAbsolute(process.env.REA_BROWSER_DATA_ROOT ?? ''));
      const dataRoot = fs.realpathSync(process.env.REA_BROWSER_DATA_ROOT);
      assert(within(temporary, dataRoot)); assert(!within(repository, dataRoot)); assert(!within(evidence, dataRoot));
      assert.equal(fs.readdirSync(dataRoot).length, 0, 'Browser fixtures need an initially empty owned data root');
      record.ownedSyntheticDataRoot = dataRoot;
      await run([path.join(studio, 'browser-tests/node_modules/playwright/cli.js'), 'test', '--config', path.join(studio, 'browser-tests/playwright.notes-draft-recovery.config.mjs')], 'real-chromium', 15 * 60000,
        { REA_BROWSER_EVIDENCE: evidence, REA_BROWSER_DATA_ROOT: dataRoot });
      record.browser = browserResults(current.floor);
      record.productTests = 12; record.status = 'passed';
    }
  }
} catch (error) {
  record.status = interrupted ? 'interrupted' : 'failed';
  record.failure = { name: error.name, message: error.message, stack: error.stack };
  killOwnedChild(active?.child); process.exitCode = 1;
} finally {
  if (before && phase !== 'after') {
    try {
      const after = census();
      write('draft-recovery-' + role + '-execution-postcheck.json', after.rows);
      assert.deepEqual(after.rows, before); record.sourceStable = true;
    } catch (error) {
      record.status = 'failed'; record.sourceStable = false;
      record.sourceFailure = { name: error.name, message: error.message }; process.exitCode = 1;
    }
  }
  try { record.retainedEvidence = evidenceCensus(); }
  catch (error) { record.status = 'failed'; record.evidenceFailure = { name: error.name, message: error.message }; process.exitCode = 1; }
  record.completedAtUtc = new Date().toISOString();
  saveRecord();
  for (const [signal, handler] of handlers) process.off(signal, handler);
}
console.log(JSON.stringify({ phase, role, status: record.status, productTests: record.productTests ?? 0, sourceStable: record.sourceStable ?? null, installedAcceptance: false, fullParity: false, superiority: false }));
