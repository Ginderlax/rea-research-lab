import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { write7z, read7z } from './sevenzip.mjs';
import { OperationBudget, OPERATION_LIMITS } from './operation-budget.mjs';
import { makeOracleRun } from './original-lzma-test-helper.mjs';
import { start } from '../../server.mjs';
const root = dirname(fileURLToPath(import.meta.url)), sha = b => createHash('sha256').update(b).digest('hex');
const { original, run } = makeOracleRun('http'), records = [];
function cli(args, cwd = run) {
  const result = spawnSync(original, args, { cwd, encoding: 'utf8', windowsHide: true, timeout: 60000 });
  assert.equal(result.status, 0, result.stdout + result.stderr); return result.stdout;
}
function retain(path, details) { const bytes = readFileSync(path); records.push({ path: path.slice(run.length + 1).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes), ...details }); }
test('aggregate budget spans entries, header decoding, CRCs and separate codec calls', () => {
  const one = [{ name: 'first', data: Buffer.from('Aggregate bounded LZMA work\n'.repeat(15000)) }], two = [...one, { ...one[0], name: 'second' }];
  for (const method of ['lzma', 'lzma2']) {
    const measured = new OperationBudget({ maxTimeMs: 60000, maxSteps: OPERATION_LIMITS.steps });
    const archive = write7z(one, { method, encodedHeader: true, operationBudget: measured });
    const cap = measured.steps + 10000;
    assert.equal(sha(read7z(write7z(one, { method, encodedHeader: true, maxSteps: cap }))[0].data), sha(one[0].data));
    assert.throws(() => write7z(two, { method, encodedHeader: true, maxSteps: cap }), /Archive operation step budget/);
    const reading = new OperationBudget({ maxTimeMs: 60000, maxSteps: OPERATION_LIMITS.steps });
    read7z(archive, { operationBudget: reading });
    assert.throws(() => read7z(write7z(two, { method, encodedHeader: true }), { maxSteps: reading.steps + 10000 }), /Archive operation step budget/);
    // Reuse the same object for a write and its verification: resetting the
    // decoder's local counter cannot reset the aggregate operation counter.
    const shared = new OperationBudget({ maxTimeMs: 60000, maxSteps: measured.steps + reading.steps - 1 });
    const created = write7z(one, { method, encodedHeader: true, operationBudget: shared });
    assert.throws(() => read7z(created, { operationBudget: shared }), /Archive operation step budget/);
  }
  assert.throws(() => write7z(one, { method: 'lzma2', maxTimeMs: 0 }), /elapsed-time budget/);
  assert.throws(() => read7z(write7z(one), { maxSteps: 0 }), /step budget/);
  assert.throws(() => read7z(write7z(one), { operationBudget: { work() {}, check() {} } }), /must be an OperationBudget/);
});
test('HTTP genuine LZMA/LZMA2 all profiles, encoded headers and restart preserve exact content', async t => {
  const dataDir = join(run, 'data'); let host = await start({ port: 0, dataDir }); t.after(() => host.close());
  const workspace = join(dataDir, 'archive/workspace');
  const call = async (action, input, status = 200) => {
    const response = await fetch(`${host.url}/api/archive/${action}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-rea-token': host.token }, body: JSON.stringify(input) });
    const value = await response.json(); assert.equal(response.status, status, value.error); return value.result ?? value;
  };
  const payloads = { '雪.txt': 'Real compressed filesystem exchange 🌍\n'.repeat(3000), 'other.txt': 'Other exact file\n'.repeat(2500), empty: '' };
  for (const [name, content] of Object.entries(payloads)) await call('putFile', { path: `source/${name}`, content });
  await fs.mkdir(join(workspace, 'source/empty-dir'));
  const expected = Object.fromEntries(Object.entries(payloads).map(([name, value]) => [name, sha(Buffer.from(value))]));
  for (const compression of ['lzma', 'lzma2']) for (const profile of ['fast', 'balanced', 'thorough']) {
    const path = `${compression}-${profile}.7z`, destination = `out-${compression}-${profile}`;
    const created = await call('create', { format: 'sevenzip', source: 'source', output: path, compression, profile, solid: true, encodedHeader: true });
    assert.ok(created.bytes < created.originalBytes); assert.equal(created.entries, 4);
    const listing = await call('list', { path }); assert.equal(listing.format, 'sevenzip'); assert.equal(JSON.stringify(listing).includes('"data"'), false);
    for (const file of listing.entries.filter(e => e.size)) { assert.equal(file.method, compression); assert.equal(file.solid, true); assert.equal(file.contentChecksum, true); }
    await call('extract', { path, destination, confirm: true });
    for (const [name, digest] of Object.entries(expected)) assert.equal(sha(await fs.readFile(join(workspace, destination, name))), digest);
    assert.equal((await fs.stat(join(workspace, destination, 'empty-dir'))).isDirectory(), true);
    cli(['t', join(workspace, path)]); const out = join(run, `original-${compression}-${profile}`); cli(['x', '-y', `-o${out}`, join(workspace, path)]);
    for (const [name, digest] of Object.entries(expected)) assert.equal(sha(readFileSync(join(out, name))), digest);
    retain(join(workspace, path), { method: compression, profile, encoded_header: true, solid: true, original_result: 'test + SHA256 extraction exact', expected });
  }
  const defaultPath = 'default.7z'; await call('create', { format: 'sevenzip', source: 'source', output: defaultPath });
  assert.equal((await call('list', { path: defaultPath })).entries.find(e => e.size).method, 'lzma2');
  await host.close(); host = await start({ port: 0, dataDir });
  assert.equal((await call('test', { path: 'lzma2-thorough.7z' })).verified, true);
  await call('extract', { path: 'lzma-thorough.7z', destination: 'after-restart', confirm: true });
  for (const [name, digest] of Object.entries(expected)) assert.equal(sha(await fs.readFile(join(workspace, 'after-restart', name))), digest);
  // A default complete-original archive has both genuine compressed data and
  // its ordinary LZMA encoded header. Test filesystem exchange through HTTP.
  const originalPath = join(workspace, 'original-default.7z'); cli(['a', '-t7z', originalPath, '.'], join(workspace, 'source'));
  assert.equal((await call('test', { path: 'original-default.7z' })).verified, true);
  await call('extract', { path: 'original-default.7z', destination: 'from-original', confirm: true });
  for (const [name, digest] of Object.entries(expected)) assert.equal(sha(await fs.readFile(join(workspace, 'from-original', name))), digest);
  retain(originalPath, { producer: 'authenticated complete original 7-Zip26.04 defaults', candidate_result: 'HTTP test + exact extraction after restart', expected });
  for (const action of ['list', 'test', 'extract']) await call(action, { path: defaultPath, destination: 'budget-out', confirm: true, maxSteps: 0 }, 400);
  await assert.rejects(fs.stat(join(workspace, 'budget-out')), /ENOENT/);
  await call('create', { format: 'sevenzip', source: 'source', output: 'budget.7z', compression: 'lzma2', maxSteps: 0 }, 400);
  await assert.rejects(fs.stat(join(workspace, 'budget.7z')), /ENOENT/);
  await call('create', { format: 'sevenzip', source: 'source', output: 'unknown.7z', compression: 'lzma2', profile: '__proto__' }, 400);
  await assert.rejects(fs.stat(join(workspace, 'unknown.7z')), /ENOENT/);
  assert.equal((await fs.readdir(workspace)).some(n => n.includes('.partial-')), false);
});
test.after(() => {
  writeFileSync(join(run, 'fixtures-manifest.json'), JSON.stringify({ schema: 1, runtime: process.version, implementation_sha256: Object.fromEntries(['lzma.mjs', 'encode-lzma.mjs', 'sevenzip.mjs', 'operation-budget.mjs', 'server.mjs', 'client.mjs', 'lzma.integration.test.mjs'].map(n => [n, sha(readFileSync(join(root, n)))])), records }, null, 2));
  console.log(`Retained application compressed-LZMA fixtures: ${run}`);
});
