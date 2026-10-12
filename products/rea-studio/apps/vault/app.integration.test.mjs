import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { start } from '../../server.mjs';

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
