import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { handle } from './server.mjs';
import { followInternalLink } from './client.mjs';
import { inlineTokens } from './markdown.mjs';
import { createStore, createWorkspace } from '../../lib/storage.mjs';
import { readTar, readJex, writeTar, digest, decodeBase64, MAX_RESOURCE } from './jex.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureBytes = await readFile(path.join(here, 'fixtures/pinned-joplin.jex'));
const provenance = JSON.parse(await readFile(path.join(here, 'fixtures/pinned-joplin.json'), 'utf8'));
async function setup(t) {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'rea-notes-jex-')), store = await createStore(path.join(folder, 'store')), workspace = await createWorkspace(path.join(folder, 'workspace'));
  t.after(async () => { assert.ok(path.resolve(folder).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(folder).startsWith('rea-notes-jex-')); await rm(folder, { recursive: true, force: true }); });
  return { folder, store, workspace, call: (action, input = {}) => handle({ action, input, store, workspace }) };
}
function changedHeader(bytes, alter) { const output = Buffer.from(bytes); alter(output.subarray(0, 512)); output.fill(32, 148, 156); output.write([...output.subarray(0, 512)].reduce((a, b) => a + b, 0).toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii'); return output; }
function alteredRecord(id, change) { const files = readTar(fixtureBytes); files.set(id + '.md', Buffer.from(change(files.get(id + '.md').toString('utf8')))); return writeTar(files); }

test('internal Joplin links navigate local notes and download referenced resources without replacing retained drafts', async t => {
  const { call } = await setup(t); await call('jex-import', { base64: fixtureBytes.toString('base64') });
  const sourceNoteId = '3'.repeat(32); let opened = null, downloaded = null;
  const options = { api: call, sourceNoteId, mayDiscard: () => false, openNote: note => { opened = note; }, downloadResource: value => { downloaded = value; } };
  assert.equal((await followInternalLink('4'.repeat(32), options)).reason, 'draft-retained'); assert.equal(opened, null);
  assert.equal((await followInternalLink(sourceNoteId, options)).reason, 'already-open'); assert.equal(opened, null);
  assert.equal((await followInternalLink('4'.repeat(32), { ...options, mayDiscard: () => true })).opened, true); assert.equal(opened.title, 'Linked');
  assert.equal((await followInternalLink('5'.repeat(32), options)).downloaded, true); assert.deepEqual(Buffer.from(downloaded.base64, 'base64'), Buffer.from([0, 1, 127, 128, 255]));
  await assert.rejects(call('link-target', { id: '5'.repeat(32), noteId: '4'.repeat(32) }), /not linked/);
  await assert.rejects(call('link-target', { id: '1'.repeat(32), noteId: sourceNoteId }), /unsupported/);
  await assert.rejects(call('link-target', { id: 'f'.repeat(32), noteId: sourceNoteId }), /does not exist/);
  assert.deepEqual(inlineTokens('[Local](:/' + 'A'.repeat(32) + ')'), [{ type: 'internal-link', text: 'Local', id: 'a'.repeat(32) }]);
  for (const raw of [':/' + 'a'.repeat(31), ':/' + 'a'.repeat(33), 'javascript:alert', 'file:///data']) assert.deepEqual(inlineTokens(`[Literal](${raw})`), [{ type: 'text', text: `[Literal](${raw})` }]);
});

test('native-TAR original-serialized fixture imports with IDs, hierarchy, metadata, links, tags and bytes intact', async t => {
  const { call, folder } = await setup(t); assert.equal(digest(fixtureBytes), provenance.archiveSha256);
  const result = await call('jex-import', { base64: fixtureBytes.toString('base64') }); assert.equal(result.imported, 2); assert.equal(result.notebooks, 2); assert.equal(result.attachments, 1);
  const note = await call('get', { id: '3'.repeat(32) }); assert.equal(note.notebook, 'Research / Experiments'); assert.deepEqual(note.tags, ['research']); assert.equal(note.createdAt, '2026-09-06T09:17:56.000Z'); assert.equal(note.joplin.props.latitude, '51.5'); assert.equal(note.joplin.props.is_todo, '1'); assert.ok(note.body.includes('\r\n'));
  const resource = await call('attachment-get', { noteId: note.id, id: '5'.repeat(32) }); assert.deepEqual(Buffer.from(resource.base64, 'base64'), Buffer.from([0, 1, 127, 128, 255]));
  const exported = await call('jex-export'), target = path.join(folder, 'roundtrip.jex'); await writeFile(target, Buffer.from(exported.base64, 'base64'));
  const listing = spawnSync('tar', ['-tf', target], { encoding: 'utf8' }); assert.equal(listing.status, 0, listing.stderr || 'A native TAR parser is required for independent verification.'); assert.equal(listing.stdout.trim().split(/\r?\n/).length, 8);
  for (const [id, expected] of Object.entries(provenance.expected)) { const parsed = spawnSync('tar', ['-xOf', target, id + '.md']); assert.equal(parsed.status, 0, parsed.stderr.toString()); assert.equal(digest(parsed.stdout), expected.rawSha256, 'Export differs from official serialized record: ' + id); }
  const rawBinary = spawnSync('tar', ['-xOf', target, 'resources/' + '5'.repeat(32) + '.bin']); assert.equal(rawBinary.status, 0); assert.equal(digest(rawBinary.stdout), provenance.resourceSha256);
});
test('edits and new attachments retain original metadata and produce valid raw relationships', async t => {
  const { call } = await setup(t); await call('jex-import', { base64: fixtureBytes.toString('base64') });
  let note = await call('get', { id: '3'.repeat(32) }); note = await call('save', { ...note, title: 'Changed', tags: ['research', 'new-tag'] });
  const added = await call('attachment-add', { id: note.id, revision: note.revision, filename: 'evidence.txt', mime: 'text/plain', base64: Buffer.from('Evidence 🧪').toString('base64') });
  assert.equal(added.note.revision, 3); assert.equal((await call('attachment-list', { id: note.id })).attachments.length, 2);
  const exported = readJex(Buffer.from((await call('jex-export')).base64, 'base64')), edited = exported.records.get(note.id);
  assert.equal(edited.title, 'Changed'); assert.equal(edited.props.author, note.joplin.props.author); assert.equal(edited.props.created_time, note.joplin.props.created_time); assert.equal(edited.props.parent_id, '2'.repeat(32)); assert.equal(edited.props.is_todo, '1'); assert.equal(exported.resources.size, 2);
  assert.equal([...exported.records.values()].filter(r => r.type === 6 && r.props.note_id === note.id).length, 2);
  await assert.rejects(call('attachment-add', { id: note.id, revision: note.revision, filename: 'stale.txt', base64: '' }), /changed/);
  await assert.rejects(call('attachment-get', { noteId: '4'.repeat(32), id: added.attachment.id }), /not referenced/);
});
test('colliding IDs and unsupported or broken records reject the whole import before mutation', async t => {
  const { call, store } = await setup(t); await call('jex-import', { base64: fixtureBytes.toString('base64') }); const before = JSON.stringify(await store.get('notes-state-v2'));
  await assert.rejects(call('jex-import', { base64: fixtureBytes.toString('base64') }), /collision/); assert.equal(JSON.stringify(await store.get('notes-state-v2')), before);
  const cases = [
    [alteredRecord('3'.repeat(32), raw => raw.replace('encryption_applied: 0', 'encryption_applied: 1')), /Encrypted/],
    [alteredRecord('3'.repeat(32), raw => raw + '\nunknown_future_field: ignored'), /Unsupported raw metadata/],
    [alteredRecord('3'.repeat(32), raw => raw.replace('markup_language: 1', 'markup_language: 2')), /HTML notes/],
    [alteredRecord('7'.repeat(32), raw => raw.replace('note_id: ' + '3'.repeat(32), 'note_id: ' + 'f'.repeat(32))), /Broken/],
    [alteredRecord('1'.repeat(32), raw => raw.replace('parent_id: ', 'parent_id: ' + '2'.repeat(32))), /cycle/],
    [alteredRecord('5'.repeat(32), raw => raw.replace('size: 5', 'size: 4')), /size/],
    [alteredRecord('3'.repeat(32), raw => raw.replace('type_: 1', 'type_: 13')), /Unsupported Joplin record/],
    [alteredRecord('3'.repeat(32), raw => raw.replace('latitude: 51.5', 'latitude: Infinity')), /Invalid numeric/],
    [alteredRecord('3'.repeat(32), raw => raw + '\nid: ' + '3'.repeat(32)), /duplicate raw property/],
    [alteredRecord('3'.repeat(32), raw => raw.replace('created_time: 2026-09-06T09:17:56.000Z', 'created_time: 2026-02-30T09:17:56.000Z')), /Invalid raw date/],
  ];
  for (const [bytes, error] of cases) { await assert.rejects(call('jex-import', { base64: bytes.toString('base64') }), error); assert.equal(JSON.stringify(await store.get('notes-state-v2')), before); }
});
test('saving an unchanged imported title, notebook or tag never normalizes metadata away', async t => {
  const { call } = await setup(t); let files = readTar(fixtureBytes);
  for (const id of ['1', '3', '6']) { const name = id.repeat(32) + '.md', raw = files.get(name).toString('utf8'); files.set(name, Buffer.from(' ' + raw.slice(0, raw.indexOf('\n')) + ' ' + raw.slice(raw.indexOf('\n')))); }
  await call('jex-import', { base64: writeTar(files).toString('base64') });
  const note = await call('get', { id: '3'.repeat(32) }); await call('save', { ...note, body: note.body + '\nEdited only the body.' });
  const exported = readJex(Buffer.from((await call('jex-export')).base64, 'base64'));
  assert.equal(exported.records.get(note.id).title, ' Alpha 🧪 '); assert.equal(exported.records.get(note.id).props.parent_id, '2'.repeat(32)); assert.equal(exported.records.get('6'.repeat(32)).title, ' research '); assert.ok(exported.records.has('7'.repeat(32)));
});
test('TAR checksum, truncation, duplicates, traversal, links, missing resources and trailing payload fail closed', () => {
  const broken = Buffer.from(fixtureBytes); broken[1] ^= 1; assert.throws(() => readJex(broken), /checksum/);
  assert.throws(() => readJex(fixtureBytes.subarray(0, fixtureBytes.length - 1)), /complete blocks/);
  assert.throws(() => readJex(changedHeader(fixtureBytes, h => { h.fill(0, 0, 100); h.write('../outside.md', 0); })), /unsafe archive path/);
  assert.throws(() => readJex(changedHeader(fixtureBytes, h => { h[156] = 50; })), /Only regular/);
  const files = readTar(fixtureBytes); assert.throws(() => readJex(writeTar([...files, [...files][0]])), /Duplicate archive path/);
  files.delete('resources/' + '5'.repeat(32) + '.bin'); assert.throws(() => readJex(writeTar(files)), /Missing resource/);
  const trailing = Buffer.from(fixtureBytes); trailing[trailing.length - 1] = 1; assert.throws(() => readJex(trailing), /trailing data/);
});
test('checksum-valid high-bit TAR names and numeric fields reject before storing anything', async t => {
  const { call, store } = await setup(t); await call('save', { title: 'Retained' }); const before = JSON.stringify(await store.get('notes-state-v2'));
  const highName = changedHeader(fixtureBytes, h => { for (let i = 0; i < 32; i++) h[i] |= 128; });
  const highSize = changedHeader(fixtureBytes, h => { h[124] |= 128; });
  const highChecksum = Buffer.from(fixtureBytes); highChecksum[148] |= 128;
  for (const bytes of [highName, highSize, highChecksum]) {
    assert.throws(() => readJex(bytes), /Non-ASCII TAR header/);
    await assert.rejects(call('jex-import', { base64: bytes.toString('base64') }), /Non-ASCII TAR header/);
    assert.equal(JSON.stringify(await store.get('notes-state-v2')), before);
  }
  const rawCarriageReturn = alteredRecord('3'.repeat(32), raw => raw.replace('Alpha 🧪', 'Alpha\r🧪'));
  await assert.rejects(call('jex-import', { base64: rawCarriageReturn.toString('base64') }), /single line/);
  assert.equal(JSON.stringify(await store.get('notes-state-v2')), before);
});
test('binary bounds, tamper detection and failed storage commits protect attachments', async t => {
  const { call, store, workspace } = await setup(t); const note = await call('save', { title: 'Bytes' });
  assert.throws(() => decodeBase64('AQ=', MAX_RESOURCE), /canonical/); assert.throws(() => decodeBase64(Buffer.alloc(MAX_RESOURCE + 1).toString('base64'), MAX_RESOURCE), /limit/);
  await assert.rejects(call('attachment-add', { id: note.id, revision: note.revision, filename: '../bad', base64: '' }), /safe filename/);
  const originalSet = store.set; store.set = async () => { throw new Error('Injected storage failure'); };
  await assert.rejects(call('attachment-add', { id: note.id, revision: note.revision, filename: 'test.bin', base64: 'AAE=' }), /Injected/); store.set = originalSet;
  assert.deepEqual(await readdir(workspace.resolve('attachments')), []); assert.equal((await call('get', { id: note.id })).revision, 1);
  const attached = await call('attachment-add', { id: note.id, revision: note.revision, filename: 'test.bin', base64: 'AAE=' }), metadata = (await store.get('notes-state-v2')).resources[attached.attachment.id];
  await writeFile(workspace.resolve(`attachments/${metadata.id}-${metadata.sha256}.bin`), Buffer.from('tampered'));
  await assert.rejects(call('attachment-get', { noteId: note.id, id: metadata.id }), /integrity/); await assert.rejects(call('jex-export'), /integrity/);
});
test('existing legacy notes migrate without deletion and export as valid Joplin identifiers', async t => {
  const { call, store } = await setup(t), id = 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e5e5', now = '2026-09-06T09:17:56.000Z';
  await store.set('notes-note-' + id, { id, title: 'Legacy', body: 'Old text', tags: ['old'], notebook: 'Old notebook', createdAt: now, updatedAt: now, revision: 1, deletedAt: null, history: [] });
  assert.equal((await call('list')).total, 1); const note = await call('get', { id }); await call('save', { ...note, body: 'Migrated' });
  assert.ok(await store.get('notes-note-' + id)); assert.equal((await call('get', { id })).body, 'Migrated');
  const exported = readJex(Buffer.from((await call('jex-export')).base64, 'base64')); assert.equal(exported.records.get(id.replaceAll('-', '')).body, 'Migrated'); assert.equal([...exported.records.values()].filter(r => r.type === 6).length, 1);
});
