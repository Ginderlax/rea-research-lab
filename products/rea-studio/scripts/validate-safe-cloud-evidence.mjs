// Hosted-only synthetic metadata/filter validation. No application, original,
// archive reader, test suite, cryptography/KDF or network client is imported.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {scanProfile,prepareSafeEvidence} from './prepare-safe-cloud-evidence.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const id=b=>({bytes:b.length,sha256:sha(b)});
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const encoded=v=>Buffer.from(JSON.stringify(v,null,2)+'\n');
const rows=[];let ownedRaw=false,ownedOutput=false;
const temporary=fs.realpathSync(process.env.RUNNER_TEMP),runID=process.env.GITHUB_RUN_ID,attempt=process.env.GITHUB_RUN_ATTEMPT;
const raw=path.join(temporary,'rea-archive-zip-aes-finite-'+runID+'-'+attempt),output=path.join(temporary,'rea-safe-archive-finite-'+runID+'-'+attempt);
const evidence=path.join(temporary,'rea-filter-validation-console-'+runID+'-'+attempt);
function boundary(){
  assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.version,'v24.16.0');
  for(const[name,value]of Object.entries({CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab',GITHUB_JOB:'validate'}))assert.equal(process.env[name],value);
  assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA));assert.equal(process.env.GITHUB_WORKFLOW_SHA,process.env.GITHUB_SHA);assert.equal(process.env.REA_ARCHIVE_ZIP_PARENT,'6aeb166588d834c9635940e542b2de4e98b1eaf2');
  assert.equal(process.env.GITHUB_REF,'refs/heads/experiment/evidence-filter-validation-20261021');
  assert(/^[1-9][0-9]*$/.test(runID));assert(/^[1-9][0-9]*$/.test(attempt));
  assert.equal(fs.realpathSync(evidence),evidence);assert(fs.lstatSync(evidence).isDirectory());assert(!fs.lstatSync(evidence).isSymbolicLink());
}
function write(name,b){const full=path.join(raw,...name.split('/'));fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,b,{flag:'wx'});}
function cleanupOwned(){
  // Only roots this exact process created, with fixed resolved direct-parent
  // names, can be removed. No path comes from an input/member/omission value.
  for(const[name,owned]of[[raw,ownedRaw],[output,ownedOutput]]){
    if(!owned||!fs.existsSync(name))continue;
    assert.equal(path.dirname(name),temporary);assert.equal(fs.realpathSync(name),name);assert(fs.lstatSync(name).isDirectory());assert(!fs.lstatSync(name).isSymbolicLink());
    assert(name===raw||name===output);fs.rmSync(name,{recursive:true,force:false});assert(!fs.existsSync(name));
  }
  ownedRaw=false;ownedOutput=false;
}
function fixture({profileBody=Buffer.from('const value="C:/Users/Synthetic Owner/data";\n'),result=Buffer.from('safe result\n')}={}){
  assert(!fs.existsSync(raw));assert(!fs.existsSync(output));fs.mkdirSync(raw);ownedRaw=true;
  const execution={repository:process.env.GITHUB_REPOSITORY,source:process.env.GITHUB_SHA,parent:process.env.REA_ARCHIVE_ZIP_PARENT,workflowSHA:process.env.GITHUB_WORKFLOW_SHA,ref:process.env.GITHUB_REF,runID,attempt,job:process.env.GITHUB_JOB,role:'finite'};
  const environment={GITHUB_SHA:execution.source,GITHUB_WORKFLOW_SHA:execution.source,GITHUB_REPOSITORY:execution.repository,GITHUB_RUN_ID:runID,GITHUB_RUN_ATTEMPT:attempt,GITHUB_JOB:execution.job,REA_ARCHIVE_ZIP_ROLE:'finite',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64'};
  // This final source is deliberately invalid UTF-8, not a valid compressed archive. No decoder is used.
  const opaqueSource={path:'synthetic/sources/owned-invalid-utf8.zst',bytes:Buffer.from([0x28,0xb5,0x2f,0xfd,0xff,0xfe,0x00,0x01])};
  const bodies=Array.from({length:40},(_,index)=>index===39?opaqueSource:({path:'synthetic/sources/owned-'+String(index).padStart(2,'0')+'.mjs',bytes:index===0?profileBody:Buffer.from('synthetic control source '+index+'\n')}));
  const sourceRows=bodies.map(({path,bytes})=>({path,...id(bytes)}));
  const policy={schema:'rea-safe-cloud-evidence-policy/v1',branch:execution.ref.slice('refs/heads/'.length),parent:execution.parent,sourceManifest:'synthetic/source-admission.json',workflow:'.github/workflows/synthetic-filter-fixture.yml',expectedSourceOmissions:[bodies[0].path],sourceOpaquePins:[{path:opaqueSource.path,...id(opaqueSource.bytes)}],runnerLogPaths:['archive-finite.stdout.txt'],roles:Object.fromEntries(['finite','zip-original','browser'].map(role=>[role,[{pattern:'^source-(?:before|after)\\.json$',kind:'text',maxBytes:1024*1024},{pattern:'^result\\.txt$',kind:'text',maxBytes:1024*1024}]]))};
  const manifest=encoded({schema:'rea-archive-zip-aes-source-admission/v1',parent:execution.parent,files:sourceRows});const workflow=Buffer.from('name: owned synthetic filter control\n');
  for(const phase of['before','after']){
    for(const row of bodies)write('source-'+phase+'/'+row.path,row.bytes);
    write('source-'+phase+'/'+policy.sourceManifest,manifest);write('source-'+phase+'/'+policy.workflow,workflow);
    const record={schema:'rea-archive-zip-aes-source-check/v1',status:'authenticated',phase,soleParent:execution.parent,execution:environment,manifest:{path:policy.sourceManifest,...id(manifest),gitBlob:blob(manifest)},workflow:{path:policy.workflow,...id(workflow),gitBlob:blob(workflow)},sourceFiles:sourceRows.map((row,index)=>({...row,gitBlob:blob(bodies[index].bytes)})),sourceFilesCount:sourceRows.length,sourceBytes:bodies.reduce((n,row)=>n+row.bytes.length,0),sourceOverlay:false,historicalReceiptsRebound:false,productExecutionsByAdmission:0};write('source-'+phase+'.json',encoded(record));
  }
  write('result.txt',result);return {raw,output,policy,execution,manifestSHA:sha(manifest)};
}
function invoke(f){try{return prepareSafeEvidence(f);}finally{ownedOutput=fs.existsSync(output);}}
function refused(fn,code){assert.throws(fn,error=>error.code===code);assert(!fs.existsSync(output),'Refusal must precede first safe output');}
function check(name,fn){
  const row={sequence:rows.length+1,name,status:'running',syntheticOnly:true,productExecutions:0};rows.push(row);
  try{boundary();fn();row.status='passed';}catch(error){row.status='failed';row.failureCode=typeof error.code==='string'&&/^[A-Z0-9_]{1,64}$/.test(error.code)?error.code:'CONTROL_ASSERTION';}
  finally{try{cleanupOwned();row.ownedFixtureCleanup=true;}catch{row.status='failed';row.ownedFixtureCleanup=false;row.failureCode='OWNED_FIXTURE_CLEANUP';}}
}
function main(){
  check('generic-windows-unix-and-escaped-profile-roots',()=>{
    const values=['C:/Users/Synthetic Owner/file','D:\\Users\\SyntheticOwner\\file','{"p":"C:\\\\Users\\\\SyntheticOwner\\\\file"}','/home/synthetic-owner/file','/Users/synthetic-owner/file','C:/Users/ name/file','C:/Users/'];
    for(const value of values)assert.equal(scanProfile(Buffer.from(value),'source-before/owned.mjs','finite').omit,true);
    assert.equal(scanProfile(Buffer.from('safe bounded observation'),'result.txt','finite').omit,false);
  });
  check('runner-exception-is-exact-component-and-fixed-log-only',()=>{
    const options={runnerLogPaths:['archive-finite.stdout.txt']};
    for(const value of['C:/Users/runneradmin/cache','C:/Users/RUNNER~1/cache','"C:/Users/runneradmin"'])assert.equal(scanProfile(Buffer.from(value),'archive-finite.stdout.txt','finite',options).omit,false);
    for(const value of['C:/Users/runneradmin extra/cache',"C:/Users/runneradmin's/cache",'C:/Users/runneradminx/cache','/home/runneradmin/cache'])assert.equal(scanProfile(Buffer.from(value),'archive-finite.stdout.txt','finite',options).omit,true);
    assert.equal(scanProfile(Buffer.from('C:/Users/runneradmin/cache'),'source-before/owned.mjs','finite',options).omit,true);
    assert.equal(scanProfile(Buffer.from('C:/Users/runneradmin/cache'),'archive-finite.stdout.txt','browser',options).omit,true);
  });
  check('whole-member-positive-keeps-exact-safe-bytes',()=>{
    const f=fixture(),result=invoke(f);assert.equal(result.representation.omittedFiles,2);assert.equal(result.representation.uploadedSourceSnapshotsComplete,false);assert.equal(result.representation.rawCompleteArchiveUploaded,false);
    assert.deepEqual(fs.readFileSync(path.join(output,'result.txt')),Buffer.from('safe result\n'));assert(!fs.existsSync(path.join(output,'source-before',...f.policy.expectedSourceOmissions[0].split('/'))));
    const opaque=f.policy.sourceOpaquePins[0];for(const phase of['before','after']){const retained=fs.readFileSync(path.join(output,'source-'+phase,...opaque.path.split('/')));assert.deepEqual(id(retained),{bytes:opaque.bytes,sha256:opaque.sha256});assert.deepEqual(retained,Buffer.from([0x28,0xb5,0x2f,0xfd,0xff,0xfe,0x00,0x01]));}
    const omissions=JSON.parse(fs.readFileSync(path.join(output,'omissions.json'),'utf8'));assert.equal(omissions.rows.length,2);assert(omissions.rows.every(row=>row.reason==='ABSOLUTE_USER_PROFILE_PATH'));assert(!JSON.stringify(omissions).includes('Synthetic Owner'));
  });
  check('late-denied-result-prevents-every-safe-copy',()=>{const f=fixture({result:Buffer.from('C:/Users/SyntheticOwner/late')});refused(()=>invoke(f),'UNEXPECTED_PROFILE_RESULT');});
  check('captured-source-byte-mutation-is-rejected-before-copy',()=>{const f=fixture();const name=path.join(raw,'source-after/synthetic/sources/owned-05.mjs');const b=fs.readFileSync(name);b[0]^=1;fs.writeFileSync(name,b);refused(()=>invoke(f),'SOURCE_BODY_PIN');});
  check('expected-omission-without-profile-match-fails-closed',()=>{const f=fixture({profileBody:Buffer.from('plain safe source\n')});refused(()=>invoke(f),'EXPECTED_PROFILE_OMISSION_NOT_FOUND');});
  check('unknown-nested-archive-never-enters-opaque-allowlist',()=>{const f=fixture();write('unclassified.zip',Buffer.from('opaque not parsed'));refused(()=>invoke(f),'UNADMITTED_RESULT_MEMBER');});
  check('unsafe-policy-member-path-is-rejected',()=>{const f=fixture();f.policy.expectedSourceOmissions=['../outside.mjs'];refused(()=>invoke(f),'MEMBER_COMPONENT');});
  check('empty-retained-byte-array-remains-an-empty-file',()=>{const f=fixture({result:Buffer.alloc(0)});invoke(f);const b=fs.readFileSync(path.join(output,'result.txt'));assert.equal(b.length,0);assert.equal(sha(b),sha(Buffer.alloc(0)));});
  check('BOM-aware-UTF16-profile-member-is-omitted-whole',()=>{const body=Buffer.concat([Buffer.from([255,254]),Buffer.from('C:/Users/SyntheticOwner/file','utf16le')]);const f=fixture({profileBody:body});const result=invoke(f);assert.equal(result.representation.omittedFiles,2);});
  check('source-run-and-role-must-join-actual-fixture-subject',()=>{const f=fixture(),name=path.join(raw,'source-before.json'),record=JSON.parse(fs.readFileSync(name,'utf8'));record.execution.GITHUB_RUN_ID='999';fs.writeFileSync(name,encoded(record));refused(()=>invoke(f),'SOURCE_EXECUTION_JOIN');});
  check('per-role-byte-bound-is-not-a-copy-filter',()=>{const f=fixture();f.policy.roles.finite[1].maxBytes=1;refused(()=>invoke(f),'ROLE_MEMBER_SIZE');});
  check('vendor-executable-magic-is-not-synthetic-opaque-evidence',()=>{const f=fixture();write('payload.bin',Buffer.from([77,90,0,0]));f.policy.roles.finite.push({pattern:'^payload\\.bin$',kind:'synthetic-opaque',maxBytes:16});refused(()=>invoke(f),'VENDOR_EXECUTABLE_DENIED');});
  check('preexisting-safe-output-is-never-overwritten',()=>{const f=fixture();fs.mkdirSync(output);ownedOutput=true;fs.writeFileSync(path.join(output,'canary'),'preserve');assert.throws(()=>invoke(f),error=>error.code==='NO_EARLIER_SAFE_OUTPUT');assert.equal(fs.readFileSync(path.join(output,'canary'),'utf8'),'preserve');});
  check('owned-hardlink-input-is-refused',()=>{const f=fixture();fs.linkSync(path.join(raw,'result.txt'),path.join(raw,'result-link.txt'));refused(()=>invoke(f),'FILE_LINK_COUNT');});
  check('oversized-member-is-refused-before-body-read',()=>{const f=fixture();write('oversized.txt',Buffer.alloc(8*1024*1024+1,65));refused(()=>invoke(f),'MEMBER_BYTE_BOUND');});
  check('injected-deadline-control-is-not-an-elapsed-time-claim',()=>{const f=fixture(),clock=Date.now;let calls=0;try{Date.now=()=>++calls===1?0:120001;refused(()=>invoke(f),'FILTER_DEADLINE');}finally{Date.now=clock;}});
  const failed=rows.filter(row=>row.status!=='passed').length;
  const report={schema:'rea-hosted-synthetic-safe-evidence-filter-validation/v1',status:failed?'failed':'passed',source:process.env.GITHUB_SHA,parent:process.env.REA_ARCHIVE_ZIP_PARENT,runID,attempt,job:process.env.GITHUB_JOB,scope:'Synthetic metadata/source-record and profile-rule controls only. Fixture source-admission records are owned test data, not acceptance of those records as actual product execution.',actualFilterMetadataModuleImported:true,fixtureSourceRecordsSynthetic:true,caseCount:rows.length,passed:rows.length-failed,failed,cases:rows,productImports:0,productTests:0,originalExecutions:0,archiveOpens:0,cipherKDFCRCExecutions:0,network:0,performanceClaims:false,fullProductAcceptance:false,allTenComplete:false};
  fs.writeFileSync(path.join(evidence,'filter-validation-report.json'),encoded(report),{flag:'wx'});
  console.log(JSON.stringify({schema:report.schema,status:report.status,caseCount:report.caseCount,passed:report.passed,failed,productTests:0,originalExecutions:0}));if(failed)process.exitCode=1;
}
function controlledSentinel(){
  boundary();assert.deepEqual(process.argv.slice(2),[]);
  const forbidden=['GITHUB_OUTPUT','GITHUB_ENV','GITHUB_PATH','GITHUB_STEP_SUMMARY','GITHUB_STATE','GITHUB_TOKEN','GH_TOKEN','ACTIONS_RUNTIME_TOKEN','ACTIONS_ID_TOKEN_REQUEST_TOKEN','ACTIONS_ID_TOKEN_REQUEST_URL'];
  const commandFiles=['GITHUB_OUTPUT','GITHUB_ENV','GITHUB_PATH','GITHUB_STEP_SUMMARY','GITHUB_STATE'];
  const present=Object.fromEntries(forbidden.map(name=>[name,Object.keys(process.env).some(actual=>actual.toUpperCase()===name)]));
  const canary=Buffer.from('REA_SYNTHETIC_SENTINEL_FILE_COMMAND_CANARY=1\n');
  const appended={};
  for(const name of commandFiles){
    appended[name]=false;
    if(present[name]){try{fs.appendFileSync(process.env[name],canary);appended[name]=true;}catch{appended[name]=false;}}
  }
  const stdout=Buffer.from('REA_SYNTHETIC_SENTINEL_STDOUT C:/Users/SyntheticOwner/console-sentinel\n::warning::REA_SYNTHETIC_SENTINEL_WORKFLOW_COMMAND\n');
  const stderr=Buffer.from('REA_SYNTHETIC_SENTINEL_STDERR C:/Users/SyntheticOwner/error-sentinel\n::error::REA_SYNTHETIC_SENTINEL_WORKFLOW_COMMAND\n');
  const record={schema:'rea-hosted-synthetic-console-isolation-sentinel/v1',status:'expected-control-failure',source:process.env.GITHUB_SHA,parent:process.env.REA_ARCHIVE_ZIP_PARENT,runID,attempt,job:process.env.GITHUB_JOB,forbiddenEnvironmentPresent:present,fileCommandCanaryAppendSucceeded:appended,stdout:id(stdout),stderr:id(stderr),expectedChildExitCode:23,rawSentinelStreamsForUpload:false,profileTextIsClearlySynthetic:true,productTests:0,originalExecutions:0,archiveOpens:0,fullProductAcceptance:false};
  fs.writeFileSync(path.join(evidence,'filter-control-sentinel.json'),encoded(record),{flag:'wx'});
  fs.writeSync(1,stdout);fs.writeSync(2,stderr);process.exitCode=23;
}
function finalize(){
  boundary();const allowed=['console-filter-validation.json','console-filter-validation.stderr.txt','console-filter-validation.stdout.txt','filter-validation-report.json','source-admission-before.json','source-admission-after.json'];
  const actual=fs.readdirSync(evidence).sort();assert.deepEqual(actual,[...allowed].sort());const identities=[];
  for(const name of allowed){const full=path.join(evidence,name),s=fs.lstatSync(full);assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size<=2*1024*1024);const b=fs.readFileSync(full);assert.equal(scanProfile(b,name,'finite').omit,false);identities.push({path:name,...id(b)});}
  const report=JSON.parse(fs.readFileSync(path.join(evidence,'filter-validation-report.json'),'utf8'));assert.equal(report.schema,'rea-hosted-synthetic-safe-evidence-filter-validation/v1');assert.equal(report.source,process.env.GITHUB_SHA);assert.equal(report.runID,runID);assert.equal(report.attempt,attempt);assert(['passed','failed'].includes(report.status));assert.equal(report.caseCount,17);assert.equal(report.cases.length,17);assert(report.cases.every(row=>['passed','failed'].includes(row.status)));assert.equal(report.failed,report.cases.filter(row=>row.status!=='passed').length);assert.equal(report.passed,17-report.failed);assert.equal(report.status,report.failed?'failed':'passed');
  const capture=JSON.parse(fs.readFileSync(path.join(evidence,'console-filter-validation.json'),'utf8'));assert(['passed','failed'].includes(capture.status));assert.equal(capture.phase,'filter-validation');assert.equal(capture.source,process.env.GITHUB_SHA);assert.equal(capture.runID,runID);assert.equal(capture.attempt,attempt);assert.equal(capture.rawChildOutputEchoed,false);
  for(const kind of['stdout','stderr'])assert.deepEqual(id(fs.readFileSync(path.join(evidence,capture[kind].path))),{bytes:capture[kind].bytes,sha256:capture[kind].sha256});
  const before=JSON.parse(fs.readFileSync(path.join(evidence,'source-admission-before.json'),'utf8')),after=JSON.parse(fs.readFileSync(path.join(evidence,'source-admission-after.json'),'utf8'));assert.equal(before.phase,'before');assert.equal(after.phase,'after');assert.equal(before.source,process.env.GITHUB_SHA);assert.equal(after.source,process.env.GITHUB_SHA);assert.deepEqual(before.rows,after.rows);assert.deepEqual(before.workflow,after.workflow);assert.equal(before.parent,process.env.REA_ARCHIVE_ZIP_PARENT);assert.equal(after.parent,process.env.REA_ARCHIVE_ZIP_PARENT);
  const passed=report.status==='passed'&&capture.status==='passed'&&capture.exitCode===0&&capture.closeObserved===true&&capture.signal===null&&capture.droppedBytes===0&&report.cases.every(row=>row.ownedFixtureCleanup===true);
  const provenance={schema:'rea-synthetic-filter-validation-safe-artifact/v1',status:passed?'passed':'failed',source:process.env.GITHUB_SHA,parent:process.env.REA_ARCHIVE_ZIP_PARENT,runID,attempt,job:process.env.GITHUB_JOB,representation:'sanitized synthetic filter-validation observations; source identities only',files:identities,rawSourceBodiesUploaded:false,completeOriginalProductArtifact:false,productTests:0,archiveOpens:0,fullProductAcceptance:false};
  const b=encoded(provenance);assert.equal(scanProfile(b,'filter-validation-provenance.json','finite').omit,false);fs.writeFileSync(path.join(evidence,'filter-validation-provenance.json'),b,{flag:'wx'});
  assert(typeof process.env.GITHUB_OUTPUT==='string');fs.appendFileSync(process.env.GITHUB_OUTPUT,'artifact_path='+evidence+'\n');console.log(JSON.stringify({schema:provenance.schema,status:provenance.status,files:7,productTests:0}));if(!passed)process.exitCode=1;
}
try{boundary();if(process.env.REA_SAFE_CONTROL_SENTINEL!==undefined){assert.equal(process.env.REA_SAFE_CONTROL_SENTINEL,'expected-failure');controlledSentinel();}else if(process.argv.length===2)main();else{assert.deepEqual(process.argv.slice(2),['--finalize']);finalize();}}
catch(error){console.error(JSON.stringify({schema:'rea-filter-validation-safe-console/v1',status:'failed',code:typeof error.code==='string'&&/^[A-Z0-9_]{1,64}$/.test(error.code)?error.code:'VALIDATION_REFUSED',productTests:0}));process.exitCode=1;}
