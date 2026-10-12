import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { handle } from '../server.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(root, '../../../..');
const option = process.argv.indexOf('--typescript');
const compiler = option < 0 ? path.join(repo, 'tooling/rea-main/node_modules/typescript/lib/tsc.js') : path.resolve(process.argv[option + 1]);
await readFile(compiler);
const schema = await readFile(path.join(root, 'fixtures/vendor/classic-schema.ts'), 'utf8');
const sourceRecord = JSON.parse(await readFile(path.join(root, 'fixtures/sources.json'), 'utf8'));
assert.equal(createHash('sha256').update(schema).digest('hex'), sourceRecord.sources.find(item => item.file.endsWith('classic-schema.ts')).sha256);
const records = new Map(), store = { get: async (key, fallback) => structuredClone(records.get(key) ?? fallback), set: async (key, value) => records.set(key, structuredClone(value)), list: async prefix => [...records.keys()].filter(key => key.startsWith(prefix)) }, call = (action, input) => handle({ action, input, store });
let record = await call('grafana-create', { title: 'Schema-checked local dashboard' });
for (const type of ['text', 'table', 'stat', 'timeseries', 'row']) record = await call('grafana-panel-add', { ...record, type, title: `${type} panel` });
for (const type of ['custom', 'constant', 'textbox']) record = await call('grafana-variable-add', { ...record, name: `sample_${type}`, type, values: ['web', 'db'] });
const document = JSON.parse((await call('grafana-export', record)).content);
const temporary = await mkdtemp(path.join(os.tmpdir(), 'rea-grafana-schema-'));
function compile(file) { return spawnSync(process.execPath, [compiler, '--noEmit', '--strict', '--skipLibCheck', '--target', 'es2022', '--module', 'esnext', '--moduleResolution', 'bundler', file], { encoding: 'utf8', timeout: 60000 }); }
let positive, negative;
try {
  await writeFile(path.join(temporary, 'classic-schema.ts'), schema);
  await writeFile(path.join(temporary, 'positive.ts'), `import type { Dashboard } from './classic-schema';\nconst generated: Dashboard = ${JSON.stringify(document, null, 2)};\n`);
  positive = compile(path.join(temporary, 'positive.ts')); assert.equal(positive.status, 0, positive.stdout + positive.stderr);
  await writeFile(path.join(temporary, 'negative.ts'), `import type { Dashboard } from './classic-schema';\nconst malformed: Dashboard = { title: 123, panels: [{ type: 'text', gridPos: { x: 'wrong', y: 0, w: 12, h: 8 } }] };\n`);
  negative = compile(path.join(temporary, 'negative.ts')); assert.notEqual(negative.status, 0); assert.match(negative.stdout, /not assignable to type 'string'/); assert.match(negative.stdout, /not assignable to type 'number'/);
} finally { assert.ok(path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(temporary).startsWith('rea-grafana-schema-')); await rm(temporary, { recursive: true, force: true }); }
const openapi = JSON.parse(await readFile(path.join(root, 'fixtures/vendor/v1-openapi.json'), 'utf8'));
assert.equal(openapi.components.schemas.Dashboard.properties.spec.allOf[0].$ref, '#/components/schemas/Unstructured');
const fixtureChecks = [];
for (const filename of ['original-textbox.json', 'original-v1-resource.json', 'original-v2-text.json']) {
  const original = await readFile(path.join(root, 'fixtures/vendor', filename), 'utf8'), imported = await call('grafana-import', { content: original }), exported = await call('grafana-export', imported); assert.equal(exported.content, original); fixtureChecks.push({ fixture: filename, sha256: createHash('sha256').update(original).digest('hex'), byteIdentical: true });
  assert.equal(fixtureChecks.at(-1).sha256, sourceRecord.sources.find(item => item.file === `fixtures/vendor/${filename}`).sha256);
}
await mkdir(path.join(root, 'results'), { recursive: true });
await writeFile(path.join(root, 'fixtures/schema-generated-dashboard.json'), JSON.stringify(document, null, 2) + '\n');
const evidence = { checkedAt: new Date().toISOString(), sourceCommit: sourceRecord.commit, candidateTag: sourceRecord.candidateTag, compilerVersion: spawnSync(process.execPath, [compiler, '--version'], { encoding: 'utf8' }).stdout.trim(), schemaSha256: sourceRecord.sources.find(item => item.file.endsWith('classic-schema.ts')).sha256, checks: { generatedCompleteClassicDocumentAcceptedByPinnedTypes: positive.status === 0, malformedTitleAndGridRejectedByPinnedTypes: negative.status !== 0, v1SpecIsUnstructured: true }, fixtureChecks, failed: 0, boundaries: ['Compile-time structural typing against the official generated Classic types; not complete runtime JSON Schema validation.', 'Positive fixture is REA Studio generated output; unchanged exchange fixtures are exact pinned Grafana source fixtures.', 'V1 OpenAPI deliberately leaves the spec Unstructured; it cannot validate panel/plugin details.', 'No original Grafana server/client or migrations were executed. V2 is retained without local editing/rendering.', 'Unknown fields and legacy documents are preserved even when not representable by the generated Classic types.'], negativeDiagnostics: negative.stdout.split('\n').map(line => line.replace(/^.*negative\.ts\(/, 'negative.ts(')).join('\n').trim() };
await writeFile(path.join(root, 'results/grafana-schema-verification.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ checks: evidence.checks, unchangedOfficialFixtures: fixtureChecks.length, failed: evidence.failed }));
