// New prospective Notes46 source/context controls only. The immutable historical
// 551 controls and their meanings remain separate and unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  createNotes46InstalledSourceView,
  createNotes46InstalledSourceViewFromRoot,
  assertNotes46InstalledSourceView,
  verifyNotes46InstalledSourceEnvelope,
  notes46InstalledSourceBudget
} from './notes46-installed-source-view.mjs';
import { assertNotes46HistoricalInputRoot } from './notes46-historical-input-root.mjs';
import { createNotes46EditorProofContext, verifyNotes46EditorValueApiProofBytes } from './notes46-current-proof-dispatch.mjs';
import { createNotes41AwareProofMigrationFromRoot } from './notes41-publication-source-view.mjs';

const MANIFEST = 'products/rea-studio/experiments/notes46-installed-search-20261019/INSTALLED-SOURCE.json';
const HELPER = 'scripts/notes46-installed-source-view.mjs';
const HISTORICAL_MANIFEST = 'products/rea-studio/experiments/notes41-publication-source-transition-20261019/SOURCE-TRANSITION.json';
const LEGACY_ONLY_PROOF = 'products/rea-studio/results/publication-git-directory-closure-20261015/preservation-manifest.json';
// WORK-ONLY UNFROZEN: the consolidator must set this externally reviewed helper
// identity, then independently review the entire new code/role/pin closure.
const FIXED_HELPER_PIN = Object.freeze({ path: HELPER, bytes: 25730, sha256: '0e58e01f055514638c3b664159ae135129d8dcfa037de76ff85fd978230a6c76' });
const id = bytes => ({ bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
const pin = row => ({ bytes: row.bytes, sha256: row.sha256 });
const clone = value => structuredClone(value);
const flip = bytes => { assert(Buffer.isBuffer(bytes) && bytes.length); const result = Buffer.from(bytes); result[0] ^= 1; return result; };

export const NOTES46_INSTALLED_SOURCE_CONTROL_ROSTER = Object.freeze([
  ['notes46-source-actual-root-positive', 'positive'],
  ['notes46-source-explicit-reader-positive', 'positive'],
  ['notes46-source-fresh-reader-rebind-positive', 'positive'],
  ['notes46-source-caller-pin-alias-retains-fixed-identity', 'positive'],
  ['notes46-source-caller-pin-alias-cannot-mask-manifest-change', 'negative'],
  ['notes46-source-accessor-wrong-copied-path-before-io', 'negative'],
  ['notes46-source-accessor-late-redirect-cannot-mask-manifest-change', 'negative'],
  ['notes46-source-constructor-current-byte-change', 'negative'],
  ['notes46-source-retained-reader-current-byte-change', 'negative'],
  ['notes46-source-supplied-reader-current-byte-change', 'negative'],
  ['notes46-source-retained-census-extra-current-path', 'negative'],
  ['notes46-source-retained-census-replaced-current-path', 'negative'],
  ['notes46-source-forged-frozen-view-before-callbacks', 'negative'],
  ['notes46-source-missing-explicit-source-reader', 'negative'],
  ['notes46-source-unlisted-source-read', 'negative'],
  ['notes46-source-envelope-exact-fixed-helper-positive', 'positive'],
  ['notes46-source-envelope-fixed-helper-byte-change', 'negative'],
  ['notes46-source-envelope-fixed-helper-path-change', 'negative'],
  ['notes46-source-envelope-missing-mandatory-row', 'negative'],
  ['notes46-source-envelope-duplicate-path-map', 'negative'],
  ['notes46-source-envelope-changed-source-payload-map', 'negative'],
  ['notes46-source-envelope-helper-individual-byte-cap', 'negative'],
  ['notes46-editor-pure-three-real-channels-positive', 'positive'],
  ['notes46-editor-retained-historical-reader-change-clean-replacement', 'negative'],
  ['notes46-editor-supplied-current-source-channel-change', 'negative'],
  ['notes46-editor-supplied-historical-source-channel-change', 'negative'],
  ['notes46-editor-legacy-only-proof-channel-change', 'negative'],
  ['notes46-editor-forged-frozen-context-before-io', 'negative'],
  ['notes46-editor-missing-explicit-historical-source-channel', 'negative'],
  ['notes46-editor-legacy-only-public-brand-positive', 'positive']
].map(([name, kind]) => Object.freeze({ name, kind })));

function safe(name) {
  assert(typeof name === 'string' && name && name.length <= 2048 && !name.startsWith('/') && !/[\\:\x00-\x1f\x7f<>"|?*]/.test(name));
  for (const part of name.split('/')) assert(part && part !== '.' && part !== '..' && !/[ .]$/.test(part) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part));
  return name;
}
function noLinks(filename) {
  let at = path.resolve(filename);
  for (;;) { assert(!fs.lstatSync(at).isSymbolicLink()); const parent = path.dirname(at); if (parent === at) break; at = parent; }
  assert.equal(fs.realpathSync(filename).toLowerCase(), path.resolve(filename).toLowerCase());
}
function read(root, name, maximum) {
  const filename = path.join(root, safe(name)), relative = path.relative(root, filename);
  assert(relative && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep));
  noLinks(filename); const stat = fs.lstatSync(filename); assert(stat.isFile() && stat.size <= maximum);
  const bytes = fs.readFileSync(filename); assert.equal(bytes.length, stat.size); return bytes;
}
function notesCensus(root, maximum) {
  const rows = [];
  function walk(name, depth = 0) {
    assert(depth <= 32); const directory = path.join(root, safe(name)); noLinks(directory); assert(fs.lstatSync(directory).isDirectory());
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'results') continue;
      assert(!entry.isSymbolicLink()); const child = name + '/' + entry.name;
      if (entry.isDirectory()) walk(child, depth + 1);
      else { assert(entry.isFile()); rows.push(safe(child)); assert(rows.length <= maximum); }
    }
  }
  walk('products/rea-studio/apps/notes'); return rows.sort();
}
function assertion(error, needle) {
  assert(error instanceof assert.AssertionError, 'The actual assertion must reject the owned mutation');
  assert(String(error.message).includes(needle), 'The rejection must identify the intended guard: ' + needle);
}

/** No materializer is invoked here. The producer supplies one already-acquired,
 * branded physical historical context, shared with the separate old551 batch. */
export async function runNotes46InstalledSourceControls(root, fixtureRoot, emit, { historicalContext } = {}) {
  assert.equal(typeof root, 'string'); assert.equal(typeof fixtureRoot, 'string'); assert.equal(typeof emit, 'function');
  root = path.resolve(root); fixtureRoot = path.resolve(fixtureRoot); noLinks(root); noLinks(fixtureRoot);
  const temporary = fs.realpathSync(process.env.RUNNER_TEMP), relative = path.relative(temporary, fixtureRoot);
  assert(relative && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep));
  assert(fs.lstatSync(fixtureRoot).isDirectory());
  assert(FIXED_HELPER_PIN.bytes > 0, 'WORK-ONLY current source-control helper pin is not frozen');
  const historical = assertNotes46HistoricalInputRoot(historicalContext);
  const rows = [], failures = [];
  const record = {
    schema: 'rea-notes46-installed-source-controls/v1', status: 'failed', sourceOnly: true,
    sourceEpoch: 'notes46-installed-any-wire-v1', expectedChecks: NOTES46_INSTALLED_SOURCE_CONTROL_ROSTER.length,
    actualCurrent46BehaviorAcceptanceClaimed: false, historical551ControlsIncluded: false,
    historicalReceiptsRebound: false, oldBudgetsChanged: false, helperPin: FIXED_HELPER_PIN,
    fixtureScope: 'Owned callback mutations over actual authenticated current46 and fixed physical historical2a bytes; no files are changed, no recorded callback replay.',
    rows, failures, fullParity: false, superiority: false
  };
  function execute(name, kind, operation) {
    assert.deepEqual({ name, kind }, NOTES46_INSTALLED_SOURCE_CONTROL_ROSTER[rows.length], 'Exact ordered new control roster');
    const row = { name, kind, passed: false };
    try { const observed = operation(); row.passed = true; if (observed !== undefined) row.observed = observed; }
    catch (error) { row.failure = { name: error.name, message: String(error.message).slice(0, 6000) }; failures.push({ name, ...row.failure }); }
    rows.push(row); emit('notes46-installed-source-control', row);
  }
  const positive = (name, action) => execute(name, 'positive', action);
  function negative(name, operation, inspect) {
    execute(name, 'negative', () => {
      let rejected = null;
      try { operation(); } catch (error) { rejected = error; }
      assert(rejected, 'Actual target operation must reject');
      // All target hits, callback counts and error-path checks are outside the
      // rejection capture. An unrelated setup failure cannot count as a pass.
      const observed = inspect(rejected);
      return { rejected: { name: rejected.name, message: String(rejected.message).slice(0, 2000) }, ...observed };
    });
  }
  try {
    const budget = notes46InstalledSourceBudget();
    assert.deepEqual(budget, { sourceRows: 158, manifestRows: 1, dataRows: 159, helperRows: 1, envelopeRows: 160, memberBytes: 512 * 1024, helperBytes: 256 * 1024, rawBytes: 8 * 1024 * 1024 });
    const actual = createNotes46InstalledSourceViewFromRoot(root), originalPin = actual.sourcePin(MANIFEST);
    const actualRead = name => actual.sourceRead(name), currentCensus = () => notesCensus(root, 47);
    const currentNames = currentCensus(); assert.equal(currentNames.length, 46);
    const target = 'products/rea-studio/apps/notes/server.mjs'; assert(actual.plan.currentNotesSources.some(row => row.path === target));
    const targetPin = actual.sourcePin(target), helperBytes = read(root, HELPER, budget.helperBytes); assert.deepEqual(id(helperBytes), pin(FIXED_HELPER_PIN));
    const sourceRows = actual.envelopeRows(); assert.equal(sourceRows.length, 159);
    const pure = (raw = actualRead, manifest = { ...originalPin }, census = currentCensus) => createNotes46InstalledSourceView(raw, manifest, census);
    const sourceError = (error, name) => assertion(error, 'Notes46 actual source identity: ' + name);

    positive('notes46-source-actual-root-positive', () => {
      actual.recheck(); const summary = actual.summary(); assert.equal(summary.currentNotesSources, 46); assert.equal(summary.authenticatedDataRows, 159);
      assert.equal(summary.censusKind, 'physical-directory'); assert.equal(summary.physicalDirectoryAcquisitionClaimed, true);
      return { currentNotesSources: 46, authenticatedDataRows: 159, physicalCensusRechecked: true };
    });
    positive('notes46-source-explicit-reader-positive', () => {
      const context = pure(); const summary = context.summary(); assert.equal(summary.currentSourceRows, 158); assert.equal(summary.censusKind, 'explicit-caller-census-function');
      assert.equal(summary.physicalDirectoryAcquisitionClaimed, false); assert(Object.isFrozen(context) && Object.isFrozen(context.plan) && Object.isFrozen(context.plan.currentSourceRows));
      return { genuineExplicitReaderAndCensus: true, actualSourceDataRows: 159 };
    });
    positive('notes46-source-fresh-reader-rebind-positive', () => {
      let reads = 0; const context = assertNotes46InstalledSourceView(actual, name => { reads++; return actualRead(name); }, currentCensus);
      assert.notEqual(context, actual); context.recheck(); assert(reads >= 159); assert.equal(context.summary().physicalDirectoryAcquisitionClaimed, false);
      return { freshSuppliedReaderConsumed: reads, physicalAcquisitionNotInherited: true };
    });
    positive('notes46-source-caller-pin-alias-retains-fixed-identity', () => {
      const callerPin = { ...originalPin }, context = pure(actualRead, callerPin);
      Object.assign(callerPin, { path: target, ...pin(targetPin) }); context.recheck(); assert.deepEqual(context.sourcePin(MANIFEST), originalPin);
      return { callerPinChanged: true, privateManifestPinStillExact: true };
    });
    {
      const callerPin = { ...originalPin }; let changed = false, manifestHits = 0;
      const context = pure(name => { if (name === MANIFEST && changed) { manifestHits++; return flip(actualRead(name)); } return actualRead(name); }, callerPin);
      Object.assign(callerPin, { path: target, ...pin(targetPin) }); changed = true;
      negative('notes46-source-caller-pin-alias-cannot-mask-manifest-change', () => context.recheck(), error => { sourceError(error, MANIFEST); assert(manifestHits > 0); return { actualManifestMutationHits: manifestHits }; });
    }
    {
      let getterReads = 0, sourceReads = 0, censusReads = 0;
      const accessor = { get path() { getterReads++; return getterReads === 1 ? target : MANIFEST; }, bytes: originalPin.bytes, sha256: originalPin.sha256 };
      negative('notes46-source-accessor-wrong-copied-path-before-io', () => pure(name => { sourceReads++; return actualRead(name); }, accessor, () => { censusReads++; return currentCensus(); }), error => {
        assert(error instanceof assert.AssertionError); assert.equal(error.actual, target); assert.equal(error.expected, MANIFEST);
        assert.equal(getterReads, 1); assert.equal(sourceReads, 0); assert.equal(censusReads, 0); return { getterReads, sourceReads, censusReads };
      });
    }
    {
      let getterReads = 0, manifestHits = 0, redirectedReads = 0; const redirect = 'scripts/notes46-unlisted-redirected-manifest.json';
      const accessor = { get path() { getterReads++; return getterReads <= 2 ? MANIFEST : redirect; }, bytes: originalPin.bytes, sha256: originalPin.sha256 };
      negative('notes46-source-accessor-late-redirect-cannot-mask-manifest-change', () => pure(name => {
        if (name === MANIFEST) { manifestHits++; return flip(actualRead(name)); }
        if (name === redirect) { redirectedReads++; return actualRead(MANIFEST); }
        return actualRead(name);
      }, accessor), error => { sourceError(error, MANIFEST); assert.equal(getterReads, 1); assert.equal(manifestHits, 1); assert.equal(redirectedReads, 0); return { getterReads, manifestHits, redirectedReads }; });
    }
    {
      let hits = 0;
      negative('notes46-source-constructor-current-byte-change', () => pure(name => { if (name === target) { hits++; return flip(actualRead(name)); } return actualRead(name); }), error => { sourceError(error, target); assert(hits > 0); return { targetMutationHits: hits, target }; });
    }
    {
      let changed = false, hits = 0; const context = pure(name => { if (name === target && changed) { hits++; return flip(actualRead(name)); } return actualRead(name); }); changed = true;
      negative('notes46-source-retained-reader-current-byte-change', () => context.recheck(), error => { sourceError(error, target); assert(hits > 0); return { targetMutationHits: hits, target }; });
    }
    {
      let hits = 0;
      negative('notes46-source-supplied-reader-current-byte-change', () => assertNotes46InstalledSourceView(actual, name => { if (name === target) { hits++; return flip(actualRead(name)); } return actualRead(name); }), error => { sourceError(error, target); assert(hits > 0); return { suppliedReaderMutationHits: hits, target }; });
    }
    {
      let changed = false, hits = 0; const context = pure(actualRead, { ...originalPin }, () => { if (changed) { hits++; return [...currentCensus(), 'products/rea-studio/apps/notes/unlisted-current-source.mjs']; } return currentCensus(); }); changed = true;
      negative('notes46-source-retained-census-extra-current-path', () => context.recheck(), error => { assert(error instanceof assert.AssertionError); assert.equal(error.actual, 47); assert.equal(error.expected, 46); assert(hits > 0); return { retainedCensusMutationHits: hits, observedPaths: 47, expectedPaths: 46 }; });
    }
    {
      let changed = false, hits = 0; const context = pure(actualRead, { ...originalPin }, () => { if (changed) { hits++; return [...currentCensus().slice(1), 'products/rea-studio/apps/notes/unlisted-current-source.mjs']; } return currentCensus(); }); changed = true;
      negative('notes46-source-retained-census-replaced-current-path', () => context.recheck(), error => { assertion(error, 'Actual eligible Notes46 source census'); assert(hits > 0); return { retainedCensusMutationHits: hits, countPreserved: 46 }; });
    }
    {
      let methodHits = 0, sourceHits = 0, censusHits = 0;
      const forged = Object.freeze({ plan: actual.plan, recheck() { methodHits++; }, sourceRead() { methodHits++; }, summary() { methodHits++; return actual.summary(); } });
      negative('notes46-source-forged-frozen-view-before-callbacks', () => assertNotes46InstalledSourceView(forged, () => { sourceHits++; }, () => { censusHits++; return currentNames; }), error => {
        assertion(error, 'Genuine Notes46 source-view brand required'); assert.equal(methodHits, 0); assert.equal(sourceHits, 0); assert.equal(censusHits, 0); return { methodHits, sourceHits, censusHits };
      });
    }
    negative('notes46-source-missing-explicit-source-reader', () => assertNotes46InstalledSourceView(actual, undefined), error => { assertion(error, 'Explicit physical sourceRead channel required'); return { missingReaderRejected: true }; });
    negative('notes46-source-unlisted-source-read', () => actual.sourceRead('scripts/notes46-not-selected.mjs'), error => { assertion(error, 'Unlisted Notes46 current-source read'); return { unknownPathRejected: true }; });

    positive('notes46-source-envelope-exact-fixed-helper-positive', () => {
      const result = verifyNotes46InstalledSourceEnvelope(actual, sourceRows, FIXED_HELPER_PIN, helperBytes);
      assert.equal(result.rows.length, 160); assert.equal(result.rows.at(-1).separateFixedHelperSource, true); assert.equal(result.historicalProfileBudgetRaised, false); assert(result.rawBytes <= budget.rawBytes);
      return { dataRows: 159, separatelyPinnedHelperRows: 1, envelopeRows: 160, rawBytes: result.rawBytes };
    });
    {
      const changed = flip(helperBytes);
      negative('notes46-source-envelope-fixed-helper-byte-change', () => verifyNotes46InstalledSourceEnvelope(actual, sourceRows, FIXED_HELPER_PIN, changed), error => {
        assert(error instanceof assert.AssertionError); assert.deepEqual(error.actual, id(changed)); assert.deepEqual(error.expected, pin(FIXED_HELPER_PIN)); return { actualChangedHelperIdentity: id(changed) };
      });
    }
    {
      const wrong = { ...FIXED_HELPER_PIN, path: 'scripts/notes46-wrong-helper.mjs' };
      negative('notes46-source-envelope-fixed-helper-path-change', () => verifyNotes46InstalledSourceEnvelope(actual, sourceRows, wrong, helperBytes), error => { assert(error instanceof assert.AssertionError); assert.equal(error.actual, wrong.path); assert.equal(error.expected, HELPER); return { wrongPath: wrong.path }; });
    }
    negative('notes46-source-envelope-missing-mandatory-row', () => verifyNotes46InstalledSourceEnvelope(actual, sourceRows.slice(1), FIXED_HELPER_PIN, helperBytes), error => { assert(error instanceof assert.AssertionError); assert.equal(error.actual, 158); assert.equal(error.expected, 159); return { attemptedDataRows: 158, requiredDataRows: 159 }; });
    {
      const changed = clone(sourceRows); changed[0] = clone(changed[1]);
      negative('notes46-source-envelope-duplicate-path-map', () => verifyNotes46InstalledSourceEnvelope(actual, changed, FIXED_HELPER_PIN, helperBytes), error => { assertion(error, 'Exact externally authenticated current46 path, identity and content map required'); assert.equal(error.actual[0].path, changed[1].path); return { targetedDuplicatePath: changed[1].path, rejectionLayer: 'exact externally authenticated content map' }; });
    }
    {
      const changed = clone(sourceRows), index = changed.findIndex(row => row.path === target); assert(index >= 0); changed[index].base64 = flip(actualRead(target)).toString('base64');
      negative('notes46-source-envelope-changed-source-payload-map', () => verifyNotes46InstalledSourceEnvelope(actual, changed, FIXED_HELPER_PIN, helperBytes), error => { assertion(error, 'Exact externally authenticated current46 path, identity and content map required'); assert.equal(error.actual[index].base64, changed[index].base64); return { targetedPath: target, rejectionLayer: 'exact externally authenticated content map' }; });
    }
    {
      const changed = Buffer.alloc(budget.helperBytes + 1);
      negative('notes46-source-envelope-helper-individual-byte-cap', () => verifyNotes46InstalledSourceEnvelope(actual, sourceRows, FIXED_HELPER_PIN, changed), error => { assert(error instanceof assert.AssertionError); assert.equal(error.actual, false); assert.equal(error.expected, true); assert.equal(changed.length, 256 * 1024 + 1); return { suppliedHelperBytes: changed.length, requiredCap: budget.helperBytes }; });
    }

    // Actual valid historical source/proof fixtures are acquired once by the
    // producer's branded context. Each negative owns callbacks, never disk edits.
    const historicalCensus = () => notesCensus(historical.root, 42);
    assert.equal(historicalCensus().length, 41);
    // The adopted context exposes its branded physical root, not a read method.
    // Its whole selected closure is rechecked before/after this owned batch;
    // individual old145/proof identities and independent IO budgets below still
    // authenticate every actual bounded physical read.
    const historicalRead = name => read(historical.root, name, 32 * 1024 * 1024);
    const historicalManifest = JSON.parse(historicalRead(HISTORICAL_MANIFEST));
    assert(!historicalManifest.currentSourceRows.some(row => row.path === LEGACY_ONLY_PROOF));
    function ioFixture(mutate = {}) {
      const seen = new Map(), sourceSeen = new Map(), historicalSeen = new Map(); let total = 0, sourceTotal = 0, historicalTotal = 0;
      const counts = { current: 0, historical: 0, proof: 0, list: 0, finish: 0 };
      const account = (map, name, bytes, maximumFiles, maximumBytes) => { if (map.has(name)) assert.deepEqual(id(bytes), map.get(name)); else { map.set(name, id(bytes)); assert(map.size <= maximumFiles); } assert(bytes.length <= maximumBytes); };
      const io = {
        sourceRead(name) { counts.current++; let bytes = actualRead(name); if (mutate.current) bytes = mutate.current(name, bytes); if (!sourceSeen.has(name)) sourceTotal += bytes.length; account(sourceSeen, name, bytes, 159, 512 * 1024); assert(sourceTotal <= 8 * 1024 * 1024); return bytes; },
        historicalSourceRead(name) { counts.historical++; let bytes = historicalRead(name); if (mutate.historical) bytes = mutate.historical(name, bytes); if (!historicalSeen.has(name)) historicalTotal += bytes.length; account(historicalSeen, name, bytes, 145, 512 * 1024); assert(historicalTotal <= 8 * 1024 * 1024); return bytes; },
        read(name) { counts.proof++; let bytes = historicalRead(name); if (mutate.proof) bytes = mutate.proof(name, bytes); if (!seen.has(name)) total += bytes.length; account(seen, name, bytes, 1200, 32 * 1024 * 1024); assert(total <= 256 * 1024 * 1024); return bytes; },
        list(name) {
          counts.list++; safe(name.replace(/\/$/, '')); const result = [];
          function visit(relative, depth = 0) { assert(depth <= 32); const directory = path.join(historical.root, safe(relative.replace(/\/$/, ''))); noLinks(directory); for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { assert(!entry.isSymbolicLink()); const child = relative + entry.name; safe(child); if (entry.isDirectory()) visit(child + '/', depth + 1); else { assert(entry.isFile()); result.push(child); assert(result.length <= 1200); } } }
          visit(name); return result;
        },
        finish() { counts.finish++; for (const [name, expected] of seen) assert.deepEqual(id(historicalRead(name)), expected, 'Unchanged legacy proof finish channel: ' + name); return { authenticatedFiles: seen.size, authenticatedBytes: total }; }
      };
      return { io, counts, sourceSeen, historicalSeen, seen };
    }
    const editorContext = createNotes46EditorProofContext(actual, historicalRead, historicalCensus);
    positive('notes46-editor-pure-three-real-channels-positive', () => {
      const { io, counts, sourceSeen, historicalSeen, seen } = ioFixture(), result = verifyNotes46EditorValueApiProofBytes(io, { installedSourceContext: editorContext });
      assert.equal(result.schema, 'rea-notes46-editor-pure-current-and-historical/v1'); assert.equal(result.threeChannelsIndependentlyAuthenticated, true); assert.equal(result.notes46CurrentSourceProof.authenticatedDataRows, 159);
      assert.equal(result.historicalValidation.inputCommit, '2a8482b42784eb262d6d5b82e62d8d1220dc4821'); assert.equal(result.historicalValidation.current46AcceptanceClaimed, false);
      assert.equal(sourceSeen.size, 159); assert.equal(historicalSeen.size, 145); assert(seen.size > 0); assert.equal(counts.finish, 1);
      return { channels: clone(counts), currentDistinct: sourceSeen.size, historicalDistinct: historicalSeen.size, unchangedProofDistinct: seen.size, unchangedProofCap: 1200 };
    });
    {
      let changed = false, hits = 0; const retained = createNotes46EditorProofContext(actual, name => { const bytes = historicalRead(name); if (name === HISTORICAL_MANIFEST && changed) { hits++; return flip(bytes); } return bytes; }, historicalCensus); changed = true;
      const fixture = ioFixture();
      negative('notes46-editor-retained-historical-reader-change-clean-replacement', () => verifyNotes46EditorValueApiProofBytes(fixture.io, { installedSourceContext: retained }), error => { assertion(error, 'Explicit new-publication source identity: ' + HISTORICAL_MANIFEST); assert(hits > 0); assert.equal(fixture.counts.historical, 0); assert.equal(fixture.counts.proof, 0); return { retainedHistoricalMutationHits: hits, cleanReplacementHistoricalReads: fixture.counts.historical, proofReads: fixture.counts.proof }; });
    }
    {
      let hits = 0; const fixture = ioFixture({ current(name, bytes) { if (name === target) { hits++; return flip(bytes); } return bytes; } });
      negative('notes46-editor-supplied-current-source-channel-change', () => verifyNotes46EditorValueApiProofBytes(fixture.io, { installedSourceContext: editorContext }), error => { sourceError(error, target); assert(hits > 0); assert.equal(fixture.counts.proof, 0); return { currentChannelMutationHits: hits, proofReads: fixture.counts.proof }; });
    }
    {
      let hits = 0; const fixture = ioFixture({ historical(name, bytes) { if (name === HISTORICAL_MANIFEST) { hits++; return flip(bytes); } return bytes; } });
      negative('notes46-editor-supplied-historical-source-channel-change', () => verifyNotes46EditorValueApiProofBytes(fixture.io, { installedSourceContext: editorContext }), error => { assertion(error, 'Explicit new-publication source identity: ' + HISTORICAL_MANIFEST); assert(hits > 0); assert.equal(fixture.counts.proof, 0); return { historicalChannelMutationHits: hits, proofReads: fixture.counts.proof }; });
    }
    {
      let hits = 0; const fixture = ioFixture({ proof(name, bytes) { if (name === LEGACY_ONLY_PROOF) { hits++; return flip(bytes); } return bytes; } });
      negative('notes46-editor-legacy-only-proof-channel-change', () => verifyNotes46EditorValueApiProofBytes(fixture.io, { installedSourceContext: editorContext }), error => { assertion(error, LEGACY_ONLY_PROOF); assert(hits > 0); assert.equal(fixture.historicalSeen.size, 145); return { physicalProofMutationHits: hits, targetedProof: LEGACY_ONLY_PROOF, historicalSourceDistinct: fixture.historicalSeen.size }; });
    }
    {
      let hits = 0; const forged = Object.freeze({ ...editorContext }), fakeIO = Object.fromEntries(['read', 'list', 'finish', 'sourceRead', 'historicalSourceRead'].map(name => [name, () => { hits++; throw new Error('Forged context must not reach callbacks'); }]));
      negative('notes46-editor-forged-frozen-context-before-io', () => verifyNotes46EditorValueApiProofBytes(fakeIO, { installedSourceContext: forged }), error => { assertion(error, 'Genuine Notes46 editor proof context required'); assert.equal(hits, 0); return { allCallbackHits: hits }; });
    }
    {
      const fixture = ioFixture(); delete fixture.io.historicalSourceRead;
      negative('notes46-editor-missing-explicit-historical-source-channel', () => verifyNotes46EditorValueApiProofBytes(fixture.io, { installedSourceContext: editorContext }), error => { assertion(error, 'Historical145 source data has its own explicit bounded channel'); assert(fixture.counts.current > 0); assert.equal(fixture.counts.historical, 0); assert.equal(fixture.counts.proof, 0); return { actualCurrentReads: fixture.counts.current, historicalReads: fixture.counts.historical, proofReads: fixture.counts.proof }; });
    }
    positive('notes46-editor-legacy-only-public-brand-positive', () => {
      const legacyMigration = createNotes41AwareProofMigrationFromRoot(historical.root), fixture = ioFixture();
      const legacyIO = { ...fixture.io, sourceRead: fixture.io.historicalSourceRead };
      const result = verifyNotes46EditorValueApiProofBytes(legacyIO, { sourceMigration: legacyMigration });
      assert.equal(result.schema, 'rea-notes46-editor-pure-legacy-only/v1'); assert.equal(result.actualNotes46SourceAuthenticated, false);
      assert.equal(result.historicalValidation.callerOwnedHistoricalProofChannel, true); assert(fixture.counts.proof > 0); assert.equal(fixture.counts.current, 0); assert.equal(fixture.counts.finish, 1);
      return { originalPublicBrandAccepted: true, actualCurrent46Claimed: false, channels: clone(fixture.counts) };
    });

    actual.recheck(); historical.recheck();
    assert.equal(rows.length, NOTES46_INSTALLED_SOURCE_CONTROL_ROSTER.length); assert.deepEqual(rows.map(({ name, kind }) => ({ name, kind })), NOTES46_INSTALLED_SOURCE_CONTROL_ROSTER);
    record.checks = rows.length; record.positive = rows.filter(row => row.kind === 'positive').length; record.negative = rows.filter(row => row.kind === 'negative').length;
    record.passed = rows.filter(row => row.passed).length; record.failed = failures.length; assert.equal(record.positive, 7); assert.equal(record.negative, 23);
    record.actualSourceBudget = budget; record.currentAndHistoricalContextsRecheckedAfterAllControls = true;
    record.coverageLimits = ['Exactly these30 named new source/context guards; old551 count/bodies are unchanged and not included.', 'Envelope payload/path mutations reject at the exact externally authenticated map layer; later decoding/collision/aggregate branches are not relabeled independently covered.', 'No current46 application behavior, full-product parity, performance, visual quality, original-app or browser execution is performed by this module.'];
    if (!failures.length) record.status = 'passed';
  } catch (error) { record.setupOrCompletionFailure = { name: error.name, message: String(error.message).slice(0, 6000) }; }
  record.checks ??= rows.length; record.positive ??= rows.filter(row => row.kind === 'positive').length; record.negative ??= rows.filter(row => row.kind === 'negative').length;
  record.passed ??= rows.filter(row => row.passed).length; record.failed ??= rows.filter(row => !row.passed).length;
  record.notAttempted = NOTES46_INSTALLED_SOURCE_CONTROL_ROSTER.slice(rows.length).map(row => row.name);
  const output = path.join(fixtureRoot, 'notes46-installed-source-controls.json'); assert(!fs.existsSync(output));
  const bytes = Buffer.from(JSON.stringify(record, null, 2) + '\n'); assert(bytes.length <= 2 * 1024 * 1024); fs.writeFileSync(output, bytes, { flag: 'wx' }); assert.deepEqual(fs.readFileSync(output), bytes);
  return record;
}
