import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createWorkspace} from '../../lib/storage.mjs';
import {handle} from './server.mjs';
import {hash} from './restic-crypto.mjs';

export const accessPassword = 'synthetic-key-access-2026';
export const secondPassword = 'synthetic-key-second-2026';
export const replacementPassword = 'synthetic-key-replacement-2026';
export async function fixture(t,{password=accessPassword,insecureNoPassword=false,version=2}={}) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-native-keys-'));
  t.after(async()=>{assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('rea-native-keys-'));await fs.rm(root,{recursive:true,force:true});});
  const workspace=await createWorkspace(path.join(root,'workspace'));
  const call=(action,input={})=>handle({action,input:{repository:'native',password,insecureNoPassword,...input},workspace});
  const initialized=await call('nativeInit',{version});
  return {root,workspace,call,initialized};
}
export async function keys(workspace) { return (await fs.readdir(workspace.resolve('native/keys'))).sort(); }
export async function files(workspace,{includeKeys=true}={}) {
  const output={};
  async function walk(relative) {
    for(const child of await fs.readdir(workspace.resolve(relative),{withFileTypes:true})) {
      const name=`${relative}/${child.name}`;
      if(child.isDirectory()){if(!['native/locks','native/tmp'].includes(name)&&(!includeKeys&&name==='native/keys'?false:true))await walk(name);}
      else {assert.equal(child.isFile(),true);output[name]=hash(await fs.readFile(workspace.resolve(name)));}
    }
  }
  await walk('native');return output;
}
export async function idle(workspace) { for(const directory of ['locks','tmp'])assert.deepEqual(await fs.readdir(workspace.resolve(`native/${directory}`)),[]); }
export async function cloneKey(workspace,keyID,suffix) {
  const document=JSON.parse(await fs.readFile(workspace.resolve(`native/keys/${keyID}`),'utf8'));
  document.username=`owned-key-fixture-${suffix}`;
  const bytes=Buffer.from(JSON.stringify(document)),id=hash(bytes);
  await fs.writeFile(workspace.resolve(`native/keys/${id}`),bytes,{flag:'wx'});return id;
}
