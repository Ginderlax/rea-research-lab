// Current46 source authentication and historical2a proof execution are distinct
// channels. No old proof output acquires current46 behavioral meaning here.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createNotes46InstalledSourceViewFromRoot, assertNotes46InstalledSourceView } from './notes46-installed-source-view.mjs';
import { prepareNotes46HistoricalInputRoot, assertNotes46HistoricalInputRoot } from './notes46-historical-input-root.mjs';
import { verifyArchiveIntegrationRecords as historicalArchive } from '../products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-archive-integration-records.mjs';
import { verifyFollowupRecords as historicalFollowups, verifyGitDirectoryClosure as actualGitDirectoryClosure } from '../products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-followup-records.mjs';
import { verifyNotesLayoutValueApiCheckpoint as historicalLayout } from '../products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-notes-layout-value-api-checkpoint.mjs';
import { verifyNotesInlineFollowups as historicalInline } from '../products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-notes-inline-followups.mjs';
import { verifyNotesVaultFollowups as historicalVault } from '../products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-notes-vault-followups.mjs';
import { verifyEditorValueApiFollowups as historicalEditorDisk, verifyEditorValueApiProofBytes as historicalEditorPure } from '../products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-editor-value-api-followups.mjs';
import { createNotes41AwareProofMigration as createCompanionHistoricalMigration, createNotes41PublicationSourceView as createHistoricalSourceView } from './notes41-publication-source-view.mjs';

const HISTORICAL_COMMIT = '2a8482b42784eb262d6d5b82e62d8d1220dc4821';
const HISTORICAL_MANIFEST_PIN = Object.freeze({ path: 'products/rea-studio/experiments/notes41-publication-source-transition-20261019/SOURCE-TRANSITION.json', bytes: 128781, sha256: 'ef44b5e1c5b7d6f4578d3574b2eab34d5b8f8f24a0886dff7279b22bcf37ced3' });
const editorContexts = new WeakMap();
const liveCliContexts = new Map();
function currentAndHistorical(root) {
  assert.equal(typeof root, 'string'); root = path.resolve(root);
  const current = createNotes46InstalledSourceViewFromRoot(root);
  const historical = prepareNotes46HistoricalInputRoot(root);
  current.recheck(); historical.recheck(); const context = { root, current, historical }; liveCliContexts.set(root.toLowerCase(), context); return context;
}
function wire(kind, current, historical, result) {
  current.recheck(); historical.recheck();
  return {
    schema: 'rea-notes46-current-proof-reader/' + kind + '/v1', sourceOnly: true,
    notes46CurrentSourceProof: current.summary(),
    historicalValidation: { inputCommit: HISTORICAL_COMMIT, current46AcceptanceClaimed: false, historicalInput: historical.summary(), result },
    oldReceiptsRebound: false, currentProductBehaviorExecuted: false,
    fullProductParity: false, superiority: false
  };
}
function syncHistorical(kind, root, operation) {
  const context = currentAndHistorical(root), token = context.historical.beginExecution(kind); let result;
  try { result = operation(context.historical.root); } finally { context.historical.endExecution(token); }
  return wire(kind, context.current, context.historical, result);
}

export function verifyNotes46ArchiveIntegrationRecords(root) {
  return syncHistorical('archive', root, historicalRoot => historicalArchive(historicalRoot));
}
export function verifyNotes46FollowupRecords(root) {
  return syncHistorical('followups', root, historicalRoot => historicalFollowups(historicalRoot));
}
export function verifyNotes46LayoutValueApiCheckpoint(root) {
  return syncHistorical('notes-layout-value-api', root, historicalRoot => historicalLayout(historicalRoot));
}
export function verifyNotes46InlineFollowups(root, options = {}) {
  const context = currentAndHistorical(root), token = context.historical.beginExecution('notes-inline'); let result;
  try { result = historicalInline(context.historical.root, options); } finally { context.historical.endExecution(token); }
  // This callable API remains callable. Its returned historical identity mapping
  // is unchanged; actual46 source stability is checked on every invocation.
  const resolver = result.resolveHistorical;
  assert.equal(typeof resolver, 'function');
  const resolveHistorical = (...args) => {
    // Original resolver only checks its captured immutable map and returns a
    // structured clone; it does not read physical historical proof bytes.
    context.current.recheck(); context.historical.recheck(); const value = resolver(...args);
    context.current.recheck(); context.historical.recheck(); return value;
  };
  return { ...wire('notes-inline', context.current, context.historical, { ...result, resolveHistorical: undefined }), resolveHistorical };
}
export function createNotes46InlineHistoricalResolver(root, options = {}) {
  const checked = verifyNotes46InlineFollowups(root, options), resolver = checked.resolveHistorical;
  Object.defineProperties(resolver, { notes46CurrentSourceProof: { value: checked.notes46CurrentSourceProof }, historicalValidation: { value: checked.historicalValidation } });
  return resolver;
}
export function verifyNotes46VaultFollowups(root, options = {}) {
  // Supplied onFile and resolver callbacks are used by the original function
  // during the same synchronous proof reads. No recorded callback replay.
  return syncHistorical('notes-vault', root, historicalRoot => historicalVault(historicalRoot, options));
}
export function verifyNotes46EditorValueApiFollowups(root, options = {}) {
  return syncHistorical('editor-value-api', root, historicalRoot => historicalEditorDisk(historicalRoot, options));
}

export function verifyNotes46GitDirectoryClosure(root) {
  assert.equal(typeof root, 'string'); root = path.resolve(root);
  const current = createNotes46InstalledSourceViewFromRoot(root);
  // This API describes fixed Git-safe public carrier delivery in the supplied
  // actual root. It does not require redirecting its IO to historical Notes41.
  const result = actualGitDirectoryClosure(root); current.recheck();
  const invoke = (method, args) => { current.recheck(); const value = result[method](...args); current.recheck(); return value; };
  return {
    schema: 'rea-notes46-current-git-directory-closure/v1', sourceOnly: true,
    read: (...args) => invoke('read', args), inventory: (...args) => invoke('inventory', args),
    summary: result.summary, notes46CurrentSourceProof: current.summary(),
    suppliedActualRootUsed: true, historicalNotes41RootSubstitution: false,
    oldReceiptsRebound: false, fullProductParity: false, superiority: false
  };
}

// Pure IO callers keep their own channels. A real current context is optional
// for the exact legacy-only API, and mandatory for an actual46 source claim.
// The old namespace's private migration brand is never taken from another ESM
// instance or silently replaced with an independently loaded disk context.
export function createNotes46EditorProofContext(installedSourceView, historicalRead, historicalNotesCensus) {
  assert.equal(typeof historicalRead, 'function'); assert.equal(typeof historicalNotesCensus, 'function');
  // Rebinding through the public assertion authenticates the private brand
  // before any supplied view method or reader callback can run.
  const current = assertNotes46InstalledSourceView(installedSourceView, name => installedSourceView.sourceRead(name));
  const historical = createHistoricalSourceView(historicalRead, HISTORICAL_MANIFEST_PIN, historicalNotesCensus);
  const context = Object.freeze({ schema: 'rea-notes46-editor-pure-context/v1', sourceOnly: true });
  editorContexts.set(context, { current, historicalRead, historicalNotesCensus, historical }); return context;
}
export function verifyNotes46EditorValueApiProofBytes(io, options = {}) {
  assert(io && typeof io.read === 'function' && typeof io.list === 'function');
  const { installedSourceContext, sourceMigration } = options;
  if (installedSourceContext === undefined) {
    // Preserve the original optional sourceMigration contract and mutations.
    // Such a result is explicitly not actual46 source authentication.
    const result = historicalEditorPure(io, { sourceMigration });
    return { schema: 'rea-notes46-editor-pure-legacy-only/v1', sourceOnly: true, actualNotes46SourceAuthenticated: false, historicalValidation: { inputCommit: null, callerOwnedHistoricalProofChannel: true, result }, fullProductParity: false, superiority: false };
  }
  const stored = editorContexts.get(installedSourceContext); assert(stored, 'Genuine Notes46 editor proof context required');
  assert.equal(sourceMigration, undefined, 'Use either the legacy supplied sourceMigration or the explicit installedSourceContext');
  assert.equal(typeof io.sourceRead, 'function', 'Current46 pure proof requires caller-owned physical sourceRead');
  stored.historical.recheck();
  const current = assertNotes46InstalledSourceView(stored.current, io.sourceRead.bind(io));
  // Reconstruct all historical constructor assertions against the supplied
  // proof reader, so a changed physical proof carrier cannot be masked.
  assert.equal(typeof io.historicalSourceRead, 'function', 'Historical145 source data has its own explicit bounded channel');
  const historicalView = createHistoricalSourceView(io.historicalSourceRead.bind(io), HISTORICAL_MANIFEST_PIN, stored.historicalNotesCensus);
  const historicalDataNames = new Set(historicalView.envelopeRows().map(row => row.path));
  const historical = createCompanionHistoricalMigration(name => historicalDataNames.has(name) ? io.historicalSourceRead(name) : io.read(name), HISTORICAL_MANIFEST_PIN, stored.historicalNotesCensus);
  const oldIO = { read: io.read.bind(io), list: io.list.bind(io), sourceRead: io.historicalSourceRead.bind(io) };
  if (io.finish !== undefined) { assert.equal(typeof io.finish, 'function'); oldIO.finish = io.finish.bind(io); }
  const result = historicalEditorPure(oldIO, { sourceMigration: historical });
  current.recheck(); stored.historical.recheck(); historicalView.recheck();
  return { schema: 'rea-notes46-editor-pure-current-and-historical/v1', sourceOnly: true, notes46CurrentSourceProof: current.summary(), historicalValidation: { inputCommit: HISTORICAL_COMMIT, current46AcceptanceClaimed: false, callerOwnedHistoricalProofChannel: true, result }, currentSourceChannel: 'io.sourceRead', historicalSourceChannel: 'io.historicalSourceRead', unchangedLegacyProofChannel: 'io.read/list/finish', threeChannelsIndependentlyAuthenticated: true, oldReceiptsRebound: false, fullProductParity: false, superiority: false };
}

function historicalChild(context, script, args) {
  assertNotes46HistoricalInputRoot(context.historical); context.current.recheck();
  // Real GHA env is inherited unchanged. These scripts have no source-HEAD
  // equals GITHUB_SHA condition; producer/audit are deliberately not routed here.
  const child = spawnSync(process.execPath, [path.join(context.historical.root, script), ...args], { cwd: context.historical.root, env: { ...process.env }, encoding: 'utf8', windowsHide: true, shell: false, timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
  context.current.recheck(); context.historical.recheck();
  const raw = { script, args, inputCommit: HISTORICAL_COMMIT, workflowSourceSHA: process.env.GITHUB_SHA ?? null, stdout: child.stdout ?? '', stderr: child.stderr ?? '', status: child.status, signal: child.signal, error: child.error ? String(child.error.message) : null };
  if (child.error || child.signal || child.status !== 0) { const error = new Error('Historical input child rejected: ' + script); error.historicalChild = raw; throw error; }
  return { result: JSON.parse(raw.stdout), rawChild: raw };
}
export function verifyNotes46EditorSaveFollowup(root, { requireCurrent = false } = {}) {
  assert.equal(typeof requireCurrent, 'boolean'); const context = currentAndHistorical(root);
  const token = context.historical.beginExecution('editor-save'); let result;
  try { result = historicalChild(context, 'scripts/verify-editor-save-followup.mjs', requireCurrent ? ['--require-current'] : []); } finally { context.historical.endExecution(token); }
  return wire('editor-save', context.current, context.historical, result);
}
export async function verifyNotes46SketchLayoutFollowups({ repoRoot } = {}) {
  assert.equal(typeof repoRoot, 'string'); const context = currentAndHistorical(repoRoot);
  const token = context.historical.beginExecution('sketch-layout'); let result;
  try {
    const module = await import(pathToFileURL(path.join(context.historical.root, 'scripts/verify-sketch-layout-followups.mjs')).href);
    result = await module.verifySketchLayoutFollowups({ repoRoot: context.historical.root });
  } finally { context.historical.endExecution(token); }
  return wire('sketch-layout', context.current, context.historical, result);
}

export async function runNotes46HistoricalPublicationControls(root, fixtureRoot, emit) {
  assert.equal(typeof emit, 'function'); const context = currentAndHistorical(root);
  const token = context.historical.beginExecution('historical551-controls'), events = []; let result;
  const record = (type, detail) => { events.push({ type, detail }); emit(type, { schema: 'rea-notes46-historical-control-event/v1', historicalInputCommit: HISTORICAL_COMMIT, actualCurrent46AcceptanceClaimed: false, historicalDetail: detail }); };
  try {
    const module = await import(pathToFileURL(path.join(context.historical.root, 'scripts/publication-integrity-controls.mjs')).href);
    result = await module.runPublicationControls(context.historical.root, fixtureRoot, record);
  } finally { context.historical.endExecution(token); }
  // Exact original result shape/count will be checked against its frozen roster
  // by the new publication collector. No current env identity is rebound to2a.
  context.current.recheck(); context.historical.recheck();
  return wire('historical551-controls', context.current, context.historical, { result, events });
}

// Standalone entry points have no surviving callable consumer after JSON output.
// Their owned historical copy can be disposed, while function APIs retain theirs.
export function finalizeNotes46ReaderCli(root, result) {
  assert.equal(typeof root, 'string'); root = path.resolve(root);
  const context = liveCliContexts.get(root.toLowerCase()); assert(context, 'A completed owned reader CLI context is required');
  context.current.recheck(); assertNotes46HistoricalInputRoot(context.historical);
  const closed = context.historical.summary(); assert.equal(closed.pendingOuterBoundary, false); assert.equal(closed.pendingExecutionBoundaries, 0);
  assert.equal(closed.contextStatus, 'available'); assert(closed.completedOuterBoundaries >= 1);
  assert.deepEqual(result.notes46CurrentSourceProof, context.current.summary());
  assert.deepEqual(result.historicalValidation.historicalInput, closed, 'CLI cleanup joins the exact raw completed historical input summary');
  const cleanup = context.historical.dispose(); assert.equal(cleanup.status, 'disposed');
  const raw = Buffer.from(JSON.stringify(closed));
  assert.deepEqual(cleanup.closedSummaryIdentity, { bytes: raw.length, sha256: createHash('sha256').update(raw).digest('hex') });
  liveCliContexts.delete(root.toLowerCase()); context.current.recheck();
  return { ...result, historicalCleanup: cleanup, standaloneHistoricalCopyDisposed: true };
}
