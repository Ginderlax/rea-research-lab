// Recovery copies remain browser-local plaintext; this module never saves notes.
export const DRAFT_RECOVERY_LIMITS = Object.freeze({ records: 4, recordBytes: 2 * 1024 * 1024, totalBytes: 8 * 1024 * 1024, title: 4096, body: 2_000_000, tags: 16_384, notebookId: 200 });
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const NOTE_ID = /^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;
const FIELDS = ['id', 'version', 'title', 'body', 'tags', 'notebookId', 'isTodo', 'sourceNoteId', 'sourceRevision', 'pendingSave', 'updatedAt'];
const ALLOWED = new Set([...FIELDS, 'schema', 'scope']);
const STORE = 'records';
function problem(code, message) { const error = new Error(message); error.name = 'DraftRecoveryError'; error.code = code; return error; }
function requireScope(scope) { if (typeof scope !== 'string' || !UUID.test(scope)) throw problem('INVALID', 'Recovery needs a valid workspace identifier.'); }
function bytes(record) { return new TextEncoder().encode(JSON.stringify(record)).byteLength; }

// Deliberately preserve raw editor text, including values a later Save may reject.
export function validateDraftRecord(record, scope) {
  requireScope(scope);
  if (!record || typeof record !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(record))) throw problem('INVALID', 'Recovery copy must be a plain record.');
  const descriptors = Object.getOwnPropertyDescriptors(record), keys = Reflect.ownKeys(descriptors);
  if (keys.some(key => typeof key !== 'string' || !ALLOWED.has(key) || !Object.hasOwn(descriptors[key], 'value')) || FIELDS.some(key => !Object.hasOwn(descriptors, key))) throw problem('INVALID', 'Recovery copy has missing or unsupported fields.');
  const value = key => descriptors[key]?.value;
  if ((Object.hasOwn(descriptors, 'schema') && value('schema') !== 1) || (Object.hasOwn(descriptors, 'scope') && value('scope') !== scope)) throw problem('INVALID', 'Recovery copy belongs to a different schema or workspace.');
  if (typeof value('id') !== 'string' || !UUID.test(value('id')) || !Number.isSafeInteger(value('version')) || value('version') < 1) throw problem('INVALID', 'Recovery copy needs a valid identifier and positive version.');
  for (const key of ['title', 'body', 'tags', 'notebookId']) if (typeof value(key) !== 'string' || value(key).length > DRAFT_RECOVERY_LIMITS[key]) throw problem('INVALID', 'Recovery text exceeds its supported field limit.');
  if (typeof value('isTodo') !== 'boolean' || typeof value('pendingSave') !== 'boolean' || !Number.isSafeInteger(value('updatedAt')) || value('updatedAt') < 0) throw problem('INVALID', 'Recovery copy has invalid flags or time.');
  if (value('sourceNoteId') === null) {
    if (value('sourceRevision') !== 0) throw problem('INVALID', 'A new recovery copy starts at source revision zero.');
  } else if (typeof value('sourceNoteId') !== 'string' || !NOTE_ID.test(value('sourceNoteId')) || !Number.isSafeInteger(value('sourceRevision')) || value('sourceRevision') < 1) throw problem('INVALID', 'Recovery provenance has an invalid note identifier or revision.');
  const result = { schema: 1, scope };
  for (const key of FIELDS) result[key] = value(key);
  if (bytes(result) > DRAFT_RECOVERY_LIMITS.recordBytes) throw problem('LIMIT', 'Recovery copy exceeds the 2 MiB browser recovery limit. Save the note to keep it.');
  return result;
}

export async function openDraftRecovery(scope, options = {}) {
  requireScope(scope);
  const factory = options.indexedDB ?? globalThis.indexedDB;
  if (!factory || typeof factory.open !== 'function') throw problem('UNAVAILABLE', 'Browser recovery storage is unavailable. Save the note to keep it.');
  const db = await new Promise((resolve, reject) => {
    let request, settled = false;
    const failed = (code, message) => { if (!settled) { settled = true; reject(problem(code, message)); } };
    try { request = factory.open(`rea-notes-draft-recovery-v1-${scope}`, 1); }
    catch { failed('UNAVAILABLE', 'Browser recovery storage could not be opened. Save the note to keep it.'); return; }
    request.onblocked = () => failed('BLOCKED', 'Browser recovery storage is blocked by another page. Close that page and reopen Notes.');
    request.onerror = () => failed('UNAVAILABLE', 'Browser recovery storage could not be opened. Save the note to keep it.');
    request.onupgradeneeded = event => {
      if (settled) { request.transaction.abort(); return; }
      if (event.oldVersion !== 0) { request.transaction.abort(); return; }
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => {
      const opened = request.result;
      if (settled) { opened.close(); return; }
      if (opened.version !== 1 || opened.objectStoreNames.length !== 1 || !opened.objectStoreNames.contains(STORE)) { opened.close(); failed('CORRUPT', 'Recovery storage has an unsupported layout. Existing data was preserved.'); return; }
      settled = true; resolve(opened);
    };
  });
  let closed = false;
  const active = new Set(), retired = new Set();
  function close() {
    if (closed) return;
    closed = true;
    for (const transaction of active) { try { transaction.abort(); } catch {} }
    db.close();
  }
  db.onversionchange = close;
  function transact(mode, operation) {
    if (closed) return Promise.reject(problem('CLOSED', 'This recovery view is closed. Reopen Notes to use recovery.'));
    return new Promise((resolve, reject) => {
      let transaction, result, failure;
      try { transaction = db.transaction(STORE, mode); }
      catch { reject(problem('UNAVAILABLE', 'Browser recovery storage is unavailable. Save the note to keep it.')); return; }
      active.add(transaction);
      const fail = error => { failure = error; try { transaction.abort(); } catch {} };
      transaction.oncomplete = () => { active.delete(transaction); resolve(result); };
      transaction.onabort = () => { active.delete(transaction); reject(failure ?? problem(transaction.error?.name === 'QuotaExceededError' ? 'QUOTA' : 'UNAVAILABLE', 'Recovery write did not complete. The last committed copy was preserved; Save is still available.')); };
      try {
        const store = transaction.objectStore(STORE);
        if (store.keyPath !== 'id' || store.autoIncrement) throw problem('CORRUPT', 'Recovery storage has an unsupported key layout. Existing data was preserved.');
        operation(store, value => { result = value; }, fail);
      }
      catch (error) { fail(error); }
    });
  }
  // Read inside the same transaction as each mutation, so capacity and versions
  // are checked atomically across tabs. Corrupt rows are never silently deleted.
  function scan(store, done, fail) {
    const rows = []; let total = 0;
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) { try { done(rows, total); } catch (error) { fail(error); } return; }
      try {
        const raw = cursor.value;
        if (!raw || raw.schema !== 1 || raw.scope !== scope) throw problem('CORRUPT', 'Recovery storage contains an unsupported copy. Existing data was preserved.');
        const row = validateDraftRecord(raw, scope);
        if (cursor.primaryKey !== row.id) throw problem('CORRUPT', 'Recovery storage contains a mismatched identifier. Existing data was preserved.');
        rows.push(row); total += bytes(row);
        if (rows.length > DRAFT_RECOVERY_LIMITS.records || total > DRAFT_RECOVERY_LIMITS.totalBytes) throw problem('CORRUPT', 'Recovery storage exceeds its supported capacity. Existing data was preserved.');
        cursor.continue();
      } catch { fail(problem('CORRUPT', 'Recovery storage contains an invalid copy. Existing data was preserved.')); }
    };
  }
  return {
    list() {
      return transact('readonly', (store, finish, fail) => scan(store, rows => finish(rows.sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id))), fail));
    },
    put(record) {
      let snapshot;
      try { snapshot = validateDraftRecord(record, scope); }
      catch (error) { return Promise.reject(error); }
      if (retired.has(snapshot.id)) return Promise.reject(problem('STALE', 'This recovery owner was retired. Keep the current editor copy.'));
      return transact('readwrite', (store, finish, fail) => scan(store, (rows, total) => {
        if (retired.has(snapshot.id)) { fail(problem('STALE', 'This recovery owner was retired. Keep the current editor copy.')); return; }
        const previous = rows.find(row => row.id === snapshot.id);
        if (previous && previous.version >= snapshot.version) { fail(problem('STALE', 'A newer recovery copy already exists. It was preserved.')); return; }
        if ((!previous && rows.length >= DRAFT_RECOVERY_LIMITS.records) || total - (previous ? bytes(previous) : 0) + bytes(snapshot) > DRAFT_RECOVERY_LIMITS.totalBytes) { fail(problem('LIMIT', 'Browser recovery is full. Review and discard a recovery copy, or Save the note. No copy was removed.')); return; }
        store.put(snapshot); finish(snapshot);
      }, fail));
    },
    remove(id, version) {
      if (typeof id !== 'string' || !UUID.test(id) || !Number.isSafeInteger(version) || version < 1) return Promise.reject(problem('INVALID', 'Choose an exact recovery identifier and version to discard.'));
      return transact('readwrite', (store, finish, fail) => scan(store, rows => {
        const previous = rows.find(row => row.id === id);
        if (!previous || previous.version !== version) { finish(false); return; }
        store.delete(id); finish(true);
      }, fail)).then(removed => { if (removed) retired.add(id); return removed; });
    },
    close,
  };
}
