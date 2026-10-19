import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDraftRecord } from './draft-recovery.mjs';

const scope = 'bf7dafcf-9601-4a3d-a634-3f8406161499';
const otherScope = '0ee7db05-5426-4317-9950-258646e87057';
const id = '0ddc891e-4acb-4d10-8aa4-0afab3119847';
const record = changes => ({
  id, version: 1, title: '  A recoverable 🧪 title  ', body: '# Draft\n<unexecuted text>\n',
  tags: ' work,  reference,work ', notebookId: '__default__', isTodo: true,
  sourceNoteId: null, sourceRevision: 0, pendingSave: false, updatedAt: 1790000000123,
  ...changes,
});

test('draft recovery records preserve exact editor text and creation type while adding only their explicit storage schema and scope', () => {
  const input = record(), before = structuredClone(input);
  const value = validateDraftRecord(input, scope);
  assert.deepEqual(input, before);
  assert.deepEqual(value, { ...before, schema: 1, scope });
  assert.notEqual(value, input);
  input.title = 'Changed by caller later';
  assert.equal(value.title, before.title);
  assert.equal(validateDraftRecord(record({ notebookId: '', isTodo: false }), scope).notebookId, '');
});

test('draft recovery validation keeps source identity as provenance and refuses inconsistent saved revisions, stale consent fields and foreign namespaces', () => {
  for (const sourceNoteId of ['3'.repeat(32), 'b97cd61b-ae96-4aaa-91ee-e436b936f27e']) {
    const value = validateDraftRecord(record({ sourceNoteId, sourceRevision: 7, pendingSave: true }), scope);
    assert.equal(value.sourceNoteId, sourceNoteId); assert.equal(value.sourceRevision, 7); assert.equal(value.pendingSave, true);
  }
  for (const change of [
    { sourceNoteId: null, sourceRevision: 1 }, { sourceNoteId: '3'.repeat(32), sourceRevision: 0 },
    { sourceNoteId: 'not-an-id', sourceRevision: 1 }, { sourceRevision: Number.MAX_SAFE_INTEGER + 1 },
    { acknowledged: true }, { schema: 2 }, { scope: otherScope },
  ]) assert.throws(() => validateDraftRecord(record(change), scope));
  assert.throws(() => validateDraftRecord(record(), 'invalid-scope'));
});

test('draft recovery validation rejects malformed record types, unsafe versions and nonfinite clocks without mutating the caller', () => {
  const invalid = [null, [], 'a draft', 1, record({ id: '../draft' }), record({ version: 0 }),
    record({ version: -1 }), record({ version: 1.5 }), record({ version: Number.MAX_SAFE_INTEGER + 1 }),
    record({ title: null }), record({ body: {} }), record({ tags: [] }), record({ notebookId: 2 }),
    record({ isTodo: 'true' }), record({ pendingSave: 1 }), record({ updatedAt: NaN }), record({ updatedAt: Infinity })];
  for (const value of invalid) {
    const before = structuredClone(value);
    assert.throws(() => validateDraftRecord(value, scope));
    assert.deepEqual(value, before);
  }
  const polluted = JSON.parse('{"__proto__":{"draftPolluted":true}}');
  const input = { ...record(), ...polluted };
  assert.throws(() => validateDraftRecord(input, scope));
  assert.equal({}.draftPolluted, undefined);
});

test('draft recovery record limits admit documented text boundaries and separately enforce UTF8 serialized bytes', () => {
  const largestAsciiFields = record({ title: 't'.repeat(4096), body: 'b'.repeat(2_000_000), tags: 'g'.repeat(16384), notebookId: 'n'.repeat(200) });
  assert.equal(validateDraftRecord(largestAsciiFields, scope).body.length, 2_000_000);
  for (const change of [
    { title: 't'.repeat(4097) }, { body: 'b'.repeat(2_000_001) },
    { tags: 'g'.repeat(16385) }, { notebookId: 'n'.repeat(201) },
    { body: '🧪'.repeat(600_000) },
  ]) assert.throws(() => validateDraftRecord(record(change), scope));
});
