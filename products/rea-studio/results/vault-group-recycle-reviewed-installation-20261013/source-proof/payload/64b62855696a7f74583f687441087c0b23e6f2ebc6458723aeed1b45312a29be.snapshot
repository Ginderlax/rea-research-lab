import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { exportKdbx, importKdbx, keyFileComponent, base64 } from './kdbx.mjs';
import { parseXml, serializeXml, element } from './xml.mjs';
const pass = 'Synthetic-KDBX-password';
function fixture() { return { version: 1, entries: [{ id: '1e7d7640-1111-2222-3333-7d2a495e912f',title: 'Synthetic <account> & test',username: 'user λ',password: 'Synthetic & secret 🎛',url: 'https://example.invalid',group: 'Parent/Child',notes: 'Line one\nLine two',totpSecret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',createdAt: '2024-01-02T03:04:05.000Z',updatedAt: '2024-06-07T08:09:10.000Z' }] }; }
const quick = { rounds: 100,memoryMiB: 8,passes: 1,parallelism: 1 };
test('Base64 decoding handles large values up to the 8 MiB bound without regex stack growth',() => {
  for (const size of [4000000,8000000,8 * 1024 * 1024]) { const input = Buffer.alloc(size,19), decoded = base64(input.toString('base64')); assert.equal(decoded.length,size); assert.deepEqual(decoded,input); }
  assert.throws(() => base64(Buffer.alloc(8 * 1024 * 1024 + 1).toString('base64')),/oversized/);
});
function headerEnd(buffer) { let at = 12; while (true) { const id = buffer[at], size = buffer.readUInt32LE(at + 1); at += 5 + size; if (!id) return at; } }
function mutateHeader(buffer,fn) { const b = Buffer.from(buffer), end = headerEnd(b); fn(b,end); createHash('sha256').update(b.subarray(0,end)).digest().copy(b,end); return b; }
test('KDBX 4.0/4.1, AES/ChaCha20, AES-KDF/Argon2d/Argon2id and gzip/none roundtrip actual data',async () => {
  for (const version of ['4.0','4.1']) for (const cipher of ['aes','chacha20']) for (const kdf of ['aes','argon2d','argon2id']) for (const compression of [false,true]) {
    const original = fixture(), b = await exportKdbx(original,{ password: pass },{ ...quick,version,cipher,kdf,compression }), decoded = await importKdbx(b,{ password: pass });
    const { kdbxGroupId,...entry } = decoded.entries[0]; assert.deepEqual(entry,original.entries[0]); assert.ok(kdbxGroupId); assert.equal(decoded.kdbx.sourceVersion,version);
    assert.equal(b.includes(Buffer.from(original.entries[0].password)),false);
  }
});
test('KDBX authentication rejects wrong password/key, modified header/body/HMAC, truncation and trailing bytes',async () => {
  const b = await exportKdbx(fixture(),{ password: pass },{ ...quick,kdf: 'aes' });
  await assert.rejects(importKdbx(b,{ password: 'wrong' }),/Incorrect|corrupted/);
  const end = headerEnd(b);
  for (const position of [15,end,end + 32,end + 64,end + 64 + 36,b.length - 5]) { const bad = Buffer.from(b); bad[position] ^= 1; await assert.rejects(importKdbx(bad,{ password: pass })); }
  await assert.rejects(importKdbx(b.subarray(0,-1),{ password: pass }));
  await assert.rejects(importKdbx(Buffer.concat([b,Buffer.from([0])]),{ password: pass }),/trailing/);
  const key = Buffer.alloc(32,11), keyed = await exportKdbx(fixture(),{ password: pass,keyFileBase64: key.toString('base64') },{ ...quick,kdf: 'aes' });
  await assert.rejects(importKdbx(keyed,{ password: pass }),/Incorrect|corrupted/);
  assert.equal((await importKdbx(keyed,{ password: pass,keyFileBase64: key.toString('base64') })).entries[0].password,fixture().entries[0].password);
});
test('key files accept raw, hex, XML v1/v2 and hashed arbitrary contents with integrity checks',async () => {
  const key = Buffer.alloc(32,42), hash = createHash('sha256').update(key).digest('hex').slice(0,8);
  for (const f of [key,Buffer.from(key.toString('hex')),Buffer.from(`<KeyFile><Meta><Version>1.00</Version></Meta><Key><Data>${key.toString('base64')}</Data></Key></KeyFile>`),Buffer.from(`<KeyFile><Meta><Version>2.0</Version></Meta><Key><Data Hash="${hash}">${key.toString('hex').match(/.{8}/g).join(' ')}</Data></Key></KeyFile>`)]) assert.deepEqual(keyFileComponent(f),key);
  const file = Buffer.from('An arbitrary synthetic file.'); assert.deepEqual(keyFileComponent(file),createHash('sha256').update(file).digest());
  const highBits = Buffer.alloc(64,0xB0); assert.deepEqual(keyFileComponent(highBits),createHash('sha256').update(highBits).digest());
  assert.throws(() => keyFileComponent(Buffer.from(`<KeyFile><Meta><Version>2.0</Version></Meta><Key><Data Hash="00000000">${key.toString('hex')}</Data></Key></KeyFile>`)),/integrity/);
  const b = await exportKdbx(fixture(),{ usePassword: false,keyFileBase64: key.toString('base64') },{ ...quick,kdf: 'aes' });
  assert.equal((await importKdbx(b,{ usePassword: false,keyFileBase64: key.toString('base64') })).entries.length,1);
  await assert.rejects(importKdbx(b,{ password: '',keyFileBase64: key.toString('base64') }),/Incorrect/);
});
test('XML literal newline normalization and character-reference preservation follow XML 1.0',() => {
  assert.equal(parseXml('<x>a\r\nb\rc</x>').children.join(''),'a\nb\nc');
  assert.equal(parseXml('<x a="tab\tline\ncarriage\rreturn&#xD;"/>').attrs.a,'tab line carriage return\r');
  const original = element('x','a\r\nb\rc',{ whitespace: 'tab\tline\ncarriage\rreturn' });
  const decoded = parseXml(serializeXml(original)); assert.equal(decoded.children.join(''),'a\r\nb\rc'); assert.equal(decoded.attrs.whitespace,original.attrs.whitespace);
  assert.throws(() => parseXml('<?xml-stylesheet href="data"?><x/>'),/processing instructions/);
});
test('parser rejects future format/KDF, costly derivation, unsafe XML and missing references instead of dropping content',async () => {
  const b = await exportKdbx(fixture(),{ password: pass },{ ...quick,kdf: 'aes' });
  const future = Buffer.from(b); future.writeUInt32LE(0x00040002,8); await assert.rejects(importKdbx(future,{ password: pass }),/Supported KDBX/);
  const highCost = mutateHeader(b,copy => { const name = Buffer.from([1,0,0,0,82,8,0,0,0]); const at = copy.indexOf(name); assert.ok(at > 0); copy.writeBigUInt64LE(2000001n,at + name.length); });
  await assert.rejects(importKdbx(highCost,{ password: pass }),/resource bounds/);
  const unknownKdf = mutateHeader(b,copy => { const at = copy.indexOf(Buffer.from('c9d9f39a628a4460bf740d08c18a4fea','hex')); copy[at] ^= 1; }); await assert.rejects(importKdbx(unknownKdf,{ password: pass }),/key derivation/);
  for (const xml of ['<!DOCTYPE x [<!ENTITY ext SYSTEM "file:///secret">]><x>&ext;</x>','<x a="1" a="2"/>','<x>&unknown;</x>','<x>\u0000</x>','<x><a></x>','<x/><y/>','<x>'.repeat(65) + '</x>'.repeat(65)]) assert.throws(() => parseXml(xml));
  assert.throws(() => base64('QQ=')); assert.throws(() => parseXml('<x>' + 'a'.repeat(8 * 1024 * 1024) + '</x>'),/limit/);
  const data = await importKdbx(b,{ password: pass }); data.kdbx.xml = data.kdbx.xml.replace('</Entry>','<Binary><Key>missing</Key><Value Ref="999"></Value></Binary></Entry>');
  await assert.rejects(exportKdbx(data,{ password: pass },{ ...quick,kdf: 'aes',version: '4.0' }),/Downgrading/);
  await assert.rejects(exportKdbx(data,{ password: pass },{ ...quick,kdf: 'aes' }),/attachment reference/);
  const parsed = parseXml('<x a="&quot;">text &amp; &#x3BB;<![CDATA[<literal>]]></x>'); assert.equal(parseXml(serializeXml(parsed)).children.join(''),'text & λ<literal>');
});
