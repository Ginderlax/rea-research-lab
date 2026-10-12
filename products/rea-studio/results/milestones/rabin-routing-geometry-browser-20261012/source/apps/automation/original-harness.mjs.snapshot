import * as fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const base=new URL('../../../../.local/automation-original/',import.meta.url),require=createRequire(new URL('package.json',base)), hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const acquisition=JSON.parse(await fs.readFile(new URL('./native-original-manifest.json',import.meta.url),'utf8'));
export async function verifyOriginalIntegrity(){
 try{await fs.access(new URL('.acquisition.lock',base));throw new Error('Oracle acquisition is running; compare only after acquisition completes');}catch(error){if(error.code!=='ENOENT')throw error;}
 for(const record of acquisition.archives){const bytes=await fs.readFile(new URL(`${record.name}-${record.version}.tgz`,base));if(hash(bytes)!==record.archiveSha256||`sha512-${createHash('sha512').update(bytes).digest('base64')}`!==record.integrity)throw new Error('Oracle archive authentication failed');}
 if(hash(await fs.readFile(new URL('package-lock.json',base)))!==acquisition.packageLockSha256)throw new Error('Original dependency lock changed');
 const entries=Object.entries(acquisition.files);let cursor=0;await Promise.all(Array.from({length:16},async()=>{while(cursor<entries.length){const[path,expected]=entries[cursor++];if(hash(await fs.readFile(new URL(path,base)))!==expected)throw new Error(`Oracle source authentication failed: ${path}`);}}));
 for(const contract of acquisition.contracts)if(hash(await fs.readFile(new URL(contract.localFile,base)))!==contract.sha256)throw new Error('Upstream contract bytes changed');
}
try{await verifyOriginalIntegrity();}catch(error){throw new Error(`Original fixtures unavailable or changed. Run node products/rea-studio/apps/automation/compare-original.mjs --acquire-only. ${error.message}`);}
const original=require('n8n-workflow');
const classes={
 'n8n-nodes-base.manualTrigger':require('./original/n8n-nodes-base/package/dist/nodes/ManualTrigger/ManualTrigger.node.js').ManualTrigger,
 'n8n-nodes-base.set':require('./original/n8n-nodes-base/package/dist/nodes/Set/v2/SetV2.node.js').SetV2,
 'n8n-nodes-base.if':require('./original/n8n-nodes-base/package/dist/nodes/If/V2/IfV2.node.js').IfV2,
 'n8n-nodes-base.httpRequest':require('./original/n8n-nodes-base/package/dist/nodes/HttpRequest/V3/HttpRequestV3.node.js').HttpRequestV3,
};
const types=Object.fromEntries(Object.entries(classes).map(([key,Class])=>[key,new Class({name:key.slice('n8n-nodes-base.'.length)})]));
const {extractValue}=require('./original/n8n-core/package/dist/execution-engine/node-execution-context/utils/extract-value.js');
export const observations={nodeExecutions:0,parameterResolutions:0,filterExtractions:0,waitMethodExecutions:0};
export const comparisons={exactOutputMatches:0,normalizedHttpOutputMatches:0,rejectionOutcomeMatches:0,deliberateDeviations:0,waitMethodOutputMatches:0};
export async function executeOriginalNode(input,items,{httpTransport}={}) {
 const node=structuredClone(input),type=types[node.type];if(!type)throw new Error(`Original harness unsupported type ${node.type}`);
 const workflow=new original.Workflow({id:'synthetic-oracle',name:'Synthetic oracle',nodes:[node],connections:{},active:false,nodeTypes:{getByNameAndVersion(name){return types[name]}}});
 const configured=workflow.nodes[node.name];
 const data={resultData:{runData:{}},executionData:{contextData:{},nodeExecutionStack:[]}};
 const context={getInputData:()=>items,getNode:()=>configured,getMode:()=> 'manual',getWorkflowSettings:()=>({}),getTimezone:()=> 'UTC',continueOnFail:()=>false,getContext:()=>({}),getNodeType:()=>type,sendMessageToUI:()=>{},getCredentials:()=>{throw new Error('No oracle credentials');},helpers:{returnJsonArray:values=>values.map(json=>({json})),request:httpTransport,binaryToBuffer:async value=>Buffer.from(value),binaryToString:async(value,encoding='utf8')=>require('iconv-lite').decode(value,encoding),detectBinaryEncoding:()=> 'utf-8'},
 getNodeParameter(name,index=0,fallback,options={}){observations.parameterResolutions++;const raw=require('lodash/get')(configured.parameters,name,fallback);if(raw===undefined)throw new Error(`Missing original parameter ${name}`);if(options.rawExpressions)return raw;let value=workflow.expression.getParameterValue(raw,data,0,index,node.name,items,'manual',{},undefined,false,{});if(options.extractValue){observations.filterExtractions++;value=extractValue(value,name,configured,type,index);}return value;},evaluateExpression(value,index=0){return workflow.expression.getParameterValue(`=${value}`,data,0,index,node.name,items,'manual',{},undefined,false,{});}};
 observations.nodeExecutions++;
 if(node.type==='n8n-nodes-base.manualTrigger'){let emitted;context.emit=value=>{emitted=value;};const trigger=await type.trigger.call(context);await trigger.manualTriggerFunction();return emitted;}
 return await type.execute.call(context);
}
const waitSource=await fs.readFile(new URL('./original/n8n-nodes-base/package/dist/nodes/Wait/Wait.node.js',base),'utf8');
const tree=require('acorn').parse(waitSource,{ecmaVersion:'latest',ranges:true});
const waitClass=tree.body.find(entry=>entry.type==='ClassDeclaration'&&entry.id.name==='Wait');
const method=name=>{const entry=waitClass.body.body.find(entry=>entry.type==='MethodDefinition'&&entry.key.name===name);if(!entry)throw new Error('Original Wait method absent');return waitSource.slice(entry.start,entry.end);};
export async function executeOriginalWait(node,items,now=Date.now()){
 observations.waitMethodExecutions++;
 class FixedDate extends Date {constructor(...args){super(...(args.length?args:[now]));}}
 const environment={Date:FixedDate,n8n_workflow_1:original,validation_1:require('./original/n8n-nodes-base/package/dist/nodes/Wait/validation.js')};
 // Exact authenticated released method bodies are executed, not rewritten.
 // Form/webhook dependencies and the complete Wait class are outside this harness.
 const methods=vm.runInNewContext(`({${method('execute')},${method('putToWait')}})`,environment,{timeout:1000});
 let waitUntil;
 const context={getInputData:()=>items,getNode:()=>node,getTimezone:()=> 'UTC',getNodeParameter:name=>node.parameters[name],putExecutionToWait:async date=>{waitUntil=date.toISOString();}};
 const outputs=await methods.execute.call(methods,context);return {waitUntil,outputs:structuredClone(outputs)};
}
