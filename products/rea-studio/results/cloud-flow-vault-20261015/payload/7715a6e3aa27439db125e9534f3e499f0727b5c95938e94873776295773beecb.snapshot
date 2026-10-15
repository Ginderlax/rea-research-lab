// Source-assisted bounded greedy encoder. See LZMA-LICENSE.txt/provenance.
// Range/format algorithms were studied in Igor Pavlov's public-domain SDK26.04
// LzmaEnc.c/Lzma2Enc.c and pinned MIT lzma-purejs Encoder.js by Gary Linscott,
// Juan Mellado and C. Scott Ananian. No original program is called here.
import { optionalOperationBudget } from './operation-budget.mjs';
export const LIMITS = Object.freeze({ input: 64 * 1024 ** 2, output: 96 * 1024 ** 2,
  dictionary: 8 * 1024 ** 2, searchDepth: 64, chunk: 32768, chunks: 65536,
  steps: 8_000_000_000, timeMs: 60000 });
export const PROFILES = Object.freeze({ fast: Object.freeze({ dictionarySize: 65536, searchDepth: 4 }),
  balanced: Object.freeze({ dictionarySize: 1024 ** 2, searchDepth: 16 }),
  thorough: Object.freeze({ dictionarySize: 8 * 1024 ** 2, searchDepth: 64 }) });
const fail = message => { throw new Error(`LZMA encoder: ${message}`); };
class OutputBoundError extends Error { constructor() { super('LZMA encoder: packed output exceeds bound'); } }
const proto = Object.getPrototypeOf(Uint8Array.prototype);
const getLength = Object.getOwnPropertyDescriptor(proto, 'byteLength').get;
const getBuffer = Object.getOwnPropertyDescriptor(proto, 'buffer').get;
const getOffset = Object.getOwnPropertyDescriptor(proto, 'byteOffset').get;
function integer(value, min, max, label) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(`${label} exceeds bound`);
  return value;
}
class Budget {
  constructor(opts) {
    this.operation = optionalOperationBudget(opts);
    this.limit = opts.maxSteps === undefined ? Infinity : integer(opts.maxSteps, 0, LIMITS.steps, 'step limit');
    const ms = opts.maxTimeMs;
    if (ms !== undefined && (!Number.isFinite(ms) || ms < 0 || ms > LIMITS.timeMs)) fail('time limit exceeds bound');
    this.deadline = ms === undefined ? Infinity : performance.now() + ms;
    this.steps = 0; this.untilCheck = 4096; this.check();
  }
  work(units = 1) {
    this.operation?.work(units);
    this.steps += units; this.untilCheck -= units;
    if (this.steps > this.limit) fail('encode step budget exhausted');
    if (this.untilCheck <= 0) this.check();
  }
  check() { this.operation?.check(); this.untilCheck = 4096; if (performance.now() >= this.deadline) fail('encode elapsed-time budget exhausted'); }
}
function options(input, opts, lzma2) {
  const maxInput = integer(opts.maxInput ?? LIMITS.input, 0, LIMITS.input, 'input limit');
  const maxOutput = integer(opts.maxOutput ?? LIMITS.output, 0, LIMITS.output, 'output limit');
  if (!(input instanceof Uint8Array)) fail('input must be bytes');
  let size, buffer, offset;
  try { size = getLength.call(input); buffer = getBuffer.call(input); offset = getOffset.call(input); } catch { fail('input must be bytes'); }
  if (size > maxInput) fail('input exceeds bound');
  if (!(buffer instanceof ArrayBuffer)) fail('input must use an unshared buffer');
  const data = new Uint8Array(buffer, offset, size), profile = opts.profile ?? 'balanced';
  if (!Object.hasOwn(PROFILES, profile)) fail('unknown profile');
  const dictionarySize = integer(opts.dictionarySize ?? PROFILES[profile].dictionarySize, 4096, LIMITS.dictionary, 'dictionary');
  const searchDepth = integer(opts.searchDepth ?? PROFILES[profile].searchDepth, 1, LIMITS.searchDepth, 'search depth');
  const lc = integer(opts.lc ?? 3, 0, 4, 'lc'), lp = integer(opts.lp ?? 0, 0, 4, 'lp'), pb = integer(opts.pb ?? 2, 0, 4, 'pb');
  if (lc + lp > 4) fail('lc + lp exceeds four');
  if (opts.endMarker !== undefined && typeof opts.endMarker !== 'boolean') fail('endMarker must be boolean');
  if (lzma2 && opts.endMarker) fail('LZMA2 cannot use an LZMA1 end marker');
  return { data, profile, dictionarySize, searchDepth, lc, lp, pb, maxOutput, endMarker: Boolean(opts.endMarker), budget: new Budget(opts) };
}
const probs = n => new Uint16Array(n).fill(1024);
class Range {
  constructor(maxOutput, budget) {
    this.maxOutput = maxOutput; this.budget = budget; this.range = 0xffffffff; this.low = 0;
    this.cache = 0; this.pending = 0; this.count = 0; this.chunks = []; this.part = null; this.offset = 0;
  }
  byte(value) {
    this.budget.work();
    if (this.count === this.maxOutput) throw new OutputBoundError();
    if (!this.part || this.offset === this.part.length) {
      this.part = Buffer.allocUnsafe(Math.min(65536, this.maxOutput - this.count)); this.offset = 0; this.chunks.push(this.part);
    }
    this.part[this.offset++] = value & 255; this.count++;
  }
  shiftLow() {
    const low = this.low >>> 0, carry = Math.floor(this.low / 4294967296);
    this.low = (low << 8) >>> 0;
    if (low < 0xff000000 || carry !== 0) {
      this.byte(this.cache + carry); this.cache = low >>> 24;
      while (this.pending) { this.byte(255 + carry); this.pending--; }
    } else this.pending++;
  }
  normalize() { if (this.range < 0x1000000) { this.range = (this.range << 8) >>> 0; this.shiftLow(); } }
  bit(model, index, bit) {
    this.budget.work(); const probability = model[index], bound = (this.range >>> 11) * probability;
    if (bit === 0) { this.range = bound; model[index] = probability + ((2048 - probability) >>> 5); }
    else { this.low += bound; this.range = (this.range - bound) >>> 0; model[index] = probability - (probability >>> 5); }
    this.normalize();
  }
  tree(model, offset, count, value) {
    let symbol = 1;
    for (let i = count - 1; i >= 0; i--) { const bit = (value >>> i) & 1; this.bit(model, offset + symbol, bit); symbol = symbol * 2 + bit; }
  }
  reverse(model, offset, count, value) {
    let symbol = 1;
    for (let i = 0; i < count; i++) { const bit = (value >>> i) & 1; this.bit(model, offset + symbol, bit); symbol = symbol * 2 + bit; }
  }
  direct(count, value) {
    for (let i = count - 1; i >= 0; i--) { this.budget.work(); this.range >>>= 1; if ((value >>> i) & 1) this.low += this.range; this.normalize(); }
  }
  finish() {
    for (let i = 0; i < 5; i++) this.shiftLow(); this.budget.check();
    if (this.part && this.offset !== this.part.length) this.chunks[this.chunks.length - 1] = this.part.subarray(0, this.offset);
    const output = Buffer.concat(this.chunks, this.count); this.budget.check(); return output;
  }
}
const hash = (data, pos) => Math.imul((data[pos] << 16) | (data[pos + 1] << 8) | data[pos + 2], 0x1e35a7bd) >>> 16;
function core(data, config, arena = {}) {
  const { dictionarySize, searchDepth, lc, lp, pb, maxOutput, endMarker, budget } = config;
  const rc = new Range(maxOutput, budget);
  const model = (key, size) => { if (!arena[key]) arena[key] = probs(size); else arena[key].fill(1024); return arena[key]; };
  const literal = model('literal', 768 * 2 ** (lc + lp)), isMatch = model('isMatch', 12 * 16), isRep = model('isRep', 12),
    length = model('length', 514), posSlot = model('posSlot', 4 * 64), distance = model('distance', 114), align = model('align', 16);
  if (!arena.heads) arena.heads = new Uint32Array(65536);
  const heads = arena.heads; heads.fill(0xffffffff);
  const capacity = Math.min(dictionarySize, data.length);
  if (!arena.chain || arena.chain.length < capacity) arena.chain = new Uint32Array(capacity);
  const chain = arena.chain;
  if (!arena.partial) arena.partial = { comparisons: 0 }; arena.partial.comparisons = 0;
  let state = 0, rep0 = 0, pos = 0, literals = 0, matches = 0, matchedBytes = 0, comparisons = 0;
  const insert = at => {
    budget.work(); if (at + 2 >= data.length) return;
    const key = hash(data, at); chain[at % capacity] = heads[key]; heads[key] = at;
  };
  const encodeLength = (n, position) => {
    if (n < 8) { rc.bit(length, 0, 0); rc.tree(length, 2 + position * 8, 3, n); }
    else { rc.bit(length, 0, 1); if (n < 16) { rc.bit(length, 1, 0); rc.tree(length, 2 + 16 * 8 + position * 8, 3, n - 8); }
      else { rc.bit(length, 1, 1); rc.tree(length, 2 + 16 * 16, 8, n - 16); } }
  };
  const encodeDistance = (n, len) => {
    let slot = n;
    if (n >= 4) { const top = 31 - Math.clz32(n); slot = top * 2 + ((n >>> (top - 1)) & 1); }
    rc.tree(posSlot, Math.min(len - 2, 3) * 64, 6, slot);
    if (slot >= 4) {
      const bits = (slot >>> 1) - 1, base = (2 + (slot & 1)) * 2 ** bits, rest = n - base;
      if (slot < 14) rc.reverse(distance, base - slot - 1, bits, rest);
      else { rc.direct(bits - 4, Math.floor(rest / 16)); rc.reverse(align, 0, 4, rest & 15); }
    }
  };
  budget.check();
  while (pos < data.length) {
    const position = pos & ((1 << pb) - 1), maxLength = Math.min(273, data.length - pos); let best = 2, bestFrom = 0;
    if (maxLength >= 3) {
      let candidate = heads[hash(data, pos)], attempts = 0;
      while (candidate !== 0xffffffff && candidate < pos && pos - candidate <= dictionarySize && attempts++ < searchDepth) {
        budget.work(); comparisons++; arena.partial.comparisons = comparisons;
        if (data[candidate + best] === data[pos + best]) {
          let len = 0;
          while (len < maxLength) { budget.work(); comparisons++; arena.partial.comparisons = comparisons; if (data[candidate + len] !== data[pos + len]) break; len++; }
          if (len > best) { best = len; bestFrom = candidate; if (len === maxLength) break; }
        }
        candidate = chain[candidate % capacity];
      }
    }
    if (best >= 3) {
      rc.bit(isMatch, state * 16 + position, 1); rc.bit(isRep, state, 0); encodeLength(best - 2, position);
      rep0 = pos - bestFrom - 1; encodeDistance(rep0, best); state = state < 7 ? 7 : 10;
      matches++; matchedBytes += best; for (let i = 0; i < best; i++) insert(pos + i); pos += best;
    } else {
      rc.bit(isMatch, state * 16 + position, 0);
      const previous = pos ? data[pos - 1] : 0, context = ((pos & ((1 << lp) - 1)) << lc) + (previous >>> (8 - lc)), offset = context * 768;
      let symbol = 1, same = state >= 7; const matchByte = same ? data[pos - rep0 - 1] : 0;
      for (let i = 7; i >= 0; i--) {
        const bit = (data[pos] >>> i) & 1, matchBit = (matchByte >>> i) & 1;
        rc.bit(literal, offset + symbol + (same ? (1 + matchBit) * 256 : 0), bit);
        if (same && bit !== matchBit) same = false; symbol = symbol * 2 + bit;
      }
      state = state < 4 ? 0 : state < 10 ? state - 3 : state - 6; insert(pos++); literals++;
    }
  }
  if (endMarker) {
    const position = pos & ((1 << pb) - 1); rc.bit(isMatch, state * 16 + position, 1); rc.bit(isRep, state, 0);
    encodeLength(0, position); encodeDistance(0xffffffff, 2);
  }
  const packed = rc.finish();
  return { packed, stats: { literals, matches, matchedBytes, comparisons, inputBytes: data.length, packedBytes: packed.length, hashBytes: heads.byteLength, chainBytes: chain.byteLength, literalProbabilityBytes: literal.byteLength } };
}
export function encodeLzma(input, opts = {}) {
  const config = options(input, opts, false), result = core(config.data, config);
  const properties = Buffer.alloc(5); properties[0] = (config.pb * 5 + config.lp) * 9 + config.lc; properties.writeUInt32LE(config.dictionarySize, 1);
  return { ...result, properties, profile: config.profile };
}
export function encodeLzma2(input, opts = {}) {
  const config = options(input, opts, true), { data, budget } = config;
  if (config.maxOutput === 0) fail('packed output exceeds bound');
  const chunkSize = integer(opts.chunkSize ?? LIMITS.chunk, 1024, LIMITS.chunk, 'chunk size');
  const parts = [], arena = {}; let output = 0, compressedChunks = 0, storedChunks = 0, matches = 0, matchedBytes = 0, comparisons = 0, compressedInputBytes = 0, storedInputBytes = 0, trialOutputAborts = 0;
  const append = part => { if (part.length > config.maxOutput - output) fail('packed output exceeds bound'); parts.push(part); output += part.length; };
  for (let pos = 0, count = 0; pos < data.length; pos += chunkSize) {
    budget.work(); budget.check(); if (++count > LIMITS.chunks) fail('chunk count exceeds bound');
    const chunk = data.subarray(pos, pos + chunkSize); let trial = null;
    if (chunk.length >= 10) {
      try { trial = core(chunk, { ...config, maxOutput: chunk.length - 4, endMarker: false }, arena); }
      catch (error) { if (!(error instanceof OutputBoundError)) throw error; trialOutputAborts++; }
      comparisons += arena.partial.comparisons;
    }
    const size = chunk.length - 1;
    if (trial && trial.packed.length + 6 < chunk.length + 3) {
      const packedSize = trial.packed.length - 1;
      append(Buffer.from([0xe0 | (size >>> 16), (size >>> 8) & 255, size & 255, packedSize >>> 8, packedSize & 255, (config.pb * 5 + config.lp) * 9 + config.lc]));
      append(trial.packed); compressedChunks++;
      matches += trial.stats.matches; matchedBytes += trial.stats.matchedBytes; compressedInputBytes += chunk.length;
    } else { append(Buffer.from([1, size >>> 8, size & 255])); append(chunk); storedChunks++; storedInputBytes += chunk.length; }
    budget.check();
  }
  append(Buffer.from([0])); budget.check(); const packed = Buffer.concat(parts, output); budget.check();
  let property = 0; while ((2 + (property & 1)) * 2 ** ((property >>> 1) + 11) < config.dictionarySize) property++;
  return { packed, properties: Buffer.from([property]), profile: config.profile,
    stats: { compressedChunks, storedChunks, compressedInputBytes, storedInputBytes, matches, matchedBytes, comparisons,
      inputBytes: data.length, packedBytes: packed.length, resetEachChunk: true, chunkSize, dictionarySize: config.dictionarySize,
      hashBytes: arena.heads?.byteLength ?? 0, chainBytes: arena.chain?.byteLength ?? 0, trialOutputAborts, workSteps: budget.steps } };
}
