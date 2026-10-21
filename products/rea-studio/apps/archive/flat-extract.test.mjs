// New feature tests; run only in the separately admitted hosted campaign.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {handle} from './server.mjs';
import {makeZip} from './zip.mjs';
import {makeTar} from './tar.mjs';
import {write7z} from './sevenzip.mjs';
import {createWorkspace} from '../../lib/storage.mjs';
import {start} from '../../server.mjs';

async function absent(file){await assert.rejects(fs.lstat(file),error=>error.code==='ENOENT');}
async function owned(t){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-flat-extract-'));
  t.after(async()=>{assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert(path.basename(root).startsWith('rea-flat-extract-'));await fs.rm(root,{recursive:true,force:true});});
  const workspace=await createWorkspace(path.join(root,'workspace'));
  return{root,workspace,call:(action,input)=>handle({action,input,workspace})};
}
const date=new Date('2020-01-02T03:04:05.678Z');
function entries(){return[
  {name:'branch/',directory:true,data:Buffer.alloc(0)},
  {name:'branch/deeper/',directory:true,data:Buffer.alloc(0)},
  {name:'empty-directory/',directory:true,data:Buffer.alloc(0)},
  {name:'branch/bytes.bin',data:Buffer.from(Array.from({length:1024},(_,i)=>i&255))},
  {name:'branch/deeper/café.txt',data:Buffer.from('Owned Unicode λ😀\n')},
  {name:'branch/empty.bin',data:Buffer.alloc(0)},
].map(row=>({...row,modifiedAt:date.toISOString(),mtimeMs:date.getTime()}));}

test('Files only flattens nested ZIP TAR and7Z bytes and file timestamps while default/full keep paths and empty directories',async t=>{
  const f=await owned(t),source=entries();
  const containers=[['zip',makeZip(source,'store')],['tar',makeTar(source)],['7z',write7z(source,{method:'copy'})]];
  for(const[extension,archive]of containers){
    const file='owned.'+extension;await fs.writeFile(path.join(f.workspace.root,file),archive,{flag:'wx'});
    const flat=await f.call('extract',{path:file,destination:'flat-'+extension,pathMode:'flat',confirm:true});
    assert.equal(flat.extracted,3);assert.equal(flat.verified,true);
    assert.deepEqual((await fs.readdir(path.join(f.workspace.root,'flat-'+extension))).sort(),['bytes.bin','café.txt','empty.bin'].sort());
    for(const row of source.filter(row=>!row.directory)){
      const target=path.join(f.workspace.root,'flat-'+extension,path.posix.basename(row.name));
      assert.deepEqual(await fs.readFile(target),row.data);assert(Math.abs((await fs.stat(target)).mtimeMs-date.getTime())<1);
    }
    for(const[pathMode,destination]of[[undefined,'default-'+extension],['full','full-'+extension]]){
      const input={path:file,destination,confirm:true,...(pathMode===undefined?{}:{pathMode})};
      assert.equal((await f.call('extract',input)).extracted,source.length);
      for(const row of source){const target=path.join(f.workspace.root,destination,...row.name.replace(/\/$/,'').split('/'));if(row.directory)assert((await fs.stat(target)).isDirectory());else assert.deepEqual(await fs.readFile(target),row.data);}
    }
    assert.deepEqual(await fs.readFile(path.join(f.workspace.root,file)),archive);
  }
  assert.equal((await fs.readdir(f.workspace.root)).some(name=>name.includes('.partial-')),false);
});

test('flat exact case and Unicode-normalization basename collisions reject the entire plan before destination parents exist',async t=>{
  const f=await owned(t);
  const cases=[['exact','a/report.txt','b/report.txt'],['case','a/Report.txt','b/report.txt'],['unicode','a/café.txt','b/cafe\u0301.txt'],['sigma','a/σ.txt','b/ς.txt'],['uppercase-expansion','a/ß.txt','b/ss.txt']];
  for(const[id,first,second]of cases){
    const archive=makeZip([{name:'unique/first.bin',data:Buffer.from('must never be partially written')},{name:first,data:Buffer.from('one')},{name:second,data:Buffer.from('two')}],'store');
    const file=id+'.zip';await fs.writeFile(path.join(f.workspace.root,file),archive,{flag:'wx'});
    await assert.rejects(f.call('extract',{path:file,destination:id+'/target',pathMode:'flat',confirm:true}),/duplicate filenames/);
    await absent(path.join(f.workspace.root,id));assert.deepEqual(await fs.readFile(path.join(f.workspace.root,file)),archive);
    assert.equal((await f.call('extract',{path:file,destination:'full-'+id,pathMode:'full',confirm:true})).extracted,3);
  }
  assert.equal((await fs.readdir(f.workspace.root)).some(name=>name.includes('.partial-')),false);
});

test('Files only never rescues traversal or linked stored ZIP entries by discarding their folders',async t=>{
  const f=await owned(t),valid=makeZip([{name:'safe/name.txt',data:Buffer.from('owned')}],'store');
  const traversal=Buffer.from(valid),central=traversal.readUInt32LE(traversal.length-6),unsafe=Buffer.from('../escape.txt');
  assert.equal(unsafe.length,traversal.readUInt16LE(26));assert.equal(unsafe.length,traversal.readUInt16LE(central+28));
  unsafe.copy(traversal,30);unsafe.copy(traversal,central+46);
  const linked=Buffer.from(valid);linked.writeUInt32LE((0xa1ff*65536)>>>0,central+38);
  for(const[id,archive]of[['traversal',traversal],['linked',linked]]){
    await fs.writeFile(path.join(f.workspace.root,id+'.zip'),archive,{flag:'wx'});
    await assert.rejects(f.call('extract',{path:id+'.zip',destination:id+'/target',pathMode:'flat',confirm:true}),/unsafe|unsupported|linked/);
    await absent(path.join(f.workspace.root,id));await absent(path.join(f.root,'escape.txt'));
  }
});

test('flat mode validation confirmation destination confinement and exclusive extraction remain mandatory',async t=>{
  const f=await owned(t),archive=makeZip([{name:'folder/a.txt',data:Buffer.from('owned')}],'store');
  await fs.writeFile(path.join(f.workspace.root,'owned.zip'),archive,{flag:'wx'});
  for(const[pathMode,id]of[[null,'null'],['','empty'],['flatten','unknown'],[false,'boolean'],[0,'number'],[{},'object']]){
    await assert.rejects(f.call('extract',{path:'owned.zip',destination:id+'/target',pathMode,confirm:true}),/Full paths or Files only/);await absent(path.join(f.workspace.root,id));
  }
  await assert.rejects(f.call('extract',{path:'owned.zip',destination:'unconfirmed/target',pathMode:'flat'}),/confirmation/);await absent(path.join(f.workspace.root,'unconfirmed'));
  await assert.rejects(f.call('extract',{path:'owned.zip',destination:'../outside',pathMode:'flat',confirm:true}),/unsafe|relative|workspace|traversal/);await absent(path.join(f.root,'outside'));
  await fs.mkdir(path.join(f.workspace.root,'existing'));await fs.writeFile(path.join(f.workspace.root,'existing/keep'),'preserve',{flag:'wx'});
  await assert.rejects(f.call('extract',{path:'owned.zip',destination:'existing',pathMode:'flat',confirm:true}),/new extraction folder/);
  assert.deepEqual(await fs.readdir(path.join(f.workspace.root,'existing')),['keep']);assert.equal(await fs.readFile(path.join(f.workspace.root,'existing/keep'),'utf8'),'preserve');
  const outside=path.join(f.root,'linked-target');await fs.mkdir(outside);await fs.writeFile(path.join(outside,'keep'),'preserve',{flag:'wx'});
  await fs.symlink(outside,path.join(f.workspace.root,'link'),process.platform==='win32'?'junction':'dir');
  await assert.rejects(f.call('extract',{path:'owned.zip',destination:'link/new-folder',pathMode:'flat',confirm:true}),/links/i);
  assert.deepEqual(await fs.readdir(outside),['keep']);await absent(path.join(outside,'new-folder'));
  assert.deepEqual(await fs.readFile(path.join(f.workspace.root,'owned.zip')),archive);
});

test('flat encrypted ZIP extraction authenticates every file before any destination or staging write',async t=>{
  const f=await owned(t),password=randomBytes(24).toString('base64url'),source=[{name:'a/first.txt',data:Buffer.from('first')},{name:'z/last.txt',data:Buffer.from('last')}];
  const archive=makeZip(source,'store',{encryption:'aes256',password}),damaged=Buffer.from(archive),first=damaged.readUInt32LE(damaged.length-6),last=first+46+damaged.readUInt16LE(first+28)+damaged.readUInt16LE(first+30)+damaged.readUInt16LE(first+32),local=damaged.readUInt32LE(last+42),data=local+30+damaged.readUInt16LE(local+26)+damaged.readUInt16LE(local+28);
  damaged[data+damaged.readUInt32LE(last+20)-1]^=1;
  await fs.writeFile(path.join(f.workspace.root,'owned.zip'),archive,{flag:'wx'});await fs.writeFile(path.join(f.workspace.root,'damaged.zip'),damaged,{flag:'wx'});
  for(const[id,input]of[['missing',{path:'owned.zip'}],['wrong',{path:'owned.zip',password:'wrong-'+password}],['tag',{path:'damaged.zip',password}]]){
    await assert.rejects(f.call('extract',{...input,destination:id+'/target',pathMode:'flat',confirm:true}),/password|authentication|damaged|incorrect/i);await absent(path.join(f.workspace.root,id));
  }
  const result=await f.call('extract',{path:'owned.zip',destination:'restored',pathMode:'flat',password,confirm:true});assert.equal(result.extracted,2);
  for(const row of source)assert.deepEqual(await fs.readFile(path.join(f.workspace.root,'restored',path.posix.basename(row.name))),row.data);
  assert.deepEqual(await fs.readFile(path.join(f.workspace.root,'owned.zip')),archive);assert.equal((await fs.readdir(f.workspace.root)).some(name=>name.includes('.partial-')),false);
});

test('flat directory-only archives produce an empty new destination and zero extracted files without changing full mode',async t=>{
  const f=await owned(t),archive=makeZip([{name:'a/',directory:true,data:Buffer.alloc(0)},{name:'a/empty/',directory:true,data:Buffer.alloc(0)}],'store');
  await fs.writeFile(path.join(f.workspace.root,'directories.zip'),archive,{flag:'wx'});
  assert.equal((await f.call('extract',{path:'directories.zip',destination:'flat',pathMode:'flat',confirm:true})).extracted,0);assert.deepEqual(await fs.readdir(path.join(f.workspace.root,'flat')),[]);
  assert.equal((await f.call('extract',{path:'directories.zip',destination:'full',confirm:true})).extracted,2);assert((await fs.stat(path.join(f.workspace.root,'full/a/empty'))).isDirectory());
});

test('real HTTP flat extraction persists across restart and collision responses leave the destination absent',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-flat-extract-http-')),f={root};let host=await start({port:0,dataDir:path.join(root,'http')});
  t.after(async()=>{await host.close();assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert(path.basename(root).startsWith('rea-flat-extract-http-'));await fs.rm(root,{recursive:true,force:true});});
  const workspace=path.join(f.root,'http/archive/workspace');
  async function call(action,input,expected=200){const response=await fetch(host.url+'/api/archive/'+action,{method:'POST',headers:{'content-type':'application/json','x-rea-token':host.token},body:JSON.stringify(input)}),body=await response.json();assert.equal(response.status,expected,body.error);assert.equal(JSON.stringify(body).includes('"password"'),false);return body.result??body;}
  await call('putFile',{path:'source/nested/a.txt',content:'owned HTTP a'});await call('putFile',{path:'source/other/b.txt',content:'owned HTTP b'});await fs.mkdir(path.join(workspace,'source/empty'));
  await call('create',{source:'source',output:'owned.zip',format:'zip',compression:'store'});await host.close();host=await start({port:0,dataDir:path.join(f.root,'http')});
  assert.equal((await call('extract',{path:'owned.zip',destination:'flat',pathMode:'flat',confirm:true})).extracted,2);assert.deepEqual((await fs.readdir(path.join(workspace,'flat'))).sort(),['a.txt','b.txt']);assert.equal(await fs.readFile(path.join(workspace,'flat/a.txt'),'utf8'),'owned HTTP a');
  await call('extract',{path:'owned.zip',destination:'full',pathMode:'full',confirm:true});assert.equal(await fs.readFile(path.join(workspace,'full/nested/a.txt'),'utf8'),'owned HTTP a');assert((await fs.stat(path.join(workspace,'full/empty'))).isDirectory());
  await call('putFile',{path:'collision/one/same.txt',content:'one'});await call('putFile',{path:'collision/two/same.txt',content:'two'});await call('create',{source:'collision',output:'collision.zip',format:'zip',compression:'store'});
  const denied=await call('extract',{path:'collision.zip',destination:'never-created/target',pathMode:'flat',confirm:true},400);assert.match(denied.error,/duplicate filenames/);await absent(path.join(workspace,'never-created'));assert.equal((await fs.readdir(workspace)).some(name=>name.includes('.partial-')),false);
});
