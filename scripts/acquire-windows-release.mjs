import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export async function acquireWindowsRelease(project) {
  assert.equal(process.platform, 'win32', 'This study records Windows x64 release bytes and original-artifact execution.');
  const manifest = JSON.parse(readFileSync(join(project, 'artifact-manifest.json'), 'utf8'));
  const artifacts = join(project, 'artifacts');
  mkdirSync(artifacts, { recursive: true });
  const archive = join(artifacts, basename(new URL(manifest.asset_url).pathname));
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  if (!existsSync(archive)) {
    const response = await fetch(manifest.asset_url);
    assert.ok(response.ok, `Publisher download returned ${response.status}.`);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(sha(bytes), manifest.asset_sha256, 'The downloaded release must match the pinned digest.');
    writeFileSync(archive, bytes);
  }
  assert.equal(sha(readFileSync(archive)), manifest.asset_sha256, 'Existing archive does not match the recorded bytes.');
  const unpacked = join(artifacts, 'unpacked');
  const exe = resolve(project, manifest.executable_relative_path);
  if (!existsSync(exe)) {
    mkdirSync(unpacked, { recursive: true });
    const extraction = spawnSync('tar', ['-xf', archive, '-C', unpacked], { encoding: 'utf8', timeout: 120000 });
    assert.equal(extraction.status, 0, extraction.stderr || 'Use the Windows bundled tar or extract the ZIP manually.');
  }
  assert.equal(sha(readFileSync(exe)), manifest.executable_sha256, 'The extracted executable must match the pinned digest.');
  console.log(JSON.stringify({ product: manifest.product, version: manifest.version, sha256_verified: true, executable: exe }));
  return exe;
}
