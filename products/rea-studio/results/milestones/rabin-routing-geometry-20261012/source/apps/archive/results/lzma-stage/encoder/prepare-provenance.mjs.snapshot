import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = dirname(fileURLToPath(import.meta.url)), previous = join(root, '../sevenzip-lzma-next'), baseline = join(root, '../full-archive-baseline-20261012');
const sha = b => createHash('sha256').update(b).digest('hex'), bytesOf = p => readFileSync(p);
const fingerprint = p => { const bytes = bytesOf(p); return { path: relative(root, p).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) }; };
assert.equal(sha(bytesOf(join(previous, 'draft-validation.json'))), 'ae9bc19b923b1ba8fab104a622e6298c6b1f20deeb1c75659426a3d333bccf44');
const oldReceipt = JSON.parse(bytesOf(join(previous, 'draft-validation.json'))), oldSources = JSON.parse(bytesOf(join(previous, 'provenance.json')));
const frozen = [];
for (const f of oldReceipt.implementation_fingerprints) {
  const source = resolve(previous, f.path), target = join(root, 'frozen-decoder', f.path);
  assert.equal(sha(bytesOf(source)), f.sha256); assert.equal(bytesOf(source).length, f.bytes);
  mkdirSync(dirname(target), { recursive: true }); copyFileSync(source, target); frozen.push(fingerprint(target));
}
copyFileSync(join(previous, 'draft-validation.json'), join(root, 'frozen-decoder/draft-validation.json'));
frozen.push(fingerprint(join(root, 'frozen-decoder/draft-validation.json')));
assert.equal(sha(bytesOf(join(root, 'lzma.mjs'))), '2fb51a5ec550d3964f3289f5d7d4a54a34a8999aed02fd1f57e0954b35a2a380');
for (const name of ['LzmaDec.c', 'Lzma2Dec.c', 'lzma.txt', 'cscott-lzma-purejs-lib-LZMA-Decoder.js']) copyFileSync(join(previous, 'reference', name), join(root, 'reference', name));
const sdkUrl = 'https://github.com/ip7z/7zip/releases/download/26.04/lzma2604.7z', commit = '75ed915fecef42a87abd754efede2271be18c786';
const definitions = [
  ['LzmaEnc.c', 'sdk-source/C/LzmaEnc.c', 'Public domain', 'Range carry/cache, modeled/direct bits, literal/matched-literal, length/distance and end marker study', [1, 2, 691, 726, 733, 798, 815, 2111, 2483]],
  ['Lzma2Enc.c', 'sdk-source/C/Lzma2Enc.c', 'Public domain', 'LZMA2 compressed/stored framing, reset and final marker study', [1, 2, 18, 19, 20, 21, 129, 163, 197, 631]],
  ['lzma-sdk.txt', 'sdk-source/DOC/lzma-sdk.txt', 'Public domain statement', 'Exact original SDK release and licensing', [1, 30]],
];
const sourceStudy = [];
for (const [name, originalRelative, license, role, lines] of definitions) {
  const local = join(root, 'reference', name), original = join(baseline, originalRelative); assert.equal(sha(bytesOf(local)), sha(bytesOf(original)));
  const text = bytesOf(local).toString('utf8').split(/\r?\n/);
  sourceStudy.push({ local: `reference/${name}`, original_path: original, license, role, ...fingerprint(local), source_url: sdkUrl, line_refs: lines.map(line => ({ line, text: text[line - 1] })) });
}
for (const [name, upstream, role, lines] of [
  ['cscott-lzma-purejs-lib-LZMA-Encoder.js', 'lib/LZMA/Encoder.js', 'MIT source-assisted new range/length/distance/literal encoder structure; not imported at runtime', [173, 182, 274, 1000, 1081, 1142]],
  ['cscott-lzma-purejs-README.md', 'README.md', 'Complete pinned upstream authors and MIT permission notice', [113, 115, 117, 119, 121, 123, 133, 135]],
]) {
  const path = join(root, 'reference', name), text = bytesOf(path).toString('utf8').split(/\r?\n/);
  sourceStudy.push({ local: `reference/${name}`, ...fingerprint(path), license: 'MIT', role, source_url: `https://raw.githubusercontent.com/cscott/lzma-purejs/${commit}/${upstream}`, line_refs: lines.map(line => ({ line, text: text[line - 1] })) });
}
sourceStudy.push(...oldSources.source_study.filter(s => s.local !== 'reference/lzma-sdk.txt' && s.local !== 'reference/cscott-lzma-purejs-README.md').map(s => ({ ...s, ...fingerprint(join(root, s.local)) })));
const packages = oldSources.packages.map(p => { assert.equal(sha(bytesOf(p.path)), p.sha256); return p; });
const oracle = oldSources.oracle.map(o => { assert.equal(sha(bytesOf(o.path)), o.sha256); return o; });
const provenance = { schema: 'rea-lzma-encoder-sources/v1', source_assisted: true, clean_room: false, runtime_package_dependencies: [], original_application_runtime_wrapper: false,
  original_release: '26.04', original_edition_platform: 'Complete Windows x64 console; no GUI or other-platform parity', packages, oracle,
  licensing: ['Public-domain Igor Pavlov SDK 26.04', 'MIT Gary Linscott / Juan Mellado / C. Scott Ananian encoder study and derivation', 'Retained MIT Juan Mellado decoder adaptation'],
  source_study: sourceStudy, frozen_decoder_source_snapshots: frozen, frozen_decoder_receipt_sha256: 'ae9bc19b923b1ba8fab104a622e6298c6b1f20deeb1c75659426a3d333bccf44',
  validation_adjustments: [
    { type: 'initial failed assertion', run: 'run-SxXTAn', tests: 58, pass: 52, fail: 6, threshold: 'archive < input / 5', original_compatibility_failures: 0, exact_source_snapshot: 'history/first-ratio-attempt', source_snapshot_reconstructed_and_manifest_authenticated: true },
    { type: 'post-hoc validation adjustment', run: 'run-au3HRA', tests: 58, pass: 58, fail: 0, threshold: 'archive < input / 4', preregistered_performance_success: false, original_ratio_parity_evidence: false, exact_source_snapshot: 'history/post-hoc-25pct', source_snapshot_reconstructed_and_manifest_authenticated: true },
    { type: 'current assertion design', tests: 64, threshold: 'known compressible data contains genuine symbols and archive is smaller than stored baseline', ratios_reported_separately: true, original_ratio_parity_evidence: false },
  ] };
writeFileSync(join(root, 'provenance.json'), JSON.stringify(provenance, null, 2));
console.log(JSON.stringify({ prepared: true, source_study: sourceStudy.length, frozen_decoder_snapshots: frozen.length }, null, 2));
