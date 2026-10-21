// Prospective hosted collector scaffold. CAMPAIGN.json is explicitly UNBOUND.
// No role can start until the final source closure and current rosters are bound.
// Process completion is recorded separately from semantic qualification.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.version,'v24.16.0');
const parent='27374c78642d0086d5640fe25a887f5d8202dccc',branch='refs/heads/experiment/notes-open-todos-first-20261021-r1';
for(const [key,value] of Object.entries({CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab',GITHUB_SERVER_URL:'https://github.com',GITHUB_REF:branch,GITHUB_EVENT_NAME:'push'}))assert.equal(process.env[key],value,key);
for(const key of ['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT'])assert(/^[1-9][0-9]*$/.test(process.env[key]));assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA));
const args=process.argv.slice(2);assert.equal(args.length,6);assert.equal(args[0],'--role');assert(['full','finite','values','browser'].includes(args[1]));assert.equal(args[2],'--phase');assert(['before','run','after'].includes(args[3]));assert.equal(args[4],'--evidence');assert(path.isAbsolute(args[5]));
const phaseStartedMs=Date.now(),role=args[1],phase=args[3],finiteDeadline=role==='finite'&&phase==='run'?phaseStartedMs+20*60000:Infinity,jobs={full:'full-current-installed',finite:'notes46-installed-finite',values:'notes46-observed-values',browser:'draft-recovery-real-chromium'};assert.equal(process.env.GITHUB_JOB,jobs[role]);
const studio=path.resolve(fileURLToPath(new URL('../',import.meta.url))),repository=path.resolve(studio,'../..');
const sha=b=>createHash('sha256').update(b).digest('hex'),identity=b=>({bytes:b.length,sha256:sha(b)}),blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const slash=p=>p.replaceAll('\\','/');
function safe(p){assert(typeof p==='string'&&p.length&&p.length<=1024&&!/[\\:\x00-\x1f\x7f]/.test(p)&&!p.startsWith('/')&&p.split('/').every(c=>c&&c!=='.'&&c!=='..'));return p;}
function noLinks(p,file=false){let at=path.parse(p).root;for(const part of p.slice(at.length).split(path.sep).filter(Boolean)){at=path.join(at,part);const s=fs.lstatSync(at);assert(!s.isSymbolicLink());assert(at===p&&file?s.isFile()&&s.nlink===1:s.isDirectory());}assert.equal(fs.realpathSync(p).toLowerCase(),p.toLowerCase());}
function read(root,p,cap=2*1024*1024){const filename=path.join(root,safe(p));noLinks(filename,true);const s=fs.lstatSync(filename);assert(s.size<=cap);const b=fs.readFileSync(filename);assert.equal(b.length,s.size);return b;}
const temporary=fs.realpathSync(process.env.RUNNER_TEMP),expected=path.join(temporary,'rea-notes-order-'+role+'-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT),evidence=path.resolve(args[5]);assert.equal(evidence.toLowerCase(),expected.toLowerCase());noLinks(evidence);
function write(p,b){assert(Buffer.isBuffer(b)&&b.length<=16*1024*1024);const target=path.join(evidence,safe(p));fs.mkdirSync(path.dirname(target),{recursive:true});noLinks(path.dirname(target));fs.writeFileSync(target,b,{flag:'wx'});assert.deepEqual(read(evidence,p,16*1024*1024),b);}
const save=(p,value)=>write(p,Buffer.from(JSON.stringify(value,null,2)+'\n'));
const manifestPath='products/rea-studio/experiments/notes-open-todos-first-20261021/CAMPAIGN.json',rawManifest=read(repository,manifestPath);assert(/^[0-9a-f]{64}$/.test(process.env.REA_NOTES_ORDER_MANIFEST_SHA256));assert.equal(sha(rawManifest),process.env.REA_NOTES_ORDER_MANIFEST_SHA256);
const manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(rawManifest));assert.equal(manifest.schema,'rea-notes-order-hosted-campaign/v1');assert.equal(manifest.executionAuthorized,true,'UNBOUND source-only campaign cannot execute');assert.equal(manifest.parent,parent);assert.equal(manifest.branch,branch);assert.equal(manifest.currentActiveTestFiles.length,184);assert.equal(manifest.oldBrowserCases,36);assert.equal(manifest.newBrowserCases,6);assert.equal(manifest.fullCurrentRosterReviewed,true);assert.equal(manifest.sourceClosureReviewed,true);
const childKeys=new Set(['PATH','PATHEXT','SYSTEMROOT','COMSPEC','TEMP','TMP','USERPROFILE','HOMEDRIVE','HOMEPATH','LOCALAPPDATA','APPDATA','CI','GITHUB_ACTIONS','RUNNER_ENVIRONMENT','RUNNER_OS','RUNNER_ARCH','RUNNER_TEMP','GITHUB_SHA','GITHUB_REF','GITHUB_EVENT_NAME','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_REPOSITORY','GITHUB_JOB','GITHUB_SERVER_URL','GITHUB_WORKFLOW']);
let admittedEnvironment={};
const childEnv=extra=>({...Object.fromEntries(Object.entries(process.env).filter(([key])=>childKeys.has(key.toUpperCase()))),...admittedEnvironment,...extra});
const gitEnv={...Object.fromEntries(Object.entries(process.env).filter(([key])=>!/^GIT_/i.test(key))),GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'};
function git(a){assert(Date.now()<finiteDeadline,'Finite aggregate deadline exhausted before Git metadata read');assert(['rev-parse','rev-list','diff','status','ls-tree'].includes(a[0]));const r=spawnSync('C:/Program Files/Git/cmd/git.exe',['--no-replace-objects','-c','core.fsmonitor=false',...a],{cwd:repository,env:gitEnv,windowsHide:true,shell:false,timeout:Math.min(30000,finiteDeadline-Date.now()),maxBuffer:2*1024*1024});assert.equal(r.error,undefined);assert.equal(r.signal,null);assert.equal(r.status,0);return r.stdout;}
const text=a=>git(a).toString('utf8').trim();assert.equal(text(['rev-parse','HEAD']),process.env.GITHUB_SHA);assert.equal(text(['rev-list','--parents','-n','1','HEAD']),process.env.GITHUB_SHA+' '+parent);
const changed=git(['diff','--no-ext-diff','--no-textconv','--no-renames','--name-only','-z',parent,'HEAD']).toString('utf8').split('\0').filter(Boolean);assert.deepEqual(changed,manifest.closedChangedPaths);
const execution={sourceCommit:process.env.GITHUB_SHA,branch,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,job:process.env.GITHUB_JOB,role};
function bootstrapEnvironment(){
  const raw=read(evidence,'bootstrap-environment.json'),receipt=JSON.parse(raw);assert.equal(receipt.schema,'rea-notes-order-bootstrap-environment/v1');assert.equal(receipt.status,'acquired');assert.equal(receipt.role,role);assert.equal(receipt.failure,null);assert.deepEqual(receipt.manifest,identity(rawManifest));
  const keys=['GITHUB_SHA','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_JOB','GITHUB_REPOSITORY'];assert.deepEqual(Object.keys(receipt.execution).sort(),[...keys].sort());for(const key of keys)assert.equal(receipt.execution[key],process.env[key]);
  const expected=role==='full'?{FLOW_ORIGINAL_CACHE:path.join(repository,'.local/flow-original'),REA_KEEPASS_EXE:path.join(repository,'.local/keepass-original/portable/KeePass.exe'),REA_ARCHIVE_ZIP_AES_ORIGINAL_EVIDENCE:evidence,REA_ARCHIVE_ZIP_ROLE:'zip-original',REA_SYNC_DOWNLOAD_ORIGINAL_EVIDENCE:path.join(temporary,'rea-notes-order-sync-original-'+execution.runId+'-'+execution.attempt)}:role==='browser'?{PLAYWRIGHT_BROWSERS_PATH:path.join(temporary,'rea-notes-order-chromium-'+execution.runId+'-'+execution.attempt)}:{};
  assert.deepEqual(Object.keys(receipt.values).sort(),Object.keys(expected).sort());for(const[key,value]of Object.entries(expected)){assert.equal(receipt.values[key],value);if(key!=='REA_ARCHIVE_ZIP_ROLE')noLinks(value,key==='REA_KEEPASS_EXE');}
  return{values:{...expected},receipt:identity(raw),allowedKeys:Object.keys(expected).sort()};
}
function sourceCheck(label){
  assert(Array.isArray(manifest.sourceRows)&&manifest.sourceRows.length>0);const rows=[],extras=[];let byteCount=0;
  const extraPaths=[manifestPath,'.github/workflows/notes-open-todos-first-cloud.yml'];
  const consumed=[...manifest.sourceRows.map(r=>r.path),...extraPaths];assert.equal(new Set(consumed).size,consumed.length);
  function metadataRows(ref,paths){const records=[];for(let index=0;index<paths.length;index+=64){const selected=paths.slice(index,index+64);const found=git(['ls-tree','-r','-z','--full-tree',ref,'--',...selected]).toString('utf8').split('\0').filter(Boolean).map(line=>{const m=/^(\d{6}) blob ([0-9a-f]{40})\t(.+)$/.exec(line);assert(m);return{path:m[3],rawMode:m[1],gitBlob:m[2]};});assert.deepEqual(found.map(r=>r.path).sort(),[...selected].sort());records.push(...found);}return records.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);}
  const records=metadataRows('HEAD',consumed);assert.equal(records.length,consumed.length);const metadata=new Map(records.map(r=>[r.path,r]));assert.equal(metadata.size,records.length);const inherited=manifest.sourceRows.filter(r=>r.admission==='inherited-parent-gitblob'),parentMetadata=new Map(metadataRows(parent,inherited.map(r=>r.path)).map(r=>[r.path,r]));assert.equal(parentMetadata.size,inherited.length);
  function capture(row,extra=false){
    safe(row.path);assert.equal(row.rawMode,'100644');const meta=metadata.get(row.path);assert(meta);assert.equal(meta.rawMode,row.rawMode);const raw=read(repository,row.path);assert.equal(blob(raw),meta.gitBlob);
    if(!extra){
      assert(['changed-sha256','inherited-parent-gitblob'].includes(row.admission));
      if(row.admission==='changed-sha256')assert.deepEqual(identity(raw),{bytes:row.bytes,sha256:row.sha256});
      else{assert.equal(meta.gitBlob,row.gitBlob);assert.deepEqual(parentMetadata.get(row.path),{path:row.path,rawMode:'100644',gitBlob:row.gitBlob});}
    }
    byteCount+=raw.length;assert(byteCount<=16*1024*1024);write('source-'+label+'/'+row.path+'.snapshot',raw);return{path:row.path,rawMode:meta.rawMode,gitBlob:meta.gitBlob,...identity(raw),...(!extra?{admission:row.admission}:{})};
  }
  for(const row of manifest.sourceRows)rows.push(capture(row));for(const path of extraPaths)extras.push(capture({path,rawMode:'100644'},true));assert.deepEqual(identity(rawManifest),identity(read(repository,manifestPath)));
  const currentTests=manifest.currentActiveTestFiles;assert.equal(new Set(currentTests.map(row=>row.path)).size,184);assert(currentTests.every(row=>row.mode==='100644'&&row.path.endsWith('.test.mjs')&&!row.path.split('/').includes('results')));
  const actual=metadataRows('HEAD',currentTests.map(row=>row.path)).map(row=>({path:row.path,mode:row.rawMode,gitBlob:row.gitBlob}));assert.deepEqual(actual,[...currentTests].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0));
  const status=git(['status','--porcelain=v1','-z','--untracked-files=all']).toString('utf8').split('\0').filter(Boolean).map(line=>({status:line.slice(0,2),path:line.slice(3)}));assert.deepEqual(status,[],'Only clean committed sources may run this clean-current profile');
  const result={schema:'rea-notes-order-source-capture/v2',...execution,label,manifest:identity(rawManifest),rows,extras,rawBytes:byteCount,currentActiveTests:184,status,completeSourceClosureAssertedByReviewedManifest:true,productProcessesStarted:0};save('source-'+label+'.json',result);return result;
}
function projectCurrentSyncOriginal(processRecord){
  const index={schema:'rea-notes-order-current-sync-original-projection-index/v1',...execution,status:'failed',files:[],detailsExcluded:true,rawArgumentAndErrorMessagesExported:false,commandTranscriptBodiesExported:0,objectBodiesExported:0,fileManifestBodiesExported:0,fullSyncAcceptance:false};
  try{
    assert.equal(processRecord.closeObserved,true);const root=admittedEnvironment.REA_SYNC_DOWNLOAD_ORIGINAL_EVIDENCE;assert.equal(root,path.join(temporary,'rea-notes-order-sync-original-'+execution.runId+'-'+execution.attempt));noLinks(root);
    function original(file,schema){const target=path.join(root,file);noLinks(target,true);const first=fs.lstatSync(target);assert(first.size<=8*1024*1024);const raw=fs.readFileSync(target),last=fs.lstatSync(target);for(const key of['dev','ino','size','mtimeMs','ctimeMs'])assert.equal(last[key],first[key]);assert.equal(raw.length,first.size);const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));assert.equal(value.schema,schema);for(const key of['GITHUB_SHA','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_JOB'])assert.equal(value.execution[key],process.env[key]);assert.equal(value.sourceCommit,'be8d6044eacb843b74d335db0c5fbe09222031fe');return{value,rawIdentity:identity(raw)};}
    function keep(relative,value,sourceFile,sourceIdentity){const body=Buffer.from(JSON.stringify(value,null,2)+'\n');write('current-sync-original/'+relative,body);index.files.push({sourceFile,source:sourceIdentity,projectionFile:'current-sync-original/'+relative,projection:identity(body),byteExactSourceCopy:false});}
    const executionFields=(value,includeRunner=false)=>Object.fromEntries(['GITHUB_SHA','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_JOB',...(includeRunner?['RUNNER_ENVIRONMENT']:[])].map(key=>[key,value[key]]));
    const corpus=original('download-original-corpus.json','rea-sync-webdav-download-original-corpus-attempt/v1'),c=corpus.value;assert(['passed','failed'].includes(c.status));assert(Array.isArray(c.recordCaseIDs)&&c.recordCaseIDs.length<=135&&c.recordCaseIDs.every(id=>typeof id==='string'&&/^[a-z0-9-]{1,96}$/.test(id)));assert(Array.isArray(c.failures));for(const key of['completedProfiles','completedHeldOutFolders','plannedProfileMasks','plannedCasesPerProfile'])assert(Number.isSafeInteger(c[key])&&c[key]>=0);assert(/^[0-9a-f]{64}$/.test(c.corpusSHA256));if(c.originalProcessReceipt){assert(Number.isSafeInteger(c.originalProcessReceipt.commands)&&c.originalProcessReceipt.commands>=0&&c.originalProcessReceipt.commands<=512);assert(['passed','failed','running'].includes(c.originalProcessReceipt.status));}
    keep('corpus-summary.json',{schema:'rea-notes-order-sync-original-corpus-metadata-projection/v1',source:corpus.rawIdentity,sourceSchema:c.schema,sourceCommit:c.sourceCommit,execution:executionFields(c.execution),status:c.status,corpusSHA256:c.corpusSHA256,completedProfiles:c.completedProfiles,completedHeldOutFolders:c.completedHeldOutFolders,plannedProfileMasks:c.plannedProfileMasks,plannedCasesPerProfile:c.plannedCasesPerProfile,recordCaseIDs:c.recordCaseIDs,failureCount:c.failures.length,originalProcessReceipt:c.originalProcessReceipt?{commands:c.originalProcessReceipt.commands,status:c.originalProcessReceipt.status}:null,detailsExcluded:true,rawFailureMessagesExported:false,fullSyncAcceptance:false},'download-original-corpus.json',corpus.rawIdentity);
    const processes=original('original-processes.json','rea-sync-download-original-processes/v1'),p=processes.value;assert.equal(p.execution.RUNNER_ENVIRONMENT,'github-hosted');assert(['passed','failed','running'].includes(p.status));assert(Array.isArray(p.commands)&&p.commands.length<=512);
    function stream(value){if(value==null)return null;for(const key of['observedRawBytes','retainedSanitizedBytes'])assert(Number.isSafeInteger(value[key])&&value[key]>=0);assert(/^[0-9a-f]{64}$/.test(value.sha256));return{observedRawBytes:value.observedRawBytes,retainedSanitizedBytes:value.retainedSanitizedBytes,sha256:value.sha256};}
    const commands=p.commands.map((row,i)=>{assert.equal(row.sequence,i+1);assert(typeof row.caseID==='string'&&/^[a-z0-9][a-z0-9-]{0,95}$/.test(row.caseID));assert(['passed','failed','running'].includes(row.status));assert(row.exitCode==null||(Number.isInteger(row.exitCode)&&row.exitCode>=0&&row.exitCode<=255));assert(row.signal==null||(typeof row.signal==='string'&&/^SIG[A-Z0-9]{1,24}$/.test(row.signal)));assert(Array.isArray(row.expectedExitCodes)&&row.expectedExitCodes.length>0&&row.expectedExitCodes.length<=16&&row.expectedExitCodes.every(n=>Number.isInteger(n)&&n>=0&&n<=255));return{sequence:row.sequence,caseID:row.caseID,status:row.status,exitCode:row.exitCode??null,signal:row.signal??null,closeObserved:row.closeObserved===true,failureCode:row.failure==null?null:'RECORDED_ORIGINAL_COMMAND_FAILURE',expectedExitCodes:row.expectedExitCodes,stdout:stream(row.stdout),stderr:stream(row.stderr)};});
    const zip={bytes:31634900,sha256:'8a9db2bad1dc79a65b3348fd857069598e2aab7cf4d118b77b1df23055aff818'},executable={bytes:85500928,sha256:'41eab3e118d264920b62c3327966c5ece0dc4dd715ee617d9e30450d8ead95a4'};assert.deepEqual(p.zip,zip);assert.deepEqual(p.executable,executable);assert.equal(typeof p.privateCopyAuthenticated,'boolean');
    keep('process-summary.json',{schema:'rea-notes-order-sync-original-process-metadata-projection/v1',source:processes.rawIdentity,sourceSchema:p.schema,sourceCommit:p.sourceCommit,execution:executionFields(p.execution,true),status:p.status,zip,executable,privateCopyAuthenticated:p.privateCopyAuthenticated,commands,commandCount:commands.length,detailsExcluded:true,rawArgumentsExported:false,rawErrorMessagesExported:false,fullSyncAcceptance:false},'original-processes.json',processes.rawIdentity);
    index.status='projected-exact-two-private-json-sources';
  }catch(error){index.failure={code:'PRIVATE_SYNC_METADATA_PROJECTION_REFUSED',name:error.name};throw error;}finally{save('current-sync-original/index.json',index);}
  return index;
}
let activeChild=null,activeStop=null,interrupted=null;for(const name of ['SIGINT','SIGTERM','SIGBREAK'])process.on(name,()=>{interrupted=name;if(activeStop)activeStop();else if(activeChild?.pid)kill(activeChild);});
function kill(child){if(!Number.isInteger(child.pid)||child.pid<=0)return;spawnSync(path.join(process.env.SYSTEMROOT,'System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true,shell:false,timeout:5000,maxBuffer:65536,env:childEnv({})});}
async function child(name,arguments_,{cwd=studio,extra={},milliseconds=180000,outCap=1024*1024,errCap=1024*1024}={}){
  assert(/^[a-z0-9-]+$/.test(name));const stdout=[],stderr=[];let outBytes=0,errBytes=0,outObserved=0,errObserved=0,failure=null,timedOut=false,overflow=false,forcedStreamClose=false;
  const result=await new Promise(resolve=>{const running=spawn(process.execPath,arguments_,{cwd,env:childEnv({...extra,REA_NOTES_SORT_SOURCE_ADMITTED:'true'}),windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']});activeChild=running;let timer,force,finished=false,stopping=false;
    function finish(value){if(finished)return;finished=true;clearTimeout(timer);clearTimeout(force);activeChild=null;activeStop=null;resolve(value);}
    function stop(){if(stopping||finished)return;stopping=true;kill(running);if(!finished)force=setTimeout(()=>{forcedStreamClose=true;running.kill();running.stdout.destroy();running.stderr.destroy();running.unref();finish({code:null,signal:null,closeObserved:false});},5000);}
    activeStop=stop;
    function collect(chunks,chunk,stdoutStream){const cap=stdoutStream?outCap:errCap,kept=stdoutStream?outBytes:errBytes;if(stdoutStream)outObserved+=chunk.length;else errObserved+=chunk.length;const piece=chunk.subarray(0,Math.max(0,cap-kept));chunks.push(piece);if(stdoutStream)outBytes+=piece.length;else errBytes+=piece.length;if(piece.length!==chunk.length){overflow=true;stop();}}
    running.stdout.on('data',chunk=>collect(stdout,chunk,true));running.stderr.on('data',chunk=>collect(stderr,chunk,false));running.on('error',error=>{failure={name:error.name,message:error.message};});timer=setTimeout(()=>{timedOut=true;stop();},milliseconds);running.on('close',(code,signal)=>finish({code,signal,closeObserved:true}));
  });
  const out=Buffer.concat(stdout),err=Buffer.concat(stderr);write(name+'/stdout.txt',out);write(name+'/stderr.txt',err);
  const receipt={schema:'rea-notes-order-child-process/v1',...execution,name,processStarted:true,arguments:arguments_,...result,failure,timedOut,overflow,interrupted,forcedStreamClose,stdout:identity(out),stderr:identity(err),stdoutObservedBytes:outObserved,stderrObservedBytes:errObserved,droppedBytes:outObserved+errObserved-out.length-err.length,rawLogsComplete:!failure&&!timedOut&&!overflow&&!interrupted&&!forcedStreamClose,automaticRetry:false};receipt.status=receipt.code===0&&receipt.signal===null&&receipt.closeObserved===true&&receipt.rawLogsComplete===true?'passed':'failed';save(name+'/process.json',receipt);return receipt;
}
const planned=phase!=='run'?[]:role==='full'?['current-full']:role==='finite'?[...manifest.legacyFiniteModules.map((_,i)=>'finite-'+String(i+1).padStart(2,'0')),'new-order-api']:role==='values'?['retained-original80','new-original32']:['chromium42'];
const record={schema:'rea-notes-order-collector-phase/v1',...execution,phase,manifest:identity(rawManifest),status:'failed',plannedProcesses:planned,processes:[],processFailures:[],unattempted:[...planned],semanticAcceptance:false,fullProductAcceptance:false,allTenComplete:false};
async function dispatch(name,args,options={}){
  assert(planned.includes(name));assert(!record.processes.some(p=>p.name===name));
  if(interrupted||Date.now()>=finiteDeadline)return false;
  const receipt=await child(name,args,{...options,milliseconds:Math.min(options.milliseconds??180000,finiteDeadline-Date.now())});record.processes.push(receipt);return true;
}
try{
  if(phase==='before')record.source=sourceCheck('before');
  else if(phase==='after')record.source=sourceCheck('after');
  else{
    const before=JSON.parse(read(evidence,'source-before.json'));for(const key of Object.keys(execution))assert.deepEqual(before[key],execution[key]);assert.deepEqual(before.manifest,identity(rawManifest));const bootstrap=bootstrapEnvironment();admittedEnvironment=bootstrap.values;record.bootstrapEnvironment={receipt:bootstrap.receipt,allowedKeys:bootstrap.allowedKeys};sourceCheck('preexecution');
    if(role==='full'){
      await dispatch('current-full',['scripts/verify-cloud-current-installed.mjs','--scope','full-current-installed','--output',path.join(evidence,'full-suite'),'--bootstrap-manifest',path.join(evidence,'current-full-prerequisites.json'),'--snapshot-scope','active','--timeout-ms','2400000'],{extra:{REA_NOTES_ORDER_ROLE:role,REA_NOTES_ORDER_MANIFEST_SHA256:sha(rawManifest)},milliseconds:41*60000,outCap:16*1024*1024,errCap:4*1024*1024});
      const fullProcess=record.processes.find(p=>p.name==='current-full');assert(fullProcess);const projection=projectCurrentSyncOriginal(fullProcess);record.currentSyncOriginalProjection={path:'current-sync-original/index.json',...identity(read(evidence,'current-sync-original/index.json')),status:projection.status};
    }
    if(role==='finite'){
      assert.equal(manifest.legacyFiniteModules.length,29);record.finiteBudgetMilliseconds=20*60000;record.finiteStartedAtEpochMs=phaseStartedMs;record.finiteDeadlineEpochMs=finiteDeadline;record.killDrainAllowanceMilliseconds=10000;
      for(const[index,row]of manifest.legacyFiniteModules.entries()){
        if(interrupted||Date.now()>=finiteDeadline)break;
        assert(row.path.startsWith('products/rea-studio/')&&row.path.endsWith('.test.mjs'));const observed=path.join(evidence,'finite-observations',String(index+1).padStart(2,'0'));fs.mkdirSync(observed,{recursive:true});noLinks(observed);
        await dispatch('finite-'+String(index+1).padStart(2,'0'),['--test','--test-reporter=tap','--test-concurrency=1',row.path.slice('products/rea-studio/'.length)],{extra:{NOTES_REVIEW_OUTPUT:pathToFileURL(observed+path.sep).href}});
      }
      await dispatch('new-order-api',['--test','--test-reporter=tap','--test-concurrency=1','apps/notes/open-todos-first.cloud-check.mjs']);record.finiteDeadlineExceeded=Date.now()>=finiteDeadline;record.finiteElapsedMilliseconds=Date.now()-phaseStartedMs;
    }
    if(role==='values'){
      const values=path.join(evidence,'original-values');fs.mkdirSync(values);noLinks(values);
      await dispatch('retained-original80',['--test','--test-reporter=tap','--test-concurrency=1','experiments/notes46-installed-search-browser-20261019/tests/search-original-observations.test.mjs'],{extra:{REA_SEARCH_VALUE_EVIDENCE:values}});
      await dispatch('new-original32',['--test','--test-reporter=tap','--test-concurrency=1','apps/notes/open-todos-first-original.cloud-check.mjs']);
    }
    if(role==='browser'){
      const output=path.join(evidence,'browser'),data=path.join(temporary,'rea-notes-order-browser-data-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT);assert(!fs.existsSync(data));noLinks(temporary);fs.mkdirSync(data);noLinks(data);const owned=fs.lstatSync(data);fs.mkdirSync(output);noLinks(output);record.ownedBrowserDataRootCreated=true;record.browserCleanupQualificationPending=true;
      const cleanup={schema:'rea-notes-order-owned-browser-root-cleanup/v1',...execution,rootRelativeToRunnerTemp:path.basename(data),childCloseObserved:false,all42CaseCleanupQualified:false,ownedRootIdentityVerified:false,ownedRootEmptyBeforeRemoval:false,removed:false,absenceVerified:false,recursiveRemoval:false,automaticRetry:false};
      try{
        await dispatch('chromium42',['node_modules/playwright/cli.js','test','--config','playwright.notes-open-todos-first.config.mjs'],{cwd:path.join(studio,'browser-tests'),extra:{REA_BROWSER_EVIDENCE:output,REA_BROWSER_DATA_ROOT:data},milliseconds:20*60000,outCap:8*1024*1024,errCap:4*1024*1024});
        const processRecord=record.processes.find(p=>p.name==='chromium42');assert(processRecord);cleanup.childCloseObserved=processRecord.closeObserved===true;assert.equal(processRecord.status,'passed');assert.equal(cleanup.childCloseObserved,true);assert.equal(activeChild,null);
        const {verifyBrowserCaseCleanup}=await import('./qualify-notes-open-todos-cloud.mjs');const cases=verifyBrowserCaseCleanup({evidence,manifest,execution});save('browser-case-cleanup-qualification.json',cases);assert.equal(cases.cases,42);assert.equal(cases.allPerCaseDataRemoved,true);cleanup.all42CaseCleanupQualified=true;
        assert.equal(path.dirname(data).toLowerCase(),temporary.toLowerCase());assert.equal(path.basename(data),'rea-notes-order-browser-data-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT);noLinks(data);const now=fs.lstatSync(data);for(const key of['dev','ino','birthtimeMs'])assert.equal(now[key],owned[key]);cleanup.ownedRootIdentityVerified=true;
        assert.deepEqual(fs.readdirSync(data),[],'All owned case directories must already have been removed by reviewed closed fixtures');cleanup.ownedRootEmptyBeforeRemoval=true;fs.rmdirSync(data);cleanup.removed=true;assert(!fs.existsSync(data));cleanup.absenceVerified=true;record.browserCleanupQualificationPending=false;
      }catch(error){cleanup.failure={name:error.name,message:String(error.message).slice(0,4000)};throw error;}finally{save('browser-cleanup.json',cleanup);}
    }
  }
  record.processFailures=record.processes.filter(p=>p.status!=='passed').map(p=>p.name);record.unattempted=planned.filter(name=>!record.processes.some(p=>p.name===name));assert.deepEqual(record.processFailures,[]);assert.deepEqual(record.unattempted,[]);assert.equal(interrupted,null);if(role==='finite'&&phase==='run')assert.equal(record.finiteDeadlineExceeded,false);record.status='process-phase-completed';record.completeSemanticQualifierStillRequired=true;
}catch(error){record.failure={name:error.name,message:String(error.message),stack:String(error.stack).slice(0,12000)};process.exitCode=1;}
finally{record.processFailures=record.processes.filter(p=>p.status!=='passed').map(p=>p.name);record.unattempted=planned.filter(name=>!record.processes.some(p=>p.name===name));record.completedAtUtc=new Date().toISOString();record.elapsedMilliseconds=Date.now()-phaseStartedMs;save('collector-'+phase+'.json',record);}
console.log(JSON.stringify({role,phase,status:record.status,completedProcesses:record.processes.length,failedProcesses:record.processFailures.length,unattemptedProcesses:record.unattempted.length,semanticAcceptance:false}));
