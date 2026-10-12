import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {replayOutput} from './replay-output.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=await replayOutput(root,'counterexample');
const {MyersDiffAlgorithm}=await import(pathToFileURL(join(root,'artifacts/package/esm/vs/editor/common/diff/defaultLinesDiffComputer/algorithms/myersDiffAlgorithm.js')));
const engine=new MyersDiffAlgorithm();
const seq=data=>({length:data.length,getElement:i=>data[i]});
function oracle(a,b){const table=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)table[i][j]=a[i-1]===b[j-1]?table[i-1][j-1]+1:Math.max(table[i-1][j],table[i][j-1]);return {lcs:table[a.length][b.length],minimum:a.length+b.length-2*table[a.length][b.length]};}
function inspect(a,b){const r=engine.compute(seq(a),seq(b));const diffs=r.diffs.map(d=>({a:[d.seq1Range.start,d.seq1Range.endExclusive],b:[d.seq2Range.start,d.seq2Range.endExclusive]}));return {diffs,cost:diffs.reduce((n,d)=>n+d.a[1]-d.a[0]+d.b[1]-d.b[0],0),...oracle(a,b)};}
const corpusPath=process.argv[2] || join(root,'artifacts/tests/cases.json');
const corpus=JSON.parse(await readFile(corpusPath));
const seed=corpus.find(x=>!x.optimal);
if(!seed)throw new Error('The selected corpus contains no nonminimal result');
let a=seed.a,b=seed.b,checks=0,changed=true;
while(changed){
 changed=false;
 search:for(const side of ['a','b']){
  const target=side==='a'?a:b;
  for(let n=target.length-1;n>=1;n--)for(let i=0;i+n<=target.length;i++){
   const shorter=target.slice(0,i).concat(target.slice(i+n));
   const aa=side==='a'?shorter:a,bb=side==='b'?shorter:b,result=inspect(aa,bb);checks++;
   if(result.cost>result.minimum){a=aa;b=bb;changed=true;break search;}
  }
 }
}
const symbols=new Map();for(const value of [...a,...b])if(!symbols.has(value))symbols.set(value,String.fromCharCode(65+symbols.size));
const relabeledA=a.map(x=>symbols.get(x)),relabeledB=b.map(x=>symbols.get(x));
const result={schema:'rea-lab-counterexample/v1',before:a,after:b,...inspect(a,b),relabeled:{before:relabeledA.join(''),after:relabeledB.join(''),...inspect(relabeledA,relabeledB)},reductionChecks:checks,scope:'Shipped internal Myers sequence algorithm only; not the full default line-diff pipeline or editor UI',method:'Greedy contiguous-chunk deletion; independent full dynamic-programming LCS table; local irreducibility is not proof of globally shortest counterexample'};
await writeFile(join(output,'counterexample.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
