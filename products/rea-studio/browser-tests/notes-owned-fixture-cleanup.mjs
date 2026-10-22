// Prospective lifecycle-only ownership helper. Never changes a product assertion.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
assert.equal(process.platform,'win32');assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');
assert.equal(process.env.GITHUB_REF,'refs/heads/experiment/notes-open-todos-first-20261021-r2');
const same=(a,b)=>a.toLowerCase()===b.toLowerCase();
assert.equal(process.env.GITHUB_JOB,'draft-recovery-real-chromium');
for(const key of ['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT'])assert(/^[1-9][0-9]*$/.test(process.env[key]));
async function fixedRoot(){const temporary=await fs.realpath(process.env.RUNNER_TEMP);return path.join(temporary,'rea-notes-order-browser-data-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT);}
const identity=s=>({dev:s.dev,ino:s.ino,birthtimeNs:s.birthtimeNs});
async function directory(p){const s=await fs.lstat(p,{bigint:true});assert(s.isDirectory()&&!s.isSymbolicLink());assert(same(await fs.realpath(p),p));return identity(s);}
export async function captureOwnedFixture(root,input,prefix){
  assert(['storage-','notes-new-todo-case-'].includes(prefix));const base=path.resolve(root),target=path.resolve(input);
  assert(same(base,await fixedRoot()));assert(same(path.dirname(target),base));assert(path.basename(target).startsWith(prefix));assert(path.basename(target).length>prefix.length);
  return{root:base,target,prefix,rootID:await directory(base),targetID:await directory(target)};
}
export async function removeOwnedFixture(owner,closed){
  assert(same(owner.root,await fixedRoot()));assert.equal(closed.contextClosed,true);assert.equal(closed.hostClosed,true);assert(same(path.dirname(owner.target),owner.root));assert(path.basename(owner.target).startsWith(owner.prefix));
  assert.deepEqual(await directory(owner.root),owner.rootID);assert.deepEqual(await directory(owner.target),owner.targetID);
  let files=0,bytes=0,directories=0;
  async function inspect(at,depth){assert(depth<=32);const relative=path.relative(owner.target,at);assert(!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep));const entries=await fs.readdir(at,{withFileTypes:true});
    for(const entry of entries){const item=path.join(at,entry.name),s=await fs.lstat(item,{bigint:true});assert(!s.isSymbolicLink());if(s.isDirectory()){assert(++directories<=512);await inspect(item,depth+1);}else{assert(s.isFile()&&s.nlink===1n);assert(++files<=4096);bytes+=Number(s.size);assert(bytes<=32*1024*1024);}}
  }
  await inspect(owner.target,0);assert.deepEqual(await directory(owner.root),owner.rootID);assert.deepEqual(await directory(owner.target),owner.targetID);
  // The exact resolved direct child and both identities were checked immediately
  // above; contexts and the owned host have already completed their close calls.
  await fs.rm(owner.target,{recursive:true,force:false});await assert.rejects(fs.lstat(owner.target),{code:'ENOENT'});
  return{schema:'rea-notes-owned-fixture-directory-removal/v1',ownerPrefix:owner.prefix,directChildOfOwnedRoot:true,contextCloseObserved:true,hostCloseObserved:true,identity:{dev:String(owner.targetID.dev),ino:String(owner.targetID.ino),birthtimeNs:String(owner.targetID.birthtimeNs)},files,bytes,directories,removed:true};
}
