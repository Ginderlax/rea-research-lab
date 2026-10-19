// Hosted experimental composition only. Never install this overlay locally or
// treat a modified ephemeral worktree as a committed active-app release.
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const repository = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const bundlePrefix = 'products/rea-studio/experiments/archive-aes';
const appPrefix = 'products/rea-studio/apps/archive/';
const args = process.argv.slice(2);
assert.equal(args.length, 4, 'Usage: compose-archive-aes-cloud.mjs --phase compose|bootstrap|verify-after --evidence <absolute RUNNER_TEMP child>');
assert.equal(args[0], '--phase'); assert.ok(['compose', 'bootstrap', 'verify-after'].includes(args[1]));
assert.equal(args[2], '--evidence'); assert.ok(path.isAbsolute(args[3]));
assert.equal(process.platform, 'win32', 'Only hosted Windows composition is supported.');
assert.equal(process.version, 'v24.16.0', 'Use the explicitly pinned Node runtime.');
assert.equal(process.env.CI, 'true', 'Local composition is disabled.');
assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted', 'A standard GitHub-hosted runner is required.');
for (const key of ['RUNNER_TEMP', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY']) assert.ok(process.env[key], `Missing hosted context: ${key}`);
const phase = args[1], evidence = path.resolve(args[3]), runnerTemp = path.resolve(process.env.RUNNER_TEMP);
const evidenceRelative = path.relative(runnerTemp, evidence);
assert.ok(evidenceRelative && !path.isAbsolute(evidenceRelative) && !evidenceRelative.split(path.sep).includes('..'), 'Evidence must be an owned child of RUNNER_TEMP.');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = bytes => ({ bytes: bytes.length, sha256: sha(bytes) });
const normalizedIdentity = row => ({ path: row.path, bytes: row.bytes, sha256: row.sha256 });
const sorted = rows => [...rows].sort((a, b) => a.path.localeCompare(b.path));
function relativePath(relative) {
  assert.ok(typeof relative === 'string' && relative.length && !relative.includes('\\') && !relative.includes(':') && !relative.includes('\0')
    && !path.posix.isAbsolute(relative) && !relative.split('/').some(part => !part || part === '.' || part === '..'), 'A canonical repository-relative path is required.');
  return path.join(repository, ...relative.split('/'));
}
function git(argv) {
  const result = spawnSync('git', argv, { cwd: repository, windowsHide: true, shell: false, timeout: 30000, maxBuffer: 32 * 1024 * 1024 });
  assert.equal(result.error, undefined, 'Git invocation failed.');
  assert.equal(result.status, 0, 'Git invocation refused the expected checkout.');
  return result.stdout;
}
function gitText(argv) { return git(argv).toString('utf8').trim(); }
function gitStatus() {
  return git(['status', '--porcelain=v1', '-z', '--untracked-files=all']).toString('utf8').split('\0').filter(Boolean).map(record => {
    const status = record.slice(0, 2), relative = record.slice(3);
    assert.ok([' M', '??'].includes(status), 'Only unstaged experimental modifications/additions are allowed.');
    relativePath(relative);
    return { path: relative, status };
  }).sort((a, b) => a.path.localeCompare(b.path));
}
async function committedBytes(relative, expected) {
  const bytes = await fs.readFile(relativePath(relative));
  assert.deepEqual(identity(bytes), identity(git(['show', `HEAD:${relative}`])), 'Experimental source must equal its committed Git blob.');
  if (expected) assert.deepEqual(identity(bytes), { bytes: expected.bytes, sha256: expected.sha256 }, 'Selected experimental source identity changed.');
  return bytes;
}
const allowedNames = ['client.mjs', 'LZMA-COMPATIBILITY.md', 'original-aes-test-helper.mjs', 'README.md', 'server.mjs',
  'sevenzip-aes-bounds.test.mjs', 'SEVENZIP-AES-COMPATIBILITY.md', 'sevenzip-aes-container.test.mjs', 'sevenzip-aes-http.test.mjs',
  'SEVENZIP-AES-LGPL.txt', 'sevenzip-aes-original.test.mjs', 'sevenzip-aes-ui-fixture.mjs', 'sevenzip-aes-ui.test.mjs', 'sevenzip-aes.mjs',
  'sevenzip-aes.test.mjs', 'SEVENZIP-COMPATIBILITY.md', 'sevenzip.mjs', 'source-metadata.mjs', 'source-metadata.test.mjs',
  'WINDOWS-SOURCE-METADATA.md', 'NOTICE-SOURCE-METADATA.txt'];
const allowedTargets = new Set(allowedNames.map(name => appPrefix + name));
const expectedTests = ['app.test.mjs', 'app.integration.test.mjs', 'sevenzip.test.mjs', 'lzma.test.mjs', 'encoder.test.mjs', 'lzma.integration.test.mjs',
  'sevenzip-aes.test.mjs', 'sevenzip-aes-container.test.mjs', 'sevenzip-aes-original.test.mjs', 'sevenzip-aes-bounds.test.mjs',
  'sevenzip-aes-http.test.mjs', 'sevenzip-aes-ui.test.mjs', 'source-metadata.test.mjs'].map(name => appPrefix + name);
const head = gitText(['rev-parse', 'HEAD']);
assert.equal(head, process.env.GITHUB_SHA, 'Compose only the exact dispatched Git revision.');
assert.equal(path.resolve(gitText(['rev-parse', '--show-toplevel'])).toLowerCase(), repository.toLowerCase());
const bundleBytes = await committedBytes(bundlePrefix + '/bundle.json');
const bundle = JSON.parse(bundleBytes), selectionBytes = await committedBytes(bundlePrefix + '/test-selection.json'), selection = JSON.parse(selectionBytes);
assert.equal(bundle.schema, 'rea-archive-aes-hosted-experimental-source-bundle/v1');
assert.equal(bundle.sourceOnly, true); assert.equal(bundle.productionInstalled, false); assert.equal(bundle.fullProductParity, false);
assert.equal(bundle.archiveBaseline.length, 47); assert.equal(bundle.proposal.length, 17); assert.equal(bundle.timestamp.length, 5);
assert.equal(bundle.finalTargets.length, 21); assert.equal(bundle.selectedOriginalSources.length, 22);
assert.deepEqual([...new Set(bundle.finalTargets.map(row => row.target))].sort(), [...allowedTargets].sort());
assert.deepEqual(selection.tests, expectedTests); assert.equal(selection.expectedGroupsOnWindows, 161); assert.equal(selection.fullArchiveSuite, false);
const exclusions = ['results', '.local', 'fixtures/oracles'];
async function census() {
  const rows = [];
  async function walk(relative, local = '') {
    for (const entry of await fs.readdir(relativePath(relative), { withFileTypes: true })) {
      const nextLocal = local ? `${local}/${entry.name}` : entry.name;
      if (exclusions.some(prefix => nextLocal === prefix || nextLocal.startsWith(prefix + '/'))) continue;
      const next = relative + '/' + entry.name;
      assert.equal(entry.isSymbolicLink(), false, 'Current-source census refuses links.');
      if (entry.isDirectory()) await walk(next, nextLocal);
      else { assert.equal(entry.isFile(), true); rows.push({ path: next, ...identity(await fs.readFile(relativePath(next))) }); }
    }
  }
  await walk(appPrefix.slice(0, -1));
  return sorted(rows);
}
async function sharedContext() {
  const rows = [];
  for (const expected of bundle.historicalSharedContext) {
    const current = identity(await fs.readFile(relativePath(expected.path)));
    rows.push({ path: expected.path, ...current, historicalBaseIdentity: { bytes: expected.bytes, sha256: expected.sha256 },
      matchesHistoricalBase: current.bytes === expected.bytes && current.sha256 === expected.sha256 });
  }
  return rows;
}
const expectedAfter = new Map(bundle.archiveBaseline.map(row => [row.path, normalizedIdentity(row)]));
for (const row of bundle.finalTargets) expectedAfter.set(row.target, { path: row.target, ...row.after });
const finalCensus = sorted([...expectedAfter.values()]);
assert.equal(finalCensus.length, 62);
const receiptPath = path.join(evidence, 'composition.json');
const execution = Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_REPOSITORY', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT'].map(name => [name, process.env[name] ?? null]));
if (phase === 'compose') {
  assert.deepEqual(gitStatus(), [], 'Start from a clean committed checkout.');
  await fs.mkdir(evidence, { recursive: true });
  const receipt = { schema: 'rea-archive-aes-hosted-composition/v1', status: 'running', sourceOnlyExperimentalComposition: true,
    productionInstalled: false, testsExecutedByComposer: 0, fullProductParity: false, started_at_utc: new Date().toISOString(), execution,
    node: process.version, sourceRoot: repository, sourceCommit: head, baselineGitCommit: head, experimentalSourceGitCommit: head,
    committedRevisionDescribesBaselineApp: true, modifiedGitWorktreeAfterOverlay: true,
    sourceBundle: { path: bundlePrefix + '/bundle.json', ...identity(bundleBytes) }, sourcePayloads: [], transitions: [],
    censusDefinition: { root: appPrefix.slice(0, -1), excluded: exclusions, scope: 'Every current Archive source/doc/test/reference/receipt file outside explicit historical-result/private-carrier prefixes; shared four inputs captured separately. This is not a whole-repository execution census.' },
    frozenHistoricalArchives: 'No historical result/source archives are copied or changed; only the21 explicitly named current-app paths may differ from Git.',
  };
  await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  async function save() { await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n'); }
  try {
    receipt.beforeSourceCensus = await census();
    assert.deepEqual(receipt.beforeSourceCensus, sorted(bundle.archiveBaseline.map(normalizedIdentity)), 'All47 current Archive baseline identities must match.');
    receipt.sharedBefore = await sharedContext();
    const payloads = new Map();
    for (const row of bundle.sourcePayloads) {
      assert.ok(row.bundlePath.startsWith(bundlePrefix + '/') && row.bundlePath.endsWith('.snapshot'));
      assert.equal(payloads.has(row.bundlePath), false);
      const bytes = await committedBytes(row.bundlePath, row);
      payloads.set(row.bundlePath, bytes); receipt.sourcePayloads.push({ path: row.bundlePath, ...identity(bytes), originLocalReference: row.originLocalReference });
    }
    assert.equal(payloads.size, 46);
    const prerequisite = selection.historicalReadOnlyPrerequisite;
    const historicalBytes = await fs.readFile(relativePath(prerequisite.path));
    assert.equal(sha(historicalBytes), prerequisite.sha256, 'Unchanged encoder test prerequisite must already exist.');
    receipt.historicalReadOnlyPrerequisite = { path: prerequisite.path, ...identity(historicalBytes), unchanged: true };
    const simulated = new Map(bundle.archiveBaseline.map(row => [row.path, { bytes: row.bytes, sha256: row.sha256 }]));
    for (const [phaseName, rows] of [['proposal17', bundle.proposal], ['timestamp5', bundle.timestamp]]) for (const row of rows) {
      assert.ok(allowedTargets.has(row.target));
      assert.deepEqual(simulated.get(row.target) ?? null, row.before, 'Overlay transition has the wrong before identity.');
      assert.ok(payloads.has(row.source)); assert.deepEqual(identity(payloads.get(row.source)), row.after);
      simulated.set(row.target, row.after);
    }
    // Every source and all transition conditions were checked before the first app mutation.
    for (const [phaseName, rows] of [['proposal17', bundle.proposal], ['timestamp5', bundle.timestamp]]) for (const row of rows) {
      const target = relativePath(row.target); let before = null;
      try { before = identity(await fs.readFile(target)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      assert.deepEqual(before, row.before);
      await fs.writeFile(target, payloads.get(row.source), { flag: before === null ? 'wx' : 'w' });
      const after = identity(await fs.readFile(target)); assert.deepEqual(after, row.after);
      receipt.transitions.push({ phase: phaseName, target: row.target, before, after, source: row.source, sourceGitCommit: head, originEpoch: row.originEpoch });
    }
    receipt.afterSourceCensus = await census(); assert.deepEqual(receipt.afterSourceCensus, finalCensus);
    receipt.sharedAfter = await sharedContext(); assert.deepEqual(receipt.sharedAfter, receipt.sharedBefore);
    receipt.gitStatusAfter = gitStatus();
    assert.deepEqual(receipt.gitStatusAfter.map(row => row.path), [...allowedTargets].sort((a, b) => a.localeCompare(b)));
    assert.equal(receipt.transitions.length, 22);
    receipt.status = 'composed-unexecuted-experimental-overlay'; receipt.completed_at_utc = new Date().toISOString();
    await fs.writeFile(path.join(evidence, 'test-selection.json'), selectionBytes, { flag: 'wx' });
    await save();
    console.log(JSON.stringify({ status: receipt.status, sourceRoot: repository, gitBaseline: head, modifiedWorktree: true, currentArchiveSourceFiles: finalCensus.length, proposedTests: 161, productionInstalled: false }));
  } catch (error) {
    receipt.status = 'failed'; receipt.failure = { name: error.name, message: error.message }; receipt.failed_at_utc = new Date().toISOString();
    await save(); throw error;
  }
} else if (phase === 'bootstrap') {
  await fs.mkdir(evidence, { recursive: true });
  const output = path.join(evidence, 'original-acquisition.json');
  const record = { schema: 'rea-archive-aes-hosted-original-prerequisites/v1', status: 'running', started_at_utc: new Date().toISOString(),
    execution, sourceCommit: head, sourceRoot: repository, originalRelease: '7-Zip26.04 complete Windowsx64',
    scope: 'Verification-only official installer/bootstrap acquisition. No original comparison process is executed by this phase. Complete executable/DLL extraction remains separately authenticated by unchanged test helpers.',
    assets: [], originalProcesses: 0, completeComparisonBinariesExtractedByThisPhase: false,
    expectedComparisonBinaryPins: [
      { name: '7z.exe', bytes: 577536, sha256: '95fff19b73eff77c87c0d7bd32822e43fb90dd2932459f962eb532d8dfb6ba53', observedByThisPhase: false },
      { name: '7z.dll', bytes: 1907712, sha256: '899cd73d7fc60e1c1c35c7de0f5bed3dc69bfe2cecbd48014d868a347970a0b1', observedByThisPhase: false }
    ] };
  await fs.writeFile(output, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  async function saveBootstrap() { await fs.writeFile(output, JSON.stringify(record, null, 2) + '\n'); }
  try {
    const composed = JSON.parse(await fs.readFile(receiptPath, 'utf8'));
    assert.equal(composed.status, 'composed-unexecuted-experimental-overlay'); assert.equal(composed.sourceCommit, head);
    assert.deepEqual(composed.execution, execution); assert.equal(composed.sourceRoot.toLowerCase(), repository.toLowerCase());
    assert.deepEqual(await census(), composed.afterSourceCensus); assert.deepEqual(gitStatus(), composed.gitStatusAfter);
    const bootstrapRelative = appPrefix + 'bootstrap-original.mjs';
    const bootstrapBytes = await committedBytes(bootstrapRelative);
    record.bootstrapModule = { path: bootstrapRelative, ...identity(bootstrapBytes), sourceGitCommit: head };
    const { prepareOriginalArchiveOracle } = await import(pathToFileURL(relativePath(bootstrapRelative)).href);
    record.acquisition = await prepareOriginalArchiveOracle();
    assert.equal(record.acquisition.schema, 'rea-archive-original-acquisition/v1');
    const expectedAssets = new Map([
      ['.local/archive-original/7z2604-x64.exe', { bytes: 1664082, sha256: 'd54bf805f9f3704d1e8db2fa3498ae7ef2df0312b40b558e7c71c734430a665d' }],
      ['.local/archive-original/7zr.exe', { bytes: 602624, sha256: '256feca8e274e5da655e2a284fabafd9f554365eb164862089dacd4e8276d282' }]
    ]);
    assert.equal(record.acquisition.assets.length, 2);
    const seen = new Set();
    for (const asset of record.acquisition.assets) {
      assert.ok(expectedAssets.has(asset.path)); assert.equal(seen.has(asset.path), false); seen.add(asset.path);
      assert.equal((await fs.lstat(relativePath(asset.path))).isSymbolicLink(), false);
      const actual = identity(await fs.readFile(relativePath(asset.path)));
      assert.deepEqual(actual, expectedAssets.get(asset.path)); assert.deepEqual(actual, { bytes: asset.bytes, sha256: asset.sha256 });
      record.assets.push({ ...asset, ...actual, authenticated: true, originalBinary: true, published: false });
    }
    assert.deepEqual(await census(), composed.afterSourceCensus); assert.deepEqual(gitStatus(), composed.gitStatusAfter);
    record.status = 'acquired'; record.completed_at_utc = new Date().toISOString(); await saveBootstrap();
    console.log(JSON.stringify({ status: record.status, sourceCommit: head, authenticatedAssets: record.assets.length, originalProcesses: 0, receipt: output }));
  } catch (error) {
    record.status = 'failed'; record.failure = { name: error.name, message: error.message }; record.failed_at_utc = new Date().toISOString();
    await saveBootstrap(); throw error;
  }
} else {
  const before = JSON.parse(await fs.readFile(receiptPath, 'utf8'));
  assert.equal(before.status, 'composed-unexecuted-experimental-overlay'); assert.equal(before.baselineGitCommit, head);
  assert.deepEqual(before.execution, execution); assert.equal(before.sourceRoot.toLowerCase(), repository.toLowerCase());
  const afterSourceCensus = await census(), afterShared = await sharedContext(), afterStatus = gitStatus();
  assert.deepEqual(afterSourceCensus, before.afterSourceCensus); assert.deepEqual(afterSourceCensus, finalCensus);
  assert.deepEqual(afterShared, before.sharedAfter); assert.deepEqual(afterStatus, before.gitStatusAfter);
  assert.equal(sha(await fs.readFile(relativePath(selection.historicalReadOnlyPrerequisite.path))), selection.historicalReadOnlyPrerequisite.sha256);
  const record = { schema: 'rea-archive-aes-hosted-postrun-source-check/v1', checked_at_utc: new Date().toISOString(), execution,
    sourceRoot: repository, baselineGitCommit: head, modifiedGitWorktree: true, currentArchiveSourceFiles: afterSourceCensus.length,
    sourceStable: true, sharedStable: true, historicalReadOnlyPrerequisiteUnchanged: true,
    afterSourceCensus, afterShared, gitStatusAfter: afterStatus,
    scope: 'Source stability only. Test exit/TAP/original process counts, browser acceptance and all parity gates require separate evidence.' };
  await fs.writeFile(path.join(evidence, 'postrun-source-check.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ sourceStable: true, sourceRoot: repository, modifiedGitWorktree: true, currentArchiveSourceFiles: afterSourceCensus.length, productionInstalled: false }));
}
