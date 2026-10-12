import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createWorkspace,createStore } from '../../../lib/storage.mjs';
import { handleNative,disposeNative } from '../native.mjs';
import { createOracle,digest,comparisonFlags } from './oracle.mjs';
const root = await fs.mkdtemp(path.join(os.tmpdir(),'rea-rclone-transfers-')), base = 1800000000000, records = [], failures = [];
const files = { 'same.txt':['same',0], 'same-time-different.txt':['left',0], 'older.txt':['fresh',5000], 'metadata.txt':['same bytes',5000], 'new.txt':['new',0], 'dir/sub/data.bin':['bytes',0], 'dir/private/keep.txt':['private',0] };
const targetFiles = { 'same.txt':['same',0], 'same-time-different.txt':['rite',0], 'older.txt':['older',0], 'metadata.txt':['same bytes',0], 'extra.txt':['extra',0], 'dir/extra.bin':['target',0], 'dir/private/extra.txt':['excluded',0] };
const cases = [
  {mode:'copy'},{mode:'sync'},{mode:'copy',comparison:{checksum:true}},{mode:'sync',comparison:{checksum:true}},
  {mode:'copy',comparison:{ignoreTimes:true}},{mode:'sync',comparison:{ignoreExisting:true}},
  {mode:'sync',comparison:{sizeOnly:true}},{mode:'sync',comparison:{update:true}},
  {mode:'sync',comparison:{noUpdateModtime:true}},{mode:'sync',comparison:{modifyWindowNs:'10000000000'}},
  {mode:'copy',createEmptySrcDirs:true},{mode:'sync',createEmptySrcDirs:true},
  {mode:'sync',filters:{exclude:['/dir/private/**']}},{mode:'sync',filters:{include:['*.txt'],exclude:['same.txt']}},
  {mode:'sync',filters:{filter:['- /dir/private/**','+ /dir/**','- **']}},
  {mode:'sync',filters:{filesFrom:['new.txt\ndir/sub/data.bin\nextra.txt\n']}},
  {mode:'sync',filters:{minSize:5,maxSize:8}},{mode:'copy',targetMissing:true},{mode:'sync',targetMissing:true},
  {mode:'copy',emptySource:true,createEmptySrcDirs:true},{mode:'sync',emptySource:true},
];
async function seed(folder,values,dirs) {
  await fs.mkdir(folder,{recursive:true});
  for (const dir of dirs) await fs.mkdir(path.join(folder,dir),{recursive:true});
  for (const [name,[content,offset]] of Object.entries(values)) { const target = path.join(folder,name); await fs.mkdir(path.dirname(target),{recursive:true}); await fs.writeFile(target,content,{flag:'wx'}); await fs.utimes(target,new Date(base),new Date(base+offset)); }
}
async function tree(folder) {
  const result = {exists:true,files:{},directories:[]};
  try { await fs.stat(folder); } catch (error) { if (error.code === 'ENOENT') return {...result,exists:false}; throw error; }
  async function walk(prefix) { for (const child of (await fs.readdir(path.join(folder,prefix),{withFileTypes:true})).sort((a,b) => a.name.localeCompare(b.name))) { const name = prefix ? prefix+'/'+child.name:child.name; if (child.isDirectory()) { result.directories.push(name); await walk(name); } else { const file = path.join(folder,name), bytes = await fs.readFile(file), stat = await fs.stat(file,{bigint:true}); result.files[name] = {sha256:digest(bytes),mtimeNs:stat.mtimeNs.toString()}; } } }
  await walk(''); result.directories.sort(); return result;
}
async function filterFlags(root,index,filters = {}) {
  const flags = []; for (const [key,flag] of [['include','include'],['exclude','exclude'],['filter','filter'],['filesFrom','files-from']]) for (const [offset,value] of (filters[key] ?? []).entries()) { let item = value; if (key === 'filesFrom') { item = path.join(root,`${index}-list-${offset}.txt`); await fs.writeFile(item,value,{flag:'wx'}); } flags.push('--'+flag,item); }
  for (const [key,flag] of [['minSize','min-size'],['maxSize','max-size']]) if (filters[key] !== undefined) flags.push('--'+flag,filters[key]+'B'); return flags;
}
try {
  const oracle = await createOracle(root);
  for (let index = 0; index < cases.length; index++) {
    const input = cases[index], folder = path.join(root,String(index)), nativeRoot = path.join(folder,'native'), originalRoot = path.join(folder,'original');
    for (const location of [nativeRoot,originalRoot]) {
      await seed(path.join(location,'source'),input.emptySource ? {}:files,input.emptySource ? []:['source-empty','dir/source-empty']);
      if (!input.targetMissing) await seed(path.join(location,'target'),targetFiles,['target-empty','old/child','dir/private/empty']);
    }
    const workspace = await createWorkspace(nativeRoot), store = await createStore(path.join(folder,'records'));
    const nativeInput = {source:'source',target:'target',mode:input.mode,comparison:input.comparison,filters:input.filters,createEmptySrcDirs:input.createEmptySrcDirs};
    let nativePlan,nativeResult,originalResult,passed = false,error;
    try {
      const beforeNative = await tree(path.join(nativeRoot,'target')), beforeOriginal = await tree(path.join(originalRoot,'target'));
      nativePlan = await handleNative({workspace,store,action:'rclone-plan',input:nativeInput});
      assert.deepEqual(await tree(path.join(nativeRoot,'target')),beforeNative,'Native preview changed files.');
      const args = [input.mode,path.join(originalRoot,'source'),path.join(originalRoot,'target'),...comparisonFlags(input.comparison ?? {}),...await filterFlags(root,index,input.filters)];
      if (input.createEmptySrcDirs) args.push('--create-empty-src-dirs');
      const dryRun = await oracle.run([...args,'--dry-run']); assert.deepEqual(await tree(path.join(originalRoot,'target')),beforeOriginal,'Original dry run changed target.');
      originalResult = await oracle.run(args);
      nativeResult = await handleNative({workspace,store,action:'rclone-apply',input:{token:nativePlan.token,confirm:true,allowDelete:true}});
      const nativeTree = await tree(path.join(nativeRoot,'target')), originalTree = await tree(path.join(originalRoot,'target'));
      assert.deepEqual(nativeTree,originalTree,'Applied local output differs from pinned original.');
      assert.deepEqual(await store.get('sync.native.lastResult'),nativeResult,'Result persistence differs.');
      records.push({index,input,passed:true,plan:nativePlan,result:nativeResult,output:nativeTree,originalDryRunLogSHA256:digest(dryRun.stderr),originalApplyLogSHA256:digest(originalResult.stderr)}); passed = true;
    } catch (caught) { error = caught.message; const record = {index,input,passed:false,error,nativePlan,nativeResult,originalStderr:originalResult?.stderr,nativeTree:await tree(path.join(nativeRoot,'target')),originalTree:await tree(path.join(originalRoot,'target'))}; records.push(record); failures.push(record); }
    finally { disposeNative(workspace); }
    console.log(JSON.stringify({index,passed,error}));
  }
  await fs.writeFile(new URL('../results/transfer-verification.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),baseline:'rclone v1.75.2',sourceCommit:oracle.sourceCommit,version:oracle.version,originalSHA256:oracle.originalSHA256,originalCLIExecutions:oracle.executions,allFixturesSynthetic:true,priorReconstructionReadOrImported:false,moduleHashes:Object.fromEntries(await Promise.all(['native.mjs','native-filters.mjs','native-comparison.mjs'].map(async name => [name,digest(await fs.readFile(new URL('../'+name,import.meta.url)))]))),records,failures,fullProductComplete:false,universalSuperiorityEstablished:false},null,2)+'\n');
  if (failures.length) process.exitCode = 1;
} finally {
  if (path.dirname(path.resolve(root)) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('rea-rclone-transfers-')) throw Error('Unsafe private-fixture cleanup target.');
  await fs.rm(root,{recursive:true,force:true});
}
