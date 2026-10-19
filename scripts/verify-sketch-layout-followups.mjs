// Pure source/evidence identity proof. No app runtime, oracle, HTTP or browser imports.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {parsePinnedDataset} from './sketch-layout-proof/public-proof-loader.mjs';
import {hash,authenticateBytes,safeRelative,verifyDataset,filesystemReader} from './sketch-layout-proof/proof-verifier.mjs';
import {createNotes41PublicationSourceViewFromRoot} from './notes41-publication-source-view.mjs';

export const proofIdentity = Object.freeze({
  dataset:'5ab5d2fdbea33dc3712c66050a47097170caef5bed7e7bf8fd22bc1637efffc7',
  verifier:'8116090c18432303df8b6fcb6f0e7ca7d6f6b811ebab9d1ef37090bdfc3d96f5',
  loader:'35fdaf67acd3b223c6f46419189a249c9a9b36d82e10065df2292615b4b74045',
  reviewManifest:'dd196558e07a7568d0424dff0a610a1b18627d0bee0b56c0cbbaad90f6f080c7'
});
const reviewPrefix='products/rea-studio/results/sketch-layout-reviewed-installation-20261013/source-plan-independent-review/frozen';

// This reader is local to one independently pinned Sketch dataset. Its sole
// projection is the dataset's old shared-host row. Alias paths and every other
// current10 row still use their original physical filesystem reader.
const SKETCH_DATASET_HOST = 'products/rea-studio/server.mjs';
function namedHistoricalSketchDatasetReader(dataset,physicalReader,sourceView) {
  assert.equal(dataset.current.length,10);
  const host=dataset.current.filter(row=>row.path===SKETCH_DATASET_HOST);assert.equal(host.length,1);
  assert.deepEqual({bytes:host[0].bytes,sha256:host[0].sha256},{bytes:7840,sha256:'85fe09b1b52a1d91e9d09c85d99c6e768ac4b793f5d7694a1760a4c0560a0a94'});
  const sourceProof=sourceView.summary();assert.equal(sourceProof.currentRows,126);assert.equal(sourceProof.supportingSources,60);assert.equal(sourceProof.sketchSupportingSources,11);assert.equal(sourceProof.totalSupportingSources,71);assert.equal(sourceProof.historicalRecordReaderRows,10);assert.equal(sourceProof.authenticatedDataRows,145);
  const actualCurrentRows=dataset.current.map(row=>{
    const pin=sourceView.plan.currentSourceRows.find(pin=>pin.path===row.path);assert(pin,'Every selected Sketch current source is separately mandatory: '+row.path);
    authenticateBytes(sourceView.sourceRead(row.path),pin);
    if(row.path!==SKETCH_DATASET_HOST)assert.deepEqual({bytes:pin.bytes,sha256:pin.sha256},{bytes:row.bytes,sha256:row.sha256});
    return {path:pin.path,bytes:pin.bytes,sha256:pin.sha256};
  });
  const actualHost=actualCurrentRows.find(row=>row.path===SKETCH_DATASET_HOST),carrier=sourceView.historicalReadPath(SKETCH_DATASET_HOST,host[0]);
  assert.notEqual(carrier,SKETCH_DATASET_HOST);
  return {
    list:physicalReader.list.bind(physicalReader),
    read:async name=>{
      if(name!==SKETCH_DATASET_HOST)return physicalReader.read(name);
      // Both physical channels are actually consumed. A historical carrier can
      // never mask a changed current host from this named dataset operation.
      authenticateBytes(await physicalReader.read(name),actualHost);
      authenticateBytes(sourceView.sourceRead(name),actualHost);
      assert.equal(sourceView.historicalReadPath(name,host[0]),carrier);
      const bytes=await physicalReader.read(carrier);authenticateBytes(bytes,host[0]);return bytes;
    },
    projection:{schema:'rea-sketch-fixed-dataset-historical-host-projection/v1',datasetSHA256:proofIdentity.dataset,logicalPath:SKETCH_DATASET_HOST,declaredHistoricalIdentity:{bytes:host[0].bytes,sha256:host[0].sha256},physicalCarrier:carrier,physicalCarrierSourceEpoch:sourceView.plan.oldNotes36Source,actualCurrentRows,actualCurrentSelectedSourceRows:10,historicalDatasetSourceRows:10,historicalHostRows:1,otherSelectedSourceRowsUnchanged:9,actualCurrentSourcesAuthenticatedSeparately:true,actualInstalledAtHistoricalIdentityClaimed:false,sourceOverlay:false,historicalReceiptRebound:false,currentBehaviorAcceptanceClaimed:false},
  };
}

export async function verifySketchLayoutFollowups({repoRoot=path.resolve(import.meta.dirname,'..')}={}) {
  const started=new Date().toISOString(),physicalReader=filesystemReader(repoRoot),sourceView=createNotes41PublicationSourceViewFromRoot(repoRoot);
  for(const[name,pin]of [['proof-verifier.mjs',proofIdentity.verifier],['public-proof-loader.mjs',proofIdentity.loader]])
    assert.equal(hash(await fs.readFile(new URL('./sketch-layout-proof/'+name,import.meta.url))),pin,'Exact independent proof module '+name);
  const datasetBytes=await physicalReader.read(reviewPrefix+'/proof-dataset.json.snapshot'),dataset=parsePinnedDataset(datasetBytes,proofIdentity.dataset);
  const reader=namedHistoricalSketchDatasetReader(dataset,physicalReader,sourceView);
  // Authenticate the complete separate independent review; never resolve original paths against live files.
  const reviewManifestBytes=await reader.read(reviewPrefix+'/freeze-manifest.json.snapshot');assert.equal(hash(reviewManifestBytes),proofIdentity.reviewManifest);
  const reviewManifest=JSON.parse(reviewManifestBytes);assert.equal(reviewManifest.schema,'rea-sketch-layout-independent-source-plan-review-freeze/v1');assert.equal(reviewManifest.inventory.length,44);
  const reviewPaths=[];
  for(const r of reviewManifest.inventory){safeRelative(r.path);const p=reviewPrefix+'/'+r.path+'.snapshot';authenticateBytes(await reader.read(p),r);reviewPaths.push(p);}
  reviewPaths.push(reviewPrefix+'/freeze-manifest.json.snapshot');assert.equal(new Set(reviewPaths).size,45);assert.deepEqual((await reader.list(reviewPrefix)).sort(),reviewPaths.sort(),'Strict public independent-review45 prefix');
  // The fixed historical dataset keeps all ten selected source assertions.
  // Actual current126 sources are authenticated separately; one old host row is projected.
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
  const sourceProjectionControls=[];
  const historicalHost=dataset.current.find(row=>row.path===SKETCH_DATASET_HOST);
  authenticateBytes(await reader.read(SKETCH_DATASET_HOST),historicalHost);
  sourceProjectionControls.push({name:'positive-fixed-dataset-host-and-real-current-source-channels',expected:'acceptance',passed:true});
  for(const [label,target]of [['actual-current-host',SKETCH_DATASET_HOST],['historical-physical-host-carrier',reader.projection.physicalCarrier]]){
    let mutationHits=0;const owned=namedHistoricalSketchDatasetReader(dataset,{list:physicalReader.list,read:async name=>{const bytes=await physicalReader.read(name);if(name!==target)return bytes;mutationHits++;const changed=Buffer.from(bytes);assert(changed.length);changed[0]^=1;return changed;}},sourceView);
    let error=null;try{await owned.read(SKETCH_DATASET_HOST);}catch(caught){error=caught;}
    assert(error,'Named Sketch source mutation accepted: '+label);assert(mutationHits>0,'The intended named Sketch physical source mutation must be consumed: '+target);assert(String(error.message).includes(SKETCH_DATASET_HOST),'Named Sketch mutation must fail at its exact host byte assertion: '+label);
    sourceProjectionControls.push({name:'reject-'+label+'-byte-mutation',expected:'rejection',passed:true,target});
  }
  assert.equal(sourceProjectionControls.filter(row=>row.expected==='acceptance').length,1);assert.equal(sourceProjectionControls.filter(row=>row.expected==='rejection').length,2);
  // Keep the actual source interval stable after all metadata controls.
  const after=await verifyDataset(dataset,reader);assert.deepEqual(after,actual);for(const r of reviewManifest.inventory)authenticateBytes(await reader.read(reviewPrefix+'/'+r.path+'.snapshot'),r);assert.equal(hash(await reader.read(reviewPrefix+'/freeze-manifest.json.snapshot')),proofIdentity.reviewManifest);assert.equal(hash(await reader.read(reviewPrefix+'/proof-dataset.json.snapshot')),proofIdentity.dataset);
  sourceView.recheck();
  return {schema:'rea-sketch-layout-installed-source-proof/v2',started,finished:new Date().toISOString(),sourceOnly:true,
    coreAliases832:actual.aliasFiles,separateIndependentReview45:reviewPaths.length,totalHistoricalAliases877:actual.aliasFiles+reviewPaths.length,
    current10Mandatory:actual.currentFiles,strictCorePrefixes7:actual.strictPrefixes,separateReviewPrefixStrict:true,
    identities:proofIdentity,negativeMetadataControls8:negatives,sourceBeforeAfterStable:true,
    actualInstalledByteVerification:false,current10HistoricalDatasetMandatory:true,actualCurrentSourcesAuthenticatedSeparately:true,historicalSourceProjection:reader.projection,sourceProjectionControls:{positive:1,negative:2,observations:sourceProjectionControls},currentSourceProof:sourceView.summary(),newApplicationCalls:0,newHTTPCalls:0,newBrowserCalls:0,newOriginalCalls:0,newBehaviorTests:0,
    actualDownloadFileAcceptance:false,privateBrowserHostNotRelabeledRootHost:true,fullParity:false,superiority:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const i=process.argv.indexOf('--repo'),repoRoot=i===-1?path.resolve(import.meta.dirname,'..'):path.resolve(process.argv[i+1]??'');
  console.log(JSON.stringify(await verifySketchLayoutFollowups({repoRoot})));
}
