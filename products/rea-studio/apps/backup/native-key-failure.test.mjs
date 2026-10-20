import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {syncBuiltinESMExports} from 'node:module';
import {hash} from './restic-crypto.mjs';
import {fixture,secondPassword,keys,files,idle} from './native-key-test-fixture.mjs';

async function intercepted(t,method,wrapper,operation) {
  const real=fs[method];fs[method]=wrapper(real);syncBuiltinESMExports();
  try{return await operation();}finally{fs[method]=real;syncBuiltinESMExports();}
}
const request={newPassword:secondPassword,newPasswordConfirm:secondPassword};

test('new key persistent-read corruption is actually consumed and rolls back only the owned new key',async t=>{
  const f=await fixture(t),before=await files(f.workspace),old=f.initialized.keyID;let hits=0;
  await intercepted(t,'readFile',real=>async(name,...args)=>{const bytes=await real(name,...args);if(path.dirname(name)===f.workspace.resolve('native/keys')&&path.basename(name)!==old&&hits++===0){const changed=Buffer.from(bytes);changed[0]^=1;return changed;}return bytes;},async()=>{await assert.rejects(f.call('nativeKeyAdd',request),/storage SHA-256/);});
  assert.ok(hits>=2,'Persistent verification and exact owned-key rollback must both read the created object');assert.deepEqual(await files(f.workspace),before);assert.equal((await f.call('nativeInfo')).keyID,old);await idle(f.workspace);
});

test('new key verification authenticates the actual unchanged config rather than trusting the pre-write object',async t=>{
  const f=await fixture(t),before=await files(f.workspace),old=f.initialized.keyID;let keyRead=false,configHits=0;
  await intercepted(t,'readFile',real=>async(name,...args)=>{const bytes=await real(name,...args);if(path.dirname(name)===f.workspace.resolve('native/keys')&&path.basename(name)!==old)keyRead=true;if(name===f.workspace.resolve('native/config')&&keyRead&&configHits++===0){const changed=Buffer.from(bytes);changed[16]^=1;return changed;}return bytes;},async()=>{await assert.rejects(f.call('nativeKeyPasswd',{...request,confirm:true}),/configuration bytes changed/);});
  assert.equal(configHits,1);assert.deepEqual(await files(f.workspace),before);assert.equal((await f.call('nativeInfo')).keyID,old);await idle(f.workspace);
});

test('failed new-key commit preserves the existing key and payload and removes owned temporary files',async t=>{
  const f=await fixture(t),before=await files(f.workspace);let hits=0;
  await intercepted(t,'link',real=>async(source,target,...args)=>{if(path.dirname(target)===f.workspace.resolve('native/keys')){hits++;throw Object.assign(new Error('owned new-key link refusal'),{code:'EIO'});}return real(source,target,...args);},async()=>{await assert.rejects(f.call('nativeKeyPasswd',{...request,confirm:true}),/owned new-key link refusal/);});
  assert.equal(hits,1);assert.deepEqual(await files(f.workspace),before);await idle(f.workspace);
});

test('failure to remove the old access key preserves the verified new key and explicitly reports both credentials may work',async t=>{
  const f=await fixture(t),before=await files(f.workspace,{includeKeys:false}),old=f.initialized.keyID;let hits=0,failure;
  await intercepted(t,'unlink',real=>async(name,...args)=>{if(name===f.workspace.resolve(`native/keys/${old}`)){hits++;throw Object.assign(new Error('owned previous-key removal refusal'),{code:'EACCES'});}return real(name,...args);},async()=>{try{await f.call('nativeKeyPasswd',{...request,confirm:true});}catch(error){failure=error;}});
  assert.equal(hits,1);assert.match(failure?.message??'',/New key [a-f0-9]{64} was verified/);assert.match(failure.message,/both credentials may remain usable/);assert.match(failure.message,/owned previous-key removal refusal/);const ids=await keys(f.workspace);assert.equal(ids.length,2);const added=ids.find(id=>id!==old);assert.equal((await f.call('nativeInfo',{password:secondPassword})).keyID,added);assert.equal((await f.call('nativeInfo')).keyID,old);assert.deepEqual(await files(f.workspace,{includeKeys:false}),before);await idle(f.workspace);
});

test('cleanup failure is disclosed with the exact owned new key and does not remove the working original',async t=>{
  const f=await fixture(t),old=f.initialized.keyID,realRead=fs.readFile,realUnlink=fs.unlink;let readHits=0,unlinkHits=0,failure;
  fs.readFile=async(name,...args)=>{const bytes=await realRead(name,...args);if(path.dirname(name)===f.workspace.resolve('native/keys')&&path.basename(name)!==old&&readHits++===0){const changed=Buffer.from(bytes);changed[0]^=1;return changed;}return bytes;};
  fs.unlink=async(name,...args)=>{if(path.dirname(name)===f.workspace.resolve('native/keys')&&path.basename(name)!==old){unlinkHits++;throw Object.assign(new Error('owned rollback removal refusal'),{code:'EACCES'});}return realUnlink(name,...args);};syncBuiltinESMExports();
  try{await f.call('nativeKeyAdd',request);}catch(error){failure=error;}finally{fs.readFile=realRead;fs.unlink=realUnlink;syncBuiltinESMExports();}
  assert.ok(readHits>=2);assert.equal(unlinkHits,1);assert.match(failure?.message??'',/Cleanup requires attention/);assert.equal(failure.cleanupWarnings.length,1);assert.equal(failure.cleanupWarnings[0].scope,'unverified-new-key');assert.match(failure.cleanupWarnings[0].path,/^keys\/[a-f0-9]{64}$/);assert.equal((await keys(f.workspace)).length,2);assert.equal((await f.call('nativeInfo')).keyID,old);await idle(f.workspace);
});

test('existing two-minute deadline still aborts persistent-key verification and reports unresolved owned cleanup',async t=>{
  const f=await fixture(t),old=f.initialized.keyID,realRead=fs.readFile,realNow=Date.now;let expired=false,hits=0,failure;
  Date.now=()=>realNow()+(expired?120001:0);fs.readFile=async(name,...args)=>{const bytes=await realRead(name,...args);if(path.dirname(name)===f.workspace.resolve('native/keys')&&path.basename(name)!==old){expired=true;hits++;}return bytes;};syncBuiltinESMExports();
  try{await f.call('nativeKeyPasswd',{...request,confirm:true});}catch(error){failure=error;}finally{Date.now=realNow;fs.readFile=realRead;syncBuiltinESMExports();}
  assert.equal(hits,1);assert.match(failure?.message??'',/exceeded two minutes/);assert.ok(failure.cleanupWarnings.some(row=>row.scope==='unverified-new-key'));assert.equal((await f.call('nativeInfo')).keyID,old);assert.equal((await keys(f.workspace)).length,2);await idle(f.workspace);
});

test('a config read failure after completed key deletion explicitly discloses the irreversible partial state',async t=>{
  const f=await fixture(t),added=await f.call('nativeKeyAdd',request),realRead=fs.readFile,realUnlink=fs.unlink;let removed=false,configHits=0,failure;
  fs.unlink=async(name,...args)=>{const result=await realUnlink(name,...args);if(name===f.workspace.resolve(`native/keys/${added.keyID}`))removed=true;return result;};
  fs.readFile=async(name,...args)=>{if(removed&&name===f.workspace.resolve('native/config')){configHits++;throw Object.assign(new Error('owned post-removal config read refusal'),{code:'EIO'});}return realRead(name,...args);};syncBuiltinESMExports();
  try{await f.call('nativeKeyRemove',{keyID:added.keyID,confirm:true});}catch(error){failure=error;}finally{fs.readFile=realRead;fs.unlink=realUnlink;syncBuiltinESMExports();}
  assert.equal(removed,true);assert.equal(configHits,1);assert.ok(failure?.message.startsWith(`Restic key ${added.keyID} was removed. Post-removal verification did not complete;`));assert.match(failure.message,/owned post-removal config read refusal/);assert.equal(failure.removedKeyID,added.keyID);assert.equal(failure.currentKeyID,f.initialized.keyID);assert.equal(failure.keyRemoved,true);assert.equal(failure.postRemovalVerified,false);assert.deepEqual(await keys(f.workspace),[f.initialized.keyID]);assert.equal((await f.call('nativeInfo')).keyID,f.initialized.keyID);await idle(f.workspace);
});

test('deadline expiry after completed key deletion does not misreport that key as still present',async t=>{
  const f=await fixture(t),added=await f.call('nativeKeyAdd',request),realUnlink=fs.unlink,realNow=Date.now;let removed=false,failure;
  Date.now=()=>realNow()+(removed?120001:0);fs.unlink=async(name,...args)=>{const result=await realUnlink(name,...args);if(name===f.workspace.resolve(`native/keys/${added.keyID}`))removed=true;return result;};syncBuiltinESMExports();
  try{await f.call('nativeKeyRemove',{keyID:added.keyID,confirm:true});}catch(error){failure=error;}finally{Date.now=realNow;fs.unlink=realUnlink;syncBuiltinESMExports();}
  assert.equal(removed,true);assert.ok(failure?.message.startsWith(`Restic key ${added.keyID} was removed.`));assert.match(failure.message,/Post-removal verification did not complete/);assert.match(failure.message,/exceeded two minutes/);assert.equal(failure.keyRemoved,true);assert.equal(failure.postRemovalVerified,false);assert.deepEqual(await keys(f.workspace),[f.initialized.keyID]);await idle(f.workspace);
});

test('repair-friendly scan does not hide read-stability guards',async t=>{
  const f=await fixture(t),old=f.initialized.keyID,realRead=fs.readFile;let hits=0;
  await intercepted(t,'readFile',real=>async(name,...args)=>{const bytes=await real(name,...args);if(name===f.workspace.resolve(`native/keys/${old}`)){hits++;return Buffer.concat([bytes,Buffer.from(' ')]);}return bytes;},async()=>{await assert.rejects(f.call('nativeKeyList'),/changed while being read/);});assert.equal(hits,1);assert.equal(fs.readFile,realRead);await idle(f.workspace);
});

test('repair-friendly scan still rejects excessive scrypt parameters rather than treating them as another password',async t=>{
  const f=await fixture(t),old=f.initialized.keyID,document=JSON.parse(await fs.readFile(f.workspace.resolve(`native/keys/${old}`),'utf8'));document.N=2**30;const bytes=Buffer.from(JSON.stringify(document)),keyID=hash(bytes);await fs.writeFile(f.workspace.resolve(`native/keys/${keyID}`),bytes,{flag:'wx'});await fs.unlink(f.workspace.resolve(`native/keys/${old}`));const before=await files(f.workspace);
  await assert.rejects(f.call('nativeKeyList'),/excessive restic scrypt/);assert.deepEqual(await files(f.workspace),before);await idle(f.workspace);
});
