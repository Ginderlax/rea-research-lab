import { mkdir, copyFile, readFile } from 'node:fs/promises';
import { resolve, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const repository = fileURLToPath(new URL('../../../', import.meta.url));
const local = resolve(repository, '.local'), target = resolve(local, 'flow-original');
if (!target.startsWith(local + sep) || dirname(target) !== local) throw new Error('Oracle path escaped the local laboratory');
const fixture = new URL('../apps/flow/fixtures/oracle/', import.meta.url);
const lock = JSON.parse(await readFile(new URL('package-lock.json', fixture), 'utf8'));
for (const [name, version] of [['node-red', '5.0.8'], ['@node-red/nodes', '5.0.8'], ['@node-red/util', '5.0.8'], ['@node-red/runtime', '5.0.8'], ['node-red-node-test-helper', '0.3.6']]) {
  const record = lock.packages[`node_modules/${name}`];
  if (record?.version !== version || !record.integrity?.startsWith('sha512-') || !record.resolved?.startsWith('https://registry.npmjs.org/')) throw new Error(`Invalid pinned oracle dependency: ${name}`);
}
await mkdir(target, { recursive: true });
for (const file of ['package.json', 'package-lock.json']) await copyFile(new URL(file, fixture), join(target, file));
const npm = join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const result = spawnSync(process.execPath, [npm, 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', target], { cwd: target, stdio: 'inherit', timeout: 180000 });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error('Pinned Node-RED oracle dependency installation failed');
console.log('Node-RED 5.0.8 independent test runtime installed from integrity-pinned dependencies.');
