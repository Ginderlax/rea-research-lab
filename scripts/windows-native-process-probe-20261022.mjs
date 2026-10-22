// Source-only candidate. Publish only after independent review and root approval.
// Fixed diagnostics only: no product imports, product comparisons or test changes.
// R6 v2 is a new predeclared12-case module-path experiment, not a replay of R5.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const PARENT = '19cb2f7e24780f40436a5015d3fa66ff2b735fa2';
const BRANCH = 'refs/heads/experiment/windows-native-process-probe-20261022-r6';
const SCRIPT_PATH = 'scripts/windows-native-process-probe-20261022.mjs';
const WORKFLOW_PATH = '.github/workflows/windows-native-process-probe.yml';
const METADATA_TIMEOUT = 15000, NET_TIMEOUT = 20000;
const METADATA_BUFFER = 64 * 1024 * 1024, NET_BUFFER = 1024 * 1024, RESULT_CAP = 128 * 1024;
const METADATA_SCRIPT = "\n$ErrorActionPreference = 'Stop'\n$ProgressPreference = 'SilentlyContinue'\n[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)\n[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)\n$culture = [Globalization.CultureInfo]::InvariantCulture\nfunction Stamp($date) {\n  $utc = $date.ToUniversalTime()\n  $milliseconds = ([decimal]$utc.Ticks - [decimal]621355968000000000) / [decimal]10000\n  return @{ utc = $utc.ToString(\"yyyy-MM-dd'T'HH:mm:ss.fffffff'Z'\", $culture); ms = $milliseconds.ToString('0.0000', $culture) }\n}\ntry {\n  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json -ErrorAction Stop\n  if ($request.version -ne 1 -or $null -eq $request.sources -or @($request.sources).Count -gt 10000) { throw 'request' }\n  $root = [IO.Path]::GetFullPath([string]$request.root)\n  $volume = [IO.Path]::GetPathRoot($root)\n  while ($root.Length -gt $volume.Length -and $root.EndsWith([IO.Path]::DirectorySeparatorChar)) { $root = $root.Substring(0, $root.Length - 1) }\n  if (([IO.File]::GetAttributes($root) -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'link' }\n  $prefix = $root\n  if (-not $prefix.EndsWith([IO.Path]::DirectorySeparatorChar)) { $prefix += [IO.Path]::DirectorySeparatorChar }\n  $rows = New-Object 'System.Collections.Generic.List[object]'\n  $index = 0\n  foreach ($source in @($request.sources)) {\n    $full = [IO.Path]::GetFullPath([string]$source.path)\n    if (-not $full.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'outside' }\n    # Check each current ancestor as well as the target. This supplements, rather\n    # than replaces, the application's original root-confined no-link walk.\n    $checked = $full\n    while ($true) {\n      if (([IO.File]::GetAttributes($checked) -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'link' }\n      if ([string]::Equals($checked, $root, [StringComparison]::OrdinalIgnoreCase)) { break }\n      $checked = [IO.Path]::GetDirectoryName($checked)\n      if ([string]::IsNullOrEmpty($checked)) { throw 'outside' }\n    }\n    $item = Get-Item -LiteralPath $full -Force -ErrorAction Stop\n    $item.Refresh()\n    if (-not $item.Exists -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'missing' }\n    $directory = $item -is [IO.DirectoryInfo]\n    if (-not $directory -and -not ($item -is [IO.FileInfo])) { throw 'type' }\n    if ($directory -ne [bool]$source.directory) { throw 'type' }\n    $modified = Stamp $item.LastWriteTimeUtc\n    $accessed = Stamp $item.LastAccessTimeUtc\n    $created = Stamp $item.CreationTimeUtc\n    # Both GetFullPath and FullName can expand a valid DOS short-path alias.\n    # Echo the submitted transport identity only after all native path checks.\n    $rows.Add(@{ index = $index; path = [string]$source.path; normalizedPath = $full; directory = $directory;\n      modifiedAtUtc = $modified.utc; modifiedAtMs = $modified.ms;\n      accessedAtUtc = $accessed.utc; accessedAtMs = $accessed.ms;\n      createdAtUtc = $created.utc; createdAtMs = $created.ms })\n    $index += 1\n  }\n  $response = @{ version = 1; items = @($rows.ToArray()) } | ConvertTo-Json -Compress -Depth 5\n  [Console]::Out.Write($response)\n} catch {\n  [Console]::Error.WriteLine('Native Windows source metadata failed.')\n  exit 1\n}\n";
const NET_SCRIPT = "$ErrorActionPreference='Stop'\nAdd-Type -AssemblyName System.IO.Compression\nAdd-Type -AssemblyName System.IO.Compression.FileSystem\n$archivePath=Join-Path $env:REA_ZIP_TEST_DIR 'workspace/dotnet.zip'\n$localDate=[DateTime]::new(2012,3,4,0,6,8,[DateTimeKind]::Unspecified)\n$entryDate=[DateTimeOffset]::new($localDate,[TimeZoneInfo]::Local.GetUtcOffset($localDate))\n$stream=[System.IO.File]::Open($archivePath,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::ReadWrite)\n$archive=[System.IO.Compression.ZipArchive]::new($stream,[System.IO.Compression.ZipArchiveMode]::Create)\ntry{$entry=$archive.CreateEntry('a.txt');$entry.LastWriteTime=$entryDate;$writer=[System.IO.StreamWriter]::new($entry.Open());try{$writer.Write('dates')}finally{$writer.Dispose()}}finally{$archive.Dispose()}\n$destination=Join-Path $env:REA_ZIP_TEST_DIR 'dotnet-restored'\n[System.IO.Compression.ZipFile]::ExtractToDirectory($archivePath,$destination)\n@{expected=$entryDate.UtcDateTime.ToString('o');restored=(Get-Item -LiteralPath (Join-Path $destination 'a.txt')).LastWriteTimeUtc.ToString('o')}|ConvertTo-Json -Compress";
const COLLECTOR_KEYS = new Set(['PATH','PATHEXT','SYSTEMROOT','COMSPEC','TEMP','TMP','USERPROFILE','HOMEDRIVE','HOMEPATH','LOCALAPPDATA','APPDATA','CI','GITHUB_ACTIONS','RUNNER_ENVIRONMENT','RUNNER_OS','RUNNER_ARCH','RUNNER_TEMP','GITHUB_SHA','GITHUB_REF','GITHUB_EVENT_NAME','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_REPOSITORY','GITHUB_JOB','GITHUB_SERVER_URL','GITHUB_WORKFLOW']);
const PROFILES = ["collector-allowlist","collector-plus-inherited-psmodulepath-only","collector-plus-trusted-winps-system-module-path-only"];
const CASE_PLAN = [
  {
    "order": 1,
    "id": "metadata-forward-collector",
    "command": "metadata",
    "pass": "forward",
    "profile": "collector-allowlist"
  },
  {
    "order": 2,
    "id": "metadata-forward-inherited-modulepath",
    "command": "metadata",
    "pass": "forward",
    "profile": "collector-plus-inherited-psmodulepath-only"
  },
  {
    "order": 3,
    "id": "metadata-forward-trusted-winps-modulepath",
    "command": "metadata",
    "pass": "forward",
    "profile": "collector-plus-trusted-winps-system-module-path-only"
  },
  {
    "order": 4,
    "id": "metadata-reverse-trusted-winps-modulepath",
    "command": "metadata",
    "pass": "reverse",
    "profile": "collector-plus-trusted-winps-system-module-path-only"
  },
  {
    "order": 5,
    "id": "metadata-reverse-inherited-modulepath",
    "command": "metadata",
    "pass": "reverse",
    "profile": "collector-plus-inherited-psmodulepath-only"
  },
  {
    "order": 6,
    "id": "metadata-reverse-collector",
    "command": "metadata",
    "pass": "reverse",
    "profile": "collector-allowlist"
  },
  {
    "order": 7,
    "id": "net-forward-collector",
    "command": "original-net",
    "pass": "forward",
    "profile": "collector-allowlist"
  },
  {
    "order": 8,
    "id": "net-forward-inherited-modulepath",
    "command": "original-net",
    "pass": "forward",
    "profile": "collector-plus-inherited-psmodulepath-only"
  },
  {
    "order": 9,
    "id": "net-forward-trusted-winps-modulepath",
    "command": "original-net",
    "pass": "forward",
    "profile": "collector-plus-trusted-winps-system-module-path-only"
  },
  {
    "order": 10,
    "id": "net-reverse-trusted-winps-modulepath",
    "command": "original-net",
    "pass": "reverse",
    "profile": "collector-plus-trusted-winps-system-module-path-only"
  },
  {
    "order": 11,
    "id": "net-reverse-inherited-modulepath",
    "command": "original-net",
    "pass": "reverse",
    "profile": "collector-plus-inherited-psmodulepath-only"
  },
  {
    "order": 12,
    "id": "net-reverse-collector",
    "command": "original-net",
    "pass": "reverse",
    "profile": "collector-allowlist"
  }
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const utf8 = text => Buffer.from(text, 'utf8');
const commandPin = text => ({utf8Bytes:utf8(text).length,utf8SHA256:sha(utf8(text)),utf16LEBytes:Buffer.byteLength(text,'utf16le'),utf16LESHA256:sha(Buffer.from(text,'utf16le'))});
const exactKeys = (value, names) => value && typeof value === 'object' && !Array.isArray(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...names].sort());
let outputFile = null, outputRoot = null;

let trustedWindowsPowerShellModules = null;
function trustedSystemModulesDirectory() {
  const systemRoot=process.env.SystemRoot ?? process.env.SYSTEMROOT ?? 'C:\\Windows';
  assert(typeof systemRoot==='string' && /^[A-Za-z]:[\\/]/.test(systemRoot) && !systemRoot.includes('\0'));
  const directory=path.win32.join(systemRoot,'System32','WindowsPowerShell','v1.0','Modules');
  let at=path.parse(directory).root;
  for(const component of directory.slice(at.length).split(path.sep).filter(Boolean)) {
    at=path.join(at,component);
    const stat=fs.lstatSync(at);
    assert(stat.isDirectory() && !stat.isSymbolicLink());
  }
  assert.equal(fs.realpathSync(directory).toLowerCase(),directory.toLowerCase());
  return directory;
}
function environmentProfile(name) {
  assert(PROFILES.includes(name));
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>COLLECTOR_KEYS.has(key.toUpperCase())));
  assert(!Object.keys(env).some(key=>key.toUpperCase()==='PSMODULEPATH'));
  if(name==='collector-plus-inherited-psmodulepath-only') {
    const matches=Object.entries(process.env).filter(([key])=>key.toUpperCase()==='PSMODULEPATH');
    assert.equal(matches.length,1);
    const [key,value]=matches[0];
    assert(typeof value==='string' && value.length>0 && value.length<=32767 && !value.includes('\0'));
    env[key]=value;
  } else if(name==='collector-plus-trusted-winps-system-module-path-only') {
    assert(typeof trustedWindowsPowerShellModules==='string');
    env.PSModulePath=trustedWindowsPowerShellModules;
  }
  return env;
}
function flagsForEnvironment(env) {
  return {PSMODULEPATH:Object.keys(env).some(key=>key.toUpperCase()==='PSMODULEPATH')};
}
function nativeErrorCode(error) {
  if (!error) return null;
  if (typeof error.code === 'number' && Number.isInteger(error.code)) return 'NUMERIC_EXIT';
  return ['ETIMEDOUT','ENOENT','EACCES','EINVAL','EPERM','ERR_CHILD_PROCESS_STDIO_MAXBUFFER'].includes(error.code) ? error.code : 'OTHER_PROCESS_ERROR';
}
function safeSignal(signal) {
  return signal === null || signal === undefined ? null : ['SIGTERM','SIGKILL','SIGINT','SIGBREAK'].includes(signal) ? signal : 'OTHER_SIGNAL';
}
function observation({id,profile,form,timeoutMs,started,error,status,signal,stdout,stderr,deadlineObserved,killed,stdinClosed}) {
  const out = utf8(typeof stdout === 'string' ? stdout : ''), err = utf8(typeof stderr === 'string' ? stderr : '');
  const code = nativeErrorCode(error);
  let category = error ? 'NATIVE_PROCESS_ERROR' : status === 0 ? 'NATIVE_EXIT_ZERO' : 'NATIVE_NONZERO';
  if (code === 'ETIMEDOUT') category = 'NATIVE_TIMEOUT_REPORTED';
  else if (code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') category = 'OUTPUT_LIMIT';
  else if (['ENOENT','EACCES','EINVAL','EPERM'].includes(code)) category = 'LAUNCH_ERROR';
  else if (error && deadlineObserved && killed) category = 'DEADLINE_OBSERVED_PROCESS_FAILURE';
  return {id,profile,form,timeoutMs,elapsedMs:Math.round(performance.now()-started),nativeExitCode:Number.isInteger(status)?status:null,nativeErrorCode:code,signal:safeSignal(signal),processKilled:killed===true,deadlineObserved:deadlineObserved===true,stdinExplicitlyClosed:stdinClosed,category,stdoutDecodedUTF8Bytes:out.length,stdoutDecodedUTF8SHA256:sha(out),stderrDecodedUTF8Bytes:err.length,stderrDecodedUTF8SHA256:sha(err),rawStdoutPublished:false,rawStderrPublished:false,environmentValuesPublished:false};
}
async function encodedCommand({id,profile,env,script,input='',timeoutMs=METADATA_TIMEOUT,maxBuffer=METADATA_BUFFER}) {
  const systemRoot = env.SystemRoot ?? env.SYSTEMROOT ?? 'C:\\Windows';
  assert(path.win32.isAbsolute(systemRoot) && !systemRoot.includes('\0'));
  const executable = path.win32.join(systemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe');
  const args = ['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')];
  const started = performance.now();
  let deadlineObserved = false;
  const watcher = setTimeout(() => { deadlineObserved = true; },timeoutMs);
  return await new Promise(resolve => {
    const child = execFile(executable,args,{env,encoding:'utf8',timeout:timeoutMs,maxBuffer,windowsHide:true,shell:false},(error,stdout,stderr) => {
      clearTimeout(watcher);
      child.stdin.destroy();
      const record = observation({id,profile,form:'execFile-absolute-encoded',timeoutMs,started,error,status:error?(Number.isInteger(error.code)?error.code:null):0,signal:error?.signal,stdout,stderr,deadlineObserved,killed:error?.killed,stdinClosed:true});
      record.stdinPolicy='execFile-stdin-ended-utf8';
      resolve({record,stdout:typeof stdout==='string'?stdout:''});
    });
    child.stdin.on('error',() => {});
    child.stdin.end(input,'utf8');
  });
}
function originalNET({id,profile,env,fixtureRoot}) {
  const started = performance.now();
  const result = spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',NET_SCRIPT],{env:{...env,REA_ZIP_TEST_DIR:fixtureRoot},encoding:'utf8',windowsHide:true,timeout:NET_TIMEOUT,maxBuffer:NET_BUFFER,shell:false});
  const record = observation({id,profile,form:'spawnSync-by-name-command',timeoutMs:NET_TIMEOUT,started,error:result.error,status:result.status,signal:result.signal,stdout:result.stdout,stderr:result.stderr,deadlineObserved:result.error?.code==='ETIMEDOUT',killed:result.error?.code==='ETIMEDOUT',stdinClosed:null});
  record.stdinPolicy='spawnSync-default-no-input';
  let agreement = false;
  try {
    const value = JSON.parse(result.stdout);
    agreement = exactKeys(value,['expected','restored']) && typeof value.expected==='string' && typeof value.restored==='string' && Number.isFinite(Date.parse(value.expected)) && new Date(value.expected).toISOString()===new Date(value.restored).toISOString();
  } catch {}
  record.nativeOnlyNETRoundTripAgreement = result.status===0 && !result.error && agreement;
  record.productComparisonPerformed = false;
  return record;
}
function validDate(utc,milliseconds) {
  if (typeof utc!=='string' || !/^(?!0000)\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z$/.test(utc) || typeof milliseconds!=='string' || !/^-?\d{1,15}\.\d{4}$/.test(milliseconds)) return false;
  const value=Date.parse(utc),normalized=new Date(value);
  if (!Number.isSafeInteger(value) || normalized.toISOString()!==utc.slice(0,23)+'Z') return false;
  const negative=milliseconds.startsWith('-'),[whole,fraction]=milliseconds.replace(/^-/,'').split('.');
  return (BigInt(whole)*10000n+BigInt(fraction))*(negative?-1n:1n)===BigInt(value)*10000n+BigInt(utc.slice(23,27));
}
function validMetadata(stdout,request) {
  try {
    const value=JSON.parse(stdout);
    if (!exactKeys(value,['version','items']) || value.version!==1 || !Array.isArray(value.items) || value.items.length!==request.sources.length) return false;
    return value.items.every((row,index) => exactKeys(row,['index','path','normalizedPath','directory','modifiedAtUtc','modifiedAtMs','accessedAtUtc','accessedAtMs','createdAtUtc','createdAtMs']) && row.index===index && row.path===request.sources[index].path && row.directory===request.sources[index].directory && typeof row.normalizedPath==='string' && path.win32.normalize(row.normalizedPath).toLowerCase()===path.win32.normalize(row.path).toLowerCase() && ['modifiedAt','accessedAt','createdAt'].every(key=>validDate(row[key+'Utc'],row[key+'Ms'])));
  } catch { return false; }
}
function ownedFixture(name) {
  assert(/^[a-z0-9-]+$/.test(name));
  const root = path.join(outputRoot,'fixtures',name);
  fs.mkdirSync(path.join(root,'workspace'),{recursive:true});
  fs.mkdirSync(path.join(root,'nested'));
  fs.writeFileSync(path.join(root,'owned.txt'),'Owned Windows native metadata diagnostic fixture.\n',{flag:'wx'});
  const canonical=fs.realpathSync(root);
  assert(path.relative(outputRoot,canonical).startsWith('fixtures'+path.sep) && !fs.lstatSync(canonical).isSymbolicLink());
  return canonical;
}
function publish(report) {
  const json=JSON.stringify(report,null,2)+'\n',bytes=utf8(json);
  assert(bytes.length<=RESULT_CAP);
  fs.writeFileSync(outputFile,bytes,{flag:'wx'});
  assert(fs.readFileSync(outputFile).equals(bytes));
  // Same closed metadata permits supported plaintext log backup without ZIP replay.
  console.log(JSON.stringify(report));
}
function readGit(args,repository) {
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!/^GIT_/i.test(key)));
  Object.assign(env,{GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'});
  const result=spawnSync('C:/Program Files/Git/cmd/git.exe',['--no-replace-objects','-c','core.fsmonitor=false','-c','core.hooksPath=NUL',...args],{cwd:repository,env,shell:false,windowsHide:true,encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
  assert(!result.error && result.status===0 && result.signal===null);
  return result.stdout.trim();
}
async function main() {
  assert.equal(process.argv.length,2);
  assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.version,'v24.16.0');
  for (const [key,value] of Object.entries({CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab',GITHUB_SERVER_URL:'https://github.com',GITHUB_REF:BRANCH,GITHUB_EVENT_NAME:'push',GITHUB_JOB:'native-windows-probe',REA_NATIVE_PROBE_SAFE_METADATA_ONLY:'true',ImageOS:'win22'})) assert.equal(process.env[key],value);
  assert(/^10\.0\.20348(?:\.|$)/.test(os.release()));
  for (const key of ['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT']) assert(/^[1-9][0-9]*$/.test(process.env[key]));
  assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA));
  const repository=fs.realpathSync(process.env.GITHUB_WORKSPACE);
  assert.equal(fs.realpathSync(fileURLToPath(import.meta.url)),path.join(repository,...SCRIPT_PATH.split('/')));
  assert.equal(readGit(['rev-parse','HEAD'],repository),process.env.GITHUB_SHA);
  assert.equal(readGit(['rev-list','--parents','-n','1','HEAD'],repository),process.env.GITHUB_SHA+' '+PARENT);
  assert.equal(readGit(['diff','--no-ext-diff','--no-textconv','--no-renames','--name-only',PARENT,'HEAD'],repository),[WORKFLOW_PATH,SCRIPT_PATH].join('\n'));
  assert.equal(readGit(['status','--porcelain=v1','--untracked-files=all'],repository),'');
  trustedWindowsPowerShellModules=trustedSystemModulesDirectory();
  const temporary=fs.realpathSync(process.env.RUNNER_TEMP);
  assert(!fs.lstatSync(temporary).isSymbolicLink());
  outputRoot=path.join(temporary,'rea-windows-native-probe-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT);
  fs.mkdirSync(outputRoot);assert(!fs.lstatSync(outputRoot).isSymbolicLink());
  outputFile=path.join(outputRoot,'probe.json');
  assert.equal(CASE_PLAN.length,12);
  assert.deepEqual(CASE_PLAN.map(row=>row.order),Array.from({length:12},(_,i)=>i+1));
  assert.equal(new Set(CASE_PLAN.map(row=>row.id)).size,12);
  for(const command of ['metadata','original-net']) {
    const rows=CASE_PLAN.filter(row=>row.command===command);
    assert.equal(rows.length,6);
    assert.deepEqual(rows.slice(0,3).map(row=>row.profile),PROFILES);
    assert.deepEqual(rows.slice(3).map(row=>row.profile),[...PROFILES].reverse());
    for(const profile of PROFILES) assert.equal(rows.filter(row=>row.profile===profile).length,2);
  }
  const report={schema:'rea-windows-native-process-probe/v2',status:'diagnostic-running',experiment:'R6-counterbalanced-single-modulepath-factor',source:process.env.GITHUB_SHA,parent:PARENT,branch:BRANCH,runID:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,hostedWindows2022X64Node2416GuardVerified:true,onlyTwoProspectiveSourcePathsChanged:true,commands:{metadata:commandPin(METADATA_SCRIPT),originalNET:commandPin(NET_SCRIPT)},environmentProfiles:PROFILES.map(profile=>({profile,systemKeyPresenceOnly:flagsForEnvironment(environmentProfile(profile)),environmentValuesPublished:false})),predeclaredCasePlan:CASE_PLAN,cases:[],requiredCases:12,metadataCases:6,originalNETCases:6,nativeMetadataTimeoutMs:METADATA_TIMEOUT,originalNETTimeoutMs:NET_TIMEOUT,nominalNativeTimeoutBudgetMs:210000,resultCapBytes:RESULT_CAP,trustedWinPSSystemModulesDirectoryVerified:true,trustedProfileUsesOnlySingleValidatedSystemModulePath:true,trustedProfileCopiesUserOrPS7ModulePaths:false,moduleDirectoriesCopied:0,inheritedModulePathComparisonOnly:true,allInheritedEnvironmentBaselineUsed:false,roleSpecificProductBootstrapEnvironmentReplayed:false,syntheticNativeNETArchivesNeverUploaded:true,existingOrMappedArchivesAccessed:0,productImportsOrExecution:0,testsOrProductThresholdsChanged:false,productAcceptance:false,runtimeAcceptance:false,semanticAcceptance:false,fullParity:false,allTenComplete:false,provenRootCause:false,environmentCausalityProven:false};
  for(const specification of CASE_PLAN) {
    const env=environmentProfile(specification.profile),root=ownedFixture('case-'+String(specification.order).padStart(2,'0'));
    let record;
    if(specification.command==='metadata') {
      const request={version:1,root,sources:[{index:0,path:path.join(root,'owned.txt'),directory:false},{index:1,path:path.join(root,'nested'),directory:true}]};
      const native=await encodedCommand({id:specification.id,profile:specification.profile,env,script:METADATA_SCRIPT,input:JSON.stringify(request)});
      record=native.record;
      record.exactExpectedMetadataResponse=record.nativeExitCode===0 && validMetadata(native.stdout,request);
      record.requestUTF8Bytes=Buffer.byteLength(JSON.stringify(request),'utf8');
      record.expectedRows=2;
    } else {
      assert.equal(specification.command,'original-net');
      record=originalNET({id:specification.id,profile:specification.profile,env,fixtureRoot:root});
    }
    record.predeclaredOrder=specification.order;
    record.mirrorPass=specification.pass;
    record.command=specification.command;
    report.cases.push(record);
  }
  assert.equal(report.cases.length,12);
  assert.deepEqual(report.cases.map(row=>row.id),CASE_PLAN.map(row=>row.id));
  assert.deepEqual(report.cases.map(row=>row.predeclaredOrder),CASE_PLAN.map(row=>row.order));
  report.nativeNegativeCases=report.cases.filter(row=>!(row.exactExpectedMetadataResponse===true || row.nativeOnlyNETRoundTripAgreement===true)).length;
  report.status=report.nativeNegativeCases ? 'diagnostic-completed-with-native-negatives' : 'diagnostic-completed-no-native-negative-observed';
  report.casesRetained=12;
  report.mirrorOrderingVerified=true;
  report.coldStartAndOrderConfoundingExcluded=false;
  report.followup='Compare both mirror passes per fixed command. A reproducible trusted WinPS system-only result may justify a separately reviewed finite launch-context fix; this diagnostic alone proves no product success or root cause. Preserve all original limits and all negative outcomes.';
  publish(report);
}
main().catch(() => {
  // Fixed classification only: exception text, child output and env values stay private.
  const report={schema:'rea-windows-native-process-probe-guard-failure/v2',status:'guard-or-diagnostic-orchestration-failed',rawErrorPublished:false,rawStdoutPublished:false,rawStderrPublished:false,environmentValuesPublished:false,productAcceptance:false,runtimeAcceptance:false,semanticAcceptance:false,fullParity:false,allTenComplete:false};
  try { if(outputFile && !fs.existsSync(outputFile)) publish(report); else console.log(JSON.stringify(report)); } catch { console.log(JSON.stringify(report)); }
  process.exitCode=1;
});
