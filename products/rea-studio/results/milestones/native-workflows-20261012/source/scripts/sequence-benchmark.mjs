import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpus, platform, arch } from 'node:os';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
let seed = 0x1210abcd;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed >>> 16; };
const lines = n => Array.from({ length: n }, (_, i) => `line ${i}`);
const cases = [
  { id: 'recorded-nonminimal-witness', before: [...'ABACDEACACFC'], after: [...'EFC'] },
  { id: 'identical-512', before: lines(512), after: lines(512) },
  { id: 'single-change-512', before: lines(512), after: lines(512).map((line, i) => i === 256 ? 'updated line' : line) },
  { id: 'seeded-mixed-128', before: Array.from({ length: 128 }, () => String.fromCharCode(65 + random() % 8)), after: Array.from({ length: 128 }, () => String.fromCharCode(65 + random() % 8)) },
  { id: 'disjoint-256', before: Array.from({ length: 256 }, (_, i) => `before ${i}`), after: Array.from({ length: 256 }, (_, i) => `after ${i}`) },
  { id: 'reversed-256', before: lines(256), after: lines(256).reverse() },
  { id: 'high-similarity-2000', before: lines(2000), after: lines(2000).map((line, i) => i % 400 === 0 ? `updated ${i}` : line) },
  { id: 'duplicate-run-512', before: [...Array(256).fill('A'), ...Array(256).fill('B')], after: [...Array(256).fill('B'), ...Array(256).fill('A')] }
];
const results = [];
for (const [index, input] of cases.entries()) {
  const record = { id: input.id, before_elements: input.before.length, after_elements: input.after.length, input_sha256: createHash('sha256').update(JSON.stringify({ before: input.before, after: input.after })).digest('hex'), order: index % 2 ? ['candidate', 'original'] : ['original', 'candidate'] };
  for (const algorithm of record.order) {
    const run = spawnSync(process.execPath, ['--expose-gc', join(root, 'scripts/sequence-benchmark-worker.mjs')], { input: JSON.stringify({ ...input, algorithm }), cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024 });
    assert.equal(run.status, 0, String(run.stderr || run.error?.message || 'Comparison worker failed')); record[algorithm] = JSON.parse(run.stdout.trim());
  }
  record.candidate_cost_reduction = record.original.cost - record.candidate.cost;
  record.candidate_median_time_ratio = record.candidate.median_ms / record.original.median_ms;
  results.push(record);
}
const receipt = { schema: 'rea-shared-sequence-comparison/v1', checked_at_utc: new Date().toISOString(), scope: 'Monaco 0.57.0 internal Myers algorithm versus an original exact changed-span implementation; no whole editor or full internal result API parity claim.', host: { runtime: process.version, platform: platform(), architecture: arch(), cpu: cpus()[0]?.model }, methodology: 'Same getter-based sequence input constructed before timing; both return changed spans and hitTimeout. Separate fresh workers; 30 warmups and 200 measured algorithm calls per case; replay assertions occur after each timed call. Execution order alternates by case. p05/p95 are observed sample quantiles, not confidence intervals. Peak RSS covers the whole worker, imports, validation and inputs. Single-machine exploratory comparison with no independent replication or original deadline/result-helper comparison.', cases: results, worker_sha256: createHash('sha256').update(readFileSync(join(root, 'scripts/sequence-benchmark-worker.mjs'))).digest('hex'), full_product_feature_parity_established: false, universal_superiority_established: false };
writeFileSync(join(root, 'results/sequence-comparison.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ recorded_at_utc: receipt.checked_at_utc, cases: results.map(record => ({ id: record.id, cost_reduction: record.candidate_cost_reduction, median_time_ratio: record.candidate_median_time_ratio })) }, null, 2));
