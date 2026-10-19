// Complete fixed historical Git input, acquired only on the reviewed hosted
// publication/audit jobs. This root is separate from actual installed Notes46.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const COMMIT = '2a8482b42784eb262d6d5b82e62d8d1220dc4821';
// Actual current source parent is distinct from the immutable historical input.
const CURRENT_SOURCE_PARENT = 'ab26bf14bc1a55a723566bbafb3ca391c3ef671c';
const REVIEWED_SOURCE_GRANDPARENT = 'cee2da08f7ebe81a003a6cc9828655794be48cb0';
const REVIEWED_SOURCE_GREAT_GRANDPARENT = '40c7df91936aaf9574801aa38c5a635f299e6e39';
const TREE = '34e8de6f0c447edd2bc1a6389ed5dfb727705025';
const SELF = 'scripts/notes46-historical-input-root.mjs';
const DESCRIPTOR = Object.freeze({ path: 'products/rea-studio/experiments/notes46-installed-search-20261019/historical-input/TREE-DESCRIPTOR.json', bytes: 1919, sha256: '1d575abb7699f61299ecfb51de274a208cf9e9562013062eb1f41027d0682ba3' });
const METADATA = Object.freeze({ bytes: 6178851, sha256: 'e13fb2df4404f45f95ef8e71cdc61e2bd3a59c6a1d901409c4dfac38f6382c6a' });
const LIMITS = Object.freeze({ files: 29069, rawBytes: 1381427700, memberBytes: 24642423, depth: 32, pathCharacters: 2048, metadataBytes: 8 * 1024 * 1024, batchFiles: 256, batchRawBytes: 32 * 1024 * 1024, batchResponseBytes: 33 * 1024 * 1024, gitTimeoutMs: 60000, executionBoundaries: 256 });
const REF = 'refs/heads/experiment/notes46-installed-search-20261019';
const JOBS = Object.freeze(['publication-integrity', 'audit']);
const contexts = new WeakMap(), cached = new Map(), attempted = new Set();
const identity = bytes => ({ bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
const blob = bytes => createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
const metadataPin = row => ({ bytes: row.bytes, sha256: row.sha256 });
function deepFreeze(value) { if (value && typeof value === 'object' && !Object.isFrozen(value)) { for (const child of Object.values(value)) deepFreeze(child); Object.freeze(value); } return value; }
function cloneFrozen(value) { return deepFreeze(structuredClone(value)); }
function safe(name) {
  assert(typeof name === 'string' && name.length > 0 && name.length <= LIMITS.pathCharacters && !name.startsWith('/') && !/[\\:\x00-\x1f\x7f<>"|?*]/.test(name), 'Unsafe historical input path');
  const parts = name.split('/'); assert(parts.length <= LIMITS.depth);
  assert(parts.every(part => part && part !== '.' && part !== '..' && part.toLowerCase() !== '.git' && !/[ .]$/.test(part) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)), 'Unsafe historical input segment');
  return name;
}
function within(root, filename) { const relative = path.relative(root, filename); return relative && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep); }
function confined(root, name) { const filename = path.resolve(root, ...safe(name).split('/')); assert(within(root, filename)); return filename; }
function noLinks(filename) {
  let at = path.resolve(filename);
  for (;;) { assert(!fs.lstatSync(at).isSymbolicLink(), 'Historical input reparse ancestor rejected'); const parent = path.dirname(at); if (parent === at) break; at = parent; }
  assert.equal(fs.realpathSync(filename).toLowerCase(), path.resolve(filename).toLowerCase(), 'Canonical historical input path');
}
function rootIdentity(filename) {
  noLinks(filename); const stat = fs.lstatSync(filename, { bigint: true }); assert(stat.isDirectory());
  return { realpath: fs.realpathSync(filename).toLowerCase(), device: stat.dev.toString(), inode: stat.ino.toString(), birthtimeNs: stat.birthtimeNs.toString() };
}
function readRegular(root, name, maximum) {
  const filename = confined(root, name); noLinks(filename); const before = fs.lstatSync(filename);
  assert(before.isFile() && before.size <= maximum, 'Regular bounded historical input required');
  const bytes = fs.readFileSync(filename), after = fs.lstatSync(filename);
  assert(after.isFile() && !after.isSymbolicLink()); assert.equal(bytes.length, before.size); assert.equal(bytes.length, after.size);
  assert.equal(after.dev, before.dev); assert.equal(after.ino, before.ino); assert.equal(after.mtimeMs, before.mtimeMs); return bytes;
}
function git(repoRoot, arguments_, maximum, input) {
  // No inherited Git routing, replacement objects or lazy network acquisition.
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_'))), GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never', GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: '', GIT_NO_LAZY_FETCH: '1' };
  const result = spawnSync('git', ['--no-replace-objects', '-C', repoRoot, ...arguments_], { input, encoding: null, shell: false, windowsHide: true, timeout: LIMITS.gitTimeoutMs, maxBuffer: maximum, env });
  assert.equal(result.error, undefined, 'Bounded historical Git process'); assert.equal(result.signal, null); assert.equal(result.status, 0, result.stderr?.toString('utf8').slice(0, 2048));
  assert(Buffer.isBuffer(result.stdout) && result.stdout.length <= maximum); assert.equal(result.stderr.length, 0, 'Unexpected historical Git diagnostic'); return result.stdout;
}
const execution = () => Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_REPOSITORY', 'GITHUB_REF', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_JOB', 'GITHUB_SERVER_URL', 'GITHUB_EVENT_NAME', 'RUNNER_TEMP'].map(name => [name, process.env[name]]));
function hosted() {
  assert.equal(process.platform, 'win32'); assert.equal(process.arch, 'x64'); assert.equal(process.version, 'v24.16.0');
  for (const [name, value] of Object.entries({ CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', RUNNER_OS: 'Windows', RUNNER_ARCH: 'X64', GITHUB_REPOSITORY: 'Ginderlax/rea-research-lab', GITHUB_REF: REF, GITHUB_SERVER_URL: 'https://github.com', GITHUB_EVENT_NAME: 'push' })) assert.equal(process.env[name], value, name);
  assert(JOBS.includes(process.env.GITHUB_JOB), 'Only publication/audit may materialize the historical tree');
  assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA ?? '')); for (const name of ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) assert(/^[1-9][0-9]*$/.test(process.env[name] ?? ''));
  assert(typeof process.env.RUNNER_TEMP === 'string' && path.isAbsolute(process.env.RUNNER_TEMP));
}
function readDescriptor(repoRoot) {
  const bytes = readRegular(repoRoot, DESCRIPTOR.path, 16 * 1024); assert.deepEqual(identity(bytes), metadataPin(DESCRIPTOR));
  assert.deepEqual(git(repoRoot, ['show', 'HEAD:' + DESCRIPTOR.path], 16 * 1024), bytes, 'Descriptor must be committed in actual current source');
  const descriptor = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  assert.equal(descriptor.schema, 'rea-notes46-complete-historical-input-tree-descriptor/v1'); assert.equal(descriptor.status, 'frozen-historical-git-input-descriptor-not-runtime-acceptance');
  assert.equal(descriptor.sourceCommit, COMMIT); assert.equal(descriptor.sourceTree, TREE); assert.deepEqual(descriptor.historicalInputLimits, LIMITS);
  assert.deepEqual(metadataPin(descriptor.metadata), METADATA); assert.deepEqual(descriptor.hostedJobs, JOBS); assert.equal(descriptor.branch, REF);
  assert.equal(descriptor.localMaterializationAllowed, false); assert.equal(descriptor.actualCurrent46AcceptanceClaimed, false); assert.equal(descriptor.historicalReceiptsRebound, false); assert.equal(descriptor.sourceEnvelopeLimitsUnchanged, true);
  return deepFreeze(descriptor);
}
function readTree(repoRoot) {
  assert.equal(git(repoRoot, ['rev-parse', COMMIT + '^{tree}'], 4096).toString('utf8').trim(), TREE);
  const raw = git(repoRoot, ['-c', 'core.quotepath=false', 'ls-tree', '-rzl', '--full-tree', COMMIT], LIMITS.metadataBytes);
  assert.deepEqual(identity(raw), METADATA, 'Externally frozen complete Git tree metadata'); assert.equal(raw.at(-1), 0);
  const lines = new TextDecoder('utf-8', { fatal: true }).decode(raw).split('\0'); assert.equal(lines.pop(), ''); assert.equal(lines.length, LIMITS.files);
  const rows = [], names = new Set(), directories = new Map(); let total = 0, maximum = 0;
  for (const line of lines) {
    const match = /^(\d{6}) (blob|commit) ([0-9a-f]{40}) +([0-9]+)\t(.+)$/.exec(line); assert(match, 'Complete regular long Git tree record');
    assert.equal(match[1], '100644'); assert.equal(match[2], 'blob'); const name = safe(match[5]), folded = name.toLowerCase(); assert(!names.has(folded), 'Case-colliding historical file'); names.add(folded);
    const bytes = Number(match[4]); assert(Number.isSafeInteger(bytes) && bytes >= 0 && bytes <= LIMITS.memberBytes); total += bytes; maximum = Math.max(maximum, bytes);
    const parts = name.split('/'); for (let i = 1; i < parts.length; i++) { const prefix = parts.slice(0, i).join('/'), key = prefix.toLowerCase(); if (directories.has(key)) assert.equal(directories.get(key), prefix, 'Case-colliding historical directory'); else directories.set(key, prefix); }
    rows.push({ path: name, mode: match[1], gitBlob: match[3], bytes });
  }
  for (const key of directories.keys()) assert(!names.has(key), 'Historical file/directory prefix collision');
  assert.equal(total, LIMITS.rawBytes); assert.equal(maximum, LIMITS.memberBytes); assert.equal(names.size, LIMITS.files);
  assert.deepEqual(rows.map(row => row.path), [...rows.map(row => row.path)].sort(), 'Reviewed ASCII Git path ordering'); return deepFreeze(rows);
}
function exactInventory(root, rows) {
  const files = [], directoryNames = [], expectedDirectories = new Set();
  for (const row of rows) { const parts = row.path.split('/'); for (let i = 1; i < parts.length; i++) expectedDirectories.add(parts.slice(0, i).join('/')); }
  function walk(directory, prefix = '', depth = 0) {
    assert(depth <= LIMITS.depth); noLinks(directory); const entries = fs.readdirSync(directory, { withFileTypes: true }); assert(entries.length <= LIMITS.files);
    for (const entry of entries) { const name = safe(prefix + entry.name); assert(!entry.isSymbolicLink()); const filename = confined(root, name); noLinks(filename);
      if (entry.isDirectory()) { assert(expectedDirectories.has(name), 'Undeclared historical directory'); directoryNames.push(name); assert(directoryNames.length <= expectedDirectories.size); walk(filename, name + '/', depth + 1); }
      else { assert(entry.isFile()); files.push(name); assert(files.length <= LIMITS.files); }
    }
  }
  walk(root); assert.deepEqual(files.sort(), rows.map(row => row.path), 'Exact complete historical physical file census'); assert.deepEqual(directoryNames.sort(), [...expectedDirectories].sort(), 'No unexpected empty or additional historical directory');
  return { files: files.length, directories: directoryNames.length };
}
function materialize(repoRoot, historicalRoot, rows) {
  const readbackRows = []; let count = 0, total = 0, batches = 0;
  for (let offset = 0; offset < rows.length;) {
    const batch = []; let rawBytes = 0;
    while (offset < rows.length && batch.length < LIMITS.batchFiles && rawBytes + rows[offset].bytes <= LIMITS.batchRawBytes) { const row = rows[offset++]; batch.push(row); rawBytes += row.bytes; }
    assert(batch.length > 0 && rawBytes <= LIMITS.batchRawBytes); batches++;
    const input = Buffer.from(batch.map(row => row.gitBlob).join('\n') + '\n');
    const output = git(repoRoot, ['cat-file', '--batch'], LIMITS.batchResponseBytes, input); let cursor = 0;
    for (const row of batch) {
      const newline = output.indexOf(10, cursor); assert(newline >= cursor && newline - cursor < 128, 'Bounded Git batch header');
      const expectedHeader = row.gitBlob + ' blob ' + row.bytes; assert.equal(output.subarray(cursor, newline).toString('ascii'), expectedHeader, 'Exact fixed Git blob membership/header'); cursor = newline + 1;
      assert(cursor + row.bytes < output.length); const bytes = output.subarray(cursor, cursor + row.bytes); cursor += row.bytes; assert.equal(output[cursor++], 10, 'Git batch payload delimiter'); assert.equal(blob(bytes), row.gitBlob, 'Raw historical Git blob hash');
      const observed = { ...row, ...identity(bytes) }, filename = confined(historicalRoot, row.path); fs.mkdirSync(path.dirname(filename), { recursive: true }); noLinks(path.dirname(filename));
      fs.writeFileSync(filename, bytes, { flag: 'wx' }); const readback = readRegular(historicalRoot, row.path, LIMITS.memberBytes); assert.deepEqual(identity(readback), metadataPin(observed)); assert.equal(blob(readback), row.gitBlob, 'Exclusive historical raw write/readback');
      readbackRows.push(observed); count++; total += bytes.length; assert(count <= LIMITS.files && total <= LIMITS.rawBytes);
    }
    assert.equal(cursor, output.length, 'No undeclared trailing Git batch bytes');
  }
  assert.equal(count, LIMITS.files); assert.equal(total, LIMITS.rawBytes); exactInventory(historicalRoot, rows);
  return { rows: deepFreeze(readbackRows), receipt: deepFreeze({ files: count, rawBytes: total, batches, perBatchFiles: LIMITS.batchFiles, perBatchRawBytes: LIMITS.batchRawBytes, memberBytes: LIMITS.memberBytes, fixedGitBlobsVerified: true, exclusiveWrites: true, allRawBytesReadBack: true, hardlinksUsed: false, archivesUsed: false, networkAcquisitionRequested: false }) };
}
function errorInfo(error) { return { name: error.name, message: String(error.message).slice(0, 4096) }; }

export function prepareNotes46HistoricalInputRoot(repoRoot) {
  hosted(); assert(typeof repoRoot === 'string' && path.isAbsolute(repoRoot)); repoRoot = path.resolve(repoRoot); const repoIdentity = rootIdentity(repoRoot);
  assert.equal(fs.realpathSync(confined(repoRoot, SELF)).toLowerCase(), fs.realpathSync(import.meta.filename).toLowerCase(), 'Current committed helper path required');
  const ownBytes = readRegular(repoRoot, SELF, 512 * 1024); assert.deepEqual(git(repoRoot, ['show', 'HEAD:' + SELF], 512 * 1024), ownBytes);
  assert.equal(git(repoRoot, ['rev-parse', 'HEAD'], 4096).toString('utf8').trim(), process.env.GITHUB_SHA);
  assert.equal(git(repoRoot, ['rev-list', '--parents', '-n', '1', 'HEAD'], 4096).toString('utf8').trim(), process.env.GITHUB_SHA + ' ' + CURRENT_SOURCE_PARENT, 'Reviewed immediate current source parent');
  assert.equal(git(repoRoot, ['rev-list', '--parents', '-n', '1', CURRENT_SOURCE_PARENT], 4096).toString('utf8').trim(), CURRENT_SOURCE_PARENT + ' ' + REVIEWED_SOURCE_GRANDPARENT, 'Reviewed source grandparent');
  assert.equal(git(repoRoot, ['rev-list', '--parents', '-n', '1', REVIEWED_SOURCE_GRANDPARENT], 4096).toString('utf8').trim(), REVIEWED_SOURCE_GRANDPARENT + ' ' + REVIEWED_SOURCE_GREAT_GRANDPARENT, 'Reviewed source great-grandparent');
  assert.equal(git(repoRoot, ['rev-list', '--parents', '-n', '1', REVIEWED_SOURCE_GREAT_GRANDPARENT], 4096).toString('utf8').trim(), REVIEWED_SOURCE_GREAT_GRANDPARENT + ' ' + COMMIT, 'Reviewed fixed historical fourth ancestor');
  const temporary = fs.realpathSync(process.env.RUNNER_TEMP); noLinks(temporary); assert(fs.lstatSync(temporary).isDirectory()); assert(!within(repoRoot, temporary));
  const cacheKey = repoIdentity.realpath;
  if (cached.has(cacheKey)) { const context = cached.get(cacheKey); assertNotes46HistoricalInputRoot(context); return context; }
  assert(!attempted.has(cacheKey), 'A failed historical materialization cannot be silently replayed in this process'); attempted.add(cacheKey);
  const descriptor = readDescriptor(repoRoot), rows = readTree(repoRoot), attempt = deepFreeze(execution());
  const container = fs.mkdtempSync(path.join(temporary, 'rea-notes46-historical-input-' + process.env.GITHUB_RUN_ID + '-' + process.env.GITHUB_RUN_ATTEMPT + '-' + process.env.GITHUB_JOB + '-')); noLinks(container); assert(within(temporary, container));
  const historicalRoot = path.join(container, 'input'); fs.mkdirSync(historicalRoot); const containerIdentity = rootIdentity(container), historicalIdentity = rootIdentity(historicalRoot), temporaryIdentity = rootIdentity(temporary);
  const acquired = materialize(repoRoot, historicalRoot, rows);
  const state = { repoRoot, descriptor, rows: acquired.rows, attempt, container, historicalRoot, repoIdentity, containerIdentity, historicalIdentity, temporaryIdentity, stack: [], boundaries: [], fullIntegrityPasses: 0, poison: null, disposed: false, disposing: false, closedSummary: null, cleanupReceipt: null };
  function lightCheck() {
    hosted(); assert.deepEqual(execution(), attempt); assert.deepEqual(rootIdentity(repoRoot), repoIdentity); assert.deepEqual(rootIdentity(temporary), temporaryIdentity); assert.deepEqual(rootIdentity(container), containerIdentity); assert.deepEqual(rootIdentity(historicalRoot), historicalIdentity);
    assert(within(temporary, container) && within(container, historicalRoot));
    assert.deepEqual(identity(readRegular(repoRoot, DESCRIPTOR.path, 16 * 1024)), metadataPin(DESCRIPTOR));
    assert.deepEqual(identity(readRegular(repoRoot, SELF, 512 * 1024)), identity(ownBytes));
  }
  function recheck() { assert.equal(state.disposed, false, 'Historical input context was disposed'); assert.equal(state.disposing, false, 'Historical input disposal is in progress'); lightCheck(); assert.equal(state.poison, null, 'Historical input integrity is poisoned'); return { rootIdentityAndFixedMetadataAuthenticated: true, fullRawTreeRehashed: false, pendingExecutionBoundaries: state.stack.length }; }
  function fullIntegrity(phase) {
    lightCheck(); const census = exactInventory(historicalRoot, state.rows); let total = 0;
    for (const row of state.rows) { const bytes = readRegular(historicalRoot, row.path, LIMITS.memberBytes); assert.deepEqual(identity(bytes), metadataPin(row), 'Historical SHA256 readback: ' + row.path); assert.equal(blob(bytes), row.gitBlob, 'Historical Git blob readback: ' + row.path); total += bytes.length; }
    assert.equal(total, LIMITS.rawBytes); state.fullIntegrityPasses++;
    return deepFreeze({ phase, files: census.files, directories: census.directories, rawBytes: total, allSHA256AndGitBlobBytesExact: true, physicalInventoryExact: true, checkedAt: new Date().toISOString(), passOrdinal: state.fullIntegrityPasses });
  }
  function beginExecution(label) {
    recheck(); assert(typeof label === 'string' && label.length > 0 && label.length <= 256 && !/[\x00-\x1f\x7f]/.test(label)); assert(state.boundaries.length < LIMITS.executionBoundaries);
    const outer = state.stack.length === 0, boundary = { sequence: state.boundaries.length + 1, label, depth: state.stack.length + 1, outer, status: 'opening', pending: true, startedAt: new Date().toISOString(), completedAt: null, before: null, after: null, failure: null };
    state.boundaries.push(boundary);
    try { boundary.before = outer ? fullIntegrity('before-outer-execution') : { rootIdentityAndFixedMetadataAuthenticated: true, nestedInsideSequence: state.stack[0].boundary.sequence, fullRawTreeRehashed: false }; }
    catch (error) { boundary.status = 'begin-failed'; boundary.pending = false; boundary.failure = errorInfo(error); state.poison = errorInfo(error); throw error; }
    boundary.status = 'open'; const token = Object.freeze({ sequence: boundary.sequence, label, depth: boundary.depth }); state.stack.push({ token, boundary }); return token;
  }
  function endExecution(token) {
    assert.equal(state.disposed, false, 'Historical input context was disposed'); assert.equal(state.disposing, false, 'Historical input disposal is in progress');
    assert(state.stack.length > 0 && state.stack.at(-1).token === token, 'Genuine historical execution token in LIFO order required'); const entry = state.stack.at(-1), boundary = entry.boundary;
    try { recheck(); boundary.after = boundary.outer ? fullIntegrity('after-outer-execution') : { rootIdentityAndFixedMetadataAuthenticated: true, fullRawTreeRehashed: false }; boundary.status = 'integrity-verified'; }
    catch (error) { boundary.status = 'end-failed'; boundary.failure = errorInfo(error); state.poison = errorInfo(error); throw error; }
    finally { boundary.pending = false; boundary.completedAt = new Date().toISOString(); state.stack.pop(); }
  }
  function summary() {
    assert.equal(state.disposed, false, 'Historical input context was disposed'); assert.equal(state.disposing, false, 'Historical input disposal is in progress');
    let recheckFailure = null; try { lightCheck(); } catch (error) { recheckFailure = errorInfo(error); state.poison ??= recheckFailure; }
    return cloneFrozen({ schema: 'rea-notes46-complete-historical-input-proof/v1', historicalInputCommit: COMMIT, historicalInputTree: TREE, inputFiles: LIMITS.files, inputRawBytes: LIMITS.rawBytes, maximumMemberBytes: LIMITS.memberBytes, descriptor: DESCRIPTOR, fixedRawTreeMetadata: METADATA,
      acquisition: acquired.receipt, verifiedHostedMaterialization: true, workflowSourceSHA: attempt.GITHUB_SHA, workflowRun: attempt.GITHUB_RUN_ID, workflowAttempt: attempt.GITHUB_RUN_ATTEMPT, workflowJob: attempt.GITHUB_JOB,
      fullTreeAcquisition: true, historicalInputOnly: true, current46AcceptanceClaimed: false, old551AcceptanceInferred: false, historicalReceiptsRebound: false, globalFilesystemOverlay: false, sourceEnvelopeLimitsUnchanged: true, hardlinksUsed: false, rawHistoricalPayloadArtifactRequired: false,
      contextStatus: state.poison ? 'failed' : state.stack.length ? 'execution-boundary-pending' : 'available', poison: state.poison, recheckFailure, pendingExecutionBoundaries: state.stack.length, pendingOuterBoundary: state.stack.length > 0, fullIntegrityPasses: state.fullIntegrityPasses,
      completedOuterBoundaries: state.boundaries.filter(row => row.outer && row.status === 'integrity-verified' && !row.pending).length, boundaries: state.boundaries, activeImportRootIdentityVerified: recheckFailure === null,
      recheckScope: 'Fixed descriptor/helper bytes and physical owned-root identities only; complete raw tree checks occur once before/after each outer execution boundary. Original readers retain their own proof hashing.', fullParity: false, superiority: false });
  }
  // Caller captures its immutable summary before disposal. This method deletes
  // only this genuine context's created hosted temp container, never a supplied
  // path, repository, runner temp itself or another process's resources.
  function dispose() {
    recheck(); assert.equal(state.stack.length, 0, 'Pending execution cannot be disposed'); assert.equal(state.poison, null);
    assert(state.fullIntegrityPasses >= 2 && state.boundaries.some(row => row.outer && row.status === 'integrity-verified' && !row.pending), 'A completed outer raw integrity boundary is required before disposal');
    assert(state.boundaries.every(row => row.status === 'integrity-verified' && !row.pending), 'All execution boundaries must have completed successfully');
    assert(path.isAbsolute(container) && path.isAbsolute(temporary) && path.isAbsolute(repoRoot));
    const target = path.resolve(container), expectedPrefix = 'rea-notes46-historical-input-' + attempt.GITHUB_RUN_ID + '-' + attempt.GITHUB_RUN_ATTEMPT + '-' + attempt.GITHUB_JOB + '-';
    assert.equal(target, container); assert(within(temporary, target)); assert(path.basename(target).startsWith(expectedPrefix) && path.basename(target).length > expectedPrefix.length);
    assert.notEqual(target.toLowerCase(), temporary.toLowerCase()); assert.notEqual(target.toLowerCase(), repoRoot.toLowerCase());
    assert(!within(target, temporary) && !within(target, repoRoot) && !within(repoRoot, target), 'Cleanup cannot target a repository/temp ancestor or repository descendant');
    lightCheck(); const top = fs.readdirSync(container, { withFileTypes: true }); assert.equal(top.length, 1); assert.equal(top[0].name, 'input'); assert(top[0].isDirectory() && !top[0].isSymbolicLink());
    const finalInventory = exactInventory(historicalRoot, state.rows); lightCheck();
    const closedSummary = summary(); assert.equal(closedSummary.contextStatus, 'available'); assert.equal(closedSummary.pendingExecutionBoundaries, 0); assert.equal(closedSummary.poison, null);
    state.closedSummary = closedSummary; const closedSummaryIdentity = identity(Buffer.from(JSON.stringify(closedSummary)));
    state.disposing = true; const startedAt = new Date().toISOString(); let removed = false;
    try {
      // Last identity/metadata check immediately precedes this one native Node
      // recursive operation. No shell, arbitrary filename or fallback deletion.
      lightCheck(); fs.rmSync(target, { recursive: true, force: false, maxRetries: 0 });
      try { fs.lstatSync(target); } catch (error) { assert.equal(error.code, 'ENOENT'); removed = true; }
      assert.equal(removed, true, 'Owned historical temp container must be absent');
      assert.deepEqual(rootIdentity(temporary), temporaryIdentity); assert.deepEqual(rootIdentity(repoRoot), repoIdentity);
      assert.deepEqual(identity(readRegular(repoRoot, DESCRIPTOR.path, 16 * 1024)), metadataPin(DESCRIPTOR));
      assert.deepEqual(identity(readRegular(repoRoot, SELF, 512 * 1024)), identity(ownBytes));
      state.disposed = true; cached.delete(cacheKey);
      state.cleanupReceipt = cloneFrozen({ schema: 'rea-notes46-owned-historical-input-disposal/v1', status: 'disposed', startedAt, completedAt: new Date().toISOString(), workflowSourceSHA: attempt.GITHUB_SHA, workflowRun: attempt.GITHUB_RUN_ID, workflowAttempt: attempt.GITHUB_RUN_ATTEMPT, workflowJob: attempt.GITHUB_JOB,
        genuinePrivateContext: true, ownedCreatedContainerIdentityVerified: true, ownedAbsoluteTargetVerified: true, runnerTempAndRepositoryExcluded: true, finalMetadataInventoryFiles: finalInventory.files, finalMetadataInventoryDirectories: finalInventory.directories,
        closedSummaryIdentity, closedSummaryEncoding: 'UTF-8 JSON.stringify of the immutable pre-disposal summary, no trailing newline', pendingExecutionBoundaries: 0, fullIntegrityPassesBeforeDisposal: state.fullIntegrityPasses,
        ownedContainerRemoved: true, cacheEvicted: true, reacquisitionBlockedForThisProcess: true, laterReadersRejected: true, rawContentRehashedByDispose: false,
        historicalInputOnly: true, current46AcceptanceClaimed: false, rawArtifactBackupClaimed: false, localBackupCreated: false, unrelatedPathsRemoved: false, fullParity: false, superiority: false });
      return state.cleanupReceipt;
    } catch (error) {
      state.poison = errorInfo(error); cached.delete(cacheKey);
      state.cleanupReceipt = cloneFrozen({ schema: 'rea-notes46-owned-historical-input-disposal/v1', status: 'failed', startedAt, failedAt: new Date().toISOString(), ownedContainerRemoved: removed, closedSummaryIdentity, failure: errorInfo(error), rawArtifactBackupClaimed: false, current46AcceptanceClaimed: false }); throw error;
    } finally { state.disposing = false; }
  }
  state.dispose = dispose;
  const context = Object.freeze({ root: historicalRoot, recheck, beginExecution, endExecution, summary, dispose });
  contexts.set(context, state); recheck(); cached.set(cacheKey, context); return context;
}

export function assertNotes46HistoricalInputRoot(context) {
  assert(context && contexts.has(context), 'Genuine complete historical input context required'); context.recheck(); return context;
}
export function disposeNotes46HistoricalInputRoot(context) {
  assert(context && contexts.has(context), 'Genuine complete historical input context required for disposal');
  return contexts.get(context).dispose();
}
export function notes46HistoricalInputIdentity() {
  return cloneFrozen({ commit: COMMIT, tree: TREE, descriptorPin: DESCRIPTOR, rawTreeMetadata: METADATA, historicalInputLimits: LIMITS, fullTreeAcquisition: true, historicalInputOnly: true, current46AcceptanceClaimed: false, hostedOnly: true, allowedJobs: JOBS });
}
