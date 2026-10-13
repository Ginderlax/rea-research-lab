import {spawn} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';

const DEFAULTS=Object.freeze({timeoutMs:30000,stdoutBytes:4*1024*1024,stderrBytes:1024*1024,cleanupMs:5000});
function integer(value,min,max,name){if(!Number.isSafeInteger(value)||value<min||value>max)throw new Error('Invalid collector '+name);return value;}
// Only the PID from this child object is targeted. No process-name or user PID
// lookup occurs. Windows tree termination uses the system taskkill executable.
async function terminateTree(child,cleanupMs){
 if(!Number.isSafeInteger(child.pid)||child.pid<=0)return{attempted:false,reason:'No process was spawned',confirmed:true};
 if(child.exitCode!==null||child.signalCode!==null)return{attempted:false,reason:'Owned child already exited',confirmed:true,descendantGuarantee:false};
 if(process.platform!=='win32'){
  try{process.kill(-child.pid,'SIGKILL');return{attempted:true,method:'owned detached process group',confirmed:true};}catch(error){return{attempted:true,method:'owned detached process group',confirmed:error.code==='ESRCH',error:error.message};}
 }
 const root=process.env.SystemRoot??process.env.WINDIR;
 if(typeof root!=='string'||!path.win32.isAbsolute(root)||root.includes('\0'))return{attempted:false,confirmed:false,error:'Windows system directory is unavailable'};
 return new Promise(resolve=>{
  const cleanup=spawn(path.join(root,'System32/taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']}),chunks=[];let bytes=0,done=false;
  const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve({attempted:true,method:'owned PID taskkill /T /F',...value});};
  for(const stream of [cleanup.stdout,cleanup.stderr])stream.on('data',chunk=>{const take=Math.max(0,Math.min(chunk.length,16*1024-bytes));if(take){chunks.push(Buffer.from(chunk.subarray(0,take)));bytes+=take;}});
  cleanup.on('error',error=>finish({confirmed:false,error:error.message}));cleanup.on('close',(code,signal)=>finish({confirmed:code===0,exitCode:code,signal,diagnostic:Buffer.concat(chunks).toString('utf8')}));
  const timer=setTimeout(()=>{cleanup.kill('SIGKILL');cleanup.stdout.destroy();cleanup.stderr.destroy();finish({confirmed:false,error:'Owned tree-cleanup command timed out'});},cleanupMs);
 });
}
export async function runSketchChild({args,cwd,env=process.env,timeoutMs=DEFAULTS.timeoutMs,stdoutBytes=DEFAULTS.stdoutBytes,stderrBytes=DEFAULTS.stderrBytes,cleanupMs=DEFAULTS.cleanupMs}){
 // Capture configuration before the first await so callers cannot redirect it.
 if(!Array.isArray(args)||args.length>128||args.some(value=>typeof value!=='string'||value.includes('\0')||value.length>4096))throw new Error('Invalid collector child arguments');const capturedArgs=[...args];if(capturedArgs.join('').length>32768)throw new Error('Collector child arguments exceed32768 characters');
 if(typeof cwd!=='string'||!path.isAbsolute(cwd)||cwd.includes('\0'))throw new Error('Invalid collector child directory');const capturedCwd=cwd,capturedEnv={...env};delete capturedEnv.NODE_TEST_CONTEXT;
 timeoutMs=integer(timeoutMs,1,120000,'deadline');stdoutBytes=integer(stdoutBytes,0,8*1024*1024,'stdout limit');stderrBytes=integer(stderrBytes,0,8*1024*1024,'stderr limit');cleanupMs=integer(cleanupMs,100,10000,'cleanup deadline');
 const limits={timeoutMs,stdoutBytes,stderrBytes,cleanupMs},child=spawn(process.execPath,capturedArgs,{cwd:capturedCwd,env:capturedEnv,shell:false,windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']}),stdout=[],stderr=[];let capturedOut=0,capturedErr=0,receivedOut=0,receivedErr=0,failure=null,cleanup=null,stopPromise=null,closed=false,exitCode=null,signal=null;
 let finishClosed;const closePromise=new Promise(resolve=>finishClosed=resolve);
 let closeGuard;
 function stop(code,message){if(failure)return;failure={code,message};clearTimeout(timer);child.stdout?.pause();child.stderr?.pause();stopPromise=terminateTree(child,cleanupMs).then(result=>{cleanup=result;if(!result.confirmed&&child.exitCode===null&&child.signalCode===null){try{cleanup.ownedRootFallbackSignalSent=child.kill('SIGKILL');}catch(error){cleanup.fallbackError=error.message;}cleanup.descendantGuarantee=false;}child.stdout?.destroy();child.stderr?.destroy();});closeGuard=setTimeout(()=>{if(closed)return;cleanup??={attempted:true,confirmed:false};cleanup.closeEventDeadlineExceeded=true;cleanup.descendantGuarantee=false;try{child.kill('SIGKILL');}catch(error){cleanup.fallbackError=error.message;}child.stdout?.destroy();child.stderr?.destroy();child.unref();finishClosed();},cleanupMs*2+1000);}
 function append(kind,bytes){const out=kind==='stdout',count=out?capturedOut:capturedErr,limit=out?stdoutBytes:stderrBytes,take=Math.max(0,Math.min(bytes.length,limit-count));if(out)receivedOut+=bytes.length;else receivedErr+=bytes.length;if(take){(out?stdout:stderr).push(Buffer.from(bytes.subarray(0,take)));if(out)capturedOut+=take;else capturedErr+=take;}if(bytes.length>take)stop(out?'SKETCH_CHILD_STDOUT_LIMIT':'SKETCH_CHILD_STDERR_LIMIT',kind+' exceeded '+limit+' bytes');}
 child.stdout.on('data',bytes=>append('stdout',bytes));child.stderr.on('data',bytes=>append('stderr',bytes));
 child.on('error',error=>stop('SKETCH_CHILD_SPAWN_ERROR',String(error.message).slice(0,1000)));child.on('close',(code,endedSignal)=>{closed=true;exitCode=code;signal=endedSignal;clearTimeout(timer);finishClosed();});
 const timer=setTimeout(()=>stop('SKETCH_CHILD_TIMEOUT','Child exceeded '+timeoutMs+' milliseconds'),timeoutMs);
 await closePromise;clearTimeout(closeGuard);
 if(stopPromise)await stopPromise;
 if(!failure&&exitCode!==0)failure={code:'SKETCH_CHILD_EXIT',message:'Child exited with code '+exitCode+(signal?' signal '+signal:'')};
 return{exitCode,signal,closed,failure,cleanup,limits,stdout:Buffer.concat(stdout),stderr:Buffer.concat(stderr),output:{stdoutReceived:receivedOut,stderrReceived:receivedErr,stdoutCaptured:capturedOut,stderrCaptured:capturedErr,stdoutTruncated:receivedOut>capturedOut,stderrTruncated:receivedErr>capturedErr},pid:child.pid??null};
}

async function fingerprintSources(sources){
 const rows=[];let total=0;
 for(const item of sources){const hash=createHash('sha256');let bytes=0;for await(const chunk of createReadStream(item.path)){bytes+=chunk.length;total+=chunk.length;if(bytes>8*1024*1024||total>64*1024*1024)throw new Error('Collector source bytes exceed bounded fingerprint allowance');hash.update(chunk);}rows.push({name:item.name,bytes,sha256:hash.digest('hex')});}
 return rows;
}
// The collector owns observationDirectory (created with mkdtemp). Diagnostic
// filenames are exclusive writes so existing success evidence is never replaced.
export async function collectSketchChild(options){
 const captured={...options,args:Array.isArray(options.args)?[...options.args]:options.args,env:{...(options.env??process.env)}};
 const {observationDirectory}=captured,sources=Array.isArray(options.sources)?options.sources.map(item=>({name:item.name,path:item.path})):null;
 if(typeof observationDirectory!=='string'||!path.isAbsolute(observationDirectory)||observationDirectory.includes('\0'))throw new Error('Invalid collector observation directory');
 if(!sources||sources.length<1||sources.length>128||sources.some(item=>typeof item.name!=='string'||item.name.length>4096||typeof item.path!=='string'||!path.isAbsolute(item.path)||item.path.length>4096||item.path.includes('\0'))||new Set(sources.map(item=>item.name)).size!==sources.length)throw new Error('Invalid collector source identities');
 const before=await fingerprintSources(sources),startedAtUtc=new Date().toISOString(),run=await runSketchChild(captured);let after=null,sourceError=null;
 try{after=await fingerprintSources(sources);}catch(error){sourceError=String(error.message).slice(0,1000);}
 const sourceBytesStable=after!==null&&JSON.stringify(before)===JSON.stringify(after),{stdout,stderr,...execution}=run;
 const diagnostic={schema:'rea-sketch-collector-child-diagnostic/v1',startedAtUtc,completedAtUtc:new Date().toISOString(),runtime:process.version,platform:process.platform,execution,sourceBytesStable,sourceError,sourceBefore:before,sourceAfter:after};
 await fs.writeFile(path.join(observationDirectory,'stdout.txt'),stdout,{flag:'wx'});await fs.writeFile(path.join(observationDirectory,'stderr.txt'),stderr,{flag:'wx'});await fs.writeFile(path.join(observationDirectory,'child-run.json'),JSON.stringify(diagnostic,null,2)+'\n',{flag:'wx'});
 return{...run,diagnostic};
}
export function requireSketchCollectionSuccess(result){
 if(!result.diagnostic?.sourceBytesStable)throw new Error('Sketch collection source changed; bounded diagnostics retained');
 if(result.failure)throw new Error(result.failure.code+': '+result.failure.message+'; bounded diagnostics retained');
 if(result.exitCode!==0||!result.closed)throw new Error('Sketch collection did not close successfully; bounded diagnostics retained');
 return result;
}
