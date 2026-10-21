// Real Chromium / exact admitted ZIP AES feature source. Archive has no download UI.
// Owned filesystem observers preserve actual UI-created archives/restored bytes.
// No original 7-Zip binary is acquired or executed. Request bodies/headers and
// traces are not retained. Only freshly generated synthetic passwords are used.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { test as base, expect } from '@playwright/test';
assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
assert.equal(process.env.CI, 'true'); assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
const { start } = await import('../server.mjs');
const evidence = await fs.realpath(process.env.REA_BROWSER_EVIDENCE);
const dataRoot = await fs.realpath(process.env.REA_BROWSER_DATA_ROOT);
const metadata = bytes => ({ bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
const write = (name, value) => fs.writeFile(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
async function bounded(promise, milliseconds, label) { let timer; try { return await Promise.race([promise, new Promise((_, reject) => timer = setTimeout(() => reject(new Error(label)), milliseconds))]); } finally { clearTimeout(timer); } }
const sampleName = 'astral-😀-é-e\u0301.txt', sampleText = 'Owned Archive browser content\nUnicode 😀 é e\u0301\nSecond line\n';
const rootView = page => page.locator('#app-root > div');
const privateFields = page => page.locator('#app-root input[type="password"]');
const operationOutcome = (page,label) => rootView(page).locator('[data-archive-operation="'+label+'"]');
const extractionResult = page => rootView(page).locator('[data-archive-result="extract"]');
async function absent(filename) { try { await fs.lstat(filename); return false; } catch (error) { if (error.code === 'ENOENT') return true; throw error; } }
const test = base.extend({
  studio: async ({ page }, use, info) => {
    const dataDir = await fs.mkdtemp(path.join(dataRoot, 'archive-case-'));
    const instance = await start({ port: 0, dataDir });
    const workspace = await fs.realpath(path.join(dataDir, 'archive', 'workspace'));
    const observations = [], requests = [], faults = [], errors = [], held = [], auxiliaryErrors = [], expectedErrors = new Set(), downloads = [];
    page.on('download', item => { downloads.push({ suggestedFilename: item.suggestedFilename() }); errors.push({ type: 'unexpected-download', message: 'Archive has no product download UI' }); });
    page.on('pageerror', error => errors.push({ type: 'pageerror', message: error.message }));
    page.on('console', message => {
      if (message.type() !== 'error') return;
      const value = { type: 'console', message: message.text(), location: message.location() };
      if (value.location.url === instance.url + '/favicon.ico' && /404/.test(value.message)) auxiliaryErrors.push(value);
      else if (expectedErrors.has(value.location.url) && /400/.test(value.message)) auxiliaryErrors.push({ ...value, expectedRefusal: true });
      else errors.push(value);
    });
    page.on('requestfailed', request => { if (request.url().startsWith(instance.url + '/')) errors.push({ type: 'requestfailed', path: new URL(request.url()).pathname, failure: request.failure() }); });
    page.on('request', request => {
      if (!request.url().startsWith(instance.url + '/api/')) return;
      assert(requests.length < 200, 'Finite request limit exceeded');
      // Deliberately do not retain postData, token headers, passwords or raw bodies.
      let input = {}; if (request.method() === 'POST') input = request.postDataJSON();
      requests.push({ method: request.method(), path: new URL(request.url()).pathname, keys: Object.keys(input).sort(), passwordSupplied: Object.hasOwn(input, 'password') });
    });
    async function hold(action) {
      const entered = deferred(), released = deferred(), finished = deferred(); let used = false;
      await page.route(instance.url + '/api/archive/' + action, async route => {
        if (used) return route.continue(); used = true;
        try {
          const response = await route.fetch({ timeout: 20000 }), body = await response.body();
          assert(response.ok(), 'Timing gate requires an actual successful unchanged host response');
          faults.push({ kind: 'delay-after-actual-host-response', action, status: response.status(), body: metadata(body), handlerMocked: false, operationAlreadyCommitted: true });
          entered.resolve(JSON.parse(body).result); await released.promise; await route.fulfill({ response });
        } catch (error) { entered.reject(error); throw error; } finally { finished.resolve(); }
      });
      const gate = { entered: entered.promise, release: released.resolve, finished: finished.promise, used: () => used }; held.push(gate); return gate;
    }
    async function preserveArchive(relative, label) {
      assert(/^[a-z0-9-]+\.(zip|7z)$/.test(label));
      const filename = path.join(workspace, ...relative.split('/')), stat = await fs.lstat(filename), real = await fs.realpath(filename);
      assert(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 256 * 1024);
      assert(real.toLowerCase().startsWith(workspace.toLowerCase() + path.sep));
      const bytes = await fs.readFile(real), target = path.join(evidence, 'workspace-artifacts', label);
      assert.equal(bytes.subarray(0, label.endsWith('.zip') ? 4 : 6).toString('hex'), label.endsWith('.zip') ? '504b0304' : '377abcaf271c');
      await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, bytes, { flag: 'wx' });
      const preserved = await fs.readFile(target); assert(preserved.equals(bytes));
      observations.push({ kind: 'real-ui-created-workspace-archive', path: 'workspace-artifacts/' + label, expected: metadata(bytes), observed: metadata(preserved), productDownloadUIAbsent: true, actualDownloads: 0, observer: 'Owned fixture filesystem read and exact portable copy, not a browser download' });
    }
    const s = { page, url: instance.url, token: instance.token, workspace, observations, requests, faults, hold, preserveArchive, expectedErrors };
    try { await use(s); }
    finally {
      let serverCloseObserved = false;
      try {
        for (const gate of held) gate.release();
        await bounded(Promise.all(held.filter(gate => gate.used()).map(gate => gate.finished)), 5000, 'Held actual response cleanup deadline exceeded');
        await privateFields(page).evaluateAll(nodes => nodes.forEach(node => { node.value = ''; }));
        await fs.mkdir(path.join(evidence, 'screenshots'), { recursive: true });
        await page.screenshot({ path: path.join(evidence, 'screenshots', info.testId + '.png'), fullPage: false });
      } finally {
        try { await bounded(instance.close(), 5000, 'Owned Studio close deadline exceeded'); serverCloseObserved = true; }
        finally {
          await write('case-' + info.testId + '.json', { schema: 'rea-cloud-browser-archive-case-observation/v1', testId: info.testId, title: info.title, statusAtFixtureClose: info.status, retry: info.retry, url: instance.url, ownedDataDirectory: dataDir, serverCloseObserved, realBrowser: true, actualHTTP: true, originalProductExecutions: 0, productDownloadUIAbsent: true, actualDownloads: downloads.length, observations, requests, faults, expectedAuxiliaryResourceErrors: auxiliaryErrors, errors });
        }
      }
      expect(errors, 'No unexpected real browser errors').toEqual([]);
    }
  },
});
test.beforeAll(async ({ browser }) => {
  expect(browser.version()).toBe('156.0.8078.4');
  const observation = { schema: 'rea-cloud-real-browser-observation/v1', browser: 'chromium', channel: 'chromium', version: browser.version(), realBrowserFixtureCreated: true, retries: 0 };
  const execution = Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY'].map(name => [name, process.env[name] ?? null]));
  // A failed test can replace the worker even with retries=0. Keep every
  // process observation; a later worker must not overwrite the first one.
  await write('browser-observation-process-' + process.pid + '-zip-aes.json', { schema: 'rea-cloud-archive-browser-worker-observation/v1', sourceFile: 'archive-zip-aes.spec.mjs', observation, execution, pid: process.pid });
  try { await write('browser-observation.json', observation); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(evidence, 'browser-observation.json'), 'utf8')), observation, 'A replacement worker must observe the same pinned browser');
  }
});
async function open(s) { await s.page.goto(s.url + '/#archive'); await expect(s.page.getByRole('heading', { name: 'REA Archive', exact: true })).toBeVisible(); }
async function done(s) { await expect(rootView(s.page)).toHaveAttribute('aria-busy', 'false'); await expect(rootView(s.page).locator(':scope > p.status')).toHaveText('Done.'); }
async function source(s) {
  await s.page.getByLabel('Workspace file path', { exact: true }).fill('archive/source/' + sampleName);
  await s.page.getByLabel('Text content', { exact: true }).fill(sampleText);
  await s.page.getByRole('button', { name: 'Create file', exact: true }).click(); await done(s);
}
async function configure(s, { encrypted = true, headers = false, output = 'archive/browser.7z', password } = {}) {
  await s.page.getByRole('combobox', { name: 'Archive format', exact: true }).selectOption(encrypted ? 'sevenzip' : 'zip');
  await s.page.getByLabel('New archive path', { exact: true }).fill(output);
  if (encrypted) {
    await s.page.getByLabel('Encrypt 7Z contents with AES-256', { exact: true }).check();
    await s.page.getByLabel('7Z creation password (1–128 UTF16 units)', { exact: true }).fill(password);
    if (headers) await s.page.getByLabel('Encrypt 7Z names and header metadata', { exact: true }).check();
  }
}
async function readPassword(s, password) {
  await s.page.getByLabel('Use an archive password', { exact: true }).check();
  await s.page.getByLabel('Inspection/extraction password', { exact: true }).fill(password);
}
async function create(s) { await s.page.getByRole('button', { name: 'Create archive', exact: true }).click(); await done(s); await expect.poll(() => privateFields(s.page).evaluateAll(nodes => nodes.map(node => node.value.length))).toEqual([0, 0, 0]); }
async function extract(s, destination, password) {
  if (password) await readPassword(s, password);
  await s.page.getByLabel('New destination folder', { exact: true }).fill(destination);
  await s.page.getByLabel('Confirm extraction', { exact: true }).check();
  await s.page.getByRole('button', { name: 'Verify and extract', exact: true }).click(); await done(s);
  const bytes = await fs.readFile(path.join(s.workspace, destination, sampleName)); assert.deepEqual(metadata(bytes), metadata(Buffer.from(sampleText)));
  const artifact = 'workspace-artifacts/' + destination.split('/').at(-1) + '.txt';
  await fs.mkdir(path.join(evidence, 'workspace-artifacts'), { recursive: true }); await fs.writeFile(path.join(evidence, artifact), bytes, { flag: 'wx' });
  s.observations.push({ kind: 'real-ui-extraction-content', path: destination + '/' + sampleName, artifact, expected: metadata(Buffer.from(sampleText)), observed: metadata(bytes) });
  await expect.poll(() => privateFields(s.page).evaluateAll(nodes => nodes.map(node => node.value.length))).toEqual([0, 0, 0]);
}
async function configureZip(s,password,compression='deflate',output='archive/aes.zip') {
  await s.page.getByRole('combobox',{name:'Archive format',exact:true}).selectOption('zip');
  await s.page.getByRole('combobox',{name:'Compression',exact:true}).selectOption(compression);
  await s.page.getByLabel('New archive path',{exact:true}).fill(output);
  await s.page.getByLabel('Encrypt ZIP contents with AES-256',{exact:true}).check();
  await s.page.getByLabel('ZIP creation password (1–99 ASCII characters)',{exact:true}).fill(password);
  await expect(s.page.getByLabel('Use ZIP64 layout',{exact:true})).toBeDisabled();
  await expect(s.page.getByText('Encrypted ZIP protects file contents; names and archive comments remain visible.',{exact:false})).toBeVisible();
}
for(const compression of ['store','deflate']) test('Archive AES ZIP '+compression+' UI creation, reload, verification and extraction retain Unicode bytes',async({studio:s})=>{
  const password=randomBytes(18).toString('hex');await open(s);await source(s);await configureZip(s,password,compression,'archive/'+compression+'.zip');await create(s);
  await s.preserveArchive('archive/'+compression+'.zip','archive-zip-aes-'+compression+'.zip');
  const bytes=await fs.readFile(path.join(s.workspace,'archive',compression+'.zip'));
  expect(bytes.includes(Buffer.from(sampleText))).toBe(false);expect(bytes.includes(Buffer.from(sampleName))).toBe(true);
  await s.page.reload();await expect(s.page.getByRole('heading',{name:'REA Archive',exact:true})).toBeVisible();
  await s.page.getByLabel('Archive path',{exact:true}).fill('archive/'+compression+'.zip');await readPassword(s,password);
  await s.page.getByRole('button',{name:'List and verify every entry',exact:true}).click();await done(s);
  await expect(s.page.getByRole('cell',{name:sampleName,exact:true})).toBeVisible();await expect(s.page.getByRole('cell',{name:'AES-256',exact:true})).toBeVisible();
  await expect(s.page.getByText(/Encrypted ZIP verifies its content authentication code and any recorded content CRC/)).toBeVisible();
  const requestsBeforeContext=s.requests.length;
  await s.page.getByLabel('Archive path',{exact:true}).fill('archive/not-inspected-'+compression+'.zip');
  await expect(s.page.getByRole('cell',{name:sampleName,exact:true})).toHaveCount(0);
  await expect(operationOutcome(s.page,'List and verify every entry')).toHaveText('');
  expect(s.requests.length).toBe(requestsBeforeContext);
  await s.page.getByLabel('Archive path',{exact:true}).fill('archive/'+compression+'.zip');await readPassword(s,password);
  await s.page.getByRole('button',{name:'List and verify every entry',exact:true}).click();await done(s);
  await expect(s.page.getByRole('cell',{name:sampleName,exact:true})).toBeVisible();
  s.observations.push({kind:'archive-context-invalidates-prior-inspection',compression,oldListingAbsent:true,contextChangeRequests:0,freshInspectionPassed:true});
  await extract(s,'archive/zip-'+compression+'-restored',password);
  s.observations.push({kind:'aes-zip-ui-roundtrip',compression,reloadObserved:true,hostRestartClaimed:false,contentBytesExact:true,namesVisible:true,passwordFieldsCleared:3,archive:metadata(bytes)});
});

test('Archive AES ZIP wrong password and corrupted authentication refuse extraction before destination creation',async({studio:s})=>{
  const password=randomBytes(18).toString('hex');await open(s);await source(s);await configureZip(s,password);await create(s);
  for(const action of ['list','extract']){
    s.expectedErrors.add(s.url+'/api/archive/'+action);await readPassword(s,'incorrect-owned-ZIP-password');
    if(action==='extract'){await s.page.getByLabel('New destination folder',{exact:true}).fill('archive/zip-wrong-refused');await s.page.getByLabel('Confirm extraction',{exact:true}).check();}
    const pending=s.page.waitForResponse(r=>r.url()===s.url+'/api/archive/'+action&&r.request().method()==='POST');await s.page.getByRole('button',{name:action==='list'?'List and verify every entry':'Verify and extract',exact:true}).click();
    const response=await pending;expect(response.status()).toBe(400);await expect(rootView(s.page)).toHaveAttribute('aria-busy','false');await expect(rootView(s.page).locator(':scope > p.status')).not.toHaveText('Done.');
    await expect.poll(()=>privateFields(s.page).evaluateAll(nodes=>nodes.map(node=>node.value.length))).toEqual([0,0,0]);
    const localOutcome=operationOutcome(s.page,action==='list'?'List and verify every entry':'Verify and extract');
    await expect(localOutcome).toHaveClass('status error');await expect(localOutcome).toContainText(/password|authentication/i);
    if(action==='list')await expect(s.page.getByRole('cell',{name:sampleName,exact:true})).toHaveCount(0);
    else await expect(extractionResult(s.page)).toHaveText('');
    s.observations.push({kind:'operation-local-current-refusal',action,status:response.status(),inlineErrorVisible:true,oldOperationOutputAbsent:true});
    s.observations.push({kind:'aes-zip-wrong-password-refusal',action,status:response.status(),body:metadata(await response.body()),passwordRetained:false});
  }
  expect(await absent(path.join(s.workspace,'archive/zip-wrong-refused'))).toBe(true);
  await extract(s,'archive/zip-correct-after-refusal',password);
  await expect(extractionResult(s.page)).toContainText('archive/zip-correct-after-refusal');
  const location=path.join(s.workspace,'archive/aes.zip'),before=await fs.readFile(location),corrupted=Buffer.from(before);
  assert.equal(corrupted.readUInt32LE(0),0x04034b50);const size=corrupted.readUInt32LE(18),dataAt=30+corrupted.readUInt16LE(26)+corrupted.readUInt16LE(28);assert(size>=28&&dataAt+size<=corrupted.length);
  corrupted[dataAt+size-1]^=1;await fs.writeFile(location,corrupted);assert((await fs.readFile(location)).equals(corrupted));
  await s.preserveArchive('archive/aes.zip','archive-zip-aes-corrupted-tag.zip');
  await readPassword(s,password);await s.page.getByLabel('New destination folder',{exact:true}).fill('archive/zip-corrupt-refused');
  await expect(extractionResult(s.page)).toHaveText('');await expect(operationOutcome(s.page,'Verify and extract')).toHaveText('');
  const pending=s.page.waitForResponse(r=>r.url()===s.url+'/api/archive/extract'&&r.request().method()==='POST');await s.page.getByRole('button',{name:'Verify and extract',exact:true}).click();const response=await pending;
  expect(response.status()).toBe(400);await expect(rootView(s.page)).toHaveAttribute('aria-busy','false');await expect(rootView(s.page).locator(':scope > p.status')).not.toHaveText('Done.');
  expect(await absent(path.join(s.workspace,'archive/zip-corrupt-refused'))).toBe(true);expect((await fs.readdir(path.join(s.workspace,'archive'))).some(n=>n.includes('.partial-'))).toBe(false);
  await expect.poll(()=>privateFields(s.page).evaluateAll(nodes=>nodes.map(node=>node.value.length))).toEqual([0,0,0]);
  await expect(extractionResult(s.page)).toHaveText('');await expect(operationOutcome(s.page,'Verify and extract')).toHaveClass('status error');
  await expect(operationOutcome(s.page,'Verify and extract')).toContainText(/password|authentication/i);
  s.observations.push({kind:'success-then-tag-refusal-current-operation-output',priorSuccessDestination:'archive/zip-correct-after-refusal',currentDestination:'archive/zip-corrupt-refused',previousSuccessCleared:true,inlineErrorVisible:true,status:response.status(),noDestination:true});
  s.observations.push({kind:'aes-zip-tag-mutation-refusal',mutation:'one byte of actual last authentication code; owned fixture only',before:metadata(before),after:metadata(corrupted),status:response.status(),noDestination:true});
});

test('Archive AES ZIP held actual creation response blocks duplicate operations and clears all private fields',async({studio:s})=>{
  const password=randomBytes(18).toString('hex');await open(s);await source(s);await configureZip(s,password);
  const gate=await s.hold('create');await s.page.getByRole('button',{name:'Create archive',exact:true}).click();await gate.entered;
  await expect(rootView(s.page)).toHaveAttribute('aria-busy','true');expect(await rootView(s.page).locator('button,input,select,textarea').evaluateAll(nodes=>nodes.every(node=>node.disabled))).toBe(true);
  expect(s.requests.filter(r=>r.path==='/api/archive/create')).toHaveLength(1);gate.release();await gate.finished;await done(s);
  await expect.poll(()=>privateFields(s.page).evaluateAll(nodes=>nodes.map(node=>node.value.length))).toEqual([0,0,0]);
  expect(s.requests.filter(r=>r.path==='/api/archive/create')).toHaveLength(1);await extract(s,'archive/zip-held-restored',password);
  s.observations.push({kind:'aes-zip-held-response',actualOperationCommitted:true,duplicateRequests:0,passwordFieldsCleared:3});
});

test('Archive AES ZIP disposal clears detached passwords after actual committed extraction',async({studio:s})=>{
  const password=randomBytes(18).toString('hex');await open(s);await source(s);await configureZip(s,password);await create(s);await readPassword(s,password);
  await s.page.getByLabel('New destination folder',{exact:true}).fill('archive/zip-disposed-restored');await s.page.getByLabel('Confirm extraction',{exact:true}).check();
  const detached=await privateFields(s.page).elementHandles();expect(detached).toHaveLength(3);const gate=await s.hold('extract');
  await s.page.getByRole('button',{name:'Verify and extract',exact:true}).click();await gate.entered;
  const committed=await fs.readFile(path.join(s.workspace,'archive/zip-disposed-restored',sampleName));assert(committed.equals(Buffer.from(sampleText)));
  await s.page.getByRole('button',{name:'Lab Editor',exact:true}).click();await expect(s.page.getByRole('heading',{name:'Workspace Editor',exact:true})).toBeVisible();
  for(const field of detached)expect(await field.evaluate(n=>({units:n.value.length,connected:n.isConnected}))).toEqual({units:0,connected:false});
  gate.release();await gate.finished;await expect(s.page.getByRole('heading',{name:'REA Archive',exact:true})).toHaveCount(0);
  s.observations.push({kind:'aes-zip-disposal-after-real-extraction',content:metadata(committed),detachedPasswordUnits:[0,0,0],destinationPreserved:true,serverCancellationClaimed:false,staleArchiveUIAbsent:true});
});
