// Hosted publication metadata producer. No commit, push, finalizer or product suite.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { runPublicationControls } from './publication-integrity-controls.mjs';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
assert.equal(process.env.CI, 'true'); assert.equal(process.env.GITHUB_ACTIONS, 'true'); assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
for (const name of ['RUNNER_TEMP', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY']) assert.ok(process.env[name]);
assert.match(process.env.GITHUB_SHA, /^[0-9a-f]{40}$/); assert.match(process.env.GITHUB_RUN_ID, /^\d+$/); assert.match(process.env.GITHUB_RUN_ATTEMPT, /^\d+$/);
assert.equal(process.env.GITHUB_REPOSITORY, 'Ginderlax/rea-research-lab');
assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--evidence'); assert.ok(path.isAbsolute(process.argv[3]));
const temporary = fs.realpathSync(process.env.RUNNER_TEMP), evidence = path.resolve(process.argv[3]);
const evidenceRelative = path.relative(temporary, evidence);
assert.ok(evidenceRelative && evidenceRelative !== '..' && !evidenceRelative.startsWith('..' + path.sep) && !path.isAbsolute(evidenceRelative));
assert.equal(fs.existsSync(evidence), false); fs.mkdirSync(evidence); assert.equal(fs.realpathSync(evidence).toLowerCase(), evidence.toLowerCase());
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = bytes => ({ bytes: bytes.length, sha256: sha(bytes) });
const DERIVED = ['PUBLICATION-MANIFEST.json', 'VALIDATION.json'];
const REVIEWED = {
  'scripts/verify-editor-save-followup.mjs': [8581, '2e32b4443efc07aa4a7d14a32629e2009ab94671cace973324ca5cd126c1dce8'],
  'products/rea-studio/results/publication-editor-save-git-closure-20261015/failed-publication-attempt.json.snapshot': [2488, 'e8b877d8a0e28048a6cab3a9e41ebb00492a1776357fd3c0b1729a4acd9eab73'],
  'products/rea-studio/results/publication-editor-save-git-closure-20261015/failed-publication-write.stderr.txt.snapshot': [1849, '5db76577828ac6fd87f12860dcbff9707c77af3d6bc20071bd29fd8c3c74f00a'],
  'products/rea-studio/results/publication-editor-save-git-closure-20261015/passed26-controls.json.snapshot': [10693, 'fe590260050944d444f16657842819731eff07d1d71eb7a2c7f75bf96b5c8806'],
  'products/rea-studio/results/publication-editor-save-git-closure-20261015/preservation-manifest.json': [3291, '543db5761be73b19447bb6d0d9113efd77d80c105a3c894a38baa524a27d76c9'],
  'products/rea-studio/results/publication-editor-save-git-closure-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot': [50750, '8e72b3b70a9b44d1ef5ab33c11a7c28a0cda90d79f22375771a2a4dceee22f48'],
  'products/rea-studio/results/publication-editor-save-git-closure-20261015/verifier-before/verify-editor-save-followup.mjs.snapshot': [7424, 'fb3f465eaaefab1197c170410355f30764308e3f5b4e58e30d0c8059fe3e96c3'],
  'scripts/verify-records.mjs': [148351, 'a81c2f4b53fd346a6b86e4dcb63c9b39fb07a4f1e551bcfdbc3c755fce394046'],
  'scripts/editor-vault-proof-migration.mjs': [69184, 'c9fe15f147349c9be6565cfaa3d6316a808a2a8d21d76e753601886f8d80e5c2'],
  'scripts/verify-cloud-recovery-records.mjs': [15778, '405c90ac8c68acdc2b281e9563637cc391e1e0574705c1cbcdf7be8e1f794482'],
  'products/rea-studio/results/cloud-publication-source-transition-20261015/preservation-manifest.json': [3069, '8daf5506d935254110dadf2c32e394d6b02f773692867b3a30120a14055ee576'],
  'products/rea-studio/results/cloud-publication-source-transition-20261015/verifier-middle/verify-records.mjs.snapshot': [142684, '42f2c1c25325867d9b366a71d9e17e87349fe258cdb1b24f9f5f5585b38d77c6'],
  'products/rea-studio/results/cloud-publication-source-transition-20261015/verifier-middle/editor-vault-proof-migration.mjs.snapshot': [47841, '3d0a4ee0b5e9eef36c357c9a3c6170008a2bb0882cc8a755756358aabdf6ced1'],
  'scripts/verify-followup-records.mjs': [45876, '856eeba61b820260f7e1bdc8d9bb9e8924e3ae3183a0c3c0495471e6152a8b5f'],
  'products/rea-studio/results/publication-git-directory-closure-20261015/preservation-manifest.json': [7382, '37b34ad5324719094e9842343d7649af4ffbd5606f47488137e04a6ee380e49b'],
  'products/rea-studio/results/publication-git-directory-closure-20261015/payload/d29210777777dac0b3d12f6a656a073c9ba717cf6932dbc01b0cc6dc1e7779b8.snapshot': [7, 'd29210777777dac0b3d12f6a656a073c9ba717cf6932dbc01b0cc6dc1e7779b8'],
  'products/rea-studio/results/publication-git-directory-closure-20261015/verifier-before/verify-followup-records.mjs.snapshot': [37879, '92a23a59963713966f8e6c630ea6f89e2dfe8248d8dadfacd662bf349bcd6f7e'],
  'products/rea-studio/results/publication-git-directory-closure-20261015/failed-publication-attempt.json.snapshot': [2450, '52c79743bf97f55243d8f556801a4d70e9b95a95c2696da378a8141d8e516e3e'],
  'products/rea-studio/results/publication-git-directory-closure-20261015/passed21-controls.json.snapshot': [8748, '5e5a2b99bad3c5969bd6c15ecedceb8e12a39e9ad631b62e2c3af5e951de8e66'],
  'products/rea-studio/results/publication-git-directory-closure-20261015/failed-publication-write.stderr.txt.snapshot': [18720, '70f73fbb752aff2329e2ea3b21a7f0cd2ae5df218020a788b2d14dc771d9f599'],
  'products/rea-studio/results/publication-git-directory-closure-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot': [49253, '4175770874c4e00e0c22f13741e4224f28bc933e4447cd78adb889bac01dc81f'],
  'products/rea-studio/results/windows-path-source-transition-20261015/preservation-manifest.json': [5631, 'eda0b8a73da84ba425d726760b76868ddd4c4aced8130d55f79f626b659ba385'],
  'products/rea-studio/results/windows-path-source-transition-20261015/after/products/rea-studio/apps/editor/git.test.mjs.snapshot': [11853, 'c40c070ab2dc74e6d1de1d8b80a02744740864b566d2e5de695baf3ca00da3a2'],
  'products/rea-studio/results/windows-path-source-transition-20261015/after/products/rea-studio/apps/sync/dav-transfer.mjs.snapshot': [15511, 'fa04b006d713e493827540fa04bf5e420762b5dd0bfe33e3b2e23d43c909dbbc'],
  'products/rea-studio/results/windows-path-source-transition-20261015/after/products/rea-studio/apps/sync/webdav.windows-path.test.mjs.snapshot': [6871, 'd8cf54ed4c03321c7782c2f23fd9b3d390ea1e6660d90087183d8d528a1f4c7c'],
  'products/rea-studio/results/windows-path-source-transition-20261015/before/products/rea-studio/apps/editor/git.test.mjs.snapshot': [11458, 'ab8213c182d1568254ea73db57133affbd48304b98f0d275d27c1fcf8b33f0cc'],
  'products/rea-studio/results/windows-path-source-transition-20261015/before/products/rea-studio/apps/sync/dav-transfer.mjs.snapshot': [14717, '591146243ed9b378aed70ce4beedceeec1b12319d7747b1e21fad2282286c9bb'],
  'products/rea-studio/results/windows-path-source-transition-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot': [50750, '8e72b3b70a9b44d1ef5ab33c11a7c28a0cda90d79f22375771a2a4dceee22f48'],
  'products/rea-studio/results/windows-path-source-transition-20261015/verifier-before/verify-records.mjs.snapshot': [147529, '82fc7f36c0805ee163a93aa1720ed708629ac455d90a9bdd343b30f554335304'],
  'products/rea-studio/results/windows-path-source-transition-20261015/verifier-before/editor-vault-proof-migration-editor-save-closure.mjs.snapshot': [52393, 'f0c0b3e47c153e31764686f14d07834ad27f40bf82fe35f4c1ad6fb6dcff7651'],
  'products/rea-studio/results/cloud-windows-path-finite-pass-20261015/preservation-manifest.json': [78616, 'ffe6e1976f896cb50991460f598f8cb714762c6eff42087896e0096ae22d9b1d'],
  'products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/126e1a9fb2e939ab8a767b6facd723cb823505846711de4114d6c560a6861212.snapshot': [85162, '126e1a9fb2e939ab8a767b6facd723cb823505846711de4114d6c560a6861212'],
  'products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/41d3a9da24ee7effedbd2af7bc6dd6952a5a59895edc92b5cff7f8a33cba72c0.snapshot': [4234, '41d3a9da24ee7effedbd2af7bc6dd6952a5a59895edc92b5cff7f8a33cba72c0'],
  'products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/41f2b7950a3fa24d278bd5f6b912bdf221a8f7ee7af8eaa70a5a6201ae2406f2.snapshot': [144298, '41f2b7950a3fa24d278bd5f6b912bdf221a8f7ee7af8eaa70a5a6201ae2406f2'],
  'products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/7774bfa56f708adbe35eacebc21385a9eed56175e2df6f67c8fec0350af4b7b0.snapshot': [4286, '7774bfa56f708adbe35eacebc21385a9eed56175e2df6f67c8fec0350af4b7b0'],
  'products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/adf03e13193e81997ee515bb0e0c4ea4f790120c35ff5bf351f5a5b19bce4ea1.snapshot': [3167, 'adf03e13193e81997ee515bb0e0c4ea4f790120c35ff5bf351f5a5b19bce4ea1'],
  'products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/d5b87bec1e71b8ca96821de21fa2d6c7520586cf0cef4cdfa0f28392f5504dca.snapshot': [11300, 'd5b87bec1e71b8ca96821de21fa2d6c7520586cf0cef4cdfa0f28392f5504dca'],
  'products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.snapshot': [0, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/preservation-manifest.json': [4222, '0fde86c42377c6267ba08dfa11366582d9f4d8ed9662a6a566619d5f0015c3b5'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot': [67667, '2be4c15851395d5e537d5cc0f031fd53fcf09e7db2659a169907a03f7f7725e2'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/workflow-before/publication-integrity-cloud.yml.snapshot': [5654, '03204750f68365bac66221b73aa47435cd1556f968947967b74a45b3d8278be4'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/attempt-validation.json.snapshot': [2488, '8a57203e9c1aa6e8fd652f397e9160a3f07a9666aa8759457762a4814d9baa42'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/controls.json.snapshot': [27379, '1c7e155df622d1dc772213b641c52604b37eb6c82a57df2c58f56b1a6bde4bcd'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/events.jsonl.snapshot': [39406, 'e2515ece6446363d021bd271fd6acdec0d898bab90939a345eb741b5ad63f3a7'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/publication-write.stderr.txt.snapshot': [4787, '9b8d0b0e3d24a912b3e5816a82dee369c4e310f5b508313cc149416e1f3fcb76'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/storage-failure.json.snapshot': [400, '4f4a3daf42ae421324e3bcf51ab40c19a92d58165fb2c2a2a68b421d82c57763'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/workflow-attempt.json.snapshot': [419, '903841dc5e67ab46e4e86e0ab83bb90e10392cfef3a9c208c4115da9f7b3d34c'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/wrapper-job-116702343166.log.snapshot': [29564, '06cf6158b6dfb691ff5a3c02af2a8eefff3b4b918b635438efcc2fd65f9dabbd'],
};
const receipt = { schema: 'rea-hosted-publication-validation-attempt/v1', status: 'running', startedAtUtc: new Date().toISOString(),
  scope: 'Publication integrity, syntax, links, credential patterns, immutable historical sources and finite cloud records; no behavioral-suite rerun.',
  execution: Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_REPOSITORY', 'GITHUB_REF', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT'].map(name => [name, process.env[name] ?? null])),
  runtime: process.version, sourceRoot: root, sourceCommit: process.env.GITHUB_SHA, candidateOverlay: false, phases: [],
  historicalReceiptsRewritten: false, fullDevelopmentSuiteAcceptance: false, fullParity: false, superiority: false, applicationTestsExecuted: 0, originalExecutions: 0 };
const events = fs.openSync(path.join(evidence, 'events.jsonl'), 'wx'); let sequence = 0, interrupted = null, activeStop = null;
function event(type, details = {}) { fs.writeFileSync(events, JSON.stringify({ sequence: ++sequence, at: new Date().toISOString(), type, ...details }) + '\n'); fs.fsyncSync(events); }
function save() { const target = path.join(evidence, 'attempt-validation.json'), temporary = target + '.tmp', fd = fs.openSync(temporary, 'wx'); try { fs.writeFileSync(fd, JSON.stringify(receipt, null, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } fs.renameSync(temporary, target); }
function write(name, bytes) { const target = path.join(evidence, name); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes, { flag: 'wx' }); }
function live() { assert.equal(interrupted, null, 'Interrupted: ' + interrupted); }
function git(argv, allowDetached = false) {
  const result = spawnSync('git', argv, { cwd: root, shell: false, windowsHide: true, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' } });
  if (allowDetached && result.status === 1) return null; assert.equal(result.status, 0, result.stderr || result.error?.message); return result.stdout;
}
function safe(name) { assert.ok(typeof name === 'string' && name && name.length <= 4096 && !/[\\:\x00-\x1f\x7f]/.test(name) && !name.startsWith('/') && name.split('/').every(part => part && part !== '.' && part !== '..')); return name; }
function publicFile(name) { safe(name); let target = root; for (const part of name.split('/')) { target = path.join(target, part); assert.equal(fs.lstatSync(target).isSymbolicLink(), false); } const stat = fs.lstatSync(target); assert.ok(stat.isFile() && stat.size <= 32 * 1024 * 1024); return target; }
const handlers = new Map(['SIGINT', 'SIGTERM', 'SIGBREAK'].map(signal => [signal, () => { interrupted = signal; activeStop?.('received ' + signal); }]));
for (const [signal, handler] of handlers) process.on(signal, handler);
for (const stream of [process.stdout, process.stderr]) stream.on('error', () => {});
save(); event('running');

async function child(name, argv) {
  live(); const row = { name, status: 'running', command: [process.execPath, ...argv], startedAtUtc: new Date().toISOString(), timeoutMs: 20 * 60000,
    stdoutBytes: 0, stderrBytes: 0, droppedBytes: 0, stdoutLimit: 2 * 1024 * 1024, stderrLimit: 1024 * 1024 };
  receipt.phases.push(row); save(); event('child-starting', { name });
  const stdout = fs.openSync(path.join(evidence, name + '.stdout.txt'), 'wx'), stderr = fs.openSync(path.join(evidence, name + '.stderr.txt'), 'wx');
  try {
    const outcome = await new Promise(resolve => {
      const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
      const processChild = spawn(process.execPath, argv, { cwd: root, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      let done = false, failure = null, cleanup = null, stopping = false;
      function finish(exitCode, signal, closeObserved = true) { if (done) return; done = true; clearTimeout(deadline); clearInterval(heartbeat); clearTimeout(cleanup); activeStop = null; resolve({ exitCode, signal, closeObserved, failure }); }
      function stop(reason) {
        if (stopping) return; stopping = true; failure ??= reason;
        try { event('child-stop', { name, reason, pid: processChild.pid ?? null }); } catch {}
        if (processChild.pid) { const stopped = spawnSync('taskkill.exe', ['/PID', String(processChild.pid), '/T', '/F'], { windowsHide: true, shell: false, stdio: 'ignore', timeout: 10000 }); if (stopped.status !== 0) processChild.kill('SIGKILL'); }
        cleanup = setTimeout(() => { processChild.stdout.destroy(); processChild.stderr.destroy(); finish(null, null, false); }, 5000);
      }
      activeStop = stop;
      const deadline = setTimeout(() => stop('publication child deadline exceeded'), row.timeoutMs);
      const heartbeat = setInterval(() => { try { event('child-progress', { name, stdoutBytes: row.stdoutBytes, stderrBytes: row.stderrBytes }); } catch { stop('progress event storage failed'); } }, 10000);
      for (const [kind, fd] of [['stdout', stdout], ['stderr', stderr]]) {
        processChild[kind].on('data', bytes => { if (done) return; try { const key = kind + 'Bytes', retain = Math.min(bytes.length, Math.max(0, row[kind + 'Limit'] - row[key])); if (retain) { fs.writeFileSync(fd, bytes.subarray(0, retain)); fs.fsyncSync(fd); row[key] += retain; } row.droppedBytes += bytes.length - retain; if (retain !== bytes.length) stop(kind + ' evidence cap exceeded'); } catch { stop(kind + ' evidence storage failed'); } });
        processChild[kind].on('error', error => { if (!done) stop(kind + ' stream failed: ' + error.message); });
      }
      processChild.on('error', error => { failure = 'spawn failed: ' + error.message; }); processChild.on('close', (code, signal) => finish(code, signal));
      row.pid = processChild.pid ?? null; try { event('child-started', { name, pid: row.pid }); } catch { stop('start event storage failed'); }
    });
    Object.assign(row, outcome); assert.equal(outcome.failure, null); assert.equal(outcome.closeObserved, true); assert.equal(outcome.exitCode, 0); assert.equal(outcome.signal, null); assert.equal(row.droppedBytes, 0); live(); row.status = 'passed';
    return JSON.parse(fs.readFileSync(path.join(evidence, name + '.stdout.txt'), 'utf8').trim().split(/\r?\n/).at(-1));
  } catch (error) { row.status = 'failed'; row.failure = { name: error.name, message: error.message }; throw error; }
  finally { row.completedAtUtc = new Date().toISOString(); activeStop = null; for (const fd of [stdout, stderr]) { fs.fsyncSync(fd); fs.closeSync(fd); } save(); event('child-terminal', { name, status: row.status }); }
}

try {
  assert.equal(git(['rev-parse', 'HEAD']).trim(), process.env.GITHUB_SHA); assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all', '-z']), '');
  receipt.branch = git(['symbolic-ref', '-q', '--short', 'HEAD'], true)?.trim() ?? null; receipt.gitTree = git(['rev-parse', 'HEAD^{tree}']).trim();
  const objectFormat = git(['rev-parse', '--show-object-format']).trim(); assert.ok(['sha1', 'sha256'].includes(objectFormat));
  const tree = git(['ls-tree', '-r', '-z', '--full-tree', 'HEAD']).split('\0').filter(Boolean).map(row => { const index = row.indexOf('\t'), [mode, type, oid] = row.slice(0, index).split(' '), name = row.slice(index + 1); safe(name); assert.ok(['100644', '100755'].includes(mode) && type === 'blob'); assert.match(oid, objectFormat === 'sha1' ? /^[0-9a-f]{40}$/ : /^[0-9a-f]{64}$/); return { path: name, gitSHA: oid }; });
  assert.ok(tree.length > 24000 && tree.length <= 30000); assert.equal(new Set(tree.map(row => row.path)).size, tree.length);
  const tracked = new Set(tree.map(row => row.path));
  for (const [name, [bytes, sha256]] of Object.entries(REVIEWED)) { assert.ok(tracked.has(name), 'Reviewed source must already be committed: ' + name); const content = fs.readFileSync(publicFile(name)); assert.deepEqual(identity(content), { bytes, sha256 }); write('reviewed-sources/' + name + '.snapshot', content); }
  for (const name of ['scripts/verify-cloud-publication.mjs', 'scripts/publication-integrity-controls.mjs', '.github/workflows/publication-integrity-cloud.yml']) { assert.ok(tracked.has(name)); write('collector-sources/' + name + '.snapshot', fs.readFileSync(publicFile(name))); }
  const oldManifestBytes = fs.readFileSync(publicFile(DERIVED[0])), oldValidationBytes = fs.readFileSync(publicFile(DERIVED[1]));
  write('metadata-before/' + DERIVED[0] + '.snapshot', oldManifestBytes); write('metadata-before/' + DERIVED[1] + '.snapshot', oldValidationBytes);
  const old = JSON.parse(oldManifestBytes); assert.equal(old.schema, 'rea-publication-manifest/v1'); assert.equal(old.algorithm, 'sha256'); assert.deepEqual(old.derived_records_excluded, DERIVED);
  const forbidden = /(^|\/)(artifacts|node_modules|tooling|__pycache__|work|\.local)(\/|$)|\.(exe|dll|zip|tgz|bundle|tar|7z|pyc)$/i;
  const credentials = /\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[0-9A-Z]{16})\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
  function payload(label) {
    live(); const rows = []; let bytes = 0;
    for (const entry of tree) {
      if (DERIVED.includes(entry.path)) continue;
      const content = fs.readFileSync(publicFile(entry.path)), sha256 = sha(content); bytes += content.length; assert.ok(bytes <= 2 * 1024 * 1024 * 1024);
      assert.equal(createHash(objectFormat).update('blob ' + content.length + '\0').update(content).digest('hex'), entry.gitSHA, 'Working bytes differ from committed Git: ' + entry.path);
      assert.ok(!forbidden.test(entry.path) || entry.path === 'products/rea-studio/apps/archive/fixtures/zstd/native-zip93.zip' && sha256 === 'e9282f76dbd3c080d0e12ef95489458523ebbc65c2951f4b8f3cb880a16c5d8b');
      assert.equal(credentials.test(content.toString('utf8')), false, 'Credential-shaped content requires review: ' + entry.path);
      rows.push({ path: entry.path, bytes: content.length, sha256 });
      if (rows.length % 1000 === 0) event('payload-progress', { label, files: rows.length, bytes });
    }
    rows.sort((a, b) => a.path.localeCompare(b.path)); event('payload-complete', { label, files: rows.length, bytes }); return { rows, bytes };
  }
  const before = payload('before'); receipt.payloadBefore = { files: before.rows.length, bytes: before.bytes, rowsIdentity: identity(Buffer.from(JSON.stringify(before.rows))) }; save();
  const controls = await runPublicationControls(root, path.join(temporary, 'rea-publication-controls-' + process.env.GITHUB_RUN_ID + '-' + process.env.GITHUB_RUN_ATTEMPT), event);
  write('controls.json', JSON.stringify(controls, null, 2) + '\n'); receipt.controls = { status: controls.status, checks: controls.checks }; save();
  const nextManifest = Buffer.from(JSON.stringify({ ...old, files: before.rows }, null, 2)); fs.writeFileSync(path.join(root, DERIVED[0]), nextManifest); write('derived/' + DERIVED[0], nextManifest); receipt.generatedManifest = identity(nextManifest); receipt.generatedManifestValidated = false; save(); event('publication-manifest-generated', receipt.generatedManifest);
  const first = await child('publication-write', ['scripts/verify-records.mjs', '--write']); assert.equal(first.status, 'passed');
  const validationBytes = fs.readFileSync(path.join(root, DERIVED[1])), validation = JSON.parse(validationBytes); assert.deepEqual(first, validation); write('derived/' + DERIVED[1], validationBytes); receipt.firstRootWritePassed = true; save();
  const second = await child('publication-recheck', ['scripts/verify-records.mjs']); assert.equal(second.status, 'passed');
  const firstStable = { ...first }, secondStable = { ...second }; delete firstStable.checked_at_utc; delete secondStable.checked_at_utc; assert.deepEqual(secondStable, firstStable);
  const after = payload('after'); assert.deepEqual(after.rows, before.rows); receipt.payloadAfter = { files: after.rows.length, bytes: after.bytes, rowsIdentity: identity(Buffer.from(JSON.stringify(after.rows))) }; receipt.payloadStable = true;
  assert.equal(git(['rev-parse', 'HEAD']).trim(), process.env.GITHUB_SHA);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all', '-z']).split('\0').filter(Boolean); assert.ok(status.every(row => row.slice(0, 2) === ' M' && DERIVED.includes(row.slice(3)))); receipt.derivedWorktreePaths = status.map(row => row.slice(3)).sort();
  assert.deepEqual(fs.readFileSync(path.join(root, DERIVED[0])), nextManifest); assert.deepEqual(fs.readFileSync(path.join(root, DERIVED[1])), validationBytes);
  for (const name of DERIVED) assert.deepEqual(fs.readFileSync(path.join(evidence, 'derived', name)), fs.readFileSync(path.join(root, name)));
  receipt.generatedManifestValidated = true;
  receipt.derived = DERIVED.map(name => ({ path: name, ...identity(fs.readFileSync(path.join(root, name))) }));
  receipt.publicationResult = { status: validation.status, payloadFiles: validation.payload_files, syntaxChecks: validation.javascript_syntax_checks,
    credentialPatternScan: validation.credential_pattern_scan_passed, rootLinksResolve: validation.root_document_links_resolve,
    historical937Tests: validation.product_development.historical_937_recorded_tests_passed, finiteHosted282Tests: validation.finite_cloud_flow_vault.recordedPass };
  assert.equal(receipt.publicationResult.historical937Tests, 937); assert.equal(receipt.publicationResult.finiteHosted282Tests, 282);
  receipt.status = 'passed'; receipt.completedAtUtc = new Date().toISOString(); save(); event('terminal', { status: 'passed' }); console.log(JSON.stringify({ status: receipt.status, payload: receipt.payloadAfter, controls: receipt.controls, publication: receipt.publicationResult }));
} catch (error) {
  receipt.status = interrupted ? 'interrupted' : 'failed'; receipt.completedAtUtc = new Date().toISOString(); receipt.failure = { name: error.name, code: error.code ?? null, message: error.message }; save(); event('terminal', { status: receipt.status, failure: receipt.failure }); console.error(error.stack ?? error.message); process.exitCode = 1;
} finally { for (const [signal, handler] of handlers) process.off(signal, handler); fs.fsyncSync(events); fs.closeSync(events); }
