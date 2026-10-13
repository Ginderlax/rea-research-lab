import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { lstat, realpath, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { devNull } from 'node:os';

const execute = promisify(execFile);
const gitNull = process.platform === 'win32' ? 'NUL' : devNull;
const base = ['--no-pager', '--literal-pathspecs', '-c', `core.hooksPath=${gitNull}`, '-c', 'core.fsmonitor=false', '-c', 'core.autocrlf=false', '-c', 'commit.gpgSign=false', '-c', 'log.showSignature=false'];
function environment() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/^GIT_/i.test(key)) delete env[key];
  return { ...env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_SYSTEM: gitNull, GIT_CONFIG_GLOBAL: gitNull, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' };
}
async function rawCommand(workspace, args, extra = [], absentIsEmpty = false) {
  try {
    return (await execute('git', [...base, ...extra, ...args], { cwd: workspace.root, env: environment(), encoding: 'utf8', timeout: 30000, maxBuffer: 6 * 1024 * 1024, windowsHide: true })).stdout;
  } catch (error) {
    if (absentIsEmpty && error.code === 1) return '';
    if (error.code === 'ENOENT') throw new Error('Install Git to use source control.');
    throw new Error(`Git operation failed: ${String(error.stderr || error.message).trim().slice(0, 1600)}`);
  }
}
async function command(workspace, args, extra = [], absentIsEmpty = false) {
  const metadataOnly = ['init', 'config', 'rev-parse', 'symbolic-ref', 'for-each-ref', 'check-ref-format', 'log'].includes(args[0]);
  const filters = metadataOnly ? [] : await neutralFilters(workspace);
  return rawCommand(workspace, args, [...filters, ...extra], absentIsEmpty);
}
async function present(workspace) {
  const directory = workspace.resolve('.git');
  try {
    const info = await lstat(directory);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Source control requires a regular .git directory inside this application workspace.');
    await guardTree(workspace);
    for (const name of ['commondir', 'worktrees']) {
      try { await lstat(workspace.resolve(`.git/${name}`)); throw new Error('Shared Git metadata and linked worktrees are not supported in this application workspace.'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    try { if ((await readFile(workspace.resolve('.git/objects/info/alternates'), 'utf8')).trim()) throw new Error('External Git object stores are not supported.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const config = await readFile(workspace.resolve('.git/config'), 'utf8');
    if (/^\s*\[\s*include(?:if)?(?=[\s.\]"])/im.test(config)) throw new Error('Included external Git configuration is not supported.');
    const top = (await command(workspace, ['rev-parse', '--show-toplevel'])).trim();
    if (await realpath(top) !== await realpath(workspace.root)) throw new Error('Repository must be rooted in the application workspace.');
    const common = (await command(workspace, ['rev-parse', '--path-format=absolute', '--git-common-dir'])).trim();
    if (await realpath(common) !== await realpath(directory)) throw new Error('Shared Git metadata must not point outside the application repository.');
    const tracked = await rawCommand(workspace, ['ls-files', '--stage', '-z']);
    if (tracked.split('\0').some(record => record.startsWith('160000 '))) throw new Error('Submodules and Git links are not supported in this application workspace.');
    return true;
  } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
async function guardTree(workspace) {
  let count = 0;
  async function walk(relative = '.', depth = 0) {
    if (depth > 64) throw new Error('Source control supports at most 64 directory levels.');
    const absolute = workspace.resolve(relative);
    for (const entry of await readdir(absolute, { withFileTypes: true })) {
      if (++count > 50000) throw new Error('Source control supports at most 50,000 workspace and metadata entries.');
      if (entry.name.toLowerCase() === '.git' && relative !== '.') throw new Error('Nested repositories and external Git directory pointers are not supported.');
      if (entry.isSymbolicLink()) throw new Error('Source control refuses symbolic links and directory junctions throughout its workspace and metadata.');
      if (entry.isDirectory()) await walk(relative === '.' ? entry.name : `${relative}/${entry.name}`, depth + 1);
      else if (!entry.isFile()) throw new Error('Source control accepts regular files and directories only.');
    }
  }
  await walk();
}
function filenames(workspace, paths) {
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > 1000) throw new Error('Choose between one and 1,000 saved files.');
  return [...new Set(paths.map(name => {
    if (typeof name !== 'string' || !name || name.length > 1024 || name.includes('\0')) throw new Error('Invalid source control path.');
    const absolute = workspace.resolve(name), relative = path.relative(workspace.root, absolute).replaceAll('\\', '/');
    if (!relative || relative.split('/').some(part => part === '.git' || part === '..') || path.isAbsolute(relative)) throw new Error('Source control paths must remain in the application workspace.');
    return relative;
  }))];
}
export function parseStatus(output) {
  const tokens = output.split('\0'), changes = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;
    if (token.length < 4 || token[2] !== ' ') throw new Error('Unexpected Git status response.');
    const index = token[0], working = token[1], name = token.slice(3);
    const item = { path: name, index, working, untracked: index === '?' && working === '?', conflict: index === 'U' || working === 'U' || ['DD', 'AA'].includes(index + working) };
    if (index === 'R' || index === 'C' || working === 'R' || working === 'C') {
      if (!tokens[i + 1]) throw new Error('Missing Git rename source.');
      item.originalPath = tokens[++i];
    }
    changes.push(item);
  }
  return changes;
}
async function status(workspace) {
  if (!await present(workspace)) return { initialized: false, changes: [], branches: [], history: [] };
  const changes = parseStatus(await command(workspace, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=all']));
  if (changes.length > 1000) throw new Error('Source control view supports at most 1,000 changed files.');
  let branch = (await command(workspace, ['symbolic-ref', '--quiet', '--short', 'HEAD']).catch(() => '')).trim() || '(detached HEAD)';
  let head = (await command(workspace, ['rev-parse', '--verify', 'HEAD']).catch(() => '')).trim() || null;
  const branches = (await command(workspace, ['for-each-ref', '--format=%(refname:short)', 'refs/heads'])).trim().split('\n').filter(Boolean);
  const identity = {};
  for (const key of ['name', 'email']) identity[key] = (await command(workspace, ['config', '--local', '--get', `user.${key}`]).catch(() => '')).trim();
  const history = [];
  if (head) {
    const values = (await command(workspace, ['log', '--no-show-signature', '-30', '--format=%H%x00%an%x00%ae%x00%aI%x00%s%x00'])).split('\0');
    for (let i = 0; i + 4 < values.length; i += 5) history.push({ id: values[i].trim(), author: values[i + 1], email: values[i + 2], authoredAt: values[i + 3], subject: values[i + 4] });
  }
  return { initialized: true, branch, head, changes, branches, identity, history };
}
async function neutralFilters(workspace) {
  const raw = await rawCommand(workspace, ['config', '--null', '--name-only', '--get-regexp', '^filter\\..*\\.(clean|smudge|process|required)$'], [], true);
  const keys = raw.split('\0').filter(Boolean);
  if (keys.some(key => /[\x00-\x20=]/.test(key))) throw new Error('Unsupported executable filter configuration name.');
  const names = new Set(keys.map(key => key.replace(/\.(?:clean|smudge|process|required)$/, '')));
  return [...names].flatMap(name => ['-c', `${name}.clean=`, '-c', `${name}.smudge=`, '-c', `${name}.process=`, '-c', `${name}.required=false`]);
}
function branchName(value) {
  if (typeof value !== 'string' || !value || value.length > 200 || value.startsWith('-') || /[\x00-\x20]/.test(value)) throw new Error('Choose a valid branch name.');
  return value;
}
export async function gitAction({ action, input = {}, workspace }) {
  if (action === 'gitStatus') return status(workspace);
  if (action === 'gitInitialize') {
    if (await present(workspace)) throw new Error('This workspace already has a repository.');
    await guardTree(workspace);
    await command(workspace, ['init', '--initial-branch=main', '.']);
    return status(workspace);
  }
  if (!await present(workspace)) throw new Error('Initialize this workspace repository first.');
  if (action === 'gitIdentity') {
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 200 || /[\r\n\0<>]/.test(input.name)) throw new Error('Enter a commit author name.');
    if (typeof input.email !== 'string' || input.email.length > 254 || !/^[^\s<>\0]+@[^\s<>\0]+$/.test(input.email)) throw new Error('Enter a commit author email.');
    await command(workspace, ['config', '--local', 'user.name', input.name.trim()]);
    await command(workspace, ['config', '--local', 'user.email', input.email]);
    return status(workspace);
  }
  if (action === 'gitStage') {
    const paths = filenames(workspace, input.paths);
    await command(workspace, ['add', '--', ...paths], await neutralFilters(workspace));
    return status(workspace);
  }
  if (action === 'gitUnstage') {
    const paths = filenames(workspace, input.paths);
    const head = (await command(workspace, ['rev-parse', '--verify', 'HEAD']).catch(() => '')).trim();
    await command(workspace, head ? ['restore', '--staged', '--', ...paths] : ['rm', '--cached', '--force', '--ignore-unmatch', '--', ...paths]);
    return status(workspace);
  }
  if (action === 'gitDiff') {
    const paths = input.paths ? filenames(workspace, input.paths) : [];
    const args = ['diff', '--no-ext-diff', '--no-textconv', '--no-color', '--ignore-submodules=all', ...(input.staged ? ['--cached'] : []), '--', ...paths];
    return { patch: await command(workspace, args) };
  }
  if (action === 'gitCommit') {
    if (typeof input.message !== 'string' || !input.message.trim() || Buffer.byteLength(input.message) > 10000 || input.message.includes('\0')) throw new Error('Enter a commit message of at most 10,000 bytes.');
    await command(workspace, ['commit', '--no-gpg-sign', '--no-verify', '-m', input.message]);
    return status(workspace);
  }
  if (action === 'gitBranch' || action === 'gitSwitch') {
    const name = branchName(input.name);
    await command(workspace, ['check-ref-format', '--branch', name]);
    await command(workspace, action === 'gitBranch' ? ['switch', '-c', name] : ['switch', '--', name], await neutralFilters(workspace));
    return status(workspace);
  }
  throw new Error(`Unknown source control action: ${action}`);
}
