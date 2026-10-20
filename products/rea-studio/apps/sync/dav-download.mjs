// Source-authored slice; hosted validation and independent review are pending.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {createWebDAV,connection,remotePath,davLimits} from './webdav.mjs';
import {boundedInput} from './dav-input.mjs';
import {compileFilters} from './native-filters.mjs';
import {compareDAV,davComparisonOptions} from './dav-comparison.mjs';

export const downloadLimits=Object.freeze({entries:10000,depth:32,totalBytes:512*1024*1024,operationMilliseconds:120000,plans:1,planBytes:8*1024*1024,cacheBytes:8*1024*1024,expiresMilliseconds:15*60*1000});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fingerprint=value=>hash(Buffer.from(JSON.stringify(value)));
const fold=value=>value.normalize('NFC').toLowerCase();
const order=(a,b)=>Buffer.compare(Buffer.from(a.path),Buffer.from(b.path));
const join=(base,relative)=>base?base+(relative?'/'+relative:''):relative;
const remoteExpected=item=>Object.fromEntries(['path','type','size','modifiedMs','etag','strongETag'].map(key=>[key,item[key]]));
const identity=stat=>({dev:stat.dev.toString(),ino:stat.ino.toString()});
function portable(relative,root=false,internal=false){remotePath(relative,root);if(!internal&&relative.split('/').some(part=>part.toLowerCase().startsWith('.rea-sync')))throw Error('Internal recovery paths are not download destinations.');return relative;}
function principal(input){return fingerprint(input.auth?{type:'basic',username:input.auth.username}:{type:'anonymous'});}

export function createDAVDownload(workspace,{clock=Date.now}={}){
  const configuredRoot=path.resolve(workspace);let root=null,rootIdentity=null,plan=null,busy=false,closed=false,activeClient=null;
  function expire(){if(plan&&(clock()<plan.created||clock()-plan.created>=downloadLimits.expiresMilliseconds))plan=null;}
  function budget(){const started=clock();let entries=0,bytes=0;return {check(count=0,size=0){entries+=count;bytes+=size;if(closed||clock()<started||clock()-started>downloadLimits.operationMilliseconds||entries>downloadLimits.entries||bytes>downloadLimits.totalBytes)throw Error('Download scope is closed or exceeds its inventory, byte or work budget.');}};}
  async function exclusive(action){if(closed||busy)throw Error('WebDAV download scope is closed or busy.');busy=true;try{return await action();}finally{busy=false;}}
  async function canonical(guard){
    guard.check();const volume=path.parse(configuredRoot).root;let current=volume;
    for(const part of ['',...path.relative(volume,configuredRoot).split(path.sep).filter(Boolean)]){if(part)current=path.join(current,part);const stat=await fs.lstat(current);if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('Workspace root links or non-directories are unsupported.');}
    const actual=await fs.realpath(configuredRoot),stat=await fs.lstat(actual,{bigint:true}),key=identity(stat);if(root!==null&&(root!==actual||fingerprint(rootIdentity)!==fingerprint(key)))throw Error('Workspace canonical root changed.');root=actual;rootIdentity=key;return root;
  }
  async function sibling(parent,name,guard){
    const directory=await fs.opendir(parent,{bufferSize:32});let count=0,match=0;
    for await(const entry of directory){guard.check();if(++count>downloadLimits.entries)throw Error('Local parent inventory exceeds its entry bound.');if(fold(entry.name)===fold(name)){match++;if(entry.name!==name||match>1)throw Error('Local path has a case or Unicode alias collision.');}}
  }
  // Resolve every existing component; never create a directory during preview.
  async function local(relative,guard,{internal=false}={}){
    portable(relative,false,internal);let current=await canonical(guard);const parts=relative.split('/'),ancestors=[];
    for(let index=0;index<parts.length;index++){
      const part=parts[index];await sibling(current,part,guard);current=path.join(current,part);let stat;
      try{stat=await fs.lstat(current,{bigint:true});}catch(error){if(error.code==='ENOENT')return {target:path.join(root,...parts),exists:false,ancestors};throw error;}
      if(stat.isSymbolicLink()||await fs.realpath(current)!==current)throw Error('Local path aliases through links or noncanonical names are unsupported.');
      if(index<parts.length-1&&!stat.isDirectory())throw Error('Local destination has a file/directory collision.');
      ancestors.push({path:parts.slice(0,index+1).join('/'),...identity(stat)});
      if(index===parts.length-1)return {target:current,exists:true,stat,ancestors};
    }
  }
  async function localBytes(relative,guard,{internal=false}={}){
    const item=await local(relative,guard,{internal});if(!item.exists||!item.stat.isFile()||item.stat.nlink!==1n||item.stat.size>BigInt(davLimits.file))throw Error('Local file must be a bounded ordinary file with one link.');
    const handle=await fs.open(item.target,'r');
    try{
      const before=await handle.stat({bigint:true});if(!before.isFile()||before.nlink!==1n||before.size>BigInt(davLimits.file)||before.dev!==item.stat.dev||before.ino!==item.stat.ino)throw Error('Local file changed before reading.');
      guard.check(0,Number(before.size));const bytes=Buffer.alloc(Number(before.size));let offset=0;
      while(offset<bytes.length){guard.check();const read=await handle.read(bytes,offset,Math.min(1024*1024,bytes.length-offset),offset);if(!read.bytesRead)throw Error('Local file changed while reading.');offset+=read.bytesRead;}
      const extra=await handle.read(Buffer.alloc(1),0,1,bytes.length),after=await handle.stat({bigint:true});
      if(extra.bytesRead||before.size!==after.size||before.mtimeNs!==after.mtimeNs||before.ctimeNs!==after.ctimeNs||before.ino!==after.ino||before.dev!==after.dev||after.nlink!==1n)throw Error('Local file changed while reading.');
      const final=await local(relative,guard,{internal});if(!final.exists||final.stat.dev!==after.dev||final.stat.ino!==after.ino||final.stat.mtimeNs!==after.mtimeNs||final.stat.ctimeNs!==after.ctimeNs)throw Error('Local file path changed while reading.');
      return {bytes,size:bytes.length,sha256:hash(bytes),modifiedMs:Number(before.mtimeNs)/1e6,mtimeNs:before.mtimeNs.toString(),ctimeNs:before.ctimeNs.toString(),...identity(before)};
    }finally{await handle.close();}
  }
  async function scanLocal(destination,guard){
    const base=await local(destination,guard);if(!base.exists)return {exists:false,ancestors:base.ancestors,entries:[]};if(!base.stat.isDirectory())throw Error('Local destination must be a directory.');
    const out=[],seen=new Set();
    async function walk(relative,depth){
      if(depth>downloadLimits.depth)throw Error('Local destination depth exceeds its bound.');const full=join(destination,relative),directory=await local(full,guard);
      if(!directory.exists||!directory.stat.isDirectory())throw Error('Local directory changed while scanning.');
      const handle=await fs.opendir(directory.target,{bufferSize:32});
      for await(const entry of handle){guard.check(1);const name=join(relative,entry.name);portable(name,false);if(seen.has(fold(name)))throw Error('Local inventory has a case or Unicode collision.');seen.add(fold(name));
        if(entry.isDirectory()){const checked=await local(join(destination,name),guard);out.push({path:name,type:'directory',...identity(checked.stat)});await walk(name,depth+1);}
        else if(entry.isFile()){const {bytes,...meta}=await localBytes(join(destination,name),guard);out.push({path:name,type:'file',...meta});}
        else throw Error('Local links and special entries are unsupported.');
      }
    }
    await walk('',0);return {exists:true,ancestors:base.ancestors,entries:out.sort(order)};
  }
  async function scanRemote(client,source,guard){
    const self=await client.stat(source,{collection:true});if(!self||self.type!=='directory')throw Error('Existing remote source collection required.');
    const out=[],seen=new Set();
    async function walk(relative,depth){
      if(depth>downloadLimits.depth)throw Error('Remote source depth exceeds its bound.');guard.check();
      for(const item of await client.list(join(source,relative))){guard.check(1);const name=item.path.slice(source?source.length+1:0);portable(name,false);if(seen.has(fold(name)))throw Error('Remote source has a case or Unicode collision.');seen.add(fold(name));
        if(item.type==='directory'){out.push({...item,path:name});await walk(name,depth+1);}
        else {if(!item.strongETag||!Number.isFinite(item.modifiedMs))throw Error('Download safety requires strong ETags and valid modification dates for every source file.');guard.check(0,item.size);const bytes=await client.read(item.path,{expected:item});if(bytes.length!==item.size)throw Error('Remote source length changed.');out.push({...item,path:name,sha256:hash(bytes)});}
      }
    }
    await walk('',0);return out.sort(order);
  }
  async function ensureDirectory(relative,guard,{internal=false}={}){
    portable(relative,false,internal);let prefix='';
    for(const part of relative.split('/')){prefix=join(prefix,part);const item=await local(prefix,guard,{internal});if(!item.exists){guard.check();await fs.mkdir(item.target,{mode:0o700});}const checked=await local(prefix,guard,{internal});if(!checked.exists||!checked.stat.isDirectory())throw Error('Local directory creation did not produce the expected ordinary directory.');}
    return (await local(relative,guard,{internal})).target;
  }
  async function writeNew(relative,bytes,guard){
    const item=await local(relative,guard,{internal:true});if(item.exists)throw Error('Recovery staging path already exists.');const handle=await fs.open(item.target,'wx',0o600);
    try{let offset=0;while(offset<bytes.length){guard.check();const written=await handle.write(bytes,offset,Math.min(1024*1024,bytes.length-offset),offset);if(!written.bytesWritten)throw Error('Local staging write made no progress.');offset+=written.bytesWritten;}await handle.sync();}finally{await handle.close();}
    const result=await localBytes(relative,guard,{internal:true});if(result.size!==bytes.length||result.sha256!==hash(bytes))throw Error('Local staging readback failed.');return item.target;
  }
  function summary(value){return {direction:'webdav-to-local',endpoint:value.endpoint,source:value.source,destination:value.destination,mode:'copy',operations:structuredClone(value.operations),skipped:structuredClone(value.skipped),comparison:value.comparison,filters:value.filters,counts:{copy:value.operations.filter(x=>x.type==='copy').length,replace:value.operations.filter(x=>x.type==='copy'&&x.destination).length,mkdir:value.operations.filter(x=>x.type==='mkdir').length},expiresAt:new Date(value.created+downloadLimits.expiresMilliseconds).toISOString(),safety:'Keeps local extras. Strong ETag reads, reviewed inventory checks and staged verified local copies; replacements retain preimages. Sequential per-file publication, not a whole-tree transaction. Quiescent local destination required.'};}
  return {
    cache(){expire();return {plans:plan?1:0,bytes:plan?.byteLength??0,limits:downloadLimits};},
    close(){closed=true;plan=null;activeClient?.close();},
    preview(input){return exclusive(async()=>{
      input=boundedInput(input,['endpoint','auth','source','destination','mode','filters','comparison']);let client;
      try{
        const settings=connection({endpoint:input.endpoint,...(input.auth?{auth:input.auth}:{})});settings.authorization=null;
        const source=portable(input.source??'',true),destination=portable(input.destination,false);if(input.mode!=='copy')throw Error('WebDAV download supports reviewed copy only.');
        const comparison=davComparisonOptions(input.comparison),filter=compileFilters(input.filters),guard=budget();client=createWebDAV({endpoint:settings.endpoint,...(input.auth?{auth:input.auth}:{})});activeClient=client;
        const sourceEntries=await scanRemote(client,source,guard),destinationState=await scanLocal(destination,guard),targets=new Map(destinationState.entries.map(item=>[item.path,item])),caseTargets=new Map(destinationState.entries.map(item=>[fold(item.path),item.path])),operations=[],skipped=[],matching={remaining:64000000};
        for(const item of sourceEntries){const alias=caseTargets.get(fold(item.path));if(alias!==undefined&&alias!==item.path)throw Error('Source and destination have a case or Unicode collision.');if(targets.has(item.path)&&targets.get(item.path).type!==item.type)throw Error('Source and destination have a file/directory collision.');}
        for(const item of sourceEntries){
          if(item.type!=='file')continue;const parents=item.path.split('/').slice(0,-1);
          if(!filter.includeFile(item.path,item.size,matching)||parents.some((_,index)=>!filter.includeDirectory(parents.slice(0,index+1).join('/'),matching))){skipped.push({path:item.path,reason:'filtered-source',byteHashesEqual:targets.get(item.path)?.sha256===item.sha256});continue;}
          const target=targets.get(item.path),decision=compareDAV(item,target,comparison);
          if(decision.type==='skip'){skipped.push({path:item.path,reason:decision.reason,byteHashesEqual:target.sha256===item.sha256});continue;}
          if(!destinationState.exists&&!operations.some(x=>x.type==='mkdir'&&x.path===''))operations.push({type:'mkdir',path:''});
          for(let index=1;index<=parents.length;index++){const relative=parents.slice(0,index).join('/');if(!targets.has(relative)&&!operations.some(x=>x.type==='mkdir'&&x.path===relative))operations.push({type:'mkdir',path:relative});}
          operations.push({type:'copy',path:item.path,reason:decision.reason,source:{...item},destination:target?{...target}:null});
        }
        const value={endpoint:settings.endpoint,source,destination,principal:principal(input),direction:'webdav-to-local',mode:'copy',filters:structuredClone(input.filters??{}),comparison,sourceEntries,destinationState,operations,skipped,created:clock(),token:randomBytes(24).toString('hex')};
        value.byteLength=Buffer.byteLength(JSON.stringify(value));if(value.byteLength>downloadLimits.planBytes)throw Error('Download preview exceeds its metadata bound.');plan=structuredClone(value);return {token:value.token,...summary(value)};
      }finally{client?.close();activeClient=null;input.auth=null;}
    });},
    apply(input){return exclusive(async()=>{
      input=boundedInput(input,['endpoint','auth','token']);let client,current=null,history=null,manifest=null,consumed=false;const completed=[];
      try{
        expire();if(typeof input.token!=='string'||!/^[a-f0-9]{48}$/.test(input.token)||!plan||plan.token!==input.token)throw Error('Download preview is missing, expired or consumed.');
        const settings=connection({endpoint:input.endpoint,...(input.auth?{auth:input.auth}:{})});settings.authorization=null;const selected=plan;
        if(settings.endpoint!==selected.endpoint||principal(input)!==selected.principal)throw Error('Download endpoint or authentication principal differs from its preview.');
        const guard=budget();client=createWebDAV({endpoint:settings.endpoint,...(input.auth?{auth:input.auth}:{})});activeClient=client;
        const remote=await scanRemote(client,selected.source,guard),localState=await scanLocal(selected.destination,guard);
        if(fingerprint(remote)!==fingerprint(selected.sourceEntries)||fingerprint(localState)!==fingerprint(selected.destinationState))throw Error('Download preview is stale; remote source or local destination changed.');
        // Consume once before the first possible local write, including staging.
        plan=null;consumed=true;
        if(selected.operations.length){
          current={type:'stage',path:'',localMayHaveChanged:false};await ensureDirectory('.rea-sync-history',guard,{internal:true});const historyName='.rea-sync-history/dav-download-'+selected.token;
          const historyItem=await local(historyName,guard,{internal:true});if(historyItem.exists)throw Error('Download recovery directory already exists.');await fs.mkdir(historyItem.target,{mode:0o700});history=historyName;
          manifest={schemaVersion:1,direction:'webdav-to-local',endpoint:selected.endpoint,source:selected.source,destination:selected.destination,retained:[],staged:[],completed:[]};
          for(const operation of selected.operations){if(operation.type!=='copy')continue;guard.check();current={type:'stage',path:operation.path,localMayHaveChanged:false};
            const expected={...remoteExpected(operation.source),path:join(selected.source,operation.path)},bytes=await client.read(expected.path,{expected});guard.check(0,bytes.length);if(hash(bytes)!==operation.source.sha256)throw Error('Remote source changed before staging.');
            const stage=history+'/'+manifest.staged.length+'.stage';await writeNew(stage,bytes,guard);manifest.staged.push({path:operation.path,file:stage.slice(history.length+1),size:bytes.length,sha256:operation.source.sha256});
            if(operation.destination){const old=await localBytes(join(selected.destination,operation.path),guard);const {bytes:previous,...meta}=old;if(fingerprint(meta)!==fingerprint(Object.fromEntries(Object.entries(operation.destination).filter(([key])=>!['path','type'].includes(key)))))throw Error('Local replacement changed before retaining its preimage.');const name=manifest.retained.length+'.preimage';await writeNew(history+'/'+name,previous,guard);manifest.retained.push({path:operation.path,file:name,size:old.size,sha256:old.sha256,mtimeNs:old.mtimeNs});}
          }
          await writeNew(history+'/manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'),guard);
        }
        for(const operation of selected.operations){
          guard.check();current={type:operation.type,path:operation.path,localMayHaveChanged:false};const relative=join(selected.destination,operation.path);
          if(operation.type==='mkdir'){current.localMayHaveChanged=true;await ensureDirectory(relative,guard);completed.push({type:'mkdir',path:operation.path});}
          else {
            const staged=manifest.staged.find(item=>item.path===operation.path),stage=await localBytes(history+'/'+staged.file,guard,{internal:true});if(stage.size!==operation.source.size||stage.sha256!==operation.source.sha256)throw Error('Staged download bytes changed.');
            const target=await local(relative,guard);
            if(operation.destination){const {bytes,...meta}=await localBytes(relative,guard);if(fingerprint(meta)!==fingerprint(Object.fromEntries(Object.entries(operation.destination).filter(([key])=>!['path','type'].includes(key)))))throw Error('Local replacement changed immediately before publication.');}
            else if(target.exists)throw Error('Planned new local file appeared before publication.');
            const parentPath=relative.includes('/')?relative.slice(0,relative.lastIndexOf('/')):'';if(!parentPath)throw Error('Local file parent is missing.');const parentItem=await local(parentPath,guard);if(!parentItem.exists||!parentItem.stat.isDirectory())throw Error('Local file parent changed before publication.');
            const stagePath=(await local(history+'/'+staged.file,guard,{internal:true})).target;guard.check();current.localMayHaveChanged=true;
            if(operation.destination)await fs.rename(stagePath,target.target);
            else {await fs.link(stagePath,target.target);await fs.unlink(stagePath);}
            const installed=await localBytes(relative,guard);if(installed.size!==operation.source.size||installed.sha256!==operation.source.sha256)throw Error('Published local download readback failed.');
            // Generic source metadata is read-only remotely; local copies keep its observed time.
            const checked=await local(relative,guard);if(!checked.exists||checked.stat.ino.toString()!==installed.ino||checked.stat.dev.toString()!==installed.dev)throw Error('Published local path changed before timestamp update.');
            await fs.utimes(checked.target,operation.source.modifiedMs/1000,operation.source.modifiedMs/1000);
            const verified=await localBytes(relative,guard);if(verified.sha256!==operation.source.sha256)throw Error('Local downloaded bytes changed during final verification.');
            completed.push({type:'copy',path:operation.path,size:verified.size,sha256:verified.sha256});
          }
          current=null;
          if(history){manifest.completed=structuredClone(completed);const next=history+'/manifest-'+completed.length+'.pending';const temp=await writeNew(next,Buffer.from(JSON.stringify(manifest,null,2)+'\n'),guard);const target=await local(history+'/manifest.json',guard,{internal:true});await fs.rename(temp,target.target);}
        }
        return {applied:true,direction:'webdav-to-local',completed,retainedAt:history,transaction:'Staged bytes and per-file verified publication. Local extras kept. No whole-tree atomicity or protection from concurrent external local writers.'};
      }catch(error){error.planConsumed=consumed;error.completed=structuredClone(completed);error.failedOperation=structuredClone(current);error.retainedAt=history;throw error;}
      finally{client?.close();activeClient=null;input.auth=null;}
    });},
  };
}
