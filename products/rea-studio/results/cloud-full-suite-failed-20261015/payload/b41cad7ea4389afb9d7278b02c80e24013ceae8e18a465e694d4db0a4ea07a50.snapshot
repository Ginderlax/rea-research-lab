// Verification only. Copy both independently authenticated Microsoft images
// beside the private EXE; application runtime never imports this helper.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cache = fileURLToPath(new URL('../../../../.local/bsdtar-original/', import.meta.url));
const pins = Object.freeze([
  { name: 'tar.exe', bytes: 92280, sha256: '4e598a8cec84af779e3377442fce2b94b976f614ed4c6e5a665e19308fd1e379' },
  { name: 'archiveint.dll', bytes: 1482752, sha256: 'ca36efd61b33586e4cee69513bf3dcc8d20b65f37bd6495d5d82eb15833b5824' },
]);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export async function prepareOriginalBsdtar(root, executableName) {
  assert.equal(process.platform, 'win32', 'These original comparisons require Windows.');
  assert.ok(path.isAbsolute(root));
  assert.ok(['oracle-bsdtar.exe', 'bsdtar.exe'].includes(executableName));
  const rootItem = await fs.lstat(root); assert.ok(rootItem.isDirectory() && !rootItem.isSymbolicLink());
  const realRoot = await fs.realpath(root), realTemporary = await fs.realpath(os.tmpdir());
  assert.equal(path.dirname(realRoot).toLowerCase(), realTemporary.toLowerCase(), 'Only a directly owned temporary fixture is supported.');
  assert.ok(/^(?:rea-native-formats-|rea-zstd-test-)/.test(path.basename(realRoot)), 'Expected an owned Archive fixture prefix.');
  const cacheItem = await fs.lstat(cache); assert.ok(cacheItem.isDirectory() && !cacheItem.isSymbolicLink());
  const copies = [];
  for (const pin of pins) {
    const source = path.join(cache, pin.name), item = await fs.lstat(source);
    assert.ok(item.isFile() && !item.isSymbolicLink()); assert.equal(item.size, pin.bytes);
    const bytes = await fs.readFile(source); assert.equal(sha(bytes), pin.sha256, 'Pinned original image changed: ' + pin.name);
    copies.push({ pin, bytes, destination: path.join(realRoot, pin.name === 'tar.exe' ? executableName : pin.name) });
  }
  // Authenticate the entire pair before creating either test copy. Exclusive
  // writes preserve any existing destination; no system file is replaced.
  for (const copy of copies) await fs.writeFile(copy.destination, copy.bytes, { flag: 'wx' });
  for (const copy of copies) {
    const bytes = await fs.readFile(copy.destination);
    assert.equal(bytes.length, copy.pin.bytes); assert.equal(sha(bytes), copy.pin.sha256);
  }
  return path.join(realRoot, executableName);
}
