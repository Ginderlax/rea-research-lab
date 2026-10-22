// Source-only candidate. Publish only after independent review and root approval.
// Fixed diagnostics only: no product imports, product comparisons or test changes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const PARENT = 'ee9aeb0d641fd517df0754b33f0d55b15214e768';
const BRANCH = 'refs/heads/experiment/windows-native-process-probe-20261022-r5';
const SCRIPT_PATH = 'scripts/windows-native-process-probe-20261022.mjs';
const WORKFLOW_PATH = '.github/workflows/windows-native-process-probe.yml';
const METADATA_TIMEOUT = 15000, NET_TIMEOUT = 20000, EXTENDED_READY_TIMEOUT = 45000;
const METADATA_BUFFER = 64 * 1024 * 1024, NET_BUFFER = 1024 * 1024, RESULT_CAP = 128 * 1024;
const METADATA_SCRIPT = "\n$ErrorActionPreference = 'Stop'\n$ProgressPreference = 'SilentlyContinue'\n[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)\n[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)\n$culture = [Globalization.CultureInfo]::InvariantCulture\nfunction Stamp($date) {\n  $utc = $date.ToUniversalTime()\n  $milliseconds = ([decimal]$utc.Ticks - [decimal]621355968000000000) / [decimal]10000\n  return @{ utc = $utc.ToString(\"yyyy-MM-dd'T'HH:mm:ss.fffffff'Z'\", $culture); ms = $milliseconds.ToString('0.0000', $culture) }\n}\ntry {\n  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json -ErrorAction Stop\n  if ($request.version -ne 1 -or $null -eq $request.sources -or @($request.sources).Count -gt 10000) { throw 'request' }\n  $root = [IO.Path]::GetFullPath([string]$request.root)\n  $volume = [IO.Path]::GetPathRoot($root)\n  while ($root.Length -gt $volume.Length -and $root.EndsWith([IO.Path]::DirectorySeparatorChar)) { $root = $root.Substring(0, $root.Length - 1) }\n  if (([IO.File]::GetAttributes($root) -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'link' }\n  $prefix = $root\n  if (-not $prefix.EndsWith([IO.Path]::DirectorySeparatorChar)) { $prefix += [IO.Path]::DirectorySeparatorChar }\n  $rows = New-Object 'System.Collections.Generic.List[object]'\n  $index = 0\n  foreach ($source in @($request.sources)) {\n    $full = [IO.Path]::GetFullPath([string]$source.path)\n    if (-not $full.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'outside' }\n    # Check each current ancestor as well as the target. This supplements, rather\n    # than replaces, the application's original root-confined no-link walk.\n    $checked = $full\n    while ($true) {\n      if (([IO.File]::GetAttributes($checked) -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'link' }\n      if ([string]::Equals($checked, $root, [StringComparison]::OrdinalIgnoreCase)) { break }\n      $checked = [IO.Path]::GetDirectoryName($checked)\n      if ([string]::IsNullOrEmpty($checked)) { throw 'outside' }\n    }\n    $item = Get-Item -LiteralPath $full -Force -ErrorAction Stop\n    $item.Refresh()\n    if (-not $item.Exists -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'missing' }\n    $directory = $item -is [IO.DirectoryInfo]\n    if (-not $directory -and -not ($item -is [IO.FileInfo])) { throw 'type' }\n    if ($directory -ne [bool]$source.directory) { throw 'type' }\n    $modified = Stamp $item.LastWriteTimeUtc\n    $accessed = Stamp $item.LastAccessTimeUtc\n    $created = Stamp $item.CreationTimeUtc\n    # Both GetFullPath and FullName can expand a valid DOS short-path alias.\n    # Echo the submitted transport identity only after all native path checks.\n    $rows.Add(@{ index = $index; path = [string]$source.path; normalizedPath = $full; directory = $directory;\n      modifiedAtUtc = $modified.utc; modifiedAtMs = $modified.ms;\n      accessedAtUtc = $accessed.utc; accessedAtMs = $accessed.ms;\n      createdAtUtc = $created.utc; createdAtMs = $created.ms })\n    $index += 1\n  }\n  $response = @{ version = 1; items = @($rows.ToArray()) } | ConvertTo-Json -Compress -Depth 5\n  [Console]::Out.Write($response)\n} catch {\n  [Console]::Error.WriteLine('Native Windows source metadata failed.')\n  exit 1\n}\n";
const NET_SCRIPT = "$ErrorActionPreference='Stop'\nAdd-Type -AssemblyName System.IO.Compression\nAdd-Type -AssemblyName System.IO.Compression.FileSystem\n$archivePath=Join-Path $env:REA_ZIP_TEST_DIR 'workspace/dotnet.zip'\n$localDate=[DateTime]::new(2012,3,4,0,6,8,[DateTimeKind]::Unspecified)\n$entryDate=[DateTimeOffset]::new($localDate,[TimeZoneInfo]::Local.GetUtcOffset($localDate))\n$stream=[System.IO.File]::Open($archivePath,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::ReadWrite)\n$archive=[System.IO.Compression.ZipArchive]::new($stream,[System.IO.Compression.ZipArchiveMode]::Create)\ntry{$entry=$archive.CreateEntry('a.txt');$entry.LastWriteTime=$entryDate;$writer=[System.IO.StreamWriter]::new($entry.Open());try{$writer.Write('dates')}finally{$writer.Dispose()}}finally{$archive.Dispose()}\n$destination=Join-Path $env:REA_ZIP_TEST_DIR 'dotnet-restored'\n[System.IO.Compression.ZipFile]::ExtractToDirectory($archivePath,$destination)\n@{expected=$entryDate.UtcDateTime.ToString('o');restored=(Get-Item -LiteralPath (Join-Path $destination 'a.txt')).LastWriteTimeUtc.ToString('o')}|ConvertTo-Json -Compress";
const READY_SCRIPT = "[Console]::Out.Write('REA_NATIVE_PROBE_READY')";
const COLLECTOR_KEYS = new Set(['PATH','PATHEXT','SYSTEMROOT','COMSPEC','TEMP','TMP','USERPROFILE','HOMEDRIVE','HOMEPATH','LOCALAPPDATA','APPDATA','CI','GITHUB_ACTIONS','RUNNER_ENVIRONMENT','RUNNER_OS','RUNNER_ARCH','RUNNER_TEMP','GITHUB_SHA','GITHUB_REF','GITHUB_EVENT_NAME','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_REPOSITORY','GITHUB_JOB','GITHUB_SERVER_URL','GITHUB_WORKFLOW']);
const SYSTEM_KEYS = ['PROGRAMFILES','PROGRAMFILES(X86)','PROGRAMW6432','SYSTEMDRIVE','WINDIR'];
const PROFILES = ['inherited-baseline','collector-allowlist','collector-plus-system-context','collector-plus-system-context-and-psmodulepath'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const utf8 = text => Buffer.from(text, 'utf8');
const commandPin = text => ({utf8Bytes:utf8(text).length,utf8SHA256:sha(utf8(text)),utf16LEBytes:Buffer.byteLength(text,'utf16le'),utf16LESHA256:sha(Buffer.from(text,'utf16le'))});
const exactKeys = (value, names) => value && typeof value === 'object' && !Array.isArray(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...names].sort());
let outputFile = null, outputRoot = null;

function environmentProfile(name) {
  const inherited = {...process.env};
  if (name === 'inherited-baseline') return inherited;
  const keys = new Set(COLLECTOR_KEYS);
  if (name !== 'collector-allowlist') for (const key of SYSTEM_KEYS) keys.add(key);
  if (name === 'collector-plus-system-context-and-psmodulepath') keys.add('PSMODULEPATH');
  return Object.fromEntries(Object.entries(inherited).filter(([key]) => keys.has(key.toUpperCase())));
}
function flagsForEnvironment(env) {
  const present = new Set(Object.keys(env).map(key => key.toUpperCase()));
  return Object.fromEntries([...SYSTEM_KEYS,'PSMODULEPATH'].map(key => [key,present.has(key)]));
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
async function encodedCommand({id,profile,env,script,input='',closeStdin=true,timeoutMs=METADATA_TIMEOUT,maxBuffer=METADATA_BUFFER}) {
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
      const record = observation({id,profile,form:'execFile-absolute-encoded',timeoutMs,started,error,status:error?(Number.isInteger(error.code)?error.code:null):0,signal:error?.signal,stdout,stderr,deadlineObserved,killed:error?.killed,stdinClosed:closeStdin});
      record.stdinPolicy=closeStdin?'execFile-stdin-ended-utf8':'execFile-stdin-held-open-until-completion';
      resolve({record,stdout:typeof stdout==='string'?stdout:''});
    });
    child.stdin.on('error',() => {});
    if (closeStdin) child.stdin.end(input,'utf8');
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
  const temporary=fs.realpathSync(process.env.RUNNER_TEMP);
  assert(!fs.lstatSync(temporary).isSymbolicLink());
  outputRoot=path.join(temporary,'rea-windows-native-probe-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT);
  fs.mkdirSync(outputRoot);assert(!fs.lstatSync(outputRoot).isSymbolicLink());
  outputFile=path.join(outputRoot,'probe.json');
  const report={schema:'rea-windows-native-process-probe/v1',status:'diagnostic-running',source:process.env.GITHUB_SHA,parent:PARENT,branch:BRANCH,runID:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,hostedWindows2022X64Node2416GuardVerified:true,onlyTwoProspectiveSourcePathsChanged:true,commands:{metadata:commandPin(METADATA_SCRIPT),originalNET:commandPin(NET_SCRIPT),ready:commandPin(READY_SCRIPT)},environmentProfiles:[],cases:[],nativeMetadataTimeoutMs:METADATA_TIMEOUT,originalNETTimeoutMs:NET_TIMEOUT,conditionalReadyDiagnosticTimeoutMs:EXTENDED_READY_TIMEOUT,maximumCases:11,resultCapBytes:RESULT_CAP,roleSpecificProductBootstrapEnvironmentReplayed:false,baselineEnvironmentUsedOnlyByFixedDiagnosticCode:true,syntheticNativeNETArchivesNeverUploaded:true,existingOrMappedArchivesAccessed:0,productImportsOrExecution:0,testsOrProductThresholdsChanged:false,productAcceptance:false,runtimeAcceptance:false,semanticAcceptance:false,fullParity:false,allTenComplete:false,provenRootCause:false};
  for (const profile of PROFILES) {
    const env=environmentProfile(profile);
    report.environmentProfiles.push({profile,systemKeyPresenceOnly:flagsForEnvironment(env),environmentValuesPublished:false});
    const root=ownedFixture('metadata-'+profile),request={version:1,root,sources:[{index:0,path:path.join(root,'owned.txt'),directory:false},{index:1,path:path.join(root,'nested'),directory:true}]};
    const native=await encodedCommand({id:'metadata-'+profile,profile,env,script:METADATA_SCRIPT,input:JSON.stringify(request)});
    native.record.exactExpectedMetadataResponse=native.record.nativeExitCode===0 && validMetadata(native.stdout,request);
    native.record.requestUTF8Bytes=Buffer.byteLength(JSON.stringify(request),'utf8');
    native.record.expectedRows=2;
    report.cases.push(native.record);
  }
  for (const profile of PROFILES) report.cases.push(originalNET({id:'net-'+profile,profile,env:environmentProfile(profile),fixtureRoot:ownedFixture('net-'+profile)}));
  const env=environmentProfile('collector-allowlist');
  const closed=await encodedCommand({id:'ready-stdin-closed',profile:'collector-allowlist',env,script:READY_SCRIPT,maxBuffer:16*1024});
  closed.record.exactReadyResponse=closed.record.nativeExitCode===0 && closed.stdout==='REA_NATIVE_PROBE_READY';
  report.cases.push(closed.record);
  const open=await encodedCommand({id:'ready-stdin-held-open',profile:'collector-allowlist',env,script:READY_SCRIPT,input:'',closeStdin:false,maxBuffer:16*1024});
  open.record.exactReadyResponse=open.record.nativeExitCode===0 && open.stdout==='REA_NATIVE_PROBE_READY';
  report.cases.push(open.record);
  if (!closed.record.exactReadyResponse) {
    const extended=await encodedCommand({id:'ready-stdin-closed-extended-diagnostic-only',profile:'collector-allowlist',env,script:READY_SCRIPT,timeoutMs:EXTENDED_READY_TIMEOUT,maxBuffer:16*1024});
    extended.record.exactReadyResponse=extended.record.nativeExitCode===0 && extended.stdout==='REA_NATIVE_PROBE_READY';
    extended.record.diagnosticOnlyExtendedDeadline=true;
    report.cases.push(extended.record);
  }
  assert(report.cases.length===10 || report.cases.length===11);
  assert.equal(new Set(report.cases.map(row=>row.id)).size,report.cases.length);
  report.nativeNegativeCases=report.cases.filter(row=>!(row.exactExpectedMetadataResponse===true || row.nativeOnlyNETRoundTripAgreement===true || row.exactReadyResponse===true)).length;
  report.status=report.nativeNegativeCases ? 'diagnostic-completed-with-native-negatives' : 'diagnostic-completed-no-native-negative-observed';
  report.casesRetained=report.cases.length;
  report.coldStartAndOrderConfoundingExcluded=false;
  report.followup='Interpret only these fixed native probes. Repeat a counterbalanced hosted comparison before attributing causation or changing product launch context; all original deadlines and checks remain unchanged.';
  publish(report);
}
main().catch(() => {
  // Fixed classification only: exception text, child output and env values stay private.
  const report={schema:'rea-windows-native-process-probe-guard-failure/v1',status:'guard-or-diagnostic-orchestration-failed',rawErrorPublished:false,rawStdoutPublished:false,rawStderrPublished:false,environmentValuesPublished:false,productAcceptance:false,runtimeAcceptance:false,semanticAcceptance:false,fullParity:false,allTenComplete:false};
  try { if(outputFile && !fs.existsSync(outputFile)) publish(report); else console.log(JSON.stringify(report)); } catch { console.log(JSON.stringify(report)); }
  process.exitCode=1;
});
