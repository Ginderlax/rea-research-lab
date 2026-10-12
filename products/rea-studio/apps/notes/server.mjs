import { randomUUID } from 'node:crypto';

const prefix = 'notes-note-', key = id => prefix + id;
let queue = Promise.resolve();
function validId(value) { if (typeof value !== 'string' || !/^[a-f0-9-]{36}$/.test(value)) throw new Error('Choose a valid note ID.'); return value; }
function text(value, name, limit) { if (typeof value !== 'string' || value.length > limit) throw new Error(`${name} must be text no longer than ${limit} characters.`); return value; }
function tags(value) { if (!Array.isArray(value) || value.length > 50) throw new Error('Use at most 50 tags.'); return [...new Set(value.map(item => text(item, 'Tag', 100).trim()).filter(Boolean))]; }
async function exclusive(store, operation) {
  const previous = queue; let release;
  const next = new Promise(resolve => { release = resolve; }); queue = next; await previous;
  try { return await operation(); } finally { release(); }
}
async function get(store, id) { const record = await store.get(key(validId(id)), null); if (!record) throw new Error('Note does not exist.'); return record; }
function checkRevision(note, value) { if (!Number.isInteger(value) || value !== note.revision) throw new Error('Note changed since it was opened. Reopen it before saving; your draft is preserved.'); }
function summary(note, query = '') { const at = query ? note.body.toLowerCase().indexOf(query.toLowerCase()) : 0; const start = Math.max(0, at - 40); const { body, history, ...rest } = note; return { ...rest, preview: body.slice(start, start + 180), characters: body.length, historyCount: history.length }; }
async function all(store) { return (await Promise.all((await store.list(prefix)).map(name => store.get(name, null)))).filter(Boolean); }

export async function handle({ action, input = {}, store }) {
  if (action === 'list') {
    const search = text(input.search ?? '', 'Search', 500).trim().toLowerCase(), tokens = search.split(/\s+/).filter(Boolean);
    const notes = await all(store), visible = notes.filter(note => Boolean(note.deletedAt) === Boolean(input.trash) && (!input.notebook || note.notebook === input.notebook) && (!input.tag || note.tags.includes(input.tag)) && tokens.every(token => `${note.title}\n${note.body}\n${note.tags.join(' ')}\n${note.notebook}`.toLowerCase().includes(token))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return { notes: visible.map(note => summary(note, tokens[0])), tags: [...new Set(notes.filter(note => !note.deletedAt).flatMap(note => note.tags))].sort(), notebooks: [...new Set(notes.filter(note => !note.deletedAt).map(note => note.notebook))].sort(), total: visible.length };
  }
  if (action === 'get') return get(store, input.id);
  if (action === 'save') return exclusive(store, async () => {
    const existing = input.id ? await get(store, input.id) : null;
    if (existing) { if (existing.deletedAt) throw new Error('Restore this note before editing.'); checkRevision(existing, input.revision); }
    else if (input.revision !== undefined && input.revision !== 0) throw new Error('New notes start at revision zero.');
    const title = text(input.title, 'Title', 300).trim(); if (!title) throw new Error('Give the note a title.');
    const body = text(input.body ?? '', 'Note', 200_000), notebook = text(input.notebook ?? 'Notes', 'Notebook', 200).trim() || 'Notes', cleanTags = tags(input.tags ?? []), now = new Date().toISOString();
    const history = existing ? [...existing.history, { revision: existing.revision, title: existing.title, body: existing.body, tags: existing.tags, notebook: existing.notebook, updatedAt: existing.updatedAt }].slice(-20) : [];
    const note = { id: existing?.id ?? randomUUID(), title, body, tags: cleanTags, notebook, createdAt: existing?.createdAt ?? now, updatedAt: now, revision: (existing?.revision ?? 0) + 1, deletedAt: null, history };
    await store.set(key(note.id), note); return note;
  });
  if (action === 'delete' || action === 'restore') return exclusive(store, async () => {
    const note = await get(store, input.id); checkRevision(note, input.revision);
    const updated = { ...note, deletedAt: action === 'delete' ? new Date().toISOString() : null, updatedAt: new Date().toISOString(), revision: note.revision + 1 };
    await store.set(key(updated.id), updated); return updated;
  });
  if (action === 'history-restore') return exclusive(store, async () => {
    const note = await get(store, input.id); checkRevision(note, input.revision);
    if (note.deletedAt) throw new Error('Restore this note before restoring a version.');
    const version = note.history.find(item => item.revision === input.historyRevision); if (!version) throw new Error('Historical version does not exist.');
    const { revision, title, body, tags: previousTags, notebook, updatedAt } = note;
    const updated = { ...note, title: version.title, body: version.body, tags: version.tags, notebook: version.notebook, history: [...note.history, { revision, title, body, tags: previousTags, notebook, updatedAt }].slice(-20), updatedAt: new Date().toISOString(), revision: revision + 1 };
    await store.set(key(updated.id), updated); return updated;
  });
  if (action === 'export') {
    if (input.id) { const note = await get(store, input.id); return { filename: `${note.title.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 80) || 'note'}.md`, mime: 'text/markdown;charset=utf-8', content: `# ${note.title}\n\n${note.body}\n` }; }
    const notes = (await all(store)).filter(note => input.includeTrash || !note.deletedAt);
    return { filename: 'rea-notes.json', mime: 'application/json', content: JSON.stringify({ schema: 'rea-notes/v1', exportedAt: new Date().toISOString(), notes }, null, 2) };
  }
  if (action === 'import-markdown') {
    const body = text(input.content, 'Markdown', 200_000);
    return handle({ action: 'save', input: { title: input.title, body, notebook: input.notebook ?? 'Imported', tags: input.tags ?? [] }, store });
  }
  if (action === 'import-bundle') return exclusive(store, async () => {
    if (typeof input.content !== 'string' || input.content.length > 5_000_000) throw new Error('Bundle must be JSON text no larger than 5 million characters.');
    let bundle; try { bundle = JSON.parse(input.content); } catch { throw new Error('Bundle is not valid JSON.'); }
    if (bundle?.schema !== 'rea-notes/v1' || !Array.isArray(bundle.notes) || bundle.notes.length > 1000) throw new Error('Expected a rea-notes/v1 bundle with at most 1,000 notes.');
    const now = new Date().toISOString();
    // Validate everything before writing; imported copies get new IDs to avoid collisions.
    const notes = bundle.notes.map(source => {
      if (!source || typeof source !== 'object') throw new Error('Each imported note must be an object.');
      const title = text(source.title, 'Title', 300).trim(); if (!title) throw new Error('Imported notes need titles.');
      return { id: randomUUID(), title, body: text(source.body ?? '', 'Body', 200_000), notebook: text(source.notebook ?? 'Imported', 'Notebook', 200).trim() || 'Imported', tags: tags(source.tags ?? []), createdAt: now, updatedAt: now, revision: 1, deletedAt: null, history: [] };
    });
    for (const note of notes) await store.set(key(note.id), note);
    return { imported: notes.length, ids: notes.map(note => note.id) };
  });
  throw new Error(`Unknown notes action: ${action}`);
}
