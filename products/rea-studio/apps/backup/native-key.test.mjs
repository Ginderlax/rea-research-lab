import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {hash,password,passwordKey,seal,open,masterKey,masterJSON,base64} from './restic-crypto.mjs';
import {fixture,accessPassword,secondPassword,replacementPassword,keys,files,idle,cloneKey} from './native-key-test-fixture.mjs';

test('native key list exposes full IDs, safe metadata and exactly the key used by this request',async t=>{
  const f=await fixture(t),result=await f.call('nativeKeyList');
  assert.equal(result.currentKeyID,f.initialized.keyID);assert.equal(result.keys.length,1);
  assert.deepEqual(Object.keys(result.keys[0]).sort(),['created','current','hostName','id','userName']);assert.equal(result.keys[0].current,true);assert.equal(result.keys[0].userName,'rea-studio');assert.ok(Date.parse(result.keys[0].created));
  assert.equal(/salt|encrypt|newPassword|synthetic-key/.test(JSON.stringify(result)),false);await idle(f.workspace);
});

test('native key add verifies the persisted same master and keeps snapshots, config, indexes and packs byte exact',async t=>{
  const f=await fixture(t);await fs.mkdir(f.workspace.resolve('source'));await fs.writeFile(f.workspace.resolve('source/雪.bin'),Buffer.from([0,128,255,7]));const saved=await f.call('nativeSnapshot',{source:'source'}),before=await files(f.workspace,{includeKeys:false}),oldKeys=await keys(f.workspace);
  const added=await f.call('nativeKeyAdd',{newPassword:secondPassword,newPasswordConfirm:secondPassword,username:'Synthetic User 雪',hostname:'synthetic-host'});
  assert.equal(added.previousKeyID,f.initialized.keyID);assert.notEqual(added.keyID,added.previousKeyID);assert.equal(added.oldKeyRemoved,false);assert.equal(added.newKeyVerified,true);assert.equal(added.masterKeyPreserved,true);assert.equal(added.configUnchanged,true);assert.equal(added.key.userName,'Synthetic User 雪');assert.equal(added.key.hostName,'synthetic-host');assert.equal(added.key.current,true);
  const after=await files(f.workspace,{includeKeys:false});assert.deepEqual(after,before);assert.deepEqual(await keys(f.workspace),[...oldKeys,added.keyID].sort());
  const current=await f.call('nativeKeyList',{password:secondPassword});assert.deepEqual(current.keys.filter(k=>k.current).map(k=>k.id),[added.keyID]);assert.deepEqual((await f.call('nativeKeyList')).keys.filter(k=>k.current).map(k=>k.id),[f.initialized.keyID]);assert.equal((await f.call('nativeCheck',{id:saved.id,password:secondPassword})).verified,true);
  const oldDoc=JSON.parse(await fs.readFile(f.workspace.resolve(`native/keys/${f.initialized.keyID}`),'utf8')),newDoc=JSON.parse(await fs.readFile(f.workspace.resolve(`native/keys/${added.keyID}`),'utf8'));
  assert.notEqual(newDoc.salt,oldDoc.salt);assert.notEqual(newDoc.data,oldDoc.data);
  const a=masterKey(JSON.parse(open(await passwordKey(oldDoc,accessPassword),base64(oldDoc.data)))),b=masterKey(JSON.parse(open(await passwordKey(newDoc,secondPassword),base64(newDoc.data))));assert.deepEqual(masterJSON(a),masterJSON(b));await idle(f.workspace);
});

test('native password change removes only the request access key after validation and preserves every other credential',async t=>{
  const f=await fixture(t),other=await f.call('nativeKeyAdd',{newPassword:secondPassword,newPasswordConfirm:secondPassword}),before=await files(f.workspace,{includeKeys:false});
  await assert.rejects(f.call('nativeKeyPasswd',{newPassword:replacementPassword,newPasswordConfirm:replacementPassword}),/confirmation/);
  const changed=await f.call('nativeKeyPasswd',{newPassword:replacementPassword,newPasswordConfirm:replacementPassword,confirm:true});
  assert.equal(changed.oldKeyRemoved,true);assert.equal(changed.previousKeyID,f.initialized.keyID);assert.equal(changed.newKeyVerified,true);assert.deepEqual(await keys(f.workspace),[other.keyID,changed.keyID].sort());assert.deepEqual(await files(f.workspace,{includeKeys:false}),before);
  await assert.rejects(f.call('nativeInfo'),/authentication failed/);assert.equal((await f.call('nativeInfo',{password:replacementPassword})).keyID,changed.keyID);assert.equal((await f.call('nativeInfo',{password:secondPassword})).keyID,other.keyID);await idle(f.workspace);
});

test('native key removal accepts a unique prefix while active, malformed and unknown IDs cannot mutate keys',async t=>{
  const f=await fixture(t),added=await f.call('nativeKeyAdd',{newPassword:secondPassword,newPasswordConfirm:secondPassword}),before=await files(f.workspace);
  await assert.rejects(f.call('nativeKeyRemove',{keyID:added.keyID}),/confirmation/);
  await assert.rejects(f.call('nativeKeyRemove',{keyID:f.initialized.keyID,confirm:true}),/currently used/);
  for(const keyID of ['', '../keys/a','A'.repeat(64),'g','0'.repeat(65)])await assert.rejects(f.call('nativeKeyRemove',{keyID,confirm:true}),/lowercase hexadecimal/);
  let missing='f'.repeat(64);if((await keys(f.workspace)).includes(missing))missing='e'.repeat(64);await assert.rejects(f.call('nativeKeyRemove',{keyID:missing,confirm:true}),/No restic key/);assert.deepEqual(await files(f.workspace),before);
  let prefix=added.keyID.slice(0,1);while(f.initialized.keyID.startsWith(prefix))prefix=added.keyID.slice(0,prefix.length+1);
  const removed=await f.call('nativeKeyRemove',{keyID:prefix,confirm:true});assert.equal(removed.removedKeyID,added.keyID);assert.equal(removed.currentKeyID,f.initialized.keyID);assert.equal(removed.remainingKeys,1);await assert.rejects(f.call('nativeInfo',{password:secondPassword}),/authentication failed/);assert.equal((await f.call('nativeInfo')).keyID,f.initialized.keyID);await idle(f.workspace);
});

test('ambiguous prefixes reject actual multiple content-addressed keys without removing any key',async t=>{
  const f=await fixture(t),prefix=f.initialized.keyID[0];let collision;
  for(let n=0;n<4096;n++){const id=await cloneKey(f.workspace,f.initialized.keyID,n);if(id.startsWith(prefix)){collision=id;break;}await fs.unlink(f.workspace.resolve(`native/keys/${id}`));}
  assert.ok(collision,'Owned SHA fixture must genuinely share the selected prefix');const before=await files(f.workspace);await assert.rejects(f.call('nativeKeyRemove',{keyID:prefix,confirm:true}),/ambiguous/);assert.deepEqual(await files(f.workspace),before);assert.equal((await keys(f.workspace)).length,2);await idle(f.workspace);
});

test('new key input guards reject mismatches, oversized metadata, wrong credentials and nonboolean flags without publication',async t=>{
  const f=await fixture(t),before=await files(f.workspace);
  for(const input of [
    {newPassword:secondPassword,newPasswordConfirm:'different'},
    {newPassword:'',newPasswordConfirm:''},
    {newPassword:'x'.repeat(1025),newPasswordConfirm:'x'.repeat(1025)},
    {newPassword:secondPassword,newPasswordConfirm:secondPassword,username:'x'.repeat(1025)},
    {newPassword:secondPassword,newPasswordConfirm:secondPassword,hostname:42},
    {newPassword:secondPassword,newPasswordConfirm:secondPassword,newInsecureNoPassword:'true'},
    {newPassword:secondPassword,newPasswordConfirm:secondPassword,newInsecureNoPassword:true},
    {newPassword:secondPassword,newPasswordConfirm:secondPassword,password:'wrong'},
    {newPassword:secondPassword,newPasswordConfirm:secondPassword,insecureNoPassword:true}
  ]) {await assert.rejects(f.call('nativeKeyAdd',input),/password|key (?:user|host)|authentication/);assert.deepEqual(await files(f.workspace),before);await idle(f.workspace);}
});

test('the existing sixteen-key and two-minute policies are retained for add and password replacement',async t=>{
  const f=await fixture(t);for(let n=0;n<15;n++)await cloneKey(f.workspace,f.initialized.keyID,n);const before=await files(f.workspace);assert.equal((await keys(f.workspace)).length,16);
  for(const action of ['nativeKeyAdd','nativeKeyPasswd'])await assert.rejects(f.call(action,{newPassword:secondPassword,newPasswordConfirm:secondPassword,confirm:true}),/already has 16 keys/);
  assert.deepEqual(await files(f.workspace),before);await idle(f.workspace);
});

test('explicit insecure empty keys require opt-in at creation and every access and never discard a supplied nonempty password',async t=>{
  assert.throws(()=>password(''),/nonempty/);assert.equal(password('',{insecureNoPassword:true}),'');assert.throws(()=>password(accessPassword,{insecureNoPassword:true}),/empty password field/);for(const value of [null,0,1,'true'])assert.throws(()=>password('',{insecureNoPassword:value}),/boolean/);
  const f=await fixture(t),empty=await f.call('nativeKeyAdd',{newPassword:'',newPasswordConfirm:'',newInsecureNoPassword:true});assert.equal(empty.insecureEmptyPassword,true);assert.equal((await f.call('nativeInfo',{password:'',insecureNoPassword:true})).keyID,empty.keyID);await assert.rejects(f.call('nativeInfo',{password:''}),/nonempty/);await assert.rejects(f.call('nativeInfo',{password:accessPassword,insecureNoPassword:true}),/empty password field/);
  const changed=await f.call('nativeKeyPasswd',{password:'',insecureNoPassword:true,newPassword:replacementPassword,newPasswordConfirm:replacementPassword,confirm:true});assert.equal(changed.previousKeyID,empty.keyID);assert.equal((await f.call('nativeInfo',{password:replacementPassword})).keyID,changed.keyID);await assert.rejects(f.call('nativeInfo',{password:'',insecureNoPassword:true}),/authentication failed/);assert.equal((await f.call('nativeInfo')).keyID,f.initialized.keyID);await idle(f.workspace);
});

test('an explicitly empty initial repository can gain a password key without changing its config',async t=>{
  const f=await fixture(t,{password:'',insecureNoPassword:true,version:1}),before=await files(f.workspace,{includeKeys:false}),added=await f.call('nativeKeyAdd',{newPassword:secondPassword,newPasswordConfirm:secondPassword});assert.equal(added.newKeyVerified,true);assert.equal((await f.call('nativeInfo',{password:secondPassword,insecureNoPassword:false})).keyID,added.keyID);assert.deepEqual(await files(f.workspace,{includeKeys:false}),before);await idle(f.workspace);
});

test('key list uses Go zero values for omitted or null display metadata',async t=>{
  for(const mode of ['omitted','null'])await t.test(mode,async t=>{
    const f=await fixture(t),old=f.initialized.keyID,document=JSON.parse(await fs.readFile(f.workspace.resolve(`native/keys/${old}`),'utf8'));
    for(const name of ['created','username','hostname']){if(mode==='omitted')delete document[name];else document[name]=null;}
    const bytes=Buffer.from(JSON.stringify(document)),keyID=hash(bytes);await fs.writeFile(f.workspace.resolve(`native/keys/${keyID}`),bytes,{flag:'wx'});await fs.unlink(f.workspace.resolve(`native/keys/${old}`));
    const listed=await f.call('nativeKeyList');assert.equal(listed.currentKeyID,keyID);assert.deepEqual(listed.keyWarnings,[]);assert.deepEqual(listed.keys,[{current:true,id:keyID,userName:'',hostName:'',created:'0001-01-01T00:00:00Z'}]);await idle(f.workspace);
  });
});

test('invalid display metadata does not block add, password replacement or removal of another key',async t=>{
  const f=await fixture(t),old=f.initialized.keyID,document=JSON.parse(await fs.readFile(f.workspace.resolve(`native/keys/${old}`),'utf8'));document.username=42;
  const bytes=Buffer.from(JSON.stringify(document)),damagedID=hash(bytes);await fs.writeFile(f.workspace.resolve(`native/keys/${damagedID}`),bytes,{flag:'wx'});await fs.unlink(f.workspace.resolve(`native/keys/${old}`));
  const before=await files(f.workspace,{includeKeys:false}),added=await f.call('nativeKeyAdd',{newPassword:secondPassword,newPasswordConfirm:secondPassword});
  const listed=await f.call('nativeKeyList',{password:secondPassword});assert.deepEqual(listed.keys.map(row=>row.id),[added.keyID]);assert.equal(listed.keyWarnings.length,1);assert.equal(listed.keyWarnings[0].id,damagedID);assert.match(listed.keyWarnings[0].message,/key metadata/);
  const changed=await f.call('nativeKeyPasswd',{password:secondPassword,newPassword:replacementPassword,newPasswordConfirm:replacementPassword,confirm:true});assert.equal(changed.previousKeyID,added.keyID);assert.deepEqual(await fs.readFile(f.workspace.resolve(`native/keys/${damagedID}`)),bytes);
  const removed=await f.call('nativeKeyRemove',{password:replacementPassword,keyID:damagedID,confirm:true});assert.equal(removed.removedKeyID,damagedID);assert.equal(removed.keyRemoved,true);assert.equal(removed.postRemovalVerified,true);assert.deepEqual(await keys(f.workspace),[changed.keyID]);assert.deepEqual(await files(f.workspace,{includeKeys:false}),before);await idle(f.workspace);
});

test('a hash-damaged opaque key sorting before the active credential is warned, preserved and explicitly removable',async t=>{
  const f=await fixture(t),damagedID='0'.repeat(64),bytes=Buffer.from('{owned damaged key');assert.ok(damagedID<f.initialized.keyID);assert.notEqual(hash(bytes),damagedID);await fs.writeFile(f.workspace.resolve(`native/keys/${damagedID}`),bytes,{flag:'wx'});
  const before=await files(f.workspace,{includeKeys:false}),listed=await f.call('nativeKeyList');assert.equal(listed.currentKeyID,f.initialized.keyID);assert.equal(listed.keys.length,1);assert.equal(listed.keyWarnings[0].id,damagedID);assert.match(listed.keyWarnings[0].message,/storage SHA-256/);
  const added=await f.call('nativeKeyAdd',{newPassword:secondPassword,newPasswordConfirm:secondPassword});assert.deepEqual(await fs.readFile(f.workspace.resolve(`native/keys/${damagedID}`)),bytes);assert.equal((await f.call('nativeInfo',{password:secondPassword})).keyID,added.keyID);
  const removed=await f.call('nativeKeyRemove',{keyID:damagedID,confirm:true});assert.equal(removed.removedKeyID,damagedID);assert.equal(removed.remainingKeys,2);assert.deepEqual(await files(f.workspace,{includeKeys:false}),before);await idle(f.workspace);
});

test('repair-friendly credential scanning still rejects oversized key files before trying a later active key',async t=>{
  const f=await fixture(t),damagedID='0'.repeat(64);assert.ok(damagedID<f.initialized.keyID);await fs.writeFile(f.workspace.resolve(`native/keys/${damagedID}`),Buffer.alloc(64*1024+1),{flag:'wx'});const before=await files(f.workspace);
  await assert.rejects(f.call('nativeKeyList'),/size limit|regular file/);assert.deepEqual(await files(f.workspace),before);await idle(f.workspace);
});

test('malformed key JSON is a sanitized display warning and can be removed without disclosing its contents',async t=>{
  const f=await fixture(t),marker='owned-invalid-json-wrapped-data-marker',bytes=Buffer.from(`{"data":"${marker}",`),damagedID=hash(bytes);await fs.writeFile(f.workspace.resolve(`native/keys/${damagedID}`),bytes,{flag:'wx'});
  const listed=await f.call('nativeKeyList');assert.equal(listed.currentKeyID,f.initialized.keyID);assert.deepEqual(listed.keyWarnings,[{id:damagedID,message:'Invalid restic key JSON.'}]);assert.equal(JSON.stringify(listed).includes(marker),false);assert.equal((await f.call('nativeKeyRemove',{keyID:damagedID,confirm:true})).keyRemoved,true);await idle(f.workspace);
});
