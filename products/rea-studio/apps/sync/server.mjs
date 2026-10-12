import * as fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { handleNative,disposeNative,snapshotNativeInput } from './native.mjs';
import { createDAVActions } from './dav-actions.mjs';

const MAX_FILE = 64 * 1024 * 1024, MAX_TOTAL = 512 * 1024 * 1024;
const plans = new Map(), queues = new Map();
const davServices = new Map();
export const webdavServiceLimits = Object.freeze({workspaces:4,plansPerWorkspace:100,serializedMetadataPerWorkspace:32*1024*1024,serializedMetadataAcrossWorkspaces:128*1024*1024});
function davService(workspace,store) {
  let service = davServices.get(workspace.root);
  if (!service) {
    if (davServices.size >= webdavServiceLimits.workspaces) throw new Error('The WebDAV workspace service limit is reached. Close an existing host workspace first.');
    service = createDAVActions(workspace.root,store); davServices.set(workspace.root,service);
  }
  return service;
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function clean(value) {
  if (typeof value !== 'string' || !value || value.length > 4096 || value.includes('\\') || value.startsWith('/')) throw new Error('Use a relative workspace path with forward slashes.');
  for (const part of value.split('/')) if (!part || part === '.' || part === '..' || /[:<>"|?*\x00-\x1f]/.test(part) || /[. ]$/.test(part) || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part)) throw new Error('Unsafe or unsupported path.');
  if (value.split('/').includes('.rea-sync-history') || value.split('/').includes('.rea-backup')) throw new Error('Use a folder outside the application backup repositories.');
  return value;
}
async function safe(workspace, relative, internal = false) {
  const location = workspace.resolve(internal ? relative : clean(relative)), rel = path.relative(workspace.root, location);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Path must stay inside the workspace.');
  let current = workspace.root;
  for (const part of rel.split(path.sep)) {
    current = path.join(current, part);
    try { if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('Symbolic links are not supported.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return location;
}
async function scan(workspace, relative, allowMissing = false) {
  const root = await safe(workspace, relative), files = Object.create(null), directories = []; let total = 0, entries = 0;
  try { if (!(await fs.lstat(root)).isDirectory()) throw new Error('Sync paths must be directories.'); }
  catch (error) { if (allowMissing && error.code === 'ENOENT') return { files, directories, exists: false }; throw error; }
  const seen = new Set();
  async function walk(location, prefix) {
    const children = await fs.readdir(location, { withFileTypes: true }); children.sort((a,b) => a.name.localeCompare(b.name));
    for (const child of children) {
      const name = prefix ? `${prefix}/${child.name}` : child.name; clean(name);
      if (++entries > 10000) throw new Error('Folder exceeds the local entry limit.');
      const identity = name.toLowerCase(); if (seen.has(identity)) throw new Error('Case-colliding paths are not supported.'); seen.add(identity);
      const target = await safe(workspace, `${relative}/${name}`), before = await fs.lstat(target);
      if (before.isSymbolicLink()) throw new Error('Symbolic links are not supported.');
      if (before.isDirectory()) { directories.push(name); await walk(target,name); }
      else if (before.isFile()) {
        if (before.size > MAX_FILE || total + before.size > MAX_TOTAL) throw new Error('Folder exceeds the local size limit.');
        const bytes = await fs.readFile(target), after = await fs.lstat(target);
        if (before.size !== bytes.length || after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ino !== before.ino) throw new Error(`File changed while scanning: ${name}.`);
        total += bytes.length; files[name] = { hash: hash(bytes), size: bytes.length, mtimeMs: after.mtimeMs };
      } else throw new Error('Only regular files and directories are supported.');
    }
  }
  await walk(root,''); return { files, directories, exists: true };
}
const fingerprint = state => hash(JSON.stringify(state));
function paths(source, target) {
  clean(source); clean(target);
  const a = source.toLowerCase(), b = target.toLowerCase();
  if (a === b || a.startsWith(b + '/') || b.startsWith(a + '/')) throw new Error('Source and target folders must be separate, without nesting.');
}
async function plan(workspace, store, input) {
  const { source, target } = input, mode = input.mode ?? 'copy'; paths(source,target);
  if (!['copy','mirror','twoWay'].includes(mode)) throw new Error('Choose copy, mirror or twoWay.');
  const sourceState = await scan(workspace,source), targetState = await scan(workspace,target,true);
  const baselineKey = `sync.baseline.${hash(JSON.stringify([source,target]))}`, baseline = await store.get(baselineKey,null), operations = [], conflicts = [], skipped = [];
  const names = [...new Set([...Object.keys(sourceState.files),...Object.keys(targetState.files)])].sort();
  const sourceDirectories = new Set(sourceState.directories.map(x => x.toLowerCase())), targetDirectories = new Set(targetState.directories.map(x => x.toLowerCase()));
  const lowerNames = new Map();
  for (const name of names) {
    const identity = name.toLowerCase();
    if (lowerNames.has(identity) && lowerNames.get(identity) !== name) throw new Error('Case differences between folder paths require manual resolution.'); lowerNames.set(identity,name);
    if (sourceDirectories.has(identity) || targetDirectories.has(identity)) throw new Error(`A path is a file on one side and a folder on the other: ${name}.`);
    const left = sourceState.files[name], right = targetState.files[name];
    if (left && right && left.hash === right.hash) { skipped.push(name); continue; }
    if (left && right) {
      const previous = baseline?.files?.[name];
      const reason = !previous ? 'different-existing-files' : left.hash !== previous.source && right.hash !== previous.target ? 'both-sides-changed' : left.hash !== previous.source ? 'source-changed' : 'target-changed';
      conflicts.push({ path: name, reason, source: left, target: right });
    } else if (left) operations.push({ type: 'copy', from: 'source', to: 'target', path: name, hash: left.hash });
    else if (mode === 'twoWay') operations.push({ type: 'copy', from: 'target', to: 'source', path: name, hash: right.hash });
    else if (mode === 'mirror') operations.push({ type: 'delete', side: 'target', path: name, hash: right.hash });
    else skipped.push(name);
  }
  const createdAt = Date.now(), token = randomUUID(), record = { token, createdAt, source, target, mode, sourceState, targetState, baselineKey, operations, conflicts, skipped };
  const key = `${workspace.root}:${token}`;
  plans.set(key,record);
  for (const [name,value] of plans) if (createdAt - value.createdAt > 30 * 60 * 1000) plans.delete(name);
  if (plans.size > 200) plans.delete(plans.keys().next().value);
  return { token, mode, source, target, operations, conflicts, unchangedFiles: skipped.length, sourceBytes: Object.values(sourceState.files).reduce((n,f) => n + f.size,0), targetBytes: Object.values(targetState.files).reduce((n,f) => n + f.size,0), expiresInMinutes: 30 };
}
async function backupExisting(workspace, token, side, relative, bytes) {
  const name = `.rea-sync-history/${token}/${side}/${relative}`, location = await safe(workspace,name,true);
  await fs.mkdir(path.dirname(location), { recursive: true }); await fs.writeFile(location,bytes, { flag: 'wx' });
  return name;
}
async function copy(workspace, record, operation) {
  const fromRoot = record[operation.from], toRoot = record[operation.to], source = await safe(workspace,`${fromRoot}/${operation.path}`), target = await safe(workspace,`${toRoot}/${operation.path}`);
  const bytes = await fs.readFile(source);
  if (hash(bytes) !== operation.hash) throw new Error(`Source changed during synchronization: ${operation.path}.`);
  let old;
  try { old = await fs.readFile(target); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (operation.previousHash) {
    if (!old || hash(old) !== operation.previousHash) throw new Error(`Target changed during synchronization: ${operation.path}.`);
    await backupExisting(workspace,record.token,operation.to,operation.path,old);
  } else if (old) throw new Error(`A target appeared after the preview: ${operation.path}.`);
  await fs.mkdir(path.dirname(target), { recursive: true });
  if (!old) await fs.writeFile(target,bytes, { flag: 'wx' });
  else {
    const temporary = `${target}.rea-sync-${randomUUID()}`;
    await fs.writeFile(temporary,bytes, { flag: 'wx' });
    try {
      if (hash(await fs.readFile(target)) !== operation.previousHash) throw new Error(`Target changed during synchronization: ${operation.path}.`);
      await fs.rename(temporary,target);
    } catch (error) { await fs.unlink(temporary); throw error; }
  }
  const metadata = record[`${operation.from}State`].files[operation.path];
  await fs.utimes(target,new Date(),new Date(metadata.mtimeMs));
  if (hash(await fs.readFile(target)) !== operation.hash) throw new Error(`Copied file failed verification: ${operation.path}.`);
}
async function apply(workspace, store, input) {
  if (input.confirm !== true) throw new Error('Applying a sync plan requires explicit confirmation.');
  const record = plans.get(`${workspace.root}:${input.token}`);
  if (!record || Date.now() - record.createdAt > 30 * 60 * 1000) throw new Error('Preview the folders again; this plan is missing or expired.');
  const currentSource = await scan(workspace,record.source), currentTarget = await scan(workspace,record.target,true);
  if (fingerprint(currentSource) !== fingerprint(record.sourceState) || fingerprint(currentTarget) !== fingerprint(record.targetState)) throw new Error('Folders changed after the preview. Create a fresh plan.');
  const operations = [...record.operations], resolutions = input.resolutions ?? {};
  if (!resolutions || typeof resolutions !== 'object' || Array.isArray(resolutions)) throw new Error('Invalid conflict choices.');
  for (const conflict of record.conflicts) {
    const choice = resolutions[conflict.path];
    if (!['source','target','skip'].includes(choice)) throw new Error(`Choose source, target or skip for conflict ${conflict.path}.`);
    if (choice === 'skip' || (choice === 'target' && record.mode !== 'twoWay')) continue;
    const to = choice === 'source' ? 'target' : 'source';
    operations.push({ type: 'copy', from: choice, to, path: conflict.path, hash: conflict[choice].hash, previousHash: conflict[to].hash });
  }
  if (operations.some(op => op.type === 'delete') && input.allowDelete !== true) throw new Error('Mirror deletions require their own explicit confirmation.');
  const destinationRoots = record.mode === 'twoWay' ? ['source','target'] : ['target'];
  for (const side of destinationRoots) {
    const root = await safe(workspace,record[side]); await fs.mkdir(root, { recursive: true });
    const opposite = side === 'source' ? 'targetState' : 'sourceState';
    for (const name of record[opposite].directories) await fs.mkdir(await safe(workspace,`${record[side]}/${name}`), { recursive: true });
  }
  let copied = 0, removed = 0;
  try {
    for (const operation of operations) {
      if (operation.type === 'copy') { await copy(workspace,record,operation); copied++; }
      else {
        const location = await safe(workspace,`${record.target}/${operation.path}`), bytes = await fs.readFile(location);
        if (hash(bytes) !== operation.hash) throw new Error(`Delete target changed: ${operation.path}.`);
        await backupExisting(workspace,record.token,'target',operation.path,bytes);
        await fs.unlink(location); removed++;
      }
    }
  } catch (error) {
    plans.delete(`${workspace.root}:${input.token}`);
    throw new Error(`Sync stopped after ${copied} copies and ${removed} removals. Preview again. Preserved prior files are under .rea-sync-history/${record.token}. ${error.message}`);
  }
  const sourceState = await scan(workspace,record.source), targetState = await scan(workspace,record.target), files = Object.create(null);
  for (const name of new Set([...Object.keys(sourceState.files),...Object.keys(targetState.files)])) files[name] = { source: sourceState.files[name]?.hash, target: targetState.files[name]?.hash };
  const result = { copied, removed, unchangedFiles: record.skipped.length, historyFolder: operations.some(op => op.previousHash || op.type === 'delete') ? `.rea-sync-history/${record.token}` : null, completedAt: new Date().toISOString() };
  await store.set(record.baselineKey,{ files, completedAt: result.completedAt }); await store.set('sync.lastResult',result);
  plans.delete(`${workspace.root}:${input.token}`); return result;
}
async function run({ action, input = {}, workspace, store }) {
  if (action.startsWith('rclone-')) return handleNative({action,input,workspace,store});
  if (action === 'plan') return plan(workspace,store,input);
  if (action === 'apply') return apply(workspace,store,input);
  if (action === 'status') return { lastResult: await store.get('sync.lastResult',null) };
  if (action === 'putFile') {
    const target = await safe(workspace,input.path);
    if (typeof input.content !== 'string' || Buffer.byteLength(input.content) > MAX_FILE) throw new Error('File content exceeds the local size limit.');
    await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target,input.content, { flag: 'wx' });
    return { created: true, path: input.path };
  }
  throw new Error('Unknown synchronization action.');
}
export async function handle(context) {
  if (context.action.startsWith('webdav-')) return davService(context.workspace,context.store).handle(context.action,context.input ?? {});
  if (context.action.startsWith('rclone-')) context = {...context,input:snapshotNativeInput(context.action,context.input ?? {})};
  const key = context.workspace.root, previous = queues.get(key) ?? Promise.resolve(), current = previous.catch(() => {}).then(() => run(context)); queues.set(key,current);
  try { return await current; } finally { if (queues.get(key) === current) queues.delete(key); }
}
export function dispose(workspace) { const service = davServices.get(workspace.root); if (service) { service.close(); davServices.delete(workspace.root); } disposeNative(workspace); for (const key of plans.keys()) if (key.startsWith(`${workspace.root}:`)) plans.delete(key); }
