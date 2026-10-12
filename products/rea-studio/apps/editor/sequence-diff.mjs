/** Original exact insert/delete alignment. Common boundaries and disjoint regions are linear;
 * low-distance regions use shortest-path diagonals, with bounded trace storage;
 * large-distance regions use Hirschberg reconstruction with linear row storage. */
function exactSequenceDiff(a, b) {
  const aLength = a.length, bLength = b.length;
  let prefix = 0, suffix = 0, comparisons = 0;
  while (prefix < aLength && prefix < bLength) { comparisons++; if (a.getElement(prefix) !== b.getElement(prefix)) break; prefix++; }
  while (suffix < aLength - prefix && suffix < bLength - prefix) { comparisons++; if (a.getElement(aLength - suffix - 1) !== b.getElement(bLength - suffix - 1)) break; suffix++; }
  const endA = aLength - suffix, endB = bLength - suffix, n = endA - prefix, m = endB - prefix;
  const span = (startA, stopA, startB, stopB) => ({ seq1Range: { start: startA, endExclusive: stopA }, seq2Range: { start: startB, endExclusive: stopB } });
  if (n === 0 && m === 0) return { diffs: [], cost: 0, hitTimeout: false, algorithm: 'common-boundaries', comparisons };
  if (n === 0 || m === 0) return { diffs: [span(prefix, endA, prefix, endB)], cost: n + m, hitTimeout: false, algorithm: 'one-empty-region', comparisons };
  // Boundary trimming already compared this sole pair and found it unequal.
  if (n === 1 && m === 1) return { diffs: [span(prefix, endA, prefix, endB)], cost: 2, hitTimeout: false, algorithm: 'disjoint-region', comparisons };
  if (n * m > 4096) {
    let alignedMatch = false;
    for (let i = 0; i < Math.min(n, m); i += Math.max(1, Math.ceil(Math.min(n, m) / 16))) { comparisons++; if (a.getElement(prefix + i) === b.getElement(prefix + i)) { alignedMatch = true; break; } }
    if (!alignedMatch) {
      const values = new Set(); for (let i = prefix; i < endA; i++) values.add(a.getElement(i));
      let common = false; for (let j = prefix; j < endB; j++) if (values.has(b.getElement(j))) { common = true; break; }
      comparisons += n + m;
      if (!common) return { diffs: [span(prefix, endA, prefix, endB)], cost: n + m, hitTimeout: false, algorithm: 'disjoint-region', comparisons };
    }
  }
  // Keep the existing distance limit implied by the one-million-cell budget.
  // Only one parity of diagonals is reachable at each distance. Each trace
  // layer is itself the frontier, avoiding a copy and any whole-input fill.
  // Coordinates are at most 10,000 + 999, so 16-bit storage is sufficient.
  const maxDistance = Math.min(n + m, 999), trace = [new Uint16Array(1)];
  let distance = null;
  // Common-prefix trimming already established the distance-zero frontier.
  search: for (let d = 1; d <= maxDistance; d++) {
    const previous = trace[d - 1], layer = new Uint16Array(d + 1);
    for (let i = 0, k = -d; i <= d; i++, k += 2) {
      let x = i === 0 || (i !== d && previous[i - 1] < previous[i]) ? previous[i] : previous[i - 1] + 1;
      let y = x - k;
      while (x < n && y < m) { comparisons++; if (a.getElement(prefix + x) !== b.getElement(prefix + y)) break; x++; y++; }
      layer[i] = x;
      if (x >= n && y >= m) { distance = d; break search; }
    }
    trace.push(layer);
  }
  const diffs = [];
  let algorithm;
  if (distance !== null) {
    algorithm = 'myers-shortest-path';
    let x = n, y = m, pendingEndA = endA, pendingEndB = endB;
    // Walk equal runs backwards and emit only the gaps between them. A long
    // unchanged run no longer allocates or visits one pair per matching element.
    const equalRun = (startA, startB, length) => {
      if (!length) return;
      const stopA = startA + length, stopB = startB + length;
      if (stopA !== pendingEndA || stopB !== pendingEndB) diffs.push(span(stopA, pendingEndA, stopB, pendingEndB));
      pendingEndA = startA; pendingEndB = startB;
    };
    for (let d = distance; d > 0; d--) {
      const previous = trace[d - 1], k = x - y;
      const previousK = k === -d || (k !== d && previous[(k + d - 2) >> 1] < previous[(k + d) >> 1]) ? k + 1 : k - 1;
      const previousX = previous[(previousK + d - 1) >> 1], previousY = previousX - previousK;
      const length = Math.min(x - previousX, y - previousY);
      equalRun(prefix + x - length, prefix + y - length, length);
      x = previousX; y = previousY;
    }
    equalRun(prefix, prefix, Math.min(x, y));
    if (pendingEndA !== prefix || pendingEndB !== prefix) diffs.push(span(prefix, pendingEndA, prefix, pendingEndB));
    diffs.reverse();
  } else {
    algorithm = 'hirschberg-linear-space';
    trace.length = 0;
    let old = prefix, next = prefix;
    const match = (i, j) => {
      if (old !== i || next !== j) diffs.push(span(old, i, next, j));
      old = i + 1; next = j + 1;
    };
    function align(a0, a1, b0, b1) {
      if (a0 === a1 || b0 === b1) return;
      if (a1 - a0 === 1) {
        const valueA = a.getElement(a0);
        for (let j = b0; j < b1; j++) { comparisons++; if (valueA === b.getElement(j)) { match(a0, j); return; } }
        return;
      }
      const middle = (a0 + a1) >>> 1, width = b1 - b0;
      let forward = new Uint32Array(width + 1), backward = new Uint32Array(width + 1);
      for (let i = a0; i < middle; i++) {
        let diagonal = 0; const valueA = a.getElement(i);
        for (let j = 1; j <= width; j++) {
          const above = forward[j]; comparisons++;
          forward[j] = valueA === b.getElement(b0 + j - 1) ? diagonal + 1 : Math.max(above, forward[j - 1]);
          diagonal = above;
        }
      }
      for (let i = a1 - 1; i >= middle; i--) {
        let diagonal = 0; const valueA = a.getElement(i);
        for (let j = width - 1; j >= 0; j--) {
          const above = backward[j]; comparisons++;
          backward[j] = valueA === b.getElement(b0 + j) ? diagonal + 1 : Math.max(above, backward[j + 1]);
          diagonal = above;
        }
      }
      let split = 0, best = -1;
      for (let j = 0; j <= width; j++) if (forward[j] + backward[j] > best) { best = forward[j] + backward[j]; split = j; }
      forward = backward = null;
      align(a0, middle, b0, b0 + split); align(middle, a1, b0 + split, b1);
    }
    align(prefix, endA, prefix, endB);
    if (old !== endA || next !== endB) diffs.push(span(old, endA, next, endB));
  }
  const cost = diffs.reduce((value, diff) => value + diff.seq1Range.endExclusive - diff.seq1Range.start + diff.seq2Range.endExclusive - diff.seq2Range.start, 0);
  return { diffs, cost, hitTimeout: false, algorithm, comparisons };
}

export function minimalSequenceDiff(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length > 10000 || b.length > 10000) throw new Error('Diff supports at most 10,000 elements per side.');
  return exactSequenceDiff({ length: a.length, getElement: i => a[i] }, { length: b.length, getElement: i => b[i] });
}

/** Getter-based sequence input and changed-span payload for scoped algorithm comparisons.
 * This does not implement Monaco's result-class helper methods or deadline API. */
export function minimalGetterSequenceDiff(a, b) {
  for (const sequence of [a, b]) if (!sequence || !Number.isInteger(sequence.length) || sequence.length < 0 || sequence.length > 10000 || typeof sequence.getElement !== 'function') throw new Error('Provide bounded getter sequences.');
  return exactSequenceDiff(a, b);
}
