// Hosted source/record controls only. No application tests or original code.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import nativeVm from 'node:vm';
import { assertNotes41AwareProofMigration, createNotes41AwareProofMigration, createNotes41AwareProofMigrationFromRoot, createNotes41PublicationSourceViewFromRoot, createNotes41PublicationSourceView, notes41PublicationTransitionPin, verifyNotes41PublicationArtifactRoles, verifyNotes41PublicationHelperRow, createNotes41Historical937VmFacade, createNotes41Historical937ReadContext, projectNotes41CurrentSketchRepeat } from './notes41-publication-source-view.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = bytes => ({ bytes: bytes.length, sha256: sha(bytes) });
const ROOT_ID = { bytes: 149123, sha256: 'b5d48417f94e9464c071610ffc2720451cebae126b94b674e67c8f6fe16967d8' };
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
  const actualRead = name => fs.readFileSync(path.join(root, name));
  const notes41Initial = createNotes41AwareProofMigrationFromRoot(root), notes41View = notes41Initial.notes41SourceView;
  const actualLiveNotesPaths = notes41View.plan.currentNotesSources.map(row => row.path);
  const read = name => notes41View.legacyRead(name);
  const vm = createNotes41Historical937VmFacade(nativeVm, root, notes41Initial);
  let migration;
  positive('named-migration-positive', () => { migration = createEditorVaultProofMigration(read); assert.equal(migration.summary().latestInstalledSourcesMandatory, 35); });
  const notesIndexPath='products/rea-studio/apps/notes/results/todo-followup/publication-index.json';
  const notesIndex=JSON.parse(read(notesIndexPath)),notesSources=notesIndex.currentTargets;
  const notes36HistoricalAfterRoutes=JSON.parse(read('products/rea-studio/results/notes36-source-transition-20261016/current-source-declaration.json')).installedTargets.filter(row=>row.before);
  positive('notes-eight-current-three-before-and-historical-metadata',()=>{const s=migration.summary();assert.equal(s.notesCurrentSourcesMandatory,12);assert.equal(s.notesHistorical32SourcePlanMandatoryTargets,8);assert.equal(s.notesHistoricalReplacementRoutes,3);assert.equal(s.notesHistorical937RuntimeRoutes,2);assert.equal(s.notesHistoricalFiniteGroups,92);assert.equal(s.notesHistoricalOriginalHelperComparisons,20);assert.equal(s.notesHistoricalBrowserCases,8);assert.equal(s.notesAuthenticatedFiles,52);assert.equal(s.notesFixedReadFileLimit,64);assert.equal(s.notesFreshInstalledBehavioralAcceptance,false);for(const r of notesSources){const newer=notes36HistoricalAfterRoutes.find(row=>row.path===r.path);assert.equal(migration.resolve(r.path,r.after),newer?newer.beforeImage.path:null);if(r.before)assert.equal(migration.resolve(r.path,r.before),r.beforeImage);}});
  for(const r of notesSources)negative('notes-mandatory-current:'+path.posix.basename(r.path),()=>createEditorVaultProofMigration(p=>p===r.path?flip(read(p)):read(p)),'fixed current Notes afterimage');
  for(const r of notesSources.filter(r=>r.before))negative('notes-mandatory-before:'+path.posix.basename(r.path),()=>createEditorVaultProofMigration(p=>p===r.beforeImage?flip(read(p)):read(p)),'fixed Notes historical beforeimage');
  for(const r of notesSources)negative('notes-mandatory-after-alias:'+path.posix.basename(r.path),()=>createEditorVaultProofMigration(p=>p===r.afterImage?flip(read(p)):read(p)),'fixed Notes afterimage alias');
  for(const r of notesSources)negative('notes-unknown-epoch:'+path.posix.basename(r.path),()=>migration.resolve(r.path,{bytes:1,sha256:'0'.repeat(64)}),'exact named Notes resolver');
  for(const r of notesSources)negative('notes-missing-identity:'+path.posix.basename(r.path),()=>migration.resolve(r.path),'mandatory explicit Notes identity');
  for(const p of [notesIndexPath,'products/rea-studio/results/notes-todo-source-transition-20261016/preservation-manifest.json'])negative('notes-declaration-byte-change:'+path.posix.basename(p),()=>createEditorVaultProofMigration(n=>n===p?flip(read(n)):read(n)),'immutable closed Notes declaration identity');
  for(const[p,label]of [["products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/36f83a2bdc7b7b4ada8430da0428052d513eae4891c716a87d3ae344d34e0166.snapshot","finite92"],["products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/dc7f8c101111836973a84a8f5ca76de2d1a4315b30b5cd457ada0faef8e46751.snapshot","browser8"]])negative('notes-historical-attempt-byte-change:'+label,()=>createEditorVaultProofMigration(n=>n===p?flip(read(n)):read(n)),'immutable selected historical attempt identity; no deeper branch bypass claimed');
  positive('notes-exact-reader-intermediate-epochs',()=>{for(const r of [{"reader":"scripts/verify-records.mjs","path":"products/rea-studio/results/notes-todo-source-transition-20261016/verifier-before/verify-records.mjs.snapshot","bytes":149064,"sha256":"3878efc73e671246305e4368f7d3c52f288473591a4fe1697b343ab70249ae1e"},{"reader":"scripts/editor-vault-proof-migration.mjs","path":"products/rea-studio/results/notes-todo-source-transition-20261016/verifier-before/editor-vault-proof-migration.mjs.snapshot","bytes":107538,"sha256":"8e5a048dba78b58faeed3455cc19f60981f5a6320babd60cf837120b54aef1d8"},{"reader":"scripts/verify-followup-records.mjs","path":"products/rea-studio/results/notes-todo-source-transition-20261016/verifier-before/verify-followup-records.mjs.snapshot","bytes":45876,"sha256":"856eeba61b820260f7e1bdc8d9bb9e8924e3ae3183a0c3c0495471e6152a8b5f"}]){if(r.reader.endsWith('editor-vault-proof-migration.mjs'))continue;assert.equal(migration.resolve(r.reader,{bytes:r.bytes,sha256:r.sha256}),r.path);}});
  for(const p of ['scripts/verify-records.mjs','scripts/verify-followup-records.mjs'])negative('notes-unlisted-reader-epoch:'+path.posix.basename(p),()=>migration.resolve(p,{bytes:1,sha256:'0'.repeat(64)}),'all prior verifier epochs remain explicitly named');
  positive('notes-three-unchanged-requirement-identities',()=>{const req=JSON.parse(read('products/rea-studio/requirements/workspace-products.json'));const rows=req.localImplementationEvidence.filter(r=>notesSources.some(n=>n.path===r.path));assert.equal(rows.length,3);for(const r of rows){const n=notesSources.find(n=>n.path===r.path);assert.deepEqual({bytes:r.bytes,sha256:r.sha256},n.before);assert.equal(migration.resolve(r.path,r),n.beforeImage);}});
  const archiveIndexPath = 'products/rea-studio/apps/archive/results/aes-followup/publication-index.json';
  const archiveIndexBytes = read(archiveIndexPath); same(archiveIndexBytes, { bytes: 31564, sha256: 'cb1547b75fa9039f21b71ab40952c8b348c4253e47f9df3272e799375d8ab7dc' });
  const archiveIndex = JSON.parse(archiveIndexBytes), archiveSources = archiveIndex.currentTargets;
  const fixtureCorrection={"manifest":{"path":"products/rea-studio/results/archive-aes-properties-fixture-correction-20261016/source-transition.json","bytes":2486,"sha256":"c076b092431eae7bc3c468d168633ee07aa7858aba1291d510edcaa1ded4919f"},"declaration":{"schema":"rea-archive-aes-single-test-source-correction/v1","sourceOnly":true,"currentTarget":"products/rea-studio/apps/archive/sevenzip-aes-bounds.test.mjs","before":{"bytes":4437,"sha256":"de8b502980907967bab762da46e6056b024dc93a5ddd5b1bd5e21610e6980c71"},"after":{"bytes":5255,"sha256":"1bdeed45439ab2094c55973d0790866991ed3f81ab5eca505d01977dee84b303"},"beforeImage":{"path":"products/rea-studio/results/archive-aes-properties-fixture-correction-20261016/source-before/sevenzip-aes-bounds.test.mjs.snapshot","bytes":4437,"sha256":"de8b502980907967bab762da46e6056b024dc93a5ddd5b1bd5e21610e6980c71"},"afterImage":{"path":"products/rea-studio/results/archive-aes-properties-fixture-correction-20261016/source-after/sevenzip-aes-bounds.test.mjs.snapshot","bytes":5255,"sha256":"1bdeed45439ab2094c55973d0790866991ed3f81ab5eca505d01977dee84b303"},"historicalAfterImage":"products/rea-studio/experiments/archive-aes/snapshots/proposal/products/rea-studio/apps/archive/sevenzip-aes-bounds.test.mjs.snapshot","originalDecoder":{"path":"products/rea-studio/experiments/archive-aes/selected-original-source/official-source/full-source/CPP/7zip/Crypto/7zAes.cpp.snapshot","bytes":7244,"sha256":"d1d45ef7740bb3dadb39dfeb07834d7261b8ec7ad9e01ccdab521e08a5a011c8"},"currentArchiveFiles":62,"currentTargetCount":21,"changedTargetCount":1,"unchangedTargets":20,"topLevelTestGroupsBefore":3,"topLevelTestGroupsAfter":3,"historicalFiniteGroups":161,"historicalFiniteSelectionContainsBoundsTestPath":true,"historicalFiniteBoundsContentIsPredecessor":true,"freshFiniteIncludesCorrectedBoundsGroups":3,"targeted3OverlapFiniteSelection":true,"propertiesRejectionAssertionPreserved":true,"deterministicCounterexamples":[{"firstSaltByte":239,"droppedLeadingBytes":33,"cyclesPower":63,"saltBytes":15,"encodedIvBytes":16},{"firstSaltByte":254,"droppedLeadingBytes":33,"cyclesPower":63,"saltBytes":16,"encodedIvBytes":15}],"runtimeChanged":false,"historicalBundleRewritten":false,"historicalFiniteReceiptRewritten":false,"historicalInstallationJournalRewritten":false,"genericHistoricalFallback":false,"currentBehavioralAcceptanceEstablished":false,"localProductExecutions":0,"localTests":0}};
  const { verifyArchiveIntegrationRecords } = await import(pathToFileURL(path.join(root, 'scripts/verify-archive-integration-records.mjs')).href);
  positive('archive-fixed21-after-and-six-before-routes', () => {
    const scope = migration.summary(); assert.equal(scope.archiveCurrentSourcesMandatory, 21); assert.equal(scope.archiveHistoricalReplacementRoutes, 6); assert.equal(scope.currentInstalledSourcesMandatory, 85);
    assert.equal(scope.archiveSelectedReleasedSourceFiles, 22); assert.equal(scope.archiveFiniteExperimentalGroups, 161); assert.equal(scope.archiveFiniteSelectedMetadataOnly, true); assert.equal(scope.archiveInstallationReceiptAuthenticated, false);
    assert.equal(archiveSources.length, 21); assert.equal(archiveSources.filter(row => row.before).length, 6);
    for (const row of archiveSources) { assert.equal(migration.resolve(row.path, row.after), row.path===fixtureCorrection.declaration.currentTarget?fixtureCorrection.declaration.historicalAfterImage:null); if (row.before) assert.equal(migration.resolve(row.path, row.before), row.beforeImage); }
  });
  positive('archive-corrected-test-two-exact-epochs',()=>{const c=fixtureCorrection.declaration;assert.equal(migration.resolve(c.currentTarget,c.after),null);assert.equal(migration.resolve(c.currentTarget,c.before),c.historicalAfterImage);assert.equal(migration.summary().archiveSingleTestCorrectionMandatory,1);assert.equal(migration.summary().archiveCorrectedTestHistoricalAfterRoute,1);});
  negative('archive-corrected-test-unlisted-SHA',()=>migration.resolve(fixtureCorrection.declaration.currentTarget,{...fixtureCorrection.declaration.after,sha256:'0'.repeat(64)}),'only exact old and corrected test identities');
  negative('archive-corrected-test-unlisted-size',()=>migration.resolve(fixtureCorrection.declaration.currentTarget,{...fixtureCorrection.declaration.after,bytes:fixtureCorrection.declaration.after.bytes+1}),'corrected test identity includes exact size');
  negative('archive-corrected-test-missing-identity',()=>migration.resolve(fixtureCorrection.declaration.currentTarget),'explicit identity required for corrected test');
  for(const[name,target]of [['manifest',fixtureCorrection.manifest.path],['before',fixtureCorrection.declaration.beforeImage.path],['after',fixtureCorrection.declaration.afterImage.path],['old-after-alias',fixtureCorrection.declaration.historicalAfterImage]])negative('archive-corrected-test-mandatory-'+name,()=>createEditorVaultProofMigration(file=>file===target?flip(read(file)):read(file)),'single-test correction retains current, both snapshots and original historical alias identities');
  for (const row of archiveSources.filter(row => row.before)) negative('archive-unknown-epoch-' + path.posix.basename(row.path), () => migration.resolve(row.path, { bytes: 1, sha256: '0'.repeat(64) }), 'fixed Archive identity resolver');
  negative('archive-unknown-added-source-epoch', () => migration.resolve('products/rea-studio/apps/archive/source-metadata.mjs', { bytes: 1, sha256: '0'.repeat(64) }), 'fixed Archive addition identity resolver');
  for (const name of ['client.mjs', 'source-metadata.mjs', 'NOTICE-SOURCE-METADATA.txt']) negative('archive-missing-expected-identity-' + name, () => migration.resolve('products/rea-studio/apps/archive/' + name), 'explicit identity required for every fixed Archive target');
  for (const row of archiveSources) negative('archive-mandatory-current-' + path.posix.basename(row.path), () => createEditorVaultProofMigration(name => name === row.path ? flip(read(name)) : read(name)), 'fixed mandatory current21 after-image');
  for (const row of archiveSources.filter(row => row.before)) negative('archive-mandatory-before-' + path.posix.basename(row.path), () => createEditorVaultProofMigration(name => name === row.beforeImage ? flip(read(name)) : read(name)), 'fixed six historical Archive before-images');
  for (const [name, target] of [
    ['archive-mandatory-index', archiveIndexPath],
    ['archive-mandatory-transition-manifest', 'products/rea-studio/results/archive-aes-source-transition-20261015/preservation-manifest.json'],
    ['archive-mandatory-unchanged-bundle', 'products/rea-studio/experiments/archive-aes/bundle.json'],
    ['archive-mandatory-new-integrity-reader', 'scripts/verify-archive-integration-records.mjs'],
  ]) negative(name, () => createEditorVaultProofMigration(file => file === target ? flip(read(file)) : read(file)), 'fixed Archive source authority identity');
  const finite161 = archiveIndex.recordedFiniteEvidence;
  for (const [name, target] of [
    ['archive-finite161-manifest-byte-change', finite161.manifest.path],
    ['archive-finite161-attempt-byte-change', finite161.selected.find(row => row.sourcePath === 'verification/attempt-validation.json').path],
    ['archive-finite161-before-inventory-byte-change', finite161.selected.find(row => row.sourcePath === 'verification/source-before.json').path],
  ]) negative(name, () => createEditorVaultProofMigration(file => file === target ? flip(read(file)) : read(file)), 'immutable selected finite161 identity; deeper semantic rejection is not separately bypassed or claimed');
  positive('archive-historical-lzma124-integrity-reader', () => { const checked = verifyArchiveIntegrationRecords(root); assert.equal(checked.fingerprints, 124); assert.equal(checked.historical_focused_archive_tests, 169); assert.equal(checked.exactHistoricalReplacementRoutes, 6); assert.equal(checked.archiveCurrentSourcesMandatory, 21); assert.equal(checked.behavioralTestsExecuted, 0); });

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
  positive('seven-fixed-root-epochs', () => {
    assert.equal(migration.resolve('scripts/verify-records.mjs', ROOT_ID), null);
    assert.equal(migration.resolve('scripts/verify-records.mjs', {"bytes":148688,"sha256":"cd524543c7b6c9bf2050194994667e3e805165a934da209957ecbb5559d211c4"}), 'products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/verify-records-requirement-evidence-provenance.mjs.snapshot');
    assert.equal(migration.resolve('scripts/verify-records.mjs', { bytes: 148558, sha256: 'a78a9467ecd76ae44c3d2413b6d341c735bb1f98a657646d3b00a13dccf066f8' }), 'products/rea-studio/results/requirement-evidence-provenance-20261015/verifier-before/verify-records.mjs.snapshot');
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
  positive('four-fixed-followup-verifier-epochs', () => {
    assert.equal(migration.resolve('scripts/verify-followup-records.mjs', { bytes: 46118, sha256: '4129e5ea25fca6b91804a6ee1ab12a3b0f7a9efa8f0e9bf8c766738a2e4ed019' }), null);
    assert.equal(migration.resolve('scripts/verify-followup-records.mjs', { bytes: 45876, sha256: '856eeba61b820260f7e1bdc8d9bb9e8924e3ae3183a0c3c0495471e6152a8b5f' }), 'products/rea-studio/results/notes-todo-source-transition-20261016/verifier-before/verify-followup-records.mjs.snapshot');
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
  positive('historical937-exact-block-positive', () => { const result = historical937(); assert.equal(result.rows, 737); assert.equal(result.routed, 13); assert.equal(result.unchanged, 724); });
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
  // Execute only the exact producer projection, using the actual preserved failing
  // attempt outputs. No publication producer or application entry point is run here.
  const repeatProducerBytes = read('scripts/verify-cloud-publication.mjs'); same(repeatProducerBytes, {"bytes":79976,"sha256":"7093aac7045aaea5fc31c1354ff222f530d32c1c0bd42ba6860d01ef1a083128"});
  const repeatProducer = repeatProducerBytes.toString('utf8');
  const repeatStart = '// BEGIN exact publication repeat projection (only three owned observation clocks).', repeatEnd = '// END exact publication repeat projection.';
  assert.equal(repeatProducer.split(repeatStart).length, 2); assert.equal(repeatProducer.split(repeatEnd).length, 2);
  const repeatScript = new vm.Script(repeatProducer.slice(repeatProducer.indexOf(repeatStart), repeatProducer.indexOf(repeatEnd)) + '\npublicationRepeatProjection(value, phase)', { filename: 'exact-reviewed-publication-repeat-clock-control.mjs' });
  const repeatProject = (value, phase) => repeatScript.runInNewContext({ assert, Date, structuredClone, value, phase }, { timeout: 1000 });
  const repeatPrefix = 'products/rea-studio/results/publication-repeat-clock-correction-20261016/failed-run/';
  function repeatInput(filename, expected) { const bytes = read(repeatPrefix + filename + '.snapshot'); same(bytes, expected); return bytes; }
  const repeatAttempt = JSON.parse(repeatInput('attempt-validation.json', {"bytes":3968,"sha256":"2d2597991ef5063f7fb3ec46f35e41824189778155d124a1531b34b01e50d224"}));
  const repeatFirst = JSON.parse(repeatInput('publication-write.stdout.txt', {"bytes":30263,"sha256":"862a17818dfd53d4f28ad2c319e29add8b99e93194e4fe885712ad19fe9c9c4d"}).toString('utf8').trim().split(/\r?\n/).at(-1));
  const repeatSecond = JSON.parse(repeatInput('publication-recheck.stdout.txt', {"bytes":30263,"sha256":"1305e558844934ad70aeea8b9902bf3b52d218f4ec9eaaa90bb54e7ae468ffdc"}).toString('utf8').trim().split(/\r?\n/).at(-1));
  assert.equal(repeatAttempt.status, 'failed'); assert.equal(repeatAttempt.generatedManifestValidated, false); assert.equal(repeatAttempt.controls.checks, 92);
  function repeatCompare(first = repeatFirst, second = repeatSecond, phases = repeatAttempt.phases) {
    const a = repeatProject(first, phases[0]), b = repeatProject(second, phases[1]);
    assert.ok(Date.parse(phases[0].completedAtUtc) <= Date.parse(phases[1].startedAtUtc)); assert.deepEqual(b.stable, a.stable); return [a, b];
  }
  positive('publication-repeat-actual-preserved-clock-only-difference', () => { const firstRaw = JSON.stringify(repeatFirst), secondRaw = JSON.stringify(repeatSecond); const [a,b] = repeatCompare(); assert.notEqual(a.clocks.sketchStarted, b.clocks.sketchStarted); assert.notEqual(a.clocks.sketchFinished, b.clocks.sketchFinished); assert.equal(JSON.stringify(repeatFirst), firstRaw); assert.equal(JSON.stringify(repeatSecond), secondRaw); });
  for (const [name, change] of [
    ['identity-change', value => { value.followup_evidence.notesLayoutValueApiCheckpoint.sketch.identities.reviewManifest = '0'.repeat(64); }],
    ['source-count-change', value => { value.followup_evidence.notesLayoutValueApiCheckpoint.sketch.current10Mandatory++; }],
    ['unrelated-top-field', value => { value.payload_files++; }],
    ['unlisted-nested-clock', value => { value.followup_evidence.notesLayoutValueApiCheckpoint.sketch.unlistedStarted = value.checked_at_utc; }],
    ['out-of-scope-same-named-clock', value => { value.followup_evidence.notesLayoutValueApiCheckpoint.editorValueApi.started = value.checked_at_utc; }],
    ['wrong-schema', value => { value.followup_evidence.notesLayoutValueApiCheckpoint.sketch.schema = 'unlisted/v1'; }],
    ['false-source-only', value => { value.followup_evidence.notesLayoutValueApiCheckpoint.sketch.sourceOnly = false; }],
    ['missing-start', value => { delete value.followup_evidence.notesLayoutValueApiCheckpoint.sketch.started; }],
    ['non-utc-clock', value => { value.followup_evidence.notesLayoutValueApiCheckpoint.sketch.started = '2026-10-16T00:13:18.134+00:00'; }],
    ['invalid-calendar-clock', value => { value.followup_evidence.notesLayoutValueApiCheckpoint.sketch.started = '2026-02-30T00:13:18.134Z'; }],
    ['reversed-observation-clocks', value => { const sketch = value.followup_evidence.notesLayoutValueApiCheckpoint.sketch; [sketch.started, sketch.finished] = [sketch.finished, sketch.started]; }],
    ['before-own-phase', value => { value.followup_evidence.notesLayoutValueApiCheckpoint.sketch.started = repeatAttempt.phases[0].startedAtUtc; }],
    ['after-own-phase', value => { value.checked_at_utc = '2026-10-16T00:14:16.540Z'; }],
    ['root-check-before-proof-finishes', value => { value.checked_at_utc = value.followup_evidence.notesLayoutValueApiCheckpoint.sketch.started; }],
  ]) negative('publication-repeat-reject:' + name, () => { const changed = structuredClone(repeatSecond); change(changed); repeatCompare(repeatFirst, changed); }, 'exact producer projection requires bounded named clocks and deep equality for every remaining field');
  negative('publication-repeat-reject:first-phase-clock-corruption', () => { const changed = structuredClone(repeatFirst); changed.followup_evidence.notesLayoutValueApiCheckpoint.sketch.finished = '2026-10-16T00:14:16.540Z'; repeatCompare(changed); }, 'both raw observations are independently bounded');
  negative('publication-repeat-reject:overlapping-owned-phases', () => { const phases = structuredClone(repeatAttempt.phases); phases[0].completedAtUtc = new Date(Date.parse(phases[1].startedAtUtc) + 1).toISOString(); repeatCompare(repeatFirst, repeatSecond, phases); }, 'phase intervals must be ordered and nonoverlapping');
  negative('publication-repeat-reject:reversed-owned-phase', () => { const phases = structuredClone(repeatAttempt.phases); [phases[1].startedAtUtc, phases[1].completedAtUtc] = [phases[1].completedAtUtc, phases[1].startedAtUtc]; repeatCompare(repeatFirst, repeatSecond, phases); }, 'owned phase timestamps must themselves be valid and ordered');
  // New source-epoch controls are additional to all208 retained old controls.
  const notes36PlanPath='products/rea-studio/results/notes36-source-transition-20261016/current-source-declaration.json',notes36Plan=JSON.parse(read(notes36PlanPath));
  positive('notes36-current-proof-and-historical52-scopes',()=>{const s=migration.summary();assert.equal(s.notes36NamedCurrentSourcePinsOnly,true);assert.equal(s.notes36LiveDirectoryClosureEstablishedByModule,false);assert.equal(s.notes36LiveDirectoryClosureRequiresInstalledHelper,true);assert.equal(s.notes36Common85IsSeparateLegacyGroup,true);assert.equal(s.notes36CurrentSourcesMandatory,36);assert.equal(s.notes36EligibleCurrentSourcesMandatory,34);assert.equal(s.notes36InstalledTargetsMandatory,7);assert.equal(s.notes36CurrentTargetUnion,12);assert.equal(s.notesHistorical32SourcePlanMandatoryTargets,8);assert.equal(s.notes36CurrentReadObjects,60);assert.equal(s.notes36CurrentReadBytes,695900);assert.equal(s.notes36FixedReadFileLimit,64);assert.equal(s.notes36Historical32SourceProjections,3);assert.equal(s.notes36Historical52LogicalObjects,52);assert.equal(s.notes36Historical52PhysicalObjects,52);assert.equal(s.notes36FreshInstalledBehaviorAccepted,false);});
  positive('notes36-exact-current32-and-older-route-identities',()=>{for(const row of notes36Plan.installedTargets){assert.equal(migration.resolve(row.path,row.after),null);if(row.before){assert.equal(migration.resolve(row.path,row.before),row.beforeImage.path);const older=notesSources.find(old=>old.path===row.path);assert(older&&older.before);assert.equal(migration.resolve(row.path,older.before),older.beforeImage);}}});
  positive('notes36-independent-common-archive-and-notes-budgets',()=>{const s=migration.summary();assert.equal(s.authenticatedFiles,159);assert.equal(s.currentInstalledSourcesMandatory,85);assert.equal(s.archiveAuthenticatedFiles,94);assert.equal(s.archiveFixedReadFileLimit,96);assert.equal(s.notesAuthenticatedFiles,52);assert.equal(s.notesFixedReadFileLimit,64);assert.equal(s.notes36CurrentReadObjects,60);assert.equal(s.notes36FixedReadFileLimit,64);});
  for(const row of [{path:notes36PlanPath},...notes36Plan.otherProofRows])negative('notes36-mandatory-proof-byte-change:'+row.path,()=>createEditorVaultProofMigration(p=>p===row.path?flip(read(p)):read(p)),'new fixed60 current-source proof object identity; declaration changes reject at its external fixed pin');
  for(const row of notes36Plan.installedTargets){negative('notes36-unknown-source-epoch:'+row.path,()=>migration.resolve(row.path,{bytes:1,sha256:'0'.repeat(64)}),'exact current36/current32/older-only resolver');negative('notes36-missing-source-identity:'+row.path,()=>migration.resolve(row.path),'mandatory explicit current36 identity');}
  const sourceGateStart='// BEGIN exact Notes36 fixed publication gates.',sourceGateEnd='// END exact Notes36 fixed publication gates.';assert.equal(repeatProducer.split(sourceGateStart).length,2);assert.equal(repeatProducer.split(sourceGateEnd).length,2);
  const sourceGateBlock=repeatProducer.slice(repeatProducer.indexOf(sourceGateStart),repeatProducer.indexOf(sourceGateEnd));
  const sourceGateScript=new vm.Script("const identity=bytes=>({bytes:bytes.length,sha256:sha(bytes)});\n"+sourceGateBlock+"\noperation==='tooling'?verifyNotes36Tooling(read,requestedJSON===null?NOTES36_TOOLING:JSON.parse(requestedJSON)):verifyNotes36ArtifactRoles(JSON.parse(pathsJSON))",{filename:'exact-reviewed-Notes36-fixed-publication-gates.mjs'});
  const sourceGate=(operation,reader=read,paths=[],requested=null)=>sourceGateScript.runInNewContext({assert,sha:bytes=>identity(bytes).sha256,Buffer,operation,read:reader,pathsJSON:JSON.stringify(paths),requestedJSON:requested===null?null:JSON.stringify(requested)},{timeout:1000});
  const toolingRows={
  "products/rea-studio/scripts/verify-notes36-installed-cloud.mjs": [
    16788,
    "648f28c93ee6f08f93fb6d715e9208f31dd12e8af45097fef01d58161ec2cbe2"
  ],
  "products/rea-studio/results/notes36-source-transition-20261016/current-source-declaration.json": [
    60830,
    "c0a488389094d898a7f6d308e9977192327f194ce3d271135dfcd2007e8a73bb"
  ],
  ".github/workflows/notes-new-todo-installed-cloud.yml": [
    14822,
    "5f495cb9279eceddafb9cfdf0ee9d39fcd6bfaba03bb536a28f4fa68a5520a99"
  ],
  "products/rea-studio/browser-tests/notes-new-todo.spec.mjs": [
    42394,
    "a737d073dc4abc9186995e796fb725e391f005cd3c5197f7d71278edb5c6f2ef"
  ],
  "products/rea-studio/browser-tests/playwright.notes-new-todo.config.mjs": [
    1091,
    "46cd136b644ad1ff8a27aac6f891737af3593f19232c03306f75098d0a1e5caa"
  ],
  "products/rea-studio/browser-tests/notes-new-todo-roster.json": [
    939,
    "9dda31a0246947563baf6a415b1c52fc75de9725ac078ed03b169259e12a5bfa"
  ],
  "products/rea-studio/scripts/verify-cloud-browser.mjs": [
    48600,
    "86dc714b3c9bb14f9a374028ab6df36c5c8e4468a18da5cac0ff83422832b3df"
  ],
  "products/rea-studio/browser-tests/package.json": [
    177,
    "337e56d786191bf1f2cf296fa96082f3d74110bca2f5c5006de2ed5a84f887b7"
  ],
  "products/rea-studio/browser-tests/package-lock.json": [
    1782,
    "9b5ff170a3981c45506aef94e4b5df3f96bf49bbf6ba194acac2a40dd0274bcf"
  ],
  "products/rea-studio/browser-tests/browser-metadata.json": [
    1135,
    "2cfd419f71ac6475d81e1301fa86c34cf2a2a6bae2a0da4b5a2b18310216b6bf"
  ],
  "products/rea-studio/browser-tests/playwright.config.mjs": [
    1110,
    "08f7fbd8c02e2120bc3b4111ba164b2c2da4d93fef0ba065b14b77c3678d0cb3"
  ],
  "products/rea-studio/browser-tests/flow-vault.spec.mjs": [
    26471,
    "dd55dc2c40db400e6181cfa06e6cd4cb0d13cc0683a841b17d03a688971fadab"
  ]
};
  const collectorSelf={
  "path": "products/rea-studio/scripts/verify-notes36-cloud.mjs",
  "bytes": 33324,
  "sha256": "263f47d794e785a0bd818889ce0f125febfda0f100e33f9cb70ae94347f2c7b7"
};
  const artifactPaths=[
  "attempt-validation.json",
  "collector-sources/.github/workflows/publication-integrity-cloud.yml.snapshot",
  "collector-sources/scripts/publication-integrity-controls.mjs.snapshot",
  "collector-sources/scripts/verify-cloud-publication.mjs.snapshot",
  "controls.json",
  "derived/PUBLICATION-MANIFEST.json",
  "derived/VALIDATION.json",
  "events.jsonl",
  "metadata-before/PUBLICATION-MANIFEST.json.snapshot",
  "metadata-before/VALIDATION.json.snapshot",
  "notes-reviewed-sources.json.gz.snapshot",
  "notes36-collector-self/products/rea-studio/scripts/verify-notes36-cloud.mjs.snapshot",
  "notes36-current-sources.json.gz.snapshot",
  "notes36-current-tooling.json.gz.snapshot",
  "publication-recheck.stderr.txt",
  "publication-recheck.stdout.txt",
  "publication-write.stderr.txt",
  "publication-write.stdout.txt",
  "reviewed-sources/products/rea-studio/apps/archive/results/aes-followup/publication-index.json.snapshot",
  "reviewed-sources/products/rea-studio/experiments/archive-aes/bundle.json.snapshot",
  "reviewed-sources/products/rea-studio/results/archive-aes-source-transition-20261015/before/products/rea-studio/apps/archive/LZMA-COMPATIBILITY.md.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/archive-aes-source-transition-20261015/before/products/rea-studio/apps/archive/README.md.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/archive-aes-source-transition-20261015/before/products/rea-studio/apps/archive/SEVENZIP-COMPATIBILITY.md.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/archive-aes-source-transition-20261015/before/products/rea-studio/apps/archive/client.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/archive-aes-source-transition-20261015/before/products/rea-studio/apps/archive/server.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/archive-aes-source-transition-20261015/before/products/rea-studio/apps/archive/sevenzip.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/archive-aes-source-transition-20261015/preservation-manifest.json.snapshot",
  "reviewed-sources/products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/editor-vault-proof-migration-group-edit-document-route.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/editor-vault-proof-migration-historical-carrier-policy.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/editor-vault-proof-migration-requirement-evidence-provenance.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/editor-vault-proof-migration-windows-observer-correction.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/verify-records-historical-carrier-policy.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/verify-records-requirement-evidence-provenance.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/verify-records.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/payload/462e22b9b4dda4f6a3700aa8ebec671863924c6381c7fd1926d0e190bac1025a.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/payload/4fe7b114341199fa31d5553ffb3505db0e3427337ea8c72c637a8d5a3501a042.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/payload/6be0d1c908d5fc78cf574bca48f7d7f2b7e824e708fd9f9281f6cf1fc9b4b3fd.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/payload/7bfc912b2f275c1569a9c1b5b83ed4dde684f79ce97d73ed8655255fa64eaffe.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/payload/d2d167211228cb4eb201fc89aa14013d0da38e396b0a88505ebbc6eadea88fcd.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/payload/d89c78840a1096cf6d89816c8b407a4d5dd1b41f5aebca451d0b2a61b1005d12.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/payload/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/payload/e3ff73273bfaf6ea0724b99f649dc781cc8f48c1f73b145e69f032e519ef1fac.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/preservation-manifest.json.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-publication-source-transition-20261015/preservation-manifest.json.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-publication-source-transition-20261015/verifier-middle/editor-vault-proof-migration.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-publication-source-transition-20261015/verifier-middle/verify-records.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/126e1a9fb2e939ab8a767b6facd723cb823505846711de4114d6c560a6861212.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/41d3a9da24ee7effedbd2af7bc6dd6952a5a59895edc92b5cff7f8a33cba72c0.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/41f2b7950a3fa24d278bd5f6b912bdf221a8f7ee7af8eaa70a5a6201ae2406f2.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/7774bfa56f708adbe35eacebc21385a9eed56175e2df6f67c8fec0350af4b7b0.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/adf03e13193e81997ee515bb0e0c4ea4f790120c35ff5bf351f5a5b19bce4ea1.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/d5b87bec1e71b8ca96821de21fa2d6c7520586cf0cef4cdfa0f28392f5504dca.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/cloud-windows-path-finite-pass-20261015/preservation-manifest.json.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-editor-git-observer-20261015/attempt-validation.json.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-editor-git-observer-20261015/controls.json.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-editor-git-observer-20261015/events.jsonl.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-editor-git-observer-20261015/preservation-manifest.json.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-editor-git-observer-20261015/publication-write.stderr.txt.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-editor-git-observer-20261015/storage-failure.json.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-editor-git-observer-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-editor-git-observer-20261015/workflow-attempt.json.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-editor-git-observer-20261015/workflow-before/publication-integrity-cloud.yml.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-editor-git-observer-20261015/wrapper-job-116702343166.log.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-editor-save-git-closure-20261015/failed-publication-attempt.json.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-editor-save-git-closure-20261015/failed-publication-write.stderr.txt.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-editor-save-git-closure-20261015/passed26-controls.json.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-editor-save-git-closure-20261015/preservation-manifest.json.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-editor-save-git-closure-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-editor-save-git-closure-20261015/verifier-before/verify-editor-save-followup.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-git-directory-closure-20261015/failed-publication-attempt.json.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-git-directory-closure-20261015/failed-publication-write.stderr.txt.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-git-directory-closure-20261015/passed21-controls.json.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-git-directory-closure-20261015/payload/d29210777777dac0b3d12f6a656a073c9ba717cf6932dbc01b0cc6dc1e7779b8.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-git-directory-closure-20261015/preservation-manifest.json.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-git-directory-closure-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/publication-git-directory-closure-20261015/verifier-before/verify-followup-records.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/windows-path-source-transition-20261015/after/products/rea-studio/apps/editor/git.test.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/windows-path-source-transition-20261015/after/products/rea-studio/apps/sync/dav-transfer.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/windows-path-source-transition-20261015/after/products/rea-studio/apps/sync/webdav.windows-path.test.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/windows-path-source-transition-20261015/before/products/rea-studio/apps/editor/git.test.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/windows-path-source-transition-20261015/before/products/rea-studio/apps/sync/dav-transfer.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/windows-path-source-transition-20261015/preservation-manifest.json.snapshot",
  "reviewed-sources/products/rea-studio/results/windows-path-source-transition-20261015/verifier-before/editor-vault-proof-migration-editor-save-closure.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/windows-path-source-transition-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot.snapshot",
  "reviewed-sources/products/rea-studio/results/windows-path-source-transition-20261015/verifier-before/verify-records.mjs.snapshot.snapshot",
  "reviewed-sources/scripts/editor-vault-proof-migration.mjs.snapshot",
  "reviewed-sources/scripts/historical-carrier-policy.mjs.snapshot",
  "reviewed-sources/scripts/verify-archive-integration-records.mjs.snapshot",
  "reviewed-sources/scripts/verify-cloud-recovery-records.mjs.snapshot",
  "reviewed-sources/scripts/verify-editor-save-followup.mjs.snapshot",
  "reviewed-sources/scripts/verify-followup-records.mjs.snapshot",
  "reviewed-sources/scripts/verify-records.mjs.snapshot",
  "workflow-attempt.json"
];
  positive('notes36-exact12-tooling-plus-separate-self-source',()=>{const result=sourceGate('tooling');assert.equal(result.rows.length,12);assert.equal(result.sourceFiles,12);assert.equal(result.fileLimit,12);assert(result.rawSourceBytes<=8*1024*1024);assert.equal(result.collectorSelf.path,collectorSelf.path);assert.equal(result.collectorSelf.bytes,collectorSelf.bytes);assert.equal(result.collectorSelf.sha256,collectorSelf.sha256);});
  for(const row of [...Object.entries(toolingRows).map(([path,[bytes,sha256]])=>({path,bytes,sha256})),collectorSelf])negative('notes36-fixed-tooling-or-self-byte-change:'+row.path,()=>sourceGate('tooling',p=>p===row.path?flip(read(p)):read(p)),'literal fixed12 tooling identity or distinct collector-self pin; no app or producer entry point executes');
  positive('notes36-exact95-publication-artifact-roles',()=>{assert.equal(artifactPaths.length,95);assert.equal(new Set(artifactPaths).size,95);assert.equal(sourceGate('roles',read,artifactPaths),true);});
  for(const[label,paths]of[['missing',artifactPaths.slice(1)],['duplicate',[...artifactPaths,artifactPaths[0]]],['unknown',artifactPaths.map((name,i)=>i===0?'unlisted-role.snapshot':name)],['self-role-replacement',artifactPaths.map(name=>name.startsWith('notes36-collector-self/')?'notes36-collector-self/unlisted.mjs.snapshot':name)]])negative('notes36-artifact-role-census:'+label,()=>sourceGate('roles',read,paths),'closed95 distinct outer role paths under unchanged96 storage cap');
  negative('notes36-extra-fixed-tooling-row',()=>sourceGate('tooling',read,[],{...toolingRows,'unlisted/tooling.mjs':[1,'0'.repeat(64)]}),'exact12 fixed table, not a generic source allowlist');
  const changedTooling=structuredClone(toolingRows),firstTooling=Object.keys(changedTooling)[0];changedTooling[firstTooling][1]='0'.repeat(64);negative('notes36-changed-fixed-tooling-definition',()=>sourceGate('tooling',read,[],changedTooling),'externally fixed literal table identities; no derived expected hash');

  assert.equal(rows.length, 306); assert.ok(rows.every(row => row.passed));
  // All306 previous control bodies and their count assertion remain above.
  // Exact145 mandatory source-data rows plus one separately pinned helper are
  // a new source protocol. Legacy 60/64/256KiB/306/95/96 bounds stay unchanged.
  const retainedControlCount = rows.length, notes41Pin = notes41PublicationTransitionPin();
  const allHistoricalRoutes=[...notes41View.plan.historical36Routes,...notes41View.plan.historicalRecordReaderRoutes];
  positive('notes41-current-source-and-historical36-scopes',()=>{
    const s=notes41View.summary();assert.equal(s.currentNotesSources,41);assert.equal(s.currentRows,126);
    assert.equal(s.supportingSources,60);assert.equal(s.sketchSupportingSources,11);assert.equal(s.totalSupportingSources,71);assert.equal(s.historical36CarrierRows,6);assert.equal(s.historicalRecordReaderRows,10);assert.equal(s.historicalProducerCarrierRows,1);assert.equal(s.historicalControlsCarrierRows,1);
    assert.equal(s.authenticatedDataRows,145);assert.equal(s.fileLimit,145);assert.equal(s.individualByteLimit,512*1024);assert.equal(s.byteLimit,8*1024*1024);
    assert.equal(s.combinedEnvelopeRowsWithSeparateHelper,146);assert.equal(s.separateHelperIndividualByteLimit,256*1024);
    assert.equal(s.currentDirectoryClosureRequired,true);assert.equal(s.oldNotes36ProofRemainsHistorical,true);assert.equal(s.old36BudgetsUnchanged,true);
    assert.equal(s.currentSourceChannelSeparateFromLegacyProofReads,true);assert.equal(s.actualDirectoryCensusKind,'live-rechecked-acquisition');assert.equal(s.actualDirectoryCensusRechecked,true);assert.equal(s.historicalReceiptsRebound,false);assert.equal(s.installedBehaviorAccepted,false);
  });
  for(const row of notes41View.plan.currentSourceRows)negative('notes41-current-source-byte-change:'+row.path,()=>createNotes41PublicationSourceView(p=>p===row.path?flip(actualRead(p)):actualRead(p),notes41Pin,actualLiveNotesPaths),'separate externally pinned actual current source group; no old source identity is substituted');
  for(const row of [...allHistoricalRoutes,notes41View.plan.historicalPublicationProducer,notes41View.plan.historicalPublicationControls])negative('notes41-historical-carrier-byte-change:'+row.carrier.path,()=>createNotes41PublicationSourceView(p=>p===row.carrier.path?flip(actualRead(p)):actualRead(p),notes41Pin,actualLiveNotesPaths),'exact physical historical carrier under a distinct source epoch');
  negative('notes41-external-transition-byte-change',()=>createNotes41PublicationSourceView(p=>p===notes41Pin.path?flip(actualRead(p)):actualRead(p),notes41Pin,actualLiveNotesPaths),'external fixed transition pin; an altered declaration cannot redefine its own expected identities');
  for(const[label,names]of[['missing',actualLiveNotesPaths.slice(1)],['duplicate',[...actualLiveNotesPaths,actualLiveNotesPaths[0]]],['unknown',actualLiveNotesPaths.map((name,i)=>i===0?'products/rea-studio/apps/notes/unlisted-source.mjs':name)]])negative('notes41-live-directory-closure:'+label,()=>createNotes41PublicationSourceView(actualRead,notes41Pin,names),'exact41 live app names remain independent from historical36 proof names');
  for(const row of allHistoricalRoutes)negative('notes41-unknown-source-epoch:'+row.logicalPath,()=>notes41View.resolve(row.logicalPath,{bytes:1,sha256:'0'.repeat(64)},migration.resolve),'only exact externally pinned current/historical36 or previously named older source epochs are allowed');
  positive('notes41-excluded-results-and-unrelated-SHA-only-resolver-contract',()=>{
    for(const name of ['products/rea-studio/apps/notes/results/unlisted-old-proof.json',notes41View.plan.supportingSources[0].path]){
      const expected={sha256:'0'.repeat(64)};let delegated=0;
      assert.equal(notes41View.resolve(name,expected,(actualName,actualExpected)=>{delegated++;assert.equal(actualName,name);assert.equal(actualExpected,expected);return null;}),null);assert.equal(delegated,1);
    }
  });
  const notes41ArtifactPaths=[...artifactPaths,'notes41-current-sources.json.gz.snapshot'];
  const oldRoleValidator=paths=>sourceGate('roles',read,paths);
  positive('notes41-exact96-roles-retain-all95-historical-roles',()=>{assert.equal(verifyNotes41PublicationArtifactRoles(notes41ArtifactPaths,oldRoleValidator),true);});
  for(const[label,paths]of[['missing-new',artifactPaths],['duplicate-new',[...notes41ArtifactPaths,'notes41-current-sources.json.gz.snapshot']],['unknown-new',notes41ArtifactPaths.map(name=>name==='notes41-current-sources.json.gz.snapshot'?'unlisted-current-source-envelope.snapshot':name)],['old-role-replacement',notes41ArtifactPaths.map((name,i)=>i===0?'unlisted-old-source-envelope.snapshot':name)]])negative('notes41-artifact-role-census:'+label,()=>verifyNotes41PublicationArtifactRoles(paths,oldRoleValidator),'exact96-role union; immutable old95-role verifier independently checks the complete historical subset');
  // Ten reader source transitions are actual current input rows and exact
  // historical physical paths, not an unchecked optional migration override.
  for(const row of notes41View.plan.historicalRecordReaderRoutes){
    positive('notes41-reader-exact-current-and-before:'+row.logicalPath,()=>{
      const bound=assertNotes41AwareProofMigration(notes41Initial,actualRead,actualRead);
      assert.equal(bound.resolve(row.logicalPath,row.current),null);same(actualRead(row.logicalPath),row.current);
      assert.equal(bound.resolve(row.logicalPath,row.before),row.carrier.path);same(actualRead(row.carrier.path),row.before);
    });
    negative('notes41-reader-current-channel-mutation:'+row.logicalPath,()=>assertNotes41AwareProofMigration(notes41Initial,p=>p===row.logicalPath?flip(actualRead(p)):actualRead(p),actualRead),'brand plus independently reauthenticated actual current-source channel');
    negative('notes41-reader-physical-carrier-mutation:'+row.logicalPath,()=>{
      const bound=assertNotes41AwareProofMigration(notes41Initial,actualRead,actualRead),target=bound.resolve(row.logicalPath,row.before);
      const proofRead=p=>p===row.carrier.path?flip(actualRead(p)):actualRead(p);same(proofRead(target),row.before);
    },'resolved physical carrier still crosses the unchanged exact proof-byte assertion');
  }
  negative('notes41-context-forged-object',()=>assertNotes41AwareProofMigration(Object.freeze({...notes41Initial}),actualRead,actualRead),'WeakMap brand cannot be supplied by a caller-created stub');
  negative('notes41-context-missing-current-channel',()=>assertNotes41AwareProofMigration(notes41Initial),'an explicit source-read channel is mandatory');
  negative('notes41-context-stale-after-authentication',()=>{
    let stale=false;const target=notes41View.plan.currentNotesSources[0].path;
    const context=createNotes41AwareProofMigration(p=>stale&&p===target?flip(actualRead(p)):actualRead(p),notes41Pin,actualLiveNotesPaths);
    stale=true;assertNotes41AwareProofMigration(context,actualRead,actualRead);
  },'the originally branded source context is rechecked before creating a new channel binding');
  const {verifyEditorValueApiProofBytes}=await import(pathToFileURL(path.join(root,'scripts/verify-editor-value-api-followups.mjs')).href);
  const pureCurrentTarget='products/rea-studio/apps/notes/client.mjs';
  let pureSourceMutationHits=0;
  negative('notes41-editor-pure-current-source-channel-mutation',()=>verifyEditorValueApiProofBytes({read:actualRead,list:proofList,sourceRead:p=>{if(p===pureCurrentTarget){pureSourceMutationHits++;return flip(actualRead(p));}return actualRead(p);}},{sourceMigration:notes41Initial}),'actual pure validator reauthenticates sourceRead before accepting proof metadata');
  assert(pureSourceMutationHits>0,'The exact pure current-source mutation must be read');assert(rows.at(-1).rejected.message.includes(pureCurrentTarget),'Rejection must identify the mutated current source');
  negative('notes41-editor-pure-forged-context',()=>verifyEditorValueApiProofBytes({read:actualRead,list:proofList,sourceRead:actualRead},{sourceMigration:Object.freeze({...notes41Initial})}),'actual pure validator rejects an unbranded context before source/proof reads');
  assert(rows.at(-1).rejected.message.includes('A real frozen current-source context is required'),'Forged context must reject at the actual brand guard');
  function proofList(prefix){assert(typeof prefix==='string'&&prefix.endsWith('/'));const names=[];function visit(directory,relative,depth){assert(depth<=32);const entries=fs.readdirSync(directory,{withFileTypes:true});assert(entries.length<=1200);for(const item of entries){assert(!item.isSymbolicLink());const name=relative+item.name;if(item.isDirectory())visit(path.join(directory,item.name),name+'/',depth+1);else{assert(item.isFile());names.push(name);assert(names.length<=1200);}}}visit(path.join(root,prefix),prefix,0);return names;}
  const pureHost=notes41View.plan.historical36Routes.find(row=>row.logicalPath==='products/rea-studio/server.mjs');assert(pureHost);
  positive('notes41-editor-pure-valid-two-channel-context',()=>{const result=verifyEditorValueApiProofBytes({read:actualRead,list:proofList,sourceRead:actualRead},{sourceMigration:notes41Initial});assert.equal(result.sourceMigration.notes41PublicationSourceProof.authenticatedDataRows,145);assert.equal(result.newApplicationExecutions,0);});
  negative('notes41-editor-pure-physical-proof-carrier-mutation',()=>verifyEditorValueApiProofBytes({read:p=>p===pureHost.carrier.path?flip(actualRead(p)):actualRead(p),list:proofList,sourceRead:actualRead},{sourceMigration:notes41Initial}),'actual pure validator retains exact historical carrier identity checks on io.read independently of current-source authentication');
  positive('notes41-old-publication-producer-is-explicit-carrier',()=>{const old=notes41View.plan.historicalPublicationProducer;same(notes41View.legacyRead(old.logicalPath),old.before);same(actualRead(old.carrier.path),old.before);assert.equal(notes41View.envelopeRows().filter(row=>row.historicalPublicationProducer).length,1);});
  negative('notes41-context-extra-eligible-source-after-authentication',()=>{
    let names=[...actualLiveNotesPaths];const context=createNotes41AwareProofMigration(actualRead,notes41Pin,()=>names);
    names=[...names,'products/rea-studio/apps/notes/owned-unlisted-source.mjs'];assertNotes41AwareProofMigration(context,actualRead,actualRead);
  },'the retained acquisition provider is re-enumerated; a declaration list cannot replace actual names');
  const actualProducerSource=actualRead('scripts/verify-cloud-publication.mjs').toString('utf8');
  const helperLiteral=[...actualProducerSource.matchAll(/^const NOTES41_PUBLICATION_HELPER = \{ path: 'scripts\/notes41-publication-source-view\.mjs', bytes: ([1-9][0-9]*), sha256: '([0-9a-f]{64})' \};$/gm)];
  assert.equal(helperLiteral.length,1,'One exact current producer helper pin literal');
  const helperPin={path:'scripts/notes41-publication-source-view.mjs',bytes:Number(helperLiteral[0][1]),sha256:helperLiteral[0][2]};
  const helperBytes=actualRead(helperPin.path),helperDataRows=notes41View.envelopeRows();
  positive('notes41-fixed-helper-real-shared-guard',()=>{const row=verifyNotes41PublicationHelperRow(helperBytes,helperPin,helperDataRows);assert.equal(row.separateFixedHelperSource,true);same(Buffer.from(row.base64,'base64'),helperPin);});
  negative('notes41-fixed-helper-byte-change',()=>verifyNotes41PublicationHelperRow(flip(helperBytes),helperPin,helperDataRows),'same actual producer helper-row guard; expected identity comes from fixed current producer literal');
  negative('notes41-fixed-helper-wrong-path',()=>verifyNotes41PublicationHelperRow(helperBytes,{...helperPin,path:'scripts/unlisted-helper.mjs'},helperDataRows),'one fixed helper source path');
  negative('notes41-fixed-helper-wrong-SHA',()=>verifyNotes41PublicationHelperRow(helperBytes,{...helperPin,sha256:'0'.repeat(64)},helperDataRows),'exact externally fixed helper SHA');
  negative('notes41-fixed-helper-wrong-size',()=>verifyNotes41PublicationHelperRow(helperBytes,{...helperPin,bytes:helperPin.bytes+1},helperDataRows),'exact externally fixed helper byte count');
  negative('notes41-fixed-helper-data-overlap',()=>verifyNotes41PublicationHelperRow(helperBytes,helperPin,helperDataRows.map((row,i)=>i===0?{...helperPin}:row)),'helper is separately counted and cannot replace a mandatory data row');
  negative('notes41-fixed-helper-individual-cap',()=>verifyNotes41PublicationHelperRow(Buffer.alloc(256*1024+1),helperPin,helperDataRows),'fixed helper256KiB individual cap precedes acceptance');
  negative('notes41-fixed-helper-combined-raw-cap',()=>verifyNotes41PublicationHelperRow(helperBytes,helperPin,helperDataRows.map(row=>({...row,bytes:512*1024}))),'combined145 data rows plus helper remain below8MiB');
  negative('notes41-fixed-helper-missing-data-row',()=>verifyNotes41PublicationHelperRow(helperBytes,helperPin,helperDataRows.slice(1)),'all145 data rows are mandatory before the146th helper row');
  const legacyOnlyDeclaration='products/rea-studio/results/publication-git-directory-closure-20261015/preservation-manifest.json';
  assert(!notes41View.plan.currentSourceRows.some(row=>row.path===legacyOnlyDeclaration));
  let pureLegacyMutationHits=0;
  negative('notes41-editor-pure-legacy-only-proof-channel-mutation',()=>verifyEditorValueApiProofBytes({read:p=>{if(p===legacyOnlyDeclaration){pureLegacyMutationHits++;return flip(actualRead(p));}return actualRead(p);},list:proofList,sourceRead:actualRead},{sourceMigration:notes41Initial}),'fresh legacy constructor authenticates supplied io.read even for mandatory declarations outside the145 current-source data group');
  assert(pureLegacyMutationHits>0,'The exact mandatory legacy-only declaration mutation must be read');assert(rows.at(-1).rejected.message.includes(legacyOnlyDeclaration),'Legacy rejection must identify the actually mutated declaration');
  // Additional controls for one named old937 context. Actual new source bytes
  // remain separately mandatory; no old row is relabeled current acceptance.
  const shared937Host={path:'products/rea-studio/server.mjs',bytes:7840,sha256:'85fe09b1b52a1d91e9d09c85d99c6e768ac4b793f5d7694a1760a4c0560a0a94'};
  const shared937Carrier=notes41View.historicalReadPath(shared937Host.path,shared937Host);
  const shared937LogicalAbsolute=path.join(root,shared937Host.path),shared937CarrierAbsolute=path.join(root,shared937Carrier);
  const is937Carrier=filename=>path.resolve(filename).toLowerCase()===path.resolve(shared937CarrierAbsolute).toLowerCase();
  function owned937Context(overrides={}){return {root,developmentRoot:path.join(root,'products/rea-studio'),status:JSON.parse(read('products/rea-studio/STATUS.json')),assert,join:path.join,lstatSync:fs.lstatSync,sha,sourceProofMigration:migration,
    safeRecordPath(name){assert.ok(typeof name==='string'&&name&&!name.startsWith('/')&&!name.split('/').includes('..')&&!name.includes('\\'));},
    readFileSync:(filename,...args)=>fs.readFileSync(filename,...args),...overrides};}
  positive('notes41-historical937-fixed-host-physical-projection',()=>{
    const scoped=createNotes41Historical937ReadContext(root,notes41Initial),stat=scoped.lstatSync(shared937LogicalAbsolute),bytes=scoped.readFileSync(shared937LogicalAbsolute);
    same(bytes,shared937Host);assert.equal(stat.size,7840);assert.equal(stat.size,fs.lstatSync(shared937CarrierAbsolute).size);assert.equal(scoped.resolve(shared937Host.path,shared937Host),null);
    const scope=scoped.summary();assert.equal(scope.oldHostPhysicalPath,shared937Carrier);assert.equal(scope.actualCurrentSourceGroupAuthenticatedSeparately,true);assert.equal(scope.extraMigrationRoutesAdded,0);assert.equal(scope.globalFilesystemAdapter,false);
    const result=script.runInNewContext(owned937Context(),{timeout:120000});assert.deepEqual({...result},{rows:737,routed:13,unchanged:724});
  });
  let shared937CarrierByteHits=0;
  negative('notes41-historical937-physical-carrier-byte-mutation',()=>script.runInNewContext(owned937Context({readFileSync(filename,...args){const bytes=fs.readFileSync(filename,...args);if(is937Carrier(filename)){shared937CarrierByteHits++;return flip(bytes);}return bytes;}}),{timeout:120000}),'exact old937 block reads the fixed physical carrier through the actual scoped VM context');
  assert(shared937CarrierByteHits>0,'The precise old937 physical byte channel must be read');assert(rows.at(-1).rejected.message.includes('Historical937 proof changed: '+shared937Host.path));
  let shared937CarrierStatHits=0;
  negative('notes41-historical937-physical-carrier-stat-mutation',()=>script.runInNewContext(owned937Context({lstatSync(filename,...args){const stat=fs.lstatSync(filename,...args);if(!is937Carrier(filename))return stat;shared937CarrierStatHits++;return new Proxy(stat,{get(target,key,receiver){return key==='size'?target.size+1:Reflect.get(target,key,receiver);}});}}),{timeout:120000}),'the actual physical carrier stat must agree with its7840-byte read; the owned metadata mutation never changes a file');
  assert(shared937CarrierStatHits>0,'The precise old937 physical stat channel must be read');assert(rows.at(-1).rejected.message.includes('7840'));
  let mutate937ActualHost=false,shared937CurrentHostHits=0;
  const sourceToggle937=createNotes41AwareProofMigration(name=>{const bytes=actualRead(name);if(mutate937ActualHost&&name===shared937Host.path){shared937CurrentHostHits++;return flip(bytes);}return bytes;},notes41Pin,()=>[...actualLiveNotesPaths]);
  mutate937ActualHost=true;
  negative('notes41-historical937-actual-current-host-byte-mutation',()=>{const scoped=createNotes41Historical937ReadContext(root,sourceToggle937);same(scoped.readFileSync(shared937LogicalAbsolute),shared937Host);},'a previously authenticated current source context is rechecked before projecting any old host bytes');
  assert(shared937CurrentHostHits>0,'The actual current7953-byte host must be observed');assert(rows.at(-1).rejected.message.includes(shared937Host.path));
  const known937Scope=createNotes41Historical937ReadContext(root,notes41Initial);
  for(const[label,expected]of[['modern-source',{bytes:7953,sha256:'c13a55cb66a13e973847ff6a970006b2acf3cf6c4752d1e25292ef67695329ae'}],['unknown-SHA',{bytes:7840,sha256:'0'.repeat(64)}]]){
    negative('notes41-historical937-unexpected-host-identity:'+label,()=>known937Scope.resolve(shared937Host.path,expected),'only the exact7840-byte historical source identity is eligible for the named old937 boundary');
    assert(rows.at(-1).rejected.message.includes('Only the exact old937 shared-host identity can be projected'));
  }
  negative('notes41-historical937-changed-VM-source-hash',()=>new vm.Script(block+'\n// Owned exact-source mutation.',{filename:'exact-reviewed-root-historical937-control.mjs'}),'the local facade binds one exact immutable5784-byte control source, not merely a chosen filename');
  assert(rows.at(-1).rejected.message.includes('Only the immutable exact reviewed937 control block is eligible'));
  positive('notes41-historical937-other-VM-filename-keeps-native-context',()=>{const unrelated=new vm.Script(block,{filename:'owned-unlisted-historical937-filename.mjs'});assert(unrelated instanceof nativeVm.Script);});
  positive('notes41-old-publication-controls-is-explicit-carrier',()=>{const old=notes41View.plan.historicalPublicationControls;same(notes41View.legacyRead(old.logicalPath),old.before);assert.equal(notes41View.historicalReadPath(old.logicalPath,old.before),old.carrier.path);same(actualRead(old.carrier.path),old.before);assert.equal(notes41View.envelopeRows().filter(row=>row.historicalPublicationControls).length,1);});
  for(const old of [notes41View.plan.historicalPublicationProducer,notes41View.plan.historicalPublicationControls]){
    negative('notes41-excluded-publication-source-unknown-old-identity:'+old.logicalPath,()=>notes41View.historicalReadPath(old.logicalPath,{bytes:old.before.bytes,sha256:'0'.repeat(64)}),'excluded self-sources have exactly named historical carrier identities; current actual self-sources are separately Git authenticated');
    assert(rows.at(-1).rejected.message.includes('Only exact named Notes36 predecessor identities can be projected'));
  }
  const sourceOnlyAuditView=createNotes41PublicationSourceViewFromRoot(root);
  positive('notes41-source-only-factory-has-real-rechecked-census',()=>{const s=sourceOnlyAuditView.summary();assert.equal(s.authenticatedDataRows,145);assert.equal(s.currentRows,126);assert.equal(s.historicalRecordReaderRows,10);assert.equal(s.actualDirectoryCensusKind,'live-rechecked-acquisition');assert.equal(s.sourceOnly,true);});
  negative('notes41-source-only-view-cannot-stand-in-for-proof-context',()=>assertNotes41AwareProofMigration(sourceOnlyAuditView,actualRead,actualRead),'a source-only view cannot bypass historical proof validation by masquerading as a branded proof context');
  assert(rows.at(-1).rejected.message.includes('A real frozen current-source context is required'));
  // Synthetic current-v2 guard inputs only: immutable historical receipts are
  // cloned in memory, never relabeled as observed current child executions.
  const currentSketchRepeatPhase=repeatAttempt.phases.find(row=>row.name==='publication-write');assert(currentSketchRepeatPhase);
  const currentSketchSelectedNames=[...notes41View.plan.sketchSupportingSources.filter(row=>!row.path.startsWith('scripts/')).map(row=>row.path),'products/rea-studio/server.mjs'].sort();
  const currentSketchSelected=currentSketchSelectedNames.map(name=>{const row=notes41View.plan.currentSourceRows.find(row=>row.path===name);assert(row);return {path:row.path,bytes:row.bytes,sha256:row.sha256};});
  const currentSketchHost=notes41View.plan.historical36Routes.find(row=>row.logicalPath==='products/rea-studio/server.mjs'),currentSketchCarrier=notes41View.historicalReadPath(currentSketchHost.logicalPath,currentSketchHost.before);
  const currentSketchGuard=structuredClone(repeatFirst),currentSketchGuardBody=currentSketchGuard.followup_evidence.notesLayoutValueApiCheckpoint.sketch;
  Object.assign(currentSketchGuardBody,{schema:'rea-sketch-layout-installed-source-proof/v2',actualInstalledByteVerification:false,current10HistoricalDatasetMandatory:true,actualCurrentSourcesAuthenticatedSeparately:true,currentSourceProof:{...notes41View.summary(),actualDirectoryCensusKind:'live-rechecked-acquisition',actualDirectoryCensusRechecked:true},historicalSourceProjection:{schema:'rea-sketch-fixed-dataset-historical-host-projection/v1',datasetSHA256:notes41View.plan.sketchSourceBoundary.fixedDataset.sha256,logicalPath:currentSketchHost.logicalPath,declaredHistoricalIdentity:currentSketchHost.before,physicalCarrier:currentSketchCarrier,physicalCarrierSourceEpoch:notes41View.plan.oldNotes36Source,actualCurrentRows:currentSketchSelected,actualCurrentSelectedSourceRows:10,historicalDatasetSourceRows:10,historicalHostRows:1,otherSelectedSourceRowsUnchanged:9,actualCurrentSourcesAuthenticatedSeparately:true,actualInstalledAtHistoricalIdentityClaimed:false,sourceOverlay:false,historicalReceiptRebound:false,currentBehaviorAcceptanceClaimed:false},sourceProjectionControls:{positive:1,negative:2,observations:[{name:'positive-fixed-dataset-host-and-real-current-source-channels',expected:'acceptance',passed:true},{name:'reject-actual-current-host-byte-mutation',expected:'rejection',passed:true,target:currentSketchHost.logicalPath},{name:'reject-historical-physical-host-carrier-byte-mutation',expected:'rejection',passed:true,target:currentSketchCarrier}]}});
  positive('notes41-sketch-repeat-v2-valid-live-current-view',()=>{const result=projectNotes41CurrentSketchRepeat(currentSketchGuard,currentSketchRepeatPhase,notes41View,repeatProject);assert.equal(result.stable.followup_evidence.notesLayoutValueApiCheckpoint.sketch.schema,'rea-sketch-layout-installed-source-proof/v2');assert.equal(result.sourceQualification.currentViewCensus,'live-rechecked-acquisition');assert.equal(result.sourceQualification.onlyThreeOwnClocksRemoved,true);},{syntheticGuardInput:true,historicalReceiptsRewritten:false});
  positive('notes41-sketch-repeat-v2-valid-fixed-Git-current-view',()=>{const view=createNotes41PublicationSourceView(actualRead,notes41Pin,actualLiveNotesPaths),result=projectNotes41CurrentSketchRepeat(currentSketchGuard,currentSketchRepeatPhase,view,repeatProject);assert.equal(result.sourceQualification.currentViewCensus,'fixed-caller-snapshot');assert.equal(result.sourceQualification.childPhysicalCensus,'live-rechecked-acquisition');},{syntheticGuardInput:true,historicalReceiptsRewritten:false});
  function currentSketchMutation(name,mutate,guard){const input=structuredClone(currentSketchGuard);mutate(input.followup_evidence.notesLayoutValueApiCheckpoint.sketch);negative(name,()=>projectNotes41CurrentSketchRepeat(input,currentSketchRepeatPhase,notes41View,repeatProject),'synthetic current-v2 guard; exact qualification retained independently from legacy clock routine');assert(rows.at(-1).rejected.message.includes(guard),'Current-v2 mutation rejected at unexpected guard: '+name+': '+rows.at(-1).rejected.message);}
  currentSketchMutation('notes41-sketch-repeat-v2-wrong-historical-identity',sketch=>{sketch.historicalSourceProjection.declaredHistoricalIdentity.sha256='0'.repeat(64);},'CURRENT-v2 historical host identity');
  currentSketchMutation('notes41-sketch-repeat-v2-wrong-current-identity',sketch=>{sketch.historicalSourceProjection.actualCurrentRows.find(row=>row.path===currentSketchHost.logicalPath).sha256='0'.repeat(64);},'CURRENT-v2 selected actual current source pins');
  currentSketchMutation('notes41-sketch-repeat-v2-missing-qualification',sketch=>{delete sketch.actualCurrentSourcesAuthenticatedSeparately;},'CURRENT-v2 scope field actualCurrentSourcesAuthenticatedSeparately');
  currentSketchMutation('notes41-sketch-repeat-v2-missing-control-observation',sketch=>{sketch.sourceProjectionControls.observations.pop();},'CURRENT-v2 named source projection observations');
  currentSketchMutation('notes41-sketch-repeat-v2-reject-legacy-v1-substitution',sketch=>{sketch.schema='rea-sketch-layout-installed-source-proof/v1';},'CURRENT-v2 Sketch schema is mandatory');
  let currentSketchSourceStale=false,currentSketchSourceMutationHits=0;
  const currentSketchStaleView=createNotes41PublicationSourceView(name=>{const content=actualRead(name);if(currentSketchSourceStale&&name===currentSketchHost.logicalPath){currentSketchSourceMutationHits++;return flip(content);}return content;},notes41Pin,actualLiveNotesPaths);
  currentSketchSourceStale=true;
  negative('notes41-sketch-repeat-v2-post-auth-current-source-mutation',()=>projectNotes41CurrentSketchRepeat(currentSketchGuard,currentSketchRepeatPhase,currentSketchStaleView,repeatProject),'genuine branded view rechecks actual post-auth source bytes before qualifying synthetic metadata');
  assert(currentSketchSourceMutationHits>0,'The current-v2 repeat source mutation must be consumed');assert(rows.at(-1).rejected.message.includes(currentSketchHost.logicalPath));
  let currentSketchCallbackMutationHits=0;
  negative('notes41-sketch-repeat-v2-nonclock-callback-mutation',()=>projectNotes41CurrentSketchRepeat(currentSketchGuard,currentSketchRepeatPhase,notes41View,(value,phase)=>{currentSketchCallbackMutationHits++;const result=repeatProject(value,phase);result.stable.followup_evidence.notesLayoutValueApiCheckpoint.sketch.sourceOnly=false;return result;}),'only the same three owned clocks may disappear; the actual injected callback mutation must be consumed');
  assert(currentSketchCallbackMutationHits>0,'The non-clock callback mutation must be consumed');assert(rows.at(-1).rejected.message.includes('CURRENT-v2 repeat must retain every non-clock field'));
  currentSketchMutation('notes41-sketch-repeat-v2-wrong-child-census',sketch=>{sketch.currentSourceProof.actualDirectoryCensusKind='fixed-caller-snapshot';},'CURRENT-v2 child physical census');
  currentSketchMutation('notes41-sketch-repeat-v2-wrong-current-source-count',sketch=>{sketch.currentSourceProof.currentRows--;},'CURRENT-v2 child current-source proof');
  // A caller-created frozen view cannot replace actual source acquisition.
  let forgedCurrentViewMethodHits=0,forgedCurrentViewCallbackHits=0;
  const plausibleCurrentSourceProof=notes41View.summary();
  const forgedCurrentSourceView=Object.freeze({plan:notes41View.plan,summary(){forgedCurrentViewMethodHits++;return plausibleCurrentSourceProof;},recheck(){forgedCurrentViewMethodHits++;},sourceRead(name){forgedCurrentViewMethodHits++;return actualRead(name);},historicalReadPath(){forgedCurrentViewMethodHits++;return currentSketchCarrier;},envelopeRows(){forgedCurrentViewMethodHits++;return [];}});
  negative('notes41-sketch-repeat-v2-reject-frozen-unbranded-source-view',()=>projectNotes41CurrentSketchRepeat(currentSketchGuard,currentSketchRepeatPhase,forgedCurrentSourceView,()=>{forgedCurrentViewCallbackHits++;return {stable:structuredClone(currentSketchGuard),clocks:{}};}),'a plausible frozen stub must reject before any source method or legacy callback can mask actual source acquisition');
  assert.equal(forgedCurrentViewMethodHits,0,'An unbranded current source view must not reach any fake source method');assert.equal(forgedCurrentViewCallbackHits,0,'An unbranded current source view must not reach the fake legacy callback');assert.equal(rows.at(-1).rejected.message,'CURRENT-v2 requires a real constructor-branded current-source view');
  assert.equal(retainedControlCount,306);
  const actualAdditional=rows.slice(retainedControlCount).map(row=>({name:row.name,expected:row.rejected?'rejection':'acceptance'}));
  const frozenAdditional=notes41View.plan.publicationAdditionalControlRoster.map(row=>({name:row.name,expected:row.expected}));
  assert.equal(frozenAdditional.length,245);assert.equal(new Set(frozenAdditional.map(row=>row.name)).size,245);
  assert.deepEqual(actualAdditional,frozenAdditional,'Every new control name, order and expected outcome must match its externally pinned closed roster');
  assert.equal(rows.length,306+245);assert.ok(rows.every(row=>row.passed));
  return { schema: 'rea-cloud-publication-controls/v5', sourceEpoch: 'notes41-installed-recovery-r2-publication-ten-readers-sketch-source-projection', retainedHistoricalControls:306, current41AdditionalControls:245, historical937AdditionalControls:8, sourceOnlyAuditAndSpecialCarrierAdditionalControls:5, status: 'passed', sourceOnly: true, rows, checks: rows.length,
    exactReviewed937Block: ROOT_ID, fixtureFiles: copies.size, fixtureBytes: copiedBytes, gitAliasFixtureFiles: gitCopies.size, gitAliasFixtureBytes: gitCopiedBytes,
    actualCheckoutFilesMutated: 0, applicationTests: 0, originalExecutions: 0,
    limits: ['Finite manifest/attempt mutations are rejected at their immutable identity layer; deeper semantic branches are not separately bypassed or claimed tested.', 'The937 block executes only publication assertions/readers in a bounded VM; it does not execute the historical937 behavioral tests.', 'Current-source io.sourceRead and historical proof-carrier io.read are distinct explicit channels; both are checked and no optional unbranded migration is accepted.'] };
}
