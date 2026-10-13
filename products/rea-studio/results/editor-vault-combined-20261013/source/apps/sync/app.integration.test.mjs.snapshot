import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { start } from '../../server.mjs';

test('sync HTTP plan/apply persists baseline and recovery history through host restarts',async t => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(),'rea-sync-http-')); let host = await start({ port: 0,dataDir });
  t.after(async () => { await host.close(); assert.equal(path.dirname(dataDir),path.resolve(os.tmpdir())); assert.ok(path.basename(dataDir).startsWith('rea-sync-http-')); await fs.rm(dataDir,{ recursive: true,force: true }); });
  async function call(action,input = {}) {
    const response = await fetch(`${host.url}/api/sync/${action}`,{ method: 'POST',headers: { 'content-type': 'application/json','x-rea-token': host.token },body: JSON.stringify(input) });
    const payload = await response.json(); assert.equal(response.status,200,payload.error); return payload.result;
  }
  await call('putFile',{ path: 'source/a',content: 'current' }); await call('putFile',{ path: 'target/a',content: 'previous' });
  const plan = await call('plan',{ source: 'source',target: 'target' }), result = await call('apply',{ token: plan.token,resolutions: { a: 'source' },confirm: true });
  await host.close(); host = await start({ port: 0,dataDir }); assert.equal((await call('status')).lastResult.copied,1);
  const workspace = path.join(dataDir,'sync','workspace'); assert.equal(await fs.readFile(path.join(workspace,result.historyFolder,'target','a'),'utf8'),'previous');
  await fs.writeFile(path.join(workspace,'source','a'),'changed'); const followup = await call('plan',{ source: 'source',target: 'target' }); assert.equal(followup.conflicts[0].reason,'source-changed');
  assert.equal((await fetch(`${host.url}/apps/sync/client.mjs`)).status,200);
});
