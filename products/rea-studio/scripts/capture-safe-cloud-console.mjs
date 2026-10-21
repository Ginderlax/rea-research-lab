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
  for(const[name,value]of Object.entries({CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab',GITHUB_JOB:'validate'}))need(process.env[name]===value,'HOSTED_ENVIRONMENT');
  need(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA)&&process.env.GITHUB_WORKFLOW_SHA===process.env.GITHUB_SHA,'ACTUAL_SOURCE');
  need(typeof process.env.REA_SAFE_FEATURE_BRANCH==='string'&&!process.env.REA_SAFE_FEATURE_BRANCH.startsWith('__')&&process.env.GITHUB_REF==='refs/heads/'+process.env.REA_SAFE_FEATURE_BRANCH,'REVIEWED_FEATURE_REF');
  need(/^[0-9a-f]{40}$/.test(process.env.REA_ARCHIVE_ZIP_PARENT),'PARENT_IDENTITY');need(/^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ID)&&/^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ATTEMPT),'ACTUAL_ATTEMPT');
  const args=process.argv.slice(2);need(args.length===4&&args[0]==='--phase'&&['before','run','after','filter-validation'].includes(args[1])&&args[2]==='--evidence','CAPTURE_ARGUMENTS');
  const phase=args[1],role=process.env.REA_ARCHIVE_ZIP_ROLE;need(['finite','zip-original','browser'].includes(role),'ROLE');
  const temporary=fs.realpathSync(process.env.RUNNER_TEMP);ordinary(temporary);const evidence=path.resolve(args[3]);
  const expectedName=phase==='filter-validation'?'rea-filter-validation-console-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT:'rea-archive-zip-aes-'+role+'-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT;
  need(path.dirname(evidence)===temporary&&path.basename(evidence)===expectedName,'OWNED_CAPTURE_ROOT');
  if(phase==='before'||phase==='filter-validation'){need(!fs.existsSync(evidence),'NO_EARLIER_RAW_ROOT');fs.mkdirSync(evidence);}ordinary(evidence);
  const studio=fileURLToPath(new URL('../',import.meta.url)),repository=path.resolve(studio,'../..');ordinary(repository);
  reviewed(fileURLToPath(import.meta.url),process.env.REA_SAFE_CAPTURE_SHA256);
  let command,argv;
  if(phase==='filter-validation'){
    command=process.execPath;argv=[reviewed(path.join(studio,'scripts/validate-safe-cloud-evidence.mjs'),process.env.REA_SAFE_VALIDATOR_SHA256)];
  }else if(phase==='run'){
    const collector=reviewed(path.join(studio,'scripts/verify-archive-zip-aes-cloud.mjs'),process.env.REA_SAFE_COLLECTOR_SHA256);
    command=process.execPath;argv=[collector,'--role',role,'--evidence',evidence];
  }else{
    const gate=reviewed(path.join(studio,'scripts/archive-zip-aes-source-admission.ps1'),process.env.REA_ARCHIVE_ZIP_ADMISSION_SCRIPT_SHA256);
    // Observe the fixed supported runner PowerShell file; legitimate system
    // hard links are allowed, but links/aliases/nonordinary paths are refused.
    command=ordinary('C:\\Program Files\\PowerShell\\7\\pwsh.exe',true,{system:true});
    need(HASH.test(process.env.REA_ARCHIVE_ZIP_MANIFEST_SHA256),'REVIEWED_MANIFEST_HASH');
    argv=['-NoLogo','-NoProfile','-NonInteractive','-File',gate,'-Phase',phase,'-Evidence',evidence,'-ExpectedManifestSHA256',process.env.REA_ARCHIVE_ZIP_MANIFEST_SHA256,'-ExpectedParent',process.env.REA_ARCHIVE_ZIP_PARENT];
  }
  const limits={stdout:8*1024*1024,stderr:2*1024*1024},files={stdout:path.join(evidence,'console-'+phase+'.stdout.txt'),stderr:path.join(evidence,'console-'+phase+'.stderr.txt')};
  const fds={stdout:fs.openSync(files.stdout,'wx'),stderr:fs.openSync(files.stderr,'wx')};
  const record={schema:'rea-owned-top-level-console-capture/v1',phase,role,source:process.env.GITHUB_SHA,parent:process.env.REA_ARCHIVE_ZIP_PARENT,runID:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,job:process.env.GITHUB_JOB,status:'running',sourceCommand:'reviewed '+(phase==='filter-validation'?'synthetic filter validation':phase==='run'?'Archive collector':'source admission'),stdout:{path:path.basename(files.stdout),bytes:0,limit:limits.stdout},stderr:{path:path.basename(files.stderr),bytes:0,limit:limits.stderr},droppedBytes:0,closeObserved:false,exitCode:null,signal:null,failureCode:null,rawChildOutputEchoed:false,originalExecutionAcceptance:false};
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
      child=spawn(command,argv,{cwd:repository,env:childEnvironment,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
      deadline=setTimeout(()=>stop('CAPTURE_DEADLINE'),phase==='run'?58*60*1000:5*60*1000);
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
  }catch{record.status='failed';record.failureCode??='CAPTURE_DRIVER_REFUSED';}
  finally{
    for(const[name,handler]of activeSignals)process.off(name,handler);
    for(const kind of['stdout','stderr']){fs.fsyncSync(fds[kind]);fs.closeSync(fds[kind]);ordinary(files[kind],true);const b=fs.readFileSync(files[kind]);need(b.length===record[kind].bytes,'CAPTURE_STREAM_READBACK');record[kind].sha256=sha(b);}
    save(path.join(evidence,'console-'+phase+'.json'),record);
  }
  // Never log command arguments, a captured byte, error.message/stack, source
  // excerpts, credentials, URLs, or arbitrary environment values.
  console.log(JSON.stringify({schema:'rea-safe-capture-console/v1',phase,role,source:record.source,status:record.status,stdoutBytes:record.stdout.bytes,stderrBytes:record.stderr.bytes,droppedBytes:record.droppedBytes,exitCode:record.exitCode,closeObserved:record.closeObserved,failureCode:record.failureCode,rawChildOutputEchoed:false}));
  if(record.status!=='passed')process.exitCode=1;
}
try{await main();}catch(error){const code=typeof error.code==='string'&&/^[A-Z0-9_]{1,64}$/.test(error.code)?error.code:'CAPTURE_REFUSED';console.error(JSON.stringify({schema:'rea-safe-capture-console/v1',status:'failed',code,rawChildOutputEchoed:false}));process.exitCode=1;}
