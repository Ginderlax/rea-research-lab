// Test fixture producer: uses pinned Windows bsdtar, never the app ZSTD module.
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { crc32 } from 'node:zlib';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const destination = new URL('./zstd/', import.meta.url);
const executable = path.join(process.env.WINDIR || 'C:/Windows', 'System32/tar.exe');
const binary = await fs.readFile(executable), digest = sha(binary);
if (digest !== '4e598a8cec84af779e3377442fce2b94b976f614ed4c6e5a665e19308fd1e379') throw new Error('Original bsdtar binary changed; rebind the oracle explicitly.');
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'rea-zstd-fixture-'));
try {
  const native = path.join(temporary, 'tar.exe'); await fs.writeFile(native, binary, { flag: 'wx' });
  function run(args) { const result = spawnSync(native, args, { cwd: temporary, windowsHide: true, timeout: 20000 }); if (result.status !== 0) throw new Error(result.stderr?.toString() || result.error?.message); return result.stdout; }
  const payload = Buffer.concat([Buffer.from(Array.from({ length: 16384 }, (_, n) => n % 256)), Buffer.from('Independent encoder payload 🌍')]);
  await fs.mkdir(path.join(temporary, 'source/empty'), { recursive: true }); await fs.writeFile(path.join(temporary, 'source/bytes.bin'), payload, { flag: 'wx' });
  run(['--format=raw', '--zstd', '-cf', 'native.zst', '-C', 'source', 'bytes.bin']);
  run(['--format=pax', '--zstd', '-cf', 'native.tar.zst', '-C', 'source', '.']);
  const frame = await fs.readFile(path.join(temporary, 'native.zst'));
  // Independently assemble one ordinary ZIP member around the native frame.
  // This producer imports neither makeZip nor any app checksum/codec code.
  const name = Buffer.from('bytes.bin'), checksum = crc32(payload);
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(63, 4); local.writeUInt16LE(0x800, 6); local.writeUInt16LE(93, 8); local.writeUInt16LE(33, 12); local.writeUInt32LE(checksum, 14); local.writeUInt32LE(frame.length, 18); local.writeUInt32LE(payload.length, 22); local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(63, 4); central.writeUInt16LE(63, 6); central.writeUInt16LE(0x800, 8); central.writeUInt16LE(93, 10); central.writeUInt16LE(33, 14); central.writeUInt32LE(checksum, 16); central.writeUInt32LE(frame.length, 20); central.writeUInt32LE(payload.length, 24); central.writeUInt16LE(name.length, 28);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(central.length + name.length, 12); end.writeUInt32LE(local.length + name.length + frame.length, 16);
  const files = { 'payload.bin': payload, 'native.zst': frame, 'native.tar.zst': await fs.readFile(path.join(temporary, 'native.tar.zst')), 'native-zip93.zip': Buffer.concat([local, name, frame, central, name, end]) };
  await fs.mkdir(destination, { recursive: true });
  for (const [name, bytes] of Object.entries(files)) await fs.writeFile(new URL(name, destination), bytes, { flag: 'wx' });
  const provenance = { generator: 'generate-zstd-fixtures.mjs', application_imported: false, oracle: { path: executable, sha256: digest, version: run(['--version']).toString().trim() }, files: Object.entries(files).map(([name, bytes]) => ({ name, bytes: bytes.length, sha256: sha(bytes) })), encoding: 'bsdtar --format=raw/pax --zstd; ZIP envelope independently assembled using node:zlib CRC32' };
  await fs.writeFile(new URL('provenance.json', destination), JSON.stringify(provenance, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(provenance, null, 2));
} finally {
  if (path.dirname(temporary) !== path.resolve(os.tmpdir()) || !path.basename(temporary).startsWith('rea-zstd-fixture-')) throw new Error('Unexpected fixture cleanup path.');
  await fs.rm(temporary, { recursive: true, force: true });
}
