// Hosted verification inputs only. No application imports this module.
// This script downloads and inspects bytes; it never launches the EXE or DLL.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const args = process.argv.slice(2);
assert.equal(args.length, 2, 'Usage: bootstrap-cloud-bsdtar.mjs --evidence <absolute RUNNER_TEMP child>');
assert.equal(args[0], '--evidence');
assert.ok(path.isAbsolute(args[1]));
assert.equal(process.platform, 'win32', 'Only hosted Windows acquisition is supported.');
assert.equal(process.version, 'v24.16.0', 'Use the explicitly pinned Node runtime.');
assert.equal(process.env.CI, 'true', 'Normal local acquisition is disabled.');
assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted', 'A standard GitHub-hosted runner is required.');
for (const key of ['RUNNER_TEMP', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY']) assert.ok(process.env[key], `Missing hosted context: ${key}`);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = bytes => ({ bytes: bytes.length, sha256: sha(bytes) });
function inside(parent, target) {
  const relative = path.relative(parent, target);
  return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}
async function resolvedDestination(destination) {
  let ancestor = path.resolve(destination); const suffix = [];
  for (;;) {
    try { return path.join(await fs.realpath(ancestor), ...suffix); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = path.dirname(ancestor); assert.notEqual(parent, ancestor, 'Output ancestor is unavailable.');
      suffix.unshift(path.basename(ancestor)); ancestor = parent;
    }
  }
}
const temporaryRoot = await fs.realpath(process.env.RUNNER_TEMP);
const evidence = await resolvedDestination(args[1]);
assert.ok(inside(temporaryRoot, evidence), 'Evidence must be an owned child of RUNNER_TEMP.');
await fs.mkdir(evidence, { recursive: true });
const receiptPath = path.join(evidence, 'bsdtar-original-acquisition.json');
const cache = path.join(repository, '.local/bsdtar-original');
const assets = [
  {
    name: 'tar.exe', bytes: 92280, sha256: '4e598a8cec84af779e3377442fce2b94b976f614ed4c6e5a665e19308fd1e379',
    sourceUrl: 'https://msdl.microsoft.com/download/symbols/tar.exe/BE8EDDEC14000/tar.exe',
    peTimeDateStamp: 'BE8EDDEC', peSizeOfImage: '14000',
    expectedFileVersion: '3.8.8 (WinBuild.160101.0800)', expectedProductVersion: '10.0.26100.9278',
    referenceComponent: 'amd64_bsdtar_31bf3856ad364e35_10.0.26100.9278_none_f20be6501bf1c655',
    historicalPin: 'Exact historical tar.exe SHA256; the historical receipt did not bind its dynamically loaded archiveint.dll.',
  },
  {
    name: 'archiveint.dll', bytes: 1482752, sha256: 'ca36efd61b33586e4cee69513bf3dcc8d20b65f37bd6495d5d82eb15833b5824',
    sourceUrl: 'https://msdl.microsoft.com/download/symbols/archiveint.dll/0B7F5A2E16a000/archiveint.dll',
    peTimeDateStamp: '0B7F5A2E', peSizeOfImage: '16a000',
    expectedFileVersion: '3.8.8 (WinBuild.160101.0800)', expectedProductVersion: '10.0.26100.9278',
    referenceComponent: 'amd64_libarchive-internal_31bf3856ad364e35_10.0.26100.9278_none_167f98d9fee4a658',
    historicalPin: 'New explicit DLL identity paired with the EXE build; not claimed to identify the DLL loaded by the historical run.',
  },
];
const receipt = {
  schema: 'rea-cloud-bsdtar-original-prerequisites/v1', status: 'running', startedAtUtc: new Date().toISOString(),
  scope: 'Official Microsoft image-byte acquisition and static PE inspection only; a newly explicit build26100.9278 EXE/DLL pair. No original execution, test, historical-DLL equivalence, production integration or full-suite result.',
  execution: Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_REPOSITORY', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT'].map(key => [key, process.env[key] ?? null])),
  runtime: { version: process.version, platform: process.platform, architecture: process.arch },
  bootstrap: identity(await fs.readFile(fileURLToPath(import.meta.url))), cache,
  assets: assets.map(asset => ({ ...asset, status: 'pending', authenticated: false })),
  originalExecutions: 0, vendorBinariesPublished: false,
  signatureInspection: { performed: false, reason: 'This pure-Node acquisition phase does not invoke signature/version tools or load original images. Exact size, SHA256 and selected static PE identity are mandatory.' },
  versionResourcesIndependentlyInspectedHere: false,
  nextValidation: 'Use a separately recorded hosted test-only helper to copy and authenticate BOTH images into each private oracle directory before invoking --version or comparisons. A WINDIR-only EXE path override does not isolate its dynamic DLL.',
};
const initialReceipt = await fs.open(receiptPath, 'wx');
try { await initialReceipt.writeFile(JSON.stringify(receipt, null, 2) + '\n'); await initialReceipt.sync(); }
finally { await initialReceipt.close(); }
async function save() {
  const temporary = path.join(evidence, 'bsdtar-original-acquisition.json.tmp');
  const handle = await fs.open(temporary, 'wx');
  try { await handle.writeFile(JSON.stringify(receipt, null, 2) + '\n'); await handle.sync(); }
  finally { await handle.close(); }
  await fs.rename(temporary, receiptPath);
}
function inspectPe(bytes, expected) {
  assert.equal(bytes.readUInt16LE(0), 0x5a4d, 'Expected a PE DOS header.');
  const offset = bytes.readUInt32LE(0x3c);
  assert.ok(offset + 24 + 60 <= bytes.length, 'PE header is outside the authenticated image.');
  assert.equal(bytes.readUInt32LE(offset), 0x00004550, 'Expected a PE signature.');
  assert.equal(bytes.readUInt16LE(offset + 4), 0x8664, 'Expected an AMD64 image.');
  const timestamp = bytes.readUInt32LE(offset + 8).toString(16).toUpperCase().padStart(8, '0');
  const sizeOfImage = bytes.readUInt32LE(offset + 24 + 56).toString(16);
  assert.equal(timestamp, expected.peTimeDateStamp); assert.equal(sizeOfImage, expected.peSizeOfImage);
  return { machine: 'AMD64', timeDateStamp: timestamp, sizeOfImage };
}
async function authenticateFile(filename, expected) {
  const item = await fs.lstat(filename);
  assert.ok(item.isFile() && !item.isSymbolicLink(), 'Original cache image must be an ordinary file.');
  assert.equal(item.size, expected.bytes, 'Original image size changed.');
  const bytes = await fs.readFile(filename);
  assert.deepEqual(identity(bytes), { bytes: expected.bytes, sha256: expected.sha256 }, 'Original image digest changed.');
  return { ...identity(bytes), pe: inspectPe(bytes, expected) };
}
async function download(asset, filename) {
  const response = await fetch(asset.sourceUrl, { signal: AbortSignal.timeout(45000) });
  assert.ok(response.ok, `Official Microsoft image download returned ${response.status}.`);
  const finalHost = new URL(response.url).hostname;
  assert.ok(finalHost === 'msdl.microsoft.com' || finalHost.endsWith('.blob.core.windows.net'), 'Unexpected Microsoft image redirect host.');
  const declared = response.headers.get('content-length');
  if (declared !== null) assert.equal(Number(declared), asset.bytes, 'Declared original image size changed.');
  const chunks = []; let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length; assert.ok(length <= asset.bytes, 'Original image download exceeded its exact byte cap.'); chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  assert.deepEqual(identity(bytes), { bytes: asset.bytes, sha256: asset.sha256 }, 'Official image bytes differ from the explicitly pinned component.');
  inspectPe(bytes, asset);
  const partial = filename + '.partial';
  const handle = await fs.open(partial, 'wx');
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
  await fs.rename(partial, filename);
  return { transport: 'official Microsoft Symbol Server HTTPS endpoint', redirected: response.redirected, finalHost, ephemeralRedirectUrlRetained: false };
}
try {
  const local = path.join(repository, '.local');
  await fs.mkdir(local, { recursive: true });
  assert.ok(!(await fs.lstat(local)).isSymbolicLink(), 'The private cache parent cannot be a link.');
  await fs.mkdir(cache, { recursive: true });
  assert.ok(!(await fs.lstat(cache)).isSymbolicLink(), 'The private original cache cannot be a link.');
  for (let index = 0; index < assets.length; index++) {
    const expected = assets[index], row = receipt.assets[index], filename = path.join(cache, expected.name);
    let source;
    try { await fs.lstat(filename); source = { transport: 'existing authenticated private cache' }; }
    catch (error) { if (error.code !== 'ENOENT') throw error; source = await download(expected, filename); }
    const observed = await authenticateFile(filename, expected);
    Object.assign(row, { status: 'acquired', authenticated: true, path: filename, observed, acquisition: source });
    await save();
  }
  receipt.status = 'acquired'; receipt.completedAtUtc = new Date().toISOString(); await save();
  console.log('Both pinned Microsoft bsdtar images acquired and statically authenticated; no original program was executed.');
} catch (error) {
  receipt.status = 'failed'; receipt.completedAtUtc = new Date().toISOString();
  receipt.failure = { name: error.name, code: error.code ?? null, message: error.message };
  await save(); console.error(error.stack ?? error.message); process.exitCode = 1;
}
