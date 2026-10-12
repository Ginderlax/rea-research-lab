import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const localResults=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../.local/automation-routing-original/observations');
import {executeNode,createExecution,advanceExecution} from './native.mjs';
import {executeOriginalSwitch,executeOriginalMerge,executeOriginalEnqueue,executeOriginalPartialDrain,observations,verifyOriginalIntegrity} from './routing-original-harness.mjs';

const records=[],counts={exactOutputMatches:0,rejectionOutcomeMatches:0,deliberateSafetyDeviations:0,boundedRepresentationDeviations:0};
const nonJsonArray=value=>value&&typeof value==='object'&&(Array.isArray(value)&&Object.keys(value).some(key=>! /^(0|[1-9]\d*)$/.test(key)||Number(key)>=value.length)||Object.values(value).some(nonJsonArray));
const node=(type,name,parameters={},position=[0,0])=>({id:name,name,type:'n8n-nodes-base.'+type,typeVersion:{manualTrigger:1,set:3.4,if:2.3,wait:1.1,switch:3.4,merge:3.2}[type],parameters,position});
const item=(json,index=0,input=0)=>({json,pairedItem:{item:index,...(input?{input}:{})}});
const filter=(type,operation,leftValue,rightValue,options={},operator={})=>({options:{caseSensitive:true,typeValidation:'strict',version:3,...options},combinator:'and',conditions:[{leftValue,...(rightValue===undefined?{}:{rightValue}),operator:{type,operation,...operator}}]});
const merge=p=>node('merge','Merge',{mode:'append',numberInputs:2,...p});
async function result(action){try{return{ok:true,value:await action()};}catch(error){return{ok:false,error:{name:error.name,code:error.code,message:error.message}};}}
async function compare(label,n,inputs,kind='merge',allowNonJsonArray=false){
 const before=structuredClone(inputs),original=await result(()=>kind==='switch'?executeOriginalSwitch(n,structuredClone(inputs)):executeOriginalMerge(n,structuredClone(inputs))),candidate=await result(()=>executeNode(n,kind==='switch'?inputs:inputs[0],kind==='switch'?{}:{inputs}));
 records.push({label,kind,node:structuredClone(n),inputs:before,original,candidate});assert.deepEqual(inputs,before,label+' input mutated');if(allowNonJsonArray&&original.ok&&nonJsonArray(original.value)){assert.equal(candidate.ok,false);assert.equal(candidate.error.code,'NATIVE_LIMIT');counts.boundedRepresentationDeviations++;return;}assert.equal(candidate.ok,original.ok,label+' acceptance');
 if(original.ok){assert.deepEqual(candidate.value,original.value,label+' exact output');counts.exactOutputMatches++;}else counts.rejectionOutcomeMatches++;
}
test.after(async()=>{await verifyOriginalIntegrity();const folder=await fs.mkdtemp(path.join(await fs.mkdir(localResults,{recursive:true}).then(()=>localResults),'run-')),filename=path.join(folder,'original-results.json'),value={createdAt:new Date().toISOString(),scope:'Released SwitchV3.execute with real Workflow/core cleanup/filter extraction/schema validation; complete released Merge mode-helper execute functions with explicit static parameters; exact core enqueue helpers and waiting-input drain block with explicit materialized ports/parameters. Full WorkflowExecute, Merge class/router/UI-default schema, server/database/editor/SQL not run.',observations,counts,records},bytes=JSON.stringify(value,null,2)+'\n';await fs.writeFile(filename,bytes,{flag:'wx'});console.log(JSON.stringify({automationRoutingOriginalObservations:{path:filename,bytes:Buffer.byteLength(bytes),sha256:createHash('sha256').update(bytes).digest('hex'),observations,counts,scope:value.scope}}));});

test('released Switch rules match first/all/fallback ports and expression boundaries',async()=>{
 const items=[-1,0,1,5,10].map(amount=>item({amount})),rules=[{conditions:filter('number','gte','={{ $json.amount }}',0),renameOutput:true,outputKey:'nonnegative'},{conditions:filter('number','gte','={{ $json.amount }}',5)}];
 for(const allMatchingOutputs of [false,true])for(const fallbackOutput of ['none','extra',0,1])await compare(`switch first/all=${allMatchingOutputs} fallback=${fallbackOutput}`,node('switch','Switch',{mode:'rules',rules:{values:rules},options:{allMatchingOutputs,fallbackOutput}}),items,'switch');
 for(const values of [[0,1,2],[3],[-1],[.5],['1'],[null],[]])await compare('switch expression '+JSON.stringify(values),node('switch','Switch',{mode:'expression',numberOutputs:3,output:'={{ $json.port }}'}),values.map(port=>item({port})),'switch');
 await compare('switch empty rules',node('switch','Switch',{mode:'rules',rules:{values:[]},options:{fallbackOutput:'extra'}}),[item({})],'switch');
});
test('released Switch filter extraction matches supported scalar/array/object options',async()=>{
 const specs={string:{values:[undefined,null,'','ABC','abc','zabc'],right:'abc',ops:['exists','notExists','empty','notEmpty','equals','notEquals','contains','notContains','startsWith','notStartsWith','endsWith','notEndsWith']},number:{values:[undefined,null,0,1,3,4],right:3,ops:['exists','notExists','empty','notEmpty','equals','notEquals','gt','gte','lt','lte']},boolean:{values:[undefined,null,false,true],right:true,ops:['exists','notExists','empty','notEmpty','equals','notEquals','true','false']},array:{values:[undefined,null,[],['abc'],[1,2,3]],right:'abc',ops:['exists','notExists','empty','notEmpty','contains','notContains','lengthEquals','lengthNotEquals','lengthGt','lengthGte','lengthLt','lengthLte']},object:{values:[undefined,null,{}, {a:1}],right:undefined,ops:['exists','notExists','empty','notEmpty']},any:{values:[undefined,null,0,false,''],right:undefined,ops:['exists','notExists']}};
 for(const[type,spec]of Object.entries(specs))for(const operation of spec.ops)for(const caseSensitive of [false,true]){
  const length=operation.startsWith('length'),single=['exists','notExists','empty','notEmpty','true','false'].includes(operation),conditions=filter(type,operation,'={{ $json.value }}',length?2:spec.right,{caseSensitive},{...(single?{singleValue:true}:{}),...(length?{rightType:'number'}:{})});
  await compare(`switch ${type}:${operation} case=${caseSensitive}`,node('switch','Switch',{mode:'rules',rules:{values:[{conditions}]},options:{fallbackOutput:'extra'}}),spec.values.map(value=>item(value===undefined?{}:{value})),'switch');
 }
 for(const typeValidation of ['strict','loose'])await compare('switch numeric conversion '+typeValidation,node('switch','Switch',{mode:'rules',rules:{values:[{conditions:filter('number','equals','={{ $json.value }}',0,{typeValidation})}]},options:{fallbackOutput:'extra'}}),['',[],false,'0','bad'].map(value=>item({value})),'switch');
});
test('released Merge append/chooseBranch match2–10 inputs and exact immediate item links',async()=>{
 for(let numberInputs=2;numberInputs<=10;numberInputs++){
  const inputs=Array.from({length:numberInputs},(_,input)=>Array.from({length:input%3},(_,index)=>item({input,index},index,input)));
  await compare('append '+numberInputs,merge({numberInputs}),inputs);
  await compare('choose empty '+numberInputs,merge({numberInputs,mode:'chooseBranch',chooseBranchMode:'waitForAll',output:'empty',useDataOfInput:1}),inputs);
  for(const useDataOfInput of [1,numberInputs])await compare('choose input '+numberInputs+'/'+useDataOfInput,merge({numberInputs,mode:'chooseBranch',chooseBranchMode:'waitForAll',output:'specifiedInput',useDataOfInput}),inputs);
 }
});
const nestedInputs=[[item({id:1,a:1,empty:null,nested:{one:1,clash:'left'},arr:[1,2]}),item({id:2,a:2,empty:'',nested:{one:2}},1)],[item({id:1,b:3,empty:'nonempty',nested:{two:2,clash:'right'},arr:[3]},0,1),item({id:3,b:4,empty:null},1,1),item({id:4,b:5},2,1)]];
test('released Merge position reproduces preferences, suffix keys, deep/shallow and unpaired behavior',async()=>{
 for(const resolveClash of [undefined,'preferLast','preferInput1','preferInput2','addSuffix'])for(const mergeMode of [undefined,'deepMerge','shallowMerge'])for(const overrideEmpty of [false,true])for(const includeUnpaired of [false,true]){
  const clash={...(resolveClash?{resolveClash}:{}),...(mergeMode?{mergeMode}:{}),overrideEmpty};await compare(`position ${resolveClash}/${mergeMode}/empty=${overrideEmpty}/unpaired=${includeUnpaired}`,merge({mode:'combine',combineBy:'combineByPosition',options:{clashHandling:{values:clash},includeUnpaired}}),nestedInputs);
 }
 const three=[...nestedInputs,[item({c:9,nested:{three:3}},0,2)]];for(const resolveClash of ['preferInput1','preferLast','addSuffix'])await compare('position3 '+resolveClash,merge({mode:'combine',combineBy:'combineByPosition',numberInputs:3,options:{clashHandling:{values:{resolveClash}},includeUnpaired:true}}),three);
});
test('released Merge cartesian reproduces preference-induced item ordering',async()=>{
 for(const resolveClash of [undefined,'preferLast','preferInput1','addSuffix'])for(const mergeMode of [undefined,'deepMerge','shallowMerge'])for(const overrideEmpty of [false,true])await compare(`cartesian ${resolveClash}/${mergeMode}/${overrideEmpty}`,merge({mode:'combine',combineBy:'combineAll',options:{clashHandling:{values:{...(resolveClash?{resolveClash}:{}),...(mergeMode?{mergeMode}:{}),overrideEmpty}}}}),nestedInputs);
 for(const inputs of [[[],nestedInputs[1]],[nestedInputs[0],[]],[[],[]]])await compare('cartesian empty '+inputs.map(a=>a.length),merge({mode:'combine',combineBy:'combineAll'}),inputs);
});
test('released Merge field joins match all output sources, multiple matches and clash policies',async()=>{
 const inputs=[[item({id:1,a:'A'}),item({id:2,a:'B'},1),item({a:'missing'},2)],[item({id:1,b:'X'},0,1),item({id:1,b:'Y'},1,1),item({id:3,b:'Z'},2,1)]];
 for(const joinMode of ['keepMatches','keepNonMatches','keepEverything','enrichInput1','enrichInput2'])for(const outputDataFrom of ['both','input1','input2'])for(const multipleMatches of ['all','first'])for(const resolveClash of [undefined,'preferInput1','preferLast','addSuffix']){
  await compare(`fields ${joinMode}/${outputDataFrom}/${multipleMatches}/${resolveClash}`,merge({mode:'combine',combineBy:'combineByFields',advanced:false,fieldsToMatchString:'id',joinMode,outputDataFrom,options:{multipleMatches,clashHandling:{values:{...(resolveClash?{resolveClash}:{})}}}}),inputs);
 }
 for(const joinMode of ['keepMatches','keepNonMatches','keepEverything','enrichInput1','enrichInput2'])for(const outputDataFrom of ['both','input1','input2'])for(const inputs of [[[],nestedInputs[1]],[nestedInputs[0],[]],[[],[]]])await compare(`fields empty ${joinMode}/${outputDataFrom}/${inputs.map(a=>a.length)}`,merge({mode:'combine',combineBy:'combineByFields',advanced:false,fieldsToMatchString:'id',joinMode,outputDataFrom}),inputs);
});
test('released Merge strict/fuzzy field comparison matches held-out primitives, objects and nested/literal paths',async()=>{
 const values=[null,'',[],false,true,0,1,'0','1','false','TRUE',3,'3','03',{x:1},'{"x":1}',[1,2],'[1,2]'];
 for(const fuzzyCompare of [false,true]){
  const inputs=[values.map((key,index)=>item({key,index},index)),values.map((key,index)=>item({key,index},index,1))];await compare('fields full equality corpus fuzzy='+fuzzyCompare,merge({mode:'combine',combineBy:'combineByFields',advanced:false,fieldsToMatchString:'key',joinMode:'keepMatches',outputDataFrom:'both',options:{fuzzyCompare}}),inputs);
 }
 for(const disableDotNotation of [false,true]){const inputs=[[item({'a.b':1,a:{b:2},left:1})],[item({'c.d':1,c:{d:2},right:1},0,1)]];await compare('advanced paths literal='+disableDotNotation,merge({mode:'combine',combineBy:'combineByFields',advanced:true,mergeByFields:{values:[{field1:'a.b',field2:'c.d'}]},joinMode:'keepMatches',outputDataFrom:'both',options:{disableDotNotation}}),inputs);}
});

test('held-out released Merge nested type transitions and absent links retain exact outputs',async()=>{
 const values=[null,'',0,false,'text',[],[1,2],{0:'zero',extra:2},{nested:{a:1}}];
 for(const combineBy of ['combineByPosition','combineAll','combineByFields'])for(const mergeMode of [undefined,'deepMerge','shallowMerge'])for(const overrideEmpty of [false,true])for(let a=0;a<values.length;a++)for(let b=0;b<values.length;b++){
  const inputs=[[{json:{id:1,value:structuredClone(values[a]),absent:undefined}}],[{json:{id:1,value:structuredClone(values[b])},pairedItem:7}]],n=merge({mode:'combine',combineBy,...(combineBy==='combineByFields'?{advanced:false,fieldsToMatchString:'id',joinMode:'keepMatches',outputDataFrom:'both'}:{}),options:{clashHandling:{values:{...(mergeMode?{mergeMode}:{}),overrideEmpty}}}});
  await compare(`held-out type ${combineBy}/${mergeMode}/${overrideEmpty}/${a}/${b}`,n,inputs,'merge',true);
 }
});

test('held-out released Merge duplicate lookup destinations and signed-zero equality match',async()=>{
 await compare('duplicate field2 keeps last lookup',merge({mode:'combine',combineBy:'combineByFields',advanced:true,mergeByFields:{values:[{field1:'one',field2:'key'},{field1:'two',field2:'key'}]},joinMode:'keepMatches',outputDataFrom:'both'}),[[item({one:1,two:2})],[item({key:2},0,1)]]);
 for(const fuzzyCompare of [false,true])await compare('signed zero nested fuzzy='+fuzzyCompare,merge({mode:'combine',combineBy:'combineByFields',advanced:false,fieldsToMatchString:'key',joinMode:'keepMatches',outputDataFrom:'both',options:{fuzzyCompare}}),[[item({key:{numbers:[-0,1]}})],[item({key:{numbers:[0,1]}},0,1)]]);
});
test('dangerous Merge own keys are deliberate bounded rejections, separately counted from equality',async()=>{
 for(const key of ['__proto__','constructor','prototype']){
  const inputs=[[item(JSON.parse(`{"${key}":{"polluted":true},"a":1}`))],[item({b:2},0,1)]],n=merge({mode:'combine',combineBy:'combineByPosition'}),original=await result(()=>executeOriginalMerge(n,structuredClone(inputs))),candidate=await result(()=>executeNode(n,inputs[0],{inputs}));records.push({label:'deliberate dangerous-key rejection '+key,kind:'deliberate-safety-deviation',node:n,inputs,original,candidate});assert.equal(original.ok,true);assert.equal(candidate.ok,false);assert.equal(candidate.error.code,'NATIVE_LIMIT');assert.equal({}.polluted,undefined);counts.deliberateSafetyDeviations++;
 }
});
test('exact released core enqueue helpers retain distinct input ports until both batches arrive',()=>{
 const nodes=[node('manualTrigger','Start'),node('set','Left'),node('set','Right'),merge()],workflow={name:'Original enqueue helper',nodes,connections:{Start:{main:[[{node:'Left',type:'main',index:0},{node:'Right',type:'main',index:0}]]},Left:{main:[[{node:'Merge',type:'main',index:0}]]},Right:{main:[[{node:'Merge',type:'main',index:1}]]}}};
 const deliveries=[{from:'Left',connection:{node:'Merge',type:'main',index:0},outputs:[[item({left:1})]]},{from:'Right',connection:{node:'Merge',type:'main',index:1},outputs:[[item({right:2})]]}];
 const partial=executeOriginalEnqueue(workflow,deliveries.slice(0,1));assert.equal(partial.nodeExecutionStack.length,0);assert.deepEqual(partial.waitingExecution.Merge[0].main,[[item({left:1})],null]);const complete=executeOriginalEnqueue(workflow,deliveries);assert.equal(complete.nodeExecutionStack.length,1);assert.deepEqual(complete.nodeExecutionStack[0].data.main,[[item({left:1})],[item({right:2})]]);assert.deepEqual(complete.waitingExecution,{});records.push({label:'exact core enqueue waiting-input assertions',kind:'core-enqueue-helper',partial,complete});
});

test('exact released partial-drain block matches active append and blocked choose-branch input requirements',async()=>{
 for(const mode of ['append','chooseBranch'])for(const input of [0,1]){
  const n=merge({mode,chooseBranchMode:'waitForAll',output:'specifiedInput',useDataOfInput:2}),nodes=[node('manualTrigger','Start'),node('if','If',{conditions:filter('boolean',input===0?'true':'false',true,undefined,{}, {singleValue:true}),options:{}}),n],connections={Start:{main:[[{node:'If',type:'main',index:0}]]},If:{main:[[{node:'Merge',type:'main',index:0}],[{node:'Merge',type:'main',index:1}]]}},document={name:'Partial drain oracle',settings:{executionOrder:'v1'},nodes,connections};
  const original=executeOriginalPartialDrain(document,[{from:'If',port:input,connection:{node:'Merge',type:'main',index:input},outputs:input===0?[[{json:{}}],[]]:[[],[{json:{}}]]}]),candidate=createExecution(document);await advanceExecution(candidate);
  assert.equal(candidate.status,'completed');assert.equal(Object.hasOwn(candidate.outputs,'Merge'),original.nodeExecutionStack.length===1);if(mode==='append')assert.deepEqual(original.nodeExecutionStack[0].data.main,input===0?[[{json:{}}],[]]:[[],[{json:{}}]]);else assert.equal(original.nodeExecutionStack.length,0);
  records.push({label:`released partial drain ${mode}/input${input}`,kind:'core-partial-drain-block',original,candidate:{status:candidate.status,mergeExecuted:Object.hasOwn(candidate.outputs,'Merge'),joins:candidate.joins}});
 }
});
