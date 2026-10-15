// Hosted source/record controls only. No application tests or original code.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = bytes => ({ bytes: bytes.length, sha256: sha(bytes) });
const ROOT_ID = { bytes: 147529, sha256: '82fc7f36c0805ee163a93aa1720ed708629ac455d90a9bdd343b30f554335304' };
const CLOUD = 'products/rea-studio/results/cloud-flow-vault-20261015/';
const TRANSITION = 'products/rea-studio/results/cloud-publication-source-transition-20261015/';
const OLD = 'products/rea-studio/results/editor-vault-combined-20261013/';
function same(observed, expected) { assert.deepEqual(identity(observed), { bytes: expected.bytes, sha256: expected.sha256 }); }
function flip(bytes) { const changed = Buffer.from(bytes); assert.ok(changed.length); changed[changed.length - 1] ^= 1; return changed; }

export async function runPublicationControls(root, fixtureRoot, emit) {
  assert.equal(process.platform, 'win32'); assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
  const temporary = fs.realpathSync(process.env.RUNNER_TEMP), fixture = path.resolve(fixtureRoot), relative = path.relative(temporary, fixture);
  assert.ok(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
  fs.mkdirSync(fixture); assert.equal(fs.realpathSync(fixture).toLowerCase(), fixture.toLowerCase());
  const rows = [];
  function positive(name, body, detail = {}) { emit('control-started', { name }); body(); const row = { name, passed: true, ...detail }; rows.push(row); emit('control-passed', row); }
  function negative(name, body, layer) {
    emit('control-started', { name }); let rejected;
    try { body(); } catch (error) { rejected = { name: error.name, message: String(error.message).slice(0, 2048) }; }
    assert.ok(rejected, 'Mutation was accepted: ' + name); const row = { name, passed: true, rejected, rejectionLayer: layer }; rows.push(row); emit('control-passed', row);
  }
  const { createEditorVaultProofMigration } = await import(pathToFileURL(path.join(root, 'scripts/editor-vault-proof-migration.mjs')).href);
  const { verifyCloudRecoveryRecords } = await import(pathToFileURL(path.join(root, 'scripts/verify-cloud-recovery-records.mjs')).href);
  const read = name => fs.readFileSync(path.join(root, name));
  let migration;
  positive('named-migration-positive', () => { migration = createEditorVaultProofMigration(read); assert.equal(migration.summary().latestInstalledSourcesMandatory, 35); });
  positive('three-fixed-root-epochs', () => {
    assert.equal(migration.resolve('scripts/verify-records.mjs', ROOT_ID), null);
    assert.equal(migration.resolve('scripts/verify-records.mjs', { bytes: 142684, sha256: '42f2c1c25325867d9b366a71d9e17e87349fe258cdb1b24f9f5f5585b38d77c6' }), TRANSITION + 'verifier-middle/verify-records.mjs.snapshot');
    assert.equal(migration.resolve('scripts/verify-records.mjs', { bytes: 142428, sha256: '8283f709444328e1dee3483c46322a07652c2be1d2ac71ff94269c2e645e6702' }), 'products/rea-studio/results/editor-vault-proof-migration-20261013/verifier-before/verify-records.mjs.snapshot');
  });
  negative('unknown-root-epoch', () => migration.resolve('scripts/verify-records.mjs', { bytes: 1, sha256: '0'.repeat(64) }), 'named identity resolver');
  negative('unknown-flow-source-epoch', () => migration.resolve('products/rea-studio/apps/flow/client.mjs', { bytes: 1, sha256: '0'.repeat(64) }), 'named identity resolver');
  for (const [name, target] of [
    ['mandatory-current-flow-after', 'products/rea-studio/apps/flow/client.mjs'],
    ['mandatory-current-vault-after', 'products/rea-studio/apps/vault/client.mjs'],
    ['mandatory-middle-root-snapshot', TRANSITION + 'verifier-middle/verify-records.mjs.snapshot'],
  ]) negative(name, () => createEditorVaultProofMigration(file => file === target ? flip(read(file)) : read(file)), 'fixed source identity');

  // Execute the exact pinned historical937 block in an isolated context. Reads
  // can be replaced in memory; no file in the actual checkout is changed.
  const rootBytes = read('scripts/verify-records.mjs'); same(rootBytes, ROOT_ID); const source = rootBytes.toString('utf8');
  const start = "  const historical937Prefix = '", end = '  assert.equal(validation.source_bytes_stable_across_run, true);';
  assert.equal(source.split(start).length, 2); assert.equal(source.split(end).length, 2);
  const block = source.slice(source.indexOf(start), source.indexOf(end) + end.length) + '\n;({routed:historical937Routed,unchanged:historical937Unchanged,rows:historical937Checked.size})';
  const script = new vm.Script(block, { filename: 'exact-reviewed-root-historical937-control.mjs' });
  function historical937({ changed = null, resolver = migration } = {}) {
    return script.runInNewContext({ root, developmentRoot: path.join(root, 'products/rea-studio'),
      status: JSON.parse(read('products/rea-studio/STATUS.json')), assert, join: path.join, lstatSync: fs.lstatSync, sha, sourceProofMigration: resolver,
      safeRecordPath(name) { assert.ok(typeof name === 'string' && name && !name.startsWith('/') && !name.split('/').includes('..') && !name.includes('\\')); },
      readFileSync(filename, ...args) { const bytes = fs.readFileSync(filename, ...args); return changed && path.resolve(filename).toLowerCase() === path.resolve(root, changed).toLowerCase() ? flip(bytes) : bytes; },
    }, { timeout: 120000 });
  }
  positive('historical937-exact-block-positive', () => { const result = historical937(); assert.equal(result.rows, 737); assert.equal(result.routed, 6); assert.equal(result.unchanged, 731); });
  negative('historical937-frozen-source-byte-change', () => historical937({ changed: OLD + 'source/apps/archive/app.test.mjs.snapshot' }), 'exact reviewed937 block: frozen source hash');
  negative('historical937-unchanged-current-byte-change', () => historical937({ changed: 'products/rea-studio/apps/archive/app.test.mjs' }), 'exact reviewed937 block: current source hash');
  negative('historical937-receipt-byte-change', () => historical937({ changed: 'products/rea-studio/results/development-validation.json' }), 'exact immutable937 receipt hash');
  negative('historical937-unlisted-resolver-route', () => historical937({ resolver: { resolve(name, expected) { return name === 'products/rea-studio/apps/archive/app.test.mjs' ? OLD + 'source/apps/archive/app.test.mjs.snapshot' : migration.resolve(name, expected); } } }), 'exact reviewed937 block: six-route allowlist');

  positive('finite282-committed-positive', () => { assert.equal(verifyCloudRecoveryRecords(root).recordedPass, 282); });
  const manifestBytes = read(CLOUD + 'preservation-manifest.json'), manifest = JSON.parse(manifestBytes), copies = new Map();
  copies.set('preservation-manifest.json', { bytes: manifestBytes.length, sha256: sha(manifestBytes) });
  for (const row of manifest.records) copies.set(row.path, row);
  assert.equal(copies.size, 352); let copiedBytes = 0;
  for (const [name, expected] of copies) {
    assert.ok(!path.isAbsolute(name) && !/[\\:\x00-\x1f]/.test(name) && name.split('/').every(part => part && part !== '.' && part !== '..'));
    const bytes = read(CLOUD + name); same(bytes, expected); copiedBytes += bytes.length; assert.ok(copiedBytes <= 8 * 1024 * 1024);
    const target = path.join(fixture, CLOUD, name); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes, { flag: 'wx' });
  }
  positive('finite282-owned-fixture-positive', () => { assert.equal(verifyCloudRecoveryRecords(fixture).recordedPass, 282); });
  function mutate(name, relativeName, change, layer) {
    const target = path.join(fixture, CLOUD, relativeName), original = fs.readFileSync(target);
    try { fs.writeFileSync(target, change(original)); negative(name, () => verifyCloudRecoveryRecords(fixture), layer); }
    finally { fs.writeFileSync(target, original); }
  }
  const attemptRow = manifest.records.find(row => row.sourcePath === 'attempt-validation.json'); assert.ok(attemptRow);
  mutate('finite282-object-byte-change', attemptRow.path, flip, 'immutable object identity');
  mutate('finite282-duplicate-alias-manifest-change', 'preservation-manifest.json', bytes => { const value = JSON.parse(bytes); value.records.push(value.records[0]); return Buffer.from(JSON.stringify(value)); }, 'immutable manifest identity');
  mutate('finite282-false-full-suite-flag', 'preservation-manifest.json', bytes => { const value = JSON.parse(bytes); value.fullDevelopmentSuiteAcceptance = true; return Buffer.from(JSON.stringify(value)); }, 'immutable manifest identity');
  for (const [name, change] of [
    ['finite282-selected-tests-change', value => { value.selectedTestFiles[0] = 'apps/flow/unlisted-control.test.mjs'; }],
    ['finite282-false-pass-summary', value => { value.summary.pass = 281; }],
    ['finite282-false-full-parity-flag', value => { value.fullFeatureParityEstablished = true; }],
  ]) mutate(name, attemptRow.path, bytes => { const value = JSON.parse(bytes); change(value); return Buffer.from(JSON.stringify(value)); }, 'immutable attempt object identity (semantic branch is not bypassed or claimed exercised)');
  const extra = path.join(fixture, CLOUD, 'unlisted-control.snapshot');
  try { fs.writeFileSync(extra, 'Owned negative inventory control.', { flag: 'wx' }); negative('finite282-extra-prefix-file', () => verifyCloudRecoveryRecords(fixture), 'exact finite capsule inventory'); }
  finally { assert.ok(path.relative(fixture, extra).startsWith('products' + path.sep)); fs.unlinkSync(extra); }
  assert.equal(rows.length, 21); assert.ok(rows.every(row => row.passed));
  return { schema: 'rea-cloud-publication-controls/v1', status: 'passed', sourceOnly: true, rows, checks: rows.length,
    exactReviewed937Block: ROOT_ID, fixtureFiles: copies.size, fixtureBytes: copiedBytes,
    actualCheckoutFilesMutated: 0, applicationTests: 0, originalExecutions: 0,
    limits: ['Finite manifest/attempt mutations are rejected at their immutable identity layer; deeper semantic branches are not separately bypassed or claimed tested.', 'The937 block executes only publication assertions/readers in a bounded VM; it does not execute the historical937 behavioral tests.'] };
}
