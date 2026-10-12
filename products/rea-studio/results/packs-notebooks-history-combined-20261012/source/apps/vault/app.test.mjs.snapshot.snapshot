import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { handle, totp } from './server.mjs';
import { createStore,createWorkspace } from '../../lib/storage.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'rea-vault-test-'));
  const file = path.join(root,'store','vault.database.json');
  const store = await createStore(path.join(root,'store'));
  const workspace = await createWorkspace(path.join(root,'workspace'));
  const call = (action,input = {}) => handle({ action,input,store,workspace });
  t.after(async () => { await call('lock'); assert.equal(path.dirname(root),path.resolve(os.tmpdir())); assert.ok(path.basename(root).startsWith('rea-vault-test-')); await fs.rm(root,{ recursive: true,force: true }); });
  return { call,store,file };
}
test('encrypted entries survive lock and unlock without persisted plaintext; wrong passwords and tampering fail',async t => {
  const { call,store,file } = await fixture(t);
  await call('create',{ password: 'Example-master-phrase' });
  const { id } = await call('save',{ title: 'Sensitive account title', username: 'example-username', password: 'private-credential-123', notes: 'Confidential note', group: 'Example', totpSecret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ' });
  const persisted = await fs.readFile(file,'utf8');
  for (const secret of ['Example-master-phrase','Sensitive account title','example-username','private-credential-123','Confidential note','GEZDGNBV']) assert.equal(persisted.includes(secret),false);
  assert.equal((await call('list',{ search: 'account' })).entries[0].id,id);
  assert.equal('password' in (await call('list')).entries[0],false);
  await call('lock'); await assert.rejects(call('read',{ id }),/locked/);
  await assert.rejects(call('unlock',{ password: 'incorrect-password' }),/incorrect|damaged/);
  await call('unlock',{ password: 'Example-master-phrase' });
  assert.equal((await call('read',{ id })).entry.password,'private-credential-123');
  assert.equal((await call('totp',{ id,time: 59000,digits: 8 })).code,'94287082');
  const valid = await store.get('vault.database'); const corrupt = structuredClone(valid);
  const cipher = Buffer.from(corrupt.ciphertext,'base64'); cipher[0] ^= 1; corrupt.ciphertext = cipher.toString('base64');
  await store.set('vault.database',corrupt); await call('lock');
  await assert.rejects(call('unlock',{ password: 'Example-master-phrase' }),/incorrect|damaged/);
  await store.set('vault.database',valid); await call('unlock',{ password: 'Example-master-phrase' });
  await assert.rejects(call('delete',{ id }),/confirmation/);
  await call('delete',{ id,confirm: true }); assert.equal((await call('list')).entries.length,0);
});
test('password changes rotate salt/key, encrypted export can be imported, and concurrent entries are retained',async t => {
  const { call,store } = await fixture(t); await call('create',{ password: 'Original-master-password' });
  await Promise.all(Array.from({ length: 8 },(_,i) => call('save',{ title: `Entry ${i}`,password: `value-${i}` })));
  assert.equal((await call('list')).entries.length,8);
  const before = await store.get('vault.database');
  await assert.rejects(call('changePassword',{ currentPassword: 'wrong-master-password',newPassword: 'New-master-password' }),/incorrect|damaged/);
  await call('changePassword',{ currentPassword: 'Original-master-password',newPassword: 'New-master-password' });
  const after = await store.get('vault.database'); assert.notEqual(before.salt,after.salt); assert.notEqual(before.iv,after.iv);
  const exported = (await call('exportEncrypted')).document;
  await call('lock'); await assert.rejects(call('unlock',{ password: 'Original-master-password' }),/incorrect|damaged/);
  await call('unlock',{ password: 'New-master-password' }); assert.equal((await call('list')).entries.length,8);
  await assert.rejects(call('importEncrypted',{ document: exported,password: 'New-master-password' }),/confirmation/);
  await call('importEncrypted',{ document: JSON.stringify(exported),password: 'New-master-password',confirmReplace: true }); assert.equal((await call('list')).entries.length,8);
  const generated = await call('generate',{ length: 48,alphabet: 'abcdef0123456789' }); assert.match(generated.password,/^[abcdef0123456789]{48}$/);
  await assert.rejects(call('generate',{ length: 0 }),/Invalid/);
});
test('TOTP matches six RFC 6238 SHA-1 vectors and rejects invalid Base32',() => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  for (const [seconds,code] of [[59,'94287082'],[1111111109,'07081804'],[1111111111,'14050471'],[1234567890,'89005924'],[2000000000,'69279037'],[20000000000,'65353130']]) assert.equal(totp(secret,{ time: seconds * 1000,digits: 8 }).code,code);
  assert.throws(() => totp('../invalid'),/Base32/); assert.throws(() => totp('A'),/trailing/);
});
test('idle timer locks the vault without requiring a later expiry-check request',async t => {
  const { call } = await fixture(t); await call('create',{ password: 'Example-idle-master' });
  // Advance the native timeout itself. Date remains unchanged, so read's lazy
  // elapsed-time check cannot be responsible for this lock.
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await call('list'); t.mock.timers.tick(5 * 60 * 1000 + 1);
  await assert.rejects(call('read',{ id: 'anything' }),/locked/);
  t.mock.timers.reset();
});
