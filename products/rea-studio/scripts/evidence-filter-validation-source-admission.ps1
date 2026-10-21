# Source identity checks only. This script never imports product/gate JavaScript.
param(
 [Parameter(Mandatory)][ValidateSet('before','after')][string]$Phase,
 [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{64}$')][string]$ExpectedManifestSHA256
)
$ErrorActionPreference='Stop'
$expectedBranch='experiment/evidence-filter-validation-20261021'
$expectedParent='6aeb166588d834c9635940e542b2de4e98b1eaf2'
$manifestPath='products/rea-studio/experiments/archive-safe-evidence/validation-source-admission.json'
$workflowPath='.github/workflows/evidence-filter-validation-cloud.yml'
$workspace=[IO.Path]::GetFullPath($env:GITHUB_WORKSPACE)
function Need([bool]$ok,[string]$code){if(-not $ok){throw $code}}
function SHA([byte[]]$b){return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($b)).ToLowerInvariant()}
function Plain([string]$p,[bool]$file){
 $full=[IO.Path]::GetFullPath($p);$at=Get-Item -LiteralPath $full
 Need ((($at.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) -and ($at.PSIsContainer -eq (-not $file))) 'ORDINARY_MEMBER'
 $parent=$at.Directory;if(-not $file){$parent=$at.Parent}
 while($parent){Need (($parent.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) 'ANCESTOR_LINK';$parent=$parent.Parent}
 if($file){Need ($at.Length -le 256*1024) 'SOURCE_SIZE_BEFORE_READ'}
 return $at
}
function Safe([string]$p){
 Need ($p -and $p.Length -le 1024 -and -not [IO.Path]::IsPathRooted($p) -and $p -cnotmatch '[\\:\x00-\x1f\x7f]') 'SOURCE_PATH'
 foreach($part in $p.Split('/')){Need ($part -and $part -cnotin @('.','..') -and $part -cnotmatch '[. ]$|[<>"|?*]' -and $part -notmatch '^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)') 'SOURCE_COMPONENT'}
}
function ReadBounded([string]$p){
 $null=Plain $p $true
 $stream=[IO.File]::Open($p,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
 try{
  $length=$stream.Length;Need ($length -le 256*1024) 'OPEN_SOURCE_SIZE'
  $buffer=[byte[]]::new([int]$length+1);$offset=0
  while($offset -lt $buffer.Length){$read=$stream.Read($buffer,$offset,$buffer.Length-$offset);if($read -eq 0){break};$offset+=$read}
  Need ($offset -eq $length -and $stream.Length -eq $length) 'BOUNDED_SOURCE_READ'
  $result=[byte[]]::new([int]$length);if($length -gt 0){[Array]::Copy($buffer,$result,[int]$length)}
  return ,$result
 }finally{$stream.Dispose()}
}
function Git([string[]]$Arguments){$v=& git.exe -C $workspace @Arguments 2>$null;Need ($LASTEXITCODE -eq 0) 'GIT_SOURCE_READ';return (@($v)-join "`n").TrimEnd([char[]]"`r`n")}
function SourceRow([string]$relative,$expected){
 Safe $relative;$absolute=[IO.Path]::GetFullPath((Join-Path $workspace $relative));Need ($absolute.StartsWith($workspace+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) 'SOURCE_CONFINEMENT'
 $first=Plain $absolute $true;$length=$first.Length;$modified=$first.LastWriteTimeUtc.Ticks;$b=ReadBounded $absolute;$last=Get-Item -LiteralPath $absolute
 Need ($b.Length -eq $length -and $last.Length -eq $length -and $last.LastWriteTimeUtc.Ticks -eq $modified) 'SOURCE_CHANGED_DURING_READ'
 $digest=SHA $b
 if($null -ne $expected){Need ($length -eq $expected.bytes -and $digest -ceq $expected.sha256) 'FROZEN_SOURCE_BODY'}
 $header=[Text.Encoding]::ASCII.GetBytes('blob '+$b.Length+[char]0);$blob=[Convert]::ToHexString([Security.Cryptography.SHA1]::HashData([byte[]]($header+$b))).ToLowerInvariant()
 $tree=Git @('ls-tree','HEAD','--',$relative);Need ($tree -ceq ('100644 blob '+$blob+"`t"+$relative)) 'GIT_MODE_AND_RAW_BODY'
 return [ordered]@{path=$relative;bytes=$b.Length;sha256=$digest;gitBlob=$blob;mode='100644'}
}
try{
 foreach($pair in @(@('CI','true'),@('GITHUB_ACTIONS','true'),@('RUNNER_ENVIRONMENT','github-hosted'),@('RUNNER_OS','Windows'),@('RUNNER_ARCH','X64'),@('GITHUB_REPOSITORY','Ginderlax/rea-research-lab'),@('GITHUB_JOB','validate'),@('REA_ARCHIVE_ZIP_ROLE','finite'),@('REA_SAFE_FEATURE_BRANCH',$expectedBranch),@('REA_ARCHIVE_ZIP_PARENT',$expectedParent))){Need ([Environment]::GetEnvironmentVariable($pair[0]) -ceq $pair[1]) 'HOSTED_EXECUTION_IDENTITY'}
 Need ($env:GITHUB_SHA -cmatch '^[0-9a-f]{40}$' -and $env:GITHUB_WORKFLOW_SHA -ceq $env:GITHUB_SHA -and $env:GITHUB_REF -ceq ('refs/heads/'+$expectedBranch)) 'SOURCE_REF'
 Need ($env:GITHUB_RUN_ID -cmatch '^[1-9][0-9]*$' -and $env:GITHUB_RUN_ATTEMPT -cmatch '^[1-9][0-9]*$') 'ACTUAL_ATTEMPT'
 Need ($env:REA_SAFE_CONTROL_MODE -cin @('filter','sentinel')) 'CONTROL_MODE'
 Need ([Environment]::Is64BitProcess -and $PSVersionTable.PSEdition -ceq 'Core') 'POWERSHELL_X64'
 $null=Plain $workspace $false
 Need ((Git @('rev-list','--parents','-n','1','HEAD')) -ceq ($env:GITHUB_SHA+' '+$expectedParent)) 'EXACT_SOLE_PARENT'
 $statusRecords=@(& git.exe -C $workspace status --porcelain=v1 --untracked-files=all 2>$null)
 Need ($LASTEXITCODE -eq 0 -and $statusRecords.Count -eq 0) 'CLEAN_COMMITTED_SOURCE'
 $manifestFile=Join-Path $workspace $manifestPath;$manifestBytes=ReadBounded $manifestFile
 Need ((SHA $manifestBytes) -ceq $ExpectedManifestSHA256) 'MANIFEST_RAW_HASH'
 $manifest=[Text.UTF8Encoding]::new($false,$true).GetString($manifestBytes)|ConvertFrom-Json -AsHashtable -DateKind String
 Need ($manifest.schema -ceq 'rea-synthetic-evidence-control-source-admission/v1' -and $manifest.parent -ceq $expectedParent -and $manifest.branch -ceq $expectedBranch -and $manifest.files.Count -eq 9 -and $manifest.productExecutionApproved -eq $false) 'FROZEN_CONTROL_MANIFEST'
 $seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase);$rows=@();$total=[long]0
 foreach($row in $manifest.files){Need ($seen.Add($row.path) -and $row.path -cne $manifestPath -and $row.path -cne $workflowPath -and $row.sha256 -cmatch '^[0-9a-f]{64}$') 'UNIQUE_CONTROL_SOURCE';$actual=SourceRow $row.path $row;$rows+=$actual;$total+=$actual.bytes}
 Need ($total -eq $manifest.rawBytes -and $total -le 256*1024) 'CONTROL_SOURCE_AGGREGATE'
 $manifestIdentity=SourceRow $manifestPath $null;$workflowIdentity=SourceRow $workflowPath $null
 $temporary=[IO.Path]::GetFullPath($env:RUNNER_TEMP);$null=Plain $temporary $false
 $receiptRoot=Join-Path $temporary ('rea-filter-validation-admission-'+$env:GITHUB_RUN_ID+'-'+$env:GITHUB_RUN_ATTEMPT)
 Need ([IO.Path]::GetDirectoryName($receiptRoot) -ceq $temporary) 'OWNED_RECEIPT_ROOT'
 if($Phase -ceq 'before'){Need (-not (Test-Path -LiteralPath $receiptRoot)) 'NO_EARLIER_ADMISSION';$null=New-Item -ItemType Directory -Path $receiptRoot}else{Need (Test-Path -LiteralPath $receiptRoot) 'MISSING_BEFORE_ADMISSION'}
 $null=Plain $receiptRoot $false
 $record=[ordered]@{schema='rea-synthetic-evidence-control-source-check/v1';status='authenticated';phase=$Phase;source=$env:GITHUB_SHA;parent=$expectedParent;branch=$expectedBranch;runID=$env:GITHUB_RUN_ID;attempt=$env:GITHUB_RUN_ATTEMPT;job='validate';control=$env:REA_SAFE_CONTROL_MODE;rows=$rows;rawBytes=$total;manifest=$manifestIdentity;workflow=$workflowIdentity;sourceBodiesUploaded=$false;productExecutions=0;gateExecutionsByAdmission=0;historicalReceiptsRebound=$false}
 if($Phase -ceq 'after'){$priorPath=Join-Path $receiptRoot 'source-admission-before.json';$null=Plain $priorPath $true;$prior=Get-Content -LiteralPath $priorPath -Raw|ConvertFrom-Json -AsHashtable -DateKind String;Need ($prior.source -ceq $record.source -and $prior.parent -ceq $record.parent -and $prior.phase -ceq 'before' -and $prior.runID -ceq $record.runID -and $prior.attempt -ceq $record.attempt -and ($prior.rows|ConvertTo-Json -Depth 6 -Compress) -ceq ($rows|ConvertTo-Json -Depth 6 -Compress) -and ($prior.workflow|ConvertTo-Json -Compress) -ceq ($workflowIdentity|ConvertTo-Json -Compress)) 'BEFORE_AFTER_SOURCE_JOIN'}
 $out=Join-Path $receiptRoot ('source-admission-'+$Phase+'.json');$bytes=[Text.UTF8Encoding]::new($false).GetBytes(($record|ConvertTo-Json -Depth 9)+"`n");$stream=[IO.File]::Open($out,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None);try{$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
 Need ((SHA (ReadBounded $out)) -ceq (SHA $bytes)) 'RECEIPT_READBACK'
 [ordered]@{schema='rea-safe-source-control-console/v1';phase=$Phase;status='authenticated';source=$env:GITHUB_SHA;files=9;rawBytes=$total;productExecutions=0}|ConvertTo-Json -Compress
}catch{[ordered]@{schema='rea-safe-source-control-console/v1';phase=$Phase;status='failed';code='SOURCE_CONTROL_REFUSED';productExecutions=0}|ConvertTo-Json -Compress;exit 1}
