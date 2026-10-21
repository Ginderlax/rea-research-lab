// Hosted-only synthetic metadata/filter validation. No application, original,
// archive reader, test suite, cryptography/KDF or network client is imported.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {scanProfile,prepareSafeEvidence} from './prepare-safe-notes-order-evidence.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const id=b=>({bytes:b.length,sha256:sha(b)});
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const encoded=v=>Buffer.from(JSON.stringify(v,null,2)+'\n');
const rows=[];let ownedRaw=false,ownedOutput=false;
const temporary=fs.realpathSync(process.env.RUNNER_TEMP),runID=process.env.GITHUB_RUN_ID,attempt=process.env.GITHUB_RUN_ATTEMPT;
let role='finite',raw,output;const setRole=value=>{role=value;raw=path.join(temporary,'rea-notes-order-'+role+'-'+runID+'-'+attempt);output=path.join(temporary,'rea-safe-notes-order-'+role+'-'+runID+'-'+attempt);};setRole(role);
const evidence=path.join(temporary,'rea-notes-order-filter-validation-'+runID+'-'+attempt);
function boundary(){
  assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.version,'v24.16.0');
  for(const[name,value]of Object.entries({CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab',GITHUB_JOB:'safe-evidence-controls'}))assert.equal(process.env[name],value);
  assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA));assert.equal(process.env.GITHUB_WORKFLOW_SHA,process.env.GITHUB_SHA);assert.equal(process.env.REA_NOTES_ORDER_PARENT,'27374c78642d0086d5640fe25a887f5d8202dccc');
  assert.equal(process.env.GITHUB_REF,'refs/heads/experiment/notes-open-todos-first-20261021-r1');
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
function fixture({profileBody=Buffer.from('const value="C:/Users/Synthetic Owner/data";\n'),result=Buffer.from('safe result\n'),fullSnapshots=false}={}){
  assert(!fs.existsSync(raw));assert(!fs.existsSync(output));fs.mkdirSync(raw);ownedRaw=true;
  const jobs={full:'full-current-installed',finite:'notes46-installed-finite',values:'notes46-observed-values',browser:'draft-recovery-real-chromium'};
  const execution={repository:process.env.GITHUB_REPOSITORY,source:process.env.GITHUB_SHA,parent:process.env.REA_NOTES_ORDER_PARENT,workflowSHA:process.env.GITHUB_WORKFLOW_SHA,ref:process.env.GITHUB_REF,runID,attempt,job:jobs[role],role};
  // Invalid UTF-8 synthetic bytes; no compressed/archive decoder is used.
  const opaqueSource={path:'synthetic/sources/owned-invalid-utf8.zst',bytes:Buffer.from([0x28,0xb5,0x2f,0xfd,0xff,0xfe,0x00,0x01])};
  const bodies=Array.from({length:40},(_,index)=>index===39?opaqueSource:({path:'synthetic/sources/owned-'+String(index).padStart(2,'0')+'.mjs',bytes:index===0?profileBody:Buffer.from('synthetic control source '+index+'\n')}));
  bodies[1].path='products/rea-studio/scripts/verify-cloud-current-installed.mjs';bodies[2].path='products/rea-studio/apps/synthetic/control.mjs';bodies[3].path='products/rea-studio/package.json';
  const sourceRows=bodies.map(({path,bytes},index)=>index%2===0?({path,rawMode:'100644',...id(bytes),admission:'changed-sha256'}):({path,rawMode:'100644',gitBlob:blob(bytes),admission:'inherited-parent-gitblob'}));
  const policy={schema:'rea-safe-cloud-evidence-policy/v1',branch:execution.ref.slice('refs/heads/'.length),parent:execution.parent,sourceManifest:'synthetic/CAMPAIGN.json',workflow:'.github/workflows/synthetic-filter-fixture.yml',expectedSourceOmissions:[bodies[0].path],sourceOpaquePins:[{path:opaqueSource.path,...id(opaqueSource.bytes)}],runnerLogPaths:['current-full/stdout.txt'],roles:Object.fromEntries(['full','finite','values','browser'].map(role=>[role,[{pattern:'^source-(?:before|preexecution|after)\\.json$',kind:'text',maxBytes:1024*1024},{pattern:'^result\\.txt$',kind:'text',maxBytes:1024*1024}]]))};
  const currentActiveTestFiles=Array.from({length:184},(_,i)=>({path:'synthetic/current-'+i+'.test.mjs',mode:'100644',gitBlob:'1'.repeat(40)}));
  const manifest=encoded({schema:'rea-notes-order-hosted-campaign/v1',parent:execution.parent,branch:execution.ref,executionAuthorized:true,fullCurrentRosterReviewed:true,sourceClosureReviewed:true,sourceRows,currentActiveTestFiles});
  const workflow=Buffer.from('name: owned synthetic filter control\n');
  for(const label of['before','preexecution','after']){
    for(const row of bodies)write('source-'+label+'/'+row.path+'.snapshot',row.bytes);
    write('source-'+label+'/'+policy.sourceManifest+'.snapshot',manifest);write('source-'+label+'/'+policy.workflow+'.snapshot',workflow);
    const observed=sourceRows.map((row,index)=>({path:row.path,rawMode:'100644',gitBlob:blob(bodies[index].bytes),...id(bodies[index].bytes),admission:row.admission}));
    const extras=[{path:policy.sourceManifest,rawMode:'100644',gitBlob:blob(manifest),...id(manifest)},{path:policy.workflow,rawMode:'100644',gitBlob:blob(workflow),...id(workflow)}];
    const record={schema:'rea-notes-order-source-capture/v2',sourceCommit:execution.source,branch:execution.ref,runId:runID,attempt,job:execution.job,role,label,manifest:id(manifest),rows:observed,extras,rawBytes:bodies.reduce((n,row)=>n+row.bytes.length,0)+manifest.length+workflow.length,currentActiveTests:184,status:[],completeSourceClosureAssertedByReviewedManifest:true,productProcessesStarted:0};write('source-'+label+'.json',encoded(record));
  }
  if(fullSnapshots){
    assert.equal(role,'full');const selected=[bodies[1],bodies[2],bodies[3]],files=selected.map(row=>({sourcePath:row.path.slice('products/rea-studio/'.length),path:'source/'+row.path.slice('products/rea-studio/'.length)+'.snapshot',...id(row.bytes)}));
    for(const row of selected)write('full-suite/source/'+row.path.slice('products/rea-studio/'.length)+'.snapshot',row.bytes);
    write('full-suite/source-snapshot-manifest.json',encoded({schema:'rea-cloud-source-snapshots/v1',snapshotScope:'active',files}));
    write('full-suite/runner.mjs.snapshot',bodies[1].bytes);
    policy.roles.full.push({pattern:'^full-suite/source-snapshot-manifest\\.json$',kind:'text',maxBytes:1024*1024});
  }
  write('result.txt',result);return {raw,output,policy,execution,manifestSHA:sha(manifest)};
}
function addPrivateHandoff(f){
  const execution=f.execution,repository=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
  const values=role==='full'?{FLOW_ORIGINAL_CACHE:path.join(repository,'.local/flow-original'),REA_KEEPASS_EXE:path.join(repository,'.local/keepass-original/portable/KeePass.exe'),REA_ARCHIVE_ZIP_AES_ORIGINAL_EVIDENCE:raw,REA_ARCHIVE_ZIP_ROLE:'zip-original',REA_SYNC_DOWNLOAD_ORIGINAL_EVIDENCE:path.join(temporary,'rea-notes-order-sync-original-'+runID+'-'+attempt)}:role==='browser'?{PLAYWRIGHT_BROWSERS_PATH:path.join(temporary,'rea-notes-order-chromium-'+runID+'-'+attempt)}:{};
  const before=JSON.parse(fs.readFileSync(path.join(raw,'source-before.json'),'utf8'));
  const handoff={schema:'rea-notes-order-bootstrap-environment/v1',status:'acquired',execution:{GITHUB_SHA:execution.source,GITHUB_RUN_ID:runID,GITHUB_RUN_ATTEMPT:attempt,GITHUB_JOB:execution.job,GITHUB_REPOSITORY:execution.repository},role,values,manifest:before.manifest,failure:null};
  const b=encoded(handoff);write('bootstrap-environment.json',b);
  const collector={schema:'rea-notes-order-collector-phase/v1',phase:'run',sourceCommit:execution.source,runId:runID,attempt,job:execution.job,role,bootstrapEnvironment:{receipt:id(b),allowedKeys:Object.keys(values).sort()}};
  write('collector-run.json',encoded(collector));f.policy.roles[role].push({pattern:'^collector-run\\.json$',kind:'text',maxBytes:1024*1024});return{handoff,collector};
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
    const options={runnerLogPaths:['current-full/stdout.txt']};
    for(const value of['C:/Users/runneradmin/cache','C:/Users/RUNNER~1/cache','"C:/Users/runneradmin"'])assert.equal(scanProfile(Buffer.from(value),'current-full/stdout.txt','finite',options).omit,false);
    for(const value of['C:/Users/runneradmin extra/cache',"C:/Users/runneradmin's/cache",'C:/Users/runneradminx/cache','/home/runneradmin/cache'])assert.equal(scanProfile(Buffer.from(value),'current-full/stdout.txt','finite',options).omit,true);
    assert.equal(scanProfile(Buffer.from('C:/Users/runneradmin/cache'),'source-before/owned.mjs','finite',options).omit,true);
    assert.equal(scanProfile(Buffer.from('C:/Users/runneradmin/cache'),'current-full/stdout.txt','browser',options).omit,true);
  });
  check('whole-member-positive-keeps-exact-safe-bytes',()=>{
    const f=fixture(),result=invoke(f);assert.equal(result.representation.omittedFiles,3);assert.equal(result.representation.uploadedSourceSnapshotsComplete,false);assert.equal(result.representation.rawCompleteArchiveUploaded,false);
    assert.deepEqual(fs.readFileSync(path.join(output,'result.txt')),Buffer.from('safe result\n'));assert(!fs.existsSync(path.join(output,'source-before',...f.policy.expectedSourceOmissions[0].split('/').slice(0,-1),f.policy.expectedSourceOmissions[0].split('/').at(-1)+'.snapshot')));
    const opaque=f.policy.sourceOpaquePins[0];for(const phase of['before','preexecution','after']){const retained=fs.readFileSync(path.join(output,'source-'+phase,...opaque.path.split('/').slice(0,-1),opaque.path.split('/').at(-1)+'.snapshot'));assert.deepEqual(id(retained),{bytes:opaque.bytes,sha256:opaque.sha256});assert.deepEqual(retained,Buffer.from([0x28,0xb5,0x2f,0xfd,0xff,0xfe,0x00,0x01]));}
    const omissions=JSON.parse(fs.readFileSync(path.join(output,'omissions.json'),'utf8'));assert.equal(omissions.rows.length,3);assert(omissions.rows.every(row=>row.reason==='ABSOLUTE_USER_PROFILE_PATH'));assert(!JSON.stringify(omissions).includes('Synthetic Owner'));
  });
  check('late-denied-result-prevents-every-safe-copy',()=>{const f=fixture({result:Buffer.from('C:/Users/SyntheticOwner/late')});refused(()=>invoke(f),'UNEXPECTED_PROFILE_RESULT');});
  check('captured-source-byte-mutation-is-rejected-before-copy',()=>{const f=fixture();const name=path.join(raw,'source-after/synthetic/sources/owned-05.mjs.snapshot');const b=fs.readFileSync(name);b[0]^=1;fs.writeFileSync(name,b);refused(()=>invoke(f),'SOURCE_BODY_PIN');});
  check('expected-omission-without-profile-match-fails-closed',()=>{const f=fixture({profileBody:Buffer.from('plain safe source\n')});refused(()=>invoke(f),'EXPECTED_PROFILE_OMISSION_NOT_FOUND');});
  check('unknown-nested-archive-never-enters-opaque-allowlist',()=>{const f=fixture();write('unclassified.zip',Buffer.from('opaque not parsed'));refused(()=>invoke(f),'UNADMITTED_RESULT_MEMBER');});
  check('unsafe-policy-member-path-is-rejected',()=>{const f=fixture();f.policy.expectedSourceOmissions=['../outside.mjs'];refused(()=>invoke(f),'MEMBER_COMPONENT');});
  check('empty-retained-byte-array-remains-an-empty-file',()=>{const f=fixture({result:Buffer.alloc(0)});invoke(f);const b=fs.readFileSync(path.join(output,'result.txt'));assert.equal(b.length,0);assert.equal(sha(b),sha(Buffer.alloc(0)));});
  check('BOM-aware-UTF16-profile-member-is-omitted-whole',()=>{const body=Buffer.concat([Buffer.from([255,254]),Buffer.from('C:/Users/SyntheticOwner/file','utf16le')]);const f=fixture({profileBody:body});const result=invoke(f);assert.equal(result.representation.omittedFiles,3);});
  check('source-run-and-role-must-join-actual-fixture-subject',()=>{const f=fixture(),name=path.join(raw,'source-before.json'),record=JSON.parse(fs.readFileSync(name,'utf8'));record.runId='999';fs.writeFileSync(name,encoded(record));refused(()=>invoke(f),'SOURCE_EXECUTION_JOIN');});
  check('per-role-byte-bound-is-not-a-copy-filter',()=>{const f=fixture();f.policy.roles.finite[1].maxBytes=1;refused(()=>invoke(f),'ROLE_MEMBER_SIZE');});
  check('vendor-executable-magic-is-not-synthetic-opaque-evidence',()=>{const f=fixture();write('payload.bin',Buffer.from([77,90,0,0]));f.policy.roles.finite.push({pattern:'^payload\\.bin$',kind:'synthetic-opaque',maxBytes:16});refused(()=>invoke(f),'VENDOR_EXECUTABLE_DENIED');});
  check('preexisting-safe-output-is-never-overwritten',()=>{const f=fixture();fs.mkdirSync(output);ownedOutput=true;fs.writeFileSync(path.join(output,'canary'),'preserve');assert.throws(()=>invoke(f),error=>error.code==='NO_EARLIER_SAFE_OUTPUT');assert.equal(fs.readFileSync(path.join(output,'canary'),'utf8'),'preserve');});
  check('owned-hardlink-input-is-refused',()=>{const f=fixture();fs.linkSync(path.join(raw,'result.txt'),path.join(raw,'result-link.txt'));refused(()=>invoke(f),'FILE_LINK_COUNT');});
  check('oversized-member-is-refused-before-body-read',()=>{const f=fixture();write('oversized.txt',Buffer.alloc(8*1024*1024+1,65));refused(()=>invoke(f),'MEMBER_BYTE_BOUND');});
  check('injected-deadline-control-is-not-an-elapsed-time-claim',()=>{const f=fixture(),clock=Date.now;let calls=0;try{Date.now=()=>++calls===1?0:120001;refused(()=>invoke(f),'FILTER_DEADLINE');}finally{Date.now=clock;}});
  for(const selected of['full','finite','values','browser'])check('positive-closed-source-and-role-'+selected,()=>{setRole(selected);const f=fixture(),result=invoke(f);assert.equal(result.representation.omittedFiles,3);assert.equal(result.representation.execution.role,selected);});
  setRole('finite');
  check('inherited-parent-blob-mismatch-refuses',()=>{const f=fixture(),name=path.join(raw,'source-before.json'),record=JSON.parse(fs.readFileSync(name,'utf8'));record.rows[1].gitBlob='2'.repeat(40);fs.writeFileSync(name,encoded(record));refused(()=>invoke(f),'INHERITED_PARENT_GIT_BLOB');});
  check('changed-source-declaration-mismatch-refuses',()=>{const f=fixture(),name=path.join(raw,'source-before.json'),record=JSON.parse(fs.readFileSync(name,'utf8'));record.rows[2].sha256='2'.repeat(64);fs.writeFileSync(name,encoded(record));refused(()=>invoke(f),'CHANGED_SOURCE_ROW_PIN');});
  check('third-source-phase-must-be-complete',()=>{const f=fixture();fs.unlinkSync(path.join(raw,'source-preexecution.json'));refused(()=>invoke(f),'SOURCE_RECORD_REQUIRED');});
  check('workflow-extra-blob-mismatch-refuses',()=>{const f=fixture(),name=path.join(raw,'source-after.json'),record=JSON.parse(fs.readFileSync(name,'utf8'));record.extras[1].gitBlob='2'.repeat(40);fs.writeFileSync(name,encoded(record));refused(()=>invoke(f),'SOURCE_EXTRA_BLOB');});
  check('full-current-source-duplicates-retain-exact-closed-bytes',()=>{setRole('full');const f=fixture({fullSnapshots:true}),result=invoke(f);assert.equal(result.representation.omittedFiles,3);assert.deepEqual(fs.readFileSync(path.join(output,'full-suite/runner.mjs.snapshot')),Buffer.from('synthetic control source 1\n'));});
  check('full-duplicate-summary-pin-mutation-refuses',()=>{setRole('full');const f=fixture({fullSnapshots:true}),name=path.join(raw,'full-suite/source-snapshot-manifest.json'),record=JSON.parse(fs.readFileSync(name,'utf8'));record.files[0].sha256='2'.repeat(64);fs.writeFileSync(name,encoded(record));refused(()=>invoke(f),'FULL_SOURCE_SUMMARY_PIN');});
  check('full-duplicate-body-mutation-refuses',()=>{setRole('full');const f=fixture({fullSnapshots:true}),name=path.join(raw,'full-suite/source/apps/synthetic/control.mjs.snapshot');fs.writeFileSync(name,Buffer.from('changed source\n'));refused(()=>invoke(f),'FULL_SOURCE_BODY_PIN');});
  check('full-runner-copy-mutation-refuses',()=>{setRole('full');const f=fixture({fullSnapshots:true});fs.writeFileSync(path.join(raw,'full-suite/runner.mjs.snapshot'),Buffer.from('changed runner\n'));refused(()=>invoke(f),'FULL_RUNNER_SOURCE_PIN');});
  setRole('finite');
  for(const selected of['full','finite','values','browser'])check('private-hosted-handoff-omitted-whole-'+selected,()=>{setRole(selected);const f=fixture();addPrivateHandoff(f);const result=invoke(f);assert.equal(result.representation.omittedFiles,4);assert(!fs.existsSync(path.join(output,'bootstrap-environment.json')));const omissions=JSON.parse(fs.readFileSync(path.join(output,'omissions.json'),'utf8'));const privateRow=omissions.rows.find(row=>row.path==='bootstrap-environment.json');assert.equal(privateRow.reason,'PRIVATE_HOSTED_ENVIRONMENT_HANDOFF');assert.equal(privateRow.sourceSnapshot,false);});
  setRole('finite');
  check('private-handoff-byte-pin-must-match-collector',()=>{const f=fixture(),{collector}=addPrivateHandoff(f);collector.bootstrapEnvironment.receipt.sha256='2'.repeat(64);fs.writeFileSync(path.join(raw,'collector-run.json'),encoded(collector));refused(()=>invoke(f),'PRIVATE_HANDOFF_COLLECTOR_PIN');});
  check('private-handoff-unknown-key-is-refused',()=>{const f=fixture(),{handoff}=addPrivateHandoff(f);handoff.values.UNREVIEWED_KEY='synthetic';fs.writeFileSync(path.join(raw,'bootstrap-environment.json'),encoded(handoff));refused(()=>invoke(f),'ERR_ASSERTION');});
  const failed=rows.filter(row=>row.status!=='passed').length;
  const report={schema:'rea-hosted-synthetic-safe-evidence-filter-validation/v1',status:failed?'failed':'passed',source:process.env.GITHUB_SHA,parent:process.env.REA_NOTES_ORDER_PARENT,runID,attempt,job:process.env.GITHUB_JOB,scope:'Synthetic metadata/source-record and profile-rule controls only. Fixture source-admission records are owned test data, not acceptance of those records as actual product execution.',actualFilterMetadataModuleImported:true,fixtureSourceRecordsSynthetic:true,caseCount:rows.length,passed:rows.length-failed,failed,cases:rows,productImports:0,productTests:0,originalExecutions:0,archiveOpens:0,cipherKDFCRCExecutions:0,network:0,performanceClaims:false,fullProductAcceptance:false,allTenComplete:false};
  fs.writeFileSync(path.join(evidence,'filter-validation-report.json'),encoded(report),{flag:'wx'});
  console.log(JSON.stringify({schema:report.schema,status:report.status,caseCount:report.caseCount,passed:report.passed,failed,productTests:0,originalExecutions:0}));if(failed)process.exitCode=1;
}
function finalize(){
  boundary();const allowed=['console-filter-validation.json','console-filter-validation.stderr.txt','console-filter-validation.stdout.txt','filter-validation-report.json'];
  const actual=fs.readdirSync(evidence).sort();assert.deepEqual(actual,[...allowed].sort());const identities=[];
  for(const name of allowed){const full=path.join(evidence,name),s=fs.lstatSync(full);assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size<=2*1024*1024);const b=fs.readFileSync(full);assert.equal(scanProfile(b,name,'finite').omit,false);identities.push({path:name,...id(b)});}
  const report=JSON.parse(fs.readFileSync(path.join(evidence,'filter-validation-report.json'),'utf8'));assert.equal(report.schema,'rea-hosted-synthetic-safe-evidence-filter-validation/v1');assert.equal(report.source,process.env.GITHUB_SHA);assert.equal(report.runID,runID);assert.equal(report.attempt,attempt);assert(['passed','failed'].includes(report.status));assert.equal(report.caseCount,35);assert.equal(report.cases.length,35);assert(report.cases.every(row=>['passed','failed'].includes(row.status)));assert.equal(report.failed,report.cases.filter(row=>row.status!=='passed').length);assert.equal(report.passed,35-report.failed);assert.equal(report.status,report.failed?'failed':'passed');
  const capture=JSON.parse(fs.readFileSync(path.join(evidence,'console-filter-validation.json'),'utf8'));assert(['passed','failed'].includes(capture.status));assert.equal(capture.phase,'filter-validation');assert.equal(capture.source,process.env.GITHUB_SHA);assert.equal(capture.runID,runID);assert.equal(capture.attempt,attempt);assert.equal(capture.rawChildOutputEchoed,false);
  for(const kind of['stdout','stderr'])assert.deepEqual(id(fs.readFileSync(path.join(evidence,capture[kind].path))),{bytes:capture[kind].bytes,sha256:capture[kind].sha256});
  const passed=report.status==='passed'&&capture.status==='passed'&&capture.exitCode===0&&capture.closeObserved===true&&capture.signal===null&&capture.droppedBytes===0&&report.cases.every(row=>row.ownedFixtureCleanup===true);
  const provenance={schema:'rea-synthetic-filter-validation-safe-artifact/v1',status:passed?'passed':'failed',source:process.env.GITHUB_SHA,parent:process.env.REA_NOTES_ORDER_PARENT,runID,attempt,job:process.env.GITHUB_JOB,representation:'sanitized synthetic filter-validation observations; source identities only',files:identities,rawSourceBodiesUploaded:false,completeOriginalProductArtifact:false,productTests:0,archiveOpens:0,fullProductAcceptance:false};
  const b=encoded(provenance);assert.equal(scanProfile(b,'filter-validation-provenance.json','finite').omit,false);fs.writeFileSync(path.join(evidence,'filter-validation-provenance.json'),b,{flag:'wx'});
  assert(typeof process.env.GITHUB_OUTPUT==='string');fs.appendFileSync(process.env.GITHUB_OUTPUT,'artifact_path='+evidence+'\n');console.log(JSON.stringify({schema:provenance.schema,status:provenance.status,files:5,productTests:0}));if(!passed)process.exitCode=1;
}
try{boundary();assert.equal(process.env.REA_SAFE_CONTROL_SENTINEL,undefined);if(process.argv.length===2)main();else{assert.deepEqual(process.argv.slice(2),['--finalize']);finalize();}}
catch(error){console.error(JSON.stringify({schema:'rea-filter-validation-safe-console/v1',status:'failed',code:typeof error.code==='string'&&/^[A-Z0-9_]{1,64}$/.test(error.code)?error.code:'VALIDATION_REFUSED',productTests:0}));process.exitCode=1;}
