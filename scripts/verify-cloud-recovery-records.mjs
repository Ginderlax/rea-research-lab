// Publication authentication only: no tests, bootstrap, original code or services.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';

const PREFIX = 'products/rea-studio/results/cloud-flow-vault-20261015/';
const COMMIT = '14e4859476be80a49f2e79bc6ab91dc23c355b4c';
const MANIFEST = { bytes: 103366, sha256: '83d8f0f3bd42639f8f76edf589fe0f5330a92eacc046c1c2de36b3db745ebeb5' };
const SUMMARY = { tests: 282, pass: 282, fail: 0, cancelled: 0, skipped: 0, todo: 0, duration_ms: 97929.8945 };
const ALIASES = {
  'attempt-validation.json': [7025, 'c98638a82e580d7424f9502fb8a1185c4118d898252bb8a8f8f57ccc5cac5fdf'],
  'source-before.json': [142675, '53c821f94a0b358222be912f92ad74f84da46e01beac452c93e8749511c86c35'],
  'source-after.json': [142675, '53c821f94a0b358222be912f92ad74f84da46e01beac452c93e8749511c86c35'],
  'source-snapshot-manifest.json': [82673, 'ed2d91a6f26e904b9b02b7464d66fabd1818ece4455bf5a508f999706959abef'],
  'stdout.txt': [74352, '76a2f31d85918b8a1a275f296599477d96bf741044ec006a66ff879d6d1268f3'],
  'stderr.txt': [0, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  'prerequisite-acquisition.json': [2602, 'b95a8645277c46246db0d5210b219845c2a4ddf83e6b17572ae348438ad73451'],
  'bootstrap-prerequisites.json.snapshot': [2602, 'b95a8645277c46246db0d5210b219845c2a4ddf83e6b17572ae348438ad73451'],
  'windows-tar-readiness.json': [606, '93a92a5bbf6e9e38d563cbaec031125b834d1463b502bc0a237a3dff9b1c4428'],
};
const SELECTED_TESTS = [
  "apps/flow/app.test.mjs",
  "apps/flow/link-http.test.mjs",
  "apps/flow/link-original.test.mjs",
  "apps/flow/link-ui.test.mjs",
  "apps/flow/native-link.test.mjs",
  "apps/flow/native-original.test.mjs",
  "apps/flow/native.test.mjs",
  "apps/flow/normalization-boundaries.test.mjs",
  "apps/flow/normalization-ui.test.mjs",
  "apps/vault/app.integration.test.mjs",
  "apps/vault/app.test.mjs",
  "apps/vault/disposal-adjacent.test.mjs",
  "apps/vault/draft-adjacent.test.mjs",
  "apps/vault/group-active-controls.test.mjs",
  "apps/vault/group-active-root-replay.test.mjs",
  "apps/vault/group-coherence-boundaries.test.mjs",
  "apps/vault/group-coherence-replay.test.mjs",
  "apps/vault/group-edit-adjacent-replay.test.mjs",
  "apps/vault/group-edit-correction-controls.test.mjs",
  "apps/vault/group-edit-final-list-replay.test.mjs",
  "apps/vault/group-edit-independent-persistence.test.mjs",
  "apps/vault/group-edit-original.test.mjs",
  "apps/vault/group-edit-server.test.mjs",
  "apps/vault/group-edit-ui.test.mjs",
  "apps/vault/group-edit.test.mjs",
  "apps/vault/group-original.test.mjs",
  "apps/vault/group-recycle.test.mjs",
  "apps/vault/group-server.test.mjs",
  "apps/vault/group-ui.test.mjs",
  "apps/vault/history.test.mjs",
  "apps/vault/http.test.mjs",
  "apps/vault/idle-view.test.mjs",
  "apps/vault/kdbx.interop.test.mjs",
  "apps/vault/kdbx.test.mjs",
  "apps/vault/preexisting-draft.test.mjs",
  "apps/vault/recycle-boundaries.test.mjs",
  "apps/vault/recycle-confirmation.test.mjs",
  "apps/vault/recycle-controls.test.mjs",
  "apps/vault/recycle-http.test.mjs",
  "apps/vault/recycle-original.test.mjs",
  "apps/vault/recycle-server.test.mjs",
  "apps/vault/recycle-ui.test.mjs",
  "apps/vault/recycle.test.mjs",
  "apps/vault/same-editor-draft.test.mjs",
  "apps/vault/selection-adjacent.test.mjs",
  "apps/vault/selection-boundaries.test.mjs",
  "apps/vault/selection-independent.test.mjs",
  "apps/vault/ui.test.mjs",
  "apps/vault/unknown-time.test.mjs"
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function safe(name) {
  assert.ok(typeof name === 'string' && name.length > 0 && name.length <= 4096 && !/[\\:\x00-\x1f\x7f]/.test(name) && !name.startsWith('/'));
  assert.ok(name.split('/').every(part => part && part !== '.' && part !== '..' && !['.local', 'work', 'node_modules', 'artifacts', 'tooling'].includes(part)));
  return name;
}
function id(row) {
  // Recorded Node provenance is92MiB; actual public reads remain capped at1MiB.
  assert.ok(row && Number.isSafeInteger(row.bytes) && row.bytes >= 0 && row.bytes <= 128 * 1024 * 1024 && /^[0-9a-f]{64}$/.test(row.sha256));
  return { bytes: row.bytes, sha256: row.sha256 };
}
function same(a, b, label) { assert.deepEqual(id(a), id(b), label); }

export function verifyCloudRecoveryRecords(root) {
  const base = realpathSync(resolve(root)), cache = new Map(); let authenticatedBytes = 0;
  function file(name) {
    safe(name); assert.ok(name === PREFIX.slice(0, -1) || name.startsWith(PREFIX));
    let target = base;
    for (const part of name.split('/')) { target = resolve(target, part); assert.equal(lstatSync(target).isSymbolicLink(), false, 'Linked cloud proof path'); }
    const rel = relative(base, realpathSync(target)); assert.ok(rel && rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel));
    return target;
  }
  function read(name, expected) {
    const prior = cache.get(name);
    if (prior) { same(prior, expected, name); return prior.buffer; }
    const target = file(name), stat = lstatSync(target); assert.ok(stat.isFile() && stat.size <= 1024 * 1024);
    const buffer = readFileSync(target), observed = { bytes: buffer.length, sha256: sha(buffer) };
    assert.equal(buffer.length, stat.size); same(observed, expected, name);
    authenticatedBytes += buffer.length; assert.ok(cache.size < 352 && authenticatedBytes <= 8 * 1024 * 1024, 'Finite cloud proof bound');
    cache.set(name, { ...observed, buffer }); return buffer;
  }
  const manifest = JSON.parse(read(PREFIX + 'preservation-manifest.json', MANIFEST));
  assert.equal(manifest.schema, 'rea-cloud-flow-vault-finite-preservation/v1');
  assert.equal(manifest.sourceCommit, COMMIT); assert.equal(manifest.runId, 38803745286); assert.equal(manifest.runAttempt, 1);
  assert.equal(manifest.runURL, 'https://github.com/Ginderlax/rea-research-lab/actions/runs/38803745286');
  assert.equal(manifest.artifactId, 12005836777); assert.equal(manifest.artifactSHA256, '3875fa0cfc459447ff03fec4a5d11358e6ce58b7f783aaa5c16e27ae1994727b');
  assert.deepEqual(manifest.summary, SUMMARY); assert.equal(manifest.sourceFiles, 762); assert.equal(manifest.activeSourceSnapshots, 340);
  assert.equal(manifest.sourceStable, true); assert.equal(manifest.uniqueInertObjects, 351); assert.equal(manifest.records.length, 354);
  for (const name of ['fullDevelopmentSuiteAcceptance', 'fullParity', 'superiority', 'historical937ReceiptRebound']) assert.equal(manifest[name], false);
  const logical = new Map(), objects = new Map();
  for (const row of manifest.records) {
    safe(row.sourcePath); safe(row.path); id(row);
    assert.equal(row.path, 'payload/' + row.sha256 + '.snapshot'); assert.equal(logical.has(row.sourcePath), false, 'Duplicate cloud logical alias');
    logical.set(row.sourcePath, row);
    if (objects.has(row.path)) same(objects.get(row.path), row, 'Conflicting cloud object alias'); else objects.set(row.path, row);
    read(PREFIX + row.path, row);
  }
  assert.equal(objects.size, 351);
  const actual = []; let visitedEntries = 0;
  function inventory(directory, prefix = '') {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      assert.ok(++visitedEntries <= 353); assert.equal(entry.isSymbolicLink(), false);
      const name = prefix + entry.name; safe(name);
      if (entry.isDirectory()) inventory(resolve(directory, entry.name), name + '/');
      else { assert.equal(entry.isFile(), true); actual.push(name); assert.ok(actual.length <= 352); }
    }
  }
  inventory(file(PREFIX.slice(0, -1)));
  assert.deepEqual(actual.sort(), ['preservation-manifest.json', ...objects.keys()].sort(), 'Cloud capsule exact inventory');
  function alias(name) { const row = logical.get(name); assert.ok(row, 'Missing cloud alias: ' + name); return read(PREFIX + row.path, row); }
  function json(name) { return JSON.parse(alias(name)); }
  for (const [name, [bytes, sha256]] of Object.entries(ALIASES)) same(logical.get(name), { bytes, sha256 }, 'Pinned cloud alias ' + name);

  const attempt = json('attempt-validation.json');
  assert.equal(attempt.schema, 'rea-cloud-development-attempt/v1'); assert.equal(attempt.status, 'passed'); assert.equal(attempt.phase, 'terminal');
  assert.equal(attempt.scope, 'flow-vault'); assert.equal(attempt.sourceOnly, false); assert.equal(attempt.snapshotScope, 'active');
  assert.deepEqual(attempt.selectedTestFiles, SELECTED_TESTS); assert.equal(new Set(SELECTED_TESTS).size, 49);
  assert.equal(SELECTED_TESTS.filter(name => name.startsWith('apps/flow/')).length, 9); assert.equal(SELECTED_TESTS.filter(name => name.startsWith('apps/vault/')).length, 40);
  assert.deepEqual(attempt.command.slice(1), ['--test', '--test-reporter=tap', '--test-concurrency=1', ...SELECTED_TESTS]);
  assert.equal(attempt.repositoryCommit, COMMIT); assert.equal(attempt.executionEnvironment, 'github-hosted');
  const env = attempt.environment;
  assert.equal(env.CI, 'true'); assert.equal(env.GITHUB_ACTIONS, 'true'); assert.equal(env.RUNNER_ENVIRONMENT, 'github-hosted');
  assert.equal(env.GITHUB_REPOSITORY, 'Ginderlax/rea-research-lab'); assert.equal(env.GITHUB_SHA, COMMIT);
  assert.equal(env.GITHUB_RUN_ID, '38803745286'); assert.equal(env.GITHUB_RUN_ATTEMPT, '1'); assert.equal(env.RUNNER_OS, 'Windows'); assert.equal(env.RUNNER_ARCH, 'X64');
  assert.equal(attempt.runtime.version, 'v24.16.0'); assert.equal(attempt.runtime.platform, 'win32'); assert.equal(attempt.runtime.architecture, 'x64');
  same(attempt.runtime.executable, { bytes: 92279112, sha256: 'b3094d0b49f9ad602262a9921551737bb97637c05dd357a06ae98188d7290aa3' }, 'Recorded hosted Node');
  assert.equal(attempt.childStarted, true); assert.equal(attempt.childCloseObserved, true); assert.equal(attempt.exitCode, 0);
  assert.equal(attempt.signal, null); assert.equal(attempt.failure, null); assert.deepEqual(attempt.failures, []); assert.deepEqual(attempt.summary, SUMMARY);
  assert.equal(attempt.sourceFiles, 762); assert.equal(attempt.sourceSnapshotFiles, 340); assert.equal(attempt.sourceStable, true);
  assert.equal(attempt.sourceCapturedBeforeExecution, true); assert.equal(attempt.sourceSnapshotsInert, true);
  for (const name of ['fullFeatureParityEstablished', 'universalSuperiorityEstablished', 'historicalReceiptsRebound', 'historicalDevelopmentReceiptOverwritten']) assert.equal(attempt[name], false);
  assert.equal(attempt.output.stdoutBytes, 74352); assert.equal(attempt.output.stderrBytes, 0); assert.equal(attempt.output.droppedOutputBytes, 0);
  assert.equal(attempt.output.retainedOutputTruncated, false); assert.equal(attempt.output.childCloseObserved, true);
  const before = json('source-before.json'), after = json('source-after.json'); assert.deepEqual(before, after); assert.equal(before.length, 762);
  const census = new Map();
  for (const row of before) { safe(row.path); id(row); assert.equal(census.has(row.path), false); census.set(row.path, row); }
  const snapshots = json('source-snapshot-manifest.json');
  assert.equal(snapshots.schema, 'rea-cloud-source-snapshots/v1'); assert.equal(snapshots.censusFiles, 762); assert.equal(snapshots.snapshotScope, 'active');
  assert.equal(snapshots.files.length, 340); assert.equal(manifest.records.filter(row => row.sourcePath.startsWith('source/')).length, 340);
  const snapshotNames = new Set();
  for (const row of snapshots.files) {
    safe(row.sourcePath); safe(row.path); assert.equal(row.sourcePath.split('/').includes('results'), false);
    assert.equal(row.path, 'source/' + row.sourcePath + '.snapshot'); assert.equal(snapshotNames.has(row.sourcePath), false); snapshotNames.add(row.sourcePath);
    same(row, census.get(row.sourcePath), 'Captured active source versus census'); same(row, logical.get(row.path), 'Captured active source versus preserved object');
  }
  for (const name of SELECTED_TESTS) { safe(name); assert.ok(snapshotNames.has(name), 'Selected test has no captured source'); }
  const stdout = alias('stdout.txt').toString('utf8'); assert.equal(alias('stderr.txt').length, 0);
  for (const name of ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) {
    const matches = [...stdout.matchAll(new RegExp('^# ' + name + ' (\\d+)$', 'gm'))]; assert.equal(matches.length, 1); assert.equal(Number(matches[0][1]), SUMMARY[name]);
  }
  const prerequisites = json('prerequisite-acquisition.json');
  assert.equal(prerequisites.schema, 'rea-cloud-flow-vault-prerequisites/v1'); assert.equal(prerequisites.status, 'acquired');
  assert.equal(prerequisites.runtime, 'v24.16.0'); assert.equal(prerequisites.platform, 'win32'); assert.equal(prerequisites.architecture, 'x64');
  for (const name of ['CI', 'GITHUB_ACTIONS', 'GITHUB_REPOSITORY', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'RUNNER_OS', 'RUNNER_ARCH', 'RUNNER_ENVIRONMENT']) assert.equal(prerequisites.execution[name], env[name]);
  assert.equal(prerequisites.vendor_binaries_published, false); assert.equal(prerequisites.assets.length, 1);
  const keepass = prerequisites.assets[0]; assert.equal(keepass.product, 'KeePass'); assert.equal(keepass.version, '2.61.1'); assert.equal(keepass.authenticated, true);
  same(keepass, { bytes: 2898806, sha256: '3952354db9b117e906f7cd4f9f5591065b95186472370da47f46f3e246fea864' }, 'Recorded KeePass archive');
  same(prerequisites.keepass, { bytes: 3265880, sha256: '04d29636c393f0c1fc99ff739295494be3adefded93271e44591e8e300225a5a' }, 'Recorded KeePass executable');
  assert.equal(prerequisites.keepass.complete_portable_archive_extracted, true);
  assert.equal(prerequisites.flow.lock_sha256, '75f9e5c0448cb753d2fd4b735698dbb2dc8bb310534ac8e4548618baca612de1');
  assert.deepEqual(prerequisites.flow.packages, { 'node-red': '5.0.8', '@node-red/nodes': '5.0.8', '@node-red/util': '5.0.8', '@node-red/runtime': '5.0.8', 'node-red-node-test-helper': '0.3.6' });
  const tar = json('windows-tar-readiness.json'); assert.equal(tar.schema, 'rea-cloud-windows-tar-readiness/v1');
  assert.equal(tar.status, 'different-from-historical-oracle'); assert.equal(prerequisites.windows_tar_readiness, tar.status);
  assert.equal(tar.expected_historical_sha256, '4e598a8cec84af779e3377442fce2b94b976f614ed4c6e5a665e19308fd1e379');
  same({ bytes: tar.bytes, sha256: tar.observed_sha256 }, { bytes: 77824, sha256: 'dcc75eb2e0fce4779784ca0a00c6cda1182c7b3c95eb6dab0e0603651cdb6b52' }, 'Recorded tar mismatch');
  same(attempt.originalPrerequisites, { bytes: 2602, sha256: 'b95a8645277c46246db0d5210b219845c2a4ddf83e6b17572ae348438ad73451' }, 'Attempt prerequisite identity');
  assert.equal(attempt.originalPrerequisites.status, 'acquired'); assert.equal(attempt.originalPrerequisites.producerClaimsIndependentlyReexecuted, false);
  return { schema: 'rea-finite-cloud-record-authentication/v1', sourceOnlyAuthentication: true, capsule: PREFIX + 'preservation-manifest.json', capsuleSHA256: MANIFEST.sha256,
    sourceCommit: COMMIT, runId: 38803745286, runAttempt: 1, recordedTests: 282, recordedPass: 282, selectedTestFiles: 49,
    recordedCensusFiles: 762, authenticatedActiveSourceSnapshots: 340, logicalAliases: 354, inertObjects: 351, authenticatedBytes,
    allCapturedCensusRowsClaimedCurrent: false, currentSourceAuthority: 'Separate fixed reviewed Flow/Vault installation after-images remain mandatory in editor-vault-proof-migration.mjs.',
    fullDevelopmentSuiteAcceptance: false, historical937ReceiptRebound: false, archivePrerequisitesEstablishedByThisRun: false,
    freshBrowserAcceptance: false, fullParity: false, superiority: false, testsExecutedByThisVerifier: 0, originalExecutionsByThisVerifier: 0 };
}
