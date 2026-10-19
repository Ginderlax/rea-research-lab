// Source-assisted research code, AGPL-3.0-or-later. See the separate study NOTICE.
// Grammar contracts: Joplin Desktop 3.6.14, commit 7e2765a3857754d12dbadea442b60ceaf9d4b23d.
// This independently authored matcher implements a bounded metadata/substring mode, not SQLite FTS.
import { todoState } from './core.mjs';

const filters = new Set(['any', 'title', 'body', 'tag', 'notebook', 'created', 'updated', 'type', 'iscompleted', 'due', 'latitude', 'longitude', 'altitude', 'resource', 'sourceurl', 'id']);
const supported = new Set(['text', 'title', 'body', 'tag', 'notebook', 'type', 'iscompleted']);
const quoted = value => value.startsWith('"') && value.endsWith('"');
const unquote = value => value.startsWith('"') ? value.slice(1, -1) : value;
const addQuotes = value => quoted(value) ? value : `"${value}"`;
const asciiFold = value => value.replace(/[A-Z]/g, letter => letter.toLowerCase());

export const SEARCH_QUERY_LIMIT = 500;
export const SEARCH_TERM_LIMIT = 64;

export function parseSearchQuery(query) {
  if (typeof query !== 'string' || query.length > SEARCH_QUERY_LIMIT || query.includes('\0')) throw new Error('Search must be text no longer than 500 characters without NUL.');
  query = query.trim();
  const raw = [];
  let field = '_', buffer = '', insideQuote = false, insideFilter = false;
  const emit = () => {
    const negated = field.startsWith('-');
    raw.push({ name: (negated ? field.slice(1) : field).toLowerCase(), value: buffer, negated });
    field = '_'; buffer = '';
  };
  // Only ASCII space separates raw terms in the pinned parser; tabs are retained here.
  for (const character of query) {
    if (character === '"') {
      buffer += character;
      if (insideQuote) { emit(); insideQuote = false; } else insideQuote = true;
    } else if (character === ' ' && !insideQuote) {
      insideFilter = false;
      if (buffer) emit();
    } else if (character === ':' && !insideQuote && !insideFilter && (filters.has(buffer.toLowerCase()) || buffer.startsWith('-') && filters.has(buffer.slice(1).toLowerCase()))) {
      field = buffer.toLowerCase(); buffer = ''; insideFilter = true;
    } else buffer += character;
  }
  if (insideQuote) buffer += '"';
  if (buffer) emit();
  const terms = [];
  for (const term of raw) {
    const { name, value, negated } = term;
    if (name === '_') {
      terms.push({ name: 'text', value: addQuotes(value.startsWith('-') ? value.slice(1) : value), negated: value.startsWith('-'), quoted: quoted(value), wildcard: value.includes('*') });
    } else if (['tag', 'notebook', 'resource', 'sourceurl'].includes(name)) {
      terms.push({ name, value: unquote(value.replaceAll('*', '%')), negated });
    } else if (name === 'title' || name === 'body') {
      // A quoted field value is a set of terms, not a phrase, in the original parser.
      for (const part of unquote(value).split(/[\s-_]+/)) terms.push({ name, value: part, negated, wildcard: part.includes('*') });
    } else terms.push(term);
  }
  const invalidNegation = terms.find(term => (term.name === 'type' || term.name === 'iscompleted') && term.negated);
  if (invalidNegation) throw new Error(`${invalidNegation.name} can't be negated`);
  if (terms.some(term => term.name === 'type' && !['note', 'todo'].includes(term.value))) throw new Error('The value of filter "type" must be "note" or "todo"');
  if (terms.some(term => term.name === 'iscompleted' && !['0', '1'].includes(term.value))) throw new Error('The value of filter "iscompleted" must be "1" or "0"');
  if (terms.length > SEARCH_TERM_LIMIT) throw new Error('Search supports at most 64 parsed terms.');
  return Object.freeze(terms.map(term => Object.freeze(term)));
}

// SQLite LIKE's default ASCII case folding and its %/_ wildcards, on bounded labels.
// Dynamic-programming rows prevent query-controlled regular expressions/backtracking.
export function metadataLike(value, pattern) {
  const text = Array.from(asciiFold(value)), parts = Array.from(asciiFold(pattern));
  let previous = new Uint8Array(text.length + 1); previous[0] = 1;
  for (const part of parts) {
    const next = new Uint8Array(text.length + 1);
    if (part === '%') next[0] = previous[0];
    for (let index = 1; index <= text.length; index++) next[index] = part === '%' ? previous[index] || next[index - 1] : previous[index - 1] && (part === '_' || part === text[index - 1]);
    previous = next;
  }
  return Boolean(previous[text.length]);
}

function notebookScopes(records, terms) {
  const folders = Object.values(records).filter(record => record.type === 2);
  if (folders.length > 2000) throw new Error('Search notebook scope exceeds 2,000 folders.');
  const included = terms.filter(term => !term.negated), excluded = terms.filter(term => term.negated);
  const includeRoots = new Set(folders.filter(folder => included.some(term => metadataLike(folder.title, term.value))).map(folder => folder.props.id));
  const excludeRoots = new Set(folders.filter(folder => excluded.some(term => metadataLike(folder.title, term.value))).map(folder => folder.props.id));
  const includeIds = new Set(), excludeIds = new Set();
  for (const folder of folders) {
    let cursor = folder.props.id, depth = 0;
    const seen = new Set();
    while (cursor) {
      if (seen.has(cursor) || ++depth > 64) throw new Error('Search notebook scope contains a cycle or exceeds depth 64.');
      seen.add(cursor);
      const ancestor = records[cursor];
      if (ancestor?.type !== 2) throw new Error('Search notebook ancestor does not exist.');
      if (includeRoots.has(cursor)) includeIds.add(folder.props.id);
      if (excludeRoots.has(cursor)) excludeIds.add(folder.props.id);
      cursor = ancestor.props.parent_id ?? '';
    }
  }
  return note => (!included.length || includeIds.has(note.notebookId)) && !excludeIds.has(note.notebookId);
}

export function compileStructuredSearch(query, records = {}) {
  const terms = parseSearchQuery(query);
  for (const term of terms) {
    if (!supported.has(term.name)) throw new Error(`The Filters mode does not yet support ${term.name}:. Use title:, body:, tag:, notebook:, type: or iscompleted:.`);
    if (['text', 'title', 'body'].includes(term.name) && term.wildcard) throw new Error('Filters mode supports wildcards only in tag: and notebook:. Text, title and body use literal substring matching.');
  }
  const scope = notebookScopes(records, terms.filter(term => term.name === 'notebook'));
  const predicates = terms.filter(term => term.name !== 'notebook').map(term => {
    let match;
    if (term.name === 'tag') match = note => note.tags.some(tag => metadataLike(tag, term.value));
    else if (term.name === 'type') match = note => todoState(note).isTodo === (term.value === 'todo');
    else if (term.name === 'iscompleted') match = note => { const todo = todoState(note); return todo.isTodo && Boolean(todo.completed) === (term.value === '1'); };
    else {
      const value = (term.name === 'text' ? unquote(term.value) : term.value).toLowerCase();
      match = note => (term.name === 'title' ? [note.title] : term.name === 'body' ? [note.body] : [note.title, note.body]).some(text => text.toLowerCase().includes(value));
    }
    return term.negated ? note => !match(note) : match;
  });
  const preview = terms.find(term => !term.negated && (term.name === 'text' || term.name === 'body'));
  return Object.freeze({ terms, previewTerm: preview ? (preview.name === 'text' ? unquote(preview.value) : preview.value) : '', matches: note => scope(note) && predicates.every(predicate => predicate(note)) });
}
