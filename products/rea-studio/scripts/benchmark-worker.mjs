import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const input = JSON.parse(process.argv[2]);
const { algorithm, before, after } = input;
let compute;
let implementationIdentity;
if (algorithm === 'candidate') {
  implementationIdentity = { path: 'products/rea-studio/apps/editor/server.mjs', sha256: createHash('sha256').update(readFileSync(join(root, 'apps/editor/server.mjs'))).digest('hex') };
  const { minimalLineDiff } = await import('../apps/editor/server.mjs');
  compute = () => {
    const result = minimalLineDiff(before.join('\n'), after.join('\n'));
    assert.deepEqual(result.operations.filter(op => op.type !== 'delete').map(op => op.text), after);
    return result.cost;
  };
} else {
  assert.equal(algorithm, 'original');
  const study = join(root, '../../projects/01-vscode-monaco');
  const scope = JSON.parse(readFileSync(join(study, 'scope.json'), 'utf8'));
  const target = 'esm/vs/editor/common/diff/defaultLinesDiffComputer/algorithms/myersDiffAlgorithm.js';
  const artifact = join(study, 'artifacts/package', target);
  const record = scope.included.find(entry => entry.path === target);
  assert.ok(record, 'Original module identity missing');
  assert.equal(createHash('sha256').update(readFileSync(artifact)).digest('hex'), record.sha256);
  implementationIdentity = { path: `monaco-editor@0.57.0/${target}`, sha256: record.sha256 };
  const { MyersDiffAlgorithm } = await import(pathToFileURL(artifact).href);
  const engine = new MyersDiffAlgorithm();
  const sequence = values => ({ length: values.length, getElement: index => values[index] });
  compute = () => {
    const result = engine.compute(sequence(before), sequence(after));
    let cost = 0, cursor = 0;
    const replay = [];
    for (const diff of result.diffs) {
      const a = diff.seq1Range, b = diff.seq2Range;
      replay.push(...before.slice(cursor, a.start), ...after.slice(b.start, b.endExclusive));
      cursor = a.endExclusive;
      cost += a.endExclusive - a.start + b.endExclusive - b.start;
    }
    replay.push(...before.slice(cursor));
    assert.deepEqual(replay, after);
    assert.equal(result.hitTimeout, false);
    return cost;
  };
}
for (let i = 0; i < 20; i++) compute();
global.gc?.();
const milliseconds = [];
let cost;
for (let i = 0; i < 100; i++) {
  const start = performance.now();
  cost = compute();
  milliseconds.push(performance.now() - start);
}
milliseconds.sort((a, b) => a - b);
console.log(JSON.stringify({ algorithm, cost, replay_validated: true, samples: milliseconds.length,
  implementation_identity: implementationIdentity,
  median_ms: milliseconds[Math.floor(milliseconds.length / 2)], p95_ms: milliseconds[Math.floor(milliseconds.length * .95)],
  process_peak_rss_kib: process.resourceUsage().maxRSS, runtime: process.version }));
