// Hosted-only data gate. It never runs tests or imports application sources.
// The existing full collector and three-target oracle composer stay unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const studio = path.join(repository, 'products', 'rea-studio');
const prefix = 'products/rea-studio/experiments/notes-draft-recovery-installed';
const floorPath = prefix + '/FULL-REGRESSION-FLOOR-R2.json';
const floorPin = { bytes: 172992, sha256: '27a5ae05a79749c3e1160b2493d5a3487bf97a771513e736e11ea4f225a416c2' };
const outputName = 'notes-draft-recovery-installed-full-roster-r2.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = bytes => ({ bytes: bytes.length, sha256: sha(bytes) });
const sorted = values => [...values].sort();
const text = bytes => new TextDecoder('utf-8', { fatal: true }).decode(bytes);
const environmentNames = ['CI', 'GITHUB_ACTIONS', 'GITHUB_REPOSITORY', 'GITHUB_SHA', 'GITHUB_REF', 'GITHUB_WORKFLOW', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'RUNNER_OS', 'RUNNER_ARCH', 'RUNNER_ENVIRONMENT'];

assert.deepEqual(process.argv.slice(2, 3), ['--evidence']);
assert.equal(process.argv.length, 4, 'Use --evidence <same-attempt full-suite evidence directory>');
assert.equal(process.platform, 'win32');
assert.equal(process.arch, 'x64');
assert.equal(process.version, 'v24.16.0');
assert.equal(process.env.CI, 'true');
assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
assert.equal(process.env.RUNNER_OS, 'Windows');
assert.equal(process.env.RUNNER_ARCH, 'X64');
assert.equal(process.env.GITHUB_REPOSITORY, 'Ginderlax/rea-research-lab');
assert.equal(process.env.GITHUB_JOB, 'full-oracle-experiment');
for (const name of environmentNames) assert.equal(typeof process.env[name], 'string', 'Missing hosted identity: ' + name);
assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA));
assert(/^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ID));
assert(/^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ATTEMPT));
assert(process.env.RUNNER_TEMP && path.isAbsolute(process.env.RUNNER_TEMP));
assert(path.isAbsolute(process.argv[3]));
const runnerTemporary = fs.realpathSync(process.env.RUNNER_TEMP);
const expectedEvidence = path.join(runnerTemporary, 'rea-development-ci-evidence-' + process.env.GITHUB_RUN_ID + '-' + process.env.GITHUB_RUN_ATTEMPT);
assert.equal(path.resolve(process.argv[3]).toLowerCase(), expectedEvidence.toLowerCase());
assert.equal(fs.lstatSync(process.argv[3]).isSymbolicLink(), false);
const evidence = fs.realpathSync(process.argv[3]);
assert.equal(evidence.toLowerCase(), expectedEvidence.toLowerCase());
assert(fs.statSync(evidence).isDirectory());
assert.equal(fs.existsSync(path.join(evidence, outputName)), false, 'A roster receipt already exists; never rebind it');

function canonical(relative) {
  assert(typeof relative === 'string' && relative.length > 0 && relative.length < 4096);
  assert(!/[\\:\x00-\x1f\x7f]/.test(relative) && !relative.startsWith('/'));
  assert(relative.split('/').every(part => part && part !== '.' && part !== '..'));
  return relative;
}
function read(root, relative, maximum = 2 * 1024 * 1024) {
  canonical(relative);
  let filename = root;
  for (const part of relative.split('/')) {
    filename = path.join(filename, part);
    assert.equal(fs.lstatSync(filename).isSymbolicLink(), false, 'Links are refused: ' + relative);
  }
  const stat = fs.statSync(filename);
  assert(stat.isFile() && stat.size <= maximum, 'Input exceeds its bounded regular-file limit: ' + relative);
  const bytes = fs.readFileSync(filename);
  assert.equal(bytes.length, stat.size);
  return bytes;
}
function json(root, relative, maximum) { return JSON.parse(text(read(root, relative, maximum))); }
function git(arguments_, maximum = 2 * 1024 * 1024) {
  const result = spawnSync('git', arguments_, { cwd: repository, shell: false, windowsHide: true, timeout: 10_000, maxBuffer: maximum });
  assert.equal(result.error, undefined, 'Read-only Git identity failed');
  assert.equal(result.status, 0, 'Read-only Git identity failed');
  assert.equal(result.signal, null);
  return result.stdout;
}
function rowIdentity(row) { return { bytes: row.bytes, sha256: row.sha256 }; }
function index(rows, label) {
  assert(Array.isArray(rows) && rows.length > 0 && rows.length <= 2000, 'Invalid bounded source rows: ' + label);
  const byPath = new Map(), lower = new Set();
  for (const row of rows) {
    canonical(row.path);
    assert(Number.isSafeInteger(row.bytes) && row.bytes >= 0 && row.bytes <= 16 * 1024 * 1024);
    assert(/^[0-9a-f]{64}$/.test(row.sha256));
    assert(!byPath.has(row.path) && !lower.has(row.path.toLowerCase()), 'Duplicate/colliding source path: ' + label);
    byPath.set(row.path, row); lower.add(row.path.toLowerCase());
  }
  return byPath;
}
function tap(raw, count) {
  assert.equal((raw.match(/^TAP version 13\r?$/gm) ?? []).length, 1);
  assert.equal((raw.match(/^Bail out!/gm) ?? []).length, 0);
  assert.equal((raw.match(/^\s+(?:not )?ok [0-9]+ /gm) ?? []).length, 0, 'Nested results are outside this fixed flat roster');
  const results = [...raw.matchAll(/^(not )?ok ([0-9]+) - ([^\r\n]+)\r?$/gm)];
  assert.equal(results.length, count, 'Every required named result must be present exactly once per recorded multiplicity');
  const names = results.map((match, position) => {
    assert.equal(match[1], undefined, 'A TAP result failed');
    assert.equal(Number(match[2]), position + 1, 'TAP result sequence is incomplete');
    assert(!/\s#\s*(?:SKIP|TODO)\b/i.test(match[3]), 'Skipped/unfinished results cannot pass');
    return match[3];
  });
  assert.equal((raw.match(/^# Subtest: /gm) ?? []).length, count);
  const plans = [...raw.matchAll(/^1\.\.([0-9]+)\r?$/gm)];
  assert.equal(plans.length, 1); assert.equal(Number(plans[0][1]), count);
  const summary = {};
  for (const label of ['tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo', 'duration_ms']) {
    const matches = [...raw.matchAll(new RegExp('^# ' + label + ' ([0-9]+(?:\\.[0-9]+)?)\\r?$', 'gm'))];
    assert.equal(matches.length, 1, 'Missing/duplicate final TAP summary: ' + label);
    const value = Number(matches[0][1]);
    assert(Number.isFinite(value) && value >= 0);
    summary[label] = value;
  }
  assert.equal(summary.tests, count); assert.equal(summary.pass, count);
  for (const label of ['suites', 'fail', 'cancelled', 'skipped', 'todo']) assert.equal(summary[label], 0);
  return { names, summary };
}

const record = {
  schema: 'rea-notes-draft-recovery-installed-full-roster/v2', sourceEpoch: 'notes41-installed-recovery-r2-owned-open', status: 'running',
  startedAtUtc: new Date().toISOString(), sourceCommit: process.env.GITHUB_SHA,
  execution: Object.fromEntries(environmentNames.map(name => [name, process.env[name]])),
  workflowJobKey: process.env.GITHUB_JOB, numericGitHubJobIdQualifiedByLaterAPIReadback: false,
  scope: 'Additional same-attempt complete-suite named-result and exact test-source roster gate. Existing full collector and independent oracle postcheck remain required. No browser, full documented-feature, parity or superiority acceptance.',
  appOrOriginalProcessesStartedByThisGate: 0, testProcessesStartedByThisGate: 0,
  readonlyGitIdentityProcessesOnly: true, historicalReceiptsRebound: false,
  historicalDevelopmentReceiptOverwritten: false, fullFeatureParity: false, superiority: false,
  failures: [], fullRosterAccepted: false, installedNotesFeatureAcceptanceEstablishedByThisGateAlone: false,
};
try {
  assert.equal(text(git(['rev-parse', 'HEAD'], 1024)).trim(), process.env.GITHUB_SHA);
  const floorBytes = read(repository, floorPath);
  assert.deepEqual(identity(floorBytes), floorPin, 'Regression floor is not the frozen reviewed input');
  assert.deepEqual(git(['show', process.env.GITHUB_SHA + ':' + floorPath]), floorBytes);
  const floor = JSON.parse(text(floorBytes));
  assert.equal(floor.schema, 'rea-notes-draft-recovery-installed-full-regression-floor/v2');
  assert.equal(floor.sourceOnly, true);
  assert.equal(floor.baseline.testedGitCommit, '3b475afc89498e74cca946d3901b5b36e2c79a4f');
  assert.equal(floor.baseline.runId, '39169540384'); assert.equal(floor.baseline.jobId, '117799536959');
  assert.equal(floor.baseline.namedResults, 1119); assert.equal(floor.baseline.selectedTestFiles, 160);
  assert.equal(floor.expectedNewFullResultCount, 1142); assert.equal(floor.expectedNewFullTestFileCount, 163);
  assert.equal(floor.priorNamedResults.length, 1119); assert.equal(floor.newNamedResults.length, 23);
  const oldTAPBytes = read(repository, floor.baseline.rawTAP.path, 1024 * 1024);
  assert.deepEqual(identity(oldTAPBytes), rowIdentity(floor.baseline.rawTAP));
  assert.deepEqual(git(['show', process.env.GITHUB_SHA + ':' + floor.baseline.rawTAP.path]), oldTAPBytes);
  const oldTAP = tap(text(oldTAPBytes), 1119);
  assert.deepEqual(oldTAP.names, floor.priorNamedResults, 'Old names must derive from the literal preserved qualified TAP');
  assert.equal(floor.sourceEpoch, 'notes41-installed-recovery-r2-owned-open');
  assert.equal(floor.retainedRecoveryNamedResults.length, 17); assert.equal(floor.newOwnedOpenNamedResults.length, 6);
  assert.deepEqual(floor.newNamedResults, [...floor.retainedRecoveryNamedResults, ...floor.newOwnedOpenNamedResults]);
  const retainedFloorBytes = read(repository, floor.retainedFullFloor.path);
  assert.deepEqual(identity(retainedFloorBytes), rowIdentity(floor.retainedFullFloor));
  assert.deepEqual(git(['show', process.env.GITHUB_SHA + ':' + floor.retainedFullFloor.path]), retainedFloorBytes);
  const retainedFloor = JSON.parse(text(retainedFloorBytes));
  assert.equal(retainedFloor.schema, 'rea-notes-draft-recovery-installed-full-regression-floor/v1');
  assert.equal(retainedFloor.expectedNewFullResultCount, 1136);
  assert.deepEqual(floor.priorNamedResults, retainedFloor.priorNamedResults);
  assert.deepEqual(floor.priorSelectedTestPins, retainedFloor.priorSelectedTestPins);
  assert.deepEqual(floor.retainedRecoveryNamedResults, retainedFloor.newNamedResults);
  assert.deepEqual(floor.unchangedSharedCollectors, retainedFloor.unchangedSharedCollectors);
  assert.deepEqual(floor.testTransitions, retainedFloor.testTransitions);
  const retainedGateBytes = read(repository, floor.retainedFullGate.path);
  assert.deepEqual(identity(retainedGateBytes), rowIdentity(floor.retainedFullGate));
  assert.deepEqual(git(['show', process.env.GITHUB_SHA + ':' + floor.retainedFullGate.path]), retainedGateBytes);
  const ownedOpen = floor.ownedOpenTestTransition;
  assert.equal(ownedOpen.path, 'products/rea-studio/apps/notes/draft-recovery.ui.test.mjs');
  assert.deepEqual(ownedOpen.before, { bytes: 14365, sha256: '2d3d00118db63882429c6a56f2b913638366b0d3a85dd19ee469a1529f7cb35d' });
  assert.deepEqual(ownedOpen.after, { bytes: 24638, sha256: 'ca149b92cbd61bc5d276470da075aa5432740e596f15dbf990df7ab79a642d8d' });
  const oldUIBytes = read(repository, ownedOpen.beforeSnapshotPath);
  assert.deepEqual(identity(oldUIBytes), ownedOpen.before);
  assert.deepEqual(git(['show', process.env.GITHUB_SHA + ':' + ownedOpen.beforeSnapshotPath]), oldUIBytes);
  const newUIBytes = read(repository, ownedOpen.path);
  assert.deepEqual(identity(newUIBytes), ownedOpen.after);
  assert(newUIBytes.length > oldUIBytes.length);
  assert.deepEqual(newUIBytes.subarray(0, oldUIBytes.length), oldUIBytes, 'Every previous recovery UI assertion must remain an exact raw byte prefix');
  const retainedPins = new Map(retainedFloor.currentSelectedTestPins.map(row => [row.path, row]));
  assert.equal(retainedPins.size, 163); let appendedSelectedSources = 0;
  for (const row of floor.currentSelectedTestPins) {
    const retained = retainedPins.get(row.path); assert(retained, 'No selected test file may disappear or be replaced');
    if (row.path === 'apps/notes/draft-recovery.ui.test.mjs') {
      assert.deepEqual(rowIdentity(retained), ownedOpen.before); assert.deepEqual(rowIdentity(row), ownedOpen.after); appendedSelectedSources++;
    } else assert.deepEqual(row, retained, 'All other selected test source bytes remain unchanged from the accepted first recovery source');
  }
  assert.equal(appendedSelectedSources, 1);
  assert.equal(floor.historicalReceiptsRebound, false);
  assert.equal(floor.fullParity, false); assert.equal(floor.superiority, false);

  const attemptBytes = read(evidence, 'attempt-validation.json');
  const attempt = JSON.parse(text(attemptBytes));
  assert.equal(attempt.schema, 'rea-cloud-development-attempt/v1');
  assert.equal(attempt.scope, 'full-oracle-experiment'); assert.equal(attempt.status, 'passed');
  assert.equal(attempt.phase, 'terminal'); assert.equal(attempt.sourceOnly, false);
  assert.equal(attempt.snapshotScope, 'active'); assert.equal(attempt.repositoryCommit, process.env.GITHUB_SHA);
  for (const name of environmentNames) assert.equal(attempt.environment[name], process.env[name], 'Different workflow attempt: ' + name);
  assert.equal(attempt.executionEnvironment, 'github-hosted');
  assert.equal(attempt.runtime.version, 'v24.16.0'); assert.equal(attempt.runtime.platform, 'win32'); assert.equal(attempt.runtime.architecture, 'x64');
  assert.equal(attempt.childStarted, true); assert.equal(attempt.childCloseObserved, true);
  assert(Number.isSafeInteger(attempt.childPid) && attempt.childPid > 0);
  assert.equal(attempt.exitCode, 0); assert.equal(attempt.signal, null);
  assert.equal(attempt.failure, null); assert.deepEqual(attempt.failures, []);
  assert.equal(attempt.sourceCapturedBeforeExecution, true); assert.equal(attempt.sourceStable, true);
  assert.equal(attempt.output.droppedOutputBytes, 0); assert.equal(attempt.output.retainedOutputTruncated, false);
  assert.equal(attempt.output.childCloseObserved, true); assert.equal(attempt.output.stderrBytes, 0);
  assert.equal(attempt.fullFeatureParityEstablished, false); assert.equal(attempt.universalSuperiorityEstablished, false);
  assert.equal(attempt.historicalReceiptsRebound, false); assert.equal(attempt.historicalDevelopmentReceiptOverwritten, false);
  assert.equal(attempt.oracleTestOverlay.oracleTestTargets, 3);
  assert.equal(attempt.oracleTestOverlay.applicationRuntimeChanged, false);
  assert.equal(attempt.oracleTestOverlay.baselineGitCommit, process.env.GITHUB_SHA);
  assert.equal(attempt.oracleTestOverlay.gitBaselineEligibleActiveBytesAuthenticated, true);
  assert.equal(attempt.oracleTestOverlay.gitWorkingTreeMatchesOracleOverlayAfter, true);
  assert.equal(attempt.oracleTestOverlay.separatePostcheckRequired, true);
  assert.equal(attempt.oracleTestOverlay.postcheckReceipt, 'bsdtar-postrun-source-check.json');
  assert.equal(attempt.oracleTestOverlay.fullDevelopmentReceiptEmitted, false);

  const before = json(evidence, 'source-before.json'), after = json(evidence, 'source-after.json');
  assert.deepEqual(after, before, 'Full source census changed during the actual run');
  const beforeByPath = index(before, 'source-before');
  assert.equal(attempt.sourceFiles, before.length);
  const oldPins = index(floor.priorSelectedTestPins, 'old test pins');
  const pins = index(floor.currentSelectedTestPins, 'current test pins');
  assert.equal(oldPins.size, 160); assert.equal(pins.size, 163);
  const expectedPaths = sorted([...pins.keys()]);
  const actualSelected = before.filter(row => row.path.endsWith('.test.mjs') && !row.path.split('/').includes('results')).map(row => row.path);
  assert.deepEqual(sorted(actualSelected), expectedPaths, 'Current test-file closure changed');
  assert.deepEqual(sorted(attempt.selectedTestFiles), expectedPaths, 'The actual collector selected a different test-file closure');
  assert.equal(new Set(attempt.selectedTestFiles).size, 163);
  assert.deepEqual(attempt.command.slice(1), ['--test', '--test-reporter=tap', '--test-concurrency=1', ...attempt.selectedTestFiles]);
  assert.equal(attempt.command[0], process.execPath);
  const snapshots = json(evidence, 'source-snapshot-manifest.json');
  assert.equal(snapshots.schema, 'rea-cloud-source-snapshots/v1'); assert.equal(snapshots.snapshotScope, 'active');
  assert.equal(snapshots.censusFiles, before.length); assert.equal(snapshots.files.length, attempt.sourceSnapshotFiles);
  const snapshotBySource = new Map();
  for (const row of snapshots.files) {
    canonical(row.sourcePath); assert.equal(row.path, 'source/' + row.sourcePath + '.snapshot');
    assert(!snapshotBySource.has(row.sourcePath)); snapshotBySource.set(row.sourcePath, row);
  }
  assert.deepEqual(sorted(floor.activeOracleTestOverlayPaths), ['apps/archive/formats.test.mjs', 'apps/archive/zstd.test.mjs']);
  assert.equal(floor.testTransitions.length, 1);
  const transition = floor.testTransitions[0];
  assert.equal(transition.path, 'products/rea-studio/apps/notes/todo.integration.test.mjs');
  assert.equal(transition.exactReplacements.length, 2);
  const priorFile = read(repository, transition.beforeSnapshotPath);
  assert.deepEqual(identity(priorFile), rowIdentity(transition.before));
  assert.deepEqual(git(['show', process.env.GITHUB_SHA + ':' + transition.beforeSnapshotPath]), priorFile);
  let transitioned = text(priorFile);
  for (const replacement of transition.exactReplacements) {
    assert.equal(transitioned.split(replacement.before).length, 2, 'Each strengthened delivery literal must occur exactly once');
    transitioned = transitioned.replace(replacement.before, replacement.after);
  }
  assert.deepEqual(identity(Buffer.from(transitioned, 'utf8')), rowIdentity(transition.after));
  const transitionPath = transition.path.slice('products/rea-studio/'.length);
  let oldUnchanged = 0, oldNotesUnchanged = 0, oracleOverlayTests = 0;
  for (const [name, pin] of pins) {
    assert(name.endsWith('.test.mjs') && !name.split('/').includes('results'));
    assert(beforeByPath.has(name)); assert.deepEqual(rowIdentity(beforeByPath.get(name)), rowIdentity(pin));
    const current = read(studio, name);
    assert.deepEqual(identity(current), rowIdentity(pin), 'Current test bytes changed: ' + name);
    const snapshot = snapshotBySource.get(name); assert(snapshot, 'Missing selected test snapshot: ' + name);
    assert.deepEqual(rowIdentity(snapshot), rowIdentity(pin));
    assert.deepEqual(identity(read(evidence, snapshot.path)), rowIdentity(pin));
    if (oldPins.has(name)) {
      if (name === transitionPath) assert.deepEqual(rowIdentity(pin), rowIdentity(transition.after));
      else { assert.deepEqual(rowIdentity(pin), rowIdentity(oldPins.get(name))); oldUnchanged++; if (name.startsWith('apps/notes/')) oldNotesUnchanged++; }
    }
    if (floor.activeOracleTestOverlayPaths.includes(name)) {
      oracleOverlayTests++;
      assert.notDeepEqual(identity(git(['show', process.env.GITHUB_SHA + ':products/rea-studio/' + name])), rowIdentity(pin));
    } else assert.deepEqual(identity(git(['show', process.env.GITHUB_SHA + ':products/rea-studio/' + name])), rowIdentity(pin), 'Selected test does not match committed Git: ' + name);
  }
  assert.equal(oldUnchanged, 159); assert.equal(oldNotesUnchanged, 20); assert.equal(oracleOverlayTests, 2);
  assert.equal(oldUnchanged - oracleOverlayTests, 157);
  assert.deepEqual(text(read(studio, transitionPath)), transitioned, 'Delivery test changed beyond its two explicit strengthening literals');
  assert.equal(floor.unchangedSharedCollectors.length, 2);
  for (const pin of floor.unchangedSharedCollectors) {
    assert(['scripts/verify-cloud.mjs', 'scripts/compose-bsdtar-oracle-cloud.mjs'].includes(pin.path));
    const current = read(studio, pin.path); assert.deepEqual(identity(current), rowIdentity(pin));
    assert.deepEqual(identity(git(['show', process.env.GITHUB_SHA + ':products/rea-studio/' + pin.path])), rowIdentity(pin));
    assert.deepEqual(rowIdentity(beforeByPath.get(pin.path)), rowIdentity(pin));
    assert.deepEqual(identity(read(evidence, 'source/' + pin.path + '.snapshot')), rowIdentity(pin));
  }
  const collectorPin = floor.unchangedSharedCollectors.find(row => row.path === 'scripts/verify-cloud.mjs');
  assert(collectorPin); assert.deepEqual(identity(read(evidence, 'runner.mjs.snapshot')), rowIdentity(collectorPin));
  const stdout = read(evidence, 'stdout.txt', 16 * 1024 * 1024), stderr = read(evidence, 'stderr.txt', 4 * 1024 * 1024);
  assert.equal(stdout.length, attempt.output.stdoutBytes); assert.equal(stderr.length, 0);
  const actual = tap(text(stdout), 1142);
  assert.deepEqual(sorted(actual.names), sorted([...floor.priorNamedResults, ...floor.newNamedResults]), 'The complete old plus new named-result multiset changed');
  const { suites, ...summary } = actual.summary;
  assert.deepEqual(summary, attempt.summary, 'Actual TAP does not match the same-attempt collector summary');

  // Keep literal inputs alongside this additional receipt; old receipt bytes stay untouched.
  for (const [name, bytes] of [
    ['notes-installed-full-r2-floor.json.snapshot', floorBytes],
    ['notes-installed-full-r2-old-tap.snapshot', oldTAPBytes],
    ['notes-installed-full-r2-old-delivery.snapshot', priorFile],
    ['notes-installed-full-r2-gate.mjs.snapshot', read(repository, 'products/rea-studio/scripts/verify-notes-draft-recovery-installed-full-r2.mjs')],
  ]) fs.writeFileSync(path.join(evidence, name), bytes, { flag: 'wx' });
  record.baseline = floor.baseline;
  record.regressionFloor = { path: floorPath, ...floorPin };
  record.currentFullAttempt = { path: 'attempt-validation.json', ...identity(attemptBytes) };
  record.rawTAP = { path: 'stdout.txt', ...identity(stdout) };
  record.actualSummary = actual.summary;
  record.ownedOpenTestSourcePrefixPreserved = true; record.retainedFullFloorAndGateUnchanged = true;
  record.priorNamedResultsRetained = 1119; record.newNamedResultsObserved = 23; record.priorRecoveryNamedResultsRetained = 17; record.newOwnedOpenNamedResultsObserved = 6;
  record.selectedTestFiles = 163; record.oldSelectedFileIdentitiesRetained = oldUnchanged;
  record.oldCommittedTestFilesOutsideUnchangedOracleOverlays = 157;
  record.oldNotesTestFilesUnchanged = 20; record.explicitlyStrengthenedDeliveryTestFiles = 1;
  record.unchangedOracleOverlayTestFiles = oracleOverlayTests;
  record.sourceCensusStable = true; record.selectedTestSourceSnapshotsReadBack = true;
  record.existingCollectorAndComposerByteIdenticalToQualifiedBaseline = true;
  record.independentOraclePostcheckStillRequired = true;
  record.browserChecksRemainSeparate = true;
  record.fullRosterAccepted = true; record.status = 'passed';
} catch (error) {
  record.status = 'failed'; record.failures.push({ name: error.name, message: error.message });
  process.exitCode = 1;
} finally {
  record.completedAtUtc = new Date().toISOString();
  fs.writeFileSync(path.join(evidence, outputName), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify({ status: record.status, fullRosterAccepted: record.fullRosterAccepted, priorNamedResultsRetained: record.priorNamedResultsRetained ?? null, newNamedResultsObserved: record.newNamedResultsObserved ?? null, failures: record.failures }));
