import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {reconstructDiff,applyDiff} from '../reconstruction.mjs';
import {replayOutput} from './replay-output.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=await replayOutput(root,'verify');
const scope=JSON.parse(await readFile(join(root,'scope.json')));
for(const file of scope.included){const bytes=await readFile(join(root,'artifacts/package',file.path));if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new Error('Original artifact changed: '+file.path);}
const modulePath=join(root,'artifacts/package/esm/vs/editor/common/diff/defaultLinesDiffComputer/algorithms/myersDiffAlgorithm.js');
const {MyersDiffAlgorithm}=await import(pathToFileURL(modulePath));
const engine=new MyersDiffAlgorithm();
const seq=data=>({length:data.length,getElement:i=>data[i]});
const normalize=r=>({diffs:r.diffs.map(d=>({a:[d.seq1Range.start,d.seq1Range.endExclusive],b:[d.seq2Range.start,d.seq2Range.endExclusive]})),hitTimeout:r.hitTimeout});
function lcsLength(a,b){let row=Array(b.length+1).fill(0);for(const x of a){let prev=0;for(let j=1;j<=b.length;j++){const saved=row[j];row[j]=x===b[j-1]?prev+1:Math.max(row[j],row[j-1]);prev=saved;}}return row[b.length];}
let state=0x52454101;
const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
const samples=[];
const add=(label,a,b,budget=null)=>samples.push({label,a,b,budget});
for(const [label,a,b] of [['both-empty','',''],['insert','','alpha'],['delete','alpha',''],['identical','alpha','alpha'],['replace','ABC','ADC'],['repeat-tie','ABA','BAB'],['unicode','a😀b','a🧪b'],['line-ending','a\r\nb','a\nb'],['prefix-suffix','alpha tail','beta tail']])add(label,a.split(''),b.split(''));
const strings=[[]];
for(let size=1;size<=5;size++)for(let value=0;value<2**size;value++)strings.push(Array.from({length:size},(_,i)=>(value>>i)&1));
for(const a of strings)for(const b of strings)add('exhaustive-binary-length-0-5',a,b);
for(let t=0;t<1000;t++){
  const a=Array.from({length:rand()%65},()=>['A','B','C','D',null,0][rand()%6]);
  const b=Array.from({length:rand()%65},()=>['A','B','C','D',null,0][rand()%6]);add('seeded-mixed-sequences',a,b);
}
for(const budget of [0,1,2,3,5,20])for(const [a,b] of [['','x'],['abc','abc'],['ABA','BAB'],['longer sequence','entirely other text']])add('timeout-budget',a.split(''),b.split(''),budget);
const records=[],failures=[];
let optimalityChecks=0,replayChecks=0;
const start=performance.now();
for(const c of samples){
 let callsOriginal=0,callsReplica=0;
 const validOriginal={isValid:()=>c.budget===null || callsOriginal++<c.budget};
 const validReplica=()=>c.budget===null || callsReplica++<c.budget;
 const expected=normalize(engine.compute(seq(c.a),seq(c.b),validOriginal));
 const actual=reconstructDiff(c.a,c.b,{isValid:validReplica});
 const exact=isDeepStrictEqual(expected,actual);
 const replay=isDeepStrictEqual(applyDiff(c.a,c.b,actual.diffs),c.b);
 const cost=actual.diffs.reduce((sum,d)=>sum+d.a[1]-d.a[0]+d.b[1]-d.b[0],0);
 const optimal=actual.hitTimeout || cost===c.a.length+c.b.length-2*lcsLength(c.a,c.b);
 if(!actual.hitTimeout)optimalityChecks++;
 replayChecks++;
 const record={...c,expected,actual,exact,replay,optimal,callsOriginal,callsReplica};
 records.push(record);if(!exact || !replay)failures.push(record);
}
await mkdir(join(output,'results'),{recursive:true});
await mkdir(join(output,'tests'),{recursive:true});
await writeFile(join(output,'tests/cases.json'),JSON.stringify(records,null,2)+'\n');
const demoInput={before:['import cache','validate request','fetch account','return account'],after:['import cache','validate request','check cache','fetch account','store cache','return account']};
const demo={...demoInput,...reconstructDiff(demoInput.before,demoInput.after)};
await writeFile(join(output,'results/demo.json'),JSON.stringify(demo,null,2)+'\n');
const result={schema:'rea-lab-differential/v1',status:failures.length?'failed':'passed',original:'monaco-editor 0.57.0 MyersDiffAlgorithm.compute',runtime:process.version,total:samples.length,passed:samples.length-failures.length,failed:failures.length,exactSpanComparison:true,replayChecks,optimalityChecks,originalNonMinimalCases:records.filter(x=>!x.optimal).length,optimalityHypothesis:'rejected by observed original outputs; normative check is distinct from differential equivalence',seed:'0x52454101',elapsedMs:Math.round(performance.now()-start),groups:Object.fromEntries([...new Set(samples.map(x=>x.label))].map(label=>[label,samples.filter(x=>x.label===label).length])),caseCorpusSha256:createHash('sha256').update(JSON.stringify(records)).digest('hex'),failures:failures.slice(0,20)};
await writeFile(join(output,'results/differential.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(failures.length)process.exitCode=1;
