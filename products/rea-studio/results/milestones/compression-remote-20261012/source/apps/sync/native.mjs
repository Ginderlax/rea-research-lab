import * as fs from 'node:fs/promises';
import path from 'node:path';
import { createHash,randomUUID } from 'node:crypto';
import { types } from 'node:util';
import { compileFilters } from './native-filters.mjs';
import { compareFiles,comparisonOptions } from './native-comparison.mjs';

export const nativeLimits = Object.freeze({file:64*1024*1024,total:512*1024*1024,entries:10000,depth:100,milliseconds:120000,filterSteps:100000000,plans:200,planMinutes:30,planMetadataPerPlan:16*1024*1024,planMetadataTotal:64*1024*1024,inputBytes:128*1024,inputNodes:8192,inputDepth:16});
const plans = new Map(), queues = new Map();
function expirePlans(now = Date.now()) { for (const [key,value] of plans) if (now-value.record.createdAt > nativeLimits.planMinutes*60000) plans.delete(key); }
export function snapshotNativeInput(action,input = {}) {
  const fields = {'rclone-plan':['source','target','mode','comparison','filters','createEmptySrcDirs'],'rclone-apply':['token','confirm','allowDelete'],'rclone-status':[]}[action];
  if (!fields) throw new Error('Unknown native synchronization action.');
  let bytes = 0, nodes = 0; const ancestors = new Set();
  const reject = () => { throw new Error('Native input must be bounded plain data without unknown fields, accessors, proxies or cycles.'); };
  function inspect(value,depth = 0,top = false) {
    if (++nodes > nativeLimits.inputNodes || depth > nativeLimits.inputDepth) reject();
    if (typeof value === 'string') { if (value.length > nativeLimits.inputBytes) reject(); bytes += Buffer.byteLength(value)+2; }
    else if (value === null || value === undefined || typeof value === 'boolean') bytes += 5;
    else if (typeof value === 'number' && Number.isFinite(value)) bytes += 24;
    else if (typeof value === 'object') {
      if (types.isProxy(value) || ancestors.has(value)) reject();
      const array = Array.isArray(value), prototype = Object.getPrototypeOf(value);
      if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) reject();
      if (top && array) reject();
      if (array && Object.getOwnPropertyDescriptor(value,'length').value > 256) reject();
      const keys = Reflect.ownKeys(value); if (keys.length > (array ? 257:64)) reject();
      ancestors.add(value); bytes += 2;
      for (const key of keys) {
        if (typeof key !== 'string' || key.length > 2048 || top && !fields.includes(key)) reject();
        const descriptor = Object.getOwnPropertyDescriptor(value,key); if (!descriptor || !Object.hasOwn(descriptor,'value')) reject();
        if (array && key === 'length') continue;
        if (!descriptor.enumerable || array && !/^(0|[1-9]\d*)$/.test(key)) reject();
        bytes += Buffer.byteLength(key)+4; inspect(descriptor.value,depth+1);
      }
      ancestors.delete(value);
    } else reject();
    if (bytes > nativeLimits.inputBytes) reject();
  }
  if (!input || typeof input !== 'object') reject(); inspect(input,0,true);
  return structuredClone(input);
}
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const md5 = bytes => createHash('md5').update(bytes).digest('hex');
const join = (base,name) => base && name ? `${base}/${name}`:base || name;
const comparePath = (a,b) => Buffer.compare(Buffer.from(a),Buffer.from(b));
const fingerprint = state => sha256(JSON.stringify(state));
function clean(value,internal = false) {
  if (typeof value !== 'string' || !value || value.length > 2048 || !value.isWellFormed() || value.startsWith('/') || value.includes('\\')) throw new Error('Use a bounded relative workspace folder with forward slashes.');
  for (const part of value.split('/')) {
    if (!part || part === '.' || part === '..' || /[:<>"|?*\x00-\x1f\x7f]/.test(part) || /[. ]$/.test(part) || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part)) throw new Error('Unsafe local synchronization path.');
    if (!internal && ['.rea-sync-history','.rea-backup'].includes(part.toLowerCase())) throw new Error('Choose folders outside application recovery repositories.');
  }
  return value;
}
function separate(source,target) { clean(source); clean(target); const a = source.toLowerCase(), b = target.toLowerCase(); if (a === b || a.startsWith(b+'/') || b.startsWith(a+'/')) throw new Error('Source and target folders must be separate, without nesting.'); }
function location(workspace,relative,internal = false) { return workspace.resolve(clean(relative,internal)); }
function guard(start) { if (Date.now()-start > nativeLimits.milliseconds) throw new Error('The bounded synchronization operation exceeded two minutes.'); }
async function fileState(workspace,relative,start) {
  guard(start); const target = location(workspace,relative), before = await fs.lstat(target,{bigint:true});
  if (!before.isFile() || before.isSymbolicLink() || before.size > BigInt(nativeLimits.file)) throw new Error('Only bounded regular files are supported.');
  const bytes = await fs.readFile(target), after = await fs.lstat(location(workspace,relative),{bigint:true});
  if (BigInt(bytes.length) !== before.size || after.size !== before.size || after.mtimeNs !== before.mtimeNs || after.ino !== before.ino) throw new Error('File changed while being read: '+relative);
  return {bytes,state:{size:bytes.length,sha256:sha256(bytes),md5:md5(bytes),mtimeNs:after.mtimeNs.toString(),inode:after.ino.toString()}};
}
async function scan(workspace,relative,start,missing = false) {
  const root = location(workspace,relative), files = Object.create(null), directories = [], identities = new Set(); let entries = 0, total = 0;
  let rootStat;
  try { rootStat = await fs.lstat(root,{bigint:true}); if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Native synchronization paths must be regular directories.'); }
  catch (error) { if (missing && error.code === 'ENOENT') return {exists:false,files,directories}; throw error; }
  async function walk(prefix,depth) {
    guard(start); if (depth > nativeLimits.depth) throw new Error('Directory nesting exceeds the local limit.');
    const current = location(workspace,join(relative,prefix)), before = await fs.lstat(current,{bigint:true});
    const children = await fs.readdir(current,{withFileTypes:true}); children.sort((a,b) => comparePath(a.name,b.name));
    if (children.length + entries > nativeLimits.entries) throw new Error('Folder exceeds 10,000 entries.');
    for (const child of children) {
      const name = join(prefix,child.name); clean(name);
      if (++entries > nativeLimits.entries || identities.has(name.toLowerCase())) throw new Error('Folder exceeds entry limits or has case-colliding paths.'); identities.add(name.toLowerCase());
      const stat = await fs.lstat(location(workspace,join(relative,name)),{bigint:true});
      if (stat.isSymbolicLink()) throw new Error('Symbolic links are unsupported by the bounded local slice.');
      if (stat.isDirectory()) { directories.push(name); await walk(name,depth+1); }
      else {
        if (!stat.isFile() || stat.size > BigInt(nativeLimits.file) || BigInt(total) + stat.size > BigInt(nativeLimits.total)) throw new Error('Folder exceeds local file or total byte limits.');
        const result = await fileState(workspace,join(relative,name),start); total += result.state.size; files[name] = result.state;
      }
    }
    const after = await fs.lstat(location(workspace,join(relative,prefix)),{bigint:true});
    if (after.mtimeNs !== before.mtimeNs || after.ino !== before.ino) throw new Error('Directory changed while being scanned.');
  }
  await walk('',0); return {exists:true,files,directories};
}
function selection(state,filter,budget) {
  const directory = name => { const parts = name.split('/'); for (let i = 1; i <= parts.length; i++) if (!filter.includeDirectory(parts.slice(0,i).join('/'),budget)) return false; return true; };
  const directories = state.directories.filter(directory), allowed = new Set(directories);
  const files = Object.keys(state.files).filter(name => { const parent = name.includes('/') ? name.slice(0,name.lastIndexOf('/')):''; return (!parent || allowed.has(parent)) && filter.includeFile(name,state.files[name].size,budget); });
  return {files, directories};
}
function collision(source,target) {
  const names = new Map(), fileNames = new Set([...Object.keys(source.files),...Object.keys(target.files)].map(x => x.toLowerCase())), dirs = new Set([...source.directories,...target.directories].map(x => x.toLowerCase()));
  for (const name of [...Object.keys(source.files),...Object.keys(target.files),...source.directories,...target.directories]) {
    const key = name.toLowerCase(); if (names.has(key) && names.get(key) !== name) throw new Error('Case differences between folders require manual resolution.'); names.set(key,name);
    if (fileNames.has(key) && dirs.has(key)) throw new Error('A path is a file on one side and a directory on the other.');
  }
}
async function preview({workspace,input}) {
  const {source,target} = input; separate(source,target); const mode = input.mode ?? 'copy';
  if (!['copy','sync'].includes(mode)) throw new Error('Native local mode supports copy or sync.');
  if (input.createEmptySrcDirs !== undefined && typeof input.createEmptySrcDirs !== 'boolean') throw new Error('createEmptySrcDirs must be boolean.');
  const filter = compileFilters(input.filters), comparison = comparisonOptions(input.comparison), start = Date.now();
  const sourceState = await scan(workspace,source,start), targetState = await scan(workspace,target,start,true); collision(sourceState,targetState);
  const budget = {remaining:nativeLimits.filterSteps}, left = selection(sourceState,filter,budget), right = selection(targetState,filter,budget), operations = [], skipped = [];
  for (const name of left.files.sort(comparePath)) {
    const decision = compareFiles(sourceState.files[name],targetState.files[name],comparison);
    if (decision.type === 'skip') skipped.push({path:name,reason:decision.reason,byteHashesEqual:sourceState.files[name].sha256 === targetState.files[name]?.sha256});
    else operations.push({...decision,path:name,source:sourceState.files[name],previous:targetState.files[name] ?? null});
  }
  if (input.createEmptySrcDirs) {
    if (!targetState.exists && !left.files.length && !left.directories.length) operations.push({type:'mkdir',path:'',reason:'create-empty-source-root'});
    for (const name of left.directories.sort((a,b) => a.split('/').length-b.split('/').length || comparePath(a,b))) if (!targetState.directories.includes(name)) operations.push({type:'mkdir',path:name,reason:'create-empty-source-directories'});
  }
  if (mode === 'sync') {
    const present = new Set(left.files), deletes = new Set();
    for (const name of right.files.sort(comparePath)) if (!present.has(name)) { deletes.add(name); operations.push({type:'delete',path:name,previous:targetState.files[name],reason:'selected-target-only-file'}); }
    const sourceDirs = new Set(left.directories), removed = new Set();
    for (const name of right.directories.sort((a,b) => b.split('/').length-a.split('/').length || comparePath(a,b))) {
      if (sourceDirs.has(name) || Object.keys(targetState.files).some(x => x.startsWith(name+'/') && !deletes.has(x)) || targetState.directories.some(x => x.startsWith(name+'/') && !removed.has(x))) continue;
      removed.add(name); operations.push({type:'rmdir',path:name,reason:'empty-target-only-directory'});
    }
  }
  for (const operation of operations) {
    const relative = join(target,operation.path); location(workspace,relative);
    if (operation.type === 'copy') clean(relative+'.rea-native-'+ '0'.repeat(36)+'.pending');
    if (operation.previous && ['copy','delete'].includes(operation.type)) clean('.rea-sync-history/'+ '0'.repeat(36)+'/previous/'+operation.path,true);
  }
  const token = randomUUID(), record = {token,createdAt:Date.now(),source,target,mode,sourceState,targetState,comparison,filters:input.filters ?? {},createEmptySrcDirs:Boolean(input.createEmptySrcDirs),operations,skipped};
  const metadataBytes = Buffer.byteLength(JSON.stringify(record)); if (metadataBytes > nativeLimits.planMetadataPerPlan) throw new Error('Native plan exceeds the 16 MiB serialized metadata limit; narrow the folders or selection.');
  expirePlans(record.createdAt);
  let retained = [...plans.values()].reduce((sum,value) => sum+value.metadataBytes,0);
  while (plans.size >= nativeLimits.plans || retained+metadataBytes > nativeLimits.planMetadataTotal) { const key = plans.keys().next().value; retained -= plans.get(key).metadataBytes; plans.delete(key); }
  plans.set(`${workspace.root}:${token}`,{record:structuredClone(record),metadataBytes});
  return structuredClone({format:'local-rclone-v1.75.2-subset',token,source,target,mode,operations,skipped,filters:filter.summary,comparison,excludedSourceFiles:Object.keys(sourceState.files).length-left.files.length,excludedTargetFiles:Object.keys(targetState.files).length-right.files.length,expiresInMinutes:nativeLimits.planMinutes,dryRun:true,scope:'Regular local files; preview changes nothing. Source contents are preferred on apply, and previous target bytes are preserved.'});
}
function timeForWrite(text) {
  const nanoseconds = BigInt(text), milliseconds = Number(nanoseconds/1000000n);
  if (process.platform === 'win32' && (nanoseconds < 0n || nanoseconds > 4294967295999000000n)) throw new Error('Native Windows writes require modification times from 1970 through 2106-02-07T06:28:15.999Z.');
  if (!Number.isFinite(milliseconds) || Math.abs(milliseconds) > 8640000000000000) throw new Error('Modification time is not representable by this host.');
  return milliseconds;
}
async function setTime(workspace,relative,mtimeNs) {
  const expected = timeForWrite(mtimeNs); await fs.utimes(location(workspace,relative),new Date(),new Date(expected));
  if (Math.abs((await fs.stat(location(workspace,relative))).mtimeMs-expected) >= 1) throw new Error('Host did not retain the requested millisecond modification time.');
}
async function expectedFile(workspace,relative,expected,start) { const current = await fileState(workspace,relative,start); if (fingerprint(current.state) !== fingerprint(expected)) throw new Error('File changed after the preview: '+relative); return current.bytes; }
async function preserve(workspace,record,operation,bytes) {
  const relative = `.rea-sync-history/${record.token}/previous/${operation.path}`, target = location(workspace,relative,true); await fs.mkdir(path.dirname(target),{recursive:true}); await fs.writeFile(target,bytes,{flag:'wx'}); return relative;
}
async function apply({workspace,store,input}) {
  if (input.confirm !== true) throw new Error('Applying a native preview requires explicit confirmation.');
  const key = `${workspace.root}:${input.token}`, record = plans.get(key)?.record, start = Date.now();
  if (!record || start-record.createdAt > nativeLimits.planMinutes*60000) throw new Error('Preview again: the native plan is missing or expired.');
  if (record.operations.some(op => ['delete','rmdir'].includes(op.type)) && input.allowDelete !== true) throw new Error('Sync removals require their own explicit confirmation.');
  const left = await scan(workspace,record.source,start), right = await scan(workspace,record.target,start,true);
  if (fingerprint(left) !== fingerprint(record.sourceState) || fingerprint(right) !== fingerprint(record.targetState)) throw new Error('Folders changed after preview; create a fresh native plan.');
  for (const operation of record.operations) if (operation.source) timeForWrite(operation.source.mtimeNs);
  plans.delete(key); const history = record.operations.some(op => op.previous && ['copy','delete'].includes(op.type)) ? `.rea-sync-history/${record.token}`:null;
  let copied = 0, timestampsUpdated = 0, removed = 0, directoriesCreated = 0, directoriesRemoved = 0;
  try {
    if (history) {
      await fs.mkdir(location(workspace,history,true),{recursive:true});
      await fs.writeFile(location(workspace,history+'/manifest.json',true),JSON.stringify({format:'rea-sync-recovery-v1',source:record.source,target:record.target,createdAt:new Date().toISOString(),operations:record.operations},null,2)+'\n',{flag:'wx'});
    }
    for (const operation of record.operations) {
      guard(start); const relative = join(record.target,operation.path), target = location(workspace,relative);
      if (operation.type === 'mkdir') { await fs.mkdir(target,{recursive:true}); directoriesCreated++; continue; }
      if (operation.type === 'rmdir') { await fs.rmdir(target); directoriesRemoved++; continue; }
      if (operation.type === 'updateModtime') { await expectedFile(workspace,join(record.source,operation.path),operation.source,start); await expectedFile(workspace,relative,operation.previous,start); await setTime(workspace,relative,operation.source.mtimeNs); timestampsUpdated++; continue; }
      if (operation.type === 'delete') { const bytes = await expectedFile(workspace,relative,operation.previous,start); await preserve(workspace,record,operation,bytes); await expectedFile(workspace,relative,operation.previous,start); await fs.unlink(location(workspace,relative)); removed++; continue; }
      const bytes = await expectedFile(workspace,join(record.source,operation.path),operation.source,start);
      if (operation.previous) { const previous = await expectedFile(workspace,relative,operation.previous,start); await preserve(workspace,record,operation,previous); }
      else { try { await fs.lstat(target); throw new Error('A target appeared after preview.'); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
      await fs.mkdir(path.dirname(target),{recursive:true});
      const temporaryRelative = relative + '.rea-native-' + randomUUID() + '.pending', temporary = location(workspace,temporaryRelative);
      let ownedTemporary = false;
      try {
        const file = await fs.open(temporary,'wx'); ownedTemporary = true; try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
        if (operation.previous) { await expectedFile(workspace,relative,operation.previous,start); await fs.rename(location(workspace,temporaryRelative),location(workspace,relative)); }
        else await fs.link(location(workspace,temporaryRelative),location(workspace,relative));
      } finally { if (ownedTemporary) try { await fs.unlink(location(workspace,temporaryRelative)); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
      await setTime(workspace,relative,operation.source.mtimeNs);
      if (sha256(await fs.readFile(location(workspace,relative))) !== operation.source.sha256) throw new Error('Copied bytes failed SHA-256 verification.'); copied++;
    }
  } catch (error) {
    const result = {format:'local-rclone-v1.75.2-subset',status:'partial-failure',copied,timestampsUpdated,removed,directoriesCreated,directoriesRemoved,historyFolder:history,completedAt:new Date().toISOString(),error:error.message};
    let persistenceError = ''; if (store) try { await store.set('sync.native.lastResult',result); } catch (writeError) { persistenceError = ' Status could not be saved: '+writeError.message; }
    throw new Error(`Native sync stopped after ${copied} copies, ${timestampsUpdated} timestamp updates and ${removed} removals. Preview again. ${history ? 'Prior bytes are preserved under '+history+'. ':''}${error.message}${persistenceError}`);
  }
  const result = {format:'local-rclone-v1.75.2-subset',status:'completed',copied,timestampsUpdated,removed,directoriesCreated,directoriesRemoved,skipped:record.skipped.length,historyFolder:history,completedAt:new Date().toISOString()};
  if (store) try { await store.set('sync.native.lastResult',result); } catch (error) { throw new Error(`Native filesystem operations completed: ${copied} copies, ${timestampsUpdated} timestamp updates and ${removed} removals. Status could not be saved. ${history ? 'Prior bytes are preserved under '+history+'. ':''}${error.message}`); } return result;
}
async function run(context) {
  expirePlans();
  if (context.action === 'rclone-plan') return preview(context);
  if (context.action === 'rclone-apply') return apply(context);
  if (context.action === 'rclone-status') return {lastResult:context.store ? await context.store.get('sync.native.lastResult',null):null,capabilities:{modes:['copy','sync'],comparisonFlags:['checksum','sizeOnly','ignoreSize','ignoreTimes','ignoreExisting','update','noUpdateModtime','modifyWindowNs'],filters:['include','includeFrom','exclude','excludeFrom','filter','filterFrom','filesFrom','filesFromRaw','filesFrom0','ignoreCase','minSize','maxSize']},limits:nativeLimits,globalPlanCache:{plans:plans.size,serializedMetadataBytes:[...plans.values()].reduce((sum,value) => sum+value.metadataBytes,0),expirationCleanup:'next-native-request-or-host-disposal'},fullProductComplete:false,universalSuperiorityEstablished:false};
  throw new Error('Unknown native synchronization action.');
}
export async function handleNative(context) { const input = snapshotNativeInput(context.action,context.input ?? {}), key = context.workspace.root, previous = queues.get(key) ?? Promise.resolve(), current = previous.catch(() => {}).then(() => run({...context,input})); queues.set(key,current); try { return await current; } finally { if (queues.get(key) === current) queues.delete(key); } }
export function disposeNative(workspace) { for (const key of plans.keys()) if (key.startsWith(workspace.root+':')) plans.delete(key); }
