export function nativeExample(){return{
 name:'Native n8n example',active:false,settings:{executionOrder:'v1'},
 nodes:[
  {id:'manual',name:'Manual Trigger',type:'n8n-nodes-base.manualTrigger',typeVersion:1,position:[0,0],parameters:{}},
  {id:'set',name:'Edit Fields',type:'n8n-nodes-base.set',typeVersion:3.4,position:[220,0],parameters:{assignments:{assignments:[{id:'amount',name:'amount',value:150,type:'number'}]},options:{}}},
  {id:'if',name:'If',type:'n8n-nodes-base.if',typeVersion:2.3,position:[440,0],parameters:{conditions:{options:{caseSensitive:true,typeValidation:'strict',version:3},combinator:'and',conditions:[{id:'qualify',leftValue:'={{ $json.amount }}',rightValue:100,operator:{type:'number',operation:'gte'}}]},options:{}}},
  {id:'wait',name:'Wait',type:'n8n-nodes-base.wait',typeVersion:1.1,position:[660,-80],parameters:{resume:'timeInterval',amount:0.1,unit:'seconds'}},
  {id:'done',name:'Finished',type:'n8n-nodes-base.set',typeVersion:3.4,position:[880,-80],parameters:{includeOtherFields:true,assignments:{assignments:[{name:'finished',value:true,type:'boolean'}]},options:{}}}
 ],connections:{'Manual Trigger':{main:[[{node:'Edit Fields',type:'main',index:0}]]},'Edit Fields':{main:[[{node:'If',type:'main',index:0}]]},If:{main:[[{node:'Wait',type:'main',index:0}],[]]},Wait:{main:[[{node:'Finished',type:'main',index:0}]]}}
};}

export function nativeRoutingExample(){return{
 name:'Native routing example',active:false,settings:{executionOrder:'v1'},nodes:[
 {id:'start',name:'Start',type:'n8n-nodes-base.manualTrigger',typeVersion:1,position:[0,0],parameters:{}},
 {id:'seed',name:'Seed',type:'n8n-nodes-base.set',typeVersion:3.4,position:[200,0],parameters:{mode:'raw',jsonOutput:'{"amount":150}',options:{}}},
 {id:'switch',name:'Switch',type:'n8n-nodes-base.switch',typeVersion:3.4,position:[400,0],parameters:{mode:'rules',rules:{values:[{conditions:{options:{caseSensitive:true,typeValidation:'strict',version:3},combinator:'and',conditions:[{leftValue:'={{ $json.amount }}',rightValue:100,operator:{type:'number',operation:'gte'}}]}}]},options:{fallbackOutput:'extra',allMatchingOutputs:false}}},
 {id:'wait',name:'Wait',type:'n8n-nodes-base.wait',typeVersion:1.1,position:[600,100],parameters:{resume:'timeInterval',amount:.1,unit:'seconds'}},
 {id:'merge',name:'Merge',type:'n8n-nodes-base.merge',typeVersion:3.2,position:[800,0],parameters:{mode:'append',numberInputs:2,options:{}}},
 {id:'finish',name:'Finished',type:'n8n-nodes-base.set',typeVersion:3.4,position:[1000,0],parameters:{includeOtherFields:true,assignments:{assignments:[{name:'finished',value:true,type:'boolean'}]},options:{}}}
 ],connections:{Start:{main:[[{node:'Seed',type:'main',index:0}]]},Seed:{main:[[{node:'Switch',type:'main',index:0},{node:'Wait',type:'main',index:0}]]},Switch:{main:[[{node:'Merge',type:'main',index:0}],[]]},Wait:{main:[[{node:'Merge',type:'main',index:1}]]},Merge:{main:[[{node:'Finished',type:'main',index:0}]]}}
};}
