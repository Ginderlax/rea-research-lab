import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { write7z } from './sevenzip.mjs';
const root = dirname(fileURLToPath(import.meta.url)), sha = b => createHash('sha256').update(b).digest('hex');
const run = join(root, process.argv[2] ?? 'benchmark-vbZ6G3'), measured = JSON.parse(readFileSync(join(run, 'benchmark-results.json')));
const original = join(root, '../full-archive-baseline-20261012/full-product-x64/7z.exe');
assert.equal(sha(readFileSync(original)), '95fff19b73eff77c87c0d7bd32822e43fb90dd2932459f962eb532d8dfb6ba53');
assert.equal(sha(readFileSync(join(dirname(original), '7z.dll'))), '899cd73d7fc60e1c1c35c7de0f5bed3dc69bfe2cecbd48014d868a347970a0b1');
const records = [];
for (const row of measured.rows.filter(r => r.method)) {
  let data = Buffer.allocUnsafe(row.inputBytes), seed = 0x715cbabe; const block = Buffer.from('Bounded genuine compressed encoder workload 🌍\n');
  for (let i = 0; i < data.length; i++) {
    if (row.kind.startsWith('random')) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; data[i] = seed & 255; }
    else data[i] = block[i % block.length];
  }
  assert.equal(sha(data), row.inputSha256);
  const archive = write7z([{ name: `${row.name}.bin`, data }], { method: row.method, profile: row.profile });
  assert.equal(sha(archive.subarray(32, 32 + row.packedBytes)), sha(readFileSync(join(run, `${row.name}.packed`))), 'container includes exact measured primitive bytes');
  const name = `${row.name}.7z`, path = join(run, name); writeFileSync(path, archive);
  const tested = spawnSync(original, ['t', path], { cwd: run, encoding: 'utf8', windowsHide: true, timeout: 60000 });
  assert.equal(tested.status, 0, tested.stdout + tested.stderr); writeFileSync(join(run, `${row.name}-original-test.txt`), tested.stdout + tested.stderr);
  const extracted = spawnSync(original, ['x', '-so', path], { cwd: run, encoding: null, windowsHide: true, timeout: 60000, maxBuffer: 32 * 1024 ** 2 });
  assert.equal(extracted.status, 0, String(extracted.stderr)); assert.equal(extracted.stdout.length, data.length); assert.equal(sha(extracted.stdout), row.inputSha256);
  records.push({ path: name, bytes: archive.length, sha256: sha(archive), exactMeasuredPackedBytes: true, originalTestStatus: tested.status, originalExtractStatus: extracted.status, originalExtractBytes: extracted.stdout.length, originalExtractSha256: sha(extracted.stdout), expectedInputSha256: row.inputSha256 });
  data = null; console.log(`Original verified ${row.name}`);
}
writeFileSync(join(run, 'original-check-results.json'), JSON.stringify({ schema: 1, runtime: process.version, implementationSha256: Object.fromEntries(['benchmark-oracle.mjs', 'encode-lzma.mjs', 'sevenzip.mjs'].map(n => [n, sha(readFileSync(join(root, n)))])), records }, null, 2));
