import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'PUBLICATION-MANIFEST.json'), 'utf8'));
const index = JSON.parse(readFileSync(join(root, 'PROJECT-INDEX.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const historicalMilestone = 'products/rea-studio/results/milestones/execution-archive-20261012/';
function safeRecordPath(path) { assert.ok(typeof path === 'string' && path.length && !path.startsWith('/') && !path.split('/').includes('..') && !path.includes('\\'), `Invalid record path: ${path}`); }
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
const historicalDevelopment = historicalReceipt('products/rea-studio/results/development-validation.json');
for (const entry of historicalDevelopment.source_files) historicalFingerprint({ ...entry, path: 'products/rea-studio/' + entry.path }, 'development');
if (process.argv.includes('--historical-only')) {
  assert.ok(!process.argv.includes('--write'), 'Historical-only checks do not write current validation metadata.');
  console.log(JSON.stringify({ status: 'passed', scope: 'Historical receipt/source integrity only; no current behavioral or publication validation claim.', source_revision: historicalExecution.source_revision, receipt_hashes_checked: historicalExecution.receipts.size, source_hashes_checked: historicalExecution.sources.size })); process.exit(0);
}
let checkedBytes = 0, parsedJson = 0, checkedScripts = 0;
const forbidden = /(^|\/)(artifacts|node_modules|tooling|__pycache__|work|\.local)(\/|$)|\.(exe|dll|zip|tgz|bundle|tar|7z|pyc)$/i;
const syntheticZip = { path: 'products/rea-studio/apps/archive/fixtures/zstd/native-zip93.zip', sha256: 'e9282f76dbd3c080d0e12ef95489458523ebbc65c2951f4b8f3cb880a16c5d8b' };
const credentialPattern = /\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[0-9A-Z]{16})\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
for (const entry of manifest.files) {
  assert.ok(!entry.path.startsWith('/') && !entry.path.split('/').includes('..') && !entry.path.includes('\\'));
  assert.ok(!forbidden.test(entry.path) || entry.path === syntheticZip.path && entry.sha256 === syntheticZip.sha256, `Excluded vendor/runtime material found in publication: ${entry.path}`);
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
const documentNames = [...new Set(['README.md', 'SERIES-STUDY.md', 'TOOLING.md', 'LICENSES.md', ...manifest.files.filter(entry => entry.path.startsWith('products/rea-studio/') && entry.path.endsWith('.md')).map(entry => entry.path)])];
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
  const validation = JSON.parse(readFileSync(join(developmentRoot, 'results/development-validation.json'), 'utf8'));
  const browser = JSON.parse(readFileSync(join(developmentRoot, 'results/browser-verification.json'), 'utf8'));
  const comparison = JSON.parse(readFileSync(join(developmentRoot, 'results/editor-comparison.json'), 'utf8'));
  assert.equal(status.complete_replacement_products, 0);
  assert.equal(status.completion_status, 'incomplete');
  assert.equal(validation.summary.tests, validation.summary.pass + validation.summary.skipped);
  assert.equal(validation.summary.fail + validation.summary.cancelled + validation.summary.todo, 0);
  assert.equal(validation.full_feature_parity_established, false);
  assert.equal(validation.universal_superiority_established, false);
  for (const entry of validation.source_files) {
    assert.ok(!entry.path.startsWith('/') && !entry.path.split('/').includes('..') && !entry.path.includes('\\'));
    assert.equal(sha(readFileSync(join(developmentRoot, entry.path))), entry.sha256, `Development source changed after tests: ${entry.path}`);
  }
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
  const sevenzip = JSON.parse(readFileSync(join(developmentRoot, 'apps/archive/sevenzip-validation.json'), 'utf8'));
  assert.equal(sevenzip.schema, 'rea-sevenzip-validation/v1');
  assert.equal(sevenzip.test_run.passed, 68); assert.equal(sevenzip.test_run.sevenzip_passed, 26);
  assert.equal(sevenzip.test_run.failed + sevenzip.test_run.skipped, 0);
  assert.equal(sevenzip.full_feature_parity, false); assert.equal(sevenzip.all_ways_improved, false); assert.equal(sevenzip.original_application_runtime_wrapper, false);
  for (const entry of [...sevenzip.implementation_fingerprints, ...sevenzip.preserved_previous_receipts]) currentFingerprint(entry, '7Z');
  const backupKdf = JSON.parse(readFileSync(join(developmentRoot, 'apps/backup/results/kdf-policy-validation.json'), 'utf8'));
  assert.equal(backupKdf.schema, 'rea-restic-kdf-policy-followup/v1');
  assert.equal(backupKdf.validation.tests, 4); assert.equal(backupKdf.validation.pass, 4);
  assert.equal(backupKdf.validation.fail + backupKdf.validation.skipped + backupKdf.validation.cancelled, 0);
  assert.equal(backupKdf.change.current.minimumP, 13); assert.equal(backupKdf.change.current.maximumP, 32);
  assert.equal(backupKdf.change.automaticExistingKeyMigration, false);
  assert.equal(backupKdf.fullFeatureParityEstablished, false); assert.equal(backupKdf.universalSuperiorityEstablished, false);
  for (const entry of backupKdf.implementationFingerprints) currentFingerprint(entry, 'Backup KDF');
  const metricsPerformance = JSON.parse(readFileSync(join(developmentRoot, 'results/metrics-performance-followup/followup.json'), 'utf8'));
  assert.equal(metricsPerformance.schema, 'rea-native-calculation-performance-followup/v1');
  assert.equal(metricsPerformance.fullFeatureParityEstablished, false); assert.equal(metricsPerformance.universalSuperiorityEstablished, false);
  assert.equal(metricsPerformance.differential.comparisons, 2910751); assert.equal(metricsPerformance.differential.failures, 0);
  for (const entry of [...metricsPerformance.artifacts, metricsPerformance.implementation]) currentFingerprint(entry, 'Metrics performance');
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
  for (const [path, digest] of Object.entries(nativeSync.sourceFiles)) currentFingerprint({ path: 'products/rea-studio/apps/sync/' + path, sha256: digest }, 'Native Sync');
  for (const [path, entry] of Object.entries(nativeSync.evidence)) currentFingerprint({ ...entry, path: 'products/rea-studio/apps/sync/results/' + path }, 'Native Sync evidence');
  for (const [path, digest] of Object.entries(nativeSync.hostDependenciesAtTest)) {
    const target = resolve(developmentRoot, 'apps/sync', path);
    assert.ok(target.startsWith(developmentRoot + '\\') || target.startsWith(developmentRoot + '/'));
    nativeCoreFingerprint({ path: relative(root, target).replaceAll('\\', '/'), sha256: digest }, 'Native Sync host at focused test');
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
  for (const entry of nativeAutomation.sourceFiles) currentFingerprint({ ...entry, path:'products/rea-studio/apps/automation/' + entry.path }, 'Native Automation');
  for (const entry of nativeAutomation.sharedValidatedFiles) currentFingerprint(entry, 'Native Automation host');
  for (const name of ['stdout','stderr']) assert.equal(sha(Buffer.from(nativeAutomation.rawTestEvidence[name])), nativeAutomation.rawTestEvidence[name+'Sha256']);
  const nativeWorkflowsBrowser = JSON.parse(readFileSync(join(developmentRoot, 'results/browser-native-workflows-verification.json'), 'utf8'));
  assert.equal(nativeWorkflowsBrowser.schema, 'rea-native-workflows-browser-verification/v1');
  assert.deepEqual(nativeWorkflowsBrowser.checks.map(check => check.app).sort(), ['archive','automation','backup','metrics','sync']);
  assert.ok(nativeWorkflowsBrowser.checks.every(check => check.passed === true));
  for (const gate of ['every_documented_feature_verified','full_feature_parity_established','universal_superiority_established']) assert.equal(nativeWorkflowsBrowser[gate], false);
  for (const entry of [...nativeWorkflowsBrowser.implementation_fingerprints,...nativeWorkflowsBrowser.screenshots]) currentFingerprint(entry, 'Native workflows browser');
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
  for (const entry of joplinOracle.implementationFingerprints) assert.equal(sha(readFileSync(join(root, entry.path))), entry.sha256, `Joplin-compared file changed: ${entry.path}`);
  assert.equal(sha(readFileSync(join(developmentRoot, 'apps/notes/fixtures/pinned-joplin.jex'))), joplinOracle.fixtureSha256);
  const sketchOracle = JSON.parse(readFileSync(join(developmentRoot, 'apps/sketch/results/excalidraw-compatibility.json'), 'utf8'));
  assert.equal(sketchOracle.status, 'passed');
  for (const [path, digest] of Object.entries(sketchOracle.implementationSha256)) assert.equal(sha(readFileSync(join(developmentRoot, 'apps/sketch', path))), digest, `Excalidraw-compared file changed: ${path}`);
  const vaultOracle = JSON.parse(readFileSync(join(developmentRoot, 'apps/vault/compatibility-evidence.json'), 'utf8'));
  assert.equal(vaultOracle.result.exitCode, 0);
  assert.equal(vaultOracle.result.failed + vaultOracle.result.skipped, 0);
  assert.equal(vaultOracle.result.passed, vaultOracle.result.tests);
  assert.ok(vaultOracle.checks.every(check => check.passed));
  for (const entry of vaultOracle.implementationFingerprints) assert.equal(sha(readFileSync(join(root, entry.path))), entry.sha256, `KeePass-compared file changed: ${entry.path}`);
  assert.equal(comparison.full_product_feature_parity_established, false);
  assert.equal(comparison.universal_superiority_established, false);
  for (const entry of comparison.cases) for (const identity of [entry.candidate.implementation_identity, ...(entry.candidate.implementation_identity.dependencies ?? [])]) assert.equal(sha(readFileSync(join(root, identity.path))), identity.sha256, 'Compared editor source changed');
  const sequenceComparison = JSON.parse(readFileSync(join(developmentRoot, 'results/sequence-comparison.json'), 'utf8'));
  assert.equal(sequenceComparison.full_product_feature_parity_established, false);
  assert.equal(sequenceComparison.universal_superiority_established, false);
  assert.equal(sha(readFileSync(join(developmentRoot, 'scripts/sequence-benchmark-worker.mjs'))), sequenceComparison.worker_sha256);
  for (const entry of sequenceComparison.cases) assert.equal(sha(readFileSync(join(root, entry.candidate.implementation_identity.path))), entry.candidate.implementation_identity.sha256, 'Compared sequence source changed');
  const performanceFollowup = JSON.parse(readFileSync(join(developmentRoot, 'results/editor-performance-followup.json'), 'utf8'));
  assert.equal(performanceFollowup.full_product_feature_parity_established, false); assert.equal(performanceFollowup.universal_superiority_established, false); assert.equal(performanceFollowup.runs.length, 3);
  for (const identity of [performanceFollowup.implementation_identity, performanceFollowup.comparator_identity]) assert.equal(sha(readFileSync(join(root, identity.path))), identity.sha256, 'Performance follow-up source changed');
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
  assert.equal(capabilityIds.size, requirementIndex.capability_area_rows);
  assert.equal(requirementIndex.exhaustive_feature_inventory_established, false);
  assert.equal(requirementIndex.full_product_parity_rows_passed, 0);
  productDevelopment = { applications: 10, recorded_tests_passed: validation.summary.pass, tested_source_hashes_checked: validation.source_files.length, browser_workflow_records: browser.checks.length, historical_native_browser_workflow_records: currentBrowser.checks.length, historical_execution_browser_workflow_records: executionBrowser.checks.length, historical_execution_archive_source_hashes_checked: historicalExecution.sources.size, historical_execution_archive_source_revision: historicalExecution.source_revision, joplin_original_method_checks: joplinOracle.passed, keepass_interoperability_test_collection: vaultOracle.result.passed, automation_execution_test_collection: automationExecution.summary.pass, historical_archive_zip_test_collection: archiveZip.checks.successful_result.passed, historical_archive_format_test_collection: archiveFormats.summary.pass, current_archive_test_collection: archiveZstd.checks.result.passed, grafana_unchanged_original_fixtures: grafanaSchema.fixtureChecks.length, capability_area_rows: capabilityIds.size, source_fingerprint_records: sourceFingerprints, exhaustive_feature_inventory_established: false, complete_replacement_products: 0 };
  Object.assign(productDevelopment, {
    historical_native_core_browser_workflow_records: nativeBrowser.checks.length,
    current_native_browser_workflow_records: nativeWorkflowsBrowser.checks.length,
    current_native_browser_source_hashes_checked: nativeWorkflowsBrowser.implementation_fingerprints.length,
    current_archive_test_collection: sevenzip.test_run.passed,
    current_automation_test_collection: nativeAutomation.summary.pass,
    native_n8n_original_exact_outputs: accounting.exactOutputMatches,
    native_n8n_original_rejection_outcomes: accounting.rejectionOutcomeMatches,
    native_n8n_normalized_http_outputs: accounting.normalizedHttpOutputMatches,
    native_n8n_intentional_deviations: accounting.deliberateDeviations,
    native_rclone_test_collection: nativeSync.testRun.pass,
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
  ...(productDevelopment ? { product_development: productDevelopment } : {}),
  scope: 'Publication integrity, syntax and existing record consistency; this does not rerun the original behavioral experiments or development tests.'
};
if (process.argv.includes('--write')) writeFileSync(join(root, 'VALIDATION.json'), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt));
