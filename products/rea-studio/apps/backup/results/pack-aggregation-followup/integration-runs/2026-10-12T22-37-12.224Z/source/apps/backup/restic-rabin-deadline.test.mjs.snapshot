import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {syncBuiltinESMExports} from 'node:module';
import {createHash} from 'node:crypto';
import {createWorkspace} from '../../lib/storage.mjs';
import {handleNative} from './restic.mjs';

const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-rabin-deadline-'));
const password='owned-production-deadline-fixtures',actual={mkdir:fs.mkdir,open:fs.open},realNow=Date.now,cases=[];
const sources=['restic.mjs','capture-rabin-file.mjs','rabin.mjs','../../lib/storage.mjs'].map(name=>new URL(name,import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),before=await Promise.all(sources.map(async url=>hash(await fs.readFile(url))));
const base=await createWorkspace(path.join(root,'template'));
await handleNative({action:'nativeInit',input:{repository:'repository',password,version:2},workspace:base});
for(const phase of ['mkdir','open','write'])test(`expired native ${phase} prevents every later write step and closes its own handle`,async()=>{
 const workspace=await createWorkspace(path.join(root,phase));await fs.cp(base.resolve('repository'),workspace.resolve('repository'),{recursive:true});
 let offset=0,lateOpen=0,lateWrite=0,lateSync=0,closeCalls=0,rejected;
 Date.now=()=>realNow()+offset;
 fs.mkdir=async(filename,...args)=>{const result=await actual.mkdir(filename,...args);if(phase==='mkdir'&&filename===workspace.resolve('repository/tmp'))offset=120001;return result;};
 fs.open=async(filename,...args)=>{
  const handle=await actual.open(filename,...args);
  if(typeof filename==='string'&&filename.startsWith(workspace.root+path.sep)&&filename.endsWith('.pending')){
   if(offset)lateOpen++;if(phase==='open')offset=120001;
   const write=handle.writeFile.bind(handle),sync=handle.sync.bind(handle),close=handle.close.bind(handle);
   handle.writeFile=async(...values)=>{if(offset)lateWrite++;const result=await write(...values);if(phase==='write')offset=120001;return result;};
   handle.sync=async(...values)=>{if(offset)lateSync++;return sync(...values);};
   handle.close=async(...values)=>{closeCalls++;return close(...values);};
  }
  return handle;
 };syncBuiltinESMExports();
 try{await handleNative({action:'nativeInfo',input:{repository:'repository',password},workspace});}catch(error){rejected=error.message;}
 finally{Date.now=realNow;Object.assign(fs,actual);syncBuiltinESMExports();}
 const temporary=await fs.readdir(workspace.resolve('repository/tmp')),locks=await fs.readdir(workspace.resolve('repository/locks'));
 assert.match(rejected,/exceeded two minutes/);assert.deepEqual(temporary,[]);assert.deepEqual(locks,[]);
 assert.equal(lateOpen,0);assert.equal(lateWrite,0);assert.equal(lateSync,0);assert.equal(closeCalls,phase==='mkdir'?0:1);
 cases.push({phase,clockAdvanceMilliseconds:120001,rejected,lateOpen,lateWrite,lateSync,closeCalls,temporary,locks});
});
test.after(async()=>{
 assert.deepEqual(await Promise.all(sources.map(async url=>hash(await fs.readFile(url)))),before);
 console.log(JSON.stringify({rabinDeadlineObservations:{cases,sourceBytesStableAcrossRun:true,scope:'Three deterministic child-only clock advances against actual production modules and owned fixtures.'}}));
 assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('rea-rabin-deadline-'));await fs.rm(root,{recursive:true,force:true});
});
