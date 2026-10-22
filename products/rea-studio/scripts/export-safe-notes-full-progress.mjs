// Independent diagnostics-only projection. Complete-evidence refusal stays a
// failure. No raw-tree walk, fallback upload or arbitrary child text is allowed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {admit,identity,ordinary,validateRow,MAX_PROGRESS_BYTES,MAX_ROWS} from './notes-full-progress-contract.mjs';
const decoder=()=>new TextDecoder('utf-8',{fatal:true});
const keys=(value,expected)=>assert.deepEqual(Object.keys(value).sort(),[...expected].sort());
const integer=(v,max=1000000)=>{assert(Number.isSafeInteger(v)&&v>=0&&v<=max);return v;};
const exit=v=>{assert(v===null||(Number.isSafeInteger(v)&&v>=-4294967296&&v<=4294967295));return v;};
const signals=[null,'SIGINT','SIGTERM','SIGKILL','SIGBREAK'];
const failureCodes=[null,'CAPTURE_INTERRUPTED','CAPTURE_SPAWN_ERROR','CAPTURE_STREAM_BOUND','CAPTURE_STREAM_WRITE','CAPTURE_STREAM_ERROR','CAPTURE_DEADLINE','CAPTURE_DRIVER_REFUSED'];
function ownDirectory(p){let at=path.parse(p).root;for(const part of p.slice(at.length).split(path.sep).filter(Boolean)){at=path.join(at,part);const s=fs.lstatSync(at);assert(s.isDirectory()&&!s.isSymbolicLink());}assert.equal(fs.realpathSync(p).toLowerCase(),p.toLowerCase());}
export function projectProgressBytes(input,subject){
  assert(Buffer.isBuffer(input)&&input.length<=MAX_PROGRESS_BYTES);const rows=[];let code='PROGRESS_INVALID',trailingPartialBytes=0;
  try{const last=input.lastIndexOf(10),complete=last<0?Buffer.alloc(0):input.subarray(0,last+1);trailingPartialBytes=input.length-complete.length;assert(trailingPartialBytes<=2048);const lines=decoder().decode(complete).split('\n').slice(0,-1);assert(lines.length>=1&&lines.length<=MAX_ROWS);for(const line of lines){assert(Buffer.byteLength(line)<=2048);const row=JSON.parse(line);validateRow(row,subject,rows.at(-1)??null);rows.push(row);}code=trailingPartialBytes?'PROGRESS_VALID_COMPLETE_PREFIX':'PROGRESS_VALID';}catch{rows.length=0;}
  return{rows,input:identity(input),code,trailingPartialBytes};
}
export function validateParentState(row,subject){
  keys(row,['schema',...Object.keys(subject),'processStarted','closeObserved','exitCode','signal','terminationCode','timeoutMilliseconds','TAPSummary','fullProductAcceptance']);assert.equal(row.schema,'rea-notes-full-safe-process-state/v1');for(const[k,v]of Object.entries(subject))assert.equal(row[k],v);for(const k of['processStarted','closeObserved'])assert.equal(typeof row[k],'boolean');exit(row.exitCode);assert([...signals,'OTHER_SIGNAL'].includes(row.signal));assert(['PASSED','EXECUTION_DEADLINE','RECEIVED_SIGNAL','PROCESS_FAILURE','COLLECTOR_FAILURE'].includes(row.terminationCode));assert.equal(row.timeoutMilliseconds,2400000);assert.equal(row.fullProductAcceptance,false);if(row.TAPSummary!==null){keys(row.TAPSummary,['tests','pass','fail','cancelled','skipped','todo']);for(const n of Object.values(row.TAPSummary))integer(n);}return row;
}
export function projectCaptureReceipt(row,phase,subject){
  assert(['before','bootstrap','run','after','qualify','filter'].includes(phase));keys(row,['schema','phase','role','source','parent','runID','attempt','job','status','sourceCommand','stdout','stderr','droppedBytes','closeObserved','exitCode','signal','failureCode','rawChildOutputEchoed','originalExecutionAcceptance',...(row.safeFilterProjection===undefined?[]:['safeFilterProjection'])]);assert.equal(row.schema,'rea-owned-top-level-console-capture/v1');for(const[k,v]of Object.entries({phase,role:'full',source:subject.source,parent:subject.parent,runID:subject.runID,attempt:subject.attempt,job:'full-current-installed'}))assert.equal(row[k],v);assert(['passed','failed'].includes(row.status));assert.equal(typeof row.closeObserved,'boolean');exit(row.exitCode);assert(signals.includes(row.signal));assert(failureCodes.includes(row.failureCode));integer(row.droppedBytes,128*1024*1024);assert.equal(row.rawChildOutputEchoed,false);assert.equal(row.originalExecutionAcceptance,false);const streams={};for(const kind of['stdout','stderr']){keys(row[kind],['path','bytes','limit','sha256']);assert.equal(row[kind].path,'console-'+phase+'.'+kind+'.txt');integer(row[kind].bytes,8*1024*1024);assert.equal(row[kind].limit,kind==='stdout'?8*1024*1024:2*1024*1024);assert(row[kind].bytes<=row[kind].limit&&/^[0-9a-f]{64}$/.test(row[kind].sha256));streams[kind]={bytes:row[kind].bytes,sha256:row[kind].sha256};}return{status:row.status,exitCode:row.exitCode,signal:row.signal,closeObserved:row.closeObserved,failureCode:row.failureCode,droppedBytes:row.droppedBytes,...streams};
}
export function projectFilterFailureBytes(b){
  assert(Buffer.isBuffer(b)&&b.length<=65536);const value=JSON.parse(decoder().decode(b));keys(value,['schema','status','code','artifactPathProduced','productAcceptance']);assert.equal(value.schema,'rea-safe-evidence-filter-console/v1');assert.equal(value.status,'failed');assert.equal(value.artifactPathProduced,false);assert.equal(value.productAcceptance,false);assert(typeof value.code==='string'&&/^[A-Z0-9_]{1,64}$/.test(value.code));const accepted=['UNADMITTED_RESULT_MEMBER','UNEXPECTED_PROFILE_RESULT','EXPECTED_PROFILE_OMISSION_NOT_FOUND','PRIVATE_HANDOFF_COLLECTOR_JOIN','SOURCE_BODY_PIN','FILTER_REFUSED'];return{status:'VALID_FIXED_FAILURE_ENVELOPE',input:identity(b),code:accepted.includes(value.code)?value.code:'OTHER_FILTER_REFUSAL'};
}
function main(){
  const context=admit();assert.deepEqual(process.argv.slice(2),['--evidence',context.raw]);
  const destination=path.join(context.temporary,'rea-safe-notes-full-diagnostic-'+context.subject.runID+'-'+context.subject.attempt);assert.equal(path.dirname(destination),context.temporary);assert(!fs.existsSync(destination));ownDirectory(context.temporary);
  const rows=[];let progressInput=null,progressCode='PROGRESS_ABSENT',trailingPartialBytes=0;
  const progressFile=path.join(context.suite,'module-progress.jsonl');
  if(fs.existsSync(progressFile)){
    try{const projection=projectProgressBytes(ordinary(progressFile,MAX_PROGRESS_BYTES),context.subject);rows.push(...projection.rows);progressInput=projection.input;progressCode=projection.code;trailingPartialBytes=projection.trailingPartialBytes;}
    catch{progressCode='PROGRESS_INVALID';}
  }
  const parentFile=path.join(context.suite,'module-progress.json');let parentInput=null,parentState=null,parentCode='PARENT_STATE_ABSENT';
  if(fs.existsSync(parentFile)){
    try{const b=ordinary(parentFile,64*1024);parentInput=identity(b);const row=validateParentState(JSON.parse(decoder().decode(b)),context.subject);parentState=row;parentCode='PARENT_STATE_VALID';}
    catch{parentCode='PARENT_STATE_INVALID';}
  }
  // Inspect only six fixed capture receipts. Ignore sourceCommand and every raw
  // stream body: identity/status projections are not source or test acceptance.
  const phaseRows=[];
  const filterRoot=path.join(context.temporary,'rea-safe-notes-order-filter-console-full-'+context.subject.runID+'-'+context.subject.attempt);
  for(const phase of['before','bootstrap','run','after','qualify','filter']){
    const root=phase==='filter'?filterRoot:context.raw,file=path.join(root,'console-'+phase+'.json');
    let result={phase,metadataStatus:'ABSENT',input:null,status:null,exitCode:null,signal:null,closeObserved:null,failureCode:null,droppedBytes:null,stdout:null,stderr:null};
    if(fs.existsSync(file)){
      try{const b=ordinary(file,65536);result.input=identity(b);const row=projectCaptureReceipt(JSON.parse(decoder().decode(b)),phase,context.subject);result={...result,metadataStatus:'VALID',...row};}
      catch{result={...result,metadataStatus:'INVALID'};}
    }
    phaseRows.push(result);
  }
  // This is the ONLY private child stream whose body is inspected. Its closed
  // filter failure envelope is reduced to a small fixed code enum, never text.
  let filterFailure={status:'UNAVAILABLE',input:null,code:null};
  const filterPhase=phaseRows.find(r=>r.phase==='filter');
  if(filterPhase.metadataStatus==='VALID'&&filterPhase.status==='failed'){
    const file=path.join(filterRoot,'console-filter.stderr.txt');
    try{const b=ordinary(file,65536);assert.deepEqual(identity(b),filterPhase.stderr);filterFailure.input=identity(b);filterFailure=projectFilterFailureBytes(b);}
    catch{filterFailure={...filterFailure,status:'INVALID_OR_UNAVAILABLE'};}
  }
  const last=rows.at(-1)??null,summary={schema:'rea-notes-full-safe-failure-diagnostic/v1',...context.subject,status:'diagnostic-only-not-product-acceptance',progressCode,parentCode,progressInput,parentInput,trailingPartialBytes,completeRows:rows.length,lastObservedModuleID:last?.moduleID??null,lastDequeuedModuleID:last?.lastDequeuedModuleID??null,lastObservedElapsedMs:last?.elapsedMs??null,moduleSummariesObserved:last?.moduleSummaries??0,reporterEndObserved:rows.some(r=>r.code==='REPORTER_END'),parentState,phaseReceipts:phaseRows,filterFailure,selectedModules:184,rawTAPCopied:false,rawTestTitlesCopied:false,rawErrorContentsCopied:false,rawAbsolutePathsCopied:false,unadmittedRawMembersCopied:false,rawTreeEnumerated:false,mainFilterAcceptanceChanged:false,performanceClaim:false,runtimeAcceptance:false,semanticAcceptance:false,fullProductAcceptance:false,allTenComplete:false};
  const outputs=[['diagnostic-summary.json',Buffer.from(JSON.stringify(summary,null,2)+'\n')],['module-progress.jsonl',Buffer.from(rows.map(r=>JSON.stringify(r)+'\n').join(''))],['module-roster.json',Buffer.from(JSON.stringify({schema:'rea-notes-full-admitted-module-roster/v1',...context.subject,modules:context.roster},null,2)+'\n')]];
  assert(outputs[0][1].length<=64*1024&&outputs[1][1].length<=MAX_PROGRESS_BYTES&&outputs[2][1].length<=64*1024);fs.mkdirSync(destination);ownDirectory(destination);
  for(const[name,b]of outputs){const p=path.join(destination,name);fs.writeFileSync(p,b,{flag:'wx'});assert.deepEqual(ordinary(p,MAX_PROGRESS_BYTES),b);}
  assert.deepEqual(fs.readdirSync(destination).sort(),outputs.map(([name])=>name).sort());assert(typeof process.env.GITHUB_OUTPUT==='string'&&process.env.GITHUB_OUTPUT);ordinary(process.env.GITHUB_OUTPUT,4096);assert.equal(path.dirname(process.env.GITHUB_OUTPUT),path.join(context.temporary,'rea-safe-notes-full-diagnostic-console-'+context.subject.runID+'-'+context.subject.attempt));assert.equal(path.basename(process.env.GITHUB_OUTPUT),'private-diagnostic-output.txt');assert.equal(fs.lstatSync(process.env.GITHUB_OUTPUT).size,0);fs.appendFileSync(process.env.GITHUB_OUTPUT,'artifact_path='+destination+'\n');
  console.log(JSON.stringify({schema:'rea-notes-full-safe-failure-diagnostic-console/v1',status:'diagnostic-view-ready',source:context.subject.source,runID:context.subject.runID,attempt:context.subject.attempt,files:outputs.map(([name,b])=>({name,...identity(b)})),outputBytes:outputs.reduce((n,[,b])=>n+b.length,0),progressCode,parentCode,productAcceptance:false}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{main();}catch{console.error(JSON.stringify({schema:'rea-notes-full-safe-failure-diagnostic-console/v1',status:'refused',code:'DIAGNOSTIC_SOURCE_OR_METADATA_REFUSED',artifactPathProduced:false,productAcceptance:false}));process.exitCode=1;}}
