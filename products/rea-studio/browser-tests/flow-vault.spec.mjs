// Finite real-browser acceptance only. All data is synthetic. The timing gates
// fetch the actual unchanged host response and delay publication without
// replacing its status, headers or body. No original product is invoked.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { test as base, expect } from '@playwright/test';
assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
assert.equal(process.env.CI, 'true'); assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
const { start } = await import('../server.mjs');
const { exportKdbx } = await import('../apps/vault/kdbx.mjs');
const { fixture: groupFixture, ids } = await import('../apps/vault/group-fixture.mjs');
const evidence = await fs.realpath(process.env.REA_BROWSER_EVIDENCE);
const dataRoot = await fs.realpath(process.env.REA_BROWSER_DATA_ROOT);
const metadata = bytes => ({ bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
const write = async (name, value) => fs.writeFile(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
async function bounded(promise, milliseconds, label) { let timer; try { return await Promise.race([promise, new Promise((_, reject) => timer = setTimeout(() => reject(new Error(label)), milliseconds))]); } finally { clearTimeout(timer); } }
const password = 'Owned synthetic browser group master 2026';
const test = base.extend({
  studio: async ({ page }, use, info) => {
    const dataDir = await fs.mkdtemp(path.join(dataRoot, 'case-'));
    const instance = await start({ port: 0, dataDir });
    const observations = [], requests = [], faults = [], held = [], expectedAuxiliaryResourceErrors = [];
    const errors = [];
    // Track requests owned by this page and loopback instance. Failed requests
    // remain unexpected errors; draining does not turn an aborted request into success.
    const pendingOwnedRequests = new Set(), drainWaiters = new Set();
    const requestCounts = { started: 0, finished: 0, failed: 0 };
    const ownsRequest = request => request.url().startsWith(instance.url + '/');
    function settleOwnedRequest(request, kind) {
      if (!ownsRequest(request)) return;
      pendingOwnedRequests.delete(request); requestCounts[kind]++;
      if (pendingOwnedRequests.size === 0) for (const resolve of drainWaiters) resolve();
    }
    async function drainOwnedRequests() {
      if (pendingOwnedRequests.size === 0) return;
      let resolve;
      const drained = new Promise(done => { resolve = done; drainWaiters.add(done); });
      try { if (pendingOwnedRequests.size === 0) resolve(); await drained; }
      finally { drainWaiters.delete(resolve); }
    }
    page.on('request', request => { if (ownsRequest(request)) { pendingOwnedRequests.add(request); requestCounts.started++; } });
    page.on('requestfinished', request => settleOwnedRequest(request, 'finished'));
    page.on('pageerror', error => errors.push({ type: 'pageerror', message: error.message }));
    page.on('console', message => {
      if (message.type() !== 'error') return;
      // The unchanged host has no favicon endpoint. Preserve this explicit
      // auxiliary404 observation; application/API/other resource errors fail.
      const value = { type: 'console', message: message.text(), location: message.location() };
      if (value.location.url === instance.url + '/favicon.ico' && /404/.test(value.message)) expectedAuxiliaryResourceErrors.push(value);
      else errors.push(value);
    });
    page.on('requestfailed', request => { settleOwnedRequest(request, 'failed'); if (request.url().startsWith(instance.url + '/')) errors.push({ type: 'requestfailed', path: new URL(request.url()).pathname, failure: request.failure() }); });
    page.on('request', request => {
      if (!request.url().startsWith(instance.url + '/api/')) return;
      assert(requests.length < 1000, 'Finite browser request bound exceeded');
      requests.push({ method: request.method(), path: new URL(request.url()).pathname, postData: request.postData() });
    });
    async function api(app, action, input = {}) {
      const response = await page.request.post(instance.url + '/api/' + app + '/' + action, { headers: { 'X-REA-Token': instance.token }, data: input });
      assert(response.ok(), 'Owned fixture/observation API failed: ' + action + ':' + response.status());
      return (await response.json()).result;
    }
    async function hold(app, action, predicate = () => true) {
      const entered = deferred(), released = deferred(), finished = deferred(); let used = false;
      const pattern = instance.url + '/api/' + app + '/' + action;
      const handler = async route => {
        if (used || !predicate(route.request().postDataJSON())) return route.continue();
        used = true;
        try {
          const response = await route.fetch({ timeout: 15000 });
          const body = await response.body();
          assert(response.ok(), 'Timing gate must observe an actual successful host response');
          const value = JSON.parse(body).result;
          faults.push({ kind: 'delay-after-actual-host-response', app, action, status: response.status(), body: metadata(body), handlerMocked: false });
          entered.resolve(value);
          await released.promise; await route.fulfill({ response });
        } catch (error) { entered.reject(error); throw error; } finally { finished.resolve(); }
      };
      await page.route(pattern, handler);
      const gate = { entered: entered.promise, release: released.resolve, finished: finished.promise, used: () => used };
      held.push(gate); return gate;
    }
    const studio = { page, url: instance.url, api, hold, requests, observations, faults };
    try { await use(studio); }
    finally {
      const teardown = { stage: 'starting', drained: false, contextClosed: false, serverClosed: false, heldRoutesFinished: false, screenshotSaved: false, steps: [], requestCounts };
      const cleanupFailures = [];
      async function step(name, operation) {
        teardown.stage = name;
        const row = { stage: name, status: 'running', startedAtUtc: new Date().toISOString() }; teardown.steps.push(row);
        try { await operation(); row.status = 'passed'; }
        catch (error) { row.status = 'failed'; row.failure = { name: error.name, message: error.message }; cleanupFailures.push(error); }
        finally { row.completedAtUtc = new Date().toISOString(); }
      }
      await step('release-held-routes', async () => {
        for (const gate of held) gate.release();
        await bounded(Promise.all(held.filter(gate => gate.used()).map(gate => gate.finished)), 5000, 'Held actual response cleanup deadline exceeded');
        teardown.heldRoutesFinished = true;
      });
      await step('screenshot', async () => {
        await fs.mkdir(path.join(evidence, 'screenshots'), { recursive: true });
        await page.screenshot({ path: path.join(evidence, 'screenshots', info.testId + '.png'), fullPage: false }); teardown.screenshotSaved = true;
      });
      await step('drain-owned-page-requests', async () => {
        await bounded(drainOwnedRequests(), 5000, 'Owned page requests did not drain before context close'); teardown.drained = true;
      });
      // This test owns this context and its associated API request pool. Close
      // them before asking the unchanged loopback host to close its connections.
      // Each drain/close step retains its5s deadline; failures are recorded and still fail.
      await step('close-owned-context', async () => {
        await bounded(page.context().close(), 5000, 'Owned browser context close deadline exceeded'); teardown.contextClosed = true;
        assert.equal(pendingOwnedRequests.size, 0, 'Owned request tracker must be empty after context close');
      });
      await step('close-owned-server', async () => {
        await bounded(instance.close(), 5000, 'Owned server close deadline exceeded'); teardown.serverClosed = true;
      });
      teardown.pendingOwnedRequests = pendingOwnedRequests.size; teardown.stage = cleanupFailures.length ? 'failed' : 'completed';
      await write('case-' + info.testId + '.json', { schema: 'rea-cloud-browser-case-observation/v1', testId: info.testId, title: info.title, statusAtFixtureClose: info.status, retry: info.retry,
        url: instance.url, ownedDataDirectory: dataDir, serverCloseObserved: teardown.serverClosed, teardown, realBrowser: true, actualHTTP: true, originalProductExecutions: 0, observations, requests, faults, expectedAuxiliaryResourceErrors, errors });
      expect(errors, 'No unexpected real browser errors').toEqual([]);
      if (cleanupFailures.length) throw new AggregateError(cleanupFailures, 'Owned browser fixture cleanup failed');
      expect(teardown.drained && teardown.contextClosed && teardown.serverClosed).toBe(true);
    }
  },
});
test.beforeAll(async ({ browser }) => {
  expect(browser.version()).toBe('156.0.8078.4');
  const observation = { schema: 'rea-cloud-real-browser-observation/v1', browser: 'chromium', channel: 'chromium', version: browser.version(), realBrowserFixtureCreated: true, retries: 0 };
  const execution = Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY'].map(name => [name, process.env[name] ?? null]));
  await write('browser-observation-process-' + process.pid + '.json', { schema: 'rea-cloud-flow-vault-browser-worker-observation/v1', observation, execution, pid: process.pid });
  try { await write('browser-observation.json', observation); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(evidence, 'browser-observation.json'), 'utf8')), observation, 'A replacement worker must observe the same pinned browser');
  }
});
const flowScene = () => ({ rev: 'opaque browser revision', vendor: { preserved: ['yes', 7], unicode: 'before\u2028after 😀 e\u0301 é' }, flows: [
  { id: 'tab', type: 'tab', label: 'Owned browser fixture' },
  { id: 'start', type: 'inject', z: 'tab', props: [], wires: [['out']], x: 100, y: 100 },
  { id: 'out', type: 'link out', z: 'tab', links: [], wires: [['ignored']], x: 300, y: 100, custom: 'retained' },
  { id: 'in', type: 'link in', z: 'tab', links: ['out'], wires: [['debug']], x: 550, y: 100 },
  { id: 'debug', type: 'debug', z: 'tab', complete: 'true', active: true, tosidebar: true, wires: [], x: 800, y: 100 },
  { id: 'ignored', type: 'debug', z: 'tab', complete: 'true', active: true, tosidebar: true, wires: [], x: 800, y: 230 },
] });
const normalized = raw => raw.replace(/\r\n?/g, '\n');
const rawScene = ending => JSON.stringify(flowScene(), null, 3).replace(/\n/g, ending) + ending;
const native = page => page.locator('section').filter({ has: page.getByRole('heading', { name: 'Native Node-RED flows', exact: true }) }).first();
async function openFlow(s, raw = rawScene('\n')) {
  await s.page.goto(s.url + '/#flow');
  await expect(s.page.getByRole('heading', { name: 'Native Node-RED flows', exact: true })).toBeVisible();
  await s.page.getByText('Native JSON document', { exact: true }).click();
  await s.page.getByLabel('Import Node-RED flow file', { exact: true }).setInputFiles({ name: 'owned-native.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
  await expect(native(s.page).getByRole('status')).toContainText('Native UTF-8 JSON imported');
  await expect(s.page.getByLabel('Native Node-RED flow JSON', { exact: true })).toHaveValue(normalized(raw));
  return s.page.getByLabel('Native Node-RED flow JSON', { exact: true });
}
async function saveFlow(s) {
  const response = s.page.waitForResponse(r => r.url() === s.url + '/api/flow/native-save' && r.request().method() === 'POST');
  await s.page.getByRole('button', { name: 'Save native draft', exact: true }).click();
  const value = (await (await response).json()).result;
  await expect(native(s.page).getByRole('status')).toContainText('Native draft saved');
  return value.flow;
}
async function downloadFlow(s, expected, label) {
  const pending = s.page.waitForEvent('download');
  await s.page.getByRole('button', { name: 'Export Node-RED JSON', exact: true }).click();
  const download = await pending;
  assert.equal(await download.failure(), null);
  const destination = path.join(evidence, 'downloads', label + '.json'); await fs.mkdir(path.dirname(destination), { recursive: true });
  await download.saveAs(destination); const bytes = await fs.readFile(destination);
  expect(bytes.equals(Buffer.from(expected))).toBe(true);
  s.observations.push({ kind: 'real-browser-file-download', path: 'downloads/' + label + '.json', expected: metadata(Buffer.from(expected)), observed: metadata(bytes), suggestedFilename: download.suggestedFilename() });
}
async function programmaticDisabledDraft(s, field, value) {
  await expect(field).toBeDisabled();
  await field.evaluate((node, changed) => { if (!node.disabled) throw new Error('Expected the real disabled native control'); node.value = changed; node.dispatchEvent(new Event('input', { bubbles: true })); }, value);
  s.observations.push({ kind: 'adversarial-programmatic-disabled-control-bypass', ordinaryUserTyping: false, actualBrowserDOM: true, value: metadata(Buffer.from(value)) });
}
for (const [name, ending] of [['CRLF', '\r\n'], ['bareCR', '\r'], ['LF', '\n']]) test('Flow ' + name + ' import save deploy and actual download preserve raw UTF-8 bytes', async ({ studio: s }) => {
  const raw = rawScene(ending); await openFlow(s, raw); const saved = await saveFlow(s);
  await s.page.getByRole('button', { name: 'Deploy native flow', exact: true }).click();
  await expect(native(s.page).getByRole('status')).toContainText('Native flow deployed');
  expect((await s.api('flow', 'native-export', { id: saved.id })).text).toBe(raw);
  await downloadFlow(s, raw, 'flow-' + name);
  await s.page.reload(); await s.page.getByLabel('Saved native flows', { exact: true }).selectOption(saved.id);
  await expect(native(s.page).getByRole('status')).toContainText('Native flow loaded');
  expect((await s.api('flow', 'native-export', { id: saved.id })).text).toBe(raw);
});
test('Flow dirty native text blocks deployment before transport', async ({ studio: s }) => {
  const field = await openFlow(s); await saveFlow(s);
  const changed = '\n' + normalized(rawScene('\n')); await field.fill(changed);
  const before = s.requests.filter(r => r.path === '/api/flow/native-deploy').length;
  await s.page.getByRole('button', { name: 'Deploy native flow', exact: true }).click();
  await expect(native(s.page).getByRole('status')).toContainText('Save the edited draft');
  expect(await field.inputValue()).toBe(changed);
  expect(s.requests.filter(r => r.path === '/api/flow/native-deploy').length).toBe(before);
});
test('Flow committed Save retains an adversarial programmatic newer draft', async ({ studio: s }) => {
  const field = await openFlow(s), raw = rawScene('\n'), gate = await s.hold('flow', 'native-save');
  await s.page.getByRole('button', { name: 'Save native draft', exact: true }).click();
  const committed = await gate.entered;
  const changed = JSON.stringify({ ...flowScene(), newer: 'retained after real commit' }, null, 2); await programmaticDisabledDraft(s, field, changed);
  gate.release(); await gate.finished;
  await expect(native(s.page).getByRole('status')).toContainText('newer draft input remains');
  expect(await field.inputValue()).toBe(changed);
  expect((await s.api('flow', 'native-export', { id: committed.flow.id })).text).toBe(raw);
  expect(s.requests.filter(r => r.path === '/api/flow/native-save')).toHaveLength(1);
});
test('Flow held export validation refuses an adversarial programmatic draft download', async ({ studio: s }) => {
  const field = await openFlow(s), gate = await s.hold('flow', 'native-validate'), downloads = [];
  s.page.on('download', download => downloads.push(download.suggestedFilename()));
  await s.page.getByRole('button', { name: 'Export Node-RED JSON', exact: true }).click(); await gate.entered;
  const changed = JSON.stringify({ ...flowScene(), newer: 'unvalidated draft' }); await programmaticDisabledDraft(s, field, changed);
  gate.release(); await gate.finished; await expect(native(s.page).getByRole('status')).toContainText('Draft changed during export');
  expect(await field.inputValue()).toBe(changed); expect(downloads).toEqual([]);
});
test('Flow disposal scrubs detached native controls during actual validation', async ({ studio: s }) => {
  const field = await openFlow(s), detached = await field.elementHandle(), gate = await s.hold('flow', 'native-validate');
  await s.page.getByRole('button', { name: 'Validate native flow', exact: true }).click(); await gate.entered;
  await s.page.getByRole('button', { name: 'Lab Vault', exact: true }).click();
  await expect(s.page.getByRole('heading', { name: 'REA Vault', exact: true })).toBeVisible();
  expect(await detached.evaluate(node => ({ value: node.value, connected: node.isConnected }))).toEqual({ value: '', connected: false });
  gate.release(); await gate.finished;
  await expect(s.page.getByRole('heading', { name: 'Native Node-RED flows', exact: true })).toHaveCount(0);
});
test('Flow static links and actual SVG drag preserve native metadata', async ({ studio: s }) => {
  const field = await openFlow(s);
  const svg = s.page.getByRole('img', { name: 'Native flow nodes and connections', exact: true });
  await expect(svg.locator('path[stroke-dasharray="6 4"]')).toHaveCount(1);
  await expect(svg.getByLabel('Static link out to in', { exact: true })).toHaveCount(1);
  await expect(svg.locator('path')).toHaveCount(3);
  const node = s.page.getByRole('button', { name: 'Edit native node out', exact: true }); await node.scrollIntoViewIfNeeded();
  const bounds = await node.boundingBox(), svgBounds = await svg.boundingBox(); assert(bounds && svgBounds);
  await s.page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); await s.page.mouse.down();
  await s.page.mouse.move(bounds.x + bounds.width / 2 + 40, bounds.y + bounds.height / 2 + 20, { steps: 5 }); await s.page.mouse.up();
  const dragged = JSON.parse(await field.inputValue()).flows.find(n => n.id === 'out');
  expect(dragged.x).toBe(Math.round(300 + 40 * 1100 / svgBounds.width)); expect(dragged.y).toBe(Math.round(100 + 20 * 1100 / svgBounds.width)); expect(dragged.custom).toBe('retained');
  await s.page.getByRole('button', { name: 'Disconnect static link', exact: true }).click();
  await expect(native(s.page).getByRole('status')).toContainText('Static link removed');
  expect(JSON.parse(await field.inputValue()).flows.find(n => n.id === 'out').links).toEqual([]);
  await s.page.getByRole('button', { name: 'Connect static link', exact: true }).click();
  await expect(native(s.page).getByRole('status')).toContainText('Static link connected');
  const final = JSON.parse(await field.inputValue()); expect(final.vendor).toEqual(flowScene().vendor);
  expect(final.flows.find(n => n.id === 'out').links).toEqual(['in']); expect(final.flows.find(n => n.id === 'in').links).toEqual(['out']);
  s.observations.push({ kind: 'real-svg-pointer-drag', svgBounds, requestedCSSPixels: { x: 40, y: 20 }, resultingNativeNode: dragged });
});
async function openVault(s) {
  await s.page.goto(s.url + '/#vault'); await expect(s.page.getByRole('heading', { name: 'Create your vault', exact: true })).toBeVisible();
  const bytes = await exportKdbx(groupFixture(), { password }, { kdf: 'aes', aesRounds: 100, compression: false });
  await s.page.getByLabel('KeePass database file', { exact: true }).setInputFiles({ name: 'owned-browser-fixture.kdbx', mimeType: 'application/octet-stream', buffer: bytes });
  await s.page.getByLabel('KeePass database password', { exact: true }).fill(password);
  await s.page.getByLabel('Local vault master password (at least 10 characters)', { exact: true }).fill(password);
  await s.page.getByLabel('Confirm replacement of the existing local vault', { exact: true }).check();
  await s.page.getByRole('button', { name: 'Import KDBX database', exact: true }).click();
  await expect(s.page.getByRole('heading', { name: 'Unlocked', exact: true })).toBeVisible();
  s.observations.push({ kind: 'synthetic-current-candidate-kdbx-fixture', generatedByCurrentCandidate: true, originalProductExecutions: 0, uploaded: metadata(bytes) }); bytes.fill(0);
  await s.page.getByRole('button', { name: 'Show groups', exact: true }).click();
}
const groupRow = (page, name) => page.locator('section').filter({ has: page.locator('strong').filter({ hasText: new RegExp('^' + name + '$') }) }).filter({ has: page.getByRole('button', { name: 'Preview group descendants', exact: true }) }).last();
async function editGroup(s, create = false) {
  await groupRow(s.page, 'Selected').getByRole('button', { name: create ? 'New child group' : 'Edit group details', exact: true }).click();
  await expect(s.page.getByLabel('Group name', { exact: true })).toBeVisible();
  await s.page.getByLabel('Group name', { exact: true }).fill(create ? 'Browser submitted child' : 'Browser submitted rename');
  await s.page.getByLabel('Group notes', { exact: true }).fill('Browser submitted notes');
}
async function details(s, id) {
  const rows = (await s.api('vault', 'recycleGroupList', { bin: false })).groups, item = rows.find(g => g.id === id); assert(item);
  return (await s.api('vault', 'recycleGroupRead', { id, revision: item.recycleRevision })).group;
}
for (const create of [true, false]) test(create ? 'Vault committed Create final list retains newer draft and saves one new group' : 'Vault committed Save final list retains newer group draft', async ({ studio: s }) => {
  await openVault(s); await editGroup(s, create);
  const gate = await s.hold('vault', 'recycleGroupList', input => input.bin === false), action = create ? 'groupCreate' : 'groupSave';
  await s.page.getByRole('button', { name: create ? 'Create group' : 'Save group details', exact: true }).click();
  const committedRows = await gate.entered, committed = committedRows.groups.find(g => create ? g.name === 'Browser submitted child' : g.id === ids.target); assert(committed);
  await expect(s.page.getByRole('button', { name: create ? 'Create group' : 'Save group details', exact: true })).toBeDisabled();
  await s.page.getByLabel('Group name', { exact: true }).fill('Browser retained newer group'); await s.page.getByLabel('Group notes', { exact: true }).fill('Browser retained newer notes');
  expect((await details(s, committed.id)).name).toBe(create ? 'Browser submitted child' : 'Browser submitted rename');
  gate.release(); await gate.finished;
  await expect(s.page.getByText('Submitted group values saved. Your newer group draft is retained.', { exact: true })).toBeVisible();
  await expect(s.page.getByLabel('Group name', { exact: true })).toHaveValue('Browser retained newer group');
  await s.page.getByRole('button', { name: 'Save group details', exact: true }).click();
  await expect(s.page.getByLabel('Group name', { exact: true })).toHaveCount(0);
  const current = await details(s, committed.id); expect(current.name).toBe('Browser retained newer group'); expect(current.notes).toBe('Browser retained newer notes');
  expect(s.requests.filter(r => r.path === '/api/vault/groupCreate')).toHaveLength(create ? 1 : 0);
  expect(s.requests.filter(r => r.path === '/api/vault/groupSave')).toHaveLength(create ? 1 : 2);
  s.observations.push({ kind: 'real-http-committed-final-list-draft', action, id: committed.id, final: current });
});
test('Vault dirty entry and group drafts block conflicting UI actions', async ({ studio: s }) => {
  await openVault(s); await editGroup(s, true);
  await s.page.getByLabel('Title', { exact: true }).fill('Unsaved browser entry');
  await s.page.getByRole('button', { name: 'Create group', exact: true }).click();
  await expect(s.page.getByText('Close the entry editor and save or discard its draft before changing a group.', { exact: true })).toBeVisible();
  expect(s.requests.filter(r => r.path === '/api/vault/groupCreate')).toHaveLength(0);
  await s.page.getByRole('button', { name: 'New entry', exact: true }).click();
  await s.page.getByRole('button', { name: 'Close group panel', exact: true }).click();
  await expect(s.page.getByText('Confirm discarding your unsaved group draft before closing this panel.', { exact: true })).toBeVisible();
  await expect(s.page.getByLabel('Group name', { exact: true })).toHaveValue('Browser submitted child');
  await s.page.getByLabel('Confirm discarding unsaved group draft', { exact: true }).check();
  await s.page.getByRole('button', { name: 'Close group panel', exact: true }).click(); await expect(s.page.getByLabel('Group name', { exact: true })).toHaveCount(0);
});
test('Vault disposal scrubs detached group controls after committed Create', async ({ studio: s }) => {
  await openVault(s); await editGroup(s, true);
  const name = await s.page.getByLabel('Group name', { exact: true }).elementHandle(), notes = await s.page.getByLabel('Group notes', { exact: true }).elementHandle();
  const gate = await s.hold('vault', 'recycleGroupList', input => input.bin === false);
  await s.page.getByRole('button', { name: 'Create group', exact: true }).click(); const committedRows = await gate.entered;
  const child = committedRows.groups.find(g => g.name === 'Browser submitted child'); assert(child);
  await s.page.getByRole('button', { name: 'Lab Flow', exact: true }).click();
  await expect(s.page.getByRole('heading', { name: 'Native Node-RED flows', exact: true })).toBeVisible();
  for (const field of [name, notes]) expect(await field.evaluate(node => ({ value: node.value, connected: node.isConnected }))).toEqual({ value: '', connected: false });
  gate.release(); await gate.finished;
  expect(s.requests.filter(r => r.path === '/api/vault/groupCreate')).toHaveLength(1);
  expect((await details(s, child.id)).name).toBe('Browser submitted child');
  await expect(s.page.getByRole('heading', { name: 'REA Vault', exact: true })).toHaveCount(0);
});
