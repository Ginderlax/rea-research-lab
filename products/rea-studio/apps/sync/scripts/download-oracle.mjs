// Original comparison support only. Application code never imports this file.
// Source-authored and unexecuted: only an admitted hosted job may run it.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
const sourceCommit='be8d6044eacb843b74d335db0c5fbe09222031fe';
const zipPin={bytes:31634900,sha256:'8a9db2bad1dc79a65b3348fd857069598e2aab7cf4d118b77b1df23055aff818'};
const exePin={bytes:85500928,sha256:'41eab3e118d264920b62c3327966c5ece0dc4dd715ee617d9e30450d8ead95a4'};
export const digest=b=>createHash('sha256').update(b).digest('hex');
const within=(root,target)=>{const rel=path.relative(root,target);return rel!==''&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel);};
export function hosted(){assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.version,'v24.16.0');assert.equal(process.env.CI,'true');assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');assert.equal(process.env.GITHUB_REPOSITORY,'Ginderlax/rea-research-lab');}
async function noLinks(file){for(let at=path.resolve(file);;at=path.dirname(at)){assert(!(await fs.lstat(at)).isSymbolicLink(),'Link ancestor refused');if(path.dirname(at)===at)break;}}
async function authenticate(file,pin,maximum=128*1024*1024){await noLinks(file);const st=await fs.lstat(file);assert(st.isFile()&&st.nlink===1&&st.size===pin.bytes&&st.size<=maximum);const h=createHash('sha256');let bytes=0;for await(const b of createReadStream(file,{highWaterMark:1024*1024})){bytes+=b.length;assert(bytes<=maximum);h.update(b);}assert.equal(bytes,pin.bytes);assert.equal(h.digest('hex'),pin.sha256);return{...pin};}
async function writeNew(file,bytes){await noLinks(path.dirname(file));await fs.writeFile(file,bytes,{flag:'wx'});assert.deepEqual(await fs.readFile(file),bytes);}
export function comparisonFlags(options){const map={checksum:'checksum',sizeOnly:'size-only',ignoreSize:'ignore-size',ignoreTimes:'ignore-times',ignoreExisting:'ignore-existing',update:'update',noUpdateModtime:'no-update-modtime'};assert(Object.keys(options).every(k=>k==='modifyWindowNs'?(typeof options[k]==='string'&&/^(?:0|[1-9][0-9]{0,18})$/.test(options[k])):(Object.hasOwn(map,k)&&typeof options[k]==='boolean')));const flags=Object.keys(map).filter(k=>options[k]).map(k=>'--'+map[k]);if(Object.hasOwn(options,'modifyWindowNs'))flags.push('--modify-window',options.modifyWindowNs+'ns');return flags;}
export function originalJSONLogs(text){return text.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));}

export async function createRecordedOracle(root,{evidence,secrets=[]}={}){
  hosted();const temporary=await fs.realpath(process.env.RUNNER_TEMP);root=await fs.realpath(root);evidence=await fs.realpath(evidence);assert(within(temporary,root)&&within(temporary,evidence));await noLinks(root);await noLinks(evidence);
  const commands=path.join(evidence,'commands'),objects=path.join(evidence,'objects'),manifests=path.join(evidence,'file-manifests');for(const dir of[commands,objects,manifests])await fs.mkdir(dir);
  const repository=fileURLToPath(new URL('../../../../../',import.meta.url));
  const archive=path.join(repository,'projects/10-rclone/artifacts/rclone-v1.75.2-windows-amd64.zip'),original=path.join(repository,'projects/10-rclone/artifacts/unpacked/rclone-v1.75.2-windows-amd64/rclone.exe');
  await authenticate(archive,zipPin);await authenticate(original,exePin);
  const bin=path.join(root,'bin');await fs.mkdir(bin);const executable=path.join(bin,'rclone.exe');await fs.copyFile(original,executable,fs.constants.COPYFILE_EXCL);await authenticate(executable,exePin);
  const config=path.join(root,'synthetic-empty.conf');await writeNew(config,Buffer.alloc(0));
  const privateValues=new Set(secrets.filter(s=>typeof s==='string'&&s.length));let sequence=0,totalRaw=0,closed=false;
  const execution=Object.fromEntries(['GITHUB_SHA','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_JOB','RUNNER_ENVIRONMENT'].map(k=>[k,process.env[k]??null]));
  const record={schema:'rea-sync-download-original-processes/v1',status:'running',execution,sourceCommit,zip:zipPin,executable:exePin,privateCopyAuthenticated:true,commands:[],rawOutputByteLimit:64*1024*1024,commandLimit:512,stdoutOrStderrLimit:1024*1024,credentialsProvisioningOutputRedacted:true,transferOutputsOnlyCredentialRedacted:true,unsanitizedCredentialStreamsSaved:false};
  const save=async()=>{const target=path.join(evidence,'original-processes.json'),bytes=Buffer.from(JSON.stringify(record,null,2)+'\n');if(sequence===0){await writeNew(target,bytes);}else{const next=target+'.tmp';await writeNew(next,bytes);await fs.rename(next,target);}};
  function redact(text){let result=text;for(const secret of [...privateValues].sort((a,b)=>b.length-a.length)){result=result.split(secret).join('[REDACTED_SYNTHETIC_CREDENTIAL]');const escaped=JSON.stringify(secret).slice(1,-1);if(escaped!==secret)result=result.split(escaped).join('[REDACTED_SYNTHETIC_CREDENTIAL]');}for(const secret of privateValues)assert(!result.includes(secret));return result;}
  const environment=Object.fromEntries(Object.entries(process.env).filter(([key])=>!/^RCLONE_/i.test(key)&&!/^(?:HTTP_PROXY|HTTPS_PROXY|ALL_PROXY)$/i.test(key)));
  await save();
  async function run(args,{caseID,expectedExitCodes=[0],privateOutput=false}={}){
    assert(!closed);assert(typeof caseID==='string'&&/^[a-z0-9][a-z0-9-]{0,95}$/.test(caseID));assert(Array.isArray(args)&&args.length<=128&&args.every(a=>typeof a==='string'&&a.length<=4096&&!a.includes('\0')));assert(Array.isArray(expectedExitCodes)&&expectedExitCodes.length>0&&expectedExitCodes.length<=16&&expectedExitCodes.every(n=>Number.isInteger(n)&&n>=0&&n<=255));assert(++sequence<=record.commandLimit);
    const prefix=String(sequence).padStart(4,'0')+'-'+caseID,argv=['--config',config,'--ask-password=false','--stats=0','--use-json-log','--log-level','DEBUG','--retries','1','--low-level-retries','1','--contimeout','5s','--timeout','10s','--max-duration','30s','--checkers','1','--transfers','1',...args];
    const row={sequence,caseID,arguments:argv.map(redact),expectedExitCodes:[...expectedExitCodes],credentialProvisioningCommand:privateOutput,startedAtUtc:new Date().toISOString(),timeoutMs:45000,status:'running'};record.commands.push(row);await save();
    const outcome=await new Promise(resolve=>{
      const child=spawn(executable,argv,{cwd:root,env:environment,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});const chunks={stdout:[],stderr:[]},counts={stdout:0,stderr:0};let failure=null,stopping=false,settled=false,cleanup=null;
      const finish=(exitCode,signal,closeObserved=true)=>{if(settled)return;settled=true;clearTimeout(timer);clearTimeout(cleanup);resolve({exitCode,signal,closeObserved,failure,counts,stdout:Buffer.concat(chunks.stdout),stderr:Buffer.concat(chunks.stderr)});};
      const stop=reason=>{if(stopping)return;stopping=true;failure=reason;if(child.pid){const k=spawnSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,shell:false,stdio:'ignore',timeout:10000});if(k.status!==0)child.kill('SIGKILL');}cleanup=setTimeout(()=>{child.stdout.destroy();child.stderr.destroy();finish(null,null,false);},5000);};
      const timer=setTimeout(()=>stop('original command deadline exceeded'),45000);
      for(const kind of['stdout','stderr']){child[kind].on('data',b=>{if(settled)return;counts[kind]+=b.length;totalRaw+=b.length;const retained=Math.max(0,Math.min(b.length,record.stdoutOrStderrLimit-(counts[kind]-b.length)));if(retained)chunks[kind].push(b.subarray(0,retained));if(retained!==b.length||totalRaw>record.rawOutputByteLimit)stop('original raw-output bound exceeded');});child[kind].on('error',e=>stop(kind+' stream failed:'+e.message));}
      child.on('error',e=>{failure='original spawn failed:'+e.message;});child.on('close',(code,signal)=>finish(code,signal));
    });
    if(privateOutput&&outcome.exitCode===0){const secret=outcome.stdout.toString('utf8').trim();assert(secret.length&&secret.length<4096);privateValues.add(secret);}
    const sanitized=Object.fromEntries(['stdout','stderr'].map(kind=>[kind,Buffer.from(privateOutput?'[REDACTED_CREDENTIAL_PROVISIONING_STREAM]\n':redact(outcome[kind].toString('utf8')))]));
    for(const kind of['stdout','stderr']){const relative='commands/'+prefix+'.'+kind+'.txt';await writeNew(path.join(evidence,relative),sanitized[kind]);row[kind]={path:relative,observedRawBytes:outcome.counts[kind],retainedSanitizedBytes:sanitized[kind].length,sha256:digest(sanitized[kind]),rawBytesEqualRetained:outcome[kind].equals(sanitized[kind]),credentialRedactionsOnly:!privateOutput,credentialProvisioningStreamOmitted:privateOutput};}
    Object.assign(row,{completedAtUtc:new Date().toISOString(),exitCode:outcome.exitCode,signal:outcome.signal,closeObserved:outcome.closeObserved,failure:outcome.failure,totalObservedRawOutputBytes:totalRaw});row.status=outcome.failure===null&&outcome.closeObserved&&outcome.signal===null&&expectedExitCodes.includes(outcome.exitCode)?'passed':'failed';await save();
    if(row.status!=='passed'){const error=Error('Pinned original command failed: '+caseID);Object.assign(error,{stdout:sanitized.stdout.toString('utf8'),stderr:sanitized.stderr.toString('utf8'),exitCode:outcome.exitCode});throw error;}
    return{stdout:privateOutput?outcome.stdout.toString('utf8'):sanitized.stdout.toString('utf8'),stderr:sanitized.stderr.toString('utf8'),exitCode:outcome.exitCode,record:structuredClone(row)};
  }
  async function snapshot(folder,{caseID,phase}={}){
    assert(/^[a-z0-9][a-z0-9-]{0,95}$/.test(caseID));assert(/^[a-z0-9-]{1,40}$/.test(phase));folder=path.resolve(folder);assert(within(root,folder));let total=0,count=0;const output={schema:'rea-sync-oracle-file-tree/v1',caseID,phase,exists:true,directories:[],files:Object.create(null)};
    try{await noLinks(folder);}catch(e){if(e.code==='ENOENT'){output.exists=false;const relative='file-manifests/'+caseID+'-'+phase+'.json';await writeNew(path.join(evidence,relative),Buffer.from(JSON.stringify(output,null,2)+'\n'));return output;}throw e;}
    async function walk(relative,depth=0){assert(depth<=32);for(const child of await fs.readdir(path.join(folder,relative),{withFileTypes:true})){assert(++count<=10000);const name=relative?relative+'/'+child.name:child.name;assert(!child.isSymbolicLink());const file=path.join(folder,...name.split('/'));await noLinks(file);const st=await fs.stat(file,{bigint:true});if(st.isDirectory()){output.directories.push(name);await walk(name,depth+1);}else{assert(st.isFile()&&st.nlink===1n&&st.size<=8n*1024n*1024n);total+=Number(st.size);assert(total<=32*1024*1024);const b=await fs.readFile(file);assert.equal(BigInt(b.length),st.size);const after=await fs.stat(file,{bigint:true});assert.equal(after.size,st.size);assert.equal(after.mtimeNs,st.mtimeNs);assert.equal(after.ctimeNs,st.ctimeNs);const hash=digest(b),object=path.join(objects,hash+'.bin');try{await writeNew(object,b);}catch(e){if(e.code!=='EEXIST')throw e;assert.deepEqual(await fs.readFile(object),b);}output.files[name]={bytes:b.length,sha256:hash,mtimeNs:st.mtimeNs.toString(),object:'objects/'+hash+'.bin'};}}}
    await walk('');output.directories.sort();output.files=Object.fromEntries(Object.keys(output.files).sort().map(k=>[k,output.files[k]]));const relative='file-manifests/'+caseID+'-'+phase+'.json';await writeNew(path.join(evidence,relative),Buffer.from(JSON.stringify(output,null,2)+'\n'));return output;
  }
  async function retainBytes(bytes){assert(Buffer.isBuffer(bytes)&&bytes.length<=8*1024*1024);const hash=digest(bytes),file=path.join(objects,hash+'.bin');try{await writeNew(file,bytes);}catch(e){if(e.code!=='EEXIST')throw e;assert.deepEqual(await fs.readFile(file),bytes);}return{bytes:bytes.length,sha256:hash,object:'objects/'+hash+'.bin'};}
  const version=await run(['version'],{caseID:'original-version'});assert.match(version.stdout,/^rclone v1\.75\.2(?:\r?\n|$)/);record.version=version.stdout;await save();
  return{run,snapshot,retainBytes,sourceCommit,version:version.stdout,zipPin,exePin,zipSHA256:zipPin.sha256,originalSHA256:exePin.sha256,get executions(){return record.commands.length;},
    async connectionFlags(endpoint,auth){const u=new URL(endpoint);assert.equal(u.protocol,'http:');assert.equal(u.hostname,'127.0.0.1');assert(!u.username&&!u.password&&!u.search&&!u.hash&&u.port);assert.equal(auth.type,'basic');assert([auth.username,auth.password].every(s=>typeof s==='string'&&s.length>0&&s.length<=128));for(const value of[auth.username,auth.password,Buffer.from(auth.username+':'+auth.password).toString('base64')])privateValues.add(value);const encoded=await run(['obscure',auth.password],{caseID:'synthetic-credential-provision',privateOutput:true});return['--webdav-url',endpoint,'--webdav-vendor','other','--webdav-user',auth.username,'--webdav-pass',encoded.stdout.trim()];},
    async finish(status){assert(['passed','failed'].includes(status));closed=true;record.status=status;record.completedAtUtc=new Date().toISOString();await save();return structuredClone(record);}
  };
}
