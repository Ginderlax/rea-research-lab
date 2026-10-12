import { renderMarkdown } from './markdown.mjs';
function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function download(value) { const url = URL.createObjectURL(new Blob([value.content], { type: value.mime })); const link = el('a', 'Download'); link.href = url; link.download = value.filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export async function render(root, api) {
  root.replaceChildren(el('h2', 'Local Notes'), el('p', 'Write Markdown notes, organize notebooks and tags, search, export and restore versions.', 'muted'));
  const status = el('p', 'Loading…', 'status'); status.setAttribute('role', 'status');
  const searchRow = el('div', undefined, 'row'), search = el('input'), tag = el('select'), notebookFilter = el('select'), trash = el('input'), trashLabel = el('label', 'Show trash '), searchButton = el('button', 'Search', 'button'), newButton = el('button', 'New note', 'button'), allExport = el('button', 'Export all notes', 'button');
  search.placeholder = 'Search titles, content and tags'; search.setAttribute('aria-label', 'Search notes'); tag.setAttribute('aria-label', 'Filter tag'); notebookFilter.setAttribute('aria-label', 'Filter notebook'); trash.type = 'checkbox'; trashLabel.append(trash); searchRow.append(search, tag, notebookFilter, trashLabel, searchButton, newButton, allExport);
  const list = el('div', undefined, 'card'), draft = el('div', undefined, 'card'), title = el('input'), notebook = el('input'), tags = el('input'), body = el('textarea'); title.placeholder = 'Note title'; title.setAttribute('aria-label', 'Note title'); notebook.placeholder = 'Notebook'; notebook.setAttribute('aria-label', 'Notebook'); tags.placeholder = 'Tags, separated by commas'; tags.setAttribute('aria-label', 'Note tags'); body.rows = 18; body.setAttribute('aria-label', 'Markdown note');
  const actions = el('div', undefined, 'row'), save = el('button', 'Save note', 'button'), remove = el('button', 'Move to trash', 'button'), restore = el('button', 'Restore note', 'button'), exportOne = el('button', 'Export Markdown', 'button'); actions.append(save, remove, restore, exportOne);
  const preview = el('article'), versions = el('div'); preview.className = 'card'; preview.setAttribute('aria-label', 'Markdown preview'); draft.append(el('h3', 'Note draft'), title, notebook, tags, body, actions, el('h3', 'Safe Markdown preview'), preview, versions);
  const imports = el('div', undefined, 'card'), upload = el('input'); upload.type = 'file'; upload.accept = '.md,.markdown,.json,text/markdown,application/json'; upload.setAttribute('aria-label', 'Import Markdown or REA notes JSON'); imports.append(el('h3', 'Import Markdown or REA export'), el('p', 'Markdown creates a new note. A REA JSON bundle creates copies of its notes with new IDs.', 'muted'), upload);
  root.append(searchRow, list, draft, imports, status);
  let current = null, dirty = false;
  async function run(operation) { try { await operation(); } catch (error) { status.textContent = error.message; } }
  function edited() { dirty = true; renderMarkdown(preview, body.value); status.textContent = 'Unsaved draft. Save to keep this note.'; }
  for (const control of [title, notebook, tags, body]) control.oninput = edited;
  function accept(note) {
    current = note; dirty = false; title.value = note?.title ?? ''; notebook.value = note?.notebook ?? 'Notes'; tags.value = note?.tags.join(', ') ?? ''; body.value = note?.body ?? ''; renderMarkdown(preview, body.value);
    save.disabled = Boolean(note?.deletedAt); remove.disabled = !note || Boolean(note.deletedAt); restore.disabled = !note?.deletedAt; exportOne.disabled = !note;
    versions.replaceChildren(el('h4', 'Previous saved versions'));
    for (const version of [...(note?.history ?? [])].reverse()) { const button = el('button', `Restore revision ${version.revision} (${version.updatedAt})`, 'button'); button.disabled = Boolean(note.deletedAt); button.onclick = () => run(async () => { if (dirty && !window.confirm('Discard the draft and restore this version?')) return; accept(await api('history-restore', { id: current.id, revision: current.revision, historyRevision: version.revision })); await refresh(); status.textContent = 'Historical version restored as a new revision.'; }); versions.append(button); }
  }
  function mayDiscard() { return !dirty || window.confirm('Discard this unsaved draft?'); }
  async function refresh() {
    const response = await api('list', { search: search.value, tag: tag.value, notebook: notebookFilter.value, trash: trash.checked });
    const oldTag = tag.value, oldNotebook = notebookFilter.value; tag.replaceChildren(Object.assign(el('option', 'All tags'), { value: '' })); notebookFilter.replaceChildren(Object.assign(el('option', 'All notebooks'), { value: '' }));
    for (const value of response.tags) tag.append(Object.assign(el('option', value), { value })); for (const value of response.notebooks) notebookFilter.append(Object.assign(el('option', value), { value })); tag.value = oldTag; notebookFilter.value = oldNotebook;
    list.replaceChildren(el('h3', `${response.total} notes`));
    if (!response.notes.length) list.append(el('p', 'No matching notes.', 'muted'));
    for (const note of response.notes) { const button = el('button', `${note.title} · ${note.notebook} · ${note.tags.join(', ')}`, 'button'), snippet = el('p', note.preview, 'muted'); button.onclick = () => run(async () => { if (!mayDiscard()) return; accept(await api('get', { id: note.id })); status.textContent = `Opened revision ${current.revision}.`; }); list.append(button, snippet); }
  }
  searchButton.onclick = () => run(refresh); search.onkeydown = event => { if (event.key === 'Enter') run(refresh); }; tag.onchange = notebookFilter.onchange = trash.onchange = () => run(refresh);
  newButton.onclick = () => { if (!mayDiscard()) return; accept(null); title.focus(); status.textContent = 'New note draft.'; };
  async function saveNote() { const note = await api('save', { id: current?.id, revision: current?.revision ?? 0, title: title.value, body: body.value, notebook: notebook.value, tags: tags.value.split(',').map(value => value.trim()).filter(Boolean) }); accept(note); await refresh(); status.textContent = `Saved revision ${note.revision}.`; }
  save.onclick = () => run(saveNote);
  body.onkeydown = event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); if (!save.disabled) run(saveNote); } };
  remove.onclick = () => run(async () => { if (!current || !mayDiscard() || !window.confirm('Move this note to trash? You can restore it.')) return; accept(await api('delete', { id: current.id, revision: current.revision })); await refresh(); status.textContent = 'Note moved to trash.'; });
  restore.onclick = () => run(async () => { accept(await api('restore', { id: current.id, revision: current.revision })); await refresh(); status.textContent = 'Note restored.'; });
  exportOne.onclick = () => run(async () => { download(await api('export', { id: current.id })); status.textContent = 'Saved note exported. Unsaved drafts are not included.'; });
  allExport.onclick = () => run(async () => { download(await api('export', { includeTrash: trash.checked })); status.textContent = 'Notes exported as JSON.'; });
  upload.onchange = () => run(async () => {
    const file = upload.files[0]; if (!file) return; if (file.size > 5_000_000) throw new Error('Import exceeds 5 MB.');
    const content = await file.text();
    if (/\.json$/i.test(file.name)) { const result = await api('import-bundle', { content }); await refresh(); status.textContent = `Imported ${result.imported} notes.`; }
    else { if (!mayDiscard()) return; const note = await api('import-markdown', { title: file.name.replace(/\.(?:md|markdown)$/i, ''), content }); accept(note); await refresh(); status.textContent = 'Markdown imported.'; }
    upload.value = '';
  });
  accept(null); await run(refresh); status.textContent = 'Notes are saved locally when you choose Save.';
}
