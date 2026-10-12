// SPDX-License-Identifier: MIT
// Laboratory source revised 2026-10-12; see NOTICE.md for upstream attribution.
// Original implementation of the recovered public camera and version contracts.
export function viewportToScene(point,state){
 const scale=state.zoom.value;
 return {x:(point.clientX-state.offsetLeft)/scale-state.scrollX,y:(point.clientY-state.offsetTop)/scale-state.scrollY};
}
export function sceneToViewport(point,state){
 const scale=state.zoom.value;
 return {x:(point.sceneX+state.scrollX)*scale+state.offsetLeft,y:(point.sceneY+state.scrollY)*scale+state.offsetTop};
}
export function sceneVersion(elements){let total=0;for(const element of elements)total+=element.version;return total;}
export function versionFingerprint(elements){
 let state=5381;
 for(const element of elements)state=((state<<5)+state)+element.versionNonce;
 return state>>>0;
}
export function cameraInspection(scenePoint,state,elements){
 const viewport=sceneToViewport({sceneX:scenePoint.x,sceneY:scenePoint.y},state);
 const returned=viewportToScene({clientX:viewport.x,clientY:viewport.y},state);
 return {scenePoint,viewport,returned,sceneVersion:sceneVersion(elements),versionFingerprint:versionFingerprint(elements)};
}
