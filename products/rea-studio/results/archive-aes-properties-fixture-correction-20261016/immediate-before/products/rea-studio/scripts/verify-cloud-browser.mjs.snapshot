// Hosted-only finite real-browser collector. No local install/run fallback.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
assert.equal(process.env.CI, 'true'); assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
assert.equal(process.env.GITHUB_REPOSITORY, 'Ginderlax/rea-research-lab');
for (const name of ['GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'RUNNER_TEMP', 'PLAYWRIGHT_BROWSERS_PATH']) assert(process.env[name]);
const args = process.argv.slice(2);
const explicitScope = args.length === 8, notesScope = explicitScope && args[5] === 'notes-todo-experiment';
const archiveScope = explicitScope && !notesScope, archiveInstalledScope = archiveScope && args[5] === 'archive-aes-installed';
assert([4, 8].includes(args.length)); assert.equal(args[0], '--phase'); assert((explicitScope ? ['verify', 'postcheck'] : ['acquire', 'verify']).includes(args[1]));
assert.equal(args[2], '--evidence'); assert(path.isAbsolute(args[3]));
if (explicitScope) { assert.equal(args[4], '--scope'); assert(['archive-aes-experiment', 'archive-aes-installed', 'notes-todo-experiment'].includes(args[5])); assert.equal(args[6], archiveInstalledScope ? '--installed-manifest' : '--overlay-manifest'); assert(path.isAbsolute(args[7])); }
const phase = args[1], studio = fileURLToPath(new URL('../', import.meta.url)), repository = path.resolve(studio, '../..');
const tools = path.join(studio, 'browser-tests'), temporary = fs.realpathSync(process.env.RUNNER_TEMP);
const sourceLimits = { files: 2000, fileBytes: 8 * 1024 * 1024, totalBytes: 64 * 1024 * 1024, depth: 128 };
const within = (parent, target) => { const relative = path.relative(parent, target); return relative && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep); };
assert(within(temporary, path.resolve(args[3])), 'Evidence must be an owned RUNNER_TEMP child');
fs.mkdirSync(args[3], { recursive: true });
const evidence = fs.realpathSync(args[3]); assert(within(temporary, evidence));
const cache = path.resolve(process.env.PLAYWRIGHT_BROWSERS_PATH); assert(within(temporary, cache));
fs.mkdirSync(cache, { recursive: true }); assert.equal(fs.realpathSync(cache).toLowerCase(), cache.toLowerCase());
const execution = Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY'].map(name => [name, process.env[name] ?? null]));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = bytes => ({ bytes: bytes.length, sha256: digest(bytes) });
const readJson = filename => { const item = fs.lstatSync(filename); assert(item.isFile() && !item.isSymbolicLink() && item.size <= 8 * 1024 * 1024, 'Invalid bounded JSON evidence'); return JSON.parse(fs.readFileSync(filename)); };
const saveNew = (filename, value) => fs.writeFileSync(path.join(evidence, filename), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const recordName = phase === 'acquire' ? 'browser-tooling-acquisition.json' : phase === 'postcheck' ? 'browser-postrun-source-check.json' : 'browser-attempt.json';
const record = { schema: phase === 'acquire' ? 'rea-cloud-browser-tooling-acquisition/v1' : phase === 'postcheck' ? (notesScope ? 'rea-cloud-notes-browser-postrun-source-check/v1' : 'rea-cloud-browser-archive-postrun-source-check/v1') : 'rea-cloud-browser-attempt/v1', status: 'running', phase, startedAtUtc: new Date().toISOString(), execution,
  scope: notesScope ? 'Eight real Chromium Notes cases on an exact eight-target hosted source composition. Requires full six-directory source census, every other Git blob, independent composer/browser postchecks, four unchanged actual response holds, two raw browser downloads, eight PNGs and eight complete owned cleanup records. Zero original product/helper calls or disabled-control probes. No production installation, original GUI, browser matrix, full-suite, security, parity or superiority acceptance.' : archiveInstalledScope ? 'Six explicit installed Archive Chromium scenarios on a clean committed checkout: all62 Archive Git blobs and21 after pins are authenticated, with independent always source postchecks. Requires three UI-created archives and five byte-exact restored files, no product download UI, zero downloads and zero original processes. No app overlay, full-suite, browser matrix, parity, security or superiority acceptance.' : archiveScope ? 'Six explicit experimental Archive real Chromium UI scenarios: plain ZIP and AES7Z create/list/extract, ZIP encryption refusal, wrong password, actual response timing holds and disposal. Exact21 ephemeral source overlay; real workspace artifacts, no product download UI, actualDownloads0, original executions0. No full-suite, matrix, parity, security or superiority acceptance.' : 'Twelve explicit current Flow/Vault real Chromium normalization, download, draft, static-link and disposal scenarios. Real loopback host, synthetic data and separately disclosed network timing holds. No Archive overlay, original product, browser matrix, full-suite, parity, security or superiority acceptance.',
  retries: 0, workers: 1, sourceCaptureLimits: sourceLimits, originalProductExecutions: 0, applicationSourcesChanged: null, historicalReceiptsRebound: false, testsByteOverlay: false, children: [], failure: null };
function save(initial = false) {
  const target = path.join(evidence, recordName), next = initial ? target : target + '.tmp';
  const fd = fs.openSync(next, 'wx');
  try { fs.writeFileSync(fd, JSON.stringify(record, null, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  if (!initial) fs.renameSync(next, target);
}
const outFd = fs.openSync(path.join(evidence, 'browser-' + phase + '-stdout.txt'), 'wx');
const errFd = fs.openSync(path.join(evidence, 'browser-' + phase + '-stderr.txt'), 'wx');
const eventsFd = fs.openSync(path.join(evidence, 'browser-' + phase + '-events.jsonl'), 'wx');
let child = null, interrupted = null, retained = { stdout: 0, stderr: 0 }, sequence = 0, stopActive = null;
const consoleError = () => {};
for (const stream of [process.stdout, process.stderr]) stream.on('error', consoleError);
function event(type, details = {}) { fs.writeFileSync(eventsFd, JSON.stringify({ sequence: ++sequence, at: new Date().toISOString(), type, ...details }) + '\n'); for (const fd of [outFd, errFd, eventsFd]) fs.fsyncSync(fd); }
function killOwnedChild() { if (child?.pid && child.exitCode === null) { const kill = spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, timeout: 10000, stdio: 'ignore' }); if (kill.status !== 0) child.kill('SIGKILL'); } }
const signalHandlers = new Map(['SIGINT', 'SIGTERM', 'SIGBREAK'].map(signal => [signal, () => { interrupted = signal; event('interrupted', { signal, ownedPid: child?.pid ?? null }); if (stopActive) stopActive('received ' + signal); else killOwnedChild(); }]));
for (const [signal, handler] of signalHandlers) process.on(signal, handler);
function git(arguments_) { const r = spawnSync('git', arguments_, { cwd: repository, shell: false, windowsHide: true, encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024 }); assert.equal(r.error, undefined); assert.equal(r.status, 0); return r.stdout; }
function sameAttempt(value) { assert.deepEqual(value.execution, execution, 'Evidence belongs to another hosted attempt'); }
async function fileIdentity(filename) {
  const item = fs.lstatSync(filename); assert(item.isFile() && !item.isSymbolicLink());
  const hash = createHash('sha256'); let bytes = 0;
  for await (const chunk of fs.createReadStream(filename)) { bytes += chunk.length; hash.update(chunk); }
  assert.equal(bytes, item.size); return { bytes, sha256: hash.digest('hex') };
}
function sourceBytes(filename) {
  const item = fs.lstatSync(filename); assert(item.isFile() && !item.isSymbolicLink() && item.size <= sourceLimits.fileBytes, 'Source file type/size exceeds capture policy');
  const bytes = fs.readFileSync(filename); assert.equal(bytes.length, item.size); return bytes;
}
function sourceRow(filename, budget) {
  assert(++budget.files <= sourceLimits.files, 'Source file count exceeds capture policy');
  const item = fs.lstatSync(filename); assert(item.isFile() && !item.isSymbolicLink() && item.size <= sourceLimits.fileBytes);
  budget.bytes += item.size; assert(budget.bytes <= sourceLimits.totalBytes, 'Total source bytes exceed capture policy');
  return { path: path.relative(studio, filename).replaceAll('\\', '/'), ...identity(sourceBytes(filename)) };
}
function collect(directory, budget, depth = 0) {
  assert(depth <= sourceLimits.depth, 'Source directory depth exceeds capture policy');
  const directoryItem = fs.lstatSync(directory); assert(directoryItem.isDirectory() && !directoryItem.isSymbolicLink());
  const rows = [];
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', '.local', 'results'].includes(item.name)) continue;
    assert(!item.isSymbolicLink(), 'Browser source capture refuses links');
    const filename = path.join(directory, item.name);
    if (item.isDirectory()) rows.push(...collect(filename, budget, depth + 1));
    else if (item.isFile() && /\.(mjs|json|html|css|ps1)$/.test(item.name)) rows.push(sourceRow(filename, budget));
  }
  return rows;
}
function census() {
  const budget = { files: 0, bytes: 0 };
  if (notesScope) return [...['apps', 'lib', 'public', 'browser-tests', 'scripts', 'tests'].flatMap(name => collect(path.join(studio, name), budget)), ...['server.mjs', 'catalog.mjs', 'package.json'].map(name => sourceRow(path.join(studio, name), budget))].sort((a, b) => a.path.localeCompare(b.path));
  const extra = archiveScope ? [archiveInstalledScope ? 'scripts/verify-archive-installed-cloud.mjs' : 'scripts/compose-archive-aes-cloud.mjs', 'package.json'] : [];
  return [...['apps', 'lib', 'public', 'browser-tests'].flatMap(name => collect(path.join(studio, name), budget)), ...['server.mjs', 'catalog.mjs', 'scripts/verify-cloud-browser.mjs', ...extra].map(name => sourceRow(path.join(studio, name), budget))].sort((a, b) => a.path.localeCompare(b.path));
}
const archiveBundlePath = 'products/rea-studio/experiments/archive-aes/bundle.json';
const archiveBundlePin = { bytes: 80331, sha256: 'ed6d16f52f9209ac144f1f08d395c3e86e4c124c73a3a18a488654506ff155bb' };
let archiveProof = null, notesProof = null, notesModule = null;
function gitBytes(arguments_) {
  const r = spawnSync('git', arguments_, { cwd: repository, shell: false, windowsHide: true, timeout: 30000, maxBuffer: 32 * 1024 * 1024 });
  assert.equal(r.error, undefined); assert.equal(r.status, 0); return r.stdout;
}
function repositoryFile(relative) {
  assert(typeof relative === 'string' && relative.length && !relative.includes('\\') && !relative.includes(':') && !relative.includes('\0') && !relative.startsWith('/') && relative.split('/').every(part => part && part !== '.' && part !== '..'));
  let at = repository; for (const part of relative.split('/')) { at = path.join(at, part); assert(!fs.lstatSync(at).isSymbolicLink()); }
  assert(fs.lstatSync(at).isFile()); return at;
}
function committedSource(relative, expected) {
  const bytes = sourceBytes(repositoryFile(relative));
  assert.deepEqual(identity(bytes), identity(gitBytes(['show', 'HEAD:' + relative])), 'Mandatory source differs from its Git blob: ' + relative);
  if (expected) assert.deepEqual(identity(bytes), expected); return bytes;
}
function archiveStatus() {
  return gitBytes(['status', '--porcelain=v1', '-z', '--untracked-files=all']).toString('utf8').split('\0').filter(Boolean).map(row => {
    assert([' M', '??'].includes(row.slice(0, 2)), 'Only the exact unstaged Archive overlay may differ');
    return { path: row.slice(3), status: row.slice(0, 2) };
  }).sort((a, b) => a.path.localeCompare(b.path));
}
async function verifyArchiveInstalled() {
  assert.equal(path.resolve(args[7]).toLowerCase(), path.join(evidence, 'archive-installed-source-check.json').toLowerCase());
  const helper = 'products/rea-studio/scripts/verify-archive-installed-cloud.mjs'; committedSource(helper);
  const module = await import(pathToFileURL(repositoryFile(helper)).href), proof = module.verifyInstalledArchiveReceipt(repository, args[7]);
  const bundle = JSON.parse(committedSource(archiveBundlePath, archiveBundlePin));
  return { bundle, targets: new Map(bundle.finalTargets.map(row => [row.target, row])), status: [], receipt: proof.receipt, authentication: proof.authentication, module };
}
function verifyArchiveComposition() {
  assert.equal(path.resolve(args[7]).toLowerCase(), path.join(evidence, 'composition.json').toLowerCase());
  const bytes = fs.readFileSync(args[7]), value = readJson(args[7]);
  assert.equal(value.schema, 'rea-archive-aes-hosted-composition/v1'); assert.equal(value.status, 'composed-unexecuted-experimental-overlay');
  assert.equal(value.sourceOnlyExperimentalComposition, true); assert.equal(value.productionInstalled, false);
  assert.equal(value.sourceCommit, process.env.GITHUB_SHA); assert.equal(value.baselineGitCommit, process.env.GITHUB_SHA); assert.equal(value.experimentalSourceGitCommit, process.env.GITHUB_SHA);
  assert.equal(path.resolve(value.sourceRoot).toLowerCase(), repository.toLowerCase());
  assert.deepEqual(value.execution, execution); assert.deepEqual(value.sourceBundle, { path: archiveBundlePath, ...archiveBundlePin });
  const bundle = JSON.parse(committedSource(archiveBundlePath, archiveBundlePin));
  assert.equal(bundle.productionInstalled, false); assert.equal(bundle.finalTargets.length, 21); assert.equal(bundle.archiveBaseline.length, 47);
  const targets = new Map(bundle.finalTargets.map(row => [row.target, row])); assert.equal(targets.size, 21);
  const ordered = rows => [...rows].sort((a, b) => a.path.localeCompare(b.path));
  const baseline = ordered(bundle.archiveBaseline.map(row => ({ path: row.path, bytes: row.bytes, sha256: row.sha256 })));
  assert.deepEqual(value.beforeSourceCensus, baseline);
  const after = new Map(baseline.map(row => [row.path, row]));
  for (const row of targets.values()) { assert(row.target.startsWith('products/rea-studio/apps/archive/')); after.set(row.target, { path: row.target, ...row.after }); assert.deepEqual(identity(sourceBytes(repositoryFile(row.target))), row.after); }
  assert.equal(after.size, 62); assert.deepEqual(value.afterSourceCensus, ordered(after.values()));
  assert.equal(value.transitions.length, 22);
  const expectedTransitions = [...bundle.proposal.map(row => ({ ...row, phase: 'proposal17' })), ...bundle.timestamp.map(row => ({ ...row, phase: 'timestamp5' }))];
  assert.deepEqual(value.transitions, expectedTransitions.map(row => ({ phase: row.phase, target: row.target, before: row.before, after: row.after, source: row.source, sourceGitCommit: process.env.GITHUB_SHA, originEpoch: row.originEpoch })));
  const currentStatus = archiveStatus(); assert.deepEqual(currentStatus, value.gitStatusAfter); assert.deepEqual(currentStatus.map(row => row.path), [...targets.keys()].sort((a, b) => a.localeCompare(b)));
  // Composer authenticates every payload before overlay. The collector repeats
  // that fixed source authentication rather than trusting a receipt alone.
  assert.equal(bundle.sourcePayloads.length, 46);
  for (const row of bundle.sourcePayloads) committedSource(row.bundlePath, { bytes: row.bytes, sha256: row.sha256 });
  for (const row of baseline) if (!targets.has(row.path)) committedSource(row.path, { bytes: row.bytes, sha256: row.sha256 });
  return { bundle, targets, status: currentStatus, receipt: identity(bytes) };
}
function authenticateArchiveCensus(rows) {
  const tree = new Map();
  for (const item of gitBytes(['ls-tree', '-r', '-z', '--full-tree', 'HEAD']).toString('utf8').split('\0').filter(Boolean)) {
    const match = /^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/.exec(item); if (match) tree.set(match[3], match[2]);
  }
  let overlaid = 0, committed = 0;
  for (const row of rows) {
    const relative = 'products/rea-studio/' + row.path, bytes = sourceBytes(repositoryFile(relative));
    assert.deepEqual(identity(bytes), { bytes: row.bytes, sha256: row.sha256 });
    const target = archiveProof.targets.get(relative);
    if (target) { assert.deepEqual(identity(bytes), target.after); overlaid++; }
    if (!target || archiveInstalledScope) { assert(tree.has(relative), 'Active eligible source absent from committed Git tree: ' + relative); const oid = createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex'); assert.equal(oid, tree.get(relative), 'Other active eligible source differs from Git: ' + relative); committed++; }
  }
  // Fourteen executable/test helpers from the21 are eligible; seven doc/notice
  // afterimages are checked separately through the full62 Archive composition.
  assert.equal(overlaid, 14); assert.equal(rows.length, archiveInstalledScope ? committed : overlaid + committed);
  assert.equal(git(['rev-parse', 'HEAD']).trim(), process.env.GITHUB_SHA); assert.deepEqual(archiveStatus(), archiveProof.status);
  return { eligibleSources: rows.length, exactAfterimagesInEligibleCensus: overlaid, ...(archiveInstalledScope ? { allEligibleGitBlobs: committed, sourceOverlay: false } : { allOtherEligibleGitBlobs: committed }), archiveAllFileCensus: 62, exactAppTargets: 21 };
}
async function run(arguments_, timeoutMs, label) {
  assert(!interrupted, 'Interrupted before ' + label);
  const result = { label, arguments: arguments_, timeoutMs, startedAtUtc: new Date().toISOString(), childStarted: false, closeObserved: false, stopReason: null };
  record.children.push(result); save();
  const code = await new Promise(resolve => {
    let settled = false, timeout, forced, heartbeat;
    function finish(exitCode, signal, closeObserved) {
      if (settled) return; settled = true; stopActive = null; clearTimeout(timeout); clearTimeout(forced); clearInterval(heartbeat);
      Object.assign(result, { exitCode, signal, closeObserved, completedAtUtc: new Date().toISOString() }); resolve(exitCode);
    }
    function stop(reason) {
      if (result.stopReason) return; result.stopReason = reason; event('stop-requested', { reason, ownedPid: child?.pid ?? null }); killOwnedChild();
      forced = setTimeout(() => { child.stdout.destroy(); child.stderr.destroy(); finish(null, null, false); }, 5000);
    }
    stopActive = stop;
    child = spawn(process.execPath, arguments_, { cwd: tools, env: { ...process.env, REA_BROWSER_EVIDENCE: evidence }, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    result.childStarted = Boolean(child.pid); result.pid = child.pid ?? null; save(); event('child-started', { label, pid: result.pid });
    for (const [name, stream, fd, consoleStream, cap] of [['stdout', child.stdout, outFd, process.stdout, 4 * 1024 * 1024], ['stderr', child.stderr, errFd, process.stderr, 1024 * 1024]]) {
      stream.on('data', bytes => { if (settled) return; try { const take = Math.min(bytes.length, Math.max(0, cap - retained[name])); if (take) { fs.writeFileSync(fd, bytes.subarray(0, take)); retained[name] += take; consoleStream.write(bytes.subarray(0, take)); } if (take < bytes.length) stop(name + ' retained-output cap exceeded'); } catch (error) { stop(name + ' retention error:' + error.message); } });
      stream.on('error', error => { if (!settled) stop(name + ' stream error:' + error.message); });
    }
    child.on('error', error => { result.spawnError = { name: error.name, code: error.code ?? null, message: error.message }; });
    child.on('close', (exitCode, signal) => finish(exitCode, signal, true));
    timeout = setTimeout(() => stop('owned child deadline exceeded'), timeoutMs);
    heartbeat = setInterval(() => event('progress', { label, pid: result.pid, retained }), 10000);
  });
  save(); event('child-closed', result); child = null;
  assert(!interrupted, 'Interrupted: ' + interrupted); assert(result.closeObserved && !result.stopReason && !result.spawnError && !result.signal && code === 0, 'Hosted ' + label + ' failed or did not close cleanly');
}
const pinnedPackages = {
  '@playwright/test': { integrity: 'sha512-IaYGml/nSOiZWROfPtuIL7neuu9qDOZ3TNvNljUIrhDMxiGTgPjzj/g9p9RxpS2tSepPDRY+UwAaEeiKtUvIAg==', resolved: 'https://registry.npmjs.org/@playwright/test/-/test-1.64.1.tgz' },
  playwright: { integrity: 'sha512-HCrVhHr5QQuwYoswEUGTb7gGp522yflbv/ST8nF4sFWGuLjQCt17Q/EubpGGSNKYn1tsTCPZxqHhHCfVURu7UA==', resolved: 'https://registry.npmjs.org/playwright/-/playwright-1.64.1.tgz' },
  'playwright-core': { integrity: 'sha512-BC4s8y6SEVA6Q1rSxZTto8hI1KUI3xXlHGZgvGqP4IqPdI/a6FX9H29IDNz7vKo9l21b6LfYosScPL6M3xxyDQ==', resolved: 'https://registry.npmjs.org/playwright-core/-/playwright-core-1.64.1.tgz' },
};
function verifyToolSource() {
  const packageBytes = fs.readFileSync(path.join(tools, 'package.json')), lockBytes = fs.readFileSync(path.join(tools, 'package-lock.json'));
  const lock = JSON.parse(lockBytes); assert.deepEqual(JSON.parse(packageBytes).devDependencies, { '@playwright/test': '1.64.1' });
  assert.equal(lock.lockfileVersion, 3); assert.deepEqual(Object.keys(lock.packages).sort(), ['', ...Object.keys(pinnedPackages).map(name => 'node_modules/' + name)].sort());
  for (const [name, pin] of Object.entries(pinnedPackages)) { const row = lock.packages['node_modules/' + name]; assert.equal(row.version, '1.64.1'); assert.equal(row.integrity, pin.integrity); assert.equal(row.resolved, pin.resolved); }
  const bytes = fs.readFileSync(path.join(tools, 'browser-metadata.json'));
  assert.deepEqual(identity(bytes), { bytes: 1135, sha256: '2cfd419f71ac6475d81e1301fa86c34cf2a2a6bae2a0da4b5a2b18310216b6bf' });
  return { package: identity(packageBytes), lock: identity(lockBytes), browserMetadata: identity(bytes), packageVersions: Object.fromEntries(Object.keys(pinnedPackages).map(name => [name, '1.64.1'])) };
}
async function installedBrowser() {
  for (const name of Object.keys(pinnedPackages)) assert.equal(readJson(path.join(tools, 'node_modules', name, 'package.json')).version, '1.64.1');
  assert.deepEqual(fs.readFileSync(path.join(tools, 'node_modules/playwright-core/browsers.json')), fs.readFileSync(path.join(tools, 'browser-metadata.json')));
  const { chromium } = await import(pathToFileURL(path.join(tools, 'node_modules/playwright/index.mjs')).href);
  const executable = await fs.promises.realpath(chromium.executablePath()); assert(within(cache, executable));
  assert(executable.split(path.sep).includes('chromium-1248'), 'Installed browser revision differs');
  return { name: 'chromium', revision: '1248', expectedVersion: '156.0.8078.4', channel: 'chromium', executable, ...await fileIdentity(executable), digestKind: 'Observed hosted executable identity after the pinned official Playwright downloader; no independent publisher digest or signature assertion.' };
}
async function verifyNotesBrowserPhase() {
  const helperPath = 'products/rea-studio/scripts/verify-notes-todo-browser-cloud.mjs', helperPin = {"bytes":20439,"sha256":"3afc8bb1ca5b496454c1cae10181e9b32466b39fd8ec0a908320c41ad6a027f0"};
  committedSource(helperPath, helperPin); notesModule = await import(pathToFileURL(repositoryFile(helperPath)).href);
  notesProof = notesModule.verifyNotesBrowserComposition(args[7]);
  record.notesVerifierSource = { path: helperPath, ...helperPin };
  record.notesOverlay = { ...notesProof.receipt, productionInstalled: false, exactAppTargets: 8, runtimeTargets: 3, documentationTargets: 1, newTestTargets: 4, baselineGitCommit: record.sourceCommit, modifiedEphemeralWorktree: true, browserBundle: notesProof.browserBundleIdentity, contract: notesProof.contractIdentity };
  record.testsByteOverlay = true;
  const workflow = notesProof.browserBundle.workflow, workflowBytes = committedSource(workflow.path, { bytes: workflow.bytes, sha256: workflow.sha256 });
  record.workflowSource = { path: workflow.path, ...identity(workflowBytes) };
  const source = verifyToolSource(); record.toolingSource = source; save();
  if (phase === 'postcheck') {
    const attemptBytes = fs.readFileSync(path.join(evidence, 'browser-attempt.json')), attempt = readJson(path.join(evidence, 'browser-attempt.json'));
    sameAttempt(attempt); assert.equal(attempt.sourceCommit, record.sourceCommit); assert.equal(attempt.testsByteOverlay, true); assert.deepEqual(attempt.notesOverlay, record.notesOverlay); assert.deepEqual(attempt.workflowSource, record.workflowSource); assert.deepEqual(attempt.notesVerifierSource, record.notesVerifierSource);
    before = readJson(path.join(evidence, 'browser-source-before.json')); const after = census(); assert.deepEqual(after, before, 'Separate Notes browser census changed');
    record.sourceAuthentication = notesModule.authenticateNotesBrowserCensus(after, notesProof); record.composerPostcheck = notesModule.verifyNotesComposerPostcheck(evidence, notesProof);
    record.browserAttempt = identity(attemptBytes); record.priorBrowserStatus = attempt.status; record.productTests = 0; record.sourceStable = true; record.applicationSourcesChanged = false; record.status = 'source-verified'; return;
  }
  fs.writeFileSync(path.join(evidence, 'notes-browser-workflow.yml.snapshot'), workflowBytes, { flag: 'wx' });
  fs.writeFileSync(path.join(evidence, 'notes-browser-bundle.json.snapshot'), committedSource(notesProof.browserBundleIdentity.path, { bytes: notesProof.browserBundleIdentity.bytes, sha256: notesProof.browserBundleIdentity.sha256 }), { flag: 'wx' });
  fs.writeFileSync(path.join(evidence, 'notes-browser-source-contract.md.snapshot'), committedSource(notesProof.contractIdentity.path, { bytes: notesProof.contractIdentity.bytes, sha256: notesProof.contractIdentity.sha256 }), { flag: 'wx' });
  const acquisitionBytes = fs.readFileSync(path.join(evidence, 'browser-tooling-acquisition.json')), acquisition = JSON.parse(acquisitionBytes);
  assert.equal(acquisition.schema, 'rea-cloud-browser-tooling-acquisition/v1'); assert.equal(acquisition.status, 'acquired'); sameAttempt(acquisition); assert.equal(acquisition.sourceCommit, record.sourceCommit); assert.deepEqual(acquisition.toolingSource, source);
  record.acquisition = identity(acquisitionBytes); fs.writeFileSync(path.join(evidence, 'browser-prerequisites.json.snapshot'), acquisitionBytes, { flag: 'wx' });
  record.browserImage = await installedBrowser(); assert.deepEqual(record.browserImage, acquisition.browserImage);
  const data = fs.mkdtempSync(path.join(temporary, 'rea-notes-browser-synthetic-data-')); process.env.REA_BROWSER_DATA_ROOT = data; record.ownedDataRoot = data;
  before = census(); record.sourceAuthentication = notesModule.authenticateNotesBrowserCensus(before, notesProof); saveNew('browser-source-before.json', before);
  for (const row of before) { const target = path.join(evidence, 'source', row.path + '.snapshot'); fs.mkdirSync(path.dirname(target), { recursive: true }); const bytes = sourceBytes(path.join(studio, row.path)); assert.deepEqual(identity(bytes), { bytes: row.bytes, sha256: row.sha256 }); fs.writeFileSync(target, bytes, { flag: 'wx' }); }
  record.sourceFiles = before.length; record.sourceCapturedBeforeExecution = true; record.scenarios = notesProof.roster; save();
  await run([path.join(tools, 'node_modules/playwright/cli.js'), 'test', '--config', path.join(tools, 'playwright.notes-todo.config.mjs')], 11 * 60000, 'eight-real-notes-browser-scenarios');
  Object.assign(record, notesModule.verifyNotesBrowserResults(evidence, notesProof)); record.productTests = 8; record.status = 'passed';
}
let before = null;
save(true);
try {
  record.sourceCommit = git(['rev-parse', 'HEAD']).trim(); assert.equal(record.sourceCommit, process.env.GITHUB_SHA);
  if (notesScope) { await verifyNotesBrowserPhase(); } else {
  if (archiveScope) {
    archiveProof = archiveInstalledScope ? await verifyArchiveInstalled() : verifyArchiveComposition();
    if (archiveInstalledScope) record.archiveInstalled = { ...archiveProof.receipt, currentArchiveFiles: 62, exactAfterTargets: 21, allArchiveGitBound: true, sourceMutationPerformed: false, productionInstallationReceiptVerified: false };
    else record.overlay = { ...archiveProof.receipt, productionInstalled: false, exactAppTargets: 21, baselineGitCommit: record.sourceCommit, modifiedEphemeralWorktree: true };
    record.testsByteOverlay = !archiveInstalledScope; record.productDownloadUIAbsent = true; record.actualDownloads = 0;
    const workflowPath = archiveInstalledScope ? '.github/workflows/archive-installed-cloud.yml' : '.github/workflows/browser-archive-aes-cloud.yml';
    const workflowBytes = committedSource(workflowPath); record.workflowSource = { path: workflowPath, ...identity(workflowBytes) };
    if (phase === 'verify') fs.writeFileSync(path.join(evidence, 'archive-browser-workflow.yml.snapshot'), workflowBytes, { flag: 'wx' });
  } else assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']), '', 'Browser workflow requires a clean source checkout');
  const source = verifyToolSource(); record.toolingSource = source; save();
  if (phase === 'postcheck') {
    const attemptBytes = fs.readFileSync(path.join(evidence, 'browser-attempt.json')), attempt = readJson(path.join(evidence, 'browser-attempt.json'));
    sameAttempt(attempt); assert.equal(attempt.sourceCommit, record.sourceCommit); assert.equal(attempt.testsByteOverlay, !archiveInstalledScope); if (archiveInstalledScope) assert.deepEqual(attempt.archiveInstalled, record.archiveInstalled); else assert.deepEqual(attempt.overlay, record.overlay); assert.deepEqual(attempt.workflowSource, record.workflowSource);
    before = readJson(path.join(evidence, 'browser-source-before.json'));
    const after = census(); assert.deepEqual(after, before, 'Separate source postcheck differs from pre-browser census');
    record.sourceAuthentication = authenticateArchiveCensus(after); record.browserAttempt = identity(attemptBytes);
    if (archiveInstalledScope) {
      const post = readJson(path.join(evidence, 'archive-installed-postrun-source-check.json')); assert.equal(post.schema, 'rea-archive-hosted-installed-postrun-source-check/v1'); assert.equal(post.status, 'source-verified'); sameAttempt(post); assert.equal(post.sourceCommit, record.sourceCommit); assert.equal(post.sourceStable, true); assert.deepEqual(post.beforeReceipt, archiveProof.receipt); assert.deepEqual(post.authentication, archiveProof.authentication);
    } else {
      const compositionPost = readJson(path.join(evidence, 'postrun-source-check.json'));
      assert.equal(compositionPost.schema, 'rea-archive-aes-hosted-postrun-source-check/v1'); assert.equal(compositionPost.baselineGitCommit, record.sourceCommit); assert.deepEqual(compositionPost.execution, execution); assert.equal(compositionPost.sourceStable, true); assert.equal(compositionPost.sharedStable, true); assert.equal(compositionPost.currentArchiveSourceFiles, 62);
    }
    record.priorBrowserStatus = attempt.status; record.productTests = 0; record.sourceStable = true; record.applicationSourcesChanged = false; record.status = 'source-verified';
  } else if (phase === 'acquire') {
    const npmCli = process.env.PATH.split(path.delimiter).map(folder => path.join(folder, 'node_modules/npm/bin/npm-cli.js')).find(filename => fs.existsSync(filename)); assert(npmCli, 'setup-node npm CLI is unavailable');
    await run([npmCli, 'ci', '--include=dev', '--ignore-scripts', '--no-audit', '--no-fund'], 180000, 'locked-tooling-install');
    assert.deepEqual(verifyToolSource(), source, 'Installation changed locked source bytes');
    assert.deepEqual(fs.readFileSync(path.join(tools, 'node_modules/playwright-core/browsers.json')), fs.readFileSync(path.join(tools, 'browser-metadata.json')));
    await run([path.join(tools, 'node_modules/playwright/cli.js'), 'install', 'chromium', '--no-shell'], 240000, 'pinned-chromium-install');
    record.browserImage = await installedBrowser(); record.browserLaunchRequestsByCollector = 0; record.browserLaunchRequestsInsideInstallerIndependentlyCounted = false; record.productTests = 0;
    assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']), '');
    record.applicationSourcesChanged = false; record.status = 'acquired';
  } else {
    const acquisitionBytes = fs.readFileSync(path.join(evidence, 'browser-tooling-acquisition.json')), acquisition = JSON.parse(acquisitionBytes);
    assert.equal(acquisition.schema, 'rea-cloud-browser-tooling-acquisition/v1'); assert.equal(acquisition.status, 'acquired'); sameAttempt(acquisition);
    assert.equal(acquisition.sourceCommit, record.sourceCommit); assert.deepEqual(acquisition.toolingSource, source);
    record.acquisition = identity(acquisitionBytes); fs.writeFileSync(path.join(evidence, 'browser-prerequisites.json.snapshot'), acquisitionBytes, { flag: 'wx' });
    record.browserImage = await installedBrowser(); assert.deepEqual(record.browserImage, acquisition.browserImage);
    const data = fs.mkdtempSync(path.join(temporary, 'rea-browser-synthetic-data-')); process.env.REA_BROWSER_DATA_ROOT = data; record.ownedDataRoot = data;
    before = census(); saveNew('browser-source-before.json', before);
    if (archiveScope) record.sourceAuthentication = authenticateArchiveCensus(before);
    for (const row of before) { const target = path.join(evidence, 'source', row.path + '.snapshot'); fs.mkdirSync(path.dirname(target), { recursive: true }); const bytes = sourceBytes(path.join(studio, row.path)); assert.deepEqual(identity(bytes), { bytes: row.bytes, sha256: row.sha256 }); fs.writeFileSync(target, bytes, { flag: 'wx' }); }
    record.sourceFiles = before.length; record.sourceCapturedBeforeExecution = true;
    const count = archiveScope ? 6 : 12, roster = readJson(path.join(tools, archiveScope ? 'archive-aes-roster.json' : 'scenario-roster.json')); assert.equal(roster.length, count); assert.equal(new Set(roster).size, count); record.scenarios = roster; save();
    await run([path.join(tools, 'node_modules/playwright/cli.js'), 'test', '--config', path.join(tools, archiveScope ? 'playwright.archive-aes.config.mjs' : 'playwright.config.mjs')], 9 * 60000, 'finite-real-browser-scenarios');
    const report = readJson(path.join(evidence, 'playwright-results.json')), specs = []; assert.deepEqual(report.errors, []);
    const visit = suite => { specs.push(...(suite.specs ?? [])); for (const nested of suite.suites ?? []) visit(nested); }; for (const suite of report.suites) visit(suite);
    assert.deepEqual(specs.map(spec => spec.title).sort(), [...roster].sort()); assert.equal(specs.length, count);
    for (const spec of specs) { assert.equal(spec.ok, true); assert.equal(spec.tests.length, 1); const test = spec.tests[0]; assert.equal(test.status, 'expected'); assert.equal(test.results.length, 1); assert.equal(test.results[0].status, 'passed'); assert.equal(test.results[0].retry, 0); }
    assert.deepEqual([report.stats.expected, report.stats.unexpected, report.stats.skipped, report.stats.flaky], [count, 0, 0, 0]);
    const browser = readJson(path.join(evidence, 'browser-observation.json')); assert.equal(browser.realBrowserFixtureCreated, true); assert.equal(browser.version, '156.0.8078.4'); assert.equal(browser.browser, 'chromium'); assert.equal(browser.channel, 'chromium'); assert.equal(browser.retries, 0);
    const cases = fs.readdirSync(evidence).filter(name => /^case-.*\.json$/.test(name)); assert.equal(cases.length, count);
    const observed = [], screenshots = [], workspaceArtifacts = []; let downloads = 0, createdArchives = 0, restoredFiles = 0;
    for (const filename of cases) {
      const value = readJson(path.join(evidence, filename)); assert.equal(value.realBrowser, true); assert.equal(value.actualHTTP, true); assert.equal(value.serverCloseObserved, true); assert.equal(value.retry, 0); assert.deepEqual(value.errors, []); observed.push(value.title);
      if (archiveScope) { assert.equal(value.schema, 'rea-cloud-browser-archive-case-observation/v1'); assert.equal(value.productDownloadUIAbsent, true); assert.equal(value.actualDownloads, 0); assert.equal(value.originalProductExecutions, 0); assert.equal(value.statusAtFixtureClose, 'passed'); }
      assert(/^[A-Za-z0-9-]+$/.test(value.testId)); assert.equal(filename, 'case-' + value.testId + '.json');
      const screenshotPath = 'screenshots/' + value.testId + '.png', image = fs.readFileSync(path.join(evidence, screenshotPath));
      assert(image.length >= 24 && image.length <= 2 * 1024 * 1024); assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a'); assert.equal(image.subarray(12, 16).toString('ascii'), 'IHDR'); assert.equal(image.readUInt32BE(16), 1440); assert.equal(image.readUInt32BE(20), 1100);
      screenshots.push({ path: screenshotPath, ...identity(image), width: 1440, height: 1100 });
      for (const item of value.observations.filter(row => row.kind === 'real-browser-file-download')) { assert(/^downloads\/flow-(CRLF|bareCR|LF)\.json$/.test(item.path)); assert.deepEqual(await fileIdentity(path.join(evidence, item.path)), item.observed); assert.deepEqual(item.expected, item.observed); downloads++; }
      if (archiveScope) for (const item of value.observations.filter(row => ['real-ui-created-workspace-archive', 'real-ui-extraction-content'].includes(row.kind))) {
        const artifact = item.kind === 'real-ui-created-workspace-archive' ? item.path : item.artifact;
        assert(/^workspace-artifacts\/[a-z0-9-]+\.(zip|7z|txt)$/.test(artifact));
        assert.deepEqual(await fileIdentity(path.join(evidence, artifact)), item.observed); assert.deepEqual(item.expected, item.observed);
        assert(!workspaceArtifacts.some(row => row.path === artifact)); workspaceArtifacts.push({ path: artifact, ...item.observed });
        if (item.kind === 'real-ui-created-workspace-archive') createdArchives++; else restoredFiles++;
      }
    }
    assert.deepEqual(observed.sort(), [...roster].sort()); assert.equal(downloads, archiveScope ? 0 : 3);
    assert.equal(fs.readdirSync(path.join(evidence, 'screenshots')).filter(name => name.endsWith('.png')).length, count);
    record.screenshots = screenshots;
    if (archiveScope) {
      const workers = fs.readdirSync(evidence).filter(name => /^browser-observation-process-[0-9]+\.json$/.test(name));
      assert.equal(workers.length, 1, 'A passing six-case campaign must finish in its one configured worker');
      const workerBytes = fs.readFileSync(path.join(evidence, workers[0])), worker = readJson(path.join(evidence, workers[0]));
      assert.equal(worker.schema, 'rea-cloud-archive-browser-worker-observation/v1'); sameAttempt(worker);
      assert(Number.isSafeInteger(worker.pid) && worker.pid > 0); assert.equal(workers[0], 'browser-observation-process-' + worker.pid + '.json');
      assert.deepEqual(worker.observation, browser); record.browserWorkers = [{ path: workers[0], ...identity(workerBytes), pid: worker.pid }];
      assert.equal(createdArchives, 3); assert.equal(restoredFiles, 5);
      assert.deepEqual(workspaceArtifacts.filter(row => /\.(zip|7z)$/.test(row.path)).map(row => row.path).sort(), ['workspace-artifacts/archive-aes-content.7z', 'workspace-artifacts/archive-aes-header.7z', 'workspace-artifacts/archive-plain.zip']);
      assert.equal(fs.readdirSync(path.join(evidence, 'workspace-artifacts')).length, workspaceArtifacts.length); record.workspaceArtifacts = workspaceArtifacts;
      // Each retained guard must have been reached in the actual run.
      const values = cases.map(name => readJson(path.join(evidence, name)));
      assert.equal(values.flatMap(value => value.observations).filter(item => item.kind === 'wrong-password-refusal').length, 2);
      assert.equal(values.flatMap(value => value.observations).filter(item => item.kind === 'encrypted-zip-refusal').length, 1);
      assert.equal(values.flatMap(value => value.observations).filter(item => item.kind === 'disposal-after-real-extraction-commit').length, 1);
      assert.deepEqual(values.flatMap(value => value.faults).map(item => item.action).sort(), ['create', 'extract']);
    }
    record.summary = { tests: count, passed: count, failed: 0, skipped: 0, flaky: 0, retries: 0, exactRealDownloads: downloads, ...(archiveScope ? { exactCreatedArchiveArtifacts: createdArchives, exactRestoredFileArtifacts: restoredFiles, productDownloadUIAbsent: true, originalProcesses: 0 } : {}) }; record.status = 'passed';
  }
  }
} catch (error) { record.status = interrupted ? 'interrupted' : 'failed'; record.failure = { name: error.name, message: error.message }; killOwnedChild(); process.exitCode = 1; }
finally {
  if (before) { try { const after = census(); saveNew(phase === 'postcheck' ? 'browser-postrun-source-after.json' : 'browser-source-after.json', after); record.sourceStable = JSON.stringify(before) === JSON.stringify(after); record.applicationSourcesChanged = record.sourceStable ? null : true; assert(record.sourceStable, 'Browser-attempt source changed'); if (notesScope) { assert.deepEqual(notesModule.verifyNotesBrowserComposition(args[7]).receipt, notesProof.receipt); record.sourceAuthentication = notesModule.authenticateNotesBrowserCensus(after, notesProof); } else if (archiveScope) { assert.deepEqual((archiveInstalledScope ? await verifyArchiveInstalled() : verifyArchiveComposition()).receipt, archiveProof.receipt); record.sourceAuthentication = authenticateArchiveCensus(after); } else assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']), ''); record.applicationSourcesChanged = false; } catch (error) { record.status = 'failed'; record.failure = { name: error.name, message: error.message }; process.exitCode = 1; } }
  if (interrupted) { record.status = 'interrupted'; process.exitCode = 143; }
  record.completedAtUtc = new Date().toISOString(); record.retainedOutputBytes = retained; save(); event('terminal', { status: record.status, failure: record.failure, summary: record.summary ?? null });
  for (const fd of [outFd, errFd, eventsFd]) fs.closeSync(fd);
  for (const [signal, handler] of signalHandlers) process.off(signal, handler);
  for (const stream of [process.stdout, process.stderr]) stream.off('error', consoleError);
}
console.log(JSON.stringify({ phase, status: record.status, sourceCommit: record.sourceCommit, summary: record.summary ?? null, sourceStable: record.sourceStable ?? null }));
