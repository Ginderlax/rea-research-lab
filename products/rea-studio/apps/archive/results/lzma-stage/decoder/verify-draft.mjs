import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url)), sha = b => createHash('sha256').update(b).digest('hex');
const receipt = JSON.parse(readFileSync(resolve(root, 'draft-validation.json')));
assert.equal(receipt.schema, 'rea-lzma-research-validation/v1');
assert.equal(receipt.staging_only, true); assert.equal(receipt.integrated_application, false);
assert.equal(receipt.full_feature_parity, false); assert.equal(receipt.all_ways_improved, false); assert.equal(receipt.original_application_runtime_wrapper, false);
assert.equal(receipt.tests.tests, 35); assert.equal(receipt.tests.pass, 35); assert.equal(receipt.tests.fail, 0); assert.equal(receipt.tests.skipped, 0);
assert.equal(receipt.tests.positive_original_containers, 25);
const fingerprints = [...receipt.implementation_fingerprints, ...receipt.independent_vector_fingerprints, ...receipt.benchmark_fingerprints, ...receipt.protected_app_fingerprints];
for (const f of fingerprints) { const bytes = readFileSync(resolve(root, f.path)); assert.equal(bytes.length, f.bytes, f.path); assert.equal(sha(bytes), f.sha256, f.path); }
const provenance = JSON.parse(readFileSync(resolve(root, 'provenance.json')));
for (const source of provenance.source_study) {
  const text = readFileSync(resolve(root, source.local), 'utf8').split(/\r?\n/);
  for (const ref of source.line_refs) assert.equal(text[ref.line - 1], ref.text, `${source.local}:${ref.line}`);
}
console.log(JSON.stringify({ status: 'pass', fingerprints: fingerprints.length, tests: receipt.tests.pass, positive_original_containers: receipt.tests.positive_original_containers, full_feature_parity: false, staging_only: true }, null, 2));
