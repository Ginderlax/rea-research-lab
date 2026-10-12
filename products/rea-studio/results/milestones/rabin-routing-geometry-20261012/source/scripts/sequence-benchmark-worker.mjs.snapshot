import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { algorithm, before, after } = JSON.parse(readFileSync(0, 'utf8'));
const getter = values => ({ length: values.length, getElement: index => values[index] });
const a = getter(before), b = getter(after);
let compute, identity;
if (algorithm === 'candidate') {
  const module = 'apps/editor/sequence-diff.mjs';
  identity = { path: `products/rea-studio/${module}`, sha256: createHash('sha256').update(readFileSync(join(root, module))).digest('hex') };
  const { minimalGetterSequenceDiff } = await import('../apps/editor/sequence-diff.mjs');
  compute = () => minimalGetterSequenceDiff(a, b);
} else {
  assert.equal(algorithm, 'original');
  const study = join(root, '../../projects/01-vscode-monaco');
  const scope = JSON.parse(readFileSync(join(study, 'scope.json'), 'utf8'));
  for (const entry of scope.included) assert.equal(createHash('sha256').update(readFileSync(join(study, 'artifacts/package', entry.path))).digest('hex'), entry.sha256);
  const target = 'esm/vs/editor/common/diff/defaultLinesDiffComputer/algorithms/myersDiffAlgorithm.js';
  const record = scope.included.find(entry => entry.path === target);
  identity = { path: `monaco-editor@0.57.0/${target}`, sha256: record.sha256 };
  const { MyersDiffAlgorithm } = await import(pathToFileURL(join(study, 'artifacts/package', target)).href);
  const engine = new MyersDiffAlgorithm(); compute = () => engine.compute(a, b);
}
function check(result) {
  let cost = 0, cursor = 0; const output = [];
  assert.equal(result.hitTimeout, false);
  for (const diff of result.diffs) {
    const old = diff.seq1Range, next = diff.seq2Range;
    output.push(...before.slice(cursor, old.start), ...after.slice(next.start, next.endExclusive)); cursor = old.endExclusive;
    cost += old.endExclusive - old.start + next.endExclusive - next.start;
  }
  output.push(...before.slice(cursor)); assert.deepEqual(output, after); return cost;
}
for (let i = 0; i < 30; i++) check(compute());
global.gc?.();
const samples = []; let cost;
for (let i = 0; i < 200; i++) {
  const started = performance.now(); const result = compute(); samples.push(performance.now() - started);
  cost = check(result);
}
samples.sort((x, y) => x - y);
console.log(JSON.stringify({ algorithm, implementation_identity: identity, cost, replay_validated: true, samples: samples.length, median_ms: samples[Math.floor(samples.length / 2)], p95_ms: samples[Math.floor(samples.length * .95)], p05_ms: samples[Math.floor(samples.length * .05)], process_peak_rss_kib: process.resourceUsage().maxRSS, runtime: process.version }));
