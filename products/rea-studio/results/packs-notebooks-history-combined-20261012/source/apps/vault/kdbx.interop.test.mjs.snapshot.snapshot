import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { importKdbx,exportKdbx } from './kdbx.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const oracle = process.env.REA_KEEPASS_EXE ?? path.resolve(here,'../../../..','projects/07-keepass/artifacts/portable/KeePass.exe');
const present = process.platform === 'win32' && await fs.access(oracle).then(() => true,() => false);
const pass = 'Synthetic-oracle-master';
async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(),'rea-kdbx-interop-')); let counter = 0;
  t.after(async () => { assert.equal(path.dirname(directory),path.resolve(os.tmpdir())); assert.ok(path.basename(directory).startsWith('rea-kdbx-interop-')); await fs.rm(directory,{ recursive: true,force: true }); });
  async function original(config) {
    const cfg = path.join(directory,`config-${counter++}.json`); await fs.writeFile(cfg,JSON.stringify({ oracle,password: pass,...config }));
    return new Promise((resolve,reject) => {
      const child = spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(here,'keepass-oracle.ps1'),'-Config',cfg],{ windowsHide: true }); let out = '', error = '';
      const timeout = setTimeout(() => { child.kill(); reject(new Error('KeePass fixture oracle timed out.')); },30000);
      child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8'); child.stdout.on('data',c => out += c); child.stderr.on('data',c => error += c);
      child.on('error',e => { clearTimeout(timeout); reject(e); }); child.on('close',code => { clearTimeout(timeout); if (code) return reject(new Error(error || `Oracle exited ${code}`)); try { resolve(JSON.parse(out.trim())); } catch(e) { reject(new Error(`Invalid oracle result: ${e.message}; ${out}`)); } });
    });
  }
  return { directory,original };
}
test('KeePass 2.61.1 independently creates and opens KDBX across every supported KDF/cipher pair', { skip: !present && 'Preserved KeePass 2.61.1 oracle / Windows PowerShell unavailable.' },async t => {
  const { directory,original } = await fixture(t);
  for (const cipher of ['aes','chacha20']) for (const kdf of ['aes','argon2d','argon2id']) {
    const file = path.join(directory,`original-${cipher}-${kdf}.kdbx`); await original({ mode: 'create',database: file,cipher,kdf,version: '4.1' });
    const expected = await original({ mode: 'read',database: file }); const imported = await importKdbx(await fs.readFile(file),{ password: pass });
    assert.equal(imported.entries[0].password,'synthetic-current-secret'); assert.equal(imported.entries[0].group,'Parent/Child'); assert.match(imported.entries[0].notes,/λ 🎛/);
    const target = path.join(directory,`lab-${cipher}-${kdf}.kdbx`); await fs.writeFile(target,await exportKdbx(imported,{ password: pass },{ cipher,kdf,memoryMiB: 8,passes: 1,parallelism: 1,rounds: 100 }));
    const actual = await original({ mode: 'read',database: target }); assert.deepEqual(actual,expected);
    imported.entries[0].password = 'Synthetic replacement secret'; imported.entries[0].updatedAt = '2025-01-02T03:04:05Z';
    await fs.writeFile(target,await exportKdbx(imported,{ password: pass },{ cipher,kdf,memoryMiB: 8,passes: 1,parallelism: 1,rounds: 100 }));
    const changed = await original({ mode: 'read',database: target }); assert.equal(changed.entries[0].fields.Password,'Synthetic replacement secret'); changed.entries[0].fields.Password = expected.entries[0].fields.Password; assert.deepEqual(changed,expected);
  }
});
test('original KeePass 3.1/Salsa20 import and 4.0 import preserve history and attachments on 4.1 export', { skip: !present && 'Preserved KeePass 2.61.1 oracle / Windows PowerShell unavailable.' },async t => {
  const { directory,original } = await fixture(t);
  for (const version of ['3.1','4.0']) for (const compression of [true,false]) {
    const file = path.join(directory,`original-${version}-${compression}.kdbx`); await original({ mode: 'create',database: file,kdf: 'aes',cipher: 'aes',version,compression });
    const bytes = await fs.readFile(file); assert.equal(bytes.readUInt32LE(8),version === '3.1' ? 0x00030001 : 0x00040000);
    const expected = await original({ mode: 'read',database: file }), data = await importKdbx(bytes,{ password: pass });
    assert.equal(data.entries[0].password,'synthetic-current-secret'); const target = path.join(directory,'lab-upgrade.kdbx'); await fs.writeFile(target,await exportKdbx(data,{ password: pass },{ kdf: 'aes',rounds: 100 }));
    assert.deepEqual(await original({ mode: 'read',database: target }),expected);
  }
});
test('independent original opens fresh Lab database; password + XML keyfile and keyfile-only work in both directions', { skip: !present && 'Preserved KeePass 2.61.1 oracle / Windows PowerShell unavailable.' },async t => {
  const { directory,original } = await fixture(t); const key = Buffer.alloc(32,23), keyfile = path.join(directory,'synthetic.keyx');
  const { createHash } = await import('node:crypto'); const hash = createHash('sha256').update(key).digest('hex').slice(0,8);
  const xml = `<KeyFile><Meta><Version>2.0</Version></Meta><Key><Data Hash="${hash}">${key.toString('hex')}</Data></Key></KeyFile>`; await fs.writeFile(keyfile,xml);
  for (const usePassword of [true,false]) {
    const file = path.join(directory,`keyfile-${usePassword}.kdbx`); await original({ mode: 'create',database: file,keyFile: keyfile,usePassword,kdf: 'argon2id',cipher: 'chacha20' });
    const expected = await original({ mode: 'read',database: file,keyFile: keyfile,usePassword }), credentials = { password: pass,usePassword,keyFileBase64: Buffer.from(xml).toString('base64') }, data = await importKdbx(await fs.readFile(file),credentials);
    const target = path.join(directory,'keyfile-lab.kdbx'); await fs.writeFile(target,await exportKdbx(data,credentials,{ kdf: 'argon2id',memoryMiB: 8,passes: 1,parallelism: 1 })); assert.deepEqual(await original({ mode: 'read',database: target,keyFile: keyfile,usePassword }),expected);
  }
  const fresh = { version: 1,entries: [{ id: '00000000-1111-2222-3333-444444444444',title: 'Fresh synthetic entry',username: 'user\rname',password: 'fresh secret',url: '',notes: 'a\r\nb\rc',group: 'New/Nested',totpSecret: '',createdAt: '2024-01-02T03:04:05Z',updatedAt: '2024-01-02T03:04:05Z' }] };
  const file = path.join(directory,'fresh.kdbx'); await fs.writeFile(file,await exportKdbx(fresh,{ password: pass })); const opened = await original({ mode: 'read',database: file }); assert.equal(opened.entries[0].group,'New/Nested'); assert.equal(opened.entries[0].fields.Password,'fresh secret'); assert.equal(opened.entries[0].fields.UserName,fresh.entries[0].username); assert.equal(opened.entries[0].fields.Notes,fresh.entries[0].notes);
});
test('original arbitrary 64-byte high-bit key files use hashed bytes rather than masked ASCII', { skip: !present && 'Preserved KeePass 2.61.1 oracle / Windows PowerShell unavailable.' },async t => {
  const { directory,original } = await fixture(t), keyFile = path.join(directory,'high-bit.key'), key = Buffer.alloc(64,0xB0), database = path.join(directory,'original-high-bit.kdbx'); await fs.writeFile(keyFile,key);
  await original({ mode: 'create',database,keyFile,kdf: 'argon2id',cipher: 'aes' }); const expected = await original({ mode: 'read',database,keyFile });
  const credentials = { password: pass,keyFileBase64: key.toString('base64') }, data = await importKdbx(await fs.readFile(database),credentials), target = path.join(directory,'lab-high-bit.kdbx');
  await fs.writeFile(target,await exportKdbx(data,credentials,{ kdf: 'argon2id',memoryMiB: 8,passes: 1,parallelism: 1 })); assert.deepEqual(await original({ mode: 'read',database: target,keyFile }),expected);
});
test('authentic original compressed database with oversized attachment fails the inflation limit', { skip: !present && 'Preserved KeePass 2.61.1 oracle / Windows PowerShell unavailable.' },async t => {
  const { directory,original } = await fixture(t), database = path.join(directory,'oversized.kdbx');
  await original({ mode: 'create',database,kdf: 'aes',cipher: 'aes',version: '4.1',largeAttachmentBytes: 9 * 1024 * 1024 });
  const bytes = await fs.readFile(database); assert.ok(bytes.length < 8 * 1024 * 1024);
  await assert.rejects(importKdbx(bytes,{ password: pass }),error => error.code === 'ERR_BUFFER_TOO_LARGE');
});
test('legacy compressed attachments stop at the remaining aggregate XML/Base64 budget before retaining all binaries', { skip: !present && 'Preserved KeePass 2.61.1 oracle / Windows PowerShell unavailable.' },async t => {
  const { directory,original } = await fixture(t), database = path.join(directory,'legacy-multi-compressed.kdbx');
  await original({ mode: 'create',database,kdf: 'aes',cipher: 'aes',version: '3.1',multiAttachmentCount: 3,multiAttachmentBytes: 4 * 1024 * 1024,metadataOnly: true });
  const checked = await original({ mode: 'read',database,metadataOnly: true }), binaries = Object.values(checked.entries[0].binaries);
  assert.equal(binaries.length,3); assert.ok(binaries.every(b => b.bytes === 4 * 1024 * 1024)); assert.equal(new Set(binaries.map(b => b.sha256)).size,3); assert.equal(checked.entries[0].history.length,1);
  const bytes = await fs.readFile(database); assert.equal(bytes.readUInt32LE(8),0x00030001); assert.ok(bytes.length < 128 * 1024,'Highly compressed genuine fixture must fit within the input bound.');
  await assert.rejects(importKdbx(bytes,{ password: pass }),error => error.code === 'ERR_KDBX_PRESERVATION_LIMIT' && error.attachmentIndex === 1);
  // A smaller original fixture verifies that the cumulative guard retains all
  // supported attachments rather than rejecting every multi-binary database.
  const supported = path.join(directory,'legacy-supported-compressed.kdbx');
  await original({ mode: 'create',database: supported,kdf: 'aes',cipher: 'aes',version: '3.1',multiAttachmentCount: 3,multiAttachmentBytes: 1024 * 1024,metadataOnly: true });
  const imported = await importKdbx(await fs.readFile(supported),{ password: pass }); assert.equal(imported.kdbx.binaries.length,3);
  assert.ok(imported.kdbx.binaries.every(b => Buffer.from(b.dataBase64,'base64').length === 1024 * 1024));
});
