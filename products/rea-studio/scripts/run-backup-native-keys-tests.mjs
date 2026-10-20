// Child runner; only Node's test runner and built-ins load before test sources.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {run} from 'node:test';
import {fileURLToPath} from 'node:url';
assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.version,'v24.16.0');
assert.equal(process.env.CI,'true');assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');
const studio=fileURLToPath(new URL('../',import.meta.url));
assert.equal(process.argv.length,2,'This fixed runner accepts no arbitrary module paths.');
const roster=JSON.parse(fs.readFileSync(path.join(studio,'experiments/backup-native-keys/finite-roster.json'),'utf8'));
assert.equal(roster.schema,'rea-backup-native-keys-finite-roster/v1');assert.equal(roster.testFiles.length,22);assert.deepEqual(roster.testFiles,[...new Set(roster.testFiles)].sort());
for(const p of roster.testFiles)assert(/^apps\/backup\/[a-z0-9.-]+\.test\.mjs$/.test(p));
const physical=fs.readdirSync(path.join(studio,'apps/backup')).filter(n=>n.endsWith('.test.mjs')).map(n=>'apps/backup/'+n).sort();assert.deepEqual(physical,roster.testFiles);
let failures=0;const completed=new Set(),stream=run({files:roster.testFiles.map(p=>path.join(studio,p)),concurrency:1,isolation:'process'});
for await(const event of stream){
  if(event.type==='test:fail')failures++;
  if(event.type==='test:pass'&&event.data.nesting===0&&typeof event.data.file==='string')completed.add(path.relative(studio,path.resolve(event.data.file)).replaceAll('\\','/'));
  const seen=new WeakSet();const raw=JSON.stringify(event,(_key,value)=>{
    if(value&&typeof value==='object'){
      if(seen.has(value))return'[Circular]';seen.add(value);
      if(value instanceof Error){
        // Preserve Node's own failureType/cause and AssertionError's
        // actual/expected/operator as well as nonenumerable message/stack.
        // The outer cycle guard also covers an Error whose cause is itself.
        const properties=Object.create(null);
        for(const name of new Set([...Object.getOwnPropertyNames(value),...Object.keys(value)]))properties[name]=value[name];
        if(!Object.hasOwn(properties,'name'))properties.name=value.name;
        return properties;
      }
    }
    return typeof value==='bigint'?value.toString():value;
  });
  assert(Buffer.byteLength(raw)<=512*1024,'A single raw test event exceeded its fixed bound.');process.stdout.write(raw+'\n');
}
assert.equal(failures,0,'At least one test failed.');assert.deepEqual([...completed].sort(),roster.testFiles,'Every admitted module must report a completed root test.');
process.stdout.write(JSON.stringify({type:'rea:finite-completion',data:{modules:[...completed].sort(),failures}})+'\n');
