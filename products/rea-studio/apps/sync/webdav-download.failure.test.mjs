// Hosted-only meaningful mutation failures; no local execution has occurred.
import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createDAVDownload} from './dav-download.mjs';
import {createDAVActions} from './dav-actions.mjs';
import {fixtureServer} from './scripts/webdav-fixture.mjs';
before(()=>{assert.equal(process.platform,'win32');assert.equal(process.version,'v24.16.0');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');});
test('second rename failure exposes first verified publication and recoverable old bytes without rollback claims',async()=>{
  const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'rea-dav-download-fault-'))),fixture=await fixtureServer({seed:{'a.txt':'new-a','b.txt':'new-b'}}),service=createDAVDownload(root),settings={endpoint:fixture.endpoint};const rename=fs.rename;
  try{await fs.mkdir(path.join(root,'target'));await fs.writeFile(path.join(root,'target/a.txt'),'old-a');await fs.writeFile(path.join(root,'target/b.txt'),'old-b');const plan=await service.preview({...settings,source:'',destination:'target',mode:'copy',comparison:{ignoreTimes:true}});let hits=0;
    fs.rename=async(from,to)=>{if(String(from).endsWith('.stage')&&++hits===2)throw Object.assign(Error('synthetic second publication failure'),{code:'EIO'});return rename(from,to);};
    let failure;try{await service.apply({...settings,token:plan.token});assert.fail('Expected rename failure');}catch(error){failure=error;}finally{fs.rename=rename;}
    assert.equal(hits,2);assert.equal(failure.planConsumed,true);assert.deepEqual(failure.completed.map(x=>x.path),['a.txt']);assert.equal(failure.failedOperation.path,'b.txt');assert.equal(failure.failedOperation.localMayHaveChanged,true);assert.equal(await fs.readFile(path.join(root,'target/a.txt'),'utf8'),'new-a');assert.equal(await fs.readFile(path.join(root,'target/b.txt'),'utf8'),'old-b');
    const history=path.join(root,...failure.retainedAt.split('/')),manifest=JSON.parse(await fs.readFile(path.join(history,'manifest.json'),'utf8'));assert.deepEqual(manifest.completed.map(x=>x.path),['a.txt']);for(const item of manifest.retained)assert.equal(await fs.readFile(path.join(history,item.file),'utf8'),'old-'+item.path[0]);await assert.rejects(service.apply({...settings,token:plan.token}),/consumed/);
  }finally{fs.rename=rename;service.close();await fixture.close();await fs.rm(root,{recursive:true,force:true});}
});
test('failure after publication reports target may already have changed and preserves exact preimage',async()=>{
  const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'rea-dav-download-post-'))),fixture=await fixtureServer({seed:{'file.txt':'new'}}),service=createDAVDownload(root),settings={endpoint:fixture.endpoint};const utimes=fs.utimes;
  try{await fs.mkdir(path.join(root,'target'));await fs.writeFile(path.join(root,'target/file.txt'),'old');const plan=await service.preview({...settings,source:'',destination:'target',mode:'copy',comparison:{ignoreTimes:true}});fs.utimes=async()=>{throw Error('synthetic timestamp failure after publication');};let failure;try{await service.apply({...settings,token:plan.token});assert.fail('Expected failure');}catch(error){failure=error;}finally{fs.utimes=utimes;}
    assert.equal(failure.completed.length,0);assert.equal(failure.failedOperation.localMayHaveChanged,true);assert.equal(await fs.readFile(path.join(root,'target/file.txt'),'utf8'),'new');const folder=path.join(root,...failure.retainedAt.split('/')),manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));assert.equal(await fs.readFile(path.join(folder,manifest.retained[0].file),'utf8'),'old');
  }finally{fs.utimes=utimes;service.close();await fixture.close();await fs.rm(root,{recursive:true,force:true});}
});
test('status persistence outage reports completed local work and persists no credential inputs',async()=>{
  const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'rea-dav-download-store-'))),auth={type:'basic',username:'owned-user',password:'owned-synthetic-secret'},fixture=await fixtureServer({seed:{'file.txt':'new'},auth});let attempted;
  const service=createDAVActions(root,{get:async(k,d)=>d,set:async(k,v)=>{attempted=structuredClone(v);throw Error('synthetic store outage');}});
  try{const settings={endpoint:fixture.endpoint,auth},plan=await service.handle('webdav-download-plan',{...settings,source:'',destination:'target',mode:'copy'});await assert.rejects(service.handle('webdav-download-apply',{...settings,token:plan.token,confirm:true}),/download completed.*status record could not be saved/);assert.equal(await fs.readFile(path.join(root,'target/file.txt'),'utf8'),'new');assert.equal(attempted.status,'completed');assert.ok(!JSON.stringify(attempted).includes(auth.password));assert.ok(!JSON.stringify(attempted).includes(auth.username));}finally{service.close();await fixture.close();await fs.rm(root,{recursive:true,force:true});}
});
