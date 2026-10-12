import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'PUBLICATION-MANIFEST.json'), 'utf8'));
const index = JSON.parse(readFileSync(join(root, 'PROJECT-INDEX.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let checkedBytes = 0, parsedJson = 0, checkedScripts = 0;
const forbidden = /(^|\/)(artifacts|node_modules|tooling|__pycache__|work|\.local)(\/|$)|\.(exe|dll|zip|tgz|bundle|tar|7z|pyc)$/i;
const credentialPattern = /\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[0-9A-Z]{16})\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
for (const entry of manifest.files) {
  assert.ok(!entry.path.startsWith('/') && !entry.path.split('/').includes('..') && !entry.path.includes('\\'));
  assert.ok(!forbidden.test(entry.path), `Excluded vendor/runtime material found in publication: ${entry.path}`);
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
  assert.equal(new Set(browser.checks.map(check => check.app)).size, 10);
  assert.ok(browser.checks.every(check => check.passed));
  assert.equal(browser.every_documented_feature_verified, false);
  const currentBrowser = JSON.parse(readFileSync(join(developmentRoot, 'results/browser-compatibility-verification.json'), 'utf8'));
  assert.deepEqual([...new Set(currentBrowser.checks.map(check => check.app))].sort(), ['editor', 'notes', 'sketch', 'vault']);
  assert.ok(currentBrowser.checks.every(check => check.passed));
  assert.equal(currentBrowser.every_documented_feature_verified, false);
  assert.equal(currentBrowser.full_feature_parity_established, false);
  assert.equal(currentBrowser.universal_superiority_established, false);
  for (const entry of [...currentBrowser.implementation_fingerprints, currentBrowser.screenshot]) assert.equal(sha(readFileSync(join(root, entry.path))), entry.sha256, `Browser-tested file changed: ${entry.path}`);
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
  productDevelopment = { applications: 10, recorded_tests_passed: validation.summary.pass, tested_source_hashes_checked: validation.source_files.length, browser_workflow_records: browser.checks.length, added_browser_workflow_records: currentBrowser.checks.length, joplin_original_method_checks: joplinOracle.passed, keepass_interoperability_test_collection: vaultOracle.result.passed, capability_area_rows: capabilityIds.size, source_fingerprint_records: sourceFingerprints, exhaustive_feature_inventory_established: false, complete_replacement_products: 0 };
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
