import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {syncBuiltinESMExports} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createWorkspace} from '../../lib/storage.mjs';
import {handleNative} from './restic.mjs';
import {captureRabinFile} from './capture-rabin-file.mjs';

const password='owned-small-file-mutation-only',digest=bytes=>createHash('sha256').update(bytes).digest('hex'),polynomial='3da3358b4dc173';
function gate(){let enter,release;return{entered:new Promise(done=>enter=done),held:new Promise(done=>release=done),enter:()=>enter(),release:()=>release()};}
async function folder(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-pack-small-mutation-'));t.after(async()=>{assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('rea-pack-small-mutation-'));await fs.rm(root,{recursive:true,force:true});});return root;}
async function reached(promise){let timeout;try{await Promise.race([promise,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Owned deterministic gate was not reached.')),10000);})]);}finally{clearTimeout(timeout);}}

test('held small-file read detects mutation before any native pack/index/snapshot publication',async t=>{
 const root=await folder(t),workspace=await createWorkspace(path.join(root,'workspace')),filename=workspace.resolve('source/tiny.bin'),original=Buffer.from('owned tiny source bytes');await fs.mkdir(path.dirname(filename));await fs.writeFile(filename,original);await handleNative({action:'nativeInit',input:{repository:'native',password,version:2},workspace});
 const control=gate(),realOpen=fs.open;let sourceOpens=0,readCalls=0,closed=0,operation;
 fs.open=async(name,...args)=>{const handle=await realOpen(name,...args);if(name!==filename)return handle;sourceOpens++;const read=handle.read.bind(handle),close=handle.close.bind(handle);handle.read=async(...args)=>{const result=await read(...args);if(++readCalls===1){assert.equal(result.bytesRead,original.length);control.enter();await control.held;}return result;};handle.close=async(...args)=>{const result=await close(...args);closed++;return result;};return handle;};syncBuiltinESMExports();
 try{operation=handleNative({action:'nativeSnapshot',input:{repository:'native',password,source:'source',compression:'off'},workspace}).then(value=>({value}),error=>({error}));await reached(control.entered);await fs.appendFile(filename,' changed while first read is held');control.release();const result=await operation;assert.match(result.error?.message??'',/changed while being captured/);assert.equal(result.value,undefined);}finally{control.release();if(operation)await operation;fs.open=realOpen;syncBuiltinESMExports();}
 assert.equal(sourceOpens,1);assert.equal(closed,1);for(const name of ['data','index','snapshots','locks','tmp'])assert.deepEqual(await fs.readdir(workspace.resolve('native/'+name)),[]);
 console.log(JSON.stringify({nativeSmallMutationObservation:{boundary:'first successful source read held before delivery',fixtureBytes:original.length,fixtureSha256:digest(original),readCalls,sourceHandleCloses:closed,publishedDataIndexSnapshotObjects:0,remainingOwnLocks:0,runtimeSourceUnmodified:true}}));
});

test('held small-file sink detects mutation after owned EOF chunk without returning capture success',async t=>{
 const root=await folder(t),filename=path.join(root,'tiny.bin'),original=Buffer.from('owned tiny sink-boundary source bytes');await fs.writeFile(filename,original);const control=gate();let calls=0,sinkBytes,sourceHandleCloses=0;const realOpen=fs.open;
 fs.open=async(name,...args)=>{const handle=await realOpen(name,...args);if(name===filename){const close=handle.close.bind(handle);handle.close=async(...args)=>{const result=await close(...args);sourceHandleCloses++;return result;};}return handle;};syncBuiltinESMExports();let operation;
 try{operation=captureRabinFile({filename,polynomial,saveChunk:async bytes=>{calls++;sinkBytes=bytes;assert.deepEqual(bytes,original);control.enter();await control.held;assert.deepEqual(bytes,original,'Source mutation does not alias an emitted privately owned chunk.');return digest(bytes);}}).then(value=>({value}),error=>({error}));await reached(control.entered);await fs.appendFile(filename,' changed while EOF sink is held');control.release();const result=await operation;assert.match(result.error?.message??'',/changed while being captured/);assert.equal(result.value,undefined);}finally{control.release();if(operation)await operation;fs.open=realOpen;syncBuiltinESMExports();}
 assert.equal(calls,1);assert.equal(sourceHandleCloses,1);assert.equal(digest(sinkBytes),digest(original));console.log(JSON.stringify({nativeSmallMutationObservation:{boundary:'owned EOF chunk sink held before sink completion',fixtureBytes:original.length,fixtureSha256:digest(original),sinkCalls:calls,sourceHandleCloses,returnedCaptureSuccess:false,emittedChunkOwnershipVerified:true,scope:'Real unchanged file-capture primitive; sink is an owned deterministic test callback, no repository snapshot is attempted.'}}));
});
