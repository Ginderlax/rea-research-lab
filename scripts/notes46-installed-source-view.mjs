// New Notes46 source epoch only. Historical Notes41 factories and contracts are
// unchanged and never acquire current46 meaning through this module.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const MANIFEST_PATH = 'products/rea-studio/experiments/notes46-installed-search-20261019/INSTALLED-SOURCE.json';
// Fixed external source declaration; the helper stays outside its own data group.
const FROM_ROOT_PIN = Object.freeze({ path: MANIFEST_PATH, bytes: 68210, sha256: '2d9279a496f3c70174149eeb5bbfc0f4f0b29c3d88d6886d31e6620efa6a7324' });
const EPOCH = 'notes46-installed-publication-wire-v2';
// A separate prospective group, never a change to old145/146 or old proof caps.
// Final exact dependency roster is a review gate before this work-only freeze.
const BUDGET = Object.freeze({ sourceRows: 158, manifestRows: 1, dataRows: 159,
  helperRows: 1, envelopeRows: 160, memberBytes: 512 * 1024,
  helperBytes: 256 * 1024, rawBytes: 8 * 1024 * 1024 });
const contexts = new WeakMap();
const id = bytes => ({ bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
const metadata = row => ({ bytes: row.bytes, sha256: row.sha256 });
function freeze(value) { if (value && typeof value === 'object' && !Object.isFrozen(value)) { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; }
function safe(name) {
  assert(typeof name === 'string' && name.length > 0 && name.length < 4096 && !name.startsWith('/') && !/[\\:\x00-\x1f\x7f<>"|?*]/.test(name));
  assert(name.split('/').every(part => part && part !== '.' && part !== '..' && !/[ .]$/.test(part) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)));
  return name;
}
function pin(row, maximum = BUDGET.memberBytes) { assert(row && typeof row === 'object'); safe(row.path); assert(Number.isSafeInteger(row.bytes) && row.bytes >= 0 && row.bytes <= maximum); assert(/^[0-9a-f]{64}$/.test(row.sha256)); return row; }
function sameNames(actual, expected) { assert(Array.isArray(actual)); assert.equal(actual.length, 46); assert.equal(new Set(actual.map(name => safe(name).toLowerCase())).size, 46); assert.deepEqual([...actual].sort(), expected, 'Actual eligible Notes46 source census'); }

export function createNotes46InstalledSourceView(rawRead, externallyPinnedManifest, liveNotesCensus) {
  assert.equal(typeof rawRead, 'function'); assert.equal(typeof liveNotesCensus, 'function', 'A retained census acquisition callback is mandatory');
  assert(externallyPinnedManifest && typeof externallyPinnedManifest === 'object');
  // Read each caller-owned field once, then validate only the private copy.
  // Accessors cannot change an already-validated field between reads.
  const fixedPin = Object.freeze({ path: externallyPinnedManifest.path, bytes: externallyPinnedManifest.bytes, sha256: externallyPinnedManifest.sha256 });
  pin(fixedPin); assert.equal(fixedPin.path, MANIFEST_PATH);
  const observed = new Map(); let rawBytes = 0;
  function authenticate(row) {
    pin(row); const bytes = rawRead(row.path); assert(Buffer.isBuffer(bytes) && bytes.length <= BUDGET.memberBytes);
    assert.deepEqual(id(bytes), metadata(row), 'Notes46 actual source identity: ' + row.path);
    if (observed.has(row.path)) assert.deepEqual(observed.get(row.path), id(bytes), 'Notes46 source changed after authentication');
    else { observed.set(row.path, id(bytes)); rawBytes += bytes.length; assert(observed.size <= BUDGET.dataRows && rawBytes <= BUDGET.rawBytes, 'Separate Notes46 source budget'); }
    return bytes;
  }
  const planBytes = authenticate(fixedPin), plan = JSON.parse(planBytes);
  assert.equal(plan.schema, 'rea-notes46-installed-source-declaration/v2');
  assert.equal(plan.status, 'reviewed-frozen-installed-source-binding');
  assert.equal(plan.sourceEpoch, EPOCH); assert.equal(plan.sourceOnly, true);
  assert.equal(plan.behaviorAcceptancePreclaimed, false); assert.equal(plan.historicalReceiptsRebound, false);
  assert.equal(plan.baselineCommit, '2a8482b42784eb262d6d5b82e62d8d1220dc4821');
  assert.equal(plan.qualifiedPayloadSource, '0e2b6d70c31e1534e61c203e8fa78c2fc6c19da5');
  assert.equal(plan.exactPromotedTargets, 18); assert.deepEqual(plan.sourceBudget, BUDGET);
  assert.equal(plan.currentNotesSources.length, 46); assert.equal(plan.studySources.length, 10);
  assert.equal(plan.retainedSupportingAndConsumerSources.length, 85); assert.equal(plan.newDispatchSources.length, 2);
  assert.equal(plan.historicalApiCompanionSources.length, 8); assert.equal(plan.publicLegacyApiBrandSources.length, 2); assert.equal(plan.historicalAcquisitionAndRecordSources.length, 3);
  assert.equal(plan.publicationWireSources.length, 2);
  assert.deepEqual(plan.publicationWireSources.map(row => row.path), ['scripts/notes46-current-validation-wire.mjs', 'scripts/notes46-current-validation-wire.test.mjs']);
  assert.deepEqual(plan.currentSourceRows, [...plan.currentNotesSources, ...plan.studySources, ...plan.retainedSupportingAndConsumerSources, ...plan.newDispatchSources, ...plan.historicalApiCompanionSources, ...plan.publicLegacyApiBrandSources, ...plan.historicalAcquisitionAndRecordSources, ...plan.publicationWireSources]);
  assert.equal(plan.currentSourceRows.length, BUDGET.sourceRows);
  const selected = new Map(), lower = new Set();
  for (const row of plan.currentSourceRows) {
    pin(row); assert(!selected.has(row.path) && !lower.has(row.path.toLowerCase()));
    assert(![MANIFEST_PATH, 'scripts/notes46-installed-source-view.mjs', 'scripts/verify-notes46-publication.mjs', 'scripts/verify-cloud-publication.mjs', '.github/workflows/notes46-installed-search-publication-cloud.yml', 'scripts/notes46-publication-controls.mjs', 'scripts/notes46-installed-source-controls.mjs', 'scripts/notes46-publication-repeat-controls.mjs', 'scripts/audit-notes46-installed-delivery.mjs'].includes(row.path), 'No source/helper/collector/control hash cycle');
    selected.set(row.path, row); lower.add(row.path.toLowerCase()); authenticate(row);
  }
  const noteNames = plan.currentNotesSources.map(row => row.path).sort();
  assert(noteNames.every(name => name.startsWith('products/rea-studio/apps/notes/') && !name.split('/').includes('results')));
  assert.equal(new Set(noteNames).size, 46); sameNames(liveNotesCensus(), noteNames);
  const studyNames = plan.studySources.map(row => row.path);
  assert(studyNames.every(name => name.startsWith('products/rea-studio/experiments/notes-search-grammar/')));
  assert.equal(plan.historicalNotes41Profile.sourceCommit, plan.baselineCommit);
  assert.equal(plan.historicalNotes41Profile.dataRows, 145); assert.equal(plan.historicalNotes41Profile.envelopeRows, 146);
  assert.equal(plan.historicalNotes41Profile.oldControlCount, 551);
  assert.equal(plan.historicalNotes41Profile.actualCurrent46AcceptanceClaimed, false);
  freeze(plan);
  function recheck() { sameNames(liveNotesCensus(), noteNames); authenticate(fixedPin); for (const row of selected.values()) authenticate(row); assert.equal(observed.size, BUDGET.dataRows); }
  const view = Object.freeze({
    plan,
    recheck,
    sourceRead(name) { safe(name); if (name === MANIFEST_PATH) return authenticate(fixedPin); const row = selected.get(name); assert(row, 'Unlisted Notes46 current-source read'); return authenticate(row); },
    sourcePin(name) { const row = name === MANIFEST_PATH ? fixedPin : selected.get(safe(name)); assert(row, 'Unlisted Notes46 source identity'); return Object.freeze({ path: row.path, ...metadata(row) }); },
    summary() { recheck(); const context = contexts.get(view); return { schema: 'rea-notes46-installed-source-proof/v1', sourceOnly: true, sourceEpoch: EPOCH, currentNotesSources: 46, studySources: 10, retainedSupportingAndConsumerSources: 85, dispatchSources: 2, historicalApiCompanionSources: 8, publicLegacyApiBrandSources: 2, historicalAcquisitionAndRecordSources: 3, publicationWireSources: 2, currentSourceRows: BUDGET.sourceRows, authenticatedDataRows: observed.size, authenticatedDataBytes: rawBytes, ...BUDGET, censusKind: context.kind, censusCallbackRechecked: true, physicalDirectoryAcquisitionClaimed: context.kind === 'physical-directory', historicalNotes41AcceptanceIsSeparate: true, historicalReceiptsRebound: false, sourceOverlay: false, behaviorAcceptancePreclaimed: false, originalExecutions: 0, productExecutions: 0, fullParity: false, superiority: false }; },
    envelopeRows() { recheck(); return [...plan.currentSourceRows.map(row => ({ path: row.path, ...metadata(row), base64: authenticate(row).toString('base64'), sourceEpoch: EPOCH, actualCurrentSource: true })), { path: MANIFEST_PATH, ...metadata(fixedPin), base64: authenticate(fixedPin).toString('base64'), externallyPinnedManifest: true }]; }
  });
  contexts.set(view, { read: rawRead, pin: Object.freeze({ ...fixedPin }), census: liveNotesCensus, kind: 'explicit-caller-census-function' });
  return view;
}

export function assertNotes46InstalledSourceView(view, sourceRead, liveNotesCensus) {
  const prior = contexts.get(view); assert(prior, 'Genuine Notes46 source-view brand required');
  assert.equal(typeof sourceRead, 'function', 'Explicit physical sourceRead channel required');
  const retainedCensus = liveNotesCensus ?? prior.census;
  assert.equal(typeof retainedCensus, 'function', 'Explicit or retained census acquisition channel required');
  view.recheck();
  const fresh = createNotes46InstalledSourceView(sourceRead, prior.pin, retainedCensus);
  // Caller-supplied IO remains caller-scoped; no disk-acquisition claim is copied.
  return fresh;
}

export function createNotes46InstalledSourceViewFromRoot(root) {
  assert(FROM_ROOT_PIN.bytes > 0, 'WORK-ONLY unfrozen Notes46 manifest pin');
  root = path.resolve(root);
  function noLinks(filename) { let at = filename; while (true) { assert(!fs.lstatSync(at).isSymbolicLink()); const parent = path.dirname(at); if (at === parent) break; at = parent; } assert.equal(fs.realpathSync(filename).toLowerCase(), path.resolve(filename).toLowerCase()); }
  function owned(name) { const filename = path.join(root, safe(name)), relative = path.relative(root, filename); assert(relative && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep)); noLinks(filename); return filename; }
  function read(name) { const filename = owned(name), stat = fs.lstatSync(filename); assert(stat.isFile() && stat.size <= BUDGET.memberBytes); const bytes = fs.readFileSync(filename); assert.equal(bytes.length, stat.size); return bytes; }
  function census() {
    const result = [];
    function walk(name, depth = 0) { assert(depth <= 32); const directory = owned(name); assert(fs.lstatSync(directory).isDirectory()); for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { if (entry.name === 'results') continue; assert(!entry.isSymbolicLink()); const child = name + '/' + entry.name; if (entry.isDirectory()) walk(child, depth + 1); else { assert(entry.isFile()); result.push(child); assert(result.length <= 46); } } }
    walk('products/rea-studio/apps/notes'); return result.sort();
  }
  const view = createNotes46InstalledSourceView(read, FROM_ROOT_PIN, census); contexts.get(view).kind = 'physical-directory'; return view;
}

export function verifyNotes46InstalledSourceEnvelope(sourceView, rows, helperPin, helperBytes) {
  assert(contexts.has(sourceView), 'Genuine current46 source-view brand required for envelope validation');
  sourceView.recheck();
  assert(Array.isArray(rows)); assert.equal(rows.length, BUDGET.dataRows);
  assert.deepEqual(rows, sourceView.envelopeRows(), 'Exact externally authenticated current46 path, identity and content map required');
  assert(helperPin && typeof helperPin === 'object');
  const fixedHelperPin = Object.freeze({ path: helperPin.path, bytes: helperPin.bytes, sha256: helperPin.sha256 });
  pin(fixedHelperPin, BUDGET.helperBytes); assert.equal(fixedHelperPin.path, 'scripts/notes46-installed-source-view.mjs');
  assert(Buffer.isBuffer(helperBytes) && helperBytes.length <= BUDGET.helperBytes); assert.deepEqual(id(helperBytes), metadata(fixedHelperPin));
  const names = new Set(); let rawBytes = helperBytes.length;
  for (const row of rows) { pin(row); assert(!names.has(row.path.toLowerCase())); names.add(row.path.toLowerCase()); assert.notEqual(row.path.toLowerCase(), fixedHelperPin.path.toLowerCase()); assert(typeof row.base64 === 'string'); const bytes = Buffer.from(row.base64, 'base64'); assert.equal(bytes.toString('base64'), row.base64); assert.deepEqual(id(bytes), metadata(row)); rawBytes += bytes.length; }
  assert.equal(names.size + 1, BUDGET.envelopeRows); assert(rawBytes <= BUDGET.rawBytes);
  return Object.freeze({ rows: [...rows, { path: fixedHelperPin.path, ...metadata(fixedHelperPin), base64: helperBytes.toString('base64'), separateFixedHelperSource: true }], rawBytes, sourceEpoch: EPOCH, historicalProfileBudgetRaised: false });
}

export function notes46InstalledSourceBudget() { return { ...BUDGET }; }

// New current46 repeat comparison only. Raw CLI receipts are retained unchanged;
// the original Notes41 three-clock routine and551 controls are not rewritten.
export function projectNotes46CurrentPublicationRepeat(value, phase, sourceView) {
  assert(contexts.has(sourceView), 'Genuine current46 source-view brand required for repeat comparison');
  sourceView.recheck();
  let nodes = 0;
  function plain(item, depth = 0, visited = new WeakSet()) {
    assert(depth <= 64 && ++nodes <= 100000, 'Bounded plain repeat receipt');
    if (item === null) return;
    if (typeof item !== 'object') { assert(['string', 'number', 'boolean'].includes(typeof item), 'JSON primitive required'); if (typeof item === 'number') assert(Number.isFinite(item) && !Object.is(item, -0), 'Lossless finite JSON number required'); return; }
    assert(!visited.has(item), 'Repeat input must be plain JSON without cycles or shared references'); visited.add(item);
    assert(Object.getPrototypeOf(item) === Object.prototype || Object.getPrototypeOf(item) === Array.prototype);
    const keys = Reflect.ownKeys(item); assert(keys.length <= 100000 && (!Array.isArray(item) || item.length <= 100000), 'Bounded own JSON member inventory'); assert(keys.every(key => typeof key === 'string'));
    if (Array.isArray(item)) assert.deepEqual(keys, [...Array.from({ length: item.length }, (_, index) => String(index)), 'length'], 'Dense JSON array without extra properties');
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(item, key); assert(!descriptor.get && !descriptor.set, 'Repeat input accessors rejected');
      if (Array.isArray(item) && key === 'length') continue;
      assert.equal(descriptor.enumerable, true, 'Only enumerable JSON members'); plain(descriptor.value, depth + 1, visited);
    }
  }
  plain(value); plain(phase); assert(Buffer.byteLength(JSON.stringify(value)) <= 4 * 1024 * 1024);
  assert.deepEqual(JSON.parse(JSON.stringify(value)), value, 'Lossless raw CLI JSON receipt');
  assert.deepEqual(JSON.parse(JSON.stringify(phase)), phase, 'Lossless compact owned phase JSON');
  assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
  for (const [name, expected] of Object.entries({ CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', RUNNER_OS: 'Windows', GITHUB_REPOSITORY: 'Ginderlax/rea-research-lab', GITHUB_REF: 'refs/heads/experiment/notes46-installed-search-20261019', GITHUB_JOB: 'publication-integrity' })) assert.equal(process.env[name], expected, 'Actual owned publication environment ' + name);
  assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA ?? ''));
  for (const name of ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) assert(/^[1-9][0-9]*$/.test(process.env[name] ?? ''));
  for (const [field, name] of Object.entries({ sourceCommit: 'GITHUB_SHA', runId: 'GITHUB_RUN_ID', runAttempt: 'GITHUB_RUN_ATTEMPT', job: 'GITHUB_JOB' })) assert.equal(phase[field], process.env[name], 'Actual owned phase identity ' + field);
  function utc(text, label) {
    assert.equal(typeof text, 'string', label); assert.match(text, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, label);
    const time = Date.parse(text); assert(Number.isFinite(time) && new Date(time).toISOString() === text, label); return time;
  }
  assert(phase && ['publication-write', 'publication-recheck'].includes(phase.name));
  assert.equal(phase.status, 'passed'); assert.equal(phase.exitCode, 0); assert.equal(phase.signal, null); assert.equal(phase.closeObserved, true); assert.equal(phase.droppedBytes, 0);
  assert(/^[0-9a-f]{40}$/.test(phase.sourceCommit));
  assert.equal(value.schema, 'rea-notes46-current-publication-validation/v1'); assert.equal(value.status, 'passed');
  assert.equal(value.currentWorkflowSourceSHA, phase.sourceCommit); assert.deepEqual(value.notes46CurrentSourceProof, sourceView.summary());
  assert.equal(value.allUniqueOldHistoricalPredicatesExecutedSeparately, true); assert.equal(value.oldFullRecordsCliReexecutedClaimed, false);
  const historical = value.historicalValidation, input = value.historicalInputProof, cleanup = value.historicalCleanup;
  assert.equal(historical.schema, 'rea-notes46-historical2a-record-predicates/v1'); assert.equal(historical.status, 'passed');
  assert.equal(historical.historicalInputCommit, '2a8482b42784eb262d6d5b82e62d8d1220dc4821');
  assert.equal(historical.historicalInputTree, '34e8de6f0c447edd2bc1a6389ed5dfb727705025');
  assert.equal(historical.current46AcceptanceClaimed, false); assert.equal(historical.everyUniqueOldHistoricalPredicateRetained, true);
  assert.equal(historical.completeProductDevelopmentBlockReached, true); assert.equal(historical.productDevelopmentPresent, true);
  const sketch = historical.followupEvidence?.notesLayoutValueApiCheckpoint?.sketch;
  assert(sketch); assert.equal(sketch.schema, 'rea-sketch-layout-installed-source-proof/v2'); assert.equal(sketch.sourceOnly, true);
  assert.equal(sketch.actualInstalledByteVerification, false); assert.equal(sketch.current10HistoricalDatasetMandatory, true);
  assert.equal(sketch.actualCurrentSourcesAuthenticatedSeparately, true); assert.equal(sketch.currentSourceProof.currentRows, 126);
  assert.equal(sketch.currentSourceProof.authenticatedDataRows, 145); assert.equal(sketch.currentSourceProof.supportingSources, 60);
  assert.equal(sketch.currentSourceProof.sketchSupportingSources, 11); assert.equal(sketch.currentSourceProof.totalSupportingSources, 71);
  assert.equal(input.schema, 'rea-notes46-complete-historical-input-proof/v1');
  assert.equal(input.historicalInputCommit, historical.historicalInputCommit); assert.equal(input.historicalInputTree, historical.historicalInputTree);
  assert.equal(input.inputFiles, 29069); assert.equal(input.inputRawBytes, 1381427700);
  assert.equal(input.contextStatus, 'available'); assert.equal(input.poison, null); assert.equal(input.recheckFailure, null);
  assert.equal(input.pendingExecutionBoundaries, 0); assert.equal(input.pendingOuterBoundary, false);
  assert.equal(input.fullIntegrityPasses, 2); assert.equal(input.completedOuterBoundaries, 1); assert.equal(input.boundaries.length, 1);
  const boundary = input.boundaries[0];
  assert.equal(boundary.sequence, 1); assert.equal(boundary.label, 'current-records-cli'); assert.equal(boundary.depth, 1); assert.equal(boundary.outer, true);
  assert.equal(boundary.status, 'integrity-verified'); assert.equal(boundary.pending, false); assert.equal(boundary.failure, null);
  for (const [index, proof] of [boundary.before, boundary.after].entries()) {
    assert.equal(proof.files, input.inputFiles); assert.equal(proof.rawBytes, input.inputRawBytes);
    assert.equal(proof.allSHA256AndGitBlobBytesExact, true); assert.equal(proof.physicalInventoryExact, true); assert.equal(proof.passOrdinal, index + 1);
  }
  assert.equal(boundary.before.phase, 'before-outer-execution'); assert.equal(boundary.after.phase, 'after-outer-execution');
  assert.equal(boundary.before.directories, boundary.after.directories);
  assert.equal(cleanup.schema, 'rea-notes46-owned-historical-input-disposal/v1'); assert.equal(cleanup.status, 'disposed');
  for (const name of ['genuinePrivateContext', 'ownedCreatedContainerIdentityVerified', 'ownedAbsoluteTargetVerified', 'runnerTempAndRepositoryExcluded', 'ownedContainerRemoved', 'cacheEvicted', 'reacquisitionBlockedForThisProcess', 'laterReadersRejected']) assert.equal(cleanup[name], true, 'Qualified disposal ' + name);
  assert.equal(cleanup.pendingExecutionBoundaries, 0); assert.equal(cleanup.fullIntegrityPassesBeforeDisposal, 2);
  assert.equal(cleanup.finalMetadataInventoryFiles, input.inputFiles); assert.equal(cleanup.finalMetadataInventoryDirectories, boundary.after.directories);
  assert.equal(cleanup.rawContentRehashedByDispose, false); assert.equal(cleanup.current46AcceptanceClaimed, false); assert.equal(cleanup.rawArtifactBackupClaimed, false);
  assert.deepEqual(cleanup.closedSummaryIdentity, id(Buffer.from(JSON.stringify(input))), 'Cleanup binds the exact raw unprojected closed input proof');
  for (const receipt of [input, cleanup]) {
    assert.equal(receipt.workflowSourceSHA, phase.sourceCommit); assert.equal(receipt.workflowRun, phase.runId);
    assert.equal(receipt.workflowAttempt, phase.runAttempt); assert.equal(receipt.workflowJob, phase.job);
  }
  const clocks = {
    phaseStartedAtUtc: phase.startedAtUtc,
    boundaryStartedAt: boundary.startedAt, inputBeforeCheckedAt: boundary.before.checkedAt,
    historicalSketchStarted: sketch.started, historicalSketchFinished: sketch.finished,
    checked_at_utc: value.checked_at_utc, inputAfterCheckedAt: boundary.after.checkedAt,
    boundaryCompletedAt: boundary.completedAt, cleanupStartedAt: cleanup.startedAt,
    cleanupCompletedAt: cleanup.completedAt, phaseCompletedAtUtc: phase.completedAtUtc
  };
  let previous = -Infinity;
  for (const [label, text] of Object.entries(clocks)) { const time = utc(text, label); assert(time >= previous, 'Nine named observation clocks ordered inside their own owned child phase'); previous = time; }
  const stable = structuredClone(value);
  delete stable.checked_at_utc;
  const stableSketch = stable.historicalValidation.followupEvidence.notesLayoutValueApiCheckpoint.sketch;
  delete stableSketch.started; delete stableSketch.finished;
  const stableBoundary = stable.historicalInputProof.boundaries[0];
  delete stableBoundary.startedAt; delete stableBoundary.completedAt; delete stableBoundary.before.checkedAt; delete stableBoundary.after.checkedAt;
  delete stable.historicalCleanup.startedAt; delete stable.historicalCleanup.completedAt;
  // This clock-dependent identity is checked against the raw closed proof above;
  // its original bytes remain in both raw receipts, never rebound or rewritten.
  delete stable.historicalCleanup.closedSummaryIdentity;
  sourceView.recheck();
  return { stable, clocks, namedClockFieldsProjected: 9, rawClosedSummaryIdentityVerifiedBeforeProjection: true,
    historicalInputSubject: historical.historicalInputCommit, actualCurrent46SourceProof: sourceView.summary(),
    originalThreeClockProjectionChanged: false, rawReceiptsRewritten: false };
}
