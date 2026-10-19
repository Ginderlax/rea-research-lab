// Fresh hosted Chromium experiments with synthetic data and actual HTTP/IndexedDB.
// No original application, FTS/ranking, performance or full-parity claim.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { test as base, expect } from '@playwright/test';

assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
for (const [key, value] of Object.entries({ CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted',
  RUNNER_OS: 'Windows', RUNNER_ARCH: 'X64', GITHUB_REPOSITORY: 'Ginderlax/rea-research-lab',
  GITHUB_JOB: 'draft-recovery-real-chromium', GITHUB_REF: 'refs/heads/experiment/notes46-installed-search-20261019', GITHUB_EVENT_NAME: 'push' })) assert.equal(process.env[key], value, key);
for (const key of ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) assert(/^[1-9][0-9]*$/.test(process.env[key]));
assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA));
const sourceEpoch = 'notes46-installed-any-wire-v1';
const studioRoot = path.resolve(import.meta.dirname, '..');
const identity = bytes => ({ bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
const bindings = JSON.parse(await fs.readFile(new URL('./notes-structured-search-source-bindings.json', import.meta.url), 'utf8'));
assert.equal(bindings.schema, 'rea-notes46-installed-search-browser-source-bindings/v1'); assert.equal(bindings.sourceEpoch, sourceEpoch);
assert.equal(bindings.installedNotesSources.length, 46); assert.equal(bindings.sharedRuntimeStaticSources.length, 7);
for (const row of [...bindings.installedNotesSources, ...bindings.sharedRuntimeStaticSources]) {
  assert(row.path.startsWith('products/rea-studio/'));
  assert.deepEqual(identity(await fs.readFile(path.join(studioRoot, row.path.slice('products/rea-studio/'.length)))), { bytes: row.bytes, sha256: row.sha256 });
}
const { start } = await import('../server.mjs');
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
async function bounded(operation, milliseconds, label) { let timer; try { return await Promise.race([operation, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label)), milliseconds); })]); } finally { clearTimeout(timer); } }
const root = page => page.locator('#app-root > div');
const field = (page, name) => root(page).getByLabel(name, { exact: true });
const button = (page, name) => root(page).getByRole('button', { name, exact: true });
const list = page => root(page).getByRole('heading', { level: 3, name: /^\d+ notes$/ }).locator('..');
const ids = result => result.notes.map(row => row.id).sort();
const rawDraft = { title: '  Owned unsaved search task  ', body: '# Raw unsaved 🧪 body\nsecond line', tags: ' work,  research,work ' };

const test = base.extend({ studio: async ({ page }, use, info) => {
  assert(/^[A-Za-z0-9_-]{1,200}$/.test(info.testId)); assert.equal(info.retry, 0);
  const browser = page.context().browser(); assert(browser); assert.equal(browser.browserType().name(), 'chromium'); assert.equal(browser.version(), '156.0.8078.4');
  const evidence = await fs.realpath(process.env.REA_BROWSER_EVIDENCE), dataRoot = await fs.realpath(process.env.REA_BROWSER_DATA_ROOT);
  const dataDir = await fs.mkdtemp(path.join(dataRoot, 'notes-search-case-'));
  const relativeData = path.relative(dataRoot, dataDir); assert(relativeData && relativeData !== '..' && !relativeData.startsWith('..' + path.sep) && !path.isAbsolute(relativeData));
  let host; try { host = await start({ port: 0, dataDir }); } catch (error) { await fs.rm(dataDir, { recursive: true, force: true }); throw error; }
  const requests = [], responses = [], fixtureRequests = [], errors = [], observations = [], holds = [], consoleErrors = [], expectedHttpFailures = [], responseTasks = new Set(), pending = new Set(), waiters = new Set();
  const owns = request => request.url().startsWith(host.url + '/');
  function finished(request) { if (!owns(request)) return; pending.delete(request); if (!pending.size) for (const resolve of waiters) resolve(); }
  page.on('request', request => { if (!owns(request)) return; pending.add(request); if (!request.url().startsWith(host.url + '/api/notes/')) return; assert(requests.length < 500); requests.push({ path: new URL(request.url()).pathname, method: request.method(), input: request.postDataJSON() }); });
  page.on('requestfinished', finished);
  page.on('requestfailed', request => { finished(request); if (owns(request)) errors.push({ type: 'requestfailed', path: new URL(request.url()).pathname, failure: request.failure()?.errorText ?? '' }); });
  page.on('pageerror', error => errors.push({ type: 'pageerror', message: error.message.slice(0, 2000) }));
  page.on('console', message => { if (message.type() !== 'error') return; const row = { message: message.text().slice(0, 2000), url: message.location().url }; if (row.url === host.url + '/favicon.ico' && /404/.test(row.message)) return; consoleErrors.push(row); });
  page.on('response', response => {
    if (!response.url().startsWith(host.url + '/api/notes/')) return;
    const work = (async () => {
      const input = response.request().postDataJSON(), bytes = await response.body(); assert(bytes.length <= 1024 * 1024);
      const item = { path: new URL(response.url()).pathname, status: response.status(), input, body: identity(bytes) }; responses.push(item);
      if (!response.ok()) {
        const payload = JSON.parse(bytes), expected = expectedHttpFailures.find(row => !row.observed && row.path === item.path && row.query === input.search && row.status === response.status());
        if (expected && typeof payload.error === 'string') { expected.observed = true; expected.error = payload.error; }
        else errors.push({ type: 'unexpected-http-response', ...item });
      }
    })().catch(error => errors.push({ type: 'response-observer', message: String(error).slice(0, 2000) }));
    responseTasks.add(work); work.finally(() => responseTasks.delete(work));
  });
  async function drain() { if (!pending.size) return; let resolve; const operation = new Promise(done => { resolve = done; waiters.add(done); }); try { if (!pending.size) resolve(); await operation; } finally { waiters.delete(resolve); } }
  async function settle() { await bounded(drain(), 7000, 'Owned HTTP requests did not drain'); await bounded(Promise.all([...responseTasks]), 7000, 'HTTP response observations did not drain'); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
  async function api(action, input = {}) { assert(fixtureRequests.length < 200); const response = await page.request.post(host.url + '/api/notes/' + action, { headers: { 'x-rea-token': host.token }, data: input }); const payload = await response.json(); fixtureRequests.push({ action, input, status: response.status() }); assert.equal(response.status(), 200, action); return payload.result; }
  const state = () => fs.readFile(path.join(dataDir, 'notes/records/notes-state-v2.json'));
  const saves = () => requests.filter(row => row.path === '/api/notes/save');
  const s = { page, url: host.url, api, state, saves, settle, observations, requests, responses, expectedHttpFailures };
  async function publish(result, expected) { assert.deepEqual(ids(result), [...expected].sort()); await expect(list(page).getByRole('button')).toHaveText(result.notes.map(row => row.title + ' · ' + row.notebook + ' · ' + row.tags.join(', '))); observations.push({ kind: 'actual-http-result-to-visible-row-binding', ids: ids(result), rows: result.notes.map(row => ({ id: row.id, title: row.title, notebook: row.notebook, tags: row.tags })) }); return result; }
  s.search = async (query, mode, expected) => {
    await field(page, 'Search notes').fill(query);
    const response = page.waitForResponse(value => value.url() === host.url + '/api/notes/list' && value.request().postDataJSON().search === query && value.request().postDataJSON().searchMode === mode);
    if (await field(page, 'Search mode').inputValue() !== mode) await field(page, 'Search mode').selectOption(mode); else await button(page, 'Search').click();
    const actual = await response; assert.equal(actual.status(), 200); return publish((await actual.json()).result, expected);
  };
  s.select = async (label, value, expected) => { const response = page.waitForResponse(row => row.url() === host.url + '/api/notes/list' && row.status() === 200); if (label === 'Show trash') await field(page, label).setChecked(value); else await field(page, label).selectOption(value); return publish((await (await response).json()).result, expected); };
  s.fields = async () => ({ title: await field(page, 'Note title').inputValue(), body: await field(page, 'Markdown note').inputValue(), tags: await field(page, 'Note tags').inputValue(), notebookId: await field(page, 'Notebook').inputValue() });
  s.draft = async () => { await button(page, 'New to-do').click(); await field(page, 'Note title').fill(rawDraft.title); await field(page, 'Markdown note').fill(rawDraft.body); await field(page, 'Note tags').fill(rawDraft.tags); await field(page, 'Notebook').selectOption(s.seed.child); return { ...rawDraft, notebookId: s.seed.child }; };
  s.copies = () => page.evaluate(async scope => { const { openDraftRecovery } = await import('/apps/notes/draft-recovery.mjs'); const store = await openDraftRecovery(scope); try { return await store.list(); } finally { store.close(); } }, s.scope);
  s.copy = async () => (await s.copies()).find(row => row.title === rawDraft.title);
  s.hold = async (query, mode) => {
    const entered = deferred(), released = deferred(), done = deferred(); const hold = { used: false, release: released.resolve, entered: entered.promise, finished: done.promise }; holds.push(hold);
    await page.route(host.url + '/api/notes/list', async route => {
      const input = route.request().postDataJSON(); if (hold.used || input.search !== query || input.searchMode !== mode) return route.continue(); hold.used = true;
      try { const actual = await route.fetch({ timeout: 15000 }), bytes = await actual.body(); assert.equal(actual.status(), 200); assert(bytes.length <= 1024 * 1024); const result = JSON.parse(bytes).result;
        const row = { kind: 'unchanged-actual-list-response-held-after-route-fetch', input, status: actual.status(), body: identity(bytes), ids: ids(result), handlerMocked: false, responseRewritten: false }; observations.push(row); entered.resolve(row); await released.promise; await route.fulfill({ response: actual });
      } catch (error) { errors.push({ type: 'held-response', message: String(error).slice(0, 2000) }); entered.reject(error); } finally { done.resolve(); }
    }); return hold;
  };
  try {
    const a = await api('notebook-create', { title: 'Lab', revision: 0 });
    const b = await api('notebook-create', { title: 'Child', parentId: a.notebook.id, revision: a.revision });
    const c = await api('notebook-create', { title: 'Elsewhere', revision: b.revision });
    const plan = await api('save', { title: 'Release plan', body: 'ready for review', notebookId: a.notebook.id, tags: ['work'] });
    const archived = await api('save', { title: 'Other', body: 'Release plan archived', notebookId: b.notebook.id, tags: ['spam'] });
    const task = await api('save', { title: 'Task', body: 'ready', notebookId: b.notebook.id, tags: ['work'], newTodo: true });
    let complete = await api('save', { title: 'Done', body: 'archived', notebookId: c.notebook.id, tags: ['work'], newTodo: true });
    complete = (await api('todo-completed', { id: complete.id, revision: complete.revision, completed: true })).note;
    const trash = await api('save', { title: 'Archived trash', body: 'ready', notebookId: a.notebook.id, tags: ['work'] }); await api('delete', { id: trash.id, revision: trash.revision });
    s.seed = { lab: a.notebook.id, child: b.notebook.id, elsewhere: c.notebook.id, plan: plan.id, archived: archived.id, task: task.id, complete: complete.id, trash: trash.id };
    s.scope = (await api('draft-recovery-scope')).scope;
    await page.goto(host.url + '/#notes'); await expect(root(page).getByRole('heading', { name: 'Local Notes', exact: true })).toBeVisible(); await expect(button(page, 'Refresh recovery copies')).toBeEnabled(); await settle();
    await use(s);
  } finally {
    const cleanup = { heldRoutesFinished: false, requestsDrained: false, screenshotSaved: false, contextClosed: false, hostClosed: false, dataRemoved: false };
    async function step(name, operation) { try { await bounded(operation(), 7000, name + ' cleanup deadline'); cleanup[name] = true; } catch (error) { errors.push({ type: 'cleanup', step: name, message: String(error).slice(0, 2000) }); } }
    for (const hold of holds) hold.release();
    await step('heldRoutesFinished', () => Promise.all(holds.filter(row => row.used).map(row => row.finished)));
    await step('requestsDrained', () => settle());
    await step('screenshotSaved', async () => { await fs.mkdir(path.join(evidence, 'screenshots'), { recursive: true }); await page.screenshot({ path: path.join(evidence, 'screenshots', 'search-' + info.testId + '.png'), fullPage: false }); });
    let finalDisk = null; try { finalDisk = identity(await state()); } catch (error) { if (error.code !== 'ENOENT') errors.push({ type: 'final-disk', message: String(error) }); }
    await step('contextClosed', () => page.context().close()); await step('hostClosed', () => host.close());
    if (cleanup.contextClosed && cleanup.hostClosed) await step('dataRemoved', async () => { const rel = path.relative(dataRoot, dataDir); assert(rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel)); assert(path.basename(dataDir).startsWith('notes-search-case-')); await fs.rm(dataDir, { recursive: true, force: true }); });
    const allowedConsole = consoleErrors.filter(row => expectedHttpFailures.some(value => value.observed && row.url === host.url + value.path && /400/.test(row.message)));
    errors.push(...consoleErrors.filter(row => !allowedConsole.includes(row)).map(row => ({ type: 'console', ...row })));
    if (allowedConsole.length > expectedHttpFailures.length) errors.push({ type: 'extra-console-errors', count: allowedConsole.length });
    const report = { schema: 'rea-notes-structured-search-real-browser-case/v1', sourceEpoch, sourceCommit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT,
      title: info.title, testId: info.testId, retry: info.retry, statusAtFixtureClose: info.status ?? null, realBrowser: true, actualHTTP: true, browserName: browser.browserType().name(), browserVersion: browser.version(),
      requests, responses, fixtureRequests, expectedHttpFailures, observations, errors, cleanup, pendingOwnedRequests: pending.size, screenshot: 'screenshots/search-' + info.testId + '.png', finalDisk,
      NotesUISaveRequests: saves().length, originalProductExecutions: 0, handlerResponsesRewritten: false, fullParity: false, superiority: false };
    await fs.writeFile(path.join(evidence, 'search-case-' + info.testId + '.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    expect(errors).toEqual([]); expect(expectedHttpFailures.every(row => row.observed)).toBe(true); expect(pending.size).toBe(0); expect(responseTasks.size).toBe(0); expect(Object.values(cleanup).every(Boolean)).toBe(true);
  }
} });

test('Filters real browser defaults and mode changes publish actual result IDs without implicit Save', async ({ studio: s }) => {
  const before = await s.state(); await expect(field(s.page, 'Search mode')).toHaveValue('simple');
  await s.search('work ready', 'simple', [s.seed.plan, s.seed.task]);
  await s.search('work ready', 'filters', []); await s.search('tag:work -body:archived', 'filters', [s.seed.plan, s.seed.task]);
  await s.settle(); assert.equal(s.saves().length, 0); assert.deepEqual(await s.state(), before);
});
test('Filters real browser title and body constraints display exact backend rows for quoted text and negation', async ({ studio: s }) => {
  const before = await s.state(); await s.search('title:"Release plan" -body:archived', 'filters', [s.seed.plan]);
  await s.search('body:"Release plan" -title:Release', 'filters', [s.seed.archived]);
  await s.settle(); assert.equal(s.saves().length, 0); assert.deepEqual(await s.state(), before);
});
test('Filters real browser notebook descendants and type completion metadata intersect existing selectors', async ({ studio: s }) => {
  const before = await s.state(); await s.search('notebook:Lab tag:work type:todo iscompleted:0', 'filters', [s.seed.task]);
  await s.select('Filter note type', 'notes', []); await s.select('Filter note type', 'all', [s.seed.task]);
  await s.search('type:todo iscompleted:1 tag:work', 'filters', [s.seed.complete]);
  await s.select('Filter tag', 'spam', []); await s.select('Filter tag', '', [s.seed.complete]);
  await s.settle(); assert.equal(s.saves().length, 0); assert.deepEqual(await s.state(), before);
});
test('Filters real browser genuine unsupported400 preserves draft and disk then valid search recovers', async ({ studio: s }) => {
  const expected = await s.draft(), before = await s.state(); await s.search('tag:work', 'filters', [s.seed.plan, s.seed.task, s.seed.complete]);
  const query = 'resource:image/*', actual = s.page.waitForResponse(row => row.url() === s.url + '/api/notes/list' && row.request().postDataJSON().search === query);
  s.expectedHttpFailures.push({ path: '/api/notes/list', query, status: 400, observed: false });
  await field(s.page, 'Search notes').fill(query); await button(s.page, 'Search').click(); const response = await actual; assert.equal(response.status(), 400); const payload = await response.json(); assert.equal(typeof payload.error, 'string');
  await expect(root(s.page).getByRole('status')).toHaveText(payload.error); assert.deepEqual(await s.fields(), expected); assert.deepEqual(await s.state(), before);
  await s.search('title:"Release plan"', 'filters', [s.seed.plan]); await s.settle(); assert.deepEqual(await s.fields(), expected); assert.equal(s.saves().length, 0); assert.deepEqual(await s.state(), before);
});
test('Filters real browser unsaved fields and native IndexedDB copies survive mode and query changes without Save', async ({ studio: s }) => {
  const expected = await s.draft(), before = await s.state(); await s.search('tag:work', 'filters', [s.seed.plan, s.seed.task, s.seed.complete]); await s.search('work ready', 'simple', [s.seed.plan, s.seed.task]);
  await expect.poll(async () => { const row = await s.copy(); return row && { title: row.title, body: row.body, tags: row.tags, notebookId: row.notebookId }; }).toEqual(expected);
  const copy = await s.copy(); assert.equal(copy.isTodo, true); assert.equal(copy.sourceNoteId, null); assert.equal(copy.sourceRevision, 0); assert.equal(copy.pendingSave, false);
  s.observations.push({ kind: 'native-IndexedDB-raw-unsaved-copy', copy }); await s.settle(); assert.deepEqual(await s.fields(), expected); assert.equal(s.saves().length, 0); assert.deepEqual(await s.state(), before);
});
test('Filters real browser newer results and editor fields survive an older unchanged actual response', async ({ studio: s }) => {
  const draft = await s.draft(), before = await s.state(); await s.search('title:"Release plan"', 'filters', [s.seed.plan]);
  const hold = await s.hold('body:archived', 'filters'); await field(s.page, 'Search notes').fill('body:archived'); await button(s.page, 'Search').click();
  const old = await bounded(hold.entered, 15000, 'Actual old list response was not held'); assert.deepEqual(old.ids, [s.seed.archived, s.seed.complete].sort());
  const expected = { ...draft, body: draft.body + '\nTyped while the old real response waits' }; await field(s.page, 'Markdown note').fill(expected.body);
  const latest = await s.search('work ready', 'simple', [s.seed.plan, s.seed.task]); assert.notDeepEqual(old.ids, ids(latest)); assert.deepEqual(await s.fields(), expected);
  hold.release(); await bounded(hold.finished, 7000, 'Old unchanged response was not released'); await s.settle();
  await expect(list(s.page).getByRole('button')).toHaveText(latest.notes.map(row => row.title + ' · ' + row.notebook + ' · ' + row.tags.join(', '))); assert.deepEqual(await s.fields(), expected); assert.equal(s.saves().length, 0); assert.deepEqual(await s.state(), before);
});
test('Filters real browser trash tag notebook and todo selectors preserve independent result boundaries', async ({ studio: s }) => {
  const draft = await s.draft(), before = await s.state(); await s.search('notebook:Lab tag:work', 'filters', [s.seed.plan, s.seed.task]);
  await s.select('Show trash', true, [s.seed.trash]); await s.select('Filter note type', 'todos', []); await s.select('Filter note type', 'all', [s.seed.trash]);
  await s.select('Filter notebook', s.seed.child, []); await s.select('Filter notebook', '', [s.seed.trash]); await s.select('Filter tag', 'spam', []); await s.select('Filter tag', '', [s.seed.trash]);
  await s.select('Show trash', false, [s.seed.plan, s.seed.task]); await s.settle(); assert.deepEqual(await s.fields(), draft); assert.equal(s.saves().length, 0); assert.deepEqual(await s.state(), before);
});
test('Filters real browser exact module delivery reload and explicit recovery consent preserve saved records', async ({ studio: s }) => {
  const expected = await s.draft(), before = await s.state(); await s.search('tag:work', 'filters', [s.seed.plan, s.seed.task, s.seed.complete]);
  await expect.poll(async () => { const row = await s.copy(); return row && { title: row.title, body: row.body, tags: row.tags, notebookId: row.notebookId, isTodo: row.isTodo, sourceNoteId: row.sourceNoteId, sourceRevision: row.sourceRevision, pendingSave: row.pendingSave }; }).toEqual({ ...expected, isTodo: true, sourceNoteId: null, sourceRevision: 0, pendingSave: false });
  await expect(root(s.page).getByLabel('Draft recovery status', { exact: true })).toHaveText('Recovery copy saved in this browser.'); const copyBefore = await s.copy();
  for (const name of ['client', 'markdown', 'core', 'draft-recovery']) { const response = await s.page.request.get(s.url + '/apps/notes/' + name + '.mjs'); assert.equal(response.status(), 200); assert.equal(response.headers()['content-type'], 'text/javascript; charset=utf-8'); const bytes = await response.body(); assert.deepEqual(bytes, await fs.readFile(path.join(studioRoot, 'apps/notes/' + name + '.mjs'))); s.observations.push({ kind: 'exact-actual-shipped-module-delivery', name, ...identity(bytes) }); }
  await s.settle(); await s.page.reload(); await expect(button(s.page, 'Refresh recovery copies')).toBeEnabled(); await s.settle();
  await expect(field(s.page, 'Search mode')).toHaveValue('simple'); await expect(field(s.page, 'Search notes')).toHaveValue(''); assert.deepEqual(await s.copy(), copyBefore);
  await button(s.page, 'Refresh recovery copies').click(); const row = root(s.page).locator('section[aria-label=' + JSON.stringify('Recovery copy: ' + rawDraft.title) + ']'); await expect(row).toBeVisible(); await expect(row.getByLabel('I want a separate note from this recovery copy', { exact: true })).not.toBeChecked(); await expect(row.getByRole('button', { name: 'Recover as new to-do', exact: true })).toBeDisabled();
  s.observations.push({ kind: 'native-reload-retained-recovery-and-transient-search-reset', copyBefore, modeAfterReload: 'simple', queryAfterReload: '', explicitSeparateCopyConsentStillRequired: true });
  await s.settle(); assert.equal(s.saves().length, 0); assert.deepEqual(await s.state(), before);
});
