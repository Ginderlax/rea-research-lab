import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { handle } from './server.mjs';
import { createWorkspace } from '../../lib/storage.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'rea-backup-test-'));
  const workspace = await createWorkspace(path.join(root,'workspace'));
  t.after(async () => { assert.equal(path.dirname(root),path.resolve(os.tmpdir())); assert.ok(path.basename(root).startsWith('rea-backup-test-')); await fs.rm(root,{ recursive: true,force: true }); });
  return { root: workspace.root,call: (action,input = {}) => handle({ action,input,workspace }) };
}
test('content-addressed snapshots deduplicate chunks and faithfully restore multi-chunk binary and empty directories',async t => {
  const { root,call } = await fixture(t); const source = path.join(root,'source'); await fs.mkdir(path.join(source,'empty'),{ recursive: true });
  const bytes = Buffer.concat([Buffer.alloc(1024 * 1024,42),Buffer.alloc(1024 * 1024,43),Buffer.from([0,1,255])]);
  await fs.writeFile(path.join(source,'a.bin'),bytes); await fs.writeFile(path.join(source,'duplicate.bin'),bytes); await fs.writeFile(path.join(source,'empty.txt'),'');
  const first = await call('snapshot',{ source: 'source',label: 'First' }), second = await call('snapshot',{ source: 'source',label: 'Second' });
  const files = await fs.readdir(path.join(root,'.rea-backup','chunks')); assert.equal(files.length,3);
  const doc = (await call('inspect',{ id: first.id })).snapshot;
  assert.equal(doc.entries.find(e => e.path === 'a.bin').hash,createHash('sha256').update(bytes).digest('hex'));
  assert.deepEqual(doc.entries.find(e => e.path === 'empty.txt').chunks,[]);
  assert.equal((await call('check',{ id: second.id })).verified,true);
  await call('restore',{ id: first.id,destination: 'restored',confirm: true });
  assert.deepEqual(await fs.readFile(path.join(root,'restored','a.bin')),bytes); assert.deepEqual(await fs.readFile(path.join(root,'restored','duplicate.bin')),bytes);
  assert.equal((await fs.stat(path.join(root,'restored','empty'))).isDirectory(),true);
  await assert.rejects(call('restore',{ id: first.id,destination: 'restored',confirm: true }),/EEXIST/);
  assert.equal((await call('list')).snapshots.length,2);
});
test('corrupt content and manifests fail before restore output; explicit retention reclaims unreachable data',async t => {
  const { root,call } = await fixture(t); await call('putFile',{ path: 'source/a.txt',content: 'old' });
  const first = await call('snapshot',{ source: 'source' });
  await fs.writeFile(path.join(root,'source','a.txt'),'new'); const second = await call('snapshot',{ source: 'source' });
  const doc = (await call('inspect',{ id: second.id })).snapshot, chunkId = doc.entries[0].chunks[0], chunkPath = path.join(root,'.rea-backup','chunks',chunkId);
  await fs.writeFile(chunkPath,'tampered'); await assert.rejects(call('check',{ id: second.id }),/integrity/);
  await assert.rejects(call('planRetention',{ keepLast: 1 }),/integrity/);
  assert.equal((await call('list')).snapshots.length,2);
  await assert.rejects(call('restore',{ id: second.id,destination: 'damaged-restore',confirm: true }),/integrity/); await assert.rejects(fs.stat(path.join(root,'damaged-restore')),/ENOENT/);
  await fs.writeFile(chunkPath,'new');
  const manifest = path.join(root,'.rea-backup','snapshots',first.id + '.json'), original = await fs.readFile(manifest); await fs.appendFile(manifest,' ');
  await assert.rejects(call('inspect',{ id: first.id }),/integrity/); await fs.writeFile(manifest,original);
  const plan = await call('planRetention',{ keepLast: 1 }); assert.equal(plan.remove.length,1); assert.equal(plan.unusedChunks.length,1);
  await assert.rejects(call('prune',{ keepLast: 1,token: plan.token }),/confirmation/);
  await assert.rejects(call('prune',{ keepLast: 1,token: 'stale',confirm: true }),/changed/);
  const result = await call('prune',{ keepLast: 1,token: plan.token,confirm: true }); assert.equal(result.removedSnapshots,1); assert.equal(result.removedChunks,1);
  assert.equal((await call('list')).snapshots[0].id,second.id); assert.equal((await call('check',{ id: second.id })).verified,true);
});
test('snapshot and restore paths cannot traverse outside the workspace or replace existing files',async t => {
  const { call } = await fixture(t);
  await assert.rejects(call('putFile',{ path: '../outside',content: 'no' }),/Unsafe|workspace/);
  await call('putFile',{ path: 'source/file',content: 'first' }); await assert.rejects(call('putFile',{ path: 'source/file',content: 'second' }),/EEXIST/);
  const { id } = await call('snapshot',{ source: 'source' }); await assert.rejects(call('restore',{ id,destination: 'restore' }),/confirmation/);
  await assert.rejects(call('restore',{ id,destination: '../escape',confirm: true }),/Unsafe|workspace/);
});
