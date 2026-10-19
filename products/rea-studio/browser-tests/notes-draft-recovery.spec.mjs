import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { test as base, expect } from '@playwright/test';
assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
assert.equal(process.env.CI, 'true'); assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
assert.equal(process.env.GITHUB_REPOSITORY, 'Ginderlax/rea-research-lab');
for (const key of ['GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) assert(process.env[key]);
const { start } = await import('../server.mjs');
const digest = b => ({ bytes: b.length, sha256: createHash('sha256').update(b).digest('hex') });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const root = page => page.locator('#app-root > div');
const field = (page, name) => root(page).getByLabel(name, { exact: true });
const button = (page, name) => root(page).getByRole('button', { name, exact: true });
async function bounded(operation, timeoutMs, label) {
  let timer;
  try { return await Promise.race([operation, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' exceeded its cleanup deadline')), timeoutMs); })]); }
  finally { clearTimeout(timer); }
}

const test = base.extend({ studio: async ({ page }, use, info) => {
  const evidence = await fs.realpath(process.env.REA_BROWSER_EVIDENCE), dataRoot = await fs.realpath(process.env.REA_BROWSER_DATA_ROOT);
  const dataDir = await fs.mkdtemp(path.join(dataRoot, 'notes-draft-recovery-case-'));
  const host = await start({ port: 0, dataDir });
  const actualBrowser = page.context().browser(); assert(actualBrowser);
  const browserName = actualBrowser.browserType().name(), browserVersion = actualBrowser.version(); assert.equal(browserName, 'chromium');
  const requests = [], errors = [], expectedAborts = [], observations = [], holds = [], tasks = new Set();
  const cleanup = { contextClosed: false, hostClosed: false, dataRemoved: false, heldRoutesFinished: false };
  const watch = target => {
    target.on('request', request => { if (request.url().startsWith(host.url + '/api/notes/')) { assert(requests.length < 500); requests.push({ path: new URL(request.url()).pathname, method: request.method(), input: request.postDataJSON() }); } });
    target.on('pageerror', error => errors.push({ type: 'pageerror', message: error.message.slice(0, 1000) }));
    target.on('console', message => { if (message.type() === 'error' && !(message.location().url === host.url + '/favicon.ico' && /404/.test(message.text()))) errors.push({ type: 'console', message: message.text().slice(0, 1000) }); });
    target.on('requestfailed', request => {
      if (!request.url().startsWith(host.url + '/')) return;
      const hold = holds.find(value => value.request === request), failure = request.failure()?.errorText ?? '';
      if (hold?.expectedAbort && /ERR_ABORTED/.test(failure)) { hold.aborted = true; expectedAborts.push({ path: new URL(request.url()).pathname, failure, reason: 'Explicit full reload after actual Save committed; no response rewrite' }); }
      else errors.push({ type: 'requestfailed', path: new URL(request.url()).pathname, failure });
    });
  };
  watch(page);
  const api = async (action, input = {}) => {
    const response = await page.request.post(host.url + '/api/notes/' + action, { headers: { 'x-rea-token': host.token }, data: input });
    assert.equal(response.status(), 200, action); return (await response.json()).result;
  };
  const scope = (await api('draft-recovery-scope')).scope;
  const deliveryResponse = await page.request.get(host.url + '/apps/notes/draft-recovery.mjs'); assert.equal(deliveryResponse.status(), 200);
  const delivered = await deliveryResponse.body(), source = await fs.readFile(path.resolve(import.meta.dirname, '../apps/notes/draft-recovery.mjs'));
  assert.deepEqual(delivered, source); const delivery = digest(delivered);
  const s = { page, api, url: host.url, scope, observations,
    saves: () => requests.filter(row => row.path === '/api/notes/save'),
    async newPage() { const next = await page.context().newPage(); watch(next); return next; },
    async copies(target = page) { return target.evaluate(async value => { const { openDraftRecovery } = await import('/apps/notes/draft-recovery.mjs'); const store = await openDraftRecovery(value); try { return await store.list(); } finally { store.close(); } }, scope); },
    async copy(title, target = page) { return (await s.copies(target)).find(row => row.title === title); },
    async holdSave(target = page) {
      const entered = deferred(), release = deferred(), finished = deferred();
      const hold = { entered: entered.promise, release: release.resolve, finished: finished.promise, expectedAbort: false, aborted: false, request: null, used: false }; holds.push(hold);
      await target.route(host.url + '/api/notes/save', async route => {
        if (hold.used) return route.continue(); hold.used = true; hold.request = route.request();
        const work = (async () => {
          try {
            const response = await route.fetch({ timeout: 15000 }), body = await response.body(); assert.equal(response.status(), 200);
            observations.push({ type: 'unchanged-actual-committed-save-response-held', response: digest(body), input: route.request().postDataJSON() });
            entered.resolve(JSON.parse(body).result); await release.promise;
            try { await route.fulfill({ response }); }
            catch (error) { if (!(hold.expectedAbort && hold.aborted && /Target.*closed|page.*closed|Invalid InterceptionId|already handled|aborted/i.test(String(error)))) throw error; }
          } catch (error) { errors.push({ type: 'held-response', message: String(error).slice(0, 1000) }); entered.resolve(null); }
          finally { finished.resolve(); }
        })(); tasks.add(work); work.finally(() => tasks.delete(work)); await work;
      });
      return hold;
    },
  };
  try { await use(s); }
  finally {
    async function step(label, operation, resultKey) {
      try { await bounded(operation(), 7000, label); cleanup[resultKey] = true; }
      catch (error) { errors.push({ type: 'cleanup', step: label, message: String(error).slice(0, 1000) }); }
    }
    for (const hold of holds) hold.release();
    await step('drain-held-routes', () => Promise.all(holds.filter(hold => hold.used).map(hold => hold.finished)), 'heldRoutesFinished');
    if (info.status !== info.expectedStatus) await page.screenshot({ path: path.join(evidence, 'notes-draft-failure-' + createHash('sha256').update(info.title).digest('hex').slice(0, 20) + '.png'), fullPage: true }).catch(error => errors.push({ type: 'failure-screenshot', message: String(error) }));
    await step('close-owned-context', () => page.context().close(), 'contextClosed');
    await step('close-owned-host', () => host.close(), 'hostClosed');
    const relative = path.relative(dataRoot, path.resolve(dataDir)); assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)); assert(path.basename(dataDir).startsWith('notes-draft-recovery-case-'));
    if (cleanup.contextClosed && cleanup.hostClosed) await step('remove-owned-data', () => fs.rm(dataDir, { recursive: true, force: true }), 'dataRemoved');
    const report = { schema: 'rea-notes-draft-recovery-real-browser-case/v1', title: info.title, testId: info.testId, sourceCommit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT, sourceScope: scope, browserName, browserVersion, realBrowser: true, actualHTTP: true, retry: info.retry, statusAtFixtureClose: info.status ?? null, delivery, requestCounts: { NotesUIRequests: requests.length, NotesUISaveRequests: s.saves().length }, requests, expectedAborts, observations, errors, cleanup, originalProductExecutions: 0, fullParity: false, superiority: false };
    await fs.writeFile(path.join(evidence, 'notes-draft-case-' + createHash('sha256').update(info.title).digest('hex').slice(0, 20) + '.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    assert.equal(tasks.size, 0); expect(errors).toEqual([]); expect(Object.values(cleanup).every(Boolean)).toBe(true);
  }
} });

async function openNotes(s, page = s.page) { await page.goto(s.url + '/#notes'); await expect(root(page).getByRole('heading', { name: 'Local Notes', exact: true })).toBeVisible(); await expect(button(page, 'Refresh recovery copies')).toBeEnabled(); }
const row = (page, title) => root(page).getByRole('region', { name: 'Recovery copy: ' + title, exact: true });
async function recover(page, title, isTodo = false) {
  const selected = row(page, title), recoverButton = selected.getByRole('button', { name: isTodo ? 'Recover as new to-do' : 'Recover as new note', exact: true });
  await expect(recoverButton).toBeDisabled(); await expect(selected).toContainText(/may already (?:have )?completed/i);
  await selected.getByLabel('I want a separate note from this recovery copy', { exact: true }).check(); await recoverButton.click();
}

test('Draft recovery real navigation and reload preserve raw new to-do fields without implicit Save', async ({ studio: s }) => {
  const notebook = (await s.api('notebook-create', { title: 'Recovery browser lab', revision: 0 })).notebook.id;
  await openNotes(s); await button(s.page, 'New to-do').click();
  await field(s.page, 'Note title').fill('Raw recovery task'); await field(s.page, 'Notebook').selectOption(notebook);
  await field(s.page, 'Note tags').fill('work,  research'); await field(s.page, 'Markdown note').fill('Exact unsaved 🧪 body\nsecond line');
  await expect.poll(async () => (await s.copy('Raw recovery task'))?.body).toBe('Exact unsaved 🧪 body\nsecond line');
  await s.page.goto('about:blank'); await openNotes(s); await s.page.reload(); await expect(button(s.page, 'Refresh recovery copies')).toBeEnabled();
  assert.equal(s.saves().length, 0); const notesBeforeExplicitSave = (await s.api('list')).total; assert.equal(notesBeforeExplicitSave, 0);
  await recover(s.page, 'Raw recovery task', true);
  await expect(field(s.page, 'Note title')).toHaveValue('Raw recovery task'); await expect(field(s.page, 'Notebook')).toHaveValue(notebook);
  await expect(field(s.page, 'Note tags')).toHaveValue('work,  research'); await expect(field(s.page, 'Markdown note')).toHaveValue('Exact unsaved 🧪 body\nsecond line');
  const savesBeforeExplicitSave = s.saves().length; assert.equal(savesBeforeExplicitSave, 0); await button(s.page, 'Save note').click();
  await expect.poll(async () => (await s.api('list')).total).toBe(1);
  const note = await s.api('get', { id: (await s.api('list')).notes[0].id }); assert.equal(note.revision, 1); assert.equal(note.todo.isTodo, true); assert.equal(note.todo.completed, 0);
  assert.equal(s.saves().length, 1); s.observations.push({ type: 'acknowledged-new-task-copy-created', id: note.id, revision: note.revision, beforeExplicitSaveNotes: notesBeforeExplicitSave, UISaveRequestsBeforeSave: savesBeforeExplicitSave });
});

test('Draft recovery of saved-note edits always creates an acknowledged separate note and preserves newer original revision', async ({ studio: s }) => {
  const original = await s.api('save', { title: 'Original browser note', body: 'Original body', tags: ['kept'] }); await openNotes(s);
  await root(s.page).getByRole('button', { name: /^Original browser note · / }).click(); await field(s.page, 'Markdown note').fill('Unsubmitted recovered editing');
  await expect.poll(async () => (await s.copy(original.title))?.sourceNoteId).toBe(original.id);
  const advanced = await s.api('save', { ...original, body: 'Newer original revision from another editor' }); await s.page.reload();
  await recover(s.page, original.title); assert.equal(s.saves().length, 0); await button(s.page, 'Save note').click();
  await expect.poll(async () => (await s.api('list')).total).toBe(2);
  assert.deepEqual(await s.api('get', { id: original.id }), advanced);
  const notes = (await s.api('list')).notes, copied = notes.find(note => note.id !== original.id);
  assert(copied); const copiedNote = await s.api('get', { id: copied.id }); assert.equal(copiedNote.revision, 1); assert.equal(copiedNote.body, 'Unsubmitted recovered editing');
  const request = s.saves()[0].input; assert.equal(request.id, undefined); assert.equal(request.revision, 0);
  s.observations.push({ type: 'saved-provenance-remains-separate', original: { id: original.id, revision: advanced.revision }, copy: { id: copiedNote.id, revision: copiedNote.revision } });
});

test('Draft recovery after an unacknowledged committed Save requires separate-copy consent and never automatically replays', async ({ studio: s }) => {
  await openNotes(s); await button(s.page, 'New to-do').click(); await field(s.page, 'Note title').fill('Ambiguous browser Save'); await field(s.page, 'Markdown note').fill('First actual committed body');
  const held = await s.holdSave(); await button(s.page, 'Save note').click(); const first = await held.entered; assert(first);
  await field(s.page, 'Markdown note').fill('Newer recovery body before reload');
  await expect.poll(async () => (await s.copy('Ambiguous browser Save'))?.body).toBe('Newer recovery body before reload');
  assert.equal((await s.copy('Ambiguous browser Save')).pendingSave, true);
  held.expectedAbort = true; await s.page.reload(); held.release(); await held.finished;
  await expect(button(s.page, 'Refresh recovery copies')).toBeEnabled(); assert.equal(s.saves().length, 1);
  await recover(s.page, 'Ambiguous browser Save', true); assert.equal(s.saves().length, 1);
  await button(s.page, 'Save note').click(); await expect.poll(async () => (await s.api('list')).total).toBe(2);
  assert.deepEqual(await s.api('get', { id: first.id }), first);
  const copies = (await s.api('list')).notes.filter(note => note.id !== first.id); assert.equal(copies.length, 1);
  assert.equal((await s.api('get', { id: copies[0].id })).body, 'Newer recovery body before reload'); assert.equal(s.saves().length, 2);
  s.observations.push({ type: 'deliberate-separate-creation-after-pending-save-warning', previouslyCommittedId: first.id, acknowledgedCopyId: copies[0].id, automaticSaveRequests: 0 });
});

test('Draft recovery cross-tab version discard and recovered-parent cleanup preserve newer owner text', async ({ studio: s }) => {
  await openNotes(s); await field(s.page, 'Note title').fill('Cross-tab recovery'); await field(s.page, 'Markdown note').fill('First tab text');
  await expect.poll(async () => (await s.copy('Cross-tab recovery'))?.body).toBe('First tab text'); const first = await s.copy('Cross-tab recovery');
  const second = await s.newPage(); await openNotes(s, second); await button(second, 'Refresh recovery copies').click();
  await field(s.page, 'Markdown note').fill('Newer parent version'); await expect.poll(async () => (await s.copy('Cross-tab recovery'))?.version).toBeGreaterThan(first.version);
  await row(second, first.title).getByRole('button', { name: 'Discard recovery copy', exact: true }).click();
  assert.equal((await s.copy(first.title)).body, 'Newer parent version'); await button(second, 'Refresh recovery copies').click();
  await recover(second, first.title); const held = await s.holdSave(second); await button(second, 'Save note').click(); const saved = await held.entered; assert(saved);
  await field(s.page, 'Markdown note').fill('Newest original owner text after copy Save');
  await expect.poll(async () => (await s.copies()).find(row => row.id === first.id)?.body).toBe('Newest original owner text after copy Save');
  const newest = (await s.copies()).find(row => row.id === first.id); held.release(); await held.finished;
  await expect(root(second).getByRole('status')).toContainText(/Saved revision/);
  await second.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  assert.deepEqual((await s.copies()).find(row => row.id === first.id), newest); assert.equal((await s.api('list')).total, 1);
  assert.equal(saved.body, 'Newer parent version'); assert.equal(s.saves().length, 1);
  s.observations.push({ type: 'atomic-stale-discard-and-parent-cleanup-retain-newer-tab', originalRecoveryId: first.id, displayedOldVersion: first.version, retainedVersion: newest.version, savedSeparateCopyId: saved.id });
});
