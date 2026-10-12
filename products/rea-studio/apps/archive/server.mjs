import * as fs from 'node:fs/promises';
import path from 'node:path';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { randomUUID } from 'node:crypto';

const MAX_TOTAL = 64 * 1024 * 1024;
const MAX_FILE = 16 * 1024 * 1024;
const MAX_ENTRIES = 10000;
const queues = new Map();
const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1; return c >>> 0; });
export function crc32(bytes) { let c = 0xffffffff; for (const b of bytes) c = table[(c ^ b) & 255] ^ c >>> 8; return (c ^ 0xffffffff) >>> 0; }
function clean(value) {
  if (typeof value !== 'string' || !value || value.length > 4096 || value.startsWith('/') || value.includes('\\') || value.includes('\0')) throw new Error('Use a relative path with forward slashes.');
  const name = value.replace(/\/$/, '');
  for (const part of name.split('/')) {
    if (!part || part === '.' || part === '..' || /[:<>"|?*\x00-\x1f]/.test(part) || /[. ]$/.test(part) || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part)) throw new Error('Archive contains an unsafe or unsupported path.');
  }
  return name;
}
async function safe(workspace, relative) {
  const name = clean(relative), resolved = workspace.resolve(name);
  const rel = path.relative(workspace.root, resolved);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Path must stay inside the workspace.');
  let current = workspace.root;
  for (const part of rel.split(path.sep)) {
    current = path.join(current, part);
    try { if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('Symbolic links are not supported.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return resolved;
}
async function collect(workspace, relative) {
  const base = await safe(workspace, relative), entries = [];
  if (!(await fs.lstat(base)).isDirectory()) throw new Error('Source must be a directory.');
  let total = 0;
  async function walk(directory, prefix) {
    const names = await fs.readdir(directory, { withFileTypes: true });
    names.sort((a,b) => a.name.localeCompare(b.name));
    for (const item of names) {
      const name = prefix ? `${prefix}/${item.name}` : item.name; clean(name);
      const location = await safe(workspace, `${relative}/${name}`), stat = await fs.lstat(location);
      if (stat.isSymbolicLink()) throw new Error('Symbolic links are not supported.');
      if (stat.isDirectory()) { entries.push({ name: `${name}/`, data: Buffer.alloc(0), directory: true }); await walk(location, name); }
      else if (stat.isFile()) {
        if (stat.size > MAX_FILE || total + stat.size > MAX_TOTAL) throw new Error('Archive input exceeds the local size limit.');
        const data = await fs.readFile(location); total += data.length;
        if (data.length > MAX_FILE || total > MAX_TOTAL) throw new Error('Archive input exceeds the local size limit.');
        entries.push({ name, data, directory: false });
      } else throw new Error('Only regular files and directories are supported.');
      if (entries.length > MAX_ENTRIES) throw new Error('Archive has too many entries.');
    }
  }
  await walk(base, ''); return entries;
}
export function makeZip(entries, compression = 'deflate') {
  if (!['store','deflate'].includes(compression)) throw new Error('Choose store or deflate compression.');
  if (entries.length > MAX_ENTRIES) throw new Error('Archive has too many entries.');
  const locals = [], centrals = []; let offset = 0, total = 0; const seen = new Set();
  for (const item of entries) {
    const normalized = clean(item.name), identity = normalized.toLowerCase();
    if (seen.has(identity)) throw new Error('Duplicate archive path.'); seen.add(identity);
    const directory = !!item.directory, name = Buffer.from(normalized + (directory ? '/' : ''), 'utf8');
    const data = directory ? Buffer.alloc(0) : Buffer.from(item.data);
    total += data.length;
    if (data.length > MAX_FILE || total > MAX_TOTAL || name.length > 65535) throw new Error('Archive input exceeds the local size limit.');
    const method = directory || compression === 'store' ? 0 : 8;
    const compressed = method === 8 ? deflateRawSync(data, { level: 6 }) : data;
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6); local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0x21, 12); local.writeUInt32LE(checksum, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x800, 8); central.writeUInt16LE(method, 10); central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(checksum, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(directory ? 0x10 : 0, 38); central.writeUInt32LE(offset, 42);
    locals.push(local, name, compressed); centrals.push(central, name); offset += local.length + name.length + compressed.length;
  }
  const centralSize = centrals.reduce((sum,b) => sum + b.length, 0), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals,...centrals,end]);
}
export function readZip(buffer, includeData = false) {
  if (!Buffer.isBuffer(buffer) || buffer.length > MAX_TOTAL + 4 * 1024 * 1024 || buffer.length < 22) throw new Error('Invalid ZIP size.');
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50 && i + 22 + buffer.readUInt16LE(i + 20) === buffer.length) { end = i; break; }
  }
  if (end < 0) throw new Error('ZIP end record not found.');
  if (buffer.readUInt16LE(end + 4) || buffer.readUInt16LE(end + 6) || buffer.readUInt16LE(end + 8) !== buffer.readUInt16LE(end + 10)) throw new Error('Multi-disk ZIP is not supported.');
  const count = buffer.readUInt16LE(end + 10), centralSize = buffer.readUInt32LE(end + 12), start = buffer.readUInt32LE(end + 16);
  if (count > MAX_ENTRIES || start + centralSize !== end) throw new Error('Invalid central directory or unsupported ZIP64.');
  const output = [], seen = new Set(), intervals = []; let cursor = start, total = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Invalid ZIP central directory.');
    const flags = buffer.readUInt16LE(cursor + 8), method = buffer.readUInt16LE(cursor + 10), checksum = buffer.readUInt32LE(cursor + 16), size = buffer.readUInt32LE(cursor + 24), compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28), extraLength = buffer.readUInt16LE(cursor + 30), commentLength = buffer.readUInt16LE(cursor + 32), localOffset = buffer.readUInt32LE(cursor + 42);
    const mode = buffer.readUInt32LE(cursor + 38) >>> 16;
    if (flags & ~0x808 || ![0,8].includes(method) || buffer.readUInt16LE(cursor + 34) || (mode & 0xf000) === 0xa000) throw new Error('Encrypted, linked or unsupported ZIP entry.');
    if (cursor + 46 + nameLength + extraLength + commentLength > end) throw new Error('Truncated ZIP directory.');
    const encoded = buffer.subarray(cursor + 46, cursor + 46 + nameLength);
    if (!(flags & 0x800) && encoded.some(b => b > 127)) throw new Error('Non-UTF-8 ZIP filenames are not supported.');
    const name = new TextDecoder('utf-8', { fatal: true }).decode(encoded), normalized = clean(name), identity = normalized.toLowerCase(), directory = name.endsWith('/');
    if (seen.has(identity)) throw new Error('Duplicate archive path.'); seen.add(identity);
    total += size;
    if (size > MAX_FILE || total > MAX_TOTAL || compressedSize > MAX_TOTAL) throw new Error('ZIP exceeds the extraction size limit.');
    if (localOffset + 30 > start || buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('Invalid local ZIP header.');
    const localNameLength = buffer.readUInt16LE(localOffset + 26), localExtraLength = buffer.readUInt16LE(localOffset + 28), dataStart = localOffset + 30 + localNameLength + localExtraLength;
    if (dataStart + compressedSize > start || buffer.readUInt16LE(localOffset + 6) !== flags || buffer.readUInt16LE(localOffset + 8) !== method || !buffer.subarray(localOffset + 30, localOffset + 30 + localNameLength).equals(encoded)) throw new Error('ZIP headers disagree.');
    if (!(flags & 8) && (buffer.readUInt32LE(localOffset + 14) !== checksum || buffer.readUInt32LE(localOffset + 18) !== compressedSize || buffer.readUInt32LE(localOffset + 22) !== size)) throw new Error('ZIP sizes or checksums disagree.');
    intervals.push([localOffset, dataStart + compressedSize]);
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    let data;
    try { data = method === 8 ? inflateRawSync(compressed, { maxOutputLength: Math.max(1,size) }) : Buffer.from(compressed); }
    catch { throw new Error('ZIP compressed data is corrupt or exceeds its declared size.'); }
    if (data.length !== size || crc32(data) !== checksum || (directory && size !== 0)) throw new Error('ZIP data failed size or CRC integrity verification.');
    output.push({ name, size, compressedSize, method: method === 8 ? 'deflate' : 'store', crc32: checksum.toString(16).padStart(8,'0'), directory, ...(includeData ? { data } : {}) });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (cursor !== end) throw new Error('ZIP directory entry count mismatch.');
  intervals.sort((a,b) => a[0] - b[0]);
  for (let i = 1; i < intervals.length; i++) if (intervals[i][0] < intervals[i - 1][1]) throw new Error('Overlapping ZIP entries are unsupported.');
  const files = new Set(output.filter(e => !e.directory).map(e => clean(e.name).toLowerCase()));
  for (const e of output) { const parts = clean(e.name).toLowerCase().split('/'); while (parts.length > 1) { parts.pop(); if (files.has(parts.join('/'))) throw new Error('ZIP path is both a file and a directory.'); } }
  return output;
}
async function load(workspace, relative) {
  const location = await safe(workspace, relative), stat = await fs.stat(location);
  if (!stat.isFile() || stat.size > MAX_TOTAL + 4 * 1024 * 1024) throw new Error('Archive exceeds the local size limit.');
  return fs.readFile(location);
}
async function run({ action, input = {}, workspace }) {
  if (action === 'putFile') {
    const location = await safe(workspace, input.path);
    if (typeof input.content !== 'string' || Buffer.byteLength(input.content) > MAX_FILE) throw new Error('File content exceeds the local size limit.');
    await fs.mkdir(path.dirname(location), { recursive: true }); await fs.writeFile(location, input.content, { flag: 'wx' });
    return { created: true, path: input.path };
  }
  if (action === 'create') {
    const entries = await collect(workspace, input.source), location = await safe(workspace, input.output);
    if (!input.output.toLowerCase().endsWith('.zip')) throw new Error('Output path must end in .zip.');
    const archive = makeZip(entries, input.compression ?? 'deflate');
    readZip(archive); await fs.mkdir(path.dirname(location), { recursive: true }); await fs.writeFile(location, archive, { flag: 'wx' });
    return { path: input.output, entries: entries.length, bytes: archive.length, originalBytes: entries.reduce((n,e) => n + e.data.length, 0) };
  }
  if (action === 'list' || action === 'test') {
    const entries = readZip(await load(workspace, input.path));
    return { entries, verified: true, totalBytes: entries.reduce((sum,e) => sum + e.size, 0) };
  }
  if (action === 'extract') {
    if (input.confirm !== true) throw new Error('Extraction requires confirmation.');
    const entries = readZip(await load(workspace, input.path), true), destination = await safe(workspace, input.destination);
    try { await fs.lstat(destination); throw new Error('Choose a new extraction folder; existing folders are never overwritten.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const staging = await safe(workspace,`${input.destination}.partial-${randomUUID()}`);
    await fs.mkdir(staging);
    try {
      for (const entry of entries) {
        const location = path.join(staging, ...clean(entry.name).split('/'));
        if (entry.directory) await fs.mkdir(location, { recursive: true });
        else { await fs.mkdir(path.dirname(location), { recursive: true }); await fs.writeFile(location, entry.data, { flag: 'wx' }); }
      }
      // The staging folder contains only validated entries created by this invocation.
      // Claim the destination with an exclusive directory creation. A folder
      // created after the preview cannot be replaced by a directory rename.
      await fs.mkdir(destination);
      for (const child of await fs.readdir(staging)) await fs.rename(path.join(staging,child),path.join(destination,child));
      await fs.rmdir(staging);
    } catch (error) { await fs.rm(staging, { recursive: true, force: true }); throw error; }
    return { extracted: entries.length, destination: input.destination, verified: true };
  }
  throw new Error('Unknown archive action.');
}
export async function handle(context) {
  const key = context.workspace.root, previous = queues.get(key) ?? Promise.resolve(), current = previous.catch(() => {}).then(() => run(context)); queues.set(key,current);
  try { return await current; } finally { if (queues.get(key) === current) queues.delete(key); }
}
