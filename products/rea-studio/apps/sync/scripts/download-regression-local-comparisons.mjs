import * as fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { compareFiles } from '../native-comparison.mjs';
import { createRecordedOracle,digest,comparisonFlags,originalJSONLogs as logs,hosted } from './download-oracle.mjs';
// Fresh hosted regression adapter. Historical corpus, decisions and receipts remain unchanged.
hosted();
const temporary=await fs.realpath(process.env.RUNNER_TEMP), evidenceParent=await fs.realpath(process.env.REA_SYNC_ORIGINAL_EVIDENCE);
const relative=path.relative(temporary,evidenceParent);assert(relative!==''&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative));
for(let at=evidenceParent;;at=path.dirname(at)){assert(!(await fs.lstat(at)).isSymbolicLink());if(path.dirname(at)===at)break;}
const evidence=path.join(evidenceParent,'regression-local-comparisons');await fs.mkdir(evidence);
const root=await fs.mkdtemp(path.join(temporary,'rea-sync-local-comparisons-')),records=[],failures=[];
let oracle,finished=false,summaryWritten=false,primaryError;
const summary={schema:'rea-sync-preserved-local-comparisons/v1',status:'running',historicalSourceCommit:'beab1f3668cf652e7663f3fd7216ac607506ac06',historicalSource:'scripts/verify-comparisons.mjs',allFixturesSynthetic:true,records,failures,fullProductComplete:false,universalSuperiorityEstablished:false};
async function saveSummary(){const file=path.join(evidence,'summary.json'),next=summaryWritten?file+'.tmp':file;await fs.writeFile(next,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});if(summaryWritten)await fs.rename(next,file);summaryWritten=true;}
async function cleanup(){const errors=[];if(oracle&&!finished)try{await oracle.finish('failed');}catch(e){errors.push(e);}try{assert(!(await fs.lstat(root)).isSymbolicLink());assert.equal(await fs.realpath(root),root);assert.equal(path.dirname(root),temporary);assert(path.basename(root).startsWith('rea-sync-local-comparisons-'));await fs.rm(root,{recursive:true,force:true});}catch(e){errors.push(e);}if(errors.length){summary.status='failed';summary.cleanupErrors=errors.map(e=>e.message);try{await saveSummary();}catch(e){summary.cleanupErrors.push(e.message);}if(primaryError)primaryError.cleanupErrors=summary.cleanupErrors;else throw new AggregateError(errors,'Regression cleanup or evidence finalization failed');}}
const base = 1800000000000;
const scenarios = [
  {name:'missing',source:'a',sourceOffset:0},
  {name:'identical',source:'a',destination:'a',sourceOffset:0,destinationOffset:0},
  {name:'same-size-time-different-bytes',source:'a',destination:'b',sourceOffset:0,destinationOffset:0},
  {name:'same-bytes-target-older',source:'a',destination:'a',sourceOffset:5000,destinationOffset:0},
  {name:'same-bytes-target-newer',source:'a',destination:'a',sourceOffset:0,destinationOffset:5000},
  {name:'different-bytes-target-older',source:'a',destination:'b',sourceOffset:5000,destinationOffset:0},
  {name:'different-bytes-target-newer',source:'a',destination:'b',sourceOffset:0,destinationOffset:5000},
  {name:'different-size-target-older',source:'aaa',destination:'b',sourceOffset:5000,destinationOffset:0},
  {name:'different-size-target-newer',source:'aaa',destination:'b',sourceOffset:0,destinationOffset:5000},
  {name:'same-bytes-at-window-boundary',source:'a',destination:'a',sourceOffset:1000,destinationOffset:0},
];
const keys = ['checksum','sizeOnly','ignoreSize','ignoreTimes','ignoreExisting','update','noUpdateModtime'];
const settings = Array.from({length:128},(_,mask) => Object.fromEntries(keys.map((key,index) => [key,Boolean(mask & (1 << index))])));
for (const options of [{},{update:true},{checksum:true},{sizeOnly:true}]) for (const modifyWindowNs of ['999999900','1000000000','1000000100']) settings.push({...options,modifyWindowNs});
async function metadata(filename) { const bytes = await fs.readFile(filename), stat = await fs.stat(filename,{bigint:true}); return {size:bytes.length,md5:createHash('md5').update(bytes).digest('hex'),mtimeNs:stat.mtimeNs.toString(),sha256:digest(bytes)}; }
try {
  await saveSummary();oracle=await createRecordedOracle(root,{evidence});
  Object.assign(summary,{sourceCommit:oracle.sourceCommit,version:oracle.version,originalSHA256:oracle.originalSHA256,zipSHA256:oracle.zipSHA256,moduleSHA256:digest(await fs.readFile(new URL('../native-comparison.mjs',import.meta.url))),settings:settings.length,scenarios:scenarios.length,inputCorpusSHA256:digest(Buffer.from(JSON.stringify({scenarios,settings})))});
  for (let index = 0; index < settings.length; index++) {
    const options = settings[index], folder = path.join(root,String(index)), source = path.join(folder,'source'), target = path.join(folder,'target');
    await fs.mkdir(source,{recursive:true}); await fs.mkdir(target,{recursive:true}); const inputs = [];
    for (const scenario of scenarios) {
      const filename = scenario.name+'.txt', sourcePath = path.join(source,filename), targetPath = path.join(target,filename);
      await fs.writeFile(sourcePath,scenario.source,{flag:'wx'}); await fs.utimes(sourcePath,new Date(base),new Date(base+scenario.sourceOffset));
      if (scenario.destination !== undefined) { await fs.writeFile(targetPath,scenario.destination,{flag:'wx'}); await fs.utimes(targetPath,new Date(base),new Date(base+scenario.destinationOffset)); }
      const a = await metadata(sourcePath), b = scenario.destination === undefined ? null:await metadata(targetPath); inputs.push({filename,source:a,destination:b,decision:compareFiles(a,b,options)});
    }
    const caseID='local-comparison-'+index;
    const sourceBefore=await oracle.snapshot(source,{caseID,phase:'source-before'});await oracle.snapshot(target,{caseID,phase:'target-before'});
    let output,originalError; try { output = await oracle.run(['copy',source,target,...comparisonFlags(options)],{caseID}); } catch (error) { originalError = String(error.stderr ?? error.message); }
    const sourceAfter=await oracle.snapshot(source,{caseID,phase:'source-after'});await oracle.snapshot(target,{caseID,phase:'target-after'});assert.deepEqual(sourceAfter.files,sourceBefore.files,'Original comparison changed source files');assert.deepEqual(sourceAfter.directories,sourceBefore.directories);
    if (originalError) { const record = {caseID,index,options,passed:false,originalError}; records.push(record); failures.push(record); }
    else {
      const messages = logs(output.stderr);
      for (const input of inputs) {
        const after = await metadata(path.join(target,input.filename)), fileLogs = messages.filter(log => log.object === input.filename), copied = fileLogs.some(log => /^Copied \(/.test(log.msg)), updated = after.mtimeNs !== input.destination?.mtimeNs;
        const originalAction = copied ? 'copy':updated ? 'updateModtime':'skip';
        const expectedSHA = input.decision.type === 'copy' ? input.source.sha256:input.destination.sha256;
        const expectedTime = ['copy','updateModtime'].includes(input.decision.type) ? input.source.mtimeNs:input.destination.mtimeNs;
        const passed = originalAction === input.decision.type && after.sha256 === expectedSHA && after.mtimeNs === expectedTime;
        const record = {caseID,index,options,filename:input.filename,input,originalAction,after,passed,fileLogs:fileLogs.map(({msg}) => msg)};
        records.push(record); if (!passed) failures.push(record);
      }
    }
    summary.originalCLIExecutions=oracle.executions;await saveSummary();console.log(JSON.stringify({index,comparisons:inputs.length,failed:failures.filter(x => x.index === index).length}));
  }
  summary.status=failures.length?'failed':'passed';summary.completedAtUtc=new Date().toISOString();await saveSummary();await oracle.finish(summary.status);finished=true;
  if (failures.length) process.exitCode = 1;
} catch(error) {
  primaryError=error;summary.status='failed';summary.error={message:error.message};try{await saveSummary();}catch(e){error.summaryWriteError=e.message;}throw error;
} finally {
  await cleanup();
}
