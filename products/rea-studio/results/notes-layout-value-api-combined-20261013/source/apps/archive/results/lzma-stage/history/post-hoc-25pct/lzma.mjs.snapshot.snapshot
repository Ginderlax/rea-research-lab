// Isolated research primitive; not connected to the application.
// Source-assisted from Igor Pavlov's public-domain SDK 26.04 LzmaDec.c /
// Lzma2Dec.c and Juan Mellado's MIT LZMA decoder at pinned lzma-purejs commit
// 75ed915fecef42a87abd754efede2271be18c786. See LICENSE.txt and provenance.json.

export const LIMITS = Object.freeze({ input: 96 * 1024 ** 2, output: 64 * 1024 ** 2,
  dictionary: 64 * 1024 ** 2, chunks: 100000, steps: 8_000_000_000, timeMs: 60000 });
const fail = message => { throw new Error(`LZMA: ${message}`); };
const intrinsicLength = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'byteLength').get;
const intrinsicBuffer = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'buffer').get;
const intrinsicOffset = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'byteOffset').get;
function bytes(value, bound, label) {
  if (!(value instanceof Uint8Array)) fail(`${label} must be bytes`);
  let length;
  try { length = intrinsicLength.call(value); } catch { fail(`${label} must be bytes`); }
  if (length > bound) fail(`${label} exceeds bound`);
  // Intrinsic methods avoid overridable length/subarray properties. Zero copy.
  const buffer = intrinsicBuffer.call(value), offset = intrinsicOffset.call(value);
  if (!(buffer instanceof ArrayBuffer)) fail(`${label} must use an unshared buffer`);
  return new Uint8Array(buffer, offset, length);
}
function bounded(value, max, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) fail(`${label} exceeds bound`);
  return value;
}
class Budget {
  constructor(opts) {
    this.limit = opts.maxSteps === undefined ? Infinity : bounded(opts.maxSteps, LIMITS.steps, 'step limit');
    this.steps = 0; this.untilCheck = 4096;
    const ms = opts.maxTimeMs;
    if (ms !== undefined && (!Number.isFinite(ms) || ms < 0 || ms > LIMITS.timeMs)) fail('time limit exceeds bound');
    this.deadline = ms === undefined ? Infinity : performance.now() + ms;
    this.check(true);
  }
  work(units = 1) {
    this.steps += units;
    if (this.steps > this.limit) fail('decode step budget exhausted');
    this.untilCheck -= units;
    if (this.untilCheck <= 0) this.check(true);
  }
  check(force = false) {
    if (force || this.untilCheck <= 0) {
      this.untilCheck = 4096;
      if (performance.now() >= this.deadline) fail('decode elapsed-time budget exhausted');
    }
  }
}
function options(input, expectedSize, properties, opts, propertiesSize) {
  const maxInput = bounded(opts.maxInput ?? LIMITS.input, LIMITS.input, 'input limit');
  const maxOutput = bounded(opts.maxOutput ?? LIMITS.output, LIMITS.output, 'output limit');
  const maxDictionary = bounded(opts.maxDictionary ?? LIMITS.dictionary, LIMITS.dictionary, 'dictionary limit');
  const data = bytes(input, maxInput, 'input'), props = bytes(properties, propertiesSize, 'properties');
  if (props.length !== propertiesSize) fail('invalid properties length');
  bounded(expectedSize, maxOutput, 'declared output');
  return { data, props, maxDictionary, budget: new Budget(opts) };
}
function lcLpPb(prop, lzma2) {
  if (prop >= 225) fail('invalid lc/lp/pb properties');
  const lc = prop % 9, rest = Math.floor(prop / 9), lp = rest % 5, pb = Math.floor(rest / 5);
  if (lzma2 && lc + lp > 4) fail('LZMA2 lc + lp exceeds four');
  return { lc, lp, pb };
}
const probs = n => new Uint16Array(n).fill(1024);
class Range {
  constructor(data, budget) {
    this.budget = budget;
    this.data = data; this.pos = 0; this.range = 0xffffffff; this.code = 0;
    if (this.byte() !== 0) fail('nonzero range initialization');
    for (let i = 0; i < 4; i++) this.code = ((this.code << 8) | this.byte()) >>> 0;
    if (this.code === 0xffffffff) fail('invalid initial range code');
  }
  byte() { if (this.pos === this.data.length) fail('truncated range stream'); return this.data[this.pos++]; }
  normalize() {
    if (this.range < 0x1000000) {
      this.range = (this.range << 8) >>> 0; this.code = ((this.code << 8) | this.byte()) >>> 0;
    }
  }
  bit(model, index) {
    this.budget.work();
    this.normalize();
    const probability = model[index], bound = (this.range >>> 11) * probability;
    if (this.code < bound) {
      this.range = bound; model[index] = probability + ((2048 - probability) >>> 5); return 0;
    }
    this.range = (this.range - bound) >>> 0; this.code = (this.code - bound) >>> 0;
    model[index] = probability - (probability >>> 5); return 1;
  }
  tree(model, offset, count) {
    let symbol = 1;
    for (let i = 0; i < count; i++) symbol = symbol * 2 + this.bit(model, offset + symbol);
    return symbol - 2 ** count;
  }
  reverse(model, offset, count) {
    let symbol = 1, result = 0;
    for (let i = 0; i < count; i++) { const bit = this.bit(model, offset + symbol); symbol = symbol * 2 + bit; result += bit * 2 ** i; }
    return result;
  }
  direct(count) {
    let result = 0;
    for (let i = 0; i < count; i++) {
      this.budget.work();
      this.normalize(); this.range >>>= 1;
      const bit = this.code >= this.range ? 1 : 0;
      if (bit) this.code = (this.code - this.range) >>> 0;
      result = result * 2 + bit;
    }
    return result;
  }
  finished() {
    this.normalize();
    if (this.code !== 0) fail('range stream is not finished');
    if (this.pos !== this.data.length) fail('trailing range bytes');
  }
}
class State {
  constructor(output, dictionary, budget) {
    this.budget = budget;
    this.output = output; this.dictionary = Math.max(4096, dictionary); this.pos = 0; this.resetPos = 0;
    this.isMatch = probs(12 * 16); this.isRep = probs(12); this.repG0 = probs(12); this.repG1 = probs(12); this.repG2 = probs(12);
    this.rep0Long = probs(12 * 16); this.posSlot = probs(4 * 64); this.distance = probs(114); this.align = probs(16);
    this.len = probs(2 + 16 * 16 + 256); this.repLen = probs(2 + 16 * 16 + 256);
    this.models = [this.isMatch, this.isRep, this.repG0, this.repG1, this.repG2, this.rep0Long, this.posSlot, this.distance, this.align, this.len, this.repLen];
    this.reps = [0, 0, 0, 0];
  }
  resetDictionary() { this.resetPos = this.pos; }
  properties(prop, lzma2) {
    const { lc, lp, pb } = lcLpPb(prop, lzma2); this.lc = lc; this.lp = lp; this.pb = pb;
    // All LZMA2 properties fit one 24 KiB literal table. Retain it across
    // property changes instead of allocating a table per compressed chunk.
    if (!this.literal) this.literal = probs(768 * 2 ** (lzma2 ? 4 : lc + lp));
    this.resetState();
  }
  resetState() {
    this.state = 0; this.reps.fill(0);
    for (const model of this.models) model.fill(1024);
    if (this.literal) this.literal.fill(1024);
  }
  previous() { return this.pos === this.resetPos ? 0 : this.output[this.pos - 1]; }
  history(distance) {
    if (distance >= this.pos - this.resetPos || distance >= this.dictionary) fail('invalid dictionary distance');
    return this.output[this.pos - distance - 1];
  }
  length(rc, model, position) {
    if (rc.bit(model, 0) === 0) return rc.tree(model, 2 + position * 8, 3);
    if (rc.bit(model, 1) === 0) return 8 + rc.tree(model, 2 + 16 * 8 + position * 8, 3);
    return 16 + rc.tree(model, 2 + 16 * 16, 8);
  }
  symbol(rc, end, allowEnd) {
    const position = (this.pos - this.resetPos) & ((1 << this.pb) - 1), state = this.state;
    if (rc.bit(this.isMatch, state * 16 + position) === 0) {
      if (this.pos === end) fail('output exceeds declared size');
      const context = (((this.pos - this.resetPos) & ((1 << this.lp) - 1)) << this.lc) + (this.previous() >>> (8 - this.lc));
      const offset = context * 768; let symbol = 1;
      if (state >= 7) {
        let match = this.history(this.reps[0]);
        do {
          const matchBit = (match >>> 7) & 1; match = (match << 1) & 255;
          const bit = rc.bit(this.literal, offset + ((1 + matchBit) << 8) + symbol);
          symbol = symbol * 2 + bit;
          if (bit !== matchBit) break;
        } while (symbol < 256);
      }
      while (symbol < 256) symbol = symbol * 2 + rc.bit(this.literal, offset + symbol);
      this.budget.work(); this.output[this.pos++] = symbol & 255;
      this.state = state < 4 ? 0 : state < 10 ? state - 3 : state - 6;
      return false;
    }
    let length;
    if (rc.bit(this.isRep, state) === 1) {
      if (this.pos === end) fail('output exceeds declared size');
      if (rc.bit(this.repG0, state) === 0) {
        if (rc.bit(this.rep0Long, state * 16 + position) === 0) {
          this.state = state < 7 ? 9 : 11; length = 1;
        }
      } else {
        let distance;
        if (rc.bit(this.repG1, state) === 0) distance = this.reps[1];
        else {
          if (rc.bit(this.repG2, state) === 0) distance = this.reps[2];
          else { distance = this.reps[3]; this.reps[3] = this.reps[2]; }
          this.reps[2] = this.reps[1];
        }
        this.reps[1] = this.reps[0]; this.reps[0] = distance;
      }
      if (length === undefined) { length = 2 + this.length(rc, this.repLen, position); this.state = state < 7 ? 8 : 11; }
    } else {
      this.reps[3] = this.reps[2]; this.reps[2] = this.reps[1]; this.reps[1] = this.reps[0];
      length = 2 + this.length(rc, this.len, position); this.state = state < 7 ? 7 : 10;
      const slot = rc.tree(this.posSlot, Math.min(length - 2, 3) * 64, 6);
      let distance = slot;
      if (slot >= 4) {
        const count = (slot >>> 1) - 1;
        distance = (2 + (slot & 1)) * 2 ** count;
        if (slot < 14) distance += rc.reverse(this.distance, distance - slot - 1, count);
        else distance += rc.direct(count - 4) * 16 + rc.reverse(this.align, 0, 4);
        if (distance === 0xffffffff) {
          if (!allowEnd || this.pos !== end) fail('unexpected end marker');
          return true;
        }
      }
      this.reps[0] = distance;
    }
    if (length > end - this.pos) fail('match exceeds declared output');
    this.history(this.reps[0]);
    this.budget.work(length);
    const from = this.pos - this.reps[0] - 1;
    for (let i = 0; i < length; i++) this.output[this.pos++] = this.output[from + i];
    return false;
  }
  decode(data, length, allowEnd) {
    const rc = new Range(data, this.budget), end = this.pos + length;
    while (this.pos < end) if (this.symbol(rc, end, allowEnd)) fail('early end marker');
    rc.normalize();
    if (rc.code !== 0) {
      if (!allowEnd || !this.symbol(rc, end, true)) fail('range stream is not finished');
    }
    rc.finished();
    this.budget.check(true);
  }
}
export function decodeLzma(input, expectedSize, properties, opts = {}) {
  const { data, props, maxDictionary, budget } = options(input, expectedSize, properties, opts, 5);
  const dictionary = props[1] + props[2] * 256 + props[3] * 65536 + props[4] * 16777216;
  bounded(Math.max(4096, dictionary), maxDictionary, 'dictionary'); lcLpPb(props[0], false);
  const output = Buffer.allocUnsafe(expectedSize), state = new State(output, dictionary, budget);
  state.properties(props[0], false); state.decode(data, expectedSize, true);
  return output;
}
export function decodeLzma2(input, expectedSize, properties, opts = {}) {
  const { data, props, maxDictionary, budget } = options(input, expectedSize, properties, opts, 1);
  if (props[0] > 40) fail('invalid LZMA2 dictionary properties');
  const dictionary = props[0] === 40 ? 0xffffffff : (2 + (props[0] & 1)) * 2 ** ((props[0] >>> 1) + 11);
  bounded(dictionary, maxDictionary, 'dictionary');
  const maxChunks = bounded(opts.maxChunks ?? LIMITS.chunks, LIMITS.chunks, 'chunk limit');
  const output = Buffer.allocUnsafe(expectedSize), state = new State(output, dictionary, budget);
  let pos = 0, needInitLevel = 0xe0, count = 0;
  const byte = () => { if (pos === data.length) fail('truncated LZMA2 chunk'); return data[pos++]; };
  const take = n => { if (n > data.length - pos) fail('truncated LZMA2 payload'); const part = data.subarray(pos, pos + n); pos += n; return part; };
  for (;;) {
    budget.work(); budget.check(true);
    const control = byte();
    if (control === 0) {
      if (state.pos !== expectedSize) fail('LZMA2 output size mismatch');
      if (pos !== data.length) fail('trailing LZMA2 data');
      return output;
    }
    if (++count > maxChunks) fail('chunk count exceeds bound');
    if (control < 0x80) {
      if (control === 1) { needInitLevel = 0xc0; state.resetDictionary(); }
      else if (control !== 2 || needInitLevel === 0xe0) fail('invalid LZMA2 copy/reset control');
      const length = byte() * 256 + byte() + 1;
      if (length > expectedSize - state.pos) fail('LZMA2 output exceeds declared size');
      budget.work(length);
      output.set(take(length), state.pos); state.pos += length;
      budget.check(true);
    } else {
      if (control < needInitLevel) fail('LZMA2 required reset is missing');
      needInitLevel = 0;
      const length = (control & 31) * 65536 + byte() * 256 + byte() + 1;
      const packed = byte() * 256 + byte() + 1;
      if (length > expectedSize - state.pos) fail('LZMA2 output exceeds declared size');
      if (control >= 0xe0) state.resetDictionary();
      if (control >= 0xc0) state.properties(byte(), true);
      else if (control >= 0xa0) state.resetState();
      state.decode(take(packed), length, false);
    }
  }
}
