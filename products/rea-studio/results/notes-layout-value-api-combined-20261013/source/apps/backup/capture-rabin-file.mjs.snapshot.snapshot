import * as fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {RabinBoundaries,MAX,TOTAL} from './rabin.mjs';
import {validPolynomial} from './restic-crypto.mjs';
export const READ_BYTES=512*1024,MAX_INPUT_BLOCKS=8192,MAX_ACTIVE_MILLISECONDS=120000;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function settings(options){const timeoutMilliseconds=options.timeoutMilliseconds??MAX_ACTIVE_MILLISECONDS;if(!Number.isFinite(timeoutMilliseconds)||timeoutMilliseconds<1||timeoutMilliseconds>MAX_ACTIVE_MILLISECONDS)throw new Error('Use a Rabin capture deadline of 1 through 120,000 milliseconds.');const signal=options.signal;if(signal!==undefined&&!(signal instanceof AbortSignal))throw new Error('Use a real AbortSignal for Rabin capture.');const deadline=performance.now()+timeoutMilliseconds;return{signal,remaining(){return Math.max(1,deadline-performance.now());},guard(){if(signal?.aborted)throw signal.reason instanceof Error?signal.reason:new Error('Rabin capture cancelled.');if(performance.now()>=deadline)throw new Error('Rabin capture exceeded its active deadline.');}};}
// Each yielded buffer is owned by its receiver. No input or output buffer can
// alias the private assembly buffer reused for subsequent chunks.
export function chunkBuffers(source,polynomial,options={}){
 const context=settings(options),splitter=new RabinBoundaries(polynomial);
 return(async function*(){let buffer,filled=0,processed=0,blocks=0;
  for await(const value of source){context.guard();if(!Buffer.isBuffer(value)||value.length>READ_BYTES||++blocks>MAX_INPUT_BLOCKS)throw new Error('Rabin source exceeds its 512 KiB input block or 8,192 block bound.');const owned=Buffer.from(value);if(!owned.length)continue;if(!buffer)buffer=Buffer.allocUnsafe(MAX);const rows=splitter.push(owned);let offset=0;
   for(const row of rows){context.guard();const amount=row.start+row.length-processed-offset;if(amount<0||amount>owned.length-offset||filled+amount>MAX)throw new Error('Rabin boundary and private buffer disagree.');owned.copy(buffer,filled,offset,offset+amount);offset+=amount;filled+=amount;if(filled!==row.length)throw new Error('Rabin chunk assembly length mismatch.');const bytes=Buffer.from(buffer.subarray(0,filled));yield{...row,sha256:digest(bytes),bytes};context.guard();filled=0;}
   if(filled+owned.length-offset>MAX)throw new Error('Rabin chunk exceeds its 8 MiB buffer bound.');owned.copy(buffer,filled,offset);filled+=owned.length-offset;processed+=owned.length;
  }
  context.guard();const tails=splitter.finish();if(tails.length){const row=tails[0];if(tails.length!==1||filled!==row.length)throw new Error('Rabin tail assembly length mismatch.');const bytes=Buffer.from(buffer.subarray(0,filled));yield{...row,sha256:digest(bytes),bytes};context.guard();}else if(filled)throw new Error('Rabin final buffer and boundaries disagree.');
 })();
}
const fields=['dev','ino','size','mtimeNs','ctimeNs'];
const same=(before,after)=>fields.every(field=>before[field]===after[field]);
export async function captureRabinFile(options){
 // Capture public controls before the first await. A caller cannot switch the
 // polynomial, deadline, expected source, path resolver or sink while opening.
 const {filename,polynomial,saveChunk}=options,resolveFilename=options.resolveFilename??(()=>filename),expected=options.expected?Object.fromEntries(['dev','ino','size','mtimeMs','ctimeMs'].map(field=>[field,options.expected[field]])):null,context=settings(options);
 if(typeof filename!=='string'||!filename||typeof resolveFilename!=='function'||typeof saveChunk!=='function')throw new Error('Use a source path and a native blob sink for Rabin capture.');if(!validPolynomial(polynomial))throw new Error('Use a valid degree-53 restic polynomial.');context.guard();
 const currentPath=()=>{context.guard();const value=resolveFilename();context.guard();if(value!==filename)throw new Error('Rabin source path changed.');return value;},before=await fs.lstat(currentPath(),{bigint:true});context.guard();if(!before.isFile()||before.isSymbolicLink()||before.size>BigInt(TOTAL))throw new Error('Rabin source must be a regular file of at most 64 MiB.');
 if(expected){const normal=await fs.lstat(currentPath());context.guard();if(Object.keys(expected).some(field=>expected[field]!==undefined&&expected[field]!==normal[field]))throw new Error('Rabin source changed before capture.');}
 const handle=await fs.open(currentPath(),'r'),content=[];let size=0,chunks=0;
 try{
  context.guard();
  const unchanged=async()=>{context.guard();const opened=await handle.stat({bigint:true});context.guard();const named=await fs.lstat(currentPath(),{bigint:true});context.guard();if(!same(before,opened)||!same(before,named)||named.isSymbolicLink()||!named.isFile())throw new Error('Rabin source changed while being captured.');};await unchanged();
  async function* reads(){const bytes=Buffer.allocUnsafe(READ_BYTES);for(;;){context.guard();const result=await handle.read(bytes,0,bytes.length,null);context.guard();if(!result.bytesRead)return;yield bytes.subarray(0,result.bytesRead);}}
  for await(const chunk of chunkBuffers(reads(),polynomial,{timeoutMilliseconds:context.remaining(),signal:context.signal})){await unchanged();if(size+chunk.length>TOTAL)throw new Error('Rabin source grew beyond its 64 MiB bound.');context.guard();const id=await saveChunk(chunk.bytes,{start:chunk.start,length:chunk.length,cut:chunk.cut,sha256:chunk.sha256});context.guard();if(id!==chunk.sha256)throw new Error('Native blob sink returned a different plaintext ID.');content.push(id);size+=chunk.length;chunks++;await unchanged();}
  await unchanged();if(BigInt(size)!==before.size)throw new Error('Rabin captured size differs from the source.');context.guard();return{size,content,chunks,polynomial,chunking:'Rabin 64-byte window, average20, min512KiB, max8MiB',maximumLiveCaptureBufferBytes:2*MAX+2*READ_BYTES};
 }finally{await handle.close();}
}
