import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

// These deliberately failing, tiny synthetic repositories exercise the collector.
// Their checks and fake acquisition receipts are never product/original evidence.
assert.equal(process.platform, 'win32', 'Collector controls require Windows');
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Collector controls run only in GitHub Actions');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted', 'Collector controls require a GitHub-hosted runner');
assert(process.env.RUNNER_TEMP && path.isAbsolute(process.env.RUNNER_TEMP), 'RUNNER_TEMP is required');
assert.equal(process.argv.length, 4, 'Use --output <absolute evidence directory>');
assert.equal(process.argv[2], '--output');
assert(path.isAbsolute(process.argv[3]), '--output must be absolute');
const temporaryRoot = fs.realpathSync(process.env.RUNNER_TEMP);
const inside = (parent, target) => {
  const relative = path.relative(parent, target);
  return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
};
function resolveDestination(destination) {
  let ancestor = path.resolve(destination);
  const suffix = [];
  while (!fs.existsSync(ancestor)) { suffix.unshift(path.basename(ancestor)); ancestor = path.dirname(ancestor); }
  return path.join(fs.realpathSync(ancestor), ...suffix);
}
const output = resolveDestination(process.argv[3]);
assert(inside(temporaryRoot, output), 'Controls output must be a child of RUNNER_TEMP');
fs.mkdirSync(output, { recursive: true });
assert.equal(fs.readdirSync(output).length, 0, 'Use a new, empty controls evidence directory');
const source = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'verify-cloud.mjs'));
const identity = bytes => ({ bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
const workspace = fs.mkdtempSync(path.join(temporaryRoot, 'rea-synthetic-collector-controls-'));
assert(inside(temporaryRoot, fs.realpathSync(workspace)));
const receipt = {
  schema: 'rea-cloud-collector-failure-controls/v1', status: 'running', startedAtUtc: new Date().toISOString(),
  synthetic: true, scope: 'Collector failure handling only; synthetic test counts are separate from all product acceptance.',
  productAcceptance: false, realOriginalExecutions: 0, realApplicationExecutions: 0,
  originalAcquisitionReceiptsAreFake: true, collector: identity(source),
  hostedRun: { repository: process.env.GITHUB_REPOSITORY ?? null, commit: process.env.GITHUB_SHA ?? null, runId: process.env.GITHUB_RUN_ID ?? null, runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null },
  cases: [], passedControls: 0, expectedControls: 4,
};
function saveReceipt() {
  const temporary = path.join(output, 'controls-validation.json.tmp');
  const fd = fs.openSync(temporary, 'wx');
  try { fs.writeFileSync(fd, JSON.stringify(receipt, null, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temporary, path.join(output, 'controls-validation.json'));
}
saveReceipt();
const flowNames = ['app.test.mjs', 'link-http.test.mjs', 'link-original.test.mjs', 'link-ui.test.mjs', 'native-link.test.mjs', 'native-original.test.mjs', 'native.test.mjs', 'normalization-boundaries.test.mjs', 'normalization-ui.test.mjs'];
const definitions = [
  { name: 'failed-test', body: marker => `test('synthetic failing assertion', () => { console.log(${JSON.stringify(marker)}); assert.equal(1, 2); });\n` },
  { name: 'skipped-test', body: marker => `console.log(${JSON.stringify(marker)}); test('synthetic deliberate skip', { skip: 'collector negative control' }, () => {});\n` },
  { name: 'source-changed', body: marker => `test('synthetic owned source mutation', () => { console.log(${JSON.stringify(marker)}); fs.writeFileSync(new URL('../../lib/control.json', import.meta.url), '{"changed":true}\\n'); });\n` },
  { name: 'deadline', body: marker => `test('synthetic deliberate hang', async () => { console.log(${JSON.stringify(marker)}); await new Promise(() => setInterval(() => {}, 1000)); });\n`, timeoutMs: 1000 },
];
function git(repository, arguments_) {
  const hooks = path.join(repository, 'empty-hooks');
  const result = spawnSync('git', ['-c', 'core.hooksPath=' + hooks, '-c', 'user.name=REA Synthetic Collector Controls', '-c', 'user.email=collector-controls@example.invalid', '-c', 'commit.gpgsign=false', ...arguments_], {
    cwd: repository, encoding: 'utf8', windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never', GIT_AUTHOR_NAME: 'REA Synthetic Collector Controls', GIT_AUTHOR_EMAIL: 'collector-controls@example.invalid', GIT_COMMITTER_NAME: 'REA Synthetic Collector Controls', GIT_COMMITTER_EMAIL: 'collector-controls@example.invalid' },
  });
  assert.equal(result.status, 0, 'Synthetic Git ' + arguments_[0] + ' failed: ' + (result.stderr ?? ''));
  return result.stdout.trim();
}
function write(repository, relative, bytes) {
  const destination = path.join(repository, relative);
  assert(inside(repository, destination));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes, { flag: 'wx' });
}
async function invoke(collector, caseOutput, commit, timeoutMs) {
  const out = fs.openSync(path.join(caseOutput, 'collector-stdout.txt'), 'wx');
  const err = fs.openSync(path.join(caseOutput, 'collector-stderr.txt'), 'wx');
  try {
    return await new Promise(resolve => {
      const env = { ...process.env, GITHUB_SHA: commit, GITHUB_REPOSITORY: 'synthetic/collector-controls', GITHUB_REF: 'refs/heads/synthetic-controls', GITHUB_WORKFLOW: 'Synthetic collector failure controls' };
      delete env.NODE_TEST_CONTEXT;
      const child = spawn(process.execPath, [collector, '--scope', 'flow-vault', '--output', caseOutput, '--bootstrap-manifest', path.join(caseOutput, 'prerequisite-acquisition.json'), '--timeout-ms', String(timeoutMs)], { env, shell: false, windowsHide: true, stdio: ['ignore', out, err] });
      let error = null, watchdogFired = false, settled = false, forcedEnd = null;
      const finish = (exitCode, signal) => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        clearTimeout(forcedEnd);
        resolve({ exitCode, signal, error, watchdogFired });
      };
      const watchdog = setTimeout(() => {
        watchdogFired = true;
        if (child.pid) {
          const killed = spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: 10_000 });
          if (killed.status !== 0) child.kill('SIGKILL');
        }
        forcedEnd = setTimeout(() => finish(null, null), 5_000);
      }, 45_000);
      child.on('error', cause => { error = cause.message; });
      child.on('close', finish);
    });
  } finally {
    for (const fd of [out, err]) { fs.fsyncSync(fd); fs.closeSync(fd); }
  }
}
for (const definition of definitions) {
  const result = { name: definition.name, synthetic: true, productAcceptance: false, status: 'running' };
  receipt.cases.push(result);
  saveReceipt();
  try {
    const repository = path.join(workspace, definition.name);
    assert(inside(workspace, repository));
    fs.mkdirSync(repository);
    fs.mkdirSync(path.join(repository, 'empty-hooks'));
    const studio = path.join(repository, 'products', 'rea-studio');
    for (const directory of ['apps/flow', 'apps/vault', 'lib', 'public', 'scripts', 'tests']) fs.mkdirSync(path.join(studio, directory), { recursive: true });
    write(repository, '.gitattributes', '* -text\n');
    write(repository, 'products/rea-studio/package.json', '{"private":true,"type":"module","syntheticCollectorControl":true}\n');
    write(repository, 'products/rea-studio/server.mjs', 'export const synthetic = true;\n');
    write(repository, 'products/rea-studio/catalog.mjs', 'export default [];\n');
    write(repository, 'products/rea-studio/lib/control.json', '{"changed":false}\n');
    write(repository, 'products/rea-studio/scripts/verify-cloud.mjs', source);
    const collector = path.join(studio, 'scripts', 'verify-cloud.mjs');
    assert.deepEqual(fs.readFileSync(collector), source, 'Collector copy must be byte exact');
    const marker = 'REA_SYNTHETIC_COLLECTOR_CONTROL_' + definition.name.toUpperCase().replaceAll('-', '_');
    const imports = "import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';\n";
    for (const name of flowNames) write(repository, 'products/rea-studio/apps/flow/' + name, imports + (name === 'app.test.mjs' ? definition.body(marker) : `test(${JSON.stringify('synthetic fixture ' + name)}, () => {});\n`));
    write(repository, 'products/rea-studio/apps/vault/control.test.mjs', imports + "test('synthetic Vault fixture only', () => {});\n");
    git(repository, ['init', '--initial-branch=synthetic-controls']);
    git(repository, ['add', '--all']);
    git(repository, ['commit', '--no-gpg-sign', '-m', 'Synthetic collector failure control']);
    const commit = git(repository, ['rev-parse', 'HEAD']);
    const caseOutput = path.join(output, definition.name);
    fs.mkdirSync(caseOutput);
    write(caseOutput, 'prerequisite-acquisition.json', JSON.stringify({
      schema: 'rea-cloud-flow-vault-prerequisites/v1', status: 'acquired', synthetic: true,
      FAKE: 'Collector failure controls only. No original program or package was acquired or executed.',
      originalExecutions: 0, productAcceptance: false,
    }, null, 2) + '\n');
    const invocation = await invoke(collector, caseOutput, commit, definition.timeoutMs ?? 20_000);
    Object.assign(result, { invocation, syntheticCommit: commit, marker });
    assert.equal(invocation.error, null, 'Collector could not start');
    assert.equal(invocation.watchdogFired, false, 'Outer controls watchdog fired');
    assert.notEqual(invocation.exitCode, 0, 'Negative control unexpectedly succeeded');
    const attempt = JSON.parse(fs.readFileSync(path.join(caseOutput, 'attempt-validation.json'), 'utf8'));
    assert.equal(attempt.schema, 'rea-cloud-development-attempt/v1');
    assert.equal(attempt.status, 'failed');
    assert.equal(attempt.phase, 'terminal');
    assert(attempt.completedAtUtc && attempt.childStarted, 'Missing completed child receipt');
    assert.equal(attempt.repositoryCommit, commit);
    assert.equal(attempt.scope, 'flow-vault');
    assert.equal(attempt.sourceOnly, false);
    assert.equal(attempt.selectedTestFiles.length, 10);
    assert.equal(attempt.output.retainedOutputTruncated, false);
    assert.equal(attempt.childCloseObserved, true, 'Owned child tree must close before terminal evidence');
    const raw = fs.readFileSync(path.join(caseOutput, 'stdout.txt'));
    assert(raw.includes(Buffer.from(marker)), 'Raw output lost the early marker');
    assert.equal(raw.length, attempt.output.stdoutBytes);
    assert.equal(fs.readFileSync(path.join(caseOutput, 'stderr.txt')).length, attempt.output.stderrBytes);
    const events = fs.readFileSync(path.join(caseOutput, 'events.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(events[0].type, 'running');
    assert.equal(events.at(-1).type, 'terminal');
    assert(events.some(event => event.type === 'child-started') && events.some(event => event.type === 'child-closed'));
    assert(events.every((event, index) => event.sequence === index + 1), 'Event sequence is incomplete');
    const before = JSON.parse(fs.readFileSync(path.join(caseOutput, 'source-before.json'), 'utf8'));
    const after = JSON.parse(fs.readFileSync(path.join(caseOutput, 'source-after.json'), 'utf8'));
    assert(before.length > 0 && after.length > 0);
    assert.deepEqual(fs.readFileSync(path.join(caseOutput, 'runner.mjs.snapshot')), source);
    if (definition.name !== 'deadline') assert.equal(attempt.summary.tests, 10);
    if (definition.name === 'failed-test') { assert.equal(attempt.summary.fail, 1); assert.equal(attempt.sourceStable, true); }
    if (definition.name === 'skipped-test') { assert.equal(attempt.summary.skipped, 1); assert.equal(attempt.summary.fail, 0); assert.equal(attempt.sourceStable, true); }
    if (definition.name === 'source-changed') {
      assert.equal(attempt.sourceStable, false);
      assert.equal(attempt.summary.tests, attempt.summary.pass);
      assert.equal(attempt.summary.fail + attempt.summary.skipped, 0);
      assert(attempt.failures.includes('Eligible source files changed during this attempt'));
      assert.notEqual(before.find(row => row.path === 'lib/control.json').sha256, after.find(row => row.path === 'lib/control.json').sha256);
    }
    if (definition.name === 'deadline') {
      assert(attempt.failures.includes('execution deadline exceeded'));
      assert.equal(attempt.sourceStable, true);
      assert(events.some(event => event.type === 'stop-requested' && event.reason === 'execution deadline exceeded'));
    }
    Object.assign(result, { status: 'passed', expectedFailureRecorded: true, earlyOutputDurable: true, terminalReceiptDurable: true, sourceStable: attempt.sourceStable, summary: attempt.summary, rawOutput: identity(raw), evidenceDirectory: definition.name });
    receipt.passedControls++;
  } catch (error) { Object.assign(result, { status: 'failed', error: { name: error.name, message: error.message } }); }
  saveReceipt();
}
receipt.status = receipt.passedControls === receipt.expectedControls ? 'passed' : 'failed';
receipt.completedAtUtc = new Date().toISOString();
saveReceipt();
console.log(JSON.stringify({ status: receipt.status, synthetic: true, passedControls: receipt.passedControls, expectedControls: receipt.expectedControls, productAcceptance: false, originalExecutions: 0, evidenceDirectory: output }));
process.exitCode = receipt.status === 'passed' ? 0 : 1;
