import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = dirname(fileURLToPath(import.meta.url)), sha = b => createHash('sha256').update(b).digest('hex');
const fp = path => { const data = readFileSync(path); return { path: relative(root, path).replaceAll('\\', '/'), bytes: data.length, sha256: sha(data) }; };
const tree = path => readdirSync(path).sort().flatMap(name => { const p = join(path, name); return statSync(p).isDirectory() ? tree(p) : [fp(p)]; });
const tap = readFileSync(join(root, 'test-final.tap'), 'utf8'), number = name => Number(tap.match(new RegExp(`^# ${name} ([0-9.]+)$`, 'm'))?.[1]);
const run = tap.match(/Retained compressed-writer fixtures: (.+)/)?.[1].trim(); assert.ok(run);
assert.equal(number('tests'), 64); assert.equal(number('pass'), 64); assert.equal(number('fail'), 0); assert.equal(number('skipped'), 0);
const fixture = JSON.parse(readFileSync(join(run, 'fixtures-manifest.json'))), provenance = JSON.parse(readFileSync(join(root, 'provenance.json')));
for (const [path, expected] of Object.entries(fixture.implementation_sha256)) assert.equal(fp(join(root, path)).sha256, expected);
const original = JSON.parse(readFileSync(join(root, 'benchmark-vbZ6G3/original-check-results.json')));
assert.equal(original.records.length, 12);
const benchmark = JSON.parse(readFileSync(join(root, 'benchmark-vbZ6G3/benchmark-results.json')));
const old = JSON.parse(readFileSync(join(root, '../sevenzip-lzma-next/draft-validation.json')));
for (const f of old.protected_app_fingerprints) assert.equal(fp(resolve(root, f.path)).sha256, f.sha256, f.path);
const implementation = readdirSync(root).filter(n => statSync(join(root, n)).isFile() && !n.startsWith('probe-') && n !== 'draft-validation.json').sort().map(n => fp(join(root, n)));
const earlierRuns = readdirSync(root).filter(n => n.startsWith('run-') && resolve(root, n) !== resolve(run)).sort();
const receipt = { schema: 'rea-lzma-encoder-research-validation/v1', staging_only: true, integrated_application: false, full_feature_parity: false, all_ways_improved: false, original_ratio_speed_parity: false, original_application_runtime_wrapper: false,
  tests: { tests: number('tests'), pass: number('pass'), fail: number('fail'), skipped: number('skipped'), duration_ms: number('duration_ms'), final_run: relative(root, run).replaceAll('\\', '/'), original_7z_containers: fixture.records.filter(r => r.path.endsWith('.7z')).length, original_lzma_wrappers: fixture.records.filter(r => r.path.endsWith('.lzma')).length, raw_vectors: fixture.records.filter(r => r.path.endsWith('.packed')).length },
  prior_decoder_tests: { tests: 35, pass: 35, original_produced_positive_containers: 25, receipt_sha256: provenance.frozen_decoder_receipt_sha256 },
  validation_adjustments: provenance.validation_adjustments,
  benchmark: { run: 'benchmark-vbZ6G3', measurements: benchmark.rows.length, original_7z_containers: original.records.length + 1, single_observations_only: true, ratios_not_original_parity: true, memory_samples_not_peak: true, boundary: benchmark.rows.find(r => r.name === 'solid64m'), deadlines: benchmark.deadlines },
  implementation_fingerprints: implementation,
  reference_fingerprints: tree(join(root, 'reference')),
  frozen_decoder_fingerprints: tree(join(root, 'frozen-decoder')),
  current_evidence_fingerprints: tree(run),
  historical_evidence_fingerprints: [...tree(join(root, 'history')), ...earlierRuns.flatMap(n => tree(join(root, n)))],
  benchmark_fingerprints: tree(join(root, 'benchmark-vbZ6G3')),
  protected_app_fingerprints: old.protected_app_fingerprints,
  limitations: ['Greedy normal matches; no rep/shortrep, lazy/optimal parse, bit-price search, binary tree or threads', '32 KiB maximum LZMA2 chunks reset dictionary/state/properties; no cross-chunk history', 'Raw LZMA can expand random input; LZMA2 stored fallback is counted honestly', 'Own profiles are not original mx levels', 'Optional per-primitive cooperative budgets, no aggregate host budget yet', 'Bounded allocations/copies, not process RSS/CPU isolation', 'No production HTTP/UI integration; old app unchanged', 'One coder per folder; encryption, pipelines/filters, original GUI and other platforms unsupported'],
};
writeFileSync(join(root, 'draft-validation.json'), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ receipt: fp(join(root, 'draft-validation.json')), tests: receipt.tests, fingerprints: Object.values(receipt).filter(Array.isArray).flat().filter(x => x?.sha256).length }, null, 2));
