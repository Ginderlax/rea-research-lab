import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, utimesSync, readdirSync, statSync, mkdtempSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { deflateRawSync, crc32 as nativeCRC32 } from 'node:zlib';
import { read7z, write7z, encodeNumber, decodeNumber, crc32, LIMITS } from './sevenzip.mjs';
import { installerPath, bootstrapPath } from './bootstrap-original.mjs';
import { start } from '../../server.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const lab = join(root, '../../../..'), runRoot = join(lab, '.local/sevenzip-tests'); mkdirSync(runRoot, { recursive: true });
const run = mkdtempSync(join(runRoot, 'run-')), oracle = join(run, 'oracle'); mkdirSync(oracle);
const original = join(oracle, '7z.exe');
const digest = b => createHash('sha256').update(b).digest('hex');
const originalHashes = {
  '7z.exe': '95fff19b73eff77c87c0d7bd32822e43fb90dd2932459f962eb532d8dfb6ba53',
  '7z.dll': '899cd73d7fc60e1c1c35c7de0f5bed3dc69bfe2cecbd48014d868a347970a0b1'
};
const installer = readFileSync(installerPath), bootstrap = readFileSync(bootstrapPath);
assert.equal(installer.length, 1664082); assert.equal(digest(installer), 'd54bf805f9f3704d1e8db2fa3498ae7ef2df0312b40b558e7c71c734430a665d');
assert.equal(bootstrap.length, 602624); assert.equal(digest(bootstrap), '256feca8e274e5da655e2a284fabafd9f554365eb164862089dacd4e8276d282');
const extractor = join(oracle, '7zr.exe'); writeFileSync(extractor, bootstrap, { flag: 'wx' });
for (const [name, hash] of Object.entries(originalHashes)) {
  const result = spawnSync(extractor, ['e', '-so', installerPath, name], { cwd: run, timeout: 30000, windowsHide: true, maxBuffer: 4 * 1024 ** 2 });
  assert.equal(result.status, 0, result.stderr?.toString()); assert.equal(digest(result.stdout), hash, `authenticated original ${name}`);
  writeFileSync(join(oracle, name), result.stdout, { flag: 'wx' });
}
const source = join(run, 'source'); mkdirSync(source);
const fixedTime = Date.parse('2022-05-06T07:08:09.123Z');
const files = [
  { name: 'docs', directory: true, data: Buffer.alloc(0), mtimeMs: fixedTime },
  { name: 'docs/repeated.txt', data: Buffer.from('genuine .7z DEFLATE exchange\n'.repeat(2500)), mtimeMs: fixedTime },
  { name: '日本語-😀.bin', data: Buffer.from(Array.from({ length: 65539 }, (_, i) => (i * 13 + (i >>> 5)) & 255)), mtimeMs: fixedTime },
  { name: 'empty.txt', data: Buffer.alloc(0), mtimeMs: fixedTime },
  { name: 'empty-dir', directory: true, data: Buffer.alloc(0), mtimeMs: fixedTime }
];
for (const file of files.filter(f => f.directory)) mkdirSync(join(source, file.name), { recursive: true });
for (const file of files.filter(f => !f.directory)) writeFileSync(join(source, file.name), file.data);
for (const file of files) utimesSync(join(source, file.name), fixedTime / 1000, fixedTime / 1000);
function cli(args, cwd = run) {
  const result = spawnSync(original, args, { cwd, encoding: 'utf8', timeout: 30000, windowsHide: true });
  assert.equal(result.status, 0, `${args.join(' ')}\n${result.stdout}\n${result.stderr}`); return result.stdout;
}
function compared(actual, expected = files, checkTime = true) {
  const a = [...actual].sort((a, b) => a.name.localeCompare(b.name)), e = [...expected].sort((a, b) => a.name.localeCompare(b.name));
  assert.deepEqual(a.map(f => [f.name, f.directory]), e.map(f => [f.name, Boolean(f.directory)]));
  for (let i = 0; i < a.length; i++) {
    assert.equal(digest(a[i].data), digest(e[i].data), a[i].name);
    if (checkTime) assert.ok(Math.abs(a[i].mtimeMs - e[i].mtimeMs) <= 1, `time ${a[i].name}: ${a[i].mtimeMs}`);
  }
}
function diskFiles(dir, prefix = '') {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name), info = statSync(path), relative = prefix + name;
    const e = { name: relative, directory: info.isDirectory(), mtimeMs: Math.trunc(info.mtimeMs), data: info.isDirectory() ? Buffer.alloc(0) : readFileSync(path) };
    return info.isDirectory() ? [e, ...diskFiles(path, `${relative}/`)] : [e];
  });
}
const recorded = [];
function retain(path, producer, extra = {}) {
  const bytes = readFileSync(path); recorded.push({ path: path.slice(run.length + 1).replaceAll('\\', '/'), bytes: bytes.length, sha256: digest(bytes), producer, ...extra });
}
test('UINT64 encodings include all lengths and upper boundary', () => {
  for (let i = 0; i <= 63; i++) for (const n of [1n << BigInt(i), (1n << BigInt(i)) - 1n]) assert.equal(decodeNumber(encodeNumber(n)), n);
  assert.equal(decodeNumber(encodeNumber(0xffffffffffffffffn)), 0xffffffffffffffffn);
  assert.throws(() => decodeNumber(Buffer.from([0xff, 0])), /truncated/);
  assert.throws(() => encodeNumber(1n << 64n), /UINT64/);
});
for (const method of ['copy', 'deflate', 'lzma2-store']) for (const solid of [false, true]) {
  test(`candidate ${method}, solid=${solid}, exchanges exact files and timestamps with original`, () => {
    const archive = write7z(files, { method, solid }); compared(read7z(archive));
    const name = `candidate-${method}-${solid}.7z`, path = join(run, name); writeFileSync(path, archive);
    cli(['t', path]); const out = join(run, `out-${name}`); cli(['x', '-y', `-o${out}`, path]); compared(diskFiles(out));
    if (method === 'deflate') assert.ok(archive.length < 10000, 'genuine compression');
    retain(path, 'candidate native codec', { method, solid });
  });
}
for (const method of ['Copy', 'Deflate']) for (const solid of ['off', 'on']) {
  test(`original ${method}, solid=${solid}, decodes with exact files and timestamps`, () => {
    const path = join(run, `original-${method}-${solid}.7z`);
    cli(['a', '-t7z', `-m0=${method}`, `-ms=${solid}`, '-mhc=off', path, '.'], source);
    compared(read7z(readFileSync(path))); retain(path, 'authenticated complete original 7-Zip 26.04', { method, solid, args: [`-m0=${method}`, `-ms=${solid}`, '-mhc=off'] });
  });
}
test('candidate supported compressed header is accepted by original and reader', () => {
  const path = join(run, 'candidate-encoded.7z'), archive = write7z(files, { encodedHeader: true, solid: true });
  writeFileSync(path, archive); compared(read7z(archive)); cli(['t', path]);
  const out = join(run, 'out-encoded'); cli(['x', '-y', `-o${out}`, path]); compared(diskFiles(out)); retain(path, 'candidate native codec', { encodedHeader: 'DEFLATE' });
});
test('default original LZMA2 data and LZMA encoded header extract exact bytes', () => {
  const path = join(run, 'original-default.7z'); cli(['a', '-t7z', path, '.'], source);
  compared(read7z(readFileSync(path)));
  retain(path, 'authenticated complete original 7-Zip 26.04', { candidate_result: 'exact extraction', args: ['-t7z defaults'] });
  const plain = join(run, 'original-default-plain-header.7z'); cli(['a', '-t7z', '-mhc=off', plain, '.'], source);
  compared(read7z(readFileSync(plain)));
  retain(plain, 'authenticated complete original 7-Zip 26.04', { candidate_result: 'exact compressed LZMA2 extraction', args: ['-t7z', '-mhc=off', 'default data coder'] });
});
test('original multiple alignment properties and optional creation/access times decode', () => {
  for (const count of [1, 2, 3, 4, 7, 8, 9, 16, 17]) {
    const dir = join(run, `alignment-source-${count}`); mkdirSync(dir);
    const expected = Array.from({ length: count }, (_, i) => ({ name: `f-${i}${i % 2 ? '-文' : ''}`, data: Buffer.from(`value-${i}`), mtimeMs: fixedTime }));
    for (const file of expected) { writeFileSync(join(dir, file.name), file.data); utimesSync(join(dir, file.name), fixedTime / 1000, fixedTime / 1000); }
    const path = join(run, `original-alignment-${count}.7z`); cli(['a', '-t7z', '-m0=Deflate', '-mhc=off', '-mtc=on', '-mta=on', path, '.'], dir);
    compared(read7z(readFileSync(path)), expected); retain(path, 'authenticated complete original 7-Zip 26.04', { files: count, metadata: 'Creation/access/modified times and repeated Dummy alignment' });
  }
});
test('candidate metadata bitmaps beyond one byte and undefined timestamps are compatible', () => {
  const input = Array.from({ length: 129 }, (_, i) => ({ name: `entry-${i}`, directory: i % 11 === 0,
    data: i % 11 === 0 || i % 3 === 0 ? B() : Buffer.from(`content-${i}`), mtimeMs: i % 2 ? fixedTime : null }));
  const archive = write7z(input, { solid: true }); const actual = read7z(archive);
  assert.deepEqual(actual.map(f => [f.name, f.directory, f.mtimeMs, digest(f.data)]), input.map(f => [f.name, f.directory, f.mtimeMs, digest(f.data)]));
  const path = join(run, 'candidate-bitmaps-129.7z'); writeFileSync(path, archive); cli(['t', path]);
  const out = join(run, 'out-bitmaps-129'); cli(['x', '-y', `-o${out}`, path]); compared(diskFiles(out), input, false);
  const extracted = new Map(diskFiles(out).map(f => [f.name, f]));
  for (const file of input.filter(f => f.mtimeMs !== null)) assert.ok(Math.abs(extracted.get(file.name).mtimeMs - file.mtimeMs) <= 1);
  retain(path, 'candidate native codec', { files: 129, partial_mtime_bitmap: true, solid: true });
});
test('empty archive, empty streams, omitted and pre-1970 timestamps', () => {
  assert.deepEqual(read7z(write7z([])), []);
  compared(read7z(write7z([{ name: 'zero', data: Buffer.alloc(0), mtimeMs: -1000 }])) , [{ name: 'zero', data: Buffer.alloc(0), mtimeMs: -1000 }]);
  assert.equal(read7z(write7z([{ name: 'file', data: Buffer.from('x') }]))[0].mtimeMs, null);
  const empty = Buffer.alloc(32); Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c, 0, 4]).copy(empty); empty.writeUInt32LE(crc32(empty.subarray(12)), 8);
  assert.deepEqual(read7z(empty), []);
});
test('signature/start/header/packed CRC corruption and trailing concatenation fail', () => {
  const original = write7z(files, { method: 'copy' });
  for (const pos of [0, 8, 28, 32, original.length - 1]) { const b = Buffer.from(original); b[pos] ^= 1; assert.throws(() => read7z(b), /7z:/, `corruption ${pos}`); }
  for (const suffix of [Buffer.from([0]), original]) assert.throws(() => read7z(Buffer.concat([original, suffix])), /trailing/);
  const giant = Buffer.from(original); giant.writeBigUInt64LE(0xffffffffffffffffn, 12); giant.writeUInt32LE(crc32(giant.subarray(12, 32)), 8);
  assert.throws(() => read7z(giant), /bounds/);
});
test('writer refuses unsafe or ambiguous paths and bounded inputs', () => {
  for (const name of ['../x', 'C:/x', '/x', 'a\\b', 'NUL.txt', 'name. ', 'a//b', 'x\0y', '\ud800']) assert.throws(() => write7z([{ name }]), /unsafe|UTF-16/);
  for (const input of [[{ name: 'A' }, { name: 'a' }], [{ name: 'a', data: Buffer.from('x') }, { name: 'a/b' }]]) assert.throws(() => write7z(input), /colli/);
  assert.throws(() => write7z([{ name: 'oversize', data: Buffer.alloc(LIMITS.file + 1) }]), /bound/);
  assert.throws(() => write7z(Array.from({ length: LIMITS.entries + 1 }, (_, i) => ({ name: `f${i}` }))), /count/);
  assert.throws(() => write7z([{ name: 'date', mtimeMs: 2000000000000000 }]), /timestamp/);
});
test('direct codec checks accepted byte types and bounds before copying input', () => {
  const hostileArray = new Proxy([], { get(target, key) { if (key === 'length') throw new Error('must not allocate/read array'); return Reflect.get(target, key); } });
  assert.throws(() => read7z(hostileArray), /Buffer or Uint8Array/);
  assert.throws(() => write7z([{ name: 'bad', data: hostileArray }]), /Buffer or Uint8Array/);
  assert.throws(() => read7z('not bytes'), /Buffer or Uint8Array/);
  assert.throws(() => write7z([{ name: 'bad', data: 'text' }]), /Buffer or Uint8Array/);
  const tooLarge = new Uint8Array(LIMITS.file + 1); tooLarge[Symbol.iterator] = () => { throw new Error('must not copy oversized bytes'); };
  assert.throws(() => write7z([{ name: 'bad', data: tooLarge }]), /input size/);
  class LyingBytes extends Uint8Array { get byteLength() { return 0; } }
  assert.throws(() => write7z([{ name: 'bad', data: new LyingBytes(LIMITS.file + 1) }]), /input size/);
  const block = Buffer.alloc(LIMITS.file), entries = Array.from({ length: 5 }, (_, i) => ({ name: `file-${i}`, data: block }));
  assert.throws(() => write7z(entries), /input size/);
  const archive = write7z([{ name: 'typed', data: Uint8Array.of(1, 2, 3) }]); assert.deepEqual(read7z(new Uint8Array(archive))[0].data, Buffer.from([1, 2, 3]));
});
// Minimal ordinary envelopes independently constructed directly from the
// format notes. CRC calculation uses Node's separate CRC implementation.
const B = (...values) => Buffer.from(values);
const N = n => encodeNumber(n);
const U32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
function property(id, data) { return Buffer.concat([B(id), N(data.length), data]); }
function envelope(header, payload = Buffer.alloc(0)) {
  const signature = Buffer.alloc(32); B(0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c, 0, 4).copy(signature);
  signature.writeBigUInt64LE(BigInt(payload.length), 12); signature.writeBigUInt64LE(BigInt(header.length), 20);
  signature.writeUInt32LE(nativeCRC32(header), 28); signature.writeUInt32LE(nativeCRC32(signature.subarray(12)), 8);
  return Buffer.concat([signature, payload, header]);
}
function ordinaryFixture({ name = 'file', raw = Buffer.from('test'), packed = raw, method = B(0), properties = B(),
  folderSize = raw.length, packCRC = nativeCRC32(packed), folderCRC = nativeCRC32(raw), attr = 32,
  extra = B(), suffix = B(), subInfo = B(8, 0), names = [name], empty = false } = {}) {
  const streams = empty ? B() : Buffer.concat([B(4, 6, 0, 1, 9), N(packed.length), B(10, 1), U32(packCRC), B(0, 7, 11, 1, 0, 1),
    B(method.length | (properties.length ? 32 : 0)), method, ...(properties.length ? [N(properties.length), properties] : []),
    B(12), N(folderSize), B(10, 1), U32(folderCRC), B(0), subInfo, B(0)]);
  const fileProps = [property(17, Buffer.concat([B(0), ...names.map(n => Buffer.from(`${n}\0`, 'utf16le'))]))];
  if (empty) fileProps.push(property(14, B(0x80)), property(15, B(0x80)));
  if (attr !== null) fileProps.push(property(21, Buffer.concat([B(1, 0), ...names.map(() => U32(attr))])));
  fileProps.push(extra);
  return envelope(Buffer.concat([B(1), streams, B(5), N(names.length), ...fileProps, B(0, 0), suffix]), empty ? B() : packed);
}
test('reader verifies independent pack, folder and solid substream CRCs', () => {
  assert.equal(read7z(ordinaryFixture())[0].data.toString(), 'test');
  assert.throws(() => read7z(ordinaryFixture({ packCRC: 1 })), /packed stream CRC/);
  assert.throws(() => read7z(ordinaryFixture({ folderCRC: 1 })), /folder CRC/);
  const subInfo = Buffer.concat([B(8, 13, 2, 9, 2, 10, 1), U32(nativeCRC32(Buffer.from('te'))), U32(nativeCRC32(Buffer.from('st'))), B(0)]);
  assert.deepEqual(read7z(ordinaryFixture({ names: ['first', 'second'], subInfo })).map(f => f.data.toString()), ['te', 'st']);
  const corrupt = Buffer.from(subInfo); corrupt[7] ^= 1;
  assert.throws(() => read7z(ordinaryFixture({ names: ['first', 'second'], subInfo: corrupt })), /file CRC/);
});
test('reader refuses malformed counts, out-of-bound sizes and unassigned data', () => {
  assert.throws(() => read7z(ordinaryFixture({ folderSize: LIMITS.total + 1 })), /bound/);
  assert.throws(() => read7z(ordinaryFixture({ folderSize: LIMITS.file + 1 })), /file size/);
  assert.throws(() => read7z(ordinaryFixture({ suffix: B(0) })), /trailing header/);
  assert.throws(() => read7z(ordinaryFixture({ names: ['first', 'second'] })), /file\/stream/);
  assert.throws(() => read7z(ordinaryFixture({ subInfo: B(8, 13, 2, 0) })), /missing solid/);
  assert.throws(() => read7z(envelope(B(1, 5, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff))), /file count/);
  assert.throws(() => read7z(envelope(B(1, 0), B(5))), /unreferenced/);
});
test('reader validates filesystem names, anti-items, attributes and repeated alignment', () => {
  for (const name of ['../file', 'D:/file', 'x\\y', '\ud800']) assert.throws(() => read7z(ordinaryFixture({ name })), /path|UTF-16/);
  assert.throws(() => read7z(ordinaryFixture({ attr: 0xa0008000 })), /links and special/);
  assert.throws(() => read7z(ordinaryFixture({ attr: 16 })), /contradicts/);
  assert.throws(() => read7z(ordinaryFixture({ empty: true, extra: property(16, B(0x80)) })), /anti-files/);
  assert.throws(() => read7z(ordinaryFixture({ extra: property(17, B(0, 0, 0)) })), /duplicate file/);
  assert.equal(read7z(ordinaryFixture({ extra: Buffer.concat([property(25, B(0, 0)), property(25, B(0))]) })).length, 1);
  assert.throws(() => read7z(ordinaryFixture({ extra: property(25, B(1)) })), /Dummy/);
  const developerProperty = Buffer.concat([N(0x3f123456789a0001n), N(3), B(1, 2, 3)]);
  assert.equal(read7z(ordinaryFixture({ extra: developerProperty })).length, 1);
});
test('raw DEFLATE rejects trailing bytes and output inconsistent with headers', () => {
  const raw = Buffer.from('test'), packed = deflateRawSync(raw), method = B(4, 1, 8);
  assert.equal(read7z(ordinaryFixture({ packed, method }))[0].data.toString(), 'test');
  assert.throws(() => read7z(ordinaryFixture({ packed: Buffer.concat([packed, B(0)]), method })), /trailing DEFLATE/);
  assert.throws(() => read7z(ordinaryFixture({ packed, method, folderSize: 1 })), /invalid DEFLATE/);
  assert.throws(() => read7z(ordinaryFixture({ packed, method, folderSize: 5 })), /output size/);
});
test('uncompressed LZMA2 enforces reset, controls, terminator, dictionary and exact output', () => {
  const options = { method: B(0x21), properties: B(0), packed: B(1, 0, 3, 0x74, 0x65, 0x73, 0x74, 0) };
  assert.equal(read7z(ordinaryFixture(options))[0].data.toString(), 'test');
  for (const packed of [B(2, 0, 3, 0x74, 0x65, 0x73, 0x74, 0), B(3), B(1, 0, 3, 0x74), B(1, 0, 3, 0x74, 0x65, 0x73, 0x74), B(0, 0)]) {
    assert.throws(() => read7z(ordinaryFixture({ ...options, packed })), /reset|control|truncated|trailing|output size/);
  }
  assert.throws(() => read7z(ordinaryFixture({ ...options, properties: B(40) })), /dictionary/);
  assert.throws(() => read7z(ordinaryFixture({ ...options, properties: B(41) })), /properties/);
  assert.throws(() => read7z(ordinaryFixture({ ...options, packed: B(0x80) })), /reset|truncated/);
  assert.throws(() => read7z(ordinaryFixture({ ...options, packed: B(0) })), /output size/);
});
test('7Z HTTP creation, listing, solid metadata, extraction and restart persistence', async t => {
  const dataDir = join(run, 'http-data'); let host = await start({ port: 0, dataDir }); t.after(() => host.close());
  const workspace = join(dataDir, 'archive/workspace');
  async function call(action, input, expected = 200) {
    const response = await fetch(`${host.url}/api/archive/${action}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-rea-token': host.token }, body: JSON.stringify(input) });
    const payload = await response.json(); assert.equal(response.status, expected, payload.error); return payload.result ?? payload;
  }
  await call('putFile', { path: 'source/雪.txt', content: 'Native 7Z HTTP exchange 🌍\n'.repeat(500) });
  await call('putFile', { path: 'source/empty', content: '' });
  await call('putFile', { path: 'source/second.bin', content: 'Second independent member\n'.repeat(300) });
  await fs.mkdir(join(workspace, 'source/empty-dir')); const sourceFiles = diskFiles(join(workspace, 'source'));
  for (const compression of ['deflate', 'store']) for (const solid of [false, true]) {
    const output = `${compression}-${solid}.7z`, destination = `restored-${compression}-${solid}`;
    const created = await call('create', { format: 'sevenzip', source: 'source', output, compression, solid, level: 6 });
    assert.equal(created.entries, 4); if (compression === 'deflate') assert.ok(created.bytes < created.originalBytes / 4);
    const listing = await call('list', { path: output }); assert.equal(listing.format, 'sevenzip'); assert.equal(listing.verified, true);
    assert.equal(JSON.stringify(listing).includes('"data"'), false);
    assert.equal(listing.entries.find(e => e.name === '雪.txt').solid, solid);
    assert.equal(listing.entries.find(e => e.name === '雪.txt').method, compression);
    assert.equal(listing.entries.find(e => e.name === '雪.txt').contentChecksum, true);
    if (solid) assert.equal(listing.entries.find(e => e.name === '雪.txt').compressedSize, null);
    await call('extract', { path: output, destination, confirm: true }); compared(diskFiles(join(workspace, destination)), sourceFiles);
    await call('extract', { path: output, destination, confirm: true }, 400);
    await call('create', { format: 'sevenzip', source: 'source', output }, 400);
    cli(['t', join(workspace, output)]);
  }
  await host.close(); host = await start({ port: 0, dataDir });
  assert.equal((await call('test', { path: 'deflate-true.7z' })).verified, true);
  await call('extract', { path: 'deflate-true.7z', destination: 'after-restart', confirm: true }); compared(diskFiles(join(workspace, 'after-restart')), sourceFiles);
  await call('create', { format: 'sevenzip', source: 'source', output: 'wrong.zip' }, 400);
  await call('create', { format: 'sevenzip', source: 'source', output: 'unsupported.7z', compression: 'ppmd' }, 400);
  await call('extract', { path: 'deflate-true.7z', destination: 'unconfirmed' }, 400);
  await assert.rejects(fs.stat(join(workspace, 'unconfirmed')), /ENOENT/);
  const client = await (await fetch(host.url + '/apps/archive/client.mjs')).text(); assert.match(client, /\['sevenzip','7Z'\]/); assert.match(client, /genuine LZMA2, LZMA/);
});
test('7Z HTTP refuses malformed archives before any extraction writes', async t => {
  const dataDir = join(run, 'http-refusal'), host = await start({ port: 0, dataDir }); t.after(() => host.close()); const workspace = join(dataDir, 'archive/workspace');
  const valid = write7z([{ name: 'safe', data: Buffer.from('test') }]); const corrupt = Buffer.from(valid); corrupt[32] ^= 1;
  const samples = [['bad.7z', corrupt], ['trailing.7z', Buffer.concat([valid, valid])], ['unsafe.7z', ordinaryFixture({ name: '../outside' })],
    ['link.7z', ordinaryFixture({ attr: 0xa0008000 })], ['large.7z', ordinaryFixture({ folderSize: LIMITS.file + 1 })]];
  for (const [name, bytes] of samples) {
    await fs.writeFile(join(workspace, name), bytes, { flag: 'wx' });
    for (const action of ['list', 'test', 'extract']) {
      const response = await fetch(`${host.url}/api/archive/${action}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-rea-token': host.token }, body: JSON.stringify({ path: name, destination: `${name}-out`, confirm: true }) });
      assert.equal(response.status, 400, `${name}: ${action}`);
    }
    await assert.rejects(fs.stat(join(workspace, `${name}-out`)), /ENOENT/);
  }
  assert.equal((await fs.readdir(workspace)).some(n => n.includes('.partial-')), false);
  await assert.rejects(fs.stat(join(dataDir, 'archive/outside')), /ENOENT/);
});
test.after(() => {
  writeFileSync(join(run, 'fixtures-manifest.json'), JSON.stringify({ schema: 1, created: new Date().toISOString(), originalHashes,
    runtime: process.version, fixtures: recorded, comparisons: 'Exact normalized names/type, SHA256 content and millisecond modified time; original CLI test and extraction both checked.' }, null, 2) + '\n');
  console.log(`Retained independent exchange fixtures and manifest: ${run}`);
});
