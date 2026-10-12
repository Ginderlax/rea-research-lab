import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { smallFileContentIds, verifyStorageId } from './reconstruction.mjs';

const project = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(project, 'artifact-manifest.json'), 'utf8'));
const exe = process.env.RESTIC_STUDY_EXE ?? join(project, manifest.executable_relative_path);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256(readFileSync(exe)), manifest.executable_sha256, 'The original executable must match the recorded artifact.');
const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + process.pid;
const run = join(project, 'artifacts', 'replays', runId);
const corpus = join(run, 'corpus');
const repository = join(run, 'repository');
mkdirSync(corpus, { recursive: true });
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('RESTIC_')));
env.RESTIC_PASSWORD = 'REA_PUBLIC_SYNTHETIC_STUDY_PASSWORD';
const commands = [];
function restic(args, json = false) {
  const fullArgs = ['-r', repository, '--no-cache', '--compression', 'off', ...args];
  const output = spawnSync(exe, fullArgs, { cwd: corpus, env, encoding: json ? 'utf8' : null, timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
  commands.push({ args: fullArgs, status: output.status, stderr: output.stderr?.toString('utf8') ?? '' });
  writeFileSync(join(run, 'commands.json'), JSON.stringify(commands, null, 2));
  assert.equal(output.status, 0, output.stderr?.toString('utf8'));
  return json ? JSON.parse(output.stdout) : output.stdout;
}
function fixturePath(name) {
  const target = resolve(corpus, name);
  const within = relative(resolve(corpus), target);
  assert.ok(within && !within.startsWith('..') && !within.includes('\\') && !within.includes('/'), 'Fixture must be a direct file in the synthetic corpus.');
  return target;
}
let state = 0x5eeda019;
function random() { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return state >>> 0; }
const fixtures = new Map([
  ['empty.bin', Buffer.alloc(0)], ['single.bin', Buffer.from([0])],
  ['duplicate-a.txt', Buffer.from('deduplicate this synthetic document\n')],
  ['duplicate-b.txt', Buffer.from('deduplicate this synthetic document\n')],
  ['mutable.txt', Buffer.from('first synthetic revision\n')],
  ['unicode-日本語.txt', Buffer.from('café 🔬 日本語\n')]
]);
for (const size of [15, 16, 17, 255, 256, 4095, 4096, 65535, 65536, 511 * 1024]) {
  const bytes = Buffer.alloc(size); for (let i = 0; i < size; i++) bytes[i] = random() & 255;
  fixtures.set(`boundary-${size}.bin`, bytes);
}
for (let i = 0; i < 24; i++) {
  const bytes = Buffer.alloc(random() % 12000); for (let j = 0; j < bytes.length; j++) bytes[j] = random() & 255;
  fixtures.set(`seeded-${i.toString().padStart(2, '0')}.bin`, bytes);
}
for (const [name, bytes] of fixtures) writeFileSync(fixturePath(name), bytes);
writeFileSync(join(run, 'fixture-manifest.json'), JSON.stringify([...fixtures].map(([name, bytes]) => ({ name, bytes: bytes.length, sha256: sha256(bytes) })), null, 2));
restic(['init', '--repository-version', '2']);
const snapshots = [];
let contentComparisons = 0, sizeAssertions = 0, dedupPairs = 0, treeChecks = 0;
const observed = [];
function snapshot(phase) {
  const backup = restic(['backup', '.', '--host', 'rea-synthetic-lab', '--tag', phase, '--json']).toString('utf8');
  const events = backup.trim().split(/\r?\n/).map(line => JSON.parse(line));
  writeFileSync(join(run, `${phase}-backup.json`), JSON.stringify(events, null, 2));
  const summary = events.find(event => event.message_type === 'summary');
  assert.ok(summary?.snapshot_id, 'Backup must produce a snapshot identifier.');
  const snap = restic(['cat', 'snapshot', summary.snapshot_id], true);
  const files = new Map();
  function walkTree(id, prefix = '') {
    const raw = restic(['cat', 'blob', id]);
    assert.equal(sha256(raw), id, 'Tree plaintext must match its content identifier.'); treeChecks++;
    writeFileSync(join(run, `tree-${id}.json`), raw);
    const tree = JSON.parse(raw.toString('utf8'));
    for (const node of tree.nodes ?? []) {
      const location = prefix ? `${prefix}/${node.name}` : node.name;
      if (node.type === 'dir') walkTree(node.subtree, location);
      else if (node.type === 'file') {
        assert.ok(!files.has(node.name), 'The flat fixture corpus requires unique basenames.');
        files.set(node.name, { ...node, relative_tree_path: location });
      }
    }
  }
  walkTree(snap.tree);
  assert.equal(files.size, fixtures.size, 'The original snapshot must contain exactly our synthetic files.');
  const phaseRows = [];
  for (const [name, bytes] of fixtures) {
    const node = files.get(name); assert.ok(node, `Missing fixture ${name}`);
    const expected = smallFileContentIds(bytes), actual = node.content ?? [];
    assert.deepEqual(actual, expected, `Content addressing differs for ${name}`); contentComparisons++;
    assert.equal(node.size ?? 0, bytes.length); sizeAssertions++;
    const row = { phase, name, bytes: bytes.length, original_size_present: Object.hasOwn(node, 'size'), expected_content_ids: expected, original_content_ids: actual, matches: true };
    phaseRows.push(row); observed.push(row);
  }
  assert.deepEqual(files.get('duplicate-a.txt').content, files.get('duplicate-b.txt').content); dedupPairs++;
  if (files.has('copy-of-duplicate.txt')) { assert.deepEqual(files.get('duplicate-a.txt').content, files.get('copy-of-duplicate.txt').content); dedupPairs++; }
  const value = { phase, snapshot_id: summary.snapshot_id, tree_id: snap.tree, files: phaseRows };
  snapshots.push(value); return value;
}
const baseline = snapshot('baseline');
fixtures.set('mutable.txt', Buffer.from('second synthetic revision: changed bytes\n'));
writeFileSync(fixturePath('mutable.txt'), fixtures.get('mutable.txt'));
fixtures.set('copy-of-duplicate.txt', fixtures.get('duplicate-a.txt'));
writeFileSync(fixturePath('copy-of-duplicate.txt'), fixtures.get('copy-of-duplicate.txt'));
const changed = snapshot('changed');
assert.notDeepEqual(baseline.files.find(row => row.name === 'mutable.txt').original_content_ids, changed.files.find(row => row.name === 'mutable.txt').original_content_ids);
const renamedBytes = fixtures.get('mutable.txt');
renameSync(fixturePath('mutable.txt'), fixturePath('renamed.txt'));
fixtures.delete('mutable.txt'); fixtures.set('renamed.txt', renamedBytes);
const renamed = snapshot('renamed');
assert.deepEqual(changed.files.find(row => row.name === 'mutable.txt').original_content_ids, renamed.files.find(row => row.name === 'renamed.txt').original_content_ids);
const storage = [];
function walkStorage(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) walkStorage(target);
    else if (/^[a-f0-9]{64}$/.test(entry.name)) {
      const bytes = readFileSync(target);
      assert.ok(verifyStorageId(basename(target), bytes), 'Stored object name must hash its stored bytes.');
      storage.push({ relative_path: relative(repository, target).replaceAll('\\', '/'), bytes: bytes.length, id: entry.name, matches: true });
    }
  }
}
walkStorage(repository);
assert.ok(storage.length > 0);
const check = restic(['check', '--read-data']).toString('utf8');
writeFileSync(join(run, 'integrity-check.txt'), check);
const result = {
  product: 'restic', version: manifest.version, checked_at_utc: new Date().toISOString(), executable_sha256: manifest.executable_sha256,
  seed: '0x5eeda019', input_domain: 'regular files strictly smaller than 512 KiB', source_assisted: true,
  snapshots: snapshots.length, content_id_comparisons: contentComparisons, size_assertions: sizeAssertions,
  duplicate_reference_pair_checks: dedupPairs, changed_content_id_checks: 1, renamed_content_id_checks: 1,
  plaintext_tree_id_checks: treeChecks, stored_object_id_checks: storage.length, restic_read_data_check_passed: true,
  mismatches: 0, fixture_count_by_snapshot: snapshots.map(s => ({ phase: s.phase, files: s.files.length })),
  local_replay: `artifacts/replays/${runId}`, original_observations: observed, storage_observations: storage,
  snapshot_summary: snapshots.map(({ phase, snapshot_id, tree_id }) => ({ phase, snapshot_id, tree_id })),
  exclusions: ['Content-defined chunking at or above 512 KiB', 'Pack encryption or index reconstruction', 'Large-file restore compatibility', 'Remote backends', 'User documents or repositories', 'Compression behavior and universal equivalence']
};
writeFileSync(join(run, 'results.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ snapshots: result.snapshots, content_id_comparisons: result.content_id_comparisons, stored_object_id_checks: result.stored_object_id_checks, mismatches: result.mismatches, integrity_check: result.restic_read_data_check_passed, replay: result.local_replay }));
