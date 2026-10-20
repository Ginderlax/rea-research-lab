// Standalone finite feature collector. Existing whole-product workflows remain
// unchanged. This source is prospective until the reviewed admission is frozen.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.version,'v24.16.0');
assert.equal(process.env.CI,'true');assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');
assert.equal(process.env.RUNNER_OS,'Windows');assert.equal(process.env.RUNNER_ARCH,'X64');assert.equal(process.env.GITHUB_REPOSITORY,'Ginderlax/rea-research-lab');
const args=process.argv.slice(2);assert.equal(args.length,4);assert.equal(args[0],'--role');assert(['finite','browser'].includes(args[1]));assert.equal(args[2],'--evidence');assert(path.isAbsolute(args[3]));
const role=args[1];assert.equal(process.env.GITHUB_JOB,role);
const studio=fileURLToPath(new URL('../',import.meta.url)),repository=path.resolve(studio,'../..'),temporary=fs.realpathSync(process.env.RUNNER_TEMP),evidence=fs.realpathSync(args[3]);
assert.equal(path.dirname(evidence),temporary,'Only an owned direct RUNNER_TEMP child may contain evidence.');assert(!fs.lstatSync(evidence).isSymbolicLink());
const sha=b=>createHash('sha256').update(b).digest('hex'),identity=b=>({bytes:b.length,sha256:sha(b)});
const execution=Object.fromEntries(['GITHUB_SHA','GITHUB_REPOSITORY','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_JOB','GITHUB_WORKFLOW_SHA','RUNNER_ENVIRONMENT','RUNNER_OS','RUNNER_ARCH'].map(k=>[k,process.env[k]??null]));
function readJSON(file,limit=8*1024*1024){const item=fs.lstatSync(file);assert(item.isFile()&&!item.isSymbolicLink()&&item.size<=limit);return JSON.parse(fs.readFileSync(file,'utf8'));}
const admission=readJSON(path.join(evidence,'source-before.json'));assert.equal(admission.schema,'rea-backup-native-keys-source-check/v1');assert.equal(admission.status,'authenticated');assert.equal(admission.phase,'before');assert.deepEqual(admission.execution,execution);assert.equal(admission.soleParent,'078435d396e06681e470a4968d3256b371a08b65');
const record={schema:'rea-backup-native-keys-cloud-attempt/v1',role,status:'running',startedAtUtc:new Date().toISOString(),execution,runtime:{version:process.version,platform:process.platform,arch:process.arch},
  scope:'Separately identified key feature validation. Finite Backup regressions and authenticated original comparisons are distinct from five actual Chromium scenarios. No full-product parity or superiority conclusion.',
  sourceBefore:identity(fs.readFileSync(path.join(evidence,'source-before.json'))),children:[],prerequisites:[],sourceOverlay:false,historicalReceiptsRebound:false,fullSuite:false,fullParity:false,superiority:false,failure:null};
const receipt=path.join(evidence,'backup-key-attempt.json'),events=fs.openSync(path.join(evidence,'backup-key-events.jsonl'),'wx');let serial=0,active=null,interrupted=null;
function save(first=false){const file=first?receipt:receipt+'.tmp',fd=fs.openSync(file,'wx');try{fs.writeFileSync(fd,JSON.stringify(record,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}if(!first)fs.renameSync(file,receipt);}
function event(type,details={}){fs.writeFileSync(events,JSON.stringify({sequence:++serial,atUtc:new Date().toISOString(),type,...details})+'\n');fs.fsyncSync(events);}
function stop(reason){active?.(reason);}
const signals=new Map(['SIGINT','SIGTERM','SIGBREAK'].map(name=>[name,()=>{interrupted=name;stop('interrupted:'+name);} ]));for(const[name,fn]of signals)process.on(name,fn);
for(const stream of[process.stdout,process.stderr])stream.on('error',()=>{});
save(true);event('started',{role});
async function child(label,command,argv,{cwd=repository,env=process.env,timeout=40*60000,stdoutLimit=8*1024*1024,stderrLimit=2*1024*1024}={}){
  assert.equal(interrupted,null);assert(/^[a-z0-9-]+$/.test(label));
  const row={label,status:'running',startedAtUtc:new Date().toISOString(),command:[command,...argv],timeoutMs:timeout,stdout:{path:label+'.stdout.txt',bytes:0,limitBytes:stdoutLimit},stderr:{path:label+'.stderr.txt',bytes:0,limitBytes:stderrLimit},droppedBytes:0};record.children.push(row);save();
  const fds={stdout:fs.openSync(path.join(evidence,row.stdout.path),'wx'),stderr:fs.openSync(path.join(evidence,row.stderr.path),'wx')};
  try{
    const environment={...env};delete environment.NODE_TEST_CONTEXT;
    const outcome=await new Promise(resolve=>{
      const p=spawn(command,argv,{cwd,env:environment,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});let settled=false,stopping=false,failure=null,cleanup=null;
      function finish(exitCode,signal,closeObserved=true){if(settled)return;settled=true;clearTimeout(deadline);clearInterval(progress);clearTimeout(cleanup);active=null;resolve({exitCode,signal,closeObserved,failure});}
      function kill(reason){if(stopping)return;stopping=true;failure??=reason;if(p.pid){const k=spawnSync('taskkill.exe',['/PID',String(p.pid),'/T','/F'],{shell:false,windowsHide:true,stdio:'ignore',timeout:10000});if(k.status!==0)p.kill('SIGKILL');}cleanup=setTimeout(()=>{p.stdout.destroy();p.stderr.destroy();finish(null,null,false);},5000);}
      active=kill;const deadline=setTimeout(()=>kill('bounded child deadline exceeded'),timeout),progress=setInterval(()=>{try{event('child-progress',{label,stdoutBytes:row.stdout.bytes,stderrBytes:row.stderr.bytes});}catch{kill('progress record write failed');}},10000);
      for(const kind of['stdout','stderr']){p[kind].on('data',b=>{if(settled)return;try{const n=Math.min(b.length,Math.max(0,row[kind].limitBytes-row[kind].bytes));if(n){fs.writeFileSync(fds[kind],b.subarray(0,n));row[kind].bytes+=n;(kind==='stdout'?process.stdout:process.stderr).write(b.subarray(0,n));}row.droppedBytes+=b.length-n;if(n!==b.length)kill('raw '+kind+' bound exceeded');}catch(e){kill('evidence write failed:'+e.message);}});p[kind].on('error',e=>kill(kind+' stream failed:'+e.message));}
      p.on('error',e=>{failure='spawn failed:'+e.message;});p.on('close',(code,signal)=>finish(code,signal));row.pid=p.pid??null;event('child-started',{label,pid:row.pid});
    });Object.assign(row,outcome);assert.equal(outcome.failure,null);assert.equal(outcome.closeObserved,true);assert.equal(outcome.signal,null);assert.equal(outcome.exitCode,0);assert.equal(row.droppedBytes,0);assert.equal(interrupted,null);row.status='passed';return row;
  }catch(e){row.status='failed';row.failure={name:e.name,message:e.message};throw e;}
  finally{active=null;row.completedAtUtc=new Date().toISOString();for(const kind of['stdout','stderr']){fs.fsyncSync(fds[kind]);fs.closeSync(fds[kind]);row[kind].sha256=sha(fs.readFileSync(path.join(evidence,row[kind].path)));}save();event('child-terminal',{label,status:row.status});}
}
async function ordinary(file,pin){const item=await fsp.lstat(file);assert(item.isFile()&&!item.isSymbolicLink());assert.equal(item.size,pin.bytes);const b=await fsp.readFile(file);assert.equal(sha(b),pin.sha256);return identity(b);}
async function directory(file){try{await fsp.mkdir(file);}catch(e){if(e.code!=='EEXIST')throw e;}const item=await fsp.lstat(file);assert(item.isDirectory()&&!item.isSymbolicLink());assert.equal((await fsp.realpath(file)).toLowerCase(),path.resolve(file).toLowerCase());}
async function acquireRestic(){
  const project=path.join(repository,'projects/09-restic'),pin=readJSON(path.join(project,'artifact-manifest.json'));assert.equal(pin.version,'v0.19.1');assert.equal(pin.asset_url,'https://github.com/restic/restic/releases/download/v0.19.1/restic_0.19.1_windows_amd64.zip');assert.equal(pin.asset_bytes,11237567);assert.equal(pin.asset_sha256,'da948ad707ed690426473aaba2046cd61f8f90f6f0e7dab6be0d5796531de67d');assert.equal(pin.executable_bytes,31660032);assert.equal(pin.executable_sha256,'b0dd1fd21eea5d8fe1325f55f7118213c21f36de8a261e04c0624a5ab9fd7830');assert.equal(pin.executable_relative_path,'artifacts/unpacked/restic_0.19.1_windows_amd64.exe');
  const artifacts=path.join(project,'artifacts'),unpacked=path.join(artifacts,'unpacked'),archive=path.join(artifacts,'restic_0.19.1_windows_amd64.zip'),executable=path.join(project,pin.executable_relative_path);await directory(artifacts);
  if(!fs.existsSync(archive)){const response=await fetch(pin.asset_url,{signal:AbortSignal.timeout(60000)});assert(response.ok);const final=new URL(response.url);assert.equal(final.protocol,'https:');assert(['github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(final.hostname));let total=0;const chunks=[];for await(const b of response.body){total+=b.length;assert(total<=pin.asset_bytes);chunks.push(b);}const bytes=Buffer.concat(chunks);assert.equal(total,pin.asset_bytes);assert.equal(sha(bytes),pin.asset_sha256);await fsp.writeFile(archive,bytes,{flag:'wx'});}
  const archiveIdentity=await ordinary(archive,{bytes:pin.asset_bytes,sha256:pin.asset_sha256});await directory(unpacked);
  const tar=path.join(process.env.SystemRoot,'System32/tar.exe'),tarItem=await fsp.lstat(tar);assert(tarItem.isFile()&&!tarItem.isSymbolicLink());const tarIdentity=identity(await fsp.readFile(tar));
  if(!fs.existsSync(executable))await child('restic-unpack',tar,['-xf',archive,'-C',unpacked],{timeout:120000,stdoutLimit:1024*1024,stderrLimit:1024*1024});
  const executableIdentity=await ordinary(executable,{bytes:pin.executable_bytes,sha256:pin.executable_sha256});const assets=await fsp.readdir(unpacked);assert.deepEqual(assets,['restic_0.19.1_windows_amd64.exe']);
  record.prerequisites.push({role:'authenticated-restic-release',version:'v0.19.1',sourceURL:pin.asset_url,archive:archiveIdentity,executable:executableIdentity,systemExtractor:tarIdentity,originalExecutionsByAcquisition:0,vendorBinariesPublished:false});save();
}
function browserTests(value){return(value.suites??[]).flatMap(s=>[...(s.specs??[]).flatMap(spec=>(spec.tests??[]).map(t=>({title:spec.title,...t}))),...browserTests(s)]);}
try{
  if(role==='finite'){
    await acquireRestic();
    const row=await child('backup-finite',process.execPath,[path.join(studio,'scripts/run-backup-native-keys-tests.mjs')],{cwd:studio});
    const eventsRaw=fs.readFileSync(path.join(evidence,row.stdout.path),'utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line));assert(eventsRaw.length>22);assert.equal(eventsRaw.filter(e=>e.type==='test:fail').length,0);assert.equal(eventsRaw.filter(e=>e.type==='test:pass'&&(e.data.skip||e.data.todo)).length,0);
    const end=eventsRaw.filter(e=>e.type==='rea:finite-completion');assert.equal(end.length,1);assert.equal(end[0].data.modules.length,22);assert.equal(end[0].data.failures,0);record.finite={modules:end[0].data.modules,rawEvents:eventsRaw.length,passes:eventsRaw.filter(e=>e.type==='test:pass').length,failures:0,originalComparisonModulePresent:end[0].data.modules.includes('apps/backup/native-key-original.test.mjs')};
  }else{
    const browserData=path.join(temporary,'rea-backup-key-browser-data-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT);assert.equal(path.dirname(browserData),temporary);await fsp.mkdir(browserData);assert.equal(await fsp.realpath(browserData),browserData);
    assert.equal(fs.realpathSync(process.env.PLAYWRIGHT_BROWSERS_PATH),path.resolve(process.env.PLAYWRIGHT_BROWSERS_PATH),'The owned browser cache must be created before collector execution.');
    await child('browser-acquire',process.execPath,[path.join(studio,'scripts/verify-cloud-browser.mjs'),'--phase','acquire','--evidence',evidence],{timeout:10*60000});
    const acquisition=readJSON(path.join(evidence,'browser-tooling-acquisition.json'));assert.equal(acquisition.status,'acquired');for(const key of['GITHUB_SHA','GITHUB_REPOSITORY','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT'])assert.equal(acquisition.execution[key],execution[key]);record.prerequisites.push({role:'locked-chromium-tooling',receipt:identity(fs.readFileSync(path.join(evidence,'browser-tooling-acquisition.json')))});save();
    const tools=path.join(studio,'browser-tests'),environment={...process.env,REA_BROWSER_EVIDENCE:evidence,REA_BROWSER_DATA_ROOT:browserData};
    await child('backup-browser',process.execPath,[path.join(tools,'node_modules/@playwright/test/cli.js'),'test','--config',path.join(tools,'playwright.backup-native-keys.config.mjs')],{cwd:tools,env:environment,timeout:15*60000});
    const results=readJSON(path.join(evidence,'playwright-results.json')),roster=readJSON(path.join(tools,'backup-native-keys-roster.json')),tests=browserTests(results);assert.equal(roster.names.length,5);assert.equal(tests.length,5);assert.deepEqual(tests.map(t=>t.title).sort(),[...roster.names].sort());assert.equal(results.errors?.length??0,0);assert.equal(results.stats.expected,5);for(const k of['unexpected','flaky','skipped'])assert.equal(results.stats[k],0);
    for(const t of tests){assert.equal(t.results.length,1);assert.equal(t.results[0].status,'passed');assert.equal(t.results[0].retry,0);assert.equal(t.expectedStatus,'passed');}
    const cases=fs.readdirSync(evidence).filter(n=>/^case-.*\.json$/.test(n));assert.equal(cases.length,5);for(const file of cases){const value=readJSON(path.join(evidence,file));assert.equal(value.retry,0);assert.equal(value.errors.length,0);assert.equal(value.failures.length,0);assert.equal(value.cleanup.drained,true);assert.equal(value.cleanup.contextClosed,true);assert.equal(value.cleanup.hostClosed,true);assert.equal(value.cleanup.pending,0);}
    assert.equal(fs.readdirSync(path.join(evidence,'screenshots')).filter(n=>n.endsWith('.png')).length,5);record.browser={tests:roster.names,passed:5,retries:0,skipped:0,caseRecords:cases.length,screenshots:5,originalExecutions:0,rawCredentialBodiesOrTracesRetained:false};
  }
  record.status='passed';record.completedAtUtc=new Date().toISOString();save();event('passed',{role});
}catch(e){record.status='failed';record.completedAtUtc=new Date().toISOString();record.failure={name:e.name,message:e.message};save();event('failed',{role,failure:record.failure});throw e;}
finally{for(const[name,fn]of signals)process.off(name,fn);fs.closeSync(events);}
