import * as fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { handleNative } from './restic.mjs';

const REPOSITORY = '.rea-backup';
const CHUNK = 1024 * 1024;
const MAX_FILE = 64 * 1024 * 1024;
const MAX_TOTAL = 512 * 1024 * 1024;
const queues = new Map();
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function clean(value) {
  if (typeof value !== 'string' || !value || value.length > 4096 || value.includes('\\') || value.startsWith('/')) throw new Error('Use a relative workspace path with forward slashes.');
  for (const part of value.split('/')) if (!part || part === '.' || part === '..' || /[:<>"|?*\x00-\x1f]/.test(part) || /[. ]$/.test(part) || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part)) throw new Error('Unsafe or unsupported path.');
  return value;
}
async function safe(workspace, relative) {
  const location = workspace.resolve(clean(relative)), rel = path.relative(workspace.root, location);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Path must stay inside the workspace.');
  let current = workspace.root;
  for (const part of rel.split(path.sep)) {
    current = path.join(current, part);
    try { if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('Symbolic links are not supported.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return location;
}
async function repository(workspace) {
  const root = await safe(workspace, REPOSITORY);
  await fs.mkdir(root, { recursive: true });
  for (const dir of ['chunks','snapshots']) { const target = await safe(workspace, `${REPOSITORY}/${dir}`); await fs.mkdir(target, { recursive: true }); }
  return root;
}
function id(value) { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new Error('Invalid snapshot or chunk ID.'); return value; }
async function chunk(workspace, data) {
  const hash = digest(data), location = await safe(workspace, `${REPOSITORY}/chunks/${hash}`);
  try { await fs.writeFile(location, data, { flag: 'wx' }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (digest(await fs.readFile(location)) !== hash) throw new Error(`Existing backup chunk ${hash} is damaged.`);
  }
  return hash;
}
async function readChunk(workspace, hash) {
  const location = await safe(workspace, `${REPOSITORY}/chunks/${id(hash)}`), stat = await fs.stat(location);
  if (!stat.isFile() || stat.size > CHUNK) throw new Error(`Invalid backup chunk ${hash}.`);
  const data = await fs.readFile(location);
  if (digest(data) !== hash) throw new Error(`Backup chunk ${hash} failed integrity verification.`);
  return data;
}
async function load(workspace, hash) {
  const location = await safe(workspace, `${REPOSITORY}/snapshots/${id(hash)}.json`), stat = await fs.stat(location);
  if (!stat.isFile() || stat.size > 16 * 1024 * 1024) throw new Error('Invalid snapshot size.');
  const bytes = await fs.readFile(location);
  if (digest(bytes) !== hash) throw new Error('Snapshot manifest failed integrity verification.');
  const doc = JSON.parse(bytes);
  if (doc.format !== 1 || !Array.isArray(doc.entries) || doc.entries.length > 10000 || typeof doc.source !== 'string' || typeof doc.createdAt !== 'string') throw new Error('Invalid snapshot format.');
  clean(doc.source); const seen = new Set(); let total = 0;
  for (const entry of doc.entries) {
    clean(entry.path); const identity = entry.path.toLowerCase();
    if (seen.has(identity)) throw new Error('Duplicate snapshot path.'); seen.add(identity);
    if (!['file','directory'].includes(entry.type)) throw new Error('Invalid snapshot entry.');
    if (entry.type === 'file') {
      if (!Number.isSafeInteger(entry.size) || entry.size < 0 || entry.size > MAX_FILE || !Array.isArray(entry.chunks) || entry.chunks.length !== Math.ceil(entry.size / CHUNK) || !Number.isFinite(entry.mtimeMs) || !Number.isFinite(new Date(entry.mtimeMs).getTime())) throw new Error('Invalid snapshot file.');
      id(entry.hash); entry.chunks.forEach(id); total += entry.size;
    }
  }
  if (total > MAX_TOTAL) throw new Error('Snapshot exceeds the local size limit.');
  const files = new Set(doc.entries.filter(e => e.type === 'file').map(e => e.path.toLowerCase()));
  for (const entry of doc.entries) { const parts = entry.path.toLowerCase().split('/'); while (parts.length > 1) { parts.pop(); if (files.has(parts.join('/'))) throw new Error('Snapshot path is both a file and a directory.'); } }
  return doc;
}
async function list(workspace) {
  await repository(workspace);
  const location = await safe(workspace, `${REPOSITORY}/snapshots`), names = await fs.readdir(location), results = [];
  for (const name of names) {
    if (!/^[a-f0-9]{64}\.json$/.test(name)) throw new Error('Unexpected file in the snapshot repository.');
    const hash = name.slice(0,-5), doc = await load(workspace, hash);
    results.push({ id: hash, source: doc.source, label: doc.label, createdAt: doc.createdAt, files: doc.entries.filter(e => e.type === 'file').length, bytes: doc.entries.reduce((n,e) => n + (e.size ?? 0),0) });
  }
  return results.sort((a,b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}
async function capture(workspace, input) {
  const source = clean(input.source);
  if (source.split('/').includes(REPOSITORY)) throw new Error('The backup repository cannot be backed up into itself.');
  if (typeof input.label !== 'undefined' && (typeof input.label !== 'string' || input.label.length > 256)) throw new Error('Snapshot label must contain at most 256 characters.');
  const base = await safe(workspace, source);
  if (!(await fs.lstat(base)).isDirectory()) throw new Error('Source must be a directory.');
  await repository(workspace); const entries = [], seen = new Set(); let total = 0;
  async function walk(location, prefix) {
    const children = await fs.readdir(location, { withFileTypes: true }); children.sort((a,b) => a.name.localeCompare(b.name));
    for (const child of children) {
      const relative = prefix ? `${prefix}/${child.name}` : child.name; clean(relative);
      const identity = relative.toLowerCase();
      if (seen.has(identity)) throw new Error('Case-colliding paths are not supported.'); seen.add(identity);
      const target = await safe(workspace, `${source}/${relative}`), before = await fs.lstat(target);
      if (before.isSymbolicLink()) throw new Error('Symbolic links are not supported.');
      if (before.isDirectory()) { entries.push({ path: relative, type: 'directory' }); await walk(target, relative); }
      else if (before.isFile()) {
        if (before.size > MAX_FILE || total + before.size > MAX_TOTAL) throw new Error('Source exceeds the local snapshot size limit.');
        const handle = await fs.open(target, 'r'), hashes = [], whole = createHash('sha256'); let size = 0;
        try {
          for (;;) {
            const bytes = Buffer.alloc(CHUNK); let filled = 0;
            while (filled < bytes.length) {
              const result = await handle.read(bytes,filled,bytes.length - filled,null);
              if (!result.bytesRead) break;
              filled += result.bytesRead;
            }
            if (!filled) break;
            const data = bytes.subarray(0,filled); size += data.length;
            if (size > MAX_FILE || total + size > MAX_TOTAL) throw new Error('Source exceeds the local snapshot size limit.');
            whole.update(data); hashes.push(await chunk(workspace, data));
          }
          const after = await handle.stat();
          if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ino !== before.ino || size !== before.size) throw new Error(`Source changed during backup: ${relative}. Retry after writes finish.`);
        } finally { await handle.close(); }
        total += size; entries.push({ path: relative, type: 'file', size, hash: whole.digest('hex'), chunks: hashes, mtimeMs: before.mtimeMs });
      } else throw new Error('Only regular files and directories are supported.');
      if (entries.length > 10000) throw new Error('Snapshot exceeds the local entry limit.');
    }
  }
  await walk(base, '');
  const doc = { format: 1, source, label: input.label ?? '', createdAt: new Date().toISOString(), nonce: randomUUID(), chunkBytes: CHUNK, entries }, bytes = Buffer.from(JSON.stringify(doc)), hash = digest(bytes);
  await fs.writeFile(await safe(workspace, `${REPOSITORY}/snapshots/${hash}.json`), bytes, { flag: 'wx' });
  return { id: hash, files: entries.filter(e => e.type === 'file').length, bytes: total, entries: entries.length };
}
async function verify(workspace, doc) {
  let files = 0, checkedBytes = 0; const checked = new Map();
  for (const entry of doc.entries) {
    if (entry.type !== 'file') continue;
    const hash = createHash('sha256'); let size = 0;
    for (const chunkId of entry.chunks) {
      // Read each chunk for each file; do not retain the entire backup in memory.
      const data = await readChunk(workspace, chunkId); hash.update(data); size += data.length; checked.set(chunkId,data.length);
    }
    if (size !== entry.size || hash.digest('hex') !== entry.hash) throw new Error(`File ${entry.path} failed integrity verification.`);
    files++; checkedBytes += size;
  }
  return { verified: true, files, checkedBytes, uniqueChunks: checked.size };
}
function restoreTimes(doc) {
  const times = new Map();
  for (const entry of doc.entries) {
    if (entry.type !== 'file') continue;
    // Date supplies the format's represented millisecond precision. Windows
    // Node utimes silently wraps Unix seconds outside this verified interval.
    const modified = new Date(entry.mtimeMs).getTime();
    if (!Number.isFinite(modified) || (process.platform === 'win32' && (modified < 0 || modified > 4294967295999))) throw new Error(`File ${entry.path} has a modification time that cannot be restored accurately on this platform.`);
    times.set(entry.path, modified);
  }
  return times;
}
async function retention(workspace, keepLast) {
  if (!Number.isInteger(keepLast) || keepLast < 1 || keepLast > 10000) throw new Error('Keep at least one and at most 10,000 snapshots.');
  const snapshots = await list(workspace), keep = snapshots.slice(0,keepLast), remove = snapshots.slice(keepLast), used = new Set();
  for (const snapshot of keep) {
    const doc = await load(workspace,snapshot.id);
    // Never discard older recovery points while any retained backup is damaged.
    await verify(workspace,doc);
    for (const entry of doc.entries) for (const hash of entry.chunks ?? []) used.add(hash);
  }
  const names = await fs.readdir(await safe(workspace, `${REPOSITORY}/chunks`));
  if (names.some(name => !/^[a-f0-9]{64}$/.test(name))) throw new Error('Unexpected file in the chunk repository.');
  const unused = names.filter(name => !used.has(name)).sort();
  const state = { keepLast, keep: keep.map(s => s.id), remove: remove.map(s => s.id), unusedChunks: unused };
  return { ...state, token: digest(JSON.stringify(state)) };
}
async function run({ action, input = {}, workspace }) {
  if (action.startsWith('native')) return handleNative({ action,input,workspace });
  if (action === 'putFile') {
    if (clean(input.path).split('/').includes(REPOSITORY)) throw new Error('Use a source folder outside the backup repository.');
    if (typeof input.content !== 'string' || Buffer.byteLength(input.content) > MAX_FILE) throw new Error('File content exceeds the local size limit.');
    const target = await safe(workspace, input.path); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, input.content, { flag: 'wx' });
    return { created: true, path: input.path };
  }
  if (action === 'snapshot') return capture(workspace, input);
  if (action === 'list') return { snapshots: await list(workspace) };
  if (action === 'inspect') return { snapshot: await load(workspace, input.id) };
  if (action === 'check') return verify(workspace, await load(workspace, input.id));
  if (action === 'restore') {
    if (input.confirm !== true) throw new Error('Restoring requires confirmation.');
    const doc = await load(workspace, input.id); await verify(workspace, doc);
    const times = restoreTimes(doc);
    if (clean(input.destination).split('/').includes(REPOSITORY)) throw new Error('Restore outside the backup repository.');
    const destination = await safe(workspace, input.destination); await fs.mkdir(path.dirname(destination), { recursive: true });
    // Exclusive creation refuses every existing destination, including empty folders.
    await fs.mkdir(destination);
    let restored = 0;
    try {
      for (const entry of doc.entries) {
        const target = await safe(workspace, `${input.destination}/${entry.path}`);
        if (entry.type === 'directory') await fs.mkdir(target, { recursive: true });
        else {
          await fs.mkdir(path.dirname(target), { recursive: true }); const handle = await fs.open(target, 'wx');
          try { for (const hash of entry.chunks) await handle.writeFile(await readChunk(workspace, hash)); }
          finally { await handle.close(); }
          const modified = times.get(entry.path);
          await fs.utimes(target, new Date(), new Date(modified));
          const actual = await fs.stat(await safe(workspace, `${input.destination}/${entry.path}`));
          if (Math.abs(actual.mtimeMs - modified) >= 1) throw new Error(`File ${entry.path} modification time did not restore accurately.`);
          restored++;
        }
      }
    } catch (error) { throw new Error(`Restore stopped after ${restored} files. Partial output remains in ${input.destination}; no existing destination was overwritten. ${error.message}`); }
    return { restored, destination: input.destination, verified: true };
  }
  if (action === 'planRetention') return retention(workspace, input.keepLast ?? 5);
  if (action === 'prune') {
    if (input.confirm !== true) throw new Error('Removing saved backups requires confirmation.');
    const plan = await retention(workspace, input.keepLast ?? 5);
    if (input.token !== plan.token) throw new Error('The retention plan changed. Preview it again before removing backups.');
    // These are exact validated content IDs resolved inside the application repository.
    for (const hash of plan.remove) await fs.unlink(await safe(workspace, `${REPOSITORY}/snapshots/${id(hash)}.json`));
    for (const hash of plan.unusedChunks) await fs.unlink(await safe(workspace, `${REPOSITORY}/chunks/${id(hash)}`));
    return { removedSnapshots: plan.remove.length, removedChunks: plan.unusedChunks.length, retainedSnapshots: plan.keep.length };
  }
  throw new Error('Unknown backup action.');
}
export async function handle(context) {
  const key = context.workspace.root, previous = queues.get(key) ?? Promise.resolve();
  const current = previous.catch(() => {}).then(() => run(context)); queues.set(key,current);
  try { return await current; } finally { if (queues.get(key) === current) queues.delete(key); }
}
