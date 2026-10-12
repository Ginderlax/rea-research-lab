import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import { createHash } from 'node:crypto';
import { zstdDecompressSync } from 'node:zlib';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createWorkspace } from '../../lib/storage.mjs';
import { handleNative } from './restic.mjs';
import { MODES, encodeBlob, encodeMetadata, compressionMode } from './restic-compression.mjs';
import { hash } from './restic-crypto.mjs';
const exec = promisify(execFile);
const artifacts = fileURLToPath(new URL('../../../../projects/09-restic/artifacts/',import.meta.url));
const executable = path.join(artifacts,'unpacked/restic_0.19.1_windows_amd64.exe');
const password = 'synthetic-compressed-backup-stage-only';
const fixtureBytes = length => Buffer.concat(Array.from({length:Math.ceil(length/32)},(_,counter)=>createHash('sha256').update('rea-restic-compression-fixture:'+counter).digest())).subarray(0,length);
test('source-selected mode/version/blob contracts and independent native decoding', () => {
 const inputs=[Buffer.alloc(0),Buffer.from('x'),Buffer.from('repeat — λ\n'.repeat(5000)),fixtureBytes(65536)];
 for(const mode of Object.keys(MODES)) for(const version of [1,2]) for(const type of ['data','tree']) for(const bytes of inputs){
  const result=encodeBlob(bytes,type,version,mode),expected=version===2&&bytes.length>0&&(mode!=='off'||type!=='data');
  assert.equal(Boolean(result.uncompressedLength),Boolean(expected));
  assert.deepEqual(expected?zstdDecompressSync(result.bytes):result.bytes,bytes);
  if(expected) assert.equal(result.bytes[4]&4,0,'Checksum flag is disabled');
 }
 for(const version of [1,2]) for(const mode of Object.keys(MODES)){
  const bytes=Buffer.from('{"synthetic":"metadata"}'),encoded=encodeMetadata(bytes,version,mode);
  assert.deepEqual(version===2?zstdDecompressSync(encoded.subarray(1)):encoded,bytes);
  if(version===2)assert.equal(encoded[0],2);
 }
});
test('unsupported modes, types, versions and excessive inputs reject',()=>{
 for(const value of ['__proto__','fast',null,{},1])assert.throws(()=>compressionMode(value));
 assert.throws(()=>encodeBlob(Buffer.from('x'),'unknown',2));
 assert.throws(()=>encodeBlob(Buffer.from('x'),'data',3));
 assert.throws(()=>encodeBlob(Buffer.alloc(16*1024*1024+1),'data',2));
 assert.throws(()=>encodeMetadata('not bytes',1));
 assert.throws(()=>encodeMetadata(Buffer.from('{}'),1,'invalid'));
});
for(const [version,mode] of [[1,'max'],...[...Object.keys(MODES)].map(mode=>[2,mode])])test(`original restic check/read/restore accepts candidate v${version} ${mode} writing`,async t=>{
 assert.equal(hash(await fs.readFile(executable)),'b0dd1fd21eea5d8fe1325f55f7118213c21f36de8a261e04c0624a5ab9fd7830');
 assert.equal(hash(await fs.readFile(path.join(artifacts,'restic_0.19.1_windows_amd64.zip'))),'da948ad707ed690426473aaba2046cd61f8f90f6f0e7dab6be0d5796531de67d');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-compression-next-'));
 t.after(async()=>{assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('rea-compression-next-'));await fs.rm(root,{recursive:true,force:true});});
 const workspace=await createWorkspace(path.join(root,'workspace')),input={repository:'repository',password,compression:mode};
 await handleNative({action:'nativeInit',input:{...input,version},workspace});
 await fs.mkdir(workspace.resolve('source/nested'),{recursive:true});
 const fixtures={'repeat.txt':Buffer.from('compressed tree/data fixture — λ\n'.repeat(3000)),'random.bin':fixtureBytes(65536),'empty.txt':Buffer.alloc(0),'nested/雪.txt':Buffer.from('Unicode structure')};
 for(const [name,bytes]of Object.entries(fixtures))await fs.writeFile(workspace.resolve(`source/${name}`),bytes);
 const snapshot=await handleNative({action:'nativeSnapshot',input:{...input,source:'source'},workspace});
 const options={env:{...process.env,RESTIC_PASSWORD:password,RESTIC_REPOSITORY:'',RESTIC_PASSWORD_FILE:'',RESTIC_PASSWORD_COMMAND:''},timeout:60000,windowsHide:true};
 const original=(...args)=>exec(executable,['--no-cache','-r',workspace.resolve('repository'),...args],options);
 const indexNames=await fs.readdir(workspace.resolve('repository/index'));
 const index=JSON.parse((await original('cat','index',indexNames[0])).stdout);
 const blobs=index.packs.flatMap(pack=>pack.blobs);
 assert.ok(blobs.some(blob=>blob.type==='tree'));
 for(const blob of blobs)assert.equal(Boolean(blob.uncompressed_length),version===2&&(mode!=='off'||blob.type!=='data'));
 await original('check','--read-data');
 const restored=path.join(root,'original-restored');await original('restore',snapshot.id,'--target',restored);
 for(const [name,bytes]of Object.entries(fixtures))assert.deepEqual(await fs.readFile(path.join(restored,'source',name)),bytes);
 const candidate=await handleNative({action:'nativeCheck',input:{...input,id:snapshot.id},workspace});assert.equal(candidate.verified,true);
 t.diagnostic(JSON.stringify({version,mode,blobs:blobs.map(blob=>({type:blob.type,length:blob.length,uncompressedLength:blob.uncompressed_length??0})),fixtureFiles:Object.entries(fixtures).map(([name,bytes])=>({name,bytes:bytes.length,sha256:hash(bytes)}))}));
});
