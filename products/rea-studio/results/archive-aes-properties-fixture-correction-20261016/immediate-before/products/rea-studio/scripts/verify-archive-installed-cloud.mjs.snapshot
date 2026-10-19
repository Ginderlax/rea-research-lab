// Read-only authentication of committed Archive after-images. No composition.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const bundlePath = 'products/rea-studio/experiments/archive-aes/bundle.json';
const bundlePin = { bytes: 80331, sha256: 'ed6d16f52f9209ac144f1f08d395c3e86e4c124c73a3a18a488654506ff155bb' };
const selectionPath = 'products/rea-studio/experiments/archive-aes/test-selection.json';
const app = 'products/rea-studio/apps/archive/';
const excludes = ['results', '.local', 'fixtures/oracles'];
const identity = bytes => ({ bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
const ordered = rows => [...rows].sort((a, b) => a.path.localeCompare(b.path));
const execution = () => Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY'].map(name => [name, process.env[name] ?? null]));
function hosted() {
  assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
  assert.equal(process.env.CI, 'true'); assert.equal(process.env.GITHUB_ACTIONS, 'true');
  assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted'); assert.equal(process.env.GITHUB_REPOSITORY, 'Ginderlax/rea-research-lab');
  for (const name of ['GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'RUNNER_TEMP']) assert(process.env[name]);
}
function safe(relative) {
  assert(typeof relative === 'string' && relative.length && !/[\\:\x00-\x1f\x7f]/.test(relative) && !relative.startsWith('/') && relative.split('/').every(part => part && part !== '.' && part !== '..'));
  return relative;
}
function git(repository, arguments_) {
  const value = spawnSync('git', arguments_, { cwd: repository, windowsHide: true, shell: false, timeout: 30000, maxBuffer: 32 * 1024 * 1024 });
  assert.equal(value.error, undefined); assert.equal(value.status, 0); return value.stdout;
}
function checkedFile(repository, relative) {
  safe(relative); let current = repository;
  for (const part of relative.split('/')) { current = path.join(current, part); assert(!fs.lstatSync(current).isSymbolicLink(), 'Installed source path refuses links'); }
  const info = fs.lstatSync(current); assert(info.isFile() && info.size <= 256 * 1024, 'Installed selected source bound');
  const bytes = fs.readFileSync(current); assert.equal(bytes.length, info.size); return bytes;
}
export function authenticateInstalledArchive(repository) {
  hosted(); repository = fs.realpathSync(repository);
  const head = git(repository, ['rev-parse', 'HEAD']).toString('utf8').trim(); assert.equal(head, process.env.GITHUB_SHA);
  assert.equal(path.resolve(git(repository, ['rev-parse', '--show-toplevel']).toString('utf8').trim()).toLowerCase(), repository.toLowerCase());
  assert.equal(git(repository, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).length, 0, 'Installed Archive acceptance requires a clean committed checkout');
  const tree = new Map();
  for (const entry of git(repository, ['ls-tree', '-r', '-z', '--full-tree', 'HEAD']).toString('utf8').split('\0').filter(Boolean)) {
    const match = /^(100644|100755) blob ([0-9a-f]{40,64})\t(.+)$/s.exec(entry); if (match) tree.set(match[3], { mode: match[1], gitBlob: match[2] });
  }
  const seen = new Map(); let total = 0;
  function committed(relative, expected) {
    const bytes = checkedFile(repository, relative), observed = identity(bytes), blob = tree.get(relative); assert(blob, 'Selected source must be a committed ordinary file: ' + relative);
    const object = createHash(blob.gitBlob.length === 40 ? 'sha1' : 'sha256').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
    assert.equal(object, blob.gitBlob, 'Selected source differs from committed Git: ' + relative); if (expected) assert.deepEqual(observed, { bytes: expected.bytes, sha256: expected.sha256 });
    if (seen.has(relative)) assert.deepEqual(observed, seen.get(relative)); else { seen.set(relative, observed); total += bytes.length; assert(seen.size <= 128 && total <= 8 * 1024 * 1024, 'Installed source proof bound'); }
    return { bytes, row: { path: relative, ...observed, gitBlob: blob.gitBlob } };
  }
  const bundleRead = committed(bundlePath, bundlePin), bundle = JSON.parse(bundleRead.bytes);
  assert.equal(bundle.schema, 'rea-archive-aes-hosted-experimental-source-bundle/v1'); assert.equal(bundle.sourceOnly, true); assert.equal(bundle.productionInstalled, false);
  assert.equal(bundle.archiveBaseline.length, 47); assert.equal(bundle.finalTargets.length, 21); assert.equal(bundle.selectedOriginalSources.length, 22);
  const targets = new Map(); for (const row of bundle.finalTargets) { assert(/^products\/rea-studio\/apps\/archive\/[A-Za-z0-9.-]+$/.test(row.target)); assert(!targets.has(row.target)); targets.set(row.target, row); }
  const expected = new Map(bundle.archiveBaseline.map(row => [row.path, { path: row.path, bytes: row.bytes, sha256: row.sha256 }]));
  for (const row of targets.values()) expected.set(row.target, { path: row.target, ...row.after }); assert.equal(expected.size, 62);
  const current = [];
  function walk(relative, local = '', depth = 0) {
    assert(depth <= 32); const directory = path.join(repository, ...safe(relative).split('/')); const info = fs.lstatSync(directory); assert(info.isDirectory() && !info.isSymbolicLink());
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const nextLocal = local ? local + '/' + entry.name : entry.name; if (excludes.some(prefix => nextLocal === prefix || nextLocal.startsWith(prefix + '/'))) continue;
      assert(!entry.isSymbolicLink()); const next = relative + '/' + entry.name;
      if (entry.isDirectory()) walk(next, nextLocal, depth + 1); else { assert(entry.isFile()); assert(expected.has(next), 'Unlisted current Archive file: ' + next); current.push(committed(next, expected.get(next)).row); assert(current.length <= 62); }
    }
  }
  walk(app.slice(0, -1)); assert.equal(current.length, 62);
  const archiveSources = ordered(current); assert.deepEqual(archiveSources.map(({ gitBlob, ...row }) => row), ordered(expected.values()));
  const currentTargets = ordered([...targets.values()].map(row => committed(row.target, row.after).row));
  for (const row of targets.values()) committed(row.source, row.after);
  const originalSources = bundle.selectedOriginalSources.map(row => { assert(row.publicSnapshot.startsWith('products/rea-studio/experiments/archive-aes/selected-original-source/') && row.publicSnapshot.endsWith('.snapshot')); return committed(row.publicSnapshot, row).row; });
  const sharedSources = bundle.historicalSharedContext.map(row => committed(row.path).row);
  const selectionRead = committed(selectionPath), selection = JSON.parse(selectionRead.bytes);
  assert.equal(selection.schema, 'rea-archive-aes-cloud-experimental-selection/v1'); assert.equal(selection.expectedGroupsOnWindows, 161); assert.equal(selection.tests.length, 13); assert.equal(selection.fullArchiveSuite, false);
  const prerequisite = committed(selection.historicalReadOnlyPrerequisite.path); assert.equal(prerequisite.row.sha256, selection.historicalReadOnlyPrerequisite.sha256);
  assert.equal(git(repository, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).length, 0); assert.equal(git(repository, ['rev-parse', 'HEAD']).toString('utf8').trim(), head);
  return { mode: 'archive-aes-installed', sourceCommit: head, sourceBundle: { path: bundlePath, ...bundlePin }, sourceSelection: selectionRead.row,
    archiveSources, currentTargets, selectedOriginalSources: originalSources, sharedSources, historicalReadOnlyPrerequisite: prerequisite.row,
    currentArchiveFiles: 62, exactAfterTargets: 21, currentTargetsGitBound: true, allArchiveGitBound: true, sourceMutationPerformed: false, historicalReceiptsRebound: false,
    productionInstallationReceiptVerified: false, authenticatedPaths: seen.size, authenticatedBytes: total, fileLimit: 128, byteLimit: 8 * 1024 * 1024, individualByteLimit: 256 * 1024 };
}
export function verifyInstalledArchiveReceipt(repository, filename) {
  const info = fs.lstatSync(filename); assert(info.isFile() && !info.isSymbolicLink() && info.size <= 2 * 1024 * 1024);
  const bytes = fs.readFileSync(filename), value = JSON.parse(bytes); assert.equal(value.schema, 'rea-archive-hosted-installed-source-check/v1'); assert.equal(value.status, 'verified-unexecuted-committed-afterimages');
  assert.deepEqual(value.execution, execution()); assert.equal(value.sourceCommit, process.env.GITHUB_SHA); assert.equal(path.resolve(value.sourceRoot).toLowerCase(), fs.realpathSync(repository).toLowerCase());
  assert.equal(value.mode, 'archive-aes-installed'); assert.equal(value.sourceOnly, true); assert.equal(value.sourceMutationPerformed, false); assert.equal(value.installationPerformedByCommand, false);
  assert.equal(value.applicationExecutions + value.originalExecutions + value.browserExecutions, 0); assert.equal(value.historicalReceiptsRebound, false);
  const authentication = authenticateInstalledArchive(repository); assert.deepEqual(value.authentication, authentication);
  for (const row of [...authentication.archiveSources, ...authentication.selectedOriginalSources]) {
    const snapshot = path.join(path.dirname(filename), 'installed-source', ...row.path.split('/')) + '.snapshot'; const stat = fs.lstatSync(snapshot); assert(stat.isFile() && !stat.isSymbolicLink() && stat.size === row.bytes && stat.size <= 256 * 1024);
    assert.deepEqual(identity(fs.readFileSync(snapshot)), { bytes: row.bytes, sha256: row.sha256 });
  }
  return { receipt: identity(bytes), authentication };
}
async function main() {
  hosted(); const args = process.argv.slice(2); assert.equal(args.length, 4); assert.equal(args[0], '--phase'); assert(['before', 'bootstrap', 'after'].includes(args[1])); assert.equal(args[2], '--evidence'); assert(path.isAbsolute(args[3]));
  const repository = fs.realpathSync(fileURLToPath(new URL('../../../', import.meta.url))), phase = args[1], evidence = path.resolve(args[3]), temporary = fs.realpathSync(process.env.RUNNER_TEMP);
  const relative = path.relative(temporary, evidence); assert(relative && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep));
  fs.mkdirSync(evidence, { recursive: true }); assert.equal(fs.realpathSync(evidence).toLowerCase(), evidence.toLowerCase());
  const beforePath = path.join(evidence, 'archive-installed-source-check.json');
  const authentication = authenticateInstalledArchive(repository);
  const write = (name, value) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  if (phase === 'before') {
    const value = { schema: 'rea-archive-hosted-installed-source-check/v1', status: 'verified-unexecuted-committed-afterimages', mode: 'archive-aes-installed', checkedAtUtc: new Date().toISOString(), execution: execution(), sourceCommit: process.env.GITHUB_SHA,
      sourceRoot: repository, sourceOnly: true, sourceMutationPerformed: false, installationPerformedByCommand: false, historicalReceiptsRebound: false, applicationExecutions: 0, originalExecutions: 0, browserExecutions: 0,
      productionInstallationReceiptVerified: false, authentication, scope: 'All62 committed Archive source/doc/test/reference files and21 exact current after pins, selected original-source/license payloads and four current shared inputs. No source installation or behavioral acceptance.' };
    for (const row of [...authentication.archiveSources, ...authentication.selectedOriginalSources]) {
      const target = path.join(evidence, 'installed-source', ...row.path.split('/')) + '.snapshot', bytes = checkedFile(repository, row.path); assert.deepEqual(identity(bytes), { bytes: row.bytes, sha256: row.sha256 }); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes, { flag: 'wx' });
    }
    write('archive-installed-source-check.json', value);
  } else if (phase === 'bootstrap') {
    const proof = verifyInstalledArchiveReceipt(repository, beforePath); const filename = path.join(evidence, 'original-acquisition.json');
    const value = { schema: 'rea-archive-aes-hosted-original-prerequisites/v1', mode: 'archive-aes-installed', status: 'running', execution: execution(), sourceCommit: process.env.GITHUB_SHA, sourceRoot: repository,
      startedAtUtc: new Date().toISOString(), installedSourceCheck: proof.receipt, originalProcesses: 0, productComparisons: 0, assets: [], completeComparisonBinariesExtractedByThisPhase: false };
    fs.writeFileSync(filename, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
    try {
      const bootstrap = app + 'bootstrap-original.mjs'; checkedFile(repository, bootstrap); assert.deepEqual(checkedFile(repository, bootstrap), git(repository, ['show', 'HEAD:' + bootstrap]));
      value.bootstrapModule = { path: bootstrap, ...identity(checkedFile(repository, bootstrap)) }; const module = await import(pathToFileURL(path.join(repository, bootstrap)).href);
      value.acquisition = await module.prepareOriginalArchiveOracle(); assert.equal(value.acquisition.schema, 'rea-archive-original-acquisition/v1'); assert.equal(value.acquisition.assets.length, 2);
      const pins = new Map([['.local/archive-original/7z2604-x64.exe', { bytes: 1664082, sha256: 'd54bf805f9f3704d1e8db2fa3498ae7ef2df0312b40b558e7c71c734430a665d' }], ['.local/archive-original/7zr.exe', { bytes: 602624, sha256: '256feca8e274e5da655e2a284fabafd9f554365eb164862089dacd4e8276d282' }]]);
      for (const asset of value.acquisition.assets) { assert(pins.has(asset.path)); const file = path.join(repository, ...safe(asset.path).split('/')); const info = fs.lstatSync(file); assert(info.isFile() && !info.isSymbolicLink()); const observed = identity(fs.readFileSync(file)); assert.deepEqual(observed, pins.get(asset.path)); assert.deepEqual(observed, { bytes: asset.bytes, sha256: asset.sha256 }); value.assets.push({ ...asset, authenticated: true, published: false }); }
      assert.equal(new Set(value.assets.map(row => row.path)).size, 2); assert.deepEqual(authenticateInstalledArchive(repository), authentication);
      value.status = 'acquired';
    } catch (error) { value.status = 'failed'; value.failure = { name: error.name, message: error.message }; throw error; }
    finally { value.completedAtUtc = new Date().toISOString(); fs.writeFileSync(filename, JSON.stringify(value, null, 2) + '\n'); }
  } else {
    const proof = verifyInstalledArchiveReceipt(repository, beforePath);
    write('archive-installed-postrun-source-check.json', { schema: 'rea-archive-hosted-installed-postrun-source-check/v1', status: 'source-verified', mode: 'archive-aes-installed', checkedAtUtc: new Date().toISOString(), execution: execution(), sourceCommit: process.env.GITHUB_SHA,
      sourceRoot: repository, beforeReceipt: proof.receipt, authentication: proof.authentication, sourceStable: true, all62ArchiveGitBlobsAuthenticated: true, exact21CurrentAfterPinsAuthenticated: true,
      sourceMutationPerformed: false, testsExecutedByPostcheck: 0, originalExecutionsByPostcheck: 0, browserExecutionsByPostcheck: 0, historicalReceiptsRebound: false, acceptanceEstablishedByPostcheck: false });
  }
  console.log(JSON.stringify({ phase, sourceCommit: process.env.GITHUB_SHA, mode: 'archive-aes-installed', currentArchiveFiles: 62, currentTargets: 21, sourceMutationPerformed: false }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
