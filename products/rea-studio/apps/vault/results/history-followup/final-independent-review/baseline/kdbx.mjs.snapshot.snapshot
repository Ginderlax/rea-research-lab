// Original implementation from the public KDBX specification. No KeePass code
// is used here; the preserved original executable is an independent test oracle.
import { createHash, createHmac, createCipheriv, createDecipheriv, randomBytes, randomUUID, timingSafeEqual, argon2 as deriveArgon2 } from 'node:crypto';
import { promisify } from 'node:util';
import { gzipSync, gunzipSync } from 'node:zlib';
import { setImmediate as yieldEventLoop } from 'node:timers/promises';
import { parseXml, serializeXml, nodes, one, text, element, put, walk } from './xml.mjs';

const argon2 = promisify(deriveArgon2);
const MAX = 8 * 1024 * 1024;
const decoder = new TextDecoder('utf-8',{ fatal: true });
const CIPHERS = { aes: '31c1f2e6bf714350be5805216afc5aff', chacha20: 'd6038a2b8b6f4cb5a524339a31dbb59a' };
const KDFS = { aes: 'c9d9f39a628a4460bf740d08c18a4fea', argon2d: 'ef636ddf8c29444b91f7a9a403e30a0c', argon2id: '9e298b1956db4773b23dfc3ec6f0a1e6' };
const DATE_NAMES = new Set(['SettingsChanged','DatabaseNameChanged','DatabaseDescriptionChanged','DefaultUserNameChanged','MasterKeyChanged','RecycleBinChanged','EntryTemplatesGroupChanged','LastModificationTime','CreationTime','LastAccessTime','ExpiryTime','LocationChanged','DeletionTime']);
const FIELD_MAP = { title: 'Title', username: 'UserName', password: 'Password', url: 'URL', notes: 'Notes' };
const sha = (algorithm, ...chunks) => { const hash = createHash(algorithm); for (const c of chunks) hash.update(c); return hash.digest(); };
const mac = (key, ...chunks) => { const hash = createHmac('sha256',key); for (const c of chunks) hash.update(c); return hash.digest(); };
const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const u64 = n => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
function equals(a,b,message = 'Incorrect KDBX credentials or corrupted authenticated data.') { if (a.length !== b.length || !timingSafeEqual(a,b)) throw new Error(message); }
export function base64(value, limit = MAX) {
  if (typeof value !== 'string' || value.length > Math.ceil(limit / 3) * 4 || value.length % 4 || /[^A-Za-z0-9+/=]/.test(value)) throw new Error('Invalid or oversized Base64 data.');
  const b = Buffer.from(value,'base64'); if (b.length > limit || b.toString('base64') !== value) throw new Error('Invalid or oversized Base64 data.'); return b;
}
class Reader {
  constructor(buffer) { this.buffer = buffer; this.at = 0; }
  take(size) { if (!Number.isSafeInteger(size) || size < 0 || size > MAX || size > this.buffer.length - this.at) throw new Error('Truncated or oversized KDBX field.'); const b = this.buffer.subarray(this.at,this.at + size); this.at += size; return b; }
  byte() { return this.take(1)[0]; }
  int() { return this.take(4).readUInt32LE(); }
  end() { if (this.at !== this.buffer.length) throw new Error('Unexpected trailing KDBX data.'); }
}
function dictionary(buffer) {
  const reader = new Reader(buffer), version = reader.take(2).readUInt16LE();
  if (version !== 0x0100) throw new Error('Unsupported KDBX dictionary version.');
  const values = Object.create(null);
  for (let count = 0; ; count++) {
    const type = reader.byte(); if (!type) { reader.end(); return values; }
    if (count >= 128) throw new Error('KDBX dictionary item limit exceeded.');
    const key = decoder.decode(reader.take(reader.int())); if (!key || key.length > 256 || Object.hasOwn(values,key)) throw new Error('Invalid duplicate KDBX parameter.');
    const b = reader.take(reader.int()); let value;
    if (type === 0x42) value = Buffer.from(b);
    else if (type === 0x18) value = decoder.decode(b);
    else if (type === 0x04 && b.length === 4) value = b.readUInt32LE();
    else if (type === 0x05 && b.length === 8) value = b.readBigUInt64LE();
    else if (type === 0x0C && b.length === 4) value = b.readInt32LE();
    else if (type === 0x0D && b.length === 8) value = b.readBigInt64LE();
    else if (type === 0x08 && b.length === 1 && b[0] <= 1) value = !!b[0];
    else throw new Error('Unsupported or invalid KDBX dictionary value.');
    values[key] = { type, value };
  }
}
function writeDictionary(items) {
  const parts = [Buffer.from([0,1])];
  for (const [name,item] of Object.entries(items)) {
    const key = Buffer.from(name), value = item.type === 0x42 ? item.value : item.type === 0x05 ? u64(item.value) : item.type === 0x04 ? u32(item.value) : Buffer.from(item.value);
    parts.push(Buffer.from([item.type]),u32(key.length),key,u32(value.length),value);
  }
  parts.push(Buffer.from([0])); return Buffer.concat(parts);
}
function param(items,key,type) { const item = items[key]; if (!item || item.type !== type) throw new Error(`Invalid KDBX KDF parameter ${key}.`); return item.value; }
function number(value,min,max,name) { if (typeof value !== 'number' && typeof value !== 'bigint' || value < min || value > max || !Number.isSafeInteger(Number(value))) throw new Error(`Unsupported ${name}; exceeds the supported resource bounds.`); return Number(value); }

export function keyFileComponent(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length > 1024 * 1024) throw new Error('Key files must be at most 1 MiB.');
  if (buffer.length === 32) return Buffer.from(buffer);
  if (buffer.length === 64 && /^[0-9a-fA-F]{64}$/.test(buffer.toString('latin1'))) return Buffer.from(buffer.toString('latin1'),'hex');
  const string = buffer.toString('utf8').replace(/^\uFEFF/,'');
  if (buffer.subarray(0,2).equals(Buffer.from([255,254])) || buffer.subarray(0,2).equals(Buffer.from([254,255]))) throw new Error('UTF-16 key files are unsupported; use a UTF-8 XML key file.');
  if (/^\s*(?:<\?xml[^]*?\?>\s*)?<KeyFile(?:\s|>)/.test(string)) {
    const xml = parseXml(string.trim()); if (xml.name !== 'KeyFile') throw new Error('Invalid XML key file.');
    const version = text(one(one(xml,'Meta',true),'Version',true)), data = one(one(xml,'Key',true),'Data',true);
    if (version === '1.00' || version === '1.0') { const result = base64(text(data).replace(/\s/g,''),32); if (result.length !== 32) throw new Error('Invalid XML key size.'); return result; }
    if (version === '2.0' || version === '2.00') {
      const hex = text(data).replace(/\s/g,''); if (!/^[0-9a-fA-F]{64}$/.test(hex) || !/^[0-9a-fA-F]{8}$/.test(data.attrs.Hash ?? '')) throw new Error('Invalid version 2 XML key file.');
      const result = Buffer.from(hex,'hex'); equals(sha('sha256',result).subarray(0,4),Buffer.from(data.attrs.Hash,'hex'),'XML key file integrity hash is incorrect.'); return result;
    }
    throw new Error('Unsupported XML key file version.');
  }
  return sha('sha256',buffer);
}
function composite({ password = '', usePassword = true, keyFileBase64 } = {}) {
  if (typeof password !== 'string' || Buffer.byteLength(password) > 1024 || typeof usePassword !== 'boolean') throw new Error('Invalid KDBX password component.');
  const parts = []; if (usePassword) parts.push(sha('sha256',Buffer.from(password)));
  if (keyFileBase64 !== undefined && keyFileBase64 !== '') parts.push(keyFileComponent(base64(keyFileBase64,1024 * 1024)));
  if (!parts.length) throw new Error('Select a password component or supply a key file.');
  try { return sha('sha256',...parts); } finally { for (const p of parts) p.fill(0); }
}
async function transform(compositeKey, params) {
  const uuid = param(params,'$UUID',0x42).toString('hex'); const kind = Object.keys(KDFS).find(k => KDFS[k] === uuid);
  if (!kind) throw new Error('Unsupported KDBX key derivation function.');
  const allowed = kind === 'aes' ? ['$UUID','S','R'] : ['$UUID','S','I','M','P','V','K','A'];
  if (Object.keys(params).some(k => !allowed.includes(k))) throw new Error('Unsupported additional KDBX KDF parameters.');
  const seed = param(params,'S',0x42);
  if (kind === 'aes') {
    if (seed.length !== 32) throw new Error('Invalid AES-KDF seed.');
    const rounds = number(param(params,'R',0x05),1,2000000,'AES-KDF rounds (1–2,000,000)');
    const cipher = createCipheriv('aes-256-ecb',seed,null); cipher.setAutoPadding(false);
    let value = Buffer.from(compositeKey);
    try { for (let i = 0; i < rounds; i++) { const next = cipher.update(value); value.fill(0); value = next; if ((i & 8191) === 8191) await yieldEventLoop(); } cipher.final(); return sha('sha256',value); }
    finally { value.fill(0); }
  }
  if (param(params,'V',0x04) !== 0x13) throw new Error('Only Argon2 version 1.3 is supported.');
  const memory = number(param(params,'M',0x05),8192,128 * 1024 * 1024,'Argon2 memory (up to 128 MiB)');
  const passes = number(param(params,'I',0x05),1,32,'Argon2 passes (1–32)');
  const parallelism = number(param(params,'P',0x04),1,16,'Argon2 parallelism (1–16)');
  if (memory % 1024 || memory / 1024 < 8 * parallelism || memory * passes > 512 * 1024 * 1024 || seed.length < 8 || seed.length > 1024) throw new Error('Unsupported Argon2 resource parameters.');
  return argon2(kind,{ message: compositeKey,nonce: seed,parallelism,tagLength: 32,memory: memory / 1024,passes,...(params.K ? { secret: param(params,'K',0x42) } : {}),...(params.A ? { associatedData: param(params,'A',0x42) } : {}) });
}

// Salsa20/20 stream for existing protected strings in KDBX 3.1 and KDBX 4.
function salsaStream(key) {
  const state = new Uint32Array(16), sigma = Buffer.from('expand 32-byte k'), nonce = Buffer.from('e830094b97205d2a','hex');
  for (const [i,offset] of [[0,0],[5,4],[10,8],[15,12]]) state[i] = sigma.readUInt32LE(offset);
  for (let i = 0; i < 4; i++) { state[1 + i] = key.readUInt32LE(i * 4); state[11 + i] = key.readUInt32LE(16 + i * 4); }
  state[6] = nonce.readUInt32LE(); state[7] = nonce.readUInt32LE(4); let block = Buffer.alloc(0), at = 0;
  const rot = (x,n) => (x << n | x >>> (32 - n)) >>> 0;
  const quarter = (x,a,b,c,d) => { x[b] ^= rot((x[a] + x[d]) >>> 0,7); x[c] ^= rot((x[b] + x[a]) >>> 0,9); x[d] ^= rot((x[c] + x[b]) >>> 0,13); x[a] ^= rot((x[d] + x[c]) >>> 0,18); };
  function next() {
    const x = state.slice();
    for (let i = 0; i < 10; i++) { quarter(x,0,4,8,12); quarter(x,5,9,13,1); quarter(x,10,14,2,6); quarter(x,15,3,7,11); quarter(x,0,1,2,3); quarter(x,5,6,7,4); quarter(x,10,11,8,9); quarter(x,15,12,13,14); }
    block = Buffer.alloc(64); for (let i = 0; i < 16; i++) block.writeUInt32LE((x[i] + state[i]) >>> 0,i * 4); state[8] = state[8] + 1 >>> 0; if (!state[8]) state[9] = state[9] + 1 >>> 0; at = 0; x.fill(0);
  }
  return { update(data) { const out = Buffer.alloc(data.length); for (let i = 0; i < data.length; i++) { if (at === block.length) next(); out[i] = data[i] ^ block[at++]; } return out; }, dispose() { state.fill(0); block.fill(0); key.fill(0); } };
}
function innerStream(algorithm,key) {
  if (algorithm === 2 && key.length === 32) return salsaStream(sha('sha256',key));
  if (algorithm !== 3 || key.length !== 64) throw new Error('Unsupported KDBX inner encryption algorithm/key.');
  const h = sha('sha512',key), cipher = createCipheriv('chacha20',h.subarray(0,32),Buffer.concat([Buffer.alloc(4),h.subarray(32,44)])); h.fill(0);
  return { update: b => cipher.update(b), dispose: () => { cipher.final(); } };
}
function protectedStrings(xml,stream,encrypt,legacy = false) {
  walk(xml,n => {
    if (n.attrs.Protected !== undefined && !['True','False','true','false','1','0'].includes(n.attrs.Protected)) throw new Error('Invalid protected XML flag.');
    if (['True','true','1'].includes(n.attrs.Protected)) {
      // Binary definitions in legacy XML are normalized separately. A different
      // protected element type cannot be converted safely to a string.
      const binary = legacy && n.name === 'Binary' && n.attrs.ID !== undefined;
      if (!binary && (n.name !== 'Value' || n.attrs.Ref !== undefined)) throw new Error('Unsupported protected XML content.');
      const value = encrypt ? Buffer.from(text(n)) : base64(text(n).replace(/\s/g,''));
      const transformed = stream.update(value); n.children = [encrypt || binary ? transformed.toString('base64') : decoder.decode(transformed)]; value.fill(0); transformed.fill(0);
    }
  });
}
function fieldRecord(id,value,width = 4) { const size = width === 4 ? u32(value.length) : Buffer.from([value.length & 255,value.length >>> 8]); return Buffer.concat([Buffer.from([id]),size,value]); }
function parseHeader(buffer) {
  const reader = new Reader(buffer); if (reader.int() !== 0x9AA2D903 || reader.int() !== 0xB54BFB67) throw new Error('Not a KDBX database.');
  const version = reader.int(), major = version >>> 16, minor = version & 65535;
  if (!(major === 4 && minor <= 1 || major === 3 && minor === 1)) throw new Error('Supported KDBX versions are 3.1, 4.0 and 4.1.');
  const fields = new Map();
  while (true) {
    const id = reader.byte(), length = major === 4 ? reader.int() : reader.take(2).readUInt16LE(), value = reader.take(length);
    if (fields.has(id) || ![0,1,2,3,4,5,6,7,8,9,10,11,12].includes(id)) throw new Error('Duplicate or unsupported KDBX header field.'); fields.set(id,value);
    if (!id) { equals(value,Buffer.from('0d0a0d0a','hex'),'Invalid KDBX end-of-header.'); break; }
    if (reader.at > 65536) throw new Error('KDBX outer header exceeds 64 KiB.');
  }
  const get = (id,size) => { const value = fields.get(id); if (!value || size !== undefined && value.length !== size) throw new Error('Missing/invalid required KDBX header field.'); return value; };
  if (major === 4 && [1,5,6,8,9,10].some(id => fields.has(id)) || major === 3 && [1,11,12].some(id => fields.has(id))) throw new Error('Unsupported obsolete/additional KDBX header fields.');
  const cipher = Object.keys(CIPHERS).find(k => CIPHERS[k] === get(2,16).toString('hex')); if (!cipher || major === 3 && cipher !== 'aes') throw new Error('Unsupported KDBX outer cipher.');
  const compression = get(3,4).readUInt32LE(); if (![0,1].includes(compression)) throw new Error('Unsupported KDBX compression.');
  const seed = get(4,32), iv = get(7,cipher === 'aes' ? 16 : 12);
  if (fields.has(12)) dictionary(fields.get(12));
  const parameters = major === 4 ? dictionary(get(11)) : { $UUID: { type: 0x42,value: Buffer.from(KDFS.aes,'hex') }, S: { type: 0x42,value: get(5,32) }, R: { type: 0x05,value: get(6,8).readBigUInt64LE() } };
  return { reader,version,major,minor,fields,get,cipher,compression,seed,iv,parameters,raw: buffer.subarray(0,reader.at) };
}
function crypt(cipher,encrypt,key,iv,data) { const operation = (encrypt ? createCipheriv : createDecipheriv)(cipher === 'aes' ? 'aes-256-cbc' : 'chacha20',key,cipher === 'aes' ? iv : Buffer.concat([Buffer.alloc(4),iv])); return Buffer.concat([operation.update(data),operation.final()]); }
function inflate(data,limit = MAX) { try { return gunzipSync(data,{ maxOutputLength: Math.max(1,limit) }); } catch (error) { if (error.code === 'ERR_BUFFER_TOO_LARGE') throw Object.assign(new Error('Inflated KDBX content exceeds its supported remaining size limit.'),{ code: error.code }); throw new Error('Invalid compressed KDBX content.'); } }
function verifiedBlocks(reader,hmacKey) {
  const blocks = []; let total = 0;
  for (let i = 0; i < 1024; i++) {
    const expected = reader.take(32), size = reader.int(), data = reader.take(size), index = u64(i), blockKey = sha('sha512',index,hmacKey);
    try { equals(expected,mac(blockKey,index,u32(size),data)); } finally { blockKey.fill(0); }
    total += size; if (total > MAX) throw new Error('KDBX payload exceeds 8 MiB.');
    if (!size) { reader.end(); return Buffer.concat(blocks); } blocks.push(data);
  }
  throw new Error('KDBX block count limit exceeded.');
}
function writeBlocks(data,hmacKey) {
  const blocks = []; let i = 0;
  for (let at = 0; ; at += 1024 * 1024,i++) { const part = data.subarray(at,at + 1024 * 1024), index = u64(i), key = sha('sha512',index,hmacKey); blocks.push(mac(key,index,u32(part.length),part),u32(part.length),part); key.fill(0); if (!part.length) return Buffer.concat(blocks); }
}
function uuid(string) { const b = base64(string,16); if (b.length !== 16) throw new Error('Invalid KeePass UUID.'); const hex = b.toString('hex'); return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`; }
function uuid64(string) { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(string)) throw new Error('Invalid vault entry UUID.'); return Buffer.from(string.replace(/-/g,''),'hex').toString('base64'); }
function date64(iso) { const ms = Date.parse(iso); if (!Number.isFinite(ms) || ms < -62135596800000) throw new Error('Invalid KeePass date.'); return u64(BigInt(Math.floor(ms / 1000)) + 62135596800n).toString('base64'); }
function isoDate(value,major) {
  if (major === 3) { const ms = Date.parse(value); if (!Number.isFinite(ms)) throw new Error('Invalid legacy KeePass date.'); return new Date(ms).toISOString(); }
  const b = base64(value,8); if (b.length !== 8) throw new Error('Invalid KeePass date.'); const seconds = b.readBigUInt64LE() - 62135596800n; if (seconds < -62135596800n || seconds > 253402300799n) throw new Error('Unsupported KeePass date range.'); return new Date(Number(seconds) * 1000).toISOString();
}
function documentEntries(xml,major) {
  if (xml.name !== 'KeePassFile') throw new Error('Unsupported KDBX XML root.'); one(xml,'Meta',true); const root = one(xml,'Root',true), top = one(root,'Group',true), entries = [], groups = [], ids = new Set();
  function visit(group,parentPath,isRoot = false) {
    const id = uuid(text(one(group,'UUID',true))); if (ids.has(id)) throw new Error('Duplicate group/entry UUID.'); ids.add(id);
    const name = text(one(group,'Name',true)), path = isRoot ? '' : parentPath ? parentPath + '/' + name : name; if (path.length > 256) throw new Error('Group paths exceed the vault limit.');
    groups.push({ id,path,node: group });
    for (const e of nodes(group,'Entry')) {
      const entryId = uuid(text(one(e,'UUID',true))); if (ids.has(entryId)) throw new Error('Duplicate group/entry UUID.'); ids.add(entryId);
      const fields = Object.create(null);
      for (const item of nodes(e,'String')) { const key = text(one(item,'Key',true)); if (Object.hasOwn(fields,key)) throw new Error('Duplicate KeePass string field.'); fields[key] = text(one(item,'Value',true)); }
      const times = one(e,'Times'), now = new Date().toISOString();
      const result = { id: entryId,group: path,kdbxGroupId: id,totpSecret: '',createdAt: times && one(times,'CreationTime') ? isoDate(text(one(times,'CreationTime')),major) : now,updatedAt: times && one(times,'LastModificationTime') ? isoDate(text(one(times,'LastModificationTime')),major) : now };
      for (const [local,key] of Object.entries(FIELD_MAP)) { result[local] = fields[key] ?? ''; if (result[local].length > (local === 'notes' ? 100000 : 4096)) throw new Error(`Imported ${key} exceeds the vault field limit.`); }
      // A specific lab TOTP field is reversible; arbitrary KeePass/plugin OTP
      // fields stay in XML and are not reinterpreted as compatible generators.
      if (fields['REA.TOTP.Secret']) result.totpSecret = fields['REA.TOTP.Secret'];
      entries.push(result);
      if (entries.length > 10000) throw new Error('KDBX entry count exceeds 10,000.');
    }
    for (const child of nodes(group,'Group')) visit(child,path);
  }
  visit(top,'',true); return { entries,groups,root: top };
}
function checkReferences(xml,binaries) {
  walk(xml,n => { if (n.name === 'Value' && n.attrs.Ref !== undefined) { if (!/^\d+$/.test(n.attrs.Ref) || !Number.isSafeInteger(Number(n.attrs.Ref)) || Number(n.attrs.Ref) >= binaries.length || text(n).trim()) throw new Error('Invalid KDBX attachment reference.'); } });
}

export async function importKdbx(buffer,credentials = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length > MAX || buffer.length < 64) throw new Error('KDBX file must be between 64 bytes and 8 MiB.');
  const header = parseHeader(buffer), compositeKey = composite(credentials); let transformed, key, hmacKey, plaintext, innerKey, payload;
  try {
    if (header.major === 4) equals(header.reader.take(32),sha('sha256',header.raw),'KDBX header checksum is incorrect.');
    transformed = await transform(compositeKey,header.parameters); key = sha('sha256',header.seed,transformed);
    if (header.major === 4) {
      hmacKey = sha('sha512',header.seed,transformed,Buffer.from([1])); const hk = sha('sha512',u64(0xFFFFFFFFFFFFFFFFn),hmacKey);
      try { equals(header.reader.take(32),mac(hk,header.raw)); } finally { hk.fill(0); }
      const ciphertext = verifiedBlocks(header.reader,hmacKey); plaintext = crypt(header.cipher,false,key,header.iv,ciphertext); payload = plaintext;
    } else {
      try { plaintext = crypt('aes',false,key,header.iv,header.reader.take(buffer.length - header.reader.at)); } catch { throw new Error('Incorrect KDBX credentials or corrupted encrypted data.'); }
      const blocks = new Reader(plaintext); equals(blocks.take(32),header.get(9,32)); const parts = []; let total = 0;
      for (let i = 0; ; i++) { if (i > 1024 || blocks.int() !== i) throw new Error('Invalid legacy KDBX block sequence.'); const hash = blocks.take(32), size = blocks.int(), data = blocks.take(size); if (!size) { equals(hash,Buffer.alloc(32)); blocks.end(); break; } equals(hash,sha('sha256',data)); total += size; if (total > MAX) throw new Error('KDBX payload exceeds 8 MiB.'); parts.push(data); }
      payload = Buffer.concat(parts);
    }
    if (header.compression) payload = inflate(payload);
    const binaries = []; let xml, algorithm;
    if (header.major === 4) {
      const reader = new Reader(payload), seen = new Set();
      while (true) { const id = reader.byte(), data = reader.take(reader.int()); if (!id) { if (data.length) throw new Error('Invalid inner header ending.'); break; }
        if (id === 3) { if (!data.length || data[0] & ~1 || binaries.length >= 10000) throw new Error('Unsupported inner binary flags/count.'); binaries.push({ protected: !!data[0],dataBase64: data.subarray(1).toString('base64') }); }
        else { if (seen.has(id)) throw new Error('Duplicate KDBX inner header field.'); seen.add(id); if (id === 1 && data.length === 4) algorithm = data.readUInt32LE(); else if (id === 2) innerKey = Buffer.from(data); else throw new Error('Unsupported inner header field.'); }
      }
      xml = parseXml(decoder.decode(reader.take(payload.length - reader.at)).replace(/^\uFEFF/,''));
    } else { algorithm = header.get(10,4).readUInt32LE(); innerKey = Buffer.from(header.get(8,32)); xml = parseXml(decoder.decode(payload).replace(/^\uFEFF/,'')); }
    if (!innerKey) throw new Error('Missing KDBX inner key.'); const stream = innerStream(algorithm,innerKey);
    try { protectedStrings(xml,stream,false,header.major === 3); } finally { stream.dispose(); }
    const meta = one(xml,'Meta',true);
    if (header.major === 3) {
      const hash = one(meta,'HeaderHash',true); equals(base64(text(hash),32),sha('sha256',header.raw));
      const binaryNodes = one(meta,'Binaries'), definitions = binaryNodes ? nodes(binaryNodes,'Binary') : [], ids = new Map();
      if (definitions.length > 10000) throw new Error('Legacy KDBX attachment count exceeds 10,000.');
      // Resolve IDs and normalize XML before inflating any legacy binary so the
      // final preserved document is included in the running resource budget.
      for (const [index,b] of definitions.entries()) {
        if (!/^\d+$/.test(b.attrs.ID ?? '') || ids.has(b.attrs.ID)) throw new Error('Unsupported legacy binary definition.');
        if (b.attrs.Compressed && !['True','true','1','False','false','0'].includes(b.attrs.Compressed)) throw new Error('Invalid binary compression flag.');
        ids.set(b.attrs.ID,String(index));
      }
      meta.children = meta.children.filter(n => typeof n === 'string' || !['HeaderHash','Binaries'].includes(n.name));
      walk(xml,n => { if (n.name === 'Value' && n.attrs.Ref !== undefined) { const ref = ids.get(n.attrs.Ref); if (ref === undefined) throw new Error('Invalid legacy attachment reference.'); n.attrs.Ref = ref; } if (DATE_NAMES.has(n.name)) n.children = [date64(isoDate(text(n),3))]; });
      let remaining = MAX - Buffer.byteLength(serializeXml(xml));
      for (const b of definitions) {
        const fail = () => Object.assign(new Error(`Legacy KDBX attachment ${binaries.length + 1} exceeds the remaining combined 8 MiB XML/attachment preservation limit.`),{ code: 'ERR_KDBX_PRESERVATION_LIMIT',attachmentIndex: binaries.length });
        // Four Base64 characters encode at most three raw bytes. Bound zlib's
        // output before conversion/retention, rather than checking the sum only
        // after all highly compressed records have been expanded.
        const decodedLimit = Math.floor(remaining / 4) * 3; let data = base64(text(b).replace(/\s/g,''));
        try {
          if (['True','true','1'].includes(b.attrs.Compressed)) {
            const compressed = data;
            try { data = inflate(compressed,decodedLimit); } catch (error) { if (error.code === 'ERR_BUFFER_TOO_LARGE') throw fail(); throw error; } finally { compressed.fill(0); }
          }
          const encodedLength = 4 * Math.ceil(data.length / 3); if (encodedLength > remaining) throw fail();
          binaries.push({ protected: ['True','true','1'].includes(b.attrs.Protected),dataBase64: data.toString('base64') }); remaining -= encodedLength;
        } finally { data.fill(0); }
      }
    } else if (one(meta,'Binaries') && nodes(one(meta,'Binaries')).length) throw new Error('Unsupported legacy binary definitions in KDBX 4.');
    checkReferences(xml,binaries); const { entries } = documentEntries(xml,4);
    const document = serializeXml(xml); if (Buffer.byteLength(document) + binaries.reduce((sum,b) => sum + b.dataBase64.length,0) > MAX) throw new Error('Imported content exceeds the 8 MiB local preservation limit.');
    return { version: 1,entries,kdbx: { xml: document,binaries,publicCustomData: header.fields.has(12) ? header.fields.get(12).toString('base64') : null,sourceVersion: `${header.major}.${header.minor}` } };
  } finally { for (const secret of [compositeKey,transformed,key,hmacKey,plaintext,innerKey,payload]) secret?.fill(0); }
}

function times(created,modified) { return element('Times',Object.entries({ LastModificationTime: date64(modified),CreationTime: date64(created),LastAccessTime: date64(modified),ExpiryTime: date64('2999-12-28T23:59:59Z'),Expires: 'False',UsageCount: '0',LocationChanged: date64(modified) }).map(([key,value]) => element(key,value))); }
function newGroup(name) { const now = new Date().toISOString(); return element('Group',[element('UUID',uuid64(randomUUID())),element('Name',name),element('Notes',''),element('IconID','48'),times(now,now),element('IsExpanded','True'),element('DefaultAutoTypeSequence',''),element('EnableAutoType','null'),element('EnableSearching','null'),element('LastTopVisibleEntry',Buffer.alloc(16).toString('base64'))]); }
function newDocument() { return element('KeePassFile',[element('Meta',[element('Generator','REA Vault'),element('DatabaseName','REA Vault'),element('DatabaseDescription',''),element('DefaultUserName',''),element('MemoryProtection',[element('ProtectPassword','True')]),element('RecycleBinEnabled','False'),element('RecycleBinUUID',Buffer.alloc(16).toString('base64'))]),element('Root',[newGroup('REA Vault'),element('DeletedObjects')])]); }
function syncDocument(data) {
  const xml = data.kdbx ? parseXml(data.kdbx.xml) : newDocument(), info = documentEntries(xml,4), existing = new Map(), ids = new Set(data.entries.map(e => e.id)), byGroup = new Map(info.groups.map(g => [g.id,g])), byPath = new Map();
  for (const group of info.groups) { const list = byPath.get(group.path) ?? []; list.push(group); byPath.set(group.path,list); for (const entry of nodes(group.node,'Entry')) existing.set(uuid(text(one(entry,'UUID',true))),{ node: entry,group }); group.node.children = group.node.children.filter(n => typeof n === 'string' || n.name !== 'Entry' || ids.has(uuid(text(one(n,'UUID',true))))); }
  function groupFor(e) {
    const original = byGroup.get(e.kdbxGroupId); if (original?.path === e.group) return original;
    const found = byPath.get(e.group); if (found?.length > 1) throw new Error('Ambiguous duplicate KeePass group path; preserve the existing group or choose another path.'); if (found?.length) return found[0];
    if (!e.group) return info.groups[0]; let parent = info.groups[0], path = '';
    for (const name of e.group.split('/')) { if (!name) throw new Error('Group paths cannot contain empty segments.'); path = path ? path + '/' + name : name; const match = byPath.get(path); if (match?.length > 1) throw new Error('Ambiguous KeePass group path.'); if (match?.length) parent = match[0]; else { const node = newGroup(name), group = { id: uuid(text(one(node,'UUID'))),path,node }; parent.node.children.push(node); byPath.set(path,[group]); byGroup.set(group.id,group); parent = group; } }
    return parent;
  }
  for (const e of data.entries) {
    const old = existing.get(e.id), group = groupFor(e); let target = old?.node;
    if (!target) { target = element('Entry',[element('UUID',uuid64(e.id)),element('IconID','0'),times(e.createdAt,e.updatedAt),element('AutoType',[element('Enabled','True'),element('DataTransferObfuscation','0'),element('DefaultSequence','')]),element('History')]); group.node.children.push(target); }
    else if (old.group !== group) { old.group.node.children = old.group.node.children.filter(n => n !== target); group.node.children.push(target); }
    let changed = !old;
    const fields = { ...FIELD_MAP,totpSecret: 'REA.TOTP.Secret' };
    for (const [local,label] of Object.entries(fields)) {
      let item = nodes(target,'String').find(n => text(one(n,'Key',true)) === label);
      if (local === 'totpSecret' && !e[local] && !item) continue;
      if (!item) { item = element('String',[element('Key',label),element('Value','',local === 'password' || local === 'totpSecret' ? { Protected: 'True' } : {})]); target.children.push(item); }
      const value = one(item,'Value',true); if (text(value) !== e[local]) { changed = true; value.children = [e[local]]; }
    }
    if (changed) { let t = one(target,'Times'); if (!t) { t = times(e.createdAt,e.updatedAt); target.children.push(t); } put(t,'LastModificationTime',date64(e.updatedAt)); }
  }
  one(xml,'Meta',true).children = one(xml,'Meta').children.filter(n => typeof n === 'string' || !['HeaderHash','Binaries'].includes(n.name));
  checkReferences(xml,data.kdbx?.binaries ?? []); return xml;
}

// Stage history code uses the same native XML projection/materialization;
// these helpers never derive keys or execute the original implementation.
export const materializeKdbxDocument = data => syncDocument(data);
export const projectKdbxDocument = xml => documentEntries(xml,4).entries;
export const decodeKdbxDate = value => isoDate(value,4);
export const encodeKdbxDate = value => date64(value);

export async function exportKdbx(data,credentials = {},options = {}) {
  const version = options.version ?? '4.1', cipher = options.cipher ?? 'aes', kdf = options.kdf ?? 'argon2id';
  if (!['4.0','4.1'].includes(version) || !Object.hasOwn(CIPHERS,cipher) || !Object.hasOwn(KDFS,kdf)) throw new Error('Unsupported KDBX export version, cipher or KDF.');
  if (version === '4.0' && data.kdbx?.sourceVersion === '4.1') throw new Error('Downgrading an imported KDBX 4.1 document to 4.0 is unsupported; export 4.1 to retain its metadata.');
  const params = { $UUID: { type: 0x42,value: Buffer.from(KDFS[kdf],'hex') },S: { type: 0x42,value: randomBytes(32) } };
  if (kdf === 'aes') params.R = { type: 0x05,value: BigInt(number(options.rounds ?? 100000,1,2000000,'AES-KDF rounds')) };
  else { params.I = { type: 0x05,value: BigInt(number(options.passes ?? 3,1,32,'Argon2 passes')) }; params.M = { type: 0x05,value: BigInt(number(options.memoryMiB ?? 64,1,128,'Argon2 memory MiB') * 1024 * 1024) }; params.P = { type: 0x04,value: number(options.parallelism ?? 2,1,16,'Argon2 parallelism') }; params.V = { type: 0x04,value: 0x13 }; }
  const compositeKey = composite(credentials), masterSeed = randomBytes(32), iv = randomBytes(cipher === 'aes' ? 16 : 12), innerKey = randomBytes(64); let transformed, key, hmacKey, payload;
  try {
    const xml = syncDocument(data), stream = innerStream(3,innerKey); try { protectedStrings(xml,stream,true); } finally { stream.dispose(); }
    const inner = [fieldRecord(1,u32(3)),fieldRecord(2,innerKey)];
    for (const binary of data.kdbx?.binaries ?? []) inner.push(fieldRecord(3,Buffer.concat([Buffer.from([binary.protected ? 1 : 0]),base64(binary.dataBase64)])));
    payload = Buffer.concat([...inner,fieldRecord(0,Buffer.alloc(0)),Buffer.from(serializeXml(xml))]); if (payload.length > MAX) throw new Error('KDBX export content exceeds 8 MiB.');
    const compressed = options.compression !== false; if (compressed) { const old = payload; payload = gzipSync(payload); old.fill(0); }
    const fields = [u32(0x9AA2D903),u32(0xB54BFB67),u32(version === '4.1' ? 0x00040001 : 0x00040000),fieldRecord(2,Buffer.from(CIPHERS[cipher],'hex')),fieldRecord(3,u32(compressed ? 1 : 0)),fieldRecord(4,masterSeed),fieldRecord(7,iv),fieldRecord(11,writeDictionary(params))];
    if (data.kdbx?.publicCustomData) { const b = base64(data.kdbx.publicCustomData,65536); dictionary(b); fields.push(fieldRecord(12,b)); }
    fields.push(fieldRecord(0,Buffer.from('0d0a0d0a','hex'))); const header = Buffer.concat(fields);
    transformed = await transform(compositeKey,params); key = sha('sha256',masterSeed,transformed); hmacKey = sha('sha512',masterSeed,transformed,Buffer.from([1])); const hk = sha('sha512',u64(0xFFFFFFFFFFFFFFFFn),hmacKey);
    try { const result = Buffer.concat([header,sha('sha256',header),mac(hk,header),writeBlocks(crypt(cipher,true,key,iv,payload),hmacKey)]); if (result.length > MAX) throw new Error('KDBX file exceeds 8 MiB.'); return result; } finally { hk.fill(0); }
  } finally { for (const secret of [compositeKey,transformed,key,hmacKey,innerKey,payload]) secret?.fill(0); }
}
