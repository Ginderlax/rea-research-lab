import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync, mkdtempSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeLzma, encodeLzma2, LIMITS, PROFILES } from './encode-lzma.mjs';
import { decodeLzma, decodeLzma2 } from './lzma.mjs';
import { write7z, read7z } from './sevenzip.mjs';
const root = dirname(fileURLToPath(import.meta.url)), baseline = join(root, '../full-archive-baseline-20261012');
const original = join(baseline, 'full-product-x64/7z.exe'), sha = data => createHash('sha256').update(data).digest('hex');
assert.equal(sha(readFileSync(original)), '95fff19b73eff77c87c0d7bd32822e43fb90dd2932459f962eb532d8dfb6ba53');
assert.equal(sha(readFileSync(join(dirname(original), '7z.dll'))), '899cd73d7fc60e1c1c35c7de0f5bed3dc69bfe2cecbd48014d868a347970a0b1');
assert.equal(sha(readFileSync(join(root, '../sevenzip-lzma-next/draft-validation.json'))), 'ae9bc19b923b1ba8fab104a622e6298c6b1f20deeb1c75659426a3d333bccf44');
const run = mkdtempSync(join(root, 'run-')), records = [], rows = [];
function cli(args, binary = false) {
  const result = spawnSync(original, args, { cwd: run, encoding: binary ? null : 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 70 * 1024 ** 2 });
  assert.equal(result.status, 0, `${args.join(' ')}\n${result.stderr}`); return result.stdout;
}
function retain(path, producer, details = {}) { const bytes = readFileSync(path); records.push({ path: path.slice(run.length + 1).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes), producer, ...details }); }
function random(size, seed = 0x117bbb72) {
  const data = Buffer.allocUnsafe(size); for (let i = 0; i < size; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; data[i] = seed & 255; } return data;
}
const fixedTime = 1651820889123;
const files = [
  { name: 'docs', directory: true, data: Buffer.alloc(0), mtimeMs: fixedTime },
  { name: 'docs/雪-😀.txt', data: Buffer.from('Genuine native LZMA compression 🌍\n'.repeat(4000)), mtimeMs: fixedTime },
  { name: 'pattern.bin', data: Buffer.from(Array.from({ length: 95001 }, (_, i) => ((i * 13) ^ (i >>> 7)) & 255)), mtimeMs: fixedTime },
  { name: 'empty.txt', data: Buffer.alloc(0), mtimeMs: fixedTime },
  { name: 'empty-dir', directory: true, data: Buffer.alloc(0), mtimeMs: fixedTime }
];
function disk(dir, prefix = '') {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name), info = statSync(path), relative = prefix + name;
    const entry = { name: relative, directory: info.isDirectory(), data: info.isDirectory() ? Buffer.alloc(0) : readFileSync(path), mtimeMs: Math.trunc(info.mtimeMs) };
    return info.isDirectory() ? [entry, ...disk(path, `${relative}/`)] : [entry];
  });
}
function compare(actual, expected) {
  const a = actual.toSorted((x, y) => x.name.localeCompare(y.name)), e = expected.toSorted((x, y) => x.name.localeCompare(y.name));
  assert.deepEqual(a.map(f => [f.name, Boolean(f.directory)]), e.map(f => [f.name, Boolean(f.directory)]));
  for (let i = 0; i < a.length; i++) { assert.equal(sha(a[i].data), sha(e[i].data), a[i].name); if (e[i].mtimeMs !== undefined) assert.ok(Math.abs(a[i].mtimeMs - e[i].mtimeMs) <= 1); }
}
function exchange(name, entries, opts) {
  const start = performance.now(), archive = write7z(entries, opts), encodeMs = performance.now() - start;
  compare(read7z(archive), entries); const path = join(run, `${name}.7z`); writeFileSync(path, archive);
  cli(['t', path]); const out = join(run, `out-${name}`); cli(['x', '-y', `-o${out}`, path]); compare(disk(out), entries);
  const record = { ...opts, inputBytes: entries.reduce((n, e) => n + e.data.length, 0), outputBytes: archive.length, encodeMs };
  rows.push({ name, ...record }); retain(path, 'candidate genuine LZMA/LZMA2 writer', { options: opts, original_result: 'test + extract exact path/type/SHA256/definedmtime', expected: entries.map(e => ({ name: e.name, directory: Boolean(e.directory), bytes: e.data.length, sha256: sha(e.data) })) });
  return { archive, record };
}
for (const method of ['lzma', 'lzma2']) for (const profile of Object.keys(PROFILES)) for (const solid of [false, true]) for (const encodedHeader of [false, true]) {
  test(`original accepts candidate ${method}/${profile}, solid=${solid}, encoded=${encodedHeader}`, () => {
    const result = exchange(`${method}-${profile}-${solid}-${encodedHeader}`, files, { method, profile, solid, encodedHeader });
    assert.ok(result.archive.length < result.record.inputBytes / 5, 'genuine compression');
    if (encodedHeader) assert.equal(result.archive[32 + Number(result.archive.readBigUInt64LE(12))], 23);
  });
}
for (const method of ['lzma', 'lzma2']) for (const profile of Object.keys(PROFILES)) {
  test(`original accepts incompressible ${method}/${profile} without relabeling chunks`, () => {
    const data = random(1024 ** 2 + 3), encode = method === 'lzma' ? encodeLzma : encodeLzma2, decode = method === 'lzma' ? decodeLzma : decodeLzma2;
    const primitive = encode(data, { profile }); assert.equal(sha(decode(primitive.packed, data.length, primitive.properties)), sha(data));
    assert.ok(primitive.packed.length < data.length * 1.2);
    if (method === 'lzma2') { assert.equal(primitive.stats.compressedChunks, 0); assert.ok(primitive.stats.storedChunks > 0); assert.equal(primitive.stats.storedInputBytes, data.length); assert.equal(primitive.stats.matchedBytes, 0); }
    const result = exchange(`${method}-${profile}-random`, [{ name: 'random.bin', data, mtimeMs: fixedTime }], { method, profile, encodedHeader: true });
    assert.ok(result.archive.length < data.length * 1.2);
  });
}
for (const [lc, lp, pb] of [[0, 0, 0], [4, 0, 4], [0, 4, 1], [2, 2, 2]]) for (const method of ['lzma', 'lzma2']) {
  test(`original accepts candidate ${method} lc=${lc},lp=${lp},pb=${pb}`, () => {
    exchange(`${method}-lc${lc}-lp${lp}-pb${pb}`, files, { method, lc, lp, pb, dictionarySize: 4096, encodedHeader: true });
  });
}
for (const size of [0, 1, 273, 32768, 32769, 65537]) for (const endMarker of [false, true]) {
  test(`original independently reads LZMA-alone wrapper size=${size}, EOS=${endMarker}`, () => {
    const data = Buffer.from(Array.from({ length: size }, (_, i) => (i * 13) & 255)), result = encodeLzma(data, { endMarker });
    assert.deepEqual(decodeLzma(result.packed, size, result.properties), data);
    const length = Buffer.alloc(8); length.writeBigUInt64LE(endMarker ? 0xffffffffffffffffn : BigInt(size));
    const file = join(run, `raw-${size}-${endMarker}.lzma`); writeFileSync(file, Buffer.concat([result.properties, length, result.packed]));
    cli(['t', file]); assert.equal(sha(cli(['x', '-so', file], true)), sha(data));
    retain(file, 'candidate raw LZMA in independently constructed .lzma properties+size wrapper', { endMarker, inputBytes: size, expectedSha256: sha(data), stats: result.stats });
  });
}
test('candidate LZMA2 uses genuine compressed chunks and honest mixed stored fallback', () => {
  const repeated = Buffer.from('Meaningful compressed chunk\n'.repeat(4000)), data = Buffer.concat([random(65536), repeated, random(20000, 77)]);
  const result = encodeLzma2(data, { chunkSize: 32768 });
  assert.ok(result.stats.compressedChunks > 0); assert.ok(result.stats.storedChunks > 0); assert.ok(result.stats.matchedBytes > 0);
  assert.equal(result.stats.compressedInputBytes + result.stats.storedInputBytes, data.length);
  assert.deepEqual(decodeLzma2(result.packed, data.length, result.properties), data);
  exchange('lzma2-mixed', [{ name: 'mixed.bin', data }], { method: 'lzma2', encodedHeader: true });
});
test('profiles have real dictionary differences on a distant-repeat workload', () => {
  const half = random(180000), data = Buffer.concat([half, half]);
  const fast = encodeLzma(data, { profile: 'fast' }), balanced = encodeLzma(data, { profile: 'balanced' });
  assert.deepEqual(decodeLzma(fast.packed, data.length, fast.properties), data); assert.deepEqual(decodeLzma(balanced.packed, data.length, balanced.properties), data);
  assert.ok(balanced.packed.length < fast.packed.length * 0.7);
  for (const profile of ['fast', 'balanced']) exchange(`lzma-distant-${profile}`, [{ name: 'distance.bin', data }], { method: 'lzma', profile });
});
test('LZMA2 chunk-size boundaries and profile options are genuine compressed original-compatible data', () => {
  const data = Buffer.from('Chunk reset and bounded search\n'.repeat(3000));
  for (const chunkSize of [1024, 4096, 32768]) {
    const result = encodeLzma2(data, { chunkSize, dictionarySize: 10000 });
    assert.ok(result.stats.compressedChunks > 0); assert.deepEqual(decodeLzma2(result.packed, data.length, result.properties), data);
    // The independently readable raw payload is retained along with an ordinary
    // container using the default chunk size in the other exchange cases.
    const file = join(run, `lzma2-chunk-${chunkSize}.raw`); writeFileSync(file, result.packed);
    retain(file, 'candidate genuine LZMA2 raw chunks', { properties: result.properties.toString('hex'), expectedSha256: sha(data), stats: result.stats });
  }
});
test('container LZMA2 encoded header and LZMA1 EOS are accepted by original', () => {
  exchange('lzma2-header-lzma2', files, { method: 'lzma2', encodedHeader: true, headerMethod: 'lzma2' });
  exchange('lzma-eos-container', files, { method: 'lzma', endMarker: true, encodedHeader: true });
});
test('byte input, dictionaries, literal contexts, search, output and option bounds reject', () => {
  for (const encode of [encodeLzma, encodeLzma2]) {
    for (const input of [[], 'text', new Proxy([], { get() { throw Error('untrusted input getter touched'); } })]) assert.throws(() => encode(input), /must be bytes/);
    assert.throws(() => encode(new Uint8Array(LIMITS.input + 1)), /input exceeds/);
    assert.throws(() => encode(Buffer.from('hello'), { maxInput: 4 }), /input exceeds/);
    assert.throws(() => encode(Buffer.from('hello'), { maxOutput: 0 }), /output exceeds/);
    for (const dictionarySize of [0, 4095, LIMITS.dictionary + 1, Infinity]) assert.throws(() => encode(Buffer.from('hello'), { dictionarySize }), /dictionary/);
    for (const profile of ['__proto__', 'unknown']) assert.throws(() => encode(Buffer.from('hello'), { profile }), /profile/);
    for (const searchDepth of [0, 65, 1.5]) assert.throws(() => encode(Buffer.from('hello'), { searchDepth }), /search depth/);
    assert.throws(() => encode(Buffer.from('hello'), { lc: 4, lp: 1 }), /lc \+ lp/);
    for (const field of ['lc', 'lp', 'pb']) assert.throws(() => encode(Buffer.from('hello'), { [field]: 5 }), /bound/);
    assert.throws(() => encode(new Uint8Array(new SharedArrayBuffer(8))), /unshared/);
    class LyingBytes extends Uint8Array { get byteLength() { return 1; } get buffer() { throw Error('fake buffer getter touched'); } get byteOffset() { throw Error('fake offset getter touched'); } }
    const source = new LyingBytes(Buffer.from('Typed byte input guard\n'.repeat(500))), result = encode(source);
    assert.equal(sha((encode === encodeLzma ? decodeLzma : decodeLzma2)(result.packed, getActualLength(source), result.properties)), sha(Buffer.from(source)));
    assert.throws(() => encode(new LyingBytes(LIMITS.input + 1)), /input exceeds/);
    assert.throws(() => encode(Buffer.from('hello'), { endMarker: 'yes' }), /boolean/);
  }
  for (const chunkSize of [0, 1023, 32769]) assert.throws(() => encodeLzma2(Buffer.from('hello'), { chunkSize }), /chunk size/);
  assert.throws(() => encodeLzma2(Buffer.from('hello'), { endMarker: true }), /cannot use/);
});
function getActualLength(v) { return Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'byteLength').get.call(v); }
test('optional work/time budgets reject deterministically and successful bounded work is exact', () => {
  const data = Buffer.from('Bounded encoder work\n'.repeat(10000));
  for (const encode of [encodeLzma, encodeLzma2]) {
    assert.throws(() => encode(data, { maxSteps: 0 }), /step budget/);
    assert.throws(() => encode(data, { maxSteps: data.length - 1 }), /step budget/);
    assert.throws(() => encode(data, { maxTimeMs: 0 }), /elapsed-time budget/);
    for (const maxSteps of [-1, Infinity, 1.5, LIMITS.steps + 1]) assert.throws(() => encode(data, { maxSteps }), /step limit/);
    for (const maxTimeMs of [-1, Infinity, LIMITS.timeMs + 1]) assert.throws(() => encode(data, { maxTimeMs }), /time limit/);
    const result = encode(data, { maxSteps: LIMITS.steps, maxTimeMs: 60000 });
    assert.equal(sha((encode === encodeLzma ? decodeLzma : decodeLzma2)(result.packed, data.length, result.properties)), sha(data));
    assert.throws(() => encode(data, { maxOutput: result.packed.length - 1 }), /output exceeds/);
  }
});
test('per-file, total, path and method limits remain enforced before container exchange', () => {
  assert.throws(() => write7z([{ name: 'huge', data: new Uint8Array(16 * 1024 ** 2 + 1) }], { method: 'lzma2' }), /input size/);
  assert.throws(() => write7z([{ name: '../escape', data: Buffer.from('x') }], { method: 'lzma2' }), /unsafe path/);
  assert.throws(() => write7z([{ name: 'file', data: Buffer.from('x') }], { method: 'lzma2', encodedHeader: true, headerMethod: 'unknown' }), /header method/);
});
test('receipt records exact source and independently verified original fixtures', () => {
  const implementation_sha256 = Object.fromEntries(['encode-lzma.mjs', 'lzma.mjs', 'sevenzip.mjs', 'encoder.test.mjs'].map(name => [name, sha(readFileSync(join(root, name)))]));
  writeFileSync(join(run, 'fixtures-manifest.json'), JSON.stringify({ schema: 1, original: 'authenticated complete 7-Zip26.04 Windowsx64', implementation_sha256, rows, records }, null, 2));
  console.log(`Retained compressed-writer fixtures: ${run}`);
});
