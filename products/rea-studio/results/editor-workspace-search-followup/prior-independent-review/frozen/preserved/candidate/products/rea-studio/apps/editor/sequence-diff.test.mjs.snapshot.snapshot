import test from 'node:test';
import assert from 'node:assert/strict';
import { minimalSequenceDiff, minimalGetterSequenceDiff } from './sequence-diff.mjs';
import { minimalLineDiff } from './server.mjs';

function replay(a, b, result) {
  let cursor = 0, nextCursor = 0, cost = 0; const output = [];
  for (const diff of result.diffs) {
    const old = diff.seq1Range, next = diff.seq2Range;
    assert.ok(old.start >= cursor && old.endExclusive >= old.start && old.endExclusive <= a.length);
    assert.ok(next.start >= nextCursor && next.endExclusive >= next.start && next.endExclusive <= b.length);
    assert.equal(old.start - cursor, next.start - nextCursor);
    assert.deepEqual(a.slice(cursor, old.start), b.slice(nextCursor, next.start));
    output.push(...a.slice(cursor, old.start), ...b.slice(next.start, next.endExclusive));
    cost += old.endExclusive - old.start + next.endExclusive - next.start;
    cursor = old.endExclusive; nextCursor = next.endExclusive;
  }
  output.push(...a.slice(cursor)); assert.deepEqual(output, b); assert.equal(result.cost, cost);
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

test('compact frontier preserves exact cost at distances 998, 999 and the 1,000-distance fallback', () => {
  for (const [length, extra, expectedAlgorithm, expectedCost] of [
    [500, false, 'myers-shortest-path', 998],
    [500, true, 'myers-shortest-path', 999],
    [501, false, 'hirschberg-linear-space', 1000]
  ]) {
    const a = Array.from({ length }, (_, i) => i), b = a.slice().reverse();
    if (extra) b.unshift('extra');
    const result = minimalGetterSequenceDiff({ length: a.length, getElement: i => a[i] }, { length: b.length, getElement: i => b[i] });
    // Unique reversed values have an LCS of exactly one element.
    assert.equal(result.algorithm, expectedAlgorithm); assert.equal(result.cost, expectedCost); replay(a, b, result);
  }
});

test('long unchanged runs produce exact sparse spans through bounded receiver-based getters', () => {
  const a = Array.from({ length: 10000 }, (_, i) => `line ${i}`), b = a.slice();
  const changes = [0, 2000, 4000, 6000, 8000, 9999];
  for (const index of changes) b[index] = `updated ${index}`;
  const getter = values => ({
    length: values.length, values,
    getElement(index) { assert.ok(index >= 0 && index < this.length); return this.values[index]; }
  });
  const result = minimalGetterSequenceDiff(getter(a), getter(b));
  assert.equal(result.algorithm, 'myers-shortest-path'); assert.equal(result.cost, changes.length * 2);
  assert.equal(result.diffs.length, changes.length); replay(a, b, result);
  assert.deepEqual(result.diffs.map(diff => diff.seq1Range), changes.map(start => ({ start, endExclusive: start + 1 })));
  for (const invalid of [null, { length: -1, getElement() {} }, { length: 10001, getElement() {} }, { length: 0 }]) {
    assert.throws(() => minimalGetterSequenceDiff(invalid, getter([])), /bounded getter/);
  }
});

test('linear-space fallback replays scattered duplicate matches at independent minimum cost', () => {
  let seed = 0x1264abcd;
  const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return (seed >>> 16) % 64; };
  const a = Array.from({ length: 800 }, next), b = Array.from({ length: 780 }, next);
  const result = minimalGetterSequenceDiff({ length: a.length, getElement: i => a[i] }, { length: b.length, getElement: i => b[i] });
  assert.equal(result.algorithm, 'hirschberg-linear-space'); assert.equal(result.cost, distance(a, b)); replay(a, b, result);
});

test('a single changed pair requires only the common-boundary getter comparisons', () => {
  const a = Array.from({ length: 512 }, (_, i) => i), b = a.slice(); b[256] = 'changed';
  let beforeReads = 0, afterReads = 0;
  const result = minimalGetterSequenceDiff({ length: a.length, getElement: i => { beforeReads++; return a[i]; } }, { length: b.length, getElement: i => { afterReads++; return b[i]; } });
  assert.equal(beforeReads, 513); assert.equal(afterReads, 513);
  assert.equal(result.cost, 2); assert.equal(result.diffs.length, 1); replay(a, b, result);
});
