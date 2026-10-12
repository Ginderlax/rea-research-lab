// SPDX-License-Identifier: MIT
// Laboratory source revised 2026-10-12; see NOTICE.md for upstream attribution.
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import * as recovered from './reconstruction.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('./slice-manifest.json',import.meta.url),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),original={};
for(const entry of manifest.entries){const bytes=fs.readFileSync(new URL(entry.file,import.meta.url));if(sha(bytes)!==entry.fileSha256)throw Error('Chunk hash mismatch');const slice=bytes.subarray(entry.byteStart,entry.byteEnd);if(sha(slice)!==entry.sliceSha256)throw Error('Slice hash mismatch');original[entry.publicExport]=vm.runInNewContext('var '+slice.toString('utf8')+'; '+entry.local);}
const failures=[];let passed=0;const counts={coordinateCalls:0,versionCalls:0,roundTrips:0};
const normalize=p=>({x:p.x,y:p.y});
function compare(kind,label,a,b){counts[kind]++;if(isDeepStrictEqual(a,b))passed++;else failures.push({kind,label,original:a,reconstruction:b});}
let randomState=0x5eed1234;function random(){randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;}
for(let i=0;i<1500;i++){
 const state={zoom:{value:[0.1,0.5,1,1.25,2,5][i%6]},offsetLeft:Math.floor(random()*800)-400,offsetTop:Math.floor(random()*800)-400,scrollX:random()*1000-500,scrollY:random()*1000-500};
 const p={sceneX:random()*4000-2000,sceneY:random()*4000-2000},client={clientX:random()*1000,clientY:random()*1000};
 compare('coordinateCalls','forward-'+i,normalize(original.sceneCoordsToViewportCoords(p,state)),recovered.sceneToViewport(p,state));
 compare('coordinateCalls','inverse-'+i,normalize(original.viewportCoordsToSceneCoords(client,state)),recovered.viewportToScene(client,state));
 const rendered=recovered.sceneToViewport(p,state),back=recovered.viewportToScene({clientX:rendered.x,clientY:rendered.y},state);
 compare('roundTrips','round-trip-'+i,true,Math.abs(back.x-p.sceneX)<=1e-9&&Math.abs(back.y-p.sceneY)<=1e-9);
}
for(const zoom of [0,-1,Infinity,NaN]){const s={zoom:{value:zoom},offsetLeft:0,offsetTop:0,scrollX:0,scrollY:0};compare('coordinateCalls','out-of-domain zoom '+zoom,normalize(original.viewportCoordsToSceneCoords({clientX:1,clientY:0},s)),recovered.viewportToScene({clientX:1,clientY:0},s));}
for(let i=0;i<500;i++){const elements=Array.from({length:i%31},()=>({version:Math.floor(random()*100),versionNonce:(random()*0xffffffff)|0}));compare('versionCalls','sum-'+i,original.getSceneVersion(elements),recovered.sceneVersion(elements));compare('versionCalls','fingerprint-'+i,original.hashElementsVersion(elements),recovered.versionFingerprint(elements));}
const collisions={versionSum:recovered.sceneVersion([{version:2},{version:5}])===recovered.sceneVersion([{version:3},{version:4}]),fingerprintOrderSensitive:recovered.versionFingerprint([{versionNonce:1},{versionNonce:2}])!==recovered.versionFingerprint([{versionNonce:2},{versionNonce:1}])};
const result={testedAt:new Date().toISOString(),oracle:'Exact digest-verified production declarator bytes; original expressions evaluated in isolated VM; no React/bootstrap loaded.',seed:'0x5eed1234',counts,total:passed+failures.length,passed,failed:failures.length,failures,observations:collisions,scope:'Four public pure functions only; camera round-trip invariants apply to nonzero finite zoom. Version sums/fingerprints are not cryptographic scene identifiers.'};
const replayRoot=new URL('./artifacts/replays/',import.meta.url);fs.mkdirSync(replayRoot,{recursive:true});const replayDir=fs.mkdtempSync(new URL('test-',replayRoot));
fs.writeFileSync(replayDir+'/test-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));console.log('Replay saved to '+replayDir);if(failures.length)process.exitCode=1;
