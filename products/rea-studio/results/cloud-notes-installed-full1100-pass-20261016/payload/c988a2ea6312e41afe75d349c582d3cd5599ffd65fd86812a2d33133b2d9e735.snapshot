// Hosted source composition only. This script never acquires or executes vendor
// programs, imports tests, or changes the installed application/runtime locally.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const prefix = 'products/rea-studio/experiments/bsdtar-oracle';
const bundlePin = { bytes: 7684, sha256: '9a04b60ed08f21fd1b5efd17c37645de27e3149ee7bc2fba61e42731ff638ced' };
const appPrefix = 'products/rea-studio/apps/archive/';
const expected = [
  { target: appPrefix + 'formats.test.mjs', before: { bytes: 31783, sha256: '7a7847d60b34ead39b597aac54c1612f616ffe69b9a267e193bb01fc78554c98' }, after: { bytes: 31500, sha256: 'da7434f30495ae78c859e0de32b750ab11e87d7d46b74f99965ebb67fd58f206' } },
  { target: appPrefix + 'zstd.test.mjs', before: { bytes: 19409, sha256: 'b50927498b32b96dd40096618a0a412b7a9a54a9548a40cd76fe23c0fba6dbaa' }, after: { bytes: 19262, sha256: 'e0b3387b533629bc8c2cada818fa724606f3fb0d1595d1286403eb5dcbffa6bb' } },
  { target: appPrefix + 'bsdtar-original-test-helper.mjs', before: null, after: { bytes: 2602, sha256: 'b41cad7ea4389afb9d7278b02c80e24013ceae8e18a465e694d4db0a4ea07a50' } },
];
const assetPins = [
  { name: 'tar.exe', bytes: 92280, sha256: '4e598a8cec84af779e3377442fce2b94b976f614ed4c6e5a665e19308fd1e379' },
  { name: 'archiveint.dll', bytes: 1482752, sha256: 'ca36efd61b33586e4cee69513bf3dcc8d20b65f37bd6495d5d82eb15833b5824' },
];
const arguments_ = process.argv.slice(2);
assert.equal(arguments_.length, 4, 'Use --phase compose|verify-after --evidence <absolute RUNNER_TEMP child>');
assert.equal(arguments_[0], '--phase'); assert(['compose', 'verify-after'].includes(arguments_[1]));
assert.equal(arguments_[2], '--evidence'); assert(path.isAbsolute(arguments_[3]));
assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
assert.equal(process.env.CI, 'true', 'Normal local composition is disabled');
assert.equal(process.env.GITHUB_ACTIONS, 'true'); assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
assert.equal(process.env.GITHUB_REPOSITORY, 'Ginderlax/rea-research-lab');
for (const name of ['RUNNER_TEMP', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) assert(process.env[name]);
const phase = arguments_[1];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = bytes => ({ bytes: bytes.length, sha256: sha(bytes) });
const metadata = row => ({ bytes: row.bytes, sha256: row.sha256 });
const sortRows = rows => [...rows].sort((a, b) => a.path.localeCompare(b.path));
function canonical(relative) {
  assert(typeof relative === 'string' && relative.length && relative.length < 4096 && !/[\\:\x00-\x1f\x7f]/.test(relative) && !relative.startsWith('/'));
  assert(relative.split('/').every(part => part && part !== '.' && part !== '..'));
  return relative;
}
async function read(root, relative) {
  canonical(relative); let target = root;
  for (const part of relative.split('/')) { target = path.join(target, part); assert(!(await fs.lstat(target)).isSymbolicLink(), 'Source links are refused'); }
  const stat = await fs.stat(target); assert(stat.isFile() && stat.size <= 2 * 1024 * 1024);
  return fs.readFile(target);
}
async function resolvedDestination(destination) {
  let ancestor = path.resolve(destination); const suffix = [];
  while (!(await fs.stat(ancestor).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; }))) {
    const parent = path.dirname(ancestor); assert.notEqual(parent, ancestor); suffix.unshift(path.basename(ancestor)); ancestor = parent;
  }
  return path.join(await fs.realpath(ancestor), ...suffix);
}
const temporary = await fs.realpath(process.env.RUNNER_TEMP), evidence = await resolvedDestination(arguments_[3]);
const relativeEvidence = path.relative(temporary, evidence);
assert(relativeEvidence && !path.isAbsolute(relativeEvidence) && relativeEvidence !== '..' && !relativeEvidence.startsWith('..' + path.sep), 'Evidence must be an owned child of real RUNNER_TEMP');
const sourceRoot = await fs.realpath(repository);
const execution = Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_REPOSITORY', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT'].map(name => [name, process.env[name] ?? null]));
function git(arguments__) {
  const result = spawnSync('git', arguments__, { cwd: repository, shell: false, windowsHide: true, timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
  assert.equal(result.error, undefined); assert.equal(result.status, 0, 'Read-only Git source authentication failed');
  return result.stdout;
}
const text = arguments__ => git(arguments__).toString('utf8').trim();
const head = text(['rev-parse', 'HEAD']);
assert.equal(head, process.env.GITHUB_SHA); assert(/^[0-9a-f]{40}$/.test(head));
assert.equal((await fs.realpath(text(['rev-parse', '--show-toplevel']))).toLowerCase(), sourceRoot.toLowerCase());
function gitStatus() {
  return sortRows(git(['status', '--porcelain=v1', '-z', '--untracked-files=all']).toString('utf8').split('\0').filter(Boolean).map(record => {
    const status = record.slice(0, 2), relative = canonical(record.slice(3));
    assert([' M', '??'].includes(status), 'Unexpected staged/deleted/renamed source state');
    return { path: relative, status };
  }));
}
async function committed(relative, pin) {
  const bytes = await read(repository, relative);
  assert.deepEqual(bytes, git(['show', 'HEAD:' + canonical(relative)]), 'Working source differs from its committed Git blob');
  if (pin) assert.deepEqual(identity(bytes), metadata(pin), 'Reviewed source identity changed');
  return bytes;
}
const bundleBytes = await committed(prefix + '/bundle.json', bundlePin), bundle = JSON.parse(bundleBytes);
assert.equal(bundle.schema, 'rea-bsdtar-oracle-hosted-source-bundle/v1');
for (const name of ['sourceOnly', 'sourceAuthoringOnly', 'testBodiesAndExpectationsPreserved']) assert.equal(bundle[name], true);
for (const name of ['productionInstalled', 'applicationRuntimeChanged', 'fullDevelopmentSuiteAcceptance', 'historicalReceiptsRebound', 'historicalDLLDependencyEstablished']) assert.equal(bundle[name], false);
for (const name of ['originalAcquisitions', 'originalExecutions', 'testExecutions']) assert.equal(bundle[name], 0);
assert.deepEqual(bundle.pairedOriginalAssets, assetPins); assert.equal(bundle.transitions.length, 3); assert.equal(bundle.payloads.length, 10);
const payloads = new Map();
for (const row of bundle.payloads) {
  canonical(row.path); assert(!payloads.has(row.path));
  assert(row.path === 'README.txt' || row.path.endsWith('.snapshot'), 'Only inert bundle payloads are allowed');
  payloads.set(row.path, await committed(prefix + '/' + row.path, row));
}
for (const [index, row] of bundle.transitions.entries()) {
  const authority = expected[index]; assert.equal(row.target, authority.target);
  assert.deepEqual(row.before === null ? null : metadata(row.before), authority.before);
  assert.deepEqual(metadata(row.after), authority.after);
  assert(payloads.has(row.after.sourcePath)); assert.deepEqual(identity(payloads.get(row.after.sourcePath)), authority.after);
  if (row.before) {
    assert(payloads.has(row.before.sourcePath)); assert.deepEqual(identity(payloads.get(row.before.sourcePath)), authority.before);
    assert(payloads.has(row.patch)); assert.equal(row.adaptations.length, 2);
    let transformed = payloads.get(row.before.sourcePath).toString('utf8');
    for (const adaptation of row.adaptations) { assert.equal(transformed.split(adaptation.before).length, 2); transformed = transformed.replace(adaptation.before, adaptation.after); }
    assert.deepEqual(Buffer.from(transformed), payloads.get(row.after.sourcePath), 'Changes must be exactly the reviewed import/loader edits');
  } else assert.deepEqual(row.adaptations, []);
}
const expectedStatus = sortRows(expected.map(row => ({ path: row.target, status: row.before ? ' M' : '??' })));
const receiptName = 'bsdtar-composition.json';
async function save(relative, bytes) {
  canonical(relative); const target = path.join(evidence, relative); await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes, { flag: 'wx' });
}
async function json(relative, value) { await save(relative, Buffer.from(JSON.stringify(value, null, 2) + '\n')); }
async function updateReceipt(receipt) {
  const temporaryReceipt = path.join(evidence, receiptName + '.tmp');
  const handle = await fs.open(temporaryReceipt, 'wx');
  try { await handle.writeFile(JSON.stringify(receipt, null, 2) + '\n'); await handle.sync(); } finally { await handle.close(); }
  await fs.rename(temporaryReceipt, path.join(evidence, receiptName));
}
async function currentTargets() {
  return sortRows(await Promise.all(expected.map(async row => ({ path: row.target, ...identity(await read(repository, row.target)) }))));
}
const expectedTargets = sortRows(expected.map(row => ({ path: row.target, ...row.after })));
if (phase === 'compose') {
  assert.deepEqual(gitStatus(), [], 'Compose only a clean committed checkout');
  assert.equal(text(['ls-tree', 'HEAD', '--', expected[2].target]), '', 'The new helper must be absent from the baseline commit');
  await fs.mkdir(evidence, { recursive: true });
  const receipt = { schema: 'rea-bsdtar-oracle-hosted-composition/v1', status: 'running', startedAtUtc: new Date().toISOString(),
    execution, sourceRoot, baselineGitCommit: head, sourceCommit: head,
    sourceOnlyOracleTestComposition: true, sourceIdentityRequiresBaselineAndComposition: true,
    productionInstalled: false, applicationRuntimeChanged: false, originalAcquisitionsByComposer: 0, originalExecutionsByComposer: 0, testExecutionsByComposer: 0,
    historicalReceiptsRebound: false, historicalDLLDependencyEstablished: false, fullDevelopmentSuiteAcceptance: false,
    sourceBundle: { path: prefix + '/bundle.json', ...identity(bundleBytes) }, pairedOriginalAssets: assetPins,
    transitions: [], gitStatusBefore: [], currentTargets: [], currentTargetSHA256: {},
    scope: 'Three oracle-test source targets only. Acquisition, paired DLL loading, comparisons and a new full suite need separate actual evidence; historical EXE-only DLL attribution stays unresolved.' };
  const initial = await fs.open(path.join(evidence, receiptName), 'wx');
  try { await initial.writeFile(JSON.stringify(receipt, null, 2) + '\n'); await initial.sync(); } finally { await initial.close(); }
  try {
    const beforeTargets = [];
    for (const row of expected) {
      if (row.before) { const bytes = await committed(row.target, row.before); beforeTargets.push({ path: row.target, ...identity(bytes) }); await save('before/' + row.target + '.snapshot', bytes); }
      else { assert.equal(await fs.lstat(path.join(repository, row.target)).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; }), false); beforeTargets.push({ path: row.target, exists: false }); }
    }
    receipt.beforeTargets = sortRows(beforeTargets);
    await json('before-targets.json', receipt.beforeTargets); await save('bundle.json.snapshot', bundleBytes);
    for (const [relative, bytes] of payloads) await save('bundle/' + relative + (relative.endsWith('.snapshot') ? '' : '.snapshot'), bytes);
    await save('composer.mjs.snapshot', await committed('products/rea-studio/scripts/compose-bsdtar-oracle-cloud.mjs'));
    assert.deepEqual(gitStatus(), []);
    for (const row of bundle.transitions) {
      const bytes = payloads.get(row.after.sourcePath);
      if (row.before) assert.deepEqual(identity(await read(repository, row.target)), metadata(row.before));
      await fs.writeFile(path.join(repository, row.target), bytes, { flag: row.before ? 'w' : 'wx' });
      assert.deepEqual(identity(await read(repository, row.target)), metadata(row.after));
      receipt.transitions.push({ path: row.target, before: row.before === null ? null : metadata(row.before), after: metadata(row.after), sourcePayload: row.after.sourcePath });
      await save('after/' + row.target + '.snapshot', bytes); await updateReceipt(receipt);
    }
    receipt.currentTargets = await currentTargets(); assert.deepEqual(receipt.currentTargets, expectedTargets);
    receipt.currentTargetSHA256 = Object.fromEntries(receipt.currentTargets.map(row => [row.path, row.sha256]));
    receipt.gitStatus = gitStatus(); assert.deepEqual(receipt.gitStatus, expectedStatus);
    assert.equal(receipt.transitions.length, 3); receipt.status = 'composed-unexecuted-oracle-test-overlay'; receipt.completedAtUtc = new Date().toISOString();
    await json('after-targets.json', receipt.currentTargets); await updateReceipt(receipt);
    console.log(JSON.stringify(receipt));
  } catch (error) {
    receipt.status = 'failed'; receipt.failure = { name: error.name, message: error.message }; receipt.failedAtUtc = new Date().toISOString();
    await updateReceipt(receipt); throw error;
  }
} else {
  const receiptBytes = await read(evidence, receiptName), receipt = JSON.parse(receiptBytes);
  assert.equal(receipt.schema, 'rea-bsdtar-oracle-hosted-composition/v1'); assert.equal(receipt.status, 'composed-unexecuted-oracle-test-overlay');
  assert.deepEqual(receipt.execution, execution); assert.equal(receipt.sourceRoot.toLowerCase(), sourceRoot.toLowerCase());
  assert.equal(receipt.baselineGitCommit, head); assert.equal(receipt.sourceCommit, head);
  assert.deepEqual(metadata(receipt.sourceBundle), bundlePin); assert.equal(receipt.transitions.length, 3);
  assert.deepEqual(receipt.transitions, bundle.transitions.map(row => ({ path: row.target, before: row.before === null ? null : metadata(row.before), after: metadata(row.after), sourcePayload: row.after.sourcePath })));
  for (const row of expected) {
    if (row.before) assert.deepEqual(identity(await read(evidence, 'before/' + row.target + '.snapshot')), row.before);
    assert.deepEqual(identity(await read(evidence, 'after/' + row.target + '.snapshot')), row.after);
  }
  assert.deepEqual(await currentTargets(), expectedTargets); assert.deepEqual(receipt.currentTargets, expectedTargets);
  assert.deepEqual(receipt.currentTargetSHA256, Object.fromEntries(expectedTargets.map(row => [row.path, row.sha256])));
  assert.deepEqual(gitStatus(), expectedStatus); assert.deepEqual(receipt.gitStatus, expectedStatus);
  const result = { schema: 'rea-bsdtar-oracle-hosted-postrun-source-check/v1', checkedAtUtc: new Date().toISOString(), execution, sourceRoot,
    baselineGitCommit: head, compositionSHA256: sha(receiptBytes), currentTargets: expectedTargets, currentTargetSHA256: receipt.currentTargetSHA256,
    gitStatus: expectedStatus, sourceStable: true, checkedTargets: 3, sourceOnly: true, originalExecutionsByComposer: 0, testExecutionsByComposer: 0,
    productionInstalled: false, fullDevelopmentSuiteAcceptance: false, historicalReceiptsRebound: false,
    scope: 'The three composed oracle-test sources and exact visible Git changes only. Test results, original loader behavior and the whole source census require separate evidence.' };
  await json('bsdtar-postrun-source-check.json', result); console.log(JSON.stringify(result));
}
