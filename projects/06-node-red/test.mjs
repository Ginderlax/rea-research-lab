// SPDX-License-Identifier: Apache-2.0
// Laboratory source revised 2026-10-12; see NOTICE.md for upstream attribution.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {isDeepStrictEqual} from 'node:util';
import {route} from './reconstruction.mjs';
const require=createRequire(import.meta.url),register=require('./artifacts/package/core/function/10-switch.js');
async function oracle(payload,rules,firstMatch){
 let Ctor;
 const RED={settings:{},_:s=>s,nodes:{registerType:(name,ctor)=>Ctor=ctor,createNode(node){node.handlers={};node.on=(event,fn)=>node.handlers[event]=fn;node.warn=()=>{};}},util:{evaluateNodeProperty(value,type,node,msg,callback){let result;switch(type){case 'msg':result=msg[value];break;case 'num':result=Number(value);break;case 'str':result=String(value);break;case 'bool':result=value===true||value==='true';break;default:result=value;}callback(undefined,result);}}};
 register(RED);
 const instance=new Ctor({rules:structuredClone(rules),property:'payload',propertyType:'msg',checkall:firstMatch?'false':'true',repair:false});
 return await new Promise(resolve=>{instance.send=messages=>resolve({ports:messages.flatMap((m,i)=>m?[i]:[])});instance.error=err=>resolve({error:err?.name??'Error'});instance.handlers.input({payload});});
}
function recovered(payload,rules,firstMatch){try{return{ports:route(payload,rules,{firstMatch})};}catch(err){return{error:err.name};}}
const values=[undefined,null,false,true,0,1,5,10,-1,NaN,Infinity,'','0','5','TRUE','alpha',['alpha'],[],{}, {value:1},Buffer.from('alpha'),Buffer.alloc(0)];
const configs=[
 [{t:'eq',v:'5',vt:'str'},{t:'else'}], [{t:'neq',v:0,vt:'num'},{t:'else'}],
 [{t:'lt',v:5,vt:'num'},{t:'lte',v:5,vt:'num'},{t:'gt',v:5,vt:'num'},{t:'gte',v:5,vt:'num'}],
 [{t:'btwn',v:1,v2:10,vt:'num',v2t:'num'},{t:'btwn',v:10,v2:1,vt:'num',v2t:'num'},{t:'else'}],
 [{t:'cont',v:'a',vt:'str'},{t:'regex',v:'ALPHA',vt:'str',case:true},{t:'else'}],
 [{t:'true'},{t:'false'},{t:'null'},{t:'nnull'}], [{t:'empty'},{t:'nempty'},{t:'else'}],
 ...['array','buffer','null','json','number','string','boolean','object','undefined'].map(v=>[{t:'istype',v,vt:'str'},{t:'else'}]),
 [{t:'hask',v:'value',vt:'str'},{t:'else'}], [{t:'eq',v:5},{t:'else'},{t:'eq',v:1},{t:'else'}],
 [{t:'else'},{t:'else'}], [{t:'regex',v:'[',vt:'str'}], []
];
const failures=[];let passed=0;
for(const rules of configs)for(const payload of values)for(const firstMatch of [false,true]){
 const a=await oracle(payload,rules,firstMatch),b=recovered(payload,rules,firstMatch);
 if(isDeepStrictEqual(a,b))passed++;else failures.push({rules,payload,firstMatch,original:a,reconstruction:b});
}
const result={testedAt:new Date().toISOString(),oracle:'Unchanged released @node-red/nodes 5.0.8 core/function/10-switch.js executed with a minimal RED host implementing payload lookup and scalar operand evaluation. Full SwitchNode constructor, event handler, rule iteration and errors are original.',counts:{ruleConfigurations:configs.length,payloadKinds:values.length,evaluationModes:2},total:passed+failures.length,passed,failed:failures.length,failures,scope:'Scalar predicates, all-match/first-match routing, otherwise segments, empty rule set and invalid-regex errors. Excludes JSONata/context, previous-value, sequence/group repair, real runtime scheduling and message property traversal.'};
const replayRoot=new URL('./artifacts/replays/',import.meta.url);fs.mkdirSync(replayRoot,{recursive:true});const replayDir=fs.mkdtempSync(new URL('test-',replayRoot));
fs.writeFileSync(replayDir+'/test-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));console.log('Replay saved to '+replayDir);if(failures.length)process.exitCode=1;
