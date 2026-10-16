import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { arch, platform } from 'node:os';

// This collector writes only to its explicit evidence directory. In particular,
// finite runs never replace results/development-validation.json or old receipts.
const studio = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const censusDirectories = ['apps', 'lib', 'public', 'scripts', 'tests'];
const excludedDirectories = ['.local', 'node_modules'];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = bytes => ({ bytes: bytes.length, sha256: sha256(bytes) });
const slash = name => name.replaceAll('\\', '/');
const inside = (parent, target) => {
  const relative = path.relative(parent, target);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
};
const options = { scope: null, output: null, timeoutMs: 35 * 60_000, bootstrapManifest: null, overlayManifest: null, installedManifest: null, snapshotScope: 'active', sourceOnly: false };
const names = new Map([['--scope', 'scope'], ['--output', 'output'], ['--timeout-ms', 'timeoutMs'], ['--bootstrap-manifest', 'bootstrapManifest'], ['--overlay-manifest', 'overlayManifest'], ['--installed-manifest', 'installedManifest'], ['--snapshot-scope', 'snapshotScope']]);
const seenOptions = new Set();
for (let i = 2; i < process.argv.length; i++) {
  const argument = process.argv[i];
  assert(!seenOptions.has(argument), 'Repeated option: ' + argument);
  seenOptions.add(argument);
  if (argument === '--source-only') { options.sourceOnly = true; continue; }
  assert(names.has(argument), 'Unknown option: ' + argument);
  assert(i + 1 < process.argv.length && !process.argv[i + 1].startsWith('--'), 'Missing value: ' + argument);
  options[names.get(argument)] = process.argv[++i];
}
assert(['flow-vault', 'full', 'archive-aes-experiment', 'full-oracle-experiment', 'windows-path-experiment', 'windows-path-installed', 'vault-empty-bin-experiment', 'notes-todo-experiment'].includes(options.scope), 'Use a supported explicit cloud verification scope');
const windowsPathScope = ['windows-path-experiment', 'windows-path-installed'].includes(options.scope);
assert(['all', 'active'].includes(options.snapshotScope), 'Use --snapshot-scope all or active');
assert(typeof options.output === 'string' && path.isAbsolute(options.output), '--output must be absolute');
options.timeoutMs = Number(options.timeoutMs);
assert(Number.isSafeInteger(options.timeoutMs) && options.timeoutMs >= 1_000 && options.timeoutMs <= 2 * 60 * 60_000, 'Invalid bounded timeout');
if (options.bootstrapManifest) assert(path.isAbsolute(options.bootstrapManifest), '--bootstrap-manifest must be absolute');
if (options.overlayManifest) assert(path.isAbsolute(options.overlayManifest), '--overlay-manifest must be absolute');
if (options.installedManifest) assert(path.isAbsolute(options.installedManifest), '--installed-manifest must be absolute');
assert(['archive-aes-experiment', 'full-oracle-experiment', 'windows-path-experiment', 'vault-empty-bin-experiment', 'notes-todo-experiment'].includes(options.scope) || !options.overlayManifest, 'Overlay provenance is exclusive to an explicit experimental scope');
assert(options.scope === 'windows-path-installed' || !options.installedManifest, 'Installed-source provenance requires the explicit installed scope');
if (windowsPathScope) assert(!options.bootstrapManifest, 'The finite Windows path scopes have no vendor prerequisite manifest');
if (options.scope === 'notes-todo-experiment') assert(!options.bootstrapManifest, 'Notes uses only committed fixture/original sources and system TAR; no vendor acquisition manifest');

// Resolve existing ancestors before creating anything, so an evidence-directory
// symlink cannot put logs inside the source census.
function resolvedDestination(destination) {
  let ancestor = path.resolve(destination);
  const suffix = [];
  while (!fs.existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    assert.notEqual(parent, ancestor, 'Output ancestor unavailable');
    suffix.unshift(path.basename(ancestor));
    ancestor = parent;
  }
  return path.join(fs.realpathSync(ancestor), ...suffix);
}
const output = resolvedDestination(options.output);
const realStudio = fs.realpathSync(studio);
assert(!inside(output, realStudio), 'Output cannot be Studio or one of its ancestors');
for (const directory of censusDirectories) assert(!inside(path.join(realStudio, directory), output), 'Output overlaps source census: ' + directory);
fs.mkdirSync(output, { recursive: true });
assert(fs.statSync(output).isDirectory(), 'Output must be a directory');
const reserved = ['attempt-validation.json', 'attempt-validation.json.tmp', 'events.jsonl', 'stdout.txt', 'stderr.txt', 'source-before.json', 'source-after.json', 'source-snapshot-manifest.json', 'source', 'runner.mjs.snapshot', 'development-validation.json', 'bootstrap-prerequisites.json.snapshot', 'overlay-composition.json.snapshot', 'experimental-test-selection.json.snapshot', 'oracle-test-composition.json.snapshot', 'oracle-test-bundle.json.snapshot', 'windows-path-composition.json.snapshot', 'windows-path-installed-source-check.json.snapshot', 'windows-path-bundle.json.snapshot', 'git-baseline-active-source.json', 'prerequisite-receipts', 'vault-empty-bin-composition.json.snapshot', 'vault-empty-bin-bundle.json.snapshot', 'vault-empty-bin-original-summary.json.snapshot', 'empty-bin-original-observations', 'notes-todo-composition.json.snapshot', 'notes-todo-bundle.json.snapshot', 'notes-todo-observations.json', 'notes-observations', 'notes-legacy-trash-original.json'];
for (const name of reserved) assert(!fs.existsSync(path.join(output, name)), 'Evidence already exists; use a new run directory: ' + name);

const open = name => fs.openSync(path.join(output, name), 'wx');
const stdoutFd = open('stdout.txt'), stderrFd = open('stderr.txt'), eventsFd = open('events.jsonl');
const startedAtUtc = new Date().toISOString();
let eventNumber = 0, logsOpen = true, child = null, stopReason = null, receivedSignal = null;
let stdoutBytes = 0, stderrBytes = 0, droppedOutputBytes = 0;
let heartbeat = null, deadline = null, forcedClose = null, finishAfterStop = null;
const limits = { stdoutBytes: 16 * 1024 * 1024, stderrBytes: 4 * 1024 * 1024, timeoutMs: options.timeoutMs };
const record = {
  schema: 'rea-cloud-development-attempt/v1', status: 'running', phase: 'initializing', startedAtUtc,
  scope: options.scope, sourceOnly: options.sourceOnly, snapshotScope: options.snapshotScope,
  selectedTestFiles: [], childStarted: false, exitCode: null, signal: null, failure: null,
  summary: null, sourceFiles: null, sourceStable: null, sourceCapturedBeforeExecution: false,
  sourceSnapshotsInert: true, sourceSnapshotFiles: 0, limits,
  fullFeatureParityEstablished: false, universalSuperiorityEstablished: false,
  historicalReceiptsRebound: false, historicalDevelopmentReceiptOverwritten: false,
  acceptanceScope: options.scope === 'notes-todo-experiment' ? 'Every current Notes test in a fixed17-file roster under an exact eight-target hosted source composition. Twenty-three authored new groups and twenty original helper comparisons are separate counts. Actual HTTP module delivery, same-attempt full source census, other active Git blobs and an independent source postcheck are mandatory. No production installation, original full application/database/GUI, real browser, security, full parity or superiority acceptance.' : options.scope === 'vault-empty-bin-experiment' ? 'Every current Vault test in a fixed45-file roster on an explicit nine-target source experiment: three runtime changes and six test/helper additions. Twenty initial authored groups, five adjacent groups and two original-library groups are separate source selections; four actual library child operations retain actual dates and are counted separately. All other eligible active sources must match committed Git, source before/after and an independent postcheck must pass. No production installation, actual browser, full-suite, security, parity or superiority acceptance.' : options.scope === 'windows-path-installed' ? 'Five finite Editor Git and Sync WebDAV test files on a clean committed checkout whose three current source images exactly match the reviewed after-image pins. Every eligible active source is Git-blob authenticated; same-attempt source census and a separate committed-source postcheck are required. This collector performs no source installation or composition and does not authenticate a production installer receipt. Full suite, browser, security, parity and superiority remain separate.' : options.scope === 'windows-path-experiment' ? 'Five finite Editor Git and Sync WebDAV test files with a hosted-only three-target source composition: one explicit Sync runtime correction, one Editor physical-path observer correction and one new Windows regression file. Git identifies the committed baseline and inert payloads; composition identifies the active derivative. A separate same-attempt source postcheck is required. Active production integration, full suite, browser acceptance, security, parity and superiority remain open.' : options.scope === 'full-oracle-experiment' ? 'Every current implemented development test with an explicitly composed three-file bsdtar oracle-test overlay. Application runtime sources retain their Git baseline bytes; two oracle loaders and a new helper belong to a new test-dependency epoch. A separate same-attempt composer postcheck remains required. No unchanged-test, historical-DLL, browser, product-parity or superiority acceptance.' : options.scope === 'archive-aes-experiment' ? 'Finite experimental Archive AES and Windows source metadata contracts on an explicitly composed hosted working tree. The Git revision alone describes the baseline and committed overlay payloads; composition provenance identifies the active experimental bytes. Production integration, full Archive acceptance, browser acceptance, full parity and superiority remain open.' : options.scope === 'flow-vault' ? 'Finite Flow and Vault implemented contracts; other applications are not executed.' : 'Current implemented development contracts; every documented original feature and comparative acceptance remain open.',
  evidenceDirectory: output, failures: [],
};
function flush() {
  if (logsOpen) for (const fd of [stdoutFd, stderrFd, eventsFd]) fs.fsyncSync(fd);
}
function event(type, details = {}) {
  fs.writeFileSync(eventsFd, JSON.stringify({ sequence: ++eventNumber, at: new Date().toISOString(), type, ...details }) + '\n');
}
function saveJson(name, value, exclusive = true) {
  fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n', { flag: exclusive ? 'wx' : 'w' });
}
function saveAttempt() {
  const temporary = path.join(output, 'attempt-validation.json.tmp');
  const fd = fs.openSync(temporary, 'wx');
  try { fs.writeFileSync(fd, JSON.stringify(record, null, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temporary, path.join(output, 'attempt-validation.json'));
}
function failure(reason) {
  if (!record.failures.includes(reason)) record.failures.push(reason);
}
function stop(reason, signal = null) {
  if (stopReason) return;
  stopReason = reason;
  receivedSignal = signal;
  failure(reason);
  event('stop-requested', { reason, signal, childPid: child?.pid ?? null });
  flush();
  if (!child?.pid) return;
  // Only the process tree started by this invocation is stopped.
  if (process.platform === 'win32') {
    const killed = spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: 10_000 });
    if (killed.status !== 0) child.kill('SIGKILL');
  } else {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
  }
  forcedClose = setTimeout(() => {
    failure('child stream close was not observed after stop');
    finishAfterStop?.();
  }, 5_000);
}
const signals = ['SIGINT', 'SIGTERM', ...(process.platform === 'win32' ? ['SIGBREAK'] : [])];
const signalHandlers = new Map(signals.map(signal => [signal, () => stop('received ' + signal, signal)]));
for (const [signal, handler] of signalHandlers) process.on(signal, handler);
const consoleErrors = new Map([[process.stdout, () => {}], [process.stderr, () => {}]]);
// Losing a CI console consumer must not lose the independent raw evidence files.
for (const [stream, handler] of consoleErrors) stream.on('error', handler);

function collectFiles(directory) {
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const name = path.join(directory, entry.name);
    if (excludedDirectories.includes(entry.name) && (entry.isDirectory() || entry.isSymbolicLink())) continue;
    assert(!entry.isSymbolicLink(), 'Source census refuses symbolic links: ' + slash(path.relative(studio, name)));
    if (entry.isDirectory()) {
      if (!excludedDirectories.includes(entry.name)) found.push(...collectFiles(name));
    } else if (entry.isFile()) found.push(name);
  }
  return found;
}
function census() {
  const paths = [...censusDirectories.flatMap(directory => collectFiles(path.join(studio, directory))), ...['server.mjs', 'catalog.mjs', 'package.json'].map(name => path.join(studio, name))]
    .filter(name => /\.(mjs|json|html|css|ps1)$/.test(name)).sort();
  return paths.map(name => {
    assert(!fs.lstatSync(name).isSymbolicLink(), 'Source census refuses symbolic links: ' + slash(path.relative(studio, name)));
    return { path: slash(path.relative(studio, name)), ...identity(fs.readFileSync(name)) };
  });
}
function selectTests(rows) {
  const tests = rows.map(row => row.path).filter(name => name.endsWith('.test.mjs') && !name.split('/').includes('results'));
  if (options.scope === 'notes-todo-experiment') {
    const expected = NOTES_TODO_TESTS;
    assert.deepEqual(tests.filter(name => name.startsWith('apps/notes/')).sort(), expected, 'Every existing and new Notes test must match the fixed17-file roster');
    const bundle = JSON.parse(fs.readFileSync(path.join(studio, 'experiments/notes-todo/bundle.json'))); assert.deepEqual(bundle.tests, expected.map(name => 'products/rea-studio/' + name)); return expected;
  }
  if (options.scope === 'vault-empty-bin-experiment') {
    const expected = ["apps/vault/app.integration.test.mjs","apps/vault/app.test.mjs","apps/vault/bin-empty-adjacent.test.mjs","apps/vault/bin-empty-original.test.mjs","apps/vault/bin-empty-server.test.mjs","apps/vault/bin-empty-ui.test.mjs","apps/vault/bin-empty.test.mjs","apps/vault/disposal-adjacent.test.mjs","apps/vault/draft-adjacent.test.mjs","apps/vault/group-active-controls.test.mjs","apps/vault/group-active-root-replay.test.mjs","apps/vault/group-coherence-boundaries.test.mjs","apps/vault/group-coherence-replay.test.mjs","apps/vault/group-edit-adjacent-replay.test.mjs","apps/vault/group-edit-correction-controls.test.mjs","apps/vault/group-edit-final-list-replay.test.mjs","apps/vault/group-edit-independent-persistence.test.mjs","apps/vault/group-edit-original.test.mjs","apps/vault/group-edit-server.test.mjs","apps/vault/group-edit-ui.test.mjs","apps/vault/group-edit.test.mjs","apps/vault/group-original.test.mjs","apps/vault/group-recycle.test.mjs","apps/vault/group-server.test.mjs","apps/vault/group-ui.test.mjs","apps/vault/history.test.mjs","apps/vault/http.test.mjs","apps/vault/idle-view.test.mjs","apps/vault/kdbx.interop.test.mjs","apps/vault/kdbx.test.mjs","apps/vault/preexisting-draft.test.mjs","apps/vault/recycle-boundaries.test.mjs","apps/vault/recycle-confirmation.test.mjs","apps/vault/recycle-controls.test.mjs","apps/vault/recycle-http.test.mjs","apps/vault/recycle-original.test.mjs","apps/vault/recycle-server.test.mjs","apps/vault/recycle-ui.test.mjs","apps/vault/recycle.test.mjs","apps/vault/same-editor-draft.test.mjs","apps/vault/selection-adjacent.test.mjs","apps/vault/selection-boundaries.test.mjs","apps/vault/selection-independent.test.mjs","apps/vault/ui.test.mjs","apps/vault/unknown-time.test.mjs"];
    assert.deepEqual(tests.filter(name => name.startsWith('apps/vault/')).sort(), expected, 'Execute every current Vault test and only the fixed45-file Vault roster');
    const bundle = JSON.parse(fs.readFileSync(path.join(studio, 'experiments/vault-empty-bin/bundle.json'))); assert.deepEqual(bundle.tests, expected.map(name => 'products/rea-studio/' + name)); return expected;
  }
  if (windowsPathScope) {
    const expected = ['apps/editor/git.test.mjs', 'apps/sync/webdav.test.mjs', 'apps/sync/webdav.actions.test.mjs', 'apps/sync/webdav.integration.test.mjs', 'apps/sync/webdav.windows-path.test.mjs'];
    const bundle = JSON.parse(fs.readFileSync(path.join(studio, 'experiments/windows-path/bundle.json')));
    assert.deepEqual(bundle.tests, expected.map(name => 'products/rea-studio/' + name), 'Windows path experiment must retain its fixed five-file selection');
    for (const name of expected) assert(tests.includes(name), 'Required Windows path test is missing: ' + name);
    return expected;
  }
  if (options.scope === 'archive-aes-experiment') {
    const selectionBytes = fs.readFileSync(path.join(studio, 'experiments/archive-aes/test-selection.json'));
    const selection = JSON.parse(selectionBytes);
    assert.equal(selection.schema, 'rea-archive-aes-cloud-experimental-selection/v1');
    const expected = ['app.test.mjs', 'app.integration.test.mjs', 'sevenzip.test.mjs', 'lzma.test.mjs', 'encoder.test.mjs', 'lzma.integration.test.mjs', 'sevenzip-aes.test.mjs', 'sevenzip-aes-container.test.mjs', 'sevenzip-aes-original.test.mjs', 'sevenzip-aes-bounds.test.mjs', 'sevenzip-aes-http.test.mjs', 'sevenzip-aes-ui.test.mjs', 'source-metadata.test.mjs'].map(name => 'apps/archive/' + name);
    assert.deepEqual(selection.tests, expected.map(name => 'products/rea-studio/' + name), 'Experimental selection differs from its fixed thirteen-file scope');
    for (const name of expected) assert(tests.includes(name), 'Experimental test is missing: ' + name);
    fs.writeFileSync(path.join(output, 'experimental-test-selection.json.snapshot'), selectionBytes, { flag: 'wx' });
    record.experimentalSelection = { ...identity(selectionBytes), expectedGroupsOnWindows: selection.expectedGroupsOnWindows, fullArchiveSuite: false };
    return expected;
  }
  const selected = ['full', 'full-oracle-experiment'].includes(options.scope) ? tests : tests.filter(name => /^apps\/(flow|vault)\//.test(name));
  assert(selected.length > 0, 'No current tests selected');
  if (options.scope === 'flow-vault') {
    const expectedFlow = ['app.test.mjs', 'link-http.test.mjs', 'link-original.test.mjs', 'link-ui.test.mjs', 'native-link.test.mjs', 'native-original.test.mjs', 'native.test.mjs', 'normalization-boundaries.test.mjs', 'normalization-ui.test.mjs'].map(name => 'apps/flow/' + name).sort();
    assert.deepEqual(selected.filter(name => name.startsWith('apps/flow/')).sort(), expectedFlow, 'Finite scope must include all nine expected Flow test files');
    assert(selected.some(name => name.startsWith('apps/vault/')), 'Finite scope must include Vault tests');
  }
  return selected;
}
function parseSummary(raw) {
  return Object.fromEntries(['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo', 'duration_ms'].map(label => {
    const matches = [...raw.matchAll(new RegExp('^# ' + label + ' (\\d+(?:\\.\\d+)?)\\r?$', 'gm'))];
    assert(matches.length, 'Missing final TAP summary: ' + label);
    const value = Number(matches.at(-1)[1]);
    assert(Number.isFinite(value) && value >= 0, 'Invalid TAP summary: ' + label);
    return [label, value];
  }));
}

const fullPrerequisiteFiles = [
  ['flow-vault', 'prerequisite-acquisition.json', 'rea-cloud-flow-vault-prerequisites/v1', 'acquired'],
  ['archive', 'archive-original-prerequisites.json', 'rea-cloud-archive-original-prerequisites/v1', 'acquired'],
  ['bsdtar', 'bsdtar-original-acquisition.json', 'rea-cloud-bsdtar-original-prerequisites/v1', 'acquired'],
  ['additional', 'development-prerequisites.json', 'rea-cloud-development-additional-prerequisites/v1', 'acquired'],
  ['bsdtar-smoke', 'bsdtar-original-smoke.json', 'rea-cloud-bsdtar-original-smoke/v1', 'passed'],
];
function sameAttempt(execution) {
  for (const name of ['GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY']) {
    assert.equal(typeof process.env[name], 'string', 'Missing workflow identity: ' + name);
    assert.equal(execution[name], process.env[name], 'Evidence belongs to another workflow attempt: ' + name);
  }
}
function readGit(arguments_, maxBuffer = 4 * 1024 * 1024) {
  const result = spawnSync('git', arguments_, { cwd: path.resolve(studio, '../..'), encoding: 'buffer', windowsHide: true, shell: false, timeout: 30000, maxBuffer });
  assert.equal(result.error, undefined, 'Git source authentication failed');
  assert.equal(result.status, 0, 'Git source authentication failed');
  return result.stdout;
}
function visibleGitStatus() {
  return readGit(['status', '--porcelain=v1', '-z', '--untracked-files=all']).toString('utf8').split('\0').filter(Boolean).map(value => {
    const status = value.slice(0, 2), relative = value.slice(3);
    assert([' M', '??'].includes(status), 'Unexpected staged/deleted/renamed source state');
    return { path: relative, status };
  }).sort((a, b) => a.path.localeCompare(b.path));
}
function verifyFullPrerequisites(manifest) {
  assert.equal(manifest.schema, 'rea-cloud-full-oracle-prerequisites/v1'); assert.equal(manifest.status, 'acquired');
  sameAttempt(manifest.execution);
  assert.deepEqual(manifest.receipts.map(row => [row.role, row.file]), fullPrerequisiteFiles.map(([role, file]) => [role, file]));
  fs.mkdirSync(path.join(output, 'prerequisite-receipts'));
  const records = [];
  for (const [index, [role, file, schema, status]] of fullPrerequisiteFiles.entries()) {
    const filename = path.join(path.dirname(options.bootstrapManifest), file), item = fs.lstatSync(filename);
    assert(item.isFile() && !item.isSymbolicLink() && item.size <= 2 * 1024 * 1024, 'Invalid prerequisite receipt: ' + role);
    const bytes = fs.readFileSync(filename), value = JSON.parse(bytes), claim = manifest.receipts[index];
    assert.deepEqual(identity(bytes), { bytes: claim.bytes, sha256: claim.sha256 }, 'Prerequisite receipt identity changed: ' + role);
    assert.equal(value.schema, schema); assert.equal(value.status, status, 'Incomplete prerequisite: ' + role);
    if (role === 'bsdtar-smoke') {
      sameAttempt({ GITHUB_SHA: value.sourceCommit, GITHUB_RUN_ID: value.runId, GITHUB_RUN_ATTEMPT: value.runAttempt, GITHUB_REPOSITORY: manifest.execution.GITHUB_REPOSITORY });
      assert.equal(value.originalProcesses, 1); assert.equal(value.productComparisons, 0);
      const acquisition = records.find(row => row.role === 'bsdtar');
      assert.deepEqual(value.acquisition, { bytes: acquisition.bytes, sha256: acquisition.sha256 }, 'Smoke evidence belongs to another acquisition receipt');
    } else sameAttempt(value.execution);
    if (role === 'archive') {
      assert.equal(value.assets.length, 5); assert.equal(value.bootstrapExtractionProcesses, 1); assert.equal(value.originalProcesses, 1); assert.equal(value.comparisonProcesses, 0);
      const standalone = value.assets.find(row => row.path === 'projects/08-7zip/artifacts/extra/x64/7za.exe');
      assert(standalone?.authenticated); assert.equal(standalone.bytes, 1335808); assert.equal(standalone.sha256, '15d4c788c148e3677e2fc1c4a01f191fb6669eba4f6acf8a465f0f1a6f1e1260');
    }
    if (role === 'bsdtar') assert.equal(value.assets.length, 2);
    if (role === 'additional') {
      assert.equal(value.prerequisites.automation.authenticatedSourceFiles, 4350);
      assert.equal(value.prerequisites.automationRouting.files, 202);
      assert.equal(value.prerequisites.sketch.assets.length, 3);
      assert(value.prerequisites.restic.archive && value.prerequisites.restic.executable);
      assert.equal(value.skippedPrerequisites, 0);
    }
    fs.writeFileSync(path.join(output, 'prerequisite-receipts', role + '.json.snapshot'), bytes, { flag: 'wx' });
    records.push({ role, file, ...identity(bytes), schema, status });
  }
  return records;
}
function verifyOracleTestComposition() {
  assert(options.overlayManifest, 'The full oracle-test experiment requires --overlay-manifest');
  const bytes = fs.readFileSync(options.overlayManifest); assert(bytes.length <= 2 * 1024 * 1024);
  const value = JSON.parse(bytes), repository = path.resolve(studio, '../..');
  assert.equal(value.schema, 'rea-bsdtar-oracle-hosted-composition/v1'); assert.equal(value.status, 'composed-unexecuted-oracle-test-overlay');
  sameAttempt(value.execution); assert.equal(value.baselineGitCommit, record.repositoryCommit); assert.equal(value.sourceCommit, record.repositoryCommit);
  assert.equal(path.resolve(value.sourceRoot).toLowerCase(), fs.realpathSync(repository).toLowerCase());
  assert.equal(value.applicationRuntimeChanged, false); assert.equal(value.productionInstalled, false);
  assert.equal(value.historicalReceiptsRebound, false); assert.equal(value.historicalDLLDependencyEstablished, false);
  const bundleBytes = fs.readFileSync(path.join(studio, 'experiments/bsdtar-oracle/bundle.json'));
  assert.deepEqual(identity(bundleBytes), { bytes: value.sourceBundle.bytes, sha256: value.sourceBundle.sha256 });
  const bundle = JSON.parse(bundleBytes); assert.equal(bundle.schema, 'rea-bsdtar-oracle-hosted-source-bundle/v1');
  assert.equal(bundle.testBodiesAndExpectationsPreserved, true); assert.equal(bundle.applicationRuntimeChanged, false);
  const targets = ['formats.test.mjs', 'zstd.test.mjs', 'bsdtar-original-test-helper.mjs'].map(name => 'products/rea-studio/apps/archive/' + name);
  assert.deepEqual(bundle.transitions.map(row => row.target), targets); assert.equal(value.transitions.length, 3);
  assert.deepEqual(value.transitions, bundle.transitions.map(row => ({ path: row.target, before: row.before === null ? null : { bytes: row.before.bytes, sha256: row.before.sha256 }, after: { bytes: row.after.bytes, sha256: row.after.sha256 }, sourcePayload: row.after.sourcePath })));
  const expectedTargets = bundle.transitions.map(row => ({ path: row.target, bytes: row.after.bytes, sha256: row.after.sha256 })).sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(value.currentTargets, expectedTargets);
  assert.deepEqual(value.currentTargetSHA256, Object.fromEntries(expectedTargets.map(row => [row.path, row.sha256])));
  for (const row of bundle.transitions) {
    const current = fs.readFileSync(path.join(repository, row.target));
    assert.deepEqual(identity(current), { bytes: row.after.bytes, sha256: row.after.sha256 });
    assert.deepEqual(fs.readFileSync(path.join(path.dirname(options.overlayManifest), 'after', row.target + '.snapshot')), current, 'Composed source copy differs');
    if (row.before) assert.deepEqual(identity(fs.readFileSync(path.join(path.dirname(options.overlayManifest), 'before', row.target + '.snapshot'))), { bytes: row.before.bytes, sha256: row.before.sha256 });
  }
  const status = bundle.transitions.map(row => ({ path: row.target, status: row.before === null ? '??' : ' M' })).sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(value.gitStatus, status); assert.deepEqual(visibleGitStatus(), status, 'Only the three explicit oracle sources may differ from Git');
  fs.writeFileSync(path.join(output, 'oracle-test-composition.json.snapshot'), bytes, { flag: 'wx' });
  fs.writeFileSync(path.join(output, 'oracle-test-bundle.json.snapshot'), bundleBytes, { flag: 'wx' });
  record.oracleTestOverlay = { ...identity(bytes), baselineGitCommit: record.repositoryCommit, applicationRuntimeChanged: false, oracleTestTargets: 3,
    testsByteIdenticalToGit: false, separatePostcheckRequired: true, postcheckReceipt: 'bsdtar-postrun-source-check.json', fullDevelopmentReceiptEmitted: false };
  return { targets: new Set(targets), status };
}
function verifyWindowsPathComposition() {
  assert(options.overlayManifest, 'Windows path experiment requires --overlay-manifest');
  const compositionBytes = fs.readFileSync(options.overlayManifest); assert(compositionBytes.length <= 2 * 1024 * 1024);
  const value = JSON.parse(compositionBytes), repository = path.resolve(studio, '../..');
  assert.equal(value.schema, 'rea-windows-path-hosted-composition/v1'); assert.equal(value.status, 'composed-unexecuted-windows-path-overlay');
  sameAttempt(value.execution); assert.equal(value.baselineGitCommit, record.repositoryCommit); assert.equal(value.sourceCommit, record.repositoryCommit);
  assert.equal(path.resolve(value.sourceRoot).toLowerCase(), fs.realpathSync(repository).toLowerCase());
  assert.equal(value.productionInstalled, false); assert.equal(value.applicationRuntimeChangedInExperiment, true); assert.equal(value.historicalReceiptsRebound, false);
  const bundlePath = 'products/rea-studio/experiments/windows-path/bundle.json', bundleBytes = fs.readFileSync(path.join(repository, bundlePath));
  assert.deepEqual(identity(bundleBytes), { bytes: 4266, sha256: '011ea962ecb061fd85a1edb9f4ce14f70836670bc0f7effb26d6260baaef16aa' });
  assert.deepEqual(bundleBytes, readGit(['show', 'HEAD:' + bundlePath]), 'Windows path bundle differs from its committed source');
  assert.deepEqual(identity(bundleBytes), { bytes: value.sourceBundle.bytes, sha256: value.sourceBundle.sha256 });
  const bundle = JSON.parse(bundleBytes); assert.equal(bundle.schema, 'rea-windows-path-hosted-source-bundle/v1');
  assert.equal(bundle.independentSourceReviewPending, false); assert.equal(bundle.productionInstalled, false); assert.equal(bundle.applicationRuntimeChangedInExperiment, true);
  const targets = ['products/rea-studio/apps/sync/dav-transfer.mjs', 'products/rea-studio/apps/editor/git.test.mjs', 'products/rea-studio/apps/sync/webdav.windows-path.test.mjs'];
  assert.deepEqual(bundle.transitions.map(row => row.target), targets); assert.equal(bundle.transitions[2].before, null);
  assert.deepEqual(value.transitions, bundle.transitions.map(row => ({ path: row.target, before: row.before === null ? null : { bytes: row.before.bytes, sha256: row.before.sha256 }, after: { bytes: row.after.bytes, sha256: row.after.sha256 }, sourcePayload: row.after.sourcePath })));
  const expectedTargets = bundle.transitions.map(row => ({ path: row.target, bytes: row.after.bytes, sha256: row.after.sha256 })).sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(value.currentTargets, expectedTargets); assert.deepEqual(value.currentTargetSHA256, Object.fromEntries(expectedTargets.map(row => [row.path, row.sha256])));
  for (const row of bundle.transitions) {
    const current = fs.readFileSync(path.join(repository, row.target)); assert.deepEqual(identity(current), { bytes: row.after.bytes, sha256: row.after.sha256 });
    assert.deepEqual(fs.readFileSync(path.join(path.dirname(options.overlayManifest), 'after', row.target + '.snapshot')), current);
    if (row.before) {
      const expectedBefore = { bytes: row.before.bytes, sha256: row.before.sha256 };
      assert.deepEqual(identity(readGit(['show', 'HEAD:' + row.target])), expectedBefore, 'Windows path before-image differs from Git baseline');
      assert.deepEqual(identity(fs.readFileSync(path.join(path.dirname(options.overlayManifest), 'before', row.target + '.snapshot'))), expectedBefore);
    } else assert.equal(readGit(['ls-tree', 'HEAD', '--', row.target]).length, 0, 'The regression file must be new in this derivative');
  }
  const status = bundle.transitions.map(row => ({ path: row.target, status: row.before === null ? '??' : ' M' })).sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(value.gitStatusBefore, []); assert.deepEqual(value.gitStatus, status); assert.deepEqual(visibleGitStatus(), status);
  fs.writeFileSync(path.join(output, 'windows-path-composition.json.snapshot'), compositionBytes, { flag: 'wx' });
  fs.writeFileSync(path.join(output, 'windows-path-bundle.json.snapshot'), bundleBytes, { flag: 'wx' });
  record.windowsPathOverlay = { ...identity(compositionBytes), baselineGitCommit: record.repositoryCommit, applicationRuntimeChangedInExperiment: true, productionInstalled: false,
    modifiedRuntimeTargets: 1, modifiedObserverTargets: 1, newRegressionTargets: 1, separatePostcheckRequired: true, postcheckReceipt: 'windows-path-postrun-source-check.json', fullDevelopmentReceiptEmitted: false };
  return { targets: new Set(targets), status };
}
function verifyWindowsPathInstalled() {
  assert(options.installedManifest, 'Installed Windows path scope requires --installed-manifest');
  assert.equal(path.resolve(options.installedManifest), path.join(output, 'windows-path-installed-source-check.json'), 'Installed source check must belong to this evidence directory');
  assert.equal(record.executionEnvironment, 'github-hosted'); assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
  assert.equal(process.env.CI, 'true'); assert.equal(record.repositoryCommit, process.env.GITHUB_SHA);
  assert.deepEqual(visibleGitStatus(), [], 'Installed Windows path scope requires a clean committed checkout');
  const bytes = fs.readFileSync(options.installedManifest); assert(bytes.length <= 2 * 1024 * 1024);
  const value = JSON.parse(bytes), repository = path.resolve(studio, '../..');
  assert.equal(value.schema, 'rea-windows-path-hosted-installed-source-check/v1'); assert.equal(value.status, 'verified-unexecuted-committed-afterimages');
  sameAttempt(value.execution); assert.equal(value.sourceCommit, record.repositoryCommit); assert.equal(value.baselineGitCommit, record.repositoryCommit);
  assert.equal(path.resolve(value.sourceRoot).toLowerCase(), fs.realpathSync(repository).toLowerCase());
  assert.equal(value.mode, 'windows-path-installed'); assert.equal(value.sourceOnly, true); assert.equal(value.sourceMutationPerformed, false);
  assert.equal(value.installationPerformedByThisCommand, false); assert.equal(value.productionInstallationReceiptVerified, false); assert.equal(value.committedImagesMatchReviewedAfter, true);
  assert.equal(value.historicalReceiptsRebound, false); assert.equal(value.testExecutionsByComposer + value.originalExecutionsByComposer, 0);
  assert.deepEqual(value.gitStatusBefore, []); assert.deepEqual(value.gitStatus, []);
  const bundlePath = 'products/rea-studio/experiments/windows-path/bundle.json', bundleBytes = fs.readFileSync(path.join(repository, bundlePath));
  assert.deepEqual(identity(bundleBytes), { bytes: 4266, sha256: '011ea962ecb061fd85a1edb9f4ce14f70836670bc0f7effb26d6260baaef16aa' });
  assert.deepEqual(bundleBytes, readGit(['show', 'HEAD:' + bundlePath])); assert.deepEqual(value.sourceBundle, { path: bundlePath, ...identity(bundleBytes) });
  const bundle = JSON.parse(bundleBytes); assert.equal(bundle.schema, 'rea-windows-path-hosted-source-bundle/v1');
  assert.equal(bundle.sourceAuthoringOnly, true); assert.equal(bundle.productionInstalled, false); assert.equal(bundle.historicalReceiptsRebound, false);
  const targets = ['products/rea-studio/apps/sync/dav-transfer.mjs', 'products/rea-studio/apps/editor/git.test.mjs', 'products/rea-studio/apps/sync/webdav.windows-path.test.mjs'];
  assert.deepEqual(bundle.transitions.map(row => row.target), targets); assert.deepEqual(value.tests, bundle.tests);
  const currentTargets = [], committedTargets = [];
  for (const row of bundle.transitions) {
    assert.equal(row.after.sourcePath, 'after/' + row.target + '.snapshot');
    const current = fs.readFileSync(path.join(repository, row.target)), expected = { bytes: row.after.bytes, sha256: row.after.sha256 };
    assert.deepEqual(identity(current), expected); assert.deepEqual(current, readGit(['show', 'HEAD:' + row.target]), 'Installed target differs from its Git blob');
    const entry = readGit(['ls-tree', 'HEAD', '--', row.target]).toString('utf8').trim(), match = /^(100644|100755) blob ([0-9a-f]{40,64})\t(.+)$/.exec(entry);
    assert(match && match[3] === row.target, 'Installed target must be a committed ordinary file');
    const payload = fs.readFileSync(path.join(repository, 'products/rea-studio/experiments/windows-path', row.after.sourcePath));
    assert.deepEqual(identity(payload), expected); assert.deepEqual(payload, readGit(['show', 'HEAD:products/rea-studio/experiments/windows-path/' + row.after.sourcePath]));
    assert.deepEqual(fs.readFileSync(path.join(path.dirname(options.installedManifest), 'installed-source', row.target + '.snapshot')), current);
    currentTargets.push({ path: row.target, ...expected }); committedTargets.push({ path: row.target, ...expected, gitBlob: match[2] });
  }
  currentTargets.sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(value.currentTargets, currentTargets); assert.deepEqual(value.committedTargets, committedTargets);
  assert.deepEqual(value.currentTargetSHA256, Object.fromEntries(currentTargets.map(row => [row.path, row.sha256])));
  fs.writeFileSync(path.join(output, 'windows-path-installed-source-check.json.snapshot'), bytes, { flag: 'wx' });
  fs.writeFileSync(path.join(output, 'windows-path-bundle.json.snapshot'), bundleBytes, { flag: 'wx' });
  record.windowsPathInstalled = { ...identity(bytes), sourceCommit: record.repositoryCommit, committedImagesMatchReviewedAfter: true,
    sourceMutationPerformed: false, installationPerformedByCollector: false, productionInstallationReceiptVerified: false,
    exactAfterTargets: committedTargets, separatePostcheckRequired: true, postcheckReceipt: 'windows-path-installed-postrun-source-check.json', fullDevelopmentReceiptEmitted: false };
  return { targets: new Set(), status: [], mode: 'windows-path-installed' };
}
function verifyVaultEmptyBinComposition() {
  assert(options.overlayManifest, 'Vault empty-bin experiment requires --overlay-manifest');
  assert.equal(path.resolve(options.overlayManifest), path.join(output, 'vault-empty-bin-composition.json'));
  assert.equal(record.executionEnvironment, 'github-hosted'); assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
  assert(options.bootstrapManifest); assert.equal(path.resolve(options.bootstrapManifest), path.join(output, 'prerequisite-acquisition.json'));
  const prerequisiteBytes = fs.readFileSync(options.bootstrapManifest); assert(prerequisiteBytes.length <= 1024 * 1024); const prerequisite = JSON.parse(prerequisiteBytes); sameAttempt(prerequisite.execution);
  assert.equal(prerequisite.schema, 'rea-cloud-flow-vault-prerequisites/v1'); assert.equal(prerequisite.status, 'acquired'); assert.equal(prerequisite.keepass.bytes, 3265880); assert.equal(prerequisite.keepass.sha256, '04d29636c393f0c1fc99ff739295494be3adefded93271e44591e8e300225a5a');
  assert.equal(fs.realpathSync(process.env.REA_KEEPASS_EXE), fs.realpathSync(prerequisite.keepass.executable)); assert.deepEqual(identity(fs.readFileSync(process.env.REA_KEEPASS_EXE)), { bytes: prerequisite.keepass.bytes, sha256: prerequisite.keepass.sha256 });
  const bytes = fs.readFileSync(options.overlayManifest); assert(bytes.length <= 2 * 1024 * 1024);
  const value = JSON.parse(bytes), repository = path.resolve(studio, '../..');
  assert.equal(value.schema, 'rea-vault-empty-bin-hosted-composition/v1'); assert.equal(value.status, 'composed-unexecuted-vault-empty-bin-overlay'); sameAttempt(value.execution);
  assert.equal(value.baselineGitCommit, record.repositoryCommit); assert.equal(value.sourceCommit, record.repositoryCommit);
  assert.equal(path.resolve(value.sourceRoot).toLowerCase(), fs.realpathSync(repository).toLowerCase()); assert.equal(value.productionInstalled, false); assert.equal(value.historicalReceiptsRebound, false);
  const bundlePath = 'products/rea-studio/experiments/vault-empty-bin/bundle.json', bundleBytes = fs.readFileSync(path.join(repository, bundlePath));
  assert.deepEqual(identity(bundleBytes), {"bytes":9533,"sha256":"b5b615aa2a113db84e075468ac67b1a0fa6c46fe7ff873c392f3cabee5ebdc34"}); assert.deepEqual(bundleBytes, readGit(['show', 'HEAD:' + bundlePath]));
  assert.deepEqual(value.sourceBundle, { path: bundlePath, ...identity(bundleBytes) });
  const bundle = JSON.parse(bundleBytes); assert.equal(bundle.schema, 'rea-vault-empty-bin-hosted-source-bundle/v1'); assert.equal(bundle.productionInstalled, false); assert.equal(bundle.sourceAuthoringOnly, true);
  const targets = ["products/rea-studio/apps/vault/recycle.mjs","products/rea-studio/apps/vault/server.mjs","products/rea-studio/apps/vault/client.mjs","products/rea-studio/apps/vault/bin-empty.test.mjs","products/rea-studio/apps/vault/bin-empty-server.test.mjs","products/rea-studio/apps/vault/bin-empty-ui.test.mjs","products/rea-studio/apps/vault/bin-empty-adjacent.test.mjs","products/rea-studio/apps/vault/bin-empty-original.test.mjs","products/rea-studio/apps/vault/bin-empty-oracle.ps1"];
  assert.deepEqual(bundle.transitions.map(row => row.target), targets); assert.deepEqual(value.tests, bundle.tests); assert.equal(bundle.authoredAdditionalGroups, 27);
  const expectedTransitions = bundle.transitions.map(row => ({ path: row.target, before: row.before === null ? null : { bytes: row.before.bytes, sha256: row.before.sha256 }, after: { bytes: row.after.bytes, sha256: row.after.sha256 }, sourcePayload: row.after.sourcePath }));
  assert.deepEqual(value.transitions, expectedTransitions); assert.deepEqual(value.gitStatusBefore, []);
  const current = [];
  for (const row of bundle.transitions) {
    const expected = { bytes: row.after.bytes, sha256: row.after.sha256 }, bytes = fs.readFileSync(path.join(repository, row.target)); assert.deepEqual(identity(bytes), expected);
    const payloadPath = 'products/rea-studio/experiments/vault-empty-bin/' + row.after.sourcePath, payload = fs.readFileSync(path.join(repository, payloadPath));
    assert.deepEqual(identity(payload), expected); assert.deepEqual(payload, readGit(['show', 'HEAD:' + payloadPath]));
    assert.deepEqual(fs.readFileSync(path.join(output, 'after', row.target + '.snapshot')), bytes);
    if (row.before) assert.deepEqual(identity(fs.readFileSync(path.join(output, 'before', row.target + '.snapshot'))), { bytes: row.before.bytes, sha256: row.before.sha256 });
    current.push({ path: row.target, ...expected });
  }
  current.sort((a, b) => a.path.localeCompare(b.path)); assert.deepEqual(value.currentTargets, current); assert.deepEqual(value.currentTargetSHA256, Object.fromEntries(current.map(row => [row.path, row.sha256])));
  const status = bundle.transitions.map(row => ({ path: row.target, status: row.before === null ? '??' : ' M' })).sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(value.gitStatus, status); assert.deepEqual(visibleGitStatus(), status, 'Exactly nine declared Vault experiment sources may differ from Git');
  fs.writeFileSync(path.join(output, 'vault-empty-bin-composition.json.snapshot'), bytes, { flag: 'wx' }); fs.writeFileSync(path.join(output, 'vault-empty-bin-bundle.json.snapshot'), bundleBytes, { flag: 'wx' });
  record.vaultEmptyBinOverlay = { ...identity(bytes), baselineGitCommit: record.repositoryCommit, productionInstalled: false, runtimeTargets: 3, newTestOrHelperTargets: 6, separatePostcheckRequired: true, postcheckReceipt: 'vault-empty-bin-postrun-source-check.json', fullDevelopmentReceiptEmitted: false, originalComparisonsAreSeparatelyCounted: true };
  return { targets: new Set(targets), status };
}
function verifyEmptyBinOriginalEvidence() {
  const directory = path.join(output, 'empty-bin-original-observations'), summaryBytes = fs.readFileSync(path.join(directory, 'summary.json')); assert(summaryBytes.length <= 1024 * 1024);
  const value = JSON.parse(summaryBytes); assert.equal(value.schema, 'rea-empty-bin-original-comparison-summary/v1'); sameAttempt(value.execution);
  for (const name of ['childAttempts', 'comparisonsPassed', 'actualLibraryCalls', 'actualAssemblyLoads']) assert.equal(value[name], 4, 'All four bounded actual library comparisons must complete');
  for (const name of ['originalGUI', 'originalProgram', 'originalClockAssignments']) assert.equal(value[name], 0);
  assert.equal(value.exactTimestampEqualityClaimed, false); assert.equal(value.namedProjectionOnly, true); assert.equal(value.observations.length, 4); assert.equal(new Set(value.observations.map(row => row.path)).size, 4);
  const children = [];
  for (const row of value.observations) {
    assert(/^[0-9]{2}-[0-9a-f-]+\.json$/.test(row.path)); assert.equal(row.status, 'passed'); assert.equal(row.comparisonPassed, true); assert.equal(row.childCloseObserved, true);
    const filename = path.join(directory, row.path), info = fs.lstatSync(filename); assert(info.isFile() && !info.isSymbolicLink() && info.size <= 2 * 1024 * 1024);
    const bytes = fs.readFileSync(filename), child = JSON.parse(bytes); sameAttempt(child.execution); assert.equal(child.schema, 'rea-empty-bin-original-child/v1'); assert.equal(child.status, 'passed'); assert.equal(child.comparisonPassed, true); assert.equal(child.childCloseObserved, true);
    assert.deepEqual(child.executable, { bytes: 3265880, sha256: '04d29636c393f0c1fc99ff739295494be3adefded93271e44591e8e300225a5a' }); assert.equal(child.actual.calls.deleteAllObjects, 1); assert.equal(child.actual.calls.assemblyLoads, 1); assert.equal(child.actual.calls.originalClockAssignments + child.actual.calls.originalGUI + child.actual.calls.originalProgram, 0);
    assert.equal(child.timestampComparison.originalDatesRewritten, false); assert.equal(child.timestampComparison.originalDatesWithinObservedBounds, true); assert.equal(child.timestampComparison.exactTimestampEqualityClaimed, false);
    children.push({ path: 'empty-bin-original-observations/' + row.path, ...identity(bytes) });
  }
  fs.writeFileSync(path.join(output, 'vault-empty-bin-original-summary.json.snapshot'), summaryBytes, { flag: 'wx' });
  record.vaultEmptyBinOriginalComparisons = { ...identity(summaryBytes), childAttempts: 4, actualLibraryCalls: 4, actualAssemblyLoads: 4, originalGUI: 0, originalProgram: 0, originalDatesRewritten: false, exactTimestampEqualityClaimed: false, namedProjectionOnly: true, children, countsAddedToTestGroups: false };
}

const NOTES_TODO_BUNDLE_PIN = {"bytes":10977,"sha256":"6489170855483748eaff4ece03bdbadc29f79ab87cf9a16015dede504891bd62"};
const NOTES_TODO_TARGETS = ["products/rea-studio/apps/notes/server.mjs","products/rea-studio/apps/notes/client.mjs","products/rea-studio/apps/notes/README.md","products/rea-studio/apps/notes/core.mjs","products/rea-studio/apps/notes/todo.test.mjs","products/rea-studio/apps/notes/todo.ui.test.mjs","products/rea-studio/apps/notes/todo.integration.test.mjs","products/rea-studio/apps/notes/todo-original.test.mjs"];
const NOTES_TODO_TESTS = ["apps/notes/app.integration.test.mjs","apps/notes/app.test.mjs","apps/notes/jex.test.mjs","apps/notes/notebook-confirmation-cancel-open-note.ui.test.mjs","apps/notes/notebook-confirmation.ui.test.mjs","apps/notes/notebook-trash-fresh-boundaries.test.mjs","apps/notes/notebook-trash-publication-boundaries.test.mjs","apps/notes/notebook-trash-review.test.mjs","apps/notes/notebook-trash.integration.test.mjs","apps/notes/notebook-trash.test.mjs","apps/notes/notebook-trash.ui.test.mjs","apps/notes/notebooks.integration.test.mjs","apps/notes/notebooks.test.mjs","apps/notes/todo-original.test.mjs","apps/notes/todo.integration.test.mjs","apps/notes/todo.test.mjs","apps/notes/todo.ui.test.mjs"];
function verifyNotesTodoComposition() {
  assert(options.overlayManifest, 'Notes to-do experiment requires --overlay-manifest');
  assert.equal(path.resolve(options.overlayManifest), path.join(output, 'notes-todo-composition.json'));
  assert.equal(record.executionEnvironment, 'github-hosted'); assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0'); assert(!options.bootstrapManifest);
  const bytes = fs.readFileSync(options.overlayManifest); assert(bytes.length <= 2 * 1024 * 1024);
  const value = JSON.parse(bytes), repository = path.resolve(studio, '../..');
  assert.equal(value.schema, 'rea-notes-todo-hosted-composition/v1'); assert.equal(value.status, 'composed-unexecuted-notes-todo-overlay'); sameAttempt(value.execution);
  assert.equal(value.baselineGitCommit, record.repositoryCommit); assert.equal(value.sourceCommit, record.repositoryCommit);
  assert.equal(path.resolve(value.sourceRoot).toLowerCase(), fs.realpathSync(repository).toLowerCase()); assert.equal(value.productionInstalled, false); assert.equal(value.historicalReceiptsRebound, false);
  const bundlePath = 'products/rea-studio/experiments/notes-todo/bundle.json', bundleBytes = fs.readFileSync(path.join(repository, bundlePath));
  assert.deepEqual(identity(bundleBytes), NOTES_TODO_BUNDLE_PIN); assert.deepEqual(bundleBytes, readGit(['show', 'HEAD:' + bundlePath]));
  assert.deepEqual(value.sourceBundle, { path: bundlePath, ...identity(bundleBytes) });
  const bundle = JSON.parse(bundleBytes); assert.equal(bundle.schema, 'rea-notes-todo-hosted-source-bundle/v1'); assert.equal(bundle.productionInstalled, false); assert.equal(bundle.sourceAuthoringOnly, true);
  assert.deepEqual(bundle.transitions.map(row => row.target), NOTES_TODO_TARGETS); assert.equal(bundle.transitions.filter(row => row.before).length, 3); assert.equal(bundle.transitions.filter(row => row.before === null).length, 5); assert.deepEqual(value.tests, bundle.tests);
  assert.equal(bundle.authoredAdditionalGroups, 23); assert.equal(bundle.originalHelperComparisons, 20); assert.equal(bundle.authoredNewGroupNames.length, 23);
  const expectedTransitions = bundle.transitions.map(row => ({ path: row.target, before: row.before === null ? null : { bytes: row.before.bytes, sha256: row.before.sha256 }, after: { bytes: row.after.bytes, sha256: row.after.sha256 }, sourcePayload: row.after.sourcePath }));
  assert.deepEqual(value.transitions, expectedTransitions); assert.deepEqual(value.gitStatusBefore, []);
  const current = [];
  for (const row of bundle.transitions) {
    const expected = { bytes: row.after.bytes, sha256: row.after.sha256 }, currentBytes = fs.readFileSync(path.join(repository, row.target)); assert.deepEqual(identity(currentBytes), expected);
    const payloadPath = 'products/rea-studio/experiments/notes-todo/' + row.after.sourcePath, payload = fs.readFileSync(path.join(repository, payloadPath));
    assert.deepEqual(identity(payload), expected); assert.deepEqual(payload, readGit(['show', 'HEAD:' + payloadPath])); assert.deepEqual(fs.readFileSync(path.join(output, 'after', row.target + '.snapshot')), currentBytes);
    if (row.before) {
      const before = { bytes: row.before.bytes, sha256: row.before.sha256 }, committedBefore = readGit(['show', 'HEAD:' + row.target]); assert.deepEqual(identity(committedBefore), before);
      assert.deepEqual(fs.readFileSync(path.join(output, 'before', row.target + '.snapshot')), committedBefore);
    } else assert.equal(readGit(['ls-tree', 'HEAD', '--', row.target]).length, 0);
    current.push({ path: row.target, ...expected });
  }
  const originalBytes = fs.readFileSync(path.join(repository, bundle.originalNote.path)); assert.deepEqual(identity(originalBytes), { bytes: 45302, sha256: '5f1a200dc970179ad6fd193f7ffc47f09f88261cff8f893ccc793517ebbe9647' }); assert.deepEqual(originalBytes, readGit(['show', 'HEAD:' + bundle.originalNote.path]));
  current.sort((a, b) => a.path.localeCompare(b.path)); assert.deepEqual(value.currentTargets, current); assert.deepEqual(value.currentTargetSHA256, Object.fromEntries(current.map(row => [row.path, row.sha256])));
  const status = bundle.transitions.map(row => ({ path: row.target, status: row.before === null ? '??' : ' M' })).sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(value.gitStatus, status); assert.deepEqual(visibleGitStatus(), status, 'Exactly eight Notes experiment targets may differ from Git');
  fs.writeFileSync(path.join(output, 'notes-todo-composition.json.snapshot'), bytes, { flag: 'wx' }); fs.writeFileSync(path.join(output, 'notes-todo-bundle.json.snapshot'), bundleBytes, { flag: 'wx' });
  record.notesTodoOverlay = { ...identity(bytes), baselineGitCommit: record.repositoryCommit, productionInstalled: false, runtimeTargets: 3, changedExistingRuntimeTargets: 2, newRuntimeTargets: 1, documentationTargets: 1, newTestTargets: 4, selectedFiles: 17, authoredAdditionalGroups: 23, originalHelperComparisonsPlanned: 20, separatePostcheckRequired: true, postcheckReceipt: 'notes-todo-postrun-source-check.json', fullDevelopmentReceiptEmitted: false, realBrowserAcceptance: false, originalComparisonsAddedToTestGroups: false };
  return { targets: new Set(NOTES_TODO_TARGETS), status, bundle };
}
function verifyNotesTodoResults(contract) {
  const raw = fs.readFileSync(path.join(output, 'stdout.txt'), 'utf8'), bundle = contract.bundle;
  for (const name of bundle.authoredNewGroupNames) assert.equal(raw.split('\n').filter(line => line.replace(/\r$/, '') === '# Subtest: ' + name).length, 1, 'Every newly authored Notes group must occur once in actual TAP: ' + name);
  const observations = raw.split(/\r?\n/).filter(line => line.startsWith('# {')).map(line => { try { return JSON.parse(line.slice(2)); } catch { return null; } }).filter(Boolean);
  const originals = observations.filter(row => row.notesTodoOriginalComparisons); assert.equal(originals.length, 1);
  const original = originals[0].notesTodoOriginalComparisons;
  assert.equal(original.sourceSha256, bundle.originalNote.sha256); assert.equal(original.sourceUrl, bundle.originalNote.url); assert.equal(original.conversionComparisons, 16); assert.equal(original.completionComparisons, 4); assert.equal(original.clock, 1790000000123);
  for (const key of ['originalFullApplicationExecutions', 'originalDatabaseExecutions', 'originalGuiSessions']) assert.equal(original[key], 0);
  assert.deepEqual(original.bindings.map(row => row.name), ['changeNoteType', 'toggleTodoCompleted']);
  for (const row of original.bindings) assert(/^[0-9a-f]{64}$/.test(row.sha256) && Number.isInteger(row.startLine) && Number.isInteger(row.endLine));
  const deliveries = observations.filter(row => row.notesTodoActualHttpModuleDelivery); assert.equal(deliveries.length, 1); const delivery = deliveries[0].notesTodoActualHttpModuleDelivery;
  assert.equal(delivery.unchangedPublicModuleBoundary, true); assert.equal(delivery.actualBrowserExecution, false); assert.deepEqual(delivery.delivered.map(row => row.path), ['/apps/notes/markdown.mjs', '/apps/notes/core.mjs']);
  assert.deepEqual(delivery.client, identity(fs.readFileSync(path.join(studio, 'apps/notes/client.mjs'))));
  for (const row of delivery.delivered) assert.deepEqual({ bytes: row.bytes, sha256: row.sha256 }, identity(fs.readFileSync(path.join(studio, row.path.slice(1)))));
  const summary = { schema: 'rea-notes-todo-finite-observations/v1', execution: record.environment, authoredNewGroupsObserved: 23, originalHelperComparisons: 20, countsAddedToTestGroups: false, originalFullApplicationExecutions: 0, original, actualHttpModuleDelivery: delivery, browserExecutions: 0, fullParity: false, superiority: false };
  saveJson('notes-todo-observations.json', summary); record.notesTodoFiniteObservations = { authoredNewGroupsObserved: 23, originalHelperComparisons: 20, countsAddedToTestGroups: false, actualHttpModuleDeliveryVerified: true, originalFullApplicationExecutions: 0, browserExecutions: 0 };
}
function preserveNotesLegacyObservation() {
  const relative = 'products/rea-studio/.local/notes-notebook-trash-observations/trash-original.json', repository = path.resolve(studio, '../..');
  let filename = repository;
  for (const part of relative.split('/')) { filename = path.join(filename, part); if (!fs.existsSync(filename)) return { present: false, source: relative }; assert(!fs.lstatSync(filename).isSymbolicLink()); }
  const stat = fs.lstatSync(filename); assert(stat.isFile() && stat.size <= 1024 * 1024); const bytes = fs.readFileSync(filename); JSON.parse(bytes);
  fs.writeFileSync(path.join(output, 'notes-legacy-trash-original.json'), bytes, { flag: 'wx' }); return { present: true, source: relative, ...identity(bytes), copiedTo: 'notes-legacy-trash-original.json', scope: 'Existing original-trash helper observation file; separate historical workflow, not new to-do comparison counts.' };
}

function verifyGitBaselineActiveSources(rows, contract) {
  const blobs = new Map();
  for (const entry of readGit(['ls-tree', '-rz', '--full-tree', 'HEAD', '--', 'products/rea-studio'], 32 * 1024 * 1024).toString('utf8').split('\0').filter(Boolean)) {
    const match = /^([0-7]{6}) blob ([0-9a-f]{40,64})\t(.+)$/s.exec(entry);
    if (match) blobs.set(match[3], { mode: match[1], object: match[2] });
  }
  const checked = [];
  for (const row of rows.filter(row => !row.path.split('/').includes('results'))) {
    const relative = 'products/rea-studio/' + row.path;
    if (contract.targets.has(relative)) continue;
    const blob = blobs.get(relative); assert(blob && ['100644', '100755'].includes(blob.mode), 'Active baseline source is not a committed ordinary file: ' + relative);
    const bytes = fs.readFileSync(path.join(studio, row.path)); assert.deepEqual(identity(bytes), { bytes: row.bytes, sha256: row.sha256 });
    const object = createHash(blob.object.length === 40 ? 'sha1' : 'sha256').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
    assert.equal(object, blob.object, 'Active source bytes differ from the Git baseline: ' + relative);
    checked.push({ path: row.path, ...identity(bytes), gitBlob: object });
  }
  saveJson('git-baseline-active-source.json', { schema: 'rea-cloud-git-baseline-active-source/v1', repositoryCommit: record.repositoryCommit,
    ...(record.notesTodoOverlay ? { excludedComposedNotesTodoTargets: [...contract.targets], selection: 'Every eligible active Studio source outside historical results excluding only the exact eight Notes experiment targets; seven targets are census-eligible and README is independently pinned.' } : record.vaultEmptyBinOverlay ? { excludedComposedVaultEmptyBinTargets: [...contract.targets], selection: 'Every eligible active Studio source outside historical results excluding only the exact nine Vault experiment targets.' } : record.windowsPathInstalled ? { excludedTargets: [], selection: 'Every eligible active Studio census file outside historical results; no target is excluded from Git-blob authentication.' } : record.oracleTestOverlay ? { excludedComposedOracleTargets: [...contract.targets], selection: 'All eligible active Studio census files outside historical results, excluding only the three explicit oracle-test targets.' } : { excludedComposedWindowsPathTargets: [...contract.targets], selection: 'All eligible active Studio census files outside historical results, excluding only the three explicit Windows path targets.' }), files: checked });
  const provenance = record.oracleTestOverlay ?? record.windowsPathOverlay ?? record.windowsPathInstalled ?? record.vaultEmptyBinOverlay ?? record.notesTodoOverlay;
  provenance.gitBaselineEligibleActiveFiles = checked.length;
  provenance.gitBaselineEligibleActiveBytesAuthenticated = true;
}

let before = null, fullOracle = null, windowsPath = null, vaultEmptyBin = null, notesTodo = null;
try {
  saveAttempt();
  event('running', { scope: options.scope, sourceOnly: options.sourceOnly });
  flush();
  const environmentNames = ['CI', 'GITHUB_ACTIONS', 'GITHUB_REPOSITORY', 'GITHUB_SHA', 'GITHUB_REF', 'GITHUB_WORKFLOW', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'RUNNER_OS', 'RUNNER_ARCH', 'RUNNER_ENVIRONMENT'];
  record.environment = Object.fromEntries(environmentNames.filter(name => typeof process.env[name] === 'string').map(name => [name, process.env[name]]));
  record.executionEnvironment = process.env.GITHUB_ACTIONS === 'true' && process.env.RUNNER_ENVIRONMENT === 'github-hosted' ? 'github-hosted' : 'unverified';
  record.runtime = { version: process.version, platform: platform(), architecture: arch(), executable: identity(fs.readFileSync(process.execPath)) };
  const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: studio, encoding: 'utf8', windowsHide: true, timeout: 10_000, maxBuffer: 1024 });
  assert.equal(git.status, 0, 'Git source identity is unavailable');
  record.repositoryCommit = git.stdout.trim();
  assert(/^[0-9a-f]{40,64}$/.test(record.repositoryCommit), 'Invalid Git source identity');
  fs.writeFileSync(path.join(output, 'runner.mjs.snapshot'), fs.readFileSync(fileURLToPath(import.meta.url)), { flag: 'wx' });
  if (options.bootstrapManifest) {
    const bytes = fs.readFileSync(options.bootstrapManifest);
    assert(bytes.length <= 1024 * 1024, 'Bootstrap manifest exceeds limit');
    const manifest = JSON.parse(bytes);
    record.originalPrerequisites = { path: options.bootstrapManifest, ...identity(bytes), schema: manifest.schema, status: manifest.status, scope: options.scope === 'full-oracle-experiment' ? 'Same-attempt Flow/Vault, full and extra7-Zip, explicit bsdtar EXE/DLL pair, Automation, Sketch and restic acquisition receipts plus a separately counted bsdtar smoke invocation.' : options.scope === 'archive-aes-experiment' ? 'Pinned 7-Zip original acquisition for this experimental Archive selection; acquisition is separate from comparison execution.' : 'Flow Node-RED and Vault KeePass acquisition; broader application prerequisites are not established by this manifest.', producerClaimsIndependentlyReexecuted: false };
    fs.writeFileSync(path.join(output, 'bootstrap-prerequisites.json.snapshot'), bytes, { flag: 'wx' });
    assert.equal(manifest.schema, options.scope === 'full-oracle-experiment' ? 'rea-cloud-full-oracle-prerequisites/v1' : options.scope === 'archive-aes-experiment' ? 'rea-archive-aes-hosted-original-prerequisites/v1' : 'rea-cloud-flow-vault-prerequisites/v1', 'Unexpected bootstrap manifest schema');
    assert.equal(manifest.status, 'acquired', 'Original prerequisites have not been acquired');
    if (options.scope === 'full-oracle-experiment') record.originalPrerequisites.receipts = verifyFullPrerequisites(manifest);
    if (options.scope === 'archive-aes-experiment') {
      assert.equal(manifest.sourceCommit, record.repositoryCommit);
      for (const name of ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_SHA', 'GITHUB_REPOSITORY']) assert.equal(manifest.execution[name], process.env[name], 'Acquisition belongs to another workflow attempt');
      assert.equal(manifest.assets.length, 2);
    }
  }
  if (options.scope === 'archive-aes-experiment') {
    assert(options.overlayManifest, 'Experimental Archive scope requires --overlay-manifest');
    const bytes = fs.readFileSync(options.overlayManifest);
    assert(bytes.length <= 2 * 1024 * 1024, 'Overlay receipt exceeds limit');
    const composition = JSON.parse(bytes);
    assert.equal(composition.schema, 'rea-archive-aes-hosted-composition/v1');
    assert.equal(composition.status, 'composed-unexecuted-experimental-overlay');
    assert.equal(composition.baselineGitCommit, record.repositoryCommit);
    assert.equal(composition.experimentalSourceGitCommit, record.repositoryCommit);
    for (const name of ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_SHA', 'GITHUB_REPOSITORY']) assert.equal(composition.execution[name], process.env[name], 'Composition belongs to another workflow attempt');
    assert.equal(path.resolve(composition.sourceRoot).toLowerCase(), path.resolve(studio, '../..').toLowerCase());
    assert.equal(composition.modifiedGitWorktreeAfterOverlay, true);
    assert.equal(composition.productionInstalled, false);
    const bundleBytes = fs.readFileSync(path.join(studio, 'experiments/archive-aes/bundle.json'));
    assert.deepEqual({ bytes: composition.sourceBundle.bytes, sha256: composition.sourceBundle.sha256 }, identity(bundleBytes));
    const bundle = JSON.parse(bundleBytes);
    assert.equal(bundle.schema, 'rea-archive-aes-hosted-experimental-source-bundle/v1');
    assert.equal(bundle.finalTargets.length, 21);
    assert.equal(composition.transitions.length, 22);
    assert.equal(composition.afterSourceCensus.length, 62);
    const repository = path.resolve(studio, '../..');
    for (const row of bundle.finalTargets) {
      assert(/^products\/rea-studio\/apps\/archive\/[A-Za-z0-9.-]+$/.test(row.target), 'Experimental target must be an immediate allowlisted Archive file');
      const current = identity(fs.readFileSync(path.join(repository, row.target)));
      assert.deepEqual(current, row.after, 'Experimental overlay target identity differs: ' + row.target);
      const captured = composition.afterSourceCensus.find(item => item.path === row.target);
      assert(captured, 'Overlay target is missing from composition census');
      assert.deepEqual(current, { bytes: captured.bytes, sha256: captured.sha256 });
    }
    fs.writeFileSync(path.join(output, 'overlay-composition.json.snapshot'), bytes, { flag: 'wx' });
    record.experimentalOverlay = { ...identity(bytes), baselineGitCommit: record.repositoryCommit, composedActiveAppMatchesGitBaseline: false, productionInstalled: false, finalTargets: 21, transitions: 22, currentArchiveFiles: 62 };
  }
  if (options.scope === 'full-oracle-experiment') {
    assert(record.originalPrerequisites, 'The full oracle-test experiment requires --bootstrap-manifest');
    fullOracle = verifyOracleTestComposition();
  }
  if (options.scope === 'windows-path-experiment') windowsPath = verifyWindowsPathComposition();
  if (options.scope === 'windows-path-installed') windowsPath = verifyWindowsPathInstalled();
  if (options.scope === 'vault-empty-bin-experiment') vaultEmptyBin = verifyVaultEmptyBinComposition();
  if (options.scope === 'notes-todo-experiment') notesTodo = verifyNotesTodoComposition();
  before = census();
  if (fullOracle) verifyGitBaselineActiveSources(before, fullOracle);
  if (windowsPath) verifyGitBaselineActiveSources(before, windowsPath);
  if (vaultEmptyBin) verifyGitBaselineActiveSources(before, vaultEmptyBin);
  if (notesTodo) verifyGitBaselineActiveSources(before, notesTodo);
  saveJson('source-before.json', before);
  record.sourceFiles = before.length;
  record.selectedTestFiles = selectTests(before);
  const snapshotRows = before.filter(row => options.snapshotScope === 'all' || !row.path.split('/').includes('results'));
  for (const row of snapshotRows) {
    const destination = path.join(output, 'source', row.path + '.snapshot');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const bytes = fs.readFileSync(path.join(studio, row.path));
    assert.deepEqual(identity(bytes), { bytes: row.bytes, sha256: row.sha256 }, 'Source changed during pre-execution capture: ' + row.path);
    fs.writeFileSync(destination, bytes, { flag: 'wx' });
  }
  saveJson('source-snapshot-manifest.json', {
    schema: 'rea-cloud-source-snapshots/v1', censusFiles: before.length, snapshotScope: options.snapshotScope,
    selection: options.snapshotScope === 'all' ? 'Every eligible Studio source census file.' : 'Eligible files outside historical results directories; all current tests/runtime/helpers included. Historical result bytes are represented by census hashes only.',
    files: snapshotRows.map(row => ({ sourcePath: row.path, path: 'source/' + row.path + '.snapshot', bytes: row.bytes, sha256: row.sha256 })),
  });
  record.sourceSnapshotFiles = snapshotRows.length;
  record.sourceCapturedBeforeExecution = true;
  record.phase = options.sourceOnly ? 'source-only' : 'ready';
  event('source-captured', { sourceFiles: before.length, snapshotFiles: snapshotRows.length, selectedTestFiles: record.selectedTestFiles.length });
  saveAttempt();
  flush();
  if (!options.sourceOnly) {
    assert.equal(record.executionEnvironment, 'github-hosted', 'Execution requires a verified GitHub-hosted runner');
    if (['flow-vault', 'archive-aes-experiment', 'full-oracle-experiment', 'vault-empty-bin-experiment'].includes(options.scope)) {
      assert.equal(process.platform, 'win32', 'Selected original comparisons require Windows');
      assert(record.originalPrerequisites, 'This scope requires --bootstrap-manifest');
    }
    if (options.scope === 'full-oracle-experiment') assert.equal(process.version, 'v24.16.0', 'The full oracle-test epoch requires the pinned runtime');
    if (windowsPathScope) { assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0'); }
    if (notesTodo) { assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0'); }
    if (process.env.GITHUB_SHA) assert.equal(record.repositoryCommit, process.env.GITHUB_SHA, 'Checked-out Git commit differs from workflow identity');
    assert(!stopReason, stopReason);
    const env = { ...process.env };
    if (options.scope === 'vault-empty-bin-experiment') env.REA_EMPTY_BIN_OBSERVATIONS = path.join(output, 'empty-bin-original-observations');
    if (notesTodo) env.NOTES_REVIEW_OUTPUT = pathToFileURL(path.join(output, 'notes-observations') + path.sep).href;
    delete env.NODE_TEST_CONTEXT;
    record.command = [process.execPath, '--test', '--test-reporter=tap', '--test-concurrency=1', ...record.selectedTestFiles];
    const outcome = await new Promise(resolve => {
      let settled = false;
      const finish = result => {
        if (settled) return;
        settled = true;
        clearTimeout(forcedClose);
        resolve(result);
      };
      finishAfterStop = () => {
        child.stdout.destroy();
        child.stderr.destroy();
        finish({ exitCode: null, signal: null, closeObserved: false });
      };
      child = spawn(process.execPath, record.command.slice(1), { cwd: studio, env, shell: false, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
      record.childStarted = true;
      record.phase = 'testing';
      record.childPid = child.pid ?? null;
      event('child-started', { childPid: record.childPid });
      saveAttempt();
      flush();
      function retain(kind, bytes) {
        if (settled) return;
        const isOut = kind === 'stdout', count = isOut ? stdoutBytes : stderrBytes, cap = isOut ? limits.stdoutBytes : limits.stderrBytes;
        const take = Math.min(bytes.length, Math.max(0, cap - count));
        if (take) {
          fs.writeFileSync(isOut ? stdoutFd : stderrFd, bytes.subarray(0, take));
          if (isOut) stdoutBytes += take; else stderrBytes += take;
          (isOut ? process.stdout : process.stderr).write(bytes.subarray(0, take));
        }
        droppedOutputBytes += bytes.length - take;
        if (take < bytes.length) stop(kind + ' retained-output limit exceeded');
      }
      for (const [kind, stream] of [['stdout', child.stdout], ['stderr', child.stderr]]) {
        stream.on('data', bytes => {
          try { retain(kind, bytes); } catch (error) { stop(kind + ' evidence write: ' + error.message); }
        });
        stream.on('error', error => { if (!settled) stop(kind + ' stream: ' + error.message); });
      }
      child.on('error', error => { if (!settled) { failure('child spawn: ' + error.message); event('child-error', { name: error.name, message: error.message }); } });
      child.on('close', (exitCode, signal) => finish({ exitCode, signal, closeObserved: true }));
      heartbeat = setInterval(() => { event('progress', { childPid: child.pid ?? null, stdoutBytes, stderrBytes }); flush(); }, 10_000);
      deadline = setTimeout(() => stop('execution deadline exceeded'), options.timeoutMs);
    });
    clearInterval(heartbeat);
    clearTimeout(deadline);
    record.exitCode = outcome.exitCode;
    record.signal = receivedSignal ?? outcome.signal;
    record.childCloseObserved = outcome.closeObserved;
    event('child-closed', { ...outcome, receivedSignal, stdoutBytes, stderrBytes, droppedOutputBytes });
    flush();
    if (outcome.exitCode !== 0) failure('test process exit code ' + outcome.exitCode);
    if (outcome.signal) failure('test process signal ' + outcome.signal);
    try {
      record.summary = parseSummary(fs.readFileSync(path.join(output, 'stdout.txt'), 'utf8'));
      const summary = record.summary;
      assert(summary.tests > 0 && summary.tests === summary.pass, 'Every selected check must pass');
      assert.equal(summary.fail + summary.cancelled + summary.skipped + summary.todo, 0, 'Failures, cancellations, skips and unfinished checks cannot certify this scope');
      if (options.scope === 'archive-aes-experiment') assert.equal(summary.tests, 161, 'Experimental Archive selection must execute all 161 planned groups');
      if (options.scope === 'windows-path-installed') assert.equal(summary.tests, 47, 'Installed Windows path selection must execute exactly the reviewed 47 groups');
      if (windowsPathScope) {
        const raw = fs.readFileSync(path.join(output, 'stdout.txt'), 'utf8');
        const aliases = [...raw.matchAll(/^# (\{"kind":"native-workspace-root-spelling"[^\r\n]+\})\r?$/gm)].map(match => JSON.parse(match[1]));
        assert.equal(aliases.length, 1, 'Require the actual Windows short-name diagnostic once');
        const observed = aliases[0]; assert.equal(observed.differentSpelling, true); assert.equal(observed.observedShortComponent, true); assert.equal(observed.syntheticAliasConstructed, false);
        record.windowsPathAliasObservation = observed;
      }
      if (options.scope === 'vault-empty-bin-experiment') { assert(summary.tests >= 27, 'All authored new groups plus the fixed current Vault roster must execute'); verifyEmptyBinOriginalEvidence(); }
      if (notesTodo) { assert(summary.tests >= 23); verifyNotesTodoResults(notesTodo); }
    } catch (error) { failure(error.message); }
  }
} catch (error) {
  failure(error.message);
  event('collector-error', { name: error.name, message: error.message });
  if (child?.pid && child.exitCode === null && child.signalCode === null) stop('collector failed while the test process was active');
} finally {
  clearInterval(heartbeat);
  clearTimeout(deadline);
  clearTimeout(forcedClose);
  if (before) {
    try {
      const after = census();
      saveJson('source-after.json', after);
      record.sourceStable = JSON.stringify(before) === JSON.stringify(after);
      if (!record.sourceStable) failure('Eligible source files changed during this attempt');
    } catch (error) { failure('source-after capture: ' + error.message); }
  }
  if (fullOracle) {
    try {
      assert.deepEqual(visibleGitStatus(), fullOracle.status, 'Visible Git changes no longer match the three oracle-test targets');
      record.oracleTestOverlay.gitWorkingTreeMatchesOracleOverlayAfter = true;
    } catch (error) { failure('oracle-test Git postcheck: ' + error.message); }
  }
  if (windowsPath) {
    try {
      assert.deepEqual(visibleGitStatus(), windowsPath.status, 'Visible Git changes differ from the selected Windows path source epoch');
      if (record.windowsPathInstalled) { assert.equal(readGit(['rev-parse', 'HEAD']).toString('utf8').trim(), record.repositoryCommit); assert.equal(record.repositoryCommit, process.env.GITHUB_SHA); record.windowsPathInstalled.gitWorkingTreeCleanAfter = true; }
      else record.windowsPathOverlay.gitWorkingTreeMatchesOverlayAfter = true;
    }
    catch (error) { failure('Windows path Git postcheck: ' + error.message); }
  }
  if (vaultEmptyBin) {
    try { assert.deepEqual(visibleGitStatus(), vaultEmptyBin.status); assert.equal(readGit(['rev-parse', 'HEAD']).toString('utf8').trim(), record.repositoryCommit); assert.equal(record.repositoryCommit, process.env.GITHUB_SHA); record.vaultEmptyBinOverlay.gitWorkingTreeMatchesOverlayAfter = true; }
    catch (error) { failure('Vault empty-bin Git postcheck: ' + error.message); }
  }
  if (notesTodo) {
    try { assert.deepEqual(visibleGitStatus(), notesTodo.status); assert.equal(readGit(['rev-parse', 'HEAD']).toString('utf8').trim(), record.repositoryCommit); assert.equal(record.repositoryCommit, process.env.GITHUB_SHA); record.notesTodoOverlay.gitWorkingTreeMatchesOverlayAfter = true;
      if (!options.sourceOnly) { record.notesLegacyObservation = preserveNotesLegacyObservation(); if (!record.failures.length) assert.equal(record.notesLegacyObservation.present, true, 'Existing original-trash observation must be retained'); }
    } catch (error) { failure('Notes source/evidence postcheck: ' + error.message); }
  }
  record.status = receivedSignal ? 'interrupted' : record.failures.length ? 'failed' : options.sourceOnly ? 'source-only' : 'passed';
  record.signal = receivedSignal ?? record.signal;
  record.phase = 'terminal';
  record.completedAtUtc = new Date().toISOString();
  record.failure = record.failures.length ? record.failures.join('; ') : null;
  record.output = { stdoutBytes, stderrBytes, droppedOutputBytes, retainedOutputTruncated: droppedOutputBytes > 0, childCloseObserved: record.childCloseObserved ?? false };
  if (record.status === 'passed' && options.scope === 'full') {
    try { saveJson('development-validation.json', {
      schema: 'rea-development-validation/v1', checked_at_utc: record.completedAtUtc,
      scope: record.acceptanceScope, runtime: process.version, platform: platform(), architecture: arch(),
      runner: 'node --test --test-reporter=tap --test-concurrency=1', test_files: record.selectedTestFiles,
      summary: record.summary, source_files: before, source_bytes_stable_across_run: true,
      historical_test_snapshots_excluded_from_current_execution: true,
      private_generated_app_data_excluded_from_source_capture: true, excluded_directory_names: excludedDirectories,
      browser_validation: 'Separate browser acceptance is not rerun by this command.',
      comparison: 'Separate exploratory benchmarks are not rerun by this command.',
      full_feature_parity_established: false, universal_superiority_established: false,
      repository_commit: record.repositoryCommit, cloud_attempt_record: 'attempt-validation.json',
    }); } catch (error) {
      failure('full development receipt: ' + error.message);
      record.status = 'failed';
      record.failure = record.failures.join('; ');
    }
  }
  try {
    saveAttempt();
    event('terminal', { status: record.status, failure: record.failure, sourceStable: record.sourceStable, summary: record.summary });
    flush();
  } finally {
    for (const fd of [stdoutFd, stderrFd, eventsFd]) fs.closeSync(fd);
    logsOpen = false;
    for (const [signal, handler] of signalHandlers) process.off(signal, handler);
  }
}
console.log(JSON.stringify({ status: record.status, scope: options.scope, summary: record.summary, sourceFiles: record.sourceFiles, sourceStable: record.sourceStable, evidenceDirectory: output }));
process.exitCode = record.status === 'passed' || record.status === 'source-only' ? 0 : receivedSignal === 'SIGINT' ? 130 : receivedSignal ? 143 : 1;
