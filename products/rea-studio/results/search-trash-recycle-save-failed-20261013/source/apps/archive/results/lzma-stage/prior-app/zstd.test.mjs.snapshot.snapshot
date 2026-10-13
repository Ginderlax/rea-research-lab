import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { zstdCompressSync, zstdDecompressSync, constants, crc32 } from 'node:zlib';
import { makeZstd, readZstd, MAX_ZSTD_INPUT, MAX_ZSTD_FRAMES, MAX_ZSTD_BLOCKS } from './zstd.mjs';
import { makeZip, readZip, MAX_FILE } from './zip.mjs';
import { makeTar, readTar, MAX_CONTAINER } from './tar.mjs';
import { createWorkspace } from '../../lib/storage.mjs';
import { handle } from './server.mjs';
import { start } from '../../server.mjs';
import { installerPath, bootstrapPath } from './bootstrap-original.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url)), lab = path.resolve(directory, '../../../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fixtureHashes = { 'payload.bin': 'b5b8d051cbbf49c16c0cf7e65fe35796601d64449d70938921b9bb368510721e', 'native.zst': '9c4b8c03e5eb7932d349586ecf1e0f379bc021a543792dfb95fb6b5381b3f5ab', 'native.tar.zst': '7e5b29933b77431c8481499f01176058991db7036ad18e711e043218d37458a0', 'native-zip93.zip': 'e9282f76dbd3c080d0e12ef95489458523ebbc65c2951f4b8f3cb880a16c5d8b' };
async function frozen(name) { const bytes = await fs.readFile(path.join(directory, 'fixtures/zstd', name)); assert.equal(sha(bytes), fixtureHashes[name]); return bytes; }
async function temporary(t) { const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rea-zstd-test-')); t.after(async () => { assert.equal(path.dirname(root), path.resolve(os.tmpdir())); assert.ok(path.basename(root).startsWith('rea-zstd-test-')); await fs.rm(root, { recursive: true, force: true }); }); return root; }
function changed(bytes, mutation) { const result = Buffer.from(bytes); mutation(result); return result; }
function skipped(data = Buffer.alloc(0)) { const header = Buffer.alloc(8); header.writeUInt32LE(0x184d2a5f); header.writeUInt32LE(data.length, 4); return Buffer.concat([header, data]); }
// Independent RFC frame construction, rather than round-tripping the writer.
function raw(data, unknownSize = false) { assert.ok(data.length <= 255); const header = Buffer.from([0x28, 0xb5, 0x2f, 0xfd, unknownSize ? 0 : 32, unknownSize ? 0 : data.length]), block = Buffer.alloc(3); block.writeUIntLE(data.length * 8 + 1, 0, 3); return Buffer.concat([header, block, data]); }
function command(exe, args, root, options = {}) { const result = spawnSync(exe, args, { cwd: root, windowsHide: true, timeout: 30000, maxBuffer: 32 * 1024 * 1024, ...options }); assert.equal(result.status, 0, result.stderr?.toString() || result.error?.message || 'Original program failed'); return result.stdout; }
async function completeOracle(root) {
  const container = await fs.readFile(installerPath), bootstrap = await fs.readFile(bootstrapPath);
  assert.equal(sha(container), 'd54bf805f9f3704d1e8db2fa3498ae7ef2df0312b40b558e7c71c734430a665d'); assert.equal(sha(bootstrap), '256feca8e274e5da655e2a284fabafd9f554365eb164862089dacd4e8276d282');
  const oracle = path.join(root, 'oracle'); await fs.mkdir(oracle); const installer = path.join(oracle, 'installer.exe'), extractor = path.join(oracle, '7zr.exe'); await fs.writeFile(installer, container, { flag: 'wx' }); await fs.writeFile(extractor, bootstrap, { flag: 'wx' });
  for (const [name, hash] of [['7z.exe', '95fff19b73eff77c87c0d7bd32822e43fb90dd2932459f962eb532d8dfb6ba53'], ['7z.dll', '899cd73d7fc60e1c1c35c7de0f5bed3dc69bfe2cecbd48014d868a347970a0b1']]) {
    const bytes = command(extractor, ['e', '-so', installer, name], root); assert.equal(sha(bytes), hash); await fs.writeFile(path.join(oracle, name), bytes, { flag: 'wx' });
  }
  return args => command(path.join(oracle, '7z.exe'), args, root);
}
async function bsdtar(root) {
  const bytes = await fs.readFile(path.join(process.env.WINDIR || 'C:/Windows', 'System32/tar.exe')); assert.equal(sha(bytes), '4e598a8cec84af779e3377442fce2b94b976f614ed4c6e5a665e19308fd1e379');
  const exe = path.join(root, 'bsdtar.exe'); await fs.writeFile(exe, bytes, { flag: 'wx' }); assert.match(command(exe, ['--version'], root).toString(), /bsdtar 3\.8\.8.*libzstd\/1\.5\.7/); return args => command(exe, args, root);
}

test('authenticated independent ZSTD, TAR.ZST and ZIP 93 fixtures decode exact bytes', async () => {
  const payload = await frozen('payload.bin'), frame = await frozen('native.zst');
  const result = readZstd(frame); assert.deepEqual(result.data, payload); assert.equal(result.frames[0].checksum, true); assert.deepEqual(zstdDecompressSync(frame), payload);
  assert.deepEqual(readZip(await frozen('native-zip93.zip'), true)[0].data, payload);
  const tar = readTar(readZstd(await frozen('native.tar.zst'), MAX_CONTAINER).data, true); assert.deepEqual(tar.find(e => e.name === 'bytes.bin').data, payload); assert.ok(tar.find(e => e.name === 'empty/').directory);
});
test('ZSTD creation uses genuine compressed frames with checksums across bounded levels', async () => {
  const payload = await frozen('payload.bin');
  for (const level of [1, 3, 9, 19]) { const frame = makeZstd(payload, { level }); assert.ok(frame.length < payload.length / 4); assert.deepEqual(zstdDecompressSync(frame), payload); const own = readZstd(frame); assert.equal(own.frames[0].checksum, true); assert.deepEqual(own.data, payload); }
  assert.deepEqual(readZstd(makeZstd(Buffer.alloc(0)), 0).data, Buffer.alloc(0));
  for (const level of [0, 20, -1, 1.5, NaN]) assert.throws(() => makeZstd(payload, { level }), /level/);
  assert.throws(() => makeZstd(Buffer.alloc(MAX_FILE + 1)), /size limit/);
});
test('independent raw/unknown-size frames, unused flag and all skippable IDs are handled', () => {
  const payload = Buffer.from('independent raw block');
  for (const unknown of [false, true]) assert.deepEqual(readZstd(raw(payload, unknown)).data, payload);
  assert.deepEqual(readZstd(changed(raw(payload), b => { b[4] |= 16; })).data, payload);
  for (let id = 0; id < 16; id++) { const skip = skipped(Buffer.from('ignored metadata')); skip.writeUInt32LE(0x184d2a50 + id); const result = readZstd(Buffer.concat([skip, raw(payload)])); assert.equal(result.frames[0].skippable, true); assert.deepEqual(result.data, payload); }
  assert.deepEqual(readZstd(skipped(), 0).data, Buffer.alloc(0));
});
test('concatenated frames apply cumulative budgets and reject trailing/corrupt later data', () => {
  const first = raw(Buffer.from('first')), second = raw(Buffer.from('second')), bytes = Buffer.concat([first, skipped(Buffer.from('metadata')), second]);
  const result = readZstd(bytes, 11); assert.equal(result.data.toString(), 'firstsecond'); assert.equal(result.frames.length, 3); assert.equal(result.frames.reduce((sum, f) => sum + f.compressedSize, 0), bytes.length);
  assert.throws(() => readZstd(bytes, 10), /size limit/);
  for (const suffix of [Buffer.from([0]), Buffer.from('garbage'), second.subarray(0, -1)]) assert.throws(() => readZstd(Buffer.concat([first, suffix])), /header|trailing|Truncated/);
  const checked = makeZstd(Buffer.from('checksummed')); assert.throws(() => readZstd(changed(checked, b => { b[b.length - 1] ^= 1; })), /checksum/);
  assert.throws(() => readZstd(Buffer.concat([first, changed(checked, b => { b[b.length - 1] ^= 1; })])), /checksum/);
});
test('ZSTD rejects all truncations, reserved flags/blocks, dictionaries and invalid sizes', () => {
  const bytes = makeZstd(Buffer.from('A repeatable checksum and compressed payload.'.repeat(30)));
  for (let end = 0; end < bytes.length; end++) assert.throws(() => readZstd(bytes.subarray(0, end)), 'Truncated byte ' + end);
  assert.throws(() => readZstd(changed(raw(Buffer.from('x')), b => { b[4] |= 8; })), /Reserved/);
  assert.throws(() => readZstd(changed(raw(Buffer.from('x')), b => { b[6] = 7; })), /block/);
  assert.throws(() => readZstd(changed(raw(Buffer.from('x')), b => { b[5] = 0; })), /block|size|corrupt/);
  assert.throws(() => readZstd(Buffer.from([0x28,0xb5,0x2f,0xfd,33,1,1,9,0,0,65])), /dictionaries/);
  const bigWindow = Buffer.from([0x28,0xb5,0x2f,0xfd,0,136,1,0,0]); assert.throws(() => readZstd(bigWindow), /window/);
  const bigSize = Buffer.alloc(16); bigSize.writeUInt32LE(0xfd2fb528); bigSize[4] = 224; bigSize.writeBigUInt64LE(0xffffffffffffffffn, 5); assert.throws(() => readZstd(bigSize), /size limit/);
  assert.throws(() => readZstd(changed(skipped(), b => b.writeUInt32LE(0xffffffff, 4))), /Truncated/);
  for (const size of [-1, NaN, 0.1, MAX_ZSTD_INPUT + 1]) assert.throws(() => readZstd(bytes, size), /size limit/);
  assert.throws(() => readZstd(Buffer.alloc(MAX_ZSTD_INPUT + 1)), /container size/);
});
test('ZSTD bounds frame/block counts and unknown-size expansion before destination writes', async t => {
  assert.throws(() => readZstd(Buffer.concat(Array.from({ length: MAX_ZSTD_FRAMES + 1 }, () => skipped())), 0), /too many frames/);
  const blocks = Buffer.concat([Buffer.from([0x28,0xb5,0x2f,0xfd,32,0]), Buffer.alloc((MAX_ZSTD_BLOCKS + 1) * 3)]); assert.throws(() => readZstd(blocks), /too many blocks/);
  const oversized = zstdCompressSync(Buffer.alloc(MAX_FILE + 1), { params: { [constants.ZSTD_c_contentSizeFlag]: 0 } }); assert.throws(() => readZstd(oversized), /size limit/);
  const root = await temporary(t), workspace = await createWorkspace(path.join(root, 'workspace'));
  await fs.writeFile(workspace.resolve('oversized.zst'), oversized, { flag: 'wx' }); await assert.rejects(handle({ action: 'extract', workspace, input: { path: 'oversized.zst', destination: 'blocked', confirm: true } }), /size limit/); await assert.rejects(fs.stat(workspace.resolve('blocked')), /ENOENT/);
});
test('ZIP method 93 coexists with ZIP64, descriptors, binary/Unicode/empty members and CRC verification', async () => {
  const entries = [{ name: 'café/雪.bin', data: await frozen('payload.bin') }, { name: 'empty.txt', data: Buffer.alloc(0) }, { name: 'empty/', data: Buffer.alloc(0), directory: true }];
  for (const zip64 of [false, true]) for (const dataDescriptor of [false, true]) { const bytes = makeZip(entries, 'zstd', { zip64, dataDescriptor, level: 3 }); const read = readZip(bytes, true); assert.equal(read[0].method, 'zstd'); assert.equal(read[0].zip64, zip64); assert.equal(read[0].dataDescriptor, dataDescriptor); for (const entry of entries) assert.deepEqual(read.find(e => e.name === entry.name).data, entry.data); assert.equal(read[0].crc32, crc32(entries[0].data).toString(16).padStart(8, '0')); }
  const original = await frozen('native-zip93.zip'), central = original.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
  assert.throws(() => readZip(changed(original, b => { b.writeUInt16LE(20, 8); b.writeUInt16LE(20, central + 10); })), /unsupported/);
  assert.throws(() => readZip(changed(original, b => { b.writeUInt32LE(0, 14); b.writeUInt32LE(0, central + 16); })), /CRC/);
  assert.throws(() => readZip(changed(original, b => { b[central - 1] ^= 1; })), /corrupt/);
  const tail = Buffer.concat([original.subarray(0, central), Buffer.from([0]), original.subarray(central)]); tail.writeUInt32LE(original.readUInt32LE(18) + 1, 18); tail.writeUInt32LE(original.readUInt32LE(central + 20) + 1, central + 1 + 20); tail.writeUInt32LE(central + 1, tail.length - 22 + 16); assert.throws(() => readZip(tail), /corrupt/);
});
test('HTTP ZSTD, TAR.ZST and ZIP 93 creation/list/test/extraction persist through restart', async t => {
  const dataDir = await temporary(t); let host = await start({ port: 0, dataDir }); t.after(() => host.close());
  async function call(action, input, expected = 200) { const response = await fetch(host.url + '/api/archive/' + action, { method: 'POST', headers: { 'content-type': 'application/json', 'x-rea-token': host.token }, body: JSON.stringify(input) }); const payload = await response.json(); assert.equal(response.status, expected, payload.error); return payload.result ?? payload; }
  await call('putFile', { path: 'source/hello.txt', content: 'Persistent Zstandard 🌍' });
  const modified = new Date('2024-01-15T18:23:42.000Z'); await fs.utimes(path.join(dataDir, 'archive/workspace/source/hello.txt'), modified, modified);
  const cases = [['zstd', 'hello.zst', 'source/hello.txt'], ['tzst', 'bundle.tar.zst', 'source'], ['tzst', 'alias.tzst', 'source'], ['zip', 'bundle.zip', 'source']];
  for (const [format, output, source] of cases) await call('create', { format, output, source, compression: 'zstd', zip64: true, level: 3 });
  await host.close(); host = await start({ port: 0, dataDir });
  for (const [format, output, source] of cases) {
    const listed = await call('list', { path: output }); assert.equal(listed.format, format); assert.equal((await call('test', { path: output })).verified, true);
    const destination = output.replaceAll('.', '-') + '-restored'; await call('extract', { path: output, destination, confirm: true });
    const filename = format === 'zstd' ? 'hello' : 'hello.txt'; assert.equal(await fs.readFile(path.join(dataDir, 'archive/workspace', destination, filename), 'utf8'), 'Persistent Zstandard 🌍');
    if (format !== 'zstd') { assert.equal(listed.entries[0].modifiedAt, modified.toISOString()); assert.equal((await fs.stat(path.join(dataDir, 'archive/workspace', destination, filename))).mtime.toISOString(), modified.toISOString()); }
    const before = await fs.readFile(path.join(dataDir, 'archive/workspace', output)); await call('create', { format, output, source, compression: 'zstd' }, 400); assert.deepEqual(await fs.readFile(path.join(dataDir, 'archive/workspace', output)), before); await call('extract', { path: output, destination, confirm: true }, 400);
  }
  await call('create', { format: 'zstd', source: 'source', output: 'directory.zst' }, 400); await call('create', { format: 'zstd', source: 'source/hello.txt', output: 'wrong.tar.zst' }, 400); await call('extract', { path: 'hello.zst', destination: 'unconfirmed' }, 400); await assert.rejects(fs.stat(path.join(dataDir, 'archive/workspace/unconfirmed')), /ENOENT/);
  const client = await (await fetch(host.url + '/apps/archive/client.mjs')).text(); assert.match(client, /TAR\.ZST/); assert.match(client, /Zstandard \(one file\)/);
});
test('malformed later ZSTD frames and unsafe TAR.ZST entries reject before filesystem extraction', async t => {
  const root = await temporary(t), workspace = await createWorkspace(path.join(root, 'workspace'));
  const valid = makeZstd(Buffer.from('first')), badSecond = changed(makeZstd(Buffer.from('second')), b => { b[b.length - 1] ^= 1; });
  const tar = makeTar([{ name: 'safe', data: Buffer.from('x') }]); Buffer.from('../x').copy(tar); tar.fill(32, 148, 156); const sum = tar.subarray(0,512).reduce((n,b) => n + b, 0); tar.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
  for (const [filename, bytes] of [['bad.zst', Buffer.concat([valid, badSecond])], ['unsafe.tar.zst', makeZstd(tar, { maxOutput: MAX_CONTAINER })]]) { await fs.writeFile(workspace.resolve(filename), bytes, { flag: 'wx' }); await assert.rejects(handle({ action: 'extract', workspace, input: { path: filename, destination: filename + '-restored', confirm: true } })); await assert.rejects(fs.stat(workspace.resolve(filename + '-restored')), /ENOENT/); }
  assert.equal((await fs.readdir(workspace.root)).some(name => name.includes('.partial-')), false);
});
test('authenticated complete 7-Zip and bsdtar verify ZSTD/TAR.ZST/ZIP93 bytes and independent ingestion', { skip: process.platform !== 'win32' && 'Pinned Windows originals unavailable.' }, async t => {
  const root = await temporary(t), native = await completeOracle(root), tar = await bsdtar(root), payload = await frozen('payload.bin');
  const entries = [{ name: 'bytes.bin', data: payload }, { name: 'café/雪.txt', data: Buffer.from('Unicode pathname payload 🌍') }, { name: 'empty/', directory: true, data: Buffer.alloc(0) }];
  for (const [filename, bytes] of [['own.zst', makeZstd(payload)], ['own.zip', makeZip(entries, 'zstd')], ['own64.zip', makeZip(entries, 'zstd', { zip64: true, dataDescriptor: true })]]) { const target = path.join(root, filename); await fs.writeFile(target, bytes, { flag: 'wx' }); native(['t', '-bd', target]); if (filename.endsWith('.zst')) assert.deepEqual(native(['x', '-so', target]), payload); else for (const entry of entries.filter(e => !e.directory)) assert.deepEqual(native(['x', '-so', target, entry.name]), entry.data); }
  const ownTar = makeTar(entries), ownCompressed = path.join(root, 'own.tar.zst'); await fs.writeFile(ownCompressed, makeZstd(ownTar, { maxOutput: MAX_CONTAINER }), { flag: 'wx' }); native(['t', '-bd', ownCompressed]); const unpackedTar = native(['x', '-so', ownCompressed]); assert.deepEqual(unpackedTar, ownTar); const inner = path.join(root, 'inner.tar'); await fs.writeFile(inner, unpackedTar, { flag: 'wx' }); native(['t', '-bd', inner]); for (const entry of entries.filter(e => !e.directory)) assert.deepEqual(native(['x', '-so', inner, entry.name]), entry.data);
  const source = path.join(root, 'source'); await fs.mkdir(path.join(source, 'empty'), { recursive: true }); await fs.writeFile(path.join(source, 'bytes.bin'), payload, { flag: 'wx' });
  const reference = path.join(root, 'new-native.zst'); tar(['--format=raw', '--zstd', '-cf', reference, '-C', source, 'bytes.bin']); assert.deepEqual(readZstd(await fs.readFile(reference)).data, payload); native(['t', '-bd', reference]); assert.deepEqual(native(['x', '-so', reference]), payload);
  const referenceTar = path.join(root, 'new-native.tar.zst'); tar(['--format=pax', '--zstd', '-cf', referenceTar, '-C', source, '.']); assert.deepEqual(readTar(readZstd(await fs.readFile(referenceTar), MAX_CONTAINER).data, true).find(e => e.name === 'bytes.bin').data, payload);
  native(['t', '-bd', referenceTar]); const nativeTar = native(['x', '-so', referenceTar]); assert.deepEqual(nativeTar, readZstd(await fs.readFile(referenceTar), MAX_CONTAINER).data); const referenceInner = path.join(root, 'new-native-inner.tar'); await fs.writeFile(referenceInner, nativeTar, { flag: 'wx' }); native(['t', '-bd', referenceInner]); assert.deepEqual(native(['x', '-so', referenceInner, './bytes.bin']), payload);
  for (const filename of ['native.zst', 'native.tar.zst', 'native-zip93.zip']) { const target = path.join(root, filename); await fs.writeFile(target, await frozen(filename), { flag: 'wx' }); native(['t', '-bd', target]); if (filename === 'native.zst') assert.deepEqual(native(['x', '-so', target]), payload); if (filename.endsWith('.zip')) assert.deepEqual(native(['x', '-so', target, 'bytes.bin']), payload); if (filename === 'native.tar.zst') { const originalTar = native(['x', '-so', target]); assert.deepEqual(originalTar, readZstd(await frozen(filename), MAX_CONTAINER).data); const targetInner = path.join(root, 'frozen-native-inner.tar'); await fs.writeFile(targetInner, originalTar, { flag: 'wx' }); native(['t', '-bd', targetInner]); assert.deepEqual(native(['x', '-so', targetInner, './bytes.bin']), payload); } }
  const concatenated = path.join(root, 'concat.zst'); await fs.writeFile(concatenated, Buffer.concat([makeZstd(Buffer.from('first')), skipped(Buffer.from('metadata')), makeZstd(Buffer.from('second'))]), { flag: 'wx' }); native(['t', '-bd', concatenated]); assert.equal(native(['x', '-so', concatenated]).toString(), 'firstsecond');
});
