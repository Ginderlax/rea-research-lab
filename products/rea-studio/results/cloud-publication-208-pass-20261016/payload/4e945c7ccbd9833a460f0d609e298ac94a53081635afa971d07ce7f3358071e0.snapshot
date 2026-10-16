// Historical source/proof integrity only. No application, test or original runs.
import assert from 'node:assert/strict';
import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { createEditorVaultProofMigrationFromRoot } from './editor-vault-proof-migration.mjs';
const APP = 'products/rea-studio/apps/archive/';
const BEFORE = 'products/rea-studio/results/archive-aes-source-transition-20261015/before/';
const SIX = new Map([
  ['client.mjs', { bytes: 8881, sha256: '21a5ee67b639ebb56208defd56b195d6fe9ee2bbe911976033d106951ffe6b01' }],
  ['LZMA-COMPATIBILITY.md', { bytes: 8171, sha256: '6e29d723e149422bc1ba69988b9780b55cb4cad9667c7b33824d28fe54aa1b11' }],
  ['README.md', { bytes: 14861, sha256: 'f796caf227929a00bec27df7e912e1f634e1d0fadbf6dc66c0f3310c26d668e0' }],
  ['server.mjs', { bytes: 11633, sha256: 'f64a7d232552eb351ee15563b53abfe88afac667c7b005747b590ab9a580410d' }],
  ['SEVENZIP-COMPATIBILITY.md', { bytes: 10417, sha256: '1d8041a403c4de8f2bedaf6ed8fcb75fe237c49b6cdbd7190f1caca72a81fd89' }],
  ['sevenzip.mjs', { bytes: 25949, sha256: '7b8b775816951bd7fdbc25821503236732831169e0e35e7f4dfc3b9d719f016c' }],
]);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const id = bytes => ({ bytes: bytes.length, sha256: sha(bytes) });
function safe(name) { assert.ok(typeof name === 'string' && name && name.length <= 4096 && !/[\\:\x00-\x1f\x7f]/.test(name) && !name.startsWith('/') && name.split('/').every(part => part && part !== '.' && part !== '..')); return name; }

export function verifyArchiveIntegrationRecords(root) {
  const base = realpathSync(resolve(root)), migration = createEditorVaultProofMigrationFromRoot(base), scope = migration.summary();
  assert.equal(scope.archiveCurrentSourcesMandatory, 21); assert.equal(scope.archiveHistoricalReplacementRoutes, 6);
  const seen = new Map(); let total = 0;
  function read(name, expected) {
    safe(name); let at = base;
    for (const part of name.split('/')) { at = join(at, part); assert.equal(lstatSync(at).isSymbolicLink(), false, 'Reparse Archive proof path'); }
    const stat = lstatSync(at); assert.ok(stat.isFile() && stat.size <= 8 * 1024 * 1024);
    const bytes = readFileSync(at), observed = id(bytes); assert.equal(bytes.length, stat.size);
    if (expected) assert.deepEqual(observed, { bytes: expected.bytes, sha256: expected.sha256 }, name);
    if (seen.has(name)) assert.deepEqual(observed, seen.get(name), 'Changed Archive proof: ' + name);
    else { seen.set(name, observed); total += bytes.length; assert.ok(seen.size <= 320 && total <= 16 * 1024 * 1024); }
    return bytes;
  }
  const json = name => JSON.parse(read(name));
  read(APP + 'verify-lzma.mjs', { bytes: 3158, sha256: 'ef2bf20c8dd0b1cfdc0eb60648781a1027c08a55b60278aae5fb42b10166aefb' });
  const receipt = JSON.parse(read(APP + 'lzma-validation.json', { bytes: 27386, sha256: '50ad460a9c5e2406895af3a53f6a7bb3f00b0298d22eaee3acad4a90eed617e4' }));
  assert.equal(receipt.schema, 'rea-lzma-application-validation/v1');
  for (const key of ['full_feature_parity', 'all_ways_improved', 'original_compression_performance_parity', 'original_application_runtime_wrapper']) assert.equal(receipt[key], false);
  assert.equal(receipt.integrated_application, true);
  assert.deepEqual([receipt.test_run.tests, receipt.test_run.passed, receipt.test_run.failed, receipt.test_run.skipped], [169, 169, 0, 0]);
  let verified = 0; const routed = new Set();
  for (const [key, group] of Object.entries(receipt)) if (key.endsWith('_fingerprints')) for (const row of group) {
    safe(row.path); const name = APP + row.path;
    if (SIX.has(row.path)) {
      assert.deepEqual({ bytes: row.bytes, sha256: row.sha256 }, SIX.get(row.path)); assert.equal(routed.has(row.path), false);
      const historical = migration.resolve(name, row); assert.equal(historical, BEFORE + name + '.snapshot'); read(historical, row); routed.add(row.path);
    } else { assert.equal(migration.resolve(name, row), null, 'Only the six fixed LZMA before-images may be routed'); read(name, row); }
    verified++;
  }
  assert.equal(verified, 124); assert.deepEqual([...routed].sort(), [...SIX.keys()].sort());
  const stage = APP + 'results/lzma-stage/';
  for (const type of ['decoder', 'encoder']) {
    const old = json(stage + type + '/draft-validation.json');
    for (const row of old.implementation_fingerprints) { safe(row.path); read(stage + type + '/' + row.path, row); }
  }
  for (const directory of ['first-ratio-attempt', 'post-hoc-25pct']) {
    const source = stage + 'history/' + directory + '/', manifest = json(source + 'fixtures-manifest.json');
    for (const [name, digest] of Object.entries(manifest.implementation_sha256)) { safe(name); assert.equal(sha(read(source + name)), digest); }
  }
  const failed = json(stage + 'history/first-ratio-attempt/failed-case-fixtures.json');
  assert.equal(failed.fixtures.length, 6); assert.equal(failed.post_hoc_performance_success_claim, false);
  for (const fixture of failed.fixtures) { const bytes = Buffer.from(fixture.archive_base64, 'base64'); assert.deepEqual(id(bytes), { bytes: fixture.fixture.bytes, sha256: fixture.fixture.sha256 }); }
  const browser = json(APP + 'results/lzma-browser-evidence.json');
  for (const row of browser.records) assert.deepEqual(id(Buffer.from(row.archive_base64, 'base64')), { bytes: row.bytes, sha256: row.sha256 });
  const provenance = json(APP + 'lzma-provenance.json');
  for (const source of provenance.source_study) {
    safe(source.public_path); const bytes = read(APP + source.public_path, source), lines = bytes.toString('utf8').split(/\r?\n/);
    for (const reference of source.line_refs) assert.equal(lines[reference.line - 1], reference.text, source.public_path + ':' + reference.line);
  }
  for (const [name, expected] of seen) read(name, expected);
  return { status: 'pass', fingerprints: verified, historical_focused_archive_tests: 169, historicalLzmaNotCurrentAcceptance: true,
    archiveCurrentSourcesMandatory: 21, exactHistoricalReplacementRoutes: routed.size, source_assisted: true, original_runtime_wrapper: false,
    originalAppVerifierUnchanged: true, receiptUnchanged: true, applicationExecutions: 0, behavioralTestsExecuted: 0, originalExecutions: 0,
    browserExecutions: 0, authenticatedFiles: seen.size, authenticatedBytes: total, full_feature_parity: false };
}
