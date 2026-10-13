import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = dirname(fileURLToPath(import.meta.url)), sha = b => createHash('sha256').update(b).digest('hex');
const receipt = JSON.parse(readFileSync(resolve(root, 'draft-validation.json')));
assert.equal(receipt.schema, 'rea-lzma-encoder-research-validation/v1'); assert.equal(receipt.staging_only, true); assert.equal(receipt.integrated_application, false);
for (const field of ['full_feature_parity', 'all_ways_improved', 'original_ratio_speed_parity', 'original_application_runtime_wrapper']) assert.equal(receipt[field], false);
assert.deepEqual([receipt.tests.tests, receipt.tests.pass, receipt.tests.fail, receipt.tests.skipped], [64, 64, 0, 0]);
let count = 0;
for (const [key, group] of Object.entries(receipt)) if (key.endsWith('_fingerprints')) for (const f of group) {
  const bytes = readFileSync(resolve(root, f.path)); assert.equal(bytes.length, f.bytes, f.path); assert.equal(sha(bytes), f.sha256, f.path); count++;
}
const sources = JSON.parse(readFileSync(resolve(root, 'provenance.json')));
for (const source of sources.source_study) {
  const bytes = readFileSync(resolve(root, source.local)); assert.equal(bytes.length, source.bytes); assert.equal(sha(bytes), source.sha256);
  const text = bytes.toString('utf8').split(/\r?\n/); for (const ref of source.line_refs) assert.equal(text[ref.line - 1], ref.text, `${source.local}:${ref.line}`);
}
for (const source of [...sources.oracle, ...sources.packages]) { const bytes = readFileSync(source.path); assert.equal(bytes.length, source.bytes); assert.equal(sha(bytes), source.sha256, source.path); }
for (const dir of ['first-ratio-attempt', 'post-hoc-25pct']) {
  const prefix = resolve(root, 'history', dir), history = JSON.parse(readFileSync(resolve(prefix, 'fixtures-manifest.json')));
  for (const [name, expected] of Object.entries(history.implementation_sha256)) assert.equal(sha(readFileSync(resolve(prefix, name))), expected, `${dir}/${name}`);
}
console.log(JSON.stringify({ status: 'pass', fingerprints: count, tests: 64, original_7z_containers: receipt.tests.original_7z_containers, original_lzma_wrappers: receipt.tests.original_lzma_wrappers, benchmark_original_containers: receipt.benchmark.original_7z_containers, staging_only: true, full_feature_parity: false }, null, 2));
