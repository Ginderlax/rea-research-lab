import * as fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createWorkspace,createStore } from '../../../lib/storage.mjs';
import { handleNative,disposeNative } from '../native.mjs';
import { createRecordedOracle,digest,comparisonFlags,hosted } from './download-oracle.mjs';
// Fresh hosted regression adapter. Historical corpus, decisions and receipts remain unchanged.
hosted();
const temporary=await fs.realpath(process.env.RUNNER_TEMP),evidenceParent=await fs.realpath(process.env.REA_SYNC_ORIGINAL_EVIDENCE);
const relative=path.relative(temporary,evidenceParent);assert(relative!==''&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative));
for(let at=evidenceParent;;at=path.dirname(at)){assert(!(await fs.lstat(at)).isSymbolicLink());if(path.dirname(at)===at)break;}
const evidence=path.join(evidenceParent,'regression-local-transfers');await fs.mkdir(evidence);
const root=await fs.mkdtemp(path.join(temporary,'rea-sync-local-transfers-')),base=1800000000000,records=[],failures=[];
let oracle,finished=false,summaryWritten=false,primaryError;
const summary={schema:'rea-sync-preserved-local-transfers/v1',status:'running',historicalSourceCommit:'beab1f3668cf652e7663f3fd7216ac607506ac06',historicalSource:'scripts/verify-transfers.mjs',allFixturesSynthetic:true,records,failures,fullProductComplete:false,universalSuperiorityEstablished:false};
async function saveSummary(){const file=path.join(evidence,'summary.json'),next=summaryWritten?file+'.tmp':file;await fs.writeFile(next,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});if(summaryWritten)await fs.rename(next,file);summaryWritten=true;}
async function cleanup(){const errors=[];if(oracle&&!finished)try{await oracle.finish('failed');}catch(e){errors.push(e);}try{assert(!(await fs.lstat(root)).isSymbolicLink());assert.equal(await fs.realpath(root),root);assert.equal(path.dirname(root),temporary);assert(path.basename(root).startsWith('rea-sync-local-transfers-'));await fs.rm(root,{recursive:true,force:true});}catch(e){errors.push(e);}if(errors.length){summary.status='failed';summary.cleanupErrors=errors.map(e=>e.message);try{await saveSummary();}catch(e){summary.cleanupErrors.push(e.message);}if(primaryError)primaryError.cleanupErrors=summary.cleanupErrors;else throw new AggregateError(errors,'Regression cleanup or evidence finalization failed');}}
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
  async function walk(prefix) { for (const child of (await fs.readdir(path.join(folder,prefix),{withFileTypes:true})).sort((a,b) => a.name<b.name?-1:a.name>b.name?1:0)) { const name = prefix ? prefix+'/'+child.name:child.name; if (child.isDirectory()) { result.directories.push(name); await walk(name); } else { const file = path.join(folder,name), bytes = await fs.readFile(file), stat = await fs.stat(file,{bigint:true}); result.files[name] = {sha256:digest(bytes),mtimeNs:stat.mtimeNs.toString()}; } } }
  await walk(''); result.directories.sort(); return result;
}
async function filterFlags(root,index,filters = {}) {
  const flags = []; for (const [key,flag] of [['include','include'],['exclude','exclude'],['filter','filter'],['filesFrom','files-from']]) for (const [offset,value] of (filters[key] ?? []).entries()) { let item = value; if (key === 'filesFrom') { item = path.join(root,`${index}-list-${offset}.txt`); await fs.writeFile(item,value,{flag:'wx'});(summary.filterInputs??=[]).push({caseID:'local-transfer-'+index,key,offset,file:path.basename(item),...await oracle.retainBytes(Buffer.from(value))}); } flags.push('--'+flag,item); }
  for (const [key,flag] of [['minSize','min-size'],['maxSize','max-size']]) if (filters[key] !== undefined) flags.push('--'+flag,filters[key]+'B'); return flags;
}
try {
  await saveSummary();oracle=await createRecordedOracle(root,{evidence});
  Object.assign(summary,{sourceCommit:oracle.sourceCommit,version:oracle.version,originalSHA256:oracle.originalSHA256,zipSHA256:oracle.zipSHA256,cases:cases.length,inputCorpusSHA256:digest(Buffer.from(JSON.stringify({files,targetFiles,cases}))),moduleHashes:Object.fromEntries(await Promise.all(['native.mjs','native-filters.mjs','native-comparison.mjs'].map(async name=>[name,digest(await fs.readFile(new URL('../'+name,import.meta.url)))])))});
  for (let index = 0; index < cases.length; index++) {
    const input = cases[index], folder = path.join(root,String(index)), nativeRoot = path.join(folder,'native'), originalRoot = path.join(folder,'original');
    for (const location of [nativeRoot,originalRoot]) {
      await seed(path.join(location,'source'),input.emptySource ? {}:files,input.emptySource ? []:['source-empty','dir/source-empty']);
      if (!input.targetMissing) await seed(path.join(location,'target'),targetFiles,['target-empty','old/child','dir/private/empty']);
    }
    const caseID='local-transfer-'+index,sourceBefore={};
    for(const [kind,location]of [['native',nativeRoot],['original',originalRoot]])for(const part of ['source','target']){const retained=await oracle.snapshot(path.join(location,part),{caseID,phase:kind+'-'+part+'-before'});if(part==='source')sourceBefore[kind]=retained;}
    const workspace = await createWorkspace(nativeRoot), store = await createStore(path.join(folder,'records'));
    const nativeInput = {source:'source',target:'target',mode:input.mode,comparison:input.comparison,filters:input.filters,createEmptySrcDirs:input.createEmptySrcDirs};
    let nativePlan,nativeResult,originalResult,passed = false,error;
    try {
      const beforeNative = await tree(path.join(nativeRoot,'target')), beforeOriginal = await tree(path.join(originalRoot,'target'));
      nativePlan = await handleNative({workspace,store,action:'rclone-plan',input:nativeInput});
      assert.deepEqual(await tree(path.join(nativeRoot,'target')),beforeNative,'Native preview changed files.');
      const args = [input.mode,path.join(originalRoot,'source'),path.join(originalRoot,'target'),...comparisonFlags(input.comparison ?? {}),...await filterFlags(root,index,input.filters)];
      if (input.createEmptySrcDirs) args.push('--create-empty-src-dirs');
      const dryRun = await oracle.run([...args,'--dry-run'],{caseID:caseID+'-dry-run'}); assert.deepEqual(await tree(path.join(originalRoot,'target')),beforeOriginal,'Original dry run changed target.');
      await oracle.snapshot(path.join(originalRoot,'target'),{caseID,phase:'original-target-after-dry-run'});
      originalResult = await oracle.run(args,{caseID:caseID+'-apply'});
      nativeResult = await handleNative({workspace,store,action:'rclone-apply',input:{token:nativePlan.token,confirm:true,allowDelete:true}});
      const nativeTree = await tree(path.join(nativeRoot,'target')), originalTree = await tree(path.join(originalRoot,'target'));
      assert.deepEqual(nativeTree,originalTree,'Applied local output differs from pinned original.');
      assert.deepEqual(await store.get('sync.native.lastResult'),nativeResult,'Result persistence differs.');
      records.push({caseID,index,input,passed:true,plan:nativePlan,result:nativeResult,output:nativeTree,originalDryRunLogSHA256:digest(dryRun.stderr),originalApplyLogSHA256:digest(originalResult.stderr)}); passed = true;
    } catch (caught) { error = caught.message; const record = {caseID,index,input,passed:false,error,nativePlan,nativeResult,originalStderr:originalResult?.stderr,nativeTree:await tree(path.join(nativeRoot,'target')),originalTree:await tree(path.join(originalRoot,'target'))}; records.push(record); failures.push(record);await saveSummary(); }
    finally { const errors=[];try{disposeNative(workspace);}catch(e){errors.push(e);}for(const [kind,location]of [['native',nativeRoot],['original',originalRoot]])for(const part of ['source','target'])try{const retained=await oracle.snapshot(path.join(location,part),{caseID,phase:kind+'-'+part+'-after'});if(part==='source'){assert.equal(retained.exists,sourceBefore[kind].exists,kind+' transfer changed source existence');assert.deepEqual(retained.files,sourceBefore[kind].files,kind+' transfer changed source bytes or modification times');assert.deepEqual(retained.directories,sourceBefore[kind].directories,kind+' transfer changed source directories');}}catch(e){errors.push(e);}if(errors.length)throw new AggregateError(errors,'Transfer state retention or disposal failed: '+caseID+(error?' (comparison failure: '+error+')':'')); }
    summary.originalCLIExecutions=oracle.executions;await saveSummary();console.log(JSON.stringify({index,passed,error}));
  }
  summary.status=failures.length?'failed':'passed';summary.completedAtUtc=new Date().toISOString();await saveSummary();await oracle.finish(summary.status);finished=true;
  if (failures.length) process.exitCode = 1;
} catch(error) {
  primaryError=error;summary.status='failed';summary.error={message:error.message};try{await saveSummary();}catch(e){error.summaryWriteError=e.message;}throw error;
} finally {
  await cleanup();
}
