// Authored regressions only; execute after review in the admitted hosted job.
import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {createDAVDownload,downloadLimits} from './dav-download.mjs';
import {fixtureServer} from './scripts/webdav-fixture.mjs';
before(()=>{assert.equal(process.platform,'win32');assert.equal(process.version,'v24.16.0');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');});
const auth={type:'basic',username:'owned-download-user',password:'synthetic-download-password'},sha=b=>createHash('sha256').update(b).digest('hex');
async function owned(seed,run,{clock}={}){
  const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'rea-dav-download-'))),remote=await fixtureServer({seed,auth}),service=createDAVDownload(root,clock?{clock}:{}),settings={endpoint:remote.endpoint,auth};
  try{return await run({root,remote,service,settings,preview:extra=>service.preview({...settings,source:'',destination:'target',mode:'copy',...extra})});}
  finally{service.close();await remote.close();await fs.rm(root,{recursive:true,force:true});}
}
async function file(root,name,bytes){await fs.mkdir(path.dirname(path.join(root,name)),{recursive:true});await fs.writeFile(path.join(root,name),bytes);}
function readOnlyRemote(remote){assert.equal(remote.requests.some(r=>['PUT','DELETE','MKCOL','MOVE','COPY','PROPPATCH','LOCK','UNLOCK'].includes(r.method)),false);for(const request of remote.requests.filter(r=>r.method==='GET'))assert.match(request.ifMatch,/^"/);}
test('download preview writes nothing and apply copies binary/UTF8/nested bytes, keeps extras and ignores empty folders',()=>owned({'sub/雪.bin':Buffer.from([0,1,127,128,255]),'zero.bin':Buffer.alloc(0),'empty':null},async({root,remote,service,settings,preview})=>{
  await file(root,'target/extra.txt','keep');const snapshot=remote.snapshot(),before=await fs.readdir(root),plan=await preview();
  assert.deepEqual(await fs.readdir(root),before);assert.equal((await fs.readdir(path.join(root,'target'))).length,1);assert.equal(plan.direction,'webdav-to-local');assert.equal(plan.counts.copy,2);assert.equal(plan.counts.replace,0);assert.ok(!plan.operations.some(op=>op.path==='empty'));
  const result=await service.apply({...settings,token:plan.token});assert.equal(result.applied,true);assert.deepEqual(await fs.readFile(path.join(root,'target/sub/雪.bin')),Buffer.from([0,1,127,128,255]));assert.equal((await fs.readFile(path.join(root,'target/zero.bin'))).length,0);assert.equal(await fs.readFile(path.join(root,'target/extra.txt'),'utf8'),'keep');assert.equal(Math.trunc((await fs.stat(path.join(root,'target/sub/雪.bin'))).mtimeMs),Date.parse('2026-10-01T00:00:00Z'));assert.deepEqual(remote.snapshot(),snapshot);readOnlyRemote(remote);await assert.rejects(service.apply({...settings,token:plan.token}),/consumed/);
}));
test('replacement preimages and manifest are verified and contain no credentials',()=>owned({'replace.txt':'new'},async({root,service,settings,preview})=>{
  await file(root,'target/replace.txt','old');const plan=await preview({comparison:{ignoreTimes:true}});assert.equal(plan.counts.replace,1);const result=await service.apply({...settings,token:plan.token}),history=path.join(root,...result.retainedAt.split('/')),manifest=JSON.parse(await fs.readFile(path.join(history,'manifest.json'),'utf8'));
  assert.equal(await fs.readFile(path.join(root,'target/replace.txt'),'utf8'),'new');assert.equal(manifest.retained.length,1);assert.equal(manifest.retained[0].path,'replace.txt');const old=await fs.readFile(path.join(history,manifest.retained[0].file));assert.equal(old.toString(),'old');assert.equal(sha(old),manifest.retained[0].sha256);assert.deepEqual(manifest.completed,result.completed);const text=JSON.stringify({plan,result,manifest});assert.ok(!text.includes(auth.password));assert.ok(!text.includes(auth.username));
}));
test('generic equal-size decisions disclose unequal safety hashes and filters do not remove extras',()=>owned({'same.txt':'new','skip.tmp':'omit','private/x.txt':'private'},async({root,service,settings,preview,remote})=>{
  await file(root,'target/same.txt','old');await file(root,'target/local-only.txt','keep');const plan=await preview({filters:{exclude:['*.tmp','/private/**']}});assert.equal(plan.counts.copy,0);assert.ok(plan.skipped.some(x=>x.path==='same.txt'&&x.byteHashesEqual===false&&x.reason==='generic-webdav-size-equal'));await service.apply({...settings,token:plan.token});assert.equal(await fs.readFile(path.join(root,'target/same.txt'),'utf8'),'old');assert.equal(await fs.readFile(path.join(root,'target/local-only.txt'),'utf8'),'keep');assert.equal((await fs.readdir(root)).includes('.rea-sync-history'),false);readOnlyRemote(remote);
}));
test('missing local target is created only on approval and empty remote source remains a no-op',()=>owned({'a/b.txt':'new'},async({root,service,settings,preview})=>{
  const plan=await preview({destination:'missing/nested'});await assert.rejects(fs.stat(path.join(root,'missing')),/ENOENT/);await service.apply({...settings,token:plan.token});assert.equal(await fs.readFile(path.join(root,'missing/nested/a/b.txt'),'utf8'),'new');
}));
test('empty source does not create an absent local destination',()=>owned({'empty':null},async({root,service,settings,preview})=>{const plan=await preview();assert.equal(plan.operations.length,0);await service.apply({...settings,token:plan.token});assert.deepEqual(await fs.readdir(root),[]);}));
test('full remote and local inventory changes refuse before staging or target writes',async()=>{
  for(const kind of ['remote','local'])await owned({'source.txt':'new'},async({root,remote,service,settings,preview})=>{
    await file(root,'target/extra.txt','keep');const plan=await preview();if(kind==='remote')remote.put('unselected.tmp','changed');else await file(root,'target/extra.txt','changed');await assert.rejects(service.apply({...settings,token:plan.token}),/stale/);assert.equal((await fs.readdir(root)).includes('.rea-sync-history'),false);await assert.rejects(fs.stat(path.join(root,'target/source.txt')),/ENOENT/);readOnlyRemote(remote);
  });
});
test('endpoint and principal binding reject changes and failed authentication does not consume a no-write plan',()=>owned({'new.txt':'new'},async({root,remote,service,settings,preview})=>{
  const plan=await preview(),count=remote.requests.length;await assert.rejects(service.apply({...settings,auth:{...auth,username:'other'},token:plan.token}),/principal/);assert.equal(remote.requests.length,count);await assert.rejects(service.apply({...settings,endpoint:remote.endpoint+'different/',token:plan.token}),/endpoint/);await assert.rejects(service.apply({...settings,auth:{...auth,password:'wrong'},token:plan.token}),/HTTP 401/);assert.deepEqual(await fs.readdir(root),[]);await service.apply({...settings,token:plan.token});assert.equal(await fs.readFile(path.join(root,'target/new.txt'),'utf8'),'new');
}));
test('preview is expiring, replaced by a newer preview and disposed on close',async()=>{
  let now=0;await owned({'new.txt':'new'},async({service,settings,preview})=>{const old=await preview(),current=await preview();assert.equal(service.cache().plans,1);await assert.rejects(service.apply({...settings,token:old.token}),/consumed/);now=downloadLimits.expiresMilliseconds+1;await assert.rejects(service.apply({...settings,token:current.token}),/expired/);const latest=await preview();service.close();await assert.rejects(service.apply({...settings,token:latest.token}),/closed/);},{clock:()=>now});
});
test('ordinary workspace root replacement at the same path is refused before any local apply work',async()=>{
  const parent=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'rea-dav-download-root-'))),root=path.join(parent,'workspace'),original=path.join(parent,'original-workspace');await fs.mkdir(root);
  const remote=await fixtureServer({seed:{'file.txt':'new'}}),service=createDAVDownload(root),settings={endpoint:remote.endpoint};let swapped=false;
  try{
    const plan=await service.preview({...settings,source:'',destination:'missing-target',mode:'copy'});assert.deepEqual(await fs.readdir(root),[]);
    await fs.rename(root,original);swapped=true;await fs.mkdir(root);
    await assert.rejects(service.apply({...settings,token:plan.token}),/Workspace canonical root changed/);
    assert.deepEqual(await fs.readdir(root),[]);assert.deepEqual(await fs.readdir(original),[]);assert.equal(service.cache().plans,1);readOnlyRemote(remote);
  }finally{
    service.close();await remote.close();
    if(swapped){await fs.rm(root,{recursive:true,force:true});await fs.rename(original,root);}
    await fs.rm(parent,{recursive:true,force:true});
  }
});
test('copy-only input rejects unsupported options and dangerous roots instead of ignoring them',()=>owned({'new.txt':'new'},async({preview})=>{
  for(const extra of [{mode:'sync'},{createEmptySrcDirs:true},{allowDeletes:true},{vendor:'nextcloud'},{destination:''},{destination:'../outside'},{destination:'.rea-sync-history/x'},{comparison:{modifyWindowNs:'0'}},{filters:{minAge:'1h'}}])await assert.rejects(preview(extra),/copy only|Unsupported|bounded canonical|portable|recovery|filter option|comparison option/);
}));
test('remote case aliases, target type collisions and local hardlinks are refused',async()=>{
  await owned({'A.txt':'a','a.txt':'b'},async({preview})=>{await assert.rejects(preview(),/case or Unicode/);});
  await owned({'folder/file.txt':'x'},async({root,preview})=>{await file(root,'target/folder','file');await assert.rejects(preview(),/file\/directory/);});
  await owned({'file.txt':'x'},async({root,preview})=>{await file(root,'target/file.txt','old');await fs.link(path.join(root,'target/file.txt'),path.join(root,'another-link'));await assert.rejects(preview(),/one link/);});
});
test('conditional staging failure consumes plan but leaves destination bytes unchanged',()=>owned({'file.txt':'new'},async({root,remote,service,settings,preview})=>{
  await file(root,'target/file.txt','old');const plan=await preview({comparison:{ignoreTimes:true}});let reads=0;remote.failures.set('GET file.txt',{run(req,res){if(++reads===1){res.writeHead(200,{'Content-Length':3});res.end('new');}else{res.writeHead(412);res.end();}}});
  let failure;try{await service.apply({...settings,token:plan.token});assert.fail('Expected staging failure');}catch(error){failure=error;}assert.match(failure.message,/HTTP 412/);assert.equal(failure.planConsumed,true);assert.deepEqual(failure.completed,[]);assert.equal(failure.failedOperation.localMayHaveChanged,false);assert.equal(await fs.readFile(path.join(root,'target/file.txt'),'utf8'),'old');await assert.rejects(service.apply({...settings,token:plan.token}),/consumed/);readOnlyRemote(remote);
}));
test('shared client rejects interrupted or size-mismatched remote reads before local writes',async()=>{
  for(const kind of ['truncated','oversized'])await owned({'file.txt':'new'},async({root,remote,service,settings,preview})=>{
    const plan=await preview();remote.failures.set('GET file.txt',{run(req,res){res.writeHead(200,kind==='truncated'?{'Content-Length':3}:{});res.end(kind==='truncated'?'n':'oversized');}});await assert.rejects(service.apply({...settings,token:plan.token}),/interrupted|aborted|length/);assert.deepEqual(await fs.readdir(root),[]);readOnlyRemote(remote);
  });
});
