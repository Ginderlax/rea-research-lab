// Source-only real-host regressions; execution belongs to the admitted hosted job.
import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {start} from '../../server.mjs';
import {fixtureServer} from './scripts/webdav-fixture.mjs';
before(()=>{assert.equal(process.platform,'win32');assert.equal(process.version,'v24.16.0');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');});
const auth={type:'basic',username:'owned-download-http-user',password:'owned-download-http-secret'};
function calls(getHost){return async(action,input={},status=200)=>{const host=getHost(),response=await fetch(host.url+'/api/sync/'+action,{method:'POST',headers:{'Content-Type':'application/json','x-rea-token':host.token},body:JSON.stringify(input)}),value=await response.json();assert.equal(response.status,status,JSON.stringify(value));return value.result??value;};}
test('real host requires download approval, retains replaced local bytes and persists result across restart',async()=>{
  const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'rea-dav-download-host-')),fixture=await fixtureServer({seed:{'file.txt':'new','sub/binary.bin':Buffer.from([0,128,255])},auth});let host=await start({port:0,dataDir});const call=calls(()=>host),settings={endpoint:fixture.endpoint,auth},workspace=path.join(dataDir,'sync/workspace');
  try{
    await call('putFile',{path:'incoming/file.txt',content:'old'});await call('putFile',{path:'incoming/extra.txt',content:'keep'});const plan=await call('webdav-download-plan',{...settings,source:'',destination:'incoming',mode:'copy',comparison:{ignoreTimes:true}});
    assert.equal(await fs.readFile(path.join(workspace,'incoming/file.txt'),'utf8'),'old');assert.equal((await fs.readdir(workspace)).includes('.rea-sync-history'),false);await call('webdav-download-apply',{...settings,token:plan.token,confirm:false},400);assert.equal(await fs.readFile(path.join(workspace,'incoming/file.txt'),'utf8'),'old');
    const result=await call('webdav-download-apply',{...settings,token:plan.token,confirm:true});assert.equal(result.status,'completed');assert.equal(result.direction,'webdav-to-local');assert.equal(await fs.readFile(path.join(workspace,'incoming/file.txt'),'utf8'),'new');assert.equal(await fs.readFile(path.join(workspace,'incoming/extra.txt'),'utf8'),'keep');assert.deepEqual(await fs.readFile(path.join(workspace,'incoming/sub/binary.bin')),Buffer.from([0,128,255]));
    const history=path.join(workspace,...result.retainedAt.split('/')),manifest=JSON.parse(await fs.readFile(path.join(history,'manifest.json'),'utf8'));assert.equal(await fs.readFile(path.join(history,manifest.retained[0].file),'utf8'),'old');assert.ok(!JSON.stringify(manifest).includes(auth.password));assert.ok(!JSON.stringify(manifest).includes(auth.username));
    const pending=await call('webdav-download-plan',{...settings,source:'',destination:'another',mode:'copy'});await host.close();host=await start({port:0,dataDir});assert.deepEqual((await call('webdav-status')).lastResult,result);await call('webdav-download-apply',{...settings,token:pending.token,confirm:true},400);assert.equal((await call('webdav-status')).downloadCache.plans,0);assert.equal(fixture.requests.some(r=>['PUT','DELETE','MKCOL','MOVE','COPY','PROPPATCH','LOCK','UNLOCK'].includes(r.method)),false);
  }finally{await host.close();await fixture.close();await fs.rm(dataDir,{recursive:true,force:true});}
});
test('real HTTP download uses shared busy guard and does not queue a second credential request',async()=>{
  const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'rea-dav-download-busy-')),fixture=await fixtureServer({seed:{'file.txt':'new'},auth}),host=await start({port:0,dataDir});let entered,release,timer,pending;const ready=new Promise(resolve=>entered=resolve),call=calls(()=>host);
  fixture.failures.set('PROPFIND ',{once:true,run(req,res){release=()=>{res.writeHead(207,{'Content-Type':'application/xml'});res.end(fixture.xml(['']));};entered();}});
  try{
    pending=call('webdav-download-plan',{endpoint:fixture.endpoint,auth,source:'',destination:'incoming',mode:'copy'});await ready;
    const controller=new AbortController(),response=await Promise.race([fetch(host.url+'/api/sync/webdav-list',{method:'POST',headers:{'Content-Type':'application/json','x-rea-token':host.token},body:JSON.stringify({endpoint:fixture.endpoint,auth}),signal:controller.signal}),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Second request was queued.'));},1200);})]);clearTimeout(timer);assert.equal(response.status,400);assert.match((await response.json()).error,/already running/);assert.equal(fixture.requests.length,1);release();release=null;await pending;
  }finally{clearTimeout(timer);release?.();if(pending)await pending.catch(()=>{});await host.close();await fixture.close();await fs.rm(dataDir,{recursive:true,force:true});}
});
test('HTTP truncation still exposes post-publication partial state and recovery before the long underlying error',async()=>{
  const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'rea-dav-download-partial-')),fixture=await fixtureServer({seed:{'file.txt':'new'}}),host=await start({port:0,dataDir}),call=calls(()=>host),settings={endpoint:fixture.endpoint},utimes=fs.utimes;
  try{
    await call('putFile',{path:'incoming/file.txt',content:'old'});const plan=await call('webdav-download-plan',{...settings,source:'',destination:'incoming',mode:'copy',comparison:{ignoreTimes:true}});fs.utimes=async()=>{throw Error('owned injected post-publication failure '+'.'.repeat(1200));};let failure;
    try{failure=await call('webdav-download-apply',{...settings,token:plan.token,confirm:true},400);}finally{fs.utimes=utimes;}
    assert.ok(failure.error.length<=600);assert.match(failure.error,/download stopped after 0 verified local operations/);assert.match(failure.error,/current local operation may have changed file\.txt/);assert.match(failure.error,/\.rea-sync-history\/dav-download-[a-f0-9]{48}/);
    const status=(await call('webdav-status')).lastResult;assert.equal(status.status,'partial-failure');assert.equal(status.failedOperation.localMayHaveChanged,true);const workspace=path.join(dataDir,'sync/workspace');assert.equal(await fs.readFile(path.join(workspace,'incoming/file.txt'),'utf8'),'new');const history=path.join(workspace,...status.retainedAt.split('/')),manifest=JSON.parse(await fs.readFile(path.join(history,'manifest.json'),'utf8'));assert.equal(await fs.readFile(path.join(history,manifest.retained[0].file),'utf8'),'old');await call('webdav-download-apply',{...settings,token:plan.token,confirm:true},400);
  }finally{fs.utimes=utimes;await host.close();await fixture.close();await fs.rm(dataDir,{recursive:true,force:true});}
});
