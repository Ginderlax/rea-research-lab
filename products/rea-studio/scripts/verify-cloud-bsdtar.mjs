// Verification-only original-program smoke check, separate from acquisition.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

assert.equal(process.platform, 'win32');
assert.equal(process.version, 'v24.16.0');
assert.equal(process.env.CI, 'true');
assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
assert.equal(process.argv.length, 4);
assert.equal(process.argv[2], '--evidence');
assert(path.isAbsolute(process.argv[3]));
const repository = fileURLToPath(new URL('../../../', import.meta.url));
const evidence = fs.realpathSync(process.argv[3]);
const relative = path.relative(fs.realpathSync(process.env.RUNNER_TEMP), evidence);
assert(relative && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep));
const identity = bytes => ({ bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
const acquisitionBytes = fs.readFileSync(path.join(evidence, 'bsdtar-original-acquisition.json'));
const acquisition = JSON.parse(acquisitionBytes);
assert.equal(acquisition.schema, 'rea-cloud-bsdtar-original-prerequisites/v1');
assert.equal(acquisition.status, 'acquired');
for (const key of ['GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY']) assert.equal(acquisition.execution[key], process.env[key]);
const receiptPath = path.join(evidence, 'bsdtar-original-smoke.json');
const receipt = { schema: 'rea-cloud-bsdtar-original-smoke/v1', status: 'running', startedAtUtc: new Date().toISOString(),
  sourceCommit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT,
  acquisition: identity(acquisitionBytes), images: [], originalProcessAttempts: 0, originalProcesses: 0, productComparisons: 0,
  scope: 'One --version smoke invocation of the newly explicit paired-build original. No candidate comparison, historical-DLL equivalence, product acceptance or full-suite acceptance.',
  loadedModulePathsIndependentlyObserved: false, historicalDLLIdentityEstablished: false, vendorBinariesPublished: false };
function save(initial = false) {
  const temporary = initial ? receiptPath : receiptPath + '.tmp';
  const fd = fs.openSync(temporary, 'wx');
  try { fs.writeFileSync(fd, JSON.stringify(receipt, null, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  if (!initial) fs.renameSync(temporary, receiptPath);
}
save(true);
try {
  const cache = path.join(repository, '.local/bsdtar-original');
  for (const row of [
    { name: 'tar.exe', bytes: 92280, sha256: '4e598a8cec84af779e3377442fce2b94b976f614ed4c6e5a665e19308fd1e379' },
    { name: 'archiveint.dll', bytes: 1482752, sha256: 'ca36efd61b33586e4cee69513bf3dcc8d20b65f37bd6495d5d82eb15833b5824' },
  ]) {
    const filename = path.join(cache, row.name);
    const stat = fs.lstatSync(filename);
    assert(stat.isFile() && !stat.isSymbolicLink());
    assert.deepEqual(identity(fs.readFileSync(filename)), { bytes: row.bytes, sha256: row.sha256 });
    receipt.images.push({ ...row, authenticated: true, location: '.local/bsdtar-original/' + row.name });
  }
  receipt.originalProcessAttempts = 1; save();
  const run = spawnSync(path.join(cache, 'tar.exe'), ['--version'], { cwd: cache, shell: false, windowsHide: true, encoding: 'buffer', timeout: 20000, maxBuffer: 65536 });
  const stdout = run.stdout ?? Buffer.alloc(0), stderr = run.stderr ?? Buffer.alloc(0);
  receipt.originalProcesses = Number.isInteger(run.pid) && run.pid > 0 ? 1 : 0;
  for (const [name, bytes] of [['bsdtar-smoke-stdout.txt', stdout], ['bsdtar-smoke-stderr.txt', stderr]]) fs.writeFileSync(path.join(evidence, name), bytes, { flag: 'wx' });
  receipt.invocation = { arguments: ['--version'], exitCode: run.status, signal: run.signal, error: run.error?.code ?? null, stdout: identity(stdout), stderr: identity(stderr) };
  assert.equal(run.error, undefined, 'Original smoke invocation could not complete');
  assert.equal(run.status, 0, 'Original smoke invocation failed');
  assert.match(stdout.toString('utf8'), /bsdtar 3\.8\.8 - libarchive 3\.8\.8/);
  receipt.banner = stdout.toString('utf8').trim();
  receipt.status = 'passed';
} catch (error) { receipt.status = 'failed'; receipt.failure = { name: error.name, message: error.message }; process.exitCode = 1; }
receipt.completedAtUtc = new Date().toISOString(); save();
console.log(JSON.stringify({ status: receipt.status, banner: receipt.banner ?? null, originalProcesses: receipt.originalProcesses, productComparisons: 0 }));
