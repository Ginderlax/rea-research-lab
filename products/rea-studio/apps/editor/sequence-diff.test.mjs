import test from 'node:test';
import assert from 'node:assert/strict';
import { minimalSequenceDiff, minimalGetterSequenceDiff } from './sequence-diff.mjs';
import { minimalLineDiff } from './server.mjs';

function replay(a, b, result) {
  let cursor = 0; const output = [];
  for (const diff of result.diffs) {
    const old = diff.seq1Range, next = diff.seq2Range;
    assert.ok(old.start >= cursor && old.endExclusive <= a.length);
    output.push(...a.slice(cursor, old.start), ...b.slice(next.start, next.endExclusive));
    cursor = old.endExclusive;
  }
  output.push(...a.slice(cursor)); assert.deepEqual(output, b);
}
function distance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) current.push(a[i - 1] === b[j - 1] ? previous[j - 1] : Math.min(previous[j] + 1, current[j - 1] + 1));
    previous = current;
  }
  return previous[b.length];
}
test('shortest-path spans reconstruct 1,000 deterministic random sequences at independent minimum cost', () => {
  let seed = 0x12a34b56;
  const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed >>> 16; };
  for (let trial = 0; trial < 1000; trial++) {
    const a = Array.from({ length: next() % 25 }, () => next() % 5), b = Array.from({ length: next() % 25 }, () => next() % 5);
    const result = minimalSequenceDiff(a, b); replay(a, b, result); assert.equal(result.cost, distance(a, b));
    const getters = minimalGetterSequenceDiff({ length: a.length, getElement: i => a[i] }, { length: b.length, getElement: i => b[i] }); replay(a, b, getters); assert.equal(getters.cost, result.cost);
  }
});
test('linear-space reconstruction accepts a large-distance region formerly exceeding the table bound', () => {
  const a = Array.from({ length: 2000 }, (_, i) => `before ${i}`), b = Array.from({ length: 2000 }, (_, i) => `after ${i}`);
  a[999] = b[1000] = 'the only shared line';
  const result = minimalSequenceDiff(a, b);
  assert.equal(result.algorithm, 'hirschberg-linear-space');
  assert.equal(result.cost, 3998); replay(a, b, result);
  const lines = minimalLineDiff(a.join('\n'), b.join('\n'));
  assert.equal(lines.cost, 3998);
  assert.deepEqual(lines.operations.filter(op => op.type !== 'delete').map(op => op.text), b);
  assert.deepEqual(lines.operations.filter(op => op.type !== 'insert').map(op => op.text), a);
});
test('10,000 disjoint lines have an exact linear-time replacement and declared line bounds remain enforced', () => {
  const a = Array.from({ length: 10000 }, (_, i) => `before ${i}`), b = Array.from({ length: 10000 }, (_, i) => `after ${i}`);
  const result = minimalSequenceDiff(a, b);
  assert.equal(result.algorithm, 'disjoint-region'); assert.equal(result.cost, 20000); replay(a, b, result);
  assert.throws(() => minimalSequenceDiff([...a, 'overflow'], b), /10,000/);
});
