// Source-authored finite real Chromium acceptance. Execute only on the pinned
// hosted New To-do experimental after-images. Every fixture is synthetic; no original app runs.
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
assert.equal(process.env.GITHUB_JOB, 'eight-real-chromium-scenarios');
for (const name of ['GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) assert(process.env[name]);
const studioRoot = path.resolve(import.meta.dirname, '..');
const evidence = await fs.realpath(process.env.REA_BROWSER_EVIDENCE);
const dataRoot = await fs.realpath(process.env.REA_BROWSER_DATA_ROOT);
const metadata = bytes => ({ bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
const write = (name, value) => fs.writeFile(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const sourcePins = [
  [
    "apps/notes/README.md",
    21495,
    "1fc382d31ede4d4b82c6bb57fa64b5e1448f533e5a776f1a1a5deb1048c27d0e"
  ],
  [
    "apps/notes/app.integration.test.mjs",
    4297,
    "b4ac48818f2508f21c873edf6d34e09432b3e50361b066d8cfe54ab207d2a1e8"
  ],
  [
    "apps/notes/app.test.mjs",
    6974,
    "aa1891fc26b4dfecf771e53994c67bd2cadc4fa92c5ed86253a47a852a689cbd"
  ],
  [
    "apps/notes/client.mjs",
    29531,
    "d6f301dcc803c4bfd12a1c03eb71896710d1b42053fa10ee13d25e76d6930daa"
  ],
  [
    "apps/notes/core.mjs",
    2657,
    "06bf9ad2485e39d6c7dea51a3be9a232fefe9d1a2ed1e46482b0459d605aa44c"
  ],
  [
    "apps/notes/fixtures/oracle-verification.json",
    4843,
    "82b53a9c9c0594b0364f2752e78bef85d374d53a2f4a5b2580daa8edc6079d9f"
  ],
  [
    "apps/notes/fixtures/pinned-joplin.jex",
    9728,
    "044885c906ba7d8cb97a95fbdd6bc2323ba31a3c301e7ed1d6e592acec8944af"
  ],
  [
    "apps/notes/fixtures/pinned-joplin.json",
    6174,
    "cabc16edfc51e2e58fa0f147f31f5b5b54345a49597a3567583c3623d0fad220"
  ],
  [
    "apps/notes/interop-fixture-tool.mjs",
    12119,
    "8dfd56500bb9d31c0f3f77537bb8a4c7cad8bc4f8207a0f81a8c550825ee9f2f"
  ],
  [
    "apps/notes/jex.mjs",
    13323,
    "02785fd47baad48c2ae34c01fd066ad9efa1b0d1784258bfcdadac0e9c75570f"
  ],
  [
    "apps/notes/jex.test.mjs",
    14190,
    "21f9883954fa1d00d092751f70f4a482eaedc838a8d037e3276d1d72d2549fdf"
  ],
  [
    "apps/notes/markdown.mjs",
    5135,
    "409b2bcc489c785e725d3257f21af1c6a3cd4f1f78fa0d0ca74d538876f24915"
  ],
  [
    "apps/notes/new-todo-original.test.mjs",
    6798,
    "085096235586d069fecbdf4398fe8286cae0e0d3d13fa548a881405967008b18"
  ],
  [
    "apps/notes/new-todo.integration.test.mjs",
    6131,
    "e98cfe05932c8b0a6c2bf15582aeaef4257e9aa67f2ed8409856789a3aad6bcf"
  ],
  [
    "apps/notes/new-todo.test.mjs",
    6517,
    "d4fc6c291838b945de53d24479684a906fb57eaec05b649d80de975d6fe2f555"
  ],
  [
    "apps/notes/new-todo.ui.test.mjs",
    9856,
    "a60f74c9f10554a93bca6bc7c1dfe55aa5285941a392a40eb07c92219067fcd3"
  ],
  [
    "apps/notes/notebook-confirmation-cancel-open-note.ui.test.mjs",
    1389,
    "bd6a5217713ead7019f298c64366097aebe372a4df9ec8bfb0997a8c3c1ba7f4"
  ],
  [
    "apps/notes/notebook-confirmation.ui.test.mjs",
    9358,
    "007fd300093c25cedf078ed0784c61e6b77f07eede734646a0517d950e87d693"
  ],
  [
    "apps/notes/notebook-original-oracle.mjs",
    3699,
    "9e5ec3357b64e2af290866da6453361c12716f82f7122b3fa9e82f817588045f"
  ],
  [
    "apps/notes/notebook-trash-fresh-boundaries.test.mjs",
    4480,
    "820b38cd108d3d392496225a298e42f6239dbdd1fa6971ef505a9682e0dea95d"
  ],
  [
    "apps/notes/notebook-trash-original-oracle.mjs",
    5974,
    "077fa22e13d0ba84eaf7553b117d54c3f95e1bd4a9c6fa27f79fcb35ce4a1b8a"
  ],
  [
    "apps/notes/notebook-trash-publication-boundaries.test.mjs",
    6778,
    "9bb8f4dba56a0c5e7d106bed026aab7de67a7ed8627507edd883e75a087fe07b"
  ],
  [
    "apps/notes/notebook-trash-review-fixture.mjs",
    3296,
    "8ffd7a3c87ca203900bc9dc2806aef036034edbba9a947701d491828f001486c"
  ],
  [
    "apps/notes/notebook-trash-review.test.mjs",
    8836,
    "a2b47baadeab95035c1255865bb216943f685776e779495793607001fe897518"
  ],
  [
    "apps/notes/notebook-trash.integration.test.mjs",
    4078,
    "378d6499959631c3842df3ed142f45abe3d2ee66b1b71d4743d713f08a6b2b67"
  ],
  [
    "apps/notes/notebook-trash.mjs",
    6150,
    "a94a44d754ca5f20c5d5e8dbac9753c31650b7c929ceab6d196acc0c3690edb4"
  ],
  [
    "apps/notes/notebook-trash.test.mjs",
    14015,
    "e4f574932cee5c65b512f31a035f6c5066109ce5e075de63d101019dc4e18eba"
  ],
  [
    "apps/notes/notebook-trash.ui.test.mjs",
    2503,
    "d00d0e84abaf6e18f3626f49e4eb7c29929e834542dc469370aeff5077e480a9"
  ],
  [
    "apps/notes/notebooks.integration.test.mjs",
    3279,
    "b14ef6c52503b634d3a66e0b73d83fe3a577b783a0da9a5d76d8ce016993a75c"
  ],
  [
    "apps/notes/notebooks.mjs",
    6902,
    "4ba3d49563b87d1a37ebb4314d4f513f84e0c8681f9404842c380bc49175edc9"
  ],
  [
    "apps/notes/notebooks.test.mjs",
    14161,
    "4e14c0e2d99d856e67fff9b9dec8216858be354c63019a24599e60a3505bc82d"
  ],
  [
    "apps/notes/server.mjs",
    25329,
    "60e49793486ca0c8867004ff48b92c34eec4bd75ecb7a6d593d31659ab75b6dd"
  ],
  [
    "apps/notes/todo-original.test.mjs",
    4397,
    "51e4f9594525b046ae3b6a5ed2af92736df158743049e792fff50e9b774717d0"
  ],
  [
    "apps/notes/todo.integration.test.mjs",
    5802,
    "442da2522755a4a0c02a6602a8a63ce367a20d2a65d940a53062a7dc08e9d05e"
  ],
  [
    "apps/notes/todo.test.mjs",
    10873,
    "38c66f3b553888923098c98bb083899f00ca42df45dab30ad66548d4ff576e18"
  ],
  [
    "apps/notes/todo.ui.test.mjs",
    8623,
    "65de552f75be2e7b6ebbd45723740c76e55bda09d13d550bf38ec6228e4d83f5"
  ]
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
    const dataDir = await fs.mkdtemp(path.join(dataRoot, 'notes-new-todo-case-'));
    const instance = await start({ port: 0, dataDir });
    const observations = [], requests = [], responses = [], faults = [], holds = [], downloads = [], savedDownloads = [];
    const errors = [], consoleErrors = [], auxiliaryErrors = [], expectedHttpFailures = [], responseTasks = new Set();
    const pending = new Set(), waiters = new Set(), requestCounts = { started: 0, finished: 0, failed: 0 };
    const owns = request => request.url().startsWith(instance.url + '/');
    let activeDiskFault = null;
    const ownership = relative => { const result = path.resolve(dataDir, relative), inside = path.relative(dataDir, result); assert(inside && inside !== '..' && !inside.startsWith('..' + path.sep) && !path.isAbsolute(inside)); return result; };
    const stateFilename = ownership('notes/records/notes-state-v2.json');
    function finishRequest(request, kind) { if (!owns(request)) return; pending.delete(request); requestCounts[kind]++; if (!pending.size) for (const done of waiters) done(); }
    async function drain() {
      if (!pending.size) return;
      let done; const p = new Promise(resolve => { done = resolve; waiters.add(resolve); });
      try { if (!pending.size) done(); await p; } finally { waiters.delete(done); }
    }
    page.on('request', request => {
      if (!owns(request)) return; pending.add(request); requestCounts.started++;
      if (activeDiskFault && request !== activeDiskFault.heldRequest) errors.push({ type: 'unrelated-request-during-owned-io-fault', path: new URL(request.url()).pathname });
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
        const name = new URL(response.url()).pathname, item = { path: name, status: response.status(), method: response.request().method(), postData: response.request().postData() };
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
      const filename = stateFilename;
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
    // This creates a genuine owned-host filesystem read failure. It never rewrites
    // a response or product handler and restores committed bytes before delivery.
    async function listFault(title, holdResponse) {
      const entered = deferred(), released = deferred(), finished = deferred(); let used = false;
      const gate = { entered: entered.promise, release: released.resolve, finished: finished.promise, used: () => used };
      if (holdResponse) holds.push(gate); else released.resolve();
      await page.route(instance.url + '/api/notes/list', async route => {
        if (used) return route.continue(); used = true;
        const row = { kind: 'actual-host-list400-after-owned-filesystem-read-fault', title, handlerMocked: false, responseRewritten: false, heldAfterRestore: holdResponse, steps: [] };
        faults.push(row); let response, body, original, backup, moved = false, directory = false;
        const stamp = name => row.steps.push({ name, atUtc: new Date().toISOString() });
        try {
          original = await disk(); const saved = Object.values(original.state.notes).find(note => note.title === title);
          assert(saved && saved.revision === 1 && saved.todo.isTodo && saved.history.length === 0);
          row.noteId = saved.id; row.committedRevision = saved.revision; row.originalCommittedState = original.identity;
          // accept(note) starts attachment-list before list refresh. Wait for its
          // real response and every other owned request to finish before rename.
          await bounded((async () => {
            for (;;) {
              const attachment = responses.find(item => item.path === '/api/notes/attachment-list' && item.status === 200 && JSON.parse(item.postData).id === saved.id);
              if (attachment && [...pending].every(request => request === route.request()) && responseTasks.size === 0) break;
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          })(), 5000, 'Prior attachment-list and other owned requests did not finish before fault');
          stamp('all-other-owned-requests-and-attachment-response-drained');
          assert.equal(pending.size, 1); assert(pending.has(route.request()));
          backup = ownership('notes/records/new-todo-owned-fault-original.json');
          assert.equal(await fs.stat(backup).then(() => true, error => { if(error.code === 'ENOENT') return false; throw error; }), false);
          const originalStat = await fs.lstat(stateFilename); assert(originalStat.isFile() && !originalStat.isSymbolicLink());
          assert((await fs.readFile(stateFilename)).equals(original.bytes));
          activeDiskFault = { heldRequest: route.request() }; stamp('fault-ownership-entered');
          await fs.rename(stateFilename, backup); moved = true; stamp('committed-state-renamed-to-owned-sibling');
          await fs.mkdir(stateFilename); directory = true; stamp('empty-directory-installed-at-owned-state-file');
          response = await route.fetch({ timeout: 15000 }); body = await response.body();
          assert.equal(response.status(), 400); assert(body.length <= 2048);
          const parsed = JSON.parse(body); assert.equal(typeof parsed.error, 'string'); assert(/^(EISDIR|EPERM|EACCES): /.test(parsed.error));
          row.actualStatus = response.status(); row.actualError = parsed.error; row.actualBody = metadata(body); stamp('unchanged-host-returned-real-filesystem400');
          expectedHttpFailures.push({ path: '/api/notes/list', status: 400, errorMessage: parsed.error, observed: false });
        } catch(error) { entered.reject(error); throw error; }
        finally {
          try {
            if (directory) { const item = await fs.lstat(stateFilename); assert(item.isDirectory() && !item.isSymbolicLink()); assert.deepEqual(await fs.readdir(stateFilename), []); assert.equal(stateFilename, ownership('notes/records/notes-state-v2.json')); await fs.rmdir(stateFilename); stamp('owned-empty-directory-removed-without-recursion'); }
            if (moved) { assert((await fs.readFile(backup)).equals(original.bytes)); await fs.rename(backup, stateFilename); stamp('original-state-restored'); assert((await fs.readFile(stateFilename)).equals(original.bytes)); row.restoredState = metadata(await fs.readFile(stateFilename)); assert.deepEqual(row.restoredState, row.originalCommittedState); stamp('restored-exact-original-bytes-verified'); }
            activeDiskFault = null; row.restoreCompletedBeforeResponseDelivery = moved && directory; assert(row.restoreCompletedBeforeResponseDelivery);
          } catch(error) { errors.push({ type: 'owned-fault-restore-failure', message: error.message }); entered.reject(error); finished.resolve(); throw error; }
        }
        try {
          entered.resolve({ noteId: row.noteId, revision: row.committedRevision, error: row.actualError, originalState: row.originalCommittedState });
          await released.promise; stamp('actual-response-release-requested');
          assert.deepEqual((await disk()).identity, row.originalCommittedState);
          await route.fulfill({ response }); stamp('unchanged-actual400-delivered-after-restoration');
        } finally { finished.resolve(); }
      });
      return gate;
    }

    async function settle() { await bounded(drain(), 5000, 'Owned Notes requests did not drain'); await bounded(Promise.all([...responseTasks]), 5000, 'Response observer deadline'); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve()))); }
    const s = { page, url: instance.url, api, disk, hold, listFault, settle, requests, responses, observations, faults,
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
      await step('release-held-routes', async () => { assert.equal(activeDiskFault, null, 'Owned I/O fault must be restored before fixture release'); for (const gate of holds) gate.release(); await bounded(Promise.all(holds.filter(gate => gate.used()).map(gate => gate.finished)), 5000, 'Held route cleanup deadline'); teardown.heldRoutesFinished = true; });
      await step('screenshot', async () => { await fs.mkdir(path.join(evidence, 'screenshots'), { recursive: true }); await page.screenshot({ path: path.join(evidence, 'screenshots', info.testId + '.png'), fullPage: false }); teardown.screenshotSaved = true; });
      await step('drain-owned-page-requests', async () => { await bounded(drain(), 5000, 'Owned request cleanup deadline'); await bounded(Promise.all([...responseTasks]), 5000, 'Response observer cleanup deadline'); teardown.drained = true; });
      await step('capture-synthetic-final-record', async () => { try { const current = await disk(); await fs.mkdir(path.join(evidence, 'notes-records'), { recursive: true }); const relative = 'notes-records/' + info.testId + '.json'; await fs.writeFile(path.join(evidence, relative), current.bytes, { flag: 'wx' }); observations.push({ kind: 'owned-synthetic-disk-record', path: relative, ...current.identity }); } catch (error) { if (error.code !== 'ENOENT') throw error; observations.push({ kind: 'owned-note-record-absent' }); } });
      await step('close-owned-context', async () => { await bounded(page.context().close(), 5000, 'Owned context close deadline'); teardown.contextClosed = true; assert.equal(pending.size, 0); });
      await step('close-owned-server', async () => { await bounded(instance.close(), 5000, 'Owned server close deadline'); teardown.serverClosed = true; });
      teardown.pendingOwnedRequests = pending.size; teardown.activeOwnedIOFault = activeDiskFault !== null; teardown.stage = failures.length ? 'failed' : 'completed';
      const expectedConsole = consoleErrors.filter(item => expectedHttpFailures.some(row => row.observed && item.location.url === instance.url + row.path && /400/.test(item.message)));
      errors.push(...consoleErrors.filter(item => !expectedConsole.includes(item)));
      if (expectedConsole.length > expectedHttpFailures.length) errors.push({ type: 'extra-expected-path-console-errors', count: expectedConsole.length });
      const savedEvents = new Set(savedDownloads.map(row => row.download));
      if (downloads.some(row => !savedEvents.has(row.download))) errors.push({ type: 'unclaimed-download', count: downloads.length - savedDownloads.length });
      await write('case-' + info.testId + '.json', { schema: 'rea-notes-new-todo-real-browser-case/v1', testId: info.testId, title: info.title, statusAtFixtureClose: info.status, retry: info.retry,
        url: instance.url, ownedDataDirectory: dataDir, serverCloseObserved: teardown.serverClosed, realBrowser: true, actualHTTP: true, originalProductExecutions: 0, originalFullApplicationExecutions: 0, originalHelperExecutions: 0, programmaticDisabledControlProbes: 0,
        teardown, observations, requests, responses, faults, expectedHttpFailures, expectedConsole, auxiliaryErrors, errors, downloads: savedDownloads.map(({ download, ...row }) => row) });
      expect(errors).toEqual([]); expect(expectedHttpFailures.every(row => row.observed)).toBe(true);
      if (failures.length) throw new AggregateError(failures, 'Notes owned fixture cleanup failed');
      expect(teardown.drained && teardown.contextClosed && teardown.serverClosed && teardown.heldRoutesFinished && !teardown.activeOwnedIOFault).toBe(true);
    }
  }
});

test.beforeAll(async ({ browser }) => {
  expect(browser.version()).toBe('156.0.8078.4');
  const observation = { schema: 'rea-cloud-real-browser-observation/v1', browser: 'chromium', channel: 'chromium', version: browser.version(), realBrowserFixtureCreated: true, retries: 0 };
  const execution = Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY', 'GITHUB_JOB'].map(name => [name, process.env[name] ?? null]));
  await write('browser-observation-process-' + process.pid + '.json', { schema: 'rea-cloud-notes-new-todo-browser-worker-observation/v1', observation, execution, pid: process.pid, sourcePins: sourcePins.map(([path, bytes, sha256]) => ({ path, bytes, sha256 })) });
  try { await write('browser-observation.json', observation); } catch (error) { if (error.code !== 'EEXIST') throw error; assert.deepEqual(JSON.parse(await fs.readFile(path.join(evidence, 'browser-observation.json'), 'utf8')), observation); }
});
async function openNotes(s) { await s.page.goto(s.url + '/#notes'); await expect(view(s.page).getByRole('heading', { name: 'Local Notes', exact: true })).toBeVisible(); await expect(status(s.page)).toHaveText('Notes are saved locally when you choose Save.'); }
async function successfulAction(s, action, trigger) { const response = s.page.waitForResponse(r => r.url() === s.url + '/api/notes/' + action && r.request().method() === 'POST'); await trigger(); const actual = await response; expect(actual.status()).toBe(200); return (await actual.json()).result; }
async function save(s) { const note = await successfulAction(s, 'save', () => button(s.page, 'Save note').click()); await expect(status(s.page)).toHaveText('Saved revision ' + note.revision + '.'); return note; }
async function createNote(s, title, body = 'Saved synthetic body', tags = 'study') { await button(s.page, 'New note').click(); await field(s.page, 'Note title').fill(title); await field(s.page, 'Markdown note').fill(body); await field(s.page, 'Note tags').fill(tags); return save(s); }
const diskNote = async (s, id) => { const value = await s.disk(); assert(value.state.notes[id]); return value.state.notes[id]; };
const saves = s => s.requests.filter(row => row.path === '/api/notes/save');
async function newTaskDraft(s, title, body = 'Synthetic new-task body', tags = 'study') {
  await button(s.page, 'New to-do').click(); await expect(status(s.page)).toHaveText('New to-do draft. Save to create it.');
  await field(s.page, 'Note title').fill(title); await field(s.page, 'Markdown note').fill(body); await field(s.page, 'Note tags').fill(tags);
}
async function confirmedNew(s, name) { const dialog = s.page.waitForEvent('dialog'); const click = button(s.page, name).click(); const native = await dialog; expect(native.message()).toBe('Discard this unsaved draft?'); await native.accept(); await click; }
function openTask(note) { expect(note.revision).toBe(1); expect(note.history).toEqual([]); expect(note.todo).toEqual({ isTodo: true, due: 0, completed: 0 }); }

test('New To-do ordinary unsaved draft sends no save and genuine empty-title400 retains fields before explicit retry', async ({ studio: s }) => {
  await openNotes(s); const firstSave = await createNote(s, 'Unrelated saved baseline');
  // Establish an explicitly saved canonical revision before the no-change
  // boundary. This is a real ordinary Save, not a dropped metadata assertion.
  const baseline = await save(s); expect(baseline.id).toBe(firstSave.id); expect(baseline.revision).toBe(2); expect(baseline.metadataEdited).toBe(true); expect(baseline.history).toHaveLength(1);
  const before = await s.disk(), count = saves(s).length; expect(before.state.notes[baseline.id]).toEqual(baseline);
  await newTaskDraft(s, '', 'Keep this body after validation', 'study, draft'); await s.settle();
  expect(saves(s)).toHaveLength(count); expect((await s.disk()).bytes.equals(before.bytes)).toBe(true); await expect(button(s.page, 'Convert to note')).toBeDisabled();
  s.expectHttpFailure('save', 'Give the note a title.'); const rejected = s.page.waitForResponse(r => r.url() === s.url + '/api/notes/save'); await button(s.page, 'Save note').click(); expect((await rejected).status()).toBe(400);
  await expect(status(s.page)).toHaveText('Give the note a title.'); await expect(button(s.page, 'Save note')).toBeEnabled(); await expect(field(s.page, 'Markdown note')).toHaveValue('Keep this body after validation'); expect((await s.disk()).bytes.equals(before.bytes)).toBe(true);
  await field(s.page, 'Note title').fill('Explicitly retried new task'); const note = await save(s); openTask(note); expect(note.body).toBe('Keep this body after validation'); expect(note.tags).toEqual(['study','draft']);
  expect(JSON.parse(saves(s).at(-1).postData).newTodo).toBe(true); expect((await diskNote(s, baseline.id))).toEqual(before.state.notes[baseline.id]);
  s.observations.push({ kind: 'new-task-unsaved-validation-and-explicit-retry', ordinaryDraftMutationRequests: 0, actualEmptyTitleStatus: 400, failedState: before.identity, noteId: note.id, firstRevision: note.revision, initialHistoryLength: note.history.length, explicitNewTodo: true, canonicalBaselineRevision: baseline.revision, canonicalBaselineMetadataEdited: baseline.metadataEdited, unrelatedRawNoteBefore: metadata(Buffer.from(JSON.stringify(before.state.notes[baseline.id]))), unrelatedRawNoteAfter: metadata(Buffer.from(JSON.stringify(await diskNote(s, baseline.id)))) });
});

test('New To-do native discard cancellation retains draft fields and accepted New note resets creation type', async ({ studio: s }) => {
  await openNotes(s); await newTaskDraft(s, 'Retain cancelled task', 'Native dialog retained body', 'keep');
  const event = s.page.waitForEvent('dialog'), click = button(s.page, 'New note').click(), dialog = await event; expect(dialog.message()).toBe('Discard this unsaved draft?'); await dialog.dismiss(); await click;
  await expect(field(s.page, 'Note title')).toHaveValue('Retain cancelled task'); await expect(field(s.page, 'Markdown note')).toHaveValue('Native dialog retained body'); await expect(field(s.page, 'Note tags')).toHaveValue('keep'); expect(saves(s)).toHaveLength(0);
  await confirmedNew(s, 'New to-do'); await expect(field(s.page, 'Note title')).toHaveValue(''); await expect(status(s.page)).toHaveText('New to-do draft. Save to create it.');
  await field(s.page, 'Note title').fill('Draft to discard'); await confirmedNew(s, 'New note'); await expect(status(s.page)).toHaveText('New note draft.'); await field(s.page, 'Note title').fill('Accepted ordinary new note'); const note = await save(s);
  expect(note.todo?.isTodo ?? false).toBe(false); expect(JSON.parse(saves(s).at(-1).postData)).not.toHaveProperty('newTodo');
  s.observations.push({ kind: 'native-discard-cancel-and-new-note-kind-reset', nativeDialogs: 3, cancellationRetainedAllFields: true, noteId: note.id, savedAsTask: false });
});

test('New To-do real committed Save response blocks native duplicate clicks and retains newer ordinary typing at returned revision', async ({ studio: s }) => {
  await openNotes(s); await newTaskDraft(s, 'Held newly created task'); const gate = await s.hold('save', input => input.newTodo === true);
  await button(s.page, 'Save note').click(); const committed = await bounded(gate.entered, 15000, 'Actual first task save not held'); openTask(committed); expect((await diskNote(s, committed.id)).revision).toBe(1);
  await expect(button(s.page, 'Save note')).toBeDisabled(); const bounds = await button(s.page, 'Save note').boundingBox(); assert(bounds); await s.page.mouse.dblclick(bounds.x+bounds.width/2, bounds.y+bounds.height/2); expect(saves(s)).toHaveLength(1);
  await expect(field(s.page, 'Markdown note')).toBeEnabled(); await field(s.page, 'Markdown note').fill('Newer body typed after actual first commit'); gate.release(); await gate.finished;
  await expect(status(s.page)).toHaveText('Saved revision 1. Your newer draft is retained.'); await expect(field(s.page, 'Markdown note')).toHaveValue('Newer body typed after actual first commit');
  const saved = await save(s), input = JSON.parse(saves(s).at(-1).postData); expect(input.id).toBe(committed.id); expect(input.revision).toBe(1); expect(input).not.toHaveProperty('newTodo'); expect(saved.revision).toBe(2); expect(saved.history).toHaveLength(1); expect(saved.todo).toEqual(committed.todo); expect((await diskNote(s, saved.id)).body).toBe(saved.body);
  s.observations.push({ kind: 'new-task-commit-held-native-duplicate-and-newer-draft', noteId: saved.id, committedRevision: 1, nativeDuplicatePointerClicks: 2, firstSaveRequests: 1, nextSubmittedRevision: input.revision, finalRevision: saved.revision, ordinaryEnabledFieldTyping: true, programmaticDisabledControlProbe: false });
});

test('New To-do new editor owns a separate unsaved task while older actual creation response is held after commit', async ({ studio: s }) => {
  await openNotes(s); await newTaskDraft(s, 'Old held creation'); const gate = await s.hold('save', input => input.newTodo === true); await button(s.page, 'Save note').click(); const committed = await bounded(gate.entered,15000,'Owned newer task gate'); openTask(committed);
  await confirmedNew(s, 'New to-do'); await field(s.page,'Note title').fill('Independent newer task'); await field(s.page,'Markdown note').fill('New editor owns this body'); gate.release(); await gate.finished; await s.settle();
  await expect(status(s.page)).toHaveText('Unsaved draft. Save to keep this note.'); await expect(field(s.page,'Note title')).toHaveValue('Independent newer task'); const note=await save(s); openTask(note); expect(note.id).not.toBe(committed.id); expect((await diskNote(s,committed.id)).title).toBe('Old held creation');
  s.observations.push({kind:'new-task-editor-ownership-after-actual-commit',oldId:committed.id,newId:note.id,oldRevision:1,newRevision:1});
});

test('New To-do actual navigation disposal suppresses all late Notes publication and reads after held first commit', async ({ studio:s }) => {
  await openNotes(s); await newTaskDraft(s,'Disposed task creation'); const old=await field(s.page,'Markdown note').elementHandle(),gate=await s.hold('save',input=>input.newTodo===true); await button(s.page,'Save note').click(); const committed=await bounded(gate.entered,15000,'Disposal first-save gate'); openTask(committed);
  await s.page.getByRole('button',{name:'Lab Flow',exact:true}).click(); await expect(s.page.getByRole('heading',{name:'Native Node-RED flows',exact:true})).toBeVisible(); expect(await old.evaluate(node=>node.isConnected)).toBe(false); const before=s.requests.length; gate.release(); await gate.finished; await s.settle(); expect(s.requests).toHaveLength(before); await expect(s.page.getByRole('heading',{name:'Local Notes',exact:true})).toHaveCount(0); expect((await diskNote(s,committed.id)).revision).toBe(1);
  s.observations.push({kind:'new-task-disposal-after-actual-first-commit',noteId:committed.id,committedRevision:1,lateNotesRequests:0,detachedControlObserved:true,detachedControlScrubbingClaimed:false});
});

test('New To-do newer typing survives a held genuine post-commit list400 after exact owned filesystem restoration', async ({ studio:s }) => {
  await openNotes(s); await newTaskDraft(s,'Held genuine refresh failure'); await s.settle(); const gate=await s.listFault('Held genuine refresh failure',true); await button(s.page,'Save note').click(); const actual=await bounded(gate.entered,20000,'Owned genuine list400 gate'); expect((await diskNote(s,actual.noteId)).revision).toBe(1);
  await field(s.page,'Markdown note').fill('Newer draft while genuine list400 is held'); await expect(status(s.page)).toHaveText('Unsaved draft. Save to keep this note.'); gate.release(); await gate.finished; await s.settle();
  await expect(status(s.page)).toHaveText('Unsaved draft. Save to keep this note.'); await expect(field(s.page,'Markdown note')).toHaveValue('Newer draft while genuine list400 is held'); await expect(button(s.page,'Save note')).toBeEnabled(); const note=await save(s),input=JSON.parse(saves(s).at(-1).postData); expect(input.id).toBe(actual.noteId); expect(input.revision).toBe(1); expect(note.revision).toBe(2); expect(note.todo).toEqual({isTodo:true,due:0,completed:0});
  s.observations.push({kind:'new-task-postcommit-genuine-list400-newer-draft',noteId:actual.noteId,actualHTTPStatus:400,syntheticOwnedFilesystemFault:true,responseMocked:false,restoredBeforeHeldDelivery:true,nextSubmittedRevision:1,finalRevision:2,ordinaryEnabledFieldTyping:true});
});

test('New To-do committed save distinguishes genuine list400 from persistence failure and explicit refresh preserves state', async ({ studio:s }) => {
  await openNotes(s); await newTaskDraft(s,'Reported genuine refresh failure'); await s.settle(); const fault=await s.listFault('Reported genuine refresh failure',false); await button(s.page,'Save note').click(); const actual=await bounded(fault.entered,20000,'Unheld genuine list400'); await fault.finished; await s.settle();
  await expect(status(s.page)).toHaveText('Saved revision 1. Could not refresh the note list: '+actual.error); const before=await s.disk(); expect(before.state.notes[actual.noteId].revision).toBe(1); await expect(button(s.page,'Save note')).toBeEnabled();
  const list=s.page.waitForResponse(r=>r.url()===s.url+'/api/notes/list'); await button(s.page,'Search').click(); expect((await list).status()).toBe(200); await s.settle(); await expect(savedRow(s.page,'Reported genuine refresh failure')).toHaveCount(1); expect((await s.disk()).bytes.equals(before.bytes)).toBe(true); expect(saves(s)).toHaveLength(1);
  s.observations.push({kind:'new-task-committed-save-refresh-failure-explicit-recovery',noteId:actual.noteId,committedRevision:1,actualHTTPStatus:400,syntheticOwnedFilesystemFault:true,responseMocked:false,restoredBeforeDelivery:true,explicitRefreshStatus:200,stateBefore:before.identity,stateAfter:(await s.disk()).identity});
});

function nativeTar(archive, entry = null) {
  const executable=path.join(process.env.SystemRoot,'System32/tar.exe'),args=entry===null?['-tf',archive]:['-xOf',archive,entry]; const result=spawnSync(executable,args,{shell:false,windowsHide:true,timeout:10000,maxBuffer:1024*1024}); assert.equal(result.error,undefined); assert.equal(result.status,0,result.stderr.toString('utf8')); return result.stdout;
}
function rawRecord(bytes) { const lines=bytes.toString('utf8').split('\n');if(lines.at(-1)==='')lines.pop();let boundary=lines.length-1;while(boundary>=0&&lines[boundary]!=='')boundary--;assert(boundary>=0);const properties=Object.fromEntries(lines.slice(boundary+1).map(line=>{const m=/^([a-z][a-z0-9_]*): (.*)$/.exec(line);assert(m);return[m[1],m[2]];}));return{title:lines[0],body:lines.slice(2,boundary).join('\n'),properties}; }
test('New To-do actual JEX and resource downloads preserve all seven prior records and binary alongside new task metadata',async({studio:s},info)=>{
  await openNotes(s); await field(s.page,'Import Markdown, REA notes JSON or Joplin JEX').setInputFiles({name:'pinned-study.jex',mimeType:'application/x-tar',buffer:fixtureBytes}); await expect(status(s.page)).toHaveText('Imported 2 notes, 2 notebooks and 1 attachments with original IDs.');
  await newTaskDraft(s,'New task alongside original records','Preserved new task body',''); await field(s.page,'Notebook').selectOption('1'.repeat(32)); const note=await save(s); openTask(note); expect(note.notebookId).toBe('1'.repeat(32));
  const archive=await s.saveDownload(()=>button(s.page,'Export Joplin JEX').click(),'new-task-notes.jex','rea-notes.jex'); await expect(status(s.page)).toHaveText('Exported 3 notes and 1 attachments as JEX. Saved-version history is not included.'); const listing=nativeTar(archive.destination); await fs.writeFile(path.join(evidence,'notes-native-tar-list-'+info.testId+'.txt'),listing,{flag:'wx'}); expect(listing.toString('utf8').trim().split(/\r?\n/)).toHaveLength(9);
  for(const[id,expected]of Object.entries(fixtureProvenance.expected))expect(metadata(nativeTar(archive.destination,id+'.md')).sha256).toBe(expected.rawSha256); expect(Object.keys(fixtureProvenance.expected)).toHaveLength(7);
  const added=rawRecord(nativeTar(archive.destination,note.id.replaceAll('-','')+'.md')); expect(added.body).toBe(note.body); expect(added.properties.is_todo).toBe('1'); expect(added.properties.todo_due).toBe('0'); expect(added.properties.todo_completed).toBe('0'); expect(added.properties.parent_id).toBe('1'.repeat(32)); expect(added.title).toBe(note.title);
  const resource=nativeTar(archive.destination,'resources/'+'5'.repeat(32)+'.bin'); expect(resource.equals(Buffer.from([0,1,127,128,255]))).toBe(true); expect(metadata(resource).sha256).toBe(fixtureProvenance.resourceSha256);
  const imported=await s.api('get',{id:'3'.repeat(32)}); const opened=s.page.waitForResponse(r=>r.url()===s.url+'/api/notes/get'); await savedRow(s.page,imported.title).click(); expect((await opened).status()).toBe(200); await expect(status(s.page)).toHaveText('Opened revision '+imported.revision+'.'); const binary=await s.saveDownload(()=>button(s.page,'Download sample.bin (5 bytes)').click(),'resource-sample.bin','sample.bin'); expect(binary.bytes.equals(resource)).toBe(true);
  s.observations.push({kind:'new-task-actual-jex-native-tar-and-resource-download',noteId:note.id,parentId:note.notebookId,initialTaskState:note.todo,independentNativeTar:{executable:metadata(await fs.readFile(path.join(process.env.SystemRoot,'System32/tar.exe'))),listing:metadata(listing),archive:metadata(archive.bytes),resource:metadata(resource),unchangedRawRecordComparisons:7},newOriginalProductExecutions:0,resourceDownload:metadata(binary.bytes)});
});
