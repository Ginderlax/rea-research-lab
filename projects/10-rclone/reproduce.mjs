import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { obscureWithIv, revealFixture, selectCliFixtureText } from './reconstruction.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const outputDirectory = join(root, 'artifacts', 'replays', new Date().toISOString().replace(/[:.]/g, '-') + '-' + process.pid);
mkdirSync(outputDirectory, { recursive: true });
function findExe(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) { const result = findExe(path); if (result) return result; }
    else if (entry.name === 'rclone.exe') return path;
  }
}
const exe = process.env.RCLONE_STUDY_EXE ?? findExe(join(root, 'artifacts/unpacked'));
if (!exe) throw new Error('Acquire the pinned release first, or set RCLONE_STUDY_EXE to its local executable.');
const digest = createHash('sha256').update(readFileSync(exe)).digest('hex');
const expected = JSON.parse(readFileSync(join(root, 'artifact-manifest.json'), 'utf8')).executable_sha256;
assert.equal(digest, expected, 'Executable does not match the acquired artifact.');
let state = 0x5eeda175;
function random() { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return state >>> 0; }
const fixtures = ['', 'a', ' ', '-', 'REA-owned-example', 'café', '日本語', '🔬 research', 'line\nbreak', 'tab\tfixture', '"quoted"', 'percent% & dollar$'];
for (const size of [1, 15, 16, 17, 31, 32, 33, 63, 64, 127, 128, 255, 256, 511, 512, 1024, 4096]) fixtures.push('x'.repeat(size));
for (let i = 0; i < 80; i++) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 _-é中';
  let text = '';
  for (let j = 0, length = random() % 180; j < length; j++) text += alphabet[random() % alphabet.length];
  fixtures.push(text);
}
const declaredCases = fixtures.map(argument => ({ argument, pipedInput: '' }));
for (const pipedInput of ['', '\n', 'first line\nsecond line', 'spaces  \r\nignored', '日本語\nignored', '\r\n']) declaredCases.push({ argument: '-', pipedInput });
const cases = [];
const ivs = new Set();
for (let index = 0; index < declaredCases.length; index++) {
  const { argument, pipedInput } = declaredCases[index];
  const plaintext = selectCliFixtureText(argument, pipedInput);
  const output = spawnSync(exe, ['--config', 'NUL', 'obscure', '--', argument], { input: pipedInput, encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
  assert.equal(output.status, 0, output.stderr);
  const originalToken = output.stdout.trim();
  const record = Buffer.from(originalToken, 'base64url');
  assert.equal(record.length, 16 + Buffer.byteLength(plaintext, 'utf8'));
  assert.equal(revealFixture(originalToken), plaintext);
  assert.equal(obscureWithIv(plaintext, record.subarray(0, 16)), originalToken);
  ivs.add(record.subarray(0, 16).toString('hex'));
  cases.push({ index, argument, piped_input: pipedInput, effective_plaintext: plaintext, utf8_bytes: Buffer.byteLength(plaintext), original_token: originalToken, decoded_matches: true, exact_reencoding_matches: true });
}
assert.equal(ivs.size, cases.length, 'A repeated IV occurred in this finite sample.');
const result = {
  checked_at_utc: new Date().toISOString(), product: 'rclone', version: '1.75.2', executable_sha256: digest,
  seed: '0x5eeda175', fixtures: cases.length, differential_assertions: cases.length * 2, structural_assertions: cases.length,
  mismatches: 0, observed_distinct_ivs: ivs.size, utf8_input_domain: true, source_assisted: true,
  excludes: ['Real credentials or configuration files', 'Remote storage accounts', 'Character-device stdin behavior', 'Input lines at or above the Go Scanner limit', 'Malformed token equivalence with the private Go Reveal API', 'Independent RNG distribution or authentication claims'], cases
};
writeFileSync(join(outputDirectory, 'results.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ product: result.product, fixtures: result.fixtures, differential_assertions: result.differential_assertions, mismatches: result.mismatches, replay: outputDirectory }));
