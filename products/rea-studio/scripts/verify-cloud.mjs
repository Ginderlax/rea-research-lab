import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
const options = { scope: null, output: null, timeoutMs: 35 * 60_000, bootstrapManifest: null, overlayManifest: null, snapshotScope: 'active', sourceOnly: false };
const names = new Map([['--scope', 'scope'], ['--output', 'output'], ['--timeout-ms', 'timeoutMs'], ['--bootstrap-manifest', 'bootstrapManifest'], ['--overlay-manifest', 'overlayManifest'], ['--snapshot-scope', 'snapshotScope']]);
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
assert(['flow-vault', 'full', 'archive-aes-experiment'].includes(options.scope), 'Use --scope flow-vault, full or archive-aes-experiment');
assert(['all', 'active'].includes(options.snapshotScope), 'Use --snapshot-scope all or active');
assert(typeof options.output === 'string' && path.isAbsolute(options.output), '--output must be absolute');
options.timeoutMs = Number(options.timeoutMs);
assert(Number.isSafeInteger(options.timeoutMs) && options.timeoutMs >= 1_000 && options.timeoutMs <= 2 * 60 * 60_000, 'Invalid bounded timeout');
if (options.bootstrapManifest) assert(path.isAbsolute(options.bootstrapManifest), '--bootstrap-manifest must be absolute');
if (options.overlayManifest) assert(path.isAbsolute(options.overlayManifest), '--overlay-manifest must be absolute');
assert(options.scope === 'archive-aes-experiment' || !options.overlayManifest, 'Overlay provenance is exclusive to the explicit experimental scope');

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
const reserved = ['attempt-validation.json', 'attempt-validation.json.tmp', 'events.jsonl', 'stdout.txt', 'stderr.txt', 'source-before.json', 'source-after.json', 'source-snapshot-manifest.json', 'source', 'runner.mjs.snapshot', 'development-validation.json', 'bootstrap-prerequisites.json.snapshot', 'overlay-composition.json.snapshot', 'experimental-test-selection.json.snapshot'];
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
  acceptanceScope: options.scope === 'archive-aes-experiment' ? 'Finite experimental Archive AES and Windows source metadata contracts on an explicitly composed hosted working tree. The Git revision alone describes the baseline and committed overlay payloads; composition provenance identifies the active experimental bytes. Production integration, full Archive acceptance, browser acceptance, full parity and superiority remain open.' : options.scope === 'flow-vault' ? 'Finite Flow and Vault implemented contracts; other applications are not executed.' : 'Current implemented development contracts; every documented original feature and comparative acceptance remain open.',
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
  const selected = options.scope === 'full' ? tests : tests.filter(name => /^apps\/(flow|vault)\//.test(name));
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

let before = null;
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
    record.originalPrerequisites = { path: options.bootstrapManifest, ...identity(bytes), schema: manifest.schema, status: manifest.status, scope: options.scope === 'archive-aes-experiment' ? 'Pinned 7-Zip original acquisition for this experimental Archive selection; acquisition is separate from comparison execution.' : 'Flow Node-RED and Vault KeePass acquisition; broader application prerequisites are not established by this manifest.', producerClaimsIndependentlyReexecuted: false };
    fs.writeFileSync(path.join(output, 'bootstrap-prerequisites.json.snapshot'), bytes, { flag: 'wx' });
    assert.equal(manifest.schema, options.scope === 'archive-aes-experiment' ? 'rea-archive-aes-hosted-original-prerequisites/v1' : 'rea-cloud-flow-vault-prerequisites/v1', 'Unexpected bootstrap manifest schema');
    assert.equal(manifest.status, 'acquired', 'Original prerequisites have not been acquired');
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
  before = census();
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
    if (['flow-vault', 'archive-aes-experiment'].includes(options.scope)) {
      assert.equal(process.platform, 'win32', 'Selected original comparisons require Windows');
      assert(record.originalPrerequisites, 'This scope requires --bootstrap-manifest');
    }
    if (process.env.GITHUB_SHA) assert.equal(record.repositoryCommit, process.env.GITHUB_SHA, 'Checked-out Git commit differs from workflow identity');
    assert(!stopReason, stopReason);
    const env = { ...process.env };
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
      if (options.scope === 'archive-aes-experiment') assert.equal(summary.tests, 160, 'Experimental Archive selection must execute all 160 planned groups');
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
