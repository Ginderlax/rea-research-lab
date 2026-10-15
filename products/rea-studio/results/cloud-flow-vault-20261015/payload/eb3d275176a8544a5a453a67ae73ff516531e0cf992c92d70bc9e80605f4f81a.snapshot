// Independent verification only. The application never imports this helper.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { installerPath, bootstrapPath } from './bootstrap-original.mjs';
const root = dirname(fileURLToPath(import.meta.url)), lab = join(root, '../../../..');
const sha = b => createHash('sha256').update(b).digest('hex');
export function makeOracleRun(label) {
  const directory = join(lab, '.local/lzma-tests'); mkdirSync(directory, { recursive: true });
  const run = mkdtempSync(join(directory, label + '-')), oracle = join(run, 'oracle'); mkdirSync(oracle);
  const installer = readFileSync(installerPath), bootstrap = readFileSync(bootstrapPath);
  assert.equal(installer.length, 1664082); assert.equal(sha(installer), 'd54bf805f9f3704d1e8db2fa3498ae7ef2df0312b40b558e7c71c734430a665d');
  assert.equal(bootstrap.length, 602624); assert.equal(sha(bootstrap), '256feca8e274e5da655e2a284fabafd9f554365eb164862089dacd4e8276d282');
  const extractor = join(oracle, '7zr.exe'); writeFileSync(extractor, bootstrap, { flag: 'wx' });
  for (const [name, expected] of [['7z.exe', '95fff19b73eff77c87c0d7bd32822e43fb90dd2932459f962eb532d8dfb6ba53'], ['7z.dll', '899cd73d7fc60e1c1c35c7de0f5bed3dc69bfe2cecbd48014d868a347970a0b1']]) {
    const result = spawnSync(extractor, ['e', '-so', installerPath, name], { cwd: run, windowsHide: true, timeout: 30000, maxBuffer: 4 * 1024 ** 2 });
    assert.equal(result.status, 0, result.stderr?.toString()); assert.equal(sha(result.stdout), expected); writeFileSync(join(oracle, name), result.stdout, { flag: 'wx' });
  }
  return { original: join(oracle, '7z.exe'), run };
}
