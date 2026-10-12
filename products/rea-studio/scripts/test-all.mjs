import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
function tests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? tests(join(directory, entry.name)) : entry.name.endsWith('.test.mjs') ? [join(directory, entry.name)] : []);
}
const files = [...tests(join(root, 'tests')), ...tests(join(root, 'apps'))].sort();
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], { cwd: root, stdio: 'inherit' });
process.exitCode = result.status ?? 1;
