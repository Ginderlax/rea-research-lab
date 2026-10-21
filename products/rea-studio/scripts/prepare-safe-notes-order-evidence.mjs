// Prospective, source-only authored metadata gate. Invoke only after exact
// source review and separate hosted filter validation. No product imports.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const HASH=/^[0-9a-f]{64}$/, SHA1=/^[0-9a-f]{40}$/;
const LIMIT=Object.freeze({files:10000,depth:32,member:8*1024*1024,total:128*1024*1024,policy:256*1024,manifest:4*1024*1024,deadline:120000});
const sha=b=>createHash('sha256').update(b).digest('hex');
const id=b=>({bytes:b.length,sha256:sha(b)});
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const ordinal=(a,b)=>a<b?-1:a>b?1:0;
const json=b=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));
const encoded=v=>Buffer.from(JSON.stringify(v,null,2)+'\n');
function requireSafe(ok,code){if(!ok){const error=new Error(code);error.code=code;throw error;}}
function object(v){return v!==null&&typeof v==='object'&&!Array.isArray(v);}
function keys(v,expected,code){requireSafe(object(v)&&Object.keys(v).sort().join('\0')===[...expected].sort().join('\0'),code);}
function relativeName(name){
  requireSafe(typeof name==='string'&&name.length>0&&name.length<=1024,'MEMBER_NAME');
  requireSafe(!path.isAbsolute(name)&&!/[\\:\x00-\x1f\x7f]/.test(name),'MEMBER_SEPARATOR');
  for(const part of name.split('/'))requireSafe(part&&part!=='.'&&part!=='..'&&!/[. ]$/.test(part)&&!/[<>"|?*]/.test(part)&&!/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part),'MEMBER_COMPONENT');
  return name;
}
function plain(full,file=false){
  requireSafe(path.isAbsolute(full),'ABSOLUTE_OWNED_PATH');
  const parsed=path.parse(full);let at=parsed.root;
  for(const component of full.slice(parsed.root.length).split(path.sep).filter(Boolean)){
    at=path.join(at,component);const stat=fs.lstatSync(at);
    requireSafe(!stat.isSymbolicLink(),'LINK_PATH');
    requireSafe(at===full&&file?stat.isFile():stat.isDirectory(),'ORDINARY_PATH');
    if(at===full&&file)requireSafe(stat.nlink===1,'FILE_LINK_COUNT');
  }
  requireSafe(fs.realpathSync(full).toLowerCase()===full.toLowerCase(),'REAL_PATH_ALIAS');return full;
}
function stableRead(full,maximum){
  plain(full,true);const before=fs.lstatSync(full,{bigint:true});requireSafe(before.size<=BigInt(maximum),'MEMBER_BYTE_BOUND');
  requireSafe(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1n,'READ_PATH_IDENTITY');const descriptor=fs.openSync(full,'r');
  try{
    const opened=fs.fstatSync(descriptor,{bigint:true});for(const name of['dev','ino','size','mtimeNs','ctimeNs'])requireSafe(before[name]===opened[name],'OPENED_FILE_IDENTITY');
    const b=Buffer.alloc(Number(before.size)+1);let offset=0;
    while(offset<b.length){const got=fs.readSync(descriptor,b,offset,b.length-offset,null);if(got===0)break;offset+=got;}
    const after=fs.fstatSync(descriptor,{bigint:true}),atPath=fs.lstatSync(full,{bigint:true});
    requireSafe(atPath.isFile()&&!atPath.isSymbolicLink()&&atPath.nlink===1n,'READ_PATH_CHANGED');
    for(const name of['dev','ino','size','mtimeNs','ctimeNs'])requireSafe(before[name]===after[name]&&before[name]===atPath[name],'CHANGED_DURING_READ');
    requireSafe(BigInt(offset)===before.size,'READ_LENGTH');return b.subarray(0,offset);
  }finally{fs.closeSync(descriptor);}
}
function decode32(bytes,bigEndian){
  requireSafe(bytes.length%4===0,'UTF32_LENGTH');const points=[];
  for(let at=0;at<bytes.length;at+=4){const cp=bigEndian?bytes.readUInt32BE(at):bytes.readUInt32LE(at);requireSafe(cp<=0x10ffff&&(cp<0xd800||cp>0xdfff),'UTF32_SCALAR');points.push(String.fromCodePoint(cp));}
  return points.join('');
}
function scanView(bytes,strictText){
  let value;
  if(bytes.length>=4&&bytes.subarray(0,4).equals(Buffer.from([255,254,0,0])))value=decode32(bytes.subarray(4),false);
  else if(bytes.length>=4&&bytes.subarray(0,4).equals(Buffer.from([0,0,254,255])))value=decode32(bytes.subarray(4),true);
  else if(bytes.length>=2&&bytes[0]===255&&bytes[1]===254)value=new TextDecoder('utf-16le',{fatal:true}).decode(bytes.subarray(2));
  else if(bytes.length>=2&&bytes[0]===254&&bytes[1]===255)value=new TextDecoder('utf-16be',{fatal:true}).decode(bytes.subarray(2));
  else if(strictText)value=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  else value=bytes.toString('latin1').replace(/\0/g,'');
  requireSafe(!strictText||!value.includes('\0'),'TEXT_NUL');
  return value.replace(/\\/g,'/').replace(/\/+/g,'/');
}
export function scanProfile(bytes,member,role,{strictText=true,runnerLogPaths=[]}={}){
  requireSafe(Buffer.isBuffer(bytes),'SCAN_BYTES');relativeName(member);
  const view=scanView(bytes,strictText);let allowedRunnerOccurrences=0;
  // Match a profile root even when a principal begins with whitespace. Parsing
  // through slash/doublequote preserves apostrophes as legal component bytes.
  const roots=/(?:(?<drive>[a-z]):\/Users\/|(?<![a-z0-9:])\/(?:home|Users)\/)/ig;
  for(const match of view.matchAll(roots)){
    let end=match.index+match[0].length;
    while(end<view.length&&view[end]!=='/'&&view[end]!=='"')end++;
    const principal=view.slice(match.index+match[0].length,end);
    const exactRunner=match.groups.drive?.toLowerCase()==='c'&&/^(runneradmin|RUNNER~1)$/i.test(principal);
    const delimiter=end===view.length||view[end]==='/'||view[end]==='"';
    if(['full','finite'].includes(role)&&runnerLogPaths.includes(member)&&exactRunner&&delimiter)allowedRunnerOccurrences++;
    else return {omit:true,reason:'ABSOLUTE_USER_PROFILE_PATH',allowedRunnerOccurrences};
  }
  return {omit:false,allowedRunnerOccurrences};
}
function inventory(root,timed){
  plain(root);const files=[],names=new Set();let total=0;
  function visit(directory,prefix='',depth=0){
    timed();requireSafe(depth<=LIMIT.depth,'TREE_DEPTH');plain(directory);
    for(const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>ordinal(a.name,b.name))){
      timed();const name=relativeName(prefix+entry.name),full=path.join(directory,entry.name);const stat=fs.lstatSync(full);
      requireSafe(!entry.isSymbolicLink()&&!stat.isSymbolicLink(),'TREE_LINK');
      const normalized=name.normalize('NFC').toLowerCase();requireSafe(!names.has(normalized),'CASE_OR_NORMALIZATION_COLLISION');names.add(normalized);
      requireSafe(names.size<=20000,'TREE_ENTRY_BOUND');
      if(entry.isDirectory()){requireSafe(stat.isDirectory(),'DIRECTORY_TYPE');visit(full,name+'/',depth+1);}
      else {requireSafe(entry.isFile()&&stat.isFile(),'FILE_TYPE');const bytes=stableRead(full,LIMIT.member);total+=bytes.length;requireSafe(total<=LIMIT.total,'TOTAL_BYTE_BOUND');files.push({path:name,...id(bytes),data:bytes});requireSafe(files.length<=LIMIT.files,'FILE_COUNT_BOUND');}
    }
  }
  visit(root);return files.sort((a,b)=>ordinal(a.path,b.path));
}
function identityEqual(actual,wanted,code){requireSafe(object(wanted)&&Number.isSafeInteger(wanted.bytes)&&wanted.bytes>=0&&HASH.test(wanted.sha256),'PIN_SHAPE');requireSafe(actual.bytes===wanted.bytes&&actual.sha256===wanted.sha256,code);}
function executionCheck(execution,policy){
  requireSafe(execution.repository==='Ginderlax/rea-research-lab'&&SHA1.test(execution.source)&&SHA1.test(execution.parent),'SOURCE_IDENTITY');
  requireSafe(execution.workflowSHA===execution.source&&execution.ref==='refs/heads/'+policy.branch&&execution.parent===policy.parent,'WORKFLOW_SOURCE_PARENT_REF');
  requireSafe(/^[1-9][0-9]*$/.test(execution.runID)&&/^[1-9][0-9]*$/.test(execution.attempt)&&execution.job===({full:'full-current-installed',finite:'notes46-installed-finite',values:'notes46-observed-values',browser:'draft-recovery-real-chromium'})[execution.role],'RUN_IDENTITY');
  requireSafe(['full','finite','values','browser'].includes(execution.role),'ROLE');
}
function validatePolicy(policy){
  keys(policy,['schema','branch','parent','sourceManifest','workflow','expectedSourceOmissions','sourceOpaquePins','runnerLogPaths','roles'],'POLICY_KEYS');
  requireSafe(policy.schema==='rea-safe-cloud-evidence-policy/v1'&&typeof policy.branch==='string'&&policy.branch.length<=200&&SHA1.test(policy.parent),'POLICY_IDENTITY');
  relativeName(policy.sourceManifest);relativeName(policy.workflow);
  requireSafe(Array.isArray(policy.expectedSourceOmissions)&&policy.expectedSourceOmissions.length<=256,'OMISSION_POLICY');
  requireSafe(new Set(policy.expectedSourceOmissions).size===policy.expectedSourceOmissions.length,'DUPLICATE_EXPECTED_OMISSION');
  for(const name of policy.expectedSourceOmissions)relativeName(name);
  requireSafe(Array.isArray(policy.sourceOpaquePins)&&policy.sourceOpaquePins.length<=256,'SOURCE_OPAQUE_PIN_COUNT');const opaqueNames=new Set();
  for(const pin of policy.sourceOpaquePins){keys(pin,['path','bytes','sha256'],'SOURCE_OPAQUE_PIN_KEYS');relativeName(pin.path);identityEqual(pin,pin,'SOURCE_OPAQUE_PIN_SHAPE');requireSafe(pin.bytes<=LIMIT.member&&!opaqueNames.has(pin.path),'SOURCE_OPAQUE_PIN_UNIQUE_BOUND');opaqueNames.add(pin.path);}
  requireSafe(Array.isArray(policy.runnerLogPaths)&&policy.runnerLogPaths.every(name=>['current-full/stdout.txt','full-suite/stdout.txt'].includes(name)),'RUNNER_LOG_ALLOWLIST');
  keys(policy.roles,['full','finite','values','browser'],'ROLE_POLICY_KEYS');
  for(const rules of Object.values(policy.roles)){
    requireSafe(Array.isArray(rules)&&rules.length<=64,'RULE_COUNT');
    for(const rule of rules){keys(rule,['pattern','kind','maxBytes'],'ROLE_RULE_KEYS');requireSafe(typeof rule.pattern==='string'&&rule.pattern.startsWith('^')&&rule.pattern.endsWith('$')&&rule.pattern.length<=300,'ANCHORED_ROLE_RULE');requireSafe(['text','synthetic-opaque'].includes(rule.kind)&&Number.isSafeInteger(rule.maxBytes)&&rule.maxBytes>=0&&rule.maxBytes<=LIMIT.member,'ROLE_RULE_BOUNDS');new RegExp(rule.pattern);}
  }
}
function sourceMembers(files,policy,execution,manifestSHA){
  const byName=new Map(files.map(row=>[row.path,row])),expected=new Map();let baseline=null;
  const labels=['before','preexecution','after'];
  for(const label of labels){
    const recordRow=byName.get('source-'+label+'.json');requireSafe(recordRow,'SOURCE_RECORD_REQUIRED');const record=json(recordRow.data);
    requireSafe(record.schema==='rea-notes-order-source-capture/v2'&&record.label===label,'SOURCE_RECORD_IDENTITY');
    for(const[name,value]of Object.entries({sourceCommit:execution.source,branch:execution.ref,runId:execution.runID,attempt:execution.attempt,job:execution.job,role:execution.role}))requireSafe(record[name]===value,'SOURCE_EXECUTION_JOIN');
    requireSafe(record.completeSourceClosureAssertedByReviewedManifest===true&&record.productProcessesStarted===0&&record.currentActiveTests===184,'SOURCE_RECORD_BOUNDARY');
    assert.deepEqual(record.status,[]);
    const prefix='source-'+label+'/',manifestRow=byName.get(prefix+policy.sourceManifest+'.snapshot'),workflowRow=byName.get(prefix+policy.workflow+'.snapshot');
    requireSafe(manifestRow&&workflowRow,'SOURCE_EXTRA_SNAPSHOTS');identityEqual(manifestRow,record.manifest,'MANIFEST_SNAPSHOT_PIN');requireSafe(manifestRow.sha256===manifestSHA,'SOURCE_MANIFEST_HASH');
    const manifest=json(manifestRow.data);
    requireSafe(manifest.schema==='rea-notes-order-hosted-campaign/v1'&&manifest.parent===execution.parent&&manifest.branch===execution.ref&&manifest.executionAuthorized===true&&manifest.fullCurrentRosterReviewed===true&&manifest.sourceClosureReviewed===true,'SOURCE_MANIFEST_SCHEMA');
    requireSafe(Array.isArray(manifest.sourceRows)&&manifest.sourceRows.length>=40&&manifest.sourceRows.length<=4096,'SOURCE_ROW_COUNT');
    requireSafe(Array.isArray(manifest.currentActiveTestFiles)&&manifest.currentActiveTestFiles.length===184,'CURRENT_FULL_TEST_ROSTER');
    requireSafe(Array.isArray(record.rows)&&record.rows.length===manifest.sourceRows.length&&Array.isArray(record.extras)&&record.extras.length===2,'SOURCE_RECORD_COUNT');
    const seen=new Set();let bytes=0;
    for(let index=0;index<manifest.sourceRows.length;index++){
      const declared=manifest.sourceRows[index],observed=record.rows[index];relativeName(declared.path);requireSafe(!seen.has(declared.path),'SOURCE_DUPLICATE');seen.add(declared.path);
      requireSafe(observed.path===declared.path&&declared.rawMode==='100644'&&observed.rawMode==='100644'&&SHA1.test(observed.gitBlob),'SOURCE_ROW_ORDER_MODE_BLOB');
      requireSafe(observed.admission===declared.admission&&['changed-sha256','inherited-parent-gitblob'].includes(declared.admission),'SOURCE_ROW_ADMISSION');
      if(declared.admission==='changed-sha256')identityEqual(observed,declared,'CHANGED_SOURCE_ROW_PIN');
      else requireSafe(SHA1.test(declared.gitBlob)&&observed.gitBlob===declared.gitBlob,'INHERITED_PARENT_GIT_BLOB');
      const name=prefix+declared.path+'.snapshot',row=byName.get(name);requireSafe(row,'SOURCE_BODY_REQUIRED');identityEqual(row,observed,'SOURCE_BODY_PIN');requireSafe(blob(row.data)===observed.gitBlob,'SOURCE_BODY_GIT_BLOB');expected.set(name,observed);bytes+=row.bytes;
    }
    const extras=[policy.sourceManifest,policy.workflow];
    for(let index=0;index<extras.length;index++){
      const extra=record.extras[index],name=prefix+extras[index]+'.snapshot',row=byName.get(name);
      requireSafe(extra.path===extras[index]&&!seen.has(extra.path)&&extra.rawMode==='100644'&&SHA1.test(extra.gitBlob)&&row,'SOURCE_EXTRA_IDENTITY');seen.add(extra.path);identityEqual(row,extra,'SOURCE_EXTRA_PIN');requireSafe(blob(row.data)===extra.gitBlob,'SOURCE_EXTRA_BLOB');expected.set(name,extra);bytes+=row.bytes;
    }
    requireSafe(bytes===record.rawBytes,'SOURCE_RAW_BYTE_TOTAL');
    for(const pin of policy.sourceOpaquePins){requireSafe(seen.has(pin.path),'OPAQUE_SOURCE_REQUIRED');identityEqual(expected.get(prefix+pin.path+'.snapshot'),pin,'OPAQUE_SOURCE_MANIFEST_PIN');}
    const signature={manifest:record.manifest,rows:record.rows,extras:record.extras};if(baseline)assert.deepEqual(signature,baseline);else baseline=signature;
  }
  if(execution.role==='full'&&byName.has('full-suite/source-snapshot-manifest.json')){
    const summary=json(byName.get('full-suite/source-snapshot-manifest.json').data);
    requireSafe(summary.schema==='rea-cloud-source-snapshots/v1'&&summary.snapshotScope==='active'&&Array.isArray(summary.files),'FULL_SOURCE_SNAPSHOT_SUMMARY');
    const wanted=[...expected.entries()].filter(([name,row])=>name.startsWith('source-before/')&&row.path.startsWith('products/rea-studio/')&&/\.(mjs|json|html|css|ps1)$/.test(row.path)&&!row.path.split('/').includes('results')&&(/products\/rea-studio\/(?:apps|lib|public|scripts|tests)\//.test(row.path)||['products/rea-studio/server.mjs','products/rea-studio/catalog.mjs','products/rea-studio/package.json'].includes(row.path))).map(([,row])=>row);
    requireSafe(summary.files.length===wanted.length,'FULL_SOURCE_CLOSED_COUNT');const seen=new Set();
    for(const row of summary.files){
      relativeName(row.sourcePath);const canonical='products/rea-studio/'+row.sourcePath,pin=wanted.find(item=>item.path===canonical),name='full-suite/source/'+row.sourcePath+'.snapshot',body=byName.get(name);
      requireSafe(pin&&body&&row.path==='source/'+row.sourcePath+'.snapshot'&&!seen.has(canonical),'FULL_SOURCE_CLOSED_MEMBER');seen.add(canonical);
      identityEqual(row,pin,'FULL_SOURCE_SUMMARY_PIN');identityEqual(body,pin,'FULL_SOURCE_BODY_PIN');requireSafe(blob(body.data)===pin.gitBlob,'FULL_SOURCE_BODY_BLOB');expected.set(name,pin);
    }
    const runnerName='full-suite/runner.mjs.snapshot',runner=byName.get(runnerName),runnerPin=wanted.find(row=>row.path==='products/rea-studio/scripts/verify-cloud-current-installed.mjs');
    requireSafe(runner&&runnerPin,'FULL_RUNNER_SOURCE_REQUIRED');identityEqual(runner,runnerPin,'FULL_RUNNER_SOURCE_PIN');requireSafe(blob(runner.data)===runnerPin.gitBlob,'FULL_RUNNER_SOURCE_BLOB');expected.set(runnerName,runnerPin);
  }
  return expected;
}
function sourceRule(member,row,policy){
  const captured=/^source-(?:before|preexecution|after)\/(.+)\.snapshot$/.exec(member),full=/^full-suite\/source\/(.+)\.snapshot$/.exec(member);const sourcePath=captured?.[1]??(full?'products/rea-studio/'+full[1]:member==='full-suite/runner.mjs.snapshot'?'products/rea-studio/scripts/verify-cloud-current-installed.mjs':null);requireSafe(sourcePath,'SOURCE_RULE_PREFIX');
  const pin=policy.sourceOpaquePins.find(pin=>pin.path===sourcePath);
  if(pin)identityEqual(row,pin,'OPAQUE_SOURCE_BODY_PIN');
  return {kind:pin?'synthetic-opaque':'text',maxBytes:LIMIT.member};
}
function privateHandoff(files,execution,manifestSHA){
  const name='bootstrap-environment.json',row=files.find(row=>row.path===name);if(!row)return new Set();
  const handoff=json(row.data);keys(handoff,['schema','status','execution','role','values','manifest','failure'],'PRIVATE_HANDOFF_KEYS');
  requireSafe(handoff.schema==='rea-notes-order-bootstrap-environment/v1'&&handoff.status==='acquired'&&handoff.role===execution.role&&handoff.failure===null,'PRIVATE_HANDOFF_IDENTITY');
  assert.deepEqual(handoff.execution,{GITHUB_SHA:execution.source,GITHUB_RUN_ID:execution.runID,GITHUB_RUN_ATTEMPT:execution.attempt,GITHUB_JOB:execution.job,GITHUB_REPOSITORY:execution.repository});
  requireSafe(handoff.manifest.sha256===manifestSHA,'PRIVATE_HANDOFF_MANIFEST');
  const temporary=fs.realpathSync(process.env.RUNNER_TEMP),repository=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
  const expected=execution.role==='full'?{FLOW_ORIGINAL_CACHE:path.join(repository,'.local/flow-original'),REA_KEEPASS_EXE:path.join(repository,'.local/keepass-original/portable/KeePass.exe'),REA_ARCHIVE_ZIP_AES_ORIGINAL_EVIDENCE:path.join(temporary,'rea-notes-order-full-'+execution.runID+'-'+execution.attempt),REA_ARCHIVE_ZIP_ROLE:'zip-original',REA_SYNC_DOWNLOAD_ORIGINAL_EVIDENCE:path.join(temporary,'rea-notes-order-sync-original-'+execution.runID+'-'+execution.attempt)}:execution.role==='browser'?{PLAYWRIGHT_BROWSERS_PATH:path.join(temporary,'rea-notes-order-chromium-'+execution.runID+'-'+execution.attempt)}:{};
  assert.deepEqual(handoff.values,expected);
  const collector=files.find(row=>row.path==='collector-run.json');requireSafe(collector,'PRIVATE_HANDOFF_COLLECTOR_JOIN');const record=json(collector.data);
  requireSafe(record.schema==='rea-notes-order-collector-phase/v1'&&record.phase==='run'&&record.sourceCommit===execution.source&&record.runId===execution.runID&&record.attempt===execution.attempt&&record.job===execution.job&&record.role===execution.role,'PRIVATE_HANDOFF_COLLECTOR_IDENTITY');
  identityEqual(row,record.bootstrapEnvironment?.receipt,'PRIVATE_HANDOFF_COLLECTOR_PIN');assert.deepEqual(record.bootstrapEnvironment.allowedKeys,Object.keys(expected).sort(ordinal));
  return new Set([name]);
}
function createParents(root,name){
  let at=root;
  for(const component of name.split('/').slice(0,-1)){at=path.join(at,component);if(!fs.existsSync(at))fs.mkdirSync(at);plain(at);}
}
function writeOwned(root,name,bytes){relativeName(name);createParents(root,name);const full=path.join(root,...name.split('/'));fs.writeFileSync(full,bytes,{flag:'wx'});identityEqual(id(stableRead(full,LIMIT.manifest>bytes.length?LIMIT.manifest:LIMIT.member)),id(bytes),'SAFE_READBACK');}
export function prepareSafeEvidence({raw,output,policy,execution,manifestSHA}){
  const start=Date.now(),timed=()=>requireSafe(Date.now()-start<=LIMIT.deadline,'FILTER_DEADLINE');validatePolicy(policy);executionCheck(execution,policy);requireSafe(HASH.test(manifestSHA),'REVIEWED_MANIFEST_HASH');
  const temporary=fs.realpathSync(process.env.RUNNER_TEMP);plain(temporary);raw=path.resolve(raw);output=path.resolve(output);
  requireSafe(path.dirname(raw)===temporary&&path.dirname(output)===temporary&&raw!==output,'OWNED_FILTER_ROOTS');
  requireSafe(path.basename(raw)==='rea-notes-order-'+execution.role+'-'+execution.runID+'-'+execution.attempt,'RAW_ROOT_NAME');
  requireSafe(path.basename(output)==='rea-safe-notes-order-'+execution.role+'-'+execution.runID+'-'+execution.attempt,'SAFE_ROOT_NAME');
  requireSafe(!fs.existsSync(output),'NO_EARLIER_SAFE_OUTPUT');
  const files=inventory(raw,timed),expected=sourceMembers(files,policy,execution,manifestSHA),privateNames=privateHandoff(files,execution,manifestSHA),omitted=[],kept=[];
  const expectedOmissions=new Set(['before','preexecution','after'].flatMap(phase=>policy.expectedSourceOmissions.map(name=>'source-'+phase+'/'+name+'.snapshot')));
  for(const name of expectedOmissions)requireSafe(expected.has(name),'EXPECTED_OMISSION_SOURCE_REQUIRED');
  for(const [name,pin]of expected)if(name.startsWith('full-suite/')&&policy.expectedSourceOmissions.includes(pin.path))expectedOmissions.add(name);
  for(const name of privateNames)expectedOmissions.add(name);
  const rules=policy.roles[execution.role].map(rule=>({...rule,regex:new RegExp(rule.pattern)}));let allowedRunnerOccurrences=0;
  for(const row of files){
    timed();requireSafe(!['safe-evidence.json','omissions.json','retained-members.json'].includes(row.path),'RESERVED_OUTPUT_MEMBER');
    if(privateNames.has(row.path)){omitted.push({path:row.path,bytes:row.bytes,sha256:row.sha256,reason:'PRIVATE_HOSTED_ENVIRONMENT_HANDOFF',sourceSnapshot:false});continue;}
    const source=expected.has(row.path);
    requireSafe(source||!['source-before/','source-preexecution/','source-after/'].some(prefix=>row.path.startsWith(prefix)),'UNKNOWN_SOURCE_SNAPSHOT');
    const matched=source?[]:rules.filter(rule=>rule.regex.test(row.path));requireSafe(source||matched.length===1,'UNADMITTED_RESULT_MEMBER');
    const rule=source?sourceRule(row.path,row,policy):matched[0];
    requireSafe(row.bytes<=rule.maxBytes,'ROLE_MEMBER_SIZE');
    requireSafe(!/\.(exe|dll|msi|com)$/i.test(row.path)&&!(row.data[0]===77&&row.data[1]===90)&&!(row.data.length>=4&&row.data.subarray(0,4).equals(Buffer.from([127,69,76,70]))),'VENDOR_EXECUTABLE_DENIED');
    const scan=scanProfile(row.data,row.path,execution.role,{strictText:rule.kind==='text',runnerLogPaths:policy.runnerLogPaths});allowedRunnerOccurrences+=scan.allowedRunnerOccurrences;
    if(scan.omit){requireSafe(source&&expectedOmissions.has(row.path),'UNEXPECTED_PROFILE_RESULT');omitted.push({path:row.path,bytes:row.bytes,sha256:row.sha256,reason:scan.reason,sourceSnapshot:true});}
    else {requireSafe(!expectedOmissions.has(row.path),'EXPECTED_PROFILE_OMISSION_NOT_FOUND');kept.push(row);}
  }
  requireSafe(omitted.length===expectedOmissions.size&&omitted.every(row=>expectedOmissions.has(row.path)),'COMPLETE_OMISSION_SET');
  // Recheck the entire raw inventory before the first output directory or copy.
  const second=inventory(raw,timed);assert.deepEqual(second.map(({data,...row})=>row),files.map(({data,...row})=>row));
  const originalBytes=files.reduce((n,row)=>n+row.bytes,0),retainedBytes=kept.reduce((n,row)=>n+row.bytes,0),omittedBytes=omitted.reduce((n,row)=>n+row.bytes,0);
  requireSafe(originalBytes===retainedBytes+omittedBytes,'PARTITION_BYTES');
  const representation={schema:'rea-safe-cloud-evidence-representation/v1',status:'complete-derived-safe-view',execution,representation:'privacy-filtered-whole-member-derived-view',completeSourceAdmission:true,uploadedSourceSnapshotsComplete:omitted.every(row=>row.sourceSnapshot===false),rawCompleteArchiveUploaded:false,originalFiles:files.length,originalBytes,omittedFiles:omitted.length,omittedBytes,retainedFiles:kept.length,retainedBytes,allowedRunnerOccurrences,sourceManifestSHA256:manifestSHA,originalGitModeProof:'Source-associated admission; raw file identity reconstruction does not independently observe Git modes.',sourceRecovery:'Omitted source bodies require separately labeled exact pinned local Git-blob copies and SHA reconciliation; those are not original downloaded captured bodies. The private hosted environment handoff is deliberately excluded from this public representation.',historicalReceiptsRebound:false,productAcceptance:false,fullParity:false,superiority:false,universalSecretDetector:false};
  const generated=[['omissions.json',encoded({schema:'rea-safe-cloud-whole-member-omissions/v1',execution,rows:omitted})],['retained-members.json',encoded({schema:'rea-safe-cloud-unchanged-members/v1',execution,rows:kept.map(({data,...row})=>row)})],['safe-evidence.json',encoded(representation)]];
  for(const[name,bytes]of generated){requireSafe(bytes.length<=LIMIT.manifest,'GENERATED_MANIFEST_BOUND');requireSafe(!scanProfile(bytes,name,execution.role).omit,'GENERATED_PROFILE_PATH');}
  fs.mkdirSync(output);plain(output);
  for(const row of kept){timed();writeOwned(output,row.path,row.data);}
  for(const[name,bytes]of generated)writeOwned(output,name,bytes);
  const actual=inventory(output,timed),wanted=[...kept.map(({data,...row})=>row),...generated.map(([name,b])=>({path:name,...id(b)}))].sort((a,b)=>ordinal(a.path,b.path));assert.deepEqual(actual.map(({data,...row})=>row),wanted);
  for(const row of actual){const source=expected.has(row.path),rule=source?sourceRule(row.path,row,policy):rules.find(rule=>rule.regex.test(row.path));requireSafe(!scanProfile(row.data,row.path,execution.role,{strictText:rule?rule.kind==='text':true,runnerLogPaths:policy.runnerLogPaths}).omit,'FINAL_PROFILE_SCAN');}
  return {representation,output,outputFiles:actual.length,outputBytes:actual.reduce((n,row)=>n+row.bytes,0)};
}
function cli(){
  requireSafe(process.platform==='win32'&&process.arch==='x64'&&process.version==='v24.16.0','HOSTED_NODE_RUNTIME');
  for(const[name,value]of Object.entries({CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64'}))requireSafe(process.env[name]===value,'HOSTED_ENVIRONMENT');
  const args=process.argv.slice(2);requireSafe(args.length===6&&args[0]==='--raw'&&args[2]==='--output'&&args[4]==='--policy','FIXED_FILTER_ARGUMENTS');
  const expectedPolicy=process.env.REA_SAFE_EVIDENCE_POLICY_SHA256;requireSafe(HASH.test(expectedPolicy),'REVIEWED_POLICY_HASH');const policyBytes=stableRead(path.resolve(args[5]),LIMIT.policy);requireSafe(sha(policyBytes)===expectedPolicy,'POLICY_HASH');
  const execution={repository:process.env.GITHUB_REPOSITORY,source:process.env.GITHUB_SHA,parent:process.env.REA_NOTES_ORDER_PARENT,workflowSHA:process.env.GITHUB_WORKFLOW_SHA,ref:process.env.GITHUB_REF,runID:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,job:process.env.GITHUB_JOB,role:process.env.REA_NOTES_ORDER_ROLE};
  const result=prepareSafeEvidence({raw:args[1],output:args[3],policy:json(policyBytes),execution,manifestSHA:process.env.REA_NOTES_ORDER_MANIFEST_SHA256});
  requireSafe(typeof process.env.GITHUB_OUTPUT==='string'&&process.env.GITHUB_OUTPUT.length>0,'WORKFLOW_OUTPUT_CHANNEL');
  fs.appendFileSync(process.env.GITHUB_OUTPUT,'artifact_path='+result.output+'\n');
  console.log(JSON.stringify({schema:'rea-safe-evidence-filter-console/v1',status:'safe-view-ready',role:execution.role,source:execution.source,outputFiles:result.outputFiles,outputBytes:result.outputBytes,omittedFiles:result.representation.omittedFiles,rawCompleteArchiveUploaded:false,productAcceptance:false}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{cli();}catch(error){const code=typeof error.code==='string'&&/^[A-Z0-9_]{1,64}$/.test(error.code)?error.code:'FILTER_REFUSED';console.error(JSON.stringify({schema:'rea-safe-evidence-filter-console/v1',status:'failed',code,artifactPathProduced:false,productAcceptance:false}));process.exitCode=1;}
}
