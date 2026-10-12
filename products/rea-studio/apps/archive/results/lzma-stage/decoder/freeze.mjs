import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = dirname(fileURLToPath(import.meta.url)), baseline = join(root, '../full-archive-baseline-20261012');
const repo = join(root, '../../outputs/rea-research-lab');
const sha = b => createHash('sha256').update(b).digest('hex');
const fp = path => { const b = readFileSync(path); return { path: relative(root, path).replaceAll('\\', '/'), bytes: b.length, sha256: sha(b) }; };
const acquisition = JSON.parse(readFileSync(join(baseline, 'acquisition.json')));
const origins = [
  { local: 'reference/LzmaDec.c', original: 'sdk-source/C/LzmaDec.c', lines: [1, 2, 22, 24, 164, 1007, 1024, 1262, 1272], license: 'Public domain', role: 'Primary source-assisted range, literal/match/distance, probability, finish and property study' },
  { local: 'reference/Lzma2Dec.c', original: 'sdk-source/C/Lzma2Dec.c', lines: [1, 2, 14, 34, 57, 88, 111, 117, 154, 225, 260, 289], license: 'Public domain', role: 'Primary source-assisted compressed/stored LZMA2 framing, reset/state/property and exact chunk finishing study' },
  { local: 'reference/lzma-sdk.txt', original: 'sdk-source/DOC/lzma-sdk.txt', lines: [1, 30, 37], license: 'Public domain', role: 'SDK release and permission' },
  { local: 'reference/lzma.txt', original: 'sdk-source/DOC/lzma.txt', lines: [3, 18, 21], license: 'Public domain SDK documentation', role: 'LZMA raw/file properties reference; embedded document version24.07 within SDK26.04' },
  { local: 'reference/cscott-lzma-purejs-lib-LZMA-Decoder.js', original: '../sevenzip-next/primitive-survey/cscott-lzma-purejs-lib-LZMA-Decoder.js', lines: [5, 7, 27, 61, 183, 224, 311, 328], license: 'MIT; Juan Mellado notice preserved verbatim in LICENSE.txt', role: 'Source-assisted decoder structure and algorithm; original AMD module not imported or executed', url: 'https://raw.githubusercontent.com/cscott/lzma-purejs/75ed915fecef42a87abd754efede2271be18c786/lib/LZMA/Decoder.js' },
  { local: 'reference/cscott-lzma-purejs-README.md', original: '../sevenzip-next/primitive-survey/cscott-lzma-purejs-README.md', lines: [5, 8, 113], license: 'MIT', role: 'Dependency authorship and license provenance, not an adopted package', url: 'https://raw.githubusercontent.com/cscott/lzma-purejs/75ed915fecef42a87abd754efede2271be18c786/README.md' }
];
for (const origin of origins) {
  const own = readFileSync(join(root, origin.local));
  const path = origin.original.startsWith('../') ? join(root, origin.original) : join(baseline, origin.original);
  assert.equal(sha(own), sha(readFileSync(path)), `exact preserved study bytes ${origin.local}`);
  origin.original_path = path.replaceAll('\\', '/'); origin.bytes = own.length; origin.sha256 = sha(own);
  origin.line_refs = origin.lines.map(line => ({ line, text: own.toString('utf8').split(/\r?\n/)[line - 1] })); delete origin.lines;
  if (!origin.url) origin.source_package_url = acquisition.find(a => a.name === 'lzma2604.7z').source_url;
}
const packages = acquisition.filter(a => ['lzma2604.7z', '7z2604-x64.exe', '7z2604-src.7z'].includes(a.name));
for (const p of packages) { assert.equal(sha(readFileSync(p.path)), p.sha256); assert.equal(statSync(p.path).size, p.bytes); }
const oracle = [
  { path: join(baseline, 'full-product-x64/7z.exe'), sha256: '95fff19b73eff77c87c0d7bd32822e43fb90dd2932459f962eb532d8dfb6ba53' },
  { path: join(baseline, 'full-product-x64/7z.dll'), sha256: '899cd73d7fc60e1c1c35c7de0f5bed3dc69bfe2cecbd48014d868a347970a0b1' }
].map(record => { const b = readFileSync(record.path); assert.equal(sha(b), record.sha256); return { ...record, bytes: b.length, purpose: 'Test/benchmark independent complete26.04 Windowsx64 oracle only; not runtime' }; });
const provenance = { schema: 'rea-lzma-sources/v1', source_assisted: true, clean_room: false, primitive_runtime_calls_original_application: false,
  primitive_runtime_package_dependencies: [], licensing: ['Public-domain Igor Pavlov SDK26.04', 'MIT Juan Mellado decoder adaptation'],
  original_release: '26.04', original_edition_platform: 'Complete Windows x64 console; no GUI/other-platform parity', packages, oracle, source_study: origins,
  pinned_mit_commit: '75ed915fecef42a87abd754efede2271be18c786', standalone_mit_license_url_status: 'LICENSE at the pinned commit returned404 during preserved acquisition; full MIT notice is present in Decoder.js and README.md and retained here' };
writeFileSync(join(root, 'provenance.json'), JSON.stringify(provenance, null, 2));
const tap = readFileSync(join(root, 'test-output.tap'), 'utf8');
const metric = label => Number(tap.match(new RegExp(`^# ${label} ([0-9.]+)$`, 'm'))?.[1]);
assert.equal(metric('tests'), 35); assert.equal(metric('pass'), 35); assert.equal(metric('fail'), 0); assert.equal(metric('skipped'), 0);
const run = tap.match(/^# Retained LZMA research vectors: (.+)$/m)[1].replace(/\\+/g, '/').trim();
const manifestPath = join(run, 'fixtures-manifest.json'), manifest = JSON.parse(readFileSync(manifestPath));
for (const [name, digest] of Object.entries(manifest.implementation_sha256)) assert.equal(sha(readFileSync(join(root, name))), digest, `${name} exact executed test source`);
const vectorFps = [fp(manifestPath)];
for (const record of manifest.records) { const f = fp(join(run, record.path)); assert.equal(f.sha256, record.sha256); assert.equal(f.bytes, record.bytes); vectorFps.push(f); }
const archives = manifest.records.filter(r => r.path.endsWith('.7z')); assert.equal(archives.length, 25);
const benchmarks = readdirSync(root).filter(name => name.startsWith('benchmark-')).map(name => join(root, name, 'benchmark.json')).filter(path => { try { statSync(path); return true; } catch { return false; } }).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
const benchmarkPath = benchmarks[0], benchmark = JSON.parse(readFileSync(benchmarkPath));
for (const [name, digest] of Object.entries(benchmark.implementation_sha256)) assert.equal(sha(readFileSync(join(root, name))), digest, `${name} exact executed benchmark source`);
assert.equal(benchmark.rows.length, 3); assert.ok(benchmark.rows.some(r => r.size === 64 * 1024 ** 2 && r.measurements.length === 3));
const benchmarkFps = [fp(benchmarkPath)];
for (const row of benchmark.rows) { const a = fp(row.archive_path), source = fp(row.source_path); assert.equal(a.sha256, row.archive_sha256); assert.equal(source.sha256, row.source_sha256); benchmarkFps.push(a, source); }
const protectedReceipt = join(repo, 'products/rea-studio/apps/archive/sevenzip-validation.json');
assert.equal(sha(readFileSync(protectedReceipt)), 'ff53f71c7ad81e1c9903011f3cda81ea0e3d257d1130d4a475c69b65741e5be5');
const protectedState = JSON.parse(readFileSync(protectedReceipt));
const protectedFps = [fp(protectedReceipt), ...protectedState.implementation_fingerprints.map(f => { const actual = fp(join(repo, f.path)); assert.equal(actual.sha256, f.sha256, `frozen app unchanged: ${f.path}`); return actual; }),
  ...protectedState.preserved_previous_receipts.map(f => { const actual = fp(join(repo, f.path)); assert.equal(actual.sha256, f.sha256); return actual; })];
const implementations = ['lzma.mjs', 'sevenzip.mjs', 'lzma.test.mjs', 'benchmark.mjs', 'LICENSE.txt', 'README.md', 'provenance.json', 'freeze.mjs', 'verify-draft.mjs', 'test-output.tap', ...origins.map(o => o.local)].map(name => fp(join(root, name)));
const receipt = { schema: 'rea-lzma-research-validation/v1', frozen_at: new Date().toISOString(), staging_only: true, integrated_application: false,
  full_feature_parity: false, all_ways_improved: false, source_assisted: true, original_application_runtime_wrapper: false,
  scope: 'Genuine bounded pure-JavaScript raw LZMA/LZMA2 decoder and isolated simple-folder .7z reader, including original default compressed data and encoded headers; no encoder or app integration',
  implementation_fingerprints: implementations, independent_vector_fingerprints: vectorFps, benchmark_fingerprints: benchmarkFps, protected_app_fingerprints: protectedFps,
  tests: { command: 'node --test --test-reporter=tap --test-concurrency=1 lzma.test.mjs', tests: metric('tests'), pass: metric('pass'), fail: metric('fail'), skipped: metric('skipped'), duration_ms: metric('duration_ms'), retained_run: relative(root, run).replaceAll('\\', '/'), positive_original_containers: archives.length, exact_digest_comparisons: true },
  benchmarks: { command: 'node --expose-gc benchmark.mjs', retained_report: relative(root, benchmarkPath).replaceAll('\\', '/'), cases: benchmark.rows.map(r => ({ name: r.name, input_bytes: r.packed_bytes, output_bytes: r.size, decode_ms: r.measurements.map(m => m.decode_ms), rss_snapshots_mib: r.measurements.map(m => m.after.rss / 1024 ** 2), tiny_budget_result: r.tiny_budget_result, tiny_budget_elapsed_ms: r.tiny_budget_elapsed_ms })), not_original_speed_comparison: true, not_peak_rss_limit: true },
  bounds: { input: 96 * 1024 ** 2, output: 64 * 1024 ** 2, dictionary: 64 * 1024 ** 2, chunks: 100000, probability_base_bytes: 3692, lzma2_literal_bytes: 24576, lzma1_literal_max_bytes: 6291456, process_memory_isolation: false, input_copy: false, separate_full_dictionary_allocation: false },
  optional_budgets: { steps_max: 8_000_000_000, time_ms_max: 60000, clock_work_interval: 4096, optional_when_omitted: true, cooperative_not_preemptive: true, future_host_aggregate_deadline_required: true },
  gaps: ['No compressed LZMA/LZMA2 encoder', 'No filters/multiple coders/encryption/volumes/SFX or rich metadata restoration', 'No production integration or HTTP/browser proof for this staged decoder', 'Raw streams lack intrinsic checksums; container CRCs detect content corruption when provided', 'No GUI/other-platform/full-feature/performance-parity claim'],
  failed_attempts_retained: ['run-ssIyXB: incorrect harness assumption dictionary property25 exceeds64MiB;30/31passed, expectation corrected', 'benchmark-k4Uhf1: incorrect harness expectation submillisecond native copy must exhaust1ms; corrected to allow completion insidebudget'] };
writeFileSync(join(root, 'draft-validation.json'), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ receipt: fp(join(root, 'draft-validation.json')), implementation: implementations.slice(0, 4), tests: receipt.tests,
  fingerprints: implementations.length + vectorFps.length + benchmarkFps.length + protectedFps.length }, null, 2));
