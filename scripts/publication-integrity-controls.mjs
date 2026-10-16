// Hosted source/record controls only. No application tests or original code.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = bytes => ({ bytes: bytes.length, sha256: sha(bytes) });
const ROOT_ID = { bytes: 148688, sha256: 'cd524543c7b6c9bf2050194994667e3e805165a934da209957ecbb5559d211c4' };
const CLOUD = 'products/rea-studio/results/cloud-flow-vault-20261015/';
const TRANSITION = 'products/rea-studio/results/cloud-publication-source-transition-20261015/';
const GIT_CLOSURE = 'products/rea-studio/results/publication-git-directory-closure-20261015/';
const EDITOR_CLOSURE = 'products/rea-studio/results/publication-editor-save-git-closure-20261015/';
const WINDOWS_PATH = 'products/rea-studio/results/windows-path-source-transition-20261015/';
const WINDOWS_FINITE = 'products/rea-studio/results/cloud-windows-path-finite-pass-20261015/';
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
  const { verifyGitDirectoryClosure } = await import(pathToFileURL(path.join(root, 'scripts/verify-followup-records.mjs')).href);
  const read = name => fs.readFileSync(path.join(root, name));
  let migration;
  positive('named-migration-positive', () => { migration = createEditorVaultProofMigration(read); assert.equal(migration.summary().latestInstalledSourcesMandatory, 35); });
  const editor31Bytes = read('products/rea-studio/results/editor-save-followup/current-integration/frozen/validation.json.snapshot');
  same(editor31Bytes, { bytes: 11180, sha256: 'f4edee0afc7d40a169576ae9b87fe9d4c9227a1ea355ef19c80fa273b26eee25' }); const editor31 = JSON.parse(editor31Bytes).currentSources;
  positive('historical-editor31-exact-six-live-mismatch-projection', () => {
    const declared = migration.editorMismatchesIncludingHistoricalHost(editor31), observed = [];
    for (const row of editor31) { const live = identity(read(row.path)); if (live.bytes !== row.bytes || live.sha256 !== row.sha256) observed.push({ path: row.path, testedSha256: row.sha256, liveSha256: live.sha256 }); }
    assert.deepEqual(declared, observed); assert.equal(declared.length, 6);
    assert.deepEqual(declared.find(row => row.path === 'products/rea-studio/apps/editor/git.test.mjs'), { path: 'products/rea-studio/apps/editor/git.test.mjs', testedSha256: 'ab8213c182d1568254ea73db57133affbd48304b98f0d275d27c1fcf8b33f0cc', liveSha256: 'c40c070ab2dc74e6d1de1d8b80a02744740864b566d2e5de695baf3ca00da3a2' });
  });
  for (const [name, change] of [
    ['unknown-editor-git-mismatch-SHA', rows => { rows.find(row => row.path.endsWith('/editor/git.test.mjs')).sha256 = '0'.repeat(64); }],
    ['unknown-editor-git-mismatch-size', rows => { rows.find(row => row.path.endsWith('/editor/git.test.mjs')).bytes++; }],
    ['missing-exact-editor-git-mismatch-route', rows => { rows.find(row => row.path.endsWith('/editor/git.test.mjs')).path += '.unlisted'; }],
    ['duplicate-editor31-source-row', rows => { rows[1] = { ...rows[0] }; }],
  ]) negative(name, () => { const rows = structuredClone(editor31); change(rows); migration.editorMismatchesIncludingHistoricalHost(rows); }, 'fixed six-row historical Editor mismatch declaration');
  positive('six-fixed-root-epochs', () => {
    assert.equal(migration.resolve('scripts/verify-records.mjs', ROOT_ID), null);
    assert.equal(migration.resolve('scripts/verify-records.mjs', {"bytes":148558,"sha256":"a78a9467ecd76ae44c3d2413b6d341c735bb1f98a657646d3b00a13dccf066f8"}), 'products/rea-studio/results/requirement-evidence-provenance-20261015/verifier-before/verify-records.mjs.snapshot');
    assert.equal(migration.resolve('scripts/verify-records.mjs', { bytes: 148351, sha256: 'a81c2f4b53fd346a6b86e4dcb63c9b39fb07a4f1e551bcfdbc3c755fce394046' }), 'products/rea-studio/results/historical-carrier-delivery-20261015/verifier-before/verify-records.mjs.snapshot');
    assert.equal(migration.resolve('scripts/verify-records.mjs', { bytes: 147529, sha256: '82fc7f36c0805ee163a93aa1720ed708629ac455d90a9bdd343b30f554335304' }), WINDOWS_PATH + 'verifier-before/verify-records.mjs.snapshot');
    assert.equal(migration.resolve('scripts/verify-records.mjs', { bytes: 142684, sha256: '42f2c1c25325867d9b366a71d9e17e87349fe258cdb1b24f9f5f5585b38d77c6' }), TRANSITION + 'verifier-middle/verify-records.mjs.snapshot');
    assert.equal(migration.resolve('scripts/verify-records.mjs', { bytes: 142428, sha256: '8283f709444328e1dee3483c46322a07652c2be1d2ac71ff94269c2e645e6702' }), 'products/rea-studio/results/editor-vault-proof-migration-20261013/verifier-before/verify-records.mjs.snapshot');
  });
  positive('three-fixed-windows-path-source-identities', () => {
    const summary = migration.summary(); assert.equal(summary.windowsPathCurrentSourcesMandatory, 3); assert.equal(summary.windowsPathHistoricalSourceRoutes, 2);
    assert.equal(summary.windowsPathBehavioralAcceptanceEstablished, false); assert.equal(summary.windowsPathInstallationReceiptAuthenticated, false);
    for (const [target, before, after] of [
      ['products/rea-studio/apps/editor/git.test.mjs', { bytes: 11458, sha256: 'ab8213c182d1568254ea73db57133affbd48304b98f0d275d27c1fcf8b33f0cc' }, { bytes: 11853, sha256: 'c40c070ab2dc74e6d1de1d8b80a02744740864b566d2e5de695baf3ca00da3a2' }],
      ['products/rea-studio/apps/sync/dav-transfer.mjs', { bytes: 14717, sha256: '591146243ed9b378aed70ce4beedceeec1b12319d7747b1e21fad2282286c9bb' }, { bytes: 15511, sha256: 'fa04b006d713e493827540fa04bf5e420762b5dd0bfe33e3b2e23d43c909dbbc' }],
      ['products/rea-studio/apps/sync/webdav.windows-path.test.mjs', null, { bytes: 6871, sha256: 'd8cf54ed4c03321c7782c2f23fd9b3d390ea1e6660d90087183d8d528a1f4c7c' }],
    ]) { assert.equal(migration.resolve(target, after), null); if (before) assert.equal(migration.resolve(target, before), WINDOWS_PATH + 'before/' + target + '.snapshot'); }
  });
  for (const target of ['products/rea-studio/apps/editor/git.test.mjs', 'products/rea-studio/apps/sync/dav-transfer.mjs', 'products/rea-studio/apps/sync/webdav.windows-path.test.mjs']) {
    negative('unknown-windows-path-source-epoch:' + target, () => migration.resolve(target, { bytes: 1, sha256: '0'.repeat(64) }), 'exact named Windows path identity resolver');
    negative('missing-windows-path-explicit-identity:' + target, () => migration.resolve(target), 'explicit expected identity required');
  }
  positive('actual-finite47-immutable-metadata-binding', () => {
    const summary = migration.summary(); assert.equal(summary.historicalFiniteWindowsPathGroups, 47);
    assert.equal(summary.windowsPathFocusedEvidenceAuthenticated, true); assert.equal(summary.windowsPathFocusedEvidenceSelectedMetadataOnly, true);
    assert.equal(summary.windowsPathFocusedEvidenceFullSuiteAccepted, false); assert.equal(summary.windowsPathFocusedEvidenceProductionInstalled, false);
  });
  for (const [name, target] of [
    ['finite47-manifest-byte-change', 'preservation-manifest.json'],
    ['finite47-attempt-byte-change', 'payload/41d3a9da24ee7effedbd2af7bc6dd6952a5a59895edc92b5cff7f8a33cba72c0.snapshot'],
    ['finite47-composition-byte-change', 'payload/7774bfa56f708adbe35eacebc21385a9eed56175e2df6f67c8fec0350af4b7b0.snapshot'],
    ['finite47-postcheck-byte-change', 'payload/adf03e13193e81997ee515bb0e0c4ea4f790120c35ff5bf351f5a5b19bce4ea1.snapshot'],
    ['finite47-stable-source-inventory-byte-change', 'payload/41f2b7950a3fa24d278bd5f6b912bdf221a8f7ee7af8eaa70a5a6201ae2406f2.snapshot'],
    ['finite47-raw-tap-byte-change', 'payload/d5b87bec1e71b8ca96821de21fa2d6c7520586cf0cef4cdfa0f28392f5504dca.snapshot'],
  ]) negative(name, () => createEditorVaultProofMigration(file => file === WINDOWS_FINITE + target ? flip(read(file)) : read(file)), 'fixed finite47 metadata identity; deeper semantic branches are not bypassed or claimed exercised');
  negative('unknown-root-epoch', () => migration.resolve('scripts/verify-records.mjs', { bytes: 1, sha256: '0'.repeat(64) }), 'named identity resolver');
  negative('unknown-flow-source-epoch', () => migration.resolve('products/rea-studio/apps/flow/client.mjs', { bytes: 1, sha256: '0'.repeat(64) }), 'named identity resolver');
  positive('three-fixed-followup-verifier-epochs', () => {
    assert.equal(migration.resolve('scripts/verify-followup-records.mjs', { bytes: 45876, sha256: '856eeba61b820260f7e1bdc8d9bb9e8924e3ae3183a0c3c0495471e6152a8b5f' }), null);
    assert.equal(migration.resolve('scripts/verify-followup-records.mjs', { bytes: 37879, sha256: '92a23a59963713966f8e6c630ea6f89e2dfe8248d8dadfacd662bf349bcd6f7e' }), GIT_CLOSURE + 'verifier-before/verify-followup-records.mjs.snapshot');
    assert.equal(migration.resolve('scripts/verify-followup-records.mjs', { bytes: 37311, sha256: '0d06219b7437fc99d27597713a176c108fd60c9c3a1fb016ffe3acf321a4d58d' }), 'products/rea-studio/results/editor-vault-proof-migration-20261013/verifier-before/verify-followup-records.mjs.snapshot');
  });
  negative('unknown-followup-verifier-epoch', () => migration.resolve('scripts/verify-followup-records.mjs', { bytes: 1, sha256: '0'.repeat(64) }), 'named identity resolver');
  positive('three-fixed-editor-save-verifier-epochs', () => {
    assert.equal(migration.resolve('scripts/verify-editor-save-followup.mjs', { bytes: 8581, sha256: '2e32b4443efc07aa4a7d14a32629e2009ab94671cace973324ca5cd126c1dce8' }), null);
    assert.equal(migration.resolve('scripts/verify-editor-save-followup.mjs', { bytes: 7424, sha256: 'fb3f465eaaefab1197c170410355f30764308e3f5b4e58e30d0c8059fe3e96c3' }), EDITOR_CLOSURE + 'verifier-before/verify-editor-save-followup.mjs.snapshot');
    assert.equal(migration.resolve('scripts/verify-editor-save-followup.mjs', { bytes: 6745, sha256: '4b93961b46b79fe901eafcfc3e1eda564803b60a12be411feb58350da604f001' }), 'products/rea-studio/results/editor-vault-proof-migration-20261013/verifier-before/verify-editor-save-followup.mjs.snapshot');
  });
  negative('unknown-editor-save-verifier-epoch', () => migration.resolve('scripts/verify-editor-save-followup.mjs', { bytes: 1, sha256: '0'.repeat(64) }), 'named identity resolver');
  for (const [name, target] of [
    ['mandatory-current-editor-git-after', 'products/rea-studio/apps/editor/git.test.mjs'],
    ['mandatory-current-sync-transfer-after', 'products/rea-studio/apps/sync/dav-transfer.mjs'],
    ['mandatory-current-windows-path-regression', 'products/rea-studio/apps/sync/webdav.windows-path.test.mjs'],
    ['mandatory-windows-path-manifest', WINDOWS_PATH + 'preservation-manifest.json'],
    ['mandatory-windows-path-editor-before', WINDOWS_PATH + 'before/products/rea-studio/apps/editor/git.test.mjs.snapshot'],
    ['mandatory-windows-path-sync-before', WINDOWS_PATH + 'before/products/rea-studio/apps/sync/dav-transfer.mjs.snapshot'],
    ['mandatory-windows-path-editor-after-snapshot', WINDOWS_PATH + 'after/products/rea-studio/apps/editor/git.test.mjs.snapshot'],
    ['mandatory-windows-path-sync-after-snapshot', WINDOWS_PATH + 'after/products/rea-studio/apps/sync/dav-transfer.mjs.snapshot'],
    ['mandatory-windows-path-new-regression-snapshot', WINDOWS_PATH + 'after/products/rea-studio/apps/sync/webdav.windows-path.test.mjs.snapshot'],
    ['mandatory-prior-147529-root-source', WINDOWS_PATH + 'verifier-before/verify-records.mjs.snapshot'],
    ['mandatory-prior-50750-migration-source', WINDOWS_PATH + 'verifier-before/editor-vault-proof-migration.mjs.snapshot'],
    ['mandatory-prior-52393-closure-migration-source', WINDOWS_PATH + 'verifier-before/editor-vault-proof-migration-editor-save-closure.mjs.snapshot'],
    ['mandatory-current-flow-after', 'products/rea-studio/apps/flow/client.mjs'],
    ['mandatory-current-vault-after', 'products/rea-studio/apps/vault/client.mjs'],
    ['mandatory-middle-root-snapshot', TRANSITION + 'verifier-middle/verify-records.mjs.snapshot'],
    ['mandatory-git-closure-payload', GIT_CLOSURE + 'payload/d29210777777dac0b3d12f6a656a073c9ba717cf6932dbc01b0cc6dc1e7779b8.snapshot'],
    ['mandatory-git-closure-manifest', GIT_CLOSURE + 'preservation-manifest.json'],
    ['mandatory-middle-followup-snapshot', GIT_CLOSURE + 'verifier-before/verify-followup-records.mjs.snapshot'],
    ['mandatory-current-editor-save-verifier', 'scripts/verify-editor-save-followup.mjs'],
    ['mandatory-editor-save-closure-manifest', EDITOR_CLOSURE + 'preservation-manifest.json'],
    ['mandatory-middle-editor-save-snapshot', EDITOR_CLOSURE + 'verifier-before/verify-editor-save-followup.mjs.snapshot'],
    ['mandatory-editor-save-prior-migration', EDITOR_CLOSURE + 'verifier-before/editor-vault-proof-migration.mjs.snapshot'],
  ]) negative(name, () => createEditorVaultProofMigration(file => file === target ? flip(read(file)) : read(file)), 'fixed source identity');

  // Exercise the exact pinned child's alias reader with the authenticated closure
  // in an owned fixture. No child/application entry point is executed here.
  const gitMapBytes = read(GIT_CLOSURE + 'preservation-manifest.json');
  same(gitMapBytes, { bytes: 7382, sha256: '37b34ad5324719094e9842343d7649af4ffbd5606f47488137e04a6ee380e49b' });
  const gitMap = JSON.parse(gitMapBytes), gitCopies = new Map([[GIT_CLOSURE + 'preservation-manifest.json', identity(gitMapBytes)]]);
  for (const row of gitMap.files) gitCopies.set(GIT_CLOSURE + row.path, row);
  for (const row of gitMap.aliases) gitCopies.set(row.sourceManifest.path, row.sourceManifest);
  let gitCopiedBytes = 0;
  for (const [name, expected] of gitCopies) {
    assert.ok(!path.isAbsolute(name) && !/[\\:\x00-\x1f]/.test(name) && name.split('/').every(part => part && part !== '.' && part !== '..'));
    const bytes = read(name); same(bytes, expected); gitCopiedBytes += bytes.length; assert.ok(gitCopies.size <= 12 && gitCopiedBytes <= 8 * 1024 * 1024);
    const target = path.join(fixture, name); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes, { flag: 'wx' });
  }
  const editorBytes = read('scripts/verify-editor-save-followup.mjs');
  same(editorBytes, { bytes: 8581, sha256: '2e32b4443efc07aa4a7d14a32629e2009ab94671cace973324ca5cd126c1dce8' });
  const editorSource = editorBytes.toString('utf8'), aliasStart = 'const gitClosure=verifyGitDirectoryClosure(repo)', aliasEnd = 'async function bytes(rel)';
  assert.equal(editorSource.split(aliasStart).length, 2); assert.equal(editorSource.split(aliasEnd).length, 2);
  const aliasScript = new vm.Script(editorSource.slice(editorSource.indexOf(aliasStart), editorSource.indexOf(aliasEnd)) + ';editorSaveGitAliasBytes', { filename: 'exact-reviewed-editor-save-alias-control.mjs' });
  const aliasRead = aliasScript.runInNewContext({ repo: fixture, verifyGitDirectoryClosure, path, assert, lstatSync: fs.lstatSync });
  const alias = 'products/rea-studio/results/editor-workspace-search-followup/path-correction/frozen/runs/original-2026-10-13T00-39-34.850Z/synthetic-workspace/.git/hidden.txt.snapshot';
  const payload = read(GIT_CLOSURE + 'payload/d29210777777dac0b3d12f6a656a073c9ba717cf6932dbc01b0cc6dc1e7779b8.snapshot');
  positive('editor-save-absent-alias-and-no-generic-route', () => { assert.ok(aliasRead(alias).equals(payload)); assert.equal(aliasRead(alias + '.unlisted'), null); });
  const shadow = path.join(fixture, alias); fs.mkdirSync(path.dirname(shadow), { recursive: true }); fs.writeFileSync(shadow, payload, { flag: 'wx' });
  try {
    positive('editor-save-exact-optional-shadow', () => { assert.ok(aliasRead(alias).equals(payload)); });
    fs.writeFileSync(shadow, flip(payload));
    negative('editor-save-corrupt-optional-shadow', () => aliasRead(alias), 'mandatory closure identity and exact optional shadow');
    fs.writeFileSync(shadow, payload);
    const linkRead = aliasScript.runInNewContext({ repo: fixture, verifyGitDirectoryClosure, path, assert, lstatSync(name) { return name === path.dirname(shadow) ? { isSymbolicLink: () => true } : fs.lstatSync(name); } });
    negative('editor-save-reported-shadow-link', () => linkRead(alias), 'exact child reader refuses Node-reported link before physical read (in-memory metadata injection)');
  } finally { fs.unlinkSync(shadow); }

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
  positive('historical937-exact-block-positive', () => { const result = historical937(); assert.equal(result.rows, 737); assert.equal(result.routed, 8); assert.equal(result.unchanged, 729); });
  negative('historical937-frozen-source-byte-change', () => historical937({ changed: OLD + 'source/apps/archive/app.test.mjs.snapshot' }), 'exact reviewed937 block: frozen source hash');
  negative('historical937-unchanged-current-byte-change', () => historical937({ changed: 'products/rea-studio/apps/archive/app.test.mjs' }), 'exact reviewed937 block: current source hash');
  negative('historical937-receipt-byte-change', () => historical937({ changed: 'products/rea-studio/results/development-validation.json' }), 'exact immutable937 receipt hash');
  negative('historical937-unlisted-resolver-route', () => historical937({ resolver: { resolve(name, expected) { return name === 'products/rea-studio/apps/archive/app.test.mjs' ? OLD + 'source/apps/archive/app.test.mjs.snapshot' : migration.resolve(name, expected); } } }), 'exact reviewed937 block: eight-route allowlist');

  // Execute only the exact reviewed WebDAV source-pin loop in an isolated VM.
  // It authenticates immutable historical bytes, never the72 behavioral tests.
  const webdavStart = '  // The immutable72-case receipt', webdavEnd = '  for (const [path, sha256] of Object.entries(webdav.hostDependenciesAtTest))';
  assert.equal(source.split(webdavStart).length, 2); assert.equal(source.split(webdavEnd).length, 2);
  const webdavBlock = new vm.Script(source.slice(source.indexOf(webdavStart), source.indexOf(webdavEnd)), { filename: 'exact-reviewed-historical-webdav-source-control.mjs' });
  function historicalWebDAV(changed = null) {
    const checked = []; webdavBlock.runInNewContext({ assert, sourceProofMigration: migration,
      webdavRoot: 'products/rea-studio/apps/sync/', webdav: JSON.parse(read('products/rea-studio/apps/sync/results/webdav-validation.json')),
      currentFingerprint(entry) { const bytes = read(entry.path); if (entry.bytes !== undefined) assert.equal(bytes.length, entry.bytes); assert.equal(sha(entry.path === changed ? flip(bytes) : bytes), entry.sha256); checked.push(entry.path); },
    }, { timeout: 120000 }); return checked;
  }
  positive('historical-webdav-exact-source-loop-positive', () => { const checked = historicalWebDAV(); assert.ok(checked.includes(WINDOWS_PATH + 'before/products/rea-studio/apps/sync/dav-transfer.mjs.snapshot')); assert.equal(checked.includes('products/rea-studio/apps/sync/dav-transfer.mjs'), false); });
  negative('historical-webdav-transfer-before-byte-change', () => historicalWebDAV(WINDOWS_PATH + 'before/products/rea-studio/apps/sync/dav-transfer.mjs.snapshot'), 'exact reviewed WebDAV source loop: preserved historical transfer identity');
  negative('historical-webdav-unchanged-source-byte-change', () => historicalWebDAV('products/rea-studio/apps/sync/webdav.mjs'), 'exact reviewed WebDAV source loop: unchanged current source identity');
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
  const { createHistoricalCarrierPolicy } = await import(pathToFileURL(path.join(root, 'scripts/historical-carrier-policy.mjs')).href);
  let historicalCarrierPolicy;
  positive('eleven-fixed-historical-carrier-exceptions', () => { historicalCarrierPolicy = createHistoricalCarrierPolicy(read); const summary = historicalCarrierPolicy.summary(); assert.equal(summary.exactHistoricalCarrierExceptions, 11); assert.equal(summary.genericDirectoryException, false); assert.equal(summary.auditCoverageComplete, false); });
  const carrierDeclaration = JSON.parse(read('products/rea-studio/results/historical-carrier-delivery-20261015/preservation-manifest.json'));
  const carrier = carrierDeclaration.exceptions[0];
  positive('unlisted-historical-carrier-path-refused', () => { assert.equal(historicalCarrierPolicy.allows({ ...carrier, path: carrier.path + '.unlisted' }), false); });
  negative('historical-carrier-wrong-declared-identity', () => historicalCarrierPolicy.allows({ ...carrier, sha256: '0'.repeat(64) }), 'exact eleven-row declared byte/SHA table');
  negative('historical-carrier-mandatory-payload-corruption', () => createHistoricalCarrierPolicy(p => p === carrier.path ? flip(read(p)) : read(p)), 'mandatory fixed carrier byte/SHA identity');
  negative('historical-carrier-original-manifest-corruption', () => createHistoricalCarrierPolicy(p => p === carrier.declaringManifest ? flip(read(p)) : read(p)), 'original declaring manifest byte/SHA identity; deeper semantic branches not claimed exercised');
  negative('historical-carrier-closure-authority-corruption', () => createHistoricalCarrierPolicy(p => p === 'products/rea-studio/results/historical-carrier-delivery-20261015/preservation-manifest.json' ? flip(read(p)) : read(p)), 'fixed closure authority identity; no generic fallback');
  const groupEditDoc = 'products/rea-studio/apps/vault/GROUP-EDIT.md';
  const groupEditDocBefore = {"bytes":7847,"sha256":"a06a163ce96424fb4e5923b29c4acfdc9e9c7e2fa780f07e4751dad3fc30b8c4"}, groupEditDocAfter = {"bytes":7861,"sha256":"05c2d2989f154e312228062b40aba90ab610960fd51ab1eaa65144ecdc77abf9"};
  positive('group-edit-document-exact-before-after-identities', () => { const scope = migration.summary(); assert.equal(scope.groupEditDocumentCurrentSourceMandatory, 1); assert.equal(scope.groupEditDocumentHistoricalRoute, 1); assert.equal(migration.resolve(groupEditDoc, groupEditDocAfter), null); assert.equal(migration.resolve(groupEditDoc, groupEditDocBefore), 'products/rea-studio/results/vault-group-edit-document-route-20261015/before/products/rea-studio/apps/vault/GROUP-EDIT.md.snapshot'); same(read(groupEditDoc), groupEditDocAfter); });
  negative('group-edit-document-unlisted-identity', () => migration.resolve(groupEditDoc, { bytes: 1, sha256: '0'.repeat(64) }), 'one exact GROUP-EDIT document before and after identity');
  negative('group-edit-document-missing-identity', () => migration.resolve(groupEditDoc), 'explicit expected identity is mandatory for the named document');
  negative('group-edit-document-mandatory-current-byte-change', () => createEditorVaultProofMigration(name => name === groupEditDoc ? flip(read(name)) : read(name)), 'new current document remains mandatory while immutable next.sources reads exact preserved before');

  // Exercise only the actual pinned root requirement source-read loop. These
  // controls execute publication assertions in a closed VM, never app/test code.
  const requirementStart = '    for (const entry of localEvidence) {', requirementEnd = '\n    for (const row of rows) { assert.ok(!capabilityIds.has(row.id),';
  assert.equal(source.split(requirementStart).length, 2); assert.equal(source.split(requirementEnd).length, 2);
  const safeRecordLine = source.split('\n').filter(line => line.startsWith('function safeRecordPath(path) ')); assert.equal(safeRecordLine.length, 1);
  const requirementScript = new vm.Script(safeRecordLine[0] + '\n' + source.slice(source.indexOf(requirementStart), source.indexOf(requirementEnd)), { filename: 'exact-reviewed-requirement-source-read-control.mjs' });
  const requirementEntries = [];
  for (const file of ['workspace-products.json', 'visual-products.json', 'system-products.json']) {
    const registry = JSON.parse(read('products/rea-studio/requirements/' + file));
    requirementEntries.push(...(file === 'workspace-products.json' ? registry.localImplementationEvidence : file === 'visual-products.json' ? registry.baselineProducts.flatMap(product => product.implementationFiles ?? []) : registry.products.flatMap(product => product.local_implementation_evidence ?? [])));
  }
  assert.equal(requirementEntries.length, 251);
  const requirementEditor = requirementEntries.find(entry => entry.path === 'products/rea-studio/apps/editor/git.test.mjs');
  const requirementUnchanged = requirementEntries.find(entry => entry.path === 'products/rea-studio/apps/editor/app.test.mjs'); assert(requirementEditor && requirementUnchanged);
  assert.equal(requirementEditor.bytes, 11458); assert.equal(requirementEditor.sha256, 'ab8213c182d1568254ea73db57133affbd48304b98f0d275d27c1fcf8b33f0cc');
  function requirementEvidence({ entries = requirementEntries, changed = null } = {}) {
    const reads = []; requirementScript.runInNewContext({ root, localEvidence: structuredClone(entries), assert, join: path.join, sha, sourceProofMigration: migration,
      readFileSync(filename) { const name = path.relative(root, filename).split(path.sep).join('/'); reads.push(name); const bytes = read(name); return name === changed ? flip(bytes) : bytes; },
    }, { timeout: 120000 }); return reads;
  }
  positive('requirement-evidence-actual-loop-all-declared-rows', () => { assert.equal(requirementEvidence().length, 251); });
  positive('requirement-evidence-known-editor-historical-before', () => { assert.deepEqual(requirementEvidence({ entries: [requirementEditor] }), [WINDOWS_PATH + 'before/products/rea-studio/apps/editor/git.test.mjs.snapshot']); });
  positive('requirement-evidence-unlisted-path-remains-current', () => { assert.deepEqual(requirementEvidence({ entries: [requirementUnchanged] }), [requirementUnchanged.path]); });
  negative('requirement-evidence-historical-byte-corruption', () => requirementEvidence({ entries: [requirementEditor], changed: WINDOWS_PATH + 'before/products/rea-studio/apps/editor/git.test.mjs.snapshot' }), 'actual pinned root read site requires the exact historical SHA and size after routing');
  negative('requirement-evidence-unknown-named-SHA', () => requirementEvidence({ entries: [{ ...requirementEditor, sha256: '0'.repeat(64) }] }), 'actual pinned requirement read site calls the existing closed migration resolver');
  negative('requirement-evidence-unknown-named-size', () => requirementEvidence({ entries: [{ ...requirementEditor, bytes: requirementEditor.bytes + 1 }] }), 'named historical identity includes its exact byte count');
  negative('requirement-evidence-unchanged-current-byte-corruption', () => requirementEvidence({ entries: [requirementUnchanged], changed: requirementUnchanged.path }), 'unlisted paths remain direct current reads with unchanged SHA assertion');
  negative('requirement-evidence-unchanged-current-size-declaration', () => requirementEvidence({ entries: [{ ...requirementUnchanged, bytes: requirementUnchanged.bytes + 1 }] }), 'the optional size assertion is preserved for direct current reads');
  negative('requirement-evidence-unsafe-record-path', () => requirementEvidence({ entries: [{ ...requirementUnchanged, path: '../unlisted' }] }), 'the actual pinned root safeRecordPath rejects traversal before any read');
  for (const target of ["products/rea-studio/results/requirement-evidence-provenance-20261015/preservation-manifest.json","products/rea-studio/results/requirement-evidence-provenance-20261015/verifier-before/verify-records.mjs.snapshot","products/rea-studio/results/requirement-evidence-provenance-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot"]) negative('requirement-provenance-mandatory-byte-corruption:' + target, () => createEditorVaultProofMigration(name => name === target ? flip(read(name)) : read(name)), 'new fixed requirement provenance closure identity; historical receipts and registries remain unchanged');
  assert.equal(rows.length, 92); assert.ok(rows.every(row => row.passed));
  return { schema: 'rea-cloud-publication-controls/v1', status: 'passed', sourceOnly: true, rows, checks: rows.length,
    exactReviewed937Block: ROOT_ID, fixtureFiles: copies.size, fixtureBytes: copiedBytes, gitAliasFixtureFiles: gitCopies.size, gitAliasFixtureBytes: gitCopiedBytes,
    actualCheckoutFilesMutated: 0, applicationTests: 0, originalExecutions: 0,
    limits: ['Finite manifest/attempt mutations are rejected at their immutable identity layer; deeper semantic branches are not separately bypassed or claimed tested.', 'The937 block executes only publication assertions/readers in a bounded VM; it does not execute the historical937 behavioral tests.'] };
}
