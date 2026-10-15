import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, readdirSync, lstatSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {createEditorVaultProofMigration,createEditorVaultProofMigrationFromRoot} from './editor-vault-proof-migration.mjs';
import { verifyFollowupRecords } from './verify-followup-records.mjs';
import { verifyCloudRecoveryRecords } from './verify-cloud-recovery-records.mjs';
import { createHistoricalCarrierPolicyFromRoot } from './historical-carrier-policy.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'PUBLICATION-MANIFEST.json'), 'utf8'));
const index = JSON.parse(readFileSync(join(root, 'PROJECT-INDEX.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceProofMigration=createEditorVaultProofMigrationFromRoot(root);
const finiteCloudRecovery=verifyCloudRecoveryRecords(root);
const followupEvidence = verifyFollowupRecords(root);
const historicalMilestone = 'products/rea-studio/results/milestones/execution-archive-20261012/';
function safeRecordPath(path) { assert.ok(typeof path === 'string' && path.length && !path.startsWith('/') && !path.split('/').includes('..') && !path.includes('\\'), `Invalid record path: ${path}`); }
function currentPublicFingerprint(entry,label){safeRecordPath(entry.path);const bytes=readFileSync(join(root,entry.path));if(entry.bytes!==undefined)assert.equal(bytes.length,entry.bytes,`${label} size changed: ${entry.path}`);assert.equal(sha(bytes),entry.sha256,`${label} source changed: ${entry.path}`);}
function namedHistoricalHostFingerprint(entry,label){if(entry.path!=='products/rea-studio/server.mjs')return currentPublicFingerprint(entry,label);safeRecordPath(entry.path);if(entry.bytes!==undefined)assert.equal(entry.bytes,7741);assert.equal(entry.sha256,'807a473ec0334f60dfd58f2df8901c722f1bd4eb1d64c62d9ba1ea65c2b6b55f');const transition=followupEvidence.editorHostTransition;assert.equal(transition.path,entry.path);assert.deepEqual(transition.before,{bytes:7741,sha256:entry.sha256});assert.equal(transition.addedStaticMapLineBytes,99);assert.equal(transition.historical3baHostAndInverseExact,true);const live=readFileSync(join(root,entry.path));assert.equal(live.length,transition.after.bytes);assert.equal(sha(live),transition.after.sha256);const prefix='products/rea-studio/results/milestones/search-trash-recycle-save-3baecf4e-20261013',mb=readFileSync(join(root,prefix,'snapshot-manifest.json'));assert.equal(sha(mb),'d969655ed6d1e73f925147c277261b38333e2d095b18a486f2c7c2a7700689ff');const m=JSON.parse(mb),rows=m.sourceSnapshots.filter(r=>r.sourcePath===entry.path);assert.equal(rows.length,1);const r=rows[0];safeRecordPath(r.snapshotPath);assert.ok(r.snapshotPath.startsWith('products/rea-studio/results/search-trash-recycle-save-combined-20261013/source/'));assert.equal(r.bytes,7741);assert.equal(r.sha256,entry.sha256);const old=readFileSync(join(root,r.snapshotPath));assert.equal(old.length,7741);assert.equal(sha(old),entry.sha256);}
// The455 checkpoint remains historical when subsequent reviewed runtime/docs change.
const published455Prefix='products/rea-studio/results/milestones/packs-notebooks-history-455ab6c-20261012/';
const published455ManifestBytes=readFileSync(join(root,published455Prefix,'snapshot-manifest.json'));
assert.equal(sha(published455ManifestBytes),'4d73c4e77c042428c9ab946c5884dad69c052394037be5aeb4f2f21a5b0a9786');
const published455=JSON.parse(published455ManifestBytes);assert.equal(published455.schema,'rea-packs-notebooks-history-published-checkpoint/v1');assert.equal(published455.sourceRevision,'455ab6c46461981e6e4331ba5612d5362bf4ad22');assert.equal(published455.sourceSnapshots.length,674);assert.equal(published455.metadataSnapshots.length,23);assert.equal(published455.originalReceiptsRebound,false);
const published455Sources=new Map();for(const e of [...published455.sourceSnapshots,...published455.metadataSnapshots]){safeRecordPath(e.sourcePath);safeRecordPath(e.snapshotPath);const b=readFileSync(join(root,e.snapshotPath));assert.equal(b.length,e.bytes);assert.equal(sha(b),e.sha256);const previous=published455Sources.get(e.sourcePath);if(previous)assert.equal(previous.sha256,e.sha256);published455Sources.set(e.sourcePath,e);}
function published455Fingerprint(e,label){safeRecordPath(e.path);const b=readFileSync(join(root,e.path));if(sha(b)===e.sha256){if(e.bytes!==undefined)assert.equal(b.length,e.bytes);return;}const old=published455Sources.get(e.path);assert.ok(old,'Missing455 historical identity:'+label+':'+e.path);assert.equal(old.sha256,e.sha256,'Historical receipt does not bind455 bytes:'+e.path);if(e.bytes!==undefined)assert.equal(old.bytes,e.bytes);}
function loadHistoricalMilestone() {
  const record = JSON.parse(readFileSync(join(root, historicalMilestone, 'snapshot-manifest.json'), 'utf8'));
  assert.equal(record.schema, 'rea-historical-milestone-snapshot/v1');
  assert.equal(record.source_revision, '43194058e774ae56858a2a24f784a961156d4c51');
  const sources = new Map(), receipts = new Map();
  for (const [entries, map, kind] of [[record.source_snapshots, sources, 'source'], [record.receipts, receipts, 'receipt']]) for (const entry of entries) {
    safeRecordPath(entry.path); safeRecordPath(entry.snapshot_path); assert.ok(!map.has(entry.path), `Duplicate historical ${kind}: ${entry.path}`);
    assert.ok(entry.snapshot_path.startsWith(historicalMilestone + (kind === 'source' ? 'source/' : '')), `Wrong historical snapshot location: ${entry.snapshot_path}`);
    const bytes = readFileSync(join(root, entry.snapshot_path)); assert.equal(bytes.length, entry.bytes, `Historical ${kind} size changed: ${entry.path}`); assert.equal(sha(bytes), entry.sha256, `Historical ${kind} changed: ${entry.path}`); map.set(entry.path, entry);
  }
  assert.ok(sources.size > 0 && receipts.size > 0);
  return { sources, receipts, source_revision: record.source_revision };
}
const historicalExecution = loadHistoricalMilestone();
const nativeCoreMilestone = 'products/rea-studio/results/milestones/native-core-20261012/';
const nativeCoreHistory = JSON.parse(readFileSync(join(root, nativeCoreMilestone, 'snapshot-manifest.json'), 'utf8'));
assert.equal(nativeCoreHistory.schema, 'rea-native-core-checkpoint-snapshot/v1');
assert.equal(nativeCoreHistory.source_revision, '50155ea79ca43fd38842619e9acab7c0ea1976b0');
const nativeCoreSources = new Map();
for (const entry of [...nativeCoreHistory.receipts, ...nativeCoreHistory.source_snapshots]) {
  safeRecordPath(entry.path); safeRecordPath(entry.snapshot_path); assert.ok(entry.snapshot_path.startsWith(nativeCoreMilestone));
  const bytes = readFileSync(join(root, entry.snapshot_path)); assert.equal(bytes.length, entry.bytes); assert.equal(sha(bytes), entry.sha256, `Native core historical snapshot changed: ${entry.path}`);
}
for (const entry of nativeCoreHistory.source_snapshots) { assert.ok(!nativeCoreSources.has(entry.path)); nativeCoreSources.set(entry.path, entry); }
const nativeWorkflowsMilestone = 'products/rea-studio/results/milestones/native-workflows-20261012/';
const nativeWorkflowsHistory = JSON.parse(readFileSync(join(root, nativeWorkflowsMilestone, 'snapshot-manifest.json'), 'utf8'));
assert.equal(nativeWorkflowsHistory.schema, 'rea-native-workflows-checkpoint-snapshot/v1');
assert.equal(nativeWorkflowsHistory.source_revision, '64238267b332bb3a8ac5435a613a596a06311f59');
assert.equal(nativeWorkflowsHistory.receipts.length, 8); assert.equal(nativeWorkflowsHistory.source_snapshots.length, 200);
const nativeWorkflowsSources = new Map();
for (const entry of [...nativeWorkflowsHistory.receipts, ...nativeWorkflowsHistory.source_snapshots]) {
  safeRecordPath(entry.path); safeRecordPath(entry.snapshot_path); assert.ok(entry.snapshot_path.startsWith(nativeWorkflowsMilestone));
  const bytes = readFileSync(join(root, entry.snapshot_path)); assert.equal(bytes.length, entry.bytes); assert.equal(sha(bytes), entry.sha256, `Native workflows historical snapshot changed: ${entry.path}`);
}
for (const entry of nativeWorkflowsHistory.source_snapshots) { assert.ok(!nativeWorkflowsSources.has(entry.path)); nativeWorkflowsSources.set(entry.path, entry); }
const compressionRemoteMilestone = 'products/rea-studio/results/milestones/compression-remote-20261012/';
const compressionRemoteHistory = JSON.parse(readFileSync(join(root, compressionRemoteMilestone, 'snapshot-manifest.json'), 'utf8'));
assert.equal(compressionRemoteHistory.schema, 'rea-compression-remote-checkpoint-snapshot/v1');
assert.equal(compressionRemoteHistory.source_revision, 'b9f6b71b215028d786af5eaa3d41ae46cc3ec9ac');
assert.equal(compressionRemoteHistory.receipts.length, 7); assert.equal(compressionRemoteHistory.source_snapshots.length, 369);
const compressionRemoteSources = new Map();
for (const entry of [...compressionRemoteHistory.receipts, ...compressionRemoteHistory.source_snapshots]) {
  safeRecordPath(entry.path); safeRecordPath(entry.snapshot_path); assert.ok(entry.snapshot_path.startsWith(compressionRemoteMilestone));
  const bytes = readFileSync(join(root, entry.snapshot_path)); assert.equal(bytes.length, entry.bytes); assert.equal(sha(bytes), entry.sha256, `Compression/remote historical snapshot changed: ${entry.path}`);
}
for (const entry of compressionRemoteHistory.source_snapshots) { assert.ok(!compressionRemoteSources.has(entry.path)); compressionRemoteSources.set(entry.path, entry); }
const rabinRoutingGeometryMilestone = 'products/rea-studio/results/milestones/rabin-routing-geometry-20261012/';
const rabinRoutingGeometryManifestBytes = readFileSync(join(root, rabinRoutingGeometryMilestone, 'snapshot-manifest.json'));
assert.equal(sha(rabinRoutingGeometryManifestBytes), '506fc37383622c02913938530ac014efc8476574319d52ed34e0752ee26e20ba');
const rabinRoutingGeometryHistory = JSON.parse(rabinRoutingGeometryManifestBytes);
assert.equal(rabinRoutingGeometryHistory.schema, 'rea-rabin-routing-geometry-checkpoint-snapshot/v1');
assert.equal(rabinRoutingGeometryHistory.source_revision, 'a56332e9ddb6413cb33c580be137743a748fd5f9');
assert.equal(rabinRoutingGeometryHistory.combined_tests, 607);
assert.equal(rabinRoutingGeometryHistory.combined_source_fingerprints, 611);
assert.equal(rabinRoutingGeometryHistory.source_snapshots.length, 620);
assert.equal(rabinRoutingGeometryHistory.receipts.length, 11);
assert.equal(rabinRoutingGeometryHistory.source_bytes_verified_before_preservation, true);
assert.equal(rabinRoutingGeometryHistory.all_snapshots_inert, true);
assert.equal(rabinRoutingGeometryHistory.full_feature_parity_established, false);
assert.equal(rabinRoutingGeometryHistory.universal_superiority_established, false);
const rabinRoutingGeometrySources = new Map(), rabinRoutingGeometryReceipts = new Map(), rabinRoutingGeometrySnapshotPaths = new Set();
for (const [entries, map, kind] of [[rabinRoutingGeometryHistory.source_snapshots, rabinRoutingGeometrySources, 'source'], [rabinRoutingGeometryHistory.receipts, rabinRoutingGeometryReceipts, 'receipts']]) for (const entry of entries) {
  safeRecordPath(entry.path); safeRecordPath(entry.snapshot_path);
  assert.ok(!map.has(entry.path), `Duplicate Rabin/routing/geometry historical ${kind}: ${entry.path}`);
  assert.ok(!rabinRoutingGeometrySnapshotPaths.has(entry.snapshot_path)); rabinRoutingGeometrySnapshotPaths.add(entry.snapshot_path);
  assert.ok(entry.snapshot_path.startsWith(rabinRoutingGeometryMilestone + kind + '/'));
  assert.ok(entry.snapshot_path.endsWith('.snapshot'));
  const bytes = readFileSync(join(root, entry.snapshot_path));
  assert.equal(bytes.length, entry.bytes); assert.equal(sha(bytes), entry.sha256, `Rabin/routing/geometry frozen ${kind} changed: ${entry.path}`);
  map.set(entry.path, entry);
}
const rabinRoutingGeometryPublication = rabinRoutingGeometryHistory.publication_verification;
safeRecordPath(rabinRoutingGeometryPublication.snapshot_path);
assert.equal(rabinRoutingGeometryPublication.snapshot_path, rabinRoutingGeometryMilestone + 'receipts/publication-verification.json.snapshot');
assert.ok(!rabinRoutingGeometrySnapshotPaths.has(rabinRoutingGeometryPublication.snapshot_path));
const rabinRoutingGeometryPublicationBytes = readFileSync(join(root, rabinRoutingGeometryPublication.snapshot_path));
assert.equal(rabinRoutingGeometryPublicationBytes.length, rabinRoutingGeometryPublication.bytes);
assert.equal(sha(rabinRoutingGeometryPublicationBytes), '1f8e69e4f138a3476fb3cc77c6944d6554014eb82731ae88d9d6cbac2f643325');
assert.equal(sha(rabinRoutingGeometryPublicationBytes), rabinRoutingGeometryPublication.sha256);
assert.equal(rabinRoutingGeometryPublication.remote_tracked_blobs_verified, 4918);
function rabinRoutingGeometryFingerprint(entry, label) {
  safeRecordPath(entry.path); const bytes = readFileSync(join(root, entry.path));
  if (sha(bytes) === entry.sha256) { if (entry.bytes !== undefined) assert.equal(bytes.length, entry.bytes); return; }
  const snapshot = rabinRoutingGeometrySources.get(entry.path);
  assert.ok(snapshot, `Missing a563 checkpoint ${label} source: ${entry.path}`);
  assert.equal(snapshot.sha256, entry.sha256, `The ${label} receipt does not match its a563 checkpoint source: ${entry.path}`);
  if (entry.bytes !== undefined) assert.equal(snapshot.bytes, entry.bytes);
}
function compressionRemoteFingerprint(entry, label) {
  safeRecordPath(entry.path);
  const bytes = readFileSync(join(root, entry.path));
  if (sha(bytes) === entry.sha256) { if (entry.bytes !== undefined) assert.equal(bytes.length, entry.bytes); return; }
  const snapshot = compressionRemoteSources.get(entry.path);
  assert.ok(snapshot, `Missing historical compression/remote ${label} source: ${entry.path}`);
  assert.equal(snapshot.sha256, entry.sha256, `Historical compression/remote ${label} receipt disagrees: ${entry.path}`);
  if (entry.bytes !== undefined) assert.equal(snapshot.bytes, entry.bytes);
}
const routingGeometryBrowserMilestone = 'products/rea-studio/results/milestones/rabin-routing-geometry-browser-20261012/';
const routingGeometryBrowserManifestBytes = readFileSync(join(root, routingGeometryBrowserMilestone, 'snapshot-manifest.json'));
assert.equal(sha(routingGeometryBrowserManifestBytes), '309c999ec5ed7c0ae82f87f83774e336874f1e600c2197d343f581f0d069b835');
const routingGeometryBrowserHistory = JSON.parse(routingGeometryBrowserManifestBytes);
assert.equal(routingGeometryBrowserHistory.schema, 'rea-rabin-routing-geometry-browser-checkpoint/v1');
assert.equal(routingGeometryBrowserHistory.sourceSnapshots.length, 82); assert.equal(routingGeometryBrowserHistory.receipts.length, 3); assert.equal(routingGeometryBrowserHistory.artifacts.length, 14);
assert.equal(routingGeometryBrowserHistory.fullFeatureParity, false); assert.equal(routingGeometryBrowserHistory.universalSuperiority, false);
assert.deepEqual(routingGeometryBrowserHistory.checks.map(e=>e.application), ['backup','automation','sketch']);
assert.ok(routingGeometryBrowserHistory.checks.every(e=>e.passed === true));
const routingGeometryBrowserSources = new Map();
for (const entry of [...routingGeometryBrowserHistory.sourceSnapshots,...routingGeometryBrowserHistory.receipts,...routingGeometryBrowserHistory.artifacts]) {
  safeRecordPath(entry.path); safeRecordPath(entry.sourcePath);
  const bytes = readFileSync(join(root,routingGeometryBrowserMilestone,entry.path)); assert.equal(bytes.length,entry.bytes); assert.equal(sha(bytes),entry.sha256,`Frozen routing/geometry browser artifact changed: ${entry.path}`);
}
for (const entry of routingGeometryBrowserHistory.sourceSnapshots) { assert.ok(!routingGeometryBrowserSources.has(entry.sourcePath)); routingGeometryBrowserSources.set(entry.sourcePath,entry); }
function routingGeometryCheckpointFingerprint(entry,label) {
  safeRecordPath(entry.path); const bytes=readFileSync(join(root,entry.path));
  if (sha(bytes)===entry.sha256) { if (entry.bytes!==undefined) assert.equal(bytes.length,entry.bytes); return; }
  const snapshot=routingGeometryBrowserSources.get(entry.path); assert.ok(snapshot,`Missing frozen routing/geometry ${label} source: ${entry.path}`); assert.equal(snapshot.sha256,entry.sha256,`Frozen routing/geometry ${label} source disagrees: ${entry.path}`); if(entry.bytes!==undefined)assert.equal(snapshot.bytes,entry.bytes);
}
function strictIndependentReview(prefix,count,digest) {
  const manifestBytes=readFileSync(join(root,prefix,'preservation-manifest.json')); assert.equal(sha(manifestBytes),digest);
  const record=JSON.parse(manifestBytes); assert.equal(record.schema,'rea-independent-integration-review-preservation/v1'); assert.equal(record.snapshots.length,count);
  const paths=new Set(); for(const entry of record.snapshots){safeRecordPath(entry.path);safeRecordPath(entry.sourcePath);assert.ok(!paths.has(entry.path));paths.add(entry.path);const b=readFileSync(join(root,prefix,entry.path));assert.equal(b.length,entry.bytes);assert.equal(sha(b),entry.sha256);}
  const reviewed=record.snapshots.find(e=>e.sourcePath==='review-validation.json'); assert.ok(reviewed); assert.equal(reviewed.sha256,record.reviewReceiptSha256); return record;
}
const routingIndependentReview=strictIndependentReview('products/rea-studio/apps/automation/results/routing-independent-review',53,'a20637baddf880f1ac6a5abe60fb9d0c789002b39ef257514742cb40fd8bf6ce');
const geometryIndependentReview=strictIndependentReview('products/rea-studio/apps/sketch/results/geometry-independent-review',118,'41beb403231ce3eabd55b65b56e02f5dfc2c03362919eb3733058d9a71e8a2f0');
const sketchCollectorIndependentReview=strictIndependentReview('products/rea-studio/apps/sketch/results/collector-followup/independent-review',21,'cddda4394e9951e2fc0b469feb5145bceb1df842bea147c5fb89c6ad86061b83');
const automationRecoveryIndependentReview=strictIndependentReview('products/rea-studio/apps/automation/results/recovery-followup/independent-review',57,'770d9baed9b3784597d37b04621ec8c3fe3a8674066e75ecbf01e5f74c3b7d25');
function strictFollowupPreservation(prefix,count,digest,schema) {
  const bytes=readFileSync(join(root,prefix,'preservation-manifest.json'));assert.equal(sha(bytes),digest);
  const record=JSON.parse(bytes);assert.equal(record.schema,schema);assert.equal(record.snapshots.length,count);
  const paths=new Set(),sources=new Map();for(const entry of record.snapshots){safeRecordPath(entry.path);safeRecordPath(entry.sourcePath);assert.ok(!paths.has(entry.path));assert.ok(!sources.has(entry.sourcePath));paths.add(entry.path);sources.set(entry.sourcePath,entry);const b=readFileSync(join(root,prefix,entry.path));assert.equal(b.length,entry.bytes);assert.equal(sha(b),entry.sha256,`Frozen followup artifact changed: ${entry.path}`);}
  return {...record,sources};
}
const sketchCollectorStage=strictFollowupPreservation('products/rea-studio/apps/sketch/results/collector-followup',54,'b5346f5d96e41a707823bef3be721f0d8427576f39bdd52d480d980988661bb9','rea-sketch-collector-followup-preservation/v1');
const sketchCollectorAdapter=strictFollowupPreservation('products/rea-studio/apps/sketch/results/collector-followup/production-adapter',27,'8117c71aa9e7c6650092f6fff85a72ca3a6c0d5817aec4b65bc222a934f9ee62','rea-sketch-collector-production-adapter-preservation/v1');
const automationRecoveryStage=strictFollowupPreservation('products/rea-studio/apps/automation/results/recovery-followup',340,'585f80b40c72d6968c4e678d7e7282b2a73e70bd29e92ed36a24c8209038f0a8','rea-automation-recovery-followup-preservation/v1');
const failedCombinedPrefix='products/rea-studio/results/full-suite-recovery-followup/failed-607';
const failedCombinedPreservation=strictFollowupPreservation(failedCombinedPrefix,14,'dd18296291e1524a0d25281e62d1a9b3cb0befdabd3e49d404292e0daca8ac96','rea-failed-combined-suite-source-preservation/v1');
const failedCombined=JSON.parse(readFileSync(join(root,failedCombinedPrefix,'failure-validation.json')));
assert.equal(failedCombined.schema,'rea-failed-combined-suite-preservation/v1');assert.equal(failedCombined.exitCode,1);assert.deepEqual(failedCombined.summary,{tests:607,pass:605,fail:2,cancelled:0,skipped:0,todo:0,duration_ms:484894.5263});assert.equal(failedCombined.passingDevelopmentReceiptOverwritten,false);assert.equal(failedCombined.fullFeatureParity,false);assert.equal(failedCombined.universalSuperiority,false);assert.match(failedCombined.sourceCaptureRole,/post-failure/);assert.match(failedCombined.sourceCaptureRole,/does NOT claim full source stability/);
const keepassSupplementPrefix='products/rea-studio/requirements/keepass-manual-supplement';
const keepassSupplementManifestBytes=readFileSync(join(root,keepassSupplementPrefix,'preservation-manifest.json'));assert.equal(sha(keepassSupplementManifestBytes),'9516c137138a29567e4aaff9dfe9428b1471922db586a7b341281916cfe285b2');
const keepassSupplementManifest=JSON.parse(keepassSupplementManifestBytes);assert.equal(keepassSupplementManifest.schema,'rea-keepass-public-supplement-preservation/v1');assert.equal(keepassSupplementManifest.files.length,9);
const keepassSupplementPaths=new Set();for(const e of keepassSupplementManifest.files){safeRecordPath(e.path);assert.ok(!keepassSupplementPaths.has(e.path));keepassSupplementPaths.add(e.path);const b=readFileSync(join(root,keepassSupplementPrefix,e.path));assert.equal(b.length,e.bytes);assert.equal(sha(b),e.sha256);}
assert.deepEqual(readdirSync(join(root,keepassSupplementPrefix)).sort(),[...keepassSupplementPaths,'preservation-manifest.json'].sort());
assert.equal(keepassSupplementManifest.fullManualOrCarriersIncluded,false);assert.equal(keepassSupplementManifest.quotedSelectorsIncluded,false);assert.equal(keepassSupplementManifest.originalRuntimeExecutions,0);assert.equal(keepassSupplementManifest.candidateAcceptanceExecutions,0);
const keepassSupplement=JSON.parse(readFileSync(join(root,keepassSupplementPrefix,'manual-contracts.json'))),keepassSupplementBinding=JSON.parse(readFileSync(join(root,keepassSupplementPrefix,'existing-requirements-binding.json'))),keepassCensus=JSON.parse(readFileSync(join(root,keepassSupplementPrefix,'carrier-census-manifest.json'))),keepassSupplementLicense=JSON.parse(readFileSync(join(root,keepassSupplementPrefix,'license-provenance.json')));
assert.equal(keepassSupplement.requirements.length,199);assert.equal(new Set(keepassSupplement.requirements.map(e=>e.id)).size,199);assert.deepEqual(keepassSupplement.requirements.map(e=>e.id),keepassSupplementManifest.stableIds);assert.equal(keepassSupplement.counts.selectedTopics,10);assert.equal(keepassSupplement.accounting.independentFeatureCountClaimed,false);assert.equal(keepassSupplementBinding.originalSourceFingerprintCount,159);assert.equal(keepassSupplementBinding.capabilityAreaIdCount,232);assert.equal(keepassSupplementBinding.existingRecordsModified,false);assert.equal(keepassCensus.files.length,139);assert.equal(keepassCensus.htmlTopics.length,45);assert.equal(keepassCensus.fullManualRedistributed,false);assert.equal(keepassSupplementLicense.documentationRedistributionGrantEstablished,false);
const keepassSupplementValidationBytes=readFileSync(join(root,keepassSupplementPrefix,'public-subset-validation.json'));assert.equal(sha(keepassSupplementValidationBytes),'0a6a55197a153c23b71f1d3e5666073f8e51091870a6c78717141c48ac4c9154');const keepassSupplementValidation=JSON.parse(keepassSupplementValidationBytes);assert.equal(keepassSupplementValidation.schema,'rea-keepass-public-supplement-validation/v1');assert.equal(keepassSupplementValidation.passed,true);assert.deepEqual(keepassSupplementValidation.documentationIntegrityChecks,{localManual:9,publicSupplement:6,total:15,pass:15,skips:0});assert.equal(keepassSupplementValidation.originalKeePassExecutions,0);assert.equal(keepassSupplementValidation.candidateAcceptanceExecutions,0);assert.equal(keepassSupplementValidation.exhaustiveAtomicDiscovery,false);assert.equal(keepassSupplementValidation.sourceBytesStable,true);assert.equal(keepassSupplementValidation.manualBytesStable,true);
const nativePolicyPrefix='products/rea-studio/apps/backup/results/native-policy-followup';
const keepassIndependentPrefix='products/rea-studio/requirements/keepass-manual-independent-review';const keepassIndependentManifestBytes=readFileSync(join(root,keepassIndependentPrefix,'preservation-manifest.json'));assert.equal(sha(keepassIndependentManifestBytes),'d7f9bd9150692ee3886a18a5da3ddd59f8fb9eb4d059311eff43d097e8589a18');const keepassIndependentManifest=JSON.parse(keepassIndependentManifestBytes);assert.equal(keepassIndependentManifest.schema,'rea-keepass-independent-review-public-subset/v1');assert.equal(keepassIndependentManifest.files.length,4);assert.equal(keepassIndependentManifest.originalFrozenReviewInventoryFiles,24);assert.deepEqual(readdirSync(join(root,keepassIndependentPrefix)).sort(),[...keepassIndependentManifest.files.map(e=>e.path),'preservation-manifest.json'].sort());for(const e of keepassIndependentManifest.files)currentPublicFingerprint({...e,path:keepassIndependentPrefix+'/'+e.path},'Independent KeePass documentary subset');const keepassIndependentBytes=readFileSync(join(root,keepassIndependentPrefix,'review-validation.json'));assert.equal(sha(keepassIndependentBytes),'d199c4bfacc2a7ca6c3d85dfc11a6cdae9d6b98fb385f8be15ea4bff2a049bd2');const keepassIndependent=JSON.parse(keepassIndependentBytes);assert.equal(keepassIndependent.status,'passed');assert.equal(keepassIndependent.publicSubsetManifestSHA256,sha(keepassSupplementManifestBytes));assert.equal(keepassIndependent.selectedRecords,199);assert.equal(keepassIndependent.citationsAndContextsChecked,207);assert.equal(keepassIndependent.carrierFilesAuthenticated,139);assert.equal(keepassIndependent.historicalSourceFingerprintBindings,159);assert.equal(keepassIndependent.historicalCapabilityIdBindings,232);assert.deepEqual(keepassIndependent.integrationBlockersFound,[]);assert.equal(keepassIndependent.subsetSourceBeforeAndAfterStable,true);assert.equal(keepassIndependent.referencedSourcesStable,true);assert.equal(keepassIndependent.originalKeePassExecutions,0);assert.equal(keepassIndependent.candidateAcceptanceExecutions,0);assert.equal(keepassIndependent.fullProductComplete,false);assert.equal(keepassIndependent.exhaustiveCoverage,false);
const nativePolicyManifestBytes=readFileSync(join(root,nativePolicyPrefix,'preservation-manifest.json'));assert.equal(sha(nativePolicyManifestBytes),'b1fc5e21691dbcaf7f08225b17d7f9fc723fad6e2cd3053ebb15554720264031');const nativePolicyManifest=JSON.parse(nativePolicyManifestBytes);assert.equal(nativePolicyManifest.schema,'rea-backup-native-policy-preservation/v1');assert.equal(nativePolicyManifest.snapshots.length,43);const nativePolicyPaths=new Set();for(const e of nativePolicyManifest.snapshots){safeRecordPath(e.path);assert.ok(!nativePolicyPaths.has(e.path));nativePolicyPaths.add(e.path);const b=readFileSync(join(root,nativePolicyPrefix,e.path));assert.equal(b.length,e.bytes);assert.equal(sha(b),e.sha256);}
const nativePolicyBytes=readFileSync(join(root,nativePolicyPrefix,'validation.json'));assert.equal(sha(nativePolicyBytes),'b3cf4b627f73a13da8a20511a4c6a6381b9a47291d70ec561d945aa8436584d1');assert.equal(sha(nativePolicyBytes),nativePolicyManifest.validationSHA256);const nativePolicy=JSON.parse(nativePolicyBytes);assert.equal(nativePolicy.schema,'rea-backup-native-policy-validation/v1');assert.deepEqual(nativePolicy.summary,{tests:30,pass:30,fail:0,cancelled:0,skipped:0,todo:0});assert.equal(nativePolicy.exitCode,0);assert.equal(nativePolicy.sourceStable,true);assert.equal(nativePolicy.implementationFingerprints.length,36);
for(const e of nativePolicy.implementationFingerprints){rabinRoutingGeometryFingerprint({...e,path:'products/rea-studio/'+e.path},'Historical a563 Backup native policy source');const frozen=nativePolicyManifest.snapshots.find(item=>item.path==='source/'+e.path+'.snapshot');assert.ok(frozen);assert.equal(frozen.bytes,e.bytes);assert.equal(frozen.sha256,e.sha256);}
assert.equal(nativePolicy.adaptation.runtimeChanged,false);assert.equal(nativePolicy.adaptation.packAggregationIntegrated,false);assert.equal(nativePolicy.adaptation.existingOriginalCheckRestoreAssertionsRetained,true);assert.equal(nativePolicy.fullParity,false);assert.equal(nativePolicy.universalSuperiority,false);assert.equal(nativePolicy.failedCombinedSuite.sha256,'dd18296291e1524a0d25281e62d1a9b3cb0befdabd3e49d404292e0daca8ac96');assert.equal(nativePolicy.failedCombinedSuite.postFailureSourceCaptureOnly,true);
const nativePolicyAttempt=JSON.parse(readFileSync(join(root,nativePolicyPrefix,'attempt.json')));assert.deepEqual(nativePolicyAttempt.before,nativePolicyAttempt.after);assert.deepEqual(nativePolicyAttempt.before,nativePolicy.implementationFingerprints);assert.equal(nativePolicyAttempt.exitCode,0);assert.equal(nativePolicyAttempt.failure,null);assert.equal(sha(readFileSync(join(root,nativePolicyPrefix,'verify-backup-native-policy.mjs.snapshot'))),nativePolicy.runnerSHA256);assert.equal(nativePolicy.observations.length,4);for(const e of nativePolicy.observations.filter(e=>e.phase==='first-snapshot')){assert.equal(e.totalPacks,6);assert.equal(e.dataPacks,2);assert.equal(e.uniqueDataBlobs,2);assert.equal(e.dataRows.length,2);assert.equal(e.allStorageHeaderPayloadAndIndexVerified,true);}for(const e of nativePolicy.observations.filter(e=>e.phase==='repeat-snapshot')){assert.equal(e.addedDataPacks,0);assert.equal(e.addedDataRows,0);}
const recoveryBrowserPrefix='products/rea-studio/results/browser-automation-recovery-20261012/';
const packAggregationPrefix='products/rea-studio/apps/backup/results/pack-aggregation-followup/';
const packAggregationStage=strictFollowupPreservation(packAggregationPrefix,678,'77228c9ebbac44fa66f5eac9adab810038da21b46c57749098dec9ed4daa32e0','rea-backup-pack-aggregation-preservation/v1');
assert.equal(packAggregationStage.historicalSourceRevision,'a56332e9ddb6413cb33c580be137743a748fd5f9');
assert.deepEqual(packAggregationStage.frozenStageTests,{main:66,adapter:33,guard:54});
assert.equal(packAggregationStage.fullFeatureParity,false);assert.equal(packAggregationStage.universalSuperiority,false);
assert.equal(packAggregationStage.copies.length,7);for(const e of packAggregationStage.copies)currentPublicFingerprint(e,'Current guarded pack aggregation source');
const failedPack116Prefix=packAggregationPrefix+'failed-116/',failedPack116Bytes=readFileSync(join(root,failedPack116Prefix,'preservation-manifest.json'));assert.equal(sha(failedPack116Bytes),'4a2a3a864473a8fcecfac0f178475cd6632a1e70a9819691894fa1d06348db9e');const failedPack116=JSON.parse(failedPack116Bytes);assert.equal(failedPack116.schema,'rea-backup-failed-pack-116-preservation/v1');assert.equal(failedPack116.snapshots.length,47);assert.deepEqual(failedPack116.summary,{tests:116,pass:115,fail:1,cancelled:0,skipped:0,todo:0});assert.equal(failedPack116.sourceStable,true);assert.equal(failedPack116.passingReceiptOverwritten,false);const failedPack116Paths=new Set();for(const e of failedPack116.snapshots){safeRecordPath(e.path);assert.ok(!failedPack116Paths.has(e.path));failedPack116Paths.add(e.path);currentPublicFingerprint({...e,path:failedPack116Prefix+e.path},'Failed 115/116 aggregate pack integration');}const failedPack116Attempt=JSON.parse(readFileSync(join(root,failedPack116Prefix,'attempt.json')));assert.deepEqual(failedPack116Attempt.before,failedPack116Attempt.after);assert.equal(failedPack116Attempt.before.length,41);assert.equal(failedPack116Attempt.exitCode,1);assert.deepEqual(failedPack116Attempt.summary,failedPack116.summary);assert.equal(failedPack116Attempt.failure,null);
function strictProductionRun(prefix,digest,count,schema){const bytes=readFileSync(join(root,prefix,'integration-run-manifest.json'));assert.equal(sha(bytes),digest);const record=JSON.parse(bytes);assert.equal(record.schema,schema);assert.equal(record.retained.length,count);assert.equal(record.exactCopies,true);const paths=new Set();for(const e of record.retained){safeRecordPath(e.path);assert.ok(!paths.has(e.path));paths.add(e.path);currentPublicFingerprint({...e,path:prefix+e.path},'Current production run artifact');}return record;}
const packCollectorFailurePrefix=packAggregationPrefix+'collector-failed-64/',packCollectorFailureBytes=readFileSync(join(root,packCollectorFailurePrefix,'preservation-manifest.json'));assert.equal(sha(packCollectorFailureBytes),'4cd723fa5998643e2b327ea8173901723c06f17c699c52bda1890c64374b4a02');const packCollectorFailure=JSON.parse(packCollectorFailureBytes);assert.equal(packCollectorFailure.schema,'rea-backup-collector-failed-64-preservation/v1');assert.equal(packCollectorFailure.snapshots.length,50);assert.equal(packCollectorFailure.childSummary.pass,64);assert.equal(packCollectorFailure.childExitCode,0);assert.equal(packCollectorFailure.collectorExitCode,1);assert.equal(packCollectorFailure.sourceStable,true);assert.equal(packCollectorFailure.behaviourFailureClaimed,false);for(const e of packCollectorFailure.snapshots)currentPublicFingerprint({...e,path:packCollectorFailurePrefix+e.path},'Preserved escaped-diagnostic reader failure');
const packIntegrationRun=strictProductionRun(packAggregationPrefix,'4af50666e5d5ceadf2a4e7a7105b95f1838d9e15b435ded77c46e95e45dc8f84',55,'rea-backup-pack-integration-run-preservation/v1');const packIntegrationBytes=readFileSync(join(root,packAggregationPrefix,'integration-validation.json'));assert.equal(sha(packIntegrationBytes),'3e89c19946743ceb541f91cbf9b224f12e36718a6b88187f4c7de76918db9594');assert.equal(sha(packIntegrationBytes),packIntegrationRun.receiptSHA256);const packIntegration=JSON.parse(packIntegrationBytes);assert.equal(packIntegration.schema,'rea-backup-pack-integration-validation/v1');assert.deepEqual(packIntegration.summary,{tests:64,pass:64,fail:0,cancelled:0,skipped:0,todo:0});assert.equal(packIntegration.exitCode,0);assert.equal(packIntegration.sourceStable,true);assert.equal(packIntegration.implementationFingerprints.length,42);for(const e of packIntegration.implementationFingerprints)namedHistoricalHostFingerprint({...e,path:'products/rea-studio/'+e.path},'Backup64 nonhost current source');assert.deepEqual(packIntegration.selectedTests,packIntegration.arguments.slice(3));assert.equal(packIntegration.selectedTests.length,6);assert.equal(packIntegration.collectorRecovery.behaviourTestsRerun,false);assert.equal(packIntegration.collectorRecovery.failedCollectorPreservationSHA256,sha(packCollectorFailureBytes));assert.equal(packIntegration.collectorRecovery.tapHelperSHA256,'a7068f3e4d8db328636e2daa1e9cd55a7c5d7327320f19edeedc88ed28466dba');assert.equal(packIntegration.metadataCorrection.behaviourOrCountsChanged,false);assert.equal(packIntegration.metadataCorrection.behaviourTestsRerun,false);assert.equal(packIntegration.metadataCorrection.previousReceiptSHA256,'d3d8df025eb9de145b3585d19d42e5199f112da7d2de382fb8d3f04a4a14aebc');for(const gate of ['fullParity','universalSuperiority','performanceCompared'])assert.equal(packIntegration[gate],false);assert.equal(packIntegration.observations.ownership.length,17);assert.equal(packIntegration.observations.host.length,1);assert.equal(packIntegration.observations.host[0].commands.length,2);assert.equal(packIntegration.observations.compressionOriginal.length,17);assert.equal(packIntegration.observations.corruptPack.length,5);
const notebooksPrefix='products/rea-studio/apps/notes/results/notebooks-followup/',notebooksPreservation=strictFollowupPreservation(notebooksPrefix,372,'972d6a3b06ddf435bd9cdbae156458002d48d7d6484c368a74aec8a8f7ab1549','rea-notebook-integration-preservation/v1');assert.equal(notebooksPreservation.exactStageArtifacts,283);assert.equal(notebooksPreservation.copies.length,291);assert.equal(notebooksPreservation.adaptedRuntimeAndTestFiles,7);assert.equal(notebooksPreservation.historicalJoplin22ReceiptUnchanged,true);for(const e of notebooksPreservation.copies)published455Fingerprint(e,'Historical455 Notebook runtime or inert original artifact');const notebooksRun=strictProductionRun(notebooksPrefix,'797d328034a6093515a6676db64676c8fcdf12f4e32b28beea9c7a0ed2f48cb3',30,'rea-notebook-production-run-preservation/v1');const notebooksReceiptBytes=readFileSync(join(root,notebooksPrefix,'integration-validation.json'));assert.equal(sha(notebooksReceiptBytes),'854f4885e1757093fdd36dc7265f76405c2afd4af26e0169b928fc92511aa0b8');assert.equal(sha(notebooksReceiptBytes),notebooksRun.receiptSHA256);const notebooksReceipt=JSON.parse(notebooksReceiptBytes);assert.equal(notebooksReceipt.schema,'rea-notebook-production-integration-validation/v1');assert.deepEqual(notebooksReceipt.summary,{tests:28,pass:28,fail:0,cancelled:0,skipped:0,todo:0});assert.equal(notebooksReceipt.additionalHeldPersistenceCases,2);assert.equal(notebooksReceipt.scenarioBodiesUnchanged,true);assert.equal(notebooksReceipt.sourceStable,true);assert.equal(notebooksReceipt.implementationFingerprints.length,19);for(const e of notebooksReceipt.implementationFingerprints)published455Fingerprint({...e,path:'products/rea-studio/'+e.path},'Historical455 installed Notebook source');assert.equal(notebooksReceipt.originalAccounting.exactComparisons,26);assert.equal(notebooksReceipt.originalAccounting.additionalOriginalMoveContractExecutions,2);assert.equal(notebooksReceipt.originalAccounting.originalGuiExecutions,0);assert.equal(notebooksReceipt.originalAccounting.originalFullApplicationExecutions,0);assert.equal(notebooksReceipt.originalAccounting.fixedClockAndMemoryPersistenceStubs,true);assert.equal(notebooksReceipt.historicalJoplin22ReceiptRebound,false);assert.equal(notebooksReceipt.fullProductParity,false);assert.equal(notebooksReceipt.universalSuperiority,false);
const recoveryBrowserPreservation=strictFollowupPreservation(recoveryBrowserPrefix,45,'073b6026cc188ce17af4577efe8d1cde04010e1a8714d79b221e46434ae566b2','rea-automation-recovery-browser-preservation/v1');
const recoveryBrowserBytes=readFileSync(join(root,recoveryBrowserPrefix,recoveryBrowserPreservation.receipt.path));assert.equal(recoveryBrowserBytes.length,recoveryBrowserPreservation.receipt.bytes);assert.equal(sha(recoveryBrowserBytes),recoveryBrowserPreservation.receipt.sha256);assert.equal(sha(recoveryBrowserBytes),'e5108900362a9473fc9958a38ba5cdf0eb96fbf9d53f4495d0d3f17569683bd1');
const recoveryBrowser=JSON.parse(recoveryBrowserBytes);assert.equal(recoveryBrowser.schema,'rea-automation-recovery-browser-validation/v1');assert.deepEqual(recoveryBrowser.summary,{checks:5,passed:5,failed:0});assert.equal(recoveryBrowser.sourceFingerprints.length,41);assert.ok(recoveryBrowser.checks.every(e=>e.passed));assert.equal(recoveryBrowser.sourceBytesStable,true);for(const e of recoveryBrowser.sourceFingerprints)namedHistoricalHostFingerprint(e,'Automation recovery browser nonhost current source');for(const e of recoveryBrowser.artifacts)currentPublicFingerprint({...e,path:recoveryBrowserPrefix+e.path},'Current recovery browser artifact');assert.equal(recoveryBrowser.fullFeatureParity,false);assert.equal(recoveryBrowser.universalSuperiority,false);
const notebooksBrowserPrefix='products/rea-studio/results/browser-notebooks-20261012/';
const notebooksBrowserManifestBytes=readFileSync(join(root,notebooksBrowserPrefix,'preservation-manifest.json'));
assert.equal(sha(notebooksBrowserManifestBytes),'2dbbe40d2c452711ca18f9f4acfe92dc9bad99ac8cd13e1ae26fb6cbf83e25d7');
const notebooksBrowserManifest=JSON.parse(notebooksBrowserManifestBytes);
assert.equal(notebooksBrowserManifest.schema,'rea-notebook-browser-preservation/v1');
assert.equal(notebooksBrowserManifest.snapshots.length,28);
const notebooksBrowserPaths=new Set();
for(const entry of notebooksBrowserManifest.snapshots){safeRecordPath(entry.path);if(entry.path.startsWith('source/'))assert.ok(entry.path.endsWith('.snapshot'));assert.ok(!notebooksBrowserPaths.has(entry.path));notebooksBrowserPaths.add(entry.path);currentPublicFingerprint({...entry,path:notebooksBrowserPrefix+entry.path},'Installed Notes browser artifact');}
const notebooksBrowserBytes=readFileSync(join(root,notebooksBrowserPrefix,'validation.json'));
assert.equal(sha(notebooksBrowserBytes),'c36e4df438fe48f09cecca9f524d00bf7ab52a96f2604b79affefee8e5489bc5');
assert.equal(sha(notebooksBrowserBytes),notebooksBrowserManifest.receiptSHA256);
assert.equal(notebooksBrowserManifest.sourceStable,true);assert.equal(notebooksBrowserManifest.syntheticOnly,true);assert.equal(notebooksBrowserManifest.fullProductParity,false);assert.equal(notebooksBrowserManifest.universalSuperiority,false);
const notebooksBrowser=JSON.parse(notebooksBrowserBytes);
assert.equal(notebooksBrowser.schema,'rea-notebook-production-browser-validation/v1');
assert.deepEqual(notebooksBrowser.summary,{checks:11,passed:11,failed:0});
assert.equal(notebooksBrowser.checks.length,11);assert.ok(notebooksBrowser.checks.every(e=>e.passed));
assert.equal(notebooksBrowser.sourceFingerprints.length,19);
for(const entry of notebooksBrowser.sourceFingerprints){published455Fingerprint({...entry,path:'products/rea-studio/'+entry.path},'Historical455 Notes browser source');const frozen=notebooksBrowserManifest.snapshots.find(e=>e.path==='source/'+entry.path+'.snapshot');assert.ok(frozen);assert.equal(frozen.bytes,entry.bytes);assert.equal(frozen.sha256,entry.sha256);}
for(const gate of ['sourceBytesStable','actualBrowser','syntheticOnly','browserReloadPerformed','finalStateAssertionsPassed','finalScreenshotVisuallyInspected'])assert.equal(notebooksBrowser[gate],true);
for(const gate of ['hostRestartPerformed','intermediateUIStatesRetainedAsLocalFiles','fullProductParity','comparativeUsabilityStudyPerformed','universalSuperiority'])assert.equal(notebooksBrowser[gate],false);
const vaultDocsPrefix='products/rea-studio/results/vault-history-docs-followup/';
const vaultDocs=strictFollowupPreservation(vaultDocsPrefix,30,'ff39128068c11fecbe95dc14454649d05cf4681ed5b6cf6397b553a505a77ffa','rea-vault-history-docs-preservation/v1');
assert.equal(vaultDocs.metadataCorrection.previousPreservationManifestSHA256,'c154da35c52bdefb4498386e53b76dee15c9cb3aad8052b2e24fcd060bb093ca');assert.equal(vaultDocs.metadataCorrection.sourceOrDocumentationBytesChanged,false);assert.equal(vaultDocs.metadataCorrection.behaviorTestsRerun,false);
assert.equal(vaultDocs.documentationOnly,true);assert.equal(vaultDocs.runtimeChanges,0);assert.equal(vaultDocs.testChanges,0);assert.equal(vaultDocs.originalEvidenceRebound,false);assert.equal(vaultDocs.newBehavioralExecutions,0);assert.deepEqual(vaultDocs.carrierProseCorrection,{oldFrozenBundleProseCount:4,currentTotalLocalOnlyCarriers:12,namedZipCopies:4,acquisitionCopies:8});
assert.equal(vaultDocs.copies.length,2);for(const entry of vaultDocs.copies)published455Fingerprint(entry,'Historical455 Vault documentation');currentPublicFingerprint(vaultDocs.previousReadme,'Exact previous Vault README');assert.equal(vaultDocs.previousReadme.sha256,'f1d508dddf2fd2a1772a5abdaa99db9cfe2654ff2dbd1bb17cdf4369851a75cf');
const vaultInstallationReview=strictIndependentReview('products/rea-studio/results/vault-history-integration-independent-review',9,'97c95c26dc40f420774a269b4c1ff756c5503f96976497eb5069696467120170');
assert.equal(vaultInstallationReview.reviewReceiptSha256,'2ce8c65b1c03e9bc0427b01ed7cd1805f42a26438c65bd47c6d514c843757de8');
const vaultHistoryPrefix='products/rea-studio/apps/vault/results/history-followup/production-integration/';
const vaultInstallationBytes=readFileSync(join(root,vaultHistoryPrefix,'installation-manifest.json'));
assert.equal(sha(vaultInstallationBytes),'7427b0c6582a3c2788c536fada88b37385a4b614913fc737dd2333f35bb9521a');
const vaultInstallation=JSON.parse(vaultInstallationBytes);
assert.equal(vaultInstallation.schema,'rea-vault-history-installation-preservation/v1');assert.equal(vaultInstallation.liveAppFiles,23);assert.equal(vaultInstallation.inertEvidenceFiles,1656);assert.equal(vaultInstallation.copies.length,1679);assert.equal(vaultInstallation.retained.length,11);
assert.equal(vaultInstallation.bundleManifestSHA256,'5a27d0e6e4c3772ef79bd46cc6b748e86775f3424719c6db4c690c670ae90758');assert.equal(vaultInstallation.bundleReceiptSHA256,'68d8ff9eefa9b56ecbb86b5d1fd74cd33861cd2bc82aa3713a0c098d63f642ab');assert.equal(vaultInstallation.copyListSHA256,'7469f024f5c802b31cf59c568ba1b22f4e797042e7cf9a9bf2ef1f9b5b5f504b');
assert.equal(vaultInstallation.old18CompatibilityReceiptUnchanged,true);assert.equal(vaultInstallation.acceptedRuntimeByteIdentical,true);assert.equal(vaultInstallation.newBehavioralExecutionsDuringInstallation,0);
for(const gate of ['publicSourceArchivesIncluded','publicOriginalExecutablesOrLibrariesIncluded','fullProductParity','universalSuperiority'])assert.equal(vaultInstallation[gate],false);
const vaultInstallationPaths=new Set();for(const entry of vaultInstallation.copies){safeRecordPath(entry.path);assert.ok(entry.path.startsWith('products/rea-studio/apps/vault/'));assert.ok(!entry.path.split('/').includes('.local'));assert.ok(!vaultInstallationPaths.has(entry.path));vaultInstallationPaths.add(entry.path);if(entry.path==='products/rea-studio/apps/vault/README.md'){assert.equal(entry.sha256,vaultDocs.previousReadme.sha256);assert.equal(entry.bytes,vaultDocs.previousReadme.bytes);}else published455Fingerprint(entry,'Historical455 Vault runtime/evidence');}
for(const entry of vaultInstallation.retained)currentPublicFingerprint({...entry,path:vaultHistoryPrefix+entry.path},'Vault original integration bundle metadata');
const vaultPublicStage=JSON.parse(readFileSync(join(root,'products/rea-studio/apps/vault/results/history-followup/preservation-manifest.json')));
assert.equal(vaultPublicStage.schema,'rea-vault-history-public-production-path-preservation/v1');assert.equal(vaultPublicStage.count,1454);assert.equal(vaultPublicStage.publicInertSnapshots,1442);assert.equal(vaultPublicStage.localCarriers,12);assert.equal(vaultPublicStage.files.length,1454);assert.equal(vaultPublicStage.originalManifestSha256,'52e8294fd06887d49b76f315a67d4aa05e4fcfc9744ab4e96de94763872389b5');assert.equal(vaultPublicStage.originalReceiptSha256,'1e6426ecdc9aebccd6aea57c8211540096897b1561547a0e7b4960d84a9f82d3');
const publicVaultSources=vaultPublicStage.files.filter(e=>e.kind==='public-inert-snapshot');assert.equal(publicVaultSources.length,1442);for(const entry of publicVaultSources){safeRecordPath(entry.preservedPath);assert.ok(entry.preservedPath.endsWith('.snapshot'));assert.ok(!entry.preservedPath.split('/').includes('.local'));currentPublicFingerprint({...entry,path:entry.preservedPath},'Exact frozen Vault final source/artifact');}
const vaultHistoryRun=strictProductionRun(vaultHistoryPrefix,'51cba056fde4b7322534a3e0ba76aa4f1da262cf41a09259ad3a7cc8f223225a',44,'rea-vault-history-production-run-preservation/v1');
const vaultHistoryBytes=readFileSync(join(root,vaultHistoryPrefix,'integration-validation.json'));assert.equal(sha(vaultHistoryBytes),'a5883d66bd314c0b5ae1a741ea39dec4767bf9b86b2ed39ce7a52cbdecfabc6c');assert.equal(sha(vaultHistoryBytes),vaultHistoryRun.receiptSHA256);
const vaultHistory=JSON.parse(vaultHistoryBytes);assert.equal(vaultHistory.schema,'rea-vault-history-production-integration-validation/v1');assert.deepEqual(vaultHistory.summary,{tests:41,pass:41,fail:0,cancelled:0,skipped:0,todo:0});assert.equal(vaultHistory.exitCode,0);assert.equal(vaultHistory.sourceStable,true);assert.equal(vaultHistory.implementationFingerprints.length,34);for(const entry of vaultHistory.implementationFingerprints)published455Fingerprint({...entry,path:'products/rea-studio/'+entry.path},'Historical45541 Vault history source');assert.equal(vaultHistory.originalAccounting.assemblyLoads,24);assert.equal(vaultHistory.originalAccounting.originalGuiExecutions,0);assert.equal(vaultHistory.originalAccounting.originalFullApplicationExecutions,0);assert.equal(vaultHistory.originalAccounting.originalTouchExecutions,0);assert.equal(vaultHistory.candidateAccounting.domElementModelGroups,25);assert.equal(vaultHistory.candidateAccounting.hostProcesses,5);assert.equal(vaultHistory.candidateAccounting.actualBrowserExecutions,0);assert.equal(vaultHistory.normalTestsWriteAppResults,false);assert.equal(vaultHistory.historical18CompatibilityRebound,false);for(const gate of ['fullProductParity','securityParity','universalSuperiority'])assert.equal(vaultHistory[gate],false);
const metricsDispatchPrefix='products/rea-studio/results/metrics-dispatch-observations-20261012/';
const metricsSelectorPrefix='products/rea-studio/results/metrics-selector-observations-20261012/',metricsSelectorManifestBytes=readFileSync(join(root,metricsSelectorPrefix,'preservation-manifest.json'));assert.equal(sha(metricsSelectorManifestBytes),'ca303cb73784e197557b3b626fa437d8b5775afe7448e6c6a5d097e9fad6286d');const metricsSelectorManifest=JSON.parse(metricsSelectorManifestBytes);assert.equal(metricsSelectorManifest.schema,'rea-metrics-selector-observation-preservation/v1');assert.equal(metricsSelectorManifest.snapshots.length,1043);assert.equal(metricsSelectorManifest.copies.length,9);assert.equal(metricsSelectorManifest.excludedLocalArchives.length,2);assert.equal(metricsSelectorManifest.selectedForIntegration,null);for(const gate of ['productionChanged','productionIntegrated','fullProductComplete','performanceParityEstablished','universalSuperiority'])assert.equal(metricsSelectorManifest[gate],false);const metricsSelectorPaths=new Set(),metricsSelectorSourcePaths=new Set();for(const e of [...metricsSelectorManifest.snapshots,...metricsSelectorManifest.copies,metricsSelectorManifest.readme]){safeRecordPath(e.path);assert.ok(!metricsSelectorPaths.has(e.path));metricsSelectorPaths.add(e.path);currentPublicFingerprint({...e,path:metricsSelectorPrefix+e.path},'Rejected selector measured study');}for(const e of metricsSelectorManifest.snapshots){safeRecordPath(e.sourcePath);assert.ok(!metricsSelectorSourcePaths.has(e.sourcePath));metricsSelectorSourcePaths.add(e.sourcePath);assert.equal(e.path,'stage/'+e.sourcePath+'.snapshot');}
const metricsSelectorFreezeBytes=readFileSync(join(root,metricsSelectorPrefix,'stage/freeze-manifest.json.snapshot'));assert.equal(sha(metricsSelectorFreezeBytes),'3d23bbf39d41151f0edf341717d7f4fdf29f3acbd0b72d5f39d898a969a34349');assert.equal(sha(metricsSelectorFreezeBytes),metricsSelectorManifest.frozenReviewManifestSHA256);const metricsSelectorFreeze=JSON.parse(metricsSelectorFreezeBytes);assert.equal(metricsSelectorFreeze.entries.length,1042);for(const e of metricsSelectorFreeze.entries){const retained=metricsSelectorManifest.snapshots.find(s=>s.sourcePath===e.path);assert.ok(retained);assert.equal(retained.bytes,e.bytes);assert.equal(retained.sha256,e.sha256);}
const metricsSelectorReceiptBytes=readFileSync(join(root,metricsSelectorPrefix,'measurement-validation.json'));assert.equal(sha(metricsSelectorReceiptBytes),'2226c0d8257df6db57616e6ace33cf91a9617154800553f01a0375c118260208');assert.equal(sha(metricsSelectorReceiptBytes),metricsSelectorManifest.frozenReceiptSHA256);const metricsSelectorReceipt=JSON.parse(metricsSelectorReceiptBytes);assert.equal(metricsSelectorReceipt.schema,'rea-metrics-selector-measured-review/v1');assert.deepEqual(metricsSelectorReceipt.counts,{timingChildren:147,memoryChildren:147,timingFreshAndCachedPacketChecks:1323,memoryFreshAndCachedPacketChecks:1311282,ownedPIDObserverSamples:1979,newMeasurementArtifacts:887,timingChildRawLogs:294,memoryChildAndObserverRawLogs:588});assert.equal(metricsSelectorReceipt.negativeSignedChildMetricValues,24);assert.equal(metricsSelectorReceipt.negativePairedMetricValues,644);assert.equal(metricsSelectorReceipt.negativeValuesClipped,false);assert.equal(metricsSelectorReceipt.rejection.observedFallbackMedianRegressionPercent,27.910564816790107);assert.equal(metricsSelectorReceipt.rejection.candidateIntegrated,false);assert.equal(metricsSelectorReceipt.rejection.numericAcceptanceThresholdIntroducedAfterMeasurements,false);for(const gate of ['productionOrOldStageSourceEdited','productionIntegrated','performanceParityEstablished','universalSuperiorityEstablished','fullProductComplete'])assert.equal(metricsSelectorReceipt[gate],false);assert.equal(metricsSelectorReceipt.windows.machineLevelIsolation,false);assert.equal(metricsSelectorReceipt.priorFailureAndCensoring.all147Plus147Completed,true);assert.equal(metricsSelectorReceipt.priorFailureAndCensoring.initialFailureFullConsoleStackMissing,true);for(const[n,digest]of Object.entries(metricsSelectorReceipt.currentMetricsProductionSourcesUnchanged))rabinRoutingGeometryFingerprint({path:'products/rea-studio/'+n,sha256:digest},'Historical measured selector baseline');
const metricsDispatchBytes=readFileSync(join(root,metricsDispatchPrefix,'preservation-manifest.json'));assert.equal(sha(metricsDispatchBytes),'e46c6daa1a6366d1fec1651fb0760ebfdd827ff1317b231cc32e346fbc7fe9d5');
const metricsDispatchPreservation=JSON.parse(metricsDispatchBytes);assert.equal(metricsDispatchPreservation.schema,'rea-metrics-dispatch-measurement-preservation/v1');assert.equal(metricsDispatchPreservation.frozenInventoryFiles,1069);assert.equal(metricsDispatchPreservation.preservedMeasuredFiles,1067);assert.equal(metricsDispatchPreservation.snapshots.length,1071);assert.equal(metricsDispatchPreservation.excludedLocalArchives.length,2);
assert.equal(metricsDispatchPreservation.selectedForIntegration,null);for(const gate of ['productionChanged','fullProductComplete','universalSuperiority'])assert.equal(metricsDispatchPreservation[gate],false);
const metricsDispatchPaths=new Set();for(const entry of metricsDispatchPreservation.snapshots){safeRecordPath(entry.path);assert.ok(!metricsDispatchPaths.has(entry.path));metricsDispatchPaths.add(entry.path);const b=readFileSync(join(root,metricsDispatchPrefix,entry.path));assert.equal(b.length,entry.bytes);assert.equal(sha(b),entry.sha256,`Metrics frozen measurement artifact changed: ${entry.path}`);}
const metricsDispatchReceiptBytes=readFileSync(join(root,metricsDispatchPrefix,'measurement-validation.json'));assert.equal(sha(metricsDispatchReceiptBytes),metricsDispatchPreservation.frozenLocalReceiptSha256);assert.equal(metricsDispatchPreservation.frozenLocalReceiptSha256,'8a7abd6333e050ed838fdde07415d26485b58b31452d8ed6d561d40f374bca9d');
const metricsDispatchReceipt=JSON.parse(metricsDispatchReceiptBytes);assert.equal(Object.keys(metricsDispatchReceipt.inventory).length,1069);assert.equal(metricsDispatchReceipt.timingChildren,210);assert.equal(metricsDispatchReceipt.isolatedMemoryChildren,210);assert.equal(metricsDispatchReceipt.outputCacheChecks,852516);assert.equal(metricsDispatchReceipt.measurementFailures,0);assert.equal(metricsDispatchReceipt.censoredLimitHitTrials,0);assert.equal(metricsDispatchReceipt.rawMemoryLogsVerified,840);assert.equal(metricsDispatchReceipt.summaryGroupsIndependentlyRecomputed,5790);assert.equal(metricsDispatchReceipt.figuresVerified,6);assert.equal(metricsDispatchReceipt.machineLevelIsolationEstablished,false);assert.equal(metricsDispatchReceipt.selectedForIntegration,null);assert.equal(metricsDispatchReceipt.productionChanged,false);
assert.deepEqual(metricsDispatchReceipt.negativePairedSampleDeltas,{standard:123,percentile:133});
for(const[sourcePath,entry]of Object.entries(metricsDispatchReceipt.inventory)){
 const retained=metricsDispatchPreservation.snapshots.find(e=>e.sourcePath===sourcePath),excluded=metricsDispatchPreservation.excludedLocalArchives.find(e=>e.sourcePath===sourcePath);assert.ok(Boolean(retained)!==Boolean(excluded));const matched=retained??excluded;assert.equal(matched.bytes,entry.bytes);assert.equal(matched.sha256,entry.sha256);
}
function nativeWorkflowsFingerprint(entry, label) {
  safeRecordPath(entry.path);
  const bytes = readFileSync(join(root, entry.path));
  if (sha(bytes) === entry.sha256) { if (entry.bytes !== undefined) assert.equal(bytes.length, entry.bytes); return; }
  const snapshot = nativeWorkflowsSources.get(entry.path);
  assert.ok(snapshot, `Missing historical native-workflows ${label} source: ${entry.path}`);
  assert.equal(snapshot.sha256, entry.sha256, `Historical native-workflows ${label} receipt disagrees: ${entry.path}`);
  if (entry.bytes !== undefined) assert.equal(snapshot.bytes, entry.bytes);
}
function nativeCoreFingerprint(entry, label) {
  safeRecordPath(entry.path);
  const currentBytes = readFileSync(join(root, entry.path));
  if (sha(currentBytes) === entry.sha256) { if (entry.bytes !== undefined) assert.equal(currentBytes.length, entry.bytes); return; }
  const snapshot = nativeCoreSources.get(entry.path);
  assert.ok(snapshot, `Missing historical native-core ${label} source: ${entry.path}`);
  assert.equal(snapshot.sha256, entry.sha256, `Historical native-core ${label} receipt disagrees: ${entry.path}`);
  if (entry.bytes !== undefined) assert.equal(snapshot.bytes, entry.bytes);
}
function historicalReceipt(path) { const entry = historicalExecution.receipts.get(path); assert.ok(entry, `Missing historical receipt: ${path}`); return JSON.parse(readFileSync(join(root, entry.snapshot_path), 'utf8')); }
function historicalFingerprint(entry, label) {
  const snapshot = historicalExecution.sources.get(entry.path); assert.ok(snapshot, `Missing historical ${label} source: ${entry.path}`); assert.equal(snapshot.sha256, entry.sha256, `Historical ${label} receipt disagrees with its source: ${entry.path}`);
}
const historicalBrowser = historicalReceipt('products/rea-studio/results/browser-execution-verification.json');
for (const entry of [...historicalBrowser.implementation_fingerprints, historicalBrowser.screenshot]) historicalFingerprint(entry, 'browser');
const historicalZip = historicalReceipt('products/rea-studio/apps/archive/compatibility-evidence.json');
for (const entry of historicalZip.implementation_fingerprints) historicalFingerprint(entry, 'ZIP');
const historicalFormats = historicalReceipt('products/rea-studio/apps/archive/formats-validation.json');
for (const entry of historicalFormats.sourceFiles) historicalFingerprint(entry, 'formats');
const historicalAutomation = historicalReceipt('products/rea-studio/apps/automation/execution-validation.json');
for (const entry of historicalAutomation.sourceFiles) historicalFingerprint({ ...entry, path: 'products/rea-studio/apps/automation/' + entry.path }, 'automation');
const currentCombinedPrefix='products/rea-studio/results/packs-notebooks-history-combined-20261012/';
const currentCombinedPreservation=strictFollowupPreservation(currentCombinedPrefix,680,'aff19b6242492ace8514146448636dc3442fdd3f4049317ea5e975750e06afae','rea-packs-notebooks-history-suite-preservation/v1');
assert.equal(currentCombinedPreservation.summary.tests,686);assert.equal(currentCombinedPreservation.summary.pass,686);assert.equal(currentCombinedPreservation.summary.fail+currentCombinedPreservation.summary.cancelled+currentCombinedPreservation.summary.skipped+currentCombinedPreservation.summary.todo,0);assert.equal(currentCombinedPreservation.sourceFiles,674);assert.equal(currentCombinedPreservation.sourceStable,true);assert.equal(currentCombinedPreservation.sourceCapturedBeforeExecution,true);assert.equal(currentCombinedPreservation.developmentValidationSHA256,published455Sources.get('products/rea-studio/results/development-validation.json').sha256);
const currentCombinedBefore=JSON.parse(readFileSync(join(root,currentCombinedPrefix,'source-before.json.snapshot'))),currentCombinedAfter=JSON.parse(readFileSync(join(root,currentCombinedPrefix,'source-after.json.snapshot')));assert.deepEqual(currentCombinedBefore,currentCombinedAfter);assert.equal(currentCombinedBefore.length,674);for(const e of currentCombinedBefore){published455Fingerprint({...e,path:'products/rea-studio/'+e.path},'Historical455 combined source');const snapshot=currentCombinedPreservation.sources.get('source/'+e.path+'.snapshot');assert.ok(snapshot);assert.equal(snapshot.sha256,e.sha256);assert.equal(snapshot.bytes,e.bytes);}
const metricsAlgorithmPrefix='products/rea-studio/results/metrics-algorithm-observations-20261012/',metricsAlgorithmManifestBytes=readFileSync(join(root,metricsAlgorithmPrefix,'preservation-manifest.json'));assert.equal(sha(metricsAlgorithmManifestBytes),'57d49c9109a10d602aaa41bf8c848cebe6a97fb9a849b4e3e05635f8ca395a9f');const metricsAlgorithmManifest=JSON.parse(metricsAlgorithmManifestBytes);assert.equal(metricsAlgorithmManifest.schema,'rea-metrics-algorithm-public-preservation/v1');assert.equal(metricsAlgorithmManifest.snapshots.length,2218);assert.equal(metricsAlgorithmManifest.copies.length,13);const metricsAlgorithmPaths=new Set(),metricsAlgorithmSources=new Map();for(const e of [...metricsAlgorithmManifest.snapshots,...metricsAlgorithmManifest.copies]){safeRecordPath(e.path);assert.ok(!metricsAlgorithmPaths.has(e.path));metricsAlgorithmPaths.add(e.path);currentPublicFingerprint({...e,path:metricsAlgorithmPrefix+e.path},'Unaccepted algorithm measured evidence');}for(const e of metricsAlgorithmManifest.snapshots){safeRecordPath(e.sourcePath);assert.ok(!metricsAlgorithmSources.has(e.sourcePath));metricsAlgorithmSources.set(e.sourcePath,e);assert.equal(e.path,'stage/'+e.sourcePath.replaceAll('/node_modules/','/upstream-dependency/')+'.snapshot');}for(const gate of ['selectedForIntegration','algorithmIntegrated','productionChanged','fullProductComplete','fullParityEstablished','fullPerformanceNonRegressionEstablished','performanceAcceptance','universalSuperiority','originalExecutableCopied','originalArchivesCopied'])assert.equal(metricsAlgorithmManifest[gate],false);assert.deepEqual(metricsAlgorithmManifest.currentBaselineSourceBindingsBefore,metricsAlgorithmManifest.currentBaselineSourceBindingsAfter);assert.equal(Object.keys(metricsAlgorithmManifest.currentBaselineSourceBindingsBefore).length,8);for(const[n,e]of Object.entries(metricsAlgorithmManifest.currentBaselineSourceBindingsBefore))namedHistoricalHostFingerprint({...e,path:'products/rea-studio/'+n},'Measured Metrics nonhost current baseline');
const metricsAlgorithmFreezeBytes=readFileSync(join(root,metricsAlgorithmPrefix,'stage/freeze-manifest.json.snapshot'));assert.equal(sha(metricsAlgorithmFreezeBytes),'ee5683f780ab14007ef8731b07663dc32a1494b8f1b2ec0b43f0f8988ba0308d');assert.equal(sha(metricsAlgorithmFreezeBytes),metricsAlgorithmManifest.frozenReviewManifestSHA256);
const metricsAlgorithmReceiptBytes=readFileSync(join(root,metricsAlgorithmPrefix,'measurement-validation.json'));assert.equal(sha(metricsAlgorithmReceiptBytes),'2ae7afaf499cffc9fa88b40b095b697849608b64ae5d485af8602e316f408b23');assert.equal(sha(metricsAlgorithmReceiptBytes),metricsAlgorithmManifest.frozenReceiptSHA256);const metricsAlgorithmReceipt=JSON.parse(metricsAlgorithmReceiptBytes);assert.equal(metricsAlgorithmReceipt.schema,'rea-metrics-algorithm-measured-review/v1');assert.deepEqual(metricsAlgorithmReceipt.counts,{timingChildren:147,memoryChildren:147,timingFreshAndCachedPacketChecks:1323,memoryFreshAndCachedPacketChecks:1311282,ownedPIDObserverSamples:1987,newMeasurementArtifacts:887,timingChildRawLogs:294,memoryChildAndObserverRawLogs:588});assert.deepEqual(metricsAlgorithmManifest.counts,metricsAlgorithmReceipt.counts);assert.equal(metricsAlgorithmReceipt.negativeSignedChildMetricValues,27);assert.equal(metricsAlgorithmReceipt.negativePairedMetricValues,845);assert.equal(metricsAlgorithmReceipt.unavailableZeroControlPercentages,686);assert.equal(metricsAlgorithmReceipt.negativeValuesClipped,false);assert.equal(metricsAlgorithmReceipt.windows.machineLevelIsolation,false);assert.equal(metricsAlgorithmReceipt.failuresAndCensoring.all147Plus147Completed,true);assert.equal(metricsAlgorithmReceipt.rejection.candidateIntegrated,false);assert.equal(metricsAlgorithmReceipt.rejection.numericAcceptanceThresholdIntroducedAfterMeasurements,false);assert.equal(metricsAlgorithmManifest.observedAllPercentiles.ratioOfMediansPercent,37.99670664160504);assert.equal(metricsAlgorithmManifest.observedAllPercentiles.medianPairedPercent,6.091049716404129);assert.equal(metricsAlgorithmManifest.observedAllPercentiles.candidateSlowerPairs,5);assert.equal(metricsAlgorithmManifest.observedAllPercentiles.observedRangesOverlap,true);assert.equal(metricsAlgorithmManifest.higherSingleP95LifetimeRSS.candidateIsHigher,true);for(const gate of ['productionOrOldStageEdited','productionIntegrated','performanceParityEstablished','universalCorrectnessEstablished','universalSuperiorityEstablished','fullProductComplete'])assert.equal(metricsAlgorithmReceipt[gate],false);for(const[n,e]of Object.entries(metricsAlgorithmReceipt.inventory)){const retained=metricsAlgorithmSources.get(n);assert.ok(retained);assert.equal(retained.bytes,e.bytes);assert.equal(retained.sha256,e.sha256);}
const metricsAlgorithmAuditPrefix='products/rea-studio/results/metrics-algorithm-independent-audit-20261012/',metricsAlgorithmAuditManifestBytes=readFileSync(join(root,metricsAlgorithmAuditPrefix,'preservation-manifest.json'));assert.equal(sha(metricsAlgorithmAuditManifestBytes),'63708bb9df2bde2f336ab537561c3baf9e5e30fa83c3aca034675a6edd507275');const metricsAlgorithmAuditManifest=JSON.parse(metricsAlgorithmAuditManifestBytes);assert.equal(metricsAlgorithmAuditManifest.schema,'rea-metrics-algorithm-independent-audit-preservation/v1');assert.equal(metricsAlgorithmAuditManifest.snapshots.length,9);const metricsAlgorithmAuditPaths=new Set();for(const e of metricsAlgorithmAuditManifest.snapshots){safeRecordPath(e.path);assert.ok(!metricsAlgorithmAuditPaths.has(e.path));metricsAlgorithmAuditPaths.add(e.path);assert.ok(e.path.endsWith('.snapshot'));currentPublicFingerprint({...e,path:metricsAlgorithmAuditPrefix+e.path},'Independent measured Metrics audit');}const metricsAlgorithmAuditReceiptBytes=readFileSync(join(root,metricsAlgorithmAuditPrefix,'audit-validation.json.snapshot'));assert.equal(sha(metricsAlgorithmAuditReceiptBytes),'3b8150485117fb9018fc6a4d8c7ad68f0dfa0f07f1fa659c1edd6067a358c7f2');const metricsAlgorithmAudit=JSON.parse(metricsAlgorithmAuditReceiptBytes);assert.equal(metricsAlgorithmAudit.strictArtifacts,2217);assert.equal(metricsAlgorithmAudit.allBytesAndStrictPathsMatchBeforeAfter,true);assert.equal(metricsAlgorithmAudit.all7TimingAnd7MemorySummaryRowsAnd147SignedRowsIndependentlyEqual,true);assert.equal(metricsAlgorithmAudit.executions.newMeasurementChildren,0);assert.equal(metricsAlgorithmAudit.productionOrStageModified,false);assert.equal(metricsAlgorithmAudit.fullProductParity,false);assert.equal(metricsAlgorithmAudit.universalSuperiority,false);
const metricsAlgorithmFreeze=JSON.parse(metricsAlgorithmFreezeBytes);assert.equal(metricsAlgorithmFreeze.entries.length,2217);const metricsAlgorithmFrozenPaths=new Set();for(const e of metricsAlgorithmFreeze.entries){safeRecordPath(e.path);assert.ok(!metricsAlgorithmFrozenPaths.has(e.path));metricsAlgorithmFrozenPaths.add(e.path);const retained=metricsAlgorithmSources.get(e.path);assert.ok(retained);assert.equal(retained.bytes,e.bytes);assert.equal(retained.sha256,e.sha256);}assert.equal(metricsAlgorithmFrozenPaths.size,metricsAlgorithmSources.size-1);
const historicalVaultReadmePrefix='products/rea-studio/results/historical-vault-exchange-readme-20261012/',historicalVaultReadme=strictFollowupPreservation(historicalVaultReadmePrefix,2,'d67ce2834a96ecf3b82d1643a2b55ec87917b6b53abfcd3e082cc4d1f5586e05','rea-vault-exchange-readme-preservation/v1');assert.equal(historicalVaultReadme.sourceRevision,'a56332e9ddb6413cb33c580be137743a748fd5f9');assert.equal(historicalVaultReadme.historicalReceiptSHA256,'895cb736a9b285bfd0c541b6f76a4dc577aca88675be38e3bab9d2a8be105aee');assert.equal(historicalVaultReadme.sourceIdentityMatchesHistorical18Receipt,true);assert.equal(historicalVaultReadme.currentRuntimeRebound,false);assert.equal(historicalVaultReadme.currentDocumentationRebound,false);
const historicalDevelopment = historicalReceipt('products/rea-studio/results/development-validation.json');
for (const entry of historicalDevelopment.source_files) historicalFingerprint({ ...entry, path: 'products/rea-studio/' + entry.path }, 'development');
if (process.argv.includes('--historical-only')) {
  assert.ok(!process.argv.includes('--write'), 'Historical-only checks do not write current validation metadata.');
  console.log(JSON.stringify({ status: 'passed', scope: 'Historical receipt/source integrity only; no current behavioral or publication validation claim.', source_revision: historicalExecution.source_revision, receipt_hashes_checked: historicalExecution.receipts.size, source_hashes_checked: historicalExecution.sources.size })); process.exit(0);
}
const historicalCarrierPolicy = createHistoricalCarrierPolicyFromRoot(root);
let checkedBytes = 0, parsedJson = 0, checkedScripts = 0;
const forbidden = /(^|\/)(artifacts|node_modules|tooling|__pycache__|work|\.local)(\/|$)|\.(exe|dll|zip|tgz|bundle|tar|7z|pyc)$/i;
const syntheticZip = { path: 'products/rea-studio/apps/archive/fixtures/zstd/native-zip93.zip', sha256: 'e9282f76dbd3c080d0e12ef95489458523ebbc65c2951f4b8f3cb880a16c5d8b' };
const credentialPattern = /\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[0-9A-Z]{16})\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
for (const entry of manifest.files) {
  assert.ok(!entry.path.startsWith('/') && !entry.path.split('/').includes('..') && !entry.path.includes('\\'));
  assert.ok(!forbidden.test(entry.path) || entry.path === syntheticZip.path && entry.sha256 === syntheticZip.sha256 || historicalCarrierPolicy.allows(entry), `Excluded vendor/runtime material found in publication: ${entry.path}`);
  const target = join(root, entry.path), bytes = readFileSync(target);
  assert.equal(bytes.length, entry.bytes, `Size mismatch: ${entry.path}`);
  assert.equal(sha(bytes), entry.sha256, `Digest mismatch: ${entry.path}`);
  checkedBytes += bytes.length;
  const source = bytes.toString('utf8');
  assert.ok(!credentialPattern.test(source), `Potential credential material requires review: ${entry.path}`);
  if (entry.path.endsWith('.json')) { JSON.parse(source); parsedJson++; }
  if (/\.(?:mjs|cjs|js)$/.test(entry.path)) {
    const syntax = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8', timeout: 30000 });
    assert.equal(syntax.status, 0, `${entry.path}: ${syntax.stderr}`); checkedScripts++;
  }
}
assert.equal(index.projects.length, 10);
for (const project of index.projects) {
  assert.equal(project.status, 'completed-bounded-study');
  assert.equal(project.final_mismatches, 0);
  for (const name of ['study.json', 'REPORT.md']) assert.ok(existsSync(join(root, 'projects', project.id, name)), `Missing ${project.id}/${name}`);
  const studyRoot = join(root, 'projects', project.id);
  const study = JSON.parse(readFileSync(join(studyRoot, 'study.json'), 'utf8'));
  assert.equal(study.status, project.status);
  for (const [file, digest] of Object.entries(study.file_sha256 ?? {})) assert.equal(sha(readFileSync(join(studyRoot, file))), digest, `Study-local digest differs: ${project.id}/${file}`);
  const record = JSON.parse(readFileSync(join(studyRoot, project.result_record), 'utf8'));
  const count = project.id === '04-excalidraw' ? record.counts.coordinateCalls + record.counts.versionCalls
    : project.id === '09-restic' ? record.content_id_comparisons
    : project.id === '10-rclone' ? record.differential_assertions
    : record.total ?? record.cases;
  assert.equal(count, project.differential_comparison_count, `Count differs: ${project.id}`);
  assert.equal(record.failed ?? record.mismatches ?? record.failures?.length ?? 0, 0, `Recorded failures: ${project.id}`);
  assert.ok(project.rea_evidence_ids.length > 0, `Missing REA reference: ${project.id}`);
}
const historicalDocumentCorpus = /\/apps\/(?:archive\/results\/lzma-stage|sync\/results\/webdav-official-sources)\//;
const documentNames = [...new Set(['README.md', 'SERIES-STUDY.md', 'TOOLING.md', 'LICENSES.md', ...manifest.files.filter(entry => entry.path.startsWith('products/rea-studio/') && entry.path.endsWith('.md') && !historicalDocumentCorpus.test(entry.path)).map(entry => entry.path)])];
for (const name of documentNames) {
  const markdown = readFileSync(join(root, name), 'utf8');
  for (const match of markdown.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^(https?:|mailto:)/.test(target)) continue;
    assert.ok(existsSync(join(dirname(join(root, name)), target)), `${name} links to missing ${target}`);
  }
}
let productDevelopment;
if (existsSync(join(root, 'products/rea-studio/STATUS.json'))) {
  const developmentRoot = join(root, 'products/rea-studio');
  const status = JSON.parse(readFileSync(join(developmentRoot, 'STATUS.json'), 'utf8'));
  // The immutable937 receipt describes its captured source epoch. Only the six
  // explicitly reviewed Flow/Vault code transitions may differ from it today.
  const historical937Prefix = 'products/rea-studio/results/editor-vault-combined-20261013/';
  const historical937Seen = new Map(); let historical937Bytes = 0;
  function historical937Read(name, expected) {
    safeRecordPath(name); assert.ok(!/[:\x00-\x1f\x7f]/.test(name));
    assert.ok(Number.isSafeInteger(expected.bytes) && expected.bytes >= 0 && expected.bytes <= 32 * 1024 * 1024 && /^[0-9a-f]{64}$/.test(expected.sha256));
    let target = root;
    for (const part of name.split('/')) { assert.ok(part && part !== '.'); target = join(target, part); assert.equal(lstatSync(target).isSymbolicLink(), false); }
    const stat = lstatSync(target); assert.ok(stat.isFile() && stat.size <= 32 * 1024 * 1024);
    const bytes = readFileSync(target); assert.equal(bytes.length, expected.bytes); assert.equal(bytes.length, stat.size); assert.equal(sha(bytes), expected.sha256, 'Historical937 proof changed: ' + name);
    if (historical937Seen.has(name)) assert.deepEqual(historical937Seen.get(name), expected);
    else { historical937Seen.set(name, { bytes: expected.bytes, sha256: expected.sha256 }); historical937Bytes += bytes.length; assert.ok(historical937Seen.size <= 1500 && historical937Bytes <= 256 * 1024 * 1024); }
    return bytes;
  }
  const validationBytes = historical937Read('products/rea-studio/results/development-validation.json', { bytes: 137063, sha256: '333303c8bd8cd131da3f01e1414b0fba92bc321b2b63f178ab91d138b2bcfa44' });
  const validation = JSON.parse(validationBytes);
  const historical937Manifest = JSON.parse(historical937Read(historical937Prefix + 'preservation-manifest.json', { bytes: 226183, sha256: 'e1c9211ca4cd302faf4e819077e5809d01539091cc8fc541fbccfde428a0b80b' }));
  assert.equal(historical937Manifest.sourceFiles, 737); assert.equal(historical937Manifest.snapshots.length, 753);
  assert.equal(historical937Manifest.sourceStable, true); assert.equal(historical937Manifest.fullProductParity, false); assert.equal(historical937Manifest.universalSuperiority, false);
  assert.equal(historical937Manifest.developmentValidationSHA256, sha(validationBytes));
  const historical937Snapshots = new Map();
  for (const row of historical937Manifest.snapshots) { safeRecordPath(row.sourcePath); safeRecordPath(row.path); assert.equal(historical937Snapshots.has(row.sourcePath), false); historical937Snapshots.set(row.sourcePath, row); }
  const historical937BeforeRow = historical937Snapshots.get('source-before.json.snapshot');
  assert.deepEqual({ bytes: historical937BeforeRow.bytes, sha256: historical937BeforeRow.sha256 }, { bytes: 138572, sha256: '8d2f8ca7414ed9db51d2980264da3daa660adef30ceedbc6c2a4c2b493bb97d1' });
  const historical937Inventory = JSON.parse(historical937Read(historical937Prefix + historical937BeforeRow.path, { bytes: historical937BeforeRow.bytes, sha256: historical937BeforeRow.sha256 }));
  const historical937Sources = new Map(historical937Inventory.map(row => [row.path, row]));
  assert.equal(historical937Inventory.length, 737); assert.equal(historical937Sources.size, 737); assert.equal(validation.source_files.length, 737);
  const historical937AllowedRoutes = new Set(['apps/editor/git.test.mjs', 'apps/flow/client.mjs', 'apps/flow/native.mjs', 'apps/flow/server.mjs', 'apps/sync/dav-transfer.mjs', 'apps/vault/client.mjs', 'apps/vault/recycle.mjs', 'apps/vault/server.mjs']);
  const historical937Checked = new Set(); let historical937Routed = 0, historical937Unchanged = 0;
  const browser = JSON.parse(readFileSync(join(developmentRoot, 'results/browser-verification.json'), 'utf8'));
  const comparison = JSON.parse(readFileSync(join(developmentRoot, 'results/editor-comparison.json'), 'utf8'));
  assert.equal(status.complete_replacement_products, 0);
  assert.equal(status.completion_status, 'incomplete');
  assert.equal(validation.summary.tests, validation.summary.pass + validation.summary.skipped);
  assert.equal(validation.summary.fail + validation.summary.cancelled + validation.summary.todo, 0);
  assert.equal(validation.summary.skipped,0);
  assert.equal(validation.full_feature_parity_established, false);
  assert.equal(validation.universal_superiority_established, false);
  assert.equal(validation.summary.tests, 937); assert.equal(validation.summary.pass, 937);
  assert.deepEqual(validation.summary, historical937Manifest.summary);
  for (const entry of validation.source_files) {
    safeRecordPath(entry.path); assert.equal(historical937Checked.has(entry.path), false); historical937Checked.add(entry.path);
    const inventory = historical937Sources.get(entry.path), frozen = historical937Snapshots.get(entry.path);
    assert.ok(inventory && frozen); assert.equal(frozen.path, 'source/' + entry.path + '.snapshot');
    const expected = { bytes: inventory.bytes, sha256: inventory.sha256 };
    assert.equal(entry.sha256, expected.sha256); assert.deepEqual({ bytes: frozen.bytes, sha256: frozen.sha256 }, expected);
    historical937Read(historical937Prefix + frozen.path, expected);
    const name = 'products/rea-studio/' + entry.path, historicalPath = sourceProofMigration.resolve(name, expected);
    if (historicalPath) { assert.ok(historical937AllowedRoutes.has(entry.path), 'Unlisted937 source transition'); historical937Read(historicalPath, expected); historical937Routed++; }
    else { historical937Read(name, expected); historical937Unchanged++; }
  }
  assert.equal(historical937Checked.size, 737); assert.equal(historical937Routed, 8); assert.equal(historical937Unchanged, 729);
  assert.equal(validation.source_bytes_stable_across_run, true);
  assert.equal(new Set(browser.checks.map(check => check.app)).size, 10);
  assert.ok(browser.checks.every(check => check.passed));
  assert.equal(browser.every_documented_feature_verified, false);
  const currentBrowser = JSON.parse(readFileSync(join(developmentRoot, 'results/browser-compatibility-verification.json'), 'utf8'));
  assert.deepEqual([...new Set(currentBrowser.checks.map(check => check.app))].sort(), ['editor', 'notes', 'sketch', 'vault']);
  assert.ok(currentBrowser.checks.every(check => check.passed));
  assert.equal(currentBrowser.every_documented_feature_verified, false);
  assert.equal(currentBrowser.full_feature_parity_established, false);
  assert.equal(currentBrowser.universal_superiority_established, false);
  const historicalSnapshots = new Map((currentBrowser.historical_source_snapshots ?? []).map(entry => [entry.path, entry]));
  if (historicalSnapshots.size) assert.equal(currentBrowser.source_revision, 'f40f0cc82baddf00d59065a14034ddfb5f82e77f');
  for (const entry of [...currentBrowser.implementation_fingerprints, currentBrowser.screenshot]) {
    const snapshot = historicalSnapshots.get(entry.path); if (snapshot) { assert.equal(snapshot.sha256, entry.sha256); assert.ok(snapshot.snapshot_path.startsWith('products/rea-studio/results/milestones/native-exchange-20261012/source/') && !snapshot.snapshot_path.split('/').includes('..')); }
    if (snapshot) assert.equal(sha(readFileSync(join(root, snapshot.snapshot_path))), entry.sha256, `Historical browser snapshot changed: ${entry.path}`);
    else nativeCoreFingerprint(entry, 'historical native-exchange browser');
  }
  const executionBrowser = historicalBrowser;
  assert.deepEqual([...new Set(executionBrowser.checks.map(check => check.app))].sort(), ['archive', 'automation', 'editor', 'metrics']);
  assert.ok(executionBrowser.checks.every(check => check.passed));
  assert.equal(executionBrowser.every_documented_feature_verified, false); assert.equal(executionBrowser.full_feature_parity_established, false); assert.equal(executionBrowser.universal_superiority_established, false);
  for (const entry of [...executionBrowser.implementation_fingerprints, executionBrowser.screenshot]) historicalFingerprint(entry, 'browser');
  const automationExecution = JSON.parse(readFileSync(join(developmentRoot, 'apps/automation/execution-validation.json'), 'utf8'));
  assert.equal(automationExecution.summary.tests, automationExecution.summary.pass); assert.equal(automationExecution.summary.fail + automationExecution.summary.skipped, 0);
  assert.equal(automationExecution.originalProductParityVerified, false); assert.equal(automationExecution.universalSuperiorityVerified, false);
  for (const entry of automationExecution.sourceFiles) { safeRecordPath(entry.path); historicalFingerprint({ ...entry, path: 'products/rea-studio/apps/automation/' + entry.path }, 'automation'); }
  const archiveZip = historicalZip;
  assert.equal(archiveZip.checks.successful_result.tests, archiveZip.checks.successful_result.passed); assert.equal(archiveZip.checks.successful_result.failed + archiveZip.checks.successful_result.skipped, 0);
  for (const entry of archiveZip.implementation_fingerprints) historicalFingerprint(entry, 'ZIP');
  const archiveFormats = historicalFormats;
  assert.equal(archiveFormats.summary.tests, archiveFormats.summary.pass); assert.equal(archiveFormats.summary.fail + archiveFormats.summary.skipped, 0);
  for (const entry of archiveFormats.sourceFiles) historicalFingerprint(entry, 'formats');
  const archiveZstd = JSON.parse(readFileSync(join(developmentRoot, 'apps/archive/zstd-validation.json'), 'utf8'));
  assert.equal(archiveZstd.checks.result.tests, archiveZstd.checks.result.passed); assert.equal(archiveZstd.checks.result.failed + archiveZstd.checks.result.skipped, 0);
  for (const entry of archiveZstd.implementation_and_fixture_fingerprints) nativeCoreFingerprint(entry, 'Zstandard');
  assert.equal(archiveZstd.publication_policy.vendor_executables_and_archive_packages_excluded, true);
  assert.equal(archiveZstd.publication_policy.synthetic_ZIP_fixture_exception.path, syntheticZip.path); assert.equal(archiveZstd.publication_policy.synthetic_ZIP_fixture_exception.sha256, syntheticZip.sha256);
  const zstdProvenance = JSON.parse(readFileSync(join(root, archiveZstd.publication_policy.synthetic_ZIP_fixture_exception.provenance), 'utf8'));
  assert.equal(zstdProvenance.application_imported, false); assert.equal(zstdProvenance.files.find(entry => entry.name === 'native-zip93.zip')?.sha256, syntheticZip.sha256);
  const grafanaSchema = JSON.parse(readFileSync(join(developmentRoot, 'apps/metrics/results/grafana-schema-verification.json'), 'utf8'));
  function currentFingerprint(entry, label) {
    safeRecordPath(entry.path); const bytes = readFileSync(join(root, entry.path));
    if (entry.bytes !== undefined) assert.equal(bytes.length, entry.bytes, `${label} size changed: ${entry.path}`);
    assert.equal(sha(bytes), entry.sha256, `${label} source changed: ${entry.path}`);
  }
  const backupCompression = JSON.parse(readFileSync(join(developmentRoot, 'apps/backup/results/compression-validation.json'), 'utf8'));
  assert.equal(backupCompression.schema, 'rea-restic-compression-integration-validation/v1');
  assert.equal(backupCompression.summary.tests, 13); assert.equal(backupCompression.summary.pass, 13);
  assert.equal(backupCompression.summary.fail + backupCompression.summary.cancelled + backupCompression.summary.skipped + backupCompression.summary.todo, 0);
  assert.equal(backupCompression.exitCode, 0); assert.equal(backupCompression.sourceBytesStableAcrossRun, true);
  for (const gate of ['fullFeatureParityEstablished', 'universalSuperiorityEstablished', 'productionSecurityVerified', 'compressionPerformanceCompared']) assert.equal(backupCompression[gate], false);
  for (const entry of [...backupCompression.implementationFingerprints, ...backupCompression.rawEvidence]) compressionRemoteFingerprint(entry, 'Backup compression');
  const backupRabin = JSON.parse(readFileSync(join(developmentRoot, 'apps/backup/results/rabin-validation.json'), 'utf8'));
  assert.equal(backupRabin.schema, 'rea-restic-rabin-integration-validation/v1');
  assert.equal(backupRabin.summary.tests, 47); assert.equal(backupRabin.summary.pass, 47);
  assert.equal(backupRabin.summary.fail + backupRabin.summary.cancelled + backupRabin.summary.skipped + backupRabin.summary.todo, 0);
  assert.equal(backupRabin.exitCode, 0); assert.equal(backupRabin.sourceBytesStableAcrossRun, true);
  for (const gate of ['fullFeatureParityEstablished','universalSuperiorityEstablished','productionSecurityVerified','originalPerformanceCompared','historicalEvidenceReboundToCurrentSource']) assert.equal(backupRabin[gate], false);
  const recorderPrefix = 'products/rea-studio/apps/backup/results/rabin-recorder-review/';
  const recorderHistory = JSON.parse(readFileSync(join(root, recorderPrefix, 'preservation-manifest.json'), 'utf8'));
  assert.equal(recorderHistory.schema, 'rea-rabin-recorder-review-preservation/v1');
  assert.equal(recorderHistory.independentReviewSha256, 'fea82158b9a74ffc68193f27ecbe6a67fd202ec08e627e520bdbda805d93d4ee');
  assert.equal(recorderHistory.parentBehaviorReceiptSha256, sha(readFileSync(join(developmentRoot, 'apps/backup/results/rabin-validation.json'))));
  assert.equal(recorderHistory.historicalBehaviorEvidenceReboundToCurrentCollector, false);
  assert.equal(recorderHistory.snapshots.length, 73);
  for (const entry of recorderHistory.snapshots) { assert.ok(entry.path.startsWith(recorderPrefix)); currentFingerprint(entry, 'Preserved recorder review'); }
  const oldCollector = recorderHistory.historicalCollector;
  assert.equal(oldCollector.path, 'products/rea-studio/scripts/read-rabin-tap.mjs');
  assert.equal(oldCollector.sha256, 'e87af08715677ce3d663837ef12275627311b2d0dd2844ae38c8d96782e6fe39');
  currentFingerprint({ ...oldCollector, path: oldCollector.snapshotPath }, 'Historical 47-case recorder');
  currentFingerprint(recorderHistory.currentCollector, 'Current recorder');
  assert.equal(recorderHistory.currentCollector.sha256, 'a7068f3e4d8db328636e2daa1e9cd55a7c5d7327320f19edeedc88ed28466dba');
  for (const entry of [...backupRabin.implementationFingerprints, ...backupRabin.rawEvidence, backupRabin.preservation]) {
    if (entry.path === oldCollector.path) { assert.equal(entry.sha256, oldCollector.sha256); assert.equal(entry.bytes, oldCollector.bytes); }
    else if(entry.path==='products/rea-studio/apps/backup/native.test.mjs') routingGeometryCheckpointFingerprint(entry,'Historical Backup Rabin test adapter');
    else if(['restic.mjs','README.md','RABIN.md','restic-compression-review.test.mjs'].some(name=>entry.path==='products/rea-studio/apps/backup/'+name)) rabinRoutingGeometryFingerprint(entry,'Historical Backup Rabin integration source');
    else if(entry.path==='products/rea-studio/server.mjs')namedHistoricalHostFingerprint(entry,'Historical Backup Rabin shared host');
    else currentFingerprint(entry, 'Backup Rabin integration');
  }
  const recorderIntegration = JSON.parse(readFileSync(join(root, recorderPrefix, 'integration-validation.json'), 'utf8'));
  assert.equal(recorderIntegration.schema, 'rea-rabin-recorder-integration-validation/v1');
  assert.equal(recorderIntegration.summary.tests, 8); assert.equal(recorderIntegration.summary.pass, 8);
  assert.equal(recorderIntegration.summary.fail + recorderIntegration.summary.cancelled + recorderIntegration.summary.skipped + recorderIntegration.summary.todo, 0);
  assert.equal(recorderIntegration.exitCode, 0); assert.equal(recorderIntegration.sourceBytesStableAcrossRun, true);
  assert.equal(recorderIntegration.historicalBehaviorTestsRerun, 0); assert.equal(recorderIntegration.currentSyntheticLiveLoggerTests, 1);
  assert.equal(recorderIntegration.historicalBehaviorEvidenceReboundToCurrentCollector, false);
  for (const entry of [...recorderIntegration.implementationFingerprints, ...recorderIntegration.rawEvidence]) currentFingerprint(entry, 'Current recorder verification');
  const recorderFailure = JSON.parse(readFileSync(join(root, recorderPrefix, 'production-failed-livelogger/manifest.json'), 'utf8'));
  assert.equal(recorderFailure.summary.tests, 8); assert.equal(recorderFailure.summary.pass, 7); assert.equal(recorderFailure.summary.fail, 1);
  for (const entry of recorderFailure.entries) { assert.ok(entry.path.startsWith(recorderPrefix + 'production-failed-livelogger/')); currentFingerprint(entry, 'Preserved failed live logger'); }
  const recorderIndependent = JSON.parse(readFileSync(join(root, recorderPrefix, 'independent-integration/preservation-manifest.json'), 'utf8'));
  assert.equal(recorderIndependent.schema,'rea-rabin-recorder-integration-review-preservation/v1');
  assert.equal(recorderIndependent.reviewReceiptSha256,'a0abf10cfaa97534df6c182bdb576e44032de1451a42f5f086b0570ed586244f');
  for (const entry of recorderIndependent.snapshots) { assert.ok(entry.path.startsWith(recorderPrefix + 'independent-integration/')); currentFingerprint(entry, 'Independent recorder integration review'); }
  assert.equal(backupRabin.original.fileCases, 30); assert.equal(backupRabin.original.orderedChunkEntries, 126);
  assert.equal(backupRabin.original.boundaryExecutions, 30); assert.equal(backupRabin.original.additionalCandidateSnapshotCheckAndRestoreExecutions, 4); assert.equal(backupRabin.original.authenticatedBeforeEveryExecution, true);
  assert.equal(backupRabin.lifecycle.productionModuleObservations, 20); assert.equal(backupRabin.lifecycle.strictExpiredIOCases, 3); assert.equal(backupRabin.lifecycle.subsequentIOAfterExpiry, 0);
  const rabinPreservation = JSON.parse(readFileSync(join(root, backupRabin.preservation.path), 'utf8'));
  assert.equal(rabinPreservation.schema, 'rea-restic-rabin-source-preservation/v1'); assert.equal(rabinPreservation.snapshots.length, backupRabin.preservation.exactSnapshots);
  assert.equal(rabinPreservation.acceptedReviewSha256, '5a86c3e557408f985dfaf8c4d187fc8a9b1afd1a910d59aaadcfd190a9cfc7ac');
  assert.equal(rabinPreservation.stageReceiptSha256, 'e50f1858132f6af08709f64a9d47e022c2303c060820d62cdfedf63daa535ab6');
  for (const entry of rabinPreservation.snapshots) { assert.ok(entry.path.startsWith('products/rea-studio/apps/backup/results/rabin-source-study/')); currentFingerprint(entry, 'Preserved Backup Rabin study'); }
  assert.equal(backupCompression.original.version, '0.19.1'); assert.equal(backupCompression.original.sourceCommit, '6aa3a516ce654808a1f28f9fa21e9b7c8e6e90bf'); assert.equal(backupCompression.original.writerConfigurations, 6);
  const compressionPreservation = JSON.parse(readFileSync(join(root, backupCompression.sourcePreservationManifest), 'utf8'));
  assert.equal(compressionPreservation.schema, 'rea-restic-compression-source-preservation/v1');
  assert.equal(compressionPreservation.snapshots.length, 20);
  for (const entry of compressionPreservation.snapshots) { assert.ok(entry.path.startsWith('products/rea-studio/apps/backup/results/compression-source-study/')); currentFingerprint(entry, 'Preserved backup compression study'); }
  const compressionStudyRoot = join(developmentRoot, 'apps/backup/results/compression-source-study');
  const compressionStage = JSON.parse(readFileSync(join(compressionStudyRoot, 'stage/draft-validation.json'), 'utf8'));
  const compressionReview = JSON.parse(readFileSync(join(compressionStudyRoot, 'review/independent-validation.json'), 'utf8'));
  assert.equal(compressionStage.summary.pass, 8); assert.equal(compressionReview.summary.pass, 5);
  assert.equal(compressionReview.originalSourceReceiptSha256, sha(readFileSync(join(compressionStudyRoot, 'stage/draft-validation.json'))));
  for (const entry of compressionStage.fingerprints) {
    const preserved = compressionPreservation.snapshots.find(row => row.group === 'stage' && row.originalPath === entry.path);
    assert.ok(preserved); assert.equal(preserved.sha256, entry.sha256); assert.equal(preserved.bytes, entry.bytes);
  }
  for (const name of ['stdout','stderr']) assert.equal(sha(Buffer.from(compressionReview.rawEvidence[name])), compressionReview.rawEvidence[name + 'Sha256']);
  const webdavRoot = 'products/rea-studio/apps/sync/';
  const webdav = JSON.parse(readFileSync(join(root, webdavRoot, 'results/webdav-validation.json'), 'utf8'));
  assert.equal(webdav.schemaVersion, 1); assert.equal(webdav.testRun.tests, 72); assert.equal(webdav.testRun.pass, 72);
  assert.equal(webdav.testRun.newWebDAVTests, 37); assert.equal(webdav.testRun.legacyRegressionTests, 35);
  assert.equal(webdav.testRun.fail + webdav.testRun.skipped + webdav.testRun.cancelled, 0);
  for (const gate of ['comparisonOfSpeedOrResourcesToOriginal','runtimeRunsOriginalOrVendorCode','allDocumentedFeaturesEnumerated','fullProductComplete','universalSuperiorityEstablished']) assert.equal(webdav[gate], false);
  assert.equal(webdav.oracle.authenticatedOriginalExecutions, 274); assert.equal(webdav.oracle.comparisonProfiles, 128); assert.equal(webdav.oracle.comparisonDecisions, 1408); assert.equal(webdav.oracle.heldOutFilteredTransferFolders, 8);
  assert.equal(webdav.officialSourceFiles, 16); assert.equal(webdav.sourceContracts, 29);
  // The immutable72-case receipt continues to authenticate its exact tested
  // transfer before-image. Every other WebDAV source remains a live exact pin.
  for (const [path, sha256] of Object.entries(webdav.sourceFiles)) {
    if (path === 'dav-transfer.mjs') {
      assert.equal(sha256, '591146243ed9b378aed70ce4beedceeec1b12319d7747b1e21fad2282286c9bb');
      const expected = { bytes: 14717, sha256 }, name = webdavRoot + path;
      const historicalPath = sourceProofMigration.resolve(name, expected);
      assert.equal(historicalPath, 'products/rea-studio/results/windows-path-source-transition-20261015/before/products/rea-studio/apps/sync/dav-transfer.mjs.snapshot');
      currentFingerprint({ ...expected, path: historicalPath }, 'Historical WebDAV transfer source');
    } else currentFingerprint({ path: webdavRoot + path, sha256 }, 'WebDAV unchanged source');
  }
  for (const [path, sha256] of Object.entries(webdav.hostDependenciesAtTest)) { const target = resolve(root, webdavRoot, path); namedHistoricalHostFingerprint({path:relative(root,target).replaceAll('\\','/'),sha256}, 'WebDAV nonhost current source'); }
  for (const [path, entry] of Object.entries(webdav.receipts)) currentFingerprint({...entry,path:webdavRoot + 'results/' + path}, 'WebDAV evidence');
  const webdavProvenance = JSON.parse(readFileSync(join(root, webdavRoot, 'results/webdav-provenance.json'), 'utf8'));
  for (const entry of webdavProvenance.stagedSource) currentFingerprint({path:webdavRoot + entry.preserved,sha256:entry.sha256}, 'WebDAV preserved stage');
  currentFingerprint({...webdavProvenance.stagedAggregate,path:webdavRoot + webdavProvenance.stagedAggregate.path}, 'WebDAV preserved aggregate');
  for (const [path, entry] of Object.entries(webdavProvenance.stagedReceipts)) currentFingerprint({...entry,path:webdavRoot + 'results/' + path}, 'WebDAV preserved receipts');
  for (const [path, sha256] of Object.entries(webdavProvenance.unchangedHistoricalReceipts)) currentFingerprint({path:webdavRoot + 'results/' + path,sha256}, 'WebDAV unchanged historical receipts');
  const webdavSources = JSON.parse(readFileSync(join(root, webdavRoot, 'results/webdav-source-verification.json'), 'utf8'));
  assert.equal(webdavSources.allPassed, true); assert.equal(webdavSources.officialRecords.length, 16);
  for (const entry of webdavSources.officialRecords) currentFingerprint({...entry,path:webdavRoot + entry.preserved}, 'WebDAV original source');
  const archiveLzma = JSON.parse(readFileSync(join(developmentRoot, 'apps/archive/lzma-validation.json'), 'utf8'));
  assert.equal(archiveLzma.schema, 'rea-lzma-application-validation/v1'); assert.equal(archiveLzma.integrated_application, true);
  assert.equal(archiveLzma.test_run.tests, 169); assert.equal(archiveLzma.test_run.passed, 169); assert.equal(archiveLzma.test_run.failed + archiveLzma.test_run.skipped, 0);
  for (const gate of ['full_feature_parity','all_ways_improved','original_compression_performance_parity','original_application_runtime_wrapper']) assert.equal(archiveLzma[gate], false);
  const lzmaIntegrity = spawnSync(process.execPath, ['products/rea-studio/apps/archive/verify-lzma.mjs'], {cwd:root,encoding:'utf8',timeout:30000});
  assert.equal(lzmaIntegrity.status, 0, lzmaIntegrity.stderr);
  const lzmaIntegrityResult = JSON.parse(lzmaIntegrity.stdout); assert.equal(lzmaIntegrityResult.fingerprints, 124);
  const compressionBrowser = JSON.parse(readFileSync(join(developmentRoot, 'results/browser-compression-remote-verification.json'), 'utf8'));
  assert.equal(compressionBrowser.schema, 'rea-compression-remote-browser-verification/v1'); assert.deepEqual(compressionBrowser.checks.map(v=>v.app).sort(), ['archive','backup','sync']); assert.ok(compressionBrowser.checks.every(v=>v.passed));
  for (const gate of ['every_documented_feature_verified','full_feature_parity_established','universal_superiority_established']) assert.equal(compressionBrowser[gate], false);
  for (const entry of [...compressionBrowser.implementation_fingerprints,...compressionBrowser.screenshots]) compressionRemoteFingerprint(entry, 'Compression/remote browser');
  for (const [app,path] of [['archive','apps/archive/lzma-validation.json'],['backup','apps/backup/results/compression-validation.json'],['sync','apps/sync/results/webdav-validation.json']]) assert.equal(compressionBrowser.checks.find(v=>v.app===app).receipt_sha256, sha(readFileSync(join(developmentRoot,path))));
  const remoteBrowser = compressionBrowser.checks.find(v=>v.app==='sync'); assert.equal(remoteBrowser.previewAndRefusedApplyChangedRemoteFiles, false); assert.equal(remoteBrowser.afterApply.priorBytesRetained, true); assert.equal(remoteBrowser.afterApply.passwordAbsentFromWorkspaceAndRecords, true); assert.equal(remoteBrowser.beforeApply.downloadHasNoCredentials, true);
  const compressedBackupBrowser = compressionBrowser.checks.find(v=>v.app==='backup'); assert.equal(compressedBackupBrowser.filesystemAssertions.applicationRestoreExact, true); assert.equal(compressedBackupBrowser.filesystemAssertions.originalRestoreExact, true); assert.equal(compressedBackupBrowser.filesystemAssertions.allNewIndexedBlobsCompressed, true); assert.ok(compressedBackupBrowser.observations.every(v=>v.passwordCleared));
  const sevenzip = JSON.parse(readFileSync(join(developmentRoot, 'apps/archive/sevenzip-validation.json'), 'utf8'));
  assert.equal(sevenzip.schema, 'rea-sevenzip-validation/v1');
  assert.equal(sevenzip.test_run.passed, 68); assert.equal(sevenzip.test_run.sevenzip_passed, 26);
  assert.equal(sevenzip.test_run.failed + sevenzip.test_run.skipped, 0);
  assert.equal(sevenzip.full_feature_parity, false); assert.equal(sevenzip.all_ways_improved, false); assert.equal(sevenzip.original_application_runtime_wrapper, false);
  for (const entry of [...sevenzip.implementation_fingerprints, ...sevenzip.preserved_previous_receipts]) nativeWorkflowsFingerprint(entry, '7Z');
  const backupKdf = JSON.parse(readFileSync(join(developmentRoot, 'apps/backup/results/kdf-policy-validation.json'), 'utf8'));
  assert.equal(backupKdf.schema, 'rea-restic-kdf-policy-followup/v1');
  assert.equal(backupKdf.validation.tests, 4); assert.equal(backupKdf.validation.pass, 4);
  assert.equal(backupKdf.validation.fail + backupKdf.validation.skipped + backupKdf.validation.cancelled, 0);
  assert.equal(backupKdf.change.current.minimumP, 13); assert.equal(backupKdf.change.current.maximumP, 32);
  assert.equal(backupKdf.change.automaticExistingKeyMigration, false);
  assert.equal(backupKdf.fullFeatureParityEstablished, false); assert.equal(backupKdf.universalSuperiorityEstablished, false);
  for (const entry of backupKdf.implementationFingerprints) nativeWorkflowsFingerprint(entry, 'Backup KDF');
  const metricsPerformance = JSON.parse(readFileSync(join(developmentRoot, 'results/metrics-performance-followup/followup.json'), 'utf8'));
  assert.equal(metricsPerformance.schema, 'rea-native-calculation-performance-followup/v1');
  assert.equal(metricsPerformance.fullFeatureParityEstablished, false); assert.equal(metricsPerformance.universalSuperiorityEstablished, false);
  assert.equal(metricsPerformance.differential.comparisons, 2910751); assert.equal(metricsPerformance.differential.failures, 0);
  for (const entry of [...metricsPerformance.artifacts, metricsPerformance.implementation]) compressionRemoteFingerprint(entry, 'Metrics performance');
  const pairedMetrics = JSON.parse(readFileSync(join(developmentRoot, 'results/metrics-performance-followup/shared-sort.json'), 'utf8'));
  assert.equal(pairedMetrics.records.length, 30);
  assert.ok(pairedMetrics.records.every(entry => entry.exactOutputEqual && entry.candidateSha256 === metricsPerformance.implementation.sha256));
  assert.equal(metricsPerformance.selectedSummary.length, 5);
  assert.equal(metricsPerformance.selectedSummary.filter(entry => entry.speedRatioOriginalOverCandidate < 1).length, 3);
  const nativeSync = JSON.parse(readFileSync(join(developmentRoot, 'apps/sync/results/native-verification.json'), 'utf8'));
  assert.equal(nativeSync.format, 'rea-rclone-native-verification-v1');
  assert.equal(nativeSync.sourceCommit, 'be8d6044eacb843b74d335db0c5fbe09222031fe');
  assert.equal(nativeSync.testRun.tests, nativeSync.testRun.pass);
  assert.equal(nativeSync.testRun.fail + nativeSync.testRun.skipped + nativeSync.testRun.cancelled, 0);
  assert.equal(nativeSync.testRun.exitCode, 0); assert.equal(nativeSync.differential.allPassed, true);
  assert.equal(nativeSync.differential.comparisonDecisions, 1400); assert.equal(nativeSync.differential.filterSettings, 56); assert.equal(nativeSync.differential.folderDryRunApplyScenarios, 21);
  assert.equal(nativeSync.runtimeRunsOriginalOrVendorCode, false); assert.equal(nativeSync.fullProductComplete, false); assert.equal(nativeSync.universalSuperiorityEstablished, false);
  assert.equal(nativeSync.comparisonOfSpeedOrResourcesToOriginal, false);
  for (const [path, digest] of Object.entries(nativeSync.sourceFiles)) nativeWorkflowsFingerprint({ path: 'products/rea-studio/apps/sync/' + path, sha256: digest }, 'Native Sync');
  for (const [path, entry] of Object.entries(nativeSync.evidence)) nativeWorkflowsFingerprint({ ...entry, path: 'products/rea-studio/apps/sync/results/' + path }, 'Native Sync evidence');
  for (const [path, digest] of Object.entries(nativeSync.hostDependenciesAtTest)) {
    const target = resolve(developmentRoot, 'apps/sync', path);
    assert.ok(target.startsWith(developmentRoot + '\\') || target.startsWith(developmentRoot + '/'));
    nativeWorkflowsFingerprint({ path: relative(root, target).replaceAll('\\', '/'), sha256: digest }, 'Native Sync host at focused test');
  }
  const nativeAutomation = JSON.parse(readFileSync(join(developmentRoot, 'apps/automation/native-validation.json'), 'utf8'));
  assert.equal(nativeAutomation.schema, 'rea-automation-native-validation/v1');
  assert.equal(nativeAutomation.summary.tests, nativeAutomation.summary.pass);
  assert.equal(nativeAutomation.summary.fail + nativeAutomation.summary.cancelled + nativeAutomation.summary.skipped + nativeAutomation.summary.todo, 0);
  assert.equal(nativeAutomation.sourceBytesStableAcrossRun, true);
  for (const gate of ['originalProductParityVerified','universalSuperiorityVerified','productionSecurityVerified']) assert.equal(nativeAutomation[gate], false);
  assert.equal(nativeAutomation.original.baseline, 'n8n@2.16.0');
  assert.equal(nativeAutomation.original.sourceCommit, '6eb2d75670b912bdc0274abd73f4f6e8ca8678c6');
  assert.equal(nativeAutomation.original.completeReleaseBinding.authenticatedArchivePackageBinding, true);
  const accounting = nativeAutomation.original.comparisons;
  assert.equal(accounting.exactOutputMatches + accounting.normalizedHttpOutputMatches + accounting.rejectionOutcomeMatches + accounting.deliberateDeviations, nativeAutomation.original.observations.nodeExecutions);
  assert.equal(accounting.exactOutputMatches, 473); assert.equal(accounting.rejectionOutcomeMatches, 85);
  assert.equal(accounting.normalizedHttpOutputMatches, 2); assert.equal(accounting.deliberateDeviations, 2);
  assert.equal(accounting.waitMethodOutputMatches, 6);
  for (const entry of nativeAutomation.sourceFiles) nativeWorkflowsFingerprint({ ...entry, path:'products/rea-studio/apps/automation/' + entry.path }, 'Native Automation');
  for (const entry of nativeAutomation.sharedValidatedFiles) nativeWorkflowsFingerprint(entry, 'Native Automation host');
  for (const name of ['stdout','stderr']) assert.equal(sha(Buffer.from(nativeAutomation.rawTestEvidence[name])), nativeAutomation.rawTestEvidence[name+'Sha256']);
  const automationRouting = JSON.parse(readFileSync(join(developmentRoot, 'apps/automation/results/routing-validation.json'), 'utf8'));
  assert.equal(automationRouting.schema, 'rea-automation-routing-integration-validation/v1');
  assert.equal(automationRouting.sourceStable, true);
  assert.deepEqual(automationRouting.summary, {nativeAndOriginal:56,passed:56,failed:0,skipped:0,priorEditorRegressions:3});
  for (const entry of automationRouting.implementationFingerprints) routingGeometryCheckpointFingerprint({...entry,path:'products/rea-studio/'+entry.path}, 'First Automation routing integration');
  const routingPreservation = JSON.parse(readFileSync(join(developmentRoot, automationRouting.preservationManifest.path), 'utf8'));
  assert.equal(routingPreservation.schema, 'rea-automation-routing-preservation/v1');
  assert.equal(sha(readFileSync(join(developmentRoot, automationRouting.preservationManifest.path))), automationRouting.preservationManifest.sha256);
  assert.equal(routingPreservation.entries.length, 721); assert.equal(routingPreservation.entries.length, automationRouting.preservationManifest.entries);
  assert.equal(routingPreservation.stageReceiptSha256, '2a50a9723ef9a3903843f75dc24eaa4d0f12ffb21e9e17bda882ac539202fac8');
  assert.equal(routingPreservation.baselineFiles,25); assert.equal(routingPreservation.stageFingerprints,29); assert.equal(routingPreservation.historicalRunFolders,15); assert.equal(routingPreservation.selectedOriginalPublicFiles,201);
  for (const entry of routingPreservation.entries) { assert.ok(entry.snapshot.startsWith('apps/automation/results/routing-source-study/')); currentFingerprint({...entry,path:'products/rea-studio/'+entry.snapshot}, 'Preserved Automation routing study'); }
  for (const command of automationRouting.commands) {
    assert.equal(command.exitCode,0); assert.equal(command.error,null); assert.equal(command.tests,command.pass);
    assert.equal(command.fail+command.cancelled+command.skipped+command.todo,0);
    for (const stream of ['stdout','stderr']) assert.equal(sha(readFileSync(join(developmentRoot, automationRouting.runPath,command.label+'.'+stream+'.txt'))),command[stream+'Sha256']);
  }
  const routingBefore = JSON.parse(readFileSync(join(developmentRoot,automationRouting.runPath,'source-before.json'),'utf8'));
  assert.deepEqual(routingBefore,automationRouting.implementationFingerprints);
  assert.deepEqual(JSON.parse(readFileSync(join(developmentRoot,automationRouting.runPath,'source-after.json'),'utf8')),routingBefore);
  for (const entry of routingBefore) currentFingerprint({...entry,path:'products/rea-studio/'+automationRouting.runPath+'/source/'+entry.path+'.snapshot'}, 'Automation tested source snapshot');
  const routingRaw = readFileSync(join(developmentRoot,automationRouting.original.publicObservation));
  assert.equal(routingRaw.length,automationRouting.original.bytes); assert.equal(sha(routingRaw),automationRouting.original.sha256);
  const routingOriginal = JSON.parse(routingRaw);
  assert.deepEqual(routingOriginal.observations,automationRouting.original.observations); assert.deepEqual(routingOriginal.counts,automationRouting.original.counts);
  assert.deepEqual(automationRouting.original.counts,{exactOutputMatches:1812,rejectionOutcomeMatches:10,deliberateSafetyDeviations:3,boundedRepresentationDeviations:48});
  assert.equal(automationRouting.original.nodeAndModeExecutions,1873); assert.equal(automationRouting.original.observations.switchNodeExecutions,114); assert.equal(automationRouting.original.observations.mergeModeExecutions,1759);
  assert.equal(automationRouting.original.observations.coreEnqueueHelperExecutions,7); assert.equal(automationRouting.original.observations.corePartialDrainExecutions,4);
  assert.equal(automationRouting.original.fullReleasedSchedulerExecutions,0); assert.equal(automationRouting.original.fullReleasedServerExecutions,0); assert.equal(automationRouting.original.authenticatedBeforeAndAfter,true);
  assert.equal(automationRouting.sharedHostEvidence.observations[0].mergeExecutions,1); assert.equal(automationRouting.sharedHostEvidence.observations[0].downstreamRequests,2);
  assert.equal(automationRouting.sharedHostEvidence.observations[1].httpStatus,400); assert.equal(automationRouting.sharedHostEvidence.observations[1].downstreamRequests,0);
  for (const gate of ['fullParity','securityCertified','performanceSuperiority']) assert.equal(automationRouting[gate],false);
  const automationRecoveryBytes=readFileSync(join(developmentRoot,'apps/automation/results/recovery-followup/integration-validation.json'));assert.equal(sha(automationRecoveryBytes),'915e4c14ed5185029e75171d1e7197f3d6ec61cff66541fea4803f08b1637d33');
  const automationRecovery=JSON.parse(automationRecoveryBytes);assert.equal(automationRecovery.schema,'rea-automation-recovery-integration-validation/v1');assert.deepEqual(automationRecovery.summary,{tests:74,pass:74,fail:0,cancelled:0,skipped:0,todo:0});assert.equal(automationRecovery.sourceStable,true);assert.equal(automationRecovery.implementationFingerprints.length,43);assert.equal(automationRecovery.sourceCapture.completeDirectAppFileCoverage,true);
  for(const e of automationRecovery.implementationFingerprints)namedHistoricalHostFingerprint({...e,path:'products/rea-studio/'+e.path},'Automation recovery nonhost current source');for(const e of automationRecovery.artifacts)currentFingerprint({...e,path:'products/rea-studio/'+e.path},'Current Automation recovery artifact');
  assert.equal(automationRecovery.preservation.current.sha256,'585f80b40c72d6968c4e678d7e7282b2a73e70bd29e92ed36a24c8209038f0a8');assert.equal(automationRecovery.preservation.current.snapshots,340);assert.equal(automationRecovery.preservation.historical.sha256,automationRouting.preservationManifest.sha256);assert.equal(automationRecovery.preservation.historical.snapshots,721);
  assert.equal(automationRecovery.historicalRoutingReceipt.sha256,sha(readFileSync(join(developmentRoot,automationRecovery.historicalRoutingReceipt.path))));assert.equal(automationRecovery.historicalRoutingReceipt.untouched,true);
  assert.deepEqual(JSON.parse(readFileSync(join(developmentRoot,automationRecovery.runPath,'source-before.json'))),automationRecovery.implementationFingerprints);assert.deepEqual(JSON.parse(readFileSync(join(developmentRoot,automationRecovery.runPath,'source-after.json'))),automationRecovery.implementationFingerprints);
  for(const e of automationRecovery.implementationFingerprints)currentFingerprint({...e,path:'products/rea-studio/'+automationRecovery.runPath+'/source/'+e.path+'.snapshot'},'Current Automation tested source snapshot');
  assert.equal(sha(readFileSync(join(developmentRoot,automationRecovery.runner.publicSnapshot))),automationRecovery.runner.sha256);
  const recoveryOriginalBytes=readFileSync(join(developmentRoot,automationRecovery.original.publicObservation));assert.equal(recoveryOriginalBytes.length,4303977);assert.equal(recoveryOriginalBytes.length,automationRecovery.original.bytes);assert.equal(sha(recoveryOriginalBytes),automationRecovery.original.sha256);const recoveryOriginal=JSON.parse(recoveryOriginalBytes);assert.deepEqual(recoveryOriginal.counts,automationRecovery.original.counts);assert.deepEqual(recoveryOriginal.observations,automationRecovery.original.observations);assert.deepEqual(automationRecovery.original.counts,{exactOutputMatches:1812,rejectionOutcomeMatches:10,deliberateSafetyDeviations:3,boundedRepresentationDeviations:48});assert.equal(automationRecovery.original.nodeAndModeExecutions,1873);assert.equal(automationRecovery.original.separateEnqueueHelperExecutions,7);assert.equal(automationRecovery.original.separatePartialDrainExecutions,4);assert.equal(automationRecovery.original.completeReleasedSchedulerExecutions,0);assert.equal(automationRecovery.original.completeReleasedServerExecutions,0);assert.equal(automationRecovery.original.authenticatedByUnchangedTestHarnessBeforeAndAfter,true);
  assert.equal(automationRecovery.independentReviewFindings.newReproducedDefects,0);for(const gate of ['fullParity','securityCertified','performanceSuperiority'])assert.equal(automationRecovery[gate],false);
  const recoveryIndependent=JSON.parse(readFileSync(join(developmentRoot,'apps/automation/results/recovery-followup/independent-review/review-validation.json')));assert.equal(recoveryIndependent.schema,'rea-automation-recovery-independent-review/v1');assert.deepEqual(recoveryIndependent.summary,automationRecovery.summary);assert.equal(recoveryIndependent.currentPublicReceipt.sha256,sha(automationRecoveryBytes));assert.equal(recoveryIndependent.currentSourceIdentityCount,43);assert.equal(recoveryIndependent.currentSourcesVerifiedUnchangedAtFreeze,true);assert.equal(recoveryIndependent.old721AndNew340SnapshotsAuthenticatedAtFreeze,true);assert.equal(recoveryIndependent.publicFingerprints.length,55);for(const e of recoveryIndependent.publicFingerprints)currentFingerprint({...e,path:'products/rea-studio/'+e.path},'Independent Automation reviewed public artifact');assert.equal(recoveryIndependent.newReproducedDefects,0);
  const nativeWorkflowsBrowser = JSON.parse(readFileSync(join(developmentRoot, 'results/browser-native-workflows-verification.json'), 'utf8'));
  assert.equal(nativeWorkflowsBrowser.schema, 'rea-native-workflows-browser-verification/v1');
  assert.deepEqual(nativeWorkflowsBrowser.checks.map(check => check.app).sort(), ['archive','automation','backup','metrics','sync']);
  assert.ok(nativeWorkflowsBrowser.checks.every(check => check.passed === true));
  for (const gate of ['every_documented_feature_verified','full_feature_parity_established','universal_superiority_established']) assert.equal(nativeWorkflowsBrowser[gate], false);
  for (const entry of [...nativeWorkflowsBrowser.implementation_fingerprints,...nativeWorkflowsBrowser.screenshots]) nativeWorkflowsFingerprint(entry, 'Native workflows browser');
  for (const [app,path] of [['archive','apps/archive/sevenzip-validation.json'],['automation','apps/automation/native-validation.json'],['backup','apps/backup/results/kdf-policy-validation.json'],['sync','apps/sync/results/native-verification.json']]) assert.equal(nativeWorkflowsBrowser.checks.find(check => check.app === app).receipt_sha256, sha(readFileSync(join(developmentRoot,path))));
  const currentBackupBrowser = nativeWorkflowsBrowser.checks.find(check => check.app === 'backup');
  assert.equal(currentBackupBrowser.password_cleared_after_every_observed_operation, true);
  assert.equal(currentBackupBrowser.request_password_absent_from_workspace_and_application_records, true);
  assert.ok(currentBackupBrowser.observations.every(check => check.passed && check.passwordCleared));
  const currentAutomationBrowser = nativeWorkflowsBrowser.checks.find(check => check.app === 'automation');
  assert.equal(currentAutomationBrowser.same_run_id_and_revision_after_restart, true);
  assert.equal(currentAutomationBrowser.existing_trace_preserved, true);
  assert.equal(currentAutomationBrowser.persisted_run_and_history_completed, true);
  assert.equal(currentAutomationBrowser.cancellation_persisted_without_downstream_effect_after_deadline, true);
  const nativeBrowser = JSON.parse(readFileSync(join(developmentRoot, 'results/browser-native-core-verification.json'), 'utf8'));
  assert.equal(nativeBrowser.schema, 'rea-native-core-browser-verification/v1');
  assert.deepEqual(nativeBrowser.checks.map(check => check.app).sort(), ['archive', 'backup', 'flow', 'metrics']);
  assert.ok(nativeBrowser.checks.every(check => check.passed === true));
  for (const gate of ['every_documented_feature_verified', 'full_feature_parity_established', 'universal_superiority_established']) assert.equal(nativeBrowser[gate], false);
  for (const entry of [...nativeBrowser.implementation_fingerprints, ...nativeBrowser.screenshots]) {
    nativeCoreFingerprint(entry, 'browser');
  }
  assert.equal(nativeBrowser.checks.find(check => check.app === 'archive').receipt_sha256, sha(readFileSync(join(developmentRoot, 'apps/archive/zstd-validation.json'))));
  const backupBrowser = nativeBrowser.checks.find(check => check.app === 'backup');
  assert.equal(backupBrowser.password_cleared_after_every_observed_operation, true);
  assert.equal(backupBrowser.request_password_absent_from_application_records, true);
  assert.ok(backupBrowser.observations.every(check => check.passwordCleared === true));
  const nativeFlow = JSON.parse(readFileSync(join(developmentRoot, 'apps/flow/results/native-original-comparison.json'), 'utf8'));
  assert.equal(nativeFlow.original.version, '5.0.8'); assert.equal(nativeFlow.original.originalRuntimeExecuted, true); assert.equal(nativeFlow.original.originalEditorExecuted, false);
  for (const cases of [nativeFlow.runtimeCases, nativeFlow.scalarSwitchCases]) { assert.equal(cases.total, cases.passed); assert.equal(cases.failed, 0); }
  assert.equal(nativeFlow.fullFeatureParity, false); assert.equal(nativeFlow.allWaysBetter, false);
  for (const [path, digest] of Object.entries(nativeFlow.implementationSha256)) { safeRecordPath(path); nativeCoreFingerprint({ path: 'products/rea-studio/apps/flow/' + path, sha256: digest }, 'flow'); }
  const nativeMetrics = JSON.parse(readFileSync(join(developmentRoot, 'apps/metrics/results/native-calculations-verification.json'), 'utf8'));
  assert.equal(nativeMetrics.status, 'passed'); assert.equal(nativeMetrics.failures.length, 0); assert.equal(nativeMetrics.canonicalIds, 124);
  assert.equal(nativeMetrics.comparisons, 2910751); assert.equal(nativeMetrics.standardHelperComparisons, 14240); assert.equal(nativeMetrics.originalDependencyVerified, true);
  safeRecordPath(nativeMetrics.implementationFile); assert.equal(sha(readFileSync(join(developmentRoot, 'apps/metrics', nativeMetrics.implementationFile))), nativeMetrics.implementationSha256);
  const nativeBackup = JSON.parse(readFileSync(join(developmentRoot, 'apps/backup/native-validation.json'), 'utf8'));
  assert.equal(nativeBackup.status, 'passed-bounded-native-interoperability'); assert.equal(nativeBackup.baseline.version, '0.19.1'); assert.equal(nativeBackup.baseline.publisherDigestReverified, true);
  assert.equal(nativeBackup.validation.tests, nativeBackup.validation.passed); assert.equal(nativeBackup.validation.failed + nativeBackup.validation.skipped + nativeBackup.validation.cancelled, 0);
  assert.equal(nativeBackup.customTimestampValidation.tests, nativeBackup.customTimestampValidation.passed); assert.equal(nativeBackup.customTimestampValidation.failed + nativeBackup.customTimestampValidation.skipped + nativeBackup.customTimestampValidation.cancelled, 0);
  for (const [path, digest] of Object.entries(nativeBackup.frozenHashes)) {
    const target = resolve(developmentRoot, 'apps/backup', path); assert.ok(target.startsWith(developmentRoot + '\\') || target.startsWith(developmentRoot + '/'));
    nativeCoreFingerprint({ path: relative(root, target).split('\\').join('/'), sha256: digest }, 'backup');
  }
  const backupReviewRoot = 'products/rea-studio/results/native-backup-review/';
  const backupPreservation = JSON.parse(readFileSync(join(root, backupReviewRoot, 'preservation-manifest.json'), 'utf8'));
  assert.equal(backupPreservation.schema, 'rea-independent-review-preservation/v1'); assert.equal(backupPreservation.fullFeatureParityEstablished, false); assert.equal(backupPreservation.universalSuperiorityEstablished, false);
  for (const entry of backupPreservation.snapshots) { safeRecordPath(entry.path); assert.ok(entry.path.startsWith(backupReviewRoot)); const bytes = readFileSync(join(root, entry.path)); assert.equal(bytes.length, entry.bytes); assert.equal(sha(bytes), entry.sha256, `Backup review artifact changed: ${entry.path}`); }
  for (const entry of backupPreservation.reviewedSources) { safeRecordPath(entry.path); if (entry.snapshot_path) { safeRecordPath(entry.snapshot_path); assert.ok(entry.snapshot_path.startsWith(backupReviewRoot)); assert.equal(sha(readFileSync(join(root, entry.snapshot_path))), entry.sha256); } else nativeCoreFingerprint(entry, 'independent backup review'); }
  const independentBackup = JSON.parse(readFileSync(join(root, backupReviewRoot, 'restic-independent-review-receipt.json'), 'utf8'));
  assert.equal(independentBackup.independentExecutions.exactCipherAndMACVectors, 176); assert.equal(independentBackup.independentExecutions.timestampAcceptance, 19);
  assert.equal(sha(readFileSync(join(root, backupReviewRoot, 'restic-independent-review-receipt.json'))), nativeBackup.independentReview.sha256);
  assert.equal(sha(readFileSync(join(root, backupReviewRoot, 'backup-native-validation.full34.pre-custom.json'))), nativeBackup.validation.historicalReceipt.sha256);
  assert.equal(grafanaSchema.failed, 0); assert.ok(Object.values(grafanaSchema.checks).every(value => value === true));
  assert.equal(sha(readFileSync(join(developmentRoot, 'apps/metrics/fixtures/vendor/classic-schema.ts'))), grafanaSchema.schemaSha256);
  for (const fixture of grafanaSchema.fixtureChecks) { assert.ok(/^[a-z0-9-]+\.json$/.test(fixture.fixture)); assert.equal(fixture.byteIdentical, true); assert.equal(sha(readFileSync(join(developmentRoot, 'apps/metrics/fixtures/vendor', fixture.fixture))), fixture.sha256); }
  const joplinOracle = JSON.parse(readFileSync(join(developmentRoot, 'apps/notes/fixtures/oracle-verification.json'), 'utf8'));
  assert.equal(joplinOracle.failed, 0);
  assert.equal(joplinOracle.passed, joplinOracle.checks.length);
  assert.ok(joplinOracle.checks.every(check => check.passed));
  assert.equal(joplinOracle.fullOriginalApplicationExecuted, false);
  for (const entry of joplinOracle.implementationFingerprints) rabinRoutingGeometryFingerprint(entry,'Historical22 Joplin serializer comparison');
  assert.equal(sha(readFileSync(join(developmentRoot, 'apps/notes/fixtures/pinned-joplin.jex'))), joplinOracle.fixtureSha256);
  const sketchOracle = JSON.parse(readFileSync(join(developmentRoot, 'apps/sketch/results/excalidraw-compatibility.json'), 'utf8'));
  assert.equal(sketchOracle.status, 'passed');
  for (const [path, digest] of Object.entries(sketchOracle.implementationSha256)) compressionRemoteFingerprint({path:'products/rea-studio/apps/sketch/'+path,sha256:digest}, 'Historical Excalidraw compared source');
  const sketchGeometry=JSON.parse(readFileSync(join(developmentRoot,'apps/sketch/results/geometry-validation.json'),'utf8'));
  assert.equal(sketchGeometry.schema,'rea-sketch-geometry-integration-validation/v1'); assert.deepEqual(sketchGeometry.summary,{tests:28,pass:28,fail:0,cancelled:0,skipped:0,todo:0});
  assert.equal(sketchGeometry.sourceBytesStableAcrossRun,true);assert.equal(sketchGeometry.collectorBytesStableAcrossRun,true);
  assert.equal(sketchGeometry.reviewedStageReceiptSha256,'af35be8567f3e60f3f980538d53bcae4f89c7165b19c6f5288b310bda3f0a8f3');assert.equal(sketchGeometry.reviewedStageSourceFiles,51);assert.equal(sketchGeometry.preservedProductionBaselineFiles,11);
  assert.equal(sketchGeometry.sourceFingerprints.length,13);for(const entry of sketchGeometry.sourceFingerprints)routingGeometryCheckpointFingerprint({...entry,path:'products/rea-studio/apps/sketch/'+entry.path},'First Sketch geometry integration');
  for(const entry of sketchGeometry.evidence)currentFingerprint({...entry,path:'products/rea-studio/apps/sketch/'+entry.path},'Sketch geometry original observation');
  const geometryStudyPrefix='products/rea-studio/apps/sketch/results/geometry-source-study/';
  const geometryStudyBytes=readFileSync(join(root,geometryStudyPrefix,'manifest.json'));assert.equal(sha(geometryStudyBytes),sketchGeometry.studyManifestSha256);assert.equal(sketchGeometry.studyManifestSha256,'73e5206e093c2a610117509ebb57508534b48a30cf77ea793577812b49e63bf9');
  const geometryStudy=JSON.parse(geometryStudyBytes);assert.equal(geometryStudy.schema,'rea-sketch-geometry-source-study/v1');assert.equal(geometryStudy.files.length,90);assert.equal(geometryStudy.sourceFiles,51);assert.equal(geometryStudy.productionBaseline.length,11);
  const geometryPaths=new Set();for(const entry of geometryStudy.files){safeRecordPath(entry.path);assert.ok(!geometryPaths.has(entry.path));geometryPaths.add(entry.path);currentFingerprint({...entry,path:geometryStudyPrefix+entry.path},'Preserved Sketch geometry source');}
  assert.equal(geometryStudy.snapshotMapping.length,90);for(const entry of geometryStudy.snapshotMapping){safeRecordPath(entry.originalPath);safeRecordPath(entry.snapshotPath);assert.ok(geometryPaths.has(entry.snapshotPath));}
  assert.equal(sketchGeometry.originalComparativeContexts,17);assert.deepEqual(sketchGeometry.originalDirectCalls,{getDiamondPoints:8,getSizeFromPoints:8,getNormalizedDimensions:0,restoreElement:18,serializeAsJSON:1});assert.equal(sketchGeometry.totalDirectOriginalCalls,35);assert.equal(sketchGeometry.legacyOracleIndividualRestorations,6);
  assert.deepEqual(sketchGeometry.originalPins,{archive:'b280d4b364b65cba264c5aa4e7435cc2ce6421eabbbef9765a56997a0fadf534',bundle:'3cfe278cb537fde73b42bbd4697b392946517d3dc02d3f3cf8487d8476f63ba2',map:'3df41b92bd8c248f482c3d5b163349e02a506c6807a638a38ff722d7e4c98552'});
  for(const gate of ['fullFeatureParity','productionSecurityVerified','universalSuperiority'])assert.equal(sketchGeometry[gate],false);
  assert.equal(sketchGeometry.collectorSha256,'cf044f4be673201b19247cb9bc9d31c86d713aef70d51fdb6c3508332a49621d');
  assert.equal(sketchCollectorStage.sources.get('baseline/scripts/verify-sketch-geometry.mjs')?.sha256,sketchGeometry.collectorSha256);
  const collectorIntegrationPath='products/rea-studio/apps/sketch/results/collector-followup/integration-validation.json';
  const collectorIntegrationBytes=readFileSync(join(root,collectorIntegrationPath));assert.equal(sha(collectorIntegrationBytes),'9f2af4ee3ffa9fc3ddd5fd5b2467e2e222725f02e39e0b165427e235f954191d');
  const sketchCollectorIntegration=JSON.parse(collectorIntegrationBytes);assert.equal(sketchCollectorIntegration.schema,'rea-sketch-collector-integration-validation/v1');assert.deepEqual(sketchCollectorIntegration.summary,{tests:17,pass:17,fail:0,cancelled:0,skipped:0,todo:0});assert.equal(sketchCollectorIntegration.sourceBytesStable,true);assert.equal(sketchCollectorIntegration.sourceFingerprints.length,5);assert.equal(sketchCollectorIntegration.distinctRegressionGroups,17);assert.equal(sketchCollectorIntegration.recordedChildExecutions,14);assert.equal(sketchCollectorIntegration.geometryBehaviorRerun,false);assert.equal(sketchCollectorIntegration.originalHelperExecutions,0);
  assert.equal(sketchCollectorIntegration.historicalGeometryReceiptSha256,sha(readFileSync(join(developmentRoot,'apps/sketch/results/geometry-validation.json'))));assert.equal(sketchCollectorIntegration.historicalGeometryEvidenceUnchanged,true);
  for(const entry of [...sketchCollectorIntegration.sourceFingerprints,...sketchCollectorIntegration.artifacts])currentFingerprint(entry,'Current Sketch collector integration');
  assert.deepEqual(sketchCollectorIntegration.sourceFingerprints,sketchCollectorAdapter.copied);
  for(const entry of sketchCollectorAdapter.copied){const snapshot=sketchCollectorAdapter.sources.get(entry.exactAdapterSource);assert.ok(snapshot);assert.equal(snapshot.sha256,entry.sha256);assert.equal(snapshot.bytes,entry.bytes);}
  assert.equal(sketchCollectorIntegration.stagePreservation.sha256,'b5346f5d96e41a707823bef3be721f0d8427576f39bdd52d480d980988661bb9');assert.equal(sketchCollectorIntegration.adapterPreservation.sha256,'8117c71aa9e7c6650092f6fff85a72ca3a6c0d5817aec4b65bc222a934f9ee62');
  const collectorChild=JSON.parse(readFileSync(join(developmentRoot,'apps/sketch/results/collector-followup/integration-child-run.json')));assert.equal(collectorChild.execution.exitCode,0);assert.equal(collectorChild.execution.failure,null);assert.equal(collectorChild.execution.closed,true);assert.equal(collectorChild.sourceBytesStable,true);assert.deepEqual(collectorChild.sourceBefore,collectorChild.sourceAfter);assert.deepEqual(collectorChild.sourceBefore,sketchCollectorIntegration.sourceFingerprints.map(e=>({name:e.path,bytes:e.bytes,sha256:e.sha256})));
  const collectorIndependent=JSON.parse(readFileSync(join(developmentRoot,'apps/sketch/results/collector-followup/independent-review/review-validation.json')));assert.equal(collectorIndependent.schema,'rea-sketch-collector-independent-review/v1');assert.deepEqual(collectorIndependent.summary,sketchCollectorIntegration.summary);assert.equal(collectorIndependent.sourceIdentityCount,111);assert.equal(collectorIndependent.productionSourcesVerifiedUnchanged,true);assert.equal(collectorIndependent.allRecordedOwnedRootAndDescendantPidsAbsent,true);assert.equal(collectorIndependent.currentIntegrationReceiptSHA256,sha(collectorIntegrationBytes));assert.equal(collectorIndependent.geometry28Executed,false);assert.equal(collectorIndependent.originalExcalidrawHelpersExecuted,false);assert.equal(collectorIndependent.newReproducedDefects,0);
  for(const gate of ['fullFeatureParity','universalSuperiority'])assert.equal(sketchCollectorIntegration[gate],false);
  const vaultOracle = JSON.parse(readFileSync(join(developmentRoot, 'apps/vault/compatibility-evidence.json'), 'utf8'));
  assert.equal(vaultOracle.result.exitCode, 0);
  assert.equal(vaultOracle.result.failed + vaultOracle.result.skipped, 0);
  assert.equal(vaultOracle.result.passed, vaultOracle.result.tests);
  assert.ok(vaultOracle.checks.every(check => check.passed));
  for (const entry of vaultOracle.implementationFingerprints) {
    if(entry.path==='products/rea-studio/apps/vault/README.md') {
      // Documentation changed separately; the exact old document is retained,
      // and the old behavioral receipt is not rebound to current prose.
      const retained=historicalVaultReadme.sources.get(entry.path);assert.ok(retained);
      assert.equal(entry.sha256,retained.sha256);assert.equal(entry.bytes,retained.bytes);
      currentPublicFingerprint({...retained,path:historicalVaultReadmePrefix+retained.path},'Historical18 exact Vault README');
    } else rabinRoutingGeometryFingerprint(entry,'Historical18 KeePass exchange comparison');
  }
  assert.equal(comparison.full_product_feature_parity_established, false);
  assert.equal(comparison.universal_superiority_established, false);
  for (const entry of comparison.cases) for (const identity of [entry.candidate.implementation_identity, ...(entry.candidate.implementation_identity.dependencies ?? [])]) published455Fingerprint(identity,'Historical455 compared editor source');
  const sequenceComparison = JSON.parse(readFileSync(join(developmentRoot, 'results/sequence-comparison.json'), 'utf8'));
  assert.equal(sequenceComparison.full_product_feature_parity_established, false);
  assert.equal(sequenceComparison.universal_superiority_established, false);
  assert.equal(sha(readFileSync(join(developmentRoot, 'scripts/sequence-benchmark-worker.mjs'))), sequenceComparison.worker_sha256);
  for (const entry of sequenceComparison.cases) published455Fingerprint(entry.candidate.implementation_identity,'Historical455 compared sequence source');
  const performanceFollowup = JSON.parse(readFileSync(join(developmentRoot, 'results/editor-performance-followup.json'), 'utf8'));
  assert.equal(performanceFollowup.full_product_feature_parity_established, false); assert.equal(performanceFollowup.universal_superiority_established, false); assert.equal(performanceFollowup.runs.length, 3);
  for (const identity of [performanceFollowup.implementation_identity, performanceFollowup.comparator_identity]) published455Fingerprint(identity,'Historical455 performance follow-up source');
  assert.equal(sha(readFileSync(join(developmentRoot, 'results/milestones/native-exchange-20261012/sequence-comparison.json'))), performanceFollowup.baseline.sha256);
  for (const run of performanceFollowup.runs) { assert.equal(run.worker_sha256, sequenceComparison.worker_sha256); for (const entry of run.cases) { assert.equal(entry.candidate.replay_validated, true); assert.equal(entry.candidate.implementation_identity.sha256, performanceFollowup.implementation_identity.sha256); } }
  const requirementsRoot = join(developmentRoot, 'requirements');
  const requirementIndex = JSON.parse(readFileSync(join(requirementsRoot, 'INDEX.json'), 'utf8'));
  const capabilityIds = new Set();
  const applications = new Set();
  let sourceFingerprints = 0;
  for (const registry of requirementIndex.registries) {
    assert.ok(/^[a-z-]+\.json$/.test(registry.file));
    const record = JSON.parse(readFileSync(join(requirementsRoot, registry.file), 'utf8'));
    let rows;
    if (registry.file === 'workspace-products.json') {
      assert.equal(record.exhaustive, false);
      assert.equal(record.fullProductParityVerified, false);
      rows = record.capabilities;
      assert.ok(rows.every(row => row.parityPassed === false));
    } else if (registry.file === 'visual-products.json') {
      assert.equal(record.exhaustive, false);
      rows = record.baselineProducts.flatMap(product => product.requirements);
      assert.ok(rows.every(row => row.parityVerified === false));
    } else {
      assert.equal(record.inventory_complete, false);
      rows = record.products.flatMap(product => product.capabilities);
      assert.ok(rows.every(row => row.completion_gate === 'not-passed'));
    }
    assert.equal(rows.length, registry.capability_area_rows);
    assert.equal(record.sources.length, registry.source_fingerprints);
    for(const source of record.sources){const retained=keepassSupplementBinding.originalSources.filter(e=>e.registry===registry.file&&e.id===source.id);assert.equal(retained.length,1,'Supplement must retain each historical source identity exactly once');assert.equal(retained[0].sha256,source.sha256);}
    for(const row of rows)assert.equal(keepassSupplementBinding.capabilityIds.filter(e=>e.registry===registry.file&&e.id===row.id).length,1,'Supplement must retain each capability identity exactly once');
    const localEvidence = registry.file === 'workspace-products.json' ? record.localImplementationEvidence
      : registry.file === 'visual-products.json' ? record.baselineProducts.flatMap(product => product.implementationFiles ?? [])
      : record.products.flatMap(product => product.local_implementation_evidence ?? []);
    for (const entry of localEvidence) {
      const bytes = readFileSync(join(root, entry.path));
      assert.equal(sha(bytes), entry.sha256, `Requirement implementation changed: ${entry.path}`);
      if (entry.bytes !== undefined) assert.equal(bytes.length, entry.bytes, `Requirement implementation size changed: ${entry.path}`);
    }
    for (const row of rows) { assert.ok(!capabilityIds.has(row.id), `Duplicate capability ID: ${row.id}`); capabilityIds.add(row.id); }
    for (const app of registry.applications) { assert.ok(!applications.has(app)); applications.add(app); }
    sourceFingerprints += record.sources.length;
  }
  assert.equal(applications.size, 10);
  assert.equal(sourceFingerprints,keepassSupplementBinding.originalSources.length);assert.equal(capabilityIds.size,keepassSupplementBinding.capabilityIds.length);
  assert.equal(capabilityIds.size, requirementIndex.capability_area_rows);
  assert.equal(requirementIndex.exhaustive_feature_inventory_established, false);
  assert.equal(requirementIndex.full_product_parity_rows_passed, 0);
  productDevelopment = { applications: 10, historical_937_recorded_tests_passed: validation.summary.pass, historical_937_tested_source_hashes_checked: validation.source_files.length, historical_937_reviewed_source_routes: historical937Routed, historical_937_unchanged_current_source_rows: historical937Unchanged, full_development_suite_rerun: false, browser_workflow_records: browser.checks.length, historical_native_browser_workflow_records: currentBrowser.checks.length, historical_execution_browser_workflow_records: executionBrowser.checks.length, historical_execution_archive_source_hashes_checked: historicalExecution.sources.size, historical_execution_archive_source_revision: historicalExecution.source_revision, historical_joplin_original_method_checks: joplinOracle.passed, historical_keepass_interoperability_test_collection: vaultOracle.result.passed, automation_execution_test_collection: automationExecution.summary.pass, historical_archive_zip_test_collection: archiveZip.checks.successful_result.passed, historical_archive_format_test_collection: archiveFormats.summary.pass, current_archive_test_collection: archiveZstd.checks.result.passed, grafana_unchanged_original_fixtures: grafanaSchema.fixtureChecks.length, capability_area_rows: capabilityIds.size, source_fingerprint_records: sourceFingerprints, exhaustive_feature_inventory_established: false, complete_replacement_products: 0 };
  Object.assign(productDevelopment, {
    historical_backup_compression_tests_passed: backupCompression.summary.pass,
    historical_backup_compression_source_hashes_checked: backupCompression.implementationFingerprints.length,
    preserved_backup_compression_study_artifacts: compressionPreservation.snapshots.length,
    historical_backup_rabin_and_compression_tests_passed: backupRabin.summary.pass,
    historical_backup_rabin_source_hashes_checked: backupRabin.implementationFingerprints.length,
    historical_backup_rabin_original_file_cases: backupRabin.original.fileCases,
    historical_backup_rabin_ordered_chunk_entries: backupRabin.original.orderedChunkEntries,
    current_recorder_tests_passed: recorderIntegration.summary.pass,
    keepass_manual_selected_contracts: keepassSupplement.requirements.length,
    keepass_manual_html_topics_censused: keepassCensus.htmlTopics.length,
    keepass_manual_documentation_integrity_checks: keepassSupplementValidation.documentationIntegrityChecks.pass,
    keepass_manual_original_behavior_executions: 0,
    keepass_manual_candidate_acceptance_executions: 0,
    preserved_failed_combined_suite_artifacts: failedCombinedPreservation.snapshots.length,
    historical_backup_native_policy_tests_passed: nativePolicy.summary.pass,
    historical_backup_native_policy_source_hashes_checked: nativePolicy.implementationFingerprints.length,
    preserved_backup_native_policy_artifacts: nativePolicyManifest.snapshots.length,
    preserved_independent_recorder_review_artifacts: recorderHistory.snapshots.length,
    historical_backup_lifecycle_tests_passed: backupRabin.lifecycle.productionModuleObservations,
    historical_backup_strict_expired_io_cases: backupRabin.lifecycle.strictExpiredIOCases,
    current_backup_aggregate_focus_tests_passed: packIntegration.summary.pass,
    current_backup_aggregate_source_hashes_checked: packIntegration.implementationFingerprints.length,
    current_backup_queue_ownership_cases: packIntegration.observations.ownership.length,
    preserved_backup_aggregate_artifacts: packAggregationStage.snapshots.length,
    preserved_backup_failed_116_artifacts: failedPack116.snapshots.length,
    preserved_backup_collector_failure_artifacts: packCollectorFailure.snapshots.length,
    historical_455_notes_notebook_tests_passed: notebooksReceipt.summary.pass,
    historical_455_notes_additional_held_persistence_cases: notebooksReceipt.additionalHeldPersistenceCases,
    historical_455_notes_notebook_original_exact_comparisons: notebooksReceipt.originalAccounting.exactComparisons,
    historical_455_notes_additional_original_move_contract_executions: notebooksReceipt.originalAccounting.additionalOriginalMoveContractExecutions,
    historical_455_notes_original_gui_executions: notebooksReceipt.originalAccounting.originalGuiExecutions,
    historical_455_notes_notebook_source_hashes_checked: notebooksReceipt.implementationFingerprints.length,
    historical_455_notes_browser_checks_passed: notebooksBrowser.summary.passed,
    historical_455_notes_browser_source_hashes_checked: notebooksBrowser.sourceFingerprints.length,
    historical_455_vault_history_tests_passed: vaultHistory.summary.pass,
    historical_455_vault_history_source_hashes_checked: vaultHistory.implementationFingerprints.length,
    historical_455_vault_history_original_assembly_loads: vaultHistory.originalAccounting.assemblyLoads,
    historical_455_vault_history_original_gui_executions: vaultHistory.originalAccounting.originalGuiExecutions,
    historical_455_vault_history_test_host_processes: vaultHistory.candidateAccounting.hostProcesses,
    preserved_vault_history_public_stage_snapshots: vaultPublicStage.publicInertSnapshots,
    local_only_vault_history_source_archive_carriers: vaultPublicStage.localCarriers,
    historical_rabin_routing_geometry_combined_tests_passed: rabinRoutingGeometryHistory.combined_tests,
    historical_rabin_routing_geometry_source_hashes_checked: rabinRoutingGeometrySources.size,
    preserved_backup_rabin_study_artifacts: rabinPreservation.snapshots.length,
    historical_sync_test_collection: webdav.testRun.pass,
    historical_webdav_test_collection: webdav.testRun.newWebDAVTests,
    historical_webdav_original_executions: webdav.oracle.authenticatedOriginalExecutions,
    historical_webdav_original_comparison_decisions: webdav.oracle.comparisonDecisions,
    current_archive_test_collection: archiveLzma.test_run.passed,
    current_archive_source_and_proof_hashes_checked: lzmaIntegrityResult.fingerprints,
    historical_compression_remote_browser_workflow_records: compressionBrowser.checks.length,
    historical_compression_remote_browser_source_hashes_checked: compressionBrowser.implementation_fingerprints.length,
    historical_compression_remote_source_revision: compressionRemoteHistory.source_revision,
    historical_compression_remote_source_hashes_checked: compressionRemoteSources.size,
    historical_native_core_browser_workflow_records: nativeBrowser.checks.length,
    historical_native_workflows_browser_workflow_records: nativeWorkflowsBrowser.checks.length,
    historical_native_workflows_browser_source_hashes_checked: nativeWorkflowsBrowser.implementation_fingerprints.length,
    historical_native_workflows_source_revision: nativeWorkflowsHistory.source_revision,
    historical_native_workflows_source_hashes_checked: nativeWorkflowsSources.size,
    historical_sevenzip_test_collection: sevenzip.test_run.passed,
    historical_native_automation_test_collection: nativeAutomation.summary.pass,
    first_native_automation_routing_tests_passed: automationRouting.summary.passed,
    first_native_automation_editor_regressions_passed: automationRouting.summary.priorEditorRegressions,
    current_native_automation_recovery_tests_passed: automationRecovery.summary.pass,
    current_native_automation_routing_exact_output_matches: automationRecovery.original.counts.exactOutputMatches,
    preserved_automation_recovery_stage_artifacts: automationRecoveryStage.snapshots.length,
    preserved_automation_recovery_independent_review_artifacts: automationRecoveryIndependentReview.snapshots.length,
    current_automation_browser_checks_passed: recoveryBrowser.summary.passed,
    preserved_automation_routing_artifacts: routingPreservation.entries.length,
    first_sketch_geometry_tests_passed: sketchGeometry.summary.pass,
    first_sketch_geometry_direct_original_calls: sketchGeometry.totalDirectOriginalCalls,
    preserved_sketch_geometry_artifacts: geometryStudy.files.length,
    preserved_automation_independent_review_artifacts: routingIndependentReview.snapshots.length,
    preserved_sketch_independent_review_artifacts: geometryIndependentReview.snapshots.length,
    current_sketch_collector_tests_passed: sketchCollectorIntegration.summary.pass,
    preserved_sketch_collector_followup_artifacts: sketchCollectorStage.snapshots.length+sketchCollectorAdapter.snapshots.length,
    preserved_sketch_collector_independent_review_artifacts: sketchCollectorIndependentReview.snapshots.length,
    preserved_rabin_routing_geometry_browser_source_hashes: routingGeometryBrowserSources.size,
    unaccepted_metrics_measurement_children: metricsDispatchReceipt.timingChildren+metricsDispatchReceipt.isolatedMemoryChildren,
    unaccepted_metrics_output_cache_checks: metricsDispatchReceipt.outputCacheChecks,
    preserved_unaccepted_metrics_measurement_artifacts: metricsDispatchPreservation.snapshots.length,
    native_n8n_original_exact_outputs: accounting.exactOutputMatches,
    native_n8n_original_rejection_outcomes: accounting.rejectionOutcomeMatches,
    native_n8n_normalized_http_outputs: accounting.normalizedHttpOutputMatches,
    native_n8n_intentional_deviations: accounting.deliberateDeviations,
    historical_native_rclone_test_collection: nativeSync.testRun.pass,
    native_rclone_original_filter_settings: nativeSync.differential.filterSettings,
    native_rclone_original_comparison_decisions: nativeSync.differential.comparisonDecisions,
    node_red_original_runtime_cases: nativeFlow.runtimeCases.passed,
    node_red_original_scalar_switch_cases: nativeFlow.scalarSwitchCases.passed,
    grafana_original_native_calculation_comparisons: nativeMetrics.comparisons,
    grafana_original_standard_helper_comparisons: nativeMetrics.standardHelperComparisons,
    encrypted_backup_independent_cipher_mac_vectors: independentBackup.independentExecutions.exactCipherAndMACVectors,
    encrypted_backup_preserved_review_artifacts: backupPreservation.snapshots.length
  });
  assert.equal(status.goal_status, 'active');
}
const receipt = {
  status: 'passed', checked_at_utc: new Date().toISOString(), projects: index.projects.length,
  payload_files: manifest.files.length, payload_bytes: checkedBytes, json_files_parsed: parsedJson,
  javascript_syntax_checks: checkedScripts, publication_sha256_checks: manifest.files.length,
  project_metadata_and_record_counts_consistent: true, excluded_artifacts_not_in_payload: true,
  credential_pattern_scan_passed: true, root_document_links_resolve: true,
  preserved_vendor_and_historical_document_links_not_rebased: true,
  source_proof_migration: sourceProofMigration.summary(),
  finite_cloud_flow_vault: finiteCloudRecovery,
  followup_evidence: followupEvidence,
  named_historical_shared_host_receipts: { backup64: { current_nonhost_rows:41, historical_host_rows:1 }, automation_recovery_browser: { current_nonhost_rows:40, historical_host_rows:1 }, automation_recovery: { current_nonhost_rows:42, historical_host_rows:1 }, webdav_host_dependencies: { current_nonhost_rows:2, historical_host_rows:1 }, metrics_algorithm_baseline: { current_nonhost_rows:7, historical_host_rows:1 }, backup_rabin_sources: { current_nonhost_rows:27, prior_other_historical_rows:6, historical_host_rows:1 }, historical_host_sha256:'807a473ec0334f60dfd58f2df8901c722f1bd4eb1d64c62d9ba1ea65c2b6b55f', current_host_sha256:'85fe09b1b52a1d91e9d09c85d99c6e768ac4b793f5d7694a1760a4c0560a0a94', prior_receipts_rebound:false, original_behavior_rerun:false, current_host_still_required:true },
  ...(productDevelopment ? { product_development: productDevelopment } : {}),
  scope: 'Publication integrity, syntax and existing record consistency; this does not rerun the original behavioral experiments or development tests.'
};
if (process.argv.includes('--write')) writeFileSync(join(root, 'VALIDATION.json'), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt));
