import * as fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { digest } from './oracle.mjs';
const manifestBytes = await fs.readFile(new URL('../native-source-references.json',import.meta.url)), manifest = JSON.parse(manifestBytes), records = [];
for (const source of manifest.files) {
  assert.equal(source.url,`https://raw.githubusercontent.com/rclone/rclone/${manifest.commit}/${source.path}`);
  const response = await fetch(source.url,{signal:AbortSignal.timeout(30000)}); assert.equal(response.status,200,source.path);
  const bytes = Buffer.from(await response.arrayBuffer()); assert.equal(bytes.length,source.bytes); assert.equal(digest(bytes),source.sha256,source.path);
  for (const contract of manifest.contracts.filter(contract => contract.source.path === source.path)) { assert.equal(contract.source.sha256,source.sha256); assert.ok(contract.source.startLine >= 1 && contract.source.endLine <= source.lineCount && contract.source.endLine >= contract.source.startLine); }
  records.push({path:source.path,bytes:bytes.length,sha256:digest(bytes),passed:true});
}
const result = {checkedAt:new Date().toISOString(),sourceCommit:manifest.commit,manifestSHA256:digest(manifestBytes),records,contracts:manifest.contracts.length,allPassed:true,fullProductComplete:false,universalSuperiorityEstablished:false};
await fs.writeFile(new URL('../results/source-verification.json',import.meta.url),JSON.stringify(result,null,2)+'\n'); console.log(JSON.stringify({sources:records.length,contracts:result.contracts,allPassed:true}));
