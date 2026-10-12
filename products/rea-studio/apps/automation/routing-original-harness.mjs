// Test only. Exact authenticated released Switch node and Merge mode helpers.
// Complete server/editor/database/SQL module and full WorkflowExecute are not run.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import Module,{createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const here=path.dirname(fileURLToPath(import.meta.url)),shared=path.resolve(here,'../../../../.local/automation-original'),local=path.resolve(here,'../../../../.local/automation-routing-original');
const manifest=JSON.parse(await fs.readFile(path.join(here,'native-original-manifest.json'),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function verifyOriginalIntegrity(){
 try{await fs.access(path.join(shared,'.acquisition.lock'));throw new Error('Original acquisition in progress');}catch(error){if(error.code!=='ENOENT')throw error;}
 for(const entry of manifest.archives){const bytes=await fs.readFile(path.join(shared,`${entry.name}-${entry.version}.tgz`));if(hash(bytes)!==entry.archiveSha256||'sha512-'+createHash('sha512').update(bytes).digest('base64')!==entry.integrity)throw new Error('Original archive authentication failed');}
 if(hash(await fs.readFile(path.join(shared,'package-lock.json')))!==manifest.packageLockSha256)throw new Error('Original dependency lock changed');
 const entries=Object.entries(manifest.files);let cursor=0;await Promise.all(Array.from({length:16},async()=>{while(cursor<entries.length){const[file,expected]=entries[cursor++];if(hash(await fs.readFile(path.join(shared,file)))!==expected)throw new Error('Shared original source changed: '+file);}}));
 const ownManifest=JSON.parse(await fs.readFile(path.join(here,'routing-original-manifest.json'),'utf8'));for(const[file,expected]of Object.entries(ownManifest.files))if(hash(await fs.readFile(path.join(local,file)))!==expected)throw new Error('Extracted original source changed: '+file);
}
await verifyOriginalIntegrity();
// Test-process-only dependency search path. Never modifies the shared fixtures.
process.env.NODE_PATH=path.join(shared,'node_modules');Module._initPaths();
const require=createRequire(path.join(local,'original/package/package.json'));
const original=require('n8n-workflow'),get=require('lodash/get');
const {SwitchV3}=require('./dist/nodes/Switch/V3/SwitchV3.node.js'),switchType=new SwitchV3({name:'switch'});
const {extractValue}=createRequire(path.join(shared,'package.json'))('./original/n8n-core/package/dist/execution-engine/node-execution-context/utils/extract-value.js');
const {cleanupParameterData}=createRequire(path.join(shared,'package.json'))('./original/n8n-core/package/dist/execution-engine/node-execution-context/utils/cleanup-parameter-data.js');
const {validateValueAgainstSchema}=createRequire(path.join(shared,'package.json'))('./original/n8n-core/package/dist/execution-engine/node-execution-context/utils/validate-value-against-schema.js');
const modes=Object.fromEntries(['append','chooseBranch','combineByPosition','combineAll','combineByFields'].map(name=>[name,require('./dist/nodes/Merge/v3/actions/mode/'+name+'.js')]));
const {getNodeInputsData}=require('./dist/nodes/Merge/v3/helpers/utils.js');
const {configuredInputs}=require('./dist/nodes/Merge/v3/helpers/utils.js');
const coreSource=await fs.readFile(path.join(shared,'original/n8n-core/package/dist/execution-engine/workflow-execute.js'),'utf8');
const tree=require('acorn').parse(coreSource,{ecmaVersion:'latest'}),coreClass=tree.body.find(entry=>entry.type==='ClassDeclaration'&&entry.id.name==='WorkflowExecute');
const method=name=>{const entry=coreClass.body.body.find(entry=>entry.type==='MethodDefinition'&&entry.key.name===name);if(!entry)throw new Error('Missing released core helper: '+name);return coreSource.slice(entry.start,entry.end);};
const coreMethods=vm.runInNewContext('({'+['incomingConnectionIsEmpty','prepareWaitingToExecution','addNodeToBeExecuted','isLegacyExecutionOrder'].map(method).join(',')+'})',{get_1:{default:get},n8n_workflow_1:original},{timeout:1000});
let drainIf;
function findDrain(value){if(!value||typeof value!=='object')return;if(value.type==='IfStatement'&&coreSource.slice(value.test.start,value.test.end).includes('this.runExecutionData.executionData.nodeExecutionStack.length === 0')&&coreSource.slice(value.test.start,value.test.end).includes('waitingNodes.length'))drainIf=value;for(const data of Object.values(value)){if(Array.isArray(data))data.forEach(findDrain);else if(data&&typeof data==='object')findDrain(data);}}
findDrain(tree);if(!drainIf)throw new Error('Missing released waiting-input drain block');
const coreDrain=vm.runInNewContext('(function(workflow){let waitingNodes=Object.keys(this.runExecutionData.executionData.waitingExecution);'+coreSource.slice(drainIf.start,drainIf.end)+'})',{}, {timeout:1000});
const mergeRequiredInputs='={{ $parameter["mode"] === "chooseBranch" ? [0, 1] : 1 }}';
if(!await fs.readFile(path.join(local,'original/package/dist/nodes/Merge/v3/actions/versionDescription.js'),'utf8').then(source=>source.includes(mergeRequiredInputs)))throw new Error('Released required-input expression changed');
export const observations={switchNodeExecutions:0,mergeModeExecutions:0,parameterResolutions:0,filterExtractions:0,schemaValidations:0,coreEnqueueHelperExecutions:0,corePartialDrainExecutions:0};
export async function executeOriginalSwitch(input,items){
 const node=structuredClone(input),workflow=new original.Workflow({id:'synthetic-routing-oracle',name:'Synthetic routing',nodes:[node],connections:{},active:false,nodeTypes:{getByNameAndVersion:()=>switchType}}),configured=workflow.nodes[node.name];
 const data={resultData:{runData:{}},executionData:{contextData:{},nodeExecutionStack:[]}};
 const context={getInputData:()=>items,getNode:()=>configured,continueOnFail:()=>false,getNodeParameter(name,index=0,fallback,options={}){observations.parameterResolutions++;const raw=get(configured.parameters,name,fallback);if(raw===undefined)throw new Error('Missing original parameter: '+name);let value=workflow.expression.getParameterValue(raw,data,0,index,node.name,items,'manual',{},undefined,false,{});cleanupParameterData(value);if(options.extractValue){observations.filterExtractions++;value=extractValue(value,name,configured,switchType,index);}observations.schemaValidations++;return validateValueAgainstSchema(configured,switchType,value,name,0,index);}};
 observations.switchNodeExecutions++;return switchType.execute.call(context);
}
export async function executeOriginalMerge(input,inputs){
 const node=structuredClone(input),p=node.parameters,mode=(p.mode??'append')==='combine'?p.combineBy:(p.mode??'append');if(!modes[mode])throw new Error('Original mode outside harness');
 // Explicit parameters plus released getNodeParameter fallbacks. Tests materialize
 // required defaults; this does not claim to execute the complete Merge class.
 const context={getNode:()=>node,getNodeInputs:()=>Array.from({length:p.numberInputs??2},()=>({type:'main'})),getInputData:index=>inputs[index??0],getNodeParameter(name,index=0,fallback){observations.parameterResolutions++;const value=get(p,name,fallback);if(value===undefined)throw new Error('Missing explicit original Merge parameter '+name);return structuredClone(value);},addExecutionHints:()=>{}};
 observations.mergeModeExecutions++;return modes[mode].execute.call(context,getNodeInputsData.call(context));
}
export function executeOriginalEnqueue(workflowValue,deliveries){
 const workflow=new original.Workflow({id:'synthetic-enqueue-oracle',name:workflowValue.name,nodes:structuredClone(workflowValue.nodes),connections:structuredClone(workflowValue.connections),settings:{executionOrder:'v1'},active:false,nodeTypes:{getByNameAndVersion:(name)=>({description:{name:name.split('.').at(-1),properties:[],inputs:['main'],outputs:['main']}})}});
 const context={...coreMethods,runExecutionData:{executionData:{nodeExecutionStack:[],waitingExecution:{},waitingExecutionSource:{}},resultData:{runData:{}}}};
 for(const entry of deliveries){observations.coreEnqueueHelperExecutions++;context.addNodeToBeExecuted(workflow,entry.connection,entry.port??0,entry.from,entry.outputs,0);}
 return structuredClone(context.runExecutionData.executionData);
}
export function executeOriginalPartialDrain(workflowValue,deliveries){
 const types={getByNameAndVersion:(name)=>({description:{name:name.split('.').at(-1),properties:[],inputs:['main'],outputs:['main']}})},workflow=new original.Workflow({id:'synthetic-drain-oracle',name:workflowValue.name,nodes:structuredClone(workflowValue.nodes),connections:structuredClone(workflowValue.connections),settings:{executionOrder:'v1'},active:false,nodeTypes:types});
 for(const n of workflowValue.nodes)workflow.nodes[n.name].parameters=structuredClone(n.parameters);
 // Materialize dynamic ports with the exact released configuredInputs helper.
 // Required-input expression is the authenticated released string, resolved by
 // the actual Workflow expression helper; no complete core scheduler is run.
 const generic=types.getByNameAndVersion;types.getByNameAndVersion=(name,version)=>{const n=workflowValue.nodes.find(node=>node.type===name&&node.typeVersion===version);return name==='n8n-nodes-base.merge'?{description:{...generic(name).description,inputs:configuredInputs(n.parameters),requiredInputs:mergeRequiredInputs}}:generic(name);};
 const context={...coreMethods,mode:'manual',runExecutionData:{executionData:{nodeExecutionStack:[],waitingExecution:{},waitingExecutionSource:{}},resultData:{runData:{}}}};
 for(const entry of deliveries){observations.coreEnqueueHelperExecutions++;context.addNodeToBeExecuted(workflow,entry.connection,entry.port??0,entry.from,entry.outputs,0);}
 observations.corePartialDrainExecutions++;coreDrain.call(context,workflow);return structuredClone(context.runExecutionData.executionData);
}
