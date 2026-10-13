import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { start } from '../../server.mjs';

test('backup HTTP snapshot, integrity, listing and restore persist across host restarts',async t => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(),'rea-backup-http-')); let host = await start({ port: 0,dataDir });
  t.after(async () => { await host.close(); assert.equal(path.dirname(dataDir),path.resolve(os.tmpdir())); assert.ok(path.basename(dataDir).startsWith('rea-backup-http-')); await fs.rm(dataDir,{ recursive: true,force: true }); });
  async function call(action,input = {}) {
    const response = await fetch(`${host.url}/api/backup/${action}`,{ method: 'POST',headers: { 'content-type': 'application/json','x-rea-token': host.token },body: JSON.stringify(input) });
    const payload = await response.json(); assert.equal(response.status,200,payload.error); return payload.result;
  }
  await call('putFile',{ path: 'source/hello.txt',content: 'HTTP backup fixture' }); const saved = await call('snapshot',{ source: 'source',label: 'HTTP snapshot' });
  await host.close(); host = await start({ port: 0,dataDir }); assert.equal((await call('list')).snapshots[0].id,saved.id); assert.equal((await call('check',{ id: saved.id })).verified,true);
  await call('restore',{ id: saved.id,destination: 'restored',confirm: true }); assert.equal(await fs.readFile(path.join(dataDir,'backup','workspace','restored','hello.txt'),'utf8'),'HTTP backup fixture');
  assert.equal((await fetch(`${host.url}/apps/backup/client.mjs`)).status,200);
});
