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
    if(role==='finite'&&runnerLogPaths.includes(member)&&exactRunner&&delimiter)allowedRunnerOccurrences++;
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
  requireSafe(/^[1-9][0-9]*$/.test(execution.runID)&&/^[1-9][0-9]*$/.test(execution.attempt)&&execution.job==='validate','RUN_IDENTITY');
  requireSafe(['finite','zip-original','browser'].includes(execution.role),'ROLE');
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
  requireSafe(Array.isArray(policy.runnerLogPaths)&&policy.runnerLogPaths.every(name=>name==='archive-finite.stdout.txt'),'RUNNER_LOG_ALLOWLIST');
  keys(policy.roles,['finite','zip-original','browser'],'ROLE_POLICY_KEYS');
  for(const rules of Object.values(policy.roles)){
    requireSafe(Array.isArray(rules)&&rules.length<=64,'RULE_COUNT');
    for(const rule of rules){keys(rule,['pattern','kind','maxBytes'],'ROLE_RULE_KEYS');requireSafe(typeof rule.pattern==='string'&&rule.pattern.startsWith('^')&&rule.pattern.endsWith('$')&&rule.pattern.length<=300,'ANCHORED_ROLE_RULE');requireSafe(['text','synthetic-opaque'].includes(rule.kind)&&Number.isSafeInteger(rule.maxBytes)&&rule.maxBytes>=0&&rule.maxBytes<=LIMIT.member,'ROLE_RULE_BOUNDS');new RegExp(rule.pattern);}
  }
}
function sourceMembers(files,policy,execution,manifestSHA){
  const byName=new Map(files.map(row=>[row.path,row])),expected=new Map();let baseline=null;
  for(const phase of['before','after']){
    const recordName='source-'+phase+'.json',recordRow=byName.get(recordName);requireSafe(recordRow,'SOURCE_RECORD_REQUIRED');const record=json(recordRow.data);
    requireSafe(record.schema==='rea-archive-zip-aes-source-check/v1'&&record.status==='authenticated'&&record.phase===phase&&record.soleParent===execution.parent,'SOURCE_RECORD_IDENTITY');
    requireSafe(record.sourceOverlay===false&&record.historicalReceiptsRebound===false&&record.productExecutionsByAdmission===0,'SOURCE_RECORD_BOUNDARY');
    const env=record.execution;
    for(const[name,value]of Object.entries({GITHUB_SHA:execution.source,GITHUB_WORKFLOW_SHA:execution.source,GITHUB_REPOSITORY:execution.repository,GITHUB_RUN_ID:execution.runID,GITHUB_RUN_ATTEMPT:execution.attempt,GITHUB_JOB:execution.job,REA_ARCHIVE_ZIP_ROLE:execution.role,RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64'}))requireSafe(env?.[name]===value,'SOURCE_EXECUTION_JOIN');
    requireSafe(record.manifest.path===policy.sourceManifest&&record.manifest.sha256===manifestSHA&&record.workflow.path===policy.workflow,'SOURCE_MANIFEST_WORKFLOW');
    const prefix='source-'+phase+'/',manifestRow=byName.get(prefix+policy.sourceManifest),workflowRow=byName.get(prefix+policy.workflow);
    requireSafe(manifestRow&&workflowRow,'SOURCE_EXTRA_SNAPSHOTS');identityEqual(manifestRow,record.manifest,'MANIFEST_SNAPSHOT_PIN');identityEqual(workflowRow,record.workflow,'WORKFLOW_SNAPSHOT_PIN');
    requireSafe(blob(manifestRow.data)===record.manifest.gitBlob&&blob(workflowRow.data)===record.workflow.gitBlob,'SOURCE_EXTRA_BLOB');
    const manifest=json(manifestRow.data);requireSafe(manifest.schema==='rea-archive-zip-aes-source-admission/v1'&&manifest.parent===execution.parent&&Array.isArray(manifest.files)&&manifest.files.length>=40&&manifest.files.length<=2048,'SOURCE_MANIFEST_SCHEMA');
    requireSafe(record.sourceFilesCount===manifest.files.length&&record.sourceFiles.length===manifest.files.length,'SOURCE_RECORD_COUNT');
    const seen=new Set();let bytes=0;
    for(let index=0;index<manifest.files.length;index++){
      const declared=manifest.files[index],observed=record.sourceFiles[index];relativeName(declared.path);requireSafe(!seen.has(declared.path),'SOURCE_DUPLICATE');seen.add(declared.path);
      requireSafe(observed.path===declared.path,'SOURCE_ROW_ORDER');identityEqual(observed,declared,'SOURCE_ROW_PIN');
      const name=prefix+declared.path,row=byName.get(name);requireSafe(row,'SOURCE_BODY_REQUIRED');identityEqual(row,declared,'SOURCE_BODY_PIN');requireSafe(blob(row.data)===observed.gitBlob,'SOURCE_BODY_GIT_BLOB');expected.set(name,declared);bytes+=declared.bytes;
    }
    for(const pin of policy.sourceOpaquePins){requireSafe(seen.has(pin.path),'OPAQUE_SOURCE_REQUIRED');identityEqual(expected.get(prefix+pin.path),pin,'OPAQUE_SOURCE_MANIFEST_PIN');}
    requireSafe(bytes===record.sourceBytes,'SOURCE_RAW_BYTE_TOTAL');
    expected.set(prefix+policy.sourceManifest,record.manifest);expected.set(prefix+policy.workflow,record.workflow);
    const signature={manifest:record.manifest,workflow:record.workflow,sourceFiles:record.sourceFiles};
    if(baseline)assert.deepEqual(signature,baseline);else baseline=signature;
  }
  return expected;
}
function sourceRule(member,row,policy){
  const match=/^source-(?:before|after)\/(.+)$/.exec(member);requireSafe(match,'SOURCE_RULE_PREFIX');
  const pin=policy.sourceOpaquePins.find(pin=>pin.path===match[1]);
  if(pin)identityEqual(row,pin,'OPAQUE_SOURCE_BODY_PIN');
  return {kind:pin?'synthetic-opaque':'text',maxBytes:LIMIT.member};
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
  requireSafe(path.basename(raw)==='rea-archive-zip-aes-'+execution.role+'-'+execution.runID+'-'+execution.attempt,'RAW_ROOT_NAME');
  requireSafe(path.basename(output)==='rea-safe-archive-'+execution.role+'-'+execution.runID+'-'+execution.attempt,'SAFE_ROOT_NAME');
  requireSafe(!fs.existsSync(output),'NO_EARLIER_SAFE_OUTPUT');
  const files=inventory(raw,timed),expected=sourceMembers(files,policy,execution,manifestSHA),omitted=[],kept=[];
  const expectedOmissions=new Set(['before','after'].flatMap(phase=>policy.expectedSourceOmissions.map(name=>'source-'+phase+'/'+name)));
  for(const name of expectedOmissions)requireSafe(expected.has(name),'EXPECTED_OMISSION_SOURCE_REQUIRED');
  const rules=policy.roles[execution.role].map(rule=>({...rule,regex:new RegExp(rule.pattern)}));let allowedRunnerOccurrences=0;
  for(const row of files){
    timed();requireSafe(!['safe-evidence.json','omissions.json','retained-members.json'].includes(row.path),'RESERVED_OUTPUT_MEMBER');
    const source=expected.has(row.path);
    requireSafe(source||!row.path.startsWith('source-before/')&&!row.path.startsWith('source-after/'),'UNKNOWN_SOURCE_SNAPSHOT');
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
  const representation={schema:'rea-safe-cloud-evidence-representation/v1',status:'complete-derived-safe-view',execution,representation:'privacy-filtered-whole-member-derived-view',completeSourceAdmission:true,uploadedSourceSnapshotsComplete:omitted.length===0,rawCompleteArchiveUploaded:false,originalFiles:files.length,originalBytes,omittedFiles:omitted.length,omittedBytes,retainedFiles:kept.length,retainedBytes,allowedRunnerOccurrences,sourceManifestSHA256:manifestSHA,originalGitModeProof:'Source-associated admission; raw file identity reconstruction does not independently observe Git modes.',sourceRecovery:'Omitted source bodies require separately labeled exact pinned local Git-blob copies and SHA reconciliation; those are not original downloaded captured bodies.',historicalReceiptsRebound:false,productAcceptance:false,fullParity:false,superiority:false,universalSecretDetector:false};
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
  const execution={repository:process.env.GITHUB_REPOSITORY,source:process.env.GITHUB_SHA,parent:process.env.REA_ARCHIVE_ZIP_PARENT,workflowSHA:process.env.GITHUB_WORKFLOW_SHA,ref:process.env.GITHUB_REF,runID:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,job:process.env.GITHUB_JOB,role:process.env.REA_ARCHIVE_ZIP_ROLE};
  const result=prepareSafeEvidence({raw:args[1],output:args[3],policy:json(policyBytes),execution,manifestSHA:process.env.REA_ARCHIVE_ZIP_MANIFEST_SHA256});
  requireSafe(typeof process.env.GITHUB_OUTPUT==='string'&&process.env.GITHUB_OUTPUT.length>0,'WORKFLOW_OUTPUT_CHANNEL');
  fs.appendFileSync(process.env.GITHUB_OUTPUT,'artifact_path='+result.output+'\n');
  console.log(JSON.stringify({schema:'rea-safe-evidence-filter-console/v1',status:'safe-view-ready',role:execution.role,source:execution.source,outputFiles:result.outputFiles,outputBytes:result.outputBytes,omittedFiles:result.representation.omittedFiles,rawCompleteArchiveUploaded:false,productAcceptance:false}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{cli();}catch(error){const code=typeof error.code==='string'&&/^[A-Z0-9_]{1,64}$/.test(error.code)?error.code:'FILTER_REFUSED';console.error(JSON.stringify({schema:'rea-safe-evidence-filter-console/v1',status:'failed',code,artifactPathProduced:false,productAcceptance:false}));process.exitCode=1;}
}
