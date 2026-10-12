import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const lab=fileURLToPath(new URL('../../../',import.meta.url)),prefix='products/rea-studio/apps/backup/results/rabin-recorder-review/',sha=b=>createHash('sha256').update(b).digest('hex');
const manifestBytes=readFileSync(join(lab,prefix,'preservation-manifest.json')),manifest=JSON.parse(manifestBytes);assert.equal(manifest.schema,'rea-rabin-recorder-review-preservation/v1');
for(const e of manifest.snapshots){assert.ok(e.path.startsWith(prefix)&&!e.path.split('/').includes('..'));const b=readFileSync(join(lab,e.path));assert.equal(b.length,e.bytes);assert.equal(sha(b),e.sha256);}
const paths=['products/rea-studio/scripts/read-rabin-tap.mjs','products/rea-studio/tests/rabin-recorder.test.mjs','products/rea-studio/scripts/verify-rabin-recorder.mjs',prefix+'preservation-manifest.json','products/rea-studio/apps/backup/results/rabin-validation.json'];
const capture=()=>paths.map(path=>{const b=readFileSync(join(lab,path));return{path,bytes:b.length,sha256:sha(b)};});const before=capture();
assert.equal(before[0].sha256,manifest.currentCollector.sha256);assert.equal(before[4].sha256,manifest.parentBehaviorReceiptSha256);
const run=spawnSync(process.execPath,['--test','--test-reporter=tap','--test-concurrency=1',join(lab,paths[1])],{encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:4*1024*1024});
const evidence=['production-recorder.stdout.txt','production-recorder.stderr.txt'].map((n,i)=>{const b=Buffer.from(i?run.stderr??'':run.stdout??'');writeFileSync(join(lab,prefix,n),b);return{path:prefix+n,bytes:b.length,sha256:sha(b)};});
const summary=Object.fromEntries(['tests','pass','fail','cancelled','skipped','todo','duration_ms'].map(n=>{const m=run.stdout?.match(new RegExp('^# '+n+' (\\d+(?:\\.\\d+)?)$','m'));assert.ok(m,'Missing '+n);return[n,Number(m[1])];}));
assert.equal(run.status,0,run.stderr);assert.equal(summary.tests,8);assert.equal(summary.pass,8);assert.equal(summary.fail+summary.cancelled+summary.skipped+summary.todo,0);assert.deepEqual(capture(),before);
const record={schema:'rea-rabin-recorder-integration-validation/v1',checkedAtUtc:new Date().toISOString(),runtime:process.version,platform:process.platform,exitCode:run.status,summary,sourceBytesStableAcrossRun:true,implementationFingerprints:before,rawEvidence:evidence,preservedIndependentReviewArtifacts:manifest.snapshots.length,historicalBehaviorReceiptSha256:manifest.parentBehaviorReceiptSha256,historicalBehaviorTestsRerun:0,currentSyntheticLiveLoggerTests:1,currentCollectorSha256:manifest.currentCollector.sha256,historicalCollectorSha256:manifest.historicalCollector.sha256,historicalBehaviorEvidenceReboundToCurrentCollector:false,fullParity:false,universalSuperiority:false,scope:'Current collector only: retained original historical observations, escapes, chunk boundaries, rejection bounds and one fresh actual Node logger. The historical 47 Backup cases retain their original collector attribution.'};
writeFileSync(join(lab,prefix,'integration-validation.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({summary,preservedArtifacts:manifest.snapshots.length,receiptSha256:sha(readFileSync(join(lab,prefix,'integration-validation.json')))}));
