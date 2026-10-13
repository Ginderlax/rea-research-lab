import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, mkdtempSync, utimesSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { crc32 as independentCRC } from 'node:zlib';
import { decodeLzma, decodeLzma2, LIMITS } from './lzma.mjs';
import { read7z } from './sevenzip.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const baseline = join(root, '../full-archive-baseline-20261012');
const original = join(baseline, 'full-product-x64/7z.exe');
const sha = data => createHash('sha256').update(data).digest('hex');
for (const [name, digest] of [
  ['7z.exe', '95fff19b73eff77c87c0d7bd32822e43fb90dd2932459f962eb532d8dfb6ba53'],
  ['7z.dll', '899cd73d7fc60e1c1c35c7de0f5bed3dc69bfe2cecbd48014d868a347970a0b1']
]) assert.equal(sha(readFileSync(join(dirname(original), name))), digest, `authenticated original ${name}`);
const run = mkdtempSync(join(root, 'run-'));
function cli(args, cwd = run) {
  const result = spawnSync(original, args, { cwd, encoding: 'utf8', windowsHide: true, timeout: 60000 });
  assert.equal(result.status, 0, `${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
const records = [], vectors = new Map();
function record(file, producer, details = {}) {
  const bytes = readFileSync(file);
  records.push({ path: file.slice(run.length + 1).replaceAll('\\', '/'), producer, bytes: bytes.length, sha256: sha(bytes), ...details });
}
// Separate minimal reader for an ordinary one-file, plain-header original
// archive. It never calls the candidate parser or candidate number codec.
function rawFixture(archive) {
  assert.equal(archive.subarray(0, 6).toString('hex'), '377abcaf271c');
  const nextStart = 32 + Number(archive.readBigUInt64LE(12));
  const nextSize = Number(archive.readBigUInt64LE(20));
  assert.equal(nextStart + nextSize, archive.length);
  const header = archive.subarray(nextStart); let pos = 0;
  const byte = () => { assert.ok(pos < header.length); return header[pos++]; };
  const num = () => {
    const first = byte(); let value = 0n, mask = 128;
    for (let i = 0; i < 8; i++, mask >>>= 1) {
      if (!(first & mask)) return Number(value | (BigInt(first & (mask - 1)) << BigInt(i * 8)));
      value |= BigInt(byte()) << BigInt(i * 8);
    }
    return Number(value);
  };
  const id = value => assert.equal(num(), value);
  const optionalDigests = () => {
    let kind = num();
    if (kind === 10) { assert.equal(byte(), 1); pos += 4; kind = num(); }
    assert.equal(kind, 0);
  };
  id(1); id(4); id(6); const packOffset = num(); assert.equal(num(), 1); id(9); const packedSize = num(); optionalDigests();
  id(7); id(11); assert.equal(num(), 1); assert.equal(byte(), 0); assert.equal(num(), 1);
  const flags = byte(); assert.equal(flags & 16, 0); const count = flags & 15;
  const method = header.subarray(pos, pos + count).toString('hex'); pos += count;
  const propertySize = flags & 32 ? num() : 0;
  const properties = Buffer.from(header.subarray(pos, pos + propertySize)); pos += propertySize;
  id(12); const size = num(); optionalDigests();
  assert.ok(32 + packOffset + packedSize <= nextStart);
  return { packed: Buffer.from(archive.subarray(32 + packOffset, 32 + packOffset + packedSize)), properties, size, method };
}
function deterministicRandom(length, seed = 0x1d872b41) {
  const bytes = Buffer.allocUnsafe(length);
  for (let i = 0; i < length; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; bytes[i] = seed & 255; }
  return bytes;
}
function chunkControls(data) {
  const controls = []; let pos = 0;
  for (;;) {
    const offset = pos, control = data[pos++];
    if (control === 0) { assert.equal(pos, data.length); return controls; }
    assert.ok(control === 1 || control === 2 || control >= 128);
    const size = ((control < 128 ? 0 : control & 31) * 65536) + data[pos++] * 256 + data[pos++] + 1;
    const packed = control < 128 ? size : data[pos++] * 256 + data[pos++] + 1;
    const propertyOffset = control >= 192 ? pos++ : null;
    controls.push({ control, offset, size, packed, propertyOffset, payloadOffset: pos }); pos += packed;
    assert.ok(pos < data.length);
  }
}
function produce(name, data, method, parameters = []) {
  const dir = join(run, `source-${name}`); mkdirSync(dir);
  const source = join(dir, 'payload.bin'); writeFileSync(source, data);
  utimesSync(source, 1651820889.123, 1651820889.123);
  const archivePath = join(run, `${name}.7z`), args = ['a', '-t7z', `-m0=${method}`, '-ms=off', '-mhc=off', ...parameters, archivePath, 'payload.bin'];
  cli(args, dir); cli(['t', archivePath]);
  const archive = readFileSync(archivePath), raw = rawFixture(archive);
  assert.equal(raw.size, data.length);
  const controls = raw.method === '21' ? chunkControls(raw.packed) : [];
  const decode = raw.method === '21' ? decodeLzma2 : decodeLzma;
  const started = performance.now(), output = decode(raw.packed, raw.size, raw.properties);
  const elapsed = performance.now() - started;
  assert.equal(sha(output), sha(data), name); assert.deepEqual(output, data);
  const entries = read7z(archive); assert.equal(entries.length, 1); assert.equal(sha(entries[0].data), sha(data));
  writeFileSync(join(run, `${name}.raw`), raw.packed); writeFileSync(join(run, `${name}.properties`), raw.properties);
  record(source, 'deterministic synthetic fixture', { seed: 'fixed xorshift32 when random', uncompressed_sha256: sha(data) });
  record(archivePath, 'authenticated complete original 7-Zip 26.04', { args, method: raw.method, properties: raw.properties.toString('hex'), output_bytes: data.length, output_sha256: sha(output), decode_ms: elapsed, controls });
  record(join(run, `${name}.raw`), 'independent simple-container extraction from original', { method: raw.method });
  record(join(run, `${name}.properties`), 'independent simple-container extraction from original');
  const vector = { ...raw, decode, data, archive }; vectors.set(name, vector); return vector;
}
const repeated = Buffer.from('Real original LZMA compressed vector 雪 😀\n'.repeat(6500));
for (const method of ['LZMA', 'LZMA2']) for (const shape of ['single', 'repeated', 'random', 'distance']) {
  test(`original ${method} raw and .7z roundtrip: ${shape}`, () => {
    const data = shape === 'single' ? Buffer.from([17]) : shape === 'repeated' ? repeated : shape === 'random' ? deterministicRandom(210001)
      : Buffer.concat([deterministicRandom(180000), deterministicRandom(180000)]);
    const v = produce(`${method}-${shape}`, data, method, ['-mx=5', '-md=1m']);
    if (shape === 'repeated') assert.ok(v.packed.length < data.length / 20, 'real compression');
  });
}
for (const prop of ['lc=0:lp=0:pb=0', 'lc=4:lp=0:pb=4', 'lc=0:lp=4:pb=1', 'lc=2:lp=2:pb=2']) {
  for (const method of ['LZMA', 'LZMA2']) test(`original ${method} nondefault ${prop}`, () => {
    produce(`${method}-${prop.replaceAll(':', '-').replaceAll('=', '')}`, repeated, `${method}:${prop}:d=4k`, ['-mx=5']);
  });
}
test('original raw LZMA with explicit end marker finishes exactly', () => {
  const v = produce('LZMA-end-marker', repeated, 'LZMA:eos=on:d=1m', ['-mx=5']);
  const noMark = vectors.get('LZMA-repeated'); assert.notEqual(sha(v.packed), sha(noMark.packed));
  for (let n = 0; n < v.packed.length; n++) assert.throws(() => decodeLzma(v.packed.subarray(0, n), v.size, v.properties));
  assert.throws(() => decodeLzma(v.packed, v.size - 1, v.properties));
  assert.throws(() => decodeLzma(v.packed, v.size + 1, v.properties));
});
test('original LZMA2 long continuing compressed chunks preserve probability state and dictionary', () => {
  const pattern = deterministicRandom(3000);
  const data = Buffer.alloc(6 * 1024 ** 2 + 31); for (let i = 0; i < data.length; i++) data[i] = pattern[i % pattern.length];
  const v = produce('LZMA2-multichunk', data, 'LZMA2:d=4k', ['-mx=7', '-mmt=1']);
  const controls = chunkControls(v.packed);
  assert.ok(controls.length >= 4); assert.ok(controls.some(c => c.control >= 128 && c.control < 160), 'state continuation exercised');
  assert.ok(v.packed.length < data.length / 100);
});
test('original LZMA2 mixed copy/compressed chunks preserve and initialize state correctly', () => {
  const data = Buffer.concat([deterministicRandom(1200000), repeated, deterministicRandom(1200000, 123), repeated]);
  const v = produce('LZMA2-mixed', data, 'LZMA2:d=1m', ['-mx=5', '-mmt=1']);
  const controls = chunkControls(v.packed);
  assert.ok(controls.some(c => c.control < 128), 'uncompressed chunks exercised');
  assert.ok(controls.some(c => c.control >= 128), 'compressed chunks exercised');
});
for (const solid of ['off', 'on']) for (const method of ['defaults', 'LZMA', 'LZMA2']) {
  test(`ordinary original ${method} .7z with encoded header, solid=${solid}`, () => {
    const dir = join(run, `source-encoded-${method}-${solid}`); mkdirSync(dir); mkdirSync(join(dir, 'docs'));
    const entries = [['docs/雪-😀.txt', repeated], ['second.txt', Buffer.from('Second compressed header and file\n'.repeat(1500))], ['empty.txt', Buffer.alloc(0)]];
    for (const [name, data] of entries) { writeFileSync(join(dir, name), data); utimesSync(join(dir, name), 1651820889.123, 1651820889.123); }
    const path = join(run, `encoded-${method}-${solid}.7z`), args = ['a', '-t7z', `-ms=${solid}`, ...(method === 'defaults' ? [] : [`-m0=${method}:d=1m`]), path, '.'];
    cli(args, dir); cli(['t', path]);
    const archive = readFileSync(path), parsed = read7z(archive);
    assert.equal(archive[32 + Number(archive.readBigUInt64LE(12))], 23, 'genuinely encoded next header');
    for (const [name, data] of entries) {
      const entry = parsed.find(e => e.name === name); assert.ok(entry, name); assert.equal(sha(entry.data), sha(data));
      assert.ok(Math.abs(entry.mtimeMs - 1651820889123) <= 1);
    }
    assert.equal(parsed.length, 4);
    record(path, 'authenticated complete original 7-Zip 26.04', { args, expected_entries: entries.map(([name, data]) => ({ name, bytes: data.length, sha256: sha(data) })) });
  });
}
test('raw input, dictionary, expansion, option and property limits reject before allocation', () => {
  const v = vectors.get('LZMA-repeated'), two = vectors.get('LZMA2-repeated');
  for (const value of [[], 'bytes', new Proxy([], { get() { throw Error('untrusted getter touched'); } })]) assert.throws(() => decodeLzma(value, v.size, v.properties), /must be bytes/);
  assert.throws(() => decodeLzma(v.packed, LIMITS.output + 1, v.properties), /declared output/);
  assert.throws(() => decodeLzma(v.packed, v.size, v.properties, { maxOutput: v.size - 1 }), /declared output/);
  assert.throws(() => decodeLzma(v.packed, v.size, v.properties, { maxInput: v.packed.length - 1 }), /input exceeds/);
  assert.throws(() => decodeLzma(v.packed, v.size, v.properties, { maxDictionary: 4096 }), /dictionary/);
  assert.throws(() => decodeLzma2(two.packed, two.size, two.properties, { maxDictionary: 4096 }), /dictionary/);
  for (const dict of [29, 39, 40, 41, 255]) assert.throws(() => decodeLzma2(Buffer.from([0]), 0, Buffer.from([dict])), /dictionary/);
  for (const prop of [225, 255]) assert.throws(() => decodeLzma(v.packed, v.size, Buffer.from([prop, 0, 16, 0, 0])), /properties/);
  const enormous = Buffer.from([93, 0xff, 0xff, 0xff, 0xff]); assert.throws(() => decodeLzma(v.packed, v.size, enormous), /dictionary/);
  for (const size of [-1, Infinity, NaN, 2.5]) assert.throws(() => decodeLzma2(two.packed, size, two.properties), /declared output/);
  assert.throws(() => decodeLzma2(two.packed, two.size, two.properties, { maxChunks: LIMITS.chunks + 1 }), /chunk limit/);
  class LyingBytes extends Uint8Array { get byteLength() { return 1; } get buffer() { throw Error('fake buffer touched'); } get byteOffset() { throw Error('fake offset touched'); } }
  assert.deepEqual(decodeLzma(new LyingBytes(v.packed), v.size, new LyingBytes(v.properties)), v.data);
  assert.throws(() => decodeLzma(new LyingBytes(LIMITS.input + 1), 0, v.properties), /input exceeds/);
  assert.throws(() => decodeLzma(new Uint8Array(new SharedArrayBuffer(8)), 0, v.properties), /unshared/);
});
test('all cuts of small original raw LZMA/LZMA2 vectors reject truncation', () => {
  for (const name of ['LZMA-single', 'LZMA-repeated', 'LZMA2-single', 'LZMA2-repeated']) {
    const v = vectors.get(name);
    for (let n = 0; n < v.packed.length; n++) assert.throws(() => v.decode(v.packed.subarray(0, n), v.size, v.properties), undefined, `${name} cut=${n}`);
  }
});
test('optional work and elapsed budgets reject deterministically without partial success', () => {
  for (const name of ['LZMA-repeated', 'LZMA2-repeated', 'LZMA2-multichunk', 'LZMA2-mixed']) {
    const v = vectors.get(name);
    assert.throws(() => v.decode(v.packed, v.size, v.properties, { maxSteps: 0 }), /step budget/);
    assert.throws(() => v.decode(v.packed, v.size, v.properties, { maxSteps: v.size - 1 }), /step budget/);
    assert.throws(() => v.decode(v.packed, v.size, v.properties, { maxTimeMs: 0 }), /elapsed-time budget/);
    assert.equal(sha(v.decode(v.packed, v.size, v.properties, { maxSteps: LIMITS.steps, maxTimeMs: 60000 })), sha(v.data));
  }
  const v = vectors.get('LZMA-repeated');
  for (const maxSteps of [-1, NaN, Infinity, 1.5, LIMITS.steps + 1]) assert.throws(() => decodeLzma(v.packed, v.size, v.properties, { maxSteps }), /step limit/);
  for (const maxTimeMs of [-1, NaN, Infinity, LIMITS.timeMs + 1]) assert.throws(() => decodeLzma(v.packed, v.size, v.properties, { maxTimeMs }), /time limit/);
});
test('maximum permitted dictionary and LZMA1 literal contexts have finite allocations', () => {
  assert.deepEqual(decodeLzma2(Buffer.from([0]), 0, Buffer.from([28])), Buffer.alloc(0));
  // SDK permits LZMA1 lc=8,lp=4,pb=4 (a 6 MiB literal probability table).
  assert.deepEqual(decodeLzma(Buffer.alloc(5), 0, Buffer.from([224, 0, 16, 0, 0])), Buffer.alloc(0));
});
test('back references cannot escape the advertised dictionary or reset history', () => {
  const one = vectors.get('LZMA-distance'), two = vectors.get('LZMA2-distance');
  const smallDictionary = Buffer.from(one.properties); smallDictionary.writeUInt32LE(4096, 1);
  assert.throws(() => decodeLzma(one.packed, one.size, smallDictionary), /dictionary distance/);
  assert.throws(() => decodeLzma2(two.packed, two.size, Buffer.from([0])), /dictionary distance/);
  const continuing = vectors.get('LZMA2-multichunk'), controls = chunkControls(continuing.packed);
  // A continuation chunk was encoded against earlier bytes and state. Treating
  // it as a new dictionary/state cannot be silently accepted as equivalent.
  const second = controls[1]; assert.ok(second.control >= 128 && second.control < 160);
  const bad = Buffer.from(continuing.packed); bad[second.offset] |= 0x60;
  assert.throws(() => decodeLzma2(bad, continuing.size, continuing.properties));
});
test('exact consumption, declared output and range stream initialization are required', () => {
  for (const name of ['LZMA-single', 'LZMA-repeated', 'LZMA2-single', 'LZMA2-repeated']) {
    const v = vectors.get(name);
    for (const tail of [Buffer.from([0]), v.packed]) assert.throws(() => v.decode(Buffer.concat([v.packed, tail]), v.size, v.properties), /trailing/);
    assert.throws(() => v.decode(v.packed, v.size - 1, v.properties), /output|match|range/);
    assert.throws(() => v.decode(v.packed, v.size + 1, v.properties), /output|truncated|dictionary|range|marker/);
    const bad = Buffer.from(v.packed), rangePos = name.startsWith('LZMA2') ? chunkControls(bad).find(c => c.control >= 128)?.payloadOffset : 0;
    if (rangePos !== undefined) { bad[rangePos] = 1; assert.throws(() => v.decode(bad, v.size, v.properties), /initialization/); }
  }
});
test('LZMA2 missing/reset controls, invalid properties, end marker and packed lengths reject', () => {
  const v = vectors.get('LZMA2-repeated'), first = chunkControls(v.packed)[0];
  assert.ok(first.control >= 224); assert.notEqual(first.propertyOffset, null);
  for (const control of [2, 3, 127, 128, 160, 192]) {
    const bad = Buffer.from(v.packed); bad[0] = control; assert.throws(() => decodeLzma2(bad, v.size, v.properties));
  }
  for (const prop of [4 + 9 * 1, 224, 225, 255]) {
    const bad = Buffer.from(v.packed); bad[first.propertyOffset] = prop; assert.throws(() => decodeLzma2(bad, v.size, v.properties), /lc \+ lp|properties/);
  }
  const shortPacked = Buffer.from(v.packed); shortPacked[3] = 0; shortPacked[4] = 3;
  assert.throws(() => decodeLzma2(shortPacked, v.size, v.properties), /truncated range/);
  assert.throws(() => decodeLzma2(Buffer.from([0]), 1, v.properties), /output size/);
  assert.throws(() => decodeLzma2(Buffer.from([2, 0, 0, 1, 0]), 1, v.properties), /reset control/);
  assert.throws(() => decodeLzma2(Buffer.from([1, 0, 0, 1]), 1, v.properties), /truncated/);
  assert.throws(() => decodeLzma2(Buffer.from([1, 0, 1, 1, 2, 0]), 1, v.properties), /output/);
  assert.deepEqual(decodeLzma2(Buffer.from([0]), 0, Buffer.from([0])), Buffer.alloc(0));
  assert.throws(() => decodeLzma2(v.packed, v.size, v.properties, { maxChunks: 0 }), /chunk count/);
});
test('compressed chunk and header mutation are caught by original container CRCs', () => {
  for (const name of ['LZMA-repeated', 'LZMA2-repeated', 'LZMA2-mixed']) {
    const v = vectors.get(name);
    for (const relative of [0, Math.floor(v.packed.length / 2), v.packed.length - 1]) {
      const bad = Buffer.from(v.archive); bad[32 + relative] ^= 0x40; assert.throws(() => read7z(bad), undefined, `${name}/${relative}`);
    }
  }
  const path = join(run, 'encoded-defaults-on.7z'), archive = readFileSync(path);
  const corrupt = Buffer.from(archive); corrupt[corrupt.length - 1] ^= 1; assert.throws(() => read7z(corrupt), /CRC/);
  for (const n of [0, 7, 31, 32, archive.length - 1]) assert.throws(() => read7z(archive.subarray(0, n)));
});
test('LZMA2 synthetic copy reset and compressed state/property transitions', () => {
  const v = vectors.get('LZMA2-repeated'), header = chunkControls(v.packed)[0];
  const length = 5 + (header.propertyOffset !== null ? 1 : 0) + header.packed;
  assert.equal(v.packed.length, length + 1);
  const compressed = v.packed.subarray(0, length);
  // After one copied byte, 0xE* resets the dictionary and properties again.
  const combined = Buffer.concat([Buffer.from([1, 0, 0, 33]), compressed, Buffer.from([0])]);
  assert.deepEqual(decodeLzma2(combined, v.size + 1, v.properties), Buffer.concat([Buffer.from([33]), v.data]));
  // A compressed dictionary reset is mandatory if this is the initial block.
  const bad = Buffer.from(compressed); bad[0] = (bad[0] & 31) | 0xc0;
  assert.throws(() => decodeLzma2(Buffer.concat([bad, Buffer.from([0])]), v.size, v.properties), /reset/);
  // After copied reset, properties + state reset is permitted with retained history.
  const c0 = Buffer.from(compressed); c0[0] = (c0[0] & 31) | 0xc0;
  // This source has lp=0,pb=2: advance the copy history by a full position cycle.
  const prefix = Buffer.from([1, 0, 3, 0, 0, 0, 0]);
  assert.deepEqual(decodeLzma2(Buffer.concat([prefix, c0, Buffer.from([0])]), v.size + 4, v.properties), Buffer.concat([Buffer.alloc(4), v.data]));
  // Properties persist when 0xA* resets only coding state. The original source
  // length is a multiple of four and its final LF has lc=3 context zero.
  const a0 = Buffer.concat([Buffer.from(compressed.subarray(0, 5)), compressed.subarray(6)]); a0[0] = (a0[0] & 31) | 0xa0;
  assert.deepEqual(decodeLzma2(Buffer.concat([compressed, a0, Buffer.from([0])]), v.size * 2, v.properties), Buffer.concat([v.data, v.data]));
  const copy = Buffer.from([2, 0, 3, 0, 0, 0, 0]);
  assert.deepEqual(decodeLzma2(Buffer.concat([compressed, copy, a0, Buffer.from([0])]), v.size * 2 + 4, v.properties), Buffer.concat([v.data, Buffer.alloc(4), v.data]));
  assert.deepEqual(decodeLzma2(Buffer.concat([compressed, compressed, Buffer.from([0])]), v.size * 2, v.properties), Buffer.concat([v.data, v.data]));
  assert.throws(() => decodeLzma2(Buffer.concat([prefix, a0, Buffer.from([0])]), v.size + 4, v.properties), /reset/);
});
test('receipt retains exact independent vectors and output digests', () => {
  const implementation_sha256 = Object.fromEntries(['lzma.mjs', 'sevenzip.mjs', 'lzma.test.mjs'].map(name => [name, sha(readFileSync(join(root, name)))]));
  writeFileSync(join(run, 'fixtures-manifest.json'), JSON.stringify({ schema: 1, original_version: '26.04 complete x64', implementation_sha256, records }, null, 2));
  console.log(`Retained LZMA research vectors: ${run}`);
});
