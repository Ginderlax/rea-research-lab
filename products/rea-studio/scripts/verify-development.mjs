import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { platform, arch } from 'node:os';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]);
}
const sourceFiles = [...['apps', 'lib', 'public', 'scripts', 'tests'].flatMap(directory => files(join(root, directory))), ...['server.mjs', 'catalog.mjs', 'package.json'].map(name => join(root, name))]
  .filter(path => /\.(mjs|json|html|css|ps1)$/.test(path)).sort();
const testFiles = sourceFiles.filter(path => path.endsWith('.test.mjs'));
const run = spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-concurrency=1', ...testFiles], { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
process.stdout.write(run.stdout ?? '');
process.stderr.write(run.stderr ?? '');
const count = label => {
  const match = new RegExp(`^# ${label} (\\d+(?:\\.\\d+)?)$`, 'm').exec(run.stdout ?? '');
  assert.ok(match, `Missing test summary: ${label}`);
  return Number(match[1]);
};
const summary = Object.fromEntries(['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo', 'duration_ms'].map(label => [label, count(label)]));
assert.equal(run.status, 0, 'Development tests failed');
assert.equal(summary.fail + summary.cancelled + summary.todo, 0, 'Collected tests must not fail or remain unfinished');
assert.equal(summary.pass + summary.skipped, summary.tests);
const record = {
  schema: 'rea-development-validation/v1', checked_at_utc: new Date().toISOString(),
  scope: 'Implemented development application contracts; does not establish every documented original-product feature or comparative superiority.',
  runtime: process.version, platform: platform(), architecture: arch(),
  runner: 'node --test --test-reporter=tap --test-concurrency=1',
  test_files: testFiles.map(path => relative(root, path).replaceAll('\\', '/')),
  summary,
  source_files: sourceFiles.map(path => ({ path: relative(root, path).replaceAll('\\', '/'), sha256: createHash('sha256').update(readFileSync(path)).digest('hex') })),
  browser_validation: 'browser-verification.json (separate human-readable record of interactive checks; not rerun by this script)',
  comparison: 'editor-comparison.json (separate recorded exploratory component benchmark; not rerun by this script)',
  full_feature_parity_established: false,
  universal_superiority_established: false
};
mkdirSync(join(root, 'results'), { recursive: true });
writeFileSync(join(root, 'results/development-validation.json'), JSON.stringify(record, null, 2) + '\n');
console.log(`Recorded ${summary.pass} passing tests and ${summary.skipped} platform skips; full-product completion remains unestablished.`);
