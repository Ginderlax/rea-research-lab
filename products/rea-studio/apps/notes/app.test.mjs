import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from './server.mjs';
import { markdownBlocks, inlineTokens } from './markdown.mjs';
function fixture() { const data = new Map(); const store = { get: async (key, fallback) => structuredClone(data.get(key) ?? fallback), set: async (key, value) => { data.set(key, structuredClone(value)); }, list: async prefix => [...data.keys()].filter(key => key.startsWith(prefix)) }; return { data, store, call: (action, input) => handle({ action, input, store }) }; }
test('notes CRUD, search/tag/notebook filtering, revisions, history, trash and restore', async () => {
  const { call } = fixture();
  let note = await call('save', { title: 'Research', body: '# Hello\nImportant mechanism 🧪', notebook: 'Lab', tags: ['diff', 'diff', ' useful '] });
  assert.equal(note.revision, 1); assert.deepEqual(note.tags, ['diff', 'useful']);
  assert.equal((await call('list', { search: 'important research', tag: 'diff', notebook: 'Lab' })).notes[0].id, note.id);
  const first = note;
  note = await call('save', { ...note, body: 'Changed' }); assert.equal(note.revision, 2); assert.equal(note.history[0].body, first.body);
  await assert.rejects(call('save', { ...first, body: 'Stale' }), /changed/);
  note = await call('history-restore', { id: note.id, revision: note.revision, historyRevision: 1 }); assert.equal(note.body, first.body); assert.equal(note.revision, 3);
  note = await call('delete', { id: note.id, revision: note.revision }); assert.equal((await call('list')).total, 0); assert.equal((await call('list', { trash: true })).total, 1);
  await assert.rejects(call('save', { ...note, body: 'deleted' }), /Restore/);
  note = await call('restore', { id: note.id, revision: note.revision }); assert.equal((await call('list')).total, 1); assert.equal(note.revision, 5);
});
test('concurrent revision writes cannot overwrite the winning draft', async () => {
  const { call } = fixture(); const note = await call('save', { title: 'Race', body: 'zero' });
  const results = await Promise.allSettled(['first', 'second'].map(body => call('save', { ...note, body })));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1); assert.equal((await call('get', { id: note.id })).body, 'first');
});
test('Markdown export and JSON bundle re-import create independent note copies', async () => {
  const { call } = fixture(); const note = await call('import-markdown', { title: 'Unicode', content: '**🧪**', tags: ['demo'] });
  const markdown = await call('export', { id: note.id }); assert.equal(markdown.content, '# Unicode\n\n**🧪**\n');
  const bundle = await call('export', {}), imported = await call('import-bundle', { content: bundle.content }); assert.equal(imported.imported, 1); assert.notEqual(imported.ids[0], note.id);
  const copy = await call('get', { id: imported.ids[0] }); assert.equal(copy.body, note.body); assert.deepEqual(copy.tags, note.tags);
  const before = (await call('list')).total; await assert.rejects(call('import-bundle', { content: JSON.stringify({ schema: 'rea-notes/v1', notes: [{ title: 'Valid' }, { title: '' }] }) })); assert.equal((await call('list')).total, before);
});
test('safe Markdown subset never emits HTML or dangerous link schemes', () => {
  const input = '# Title\n\n<script>alert(1)</script>\n\n- **bold**\n- [Bad](javascript:alert)\n\n```js\n<img src=x onerror=alert(1)>\n```';
  const blocks = markdownBlocks(input); assert.equal(blocks[0].type, 'heading'); assert.equal(blocks[1].type, 'paragraph'); assert.equal(blocks[1].text, '<script>alert(1)</script>'); assert.equal(blocks[2].type, 'list'); assert.equal(blocks[3].type, 'code');
  assert.deepEqual(inlineTokens('[Bad](javascript:alert)'), [{ type: 'text', text: '[Bad](javascript:alert)' }]);
  assert.equal(inlineTokens('[OK](https://example.com)')[0].url, 'https://example.com/'); assert.equal(inlineTokens('**bold**')[0].type, 'strong');
});
test('history bounds and input validation prevent unbounded individual notes', async () => {
  const { call } = fixture(); let note = await call('save', { title: 'Versions' }); for (let i = 0; i < 25; i++) note = await call('save', { ...note, body: String(i) }); assert.equal(note.history.length, 20); assert.equal(note.history.at(-1).revision, 25);
  await assert.rejects(call('save', { title: '', body: '' }), /title/); await assert.rejects(call('save', { title: 'Large', body: 'x'.repeat(200_001) }), /200000/); await assert.rejects(call('save', { title: 'Tags', tags: 'bad' }), /tags/); await assert.rejects(call('unknown', {}), /Unknown/);
});
test('long malformed Markdown openers stay plain text without repeated delimiter scans', () => {
  const input = '['.repeat(200_000); assert.deepEqual(inlineTokens(input), [{ type: 'text', text: input }]);
});
test('multiline labels reject API and bundle writes before mutation while note bodies retain line breaks', async () => {
  const { call, data } = fixture(), initial = await call('save', { title: 'Retained', body: 'first\r\nsecond', notebook: 'Lab', tags: ['study'] });
  const before = JSON.stringify([...data]);
  for (const separator of ['\n', '\r', '\r\n']) for (const change of [{ title: `one${separator}two` }, { notebook: `one${separator}two` }, { tags: [`one${separator}two`] }]) {
    await assert.rejects(call('save', { title: 'New', ...change }), /single line/);
    await assert.rejects(call('save', { ...initial, ...change }), /single line/);
    await assert.rejects(call('import-bundle', { content: JSON.stringify({ schema: 'rea-notes/v1', notes: [{ title: 'Valid first item' }, { title: 'Invalid second item', ...change }] }) }), /single line/);
    assert.equal(JSON.stringify([...data]), before, 'Rejected labels must not commit even the valid bundle prefix.');
  }
  assert.equal((await call('get', { id: initial.id })).body, 'first\r\nsecond');
  assert.ok((await call('jex-export')).base64);
});
test('saved multiline legacy labels remain intact during body edits and JSON backup', async () => {
  const { call, data } = fixture(), id = 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e5e5', at = '2026-09-06T09:17:56.000Z';
  const old = { id, title: 'Old\nTitle', body: 'Old body', notebook: 'Old\rNotebook', tags: ['Old\r\nTag'], createdAt: at, updatedAt: at, revision: 1, deletedAt: null, history: [] };
  data.set('notes-note-' + id, structuredClone(old));
  const saved = await call('save', { ...old, body: 'Edited body only' });
  assert.equal(saved.title, old.title); assert.equal(saved.notebook, old.notebook); assert.deepEqual(saved.tags, old.tags);
  assert.deepEqual(data.get('notes-note-' + id), old, 'Legacy source records are never rewritten.');
  const backedUp = JSON.parse((await call('export')).content).notes[0];
  assert.equal(backedUp.title, old.title); assert.equal(backedUp.notebook, old.notebook); assert.deepEqual(backedUp.tags, old.tags);
  await assert.rejects(call('jex-export'), /Existing labels remain saved/);
});
