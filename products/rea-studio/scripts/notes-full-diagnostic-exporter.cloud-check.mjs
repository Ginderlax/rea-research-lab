// Fresh hosted metadata controls only; separate from the existing6 and35.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.version,'v24.16.0');
for(const[k,v]of Object.entries({CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab',GITHUB_EVENT_NAME:'push',GITHUB_JOB:'safe-evidence-controls'}))assert.equal(process.env[k],v);
for(const k of['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT'])assert(/^[1-9][0-9]*$/.test(process.env[k]));assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA));
const studio=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),repository=path.resolve(studio,'../..'),sha=b=>createHash('sha256').update(b).digest('hex');
function source(p){const file=path.join(repository,p);let at=path.parse(file).root;for(const part of file.slice(at.length).split(path.sep).filter(Boolean)){at=path.join(at,part);assert(!fs.lstatSync(at).isSymbolicLink());}const first=fs.lstatSync(file);assert(first.isFile()&&first.nlink===1&&first.size<=2*1024*1024);const b=fs.readFileSync(file),last=fs.lstatSync(file);for(const k of['dev','ino','size','mtimeMs','ctimeMs'])assert.equal(first[k],last[k]);assert.equal(b.length,first.size);return b;}
const manifestRaw=source('products/rea-studio/experiments/notes-open-todos-first-20261021/CAMPAIGN.json');assert.equal(sha(manifestRaw),process.env.REA_NOTES_ORDER_MANIFEST_SHA256);const manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(manifestRaw));assert.equal(manifest.schema,'rea-notes-order-hosted-campaign/v1');assert.equal(manifest.branch,process.env.GITHUB_REF);assert.equal(manifest.parent,process.env.REA_NOTES_ORDER_PARENT);for(const k of['executionAuthorized','sourceClosureReviewed','fullCurrentRosterReviewed'])assert.equal(manifest[k],true);assert.equal(manifest.currentActiveTestFiles.length,184);
for(const p of['products/rea-studio/scripts/notes-full-diagnostic-exporter.cloud-check.mjs','products/rea-studio/scripts/export-safe-notes-full-progress.mjs','products/rea-studio/scripts/notes-full-progress-contract.mjs']){const matches=manifest.sourceRows.filter(r=>r.path===p);assert.equal(matches.length,1);const row=matches[0],b=source(p);assert.equal(row.admission,'changed-sha256');assert.equal(row.rawMode,'100644');assert.deepEqual({bytes:b.length,sha256:sha(b)},{bytes:row.bytes,sha256:row.sha256});}
// Exact source admission precedes both the exporter and its contract import.
const {projectProgressBytes,validateParentState,projectCaptureReceipt,projectFilterFailureBytes}=await import('./export-safe-notes-full-progress.mjs');
const subject={source:process.env.GITHUB_SHA,parent:manifest.parent,runID:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,manifestSHA256:sha(manifestRaw),rosterSHA256:'a'.repeat(64)};
const count=()=>({dequeued:0,completed:0,reportedPass:0,reportedFail:0,skipSignals:0,todoSignals:0,unknownFiles:0});
const open=()=>({schema:'rea-notes-full-module-progress/v1',...subject,sequence:1,elapsedMs:0,code:'REPORTER_OPEN',moduleID:null,lastDequeuedModuleID:null,observedModules:0,moduleSummaries:0,counters:count(),summary:null});
const active=()=>({...open(),sequence:2,elapsedMs:10,code:'MODULE_OBSERVED',moduleID:'m001',lastDequeuedModuleID:'m001',observedModules:1,counters:{...count(),dequeued:1}});
const encoded=rows=>Buffer.from(rows.map(r=>JSON.stringify(r)+'\n').join(''));
const parent=()=>({schema:'rea-notes-full-safe-process-state/v1',...subject,processStarted:true,closeObserved:true,exitCode:1,signal:null,terminationCode:'EXECUTION_DEADLINE',timeoutMilliseconds:2400000,TAPSummary:null,fullProductAcceptance:false});
const capture=()=>({schema:'rea-owned-top-level-console-capture/v1',phase:'filter',role:'full',source:subject.source,parent:subject.parent,runID:subject.runID,attempt:subject.attempt,job:'full-current-installed',status:'failed',sourceCommand:'PRIVATE_COMMAND',stdout:{path:'console-filter.stdout.txt',bytes:0,limit:8388608,sha256:'b'.repeat(64)},stderr:{path:'console-filter.stderr.txt',bytes:100,limit:2097152,sha256:'c'.repeat(64)},droppedBytes:0,closeObserved:true,exitCode:1,signal:null,failureCode:null,rawChildOutputEchoed:false,originalExecutionAcceptance:false});
const failure=code=>Buffer.from(JSON.stringify({schema:'rea-safe-evidence-filter-console/v1',status:'failed',code,artifactPathProduced:false,productAcceptance:false}));

test('valid progress is retained while an incomplete private marker is excluded whole',()=>{
  const complete=encoded([open(),active()]),input=Buffer.concat([complete,Buffer.from('PRIVATE_PARTIAL_MARKER')]),result=projectProgressBytes(input,subject);
  assert.equal(result.code,'PROGRESS_VALID_COMPLETE_PREFIX');assert.deepEqual(result.rows,[open(),active()]);assert.equal(result.trailingPartialBytes,22);assert.deepEqual(result.input,{bytes:input.length,sha256:sha(input)});assert(!JSON.stringify(result.rows).includes('PRIVATE_PARTIAL_MARKER'));
});
test('complete progress rejects unknown raw fields module IDs and source mismatches without reflecting them',()=>{
  for(const row of[{...active(),message:'PRIVATE_RAW_PAYLOAD'},{...active(),moduleID:'m185'},{...active(),source:'f'.repeat(40)}]){const result=projectProgressBytes(encoded([open(),row]),subject);assert.equal(result.code,'PROGRESS_INVALID');assert.deepEqual(result.rows,[]);assert(!JSON.stringify(result).includes('PRIVATE_RAW_PAYLOAD'));}
});
test('progress refuses overbound inputs and labels malformed or absent complete prefixes invalid',()=>{
  assert.throws(()=>projectProgressBytes(Buffer.alloc(524289),subject));for(const input of[Buffer.from('PRIVATE_PARTIAL_ONLY'),Buffer.from('{not-json}\n'),Buffer.concat([encoded([open()]),Buffer.alloc(2049,65)])]){const result=projectProgressBytes(input,subject);assert.equal(result.code,'PROGRESS_INVALID');assert.deepEqual(result.rows,[]);}
});
test('a fixed parent deadline failure is preserved and cannot be relabelled with extra error text',()=>{
  const row=parent();assert.deepEqual(validateParentState(row,subject),row);assert.equal(row.terminationCode,'EXECUTION_DEADLINE');assert.equal(row.exitCode,1);assert.equal(row.fullProductAcceptance,false);for(const bad of[{...row,error:'PRIVATE_ERROR'},{...row,timeoutMilliseconds:2400001},{...row,fullProductAcceptance:true}])assert.throws(()=>validateParentState(bad,subject));
});
test('capture projection never reads sourceCommand and keeps the actual failed status stream identities',()=>{
  const row=capture();Object.defineProperty(row,'sourceCommand',{enumerable:true,get(){throw new Error('RAW_COMMAND_READ');}});const result=projectCaptureReceipt(row,'filter',subject);assert.deepEqual(result,{status:'failed',exitCode:1,signal:null,closeObserved:true,failureCode:null,droppedBytes:0,stdout:{bytes:0,sha256:'b'.repeat(64)},stderr:{bytes:100,sha256:'c'.repeat(64)}});assert(!JSON.stringify(result).includes('PRIVATE'));assert(!('sourceCommand'in result));
});
test('capture projection refuses extra payload fields echoed output and unknown failure codes',()=>{
  for(const row of[{...capture(),message:'PRIVATE_RAW'},{...capture(),rawChildOutputEchoed:true},{...capture(),failureCode:'PRIVATE_UNKNOWN'}])assert.throws(()=>projectCaptureReceipt(row,'filter',subject));assert.throws(()=>projectCaptureReceipt(capture(),'diagnostics',subject));
});
test('filter failure recognizes only six fixed codes and reduces every valid unknown code to OTHER',()=>{
  for(const code of['UNADMITTED_RESULT_MEMBER','UNEXPECTED_PROFILE_RESULT','EXPECTED_PROFILE_OMISSION_NOT_FOUND','PRIVATE_HANDOFF_COLLECTOR_JOIN','SOURCE_BODY_PIN','FILTER_REFUSED'])assert.equal(projectFilterFailureBytes(failure(code)).code,code);const input=failure('UNLISTED_PRIVATE_TOKEN'),result=projectFilterFailureBytes(input);assert.equal(result.code,'OTHER_FILTER_REFUSAL');assert.deepEqual(result.input,{bytes:input.length,sha256:sha(input)});assert(!JSON.stringify(result).includes('UNLISTED_PRIVATE_TOKEN'));
});
test('filter failure refuses messages wrong schemas success claims and oversized bodies',()=>{
  const row=JSON.parse(failure('FILTER_REFUSED'));for(const bad of[{...row,message:'PRIVATE_ERROR'},{...row,status:'passed'},{...row,schema:'other'},{...row,artifactPathProduced:true},{...row,code:'private-lowercase'}])assert.throws(()=>projectFilterFailureBytes(Buffer.from(JSON.stringify(bad))));assert.throws(()=>projectFilterFailureBytes(Buffer.alloc(65537)));
});
