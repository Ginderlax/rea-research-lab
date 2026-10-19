// New hosted-only Notes46 execution wrapper. Existing full collector/composer
// and every retained test body remain unchanged. No application writes occur.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { parseNotes46Tap } from './notes46-installed-tap-roster.mjs';

const repository = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const studio = path.join(repository, 'products/rea-studio');
const prefix = 'products/rea-studio/experiments/notes46-installed-search-20261019';
const floorPath = prefix + '/REGRESSION-FLOOR.json';
const floorPin = { bytes: 229516, sha256: 'ce944a283cafb3ca3c8432b5bab826aee3f0b51d09d4c2b940a4e9b7727f8f40' };
const parent = '2a8482b42784eb262d6d5b82e62d8d1220dc4821';
const branch = 'refs/heads/experiment/notes46-installed-search-20261019';
const workflowPath = '.github/workflows/notes46-installed-search-full-cloud.yml';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = bytes => ({ bytes: bytes.length, sha256: sha(bytes) });
const pin = row => ({ bytes: row.bytes, sha256: row.sha256 });
const gitBlob = bytes => createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
const slash = value => value.replaceAll('\\', '/');
const environmentNames = ['CI','GITHUB_ACTIONS','RUNNER_ENVIRONMENT','RUNNER_OS','RUNNER_ARCH','GITHUB_REPOSITORY','GITHUB_SHA','GITHUB_REF','GITHUB_EVENT_NAME','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_JOB','GITHUB_WORKFLOW','GITHUB_SERVER_URL'];
const execution = () => Object.fromEntries(environmentNames.map(name => [name, process.env[name]]));
const args = process.argv.slice(2);
assert.equal(args.length, 6); assert.equal(args[0], '--scope'); assert(['full','finite'].includes(args[1]));
assert.equal(args[2], '--phase'); assert(['before','verify','postcheck'].includes(args[3])); assert.equal(args[4], '--evidence'); assert(path.isAbsolute(args[5]));
const scope = args[1], phase = args[3];
assert.equal(process.platform, 'win32'); assert.equal(process.arch, 'x64'); assert.equal(process.version, 'v24.16.0');
for (const [name,value] of Object.entries({CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab',GITHUB_REF:branch,GITHUB_EVENT_NAME:'push',GITHUB_SERVER_URL:'https://github.com',GITHUB_JOB:scope==='full'?'full-oracle-experiment':'notes46-installed-finite'})) assert.equal(process.env[name],value,name);
for (const name of ['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT']) assert(/^[1-9][0-9]*$/.test(process.env[name]));
assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA));
function safe(name) { assert(typeof name==='string'&&name.length&&name.length<=2048&&!/[\\:\x00-\x1f\x7f<>"|?*]/.test(name)&&!name.startsWith('/')); const parts=name.split('/');assert(parts.length<=32);for(const p of parts)assert(p&&p!=='.'&&p!=='..'&&p===p.replace(/[ .]+$/,'')&&!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p));return name; }
function noLinks(filename) { let at=path.resolve(filename);for(;;){assert(!fs.lstatSync(at).isSymbolicLink(),'Link: '+at);const up=path.dirname(at);if(up===at)break;at=up;}assert.equal(fs.realpathSync(filename).toLowerCase(),path.resolve(filename).toLowerCase()); }
const temporary=fs.realpathSync(process.env.RUNNER_TEMP),expected=path.join(temporary,'rea-notes46-'+scope+'-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT);
assert.equal(path.resolve(args[5]).toLowerCase(),expected.toLowerCase()); noLinks(expected);const evidence=fs.realpathSync(expected);assert(fs.lstatSync(evidence).isDirectory());
function read(root,name,maximum=512*1024){const filename=path.join(root,safe(name));noLinks(filename);const s=fs.lstatSync(filename);assert(s.isFile()&&s.size<=maximum);const bytes=fs.readFileSync(filename);assert.equal(bytes.length,s.size);return bytes;}
function write(name,bytes){const filename=path.join(evidence,safe(name));fs.mkdirSync(path.dirname(filename),{recursive:true});noLinks(path.dirname(filename));fs.writeFileSync(filename,bytes,{flag:'wx'});assert.deepEqual(read(evidence,name,Math.max(8*1024*1024,bytes.length)),bytes);}
const save=(name,value)=>write(name,Buffer.from(JSON.stringify(value,null,2)+'\n'));
function git(arguments_,maximum=32*1024*1024){const r=spawnSync('git',arguments_,{cwd:repository,shell:false,windowsHide:true,timeout:30000,maxBuffer:maximum});assert.equal(r.error,undefined);assert.equal(r.status,0);assert.equal(r.signal,null);return r.stdout;}
assert.equal(git(['rev-parse','HEAD']).toString().trim(),process.env.GITHUB_SHA);
assert.equal(git(['rev-list','--parents','-n','1','HEAD']).toString().trim(),process.env.GITHUB_SHA+' '+parent);
assert.equal(git(['rev-parse','--show-object-format']).toString().trim(),'sha1');
const tree=new Map(git(['ls-tree','-rz','HEAD']).toString().split('\0').filter(Boolean).map(line=>{const [meta,name]=line.split('\t'),[mode,type,oid]=meta.split(' ');return[name,{mode,type,oid}];}));
function committed(name,bytes){const row=tree.get(name);assert(row&&row.mode==='100644'&&row.type==='blob');assert.equal(gitBlob(bytes),row.oid,'Current source differs from committed Git: '+name);return row.oid;}
const floorBytes=read(repository,floorPath);assert.deepEqual(identity(floorBytes),floorPin);committed(floorPath,floorBytes);const floor=JSON.parse(floorBytes);
assert.equal(floor.schema,'rea-notes46-installed-search-regression-floor/v1');assert.equal(floor.branch,branch);assert.equal(floor.baselineParent,parent);
const originalFloorBytes=read(repository,floor.oldFloor.path);assert.deepEqual(identity(originalFloorBytes),pin(floor.oldFloor));const originalFloor=JSON.parse(originalFloorBytes);
const fixedRoles=[floorPath,'products/rea-studio/scripts/notes46-installed-tap-roster.mjs','products/rea-studio/scripts/verify-notes46-installed-cloud.mjs','products/rea-studio/scripts/verify-notes46-installed-roster.mjs',workflowPath];
const immutable=[floor.oldFloor,floor.oldCore,floor.oldFlatGate,floor.oldComposer,{path:originalFloor.baseline.rawTAP.path,...pin(originalFloor.baseline.rawTAP)},{path:'products/rea-studio/experiments/bsdtar-oracle/bundle.json',bytes:7684,sha256:'9a04b60ed08f21fd1b5efd17c37645de27e3149ee7bc2fba61e42731ff638ced'}];
const inputs=[...floor.installedSourceInputs,{path:floor.finite.separateHTTP.path,...floor.finite.separateHTTP.source},...immutable,...fixedRoles.map(name=>({path:name}))];
assert.equal(floor.installedSourceInputs.length,128);assert.equal(inputs.length,140);assert.equal(new Set(inputs.map(r=>r.path.toLowerCase())).size,140);
for(const row of immutable){const b=read(repository,row.path);assert.deepEqual(identity(b),pin(row));committed(row.path,b);}
function noteNames(root,depth=0){assert(depth<=32);const rows=[];noLinks(root);for(const entry of fs.readdirSync(root,{withFileTypes:true})){if(entry.name==='results')continue;assert(!entry.isSymbolicLink());const full=path.join(root,entry.name);if(entry.isDirectory())rows.push(...noteNames(full,depth+1));else{assert(entry.isFile());rows.push(slash(path.relative(repository,full)));}}return rows.sort();}
function status(){return git(['status','--porcelain=v1','-z','--untracked-files=all']).toString().split('\0').filter(Boolean).map(line=>({status:line.slice(0,2),path:line.slice(3)})).sort((a,b)=>a.path.localeCompare(b.path));}
function capture(kind){const errors=[],rows=[];let total=0;const names=noteNames(path.join(studio,'apps/notes')),expectedNotes=floor.installedSourceInputs.filter(r=>r.path.startsWith('products/rea-studio/apps/notes/')).map(r=>r.path).sort();
  if(JSON.stringify(names)!==JSON.stringify(expectedNotes))errors.push({path:'actual Notes census',message:'Physical Notes paths differ from exact46 declarations'});assert.equal(expectedNotes.length,46);
  for(const row of inputs){try{const bytes=read(repository,row.path,floor.sourceLimits.memberBytes);total+=bytes.length;assert(total<=floor.sourceLimits.rawBytes);const observed={path:row.path,...identity(bytes),gitBlob:gitBlob(bytes)};rows.push(observed);write('notes46-source-'+kind+'/'+row.path+'.snapshot',bytes);if(row.sha256)assert.deepEqual(identity(bytes),pin(row));committed(row.path,bytes);}catch(error){errors.push({path:row.path,name:error.name,message:String(error.message).slice(0,4000)});}}
  assert(rows.length<=floor.sourceLimits.files);const result={schema:'rea-notes46-installed-execution-source-capture/v1',execution:execution(),scope,phase:kind,sourceCommit:process.env.GITHUB_SHA,sourceEpoch:floor.sourceEpoch,floor:floorPin,selectedNotesSources:46,studySources:10,selectedSemanticInputs:128,cycleFreeAndImmutableRoles:12,files:rows.length,rawBytes:total,limits:floor.sourceLimits,actualNotes:names,gitStatus:status(),rows,safeObservedSourceBytesPreserved:true,contentsPreserved:errors.length===0,authenticationErrors:errors,sourceAuthenticated:errors.length===0};save('notes46-source-'+kind+'.json',result);assert.equal(errors.length,0,'Actual bounded sources/errors were preserved before rejection');assert.equal(rows.length,140);return result;}

const overlayPaths=[
  {path:'products/rea-studio/apps/archive/bsdtar-original-test-helper.mjs',status:'??'},
  {path:'products/rea-studio/apps/archive/formats.test.mjs',status:' M'},
  {path:'products/rea-studio/apps/archive/zstd.test.mjs',status:' M'}
].sort((a,b)=>a.path.localeCompare(b.path));
function requireVisibleState(kind){
  const actual=status();
  if(scope==='finite'||kind==='before')assert.deepEqual(actual,[],'Only clean committed installed sources are accepted for this phase');
  else {
    assert.deepEqual(actual,overlayPaths,'Only the three separately authenticated oracle-test changes are allowed');
    const composition=JSON.parse(read(evidence,'bsdtar-composition.json',2*1024*1024));
    assert.equal(composition.schema,'rea-bsdtar-oracle-hosted-composition/v1');
    assert.equal(composition.status,'composed-unexecuted-oracle-test-overlay');assert.equal(composition.sourceCommit,process.env.GITHUB_SHA);
    assert.deepEqual(composition.gitStatus,overlayPaths);
    for(const name of ['GITHUB_SHA','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_REPOSITORY'])assert.equal(composition.execution[name],process.env[name]);
    if(kind==='postcheck'){
      const checked=JSON.parse(read(evidence,'bsdtar-postrun-source-check.json',2*1024*1024));
      assert.equal(checked.schema,'rea-bsdtar-oracle-hosted-postrun-source-check/v1');assert.equal(checked.sourceStable,true);assert.equal(checked.checkedTargets,3);
      assert.equal(checked.baselineGitCommit,process.env.GITHUB_SHA);assert.equal(checked.compositionSHA256,sha(read(evidence,'bsdtar-composition.json',2*1024*1024)));
      assert.deepEqual(checked.gitStatus,overlayPaths);
    }
  }
  return actual;
}
function preserveTrashObservation(){
  const name='products/rea-studio/.local/notes-notebook-trash-observations/trash-original.json';
  if(fs.existsSync(path.join(repository,name))){const bytes=read(repository,name,512*1024);write('notes46-notebook-trash-observation.json',bytes);return{actualNewAttemptObservation:true,source:name,...identity(bytes)};}
  return null;
}

function sameAttempt(value){assert.deepEqual(value.execution,execution());assert.equal(value.scope,scope);assert.equal(value.sourceCommit,process.env.GITHUB_SHA);assert.deepEqual(value.floor,floorPin);}
let activeChild=null,activeStop=null,receivedSignal=null;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{receivedSignal??=signal;if(activeStop)activeStop();});
function stopOwned(){
  const result={scope:'Only the still-running owned child PID and its native tree',attempted:false,nativeAttempted:false,nativeExitCode:null,nativeSignal:null,nativeError:null,directKillAttempted:false,directKillReturned:null,errors:[],descendantTerminationConfirmed:false};
  if(activeChild?.pid&&activeChild.exitCode===null&&activeChild.signalCode===null){
    result.attempted=true;result.childPid=activeChild.pid;
    try {
      const nativeTaskkill=path.join(process.env.SystemRoot,'System32/taskkill.exe');noLinks(nativeTaskkill);assert(fs.lstatSync(nativeTaskkill).isFile());result.nativeExecutable=nativeTaskkill;result.nativeAttempted=true;
      const r=spawnSync(nativeTaskkill,['/PID',String(activeChild.pid),'/T','/F'],{windowsHide:true,shell:false,timeout:10000,stdio:'ignore'});
      result.nativeExitCode=r.status;result.nativeSignal=r.signal;result.nativeError=r.error?{name:r.error.name,message:r.error.message}:null;
    }catch(error){result.errors.push({stage:'owned-native-tree-termination',name:error.name,message:String(error.message).slice(0,4000)});}
    if(result.nativeExitCode!==0||result.nativeError){try{result.directKillAttempted=true;result.directKillReturned=activeChild.kill('SIGKILL');}catch(error){result.errors.push({stage:'owned-direct-child-termination',name:error.name,message:String(error.message).slice(0,4000)});}}
  }
  return result;
}
async function runNode(arguments_,folder,timeoutMs,stdoutLimit=1024*1024,stderrLimit=1024*1024,extra={}) {
  const chunks={stdout:[],stderr:[]},counts={stdout:0,stderr:0};
  let overflow=false,timedOut=false,error=null,termination=null,forcedStreamClose=false;
  const result=await new Promise(resolve=>{
    let settled=false,force=null,timer=null,stopping=false;
    const finish=(code,signal,closed)=>{if(settled)return;settled=true;clearTimeout(timer);clearTimeout(force);resolve({code,signal,closeObserved:closed});};
    const child=spawn(process.execPath,arguments_,{cwd:studio,env:{...process.env,GITHUB_SERVER_URL:'https://github.com',...extra},shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
    activeChild=child;
    const stop=()=>{
      if(stopping||settled)return;stopping=true;
      // Install the bounded fallback before any native-path/kill operation can fail.
      force=setTimeout(()=>{
        forcedStreamClose=true;
        try{for(const channel of ['stdout','stderr'])try{child[channel].destroy();}catch(value){error??={name:value.name,message:value.message};}}
        finally{finish(null,null,false);}
      },5000);
      try{termination=stopOwned();}catch(value){termination={attempted:true,scope:'Owned child only',descendantTerminationConfirmed:false,errors:[{name:value.name,message:String(value.message).slice(0,4000)}]};}
    };
    activeStop=stop;if(receivedSignal)stop();
    timer=setTimeout(()=>{timedOut=true;stop();},timeoutMs);
    for(const [channel,limit]of [['stdout',stdoutLimit],['stderr',stderrLimit]]) child[channel].on('data',bytes=>{
      if(settled)return;const take=Math.max(0,Math.min(bytes.length,limit-counts[channel]));
      if(take){chunks[channel].push(bytes.subarray(0,take));counts[channel]+=take;}
      if(take<bytes.length){overflow=true;stop();}
    });
    for(const channel of ['stdout','stderr'])child[channel].on('error',value=>{error={name:value.name,message:value.message};stop();});
    child.on('error',value=>{error={name:value.name,message:value.message};stop();});
    child.on('close',(code,signal)=>finish(code,signal,true));
  });
  activeChild=null;activeStop=null;
  const stdout=Buffer.concat(chunks.stdout),stderr=Buffer.concat(chunks.stderr);
  write(folder+'/stdout.txt',stdout);write(folder+'/stderr.txt',stderr);
  const receipt={command:[process.execPath,...arguments_],cwd:'products/rea-studio',sourceCommit:process.env.GITHUB_SHA,execution:execution(),...result,error,timedOut,overflow,interrupted:receivedSignal,termination,forcedStreamClose,rawLogsComplete:result.closeObserved&&!overflow&&!timedOut&&receivedSignal===null&&error===null,stdout:identity(stdout),stderr:identity(stderr)};
  save(folder+'/process.json',receipt);return{receipt,stdout,stderr};
}
const record={schema:'rea-notes46-installed-'+scope+'-collector/v1',execution:execution(),scope,phase,sourceCommit:process.env.GITHUB_SHA,sourceEpoch:floor.sourceEpoch,floor:floorPin,status:'failed',historicalReceiptsRebound:false,productionInstallationPerformed:false,fullParity:false,superiority:false};
try {
  if(phase==='before'){assert.deepEqual(status(),[],'Capture installed sources before the independent oracle-test overlay');assert(!fs.existsSync(path.join(studio,'.local/notes-notebook-trash-observations/trash-original.json')),'No old trash observation may be reused');record.before=capture('before');record.visibleState=requireVisibleState('before');assert.equal(receivedSignal,null);record.status='source-verified';}
  else if(phase==='postcheck'){const before=JSON.parse(read(evidence,'notes46-before.json',2*1024*1024));sameAttempt(before);assert.equal(before.status,'source-verified');record.after=capture('postcheck');assert.deepEqual(record.after.rows,before.before.rows);record.visibleState=requireVisibleState('postcheck');assert.equal(receivedSignal,null);record.status='source-verified';record.productProcessesStarted=0;}
  else {
    const before=JSON.parse(read(evidence,'notes46-before.json',2*1024*1024));sameAttempt(before);assert.equal(before.status,'source-verified');const current=capture('preexecution');assert.deepEqual(current.rows,before.before.rows);record.visibleStateBeforeExecution=requireVisibleState('preexecution');assert.equal(receivedSignal,null);record.sourceCapturedBeforeExecution=true;
    try {
      if(scope==='full'){
        const call=await runNode([path.join(studio,'scripts/verify-cloud.mjs'),'--scope','full-oracle-experiment','--output',evidence,'--bootstrap-manifest',path.join(evidence,'full-oracle-prerequisites.json'),'--overlay-manifest',path.join(evidence,'bsdtar-composition.json'),'--timeout-ms','2400000'],'notes46-full-core-invocation',41*60000,16*1024*1024,4*1024*1024);
        record.coreInvocation=call.receipt;assert.equal(call.receipt.code,0);assert.equal(call.receipt.signal,null);assert.equal(call.receipt.error,null);assert.equal(call.receipt.closeObserved,true);assert.equal(call.receipt.timedOut,false);assert.equal(call.receipt.overflow,false);assert.equal(call.receipt.interrupted,null);
        const attempt=JSON.parse(read(evidence,'attempt-validation.json',2*1024*1024));assert.equal(attempt.status,'passed');assert.equal(attempt.scope,'full-oracle-experiment');assert.equal(attempt.repositoryCommit,process.env.GITHUB_SHA);assert.deepEqual(attempt.selectedTestFiles,floor.full.selectedTestPins.map(r=>r.path));assert.equal(attempt.summary.tests,1236);record.coreAttempt={path:'attempt-validation.json',...identity(read(evidence,'attempt-validation.json',2*1024*1024))};record.resultCountIsNotRosterAcceptance=true;
      } else {
        assert.deepEqual(status(),[]);record.modules=[];const finiteDeadline=Date.now()+20*60000;record.finiteOverallBudgetMs=20*60000;const modules=[...floor.finite.appModules,floor.finite.separateHTTP];
        for(const [index,module]of modules.entries()){assert.equal(receivedSignal,null,'Finite attempt interrupted');assert(Date.now()<finiteDeadline,'Finite overall20minute budget exhausted; no incomplete roster can pass');const folder='notes46-finite-tests/'+String(index+1).padStart(2,'0')+'-'+path.basename(module.path),observation=path.join(evidence,'notes46-finite-observations',String(index+1).padStart(2,'0'));fs.mkdirSync(observation,{recursive:true});noLinks(observation);const call=await runNode(['--test','--test-reporter=tap','--test-concurrency=1',module.path.slice('products/rea-studio/'.length)],folder,Math.min(180000,finiteDeadline-Date.now()),1024*1024,1024*1024,{NOTES_REVIEW_OUTPUT:pathToFileURL(observation+path.sep).href});let actual=null,failure=null;try{for(const key of ['error','signal','interrupted'])assert.equal(call.receipt[key],null);for(const key of ['timedOut','overflow'])assert.equal(call.receipt[key],false);assert.equal(call.receipt.code,0);assert.equal(call.receipt.closeObserved,true);actual=parseNotes46Tap(call.stdout,module.topLevelNodes,module.results,module.path);}catch(error){failure={name:error.name,message:error.message};}const result={path:module.path,sourceCommandBound:true,folder,process:call.receipt,actual,failure,status:failure?'failed':'passed'};save(folder+'/result.json',result);record.modules.push(result);}
        assert(record.modules.every(r=>r.status==='passed'),'At least one finite module failed; all attempted raw outputs retained');record.appModuleResults=record.modules.slice(0,28).reduce((n,r)=>n+r.actual.totalResults,0);record.separateHTTPResults=record.modules[28].actual.totalResults;assert.equal(record.appModuleResults,228);assert.equal(record.separateHTTPResults,3);record.combinedFiniteResults=231;
      }
    } finally {record.trashObservation=preserveTrashObservation();record.after=capture('after');assert.deepEqual(record.after.rows,before.before.rows);record.visibleStateAfterExecution=requireVisibleState('after');}
    assert.equal(receivedSignal,null);record.status='passed';record.separateExactRosterAndPostcheckStillRequired=true;
  }
}catch(error){record.failure={name:error.name,message:error.message,stack:String(error.stack).slice(0,16000)};process.exitCode=1;}
save('notes46-'+phase+'.json',record);
console.log(JSON.stringify({scope,phase,status:record.status,sourceCommit:record.sourceCommit,fullParity:false,superiority:false}));
