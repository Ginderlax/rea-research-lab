// Actual-current finite source delivery and a separately scoped fixed2a broad
// audit. No historical declaration or receipt acquires current46 acceptance.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFileSync, lstatSync, mkdirSync, readFileSync, realpathSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createNotes41PublicationSourceViewFromRoot } from './notes41-publication-source-view.mjs';
import { createNotes46InstalledSourceViewFromRoot, verifyNotes46InstalledSourceEnvelope, notes46InstalledSourceBudget } from './notes46-installed-source-view.mjs';
import { prepareNotes46HistoricalInputRoot, assertNotes46HistoricalInputRoot } from './notes46-historical-input-root.mjs';

const CURRENT_EPOCH = 'notes46-installed-structured-search-v1';
const CURRENT_BRANCH = 'refs/heads/experiment/notes46-installed-search-20261019';
const CURRENT_SOURCE_PARENT = '40c7df91936aaf9574801aa38c5a635f299e6e39';
const HISTORICAL_COMMIT = '2a8482b42784eb262d6d5b82e62d8d1220dc4821';
const HISTORICAL_TREE = '34e8de6f0c447edd2bc1a6389ed5dfb727705025';
const MANIFEST = 'products/rea-studio/experiments/notes46-installed-search-20261019/INSTALLED-SOURCE.json';
const HELPER = 'scripts/notes46-installed-source-view.mjs';
const AUDIT = 'scripts/audit-notes46-installed-delivery.mjs';
const ALIAS = 'scripts/audit-proof-delivery.mjs';
const WORKFLOW46 = '.github/workflows/notes46-installed-search-publication-cloud.yml';
// Fixed separately reviewed current-source declaration, helper and path roster.
const FIXED_MANIFEST = Object.freeze({ path: MANIFEST, bytes: 67453, sha256: '3897c35484ac153985e8d1a77d44d592c784ace2582f7e228c581ab7cfb2b5b6' });
const FIXED_HELPER = Object.freeze({ path: HELPER, bytes: 22964, sha256: '1ff5079f5a7b0373f47d3af808c3398da4ff5e128c9d14f22ed1526dc65ee6da' });
const CURRENT_SOURCE_PATHS = Object.freeze([
  "products/rea-studio/apps/notes/README.md",
  "products/rea-studio/apps/notes/app.integration.test.mjs",
  "products/rea-studio/apps/notes/app.test.mjs",
  "products/rea-studio/apps/notes/client.mjs",
  "products/rea-studio/apps/notes/core.mjs",
  "products/rea-studio/apps/notes/draft-recovery-test-fixture.mjs",
  "products/rea-studio/apps/notes/draft-recovery.http.test.mjs",
  "products/rea-studio/apps/notes/draft-recovery.mjs",
  "products/rea-studio/apps/notes/draft-recovery.test.mjs",
  "products/rea-studio/apps/notes/draft-recovery.ui.test.mjs",
  "products/rea-studio/apps/notes/fixtures/oracle-verification.json",
  "products/rea-studio/apps/notes/fixtures/pinned-joplin.jex",
  "products/rea-studio/apps/notes/fixtures/pinned-joplin.json",
  "products/rea-studio/apps/notes/interop-fixture-tool.mjs",
  "products/rea-studio/apps/notes/jex.mjs",
  "products/rea-studio/apps/notes/jex.test.mjs",
  "products/rea-studio/apps/notes/markdown.mjs",
  "products/rea-studio/apps/notes/new-todo-original.test.mjs",
  "products/rea-studio/apps/notes/new-todo.integration.test.mjs",
  "products/rea-studio/apps/notes/new-todo.test.mjs",
  "products/rea-studio/apps/notes/new-todo.ui.test.mjs",
  "products/rea-studio/apps/notes/notebook-confirmation-cancel-open-note.ui.test.mjs",
  "products/rea-studio/apps/notes/notebook-confirmation.ui.test.mjs",
  "products/rea-studio/apps/notes/notebook-original-oracle.mjs",
  "products/rea-studio/apps/notes/notebook-trash-fresh-boundaries.test.mjs",
  "products/rea-studio/apps/notes/notebook-trash-original-oracle.mjs",
  "products/rea-studio/apps/notes/notebook-trash-publication-boundaries.test.mjs",
  "products/rea-studio/apps/notes/notebook-trash-review-fixture.mjs",
  "products/rea-studio/apps/notes/notebook-trash-review.test.mjs",
  "products/rea-studio/apps/notes/notebook-trash.integration.test.mjs",
  "products/rea-studio/apps/notes/notebook-trash.mjs",
  "products/rea-studio/apps/notes/notebook-trash.test.mjs",
  "products/rea-studio/apps/notes/notebook-trash.ui.test.mjs",
  "products/rea-studio/apps/notes/notebooks.integration.test.mjs",
  "products/rea-studio/apps/notes/notebooks.mjs",
  "products/rea-studio/apps/notes/notebooks.test.mjs",
  "products/rea-studio/apps/notes/search-query-original.test.mjs",
  "products/rea-studio/apps/notes/search-query.integration.test.mjs",
  "products/rea-studio/apps/notes/search-query.mjs",
  "products/rea-studio/apps/notes/search-query.test.mjs",
  "products/rea-studio/apps/notes/search-query.ui.test.mjs",
  "products/rea-studio/apps/notes/server.mjs",
  "products/rea-studio/apps/notes/todo-original.test.mjs",
  "products/rea-studio/apps/notes/todo.integration.test.mjs",
  "products/rea-studio/apps/notes/todo.test.mjs",
  "products/rea-studio/apps/notes/todo.ui.test.mjs",
  "products/rea-studio/experiments/notes-search-grammar/COPYING",
  "products/rea-studio/experiments/notes-search-grammar/NOTICE.txt",
  "products/rea-studio/experiments/notes-search-grammar/original/LICENSE",
  "products/rea-studio/experiments/notes-search-grammar/original/packages/lib/services/search/filterParser.ts",
  "products/rea-studio/experiments/notes-search-grammar/original/packages/lib/services/search/queryBuilder.ts",
  "products/rea-studio/experiments/notes-search-grammar/original/packages/lib/services/search/SearchEngine.ts",
  "products/rea-studio/experiments/notes-search-grammar/original/readme/apps/search.md",
  "products/rea-studio/experiments/notes-search-grammar/original/retained-notebook-release-provenance.json",
  "products/rea-studio/experiments/notes-search-grammar/SOURCE-PROVENANCE.json",
  "products/rea-studio/experiments/notes-search-grammar/STUDY-PLAN.json",
  ".github/workflows/development-cloud.yml",
  ".github/workflows/notes-new-todo-installed-cloud.yml",
  "products/rea-studio/browser-tests/browser-metadata.json",
  "products/rea-studio/browser-tests/notes-draft-recovery-installed-legacy-r2-roster.json",
  "products/rea-studio/browser-tests/notes-draft-recovery-installed-legacy-r2.spec.mjs",
  "products/rea-studio/browser-tests/notes-draft-recovery-installed-legacy-roster.json",
  "products/rea-studio/browser-tests/notes-draft-recovery-installed-legacy.spec.mjs",
  "products/rea-studio/browser-tests/notes-draft-recovery.spec.mjs",
  "products/rea-studio/browser-tests/notes-draft-recovery.storage.spec.mjs",
  "products/rea-studio/browser-tests/package-lock.json",
  "products/rea-studio/browser-tests/package.json",
  "products/rea-studio/browser-tests/playwright.notes-draft-recovery-installed-legacy-r2.config.mjs",
  "products/rea-studio/browser-tests/playwright.notes-draft-recovery-installed-legacy.config.mjs",
  "products/rea-studio/browser-tests/playwright.notes-draft-recovery.config.mjs",
  "products/rea-studio/experiments/notes-draft-recovery-installed-r2/legacy8/README.md",
  "products/rea-studio/experiments/notes-draft-recovery-installed-r2/legacy8/TRANSITION.json",
  "products/rea-studio/experiments/notes-draft-recovery-installed-r2/legacy8/notes-draft-recovery-installed-legacy-roster.json.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed-r2/legacy8/notes-draft-recovery-installed-legacy.spec.mjs.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed-r2/legacy8/playwright.notes-draft-recovery-installed-legacy.config.mjs.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed-r2/legacy8/retained8-r2-source-binding.diff.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed-r2/review/full-r2-independent-peer-final-r4.json",
  "products/rea-studio/experiments/notes-draft-recovery-installed-r2/review/full-r2-source-authority-final-r4.json",
  "products/rea-studio/experiments/notes-draft-recovery-installed-r2/review/root-product-r4-independent-source-peer.json",
  "products/rea-studio/experiments/notes-draft-recovery-installed/FULL-REGRESSION-FLOOR-R2.json",
  "products/rea-studio/experiments/notes-draft-recovery-installed/FULL-REGRESSION-FLOOR.json",
  "products/rea-studio/experiments/notes-draft-recovery-installed/INSTALLED-REGRESSION-FLOOR-R2.json",
  "products/rea-studio/experiments/notes-draft-recovery-installed/full-baseline-1119.tap.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/full-r2/draft-recovery.ui.test.mjs.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/full/development-cloud.yml.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/historical36/notes-new-todo-installed-cloud.yml.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/legacy8/README.md",
  "products/rea-studio/experiments/notes-draft-recovery-installed/legacy8/TRANSITION.json",
  "products/rea-studio/experiments/notes-draft-recovery-installed/legacy8/legacy8-complete-test-body.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/legacy8/legacy8-source-binding.diff.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/legacy8/notes-new-todo-roster.json.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/legacy8/notes-new-todo.spec.mjs.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/legacy8/notes-readme-two-edit.diff.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/legacy8/playwright.notes-new-todo.config.mjs.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/NOTES41-SOURCE.ff3.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/OWNED-OPEN-ROOT-SOURCE-AUTHORITY-R4.json.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/OWNED-OPEN-TRANSITION-R2.json",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/README.md",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/client.mjs.ff3.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/development-cloud.yml.ff3.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/draft-recovery.ui.test.mjs.ff3.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/draft-recovery.ui.test.mjs.r2.append.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/notes-draft-recovery-installed-cloud.yml.ff3.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/r2-owned-open/verify-notes41-installed-cloud.mjs.ff3.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/source/README.before.snapshot",
  "products/rea-studio/experiments/notes-draft-recovery-installed/todo.integration.test.mjs.before.snapshot",
  "products/rea-studio/results/notes36-source-transition-20261016/current-source-declaration.json",
  "products/rea-studio/scripts/notes-draft-recovery-regression-floor.json",
  "products/rea-studio/scripts/verify-cloud-browser.mjs",
  "products/rea-studio/scripts/verify-notes-draft-recovery-cloud.mjs",
  "products/rea-studio/scripts/verify-notes-draft-recovery-installed-full-r2.mjs",
  "products/rea-studio/scripts/verify-notes-draft-recovery-installed-full.mjs",
  "products/rea-studio/scripts/verify-notes36-cloud.mjs",
  "products/rea-studio/scripts/verify-notes36-installed-cloud.mjs",
  "products/rea-studio/scripts/verify-notes41-legacy-browser-results-r2.mjs",
  "products/rea-studio/scripts/verify-notes41-legacy-browser-results.mjs",
  "products/rea-studio/server.mjs",
  "products/rea-studio/experiments/notes-draft-recovery-installed/NOTES41-SOURCE-R2.json",
  "products/rea-studio/scripts/verify-notes41-installed-cloud-r2.mjs",
  ".github/workflows/notes-draft-recovery-installed-cloud.yml",
  "scripts/verify-records.mjs",
  "scripts/verify-followup-records.mjs",
  "scripts/verify-archive-integration-records.mjs",
  "scripts/verify-editor-save-followup.mjs",
  "scripts/verify-notes-layout-value-api-checkpoint.mjs",
  "scripts/verify-notes-inline-followups.mjs",
  "scripts/verify-notes-vault-followups.mjs",
  "scripts/verify-editor-value-api-followups.mjs",
  "scripts/audit-proof-delivery.mjs",
  "scripts/verify-sketch-layout-followups.mjs",
  "products/rea-studio/apps/sketch/README.md",
  "products/rea-studio/apps/sketch/client.mjs",
  "products/rea-studio/apps/sketch/layout-original-oracle.mjs",
  "products/rea-studio/apps/sketch/layout-ui-fixture.mjs",
  "products/rea-studio/apps/sketch/layout-ui.test.mjs",
  "products/rea-studio/apps/sketch/layout.mjs",
  "products/rea-studio/apps/sketch/layout.test.mjs",
  "products/rea-studio/apps/sketch/precision.test.mjs",
  "products/rea-studio/tests/sketch-layout-static-route.test.mjs",
  "scripts/sketch-layout-proof/proof-verifier.mjs",
  "scripts/sketch-layout-proof/public-proof-loader.mjs",
  "scripts/notes46-current-proof-dispatch.mjs",
  "scripts/notes46-historical-input-root.mjs",
  "products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/editor-vault-proof-migration.mjs",
  "products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/notes41-publication-source-view.mjs",
  "products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-archive-integration-records.mjs",
  "products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-editor-value-api-followups.mjs",
  "products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-followup-records.mjs",
  "products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-notes-inline-followups.mjs",
  "products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-notes-layout-value-api-checkpoint.mjs",
  "products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-notes-vault-followups.mjs",
  "scripts/notes41-publication-source-view.mjs",
  "scripts/editor-vault-proof-migration.mjs",
  "products/rea-studio/experiments/notes46-installed-search-20261019/historical-input/TREE-DESCRIPTOR.json",
  "scripts/notes46-historical-record-predicates.mjs",
  "scripts/historical-carrier-policy.mjs"
]);
const CURRENT_SOURCE_COUNT = 156, CURRENT_DATA_COUNT = 157, CURRENT_ENVELOPE_COUNT = 158;
const OUTER_SOURCE_ROLES = Object.freeze([
  ['scripts/verify-notes46-publication.mjs', 'current-publication-producer-context'],
  ['scripts/verify-cloud-publication.mjs', 'documented-publication-alias-context'],
  ['scripts/notes46-installed-source-controls.mjs', 'current-source-controls-context'],
  ['scripts/notes46-publication-repeat-controls.mjs', 'current-repeat-controls-context'],
  [AUDIT, 'actual-current-audit-module'],
  [ALIAS, 'documented-audit-cli'],
  [HELPER, 'fixed-current-source-helper'],
  [WORKFLOW46, 'actual-workflow-source']
].map(([path, role]) => Object.freeze({ path, role })));
const CURRENT_LIMIT = Object.freeze({ memberBytes: 512*1024, helperBytes: 256*1024, rawBytes: 8*1024*1024, jsonBytes: 12*1024*1024, storedBytes: 8*1024*1024, roles: 176, importSources: 64 });
const OUTPUT_LIMIT = Object.freeze({ files: 96, rawBytes: 48*1024*1024, memberBytes: 8*1024*1024, historicalFiles: 12, historicalRawBytes: 24*1024*1024, historicalMemberBytes: 4*1024*1024, innerArchiveBytes: 15*1024*1024 });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const byteIdentity = bytes => ({ bytes: bytes.length, sha256: digest(bytes) });
const identityPin = row => ({ bytes: row.bytes, sha256: row.sha256 });
const objectIdentity = bytes => createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');

function currentSafe(name) {
  assert(typeof name==='string'&&name&&name.length<=2048&&!name.startsWith('/')&&!/[\\:\x00-\x1f\x7f<>"|?*]/.test(name),'Unsafe current source path');
  for(const part of name.split('/'))assert(part&&part!=='.'&&part!=='..'&&!/[ .]$/.test(part)&&!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),'Unsafe current source segment');
  assert(name.split('/').length<=32);return name;
}
function currentNoLinks(filename) {
  let at=resolve(filename);for(;;){assert(!lstatSync(at).isSymbolicLink(),'Source/output links are refused');const parent=dirname(at);if(parent===at)break;at=parent;}
  assert.equal(realpathSync(filename).toLowerCase(),resolve(filename).toLowerCase());
}
function currentRead(root,name,maximum=CURRENT_LIMIT.memberBytes) {
  const filename=join(root,currentSafe(name)),rel=relative(root,filename);assert(rel&&!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+sep));
  currentNoLinks(filename);const stat=lstatSync(filename);assert(stat.isFile()&&stat.size<=maximum,'Current bounded source member: '+name);const bytes=readFileSync(filename);assert.equal(bytes.length,stat.size);return bytes;
}
function readOnlyGitEnvironment(){
  const clean=Object.fromEntries(Object.entries(process.env).filter(([name])=>!/^GIT_/i.test(name)));
  return {...clean,GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'};
}
function currentGit(root,args,maximum=32*1024*1024) {
  const result=spawnSync('git',['--no-replace-objects','-C',root,...args],{shell:false,windowsHide:true,timeout:45000,maxBuffer:maximum,env:readOnlyGitEnvironment()});
  assert.equal(result.error,undefined);assert.equal(result.status,0);assert.equal(result.signal,null);assert(result.stdout.length<=maximum);return result.stdout;
}
function actualExecution() {
  return Object.fromEntries(['CI','GITHUB_ACTIONS','RUNNER_ENVIRONMENT','RUNNER_OS','RUNNER_ARCH','GITHUB_REPOSITORY','GITHUB_SHA','GITHUB_REF','GITHUB_EVENT_NAME','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_JOB','GITHUB_WORKFLOW','GITHUB_SERVER_URL'].map(name=>[name,process.env[name]]));
}
function actualTree(repoRoot) {
  const rows=new Map();const raw=currentGit(repoRoot,['ls-tree','-rlz','--full-tree','HEAD']);
  for(const line of new TextDecoder('utf-8',{fatal:true}).decode(raw).split('\0').filter(Boolean)){
    const match=/^(\d{6}) (blob|commit) ([0-9a-f]{40}) +([0-9]+|-)\t(.+)$/.exec(line);assert(match);if(match[2]!=='blob')continue;
    const name=currentSafe(match[5]);assert(!rows.has(name));rows.set(name,{mode:match[1],gitBlob:match[3],bytes:Number(match[4])});assert(rows.size<=250000);
  }return rows;
}
function currentSave(output,name,value) {
  const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');assert(bytes.length<=2*1024*1024);const filename=join(output,currentSafe(name));
  writeFileSync(filename,bytes,{flag:'wx'});assert.deepEqual(readFileSync(filename),bytes);return {path:name,...byteIdentity(bytes)};
}
function sourceSpecification(plan,tree) {
  assert(Array.isArray(CURRENT_SOURCE_PATHS));assert.equal(CURRENT_SOURCE_PATHS.length,CURRENT_SOURCE_COUNT,'Unfrozen complete current source path roster');
  assert.equal(new Set(CURRENT_SOURCE_PATHS.map(name=>currentSafe(name).toLowerCase())).size,CURRENT_SOURCE_COUNT);
  const specs=new Map();
  function add(name,role,expectedPin) {
    currentSafe(name);const member=tree.get(name);
    const row=specs.get(name)??{path:name,bytes:member?.bytes??expectedPin?.bytes??null,gitBlob:member?.gitBlob??null,gitMode:member?.mode??null,roles:[],expectedPin:null};
    if(expectedPin){if(row.expectedPin)assert.deepEqual(row.expectedPin,identityPin(expectedPin));row.expectedPin=identityPin(expectedPin);}
    if(!row.roles.includes(role))row.roles.push(role);specs.set(name,row);
  }
  const declared=new Map(plan?.currentSourceRows?.map(row=>[row.path,row])??[]);
  if(plan){assert.equal(plan.schema,'rea-notes46-installed-source-declaration/v1');assert.equal(plan.sourceEpoch,CURRENT_EPOCH);assert.deepEqual(plan.currentSourceRows.map(row=>row.path),CURRENT_SOURCE_PATHS,'Fixed manifest path roster differs');}
  for(const name of CURRENT_SOURCE_PATHS)add(name,'mandatory-current-source',declared.get(name));
  add(MANIFEST,'fixed-current-manifest',FIXED_MANIFEST);add(HELPER,'fixed-current-source-helper',FIXED_HELPER);
  for(const row of OUTER_SOURCE_ROLES)add(row.path,row.role);
  assert(specs.size<=CURRENT_LIMIT.roles);return [...specs.values()].map(row=>({...row,roles:row.roles.sort()})).sort((a,b)=>a.path.localeCompare(b.path));
}
function captureCurrentSourceContext(repoRoot,output,phase,tree,execution) {
  assert(['before','after'].includes(phase));const errors=[],observed=[];let plan=null,manifestAuthenticated=false,rawBytes=0;
  try{const bytes=currentRead(repoRoot,MANIFEST);assert.deepEqual(byteIdentity(bytes),identityPin(FIXED_MANIFEST),'Actual fixed current manifest identity');plan=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));manifestAuthenticated=true;}
  catch(error){errors.push({path:MANIFEST,stage:'frozen-manifest',name:error.name,message:String(error.message).slice(0,4000)});}
  const expected=sourceSpecification(plan,tree);
  for(const wanted of expected){try{
    const maximum=Math.min(wanted.path===HELPER?CURRENT_LIMIT.helperBytes:CURRENT_LIMIT.memberBytes,CURRENT_LIMIT.rawBytes-rawBytes);assert(maximum>=0);
    const bytes=currentRead(repoRoot,wanted.path,maximum);rawBytes+=bytes.length;assert(rawBytes<=CURRENT_LIMIT.rawBytes,'Complete current source raw cap');
    const row={path:wanted.path,...byteIdentity(bytes),gitBlob:objectIdentity(bytes),sourceEpoch:CURRENT_EPOCH,sourceSubjectCommit:execution.GITHUB_SHA,roles:wanted.roles,base64:bytes.toString('base64')};observed.push(row);
    assert.equal(wanted.gitMode,'100644','Actual current regular Git source missing: '+row.path);assert.equal(row.bytes,wanted.bytes,'Actual current Git size: '+row.path);assert.equal(row.gitBlob,wanted.gitBlob,'Actual current Git bytes: '+row.path);if(wanted.expectedPin)assert.deepEqual(identityPin(row),wanted.expectedPin,'Frozen source identity: '+row.path);
  }catch(error){errors.push({path:wanted.path,stage:'bounded-physical-capture',name:error.name,message:String(error.message).slice(0,4000)});}}
  const envelope={schema:'rea-notes46-audit-actual-source-context/v1',repository:'Ginderlax/rea-research-lab',sourceCommit:execution.GITHUB_SHA,sourceEpoch:CURRENT_EPOCH,phase,execution,rawSourceBytes:rawBytes,expectedSourceRows:expected.length,manifestAuthenticated,rows:observed,errors,sourceCodeExecutedFromEnvelope:false,artifactUploadAccepted:false,comprehensiveCoverageAccepted:false};
  const decoded=Buffer.from(JSON.stringify(envelope));assert(decoded.length<=CURRENT_LIMIT.jsonBytes);const stored=gzipSync(decoded,{mtime:0});assert(stored.length<=CURRENT_LIMIT.storedBytes);
  const role='notes46-source-context-'+phase+'.json.gz.snapshot',filename=join(output,role);writeFileSync(filename,stored,{flag:'wx'});assert.deepEqual(readFileSync(filename),stored);
  assert.deepEqual(gunzipSync(readFileSync(filename),{maxOutputLength:CURRENT_LIMIT.jsonBytes}),decoded);
  return {envelope,expected,receipt:{path:role,stored:byteIdentity(stored),decoded:byteIdentity(decoded),observedRows:observed.length,expectedRows:expected.length,rawBytes,manifestAuthenticated,contentsCapturedBeforeSourceAcceptance:true,contentsComplete:errors.length===0,errors,uploadedArtifactAcceptanceClaimed:false}};
}

export function verifyNotes46AuditSourceContext(envelope,expected,execution) {
  assert.equal(envelope.schema,'rea-notes46-audit-actual-source-context/v1');assert.equal(envelope.repository,'Ginderlax/rea-research-lab');assert.equal(envelope.sourceCommit,execution.GITHUB_SHA,'Current context source commit');
  assert.equal(envelope.sourceEpoch,CURRENT_EPOCH);assert.deepEqual(envelope.execution,execution,'Actual current attempt provenance');
  assert.equal(envelope.manifestAuthenticated,true,'Frozen current manifest must authenticate');assert.deepEqual(envelope.errors,[],'Physical capture errors cannot be waived');
  assert.equal(envelope.sourceCodeExecutedFromEnvelope,false);assert.equal(envelope.artifactUploadAccepted,false);assert.equal(envelope.comprehensiveCoverageAccepted,false);
  assert(Number.isSafeInteger(envelope.rawSourceBytes)&&envelope.rawSourceBytes>=0&&envelope.rawSourceBytes<=CURRENT_LIMIT.rawBytes,'Current context raw byte cap');
  assert(Array.isArray(expected)&&expected.length<=CURRENT_LIMIT.roles);assert.equal(envelope.expectedSourceRows,expected.length);assert(Array.isArray(envelope.rows)&&envelope.rows.length<=CURRENT_LIMIT.roles);
  const wanted=new Map(expected.map(row=>[row.path,row]));assert.equal(wanted.size,expected.length);const seen=new Set();let total=0;
  for(const row of envelope.rows){
    currentSafe(row.path);assert(!seen.has(row.path.toLowerCase()),'Duplicate current context path: '+row.path);seen.add(row.path.toLowerCase());
    const expectedRow=wanted.get(row.path);assert(expectedRow,'Unknown current context path: '+row.path);assert.equal(row.sourceEpoch,CURRENT_EPOCH,'Current context epoch: '+row.path);assert.equal(row.sourceSubjectCommit,execution.GITHUB_SHA,'Historical bytes cannot alias a current source subject: '+row.path);
    assert.deepEqual(row.roles,expectedRow.roles,'Current context role binding: '+row.path);assert.equal(row.bytes,expectedRow.bytes,'Current context Git byte count: '+row.path);assert.equal(row.gitBlob,expectedRow.gitBlob,'Current context Git blob binding: '+row.path);
    assert(/^[0-9a-f]{64}$/.test(row.sha256));if(expectedRow.expectedPin)assert.deepEqual(identityPin(row),expectedRow.expectedPin,'Current context frozen source identity: '+row.path);
    assert(row.bytes<=(row.path===HELPER?CURRENT_LIMIT.helperBytes:CURRENT_LIMIT.memberBytes));assert(typeof row.base64==='string'&&row.base64.length===4*Math.ceil(row.bytes/3),'Current context encoded byte count: '+row.path);
    const bytes=Buffer.from(row.base64,'base64');assert.equal(bytes.toString('base64'),row.base64,'Current context canonical encoding: '+row.path);assert.equal(bytes.length,row.bytes,'Current context decoded byte count: '+row.path);
    assert.equal(digest(bytes),row.sha256,'Current context decoded SHA: '+row.path);assert.equal(objectIdentity(bytes),row.gitBlob,'Current context decoded Git blob: '+row.path);total+=bytes.length;assert(total<=CURRENT_LIMIT.rawBytes,'Current context raw byte cap');
  }
  for(const row of expected)assert(seen.has(row.path.toLowerCase()),'Missing current context source: '+row.path);
  assert.equal(envelope.rows.length,expected.length);assert.equal(total,envelope.rawSourceBytes,'Current context raw byte accounting');
  for(const role of OUTER_SOURCE_ROLES){const row=envelope.rows.find(row=>row.path===role.path);assert(row?.roles.includes(role.role),'Missing explicit outer source role: '+role.path);}
  return {status:'passed',sourceRows:expected.length,rawSourceBytes:total,currentDataRows:CURRENT_DATA_COUNT,currentFixedHelperRows:1,declaredCurrentEnvelopeRows:CURRENT_ENVELOPE_COUNT,actualGitAndFrozenIdentityBindings:true,historicalRowsAcceptedAsCurrent:false};
}

function moduleTokens(text){
  const tokens=[];let i=0;assert(text.length<=CURRENT_LIMIT.memberBytes);
  while(i<text.length){const c=text[i];if(/\s/.test(c)){i++;continue;}if(c==='/'&&text[i+1]==='/'){i=text.indexOf('\n',i+2);if(i<0)break;continue;}if(c==='/'&&text[i+1]==='*'){const end=text.indexOf('*/',i+2);assert(end>=0);i=end+2;continue;}
    const previous=tokens.at(-1),regexStart=!previous||['(','[','{','=',',',':','!','?',';','&','|'].includes(previous.value)||previous.kind==='identifier'&&['return','case','throw','yield'].includes(previous.value);
    if(c==='/'&&regexStart){let characterClass=false,closed=false;i++;while(i<text.length){const value=text[i++];if(value==='\\'){assert(i<text.length);i++;continue;}if(value==='[')characterClass=true;else if(value===']')characterClass=false;else if(value==='/'&&!characterClass){closed=true;break;}}assert(closed,'Unclosed source regex during import inspection');while(i<text.length&&/[A-Za-z]/.test(text[i]))i++;tokens.push({kind:'regex',value:null});continue;}
    if(c==='\''||c==='"'||c==='`'){const quote=c;let value='',escaped=false;i++;while(i<text.length&&text[i]!==quote){if(text[i]==='\\'){escaped=true;value+=text[i++];assert(i<text.length);}value+=text[i++];}assert(i<text.length);i++;if(quote==="`")assert(!value.includes("${"),'Interpolated audit source templates are outside the fixed reviewed grammar');tokens.push({kind:'string',value:escaped||quote==='`'?null:value});continue;}
    if(/[A-Za-z_$]/.test(c)){const start=i++;while(i<text.length&&/[A-Za-z0-9_$]/.test(text[i]))i++;tokens.push({kind:'identifier',value:text.slice(start,i)});continue;}
    tokens.push({kind:'punctuation',value:c});i++;
  }return tokens;
}
function literalAuditImportSpecifiers(text,name){
  const tokens=moduleTokens(text),specifiers=[];
  for(let i=0;i<tokens.length;i++){
    if(tokens[i].kind!=='identifier'||!['import','export'].includes(tokens[i].value))continue;
    if(tokens[i].value==='import'&&tokens[i+1]?.value==='.')continue;
    if(tokens[i].value==='export'&&!['{','*'].includes(tokens[i+1]?.value))continue;
    let specifier=null;
    if(tokens[i].value==='import'&&tokens[i+1]?.value==='('){assert.equal(tokens[i+2]?.kind,'string','Unresolved dynamic audit import expression: '+name);assert(tokens[i+2].value!==null,'Escaped audit import specifier');assert.equal(tokens[i+3]?.value,')');specifier=tokens[i+2].value;}
    else{for(let j=i+1;j<tokens.length&&tokens[j].value!==';';j++){if(tokens[j].kind==='string'){specifier=tokens[j].value;assert(specifier!==null,'Escaped audit import specifier');break;}}}
    if(specifier!==null)specifiers.push(specifier);
  }
  return specifiers;
}
function auditLiteralImportClosure(capture){
  const byPath=new Map(capture.envelope.rows.map(row=>[row.path,row])),pending=[ALIAS,AUDIT],seen=new Set(),edges=[];
  while(pending.length){const name=pending.pop();if(seen.has(name))continue;assert(seen.size<CURRENT_LIMIT.importSources);seen.add(name);const row=byPath.get(name);assert(row,'Executed audit module missing from current capture: '+name);
    const bytes=Buffer.from(row.base64,'base64'),specifiers=literalAuditImportSpecifiers(new TextDecoder('utf-8',{fatal:true}).decode(bytes),name);
    for(const specifier of specifiers){
      if(specifier.startsWith('node:')){edges.push({from:name,to:specifier,kind:'Node-standard-library'});continue;}
      assert(specifier.startsWith('./')||specifier.startsWith('../'),'Unsupported bare audit module import: '+specifier);
      const target=posix.normalize(posix.join(posix.dirname(name),specifier));currentSafe(target);assert(byPath.has(target),'Actual audit import is not captured: '+target);edges.push({from:name,to:target,kind:'literal-current-source'});if(target.endsWith('.mjs'))pending.push(target);
    }
  }
  return {status:'passed',roots:[ALIAS,AUDIT],modules:[...seen].sort(),edges,sourceBytesOnly:true,sourceModulesImportedByThisInspection:0,sourceGrammar:'Reviewed audit roots only: literal module import/export specifiers; no escaped specifiers, interpolated templates, expression dynamic imports or bare packages.',scope:'This bounded metadata inspection covers the fixed reviewed audit execution roots under that restricted grammar. Producer/controls are separately captured context, not relabeled executed by this audit; no general JavaScript parser or whole-publication closure is claimed.'};
}

function currentAuditControls(capture,execution){
  const rows=[],expected=capture.expected,original=capture.envelope,target=original.rows.find(row=>row.path.startsWith('products/rea-studio/apps/notes/')&&row.bytes>0);assert(target);
  const positive=verifyNotes46AuditSourceContext(original,expected,execution);rows.push({name:'notes46-audit-exact-current-source-context',expected:'acceptance',passed:true});
  function reject(name,edit,needle,inspect=()=>{}){const changed=structuredClone(original);edit(changed);let error=null;try{verifyNotes46AuditSourceContext(changed,expected,execution);}catch(value){error=value;}assert(error instanceof assert.AssertionError,'Actual current audit guard must reject: '+name);assert(error.message.includes(needle),'Wrong current audit rejection: '+name+': '+error.message);inspect(error,changed);rows.push({name,expected:'rejection',targetedGuard:needle,passed:true});}
  reject('notes46-audit-missing-current-source',m=>{m.rows=m.rows.filter(row=>row.path!==target.path);},'Missing current context source: '+target.path);
  reject('notes46-audit-missing-outer-audit-module',m=>{m.rows=m.rows.filter(row=>row.path!==AUDIT);},'Missing current context source: '+AUDIT);
  reject('notes46-audit-duplicate-source-path',m=>{m.rows[1]=structuredClone(m.rows[0]);},'Duplicate current context path: '+original.rows[0].path);
  reject('notes46-audit-unknown-source-path',m=>{m.rows[0].path='scripts/notes46-uncaptured-source.mjs';},'Unknown current context path: scripts/notes46-uncaptured-source.mjs');
  reject('notes46-audit-historical-subject-as-current',m=>{m.rows.find(row=>row.path===target.path).sourceSubjectCommit=HISTORICAL_COMMIT;},'Historical bytes cannot alias a current source subject: '+target.path);
  reject('notes46-audit-historical-epoch-as-current',m=>{m.rows.find(row=>row.path===target.path).sourceEpoch='historical-Notes41';},'Current context epoch: '+target.path);
  reject('notes46-audit-source-role-rebinding',m=>{m.rows.find(row=>row.path===target.path).roles=['historical-context'];},'Current context role binding: '+target.path);
  reject('notes46-audit-current-attempt-rebinding',m=>{m.sourceCommit=HISTORICAL_COMMIT;},'Current context source commit');
  reject('notes46-audit-current-Git-identity-rebinding',m=>{m.rows.find(row=>row.path===target.path).gitBlob='0'.repeat(40);},'Current context Git blob binding: '+target.path);
  reject('notes46-audit-current-fixed-SHA-rebinding',m=>{m.rows.find(row=>row.path===target.path).sha256='0'.repeat(64);},'Current context frozen source identity: '+target.path);
  let contentMutationHits=0;
  reject('notes46-audit-actual-decoded-source-mutation',m=>{const row=m.rows.find(row=>row.path===target.path),bytes=Buffer.from(row.base64,'base64');bytes[0]^=1;row.base64=bytes.toString('base64');contentMutationHits++;},'Current context decoded SHA: '+target.path,()=>assert.equal(contentMutationHits,1));
  reject('notes46-audit-raw-source-cap',m=>{m.rawSourceBytes=CURRENT_LIMIT.rawBytes+1;},'Current context raw byte cap');
  reject('notes46-audit-physical-capture-error-not-waived',m=>{m.errors.push({path:target.path,stage:'bounded-physical-capture',message:'owned missing source fixture'});},'Physical capture errors cannot be waived');
  const grammarFixtures=[
    {name:'notes46-audit-reject-unsupported-interpolated-import-template',source:"const owned = `${ import('./hidden-owned-fixture.mjs') }`;",guard:'Interpolated audit source templates are outside the fixed reviewed grammar'},
    {name:'notes46-audit-reject-expression-dynamic-import',source:'import(ownedNonLiteralModule);',guard:'Unresolved dynamic audit import expression: scripts/owned-audit-grammar-fixture.mjs'}
  ];
  for(const fixture of grammarFixtures){
    let consumed=0,error=null;
    try{consumed++;literalAuditImportSpecifiers(fixture.source,'scripts/owned-audit-grammar-fixture.mjs');}catch(value){error=value;}
    assert.equal(consumed,1);assert(error instanceof assert.AssertionError,'Actual shared audit grammar must reject the owned fixture');assert(error.message.includes(fixture.guard),'Expected actual restricted-grammar guard');
    rows.push({name:fixture.name,expected:'rejection',targetedGuard:fixture.guard,passed:true,actualSharedGrammarCalls:consumed,fixtureScope:'Owned synthetic source-text guard input; never imported or executed',fixtureIdentity:byteIdentity(Buffer.from(fixture.source))});
  }
  assert.equal(rows.length,16);return {schema:'rea-notes46-audit-source-context-controls/v1',status:'passed',positive:1,negative:15,checks:16,rows,actualSourceContextRows:positive.sourceRows,old46ControlsChanged:false,currentProductBehaviorExecuted:false};
}

function outputInventory(root){
  const rows=[];function walk(directory,prefix='',depth=0){assert(depth<=32);currentNoLinks(directory);for(const item of readdirSync(directory,{withFileTypes:true})){assert(!item.isSymbolicLink());const name=currentSafe(prefix+item.name),filename=join(directory,item.name);if(item.isDirectory())walk(filename,name+'/',depth+1);else{assert(item.isFile());const stat=lstatSync(filename);assert(stat.size<=OUTPUT_LIMIT.memberBytes,'New audit output member cap');rows.push({path:name,bytes:stat.size});assert(rows.length<=OUTPUT_LIMIT.files);}}}walk(root);assert(rows.reduce((n,row)=>n+row.bytes,0)<=OUTPUT_LIMIT.rawBytes);return rows;
}

export async function runNotes46InstalledDeliveryAudit({repoRoot,output}={}) {
  assert.equal(typeof repoRoot,'string');assert.equal(typeof output,'string');repoRoot=resolve(repoRoot);output=resolve(output);currentNoLinks(repoRoot);
  assert.equal(repoRoot.toLowerCase(),resolve(dirname(fileURLToPath(import.meta.url)),'..').toLowerCase());
  assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.version,'v24.16.0');
  for(const [name,value]of Object.entries({CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab',GITHUB_REF:CURRENT_BRANCH,GITHUB_EVENT_NAME:'push',GITHUB_JOB:'audit',GITHUB_SERVER_URL:'https://github.com'}))assert.equal(process.env[name],value,name);
  for(const name of ['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT'])assert(/^[1-9][0-9]*$/.test(process.env[name]));assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA));
  const execution=actualExecution(),temporary=realpathSync(process.env.RUNNER_TEMP),expectedOutput=join(temporary,'rea-proof-delivery-audit-'+execution.GITHUB_RUN_ID+'-'+execution.GITHUB_RUN_ATTEMPT);
  assert.equal(output.toLowerCase(),expectedOutput.toLowerCase());currentNoLinks(temporary);assert(!isAbsolute(relative(temporary,output))&&!relative(temporary,output).startsWith('..'));
  mkdirSync(output,{recursive:false});currentNoLinks(output);
  const result={schema:'rea-notes46-installed-proof-delivery-audit/v1',status:'failed',execution,sourceCommit:execution.GITHUB_SHA,sourceEpoch:CURRENT_EPOCH,scope:'Finite actual current source delivery qualification plus an explicitly historical fixed2a broad declaration audit; full audit coverage is not waived.',currentFiniteSourceQualified:false,comprehensiveCoverageAccepted:false,historicalReceiptsRewritten:false,environmentIdentityForged:false,currentCheckoutWrites:0,productExecutions:0,proofVerifierExecutions:0,fullParity:false,superiority:false,artifactLimits:OUTPUT_LIMIT};
  let historical=null,boundary=null,before=null,after=null;
  try {
    assert(FIXED_MANIFEST.bytes>0&&FIXED_HELPER.bytes>0,'WORK-ONLY audit manifest/helper pins are not frozen');assert.equal(CURRENT_SOURCE_PATHS.length,CURRENT_SOURCE_COUNT);
    assert.equal(currentGit(repoRoot,['rev-parse','HEAD']).toString().trim(),execution.GITHUB_SHA);
    assert.equal(currentGit(repoRoot,['rev-list','--parents','-n','1','HEAD']).toString().trim(),execution.GITHUB_SHA+' '+CURRENT_SOURCE_PARENT);
    assert.equal(currentGit(repoRoot,['rev-list','--parents','-n','1',CURRENT_SOURCE_PARENT]).toString().trim(),CURRENT_SOURCE_PARENT+' '+HISTORICAL_COMMIT);
    assert.equal(currentGit(repoRoot,['rev-parse','--show-object-format']).toString().trim(),'sha1');assert.equal(currentGit(repoRoot,['status','--porcelain=v1','--untracked-files=all']).length,0);
    const tree=actualTree(repoRoot);
    // Capture all fixed physical paths before the branded current helper can
    // reject a missing or changed member; diagnostic bytes are never acceptance.
    before=captureCurrentSourceContext(repoRoot,output,'before',tree,execution);result.currentSourceBefore=before.receipt;
    const sourceView=createNotes46InstalledSourceViewFromRoot(repoRoot),budget=notes46InstalledSourceBudget();assert.equal(budget.sourceRows,CURRENT_SOURCE_COUNT);assert.equal(budget.dataRows,CURRENT_DATA_COUNT);assert.equal(budget.envelopeRows,CURRENT_ENVELOPE_COUNT);
    const helperBytes=currentRead(repoRoot,HELPER,CURRENT_LIMIT.helperBytes),qualified=verifyNotes46InstalledSourceEnvelope(sourceView,sourceView.envelopeRows(),FIXED_HELPER,helperBytes);assert.equal(qualified.rows.length,CURRENT_ENVELOPE_COUNT);
    result.currentSourceQualification=verifyNotes46AuditSourceContext(before.envelope,before.expected,execution);result.actualAuditImportClosure=auditLiteralImportClosure(before);
    result.currentAuditControls=currentAuditControls(before,execution);currentSave(output,'notes46-audit-source-controls.json',result.currentAuditControls);
    historical=prepareNotes46HistoricalInputRoot(repoRoot);assertNotes46HistoricalInputRoot(historical);assert.equal(typeof historical.dispose,'function','Reviewed historical context disposal API required');
    boundary=historical.beginExecution('actual-current-audit-fixed2a-historical-subject');
    const historicalOutput=join(output,'historical2a');const historicalResult=runHistoricalDeliveryAuditSubject({currentRepositoryRoot:repoRoot,historicalContext:historical,outputDirectory:historicalOutput,execution});
    result.historicalComprehensiveAudit={inputCommit:HISTORICAL_COMMIT,inputTree:HISTORICAL_TREE,current46AcceptanceClaimed:false,report:historicalResult.report,unresolvedSignals:historicalResult.unresolvedSignals,distinctUnresolvedManifests:historicalResult.distinctUnresolvedManifests,old46ProjectionControls:historicalResult.projectionControls,rawOutputPrefix:'historical2a/',comprehensiveCoveragePassed:false};
    assert.equal(historicalResult.report.status,'completed','Historical adapter must actually complete');assert.deepEqual(historicalResult.report.errors,[],'Historical adapter errors are not an open-coverage reproduction');
    for(const field of ['missingGit','wrongGitMode','declaredSizeMismatch'])assert.equal(historicalResult.report.counts[field],0,'Historical completed delivery signal: '+field);
    const oldControls=historicalResult.projectionControls;assert(oldControls&&oldControls.status==='passed','All actual historical46 controls must be available');
    const oldGroups=[{group:oldControls,positive:6,negative:21,rows:27},{group:oldControls.historicalSourceProjectionControls,positive:2,negative:7,rows:9},{group:oldControls.sourceContextControls,positive:1,negative:9,rows:10}];
    for(const {group,positive,negative,rows:count}of oldGroups){assert(group&&group.status==='passed');assert.equal(group.positive,positive);assert.equal(group.negative,negative);assert.equal(group.observations.length,count);assert(group.observations.every(row=>row.passed===true));assert.equal(group.observations.filter(row=>row.expected==='acceptance').length,positive);assert.equal(group.observations.filter(row=>row.expected==='rejection').length,negative);}
    result.historicalComprehensiveAudit.actualCompletedOld46ControlOutcomesVerified=true;
    const oldFiles=outputInventory(historicalOutput);assert(oldFiles.length<=OUTPUT_LIMIT.historicalFiles);assert(oldFiles.reduce((n,row)=>n+row.bytes,0)<=OUTPUT_LIMIT.historicalRawBytes);assert(oldFiles.every(row=>row.bytes<=OUTPUT_LIMIT.historicalMemberBytes),'Old subgroup member cap remains4MiB');
    const ownedBoundary=boundary;historical.endExecution(boundary);boundary=null;result.historicalContextBeforeDispose=historical.summary();
    const completedBoundary=result.historicalContextBeforeDispose.boundaries.find(row=>row.sequence===ownedBoundary.sequence);assert(completedBoundary&&completedBoundary.outer===true);assert.equal(completedBoundary.label,ownedBoundary.label);assert.equal(completedBoundary.status,'integrity-verified');assert.equal(completedBoundary.pending,false);
    assert.equal(completedBoundary.before.phase,'before-outer-execution');assert.equal(completedBoundary.after.phase,'after-outer-execution');
    for(const phase of [completedBoundary.before,completedBoundary.after]){assert.equal(phase.allSHA256AndGitBlobBytesExact,true);assert.equal(phase.physicalInventoryExact,true);assert(phase.passOrdinal>=1);}
    assert.equal(completedBoundary.after.passOrdinal,completedBoundary.before.passOrdinal+1);assert(completedBoundary.after.passOrdinal>=2);assert(result.historicalContextBeforeDispose.fullIntegrityPasses>=completedBoundary.after.passOrdinal);
    result.historicalBoundaryCompletion={ownedBoundary:completedBoundary,completedOuterBoundaries:result.historicalContextBeforeDispose.completedOuterBoundaries,fullIntegrityPasses:result.historicalContextBeforeDispose.fullIntegrityPasses,pendingOuterBoundary:result.historicalContextBeforeDispose.pendingOuterBoundary,pendingExecutionBoundaries:result.historicalContextBeforeDispose.pendingExecutionBoundaries,contextStatus:result.historicalContextBeforeDispose.contextStatus};
    assert.equal(result.historicalContextBeforeDispose.pendingOuterBoundary,false);assert.equal(result.historicalContextBeforeDispose.pendingExecutionBoundaries,0);assert.equal(result.historicalContextBeforeDispose.contextStatus,'available');assert(result.historicalContextBeforeDispose.completedOuterBoundaries>=1);assert(result.historicalContextBeforeDispose.fullIntegrityPasses>=2);
    sourceView.recheck();after=captureCurrentSourceContext(repoRoot,output,'after',tree,execution);result.currentSourceAfter=after.receipt;verifyNotes46AuditSourceContext(after.envelope,after.expected,execution);
    assert.deepEqual(after.expected,before.expected);assert.deepEqual(after.envelope.rows,before.envelope.rows);assert.equal(currentGit(repoRoot,['rev-parse','HEAD']).toString().trim(),execution.GITHUB_SHA);assert.equal(currentGit(repoRoot,['status','--porcelain=v1','--untracked-files=all']).length,0);
    result.currentFiniteSourceQualified=true;
    // An actual finite qualification cannot turn986 unresolved historical
    // signals across977 manifest names into comprehensive coverage acceptance.
    assert.equal(historicalResult.report.counts.unresolved,986,'Fixed2a historical unresolved signal reproduction');assert.equal(historicalResult.distinctUnresolvedManifests,977,'Fixed2a distinct historical unresolved manifest reproduction');
    assert.equal(historicalResult.report.coverageComplete,false);assert.equal(historicalResult.report.declaredDeliveryComplete,false);assert.equal(historicalResult.report.declaredSizesMatch,false);
    result.status='failed-open-historical-coverage';result.openHistoricalCoverage={signals:986,distinctManifestNames:977,waived:false,remainingOpen:true};
  }catch(error){result.failure={name:error.name,message:String(error.message).slice(0,12000)};}
  finally {
    if(historical){
      if(boundary){try{historical.endExecution(boundary);boundary=null;}catch(error){result.historicalBoundaryFailure={name:error.name,message:String(error.message).slice(0,6000)};}}
      if(!result.historicalContextBeforeDispose){try{result.historicalContextBeforeDispose=historical.summary();}catch(error){result.historicalSummaryFailure={name:error.name,message:String(error.message).slice(0,6000)};}}
      try{
        result.historicalDisposal=historical.dispose();const disposed=result.historicalDisposal;
        assert.equal(disposed.schema,'rea-notes46-owned-historical-input-disposal/v1');assert.equal(disposed.status,'disposed');
        assert.deepEqual(disposed.closedSummaryIdentity,byteIdentity(Buffer.from(JSON.stringify(result.historicalContextBeforeDispose))),'Disposal must bind the actual captured pre-disposal summary');
        assert.equal(disposed.closedSummaryEncoding,'UTF-8 JSON.stringify of the immutable pre-disposal summary, no trailing newline');
        assert.equal(disposed.pendingExecutionBoundaries,0);assert(disposed.fullIntegrityPassesBeforeDisposal>=2);assert.equal(disposed.fullIntegrityPassesBeforeDisposal,result.historicalContextBeforeDispose.fullIntegrityPasses);
        assert.equal(disposed.workflowSourceSHA,execution.GITHUB_SHA);assert.equal(disposed.workflowRun,execution.GITHUB_RUN_ID);assert.equal(disposed.workflowAttempt,execution.GITHUB_RUN_ATTEMPT);assert.equal(disposed.workflowJob,execution.GITHUB_JOB);
        assert.equal(disposed.ownedContainerRemoved,true);assert.equal(disposed.unrelatedPathsRemoved,false);result.historicalDisposalQualified=true;
      }catch(error){result.historicalDisposalQualified=false;result.status='failed-historical-disposal';result.historicalDisposalFailure={name:error.name,message:String(error.message).slice(0,6000)};}
    }
    if(before&&!after){try{after=captureCurrentSourceContext(repoRoot,output,'after',actualTree(repoRoot),execution);result.currentSourceAfter=after.receipt;}catch(error){result.afterCaptureFailure={name:error.name,message:String(error.message).slice(0,6000)};}}
  }
  result.actualOutputFilesBeforeFinalReport=outputInventory(output);result.uploadAcceptanceClaimed=false;result.artifactPackagingComplete=false;
  currentSave(output,'notes46-audit-report.json',result);
  // Comprehensive historical delivery remains failed, even if the finite
  // current group was separately authenticated successfully.
  process.exitCode=1;console.log(JSON.stringify({schema:result.schema,status:result.status,currentFiniteSourceQualified:result.currentFiniteSourceQualified,comprehensiveCoverageAccepted:false,sourceCommit:execution.GITHUB_SHA}));return result;
}


// Historical handler/declaration/projection/control bodies below are source-preserved.
function runHistoricalDeliveryAuditSubject({currentRepositoryRoot,historicalContext,outputDirectory,execution}) {
  assertNotes46HistoricalInputRoot(historicalContext);
  const parentOutput=dirname(outputDirectory);
const ROOT = historicalContext.root;
const GIT_REPOSITORY_ROOT = currentRepositoryRoot;
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
  timed(); const r = spawnSync('git', ['--no-replace-objects', '-C', GIT_REPOSITORY_ROOT, ...args], { encoding: null, windowsHide: true, timeout: 45000, maxBuffer, env: readOnlyGitEnvironment() });
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
  report.counts.manifestBytes+=b.length; assert(report.counts.manifestBytes+closedProjectionReadBytes <= LIMIT.manifestBytes,'Manifest aggregate bound exceeded');
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
schemas('rea-independent-review-preservation/v1',[spec('snapshots','path','root'),spec('reviewedSources','snapshot_path','root',{optionalPointer:true,optionalBytes:true})]);
schemas('rea-automation-routing-preservation/v1',[spec('entries','snapshot','studio')]);
schemas('rea-publication-git-directory-closure/v1',[spec('files')]);
schemas('rea-publication-editor-git-observer-transition/v1',[spec('records')]);
schemas('rea-publication-editor-save-git-closure/v1',[spec('files')]);
schemas('rea-windows-path-source-proof-transition/v1',[spec('records','path','root')]);
schemas('rea-editor-vault-root-installation-preservation/v1',[spec('records','publicPath','root')]);
schemas('rea-sketch-layout-static-route-freeze/v1',[spec('records','path','prefix',{suffix:'.snapshot',inertManifest:'products/rea-studio/results/sketch-layout-reviewed-installation-20261013/shared-route/frozen/freeze-manifest.json.snapshot'})]);
schemas('rea-sketch-layout-independent-source-plan-review-freeze/v1',[spec('inventory','path','prefix',{suffix:'.snapshot',inertManifest:'products/rea-studio/results/sketch-layout-reviewed-installation-20261013/source-plan-independent-review/frozen/freeze-manifest.json.snapshot'})]);
schemas('rea-notes-inline-browser-publication-addendum-freeze/v1',[spec('records','path','prefix',{suffix:'.snapshot',inventoryAlternative:true,inertManifest:'products/rea-studio/apps/notes/results/inline-confirmation-followup/browser-publication-plan/frozen/freeze-manifest.json.snapshot'})]);
schemas('rea-notes-browser-qualification-correction-strict-freeze/v1',[spec('records','path','prefix',{suffix:'.snapshot',inventoryAlternative:true,inertManifest:'products/rea-studio/apps/notes/results/inline-confirmation-followup/browser-qualification-correction/frozen/freeze-manifest.json.snapshot'})]);
schemas(`rea-cloud-flow-vault-finite-preservation/v1 rea-cloud-flow-vault-controls-preservation/v1 rea-cloud-archive-composition-failure-preservation/v1 rea-cloud-archive-metadata-failure-preservation/v1 rea-cloud-archive-prerequisites-failure-preservation/v1 rea-cloud-archive-aes-finite-pass-preservation/v1 rea-cloud-windows-path-finite-pass-preservation/v1 rea-cloud-windows-path-installed-pass-preservation/v1 rea-cloud-flow-vault-browser-pass-preservation/v1`,[spec('records')]);
handlers.set('rea-vault-history-docs-preservation/v1',[spec('snapshots'),spec('previousReadme','path','root',{single:true})]);

// Closed source-epoch projections added on 2026-10-18. These six exact documents
// do not create a schema-wide exception. Work paths remain provenance, never Git
// delivery pointers. Stored gzip bytes are distinct from decoded identities.
const DIAGNOSTIC_PREFIX = 'products/rea-studio/results/cloud-archive-native-metadata-diagnostic-20261016';
const NOTES36_PREFIX = 'products/rea-studio/results/notes36-source-transition-20261016';
const RECOVERY_PREFIX = 'work/cloud-recovery-20261015/notes36-source-installation-e655-20261016';
const CLOSED_EPOCH_HEAD = 'e655fd909c7bed411c5bee50ce248dd6fe0787c6';
const CLOSED_EPOCH_DOCUMENTS=new Map([
  [
    "products/rea-studio/results/cloud-archive-native-metadata-diagnostic-20261016/preservation-manifest.json",
    {
      "path": "products/rea-studio/results/cloud-archive-native-metadata-diagnostic-20261016/preservation-manifest.json",
      "bytes": 56274,
      "sha256": "7716b2d12995f4314af2e46aba73eccab731a05825e0db3525d7381792bc902a",
      "schema": "rea-public-native-metadata-diagnostic-preservation/v1",
      "kind": "diagnostic-stored"
    }
  ],
  [
    "products/rea-studio/results/cloud-archive-native-metadata-diagnostic-20261016/review-records/e655-full1100-installation-gate-independent-review-20261016.json.snapshot",
    {
      "path": "products/rea-studio/results/cloud-archive-native-metadata-diagnostic-20261016/review-records/e655-full1100-installation-gate-independent-review-20261016.json.snapshot",
      "bytes": 1601,
      "sha256": "c7c80ad846648ca7175f9ff0773f7b228dd5e860a7a2e33af37c4e1c3526f163",
      "schema": "rea-e655-full1100-pre-notes36-installation-gate-independent-review/v1",
      "kind": "review-full-gate"
    }
  ],
  [
    "products/rea-studio/results/cloud-archive-native-metadata-diagnostic-20261016/review-records/native-diagnostic-preservation-filer-complete-independent-source-review-20261016.json.snapshot",
    {
      "path": "products/rea-studio/results/cloud-archive-native-metadata-diagnostic-20261016/review-records/native-diagnostic-preservation-filer-complete-independent-source-review-20261016.json.snapshot",
      "bytes": 4828,
      "sha256": "44534413a5275af5bc06bc4d92108cf6e9315c93e02692ea3faacfd0fde159d4",
      "schema": "rea-native-diagnostic-preservation-filer-complete-independent-source-review/v1",
      "kind": "review-filer"
    }
  ],
  [
    "products/rea-studio/results/cloud-archive-native-metadata-diagnostic-20261016/review-records/root-notes36-source-installation-decision-20261016.json.snapshot",
    {
      "path": "products/rea-studio/results/cloud-archive-native-metadata-diagnostic-20261016/review-records/root-notes36-source-installation-decision-20261016.json.snapshot",
      "bytes": 4068,
      "sha256": "9c808fc8c0874babfdd122c0dd1e006a96275e718e412a2527b0ede401da62e1",
      "schema": "rea-root-notes36-source-installation-decision/v1",
      "kind": "review-install-decision"
    }
  ],
  [
    "products/rea-studio/results/notes36-source-transition-20261016/installation-plan.json",
    {
      "path": "products/rea-studio/results/notes36-source-transition-20261016/installation-plan.json",
      "bytes": 26842,
      "sha256": "489728f55869696952ef23649fedb163e637c507d0cddd09edc268ec47986c43",
      "schema": "rea-Notes36-source-installation-plan/v1",
      "kind": "notes-plan"
    }
  ],
  [
    "products/rea-studio/results/notes36-source-transition-20261016/installation-receipt.json",
    {
      "path": "products/rea-studio/results/notes36-source-transition-20261016/installation-receipt.json",
      "bytes": 36636,
      "sha256": "e8ed915fdac88873f5905e53ab0b798b73eddef84a85a2db704f0dbe686853a6",
      "schema": "rea-notes36-actual-source-installation/v1",
      "kind": "notes-journal"
    }
  ]
]);
const CLOSED_EPOCH_DEPENDENCIES=new Map([
  [
    "filerAuthority",
    {
      "key": "filerAuthority",
      "path": "products/rea-studio/results/cloud-archive-native-metadata-diagnostic-20261016/review-records/native-diagnostic-preservation-filer-source-20261016-next/source-authority.json.snapshot",
      "bytes": 9834,
      "sha256": "4accfd0de07a5a94368814382c97965eccc3596f8c28ef19170e50b7e470a50a"
    }
  ],
  [
    "completeAuthority",
    {
      "key": "completeAuthority",
      "path": "products/rea-studio/results/cloud-archive-native-metadata-diagnostic-20261016/review-records/notes36-installed-implementation-next/complete-r1-next/copy-authority.json.snapshot",
      "bytes": 36571,
      "sha256": "d250c64d54dbd4638b35d715e123aa48a399d51a2a91a38ced51e8dfcfff1f47"
    }
  ],
  [
    "docsAuthority",
    {
      "key": "docsAuthority",
      "path": "products/rea-studio/results/cloud-archive-native-metadata-diagnostic-20261016/review-records/notes36-installed-implementation-next/pending-install-index-docs-r1-next/copy-authority.json.snapshot",
      "bytes": 3273,
      "sha256": "4676f2ac53ef9f7e62be314433de255e0bd80453cd4bf9a21ba354b6a066f0f0"
    }
  ],
  [
    "integratedPeer",
    {
      "key": "integratedPeer",
      "path": "products/rea-studio/results/cloud-archive-native-metadata-diagnostic-20261016/review-records/notes36-complete25-producer-controls-r3-complete-independent-source-review-20261016.json.snapshot",
      "bytes": 8067,
      "sha256": "54c508bf0f31c59f4e68b76c7c2301bde4c887b5922a9dac18ca363d71c9a921"
    }
  ],
  [
    "bytePeer",
    {
      "key": "bytePeer",
      "path": "products/rea-studio/results/cloud-archive-native-metadata-diagnostic-20261016/review-records/notes36-complete25-independent-byte-data-audit-1245-20261016.json.snapshot",
      "bytes": 1735,
      "sha256": "c5b4b99880b74b71129d4a5669aab119b9d27c51984aad2d5daa4e7a10ce7fcd"
    }
  ],
  [
    "docsPeer",
    {
      "key": "docsPeer",
      "path": "products/rea-studio/results/cloud-archive-native-metadata-diagnostic-20261016/review-records/notes36-conditional-index-docs-independent-source-review-20261016.json.snapshot",
      "bytes": 2242,
      "sha256": "0bcea94027a347dc5a24b317e773c27620272ffe7678a636a8209c6ac47877e1"
    }
  ],
  [
    "declaration",
    {
      "key": "declaration",
      "path": "products/rea-studio/results/notes36-source-transition-20261016/current-source-declaration.json",
      "bytes": 60830,
      "sha256": "c0a488389094d898a7f6d308e9977192327f194ce3d271135dfcd2007e8a73bb"
    }
  ],
  [
    "rolePlan",
    {
      "key": "rolePlan",
      "path": "products/rea-studio/results/notes36-source-transition-20261016/publication-artifact-role-plan.json",
      "bytes": 26659,
      "sha256": "384ea1e7f5f50a1ca14eb46e31bf2decdd0966ebbbe2c7f58171944dda775154"
    }
  ]
]);
const CLOSED_EPOCH_BEFORE_IMAGES=new Map([
  [
    ".github/workflows/notes-installed-cloud.yml",
    "products/rea-studio/results/notes36-source-transition-20261016/historical-workflows/notes-installed-cloud.yml.snapshot"
  ],
  [
    ".github/workflows/notes-new-todo-experiment-cloud.yml",
    "products/rea-studio/results/notes36-source-transition-20261016/historical-workflows/notes-new-todo-experiment-cloud.yml.snapshot"
  ],
  [
    "products/rea-studio/apps/notes/README.md",
    "products/rea-studio/experiments/notes-new-todo/before/products/rea-studio/apps/notes/README.md.snapshot"
  ],
  [
    "products/rea-studio/apps/notes/client.mjs",
    "products/rea-studio/experiments/notes-new-todo/before/products/rea-studio/apps/notes/client.mjs.snapshot"
  ],
  [
    "products/rea-studio/apps/notes/server.mjs",
    "products/rea-studio/experiments/notes-new-todo/before/products/rea-studio/apps/notes/server.mjs.snapshot"
  ],
  [
    "scripts/editor-vault-proof-migration.mjs",
    "products/rea-studio/results/notes36-source-transition-20261016/before-source/scripts/editor-vault-proof-migration.mjs.snapshot"
  ],
  [
    "scripts/publication-integrity-controls.mjs",
    "products/rea-studio/results/notes36-source-transition-20261016/before-source/scripts/publication-integrity-controls.mjs.snapshot"
  ],
  [
    "scripts/verify-cloud-publication.mjs",
    "products/rea-studio/results/notes36-source-transition-20261016/before-source/scripts/verify-cloud-publication.mjs.snapshot"
  ],
  [
    "README.md",
    "products/rea-studio/results/notes36-source-transition-20261016/index-before/README.md.snapshot"
  ],
  [
    "CLOUD-VERIFICATION.md",
    "products/rea-studio/results/notes36-source-transition-20261016/index-before/CLOUD-VERIFICATION.md.snapshot"
  ],
  [
    "products/rea-studio/STATUS.json",
    "products/rea-studio/results/notes36-source-transition-20261016/index-before/products/rea-studio/STATUS.json.snapshot"
  ]
]);
let closedProjectionReadBytes=0;
const closedProjectionReadCache=new Map();
function projectionRead(path, cap=LIMIT.singleManifestBytes) {
  if(closedProjectionReadCache.has(path)){const b=closedProjectionReadCache.get(path);assert(b.length<=cap);return b;}
  const b=trackedBytes(path,cap);closedProjectionReadBytes+=b.length;
  assert(closedProjectionReadBytes+report.counts.manifestBytes<=LIMIT.manifestBytes,'Combined manifest/projection read bound exceeded');
  closedProjectionReadCache.set(path,b);return b;
}

// These immutable Notes36 documents describe source identities at their declared
// epoch. Later logical paths are separately authenticated actual current inputs.
// Only the following seven exact logical names may acquire physical carriers;
// neither an arbitrary SHA match nor a blanket historical read overlay is used.
const NOTES36_HISTORICAL_PROJECTION_NAMES = new Set([
  '.github/workflows/notes-new-todo-installed-cloud.yml',
  'products/rea-studio/apps/notes/README.md',
  'products/rea-studio/apps/notes/client.mjs',
  'products/rea-studio/apps/notes/server.mjs',
  'products/rea-studio/apps/notes/todo.integration.test.mjs',
  'scripts/verify-cloud-publication.mjs',
  'scripts/publication-integrity-controls.mjs',
]);
let notes41ProjectionBinding;
function currentSourceEpochBinding() {
  if (notes41ProjectionBinding) return notes41ProjectionBinding;
  // Proposed next-protocol interface: source view only, with ten actual reader
  // rows, ten reader carriers and the additional exact old-controls carrier.
  const view = createNotes41PublicationSourceViewFromRoot(ROOT);
  const rows = view.envelopeRows();
  assert.equal(rows.length,145,'Complete audit consumer/source-carrier dependency group');
  assert.equal(view.plan.currentRecordReaders.length,10);
  assert.equal(view.plan.oldNotes36Source,'698d2e301765d1b878fb251b3d59dadb5a3c9bac');
  const current = new Map(view.plan.currentSourceRows.map(row=>[row.path,identity(row)]));
  assert.equal(current.size,126);
  const authenticated = [];
  for (const row of rows) {
    const b=projectionRead(row.path);
    assert.deepEqual({bytes:b.length,sha256:sha(b)},identity(row),'Actual source-data Git identity differs: '+row.path);
    authenticated.push({path:row.path,...identity(row),gitBlob:trees.get(row.path).oid});
  }
  const excludedCurrent = new Map();
  for (const name of ['scripts/verify-cloud-publication.mjs','scripts/publication-integrity-controls.mjs']) {
    assert(!current.has(name),'Excluded self-source must not form a source hash cycle');
    const b=projectionRead(name);excludedCurrent.set(name,{bytes:b.length,sha256:sha(b)});
  }
  // The expected helper SHA comes from the actual committed current producer's
  // fixed literal. Embedding the final helper or manifest SHA here would create
  // audit -> helper -> manifest -> audit and is intentionally prohibited.
  const producer=projectionRead('scripts/verify-cloud-publication.mjs').toString('utf8');
  const literals=[...producer.matchAll(/^const NOTES41_PUBLICATION_HELPER = \{ path: 'scripts\/notes41-publication-source-view\.mjs', bytes: ([1-9][0-9]*), sha256: '([0-9a-f]{64})' \};$/gm)];
  assert.equal(literals.length,1,'One exact current producer helper literal');
  const helper={path:'scripts/notes41-publication-source-view.mjs',bytes:Number(literals[0][1]),sha256:literals[0][2]};
  assert(helper.bytes<=256*1024);const helperBytes=projectionRead(helper.path,256*1024);
  assert.deepEqual({bytes:helperBytes.length,sha256:sha(helperBytes)},identity(helper),'Current producer fixed helper identity differs');
  const rawBytes=rows.reduce((sum,row)=>sum+row.bytes,helper.bytes);assert(rawBytes<=8*1024*1024);
  const controls=view.plan.historicalPublicationControls;
  assert(controls&&controls.logicalPath==='scripts/publication-integrity-controls.mjs');
  assert.deepEqual(controls.before,{bytes:74921,sha256:'6178c7eedc355b2f5e9ba9be009d6558b0fcf99158803437268289682ee1b51d'});
  const importedModule={path:'scripts/editor-vault-proof-migration.mjs',bytes:186405,sha256:'6519e83c4315e60b503b67f306ed0a265cbcc141ff48b79db86d7da457026abf'};
  const importedBytes=projectionRead(importedModule.path,512*1024);
  assert.deepEqual({bytes:importedBytes.length,sha256:sha(importedBytes)},identity(importedModule),'Imported immutable source module identity differs');
  const currentSelf=[...excludedCurrent].map(([path,id])=>({path,...id,gitBlob:trees.get(path).oid}));
  report.sourceEpochAuthentication={
    schema:'rea-audit-separate-current-source-authentication/v2',
    sourceView:view.summary(),dataRows:145,separateFixedHelperRows:1,flatSourceRows:146,
    combinedRawSourceBytes:rawBytes,helper:{...helper,gitBlob:trees.get(helper.path).oid},
    actualGitAuthenticatedData:authenticated,actualExcludedCurrentProducerAndControls:currentSelf,actualImportedImmutableSourceModule:{...importedModule,gitBlob:trees.get(importedModule.path).oid},sourceContextCaptureRows:149,
    historicalLogicalEpoch:view.plan.oldNotes36Source,logicalPathsSubstitutedInCurrentGroup:false,
    oldManifestBytesRewritten:false,proofVerifierExecutions:0,
    sourceDependencyContentsUploadedByAudit:false,sourceContextEnvelopeCapturedAndReadbackPrepared:false,
    dependencyContentsRemainInCommittedSourceAndSeparatePublicationCollectorRoles:true,
    currentBehaviorAcceptanceClaimed:false,globalCoverageOrDeliveryPassClaimed:false,
  };
  notes41ProjectionBinding={view,current,excludedCurrent,rows,helper,importedModule};
  prepareSourceContextEnvelope(notes41ProjectionBinding);
  return notes41ProjectionBinding;
}
function historicalProjectionRow(declaration,row,read=projectionRead) {
  const expected=CLOSED_EPOCH_DOCUMENTS.get(declaration.path);
  exactContext({name:declaration.path,data:{schema:declaration.schema},bytes:declaration.bytes,sha256:declaration.sha256},expected);
  const scopedRole=expected.kind==='notes-plan'&&['current36-source','fixed-current-tooling'].includes(row.projectionRole)
    ||expected.kind==='notes-journal'&&row.projectionRole==='actual-installed-after-target';
  if(!scopedRole||!NOTES36_HISTORICAL_PROJECTION_NAMES.has(row.path))return row;
  const binding=currentSourceEpochBinding(),declared=identity(row);
  const physical=binding.view.historicalReadPath(row.path,declared);
  safe(physical);assert.notEqual(physical,row.path,'A historical projection needs an explicit distinct physical carrier');
  const expectedCurrent=binding.current.get(row.path)??binding.excludedCurrent.get(row.path);
  assert(expectedCurrent,'No separately authenticated actual current source: '+row.path);
  const live=read(row.path,LIMIT.singleManifestBytes);
  assert.deepEqual({bytes:live.length,sha256:sha(live)},expectedCurrent,'Actual current logical source differs: '+row.path);
  return {...row,path:physical,historicalLogicalProjection:{
    declaredLogicalPath:row.path,declaredIdentity:declared,declaredProjectionRole:row.projectionRole,
    declaredSourceEpoch:binding.view.plan.oldNotes36Source,physicalDeliveryPath:physical,
    actualCurrentLogicalIdentity:expectedCurrent,actualCurrentGitBlob:trees.get(row.path).oid,
    logicalPathAtHistoricalIdentityClaimedCurrent:false,currentLogicalDeliveryClaimedByHistoricalRow:false,
    currentBehavioralAcceptanceClaimed:false,
  }};
}
function recheckCurrentSourceEpochBinding() {
  if(!notes41ProjectionBinding)return;
  const binding=notes41ProjectionBinding;binding.view.recheck();
  for(const row of [...binding.rows,binding.helper,binding.importedModule,...[...binding.excludedCurrent].map(([path,id])=>({path,...id}))]){
    const b=trackedBytes(row.path);
    assert.deepEqual({bytes:b.length,sha256:sha(b)},identity(row),'Source epoch changed during audit: '+row.path);
  }
  report.sourceEpochAuthentication.finalSourceRecheckPassed=true;
}
// Bounded source bytes only. This validator decodes inert source payloads; it
// never imports, evaluates or invokes the contents carried by the envelope.
const SOURCE_CONTEXT_LIMIT = Object.freeze({dataRows:145,helperRows:1,currentSelfRows:2,importedModuleRows:1,rows:149,singleSourceBytes:512*1024,rawBytes:8*1024*1024,decodedBytes:12*1024*1024,storedBytes:4*1024*1024});
const SOURCE_CONTEXT_ROLE = 'source-context.json.gz.snapshot';
function contextExpectedRows(binding) {
  const rows=[
    ...binding.rows.map(row=>({path:row.path,...identity(row),gitBlob:trees.get(row.path).oid,sourceGroup:'mandatory-source-data'})),
    {path:binding.helper.path,...identity(binding.helper),gitBlob:trees.get(binding.helper.path).oid,sourceGroup:'fixed-helper'},
    ...[...binding.excludedCurrent].map(([path,id])=>({path,...id,gitBlob:trees.get(path).oid,sourceGroup:'actual-current-producer-controls'})),
    {...binding.importedModule,gitBlob:trees.get(binding.importedModule.path).oid,sourceGroup:'immutable-imported-source-module'},
  ];
  assert.equal(binding.rows.length,145);assert.equal(binding.excludedCurrent.size,2);assert.equal(rows.length,149);
  assert.equal(new Set(rows.map(row=>row.path.toLowerCase())).size,149,'Disjoint complete source-context roster');
  return rows;
}
function verifySourceContextEnvelope(envelope,expectedRows) {
  assert(envelope&&typeof envelope==='object'&&!Array.isArray(envelope));
  assert.equal(envelope.schema,'rea-proof-delivery-audit-complete-source-context/v2');
  assert.equal(envelope.repository,'Ginderlax/rea-research-lab');assert.equal(envelope.sourceCommit,report.provenance.sourceCommit);
  assert.deepEqual(envelope.groups,{mandatorySourceData:145,fixedHelper:1,actualCurrentProducerControls:2,immutableImportedSourceModule:1});
  assert.equal(envelope.sourceRows,149);assert(Array.isArray(envelope.rows));assert.equal(envelope.rows.length,149);
  assert(Number.isSafeInteger(envelope.rawSourceBytes)&&envelope.rawSourceBytes>=0&&envelope.rawSourceBytes<=SOURCE_CONTEXT_LIMIT.rawBytes,'Source-context aggregate raw byte cap');
  assert.equal(envelope.sourceCodeExecutedFromEnvelope,false);assert.equal(envelope.uploadAcceptanceClaimed,false);
  assert(Array.isArray(expectedRows));assert.equal(expectedRows.length,149);
  const expected=new Map(expectedRows.map(row=>[safe(row.path),row]));assert.equal(expected.size,149);
  assert.equal(new Set(expectedRows.map(row=>row.path.toLowerCase())).size,149);
  const seen=new Set();let total=0;
  for(const row of envelope.rows){
    safe(row.path);const folded=row.path.toLowerCase();assert(!seen.has(folded),'Duplicate source-context path: '+row.path);seen.add(folded);
    const wanted=expected.get(row.path);assert(wanted,'Unknown source-context path: '+row.path);
    assert.deepEqual(identity(row),identity(wanted),'Pinned source-context identity differs: '+row.path);
    assert.equal(row.gitBlob,wanted.gitBlob,'Pinned source-context Git blob differs: '+row.path);
    assert(/^[0-9a-f]{40}$/.test(row.gitBlob));assert.equal(row.sourceGroup,wanted.sourceGroup,'Source-context group differs: '+row.path);
    assert(row.bytes<=SOURCE_CONTEXT_LIMIT.singleSourceBytes,'Individual source-context byte cap');
    assert(typeof row.base64==='string'&&row.base64.length===4*Math.ceil(row.bytes/3),'Exact source-context base64 length: '+row.path);
    assert(!/[^A-Za-z0-9+\x2f=]/.test(row.base64),'Canonical source-context base64 alphabet');
    const b=Buffer.from(row.base64,'base64');assert.equal(b.toString('base64'),row.base64,'Canonical source-context base64 encoding');
    assert.equal(b.length,row.bytes,'Decoded source-context length differs: '+row.path);assert.equal(sha(b),row.sha256,'Decoded source-context SHA differs: '+row.path);
    const oid=createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');assert.equal(oid,row.gitBlob,'Decoded source-context Git blob differs: '+row.path);
    total+=b.length;assert(total<=SOURCE_CONTEXT_LIMIT.rawBytes,'Source-context aggregate raw byte cap');
  }
  assert.equal(seen.size,149);assert.equal(total,envelope.rawSourceBytes,'Source-context raw byte accounting differs');
  return {rows:149,rawSourceBytes:total,allExpectedPathsExact:true,allDecodedBytesSHAAndGitAuthenticated:true};
}
function prepareSourceContextEnvelope(binding) {
  assert(output);assert(!binding.sourceContext,'Source context may be prepared only once');
  const expectedRows=contextExpectedRows(binding),rows=[];
  for(const expected of expectedRows){const b=projectionRead(expected.path,SOURCE_CONTEXT_LIMIT.singleSourceBytes);assert.deepEqual({bytes:b.length,sha256:sha(b)},identity(expected),'Captured source-context bytes differ: '+expected.path);rows.push({...expected,base64:b.toString('base64')});}
  const envelope={schema:'rea-proof-delivery-audit-complete-source-context/v2',repository:'Ginderlax/rea-research-lab',sourceCommit:report.provenance.sourceCommit,sourceRows:149,groups:{mandatorySourceData:145,fixedHelper:1,actualCurrentProducerControls:2,immutableImportedSourceModule:1},rawSourceBytes:rows.reduce((sum,row)=>sum+row.bytes,0),sourceCodeExecutedFromEnvelope:false,uploadAcceptanceClaimed:false,workflowSourceCapturedSeparately:true,rows};
  const verified=verifySourceContextEnvelope(envelope,expectedRows),decoded=Buffer.from(JSON.stringify(envelope));
  assert(decoded.length<=SOURCE_CONTEXT_LIMIT.decodedBytes,'Source-context decoded JSON byte cap');
  const stored=gzipSync(decoded,{mtime:0});assert(stored.length<=SOURCE_CONTEXT_LIMIT.storedBytes,'Source-context stored gzip byte cap');
  writeFileSync(join(output,SOURCE_CONTEXT_ROLE),stored,{flag:'wx'});filesWritten.set(SOURCE_CONTEXT_ROLE,stored.length);
  const observed=readFileSync(join(output,SOURCE_CONTEXT_ROLE));assert(observed.equals(stored),'Source-context exclusive gzip write/readback differs');
  const unpacked=gunzipSync(observed,{maxOutputLength:SOURCE_CONTEXT_LIMIT.decodedBytes});assert(unpacked.equals(decoded),'Source-context decoded readback differs');
  verifySourceContextEnvelope(JSON.parse(unpacked),expectedRows);
  binding.sourceContext={envelope,expectedRows};
  report.sourceEpochAuthentication.sourceContextEnvelopeCapturedAndReadbackPrepared=true;
  report.sourceEpochAuthentication.sourceContextEnvelope={path:SOURCE_CONTEXT_ROLE,sourceRows:149,groups:envelope.groups,...verified,decoded:{bytes:decoded.length,sha256:sha(decoded)},stored:{bytes:observed.length,sha256:sha(observed)},limits:SOURCE_CONTEXT_LIMIT,capturedAndReadbackPrepared:true,sourceContentsCaptured:true,artifactPackagingComplete:false,contentsUploadedAccepted:false,artifactQualificationPending:true,workflowCapturedSeparately:true};
}
function sourceContextControls() {
  const binding=currentSourceEpochBinding();assert(binding.sourceContext);
  const {envelope,expectedRows}=binding.sourceContext,observations=[];
  function check(name,edit,expectedMessage){
    const changed=structuredClone(envelope);edit(changed);let error=null;try{verifySourceContextEnvelope(changed,expectedRows);}catch(e){error=e;}
    assert(error,'Source-context mutation accepted: '+name);assert(String(error.message).includes(expectedMessage),'Source-context rejected at unexpected guard: '+name+': '+error.message);
    observations.push({name,expected:'rejection',passed:true,targetedGuard:expectedMessage});
  }
  const valid=verifySourceContextEnvelope(envelope,expectedRows);assert.equal(valid.rows,149);
  observations.push({name:'positive-exact149-source-context-bytes-and-rosters',expected:'acceptance',passed:true});
  check('reject-missing-context-row',m=>{m.rows.pop();},'149');
  check('reject-duplicate-context-path',m=>{m.rows[1]=structuredClone(m.rows[0]);},'Duplicate source-context path');
  check('reject-unknown-context-path',m=>{m.rows[0].path='scripts/unlisted-audit-context-source.mjs';},'Unknown source-context path');
  check('reject-context-SHA-rebinding',m=>{m.rows[0].sha256='0'.repeat(64);},'Pinned source-context identity differs');
  check('reject-context-decoded-content-mutation',m=>{const row=m.rows.find(row=>row.bytes>0),b=Buffer.from(row.base64,'base64');b[0]^=1;row.base64=b.toString('base64');},'Decoded source-context SHA differs');
  check('reject-context-source-group-rebinding',m=>{m.rows[0].sourceGroup='fixed-helper';},'Source-context group differs');
  check('reject-context-raw-byte-cap',m=>{m.rawSourceBytes=SOURCE_CONTEXT_LIMIT.rawBytes+1;},'Source-context aggregate raw byte cap');
  check('reject-context-Git-identity-rebinding',m=>{m.rows[0].gitBlob='0'.repeat(40);},'Pinned source-context Git blob differs');
  check('reject-imported-immutable-module-identity-rebinding',m=>{const row=m.rows.find(row=>row.sourceGroup==='immutable-imported-source-module');assert(row);row.sha256='0'.repeat(64);},'Pinned source-context identity differs: scripts/editor-vault-proof-migration.mjs');
  assert.equal(observations.filter(row=>row.expected==='acceptance').length,1);assert.equal(observations.filter(row=>row.expected==='rejection').length,9);
  report.sourceContextControls={status:'passed',positive:1,negative:9,observations,sourceCodeExecutedFromEnvelope:false,uploadedArtifactAcceptanceClaimed:false};
}

function exactContext(ctx, expected) {
  assert(expected, 'No reviewed exact source-epoch projection');
  assert.equal(ctx.name, expected.path, 'Closed projection path differs');
  assert.equal(ctx.data.schema, expected.schema, 'Closed projection schema differs');
  assert.deepEqual({bytes:ctx.bytes,sha256:ctx.sha256}, identity(expected), 'Closed projection source identity differs');
}
function projectionBody(ctx, read = projectionRead) {
  const definition = CLOSED_EPOCH_DOCUMENTS.get(ctx.name);
  assert(definition, 'No reviewed exact source-epoch projection');
  assert.equal(ctx.data.schema, definition.schema, 'Closed projection schema differs');
  const m = ctx.data, rows = [], notes = [], dependencies = [];
  const add = (path, id, role) => {
    safe(path); assert(!path.startsWith('work/'), 'Local recovery path is not a public delivery pointer');
    rows.push({path,...identity(id),projectionRole:role});
  };
  const dependency = key => {
    const pin = CLOSED_EPOCH_DEPENDENCIES.get(key); assert(pin,'Unknown closed dependency');
    const b = read(pin.path, LIMIT.singleManifestBytes); assert.equal(b.length,pin.bytes,'Closed dependency size differs');
    assert.equal(sha(b),pin.sha256,'Closed dependency SHA differs');
    add(pin.path,pin,'exact-public-source-context'); dependencies.push(pin.path);
    return JSON.parse(b.toString('utf8').replace(/^\uFEFF/,''));
  };
  const doc = index => {
    const pin = [...CLOSED_EPOCH_DOCUMENTS.values()][index], b = read(pin.path,LIMIT.singleManifestBytes);
    const c = {name:pin.path,bytes:b.length,sha256:sha(b),data:JSON.parse(b.toString('utf8').replace(/^\uFEFF/,''))};
    exactContext(c,pin); return c.data;
  };
  const ref = (value, expected) => { assert.equal(value.path,expected.path); assert.deepEqual(identity(value),identity(expected)); };
  const beforeImage = path => {
    const target = CLOSED_EPOCH_BEFORE_IMAGES.get(path); assert(target,'No reviewed historical before-image alias'); return target;
  };
  const uniqueRows = (values, count, key='path') => {
    assert(Array.isArray(values)); assert.equal(values.length,count,'Closed row count differs');
    const seen = new Set(); for(const r of values){safe(r[key]);assert(!seen.has(r[key]),'Duplicate closed row');seen.add(r[key]);} return seen;
  };
  if (definition.kind === 'diagnostic-stored') {
    assert.equal(m.sourceCommit,CLOSED_EPOCH_HEAD);assert.equal(m.sourceHead,CLOSED_EPOCH_HEAD);
    assert.equal(m.runId,'38938239800');assert.equal(m.jobId,'117099039133');assert.equal(m.artifactId,'12062101383');
    uniqueRows(m.roles,40,'role');uniqueRows(m.sourceAliases,70,'innerMember');
    const roleNames = new Set();
    for(const r of m.roles){
      assert(!roleNames.has(r.role));roleNames.add(r.role);const stored=identity(r.stored),decoded=identity(r.decoded);
      assert(['identity','gzip'].includes(r.stored.encoding),'Unknown stored transport encoding');
      const suffix = r.stored.encoding==='gzip'?'.gz.snapshot':'.snapshot';
      assert.equal(r.stored.path,DIAGNOSTIC_PREFIX+'/payload/'+stored.sha256+suffix,'Stored content-addressed public path differs');
      if(r.stored.encoding==='identity')assert.deepEqual(stored,decoded,'Identity transport differs from decoded identity');
      else { assert.equal(r.role,'raw-tree-api','Unexpected gzip role');assert.notEqual(stored.sha256,decoded.sha256); }
      add(r.stored.path,stored,'stored-'+r.stored.encoding+'-transport');
    }
    for(const a of m.sourceAliases){identity(a.decoded);assert.equal(a.retainedWithinExactPortableZip,true);assert.equal(a.role,'uploaded/'+a.innerMember);assert(a.innerMember.startsWith('source/')&&a.innerMember.endsWith('.snapshot'),'Invalid portable source member');}
    const outer=m.roles.find(r=>r.role==='exact-original-uploaded-outer-zip'),inner=m.roles.find(r=>r.role==='exact-portable-inner-evidence-zip');
    assert(outer&&inner);assert.deepEqual(identity(outer.decoded),identity(m.artifactIdentity));assert.deepEqual(identity(inner.decoded),identity(m.portableInnerArchiveIdentity));
    const uploaded=m.roles.filter(r=>r.role.startsWith('uploaded/'));assert.equal(uploaded.length,8);
    assert.equal(m.rawUploadedMembers,78);assert.equal(m.sourceSnapshotMembers,70);assert.equal(m.nonsourceMembers,8);
    const memberNames=new Set(m.sourceAliases.map(r=>r.innerMember));for(const r of uploaded){const name=r.role.slice(9);safe(name);assert(!memberNames.has(name));memberNames.add(name);}assert.equal(memberNames.size,78);
    assert.equal(m.fullSuiteAcceptance,false);assert.equal(m.reliabilityFixAccepted,false);assert.equal(m.performanceComparison,false);assert.equal(m.fullParity,false);assert.equal(m.superiority,false);
    notes.push({classification:'stored-transport-only',storedRoles:40,portableSourceAliases:70,portableNonsourceRoles:8,decodedGzipPayloadAuthenticatedByThisAudit:false,portableZipMembersInspectedByThisAudit:false,localSourceReferencesGitDeliveryClaimed:false,earlierD24CauseRemainsUnresolved:true});
  } else if (definition.kind === 'review-full-gate') {
    const decision=doc(3),journal=doc(5),gate=decision.currentPreInstallationGate;
    assert.equal(m.branchHead,CLOSED_EPOCH_HEAD);assert.equal(m.runId,gate.runId);assert.equal(m.jobId,gate.jobId);assert.equal(m.actualTestedMerge,gate.testedMerge);
    assert.deepEqual(identity(m.artifact),{bytes:gate.artifactBytes,sha256:gate.artifactSHA256});
    assert.equal(m.artifactId,gate.artifactId);assert.equal(journal.preInstallCurrentFullGate.runId,m.runId);assert.equal(journal.preInstallCurrentFullGate.testedMerge,m.actualTestedMerge);
    assert.equal(m.rawSummary.tests,1100);assert.equal(m.rawSummary.pass,1100);for(const key of ['fail','cancelled','skipped','todo'])assert.equal(m.rawSummary[key],0);
    assert.equal(gate.independentPeer.path,'work/e655-full1100-installation-gate-independent-review-20261016.json');assert.deepEqual(identity(gate.independentPeer),identity(definition));
    notes.push({classification:'inert-review-provenance-only',publicReviewBytesAuthenticated:true,crossBoundDecisionAndJournal:true,referencedHostedArtifactGitDeliveryClaimed:false,behavioralObservationReexecuted:false});
  } else if (definition.kind === 'review-filer') {
    const authority=dependency('filerAuthority'),diagnostic=doc(0),filer=diagnostic.roles.find(r=>r.role==='backup-only-preservation-filer');
    assert(filer);ref(m.sourceAuthority,{path:'work/native-diagnostic-preservation-filer-source-20261016-next/source-authority.json',...identity(CLOSED_EPOCH_DEPENDENCIES.get('filerAuthority'))});
    assert.deepEqual(identity(m.filer),identity(authority.filer));assert.deepEqual(identity(m.filer),identity(filer.decoded));
    add(filer.stored.path,filer.stored,'preserved-reviewed-filer-source');
    assert.equal(m.fullFilerBodyAndAuthorityRead,true);assert.equal(m.filerExecutions,0);assert.equal(m.readerExecutions,0);assert.equal(m.collectorExecutions,0);
    assert(m.independentDataAudit.path.startsWith('work/'));identity(m.independentDataAudit);
    notes.push({classification:'inert-review-provenance-only',publicReviewAndTwoSourceContextsAuthenticated:true,localIndependentDataAuditGitDeliveryClaimed:false,filerExecutedByThisAudit:false});
  } else if (definition.kind === 'review-install-decision') {
    const authority=dependency('completeAuthority'),docs=dependency('docsAuthority');
    assert.equal(m.beforeHead,CLOSED_EPOCH_HEAD);assert.equal(m.sourceOnly,true);assert.equal(m.installedByThisRecord,false);assert.equal(m.historicalReceiptsRebound,false);assert.equal(m.fullParity,false);assert.equal(m.superiority,false);
    ref(m.sourceAuthority,{path:'work/notes36-installed-implementation-next/complete-r1-next/copy-authority.json',...identity(CLOSED_EPOCH_DEPENDENCIES.get('completeAuthority'))});
    ref(m.conditionalDocsAuthority,{path:'work/notes36-installed-implementation-next/pending-install-index-docs-r1-next/copy-authority.json',...identity(CLOSED_EPOCH_DEPENDENCIES.get('docsAuthority'))});
    assert.equal(authority.literalBeforeGitHEAD,CLOSED_EPOCH_HEAD);assert.equal(authority.files.length,25);assert.equal(docs.files.length,6);
    for(const [field,key]of [['independentIntegratedSourcePeer','integratedPeer'],['independentByteDataPeer','bytePeer'],['independentConditionalDocsPeer','docsPeer']]){const pin=CLOSED_EPOCH_DEPENDENCIES.get(key);dependency(key);assert.deepEqual(identity(m[field]),identity(pin));assert(m[field].path.startsWith('work/'));}
    const gate=doc(1);assert.equal(m.currentPreInstallationGate.runId,gate.runId);assert.deepEqual(identity(m.currentPreInstallationGate.independentPeer),identity([...CLOSED_EPOCH_DOCUMENTS.values()][1]));
    notes.push({classification:'inert-review-provenance-only',exactPublicAuthorities:2,exactPublicSourceReviews:3,sourceInstalledOrBehaviorAcceptedByThisRecord:false,localOriginPathsGitDeliveryClaimed:false});
  } else if (definition.kind === 'notes-plan') {
    assert.equal(m.literalBeforeCommit,CLOSED_EPOCH_HEAD);assert.equal(m.sourceOnly,true);assert.equal(m.actualSourceInstallationJournal,null);
    uniqueRows(m.applicationTargets,7);uniqueRows(m.currentNotesSources,36);uniqueRows(m.beforeCurrent32,32);
    const current=new Map(m.currentNotesSources.map(r=>[r.path,r])),targets=new Map(m.applicationTargets.map(r=>[r.path,r]));
    for(const r of m.currentNotesSources){assert(r.path.startsWith('products/rea-studio/apps/notes/'));add(r.path,r,'current36-source');}
    for(const r of m.applicationTargets){assert.deepEqual(identity(r.after),identity(current.get(r.path)));assert.equal(r.afterImage.path,'products/rea-studio/experiments/notes-new-todo/after/'+r.path+'.snapshot');assert.deepEqual(identity(r.afterImage),identity(r.after));add(r.afterImage.path,r.afterImage,'frozen-application-after');
      if(r.before===null){assert.equal(r.beforeImage,null);}else{assert.equal(r.beforeImage.path,beforeImage(r.path));assert.deepEqual(identity(r.beforeImage),identity(r.before));add(r.beforeImage.path,r.beforeImage,'frozen-application-before');}}
    for(const r of m.beforeCurrent32){const changed=targets.get(r.path);if(r.changedInProposal){assert(changed&&changed.before);assert.deepEqual(identity(changed.before),identity(r));}else assert.deepEqual(identity(current.get(r.path)),identity(r));}
    uniqueRows(m.tooling.fixedRows,12);for(const r of m.tooling.fixedRows)add(r.path,r,'fixed-current-tooling');add(m.tooling.collectorSelf.path,m.tooling.collectorSelf,'separate-collector-self');
    assert.equal(m.tooling.collectorSelfSeparateFrom12,true);assert.equal(m.tooling.collectorSelf.isThirteenthToolingRow,false);
    const declaration=dependency('declaration');assert.deepEqual(m.currentNotesSources,declaration.currentNotesSources);assert.equal(declaration.combinedProofRowCount,60);
    dependency('rolePlan');assert.equal(m.publication.artifactTable,CLOSED_EPOCH_DEPENDENCIES.get('rolePlan').path);assert.equal(m.publication.finalRoles,95);assert.equal(m.publication.fileLimit,96);assert.equal(m.publication.actualControlsExecuted,null);
    notes.push({classification:'historical-Notes36-current-at-declared-epoch-and-frozen-source-plan',declaredEpochSources:36,current41AcceptanceClaimed:false,applicationTargets:7,frozenBeforeImages:3,frozenAfterImages:7,fixedTooling:12,separateCollectorSelf:true,before32IsHistoricalAndNotCurrentTargetIdentity:true,plannedControlsAreNotActualResults:true});
  } else if (definition.kind === 'notes-journal') {
    assert.equal(m.actualBeforeGitHEAD,CLOSED_EPOCH_HEAD);assert.equal(m.actualReadableRecoveryDirectory,RECOVERY_PREFIX);assert.equal(m.sourceCommitAfterCopy,null);assert.equal(m.sourceCommitAssignedByLaterRootCommit,true);
    assert.equal(m.status,'source-installed-fresh-hosted-acceptance-pending');assert.equal(m.historicalReceiptsRebound,false);assert.equal(m.fullParity,false);assert.equal(m.superiority,false);
    uniqueRows(m.installedFiles,31);assert.equal(m.sourceFilePathsCopied,31);assert.equal(m.existingFilesChanged,11);assert.equal(m.newFilesAdded,20);
    const authority=dependency('completeAuthority'),docs=dependency('docsAuthority');
    const planned=new Map([...authority.files,...docs.files].map(r=>[r.path,r]));assert.equal(planned.size,31);
    let historical=0,localRecoveryPaths=0;
    for(const r of m.installedFiles){const source=planned.get(r.path);assert(source,'Unreviewed current installation target');assert.deepEqual(identity(r.after),identity(source.after));assert.deepEqual(r.before===null?null:identity(r.before),source.before===null?null:identity(source.before));
      add(r.path,r.after,'actual-installed-after-target');assert.equal(r.afterSnapshot.path,RECOVERY_PREFIX+'/after/'+r.path+'.snapshot');assert.deepEqual(identity(r.afterSnapshot),identity(r.after));localRecoveryPaths++;
      if(r.before===null){assert.equal(r.beforeSnapshot,null);}else{assert.equal(r.beforeSnapshot.path,RECOVERY_PREFIX+'/before/'+r.path+'.snapshot');assert.deepEqual(identity(r.beforeSnapshot),identity(r.before));localRecoveryPaths++;historical++;add(beforeImage(r.path),r.before,'separately-delivered-historical-before');}}
    assert.equal(historical,11);assert.equal(localRecoveryPaths,42);assert.equal(m.finalPublicJournalPath,ctx.name);
    assert.equal(m.freshInstalledAcceptance.allRequireActualHostedResultsForLaterCommittedSource,true);for(const key of ['finite111Across21Files','browser8','fullImplementedSuiteSuperset','publication306ControlsAnd95Roles'])assert.equal(m.freshInstalledAcceptance[key],null);
    notes.push({classification:'historical-source-copy-journal-with-bounded-physical-carrier-projection',declaredEpochAfterTargets:31,current41AcceptanceClaimed:false,separatelyPublicBeforeImages:11,localRecoveryPathReferences:42,localRecoveryPathsGitDeliveryClaimed:false,localAuthoritiesAndReviewsAreOriginProvenanceOnly:true,sourceInstallationReexecuted:false,freshBehavioralAcceptanceClaimed:false});
  } else assert.fail('Unknown closed projection kind');
  return {rows,notes,dependencies,declaration:{path:ctx.name,schema:ctx.data.schema,bytes:ctx.bytes,sha256:ctx.sha256}};
}
function authenticateProjectionRows(projection, read=projectionRead) {
  const rows=[];
  for(const declared of projection.rows){const r=historicalProjectionRow(projection.declaration,declared,read);const b=read(r.path,LIMIT.singleManifestBytes);assert.equal(b.length,r.bytes,'Projected physical public size differs: '+r.path);assert.equal(sha(b),r.sha256,'Projected physical public SHA differs: '+r.path);rows.push(r);}
  const historicalRows=rows.filter(row=>row.historicalLogicalProjection);
  return {...projection,rows,notes:[...projection.notes,...(historicalRows.length?[{classification:'exact-historical-logical-to-physical-source-delivery',declaredSourceEpoch:'698d2e301765d1b878fb251b3d59dadb5a3c9bac',historicalRows:historicalRows.length,actualCurrentSourcesAuthenticatedSeparately:true,currentLogicalTargetIdentityOrBehaviorAcceptanceClaimed:false}]:[])]};
}
function exactProjection(ctx, read=projectionRead) {
  exactContext(ctx,CLOSED_EPOCH_DOCUMENTS.get(ctx.name));
  return authenticateProjectionRows(projectionBody(ctx,read),read);
}
function closedEpochControls() {
  const observations=[], contexts=[...CLOSED_EPOCH_DOCUMENTS.values()].map(pin=>manifest(pin.path));
  const check=(name,fn,reject=false)=>{let error=null;try{fn();}catch(e){error=e;}assert(reject?error:!error,'Closed projection control failed: '+name+(error?': '+error.message:''));observations.push({name,expected:reject?'rejection':'acceptance',passed:true});};
  for(const ctx of contexts)check('positive-exact-'+CLOSED_EPOCH_DOCUMENTS.get(ctx.name).kind,()=>exactProjection(ctx));
  const mutate=(index,name,edit)=>check(name,()=>{const ctx={...contexts[index],data:structuredClone(contexts[index].data)};edit(ctx.data);authenticateProjectionRows(projectionBody(ctx));},true);
  check('reject-unknown-path',()=>exactProjection({...contexts[0],name:DIAGNOSTIC_PREFIX+'/other-preservation-manifest.json'}),true);
  check('reject-changed-whole-document-hash',()=>exactProjection({...contexts[0],sha256:'0'.repeat(64)}),true);
  check('reject-changed-whole-document-bytes',()=>exactProjection({...contexts[0],bytes:contexts[0].bytes+1}),true);
  mutate(0,'reject-wrong-schema',m=>{m.schema+='-unknown';});
  mutate(0,'reject-decoded-hash-as-stored-pointer',m=>{const r=m.roles.find(r=>r.stored.encoding==='gzip');r.stored.path=DIAGNOSTIC_PREFIX+'/payload/'+r.decoded.sha256+'.gz.snapshot';});
  mutate(0,'reject-unknown-transport',m=>{m.roles[0].stored.encoding='br';});
  mutate(0,'reject-identity-decoded-mismatch',m=>{m.roles[0].decoded.bytes++;});
  mutate(0,'reject-stored-bytes-mutation',m=>{m.roles[0].stored.bytes++;});
  mutate(0,'reject-portable-alias-traversal',m=>{m.sourceAliases[0].innerMember='source/../escape.snapshot';m.sourceAliases[0].role='uploaded/'+m.sourceAliases[0].innerMember;});
  mutate(0,'reject-duplicate-portable-alias',m=>{m.sourceAliases[1]=structuredClone(m.sourceAliases[0]);});
  mutate(1,'reject-false-full-gate',m=>{m.rawSummary.pass--;});
  mutate(2,'reject-filer-source-authority-rebinding',m=>{m.sourceAuthority.sha256='0'.repeat(64);});
  mutate(3,'reject-decision-as-installation-receipt',m=>{m.installedByThisRecord=true;});
  mutate(4,'reject-current-source-count-loss',m=>{m.currentNotesSources.pop();});
  mutate(4,'reject-plan-local-after-pointer',m=>{m.applicationTargets[0].afterImage.path='work/local-after.snapshot';});
  mutate(4,'reject-before32-current-identity-conflation',m=>{m.beforeCurrent32.find(r=>r.changedInProposal).bytes++;});
  mutate(5,'reject-journal-current-after-mutation',m=>{m.installedFiles[0].after.sha256='0'.repeat(64);});
  mutate(5,'reject-journal-local-after-identity-mutation',m=>{m.installedFiles[0].afterSnapshot.bytes++;});
  mutate(5,'reject-journal-local-recovery-path-rebinding',m=>{m.installedFiles[0].beforeSnapshot.path='work/other.snapshot';});
  mutate(5,'reject-journal-new-behavioral-acceptance',m=>{m.freshInstalledAcceptance.browser8=true;});
  check('reject-authenticated-transport-content-mutation',()=>exactProjection(contexts[0],(p,cap)=>{const b=projectionRead(p,cap);if(p===contexts[0].data.roles[0].stored.path){const changed=Buffer.from(b);changed[0]^=1;return changed;}return b;}),true);
  const sourceObservations=[];
  const sourceCheck=(name,fn,reject=false)=>{let error=null;try{fn();}catch(e){error=e;}assert(reject?error:!error,'Historical source binding control failed: '+name+(error?': '+error.message:''));sourceObservations.push({name,expected:reject?'rejection':'acceptance',passed:true});};
  sourceCheck('positive-exact-historical-physical-provenance',()=>{
    const projected=exactProjection(contexts[4]),mapped=projected.rows.filter(row=>row.historicalLogicalProjection);
    assert.equal(mapped.length,5);
    for(const row of mapped){const p=row.historicalLogicalProjection;assert.notEqual(row.path,p.declaredLogicalPath);assert.equal(p.physicalDeliveryPath,row.path);assert.deepEqual(identity(row),p.declaredIdentity);assert.equal(p.declaredSourceEpoch,'698d2e301765d1b878fb251b3d59dadb5a3c9bac');assert.equal(p.logicalPathAtHistoricalIdentityClaimedCurrent,false);assert.equal(p.currentBehavioralAcceptanceClaimed,false);}
  });
  sourceCheck('positive-current-producer-and-controls-separate-from-historical-journal',()=>{
    const projected=exactProjection(contexts[5]);
    for(const name of ['scripts/verify-cloud-publication.mjs','scripts/publication-integrity-controls.mjs']){const row=projected.rows.find(row=>row.historicalLogicalProjection?.declaredLogicalPath===name);assert(row);assert.notDeepEqual(row.historicalLogicalProjection.actualCurrentLogicalIdentity,identity(row));assert.equal(row.historicalLogicalProjection.currentLogicalDeliveryClaimedByHistoricalRow,false);}
  });
  function rejectChangedRead(label,ctx,path){let changedReads=0;sourceCheck(label,()=>exactProjection(ctx,(p,cap)=>{const b=projectionRead(p,cap);if(p!==path)return b;changedReads++;const changed=Buffer.from(b);assert(changed.length);changed[0]^=1;return changed;}),true);assert(changedReads>0,'The intended source/carrier mutation must be consumed: '+path);}
  const originalReadme=projectionBody(contexts[4]).rows.find(row=>row.path==='products/rea-studio/apps/notes/README.md');assert(originalReadme);
  const readmeCarrier=historicalProjectionRow(projectionBody(contexts[4]).declaration,originalReadme).path;
  rejectChangedRead('reject-current-Notes-README-hidden-by-old-carrier',contexts[4],originalReadme.path);
  rejectChangedRead('reject-historical-README-physical-carrier-mutation',contexts[4],readmeCarrier);
  const controlsRow=exactProjection(contexts[5]).rows.find(row=>row.historicalLogicalProjection?.declaredLogicalPath==='scripts/publication-integrity-controls.mjs');assert(controlsRow);
  rejectChangedRead('reject-historical-controls-physical-carrier-mutation',contexts[5],controlsRow.path);
  rejectChangedRead('reject-actual-current-controls-mutation',contexts[5],'scripts/publication-integrity-controls.mjs');
  rejectChangedRead('reject-actual-current-producer-mutation',contexts[5],'scripts/verify-cloud-publication.mjs');
  sourceCheck('reject-unlisted-historical-source-identity',()=>historicalProjectionRow(projectionBody(contexts[4]).declaration,{...originalReadme,sha256:'0'.repeat(64)}),true);
  sourceCheck('reject-historical-binding-outside-exact-manifest',()=>authenticateProjectionRows({...projectionBody(contexts[4]),declaration:{...projectionBody(contexts[4]).declaration,path:NOTES36_PREFIX+'/unlisted-plan.json'}}),true);
  assert.equal(sourceObservations.filter(row=>row.expected==='acceptance').length,2);assert.equal(sourceObservations.filter(row=>row.expected==='rejection').length,7);
  report.historicalSourceProjectionControls={status:'passed',positive:2,negative:7,observations:sourceObservations,historicalManifestBytesRewritten:false,currentBehaviorOrGlobalCoverageAccepted:false};
  sourceContextControls();
  persist('projection-controls.json',{schema:'rea-hosted-six-closed-delivery-projection-controls/v1',status:'passed',observations,positive:6,negative:observations.length-6,executedOnlyWithinVerifiedHostedAudit:true,checkoutWrites:0,productExecutions:0,legacyHandlersChanged:false,limitsChanged:false,semanticMutationControlsExerciseBodySeparatelyFromWholeDocumentPin:true,globalDeliveryOrBehavioralSuccessClaimed:false,historicalSourceProjectionControls:report.historicalSourceProjectionControls,sourceContextControls:report.sourceContextControls});
  report.closedEpochProjectionControls={status:'passed',positive:6,negative:observations.length-6};
}
function applyClosedEpochProjection(ctx) {
  const projected=exactProjection(ctx);
  for(let i=0;i<projected.rows.length;i++)declare(ctx,'reviewed-closed-projection',i,projected.rows[i],{pointer:'path',base:'root'});
  report.counts.recognizedManifests++;
  detail('manifests.jsonl',{manifest:ctx.name,schema:ctx.data.schema,sha256:ctx.sha256,bytes:ctx.bytes,classification:'exact-source-epoch-projection',projectionKind:CLOSED_EPOCH_DOCUMENTS.get(ctx.name).kind,publicRows:projected.rows.length,scopedPublicRowsSHA256Authenticated:true,globalPayloadAuthenticationClaimed:false,notes:projected.notes,dependencies:projected.dependencies});
}

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
  assert(++report.counts.declarations<=LIMIT.declarations,'Declaration bound exceeded');const id=rule.optionalBytes&&row.bytes===undefined?{bytes:null,sha256:row.sha256}:identity(row),p=safe(row[rule.pointer]);assert(HASH.test(id.sha256),'Invalid SHA declaration');
  if(rule.inertOnly&&!p.endsWith('.snapshot')){report.counts.excludedLogicalRows++;return;}
  const prefix=dirname(ctx.name).replaceAll('\\','/'),target=safe((rule.base==='root'?p:rule.base==='studio'?'products/rea-studio/'+p:prefix+'/'+p)+(rule.suffix??'')),prior=seenTargets.get(target);
  // Different historical declarations can refer to a mutable current source.
  // Only inert destinations are treated as immutable shared delivery objects.
  if(prior && target.endsWith('.snapshot') && ((prior.bytes!==null&&id.bytes!==null&&prior.bytes!==id.bytes)||prior.sha256!==id.sha256))unresolved(ctx.name,ctx.data.schema,'Conflicting identities for one inert public target',{field,index:i,target,previous:prior,current:id});
  if(!prior||prior.bytes===null&&id.bytes!==null)seenTargets.set(target,id);
  const origin={manifest:ctx.name,manifestSHA256:ctx.sha256,schema:ctx.data.schema,field,index:i,target,...id,declaredBytesAvailable:id.bytes!==null,...(field==='reviewed-closed-projection'&&row.historicalLogicalProjection?{historicalLogicalProjection:row.historicalLogicalProjection}: {})};
  const alias=aliases.get(target);if(alias){assert.equal(alias.manifest,ctx.name);assert.deepEqual(identity(alias),id);report.counts.existingClosedAliases++;detail('closed-aliases.jsonl',{...origin,status:'existing-exact-closed-alias',gitDeliveredPayload:alias.delivered,logicalPathGitDelivered:false});return;}
  const blob=trees.get(target);if(!blob){report.counts.missingGit++;report.missingByPrefix[prefix]=(report.missingByPrefix[prefix]??0)+1;
    const candidates=contentCandidates.get(id.sha256+':'+id.bytes)??[];
    const segments=target.toLowerCase().split('/'),pathClass=segments.includes('.git')?'git-reserved-directory':segments.includes('.local')?'ignored-directory-and-current-publication-policy-forbidden':'ordinary-missing-git';
    detail('missing-git.jsonl',{...origin,status:'missing-from-committed-tree',pathClass,currentPublicationLocalDirectoryPolicyConflict:segments.includes('.local'),repairAuthorizedOrAccepted:false,existingContentAddressedCandidates:candidates});return;}
  if(!['100644','100755'].includes(blob.mode)){report.counts.wrongGitMode++;detail('missing-git.jsonl',{...origin,status:'not-regular-git-blob',mode:blob.mode});return;}
  report.counts.gitPresent++;if(id.bytes!==null&&blob.bytes!==id.bytes){report.counts.declaredSizeMismatch++;detail('size-mismatches.jsonl',{...origin,status:'declared-size-differs-from-git',gitBytes:blob.bytes,gitBlob:blob.oid});}
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
  // Historical completion is returned under its explicit fixed2a subject.
}

try {
  assert.equal(process.platform,'win32');assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.CI,'true');assert.equal(process.env.GITHUB_REPOSITORY,'Ginderlax/rea-research-lab');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');assert.equal(process.env.RUNNER_OS,'Windows');assert.equal(process.version,'v24.16.0');
  assert(/^\d+$/.test(process.env.GITHUB_RUN_ID??'')&&/^\d+$/.test(process.env.GITHUB_RUN_ATTEMPT??''));assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA??''));
  assert(isAbsolute(outputDirectory)); const requested=resolve(outputDirectory);
  assert.equal(requested,join(parentOutput,'historical2a'));
  const rel=relative(ROOT,requested);assert(rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel),'Evidence must be outside checkout');mkdirSync(requested,{recursive:false});output=requested;
  report.provenance={repository:process.env.GITHUB_REPOSITORY,sourceCommit:HISTORICAL_COMMIT,historicalInputTree:HISTORICAL_TREE,workflowSourceCommit:execution.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT,runnerEnvironment:process.env.RUNNER_ENVIRONMENT,runnerOS:process.env.RUNNER_OS,node:process.version,platform:process.platform,architecture:process.arch};
  report.subject={kind:'fixed-historical-physical-input',sourceCommit:HISTORICAL_COMMIT,sourceTree:HISTORICAL_TREE,current46Subject:false,gitRepositoryIsActualCurrentRepository:true,workflowGitHEAD:execution.GITHUB_SHA,environmentIdentityForged:false,originalHandlerSource:{path:SCRIPT,bytes:74019,sha256:'c46dd67b6992f3a9bf3607a1af76222f6fd075a9b23fe34c41f6d0d7c16ebc9d'},preservedCurrentLabelsAreHistoricalToThisSubject:true};
  persist('attempt-running.json',report);event('started');
  assert.equal(git(['rev-parse','--show-object-format']).toString().trim(),'sha1');assert.equal(git(['rev-parse','HEAD']).toString().trim(),process.env.GITHUB_SHA);assert.equal(git(['status','--porcelain=v1','--untracked-files=all']).length,0,'Checkout must be clean');
  const tree=git(['ls-tree','-r','-l','-z','--full-tree',HISTORICAL_COMMIT]);for(const raw of tree.toString('utf8').split('\0').filter(Boolean)){const match=/^(\d{6}) (blob|commit) ([0-9a-f]{40}) +([0-9]+|-)\t(.+)$/.exec(raw);assert(match,'Unexpected Git tree record');if(match[2]!=='blob')continue;const name=safe(match[5]);assert(!trees.has(name));trees.set(name,{mode:match[1],oid:match[3],bytes:Number(match[4])});assert(trees.size<=LIMIT.gitBlobs);}
  report.counts.gitBlobs=trees.size;for(const [p,b]of trees){const match=/\/([0-9a-f]{64})\.snapshot$/.exec(p);if(match&&['100644','100755'].includes(b.mode)){const key=match[1]+':'+b.bytes,rows=contentCandidates.get(key)??[];if(rows.length<12)rows.push({path:p,gitBlob:b.oid,bytes:b.bytes,sha256Authenticated:false});contentCandidates.set(key,rows);}}
  report.sourceFiles=[];for(const p of [SCRIPT,WORKFLOW]){const b=trackedBytes(p);report.sourceFiles.push({path:p,bytes:b.length,sha256:sha(b),gitBlob:trees.get(p).oid});writeFileSync(join(output,p===SCRIPT?'audit-script.mjs.snapshot':'audit-workflow.yml.snapshot'),b,{flag:'wx'});}
  closedAliases();closedEpochControls();const candidates=[...trees.keys()].filter(p=>CANDIDATE_NAME.test(p)).sort();report.counts.candidateManifests=candidates.length;assert(candidates.length<=LIMIT.manifests);
  // Register all parent logical maps before interpreting their inert originals.
  for(const p of candidates){timed();try{registerEmbedded(manifest(p));}catch(e){unresolved(p,null,'Cannot parse/register manifest',{error:String(e.message).slice(0,1000)});}}
  for(const p of candidates){timed();let ctx;try{ctx=manifest(p);const schema=ctx.data.schema??null;report.schemaCounts[String(schema)]=(report.schemaCounts[String(schema)]??0)+1;
    if(embedded.has(p)){embeddedManifest(ctx,embedded.get(p));continue;}
    if(CLOSED_EPOCH_DOCUMENTS.has(p)){applyClosedEpochProjection(ctx);continue;}
    // An unbound inert historical manifest has no implied current path base.
    const fields=handlers.get(schema);if(p.endsWith('.snapshot')&&!fields?.every(r=>r.inertManifest===p)){unresolved(p,schema,'Inert manifest has no reviewed delivery projection',pinHints(ctx.data));continue;}
    if(!fields){unresolved(p,schema,'Schema has no closed public-pointer handler',pinHints(ctx.data));continue;}
    for(const rule of fields){let value=ctx.data[rule.field];if(value===undefined&&rule.inventoryAlternative){const raw=ctx.data.inventory;assert(raw&&typeof raw==='object','Missing inventory alternative');value=Array.isArray(raw)?raw:Object.entries(raw).map(([path,r])=>({...r,path}));}assert(value!==undefined,'Missing recognized pointer field '+rule.field);const rows=rule.single?[value]:value;assert(Array.isArray(rows),'Expected declaration array '+rule.field);for(let i=0;i<rows.length;i++){if((rule.kind&&rows[i].kind!==rule.kind)||(rule.optionalPointer&&rows[i][rule.pointer]===undefined)){report.counts.excludedLogicalRows++;continue;}try{declare(ctx,rule.field,i,rows[i],rule);}catch(e){unresolved(p,schema,'Invalid recognized declaration',{field:rule.field,index:i,error:String(e.message).slice(0,1000)});}}}
    report.counts.recognizedManifests++;detail('manifests.jsonl',{manifest:p,schema,sha256:ctx.sha256,bytes:ctx.bytes,classification:'closed-public-pointers',fields});
  }catch(e){unresolved(p,ctx?.data?.schema??null,'Manifest audit incomplete',{error:String(e.message).slice(0,1000)});}}
  recheckCurrentSourceEpochBinding();
  assert.equal(git(['rev-parse','HEAD']).toString().trim(),execution.GITHUB_SHA);assert.equal(git(['status','--porcelain=v1','--untracked-files=all']).length,0,'Checkout changed during read-only audit');
  finish('completed');
} catch(e) { try{finish('failed',e);}catch(storage){report.evidenceStorageFailure={name:storage.name,message:String(storage.message).slice(0,4000)};} }

  let unresolvedRows=[];
  try{const raw=readFileSync(join(outputDirectory,'unresolved.jsonl'));assert(raw.length<=LIMIT.detailFileBytes);unresolvedRows=new TextDecoder('utf-8',{fatal:true}).decode(raw).split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));}
  catch(error){if(error.code!=='ENOENT'||report.counts.unresolved!==0)throw error;}
  assert.equal(unresolvedRows.length,report.counts.unresolved,'Historical raw unresolved signal count');
  const distinctUnresolvedManifests=new Set(unresolvedRows.map(row=>row.manifest));
  let projectionControls=null;
  if(report.closedEpochProjectionControls?.status==='passed'){
    const bytes=readFileSync(join(outputDirectory,'projection-controls.json'));assert(bytes.length<=LIMIT.reportBytes);projectionControls=JSON.parse(bytes);
    assert.equal(projectionControls.status,'passed');assert.equal(projectionControls.positive,6);assert.equal(projectionControls.negative,21);
    assert.equal(projectionControls.historicalSourceProjectionControls.positive,2);assert.equal(projectionControls.historicalSourceProjectionControls.negative,7);
    assert.equal(projectionControls.sourceContextControls.positive,1);assert.equal(projectionControls.sourceContextControls.negative,9);
  }
  return {report,unresolvedSignals:unresolvedRows.length,distinctUnresolvedManifests:distinctUnresolvedManifests.size,projectionControls};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.deepEqual(process.argv.slice(2,3),['--output']);assert.equal(process.argv.length,4);assert(isAbsolute(process.argv[3]));
  await runNotes46InstalledDeliveryAudit({repoRoot:resolve(dirname(fileURLToPath(import.meta.url)),'..'),output:process.argv[3]});
}
