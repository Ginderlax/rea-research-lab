import assert from 'node:assert/strict';
import { readFileSync, readdirSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

const prefix = 'products/rea-studio/apps/notes/results/inline-confirmation-followup/';
const addendum = prefix + 'browser-publication-plan/frozen/';
const qualification = prefix + 'browser-qualification-correction/frozen/';
const sha = b => createHash('sha256').update(b).digest('hex');
const replacements = {'.local':'private-study-records',work:'workspace-records',artifacts:'source-material',tooling:'verification-tool-source',node_modules:'dependency-source'};
const epochPins = [
 ['author-inline','notes-inline-confirmation-next','freeze-manifest.json',214,'347ff80e93076df92144915e16257f92ff7910a78ea175be840b8d3fd829dc16'],
 ['independent-negative','notes-inline-confirmation-independent-review','review-manifest.json',74,'bb46812480086025a87028ac8dddc102e6548fc9bd57410fa10de67a28ce3322'],
 ['author-cancel-correction','notes-inline-cancel-no-read-next','freeze-manifest.json',229,'5fcb71d9abddbbc6d0077da9cbbe0808b7be5ff4d66ce94a747f311ab6a3d7bb'],
 ['independent-cancel-acceptance','notes-inline-cancel-no-read-independent-review','review-manifest.json',49,'dc5263f7197b2004f839ff53a9e2fceb96c265ae85002f9f9f2151fd38235198'],
 ['prior-installation34','notes-vault-production-installation','freeze-manifest.json',7,'c4bba0db1afc6fb87f9290bec2117d2b483d831751cd72c89f48946b444d3d4c'],
 ['prior-source-only-plan','notes-inline-publication-plan-next','freeze-manifest.json',162,'ab0bccd1aaf43da7b932193a0991531659b2e5017b72c28933b37bcc7ddcf3ae'],
 ['corrected-browser','notes-inline-cancel-no-read-browser-next','freeze-manifest.json',87,'402425b29671175caecf368661b21987205087d5fdef3025c06323f94029acfb'],
];
function safe(p, publicPath=true) {
 assert.ok(typeof p==='string' && p.length>0 && p.length<=4096 && !/[\\:\x00-\x1f\x7f]/.test(p) && !p.startsWith('/'), 'Unsafe proof path');
 for(const s of p.split('/')) {assert.ok(s && s!=='.' && s!=='..', 'Unsafe proof segment');if(publicPath)assert.ok(!Object.hasOwn(replacements,s),'Local/source directory in public path');}
 return p;
}
function identity(r) {assert.ok(r && Number.isSafeInteger(r.bytes) && r.bytes>=0 && r.bytes<=32*1024*1024);assert.match(r.sha256,/^[0-9a-f]{64}$/);return r;}
function same(a,b,label='proof') {identity(a);identity(b);assert.equal(a.bytes,b.bytes,label+' bytes');assert.equal(a.sha256,b.sha256,label+' SHA256');}
function rows(m) {
 const result = Array.isArray(m.records)?m.records:Object.entries(m.inventory??{}).map(([path,r])=>({path,...r}));
 assert.ok(result.length>0 && result.length<=1200);const seen=new Set();
 for(const r of result){safe(r.path,false);identity(r);assert.ok(!seen.has(r.path),'Duplicate manifest path');seen.add(r.path);}return result;
}
function carrier(b) {
 const h=b.subarray(0,8).toString('hex');for(const x of ['4d5a','7f454c46','504b0304','504b0506','504b0708','1f8b','377abcaf271c','fd377a585a00','28b52ffd','03d9a29a'])assert.ok(!h.startsWith(x),'Native/archive leading bytes');
 assert.notEqual(b.subarray(257,262).toString(),'ustar','TAR carrier in public proof');
}
function publicLocation(epoch, p) {safe(epoch,false);safe(p,false);return safe(prefix+epoch+'/'+p.split('/').map(s=>replacements[s]??s).join('/')+'.snapshot');}
function key(r) {return r.epoch+'\0'+r.sourcePath;}
function reader(root,onFile) {
 const base=realpathSync(resolve(root)),seen=new Map();let total=0;
 function location(p){safe(p);let current=base;for(const s of p.split('/')){current=resolve(current,s);assert.equal(lstatSync(current).isSymbolicLink(),false,'Symlink/reparse proof path');}const real=realpathSync(current),r=relative(base,real);assert.ok(r && r!=='..' && !r.startsWith('..'+sep) && !r.startsWith(sep),'Escaping proof path');return current;}
 function read(p, expected, inert=false){const at=location(p),stat=lstatSync(at);assert.ok(stat.isFile() && stat.size<=32*1024*1024);const b=readFileSync(at),id={bytes:b.length,sha256:sha(b)};assert.equal(b.length,stat.size);if(expected)same(id,expected,p);
  if(seen.has(p))same(id,seen.get(p),'Changed during verification: '+p);else{seen.set(p,id);total+=b.length;assert.ok(seen.size<=5000 && total<=512*1024*1024);onFile?.({path:p,...id});}if(inert)carrier(b);return b;}
 function json(p,expected){return JSON.parse(read(p,expected,true));}
 function finish(){for(const [p,id]of seen)read(p,id);return {authenticatedFiles:seen.size,authenticatedBytes:total};}
 return {read,json,finish,base};
}

export const assertNotesInlinePublicPath=p=>safe(p);
export function assertNotesInlineInertBytes(b){assert.ok(Buffer.isBuffer(b)&&b.length<=32*1024*1024);carrier(b);}

/** Pure source-only metadata projection. Exactly12 qualification fields may change;
 * no byte identity, path, original image scope or acceptance count is rebound.
 */
export function applyNotesInlineQualificationOverrides(baseBytes,override) {
 assert.ok(Buffer.isBuffer(baseBytes)&&baseBytes.length<=2*1024*1024);assert.equal(sha(baseBytes),'ec5839d46fd9ff16e0e752bfac86b850689731b0bfa6a9fb87ffd4d4aaa8c2d7');
 assert.equal(override.schema,'rea-notes-corrected-browser-qualification-overrides/v1');assert.equal(override.baseMap.sha256,sha(baseBytes));assert.equal(override.baseMap.bytes,baseBytes.length);assert.equal(override.rows.length,12);
 const base=JSON.parse(baseBytes),corrected=structuredClone(base),seen=new Set();
 for(const r of override.rows){assert.equal(r.changedField,'qualification');assert.equal(r.epoch,'corrected-browser');assert.equal(r.sourceRoot,'work/notes-inline-cancel-no-read-browser-next');assert.ok(!seen.has(r.publicPath));seen.add(r.publicPath);const original=base.payload.find(x=>x.publicPath===r.publicPath),after=corrected.payload.find(x=>x.publicPath===r.publicPath);assert.ok(original&&after);assert.deepEqual(r.before,original);assert.equal(original.actualMediaType,'image/jpeg');assert.equal(original.originalFilenameExtensionMismatch,true);for(const k of ['epoch','sourceRoot','sourcePath','publicPath','bytes','sha256'])assert.deepEqual(r[k],original[k]);assert.equal(typeof r.after.qualification,'string');assert.ok(r.after.qualification.length>0&&r.after.qualification!==original.qualification);assert.deepEqual({...r.after,qualification:original.qualification},original);assert.equal(r.originalWrongQualification,original.qualification);after.qualification=r.after.qualification;}
 assert.deepEqual([...seen].sort(),base.payload.filter(r=>r.epoch==='corrected-browser'&&r.actualMediaType==='image/jpeg').map(r=>r.publicPath).sort());
 for(let i=0;i<base.payload.length;i++){const a=base.payload[i],b=corrected.payload[i];assert.deepEqual(seen.has(a.publicPath)?{...b,qualification:a.qualification}:b,a);}assert.deepEqual({...corrected,payload:base.payload},base);return corrected;
}

/** Read-only public evidence authentication. No application/original imports, runtime/GUI,
 * native fixture, private work directory or network dependency. Source reads are bounded;
 * this does not claim hard I/O deadlines or a race-free filesystem sandbox.
 * requireCurrent=false authenticates immutable proposals only, never installed acceptance.
 */
export function verifyNotesInlineFollowups(root,{requireCurrent=true,onFile}={}) {
 assert.equal(typeof requireCurrent,'boolean');const io=reader(root,onFile),read=io.read,json=io.json;
 const manifestBytes=read(addendum+'freeze-manifest.json.snapshot');assert.equal(sha(manifestBytes),'697af388815ed18acacdfebf69dd58eb6ddb601c84722e0ba2185401afaa9aff');
 const frozen=JSON.parse(manifestBytes),addRows=rows(frozen);assert.equal(frozen.schema,'rea-notes-inline-browser-publication-addendum-freeze/v1');assert.equal(addRows.length,17);assert.equal(frozen.files,17);
 for(const r of addRows)read(addendum+r.path+'.snapshot',r,true);
 const map=json(addendum+'public-preservation-map.json.snapshot');assert.equal(sha(read(addendum+'public-preservation-map.json.snapshot')),'ec5839d46fd9ff16e0e752bfac86b850689731b0bfa6a9fb87ffd4d4aaa8c2d7');
 const excluded=json(addendum+'local-exclusions.json.snapshot').excluded;assert.equal(map.inputPathRecords,829);assert.equal(map.payload.length,818);assert.equal(excluded.length,11);assert.equal(map.uniqueByteObjects,330);
 const inputs=new Map(),publics=new Map(),expectedAliases=new Set([addendum+'freeze-manifest.json.snapshot',...addRows.map(r=>addendum+r.path+'.snapshot')]);
 for(const r of [...map.payload,...excluded]){identity(r);safe(r.sourcePath,false);assert.ok(!inputs.has(key(r)),'Duplicate source-map row');inputs.set(key(r),r);}
 for(const r of map.payload){assert.equal(r.publishable,true);assert.equal(r.inertExact,true);assert.equal(r.publicPath,publicLocation(r.epoch,r.sourcePath));assert.ok(!publics.has(r.publicPath));publics.set(r.publicPath,r);expectedAliases.add(r.publicPath);read(r.publicPath,r,true);}
 assert.equal(new Set(map.payload.map(r=>r.sha256)).size,330);assert.equal(expectedAliases.size,836);
 const qualificationManifestBytes=read(qualification+'freeze-manifest.json.snapshot');assert.equal(sha(qualificationManifestBytes),'913cfe7fbd41c638a624483deca1713c8fb4df44e56d65a0f3fe6458b606cf0a');const qualificationManifest=JSON.parse(qualificationManifestBytes),qualificationRows=rows(qualificationManifest);assert.equal(qualificationManifest.schema,'rea-notes-browser-qualification-correction-strict-freeze/v1');assert.equal(qualificationRows.length,31);assert.equal(qualificationManifest.files,31);expectedAliases.add(qualification+'freeze-manifest.json.snapshot');for(const r of qualificationRows){const p=qualification+r.path+'.snapshot';read(p,r,true);expectedAliases.add(p);}assert.equal(expectedAliases.size,868);
 const overrideBytes=read(qualification+'qualification-overrides.json.snapshot');assert.equal(sha(overrideBytes),'50a6f287e52f68c73988a487e2e045e4e0b1652d8ac5c8d9a2804d8e9f872804');const override=JSON.parse(overrideBytes),correctedMap=applyNotesInlineQualificationOverrides(read(addendum+'public-preservation-map.json.snapshot'),override);const correctedBytes=read(qualification+'public-preservation-map.corrected.json.snapshot');assert.equal(sha(correctedBytes),'48d1677a8a5b4faa80102caadd61f072c6cc90efd1e60b79a31ea1d21d1e3e66');assert.deepEqual(JSON.parse(correctedBytes),correctedMap);
 assert.equal(map.epochs.length,7);let payloadTotal=0;
 const groups=[];
 for(const pin of epochPins){const [epoch,directory,name,count,digest]=pin,e=map.epochs.find(r=>r.id===epoch);assert.ok(e);assert.equal(e.directory,directory);assert.equal(e.manifest,name);assert.equal(e.payloadFiles,count);assert.equal(e.manifestIdentity.sha256,digest);
  const mb=read(publicLocation(epoch,name),e.manifestIdentity,true);assert.equal(sha(mb),digest);const m=JSON.parse(mb),rs=rows(m);assert.equal(m.schema,e.schema);assert.equal(rs.length,count);if(m.files!==undefined)assert.equal(m.files,count);const sourceRoot='work/'+directory;const actual=rs.map(r=>({epoch,sourceRoot,sourcePath:r.path,...identity(r)}));actual.push({epoch,sourceRoot,sourcePath:name,...e.manifestIdentity});
  assert.deepEqual([...inputs.values()].filter(r=>r.epoch===epoch).map(r=>r.sourcePath).sort(),actual.map(r=>r.sourcePath).sort());
  for(const r of actual){const a=inputs.get(key(r));assert.ok(a);assert.equal(a.sourceRoot,sourceRoot);same(a,r,key(r));if(a.publishable)read(a.publicPath,r,true);}
  const bytes=rs.reduce((n,r)=>n+r.bytes,0);assert.equal(bytes,e.payloadBytes);if(m.bytes!==undefined||m.totalBytes!==undefined)assert.equal(bytes,m.bytes??m.totalBytes);payloadTotal+=count;groups.push({epoch,payloadFiles:count,manifestSHA256:digest});
 }
 assert.equal(payloadTotal,822);assert.equal(payloadTotal+epochPins.length,829);
 const archives=excluded.filter(r=>r.kind==='TAR'),attachments=excluded.filter(r=>r.kind==='owned-generated-attachment-fixture');assert.equal(archives.length,9);assert.equal(attachments.length,2);
 for(const r of archives){assert.equal(r.publishable,false);assert.equal(r.localRetained,true);assert.equal(r.bytes,9728);assert.equal(r.sha256,'044885c906ba7d8cb97a95fbdd6bc2323ba31a3c301e7ed1d6e592acec8944af');}
 for(const r of attachments){assert.equal(r.publishable,false);assert.equal(r.localRetained,true);assert.equal(r.epoch,'corrected-browser');assert.ok(['owned-attachment.txt','downloaded-attachment.txt'].includes(r.sourcePath));assert.equal(r.bytes,63);assert.equal(r.sha256,'055503b5030e894c9ceaf9b0cd8feb8039569526fe720dc937442be4a82867f3');}
 // Local carrier hashes remain authoritative records; anonymous verification never reads them.
 function walk(p,depth=0,out=[]){assert.ok(depth<=40 && out.length<=1000);for(const e of readdirSync(resolve(io.base,p),{withFileTypes:true})){safe(e.name);assert.equal(e.isSymbolicLink(),false);const at=p+e.name;if(e.isDirectory())walk(at+'/',depth+1,out);else {assert.ok(e.isFile());out.push(at);}}return out;}
 assert.deepEqual(walk(prefix).sort(),[...expectedAliases].sort(),'Strict public868 alias census');
 function source(epoch,p){const r=inputs.get(epoch+'\0'+p);assert.ok(r && r.publishable,'Public source alias missing');return read(r.publicPath,r,true);}
 const planJSON=p=>JSON.parse(source('prior-source-only-plan',p));
 const proposals=planJSON('live-copy-list.json').proposals,before=planJSON('installation-before34.json'),mapping=planJSON('historical34-current-replacement-map.json');
 assert.equal(proposals.length,8);assert.equal(new Set(proposals.map(r=>r.destination)).size,8);assert.equal(proposals.filter(r=>r.before).length,6);assert.equal(proposals.filter(r=>!r.before).length,2);assert.equal(proposals.filter(r=>r.runtime).length,1);assert.equal(before.length,34);assert.equal(mapping.rows.length,34);assert.equal(mapping.historicalBytesRemainRequired,true);
 const historical=JSON.parse(source('prior-installation34','installation.json')).installed;assert.equal(historical.length,34);const historicalResolver=new Map();
 for(const r of before){const old=historical.find(x=>x.destination===r.path),m=mapping.rows.find(x=>x.destination===r.path);assert.ok(old&&m);same(r,old.after,r.path);same(m.historicalAfter,r,r.path);const image=inputs.get('prior-source-only-plan\0'+r.snapshot);assert.ok(image?.publishable);read(image.publicPath,r,true);const p=proposals.find(x=>x.destination===r.path),expected=p?.after??r;same(m.currentExpected,expected,r.path);assert.equal(m.mode,p?'explicit-later-replacement':'retain-historical-installed-bytes');if(requireCurrent)read(r.path,expected);historicalResolver.set(r.path,{historicalPath:image.publicPath,historicalIdentity:{bytes:r.bytes,sha256:r.sha256},currentExpected:{bytes:expected.bytes,sha256:expected.sha256},mode:m.mode});}
 assert.equal(mapping.rows.filter(r=>r.mode==='explicit-later-replacement').length,6);assert.deepEqual(mapping.newDestinations,proposals.filter(r=>!r.before));
 for(const r of proposals){safe(r.destination);assert.ok(r.destination.startsWith('products/rea-studio/apps/notes/'));assert.equal(r.destination,r.sourcePath);assert.equal(r.sourceRoot,'work/notes-inline-cancel-no-read-next');assert.equal(r.backendChange,false);same(r.sourceIdentity,r.after,r.destination);const candidate=source('author-cancel-correction',r.sourcePath),copy=source('prior-source-only-plan',r.proposalPath);same({bytes:candidate.length,sha256:sha(candidate)},r.after,r.destination);assert.ok(candidate.equals(copy));if(requireCurrent)read(r.destination,r.after);const b=before.find(b=>b.path===r.destination);assert.equal(r.action,b?'replace-exact':'add-exact');if(b)same(r.before,b,r.destination);else assert.equal(r.before,null);}
 const correction=planJSON('correction-reconstruction.json');assert.equal(correction.transforms.length,2);let reconstructed=source('author-inline',correction.source).toString();same({bytes:Buffer.byteLength(reconstructed),sha256:sha(Buffer.from(reconstructed))},correction.before,'original inline source');for(const t of correction.transforms){assert.equal(reconstructed.split(t.before).length-1,1);reconstructed=reconstructed.replace(t.before,t.after);}same({bytes:Buffer.byteLength(reconstructed),sha256:sha(Buffer.from(reconstructed))},correction.after,'two substitutions');assert.equal(reconstructed,source('author-cancel-correction',correction.source).toString());
 const optional=planJSON('optional-review-path-adapters.json');assert.equal(optional.records.length,4);assert.equal(optional.behaviorExecuted,false);assert.equal(optional.automaticInstallation,false);for(const r of optional.records){let s=source('independent-cancel-acceptance',r.sourcePath).toString();same({bytes:Buffer.byteLength(s),sha256:sha(Buffer.from(s))},r.sourceIdentity,'optional before');for(const t of r.replacements){let count=0;s=s.split(/(?<=\n)/).map(line=>{if(!line.includes(t.from))return line;assert.match(line,/^import\s/);count+=line.split(t.from).length-1;return line.split(t.from).join(t.to);}).join('');assert.equal(count,t.occurrences);}same({bytes:Buffer.byteLength(s),sha256:sha(Buffer.from(s))},r.proposedIdentity,'optional after');assert.equal(s,source('prior-source-only-plan',r.proposalPath).toString());}
 const pairs=JSON.parse(source('prior-source-only-plan','historical-four-user-action-adapters.json.snapshot'));assert.equal(pairs.length,4);for(const r of pairs){assert.equal(sha(Buffer.from(r.before)),r.beforeSha256);assert.equal(sha(Buffer.from(r.after)),r.afterSha256);}
 const licensing=planJSON('license-source-provenance.json');assert.equal(licensing.license,'AGPL-3.0-or-later');assert.equal(licensing.commit,'7e2765a3857754d12dbadea442b60ceaf9d4b23d');assert.equal(licensing.sourcePrerequisites31.length,31);for(const r of licensing.sourcePrerequisites31)read(r.path,r,true);assert.match(read(licensing.licenseNotice.path,licensing.licenseNotice).toString(),/AGPL-3\.0-or-later/);assert.equal(licensing.noticesOfMissingAncestorLicenseFiles.length,4);for(const r of licensing.noticesOfMissingAncestorLicenseFiles){assert.equal(r.status,404);assert.equal(r.sha256,'d5558cd419c8d46bdc958064cb97f963d1ea793866414c025906ec15033512ed');}
 const alias=planJSON('current-notice-alias-reference.json');assert.equal(alias.bytes,543);read(alias.path,alias,true);read(alias.repair.path,alias.repair,true);assert.equal(alias.oldStageInventoryCountAltered,false);
 const req=planJSON('requirements-identity-reference.json');assert.equal(req.sourceIdentities159Unchanged,true);assert.equal(req.capabilityIds232Unchanged,true);let sourceCount=0;const capSet=new Set();for(const r of req.registries){const j=json(r.path),sources=j.sources.map(s=>({id:s.id,sha256:s.sha256})),ids=r.path.endsWith('system-products.json')?j.products.flatMap(p=>p.capabilities.map(c=>c.id)):r.path.endsWith('workspace-products.json')?j.capabilities.map(c=>c.id):j.baselineProducts.flatMap(p=>p.requirements.map(c=>c.id));assert.deepEqual(sources,r.sources);assert.deepEqual(ids,r.capabilityIDs);sourceCount+=sources.length;for(const id of ids)capSet.add(id);}assert.equal(sourceCount,159);assert.equal(capSet.size,232);
 const browser=JSON.parse(source('corrected-browser','validation.json'));assert.equal(sha(source('corrected-browser','validation.json')),'5d284a148316c6bac3a30999bf5fa8fe61f0c32e369e2430ab8238d083f1c8bc');assert.equal(browser.finiteBrowserAcceptance,true);assert.equal(browser.semanticGroups,8);assert.equal(browser.checks.length,8);assert.ok(browser.checks.every(r=>r.passed===true));assert.equal(browser.sourceFiles,12);assert.equal(browser.sourceStable,true);assert.equal(browser.clientSHA256,correction.after.sha256);assert.equal(browser.browserCampaigns,1);assert.equal(browser.browserSaveRequests,3);assert.equal(browser.notebookTrashRequests,1);assert.equal(browser.notebookRestoreRequests,1);assert.equal(browser.genuineCommittedHeldResponses,3);assert.equal(browser.cancellationAddedRequests,0);assert.equal(browser.attachment.browserUploadAcceptance,false);assert.equal(browser.attachment.permissionChanged,false);assert.equal(browser.attachment.browserDownloadedFileVerified,true);assert.equal(browser.attachment.downloadEventBridgeTimedOut,true);assert.equal(browser.hostClosed&&browser.relayClosed&&browser.tabCloseResolved&&browser.tempDataRemoved,true);for(const k of ['fullProductParity','securityEquivalence','superiority'])assert.equal(browser[k],false);
 const baselineValidation=planJSON('validation.json'),addonValidation=json(addendum+'validation.json.snapshot');assert.equal(baselineValidation.acceptance.correctedClientActualBrowser,false);assert.equal(addonValidation.oldFrozen162PendingBrowserClaimRetained,true);assert.equal(addonValidation.finiteIndependent22AndActualBrowser8Accepted,true);for(const k of ['wholeProductParity','securityEquivalence','superiority','productionInstalled'])assert.equal(addonValidation[k],false);
 const oldImages=map.payload.filter(r=>r.epoch==='independent-negative'&&r.actualMediaType),correctedImages=map.payload.filter(r=>r.epoch==='corrected-browser'&&r.actualMediaType);assert.equal(oldImages.length,6);assert.equal(correctedImages.length,12);for(const r of [...oldImages,...correctedImages]){assert.equal(r.actualMediaType,'image/jpeg');assert.equal(r.originalFilenameExtensionMismatch,true);assert.ok(read(r.publicPath,r).subarray(0,3).equals(Buffer.from('ffd8ff','hex')));}
 // Preserve the frozen erroneous qualification literally. Epoch and authenticated source
 // determine image scope; this explicit override never rebinds image bytes or old six images.
 const wrong='Historical exact author214 browser evidence only; not corrected-client browser acceptance. Preserve exact bytes and original filename even when its suffix mislabels JPEG.';assert.ok(correctedImages.every(r=>r.qualification===wrong));
 const imageScopeOverride={sourceMapSHA256:'ec5839d46fd9ff16e0e752bfac86b850689731b0bfa6a9fb87ffd4d4aaa8c2d7',overrideSHA256:'50a6f287e52f68c73988a487e2e045e4e0b1652d8ac5c8d9a2804d8e9f872804',manifestSHA256:'913cfe7fbd41c638a624483deca1713c8fb4df44e56d65a0f3fe6458b606cf0a',correctedMapSHA256:'48d1677a8a5b4faa80102caadd61f072c6cc90efd1e60b79a31ea1d21d1e3e66',explicitCorrectionAuthenticated:true,records:12,epoch:'corrected-browser',correctedClient:correction.after.sha256,oldSixImageScopeUnchanged:true,frozenTextPreserved:true};
 const result={sourceOnly:true,sourceStable:true,publicAliases:868,originalPublicAliases:836,qualificationCorrectionAliases:32,incomingPathRecords:829,publicMapRecords:818,excludedLocalCarriers:11,localCarriersRead:0,uniquePublicByteObjects:330,strictEpochs:groups,proposedFiles:8,historicalInstalled34:34,currentReplacementPaths:6,currentUnchangedPaths:28,newPaths:2,currentBytesChecked:requireCurrent,installedBehaviorAcceptance:false,sourceIDSHAPairs:159,capabilityIDs:232,sourcePrerequisites:31,noticeAliasBytes:543,browserEvidence:{groups:8,campaigns:1,uploadAccepted:false,downloadBridgeTimeout:true},imageScopeOverride,newApplicationExecutions:0,newOriginalExecutions:0,newBrowserExecutions:0,fullProductParity:false,securityEquivalence:false,superiority:false,...io.finish()};
 // Closure returns exact immutable identity data; current acceptance remains a separate run.
 const resolveHistorical=(destination,expected)=>{safe(destination);const r=historicalResolver.get(destination);if(!r)return undefined;same(expected,r.historicalIdentity,'Requested historical identity');return structuredClone(r);};
 return {...result,resolveHistorical};
}

/** Root's old34 verifier can create once, then authenticate historical bytes from these
 * narrow aliases while checking six explicit current identities and28 exact retained ones.
 * Two new destinations remain outside this historical mapping.
 */
export function createNotesInlineHistoricalResolver(root,options={}) {
 return verifyNotesInlineFollowups(root,options).resolveHistorical;
}
