import test,{after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
import {importKdbx} from './kdbx.mjs';import {applyEntrySave,listEntryHistory,readEntryHistory} from './history.mjs';import {here,temp,original,observations,pass,observationsDirectory} from './harness.mjs';
const key=Buffer.alloc(32,23);
after(async()=>{await fs.mkdir(observationsDirectory,{recursive:true});await fs.writeFile(path.join(observationsDirectory,'history-unknown-time.json'),JSON.stringify({observations,originalProcessExecutions:observations.length},null,2));console.log('REA_KEEPASS_HISTORY_UNKNOWN '+JSON.stringify({originalProcessExecutions:observations.length,detail:path.join(observationsDirectory,'history-unknown-time.json')}))});
test('released unknown-time family is oldest rather than a future UTC date; boundary and two-unknown ties match',async t=>{
 const dir=await temp(t),seed=path.join(dir,'seed.kdbx');await original(dir,{mode:'create',database:seed,maxItems:2,maxSize:-1});const baseline=await importKdbx(await fs.readFile(seed),{password:pass});
 for(const timestamp of ['2999-12-28T23:59:59Z','2999-12-27T23:59:59Z','2999-12-29T23:59:59Z','2999-12-28T07:59:59Z','2999-12-28T07:58:59Z','2999-12-27T22:59:59Z','2999-12-28T07:59:58Z']){
   const operations=[{action:'save',fields:{Password:'sentinel current'},now:timestamp},{action:'save',fields:{Password:'after sentinel'},now:'2024-01-04T00:00:00Z'}];let data=baseline;
   for(const op of operations)data=applyEntrySave(data,data.entries[0],{...data.entries[0],password:op.fields.Password,updatedAt:op.now});
   const expected=await original(dir,{mode:'read',database:seed,operations}),list=listEntryHistory(data,data.entries[0].id,key);const actual=list.revisions.map(row=>readEntryHistory(data,data.entries[0].id,row.index,row.revision,key).entry.password);assert.deepEqual(actual,expected.history.map(e=>e.fields.Password.value),timestamp);
 }
 const operations=[{action:'save',fields:{Password:'unknown first'},now:'2999-12-29T23:59:59Z'},{action:'save',fields:{Password:'unknown second'},now:'2999-12-27T23:59:59Z'},{action:'save',fields:{Password:'after both'},now:'2024-01-04T00:00:00Z'}];let data=baseline;
 for(const op of operations)data=applyEntrySave(data,data.entries[0],{...data.entries[0],password:op.fields.Password,updatedAt:op.now});const expected=await original(dir,{mode:'read',database:seed,operations}),list=listEntryHistory(data,data.entries[0].id,key);assert.deepEqual(list.revisions.map(row=>readEntryHistory(data,data.entries[0].id,row.index,row.revision,key).entry.password),expected.history.map(e=>e.fields.Password.value));
});
