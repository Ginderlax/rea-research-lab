// Source-authored hosted-only Chromium checks; no original application executes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test as base, expect } from '@playwright/test';
import { start } from '../server.mjs';
assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
assert.equal(process.env.CI, 'true'); assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
assert.equal(process.env.GITHUB_REPOSITORY, 'Ginderlax/rea-research-lab');
assert.equal(process.env.GITHUB_JOB, 'draft-recovery-real-chromium');
for (const key of ['GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) assert(process.env[key]);
const evidence = await fs.realpath(process.env.REA_BROWSER_EVIDENCE);
const dataRoot = await fs.realpath(process.env.REA_BROWSER_DATA_ROOT);
const test = base.extend({
  host: async ({}, use, info) => {
    const dataDir = path.join(dataRoot, 'storage-' + info.testId.replace(/[^a-zA-Z0-9_-]/g, '_'));
    await fs.mkdir(dataDir); const host = await start({ port: 0, dataDir });
    try { await use(host); } finally { await host.close(); }
  },
});
async function record(name, value) { await fs.writeFile(path.join(evidence, name + '.json'), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); }
async function prepare(page, host) {
  await page.goto(host.url + '/#notes');
  await page.evaluate(async () => {
    const module = await import('/apps/notes/draft-recovery.mjs');
    window.storageSubject = module;
    window.makeRecoveryRecord = (scope, changes = {}) => ({ id: crypto.randomUUID(), version: 1, title: 'Synthetic draft', body: 'Synthetic body', tags: 'one, two', notebookId: '__default__', isTodo: false, sourceNoteId: null, sourceRevision: 0, pendingSave: false, updatedAt: 1, ...changes });
    window.rawDatabase = (scope, version) => new Promise((resolve, reject) => {
      const request = version === undefined ? indexedDB.open(`rea-notes-draft-recovery-v1-${scope}`) : indexedDB.open(`rea-notes-draft-recovery-v1-${scope}`, version);
      request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result);
    });
    window.rawRead = (db, id) => new Promise((resolve, reject) => {
      const transaction = db.transaction('records', 'readonly'), request = transaction.objectStore('records').get(id);
      let value; request.onsuccess = () => { value = request.result; }; transaction.oncomplete = () => resolve(value); transaction.onabort = () => reject(transaction.error);
    });
    window.rawWrite = (db, value) => new Promise((resolve, reject) => {
      const transaction = db.transaction('records', 'readwrite'); transaction.objectStore('records').put(value);
      transaction.oncomplete = () => resolve(); transaction.onabort = () => reject(transaction.error);
    });
    window.captureCode = async operation => { try { await operation(); return 'NO_ERROR'; } catch (error) { return error.code ?? error.name; } };
  });
}

test('storage recovery persists raw text across close and reopen without note saves', async ({ page, host }) => {
  await prepare(page, host);
  const observation = await page.evaluate(async () => {
    const scope = crypto.randomUUID(), store = await storageSubject.openDraftRecovery(scope);
    const input = makeRecoveryRecord(scope, { title: 'x'.repeat(400), body: '<img src=x onerror=alert(1)>\n\0raw text', tags: ' , duplicate, duplicate, ', isTodo: true, pendingSave: true });
    const returned = await store.put(input); returned.title = 'mutated caller copy'; store.close();
    const reopened = await storageSubject.openDraftRecovery(scope), listed = await reopened.list(), raw = await rawDatabase(scope);
    const stored = await rawRead(raw, input.id); raw.close(); reopened.close();
    const session = await (await fetch('/api/session')).json();
    const saved = await (await fetch('/api/notes/list', { method: 'POST', headers: { 'content-type': 'application/json', 'x-rea-token': session.token }, body: '{}' })).json();
    return { scope, input, listed, stored, savedCount: saved.result.total };
  });
  expect(observation.savedCount).toBe(0); expect(observation.listed).toHaveLength(1);
  expect(observation.stored).toEqual({ schema: 1, scope: observation.scope, ...observation.input });
  expect(observation.listed[0]).toEqual(observation.stored);
  await record('storage-01-persistence', observation);
});

test('storage recovery compares versions atomically across independent connections', async ({ page, host }) => {
  await prepare(page, host);
  const observation = await page.evaluate(async () => {
    const scope = crypto.randomUUID(), first = await storageSubject.openDraftRecovery(scope), second = await storageSubject.openDraftRecovery(scope), input = makeRecoveryRecord(scope);
    await first.put(input); await second.put({ ...input, version: 2, body: 'newer from another connection', updatedAt: 2 });
    const oldPut = await captureCode(() => first.put(input)), equalPut = await captureCode(() => first.put({ ...input, version: 2 })), oldRemove = await first.remove(input.id, 1);
    const afterStale = await first.list(), removed = await second.remove(input.id, 2), afterRemove = await first.list();
    const retiredPut = await captureCode(() => second.put({ ...input, version: 3 })); first.close(); second.close();
    return { oldPut, equalPut, oldRemove, afterStale, removed, afterRemove, retiredPut };
  });
  expect(observation.oldPut).toBe('STALE'); expect(observation.equalPut).toBe('STALE'); expect(observation.oldRemove).toBe(false);
  expect(observation.afterStale).toHaveLength(1); expect(observation.afterStale[0].version).toBe(2); expect(observation.afterStale[0].body).toBe('newer from another connection');
  expect(observation.removed).toBe(true); expect(observation.afterRemove).toEqual([]); expect(observation.retiredPut).toBe('STALE');
  await record('storage-02-atomic-versions', observation);
});

test('storage recovery refuses a fifth copy and oversized UTF8 without eviction', async ({ page, host }) => {
  await prepare(page, host);
  const observation = await page.evaluate(async () => {
    const scope = crypto.randomUUID(), store = await storageSubject.openDraftRecovery(scope), originals = [];
    for (let index = 0; index < 4; index++) { const row = makeRecoveryRecord(scope, { title: `kept ${index}`, updatedAt: index + 1 }); originals.push(await store.put(row)); }
    const fifth = await captureCode(() => store.put(makeRecoveryRecord(scope))), oversized = await captureCode(() => store.put({ ...originals[0], version: 2, body: '🙂'.repeat(600_000) }));
    const unchanged = await store.list(); await store.put({ ...originals[0], version: 2, title: 'updated while full', updatedAt: 10 });
    const updated = await store.list(); store.close(); return { originals, fifth, oversized, unchanged, updated };
  });
  expect(observation.fifth).toBe('LIMIT'); expect(observation.oversized).toBe('LIMIT');
  expect(observation.unchanged).toEqual([...observation.originals].reverse()); expect(observation.updated).toHaveLength(4);
  expect(observation.updated[0].title).toBe('updated while full'); expect(observation.updated[0].version).toBe(2);
  await record('storage-03-capacity-utf8', observation);
});

test('storage recovery preserves malformed and unknown-schema rows when refusing operations', async ({ page, host }) => {
  await prepare(page, host);
  const observation = await page.evaluate(async () => {
    const scope = crypto.randomUUID(), store = await storageSubject.openDraftRecovery(scope), input = makeRecoveryRecord(scope);
    const good = await store.put(input), db = await rawDatabase(scope), controls = [];
    for (const malformed of [{ ...good, schema: 99 }, { ...good, sourceRevision: -1 }, { ...good, unexpected: 'preserve this unsupported field' }, { ...good, scope: crypto.randomUUID() }]) {
      await rawWrite(db, malformed);
      const listCode = await captureCode(() => store.list()), putCode = await captureCode(() => store.put({ ...input, version: 2 })), removeCode = await captureCode(() => store.remove(input.id, 1));
      const retained = await rawRead(db, input.id); controls.push({ malformed, retained, listCode, putCode, removeCode });
    }
    db.close(); store.close(); return { controls };
  });
  expect(observation.controls).toHaveLength(4);
  for (const control of observation.controls) { expect(control.listCode).toBe('CORRUPT'); expect(control.putCode).toBe('CORRUPT'); expect(control.removeCode).toBe('CORRUPT'); expect(control.retained).toEqual(control.malformed); }
  await record('storage-04-corrupt-preservation', observation);
});

test('storage recovery retains the last commit after an explicitly injected native transaction abort', async ({ page, host }) => {
  await prepare(page, host);
  const observation = await page.evaluate(async () => {
    const scope = crypto.randomUUID(), store = await storageSubject.openDraftRecovery(scope), original = makeRecoveryRecord(scope);
    await store.put(original); const actualPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value, ...rest) { const request = actualPut.call(this, value, ...rest); if (this.name === 'records' && value.title === 'ABORT-CONTROL') this.transaction.abort(); return request; };
    let aborted;
    try { aborted = await captureCode(() => store.put({ ...original, version: 2, title: 'ABORT-CONTROL' })); }
    finally { IDBObjectStore.prototype.put = actualPut; }
    const after = await store.list(); await store.put({ ...original, version: 3, body: 'later genuine transaction succeeds' }); const retried = await store.list(); store.close();
    return { control: 'Test-injected transaction.abort() after real IDB put; not native disk quota exhaustion.', original, aborted, after, retried };
  });
  expect(observation.aborted).toBe('UNAVAILABLE'); expect(observation.after).toHaveLength(1);
  expect(observation.after[0]).toMatchObject(observation.original); expect(observation.retried[0].version).toBe(3); expect(observation.retried[0].body).toBe('later genuine transaction succeeds');
  await record('storage-05-injected-abort', observation);
});

test('storage recovery rejects a real blocked upgrade produced by an explicit request adapter', async ({ page, host }) => {
  await prepare(page, host);
  const observation = await page.evaluate(async () => {
    const scope = crypto.randomUUID(), initial = await storageSubject.openDraftRecovery(scope), input = makeRecoveryRecord(scope);
    await initial.put(input); initial.close(); const held = await rawDatabase(scope);
    const blocked = await captureCode(() => storageSubject.openDraftRecovery(scope, { indexedDB: { open: name => indexedDB.open(name, 2) } }));
    held.close();
    // A later queued open resolves only after the blocked request has aborted its upgrade.
    const db = await rawDatabase(scope), version = db.version, retained = await rawRead(db, input.id); db.close();
    return { control: 'Adapter asks real IDB for version 2 while a raw version-1 connection stays open; no synthetic blocked event or quota claim.', blocked, version, retained, input };
  });
  expect(observation.blocked).toBe('BLOCKED'); expect(observation.version).toBe(1); expect(observation.retained).toMatchObject(observation.input);
  await record('storage-06-blocked-open-control', observation);
});

test('storage recovery closes on native versionchange without deleting stored copies', async ({ page, host }) => {
  await prepare(page, host);
  const observation = await page.evaluate(async () => {
    const scope = crypto.randomUUID(), store = await storageSubject.openDraftRecovery(scope), input = makeRecoveryRecord(scope);
    await store.put(input); const upgraded = await rawDatabase(scope, 2), version = upgraded.version, retained = await rawRead(upgraded, input.id);
    const closedList = await captureCode(() => store.list()), closedPut = await captureCode(() => store.put({ ...input, version: 2 })), closedRemove = await captureCode(() => store.remove(input.id, 1));
    upgraded.close(); store.close(); store.close(); return { input, version, retained, closedList, closedPut, closedRemove };
  });
  expect(observation.version).toBe(2); expect(observation.retained).toMatchObject(observation.input);
  expect(observation.closedList).toBe('CLOSED'); expect(observation.closedPut).toBe('CLOSED'); expect(observation.closedRemove).toBe('CLOSED');
  await record('storage-07-versionchange-close', observation);
});

test('storage recovery isolates workspace namespaces at the same browser origin', async ({ page, host }) => {
  await prepare(page, host);
  const observation = await page.evaluate(async () => {
    const scopeA = crypto.randomUUID(), scopeB = crypto.randomUUID(), first = await storageSubject.openDraftRecovery(scopeA), second = await storageSubject.openDraftRecovery(scopeB);
    const input = makeRecoveryRecord(scopeA); await first.put(input); const before = await second.list();
    const wrongScope = await captureCode(() => second.put({ ...input, schema: 1, scope: scopeA }));
    await second.put({ ...input, body: 'separate workspace, same record ID' });
    const recordsA = await first.list(), recordsB = await second.list(); first.close(); second.close();
    return { scopeA, scopeB, input, before, wrongScope, recordsA, recordsB };
  });
  expect(observation.before).toEqual([]); expect(observation.wrongScope).toBe('INVALID');
  expect(observation.recordsA).toHaveLength(1); expect(observation.recordsB).toHaveLength(1);
  expect(observation.recordsA[0].scope).toBe(observation.scopeA); expect(observation.recordsB[0].scope).toBe(observation.scopeB);
  expect(observation.recordsA[0].body).toBe(observation.input.body); expect(observation.recordsB[0].body).toBe('separate workspace, same record ID');
  await record('storage-08-workspace-isolation', observation);
});
