// Hosted, read-only delivery diagnosis. No proof/product code is imported or run.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFileSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = 'scripts/audit-proof-delivery.mjs';
const WORKFLOW = '.github/workflows/proof-delivery-audit-cloud.yml';
const LIMIT = Object.freeze({ gitOutputBytes: 32*1024*1024, gitBlobs: 250000, manifests: 16000, manifestBytes: 192*1024*1024, singleManifestBytes: 8*1024*1024, declarations: 400000, nodesPerManifest: 100000, depth: 32, detailFileBytes: 4*1024*1024, reportBytes: 2*1024*1024, deadlineMs: 12*60*1000 });
const CANDIDATE_NAME = /(?:manifest|freeze|preservation|inventory|copy-list|publication-index|selected-file-map|public-existing-reuse|installation|records|source-proof|proof-dataset|file-map|public-[^/]*map)(?:[^/]*)\.json(?:\.snapshot)*$/i;
const HASH = /^[0-9a-f]{64}$/;
const sha = b => createHash('sha256').update(b).digest('hex');
const started = Date.now();
let output, terminal = false, filesWritten = new Map(), trees = new Map(), manifestCache = new Map(), contentCandidates = new Map();
const report = { schema: 'rea-hosted-proof-delivery-audit/v1', status: 'running', startedAt: new Date().toISOString(), scope: 'Git delivery of closed recognized public payload declarations; not payload authenticity or behavioral acceptance', candidateNamePattern: CANDIDATE_NAME.source, bounds: LIMIT, productExecutions: 0, proofVerifierExecutions: 0, checkoutWrites: 0, historicalReceiptsRewritten: false, fullDevelopmentSuiteAcceptance: false, payloadSHA256AuthenticationClaimed: false, coverageComplete: false, counts: { gitBlobs: 0, candidateManifests: 0, manifestBytes: 0, recognizedManifests: 0, embeddedLogicalManifests: 0, declarations: 0, gitPresent: 0, missingGit: 0, wrongGitMode: 0, declaredSizeMismatch: 0, existingClosedAliases: 0, unresolved: 0, excludedLogicalRows: 0 }, schemaCounts: {}, missingByPrefix: {}, errors: [] };

function safe(p) {
  assert(typeof p === 'string' && p.length > 0 && p.length <= 4096 && !/[\\:\x00-\x1f\x7f]/.test(p) && !p.startsWith('/'), 'Unsafe declaration path');
  assert(p.split('/').every(s => s && s !== '.' && s !== '..' && !/[. ]$/.test(s)), 'Noncanonical declaration path');
  return p;
}
function identity(r) { assert(r && Number.isSafeInteger(r.bytes) && r.bytes >= 0 && r.bytes <= 2**40 && HASH.test(r.sha256), 'Invalid byte/SHA declaration'); return { bytes: r.bytes, sha256: r.sha256 }; }
function timed() { assert(Date.now()-started <= LIMIT.deadlineMs, 'Audit deadline exceeded; coverage incomplete'); }
function git(args, maxBuffer=LIMIT.gitOutputBytes) {
  timed(); const r = spawnSync('git', ['-C', ROOT, ...args], { encoding: null, windowsHide: true, timeout: 45000, maxBuffer });
  assert(!r.error && r.status === 0, 'Git read failed: '+args[0]+': '+String(r.stderr??'').slice(0,1000)); return r.stdout;
}
function noLinks(p) {
  let at = ROOT; for (const part of safe(p).split('/')) { at=join(at,part); const st=lstatSync(at); assert(!st.isSymbolicLink(), 'Node-reported link in read path: '+p); }
  const st=lstatSync(at); assert(st.isFile(), 'Nonregular read path: '+p); return { at, st };
}
function trackedBytes(p, cap=LIMIT.singleManifestBytes) {
  safe(p); const row=trees.get(p); assert(row && ['100644','100755'].includes(row.mode), 'Required regular Git blob absent: '+p);
  assert(row.bytes <= cap, 'Read bound exceeded: '+p); const {at,st}=noLinks(p); assert(st.size === row.bytes, 'Working size differs from Git: '+p);
  const b=readFileSync(at); assert(b.length===row.bytes, 'Read size differs from Git: '+p);
  const oid=createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex'); assert.equal(oid,row.oid,'Working bytes differ from committed Git blob: '+p); return b;
}
function persist(name, value, exclusive=true) {
  assert(output); const b=Buffer.from(JSON.stringify(value,null,2)+'\n'); assert(b.length <= LIMIT.reportBytes, 'Report bound exceeded');
  writeFileSync(join(output,name),b,{flag:exclusive?'wx':'w'}); filesWritten.set(name,b.length);
}
function detail(name, value) {
  const line=JSON.stringify(value)+'\n', n=Buffer.byteLength(line), prior=filesWritten.get(name)??0;
  assert(prior+n <= LIMIT.detailFileBytes, 'Detailed report bound exceeded: '+name); appendFileSync(join(output,name),line,{flag:prior?'a':'wx'}); filesWritten.set(name,prior+n);
}
function event(kind, extra={}) { detail('events.jsonl',{at:new Date().toISOString(),kind,...extra}); }
function unresolved(manifest, schema, reason, extra={}) { report.counts.unresolved++; detail('unresolved.jsonl',{manifest,schema,reason,...extra}); }
function manifest(p) {
  if(manifestCache.has(p))return manifestCache.get(p);
  assert(manifestCache.size < LIMIT.manifests,'Manifest count bound exceeded'); const b=trackedBytes(p);
  report.counts.manifestBytes+=b.length; assert(report.counts.manifestBytes <= LIMIT.manifestBytes,'Manifest aggregate bound exceeded');
  const m=JSON.parse(b.toString('utf8').replace(/^\uFEFF/,'')); assert(m && typeof m==='object' && !Array.isArray(m),'Manifest must be an object');
  const result={name:p,bytes:b.length,sha256:sha(b),data:m}; manifestCache.set(p,result); return result;
}

// Every handler fixes BOTH the role and the path base. Origin/sourcePath fields
// are not public delivery pointers. New schemas are unresolved, never guessed.
const handlers=new Map();
const spec=(field,pointer='path',base='prefix',extra={})=>({field,pointer,base,...extra});
function schemas(names, fields) { for(const n of names.split(/\s+/).filter(Boolean)){assert(!handlers.has(n));handlers.set(n,fields);} }
schemas(`rea-independent-integration-review-preservation/v1 rea-sketch-collector-followup-preservation/v1 rea-sketch-collector-production-adapter-preservation/v1 rea-automation-recovery-followup-preservation/v1 rea-failed-combined-suite-source-preservation/v1 rea-backup-native-policy-preservation/v1 rea-backup-pack-aggregation-preservation/v1 rea-backup-failed-pack-116-preservation/v1 rea-backup-collector-failed-64-preservation/v1 rea-notebook-integration-preservation/v1 rea-automation-recovery-browser-preservation/v1 rea-notebook-browser-preservation/v1 rea-vault-history-docs-preservation/v1 rea-vault-exchange-readme-preservation/v1 rea-metrics-dispatch-measurement-preservation/v1 rea-metrics-algorithm-independent-audit-preservation/v1 rea-notes-layout-value-api-suite-preservation/v1 rea-search-trash-recycle-save-suite-preservation/v1 rea-failed-search-trash-recycle-save-suite-preservation/v1 rea-packs-notebooks-history-suite-preservation/v1`,[spec('snapshots')]);
schemas('rea-keepass-public-supplement-preservation/v1 rea-keepass-independent-review-public-subset/v1',[spec('files')]);
schemas('rea-backup-pack-integration-run-preservation/v1 rea-notebook-production-run-preservation/v1 rea-vault-history-production-run-preservation/v1',[spec('retained')]);
schemas('rea-frozen-followup-public-subset/v1',[spec('copies')]);
schemas('rea-notes-inline-reviewed-installation-public-preservation/v1',[spec('copies','path','root')]);
schemas('rea-vault-history-installation-preservation/v1',[spec('copies','path','root',{inertOnly:true}),spec('retained')]);
schemas('rea-vault-history-public-production-path-preservation/v1',[spec('files','preservedPath','root',{kind:'public-inert-snapshot'})]);
schemas('rea-metrics-selector-observation-preservation/v1',[spec('snapshots'),spec('copies'),spec('readme','path','prefix',{single:true})]);
schemas('rea-metrics-algorithm-public-preservation/v1',[spec('snapshots'),spec('copies')]);
schemas('rea-historical-milestone-snapshot/v1 rea-native-core-checkpoint-snapshot/v1 rea-native-workflows-checkpoint-snapshot/v1 rea-compression-remote-checkpoint-snapshot/v1',[spec('source_snapshots','snapshot_path','root'),spec('receipts','snapshot_path','root')]);
schemas('rea-rabin-routing-geometry-checkpoint-snapshot/v1',[spec('source_snapshots','snapshot_path','root'),spec('receipts','snapshot_path','root'),spec('publication_verification','snapshot_path','root',{single:true})]);
schemas('rea-packs-notebooks-history-published-checkpoint/v1',[spec('sourceSnapshots','snapshotPath','root'),spec('metadataSnapshots','snapshotPath','root')]);
schemas('rea-published-3baecf4e-checkpoint-preservation/v1',[spec('sourceSnapshots','snapshotPath','root'),spec('metadataSnapshots','snapshotPath','root')]);
schemas('rea-rabin-routing-geometry-browser-checkpoint/v1',[spec('sourceSnapshots'),spec('receipts'),spec('artifacts')]);
schemas('rea-rabin-recorder-review-preservation/v1',[spec('snapshots','path','root'),spec('historicalCollector','snapshotPath','root',{single:true})]);
schemas('rea-rabin-recorder-integration-review-preservation/v1 rea-restic-rabin-source-preservation/v1 rea-restic-compression-source-preservation/v1',[spec('snapshots','path','root')]);
schemas('rea-independent-review-preservation/v1',[spec('snapshots','path','root'),spec('reviewedSources','snapshot_path','root',{optionalPointer:true})]);
schemas('rea-automation-routing-preservation/v1',[spec('entries','snapshot','studio')]);
schemas('rea-publication-git-directory-closure/v1',[spec('files')]);
schemas('rea-publication-editor-git-observer-transition/v1',[spec('records')]);
schemas('rea-publication-editor-save-git-closure/v1',[spec('files')]);
schemas('rea-windows-path-source-proof-transition/v1 rea-editor-vault-root-installation-preservation/v1',[spec('records','path','root')]);
schemas('rea-sketch-layout-static-route-freeze/v1',[spec('records','path','prefix',{suffix:'.snapshot',inertManifest:'products/rea-studio/results/sketch-layout-reviewed-installation-20261013/shared-route/frozen/freeze-manifest.json.snapshot'})]);
schemas('rea-sketch-layout-independent-source-plan-review-freeze/v1',[spec('inventory','path','prefix',{suffix:'.snapshot',inertManifest:'products/rea-studio/results/sketch-layout-reviewed-installation-20261013/source-plan-independent-review/frozen/freeze-manifest.json.snapshot'})]);
schemas('rea-notes-inline-browser-publication-addendum-freeze/v1',[spec('records','path','prefix',{suffix:'.snapshot',inventoryAlternative:true,inertManifest:'products/rea-studio/apps/notes/results/inline-confirmation-followup/browser-publication-plan/frozen/freeze-manifest.json.snapshot'})]);
schemas('rea-notes-browser-qualification-correction-strict-freeze/v1',[spec('records','path','prefix',{suffix:'.snapshot',inventoryAlternative:true,inertManifest:'products/rea-studio/apps/notes/results/inline-confirmation-followup/browser-qualification-correction/frozen/freeze-manifest.json.snapshot'})]);
schemas(`rea-cloud-flow-vault-finite-preservation/v1 rea-cloud-flow-vault-controls-preservation/v1 rea-cloud-archive-composition-failure-preservation/v1 rea-cloud-archive-metadata-failure-preservation/v1 rea-cloud-archive-prerequisites-failure-preservation/v1 rea-cloud-archive-aes-finite-pass-preservation/v1 rea-cloud-windows-path-finite-pass-preservation/v1 rea-cloud-windows-path-installed-pass-preservation/v1 rea-cloud-flow-vault-browser-pass-preservation/v1`,[spec('records')]);
handlers.set('rea-vault-history-docs-preservation/v1',[spec('snapshots'),spec('previousReadme','path','root',{single:true})]);

const closure={path:'products/rea-studio/results/publication-git-directory-closure-20261015/preservation-manifest.json',bytes:7382,sha256:'37b34ad5324719094e9842343d7649af4ffbd5606f47488137e04a6ee380e49b'};
const aliases=new Map(), embedded=new Map(), seenTargets=new Map();
function closedAliases() {
  const c=manifest(closure.path); assert.equal(c.bytes,closure.bytes);assert.equal(c.sha256,closure.sha256);assert.equal(c.data.schema,'rea-publication-git-directory-closure/v1');
  assert.equal(c.data.aliases.length,6); const prefix=dirname(closure.path).replaceAll('\\','/');
  for(const a of c.data.aliases){safe(a.prefix);safe(a.logicalPath);const id=identity(a);assert.equal(id.bytes,7);assert.equal(id.sha256,'d29210777777dac0b3d12f6a656a073c9ba717cf6932dbc01b0cc6dc1e7779b8');
    assert.equal(a.sourceManifest.path,a.prefix+'/preservation-manifest.json');const src=manifest(a.sourceManifest.path);assert.equal(src.bytes,a.sourceManifest.bytes);assert.equal(src.sha256,a.sourceManifest.sha256);
    const matches=src.data.copies.filter(r=>r.path===a.logicalPath);assert.equal(matches.length,1);assert.equal(matches[0].sourcePath,a.sourcePath);assert.deepEqual(identity(matches[0]),id);
    const delivered=prefix+'/'+safe(a.payloadPath),b=trackedBytes(delivered);assert.equal(b.length,id.bytes);assert.equal(sha(b),id.sha256);
    const target=a.prefix+'/'+a.logicalPath;assert(!aliases.has(target));aliases.set(target,{manifest:a.sourceManifest.path,...id,delivered});
  }
  assert.equal(aliases.size,6);report.existingClosedAliasAuthority={...closure,aliases:6,originalDotGitPathsClaimedGitDelivered:false,genericFallback:false};
}
function pinHints(m) {
  let nodes=0,count=0;const keys=new Set();
  function visit(v,depth){assert(++nodes<=LIMIT.nodesPerManifest && depth<=LIMIT.depth,'JSON structure bound exceeded');if(!v||typeof v!=='object')return;
    if(!Array.isArray(v)&&Number.isSafeInteger(v.bytes)&&HASH.test(v.sha256??'')){count++;for(const k of Object.keys(v))if(typeof v[k]==='string'&&/(?:path|destination|snapshot|payload)/i.test(k))keys.add(k);}
    for(const x of Object.values(v))if(x&&typeof x==='object')visit(x,depth+1);
  }visit(m,0);return{exactPinObjects:count,pointerKeys:[...keys].sort()};
}
function declare(ctx, field, i, row, rule) {
  assert(++report.counts.declarations<=LIMIT.declarations,'Declaration bound exceeded');const id=identity(row),p=safe(row[rule.pointer]);
  if(rule.inertOnly&&!p.endsWith('.snapshot')){report.counts.excludedLogicalRows++;return;}
  const prefix=dirname(ctx.name).replaceAll('\\','/'),target=safe((rule.base==='root'?p:rule.base==='studio'?'products/rea-studio/'+p:prefix+'/'+p)+(rule.suffix??'')),prior=seenTargets.get(target);
  // Different historical declarations can refer to a mutable current source.
  // Only inert destinations are treated as immutable shared delivery objects.
  if(prior && target.endsWith('.snapshot') && (prior.bytes!==id.bytes||prior.sha256!==id.sha256))unresolved(ctx.name,ctx.data.schema,'Conflicting identities for one inert public target',{field,index:i,target,previous:prior,current:id});
  if(!prior)seenTargets.set(target,id);
  const origin={manifest:ctx.name,manifestSHA256:ctx.sha256,schema:ctx.data.schema,field,index:i,target,...id};
  const alias=aliases.get(target);if(alias){assert.equal(alias.manifest,ctx.name);assert.deepEqual(identity(alias),id);report.counts.existingClosedAliases++;detail('closed-aliases.jsonl',{...origin,status:'existing-exact-closed-alias',gitDeliveredPayload:alias.delivered,logicalPathGitDelivered:false});return;}
  const blob=trees.get(target);if(!blob){report.counts.missingGit++;report.missingByPrefix[prefix]=(report.missingByPrefix[prefix]??0)+1;
    const candidates=contentCandidates.get(id.sha256+':'+id.bytes)??[];
    const segments=target.toLowerCase().split('/'),pathClass=segments.includes('.git')?'git-reserved-directory':segments.includes('.local')?'ignored-directory-and-current-publication-policy-forbidden':'ordinary-missing-git';
    detail('missing-git.jsonl',{...origin,status:'missing-from-committed-tree',pathClass,currentPublicationLocalDirectoryPolicyConflict:segments.includes('.local'),repairAuthorizedOrAccepted:false,existingContentAddressedCandidates:candidates});return;}
  if(!['100644','100755'].includes(blob.mode)){report.counts.wrongGitMode++;detail('missing-git.jsonl',{...origin,status:'not-regular-git-blob',mode:blob.mode});return;}
  report.counts.gitPresent++;if(blob.bytes!==id.bytes){report.counts.declaredSizeMismatch++;detail('size-mismatches.jsonl',{...origin,status:'declared-size-differs-from-git',gitBytes:blob.bytes,gitBlob:blob.oid});}
}
function registerEmbedded(ctx) {
  if(ctx.name.endsWith('.snapshot')||ctx.data.schema!=='rea-frozen-followup-public-subset/v1')return;
  const m=ctx.data;assert(Array.isArray(m.copies)&&Array.isArray(m.excludedLocalCarriers));const sources=new Map();for(const r of m.copies){safe(r.sourcePath);identity(r);assert(!sources.has(r.sourcePath));sources.set(r.sourcePath,r);}
  const r=sources.get(m.originalManifest?.sourcePath);assert(r,'Missing original manifest copy binding');assert.equal(r.sha256,m.originalManifest.sha256);
  const p=dirname(ctx.name).replaceAll('\\','/')+'/'+safe(r.path),mapped={parent:ctx.name,copy:r,sources,excluded:new Map(m.excludedLocalCarriers.map(x=>[safe(x.sourcePath),x]))};
  assert(!embedded.has(p),'Ambiguous original-manifest embedding');embedded.set(p,mapped);
}
function embeddedManifest(ctx, bind) {
  assert.equal(ctx.bytes,bind.copy.bytes);assert.equal(ctx.sha256,bind.copy.sha256);
  const m=ctx.data,raw=m.inventory??m.entries??m.records;assert(raw&&typeof raw==='object','Unsupported embedded inventory');
  const rows=Array.isArray(raw)?raw:Object.entries(raw).map(([path,r])=>({...r,path})),seen=new Set();
  for(const r of rows){safe(r.path);identity(r);assert(!seen.has(r.path),'Duplicate embedded logical source');seen.add(r.path);const retained=bind.sources.get(r.path),excluded=bind.excluded.get(r.path);assert(Boolean(retained)!==Boolean(excluded),'Embedded logical row has no exclusive retained/excluded mapping');assert.deepEqual(identity(retained??excluded),identity(r));}
  report.counts.embeddedLogicalManifests++;detail('manifests.jsonl',{manifest:ctx.name,schema:m.schema??null,sha256:ctx.sha256,bytes:ctx.bytes,classification:'embedded-historical-logical-inventory',parent:bind.parent,rows:rows.length,deliveryCheckedThroughParentCopies:true});
}
function finish(status, error) {
  if(terminal)return;terminal=true;if(error)report.errors.push(String(error.stack??error).slice(0,5000));report.status=status;report.finishedAt=new Date().toISOString();report.durationMs=Date.now()-started;
  report.coverageComplete=status==='completed'&&report.counts.unresolved===0;
  report.declaredDeliveryComplete=report.coverageComplete&&report.counts.missingGit===0&&report.counts.wrongGitMode===0;
  report.declaredSizesMatch=report.coverageComplete&&report.counts.declaredSizeMismatch===0;
  if(output){event('terminal',{status,coverageComplete:report.coverageComplete});persist('audit-report.json',report);}
  console.log(JSON.stringify({status:report.status,coverageComplete:report.coverageComplete,counts:report.counts,output}));
}

try {
  assert.equal(process.platform,'win32');assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.CI,'true');assert.equal(process.env.GITHUB_REPOSITORY,'Ginderlax/rea-research-lab');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');assert.equal(process.env.RUNNER_OS,'Windows');assert.equal(process.version,'v24.16.0');
  assert(/^\d+$/.test(process.env.GITHUB_RUN_ID??'')&&/^\d+$/.test(process.env.GITHUB_RUN_ATTEMPT??''));assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA??''));
  assert.deepEqual(process.argv.slice(2,3),['--output']);assert.equal(process.argv.length,4);assert(isAbsolute(process.argv[3]));
  const temp=realpathSync(process.env.RUNNER_TEMP),expected=join(temp,'rea-proof-delivery-audit-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT),requested=resolve(process.argv[3]);assert.equal(requested.toLowerCase(),expected.toLowerCase());
  const rel=relative(ROOT,requested);assert(rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel),'Evidence must be outside checkout');mkdirSync(requested,{recursive:false});output=requested;
  report.provenance={repository:process.env.GITHUB_REPOSITORY,sourceCommit:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT,runnerEnvironment:process.env.RUNNER_ENVIRONMENT,runnerOS:process.env.RUNNER_OS,node:process.version,platform:process.platform,architecture:process.arch};
  persist('attempt-running.json',report);event('started');
  assert.equal(git(['rev-parse','--show-object-format']).toString().trim(),'sha1');assert.equal(git(['rev-parse','HEAD']).toString().trim(),process.env.GITHUB_SHA);assert.equal(git(['status','--porcelain=v1','--untracked-files=all']).length,0,'Checkout must be clean');
  const tree=git(['ls-tree','-r','-l','-z','--full-tree','HEAD']);for(const raw of tree.toString('utf8').split('\0').filter(Boolean)){const match=/^(\d{6}) (blob|commit) ([0-9a-f]{40}) +([0-9]+|-)\t(.+)$/.exec(raw);assert(match,'Unexpected Git tree record');if(match[2]!=='blob')continue;const name=safe(match[5]);assert(!trees.has(name));trees.set(name,{mode:match[1],oid:match[3],bytes:Number(match[4])});assert(trees.size<=LIMIT.gitBlobs);}
  report.counts.gitBlobs=trees.size;for(const [p,b]of trees){const match=/\/([0-9a-f]{64})\.snapshot$/.exec(p);if(match&&['100644','100755'].includes(b.mode)){const key=match[1]+':'+b.bytes,rows=contentCandidates.get(key)??[];if(rows.length<12)rows.push({path:p,gitBlob:b.oid,bytes:b.bytes,sha256Authenticated:false});contentCandidates.set(key,rows);}}
  report.sourceFiles=[];for(const p of [SCRIPT,WORKFLOW]){const b=trackedBytes(p);report.sourceFiles.push({path:p,bytes:b.length,sha256:sha(b),gitBlob:trees.get(p).oid});writeFileSync(join(output,p===SCRIPT?'audit-script.mjs.snapshot':'audit-workflow.yml.snapshot'),b,{flag:'wx'});}
  closedAliases();const candidates=[...trees.keys()].filter(p=>CANDIDATE_NAME.test(p)).sort();report.counts.candidateManifests=candidates.length;assert(candidates.length<=LIMIT.manifests);
  // Register all parent logical maps before interpreting their inert originals.
  for(const p of candidates){timed();try{registerEmbedded(manifest(p));}catch(e){unresolved(p,null,'Cannot parse/register manifest',{error:String(e.message).slice(0,1000)});}}
  for(const p of candidates){timed();let ctx;try{ctx=manifest(p);const schema=ctx.data.schema??null;report.schemaCounts[String(schema)]=(report.schemaCounts[String(schema)]??0)+1;
    if(embedded.has(p)){embeddedManifest(ctx,embedded.get(p));continue;}
    // An unbound inert historical manifest has no implied current path base.
    const fields=handlers.get(schema);if(p.endsWith('.snapshot')&&!fields?.every(r=>r.inertManifest===p)){unresolved(p,schema,'Inert manifest has no reviewed delivery projection',pinHints(ctx.data));continue;}
    if(!fields){unresolved(p,schema,'Schema has no closed public-pointer handler',pinHints(ctx.data));continue;}
    for(const rule of fields){let value=ctx.data[rule.field];if(value===undefined&&rule.inventoryAlternative){const raw=ctx.data.inventory;assert(raw&&typeof raw==='object','Missing inventory alternative');value=Array.isArray(raw)?raw:Object.entries(raw).map(([path,r])=>({...r,path}));}assert(value!==undefined,'Missing recognized pointer field '+rule.field);const rows=rule.single?[value]:value;assert(Array.isArray(rows),'Expected declaration array '+rule.field);for(let i=0;i<rows.length;i++){if((rule.kind&&rows[i].kind!==rule.kind)||(rule.optionalPointer&&rows[i][rule.pointer]===undefined)){report.counts.excludedLogicalRows++;continue;}try{declare(ctx,rule.field,i,rows[i],rule);}catch(e){unresolved(p,schema,'Invalid recognized declaration',{field:rule.field,index:i,error:String(e.message).slice(0,1000)});}}}
    report.counts.recognizedManifests++;detail('manifests.jsonl',{manifest:p,schema,sha256:ctx.sha256,bytes:ctx.bytes,classification:'closed-public-pointers',fields});
  }catch(e){unresolved(p,ctx?.data?.schema??null,'Manifest audit incomplete',{error:String(e.message).slice(0,1000)});}}
  assert.equal(git(['rev-parse','HEAD']).toString().trim(),report.provenance.sourceCommit);assert.equal(git(['status','--porcelain=v1','--untracked-files=all']).length,0,'Checkout changed during read-only audit');
  finish('completed');if(!report.declaredDeliveryComplete||!report.declaredSizesMatch)process.exitCode=1;
} catch(e) { try{finish('failed',e);}catch(storage){console.error('Audit evidence storage failed: '+storage.message);}console.error(String(e.stack??e));process.exitCode=1; }
