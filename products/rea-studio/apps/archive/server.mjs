import * as fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { MAX_TOTAL, MAX_FILE, MAX_ENTRIES, clean, makeZip, readZip } from './zip.mjs';
import { MAX_CONTAINER, makeTar, readTar } from './tar.mjs';
import { makeGzip, readGzip } from './gzip.mjs';
import { isZstd, makeZstd, readZstd } from './zstd.mjs';
import { read7z, write7z } from './sevenzip.mjs';
import { OperationBudget } from './operation-budget.mjs';
export { makeZip, readZip, crc32 } from './zip.mjs';
const queues = new Map();
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
async function collect(workspace, relative, budget) {
  const base = await safe(workspace, relative), entries = [];
  if (!(await fs.lstat(base)).isDirectory()) throw new Error('Source must be a directory.');
  let total = 0;
  async function walk(directory, prefix) {
    const names = await fs.readdir(directory, { withFileTypes: true });
    names.sort((a,b) => a.name.localeCompare(b.name));
    for (const item of names) {
      budget.check(); budget.work(1);
      const name = prefix ? `${prefix}/${item.name}` : item.name; clean(name);
      const location = await safe(workspace, `${relative}/${name}`), stat = await fs.lstat(location);
      if (stat.isSymbolicLink()) throw new Error('Symbolic links are not supported.');
      if (stat.isDirectory()) { entries.push({ name: `${name}/`, data: Buffer.alloc(0), directory: true, modifiedAt: stat.mtime.toISOString(), accessedAt: stat.atime.toISOString(), createdAt: stat.birthtime.toISOString() }); await walk(location, name); }
      else if (stat.isFile()) {
        if (stat.size > MAX_FILE || total + stat.size > MAX_TOTAL) throw new Error('Archive input exceeds the local size limit.');
        const data = await fs.readFile(location); budget.check(); total += data.length;
        if (data.length > MAX_FILE || total > MAX_TOTAL) throw new Error('Archive input exceeds the local size limit.');
        entries.push({ name, data, directory: false, modifiedAt: stat.mtime.toISOString(), accessedAt: stat.atime.toISOString(), createdAt: stat.birthtime.toISOString() });
      } else throw new Error('Only regular files and directories are supported.');
      if (entries.length > MAX_ENTRIES) throw new Error('Archive has too many entries.');
    }
  }
  await walk(base, ''); return entries;
}
async function load(workspace, relative) {
  const location = await safe(workspace, relative), stat = await fs.stat(location);
  if (!stat.isFile() || stat.size > MAX_CONTAINER) throw new Error('Archive exceeds the local size limit.');
  return fs.readFile(location);
}
function readArchive(bytes, relative, includeData = false, budget) {
  budget?.check();
  if (bytes.subarray(0, 6).equals(Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]))) {
    const entries = read7z(bytes, { operationBudget: budget }).map(({ data, mtimeMs, crc, ...entry }) => ({ ...entry, size: data.length,
      ...(mtimeMs !== null ? { modifiedAt: new Date(mtimeMs).toISOString() } : {}),
      ...(crc !== null ? { crc32: crc.toString(16).padStart(8, '0') } : {}), contentChecksum: crc !== null,
      ...(includeData ? { data } : {}) }));
    return { format: 'sevenzip', entries };
  }
  if (bytes.length >= 4 && [0x04034b50, 0x06054b50].includes(bytes.readUInt32LE(0))) return { format: 'zip', entries: readZip(bytes, includeData) };
  if (bytes[0] === 31 && bytes[1] === 139) {
    const tar = /\.(?:tgz|tar\.gz)$/i.test(relative), inflated = readGzip(bytes, tar ? MAX_CONTAINER : MAX_FILE);
    if (tar) return { format: 'tgz', entries: readTar(inflated.data, includeData), members: inflated.members };
    const name = inflated.members[0].name || path.posix.basename(relative).replace(/\.gz$/i, '') || 'content.bin'; clean(name); if (name.includes('/')) throw new Error('GZIP contains an unsafe filename.');
    return { format: 'gzip', members: inflated.members, entries: [{ name, directory: false, size: inflated.data.length, compressedSize: bytes.length, method: 'gzip', modifiedAt: inflated.members[0].modifiedAt, ...(includeData ? { data: inflated.data } : {}) }] };
  }
  if (isZstd(bytes)) {
    const tar = /\.(?:tzst|tar\.zst)$/i.test(relative), decoded = readZstd(bytes, tar ? MAX_CONTAINER : MAX_FILE);
    if (tar) return { format: 'tzst', entries: readTar(decoded.data, includeData), frames: decoded.frames };
    const name = path.posix.basename(relative).replace(/\.zst$/i, '') || 'content.bin'; clean(name);
    return { format: 'zstd', frames: decoded.frames, entries: [{ name, directory: false, size: decoded.data.length, compressedSize: bytes.length, method: 'zstd', ...(includeData ? { data: decoded.data } : {}) }] };
  }
  return { format: 'tar', entries: readTar(bytes, includeData) };
}
async function run({ action, input = {}, workspace }) {
  const budget = new OperationBudget({ maxTimeMs: input.maxTimeMs, maxSteps: input.maxSteps });
  if (action === 'putFile') {
    const location = await safe(workspace, input.path);
    if (typeof input.content !== 'string' || Buffer.byteLength(input.content) > MAX_FILE) throw new Error('File content exceeds the local size limit.');
    await fs.mkdir(path.dirname(location), { recursive: true }); await fs.writeFile(location, input.content, { flag: 'wx' });
    return { created: true, path: input.path };
  }
  if (action === 'create') {
    const format = input.format ?? 'zip', extensions = { zip: /\.zip$/i, sevenzip: /\.7z$/i, tar: /\.tar$/i, tgz: /\.(?:tar\.gz|tgz)$/i, gzip: /\.gz$/i, zstd: /\.zst$/i, tzst: /\.(?:tar\.zst|tzst)$/i };
    if (!Object.hasOwn(extensions, format) || !extensions[format].test(input.output ?? '') || format === 'gzip' && /\.(?:tgz|tar\.gz)$/i.test(input.output) || format === 'zstd' && /\.(?:tzst|tar\.zst)$/i.test(input.output)) throw new Error('Choose ZIP (.zip), 7Z (.7z), TAR (.tar), TAR.GZ (.tar.gz/.tgz), GZIP (.gz), Zstandard (.zst), or TAR.ZST (.tar.zst/.tzst) with its matching output extension.');
    const location = await safe(workspace, input.output); let entries;
    if (['gzip','zstd'].includes(format)) { const source = await safe(workspace, input.source), stat = await fs.lstat(source); if (!stat.isFile() || stat.size > MAX_FILE) throw new Error('Single-file compression needs one regular file within the local size limit.'); entries = [{ name: path.basename(source), data: await fs.readFile(source), modifiedAt: stat.mtime.toISOString() }]; }
    else entries = await collect(workspace, input.source, budget);
    budget.check();
    let archive;
    if (format === 'zip') archive = makeZip(entries, input.compression ?? 'deflate', { zip64: input.zip64 === true, level: input.level, comment: input.comment });
    else if (format === 'sevenzip') {
      const compression = input.compression ?? 'lzma2';
      if (!['store', 'deflate', 'lzma', 'lzma2'].includes(compression)) throw new Error('7Z supports LZMA2, LZMA, DEFLATE or uncompressed store.');
      archive = write7z(entries.map(e => ({ ...e, mtimeMs: new Date(e.modifiedAt).getTime() })), {
        method: compression === 'store' ? 'copy' : compression, level: input.level ?? 6, solid: input.solid === true, encodedHeader: input.encodedHeader === true,
        profile: input.profile ?? 'balanced', dictionarySize: input.dictionarySize, searchDepth: input.searchDepth, chunkSize: input.chunkSize,
        headerMethod: input.headerMethod, operationBudget: budget });
    }
    else if (format === 'tar') archive = makeTar(entries);
    else if (format === 'tgz') archive = makeGzip(makeTar(entries), { level: input.level, maxOutput: MAX_CONTAINER });
    else if (format === 'tzst') archive = makeZstd(makeTar(entries), { level: input.level, maxOutput: MAX_CONTAINER });
    else if (format === 'zstd') archive = makeZstd(entries[0].data, { level: input.level });
    else archive = makeGzip(entries[0].data, { level: input.level, name: /[^\x01-\xff]/.test(entries[0].name) ? undefined : entries[0].name, modifiedAt: entries[0].modifiedAt, comment: input.comment });
    readArchive(archive, input.output, false, budget); budget.check(); await fs.mkdir(path.dirname(location), { recursive: true }); budget.check(); await fs.writeFile(location, archive, { flag: 'wx' });
    return { path: input.output, format, entries: entries.length, bytes: archive.length, originalBytes: entries.reduce((n,e) => n + e.data.length, 0) };
  }
  if (action === 'list' || action === 'test') {
    const result = readArchive(await load(workspace, input.path), input.path, false, budget); budget.check();
    return { ...result, verified: true, totalBytes: result.entries.reduce((sum,e) => sum + e.size, 0) };
  }
  if (action === 'extract') {
    if (input.confirm !== true) throw new Error('Extraction requires confirmation.');
    const { entries } = readArchive(await load(workspace, input.path), input.path, true, budget), destination = await safe(workspace, input.destination); budget.check();
    try { await fs.lstat(destination); throw new Error('Choose a new extraction folder; existing folders are never overwritten.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const staging = await safe(workspace,`${input.destination}.partial-${randomUUID()}`);
    await fs.mkdir(staging);
    try {
      for (const entry of entries) {
        budget.check(); budget.work(1);
        const location = path.join(staging, ...clean(entry.name).split('/'));
        if (entry.directory) await fs.mkdir(location, { recursive: true });
        else { await fs.mkdir(path.dirname(location), { recursive: true }); await fs.writeFile(location, entry.data, { flag: 'wx' }); }
      }
      // Restore directory dates last, after writing their children.
      for (const entry of [...entries].sort((a,b) => b.name.length - a.name.length)) if (entry.modifiedAt) {
        budget.check();
        const location = path.join(staging, ...clean(entry.name).split('/'));
        await fs.utimes(location, new Date(entry.accessedAt ?? entry.modifiedAt), new Date(entry.modifiedAt));
      }
      // The staging folder contains only validated entries created by this invocation.
      // Claim the destination with an exclusive directory creation. A folder
      // created after the preview cannot be replaced by a directory rename.
      budget.check(); await fs.mkdir(destination);
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
