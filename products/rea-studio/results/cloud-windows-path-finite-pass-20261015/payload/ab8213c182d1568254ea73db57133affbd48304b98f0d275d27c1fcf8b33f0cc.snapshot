import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rename, rm, access, symlink } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir, devNull } from 'node:os';
import { promisify } from 'node:util';
import { execFile, spawnSync } from 'node:child_process';
import { createWorkspace } from '../../lib/storage.mjs';
import { start } from '../../server.mjs';
import { handle } from './server.mjs';

const execute = promisify(execFile);
const gitNull = process.platform === 'win32' ? 'NUL' : devNull;
async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'rea-editor-git-'));
  t.after(() => { assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(directory).startsWith('rea-editor-git-')); return rm(directory, { recursive: true, force: true }); });
  const workspace = await createWorkspace(path.join(directory, 'workspace'));
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/^GIT_/i.test(key)) delete env[key];
  Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: gitNull, GIT_CONFIG_SYSTEM: gitNull, GIT_TERMINAL_PROMPT: '0' });
  const native = async (args, cwd = workspace.root) => (await execute('git', ['--no-pager', '-c', `core.hooksPath=${gitNull}`, '-c', 'core.fsmonitor=false', '-c', 'core.autocrlf=false', ...args], { cwd, env, encoding: 'utf8', windowsHide: true })).stdout;
  const nativeInput = (args, input) => {
    const run = spawnSync('git', ['--no-pager', '-c', `core.hooksPath=${gitNull}`, '-c', 'core.fsmonitor=false', ...args], { cwd: workspace.root, env, encoding: 'utf8', input, windowsHide: true });
    assert.equal(run.status, 0, run.stderr); return run.stdout;
  };
  return { directory, workspace, native, nativeInput, call: (action, input) => handle({ action, input, workspace }) };
}

test('source control refuses the parent repository and rejects paths outside its own workspace', async t => {
  const { directory, workspace, native, call } = await fixture(t);
  await native(['init', '--initial-branch=main', '.'], directory);
  assert.equal((await call('gitStatus')).initialized, false);
  await call('gitInitialize');
  await assert.rejects(call('gitStage', { paths: ['../outside.txt'] }), /traversal|workspace/);
  await assert.rejects(call('gitStage', { paths: ['.git/config'] }), /workspace/);
  await assert.rejects(call('gitBranch', { name: '--help' }), /valid branch/);
  assert.equal((await native(['rev-parse', '--show-toplevel'])).trim().replaceAll('\\', '/'), workspace.root.replaceAll('\\', '/'));
});

test('real Git staging, initial unstaging, commit, patches, branch switching and rename records preserve saved files', async t => {
  const { workspace, native, call } = await fixture(t);
  await call('gitInitialize');
  await call('gitIdentity', { name: 'REA synthetic fixture', email: 'fixtures@example.invalid' });
  const name = 'file with spaces Ω.txt';
  let file = await call('save', { path: name, content: 'original\n', revision: null });
  let status = await call('gitStage', { paths: [name] });
  assert.equal(status.changes[0].index, 'A');
  file = await call('save', { path: name, content: 'first\n', revision: file.revision });
  status = await call('gitUnstage', { paths: [name] });
  assert.equal(status.changes[0].untracked, true);
  assert.equal(await readFile(workspace.resolve(name), 'utf8'), 'first\n');
  await call('gitStage', { paths: [name] });
  assert.match((await call('gitDiff', { staged: true })).patch, /\+first/);
  status = await call('gitCommit', { message: 'Synthetic first commit\n\nBody with literal $(not-a-command)' });
  assert.equal(status.history.length, 1);
  assert.equal(status.history[0].subject, 'Synthetic first commit');
  assert.equal(await native(['show', `HEAD:${name}`]), 'first\n');
  await call('gitBranch', { name: 'fixture-feature' });
  await call('save', { path: name, content: 'feature\n', revision: file.revision });
  assert.match((await call('gitDiff')).patch, /-first[\s\S]*\+feature/);
  await call('gitStage', { paths: [name] });
  await call('gitUnstage', { paths: [name] });
  assert.equal((await call('gitStatus')).changes[0].working, 'M');
  await call('gitStage', { paths: [name] });
  await call('gitCommit', { message: 'Synthetic feature commit' });
  status = await call('gitSwitch', { name: 'main' });
  assert.equal(status.branch, 'main');
  assert.equal((await call('read', { path: name })).content, 'first\n');
  const renamed = 'renamed Ω.txt';
  await rename(workspace.resolve(name), workspace.resolve(renamed));
  status = await call('gitStage', { paths: [name, renamed] });
  assert.equal(status.changes[0].index, 'R');
  assert.equal(status.changes[0].path, renamed);
  assert.equal(status.changes[0].originalPath, name);
  assert.match(await native(['status', '--porcelain=v1', '-z']), /R  renamed/);
});

test('source control disables configured executable clean filters and fsmonitor hooks', async t => {
  const { workspace, native, call } = await fixture(t);
  await call('gitInitialize');
  const marker = workspace.resolve('filter-executed.marker');
  const helper = workspace.resolve('fixture-filter.mjs');
  await writeFile(helper, `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)}, 'executed'); process.stdin.pipe(process.stdout);`);
  const executable = `"${process.execPath.replaceAll('\\', '/')}" "${helper.replaceAll('\\', '/')}"`;
  await native(['config', '--local', 'filter.fixture.clean', executable]);
  await native(['config', '--local', 'filter.fixture.process', executable]);
  await native(['config', '--local', 'filter.fixture.required', 'true']);
  await native(['config', '--local', 'core.fsmonitor', executable]);
  await writeFile(workspace.resolve('.gitattributes'), '*.txt filter=fixture\n');
  await writeFile(workspace.resolve('safe.txt'), 'unchanged\n');
  await call('gitStage', { paths: ['safe.txt'] });
  await assert.rejects(access(marker), { code: 'ENOENT' });
  assert.equal(await native(['show', ':safe.txt']), 'unchanged\n');
});

test('Git common-directory metadata cannot mutate an external repository', async t => {
  const { directory, workspace, native, call } = await fixture(t);
  const outside = path.join(directory, 'outside-repository'); await mkdir(outside);
  await native(['init', '--initial-branch=main', '.'], outside);
  await native(['config', '--local', 'user.name', 'External synthetic sentinel'], outside);
  await call('gitInitialize');
  await writeFile(workspace.resolve('.git/commondir'), path.relative(workspace.resolve('.git'), path.join(outside, '.git')) + '\n');
  await assert.rejects(call('gitIdentity', { name: 'Must not be written', email: 'fixtures@example.invalid' }), /Shared Git metadata/);
  await assert.rejects(call('gitStage', { paths: ['anything.txt'] }), /Shared Git metadata/);
  assert.equal((await native(['config', '--local', '--get', 'user.name'], outside)).trim(), 'External synthetic sentinel');
  await assert.rejects(access(path.join(outside, '.git/refs/heads/main')), { code: 'ENOENT' });
});

test('Git status and selected parent directories cannot traverse nested junctions or links', async t => {
  const { directory, workspace, native, call } = await fixture(t);
  await call('gitInitialize');
  const outside = path.join(directory, 'outside-tree'); await mkdir(outside); await writeFile(path.join(outside, 'outside.txt'), 'synthetic external bytes');
  await mkdir(workspace.resolve('bundle'));
  await symlink(outside, workspace.resolve('bundle/linked'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(call('gitStatus'), /links|junctions/);
  await assert.rejects(call('gitStage', { paths: ['bundle'] }), /links|junctions/);
  assert.equal(await native(['ls-files']), '');
});

test('signed-looking history cannot invoke a configured external signature verifier', async t => {
  const { workspace, native, nativeInput, call } = await fixture(t);
  await call('gitInitialize'); await call('gitIdentity', { name: 'REA signature fixture', email: 'fixtures@example.invalid' });
  await call('save', { path: 'history.txt', content: 'synthetic history', revision: null });
  await call('gitStage', { paths: ['history.txt'] }); await call('gitCommit', { message: 'Synthetic signed-looking record' });
  const commit = await native(['cat-file', 'commit', 'HEAD']);
  const signed = commit.replace('\n\n', '\ngpgsig -----BEGIN PGP SIGNATURE-----\n synthetic-invalid-signature\n -----END PGP SIGNATURE-----\n\n');
  const id = nativeInput(['hash-object', '-t', 'commit', '-w', '--stdin'], signed).trim();
  await native(['update-ref', 'refs/heads/main', id]);
  const marker = workspace.resolve('signature-executed.marker'), script = workspace.resolve(process.platform === 'win32' ? 'fixture-verifier.cmd' : 'fixture-verifier.sh');
  await writeFile(script, process.platform === 'win32' ? `@echo synthetic > "${marker}"\r\n@exit /b 1\r\n` : `#!/bin/sh\nprintf synthetic > '${marker.replaceAll("'", "'\\''")}'\nexit 1\n`, { mode: 0o700 });
  await native(['config', '--local', 'gpg.program', script]); await native(['config', '--local', 'log.showSignature', 'true']);
  const status = await call('gitStatus'); assert.equal(status.history[0].id, id);
  await assert.rejects(access(marker), { code: 'ENOENT' });
});

test('nested Git directory pointers cannot stage external Git links or invoke child filters', async t => {
  const { directory, workspace, native, call } = await fixture(t);
  await call('gitInitialize');
  const outside = path.join(directory, 'external-child'); await mkdir(outside);
  await native(['init', '--initial-branch=main', '.'], outside);
  await mkdir(workspace.resolve('child'));
  await writeFile(workspace.resolve('child/.git'), `gitdir: ${path.join(outside, '.git').replaceAll('\\', '/')}\n`);
  await assert.rejects(call('gitStage', { paths: ['child'] }), /Nested repositories/);
  await assert.rejects(call('gitStatus'), /Nested repositories/);
  assert.equal(await native(['ls-files']), '');
});

test('Git HTTP operations and history persist across actual application host restarts', async t => {
  const { directory } = await fixture(t);
  const dataDir = path.join(directory, 'host');
  let host = await start({ port: 0, dataDir });
  t.after(() => host.close());
  const call = async (action, input = {}) => {
    const response = await fetch(`${host.url}/api/editor/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-REA-Token': host.token }, body: JSON.stringify(input) });
    const body = await response.json(); assert.equal(response.status, 200, body.error); return body.result;
  };
  await call('gitInitialize');
  await call('gitIdentity', { name: 'REA HTTP fixture', email: 'fixtures@example.invalid' });
  await call('save', { path: 'http-fixture.txt', content: 'durable Git bytes', revision: null });
  await call('gitStage', { paths: ['http-fixture.txt'] });
  const committed = await call('gitCommit', { message: 'Synthetic HTTP commit' });
  await host.close(); host = await start({ port: 0, dataDir });
  const reopened = await call('gitStatus');
  assert.equal(reopened.head, committed.head);
  assert.equal(reopened.history[0].subject, 'Synthetic HTTP commit');
  assert.equal(reopened.changes.length, 0);
  assert.equal((await call('read', { path: 'http-fixture.txt' })).content, 'durable Git bytes');
});
