import { createCipheriv, createDecipheriv, randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const little = bytes => { let n = 0n; for (let i = bytes.length - 1; i >= 0; i--) n = (n << 8n) | BigInt(bytes[i]); return n; };
const bytes16 = value => { const out = Buffer.alloc(16); for (let i = 0; i < 16; i++, value >>= 8n) out[i] = Number(value & 255n); return out; };

// Poly1305-AES authenticates the ciphertext. AES(nonce) supplies the additive
// pad; this is deliberately not the unrelated ChaCha20-Poly1305 construction.
export function tag(key, nonce, ciphertext) {
  const aes = createCipheriv('aes-128-ecb', key.k, null); aes.setAutoPadding(false);
  const pad = Buffer.concat([aes.update(nonce), aes.final()]);
  const r = little(key.r) & 0x0ffffffc0ffffffc0ffffffc0fffffffn;
  const prime = (1n << 130n) - 5n; let acc = 0n;
  for (let offset = 0; offset < ciphertext.length; offset += 16) {
    const block = ciphertext.subarray(offset, offset + 16);
    acc = ((acc + little(block) + (1n << BigInt(block.length * 8))) * r) % prime;
  }
  return bytes16((acc + little(pad)) & ((1n << 128n) - 1n));
}
function validKey(key) {
  if (!key || !Buffer.isBuffer(key.encrypt) || key.encrypt.length !== 32 || !Buffer.isBuffer(key.k) || key.k.length !== 16 || !Buffer.isBuffer(key.r) || key.r.length !== 16 || [key.encrypt,key.k,key.r].some(b => !b.some(Boolean))) throw new Error('Invalid restic encryption key.');
}
export function seal(key, plaintext, nonce = randomBytes(16)) {
  validKey(key);
  if (nonce.length !== 16 || !nonce.some(Boolean)) throw new Error('Invalid restic nonce.');
  const aes = createCipheriv('aes-256-ctr', key.encrypt, nonce);
  const ciphertext = Buffer.concat([aes.update(plaintext),aes.final()]);
  return Buffer.concat([nonce,ciphertext,tag(key,nonce,ciphertext)]);
}
export function open(key, encrypted) {
  validKey(key);
  if (!Buffer.isBuffer(encrypted) || encrypted.length < 32 || !encrypted.subarray(0,16).some(Boolean)) throw new Error('Invalid restic encrypted data.');
  const nonce = encrypted.subarray(0,16), ciphertext = encrypted.subarray(16,-16);
  if (!timingSafeEqual(tag(key,nonce,ciphertext),encrypted.subarray(-16))) throw new Error('Restic authentication failed: wrong password or damaged data.');
  const aes = createDecipheriv('aes-256-ctr',key.encrypt,nonce);
  return Buffer.concat([aes.update(ciphertext),aes.final()]);
}
export function base64(value, size) {
  if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error('Invalid restic base64 value.');
  const bytes = Buffer.from(value,'base64');
  if (bytes.toString('base64') !== value || (size !== undefined && bytes.length !== size)) throw new Error('Invalid restic key length.');
  return bytes;
}
export function password(value, { insecureNoPassword = false } = {}) {
  if (typeof insecureNoPassword !== 'boolean') throw new Error('The insecure empty-password option must be a boolean.');
  if (insecureNoPassword) {
    if (value !== '') throw new Error('Explicit empty-password access requires an empty password field.');
    return value;
  }
  if (typeof value !== 'string' || !value || Buffer.byteLength(value) > 1024) throw new Error('Enter a nonempty repository password of at most 1,024 bytes.');
  return value;
}
export async function passwordKey(document, value, options) {
  password(value,options);
  const { N, r, p } = document;
  if (document.kdf !== 'scrypt' || !Number.isSafeInteger(N) || N < 2 || N > 262144 || (N & (N - 1)) !== 0 || !Number.isSafeInteger(r) || r < 1 || r > 32 || !Number.isSafeInteger(p) || p < 1 || p > 64 || N * r > 1048576 || N * r * p > 8388608) throw new Error('Unsupported or excessive restic scrypt parameters.');
  const bytes = await derive(value,base64(document.salt,64),64,{ N,r,p,maxmem: 144 * 1024 * 1024 });
  return { encrypt: bytes.subarray(0,32),k: bytes.subarray(32,48),r: bytes.subarray(48,64) };
}
export function masterJSON(key) { validKey(key); return { mac: { k: key.k.toString('base64'),r: key.r.toString('base64') },encrypt: key.encrypt.toString('base64') }; }
export function masterKey(document) {
  const key = { encrypt: base64(document.encrypt,32),k: base64(document.mac?.k,16),r: base64(document.mac?.r,16) }; validKey(key); return key;
}
export function randomKey() { return { encrypt: randomBytes(32),k: randomBytes(16),r: randomBytes(16) }; }

function degree(n) { return n === 0n ? -1 : n.toString(2).length - 1; }
function remainder(a, b) { const d = degree(b); while (degree(a) >= d) a ^= b << BigInt(degree(a) - d); return a; }
function gcd(a, b) { while (b) { const c = remainder(a,b); a = b; b = c; } return a; }
function square(a, polynomial) { let n = 0n, i = 0n; while (a) { if (a & 1n) n |= 1n << (2n * i); a >>= 1n; i++; } return remainder(n,polynomial); }
export function validPolynomial(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{14}$/.test(value)) return false;
  const p = BigInt(`0x${value}`); if (degree(p) !== 53 || !(p & 1n)) return false;
  // 53 is prime: Rabin's irreducibility test has one proper factor check.
  if (gcd(square(2n,p) ^ 2n,p) !== 1n) return false;
  let x = 2n; for (let i = 0; i < 53; i++) x = square(x,p);
  return x === 2n;
}
export function randomPolynomial() {
  for (;;) { const p = ((little(randomBytes(7)) & ((1n << 53n) - 1n)) | (1n << 53n) | 1n).toString(16); if (validPolynomial(p)) return p; }
}
