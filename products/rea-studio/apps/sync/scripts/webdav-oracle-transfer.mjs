import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createOracle,digest,comparisonFlags,logs} from './oracle.mjs';
import {fixtureServer} from './webdav-fixture.mjs';
import {createDAVTransfer} from '../dav-transfer.mjs';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-dav-transfer-oracle-')),source=path.join(root,'source'),auth={type:'basic',username:'synthetic-user',password:'synthetic-only-password'};
const time=Date.parse('2026-10-01T00:00:00Z'), cases=[
  {path:'missing.txt',source:'new',delta:0},
  {path:'identical.txt',source:'same',destination:'same',delta:0},
  {path:'different-bytes-same-size.txt',source:'AAAA',destination:'BBBB',delta:0},
  {path:'different-size.txt',source:'longer',destination:'x',delta:0},
  ...[-1001,-1000,-999,999,1000,1001].map(delta=>({path:`time${delta<0?'minus':'plus'}${Math.abs(delta)}.txt`,source:'source',destination:'target',delta})),
  {path:'zero.txt',source:'',destination:'',delta:0},
];
const seed=Object.fromEntries(cases.filter(x=>x.destination!==undefined).map(x=>[x.path,x.destination]));
const fixture=await fixtureServer({seed,auth});
try {
  await fs.mkdir(source);for(const item of cases){const target=path.join(source,item.path);await fs.writeFile(target,item.source);await fs.utimes(target,new Date(time+item.delta),new Date(time+item.delta));}
  const oracle=await createOracle(root),secret=(await oracle.run(['obscure',auth.password])).stdout.trim(),flags=['--webdav-url',fixture.endpoint,'--webdav-vendor','other','--webdav-user',auth.username,'--webdav-pass',secret,'--retries','1','--low-level-retries','1'],engine=createDAVTransfer(root),results=[];
  const optionKeys=['checksum','sizeOnly','ignoreSize','ignoreTimes','ignoreExisting','update','noUpdateModtime'];
  for(let mask=0;mask<128;mask++) {
    const comparison=Object.fromEntries(optionKeys.map((key,index)=>[key,Boolean(mask&(1<<index))]));fixture.reset();
    const dry=await oracle.run(['copy',source,':webdav:','--dry-run',...comparisonFlags(comparison),...flags]);
    assert.ok(!fixture.requests.some(x=>['PUT','DELETE','MKCOL'].includes(x.method)));const dryCopies=logs(dry.stderr).filter(x=>x.msg?.startsWith('Skipped copy as --dry-run')).map(x=>x.object).sort();
    fixture.requests.length=0;await oracle.run(['copy',source,':webdav:',...comparisonFlags(comparison),...flags]);
    const originalCopies=fixture.requests.filter(x=>x.method==='PUT').map(x=>decodeURIComponent(x.path.slice('/dav/'.length))).sort(),expected=fixture.snapshot();assert.deepEqual(dryCopies,originalCopies);
    fixture.reset();const preview=await engine.preview({endpoint:fixture.endpoint,auth,source:'source',destination:'',mode:'copy',comparison});assert.deepEqual(preview.operations.filter(x=>x.type==='copy').map(x=>x.path).sort(),originalCopies,`mask ${mask}`);
    await engine.apply({endpoint:fixture.endpoint,auth,token:preview.token});assert.deepEqual(fixture.snapshot(),expected,`mask ${mask}`);const nativeCopies=fixture.requests.filter(x=>x.method==='PUT').map(x=>decodeURIComponent(x.path.slice('/dav/'.length))).sort();assert.deepEqual(nativeCopies,originalCopies);
    results.push({mask,comparison,cases:cases.length,copies:originalCopies.length,dryRunCopies:dryCopies.length,folderSHA256:digest(Buffer.from(JSON.stringify(expected)))});
  }
  engine.close();
  // Held-out complete transfer folders exercise filters and sync removal.
  for(const mode of ['copy','sync'])for(const [index,filters] of [{},{exclude:['*.tmp']},{include:['*.txt']},{filter:['- blocked/**','+ **']}].entries()) {
    await fs.rm(source,{recursive:true,force:true});await fs.mkdir(path.join(source,'folder'),{recursive:true});await fs.mkdir(path.join(source,'blocked'),{recursive:true});for(const [name,value]of Object.entries({'a.txt':'replacement','b.tmp':'new','folder/space name.txt':'nested','blocked/data.txt':'blocked'}))await fs.writeFile(path.join(source,...name.split('/')),value);
    const values={'a.txt':'old','extra.txt':'delete','extra.tmp':'keep','blocked/old.txt':'keep'},originalFlags=Object.entries(filters).flatMap(([kind,items])=>items.flatMap(value=>['--'+kind,value]));fixture.reset(values);await oracle.run([mode,source,':webdav:',...originalFlags,...flags]);const expected=fixture.snapshot(),originalActions=fixture.requests.filter(x=>['PUT','DELETE','MKCOL'].includes(x.method) && x.status>=200 && x.status<300).map(x=>[x.method,decodeURIComponent(x.path.slice('/dav/'.length)).replace(/\/$/,'')]).sort();
    fixture.reset(values);const e=createDAVTransfer(root),preview=await e.preview({endpoint:fixture.endpoint,auth,source:'source',destination:'',mode,filters});await e.apply({endpoint:fixture.endpoint,auth,token:preview.token,allowDeletes:true});assert.deepEqual(fixture.snapshot(),expected,`${mode} filters ${index}`);const actions=fixture.requests.filter(x=>['PUT','DELETE','MKCOL'].includes(x.method)).map(x=>[x.method,decodeURIComponent(x.path.slice('/dav/'.length)).replace(/\/$/,'')]).sort();assert.deepEqual(actions,originalActions);e.close();results.push({mode,filters,completeFolder:true,actions:actions.length,folderSHA256:digest(Buffer.from(JSON.stringify(expected)))});
  }
  const receipt={schemaVersion:1,scope:'Authenticated synthetic generic vendor=other WebDAV. All 128 combinations of seven comparison flags; dry-run selection, successful mutation actions and complete resulting folder bytes. Eight held-out filtered copy/sync folders. Native omits original redundant MKCOL requests that return 405 for existing collections. Not full rclone or generic-server parity.',original:{version:oracle.version,zipSHA256:oracle.zipSHA256,executableSHA256:oracle.originalSHA256,sourceCommit:oracle.sourceCommit,executions:oracle.executions},profiles:128,comparisonDecisions:128*cases.length,heldOutTransferFolders:8,results,inputCorpusSHA256:digest(Buffer.from(JSON.stringify({cases,seed}))),sourceSHA256:Object.fromEntries(await Promise.all(['dav-xml.mjs','webdav.mjs','dav-transfer.mjs','dav-comparison.mjs','dav-input.mjs','native-filters.mjs','scripts/webdav-fixture.mjs','scripts/webdav-oracle-transfer.mjs'].map(async file=>[file,digest(await fs.readFile(new URL(file.startsWith('scripts/') ? file.slice(8) : '../'+file,import.meta.url)))])))};
  await fs.writeFile(new URL('../results/webdav-transfer-verification.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({...receipt,results:`${results.length} profiles`},null,2));
}finally{await fixture.close();await fs.rm(root,{recursive:true,force:true});}
