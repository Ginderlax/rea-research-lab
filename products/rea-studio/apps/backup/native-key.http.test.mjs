import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {syncBuiltinESMExports} from 'node:module';
import {start} from '../../server.mjs';
import {hash} from './restic-crypto.mjs';

test('real HTTP key lifecycle persists across restart while private request passwords never enter responses or saved app metadata',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-native-key-http-')),dataDir=path.join(root,'data');let host=await start({port:0,dataDir});
  t.after(async()=>{if(host)await host.close();assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('rea-native-key-http-'));await fs.rm(root,{recursive:true,force:true});});
  const first='synthetic-http-key-first-2026',second='synthetic-http-key-second-2026',third='synthetic-http-key-third-2026';let access=first;
  async function call(action,input={},status=200,token=host.token){const response=await fetch(`${host.url}/api/backup/${action}`,{method:'POST',headers:{'content-type':'application/json','x-rea-token':token},body:JSON.stringify({repository:'native',password:access,...input})});const body=await response.json();assert.equal(response.status,status,JSON.stringify(body));for(const secret of [first,second,third])assert.equal(JSON.stringify(body).includes(secret),false);return body.result??body;}
  const init=await call('nativeInit',{version:2});await call('putFile',{path:'source/hello.txt',content:'HTTP key restore fixture'});const snapshot=await call('nativeSnapshot',{source:'source'});const config=await fs.readFile(path.join(dataDir,'backup/workspace/native/config'));
  await call('nativeKeyAdd',{newPassword:second,newPasswordConfirm:second,username:'HTTP synthetic',hostname:'HTTP owned'});await host.close();host=null;host=await start({port:0,dataDir});access=second;
  const listed=await call('nativeKeyList');assert.equal(listed.keys.length,2);const other=listed.keys.find(k=>k.current);assert.ok(other);assert.notEqual(other.id,init.keyID);const changed=await call('nativeKeyPasswd',{newPassword:third,newPasswordConfirm:third,confirm:true});assert.equal(changed.previousKeyID,other.id);assert.equal(changed.oldKeyRemoved,true);
  await call('nativeInfo',{},400);access=third;assert.equal((await call('nativeCheck',{id:snapshot.id})).verified,true);await call('nativeRestore',{id:snapshot.id,destination:'restored',confirm:true});assert.equal(await fs.readFile(path.join(dataDir,'backup/workspace/restored/source/hello.txt'),'utf8'),'HTTP key restore fixture');
  await call('nativeKeyRemove',{keyID:init.keyID,confirm:true});assert.equal((await call('nativeKeyList')).keys.length,1);assert.deepEqual(await fs.readFile(path.join(dataDir,'backup/workspace/native/config')),config);
  const keyNames=await fs.readdir(path.join(dataDir,'backup/workspace/native/keys'));assert.deepEqual(keyNames,[changed.keyID]);const keyBytes=await fs.readFile(path.join(dataDir,'backup/workspace/native/keys',changed.keyID));assert.equal(hash(keyBytes),changed.keyID);for(const secret of [first,second,third])assert.equal(keyBytes.includes(Buffer.from(secret)),false);
  const before=hash(keyBytes);await call('nativeKeyRemove',{keyID:changed.keyID,confirm:true},403,'wrong-token');assert.equal(hash(await fs.readFile(path.join(dataDir,'backup/workspace/native/keys',changed.keyID))),before);
});

test('real HTTP requires explicit empty-password flags and rejects invalid requests without changing native key objects',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-native-key-http-'));let host=await start({port:0,dataDir:root});t.after(async()=>{if(host)await host.close();assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('rea-native-key-http-'));await fs.rm(root,{recursive:true,force:true});});
  async function call(action,input,status){const response=await fetch(`${host.url}/api/backup/${action}`,{method:'POST',headers:{'content-type':'application/json','x-rea-token':host.token},body:JSON.stringify({repository:'native',...input})});const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));return result.result??result;}
  await call('nativeInit',{password:''},400);const initialized=await call('nativeInit',{password:'',insecureNoPassword:true,version:1},200);const keyRoot=path.join(root,'backup/workspace/native/keys');assert.equal((await call('nativeKeyList',{password:'',insecureNoPassword:true},200)).currentKeyID,initialized.keyID);
  for(const input of [{password:''},{password:'',insecureNoPassword:'true'},{password:'not discarded',insecureNoPassword:true}])await call('nativeKeyList',input,400);
  await call('nativeKeyAdd',{password:'',insecureNoPassword:true,newPassword:'',newPasswordConfirm:''},400);assert.deepEqual(await fs.readdir(keyRoot),[initialized.keyID]);await call('nativeKeyRemove',{password:'',insecureNoPassword:true,keyID:initialized.keyID,confirm:true},400);assert.deepEqual(await fs.readdir(keyRoot),[initialized.keyID]);
});

test('real HTTP preserves the completed-deletion disclosure when post-removal verification fails',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-native-key-http-'));let host=await start({port:0,dataDir:root});t.after(async()=>{if(host)await host.close();assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('rea-native-key-http-'));await fs.rm(root,{recursive:true,force:true});});
  const password='synthetic-http-partial-removal';async function call(action,input={},status=200){const response=await fetch(`${host.url}/api/backup/${action}`,{method:'POST',headers:{'content-type':'application/json','x-rea-token':host.token},body:JSON.stringify({repository:'native',password,...input})});const body=await response.json();assert.equal(response.status,status,JSON.stringify(body));assert.equal(JSON.stringify(body).includes(password),false);return body.result??body;}
  const initialized=await call('nativeInit'),added=await call('nativeKeyAdd',{newPassword:'synthetic-http-unused-key',newPasswordConfirm:'synthetic-http-unused-key'}),selected=path.join(root,'backup/workspace/native/keys',added.keyID),config=path.join(root,'backup/workspace/native/config'),realRead=fs.readFile,realUnlink=fs.unlink;let removed=false,body;
  fs.unlink=async(name,...args)=>{const result=await realUnlink(name,...args);if(name===selected)removed=true;return result;};fs.readFile=async(name,...args)=>{if(removed&&name===config)throw Object.assign(new Error('owned HTTP post-removal config refusal'),{code:'EIO'});return realRead(name,...args);};syncBuiltinESMExports();
  try{body=await call('nativeKeyRemove',{keyID:added.keyID,confirm:true},400);}finally{fs.readFile=realRead;fs.unlink=realUnlink;syncBuiltinESMExports();}
  assert.equal(removed,true);assert.ok(body.error.startsWith(`Restic key ${added.keyID} was removed. Post-removal verification did not complete;`));assert.match(body.error,/owned HTTP post-removal config refusal/);assert.ok(body.error.length<=600);await assert.rejects(fs.access(selected),{code:'ENOENT'});assert.equal((await call('nativeKeyList')).currentKeyID,initialized.keyID);
});
