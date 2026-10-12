/** Original exact insert/delete alignment. Common boundaries and disjoint regions are linear;
 * low-distance regions use shortest-path diagonals, with bounded trace storage;
 * large-distance regions use Hirschberg reconstruction with linear row storage. */
function exactSequenceDiff(aLength, bLength, getA, getB) {
  let prefix = 0, suffix = 0, comparisons = 0;
  while (prefix < aLength && prefix < bLength) { comparisons++; if (getA(prefix) !== getB(prefix)) break; prefix++; }
  while (suffix < aLength - prefix && suffix < bLength - prefix) { comparisons++; if (getA(aLength - suffix - 1) !== getB(bLength - suffix - 1)) break; suffix++; }
  const endA = aLength - suffix, endB = bLength - suffix, n = endA - prefix, m = endB - prefix;
  const span = (startA, stopA, startB, stopB) => ({ seq1Range: { start: startA, endExclusive: stopA }, seq2Range: { start: startB, endExclusive: stopB } });
  if (n === 0 && m === 0) return { diffs: [], cost: 0, hitTimeout: false, algorithm: 'common-boundaries', comparisons };
  if (n === 0 || m === 0) return { diffs: [span(prefix, endA, prefix, endB)], cost: n + m, hitTimeout: false, algorithm: 'one-empty-region', comparisons };
  if (n * m > 4096) {
    let alignedMatch = false;
    for (let i = 0; i < Math.min(n, m); i += Math.max(1, Math.ceil(Math.min(n, m) / 16))) { comparisons++; if (getA(prefix + i) === getB(prefix + i)) { alignedMatch = true; break; } }
    if (!alignedMatch) {
      const values = new Set(); for (let i = prefix; i < endA; i++) values.add(getA(i));
      let common = false; for (let j = prefix; j < endB; j++) if (values.has(getB(j))) { common = true; break; }
      comparisons += n + m;
      if (!common) return { diffs: [span(prefix, endA, prefix, endB)], cost: n + m, hitTimeout: false, algorithm: 'disjoint-region', comparisons };
    }
  }
  const offset = n + m + 1, frontier = new Int32Array(2 * offset + 1);
  frontier.fill(-1); frontier[offset + 1] = 0;
  const trace = [];
  let traceCells = 0, distance = null;
  search: for (let d = 0; d <= n + m; d++) {
    if (traceCells + 2 * d + 1 > 1_000_000) break;
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && frontier[offset + k - 1] < frontier[offset + k + 1]) ? frontier[offset + k + 1] : frontier[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m) { comparisons++; if (getA(prefix + x) !== getB(prefix + y)) break; x++; y++; }
      frontier[offset + k] = x;
      if (x >= n && y >= m) { distance = d; break search; }
    }
    const layer = new Int32Array(2 * d + 1);
    for (let k = -d; k <= d; k += 2) layer[k + d] = frontier[offset + k];
    trace.push(layer); traceCells += layer.length;
  }
  const matches = [];
  let algorithm;
  if (distance !== null) {
    algorithm = 'myers-shortest-path';
    let x = n, y = m;
    for (let d = distance; d > 0; d--) {
      const previous = trace[d - 1], k = x - y;
      const get = diagonal => previous[diagonal + d - 1];
      const previousK = k === -d || (k !== d && get(k - 1) < get(k + 1)) ? k + 1 : k - 1;
      const previousX = get(previousK), previousY = previousX - previousK;
      while (x > previousX && y > previousY) matches.push([prefix + --x, prefix + --y]);
      x = previousX; y = previousY;
    }
    while (x > 0 && y > 0) matches.push([prefix + --x, prefix + --y]);
    matches.reverse();
  } else {
    algorithm = 'hirschberg-linear-space';
    trace.length = 0;
    function align(a0, a1, b0, b1) {
      if (a0 === a1 || b0 === b1) return;
      if (a1 - a0 === 1) {
        for (let j = b0; j < b1; j++) { comparisons++; if (getA(a0) === getB(j)) { matches.push([a0, j]); return; } }
        return;
      }
      const middle = (a0 + a1) >>> 1, width = b1 - b0;
      let forward = new Uint32Array(width + 1), backward = new Uint32Array(width + 1);
      for (let i = a0; i < middle; i++) {
        let diagonal = 0; const valueA = getA(i);
        for (let j = 1; j <= width; j++) {
          const above = forward[j]; comparisons++;
          forward[j] = valueA === getB(b0 + j - 1) ? diagonal + 1 : Math.max(above, forward[j - 1]);
          diagonal = above;
        }
      }
      for (let i = a1 - 1; i >= middle; i--) {
        let diagonal = 0; const valueA = getA(i);
        for (let j = width - 1; j >= 0; j--) {
          const above = backward[j]; comparisons++;
          backward[j] = valueA === getB(b0 + j) ? diagonal + 1 : Math.max(above, backward[j + 1]);
          diagonal = above;
        }
      }
      let split = 0, best = -1;
      for (let j = 0; j <= width; j++) if (forward[j] + backward[j] > best) { best = forward[j] + backward[j]; split = j; }
      forward = backward = null;
      align(a0, middle, b0, b0 + split); align(middle, a1, b0 + split, b1);
    }
    align(prefix, endA, prefix, endB);
  }
  const diffs = [];
  let old = prefix, next = prefix;
  for (const [i, j] of matches) {
    if (old !== i || next !== j) diffs.push(span(old, i, next, j));
    old = i + 1; next = j + 1;
  }
  if (old !== endA || next !== endB) diffs.push(span(old, endA, next, endB));
  const cost = diffs.reduce((value, diff) => value + diff.seq1Range.endExclusive - diff.seq1Range.start + diff.seq2Range.endExclusive - diff.seq2Range.start, 0);
  return { diffs, cost, hitTimeout: false, algorithm, comparisons };
}

export function minimalSequenceDiff(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length > 10000 || b.length > 10000) throw new Error('Diff supports at most 10,000 elements per side.');
  return exactSequenceDiff(a.length, b.length, i => a[i], i => b[i]);
}

/** Getter-based sequence input and changed-span payload for scoped algorithm comparisons.
 * This does not implement Monaco's result-class helper methods or deadline API. */
export function minimalGetterSequenceDiff(a, b) {
  for (const sequence of [a, b]) if (!sequence || !Number.isInteger(sequence.length) || sequence.length < 0 || sequence.length > 10000 || typeof sequence.getElement !== 'function') throw new Error('Provide bounded getter sequences.');
  return exactSequenceDiff(a.length, b.length, i => a.getElement(i), i => b.getElement(i));
}
