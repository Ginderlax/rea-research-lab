// Prospective source-only proof verification; no application/original execution.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const hash = b => createHash('sha256').update(b).digest('hex');
export function safeRelative(value) {
  assert.equal(typeof value,'string');
  assert.ok(value.length>0 && value.length<4096 && !/[\\:\0]/.test(value));
  assert.ok(!value.startsWith('/') && !value.endsWith('/'));
  assert.ok(value.split('/').every(p=>p && p!=='.' && p!=='..'));
  return value;
}
export function authenticateBytes(bytes,row) {
  assert.ok(Buffer.isBuffer(bytes));
  assert.ok(Number.isSafeInteger(row.bytes) && row.bytes>=0);
  assert.match(row.sha256,/^[0-9a-f]{64}$/);
  assert.equal(bytes.length,row.bytes,row.path);
  assert.equal(hash(bytes),row.sha256,row.path);
}
export function validateDataset(data) {
  assert.equal(data.schema,'rea-sketch-layout-prospective-public-proof/v1');
  assert.equal(data.prospectiveOnly,true);
  assert.equal(data.appBehaviorExecuted,false);
  assert.equal(data.downloadFileAccepted,false);
  assert.equal(data.originalGUIExecuted,false);
  assert.equal(data.aliases.length,832);
  assert.equal(data.current.length,10);
  assert.equal(data.prefixes.length,7);
  const names=new Set();
  for(const r of [...data.aliases,...data.current]) {
    safeRelative(r.path);
    assert.ok(!names.has(r.path),'Duplicate proof path');names.add(r.path);
    assert.ok(Number.isSafeInteger(r.bytes)&&r.bytes>=0);assert.match(r.sha256,/^[0-9a-f]{64}$/);
  }
  const counts=[278,112,189,82,75,44,52];
  for(let i=0;i<data.prefixes.length;i++) {
    const prefix=safeRelative(data.prefixes[i].path);
    const rows=data.aliases.filter(r=>r.path.startsWith(prefix+'/'));
    assert.equal(rows.length,counts[i]);assert.equal(data.prefixes[i].files,counts[i]);
    assert.ok(rows.every(r=>r.path.endsWith('.snapshot')));
    assert.equal(rows.length,new Set(rows.map(r=>r.path)).size);
  }
  assert.equal(data.prefixes.reduce((n,r)=>n+r.files,0),832);
  return data;
}
export async function verifyDataset(data,{read,list}) {
  validateDataset(data);
  for(const r of [...data.aliases,...data.current]) authenticateBytes(await read(r.path),r);
  for(const r of data.prefixes) {
    const wanted=data.aliases.filter(a=>a.path.startsWith(r.path+'/')).map(a=>a.path).sort();
    const actual=(await list(r.path)).map(safeRelative).sort();
    assert.deepEqual(actual,wanted,'Strict alias prefix '+r.path);
  }
  return {aliasFiles:832,currentFiles:10,strictPrefixes:7,sourceOnly:true,
    behaviorExecuted:false,downloadFileAccepted:false,fullParity:false,performanceAccepted:false};
}
export function filesystemReader(repo) {
  const root=path.resolve(repo);
  async function resolveFile(relative) {
    safeRelative(relative);let current=root;
    assert.equal((await fs.lstat(root)).isSymbolicLink(),false);
    for(const part of relative.split('/')) {current=path.join(current,part);assert.equal((await fs.lstat(current)).isSymbolicLink(),false);}
    assert.ok(current.startsWith(root+path.sep));return current;
  }
  async function list(prefix) {
    const start=await resolveFile(prefix),out=[];
    async function walk(dir,p){for(const e of await fs.readdir(dir,{withFileTypes:true})){assert.equal(e.isSymbolicLink(),false);const q=p+'/'+e.name;if(e.isDirectory())await walk(path.join(dir,e.name),q);else{assert.ok(e.isFile());out.push(q);}}}
    await walk(start,prefix);return out;
  }
  return {read:async p=>fs.readFile(await resolveFile(p)),list};
}
