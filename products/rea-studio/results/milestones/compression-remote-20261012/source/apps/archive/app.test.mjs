import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { handle,makeZip,readZip,crc32 } from './server.mjs';
import { createWorkspace } from '../../lib/storage.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'rea-archive-test-'));
  const workspace = await createWorkspace(path.join(root,'workspace'));
  t.after(async () => { assert.equal(path.dirname(root),path.resolve(os.tmpdir())); assert.ok(path.basename(root).startsWith('rea-archive-test-')); await fs.rm(root,{ recursive: true,force: true }); });
  return { root: workspace.root,call: (action,input = {}) => handle({ action,input,workspace }) };
}
test('stored and deflated ZIP files preserve binary, UTF-8, empty files and directories',async t => {
  const { root,call } = await fixture(t); await fs.mkdir(path.join(root,'source','empty'),{ recursive: true });
  const binary = Buffer.from(Array.from({ length: 10000 },(_,i) => i % 256));
  await fs.writeFile(path.join(root,'source','data.bin'),binary); await fs.writeFile(path.join(root,'source','café.txt'),'Hello 🌍'.repeat(100)); await fs.writeFile(path.join(root,'source','empty.txt'),'');
  for (const compression of ['store','deflate']) {
    const zip = `${compression}.zip`, destination = `restored-${compression}`;
    const result = await call('create',{ source: 'source',output: zip,compression }); assert.equal(result.entries,4);
    const list = await call('list',{ path: zip }); assert.equal(list.verified,true); assert.equal(list.entries.find(e => e.name === 'data.bin').size,binary.length);
    await call('extract',{ path: zip,destination,confirm: true });
    assert.deepEqual(await fs.readFile(path.join(root,destination,'data.bin')),binary);
    assert.equal(await fs.readFile(path.join(root,destination,'café.txt'),'utf8'),'Hello 🌍'.repeat(100));
    assert.equal((await fs.stat(path.join(root,destination,'empty'))).isDirectory(),true);
    await assert.rejects(call('extract',{ path: zip,destination,confirm: true }),/existing/);
    await assert.rejects(call('create',{ source: 'source',output: zip,compression }),/EEXIST/);
  }
});
test('ZIP parser validates CRC and headers and refuses traversal, duplicate paths, and oversized expansion',() => {
  assert.equal(crc32(Buffer.from('123456789')),0xcbf43926);
  const zip = makeZip([{ name: 'safe.txt',data: Buffer.from('hello') }],'store'), corrupted = Buffer.from(zip);
  corrupted[30 + Buffer.byteLength('safe.txt')] ^= 1; assert.throws(() => readZip(corrupted),/CRC/);
  const traversal = Buffer.from(zip); const central = traversal.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
  Buffer.from('../x.txt').copy(traversal,30); Buffer.from('../x.txt').copy(traversal,central + 46);
  assert.throws(() => readZip(traversal),/unsafe/);
  const badSize = Buffer.from(zip); badSize.writeUInt32LE(0x7fffffff,central + 24); assert.throws(() => readZip(badSize),/size limit/);
  assert.throws(() => makeZip([{ name: 'a',data: Buffer.alloc(0) },{ name: 'A',data: Buffer.alloc(0) }]),/Duplicate/);
  assert.throws(() => readZip(zip.subarray(0,-1)),/end record/);
});
test('malicious archive cannot create files outside workspace and unconfirmed extraction does not write',async t => {
  const { root,call } = await fixture(t); await call('putFile',{ path: 'source/a.txt',content: 'a' }); await call('create',{ source: 'source',output: 'a.zip' });
  await assert.rejects(call('extract',{ path: 'a.zip',destination: '../escape',confirm: true }),/unsafe|workspace|relative/i);
  await assert.rejects(call('extract',{ path: 'a.zip',destination: 'result' }),/confirmation/);
  await assert.rejects(fs.stat(path.join(root,'result')),/ENOENT/);
  await assert.rejects(call('putFile',{ path: 'source/a.txt',content: 'overwritten' }),/EEXIST/);
  assert.equal(await fs.readFile(path.join(root,'source','a.txt'),'utf8'),'a');
});
test('Windows .NET independently reads generated ZIP and our parser reads independently created ZIP',{ skip: process.platform !== 'win32' },async t => {
  const { root } = await fixture(t);
  const entries = [{ name: 'bytes.bin',data: Buffer.from(Array.from({ length: 4096 },(_,i) => i % 256)) },{ name: 'café.txt',data: Buffer.from('Interoperable 🌍') },{ name: 'empty/',data: Buffer.alloc(0),directory: true }];
  const expected = path.join(root,'expected.json'); await fs.writeFile(expected,JSON.stringify(entries.map(e => ({ name: e.name,base64: e.data.toString('base64') }))));
  const own = path.join(root,'own.zip'); await fs.writeFile(own,makeZip(entries));
  const script = fileURLToPath(new URL('./interop.ps1',import.meta.url));
  for (const [mode,archive] of [['verify',own],['create',path.join(root,'dotnet.zip')]]) {
    const result = spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,'-Mode',mode,'-ArchivePath',archive,'-ExpectedPath',expected],{ encoding: 'utf8',timeout: 20000 });
    assert.equal(result.status,0,result.stderr || result.error?.message);
  }
  const independentlyCreated = readZip(await fs.readFile(path.join(root,'dotnet.zip')),true);
  for (const entry of entries) assert.deepEqual(independentlyCreated.find(e => e.name === entry.name).data,entry.data);
});
