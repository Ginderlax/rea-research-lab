import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { start } from '../../server.mjs';
test('rclone HTTP preview, separate removal approval, exact recovery bytes and persisted status survive restart',async t => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(),'rea-rclone-http-')); let host = await start({port:0,dataDir});
  t.after(async () => { await host.close(); if (path.dirname(path.resolve(dataDir)) !== path.resolve(os.tmpdir()) || !path.basename(dataDir).startsWith('rea-rclone-http-')) throw Error('Unsafe HTTP fixture cleanup.'); await fs.rm(dataDir,{recursive:true,force:true}); });
  async function call(action,input = {},expected = 200) { const response = await fetch(`${host.url}/api/sync/${action}`,{method:'POST',headers:{'content-type':'application/json','x-rea-token':host.token},body:JSON.stringify(input)}), payload = await response.json(); assert.equal(response.status,expected,payload.error); return payload.result ?? payload; }
  for (const [name,content] of [['source/a.txt','current'],['source/new.txt','added'],['target/a.txt','previous'],['target/extra.txt','removal'],['target/private/keep.txt','excluded']]) await call('putFile',{path:name,content});
  const workspace = path.join(dataDir,'sync','workspace'), plan = await call('rclone-plan',{source:'source',target:'target',mode:'sync',comparison:{checksum:true},filters:{filterFrom:['# retained folder\n- /private/**\n']}});
  assert.equal(plan.dryRun,true); assert.equal(await fs.readFile(path.join(workspace,'target/a.txt'),'utf8'),'previous');
  const failed = await call('rclone-apply',{token:plan.token,confirm:true},400); assert.match(failed.error,/own explicit confirmation/); assert.equal(await fs.readFile(path.join(workspace,'target/extra.txt'),'utf8'),'removal');
  const result = await call('rclone-apply',{token:plan.token,confirm:true,allowDelete:true}); assert.equal(result.copied,2); assert.equal(result.removed,1);
  assert.equal(await fs.readFile(path.join(workspace,'target/a.txt'),'utf8'),'current'); assert.equal(await fs.readFile(path.join(workspace,'target/private/keep.txt'),'utf8'),'excluded');
  assert.equal(await fs.readFile(path.join(workspace,result.historyFolder,'previous/a.txt'),'utf8'),'previous'); assert.equal(await fs.readFile(path.join(workspace,result.historyFolder,'previous/extra.txt'),'utf8'),'removal');
  const pending = await call('rclone-plan',{source:'source',target:'target',comparison:{checksum:true}}); await host.close(); host = await start({port:0,dataDir});
  assert.deepEqual((await call('rclone-status')).lastResult,result); assert.equal((await call('rclone-status')).fullProductComplete,false); await call('rclone-apply',{token:pending.token,confirm:true},400);
  const stale = await call('rclone-plan',{source:'source',target:'target',comparison:{checksum:true}}); await fs.writeFile(path.join(workspace,'source/a.txt'),'changed'); const error = await call('rclone-apply',{token:stale.token,confirm:true},400); assert.match(error.error,/Folders changed/); assert.equal(await fs.readFile(path.join(workspace,'target/a.txt'),'utf8'),'current');
  const client = await fetch(`${host.url}/apps/sync/client.mjs`); assert.equal(client.status,200); assert.match(await client.text(),/rclone-controls/);
});
