// Hosted metadata boundary only. Original source, payloads and execution guards
// stay unchanged. No application/original module or archive codec is imported.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const id=b=>({bytes:b.length,sha256:hash(b)});
const ORIGINAL={version:'26.04',sourceCommit:'9128b80e3a471108678e2b3ec3c985861c8d7b0f',exe:{name:'7z.exe',bytes:577536,sha256:'95fff19b73eff77c87c0d7bd32822e43fb90dd2932459f962eb532d8dfb6ba53'},dll:{name:'7z.dll',bytes:1907712,sha256:'899cd73d7fc60e1c1c35c7de0f5bed3dc69bfe2cecbd48014d868a347970a0b1'}};
function plain(file,isFile=false){const full=path.resolve(file);let at=path.parse(full).root;for(const part of full.slice(at.length).split(path.sep).filter(Boolean)){at=path.join(at,part);const s=fs.lstatSync(at);assert(!s.isSymbolicLink());assert(at===full&&isFile?s.isFile()&&s.nlink===1:s.isDirectory());}assert.equal(fs.realpathSync(full).toLowerCase(),full.toLowerCase());return full;}
function read(file,maximum){plain(file,true);const before=fs.lstatSync(file,{bigint:true});assert(before.size<=BigInt(maximum));const fd=fs.openSync(file,'r');try{const opened=fs.fstatSync(fd,{bigint:true});for(const k of['dev','ino','size','mtimeNs','ctimeNs'])assert.equal(opened[k],before[k]);const b=Buffer.alloc(Number(before.size)+1);let offset=0;while(offset<b.length){const n=fs.readSync(fd,b,offset,b.length-offset,null);if(n===0)break;offset+=n;}const after=fs.fstatSync(fd,{bigint:true}),at=fs.lstatSync(file,{bigint:true});for(const k of['dev','ino','size','mtimeNs','ctimeNs']){assert.equal(after[k],before[k]);assert.equal(at[k],before[k]);}assert.equal(offset,Number(before.size));assert(at.isFile()&&!at.isSymbolicLink()&&at.nlink===1n);return b.subarray(0,offset);}finally{fs.closeSync(fd);}}
function fresh(file,bytes){plain(path.dirname(file));assert(!fs.existsSync(file));fs.writeFileSync(file,bytes,{flag:'wx'});assert.deepEqual(read(file,Math.max(bytes.length,1)),bytes);}
function json(file,value){const b=Buffer.from(JSON.stringify(value,null,2)+'\n');assert(b.length<=512*1024);fresh(file,b);return id(b);}
function subject(){for(const[k,v]of Object.entries({CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab',GITHUB_JOB:'full-current-installed'}))assert.equal(process.env[k],v);assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.version,'v24.16.0');assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA));for(const k of['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT'])assert(/^[1-9][0-9]*$/.test(process.env[k]));return{sourceCommit:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,job:process.env.GITHUB_JOB,role:'full'};}
export function archiveOriginalEvidenceRoot(temporary){const s=subject(),temp=fs.realpathSync(process.env.RUNNER_TEMP);assert.equal(temporary,temp);plain(temp);const root=path.join(temp,'rea-notes-order-archive-original-'+s.runId+'-'+s.attempt);assert.equal(path.dirname(root),temp);return root;}
export function createArchiveOriginalEvidence({temporary}){const root=archiveOriginalEvidenceRoot(temporary);assert(!fs.existsSync(root));fs.mkdirSync(root);plain(root);return root;}
function rawRoleRoot(evidence,temporary,s){assert.equal(path.dirname(evidence),temporary);assert.equal(path.basename(evidence),'rea-notes-order-full-'+s.runId+'-'+s.attempt);plain(evidence);}
export function copyArchiveAcquisitionMetadata({temporary,evidence}){
  const s=subject(),root=archiveOriginalEvidenceRoot(temporary);rawRoleRoot(evidence,temporary,s);plain(root);
  const acquisition=read(path.join(root,'archive-original-acquisition.json'),2*1024*1024),record=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(acquisition));
  assert.equal(record.schema,'rea-archive-zip-aes-original-acquisition/v1');assert.equal(record.status,'authenticated');assert.equal(record.failure,null);assert.equal(record.original.version,ORIGINAL.version);assert.equal(record.original.sourceCommit,ORIGINAL.sourceCommit);assert.equal(record.originalZIPExecutions,0);
  for(const[k,v]of Object.entries({GITHUB_SHA:s.sourceCommit,GITHUB_RUN_ID:s.runId,GITHUB_RUN_ATTEMPT:s.attempt,GITHUB_JOB:s.job,GITHUB_REPOSITORY:'Ginderlax/rea-research-lab',REA_ARCHIVE_ZIP_ROLE:'zip-original'}))assert.equal(record.execution[k],v);
  assert.equal(record.bootstrapCommands.length,3);assert.equal(record.wholeCLI.length,2);assert.equal(record.legacyExtra.length,1);
  const copied=[];
  for(const[n,row]of record.bootstrapCommands.entries()){assert.equal(row.sequence,n+1);assert.equal(row.status,'passed');assert.equal(row.exitCode,0);assert.equal(row.signal,null);assert.equal(row.closeObserved,true);assert.equal(row.failure,null);const name='bootstrap-'+(n+1)+'.stderr.txt';assert.equal(row.stderr.path,name);assert.equal(row.stderr.retained,true);const b=read(path.join(root,name),256*1024);assert.deepEqual(id(b),{bytes:row.stderr.bytes,sha256:row.stderr.sha256});assert.equal(row.stderr.observedBytes,b.length);fresh(path.join(evidence,name),b);copied.push({file:name,...id(b)});}
  fresh(path.join(evidence,'archive-original-acquisition.json'),acquisition);copied.unshift({file:'archive-original-acquisition.json',...id(acquisition)});
  return{schema:'rea-notes-order-private-archive-acquisition-copy/v1',...s,status:'copied-exact-four-acquisition-metadata-files',files:copied,privateOriginalEvidenceSibling:true,commandTranscriptBodiesCopied:0,CASBodiesCopied:0,snapshotBodiesCopied:0,vendorPayloadBodiesCopied:0,originalAcquisitionBodyModified:false,productAcceptance:false};
}
function finite(v,max=1000000){assert(Number.isSafeInteger(v)&&v>=0&&v<=max);return v;}
function booleanOrNull(v){assert(v===undefined||v===null||typeof v==='boolean');return v??null;}
function exit(v){assert(v===undefined||v===null||(Number.isSafeInteger(v)&&v>=-4294967296&&v<=4294967295));return v??null;}
function signal(v){assert(v===undefined||v===null||['SIGINT','SIGTERM','SIGKILL','SIGBREAK'].includes(v));return v??null;}
function stream(v){if(v===undefined||v===null)return null;for(const k of['bytes','observedBytes','redactions'])finite(v[k],4*1024*1024);assert(/^[0-9a-f]{64}$/.test(v.sha256));assert.equal(v.limitBytes,2*1024*1024);return{bytes:v.bytes,observedBytes:v.observedBytes,sha256:v.sha256,redactions:v.redactions,limitBytes:v.limitBytes};}
function authenticatedPair(value){if(!value||typeof value!=='object')return false;return[ORIGINAL.exe,ORIGINAL.dll].every(pin=>value[pin.name]?.bytes===pin.bytes&&value[pin.name]?.sha256===pin.sha256);}
export function projectArchiveOriginalMetadata({temporary,evidence,childProcess}){
  const s=subject(),root=archiveOriginalEvidenceRoot(temporary);rawRoleRoot(evidence,temporary,s);for(const k of Object.keys(s))assert.equal(childProcess[k],s[k]);assert.equal(childProcess.name,'current-full');
  const destination=path.join(evidence,'current-archive-original');assert(!fs.existsSync(destination));fs.mkdirSync(destination);plain(destination);
  const index={schema:'rea-notes-order-current-archive-original-projection-index/v1',...s,status:'partial-or-failed-original-metadata',childCloseObserved:childProcess.closeObserved===true,files:[],detailsExcluded:true,rawArgumentsExported:false,rawErrorMessagesExported:false,commandTranscriptBodiesExported:0,CASBodiesExported:0,snapshotBodiesExported:0,vendorPayloadBodiesExported:0,fullArchiveAcceptance:false,productAcceptance:false};
  for(const kind of['flat','zip']){
    const sourceRelative=kind+'-original/original-processes.json',projectionFile=kind+'-process-summary.json';
    let row={schema:'rea-notes-order-archive-original-process-metadata-projection/v1',...s,kind,captureStatus:childProcess.closeObserved===true?'SOURCE_NOT_PRESENT':'CHILD_NOT_CLOSED',source:null,sourceSchema:null,original:ORIGINAL,originalStatus:null,commandCount:0,commands:[],snapshotCount:0,checkCount:0,cleanup:{attempted:null,removed:null},failurePresent:null,detailsExcluded:true,caseIDsExported:false,rawArgumentsExported:false,rawErrorMessagesExported:false,commandTranscriptBodiesExported:0,CASBodiesExported:0,snapshotBodiesExported:0,fullArchiveAcceptance:false,productAcceptance:false};
    if(childProcess.closeObserved===true){
      try{
        plain(root);const file=path.join(root,...sourceRelative.split('/'));
        if(fs.existsSync(file)){
          const b=read(file,8*1024*1024);row.source=id(b);const original=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));
          assert.equal(original.schema,kind==='flat'?'rea-archive-flat-extract-original-processes/v1':'rea-archive-zip-aes-original-processes/v1');assert(['running','passed','failed'].includes(original.status));assert.deepEqual(original.original,ORIGINAL);
          for(const[k,v]of Object.entries({GITHUB_SHA:s.sourceCommit,GITHUB_RUN_ID:s.runId,GITHUB_RUN_ATTEMPT:s.attempt,GITHUB_JOB:s.job,REA_ARCHIVE_ZIP_ROLE:'zip-original'}))assert.equal(original.execution[k],v);
          assert(Array.isArray(original.commands)&&original.commands.length<=128);const commands=original.commands.map((command,n)=>{assert.equal(command.sequence,n+1);assert(['running','passed','failed'].includes(command.status));assert([0,1,2].includes(command.expectedExit));return{sequence:n+1,status:command.status,expectedExit:command.expectedExit,exitCode:exit(command.exitCode),signal:signal(command.signal),closeObserved:booleanOrNull(command.closeObserved),timedOut:booleanOrNull(command.timedOut),overLimit:booleanOrNull(command.overLimit),spawnFailurePresent:command.spawnError===undefined||command.spawnError===null?false:true,failurePresent:command.failure===undefined||command.failure===null?false:true,executablesAuthenticatedBefore:authenticatedPair(command.before),executablesAuthenticatedAfter:authenticatedPair(command.after),stdout:stream(command.stdout),stderr:stream(command.stderr)};});
          row={...row,captureStatus:'PROJECTED_SOURCE_METADATA',source:id(b),sourceSchema:original.schema,originalStatus:original.status,commandCount:commands.length,commands,snapshotCount:finite(original.snapshots.length,256),checkCount:finite(original.checks.length,256),cleanup:{attempted:booleanOrNull(original.cleanup.attempted),removed:booleanOrNull(original.cleanup.removed)},failurePresent:original.failure!==undefined&&original.failure!==null};
        }
      }catch{row={...row,captureStatus:'SOURCE_METADATA_REFUSED'};}
    }
    const projection=json(path.join(destination,projectionFile),row);index.files.push({sourceFile:sourceRelative,source:row.source,projectionFile:'current-archive-original/'+projectionFile,projection,captureStatus:row.captureStatus,originalStatus:row.originalStatus,byteExactSourceCopy:false});
  }
  if(index.files.every(row=>row.captureStatus==='PROJECTED_SOURCE_METADATA'))index.status='projected-exact-two-private-original-json-sources';
  const result=json(path.join(destination,'index.json'),index);return{path:'current-archive-original/index.json',...result,status:index.status};
}
