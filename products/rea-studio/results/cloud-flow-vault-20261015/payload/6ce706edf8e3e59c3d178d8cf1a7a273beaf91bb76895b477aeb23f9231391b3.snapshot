import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createWorkspace,createStore } from '../../lib/storage.mjs';
import { handleNative,disposeNative,nativeLimits } from './native.mjs';
import { compileFilters } from './native-filters.mjs';
import { handle } from './server.mjs';
const stamp = new Date('2026-10-01T00:00:00Z');
async function fixture(t,values = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'rea-rclone-safety-')), workspace = await createWorkspace(path.join(root,'workspace')), store = await createStore(path.join(root,'records'));
  t.after(async () => { disposeNative(workspace); if (path.dirname(path.resolve(root)) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('rea-rclone-safety-')) throw Error('Unsafe fixture cleanup.'); await fs.rm(root,{recursive:true,force:true}); });
  await fs.mkdir(workspace.resolve('source')); await fs.mkdir(workspace.resolve('target'));
  const put = async (name,value) => { const filename = workspace.resolve(name); await fs.mkdir(path.dirname(filename),{recursive:true}); await fs.writeFile(filename,value); await fs.utimes(filename,stamp,stamp); };
  for (const [name,value] of Object.entries(values)) await put(name,value);
  const api = (action,input) => handleNative({workspace,store,action,input});
  return {root,workspace,store,put,api,plan:input => api('rclone-plan',{source:'source',target:'target',...input}),apply:input => api('rclone-apply',input),read:name => fs.readFile(workspace.resolve(name),'utf8')};
}
test('preview and missing confirmations leave target bytes unchanged; reviewed source replacement retains exact old bytes',async t => {
  const f = await fixture(t,{'source/a.txt':'source','target/a.txt':'target'}), plan = await f.plan({comparison:{checksum:true}});
  assert.equal(await f.read('target/a.txt'),'target');
  await assert.rejects(f.apply({token:plan.token}),/explicit confirmation/); assert.equal(await f.read('target/a.txt'),'target');
  const result = await f.apply({token:plan.token,confirm:true}); assert.equal(await f.read('target/a.txt'),'source'); assert.equal(await f.read(result.historyFolder+'/previous/a.txt'),'target');
  const manifest = JSON.parse(await f.read(result.historyFolder+'/manifest.json')); assert.equal(manifest.operations[0].previous.sha256,plan.operations[0].previous.sha256);
  assert.deepEqual(await f.store.get('sync.native.lastResult'),result); await assert.rejects(f.apply({token:plan.token,confirm:true}),/missing or expired/);
});
test('sync removal needs separate approval, preserves previous bytes and excluded target files',async t => {
  const f = await fixture(t,{'source/a.txt':'keep','target/extra.txt':'remove','target/private/keep.txt':'protected'}), plan = await f.plan({mode:'sync',filters:{exclude:['/private/**']}});
  await assert.rejects(f.apply({token:plan.token,confirm:true}),/own explicit confirmation/); assert.equal(await f.read('target/extra.txt'),'remove');
  const result = await f.apply({token:plan.token,confirm:true,allowDelete:true}); assert.equal(result.removed,1); assert.equal(await f.read('target/private/keep.txt'),'protected'); assert.equal(await f.read(result.historyFolder+'/previous/extra.txt'),'remove');
  await assert.rejects(fs.stat(f.workspace.resolve('target/extra.txt')),{code:'ENOENT'});
});
for (const [name,modify] of [
  ['selected source byte change',async f => f.put('source/a.txt','changed')],
  ['selected target byte change',async f => f.put('target/a.txt','changed')],
  ['excluded target byte change',async f => f.put('target/private/a.txt','changed')],
  ['source timestamp-only change',async f => fs.utimes(f.workspace.resolve('source/a.txt'),stamp,new Date(stamp.getTime()+1000))],
  ['new empty directory',async f => fs.mkdir(f.workspace.resolve('target/new-empty'))],
  ['new target file',async f => f.put('target/new.txt','new')],
]) test(`stale plan rejects ${name} before source replacement`,async t => {
  const f = await fixture(t,{'source/a.txt':'source','target/a.txt':'target','target/private/a.txt':'excluded'}), plan = await f.plan({comparison:{checksum:true},filters:{exclude:['/private/**']}});
  await modify(f); const target = await f.read('target/a.txt'); await assert.rejects(f.apply({token:plan.token,confirm:true}),/Folders changed/); assert.equal(await f.read('target/a.txt'),target); assert.equal(await f.store.get('sync.native.lastResult'),null);
});
test('default size/time comparison reports skipped unequal bytes and checksum resolves them',async t => {
  const f = await fixture(t,{'source/a.txt':'left','target/a.txt':'rite'}), first = await f.plan(); assert.equal(first.operations.length,0); assert.equal(first.skipped[0].byteHashesEqual,false);
  const second = await f.plan({comparison:{checksum:true}}); await f.apply({token:second.token,confirm:true}); assert.equal(await f.read('target/a.txt'),'left');
});
test('same-content different-time operation only updates timestamp, keeps inode and persists separate result',async t => {
  const f = await fixture(t,{'source/a.txt':'same','target/a.txt':'same'}); await fs.utimes(f.workspace.resolve('source/a.txt'),stamp,new Date(stamp.getTime()+5000));
  const before = await fs.stat(f.workspace.resolve('target/a.txt'),{bigint:true}), plan = await f.plan(), result = await f.apply({token:plan.token,confirm:true}), after = await fs.stat(f.workspace.resolve('target/a.txt'),{bigint:true});
  assert.equal(after.ino,before.ino); assert.equal(after.mtimeNs,(await fs.stat(f.workspace.resolve('source/a.txt'),{bigint:true})).mtimeNs); assert.equal(result.copied,0); assert.equal(result.timestampsUpdated,1); assert.equal(result.historyFolder,null);
});
test('workspace plan token cannot be applied by another workspace and native disposal invalidates it',async t => {
  const a = await fixture(t,{'source/a.txt':'a'}), b = await fixture(t,{'source/a.txt':'b'}), plan = await a.plan();
  await assert.rejects(b.apply({token:plan.token,confirm:true}),/missing or expired/); disposeNative(a.workspace); await assert.rejects(a.apply({token:plan.token,confirm:true}),/missing or expired/);
});
test('caller mutation of preview arrays, metadata, comparison and original input cannot rewrite token-bound private operations',async t => {
  const f = await fixture(t,{'source/a.txt':'source','source/other.txt':'other','target/a.txt':'target','target/other.txt':'other'}), filters = {exclude:['other.txt']}, input = {filters,comparison:{checksum:true}};
  const pending = f.plan(input); filters.exclude[0] = 'a.txt'; input.comparison.checksum = false;
  const plan = await pending; assert.equal(plan.operations.length,1); assert.equal(plan.operations[0].path,'a.txt');
  plan.operations[0].path = 'other.txt'; plan.operations[0].source.sha256 = '0'.repeat(64); plan.operations[0].source.mtimeNs = '0'; plan.operations[0].previous.size = 0;
  plan.operations.push({type:'delete',path:'other.txt'}); plan.skipped.push({path:'a.txt'}); plan.comparison.checksum = false; plan.filters.fileRules.splice(0);
  const result = await f.apply({token:plan.token,confirm:true}); assert.equal(result.copied,1); assert.equal(result.removed,0); assert.equal(await f.read('target/a.txt'),'source'); assert.equal(await f.read('target/other.txt'),'other'); assert.equal(await f.read(result.historyFolder+'/previous/a.txt'),'target');
});
test('volatile cache evicts oldest previews and request-time expiry rejects tokens and releases metadata',async t => {
  const f = await fixture(t), first = await f.plan(); let latest;
  for (let i = 0; i < nativeLimits.plans; i++) latest = await f.plan();
  const status = await f.api('rclone-status'); assert.equal(status.globalPlanCache.plans,nativeLimits.plans); assert.ok(status.globalPlanCache.serializedMetadataBytes > 0 && status.globalPlanCache.serializedMetadataBytes <= nativeLimits.planMetadataTotal);
  await assert.rejects(f.apply({token:first.token,confirm:true}),/missing or expired/);
  const now = Date.now; Date.now = () => now()+31*60000;
  try { await assert.rejects(f.apply({token:latest.token,confirm:true}),/missing or expired/); const expired = await f.api('rclone-status'); assert.equal(expired.globalPlanCache.plans,0); assert.equal(expired.globalPlanCache.serializedMetadataBytes,0); } finally { Date.now = now; }
});
test('status-store failure reports completed filesystem work and keeps recovery bytes instead of implying rollback',async t => {
  const f = await fixture(t,{'source/a.txt':'source','target/a.txt':'target'}), plan = await f.plan({comparison:{checksum:true}});
  const store = {...f.store,set:async () => { throw new Error('Synthetic status storage failure.'); }};
  await assert.rejects(handleNative({workspace:f.workspace,store,action:'rclone-apply',input:{token:plan.token,confirm:true}}),/filesystem operations completed: 1 copies.*Status could not be saved/);
  assert.equal(await f.read('target/a.txt'),'source'); assert.equal(await f.read(`.rea-sync-history/${plan.token}/previous/a.txt`),'target'); await assert.rejects(f.apply({token:plan.token,confirm:true}),/missing or expired/);
});
test('unsafe complete direct input is rejected before cloning, evaluating accessors/proxy traps or writing files',async t => {
  const f = await fixture(t,{'source/a.txt':'source','target/a.txt':'target'}), cycle = {}; cycle.self = cycle;
  let getters = 0, traps = 0, clones = 0;
  const accessor = {}; Object.defineProperty(accessor,'source',{enumerable:true,get() { getters++; return 'source'; }});
  const proxy = new Proxy({source:'source',target:'target'},{ownKeys() { traps++; return ['source','target']; },getPrototypeOf() { traps++; return Object.prototype; }});
  const bad = [accessor,proxy,{source:'source',target:'target',unknown:'x'.repeat(1024*1024)},{source:'source',target:'target',filters:cycle},{source:'source',target:'target',filters:{filterFrom:['x'.repeat(128*1024+1)]}}, {source:'source',target:'target',filters:new Date()}];
  const original = structuredClone; globalThis.structuredClone = (...args) => { clones++; return original(...args); };
  try { for (const input of bad) for (const fn of [handleNative,handle]) await assert.rejects(fn({workspace:f.workspace,store:f.store,action:'rclone-plan',input}),/bounded plain data/); }
  finally { globalThis.structuredClone = original; }
  assert.equal(clones,0); assert.equal(getters,0); assert.equal(traps,0); assert.equal(await f.read('target/a.txt'),'target'); assert.equal(await f.store.get('sync.native.lastResult'),null);
});
test('sync removes empty target-only directories while retaining excluded descendants',async t => {
  const f = await fixture(t); await fs.mkdir(f.workspace.resolve('target/old/deep'),{recursive:true}); await fs.mkdir(f.workspace.resolve('target/protected/deep'),{recursive:true});
  const plan = await f.plan({mode:'sync',filters:{exclude:['/protected/**']}}); const result = await f.apply({token:plan.token,confirm:true,allowDelete:true}); assert.equal(result.directoriesRemoved,2);
  await assert.rejects(fs.stat(f.workspace.resolve('target/old')),{code:'ENOENT'}); assert.equal((await fs.stat(f.workspace.resolve('target/protected/deep'))).isDirectory(),true);
});
for (const [source,target] of [['source','source/inside'],['source','SOURCE'],['../source','target'],['source','.rea-backup/target'],['source','.REA-SYNC-HISTORY/target'],['source','target:stream'],['source','nul'],['source','target.']]) test(`unsafe paths rejected: ${source} → ${target}`,async t => {
  const f = await fixture(t); await assert.rejects(f.plan({source,target}),/Unsafe|separate|outside|relative/);
});
test('different file/directory types fail before target writes',async t => {
  const f = await fixture(t,{'source/item':'file','target/item/child':'child'}); await assert.rejects(f.plan(),/file on one side/); assert.equal(await f.read('target/item/child'),'child');
});
test('bounded unsupported filters are rejected without filesystem mutation',async t => {
  const f = await fixture(t,{'source/a.txt':'source','target/a.txt':'target'});
  for (const filters of [{filter:['bad']},{include:['{{(a+)+$}}']},{include:['*'.repeat(2049)]},{include:Array(257).fill('*.txt')},{filesFrom:['a.txt'],minSize:1},{excludeIfPresent:'.ignore'}]) await assert.rejects(f.plan({filters}));
  assert.equal(await f.read('target/a.txt'),'target');
});
test('glob matching and brace compilation enforce finite work budgets',() => {
  const filter = compileFilters({include:['*a*a*a*a*a*a*b']}); assert.throws(() => filter.includeFile('a'.repeat(2048),1,{remaining:10}),/work budget/);
  assert.throws(() => compileFilters({include:['{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}']}),/alternatives|expansion/);
});
test('oversize sparse file is refused before reading or creating target output',async t => {
  const f = await fixture(t), file = await fs.open(f.workspace.resolve('source/too-large'),'wx'); try { await file.truncate(nativeLimits.file+1); } finally { await file.close(); }
  await assert.rejects(f.plan(),/file or total byte limits/); assert.deepEqual(await fs.readdir(f.workspace.resolve('target')),[]);
});
