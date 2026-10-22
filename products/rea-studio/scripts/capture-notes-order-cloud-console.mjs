// Prospective top-level subprocess capture. Raw child bytes go only to owned
// unuploaded staging. Console output is a fixed bounded metadata projection.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const sha=b=>createHash('sha256').update(b).digest('hex');
const HASH=/^[0-9a-f]{64}$/;
function need(ok,code){if(!ok){const error=new Error(code);error.code=code;throw error;}}
function ordinary(full,file=false,{system=false}={}){
  need(path.isAbsolute(full),'ABSOLUTE_PATH');const parsed=path.parse(full);let at=parsed.root;
  for(const part of full.slice(parsed.root.length).split(path.sep).filter(Boolean)){
    at=path.join(at,part);const stat=fs.lstatSync(at);need(!stat.isSymbolicLink(),'LINK_REFUSED');need(at===full&&file?stat.isFile():stat.isDirectory(),'PLAIN_PATH_REQUIRED');
    if(at===full&&file&&!system)need(stat.nlink===1,'OWNED_FILE_LINK_COUNT');
  }
  need(fs.realpathSync(full).toLowerCase()===full.toLowerCase(),'PATH_ALIAS');return full;
}
function reviewed(file,expected){
  need(HASH.test(expected),'REVIEWED_SOURCE_HASH');ordinary(file,true);const before=fs.lstatSync(file,{bigint:true});
  need(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1n&&before.size<=256n*1024n,'REVIEWED_SOURCE_BYTE_BOUND');
  const descriptor=fs.openSync(file,'r');
  try{
    const opened=fs.fstatSync(descriptor,{bigint:true});for(const key of['dev','ino','size','mtimeNs','ctimeNs'])need(opened[key]===before[key],'REVIEWED_SOURCE_OPEN_IDENTITY');
    const b=Buffer.alloc(Number(before.size)+1);let offset=0;
    while(offset<b.length){const got=fs.readSync(descriptor,b,offset,b.length-offset,null);if(got===0)break;offset+=got;}
    const after=fs.fstatSync(descriptor,{bigint:true}),atPath=fs.lstatSync(file,{bigint:true});
    need(atPath.isFile()&&!atPath.isSymbolicLink()&&atPath.nlink===1n,'REVIEWED_SOURCE_PATH_CHANGED');
    for(const key of['dev','ino','size','mtimeNs','ctimeNs'])need(after[key]===before[key]&&atPath[key]===before[key],'REVIEWED_SOURCE_READ_IDENTITY');
    need(offset===Number(before.size)&&sha(b.subarray(0,offset))===expected,'REVIEWED_SOURCE_CHANGED');
  }finally{fs.closeSync(descriptor);}
  return file;
}
function save(file,value){ordinary(path.dirname(file));fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});ordinary(file,true);}
async function main(){
  need(process.platform==='win32'&&process.arch==='x64'&&process.version==='v24.16.0','HOSTED_NODE_RUNTIME');
  for(const[name,value]of Object.entries({CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab'}))need(process.env[name]===value,'HOSTED_ENVIRONMENT');
  need(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA)&&process.env.GITHUB_WORKFLOW_SHA===process.env.GITHUB_SHA,'ACTUAL_SOURCE');
  need(typeof process.env.REA_SAFE_FEATURE_BRANCH==='string'&&!process.env.REA_SAFE_FEATURE_BRANCH.startsWith('__')&&process.env.GITHUB_REF==='refs/heads/'+process.env.REA_SAFE_FEATURE_BRANCH,'REVIEWED_FEATURE_REF');
  need(process.env.REA_NOTES_ORDER_PARENT==='cd4fbe97765a156b2dd591193ea3196b4d63b6b2','PARENT_IDENTITY');need(/^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ID)&&/^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ATTEMPT),'ACTUAL_ATTEMPT');
  const args=process.argv.slice(2);need(args.length===4&&args[0]==='--phase'&&['before','bootstrap','run','after','qualify','filter-validation','filter','diagnostics','diagnostics-containment','diagnostic-validation'].includes(args[1])&&args[2]==='--evidence','CAPTURE_ARGUMENTS');
  const phase=args[1],role=process.env.REA_NOTES_ORDER_ROLE;need(['full','finite','values','browser'].includes(role),'ROLE');if(phase==='diagnostics'||phase==='diagnostics-containment')need(role==='full','DIAGNOSTIC_FULL_ROLE_ONLY');
  const jobs={full:'full-current-installed',finite:'notes46-installed-finite',values:'notes46-observed-values',browser:'draft-recovery-real-chromium'};
  need(process.env.GITHUB_JOB===((phase==='filter-validation'||phase==='diagnostic-validation')?'safe-evidence-controls':jobs[role]),'ROLE_JOB');
  need(process.env.REA_SAFE_FEATURE_BRANCH==='experiment/notes-open-todos-first-20261022-r3','FIXED_FEATURE_BRANCH');
  const temporary=fs.realpathSync(process.env.RUNNER_TEMP);ordinary(temporary);const evidence=path.resolve(args[3]);
  const expectedName=phase==='diagnostic-validation'?'rea-notes-order-diagnostic-validation-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT:phase==='diagnostics-containment'?'rea-notes-order-diagnostics-containment-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT:phase==='filter-validation'?'rea-notes-order-filter-validation-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT:'rea-notes-order-'+role+'-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT;
  need(path.dirname(evidence)===temporary&&path.basename(evidence)===expectedName,'OWNED_CAPTURE_ROOT');
  if(phase==='before'||phase==='filter-validation'||phase==='diagnostics-containment'||phase==='diagnostic-validation'){need(!fs.existsSync(evidence),'NO_EARLIER_RAW_ROOT');fs.mkdirSync(evidence);}ordinary(evidence);
  const studio=fileURLToPath(new URL('../',import.meta.url)),repository=path.resolve(studio,'../..');ordinary(repository);
  reviewed(fileURLToPath(import.meta.url),process.env.REA_SAFE_CAPTURE_SHA256);
  let command,argv,safeOutput=null,captureRoot=evidence,privateFilterOutput=null;
  if(phase==='filter-validation'){
    command=process.execPath;argv=[reviewed(path.join(studio,'scripts/validate-safe-notes-order-evidence.mjs'),process.env.REA_SAFE_VALIDATOR_SHA256)];
  }else if(phase==='diagnostic-validation'){
    need(role==='finite','DIAGNOSTIC_VALIDATION_ROLE');safeOutput=path.join(temporary,'rea-safe-notes-diagnostic-validation-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT);need(path.dirname(safeOutput)===temporary&&!fs.existsSync(safeOutput),'NO_EARLIER_DIAGNOSTIC_VALIDATION');
    reviewed(path.join(studio,'scripts/notes-full-progress-contract.mjs'),process.env.REA_SAFE_PROGRESS_CONTRACT_SHA256);reviewed(path.join(studio,'scripts/export-safe-notes-full-progress.mjs'),process.env.REA_SAFE_DIAGNOSTIC_EXPORTER_SHA256);
    const progressControls=reviewed(path.join(studio,'scripts/notes-full-progress.cloud-check.mjs'),process.env.REA_SAFE_PROGRESS_CONTROLS_SHA256),exporterControls=reviewed(path.join(studio,'scripts/notes-full-diagnostic-exporter.cloud-check.mjs'),process.env.REA_SAFE_DIAGNOSTIC_CONTROLS_SHA256);
    command=process.execPath;argv=['--test','--test-reporter=tap','--test-concurrency=1',progressControls,exporterControls];
  }else if(phase==='diagnostics-containment'){
    safeOutput=path.join(temporary,'rea-safe-notes-diagnostic-containment-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT);
    need(path.dirname(safeOutput)===temporary&&!fs.existsSync(safeOutput),'NO_EARLIER_CONTAINMENT_SUMMARY');
    privateFilterOutput=path.join(captureRoot,'private-containment-output.txt');fs.writeFileSync(privateFilterOutput,Buffer.alloc(0),{flag:'wx'});ordinary(privateFilterOutput,true);
    command=process.execPath;argv=[reviewed(path.join(studio,'scripts/notes-full-diagnostic-containment-child.mjs'),process.env.REA_SAFE_DIAGNOSTIC_CONTAINMENT_SHA256)];
  }else if(phase==='diagnostics'){
    safeOutput=path.join(temporary,'rea-safe-notes-full-diagnostic-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT);
    need(path.dirname(safeOutput)===temporary&&!fs.existsSync(safeOutput),'NO_EARLIER_DIAGNOSTIC_OUTPUT');
    captureRoot=path.join(temporary,'rea-safe-notes-full-diagnostic-console-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT);
    need(path.dirname(captureRoot)===temporary&&!fs.existsSync(captureRoot),'NO_EARLIER_DIAGNOSTIC_CONSOLE');fs.mkdirSync(captureRoot);ordinary(captureRoot);
    privateFilterOutput=path.join(captureRoot,'private-diagnostic-output.txt');fs.writeFileSync(privateFilterOutput,Buffer.alloc(0),{flag:'wx'});ordinary(privateFilterOutput,true);
    reviewed(path.join(studio,'scripts/notes-full-progress-contract.mjs'),process.env.REA_SAFE_PROGRESS_CONTRACT_SHA256);
    const exporter=reviewed(path.join(studio,'scripts/export-safe-notes-full-progress.mjs'),process.env.REA_SAFE_DIAGNOSTIC_EXPORTER_SHA256);
    command=process.execPath;argv=[exporter,'--evidence',evidence];
  }else if(phase==='filter'){
    safeOutput=path.resolve(process.env.REA_SAFE_EVIDENCE??'');
    need(path.dirname(safeOutput)===temporary&&path.basename(safeOutput)==='rea-safe-notes-order-'+role+'-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT,'FIXED_SAFE_FILTER_ROOT');
    need(!fs.existsSync(safeOutput),'NO_EARLIER_SAFE_FILTER_OUTPUT');
    captureRoot=path.join(temporary,'rea-safe-notes-order-filter-console-'+role+'-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT);
    need(path.dirname(captureRoot)===temporary&&!fs.existsSync(captureRoot),'NO_EARLIER_FILTER_CONSOLE');fs.mkdirSync(captureRoot);ordinary(captureRoot);
    privateFilterOutput=path.join(captureRoot,'private-filter-output.txt');fs.writeFileSync(privateFilterOutput,Buffer.alloc(0),{flag:'wx'});ordinary(privateFilterOutput,true);
    const filter=reviewed(path.join(studio,'scripts/prepare-safe-notes-order-evidence.mjs'),process.env.REA_SAFE_FILTER_SHA256);
    const policy=reviewed(path.join(studio,'experiments/notes-open-todos-first-20261021/safe-evidence-policy.json'),process.env.REA_SAFE_EVIDENCE_POLICY_SHA256);
    command=process.execPath;argv=[filter,'--raw',evidence,'--output',safeOutput,'--policy',policy];
  }else if(phase==='bootstrap'){
    const bootstrap=reviewed(path.join(studio,'scripts/bootstrap-notes-open-todos-cloud.mjs'),process.env.REA_SAFE_BOOTSTRAP_SHA256);
    command=process.execPath;argv=[bootstrap,'--role',role,'--evidence',evidence];
  }else if(phase==='qualify'){
    const qualifier=reviewed(path.join(studio,'scripts/qualify-notes-open-todos-cloud.mjs'),process.env.REA_SAFE_QUALIFIER_SHA256);
    command=process.execPath;argv=[qualifier,'--role',role,'--evidence',evidence];
  }else{
    const collector=reviewed(path.join(studio,'scripts/verify-notes-open-todos-cloud.mjs'),process.env.REA_SAFE_COLLECTOR_SHA256);
    command=process.execPath;argv=[collector,'--role',role,'--phase',phase,'--evidence',evidence];
  }
  const limits=phase==='diagnostics-containment'?{stdout:65536,stderr:65536}:{stdout:8*1024*1024,stderr:2*1024*1024},files={stdout:path.join(captureRoot,'console-'+phase+'.stdout.txt'),stderr:path.join(captureRoot,'console-'+phase+'.stderr.txt')};
  const fds={stdout:fs.openSync(files.stdout,'wx'),stderr:fs.openSync(files.stderr,'wx')};
  const record={schema:'rea-owned-top-level-console-capture/v1',phase,role,source:process.env.GITHUB_SHA,parent:process.env.REA_NOTES_ORDER_PARENT,runID:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,job:process.env.GITHUB_JOB,status:'running',sourceCommand:'reviewed '+(phase==='filter-validation'?'synthetic filter validation':phase==='diagnostic-validation'?'fourteen fixed diagnostic metadata controls':phase==='filter'?'privacy filter':phase==='diagnostics'?'independent diagnostics-only exporter':phase==='diagnostics-containment'?'fixed expected-failure containment child':phase==='bootstrap'?'Notes prerequisite bootstrap':phase==='qualify'?'Notes semantic qualifier':'Notes source and process collector'),stdout:{path:path.basename(files.stdout),bytes:0,limit:limits.stdout},stderr:{path:path.basename(files.stderr),bytes:0,limit:limits.stderr},droppedBytes:0,closeObserved:false,exitCode:null,signal:null,failureCode:null,rawChildOutputEchoed:false,originalExecutionAcceptance:false};
  const activeSignals=[];let child=null;
  try{
    const outcome=await new Promise(resolve=>{
      let settled=false,stopping=false,deadline=null,closeDeadline=null;
      const finish=(exitCode,signal,closeObserved)=>{if(settled)return;settled=true;clearTimeout(deadline);clearTimeout(closeDeadline);resolve({exitCode,signal,closeObserved});};
      const stop=code=>{
        if(stopping)return;stopping=true;record.failureCode??=code;
        if(child?.pid){const kill=spawnSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{shell:false,windowsHide:true,stdio:'ignore',timeout:10000});if(kill.status!==0)child.kill('SIGKILL');}
        closeDeadline=setTimeout(()=>{child?.stdout?.destroy();child?.stderr?.destroy();finish(null,null,false);},5000);
      };
      for(const name of['SIGINT','SIGTERM','SIGBREAK']){const handler=()=>stop('CAPTURE_INTERRUPTED');process.on(name,handler);activeSignals.push([name,handler]);}
      const childEnvironment={...process.env};
      // Children retain actual read-only execution identity and owned fixture
      // paths, but cannot publish file commands or use inherited action tokens.
      for(const name of Object.keys(childEnvironment))if(/^(?:GITHUB_(?:OUTPUT|ENV|PATH|STEP_SUMMARY|STATE|TOKEN)|GH_TOKEN|ACTIONS_RUNTIME_TOKEN|ACTIONS_ID_TOKEN_REQUEST_(?:TOKEN|URL))$/i.test(name))delete childEnvironment[name];
      // Only the reviewed metadata filter receives a fake private channel. It
      // never receives the real step output file or an action/auth token.
      if(phase==='filter'||phase==='diagnostics'||phase==='diagnostics-containment')childEnvironment.GITHUB_OUTPUT=privateFilterOutput;
      child=spawn(command,argv,{cwd:repository,env:childEnvironment,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
      deadline=setTimeout(()=>stop('CAPTURE_DEADLINE'),phase==='diagnostics-containment'?30000:phase==='run'?58*60*1000:phase==='bootstrap'?(role==='full'?36*60*1000:12*60*1000):5*60*1000);
      for(const kind of['stdout','stderr']){
        child[kind].on('data',b=>{
          if(settled)return;
          try{const count=Math.min(b.length,Math.max(0,limits[kind]-record[kind].bytes));if(count){fs.writeFileSync(fds[kind],b.subarray(0,count));record[kind].bytes+=count;}record.droppedBytes+=b.length-count;if(count!==b.length)stop('CAPTURE_STREAM_BOUND');}
          catch{stop('CAPTURE_STREAM_WRITE');}
        });
        child[kind].on('error',()=>stop('CAPTURE_STREAM_ERROR'));
      }
      child.on('error',()=>{record.failureCode??='CAPTURE_SPAWN_ERROR';});
      child.on('close',(exitCode,signal)=>finish(exitCode,signal,true));
    });
    Object.assign(record,outcome);record.status=record.failureCode===null&&record.closeObserved&&record.exitCode===0&&record.signal===null&&record.droppedBytes===0?'passed':'failed';
    if(phase==='filter'&&record.status==='passed'){
      function small(file,maximum){
        ordinary(file,true);const before=fs.lstatSync(file,{bigint:true});need(before.size<=BigInt(maximum),'FILTER_PROJECTION_BYTE_BOUND');const fd=fs.openSync(file,'r');
        try{const opened=fs.fstatSync(fd,{bigint:true});for(const key of['dev','ino','size','mtimeNs','ctimeNs'])need(opened[key]===before[key],'FILTER_PROJECTION_OPEN_IDENTITY');const b=Buffer.alloc(Number(before.size)+1);let offset=0;while(offset<b.length){const n=fs.readSync(fd,b,offset,b.length-offset,null);if(n===0)break;offset+=n;}const after=fs.fstatSync(fd,{bigint:true}),atPath=fs.lstatSync(file,{bigint:true});need(atPath.isFile()&&!atPath.isSymbolicLink()&&atPath.nlink===1n,'FILTER_PROJECTION_PATH_CHANGED');for(const key of['dev','ino','size','mtimeNs','ctimeNs'])need(after[key]===before[key]&&atPath[key]===before[key],'FILTER_PROJECTION_READ_IDENTITY');need(offset===Number(before.size),'FILTER_PROJECTION_READ_LENGTH');return b.subarray(0,offset);}finally{fs.closeSync(fd);}
      }
      need(record.stderr.bytes===0,'FILTER_PROJECTION_STDERR');const stdout=small(files.stdout,65536),projection=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(stdout));
      need(Object.keys(projection).sort().join('|')===['schema','status','role','source','outputFiles','outputBytes','omittedFiles','rawCompleteArchiveUploaded','productAcceptance'].sort().join('|'),'FILTER_PROJECTION_KEYS');
      need(projection.schema==='rea-safe-evidence-filter-console/v1'&&projection.status==='safe-view-ready'&&projection.role===role&&projection.source===record.source&&projection.rawCompleteArchiveUploaded===false&&projection.productAcceptance===false,'FILTER_SUCCESS_PROJECTION');
      ordinary(safeOutput);const safeBytes=small(path.join(safeOutput,'safe-evidence.json'),4*1024*1024),safe=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(safeBytes));
      const expectedExecution={repository:process.env.GITHUB_REPOSITORY,source:record.source,parent:record.parent,workflowSHA:process.env.GITHUB_WORKFLOW_SHA,ref:process.env.GITHUB_REF,runID:record.runID,attempt:record.attempt,job:record.job,role};
      need(JSON.stringify(Object.entries(safe.execution??{}).sort())===JSON.stringify(Object.entries(expectedExecution).sort()),'FILTER_SAFE_SUBJECT');
      need(safe.schema==='rea-safe-cloud-evidence-representation/v1'&&safe.status==='complete-derived-safe-view'&&safe.completeSourceAdmission===true&&safe.rawCompleteArchiveUploaded===false&&safe.historicalReceiptsRebound===false&&safe.productAcceptance===false&&safe.fullParity===false&&safe.superiority===false&&safe.sourceManifestSHA256===process.env.REA_NOTES_ORDER_MANIFEST_SHA256,'FILTER_SAFE_REPRESENTATION');
      need(Number.isSafeInteger(projection.outputFiles)&&Number.isSafeInteger(projection.outputBytes)&&Number.isSafeInteger(projection.omittedFiles)&&projection.outputFiles===safe.retainedFiles+3&&projection.omittedFiles===safe.omittedFiles&&projection.outputFiles>0&&projection.outputBytes>=0,'FILTER_SAFE_COUNTS');
      const omissionBytes=small(path.join(safeOutput,'omissions.json'),4*1024*1024),retainedBytes=small(path.join(safeOutput,'retained-members.json'),4*1024*1024);
      need(projection.outputBytes===safe.retainedBytes+safeBytes.length+omissionBytes.length+retainedBytes.length,'FILTER_SAFE_BYTE_TOTAL');
      need(small(privateFilterOutput,4096).equals(Buffer.from('artifact_path='+safeOutput+'\n')),'FILTER_FAKE_OUTPUT_EXACT');
      record.safeFilterProjection={verified:true,outputFiles:projection.outputFiles,outputBytes:projection.outputBytes,omittedFiles:projection.omittedFiles,realOutputChannelInherited:false,rawFilterStreamsUploaded:false};
    }
    if(phase==='diagnostic-validation'&&record.status==='passed'){
      need(record.stderr.bytes===0,'DIAGNOSTIC_CONTROLS_STDERR');ordinary(files.stdout,true);const b=fs.readFileSync(files.stdout);need(b.length===record.stdout.bytes&&b.length<=8*1024*1024,'DIAGNOSTIC_CONTROLS_STDOUT_BOUND');const text=new TextDecoder('utf-8',{fatal:true}).decode(b),expected={tests:14,pass:14,fail:0,cancelled:0,skipped:0,todo:0};for(const[k,v]of Object.entries(expected)){const found=[...text.matchAll(new RegExp('^# '+k+' ([0-9]+)\\r?$','gm'))];need(found.length===1&&Number(found[0][1])===v,'DIAGNOSTIC_CONTROLS_TAP_COUNT');}need(!/^not ok(?: |$)/m.test(text),'DIAGNOSTIC_CONTROLS_NOT_OK');
      const summary={schema:'rea-notes-full-diagnostic-metadata-controls/v1',status:'qualified-exact-fourteen-hosted-metadata-controls',source:record.source,parent:record.parent,runID:record.runID,attempt:record.attempt,job:record.job,progressControls:6,exporterPayloadControls:8,totalControls:14,passed:14,failed:0,cancelled:0,skipped:0,todo:0,closeObserved:true,exitCode:0,rawControlStreamsUploaded:false,existing35FilterControlsModified:false,selectedProductModules:184,productDeadlineMilliseconds:2400000,runtimeAcceptance:false,semanticAcceptance:false,productAcceptance:false,allTenComplete:false};fs.mkdirSync(safeOutput);ordinary(safeOutput);const f=path.join(safeOutput,'diagnostic-validation.json');save(f,summary);need(fs.readFileSync(f).equals(Buffer.from(JSON.stringify(summary,null,2)+'\n')),'DIAGNOSTIC_CONTROLS_SUMMARY_READBACK');need(fs.readdirSync(safeOutput).join('|')==='diagnostic-validation.json','DIAGNOSTIC_CONTROLS_EXACT_TREE');record.diagnosticValidationProjection={verified:true,controls:14,passed:14,outputFiles:1,rawControlStreamsUploaded:false,productAcceptance:false};
    }
    if(phase==='diagnostics-containment'){
      need(record.failureCode===null&&record.closeObserved===true&&record.exitCode===23&&record.signal===null&&record.droppedBytes===0,'CONTAINMENT_EXPECTED_CHILD_OUTCOME');
      function containmentRead(file,maximum){ordinary(file,true);const before=fs.lstatSync(file,{bigint:true});need(before.size<=BigInt(maximum),'CONTAINMENT_BYTE_BOUND');const fd=fs.openSync(file,'r');try{const opened=fs.fstatSync(fd,{bigint:true});for(const key of['dev','ino','size','mtimeNs','ctimeNs'])need(opened[key]===before[key],'CONTAINMENT_OPEN_IDENTITY');const b=Buffer.alloc(Number(before.size)+1);let offset=0;while(offset<b.length){const n=fs.readSync(fd,b,offset,b.length-offset,null);if(n===0)break;offset+=n;}const after=fs.fstatSync(fd,{bigint:true}),at=fs.lstatSync(file,{bigint:true});need(at.isFile()&&!at.isSymbolicLink()&&at.nlink===1n,'CONTAINMENT_PATH_IDENTITY');for(const key of['dev','ino','size','mtimeNs','ctimeNs'])need(after[key]===before[key]&&at[key]===before[key],'CONTAINMENT_READ_IDENTITY');need(offset===Number(before.size),'CONTAINMENT_READ_LENGTH');return b.subarray(0,offset);}finally{fs.closeSync(fd);}}
      const expected={schema:'rea-notes-full-diagnostic-containment-child/v1',source:record.source,parent:record.parent,runID:record.runID,attempt:record.attempt,job:record.job,role:'full',realParentChannelsAbsent:10,privateFakeOutputOwned:true,code:'EXPECTED_CHILD_REFUSAL',expectedExitCode:23};
      need(containmentRead(files.stdout,65536).equals(Buffer.from('REA_NOTES_DIAGNOSTIC_CONTAINMENT_STDOUT_MARKER_V1\n'+JSON.stringify(expected)+'\n')),'CONTAINMENT_EXACT_PRIVATE_STDOUT');
      need(containmentRead(files.stderr,65536).equals(Buffer.from('REA_NOTES_DIAGNOSTIC_CONTAINMENT_STDERR_MARKER_V1\n')),'CONTAINMENT_EXACT_PRIVATE_STDERR');
      need(containmentRead(privateFilterOutput,4096).equals(Buffer.from('containment_owned_output=REA_NOTES_DIAGNOSTIC_CONTAINMENT_FAKE_OUTPUT_V1\n')),'CONTAINMENT_EXACT_FAKE_OUTPUT');
      const summary={schema:'rea-notes-full-diagnostics-containment/v1',status:'qualified-exact-owned-channel-containment',source:record.source,parent:record.parent,runID:record.runID,attempt:record.attempt,job:record.job,role:'full',realParentChannelsAbsent:10,privateFakeOutputVerified:true,expectedChildExitCode:23,observedChildExitCode:record.exitCode,closeObserved:true,droppedBytes:0,rawChildOutputEchoed:false,privateStreamsUploaded:false,runtimeAcceptance:false,semanticAcceptance:false,productAcceptance:false,allTenComplete:false};
      fs.mkdirSync(safeOutput);ordinary(safeOutput);const summaryFile=path.join(safeOutput,'diagnostics-containment.json');save(summaryFile,summary);need(containmentRead(summaryFile,65536).equals(Buffer.from(JSON.stringify(summary,null,2)+'\n')),'CONTAINMENT_SUMMARY_READBACK');need(fs.readdirSync(safeOutput).join('|')==='diagnostics-containment.json','CONTAINMENT_EXACT_PUBLIC_TREE');
      record.containmentProjection={verified:true,expectedRefusalObserved:true,childExitCode:23,outputFiles:1,realParentChannelsAbsent:10,realOutputChannelInherited:false,rawControlMarkersUploaded:false,productAcceptance:false};record.status='passed';
    }
    if(phase==='diagnostics'&&record.status==='passed'){
      function diagnosticRead(file,maximum){ordinary(file,true);const before=fs.lstatSync(file,{bigint:true});need(before.size<=BigInt(maximum),'DIAGNOSTIC_BYTE_BOUND');const fd=fs.openSync(file,'r');try{const opened=fs.fstatSync(fd,{bigint:true});for(const key of['dev','ino','size','mtimeNs','ctimeNs'])need(opened[key]===before[key],'DIAGNOSTIC_OPEN_IDENTITY');const b=Buffer.alloc(Number(before.size)+1);let offset=0;while(offset<b.length){const n=fs.readSync(fd,b,offset,b.length-offset,null);if(n===0)break;offset+=n;}const after=fs.fstatSync(fd,{bigint:true}),at=fs.lstatSync(file,{bigint:true});need(at.isFile()&&!at.isSymbolicLink()&&at.nlink===1n,'DIAGNOSTIC_PATH_IDENTITY');for(const key of['dev','ino','size','mtimeNs','ctimeNs'])need(after[key]===before[key]&&at[key]===before[key],'DIAGNOSTIC_READ_IDENTITY');need(offset===Number(before.size),'DIAGNOSTIC_READ_LENGTH');return b.subarray(0,offset);}finally{fs.closeSync(fd);}}
      need(record.stderr.bytes===0,'DIAGNOSTIC_SUCCESS_STDERR');const projection=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(diagnosticRead(files.stdout,65536)));
      need(Object.keys(projection).sort().join('|')===['schema','status','source','runID','attempt','files','outputBytes','progressCode','parentCode','productAcceptance'].sort().join('|'),'DIAGNOSTIC_PROJECTION_KEYS');
      need(projection.schema==='rea-notes-full-safe-failure-diagnostic-console/v1'&&projection.status==='diagnostic-view-ready'&&projection.source===record.source&&projection.runID===record.runID&&projection.attempt===record.attempt&&projection.productAcceptance===false,'DIAGNOSTIC_PROJECTION_SUBJECT');
      need(['PROGRESS_ABSENT','PROGRESS_VALID_COMPLETE_PREFIX','PROGRESS_VALID','PROGRESS_INVALID'].includes(projection.progressCode)&&['PARENT_STATE_ABSENT','PARENT_STATE_VALID','PARENT_STATE_INVALID'].includes(projection.parentCode),'DIAGNOSTIC_STATE_CODES');
      const names=['diagnostic-summary.json','module-progress.jsonl','module-roster.json'];need(Array.isArray(projection.files)&&projection.files.length===3&&projection.files.every((r,i)=>r.name===names[i]),'DIAGNOSTIC_CLOSED_OUTPUTS');ordinary(safeOutput);need(fs.readdirSync(safeOutput).sort().join('|')===[...names].sort().join('|'),'DIAGNOSTIC_EXACT_TREE');
      let total=0,summary=null;for(const row of projection.files){need(Object.keys(row).sort().join('|')===['name','bytes','sha256'].sort().join('|')&&Number.isSafeInteger(row.bytes)&&row.bytes>=0&&HASH.test(row.sha256),'DIAGNOSTIC_OUTPUT_PIN');const bytes=diagnosticRead(path.join(safeOutput,row.name),row.name==='module-progress.jsonl'?512*1024:65536);need(row.bytes===bytes.length&&row.sha256===sha(bytes),'DIAGNOSTIC_OUTPUT_READBACK');total+=bytes.length;if(row.name==='diagnostic-summary.json')summary=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
      need(Number.isSafeInteger(projection.outputBytes)&&projection.outputBytes===total,'DIAGNOSTIC_OUTPUT_BYTES');
      need(summary.schema==='rea-notes-full-safe-failure-diagnostic/v1'&&summary.status==='diagnostic-only-not-product-acceptance'&&summary.source===record.source&&summary.parent===record.parent&&summary.runID===record.runID&&summary.attempt===record.attempt&&summary.manifestSHA256===process.env.REA_NOTES_ORDER_MANIFEST_SHA256&&summary.selectedModules===184&&summary.progressCode===projection.progressCode&&summary.parentCode===projection.parentCode,'DIAGNOSTIC_SUMMARY_SUBJECT');
      for(const key of['rawTAPCopied','rawTestTitlesCopied','rawErrorContentsCopied','rawAbsolutePathsCopied','unadmittedRawMembersCopied','rawTreeEnumerated','mainFilterAcceptanceChanged','performanceClaim','runtimeAcceptance','semanticAcceptance','fullProductAcceptance','allTenComplete'])need(summary[key]===false,'DIAGNOSTIC_SCOPE_FALSE');
      need(diagnosticRead(privateFilterOutput,4096).equals(Buffer.from('artifact_path='+safeOutput+'\n')),'DIAGNOSTIC_FAKE_OUTPUT_EXACT');record.safeDiagnosticProjection={verified:true,outputFiles:3,outputBytes:total,realOutputChannelInherited:false,rawChildStreamsUploaded:false,productAcceptance:false};
    }
  }catch{record.status='failed';record.failureCode??='CAPTURE_DRIVER_REFUSED';}
  finally{
    for(const[name,handler]of activeSignals)process.off(name,handler);
    for(const kind of['stdout','stderr']){fs.fsyncSync(fds[kind]);fs.closeSync(fds[kind]);ordinary(files[kind],true);const b=fs.readFileSync(files[kind]);need(b.length===record[kind].bytes,'CAPTURE_STREAM_READBACK');record[kind].sha256=sha(b);}
    save(path.join(captureRoot,'console-'+phase+'.json'),record);
  }
  if(phase==='filter'&&record.status==='passed'){
    need(record.safeFilterProjection?.verified===true&&typeof process.env.GITHUB_OUTPUT==='string'&&process.env.GITHUB_OUTPUT.length>0,'OWNED_PARENT_FILTER_OUTPUT');
    fs.appendFileSync(process.env.GITHUB_OUTPUT,'artifact_path='+safeOutput+'\n');
  }
  if(phase==='diagnostics'&&record.status==='passed'){
    need(record.safeDiagnosticProjection?.verified===true&&typeof process.env.GITHUB_OUTPUT==='string'&&process.env.GITHUB_OUTPUT.length>0,'OWNED_PARENT_DIAGNOSTIC_OUTPUT');
    fs.appendFileSync(process.env.GITHUB_OUTPUT,'artifact_path='+safeOutput+'\n');
  }
  if(phase==='diagnostics-containment'&&record.status==='passed'){
    need(record.containmentProjection?.verified===true&&typeof process.env.GITHUB_OUTPUT==='string'&&process.env.GITHUB_OUTPUT.length>0,'OWNED_PARENT_CONTAINMENT_OUTPUT');
    fs.appendFileSync(process.env.GITHUB_OUTPUT,'containment_passed=true\nartifact_path='+safeOutput+'\n');
  }
  if(phase==='diagnostic-validation'&&record.status==='passed'){
    need(record.diagnosticValidationProjection?.verified===true&&typeof process.env.GITHUB_OUTPUT==='string'&&process.env.GITHUB_OUTPUT.length>0,'OWNED_PARENT_DIAGNOSTIC_CONTROL_OUTPUT');fs.appendFileSync(process.env.GITHUB_OUTPUT,'artifact_path='+safeOutput+'\n');
  }
  // Never log command arguments, a captured byte, error.message/stack, source
  // excerpts, credentials, URLs, or arbitrary environment values.
  console.log(JSON.stringify({schema:'rea-safe-capture-console/v1',phase,role,source:record.source,status:record.status,stdoutBytes:record.stdout.bytes,stderrBytes:record.stderr.bytes,droppedBytes:record.droppedBytes,exitCode:record.exitCode,closeObserved:record.closeObserved,failureCode:record.failureCode,rawChildOutputEchoed:false}));
  if(record.status!=='passed')process.exitCode=1;
}
try{await main();}catch(error){const code=typeof error.code==='string'&&/^[A-Z0-9_]{1,64}$/.test(error.code)?error.code:'CAPTURE_REFUSED';console.error(JSON.stringify({schema:'rea-safe-capture-console/v1',status:'failed',code,rawChildOutputEchoed:false}));process.exitCode=1;}
