import {validateScene,selectGroup} from './core.mjs';

// Source-assisted geometry contract from pinned Excalidraw 0.18.1 (MIT).
// Original helpers run only in verification, with separately disclosed adapters.
const axes=new Set(['x','y']),positions=new Set(['start','center','end']);
// Keep direct extrema: rebuilding an endpoint from a rounded width changes
// fractional distribution coordinates, including signed lines and freehand.
function box(shapes){const boxes=shapes.map(s=>{const xs=s.type==='freedraw'?s.points.map(p=>s.x+p[0]):[s.x,s.x+s.w],ys=s.type==='freedraw'?s.points.map(p=>s.y+p[1]):[s.y,s.y+s.h];return {minX:Math.min(...xs),minY:Math.min(...ys),maxX:Math.max(...xs),maxY:Math.max(...ys)};}),minX=Math.min(...boxes.map(b=>b.minX)),minY=Math.min(...boxes.map(b=>b.minY)),maxX=Math.max(...boxes.map(b=>b.maxX)),maxY=Math.max(...boxes.map(b=>b.maxY));return {minX,minY,maxX,maxY,midX:(minX+maxX)/2,midY:(minY+maxY)/2,width:maxX-minX,height:maxY-minY};}
function selection(scene,ids){
 if(!Array.isArray(ids)||ids.length>2000||ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)throw new Error('Select unique existing shape identifiers');
 const known=new Map(scene.shapes.map(s=>[s.id,s]));if(ids.some(id=>!known.has(id)))throw new Error('Selected shape no longer exists');
 const expanded=new Set(ids.flatMap(id=>selectGroup(scene.shapes,id))),selected=scene.shapes.filter(s=>expanded.has(s.id)),groupIds=new Set(selected.flatMap(s=>s.groupIds??[]));
 if(scene.excalidrawDocument){const editable=new Set(scene.excalidrawEditableIds);for(const e of scene.excalidrawDocument.elements){if(e.isDeleted)continue;if(!editable.has(e.id)&&(e.groupIds??[]).some(id=>groupIds.has(id)))throw new Error('This group contains preserved non-editable elements; layout is unavailable');if(expanded.has(e.id)&&e.boundElements?.length)throw new Error('This imported shape has external bindings; layout is unavailable');}}
 const units=new Map();for(const shape of selected){const id=shape.groupIds?.at(-1)??shape.id;if(!units.has(id))units.set(id,[]);units.get(id).push(shape);}return [...units.values()].map(shapes=>({shapes,box:box(shapes)}));
}
export function layoutSelection(input,ids,operation){
 if(!operation||!axes.has(operation.axis)||!['align','distribute'].includes(operation.kind)||operation.kind==='align'&&!positions.has(operation.position))throw new Error('Choose a valid alignment or distribution');
 const scene=validateScene(input),groups=selection(scene,ids);if(groups.length<2)return {scene,groupCount:groups.length,changedIds:[]};
 const all=box(groups.flatMap(g=>g.shapes)),axis=operation.axis,[start,mid,end,extent]=axis==='x'?['minX','midX','maxX','width']:['minY','midY','maxY','height'],moves=[];
 if(operation.kind==='align'){const key=operation.position==='start'?start:operation.position==='end'?end:mid;for(const g of groups)moves.push([g,all[key]-g.box[key]]);}
 else {
  groups.sort((a,b)=>a.box[mid]-b.box[mid]);const span=groups.reduce((n,g)=>n+g.box[extent],0),gap=(all[extent]-span)/(groups.length-1);
  if(gap<0){const first=groups.findIndex(g=>g.box[start]===all[start]),last=groups.findIndex(g=>g.box[end]===all[end]),step=(groups[last].box[mid]-groups[first].box[mid])/(groups.length-1);let cursor=groups[first].box[mid];for(let i=0;i<groups.length;i++){const g=groups[i];if(i===first||i===last)moves.push([g,0]);else{cursor+=step;moves.push([g,cursor-g.box[mid]]);}}}
  else {let cursor=all[start];for(const g of groups){moves.push([g,cursor-g.box[start]]);cursor+=gap;cursor+=g.box[extent];}}
 }
 const changedIds=[];for(const [g,offset] of moves)for(const shape of g.shapes){const next=shape[axis]+offset;if(next!==shape[axis]){if(operation.kind==='distribute'){shape.x+=axis==='x'?offset:0;shape.y+=axis==='y'?offset:0;}else shape[axis]=next;changedIds.push(shape.id);}}
 return {scene:validateScene(scene),groupCount:groups.length,changedIds};
}
