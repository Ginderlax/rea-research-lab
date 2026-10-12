// Read-only digest verification. Tests use separate authenticated original oracles.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const app = import.meta.dirname, sha = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = JSON.parse(readFileSync(join(app, 'lzma-validation.json')));
assert.equal(receipt.schema, 'rea-lzma-application-validation/v1');
for (const key of ['full_feature_parity', 'all_ways_improved', 'original_compression_performance_parity', 'original_application_runtime_wrapper']) assert.equal(receipt[key], false);
assert.equal(receipt.integrated_application, true);
assert.deepEqual([receipt.test_run.tests, receipt.test_run.passed, receipt.test_run.failed, receipt.test_run.skipped], [169,169,0,0]);
let verified = 0;
for (const [key, group] of Object.entries(receipt)) if (key.endsWith('_fingerprints')) for (const f of group) {
  assert.ok(!f.path.startsWith('/') && !f.path.includes('..') && !f.path.includes('\\'));
  const bytes = readFileSync(resolve(app, f.path)); assert.equal(bytes.length, f.bytes, f.path); assert.equal(sha(bytes), f.sha256, f.path); verified++;
}
const stage = join(app, 'results/lzma-stage');
for (const type of ['decoder','encoder']) {
  const old = JSON.parse(readFileSync(join(stage, type, 'draft-validation.json')));
  for (const f of old.implementation_fingerprints) { const bytes = readFileSync(join(stage,type,f.path)); assert.equal(bytes.length, f.bytes); assert.equal(sha(bytes),f.sha256); }
}
for (const dir of ['first-ratio-attempt','post-hoc-25pct']) {
  const source = join(stage,'history',dir), manifest = JSON.parse(readFileSync(join(source,'fixtures-manifest.json')));
  for (const [name, expected] of Object.entries(manifest.implementation_sha256)) assert.equal(sha(readFileSync(join(source,name))), expected);
}
const failed = JSON.parse(readFileSync(join(stage,'history/first-ratio-attempt/failed-case-fixtures.json')));
assert.equal(failed.fixtures.length,6); assert.equal(failed.post_hoc_performance_success_claim,false);
for (const f of failed.fixtures) { const bytes = Buffer.from(f.archive_base64,'base64'); assert.equal(bytes.length,f.fixture.bytes); assert.equal(sha(bytes),f.fixture.sha256); }
const browser = JSON.parse(readFileSync(join(app,'results/lzma-browser-evidence.json')));
for (const f of browser.records) { const bytes = Buffer.from(f.archive_base64,'base64'); assert.equal(bytes.length,f.bytes); assert.equal(sha(bytes),f.sha256); }
const provenance = JSON.parse(readFileSync(join(app,'lzma-provenance.json')));
for (const s of provenance.source_study) {
  const bytes = readFileSync(join(app,s.public_path)); assert.equal(sha(bytes),s.sha256); assert.equal(bytes.length,s.bytes);
  const text = bytes.toString('utf8').split(/\r?\n/); for (const ref of s.line_refs) assert.equal(text[ref.line-1],ref.text,`${s.public_path}:${ref.line}`);
}
console.log(JSON.stringify({ status:'pass', fingerprints:verified, focused_archive_tests:169, source_assisted:true, original_runtime_wrapper:false, full_feature_parity:false },null,2));
