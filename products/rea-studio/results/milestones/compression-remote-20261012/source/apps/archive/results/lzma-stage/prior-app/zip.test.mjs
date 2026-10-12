import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { makeZip, readZip } from './zip.mjs';
import { handle } from './server.mjs';
import { createWorkspace } from '../../lib/storage.mjs';

const lab = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const artifacts = path.join(lab, 'projects/08-7zip/artifacts');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// Frozen small compatibility inputs: reader regressions do not regenerate them with makeZip.
// The original 7-Zip oracle below verifies their headers, decompression and payload independently.
const compatibilityFixtures = {
  diskSentinels: Buffer.from('UEsDBC0AAAgAAAAAIQDqFrtG//////////8FABQAYS50eHQBABAAEQAAAAAAAAARAAAAAAAAAG9uZSBvcmRpbmFyeSBmaWxlUEsBAi0ALQAACAAAAAAhAOoWu0b//////////wUAHAAAAAAAAAAAAAAA/////2EudHh0AQAYABEAAAAAAAAAEQAAAAAAAAAAAAAAAAAAAFBLBgYsAAAAAAAAAC0ALQAAAAAAAAAAAAEAAAAAAAAAAQAAAAAAAABPAAAAAAAAAEgAAAAAAAAAUEsGBwAAAACXAAAAAAAAAAEAAABQSwUG/////////////////////wAA','base64'),
  central64Signed: Buffer.from('UEsDBC0ACAgIAAAAIQAAAAAAAAAAAAAAAAAFAAAAYS50eHRLSS1OLsosKMkvAgBQSwcIAnaSAwwAAAAAAAAACgAAAAAAAABQSwECLQAtAAgICAAAACEAAnaSA///////////BQAcAAAAAAAAAAAAAAD/////YS50eHQBABgACgAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAUEsGBiwAAAAAAAAALQAtAAAAAAAAAAAAAQAAAAAAAAABAAAAAAAAAE8AAAAAAAAARwAAAAAAAABQSwYHAAAAAJYAAAAAAAAAAQAAAFBLBQYAAAAA////////////////AAA=','base64'),
  central64Unsigned: Buffer.from('UEsDBC0ACAgIAAAAIQAAAAAAAAAAAAAAAAAFAAAAYS50eHRLSS1OLsosKMkvAgACdpIDDAAAAAAAAAAKAAAAAAAAAFBLAQItAC0ACAgIAAAAIQACdpID//////////8FABwAAAAAAAAAAAAAAP////9hLnR4dAEAGAAKAAAAAAAAAAwAAAAAAAAAAAAAAAAAAABQSwYGLAAAAAAAAAAtAC0AAAAAAAAAAAABAAAAAAAAAAEAAAAAAAAATwAAAAAAAABDAAAAAAAAAFBLBgcAAAAAkgAAAAAAAAABAAAAUEsFBgAAAAD///////////////8AAA==','base64'),
  dotnetDosDate: Buffer.from('UEsDBBQAAAAIAMQAZEAeyXSrDQAAAAUAAAAFAAAAYS50eHRKSSxJLQYAAAD//wMAUEsBAhQAFAAAAAgAxABkQB7JdKsNAAAABQAAAAUAAAAAAAAAAAAAAAAAAAAAAGEudHh0UEsFBgAAAAABAAEAMwAAADAAAAAAAA==','base64')
};
async function fixture(t) { const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rea-zip64-')); t.after(async()=>{assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('rea-zip64-'));await fs.rm(root,{recursive:true,force:true});}); return root; }
function change(zip, fn) { const bytes = Buffer.from(zip); fn(bytes); return bytes; }
const entries = [{name:'bytes.bin',data:Buffer.from(Array.from({length:4096},(_,i)=>i%256)),modifiedAt:'2020-04-05T06:07:08.321Z',accessedAt:'2021-04-05T06:07:08.123Z',createdAt:'2019-04-05T06:07:08.456Z'}, {name:'café.txt',data:Buffer.from('Interoperable 🌍')}, {name:'empty/',directory:true,data:Buffer.alloc(0)}];

test('ZIP64 and classic descriptor combinations preserve bytes and millisecond NTFS timestamps',()=>{
  for(const compression of ['store','deflate']) for(const zip64 of [false,true]) for(const dataDescriptor of [false,true]){
    const zip=makeZip(entries,compression,{zip64,dataDescriptor,level:9,comment:'Synthetic comment 🌍'}), result=readZip(zip,true);
    assert.equal(result.length,entries.length);for(const entry of entries)assert.deepEqual(result.find(e=>e.name===entry.name).data,entry.data);
    assert.equal(result[0].zip64,zip64);assert.equal(result[0].dataDescriptor,dataDescriptor);for(const field of ['modifiedAt','accessedAt','createdAt'])assert.equal(result[0][field],entries[0][field]);
  }
  assert.throws(()=>makeZip(entries,'deflate',{level:10}),/level/);
  assert.throws(()=>makeZip([{name:'x',data:Buffer.alloc(0),modifiedAt:'bad-date'}]),/date/);
  assert.throws(()=>makeZip([{name:'a',data:Buffer.alloc(0)},{name:'a/b',data:Buffer.alloc(0)}]),/both a file/);
});

test('signed and unsigned descriptors validate their own CRC and sizes rather than trusting the directory',()=>{
  const zip=makeZip([{name:'a.txt',data:Buffer.from('descriptor')}],'deflate',{dataDescriptor:true}), central=zip.indexOf(Buffer.from([0x50,0x4b,0x01,0x02])), trailer=central-16;
  assert.equal(zip.readUInt32LE(trailer),0x08074b50);
  const unsigned=Buffer.concat([zip.subarray(0,trailer),zip.subarray(trailer+4)]);unsigned.writeUInt32LE(central-4,unsigned.length-22+16);
  assert.equal(readZip(unsigned,true)[0].data.toString(),'descriptor');
  for(const field of [4,8,12])assert.throws(()=>readZip(change(zip,b=>b[trailer+field]^=1)),/descriptor/);
  const missing=Buffer.concat([zip.subarray(0,trailer),zip.subarray(central)]);missing.writeUInt32LE(trailer,missing.length-22+16);assert.throws(()=>readZip(missing),/descriptor/);
});

test('ZIP64 incomplete values, impossible offsets and footer disagreements reject before inflation',()=>{
  const zip=makeZip([{name:'a',data:Buffer.from('value')}],'store',{zip64:true}), z=zip.indexOf(Buffer.from([0x50,0x4b,0x06,0x06])), locator=z+56, end=locator+20;
  assert.throws(()=>readZip(change(zip,b=>b.writeBigUInt64LE(0xffffffffffffffffn,locator+8))),/integer range/);
  assert.throws(()=>readZip(change(zip,b=>b.writeUInt32LE(1,end+12))),/disagree/);
  assert.throws(()=>readZip(change(zip,b=>b.writeUInt16LE(2,30+1))),/ZIP64/);
  const central=Number(zip.readBigUInt64LE(z+48));assert.throws(()=>readZip(change(zip,b=>b.writeBigUInt64LE(100000000000n,central+46+1+4+16))),/local ZIP/);
  assert.throws(()=>readZip(change(zip,b=>b.writeUInt32LE(0,locator))),/locator/);
});

test('ZIP64 end disk sentinels resolve to the single-disk ZIP64 record',()=>{
  const zip=compatibilityFixtures.diskSentinels,end=zip.length-22,locator=end-20,z=Number(zip.readBigUInt64LE(locator+8));
  assert.equal(readZip(zip,true)[0].data.toString(),'one ordinary file');
  for(const offset of [4,6])assert.equal(zip.readUInt16LE(end+offset),0xffff);
  for(const offset of [16,20])assert.throws(()=>readZip(change(zip,b=>b.writeUInt32LE(1,z+offset))),/disk layout/);
  assert.throws(()=>readZip(change(zip,b=>b.writeUInt16LE(1,end+4))),/disagree/);
  assert.throws(()=>readZip(change(zip,b=>b.writeUInt32LE(0,locator))),/locator/);
});

test('central ZIP64 sizes select signed and unsigned 64-bit streaming descriptors',()=>{
  for(const [name,zip] of Object.entries(compatibilityFixtures).filter(([name])=>name.startsWith('central64'))){
    assert.equal(zip.readUInt32LE(18),0);assert.equal(zip.readUInt32LE(22),0);assert.equal(zip.readUInt16LE(28),0);
    const entry=readZip(zip,true)[0];assert.equal(entry.data.toString(),'descriptor');assert.equal(entry.zip64,true);assert.equal(entry.dataDescriptor,true);
    const z=Number(zip.readBigUInt64LE(zip.length-22-20+8)),central=Number(zip.readBigUInt64LE(z+48)),at=central-20;
    for(const offset of [0,4,12])assert.throws(()=>readZip(change(zip,b=>b[at+offset]^=1)),/descriptor/);
  }
});

test('DOS timestamps use local wall time and generated DOS fields match the supplied date',()=>{
  const script=`import assert from 'node:assert/strict';import {makeZip,readZip} from ${JSON.stringify(new URL('./zip.mjs',import.meta.url).href)};const zip=Buffer.from(${JSON.stringify(compatibilityFixtures.dotnetDosDate.toString('base64'))},'base64');assert.equal(readZip(zip)[0].modifiedAt,'2012-03-04T05:06:08.000Z');const own=makeZip([{name:'a',data:Buffer.from('dates'),modifiedAt:'2012-03-04T05:06:08.000Z'}]);assert.equal(own.readUInt16LE(10),6<<5|4);assert.equal(own.readUInt16LE(12),32<<9|3<<5|4);assert.equal(readZip(own)[0].modifiedAt,'2012-03-04T05:06:08.000Z');`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',script],{env:{...process.env,TZ:'America/New_York'},encoding:'utf8',windowsHide:true,timeout:20000});assert.equal(result.status,0,result.stderr||result.error?.message);
});

test('independent .NET DOS timestamp creation and extraction agree with application extraction',{skip:process.platform!=='win32'&&'.NET ZIP oracle unavailable.'},async t=>{
  const root=await fixture(t),workspace=await createWorkspace(path.join(root,'workspace'));
  const script=`$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archivePath=Join-Path $env:REA_ZIP_TEST_DIR 'workspace/dotnet.zip'
$localDate=[DateTime]::new(2012,3,4,0,6,8,[DateTimeKind]::Unspecified)
$entryDate=[DateTimeOffset]::new($localDate,[TimeZoneInfo]::Local.GetUtcOffset($localDate))
$stream=[System.IO.File]::Open($archivePath,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::ReadWrite)
$archive=[System.IO.Compression.ZipArchive]::new($stream,[System.IO.Compression.ZipArchiveMode]::Create)
try{$entry=$archive.CreateEntry('a.txt');$entry.LastWriteTime=$entryDate;$writer=[System.IO.StreamWriter]::new($entry.Open());try{$writer.Write('dates')}finally{$writer.Dispose()}}finally{$archive.Dispose()}
$destination=Join-Path $env:REA_ZIP_TEST_DIR 'dotnet-restored'
[System.IO.Compression.ZipFile]::ExtractToDirectory($archivePath,$destination)
@{expected=$entryDate.UtcDateTime.ToString('o');restored=(Get-Item -LiteralPath (Join-Path $destination 'a.txt')).LastWriteTimeUtc.ToString('o')}|ConvertTo-Json -Compress`;
  const oracle=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{env:{...process.env,REA_ZIP_TEST_DIR:root},encoding:'utf8',windowsHide:true,timeout:20000});assert.equal(oracle.status,0,oracle.stderr||oracle.error?.message);
  const expected=JSON.parse(oracle.stdout),date=new Date(expected.expected).toISOString();assert.equal(new Date(expected.restored).toISOString(),date);
  const archive=await fs.readFile(workspace.resolve('dotnet.zip'));assert.equal(archive.readUInt16LE(28),0);assert.equal(readZip(archive)[0].modifiedAt,date);
  await handle({action:'extract',input:{path:'dotnet.zip',destination:'restored',confirm:true},workspace});assert.equal((await fs.stat(workspace.resolve('restored/a.txt'))).mtime.toISOString(),date);
});

test('legacy CP437 filenames decode to Unicode without requiring a UTF-8 flag',()=>{
  const zip=makeZip([{name:'cafX.txt',data:Buffer.from('legacy')}],'store'), central=zip.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
  zip.writeUInt16LE(0,6);zip.writeUInt16LE(0,central+8);zip[33]=zip[central+49]=0x82;
  assert.equal(readZip(zip,true)[0].name,'café.txt');assert.equal(readZip(zip,true)[0].data.toString(),'legacy');
});

test('filesystem ZIP creation and extraction preserve file and directory modification times',async t=>{
  const root=await fixture(t),workspace=await createWorkspace(path.join(root,'workspace')),call=(action,input)=>handle({action,input,workspace});
  await fs.mkdir(workspace.resolve('source/empty'),{recursive:true});await fs.writeFile(workspace.resolve('source/a.txt'),'dates');const date=new Date('2012-03-04T05:06:07.890Z');await fs.utimes(workspace.resolve('source/a.txt'),date,date);await fs.utimes(workspace.resolve('source/empty'),date,date);
  await call('create',{source:'source',output:'dates.zip',zip64:true,level:9});await call('extract',{path:'dates.zip',destination:'restored',confirm:true});
  for(const name of ['a.txt','empty'])assert.ok(Math.abs((await fs.stat(workspace.resolve('restored/'+name))).mtimeMs-date.getTime())<1);
});

test('preserved original 7-Zip independently validates generated ZIP64/descriptors and generated original ZIPs replay',{skip:process.platform!=='win32'&&'Pinned Windows 7-Zip oracle unavailable.'},async t=>{
  const root=await fixture(t),archive=await fs.readFile(path.join(artifacts,'7z2604-extra.7z')),extractor=path.join(artifacts,'7zr.exe'),oracle=path.join(artifacts,'extra/x64/7za.exe');
  assert.equal(sha(archive),'dc4b11d3399db18b063630137145f5585d8f7ac847bf3639bd1185d7d1f7cee0');assert.equal(sha(await fs.readFile(extractor)),'256feca8e274e5da655e2a284fabafd9f554365eb164862089dacd4e8276d282');
  const unpacked=spawnSync(extractor,['e','-so',path.join(artifacts,'7z2604-extra.7z'),'x64/7za.exe'],{maxBuffer:8*1024*1024,windowsHide:true});assert.equal(unpacked.status,0);assert.equal(sha(unpacked.stdout),'15d4c788c148e3677e2fc1c4a01f191fb6669eba4f6acf8a465f0f1a6f1e1260');assert.ok(unpacked.stdout.equals(await fs.readFile(oracle)));
  const run=args=>{const r=spawnSync(oracle,args,{cwd:root,maxBuffer:8*1024*1024,windowsHide:true,timeout:20000});assert.equal(r.status,0,r.stderr.toString());return r.stdout;};
  for(const [name,bytes] of Object.entries(compatibilityFixtures)){
    const filename=path.join(root,`compatibility-${name}.zip`);await fs.writeFile(filename,bytes);run(['t','-bd',filename]);
    assert.equal(run(['x','-so',filename,'a.txt']).toString(),name==='diskSentinels'?'one ordinary file':name==='dotnetDosDate'?'dates':'descriptor');
    assert.equal(readZip(bytes,true)[0].data.toString(),name==='diskSentinels'?'one ordinary file':name==='dotnetDosDate'?'dates':'descriptor');
  }
  for(const zip64 of [false,true])for(const dataDescriptor of [false,true]){const filename=path.join(root,`own-${zip64}-${dataDescriptor}.zip`);await fs.writeFile(filename,makeZip(entries,'deflate',{zip64,dataDescriptor}));run(['t','-bd',filename]);for(const entry of entries.filter(e=>!e.directory))assert.deepEqual(run(['x','-so',filename,entry.name]),entry.data);}
  for(const entry of entries){const target=path.join(root,'source',...entry.name.replace(/\/$/,'').split('/'));if(entry.directory)await fs.mkdir(target,{recursive:true});else{await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,entry.data);}}
  for(const method of ['Store','Deflate']){const file=path.join(root,`original-${method}.zip`);run(['a','-tzip',`-mm=${method}`,'-mx=9',file,'source']);const generated=readZip(await fs.readFile(file),true);for(const entry of entries)assert.deepEqual(generated.find(e=>e.name==='source/'+entry.name).data,entry.data);}
});
