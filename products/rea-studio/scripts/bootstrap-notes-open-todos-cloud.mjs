// Fresh same-attempt hosted prerequisite coordinator. Never runs product tests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
const parent='27374c78642d0086d5640fe25a887f5d8202dccc',branch='refs/heads/experiment/notes-open-todos-first-20261021-r1';
assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.version,'v24.16.0');
for(const [name,value] of Object.entries({CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab',GITHUB_REF:branch,REA_NOTES_ORDER_PARENT:parent}))assert.equal(process.env[name],value);
const args=process.argv.slice(2);assert.equal(args.length,4);assert.equal(args[0],'--role');assert(['full','finite','values','browser'].includes(args[1]));assert.equal(args[2],'--evidence');assert(path.isAbsolute(args[3]));
const role=args[1],jobs={full:'full-current-installed',finite:'notes46-installed-finite',values:'notes46-observed-values',browser:'draft-recovery-real-chromium'};assert.equal(process.env.GITHUB_JOB,jobs[role]);assert.equal(process.env.REA_NOTES_ORDER_ROLE,role);assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA));for(const key of ['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT'])assert(/^[1-9][0-9]*$/.test(process.env[key]));
const repository=fileURLToPath(new URL('../../../',import.meta.url)),temporary=fs.realpathSync(process.env.RUNNER_TEMP),evidence=path.join(temporary,`rea-notes-order-${role}-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`);
assert.equal(path.resolve(args[3]).toLowerCase(),evidence.toLowerCase());
function noLinks(filename){let current=path.parse(path.resolve(filename)).root;for(const name of path.resolve(filename).slice(current.length).split(path.sep)){if(!name)continue;current=path.join(current,name);const st=fs.lstatSync(current);assert(!st.isSymbolicLink());}return fs.lstatSync(filename);}
assert(noLinks(evidence).isDirectory());assert.equal(fs.realpathSync(evidence).toLowerCase(),evidence.toLowerCase());
const sha=b=>createHash('sha256').update(b).digest('hex'),identity=b=>({bytes:b.length,sha256:sha(b)}),gitBlob=b=>createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
function ordinary(filename,max=16*1024*1024){const before=noLinks(filename);assert(before.isFile()&&before.nlink===1&&before.size<=max);const bytes=fs.readFileSync(filename),after=fs.lstatSync(filename);for(const key of ['dev','ino','mtimeMs','ctimeMs','size'])assert.equal(after[key],before[key]);return bytes;}
const manifestBytes=ordinary(path.join(repository,'products/rea-studio/experiments/notes-open-todos-first-20261021/CAMPAIGN.json')),manifest=JSON.parse(manifestBytes);assert.equal(sha(manifestBytes),process.env.REA_NOTES_ORDER_MANIFEST_SHA256);assert.equal(manifest.schema,'rea-notes-order-hosted-campaign/v1');assert.equal(manifest.parent,parent);assert.equal(manifest.branch,branch);assert.equal(manifest.executionAuthorized,true);assert.equal(manifest.sourceClosureReviewed,true);assert.equal(manifest.fullCurrentRosterReviewed,true);
function source(relative){assert(/^[A-Za-z0-9._/-]+$/.test(relative)&&!relative.split('/').includes('..'));const row=manifest.sourceRows.find(row=>row.path===relative);assert(row&&row.rawMode==='100644');const bytes=ordinary(path.join(repository,relative));if(row.admission==='changed-sha256')assert.deepEqual(identity(bytes),{bytes:row.bytes,sha256:row.sha256});else{assert.equal(row.admission,'inherited-parent-gitblob');assert.equal(gitBlob(bytes),row.gitBlob);}return bytes;}
const execution=Object.fromEntries(['GITHUB_SHA','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_JOB','GITHUB_REPOSITORY'].map(key=>[key,process.env[key]]));
function save(name,value){fs.writeFileSync(path.join(evidence,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
const started=Date.now(),deadline=started+35*60000,processes=[];
const childEnvironment={...process.env};for(const key of Object.keys(childEnvironment))if(/TOKEN|SECRET|PASSWORD|CREDENTIAL|ACTIONS_RUNTIME|ACTIONS_ID_TOKEN|^GITHUB_(OUTPUT|ENV|PATH|STATE|STEP_SUMMARY)$/.test(key))delete childEnvironment[key];delete childEnvironment.NODE_OPTIONS;delete childEnvironment.NODE_TEST_CONTEXT;
async function child(name,relative,argv,extra={}) {
  assert(/^[a-z0-9-]+$/.test(name));source(relative);const remaining=deadline-Date.now();assert(remaining>1000,'Prerequisite aggregate deadline exceeded');const timeoutMs=Math.min(15*60000,remaining),streams={stdout:[],stderr:[]},counts={stdout:0,stderr:0},caps={stdout:8*1024*1024,stderr:2*1024*1024};let failure=null,forced=null;
  const result=await new Promise(resolve=>{let done=false,stopping=false;const finish=(exitCode,signal,closeObserved)=>{if(done)return;done=true;clearTimeout(timer);clearTimeout(forced);resolve({exitCode,signal,closeObserved,failure});};const running=spawn(process.execPath,[relative,...argv],{cwd:repository,env:{...childEnvironment,...extra},shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
    const stop=why=>{failure??=why;if(stopping||done)return;stopping=true;if(running.pid){const kill=spawnSync('taskkill.exe',['/PID',String(running.pid),'/T','/F'],{windowsHide:true,shell:false,timeout:10000,stdio:'ignore'});if(kill.status!==0)running.kill('SIGKILL');}forced??=setTimeout(()=>{running.stdout.destroy();running.stderr.destroy();finish(null,null,false);},5000);};
    const timer=setTimeout(()=>stop('prerequisite deadline exceeded'),timeoutMs);for(const kind of ['stdout','stderr']){running[kind].on('data',bytes=>{counts[kind]+=bytes.length;if(counts[kind]<=caps[kind])streams[kind].push(bytes);else stop(kind+' byte cap exceeded');});running[kind].on('error',error=>stop(kind+' stream '+error.code));}running.on('error',error=>{failure=error.code??error.message;});running.on('close',(code,signal)=>finish(code,signal,true));});
  const receipt={schema:'rea-notes-order-bootstrap-child/v1',...execution,role,name,script:relative,argvProjection:argv.map(value=>value===evidence?'[OWNED_ROLE_EVIDENCE]':value),ownedEvidenceArgumentProjected:true,timeoutMs,...result,stdout:null,stderr:null};for(const kind of ['stdout','stderr']){const bytes=Buffer.concat(streams[kind]),file=`bootstrap-${name}.${kind}.txt`;fs.writeFileSync(path.join(evidence,file),bytes,{flag:'wx'});receipt[kind]={path:file,...identity(bytes),observedBytes:counts[kind],truncated:bytes.length!==counts[kind]};}save(`bootstrap-${name}.process.json`,receipt);processes.push(receipt);
  assert.equal(result.failure,null);assert.equal(result.closeObserved,true);assert.equal(result.exitCode,0);assert.equal(result.signal,null);for(const kind of ['stdout','stderr'])assert.equal(receipt[kind].truncated,false);return receipt;
}
const values={};let status='failed',failure=null;
try {
  if(role==='full') {
    const fakeEnv=path.join(temporary,`rea-notes-order-bootstrap-private-full-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}.txt`);assert.equal(path.dirname(fakeEnv),temporary);fs.writeFileSync(fakeEnv,'',{flag:'wx'});assert(noLinks(fakeEnv).isFile());
    await child('flow-vault','products/rea-studio/scripts/bootstrap-cloud-flow-vault.mjs',['--evidence',evidence],{GITHUB_ENV:fakeEnv});
    const lines=ordinary(fakeEnv,4096).toString('utf8').trimEnd().split(/\r?\n/);assert.equal(lines.length,2);for(const [index,key] of ['FLOW_ORIGINAL_CACHE','REA_KEEPASS_EXE'].entries()){assert(lines[index].startsWith(key+'='));values[key]=lines[index].slice(key.length+1);assert(!/[\r\n]/.test(values[key]));}
    assert.equal(values.FLOW_ORIGINAL_CACHE,path.join(repository,'.local/flow-original'));assert.equal(values.REA_KEEPASS_EXE,path.join(repository,'.local/keepass-original/portable/KeePass.exe'));assert(noLinks(values.FLOW_ORIGINAL_CACHE).isDirectory());assert(noLinks(values.REA_KEEPASS_EXE).isFile());
    values.REA_ARCHIVE_ZIP_AES_ORIGINAL_EVIDENCE=evidence;values.REA_ARCHIVE_ZIP_ROLE='zip-original';
    await child('archive-joint','products/rea-studio/scripts/acquire-archive-zip-aes-original.mjs',['--evidence',evidence],{REA_ARCHIVE_ZIP_ROLE:'zip-original'});
    await child('bsdtar','products/rea-studio/scripts/bootstrap-cloud-bsdtar.mjs',['--evidence',evidence]);
    await child('bsdtar-smoke','products/rea-studio/scripts/verify-cloud-bsdtar.mjs',['--evidence',evidence]);
    await child('additional','products/rea-studio/scripts/bootstrap-cloud-development.mjs',['--evidence',evidence]);
    source('scripts/acquire-windows-release.mjs');source('projects/10-rclone/artifact-manifest.json');
    await child('rclone','projects/10-rclone/acquire.mjs',[]);
    const sync=path.join(temporary,`rea-notes-order-sync-original-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`);assert(!fs.existsSync(sync));fs.mkdirSync(sync);assert(noLinks(sync).isDirectory());values.REA_SYNC_DOWNLOAD_ORIGINAL_EVIDENCE=sync;
    const syncAssets=[{path:'projects/10-rclone/artifacts/rclone-v1.75.2-windows-amd64.zip',bytes:31634900,sha256:'8a9db2bad1dc79a65b3348fd857069598e2aab7cf4d118b77b1df23055aff818'},{path:'projects/10-rclone/artifacts/unpacked/rclone-v1.75.2-windows-amd64/rclone.exe',bytes:85500928,sha256:'41eab3e118d264920b62c3327966c5ece0dc4dd715ee617d9e30450d8ead95a4'}];
    for(const pin of syncAssets)assert.deepEqual(identity(ordinary(path.join(repository,pin.path),96*1024*1024)),{bytes:pin.bytes,sha256:pin.sha256});
    save('rclone-prerequisites.json',{schema:'rea-notes-order-rclone-prerequisites/v1',status:'acquired',execution,assets:syncAssets,sourceCommit:'be8d6044eacb843b74d335db0c5fbe09222031fe',version:'v1.75.2',privateSyntheticEvidenceCreated:true,originalProductProcesses:0,productComparisons:0});
    const descriptors=[['flow-vault','prerequisite-acquisition.json','rea-cloud-flow-vault-prerequisites/v1','acquired'],['archive','archive-original-acquisition.json','rea-archive-zip-aes-original-acquisition/v1','authenticated'],['bsdtar','bsdtar-original-acquisition.json','rea-cloud-bsdtar-original-prerequisites/v1','acquired'],['additional','development-prerequisites.json','rea-cloud-development-additional-prerequisites/v1','acquired'],['bsdtar-smoke','bsdtar-original-smoke.json','rea-cloud-bsdtar-original-smoke/v1','passed']];
    descriptors.push(['sync','rclone-prerequisites.json','rea-notes-order-rclone-prerequisites/v1','acquired']);
    const receipts=descriptors.map(([role,file,schema,expectedStatus])=>{const bytes=ordinary(path.join(evidence,file),2*1024*1024),value=JSON.parse(bytes);assert.equal(value.schema,schema);assert.equal(value.status,expectedStatus);return {role,file,...identity(bytes)};});
    save('current-full-prerequisites.json',{schema:'rea-cloud-current-full-prerequisites/v1',status:'acquired',execution,receipts,jointArchiveBootstrapProcesses:3,separateBsdtarSmokeProcesses:1,productTestsExecutedByManifest:0,historicalReceiptsRebound:false});
  }
  if(role==='browser') {
    const cache=path.join(temporary,`rea-notes-order-chromium-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`);assert(!fs.existsSync(cache));values.PLAYWRIGHT_BROWSERS_PATH=cache;
    await child('chromium','products/rea-studio/scripts/verify-cloud-browser.mjs',['--phase','acquire','--evidence',evidence],values);assert(noLinks(cache).isDirectory());
  }
  status='acquired';
} catch(error){failure={name:error.name,message:error.message};throw error;}
finally {
  save('bootstrap-environment.json',{schema:'rea-notes-order-bootstrap-environment/v1',status,execution,role,values:status==='acquired'?values:{},manifest:identity(manifestBytes),failure});
  save('bootstrap-summary.json',{schema:'rea-notes-order-bootstrap/v1',status,execution,role,manifest:identity(manifestBytes),processes,productTests:0,originalComparisonProcesses:0,historicalReceiptsRebound:false,failure});
}
console.log(JSON.stringify({schema:'rea-notes-order-bootstrap-console/v1',status,role,processes:processes.length,productTests:0}));
