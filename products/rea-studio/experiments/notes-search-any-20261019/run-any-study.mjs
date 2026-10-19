// Isolated hosted experiment. Only six explicitly pinned application/test
// replacements are written, and only inside the owned hosted checkout.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { parseNotes46Tap } from '../../scripts/notes46-installed-tap-roster.mjs';

const PREFIX = 'products/rea-studio/experiments/notes-search-any-20261019';
const SELF = PREFIX + '/run-any-study.mjs';
const PACKER = PREFIX + '/package-evidence.ps1';
const WORKFLOW = '.github/workflows/notes-search-any-cloud.yml';
const PLAN = { path: PREFIX + '/SOURCE-PLAN.json', bytes: 120075, sha256: '2724e4de01d54132643fd7a7c969609b7be7d48960a53c172a8e7881a832312a' };
const PARENT = 'ab26bf14bc1a55a723566bbafb3ca391c3ef671c';
const BRANCH = 'refs/heads/experiment/notes-search-any-20261019';
const JOB = 'notes-any-observed-values';
const root = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
const sourceLimits = { files: 256, memberBytes: 512 * 1024, rawBytes: 8 * 1024 * 1024, depth: 32 };
const evidenceLimits = { files: 5000, rawBytes: 96 * 1024 * 1024, memberBytes: 8 * 1024 * 1024, zipBytes: 15 * 1024 * 1024 };
const outputLimit = 1024 * 1024;
const legacyObservation = 'products/rea-studio/.local/notes-notebook-trash-observations/trash-original.json';
const id = bytes => ({ bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
const pin = row => ({ bytes: row.bytes, sha256: row.sha256 });
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const environmentNames = ['CI','GITHUB_ACTIONS','RUNNER_ENVIRONMENT','RUNNER_OS','RUNNER_ARCH','GITHUB_REPOSITORY','GITHUB_SHA','GITHUB_REF','GITHUB_EVENT_NAME','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_JOB','GITHUB_SERVER_URL'];
const execution = () => Object.fromEntries(environmentNames.map(name => [name, process.env[name]]));
const childNames = new Set([...environmentNames,'PATH','PATHEXT','SYSTEMROOT','COMSPEC','TEMP','TMP','RUNNER_TEMP','USERPROFILE','HOMEDRIVE','HOMEPATH','LOCALAPPDATA','APPDATA']);
const childEnvironment = extra => ({ ...Object.fromEntries(Object.entries(process.env).filter(([name]) => childNames.has(name.toUpperCase()))), ...extra });
function safe(name) {
  assert(typeof name === 'string' && name.length > 0 && name.length <= 2048 && !name.startsWith('/') && !/[\\:\x00-\x1f\x7f<>"|?*]/.test(name));
  const parts = name.split('/'); assert(parts.length <= sourceLimits.depth);
  for (const part of parts) assert(part && part !== '.' && part !== '..' && part === part.replace(/[ .]+$/, '') && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part));
  return name;
}
function within(parent, child) { const rel = path.relative(parent, child); return !!rel && !path.isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + path.sep); }
function noLinks(filename) { let at = path.resolve(filename); for (;;) { assert(!fs.lstatSync(at).isSymbolicLink(), 'No linked source/evidence ancestor: ' + at); const up = path.dirname(at); if (at === up) break; at = up; } assert.equal(fs.realpathSync(filename).toLowerCase(), path.resolve(filename).toLowerCase()); }
function read(directory, name, cap = sourceLimits.memberBytes) { const target = path.join(directory, safe(name)); assert(within(directory, target)); noLinks(target); const stat = fs.lstatSync(target); assert(stat.isFile() && stat.size <= cap); const bytes = fs.readFileSync(target); assert.equal(bytes.length, stat.size); return bytes; }
function write(name, bytes) { assert(Buffer.isBuffer(bytes) && bytes.length <= evidenceLimits.memberBytes); const target = path.join(evidence, safe(name)); assert(within(evidence, target)); fs.mkdirSync(path.dirname(target), { recursive: true }); noLinks(path.dirname(target)); fs.writeFileSync(target, bytes, { flag: 'wx' }); assert.deepEqual(read(evidence, name, evidenceLimits.memberBytes), bytes); }
const json = (name, value) => write(name, Buffer.from(JSON.stringify(value, null, 2) + '\n'));
function git(args, maximum = 32 * 1024 * 1024) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')));
  Object.assign(env, { GIT_OPTIONAL_LOCKS: '0', GIT_NO_LAZY_FETCH: '1', GIT_TERMINAL_PROMPT: '0' });
  const result = spawnSync('git', ['--no-replace-objects', ...args], { cwd: root, env, shell: false, windowsHide: true, timeout: 30000, maxBuffer: maximum });
  assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr?.toString()); assert.equal(result.signal, null); return result.stdout;
}
function tree(revision) { const rows = new Map(), folded = new Set(); for (const text of git(['ls-tree','-r','-z','--full-tree',revision]).toString().split('\0').filter(Boolean)) { const match = /^(\d{6}) (blob|commit) ([0-9a-f]{40})\t(.+)$/.exec(text); assert(match); safe(match[4]); assert(!rows.has(match[4]) && !folded.has(match[4].toLowerCase())); folded.add(match[4].toLowerCase()); rows.set(match[4], { mode: match[1], kind: match[2], gitBlob: match[3] }); } return rows; }
function status() { return git(['status','--porcelain=v1','-z','--untracked-files=all']).toString().split('\0').filter(Boolean).map(row => ({ status: row.slice(0,2), path: row.slice(3) })).sort((a,b) => a.path.localeCompare(b.path)); }
function noteNames(directory, depth = 0) { assert(depth <= 32); noLinks(directory); const rows = []; for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { if (entry.name === 'results') continue; assert(!entry.isSymbolicLink()); const full = path.join(directory, entry.name); if (entry.isDirectory()) rows.push(...noteNames(full, depth + 1)); else { assert(entry.isFile()); rows.push(path.relative(root, full).replaceAll('\\','/')); } } return rows.sort(); }
function hosted() {
  assert.equal(process.platform, 'win32'); assert.equal(process.arch, 'x64'); assert.equal(process.version, 'v24.16.0');
  for (const [name,value] of Object.entries({ CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab',GITHUB_REF:BRANCH,GITHUB_EVENT_NAME:'push',GITHUB_JOB:JOB,GITHUB_SERVER_URL:'https://github.com' })) assert.equal(process.env[name], value, name);
  for (const name of ['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT']) assert(/^[1-9][0-9]*$/.test(process.env[name]));
  assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA)); assert.equal(git(['rev-parse','HEAD']).toString().trim(), process.env.GITHUB_SHA);
  assert.deepEqual(git(['rev-list','--parents','-n','1','HEAD']).toString().trim().split(' '), [process.env.GITHUB_SHA,PARENT]);
  assert.equal(git(['rev-parse','--show-object-format']).toString().trim(), 'sha1');
  assert.equal(path.resolve(fileURLToPath(import.meta.url)).toLowerCase(), path.join(root, SELF).toLowerCase()); noLinks(root);
}
hosted();
const args = process.argv.slice(2); assert.equal(args.length, 4); assert.equal(args[0], '--phase'); assert(['before','overlay','verify','postcheck','restore'].includes(args[1])); assert.equal(args[2], '--evidence'); assert(path.isAbsolute(args[3]));
const phase = args[1], temporary = fs.realpathSync(process.env.RUNNER_TEMP);
const expectedEvidence = path.join(temporary, 'rea-notes-search-any-' + process.env.GITHUB_RUN_ID + '-' + process.env.GITHUB_RUN_ATTEMPT);
assert.equal(path.resolve(args[3]).toLowerCase(), expectedEvidence.toLowerCase()); noLinks(expectedEvidence);
const evidence = fs.realpathSync(expectedEvidence); assert(fs.lstatSync(evidence).isDirectory() && within(temporary,evidence) && !within(root,evidence));
const currentTree = tree('HEAD'), parentTree = tree(PARENT);
function committed(name, bytes) { const row = currentTree.get(name); assert(row && row.mode === '100644' && row.kind === 'blob'); assert.equal(blob(bytes), row.gitBlob, 'Committed source: ' + name); return row; }
const planBytes = read(root, PLAN.path); assert.deepEqual(id(planBytes), pin(PLAN)); committed(PLAN.path, planBytes); const plan = JSON.parse(planBytes);
assert.equal(plan.schema, 'rea-notes-search-any-source-plan/v1'); assert.equal(plan.parentCommit,PARENT); assert.equal(plan.branch,BRANCH); assert.equal(plan.sourceOverlay,true); assert.equal(plan.installedAnyClaimed,false); assert.equal(plan.historicalReceiptsRebound,false);
assert.deepEqual(plan.sourceLimits,sourceLimits); assert.deepEqual(plan.evidenceLimits,evidenceLimits); assert.equal(plan.baselineSources.length,130); assert.equal(plan.overlays.length,6);
assert.equal(new Set(plan.baselineSources.map(row => row.path.toLowerCase())).size,130); assert.equal(new Set(plan.overlays.map(row => row.path.toLowerCase())).size,6);
assert.equal(plan.baselineNotes.length,46); assert.deepEqual(plan.baselineNotes,[...plan.baselineNotes].sort());
for (const row of plan.overlays) { safe(row.path); safe(row.payload.path); assert(plan.baselineSources.some(item => item.path === row.path)); assert(row.payload.path.startsWith(PREFIX + '/overlay/')); assert.deepEqual(pin(plan.baselineSources.find(item => item.path === row.path)),pin(row.before)); assert(!parentTree.has(row.payload.path)); }
const support = [...plan.packagedSources.map(row => row.path),PLAN.path,SELF,PACKER,WORKFLOW].sort();
assert.equal(new Set(support.map(name => name.toLowerCase())).size,support.length);
for (const name of support) { safe(name); assert(name === WORKFLOW || name.startsWith(PREFIX + '/')); assert(!parentTree.has(name)); }
const actualDiff = git(['diff-tree','--no-commit-id','--name-status','-r','HEAD']).toString().trim().split(/\r?\n/).filter(Boolean).map(line => { const [kind,name,...extra] = line.split('\t'); assert.equal(extra.length,0); assert.equal(kind,'A','Only new campaign files may be committed'); return name; }).sort();
assert.deepEqual(actualDiff,support,'Exact new-files-only source commit');
for (const row of plan.baselineSources) { safe(row.path); assert.deepEqual(currentTree.get(row.path),parentTree.get(row.path)); assert.equal(parentTree.get(row.path)?.gitBlob,row.gitBlob); }
function sameAttempt(value) { assert.deepEqual(value.execution,execution()); assert.equal(value.sourceCommit,process.env.GITHUB_SHA); assert.deepEqual(value.sourcePlan,id(planBytes)); assert.equal(value.parentCommit,PARENT); }
const overlayStatus = plan.overlays.map(row => ({ status:' M',path:row.path })).sort((a,b) => a.path.localeCompare(b.path));
function capture(kind, intended, save = true) {
  assert(['baseline','overlay','observed'].includes(intended)); const errors = [], rows = []; let rawBytes = 0;
  const check = (name,body) => { try { body(); } catch(error) { errors.push({ path:name,name:error.name,message:String(error.message).slice(0,4000) }); } };
  const actualNotes = noteNames(path.join(root,'products/rea-studio/apps/notes'));
  check('Eligible Notes census',() => assert.deepEqual(actualNotes,plan.baselineNotes));
  const definitions = [...plan.baselineSources,...plan.packagedSources,...[PLAN.path,SELF,PACKER,WORKFLOW].map(name => ({path:name}))];
  assert.equal(new Set(definitions.map(row => row.path.toLowerCase())).size,definitions.length); assert.equal(definitions.length,plan.captureCount); assert(definitions.length <= sourceLimits.files);
  for (const row of definitions.sort((a,b) => a.path.localeCompare(b.path))) {
    try {
      const remaining = sourceLimits.rawBytes - rawBytes; assert(remaining >= 0); const bytes = read(root,row.path,Math.min(sourceLimits.memberBytes,remaining)); rawBytes += bytes.length;
      if (save) write('source-' + kind + '/' + row.path + '.snapshot',bytes);
      const changed = plan.overlays.find(item => item.path === row.path), expected = changed && intended === 'overlay' ? changed.after : row;
      check(row.path,() => { if (expected.sha256 && intended !== 'observed') assert.deepEqual(id(bytes),pin(expected)); if (!changed || intended === 'baseline') committed(row.path,bytes); else if (intended === 'overlay') { assert.equal(currentTree.get(row.path).gitBlob,changed.before.gitBlob); assert.deepEqual(id(bytes),pin(changed.after)); } });
      rows.push({path:row.path,...id(bytes),gitBlob:blob(bytes),subject:changed && intended === 'overlay'?'prospective-authenticated-hosted-overlay':changed && intended === 'observed'?'raw-unqualified-observation':'committed-source'});
    } catch(error) { errors.push({path:row.path,name:error.name,message:String(error.message).slice(0,4000)}); }
  }
  const actualStatus = status(); if (intended !== 'observed') check('Exact Git status',() => assert.deepEqual(actualStatus,intended === 'overlay'?overlayStatus:[]));
  const result = {schema:'rea-notes-search-any-source-capture/v1',execution:execution(),sourceCommit:process.env.GITHUB_SHA,parentCommit:PARENT,sourcePlan:id(planBytes),phase:kind,intendedSubject:intended,actualNotes,actualStatus,files:rows.length,rawBytes,rows,limits:sourceLimits,contentsPreserved:save&&rows.length===definitions.length,actualBytesPreserved:save&&rows.length===definitions.length,sourceAuthenticationClaimed:intended!=='observed',sourceAuthenticated:intended!=='observed'&&errors.length===0,authenticationErrors:errors,sourceOverlay:intended==='observed'?null:intended==='overlay',installedAnyClaimed:false,historicalReceiptsRebound:false};
  if (save) json('source-' + kind + '.json',result); return result;
}
function requireCapture(result) { assert.equal(result.sourceAuthenticated,true,'Qualified intended source required'); assert.equal(result.authenticationErrors.length,0,'Observed source bytes/errors were captured before rejection'); assert.equal(result.files,plan.captureCount); return result; }
function ready() { const value=JSON.parse(read(evidence,'overlay.json',evidenceLimits.memberBytes)); sameAttempt(value); assert.equal(value.status,'ready-experimental-overlay-unexecuted'); const current=requireCapture(capture('preexecution','overlay',false)); assert.deepEqual(current.rows,value.current.rows); return value; }
function writeTarget(row,bytes) { assert.deepEqual(id(bytes),pin(row)); const filename=path.join(root,safe(row.path)); noLinks(filename); assert(fs.lstatSync(filename).isFile()); fs.writeFileSync(filename,bytes); assert.deepEqual(read(root,row.path),bytes); }

// This is the reviewed owned-child stop shape: fallback is armed first and
// native/path failures cannot escape the deadline/overflow callbacks.
async function observeOwnedNode(arguments_,options,timeoutMs,channelLimit) {
  const chunks={stdout:[],stderr:[]}, sizes={stdout:0,stderr:0}; let overflow=false,timedOut=false,failure=null,termination=null;
  const result=await new Promise(resolve => {
    let settled=false,stopping=false,timer=null,force=null; const child=spawn(process.execPath,arguments_,{...options,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
    const finish=(code,signal,closeObserved) => { if(settled)return; settled=true; clearTimeout(timer); clearTimeout(force); resolve({code,signal,closeObserved}); };
    const stop=reason => { if(stopping||settled)return; stopping=true; termination={reason,ownedPid:Number.isSafeInteger(child.pid)?child.pid:null,rootObservedRunning:child.exitCode===null&&child.signalCode===null,treeKillRequested:false,taskkill:null,directChildKillRequested:false,directChildKillError:null,forcedStreamClose:false,descendantsGuaranteedStopped:false};
      force=setTimeout(() => {if(settled)return;termination.forcedStreamClose=true;child.stdout.destroy();child.stderr.destroy();finish(null,null,false);},5000);
      if(termination.ownedPid!==null&&termination.rootObservedRunning)try { const filename=path.join(process.env.SystemRoot,'System32','taskkill.exe'); noLinks(filename); assert(fs.lstatSync(filename).isFile()); termination.treeKillRequested=true; const killed=spawnSync(filename,['/PID',String(child.pid),'/T','/F'],{cwd:root,shell:false,windowsHide:true,timeout:10000,maxBuffer:64*1024,env:childEnvironment({})}); termination.taskkill={executable:filename,status:killed.status,signal:killed.signal,error:killed.error?{name:killed.error.name,message:killed.error.message}:null,stdout:id(killed.stdout??Buffer.alloc(0)),stderr:id(killed.stderr??Buffer.alloc(0))}; if(killed.status!==0||killed.error){termination.directChildKillRequested=true;child.kill('SIGKILL');} } catch(error) {termination.directChildKillError={name:error.name,message:error.message};try {termination.directChildKillRequested=true;child.kill('SIGKILL');}catch(next){termination.directChildKillError.secondary=String(next.message);}}
    };
    for(const channel of ['stdout','stderr'])child[channel].on('data',chunk => {sizes[channel]+=chunk.length;const remaining=channelLimit-chunks[channel].reduce((sum,item)=>sum+item.length,0);if(remaining>0)chunks[channel].push(chunk.subarray(0,remaining));if(sizes[channel]>channelLimit){overflow=true;stop(channel+' overflow');}});
    child.on('error',error => {failure={name:error.name,message:error.message};stop('spawn/child error');}); child.on('close',(code,signal)=>finish(code,signal,true));
    timer=setTimeout(()=>{timedOut=true;stop('deadline');},timeoutMs);
  });
  return {...result,stdout:Buffer.concat(chunks.stdout),stderr:Buffer.concat(chunks.stderr),observedBytes:sizes,droppedBytes:{stdout:Math.max(0,sizes.stdout-channelLimit),stderr:Math.max(0,sizes.stderr-channelLimit)},overflow,timedOut,failure,termination,rawLogsComplete:!overflow&&!timedOut&&failure===null&&termination===null&&result.closeObserved};
}
async function run(row,index,timeoutMs) {
  const folder='tests/'+String(index+1).padStart(2,'0')+'-'+path.basename(row.path),observations=path.join(evidence,'observations/'+String(index+1).padStart(2,'0'));
  assert(!fs.existsSync(observations)); fs.mkdirSync(observations,{recursive:true}); noLinks(observations);
  const command=['--test','--test-reporter=tap','--test-concurrency=1',row.path]; const startedAt=new Date().toISOString();
  assert(Number.isSafeInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=180000);const observed=await observeOwnedNode(command,{cwd:root,env:childEnvironment({NOTES_REVIEW_OUTPUT:pathToFileURL(observations+path.sep).href,REA_ANY_OBSERVATIONS:observations})},timeoutMs,outputLimit);
  const {stdout,stderr,...child}=observed; write(folder+'/stdout.txt',stdout); write(folder+'/stderr.txt',stderr);
  let TAP=null,qualificationError=null; try {assert.equal(child.code,0);assert.equal(child.signal,null);assert.equal(child.failure,null);assert.equal(child.overflow,false);assert.equal(child.timedOut,false);assert.equal(child.closeObserved,true);assert.equal(child.rawLogsComplete,true);TAP=parseNotes46Tap(stdout,row.topLevelNodes,row.results,row.path);}catch(error){qualificationError={name:error.name,message:error.message};}
  let legacyOutput=null; if(row.path.endsWith('/notebook-trash.test.mjs')&&fs.existsSync(path.join(root,legacyObservation))){const bytes=read(root,legacyObservation);write(folder+'/legacy-trash-original.json',bytes);legacyOutput={path:legacyObservation,...id(bytes),newAttemptOnly:true};}
  const result={schema:'rea-notes-search-any-test-process/v1',execution:execution(),sourceCommit:process.env.GITHUB_SHA,parentCommit:PARENT,sourcePlan:id(planBytes),path:row.path,role:row.role,source:pin(row.source),command:[process.execPath,...command],timeoutMs,startedAt,endedAt:new Date().toISOString(),...child,stdout:id(stdout),stderr:id(stderr),expectedResults:row.results,TAP,legacyOutput,status:qualificationError?'failed':'passed',qualificationError}; json(folder+'/result.json',result); return result;
}
function observedValues(result) {
  const name='observations/01/original-any-values.jsonl'; const bytes=read(evidence,name,512*1024),text=new TextDecoder('utf-8',{fatal:true}).decode(bytes); assert(text.endsWith('\n'));
  const lines=text.slice(0,-1).split('\n');assert.equal(lines.length,58);for(const line of lines)assert(Buffer.byteLength(line+'\n')<=64*1024);const records=lines.map(line=>JSON.parse(line)),header=records[0],footer=records.at(-1),cases=records.slice(1,-1);
  const attempt={sourceEpoch:'notes-search-any-original-comparison-v1',sourceCommit:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,job:JOB};for(const row of records)for(const[key,value]of Object.entries(attempt))assert.equal(row[key],value,'Physical observation attempt: '+key);
  assert.equal(header.schema,'rea-search-any-original-observed-header/v1');assert.deepEqual(header.expectedCounts,{parser:16,'metadata-sql':32,'notebook-diagnostic':8});assert.equal(header.expectedCaseRows,56);assert.equal(header.expectedPhysicalLines,58);assert.equal(header.expectedTAPResults,59);assert.deepEqual(header.caseData,plan.caseData);assert.deepEqual(header.originalSourcePins,plan.originalSourcePins);assert.equal(footer.schema,'rea-search-any-original-observed-footer/v1');assert.equal(footer.complete,true);assert.equal(footer.records,56);assert.deepEqual(footer.observedCounts,{parser:16,'metadata-sql':32,'notebook-diagnostic':8});
  for(const row of [header,footer]){assert.equal(row.originalFullApplicationExecuted,false);assert.equal(row.originalPersistedSearchDatabaseExecuted,false);assert.equal(row.FTSOrRankCompared,false);}assert.equal(footer.assertionOutcomeMustBeReadFromActualTAP,true);assert.equal(footer.TAPParentAndChildResultsExpected,59);
  assert.equal(result.TAP.totalResults,59);const counts={parser:0,'metadata-sql':0,'notebook-diagnostic':0};
  for(const[index,row]of cases.entries()){const expected=plan.observationCases[index];assert.equal(row.schema,'rea-search-any-original-observed-case/v1');assert.equal(row.caseId,expected.caseId);assert.equal(row.kind,expected.kind);assert.equal(row.query,expected.query);assert.equal(row.ordinal,index);assert.equal(row.caseIndex,counts[row.kind]++);assert.deepEqual(row.originalSourcePins,plan.originalSourcePins);assert.equal(row.recordedBeforeStrictAssertion,true);
    if(row.kind==='parser'){assert(row.original&&row.replacement);assert.deepEqual(row.original,row.replacement);}
    else if(row.kind==='metadata-sql'){assert(typeof row.SQL==='string'&&row.SQL.length&&Array.isArray(row.params));assert.equal(row.originalExecution.builderReturned,true);assert.equal(row.originalExecution.sqliteAttempted,true);assert.equal(row.originalExecution.stage,'sqlite-execution');assert.deepEqual(row.original,row.replacement);assert.deepEqual(row.original.value,row.originalResultIds);assert.deepEqual(row.replacement.value,row.replacementResultIds);assert.deepEqual(row.originalResultIds,row.replacementResultIds);assert.deepEqual(row.originalResultIds,[...new Set(row.originalResultIds)].sort());for(const name of row.originalResultIds)assert(plan.fixtureIds.includes(name));}
    else {assert.equal(row.kind,'notebook-diagnostic');assert(row.laneA&&row.laneB&&row.replacement);assert.equal(row.comparisonRequired,false);for(const lane of [row.laneA,row.laneB]){assert.equal(lane.builderReturned,true);assert.equal(lane.sqliteAttempted,true);assert.equal(lane.stage,'sqlite-execution');assert(typeof lane.SQL==='string'&&Array.isArray(lane.params));assert(lane.outcome&&Object.hasOwn(lane.outcome,'value')!==Object.hasOwn(lane.outcome,'error'));}const mirror=row.mirrorVerification;assert.equal(mirror.schema,'rea-any-notebook-plain-rowid-mirror/v1');assert.equal(mirror.databaseKind,'synthetic in-memory SQLite ordinary table, not FTS');assert.equal(mirror.virtualFTSTableCreated,false);assert.equal(mirror.FTSOrRankCompared,false);assert.equal(mirror.rowidIdAndContentEqual,true);assert.equal(mirror.originalSQLRewritten,false);assert.equal(mirror.originalFunctionBodiesRewritten,false);assert(!/VIRTUAL\s+TABLE/i.test(mirror.actualCreateTableSQL));assert.deepEqual(mirror.notesRows,plan.diagnosticExpectedNotesRows);assert.deepEqual(mirror.mirrorRows,plan.diagnosticExpectedNotesRows);assert(Array.isArray(row.replacement.value));for(const name of row.replacement.value)assert(plan.fixtureIds.includes(name));}
  }
  assert.deepEqual(counts,{parser:16,'metadata-sql':32,'notebook-diagnostic':8});return{path:name,...id(bytes),physicalJSONLReadback:true,physicalLines:58,records:56,counts,actual59TAPAlsoRequired:true,notebookDiagnosticRowsNotCompatibilityPasses:8,originalFullApplicationExecuted:false,originalPersistedSearchDatabaseExecuted:false,FTSOrRankCompared:false};
}
let record={schema:'rea-notes-search-any-phase/v1',execution:execution(),sourceCommit:process.env.GITHUB_SHA,parentCommit:PARENT,sourcePlan:id(planBytes),phase,status:'failed',sourceOverlay:true,installedAnyClaimed:false,historicalReceiptsRebound:false,fullParity:false,superiority:false,performanceMeasured:false,originalFullApplicationExecutions:0,browserExecutions:0};
try {
  if(phase==='before') {assert(!fs.existsSync(path.join(root,legacyObservation)),'No stale legacy observation');record.current=requireCapture(capture('before','baseline'));record.status='baseline-source-authenticated-unexecuted';}
  else if(phase==='overlay') {
    const before=JSON.parse(read(evidence,'before.json',evidenceLimits.memberBytes));sameAttempt(before);assert.equal(before.status,'baseline-source-authenticated-unexecuted');const baseline=requireCapture(capture('preoverlay','baseline',false));assert.deepEqual(baseline.rows,before.current.rows);
    const replacements=plan.overlays.map(row=>{const bytes=read(root,row.payload.path);assert.deepEqual(id(bytes),pin(row.payload));assert.deepEqual(id(bytes),pin(row.after));committed(row.payload.path,bytes);assert.deepEqual(id(read(root,row.path)),pin(row.before));return{row,bytes};});
    record.writes=[];for(const{row,bytes}of replacements){writeTarget({path:row.path,...row.after},bytes);record.writes.push({path:row.path,before:row.before,after:row.after,payload:row.payload});}
    record.current=requireCapture(capture('ready','overlay'));record.status='ready-experimental-overlay-unexecuted';record.baselineReceipt=id(read(evidence,'before.json',evidenceLimits.memberBytes));
  } else if(phase==='verify') {
    const prepared=ready();record.tests=[];const deadline=Date.now()+26*60*1000;assert.equal(plan.tests[0].path,PREFIX+'/tests/original-any-values.test.mjs');
    let observations=null,observationError=null;
    for(const[index,row]of plan.tests.entries()){const remaining=deadline-Date.now();assert(remaining>0,'Campaign execution budget exhausted; no forced skip can qualify');const bytes=read(root,row.path);assert.deepEqual(id(bytes),pin(row.source));record.tests.push(await run(row,index,Math.min(180000,remaining)));if(index===0){try{observations=observedValues(record.tests[0]);}catch(error){observationError={name:error.name,message:error.message};}json('original-observation-qualification.json',{schema:'rea-notes-search-any-observation-qualification/v1',execution:execution(),sourceCommit:process.env.GITHUB_SHA,parentCommit:PARENT,sourcePlan:id(planBytes),status:observations?'passed':'failed',observations,observationError,rawChildResult:record.tests[0],productRegressionAcceptanceClaimed:false});}}
    const current=requireCapture(capture('execution-end','overlay',false));assert.deepEqual(current.rows,prepared.current.rows);record.observations=observations;record.observationError=observationError;record.status=record.tests.every(row=>row.status==='passed')&&observations?'passed':'failed';if(record.status!=='passed')process.exitCode=1;
  } else if(phase==='postcheck') {record.observed=capture('postrun-observed','observed');const prepared=ready();record.current=requireCapture(capture('postrun','overlay',false));assert.deepEqual(record.current.rows,prepared.current.rows);record.status='experimental-overlay-source-stable';}
  else {
    record.observedBeforeRestoration=capture('pre-restoration','observed');const actual=status();assert(actual.every(row=>row.status===' M'&&plan.overlays.some(item=>item.path===row.path)),'Unknown path/status cannot be overwritten or hidden by restoration');
    const replacements=plan.overlays.map(row=>{const bytes=read(root,row.path);assert([row.before.sha256,row.after.sha256].includes(id(bytes).sha256),'Unexpected target bytes preserved; restoration refused');const baseline=git(['show',PARENT+':'+row.path],sourceLimits.memberBytes);assert.deepEqual(id(baseline),pin(row.before));assert.equal(blob(baseline),row.before.gitBlob);return{row,baseline};});
    record.restored=[];for(const{row,baseline}of replacements){writeTarget({path:row.path,...row.before},baseline);record.restored.push({path:row.path,...id(baseline)});}record.current=requireCapture(capture('restored','baseline'));record.status='baseline-source-restored';record.installedAnyClaimed=false;
  }
}catch(error){record.failure={name:error.name,message:error.message,stack:String(error.stack).slice(0,16000)};process.exitCode=1;}
json(phase+'.json',record);console.log(JSON.stringify({phase,status:record.status,sourceCommit:process.env.GITHUB_SHA,parentCommit:PARENT,sourceOverlay:true,installedAnyClaimed:false,fullParity:false}));
