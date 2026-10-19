import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { crc32 as zlibCrc32, deflateRawSync, gzipSync, gunzipSync } from 'node:zlib';
import { makeTar, readTar, MAX_CONTAINER } from './tar.mjs';
import { makeGzip, readGzip } from './gzip.mjs';
import { handle } from './server.mjs';
import { createWorkspace } from '../../lib/storage.mjs';

const FILE_LIMIT = 16 * 1024 * 1024, TOTAL_LIMIT = 64 * 1024 * 1024;
const lab = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const artifacts = path.join(lab, 'projects/08-7zip/artifacts');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const longName = `long-${'x'.repeat(180)}.txt`;
const entries = [
  { name: 'bytes.bin', data: Buffer.from(Array.from({ length: 4096 }, (_, i) => i % 256)), modifiedAt: '2020-04-05T06:07:08.321Z', accessedAt: '2021-04-05T06:07:08.123Z' },
  { name: 'café/', directory: true, data: Buffer.alloc(0), modifiedAt: '2020-04-05T06:07:08.321Z' },
  { name: 'café/雪-🌍.txt', data: Buffer.from('Independent format exchange 🌍'), modifiedAt: '2020-04-05T06:07:08.321Z' },
  { name: longName, data: Buffer.from('Long PAX pathname'), modifiedAt: '2020-04-05T06:07:08.321Z' },
  { name: 'empty.txt', data: Buffer.alloc(0) },
  { name: 'empty/', directory: true, data: Buffer.alloc(0), modifiedAt: '2020-04-05T06:07:08.321Z' }
];

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rea-native-formats-'));
  t.after(async () => { assert.equal(path.dirname(root), path.resolve(os.tmpdir())); assert.ok(path.basename(root).startsWith('rea-native-formats-')); await fs.rm(root, { recursive: true, force: true }); });
  return root;
}
async function writeSource(root, values = entries) {
  for (const entry of values) { const target = path.join(root, ...entry.name.replace(/\/$/, '').split('/')); if (entry.directory) await fs.mkdir(target, { recursive: true }); else { await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, entry.data, { flag: 'wx' }); } }
  for (const entry of [...values].sort((a, b) => b.name.length - a.name.length)) if (entry.modifiedAt) { const date = new Date(entry.modifiedAt); await fs.utimes(path.join(root, ...entry.name.replace(/\/$/, '').split('/')), date, date); }
}
function command(executable, args, cwd, options = {}) {
  const result = spawnSync(executable, args, { cwd, maxBuffer: 8 * 1024 * 1024, windowsHide: true, timeout: 20000, ...options });
  assert.equal(result.status, 0, result.stderr?.toString() || result.error?.message || `Native command exited ${result.status}`); return result.stdout;
}
async function sevenZip(root) {
  // Read and authenticate bytes once, then invoke only private test copies.
  const [archive, extractor] = await Promise.all([fs.readFile(path.join(artifacts, '7z2604-extra.7z')), fs.readFile(path.join(artifacts, '7zr.exe'))]);
  assert.equal(sha(archive), 'dc4b11d3399db18b063630137145f5585d8f7ac847bf3639bd1185d7d1f7cee0');
  assert.equal(sha(extractor), '256feca8e274e5da655e2a284fabafd9f554365eb164862089dacd4e8276d282');
  const directory = path.join(root, 'oracle-7zip'); await fs.mkdir(directory);
  const container = path.join(directory, 'preserved-extra.7z'), bootstrap = path.join(directory, '7zr.exe'); await fs.writeFile(container, archive, { flag: 'wx' }); await fs.writeFile(bootstrap, extractor, { flag: 'wx' });
  const bytes = command(bootstrap, ['e', '-so', container, 'x64/7za.exe'], root);
  assert.equal(sha(bytes), '15d4c788c148e3677e2fc1c4a01f191fb6669eba4f6acf8a465f0f1a6f1e1260');
  const executable = path.join(directory, '7za.exe'); await fs.writeFile(executable, bytes, { flag: 'wx' }); return args => command(executable, args, root);
}
async function bsdtar(root) {
  const original = path.join(process.env.WINDIR || 'C:/Windows', 'System32/tar.exe'); const bytes = await fs.readFile(original);
  assert.equal(sha(bytes), '4e598a8cec84af779e3377442fce2b94b976f614ed4c6e5a665e19308fd1e379', 'The recorded Windows bsdtar oracle changed; rebind explicitly before claiming this comparison.');
  const executable = path.join(root, 'oracle-bsdtar.exe'); await fs.writeFile(executable, bytes, { flag: 'wx' }); assert.match(command(executable, ['--version'], root).toString(), /bsdtar 3\.8\.8 - libarchive 3\.8\.8/);
  return args => command(executable, args, root);
}
function compareEntries(actual, expected = entries, prefix = '') {
  for (const entry of expected) { const found = actual.find(value => value.name === prefix + entry.name); assert.ok(found, `Missing ${prefix + entry.name}`); assert.equal(found.directory, !!entry.directory); assert.deepEqual(found.data, entry.data, entry.name); }
}
function octal(bytes, at, width, value) { bytes.write(Number(value).toString(8).padStart(width - 1, '0') + '\0', at, width, 'ascii'); }
function repairChecksum(bytes, offset = 0, signed = false) {
  bytes.fill(32, offset + 148, offset + 156); let sum = 0; for (const byte of bytes.subarray(offset, offset + 512)) sum += signed && byte > 127 ? byte - 256 : byte;
  bytes.write(sum.toString(8).padStart(6, '0') + '\0 ', offset + 148, 8, 'ascii'); return bytes;
}
function base256(value, width) {
  const range = 1n << BigInt(width * 8 - 1); let encoded = BigInt(value); if (encoded < 0) encoded += range;
  const bytes = Buffer.alloc(width); for (let at = width - 1; at >= 0; at--) { bytes[at] = Number(encoded & 255n); encoded >>= 8n; } bytes[0] |= 128; return bytes;
}
function tarHeader(name, { type = '0', size = 0, mtime = 0, prefix = '', size256, time256, signed = false } = {}) {
  const bytes = Buffer.alloc(512); Buffer.from(name).copy(bytes, 0, 0, 100); octal(bytes, 100, 8, type === '5' ? 0o755 : 0o644); octal(bytes, 108, 8, 0); octal(bytes, 116, 8, 0); octal(bytes, 124, 12, size); octal(bytes, 136, 12, mtime); bytes[156] = type.charCodeAt(0); bytes.write('ustar\0', 257); bytes.write('00', 263); Buffer.from(prefix).copy(bytes, 345, 0, 155); if (size256 !== undefined) base256(size256, 12).copy(bytes, 124); if (time256 !== undefined) base256(time256, 12).copy(bytes, 136); return repairChecksum(bytes, 0, signed);
}
function tarChunk(name, data = Buffer.alloc(0), options = {}) { return Buffer.concat([tarHeader(name, { size: data.length, ...options }), data, Buffer.alloc((512 - data.length % 512) % 512)]); }
function tarFile(...chunks) { return Buffer.concat([...chunks, Buffer.alloc(1024)]); }
function pax(key, value) {
  const payload = Buffer.from(`${key}=${value}\n`); for (let digits = 1; digits <= 10; digits++) { const length = payload.length + digits + 1; if (String(length).length === digits) return Buffer.concat([Buffer.from(`${length} `), payload]); } throw new Error('Fixture PAX length exceeded');
}
function mutate(bytes, fn) { const copy = Buffer.from(bytes); fn(copy); return copy; }
function optionalGzip(data, { name = 'café.bin', comment = 'Synthetic comment', extra = Buffer.from([0x52, 0x45, 3, 0, 7, 8, 9]), headerCrc = true, text = true } = {}) {
  const fixed = Buffer.from([31, 139, 8, (extra ? 4 : 0) | (name !== undefined ? 8 : 0) | (comment !== undefined ? 16 : 0) | (headerCrc ? 2 : 0) | (text ? 1 : 0), 0, 0, 0, 0, 0, 3]); fixed.writeUInt32LE(1586066828, 4);
  const fields = [fixed]; if (extra) { const size = Buffer.alloc(2); size.writeUInt16LE(extra.length); fields.push(size, extra); } if (name !== undefined) fields.push(Buffer.from(name, 'latin1'), Buffer.alloc(1)); if (comment !== undefined) fields.push(Buffer.from(comment, 'latin1'), Buffer.alloc(1));
  const header = Buffer.concat(fields); if (headerCrc) { const crc = Buffer.alloc(2); crc.writeUInt16LE(zlibCrc32(header) & 65535); fields.push(crc); }
  const trailer = Buffer.alloc(8); trailer.writeUInt32LE(zlibCrc32(data), 0); trailer.writeUInt32LE(data.length, 4); return { bytes: Buffer.concat([...fields, deflateRawSync(data), trailer]), headerLength: header.length + (headerCrc ? 2 : 0) };
}

test('TAR/PAX round trips binary, Unicode, long paths, empty files/directories and fractional/negative dates', () => {
  const generated = makeTar(entries); compareEntries(readTar(generated, true)); const inspected = readTar(generated); assert.equal(inspected[0].data, undefined); assert.equal(inspected[0].modifiedAt, entries[0].modifiedAt); assert.equal(inspected[0].accessedAt, entries[0].accessedAt); assert.equal(generated.length % 512, 0); assert.ok(generated.subarray(-1024).every(value => value === 0));
  const old = makeTar([{ name: 'before-epoch', data: Buffer.from('historical'), modifiedAt: '1969-12-31T23:59:59.125Z' }]); assert.equal(readTar(old, true)[0].modifiedAt, '1969-12-31T23:59:59.125Z');
  assert.deepEqual(readTar(makeTar([])), []);
});

test('TAR writer uses PAX when modification time exceeds the ustar octal field', () => {
  for (const modifiedAt of ['2242-03-16T12:56:31.000Z', '2242-03-16T12:56:32.000Z', '2300-01-01T00:00:00.000Z', '2300-01-01T00:00:00.123Z', '1900-01-01T00:00:00.123Z']) { const bytes = makeTar([{ name: 'future', data: Buffer.from('timestamp range'), modifiedAt }]); const result = readTar(bytes, true); assert.equal(result[0].modifiedAt, modifiedAt); assert.equal(result[0].data.toString(), 'timestamp range'); }
});

test('independent ustar prefix, GNU long-name, global/local PAX and deletion records determine metadata', () => {
  const prefix = 'directory/'.repeat(8).replace(/\/$/, ''); const regular = tarFile(tarChunk('leaf.txt', Buffer.from('prefix'), { prefix })); assert.equal(readTar(regular, true)[0].name, `${prefix}/leaf.txt`);
  const name = `café/${longName}`; const gnu = tarFile(tarChunk('././@LongLink', Buffer.from(name + '\0'), { type: 'L' }), tarChunk('fallback', Buffer.from('gnu'))); assert.equal(readTar(gnu, true)[0].name, name);
  const global = Buffer.concat([pax('mtime', '123.5'), pax('atime', '222.125')]); const local = Buffer.concat([pax('path', '雪.txt'), pax('mtime', '456.789')]);
  const archive = tarFile(tarChunk('global', global, { type: 'g' }), tarChunk('local', local, { type: 'x' }), tarChunk('fallback', Buffer.from('local')), tarChunk('clear', Buffer.concat([pax('mtime', ''), pax('atime', '')]), { type: 'x' }), tarChunk('header-time', Buffer.from('clear'), { mtime: 99 }), tarChunk('global-time', Buffer.from('global')));
  const values = readTar(archive, true); assert.equal(values[0].name, '雪.txt'); assert.equal(values[0].modifiedAt, '1970-01-01T00:07:36.789Z'); assert.equal(values[0].accessedAt, '1970-01-01T00:03:42.125Z'); assert.equal(values[1].modifiedAt, '1970-01-01T00:01:39.000Z'); assert.equal(values[1].accessedAt, undefined); assert.equal(values[2].modifiedAt, '1970-01-01T00:02:03.500Z');
});

test('TAR accepts signed historical checksums and safe base-256 sizes/times, rejects negative/unsafe integers', () => {
  const values = readTar(tarFile(tarChunk('é.bin', Buffer.from([0, 255, 5]), { signed: true, size256: 3, time256: -1 })), true); assert.equal(values[0].modifiedAt, '1969-12-31T23:59:59.000Z'); assert.deepEqual(values[0].data, Buffer.from([0, 255, 5]));
  for (const size of [-1n, BigInt(Number.MAX_SAFE_INTEGER) + 1n]) assert.throws(() => readTar(tarFile(tarChunk('unsafe', Buffer.alloc(0), { size256: size }))), /size|range/i);
  assert.throws(() => readTar(tarFile(tarChunk('bad-time', Buffer.alloc(0), { time256: BigInt(Number.MAX_SAFE_INTEGER) + 1n }))), /range/);
});

test('TAR refuses header checksum errors, malformed octal, truncation and incorrect end records', () => {
  const valid = tarFile(tarChunk('a', Buffer.from('data')));
  assert.throws(() => readTar(mutate(valid, bytes => { bytes[0] ^= 1; })), /checksum/);
  assert.throws(() => readTar(mutate(valid, bytes => { bytes[124] = 57; repairChecksum(bytes); })), /octal/);
  assert.throws(() => readTar(valid.subarray(0, valid.length - 1)), /size/);
  assert.throws(() => readTar(valid.subarray(0, valid.length - 1024)), /end record/);
  assert.throws(() => readTar(valid.subarray(0, valid.length - 512)), /end padding/);
  assert.throws(() => readTar(mutate(valid, bytes => { bytes[bytes.length - 1] = 1; })), /end padding/);
  assert.throws(() => readTar(tarFile(tarHeader('truncated', { size: 10000 }))), /truncated/);
});

test('PAX rejects malformed byte lengths, delimiters, UTF-8, numeric size/time and sparse metadata', () => {
  const bad = [Buffer.from('99 path=a\n'), Buffer.from('x path=a\n'), Buffer.from('0 path=a\n'), Buffer.from('10 path=a!'), Buffer.from('7 nope\n'), Buffer.from('11 path=\0a\n'), Buffer.from([49, 50, 32, 112, 97, 116, 104, 61, 255, 255, 255, 10])];
  for (const data of bad) assert.throws(() => readTar(tarFile(tarChunk('pax', data, { type: 'x' }), tarChunk('a'))), /PAX|encoded data|encoding/i);
  for (const [key, value] of [['size', '1.5'], ['size', '-1'], ['size', 'Infinity'], ['mtime', 'NaN'], ['mtime', '9007199254740991'], ['atime', 'bad'], ['GNU.sparse.map', '0,1'], ['SCHILY.realsize', '1'], ['SCHILY.filetype', 'sparse']]) assert.throws(() => readTar(tarFile(tarChunk('pax', pax(key, value), { type: 'x' }), tarChunk('a', Buffer.from('x')))), /PAX|timestamp|size limit|Sparse/);
  assert.throws(() => readTar(tarFile(tarChunk('pax', pax('path', 'a'), { type: 'x' }))), /end record/);
});

test('TAR rejects unsafe, duplicate, case-colliding and file/directory-colliding paths before extracting', () => {
  for (const name of ['../outside', '/absolute', 'C:/drive', 'a\\b', 'a//b', 'a/../b', 'CON', 'NUL.txt', 'a:stream', 'trailing.', 'space ']) { assert.throws(() => readTar(tarFile(tarChunk(name))), /unsafe|relative|unsupported path/); assert.throws(() => makeTar([{ name, data: Buffer.alloc(0) }]), /unsafe|relative|unsupported path/); }
  for (const name of ['../metadata-escape', '/absolute-metadata', 'C:/metadata-drive']) { assert.throws(() => readTar(tarFile(tarChunk('pax', pax('path', name), { type: 'x' }), tarChunk('safe'))), /unsafe|relative|unsupported path/); assert.throws(() => readTar(tarFile(tarChunk('gnu', Buffer.from(name + '\0'), { type: 'L' }), tarChunk('safe'))), /unsafe|relative|unsupported path/); }
  for (const list of [[['a', false], ['A', false]], [['folder', false], ['folder/child', false]], [['a', false], ['a/', true]]]) { const chunks = list.map(([name, directory]) => tarChunk(name, Buffer.alloc(0), { type: directory ? '5' : '0' })); assert.throws(() => readTar(tarFile(...chunks)), /Duplicate|both a file/); assert.throws(() => makeTar(list.map(([name, directory]) => ({ name, directory, data: Buffer.alloc(0) }))), /Duplicate|both a file/); }
  for (const type of ['1', '2', '3', '4', '6', '7', 'S']) assert.throws(() => readTar(tarFile(tarChunk('unsupported', Buffer.alloc(0), { type }))), /Linked|unsupported/);
  assert.throws(() => readTar(tarFile(tarChunk('directory/', Buffer.from('x'), { type: '5' }))), /size limit/);
});

test('TAR enforces per-file, cumulative, container, metadata and entry-count bounds', () => {
  assert.equal(MAX_CONTAINER, 96 * 1024 * 1024);
  assert.throws(() => makeTar([{ name: 'large', data: Buffer.alloc(FILE_LIMIT + 1) }]), /size limit/);
  assert.throws(() => readTar(tarFile(tarHeader('large', { size: FILE_LIMIT + 1 }))), /size limit/);
  const block = Buffer.alloc(FILE_LIMIT); const maxFiles = Array.from({ length: 4 }, (_, i) => tarChunk(`file-${i}`, block)); const total = tarFile(...maxFiles, tarChunk('overflow', Buffer.from([1]))); assert.ok(total.length < MAX_CONTAINER); assert.throws(() => readTar(total), /size limit/);
  assert.throws(() => readTar(Buffer.alloc(MAX_CONTAINER + 512)), /size/);
  assert.throws(() => readTar(tarFile(tarChunk('metadata', Buffer.alloc(65537), { type: 'x' }))), /metadata/);
  assert.throws(() => makeTar(Array.from({ length: 10001 }, (_, i) => ({ name: `file-${i}`, data: Buffer.alloc(0) }))), /entries/);
});

test('GZIP writer exchanges binary data with Node and retains Latin-1 names/comments/header CRC and dates', () => {
  for (const level of [0, 1, 6, 9]) { const bytes = makeGzip(entries[0].data, { level, name: 'café.bin', comment: 'Comment é', headerCrc: true, modifiedAt: '2020-04-05T06:07:08.999Z' }); assert.deepEqual(gunzipSync(bytes), entries[0].data); const result = readGzip(bytes); assert.equal(result.members.length, 1); assert.equal(result.members[0].name, 'café.bin'); assert.equal(result.members[0].comment, 'Comment é'); assert.equal(result.members[0].modifiedAt, '2020-04-05T06:07:08.000Z'); assert.equal(result.members[0].crc32, zlibCrc32(entries[0].data).toString(16).padStart(8, '0')); }
  assert.deepEqual(readGzip(makeGzip(Buffer.alloc(0)), 0).data, Buffer.alloc(0));
  for (const options of [{ level: -1 }, { level: 10 }, { name: 'bad/filename' }, { name: 'a\\b' }, { name: '雪' }, { comment: 'null\0comment' }, { modifiedAt: '1969-12-31T23:59:59Z' }, { modifiedAt: '2106-02-07T06:28:16Z' }, { modifiedAt: 'bad' }]) assert.throws(() => makeGzip(Buffer.from('x'), options));
});

test('independent GZIP optional extra/name/comment/headerCRC/text fields and concatenated members decode', () => {
  const first = optionalGzip(entries[0].data), second = optionalGzip(Buffer.from('second'), { name: 'second.txt', comment: '', extra: Buffer.alloc(0), text: false }); const third = gzipSync(Buffer.alloc(0));
  assert.deepEqual(gunzipSync(first.bytes), entries[0].data); const result = readGzip(Buffer.concat([first.bytes, second.bytes, third])); assert.equal(result.members.length, 3); assert.equal(result.members[0].name, 'café.bin'); assert.equal(result.members[0].comment, 'Synthetic comment'); assert.equal(result.members[1].comment, ''); assert.deepEqual(result.data, Buffer.concat([entries[0].data, Buffer.from('second')])); assert.equal(result.members.reduce((sum, member) => sum + member.compressedSize, 0), first.bytes.length + second.bytes.length + third.length);
});

test('GZIP rejects reserved flags, wrong methods, corrupt header CRC/content/trailers and all truncations', () => {
  const optional = optionalGzip(Buffer.from('header-and-body')); const bytes = optional.bytes;
  for (const flag of [32, 64, 128]) assert.throws(() => readGzip(mutate(bytes, value => { value[3] |= flag; })), /header/);
  assert.throws(() => readGzip(mutate(bytes, value => { value[2] = 0; })), /header/);
  assert.throws(() => readGzip(mutate(bytes, value => { value[optional.headerLength - 1] ^= 1; })), /header CRC/);
  for (const offset of [bytes.length - 8, bytes.length - 4]) assert.throws(() => readGzip(mutate(bytes, value => { value[offset] ^= 1; })), /trailer/);
  assert.throws(() => readGzip(mutate(bytes, value => { value[optional.headerLength] = 255; })), /compressed data/);
  for (let end = 0; end < bytes.length; end++) assert.throws(() => readGzip(bytes.subarray(0, end)), `Truncation at ${end} must reject`);
  assert.throws(() => readGzip(Buffer.concat([bytes, Buffer.from([1])])), /header/);
  const badExtra = Buffer.from([31, 139, 8, 4, 0, 0, 0, 0, 0, 3, 255, 255, 0, 0, 0, 0, 0, 0]); assert.throws(() => readGzip(badExtra), /extra field/);
  const badName = Buffer.concat([Buffer.from([31, 139, 8, 8, 0, 0, 0, 0, 0, 3]), Buffer.alloc(4097, 65), Buffer.alloc(1), gzipSync(Buffer.from('x')).subarray(10)]); assert.throws(() => readGzip(badName), /filename|comment/);
});

test('GZIP expansion budgets apply cumulatively across members and reject oversized input/options', () => {
  const member = gzipSync(Buffer.from('1234567890')); assert.equal(readGzip(Buffer.concat([member, member]), 20).data.length, 20); assert.throws(() => readGzip(Buffer.concat([member, member]), 19), /size limit/); assert.throws(() => readGzip(member, 0), /size limit/);
  for (const bound of [-1, NaN, 1.5, MAX_CONTAINER + 1]) assert.throws(() => readGzip(member, bound), /size/);
  assert.throws(() => readGzip(gzipSync(Buffer.alloc(FILE_LIMIT + 1))), /size limit/); assert.throws(() => makeGzip(Buffer.alloc(FILE_LIMIT + 1)), /size limit/); assert.throws(() => readGzip(Buffer.alloc(MAX_CONTAINER + 1)), /size/);
});

test('server creates/lists/tests/extracts TAR, TAR.GZ, TGZ and raw GZIP without overwriting existing outputs/destinations', async t => {
  const root = await fixture(t), workspace = await createWorkspace(path.join(root, 'workspace')), call = (action, input) => handle({ action, input, workspace }); await writeSource(workspace.resolve('source'));
  for (const [format, filename] of [['tar', 'archive.tar'], ['tgz', 'archive.tar.gz'], ['tgz', 'archive.tgz']]) {
    const created = await call('create', { format, source: 'source', output: filename, level: 9 }); assert.equal(created.format, format); assert.equal(created.entries, entries.length); const listed = await call('list', { path: filename }); assert.equal(listed.format, format); assert.equal(listed.verified, true); assert.equal((await call('test', { path: filename })).totalBytes, entries.reduce((sum, item) => sum + item.data.length, 0));
    const destination = `restored-${filename.replaceAll('.', '-')}`; await call('extract', { path: filename, destination, confirm: true });
    for (const entry of entries) { const location = workspace.resolve(`${destination}/${entry.name.replace(/\/$/, '')}`); if (entry.directory) assert.ok((await fs.stat(location)).isDirectory()); else assert.deepEqual(await fs.readFile(location), entry.data); if (entry.modifiedAt) assert.ok(Math.abs((await fs.stat(location)).mtimeMs - new Date(entry.modifiedAt).getTime()) < 1); }
    await fs.writeFile(workspace.resolve(`${destination}/preserved.txt`), 'existing destination'); const before = await fs.readFile(workspace.resolve(filename)); await assert.rejects(call('extract', { path: filename, destination, confirm: true }), /existing/); await assert.rejects(call('create', { format, source: 'source', output: filename }), /EEXIST/); assert.deepEqual(await fs.readFile(workspace.resolve(filename)), before); assert.equal(await fs.readFile(workspace.resolve(`${destination}/preserved.txt`), 'utf8'), 'existing destination');
  }
  const created = await call('create', { format: 'gzip', source: 'source/bytes.bin', output: 'bytes.gz', comment: 'server GZIP' }); assert.equal(created.format, 'gzip'); const inspected = await call('list', { path: 'bytes.gz' }); assert.equal(inspected.entries[0].name, 'bytes.bin'); assert.equal(inspected.members[0].comment, 'server GZIP'); await call('extract', { path: 'bytes.gz', destination: 'restored-gzip', confirm: true }); assert.deepEqual(await fs.readFile(workspace.resolve('restored-gzip/bytes.bin')), entries[0].data);
  await assert.rejects(call('create', { format: 'gzip', source: 'source', output: 'directory.gz' }), /regular file/); await assert.rejects(call('create', { format: 'gzip', source: 'source/bytes.bin', output: 'wrong.tar.gz' }), /extension/); await assert.rejects(call('create', { format: 'tar', source: 'source', output: 'wrong.zip' }), /extension/); await assert.rejects(call('extract', { path: 'archive.tar', destination: 'unconfirmed' }), /confirmation/); await assert.rejects(fs.stat(workspace.resolve('unconfirmed')), /ENOENT/);
});

test('server rejects unsafe/malformed TAR and GZIP before creating extraction files', async t => {
  const root = await fixture(t), workspace = await createWorkspace(path.join(root, 'workspace')), call = (action, input) => handle({ action, input, workspace });
  const bad = [['traversal.tar', tarFile(tarChunk('../escaped'))], ['collision.tar', tarFile(tarChunk('file'), tarChunk('file/child'))], ['checksum.tar', mutate(tarFile(tarChunk('safe')), bytes => { bytes[0] ^= 1; })], ['unsafe.gz', optionalGzip(Buffer.from('safe'), { name: '../escaped' }).bytes], ['content.gz', mutate(gzipSync(Buffer.from('safe')), bytes => { bytes[bytes.length - 8] ^= 1; })]];
  for (const [filename, bytes] of bad) { await fs.writeFile(workspace.resolve(filename), bytes); await assert.rejects(call('list', { path: filename })); const destination = filename + '-destination'; await assert.rejects(call('extract', { path: filename, destination, confirm: true })); await assert.rejects(fs.stat(workspace.resolve(destination)), /ENOENT/); }
  assert.equal((await fs.readdir(workspace.root)).some(name => name.includes('.partial-')), false); await assert.rejects(fs.stat(path.join(root, 'escaped')), /ENOENT/);
});

test('server concatenates GZIP members under the first safe filename and validates later trailers before writing', async t => {
  const root = await fixture(t), workspace = await createWorkspace(path.join(root, 'workspace')), call = (action, input) => handle({ action, input, workspace });
  const first = optionalGzip(Buffer.from('first'), { name: 'joined.bin' }).bytes, second = optionalGzip(Buffer.from('second'), { name: '../ignored-member-name' }).bytes; await fs.writeFile(workspace.resolve('members.gz'), Buffer.concat([first, second]));
  const listed = await call('list', { path: 'members.gz' }); assert.equal(listed.members.length, 2); assert.equal(listed.entries[0].name, 'joined.bin'); assert.equal(listed.entries[0].size, 11); await call('extract', { path: 'members.gz', destination: 'joined', confirm: true }); assert.equal(await fs.readFile(workspace.resolve('joined/joined.bin'), 'utf8'), 'firstsecond'); await assert.rejects(fs.stat(path.join(root, 'ignored-member-name')), /ENOENT/);
  await fs.writeFile(workspace.resolve('bad-members.gz'), Buffer.concat([first, mutate(second, bytes => { bytes[bytes.length - 8] ^= 1; })])); await assert.rejects(call('extract', { path: 'bad-members.gz', destination: 'bad-joined', confirm: true }), /trailer/); await assert.rejects(fs.stat(workspace.resolve('bad-joined')), /ENOENT/);
});

test('pinned original 7-Zip authenticates and exchanges TAR/PAX and raw GZIP in both directions', { skip: process.platform !== 'win32' && 'Pinned Windows original 7-Zip oracle unavailable.' }, async t => {
  const root = await fixture(t), native = await sevenZip(root); const own = path.join(root, 'own-pax.tar'); await fs.writeFile(own, makeTar(entries)); native(['t', '-bd', own]); for (const entry of entries.filter(value => !value.directory)) assert.deepEqual(native(['x', '-so', own, entry.name]), entry.data);
  const source = path.join(root, 'source'); await writeSource(source); const originalTar = path.join(root, 'original.tar'); native(['a', '-ttar', '-bd', originalTar, 'source']); compareEntries(readTar(await fs.readFile(originalTar), true), entries, 'source/');
  // Record observed differences rather than silently treating the native dates
  // as equal: this preserved 7-Zip executable wraps PAX seconds to uint32.
  const timestampComparisons = [['2300-01-01T00:00:00.000Z', '2027-10-18T11:03:28.000Z'], ['2300-01-01T00:00:00.123Z', '2027-10-18T11:03:28.123Z'], ['1900-01-01T00:00:00.123Z', '2036-02-07T06:28:16.123Z']];
  for (const [index, [modifiedAt, observed]] of timestampComparisons.entries()) { const filename = path.join(root, `timestamp-${index}.tar`), destination = path.join(root, `timestamp-restored-${index}`); await fs.writeFile(filename, makeTar([{ name: 'future', data: Buffer.from('native timestamp'), modifiedAt }])); native(['t', '-bd', filename]); native(['x', '-bd', '-y', `-o${destination}`, filename]); assert.equal(await fs.readFile(path.join(destination, 'future'), 'utf8'), 'native timestamp'); const actual = (await fs.stat(path.join(destination, 'future'))).mtime.toISOString(); assert.equal(actual, observed); t.diagnostic(`Pinned 7-Zip timestamp input=${modifiedAt} restored=${actual}; full timestamp parity not established`); }
  const ownGzip = path.join(root, 'own.gz'); await fs.writeFile(ownGzip, makeGzip(entries[0].data, { name: 'bytes.bin', comment: 'Native oracle fixture', headerCrc: true })); native(['t', '-bd', ownGzip]); assert.deepEqual(native(['x', '-so', ownGzip]), entries[0].data);
  const optional = path.join(root, 'optional.gz'); await fs.writeFile(optional, optionalGzip(entries[0].data).bytes); native(['t', '-bd', optional]); assert.deepEqual(native(['x', '-so', optional]), entries[0].data);
  const concatenated = path.join(root, 'concatenated.gz'); const secondData = Buffer.from('Concatenated member'); await fs.writeFile(concatenated, Buffer.concat([optionalGzip(entries[0].data).bytes, optionalGzip(secondData, { name: 'second.bin' }).bytes])); native(['t', '-bd', concatenated]); assert.deepEqual(native(['x', '-so', concatenated]), Buffer.concat([entries[0].data, secondData]));
  const originalGzip = path.join(root, 'original.gz'); native(['a', '-tgzip', '-mx=9', '-bd', originalGzip, 'source/bytes.bin']); const parsed = readGzip(await fs.readFile(originalGzip)); assert.deepEqual(parsed.data, entries[0].data); assert.equal(parsed.members[0].name, 'bytes.bin');
});

test('pinned Windows bsdtar exchanges supported TAR/ustar/PAX paths and GZIP-compressed TAR both directions, and creates readable raw GZIP', { skip: process.platform !== 'win32' && 'Pinned Windows bsdtar oracle unavailable.' }, async t => {
  // This pinned Windows build reads Latin-1 names but rejects CJK/emoji paths.
  // Full Unicode paths are positively compared with authenticated 7-Zip above.
  const supported = [...entries.filter(entry => !entry.name.includes('café')), { name: 'café.txt', data: Buffer.from('Latin-1 path with Unicode payload 🌍'), modifiedAt: entries[0].modifiedAt }];
  const root = await fixture(t), native = await bsdtar(root), own = path.join(root, 'own-pax.tar'); await fs.writeFile(own, makeTar(supported)); native(['-tf', own]); const restored = path.join(root, 'bsdtar-restored'); await fs.mkdir(restored); native(['-xf', own, '-C', restored]); for (const entry of supported) { const target = path.join(restored, ...entry.name.replace(/\/$/, '').split('/')); if (entry.directory) assert.ok((await fs.stat(target)).isDirectory()); else assert.deepEqual(await fs.readFile(target), entry.data); if (entry.modifiedAt) assert.ok(Math.abs((await fs.stat(target)).mtimeMs - new Date(entry.modifiedAt).getTime()) < 1); }
  const source = path.join(root, 'source'); await writeSource(source, supported); for (const compression of [false, true]) { const filename = path.join(root, compression ? 'native-pax.tar.gz' : 'native-pax.tar'); native(['--format=pax', compression ? '-czf' : '-cf', filename, '-C', source, '.']); const bytes = await fs.readFile(filename); compareEntries(readTar(compression ? readGzip(bytes, MAX_CONTAINER).data : bytes, true), supported); }
  const short = path.join(root, 'short'); await writeSource(short, entries.filter(entry => !entry.name.includes('café') && entry.name !== longName)); const ustar = path.join(root, 'native-ustar.tar'); native(['--format=ustar', '-cf', ustar, '-C', short, '.']); compareEntries(readTar(await fs.readFile(ustar), true), entries.filter(entry => !entry.name.includes('café') && entry.name !== longName));
  const ownCompressed = path.join(root, 'own-pax.tar.gz'); await fs.writeFile(ownCompressed, makeGzip(makeTar(supported), { maxOutput: MAX_CONTAINER })); native(['-tzf', ownCompressed]); assert.deepEqual(native(['-xzOf', ownCompressed, 'bytes.bin']), entries[0].data);
  const raw = path.join(root, 'native-raw.gz'); native(['--format=raw', '-czf', raw, '-C', source, 'bytes.bin']); assert.deepEqual(readGzip(await fs.readFile(raw)).data, entries[0].data);
  // bsdtar's normal list/extract modes do not enable the raw archive reader.
  // Raw GZIP extraction is therefore compared with authenticated 7-Zip above.
  const unsupported = path.join(root, 'own-full-unicode.tar'); await fs.writeFile(unsupported, makeTar(entries)); const rejected = spawnSync(path.join(root, 'oracle-bsdtar.exe'), ['-tf', unsupported], { cwd: root, windowsHide: true, timeout: 20000, encoding: 'utf8' }); assert.equal(rejected.status, 1); assert.match(rejected.stderr, /empty or unreadable filename/);
});
