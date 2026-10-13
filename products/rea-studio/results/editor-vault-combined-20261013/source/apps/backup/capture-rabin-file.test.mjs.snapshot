import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {chunkBuffers,captureRabinFile,READ_BYTES,MAX_INPUT_BLOCKS} from './capture-rabin-file.mjs';
import {RabinBoundaries,MAX,TOTAL} from './rabin.mjs';
const polynomial='3da3358b4dc173',hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function randomBytes(size){const bytes=Buffer.alloc(size);for(let offset=0;offset<size;offset+=32)createHash('sha256').update(`rabin-adapter:${offset}`).digest().copy(bytes,offset,0,Math.min(32,size-offset));return bytes;}
function expected(bytes){const splitter=new RabinBoundaries(polynomial),rows=[...splitter.push(bytes),...splitter.finish()];return rows.map(row=>({...row,sha256:hash(bytes.subarray(row.start,row.start+row.length))}));}
async function folder(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-rabin-capture-'));t.after(async()=>{assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('rea-rabin-capture-'));await fs.rm(root,{recursive:true,force:true});});return root;}
test('stream capture owns its pending and emitted buffers across asynchronous consumer mutation',async()=>{
 const bytes=randomBytes(3*1024*1024+17),wanted=expected(bytes),blocks=[];for(let offset=0;offset<bytes.length;offset+=READ_BYTES)blocks.push(Buffer.from(bytes.subarray(offset,offset+READ_BYTES)));let current;async function* source(){for(const block of blocks){current=block;yield block;}}
 const actual=[];for await(const chunk of chunkBuffers(source(),polynomial)){assert.equal(hash(chunk.bytes),chunk.sha256);actual.push(({start:chunk.start,length:chunk.length,cut:chunk.cut,sha256:chunk.sha256}));current.fill(0);chunk.bytes.fill(0);await new Promise(done=>setImmediate(done));}assert.deepEqual(actual,wanted);
});
test('stream capture validates block, aggregate, deadline, cancellation and EOF contracts',async()=>{
 async function* one(value){yield value;}
 await assert.rejects(async()=>{for await(const chunk of chunkBuffers(one(Buffer.alloc(READ_BYTES+1)),polynomial))void chunk;},/input block/);await assert.rejects(async()=>{for await(const chunk of chunkBuffers(one(new Uint8Array(1)),polynomial))void chunk;},/input block/);
 async function* huge(){const bytes=Buffer.alloc(READ_BYTES);for(let count=0;count<=TOTAL/READ_BYTES;count++)yield bytes;}let output=0;await assert.rejects(async()=>{for await(const chunk of chunkBuffers(huge(),polynomial)){output+=chunk.length;assert.ok(chunk.length<=MAX);}},/64 MiB/);assert.equal(output,TOTAL);
 async function* empty(){for(let count=0;count<=MAX_INPUT_BLOCKS;count++)yield Buffer.alloc(0);}await assert.rejects(async()=>{for await(const chunk of chunkBuffers(empty(),polynomial))void chunk;},/block bound/);
 const controller=new AbortController();controller.abort(new Error('synthetic abort'));await assert.rejects(async()=>{for await(const chunk of chunkBuffers(one(Buffer.from('tiny')),polynomial,{signal:controller.signal}))void chunk;},/synthetic abort/);assert.throws(()=>chunkBuffers(one(Buffer.alloc(0)),polynomial,{timeoutMilliseconds:0}),/deadline/);assert.throws(()=>chunkBuffers(one(Buffer.alloc(0)),polynomial,{timeoutMilliseconds:120001}),/deadline/);
 const actual=[];for await(const chunk of chunkBuffers(one(Buffer.from('tiny')),polynomial))actual.push(chunk);assert.equal(actual.length,1);assert.equal(actual[0].bytes.toString(),'tiny');assert.equal(actual[0].cut,'1');
});
test('file adapter preserves max cuts and tail, captures caller controls and verifies sink IDs',async t=>{
 const root=await folder(t),filename=path.join(root,'source.bin'),bytes=Buffer.alloc(2*MAX+127,0x41);await fs.writeFile(filename,bytes);const rows=[],options={filename,polynomial,expected:await fs.lstat(filename),saveChunk:async(chunk,row)=>{rows.push(row);const id=hash(chunk);chunk.fill(0);return id;}},pending=captureRabinFile(options);options.polynomial='1';options.filename=path.join(root,'unrelated');options.saveChunk=()=>{throw new Error('caller-mutated sink');};options.expected.size=0;const result=await pending;assert.equal(result.size,bytes.length);assert.deepEqual(rows.map(row=>row.length),[MAX,MAX,127]);assert.deepEqual(result.content,expected(bytes).map(row=>row.sha256));assert.equal(result.maximumLiveCaptureBufferBytes,17*1024*1024);
 await assert.rejects(captureRabinFile({filename,polynomial,saveChunk:()=> '0'.repeat(64)}),/different plaintext ID/);
});
test('file adapter refuses source growth/replacement and cancellation before another sink call',async t=>{
 const root=await folder(t),original=randomBytes(3*1024*1024);
 for(const mode of ['growth','replacement','cancel']){const filename=path.join(root,`${mode}.bin`);await fs.writeFile(filename,original);let calls=0;const controller=new AbortController(),operation=captureRabinFile({filename,polynomial,signal:controller.signal,saveChunk:async chunk=>{calls++;const id=hash(chunk);if(mode==='growth')await fs.appendFile(filename,'x');if(mode==='replacement'){await fs.rename(filename,filename+'.old');await fs.writeFile(filename,original);}if(mode==='cancel')controller.abort(new Error('synthetic sink cancellation'));return id;}});await assert.rejects(operation,mode==='cancel'?/synthetic sink cancellation/:/source changed/);assert.equal(calls,1);}
});
test('file adapter enforces regular-file size/deadline bounds and a held sink cannot turn expiry into success',async t=>{
 const root=await folder(t),directory=path.join(root,'directory');await fs.mkdir(directory);let calls=0;await assert.rejects(captureRabinFile({filename:directory,polynomial,saveChunk:()=>{calls++;}}),/regular file/);const large=path.join(root,'too-large'),handle=await fs.open(large,'wx');await handle.truncate(TOTAL+1);await handle.close();await assert.rejects(captureRabinFile({filename:large,polynomial,saveChunk:()=>{calls++;}}),/64 MiB/);assert.equal(calls,0);
 const filename=path.join(root,'small');await fs.writeFile(filename,'tiny');let enter,release;const entered=new Promise(done=>enter=done),gate=new Promise(done=>release=done),pending=captureRabinFile({filename,polynomial,timeoutMilliseconds:1000,saveChunk:async chunk=>{enter();await gate;return hash(chunk);}}),rejected=assert.rejects(pending,/deadline/);await entered;await new Promise(done=>setTimeout(done,1100));release();await rejected;
});
