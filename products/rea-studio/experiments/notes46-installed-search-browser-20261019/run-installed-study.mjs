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
const PLAN = { path: PREFIX + '/SOURCE-PLAN.json', bytes: 85371, sha256: 'a87232b6dc53d8a418490c2ea32b4dddbbdaa3d68bf7667308c8ac16ca874574' };
const BASELINE = '2a8482b42784eb262d6d5b82e62d8d1220dc4821';
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
function git(args) { const value = spawnSync('git', args, { cwd: root, shell: false, windowsHide: true, timeout: 30000, maxBuffer: 32 * 1024 * 1024 }); assert.equal(value.error, undefined); assert.equal(value.status, 0, value.stderr?.toString()); return value.stdout; }
function tree(revision) { const rows = new Map(); for (const text of git(['ls-tree', '-r', '-z', '--full-tree', revision]).toString().split('\0').filter(Boolean)) { const match = /^(\d{6}) (blob|commit) ([0-9a-f]{40})\t(.+)$/.exec(text); assert(match); assert(!rows.has(match[4])); rows.set(match[4], { mode: match[1], kind: match[2], gitBlob: match[3] }); } return rows; }
function gitStatus() { return git(['status', '--porcelain=v1', '-z', '--untracked-files=all']).toString().split('\0').filter(Boolean).map(row => ({ status: row.slice(0, 2), path: row.slice(3) })).sort((a, b) => a.path.localeCompare(b.path)); }
function noteNames(directory, depth = 0) { assert(depth <= sourceLimits.depth); noLinks(directory); const names = []; for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { if (entry.name === 'results') continue; assert(!entry.isSymbolicLink()); const full = path.join(directory, entry.name); if (entry.isDirectory()) names.push(...noteNames(full, depth + 1)); else { assert(entry.isFile()); names.push(path.relative(root, full).replaceAll('\\', '/')); } } return names.sort(); }
function hosted() {
  assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
  for (const [key, value] of Object.entries({ CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', RUNNER_OS: 'Windows', RUNNER_ARCH: 'X64', GITHUB_REPOSITORY: 'Ginderlax/rea-research-lab', GITHUB_SERVER_URL: 'https://github.com', GITHUB_REF: BRANCH, GITHUB_EVENT_NAME: 'push' })) assert.equal(process.env[key], value, key);
  assert(['draft-recovery-real-chromium', 'notes46-observed-values'].includes(process.env.GITHUB_JOB));
  for (const key of ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) assert(/^[1-9][0-9]*$/.test(process.env[key]));
  assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA)); assert.equal(git(['rev-parse', 'HEAD']).toString().trim(), process.env.GITHUB_SHA);
  assert.deepEqual(git(['rev-list', '--parents', '-n', '1', 'HEAD']).toString().trim().split(' '), [process.env.GITHUB_SHA, 'ab26bf14bc1a55a723566bbafb3ca391c3ef671c']);
  assert.deepEqual(git(['rev-list', '--parents', '-n', '1', 'ab26bf14bc1a55a723566bbafb3ca391c3ef671c']).toString().trim().split(' '), ['ab26bf14bc1a55a723566bbafb3ca391c3ef671c', 'cee2da08f7ebe81a003a6cc9828655794be48cb0']);
  assert.deepEqual(git(['rev-list', '--parents', '-n', '1', 'cee2da08f7ebe81a003a6cc9828655794be48cb0']).toString().trim().split(' '), ['cee2da08f7ebe81a003a6cc9828655794be48cb0', '40c7df91936aaf9574801aa38c5a635f299e6e39']);
  assert.deepEqual(git(['rev-list', '--parents', '-n', '1', '40c7df91936aaf9574801aa38c5a635f299e6e39']).toString().trim().split(' '), ['40c7df91936aaf9574801aa38c5a635f299e6e39', BASELINE]);
  assert.equal(git(['rev-parse', '--show-object-format']).toString().trim(), 'sha1');
  assert.equal(path.resolve(fileURLToPath(import.meta.url)).toLowerCase(), path.join(root, SELF).toLowerCase()); noLinks(root);
}
hosted();
const args = process.argv.slice(2); assert.equal(args.length, 6); assert.equal(args[0], '--phase'); assert(['before', 'ready', 'browser', 'values', 'postcheck'].includes(args[1])); assert.equal(args[2], '--role'); assert(['browser', 'values'].includes(args[3])); assert.equal(args[4], '--evidence');
const phase = args[1], role = args[3]; if (['browser', 'values'].includes(phase)) assert.equal(phase, role); assert.equal(process.env.GITHUB_JOB, role === 'browser' ? 'draft-recovery-real-chromium' : 'notes46-observed-values'); assert(path.isAbsolute(args[5]));
const temporary = fs.realpathSync(process.env.RUNNER_TEMP); const evidence = fs.realpathSync(args[5]); noLinks(evidence);
assert(within(temporary, evidence) && !within(root, evidence));
const currentTree = tree('HEAD'), baseTree = tree(BASELINE);
function committed(name, bytes) { const row = currentTree.get(name); assert(row && row.mode === '100644' && row.kind === 'blob'); assert.equal(blob(bytes), row.gitBlob, 'Committed byte identity: ' + name); return row; }
const planBytes = read(root, PLAN.path); assert.deepEqual(id(planBytes), pin(PLAN)); committed(PLAN.path, planBytes);
const plan = JSON.parse(planBytes);
const currentRosterPath = 'products/rea-studio/browser-tests/notes-structured-search-roster.json';
const currentPackagedRoster = plan.packagedFiles.filter(row => row.path === currentRosterPath);
assert.equal(currentPackagedRoster.length, 1, 'Exactly one current packaged browser roster is required');
assert.deepEqual(plan.browserRoster, { path: currentPackagedRoster[0].path, bytes: currentPackagedRoster[0].bytes, sha256: currentPackagedRoster[0].sha256 }, 'Descriptive browserRoster must match the unique authenticated packaged roster');
assert.equal(plan.schema, 'rea-notes46-installed-search-browser-source-plan/v1'); assert.equal(plan.baselineCommit, BASELINE); assert.equal(plan.branch, BRANCH); assert.equal(plan.sourceEpoch, 'notes46-installed-structured-search-v1'); assert.equal(plan.installedNotesSources.length, 46); assert.equal(plan.historicalBeforeNotesSources.length, 41);
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
  const definitions = [...plan.installedNotesSources, ...plan.studySources, ...plan.baselineDependencies, ...plan.browserBaselineSources.map(row => row.path === fixtureTransition.path ? { path: row.path, ...fixtureTransition.after } : row), ...plan.packagedFiles];
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
    check(name, () => { const metadata = committed(name, bytes); const changed = transitions.find(item => item.path === name); if (changed) assert.deepEqual(id(bytes), pin(changed.after)); else if (name === fixtureTransition.path) { assert.deepEqual(id(bytes), pin(fixtureTransition.after)); assert.equal(baseTree.get(name)?.gitBlob, fixtureTransition.before.gitBlob); } else if (!packageNames.includes(name)) { assert(baseTree.has(name)); assert.deepEqual(metadata, baseTree.get(name)); } if (row.gitBlob) assert.equal(blob(bytes), row.gitBlob); });
    rows.push({ path: name, ...id(bytes), gitBlob: blob(bytes), intendedEpoch: transitions.some(row => row.path === name) ? 'committed-qualified-product-target' : name === fixtureTransition.path ? 'committed-reviewed-fixture-lifecycle-repair' : packageNames.includes(name) ? 'committed-installed-study-support' : 'unchanged-parent-input' });
  }
  check('Exact selected source count', () => assert.equal(rows.length, plan.captureCount));
  const result = { schema: 'rea-notes46-installed-source-capture/v1', execution: execution(), role, phase: kind, sourceCommit: process.env.GITHUB_SHA, baselineCommit: BASELINE, sourcePlan: id(planBytes), installedCommittedSource: true, sourceOverlay: false, actualProductPathsCommitted: true, appSourceWritesByCollector: 0, productionInstallation: false, historicalReceiptsRebound: false, files: rows.length, rawBytes: total, limits: sourceLimits, actualNotes, actualStatus, rows, contentsPreserved: save, sourceAuthenticated: authenticationErrors.length === 0, authenticationErrors };
  if (save) json('source-' + kind + '.json', result);
  assert.equal(authenticationErrors.length, 0, 'Source authentication failed; bounded observed bytes and errors were preserved when requested'); return result;
}
function sameAttempt(receipt) { assert.deepEqual(receipt.execution, execution()); assert.equal(receipt.sourceCommit, process.env.GITHUB_SHA); assert.deepEqual(receipt.sourcePlan, id(planBytes)); assert.equal(receipt.role, role); }
function readiness() { const receipt = JSON.parse(read(evidence, 'ready.json')); sameAttempt(receipt); assert.equal(receipt.status, 'ready-installed-unexecuted'); assert.equal(receipt.sourceOverlay, false); assert.equal(receipt.actualProductPathsCommitted, true); const current = capture('reauthentication', false); assert.deepEqual(current.rows, receipt.current.rows); return { receipt, current }; }
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
  const bytes = read(evidence, 'browser/playwright-results.json', 8 * 1024 * 1024), report = JSON.parse(bytes), specs = [];
  function visit(suite) { for (const spec of suite.specs ?? []) specs.push(spec); for (const child of suite.suites ?? []) visit(child); }
  for (const suite of report.suites ?? []) visit(suite);
  assert.equal(report.errors?.length ?? 0, 0); assert.equal(specs.length, 28);
  assert.equal(report.stats.expected, 28); assert.equal(report.stats.unexpected + report.stats.flaky + report.stats.skipped, 0);
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
  for (const { name, value } of newRows) { assert.equal(name, 'search-case-' + value.testId + '.json'); assert.equal(value.sourceEpoch, 'notes46-installed-structured-search-v1'); assert.equal(value.browserName, 'chromium'); assert.equal(value.browserVersion, '156.0.8078.4'); for (const key of ['heldRoutesFinished', 'requestsDrained', 'screenshotSaved', 'contextClosed', 'hostClosed', 'dataRemoved']) assert.equal(value.cleanup[key], true, key); const filename = 'browser/screenshots/search-' + value.testId + '.png'; const image = read(evidence, filename, 8 * 1024 * 1024); assert(image.length > 32 && image.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))); screenshots.push({ path: filename, ...id(image) }); }
  const legacy = caseRows('rea-notes-search-retained-new-todo-browser-case/v1', plan.browserCases.filter(row => row.role === 'retained-new-todo').map(row => row.title), 'runAttempt');
  for (const { name, value } of legacy) { assert.equal(name, 'case-' + value.testId + '.json'); assert.equal(value.sourceEpoch, 'notes46-installed-structured-search-v1'); assert.equal(value.priorRuntimeAcceptanceReused, false); for (const key of ['drained', 'contextClosed', 'serverClosed', 'heldRoutesFinished']) assert.equal(value.teardown[key], true); assert.equal(value.teardown.activeOwnedIOFault, false); }
  const nativeTarCases = legacy.flatMap(row => (row.value.observations ?? []).filter(value => value.kind === 'new-task-actual-jex-native-tar-and-resource-download').map(value => ({ title: row.value.title, testId: row.value.testId, value })));
  assert.equal(nativeTarCases.length, 1); assert.deepEqual(pin(nativeTarCases[0].value.independentNativeTar.executable), nativeTarIdentity);
  const nativeTarBinding = { actualRetainedCaseTitle: nativeTarCases[0].title, actualRetainedCaseTestId: nativeTarCases[0].testId, observedExecutable: pin(nativeTarCases[0].value.independentNativeTar.executable), actualCaseObservationComparedToPreflightIdentity: true };
  const legacyWorkers = objects.filter(row => row.value.schema === 'rea-notes-search-retained-new-todo-browser-worker/v1'); assert.equal(legacyWorkers.length, 1);
  const worker = legacyWorkers[0].value; assert.equal(worker.sourceCommit, process.env.GITHUB_SHA); assert.equal(worker.sourceEpoch, 'notes46-installed-structured-search-v1'); assert.equal(worker.priorRuntimeAcceptanceReused, false); assert.equal(worker.observation.browser, 'chromium'); assert.equal(worker.observation.version, '156.0.8078.4'); assert.equal(worker.observation.realBrowserFixtureCreated, true);
  for (const key of ['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY', 'GITHUB_JOB']) assert.equal(worker.execution[key], process.env[key]);
  assert.deepEqual(worker.sourcePins.map(row => ({ path: 'products/rea-studio/' + row.path, bytes: row.bytes, sha256: row.sha256 })).sort((a, b) => a.path.localeCompare(b.path)), plan.installedNotesSources.map(row => ({ path: row.path, ...pin(row) })).sort((a, b) => a.path.localeCompare(b.path)));
  const drafts = caseRows('rea-notes-draft-recovery-real-browser-case/v1', plan.browserCases.filter(row => row.role === 'retained-recovery').map(row => row.title), 'attempt');
  for (const { value } of drafts) for (const key of ['contextClosed', 'hostClosed', 'dataRemoved', 'heldRoutesFinished']) assert.equal(value.cleanup[key], true);
  const storage = plan.storageObservationFiles.map(name => { const row = objects.find(item => item.name === name); assert(row, name); return { path: 'browser/' + name, ...id(row.bytes), sameAttemptBinding: 'Fresh owned evidence directory created in this job before the exact28-case child; original raw storage JSON has no invented internal attempt fields' }; });
  assert.equal(storage.length, 8);
  return { path: 'browser/playwright-results.json', ...id(bytes), cases: actual, expected: 28, unexpected: 0, flaky: 0, skipped: 0, retry: 0, workers: workers.size, screenshots, nativeTarBinding, newSearchCases: newRows.length, retainedNewTodoCases: legacy.length, retainedRecoveryCases: drafts.length, retainedNativeStorageCases: storage, observationFiles: [...newRows, ...legacy, ...drafts, ...legacyWorkers].map(row => ({ path: 'browser/' + row.name, ...id(row.bytes) })), realBrowser: true, syntheticDOMRebranded: false, originalApplicationExecuted: false, performanceMeasured: false };
}
let record = { schema: 'rea-notes46-installed-search-' + phase + '/v1', execution: execution(), role, sourceCommit: process.env.GITHUB_SHA, baselineCommit: BASELINE, sourcePlan: id(planBytes), status: 'failed', sourceOverlay: false, installedCommittedSource: true, actualProductPathsCommitted: true, appSourceWritesByCollector: 0, productionInstallation: false, historicalReceiptsRebound: false, originalFullApplicationExecutions: 0, browserExecutions: 0, fullParity: false, superiority: false };
try {
  if (phase === 'before') {
    assert(!fs.existsSync(path.join(root, legacyObservation)), 'Fresh owned runner must have no legacy output');
    const current = capture('before'), historicalBefore = parentBeforeImages(); fixtureBeforeImages();
    record = { ...record, status: 'installed-source-verified', current, historicalBefore, productOrOriginalExecutions: 0 };
  } else if (phase === 'ready') {
    const before = JSON.parse(read(evidence, 'before.json')); sameAttempt(before); assert.equal(before.status, 'installed-source-verified'); assert.equal(before.sourceOverlay, false);
    const current = capture('ready'); assert.deepEqual(current.rows, before.current.rows);
    let acquisition = null, toolSourceBefore = null;
    if (role === 'browser') { acquisition = toolingAcquisition(); toolSourceBefore = toolSources('before'); }
    record = { ...record, status: 'ready-installed-unexecuted', beforeReceipt: id(read(evidence, 'before.json')), current, acquisition, toolSourceBefore: toolSourceBefore ? id(read(evidence, 'tool-source-before.json', 8 * 1024 * 1024)) : null, productOrOriginalExecutions: 0 };
  } else if (phase === 'values') {
    const { current } = readiness(); record.tests = [];
    const result = await run(plan.valueTest, 0); record.tests.push(result); record.observedTAP = result.observedTAP;
    let observed = null, observationError = null;
    try { observed = valueObservations(); } catch (error) { observationError = { name: error.name, message: error.message }; }
    const after = capture('value-source-reauthentication', false); assert.deepEqual(after.rows, current.rows);
    record = { ...record, readyReceipt: id(read(evidence, 'ready.json')), status: result.status === 'passed' && observed !== null ? 'passed' : 'failed', observed, observationError, actualCompatibilityCases: observed?.actualComparisonRecords ?? null, rawLogsComplete: result.rawLogsComplete, originalFullApplicationExecutions: 0, realBrowserExecutions: 0, performanceMeasured: false };
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
    record = { ...record, readyReceipt: id(read(evidence, 'ready.json')), status: child.code === 0 && child.signal === null && child.closeObserved === true && child.rawLogsComplete === true && child.failure === null && !child.overflow && !child.timedOut && child.cleanup.ownedDataRemoved && qualified !== null ? 'passed' : 'failed', acquisition, result: qualified, qualificationError, browserExecutions: 1, plannedBrowserCases: 28, rawLogsComplete: child.rawLogsComplete, originalFullApplicationExecutions: 0, originalSearchValueComparisonsPerformedByBrowserJob: 0, performanceMeasured: false };
    if (record.status !== 'passed') process.exitCode = 1;
  } else {
    const after = capture('postrun'); const { receipt } = readiness(); assert.deepEqual(after.rows, receipt.current.rows);
    let afterTools = null, acquisition = null;
    if (role === 'browser') { acquisition = toolingAcquisition(); const beforeTools = JSON.parse(read(evidence, 'tool-source-before.json', 8 * 1024 * 1024)); sameAttempt(beforeTools); afterTools = toolSources('postrun', beforeTools); assert.deepEqual(await executableIdentity(acquisition.image.executable), pin(acquisition.image)); }
    record = { ...record, status: 'source-verified', readyReceipt: id(read(evidence, 'ready.json')), after, sourceStable: true, afterTools, acquisition, productOrOriginalExecutions: 0 };
  }
} catch (error) { record.failure = { name: error.name, message: error.message, stack: String(error.stack).slice(0, 16000) }; process.exitCode = 1; }
json(phase + '.json', record);
console.log(JSON.stringify({ phase, status: record.status, sourceCommit: record.sourceCommit, sourceOverlay: false, actualProductPathsCommitted: true, fullParity: false, superiority: false }));
