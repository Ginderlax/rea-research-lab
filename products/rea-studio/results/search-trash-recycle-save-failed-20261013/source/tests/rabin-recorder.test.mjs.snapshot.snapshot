import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve,basename} from 'node:path';
import {collect} from '../scripts/read-rabin-tap.mjs';
const study=new URL('../apps/backup/results/rabin-recorder-review/review/',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
const oldBytes=await fs.readFile(new URL('baseline/recorder/decoder.mjs.snapshot',study));
assert.equal(hash(oldBytes),'e87af08715677ce3d663837ef12275627311b2d0dd2844ae38c8d96782e6fe39');
const old=await import('data:text/javascript;base64,'+oldBytes.toString('base64'));
const labels=['rabinBoundaryOriginalObservations','rabinSnapshotOriginalObservations','rabinLifecycleObservations','rabinDeadlineObservations'];
for(const name of ['first47','latest47','final47'])test('recorder reconstructs four retained '+name+' observations without rerunning Backup',async()=>{
 const raw=await fs.readFile(new URL(name==='final47'?'baseline/final47/rabin-integration.stdout.txt':'baseline/raw/'+name+'.stdout.txt',study),'utf8');
 for(const label of labels)assert.deepEqual(collect(raw,label),old.readRabinObservation(raw,label));
});
const expected={path:'C:\\fixture\\#file.txt',stdout:'line1\nline2\tend',unicode:'é測試',literal:'\\#',quotes:'"quoted"',payload:'a'.repeat(90000)};
test('recorder decodes the retained actual Node logger escapes and 90KiB split message',async()=>{
 const raw=await fs.readFile(new URL('synthetic-marker.stdout.txt',study),'utf8');assert.deepEqual(collect(raw,'syntheticRabinObservation'),expected);assert.throws(()=>old.readRabinObservation(raw,'syntheticRabinObservation'),/Bad escaped character/);
});
const value={path:'C:\\test\\#name',controls:'\n\t\r\u0000',literal:'\\#',unicode:'測試',quote:'"'},plain=JSON.stringify({syntheticRabinObservation:value}),encoded=plain.replaceAll('\\','\\\\').replaceAll('#','\\#'),prefixLength='{"syntheticRabinObservation":'.length;
test('recorder reconstructs every split position across escape pairs',()=>{for(let n=prefixLength;n<encoded.length;n++)assert.deepEqual(collect('# '+encoded.slice(0,n)+'\n# '+encoded.slice(n)+'\n','syntheticRabinObservation'),value);});
test('recorder rejects truncated interrupted duplicate and mislabeled observations',()=>{assert.throws(()=>collect('# '+encoded.slice(0,-3),'syntheticRabinObservation'));assert.throws(()=>collect('# '+encoded.slice(0,40)+'\nnot ok 1\n# '+encoded.slice(40),'syntheticRabinObservation'));assert.throws(()=>collect('# '+encoded+'\n# '+encoded,'syntheticRabinObservation'),/Exactly one/);assert.throws(()=>collect('# '+encoded,'otherLabel'),/Exactly one/);});
test('recorder bounds message allocation and comment fragments',()=>{assert.throws(()=>collect('# {"syntheticRabinObservation":"'+'x'.repeat(1024*1024)+'"}\n','syntheticRabinObservation'),/bound/);assert.throws(()=>collect('# {"syntheticRabinObservation":"\n'+Array(4097).fill('# x').join('\n')+'\n# "}','syntheticRabinObservation'),/Incomplete/);});
test('current Node process produces a compatible actual escaped and chunked TAP message',async()=>{
 const folder=await fs.mkdtemp(join(tmpdir(),'rea-rabin-recorder-')),bytes=await fs.readFile(new URL('marker-fixture.test.mjs.snapshot',study));
 assert.equal(hash(bytes),'eb6eb73632da8a1a274650aba35e6b8c8c32826bd0d5ec3524c048997ed29144');
 try{const file=join(folder,'marker.test.mjs');await fs.writeFile(file,bytes);const childEnv={...process.env};delete childEnv.NODE_TEST_CONTEXT;const run=spawnSync(process.execPath,['--test','--test-reporter=tap',file],{encoding:'utf8',env:childEnv,windowsHide:true,timeout:15000,maxBuffer:2*1024*1024});assert.equal(run.status,0,run.stderr);assert.deepEqual(collect(run.stdout,'syntheticRabinObservation'),expected);}
 finally{assert.equal(resolve(folder),join(resolve(tmpdir()),basename(folder)));assert.ok(basename(folder).startsWith('rea-rabin-recorder-'));await fs.rm(folder,{recursive:true,force:true});}
});
