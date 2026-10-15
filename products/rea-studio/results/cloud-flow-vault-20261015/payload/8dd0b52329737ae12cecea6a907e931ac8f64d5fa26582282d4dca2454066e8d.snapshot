// Verification-only acquisition on a standard GitHub-hosted Windows runner.
// The application never imports this script or the downloaded original programs.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../../../', import.meta.url));
const args = process.argv.slice(2);
assert.equal(args.length, 2, 'Usage: bootstrap-cloud-flow-vault.mjs --evidence <absolute runner-temp directory>');
assert.equal(args[0], '--evidence');
assert.equal(process.platform, 'win32', 'This prerequisite set targets hosted Windows only.');
assert.equal(process.version, 'v24.16.0', 'Use the explicitly pinned Node runtime.');
assert.equal(process.env.CI, 'true', 'Local acquisition is disabled.');
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'GitHub Actions execution is required.');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted', 'A standard GitHub-hosted runner is required.');
for (const name of ['RUNNER_TEMP', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_SHA', 'GITHUB_REPOSITORY', 'GITHUB_ENV']) assert.ok(process.env[name], `Missing hosted context: ${name}`);
assert.ok(path.isAbsolute(args[1]), 'The evidence path must be absolute.');
const evidence = path.resolve(args[1]), runnerTemp = path.resolve(process.env.RUNNER_TEMP);
const evidenceRelative = path.relative(runnerTemp, evidence);
assert.ok(evidenceRelative && !path.isAbsolute(evidenceRelative) && !evidenceRelative.split(path.sep).includes('..'), 'Evidence must be an owned child of RUNNER_TEMP.');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const receiptPath = path.join(evidence, 'prerequisite-acquisition.json');
await fs.mkdir(evidence, { recursive: true });
const receipt = {
  schema: 'rea-cloud-flow-vault-prerequisites/v1', status: 'running', started_at_utc: new Date().toISOString(),
  scope: 'Pinned verification inputs for the finite Flow/Vault suite only; no full development-suite, browser, parity, security or superiority certification.',
  runtime: process.version, platform: process.platform, architecture: process.arch,
  execution: Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'GITHUB_REPOSITORY', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'RUNNER_OS', 'RUNNER_ARCH', 'RUNNER_ENVIRONMENT'].map(name => [name, process.env[name] ?? null])),
  assets: [], vendor_binaries_published: false,
};
await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
async function saveReceipt() { await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n'); }
function command(executable, argv, options = {}) {
  const result = spawnSync(executable, argv, { cwd: repository, stdio: 'inherit', windowsHide: true, timeout: 300000, ...options });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `Prerequisite command failed with status ${result.status}, signal ${result.signal ?? 'none'}.`);
}
async function npmCliOnPath() {
  const directories = (process.env.PATH ?? process.env.Path ?? '').split(path.delimiter).map(value => value.replace(/^"|"$/g, '')).filter(Boolean);
  for (const directory of directories) {
    try {
      await fs.access(path.join(directory, 'npm.cmd'));
      const candidate = path.join(directory, 'node_modules/npm/bin/npm-cli.js');
      assert.ok((await fs.stat(candidate)).isFile());
      return candidate;
    } catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error; }
  }
  throw new Error('The npm CLI accompanying npm.cmd on PATH is unavailable.');
}
async function downloadPinned(asset, target) {
  const response = await fetch(asset.source_url, { signal: AbortSignal.timeout(60000) });
  assert.ok(response.ok, `Pinned download failed: ${response.status}`);
  const chunks = []; let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    assert.ok(bytes <= asset.bytes, 'Pinned download exceeded its exact recorded size.');
    chunks.push(chunk);
  }
  const contents = Buffer.concat(chunks);
  assert.equal(contents.length, asset.bytes, 'Pinned download size changed.');
  assert.equal(sha(contents), asset.sha256, 'Pinned download digest changed.');
  await fs.writeFile(target, contents, { flag: 'wx' });
  return { ...asset, path: target, authenticated: true };
}
async function acquireFlow() {
  const fixture = path.join(repository, 'products/rea-studio/apps/flow/fixtures/oracle');
  const cache = path.join(repository, '.local/flow-original');
  const lockBytes = await fs.readFile(path.join(fixture, 'package-lock.json'));
  assert.equal(sha(lockBytes), '75f9e5c0448cb753d2fd4b735698dbb2dc8bb310534ac8e4548618baca612de1', 'The reviewed Flow oracle lock changed.');
  const lock = JSON.parse(lockBytes);
  const versions = { 'node-red': '5.0.8', '@node-red/nodes': '5.0.8', '@node-red/util': '5.0.8', '@node-red/runtime': '5.0.8', 'node-red-node-test-helper': '0.3.6' };
  for (const [name, version] of Object.entries(versions)) {
    const entry = lock.packages[`node_modules/${name}`];
    assert.equal(entry?.version, version, `Unpinned original package: ${name}`);
    assert.ok(entry.integrity?.startsWith('sha512-') && entry.resolved?.startsWith('https://registry.npmjs.org/'), `Missing pinned registry provenance: ${name}`);
  }
  await fs.mkdir(cache, { recursive: true });
  for (const name of ['package.json', 'package-lock.json']) await fs.copyFile(path.join(fixture, name), path.join(cache, name));
  const npmCli = await npmCliOnPath();
  command(process.execPath, [npmCli, 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: cache });
  assert.equal(sha(await fs.readFile(path.join(cache, 'package-lock.json'))), sha(lockBytes));
  for (const [name, version] of Object.entries(versions)) assert.equal(JSON.parse(await fs.readFile(path.join(cache, 'node_modules', name, 'package.json'), 'utf8')).version, version);
  receipt.flow = { cache, lock_sha256: sha(lockBytes), packages: versions, acquisition: 'npm ci from the committed SHA512-integrity lock; lifecycle scripts disabled', npm_cli: npmCli };
  await saveReceipt();
  return cache;
}
async function acquireKeePass() {
  const cache = path.join(repository, '.local/keepass-original');
  const portable = path.join(cache, 'portable'), archive = path.join(cache, 'KeePass-2.61.1.zip');
  await fs.mkdir(portable, { recursive: true });
  const asset = {
    product: 'KeePass', version: '2.61.1', bytes: 2898806,
    sha256: '3952354db9b117e906f7cd4f9f5591065b95186472370da47f46f3e246fea864',
    source_url: 'https://github.com/JiriSko/KeePass/releases/download/v2.61.1/KeePass-2.61.1.zip',
    provenance: 'Third-party JiriSko GitHub mirror; exact archive hash and size match the publisher digest recorded in projects/07-keepass/artifact-manifest.json. OpenPGP was not verified.',
  };
  receipt.assets.push(await downloadPinned(asset, archive));
  await saveReceipt();
  command('tar.exe', ['-xf', archive, '-C', portable], { timeout: 60000 });
  const executable = path.join(portable, 'KeePass.exe'), contents = await fs.readFile(executable);
  assert.equal(contents.length, 3265880);
  assert.equal(sha(contents), '04d29636c393f0c1fc99ff739295494be3adefded93271e44591e8e300225a5a', 'The extracted original executable changed.');
  receipt.keepass = { executable, portable_directory: portable, bytes: contents.length, sha256: sha(contents), complete_portable_archive_extracted: true, extraction_tool: 'Runner-provided tar.exe; its identity is recorded separately, not treated as the historical archive-test oracle.' };
  await saveReceipt();
  return executable;
}
async function recordTarReadiness() {
  const expected = '4e598a8cec84af779e3377442fce2b94b976f614ed4c6e5a665e19308fd1e379';
  const executable = path.join(process.env.WINDIR ?? 'C:/Windows', 'System32/tar.exe');
  const record = {
    schema: 'rea-cloud-windows-tar-readiness/v1', checked_at_utc: new Date().toISOString(), executable,
    expected_historical_sha256: expected,
    scope: 'Read-only binary identity check for readiness of separate historical Archive tests; tar was not executed by this check. Flow/Vault acceptance does not certify Archive or the full suite.',
  };
  try { const contents = await fs.readFile(executable); record.bytes = contents.length; record.observed_sha256 = sha(contents); record.status = record.observed_sha256 === expected ? 'ready-exact-historical-bytes' : 'different-from-historical-oracle'; }
  catch (error) { record.status = 'unavailable'; record.error = { code: error.code ?? null, message: error.message }; }
  await fs.writeFile(path.join(evidence, 'windows-tar-readiness.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  receipt.windows_tar_readiness = record.status;
}
try {
  await recordTarReadiness();
  const flowCache = await acquireFlow(), keepass = await acquireKeePass();
  for (const value of [flowCache, keepass]) assert.ok(!/[\r\n]/.test(value), 'Environment paths cannot contain line breaks.');
  await fs.appendFile(process.env.GITHUB_ENV, `FLOW_ORIGINAL_CACHE=${flowCache}\nREA_KEEPASS_EXE=${keepass}\n`);
  receipt.status = 'acquired'; receipt.completed_at_utc = new Date().toISOString();
  await saveReceipt();
  console.log('Pinned Flow and KeePass verification inputs acquired on the GitHub-hosted Windows runner.');
} catch (error) {
  receipt.status = 'failed'; receipt.completed_at_utc = new Date().toISOString();
  receipt.error = { name: error.name, code: error.code ?? null, message: error.message };
  await saveReceipt();
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
