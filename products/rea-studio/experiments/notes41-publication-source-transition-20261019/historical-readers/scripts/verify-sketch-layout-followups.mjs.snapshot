// Pure source/evidence identity proof. No app runtime, oracle, HTTP or browser imports.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {parsePinnedDataset} from './sketch-layout-proof/public-proof-loader.mjs';
import {hash,authenticateBytes,safeRelative,verifyDataset,filesystemReader} from './sketch-layout-proof/proof-verifier.mjs';

export const proofIdentity = Object.freeze({
  dataset:'5ab5d2fdbea33dc3712c66050a47097170caef5bed7e7bf8fd22bc1637efffc7',
  verifier:'8116090c18432303df8b6fcb6f0e7ca7d6f6b811ebab9d1ef37090bdfc3d96f5',
  loader:'35fdaf67acd3b223c6f46419189a249c9a9b36d82e10065df2292615b4b74045',
  reviewManifest:'dd196558e07a7568d0424dff0a610a1b18627d0bee0b56c0cbbaad90f6f080c7'
});
const reviewPrefix='products/rea-studio/results/sketch-layout-reviewed-installation-20261013/source-plan-independent-review/frozen';

export async function verifySketchLayoutFollowups({repoRoot=path.resolve(import.meta.dirname,'..')}={}) {
  const started=new Date().toISOString(),reader=filesystemReader(repoRoot);
  for(const[name,pin]of [['proof-verifier.mjs',proofIdentity.verifier],['public-proof-loader.mjs',proofIdentity.loader]])
    assert.equal(hash(await fs.readFile(new URL('./sketch-layout-proof/'+name,import.meta.url))),pin,'Exact independent proof module '+name);
  const datasetBytes=await reader.read(reviewPrefix+'/proof-dataset.json.snapshot'),dataset=parsePinnedDataset(datasetBytes,proofIdentity.dataset);
  // Authenticate the complete separate independent review; never resolve original paths against live files.
  const reviewManifestBytes=await reader.read(reviewPrefix+'/freeze-manifest.json.snapshot');assert.equal(hash(reviewManifestBytes),proofIdentity.reviewManifest);
  const reviewManifest=JSON.parse(reviewManifestBytes);assert.equal(reviewManifest.schema,'rea-sketch-layout-independent-source-plan-review-freeze/v1');assert.equal(reviewManifest.inventory.length,44);
  const reviewPaths=[];
  for(const r of reviewManifest.inventory){safeRelative(r.path);const p=reviewPrefix+'/'+r.path+'.snapshot';authenticateBytes(await reader.read(p),r);reviewPaths.push(p);}
  reviewPaths.push(reviewPrefix+'/freeze-manifest.json.snapshot');assert.equal(new Set(reviewPaths).size,45);assert.deepEqual((await reader.list(reviewPrefix)).sort(),reviewPaths.sort(),'Strict public independent-review45 prefix');
  // Current10 is always mandatory: eight app proposals plus actual host and route-test bytes.
  const actual=await verifyDataset(dataset,reader),bytes=new Map();for(const r of [...dataset.aliases,...dataset.current])bytes.set(r.path,await reader.read(r.path));
  const snapshotReader={read:async p=>{assert.ok(bytes.has(p),'Missing actual installed proof input '+p);return bytes.get(p);},list:async p=>[...bytes.keys()].filter(q=>q.startsWith(p+'/'))};
  const negatives=[];
  for(const[name,mutate]of [
    ['path traversal',d=>{d.aliases[0].path='../outside';}],
    ['duplicate alias',d=>{d.aliases[1].path=d.aliases[0].path;}],
    ['wrong source digest',d=>{d.aliases[0].sha256='0'.repeat(64);} ],
    ['wrong current digest',d=>{d.current[0].sha256='0'.repeat(64);} ],
    ['download scope promotion',d=>{d.downloadFileAccepted=true;}],
    ['prefix omission',d=>{d.prefixes.pop();}]
  ]) {const changed=structuredClone(dataset);mutate(changed);await assert.rejects(verifyDataset(changed,snapshotReader));negatives.push({name,rejected:true});}
  await assert.rejects(verifyDataset(dataset,{...snapshotReader,list:async p=>[...await snapshotReader.list(p),p+'/unmapped.snapshot']}));negatives.push({name:'unmapped extra alias',rejected:true});
  await assert.rejects(verifyDataset(dataset,{...snapshotReader,read:async p=>p===dataset.aliases[0].path?Buffer.alloc(0):snapshotReader.read(p)}));negatives.push({name:'missing/truncated alias',rejected:true});assert.equal(negatives.length,8);
  // Keep the actual source interval stable after all metadata controls.
  const after=await verifyDataset(dataset,reader);assert.deepEqual(after,actual);for(const r of reviewManifest.inventory)authenticateBytes(await reader.read(reviewPrefix+'/'+r.path+'.snapshot'),r);assert.equal(hash(await reader.read(reviewPrefix+'/freeze-manifest.json.snapshot')),proofIdentity.reviewManifest);assert.equal(hash(await reader.read(reviewPrefix+'/proof-dataset.json.snapshot')),proofIdentity.dataset);
  return {schema:'rea-sketch-layout-installed-source-proof/v1',started,finished:new Date().toISOString(),sourceOnly:true,
    coreAliases832:actual.aliasFiles,separateIndependentReview45:reviewPaths.length,totalHistoricalAliases877:actual.aliasFiles+reviewPaths.length,
    current10Mandatory:actual.currentFiles,strictCorePrefixes7:actual.strictPrefixes,separateReviewPrefixStrict:true,
    identities:proofIdentity,negativeMetadataControls8:negatives,sourceBeforeAfterStable:true,
    actualInstalledByteVerification:true,newApplicationCalls:0,newHTTPCalls:0,newBrowserCalls:0,newOriginalCalls:0,newBehaviorTests:0,
    actualDownloadFileAcceptance:false,privateBrowserHostNotRelabeledRootHost:true,fullParity:false,superiority:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const i=process.argv.indexOf('--repo'),repoRoot=i===-1?path.resolve(import.meta.dirname,'..'):path.resolve(process.argv[i+1]??'');
  console.log(JSON.stringify(await verifySketchLayoutFollowups({repoRoot})));
}
