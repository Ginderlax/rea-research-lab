// Source-assisted static-link routing contract: Node-RED5.0.8, Apache-2.0.
// The application never evaluates original Node-RED code or dependencies.
const unsafe=new Set(['__proto__','constructor','prototype']);
function identity(value){if(typeof value!=='string'||!/^[A-Za-z0-9_.:-]{1,80}$/.test(value)||unsafe.has(value))throw new Error('Invalid native link node id');return value;}
export function compileNativeLinks(nodes){
  if(!Array.isArray(nodes)||!nodes.length||nodes.length>500)throw new Error('Static link compilation needs1–500 native nodes');
  const byId=new Map(),links=Object.create(null),outgoing=[],issues=[];let destinations=0;
  for(const n of nodes){if(!n||typeof n!=='object'||Array.isArray(n))throw new Error('Invalid native link node');identity(n.id);if(byId.has(n.id))throw new Error('Duplicate native link node id');byId.set(n.id,n);}
  const add=(out,target)=>{const map=links[out]??(links[out]=Object.create(null));map[target]=true;};
  for(const n of nodes){if(!['link in','link out'].includes(n.type)||!n.links)continue;if(!Array.isArray(n.links))throw new Error('Static native link lists must be arrays or a falsy omitted value');if(n.links.length>2000)throw new Error('At most2,000 native link declarations');for(const target of n.links){identity(target);if(++destinations>2000)throw new Error('At most2,000 native link declarations');if(n.type==='link in')add(target,n.id);else add(n.id,target);}if(n.type==='link out')outgoing.push(n);}
  const compiled=new Map(byId),connections=[];
  for(const out of outgoing){const targets=Object.keys(links[out.id]??{});compiled.set(out.id,{...out,wires:[targets]});for(const target of targets){const node=byId.get(target);if(!node||node.type!=='link in')issues.push({node:out.id,type:out.type,reason:`Configured static link target ${target} is ${node?'not Link In':'missing'}`});connections.push({source:out.id,target});}}
  return{nodes:compiled,linkConnections:connections,issues,declarations:destinations};
}
