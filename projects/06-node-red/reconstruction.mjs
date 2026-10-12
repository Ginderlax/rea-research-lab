// SPDX-License-Identifier: Apache-2.0
// Laboratory source revised 2026-10-12; see NOTICE.md for upstream attribution.
// Original bounded Node-RED Switch behavior reconstruction.
export function matches(operator,value,operand,upper,ignoreCase=false){
 const relation={eq:()=>value==operand,neq:()=>value!=operand,lt:()=>value<operand,lte:()=>value<=operand,gt:()=>value>operand,gte:()=>value>=operand};
 if(operator in relation)return relation[operator]();
 switch(operator){
  case 'btwn':return value>=operand&&value<=upper || value<=operand&&value>=upper;
  case 'cont':return String(value).includes(String(operand));
  case 'regex':return new RegExp(operand,ignoreCase?'i':'').test(String(value));
  case 'true':return value===true;
  case 'false':return value===false;
  case 'null':return value==null;
  case 'nnull':return value!=null;
  case 'empty':case 'nempty':{
   let size;if(typeof value==='string'||Array.isArray(value)||Buffer.isBuffer(value))size=value.length;
   else if(value!==null&&typeof value==='object')size=Object.keys(value).length;
   else return false;
   return operator==='empty'?size===0:size!==0;
  }
  case 'istype':{
   if(operand==='array')return Array.isArray(value);
   if(operand==='buffer')return Buffer.isBuffer(value);
   if(operand==='null')return value===null;
   if(operand==='json'){try{JSON.parse(value);return true;}catch{return false;}}
   if(operand==='number')return typeof value==='number'&&!Number.isNaN(value);
   return typeof value===operand&&!Array.isArray(value)&&!Buffer.isBuffer(value)&&value!==null;
  }
  case 'hask':return value!=null&&typeof operand!=='object'&&value.hasOwnProperty(String(operand));
  default:throw Error('Unsupported bounded operator: '+operator);
 }
}
function resolve(value,type,payload){
 const effective=type??(!Number.isNaN(Number(value))?'num':'str');
 if(effective==='num')return Number(value);
 if(effective==='str')return String(value);
 if(effective==='bool')return value===true||value==='true';
 if(effective==='msg'&&value==='payload')return payload;
 if(value===undefined)return undefined;
 throw Error('Unsupported operand type '+effective);
}
export function route(payload,rules,{firstMatch=false}={}){
 const ports=[];let otherwiseEligible=true;
 for(let port=0;port<rules.length;port++){
  const rule=rules[port];let hit;
  if(rule.t==='else'){
   hit=otherwiseEligible;
   // Otherwise starts a fresh eligibility segment, then a match consumes it.
   otherwiseEligible=true;
  }else hit=matches(rule.t,payload,resolve(rule.v,rule.vt,payload),resolve(rule.v2,rule.v2t,payload),rule.case);
  if(hit){ports.push(port);otherwiseEligible=false;if(firstMatch)break;}
 }
 return ports;
}
