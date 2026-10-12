import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export function analyzeGoRelease(project) {
  const manifest = JSON.parse(readFileSync(join(project, 'artifact-manifest.json'), 'utf8'));
  const cli = process.env.REA_CLI ?? resolve(project, '../../tooling/rea-main/scripts/rea.mjs');
  assert.ok(existsSync(cli), 'Set REA_CLI to a source-built REA script supporting inspect-go-binary. See TOOLING.md.');
  const executable = process.env[manifest.product === 'restic' ? 'RESTIC_STUDY_EXE' : 'RCLONE_STUDY_EXE'] ?? join(project, manifest.executable_relative_path);
  const output = spawnSync(process.execPath, [cli, 'inspect-go-binary', executable, '--json'], { encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const directory = join(project, 'artifacts', 'analysis-replays', new Date().toISOString().replace(/[:.]/g, '-') + '-' + process.pid);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'rea-go-evidence.json'), output.stdout ?? '');
  writeFileSync(join(directory, 'stderr.txt'), output.stderr ?? '');
  assert.equal(output.status, 0, output.stderr);
  const evidence = JSON.parse(output.stdout);
  assert.equal(evidence.subject.digest.sha256, manifest.executable_sha256);
  console.log(JSON.stringify({ product: manifest.product, evidence_id: evidence.evidence_id, provider: evidence.provider.id, output_directory: directory }));
}
