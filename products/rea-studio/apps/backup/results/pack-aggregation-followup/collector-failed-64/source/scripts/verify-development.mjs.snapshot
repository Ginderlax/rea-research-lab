import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { platform, arch } from 'node:os';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
function files(directory) {
  // Private oracle caches, synthetic saved data and detailed observations are
  // generated inputs/outputs. They must not enter the public source inventory
  // or discover runnable vendor tests during the application suite.
  return readdirSync(directory, { withFileTypes: true }).filter(entry => !entry.isDirectory() || !['.local','node_modules'].includes(entry.name))
    .flatMap(entry => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]);
}
const sourceFiles = [...['apps', 'lib', 'public', 'scripts', 'tests'].flatMap(directory => files(join(root, directory))), ...['server.mjs', 'catalog.mjs', 'package.json'].map(name => join(root, name))]
  .filter(path => /\.(mjs|json|html|css|ps1)$/.test(path)).sort();
// Results preserve exact historical tests, including failed experiments. They
// are integrity-checked source snapshots, not members of the current suite.
const testFiles = sourceFiles.filter(path => path.endsWith('.test.mjs') && !relative(root, path).split(/[\\/]/).includes('results'));
const fingerprint = path => ({ path: relative(root, path).replaceAll('\\', '/'), sha256: createHash('sha256').update(readFileSync(path)).digest('hex') });
const sourceBefore = sourceFiles.map(fingerprint);
const run = spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-concurrency=1', ...testFiles], { cwd: root, encoding: 'utf8', timeout: 1800000, maxBuffer: 16 * 1024 * 1024 });
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
assert.equal(summary.skipped,0,'Required original fixtures must be available; skips cannot certify this checkpoint');
assert.equal(summary.pass + summary.skipped, summary.tests);
const sourceAfter = [...['apps', 'lib', 'public', 'scripts', 'tests'].flatMap(directory => files(join(root, directory))), ...['server.mjs', 'catalog.mjs', 'package.json'].map(name => join(root, name))]
  .filter(path => /\.(mjs|json|html|css|ps1)$/.test(path)).sort().map(fingerprint);
assert.deepEqual(sourceAfter, sourceBefore, 'Source files changed while development tests were running; this run cannot certify the final source bytes');
const record = {
  schema: 'rea-development-validation/v1', checked_at_utc: new Date().toISOString(),
  scope: 'Implemented development application contracts; does not establish every documented original-product feature or comparative superiority.',
  runtime: process.version, platform: platform(), architecture: arch(),
  runner: 'node --test --test-reporter=tap --test-concurrency=1',
  test_files: testFiles.map(path => relative(root, path).replaceAll('\\', '/')),
  summary,
  source_files: sourceBefore,
  source_bytes_stable_across_run: true,
  historical_test_snapshots_excluded_from_current_execution: true,
  private_generated_app_data_excluded_from_source_capture: true,
  excluded_directory_names: ['.local','node_modules'],
  browser_validation: 'Separate source-bound interactive records are identified in STATUS.json and the current milestone; historical native-core, execution, native-exchange and initial ten-app checks remain preserved. Browser checks are not rerun by this script.',
  comparison: 'editor-comparison.json (separate recorded exploratory component benchmark; not rerun by this script)',
  full_feature_parity_established: false,
  universal_superiority_established: false
};
mkdirSync(join(root, 'results'), { recursive: true });
writeFileSync(join(root, 'results/development-validation.json'), JSON.stringify(record, null, 2) + '\n');
console.log(`Recorded ${summary.pass} passing tests and ${summary.skipped} platform skips; full-product completion remains unestablished.`);
