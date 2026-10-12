import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fixtureServer} from './fixture-server.mjs';
import {createDAVActions} from './dav-actions.mjs';
const auth={type:'basic',username:'synthetic-user',password:'synthetic-only-password'};
test('HTTP list/preview/approval/apply/status round trip persists sanitized completion',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-dav-http-')),fixture=await fixtureServer({seed:{'old.txt':'old','extra.txt':'remove'},auth}),records=new Map(),service=createDAVActions(root,{get:async(k,d)=>records.get(k)??d,set:async(k,v)=>records.set(k,structuredClone(v))});
  await fs.mkdir(path.join(root,'source'));await fs.writeFile(path.join(root,'source','old.txt'),'replacement');
  // Independent minimal transport fixture, not the application host implementation.
  const server=http.createServer(async(req,res)=>{try{let bytes=0,body='';for await(const chunk of req){bytes+=chunk.length;if(bytes>128*1024)throw Error('Fixture input bound.');body+=chunk;}const input=JSON.parse(body||'{}'),value=await service.handle(req.url.slice(1),input);res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,value}));}catch(error){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,error:error.message}));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}/`,call=async(action,input={})=>(await fetch(url+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})).json();
  try{const settings={endpoint:fixture.endpoint,auth};assert.equal((await call('webdav-list',settings)).value.entries.length,2);const preview=(await call('webdav-plan',{...settings,source:'source',destination:'',mode:'sync'})).value;assert.equal(preview.counts.remove,1);assert.equal((await call('webdav-apply',{...settings,token:preview.token,allowDeletes:true})).ok,false);const applied=await call('webdav-apply',{...settings,token:preview.token,confirm:true,allowDeletes:true});assert.equal(applied.ok,true);assert.equal(applied.value.status,'completed');assert.ok(!fixture.entries.has('extra.txt'));const status=(await call('webdav-status')).value;assert.equal(status.lastResult.completed.length,2);assert.equal(status.fullProductComplete,false);assert.equal(status.universalSuperiorityEstablished,false);assert.ok(!JSON.stringify([...records]).includes(auth.password));assert.ok(!JSON.stringify([...records]).includes(auth.username));assert.equal((await call('webdav-apply',{...settings,token:preview.token,confirm:true,allowDeletes:true})).ok,false);}finally{service.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await fixture.close();await fs.rm(root,{recursive:true,force:true});}
});
test('status save failure reports completed remote work without retaining credentials',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-dav-store-')),fixture=await fixtureServer({auth}),service=createDAVActions(root,{get:async(k,d)=>d,set:async()=>{throw Error('synthetic persistence outage');}});await fs.mkdir(path.join(root,'source'));await fs.writeFile(path.join(root,'source','new.txt'),'new');
  try{const settings={endpoint:fixture.endpoint,auth},preview=await service.handle('webdav-plan',{...settings,source:'source',destination:'',mode:'copy'});await assert.rejects(service.handle('webdav-apply',{...settings,token:preview.token,confirm:true}),/operations completed.*status record could not be saved/);assert.equal(fixture.entries.get('new.txt').bytes.toString(),'new');}finally{service.close();await fixture.close();await fs.rm(root,{recursive:true,force:true});}
});
