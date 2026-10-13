// Test tooling only. Executes four pinned official serialization methods in an
// isolated harness; no original implementation is used by the Notes application.
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { handle } from './server.mjs';
import { createStore, createWorkspace } from '../../lib/storage.mjs';

const commit = 'c17c205049ce74e449dc1ce08cbd1c875410d7d5';
const baseUrl = `https://raw.githubusercontent.com/laurent22/joplin/${commit}/`;
const sha = value => createHash('sha256').update(value).digest('hex');
const here = path.dirname(fileURLToPath(import.meta.url));
function method(source, name) {
  const start = source.search(new RegExp(`public static (?:async )?${name}\\(`));
  if (start < 0) throw new Error('Pinned source method missing: ' + name);
  const brace = source.indexOf('{', start); let depth = 0;
  for (let i = brace; i < source.length; i++) { if (source[i] === '{') depth++; if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1); }
  throw new Error('Incomplete pinned method.');
}
export async function officialOracle() {
  const paths = ['packages/lib/models/BaseItem.ts', 'packages/lib/services/database/types.ts'];
  const sources = await Promise.all(paths.map(async name => { const response = await fetch(baseUrl + name); if (!response.ok) throw new Error(`Official source fetch failed: ${response.status}`); const bytes = Buffer.from(await response.arrayBuffer()); return { path: name, bytes, text: bytes.toString('utf8'), sha256: sha(bytes) }; }));
  const schema = new Map();
  for (const [type, name] of [[1, 'Note'], [2, 'Folder'], [4, 'Resource'], [5, 'Tag'], [6, 'NoteTag']]) {
    const body = new RegExp(`export interface ${name}Entity \\{([\\s\\S]*?)\\n\\}`).exec(sources[1].text)?.[1]; if (!body) throw new Error('Pinned schema missing.');
    schema.set(type, Object.fromEntries([...body.matchAll(/'([^']+)'\?: (number|string)/g)].map(m => [m[1], m[2]])));
  }
  const source = sources[0].text;
  const extracted = 'class Oracle {\n' + ['serialize_format', 'unserialize_format', 'serialize', 'unserialize'].map(name => method(source, name)).join('\n') + '\n}\nOracle;';
  const moment = value => ({ format: () => String(Date.parse(value)) });
  moment.unix = seconds => ({ utc: () => ({ format: () => new Date(seconds * 1000).toISOString().slice(0, -1) }) });
  const Oracle = vm.runInNewContext(stripTypeScriptTypes(extracted), {
    moment, BaseModel: { TYPE_NOTE: 1 }, Database: { formatValue: (type, value) => type === 'number' ? Number(value) : value }, JoplinError: Error,
  });
  Oracle.filter = value => value;
  Oracle.itemClass = value => {
    const type = typeof value === 'number' ? value : Number(value.type_), fields = schema.get(type); if (!fields) throw new Error('Unsupported oracle item type.');
    return { fieldNames: () => Object.keys(fields).filter(key => key !== 'type_'), fieldType: key => fields[key], removeUnknownFields: value => Object.fromEntries(Object.entries(value).filter(([key]) => Object.hasOwn(fields, key))) };
  };
  return { Oracle, sources: sources.map(({ path, bytes, sha256 }) => ({ path, url: baseUrl + path, bytes: bytes.length, sha256 })) };
}
async function generate() {
  const { Oracle, sources } = await officialOracle(), at = Date.parse('2026-09-06T09:17:56.000Z');
  const id = digit => digit.repeat(32), common = type => ({ type_: type, created_time: at, updated_time: at + 1, user_created_time: at - 1, user_updated_time: at + 2, encryption_applied: 0, encryption_cipher_text: '' });
  const records = [
    { ...common(2), id: id('1'), title: 'Research', parent_id: '', icon: '{"type":1,"emoji":"🧪"}' },
    { ...common(2), id: id('2'), title: 'Experiments', parent_id: id('1') },
    { ...common(1), id: id('3'), title: 'Alpha 🧪', body: `First line\r\n\n[Other](:/${id('4')})\n[Data](:/${id('5')})\n\nkey: body text`, parent_id: id('2'), markup_language: 1, latitude: 51.5, longitude: -0.12, altitude: 31.25, author: 'Ada\nResearch\\nLiteral', source_url: 'https://example.com/fixture', application_data: '{"fixture":true}', is_todo: 1, todo_due: at + 1000, todo_completed: 0, deleted_time: 0 },
    { ...common(1), id: id('4'), title: 'Linked', body: 'Second note', parent_id: id('1'), markup_language: 1 },
    { ...common(4), id: id('5'), title: 'sample.bin', filename: 'sample.bin', file_extension: 'bin', mime: 'application/octet-stream', size: 5, encryption_blob_encrypted: 0 },
    { ...common(5), id: id('6'), title: 'research', parent_id: '' },
    { ...common(6), id: id('7'), note_id: id('3'), tag_id: id('6') },
  ];
  const folder = await mkdtemp(path.join(os.tmpdir(), 'rea-jex-fixture-'));
  try {
    await mkdir(path.join(folder, 'resources')); const expected = {}, filenames = [];
    for (const record of records) { const raw = await Oracle.serialize(record, Object.keys(record)); expected[record.id] = { rawSha256: sha(raw), originalParsed: await Oracle.unserialize(raw) }; const filename = record.id + '.md'; await writeFile(path.join(folder, filename), raw, 'utf8'); filenames.push(filename); }
    const resourceName = 'resources/' + id('5') + '.bin', bytes = Buffer.from([0, 1, 127, 128, 255]); await writeFile(path.join(folder, resourceName), bytes); filenames.push(resourceName);
    const fixtures = path.join(here, 'fixtures'); await mkdir(fixtures, { recursive: true }); const target = path.join(fixtures, 'pinned-joplin.jex');
    const tar = spawnSync('tar', ['-cf', target, '-C', folder, ...filenames], { encoding: 'utf8' }); if (tar.status !== 0) throw new Error(tar.stderr || 'System tar is required.');
    const archive = await readFile(target);
    await writeFile(path.join(fixtures, 'pinned-joplin.json'), JSON.stringify({ schema: 'rea-joplin-interop-fixture/v1', generatedAt: new Date().toISOString(), sourceCommit: commit, sourceMethods: ['BaseItem.serialize_format', 'BaseItem.unserialize_format', 'BaseItem.serialize', 'BaseItem.unserialize'], sources, oracleBoundary: 'Original methods run with identity field filtering, pinned schema field types, and minimal date/Database stubs. This checks raw serialization, not the complete Joplin application or importer.', tarTool: spawnSync('tar', ['--version'], { encoding: 'utf8' }).stdout.trim(), archiveSha256: sha(archive), archiveBytes: archive.length, resourceSha256: sha(bytes), expected }, null, 2) + '\n');
    console.log(`Generated ${records.length} original-serialized records with native TAR; SHA-256 ${sha(archive)}.`);
  } finally { if (!path.resolve(folder).startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(folder).startsWith('rea-jex-fixture-')) throw new Error('Unsafe temporary cleanup.'); await rm(folder, { recursive: true, force: true }); }
}
if (process.argv[2] === 'generate') await generate();
async function verify() {
  const { Oracle, sources } = await officialOracle(), fixture = await readFile(path.join(here, 'fixtures/pinned-joplin.jex')), provenance = JSON.parse(await readFile(path.join(here, 'fixtures/pinned-joplin.json'), 'utf8'));
  assert.equal(sha(fixture), provenance.archiveSha256); for (const source of sources) assert.equal(source.sha256, provenance.sources.find(s => s.path === source.path).sha256);
  const folder = await mkdtemp(path.join(os.tmpdir(), 'rea-jex-oracle-')); const checks = [];
  try {
    const store = await createStore(path.join(folder, 'store')), workspace = await createWorkspace(path.join(folder, 'workspace')), call = (action, input = {}) => handle({ action, input, store, workspace });
    await call('jex-import', { base64: fixture.toString('base64') });
    const first = await call('jex-export'), target = path.join(folder, 'export.jex'); await writeFile(target, Buffer.from(first.base64, 'base64'));
    for (const [id, expected] of Object.entries(provenance.expected)) { const raw = spawnSync('tar', ['-xOf', target, id + '.md']); assert.equal(raw.status, 0, raw.stderr.toString()); const parsed = await Oracle.unserialize(raw.stdout.toString('utf8')); assert.deepEqual(JSON.parse(JSON.stringify(parsed)), expected.originalParsed); checks.push({ id: 'original-parser-roundtrip-' + id, passed: true }); }
    let note = await call('get', { id: '3'.repeat(32) }); note = await call('save', { ...note, title: 'Edited fixture' });
    const fresh = await call('save', { title: 'Fresh exported note 🧪', body: 'Original application serializer is not used by REA Notes.', notebook: 'New notebook', tags: ['new-tag'] });
    const attached = await call('attachment-add', { id: fresh.id, revision: fresh.revision, filename: 'oracle.txt', mime: 'text/plain', base64: Buffer.from('Original parser accepted this exported resource.').toString('base64') });
    const second = await call('jex-export'); await writeFile(target, Buffer.from(second.base64, 'base64'));
    const listing = spawnSync('tar', ['-tf', target], { encoding: 'utf8' }); assert.equal(listing.status, 0, listing.stderr); const parsedRecords = [];
    for (const member of listing.stdout.trim().split(/\r?\n/).filter(name => name.endsWith('.md'))) { const raw = spawnSync('tar', ['-xOf', target, member]); assert.equal(raw.status, 0, raw.stderr.toString()); parsedRecords.push(JSON.parse(JSON.stringify(await Oracle.unserialize(raw.stdout.toString('utf8'))))); checks.push({ id: 'original-parser-edited-export-' + member, passed: true }); }
    const exportedFresh = parsedRecords.find(r => r.id === fresh.id.replaceAll('-', '')); assert.equal(exportedFresh.title, fresh.title); assert.equal(exportedFresh.body, attached.note.body); assert.ok(parsedRecords.some(r => r.id === exportedFresh.parent_id && r.title === 'New notebook')); assert.ok(parsedRecords.some(r => r.type_ === 6 && r.note_id === exportedFresh.id)); checks.push({ id: 'new-note-notebook-tag-resource-relations', passed: true });
    const originalEdited = parsedRecords.find(r => r.id === note.id); assert.equal(originalEdited.title, 'Edited fixture'); assert.equal(originalEdited.author, provenance.expected[note.id].originalParsed.author); assert.equal(originalEdited.is_todo, 1); checks.push({ id: 'edited-original-metadata-preserved', passed: true });
    const resource = parsedRecords.find(r => r.id === attached.attachment.id), bytes = spawnSync('tar', ['-xOf', target, 'resources/' + resource.id + '.' + resource.file_extension]); assert.equal(bytes.status, 0); assert.equal(sha(bytes.stdout), attached.attachment.sha256); assert.equal(resource.size, bytes.stdout.length); checks.push({ id: 'original-resource-metadata-and-binary-agree', passed: true });
    const implementationFingerprints = await Promise.all(['server.mjs', 'jex.mjs', 'client.mjs', 'markdown.mjs', 'interop-fixture-tool.mjs'].map(async name => ({ path: 'products/rea-studio/apps/notes/' + name, sha256: sha(await readFile(path.join(here, name))) })));
    await writeFile(path.join(here, 'fixtures/oracle-verification.json'), JSON.stringify({ schema: 'rea-joplin-original-serialization-verification/v1', verifiedAt: new Date().toISOString(), sourceCommit: commit, sources, fixtureSha256: sha(fixture), implementationFingerprints, editedExportSha256: second.sha256, nodeVersion: process.version, tarTool: spawnSync('tar', ['--version'], { encoding: 'utf8' }).stdout.trim(), methodsExecuted: provenance.sourceMethods, boundary: provenance.oracleBoundary, fullOriginalApplicationExecuted: false, checks, passed: checks.length, failed: 0 }, null, 2) + '\n');
    console.log(`Original pinned serializer/parser + independent TAR: ${checks.length} checks passed.`);
  } finally { if (!path.resolve(folder).startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(folder).startsWith('rea-jex-oracle-')) throw new Error('Unsafe temporary cleanup.'); await rm(folder, { recursive: true, force: true }); }
}
if (process.argv[2] === 'verify') await verify();
