import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Authenticate one immutable finite run. Never read live application sources or
// execute preserved programs, originals, tests, benchmarks or historical verifiers.
const capsule = fileURLToPath(new URL('../results/cloud-flow-vault-20261015/', import.meta.url));
const manifestName = 'preservation-manifest.json';
const manifestSHA256 = '83d8f0f3bd42639f8f76edf589fe0f5330a92eacc046c1c2de36b3db745ebeb5';
const commit = '14e4859476be80a49f2e79bc6ab91dc23c355b4c';
const runId = 38803745286;
const artifactSHA256 = '3875fa0cfc459447ff03fec4a5d11358e6ce58b7f783aaa5c16e27ae1994727b';
const summary = { tests: 282, pass: 282, fail: 0, cancelled: 0, skipped: 0, todo: 0, duration_ms: 97929.8945 };
const fixedRoles = ['attempt-validation.json', 'bootstrap-prerequisites.json.snapshot', 'events.jsonl', 'prerequisite-acquisition.json',
  'runner.mjs.snapshot', 'source-after.json', 'source-before.json', 'source-snapshot-manifest.json', 'stderr.txt', 'stdout.txt',
  'windows-tar-readiness.json', 'workflow-attempt.json', 'local-backup-verification.json', 'preservation-collector.mjs'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const id = bytes => ({ bytes: bytes.length, sha256: sha(bytes) });
const metadata = row => ({ bytes: row.bytes, sha256: row.sha256 });
const sorted = values => [...values].sort();
function canonical(relative) {
  assert(typeof relative === 'string' && relative.length > 0 && relative.length < 4096);
  assert(!/[\\:\x00-\x1f\x7f]/.test(relative) && !relative.startsWith('/'));
  assert(relative.split('/').every(part => part && part !== '.' && part !== '..'), 'Noncanonical capsule path');
  return relative;
}
function diskRead(relative) {
  canonical(relative);
  let target = capsule;
  for (const part of relative.split('/')) {
    target = path.join(target, part);
    assert(!fs.lstatSync(target).isSymbolicLink(), 'Capsule symlink refused');
  }
  const stat = fs.statSync(target);
  assert(stat.isFile() && stat.size <= 8 * 1024 * 1024, 'Invalid bounded capsule object');
  const bytes = fs.readFileSync(target);
  assert.equal(bytes.length, stat.size);
  return bytes;
}
function diskInventory() {
  const root = fs.lstatSync(capsule);
  assert(root.isDirectory() && !root.isSymbolicLink());
  const files = [];
  for (const entry of fs.readdirSync(capsule, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink());
    if (entry.name === 'payload') {
      assert(entry.isDirectory());
      for (const object of fs.readdirSync(path.join(capsule, 'payload'), { withFileTypes: true })) {
        assert(object.isFile() && !object.isSymbolicLink(), 'Only inert payload files are allowed');
        files.push('payload/' + object.name);
      }
    } else {
      assert.equal(entry.name, manifestName, 'Unexpected capsule entry');
      assert(entry.isFile());
      files.push(entry.name);
    }
  }
  return files;
}
function eligible(relative) {
  canonical(relative);
  assert(/\.(mjs|json|html|css|ps1)$/.test(relative));
  assert(/^(apps|lib|public|scripts|tests)\//.test(relative) || ['server.mjs', 'catalog.mjs', 'package.json'].includes(relative));
  assert(!relative.split('/').some(part => ['.local', 'node_modules'].includes(part)));
}
function fingerprintRows(rows, count) {
  assert(Array.isArray(rows) && rows.length === count);
  const result = new Map();
  for (const row of rows) {
    assert.deepEqual(sorted(Object.keys(row)), ['bytes', 'path', 'sha256']);
    eligible(row.path);
    assert(Number.isSafeInteger(row.bytes) && row.bytes >= 0 && /^[0-9a-f]{64}$/.test(row.sha256));
    assert(!result.has(row.path), 'Duplicate source inventory path');
    result.set(row.path, row);
  }
  return result;
}
function verify({ read = diskRead, inventory = diskInventory } = {}) {
  const manifestBytes = read(manifestName);
  assert.equal(sha(manifestBytes), manifestSHA256, 'Reviewed capsule manifest changed');
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.schema, 'rea-cloud-flow-vault-finite-preservation/v1');
  assert.equal(manifest.sourceCommit, commit);
  assert.equal(manifest.runId, runId);
  assert.equal(manifest.runAttempt, 1);
  assert.equal(manifest.runURL, 'https://github.com/Ginderlax/rea-research-lab/actions/runs/' + runId);
  assert.equal(manifest.artifactId, 12005836777);
  assert.equal(manifest.artifactSHA256, artifactSHA256);
  assert.deepEqual(manifest.summary, summary);
  assert.equal(manifest.sourceFiles, 762);
  assert.equal(manifest.sourceStable, true);
  assert.equal(manifest.activeSourceSnapshots, 340);
  for (const name of ['fullDevelopmentSuiteAcceptance', 'fullParity', 'superiority', 'historical937ReceiptRebound']) assert.equal(manifest[name], false);
  for (const name of ['localProductExecutions', 'localBuilds', 'localTests']) assert.equal(manifest[name], 0);
  assert.equal(manifest.localBackupVerified, true);
  assert.equal(manifest.records.length, 354);
  assert.equal(manifest.uniqueInertObjects, 351);
  const roles = new Map(), objects = new Map();
  for (const row of manifest.records) {
    assert.deepEqual(sorted(Object.keys(row)), ['bytes', 'path', 'sha256', 'sourcePath']);
    canonical(row.sourcePath); canonical(row.path);
    assert(!roles.has(row.sourcePath), 'Duplicate logical source role');
    assert(Number.isSafeInteger(row.bytes) && row.bytes >= 0 && /^[0-9a-f]{64}$/.test(row.sha256));
    assert.equal(row.path, 'payload/' + row.sha256 + '.snapshot', 'Noncanonical content-addressed payload');
    if (!objects.has(row.path)) objects.set(row.path, read(row.path));
    assert.deepEqual(id(objects.get(row.path)), metadata(row), 'Preserved payload bytes changed');
    roles.set(row.sourcePath, row);
  }
  assert.equal(objects.size, 351);
  assert.deepEqual(sorted(inventory()), sorted([manifestName, ...objects.keys()]), 'Capsule file inventory has missing or extra objects');
  const bytes = role => { assert(roles.has(role), 'Missing logical role: ' + role); return objects.get(roles.get(role).path); };
  const json = role => JSON.parse(bytes(role));
  const beforeBytes = bytes('source-before.json'), afterBytes = bytes('source-after.json');
  assert.deepEqual(afterBytes, beforeBytes, 'Recorded before/after inventories differ');
  const before = JSON.parse(beforeBytes), sources = fingerprintRows(before, 762);
  fingerprintRows(JSON.parse(afterBytes), 762);
  const snapshots = json('source-snapshot-manifest.json');
  assert.equal(snapshots.schema, 'rea-cloud-source-snapshots/v1');
  assert.equal(snapshots.censusFiles, 762);
  assert.equal(snapshots.snapshotScope, 'active');
  assert.equal(snapshots.files.length, 340);
  const active = before.filter(row => !row.path.split('/').includes('results'));
  assert.equal(active.length, 340);
  const snapshotRoles = new Set();
  for (const row of snapshots.files) {
    assert.deepEqual(sorted(Object.keys(row)), ['bytes', 'path', 'sha256', 'sourcePath']);
    eligible(row.sourcePath);
    assert(!row.sourcePath.split('/').includes('results'));
    assert.equal(row.path, 'source/' + row.sourcePath + '.snapshot');
    assert(!snapshotRoles.has(row.path), 'Duplicate active source snapshot');
    snapshotRoles.add(row.path);
    assert.deepEqual(metadata(row), metadata(sources.get(row.sourcePath)), 'Snapshot differs from recorded census');
    assert.deepEqual(id(bytes(row.path)), metadata(row));
  }
  assert.deepEqual(sorted(snapshotRoles), sorted(active.map(row => 'source/' + row.path + '.snapshot')));
  assert.deepEqual(sorted(roles.keys()), sorted([...fixedRoles, ...snapshotRoles]), 'Unexpected or missing logical roles');
  assert.deepEqual(bytes('runner.mjs.snapshot'), bytes('source/scripts/verify-cloud.mjs.snapshot'));
  const attempt = json('attempt-validation.json');
  assert.equal(attempt.schema, 'rea-cloud-development-attempt/v1');
  assert.equal(attempt.status, 'passed'); assert.equal(attempt.phase, 'terminal');
  assert.equal(attempt.scope, 'flow-vault'); assert.equal(attempt.sourceOnly, false);
  assert.equal(attempt.repositoryCommit, commit); assert.equal(attempt.executionEnvironment, 'github-hosted');
  assert.equal(attempt.environment.GITHUB_SHA, commit);
  assert.equal(attempt.environment.GITHUB_RUN_ID, String(runId)); assert.equal(attempt.environment.GITHUB_RUN_ATTEMPT, '1');
  assert.equal(attempt.environment.GITHUB_REPOSITORY, 'Ginderlax/rea-research-lab');
  assert.equal(attempt.environment.GITHUB_ACTIONS, 'true'); assert.equal(attempt.environment.RUNNER_ENVIRONMENT, 'github-hosted');
  assert.deepEqual(attempt.runtime, { version: 'v24.16.0', platform: 'win32', architecture: 'x64', executable: { bytes: 92279112, sha256: 'b3094d0b49f9ad602262a9921551737bb97637c05dd357a06ae98188d7290aa3' } });
  assert.deepEqual(attempt.summary, summary); assert.deepEqual(attempt.failures, []);
  assert.equal(attempt.exitCode, 0); assert.equal(attempt.signal, null); assert.equal(attempt.failure, null);
  for (const name of ['childStarted', 'childCloseObserved', 'sourceStable', 'sourceCapturedBeforeExecution', 'sourceSnapshotsInert']) assert.equal(attempt[name], true);
  for (const name of ['fullFeatureParityEstablished', 'universalSuperiorityEstablished', 'historicalReceiptsRebound', 'historicalDevelopmentReceiptOverwritten']) assert.equal(attempt[name], false);
  assert.equal(attempt.sourceFiles, 762); assert.equal(attempt.sourceSnapshotFiles, 340); assert.equal(attempt.snapshotScope, 'active');
  const selected = before.map(row => row.path).filter(name => /^apps\/(flow|vault)\//.test(name) && name.endsWith('.test.mjs') && !name.split('/').includes('results'));
  assert.equal(selected.length, 49);
  assert.equal(selected.filter(name => name.startsWith('apps/flow/')).length, 9);
  assert.deepEqual(attempt.selectedTestFiles, selected);
  assert.deepEqual(attempt.command.slice(1), ['--test', '--test-reporter=tap', '--test-concurrency=1', ...selected]);
  const raw = bytes('stdout.txt').toString('utf8');
  for (const [label, expected] of Object.entries(summary)) {
    const matches = [...raw.matchAll(new RegExp('^# ' + label + ' (\\d+(?:\\.\\d+)?)\\r?$', 'gm'))];
    assert.equal(matches.length, 1, 'Missing or ambiguous raw TAP total: ' + label);
    assert.equal(Number(matches[0][1]), expected);
  }
  assert.equal(bytes('stdout.txt').length, attempt.output.stdoutBytes);
  assert.equal(bytes('stderr.txt').length, 0); assert.equal(attempt.output.stderrBytes, 0);
  assert.equal(attempt.output.droppedOutputBytes, 0); assert.equal(attempt.output.retainedOutputTruncated, false);
  assert.equal(attempt.output.childCloseObserved, true);
  const events = bytes('events.jsonl').toString('utf8').trim().split('\n').map(line => JSON.parse(line));
  assert.equal(events.length, 14);
  assert(events.every((event, index) => event.sequence === index + 1 && Number.isFinite(Date.parse(event.at))));
  assert.equal(events[0].type, 'running'); assert.equal(events[0].scope, 'flow-vault');
  const captured = events.find(event => event.type === 'source-captured');
  assert.equal(captured.sourceFiles, 762); assert.equal(captured.snapshotFiles, 340); assert.equal(captured.selectedTestFiles, 49);
  const closed = events.find(event => event.type === 'child-closed');
  assert.equal(closed.exitCode, 0); assert.equal(closed.signal, null); assert.equal(closed.closeObserved, true);
  assert.equal(closed.stdoutBytes, bytes('stdout.txt').length); assert.equal(closed.droppedOutputBytes, 0);
  const terminal = events.at(-1);
  assert.equal(terminal.type, 'terminal'); assert.equal(terminal.status, 'passed'); assert.equal(terminal.sourceStable, true);
  assert.deepEqual(terminal.summary, summary);
  const prerequisites = json('prerequisite-acquisition.json');
  assert.deepEqual(bytes('prerequisite-acquisition.json'), bytes('bootstrap-prerequisites.json.snapshot'));
  assert.deepEqual(id(bytes('prerequisite-acquisition.json')), metadata(attempt.originalPrerequisites));
  assert.equal(prerequisites.schema, 'rea-cloud-flow-vault-prerequisites/v1'); assert.equal(prerequisites.status, 'acquired');
  assert.equal(prerequisites.execution.GITHUB_SHA, commit); assert.equal(prerequisites.execution.GITHUB_RUN_ID, String(runId));
  assert.equal(prerequisites.vendor_binaries_published, false);
  assert.equal(prerequisites.flow.lock_sha256, sources.get('apps/flow/fixtures/oracle/package-lock.json').sha256);
  assert.deepEqual(prerequisites.flow.packages, { 'node-red': '5.0.8', '@node-red/nodes': '5.0.8', '@node-red/util': '5.0.8', '@node-red/runtime': '5.0.8', 'node-red-node-test-helper': '0.3.6' });
  assert.equal(prerequisites.keepass.bytes, 3265880);
  assert.equal(prerequisites.keepass.sha256, '04d29636c393f0c1fc99ff739295494be3adefded93271e44591e8e300225a5a');
  const workflow = json('workflow-attempt.json');
  assert.equal(workflow.schema, 'rea-cloud-workflow-attempt/v1'); assert.equal(workflow.statusBeforePackaging, 'success');
  assert.equal(workflow.sourceCommit, commit); assert.equal(workflow.runId, String(runId)); assert.equal(workflow.runAttempt, '1');
  const tar = json('windows-tar-readiness.json');
  assert.equal(tar.schema, 'rea-cloud-windows-tar-readiness/v1'); assert.equal(tar.status, 'different-from-historical-oracle');
  assert.notEqual(tar.observed_sha256, tar.expected_historical_sha256);
  const backup = json('local-backup-verification.json');
  assert.equal(backup.schema, 'rea-local-cloud-evidence-backup/v1'); assert.equal(backup.artifactSHA256, artifactSHA256);
  assert.equal(backup.allCRCAndBytesReadable, true); assert.equal(backup.sourceSnapshotsVerified, 340);
  assert.equal(backup.attempt.repositoryCommit, commit); assert.deepEqual(backup.attempt.summary, summary);
  assert.equal(backup.files.length, 352);
  const backedUp = new Set();
  for (const row of backup.files) {
    canonical(row.path); assert(!backedUp.has(row.path)); backedUp.add(row.path);
    assert(roles.has(row.path)); assert.deepEqual(metadata(row), metadata(roles.get(row.path)));
  }
  assert.deepEqual(sorted(backedUp), sorted([...roles.keys()].filter(role => !['local-backup-verification.json', 'preservation-collector.mjs'].includes(role))));
  return { status: 'passed', schema: 'rea-preserved-cloud-flow-vault-integrity/v1', manifestSHA256, recordedSourceCommit: commit,
    recordedRunId: runId, recordedRunAttempt: 1, records: 354, uniquePayloads: 351, recordedFiniteSummary: summary,
    recordedStableSourceFiles: 762, authenticatedActiveSnapshots: 340, authenticatedSelectedTestFiles: 49,
    scope: 'Integrity of the preserved finite Flow/Vault run only. No live application source, fresh behavioral execution, historical combined-suite or current full-development acceptance.',
    currentSourceAcceptance: false, fullDevelopmentSuiteAcceptance: false, fullParity: false, superiority: false,
    applicationExecutionsByVerifier: 0, originalExecutionsByVerifier: 0, preservedBackupReceiptAuthenticated: true, currentLocalBackupAvailabilityChecked: false };
}

assert(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--self-test'), 'Only optional --self-test is supported');
const report = verify();
if (process.argv.includes('--self-test')) {
  assert.equal(process.env.CI, 'true'); assert.equal(process.env.GITHUB_ACTIONS, 'true');
  assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted', 'Synthetic corruption controls are hosted-only');
  const inventory = diskInventory(), cached = new Map(inventory.map(name => [name, diskRead(name)]));
  const target = inventory.find(name => name.startsWith('payload/') && cached.get(name).length > 0);
  const corrupt = bytes => { const changed = Buffer.from(bytes); changed[0] ^= 1; return changed; };
  const controls = [
    ['manifest-corruption', { read: name => name === manifestName ? corrupt(cached.get(name)) : cached.get(name), inventory: () => inventory }],
    ['payload-corruption', { read: name => name === target ? corrupt(cached.get(name)) : cached.get(name), inventory: () => inventory }],
    ['extra-payload', { read: name => cached.get(name), inventory: () => [...inventory, 'payload/' + '0'.repeat(64) + '.snapshot'] }],
  ];
  for (const [name, provider] of controls) assert.throws(() => verify(provider), undefined, 'Synthetic corruption was accepted: ' + name);
  report.syntheticCorruptionControls = { passed: controls.length, expected: 3, productAcceptance: false, modifiedCapsuleFiles: 0 };
}
console.log(JSON.stringify(report));
