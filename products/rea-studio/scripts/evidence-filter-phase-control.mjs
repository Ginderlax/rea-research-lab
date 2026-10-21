// Hosted synthetic filter-phase controls only. No product, original, archive
// parser, test suite, cipher/KDF/CRC or network client is imported or run.
// Workflow bootstrap must capture this driver's own streams privately too.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const EXPECTED_BRANCH='experiment/evidence-filter-phase-validation-20261021';
const EXPECTED_PARENT='393a2051d4825a222056fb639441bce022e552c2';
const sha=b=>createHash('sha256').update(b).digest('hex');
const id=b=>({bytes:b.length,sha256:sha(b)});
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const encoded=v=>Buffer.from(JSON.stringify(v,null,2)+'\n');
const HASH=/^[0-9a-f]{64}$/;
const KEYS=['dev','ino','size','mtimeNs','ctimeNs'];
function plain(full,file=false){
  assert(path.isAbsolute(full));let at=path.parse(full).root;
  for(const part of full.slice(at.length).split(path.sep).filter(Boolean)){
    at=path.join(at,part);const s=fs.lstatSync(at);assert(!s.isSymbolicLink());assert(at===full&&file?s.isFile():s.isDirectory());if(at===full&&file)assert.equal(s.nlink,1);
  }
  assert.equal(fs.realpathSync(full).toLowerCase(),full.toLowerCase());return full;
}
function read(full,maximum=2097152){
  plain(full,true);const before=fs.lstatSync(full,{bigint:true});assert(before.size<=BigInt(maximum));const fd=fs.openSync(full,'r');
  try{
    const opened=fs.fstatSync(fd,{bigint:true});for(const key of KEYS)assert.equal(opened[key],before[key]);
    const b=Buffer.alloc(Number(before.size)+1);let offset=0;while(offset<b.length){const n=fs.readSync(fd,b,offset,b.length-offset,null);if(!n)break;offset+=n;}
    const after=fs.fstatSync(fd,{bigint:true}),atPath=fs.lstatSync(full,{bigint:true});assert(atPath.isFile()&&!atPath.isSymbolicLink()&&atPath.nlink===1n);
    for(const key of KEYS){assert.equal(after[key],before[key]);assert.equal(atPath[key],before[key]);}assert.equal(offset,Number(before.size));return b.subarray(0,offset);
  }finally{fs.closeSync(fd);}
}
function json(full){return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(read(full)));}
function save(full,bytes){plain(path.dirname(full));fs.writeFileSync(full,bytes,{flag:'wx'});assert.deepEqual(read(full),bytes);}
function saveJSON(full,value){save(full,encoded(value));}
function exactKeys(value,keys){assert(value&&typeof value==='object'&&!Array.isArray(value));assert.deepEqual(Object.keys(value).sort(),[...keys].sort());}
function reviewed(full,expected){assert(HASH.test(expected));assert.equal(sha(read(full,262144)),expected);return full;}
function channelBytes(environment=process.env){
  return ['GITHUB_OUTPUT','GITHUB_ENV','GITHUB_PATH','GITHUB_STEP_SUMMARY','GITHUB_STATE'].map(name=>{
    const full=environment[name];assert(typeof full==='string'&&path.isAbsolute(full));const exists=fs.existsSync(full);return {name,full,exists,bytes:exists?read(full,1048576):Buffer.alloc(0)};
  });
}
function channelProjection(rows){return rows.map(({name,exists,bytes})=>({name,exists,...id(bytes)}));}
function noProfile(bytes){const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/\\/g,'/').replace(/\/+/g,'/');assert(!/[A-Za-z]:\/Users\/|\/(?:home|Users)\//i.test(text));}
function boundary(phase,direct){
  assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.version,'v24.16.0');
  for(const [name,value]of Object.entries({CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab',GITHUB_JOB:'validate',REA_ARCHIVE_ZIP_ROLE:'finite',REA_SAFE_FEATURE_BRANCH:EXPECTED_BRANCH,REA_ARCHIVE_ZIP_PARENT:EXPECTED_PARENT}))assert.equal(process.env[name],value);
  assert(!EXPECTED_BRANCH.startsWith('__'));assert(/^[0-9a-f]{40}$/.test(EXPECTED_PARENT));assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA));assert.equal(process.env.GITHUB_WORKFLOW_SHA,process.env.GITHUB_SHA);assert.equal(process.env.GITHUB_REF,'refs/heads/'+EXPECTED_BRANCH);
  assert(/^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ID));assert(/^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ATTEMPT));assert(['filter-success','filter-refusal'].includes(process.env.REA_SAFE_CONTROL_MODE));
  assert(['capture','finalize','admit'].includes(phase));if(direct){assert.deepEqual(process.argv.slice(2),['--phase',phase]);}else{assert.equal(phase,'capture');assert.deepEqual(process.argv.slice(2),[]);}
}
function main(phase,direct){
  boundary(phase,direct);const mode=process.env.REA_SAFE_CONTROL_MODE,success=mode==='filter-success',runID=process.env.GITHUB_RUN_ID,attempt=process.env.GITHUB_RUN_ATTEMPT,suffix=runID+'-'+attempt;
  const temporary=fs.realpathSync(process.env.RUNNER_TEMP);plain(temporary);
  const raw=path.join(temporary,'rea-archive-zip-aes-finite-'+suffix),safe=path.join(temporary,'rea-safe-archive-finite-'+suffix),consoleRoot=path.join(temporary,'rea-safe-archive-filter-console-finite-'+suffix);
  const privateRoot=path.join(temporary,'rea-filter-phase-private-'+mode+'-'+suffix),publicRoot=path.join(temporary,'rea-filter-phase-public-'+mode+'-'+suffix),admission=path.join(temporary,'rea-filter-validation-admission-'+suffix);
  for(const root of[raw,safe,consoleRoot,privateRoot,publicRoot,admission])assert.equal(path.dirname(root),temporary);
  const studio=fileURLToPath(new URL('../',import.meta.url));
  reviewed(fileURLToPath(import.meta.url),process.env.REA_SAFE_FILTER_PHASE_CONTROL_SHA256);
  const capture=reviewed(path.join(studio,'scripts/capture-safe-cloud-console.mjs'),process.env.REA_SAFE_CAPTURE_SHA256);
  reviewed(path.join(studio,'scripts/prepare-safe-cloud-evidence.mjs'),process.env.REA_SAFE_FILTER_SHA256);
  const policyFile=reviewed(path.join(studio,'experiments/archive-safe-evidence/policy.json'),process.env.REA_SAFE_EVIDENCE_POLICY_SHA256);
  const execution={repository:process.env.GITHUB_REPOSITORY,source:process.env.GITHUB_SHA,parent:EXPECTED_PARENT,workflowSHA:process.env.GITHUB_WORKFLOW_SHA,ref:process.env.GITHUB_REF,runID,attempt,job:'validate',role:'finite'};
  const subject={source:execution.source,parent:EXPECTED_PARENT,runID,attempt,job:'validate',control:mode};
  const checkFile=path.join(privateRoot,'control-check.json');
  const publicNames=['filter-phase-summary.json','source-admission-before.json','source-admission-after.json','filter-phase-provenance.json'];
  if(phase==='capture'){
    for(const root of[raw,safe,consoleRoot,privateRoot,publicRoot])assert(!fs.existsSync(root));fs.mkdirSync(privateRoot);plain(privateRoot);
    const forbidden=['GITHUB_OUTPUT','GITHUB_ENV','GITHUB_PATH','GITHUB_STEP_SUMMARY','GITHUB_STATE','GITHUB_TOKEN','GH_TOKEN','ACTIONS_RUNTIME_TOKEN','ACTIONS_ID_TOKEN_REQUEST_TOKEN','ACTIONS_ID_TOKEN_REQUEST_URL'];
    for(const name of forbidden)assert(!Object.keys(process.env).some(actual=>actual.toUpperCase()===name));
    const innerEnvironment={...process.env};for(const name of forbidden.slice(0,5)){const file=path.join(privateRoot,'private-parent-'+name.toLowerCase()+'.txt');save(file,Buffer.alloc(0));innerEnvironment[name]=file;}
    // This is the same closed owned40 source fixture as the earlier17 controls.
    // Its deliberately invalid UTF8 tail is eight literal bytes, not an archive.
    const opaque={path:'synthetic/sources/owned-invalid-utf8.zst',bytes:Buffer.from([0x28,0xb5,0x2f,0xfd,0xff,0xfe,0x00,0x01])};
    const bodies=Array.from({length:40},(_,index)=>index===39?opaque:({path:'synthetic/sources/owned-'+String(index).padStart(2,'0')+'.mjs',bytes:index===0?Buffer.from('const value="C:/Users/Synthetic Owner/data";\n'):Buffer.from('synthetic control source '+index+'\n')}));
    const sourceRows=bodies.map(({path,bytes})=>({path,...id(bytes)}));
    const expectedPolicy={schema:'rea-safe-cloud-evidence-policy/v1',branch:EXPECTED_BRANCH,parent:EXPECTED_PARENT,sourceManifest:'synthetic/source-admission.json',workflow:'.github/workflows/synthetic-filter-fixture.yml',expectedSourceOmissions:[bodies[0].path],sourceOpaquePins:[{path:opaque.path,...id(opaque.bytes)}],runnerLogPaths:['archive-finite.stdout.txt'],roles:Object.fromEntries(['finite','zip-original','browser'].map(role=>[role,[{pattern:'^source-(?:before|after)\\.json$',kind:'text',maxBytes:1048576},{pattern:'^result\\.txt$',kind:'text',maxBytes:1048576}]]))};
    assert.deepEqual(json(policyFile),expectedPolicy);
    const manifest=encoded({schema:'rea-archive-zip-aes-source-admission/v1',parent:EXPECTED_PARENT,files:sourceRows}),workflow=Buffer.from('name: owned synthetic filter control\n');
    const environment={GITHUB_SHA:execution.source,GITHUB_WORKFLOW_SHA:execution.source,GITHUB_REPOSITORY:execution.repository,GITHUB_RUN_ID:runID,GITHUB_RUN_ATTEMPT:attempt,GITHUB_JOB:'validate',REA_ARCHIVE_ZIP_ROLE:'finite',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64'};
    fs.mkdirSync(raw);plain(raw);const write=(name,bytes)=>{const full=path.join(raw,...name.split('/'));fs.mkdirSync(path.dirname(full),{recursive:true});save(full,bytes);};
    for(const phase of['before','after']){
      for(const row of bodies)write('source-'+phase+'/'+row.path,row.bytes);
      write('source-'+phase+'/'+expectedPolicy.sourceManifest,manifest);write('source-'+phase+'/'+expectedPolicy.workflow,workflow);
      write('source-'+phase+'.json',encoded({schema:'rea-archive-zip-aes-source-check/v1',status:'authenticated',phase,soleParent:EXPECTED_PARENT,execution:environment,manifest:{path:expectedPolicy.sourceManifest,...id(manifest),gitBlob:blob(manifest)},workflow:{path:expectedPolicy.workflow,...id(workflow),gitBlob:blob(workflow)},sourceFiles:sourceRows.map((row,index)=>({...row,gitBlob:blob(bodies[index].bytes)})),sourceFilesCount:40,sourceBytes:bodies.reduce((n,row)=>n+row.bytes.length,0),sourceOverlay:false,historicalReceiptsRebound:false,productExecutionsByAdmission:0}));
    }
    write('result.txt',Buffer.from(success?'safe result\n':'C:/Users/SyntheticOwner/late'));
    const before=channelBytes(innerEnvironment),outcome=spawnSync(process.execPath,[capture,'--phase','filter','--evidence',raw],{cwd:process.env.GITHUB_WORKSPACE,env:{...innerEnvironment,REA_SAFE_EVIDENCE:safe,REA_ARCHIVE_ZIP_MANIFEST_SHA256:sha(manifest)},encoding:null,shell:false,windowsHide:true,timeout:330000,maxBuffer:131072,stdio:['ignore','pipe','pipe']}),after=channelBytes(innerEnvironment);
    assert.equal(outcome.error,undefined);assert.equal(outcome.signal,null);assert.equal(outcome.status,success?0:1);assert(Buffer.isBuffer(outcome.stdout)&&Buffer.isBuffer(outcome.stderr));assert.equal(outcome.stderr.length,0);
    save(path.join(privateRoot,'wrapper.stdout.txt'),outcome.stdout);save(path.join(privateRoot,'wrapper.stderr.txt'),outcome.stderr);
    for(let index=0;index<before.length;index++){
      const prior=before[index],next=after[index];assert.equal(prior.name,next.name);assert.equal(prior.full,next.full);
      if(success&&prior.name==='GITHUB_OUTPUT'){assert.equal(next.exists,true);assert.deepEqual(next.bytes,Buffer.concat([prior.bytes,Buffer.from('artifact_path='+safe+'\n')]));}
      else {assert.equal(next.exists,prior.exists);assert.deepEqual(next.bytes,prior.bytes);}
    }
    noProfile(outcome.stdout);const top=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(outcome.stdout));
    exactKeys(top,['schema','phase','role','source','status','stdoutBytes','stderrBytes','droppedBytes','exitCode','closeObserved','failureCode','rawChildOutputEchoed']);
    assert.equal(top.schema,'rea-safe-capture-console/v1');assert.equal(top.phase,'filter');assert.equal(top.role,'finite');assert.equal(top.source,execution.source);assert.equal(top.status,success?'passed':'failed');assert.equal(top.exitCode,success?0:1);assert.equal(top.closeObserved,true);assert.equal(top.failureCode,null);assert.equal(top.droppedBytes,0);assert.equal(top.rawChildOutputEchoed,false);
    assert.deepEqual(fs.readdirSync(consoleRoot).sort(),['console-filter.json','console-filter.stderr.txt','console-filter.stdout.txt','private-filter-output.txt'].sort());
    const record=json(path.join(consoleRoot,'console-filter.json'));
    const recordKeys=['schema','phase','role','source','parent','runID','attempt','job','status','sourceCommand','stdout','stderr','droppedBytes','closeObserved','exitCode','signal','failureCode','rawChildOutputEchoed','originalExecutionAcceptance',...(success?['safeFilterProjection']:[])];exactKeys(record,recordKeys);
    for(const key of['source','parent','runID','attempt','job'])assert.equal(record[key],subject[key]);assert.equal(record.schema,'rea-owned-top-level-console-capture/v1');assert.equal(record.phase,'filter');assert.equal(record.role,'finite');assert.equal(record.sourceCommand,'reviewed privacy filter');
    for(const key of['status','exitCode','closeObserved','failureCode','droppedBytes','rawChildOutputEchoed'])assert.equal(record[key],top[key]);assert.equal(record.signal,null);assert.equal(record.originalExecutionAcceptance,false);
    const streams={};for(const kind of['stdout','stderr']){exactKeys(record[kind],['path','bytes','limit','sha256']);assert.equal(record[kind].path,'console-filter.'+kind+'.txt');assert.equal(record[kind].limit,kind==='stdout'?8388608:2097152);streams[kind]=read(path.join(consoleRoot,record[kind].path),65536);assert.deepEqual(id(streams[kind]),{bytes:record[kind].bytes,sha256:record[kind].sha256});assert.equal(top[kind+'Bytes'],record[kind].bytes);}
    const fake=read(path.join(consoleRoot,'private-filter-output.txt'),4096);let projection;
    if(success){
      assert.equal(streams.stderr.length,0);projection=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(streams.stdout));exactKeys(projection,['schema','status','role','source','outputFiles','outputBytes','omittedFiles','rawCompleteArchiveUploaded','productAcceptance']);
      assert.equal(projection.schema,'rea-safe-evidence-filter-console/v1');assert.equal(projection.status,'safe-view-ready');assert.equal(projection.role,'finite');assert.equal(projection.source,execution.source);assert.equal(projection.outputFiles,88);assert.equal(projection.omittedFiles,2);assert.equal(projection.rawCompleteArchiveUploaded,false);assert.equal(projection.productAcceptance,false);assert.deepEqual(fake,Buffer.from('artifact_path='+safe+'\n'));
      const representation=json(path.join(safe,'safe-evidence.json'));assert.equal(representation.schema,'rea-safe-cloud-evidence-representation/v1');assert.equal(representation.status,'complete-derived-safe-view');assert.deepEqual(representation.execution,execution);assert.equal(representation.sourceManifestSHA256,sha(manifest));assert.equal(representation.originalFiles,87);assert.equal(representation.retainedFiles,85);assert.equal(representation.omittedFiles,2);assert.equal(representation.completeSourceAdmission,true);for(const key of['rawCompleteArchiveUploaded','historicalReceiptsRebound','productAcceptance','fullParity','superiority'])assert.equal(representation[key],false);
      const omissions=json(path.join(safe,'omissions.json'));assert.equal(omissions.schema,'rea-safe-cloud-whole-member-omissions/v1');assert.deepEqual(omissions.execution,execution);assert.equal(omissions.rows.length,2);
      assert.deepEqual(omissions.rows.map(row=>row.path).sort(),['source-before/'+bodies[0].path,'source-after/'+bodies[0].path].sort());for(const row of omissions.rows){assert.equal(row.reason,'ABSOLUTE_USER_PROFILE_PATH');assert.equal(row.sourceSnapshot,true);assert.equal(row.bytes,bodies[0].bytes.length);assert.equal(row.sha256,sha(bodies[0].bytes));}
      for(const phase of['before','after']){assert(!fs.existsSync(path.join(safe,'source-'+phase,...bodies[0].path.split('/'))));assert.deepEqual(read(path.join(safe,'source-'+phase,...opaque.path.split('/'))),opaque.bytes);}
      assert.deepEqual(read(path.join(safe,'result.txt')),Buffer.from('safe result\n'));
      const generated=['safe-evidence.json','omissions.json','retained-members.json'].map(name=>read(path.join(safe,name)));assert.equal(projection.outputBytes,representation.retainedBytes+generated.reduce((n,b)=>n+b.length,0));
      exactKeys(record.safeFilterProjection,['verified','outputFiles','outputBytes','omittedFiles','realOutputChannelInherited','rawFilterStreamsUploaded']);assert.deepEqual(record.safeFilterProjection,{verified:true,outputFiles:88,outputBytes:projection.outputBytes,omittedFiles:2,realOutputChannelInherited:false,rawFilterStreamsUploaded:false});
    }else{
      assert.equal(streams.stdout.length,0);projection=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(streams.stderr));exactKeys(projection,['schema','status','code','artifactPathProduced','productAcceptance']);assert.deepEqual(projection,{schema:'rea-safe-evidence-filter-console/v1',status:'failed',code:'UNEXPECTED_PROFILE_RESULT',artifactPathProduced:false,productAcceptance:false});assert.equal(fake.length,0);assert(!fs.existsSync(safe));
    }
    // Only identities, fixed booleans/counts and the fixed refusal code survive
    // in the publishable observation. Raw trees and child streams stay private.
    saveJSON(checkFile,{schema:'rea-hosted-captured-filter-phase-control-check/v1',status:'passed',...subject,syntheticOnly:true,fixtureSourceRecordsSynthetic:true,actualFilterCLIInvoked:true,capturePhaseInvocations:1,wrapperExitCode:outcome.status,childExitCode:record.exitCode,childStatus:record.status,expectedChildFailurePreserved:!success,privateFakeOutputBytes:fake.length,privateParentArtifactPathWritten:success,privateParentOutputAppendExact:success,privateParentFileCommandChannelsQualified:true,realFileCommandAndTokenEnvironmentAbsent:true,privateParentChannelsOwned:true,privateParentChannelsBefore:channelProjection(before),privateParentChannelsAfter:channelProjection(after),wrapperStdout:id(outcome.stdout),wrapperStderr:id(outcome.stderr),capturedFilterStdout:id(streams.stdout),capturedFilterStderr:id(streams.stderr),safeOutputExists:success,safeOutputFiles:success?88:0,omittedFiles:success?2:0,fixedRefusalCode:success?null:'UNEXPECTED_PROFILE_RESULT',rawFilterStreamsUploaded:false,rawFixtureTreesUploaded:false,rawChildBytesEchoedToJobConsole:false,productImports:0,productTests:0,originalExecutions:0,archiveOpens:0,cipherKDFCRCExecutions:0,network:0,fullProductAcceptance:false});
  }else if(phase==='finalize'){
    plain(privateRoot);plain(admission);assert(!fs.existsSync(publicRoot));const check=json(checkFile);
    exactKeys(check,['schema','status','source','parent','runID','attempt','job','control','syntheticOnly','fixtureSourceRecordsSynthetic','actualFilterCLIInvoked','capturePhaseInvocations','wrapperExitCode','childExitCode','childStatus','expectedChildFailurePreserved','privateFakeOutputBytes','privateParentArtifactPathWritten','privateParentOutputAppendExact','privateParentFileCommandChannelsQualified','realFileCommandAndTokenEnvironmentAbsent','privateParentChannelsOwned','privateParentChannelsBefore','privateParentChannelsAfter','wrapperStdout','wrapperStderr','capturedFilterStdout','capturedFilterStderr','safeOutputExists','safeOutputFiles','omittedFiles','fixedRefusalCode','rawFilterStreamsUploaded','rawFixtureTreesUploaded','rawChildBytesEchoedToJobConsole','productImports','productTests','originalExecutions','archiveOpens','cipherKDFCRCExecutions','network','fullProductAcceptance']);
    assert.equal(check.schema,'rea-hosted-captured-filter-phase-control-check/v1');assert.equal(check.status,'passed');for(const key of Object.keys(subject))assert.equal(check[key],subject[key]);assert.equal(check.capturePhaseInvocations,1);assert.equal(check.wrapperExitCode,success?0:1);assert.equal(check.childExitCode,success?0:1);assert.equal(check.childStatus,success?'passed':'failed');assert.equal(check.expectedChildFailurePreserved,!success);assert.equal(check.safeOutputFiles,success?88:0);assert.equal(check.omittedFiles,success?2:0);assert.equal(check.fixedRefusalCode,success?null:'UNEXPECTED_PROFILE_RESULT');assert.equal(check.safeOutputExists,success);assert.equal(fs.existsSync(safe),success);
    for(const key of['syntheticOnly','fixtureSourceRecordsSynthetic','actualFilterCLIInvoked','privateParentFileCommandChannelsQualified','realFileCommandAndTokenEnvironmentAbsent','privateParentChannelsOwned'])assert.equal(check[key],true);
    for(const key of['rawFilterStreamsUploaded','rawFixtureTreesUploaded','rawChildBytesEchoedToJobConsole','fullProductAcceptance'])assert.equal(check[key],false);for(const key of['productImports','productTests','originalExecutions','archiveOpens','cipherKDFCRCExecutions','network'])assert.equal(check[key],0);assert.equal(check.privateParentArtifactPathWritten,success);assert.equal(check.privateParentOutputAppendExact,success);
    const channelNames=['GITHUB_OUTPUT','GITHUB_ENV','GITHUB_PATH','GITHUB_STEP_SUMMARY','GITHUB_STATE'];for(const key of['privateParentChannelsBefore','privateParentChannelsAfter']){assert(Array.isArray(check[key]));assert.equal(check[key].length,5);for(let index=0;index<5;index++){const row=check[key][index];exactKeys(row,['name','exists','bytes','sha256']);assert.equal(row.name,channelNames[index]);assert.equal(row.exists,true);assert(Number.isSafeInteger(row.bytes)&&row.bytes>=0&&row.bytes<=1048576);assert(HASH.test(row.sha256));}}
    for(const key of['wrapperStdout','wrapperStderr','capturedFilterStdout','capturedFilterStderr']){exactKeys(check[key],['bytes','sha256']);assert(Number.isSafeInteger(check[key].bytes)&&check[key].bytes>=0&&check[key].bytes<=131072);assert(HASH.test(check[key].sha256));}assert.equal(check.wrapperStderr.bytes,0);assert.equal(check.privateFakeOutputBytes,success?read(path.join(consoleRoot,'private-filter-output.txt'),4096).length:0);noProfile(encoded(check));
    const before=json(path.join(admission,'source-admission-before.json')),after=json(path.join(admission,'source-admission-after.json'));for(const [phase,value]of[['before',before],['after',after]]){assert.equal(value.schema,'rea-synthetic-evidence-control-source-check/v1');assert.equal(value.status,'authenticated');assert.equal(value.phase,phase);for(const key of Object.keys(subject))assert.equal(value[key],subject[key]);assert.equal(value.branch,EXPECTED_BRANCH);assert.equal(value.sourceBodiesUploaded,false);assert.equal(value.productExecutions,0);assert.equal(value.historicalReceiptsRebound,false);}assert.deepEqual(before.rows,after.rows);assert.deepEqual(before.manifest,after.manifest);assert.deepEqual(before.workflow,after.workflow);
    fs.mkdirSync(publicRoot);saveJSON(path.join(publicRoot,'filter-phase-summary.json'),check);for(const phase of['before','after'])save(path.join(publicRoot,'source-admission-'+phase+'.json'),read(path.join(admission,'source-admission-'+phase+'.json')));
    const rows=publicNames.slice(0,3).map(name=>{const b=read(path.join(publicRoot,name));noProfile(b);return {path:name,...id(b)};});saveJSON(path.join(publicRoot,'filter-phase-provenance.json'),{schema:'rea-synthetic-captured-filter-phase-safe-artifact/v1',status:'passed',...subject,files:rows,representation:'fixed synthetic filter-phase observations and actual control-source identities only',rawFilterStreamsUploaded:false,rawFixtureTreesUploaded:false,sourceBodiesUploaded:false,productTests:0,originalExecutions:0,archiveOpens:0,fullProductAcceptance:false});
  }else{
    plain(publicRoot);assert.deepEqual(fs.readdirSync(publicRoot).sort(),[...publicNames].sort());const provenance=json(path.join(publicRoot,'filter-phase-provenance.json'));assert.equal(provenance.schema,'rea-synthetic-captured-filter-phase-safe-artifact/v1');assert.equal(provenance.status,'passed');for(const key of Object.keys(subject))assert.equal(provenance[key],subject[key]);assert.equal(provenance.files.length,3);assert.deepEqual(provenance.files.map(row=>row.path),publicNames.slice(0,3));for(const row of provenance.files){const b=read(path.join(publicRoot,row.path));noProfile(b);assert.deepEqual(id(b),{bytes:row.bytes,sha256:row.sha256});}noProfile(read(path.join(publicRoot,'filter-phase-provenance.json')));for(const name of publicNames)assert(fs.lstatSync(path.join(publicRoot,name)).isFile());
  }
  console.log(JSON.stringify({schema:'rea-safe-filter-phase-control-console/v1',status:'passed',phase,control:mode,source:execution.source,productExecutions:0}));
}
function safely(phase,direct){try{main(phase,direct);}catch{console.error(JSON.stringify({schema:'rea-safe-filter-phase-control-console/v1',status:'failed',code:'FILTER_PHASE_CONTROL_REFUSED',productExecutions:0}));process.exitCode=1;}}
export function runCapturedFilterPhaseControl(){safely('capture',false);}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))safely(process.argv[3],true);
