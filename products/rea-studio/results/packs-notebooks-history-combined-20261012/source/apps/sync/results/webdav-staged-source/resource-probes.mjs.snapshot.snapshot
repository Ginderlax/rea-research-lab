import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {fixtureServer} from './fixture-server.mjs';
import {createDAVTransfer} from './dav-transfer.mjs';
import {davLimits} from './webdav.mjs';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-dav-resources-')),fixture=await fixtureServer(),source=path.join(root,'source'),engine=createDAVTransfer(root),input={endpoint:fixture.endpoint,source:'source',destination:'',mode:'copy'},results=[],digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function measured(name,action){const start=performance.now(),value=await action();results.push({name,milliseconds:performance.now()-start,...value});}
try{
  await fs.mkdir(source);await fs.writeFile(path.join(source,'maximum.bin'),Buffer.alloc(davLimits.file,42));
  await measured('64 MiB local-to-WebDAV preview-and-verified-upload',async()=>{const preview=await engine.preview(input),applied=await engine.apply({endpoint:fixture.endpoint,token:preview.token});assert.equal(fixture.entries.get('maximum.bin').bytes.length,davLimits.file);assert.equal(applied.completed.length,1);return {accepted:true,bytes:davLimits.file,networkRequests:fixture.requests.length};});
  await fs.truncate(path.join(source,'maximum.bin'),davLimits.file+1);fixture.requests.length=0;
  await measured('64 MiB plus one local source byte rejects before network',async()=>{await assert.rejects(engine.preview(input),/bounded regular file/);assert.equal(fixture.requests.length,0);return {rejected:true,bytes:davLimits.file+1,networkRequests:0};});
  await fs.unlink(path.join(source,'maximum.bin'));fixture.reset();
  for(let start=0;start<10001;start+=32)await Promise.all(Array.from({length:Math.min(32,10001-start)},(_,i)=>fs.writeFile(path.join(source,`file-${String(start+i).padStart(5,'0')}.txt`),'')));
  await measured('10001 streaming local entries reject before network',async()=>{await assert.rejects(engine.preview(input),/bounded inventory/);assert.equal(fixture.requests.length,0);return {rejected:true,entries:10001,networkRequests:0};});
  const receipt={schemaVersion:1,scope:'Native-only bounded synthetic loopback resource observations, including the fixture server in the same Node process. These are not original-vs-native performance or RSS superiority comparisons.',runtime:process.version,platform:process.platform,results,maxRSSKiB:process.resourceUsage().maxRSS,sourceSHA256:Object.fromEntries(await Promise.all(['webdav.mjs','dav-transfer.mjs','dav-input.mjs','dav-comparison.mjs','dav-xml.mjs','fixture-server.mjs','resource-probes.mjs'].map(async file=>[file,digest(await fs.readFile(new URL(file,import.meta.url)))])))};await fs.writeFile(new URL('resource-receipt.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
}finally{engine.close();await fixture.close();await fs.rm(root,{recursive:true,force:true});}
