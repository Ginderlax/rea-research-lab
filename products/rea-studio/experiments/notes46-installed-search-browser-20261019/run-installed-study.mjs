// Installed committed Notes46 study. Run only in the exact supported hosted branch/job.
// This collector never writes an application source or overlays a product/test body.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
const PREFIX = 'products/rea-studio/experiments/notes46-installed-search-browser-20261019';
const SELF = PREFIX + '/run-installed-study.mjs';
const WORKFLOW = '.github/workflows/notes46-installed-search-browser-cloud.yml';
const PLAN = { path: PREFIX + '/SOURCE-PLAN.json', bytes: 94396, sha256: '2a3a119cf0519f50c5a455e955c87db91d4d2291ee7a0a162956328332c58326' };
const BASELINE = '2a8482b42784eb262d6d5b82e62d8d1220dc4821';
const SOURCE_PARENT = '35a9e686e8cd21e5a7618cfcea5f4c1aa01dc71d';
const BRANCH = 'refs/heads/experiment/notes46-installed-search-20261019';
const root = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
const sourceLimits = { files: 256, individualBytes: 512 * 1024, rawBytes: 8 * 1024 * 1024, depth: 32 };
const outputLimit = 1024 * 1024, testTimeout = 180000;
const legacyObservation = 'products/rea-studio/.local/notes-notebook-trash-observations/trash-original.json';
const allowedChildEnvironment = new Set(['PATH', 'PATHEXT', 'SYSTEMROOT', 'COMSPEC', 'TEMP', 'TMP', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'LOCALAPPDATA', 'APPDATA', 'CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'RUNNER_TEMP', 'GITHUB_SHA', 'GITHUB_REF', 'GITHUB_EVENT_NAME', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY', 'GITHUB_JOB', 'GITHUB_SERVER_URL', 'PLAYWRIGHT_BROWSERS_PATH']);
const childEnvironment = extra => ({ ...Object.fromEntries(Object.entries(process.env).filter(([key]) => allowedChildEnvironment.has(key.toUpperCase()))), ...extra });
const id = data => ({ bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') });
const pin = row => ({ bytes: row.bytes, sha256: row.sha256 });
const blob = data => createHash('sha1').update('blob ' + data.length + '\0').update(data).digest('hex');
const execution = () => Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_REF', 'GITHUB_EVENT_NAME', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY', 'GITHUB_JOB', 'GITHUB_SERVER_URL'].map(key => [key, process.env[key]]));
function safe(name) {
  assert(typeof name === 'string' && name.length > 0 && name.length < 2048 && !name.startsWith('/') && !/[\\:\x00-\x1f\x7f<>"|?*]/.test(name));
  assert(name.split('/').every(part => part && part !== '.' && part !== '..' && part === part.replace(/[ .]+$/, '') && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)));
  return name;
}
function within(parent, child) { const rel = path.relative(parent, child); return !!rel && !path.isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + path.sep); }
function noLinks(filename) { let at = path.resolve(filename); while (true) { assert(!fs.lstatSync(at).isSymbolicLink(), 'No linked source/evidence ancestor: ' + at); const next = path.dirname(at); if (at === next) break; at = next; } assert.equal(fs.realpathSync(filename).toLowerCase(), path.resolve(filename).toLowerCase()); }
function read(directory, name, cap = sourceLimits.individualBytes) { const filename = path.join(directory, safe(name)); assert(within(directory, filename)); noLinks(filename); const stat = fs.lstatSync(filename); assert(stat.isFile() && stat.size <= cap); const bytes = fs.readFileSync(filename); assert.equal(bytes.length, stat.size); return bytes; }
function write(name, bytes) { assert(bytes.length <= 8 * 1024 * 1024); const target = path.join(evidence, safe(name)); assert(within(evidence, target)); fs.mkdirSync(path.dirname(target), { recursive: true }); noLinks(path.dirname(target)); fs.writeFileSync(target, bytes, { flag: 'wx' }); assert.deepEqual(read(evidence, name, 8 * 1024 * 1024), bytes); }
const json = (name, value) => write(name, Buffer.from(JSON.stringify(value, null, 2) + '\n'));
function git(args) { const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key))), GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' }; const value = spawnSync('git', ['--no-replace-objects', ...args], { cwd: root, env, shell: false, windowsHide: true, timeout: 30000, maxBuffer: 32 * 1024 * 1024 }); assert.equal(value.error, undefined); assert.equal(value.signal, null); assert.equal(value.status, 0, value.stderr?.toString()); return value.stdout; }
function tree(revision) { const rows = new Map(); for (const text of git(['ls-tree', '-r', '-z', '--full-tree', revision]).toString().split('\0').filter(Boolean)) { const match = /^(\d{6}) (blob|commit) ([0-9a-f]{40})\t(.+)$/.exec(text); assert(match); assert(!rows.has(match[4])); rows.set(match[4], { mode: match[1], kind: match[2], gitBlob: match[3] }); } return rows; }
function gitStatus() { return git(['status', '--porcelain=v1', '-z', '--untracked-files=all']).toString().split('\0').filter(Boolean).map(row => ({ status: row.slice(0, 2), path: row.slice(3) })).sort((a, b) => a.path.localeCompare(b.path)); }
function noteNames(directory, depth = 0) { assert(depth <= sourceLimits.depth); noLinks(directory); const names = []; for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { if (entry.name === 'results') continue; assert(!entry.isSymbolicLink()); const full = path.join(directory, entry.name); if (entry.isDirectory()) names.push(...noteNames(full, depth + 1)); else { assert(entry.isFile()); names.push(path.relative(root, full).replaceAll('\\', '/')); } } return names.sort(); }
function hosted() {
  assert.equal(process.platform, 'win32'); assert.equal(process.arch, 'x64'); assert.equal(process.version, 'v24.16.0');
  for (const [key, value] of Object.entries({ CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', RUNNER_OS: 'Windows', RUNNER_ARCH: 'X64', GITHUB_REPOSITORY: 'Ginderlax/rea-research-lab', GITHUB_SERVER_URL: 'https://github.com', GITHUB_REF: BRANCH, GITHUB_EVENT_NAME: 'push' })) assert.equal(process.env[key], value, key);
  assert(['draft-recovery-real-chromium', 'notes46-observed-values'].includes(process.env.GITHUB_JOB));
  for (const key of ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) assert(/^[1-9][0-9]*$/.test(process.env[key]));
  assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA)); assert.equal(git(['rev-parse', 'HEAD']).toString().trim(), process.env.GITHUB_SHA);
  assert.deepEqual(git(['rev-list', '--parents', '-n', '1', 'HEAD']).toString().trim().split(' '), [process.env.GITHUB_SHA, SOURCE_PARENT]);
  assert.deepEqual(git(['rev-list', '--parents', '-n', '1', SOURCE_PARENT]).toString().trim().split(' '), [SOURCE_PARENT, 'ab26bf14bc1a55a723566bbafb3ca391c3ef671c']);
  assert.deepEqual(git(['rev-list', '--parents', '-n', '1', 'ab26bf14bc1a55a723566bbafb3ca391c3ef671c']).toString().trim().split(' '), ['ab26bf14bc1a55a723566bbafb3ca391c3ef671c', 'cee2da08f7ebe81a003a6cc9828655794be48cb0']);
  assert.deepEqual(git(['rev-list', '--parents', '-n', '1', 'cee2da08f7ebe81a003a6cc9828655794be48cb0']).toString().trim().split(' '), ['cee2da08f7ebe81a003a6cc9828655794be48cb0', '40c7df91936aaf9574801aa38c5a635f299e6e39']);
  assert.deepEqual(git(['rev-list', '--parents', '-n', '1', '40c7df91936aaf9574801aa38c5a635f299e6e39']).toString().trim().split(' '), ['40c7df91936aaf9574801aa38c5a635f299e6e39', BASELINE]);
  assert.equal(git(['rev-parse', '--show-object-format']).toString().trim(), 'sha1');
  assert.equal(path.resolve(fileURLToPath(import.meta.url)).toLowerCase(), path.join(root, SELF).toLowerCase()); noLinks(root);
}
hosted();
const args = process.argv.slice(2); assert.equal(args.length, 6); assert.equal(args[0], '--phase'); assert(['before', 'ready', 'values', 'browser', 'postcheck'].includes(args[1])); assert.equal(args[2], '--role'); assert(['browser', 'values'].includes(args[3])); assert.equal(args[4], '--evidence');
const phase = args[1], role = args[3]; if (phase === 'browser' || phase === 'values') assert.equal(phase, role); assert.equal(process.env.GITHUB_JOB, role === 'browser' ? 'draft-recovery-real-chromium' : 'notes46-observed-values'); assert(path.isAbsolute(args[5]));
const temporary = fs.realpathSync(process.env.RUNNER_TEMP); const evidence = fs.realpathSync(args[5]); noLinks(evidence);
assert(within(temporary, evidence) && !within(root, evidence));
assert.equal(evidence.toLowerCase(), path.join(temporary, 'rea-notes46-installed-' + role + '-' + process.env.GITHUB_RUN_ID + '-' + process.env.GITHUB_RUN_ATTEMPT).toLowerCase(), 'Exact owned current campaign evidence directory');
const currentTree = tree('HEAD'), baseTree = tree(BASELINE);
function committed(name, bytes) { const row = currentTree.get(name); assert(row && row.mode === '100644' && row.kind === 'blob'); assert.equal(blob(bytes), row.gitBlob, 'Committed byte identity: ' + name); return row; }
const planBytes = read(root, PLAN.path); assert.deepEqual(id(planBytes), pin(PLAN)); committed(PLAN.path, planBytes);
const plan = JSON.parse(planBytes);
const currentRosterPath = 'products/rea-studio/browser-tests/notes-structured-search.any-roster.json';
const currentPackagedRoster = plan.packagedFiles.filter(row => row.path === currentRosterPath);
assert.equal(currentPackagedRoster.length, 1, 'Exactly one current packaged browser roster is required');
assert.deepEqual(plan.browserRoster, { path: currentPackagedRoster[0].path, bytes: currentPackagedRoster[0].bytes, sha256: currentPackagedRoster[0].sha256 }, 'Descriptive browserRoster must match the unique authenticated packaged roster');
assert.equal(plan.schema, 'rea-notes46-installed-any-wire-browser-source-plan/v1'); assert.equal(plan.baselineCommit, BASELINE); assert.equal(plan.branch, BRANCH); assert.equal(plan.sourceEpoch, 'notes46-installed-any-wire-v1'); assert.equal(plan.installedNotesSources.length, 46); assert.equal(plan.historicalBeforeNotesSources.length, 41);
assert.equal(plan.sourceParentCommit, SOURCE_PARENT); assert.equal(plan.canonicalFeatureBranchOnly, true);
assert.equal(plan.installedANYOnDefaultBranchClaimed, false); assert.equal(plan.valueTestExecutedInThisCampaign, true);
assert.equal(plan.captureCount, 154); assert.equal(plan.expectedBrowserCases, 36);
assert.equal(plan.reviewedFixtureLifecycleTransitions.length, 1);
const fixtureTransition = plan.reviewedFixtureLifecycleTransitions[0];
assert.equal(fixtureTransition.path, 'products/rea-studio/browser-tests/notes-draft-recovery.storage.spec.mjs'); assert.equal(fixtureTransition.beforeCommit, 'cee2da08f7ebe81a003a6cc9828655794be48cb0'); assert.equal(fixtureTransition.historicalComparisonCommit, BASELINE);
assert.equal(fixtureTransition.behaviorAcceptancePreclaimed, false); assert.equal(fixtureTransition.historicalReceiptsRebound, false);
assert.equal(baseTree.get(fixtureTransition.path)?.mode, '100644'); assert.equal(baseTree.get(fixtureTransition.path)?.kind, 'blob'); assert.equal(baseTree.get(fixtureTransition.path)?.gitBlob, fixtureTransition.before.gitBlob);
assert.equal(git(['rev-parse', fixtureTransition.beforeCommit + ':' + fixtureTransition.path]).toString().trim(), fixtureTransition.before.gitBlob);
assert.deepEqual(plan.limits.source, sourceLimits); assert.equal(plan.sourceOverlay, false); assert.equal(plan.actualProductPathsCommitted, true); assert.equal(plan.productionInstallation, false); assert.equal(plan.historicalReceiptsRebound, false);
const packageNames = [...plan.packagedFiles.map(row => row.path), PLAN.path, SELF, WORKFLOW].sort();
assert.equal(new Set(packageNames.map(name => name.toLowerCase())).size, packageNames.length);
for (const name of packageNames) { safe(name); assert(name === WORKFLOW || name.startsWith(PREFIX + '/') || plan.additionalCommittedBrowserPaths.includes(name)); assert(!baseTree.has(name)); }
const transitions = plan.installedProductTransitions; assert.equal(transitions.length, 18); assert.equal(new Set(transitions.map(row => row.path)).size, 18);
for (const row of transitions) { safe(row.path); assert(!packageNames.includes(row.path)); assert(currentTree.has(row.path)); if (row.before) { assert(baseTree.has(row.path)); assert.equal(baseTree.get(row.path).gitBlob, row.before.gitBlob); } else assert(!baseTree.has(row.path)); }
// Separate current ANY transition capability. Original18 historical transitions
// retain their fixed2a before-images and originally qualified after-identities.
const canonicalANYTransitions = plan.canonicalANYTransitions;
assert.equal(canonicalANYTransitions.length, 6);
assert.deepEqual(canonicalANYTransitions.map(row => row.path).sort(), [
  "products/rea-studio/apps/notes/search-query.mjs",
  "products/rea-studio/apps/notes/search-query.test.mjs",
  "products/rea-studio/apps/notes/search-query.integration.test.mjs",
  "products/rea-studio/apps/notes/search-query.ui.test.mjs",
  "products/rea-studio/apps/notes/README.md",
  "products/rea-studio/experiments/notes46-installed-search-20261019/tests/search-http.test.mjs"
].sort());
for (const row of canonicalANYTransitions) {
  safe(row.path); assert.equal(row.beforeCommit, SOURCE_PARENT); assert.equal(row.qualifiedSourceCommit, 'cb88fb39dc874a5f445d3bea6d86f9ddf651b936');
  assert.equal(row.qualifiedPayloadPath, 'products/rea-studio/experiments/notes-search-any-20261019/overlay/' + row.path + '.snapshot');
  assert.equal(row.priorRuntimeAcceptanceTransferred, false); assert(currentTree.has(row.path));
  assert.equal(git(['rev-parse', SOURCE_PARENT + ':' + row.path]).toString().trim(), row.before.gitBlob);
}
function canonicalANYBeforeImages() {
  const reference = qualifiedANYReference();
  const rows = []; let rawBytes = 0;
  for (const row of canonicalANYTransitions) {
    const bytes = git(['show', SOURCE_PARENT + ':' + row.path]); assert(bytes.length <= sourceLimits.individualBytes);
    rawBytes += bytes.length; assert(rawBytes <= sourceLimits.rawBytes); assert.deepEqual(id(bytes), pin(row.before)); assert.equal(blob(bytes), row.before.gitBlob);
    const target = 'canonical-any-parent-before/' + row.path + '.snapshot'; write(target, bytes);
    const qualified = read(evidence, 'source-reference/qualified-payloads/' + row.path + '.snapshot'); assert(qualified.length <= sourceLimits.individualBytes); assert.deepEqual(id(qualified), pin(row.after)); assert.equal(blob(qualified), row.after.gitBlob);
    rows.push({ path: row.path, preservedAt: target, before: id(bytes), beforeGitBlob: blob(bytes), parentSubject: SOURCE_PARENT,
      qualifiedPayloadPath: row.qualifiedPayloadPath, qualifiedAfter: id(qualified), currentRuntimeAcceptanceTransferred: false });
  }
  assert.equal(rows.length, 6); const result = { schema: 'rea-notes46-installed-any-wire-parent-images/v1', execution: execution(), sourceCommit: process.env.GITHUB_SHA,
    sourceParentCommit: SOURCE_PARENT, sourcePlan: id(planBytes), files: 6, rawBeforeBytes: rawBytes, rows, actualBeforeGitBytesRead: true, actualQualifiedAfterHTTPSBytesAuthenticatedAgainstGitTree: true, qualifiedReference: reference,
    currentRuntimeAcceptanceTransferred: false, productionInstallation: false, historicalReceiptsRebound: false };
  json('canonical-any-parent-before-images.json', result); return result;
}
// Qualified sibling source acquisition is separate from runtime acceptance.
// No unfiltered fetch, lazy object acquisition, refs, tags or FETCH_HEAD writes.
const QUALIFIED_ANY = 'cb88fb39dc874a5f445d3bea6d86f9ddf651b936';
const QUALIFIED_ANY_PARENT = 'ab26bf14bc1a55a723566bbafb3ca391c3ef671c';
const REFERENCE_PREFIX = 'source-reference';
const REFERENCE_LIMITS = Object.freeze({ files: 6, rawBytes: 67239, individualBytes: 512 * 1024, objectStorageAddedBytes: 8 * 1024 * 1024, metadataBytes: 8 * 1024 * 1024, processChannelBytes: 256 * 1024, processDeadlineMs: 120000, requestDeadlineMs: 30000 });
function referenceGitEnvironment() { return { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key))), GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' }; }
function referenceGit(args, cap = REFERENCE_LIMITS.metadataBytes) {
  const result = spawnSync('git', ['--no-replace-objects', ...args], { cwd: root, env: referenceGitEnvironment(), shell: false, windowsHide: true, timeout: 30000, maxBuffer: cap });
  assert.equal(result.error, undefined); assert.equal(result.signal, null); assert.equal(result.status, 0, result.stderr?.toString()); return result.stdout;
}
function referenceGitDirectory() { const name = referenceGit(['rev-parse', '--absolute-git-dir']).toString().trim(); assert.equal(path.resolve(name).toLowerCase(), path.join(root, '.git').toLowerCase()); noLinks(name); return name; }
function optionalGitBytes(name, cap) { const at = path.join(referenceGitDirectory(), safe(name)); if (!fs.existsSync(at)) return null; return read(referenceGitDirectory(), name, cap); }
function referenceRepositoryState() {
  const refs = referenceGit(['for-each-ref', '--format=%(refname) %(objectname)'], 1024 * 1024);
  const index = optionalGitBytes('index', 16 * 1024 * 1024), fetchHead = optionalGitBytes('FETCH_HEAD', 64 * 1024), config = optionalGitBytes('config', 1024 * 1024);
  assert(index && config); const status = gitStatus(); assert.deepEqual(status, []);
  return { head: referenceGit(['rev-parse', 'HEAD']).toString().trim(), tree: referenceGit(['rev-parse', 'HEAD^{tree}']).toString().trim(), refs: id(refs), index: id(index), fetchHead: fetchHead === null ? null : id(fetchHead), config: id(config), status };
}
function shallowBoundary() { const bytes = optionalGitBytes('shallow', 64 * 1024); const rows = bytes === null ? [] : bytes.toString('ascii').trim().split('\n').filter(Boolean).sort(); assert(rows.every(row => /^[0-9a-f]{40}$/.test(row))); assert.equal(new Set(rows).size, rows.length); return { rows, bytes: bytes === null ? null : id(bytes) }; }
function referenceObjectStorage() {
  const directory = path.join(referenceGitDirectory(), 'objects'); const rows = []; let rawBytes = 0;
  const walk = (at, depth) => { assert(depth <= 8); noLinks(at); for (const entry of fs.readdirSync(at, { withFileTypes: true })) { assert(!entry.isSymbolicLink()); const filename = path.join(at, entry.name); if (entry.isDirectory()) walk(filename, depth + 1); else { assert(entry.isFile()); const stat = fs.lstatSync(filename); assert(stat.isFile() && Number.isSafeInteger(stat.size) && stat.size >= 0); const name = path.relative(directory, filename).replaceAll('\\', '/'); safe(name); rows.push({ path: name, bytes: stat.size, modifiedMs: stat.mtimeMs }); rawBytes += stat.size; assert(Number.isSafeInteger(rawBytes)); assert(rows.length <= 100000); } } };
  walk(directory, 0); rows.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0); return { directory, rows, files: rows.length, rawBytes, inventory: id(Buffer.from(JSON.stringify(rows))) };
}
function referenceStorageDelta(before, after, hashAdded = false) {
  const old = new Map(before.rows.map(row => [row.path, row])); const now = new Map(after.rows.map(row => [row.path, row]));
  for (const row of before.rows) assert.deepEqual(now.get(row.path), row, 'Existing object-storage entry must remain unchanged: ' + row.path);
  const added = after.rows.filter(row => !old.has(row.path)); const rawBytes = added.reduce((sum, row) => sum + row.bytes, 0);
  assert(rawBytes <= REFERENCE_LIMITS.objectStorageAddedBytes, 'Fixed8MiB added object-storage ceiling');
  return { files: added.length, rawBytes, rows: hashAdded ? added.map(row => ({ path: row.path, ...id(read(after.directory, row.path, REFERENCE_LIMITS.objectStorageAddedBytes)) })) : added, before: { files: before.files, rawBytes: before.rawBytes, inventory: before.inventory }, after: { files: after.files, rawBytes: after.rawBytes, inventory: after.inventory } };
}
async function observeReferenceFetch(arguments_, beforeStorage) {
  const chunks = { stdout: [], stderr: [] }, sizes = { stdout: 0, stderr: 0 }; let overflow = false, timedOut = false, failure = null, termination = null;
  const result = await new Promise(resolve => {
    let settled = false, stopping = false, timer = null, force = null, monitor = null;
    const child = spawn('git', arguments_, { cwd: root, env: referenceGitEnvironment(), shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const finish = (code, signal, closeObserved) => { if (settled) return; settled = true; clearTimeout(timer); clearTimeout(force); clearInterval(monitor); resolve({ code, signal, closeObserved }); };
    const stop = reason => {
      if (stopping || settled) return; stopping = true;
      termination = { reason, ownedPid: Number.isSafeInteger(child.pid) ? child.pid : null, rootObservedRunning: child.exitCode === null && child.signalCode === null, treeKillRequested: false, taskkill: null, directChildKillRequested: false, directChildKillError: null, forcedStreamClose: false, descendantsGuaranteedStopped: false };
      force = setTimeout(() => { if (settled) return; termination.forcedStreamClose = true; child.stdout.destroy(); child.stderr.destroy(); finish(null, null, false); }, 5000);
      if (termination.ownedPid !== null && termination.rootObservedRunning) {
        try { const systemRoot = process.env.SystemRoot; assert(typeof systemRoot === 'string' && path.isAbsolute(systemRoot)); const taskkill = path.join(systemRoot, 'System32', 'taskkill.exe'); noLinks(taskkill); assert(fs.lstatSync(taskkill).isFile()); termination.treeKillRequested = true;
          const killed = spawnSync(taskkill, ['/PID', String(child.pid), '/T', '/F'], { cwd: root, shell: false, windowsHide: true, timeout: 10000, maxBuffer: 64 * 1024, env: childEnvironment({}) });
          termination.taskkill = { executable: taskkill, status: killed.status, signal: killed.signal, error: killed.error ? { name: killed.error.name, message: killed.error.message } : null, stdout: id(killed.stdout ?? Buffer.alloc(0)), stderr: id(killed.stderr ?? Buffer.alloc(0)) };
          if (killed.status !== 0 || killed.error) { termination.directChildKillRequested = true; child.kill('SIGKILL'); }
        } catch (error) { termination.directChildKillError = { name: error.name, message: error.message }; try { termination.directChildKillRequested = true; child.kill('SIGKILL'); } catch (killError) { termination.directChildKillError = { name: killError.name, message: killError.message }; } }
      }
    };
    timer = setTimeout(() => { timedOut = true; stop('timeout'); }, REFERENCE_LIMITS.processDeadlineMs);
    monitor = setInterval(() => { if (settled || stopping) return; try { referenceStorageDelta(beforeStorage, referenceObjectStorage()); } catch (error) { if (error.code === 'ENOENT') return; /* New temporary packs can be renamed between directory read and stat; the final stable inventory is mandatory. */ failure = { name: error.name, message: error.message, channel: 'object-storage-monitor' }; stop('object-storage-limit-or-mutation'); } }, 500);
    for (const channel of ['stdout', 'stderr']) { child[channel].on('data', bytes => { if (settled) return; const remaining = Math.max(0, REFERENCE_LIMITS.processChannelBytes - sizes[channel]); const saved = bytes.subarray(0, remaining); if (saved.length) { chunks[channel].push(saved); sizes[channel] += saved.length; } if (bytes.length > remaining) { overflow = true; stop('output-overflow'); } }); child[channel].once('error', error => { failure = { name: error.name, message: error.message, channel }; stop('stream-error'); }); }
    child.once('error', error => { failure = { name: error.name, message: error.message }; stop('child-error'); }); child.once('close', (code, signal) => finish(code, signal, true));
  });
  return { ...result, failure, overflow, timedOut, termination, rawLogsComplete: result.closeObserved && failure === null && !overflow && !timedOut && termination === null, stdout: Buffer.concat(chunks.stdout), stderr: Buffer.concat(chunks.stderr) };
}
async function acquireQualifiedANYReference() {
  const receipt = { schema: 'rea-notes46-qualified-any-sibling-source-acquisition/v1', execution: execution(), sourceCommit: process.env.GITHUB_SHA, sourcePlan: id(planBytes), role, status: 'failed', qualifiedCommit: QUALIFIED_ANY, qualifiedParent: QUALIFIED_ANY_PARENT, sourceParentCommit: SOURCE_PARENT, limits: REFERENCE_LIMITS, priorRuntimeAcceptanceTransferred: false, productOrOriginalExecutions: 0, sourceRowsAddedToCurrent154: 0, requests: [], failure: null };
  let beforeState = null, beforeStorage = null;
  try {
    assert.deepEqual(plan.qualifiedSiblingSourceAcquisition, { qualifiedCommit: QUALIFIED_ANY, expectedRawCommitParent: QUALIFIED_ANY_PARENT, gitURL: 'https://github.com/Ginderlax/rea-research-lab.git', rawOrigin: 'https://raw.githubusercontent.com', files: 6, rawBytes: 67239, blobFilter: 'blob:none', noLazyFetch: true, noRuntimeAcceptanceTransferred: true });
    const origin = referenceGit(['remote', 'get-url', '--all', 'origin'], 64 * 1024).toString().trim().split('\n'); assert.equal(origin.length, 1); assert(/^https:\/\/github\.com\/Ginderlax\/rea-research-lab(?:\.git)?$/.test(origin[0])); receipt.origin = origin[0];
    beforeState = referenceRepositoryState(); assert.equal(beforeState.head, process.env.GITHUB_SHA); beforeStorage = referenceObjectStorage(); const beforeShallow = shallowBoundary();
    receipt.repositoryBefore = beforeState; receipt.shallowBefore = beforeShallow;
    const gitVersion = spawnSync('git', ['--version'], { cwd: root, env: referenceGitEnvironment(), shell: false, windowsHide: true, timeout: 30000, maxBuffer: 64 * 1024 });
    const gitVersionStdout = gitVersion.stdout ?? Buffer.alloc(0), gitVersionStderr = gitVersion.stderr ?? Buffer.alloc(0);
    write(REFERENCE_PREFIX + '/git-version-stdout.txt', gitVersionStdout); write(REFERENCE_PREFIX + '/git-version-stderr.txt', gitVersionStderr);
    receipt.gitRuntime = { command: ['git', '--version'], status: gitVersion.status, signal: gitVersion.signal, error: gitVersion.error ? { name: gitVersion.error.name, message: gitVersion.error.message } : null, stdout: id(gitVersionStdout), stderr: id(gitVersionStderr), observedVersion: gitVersionStdout.toString('utf8').trim(), runtimeBinaryContentsCaptured: false, upstreamSourceReleaseMatchEstablished: false };
    assert.equal(gitVersion.error, undefined); assert.equal(gitVersion.status, 0); assert.equal(gitVersion.signal, null); assert.equal(gitVersionStderr.length, 0); assert(/^git version [^\r\n]{1,128}$/.test(receipt.gitRuntime.observedVersion));

    const ordinaryRemotes = referenceGit(['remote'], 64 * 1024).toString().trim().split(/\r?\n/).filter(Boolean);
    assert(!ordinaryRemotes.some(name => name.toLowerCase() === 'reaqualifiedsource'), 'Never override or append to an existing qualified-source remote');
    const scopedConfiguration = ['-c', 'credential.helper=', '-c', 'core.askPass=', '-c', 'http.followRedirects=false', '-c', 'protocol.file.allow=never', '-c', 'fetch.writeCommitGraph=false', '-c', 'maintenance.auto=false', '-c', 'gc.auto=0', '-c', 'remote.REAQualifiedSource.url=https://github.com/Ginderlax/rea-research-lab.git', '-c', 'remote.REAQualifiedSource.promisor=true', '-c', 'remote.REAQualifiedSource.partialclonefilter=blob:none'];
    const effectiveURLs = referenceGit([...scopedConfiguration, 'remote', 'get-url', '--all', 'REAQualifiedSource'], 64 * 1024).toString().trim().split(/\r?\n/).filter(Boolean);
    assert.deepEqual(effectiveURLs, ['https://github.com/Ginderlax/rea-research-lab.git'], 'The exact same command-scoped remote configuration must resolve to one fixed public origin');
    receipt.commandScopedRemote = { name: 'REAQualifiedSource', existingNameAbsent: true, effectiveURLs, configurationScope: 'Only the two explicitly prefixed commands; no persistent writes', persistentConfigWritesAllowed: false };
    const arguments_ = ['--no-replace-objects', ...scopedConfiguration, 'fetch', '--filter=blob:none', '--depth=1', '--no-tags', '--no-write-fetch-head', '--no-recurse-submodules', '--no-auto-maintenance', 'REAQualifiedSource', QUALIFIED_ANY];
    const observed = await observeReferenceFetch(arguments_, beforeStorage); const { stdout, stderr, ...processResult } = observed;
    write(REFERENCE_PREFIX + '/fetch-stdout.txt', stdout); write(REFERENCE_PREFIX + '/fetch-stderr.txt', stderr); receipt.fetch = { executable: 'git', arguments: arguments_, ...processResult, stdout: id(stdout), stderr: id(stderr) };
    assert.equal(processResult.code, 0); assert.equal(processResult.signal, null); assert.equal(processResult.closeObserved, true); assert.equal(processResult.rawLogsComplete, true); assert.equal(processResult.failure, null); assert.equal(processResult.overflow, false); assert.equal(processResult.timedOut, false); assert.equal(processResult.termination, null);
    assert(!/filter(?:ing)?[^\r\n]*(?:not recognized|not supported|ignored|ignoring)|(?:not recognized|not supported|ignored|ignoring)[^\r\n]*filter/i.test(stderr.toString()), 'Server must honor blob:none; there is no unfiltered fallback');
    const afterStorage = referenceObjectStorage(); receipt.objectStorage = referenceStorageDelta(beforeStorage, afterStorage, true);
    receipt.shallowAfter = shallowBoundary(); assert.deepEqual(receipt.shallowAfter.rows, [...new Set([...beforeShallow.rows, QUALIFIED_ANY])].sort(), 'Only the exact sibling shallow boundary may be added');
    assert.equal(referenceGit(['cat-file', '-t', QUALIFIED_ANY], 64 * 1024).toString().trim(), 'commit');
    const commit = referenceGit(['cat-file', 'commit', QUALIFIED_ANY], 64 * 1024); write(REFERENCE_PREFIX + '/qualified-commit.raw.txt', commit);
    const commitObject = createHash('sha1').update('commit ' + commit.length + '\0').update(commit).digest('hex'); assert.equal(commitObject, QUALIFIED_ANY);
    const header = commit.toString('utf8').split('\n\n')[0].split('\n'); const parents = header.filter(line => line.startsWith('parent ')); assert.deepEqual(parents, ['parent ' + QUALIFIED_ANY_PARENT]); const trees = header.filter(line => line.startsWith('tree ')); assert.equal(trees.length, 1); assert(/^tree [0-9a-f]{40}$/.test(trees[0]));
    const listing = referenceGit(['ls-tree', '-r', '-z', '--full-tree', QUALIFIED_ANY]); write(REFERENCE_PREFIX + '/qualified-tree.raw.txt', listing); const entries = new Map();
    for (const line of listing.toString().split('\0').filter(Boolean)) { const match = /^(\d{6}) (blob|commit) ([0-9a-f]{40})\t(.+)$/.exec(line); assert(match); safe(match[4]); assert(!entries.has(match[4])); entries.set(match[4], { mode: match[1], kind: match[2], gitBlob: match[3] }); }
    receipt.commit = { ...id(commit), authenticatedCommitObject: commitObject, rawParentHeader: parents[0], tree: trees[0].slice(5), treeListing: id(listing), treeEntries: entries.size, noShallowRevListParentInference: true };
    let rawBytes = 0; const references = [];
    for (const row of canonicalANYTransitions) {
      const entry = entries.get(row.qualifiedPayloadPath); assert(entry && entry.mode === '100644' && entry.kind === 'blob'); assert.equal(entry.gitBlob, row.after.gitBlob);
      const url = 'https://raw.githubusercontent.com/Ginderlax/rea-research-lab/' + QUALIFIED_ANY + '/' + row.qualifiedPayloadPath; const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), REFERENCE_LIMITS.requestDeadlineMs); const chunks = []; let length = 0;
      const request = { path: row.path, url, method: 'GET', redirectsAllowed: false, authenticationSupplied: false, acceptEncoding: 'identity', status: 'failed', bytesObserved: 0 }; receipt.requests.push(request);
      try { const response = await fetch(url, { method: 'GET', redirect: 'error', credentials: 'omit', signal: controller.signal, headers: { Accept: 'application/octet-stream', 'Accept-Encoding': 'identity' } }); request.httpStatus = response.status; request.responseURL = response.url; assert.equal(response.status, 200); assert.equal(response.url, url); assert(response.body); const contentEncoding = response.headers.get('content-encoding'); request.contentEncoding = contentEncoding; assert(contentEncoding === null || contentEncoding.trim().toLowerCase() === 'identity', 'Reference response must be identity encoded before Content-Length is compared to the raw source pin'); const declaredLength = response.headers.get('content-length'); if (declaredLength !== null) { assert(/^[0-9]+$/.test(declaredLength)); assert.equal(Number(declaredLength), row.after.bytes); } for await (const chunk of response.body) { length += chunk.length; request.bytesObserved = length; assert(length <= row.after.bytes && length <= REFERENCE_LIMITS.individualBytes); assert(rawBytes + length <= REFERENCE_LIMITS.rawBytes); chunks.push(Buffer.from(chunk)); } const bytes = Buffer.concat(chunks); assert.deepEqual(id(bytes), pin(row.after)); assert.equal(blob(bytes), entry.gitBlob); const current = read(root, row.path); committed(row.path, current); assert.deepEqual(current, bytes, 'Canonical current target equals independently acquired qualified bytes');
        const target = REFERENCE_PREFIX + '/qualified-payloads/' + row.path + '.snapshot'; write(target, bytes); rawBytes += bytes.length; request.status = 'qualified-source-equivalence-only'; request.identity = id(bytes); references.push({ path: row.path, qualifiedPayloadPath: row.qualifiedPayloadPath, preservedAt: target, ...id(bytes), gitBlob: blob(bytes), canonicalCurrentGitBlob: committed(row.path, current).gitBlob, priorRuntimeAcceptanceTransferred: false });
      } catch (error) { if (chunks.length) write(REFERENCE_PREFIX + '/partial-payloads/' + row.path + '.snapshot', Buffer.concat(chunks)); request.failure = { name: error.name, message: error.message }; throw error; } finally { clearTimeout(timer); }
    }
    assert.equal(references.length, REFERENCE_LIMITS.files); assert.equal(rawBytes, REFERENCE_LIMITS.rawBytes); receipt.references = references; receipt.rawReferenceBytes = rawBytes;
    receipt.repositoryAfter = referenceRepositoryState(); assert.deepEqual(receipt.repositoryAfter, beforeState, 'Source reference acquisition cannot change HEAD/tree/index/status/refs/tags/FETCH_HEAD/config'); hosted(); receipt.status = 'qualified-source-equivalence-only';
  } catch (error) { receipt.failure = { name: error.name, message: error.message, stack: String(error.stack).slice(0, 16000) }; if (beforeState) { try { receipt.repositoryAfterFailure = referenceRepositoryState(); receipt.repositoryStateUnchangedAfterFailure = JSON.stringify(receipt.repositoryAfterFailure) === JSON.stringify(beforeState); } catch (stateError) { receipt.repositoryStateFailure = { name: stateError.name, message: stateError.message }; } } throw error;
  } finally { json(REFERENCE_PREFIX + '/acquisition.json', receipt); }
  return receipt;
}
function qualifiedANYReference() {
  const bytes = read(evidence, REFERENCE_PREFIX + '/acquisition.json', 1024 * 1024), receipt = JSON.parse(bytes); sameAttempt(receipt); assert.equal(receipt.schema, 'rea-notes46-qualified-any-sibling-source-acquisition/v1'); assert.equal(receipt.status, 'qualified-source-equivalence-only'); assert.equal(receipt.qualifiedCommit, QUALIFIED_ANY); assert.equal(receipt.qualifiedParent, QUALIFIED_ANY_PARENT); assert.equal(receipt.sourceParentCommit, SOURCE_PARENT); assert.equal(receipt.priorRuntimeAcceptanceTransferred, false); assert.equal(receipt.rawReferenceBytes, REFERENCE_LIMITS.rawBytes); assert.deepEqual(receipt.repositoryBefore, receipt.repositoryAfter); assert.equal(receipt.repositoryAfter.head, process.env.GITHUB_SHA);
  assert.deepEqual(receipt.limits, REFERENCE_LIMITS); assert.deepEqual(referenceRepositoryState(), receipt.repositoryAfter);
  assert.equal(receipt.commandScopedRemote.name, 'REAQualifiedSource'); assert.equal(receipt.commandScopedRemote.existingNameAbsent, true); assert.deepEqual(receipt.commandScopedRemote.effectiveURLs, ['https://github.com/Ginderlax/rea-research-lab.git']); assert.equal(receipt.commandScopedRemote.persistentConfigWritesAllowed, false);
  assert.equal(receipt.fetch.code, 0); assert.equal(receipt.fetch.signal, null); assert.equal(receipt.fetch.closeObserved, true); assert.equal(receipt.fetch.rawLogsComplete, true); assert.equal(receipt.fetch.failure, null); assert.equal(receipt.fetch.termination, null); assert.equal(receipt.fetch.timedOut, false); assert.equal(receipt.fetch.overflow, false);
  for (const channel of ['stdout', 'stderr']) assert.deepEqual(id(read(evidence, REFERENCE_PREFIX + '/fetch-' + channel + '.txt', REFERENCE_LIMITS.processChannelBytes)), pin(receipt.fetch[channel]));
  assert(receipt.objectStorage.rawBytes <= REFERENCE_LIMITS.objectStorageAddedBytes);
  assert.equal(receipt.gitRuntime.status, 0); assert.equal(receipt.gitRuntime.signal, null); assert.equal(receipt.gitRuntime.error, null); assert.equal(receipt.gitRuntime.upstreamSourceReleaseMatchEstablished, false);
  const gitVersionStdout = read(evidence, REFERENCE_PREFIX + '/git-version-stdout.txt', 64 * 1024), gitVersionStderr = read(evidence, REFERENCE_PREFIX + '/git-version-stderr.txt', 64 * 1024);
  assert.deepEqual(id(gitVersionStdout), pin(receipt.gitRuntime.stdout)); assert.deepEqual(id(gitVersionStderr), pin(receipt.gitRuntime.stderr)); assert.equal(gitVersionStderr.length, 0); assert.equal(gitVersionStdout.toString('utf8').trim(), receipt.gitRuntime.observedVersion);

  const commit = read(evidence, REFERENCE_PREFIX + '/qualified-commit.raw.txt', 64 * 1024); assert.deepEqual(id(commit), pin(receipt.commit)); assert.equal(createHash('sha1').update('commit ' + commit.length + '\0').update(commit).digest('hex'), QUALIFIED_ANY); assert.deepEqual(commit.toString('utf8').split('\n\n')[0].split('\n').filter(line => line.startsWith('parent ')), ['parent ' + QUALIFIED_ANY_PARENT]);
  const listing = read(evidence, REFERENCE_PREFIX + '/qualified-tree.raw.txt', REFERENCE_LIMITS.metadataBytes); assert.deepEqual(id(listing), pin(receipt.commit.treeListing)); assert.deepEqual(listing, referenceGit(['ls-tree', '-r', '-z', '--full-tree', QUALIFIED_ANY]));
  assert.equal(receipt.references.length, 6); assert.deepEqual(receipt.references.map(row => row.path).sort(), canonicalANYTransitions.map(row => row.path).sort()); let total = 0;
  for (const reference of receipt.references) { const row = canonicalANYTransitions.find(item => item.path === reference.path); assert.equal(reference.qualifiedPayloadPath, row.qualifiedPayloadPath); const actual = read(evidence, reference.preservedAt); total += actual.length; assert.deepEqual(id(actual), pin(row.after)); assert.equal(blob(actual), row.after.gitBlob); assert.deepEqual(actual, read(root, row.path)); committed(row.path, actual); }
  assert.equal(total, REFERENCE_LIMITS.rawBytes); return { path: REFERENCE_PREFIX + '/acquisition.json', ...id(bytes), qualifiedCommit: QUALIFIED_ANY, sourceEquivalenceOnly: true, currentRuntimeAcceptanceTransferred: false };
}

function fixtureBeforeImages() {
  const bytes = git(['show', fixtureTransition.beforeCommit + ':' + fixtureTransition.path]); assert(bytes.length <= sourceLimits.individualBytes); assert.deepEqual(id(bytes), pin(fixtureTransition.before)); assert.equal(blob(bytes), fixtureTransition.before.gitBlob);
  assert.deepEqual(git(['show', BASELINE + ':' + fixtureTransition.path]), bytes);
  write('fixture-before/' + fixtureTransition.path + '.snapshot', bytes);
  const result = { schema: 'rea-notes46-reviewed-fixture-beforeimage/v1', execution: execution(), sourceCommit: process.env.GITHUB_SHA, role, files: 1, beforeCommit: fixtureTransition.beforeCommit, historicalComparisonCommit: BASELINE, sameHistoricalBlobVerified: true, row: { path: fixtureTransition.path, ...id(bytes), gitBlob: blob(bytes) }, replacementSource: fixtureTransition.after, behaviorAcceptancePreclaimed: false, historicalReceiptsRebound: false };
  json('fixture-before-image.json', result); return result;
}
function parentBeforeImages() {
  const rows = []; let rawBytes = 0;
  for (const row of transitions.filter(item => item.before)) {
    const bytes = git(['show', BASELINE + ':' + row.path]); assert(bytes.length <= sourceLimits.individualBytes); rawBytes += bytes.length; assert(rawBytes <= sourceLimits.rawBytes); assert.deepEqual(id(bytes), pin(row.before)); assert.equal(blob(bytes), row.before.gitBlob);
    const target = 'parent-before/' + row.path + '.snapshot'; write(target, bytes); rows.push({ path: row.path, preservedAt: target, ...id(bytes), gitBlob: blob(bytes), historicalParent: BASELINE, currentAcceptanceClaimed: false });
  }
  assert.equal(rows.length, 3); const result = { schema: 'rea-notes46-installed-parent-beforeimages/v1', execution: execution(), sourceCommit: process.env.GITHUB_SHA, sourcePlan: id(planBytes), role, historicalParent: BASELINE, files: rows.length, rawBytes, rows, parentAbsenceForNew15Verified: true, historicalReceiptsRebound: false };
  json('parent-before-images.json', result); return result;
}
function capture(kind, save = true) {
  const actualNotes = noteNames(path.join(root, 'products/rea-studio/apps/notes'));
  const actualStatus = gitStatus(), authenticationErrors = [];
  const check = (name, body) => { try { body(); } catch (error) { authenticationErrors.push({ path: name, name: error.name, message: String(error.message).slice(0, 4000) }); } };
  check('Git worktree status', () => assert.deepEqual(actualStatus, []));
  check('Actual physical Notes census', () => assert.deepEqual(actualNotes, plan.installedNotesSources.map(row => row.path).sort()));
  const definitions = [...plan.installedNotesSources, ...plan.studySources, ...plan.baselineDependencies, ...plan.browserBaselineSources.map(row => row.path === fixtureTransition.path ? { path: row.path, ...fixtureTransition.after } : row), ...plan.packagedFiles, ...plan.canonicalANYAdditionalSources];
  const expected = new Map(definitions.map(row => [row.path, row])); assert.equal(expected.size, definitions.length);
  for (const name of [PLAN.path, SELF, WORKFLOW]) { assert(!expected.has(name)); expected.set(name, { path: name }); }
  assert.equal(expected.size, plan.captureCount);
  for (const name of actualNotes) if (!expected.has(name)) expected.set(name, { path: name });
  assert(expected.size <= sourceLimits.files); assert.equal(new Set([...expected.keys()].map(name => name.toLowerCase())).size, expected.size);
  const rows = []; let total = 0;
  for (const [name, row] of [...expected].sort(([a], [b]) => a.localeCompare(b))) {
    if (!fs.existsSync(path.join(root, name))) { authenticationErrors.push({ path: name, name: 'MissingSource', message: 'Declared source is absent; contents cannot be captured' }); continue; }
    const bytes = read(root, name); total += bytes.length; assert(total <= sourceLimits.rawBytes);
    if (save) write('source-' + kind + '/' + name + '.snapshot', bytes);
    if (row.sha256) check(name, () => assert.deepEqual(id(bytes), pin(row), name));
    check(name, () => { const metadata = committed(name, bytes); const canonicalANY = canonicalANYTransitions.find(item => item.path === name), changed = transitions.find(item => item.path === name); if (canonicalANY) assert.deepEqual(id(bytes), pin(canonicalANY.after)); else if (changed) assert.deepEqual(id(bytes), pin(changed.after)); else if (name === fixtureTransition.path) { assert.deepEqual(id(bytes), pin(fixtureTransition.after)); assert.equal(baseTree.get(name)?.gitBlob, fixtureTransition.before.gitBlob); } else if (!packageNames.includes(name)) { assert(baseTree.has(name)); assert.deepEqual(metadata, baseTree.get(name)); } if (row.gitBlob) assert.equal(blob(bytes), row.gitBlob); });
    rows.push({ path: name, ...id(bytes), gitBlob: blob(bytes), intendedEpoch: canonicalANYTransitions.some(row => row.path === name) ? 'committed-canonical-installed-any-wire-target' : transitions.some(row => row.path === name) ? 'committed-historical-structured-search-target' : name === fixtureTransition.path ? 'committed-reviewed-fixture-lifecycle-repair' : packageNames.includes(name) ? 'committed-installed-study-support' : 'unchanged-parent-input' });
  }
  check('Exact selected source count', () => assert.equal(rows.length, plan.captureCount));
  const result = { schema: 'rea-notes46-installed-any-wire-source-capture/v1', execution: execution(), role, phase: kind, sourceCommit: process.env.GITHUB_SHA, baselineCommit: BASELINE, sourcePlan: id(planBytes), canonicalFeatureBranchCommittedSource: true, sourceOverlay: false, actualProductPathsCommitted: true, appSourceWritesByCollector: 0, productionInstallation: false, historicalReceiptsRebound: false, files: rows.length, rawBytes: total, limits: sourceLimits, actualNotes, actualStatus, rows, contentsPreserved: save, sourceAuthenticated: authenticationErrors.length === 0, authenticationErrors };
  if (save) json('source-' + kind + '.json', result);
  assert.equal(authenticationErrors.length, 0, 'Source authentication failed; bounded observed bytes and errors were preserved when requested'); return result;
}
function sameAttempt(receipt) { assert.deepEqual(receipt.execution, execution()); assert.equal(receipt.sourceCommit, process.env.GITHUB_SHA); assert.deepEqual(receipt.sourcePlan, id(planBytes)); assert.equal(receipt.role, role); }
function readiness() { const receipt = JSON.parse(read(evidence, 'ready.json')); sameAttempt(receipt); assert.equal(receipt.status, 'ready-installed-any-wire-unexecuted'); assert.equal(receipt.sourceOverlay, false); assert.equal(receipt.actualProductPathsCommitted, true); const current = capture('reauthentication', false); assert.deepEqual(current.rows, receipt.current.rows); qualifiedANYReference(); return { receipt, current }; }
function totals(output) { const result = {}; for (const key of ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) { const values = [...output.matchAll(new RegExp('^# ' + key + ' ([0-9]+)\\r?$', 'gm'))]; assert.equal(values.length, 1, 'Exactly one real TAP summary: ' + key); result[key] = Number(values[0][1]); } return result; }
// Observe only this newly spawned child. A timeout/overflow/error requests its
// Windows PID tree, then closes owned pipes after a fixed grace period. A lost
// close event or truncated stream is recorded and cannot qualify success.
async function observeOwnedNode(arguments_, options, timeoutMs, channelLimit) {
  const chunks = { stdout: [], stderr: [] }, sizes = { stdout: 0, stderr: 0 };
  let overflow = false, timedOut = false, failure = null, termination = null;
  const result = await new Promise(resolve => {
    let settled = false, stopping = false, timer = null, force = null;
    const child = spawn(process.execPath, arguments_, { ...options, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const finish = (code, signal, closeObserved) => { if (settled) return; settled = true; clearTimeout(timer); clearTimeout(force); resolve({ code, signal, closeObserved }); };
    const stop = reason => {
      if (stopping || settled) return; stopping = true;
      termination = { reason, ownedPid: Number.isSafeInteger(child.pid) ? child.pid : null, rootObservedRunning: child.exitCode === null && child.signalCode === null, treeKillRequested: false, taskkill: null, directChildKillRequested: false, directChildKillError: null, forcedStreamClose: false, descendantsGuaranteedStopped: false };
      force = setTimeout(() => { if (settled) return; termination.forcedStreamClose = true; child.stdout.destroy(); child.stderr.destroy(); finish(null, null, false); }, 5000);
      if (termination.ownedPid !== null && termination.rootObservedRunning) {
        try {
          const systemRoot = process.env.SystemRoot; assert(typeof systemRoot === 'string' && path.isAbsolute(systemRoot));
          const taskkill = path.join(systemRoot, 'System32', 'taskkill.exe'); noLinks(taskkill); assert(fs.lstatSync(taskkill).isFile());
          termination.treeKillRequested = true;
          const killed = spawnSync(taskkill, ['/PID', String(child.pid), '/T', '/F'], { cwd: root, shell: false, windowsHide: true, timeout: 10000, maxBuffer: 64 * 1024, env: childEnvironment({}) });
          termination.taskkill = { executable: taskkill, status: killed.status, signal: killed.signal, error: killed.error ? { name: killed.error.name, message: killed.error.message } : null, stdout: id(killed.stdout ?? Buffer.alloc(0)), stderr: id(killed.stderr ?? Buffer.alloc(0)) };
          if (killed.status !== 0 || killed.error) { termination.directChildKillRequested = true; child.kill('SIGKILL'); }
        } catch (error) {
          termination.directChildKillError = { name: error.name, message: error.message };
          try { termination.directChildKillRequested = true; child.kill('SIGKILL'); } catch (killError) { termination.directChildKillError = { name: killError.name, message: killError.message }; }
        }
      }
    };
    timer = setTimeout(() => { timedOut = true; stop('timeout'); }, timeoutMs);
    for (const channel of ['stdout', 'stderr']) {
      child[channel].on('data', bytes => { if (settled) return; const remaining = Math.max(0, channelLimit - sizes[channel]); const saved = bytes.subarray(0, remaining); if (saved.length) { chunks[channel].push(saved); sizes[channel] += saved.length; } if (bytes.length > remaining) { overflow = true; stop('output-overflow'); } });
      child[channel].once('error', error => { failure = { name: error.name, message: error.message, channel }; stop('stream-error'); });
    }
    child.once('error', error => { failure = { name: error.name, message: error.message }; stop('child-error'); });
    child.once('close', (code, signal) => finish(code, signal, true));
  });
  return { ...result, failure, overflow, timedOut, termination, rawLogsComplete: result.closeObserved && failure === null && !overflow && !timedOut, stdout: Buffer.concat(chunks.stdout), stderr: Buffer.concat(chunks.stderr) };
}
async function run(row, index) {
  const folder = 'tests/' + String(index + 1).padStart(2, '0') + '-' + path.basename(row.path); const start = new Date().toISOString();

  const observations = path.join(evidence, 'observations/' + String(index + 1).padStart(2, '0'));
  fs.mkdirSync(observations, { recursive: true }); noLinks(observations);
  if (row.path.endsWith('/notebook-trash.test.mjs')) assert(!fs.existsSync(path.join(root, legacyObservation)), 'No stale legacy observation may be reused');
  const observed = await observeOwnedNode(['--test', '--test-reporter=tap', '--test-concurrency=1', row.path], { cwd: root, env: childEnvironment({ NOTES_REVIEW_OUTPUT: pathToFileURL(observations + path.sep).href, REA_SEARCH_VALUE_EVIDENCE: observations }) }, testTimeout, outputLimit);
  const { stdout, stderr, ...result } = observed, { failure, timedOut, overflow } = result;
  write(folder + '/stdout.txt', stdout); write(folder + '/stderr.txt', stderr);
  let legacyOutput = null;
  if (row.path.endsWith('/notebook-trash.test.mjs') && fs.existsSync(path.join(root, legacyObservation))) { const bytes = read(root, legacyObservation); write(folder + '/legacy-trash-original.json', bytes); legacyOutput = { path: legacyObservation, ...id(bytes), newlyWrittenInThisAttempt: true }; }
  let summary = null, qualificationError = null;
  try { summary = totals(stdout.toString('utf8')); assert.equal(failure, null); assert.equal(overflow, false); assert.equal(timedOut, false); assert.equal(result.code, 0); assert.equal(result.signal, null); assert.equal(result.closeObserved, true); assert.equal(result.rawLogsComplete, true); assert.equal(summary.fail + summary.cancelled + summary.skipped + summary.todo, 0); assert.equal(summary.pass, summary.tests); assert(summary.tests >= row.minimumResults); if (row.exactResults !== null) assert.equal(summary.tests, row.exactResults); for (const title of row.requiredTopTitles) assert(stdout.toString().includes('# Subtest: ' + title)); }
  catch (error) { qualificationError = { name: error.name, message: error.message }; }
  const receipt = { path: row.path, role: row.role, startedAt: start, endedAt: new Date().toISOString(), command: [process.execPath, '--test', '--test-reporter=tap', '--test-concurrency=1', row.path], ...result, failure, timedOut, overflow, stdout: id(stdout), stderr: id(stderr), legacyOutput, observedTAP: summary, expected: row, status: qualificationError ? 'failed' : 'passed', qualificationError };
  json(folder + '/result.json', receipt); return receipt;
}
function valueObservations() {
  const name = 'observations/01/original-search-values.jsonl', bytes = read(evidence, name, 1024 * 1024), text = bytes.toString('utf8');
  assert(text.endsWith('\n')); const lines = text.slice(0, -1).split('\n'); assert.equal(lines.length, 82);
  const values = lines.map(line => JSON.parse(line)); const header = values[0], footer = values.at(-1), cases = values.slice(1, -1);
  const actualAttempt = { sourceCommit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT, job: process.env.GITHUB_JOB };
  for (const row of values) for (const [key, value] of Object.entries(actualAttempt)) assert.equal(row[key], value, 'Physical observed value attempt: ' + key);
  assert.equal(header.schema, 'rea-search-original-observed-values-header/v1'); assert.equal(header.expectedParserCases, 48); assert.equal(header.expectedMetadataSQLCases, 32);
  assert.equal(header.originalFullApplicationExecuted, false); assert.equal(header.originalPersistedSearchDatabaseExecuted, false); assert.equal(header.FTSOrRankCompared, false);
  assert.equal(footer.schema, 'rea-search-original-observed-values-footer/v1'); assert.equal(footer.complete, true); assert.equal(footer.records, 80); assert.deepEqual(footer.observedCounts, { parser: 48, 'metadata-sql': 32 });
  assert.equal(footer.assertionOutcomeMustBeReadFromActualTAP, true); assert.equal(footer.TAPParentAndChildResultsExpected, 82);
  const counts = { parser: 0, 'metadata-sql': 0 };
  for (const [index, row] of cases.entries()) {
    const kind = index < 48 ? 'parser' : 'metadata-sql', caseIndex = counts[kind]++;
    assert.equal(row.schema, 'rea-search-original-observed-case/v1'); assert.equal(row.kind, kind); assert.equal(row.caseIndex, caseIndex);
    assert.equal(row.query, plan.originalComparisonQueries[kind][caseIndex]); assert.deepEqual(row.originalSourcePins, plan.originalComparisonSourcePins); assert.equal(row.recordedBeforeStrictAssertion, true);
    if (kind === 'parser') { assert(row.original && row.replacement); assert.deepEqual(row.original, row.replacement); }
    else { assert(typeof row.SQL === 'string' && row.SQL.length > 0 && Array.isArray(row.params)); assert(Array.isArray(row.originalResultIds) && Array.isArray(row.replacementResultIds)); assert.deepEqual(row.originalResultIds, row.replacementResultIds); assert.deepEqual(row.originalResultIds, [...new Set(row.originalResultIds)].sort()); for (const name of row.originalResultIds) assert(plan.originalComparisonFixtureIds.includes(name)); }
  }
  assert.deepEqual(counts, { parser: 48, 'metadata-sql': 32 });
  return { path: name, ...id(bytes), physicalJSONLReadback: true, physicalLines: lines.length, actualComparisonRecords: cases.length, counts, allQueriesInFrozenFixtureOrder: true, actualValuesAndSQLAndIDsPreserved: true, sourcePinsAndAttemptVerified: true, originalFullApplicationExecuted: false, FTSOrRankCompared: false, requiresActual82ResultTAPAlso: true };
}
const toolsRoot = path.join(root, 'products/rea-studio/browser-tests');
function toolingAcquisition() {
  assert.equal(role, 'browser');
  const raw = read(evidence, 'acquisition/browser-tooling-acquisition.json', 8 * 1024 * 1024), receipt = JSON.parse(raw);
  assert.equal(receipt.schema, 'rea-cloud-browser-tooling-acquisition/v1'); assert.equal(receipt.status, 'acquired'); assert.equal(receipt.sourceCommit, process.env.GITHUB_SHA); assert.equal(receipt.productTests, 0);
  for (const key of ['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY']) assert.equal(receipt.execution[key], process.env[key]);
  for (const [key, name] of [['package', 'package.json'], ['lock', 'package-lock.json'], ['browserMetadata', 'browser-metadata.json']]) assert.deepEqual(receipt.toolingSource[key], id(read(root, 'products/rea-studio/browser-tests/' + name)));
  assert.equal(receipt.browserImage.revision, '1248'); assert.equal(receipt.browserImage.expectedVersion, '156.0.8078.4'); assert.equal(receipt.browserImage.name, 'chromium');
  const cache = fs.realpathSync(process.env.PLAYWRIGHT_BROWSERS_PATH); assert(within(temporary, cache)); noLinks(cache); noLinks(receipt.browserImage.executable); assert(within(cache, receipt.browserImage.executable));
  return { path: 'acquisition/browser-tooling-acquisition.json', ...id(raw), image: receipt.browserImage, acquisitionOnlyNoOldProductAcceptanceReused: true };
}
function toolSources(kind, prior = null) {
  const limits = plan.limits.toolSources, rows = []; let total = 0;
  const folders = ['node_modules/@playwright/test', 'node_modules/playwright', 'node_modules/playwright-core'];
  for (const name of folders) assert.equal(JSON.parse(read(toolsRoot, name + '/package.json', limits.memberBytes)).version, '1.64.1');
  function add(name) { const data = read(toolsRoot, name, limits.memberBytes); total += data.length; assert(total <= limits.rawBytes && rows.length < limits.files); const row = { path: name, ...id(data) }; rows.push(row); const old = prior?.rows.find(item => item.path === name); if (!old || old.sha256 !== row.sha256 || old.bytes !== row.bytes) write('tool-source-' + kind + '/' + name + '.snapshot', data); }
  function walk(name, depth = 0) { assert(depth <= 32); const directory = path.join(toolsRoot, safe(name)); noLinks(directory); for (const item of fs.readdirSync(directory, { withFileTypes: true })) { assert(!item.isSymbolicLink()); const next = name + '/' + item.name; if (item.isDirectory()) walk(next, depth + 1); else { assert(item.isFile()); add(next); } } }
  for (const name of folders) walk(name); add('node_modules/.package-lock.json'); rows.sort((a, b) => a.path.localeCompare(b.path));
  assert.equal(new Set(rows.map(row => row.path.toLowerCase())).size, rows.length);
  const stable = prior === null ? null : JSON.stringify(prior.rows) === JSON.stringify(rows);
  const receipt = { schema: 'rea-search-browser-tool-source-capture/v1', execution: execution(), role, sourceCommit: process.env.GITHUB_SHA, sourcePlan: id(planBytes), phase: kind, files: rows.length, rawBytes: total, limits, rows, completeSelectedPackageContentsCaptured: true, externalRuntimeBinariesIncluded: false, afterContentsDeduplicatedAgainstSameAttemptBeforeOnlyWhenIdentical: prior !== null, stable };
  json('tool-source-' + kind + '.json', receipt); if (prior !== null) assert.equal(stable, true, 'Installed tool source changed; safe changed bytes were preserved'); return receipt;
}
async function executableIdentity(filename) {
  noLinks(filename); const stat = fs.lstatSync(filename); assert(stat.isFile() && stat.size > 0 && stat.size <= 512 * 1024 * 1024);
  const hash = createHash('sha256'); let bytes = 0;
  for await (const chunk of fs.createReadStream(filename)) { bytes += chunk.length; assert(bytes <= stat.size); hash.update(chunk); }
  assert.equal(bytes, stat.size); return { bytes, sha256: hash.digest('hex') };
}
async function runBrowser() {
  const output = path.join(evidence, 'browser'); assert(!fs.existsSync(output)); fs.mkdirSync(output); noLinks(output);
  const data = fs.mkdtempSync(path.join(temporary, 'rea-notes-search-browser-data-')); noLinks(data); assert(within(temporary, data));
  const command = [path.join(toolsRoot, 'node_modules/playwright/cli.js'), 'test', '--config', path.basename(plan.browserConfig)];

  const observed = await observeOwnedNode(command, { cwd: toolsRoot, env: childEnvironment({ REA_BROWSER_EVIDENCE: output, REA_BROWSER_DATA_ROOT: data }) }, 20 * 60000, 8 * 1024 * 1024);
  const { stdout, stderr, ...result } = observed, { failure, overflow, timedOut } = result;
  write('browser-stdout.txt', stdout); write('browser-stderr.txt', stderr);
  const cleanup = { ownedDataCreated: true, childCloseObserved: result.closeObserved, ownedDataRemoved: false, error: null };
  try { assert(within(temporary, data) && path.basename(data).startsWith('rea-notes-search-browser-data-')); noLinks(data); fs.rmSync(data, { recursive: true, force: false }); cleanup.ownedDataRemoved = !fs.existsSync(data); }
  catch (error) { cleanup.error = { name: error.name, message: error.message }; }
  const receipt = { command: [process.execPath, ...command], ...result, failure, overflow, timedOut, stdout: id(stdout), stderr: id(stderr), ownedCloudDataRoot: data, cleanup, retriesConfigured: 0 };
  json('browser-child.json', receipt); return receipt;
}
function browserResults(nativeTarIdentity) {
  assert.equal(plan.sourceEpoch, 'notes46-installed-any-wire-v1');
  assert.equal(plan.browserCases.length, 36);
  const expectedRoles = { 'new-search': 8, 'retained-new-todo': 8, 'retained-recovery': 4, 'retained-native-storage': 8, 'new-any-search': 8 };
  assert.deepEqual([...new Set(plan.browserCases.map(row => row.role))].sort(), Object.keys(expectedRoles).sort());
  for (const [role, count] of Object.entries(expectedRoles)) assert.equal(plan.browserCases.filter(row => row.role === role).length, count, role);
  assert.equal(new Set(plan.browserCases.map(row => row.sourceCaseId)).size, 36);
  assert.equal(new Set(plan.browserCases.map(row => row.title)).size, 36);
  assert.equal(process.env.GITHUB_SERVER_URL, 'https://github.com');

  const bytes = read(evidence, 'browser/playwright-results.json', 8 * 1024 * 1024), report = JSON.parse(bytes), specs = [];
  function visit(suite) { for (const spec of suite.specs ?? []) specs.push(spec); for (const child of suite.suites ?? []) visit(child); }
  for (const suite of report.suites ?? []) visit(suite);
  assert.equal(report.errors?.length ?? 0, 0); assert.equal(specs.length, 36);
  assert.equal(report.stats.expected, 36); assert.equal(report.stats.unexpected + report.stats.flaky + report.stats.skipped, 0);
  const seen = new Set(), actual = [], workers = new Set();
  for (const spec of specs) {
    assert.equal(spec.ok, true); assert.equal(spec.tests.length, 1); const test = spec.tests[0]; assert.equal(test.projectName, 'chromium'); assert.equal(test.status, 'expected'); assert.equal(test.expectedStatus, 'passed'); assert.equal(test.results.length, 1);
    const result = test.results[0]; assert.equal(result.status, 'passed'); assert.equal(result.retry, 0); assert.equal(result.errors?.length ?? 0, 0);
    const filename = path.resolve(toolsRoot, spec.file); assert(within(toolsRoot, filename)); const relative = path.relative(root, filename).replaceAll('\\', '/');
    const expected = plan.browserCases.find(row => row.title === spec.title && row.path === relative); assert(expected && !seen.has(expected.sourceCaseId)); seen.add(expected.sourceCaseId);
    const runtimeTestId = test.testId ?? spec.id; assert(typeof runtimeTestId === 'string' && runtimeTestId.length > 0 && runtimeTestId.length <= 200); workers.add(result.workerIndex);
    actual.push({ sourceCaseId: expected.sourceCaseId, title: spec.title, file: relative, runtimeTestId, workerIndex: result.workerIndex, status: result.status, retry: result.retry });
  }
  assert.deepEqual([...seen].sort(), plan.browserCases.map(row => row.sourceCaseId).sort());
  assert.equal(workers.size, 1); assert.equal(report.config.workers, 1);
  const projects = report.config.projects; assert(Array.isArray(projects)); assert.equal(projects.length, 1); assert.equal(projects[0].name, 'chromium'); assert.equal(projects[0].retries, 0);
  const ci = projects[0].metadata?.ci; assert(ci); assert.equal(ci.commitHash, process.env.GITHUB_SHA);
  assert.equal(ci.commitHref, process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY + '/commit/' + process.env.GITHUB_SHA);
  assert.equal(ci.buildHref, process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY + '/actions/runs/' + process.env.GITHUB_RUN_ID);
  assert.equal(projects[0].metadata.gitCommit.hash, process.env.GITHUB_SHA);
  const objects = fs.readdirSync(path.join(evidence, 'browser')).filter(name => name.endsWith('.json')).map(name => ({ name, bytes: read(evidence, 'browser/' + name, 8 * 1024 * 1024) })).map(row => ({ ...row, value: JSON.parse(row.bytes) }));
  function caseRows(schema, titles, attemptField) {
    const rows = objects.filter(row => row.value.schema === schema); assert.equal(rows.length, titles.length); assert.deepEqual(rows.map(row => row.value.title).sort(), [...titles].sort());
    for (const { value } of rows) { assert.equal(value.sourceCommit, process.env.GITHUB_SHA); assert.equal(value.runId, process.env.GITHUB_RUN_ID); assert.equal(value[attemptField], process.env.GITHUB_RUN_ATTEMPT); assert.equal(value.retry, 0); assert.equal(value.statusAtFixtureClose, 'passed'); assert.equal(value.realBrowser, true); assert.equal(value.actualHTTP, true); assert.deepEqual(value.errors, []); assert(typeof value.testId === 'string' && value.testId); assert.equal(value.testId, actual.find(item => item.title === value.title)?.runtimeTestId); }
    return rows;
  }
  const newRows = caseRows('rea-notes-structured-search-real-browser-case/v1', plan.browserCases.filter(row => row.role === 'new-search').map(row => row.title), 'runAttempt');
  const screenshots = [];
  for (const { name, value } of newRows) { assert.equal(name, 'search-case-' + value.testId + '.json'); assert.equal(value.sourceEpoch, plan.sourceEpoch); assert.equal(value.browserName, 'chromium'); assert.equal(value.browserVersion, '156.0.8078.4'); for (const key of ['heldRoutesFinished', 'requestsDrained', 'screenshotSaved', 'contextClosed', 'hostClosed', 'dataRemoved']) assert.equal(value.cleanup[key], true, key); const filename = 'browser/screenshots/search-' + value.testId + '.png'; const image = read(evidence, filename, 8 * 1024 * 1024); assert(image.length > 32 && image.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))); screenshots.push({ path: filename, ...id(image) }); }
  const anyKinds = new Map([
    ['ANY first modifier chooses real HTTP union or conjunction and publishes exact visible rows', 'actual-any-first-modifier-and-literal-value-policy'],
    ['ANY negative tags restrict only their tagged-note complement and retain independent alternatives', 'actual-any-tag-complement-universe-discrimination'],
    ['ANY type and completion alternatives union only matching active note IDs', 'actual-any-type-completion-union-versus-conjunction'],
    ['ANY notebook restrictions and empty alternatives enforce the explicit replacement policy', 'actual-any-explicit-replacement-notebook-empty-policy'],
    ['ANY alternatives cannot escape independent notebook tag type or trash selectors', 'actual-any-independent-existing-selectors'],
    ['ANY search preserves all dirty fields and native recovery copies without implicit Save', 'actual-any-native-IndexedDB-raw-unsaved-copy-and-reload'],
    ['Newer conjunction results and dirty fields survive an older unchanged actual ANY response', 'actual-any-older-response-suppressed-after-newer-conjunction'],
    ['ANY cannot bypass genuine unsupported or malformed400 and valid search recovers the dirty editor', 'actual-any400-bound-to-visible-error'],
  ]);
  assert.deepEqual(plan.browserCases.filter(row => row.role === 'new-any-search').map(row => row.title).sort(), [...anyKinds.keys()].sort());
  const anyRows = caseRows('rea-notes-any-real-browser-case/v1', [...anyKinds.keys()], 'runAttempt');
  assert.equal(anyRows.length, 8);
  assert.deepEqual(objects.filter(row => row.name.startsWith('any-case-')).map(row => row.name).sort(), anyRows.map(row => row.name).sort());
  const anyScreenshots = [], anyCaseBindings = [];
  const expected400Queries = ['any:1 resource:image/*', 'any:1 -type:todo', 'any:1 iscompleted:true'];
  function observedPin(value, cap = 8 * 1024 * 1024) { assert(value && Number.isSafeInteger(value.bytes) && value.bytes > 0 && value.bytes <= cap); assert(/^[0-9a-f]{64}$/.test(value.sha256)); return { bytes: value.bytes, sha256: value.sha256 }; }
  for (const { name, value } of anyRows) {
    assert(/^[A-Za-z0-9_-]{1,200}$/.test(value.testId)); assert.equal(name, 'any-case-' + value.testId + '.json');
    assert.equal(value.sourceEpoch, plan.sourceEpoch); assert.equal(value.browserName, 'chromium'); assert.equal(value.browserVersion, '156.0.8078.4');
    assert.equal(value.pendingOwnedRequests, 0); assert.equal(value.NotesUISaveRequests, 0);
    assert.equal(value.originalProductExecutions, 0); assert.equal(value.handlerResponsesRewritten, false); assert.equal(value.fullParity, false); assert.equal(value.superiority, false);
    assert.equal(value.installedANYAcceptancePreclaimed, false); assert.equal(value.originalNotebookCompatibilityClaimed, false);
    for (const key of ['heldRoutesFinished', 'requestsDrained', 'screenshotSaved', 'contextClosed', 'hostClosed', 'dataRemoved']) assert.equal(value.cleanup[key], true, key);
    assert(Array.isArray(value.requests) && value.requests.length > 0 && value.requests.length <= 500);
    assert.equal(value.requests.filter(row => row.path === '/api/notes/save').length, 0);
    assert(value.requests.some(row => row.path === '/api/notes/list' && row.method === 'POST'));
    assert(Array.isArray(value.responses) && value.responses.length > 0 && value.responses.length <= 500);
    for (const response of value.responses) { assert(typeof response.path === 'string' && response.path.startsWith('/api/notes/')); assert([200, 400].includes(response.status)); observedPin(response.body, 1024 * 1024); }
    assert(Array.isArray(value.fixtureRequests)); assert.equal(value.fixtureRequests.length, 12); assert(value.fixtureRequests.every(row => row.status === 200));
    const fixtureCounts = { 'notebook-create': 3, save: 6, 'todo-completed': 1, delete: 1, 'draft-recovery-scope': 1 };
    assert.deepEqual([...new Set(value.fixtureRequests.map(row => row.action))].sort(), Object.keys(fixtureCounts).sort());
    for (const [action, count] of Object.entries(fixtureCounts)) assert.equal(value.fixtureRequests.filter(row => row.action === action).length, count);
    assert(Array.isArray(value.observations));
    const seeds = value.observations.filter(row => row.kind === 'actual-any-owned-synthetic-seed'); assert.equal(seeds.length, 1); const seed = seeds[0];
    assert.equal(seed.fixtureSetupOnly, true); assert.deepEqual(seed.untaggedInputTags, []); assert.equal(seed.untaggedId, seed.ids.untagged);
    const noteIds = ['plan', 'archived', 'task', 'complete', 'trash', 'untagged'].map(key => seed.ids[key]);
    assert(noteIds.every(value => typeof value === 'string' && value.length > 0)); assert.equal(new Set(noteIds).size, 6);
    const kind = anyKinds.get(value.title), primary = value.observations.filter(row => row.kind === kind);
    const is400 = kind === 'actual-any400-bound-to-visible-error'; assert.equal(primary.length, is400 ? 3 : 1);
    if (kind === 'actual-any-first-modifier-and-literal-value-policy') { assert.equal(primary[0].firstModifierWins, true); assert.equal(primary[0].exactUnquotedOneUsesUnion, true); assert.equal(primary[0].negatedModifierFlagIgnored, true); }
    if (kind === 'actual-any-tag-complement-universe-discrimination') { assert.equal(primary[0].physicallyUntaggedNote, seed.ids.untagged); assert.equal(primary[0].tagUniverseDoesNotRestrictIndependentTitleAlternative, true); }
    if (kind === 'actual-any-type-completion-union-versus-conjunction') assert.equal(primary[0].trashedNoteExcluded, seed.ids.trash);
    if (kind === 'actual-any-explicit-replacement-notebook-empty-policy') { const row = primary[0]; assert.equal(row.notebookConditionsRemainIndependent, true); assert.equal(row.ordinaryClausesAbsentWithAny1AndNoNotebookReturnsEmpty, true); assert.equal(row.notebookOnlyUsesSelectedScope, true); assert.equal(row.originalNotebookLaneAMissingFTSOutcomes, 8); assert.deepEqual(row.originalPlainMirrorDifferencesRemainDiagnostics, ['002', '003', '007', '008']); assert.equal(row.originalGUIOrFTSParityClaimed, false); }
    if (kind === 'actual-any-independent-existing-selectors') assert.equal(primary[0].notebookTagTypeAndTrashRestrictedActualRows, true);
    if (kind === 'actual-any-native-IndexedDB-raw-unsaved-copy-and-reload') { const row = primary[0]; assert.equal(row.explicitSeparateCopyConsentStillRequired, true); assert.equal(row.sourceStateUnchanged, true); assert(row.copyBefore && typeof row.copyBefore.body === 'string' && typeof row.copyBefore.title === 'string'); assert.equal(row.copyBefore.isTodo, true); assert.equal(row.copyBefore.sourceNoteId, null); assert.equal(row.copyBefore.sourceRevision, 0); assert.equal(row.copyBefore.pendingSave, false); }
    if (kind === 'actual-any-older-response-suppressed-after-newer-conjunction') {
      const row = primary[0], held = value.observations.filter(item => item.kind === 'unchanged-actual-list-response-held-after-route-fetch'); assert.equal(held.length, 1);
      assert.equal(held[0].status, 200); assert.equal(held[0].handlerMocked, false); assert.equal(held[0].responseRewritten, false); assert.equal(held[0].input.search, 'any:1 title:Release body:archived'); assert.equal(held[0].input.searchMode, 'filters');
      assert.deepEqual(observedPin(row.oldActualBody, 1024 * 1024), observedPin(held[0].body, 1024 * 1024)); assert.deepEqual(row.oldIds, held[0].ids);
      assert.deepEqual(row.oldIds, [seed.ids.plan, seed.ids.archived, seed.ids.complete].sort()); assert.deepEqual(row.latestIds, []); assert.notDeepEqual(row.oldIds, row.latestIds);
      assert.equal(row.handlerMocked, false); assert.equal(row.responseRewritten, false); assert.equal(row.dirtyFieldsRetained, true);
    }
    assert(Array.isArray(value.expectedHttpFailures)); const expectedQueries = is400 ? expected400Queries : [];
    assert.deepEqual(value.expectedHttpFailures.map(row => row.query).sort(), [...expectedQueries].sort());
    assert.equal(value.responses.filter(row => row.status === 400).length, expectedQueries.length);
    for (const expected of value.expectedHttpFailures) {
      assert.equal(expected.path, '/api/notes/list'); assert.equal(expected.status, 400); assert.equal(expected.observed, true); assert(typeof expected.error === 'string' && expected.error.length > 0);
      const responses = value.responses.filter(row => row.path === expected.path && row.status === 400 && row.input?.search === expected.query && row.input?.searchMode === 'filters'); assert.equal(responses.length, 1);
      const visible = primary.filter(row => row.query === expected.query); assert.equal(visible.length, 1); assert.equal(visible[0].status, 400); assert.equal(visible[0].error, expected.error); assert.deepEqual(observedPin(visible[0].body, 1024 * 1024), observedPin(responses[0].body, 1024 * 1024));
    }
    observedPin(value.finalDisk);
    const filename = 'browser/screenshots/any-' + value.testId + '.png'; assert.equal(value.screenshot, filename.slice('browser/'.length));
    const image = read(evidence, filename, 8 * 1024 * 1024); assert(image.length > 32 && image.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))); const screenshot = { path: filename, ...id(image) }; anyScreenshots.push(screenshot); screenshots.push(screenshot);
    anyCaseBindings.push({ title: value.title, runtimeTestId: value.testId, sourceCaseId: actual.find(row => row.title === value.title).sourceCaseId, path: 'browser/' + name, ...id(objects.find(row => row.name === name).bytes), expected400Responses: expectedQueries.length, actualHTTP: true, actualBrowser: true, pendingOwnedRequests: 0, NotesUISaveRequests: 0, cleanupAllTrue: true, handlersRewritten: false, originalNotebookCompatibilityClaimed: false, screenshot });
  }
  const legacy = caseRows('rea-notes-search-retained-new-todo-browser-case/v1', plan.browserCases.filter(row => row.role === 'retained-new-todo').map(row => row.title), 'runAttempt');
  for (const { name, value } of legacy) { assert.equal(name, 'case-' + value.testId + '.json'); assert.equal(value.sourceEpoch, plan.sourceEpoch); assert.equal(value.priorRuntimeAcceptanceReused, false); for (const key of ['drained', 'contextClosed', 'serverClosed', 'heldRoutesFinished']) assert.equal(value.teardown[key], true); assert.equal(value.teardown.activeOwnedIOFault, false); }
  const nativeTarCases = legacy.flatMap(row => (row.value.observations ?? []).filter(value => value.kind === 'new-task-actual-jex-native-tar-and-resource-download').map(value => ({ title: row.value.title, testId: row.value.testId, value })));
  assert.equal(nativeTarCases.length, 1); assert.deepEqual(pin(nativeTarCases[0].value.independentNativeTar.executable), nativeTarIdentity);
  const nativeTarBinding = { actualRetainedCaseTitle: nativeTarCases[0].title, actualRetainedCaseTestId: nativeTarCases[0].testId, observedExecutable: pin(nativeTarCases[0].value.independentNativeTar.executable), actualCaseObservationComparedToPreflightIdentity: true };
  const legacyWorkers = objects.filter(row => row.value.schema === 'rea-notes-search-retained-new-todo-browser-worker/v1'); assert.equal(legacyWorkers.length, 1);
  const worker = legacyWorkers[0].value; assert.equal(worker.sourceCommit, process.env.GITHUB_SHA); assert.equal(worker.sourceEpoch, plan.sourceEpoch); assert.equal(worker.priorRuntimeAcceptanceReused, false); assert.equal(worker.observation.browser, 'chromium'); assert.equal(worker.observation.version, '156.0.8078.4'); assert.equal(worker.observation.realBrowserFixtureCreated, true);
  const legacyObservations = objects.filter(row => row.value.schema === 'rea-cloud-real-browser-observation/v1'); assert.equal(legacyObservations.length, 1); assert.equal(legacyObservations[0].name, 'browser-observation.json'); assert.deepEqual(legacyObservations[0].value, worker.observation);
  for (const key of ['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY', 'GITHUB_JOB']) assert.equal(worker.execution[key], process.env[key]);
  assert.deepEqual(worker.sourcePins.map(row => ({ path: 'products/rea-studio/' + row.path, bytes: row.bytes, sha256: row.sha256 })).sort((a, b) => a.path.localeCompare(b.path)), plan.installedNotesSources.map(row => ({ path: row.path, ...pin(row) })).sort((a, b) => a.path.localeCompare(b.path)));
  const drafts = caseRows('rea-notes-draft-recovery-real-browser-case/v1', plan.browserCases.filter(row => row.role === 'retained-recovery').map(row => row.title), 'attempt');
  for (const { value } of drafts) for (const key of ['contextClosed', 'hostClosed', 'dataRemoved', 'heldRoutesFinished']) assert.equal(value.cleanup[key], true);
  const storage = plan.storageObservationFiles.map(name => { const row = objects.find(item => item.name === name); assert(row, name); return { path: 'browser/' + name, ...id(row.bytes), sameAttemptBinding: 'Fresh owned evidence directory created in this job before the exact36-case child; original raw storage JSON has no invented internal attempt fields' }; });
  assert.equal(storage.length, 8);
  const storageCases = plan.browserCases.filter(row => row.role === 'retained-native-storage'); assert.equal(storageCases.length, 8);
  const storageCleanup = objects.filter(row => row.value.schema === 'rea-notes-storage-host-cleanup/v1'); assert.equal(storageCleanup.length, 8);
  assert.deepEqual(storageCleanup.map(row => row.value.title).sort(), storageCases.map(row => row.title).sort());
  for (const { name, value } of storageCleanup) {
    const runtime = actual.find(row => row.title === value.title); assert(runtime); assert.equal(value.testId, runtime.runtimeTestId);
    assert.equal(name, 'storage-host-cleanup-' + value.testId.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json');
    assert.equal(value.sourceCommit, process.env.GITHUB_SHA); assert.equal(value.runId, process.env.GITHUB_RUN_ID); assert.equal(value.attempt, process.env.GITHUB_RUN_ATTEMPT);
    assert.equal(value.retry, 0); assert.equal(value.statusAtFixtureClose, 'passed'); assert.deepEqual(value.errors, []);
    assert.equal(value.ownership, 'Only this Playwright test context and its separately started host.'); assert.deepEqual(value.order, ['close-owned-context', 'close-owned-host']); assert.equal(value.stageDeadlineMs, 7000);
    assert.equal(value.cleanup.contextClosed, true); assert.equal(value.cleanup.hostClosed, true); assert.equal(value.productBehaviorAssertionsChanged, false); assert.equal(value.fullParity, false); assert.equal(value.superiority, false);
    assert.equal(value.stages.length, 2); assert.deepEqual(value.stages.map(row => row.stage), value.order);
    for (const stage of value.stages) { assert.equal(stage.completed, true); assert(Number.isFinite(stage.elapsedMs) && stage.elapsedMs >= 0); }
  }
  const accountedJSON = ['playwright-results.json', ...plan.storageObservationFiles, ...[...newRows, ...anyRows, ...legacy, ...drafts, ...legacyWorkers, ...legacyObservations, ...storageCleanup].map(row => row.name)];
  assert.equal(new Set(accountedJSON).size, accountedJSON.length); assert.deepEqual(objects.map(row => row.name).sort(), accountedJSON.sort());
  assert.equal(new Set(actual.map(row => row.runtimeTestId)).size, 36);
  return { path: 'browser/playwright-results.json', ...id(bytes), cases: actual, expected: 36, unexpected: 0, flaky: 0, skipped: 0, retry: 0, workers: workers.size, screenshots, nativeTarBinding, newSearchCases: newRows.length, newANYSearchCases: anyRows.length, anyCaseBindings, anyScreenshots, retainedNewTodoCases: legacy.length, retainedRecoveryCases: drafts.length, retainedNativeStorageCases: storage, retainedNativeStorageCleanupCases: storageCleanup.map(row => ({ path: 'browser/' + row.name, ...id(row.bytes), title: row.value.title, runtimeTestId: row.value.testId, contextClosed: true, hostClosed: true })), observationFiles: [...newRows, ...anyRows, ...legacy, ...drafts, ...legacyWorkers, ...legacyObservations, ...storageCleanup].map(row => ({ path: 'browser/' + row.name, ...id(row.bytes) })), realBrowser: true, syntheticDOMRebranded: false, originalApplicationExecuted: false, performanceMeasured: false };
}
let record = { schema: 'rea-notes46-installed-any-wire-study-' + phase + '/v1', execution: execution(), role, sourceCommit: process.env.GITHUB_SHA, baselineCommit: BASELINE, sourcePlan: id(planBytes), status: 'failed', sourceOverlay: false, canonicalFeatureBranchCommittedSource: true, actualProductPathsCommitted: true, appSourceWritesByCollector: 0, productionInstallation: false, historicalReceiptsRebound: false, originalFullApplicationExecutions: 0, browserExecutions: 0, fullParity: false, superiority: false };
try {
  if (phase === 'before') {
    assert(!fs.existsSync(path.join(root, legacyObservation)), 'Fresh owned runner must have no legacy output');
    const current = capture('before'); const qualifiedReference = await acquireQualifiedANYReference();
    const historicalBefore = parentBeforeImages(), canonicalBefore = canonicalANYBeforeImages(); fixtureBeforeImages();
    record = { ...record, status: 'installed-any-wire-source-verified', current, historicalBefore, canonicalBefore, qualifiedReference: { path: 'source-reference/acquisition.json', ...id(read(evidence, 'source-reference/acquisition.json', 1024 * 1024)), sourceEquivalenceOnly: true }, productOrOriginalExecutions: 0 };
  } else if (phase === 'ready') {
    const before = JSON.parse(read(evidence, 'before.json')); sameAttempt(before); assert.equal(before.status, 'installed-any-wire-source-verified'); assert.equal(before.sourceOverlay, false);
    const current = capture('ready'); assert.deepEqual(current.rows, before.current.rows); qualifiedANYReference();
    let acquisition = null, toolSourceBefore = null;
    if (role === 'browser') { acquisition = toolingAcquisition(); toolSourceBefore = toolSources('before'); }
    record = { ...record, status: 'ready-installed-any-wire-unexecuted', beforeReceipt: id(read(evidence, 'before.json')), current, acquisition, toolSourceBefore: toolSourceBefore ? id(read(evidence, 'tool-source-before.json', 8 * 1024 * 1024)) : null, productOrOriginalExecutions: 0 };
  } else if (phase === 'values') {
    assert.equal(role, 'values');
    assert.equal(process.env.GITHUB_JOB, 'notes46-observed-values');
    assert.equal(plan.sourceEpoch, 'notes46-installed-any-wire-v1');
    assert.equal(plan.valueTest.path, PREFIX + '/tests/search-original-observations.test.mjs');
    assert.equal(plan.valueTest.role, 'actual-observed-original-parser-and-SQL-values');
    assert.equal(plan.valueTest.minimumResults, 82); assert.equal(plan.valueTest.exactResults, 82);
    assert.deepEqual(plan.valueTest.requiredTopTitles, [
      '48 bounded query/error results equal the exact standalone original filter parser',
      '32 metadata-only predicates equal original query-builder SQL on synthetic SQLite',
    ]);
    assert.equal(plan.originalComparisonQueries.parser.length, 48);
    assert.equal(plan.originalComparisonQueries['metadata-sql'].length, 32);
    assert.deepEqual(plan.originalComparisonFixtureIds, ['n1', 'n2', 'n3', 'n4', 'n5', 'n6']);
    const { current } = readiness(); record.tests = [];
    const result = await run(plan.valueTest, 0); record.tests.push(result); record.observedTAP = result.observedTAP;
    let observed = null, observationError = null;
    try { observed = valueObservations(); } catch (error) { observationError = { name: error.name, message: error.message }; }
    const after = capture('value-source-reauthentication', false); assert.deepEqual(after.rows, current.rows);
    record = { ...record, readyReceipt: id(read(evidence, 'ready.json')), status: result.status === 'passed' && observed !== null ? 'passed' : 'failed', observed, observationError, actualCompatibilityCases: observed?.actualComparisonRecords ?? null, sourceEpoch: plan.sourceEpoch, originalValuesRole: 'retained48-parser-plus32-metadata-sql', originalANY59OverlayStudyExecuted: false, rawLogsComplete: result.rawLogsComplete, originalFullApplicationExecutions: 0, realBrowserExecutions: 0, performanceMeasured: false };
    if (record.status !== 'passed') process.exitCode = 1;
  } else if (phase === 'browser') {
    const { current } = readiness(), acquisition = toolingAcquisition();
    const beforeTools = JSON.parse(read(evidence, 'tool-source-before.json', 8 * 1024 * 1024)); sameAttempt(beforeTools); toolSources('prebrowser', beforeTools);
    assert.deepEqual(await executableIdentity(acquisition.image.executable), pin(acquisition.image));
    const systemRoot = process.env.SystemRoot; assert(typeof systemRoot === 'string' && path.isAbsolute(systemRoot));
    const nativeTarPath = path.join(systemRoot, 'System32', 'tar.exe'); const nativeTarIdentity = await executableIdentity(nativeTarPath);
    const tar = spawnSync(nativeTarPath, ['--version'], { cwd: root, shell: false, windowsHide: true, timeout: 30000, maxBuffer: 64 * 1024, env: childEnvironment({}) });
    write('native-tar-stdout.txt', tar.stdout ?? Buffer.alloc(0)); write('native-tar-stderr.txt', tar.stderr ?? Buffer.alloc(0));
    record.nativeTar = { executable: nativeTarPath, ...nativeTarIdentity, status: tar.status, signal: tar.signal, error: tar.error ? { name: tar.error.name, message: tar.error.message } : null, stdout: id(tar.stdout ?? Buffer.alloc(0)), stderr: id(tar.stderr ?? Buffer.alloc(0)), fallbackAllowed: false, digestKind: 'Observed hosted System32 native tar identity; OS binary contents are external to source snapshots.' };
    assert.equal(tar.error, undefined); assert.equal(tar.status, 0); assert.equal(tar.signal, null);
    const child = await runBrowser(); record.browserChild = child;
    let qualified = null, qualificationError = null;
    try { qualified = browserResults(nativeTarIdentity); } catch (error) { qualificationError = { name: error.name, message: error.message }; }
    const after = capture('browser-source-reauthentication', false); assert.deepEqual(after.rows, current.rows);
    record = { ...record, readyReceipt: id(read(evidence, 'ready.json')), status: child.code === 0 && child.signal === null && child.closeObserved === true && child.rawLogsComplete === true && child.failure === null && !child.overflow && !child.timedOut && child.cleanup.ownedDataRemoved && qualified !== null ? 'passed' : 'failed', acquisition, result: qualified, qualificationError, browserExecutions: 1, plannedBrowserCases: 36, rawLogsComplete: child.rawLogsComplete, originalFullApplicationExecutions: 0, originalSearchValueComparisonsPerformedByBrowserJob: 0, performanceMeasured: false };
    if (record.status !== 'passed') process.exitCode = 1;
  } else {
    const after = capture('postrun'); const { receipt } = readiness(); assert.deepEqual(after.rows, receipt.current.rows); qualifiedANYReference();
    let afterTools = null, acquisition = null;
    if (role === 'browser') { acquisition = toolingAcquisition(); const beforeTools = JSON.parse(read(evidence, 'tool-source-before.json', 8 * 1024 * 1024)); sameAttempt(beforeTools); afterTools = toolSources('postrun', beforeTools); assert.deepEqual(await executableIdentity(acquisition.image.executable), pin(acquisition.image)); }
    record = { ...record, status: 'source-verified', readyReceipt: id(read(evidence, 'ready.json')), after, sourceStable: true, afterTools, acquisition, productOrOriginalExecutions: 0 };
  }
} catch (error) { record.failure = { name: error.name, message: error.message, stack: String(error.stack).slice(0, 16000) }; process.exitCode = 1; }
json(phase + '.json', record);
console.log(JSON.stringify({ phase, status: record.status, sourceCommit: record.sourceCommit, sourceOverlay: false, actualProductPathsCommitted: true, fullParity: false, superiority: false }));
