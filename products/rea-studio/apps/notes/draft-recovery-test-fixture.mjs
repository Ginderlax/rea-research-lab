import assert from 'node:assert/strict';
import { render } from './client.mjs';
import { Element, find, memory } from './notebook-trash-review-fixture.mjs';
import { validateDraftRecord } from './draft-recovery.mjs';

export const scope = 'bf7dafcf-9601-4a3d-a634-3f8406161499';
export const copyId = '0ddc891e-4acb-4d10-8aa4-0afab3119847';
export const copyRecord = changes => ({ id: copyId, version: 1, title: 'Recovery specimen', body: 'Recovered body', tags: ' lab,  research ', notebookId: '__default__', isTodo: false, sourceNoteId: null, sourceRevision: 0, pendingSave: false, updatedAt: 1790000000123, ...changes });

// Test seam for the published async store contract, not an IndexedDB substitute.
// Real atomic IndexedDB limits/version behavior requires the separate browser run.
export function recoveryStore(initial = []) {
  const rows = new Map(initial.map(row => [row.id, structuredClone(row)])), retired = new Set(), waiters = new Set();
  const store = { rows, puts: [], removes: [], failPut: null, failList: null, closes: 0,
    async list() { if (store.failList) throw store.failList; return [...rows.values()].map(row => structuredClone(row)).sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id)); },
    async put(input) {
      const row = validateDraftRecord(input, scope); store.puts.push(structuredClone(row));
      try {
        if (store.failPut) throw store.failPut;
        if (retired.has(row.id)) throw new Error('Retired recovery identity');
        if (rows.has(row.id) && rows.get(row.id).version >= row.version) throw new Error('Recovery version is not newer');
        rows.set(row.id, structuredClone(row)); return structuredClone(row);
      } finally { for (const update of [...waiters]) update(); }
    },
    async remove(id, version) {
      store.removes.push({ id, version });
      if (!rows.has(id) || rows.get(id).version !== version) return false;
      rows.delete(id); retired.add(id); for (const update of [...waiters]) update(); return true;
    },
    close() { store.closes++; },
    when(predicate) {
      if (predicate(store)) return Promise.resolve();
      return new Promise(resolve => { const update = () => { if (predicate(store)) { waiters.delete(update); resolve(); } }; waiters.add(update); });
    },
  };
  return store;
}

export async function recoveryUi(t, { store = recoveryStore(), hook = async () => {} } = {}) {
  const previous = { document: globalThis.document, window: globalThis.window };
  globalThis.document = { createElement: tag => new Element(tag), createTextNode: text => Object.assign(new Element('#text'), { textContent: text }) };
  globalThis.window = { confirm: () => true };
  const m = memory(), calls = [];
  let tree = await m.call('notebook-create', { title: 'Recovery parent', revision: 0 }); const parent = tree.notebook.id;
  tree = await m.call('notebook-create', { title: 'Recovery child', parentId: parent, revision: tree.revision }); const child = tree.notebook.id;
  const original = await m.call('save', { title: 'Original saved note', body: 'Original saved body', notebookId: child, tags: ['original'] });
  let root, dispose;
  const api = async (action, input = {}) => { calls.push({ action, input: structuredClone(input) }); const result = await m.call(action, input); await hook({ action, input, result }); return result; };
  const f = { ...m, store, calls, original, parent, child, api,
    get root() { return root; },
    byLabel(label) { return find(root, node => node.attributes['aria-label'] === label); },
    byText(text) { return find(root, node => node.textContent === text); },
    entry(title) { return f.byLabel('Recovery copy: ' + title); },
    async click(node) { assert(node, 'Expected a visible control'); if (node.disabled) return false; await node.onclick(); return true; },
    async type(label, value) { const node = f.byLabel(label); assert(node && !node.disabled); node.value = value; node.oninput?.(); },
    fields() { return ['Note title', 'Markdown note', 'Note tags', 'Notebook'].map(name => f.byLabel(name).value); },
    async refresh() { await f.click(f.byText('Refresh recovery copies')); },
    async mount() { if (dispose) { dispose(); dispose = null; } root = new Element('root'); dispose = await render(root, api, { recovery: { scope, store } }); },
    dispose() { if (dispose) { dispose(); dispose = null; } },
    async openOriginal() { await f.click(find(root, node => node.tagName === 'button' && node.textContent.startsWith(original.title + ' · '))); },
    async acknowledge(title) { const entry = f.entry(title), box = find(entry, node => node.attributes['aria-label'] === 'I want a separate note from this recovery copy'); assert(box); box.checked = true; await (box.onchange ?? box.oninput)?.(); },
    recoverButton(title, isTodo = false) { return find(f.entry(title), node => node.tagName === 'button' && node.textContent === (isTodo ? 'Recover as new to-do' : 'Recover as new note')); },
  };
  t.after(() => { f.dispose(); globalThis.document = previous.document; globalThis.window = previous.window; });
  await f.mount(); return f;
}

export function textOf(node) { return [node.textContent, ...node.children.map(textOf)].filter(Boolean).join(' '); }
export const saves = f => f.calls.filter(row => row.action === 'save');
export const primaryStatus = f => find(f.root, node => node.attributes.role === 'status');
