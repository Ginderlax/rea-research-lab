import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// BEGIN EXACT NATIVE ATTEMPT LEDGER COMPONENT
// Bounded native-attempt ledger. Builtin Buffer/performance only; no I/O or process launch.
// This exact region is embedded in harness.mjs and exercised by separately admitted cloud controls.
export const NATIVE_ATTEMPT_OPT_IN_NAME='REA_VAULT_NATIVE_ATTEMPTS';
export const NATIVE_ATTEMPT_OPT_IN_VALUE='focused-http-native-read-v1';
export const NATIVE_ATTEMPT_RECORD_LIMIT=2;
export const NATIVE_ATTEMPT_PREFIX_LIMIT=65536;
export const NATIVE_HISTORY_LIMIT=2097152;

export function nativeAttemptEnvironment(environment){const env={...environment};delete env.NODE_TEST_CONTEXT;delete env.REA_VAULT_NATIVE_ATTEMPTS;return env;}

export function selectNativeAttemptWitness(ledger,environment,config){
 try{
  if(environment.REA_VAULT_NATIVE_ATTEMPTS!==NATIVE_ATTEMPT_OPT_IN_VALUE)return null;
  if(!config||Object.getPrototypeOf(config)!==Object.prototype)return null;
  if(Object.keys(config).sort().join(',')!=='database,mode')return null;
  const mode=Object.getOwnPropertyDescriptor(config,'mode'),database=Object.getOwnPropertyDescriptor(config,'database');
  if(!mode||!database||!Object.hasOwn(mode,'value')||!Object.hasOwn(database,'value')||mode.value!=='read'||typeof database.value!=='string')return null;
  return ledger.start();
 }catch{try{ledger.noteFailure('OBSERVER');}catch{}return null;}
}
export function observeNativeAttempt(ledger,witness,method,...args){if(!witness)return;try{witness[method](...args);}catch{try{ledger.noteFailure('OBSERVER');}catch{}}}

export function createNativeAttemptLedger({enabled=true,now=()=>performance.now(),copyPrefix=(target,source,offset)=>source.copy(target,offset)}={}){
 const records=[],failures=new Set();let requested=0,lastClock=null,clockInvalid=false;
 const allowedFailures=new Set(['ATTEMPT_LIMIT','OBSERVER','CLOCK','CAPTURE','SCALAR','EVENT_ORDER','SNAPSHOT']);
 const note=(code,record=null)=>{const known=allowedFailures.has(code)?code:'OBSERVER';failures.add(known);if(record)record.failures.add(known);};
 function add(value,delta,record){if(value===null)return null;const total=value+delta;if(!Number.isSafeInteger(total)||total<0||total>2147483647){note('SCALAR',record);return null;}return total;}
 function clock(record){
  if(clockInvalid)return null;
  try{const value=now();if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>Number.MAX_SAFE_INTEGER||(lastClock!==null&&value<lastClock))throw new Error('Clock');lastClock=value;if(record){const elapsed=value-record.started;if(!Number.isFinite(elapsed)||elapsed<0||elapsed>2147483647)throw new Error('Elapsed');return Math.round(elapsed);}return value;}
  catch{clockInvalid=true;note('CLOCK',record);return null;}
 }
 function stamp(record,key){const value=clock(record);record.times[key]=value;if(value!==null)record.elapsedMs=value;}
 function scalar(value,record,{positive=false}={}){if(Number.isSafeInteger(value)&&value>=(positive?1:-2147483648)&&value<=2147483647)return value;note('SCALAR',record);return null;}
 function eventArguments(code,eventSignal,record){const codeKnown=code===null||(Number.isSafeInteger(code)&&code>=-2147483648&&code<=2147483647),signalKnown=eventSignal===null||typeof eventSignal==='string';if(!codeKnown||!signalKnown)note('SCALAR',record);return {code:codeKnown?code:null,signal:!signalKnown?'unknown':eventSignal===null?null:['SIGTERM','SIGKILL','SIGINT'].includes(eventSignal)?eventSignal:'other',known:codeKnown&&signalKnown};}
 function protect(record,operation){try{operation();}catch{note('OBSERVER',record);}}
 function once(record,key,time){if(record[key]){note('EVENT_ORDER',record);return false;}record[key]=true;stamp(record,time);return true;}
 function start(){
  if(enabled!==true)return null;
  requested=add(requested,1,null);
  if(records.length>=NATIVE_ATTEMPT_RECORD_LIMIT){note('ATTEMPT_LIMIT');return null;}
  try{
   const started=clock(null),record={ordinal:records.length+1,callsite:'http-history-native-read',started,elapsedMs:started===null?null:0,times:{attemptStart:started===null?null:0,spawnCall:null,spawnEvent:null,spawnThrow:null,timer:null,error:null,exit:null,close:null,stop:null,killCall:null,killReturn:null},spawnInvocationAttempted:false,spawnEventObserved:false,spawnThrowObserved:false,pid:null,timerFired:false,errorEventObserved:false,errorCategory:null,exitObserved:false,exitCode:null,exitSignal:null,exitArgumentsKnown:false,closeObserved:false,closeCode:null,closeSignal:null,closeArgumentsKnown:false,stopReason:null,stopCalls:0,killCalled:false,killCalls:0,killReturned:false,killReturns:0,firstKillReturnValue:null,killThrowObserved:false,killThrows:0,failures:new Set(),streams:{stdout:{seen:0,retained:0,prefix:Buffer.alloc(NATIVE_ATTEMPT_PREFIX_LIMIT)},stderr:{seen:0,retained:0,prefix:Buffer.alloc(NATIVE_ATTEMPT_PREFIX_LIMIT)}}};
   if(started===null)record.failures.add('CLOCK');records.push(record);
   const witness={
    invocation(){protect(record,()=>once(record,'spawnInvocationAttempted','spawnCall'));},
    spawned(pid){protect(record,()=>{if(once(record,'spawnEventObserved','spawnEvent'))record.pid=scalar(pid,record,{positive:true});});},
    spawnThrow(){protect(record,()=>once(record,'spawnThrowObserved','spawnThrow'));},
    timer(){protect(record,()=>once(record,'timerFired','timer'));},
    error(error){protect(record,()=>{if(!once(record,'errorEventObserved','error'))return;const code=error&&error.code;record.errorCategory=code==='ENOENT'?'ENOENT':code==='EACCES'?'EACCES':'other';});},
    exit(code,eventSignal){protect(record,()=>{if(!once(record,'exitObserved','exit'))return;const value=eventArguments(code,eventSignal,record);record.exitCode=value.code;record.exitSignal=value.signal;record.exitArgumentsKnown=value.known;});},
    close(code,eventSignal){protect(record,()=>{if(!once(record,'closeObserved','close'))return;const value=eventArguments(code,eventSignal,record);record.closeCode=value.code;record.closeSignal=value.signal;record.closeArgumentsKnown=value.known;});},
    stop(reason){protect(record,()=>{record.stopCalls=add(record.stopCalls,1,record);if(record.stopReason!==null)return;record.stopReason=reason==='Synthetic child deadline exceeded.'?'DEADLINE':reason==='Synthetic child stdout exceeds capture bound.'?'STDOUT_CAP':reason==='Synthetic child stderr exceeds capture bound.'?'STDERR_CAP':'other';stamp(record,'stop');});},
    killCall(){protect(record,()=>{record.killCalls=add(record.killCalls,1,record);if(record.killCalled)return;record.killCalled=true;stamp(record,'killCall');});},
    killReturn(value){protect(record,()=>{record.killReturns=add(record.killReturns,1,record);if(typeof value!=='boolean')note('SCALAR',record);if(record.killReturned)return;record.killReturned=true;record.firstKillReturnValue=typeof value==='boolean'?value:null;stamp(record,'killReturn');});},
    killThrow(){protect(record,()=>{record.killThrows=add(record.killThrows,1,record);record.killThrowObserved=true;});},
    data(name,chunk){
     try{
      if(name!=='stdout'&&name!=='stderr'){note('CAPTURE',record);return;}
      const stream=record.streams[name];
      if(!Buffer.isBuffer(chunk)){stream.seen=null;note('CAPTURE',record);return;}
      stream.seen=add(stream.seen,chunk.length,record);
      const amount=Math.min(chunk.length,NATIVE_ATTEMPT_PREFIX_LIMIT-stream.retained);
      if(amount){const copied=copyPrefix(stream.prefix,chunk.subarray(0,amount),stream.retained);if(copied!==amount){note('CAPTURE',record);return;}stream.retained+=amount;}
     }catch{note('CAPTURE',record);}
    }
   };
   return Object.freeze(witness);
  }catch{note('OBSERVER');return null;}
 }
 function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
 function snapshot(){
  try{
   const rows=records.map(record=>{
    const streams={};for(const name of ['stdout','stderr']){const stream=record.streams[name];streams[name]={seenBytes:stream.seen,retainedPrefixBytes:stream.retained,droppedFromPrefixBytes:stream.seen===null?null:Math.max(0,stream.seen-stream.retained),prefixBase64:stream.prefix.subarray(0,stream.retained).toString('base64'),allSeenBytesRetained:stream.seen!==null&&stream.seen===stream.retained};}
    const {started,failures:recordFailures,streams:privateStreams,...facts}=record;return {...facts,times:{...record.times},diagnosticFailures:[...recordFailures].sort(),streams};
   });
   return freeze({schema:'rea-vault-native-attempt-ledger/v1',enabled:enabled===true,attemptsRequested:requested,recordLimit:NATIVE_ATTEMPT_RECORD_LIMIT,prefixBytesPerStream:NATIVE_ATTEMPT_PREFIX_LIMIT,recordedAttempts:rows.length,diagnosticValid:failures.size===0,diagnosticFailures:[...failures].sort(),records:rows});
  }catch{note('SNAPSHOT');return freeze({schema:'rea-vault-native-attempt-ledger/v1',enabled:enabled===true,attemptsRequested:requested,recordLimit:NATIVE_ATTEMPT_RECORD_LIMIT,prefixBytesPerStream:NATIVE_ATTEMPT_PREFIX_LIMIT,recordedAttempts:0,diagnosticValid:false,diagnosticFailures:[...failures].sort(),records:[],snapshotFailed:true});}
 }
 function publicSnapshot(){const value=snapshot();return freeze({...value,records:value.records.map(({pid,streams,...record})=>({...record,pidObserved:pid!==null,streams:Object.fromEntries(Object.entries(streams).map(([name,{prefixBase64,...counts}])=>[name,counts]))}))});}
 return Object.freeze({start,snapshot,publicSnapshot,noteFailure:code=>note(code)});
}

// Count the COMPLETE existing observations/config/results/HTTP text plus new ledger, after JSON escaping.
// No field/result/error is truncated to fit; over-limit afterhook capture fails closed before writing.
export function serializeNativeAttemptHistoryEnvelope(httpObservations,observations,ledger){
 const value={httpObservations,originalProcessExecutions:observations.length,observations,nativeAttempts:ledger};
 const text=JSON.stringify(value,null,2),bytes=Buffer.byteLength(text,'utf8');
 if(bytes>NATIVE_HISTORY_LIMIT)throw new Error('Native attempt diagnostic history envelope exceeds bound.');
 return text;
}

// Exact old afterhook envelope and behavior remain for absent or wrong opt-in values.
export function serializeNativeAttemptHistoryForEnvironment(httpObservations,observations,ledger,environment){
 if(environment.REA_VAULT_NATIVE_ATTEMPTS!==NATIVE_ATTEMPT_OPT_IN_VALUE)return JSON.stringify({httpObservations,originalProcessExecutions:observations.length,observations},null,2);
 return serializeNativeAttemptHistoryEnvelope(httpObservations,observations,ledger);
}
// END EXACT NATIVE ATTEMPT LEDGER COMPONENT
const nativeAttemptLedger=createNativeAttemptLedger({enabled:process.env.REA_VAULT_NATIVE_ATTEMPTS===NATIVE_ATTEMPT_OPT_IN_VALUE});
function nativeAttemptWitness(config){return selectNativeAttemptWitness(nativeAttemptLedger,process.env,config);}
function nativeAttemptObserve(witness,method,...args){observeNativeAttempt(nativeAttemptLedger,witness,method,...args);}
export function nativeAttemptHistoryJSON(httpObservations,completedObservations){return serializeNativeAttemptHistoryForEnvironment(httpObservations,completedObservations,nativeAttemptLedger.snapshot(),process.env);}

export const here=path.dirname(fileURLToPath(import.meta.url)),pass='Synthetic-history-master';
export const fixtureRoot=path.resolve(here,'../../../..','.local/vault-history-fixtures',String(process.pid));
export const observationsDirectory=path.join(fixtureRoot,'observations');
export const oracle=process.env.REA_KEEPASS_EXE??path.resolve(here,'../../../..','projects/07-keepass/artifacts/portable/KeePass.exe');
export const oracleSha='04d29636c393f0c1fc99ff739295494be3adefded93271e44591e8e300225a5a';
export const observations=[];
export async function temp(t,prefix='rea-keepass-history-'){const directory=await fs.mkdtemp(path.join(os.tmpdir(),prefix));t.after(async()=>{if(path.dirname(directory)!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith(prefix))throw new Error('Unsafe synthetic cleanup target.');await fs.rm(directory,{recursive:true,force:true});});return directory;}
export async function original(directory,config){
  const exe=await fs.readFile(oracle);if(createHash('sha256').update(exe).digest('hex')!==oracleSha)throw new Error('Release SHA mismatch before spawning oracle.');
  const cfg=path.join(directory,'oracle-'+observations.length+'-'+crypto.randomUUID()+'.json');await fs.writeFile(cfg,JSON.stringify({oracle,password:pass,...config}));
  const env=nativeAttemptEnvironment(process.env),nativeWitness=nativeAttemptWitness(config);
  const result=await child('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(here,'history-oracle.ps1'),'-Config',cfg],{env},nativeWitness);
  let value;try{value=JSON.parse(result.stdout.trim())}catch(e){observations.push({config,result,error:e.message});throw new Error('Invalid original observation: '+result.stdout+' '+result.stderr)}
  observations.push({config,result,value});return value;
}
export function child(command,args,{deadline=30000,cap=1024*1024,...options}={},nativeWitness=null){return new Promise((resolve,reject)=>{
  nativeAttemptObserve(nativeWitness,'invocation');let p;try{p=spawn(command,args,{windowsHide:true,...options});}catch(error){nativeAttemptObserve(nativeWitness,'spawnThrow');throw error;}const chunks={stdout:[],stderr:[]},sizes={stdout:0,stderr:0};let problem;
  const stop=reason=>{problem??=reason;nativeAttemptObserve(nativeWitness,'stop',reason);nativeAttemptObserve(nativeWitness,'killCall');try{const returned=p.kill();nativeAttemptObserve(nativeWitness,'killReturn',returned);}catch(error){nativeAttemptObserve(nativeWitness,'killThrow');throw error;}};const timer=setTimeout(()=>{nativeAttemptObserve(nativeWitness,'timer');stop('Synthetic child deadline exceeded.');},deadline);
  for(const name of ['stdout','stderr'])p[name].on('data',c=>{sizes[name]+=c.length;if(sizes[name]>cap)stop('Synthetic child '+name+' exceeds capture bound.');else chunks[name].push(c);nativeAttemptObserve(nativeWitness,'data',name,c)});
  p.on('error',e=>{problem??=e.message;nativeAttemptObserve(nativeWitness,'error',e)});p.on('close',(code,signal)=>{clearTimeout(timer);const result={code,signal,stdout:Buffer.concat(chunks.stdout).toString('utf8'),stderr:Buffer.concat(chunks.stderr).toString('utf8'),sizes};nativeAttemptObserve(nativeWitness,'close',code,signal);if(problem||code!==0){const error=new Error(problem??result.stderr??'Synthetic child failed.');error.observation=result;reject(error)}else resolve(result)});
  if(nativeWitness)try{p.once('spawn',()=>nativeAttemptObserve(nativeWitness,'spawned',p.pid));p.once('exit',(code,signal)=>nativeAttemptObserve(nativeWitness,'exit',code,signal));}catch{nativeAttemptLedger.noteFailure('OBSERVER');}
});}
