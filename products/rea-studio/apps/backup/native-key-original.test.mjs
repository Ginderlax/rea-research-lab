// Source-authored comparison only. This module has not been imported, parsed,
// or executed locally. Run only after the complete candidate has been frozen
// and independently reviewed, in the supported Windows GitHub-hosted job.
// V2 preserves V1 as a draft and separates the deliberate repair-friendly app
// credential scan from upstream SearchKey's fatal non-authentication errors.
import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash, randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';

const PIN = Object.freeze({
  version: 'restic 0.19.1 compiled with go1.26.4 on windows/amd64',
  executable: 'restic_0.19.1_windows_amd64.exe',
  executableSHA256: 'b0dd1fd21eea5d8fe1325f55f7118213c21f36de8a261e04c0624a5ab9fd7830',
  archive: 'restic_0.19.1_windows_amd64.zip',
  archiveSHA256: 'da948ad707ed690426473aaba2046cd61f8f90f6f0e7dab6be0d5796531de67d',
  sourceCommit: '6aa3a516ce654808a1f28f9fa21e9b7c8e6e90bf',
});
const artifactRoot = fileURLToPath(new URL('../../../../projects/09-restic/artifacts/', import.meta.url));
const FIRST = Object.freeze({password: 'synthetic-native-key-original-first-2026', insecureNoPassword: false});
const SECOND = Object.freeze({password: 'synthetic-native-key-original-second-2026', insecureNoPassword: false});
const THIRD = Object.freeze({password: 'synthetic-native-key-original-third-2026', insecureNoPassword: false});
const FOURTH = Object.freeze({password: 'synthetic-native-key-original-fourth-2026', insecureNoPassword: false});
const WRONG = Object.freeze({password: 'synthetic-native-key-original-wrong-2026', insecureNoPassword: false});
const EMPTY = Object.freeze({password: '', insecureNoPassword: true});
const EMPTY_WITHOUT_FLAG = Object.freeze({password: '', insecureNoPassword: false});
const PAYLOAD = Buffer.concat([Buffer.from('Owned native-key interoperability fixture — 雪\n'), Buffer.from([0, 1, 127, 128, 254, 255])]);
const TEST_OPTIONS = Object.freeze({concurrency: false, timeout: 600000});
const activeOriginals = new Set();
let ownedRoot, realTemp, marker, executable, createWorkspace, handleNative, authenticated = false;

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const ordinal = (a, b) => a < b ? -1 : a > b ? 1 : 0;
function under(relative) {
  assert.equal(typeof relative, 'string');
  assert.match(relative, /^[a-z0-9-]+(?:\/[a-z0-9.-]+)*$/);
  assert.equal(relative.split('/').some(part => part === '.' || part === '..'), false);
  const target = path.resolve(ownedRoot, ...relative.split('/'));
  assert.ok(target.startsWith(ownedRoot + path.sep), 'Only descendants of this synthetic owned root are allowed');
  return target;
}
async function assertOwnedRoot() {
  assert.equal(path.dirname(ownedRoot), realTemp);
  assert.ok(path.basename(ownedRoot).startsWith('rea-native-key-original-'));
  const item = await fs.lstat(ownedRoot);
  assert.equal(item.isDirectory(), true); assert.equal(item.isSymbolicLink(), false);
  assert.equal(await fs.realpath(ownedRoot), ownedRoot);
  assert.equal(await fs.readFile(path.join(ownedRoot, '.owned-fixture'), 'utf8'), marker);
}
async function boundedFile(filename, cap) {
  const stat = await fs.lstat(filename);
  assert.equal(stat.isFile(), true); assert.equal(stat.isSymbolicLink(), false);
  assert.ok(stat.size <= cap, 'Input file exceeds this selected fixture limit');
  const bytes = await fs.readFile(filename); assert.equal(bytes.length, stat.size); return bytes;
}
function childEnvironment() {
  // Do not inherit RESTIC_*, NODE_*, command hooks, proxy settings, or a caller's
  // repository/password configuration. The sole backend below is our own path.
  const env = {};
  for (const key of ['SystemRoot', 'WINDIR', 'PATH', 'PATHEXT', 'COMSPEC', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA']) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  env.TEMP = ownedRoot; env.TMP = ownedRoot; env.TZ = 'UTC'; env.RESTIC_PROGRESS_FPS = '0';
  return env;
}
async function runBinary(args, {cwd = ownedRoot, input = Buffer.alloc(0)} = {}) {
  await assertOwnedRoot();
  assert.ok(cwd === ownedRoot || cwd.startsWith(ownedRoot + path.sep));
  assert.ok(Buffer.isBuffer(input) && input.length <= 64 * 1024);
  // execFile uses no shell. It bounds both captured streams, terminates this
  // directly-owned executable after 90 seconds, and completes after its close.
  return new Promise((resolve, reject) => {
    const child = execFile(executable, args, {cwd, env: childEnvironment(), shell: false, windowsHide: true,
      timeout: 90000, killSignal: 'SIGKILL', maxBuffer: 1024 * 1024, encoding: 'buffer'}, (error, stdout, stderr) => {
      activeOriginals.delete(child);
      if (error && (!Number.isInteger(error.code) || error.killed || error.signal)) return reject(error);
      resolve({code: error?.code ?? 0, stdout, stderr});
    });
    activeOriginals.add(child);
    child.stdin.on('error', error => { if (error.code !== 'EPIPE') child.kill('SIGKILL'); });
    child.stdin.end(input);
  });
}
function decode(bytes) { return new TextDecoder('utf-8', {fatal: true}).decode(bytes); }
function expectOriginal(result, code = 0, message) {
  assert.equal(result.code, code, decode(result.stderr));
  if (message) assert.match(decode(result.stderr) + decode(result.stdout), message);
  return result;
}
function publicResult(value) {
  const text = JSON.stringify(value);
  for (const credential of [FIRST, SECOND, THIRD, FOURTH, WRONG]) assert.equal(text.includes(credential.password), false);
  return value;
}

before(async () => {
  assert.equal(process.platform, 'win32', 'This frozen oracle is Windows amd64 only');
  assert.equal(process.arch, 'x64');
  assert.equal(process.version, 'v24.16.0');
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Run in the supported hosted workflow, not on the user machine');
  assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
  assert.equal(new Date().getTimezoneOffset(), 0, 'The selected key-list timestamp comparison requires a UTC hosted runner');
  realTemp = await fs.realpath(os.tmpdir());
  ownedRoot = await fs.realpath(await fs.mkdtemp(path.join(realTemp, 'rea-native-key-original-')));
  marker = randomUUID(); await fs.writeFile(path.join(ownedRoot, '.owned-fixture'), marker, {flag: 'wx', mode: 0o600});
  await fs.mkdir(under('fixtures'));
  const upstreamEXE = await boundedFile(path.join(artifactRoot, 'unpacked', PIN.executable), 64 * 1024 * 1024);
  const upstreamZIP = await boundedFile(path.join(artifactRoot, PIN.archive), 64 * 1024 * 1024);
  assert.equal(sha256(upstreamZIP), PIN.archiveSHA256);
  assert.equal(sha256(upstreamEXE), PIN.executableSHA256);
  executable = under('authenticated-original.exe');
  await fs.writeFile(executable, upstreamEXE, {flag: 'wx'});
  assert.equal(sha256(await boundedFile(executable, 64 * 1024 * 1024)), PIN.executableSHA256);
  // Hashes precede the sole identity query; exact version precedes every
  // repository command and all candidate module imports or app operations.
  const identity = expectOriginal(await runBinary(['version']));
  assert.equal(decode(identity.stdout).trim(), PIN.version);
  authenticated = true;
  ({createWorkspace} = await import('../../lib/storage.mjs'));
  ({handleNative} = await import('./restic.mjs'));
}, {timeout: 120000});

after(async () => {
  if (!ownedRoot) return;
  assert.equal(activeOriginals.size, 0, 'Do not remove a fixture containing a still-owned child process');
  await assertOwnedRoot();
  await fs.rm(ownedRoot, {recursive: true, force: false});
}, {timeout: 30000});

async function fixture(name, {origin = 'app', version = 2, access = FIRST} = {}) {
  assert.equal(authenticated, true);
  const root = under(`fixtures/${name}`); await fs.mkdir(root);
  const workspaceRoot = path.join(root, 'workspace'), workspace = await createWorkspace(workspaceRoot);
  const repo = workspace.resolve('native'), passwordFiles = new Map(); let passwordNumber = 0, restoreNumber = 0;
  async function passwordFile(credential) {
    if (!passwordFiles.has(credential.password)) {
      const filename = path.join(root, `password-${++passwordNumber}.txt`);
      await fs.writeFile(filename, Buffer.from(credential.password + '\n'), {flag: 'wx', mode: 0o600});
      passwordFiles.set(credential.password, filename);
    }
    return passwordFiles.get(credential.password);
  }
  async function original(args, credential = access, options = {}) {
    assert.equal(authenticated, true);
    const {keyHint, ...executionOptions} = options;
    const flags = ['--no-cache', '--repo', repo];
    if (keyHint !== undefined) { assert.match(keyHint, /^[a-f0-9]{64}$/); flags.push('--key-hint', keyHint); }
    if (credential.insecureNoPassword) flags.push('--insecure-no-password');
    if (!credential.insecureNoPassword || credential.password !== '') flags.push('--password-file', await passwordFile(credential));
    return runBinary([...flags, ...args], {cwd: workspaceRoot, ...executionOptions});
  }
  async function app(action, input = {}, credential = access) {
    // Recreate the workspace and Repository on every request: no unlocked
    // session or previously retained master key supplies later credentials.
    const reopened = await createWorkspace(workspaceRoot);
    return publicResult(await handleNative({action, input: {repository: 'native', ...credential, ...input}, workspace: reopened}));
  }
  async function newPasswordFlags(credential) {
    return credential.insecureNoPassword ? ['--new-insecure-no-password'] : ['--new-password-file', await passwordFile(credential)];
  }
  const f = {root, workspace, workspaceRoot, repo, access, app, original, passwordFile, newPasswordFlags,
    restoreDestination: () => `restored-${++restoreNumber}`};
  if (origin === 'app') f.initialized = await app('nativeInit', {version});
  else {
    expectOriginal(await original(['init', '--repository-version', String(version)]));
    f.initialized = await app('nativeInfo');
  }
  return f;
}
async function keyIDs(f) {
  const names = (await fs.readdir(path.join(f.repo, 'keys'))).sort();
  for (const name of names) assert.match(name, /^[a-f0-9]{64}$/);
  return names;
}
async function repositoryDigests(f, {includeKeys = true} = {}) {
  const output = {}, limit = {files: 0, bytes: 0};
  async function walk(relative) {
    const directory = relative ? path.join(f.repo, ...relative.split('/')) : f.repo;
    const entries = await fs.readdir(directory, {withFileTypes: true});
    for (const entry of entries.sort((a, b) => ordinal(a.name, b.name))) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      assert.equal(entry.isSymbolicLink(), false); assert.equal(entry.name.includes('/'), false); assert.equal(entry.name.includes('\\'), false);
      if (entry.isDirectory()) {
        if (['locks', 'tmp'].includes(name) || (!includeKeys && name === 'keys')) continue;
        await walk(name);
      } else {
        assert.equal(entry.isFile(), true); assert.ok(++limit.files <= 4096);
        const bytes = await boundedFile(path.join(f.repo, ...name.split('/')), 2 * 1024 * 1024);
        limit.bytes += bytes.length; assert.ok(limit.bytes <= 16 * 1024 * 1024);
        output[name] = {bytes: bytes.length, sha256: sha256(bytes)};
      }
    }
  }
  await walk(''); return output;
}
async function idle(f) {
  for (const name of ['locks', 'tmp']) {
    const directory = path.join(f.repo, name);
    try { assert.deepEqual(await fs.readdir(directory), []); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
async function stable(f, baseline) { assert.deepEqual(await repositoryDigests(f, {includeKeys: false}), baseline); await idle(f); }
function sortedKeyRows(rows, original) {
  assert.ok(Array.isArray(rows));
  return rows.map(row => {
    assert.match(row.id, /^[a-f0-9]{64}$/); assert.equal(typeof row.current, 'boolean');
    assert.equal(typeof row.userName, 'string'); assert.equal(typeof row.hostName, 'string');
    const timestamp = original ? row.created.replace(' ', 'T') + 'Z' : row.created;
    const seconds = Math.floor(Date.parse(timestamp) / 1000); assert.ok(Number.isFinite(seconds));
    return {id: row.id, current: row.current, userName: row.userName, hostName: row.hostName, createdSecondUTC: seconds};
  }).sort((a, b) => ordinal(a.id, b.id));
}
async function compareLists(f, credential = f.access, {warningID, originalKeyHint} = {}) {
  const app = await f.app('nativeKeyList', {}, credential);
  // Healthy comparisons are deliberately unhinted. With damaged unrelated
  // keys, authenticate the original using the explicit known healthy ID so
  // list presentation can be compared without assuming backend search order.
  if (warningID) assert.equal(originalKeyHint, app.currentKeyID);
  else assert.equal(originalKeyHint, undefined);
  const original = expectOriginal(await f.original(['--json', 'key', 'list'], credential, {keyHint: originalKeyHint}));
  const rows = JSON.parse(decode(original.stdout));
  assert.deepEqual(sortedKeyRows(app.keys, false), sortedKeyRows(rows, true));
  assert.deepEqual(app.keys.filter(row => row.current).map(row => row.id), [app.currentKeyID]);
  assert.equal(rows.filter(row => row.current).length, 1);
  if (warningID) {
    assert.equal(app.keys.some(row => row.id === warningID), false);
    assert.ok(app.keyWarnings.some(row => row.id === warningID && typeof row.message === 'string' && row.message.length));
    assert.match(decode(original.stderr), /LoadKey\(\) failed:/);
  } else assert.deepEqual(app.keyWarnings ?? [], []);
  return app;
}
async function appSnapshot(f, credential = f.access) {
  await fs.mkdir(f.workspace.resolve('source'));
  await fs.writeFile(f.workspace.resolve('source/payload.bin'), PAYLOAD, {flag: 'wx'});
  return {...await f.app('nativeSnapshot', {source: 'source'}, credential), relativeFile: 'source/payload.bin'};
}
async function originalSnapshot(f, credential = f.access) {
  const result = expectOriginal(await f.original(['--json', 'backup', '--stdin', '--stdin-filename', 'payload.bin'], credential, {input: PAYLOAD}));
  const summaries = decode(result.stdout).trim().split(/\r?\n/).map(line => JSON.parse(line)).filter(row => row.message_type === 'summary');
  assert.equal(summaries.length, 1); assert.match(summaries[0].snapshot_id, /^[a-f0-9]{64}$/);
  return {id: summaries[0].snapshot_id, relativeFile: 'payload.bin'};
}
async function verifyReaders(f, snapshot, credential, baseline) {
  await stable(f, baseline);
  assert.equal((await f.app('nativeCheck', {id: snapshot.id}, credential)).verified, true);
  expectOriginal(await f.original(['check', '--read-data'], credential));
  const destination = f.restoreDestination();
  const restored = await f.app('nativeRestore', {id: snapshot.id, destination, confirm: true}, credential);
  assert.equal(restored.verified, true);
  assert.deepEqual(await fs.readFile(f.workspace.resolve(`${destination}/${snapshot.relativeFile}`)), PAYLOAD);
  const originalTarget = path.join(f.root, f.restoreDestination());
  expectOriginal(await f.original(['restore', snapshot.id, '--target', originalTarget], credential));
  assert.deepEqual(await fs.readFile(path.join(originalTarget, ...snapshot.relativeFile.split('/'))), PAYLOAD);
  await stable(f, baseline);
}
async function appAdd(f, access, chosen, extra = {}) {
  const result = await f.app('nativeKeyAdd', {newPassword: chosen.password, newPasswordConfirm: chosen.password,
    newInsecureNoPassword: chosen.insecureNoPassword, username: 'Owned App User 雪', hostname: 'owned-app-host', ...extra}, access);
  assert.equal(result.oldKeyRemoved, false); assert.equal(result.newKeyVerified, true);
  assert.equal(result.masterKeyPreserved, true); assert.equal(result.configUnchanged, true);
  assert.match(result.keyID, /^[a-f0-9]{64}$/); return result;
}
async function originalMutation(f, access, command, chosen) {
  const before = await keyIDs(f);
  const args = ['key', command, ...await f.newPasswordFlags(chosen), '--user', 'Owned Original User 雪', '--host', 'owned-original-host'];
  expectOriginal(await f.original(args, access));
  const after = await keyIDs(f), added = after.filter(id => !before.includes(id));
  assert.equal(added.length, 1); return added[0];
}
async function wrongOriginal(f, args, credential = WRONG) {
  const before = await repositoryDigests(f);
  expectOriginal(await f.original(args, credential), 12, /wrong password|no key found|unable to open/i);
  assert.deepEqual(await repositoryDigests(f), before); await idle(f);
}
async function rawOwnedKey(f, bytes) {
  assert.ok(Buffer.isBuffer(bytes) && bytes.length <= 64 * 1024);
  const id = sha256(bytes); await fs.writeFile(path.join(f.repo, 'keys', id), bytes, {flag: 'wx'}); return id;
}

test('pinned app-v2 repository accepts original key add/passwd and original reopens app passwd/remove with unchanged snapshot data', TEST_OPTIONS, async () => {
  const f = await fixture('app-v2'), snapshot = await appSnapshot(f), baseline = await repositoryDigests(f, {includeKeys: false});
  const initial = f.initialized.keyID;
  await compareLists(f);
  const originalAdded = await originalMutation(f, FIRST, 'add', SECOND);
  await stable(f, baseline); assert.equal((await compareLists(f, SECOND)).currentKeyID, originalAdded);
  const changed = await f.app('nativeKeyPasswd', {newPassword: THIRD.password, newPasswordConfirm: THIRD.password, confirm: true}, SECOND);
  assert.equal(changed.previousKeyID, originalAdded); assert.equal(changed.oldKeyRemoved, true); assert.equal(changed.newKeyVerified, true);
  assert.deepEqual(await keyIDs(f), [initial, changed.keyID].sort()); await stable(f, baseline);
  await wrongOriginal(f, ['key', 'list'], SECOND);
  assert.equal((await compareLists(f, THIRD)).currentKeyID, changed.keyID);
  const originalChanged = await originalMutation(f, THIRD, 'passwd', FOURTH);
  assert.deepEqual(await keyIDs(f), [initial, originalChanged].sort()); await stable(f, baseline);
  await assert.rejects(f.app('nativeInfo', {}, THIRD), /authentication failed/);
  const removed = await f.app('nativeKeyRemove', {keyID: initial, confirm: true}, FOURTH);
  assert.equal(removed.removedKeyID, initial); assert.equal(removed.currentKeyID, originalChanged);
  assert.equal(removed.configUnchanged, true); assert.deepEqual(await keyIDs(f), [originalChanged]);
  await compareLists(f, FOURTH); await verifyReaders(f, snapshot, FOURTH, baseline);
});

test('pinned original-v1 repository accepts app key add while original remove/passwd preserve app-readable snapshot bytes', TEST_OPTIONS, async () => {
  const f = await fixture('original-v1', {origin: 'original', version: 1});
  const snapshot = await originalSnapshot(f), baseline = await repositoryDigests(f, {includeKeys: false}), initial = f.initialized.keyID;
  const appAdded = await appAdd(f, FIRST, SECOND);
  assert.equal((await compareLists(f, SECOND)).currentKeyID, appAdded.keyID); await stable(f, baseline);
  expectOriginal(await f.original(['key', 'remove', initial], SECOND));
  assert.deepEqual(await keyIDs(f), [appAdded.keyID]); await stable(f, baseline);
  await assert.rejects(f.app('nativeInfo', {}, FIRST), /authentication failed/);
  const other = await appAdd(f, SECOND, THIRD), changed = await originalMutation(f, SECOND, 'passwd', FOURTH);
  assert.deepEqual(await keyIDs(f), [other.keyID, changed].sort()); await stable(f, baseline);
  expectOriginal(await f.original(['key', 'remove', other.keyID], FOURTH));
  assert.deepEqual(await keyIDs(f), [changed]); await stable(f, baseline);
  await assert.rejects(f.app('nativeInfo', {}, SECOND), /authentication failed/);
  await wrongOriginal(f, ['key', 'list'], THIRD);
  assert.equal((await compareLists(f, FOURTH)).currentKeyID, changed);
  await verifyReaders(f, snapshot, FOURTH, baseline);
});

test('wrong passwords and current-key removal fail in both implementations without mutating any repository object', TEST_OPTIONS, async () => {
  const f = await fixture('wrong-password'), snapshot = await appSnapshot(f), baseline = await repositoryDigests(f, {includeKeys: false});
  const added = await appAdd(f, FIRST, SECOND), before = await repositoryDigests(f);
  for (const [action, input] of [
    ['nativeKeyList', {}],
    ['nativeKeyAdd', {newPassword: THIRD.password, newPasswordConfirm: THIRD.password}],
    ['nativeKeyPasswd', {newPassword: THIRD.password, newPasswordConfirm: THIRD.password, confirm: true}],
    ['nativeKeyRemove', {keyID: added.keyID, confirm: true}],
  ]) {
    await assert.rejects(f.app(action, input, WRONG), /authentication failed/);
    assert.deepEqual(await repositoryDigests(f), before); await idle(f);
  }
  const newFlags = await f.newPasswordFlags(THIRD);
  for (const args of [['key', 'list'], ['key', 'add', ...newFlags], ['key', 'passwd', ...newFlags], ['key', 'remove', added.keyID]]) await wrongOriginal(f, args);
  await assert.rejects(f.app('nativeKeyRemove', {keyID: f.initialized.keyID, confirm: true}), /currently used/);
  expectOriginal(await f.original(['key', 'remove', f.initialized.keyID]), 1, /currently used/);
  assert.deepEqual(await repositoryDigests(f), before); await verifyReaders(f, snapshot, FIRST, baseline);
});

test('Go missing and null key metadata reopen with zero-time and empty labels in both readers', TEST_OPTIONS, async () => {
  const f = await fixture('go-metadata'), snapshot = await appSnapshot(f), baseline = await repositoryDigests(f, {includeKeys: false});
  let current = f.initialized.keyID;
  for (const kind of ['missing', 'null']) {
    const document = JSON.parse(decode(await boundedFile(path.join(f.repo, 'keys', current), 64 * 1024)));
    for (const name of ['created', 'username', 'hostname']) { if (kind === 'missing') delete document[name]; else document[name] = null; }
    const replacement = await rawOwnedKey(f, Buffer.from(JSON.stringify(document)));
    assert.notEqual(replacement, current); await fs.unlink(path.join(f.repo, 'keys', current)); current = replacement;
    const listed = await compareLists(f);
    assert.equal(listed.currentKeyID, replacement); assert.equal(listed.keys[0].created, '0001-01-01T00:00:00Z');
    assert.equal(listed.keys[0].userName, ''); assert.equal(listed.keys[0].hostName, '');
    assert.equal((await f.app('nativeInfo')).keyID, replacement); await stable(f, baseline);
    expectOriginal(await f.original(['check', '--read-data']));
  }
  await verifyReaders(f, snapshot, FIRST, baseline);
});

test('an unrelated damaged key is warned and skipped by list and can be removed by either implementation', TEST_OPTIONS, async () => {
  const f = await fixture('damaged-key'), snapshot = await appSnapshot(f), baseline = await repositoryDigests(f, {includeKeys: false});
  const badOriginal = await rawOwnedKey(f, Buffer.from('{ owned malformed key, original removal\n'));
  await compareLists(f, FIRST, {warningID: badOriginal, originalKeyHint: f.initialized.keyID}); await stable(f, baseline);
  // A damaged display record must not block adding an unrelated valid key.
  const added = await appAdd(f, FIRST, SECOND); await compareLists(f, SECOND, {warningID: badOriginal, originalKeyHint: added.keyID});
  expectOriginal(await f.original(['key', 'remove', badOriginal], SECOND, {keyHint: added.keyID}));
  assert.equal((await keyIDs(f)).includes(badOriginal), false); await stable(f, baseline);
  const badApp = await rawOwnedKey(f, Buffer.from('{ owned malformed key, app removal\n'));
  await compareLists(f, SECOND, {warningID: badApp, originalKeyHint: added.keyID});
  const removed = await f.app('nativeKeyRemove', {keyID: badApp, confirm: true}, SECOND);
  assert.equal(removed.removedKeyID, badApp); assert.equal(removed.currentKeyID, added.keyID);
  assert.equal(removed.keyRemoved, true); assert.equal(removed.postRemovalVerified, true);
  assert.deepEqual(await keyIDs(f), [f.initialized.keyID, added.keyID].sort());
  await compareLists(f, SECOND); await verifyReaders(f, snapshot, SECOND, baseline);
});

test('a sole-key Go display-type error is upstream-fatal while the app can authenticate and report its explicit metadata warning', TEST_OPTIONS, async () => {
  const f = await fixture('sole-key-type-difference'), snapshot = await appSnapshot(f);
  const baseline = await repositoryDigests(f, {includeKeys: false}), initial = f.initialized.keyID;
  const document = JSON.parse(decode(await boundedFile(path.join(f.repo, 'keys', initial), 64 * 1024)));
  document.username = 42;
  const damaged = await rawOwnedKey(f, Buffer.from(JSON.stringify(document)));
  await fs.unlink(path.join(f.repo, 'keys', initial));
  assert.deepEqual(await keyIDs(f), [damaged]);
  // One key makes the upstream failure independent of unsorted local-backend
  // Readdir order. Go LoadKey rejects number -> string; the app intentionally
  // ignores display metadata while authenticating the unchanged wrapping.
  const beforeFailure = await repositoryDigests(f);
  expectOriginal(await f.original(['key', 'list']), 1, /cannot unmarshal number.*username.*string|Unmarshal/i);
  assert.deepEqual(await repositoryDigests(f), beforeFailure); await idle(f);
  assert.equal((await f.app('nativeInfo')).keyID, damaged);
  const listed = await f.app('nativeKeyList');
  assert.equal(listed.currentKeyID, damaged); assert.deepEqual(listed.keys, []);
  assert.deepEqual(listed.keyWarnings, [{id: damaged, message: 'Invalid restic key metadata.'}]);
  assert.equal((await f.app('nativeCheck', {id: snapshot.id})).verified, true);
  const destination = f.restoreDestination();
  assert.equal((await f.app('nativeRestore', {id: snapshot.id, destination, confirm: true})).verified, true);
  assert.deepEqual(await fs.readFile(f.workspace.resolve(`${destination}/${snapshot.relativeFile}`)), PAYLOAD);
  await stable(f, baseline);
  // Fixture-only metadata repair restores Go readability. This does not claim
  // an app repair feature, general error parity, superiority, or a sorted
  // original key search. The encrypted key data and snapshot bytes are exact.
  document.username = 'Owned Metadata Repaired';
  const repaired = await rawOwnedKey(f, Buffer.from(JSON.stringify(document)));
  await fs.unlink(path.join(f.repo, 'keys', damaged));
  assert.deepEqual(await keyIDs(f), [repaired]);
  await compareLists(f); await verifyReaders(f, snapshot, FIRST, baseline);
});

test('new empty-password flags interoperate both ways and neither app flag silently discards a nonempty password', TEST_OPTIONS, async () => {
  const f = await fixture('empty-new-key'), snapshot = await appSnapshot(f), baseline = await repositoryDigests(f, {includeKeys: false});
  const before = await repositoryDigests(f), emptyFile = await f.passwordFile(EMPTY_WITHOUT_FLAG), nonemptyFile = await f.passwordFile(SECOND);
  for (const command of ['add', 'passwd']) {
    expectOriginal(await f.original(['key', command, '--new-password-file', emptyFile]), 1, /empty password.*not allowed|new-insecure-no-password/i);
    expectOriginal(await f.original(['key', command, '--new-insecure-no-password', '--new-password-file', nonemptyFile]), 1, /only either/);
    assert.deepEqual(await repositoryDigests(f), before);
  }
  for (const action of ['nativeKeyAdd', 'nativeKeyPasswd']) for (const input of [
    {newPassword: '', newPasswordConfirm: ''},
    {newPassword: SECOND.password, newPasswordConfirm: SECOND.password, newInsecureNoPassword: true},
    {newPassword: SECOND.password, newPasswordConfirm: SECOND.password, newInsecureNoPassword: 'true'},
    {newPassword: SECOND.password, newPasswordConfirm: SECOND.password, insecureNoPassword: true},
    {newPassword: SECOND.password, newPasswordConfirm: SECOND.password, insecureNoPassword: 'true'},
  ]) {
    await assert.rejects(f.app(action, {...input, confirm: true}), /password|boolean/);
    assert.deepEqual(await repositoryDigests(f), before); await idle(f);
  }
  const empty = await appAdd(f, FIRST, EMPTY); assert.equal(empty.insecureEmptyPassword, true);
  assert.equal((await compareLists(f, EMPTY)).currentKeyID, empty.keyID); await stable(f, baseline);
  const withEmpty = await repositoryDigests(f);
  await assert.rejects(f.app('nativeKeyList', {}, EMPTY_WITHOUT_FLAG), /nonempty/);
  await assert.rejects(f.app('nativeKeyList', {}, {...FIRST, insecureNoPassword: true}), /empty password field/);
  const denied = await f.original(['key', 'list'], EMPTY_WITHOUT_FLAG);
  assert.notEqual(denied.code, 0); assert.match(decode(denied.stderr), /empty password|insecure-no-password|unable to read.*password/i);
  const conflicting = await f.original(['key', 'list'], {...FIRST, insecureNoPassword: true});
  assert.notEqual(conflicting.code, 0); assert.match(decode(conflicting.stderr), /insecure-no-password.*password|password.*insecure-no-password/i);
  assert.deepEqual(await repositoryDigests(f), withEmpty);
  const originalChanged = await originalMutation(f, EMPTY, 'passwd', SECOND);
  assert.equal((await keyIDs(f)).includes(empty.keyID), false); assert.equal((await compareLists(f, SECOND)).currentKeyID, originalChanged);
  const originalEmpty = await originalMutation(f, SECOND, 'add', EMPTY);
  assert.equal((await compareLists(f, EMPTY)).currentKeyID, originalEmpty);
  const appChanged = await f.app('nativeKeyPasswd', {newPassword: THIRD.password, newPasswordConfirm: THIRD.password, confirm: true}, EMPTY);
  assert.equal(appChanged.previousKeyID, originalEmpty); assert.equal(appChanged.oldKeyRemoved, true);
  await assert.rejects(f.app('nativeInfo', {}, EMPTY), /authentication failed/);
  assert.equal((await compareLists(f, THIRD)).currentKeyID, appChanged.keyID);
  const originalEmptyPasswd = await originalMutation(f, THIRD, 'passwd', EMPTY);
  assert.equal((await compareLists(f, EMPTY)).currentKeyID, originalEmptyPasswd); await stable(f, baseline);
  const appSecureAgain = await f.app('nativeKeyPasswd', {newPassword: FOURTH.password, newPasswordConfirm: FOURTH.password, confirm: true}, EMPTY);
  assert.equal(appSecureAgain.previousKeyID, originalEmptyPasswd);
  const appEmptyPasswd = await f.app('nativeKeyPasswd', {newPassword: '', newPasswordConfirm: '', newInsecureNoPassword: true, confirm: true}, FOURTH);
  assert.equal(appEmptyPasswd.previousKeyID, appSecureAgain.keyID); assert.equal(appEmptyPasswd.insecureEmptyPassword, true);
  assert.equal((await compareLists(f, EMPTY)).currentKeyID, appEmptyPasswd.keyID);
  await verifyReaders(f, snapshot, EMPTY, baseline);
});

test('explicitly empty initial repositories gain password keys in either direction and retain readable existing data', TEST_OPTIONS, async () => {
  for (const origin of ['app', 'original']) {
    const f = await fixture(`${origin}-empty-initial`, {origin, version: origin === 'app' ? 1 : 2, access: EMPTY});
    const snapshot = await appSnapshot(f, EMPTY), baseline = await repositoryDigests(f, {includeKeys: false});
    if (origin === 'app') await originalMutation(f, EMPTY, 'add', SECOND);
    else await appAdd(f, EMPTY, SECOND);
    await compareLists(f, SECOND); await verifyReaders(f, snapshot, SECOND, baseline);
    await compareLists(f, EMPTY); await stable(f, baseline);
  }
});
