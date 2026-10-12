import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {reconstructStandardCalcs} from '../reconstruction.mjs';
import {replayOutput} from './replay-output.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=await replayOutput(root,'verify');
const scope=JSON.parse(await readFile(join(root,'scope.json')));
for(const file of scope.included){const bytes=await readFile(join(root,'artifacts/package',file.path));if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new Error('Original artifact changed: '+file.path);}
const require=createRequire(import.meta.url);
const {doStandardCalcs}=require(join(root,'artifacts/package/dist/cjs/transformations/fieldReducer.cjs'));
const replacer=(_,v)=>typeof v==='number' && (!Number.isFinite(v) || Object.is(v,-0)) ? {$number:Object.is(v,-0)?'-0':String(v)} : v===undefined ? {$undefined:true} : v;
let seed=0x52454102;
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
const inputs=[
  {label:'missing-values',values:undefined},{label:'empty',values:[]},{label:'all-null',values:[null,undefined,null]},
  {label:'nan',values:[1,NaN,2]},{label:'infinity',values:[-Infinity,0,Infinity]},{label:'signed-zero',values:[-0,0,-0]},
  {label:'counter-reset',values:[10,20,1,3,8]},{label:'consecutive-resets',values:[10,5,3,4,8]},
  {label:'negative-only',values:[-9,-2,-4]},{label:'zero-base-percent',values:[0,5]},
  {label:'max-sentinel',values:[Number.MAX_VALUE]},{label:'min-sentinel',values:[-Number.MAX_VALUE]},
  {label:'invalid-string-in-number-field',values:['2',3,'4']},{label:'booleans',values:[true,false,true]}
];
for(let length=0;length<=4;length++)for(let index=0;index<5**length;index++){
  let n=index;const values=Array.from({length},()=>{const x=[-2,0,2,null,NaN][n%5];n=Math.floor(n/5);return x;});inputs.push({label:'exhaustive-five-values-length-0-4',values});
}
for(let t=0;t<500;t++)inputs.push({label:'seeded-telemetry',values:Array.from({length:rand()%65},()=>[-100,-2,-0,0,1,5,99,null,undefined,NaN,Infinity,-Infinity][rand()%12])});
const modes=[{mode:'ignore',ignore:true,zero:false},{mode:'zero',ignore:false,zero:true},{mode:'keep',ignore:false,zero:false},{mode:'both-flags',ignore:true,zero:true}];
const types=['number','time','string','boolean'];
const records=[],failures=[];
for(const input of inputs)for(const type of types)for(const mode of modes){
 const field={type,values:input.values};
 const expected=doStandardCalcs(field,mode.ignore,mode.zero),actual=reconstructStandardCalcs(field,mode.ignore,mode.zero);
 const exact=isDeepStrictEqual(expected,actual);
 const record={...input,type,mode:mode.mode,expected,actual,exact};records.push(record);if(!exact)failures.push(record);
}
await mkdir(join(output,'results'),{recursive:true});await mkdir(join(output,'tests'),{recursive:true});
const corpus=JSON.stringify(records,replacer);
await writeFile(join(output,'tests/cases.json'),JSON.stringify(records,replacer,2)+'\n');
const demos=['counter-reset','consecutive-resets','all-null','nan','zero-base-percent','empty','missing-values'].map(label=>({label,variants:records.filter(x=>x.label===label && x.type==='number')}));
await writeFile(join(output,'results/demo.json'),JSON.stringify(demos,replacer,2)+'\n');
const result={schema:'rea-lab-differential/v1',status:failures.length?'failed':'passed',original:'@grafana/data 13.2.3 doStandardCalcs',runtime:process.version,total:records.length,passed:records.length-failures.length,failed:failures.length,fieldsCompared:Object.keys(records[0].expected),types,modes:modes.map(x=>x.mode),seed:'0x52454102',caseCorpusSha256:createHash('sha256').update(corpus).digest('hex'),groups:Object.fromEntries([...new Set(inputs.map(x=>x.label))].map(label=>[label,inputs.filter(x=>x.label===label).length*types.length*modes.length])),failures:failures.slice(0,10)};
await writeFile(join(output,'results/differential.json'),JSON.stringify(result,replacer,2)+'\n');console.log(JSON.stringify(result,replacer,2));if(failures.length)process.exitCode=1;
