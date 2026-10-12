// Research reconstruction authored for this study from observed shipped behavior.
// See LICENSE.md and THIRD_PARTY_NOTICES.md for the n8n-derived project terms.
const selectedIntersection=(a,b)=>new Set([...a].filter(value=>b.has(value)));
const selectedDifference=(a,b)=>new Set([...a].filter(value=>!b.has(value)));
function outgoingMain(id,adjacency,ignoreSelf=false){return new Set([...(adjacency.get(id) || [])].filter(edge=>edge.type==='main' && (!ignoreSelf || edge.node!==id)).map(edge=>edge.node));}
export function buildAdjacencyList(connections){
  const adjacency=new Map();
  for(const source of Object.keys(connections))for(const kind of Object.keys(connections[source]))for(const bank of Object.keys(connections[source][kind])){
    const list=connections[source][kind][parseInt(bank,10)] || [];
    for(const index of Object.keys(list)){
      const edge=list[parseInt(index,10)];
      if(!edge)continue;
      if(!adjacency.has(source))adjacency.set(source,new Set());
      adjacency.get(source).add(edge);
    }
  }
  return adjacency;
}
export function getInputEdges(selected,adjacency){const edges=[];for(const [source,targets]of adjacency)if(!selected.has(source))for(const edge of targets)if(selected.has(edge.node))edges.push([source,edge]);return edges;}
export function getOutputEdges(selected,adjacency){const edges=[];for(const [source,targets]of adjacency)if(selected.has(source))for(const edge of targets)if(!selected.has(edge.node))edges.push([source,edge]);return edges;}
export function getRootNodes(selected,adjacency){const roots=new Set(selected);for(const source of selected)for(const destination of outgoingMain(source,adjacency,true))roots.delete(destination);return roots;}
export function getLeafNodes(selected,adjacency){return new Set([...selected].filter(source=>selectedIntersection(outgoingMain(source,adjacency,true),selected).size===0));}
export function hasPath(start,end,adjacency){
  const pending=[start],visited=new Set();
  while(pending.length){const current=pending.pop();if(current===end)return true;visited.add(current);for(const next of outgoingMain(current,adjacency))if(!visited.has(next))pending.push(next);}
  return false;
}
export function parseExtractableSubgraphSelection(selected,adjacency){
  const inputs=new Set(getInputEdges(selected,adjacency).filter(([,edge])=>edge.type==='main').map(([,edge])=>edge.node));
  const outputs=new Set(getOutputEdges(selected,adjacency).filter(([,edge])=>edge.type==='main').map(([source])=>source));
  let roots=getRootNodes(selected,adjacency),leaves=getLeafNodes(selected,adjacency);
  if(roots.size===0 && inputs.size===1)roots=inputs;
  if(leaves.size===0 && outputs.size===1)leaves=outputs;
  const errors=[];
  for(const node of selectedDifference(inputs,roots))errors.push({errorCode:'Input Edge To Non-Root Node',node});
  const starts=selectedIntersection(roots,inputs);
  if(starts.size>1)errors.push({errorCode:'Multiple Input Nodes',nodes:starts});
  for(const node of selectedDifference(outputs,leaves))errors.push({errorCode:'Output Edge From Non-Leaf Node',node});
  const ends=selectedIntersection(leaves,outputs);
  if(ends.size>1)errors.push({errorCode:'Multiple Output Nodes',nodes:ends});
  const start=starts.values().next().value,end=ends.values().next().value;
  if(start && end && !hasPath(start,end,adjacency))errors.push({errorCode:'No Continuous Path From Root To Leaf In Selection',start,end});
  return errors.length ? errors : {start,end};
}
