import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const app = fileURLToPath(new URL('../', import.meta.url)), study = fileURLToPath(new URL('../../../../../projects/02-grafana/', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const release = await readFile(path.join(study, 'artifacts/release.tgz'));
if (hash(release) !== '954a03a68fa122ebe74c0c318dc801e434c17294c5374ef593cf491f73c81c41') throw new Error('Original release digest mismatch.');
const acquisition = JSON.parse(await readFile(path.join(study, 'acquisition.json'))), scope = JSON.parse(await readFile(path.join(study, 'scope.json')));
if ('sha512-' + createHash('sha512').update(release).digest('base64') !== acquisition.registryIntegrity) throw new Error('Original npm integrity mismatch.');
const destination = path.join(app, 'fixtures/reducers'); await mkdir(destination, { recursive: true });
const files = [...scope.included.map(item => ({ path: item.path, expectedSha256: item.sha256 })), { path: 'dist/types/transformations/fieldReducer.d.ts' }, { path: 'LICENSE_APACHE2' }, { path: 'package.json' }];
const sources = [];
for (const entry of files) {
  const bytes = await readFile(path.join(study, 'artifacts/package', entry.path));
  if (!bytes.equals(execFileSync('tar', ['-xOf', path.join(study, 'artifacts/release.tgz'), 'package/' + entry.path], { maxBuffer: 4 * 1024 * 1024 }))) throw new Error('Extracted original differs from pinned archive: ' + entry.path);
  if (entry.expectedSha256 && hash(bytes) !== entry.expectedSha256) throw new Error('Original source digest mismatch: ' + entry.path);
  const file = path.basename(entry.path); await writeFile(path.join(destination, file), bytes);
  sources.push({ file: 'fixtures/reducers/' + file, path: entry.path, url: acquisition.tarballUrl, bytes: bytes.length, sha256: hash(bytes), lines: bytes.toString('utf8').split('\n').length });
}
const docsPath = 'docs/sources/visualizations/panels-visualizations/query-transform-data/calculation-types/index.md';
const doc = await readFile(fileURLToPath(new URL('../../../../../../../work/grafana-inventory/corpus/' + docsPath, import.meta.url)));
if (hash(doc) !== '16028d1b031e0a0c63739276feac5908e937530cdb726f3cbfe53b55487fabca') throw new Error('Pinned calculation documentation changed.');
await writeFile(path.join(destination, 'calculation-types.md'), doc);
sources.push({ file: 'fixtures/reducers/calculation-types.md', path: docsPath, url: 'https://raw.githubusercontent.com/grafana/grafana/6193dc03311b631b9727b560d24369e683dc396e/' + docsPath, bytes: doc.length, sha256: hash(doc), lines: doc.toString('utf8').split('\n').length, boundary: 'Candidate Grafana v13.2.3 documentation; npm gitHead is separately pinned and differs.' });
const contracts = [
  ['canonical-ids-and-type-helpers', 'fieldReducer.cjs', 11, 143], ['queue-cache-null-dispatch', 'fieldReducer.cjs', 144, 200],
  ['registry-metadata-aliases', 'fieldReducer.cjs', 201, 389], ['percentile-factory-and-defaults', 'fieldReducer.cjs', 390, 432],
  ['standard-calculations', 'fieldReducer.cjs', 433, 519], ['first-last-specialized', 'fieldReducer.cjs', 520, 547],
  ['population-variance-stddev', 'fieldReducer.cjs', 548, 570], ['change-distinct', 'fieldReducer.cjs', 571, 610],
  ['percentile-median', 'fieldReducer.cjs', 611, 643], ['registry-lookups-picker', 'Registry.cjs', 8, 130],
  ['null-mode-ids', 'data.cjs', 23, 28], ['field-type-ids', 'dataFrame.cjs', 9, 22], ['documented-25-calculation-rows', 'calculation-types.md', 24, 48],
].map(([id, file, lineStart, lineEnd]) => { const source = sources.find(item => item.file.endsWith('/' + file)); if (!source || lineEnd > source.lines) throw new Error('Invalid contract source span.'); return { id, file: source.file, sourcePath: source.path, sha256: source.sha256, lineStart, lineEnd, authority: file === 'calculation-types.md' ? 'separate-candidate-documentation' : 'shipped-npm-runtime' }; });
const receipt = { schema: 'rea-native-calculation-sources/v1', acquiredAt: new Date().toISOString(), package: acquisition.package, version: acquisition.version, archiveSha256: hash(release), archiveBytes: release.length, registryIntegrity: acquisition.registryIntegrity, npmGitHead: acquisition.gitHead, license: 'Apache-2.0', oraclePath: 'projects/02-grafana/artifacts/package/dist/cjs/transformations/fieldReducer.cjs', oracleDependency: JSON.parse(await readFile(path.join(study, 'dependency.json'))), sources, contracts, scope: 'Fixed shipped built-in reducer registry, reduceField, standard and specialized calculation paths. Runtime does not import these materials. Prior reconstruction not read or imported.' };
await writeFile(path.join(destination, 'sources.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ files: sources.length, archiveSha256: receipt.archiveSha256 }));
