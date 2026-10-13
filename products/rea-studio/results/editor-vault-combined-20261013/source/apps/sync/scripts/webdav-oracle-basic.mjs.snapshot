import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createOracle,digest} from './oracle.mjs';
import {fixtureServer} from './webdav-fixture.mjs';
import {createWebDAV} from '../webdav.mjs';
const root = await fs.mkdtemp(path.join(os.tmpdir(),'rea-dav-oracle-'));
const auth = {username:'synthetic-user',password:'synthetic-only-password'};
const seed = {'hello.txt':'hello','folder/space name.txt':'space','empty':null,'binary.bin':Buffer.from([0,255,128,1])};
const fixture = await fixtureServer({seed,auth});
try {
  const oracle = await createOracle(root), secret = (await oracle.run(['obscure',auth.password])).stdout.trim();
  const flags = ['--webdav-url',fixture.endpoint,'--webdav-vendor','other','--webdav-user',auth.username,'--webdav-pass',secret,'--retries','1','--low-level-retries','1'];
  const run = args => oracle.run([...args,...flags]);
  const client = createWebDAV({endpoint:fixture.endpoint,auth:{type:'basic',...auth}}), comparisons = [];
  const list = JSON.parse((await run(['lsjson',':webdav:','--recursive'])).stdout).map(item => ({path:item.Path,type:item.IsDir?'directory':'file',size:item.IsDir?0:item.Size})).sort((a,b)=>a.path.localeCompare(b.path));
  const native = []; for (const item of await client.list()) { native.push(item); if(item.type==='directory') native.push(...await client.list(item.path)); }
  assert.deepEqual(native.map(({path,type,size})=>({path,type,size})).sort((a,b)=>a.path.localeCompare(b.path)),list); comparisons.push('recursive-list');
  await run(['copyto',':webdav:binary.bin',path.join(root,'download.bin')]); assert.deepEqual(await client.read('binary.bin'),await fs.readFile(path.join(root,'download.bin'))); comparisons.push('binary-read');
  const payload = Buffer.from([1,0,42,255]); await fs.writeFile(path.join(root,'upload.bin'),payload);
  await run(['mkdir',':webdav:new']); await run(['copyto',path.join(root,'upload.bin'),':webdav:new/upload.bin']); const expected = fixture.snapshot();
  fixture.reset(); await client.mkdir('new'); await client.write('new/upload.bin',payload); assert.deepEqual(fixture.snapshot(),expected); comparisons.push('mkdir-binary-write');
  await run(['deletefile',':webdav:new/upload.bin']); await run(['rmdir',':webdav:new']); const removed = fixture.snapshot();
  fixture.reset({...seed,'new/upload.bin':payload}); await client.remove('new/upload.bin',{expected:await client.stat('new/upload.bin')}); await client.remove('new',{collection:true,expected:await client.stat('new',{collection:true})}); assert.deepEqual(fixture.snapshot(),removed); comparisons.push('file-and-empty-collection-delete');
  client.close();
  const receipt = {schemaVersion:1,scope:'Independent authenticated synthetic generic WebDAV primitive behavior; not vendor/auth/server parity.',original:{version:oracle.version,zipSHA256:oracle.zipSHA256,executableSHA256:oracle.originalSHA256,sourceCommit:oracle.sourceCommit,executions:oracle.executions},comparisons,comparisonCount:comparisons.length,sourceSHA256:Object.fromEntries(await Promise.all(['dav-xml.mjs','webdav.mjs','scripts/webdav-fixture.mjs','scripts/webdav-oracle-basic.mjs'].map(async file=>[file,digest(await fs.readFile(new URL(file.startsWith('scripts/') ? file.slice(8) : '../'+file,import.meta.url)))])))};
  await fs.writeFile(new URL('../results/webdav-primitive-verification.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n'); console.log(JSON.stringify(receipt,null,2));
} finally { await fixture.close(); await fs.rm(root,{recursive:true,force:true}); }
