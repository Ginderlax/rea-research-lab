import { createCipheriv, createDecipheriv } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// Public protocol constant: rclone's documented obfuscation is reversible.
// This helper is for synthetic study fixtures, not account credential handling.
const FORMAT_KEY = Buffer.from('9c935b48730a554d6bfd7c63c886a92bd390198eb8128afbf4de162b8b95f638', 'hex');

export function selectCliFixtureText(argument, pipedInput = '') {
  if (argument !== '-') return argument;
  // Scope: a non-character stdin stream and a UTF-8 line below Scanner's limit.
  return pipedInput.split('\n', 1)[0].replace(/\r$/, '');
}

export function obscureWithIv(plaintext, iv) {
  if (!Buffer.isBuffer(iv) || iv.length !== 16) throw new TypeError('Exactly 16 IV bytes are required.');
  const cipher = createCipheriv('aes-256-ctr', FORMAT_KEY, iv);
  return Buffer.concat([iv, cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]).toString('base64url');
}

export function revealFixture(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]*$/.test(token)) throw new TypeError('Expected unpadded base64url.');
  const record = Buffer.from(token, 'base64url');
  if (record.length < 16) throw new RangeError('The record must include a 16-byte IV.');
  const decipher = createDecipheriv('aes-256-ctr', FORMAT_KEY, record.subarray(0, 16));
  return Buffer.concat([decipher.update(record.subarray(16)), decipher.final()]).toString('utf8');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const plaintext = 'REA synthetic fixture';
  const token = obscureWithIv(plaintext, Buffer.alloc(16, 7));
  console.log(JSON.stringify({ plaintext, encoded_fixture: token, recovered_fixture: revealFixture(token), purpose: 'Demonstrate the recorded obfuscation wire format on our own data.' }, null, 2));
}
