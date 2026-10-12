import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { encodeLzma, encodeLzma2, PROFILES, LIMITS } from './encode-lzma.mjs';
import { decodeLzma, decodeLzma2 } from './lzma.mjs';
import { write7z, read7z } from './sevenzip.mjs';
const root = dirname(fileURLToPath(import.meta.url)), sha = b => createHash('sha256').update(b).digest('hex');
const original = join(root, '../full-archive-baseline-20261012/full-product-x64/7z.exe');
assert.equal(sha(readFileSync(original)), '95fff19b73eff77c87c0d7bd32822e43fb90dd2932459f962eb532d8dfb6ba53');
assert.equal(sha(readFileSync(join(dirname(original), '7z.dll'))), '899cd73d7fc60e1c1c35c7de0f5bed3dc69bfe2cecbd48014d868a347970a0b1');
const run = mkdtempSync(join(root, 'benchmark-')), rows = [], records = [];
function cli(args) {
  const start = performance.now(), result = spawnSync(original, args, { cwd: run, encoding: 'utf8', windowsHide: true, timeout: 60000 });
  assert.equal(result.status, 0, `${args.join(' ')}\n${result.stdout}\n${result.stderr}`); return performance.now() - start;
}
function retain(name, bytes, purpose) { writeFileSync(join(run, name), bytes); records.push({ path: name, bytes: bytes.length, sha256: sha(bytes), purpose }); }
function pattern(size) { const data = Buffer.allocUnsafe(size), block = Buffer.from('Bounded genuine compressed encoder workload 🌍\n'); for (let i = 0; i < size; i++) data[i] = block[i % block.length]; return data; }
function random(size) { let seed = 0x715cbabe; const data = Buffer.allocUnsafe(size); for (let i = 0; i < size; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; data[i] = seed & 255; } return data; }
for (const method of ['lzma', 'lzma2']) for (const profile of Object.keys(PROFILES)) for (const kind of ['repetitive16m', 'random2m']) {
  let data = kind === 'random2m' ? random(2 * 1024 ** 2) : pattern(16 * 1024 ** 2);
  const inputSha = sha(data); global.gc?.(); const before = process.memoryUsage(), start = performance.now();
  let encoded = (method === 'lzma' ? encodeLzma : encodeLzma2)(data, { profile, maxTimeMs: 60000, maxSteps: LIMITS.steps });
  const encodeMs = performance.now() - start, after = process.memoryUsage();
  assert.equal(sha((method === 'lzma' ? decodeLzma : decodeLzma2)(encoded.packed, data.length, encoded.properties)), inputSha);
  if (kind === 'repetitive16m') { assert.ok(encoded.stats.matches > 0); assert.ok(encoded.stats.matchedBytes > 0); assert.ok(encoded.packed.length < data.length); }
  if (method === 'lzma2' && kind === 'random2m') { assert.equal(encoded.stats.compressedChunks, 0); assert.equal(encoded.stats.storedInputBytes, data.length); }
  const name = `${method}-${profile}-${kind}`;
  retain(`${name}.packed`, encoded.packed, 'Measured primitive output; candidate decoder exact SHA256');
  rows.push({ name, method, profile, kind, inputBytes: data.length, inputSha256: inputSha, packedBytes: encoded.packed.length, ratio: encoded.packed.length / data.length, encodeMs, mibPerSecond: data.length / 1024 ** 2 / (encodeMs / 1000), before, after, propertiesHex: encoded.properties.toString('hex'), stats: encoded.stats });
  encoded = null; data = null; global.gc?.(); console.log(`Measured ${name}: ${encodeMs.toFixed(1)}ms`);
}
// A complete 64 MiB solid archive, exactly four maximum-sized files. Only one
// source buffer is supplied, but the container deliberately copies each entry.
let source = pattern(16 * 1024 ** 2); const inputSha = sha(source), entries = Array.from({ length: 4 }, (_, i) => ({ name: `boundary-${i}.bin`, data: source }));
global.gc?.(); const before = process.memoryUsage(), start = performance.now();
let archive = write7z(entries, { method: 'lzma2', profile: 'balanced', solid: true, encodedHeader: true, maxTimeMs: 60000, maxSteps: LIMITS.steps });
const encodeMs = performance.now() - start, after = process.memoryUsage();
retain('solid64m.7z', archive, '64 MiB total / 16 MiB each boundary archive, candidate genuine LZMA2 encoded data and LZMA encoded header');
const own = read7z(archive); assert.equal(own.length, 4); for (const file of own) { assert.equal(file.data.length, source.length); assert.equal(sha(file.data), inputSha); }
const archivePath = join(run, 'solid64m.7z'), originalTestMs = cli(['t', archivePath]), out = join(run, 'original-solid64m');
const originalExtractMs = cli(['x', '-y', `-o${out}`, archivePath]);
for (const e of entries) { const bytes = readFileSync(join(out, e.name)); assert.equal(bytes.length, source.length); assert.equal(sha(bytes), inputSha); }
rows.push({ name: 'solid64m', inputBytes: 64 * 1024 ** 2, eachFileBytes: source.length, files: 4, inputSha256Each: inputSha, archiveBytes: archive.length, ratio: archive.length / (64 * 1024 ** 2), encodeMs, mibPerSecond: 64 / (encodeMs / 1000), before, after, originalTestMs, originalExtractMs, originalResult: 't + extract all four paths, lengths and SHA256 exact', ownResult: 'all four lengths and SHA256 exact' });
console.log(`Measured solid64m: ${encodeMs.toFixed(1)}ms, ${archive.length} archive bytes`);
const deadlines = [];
for (const method of ['lzma', 'lzma2']) {
  const begin = performance.now(); let rejected = false, error;
  try { (method === 'lzma' ? encodeLzma : encodeLzma2)(source, { profile: 'thorough', maxTimeMs: 1 }); }
  catch (e) { rejected = true; error = e.message; assert.match(error, /elapsed-time budget/); }
  assert.equal(rejected, true); deadlines.push({ method, requestedTimeMs: 1, elapsedMs: performance.now() - begin, result: error });
}
const implementationSha256 = Object.fromEntries(['encode-lzma.mjs', 'lzma.mjs', 'sevenzip.mjs', 'encoder.test.mjs', 'benchmark.mjs'].map(name => [name, sha(readFileSync(join(root, name)))]));
writeFileSync(join(run, 'benchmark-results.json'), JSON.stringify({ schema: 1, runtime: process.version, platform: process.platform, architecture: process.arch, runsEach: 1, statisticalOrOriginalRatioParityClaim: false, sampledMemoryIsNotPeakOrIsolation: true, implementationSha256, rows, deadlines, records }, null, 2));
console.log(JSON.stringify({ run, measurements: rows.length, retainedOutputs: records.length, deadlines }, null, 2));
