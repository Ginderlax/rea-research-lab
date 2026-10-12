import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { compareFiles,comparisonOptions } from '../native-comparison.mjs';
import { createOracle,digest,comparisonFlags,logs } from './oracle.mjs';
const root = await fs.mkdtemp(path.join(os.tmpdir(),'rea-rclone-comparisons-')), records = [], failures = [];
const base = 1800000000000;
const scenarios = [
  {name:'missing',source:'a',sourceOffset:0},
  {name:'identical',source:'a',destination:'a',sourceOffset:0,destinationOffset:0},
  {name:'same-size-time-different-bytes',source:'a',destination:'b',sourceOffset:0,destinationOffset:0},
  {name:'same-bytes-target-older',source:'a',destination:'a',sourceOffset:5000,destinationOffset:0},
  {name:'same-bytes-target-newer',source:'a',destination:'a',sourceOffset:0,destinationOffset:5000},
  {name:'different-bytes-target-older',source:'a',destination:'b',sourceOffset:5000,destinationOffset:0},
  {name:'different-bytes-target-newer',source:'a',destination:'b',sourceOffset:0,destinationOffset:5000},
  {name:'different-size-target-older',source:'aaa',destination:'b',sourceOffset:5000,destinationOffset:0},
  {name:'different-size-target-newer',source:'aaa',destination:'b',sourceOffset:0,destinationOffset:5000},
  {name:'same-bytes-at-window-boundary',source:'a',destination:'a',sourceOffset:1000,destinationOffset:0},
];
const keys = ['checksum','sizeOnly','ignoreSize','ignoreTimes','ignoreExisting','update','noUpdateModtime'];
const settings = Array.from({length:128},(_,mask) => Object.fromEntries(keys.map((key,index) => [key,Boolean(mask & (1 << index))])));
for (const options of [{},{update:true},{checksum:true},{sizeOnly:true}]) for (const modifyWindowNs of ['999999900','1000000000','1000000100']) settings.push({...options,modifyWindowNs});
async function metadata(filename) { const bytes = await fs.readFile(filename), stat = await fs.stat(filename,{bigint:true}); return {size:bytes.length,md5:createHash('md5').update(bytes).digest('hex'),mtimeNs:stat.mtimeNs.toString(),sha256:digest(bytes)}; }
try {
  const oracle = await createOracle(root);
  for (let index = 0; index < settings.length; index++) {
    const options = settings[index], folder = path.join(root,String(index)), source = path.join(folder,'source'), target = path.join(folder,'target');
    await fs.mkdir(source,{recursive:true}); await fs.mkdir(target,{recursive:true}); const inputs = [];
    for (const scenario of scenarios) {
      const filename = scenario.name+'.txt', sourcePath = path.join(source,filename), targetPath = path.join(target,filename);
      await fs.writeFile(sourcePath,scenario.source,{flag:'wx'}); await fs.utimes(sourcePath,new Date(base),new Date(base+scenario.sourceOffset));
      if (scenario.destination !== undefined) { await fs.writeFile(targetPath,scenario.destination,{flag:'wx'}); await fs.utimes(targetPath,new Date(base),new Date(base+scenario.destinationOffset)); }
      const a = await metadata(sourcePath), b = scenario.destination === undefined ? null:await metadata(targetPath); inputs.push({filename,source:a,destination:b,decision:compareFiles(a,b,options)});
    }
    let output,originalError; try { output = await oracle.run(['copy',source,target,...comparisonFlags(options)]); } catch (error) { originalError = String(error.stderr ?? error.message); }
    if (originalError) { const record = {index,options,passed:false,originalError}; records.push(record); failures.push(record); }
    else {
      const messages = logs(output.stderr);
      for (const input of inputs) {
        const after = await metadata(path.join(target,input.filename)), fileLogs = messages.filter(log => log.object === input.filename), copied = fileLogs.some(log => /^Copied \(/.test(log.msg)), updated = after.mtimeNs !== input.destination?.mtimeNs;
        const originalAction = copied ? 'copy':updated ? 'updateModtime':'skip';
        const expectedSHA = input.decision.type === 'copy' ? input.source.sha256:input.destination.sha256;
        const expectedTime = ['copy','updateModtime'].includes(input.decision.type) ? input.source.mtimeNs:input.destination.mtimeNs;
        const passed = originalAction === input.decision.type && after.sha256 === expectedSHA && after.mtimeNs === expectedTime;
        const record = {index,options,filename:input.filename,input,originalAction,after,passed,fileLogs:fileLogs.map(({msg}) => msg)};
        records.push(record); if (!passed) failures.push(record);
      }
    }
    console.log(JSON.stringify({index,comparisons:inputs.length,failed:failures.filter(x => x.index === index).length}));
  }
  await fs.writeFile(new URL('../results/comparison-verification.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),baseline:'rclone v1.75.2',sourceCommit:oracle.sourceCommit,version:oracle.version,originalSHA256:oracle.originalSHA256,zipSHA256:oracle.zipSHA256,moduleSHA256:digest(await fs.readFile(new URL('../native-comparison.mjs',import.meta.url))),originalCLIExecutions:oracle.executions,allFixturesSynthetic:true,priorReconstructionReadOrImported:false,settings:settings.length,scenarios:scenarios.length,records,failures,fullProductComplete:false,universalSuperiorityEstablished:false},null,2)+'\n');
  if (failures.length) process.exitCode = 1;
} finally {
  if (path.dirname(path.resolve(root)) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('rea-rclone-comparisons-')) throw Error('Unsafe private-fixture cleanup target.');
  await fs.rm(root,{recursive:true,force:true});
}
