import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { handle, minimalLineDiff } from './server.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rea-editor-'));
  t.after(() => { assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(root).startsWith('rea-editor-')); return rm(root, { recursive: true, force: true }); });
  const workspace = { root, resolve(name) { const result = path.resolve(root, name); if (result !== root && !result.startsWith(root + path.sep)) throw new Error('Outside workspace'); return result; } };
  return { workspace, call: (action, input) => handle({ action, input, workspace }) };
}
test('real file create, reopen, UTF-8 save and stale-write protection', async t => {
  const { workspace, call } = await fixture(t);
  const first = await call('save', { path: 'nested/hello.txt', content: 'First 🧪\n', revision: null });
  assert.equal((await call('read', { path: first.path })).content, 'First 🧪\n');
  const second = await call('save', { path: first.path, content: 'Second\n', revision: first.revision });
  await assert.rejects(call('save', { path: first.path, content: 'Stale', revision: first.revision }), /changed/);
  assert.equal(await readFile(workspace.resolve(first.path), 'utf8'), 'Second\n');
  assert.notEqual(first.revision, second.revision);
  assert.deepEqual((await call('list')).files, [first.path]);
  assert.deepEqual(await readdir(workspace.resolve('nested')), ['hello.txt']);
});
test('concurrent saves from one revision accept only one and preserve a complete file', async t => {
  const { call } = await fixture(t);
  const first = await call('save', { path: 'race.txt', content: 'initial', revision: null });
  const results = await Promise.allSettled(['one', 'two'].map(content => call('save', { path: first.path, content, revision: first.revision })));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal((await call('read', { path: first.path })).content, 'one');
});
test('binary, malformed UTF-8, traversal, accidental overwrite and unknown actions fail', async t => {
  const { workspace, call } = await fixture(t);
  await writeFile(workspace.resolve('binary'), Buffer.from([0, 1]));
  await writeFile(workspace.resolve('malformed'), Buffer.from([0xc0, 0xaf]));
  await assert.rejects(call('read', { path: 'binary' }), /Binary/);
  await assert.rejects(call('read', { path: 'malformed' }), /UTF-8/);
  await assert.rejects(call('save', { path: '../outside', content: 'x', revision: null }), /Outside/);
  await call('save', { path: 'exists', content: 'x', revision: null });
  await assert.rejects(call('save', { path: 'exists', content: 'y', revision: null }), /changed/);
  await assert.rejects(call('missing', {}), /Unknown/);
});
test('minimal diff fixes the recorded counterexample and reconstructs both texts', () => {
  const before = [...'ABACDEACACFC'].join('\n'), after = [...'EFC'].join('\n');
  const result = minimalLineDiff(before, after);
  assert.equal(result.cost, 9);
  assert.equal(result.operations.filter(op => op.type !== 'insert').map(op => op.text).join('\n'), before);
  assert.equal(result.operations.filter(op => op.type !== 'delete').map(op => op.text).join('\n'), after);
  assert.equal(minimalLineDiff('', '').cost, 0);
  assert.equal(minimalLineDiff('', 'x\n').cost, 2);
});
test('exhaustive two-letter inputs up to four lines agree with independent edit-distance recurrence', () => {
  const cases = [[]];
  for (let size = 1; size <= 4; size++) for (let bits = 0; bits < 2 ** size; bits++) cases.push(Array.from({ length: size }, (_, i) => ((bits >> i) & 1) ? 'B' : 'A'));
  function distance(a, b) { let row = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { const next = [i]; for (let j = 1; j <= b.length; j++) next.push(a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j] + 1, next[j - 1] + 1)); row = next; } return row[b.length]; }
  for (const a of cases) for (const b of cases) { const result = minimalLineDiff(a.join('\n'), b.join('\n')); assert.equal(result.cost, distance(a, b)); assert.deepEqual(result.operations.filter(op => op.type !== 'delete').map(op => op.text), b); }
});
test('literal replacement never interprets regular expressions or dollar expansion', async () => {
  const result = await handle({ action: 'replace', input: { content: 'a.*b.*', find: '.*', replacement: '$&' } });
  assert.deepEqual(result, { content: 'a$&b$&', count: 2 });
  await assert.rejects(handle({ action: 'replace', input: { content: 'x', find: '', replacement: 'y' } }), /empty/);
});
