// Hosted-only composition of nine source targets. No test/vendor execution.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
assert.equal(process.env.CI, 'true'); assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted'); assert.equal(process.env.GITHUB_REPOSITORY, 'Ginderlax/rea-research-lab');
for (const name of ['GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'RUNNER_TEMP']) assert(process.env[name]);
const args = process.argv.slice(2); assert.equal(args.length, 4); assert.equal(args[0], '--phase'); assert(['compose', 'verify-after'].includes(args[1])); assert.equal(args[2], '--evidence'); assert(path.isAbsolute(args[3]));
const phase = args[1], repository = fileURLToPath(new URL('../../../', import.meta.url)), prefix = 'products/rea-studio/experiments/vault-empty-bin';
const bundlePin = {"bytes":9533,"sha256":"b8da7b2fadb49dbbc3a7fef221b56cf032744b3ee7b2b5ae03c5cc7da0111a9c"};
const targets = ["products/rea-studio/apps/vault/recycle.mjs","products/rea-studio/apps/vault/server.mjs","products/rea-studio/apps/vault/client.mjs","products/rea-studio/apps/vault/bin-empty.test.mjs","products/rea-studio/apps/vault/bin-empty-server.test.mjs","products/rea-studio/apps/vault/bin-empty-ui.test.mjs","products/rea-studio/apps/vault/bin-empty-adjacent.test.mjs","products/rea-studio/apps/vault/bin-empty-original.test.mjs","products/rea-studio/apps/vault/bin-empty-oracle.ps1"];
const tests = ["products/rea-studio/apps/vault/app.integration.test.mjs","products/rea-studio/apps/vault/app.test.mjs","products/rea-studio/apps/vault/bin-empty-adjacent.test.mjs","products/rea-studio/apps/vault/bin-empty-original.test.mjs","products/rea-studio/apps/vault/bin-empty-server.test.mjs","products/rea-studio/apps/vault/bin-empty-ui.test.mjs","products/rea-studio/apps/vault/bin-empty.test.mjs","products/rea-studio/apps/vault/disposal-adjacent.test.mjs","products/rea-studio/apps/vault/draft-adjacent.test.mjs","products/rea-studio/apps/vault/group-active-controls.test.mjs","products/rea-studio/apps/vault/group-active-root-replay.test.mjs","products/rea-studio/apps/vault/group-coherence-boundaries.test.mjs","products/rea-studio/apps/vault/group-coherence-replay.test.mjs","products/rea-studio/apps/vault/group-edit-adjacent-replay.test.mjs","products/rea-studio/apps/vault/group-edit-correction-controls.test.mjs","products/rea-studio/apps/vault/group-edit-final-list-replay.test.mjs","products/rea-studio/apps/vault/group-edit-independent-persistence.test.mjs","products/rea-studio/apps/vault/group-edit-original.test.mjs","products/rea-studio/apps/vault/group-edit-server.test.mjs","products/rea-studio/apps/vault/group-edit-ui.test.mjs","products/rea-studio/apps/vault/group-edit.test.mjs","products/rea-studio/apps/vault/group-original.test.mjs","products/rea-studio/apps/vault/group-recycle.test.mjs","products/rea-studio/apps/vault/group-server.test.mjs","products/rea-studio/apps/vault/group-ui.test.mjs","products/rea-studio/apps/vault/history.test.mjs","products/rea-studio/apps/vault/http.test.mjs","products/rea-studio/apps/vault/idle-view.test.mjs","products/rea-studio/apps/vault/kdbx.interop.test.mjs","products/rea-studio/apps/vault/kdbx.test.mjs","products/rea-studio/apps/vault/preexisting-draft.test.mjs","products/rea-studio/apps/vault/recycle-boundaries.test.mjs","products/rea-studio/apps/vault/recycle-confirmation.test.mjs","products/rea-studio/apps/vault/recycle-controls.test.mjs","products/rea-studio/apps/vault/recycle-http.test.mjs","products/rea-studio/apps/vault/recycle-original.test.mjs","products/rea-studio/apps/vault/recycle-server.test.mjs","products/rea-studio/apps/vault/recycle-ui.test.mjs","products/rea-studio/apps/vault/recycle.test.mjs","products/rea-studio/apps/vault/same-editor-draft.test.mjs","products/rea-studio/apps/vault/selection-adjacent.test.mjs","products/rea-studio/apps/vault/selection-boundaries.test.mjs","products/rea-studio/apps/vault/selection-independent.test.mjs","products/rea-studio/apps/vault/ui.test.mjs","products/rea-studio/apps/vault/unknown-time.test.mjs"];
const execution = Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY'].map(name => [name, process.env[name] ?? null]));
const identity = bytes => ({ bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
const pin = value => ({ bytes: value.bytes, sha256: value.sha256 });
const sort = rows => [...rows].sort((a, b) => a.path.localeCompare(b.path));
function canonical(relative) { assert(typeof relative === 'string' && relative.length && relative.length < 4096 && !/[\\:\x00-\x1f\x7f]/.test(relative) && !relative.startsWith('/')); assert(relative.split('/').every(part => part && part !== '.' && part !== '..')); return relative; }
async function read(root, relative) {
  canonical(relative); let filename = root;
  for (const part of relative.split('/')) { filename = path.join(filename, part); assert(!(await fs.lstat(filename)).isSymbolicLink(), 'Source/evidence links are refused'); }
  const item = await fs.stat(filename); assert(item.isFile() && item.size <= 8 * 1024 * 1024); return fs.readFile(filename);
}
async function resolveDestination(destination) { let ancestor = path.resolve(destination); const suffix = []; while (!(await fs.stat(ancestor).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; }))) { const parent = path.dirname(ancestor); assert.notEqual(parent, ancestor); suffix.unshift(path.basename(ancestor)); ancestor = parent; } return path.join(await fs.realpath(ancestor), ...suffix); }
const temporary = await fs.realpath(process.env.RUNNER_TEMP), evidence = await resolveDestination(args[3]);
const relativeEvidence = path.relative(temporary, evidence); assert(relativeEvidence && !path.isAbsolute(relativeEvidence) && relativeEvidence !== '..' && !relativeEvidence.startsWith('..' + path.sep));
await fs.mkdir(evidence, { recursive: true });
const sourceRoot = await fs.realpath(repository), receiptName = phase === 'compose' ? 'vault-empty-bin-composition.json' : 'vault-empty-bin-postrun-source-check.json';
const record = { schema: phase === 'compose' ? 'rea-vault-empty-bin-hosted-composition/v1' : 'rea-vault-empty-bin-hosted-postrun-source-check/v1', status: 'running', phase, startedAtUtc: new Date().toISOString(), execution, sourceRoot,
  sourceOnly: true, applicationRuntimeChangedInExperiment: true, productionInstalled: false, historicalReceiptsRebound: false, testExecutionsByComposer: 0, originalExecutionsByComposer: 0, transitions: [],
  scope: 'Nine explicit hosted-only Vault source targets. Source composition/stability only; all45 selected Vault files, four actual library operations, broader suite, real browser and production installation require separate actual evidence.' };
async function save(initial = false) { const final = path.join(evidence, receiptName), next = initial ? final : final + '.tmp'; const handle = await fs.open(next, 'wx'); try { await handle.writeFile(JSON.stringify(record, null, 2) + '\n'); await handle.sync(); } finally { await handle.close(); } if (!initial) await fs.rename(next, final); }
async function copy(relative, bytes) { canonical(relative); const filename = path.join(evidence, relative); await fs.mkdir(path.dirname(filename), { recursive: true }); await fs.writeFile(filename, bytes, { flag: 'wx' }); }
function git(arguments_) { const result = spawnSync('git', arguments_, { cwd: repository, shell: false, windowsHide: true, timeout: 30000, maxBuffer: 4 * 1024 * 1024 }); assert.equal(result.error, undefined); assert.equal(result.status, 0, 'Read-only Git authentication failed'); return result.stdout; }
async function committed(relative, expected) { const bytes = await read(repository, relative); assert.deepEqual(bytes, git(['show', 'HEAD:' + canonical(relative)])); if (expected) assert.deepEqual(identity(bytes), pin(expected)); return bytes; }
function status() { return sort(git(['status', '--porcelain=v1', '-z', '--untracked-files=all']).toString('utf8').split('\0').filter(Boolean).map(value => { const state = value.slice(0, 2), relative = canonical(value.slice(3)); assert([' M', '??'].includes(state), 'Unexpected staged/deleted/renamed state'); return { path: relative, status: state }; })); }
await save(true);
try {
  const head = git(['rev-parse', 'HEAD']).toString('utf8').trim(); assert.equal(head, process.env.GITHUB_SHA); record.baselineGitCommit = head; record.sourceCommit = head;
  const bundleBytes = await committed(prefix + '/bundle.json', bundlePin), bundle = JSON.parse(bundleBytes);
  assert.equal(bundle.schema, 'rea-vault-empty-bin-hosted-source-bundle/v1'); assert.equal(bundle.sourceAuthoringOnly, true); assert.equal(bundle.productionInstalled, false); assert.equal(bundle.applicationRuntimeChangedInExperiment, true); assert.equal(bundle.sourceReviewRequiredBeforeDispatch, true);
  assert.deepEqual(bundle.tests, tests); assert.deepEqual(bundle.transitions.map(row => row.target), targets); assert.equal(bundle.transitions.filter(row => row.before).length, 3); assert.equal(bundle.transitions.filter(row => row.before === null).length, 6);
  assert.equal(bundle.testExecutions, 0); assert.equal(bundle.originalExecutions, 0); assert.equal(bundle.payloads.length, 13);
  const payloads = new Map(); let totalBytes = 0;
  for (const row of bundle.payloads) { canonical(row.path); assert(!payloads.has(row.path)); assert(row.path === 'README.txt' || row.path.endsWith('.snapshot')); const bytes = await committed(prefix + '/' + row.path, row); totalBytes += bytes.length; assert(totalBytes <= 64 * 1024 * 1024); payloads.set(row.path, bytes); }
  for (const row of bundle.transitions) {
    assert.equal(row.after.sourcePath, 'after/' + row.target + '.snapshot'); assert(payloads.has(row.after.sourcePath)); assert.deepEqual(identity(payloads.get(row.after.sourcePath)), pin(row.after));
    if (row.before) { assert.equal(row.before.sourcePath, 'before/' + row.target + '.snapshot'); assert(payloads.has(row.before.sourcePath)); assert.deepEqual(identity(payloads.get(row.before.sourcePath)), pin(row.before)); }
  }
  const expectedTransitions = bundle.transitions.map(row => ({ path: row.target, before: row.before === null ? null : pin(row.before), after: pin(row.after), sourcePayload: row.after.sourcePath }));
  const expectedStatus = sort(bundle.transitions.map(row => ({ path: row.target, status: row.before ? ' M' : '??' })));
  const expectedTargets = sort(bundle.transitions.map(row => ({ path: row.target, ...pin(row.after) })));
  const current = async () => {
    const rows = await Promise.all(targets.map(async target => ({ path: target, ...identity(await read(repository, target)) })));
    return sort(rows);
  };
  record.sourceBundle = { path: prefix + '/bundle.json', ...identity(bundleBytes) }; record.tests = tests;
  if (phase === 'compose') {
    assert.deepEqual(status(), [], 'Compose only a clean committed checkout'); record.gitStatusBefore = [];
    for (const row of bundle.transitions) {
      if (row.before) await copy('before/' + row.target + '.snapshot', await committed(row.target, row.before));
      else { assert.equal(git(['ls-tree', 'HEAD', '--', row.target]).length, 0); assert.equal(await fs.lstat(path.join(repository, row.target)).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; }), false); }
    }
    await copy('bundle.json.snapshot', bundleBytes);
    for (const [relative, bytes] of payloads) await copy('bundle/' + relative + (relative.endsWith('.snapshot') ? '' : '.snapshot'), bytes);
    await copy('vault-empty-bin-composer.mjs.snapshot', await committed('products/rea-studio/scripts/compose-vault-empty-bin-cloud.mjs'));
    assert.deepEqual(status(), []);
    for (const [index, row] of bundle.transitions.entries()) {
      if (row.before) assert.deepEqual(identity(await read(repository, row.target)), pin(row.before));
      await fs.writeFile(path.join(repository, row.target), payloads.get(row.after.sourcePath), { flag: row.before ? 'w' : 'wx' });
      assert.deepEqual(identity(await read(repository, row.target)), pin(row.after));
      record.transitions.push(expectedTransitions[index]); await copy('after/' + row.target + '.snapshot', payloads.get(row.after.sourcePath)); await save();
    }
    record.currentTargets = await current(); assert.deepEqual(record.currentTargets, expectedTargets);
    record.currentTargetSHA256 = Object.fromEntries(record.currentTargets.map(row => [row.path, row.sha256])); record.gitStatus = status(); assert.deepEqual(record.gitStatus, expectedStatus);
    record.status = 'composed-unexecuted-vault-empty-bin-overlay';
  } else {
    const compositionBytes = await read(evidence, 'vault-empty-bin-composition.json'), composition = JSON.parse(compositionBytes);
    assert.equal(composition.schema, 'rea-vault-empty-bin-hosted-composition/v1'); assert.equal(composition.status, 'composed-unexecuted-vault-empty-bin-overlay'); assert.deepEqual(composition.execution, execution);
    assert.equal(composition.sourceRoot.toLowerCase(), sourceRoot.toLowerCase()); assert.equal(composition.sourceCommit, head); assert.equal(composition.baselineGitCommit, head);
    assert.deepEqual(composition.sourceBundle, record.sourceBundle); assert.deepEqual(composition.transitions, expectedTransitions); assert.deepEqual(composition.gitStatusBefore, []);
    for (const row of bundle.transitions) { if (row.before) assert.deepEqual(identity(await read(evidence, 'before/' + row.target + '.snapshot')), pin(row.before)); assert.deepEqual(identity(await read(evidence, 'after/' + row.target + '.snapshot')), pin(row.after)); }
    record.currentTargets = await current(); assert.deepEqual(record.currentTargets, expectedTargets); assert.deepEqual(composition.currentTargets, expectedTargets);
    record.currentTargetSHA256 = Object.fromEntries(expectedTargets.map(row => [row.path, row.sha256])); assert.deepEqual(composition.currentTargetSHA256, record.currentTargetSHA256);
    record.gitStatus = status(); assert.deepEqual(record.gitStatus, expectedStatus); assert.deepEqual(composition.gitStatus, expectedStatus);
    record.compositionSHA256 = identity(compositionBytes).sha256; record.sourceStable = true; record.checkedTargets = 9; record.status = 'passed';
  }
  record.completedAtUtc = new Date().toISOString(); await save(); console.log(JSON.stringify(record));
} catch (error) { record.status = 'failed'; record.failure = { name: error.name, message: error.message }; record.completedAtUtc = new Date().toISOString(); await save(); throw error; }
