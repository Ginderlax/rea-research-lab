// Pure bounded source-data adapter for a new publication epoch. No app imports,
// test process, source overlay, metadata write or behavioral acceptance occurs.
// The immutable Notes36 migration implementation and every old assertion stay.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, lstatSync, realpathSync, readdirSync } from 'node:fs';
import { resolve as resolvePath, relative, sep } from 'node:path';
import { createEditorVaultProofMigration } from './editor-vault-proof-migration.mjs';

const prefix = 'products/rea-studio/experiments/notes41-publication-source-transition-20261019';
const manifestPath = prefix + '/SOURCE-TRANSITION.json';
// The final source-reviewed transition pin is set only after all source rows freeze.
const FROM_ROOT_MANIFEST = { path: manifestPath, bytes: 115875, sha256: '225e5765582e6f57ab49c50df64ff5714d121bdbf921f1d40efeddded7934856' };
const awareContexts = new WeakMap();
const sourceViewCensus = new WeakMap();
function deepFreeze(value) { if (value && typeof value === 'object' && !Object.isFrozen(value)) { for (const item of Object.values(value)) deepFreeze(item); Object.freeze(value); } return value; }
const readerNames = [
  'scripts/verify-records.mjs',
  'scripts/verify-followup-records.mjs',
  'scripts/verify-archive-integration-records.mjs',
  'scripts/verify-editor-save-followup.mjs',
  'scripts/verify-notes-layout-value-api-checkpoint.mjs',
  'scripts/verify-notes-inline-followups.mjs',
  'scripts/verify-notes-vault-followups.mjs',
  'scripts/verify-editor-value-api-followups.mjs',
  'scripts/audit-proof-delivery.mjs',
].sort();
const producerName = 'scripts/verify-cloud-publication.mjs';
const controlsName = 'scripts/publication-integrity-controls.mjs';
const identity = bytes => ({ bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
const metadata = row => ({ bytes: row.bytes, sha256: row.sha256 });
const equal = (left, right) => left.bytes === right.bytes && left.sha256 === right.sha256;
const historicalNames = [
  '.github/workflows/notes-new-todo-installed-cloud.yml',
  'products/rea-studio/apps/notes/README.md',
  'products/rea-studio/apps/notes/client.mjs',
  'products/rea-studio/apps/notes/server.mjs',
  'products/rea-studio/apps/notes/todo.integration.test.mjs',
  'products/rea-studio/server.mjs',
];
function safe(name) {
  assert(typeof name === 'string' && name.length && name.length < 4096);
  assert(!/[\\:\x00-\x1f\x7f]/.test(name) && !name.startsWith('/'));
  assert(name.split('/').every(part => part && part !== '.' && part !== '..'));
  return name;
}
function pin(row, maximum = 512 * 1024) {
  assert(row && typeof row === 'object'); safe(row.path);
  assert(Number.isSafeInteger(row.bytes) && row.bytes >= 0 && row.bytes <= maximum);
  assert(/^[0-9a-f]{64}$/.test(row.sha256));
  if (row.gitBlob !== undefined) assert(/^[0-9a-f]{40}$/.test(row.gitBlob));
  return row;
}

export function createNotes41PublicationSourceView(rawRead, externallyPinnedManifest, actualLiveNotesPaths) {
  assert.equal(typeof rawRead, 'function');
  assert.equal(externallyPinnedManifest.path, manifestPath);
  pin(externallyPinnedManifest, 256 * 1024);
  const observed = new Map(); let rawBytes = 0;
  function authenticated(row) {
    pin(row); const bytes = rawRead(row.path);
    assert(Buffer.isBuffer(bytes) && bytes.length <= 512 * 1024);
    assert.deepEqual(identity(bytes), metadata(row), 'Explicit new-publication source identity: ' + row.path);
    if (observed.has(row.path)) assert.deepEqual(identity(bytes), observed.get(row.path), 'Source changed during proof reads');
    else {
      observed.set(row.path, identity(bytes)); rawBytes += bytes.length;
      assert(observed.size <= 132 && rawBytes <= 8 * 1024 * 1024, 'Separate Notes41 publication source budget');
    }
    return bytes;
  }
  const planBytes = authenticated(externallyPinnedManifest), plan = JSON.parse(planBytes);
  assert.equal(plan.schema, 'rea-notes41-publication-source-transition/v3');
  assert.equal(plan.status, 'reviewed-frozen-source-transition', 'An authoring plan is not an accepted frozen source binding');
  assert.equal(plan.sourceOnly, true); assert.equal(plan.actualInstalledBehaviorAccepted, false);
  assert.equal(plan.publicationAcceptancePreclaimed, false); assert.equal(plan.historicalReceiptsRebound, false);
  assert.equal(plan.sourceEpoch, 'notes41-installed-recovery-r2-publication-nine-readers');
  assert.equal(plan.oldNotes36Source, '698d2e301765d1b878fb251b3d59dadb5a3c9bac');
  assert.equal(plan.currentSourceRowsRequired, 114);
  assert.equal(plan.currentSourceRows.length, plan.currentSourceRowsRequired);
  assert.equal(plan.currentNotesSources.length, 41);
  assert.equal(plan.supportingSourceRowsRequired, 60);
  assert.equal(plan.supportingSources.length, plan.supportingSourceRowsRequired);
  assert.equal(plan.currentRecordReaders.length, 9);
  assert.deepEqual(plan.currentRecordReaders.map(row => row.path).sort(), readerNames);
  assert.deepEqual(plan.currentSourceRows, [
    ...plan.currentNotesSources, ...plan.supportingSources, plan.commonHost,
    plan.currentDeclaration, plan.installedCollector, plan.installedWorkflow, ...plan.currentRecordReaders,
  ]);
  assert.equal(plan.currentDeclaration.path, 'products/rea-studio/experiments/notes-draft-recovery-installed/NOTES41-SOURCE-R2.json');
  assert.equal(plan.commonHost.path, 'products/rea-studio/server.mjs');
  assert.equal(plan.installedCollector.path, 'products/rea-studio/scripts/verify-notes41-installed-cloud-r2.mjs');
  assert.equal(plan.installedWorkflow.path, '.github/workflows/notes-draft-recovery-installed-cloud.yml');
  assert.deepEqual(plan.oldProofBudgetsUnchanged, {
    currentNotes36Objects: 60, currentNotes36RawBytes: 695900,
    currentNotes36ObjectLimit: 64, currentNotes36IndividualByteLimit: 262144,
    currentNotes36ByteLimit: 8388608, toolingObjects: 12, oldArtifactRoles: 95,
  });
  assert.deepEqual(plan.separateNewSourceBudget, {
    currentSourceRows: 114, historicalRuntimeCarrierRows: 6, historicalReaderCarrierRows: 9,
    historicalProducerCarrierRows: 1, historicalControlsCarrierRows: 1, externalManifestRows: 1, authenticatedDataRows: 132,
    dataFileLimit: 132, individualByteLimit: 524288, helperSelfRows: 1,
    helperIndividualByteLimit: 262144, combinedEnvelopeRows: 133, rawByteLimit: 8388608,
  });
  assert.equal(plan.oldArtifactRoleSetPreserved, true);
  assert.equal(plan.newArtifactRole, 'notes41-current-sources.json.gz.snapshot');
  assert.equal(plan.newCombinedArtifactRoles, 96);
  const current = new Map(), lower = new Set();
  for (const row of plan.currentSourceRows) {
    pin(row); assert(!current.has(row.path) && !lower.has(row.path.toLowerCase()));
    assert.notEqual(row.path, manifestPath, 'Manifest identity must be externally pinned');
    assert(![producerName, 'scripts/publication-integrity-controls.mjs', 'scripts/notes41-publication-source-view.mjs'].includes(row.path), 'No producer/helper/manifest source hash cycle');
    current.set(row.path, row); lower.add(row.path.toLowerCase()); authenticated(row);
  }
  const appNames = plan.currentNotesSources.map(row => row.path).sort();
  assert(appNames.every(name => name.startsWith('products/rea-studio/apps/notes/') && !name.split('/').includes('results')));
  assert.equal(new Set(appNames).size, 41);
  const liveCensus = typeof actualLiveNotesPaths === 'function' ? actualLiveNotesPaths : null;
  function checkActualNames(names) {
    assert(Array.isArray(names)); assert.equal(names.length, 41);
    assert.equal(new Set(names).size, 41);
    assert.deepEqual([...names].sort(), appNames, 'Actual current Notes41 directory closure');
    return Object.freeze([...names]);
  }
  const actualCensusSnapshot = checkActualNames(liveCensus ? liveCensus() : actualLiveNotesPaths);
  const currentDeclaration = JSON.parse(authenticated(plan.currentDeclaration));
  assert.equal(currentDeclaration.schema, plan.currentDeclarationSchema);
  assert.equal(plan.currentDeclarationSchema, 'rea-notes41-installed-source-declaration/v2');
  assert.equal(currentDeclaration.sourceOnly, true);
  assert.equal(currentDeclaration.installedAcceptancePreclaimed, false);
  assert.equal(currentDeclaration.selfIdentityContained, false);
  assert.equal(currentDeclaration.externalDeclarationPinRequired, true);
  assert.equal(currentDeclaration.currentNotesFiles, 41);
  assert.deepEqual(currentDeclaration.currentNotesSources, plan.currentNotesSources);
  assert.deepEqual(currentDeclaration.supportingSources, plan.supportingSources);
  assert.deepEqual(currentDeclaration.commonServer, plan.commonHost);
  const routes = new Map();
  assert.equal(plan.historical36RoutesRequired, 6); assert.equal(plan.historical36Routes.length, 6);
  assert.equal(plan.historicalRecordReaderRoutes.length, 9);
  assert.deepEqual(plan.historicalRecordReaderRoutes.map(row => row.logicalPath).sort(), readerNames);
  assert.deepEqual(plan.historical36Routes.map(row => row.logicalPath).sort(), historicalNames);
  for (const row of [...plan.historical36Routes, ...plan.historicalRecordReaderRoutes]) {
    assert.equal(row.historicalEpoch, plan.oldNotes36Source);
    assert(current.has(row.logicalPath));
    assert.deepEqual(row.current, metadata(current.get(row.logicalPath)));
    const carrierKind = historicalNames.includes(row.logicalPath) ? 'historical36' : 'historical-readers';
    assert.equal(row.carrier.path, prefix + '/' + carrierKind + '/' + row.logicalPath + '.snapshot');
    pin(row.carrier, 256 * 1024); assert.deepEqual(metadata(row.carrier), row.before);
    assert(!equal(row.before, row.current), 'A historical route must distinguish its two source epochs');
    assert(!current.has(row.carrier.path) && !routes.has(row.logicalPath));
    authenticated(row.carrier); routes.set(row.logicalPath, row);
  }
  const producerRoute = plan.historicalPublicationProducer;
  assert(producerRoute && producerRoute.logicalPath === producerName);
  assert.equal(producerRoute.historicalEpoch, plan.oldNotes36Source);
  assert.deepEqual(producerRoute.before, { bytes: 79976, sha256: '7093aac7045aaea5fc31c1354ff222f530d32c1c0bd42ba6860d01ef1a083128' });
  assert.equal(producerRoute.carrier.path, prefix + '/historical-publication/' + producerName + '.snapshot');
  pin(producerRoute.carrier, 256 * 1024); assert.deepEqual(metadata(producerRoute.carrier), producerRoute.before);
  assert(!current.has(producerRoute.carrier.path) && !routes.has(producerName));
  authenticated(producerRoute.carrier);
  const controlsRoute = plan.historicalPublicationControls;
  assert(controlsRoute && controlsRoute.logicalPath === controlsName);
  assert.equal(controlsRoute.historicalEpoch, plan.oldNotes36Source);
  assert.deepEqual(controlsRoute.before, { bytes: 74921, sha256: '6178c7eedc355b2f5e9ba9be009d6558b0fcf99158803437268289682ee1b51d' });
  assert.equal(controlsRoute.carrier.path, prefix + '/historical-publication/' + controlsName + '.snapshot');
  pin(controlsRoute.carrier, 256 * 1024); assert.deepEqual(metadata(controlsRoute.carrier), controlsRoute.before);
  assert(!current.has(controlsRoute.carrier.path) && !routes.has(controlsName));
  authenticated(controlsRoute.carrier);
  const dataRows = new Map([[manifestPath, externallyPinnedManifest], ...current, ...[...routes.values()].map(row => [row.carrier.path, row.carrier]), [producerRoute.carrier.path, producerRoute.carrier], [controlsRoute.carrier.path, controlsRoute.carrier]]);
  assert.equal(dataRows.size, 132, '114 current +15 named runtime/reader carriers +one producer carrier +one controls carrier +one manifest');
  assert.equal(new Set([...dataRows.keys()].map(name => name.toLowerCase())).size, 132, 'No case-insensitive source aliases');
  assert.equal(observed.size, 132);
  deepFreeze(plan);
  function recheck() {
    if (liveCensus) checkActualNames(liveCensus());
    authenticated(externallyPinnedManifest);
    for (const row of current.values()) authenticated(row);
    for (const row of routes.values()) authenticated(row.carrier);
    authenticated(producerRoute.carrier);
    authenticated(controlsRoute.carrier);
    assert.equal(observed.size, 132);
  }
  function legacyRead(name) {
    safe(name); if (name === producerName) return authenticated(producerRoute.carrier);
    if (name === controlsName) return authenticated(controlsRoute.carrier);
    const route = routes.get(name);
    if (route) {
      // Reading the actual current bytes first preserves old logical-path
      // mutation controls. A carrier can never hide a changed current source.
      authenticated(current.get(name));
      return authenticated(route.carrier);
    }
    return rawRead(name);
  }
  function resolve(name, expected, previousResolve) {
    safe(name); assert.equal(typeof previousResolve, 'function');
    const now = current.get(name), old = routes.get(name);
    const namedCurrent = old || name.startsWith('products/rea-studio/apps/notes/') && !name.slice('products/rea-studio/apps/notes/'.length).split('/').includes('results') || name === 'products/rea-studio/server.mjs';
    // Supporting proof files do not acquire new resolver semantics. In particular,
    // unrelated SHA-only requirement rows keep the exact previous resolver API.
    if (!namedCurrent) return previousResolve(name, expected);
    assert(expected && /^[0-9a-f]{64}$/.test(expected.sha256), 'Named source epoch requires explicit SHA256 identity');
    if (expected.bytes !== undefined) assert(Number.isSafeInteger(expected.bytes) && expected.bytes >= 0 && expected.bytes <= 32 * 1024 * 1024);
    const matches = trusted => trusted.sha256 === expected.sha256 && (expected.bytes === undefined || trusted.bytes === expected.bytes);
    // Omitted byte counts can only select an exact externally pinned current or
    // old36 SHA. Its mandatory physical read still authenticates the pinned size.
    if (now && matches(metadata(now))) { authenticated(now); return null; }
    if (old && matches(old.before)) { authenticated(now); authenticated(old.carrier); return old.carrier.path; }
    const prior = previousResolve(name, expected);
    assert(prior !== null, 'Unknown current41 or historical36 source identity');
    return prior;
  }
  function summary() {
    recheck();
    return {
      schema: 'rea-notes41-publication-source-proof/v2', sourceOnly: true,
      sourceEpoch: plan.sourceEpoch, currentNotesSources: 41, supportingSources: plan.supportingSourceRowsRequired,
      currentRows: 114, historical36CarrierRows: 6, historicalRecordReaderRows: 9, historicalProducerCarrierRows: 1, historicalControlsCarrierRows: 1, authenticatedDataRows: observed.size,
      authenticatedDataBytes: rawBytes, fileLimit: 132, individualByteLimit: 524288, byteLimit: 8388608,
      combinedEnvelopeRowsWithSeparateHelper: 133, separateHelperIndividualByteLimit: 262144,
      currentSourceChannelSeparateFromLegacyProofReads: true,
      actualDirectoryCensusKind: liveCensus ? 'live-rechecked-acquisition' : 'fixed-caller-snapshot',
      actualDirectoryCensusRechecked: liveCensus !== null,
      helperSelfIsSeparateFixedRow: true, currentDirectoryClosureRequired: true,
      oldNotes36ProofRemainsHistorical: true, old36BudgetsUnchanged: true,
      currentGitBlobAuthenticationRequiredByCaller: true,
      historicalReceiptsRebound: false, productExecutions: 0, originalExecutions: 0,
      installedBehaviorAccepted: false, fullParity: false, superiority: false,
    };
  }
  function envelopeRows() {
    recheck();
    return [
      ...plan.currentSourceRows.map(row => ({ path: row.path, ...metadata(row), base64: authenticated(row).toString('base64'), sourceEpoch: plan.sourceEpoch, currentSource: true })),
      ...[...plan.historical36Routes, ...plan.historicalRecordReaderRoutes].map(row => ({ path: row.carrier.path, logicalPath: row.logicalPath, ...metadata(row.carrier), base64: authenticated(row.carrier).toString('base64'), sourceEpoch: plan.oldNotes36Source, historicalView: true })),
      { path: producerRoute.carrier.path, logicalPath: producerName, ...metadata(producerRoute.carrier), base64: authenticated(producerRoute.carrier).toString('base64'), sourceEpoch: plan.oldNotes36Source, historicalPublicationProducer: true },
      { path: controlsRoute.carrier.path, logicalPath: controlsName, ...metadata(controlsRoute.carrier), base64: authenticated(controlsRoute.carrier).toString('base64'), sourceEpoch: plan.oldNotes36Source, historicalPublicationControls: true },
      { path: manifestPath, ...metadata(externallyPinnedManifest), base64: authenticated(externallyPinnedManifest).toString('base64'), externallyPinnedManifest: true },
    ];
  }
  const view = Object.freeze({ plan, legacyRead, resolve, recheck, summary, envelopeRows,
    // Actual source bytes only. This channel never projects a historical logical
    // name and has its own fixed132-object source-data budget.
    sourceRead(name) { safe(name); const row = dataRows.get(name); assert(row, 'Unlisted separate source-data read: ' + name); return authenticated(row); },
    legacyPhysicalReadPath(name) {
      safe(name);
      if (name === producerName) { authenticated(producerRoute.carrier); return producerRoute.carrier.path; }
      if (name === controlsName) { authenticated(controlsRoute.carrier); return controlsRoute.carrier.path; }
      const route = routes.get(name); if (!route) return null;
      authenticated(current.get(name)); authenticated(route.carrier); return route.carrier.path;
    },
    historicalReadPath(name, expected) {
      const route = routes.get(name) ?? (name === producerName ? producerRoute : name === controlsName ? controlsRoute : null);
      assert(route && equal(route.before, expected), 'Only exact named Notes36 predecessor identities can be projected');
      if (current.has(name)) authenticated(current.get(name));
      authenticated(route.carrier); return route.carrier.path;
    },
  });
  sourceViewCensus.set(view, { liveCensus, actualCensusSnapshot });
  return view;
}

function awareMigration(legacy, view) {
  const context = Object.freeze({
    ...legacy,
    resolve(name, expected) { return view.resolve(name, expected, legacy.resolve); },
    summary() { return { ...legacy.summary(), notes41PublicationSourceProof: view.summary(), notes36SummaryIsHistoricalSourceProjection: true }; },
    notes41SourceView: view,
  });
  awareContexts.set(context, { legacy, view });
  return context;
}

// Pure readers explicitly supply two channels: io.sourceRead authenticates actual
// current/source-carrier bytes; io.read keeps the original historical proof-byte
// assertions and counters. Neither channel silently substitutes for the other.
export function assertNotes41AwareProofMigration(context, sourceRead, proofRead) {
  assert(context && typeof context === 'object' && awareContexts.has(context) && Object.isFrozen(context), 'A real frozen current-source context is required');
  assert.equal(typeof sourceRead, 'function', 'Explicit physical current-source channel is required');
  assert.equal(typeof proofRead, 'function', 'Explicit historical proof-carrier channel is required');
  const stored = awareContexts.get(context);
  stored.view.recheck();
  const census = sourceViewCensus.get(stored.view);
  assert(census, 'The authenticated source context must retain its actual acquisition provenance');
  const next = createNotes41PublicationSourceView(sourceRead, FROM_ROOT_MANIFEST, census.liveCensus ?? census.actualCensusSnapshot);
  // Reconstruct every legacy mandatory proof assertion against the supplied
  // proof channel. Reusing old root-bound closures would mask io.read mutations.
  const legacy = createEditorVaultProofMigration(name => proofRead(next.legacyPhysicalReadPath(name) ?? name));
  return awareMigration(legacy, next);
}

export function createNotes41AwareProofMigration(rawRead, externallyPinnedManifest, actualLiveNotesPaths) {
  const view = createNotes41PublicationSourceView(rawRead, externallyPinnedManifest, actualLiveNotesPaths);
  const legacy = createEditorVaultProofMigration(view.legacyRead);
  return awareMigration(legacy, view);
}

export function createNotes41PublicationSourceViewFromRoot(root) {
  const base = realpathSync(resolvePath(root));
  function reader(name) {
    safe(name); let at = base;
    for (const component of name.split('/')) {
      at = resolvePath(at, component); assert(!lstatSync(at).isSymbolicLink(), 'Source-view reparse path');
    }
    const target = realpathSync(at), rel = relative(base, target);
    assert(rel && rel !== '..' && !rel.startsWith('..' + sep) && !rel.startsWith(sep));
    const stat = lstatSync(at); assert(stat.isFile() && stat.size <= 32 * 1024 * 1024);
    const bytes = readFileSync(at); assert.equal(bytes.length, stat.size); return bytes;
  }
  // The physical acquisition function survives in the context and is invoked
  // again on every recheck/bind. A manifest list never substitutes for a census.
  function actualNotesPaths() {
    const paths = [];
    function notesNames(name) {
    safe(name); const filename = resolvePath(base, ...name.split('/'));
    assert(!lstatSync(filename).isSymbolicLink(), 'Current Notes reparse path');
    for (const entry of readdirSync(filename, { withFileTypes: true })) {
      assert(!entry.isSymbolicLink()); if (entry.isDirectory() && entry.name === 'results') continue;
      const child = name + '/' + entry.name; safe(child);
      if (entry.isDirectory()) notesNames(child);
      else { assert(entry.isFile()); paths.push(child); assert(paths.length <= 41); }
    }
  }
    notesNames('products/rea-studio/apps/notes');
    return paths;
  }
  return createNotes41PublicationSourceView(reader, FROM_ROOT_MANIFEST, actualNotesPaths);
}

// This explicit wrapper invokes the old proof validator. The source-only factory
// above authenticates source data and a real census without invoking it. The ESM
// import remains an actual source dependency and is separately captured by audit.
export function createNotes41AwareProofMigrationFromRoot(root) {
  const view = createNotes41PublicationSourceViewFromRoot(root);
  const legacy = createEditorVaultProofMigration(view.legacyRead);
  return awareMigration(legacy, view);
}
export function notes41PublicationTransitionPin() { return { ...FROM_ROOT_MANIFEST }; }

export function verifyNotes41PublicationArtifactRoles(names, verifyExactOldRoles) {
  assert.equal(typeof verifyExactOldRoles, 'function');
  assert(Array.isArray(names)); assert.equal(names.length, 96); assert.equal(new Set(names).size, 96);
  const newRole = 'notes41-current-sources.json.gz.snapshot';
  assert.equal(names.filter(name => name === newRole).length, 1);
  const oldRoles = names.filter(name => name !== newRole);
  assert.equal(oldRoles.length, 95); assert.equal(verifyExactOldRoles(oldRoles), true);
  return true;
}

// Actual producer and controls share this guard. Its expected helper identity
// comes from the producer's fixed literal, never from hashing an untrusted helper
// to redefine its own expected SHA. The helper is separate from all132 data rows.
export function verifyNotes41PublicationHelperRow(bytes, externallyPinnedHelper, authenticatedDataRows) {
  assert(externallyPinnedHelper && externallyPinnedHelper.path === 'scripts/notes41-publication-source-view.mjs');
  pin(externallyPinnedHelper, 256 * 1024);
  assert(Buffer.isBuffer(bytes) && bytes.length <= 256 * 1024, 'Fixed helper individual byte limit');
  assert.deepEqual(identity(bytes), metadata(externallyPinnedHelper), 'Externally pinned helper bytes');
  assert(Array.isArray(authenticatedDataRows)); assert.equal(authenticatedDataRows.length, 132);
  const names = new Set(); let total = bytes.length;
  for (const row of authenticatedDataRows) {
    pin(row); const folded = row.path.toLowerCase();
    assert(!names.has(folded), 'Duplicate source-data path'); names.add(folded);
    assert.notEqual(folded, externallyPinnedHelper.path.toLowerCase(), 'Helper cannot overlap the132 data rows');
    total += row.bytes; assert(total <= 8 * 1024 * 1024, 'Combined data and helper raw byte limit');
  }
  assert.equal(names.size + 1, 133, 'Exact132 mandatory data rows plus one fixed helper');
  return { path: externallyPinnedHelper.path, ...metadata(externallyPinnedHelper), base64: bytes.toString('base64'), separateFixedHelperSource: true };
}


// Named historical937 source context only. This projects exactly one old host
// source within that old source census; it never changes the current source
// proof or installs a process-wide filesystem adapter.
const HISTORICAL937_HOST = Object.freeze({
  path: 'products/rea-studio/server.mjs',
  bytes: 7840,
  sha256: '85fe09b1b52a1d91e9d09c85d99c6e768ac4b793f5d7694a1760a4c0560a0a94',
});
const HISTORICAL937_VM_SOURCE = Object.freeze({bytes: 5784, sha256: 'f8e6931ecf46bcd6e68c2effa610eceef34d8848ec2febcb7e7118b08164ba78'});
const historical937VmFilename = 'exact-reviewed-root-historical937-control.mjs';

export function createNotes41Historical937ReadContext(root, sourceMigration, io = { readFileSync, lstatSync }) {
  assert(sourceMigration && awareContexts.has(sourceMigration), 'A real current-source context is mandatory before an old937 projection');
  assert(io && typeof io.readFileSync === 'function' && typeof io.lstatSync === 'function');
  const stored = awareContexts.get(sourceMigration), view = stored.view;
  const census = sourceViewCensus.get(view);
  assert(census && typeof census.liveCensus === 'function', 'Historical937 context requires a retained census acquisition callback');
  view.recheck();
  const route = view.plan.historical36Routes.find(row => row.logicalPath === HISTORICAL937_HOST.path);
  assert(route); assert.deepEqual(route.before, metadata(HISTORICAL937_HOST));
  assert.equal(route.carrier.path, prefix + '/historical36/' + HISTORICAL937_HOST.path + '.snapshot');
  const base = realpathSync(resolvePath(root));
  const logicalHost = resolvePath(base, ...HISTORICAL937_HOST.path.split('/'));
  const physicalHost = resolvePath(base, ...route.carrier.path.split('/'));
  // The caller may supply the old306 owned negative resolver. Every other old
  // path keeps that exact resolver, so its thirteen-route allowlist still tests
  // the original implementation and rejects an injected fourteenth route.
  const delegate = io.sourceProofMigration ?? sourceMigration;
  assert(delegate && typeof delegate.resolve === 'function');
  function physicalPath(filename) {
    assert.equal(typeof filename, 'string');
    if (resolvePath(filename).toLowerCase() !== logicalHost.toLowerCase()) return filename;
    assert.equal(view.historicalReadPath(HISTORICAL937_HOST.path, HISTORICAL937_HOST), route.carrier.path);
    return physicalHost;
  }
  const projectedResolver = Object.freeze({
    resolve(name, expected) {
      if (name !== HISTORICAL937_HOST.path) return delegate.resolve(name, expected);
      assert(expected && expected.bytes === HISTORICAL937_HOST.bytes && expected.sha256 === HISTORICAL937_HOST.sha256, 'Only the exact old937 shared-host identity can be projected');
      assert.equal(view.historicalReadPath(name, expected), route.carrier.path);
      // Within the old Notes36 source view, this source was unchanged. Adding it
      // as a modern migration route would falsify the retained13/724 census.
      return null;
    },
  });
  return Object.freeze({
    sourceProofMigration: projectedResolver,
    resolve: projectedResolver.resolve,
    readFileSync(filename, ...args) { return io.readFileSync(physicalPath(filename), ...args); },
    lstatSync(filename, ...args) { return io.lstatSync(physicalPath(filename), ...args); },
    recheck() { view.recheck(); },
    summary() {
      view.recheck();
      return { schema: 'rea-notes41-named-historical937-host-context/v1', sourceOnly: true,
        oldHostLogicalPath: HISTORICAL937_HOST.path, oldHostPhysicalPath: route.carrier.path,
        historicalHost: metadata(HISTORICAL937_HOST), actualCurrentSourceGroupAuthenticatedSeparately: true,
        historicalCensusSourceView: 'Notes36 source projection with one fixed physical host carrier',
        sourceCensusAcquisition: 'Retained caller callback; FromRoot supplies the actual physical enumerator. An arbitrary callback alone does not prove disk acquisition.',
        extraMigrationRoutesAdded: 0, realPhysicalCarrierStatRequired: true,
        globalFilesystemAdapter: false, historicalReceiptRebound: false,
        currentProductBehaviorAccepted: false, fullParity: false, superiority: false };
    },
  });
}

// Preserve every old306 control body byte for byte. Only this exact old source
// block may receive the named context; all five other VM scripts keep the native
// Script implementation and their original context/read behavior.
export function createNotes41Historical937VmFacade(nativeVm, root, sourceMigration) {
  assert(nativeVm && typeof nativeVm.Script === 'function');
  function Script(code, options) {
    if (options?.filename !== historical937VmFilename) return new nativeVm.Script(code, options);
    assert.equal(typeof code, 'string');
    assert.deepEqual(identity(Buffer.from(code, 'utf8')), HISTORICAL937_VM_SOURCE, 'Only the immutable exact reviewed937 control block is eligible');
    const compiled = new nativeVm.Script(code, options);
    return Object.freeze({
      runInNewContext(context, runOptions) {
        assert(context && typeof context === 'object');
        const scoped = createNotes41Historical937ReadContext(root, sourceMigration, {
          readFileSync: context.readFileSync, lstatSync: context.lstatSync,
          sourceProofMigration: context.sourceProofMigration,
        });
        try {
          return compiled.runInNewContext({ ...context,
            readFileSync: scoped.readFileSync, lstatSync: scoped.lstatSync,
            sourceProofMigration: scoped.sourceProofMigration,
          }, runOptions);
        } finally { scoped.recheck(); }
      },
    });
  }
  return Object.freeze({Script});
}
