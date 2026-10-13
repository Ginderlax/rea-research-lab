import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createWorkspace } from '../../../lib/storage.mjs';
import { handleNative,disposeNative,nativeLimits } from '../native.mjs';
import { digest } from './oracle.mjs';
const root = await fs.mkdtemp(path.join(os.tmpdir(),'rea-rclone-bounds-')), records = [];
async function sparse(workspace,name,size) { const file = await fs.open(workspace.resolve(name),'wx'); try { await file.truncate(size); } finally { await file.close(); } }
async function run(name,prepare,check) {
  const workspace = await createWorkspace(path.join(root,name)); await fs.mkdir(workspace.resolve('source')); const start = performance.now();
  try { await prepare(workspace); const operationStart = performance.now(); const result = await handleNative({workspace,action:'rclone-plan',input:{source:'source',target:'target',comparison:{checksum:true}}}); await check(workspace,result); records.push({name,passed:true,operationMilliseconds:performance.now()-operationStart,includingFixtureMilliseconds:performance.now()-start,operations:result.operations.length,processLifetimeMaximumRSSKiB:process.resourceUsage().maxRSS}); }
  finally { disposeNative(workspace); }
}
try {
  await run('max-file',workspace => sparse(workspace,'source/blob',nativeLimits.file),async (workspace,plan) => {
    assert.equal(plan.operations.length,1); assert.equal(plan.operations[0].source.size,nativeLimits.file);
    const result = await handleNative({workspace,action:'rclone-apply',input:{token:plan.token,confirm:true}}); assert.equal(result.copied,1);
    assert.equal(digest(await fs.readFile(workspace.resolve('target/blob'))),plan.operations[0].source.sha256);
  });
  await run('max-total-preview',async workspace => { for (let i = 0; i < 8; i++) await sparse(workspace,`source/blob-${i}`,nativeLimits.file); },async (workspace,plan) => {
    assert.equal(plan.operations.reduce((sum,op) => sum+op.source.size,0),nativeLimits.total); await assert.rejects(fs.stat(workspace.resolve('target')),{code:'ENOENT'});
  });
  await run('max-entries-preview',async workspace => { for (let i = 0; i < nativeLimits.entries; i++) await fs.writeFile(workspace.resolve(`source/file-${String(i).padStart(5,'0')}`),'',{flag:'wx'}); },async (workspace,plan) => {
    assert.equal(plan.operations.length,nativeLimits.entries); await assert.rejects(fs.stat(workspace.resolve('target')),{code:'ENOENT'});
    await fs.writeFile(workspace.resolve('source/one-too-many'),'',{flag:'wx'}); const start = performance.now();
    await assert.rejects(handleNative({workspace,action:'rclone-plan',input:{source:'source',target:'target'}}),/10,000 entries/);
    records.push({name:'over-max-entries',passed:true,rejectionMilliseconds:performance.now()-start});
  });
  const result = {checkedAt:new Date().toISOString(),platform:process.platform,node:process.version,limits:nativeLimits,records,allPassed:true,comparisonToOriginalSpeedOrResources:false,resourceMeasurementScope:'Single Node process lifetime maximum RSS; includes fixture creation, module loads and prior cases. Elapsed measurements are one synthetic local run, not a benchmark establishing superiority.',moduleSHA256:digest(await fs.readFile(new URL('../native.mjs',import.meta.url))),fullProductComplete:false,universalSuperiorityEstablished:false};
  await fs.writeFile(new URL('../results/bounded-workloads.json',import.meta.url),JSON.stringify(result,null,2)+'\n'); console.log(JSON.stringify(result));
} finally {
  if (path.dirname(path.resolve(root)) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('rea-rclone-bounds-')) throw Error('Unsafe private-fixture cleanup target.');
  await fs.rm(root,{recursive:true,force:true});
}
