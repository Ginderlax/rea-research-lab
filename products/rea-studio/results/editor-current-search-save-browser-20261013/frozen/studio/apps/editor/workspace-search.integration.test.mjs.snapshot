import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {start}from'../../server.mjs';
test('saved-file workspace search works through authenticated HTTP and survives an actual host restart',async t=>{
 const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'rea-search-http-'));let host=await start({port:0,dataDir});t.after(async()=>{await host.close();assert.equal(path.dirname(dataDir),path.resolve(os.tmpdir()));assert.ok(path.basename(dataDir).startsWith('rea-search-http-'));await fs.rm(dataDir,{recursive:true,force:true});});
 const call=async(action,input)=>{const response=await fetch(`${host.url}/api/editor/${action}`,{method:'POST',headers:{'content-type':'application/json','x-rea-token':host.token},body:JSON.stringify(input)});const data=await response.json();assert.equal(response.status,200,data.error);return data.result;};
 const saved=await call('save',{path:'src/example.txt',content:'Search 🧪\r\nSEARCH 🧪\n',revision:null});const before=await call('search',{query:'search',matchCase:false});assert.deepEqual(before.matches.map(row=>[row.path,row.line,row.column,row.revision]),[['src/example.txt',1,1,saved.revision],['src/example.txt',2,1,saved.revision]]);
 await host.close();host=await start({port:0,dataDir});const after=await call('search',{query:'search',matchCase:false});assert.deepEqual(after.matches,before.matches);assert.equal((await call('read',{path:saved.path})).content,saved.content);
 const denied=await fetch(`${host.url}/api/editor/search`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'Search'})});assert.equal(denied.status,403);
 const invalid=await fetch(`${host.url}/api/editor/search`,{method:'POST',headers:{'content-type':'application/json','x-rea-token':host.token},body:JSON.stringify({query:'a\nb'})});assert.equal(invalid.status,400);assert.equal((await fetch(`${host.url}/apps/editor/client.mjs`)).status,200);
 console.log(JSON.stringify({editorSearchHTTP:{actualHostProcesses:0,actualInProcessHostInstances:2,restarts:1,source:'saved-files',originalGUIComparisons:0}}));
});
