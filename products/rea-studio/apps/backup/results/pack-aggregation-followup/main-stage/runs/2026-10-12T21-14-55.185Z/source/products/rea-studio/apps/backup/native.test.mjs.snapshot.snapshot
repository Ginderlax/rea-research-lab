import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { createWorkspace } from '../../lib/storage.mjs';
import { handle } from './server.mjs';
import { hash,seal,open,randomKey,validPolynomial,passwordKey,masterKey,base64 } from './restic-crypto.mjs';
import { decodeName,limits,resticTime } from './restic.mjs';
import { start } from '../../server.mjs';
import { zstdDecompressSync,zstdCompressSync } from 'node:zlib';

const exec = promisify(execFile), repositoryRoot = fileURLToPath(new URL('../../../../',import.meta.url));
const artifact = path.join(repositoryRoot,'projects/09-restic/artifacts');
const ZIP_SHA = 'da948ad707ed690426473aaba2046cd61f8f90f6f0e7dab6be0d5796531de67d';
const EXE_SHA = 'b0dd1fd21eea5d8fe1325f55f7118213c21f36de8a261e04c0624a5ab9fd7830';
const PASSWORD = 'synthetic-native-fixture-only-2026';
async function fixture(t, oracle = false) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'rea-restic-native-'));
  t.after(async () => { assert.equal(path.dirname(root),path.resolve(os.tmpdir())); assert.ok(path.basename(root).startsWith('rea-restic-native-')); await fs.rm(root,{ recursive:true,force:true }); });
  const workspace = await createWorkspace(path.join(root,'workspace'));
  const call = (action,input = {}) => handle({ action,input:{ repository:'native',password:PASSWORD,...input },workspace });
  let original;
  if (oracle) {
    assert.equal(hash(await fs.readFile(path.join(artifact,'restic_0.19.1_windows_amd64.zip'))),ZIP_SHA,'Preserved official release ZIP must match the pinned publisher digest.');
    const bytes = await fs.readFile(path.join(artifact,'unpacked/restic_0.19.1_windows_amd64.exe')); assert.equal(hash(bytes),EXE_SHA,'Authenticate original executable before execution.');
    const executable = path.join(root,'original-restic.exe'); await fs.writeFile(executable,bytes,{ flag:'wx' }); assert.equal(hash(await fs.readFile(executable)),EXE_SHA);
    original = async (...args) => {
      const result = await exec(executable,['--no-cache','-r',workspace.resolve('native'),...args],{ cwd:workspace.root,env:{ ...process.env,RESTIC_PASSWORD:PASSWORD,RESTIC_REPOSITORY:'',RESTIC_PASSWORD_FILE:'',RESTIC_PASSWORD_COMMAND:'' },timeout:60000,maxBuffer:8 * 1024 * 1024,windowsHide:true });
      return result.stdout;
    };
    assert.match(await original('version'),/^restic 0\.19\.1 compiled with go1\.26\.4 on windows\/amd64/);
  }
  return { root,workspace,call,original };
}
async function treeFixture(workspace) {
  await fs.mkdir(workspace.resolve('source/nested/empty'),{ recursive:true });
  const binary = Buffer.alloc(2 * 1024 * 1024 + 47); for (let i = 0; i < binary.length; i++) binary[i] = (i * 113 + Math.floor(i / 1024)) & 255;
  await fs.writeFile(workspace.resolve('source/binary.bin'),binary);
  await fs.writeFile(workspace.resolve('source/nested/雪😀.txt'),'Unicode fixture — identical bytes');
  await fs.writeFile(workspace.resolve('source/empty.txt'),'');
  const time = new Date('2023-04-05T06:07:08.123Z'); await fs.utimes(workspace.resolve('source/binary.bin'),time,time);
  return binary;
}
async function filesAt(root,prefix = '') {
  const result = {};
  for (const child of await fs.readdir(path.join(root,prefix),{ withFileTypes:true })) {
    const relative = prefix ? `${prefix}/${child.name}`:child.name;
    if (child.isDirectory()) Object.assign(result,await filesAt(root,relative)); else result[relative] = hash(await fs.readFile(path.join(root,relative)));
  }
  return result;
}
async function unlocked(workspace) {
  const names = await fs.readdir(workspace.resolve('native/keys')), doc = JSON.parse(await fs.readFile(workspace.resolve(`native/keys/${names[0]}`),'utf8'));
  return masterKey(JSON.parse(open(await passwordKey(doc,PASSWORD),base64(doc.data))));
}
function decoded(key,bytes) {
  const data = open(key,bytes); return JSON.parse(data[0] === 2 ? zstdDecompressSync(data.subarray(1)):data);
}
async function replaceObject(workspace,directory,oldID,bytes) {
  const newID = hash(bytes); await fs.writeFile(workspace.resolve(`native/${directory}/${newID}`),bytes,{ flag:'wx' }); await fs.unlink(workspace.resolve(`native/${directory}/${oldID}`)); return newID;
}
async function mutatePack(workspace,mutate) {
  const key = await unlocked(workspace), names = await fs.readdir(workspace.resolve('native/index'));
  for (const indexID of names) {
    const doc = decoded(key,await fs.readFile(workspace.resolve(`native/index/${indexID}`)));
    const record = doc.packs.find(pack => pack.blobs.some(blob => blob.type === 'data')); if (!record) continue;
    const oldID = record.id, oldLocation = workspace.resolve(`native/data/${oldID.slice(0,2)}/${oldID}`), bytes = await fs.readFile(oldLocation);
    const changed = mutate(bytes,key,record), newID = hash(changed); await fs.mkdir(workspace.resolve(`native/data/${newID.slice(0,2)}`),{ recursive:true });
    if (newID !== oldID) { await fs.writeFile(workspace.resolve(`native/data/${newID.slice(0,2)}/${newID}`),changed,{ flag:'wx' }); await fs.unlink(oldLocation); } record.id = newID;
    await replaceObject(workspace,'index',indexID,seal(key,Buffer.from(JSON.stringify(doc)))); return;
  }
  assert.fail('Fixture must contain a data pack.');
}
async function replaceTree(workspace,snapshotID,nodes) {
  const key = await unlocked(workspace), plaintext = Buffer.from(JSON.stringify({ nodes })+'\n'), treeID = hash(plaintext), payload = seal(key,plaintext), record = Buffer.alloc(37);
  record[0] = 1; record.writeUInt32LE(payload.length,1); Buffer.from(treeID,'hex').copy(record,5);
  const header = seal(key,record), footer = Buffer.alloc(4); footer.writeUInt32LE(header.length); const pack = Buffer.concat([payload,header,footer]), packID = hash(pack);
  await fs.mkdir(workspace.resolve(`native/data/${packID.slice(0,2)}`),{ recursive:true }); await fs.writeFile(workspace.resolve(`native/data/${packID.slice(0,2)}/${packID}`),pack,{ flag:'wx' });
  const index = seal(key,Buffer.from(JSON.stringify({ packs:[{ id:packID,blobs:[{ id:treeID,type:'tree',offset:0,length:payload.length }] }] }))); await fs.writeFile(workspace.resolve(`native/index/${hash(index)}`),index,{ flag:'wx' });
  const doc = decoded(key,await fs.readFile(workspace.resolve(`native/snapshots/${snapshotID}`))); doc.tree = treeID;
  return replaceObject(workspace,'snapshots',snapshotID,seal(key,Buffer.from(JSON.stringify(doc))));
}
async function replaceSnapshotTime(workspace,snapshotID,time) {
  const key = await unlocked(workspace), doc = decoded(key,await fs.readFile(workspace.resolve(`native/snapshots/${snapshotID}`))); doc.time = time;
  return replaceObject(workspace,'snapshots',snapshotID,seal(key,Buffer.from(JSON.stringify(doc))));
}

test('native AES-CTR/Poly1305-AES rejects altered nonce, ciphertext and tag before decrypting',() => {
  const key = randomKey(), plaintext = randomBytes(1031), encrypted = seal(key,plaintext); assert.deepEqual(open(key,encrypted),plaintext);
  for (const position of [0,16,encrypted.length-1]) { const changed = Buffer.from(encrypted); changed[position] ^= 1; assert.throws(() => open(key,changed),/authentication failed/); }
  for (const length of [0,1,15,16,31]) assert.throws(() => open(key,encrypted.subarray(0,length)),/Invalid/);
  assert.throws(() => open(key,Buffer.alloc(32)),/Invalid/);
  assert.equal(validPolynomial('25b468838dcb75'),true); assert.equal(validPolynomial('20000000000001'),false);
  assert.equal(decodeName('雪\\U0001f600.txt'),'雪😀.txt'); assert.equal(decodeName('caf\\u00e9.txt'),'café.txt');
  for (const name of ['../escape','a/b','C:','bad\\xff','bad\\uD800','bad\\q','CON','a.','a\\x00']) assert.throws(() => decodeName(name));
});

for (const version of [1,2]) test(`app writes genuine native v${version} repositories; original opens, checks, restores and app appends`,async t => {
  const { workspace,call,original } = await fixture(t,true), binary = await treeFixture(workspace);
  const initialized = await call('nativeInit',{ version }); assert.equal(initialized.format,'restic'); assert.equal(initialized.version,version);
  assert.equal(JSON.parse(await original('cat','config')).version,version);
  const saved = await call('nativeSnapshot',{ source:'source',label:'native-fixture' }); assert.equal(saved.files,3); assert.ok(saved.newPacks >= 7);
  const snapshots = JSON.parse(await original('snapshots','--json')); assert.equal(snapshots[0].id,saved.id); assert.deepEqual(snapshots[0].tags,['native-fixture']);
  assert.match(await original('check','--read-data'),/no errors were found/);
  await original('restore',saved.id,'--target',workspace.resolve('oracle-restored'));
  assert.deepEqual(await filesAt(workspace.resolve('oracle-restored/source')),await filesAt(workspace.resolve('source')));
  assert.ok((await fs.lstat(workspace.resolve('oracle-restored/source/nested/empty'))).isDirectory());
  const checked = await call('nativeCheck',{ id:saved.id }); assert.equal(checked.files,3); assert.equal(checked.checkedBytes,binary.length + Buffer.byteLength('Unicode fixture — identical bytes'));
  await call('nativeRestore',{ id:saved.id,destination:'app-restored',confirm:true }); assert.deepEqual(await filesAt(workspace.resolve('app-restored/source')),await filesAt(workspace.resolve('source')));
  assert.ok(Math.abs((await fs.stat(workspace.resolve('app-restored/source/binary.bin'))).mtimeMs - Date.parse('2023-04-05T06:07:08.123Z')) < 1);
  const second = await call('nativeSnapshot',{ source:'source',label:'second' }); assert.ok(second.newPacks < saved.newPacks,'Existing native data blobs are reused.'); assert.equal((await call('nativeList')).snapshots.length,2);
  assert.match(await original('check','--read-data'),/no errors were found/);
  await assert.rejects(call('nativeRestore',{ id:saved.id,destination:'app-restored',confirm:true }),/EEXIST/);
  assert.deepEqual(await filesAt(workspace.resolve('app-restored/source')),await filesAt(workspace.resolve('source')));
  assert.deepEqual(await fs.readdir(workspace.resolve('native/locks')),[]);
});

for (const version of [1,2]) test(`original v${version} snapshots including compressed v2 blobs are listed, checked, restored and extended by app`,async t => {
  const { workspace,call,original } = await fixture(t,true); await treeFixture(workspace);
  await original('init','--repository-version',String(version)); await original('backup','source','--tag','original-fixture');
  const keyNames = await fs.readdir(workspace.resolve('native/keys')); const keyDoc = JSON.parse(await fs.readFile(workspace.resolve(`native/keys/${keyNames[0]}`),'utf8')); t.diagnostic(`Original calibrated scrypt parameters: N=${keyDoc.N}, r=${keyDoc.r}, p=${keyDoc.p}`);
  if (version === 2) {
    const key = await unlocked(workspace), indexNames = await fs.readdir(workspace.resolve('native/index'));
    const encryptedIndex = await fs.readFile(workspace.resolve(`native/index/${indexNames[0]}`)); assert.equal(open(key,encryptedIndex)[0],2,'Original really generated compressed v2 metadata.');
    const index = decoded(key,encryptedIndex); assert.ok(index.packs.some(pack => pack.blobs.some(blob => blob.uncompressed_length > 0)),'Original really generated compressed v2 pack blobs.');
  }
  const snapshots = await call('nativeList'); assert.equal(snapshots.version,version); assert.equal(snapshots.snapshots.length,1);
  const snapshot = snapshots.snapshots[0], inspected = await call('nativeInspect',{ id:snapshot.id });
  const binaryEntry = inspected.entries.find(entry => entry.path.endsWith('/binary.bin')); assert.ok(binaryEntry); assert.equal(binaryEntry.size,2 * 1024 * 1024 + 47);
  assert.equal((await call('nativeCheck',{ id:snapshot.id })).files,3);
  await call('nativeRestore',{ id:snapshot.id,destination:'app-restored',confirm:true });
  const sourcePrefix = path.posix.dirname(binaryEntry.path);
  assert.deepEqual(await filesAt(workspace.resolve(`app-restored/${sourcePrefix}`)),await filesAt(workspace.resolve('source')));
  const appended = await call('nativeSnapshot',{ source:'source',label:'app-append' }); assert.equal(appended.files,3);
  assert.equal(JSON.parse(await original('snapshots','--json')).length,2); assert.match(await original('check','--read-data'),/no errors were found/);
  await original('restore',appended.id,'--target',workspace.resolve('oracle-app-append'));
  assert.deepEqual(await filesAt(workspace.resolve('oracle-app-append/source')),await filesAt(workspace.resolve('source')));
});

test('wrong password, damaged native key/config and excessive KDF are refused without persistent credentials',async t => {
  const { workspace,call,original:oracle } = await fixture(t,true); await call('nativeInit');
  await assert.rejects(call('nativeInfo',{ password:'wrong-synthetic-password' }),/authentication failed/);
  const location = workspace.resolve('native/config'), original = await fs.readFile(location), changed = Buffer.from(original); changed[16] ^= 1; await fs.writeFile(location,changed);
  await assert.rejects(call('nativeInfo'),/authentication failed/); await assert.rejects(oracle('cat','config'),/ciphertext verification failed/); await fs.writeFile(location,original);
  const names = await fs.readdir(workspace.resolve('native/keys')), oldID = names[0], keyBytes = await fs.readFile(workspace.resolve(`native/keys/${oldID}`)), keyDoc = JSON.parse(keyBytes);
  const data = Buffer.from(keyDoc.data,'base64'); data[16] ^= 1; keyDoc.data = data.toString('base64');
  const damagedID = await replaceObject(workspace,'keys',oldID,Buffer.from(JSON.stringify(keyDoc))); await assert.rejects(call('nativeInfo'),/authentication failed/);
  await fs.unlink(workspace.resolve(`native/keys/${damagedID}`)); await fs.writeFile(workspace.resolve(`native/keys/${oldID}`),keyBytes);
  const excessive = JSON.parse(keyBytes); excessive.N = 2 ** 30;
  const hugeID = await replaceObject(workspace,'keys',oldID,Buffer.from(JSON.stringify(excessive))); await assert.rejects(call('nativeInfo'),/excessive restic scrypt/);
  await fs.unlink(workspace.resolve(`native/keys/${hugeID}`)); await fs.writeFile(workspace.resolve(`native/keys/${oldID}`),keyBytes);
  assert.equal((await call('nativeInfo')).format,'restic'); assert.deepEqual(await fs.readdir(workspace.resolve('native/locks')),[]);
});

for (const corruption of ['storage hash','blob MAC','header MAC','header type','footer length','plaintext hash','index mismatch']) test(`native restore refuses ${corruption} before creating its destination`,async t => {
  const { workspace,call } = await fixture(t); await fs.mkdir(workspace.resolve('source')); await fs.writeFile(workspace.resolve('source/a.txt'),'Corruption fixture'); await call('nativeInit'); const saved = await call('nativeSnapshot',{ source:'source' });
  if (corruption === 'storage hash') {
    const key = await unlocked(workspace), names = await fs.readdir(workspace.resolve('native/index')), doc = decoded(key,await fs.readFile(workspace.resolve(`native/index/${names[0]}`))), pack = doc.packs.find(p => p.blobs[0].type === 'data');
    const location = workspace.resolve(`native/data/${pack.id.slice(0,2)}/${pack.id}`), bytes = await fs.readFile(location); bytes[16] ^= 1; await fs.writeFile(location,bytes);
  } else await mutatePack(workspace,(bytes,key,pack) => {
    const result = Buffer.from(bytes), headerLength = bytes.readUInt32LE(bytes.length-4), headerStart = bytes.length-4-headerLength;
    if (corruption === 'blob MAC') result[16] ^= 1;
    if (corruption === 'header MAC') result[headerStart+16] ^= 1;
    if (corruption === 'footer length') result.writeUInt32LE(0xffffffff,result.length-4);
    if (corruption === 'header type') { const header = open(key,bytes.subarray(headerStart,-4)); header[0] = 255; seal(key,header).copy(result,headerStart); }
    if (corruption === 'plaintext hash') { const plain = open(key,bytes.subarray(0,headerStart)); plain[0] ^= 1; seal(key,plain).copy(result,0); }
    if (corruption === 'index mismatch') pack.blobs[0].offset = 1;
    return result;
  });
  const pattern = { 'storage hash':/storage SHA-256/,'blob MAC':/authentication failed/,'header MAC':/authentication failed/,'header type':/header record/,'footer length':/header length/,'plaintext hash':/plaintext blob SHA-256/,'index mismatch':/index and authenticated pack header disagree/ }[corruption];
  await assert.rejects(call('nativeRestore',{ id:saved.id,destination:'rejected',confirm:true }),pattern);
  await assert.rejects(fs.lstat(workspace.resolve('rejected')),{ code:'ENOENT' }); assert.deepEqual(await fs.readdir(workspace.resolve('native/locks')),[]);
});

test('snapshot MAC, unknown v2 metadata, and zstd expansion budgets fail before tree processing',async t => {
  const { workspace,call } = await fixture(t); await fs.mkdir(workspace.resolve('source')); await call('nativeInit',{ version:2 }); const saved = await call('nativeSnapshot',{ source:'source' }), key = await unlocked(workspace);
  const original = await fs.readFile(workspace.resolve(`native/snapshots/${saved.id}`)), changed = Buffer.from(original); changed[16] ^= 1;
  let badID = await replaceObject(workspace,'snapshots',saved.id,changed); await assert.rejects(call('nativeInspect',{ id:badID }),/authentication failed/);
  badID = await replaceObject(workspace,'snapshots',badID,seal(key,Buffer.from([3,123,125]))); await assert.rejects(call('nativeList'),/metadata encoding/);
  const inflated = Buffer.alloc(limits.metadata + 1,32), compressed = Buffer.concat([Buffer.from([2]),zstdCompressSync(inflated)]);
  badID = await replaceObject(workspace,'snapshots',badID,seal(key,compressed)); await assert.rejects(call('nativeList'),/larger than|size|length|limit/i);
  await fs.unlink(workspace.resolve(`native/snapshots/${badID}`)); await fs.writeFile(workspace.resolve(`native/snapshots/${saved.id}`),original);
  assert.equal((await call('nativeList')).snapshots.length,1);
});

test('authenticated malformed mtime, atime and ctime are rejected before output; original rejects those trees too',async t => {
  const { workspace,call,original } = await fixture(t,true); await fs.mkdir(workspace.resolve('source')); await call('nativeInit'); let saved = await call('nativeSnapshot',{ source:'source' });
  const cases = ['mtime','atime','ctime'].flatMap(field => [0,'2023-02-30T00:00:00Z','2024-02-29T24:00:00Z'].map(value => ({ field,value })));
  cases.push(...['2023-02-29T00:00:00Z','2023-04-31T00:00:00Z','2024-02-29T12:34:60Z','2024-02-29 12:34:56Z','2024-02-29t12:34:56z'].map(value => ({ field:'mtime',value })));
  for (const [number,{ field,value }] of cases.entries()) {
    const snapshotID = await replaceTree(workspace,saved.id,[{ name:'a.txt',type:'file',size:0,content:[],[field]:value }]); saved = { id:snapshotID };
    await assert.rejects(call('nativeInspect',{ id:snapshotID }),/restic RFC3339/);
    await assert.rejects(call('nativeCheck',{ id:snapshotID }),/restic RFC3339/);
    await assert.rejects(call('nativeRestore',{ id:snapshotID,destination:`rejected-time-${number}`,confirm:true }),/restic RFC3339/);
    await assert.rejects(fs.lstat(workspace.resolve(`rejected-time-${number}`)),{ code:'ENOENT' }); assert.deepEqual(await fs.readdir(workspace.resolve('native/locks')),[]);
    // Bad upstream tree unmarshalling may panic; no-lock prevents an original
    // panic from leaving its own test lock and obscuring app lock cleanup.
    await assert.rejects(original('--no-lock','check','--read-data'),error => { assert.ok(error.code !== 0); assert.match(error.stderr,/Time\.UnmarshalJSON|parsing time|out of range|tree was not read completely/); return true; });
    assert.deepEqual(await fs.readdir(workspace.resolve('native/locks')),[]);
  }
  t.diagnostic(`${cases.length} authenticated bad tree timestamp cases compared with the released original.`);
});

test('malformed snapshot time is rejected by list and every selected action before output, matching original parsing',async t => {
  const { workspace,call,original } = await fixture(t,true); await fs.mkdir(workspace.resolve('source')); await call('nativeInit'); let saved = await call('nativeSnapshot',{ source:'source' });
  const cases = [0,'2023-02-30T00:00:00Z','2024-02-29T24:00:00Z','2024-02-29 12:34:56Z','2024-02-29t12:34:56z'];
  for (const [number,value] of cases.entries()) {
    const snapshotID = await replaceSnapshotTime(workspace,saved.id,value); saved = { id:snapshotID };
    for (const action of ['nativeList','nativeInspect','nativeCheck','nativeRestore']) await assert.rejects(call(action,{ id:snapshotID,destination:`rejected-snapshot-time-${number}`,confirm:true }),/restic RFC3339/);
    await assert.rejects(fs.lstat(workspace.resolve(`rejected-snapshot-time-${number}`)),{ code:'ENOENT' }); assert.deepEqual(await fs.readdir(workspace.resolve('native/locks')),[]);
    await assert.rejects(original('--no-lock','check','--read-data'),error => { assert.ok(error.code !== 0); assert.match(error.stderr,/Time\.UnmarshalJSON|parsing time|out of range/); return true; });
  }
  t.diagnostic(`${cases.length} authenticated bad snapshot time cases compared with the released original.`);
});

test('valid Go time boundaries and permissive encodings match original acceptance and safe Windows mtime restoration',async t => {
  const { workspace,call,original } = await fixture(t,true); await fs.mkdir(workspace.resolve('source')); await call('nativeInit'); let saved = await call('nativeSnapshot',{ source:'source' });
  const cases = [null,'0000-01-01T00:00:00Z','9999-12-31T23:59:59.999999999Z','1969-12-31T23:59:59.999Z','1970-01-01T00:00:00Z','1970-01-01T00:00:00.001Z','2038-01-19T03:14:07.999Z','2106-02-07T06:28:15.999Z','2024-02-29T12:34:56.123456789Z','2024-02-29T12:34:56.1234567890123456789Z','2024-02-29T12:34:56,123456789Z','2024-02-29T2:34:56Z','2024-02-29T12:34:56.123456789+05:45','2024-02-29T12:34:56.123456789-08:00','2024-02-29T12:34:56-00:00','2024-02-29T12:34:56+24:00','2024-02-29T12:34:56+00:60'];
  for (const [number,value] of cases.entries()) {
    const snapshotID = await replaceTree(workspace,saved.id,[{ name:'a.txt',type:'file',size:0,content:[],mtime:value,atime:value,ctime:value }]); saved = { id:snapshotID };
    const expected = resticTime(value); assert.equal((await call('nativeCheck',{ id:snapshotID })).verified,true);
    const inspected = await call('nativeInspect',{ id:snapshotID }); assert.equal(inspected.entries[0].mtime,value === null ? '0001-01-01T00:00:00Z':value);
    assert.deepEqual(await fs.readdir(workspace.resolve('native/locks')),[]); assert.match(await original('--no-lock','check','--read-data'),/no errors were found/);
    const destination = `valid-time-${number}`;
    if (process.platform === 'win32' && (expected < 0 || expected > 4294967295999)) {
      await assert.rejects(call('nativeRestore',{ id:snapshotID,destination,confirm:true }),/supported Windows restore interval/);
      await assert.rejects(fs.lstat(workspace.resolve(destination)),{ code:'ENOENT' });
    } else {
      assert.equal((await call('nativeRestore',{ id:snapshotID,destination,confirm:true })).verified,true);
      assert.ok(Math.abs((await fs.stat(workspace.resolve(`${destination}/a.txt`))).mtimeMs - expected) < 1,`Applied app timestamp ${value}`);
      await original('restore',snapshotID,'--target',workspace.resolve(`oracle-time-${number}`));
      assert.ok(Math.abs((await fs.stat(workspace.resolve(`oracle-time-${number}/a.txt`))).mtimeMs - expected) < 1,`Original timestamp ${value}, measured with millisecond tolerance`);
    }
    assert.deepEqual(await fs.readdir(workspace.resolve('native/locks')),[]);
  }
  const nullSnapshot = await replaceSnapshotTime(workspace,saved.id,null);
  assert.equal((await call('nativeList')).snapshots[0].time,'0001-01-01T00:00:00Z'); assert.equal((await call('nativeCheck',{ id:nullSnapshot })).verified,true);
  assert.equal(JSON.parse(await original('--no-lock','snapshots','--json'))[0].time,'0001-01-01T00:00:00Z');
  assert.equal((await call('nativeRestore',{ id:nullSnapshot,destination:'null-snapshot-time',confirm:true })).verified,true);
  await original('restore',nullSnapshot,'--target',workspace.resolve('oracle-null-snapshot-time'));
  assert.ok(Math.abs((await fs.stat(workspace.resolve('null-snapshot-time/a.txt'))).mtimeMs - resticTime(cases.at(-1))) < 1);
  assert.ok(Math.abs((await fs.stat(workspace.resolve('oracle-null-snapshot-time/a.txt'))).mtimeMs - resticTime(cases.at(-1))) < 1);
  assert.throws(() => resticTime(`2024-02-29T12:34:56.${'1'.repeat(129)}Z`),/timestamp/);
  for (const value of ['2024-02-29T12:34:56+25:00','2024-02-29T12:34:56+00:61']) assert.throws(() => resticTime(value),/calendar or time/);
  t.diagnostic(`${cases.length} authenticated valid tree time cases; original restore compared within the supported platform interval. Null snapshot time also matched original zero-time normalization.`);
});

test('snapshot listing orders timestamps by their instant rather than textual offset or fractional form',async t => {
  const { workspace,call } = await fixture(t); await fs.mkdir(workspace.resolve('source')); await call('nativeInit');
  const earlier = await call('nativeSnapshot',{ source:'source' }), later = await call('nativeSnapshot',{ source:'source' });
  const earlierID = await replaceSnapshotTime(workspace,earlier.id,'2024-02-29T12:00:00+13:00'), laterID = await replaceSnapshotTime(workspace,later.id,'2024-02-29T00:00:00Z');
  assert.deepEqual((await call('nativeList')).snapshots.map(snapshot => snapshot.id),[laterID,earlierID]);
});

for (const variant of ['traversal','case collision','duplicate','unordered','symlink','excessive size','content size']) test(`authenticated native tree ${variant} is rejected before restore output`,async t => {
  const { workspace,call } = await fixture(t); await fs.mkdir(workspace.resolve('source')); await call('nativeInit'); const saved = await call('nativeSnapshot',{ source:'source' }), key = await unlocked(workspace);
  const empty = name => ({ name,type:'file',size:0,content:[],uid:0,gid:0 });
  const nodes = { traversal:[empty('../escape')],'case collision':[empty('A'),empty('a')],duplicate:[empty('a'),empty('a')],unordered:[empty('z'),empty('a')],symlink:[{ name:'link',type:'symlink',linktarget:'../escape',content:null,uid:0,gid:0 }],'excessive size':[{ ...empty('huge'),size:limits.file+1 }],'content size':[{ ...empty('wrong'),size:1 }] }[variant];
  const plaintext = Buffer.from(JSON.stringify({ nodes })+'\n'), treeID = hash(plaintext), payload = seal(key,plaintext), record = Buffer.alloc(37); record[0] = 1; record.writeUInt32LE(payload.length,1); Buffer.from(treeID,'hex').copy(record,5);
  const header = seal(key,record), footer = Buffer.alloc(4); footer.writeUInt32LE(header.length); const pack = Buffer.concat([payload,header,footer]), packID = hash(pack);
  await fs.mkdir(workspace.resolve(`native/data/${packID.slice(0,2)}`),{ recursive:true }); await fs.writeFile(workspace.resolve(`native/data/${packID.slice(0,2)}/${packID}`),pack,{ flag:'wx' });
  const index = seal(key,Buffer.from(JSON.stringify({ packs:[{ id:packID,blobs:[{ id:treeID,type:'tree',offset:0,length:payload.length }] }] }))); await fs.writeFile(workspace.resolve(`native/index/${hash(index)}`),index,{ flag:'wx' });
  const doc = decoded(key,await fs.readFile(workspace.resolve(`native/snapshots/${saved.id}`))); doc.tree = treeID; const snapshotID = await replaceObject(workspace,'snapshots',saved.id,seal(key,Buffer.from(JSON.stringify(doc))));
  const expected = { traversal:/Unsafe/,'case collision':/collide/,duplicate:/unordered or duplicated/,unordered:/unordered or duplicated/,symlink:/Unsupported/, 'excessive size':/Invalid restic file/,'content size':/does not match the declared size/ }[variant];
  await assert.rejects(call('nativeRestore',{ id:snapshotID,destination:'rejected',confirm:true }),expected); await assert.rejects(fs.lstat(workspace.resolve('rejected')),{ code:'ENOENT' });
});

test('native paths, overlapping folders, existing destinations, invalid IDs and confirmations preserve existing data',async t => {
  const { workspace,call } = await fixture(t); await fs.mkdir(workspace.resolve('source')); await fs.writeFile(workspace.resolve('source/a.txt'),'Preserve'); await call('nativeInit'); const saved = await call('nativeSnapshot',{ source:'source' });
  await assert.rejects(call('nativeInit'),/EEXIST/); await assert.rejects(call('nativeInit',{ repository:'.rea-backup/native' }),/separate/);
  await assert.rejects(call('nativeInfo',{ repository:'../outside' }),/Unsafe/); await assert.rejects(call('nativeSnapshot',{ source:'native' }),/separate folders/);
  await assert.rejects(call('nativeSnapshot',{ source:'source',label:1 }),/label/);
  await assert.rejects(call('nativeRestore',{ id:saved.id,destination:'new' }),/confirmation/);
  await assert.rejects(call('nativeRestore',{ id:saved.id,destination:'../escape',confirm:true }),/Unsafe/);
  await assert.rejects(call('nativeRestore',{ id:saved.id,destination:'native/destination',confirm:true }),/outside/);
  await assert.rejects(call('nativeCheck',{ id:saved.id.slice(0,8) }),/full 64/);
  await fs.mkdir(workspace.resolve('existing')); await fs.writeFile(workspace.resolve('existing/keep.txt'),'Existing');
  await assert.rejects(call('nativeRestore',{ id:saved.id,destination:'existing',confirm:true }),/EEXIST/); assert.equal(await fs.readFile(workspace.resolve('existing/keep.txt'),'utf8'),'Existing');
  await assert.rejects(fs.lstat(workspace.resolve('new')),{ code:'ENOENT' });
  const custom = await call('snapshot',{ source:'source',label:'unchanged custom format' }); assert.equal((await call('check',{ id:custom.id })).verified,true); assert.equal((await call('list')).snapshots.length,1); assert.equal((await call('nativeList')).snapshots.length,1);
});

test('native app and original honor authenticated exclusive locks; app never deletes an existing stale lock',async t => {
  const { workspace,call,original } = await fixture(t,true); await call('nativeInit'); const key = await unlocked(workspace);
  const bytes = seal(key,Buffer.from(JSON.stringify({ time:new Date().toISOString(),exclusive:true,hostname:os.hostname(),username:'synthetic-test',pid:process.pid }))), lockID = hash(bytes);
  await fs.writeFile(workspace.resolve(`native/locks/${lockID}`),bytes);
  await assert.rejects(call('nativeList'),/locked/); await assert.rejects(original('snapshots','--json'),/locked/); assert.deepEqual(await fs.readdir(workspace.resolve('native/locks')),[lockID]);
  await fs.unlink(workspace.resolve(`native/locks/${lockID}`));
  const stale = seal(key,Buffer.from(JSON.stringify({ time:'2000-01-01T00:00:00Z',exclusive:true,hostname:'synthetic-stale-host',username:'synthetic-test',pid:999999 }))), staleID = hash(stale);
  await fs.writeFile(workspace.resolve(`native/locks/${staleID}`),stale); await assert.rejects(call('nativeList'),/including stale/); assert.deepEqual(await fs.readdir(workspace.resolve('native/locks')),[staleID]);
});

test('oversized source files are rejected before native snapshot publication',async t => {
  const { workspace,call } = await fixture(t); await fs.mkdir(workspace.resolve('source')); await call('nativeInit');
  const file = await fs.open(workspace.resolve('source/large.bin'),'wx'); try { await file.truncate(limits.file+1); } finally { await file.close(); }
  await assert.rejects(call('nativeSnapshot',{ source:'source' }),/file or total byte limits/); assert.deepEqual(await fs.readdir(workspace.resolve('native/snapshots')),[]); assert.deepEqual(await fs.readdir(workspace.resolve('native/locks')),[]);
});

test('source mutation during native capture aborts publication and releases the app lock',async t => {
  const { workspace,call } = await fixture(t); await fs.mkdir(workspace.resolve('source')); await fs.writeFile(workspace.resolve('source/changing.bin'),Buffer.alloc(4 * 1024 * 1024 + 1,93)); await call('nativeInit');
  const operation = call('nativeSnapshot',{ source:'source' }); const outcome = operation.then(value => ({ value }),error => ({ error }));
  const deadline = Date.now()+10000; let stored = false;
  while (Date.now() < deadline) {
    const shards = await fs.readdir(workspace.resolve('native/data'));
    for (const shard of shards) if ((await fs.readdir(workspace.resolve(`native/data/${shard}`))).length) stored = true;
    if (stored) break; await new Promise(resolve => setTimeout(resolve,5));
  }
  assert.equal(stored,true,'Mutation begins after a real native data pack has been published.');
  await fs.appendFile(workspace.resolve('source/changing.bin'),'changed');
  const result = await outcome; assert.match(result.error?.message ?? '',/changed while being captured/); assert.deepEqual(await fs.readdir(workspace.resolve('native/snapshots')),[]); assert.deepEqual(await fs.readdir(workspace.resolve('native/locks')),[]);
  assert.ok((await fs.readdir(workspace.resolve('native/data'))).length,'Unreferenced immutable packs may remain after an aborted capture; no fake cleanup claim.');
});

test('native HTTP repository, encrypted snapshot and restore persist across host restarts without password records',async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'rea-restic-http-')); let host = await start({ port:0,dataDir:root });
  t.after(async () => { await host.close(); assert.ok(path.basename(root).startsWith('rea-restic-http-')); await fs.rm(root,{ recursive:true,force:true }); });
  const call = async (action,input = {}) => {
    const response = await fetch(`${host.url}/api/backup/${action}`,{ method:'POST',headers:{ 'content-type':'application/json','x-rea-token':host.token },body:JSON.stringify({ repository:'native',password:PASSWORD,...input }) });
    const payload = await response.json(); assert.equal(response.status,200,payload.error); assert.ok(!JSON.stringify(payload).includes(PASSWORD)); return payload.result;
  };
  await call('putFile',{ path:'source/http.txt',content:'Native HTTP fixture' }); await call('nativeInit'); const saved = await call('nativeSnapshot',{ source:'source' });
  await host.close(); host = await start({ port:0,dataDir:root }); assert.equal((await call('nativeList')).snapshots[0].id,saved.id);
  assert.equal((await call('nativeCheck',{ id:saved.id })).verified,true); await call('nativeRestore',{ id:saved.id,destination:'restored',confirm:true });
  assert.equal(await fs.readFile(path.join(root,'backup/workspace/restored/source/http.txt'),'utf8'),'Native HTTP fixture');
  assert.deepEqual(await fs.readdir(path.join(root,'backup/records')),[]);
  const config = await fs.readFile(path.join(root,'backup/workspace/native/config')); assert.ok(!config.includes(Buffer.from(PASSWORD))); assert.ok(!config.includes(Buffer.from('chunker_polynomial')));
});
