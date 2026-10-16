// Source-authored finite real Chromium acceptance. Execute only on the pinned
// hosted Notes after-images. Every fixture is synthetic; no original app runs.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { test as base, expect } from '@playwright/test';
assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
assert.equal(process.env.CI, 'true'); assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
assert.equal(process.env.GITHUB_REPOSITORY, 'Ginderlax/rea-research-lab');
for (const name of ['GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) assert(process.env[name]);
const studioRoot = path.resolve(import.meta.dirname, '..');
const evidence = await fs.realpath(process.env.REA_BROWSER_EVIDENCE);
const dataRoot = await fs.realpath(process.env.REA_BROWSER_DATA_ROOT);
const metadata = bytes => ({ bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
const write = (name, value) => fs.writeFile(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const sourcePins = [
  ['apps/notes/client.mjs', 28048, '09f7a63badf83336b1b0fd36935256461babcb31333ff500b192307b587928db'],
  ['apps/notes/core.mjs', 2657, '06bf9ad2485e39d6c7dea51a3be9a232fefe9d1a2ed1e46482b0459d605aa44c'],
  ['apps/notes/README.md', 18406, '65b8eec8da3295d44adb0afd0b9840fe38107b676af750d0a2be27243857705d'],
  ['apps/notes/server.mjs', 24800, '492ab5fb79a077a888376f8f8b6b13c830fc4004e21a0e2033546e90e0e36181'],
  ['apps/notes/todo-original.test.mjs', 4397, '51e4f9594525b046ae3b6a5ed2af92736df158743049e792fff50e9b774717d0'],
  ['apps/notes/todo.integration.test.mjs', 5802, '442da2522755a4a0c02a6602a8a63ce367a20d2a65d940a53062a7dc08e9d05e'],
  ['apps/notes/todo.test.mjs', 10873, '38c66f3b553888923098c98bb083899f00ca42df45dab30ad66548d4ff576e18'],
  ['apps/notes/todo.ui.test.mjs', 8623, '65de552f75be2e7b6ebbd45723740c76e55bda09d13d550bf38ec6228e4d83f5'],
];
for (const [name, bytes, sha256] of sourcePins) assert.deepEqual(metadata(await fs.readFile(path.join(studioRoot, name))), { bytes, sha256 });
const fixturePath = path.join(studioRoot, 'apps/notes/fixtures/pinned-joplin.jex');
const fixtureBytes = await fs.readFile(fixturePath);
assert.deepEqual(metadata(fixtureBytes), { bytes: 9728, sha256: '044885c906ba7d8cb97a95fbdd6bc2323ba31a3c301e7ed1d6e592acec8944af' });
const fixtureProvenanceBytes = await fs.readFile(path.join(studioRoot, 'apps/notes/fixtures/pinned-joplin.json'));
assert.deepEqual(metadata(fixtureProvenanceBytes), { bytes: 6174, sha256: 'cabc16edfc51e2e58fa0f147f31f5b5b54345a49597a3567583c3623d0fad220' });
const fixtureProvenance = JSON.parse(fixtureProvenanceBytes);
const { start } = await import('../server.mjs');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
async function bounded(promise, milliseconds, label) { let timer; try { return await Promise.race([promise, new Promise((_, reject) => timer = setTimeout(() => reject(new Error(label)), milliseconds))]); } finally { clearTimeout(timer); } }
const view = page => page.locator('#app-root > div');
const status = page => view(page).getByRole('status');
const field = (page, name) => view(page).getByLabel(name, { exact: true });
const button = (page, name) => view(page).getByRole('button', { name, exact: true });
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const savedRow = (page, title) => view(page).getByRole('button', { name: new RegExp('^' + escape(title) + ' · ') });
const dueInput = '2030-03-14T09:26:53.123', dueUtc = '2030-03-14T09:26:53.123Z';

const test = base.extend({
  studio: async ({ page }, use, info) => {
    const dataDir = await fs.mkdtemp(path.join(dataRoot, 'notes-case-'));
    const instance = await start({ port: 0, dataDir });
    const observations = [], requests = [], responses = [], faults = [], holds = [], downloads = [], savedDownloads = [];
    const errors = [], consoleErrors = [], auxiliaryErrors = [], expectedHttpFailures = [], responseTasks = new Set();
    const pending = new Set(), waiters = new Set(), requestCounts = { started: 0, finished: 0, failed: 0 };
    const owns = request => request.url().startsWith(instance.url + '/');
    function finishRequest(request, kind) { if (!owns(request)) return; pending.delete(request); requestCounts[kind]++; if (!pending.size) for (const done of waiters) done(); }
    async function drain() {
      if (!pending.size) return;
      let done; const p = new Promise(resolve => { done = resolve; waiters.add(resolve); });
      try { if (!pending.size) done(); await p; } finally { waiters.delete(done); }
    }
    page.on('request', request => {
      if (!owns(request)) return; pending.add(request); requestCounts.started++;
      if (!new URL(request.url()).pathname.startsWith('/api/notes/')) return;
      assert(requests.length < 500, 'Notes finite request bound');
      requests.push({ method: request.method(), path: new URL(request.url()).pathname, postData: request.postData() });
    });
    page.on('requestfinished', request => finishRequest(request, 'finished'));
    page.on('requestfailed', request => { finishRequest(request, 'failed'); if (owns(request)) errors.push({ type: 'requestfailed', path: new URL(request.url()).pathname, failure: request.failure() }); });
    page.on('pageerror', error => errors.push({ type: 'pageerror', message: error.message }));
    page.on('console', message => {
      if (message.type() !== 'error') return;
      const item = { type: 'console', message: message.text(), location: message.location() };
      if (item.location.url === instance.url + '/favicon.ico' && /404/.test(item.message)) auxiliaryErrors.push(item);
      else consoleErrors.push(item);
    });
    page.on('response', response => {
      if (!response.url().startsWith(instance.url + '/api/notes/')) return;
      const operation = (async () => {
        const name = new URL(response.url()).pathname, item = { path: name, status: response.status(), method: response.request().method() };
        if (!response.ok()) {
          const body = await response.body(); assert(body.length <= 2048);
          item.body = metadata(body); item.error = JSON.parse(body).error;
          const expected = expectedHttpFailures.find(row => !row.observed && row.path === name && row.status === response.status() && row.errorMessage === item.error);
          if (expected) { expected.observed = true; item.expectedActualHostFailure = true; }
          else errors.push({ type: 'unexpected-http-response', ...item });
        }
        responses.push(item);
      })().catch(error => errors.push({ type: 'response-observer', message: error.message }));
      responseTasks.add(operation); operation.finally(() => responseTasks.delete(operation));
    });
    page.on('download', download => downloads.push({ download, suggestedFilename: download.suggestedFilename() }));
    async function api(action, input = {}) {
      const response = await page.request.post(instance.url + '/api/notes/' + action, { headers: { 'X-REA-Token': instance.token }, data: input });
      assert.equal(response.status(), 200, 'Owned API fixture/observer: ' + action); return (await response.json()).result;
    }
    async function disk() {
      const filename = path.join(dataDir, 'notes/records/notes-state-v2.json');
      const bytes = await fs.readFile(filename); assert(bytes.length <= 1024 * 1024);
      return { bytes, state: JSON.parse(bytes), identity: metadata(bytes) };
    }
    async function hold(action, predicate = () => true) {
      const entered = deferred(), released = deferred(), finished = deferred(); let used = false;
      await page.route(instance.url + '/api/notes/' + action, async route => {
        if (used || !predicate(route.request().postDataJSON())) return route.continue(); used = true;
        try {
          const response = await route.fetch({ timeout: 15000 }), body = await response.body();
          assert.equal(response.status(), 200, 'Hold must observe an unchanged actual success');
          faults.push({ kind: 'delay-after-actual-host-response', action, status: response.status(), body: metadata(body), handlerMocked: false, responseRewritten: false });
          entered.resolve(JSON.parse(body).result); await released.promise; await route.fulfill({ response });
        } catch (error) { entered.reject(error); throw error; } finally { finished.resolve(); }
      });
      const gate = { entered: entered.promise, release: released.resolve, finished: finished.promise, used: () => used }; holds.push(gate); return gate;
    }
    async function settle() { await bounded(drain(), 5000, 'Owned Notes requests did not drain'); await bounded(Promise.all([...responseTasks]), 5000, 'Response observer deadline'); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve()))); }
    const s = { page, url: instance.url, api, disk, hold, settle, requests, responses, observations, faults,
      expectHttpFailure(action, errorMessage) { expectedHttpFailures.push({ path: '/api/notes/' + action, status: 400, errorMessage, observed: false }); },
      async saveDownload(trigger, label, expectedFilename) {
        assert(/^[a-z0-9][a-z0-9.-]{0,80}$/.test(label) && !label.includes('..')); const event = page.waitForEvent('download'); await trigger(); const download = await event;
        assert.equal(await download.failure(), null); assert.equal(download.suggestedFilename(), expectedFilename);
        const relative = 'downloads/' + info.testId + '-' + label, destination = path.join(evidence, relative);
        await fs.mkdir(path.dirname(destination), { recursive: true }); assert.equal(await fs.stat(destination).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; }), false);
        await download.saveAs(destination); const bytes = await fs.readFile(destination); assert(bytes.length <= 8 * 1024 * 1024);
        const record = { kind: 'real-browser-file-download', path: relative, observed: metadata(bytes), suggestedFilename: download.suggestedFilename() };
        savedDownloads.push({ download, ...record }); observations.push(record); return { bytes, destination, record };
      }
    };
    try { await use(s); }
    finally {
      const teardown = { stage: 'starting', heldRoutesFinished: false, drained: false, contextClosed: false, serverClosed: false, screenshotSaved: false, requestCounts, steps: [] }, failures = [];
      async function step(name, operation) { const row = { name, status: 'running', startedAtUtc: new Date().toISOString() }; teardown.steps.push(row); teardown.stage = name;
        try { await operation(); row.status = 'passed'; } catch (error) { row.status = 'failed'; row.failure = { name: error.name, message: error.message }; failures.push(error); } finally { row.completedAtUtc = new Date().toISOString(); } }
      await step('release-held-routes', async () => { for (const gate of holds) gate.release(); await bounded(Promise.all(holds.filter(gate => gate.used()).map(gate => gate.finished)), 5000, 'Held route cleanup deadline'); teardown.heldRoutesFinished = true; });
      await step('screenshot', async () => { await fs.mkdir(path.join(evidence, 'screenshots'), { recursive: true }); await page.screenshot({ path: path.join(evidence, 'screenshots', info.testId + '.png'), fullPage: false }); teardown.screenshotSaved = true; });
      await step('drain-owned-page-requests', async () => { await bounded(drain(), 5000, 'Owned request cleanup deadline'); await bounded(Promise.all([...responseTasks]), 5000, 'Response observer cleanup deadline'); teardown.drained = true; });
      await step('capture-synthetic-final-record', async () => { try { const current = await disk(); await fs.mkdir(path.join(evidence, 'notes-records'), { recursive: true }); const relative = 'notes-records/' + info.testId + '.json'; await fs.writeFile(path.join(evidence, relative), current.bytes, { flag: 'wx' }); observations.push({ kind: 'owned-synthetic-disk-record', path: relative, ...current.identity }); } catch (error) { if (error.code !== 'ENOENT') throw error; observations.push({ kind: 'owned-note-record-absent' }); } });
      await step('close-owned-context', async () => { await bounded(page.context().close(), 5000, 'Owned context close deadline'); teardown.contextClosed = true; assert.equal(pending.size, 0); });
      await step('close-owned-server', async () => { await bounded(instance.close(), 5000, 'Owned server close deadline'); teardown.serverClosed = true; });
      teardown.pendingOwnedRequests = pending.size; teardown.stage = failures.length ? 'failed' : 'completed';
      const expectedConsole = consoleErrors.filter(item => expectedHttpFailures.some(row => row.observed && item.location.url === instance.url + row.path && /400/.test(item.message)));
      errors.push(...consoleErrors.filter(item => !expectedConsole.includes(item)));
      if (expectedConsole.length > expectedHttpFailures.length) errors.push({ type: 'extra-expected-path-console-errors', count: expectedConsole.length });
      const savedEvents = new Set(savedDownloads.map(row => row.download));
      if (downloads.some(row => !savedEvents.has(row.download))) errors.push({ type: 'unclaimed-download', count: downloads.length - savedDownloads.length });
      await write('case-' + info.testId + '.json', { schema: 'rea-notes-todo-real-browser-case/v1', testId: info.testId, title: info.title, statusAtFixtureClose: info.status, retry: info.retry,
        url: instance.url, ownedDataDirectory: dataDir, serverCloseObserved: teardown.serverClosed, realBrowser: true, actualHTTP: true, originalProductExecutions: 0, originalFullApplicationExecutions: 0, originalHelperExecutions: 0, programmaticDisabledControlProbes: 0,
        teardown, observations, requests, responses, faults, expectedHttpFailures, expectedConsole, auxiliaryErrors, errors, downloads: savedDownloads.map(({ download, ...row }) => row) });
      expect(errors).toEqual([]); expect(expectedHttpFailures.every(row => row.observed)).toBe(true);
      if (failures.length) throw new AggregateError(failures, 'Notes owned fixture cleanup failed');
      expect(teardown.drained && teardown.contextClosed && teardown.serverClosed && teardown.heldRoutesFinished).toBe(true);
    }
  }
});

test.beforeAll(async ({ browser }) => {
  expect(browser.version()).toBe('156.0.8078.4');
  const observation = { schema: 'rea-cloud-real-browser-observation/v1', browser: 'chromium', channel: 'chromium', version: browser.version(), realBrowserFixtureCreated: true, retries: 0 };
  const execution = Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY'].map(name => [name, process.env[name] ?? null]));
  await write('browser-observation-process-' + process.pid + '.json', { schema: 'rea-cloud-notes-todo-browser-worker-observation/v1', observation, execution, pid: process.pid, sourcePins: sourcePins.map(([path, bytes, sha256]) => ({ path, bytes, sha256 })) });
  try { await write('browser-observation.json', observation); } catch (error) { if (error.code !== 'EEXIST') throw error; assert.deepEqual(JSON.parse(await fs.readFile(path.join(evidence, 'browser-observation.json'), 'utf8')), observation); }
});
async function openNotes(s) { await s.page.goto(s.url + '/#notes'); await expect(view(s.page).getByRole('heading', { name: 'Local Notes', exact: true })).toBeVisible(); await expect(status(s.page)).toHaveText('Notes are saved locally when you choose Save.'); }
async function successfulAction(s, action, trigger) { const response = s.page.waitForResponse(r => r.url() === s.url + '/api/notes/' + action && r.request().method() === 'POST'); await trigger(); const actual = await response; expect(actual.status()).toBe(200); return (await actual.json()).result; }
async function save(s) { const note = await successfulAction(s, 'save', () => button(s.page, 'Save note').click()); await expect(status(s.page)).toHaveText('Saved revision ' + note.revision + '.'); return note; }
async function createNote(s, title, body = 'Saved synthetic body', tags = 'study') { await button(s.page, 'New note').click(); await field(s.page, 'Note title').fill(title); await field(s.page, 'Markdown note').fill(body); await field(s.page, 'Note tags').fill(tags); return save(s); }
async function taskAction(s, action, name) { const result = await successfulAction(s, action, () => button(s.page, name).click()); await expect(status(s.page)).toHaveText(result.changed ? 'Saved to-do state.' : 'To-do state was already current.'); return result.note; }
async function createTask(s, title) { const note = await createNote(s, title); const changed = await taskAction(s, 'todo-type', 'Convert to to-do'); expect(changed.id).toBe(note.id); return changed; }
async function refreshBy(s, trigger) { const organization = s.page.waitForResponse(r => r.url() === s.url + '/api/notes/notebook-list' && r.request().method() === 'POST'); await successfulAction(s, 'list', trigger); await organization; await s.settle(); }
async function chooseFilter(s, value) { await refreshBy(s, () => field(s.page, 'Filter note type').selectOption(value)); }
async function openSaved(s, title) { await refreshBy(s, () => button(s.page, 'Search').click()); const response = s.page.waitForResponse(r => r.url() === s.url + '/api/notes/get' && r.request().method() === 'POST'); await savedRow(s.page, title).click(); const note = (await (await response).json()).result; await expect(status(s.page)).toHaveText('Opened revision ' + note.revision + '.'); return note; }
const todoRequests = s => s.requests.filter(row => ['/api/notes/todo-type', '/api/notes/todo-completed', '/api/notes/todo-due'].includes(row.path));
const diskNote = async (s, id) => { const value = await s.disk(); assert(value.state.notes[id]); return value.state.notes[id]; };

test('Notes ordinary UI conversion completion millisecond due metadata and combined filters preserve saved content', async ({ studio: s }) => {
  await openNotes(s); await createNote(s, 'Other regular note', 'Unrelated other body', 'other');
  const before = await createNote(s, 'Critical study task', 'critical preserved body', 'study'); let note = await taskAction(s, 'todo-type', 'Convert to to-do');
  await field(s.page, 'To-do due date in local time').fill(dueInput); note = await taskAction(s, 'todo-due', 'Set due date'); expect(note.todo.due).toBe(Date.parse(dueUtc));
  await expect(view(s.page).getByText('Open to-do · Due ' + dueUtc, { exact: true })).toBeVisible();
  note = await taskAction(s, 'todo-completed', 'Mark complete'); expect(note.todo.completed).toBeGreaterThan(0);
  await chooseFilter(s, 'completed'); await expect(savedRow(s.page, before.title)).toHaveCount(1); await expect(savedRow(s.page, 'Other regular note')).toHaveCount(0);
  await chooseFilter(s, 'notes'); await expect(savedRow(s.page, before.title)).toHaveCount(0); await expect(savedRow(s.page, 'Other regular note')).toHaveCount(1); await chooseFilter(s, 'completed');
  await refreshBy(s, () => field(s.page, 'Filter tag').selectOption('study')); await refreshBy(s, () => field(s.page, 'Filter notebook').selectOption(note.notebookId)); await field(s.page, 'Search notes').fill('critical'); await refreshBy(s, () => button(s.page, 'Search').click()); await expect(savedRow(s.page, before.title)).toHaveCount(1);
  note = await taskAction(s, 'todo-completed', 'Mark incomplete'); expect(note.todo.completed).toBe(0);
  await chooseFilter(s, 'open'); await expect(savedRow(s.page, before.title)).toHaveCount(1); await chooseFilter(s, 'todos'); await expect(savedRow(s.page, before.title)).toHaveCount(1); await chooseFilter(s, 'notes'); await expect(savedRow(s.page, before.title)).toHaveCount(0);
  await chooseFilter(s, 'all'); await expect(savedRow(s.page, before.title)).toHaveCount(1); note = await taskAction(s, 'todo-due', 'Clear due date'); expect(note.todo.due).toBe(0);
  await field(s.page, 'To-do due date in local time').fill(dueInput); note = await taskAction(s, 'todo-due', 'Set due date'); note = await taskAction(s, 'todo-completed', 'Mark complete'); expect(note.todo.due).toBe(Date.parse(dueUtc)); expect(note.todo.completed).toBeGreaterThan(0);
  note = await taskAction(s, 'todo-type', 'Convert to note'); expect(note.todo).toEqual({ isTodo: false, due: 0, completed: 0 });
  for (const key of ['id', 'title', 'body', 'notebookId', 'notebook', 'tags']) expect(note[key]).toEqual(before[key]); expect((await diskNote(s, note.id)).todo).toEqual(note.todo);
  s.observations.push({ kind: 'ordinary-browser-task-lifecycle', noteId: note.id, dueUtc, dueTimestamp: Date.parse(dueUtc), finalRevision: note.revision, dueMetadataIsNotAlarm: true, fiveTaskFiltersObserved: true, combinedSearchTagNotebook: true });
});

test('Notes dirty ordinary draft rejects to-do commands before transport and preserves stored bytes', async ({ studio: s }) => {
  await openNotes(s); const note = await createTask(s, 'Dirty task'), before = await s.disk(), count = todoRequests(s).length;
  await field(s.page, 'Note title').fill('New unsaved title'); await field(s.page, 'Markdown note').fill('New unsaved body'); await field(s.page, 'Note tags').fill('study, unsaved');
  await button(s.page, 'Mark complete').click(); await expect(status(s.page)).toHaveText('Save your draft before changing its to-do state.');
  await field(s.page, 'To-do due date in local time').fill(dueInput); await button(s.page, 'Set due date').click(); await expect(status(s.page)).toHaveText('Save your draft before changing its to-do state.');
  await button(s.page, 'Convert to note').click(); await expect(status(s.page)).toHaveText('Save your draft before changing its to-do state.');
  expect(todoRequests(s)).toHaveLength(count); expect((await s.disk()).bytes.equals(before.bytes)).toBe(true);
  await expect(field(s.page, 'Note title')).toHaveValue('New unsaved title'); await expect(field(s.page, 'Markdown note')).toHaveValue('New unsaved body'); await expect(field(s.page, 'Note tags')).toHaveValue('study, unsaved');
  s.observations.push({ kind: 'dirty-draft-no-transport', noteId: note.id, attemptedOrdinaryCommands: 3, additionalMutatingRequests: 0, storedBytesBefore: before.identity, storedBytesAfter: (await s.disk()).identity });
});

test('Notes held actual committed response retains ordinarily typed newer draft and saves with the returned revision', async ({ studio: s }) => {
  await openNotes(s); const note = await createTask(s, 'Held commit task'), gate = await s.hold('todo-completed', input => input.id === note.id);
  await button(s.page, 'Mark complete').click(); const committed = await bounded(gate.entered, 15000, 'Actual committed response was not observed');
  expect((await diskNote(s, note.id)).revision).toBe(committed.note.revision); expect((await diskNote(s, note.id)).todo.completed).toBeGreaterThan(0);
  await expect(field(s.page, 'Markdown note')).toBeEnabled(); await field(s.page, 'Markdown note').fill('Ordinary newer body after actual disk commit'); await field(s.page, 'Note title').fill('Ordinary newer title');
  await expect(button(s.page, 'Mark complete')).toBeDisabled(); gate.release(); await gate.finished;
  await expect(status(s.page)).toHaveText('Saved to-do state. Your newer note draft is retained.'); await expect(field(s.page, 'Markdown note')).toHaveValue('Ordinary newer body after actual disk commit');
  const saved = await save(s), submitted = JSON.parse(s.requests.filter(row => row.path === '/api/notes/save').at(-1).postData);
  expect(submitted.revision).toBe(committed.note.revision); expect(saved.revision).toBe(committed.note.revision + 1); expect(saved.todo.completed).toBe(committed.note.todo.completed); expect(saved.body).toBe('Ordinary newer body after actual disk commit'); expect((await diskNote(s, note.id)).body).toBe(saved.body);
  expect(s.requests.filter(row => row.path === '/api/notes/todo-completed')).toHaveLength(1);
  s.observations.push({ kind: 'actual-disk-commit-before-response-release', noteId: note.id, committedRevision: committed.note.revision, nextSubmittedRevision: submitted.revision, finalRevision: saved.revision, ordinaryEnabledFieldTyping: true, programmaticDisabledControlProbe: false });
});

test('Notes New note ownership survives a held actual task commit without overwriting the new draft', async ({ studio: s }) => {
  await openNotes(s); const note = await createTask(s, 'Old held task'), gate = await s.hold('todo-completed', input => input.id === note.id);
  await button(s.page, 'Mark complete').click(); const committed = await bounded(gate.entered, 15000, 'New-note timing gate'); expect((await diskNote(s, note.id)).revision).toBe(committed.note.revision);
  await button(s.page, 'New note').click(); await field(s.page, 'Note title').fill('Separately owned new note'); await field(s.page, 'Markdown note').fill('New draft stays mine');
  gate.release(); await gate.finished; await s.settle(); await expect(status(s.page)).toHaveText('Unsaved draft. Save to keep this note.'); await expect(field(s.page, 'Note title')).toHaveValue('Separately owned new note');
  const saved = await save(s); expect(saved.id).not.toBe(note.id); expect(saved.revision).toBe(1); expect(saved.body).toBe('New draft stays mine'); expect((await diskNote(s, note.id)).todo.completed).toBe(committed.note.todo.completed);
  s.observations.push({ kind: 'new-editor-generation-after-actual-commit', originalId: note.id, newId: saved.id, originalCommittedRevision: committed.note.revision, newRevision: saved.revision });
});

test('Notes navigation disposal suppresses late publication after a held actual task commit', async ({ studio: s }) => {
  await openNotes(s); const note = await createTask(s, 'Disposed held task'), oldField = await field(s.page, 'Markdown note').elementHandle(), gate = await s.hold('todo-completed', input => input.id === note.id);
  await button(s.page, 'Mark complete').click(); const committed = await bounded(gate.entered, 15000, 'Disposed timing gate'); expect((await diskNote(s, note.id)).revision).toBe(committed.note.revision);
  await s.page.getByRole('button', { name: 'Lab Flow', exact: true }).click(); await expect(s.page.getByRole('heading', { name: 'Native Node-RED flows', exact: true })).toBeVisible(); expect(await oldField.evaluate(node => node.isConnected)).toBe(false);
  const notesCallsAtDisposal = s.requests.length; gate.release(); await gate.finished; await s.settle(); expect(s.requests).toHaveLength(notesCallsAtDisposal); await expect(s.page.getByRole('heading', { name: 'Local Notes', exact: true })).toHaveCount(0); expect((await diskNote(s, note.id)).todo.completed).toBe(committed.note.todo.completed);
  s.observations.push({ kind: 'actual-navigation-disposal-after-commit', noteId: note.id, committedRevision: committed.note.revision, lateNotesRequests: 0, detachedControlObserved: true, detachedControlScrubbingClaimed: false });
});

test('Notes genuine concurrent revision conflict preserves disk state and explicit reopen then retry succeeds', async ({ studio: s }) => {
  await openNotes(s); const stale = await createTask(s, 'Conflict task');
  const concurrent = await s.api('save', { id: stale.id, revision: stale.revision, title: 'Concurrent saved task', body: 'Actual concurrent saved body', notebookId: stale.notebookId, tags: stale.tags }); const beforeRejected = await s.disk();
  s.expectHttpFailure('todo-completed', 'Note changed since it was opened. Reopen it before saving; your draft is preserved.');
  const pending = s.page.waitForResponse(r => r.url() === s.url + '/api/notes/todo-completed' && r.request().method() === 'POST'); await button(s.page, 'Mark complete').click(); const rejected = await pending; expect(rejected.status()).toBe(400);
  await expect(status(s.page)).toHaveText('Note changed since it was opened. Reopen it before saving; your draft is preserved.'); await expect(button(s.page, 'Mark complete')).toBeEnabled(); expect((await s.disk()).bytes.equals(beforeRejected.bytes)).toBe(true); await expect(field(s.page, 'Note title')).toHaveValue(stale.title);
  const reopened = await openSaved(s, concurrent.title); expect(reopened.revision).toBe(concurrent.revision); const retried = await taskAction(s, 'todo-completed', 'Mark complete'); expect(retried.revision).toBe(concurrent.revision + 1); expect(retried.body).toBe(concurrent.body); expect((await diskNote(s, stale.id)).todo.completed).toBe(retried.todo.completed);
  expect(s.requests.filter(row => row.path === '/api/notes/todo-completed')).toHaveLength(2);
  s.observations.push({ kind: 'actual-host-revision-conflict-and-explicit-retry', noteId: stale.id, staleRevision: stale.revision, concurrentRevision: concurrent.revision, rejectedHTTPStatus: 400, rejectedStoredBytes: beforeRejected.identity, reopenedRevision: reopened.revision, successfulRetryRevision: retried.revision, responseMocked: false });
});

test('Notes typing during a held post-accept actual list refresh retains unsaved status and next revision', async ({ studio: s }) => {
  await openNotes(s); const note = await createTask(s, 'Post-accept refresh task'), gate = await s.hold('list');
  await button(s.page, 'Mark complete').click(); const actualList = await bounded(gate.entered, 15000, 'Actual post-accept list gate'); const committed = actualList.notes.find(row => row.id === note.id); assert(committed); expect((await diskNote(s, note.id)).revision).toBe(committed.revision);
  await field(s.page, 'Markdown note').fill('Typed while actual list response is held'); await expect(status(s.page)).toHaveText('Unsaved draft. Save to keep this note.');
  const nextOrganization = s.page.waitForResponse(r => r.url() === s.url + '/api/notes/notebook-list' && r.request().method() === 'POST'); gate.release(); await gate.finished; await nextOrganization; await s.settle();
  await expect(status(s.page)).toHaveText('Unsaved draft. Save to keep this note.'); await expect(field(s.page, 'Markdown note')).toHaveValue('Typed while actual list response is held');
  const saved = await save(s), request = JSON.parse(s.requests.filter(row => row.path === '/api/notes/save').at(-1).postData); expect(request.revision).toBe(committed.revision); expect(saved.revision).toBe(committed.revision + 1); expect(saved.body).toBe('Typed while actual list response is held');
  s.observations.push({ kind: 'actual-post-accept-list-refresh-draft', noteId: note.id, committedRevision: committed.revision, nextSubmittedRevision: request.revision, finalRevision: saved.revision, ordinaryEnabledFieldTyping: true });
});

function nativeTar(archive, entry = null) {
  const executable = path.join(process.env.SystemRoot, 'System32/tar.exe'), arguments_ = entry === null ? ['-tf', archive] : ['-xOf', archive, entry];
  const result = spawnSync(executable, arguments_, { shell: false, windowsHide: true, timeout: 10000, maxBuffer: 1024 * 1024 }); assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr.toString('utf8')); return result.stdout;
}
function rawRecord(bytes) { const lines = bytes.toString('utf8').split('\n'); if (lines.at(-1) === '') lines.pop(); let boundary = lines.length - 1; while (boundary >= 0 && lines[boundary] !== '') boundary--; assert(boundary >= 0); const properties = Object.fromEntries(lines.slice(boundary + 1).map(line => { const match = /^([a-z][a-z0-9_]*): (.*)$/.exec(line); assert(match); return [match[1], match[2]]; })); return { content: lines.slice(0, boundary).join('\n'), properties }; }
test('Notes actual JEX and resource downloads retain task fields native IDs metadata and exact binary bytes', async ({ studio: s }, info) => {
  await openNotes(s); await field(s.page, 'Import Markdown, REA notes JSON or Joplin JEX').setInputFiles({ name: 'pinned-study.jex', mimeType: 'application/x-tar', buffer: fixtureBytes }); await expect(status(s.page)).toHaveText('Imported 2 notes, 2 notebooks and 1 attachments with original IDs.');
  const id = '3'.repeat(32), imported = await s.api('get', { id }); await openSaved(s, imported.title);
  await taskAction(s, 'todo-type', 'Convert to note'); await taskAction(s, 'todo-type', 'Convert to to-do'); await field(s.page, 'To-do due date in local time').fill(dueInput); let edited = await taskAction(s, 'todo-due', 'Set due date'); edited = await taskAction(s, 'todo-completed', 'Mark complete');
  const archive = await s.saveDownload(() => button(s.page, 'Export Joplin JEX').click(), 'edited-notes.jex', 'rea-notes.jex'); await expect(status(s.page)).toHaveText('Exported 2 notes and 1 attachments as JEX. Saved-version history is not included.');
  const listing = nativeTar(archive.destination); expect(listing.toString('utf8').trim().split(/\r?\n/)).toHaveLength(8); await fs.writeFile(path.join(evidence, 'notes-native-tar-list-' + info.testId + '.txt'), listing, { flag: 'wx' });
  const resource = nativeTar(archive.destination, 'resources/' + '5'.repeat(32) + '.bin'); expect(resource.equals(Buffer.from([0, 1, 127, 128, 255]))).toBe(true); expect(metadata(resource).sha256).toBe(fixtureProvenance.resourceSha256);
  const original = rawRecord(nativeTar(fixturePath, id + '.md')), actual = rawRecord(nativeTar(archive.destination, id + '.md')); expect(actual.content).toBe(original.content);
  const allowedEdited = new Set(['is_todo', 'todo_due', 'todo_completed', 'updated_time', 'user_updated_time', 'deleted_time']);
  expect(Object.keys(actual.properties).sort()).toEqual(Object.keys(original.properties).sort()); for (const key of Object.keys(original.properties).filter(key => !allowedEdited.has(key))) expect(actual.properties[key]).toBe(original.properties[key]);
  expect(actual.properties.is_todo).toBe('1'); expect(actual.properties.todo_due).toBe(String(Date.parse(dueUtc))); expect(actual.properties.todo_completed).toBe(String(edited.todo.completed)); expect(actual.properties.updated_time).toBe(edited.updatedAt); expect(actual.properties.user_updated_time).toBe(edited.userUpdatedAt); expect(actual.properties.deleted_time).toBe('0');
  for (const [otherId, expected] of Object.entries(fixtureProvenance.expected).filter(([otherId]) => otherId !== id)) expect(metadata(nativeTar(archive.destination, otherId + '.md')).sha256).toBe(expected.rawSha256);
  const binary = await s.saveDownload(() => button(s.page, 'Download sample.bin (5 bytes)').click(), 'resource-sample.bin', 'sample.bin'); expect(binary.bytes.equals(resource)).toBe(true);
  const tarExecutable = path.join(process.env.SystemRoot, 'System32/tar.exe'); s.observations.push({ kind: 'actual-jex-native-tar-and-resource-download', noteId: id, dueTimestamp: Date.parse(dueUtc), completionTimestamp: edited.todo.completed, independentNativeTar: { executable: metadata(await fs.readFile(tarExecutable)), listing: metadata(listing), archive: metadata(archive.bytes), resource: metadata(resource), unchangedRawRecordComparisons: 6 }, originalFixtureProvenance: 'c17c205049ce74e449dc1ce08cbd1c875410d7d5', newOriginalProductExecutions: 0, resourceDownload: metadata(binary.bytes) });
});
