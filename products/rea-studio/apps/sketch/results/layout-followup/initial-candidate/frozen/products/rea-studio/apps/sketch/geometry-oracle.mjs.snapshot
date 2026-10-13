// Test-only authenticated original helper loader. The canvas/runtime never imports this module.
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const appRoot=fileURLToPath(new URL('./',import.meta.url)),digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const originalPins={archive:'b280d4b364b65cba264c5aa4e7435cc2ce6421eabbbef9765a56997a0fadf534',bundle:'3cfe278cb537fde73b42bbd4697b392946517d3dc02d3f3cf8487d8476f63ba2',map:'3df41b92bd8c248f482c3d5b163349e02a506c6807a638a38ff722d7e4c98552'};
export const oracleDirectory=path.join(appRoot,'.local/original');
export const oraclePaths={archive:path.join(oracleDirectory,'package.tgz'),bundle:path.join(oracleDirectory,'bundle.js'),map:path.join(oracleDirectory,'source-map.json')};
export const oracleAvailable=()=>Object.values(oraclePaths).every(filename=>existsSync(filename));
export async function loadPinnedOriginal(){const values={};for(const[name,filename]of Object.entries(oraclePaths)){const before=await fs.lstat(filename);assert.ok(before.isFile()&&!before.isSymbolicLink());assert.ok(before.size<=(name==='archive'?40:4)*1024*1024);const bytes=await fs.readFile(filename);assert.equal(digest(bytes),originalPins[name],`Pinned original ${name} changed`);values[name]=bytes;}return{archiveBytes:values.archive,bundleBytes:values.bundle,mapBytes:values.map};}
export async function loadGeometryOracle(){const{bundleBytes}=await loadPinnedOriginal(),study=path.join(appRoot,'results/geometry-source-study/stage-source'),provenanceBytes=await fs.readFile(path.join(study,'source-provenance.json.snapshot'));assert.equal(digest(provenanceBytes),'a5013af1d1a3729f5404b0cfcb6d119708fca2058aee25c1141f2960aea02448');const provenance=JSON.parse(provenanceBytes),sources=[];for(const item of provenance.unchangedTestOnlyHelpers){const bytes=await fs.readFile(path.join(study,item.path+'.snapshot'));assert.equal(digest(bytes),item.sha256);assert.equal(digest(bundleBytes.subarray(item.byteStart,item.byteStart+item.byteLength)),item.sha256);sources.push(bytes.toString('utf8'));}const original=runInNewContext(sources.join('\n')+'\n({getDiamondPoints,getSizeFromPoints,getNormalizedDimensions,restoreElement,serializeAsJSON})',{window:{location:{origin:'https://excalidraw.com'}},DEFAULT_ELEMENT_PROPS:Object.freeze({})},{timeout:2000});const directCalls={getDiamondPoints:0,getSizeFromPoints:0,getNormalizedDimensions:0,restoreElement:0,serializeAsJSON:0},oracle={};for(const name of Object.keys(directCalls))oracle[name]=(...args)=>{directCalls[name]++;return original[name](...args);};return{oracle,directCalls,provenance};}
