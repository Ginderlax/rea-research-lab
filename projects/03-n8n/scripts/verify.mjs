import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import * as replica from '../reconstruction.mjs';
import {replayOutput} from './replay-output.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=await replayOutput(root,'verify');
const scope=JSON.parse(await readFile(join(root,'scope.json')));
for(const file of scope.included){const bytes=await readFile(join(root,'artifacts/package',file.path));if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new Error('Original artifact changed: '+file.path);}
const require=createRequire(import.meta.url);
const original=require(join(root,'artifacts/package/dist/cjs/graph/graph-utils.js'));
const simplify=x=>x instanceof Set?[...x].map(simplify):x instanceof Map?[...x].map(([k,v])=>[k,simplify(v)]):Array.isArray(x)?x.map(simplify):x && typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,simplify(v)])):x;
function connectionsFrom(edges){const c={};for(const [source,destination,type='main',bank=0] of edges){c[source]??={};c[source][type]??=[];c[source][type][bank]??=[];c[source][type][bank].push({node:destination,type,index:0});}return c;}
const fixtures=[
 {label:'chain-extract',edges:[['Trigger','Validate'],['Validate','Transform'],['Transform','Store']],selection:['Validate','Transform']},
 {label:'branch-multiple-output',edges:[['Trigger','A'],['A','B'],['A','SinkA'],['B','SinkB']],selection:['A','B']},
 {label:'input-to-inner-node',edges:[['Trigger','A'],['A','B'],['Other','B']],selection:['A','B']},
 {label:'multiple-root-inputs',edges:[['Trigger','A'],['Other','B']],selection:['A','B']},
 {label:'cycle-boundary-fallback',edges:[['Trigger','A'],['A','B'],['B','A'],['B','Sink']],selection:['A','B']},
 {label:'self-loop',edges:[['Trigger','A'],['A','A'],['A','Sink']],selection:['A']},
 {label:'ai-edges-not-main',edges:[['Agent','Model','ai_languageModel'],['Agent','Sink']],selection:['Model']},
 {label:'disconnected-boundaries',edges:[['Trigger','A'],['B','Sink']],selection:['A','B']},
 {label:'isolated-selection',edges:[['Trigger','Sink']],selection:['X','Y']},
 {label:'empty-selection',edges:[['Trigger','Sink']],selection:[]},
 {label:'output-bank-preservation',edges:[['Trigger','A','main',3],['A','Sink','main',2]],selection:['A']}
];
const records=[],failures=[];
function check(label,method,args){const expected=simplify(original[method](...args)),actual=simplify(replica[method](...args));const exact=isDeepStrictEqual(expected,actual);const record={label,method,expected,actual,exact};records.push(record);if(!exact)failures.push(record);return expected;}
function checkGraph(label,connections,selections,nodeIds){
 check(label,'buildAdjacencyList',[connections]);
 const adjacency=original.buildAdjacencyList(connections);
 for(const ids of selections){const set=new Set(ids);for(const method of ['getInputEdges','getOutputEdges','getRootNodes','getLeafNodes','parseExtractableSubgraphSelection'])check(label,method,[set,adjacency]);}
 for(const a of nodeIds)for(const b of nodeIds)check(label,'hasPath',[a,b,adjacency]);
}
for(const f of fixtures){const c=connectionsFrom(f.edges);checkGraph(f.label,c,[f.selection],[...new Set(f.edges.flatMap(x=>x.slice(0,2)).concat(f.selection))]);}
const nodes=['A','B','C'];
const selections=Array.from({length:8},(_,mask)=>nodes.filter((_,i)=>mask&(1<<i)));
for(let graph=0;graph<512;graph++){const edges=[];for(let i=0;i<9;i++)if(graph&(1<<i))edges.push([nodes[Math.floor(i/3)],nodes[i%3]]);checkGraph('exhaustive-three-node-main-graphs',connectionsFrom(edges),selections,nodes);}
let seed=0x52454103;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
for(let t=0;t<500;t++){const ids=Array.from({length:1+rand()%8},(_,i)=>'N'+i),edges=[];for(const source of ids)for(const target of ids)if(rand()%5===0)edges.push([source,target,rand()%4===0?'ai_tool':'main',rand()%3]);const selected=ids.filter(()=>rand()%2===0);checkGraph('seeded-mixed-edge-workflows',connectionsFrom(edges),[selected],ids);}
const shared={node:'B',type:'main',index:0};checkGraph('duplicate-object-identity',{A:{main:[[shared,shared,{...shared}]]}},[['A'],['B']],['A','B']);
await mkdir(join(output,'tests'),{recursive:true});await mkdir(join(output,'results'),{recursive:true});
const corpus=JSON.stringify(records);
await writeFile(join(output,'tests/cases.json'),JSON.stringify(records,null,2)+'\n');
const demos=fixtures.map(f=>({...f,result:simplify(original.parseExtractableSubgraphSelection(new Set(f.selection),original.buildAdjacencyList(connectionsFrom(f.edges))))}));
await writeFile(join(output,'results/demo.json'),JSON.stringify(demos,null,2)+'\n');
const result={schema:'rea-lab-differential/v1',status:failures.length?'failed':'passed',original:'n8n-workflow 2.16.0 graph-utils',runtime:process.version,total:records.length,passed:records.length-failures.length,failed:failures.length,seed:'0x52454103',caseCorpusSha256:createHash('sha256').update(corpus).digest('hex'),methods:Object.fromEntries(Object.keys(replica).map(method=>[method,records.filter(x=>x.method===method).length])),groups:Object.fromEntries([...new Set(records.map(x=>x.label))].map(label=>[label,records.filter(x=>x.label===label).length])),failures:failures.slice(0,10)};
await writeFile(join(output,'results/differential.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(failures.length)process.exitCode=1;
