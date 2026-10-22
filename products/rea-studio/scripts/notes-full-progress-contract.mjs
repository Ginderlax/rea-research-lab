// Closed metadata projection for a separately admitted future hosted campaign.
// This module never imports a product, executes a test, or serializes an event.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export const identity=b=>({bytes:b.length,sha256:sha(b)});
export const MAX_PROGRESS_BYTES=512*1024,MAX_ROWS=900,MAX_ROW_BYTES=2048;
export const sourcePaths=['products/rea-studio/scripts/notes-full-progress-contract.mjs','products/rea-studio/scripts/notes-full-progress-reporter.mjs','products/rea-studio/scripts/export-safe-notes-full-progress.mjs','products/rea-studio/scripts/verify-cloud-current-installed.mjs'];
export function ordinary(p,max=4*1024*1024){
  let at=path.parse(p).root;for(const part of p.slice(at.length).split(path.sep).filter(Boolean)){at=path.join(at,part);const s=fs.lstatSync(at,{bigint:true});assert(!s.isSymbolicLink());if(at!==p)assert(s.isDirectory());}
  const before=fs.lstatSync(p,{bigint:true});assert(before.isFile()&&before.nlink===1n&&before.size<=BigInt(max));assert.equal(fs.realpathSync(p).toLowerCase(),p.toLowerCase());
  const fd=fs.openSync(p,'r');try{const opened=fs.fstatSync(fd,{bigint:true});for(const k of['dev','ino','size','mtimeNs','ctimeNs'])assert.equal(opened[k],before[k]);const buffer=Buffer.alloc(Number(before.size)+1);let offset=0;while(offset<buffer.length){const n=fs.readSync(fd,buffer,offset,buffer.length-offset,null);if(n===0)break;offset+=n;}const closed=fs.fstatSync(fd,{bigint:true}),after=fs.lstatSync(p,{bigint:true});for(const k of['dev','ino','size','mtimeNs','ctimeNs']){assert.equal(opened[k],closed[k]);assert.equal(before[k],after[k]);}assert.equal(BigInt(offset),before.size);return buffer.subarray(0,offset);}finally{fs.closeSync(fd);}
}
export function admit(){
  assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.version,'v24.16.0');
  for(const[k,v]of Object.entries({CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab',GITHUB_EVENT_NAME:'push',GITHUB_JOB:'full-current-installed',REA_NOTES_ORDER_ROLE:'full'}))assert.equal(process.env[k],v);
  for(const key of['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT'])assert(/^[1-9][0-9]*$/.test(process.env[key]));for(const key of['GITHUB_SHA','REA_NOTES_ORDER_PARENT'])assert(/^[0-9a-f]{40}$/.test(process.env[key]));assert(/^[0-9a-f]{64}$/.test(process.env.REA_NOTES_ORDER_MANIFEST_SHA256));
  const studio=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),repository=path.resolve(studio,'../..'),manifestBytes=ordinary(path.join(studio,'experiments/notes-open-todos-first-20261021/CAMPAIGN.json')),manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(manifestBytes));
  assert.equal(sha(manifestBytes),process.env.REA_NOTES_ORDER_MANIFEST_SHA256);assert.equal(manifest.schema,'rea-notes-order-hosted-campaign/v1');assert.equal(manifest.parent,process.env.REA_NOTES_ORDER_PARENT);assert.equal(manifest.branch,process.env.GITHUB_REF);for(const k of['executionAuthorized','sourceClosureReviewed','fullCurrentRosterReviewed'])assert.equal(manifest[k],true);
  assert.deepEqual(manifest.fullProgressDiagnostics,{schema:'rea-notes-full-progress-admission/v1',implemented:true,sourcePaths,selectedModules:184,progressBytes:MAX_PROGRESS_BYTES,maximumRows:MAX_ROWS,rawTAPUnchanged:true,singleNodeTestProcess:true,timeoutMilliseconds:2400000});
  for(const p of sourcePaths){const row=manifest.sourceRows.find(r=>r.path===p);assert(row&&row.rawMode==='100644');const b=ordinary(path.join(repository,p));if(row.admission==='changed-sha256')assert.deepEqual(identity(b),{bytes:row.bytes,sha256:row.sha256});else{assert.equal(row.admission,'inherited-parent-gitblob');assert(/^[0-9a-f]{40}$/.test(row.gitBlob));assert.equal(createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex'),row.gitBlob);}}
  assert.equal(manifest.currentActiveTestFiles.length,184);const paths=manifest.currentActiveTestFiles.map(r=>r.path);assert.equal(new Set(paths).size,184);assert(paths.every(p=>/^products\/rea-studio\/(?:apps|lib|public|scripts|tests)\/[A-Za-z0-9._/-]+\.test\.mjs$/.test(p)&&!p.split('/').includes('..')));paths.sort((a,b)=>a<b?-1:a>b?1:0);
  const roster=paths.map((repositoryPath,i)=>({moduleID:'m'+String(i+1).padStart(3,'0'),repositoryPath})),rosterSHA256=sha(Buffer.from(JSON.stringify(roster)));
  const temporary=fs.realpathSync(process.env.RUNNER_TEMP),raw=path.join(temporary,'rea-notes-order-full-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT),suite=path.join(raw,'full-suite');
  for(const p of[temporary,raw,suite]){const s=fs.lstatSync(p);assert(s.isDirectory()&&!s.isSymbolicLink());assert.equal(fs.realpathSync(p).toLowerCase(),p.toLowerCase());}assert.equal(path.dirname(raw),temporary);assert.equal(path.dirname(suite),raw);
  const subject={source:process.env.GITHUB_SHA,parent:manifest.parent,runID:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,manifestSHA256:sha(manifestBytes),rosterSHA256};
  return{studio,repository,temporary,raw,suite,manifest,roster,subject};
}
const codes=['REPORTER_OPEN','MODULE_OBSERVED','MODULE_SUMMARY','HEARTBEAT','RUN_SUMMARY','REPORTER_END','REPORTER_ERROR'];
const counters=['dequeued','completed','reportedPass','reportedFail','skipSignals','todoSignals','unknownFiles'];
const resultCounters=['cancelled','failed','passed','skipped','suites','tests','todo','topLevel'];
export function validateRow(row,subject,previous=null){
  assert.deepEqual(Object.keys(row).sort(),['schema',...Object.keys(subject),'sequence','elapsedMs','code','moduleID','lastDequeuedModuleID','observedModules','moduleSummaries','counters','summary'].sort());
  assert.equal(row.schema,'rea-notes-full-module-progress/v1');for(const[k,v]of Object.entries(subject))assert.equal(row[k],v);
  assert(Number.isSafeInteger(row.sequence)&&row.sequence>=1&&row.sequence<=MAX_ROWS);assert(Number.isSafeInteger(row.elapsedMs)&&row.elapsedMs>=0&&row.elapsedMs<=2*60*60*1000);assert(codes.includes(row.code));
  for(const k of['moduleID','lastDequeuedModuleID'])assert(row[k]===null||/^m(?:00[1-9]|0[1-9][0-9]|1[0-7][0-9]|18[0-4])$/.test(row[k]));
  for(const k of['observedModules','moduleSummaries'])assert(Number.isSafeInteger(row[k])&&row[k]>=0&&row[k]<=184);
  assert.deepEqual(Object.keys(row.counters).sort(),[...counters].sort());for(const k of counters)assert(Number.isSafeInteger(row.counters[k])&&row.counters[k]>=0&&row.counters[k]<=1000000);
  if(row.summary!==null){assert(['MODULE_SUMMARY','RUN_SUMMARY'].includes(row.code));assert.deepEqual(Object.keys(row.summary).sort(),['success','durationMs','counts'].sort());assert.equal(typeof row.summary.success,'boolean');assert(Number.isSafeInteger(row.summary.durationMs)&&row.summary.durationMs>=0&&row.summary.durationMs<=2*60*60*1000);assert.deepEqual(Object.keys(row.summary.counts).sort(),[...resultCounters].sort());for(const k of resultCounters)assert(Number.isSafeInteger(row.summary.counts[k])&&row.summary.counts[k]>=0&&row.summary.counts[k]<=1000000);}else assert(!['MODULE_SUMMARY','RUN_SUMMARY'].includes(row.code));
  if(previous){assert.equal(row.sequence,previous.sequence+1);assert(row.elapsedMs>=previous.elapsedMs);assert(row.observedModules>=previous.observedModules&&row.moduleSummaries>=previous.moduleSummaries);for(const k of counters)assert(row.counters[k]>=previous.counters[k]);}else{assert.equal(row.sequence,1);assert.equal(row.code,'REPORTER_OPEN');}
  assert(Buffer.byteLength(JSON.stringify(row)+'\n')<=MAX_ROW_BYTES);return row;
}
export function projector(context,emit,clock=()=>performance.now()){
  const map=new Map(context.roster.map(r=>[path.resolve(context.repository,r.repositoryPath).toLowerCase(),r.moduleID])),seen=new Set(),summaries=new Set(),started=clock();
  let sequence=0,last=null,lastDequeued=null,previous=null;const count=Object.fromEntries(counters.map(k=>[k,0]));
  function write(code,moduleID=last,summary=null){const row={schema:'rea-notes-full-module-progress/v1',...context.subject,sequence:++sequence,elapsedMs:Math.floor(clock()-started),code,moduleID,lastDequeuedModuleID:lastDequeued,observedModules:seen.size,moduleSummaries:summaries.size,counters:{...count},summary};validateRow(row,context.subject,previous);emit(row);previous=row;return row;}
  function summary(data){assert.equal(typeof data.success,'boolean');const values={};for(const k of resultCounters){const n=data.counts?.[k];assert(Number.isSafeInteger(n)&&n>=0&&n<=1000000);values[k]=n;}assert(Number.isFinite(data.duration_ms)&&data.duration_ms>=0&&data.duration_ms<=2*60*60*1000);return{success:data.success,durationMs:Math.floor(data.duration_ms),counts:values};}
  return{open:()=>write('REPORTER_OPEN',null),heartbeat:()=>write('HEARTBEAT'),end:()=>write('REPORTER_END'),error:()=>write('REPORTER_ERROR'),accept(event){
    // Never read event names, messages, errors, details or arbitrary nested data.
    if(!event||typeof event.type!=='string'||!event.data||typeof event.data!=='object')return;
    const type=event.type,data=event.data;if(!['test:dequeue','test:complete','test:pass','test:fail','test:stdout','test:stderr','test:summary'].includes(type))return;
    const moduleID=typeof data.file==='string'?map.get(path.resolve(context.studio,data.file).toLowerCase()):null;
    if(!moduleID){if(type==='test:summary'&&data.file===undefined)write('RUN_SUMMARY',null,summary(data));else count.unknownFiles++;return;}
    last=moduleID;if(type==='test:dequeue'){count.dequeued++;lastDequeued=moduleID;}
    if(!seen.has(moduleID)){seen.add(moduleID);write('MODULE_OBSERVED',moduleID);}
    if(type==='test:complete')count.completed++;if(type==='test:pass')count.reportedPass++;if(type==='test:fail')count.reportedFail++;if(data.skip!==undefined)count.skipSignals++;if(data.todo!==undefined)count.todoSignals++;
    if(type==='test:summary'){assert(!summaries.has(moduleID));summaries.add(moduleID);write('MODULE_SUMMARY',moduleID,summary(data));}
  }};
}
