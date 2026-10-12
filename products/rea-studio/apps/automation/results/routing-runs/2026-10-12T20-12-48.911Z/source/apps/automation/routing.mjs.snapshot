// Source-assisted native subset of released Switch3.4/Merge3.2. No vendor runtime.
import {bounded,LIMITS,NativeError,resolve,filterCondition,pathParts,validateIf} from './native.mjs';

const fail=(message,code='NATIVE_CONFIG')=>{throw new NativeError(message,code);};
const own=(target,key,value)=>Object.defineProperty(target,key,{value,enumerable:true,writable:true,configurable:true});
const copy=value=>structuredClone(value);
function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))fail(label+' requires an object');return value;}
function only(value,keys,label){object(value,label);for(const key of Object.keys(value))if(!keys.includes(key))fail(label+': unsupported '+key,'NATIVE_UNSUPPORTED');}
function integer(value,min,max,label){if(!Number.isInteger(value)||value<min||value>max)fail(`${label} must be an integer from ${min} through ${max}`,'NATIVE_LIMIT');return value;}
function bool(value,label){if(value!==undefined&&typeof value!=='boolean')fail(label+' must be boolean');}
function text(value,label){if(value!==undefined&&(typeof value!=='string'||value.length>4096))fail(label+' must be bounded text');}
const expression=value=>typeof value==='string'&&value.startsWith('=');
function outputIndex(value,max){if(value===null||value===undefined)fail('Switch output index is missing');return integer(Number(value),0,max,'Switch output index');}
export function outputCount(node){if(node.type==='n8n-nodes-base.if')return 2;if(node.type!=='n8n-nodes-base.switch')return 1;const p=node.parameters;return p.mode==='expression'?(p.numberOutputs??4):Math.max(1,(p.rules?.values?.length??0)+(p.options?.fallbackOutput==='extra'?1:0));}
export function inputCount(node){return node.type==='n8n-nodes-base.merge'?(node.parameters.numberInputs??2):1;}
export function validateSwitch(node){
 const p=node.parameters;only(p,['mode','numberOutputs','output','rules','options','looseTypeValidation'],'Switch parameters');
 if(!['rules','expression',undefined].includes(p.mode))fail('Unsupported Switch mode');bool(p.looseTypeValidation,'Loose type validation');
 const o=p.options??{};only(o,['fallbackOutput','ignoreCase','looseTypeValidation','renameFallbackOutput','allMatchingOutputs'],'Switch options');
 for(const key of ['ignoreCase','looseTypeValidation','allMatchingOutputs'])bool(o[key],key);text(o.renameFallbackOutput,'Fallback name');
 if(p.mode==='expression'){
  integer(p.numberOutputs??4,1,100,'Switch output count');
  if(!expression(p.output))outputIndex(p.output,(p.numberOutputs??4)-1);
  return;
 }
 const rules=p.rules?.values??[];only(p.rules??{},['values'],'Switch rules');if(!Array.isArray(rules)||rules.length>100)fail('Switch needs at most100 rules','NATIVE_LIMIT');
 for(const rule of rules){only(rule,['conditions','renameOutput','outputKey'],'Switch rule');bool(rule.renameOutput,'Rename output');text(rule.outputKey,'Output name');validateIf({parameters:{conditions:rule.conditions,looseTypeValidation:p.looseTypeValidation,options:{ignoreCase:o.ignoreCase}}});}
 if(![undefined,'none','extra'].includes(o.fallbackOutput))integer(o.fallbackOutput,0,Math.max(0,rules.length-1),'Fallback output');
}
export function switchItems(node,items,context={}){
 validateSwitch(node);if(!items.length)return[[]];const outputs=Array.from({length:outputCount(node)},()=>[]);let outputItems=0,outputBytes=0,work=0;
 const guard=()=>{if(context.signal?.aborted)throw context.signal.reason??new NativeError('Execution cancelled','NATIVE_CANCELLED');if(context.deadline!==undefined&&performance.now()>context.deadline)fail('Switch active deadline exceeded','NATIVE_LIMIT');};guard();
 const push=(port,value)=>{guard();if(++outputItems>LIMITS.items)fail('Switch exceeds10,000 aggregate output items','NATIVE_LIMIT');outputBytes+=Buffer.byteLength(JSON.stringify(value));if(outputBytes>LIMITS.executionBytes)fail('Switch output exceeds8MiB','NATIVE_LIMIT');outputs[port].push(copy(value));};
 const condition=(value,options)=>{if(++work>1000000)fail('Switch exceeds1,000,000 condition work units','NATIVE_LIMIT');guard();return filterCondition(value,options);};
 for(const[index,item]of items.entries()){
  const p=resolve(node.parameters,item),out=copy(item);out.pairedItem={item:index};
  if(p.mode==='expression'){const port=outputIndex(p.output,outputs.length-1);push(port,out);continue;}
  const rules=p.rules?.values??[];let matched=false;
  for(const[port,rule]of rules.entries()){
   const f=rule.conditions,pass=f.combinator==='and'?f.conditions.every(c=>condition(c,f.options)):f.conditions.some(c=>condition(c,f.options));
   if(pass){push(port,out);matched=true;if(!p.options?.allMatchingOutputs)break;}
  }
  const fallback=p.options?.fallbackOutput;if(!matched&&fallback!==undefined&&fallback!=='none'&&rules.length)push(fallback==='extra'?outputs.length-1:integer(fallback,0,outputs.length-1,'Fallback output'),out);
 }
 return bounded(outputs,LIMITS.executionBytes,{undefinedValues:true});
}
export function validateMerge(node){
 const p=node.parameters;only(p,['mode','numberInputs','chooseBranchMode','output','useDataOfInput','combineBy','advanced','mergeByFields','fieldsToMatchString','joinMode','outputDataFrom','options'],'Merge parameters');
 if(!['append','chooseBranch','combine',undefined].includes(p.mode))fail('Merge SQL/unknown mode is unsupported','NATIVE_UNSUPPORTED');integer(inputCount(node),2,10,'Merge inputs');
 const o=p.options??{};only(o,['clashHandling','includeUnpaired','disableDotNotation','fuzzyCompare','multipleMatches'],'Merge options');for(const key of ['includeUnpaired','disableDotNotation','fuzzyCompare'])bool(o[key],key);
 if(o.multipleMatches!==undefined&&!['all','first'].includes(o.multipleMatches))fail('Invalid multiple matches');
 only(o.clashHandling??{},['values'],'Clash handling');const c=o.clashHandling?.values??{};only(c,['resolveClash','mergeMode','overrideEmpty'],'Clash values');
 if(c.resolveClash!==undefined&&!['preferLast','addSuffix',...Array.from({length:inputCount(node)},(_,i)=>'preferInput'+(i+1))].includes(c.resolveClash))fail('Invalid clash preference');
 if(c.mergeMode!==undefined&&!['deepMerge','shallowMerge'].includes(c.mergeMode))fail('Invalid nested merge mode');bool(c.overrideEmpty,'Override empty');
 if(p.mode==='chooseBranch'){
  if(p.chooseBranchMode!==undefined&&p.chooseBranchMode!=='waitForAll')fail('Only waitForAll is supported');if(p.output!==undefined&&!['specifiedInput','empty'].includes(p.output))fail('Unsupported choose-branch output');integer(p.useDataOfInput??1,1,inputCount(node),'Chosen input');return;
 }
 if(p.mode==='combine'){
  if(!['combineByPosition','combineAll','combineByFields'].includes(p.combineBy))fail('Unsupported Merge combine mode','NATIVE_UNSUPPORTED');
  if(p.combineBy!=='combineByPosition'&&inputCount(node)!==2)fail('Field/cartesian merge supports exactly2 inputs','NATIVE_UNSUPPORTED');
  if(p.combineBy==='combineByFields'){
   if(c.resolveClash?.startsWith('preferInput')&&c.resolveClash!=='preferInput1')fail('Field Merge supports preferInput1/preferLast/addSuffix','NATIVE_UNSUPPORTED');
   bool(p.advanced,'Advanced fields');if(p.joinMode!==undefined&&!['keepMatches','keepNonMatches','keepEverything','enrichInput1','enrichInput2'].includes(p.joinMode))fail('Invalid join mode');if(p.outputDataFrom!==undefined&&!['both','input1','input2'].includes(p.outputDataFrom))fail('Invalid output source');
   only(p.mergeByFields??{},['values'],'Match field pairs');const fields=matchFields(p);if(!fields.length||fields.length>100)fail('Use1–100 matching fields','NATIVE_LIMIT');for(const pair of fields){only(pair,['field1','field2'],'Match pair');for(const key of ['field1','field2']){text(pair[key],'Match field');if(!pair[key])fail('Matching field cannot be empty');if(!o.disableDotNotation)pathParts(pair[key]);else if(['__proto__','prototype','constructor'].includes(pair[key]))fail('Unsafe matching field','NATIVE_LIMIT');}}
  }
 }
}
function matchFields(p){if(p.advanced){const fields=p.mergeByFields?.values??[];if(!Array.isArray(fields))fail('Match fields require an array');return fields;}if(typeof(p.fieldsToMatchString??'')!=='string')fail('Match field list requires text');return(p.fieldsToMatchString??'').split(',').map(f=>({field1:f.trim(),field2:f.trim()}));}
function read(value,parts){for(const key of parts){if(!value||typeof value!=='object'||!Object.hasOwn(value,key))return undefined;value=value[key];}return value;}
function safe(value){if(value&&typeof value==='object')for(const[key,data]of Object.entries(value)){if(['__proto__','prototype','constructor'].includes(key))fail('Dangerous Merge property is unsupported','NATIVE_LIMIT');safe(data);}}
function mergeJson(sources,options={},emptyTarget=false){
 // The released overrideEmpty helper shallow-copies its target before merging.
 // Keep those references within the private input clone so later combinations
 // reproduce released alias effects without mutating caller-owned input.
 const shallowTarget=options.overrideEmpty&&['deepMerge','shallowMerge'].includes(options.mergeMode)&&!emptyTarget,target={};
 if(shallowTarget)for(const[key,value]of Object.entries(sources[0]??{}))own(target,key,value);
 const pending=shallowTarget?sources.slice(1):sources;
 function assign(dst,src){const keys=Array.isArray(src)?[...Array.from({length:src.length},(_,i)=>String(i)),...Object.keys(src).filter(key=>! /^(0|[1-9]\d*)$/.test(key))]:Object.keys(src);for(const key of keys){const value=src[key],old=Object.hasOwn(dst,key)?dst[key]:undefined;if(options.overrideEmpty&&['deepMerge','shallowMerge'].includes(options.mergeMode)&&(value===undefined||value===null||value==='')&&old!==undefined)continue;
  if(options.mergeMode!=='shallowMerge'&&value&&typeof value==='object'){
   const next=Array.isArray(value)?(Array.isArray(old)?old:[]):(old&&typeof old==='object'?old:{});own(dst,key,next);assign(next,value);
  }else if((value!==undefined||!Object.hasOwn(dst,key))&&(!Object.hasOwn(dst,key)||old!==value))own(dst,key,options.mergeMode==='shallowMerge'?value:copy(value));
 }}
 for(const source of pending)assign(target,source??{});return target;
}
function suffix(items,index){return items.map(item=>({...item,json:Object.fromEntries(Object.entries(item.json).map(([key,value])=>[key+'_'+index,value]))}));}
const paired=value=>value===undefined?[]:typeof value==='number'?[{item:value}]:Array.isArray(value)?value:[value];
function persistableArrays(value){if(value&&typeof value==='object'){if(Array.isArray(value)&&Object.keys(value).some(key=>! /^(0|[1-9]\d*)$/.test(key)||Number(key)>=value.length))fail('Merge array properties cannot be retained by JSON checkpoints','NATIVE_LIMIT');for(const data of Object.values(value))persistableArrays(data);}}
function jsonEqual(a,b){if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;if(Array.isArray(a))return a.length===b.length&&Array.from({length:a.length},(_,i)=>i).every(i=>jsonEqual(a[i],b[i]));const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&jsonEqual(a[key],b[key]));}
function equal(a,b,fuzzy){
 if(!fuzzy)return jsonEqual(a,b);
 if(a!==null&&b!==null&&typeof a===typeof b)return jsonEqual(a,b);
 const empty=v=>v===null||v===''||(Array.isArray(v)&&v.length===0);if(empty(a)&&(empty(b)||b===undefined)||empty(b)&&a===undefined)return true;
 if(typeof a==='number'&&typeof b==='string')return String(a)===b;if(typeof b==='number'&&typeof a==='string')return a===String(b);
 if(a!==null&&typeof a==='object'&&typeof b==='string'){try{return jsonEqual(a,JSON.parse(b));}catch{return false;}}
 if(b!==null&&typeof b==='object'&&typeof a==='string'){try{return jsonEqual(b,JSON.parse(a));}catch{return false;}}
 if(typeof a==='boolean'&&typeof b==='string')return b.toLocaleLowerCase()===String(a)||b===(a?'1':'0');if(typeof b==='boolean'&&typeof a==='string')return a.toLocaleLowerCase()===String(b)||a===(b?'1':'0');
 if(typeof a==='boolean'&&typeof b==='number')return b===(a?1:0);if(typeof b==='boolean'&&typeof a==='number')return a===(b?1:0);return jsonEqual(a,b);
}
export function mergeItems(node,source,context={}){
 validateMerge(node);bounded(source,LIMITS.executionBytes,{undefinedValues:true});if(!Array.isArray(source)||source.length!==inputCount(node)||source.some(input=>!Array.isArray(input)||input.length>LIMITS.items||input.some(item=>!item?.json||typeof item.json!=='object'||Array.isArray(item.json)||(item.binary&&Object.keys(item.binary).length))))fail('Invalid bounded Merge inputs');
 const inputs=copy(source);for(const input of inputs)for(const item of input)safe(item.json);
 const p=node.parameters,o=p.options??{},clash=o.clashHandling?.values??{},outputs=[];let bytes=0,work=0;
 const guard=()=>{if(context.signal?.aborted)throw context.signal.reason??new NativeError('Execution cancelled','NATIVE_CANCELLED');if(context.deadline!==undefined&&performance.now()>context.deadline)fail('Merge active deadline exceeded','NATIVE_LIMIT');};guard();
 const push=item=>{guard();if(outputs.length>=LIMITS.items)fail('Merge exceeds10,000 output items','NATIVE_LIMIT');bounded(item,LIMITS.valueBytes,{undefinedValues:true});persistableArrays(item.json);bytes+=Buffer.byteLength(JSON.stringify(item));if(bytes>LIMITS.executionBytes)fail('Merge output exceeds8MiB','NATIVE_LIMIT');outputs.push(item);};
 const tick=()=>{if(++work>1000000)fail('Merge exceeds1,000,000 comparison/combination work units','NATIVE_LIMIT');if(context.signal?.aborted)throw context.signal.reason??new NativeError('Execution cancelled','NATIVE_CANCELLED');if(context.deadline!==undefined&&performance.now()>context.deadline)fail('Merge active deadline exceeded','NATIVE_LIMIT');};
 const merged=(entries,links,emptyTarget=false)=>({json:mergeJson(entries.map(e=>e.json),clash,emptyTarget),binary:{},pairedItem:links});
 if((p.mode??'append')==='append'){if(inputs.reduce((n,input)=>n+input.length,0)>LIMITS.items)fail('Append exceeds10,000 output items','NATIVE_LIMIT');for(const input of inputs)for(const item of input)push(item);return[outputs];}
 if(p.mode==='chooseBranch'){
  if(p.output==='empty')push({json:{},pairedItem:inputs.slice(0,2).flatMap(input=>input.flatMap(item=>paired(item.pairedItem)))});else for(const item of inputs[(p.useDataOfInput??1)-1])push(item);return[outputs];
 }
 if(p.combineBy==='combineByPosition'){
  const preferredIndex=clash.resolveClash?.startsWith('preferInput')?Number(clash.resolveClash.slice(11))-1:inputs.length-1;
  const preferred=inputs[preferredIndex]; // Preserve released addSuffix behavior, including unsuffixed preferred keys.
  const rest=clash.resolveClash==='addSuffix'?inputs.map((input,i)=>suffix(input,i+1)):inputs;
  const length=o.includeUnpaired?Math.max(...rest.map(a=>a.length),preferred.length):Math.min(...rest.map(a=>a.length),preferred.length);
  for(let i=0;i<length;i++){tick();const entries=rest.map(input=>input[i]??{json:{}}),last=preferred[i]??{json:{}};push(merged([...entries,last],[...entries.map(e=>e.pairedItem).flat(),last.pairedItem].filter(x=>x!==undefined),true));}return[bounded(outputs,LIMITS.executionBytes,{undefinedValues:true})];
 }
 if(p.combineBy==='combineAll'){
  let[a,b]=inputs;if(clash.resolveClash==='preferInput1')[a,b]=[b,a];if(clash.resolveClash==='addSuffix'){a=suffix(a,1);b=suffix(b,2);}if(a.length*b.length>LIMITS.items)fail('Cartesian Merge exceeds10,000 output items','NATIVE_LIMIT');
  for(const first of a)for(const second of b){tick();push(merged([first,second],[first.pairedItem,second.pairedItem]));}return[bounded(outputs,LIMITS.executionBytes,{undefinedValues:true})];
 }
 const[a,b]=inputs,join=p.joinMode??'keepMatches',from=p.outputDataFrom??'both',fields=[...new Map(matchFields(p).map(pair=>[pair.field2,pair])).values()];
 if(!a.length||!b.length){if(join==='keepMatches'||join==='enrichInput1'&&!a.length||join==='enrichInput2'&&!b.length)return[];if(join==='keepNonMatches'&&(from==='input1'&&!a.length||from==='input2'&&!b.length))return[[]];for(const entry of [...a,...b])push(entry);return[outputs];}
 if(a.length*b.length*fields.length>1000000)fail('Field Merge exceeds1,000,000 comparison work units','NATIVE_LIMIT');
 const matched=[],matched2=new Set(),unmatched1=[];
 for(const first of a){const values=fields.map(f=>read(first.json,o.disableDotNotation?[f.field1]:pathParts(f.field1)));if(values.some(v=>v===undefined)){unmatched1.push(first);continue;}const matches=[];
  for(const[index,second]of b.entries()){tick();if(fields.every((f,i)=>equal(values[i],read(second.json,o.disableDotNotation?[f.field2]:pathParts(f.field2)),o.fuzzyCompare))){matched2.add(index);matches.push(second);if(o.multipleMatches==='first')break;}}
  if(!matches.length)unmatched1.push(first);else if(from==='both'||join==='enrichInput1'||join==='enrichInput2')for(const second of matches)matched.push({first,matches:[second]});else matched.push({first,matches});
 }
 const unmatched2=b.filter((_,i)=>!matched2.has(i));
 const emitMerged=({first,matches})=>{let entries,prefer=clash.resolveClash??(join==='enrichInput2'?'preferInput1':'preferLast');if(prefer==='addSuffix')entries=[...suffix([first],1),...suffix(matches,2)];else entries=prefer==='preferInput1'?[...matches,first]:[first,...matches];push(merged(entries,entries.flatMap(item=>paired(item.pairedItem))));};
 if(join==='keepMatches'||join==='keepEverything'){
  if(from==='input1')for(const match of matched)push(match.first);else if(from==='input2')for(const[index,item]of b.entries()){if(matched2.has(index))push(item);}else for(const match of matched)emitMerged(match);
  if(join==='keepEverything'){for(const item of clash.resolveClash==='addSuffix'?suffix(unmatched1,1):unmatched1)push(item);for(const item of clash.resolveClash==='addSuffix'?suffix(unmatched2,2):unmatched2)push(item);}
 }else if(join==='keepNonMatches'){
  if(from==='input1')for(const item of unmatched1)push(item);else if(from==='input2')for(const item of unmatched2)push(item);else for(const[input,index]of [[unmatched1,'input1'],[unmatched2,'input2']])for(const item of input)push({...item,json:{...item.json,_source:index}});
 }else{for(const match of matched)emitMerged(match);const unmatched=join==='enrichInput1'?unmatched1:unmatched2;for(const item of clash.resolveClash==='addSuffix'?suffix(unmatched,join==='enrichInput1'?1:2):unmatched)push(item);}
 return[bounded(outputs,LIMITS.executionBytes,{undefinedValues:true})];
}
