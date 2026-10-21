# Hosted synthetic gate controls only. No product or original is executed.
param([Parameter(Mandatory)][ValidateSet('capture','finalize','admit')][string]$Phase)
$ErrorActionPreference='Stop'
$PSNativeCommandUseErrorActionPreference=$false
function Need([bool]$ok,[string]$code){if(-not $ok){throw $code}}
function SHA([byte[]]$b){return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($b)).ToLowerInvariant()}
function Plain([string]$p,[bool]$file){
 $at=Get-Item -LiteralPath $p;Need ((($at.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) -and ($at.PSIsContainer -eq (-not $file))) 'ORDINARY_CONTROL_PATH'
 $parent=if($file){$at.Directory}else{$at.Parent};while($parent){Need (($parent.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) 'CONTROL_ANCESTOR_LINK';$parent=$parent.Parent}
 return $at
}
function ReadBounded([string]$p,[int]$maximum=65536){
 $null=Plain $p $true;$s=[IO.File]::Open($p,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
 try{$length=$s.Length;Need ($length -le $maximum) 'CONTROL_READ_BOUND';$b=[byte[]]::new([int]$length+1);$offset=0;while($offset -lt $b.Length){$n=$s.Read($b,$offset,$b.Length-$offset);if($n -eq 0){break};$offset+=$n};Need ($offset -eq $length -and $s.Length -eq $length) 'CONTROL_READ_STABLE';$out=[byte[]]::new([int]$length);if($length){[Array]::Copy($b,$out,[int]$length)};return ,$out}finally{$s.Dispose()}
}
function JSON([string]$p){return [Text.UTF8Encoding]::new($false,$true).GetString((ReadBounded $p 2097152))|ConvertFrom-Json -AsHashtable -DateKind String -Depth 50}
function SaveJSON([string]$p,$v){$b=[Text.UTF8Encoding]::new($false).GetBytes(($v|ConvertTo-Json -Depth 15)+"`n");$s=[IO.File]::Open($p,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None);try{$s.Write($b,0,$b.Length)}finally{$s.Dispose()};Need ((SHA (ReadBounded $p 2097152)) -ceq (SHA $b)) 'CONTROL_WRITE_READBACK'}
function CopyExact([string]$source,[string]$destination){$b=ReadBounded $source 2097152;$s=[IO.File]::Open($destination,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None);try{$s.Write($b,0,$b.Length)}finally{$s.Dispose()};Need ((SHA (ReadBounded $destination 2097152)) -ceq (SHA $b)) 'COPY_READBACK'}
function ChannelIdentities(){
 $rows=@();foreach($name in @('GITHUB_OUTPUT','GITHUB_ENV','GITHUB_PATH','GITHUB_STEP_SUMMARY','GITHUB_STATE')){$p=[Environment]::GetEnvironmentVariable($name);$exists=$p -and [IO.File]::Exists($p);$rows+=[ordered]@{name=$name;exists=[bool]$exists;bytes=$(if($exists){(ReadBounded $p 1048576).Length}else{0});sha256=$(if($exists){SHA (ReadBounded $p 1048576)}else{$null})}};return $rows
}
function Reviewed([string]$relative,[string]$expected){Need ($expected -cmatch '^[0-9a-f]{64}$') 'REVIEWED_CONTROL_HASH';$p=Join-Path $env:GITHUB_WORKSPACE $relative;Need ((SHA (ReadBounded $p 262144)) -ceq $expected) 'REVIEWED_CONTROL_CHANGED';return $p}
try{
 foreach($pair in @(@('CI','true'),@('GITHUB_ACTIONS','true'),@('RUNNER_ENVIRONMENT','github-hosted'),@('RUNNER_OS','Windows'),@('RUNNER_ARCH','X64'),@('GITHUB_REPOSITORY','Ginderlax/rea-research-lab'),@('GITHUB_JOB','validate'),@('REA_ARCHIVE_ZIP_ROLE','finite'),@('REA_ARCHIVE_ZIP_PARENT','6aeb166588d834c9635940e542b2de4e98b1eaf2'),@('REA_SAFE_FEATURE_BRANCH','experiment/evidence-filter-validation-20261021'))){Need ([Environment]::GetEnvironmentVariable($pair[0]) -ceq $pair[1]) 'CONTROL_HOSTED_ENVIRONMENT'}
 Need ($env:GITHUB_SHA -cmatch '^[0-9a-f]{40}$' -and $env:GITHUB_WORKFLOW_SHA -ceq $env:GITHUB_SHA -and $env:GITHUB_REF -ceq 'refs/heads/experiment/evidence-filter-validation-20261021') 'CONTROL_SOURCE_REF'
 Need ($env:GITHUB_RUN_ID -cmatch '^[1-9][0-9]*$' -and $env:GITHUB_RUN_ATTEMPT -cmatch '^[1-9][0-9]*$' -and $env:REA_SAFE_CONTROL_MODE -cin @('filter','sentinel')) 'CONTROL_SUBJECT'
 if($env:REA_SAFE_CONTROL_MODE -ceq 'filter'){Need ([string]::IsNullOrEmpty($env:REA_SAFE_CONTROL_SENTINEL)) 'FILTER_MODE_NOT_SENTINEL';[Environment]::SetEnvironmentVariable('REA_SAFE_CONTROL_SENTINEL',$null,[EnvironmentVariableTarget]::Process)}else{Need ($env:REA_SAFE_CONTROL_SENTINEL -ceq 'expected-failure') 'EXACT_SENTINEL_MODE'}
 $temporary=[IO.Path]::GetFullPath($env:RUNNER_TEMP);$null=Plain $temporary $false;$suffix=$env:GITHUB_RUN_ID+'-'+$env:GITHUB_RUN_ATTEMPT
 $evidence=Join-Path $temporary ('rea-filter-validation-console-'+$suffix);$admission=Join-Path $temporary ('rea-filter-validation-admission-'+$suffix);$top=Join-Path $temporary ('rea-filter-validation-top-'+$suffix)
 $public=if($env:REA_SAFE_CONTROL_MODE -ceq 'filter'){$evidence}else{Join-Path $temporary ('rea-filter-validation-public-sentinel-'+$suffix)}
 foreach($p in @($evidence,$admission,$top,$public)){Need ([IO.Path]::GetDirectoryName($p) -ceq $temporary) 'FIXED_CONTROL_ROOT'}
 $capture=Reviewed 'products/rea-studio/scripts/capture-safe-cloud-console.mjs' $env:REA_SAFE_CAPTURE_SHA256
 $validator=Reviewed 'products/rea-studio/scripts/validate-safe-cloud-evidence.mjs' $env:REA_SAFE_VALIDATOR_SHA256
 if($Phase -ceq 'capture'){
  Need (-not (Test-Path -LiteralPath $top) -and -not (Test-Path -LiteralPath $evidence)) 'NO_EARLIER_CONTROL'
  $null=New-Item -ItemType Directory -Path $top;$null=Plain $top $false;$before=ChannelIdentities
  $stdout=Join-Path $top 'capture.stdout.txt';$stderr=Join-Path $top 'capture.stderr.txt'
  & node $capture --phase filter-validation --evidence $evidence 1>$stdout 2>$stderr
  $exitCode=$LASTEXITCODE;$after=ChannelIdentities
  Need (($before|ConvertTo-Json -Depth 5 -Compress) -ceq ($after|ConvertTo-Json -Depth 5 -Compress)) 'FILE_COMMAND_CHANNEL_CHANGED'
  $topOut=ReadBounded $stdout;$topErr=ReadBounded $stderr
  Need ($topErr.Length -eq 0) 'UNEXPECTED_TOP_STDERR'
  $topRecord=[Text.UTF8Encoding]::new($false,$true).GetString($topOut).Trim()|ConvertFrom-Json -AsHashtable -DateKind String
  $topKeys=@('schema','phase','role','source','status','stdoutBytes','stderrBytes','droppedBytes','exitCode','closeObserved','failureCode','rawChildOutputEchoed')
  Need ($topRecord -is [Collections.IDictionary] -and $topRecord.Count -eq $topKeys.Count -and @($topRecord.Keys|Where-Object {$_ -cnotin $topKeys}).Count -eq 0 -and $topRecord.schema -ceq 'rea-safe-capture-console/v1' -and $topRecord.phase -ceq 'filter-validation' -and $topRecord.role -ceq 'finite' -and $topRecord.source -ceq $env:GITHUB_SHA -and $topRecord.rawChildOutputEchoed -eq $false) 'TOP_CONSOLE_SCHEMA'
  $record=JSON (Join-Path $evidence 'console-filter-validation.json')
  Need ($record.schema -ceq 'rea-owned-top-level-console-capture/v1' -and $record.phase -ceq 'filter-validation' -and $record.source -ceq $env:GITHUB_SHA -and $record.parent -ceq $env:REA_ARCHIVE_ZIP_PARENT -and $record.runID -ceq $env:GITHUB_RUN_ID -and $record.attempt -ceq $env:GITHUB_RUN_ATTEMPT -and $record.rawChildOutputEchoed -eq $false -and $record.closeObserved -eq $true -and $null -eq $record.signal -and $record.droppedBytes -eq 0 -and $null -eq $record.failureCode) 'ACTUAL_CAPTURE_RECORD'
  foreach($kind in @('stdout','stderr')){Need ($record[$kind].path -ceq ('console-filter-validation.'+$kind+'.txt')) 'FIXED_CAPTURE_STREAM';$b=ReadBounded (Join-Path $evidence $record[$kind].path);Need ($b.Length -eq $record[$kind].bytes -and (SHA $b) -ceq $record[$kind].sha256) 'CAPTURE_STREAM_IDENTITY'}
  Need ($topRecord.stdoutBytes -eq $record.stdout.bytes -and $topRecord.stderrBytes -eq $record.stderr.bytes -and $topRecord.droppedBytes -eq 0 -and $topRecord.closeObserved -eq $true -and $null -eq $topRecord.failureCode) 'SAFE_TOP_CONSOLE_JOIN'
  $sentinelProjection=$null
  if($env:REA_SAFE_CONTROL_MODE -ceq 'filter'){
   Need ($exitCode -eq 0 -and $record.status -ceq 'passed' -and $record.exitCode -eq 0 -and $topRecord.status -ceq 'passed' -and $topRecord.exitCode -eq 0) 'FILTER_CONTROL_FAILED'
  }else{
   Need ($exitCode -eq 1 -and $record.status -ceq 'failed' -and $record.exitCode -eq 23 -and $topRecord.status -ceq 'failed' -and $topRecord.exitCode -eq 23) 'SENTINEL_EXPECTED_FAILURE_NOT_PRESERVED'
   Need (-not [Text.UTF8Encoding]::new($false,$true).GetString($topOut).Contains('REA_SYNTHETIC_SENTINEL_')) 'RAW_SENTINEL_TOP_ECHO'
   $sentinel=JSON (Join-Path $evidence 'filter-control-sentinel.json')
   Need ($sentinel.schema -ceq 'rea-hosted-synthetic-console-isolation-sentinel/v1' -and $sentinel.status -ceq 'expected-control-failure' -and $sentinel.source -ceq $env:GITHUB_SHA -and $sentinel.parent -ceq $env:REA_ARCHIVE_ZIP_PARENT -and $sentinel.runID -ceq $env:GITHUB_RUN_ID -and $sentinel.attempt -ceq $env:GITHUB_RUN_ATTEMPT -and $sentinel.job -ceq 'validate' -and $sentinel.expectedChildExitCode -eq 23 -and $sentinel.rawSentinelStreamsForUpload -eq $false -and $sentinel.profileTextIsClearlySynthetic -eq $true -and $sentinel.productTests -eq 0 -and $sentinel.originalExecutions -eq 0 -and $sentinel.archiveOpens -eq 0 -and $sentinel.fullProductAcceptance -eq $false) 'SENTINEL_RECORD_SUBJECT'
   $forbidden=@('GITHUB_OUTPUT','GITHUB_ENV','GITHUB_PATH','GITHUB_STEP_SUMMARY','GITHUB_STATE','GITHUB_TOKEN','GH_TOKEN','ACTIONS_RUNTIME_TOKEN','ACTIONS_ID_TOKEN_REQUEST_TOKEN','ACTIONS_ID_TOKEN_REQUEST_URL')
   $commandFiles=@('GITHUB_OUTPUT','GITHUB_ENV','GITHUB_PATH','GITHUB_STEP_SUMMARY','GITHUB_STATE')
   Need ($sentinel.forbiddenEnvironmentPresent.Count -eq 10 -and $sentinel.fileCommandCanaryAppendSucceeded.Count -eq 5) 'SENTINEL_BOOLEAN_ROSTERS'
   foreach($name in $forbidden){Need ($sentinel.forbiddenEnvironmentPresent.Contains($name) -and $sentinel.forbiddenEnvironmentPresent[$name] -is [bool] -and $sentinel.forbiddenEnvironmentPresent[$name] -eq $false) 'INHERITED_TOKEN_OR_FILE_COMMAND_PRESENT'}
   foreach($name in $commandFiles){Need ($sentinel.fileCommandCanaryAppendSucceeded.Contains($name) -and $sentinel.fileCommandCanaryAppendSucceeded[$name] -is [bool] -and $sentinel.fileCommandCanaryAppendSucceeded[$name] -eq $false) 'SENTINEL_CANARY_APPENDED'}
   Need ($record.stdout.bytes -eq 122 -and $record.stdout.sha256 -ceq '3e9a0fcecbd86520b4b7a0bea9ca580d97f8440a86c9f6fb67eeb58bd232d793' -and $record.stderr.bytes -eq 118 -and $record.stderr.sha256 -ceq '22fdadb07b8f9e6400d42217a05fd74fa282053baa33dffd0bbcb92a5fd87daa') 'EXACT_SYNTHETIC_SENTINEL_STREAMS'
   foreach($kind in @('stdout','stderr')){Need ($sentinel[$kind].bytes -eq $record[$kind].bytes -and $sentinel[$kind].sha256 -ceq $record[$kind].sha256) 'SENTINEL_STREAM_WITNESS_JOIN'}
   $sentinelProjection=[ordered]@{forbiddenEnvironmentPresent=$sentinel.forbiddenEnvironmentPresent;fileCommandCanaryAppendSucceeded=$sentinel.fileCommandCanaryAppendSucceeded;capturedStdout=@{bytes=122;sha256='3e9a0fcecbd86520b4b7a0bea9ca580d97f8440a86c9f6fb67eeb58bd232d793'};capturedStderr=@{bytes=118;sha256='22fdadb07b8f9e6400d42217a05fd74fa282053baa33dffd0bbcb92a5fd87daa'};rawSentinelStreamsUploaded=$false;expectedChildFailurePreserved=$true;syntheticOnly=$true}
  }
  SaveJSON (Join-Path $top 'capture-control-check.json') ([ordered]@{schema='rea-hosted-capture-control-check/v1';status='passed';control=$env:REA_SAFE_CONTROL_MODE;source=$env:GITHUB_SHA;runID=$env:GITHUB_RUN_ID;attempt=$env:GITHUB_RUN_ATTEMPT;parentExitCode=$exitCode;childExitCode=$record.exitCode;childStatus=$record.status;fileCommandChannelsUnchanged=$true;rawChildBytesEchoedToJobConsole=$false;topStdout=@{bytes=$topOut.Length;sha256=(SHA $topOut)};topStderr=@{bytes=$topErr.Length;sha256=(SHA $topErr)};sentinel=$sentinelProjection;productExecutions=0})
 }elseif($Phase -ceq 'finalize'){
  $null=Plain $admission $false;$null=Plain $evidence $false
  foreach($p in @('before','after')){CopyExact (Join-Path $admission ('source-admission-'+$p+'.json')) (Join-Path $evidence ('source-admission-'+$p+'.json'))}
  if($env:REA_SAFE_CONTROL_MODE -ceq 'filter'){
   # Keep native parser/import errors out of the public console as well.
   $null=Plain $top $false;$finalOut=Join-Path $top 'finalize.stdout.txt';$finalErr=Join-Path $top 'finalize.stderr.txt'
   Need (-not (Test-Path -LiteralPath $finalOut) -and -not (Test-Path -LiteralPath $finalErr)) 'NO_EARLIER_FINALIZATION'
   & node $validator --finalize 1>$finalOut 2>$finalErr
   $finalExit=$LASTEXITCODE;$finalBytes=ReadBounded $finalOut;Need ((ReadBounded $finalErr).Length -eq 0) 'FINALIZER_STDERR'
   $finalRecord=[Text.UTF8Encoding]::new($false,$true).GetString($finalBytes).Trim()|ConvertFrom-Json -AsHashtable -DateKind String
   Need ($finalRecord.schema -ceq 'rea-synthetic-filter-validation-safe-artifact/v1' -and $finalRecord.files -eq 7 -and $finalRecord.productTests -eq 0 -and (($finalRecord.status -ceq 'passed' -and $finalExit -eq 0) -or ($finalRecord.status -ceq 'failed' -and $finalExit -eq 1))) 'FIXED_FINALIZER_PROJECTION'
   if($finalExit -ne 0){exit 1}
  }else{
   $check=JSON (Join-Path $top 'capture-control-check.json')
   Need ($check.schema -ceq 'rea-hosted-capture-control-check/v1' -and $check.status -ceq 'passed' -and $check.control -ceq 'sentinel' -and $check.source -ceq $env:GITHUB_SHA -and $check.runID -ceq $env:GITHUB_RUN_ID -and $check.attempt -ceq $env:GITHUB_RUN_ATTEMPT -and $check.parentExitCode -eq 1 -and $check.childExitCode -eq 23 -and $check.childStatus -ceq 'failed' -and $check.fileCommandChannelsUnchanged -eq $true -and $check.rawChildBytesEchoedToJobConsole -eq $false -and $check.sentinel.expectedChildFailurePreserved -eq $true -and $check.sentinel.rawSentinelStreamsUploaded -eq $false) 'QUALIFIED_SENTINEL_CAPTURE_CONTROL'
   Need (-not (Test-Path -LiteralPath $public)) 'NO_EARLIER_SENTINEL_PUBLIC_VIEW';$null=New-Item -ItemType Directory -Path $public;$null=Plain $public $false
   SaveJSON (Join-Path $public 'console-sentinel-summary.json') ([ordered]@{schema='rea-hosted-console-isolation-sentinel-qualification/v1';status='passed';source=$env:GITHUB_SHA;parent=$env:REA_ARCHIVE_ZIP_PARENT;runID=$env:GITHUB_RUN_ID;attempt=$env:GITHUB_RUN_ATTEMPT;job='validate';control='sentinel';parentExitCode=1;childExitCode=23;childStatus='failed';expectedChildFailurePreserved=$true;fileCommandChannelsUnchanged=$true;rawChildBytesEchoedToJobConsole=$false;observations=$check.sentinel;rawSentinelStreamsUploaded=$false;sourceBodiesUploaded=$false;productTests=0;originalExecutions=0;archiveOpens=0;fullProductAcceptance=$false})
   foreach($p in @('before','after')){CopyExact (Join-Path $admission ('source-admission-'+$p+'.json')) (Join-Path $public ('source-admission-'+$p+'.json'))}
   $rows=@();foreach($name in @('console-sentinel-summary.json','source-admission-before.json','source-admission-after.json')){$b=ReadBounded (Join-Path $public $name);$text=[Text.UTF8Encoding]::new($false,$true).GetString($b).Replace('\','/');Need ($text -notmatch '[A-Za-z]:/+Users/+|/(home|Users)/') 'SENTINEL_SAFE_PROJECTION_PROFILE';$rows+=[ordered]@{path=$name;bytes=$b.Length;sha256=(SHA $b)}}
   SaveJSON (Join-Path $public 'console-sentinel-provenance.json') ([ordered]@{schema='rea-synthetic-console-sentinel-safe-artifact/v1';status='passed';source=$env:GITHUB_SHA;parent=$env:REA_ARCHIVE_ZIP_PARENT;runID=$env:GITHUB_RUN_ID;attempt=$env:GITHUB_RUN_ATTEMPT;job='validate';representation='fixed safe projection of expected failing synthetic console capture; source identities only';files=$rows;rawSentinelStreamsUploaded=$false;rawSourceBodiesUploaded=$false;completeOriginalProductArtifact=$false;expectedChildFailurePreserved=$true;productTests=0;fullProductAcceptance=$false})
  }
 }elseif($Phase -ceq 'admit'){
  $null=Plain $public $false
  if($env:REA_SAFE_CONTROL_MODE -ceq 'filter'){
   $names=@('console-filter-validation.json','console-filter-validation.stderr.txt','console-filter-validation.stdout.txt','filter-validation-report.json','source-admission-before.json','source-admission-after.json','filter-validation-provenance.json')
   $provenance=JSON (Join-Path $public 'filter-validation-provenance.json')
   Need ($provenance.schema -ceq 'rea-synthetic-filter-validation-safe-artifact/v1' -and $provenance.source -ceq $env:GITHUB_SHA -and $provenance.parent -ceq $env:REA_ARCHIVE_ZIP_PARENT -and $provenance.runID -ceq $env:GITHUB_RUN_ID -and $provenance.attempt -ceq $env:GITHUB_RUN_ATTEMPT -and $provenance.status -cin @('passed','failed') -and $provenance.rawSourceBodiesUploaded -eq $false -and $provenance.productTests -eq 0 -and $provenance.files.Count -eq 6) 'SAFE_FILTER_PROVENANCE'
   $seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
   foreach($row in $provenance.files){Need ($row.path -cin $names -and $row.path -cne 'filter-validation-provenance.json' -and $seen.Add($row.path)) 'SAFE_MEMBER_ROSTER';$b=ReadBounded (Join-Path $public $row.path) 2097152;Need ($b.Length -eq $row.bytes -and (SHA $b) -ceq $row.sha256) 'SAFE_OUTPUT_IDENTITY'}
  }else{
   $names=@('console-sentinel-summary.json','source-admission-before.json','source-admission-after.json','console-sentinel-provenance.json');$provenance=JSON (Join-Path $public 'console-sentinel-provenance.json')
   Need ($provenance.schema -ceq 'rea-synthetic-console-sentinel-safe-artifact/v1' -and $provenance.status -ceq 'passed' -and $provenance.source -ceq $env:GITHUB_SHA -and $provenance.parent -ceq $env:REA_ARCHIVE_ZIP_PARENT -and $provenance.runID -ceq $env:GITHUB_RUN_ID -and $provenance.attempt -ceq $env:GITHUB_RUN_ATTEMPT -and $provenance.rawSentinelStreamsUploaded -eq $false -and $provenance.rawSourceBodiesUploaded -eq $false -and $provenance.expectedChildFailurePreserved -eq $true -and $provenance.files.Count -eq 3) 'SAFE_SENTINEL_PROVENANCE'
   $seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
   foreach($row in $provenance.files){Need ($row.path -cin $names -and $row.path -cne 'console-sentinel-provenance.json' -and $seen.Add($row.path)) 'SAFE_SENTINEL_MEMBER_ROSTER';$b=ReadBounded (Join-Path $public $row.path);Need ($b.Length -eq $row.bytes -and (SHA $b) -ceq $row.sha256) 'SAFE_SENTINEL_OUTPUT_IDENTITY'}
  }
  $actual=@(Get-ChildItem -LiteralPath $public -Force);Need (@($actual|Where-Object {$_.PSIsContainer}).Count -eq 0 -and @($actual|Where-Object {$_.Name -cnotin $names}).Count -eq 0 -and $actual.Count -eq $names.Count) 'EXACT_PUBLIC_FILES'
  foreach($file in $actual){$null=Plain $file.FullName $true;Need ($file.Length -le 2097152) 'SAFE_OUTPUT_SIZE'}
  Need (-not [string]::IsNullOrEmpty($env:GITHUB_OUTPUT)) 'OWNED_OUTPUT_CHANNEL'
  [IO.File]::AppendAllText($env:GITHUB_OUTPUT,'approved=true'+"`n",[Text.UTF8Encoding]::new($false))
 }
 [ordered]@{schema='rea-safe-control-orchestration-console/v1';phase=$Phase;control=$env:REA_SAFE_CONTROL_MODE;status='passed';source=$env:GITHUB_SHA;productExecutions=0}|ConvertTo-Json -Compress
 exit 0
}catch{[ordered]@{schema='rea-safe-control-orchestration-console/v1';phase=$Phase;status='failed';code='CONTROL_ORCHESTRATION_REFUSED';productExecutions=0}|ConvertTo-Json -Compress;exit 1}
