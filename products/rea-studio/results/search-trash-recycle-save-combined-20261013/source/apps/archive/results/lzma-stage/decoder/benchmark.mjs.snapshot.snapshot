import { readFileSync, writeFileSync, openSync, closeSync, writeSync, mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';
import { decodeLzma, decodeLzma2, LIMITS } from './lzma.mjs';
const root = dirname(fileURLToPath(import.meta.url)), sha = b => createHash('sha256').update(b).digest('hex');
const original = join(root, '../full-archive-baseline-20261012/full-product-x64/7z.exe');
assert.equal(sha(readFileSync(original)), '95fff19b73eff77c87c0d7bd32822e43fb90dd2932459f962eb532d8dfb6ba53');
assert.equal(sha(readFileSync(join(dirname(original), '7z.dll'))), '899cd73d7fc60e1c1c35c7de0f5bed3dc69bfe2cecbd48014d868a347970a0b1');
function cli(args, cwd) {
  const result = spawnSync(original, args, { cwd, encoding: 'utf8', windowsHide: true, timeout: 60000 });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`); return result.stdout;
}
const run = mkdtempSync(join(root, 'benchmark-')), rows = [];
const cases = [
  { name: 'lzma2-output64m', method: 'LZMA2:d=4k', size: LIMITS.output, expectedMethod: '21', random: false },
  { name: 'lzma-random4m', method: 'LZMA:d=1m', size: 4 * 1024 ** 2, expectedMethod: '030101', random: true },
  { name: 'lzma2-random4m', method: 'LZMA2:d=1m', size: 4 * 1024 ** 2, expectedMethod: '21', random: true }
];
for (const c of cases) {
  const source = join(run, `${c.name}.bin`), sourceHash = createHash('sha256'), file = openSync(source, 'wx');
  const block = Buffer.alloc(1024 ** 2), pattern = Buffer.from('Bounded genuine compressed output 🌍\n'); let seed = 0x12e9e711;
  for (let offset = 0; offset < c.size; offset += block.length) {
    for (let i = 0; i < block.length; i++) {
      if (c.random) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; block[i] = seed & 255; }
      else block[i] = pattern[(offset + i) % pattern.length];
    }
    writeSync(file, block); sourceHash.update(block);
  }
  closeSync(file); const expectedSha = sourceHash.digest('hex'), path = join(run, `${c.name}.7z`);
  const args = ['a', '-t7z', `-m0=${c.method}`, '-mx=1', '-mmt=1', '-ms=off', '-mhc=off', path, source];
  cli(args, run); cli(['t', path], run);
  const archive = readFileSync(path), nextStart = 32 + Number(archive.readBigUInt64LE(12)), header = archive.subarray(nextStart); let p = 0;
  const num = () => {
    const first = header[p++]; let value = 0n, mask = 128;
    for (let i = 0; i < 8; i++, mask >>>= 1) {
      if (!(first & mask)) return Number(value | (BigInt(first & (mask - 1)) << BigInt(i * 8)));
      value |= BigInt(header[p++]) << BigInt(i * 8);
    }
    return Number(value);
  };
  const id = n => assert.equal(num(), n);
  const endOrCRC = () => { let kind = num(); if (kind === 10) { assert.equal(header[p++], 1); p += 4; kind = num(); } assert.equal(kind, 0); };
  id(1); id(4); id(6); const offset = num(); assert.equal(num(), 1); id(9); const packedSize = num(); endOrCRC();
  id(7); id(11); assert.equal(num(), 1); assert.equal(header[p++], 0); assert.equal(num(), 1); const flags = header[p++]; assert.equal(flags & 16, 0);
  const method = header.subarray(p, p + (flags & 15)).toString('hex'); p += flags & 15; assert.equal(method, c.expectedMethod);
  const propertySize = flags & 32 ? num() : 0, properties = header.subarray(p, p + propertySize); p += propertySize;
  id(12); assert.equal(num(), c.size); const packed = archive.subarray(32 + offset, 32 + offset + packedSize), decode = method === '21' ? decodeLzma2 : decodeLzma;
  const measurements = [];
  for (let i = 0; i < 3; i++) {
    global.gc?.(); const before = process.memoryUsage(), start = performance.now();
    let output = decode(packed, c.size, properties, { maxTimeMs: 30000, maxSteps: LIMITS.steps });
    const decodeMs = performance.now() - start, after = process.memoryUsage();
    assert.equal(sha(output), expectedSha); output = null;
    measurements.push({ decode_ms: decodeMs, before, after });
  }
  assert.throws(() => decode(packed, c.size, properties, { maxOutput: c.size - 1 }), /declared output/);
  const start = performance.now(); let tinyBudgetResult, tinyBudgetElapsedMs;
  try {
    const output = decode(packed, c.size, properties, { maxTimeMs: 1 });
    tinyBudgetElapsedMs = performance.now() - start;
    assert.equal(sha(output), expectedSha); tinyBudgetResult = 'completed within budget';
  } catch (error) { tinyBudgetElapsedMs = performance.now() - start; assert.match(error.message, /elapsed-time budget/); tinyBudgetResult = 'elapsed budget rejected'; }
  if (c.name !== 'lzma2-random4m') assert.equal(tinyBudgetResult, 'elapsed budget rejected');
  rows.push({ ...c, args, source_path: source, source_sha256: expectedSha, archive_path: path, archive_bytes: archive.length,
    archive_sha256: sha(archive), properties: properties.toString('hex'), packed_bytes: packedSize, measurements, tiny_budget_result: tinyBudgetResult, tiny_budget_elapsed_ms: tinyBudgetElapsedMs });
}
const implementation_sha256 = Object.fromEntries(['lzma.mjs', 'benchmark.mjs'].map(name => [name, sha(readFileSync(join(root, name)))]));
const report = { schema: 1, scope: 'Measured primitive only; not an original speed comparison or process memory limit', implementation_sha256, node: process.version, versions: process.versions, run, rows };
writeFileSync(join(run, 'benchmark.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ run, rows: rows.map(row => ({ name: row.name, input: row.packed_bytes, output: row.size,
  decode_ms: row.measurements.map(m => m.decode_ms), rss_mib: row.measurements.map(m => m.after.rss / 1024 ** 2),
  tiny_budget_result: row.tiny_budget_result, tiny_budget_elapsed_ms: row.tiny_budget_elapsed_ms })) }, null, 2));
