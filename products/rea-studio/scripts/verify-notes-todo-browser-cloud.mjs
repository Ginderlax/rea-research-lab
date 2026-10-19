// Closed Notes-only source/record assertions. No browser launch or app mutation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const studio = path.resolve(fileURLToPath(new URL('../', import.meta.url))), repository = path.resolve(studio, '../..');
const BROWSER_BUNDLE = 'products/rea-studio/experiments/notes-todo-browser/bundle.json';
const BROWSER_BUNDLE_PIN = {"bytes":3113,"sha256":"5153f72e1ee05c6974c8da5f274038914e4ab5f1dbeb884b4fe79706f5e25a1c"};
const NOTES_BUNDLE = 'products/rea-studio/experiments/notes-todo/bundle.json';
const NOTES_BUNDLE_PIN = { bytes: 10977, sha256: '6489170855483748eaff4ece03bdbadc29f79ab87cf9a16015dede504891bd62' };
const TARGETS = ['products/rea-studio/apps/notes/server.mjs','products/rea-studio/apps/notes/client.mjs','products/rea-studio/apps/notes/README.md','products/rea-studio/apps/notes/core.mjs','products/rea-studio/apps/notes/todo.test.mjs','products/rea-studio/apps/notes/todo.ui.test.mjs','products/rea-studio/apps/notes/todo.integration.test.mjs','products/rea-studio/apps/notes/todo-original.test.mjs'];
const identity = bytes => ({ bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
const pin = row => ({ bytes: row.bytes, sha256: row.sha256 });
const ordered = rows => [...rows].sort((a, b) => a.path.localeCompare(b.path));
function relative(value) { assert(typeof value === 'string' && value && value.length < 4096 && !/[\\:\x00-\x1f\x7f]/.test(value) && !value.startsWith('/') && value.split('/').every(part => part && part !== '.' && part !== '..')); return value; }
function read(root, name, limit = 8 * 1024 * 1024) { relative(name); let at = root; for (const part of name.split('/')) { at = path.join(at, part); assert(!fs.lstatSync(at).isSymbolicLink()); } const stat = fs.lstatSync(at); assert(stat.isFile() && stat.size <= limit); const bytes = fs.readFileSync(at); assert.equal(bytes.length, stat.size); return bytes; }
function git(args) { const result = spawnSync('git', args, { cwd: repository, windowsHide: true, shell: false, timeout: 30000, maxBuffer: 32 * 1024 * 1024 }); assert.equal(result.error, undefined); assert.equal(result.status, 0); return result.stdout; }
function committed(name, expected) { const bytes = read(repository, name); assert.deepEqual(bytes, git(['show', 'HEAD:' + relative(name)])); if (expected) assert.deepEqual(identity(bytes), expected); return bytes; }
function sameAttempt(value) { const names = ['CI','GITHUB_ACTIONS','RUNNER_ENVIRONMENT','RUNNER_OS','RUNNER_ARCH','GITHUB_SHA','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_REPOSITORY']; for (const name of names) assert.equal(typeof process.env[name], 'string'); assert.deepEqual(value, Object.fromEntries(names.map(name => [name, process.env[name]]))); }
function guard() { assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0'); assert.equal(process.env.CI, 'true'); assert.equal(process.env.GITHUB_ACTIONS, 'true'); assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted'); assert.equal(process.env.GITHUB_REPOSITORY, 'Ginderlax/rea-research-lab'); assert.equal(git(['rev-parse', 'HEAD']).toString('utf8').trim(), process.env.GITHUB_SHA); }
function status() { return ordered(git(['status','--porcelain=v1','-z','--untracked-files=all']).toString('utf8').split('\0').filter(Boolean).map(row => { assert([' M','??'].includes(row.slice(0, 2))); return { path: relative(row.slice(3)), status: row.slice(0, 2) }; })); }
export function verifyNotesBrowserComposition(manifest) {
  guard(); const evidence = fs.realpathSync(process.env.REA_BROWSER_EVIDENCE);
  assert.equal(path.resolve(manifest).toLowerCase(), path.join(evidence, 'notes-todo-composition.json').toLowerCase());
  const browserBundleBytes = committed(BROWSER_BUNDLE, BROWSER_BUNDLE_PIN), browserBundle = JSON.parse(browserBundleBytes);
  assert.equal(browserBundle.schema, 'rea-notes-todo-real-browser-source-bundle/v1'); assert.equal(browserBundle.sourceOnly, true); assert.equal(browserBundle.productionInstalled, false);
  assert.deepEqual(browserBundle.notesSourceBundle, { path: NOTES_BUNDLE, ...NOTES_BUNDLE_PIN });
  const bundle = JSON.parse(committed(NOTES_BUNDLE, NOTES_BUNDLE_PIN)); assert.deepEqual(bundle.transitions.map(row => row.target), TARGETS); assert.equal(bundle.payloads.length, 17);
  assert.equal(bundle.transitions.filter(row => row.before).length, 3); assert.equal(bundle.transitions.filter(row => row.before === null).length, 5);
  committed(browserBundle.workflow.path, pin(browserBundle.workflow)); committed(browserBundle.composer.path, pin(browserBundle.composer));
  for (const row of browserBundle.browserSources) committed(row.path, pin(row));
  assert.deepEqual(browserBundle.browserSources.map(row => row.path), ['products/rea-studio/browser-tests/notes-todo.spec.mjs','products/rea-studio/browser-tests/playwright.notes-todo.config.mjs','products/rea-studio/browser-tests/notes-todo-roster.json']);
  const roster = JSON.parse(committed(browserBundle.browserSources[2].path, pin(browserBundle.browserSources[2]))); assert.deepEqual(roster, browserBundle.scenarios); assert.equal(roster.length, 8); assert.equal(new Set(roster).size, 8);
  const contractBytes = committed(browserBundle.contract.path, pin(browserBundle.contract));
  const compositionBytes = read(evidence, 'notes-todo-composition.json', 2 * 1024 * 1024), value = JSON.parse(compositionBytes);
  assert.equal(value.schema, 'rea-notes-todo-hosted-composition/v1'); assert.equal(value.status, 'composed-unexecuted-notes-todo-overlay'); sameAttempt(value.execution);
  assert.equal(value.sourceCommit, process.env.GITHUB_SHA); assert.equal(value.baselineGitCommit, process.env.GITHUB_SHA); assert.equal(path.resolve(value.sourceRoot).toLowerCase(), fs.realpathSync(repository).toLowerCase()); assert.equal(value.productionInstalled, false); assert.equal(value.historicalReceiptsRebound, false);
  assert.deepEqual(value.sourceBundle, { path: NOTES_BUNDLE, ...NOTES_BUNDLE_PIN }); assert.deepEqual(value.gitStatusBefore, []); assert.deepEqual(value.tests, bundle.tests);
  for (const row of bundle.payloads) committed('products/rea-studio/experiments/notes-todo/' + relative(row.path), pin(row));
  committed(bundle.originalNote.path, pin(bundle.originalNote));
  const transitions = bundle.transitions.map(row => ({ path: row.target, before: row.before === null ? null : pin(row.before), after: pin(row.after), sourcePayload: row.after.sourcePath })); assert.deepEqual(value.transitions, transitions);
  const current = [];
  for (const row of bundle.transitions) {
    const bytes = read(repository, row.target), after = pin(row.after); assert.deepEqual(identity(bytes), after); assert.deepEqual(read(evidence, 'after/' + row.target + '.snapshot'), bytes);
    assert.deepEqual(committed('products/rea-studio/experiments/notes-todo/' + row.after.sourcePath, after), bytes);
    if (row.before) { const before = git(['show', 'HEAD:' + row.target]); assert.deepEqual(identity(before), pin(row.before)); assert.deepEqual(read(evidence, 'before/' + row.target + '.snapshot'), before); }
    else assert.equal(git(['ls-tree','HEAD','--',row.target]).length, 0);
    current.push({ path: row.target, ...after });
  }
  const expectedStatus = ordered(bundle.transitions.map(row => ({ path: row.target, status: row.before === null ? '??' : ' M' })));
  assert.deepEqual(value.currentTargets, ordered(current)); assert.deepEqual(value.currentTargetSHA256, Object.fromEntries(ordered(current).map(row => [row.path, row.sha256]))); assert.deepEqual(value.gitStatus, expectedStatus); assert.deepEqual(status(), expectedStatus);
  return { targets: new Map(bundle.transitions.map(row => [row.target, row])), status: expectedStatus, receipt: identity(compositionBytes), bundle, browserBundle, roster,
    browserBundleIdentity: { path: BROWSER_BUNDLE, ...identity(browserBundleBytes) }, contractIdentity: { path: browserBundle.contract.path, ...identity(contractBytes) } };
}
export function authenticateNotesBrowserCensus(rows, proof) {
  guard(); const tree = new Map();
  for (const item of git(['ls-tree','-r','-z','--full-tree','HEAD']).toString('utf8').split('\0').filter(Boolean)) { const match = /^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/.exec(item); if (match) tree.set(match[3], match[2]); }
  assert.equal(git(['rev-parse','--show-object-format']).toString('utf8').trim(), 'sha1');
  let overlaid = 0, baseline = 0;
  for (const row of rows) {
    const name = 'products/rea-studio/' + relative(row.path), bytes = read(repository, name); assert.deepEqual(identity(bytes), pin(row));
    const target = proof.targets.get(name);
    if (target) { assert.deepEqual(identity(bytes), pin(target.after)); overlaid++; }
    else { assert(tree.has(name)); assert.equal(createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex'), tree.get(name)); baseline++; }
  }
  assert.equal(overlaid, 7); assert.equal(rows.length, overlaid + baseline); assert.deepEqual(status(), proof.status);
  return { eligibleSources: rows.length, exactAfterimagesInEligibleCensus: overlaid, allOtherEligibleGitBlobs: baseline, exactNotesTargets: 8, separatelyPinnedMarkdownTargets: 1, fullSixDirectoryActiveCensus: true, sourceOverlay: true };
}
export function verifyNotesComposerPostcheck(evidence, proof) {
  const bytes = read(evidence, 'notes-todo-postrun-source-check.json'), value = JSON.parse(bytes); assert.equal(value.schema, 'rea-notes-todo-hosted-postrun-source-check/v1'); assert.equal(value.status, 'passed'); assert.equal(value.sourceStable, true); assert.equal(value.checkedTargets, 8); sameAttempt(value.execution);
  assert.equal(value.sourceCommit, process.env.GITHUB_SHA); assert.equal(value.baselineGitCommit, process.env.GITHUB_SHA); assert.equal(value.compositionSHA256, proof.receipt.sha256); assert.deepEqual(value.sourceBundle, { path: NOTES_BUNDLE, ...NOTES_BUNDLE_PIN }); assert.deepEqual(value.gitStatus, proof.status);
  return identity(bytes);
}
export function verifyNotesBrowserResults(evidence, proof) {
  guard(); const report = JSON.parse(read(evidence, 'playwright-results.json')), specs = [];
  const visit = suite => { specs.push(...(suite.specs ?? [])); for (const nested of suite.suites ?? []) visit(nested); }; for (const suite of report.suites) visit(suite);
  assert.deepEqual(report.errors, []); assert.equal(specs.length, 8); assert.deepEqual(specs.map(row => row.title).sort(), [...proof.roster].sort());
  for (const spec of specs) { assert.equal(spec.ok, true); assert.equal(spec.tests.length, 1); const value = spec.tests[0]; assert.equal(value.status, 'expected'); assert.equal(value.results.length, 1); assert.equal(value.results[0].status, 'passed'); assert.equal(value.results[0].retry, 0); }
  assert.deepEqual([report.stats.expected,report.stats.unexpected,report.stats.skipped,report.stats.flaky], [8,0,0,0]);
  const browser = JSON.parse(read(evidence, 'browser-observation.json')); assert.deepEqual(browser, { schema: 'rea-cloud-real-browser-observation/v1', browser: 'chromium', channel: 'chromium', version: '156.0.8078.4', realBrowserFixtureCreated: true, retries: 0 });
  const workers = fs.readdirSync(evidence).filter(name => /^browser-observation-process-[0-9]+\.json$/.test(name)); assert.equal(workers.length, 1);
  const workerBytes = read(evidence, workers[0]), worker = JSON.parse(workerBytes); assert.equal(worker.schema, 'rea-cloud-notes-todo-browser-worker-observation/v1'); sameAttempt(worker.execution); assert(Number.isSafeInteger(worker.pid) && worker.pid > 0); assert.equal(workers[0], 'browser-observation-process-' + worker.pid + '.json'); assert.deepEqual(worker.observation, browser);
  assert.deepEqual(ordered(worker.sourcePins), ordered(proof.bundle.transitions.map(row => ({ path: row.target.slice('products/rea-studio/'.length), ...pin(row.after) }))));
  const cases = fs.readdirSync(evidence).filter(name => /^case-.*\.json$/.test(name)); assert.equal(cases.length, 8);
  const values = cases.map(name => { const bytes = read(evidence, name, 2 * 1024 * 1024); return { file: name, bytes, value: JSON.parse(bytes) }; });
  assert.deepEqual(values.map(row => row.value.title).sort(), [...proof.roster].sort());
  const kinds = ['ordinary-browser-task-lifecycle','dirty-draft-no-transport','actual-disk-commit-before-response-release','new-editor-generation-after-actual-commit','actual-navigation-disposal-after-commit','actual-host-revision-conflict-and-explicit-retry','actual-post-accept-list-refresh-draft','actual-jex-native-tar-and-resource-download'];
  const screenshots = [], downloads = [], records = [], holds = [], accepted = [];
  for (const row of values) {
    const value = row.value, index = proof.roster.indexOf(value.title); assert(index >= 0); assert.equal(value.schema, 'rea-notes-todo-real-browser-case/v1'); assert.equal(value.statusAtFixtureClose, 'passed'); assert.equal(value.retry, 0); assert.equal(value.realBrowser, true); assert.equal(value.actualHTTP, true); assert.equal(value.serverCloseObserved, true);
    for (const name of ['originalProductExecutions','originalFullApplicationExecutions','originalHelperExecutions','programmaticDisabledControlProbes']) assert.equal(value[name], 0);
    assert.deepEqual(value.errors, []); assert(/^[A-Za-z0-9-]+$/.test(value.testId)); assert.equal(row.file, 'case-' + value.testId + '.json');
    const teardown = value.teardown; for (const name of ['heldRoutesFinished','drained','contextClosed','serverClosed','screenshotSaved']) assert.equal(teardown[name], true); assert.equal(teardown.stage, 'completed'); assert.equal(teardown.pendingOwnedRequests, 0); assert.equal(teardown.requestCounts.failed, 0); assert.equal(teardown.requestCounts.started, teardown.requestCounts.finished);
    assert.deepEqual(teardown.steps.map(item => item.name), ['release-held-routes','screenshot','drain-owned-page-requests','capture-synthetic-final-record','close-owned-context','close-owned-server']); assert(teardown.steps.every(item => item.status === 'passed'));
    const relevant = value.observations.filter(item => item.kind === kinds[index]); assert.equal(relevant.length, 1); const observed = relevant[0];
    const screenshotPath = 'screenshots/' + value.testId + '.png', image = read(evidence, screenshotPath, 2 * 1024 * 1024); assert(image.length >= 24); assert.equal(image.subarray(0,8).toString('hex'), '89504e470d0a1a0a'); assert.equal(image.subarray(12,16).toString('ascii'), 'IHDR'); assert.equal(image.readUInt32BE(16), 1440); assert.equal(image.readUInt32BE(20), 1100); screenshots.push({ path: screenshotPath, ...identity(image), width: 1440, height: 1100 });
    const disk = value.observations.filter(item => item.kind === 'owned-synthetic-disk-record'); assert.equal(disk.length, 1); assert.equal(disk[0].path, 'notes-records/' + value.testId + '.json'); const storedBytes = read(evidence, disk[0].path, 1024 * 1024); assert.deepEqual(identity(storedBytes), pin(disk[0])); const stored = JSON.parse(storedBytes); assert.equal(stored.schema, 2); records.push({ path: disk[0].path, ...identity(storedBytes) });
    const expectedHold = [2,3,4,6].includes(index); assert.equal(value.faults.length, expectedHold ? 1 : 0);
    for (const fault of value.faults) { assert.equal(fault.kind, 'delay-after-actual-host-response'); assert.equal(fault.action, index === 6 ? 'list' : 'todo-completed'); assert.equal(fault.status, 200); assert.equal(fault.handlerMocked, false); assert.equal(fault.responseRewritten, false); assert(Number.isSafeInteger(fault.body.bytes) && fault.body.bytes > 0); assert(/^[0-9a-f]{64}$/.test(fault.body.sha256)); holds.push({ title: value.title, ...fault }); }
    const expectedConflicts = index === 5 ? 1 : 0; assert.equal(value.expectedHttpFailures.length, expectedConflicts); assert.equal(value.responses.filter(item => item.status >= 400).length, expectedConflicts);
    if (index === 5) { const failure = value.expectedHttpFailures[0]; assert.equal(failure.path, '/api/notes/todo-completed'); assert.equal(failure.status, 400); assert.equal(failure.observed, true); assert.equal(failure.errorMessage, 'Note changed since it was opened. Reopen it before saving; your draft is preserved.'); const actualFailure = value.responses.filter(item => item.status === 400 && item.expectedActualHostFailure === true); assert.equal(actualFailure.length, 1); assert.equal(actualFailure[0].error, failure.errorMessage); assert.equal(observed.responseMocked, false); assert.equal(observed.rejectedHTTPStatus, 400); assert.equal(observed.reopenedRevision, observed.concurrentRevision); assert.equal(observed.successfulRetryRevision, observed.concurrentRevision + 1); assert.equal(stored.notes[observed.noteId].revision, observed.successfulRetryRevision); }
    else assert.deepEqual(value.expectedConsole, []);
    if (index === 1) { assert.equal(observed.additionalMutatingRequests, 0); assert.deepEqual(observed.storedBytesBefore, observed.storedBytesAfter); assert.equal(stored.notes[observed.noteId].todo.isTodo, true); }
    if ([2,6].includes(index)) { assert.equal(observed.ordinaryEnabledFieldTyping, true); assert.equal(observed.nextSubmittedRevision, observed.committedRevision); assert.equal(observed.finalRevision, observed.committedRevision + 1); assert.equal(stored.notes[observed.noteId].revision, observed.finalRevision); }
    if (index === 3) { assert.notEqual(observed.originalId, observed.newId); assert.equal(observed.newRevision, 1); assert.equal(stored.notes[observed.newId].revision, 1); assert.equal(stored.notes[observed.originalId].revision, observed.originalCommittedRevision); }
    if (index === 4) { assert.equal(observed.lateNotesRequests, 0); assert.equal(observed.detachedControlObserved, true); assert.equal(observed.detachedControlScrubbingClaimed, false); }
    assert.equal(value.downloads.length, index === 7 ? 2 : 0);
    const downloadObservations = value.observations.filter(item => item.kind === 'real-browser-file-download'); assert.equal(downloadObservations.length, value.downloads.length);
    for (const download of value.downloads) { const suffix = download.suggestedFilename === 'rea-notes.jex' ? '-edited-notes.jex' : download.suggestedFilename === 'sample.bin' ? '-resource-sample.bin' : null; assert(suffix); assert.equal(download.path, 'downloads/' + value.testId + suffix); const bytes = read(evidence, download.path); assert(bytes.length > 0); assert.deepEqual(identity(bytes), download.observed); assert.deepEqual(downloadObservations.filter(item => item.path === download.path), [download]); if (suffix.endsWith('.bin')) assert.deepEqual(bytes, Buffer.from([0,1,127,128,255])); else assert(bytes.length >= 1024 && bytes.length % 512 === 0); downloads.push({ path: download.path, ...identity(bytes), suggestedFilename: download.suggestedFilename }); }
    if (index === 7) { const listing = read(evidence, 'notes-native-tar-list-' + value.testId + '.txt', 8192); assert.deepEqual(identity(listing), observed.independentNativeTar.listing); assert.equal(listing.toString('utf8').trim().split(/\r?\n/).length, 8); assert.equal(observed.independentNativeTar.unchangedRawRecordComparisons, 6); assert.deepEqual(observed.resourceDownload, { bytes: 5, sha256: '0150a92bb1212cd00516b65fde0704614760000963874fcbb11eaa734ee87809' }); }
    accepted.push({ title: value.title, testId: value.testId, ...identity(row.bytes) });
  }
  assert.equal(holds.length, 4); assert.equal(downloads.length, 2); assert.equal(records.length, 8); assert.equal(screenshots.length, 8);
  assert.equal(fs.readdirSync(path.join(evidence, 'screenshots')).filter(name => name.endsWith('.png')).length, 8); assert.equal(fs.readdirSync(path.join(evidence, 'downloads')).length, 2); assert.equal(fs.readdirSync(path.join(evidence, 'notes-records')).length, 8);
  return { screenshots, downloads, notesBrowser: { cases: accepted, realHolds: holds, ownedDiskRecords: records, originalProductExecutions: 0, programmaticDisabledControlProbes: 0, exactGenuineConflicts: 1, allOwnedCleanupVerified: true }, browserWorkers: [{ path: workers[0], ...identity(workerBytes), pid: worker.pid }], summary: { tests: 8, passed: 8, failed: 0, skipped: 0, flaky: 0, retries: 0, exactRealDownloads: 2, actualResponseHolds: 4, genuineRevisionConflicts: 1, originalProcesses: 0 } };
}
