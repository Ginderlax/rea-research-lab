// Actual installed46 publication validation. Historical records retain their
// fixed2a input tree and are reported in a separate historical section.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createNotes46InstalledSourceViewFromRoot } from './notes46-installed-source-view.mjs';
import { prepareNotes46HistoricalInputRoot } from './notes46-historical-input-root.mjs';
import { createHistoricalCarrierPolicyFromRoot } from './historical-carrier-policy.mjs';
import { verifyNotes46HistoricalRecordPredicates } from './notes46-historical-record-predicates.mjs';
import { createNotes46CurrentValidationWire } from './notes46-current-validation-wire.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
assert(args.every(arg => ['--write', '--historical-only'].includes(arg)) && new Set(args).size === args.length);
assert(!(args.includes('--write') && args.includes('--historical-only')));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const DERIVED = ['PUBLICATION-MANIFEST.json', 'VALIDATION.json'];
const forbidden = /(^|\/)(artifacts|node_modules|tooling|__pycache__|work|\.local)(\/|$)|\.(exe|dll|zip|tgz|bundle|tar|7z|pyc)$/i;
const syntheticZip = { path: 'products/rea-studio/apps/archive/fixtures/zstd/native-zip93.zip', sha256: 'e9282f76dbd3c080d0e12ef95489458523ebbc65c2951f4b8f3cb880a16c5d8b' };
const credentialPattern = /\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[0-9A-Z]{16})\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
function safe(name) {
  assert(typeof name === 'string' && name && name.length < 4096 && !name.startsWith('/') && !/[\\:\x00-\x1f\x7f]/.test(name));
  assert(name.split('/').every(part => part && part !== '.' && part !== '..')); return name;
}
function physical(name) {
  let target = root;
  for (const part of safe(name).split('/')) { target = path.join(target, part); assert(!fs.lstatSync(target).isSymbolicLink()); }
  const relative = path.relative(root, fs.realpathSync(target));
  assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
  const stat = fs.lstatSync(target); assert(stat.isFile() && stat.size <= 32 * 1024 * 1024); return { target, stat };
}
function read(name) { const { target, stat } = physical(name), bytes = fs.readFileSync(target); assert.equal(bytes.length, stat.size); return bytes; }
function git(argv, maximum = 16 * 1024 * 1024) {
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.toUpperCase().startsWith('GIT_'))), GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never', GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0' };
  const result = spawnSync('git', ['--no-replace-objects', '-C', root, ...argv], { encoding: 'utf8', env, windowsHide: true, shell: false, timeout: 120000, maxBuffer: maximum });
  assert.equal(result.error, undefined); assert.equal(result.signal, null); assert.equal(result.status, 0, result.stderr); return result.stdout;
}
function currentTree() {
  const raw = git(['ls-tree', '-r', '-l', '-z', 'HEAD']);
  const entries = raw.split('\0'); assert.equal(entries.pop(), '');
  const names = new Set(); const result = entries.map(line => {
    const match = /^([0-9]{6}) blob ([0-9a-f]{40}) +([0-9]+)\t(.+)$/.exec(line); assert(match); assert.equal(match[1], '100644');
    const name = safe(match[4]); assert(!names.has(name.toLowerCase())); names.add(name.toLowerCase());
    return { path: name, gitBlob: match[2], bytes: Number(match[3]) };
  }).filter(row => !DERIVED.includes(row.path));
  assert(result.length <= 40000); return result.sort((a, b) => a.path.localeCompare(b.path));
}
function historicalRecords(historical) {
  const child = spawnSync(process.execPath, [path.join(historical.root, 'scripts/verify-records.mjs'), '--historical-only'], {
    cwd: historical.root, env: { ...process.env }, encoding: 'utf8', windowsHide: true, shell: false, timeout: 20 * 60000, maxBuffer: 4 * 1024 * 1024
  });
  const observed = { inputCommit: '2a8482b42784eb262d6d5b82e62d8d1220dc4821', flags: ['--historical-only'], workflowSourceSHA: process.env.GITHUB_SHA,
    stdout: child.stdout ?? '', stderr: child.stderr ?? '', exitCode: child.status, signal: child.signal, error: child.error ? child.error.message : null,
    oldFullPublicationLoopRerunClaimed: false, current46AcceptanceClaimed: false };
  if (child.error || child.signal || child.status !== 0) { const error = new Error('Immutable historical-only records child rejected'); error.historicalChild = observed; throw error; }
  const result = JSON.parse(observed.stdout); assert.equal(result.status, 'passed'); return { ...observed, result };
}

const current = createNotes46InstalledSourceViewFromRoot(root);
const historical = prepareNotes46HistoricalInputRoot(root), execution = historical.beginExecution('current-records-cli');
let receipt;
try {
  const historicalValidation = args.includes('--historical-only') ? historicalRecords(historical) : await verifyNotes46HistoricalRecordPredicates(historical);
  if (args.includes('--historical-only')) {
    receipt = { schema: 'rea-notes46-historical-records-only/v1', status: 'passed', checked_at_utc: new Date().toISOString(),
      notes46CurrentSourceProof: current.summary(), historicalValidation,
      currentPublicationValidationClaimed: false, currentBehaviorAcceptanceClaimed: false, historicalReceiptsRebound: false };
  } else {
    const manifest = JSON.parse(read(DERIVED[0]));
    assert.equal(manifest.schema, 'rea-publication-manifest/v1'); assert.equal(manifest.algorithm, 'sha256'); assert.deepEqual(manifest.derived_records_excluded, DERIVED);
    const tree = currentTree(); assert.equal(manifest.files.length, tree.length);
    assert.deepEqual(manifest.files.map(row => row.path), tree.map(row => row.path), 'Full actual committed payload census');
    const historicalCarrierPolicy = createHistoricalCarrierPolicyFromRoot(root);
    let checkedBytes = 0, parsedJson = 0, checkedScripts = 0;
    for (const [position, entry] of manifest.files.entries()) {
      const bytes = read(entry.path), committed = tree[position];
      assert.equal(bytes.length, entry.bytes, 'Size mismatch: ' + entry.path); assert.equal(sha(bytes), entry.sha256, 'Digest mismatch: ' + entry.path);
      assert.equal(createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'), committed.gitBlob, 'Working payload differs from actual Git: ' + entry.path);
      assert.equal(bytes.length, committed.bytes); checkedBytes += bytes.length; assert(checkedBytes <= 2 * 1024 * 1024 * 1024);
      assert(!forbidden.test(entry.path) || entry.path === syntheticZip.path && entry.sha256 === syntheticZip.sha256 || historicalCarrierPolicy.allows(entry), 'Excluded vendor/runtime material: ' + entry.path);
      const source = bytes.toString('utf8'); assert(!credentialPattern.test(source), 'Potential credential material: ' + entry.path);
      if (entry.path.endsWith('.json')) { JSON.parse(source); parsedJson++; }
      if (/\.(?:mjs|cjs|js)$/.test(entry.path)) {
        const syntax = spawnSync(process.execPath, ['--check', physical(entry.path).target], { encoding: 'utf8', windowsHide: true, shell: false, timeout: 30000, maxBuffer: 1024 * 1024 });
        assert.equal(syntax.error, undefined); assert.equal(syntax.signal, null); assert.equal(syntax.status, 0, entry.path + ': ' + syntax.stderr); checkedScripts++;
      }
    }
    const index = JSON.parse(read('PROJECT-INDEX.json')); assert.equal(index.projects.length, 10);
    for (const project of index.projects) {
      assert.equal(project.status, 'completed-bounded-study'); assert.equal(project.final_mismatches, 0);
      for (const name of ['study.json', 'REPORT.md']) physical('projects/' + project.id + '/' + name);
      const study = JSON.parse(read('projects/' + project.id + '/study.json')); assert.equal(study.status, project.status);
      for (const [name, digest] of Object.entries(study.file_sha256 ?? {})) assert.equal(sha(read('projects/' + project.id + '/' + name)), digest);
      const record = JSON.parse(read('projects/' + project.id + '/' + project.result_record));
      const count = project.id === '04-excalidraw' ? record.counts.coordinateCalls + record.counts.versionCalls
        : project.id === '09-restic' ? record.content_id_comparisons : project.id === '10-rclone' ? record.differential_assertions : record.total ?? record.cases;
      assert.equal(count, project.differential_comparison_count); assert.equal(record.failed ?? record.mismatches ?? record.failures?.length ?? 0, 0);
      assert(project.rea_evidence_ids.length > 0);
    }
    const historicalDocumentCorpus = /\/apps\/(?:archive\/results\/lzma-stage|sync\/results\/webdav-official-sources)\//;
    const documents = [...new Set(['README.md', 'SERIES-STUDY.md', 'TOOLING.md', 'LICENSES.md', ...manifest.files.filter(row => row.path.startsWith('products/rea-studio/') && row.path.endsWith('.md') && !historicalDocumentCorpus.test(row.path)).map(row => row.path)])];
    for (const name of documents) {
      for (const match of read(name).toString('utf8').matchAll(/\]\(([^)]+)\)/g)) {
        const link = match[1].split('#')[0]; if (!link || /^(https?:|mailto:)/.test(link)) continue;
        const target = path.resolve(path.dirname(path.join(root, name)), link);
        assert(fs.existsSync(target), name + ' links to missing ' + link);
      }
    }
    current.recheck();
    receipt = { schema: 'rea-notes46-current-publication-validation/v1', status: 'passed', checked_at_utc: new Date().toISOString(),
      currentWorkflowSourceSHA: git(['rev-parse', 'HEAD']).trim(), projects: index.projects.length,
      payload_files: manifest.files.length, payload_bytes: checkedBytes, json_files_parsed: parsedJson,
      javascript_syntax_checks: checkedScripts, publication_sha256_checks: manifest.files.length,
      actualCommittedPayloadCensusExact: true, actualPayloadGitBlobsAuthenticated: true,
      project_metadata_and_record_counts_consistent: true, excluded_artifacts_not_in_payload: true,
      credential_pattern_scan_passed: true, root_document_links_resolve: true,
      preserved_vendor_and_historical_document_links_not_rebased: true,
      notes46CurrentSourceProof: current.summary(), historicalValidation,
      oldFullRecordsCliReexecutedClaimed: false, allUniqueOldHistoricalPredicatesExecutedSeparately: true, old551ControlAcceptanceIsSeparate: true,
      currentProductBehaviorExecuted: false, historicalReceiptsRebound: false, fullProductParity: false, superiority: false };
  }
} finally { historical.endExecution(execution); }
current.recheck(); receipt.historicalInputProof = historical.summary(); assert.equal(receipt.historicalInputProof.pendingOuterBoundary, false); assert.equal(receipt.historicalInputProof.pendingExecutionBoundaries, 0); assert.equal(receipt.historicalInputProof.contextStatus, 'available'); assert(receipt.historicalInputProof.completedOuterBoundaries >= 1 && receipt.historicalInputProof.fullIntegrityPasses >= 2);
receipt.historicalCleanup = historical.dispose(); assert.equal(receipt.historicalCleanup.status, 'disposed');
assert.deepEqual(receipt.historicalCleanup.closedSummaryIdentity, { bytes: Buffer.byteLength(JSON.stringify(receipt.historicalInputProof)), sha256: sha(Buffer.from(JSON.stringify(receipt.historicalInputProof))) });
if (!args.includes('--historical-only')) receipt = createNotes46CurrentValidationWire(receipt);
if (args.includes('--write')) {
  const target = path.join(root, 'VALIDATION.json');
  // Preserve the documented write destination and readback the exact new wire
  // receipt. Historical inputs and other current files are never write targets.
  physical('VALIDATION.json'); const bytes = Buffer.from(JSON.stringify(receipt, null, 2)); fs.writeFileSync(target, bytes);
  assert.deepEqual(fs.readFileSync(target), bytes); assert.deepEqual(JSON.parse(fs.readFileSync(target)), receipt);
}
console.log(JSON.stringify(receipt));
