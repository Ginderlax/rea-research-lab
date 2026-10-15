// Additional hosted verification inputs only. Flow/Vault, Archive and bsdtar
// have separate acquisition receipts; this module does not replace them.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const repository = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const args = process.argv.slice(2);
assert.equal(args.length, 2, 'Usage: bootstrap-cloud-development.mjs --evidence <absolute RUNNER_TEMP child>');
assert.equal(args[0], '--evidence'); assert.ok(path.isAbsolute(args[1]));
assert.equal(process.platform, 'win32', 'These prerequisites target hosted Windows only.');
assert.equal(process.version, 'v24.16.0'); assert.equal(process.env.CI, 'true');
assert.equal(process.env.GITHUB_ACTIONS, 'true'); assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
for (const key of ['RUNNER_TEMP', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY']) assert.ok(process.env[key], `Missing hosted context: ${key}`);
assert.ok(/^\d+$/.test(process.env.GITHUB_RUN_ID) && /^\d+$/.test(process.env.GITHUB_RUN_ATTEMPT));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = bytes => ({ bytes: bytes.length, sha256: sha(bytes) });
const slash = name => name.replaceAll('\\', '/');
function inside(parent, target) {
  const relative = path.relative(parent, target);
  return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}
function canonical(relative) {
  assert.ok(typeof relative === 'string' && relative && !relative.includes('\\') && !relative.includes(':') && !relative.includes('\0') && !path.posix.isAbsolute(relative));
  assert.ok(!relative.split('/').some(part => !part || part === '.' || part === '..'));
  return relative;
}
function owned(root, relative) { return path.join(root, ...canonical(relative).split('/')); }
async function resolvedDestination(destination) {
  let ancestor = path.resolve(destination); const suffix = [];
  for (;;) {
    try { return path.join(await fsp.realpath(ancestor), ...suffix); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = path.dirname(ancestor); assert.notEqual(parent, ancestor);
      suffix.unshift(path.basename(ancestor)); ancestor = parent;
    }
  }
}
const temporaryRoot = await fsp.realpath(process.env.RUNNER_TEMP), evidence = await resolvedDestination(args[1]);
assert.ok(inside(temporaryRoot, evidence), 'Evidence must be an owned child of RUNNER_TEMP.');
await fsp.mkdir(evidence, { recursive: true });
const logs = path.join(evidence, 'development-prerequisite-logs');
await fsp.mkdir(logs); // Exclusive directory creation prevents accidental reuse.
const receiptPath = path.join(evidence, 'development-prerequisites.json');
const eventsFd = fs.openSync(path.join(evidence, 'development-prerequisites.events.jsonl'), 'wx');
let eventNumber = 0, interrupted = null, activeStop = null;
const receipt = {
  schema: 'rea-cloud-development-additional-prerequisites/v1', status: 'running', startedAtUtc: new Date().toISOString(),
  scope: 'Automation native/routing, Sketch original helpers and Backup restic acquisition only. Flow/Vault, 7-Zip and bsdtar are separate prerequisites. No full-suite execution or acceptance.',
  execution: Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_REPOSITORY', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT'].map(key => [key, process.env[key] ?? null])),
  runtime: { version: process.version, platform: process.platform, architecture: process.arch },
  bootstrap: identity(fs.readFileSync(fileURLToPath(import.meta.url))), phases: [], prerequisites: {},
  comparativeTestProcessesExecutedByThisBootstrap: 0, originalApplicationServicesStarted: 0,
  originalModuleInitialization: 'The existing Automation acquisition command imports its released-code test harness for integrity/module initialization. These operations are not counted as comparative tests, and no zero-original-code-execution claim is made.',
  unknownContractsRefuse: true, skippedPrerequisites: 0, vendorBinariesPublished: false,
};
function event(type, details = {}) {
  fs.writeFileSync(eventsFd, JSON.stringify({ sequence: ++eventNumber, at: new Date().toISOString(), type, ...details }) + '\n'); fs.fsyncSync(eventsFd);
}
function save(initial = false) {
  const filename = initial ? receiptPath : receiptPath + '.tmp', fd = fs.openSync(filename, 'wx');
  try { fs.writeFileSync(fd, JSON.stringify(receipt, null, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  if (!initial) fs.renameSync(filename, receiptPath);
}
function live() { assert.equal(interrupted, null, 'Acquisition interrupted: ' + interrupted); }
const handlers = new Map(['SIGINT', 'SIGTERM', 'SIGBREAK'].map(signal => [signal, () => { interrupted = signal; activeStop?.('received ' + signal); }]));
for (const [signal, handler] of handlers) process.on(signal, handler);
for (const stream of [process.stdout, process.stderr]) stream.on('error', () => {});
save(true); event('running');

async function runChild(name, executable, argv, { cwd = repository, timeoutMs = 360000 } = {}) {
  live(); assert.ok(/^[a-z0-9-]+$/.test(name));
  const row = { name, status: 'running', startedAtUtc: new Date().toISOString(), command: [executable, ...argv], timeoutMs,
    stdout: { path: `development-prerequisite-logs/${name}.stdout.txt`, bytes: 0, limitBytes: 2 * 1024 * 1024 },
    stderr: { path: `development-prerequisite-logs/${name}.stderr.txt`, bytes: 0, limitBytes: 512 * 1024 }, droppedBytes: 0 };
  receipt.phases.push(row); save(); event('child-starting', { name });
  const descriptors = { stdout: fs.openSync(path.join(logs, name + '.stdout.txt'), 'wx'), stderr: fs.openSync(path.join(logs, name + '.stderr.txt'), 'wx') };
  try {
    const outcome = await new Promise(resolve => {
      const environment = { ...process.env }; delete environment.NODE_TEST_CONTEXT;
      const child = spawn(executable, argv, { cwd, env: environment, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      let settled = false, failure = null, cleanupTimer = null, stopStarted = false;
      const finish = (exitCode, signal, closeObserved = true) => {
        if (settled) return; settled = true; clearTimeout(deadline); clearInterval(heartbeat); clearTimeout(cleanupTimer);
        activeStop = null; resolve({ exitCode, signal, closeObserved, failure });
      };
      const stop = reason => {
        if (stopStarted) return; stopStarted = true; failure ??= reason;
        try { event('child-stop-requested', { name, reason, pid: child.pid ?? null }); }
        catch { failure += '; stop-event write failed'; }
        if (child.pid) {
          const stopped = spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, shell: false, stdio: 'ignore', timeout: 10000 });
          if (stopped.status !== 0) child.kill('SIGKILL');
        }
        cleanupTimer = setTimeout(() => { child.stdout.destroy(); child.stderr.destroy(); finish(null, null, false); }, 5000);
      };
      activeStop = stop;
      const deadline = setTimeout(() => stop('bounded acquisition deadline exceeded'), timeoutMs);
      const heartbeat = setInterval(() => {
        try { event('child-progress', { name, stdoutBytes: row.stdout.bytes, stderrBytes: row.stderr.bytes }); }
        catch { stop('progress-event write failed'); }
      }, 10000);
      for (const kind of ['stdout', 'stderr']) {
        child[kind].on('data', bytes => {
          if (settled) return;
          try {
            const retained = Math.min(bytes.length, Math.max(0, row[kind].limitBytes - row[kind].bytes));
            if (retained) {
              fs.writeFileSync(descriptors[kind], bytes.subarray(0, retained)); fs.fsyncSync(descriptors[kind]);
              row[kind].bytes += retained; (kind === 'stdout' ? process.stdout : process.stderr).write(bytes.subarray(0, retained));
            }
            row.droppedBytes += bytes.length - retained;
            if (retained < bytes.length) stop(kind + ' evidence limit exceeded');
          } catch (error) { stop(kind + ' evidence write failed: ' + error.message); }
        });
        child[kind].on('error', error => { if (!settled) stop(kind + ' stream failed: ' + error.message); });
      }
      child.on('error', error => { failure = 'spawn failed: ' + error.message; });
      child.on('close', (exitCode, signal) => finish(exitCode, signal));
      row.pid = child.pid ?? null;
      try { event('child-started', { name, pid: row.pid }); }
      catch { stop('start-event write failed'); }
    });
    Object.assign(row, outcome);
    assert.equal(outcome.failure, null, 'Acquisition child failed: ' + outcome.failure);
    assert.equal(outcome.closeObserved, true, 'Acquisition child stream close was not observed.');
    assert.equal(outcome.exitCode, 0, 'Acquisition child exited unsuccessfully.');
    assert.equal(outcome.signal, null); assert.equal(row.droppedBytes, 0); live();
    row.status = 'completed';
  } catch (error) { row.status = 'failed'; row.error = { name: error.name, message: error.message }; throw error; }
  finally {
    activeStop = null; row.completedAtUtc = new Date().toISOString();
    for (const fd of Object.values(descriptors)) { fs.fsyncSync(fd); fs.closeSync(fd); }
    save(); event('child-terminal', { name, status: row.status, exitCode: row.exitCode ?? null, closeObserved: row.closeObserved ?? false });
  }
}
async function readJson(relative, limit = 2 * 1024 * 1024) {
  const filename = owned(repository, relative), item = await fsp.lstat(filename);
  assert.ok(item.isFile() && !item.isSymbolicLink() && item.size <= limit);
  const bytes = await fsp.readFile(filename); return { value: JSON.parse(bytes), source: { path: relative, ...identity(bytes) } };
}
async function authenticated(root, relative, expected, maxBytes = 32 * 1024 * 1024) {
  live(); const filename = owned(root, relative), item = await fsp.lstat(filename);
  assert.ok(item.isFile() && !item.isSymbolicLink() && item.size <= maxBytes);
  assert.ok(inside(await fsp.realpath(root), await fsp.realpath(filename)), 'Cache image escaped its owned root.');
  if (expected.bytes !== undefined) assert.equal(item.size, expected.bytes);
  const bytes = await fsp.readFile(filename); assert.equal(sha(bytes), expected.sha256, 'Pinned cache identity changed: ' + relative);
  return { path: relative, ...identity(bytes) };
}
const automationRoot = path.join(repository, '.local/automation-original');
async function verifyAutomation() {
  const { value: manifest, source } = await readJson('products/rea-studio/apps/automation/native-original-manifest.json');
  assert.equal(manifest.baseline, 'n8n@2.16.0'); assert.equal(manifest.sourceCommit, '6eb2d75670b912bdc0274abd73f4f6e8ca8678c6');
  assert.equal(manifest.archives.length, 4); assert.equal(Object.keys(manifest.files).length, 4350); assert.equal(manifest.contracts.length, 9);
  assert.equal(fs.existsSync(path.join(automationRoot, '.acquisition.lock')), false, 'Original acquisition lock remains; refuse a partial cache.');
  const lock = await authenticated(automationRoot, 'package-lock.json', { sha256: manifest.packageLockSha256 });
  const archives = [];
  for (const entry of manifest.archives) {
    assert.equal(entry.version, '2.16.0'); assert.ok(['n8n', 'n8n-workflow', 'n8n-nodes-base', 'n8n-core'].includes(entry.name));
    const relative = `${entry.name}-${entry.version}.tgz`, file = await authenticated(automationRoot, relative, { bytes: entry.archiveBytes, sha256: entry.archiveSha256 });
    assert.equal('sha512-' + createHash('sha512').update(await fsp.readFile(owned(automationRoot, relative))).digest('base64'), entry.integrity); archives.push(file);
  }
  let sourceBytes = 0;
  for (const [relative, expected] of Object.entries(manifest.files)) { const file = await authenticated(automationRoot, relative, { sha256: expected }); sourceBytes += file.bytes; assert.ok(sourceBytes <= 256 * 1024 * 1024, 'Unexpected Automation source-cache size.'); }
  const contracts = [];
  for (const entry of manifest.contracts) contracts.push(await authenticated(automationRoot, entry.localFile, { bytes: entry.bytes, sha256: entry.sha256 }));
  return { manifest: source, root: automationRoot, lock, archives, authenticatedSourceFiles: 4350, authenticatedSourceBytes: sourceBytes, contracts, comparisonTestsExecuted: 0 };
}
async function inventory(root, prefix = '') {
  const files = [];
  const directory = prefix ? owned(root, prefix) : root;
  for (const entry of await fsp.readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? prefix + '/' + entry.name : entry.name; canonical(relative);
    assert.equal(entry.isSymbolicLink(), false, 'Routing cache refuses links.');
    if (entry.isDirectory()) files.push(...await inventory(root, relative));
    else { assert.equal(entry.isFile(), true); files.push(relative); }
    assert.ok(files.length <= 202, 'Unexpected extra routing-cache files.');
  }
  return files.sort();
}
async function verifyRouting(root, manifest) {
  const expected = Object.keys(manifest.files).sort(); assert.equal(expected.length, 202);
  assert.deepEqual(await inventory(root), expected, 'Routing cache must contain exactly the202 pinned entries.');
  const records = [];
  for (const relative of expected) records.push(await authenticated(root, relative, { sha256: manifest.files[relative] }));
  return records;
}
async function prepareRouting() {
  const { value: manifest, source } = await readJson('products/rea-studio/apps/automation/routing-original-manifest.json');
  assert.equal(manifest.sourceCommit, '6eb2d75670b912bdc0274abd73f4f6e8ca8678c6');
  assert.equal(manifest.archiveSha256, '64e058ea668bae613b3d040be2bd60f6b21be5d74db2839cf3d7e2ab87c76338');
  const keys = Object.keys(manifest.files); assert.equal(keys.length, 202);
  const archiveKey = 'original/n8n-nodes-base-2.16.0.tgz'; assert.equal(manifest.files[archiveKey], manifest.archiveSha256);
  const members = keys.filter(relative => relative !== archiveKey).map(relative => { canonical(relative); assert.ok(relative.startsWith('original/package/')); return relative.slice('original/'.length); });
  assert.equal(members.length, 201);
  const local = path.join(repository, '.local'), target = path.join(local, 'automation-routing-original');
  assert.ok(!(await fsp.lstat(local)).isSymbolicLink());
  if (fs.existsSync(target)) {
    assert.ok((await fsp.lstat(target)).isDirectory() && !(await fsp.lstat(target)).isSymbolicLink());
    const records = await verifyRouting(target, manifest);
    return { manifest: source, root: target, files: records.length, reusedAuthenticatedCache: true, originalCodeExecutedByReconstruction: false };
  }
  const staging = path.join(local, `automation-routing-original-acquisition-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`);
  assert.ok(inside(local, target) && inside(local, staging)); await fsp.mkdir(staging);
  receipt.routingStaging = staging; save();
  const directory = path.join(staging, 'original'); await fsp.mkdir(directory);
  const archiveSource = owned(automationRoot, 'n8n-nodes-base-2.16.0.tgz');
  await authenticated(automationRoot, 'n8n-nodes-base-2.16.0.tgz', { bytes: 9203477, sha256: manifest.archiveSha256 });
  const archive = owned(staging, archiveKey); await fsp.copyFile(archiveSource, archive, fs.constants.COPYFILE_EXCL);
  const groups = []; let group = [], argumentCharacters = 0;
  for (const member of members) {
    if (argumentCharacters + member.length + 3 > 16000 && group.length) { groups.push(group); group = []; argumentCharacters = 0; }
    group.push(member); argumentCharacters += member.length + 3;
  }
  if (group.length) groups.push(group);
  for (let index = 0; index < groups.length; index++) await runChild(`automation-routing-extract-${index + 1}`, 'tar.exe', ['-xzf', archive, '-C', directory, '--', ...groups[index]], { timeoutMs: 60000 });
  const records = await verifyRouting(staging, manifest);
  // This is a move only between two verified children of the owned private
  // cache parent. No old cache is replaced and no system path is modified.
  const realLocal = await fsp.realpath(local);
  assert.ok(inside(realLocal, await fsp.realpath(staging))); assert.equal(path.dirname(target).toLowerCase(), local.toLowerCase());
  assert.equal(fs.existsSync(target), false); await fsp.rename(staging, target);
  await verifyRouting(target, manifest);
  return { manifest: source, root: target, files: records.length, reconstructedExactMembers: 201, archiveCopiedExactly: true, extractionProcesses: groups.length, originalCodeExecutedByReconstruction: false };
}

try {
  await runChild('automation-native-acquisition', process.execPath, ['products/rea-studio/apps/automation/compare-original.mjs', '--acquire-only']);
  receipt.prerequisites.automation = await verifyAutomation(); save(); event('prerequisite-acquired', { name: 'automation-native' });
  receipt.prerequisites.automationRouting = await prepareRouting(); save(); event('prerequisite-acquired', { name: 'automation-routing', files: 202 });
  await runChild('sketch-acquisition', process.execPath, ['products/rea-studio/scripts/verify-sketch-geometry.mjs', '--bootstrap-oracle'], { timeoutMs: 180000 });
  const { originalPins, oraclePaths, loadPinnedOriginal } = await import('../apps/sketch/geometry-oracle.mjs');
  assert.deepEqual(originalPins, { archive: 'b280d4b364b65cba264c5aa4e7435cc2ce6421eabbbef9765a56997a0fadf534', bundle: '3cfe278cb537fde73b42bbd4697b392946517d3dc02d3f3cf8487d8476f63ba2', map: '3df41b92bd8c248f482c3d5b163349e02a506c6807a638a38ff722d7e4c98552' });
  const loaded = await loadPinnedOriginal();
  receipt.prerequisites.sketch = { version: '0.18.1', assets: Object.entries({ archive: loaded.archiveBytes, bundle: loaded.bundleBytes, map: loaded.mapBytes }).map(([name, bytes]) => ({ name, path: oraclePaths[name], ...identity(bytes) })), originalHelperExecutionsByThisBootstrap: 0 }; save(); event('prerequisite-acquired', { name: 'sketch' });
  await runChild('restic-acquisition', process.execPath, ['projects/09-restic/acquire.mjs'], { timeoutMs: 180000 });
  const { value: restic, source: resticManifest } = await readJson('projects/09-restic/artifact-manifest.json');
  assert.equal(restic.version, 'v0.19.1'); assert.equal(restic.asset_sha256, 'da948ad707ed690426473aaba2046cd61f8f90f6f0e7dab6be0d5796531de67d');
  assert.equal(restic.executable_sha256, 'b0dd1fd21eea5d8fe1325f55f7118213c21f36de8a261e04c0624a5ab9fd7830');
  const resticRoot = path.join(repository, 'projects/09-restic');
  receipt.prerequisites.restic = { manifest: resticManifest, version: restic.version,
    archive: await authenticated(resticRoot, 'artifacts/restic_0.19.1_windows_amd64.zip', { bytes: restic.asset_bytes, sha256: restic.asset_sha256 }),
    executable: await authenticated(resticRoot, restic.executable_relative_path, { bytes: restic.executable_bytes, sha256: restic.executable_sha256 }), originalExecutionsByThisBootstrap: 0 };
  event('prerequisite-acquired', { name: 'restic' }); live(); receipt.status = 'acquired'; receipt.completedAtUtc = new Date().toISOString(); save(); event('terminal', { status: receipt.status });
  console.log('Additional Automation, Sketch and Backup prerequisites acquired; no product comparison suite was run.');
} catch (error) {
  receipt.status = interrupted ? 'interrupted' : 'failed'; receipt.completedAtUtc = new Date().toISOString();
  receipt.failure = { name: error.name, code: error.code ?? null, message: error.message }; save(); event('terminal', { status: receipt.status, failure: receipt.failure });
  console.error(error.stack ?? error.message); process.exitCode = 1;
} finally {
  for (const [signal, handler] of handlers) process.off(signal, handler);
  fs.fsyncSync(eventsFd); fs.closeSync(eventsFd);
}
