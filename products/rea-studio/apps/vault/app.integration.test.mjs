import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { start } from '../../server.mjs';
import { exportKdbx,importKdbx } from './kdbx.mjs';

test('vault HTTP CRUD persists encrypted data across host restarts and authenticates master passwords',async t => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(),'rea-vault-http-')); let host = await start({ port: 0,dataDir });
  t.after(async () => { await host.close(); assert.equal(path.dirname(dataDir),path.resolve(os.tmpdir())); assert.ok(path.basename(dataDir).startsWith('rea-vault-http-')); await fs.rm(dataDir,{ recursive: true,force: true }); });
  async function call(action,input = {},expected = 200) {
    const response = await fetch(`${host.url}/api/vault/${action}`,{ method: 'POST',headers: { 'content-type': 'application/json','x-rea-token': host.token },body: JSON.stringify(input) });
    const payload = await response.json(); assert.equal(response.status,expected,payload.error); return payload.result ?? payload;
  }
  await call('create',{ password: 'HTTP-synthetic-master' }); const saved = await call('save',{ title: 'HTTP entry',password: 'HTTP-synthetic-secret' });
  const persisted = await fs.readFile(path.join(dataDir,'vault','records','vault.database.json'),'utf8'); assert.equal(persisted.includes('HTTP-synthetic-secret'),false); assert.equal(persisted.includes('HTTP-synthetic-master'),false);
  // Close while unlocked: the host's disposal hook must drop the key/session.
  await host.close(); host = await start({ port: 0,dataDir });
  assert.equal((await call('status')).locked,true); await call('unlock',{ password: 'incorrect-master-password' },400);
  await call('unlock',{ password: 'HTTP-synthetic-master' }); assert.equal((await call('read',{ id: saved.id })).entry.password,'HTTP-synthetic-secret');
  assert.equal((await fetch(`${host.url}/apps/vault/client.mjs`)).status,200);
});

test('KDBX HTTP import/export preserves encrypted document metadata across restart and failed replacement leaves existing data intact',async t => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(),'rea-vault-kdbx-http-')); let host = await start({ port: 0,dataDir });
  t.after(async () => { await host.close(); assert.equal(path.dirname(dataDir),path.resolve(os.tmpdir())); assert.ok(path.basename(dataDir).startsWith('rea-vault-kdbx-http-')); await fs.rm(dataDir,{ recursive: true,force: true }); });
  async function call(action,input = {},expected = 200) {
    const response = await fetch(`${host.url}/api/vault/${action}`,{ method: 'POST',headers: { 'content-type': 'application/json','x-rea-token': host.token },body: JSON.stringify(input) });
    const payload = await response.json(); assert.equal(response.status,expected,payload.error); return payload.result ?? payload;
  }
  const now = '2024-01-02T03:04:05Z', credentials = { password: 'Synthetic-source-password' }, options = { kdf: 'argon2id',memoryMiB: 8,passes: 1,parallelism: 1 };
  const original = { version: 1,entries: [{ id: '00000000-1111-2222-3333-444444444444',title: 'HTTP KDBX account',username: 'Synthetic-user',password: 'Synthetic-sensitive-password',url: '',group: 'Study/Nested',notes: 'Encrypted document note',totpSecret: '',createdAt: now,updatedAt: now }] };
  const bytes = await exportKdbx(original,credentials,options), source = await importKdbx(bytes,credentials); source.kdbx.xml = source.kdbx.xml.replace('</Meta>','<CustomData><Item><Key>study.private</Key><Value>Synthetic-private-metadata</Value></Item></CustomData></Meta>');
  const fileBase64 = (await exportKdbx(source,credentials,options)).toString('base64');
  await call('importKdbx',{ fileBase64,password: credentials.password,localPassword: 'Local-synthetic-master' });
  const persisted = await fs.readFile(path.join(dataDir,'vault','records','vault.database.json'),'utf8');
  for (const secret of ['Synthetic-sensitive-password','Synthetic-private-metadata','Local-synthetic-master','Synthetic-source-password','Encrypted document note']) assert.equal(persisted.includes(secret),false);
  await call('importKdbx',{ fileBase64,password: credentials.password,localPassword: 'Local-synthetic-master' },400);
  await call('importKdbx',{ fileBase64,password: 'wrong',localPassword: 'Local-synthetic-master',confirmReplace: true },400);
  assert.equal((await call('list')).entries.length,1);
  await host.close(); host = await start({ port: 0,dataDir }); await call('exportKdbx',{ password: credentials.password,options },400);
  await call('unlock',{ password: 'Local-synthetic-master' }); const entry = (await call('read',{ id: original.entries[0].id })).entry;
  await call('save',{ ...entry,password: 'Edited-synthetic-password' }); const exported = await call('exportKdbx',{ password: 'New-export-password',options });
  assert.equal(exported.bytes,Buffer.from(exported.fileBase64,'base64').length);
  const decoded = await importKdbx(Buffer.from(exported.fileBase64,'base64'),{ password: 'New-export-password' }); assert.equal(decoded.entries[0].password,'Edited-synthetic-password'); assert.match(decoded.kdbx.xml,/Synthetic-private-metadata/); assert.equal(decoded.entries[0].group,'Study/Nested');
  await call('delete',{ id: entry.id,confirm: true }); const empty = await call('exportKdbx',{ password: credentials.password,options }); assert.equal((await importKdbx(Buffer.from(empty.fileBase64,'base64'),credentials)).entries.length,0);
});
