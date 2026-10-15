// Hosted-only finite real-browser collector. No local install/run fallback.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
assert.equal(process.env.CI, 'true'); assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
assert.equal(process.env.GITHUB_REPOSITORY, 'Ginderlax/rea-research-lab');
for (const name of ['GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'RUNNER_TEMP', 'PLAYWRIGHT_BROWSERS_PATH']) assert(process.env[name]);
const args = process.argv.slice(2);
assert.equal(args.length, 4); assert.equal(args[0], '--phase'); assert(['acquire', 'verify'].includes(args[1]));
assert.equal(args[2], '--evidence'); assert(path.isAbsolute(args[3]));
const phase = args[1], studio = fileURLToPath(new URL('../', import.meta.url)), repository = path.resolve(studio, '../..');
const tools = path.join(studio, 'browser-tests'), temporary = fs.realpathSync(process.env.RUNNER_TEMP);
const sourceLimits = { files: 2000, fileBytes: 8 * 1024 * 1024, totalBytes: 64 * 1024 * 1024, depth: 128 };
const within = (parent, target) => { const relative = path.relative(parent, target); return relative && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep); };
assert(within(temporary, path.resolve(args[3])), 'Evidence must be an owned RUNNER_TEMP child');
fs.mkdirSync(args[3], { recursive: true });
const evidence = fs.realpathSync(args[3]); assert(within(temporary, evidence));
const cache = path.resolve(process.env.PLAYWRIGHT_BROWSERS_PATH); assert(within(temporary, cache));
fs.mkdirSync(cache, { recursive: true }); assert.equal(fs.realpathSync(cache).toLowerCase(), cache.toLowerCase());
const execution = Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY'].map(name => [name, process.env[name] ?? null]));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = bytes => ({ bytes: bytes.length, sha256: digest(bytes) });
const readJson = filename => { const item = fs.lstatSync(filename); assert(item.isFile() && !item.isSymbolicLink() && item.size <= 8 * 1024 * 1024, 'Invalid bounded JSON evidence'); return JSON.parse(fs.readFileSync(filename)); };
const saveNew = (filename, value) => fs.writeFileSync(path.join(evidence, filename), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const recordName = phase === 'acquire' ? 'browser-tooling-acquisition.json' : 'browser-attempt.json';
const record = { schema: phase === 'acquire' ? 'rea-cloud-browser-tooling-acquisition/v1' : 'rea-cloud-browser-attempt/v1', status: 'running', phase, startedAtUtc: new Date().toISOString(), execution,
  scope: 'Twelve explicit current Flow/Vault real Chromium normalization, download, draft, static-link and disposal scenarios. Real loopback host, synthetic data and separately disclosed network timing holds. No Archive overlay, original product, browser matrix, full-suite, parity, security or superiority acceptance.',
  retries: 0, workers: 1, sourceCaptureLimits: sourceLimits, originalProductExecutions: 0, applicationSourcesChanged: null, historicalReceiptsRebound: false, testsByteOverlay: false, children: [], failure: null };
function save(initial = false) {
  const target = path.join(evidence, recordName), next = initial ? target : target + '.tmp';
  const fd = fs.openSync(next, 'wx');
  try { fs.writeFileSync(fd, JSON.stringify(record, null, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  if (!initial) fs.renameSync(next, target);
}
const outFd = fs.openSync(path.join(evidence, 'browser-' + phase + '-stdout.txt'), 'wx');
const errFd = fs.openSync(path.join(evidence, 'browser-' + phase + '-stderr.txt'), 'wx');
const eventsFd = fs.openSync(path.join(evidence, 'browser-' + phase + '-events.jsonl'), 'wx');
let child = null, interrupted = null, retained = { stdout: 0, stderr: 0 }, sequence = 0, stopActive = null;
const consoleError = () => {};
for (const stream of [process.stdout, process.stderr]) stream.on('error', consoleError);
function event(type, details = {}) { fs.writeFileSync(eventsFd, JSON.stringify({ sequence: ++sequence, at: new Date().toISOString(), type, ...details }) + '\n'); for (const fd of [outFd, errFd, eventsFd]) fs.fsyncSync(fd); }
function killOwnedChild() { if (child?.pid && child.exitCode === null) { const kill = spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, timeout: 10000, stdio: 'ignore' }); if (kill.status !== 0) child.kill('SIGKILL'); } }
const signalHandlers = new Map(['SIGINT', 'SIGTERM', 'SIGBREAK'].map(signal => [signal, () => { interrupted = signal; event('interrupted', { signal, ownedPid: child?.pid ?? null }); if (stopActive) stopActive('received ' + signal); else killOwnedChild(); }]));
for (const [signal, handler] of signalHandlers) process.on(signal, handler);
function git(arguments_) { const r = spawnSync('git', arguments_, { cwd: repository, shell: false, windowsHide: true, encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024 }); assert.equal(r.error, undefined); assert.equal(r.status, 0); return r.stdout; }
function sameAttempt(value) { assert.deepEqual(value.execution, execution, 'Evidence belongs to another hosted attempt'); }
async function fileIdentity(filename) {
  const item = fs.lstatSync(filename); assert(item.isFile() && !item.isSymbolicLink());
  const hash = createHash('sha256'); let bytes = 0;
  for await (const chunk of fs.createReadStream(filename)) { bytes += chunk.length; hash.update(chunk); }
  assert.equal(bytes, item.size); return { bytes, sha256: hash.digest('hex') };
}
function sourceBytes(filename) {
  const item = fs.lstatSync(filename); assert(item.isFile() && !item.isSymbolicLink() && item.size <= sourceLimits.fileBytes, 'Source file type/size exceeds capture policy');
  const bytes = fs.readFileSync(filename); assert.equal(bytes.length, item.size); return bytes;
}
function sourceRow(filename, budget) {
  assert(++budget.files <= sourceLimits.files, 'Source file count exceeds capture policy');
  const item = fs.lstatSync(filename); assert(item.isFile() && !item.isSymbolicLink() && item.size <= sourceLimits.fileBytes);
  budget.bytes += item.size; assert(budget.bytes <= sourceLimits.totalBytes, 'Total source bytes exceed capture policy');
  return { path: path.relative(studio, filename).replaceAll('\\', '/'), ...identity(sourceBytes(filename)) };
}
function collect(directory, budget, depth = 0) {
  assert(depth <= sourceLimits.depth, 'Source directory depth exceeds capture policy');
  const directoryItem = fs.lstatSync(directory); assert(directoryItem.isDirectory() && !directoryItem.isSymbolicLink());
  const rows = [];
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', '.local', 'results'].includes(item.name)) continue;
    assert(!item.isSymbolicLink(), 'Browser source capture refuses links');
    const filename = path.join(directory, item.name);
    if (item.isDirectory()) rows.push(...collect(filename, budget, depth + 1));
    else if (item.isFile() && /\.(mjs|json|html|css|ps1)$/.test(item.name)) rows.push(sourceRow(filename, budget));
  }
  return rows;
}
function census() {
  const budget = { files: 0, bytes: 0 };
  return [...['apps', 'lib', 'public', 'browser-tests'].flatMap(name => collect(path.join(studio, name), budget)), ...['server.mjs', 'catalog.mjs', 'scripts/verify-cloud-browser.mjs'].map(name => sourceRow(path.join(studio, name), budget))].sort((a, b) => a.path.localeCompare(b.path));
}
async function run(arguments_, timeoutMs, label) {
  assert(!interrupted, 'Interrupted before ' + label);
  const result = { label, arguments: arguments_, timeoutMs, startedAtUtc: new Date().toISOString(), childStarted: false, closeObserved: false, stopReason: null };
  record.children.push(result); save();
  const code = await new Promise(resolve => {
    let settled = false, timeout, forced, heartbeat;
    function finish(exitCode, signal, closeObserved) {
      if (settled) return; settled = true; stopActive = null; clearTimeout(timeout); clearTimeout(forced); clearInterval(heartbeat);
      Object.assign(result, { exitCode, signal, closeObserved, completedAtUtc: new Date().toISOString() }); resolve(exitCode);
    }
    function stop(reason) {
      if (result.stopReason) return; result.stopReason = reason; event('stop-requested', { reason, ownedPid: child?.pid ?? null }); killOwnedChild();
      forced = setTimeout(() => { child.stdout.destroy(); child.stderr.destroy(); finish(null, null, false); }, 5000);
    }
    stopActive = stop;
    child = spawn(process.execPath, arguments_, { cwd: tools, env: { ...process.env, REA_BROWSER_EVIDENCE: evidence }, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    result.childStarted = Boolean(child.pid); result.pid = child.pid ?? null; save(); event('child-started', { label, pid: result.pid });
    for (const [name, stream, fd, consoleStream, cap] of [['stdout', child.stdout, outFd, process.stdout, 4 * 1024 * 1024], ['stderr', child.stderr, errFd, process.stderr, 1024 * 1024]]) {
      stream.on('data', bytes => { if (settled) return; try { const take = Math.min(bytes.length, Math.max(0, cap - retained[name])); if (take) { fs.writeFileSync(fd, bytes.subarray(0, take)); retained[name] += take; consoleStream.write(bytes.subarray(0, take)); } if (take < bytes.length) stop(name + ' retained-output cap exceeded'); } catch (error) { stop(name + ' retention error:' + error.message); } });
      stream.on('error', error => { if (!settled) stop(name + ' stream error:' + error.message); });
    }
    child.on('error', error => { result.spawnError = { name: error.name, code: error.code ?? null, message: error.message }; });
    child.on('close', (exitCode, signal) => finish(exitCode, signal, true));
    timeout = setTimeout(() => stop('owned child deadline exceeded'), timeoutMs);
    heartbeat = setInterval(() => event('progress', { label, pid: result.pid, retained }), 10000);
  });
  save(); event('child-closed', result); child = null;
  assert(!interrupted, 'Interrupted: ' + interrupted); assert(result.closeObserved && !result.stopReason && !result.spawnError && !result.signal && code === 0, 'Hosted ' + label + ' failed or did not close cleanly');
}
const pinnedPackages = {
  '@playwright/test': { integrity: 'sha512-IaYGml/nSOiZWROfPtuIL7neuu9qDOZ3TNvNljUIrhDMxiGTgPjzj/g9p9RxpS2tSepPDRY+UwAaEeiKtUvIAg==', resolved: 'https://registry.npmjs.org/@playwright/test/-/test-1.64.1.tgz' },
  playwright: { integrity: 'sha512-HCrVhHr5QQuwYoswEUGTb7gGp522yflbv/ST8nF4sFWGuLjQCt17Q/EubpGGSNKYn1tsTCPZxqHhHCfVURu7UA==', resolved: 'https://registry.npmjs.org/playwright/-/playwright-1.64.1.tgz' },
  'playwright-core': { integrity: 'sha512-BC4s8y6SEVA6Q1rSxZTto8hI1KUI3xXlHGZgvGqP4IqPdI/a6FX9H29IDNz7vKo9l21b6LfYosScPL6M3xxyDQ==', resolved: 'https://registry.npmjs.org/playwright-core/-/playwright-core-1.64.1.tgz' },
};
function verifyToolSource() {
  const packageBytes = fs.readFileSync(path.join(tools, 'package.json')), lockBytes = fs.readFileSync(path.join(tools, 'package-lock.json'));
  const lock = JSON.parse(lockBytes); assert.deepEqual(JSON.parse(packageBytes).devDependencies, { '@playwright/test': '1.64.1' });
  assert.equal(lock.lockfileVersion, 3); assert.deepEqual(Object.keys(lock.packages).sort(), ['', ...Object.keys(pinnedPackages).map(name => 'node_modules/' + name)].sort());
  for (const [name, pin] of Object.entries(pinnedPackages)) { const row = lock.packages['node_modules/' + name]; assert.equal(row.version, '1.64.1'); assert.equal(row.integrity, pin.integrity); assert.equal(row.resolved, pin.resolved); }
  const bytes = fs.readFileSync(path.join(tools, 'browser-metadata.json'));
  assert.deepEqual(identity(bytes), { bytes: 1135, sha256: '2cfd419f71ac6475d81e1301fa86c34cf2a2a6bae2a0da4b5a2b18310216b6bf' });
  return { package: identity(packageBytes), lock: identity(lockBytes), browserMetadata: identity(bytes), packageVersions: Object.fromEntries(Object.keys(pinnedPackages).map(name => [name, '1.64.1'])) };
}
async function installedBrowser() {
  for (const name of Object.keys(pinnedPackages)) assert.equal(readJson(path.join(tools, 'node_modules', name, 'package.json')).version, '1.64.1');
  assert.deepEqual(fs.readFileSync(path.join(tools, 'node_modules/playwright-core/browsers.json')), fs.readFileSync(path.join(tools, 'browser-metadata.json')));
  const { chromium } = await import(pathToFileURL(path.join(tools, 'node_modules/playwright/index.mjs')).href);
  const executable = await fs.promises.realpath(chromium.executablePath()); assert(within(cache, executable));
  assert(executable.split(path.sep).includes('chromium-1248'), 'Installed browser revision differs');
  return { name: 'chromium', revision: '1248', expectedVersion: '156.0.8078.4', channel: 'chromium', executable, ...await fileIdentity(executable), digestKind: 'Observed hosted executable identity after the pinned official Playwright downloader; no independent publisher digest or signature assertion.' };
}
let before = null;
save(true);
try {
  record.sourceCommit = git(['rev-parse', 'HEAD']).trim(); assert.equal(record.sourceCommit, process.env.GITHUB_SHA);
  assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']), '', 'Browser workflow requires a clean source checkout');
  const source = verifyToolSource(); record.toolingSource = source; save();
  if (phase === 'acquire') {
    const npmCli = process.env.PATH.split(path.delimiter).map(folder => path.join(folder, 'node_modules/npm/bin/npm-cli.js')).find(filename => fs.existsSync(filename)); assert(npmCli, 'setup-node npm CLI is unavailable');
    await run([npmCli, 'ci', '--include=dev', '--ignore-scripts', '--no-audit', '--no-fund'], 180000, 'locked-tooling-install');
    assert.deepEqual(verifyToolSource(), source, 'Installation changed locked source bytes');
    assert.deepEqual(fs.readFileSync(path.join(tools, 'node_modules/playwright-core/browsers.json')), fs.readFileSync(path.join(tools, 'browser-metadata.json')));
    await run([path.join(tools, 'node_modules/playwright/cli.js'), 'install', 'chromium', '--no-shell'], 240000, 'pinned-chromium-install');
    record.browserImage = await installedBrowser(); record.browserLaunchRequestsByCollector = 0; record.browserLaunchRequestsInsideInstallerIndependentlyCounted = false; record.productTests = 0;
    assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']), '');
    record.applicationSourcesChanged = false; record.status = 'acquired';
  } else {
    const acquisitionBytes = fs.readFileSync(path.join(evidence, 'browser-tooling-acquisition.json')), acquisition = JSON.parse(acquisitionBytes);
    assert.equal(acquisition.schema, 'rea-cloud-browser-tooling-acquisition/v1'); assert.equal(acquisition.status, 'acquired'); sameAttempt(acquisition);
    assert.equal(acquisition.sourceCommit, record.sourceCommit); assert.deepEqual(acquisition.toolingSource, source);
    record.acquisition = identity(acquisitionBytes); fs.writeFileSync(path.join(evidence, 'browser-prerequisites.json.snapshot'), acquisitionBytes, { flag: 'wx' });
    record.browserImage = await installedBrowser(); assert.deepEqual(record.browserImage, acquisition.browserImage);
    const data = fs.mkdtempSync(path.join(temporary, 'rea-browser-synthetic-data-')); process.env.REA_BROWSER_DATA_ROOT = data; record.ownedDataRoot = data;
    before = census(); saveNew('browser-source-before.json', before);
    for (const row of before) { const target = path.join(evidence, 'source', row.path + '.snapshot'); fs.mkdirSync(path.dirname(target), { recursive: true }); const bytes = sourceBytes(path.join(studio, row.path)); assert.deepEqual(identity(bytes), { bytes: row.bytes, sha256: row.sha256 }); fs.writeFileSync(target, bytes, { flag: 'wx' }); }
    record.sourceFiles = before.length; record.sourceCapturedBeforeExecution = true;
    const roster = readJson(path.join(tools, 'scenario-roster.json')); assert.equal(roster.length, 12); assert.equal(new Set(roster).size, 12); record.scenarios = roster; save();
    await run([path.join(tools, 'node_modules/playwright/cli.js'), 'test', '--config', path.join(tools, 'playwright.config.mjs')], 9 * 60000, 'finite-real-browser-scenarios');
    const report = readJson(path.join(evidence, 'playwright-results.json')), specs = []; assert.deepEqual(report.errors, []);
    const visit = suite => { specs.push(...(suite.specs ?? [])); for (const nested of suite.suites ?? []) visit(nested); }; for (const suite of report.suites) visit(suite);
    assert.deepEqual(specs.map(spec => spec.title).sort(), [...roster].sort()); assert.equal(specs.length, 12);
    for (const spec of specs) { assert.equal(spec.ok, true); assert.equal(spec.tests.length, 1); const test = spec.tests[0]; assert.equal(test.status, 'expected'); assert.equal(test.results.length, 1); assert.equal(test.results[0].status, 'passed'); assert.equal(test.results[0].retry, 0); }
    assert.deepEqual([report.stats.expected, report.stats.unexpected, report.stats.skipped, report.stats.flaky], [12, 0, 0, 0]);
    const browser = readJson(path.join(evidence, 'browser-observation.json')); assert.equal(browser.realBrowserFixtureCreated, true); assert.equal(browser.version, '156.0.8078.4'); assert.equal(browser.browser, 'chromium'); assert.equal(browser.channel, 'chromium'); assert.equal(browser.retries, 0);
    const cases = fs.readdirSync(evidence).filter(name => /^case-.*\.json$/.test(name)); assert.equal(cases.length, 12);
    const observed = [], screenshots = []; let downloads = 0;
    for (const filename of cases) {
      const value = readJson(path.join(evidence, filename)); assert.equal(value.realBrowser, true); assert.equal(value.actualHTTP, true); assert.equal(value.serverCloseObserved, true); assert.equal(value.retry, 0); assert.deepEqual(value.errors, []); observed.push(value.title);
      assert(/^[A-Za-z0-9-]+$/.test(value.testId)); assert.equal(filename, 'case-' + value.testId + '.json');
      const screenshotPath = 'screenshots/' + value.testId + '.png', image = fs.readFileSync(path.join(evidence, screenshotPath));
      assert(image.length >= 24 && image.length <= 2 * 1024 * 1024); assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a'); assert.equal(image.subarray(12, 16).toString('ascii'), 'IHDR'); assert.equal(image.readUInt32BE(16), 1440); assert.equal(image.readUInt32BE(20), 1100);
      screenshots.push({ path: screenshotPath, ...identity(image), width: 1440, height: 1100 });
      for (const item of value.observations.filter(row => row.kind === 'real-browser-file-download')) { assert(/^downloads\/flow-(CRLF|bareCR|LF)\.json$/.test(item.path)); assert.deepEqual(await fileIdentity(path.join(evidence, item.path)), item.observed); assert.deepEqual(item.expected, item.observed); downloads++; }
    }
    assert.deepEqual(observed.sort(), [...roster].sort()); assert.equal(downloads, 3);
    assert.equal(fs.readdirSync(path.join(evidence, 'screenshots')).filter(name => name.endsWith('.png')).length, 12);
    record.screenshots = screenshots;
    record.summary = { tests: 12, passed: 12, failed: 0, skipped: 0, flaky: 0, retries: 0, exactRealDownloads: 3 }; record.status = 'passed';
  }
} catch (error) { record.status = interrupted ? 'interrupted' : 'failed'; record.failure = { name: error.name, message: error.message }; killOwnedChild(); process.exitCode = 1; }
finally {
  if (before) { try { const after = census(); saveNew('browser-source-after.json', after); record.sourceStable = JSON.stringify(before) === JSON.stringify(after); record.applicationSourcesChanged = record.sourceStable ? null : true; assert(record.sourceStable, 'Browser-attempt source changed'); assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']), ''); record.applicationSourcesChanged = false; } catch (error) { record.status = 'failed'; record.failure = { name: error.name, message: error.message }; process.exitCode = 1; } }
  if (interrupted) { record.status = 'interrupted'; process.exitCode = 143; }
  record.completedAtUtc = new Date().toISOString(); record.retainedOutputBytes = retained; save(); event('terminal', { status: record.status, failure: record.failure, summary: record.summary ?? null });
  for (const fd of [outFd, errFd, eventsFd]) fs.closeSync(fd);
  for (const [signal, handler] of signalHandlers) process.off(signal, handler);
  for (const stream of [process.stdout, process.stderr]) stream.off('error', consoleError);
}
console.log(JSON.stringify({ phase, status: record.status, sourceCommit: record.sourceCommit, summary: record.summary ?? null, sourceStable: record.sourceStable ?? null }));
