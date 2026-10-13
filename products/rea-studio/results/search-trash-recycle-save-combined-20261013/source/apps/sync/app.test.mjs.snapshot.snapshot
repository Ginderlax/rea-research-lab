import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { handle } from './server.mjs';
import { createStore,createWorkspace } from '../../lib/storage.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'rea-sync-test-'));
  const store = await createStore(path.join(root,'store'));
  const workspace = await createWorkspace(path.join(root,'workspace'));
  t.after(async () => { assert.equal(path.dirname(root),path.resolve(os.tmpdir())); assert.ok(path.basename(root).startsWith('rea-sync-test-')); await fs.rm(root,{ recursive: true,force: true }); });
  return { root: workspace.root,call: (action,input = {}) => handle({ action,input,workspace,store }) };
}
test('dry runs write nothing and copy faithfully preserves binary files and empty directories',async t => {
  const { root,call } = await fixture(t); await fs.mkdir(path.join(root,'source','empty'),{ recursive: true }); const binary = Buffer.from(Array.from({ length: 12345 },(_,i) => i % 256)); await fs.writeFile(path.join(root,'source','data.bin'),binary);
  const plan = await call('plan',{ source: 'source',target: 'target' }); assert.equal(plan.operations.length,1); await assert.rejects(fs.stat(path.join(root,'target')),/ENOENT/);
  await assert.rejects(call('apply',{ token: plan.token }),/confirmation/);
  const applied = await call('apply',{ token: plan.token,confirm: true }); assert.equal(applied.copied,1); assert.deepEqual(await fs.readFile(path.join(root,'target','data.bin')),binary); assert.equal((await fs.stat(path.join(root,'target','empty'))).isDirectory(),true);
  const unchanged = await call('plan',{ source: 'source',target: 'target' }); assert.equal(unchanged.operations.length,0); assert.equal(unchanged.unchangedFiles,1);
});
test('conflicts require per-file resolution and overwritten bytes are preserved; stale plans fail',async t => {
  const { root,call } = await fixture(t); await call('putFile',{ path: 'source/a',content: 'new' }); await call('putFile',{ path: 'target/a',content: 'old' });
  let plan = await call('plan',{ source: 'source',target: 'target' }); assert.equal(plan.conflicts.length,1);
  await assert.rejects(call('apply',{ token: plan.token,confirm: true }),/Choose/); assert.equal(await fs.readFile(path.join(root,'target','a'),'utf8'),'old');
  const result = await call('apply',{ token: plan.token,confirm: true,resolutions: { a: 'source' } }); assert.equal(result.copied,1); assert.equal(await fs.readFile(path.join(root,'target','a'),'utf8'),'new'); assert.equal(await fs.readFile(path.join(root,result.historyFolder,'target','a'),'utf8'),'old');
  plan = await call('plan',{ source: 'source',target: 'target' }); await fs.writeFile(path.join(root,'source','a'),'changed-after-preview');
  await assert.rejects(call('apply',{ token: plan.token,confirm: true }),/changed after/); assert.equal(await fs.readFile(path.join(root,'target','a'),'utf8'),'new');
});
test('mirror removal requires separate approval and two-way additions work in both directions',async t => {
  const { root,call } = await fixture(t); await call('putFile',{ path: 'source/left',content: 'left' }); await call('putFile',{ path: 'target/right',content: 'right' });
  const two = await call('plan',{ source: 'source',target: 'target',mode: 'twoWay' }); assert.equal(two.operations.length,2); await call('apply',{ token: two.token,confirm: true });
  assert.equal(await fs.readFile(path.join(root,'source','right'),'utf8'),'right'); assert.equal(await fs.readFile(path.join(root,'target','left'),'utf8'),'left');
  await fs.unlink(path.join(root,'source','right')); const mirror = await call('plan',{ source: 'source',target: 'target',mode: 'mirror' }); assert.equal(mirror.operations.filter(op => op.type === 'delete').length,1);
  await assert.rejects(call('apply',{ token: mirror.token,confirm: true }),/own explicit/);
  const result = await call('apply',{ token: mirror.token,confirm: true,allowDelete: true }); assert.equal(result.removed,1); await assert.rejects(fs.stat(path.join(root,'target','right')),/ENOENT/); assert.equal(await fs.readFile(path.join(root,result.historyFolder,'target','right'),'utf8'),'right');
});
test('nested, traversal, symbolic-link and file/directory conflicts are rejected without destructive writes',async t => {
  const { root,call } = await fixture(t); await call('putFile',{ path: 'source/item',content: 'file' }); await fs.mkdir(path.join(root,'target','item'),{ recursive: true });
  await assert.rejects(call('plan',{ source: 'source',target: 'source/nested' }),/separate/);
  await assert.rejects(call('plan',{ source: '../escape',target: 'target' }),/Unsafe|workspace/);
  await assert.rejects(call('plan',{ source: 'source',target: 'target' }),/file on one side/);
  try { await fs.symlink(path.join(root,'source'),path.join(root,'linked'),'junction'); } catch (error) { if (error.code === 'EPERM') return; throw error; }
  await assert.rejects(call('plan',{ source: 'linked',target: 'target' }),/Symbolic/);
});
test('prototype-like filenames remain actual files and survive synchronization and baseline persistence',async t => {
  const { root,call } = await fixture(t);
  for (const name of ['__proto__','constructor','toString']) await call('putFile',{ path: `source/${name}`,content: name });
  const plan = await call('plan',{ source: 'source',target: 'target' }); assert.equal(plan.operations.length,3);
  await call('apply',{ token: plan.token,confirm: true });
  for (const name of ['__proto__','constructor','toString']) assert.equal(await fs.readFile(path.join(root,'target',name),'utf8'),name);
  const second = await call('plan',{ source: 'source',target: 'target' }); assert.equal(second.unchangedFiles,3);
});
