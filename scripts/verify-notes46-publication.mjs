// New installed46 publication epoch. Old551 executes unchanged against its
// separately authenticated physical2a subject, under the real current GHA env.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { spawn, spawnSync } from 'node:child_process';
import { createNotes46InstalledSourceViewFromRoot, verifyNotes46InstalledSourceEnvelope, projectNotes46CurrentPublicationRepeat, notes46InstalledSourceBudget } from './notes46-installed-source-view.mjs';
import { prepareNotes46HistoricalInputRoot } from './notes46-historical-input-root.mjs';
import { runNotes46HistoricalPublicationControls } from './notes46-current-proof-dispatch.mjs';
import { runNotes46InstalledSourceControls } from './notes46-installed-source-controls.mjs';
import { runNotes46PublicationRepeatControls } from './notes46-publication-repeat-controls.mjs';
import { createHistoricalCarrierPolicyFromRoot } from './historical-carrier-policy.mjs';

// Fixed external helper identity. This producer is an
// external captured role, so its helper pin cannot form a manifest hash cycle.
const CURRENT_SOURCE_PARENT = 'cee2da08f7ebe81a003a6cc9828655794be48cb0';
const REVIEWED_SOURCE_GRANDPARENT = '40c7df91936aaf9574801aa38c5a635f299e6e39';
const HISTORICAL_COMMIT = '2a8482b42784eb262d6d5b82e62d8d1220dc4821';
const HELPER_PIN = Object.freeze({ path: 'scripts/notes46-installed-source-view.mjs', bytes: 22964, sha256: '4dca3e3b0cd32102af4809139730ffd4d5c9263487b46244ea7e32cb5d5720c6' });
const MANIFEST = 'products/rea-studio/experiments/notes46-installed-search-20261019/INSTALLED-SOURCE.json';
const DERIVED = Object.freeze(['PUBLICATION-MANIFEST.json', 'VALIDATION.json']);
const WORKFLOW = '.github/workflows/notes46-installed-search-publication-cloud.yml';
const EXTERNAL_CURRENT_SOURCES = Object.freeze([
  HELPER_PIN.path, 'scripts/verify-notes46-publication.mjs', 'scripts/verify-cloud-publication.mjs',
  'scripts/notes46-installed-source-controls.mjs', 'scripts/notes46-publication-repeat-controls.mjs',
  'scripts/audit-notes46-installed-delivery.mjs', 'scripts/audit-proof-delivery.mjs', WORKFLOW
]);
// Populated by source-data authoring from the156-row reviewed source plan.
const CURRENT_SOURCE_PATHS = Object.freeze([
  "products/rea-studio/apps/notes/README.md",
  "products/rea-studio/apps/notes/app.integration.test.mjs",
  "products/rea-studio/apps/notes/app.test.mjs",
  "products/rea-studio/apps/notes/client.mjs",
  "products/rea-studio/apps/notes/core.mjs",
  "products/rea-studio/apps/notes/draft-recovery-test-fixture.mjs",
  "products/rea-studio/apps/notes/draft-recovery.http.test.mjs",
  "products/rea-studio/apps/notes/draft-recovery.mjs",
  "products/rea-studio/apps/notes/draft-recovery.test.mjs",
  "products/rea-studio/apps/notes/draft-recovery.ui.test.mjs",
  "products/rea-studio/apps/notes/fixtures/oracle-verification.json",
  "products/rea-studio/apps/notes/fixtures/pinned-joplin.jex",
  "products/rea-studio/apps/notes/fixtures/pinned-joplin.json",
  "products/rea-studio/apps/notes/interop-fixture-tool.mjs",
  "products/rea-studio/apps/notes/jex.mjs",
  "products/rea-studio/apps/notes/jex.test.mjs",
  "products/rea-studio/apps/notes/markdown.mjs",
  "products/rea-studio/apps/notes/new-todo-original.test.mjs",
  "products/rea-studio/apps/notes/new-todo.integration.test.mjs",
  "products/rea-studio/apps/notes/new-todo.test.mjs",
  "products/rea-studio/apps/notes/new-todo.ui.test.mjs",
  "products/rea-studio/apps/notes/notebook-confirmation-cancel-open-note.ui.test.mjs",
  "products/rea-studio/apps/notes/notebook-confirmation.ui.test.mjs",
  "products/rea-studio/apps/notes/notebook-original-oracle.mjs",
  "products/rea-studio/apps/notes/notebook-trash-fresh-boundaries.test.mjs",
  "products/rea-studio/apps/notes/notebook-trash-original-oracle.mjs",
  "products/rea-studio/apps/notes/notebook-trash-publication-boundaries.test.mjs",
  "products/rea-studio/apps/notes/notebook-trash-review-fixture.mjs",
  "products/rea-studio/apps/notes/notebook-trash-review.test.mjs",
  "products/rea-studio/apps/notes/notebook-trash.integration.test.mjs",
  "products/rea-studio/apps/notes/notebook-trash.mjs",
  "products/rea-studio/apps/notes/notebook-trash.test.mjs",
  "products/rea-studio/apps/notes/notebook-trash.ui.test.mjs",
  "products/rea-studio/apps/notes/notebooks.integration.test.mjs",
  "products/rea-studio/apps/notes/notebooks.mjs",
  "products/rea-studio/apps/notes/notebooks.test.mjs",
  "products/rea-studio/apps/notes/search-query-original.test.mjs",
  "products/rea-studio/apps/notes/search-query.integration.test.mjs",
  "products/rea-studio/apps/notes/search-query.mjs",
  "products/rea-studio/apps/notes/search-query.test.mjs",
  "products/rea-studio/apps/notes/search-query.ui.test.mjs",
  "products/rea-studio/apps/notes/server.mjs",
  "products/rea-studio/apps/notes/todo-original.test.mjs",
  "products/rea-studio/apps/notes/todo.integration.test.mjs",
  "products/rea-studio/apps/notes/todo.test.mjs",
  "products/rea-studio/apps/notes/todo.ui.test.mjs",
  "products/rea-studio/experiments/notes-search-grammar/COPYING",
  "products/rea-studio/experiments/notes-search-grammar/NOTICE.txt",
  "products/rea-studio/experiments/notes-search-grammar/original/LICENSE",
  "products/rea-studio/experiments/notes-search-grammar/original/packages/lib/services/search/filterParser.ts",
  "products/rea-studio/experiments/notes-search-grammar/original/packages/lib/services/search/queryBuilder.ts",
  "products/rea-studio/experiments/notes-search-grammar/original/packages/lib/services/search/SearchEngine.ts",
  "products/rea-studio/experiments/notes-search-grammar/original/readme/apps/search.md",
  "products/rea-studio/experiments/notes-search-grammar/original/retained-notebook-release-provenance.json",
  "products/rea-studio/experiments/notes-search-grammar/SOURCE-PROVENANCE.json",
  "products/rea-studio/experiments/notes-search-grammar/STUDY-PLAN.json",
  ".github/workflows/development-cloud.yml",
  ".github/workflows/notes-new-todo-installed-cloud.yml",
  "products/rea-studio/browser-tests/browser-metadata.json",
  "products/rea-studio/browser-tests/notes-draft-recovery-installed-legacy-r2-roster.json",
  "products/rea-studio/browser-tests/notes-draft-recovery-installed-legacy-r2.spec.mjs",
  "products/rea-studio/browser-tests/notes-draft-recovery-installed-legacy-roster.json",
  "products/rea-studio/browser-tests/notes-draft-recovery-installed-legacy.spec.mjs",
  "products/rea-studio/browser-tests/notes-draft-recovery.spec.mjs",
  "products/rea-studio/browser-tests/notes-draft-recovery.storage.spec.mjs",
  "products/rea-studio/browser-tests/package-lock.json",
  "products/rea-studio/browser-tests/package.json",
  "products/rea-studio/browser-tests/playwright.notes-draft-recovery-installed-legacy-r2.config.mjs",
  "products/rea-studio/browser-tests/playwright.notes-draft-recovery-installed-legacy.config.mjs",
  "products/rea-studio/browser-tests/playwright.notes-draft-recovery.config.mjs",
  "products/rea-studio/experiments/notes-draft-recovery-installed-r2/legacy8/README.md",
  "products/rea-studio/experiments/notes-draft-recovery-installed-r2/legacy8/TRANSITION.json",
  "products/rea-studio/experiments/notes-draft-recovery-installed-r2/legacy8/notes-draft-recovery-installed-legacy-roster.json.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed-r2/legacy8/notes-draft-recovery-installed-legacy.spec.mjs.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed-r2/legacy8/playwright.notes-draft-recovery-installed-legacy.config.mjs.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed-r2/legacy8/retained8-r2-source-binding.diff.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed-r2/review/full-r2-independent-peer-final-r4.json",
  "products/rea-studio/experiments/notes-draft-recovery-installed-r2/review/full-r2-source-authority-final-r4.json",
  "products/rea-studio/experiments/notes-draft-recovery-installed-r2/review/root-product-r4-independent-source-peer.json",
  "products/rea-studio/experiments/notes-draft-recovery-installed/FULL-REGRESSION-FLOOR-R2.json",
  "products/rea-studio/experiments/notes-draft-recovery-installed/FULL-REGRESSION-FLOOR.json",
  "products/rea-studio/experiments/notes-draft-recovery-installed/INSTALLED-REGRESSION-FLOOR-R2.json",
  "products/rea-studio/experiments/notes-draft-recovery-installed/full-baseline-1119.tap.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/full-r2/draft-recovery.ui.test.mjs.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/full/development-cloud.yml.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/historical36/notes-new-todo-installed-cloud.yml.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/legacy8/README.md",
  "products/rea-studio/experiments/notes-draft-recovery-installed/legacy8/TRANSITION.json",
  "products/rea-studio/experiments/notes-draft-recovery-installed/legacy8/legacy8-complete-test-body.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/legacy8/legacy8-source-binding.diff.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/legacy8/notes-new-todo-roster.json.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/legacy8/notes-new-todo.spec.mjs.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/legacy8/notes-readme-two-edit.diff.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/legacy8/playwright.notes-new-todo.config.mjs.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/NOTES41-SOURCE.ff3.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/OWNED-OPEN-ROOT-SOURCE-AUTHORITY-R4.json.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/OWNED-OPEN-TRANSITION-R2.json",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/README.md",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/client.mjs.ff3.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/development-cloud.yml.ff3.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/draft-recovery.ui.test.mjs.ff3.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/draft-recovery.ui.test.mjs.r2.append.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/notes-draft-recovery-installed-cloud.yml.ff3.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/verify-notes41-installed-cloud.mjs.ff3.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/source/README.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/todo.integration.test.mjs.before.snapshot",
  "products/rea-studio/results/notes36-source-transition-20261016/current-source-declaration.json",
  "products/rea-studio/scripts/notes-draft-recovery-regression-floor.json",
  "products/rea-studio/scripts/verify-cloud-browser.mjs",
  "products/rea-studio/scripts/verify-notes-draft-recovery-cloud.mjs",
  "products/rea-studio/scripts/verify-notes-draft-recovery-installed-full-r2.mjs",
  "products/rea-studio/scripts/verify-notes-draft-recovery-installed-full.mjs",
  "products/rea-studio/scripts/verify-notes36-cloud.mjs",
  "products/rea-studio/scripts/verify-notes36-installed-cloud.mjs",
  "products/rea-studio/scripts/verify-notes41-legacy-browser-results-r2.mjs",
  "products/rea-studio/scripts/verify-notes41-legacy-browser-results.mjs",
  "products/rea-studio/server.mjs",
  "products/rea-studio/experiments/notes-draft-recovery-installed/NOTES41-SOURCE-R2.json",
  "products/rea-studio/scripts/verify-notes41-installed-cloud-r2.mjs",
  ".github/workflows/notes-draft-recovery-installed-cloud.yml",
  "scripts/verify-records.mjs",
  "scripts/verify-followup-records.mjs",
  "scripts/verify-archive-integration-records.mjs",
  "scripts/verify-editor-save-followup.mjs",
  "scripts/verify-notes-layout-value-api-checkpoint.mjs",
  "scripts/verify-notes-inline-followups.mjs",
  "scripts/verify-notes-vault-followups.mjs",
  "scripts/verify-editor-value-api-followups.mjs",
  "scripts/audit-proof-delivery.mjs",
  "scripts/verify-sketch-layout-followups.mjs",
  "products/rea-studio/apps/sketch/README.md",
  "products/rea-studio/apps/sketch/client.mjs",
  "products/rea-studio/apps/sketch/layout-original-oracle.mjs",
  "products/rea-studio/apps/sketch/layout-ui-fixture.mjs",
  "products/rea-studio/apps/sketch/layout-ui.test.mjs",
  "products/rea-studio/apps/sketch/layout.mjs",
  "products/rea-studio/apps/sketch/layout.test.mjs",
  "products/rea-studio/apps/sketch/precision.test.mjs",
  "products/rea-studio/tests/sketch-layout-static-route.test.mjs",
  "scripts/sketch-layout-proof/proof-verifier.mjs",
  "scripts/sketch-layout-proof/public-proof-loader.mjs",
  "scripts/notes46-current-proof-dispatch.mjs",
  "scripts/notes46-historical-input-root.mjs",
  "products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/editor-vault-proof-migration.mjs",
  "products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/notes41-publication-source-view.mjs",
  "products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-archive-integration-records.mjs",
  "products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-editor-value-api-followups.mjs",
  "products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-followup-records.mjs",
  "products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-notes-inline-followups.mjs",
  "products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-notes-layout-value-api-checkpoint.mjs",
  "products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-notes-vault-followups.mjs",
  "scripts/notes41-publication-source-view.mjs",
  "scripts/editor-vault-proof-migration.mjs",
  "products/rea-studio/experiments/notes46-installed-search-20261019/historical-input/TREE-DESCRIPTOR.json",
  "scripts/notes46-historical-record-predicates.mjs",
  "scripts/historical-carrier-policy.mjs"
]);
const LIMITS = Object.freeze({ files: 96, rawEvidenceBytes: 48 * 1024 * 1024, memberBytes: 8 * 1024 * 1024,
  sourceRawBytes: 8 * 1024 * 1024, sourceJSONBytes: 12 * 1024 * 1024, sourceMemberBytes: 512 * 1024,
  fullPayloadBytes: 2 * 1024 * 1024 * 1024, fullPayloadFiles: 40000, fullPayloadMemberBytes: 32 * 1024 * 1024,
  manifestChunkBytes: 4 * 1024 * 1024, manifestChunks: 4, eventsBytes: 4 * 1024 * 1024,
  childStdoutBytes: 4 * 1024 * 1024, childStderrBytes: 1024 * 1024, allChildRawBytes: 32 * 1024 * 1024, childDeadlineMs: 30 * 60 * 1000 });
const id = bytes => ({ bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
function safe(name) { assert(typeof name === 'string' && name && name.length < 4096 && !name.startsWith('/') && !/[\\:\x00-\x1f\x7f<>"|?*]/.test(name)); assert(name.split('/').every(part => part && part !== '.' && part !== '..' && !/[ .]$/.test(part))); return name; }
function noLinks(filename) { for (let at = path.resolve(filename);;) { assert(!fs.lstatSync(at).isSymbolicLink()); const parent = path.dirname(at); if (at === parent) break; at = parent; } assert.equal(fs.realpathSync(filename).toLowerCase(), path.resolve(filename).toLowerCase()); }
function inside(root, filename) { const relative = path.relative(root, filename); return relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative); }
function git(root, argv, maximum = 16 * 1024 * 1024) {
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.toUpperCase().startsWith('GIT_'))), GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never', GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0' };
  const result = spawnSync('git', ['--no-replace-objects', '-C', root, ...argv], { encoding: null, env, shell: false, windowsHide: true, timeout: 120000, maxBuffer: maximum });
  assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr?.toString().slice(0, 4096)); assert.equal(result.signal, null); return result.stdout;
}
function tree(root) {
  const rows = new Map(), lowerNames = new Set(); const raw = git(root, ['ls-tree', '-r', '-l', '-z', '--full-tree', 'HEAD']);
  for (const line of raw.toString('utf8').split('\0').filter(Boolean)) {
    const match = /^(\d{6}) blob ([0-9a-f]{40}) +([0-9]+)\t(.+)$/.exec(line); assert(match && match[1] === '100644');
    const name = safe(match[4]); assert(!rows.has(name) && !lowerNames.has(name.toLowerCase())); lowerNames.add(name.toLowerCase());
    rows.set(name, { path: name, gitBlob: match[2], bytes: Number(match[3]) }); assert(rows.size <= LIMITS.fullPayloadFiles);
  }
  return rows;
}
function physical(root, name, maximum) {
  const filename = path.resolve(root, ...safe(name).split('/')); assert(inside(root, filename)); noLinks(filename);
  const before = fs.lstatSync(filename); assert(before.isFile() && before.size <= maximum);
  const bytes = fs.readFileSync(filename), after = fs.lstatSync(filename); assert(after.isFile()); assert.equal(before.ino, after.ino); assert.equal(before.dev, after.dev); assert.equal(before.mtimeMs, after.mtimeMs); assert.equal(bytes.length, before.size); assert.equal(bytes.length, after.size); return bytes;
}
function hosted(root) {
  assert.equal(process.platform, 'win32'); assert.equal(process.arch, 'x64'); assert.equal(process.version, 'v24.16.0');
  for (const [name, value] of Object.entries({ CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', RUNNER_OS: 'Windows', RUNNER_ARCH: 'X64', GITHUB_REPOSITORY: 'Ginderlax/rea-research-lab', GITHUB_SERVER_URL: 'https://github.com', GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/experiment/notes46-installed-search-20261019', GITHUB_JOB: 'publication-integrity' })) assert.equal(process.env[name], value, name);
  assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA ?? '')); for (const name of ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) assert(/^[1-9][0-9]*$/.test(process.env[name] ?? ''));
  assert.equal(git(root, ['rev-parse', 'HEAD']).toString().trim(), process.env.GITHUB_SHA);
  assert.equal(git(root, ['rev-list', '--parents', '-n', '1', 'HEAD']).toString().trim(), process.env.GITHUB_SHA + ' ' + CURRENT_SOURCE_PARENT);
  assert.equal(git(root, ['rev-list', '--parents', '-n', '1', CURRENT_SOURCE_PARENT]).toString().trim(), CURRENT_SOURCE_PARENT + ' ' + REVIEWED_SOURCE_GRANDPARENT);
  assert.equal(git(root, ['rev-list', '--parents', '-n', '1', REVIEWED_SOURCE_GRANDPARENT]).toString().trim(), REVIEWED_SOURCE_GRANDPARENT + ' ' + HISTORICAL_COMMIT);
  assert.equal(git(root, ['status', '--porcelain=v1', '--untracked-files=all', '-z']).length, 0);
  assert(path.isAbsolute(process.env.RUNNER_TEMP)); noLinks(process.env.RUNNER_TEMP);
}

export async function runNotes46Publication({ repoRoot, evidence }) {
  assert(typeof repoRoot === 'string' && path.isAbsolute(repoRoot)); const root = path.resolve(repoRoot); noLinks(root); hosted(root);
  const temporary = fs.realpathSync(process.env.RUNNER_TEMP), expected = path.join(temporary, 'rea-notes46-publication-' + process.env.GITHUB_RUN_ID + '-' + process.env.GITHUB_RUN_ATTEMPT);
  assert.equal(path.resolve(evidence), expected); assert(!inside(root, expected) && inside(temporary, expected)); assert(!fs.existsSync(expected)); fs.mkdirSync(expected); noLinks(expected);
  const committed = tree(root), written = new Map(); let writtenBytes = 0, eventBytes = 0, allChildRawBytes = 0, sequence = 0, historical, outer, current;
  const receipt = { schema: 'rea-notes46-hosted-current-publication-attempt/v1', status: 'running', sourceCommit: process.env.GITHUB_SHA,
    repository: process.env.GITHUB_REPOSITORY, runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT, job: process.env.GITHUB_JOB,
    startedAt: new Date().toISOString(), phase: 'source-capture-before', sourceOverlay: false, currentNotesSourceFiles: 46,
    scope: 'Actual current full publication integrity plus separately authenticated complete historical predicates/551 and new current source controls; behavior tests are separate jobs.',
    comprehensiveRepositoryAcceptanceClaimed: false, historicalReceiptsRebound: false, currentProductBehaviorExecuted: false, fullParity: false, superiority: false, phases: [] };
  function write(name, bytes) {
    safe(name); assert(Buffer.isBuffer(bytes) && bytes.length <= LIMITS.memberBytes && !written.has(name.toLowerCase()));
    const filename = path.join(expected, name); fs.mkdirSync(path.dirname(filename), { recursive: true }); noLinks(path.dirname(filename)); fs.writeFileSync(filename, bytes, { flag: 'wx' }); assert.deepEqual(physical(expected, name, LIMITS.memberBytes), bytes);
    written.set(name.toLowerCase(), { path: name, ...id(bytes) }); writtenBytes += bytes.length; assert(written.size <= LIMITS.files && writtenBytes <= LIMITS.rawEvidenceBytes); return { path: name, ...id(bytes) };
  }
  function json(name, value) { return write(name, Buffer.from(JSON.stringify(value, null, 2) + '\n')); }
  function save() {
    const bytes = Buffer.from(JSON.stringify(receipt, null, 2) + '\n'); assert(bytes.length <= LIMITS.memberBytes);
    const filename = path.join(expected, 'attempt-validation.json'), scratch = filename + '.tmp'; fs.writeFileSync(scratch, bytes, { flag: 'wx' }); fs.renameSync(scratch, filename);
  }
  function event(type, detail = {}) {
    const bytes = Buffer.from(JSON.stringify({ detail, type, schema: 'rea-notes46-owned-publication-event/v1', sequence: ++sequence,
      sourceCommit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT, job: process.env.GITHUB_JOB, at: new Date().toISOString() }) + '\n');
    eventBytes += bytes.length; assert(eventBytes <= LIMITS.eventsBytes); fs.appendFileSync(path.join(expected, 'events.jsonl'), bytes, { flag: sequence === 1 ? 'wx' : 'a' });
  }
  function envelope(name, schema, rows, metadata) {
    const rawBytes = rows.reduce((sum, row) => sum + row.bytes, 0); assert(rawBytes <= LIMITS.sourceRawBytes);
    const raw = Buffer.from(JSON.stringify({ schema, workflow: { sourceCommit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT, job: process.env.GITHUB_JOB }, rawBytes, rows, role: metadata }));
    assert(raw.length <= LIMITS.sourceJSONBytes); const stored = gzipSync(raw, { level: 9, mtime: 0 }); assert(stored.length <= LIMITS.memberBytes);
    const output = write(name, stored); const decoded = gunzipSync(physical(expected, name, LIMITS.memberBytes), { maxOutputLength: LIMITS.sourceJSONBytes }); assert.deepEqual(decoded, raw);
    return { ...output, decoded: id(raw), rows: rows.length, rawSourceBytes: rawBytes };
  }
  function captureCurrent(label) {
    const names = [...new Set([...CURRENT_SOURCE_PATHS, MANIFEST, ...EXTERNAL_CURRENT_SOURCES])].sort();
    assert.equal(CURRENT_SOURCE_PATHS.length, notes46InstalledSourceBudget().sourceRows);
    assert.equal(new Set(CURRENT_SOURCE_PATHS).size, CURRENT_SOURCE_PATHS.length);
    for (const name of EXTERNAL_CURRENT_SOURCES) assert(names.includes(name));
    // Audit CLI is both a mandatory current-data reader and an explicit outer
    // execution role. One physical content row carries both roles; neveromitit.
    assert(CURRENT_SOURCE_PATHS.includes('scripts/audit-proof-delivery.mjs'));
    assert.equal(names.length, new Set([...CURRENT_SOURCE_PATHS, MANIFEST, ...EXTERNAL_CURRENT_SOURCES]).size);
    const rows = [], failures = []; let bytes = 0;
    for (const name of names) {
      try {
        const remaining = LIMITS.sourceRawBytes - bytes; assert(remaining >= 0, 'Aggregate source capacity before physical read');
        const content = physical(root, name, Math.min(LIMITS.sourceMemberBytes, remaining)); bytes += content.length; assert(bytes <= LIMITS.sourceRawBytes);
        const row = { path: name, ...id(content), base64: content.toString('base64'), gitBlob: committed.get(name)?.gitBlob ?? null };
        rows.push(row); assert(committed.has(name) && blob(content) === committed.get(name).gitBlob, 'Current source differs from actual Git: ' + name);
      } catch (error) { failures.push({ path: name, error: String(error.message).slice(0, 2048) }); }
    }
    const proof = envelope('current-source-' + label + '.json.gz.snapshot', 'rea-notes46-actual-current-source-and-external-roles/v1', rows,
      { fixedPathRoster: names, contentCapturedBeforeSourceHelperAcceptance: label === 'before', allCurrentGitBlobsAuthenticated: failures.length === 0, failures });
    assert.equal(failures.length, 0, 'Actual source capture/authentication failed; partial raw evidence retained'); return { rows, proof };
  }
  function chunks(label, bytes) {
    assert(Buffer.isBuffer(bytes) && bytes.length <= LIMITS.manifestChunkBytes * LIMITS.manifestChunks); const rows = [];
    for (let at = 0; at < bytes.length; at += LIMITS.manifestChunkBytes) rows.push(write('derived/' + label + '.part-' + String(rows.length + 1).padStart(2, '0') + '.snapshot', bytes.subarray(at, at + LIMITS.manifestChunkBytes)));
    const rebuilt = Buffer.concat(rows.map(row => physical(expected, row.path, LIMITS.manifestChunkBytes))); assert.deepEqual(rebuilt, bytes);
    return json('derived/' + label + '.chunks.json', { schema: 'rea-exact-bounded-raw-file-chunks/v1', sourcePath: label, whole: id(bytes), chunks: rows, chunkBytes: LIMITS.manifestChunkBytes, rawReadbackExact: true });
  }
  function payload(label) {
    const policy = createHistoricalCarrierPolicyFromRoot(root), rows = []; let total = 0;
    const forbidden = /(^|\/)(artifacts|node_modules|tooling|__pycache__|work|\.local)(\/|$)|\.(exe|dll|zip|tgz|bundle|tar|7z|pyc)$/i;
    const credentials = /\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[0-9A-Z]{16})\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
    for (const row of committed.values()) {
      if (DERIVED.includes(row.path)) continue;
      const content = physical(root, row.path, LIMITS.fullPayloadMemberBytes), pin = { path: row.path, ...id(content) }; total += content.length;
      assert(total <= LIMITS.fullPayloadBytes && content.length === row.bytes && blob(content) === row.gitBlob);
      assert(!forbidden.test(row.path) || row.path === 'products/rea-studio/apps/archive/fixtures/zstd/native-zip93.zip' && pin.sha256 === 'e9282f76dbd3c080d0e12ef95489458523ebbc65c2951f4b8f3cb880a16c5d8b' || policy.allows(pin));
      assert(!credentials.test(content.toString('utf8')), 'Credential-shaped current payload: ' + row.path); rows.push(pin);
      if (rows.length % 1000 === 0) event('payload-progress', { label, files: rows.length, bytes: total });
    }
    rows.sort((a, b) => a.path.localeCompare(b.path)); return { rows, bytes: total, identity: id(Buffer.from(JSON.stringify(rows))) };
  }
  async function child(name, argv) {
    const phase = { name, sourceCommit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT, job: process.env.GITHUB_JOB,
      status: 'running', startedAtUtc: new Date().toISOString(), completedAtUtc: null, exitCode: null, signal: null, closeObserved: false, droppedBytes: 0, stdoutBytes: 0, stderrBytes: 0 };
    receipt.phases.push(phase); save(); event('child-started', { name, argv });
    const out = fs.openSync(path.join(expected, name + '.stdout.txt'), 'wx'), err = fs.openSync(path.join(expected, name + '.stderr.txt'), 'wx');
    try {
      const outcome = await new Promise(resolve => {
        const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
        const owned = spawn(process.execPath, argv, { cwd: root, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        let settled = false, stopping = false, failure = null, cleanup;
        const finish = (code, signal, closeObserved) => { if (settled) return; settled = true; clearTimeout(deadline); clearInterval(progress); clearTimeout(cleanup); resolve({ code, signal, closeObserved, failure }); };
        function stop(reason) {
          if (stopping) return; stopping = true; failure ??= reason;
          // Install bounded-close fallback BEFORE any native/path operation.
          cleanup = setTimeout(() => { try { owned.stdout.destroy(); } catch {} try { owned.stderr.destroy(); } catch {} finish(null, null, false); }, 5000);
          try {
            if (Number.isSafeInteger(owned.pid) && owned.pid > 0) {
              try {
                const taskkill = path.join(process.env.SystemRoot, 'System32', 'taskkill.exe'); noLinks(taskkill);
                const killed = spawnSync(taskkill, ['/PID', String(owned.pid), '/T', '/F'], { shell: false, windowsHide: true, timeout: 10000, stdio: 'ignore' });
                if (killed.error || killed.signal || killed.status !== 0) { try { owned.kill('SIGKILL'); } catch {} }
              } catch { try { owned.kill('SIGKILL'); } catch {} }
            }
          } catch { /* Bounded fallback above remains armed. */ }
        }
        const deadline = setTimeout(() => stop('Owned publication child deadline exceeded'), LIMITS.childDeadlineMs);
        const progress = setInterval(() => { try { event('child-progress', { name, stdoutBytes: phase.stdoutBytes, stderrBytes: phase.stderrBytes }); } catch (error) { stop('Child progress storage failed: ' + error.message); } }, 10000);
        for (const [kind, fd, cap] of [['stdout', out, LIMITS.childStdoutBytes], ['stderr', err, LIMITS.childStderrBytes]]) {
          owned[kind].on('data', bytes => {
            if (settled) return;
            try { const field = kind + 'Bytes', retain = Math.min(bytes.length, Math.max(0, cap - phase[field]), Math.max(0, LIMITS.allChildRawBytes - allChildRawBytes)); if (retain) { fs.writeSync(fd, bytes.subarray(0, retain)); fs.fsyncSync(fd); phase[field] += retain; allChildRawBytes += retain; } phase.droppedBytes += bytes.length - retain; if (retain !== bytes.length) stop(kind + ' cap exceeded'); }
            catch (error) { stop(kind + ' storage failed: ' + error.message); }
          });
          owned[kind].on('error', error => { if (!settled) stop(kind + ' stream failed: ' + error.message); });
        }
        owned.on('error', error => { failure = 'Spawn failed: ' + error.message; }); owned.on('close', (code, signal) => finish(code, signal, true));
      });
      phase.exitCode = outcome.code; phase.signal = outcome.signal; phase.closeObserved = outcome.closeObserved;
      assert.equal(outcome.failure, null); assert.equal(outcome.code, 0); assert.equal(outcome.signal, null); assert.equal(outcome.closeObserved, true); assert.equal(phase.droppedBytes, 0);
      phase.status = 'passed'; return JSON.parse(fs.readFileSync(path.join(expected, name + '.stdout.txt'), 'utf8').trim());
    } catch (error) { phase.status = 'failed'; phase.failure = { name: error.name, message: String(error.message).slice(0, 4096) }; throw error; }
    finally { phase.completedAtUtc = new Date().toISOString(); fs.fsyncSync(out); fs.fsyncSync(err); fs.closeSync(out); fs.closeSync(err); save(); event('child-terminal', { name, phase }); }
  }
  save(); event('attempt-started');
  try {
    const capturedBefore = captureCurrent('before'); receipt.actualSourceBefore = capturedBefore.proof; save();
    assert(HELPER_PIN.bytes > 0, 'Fixed producer helper identity required');
    current = createNotes46InstalledSourceViewFromRoot(root);
    const currentEnvelope = verifyNotes46InstalledSourceEnvelope(current, current.envelopeRows(), HELPER_PIN, physical(root, HELPER_PIN.path, 256 * 1024));
    receipt.currentSourceProfile = current.summary(); receipt.currentSourceEnvelope = envelope('current-profile.json.gz.snapshot', 'rea-notes46-current-profile-envelope/v1', currentEnvelope.rows, { sourceEpoch: currentEnvelope.sourceEpoch, profileOnly: true }); save();
    historical = prepareNotes46HistoricalInputRoot(root); outer = historical.beginExecution('publication-old-and-new-qualification');
    const { createNotes41PublicationSourceViewFromRoot } = await import(pathToFileURL(path.join(historical.root, 'scripts/notes41-publication-source-view.mjs')).href);
    const oldView = createNotes41PublicationSourceViewFromRoot(historical.root);
    function historicalSources(label) {
      const rows = oldView.envelopeRows(); assert.equal(rows.length, 145);
      for (const name of ['scripts/notes41-publication-source-view.mjs', 'scripts/verify-cloud-publication.mjs', 'scripts/publication-integrity-controls.mjs', 'scripts/editor-vault-proof-migration.mjs', 'scripts/historical-carrier-policy.mjs']) {
        assert(!rows.some(row => row.path === name)); const bytes = physical(historical.root, name, LIMITS.sourceMemberBytes);
        rows.push({ path: name, ...id(bytes), base64: bytes.toString('base64'), historicalInputCommit: '2a8482b42784eb262d6d5b82e62d8d1220dc4821', separateExecutingDependency: true });
      }
      assert.equal(rows.length, 150); return envelope('historical-source-' + label + '.json.gz.snapshot', 'rea-notes46-historical2a-proof-and-executing-source-envelope/v1', rows,
        { historicalInputCommit: '2a8482b42784eb262d6d5b82e62d8d1220dc4821', actualCurrent46SourceClaimed: false, original145SourceContractUnchanged: true });
    }
    receipt.historicalSourceBefore = historicalSources('before');
    const oldControls = await runNotes46HistoricalPublicationControls(root, path.join(temporary, 'rea-notes46-old551-' + process.env.GITHUB_RUN_ID + '-' + process.env.GITHUB_RUN_ATTEMPT), event);
    assert.equal(oldControls.historicalValidation.result.result.status, 'passed'); assert.equal(oldControls.historicalValidation.result.result.checks, 551);
    json('historical551-controls.json', oldControls); receipt.historical551 = { status: 'passed', checks: 551, subjectCommit: '2a8482b42784eb262d6d5b82e62d8d1220dc4821', actualCurrent46AcceptanceClaimed: false }; save();
    // The pure control API requires an existing caller-owned fixture directory.
    // Create this exact new direct child of the verified hosted temporary root;
    // an existing file, directory or link is a collision, never an input to reuse.
    const currentControlsRoot = path.join(temporary, 'rea-notes46-current-controls-' + process.env.GITHUB_RUN_ID + '-' + process.env.GITHUB_RUN_ATTEMPT);
    assert.equal(path.dirname(currentControlsRoot), temporary); assert(inside(temporary, currentControlsRoot) && !inside(root, currentControlsRoot));
    noLinks(temporary); assert(fs.lstatSync(temporary).isDirectory());
    assert(!fs.existsSync(currentControlsRoot), 'Current source-control fixture directory must be new');
    fs.mkdirSync(currentControlsRoot); noLinks(currentControlsRoot); assert(fs.lstatSync(currentControlsRoot).isDirectory());
    receipt.currentSourceControlFixture = { parent: 'RUNNER_TEMP', relativePath: path.basename(currentControlsRoot), exclusiveDirectoryCreated: true }; save();
    const newControls = await runNotes46InstalledSourceControls(root, currentControlsRoot, event, { historicalContext: historical });
    // Preserve the actual returned case rows even if the subsequent gate rejects.
    json('current-source-controls.json', newControls); receipt.currentSourceControls = { status: newControls.status, checks: newControls.checks }; save();
    assert.equal(newControls.status, 'passed');
    // These are actual documented current entry points, not the historical551
    // reader executions. Each owns and disposes its separate hosted2a copy.
    const cliRoster = [
      ['archive', 'scripts/verify-archive-integration-records.mjs', ['--standalone']],
      ['followups', 'scripts/verify-followup-records.mjs', ['--standalone']],
      ['notes-layout-value-api', 'scripts/verify-notes-layout-value-api-checkpoint.mjs', ['--standalone']],
      ['notes-inline', 'scripts/verify-notes-inline-followups.mjs', ['--standalone']],
      ['notes-vault', 'scripts/verify-notes-vault-followups.mjs', ['--standalone']],
      ['editor-value-api', 'scripts/verify-editor-value-api-followups.mjs', ['--standalone']],
      ['editor-save', 'scripts/verify-editor-save-followup.mjs', []],
      ['sketch-layout', 'scripts/verify-sketch-layout-followups.mjs', ['--repo', root]]
    ];
    receipt.actualCurrentReaderClis = [];
    for (const [kind, script, argv] of cliRoster) {
      current.recheck(); const observed = await child('current-cli-' + kind, [script, ...argv]);
      assert.equal(observed.schema, 'rea-notes46-current-proof-reader/' + kind + '/v1');
      assert.equal(observed.sourceOnly, true); assert.deepEqual(observed.notes46CurrentSourceProof, current.summary());
      assert.equal(observed.oldReceiptsRebound, false); assert.equal(observed.currentProductBehaviorExecuted, false);
      assert.equal(observed.fullProductParity, false); assert.equal(observed.superiority, false);
      assert.equal(observed.historicalValidation.inputCommit, '2a8482b42784eb262d6d5b82e62d8d1220dc4821');
      assert.equal(observed.historicalValidation.current46AcceptanceClaimed, false);
      const closed = observed.historicalValidation.historicalInput, cleanup = observed.historicalCleanup;
      assert.equal(closed.contextStatus, 'available'); assert.equal(closed.pendingOuterBoundary, false);
      assert.equal(closed.pendingExecutionBoundaries, 0); assert.equal(closed.completedOuterBoundaries, 1); assert.equal(closed.fullIntegrityPasses, 2);
      assert.equal(closed.inputFiles, 29069); assert.equal(closed.inputRawBytes, 1381427700);
      assert.equal(observed.standaloneHistoricalCopyDisposed, true); assert.equal(cleanup.status, 'disposed');
      assert.deepEqual(cleanup.closedSummaryIdentity, id(Buffer.from(JSON.stringify(closed))));
      for (const proof of [closed, cleanup]) {
        assert.equal(proof.workflowSourceSHA, process.env.GITHUB_SHA); assert.equal(proof.workflowRun, process.env.GITHUB_RUN_ID);
        assert.equal(proof.workflowAttempt, process.env.GITHUB_RUN_ATTEMPT); assert.equal(proof.workflowJob, process.env.GITHUB_JOB);
      }
      json('current-cli-' + kind + '.json', observed); current.recheck(); historical.recheck();
      receipt.actualCurrentReaderClis.push({ kind, script, passed: true, actualCurrent46SourceAuthenticated: true,
        historicalSubjectCommit: observed.historicalValidation.inputCommit, historicalCopyDisposed: true, rawStdout: 'current-cli-' + kind + '.stdout.txt', rawStderr: 'current-cli-' + kind + '.stderr.txt' }); save();
    }
    assert.equal(receipt.actualCurrentReaderClis.length, 8);
    const before = payload('before'), oldManifest = physical(root, DERIVED[0], LIMITS.manifestChunkBytes * LIMITS.manifestChunks), old = JSON.parse(oldManifest);
    assert.equal(old.schema, 'rea-publication-manifest/v1'); assert.equal(old.algorithm, 'sha256'); assert.deepEqual(old.derived_records_excluded, DERIVED);
    receipt.metadataBefore = chunks('PUBLICATION-MANIFEST.before.json', oldManifest); receipt.validationBefore = chunks('VALIDATION.before.json', physical(root, DERIVED[1], LIMITS.manifestChunkBytes * LIMITS.manifestChunks));
    const nextManifest = Buffer.from(JSON.stringify({ ...old, files: before.rows }, null, 2)); fs.writeFileSync(path.join(root, DERIVED[0]), nextManifest); assert.deepEqual(physical(root, DERIVED[0], LIMITS.manifestChunkBytes * LIMITS.manifestChunks), nextManifest);
    receipt.generatedManifest = chunks('PUBLICATION-MANIFEST.current.json', nextManifest); receipt.generatedManifestBytes = nextManifest.length; save();
    const first = await child('publication-write', ['scripts/verify-records.mjs', '--write']);
    assert.equal(first.status, 'passed'); assert.deepEqual(JSON.parse(physical(root, DERIVED[1], LIMITS.memberBytes)), first);
    json('derived/VALIDATION.current.json', first);
    const second = await child('publication-recheck', ['scripts/verify-records.mjs']); assert.equal(second.status, 'passed');
    const firstPhase = receipt.phases.find(phase => phase.name === 'publication-write'), secondPhase = receipt.phases.find(phase => phase.name === 'publication-recheck');
    assert.equal(receipt.phases.filter(phase => phase.name === 'publication-write').length, 1); assert.equal(receipt.phases.filter(phase => phase.name === 'publication-recheck').length, 1);
    const firstProjection = projectNotes46CurrentPublicationRepeat(first, firstPhase, current), secondProjection = projectNotes46CurrentPublicationRepeat(second, secondPhase, current);
    assert(Date.parse(firstPhase.completedAtUtc) <= Date.parse(secondPhase.startedAtUtc)); assert.deepEqual(firstProjection.stable, secondProjection.stable);
    receipt.repeatComparison = { status: 'passed', exactNamedClockFields: 9, first: firstProjection.clocks, second: secondProjection.clocks, rawReceiptsRewritten: false, cleanupRawSummaryIdentitiesAuthenticatedBeforeProjection: true };
    const repeatControls = await runNotes46PublicationRepeatControls({ first, firstPhase, second, secondPhase, sourceView: current, emit: event });
    assert.equal(repeatControls.status, 'passed'); json('current-repeat-controls.json', repeatControls); receipt.repeatControls = { status: repeatControls.status, checks: repeatControls.checks };
    receipt.historicalSourceAfter = historicalSources('after'); assert.deepEqual(receipt.historicalSourceAfter.decoded, receipt.historicalSourceBefore.decoded);
    const after = payload('after'); assert.deepEqual(after.rows, before.rows); receipt.payload = { files: after.rows.length, bytes: after.bytes, beforeIdentity: before.identity, afterIdentity: after.identity, stable: true };
    const capturedAfter = captureCurrent('after'); assert.deepEqual(capturedAfter.rows, capturedBefore.rows); receipt.actualSourceAfter = capturedAfter.proof;
    current.recheck(); historical.endExecution(outer); outer = null;
    receipt.historicalInputProof = historical.summary(); assert.equal(receipt.historicalInputProof.pendingOuterBoundary, false); assert.equal(receipt.historicalInputProof.contextStatus, 'available');
    receipt.historicalCleanup = historical.dispose(); historical = null;
    assert.equal(receipt.historicalInputProof.pendingExecutionBoundaries, 0); assert.equal(receipt.historicalInputProof.fullIntegrityPasses, 2);
    assert.equal(receipt.historicalCleanup.status, 'disposed'); assert.equal(receipt.historicalCleanup.pendingExecutionBoundaries, 0);
    assert.equal(receipt.historicalCleanup.fullIntegrityPassesBeforeDisposal, 2);
    assert.deepEqual(receipt.historicalCleanup.closedSummaryIdentity, id(Buffer.from(JSON.stringify(receipt.historicalInputProof))));
    assert.equal(git(root, ['rev-parse', 'HEAD']).toString().trim(), process.env.GITHUB_SHA);
    for (const row of git(root, ['status', '--porcelain=v1', '--untracked-files=all', '-z']).toString().split('\0').filter(Boolean)) assert(row.startsWith(' M ') && DERIVED.includes(row.slice(3)), 'Only current derived metadata may change');
    receipt.status = 'passed'; receipt.phase = 'complete'; receipt.completedAt = new Date().toISOString(); save(); event('attempt-passed');
  } catch (error) {
    receipt.status = 'failed'; receipt.failure = { name: error.name, message: String(error.message).slice(0, 8192), stack: String(error.stack ?? '').slice(0, 16384), historicalChild: error.historicalChild ?? null };
    if (outer && historical) { try { historical.endExecution(outer); outer = null; } catch (closeError) { receipt.historicalBoundaryFailure = String(closeError.stack ?? closeError); } }
    if (historical) { try { receipt.historicalInputProof = historical.summary(); } catch (proofError) { receipt.historicalProofFailure = String(proofError); } }
    receipt.completedAt = new Date().toISOString(); save(); event('attempt-failed', { failure: receipt.failure }); process.exitCode = 1;
  }
  const actual = [];
  function inventory(directory, prefix = '') { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { assert(!entry.isSymbolicLink()); const name = prefix + entry.name; if (entry.isDirectory()) inventory(path.join(directory, entry.name), name + '/'); else { assert(entry.isFile()); const bytes = physical(expected, name, LIMITS.memberBytes); actual.push({ path: name, ...id(bytes) }); assert(actual.length <= LIMITS.files); } } }
  inventory(expected); assert(actual.reduce((sum, row) => sum + row.bytes, 0) <= LIMITS.rawEvidenceBytes);
  json('EVIDENCE-INDEX.json', { schema: 'rea-notes46-complete-publication-evidence-inventory/v1', subjectCommit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT, files: actual, producerCompletedStatus: receipt.status, limits: LIMITS, ownIndexExcluded: true, completeRawMemberReadback: true });
  const indexReadback = physical(expected, 'EVIDENCE-INDEX.json', LIMITS.memberBytes); assert(actual.length + 1 <= LIMITS.files); assert(actual.reduce((sum, row) => sum + row.bytes, 0) + indexReadback.length <= LIMITS.rawEvidenceBytes);
  console.log(JSON.stringify({ status: receipt.status, sourceCommit: receipt.sourceCommit, runId: receipt.runId, runAttempt: receipt.runAttempt, currentNotesSourceFiles: 46, historical551: receipt.historical551, currentSourceControls: receipt.currentSourceControls, repeatControls: receipt.repeatControls, payload: receipt.payload, comprehensiveRepositoryAcceptanceClaimed: false }));
  return receipt;
}
