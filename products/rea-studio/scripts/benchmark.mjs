import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { cpus, platform, arch } from 'node:os';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const original = name => name.split('');
let state = 0x1210abcd;
const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state; };
const cases = [
  { id: 'recorded-nonminimal-witness', before: original('ABACDEACACFC'), after: original('EFC') },
  { id: 'identical-512-lines', before: Array.from({ length: 512 }, (_, i) => `line ${i}`), after: Array.from({ length: 512 }, (_, i) => `line ${i}`) },
  { id: 'single-change-512-lines', before: Array.from({ length: 512 }, (_, i) => `line ${i}`), after: Array.from({ length: 512 }, (_, i) => i === 256 ? 'updated line' : `line ${i}`) },
  { id: 'seeded-mixed-128-lines', before: Array.from({ length: 128 }, () => String.fromCharCode(65 + (random() >>> 16) % 8)), after: Array.from({ length: 128 }, () => String.fromCharCode(65 + (random() >>> 16) % 8)) }
];
const records = [];
for (const [index, input] of cases.entries()) {
  const results = {};
  const order = index % 2 ? ['candidate', 'original'] : ['original', 'candidate'];
  for (const algorithm of order) {
    const worker = spawnSync(process.execPath, ['--expose-gc', join(root, 'scripts/benchmark-worker.mjs'), JSON.stringify({ ...input, algorithm })], { encoding: 'utf8', timeout: 120000 });
    assert.equal(worker.status, 0, `${algorithm} benchmark failed. Obtain the recorded Monaco artifact as described in projects/01-vscode-monaco/REPORT.md. ${worker.stderr}`);
    results[algorithm] = JSON.parse(worker.stdout.trim());
  }
  records.push({ id: input.id, input_sha256: createHash('sha256').update(JSON.stringify({ before: input.before, after: input.after })).digest('hex'), before_lines: input.before.length, after_lines: input.after.length, order, ...results,
    candidate_cost_reduction: results.original.cost - results.candidate.cost,
    candidate_median_time_ratio: results.candidate.median_ms / results.original.median_ms });
}
const receipt = {
  schema: 'rea-development-comparison/v1', checked_at_utc: new Date().toISOString(),
  scope: 'Internal Monaco 0.57.0 sequence algorithm versus Lab Editor minimal line diff; this is not a VS Code product benchmark.',
  host: { platform: platform(), architecture: arch(), cpu: cpus()[0]?.model, runtime: process.version },
  methodology: 'Separate fresh worker per algorithm/case; 20 warmups, 100 timed calls including output replay assertions; alternating execution order. Candidate calls include string assembly/tokenization and full line-operation output, while the original accepts token arrays and returns changed spans; these API costs differ. Whole-worker peak RSS includes Node.js, imports and input allocations. Single-machine exploratory timing, no confidence interval or independent replication.',
  cases: records,
  original_artifact_acquisition: 'cd projects/01-vscode-monaco && npm run obtain',
  conclusion: 'A smaller edit script on a known witness is a scoped quality improvement. Other measured costs and all full-product feature, usability, compatibility and reliability claims remain separate.',
  full_product_feature_parity_established: false, universal_superiority_established: false
};
mkdirSync(join(root, 'results'), { recursive: true });
writeFileSync(join(root, 'results/editor-comparison.json'), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2));
