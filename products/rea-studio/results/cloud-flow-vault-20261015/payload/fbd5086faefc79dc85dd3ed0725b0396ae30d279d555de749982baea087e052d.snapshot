import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { start } from '../../server.mjs';

test('archive HTTP file creation, ZIP validation and extraction persist through host restarts',async t => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(),'rea-archive-http-')); let host = await start({ port: 0,dataDir });
  t.after(async () => { await host.close(); assert.equal(path.dirname(dataDir),path.resolve(os.tmpdir())); assert.ok(path.basename(dataDir).startsWith('rea-archive-http-')); await fs.rm(dataDir,{ recursive: true,force: true }); });
  async function call(action,input = {},expected = 200) {
    const response = await fetch(`${host.url}/api/archive/${action}`,{ method: 'POST',headers: { 'content-type': 'application/json','x-rea-token': host.token },body: JSON.stringify(input) });
    const payload = await response.json(); assert.equal(response.status,expected,payload.error); return payload.result ?? payload;
  }
  await call('putFile',{ path: 'source/hello.txt',content: 'Unicode archive 🌍' }); await call('create',{ source: 'source',output: 'hello.zip' });
  await host.close(); host = await start({ port: 0,dataDir }); assert.equal((await call('list',{ path: 'hello.zip' })).verified,true);
  await call('extract',{ path: 'hello.zip',destination: 'restored',confirm: true }); assert.equal(await fs.readFile(path.join(dataDir,'archive','workspace','restored','hello.txt'),'utf8'),'Unicode archive 🌍');
  await call('extract',{ path: 'hello.zip',destination: 'restored',confirm: true },400); assert.equal((await fetch(`${host.url}/apps/archive/client.mjs`)).status,200);
});
