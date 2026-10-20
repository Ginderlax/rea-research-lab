param(
  [Parameter(Mandatory=$true)][ValidateSet('before','after')][string]$Phase,
  [Parameter(Mandatory=$true)][string]$Evidence,
  [Parameter(Mandatory=$true)][string]$ExpectedManifestSHA256,
  [Parameter(Mandatory=$true)][string]$ExpectedParent
)
$ErrorActionPreference='Stop'
if($env:CI -ne 'true' -or $env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:RUNNER_OS -ne 'Windows' -or $env:RUNNER_ARCH -ne 'X64'){throw 'Verified hosted Windows x64 context required.'}
if($env:GITHUB_REPOSITORY -ne 'Ginderlax/rea-research-lab' -or $env:GITHUB_JOB -notin @('finite','browser')){throw 'Unexpected repository/job.'}
if($ExpectedManifestSHA256 -cnotmatch '^[0-9a-f]{64}$' -or $ExpectedParent -cne '078435d396e06681e470a4968d3256b371a08b65'){throw 'Final reviewed manifest and exact source0784 parent are required.'}
if($env:GITHUB_SHA -cnotmatch '^[0-9a-f]{40}$' -or $env:GITHUB_RUN_ID -cnotmatch '^\d+$' -or $env:GITHUB_RUN_ATTEMPT -cnotmatch '^\d+$'){throw 'Invalid actual attempt identity.'}
function Git([string[]]$Arguments){$out=& git.exe @Arguments;if($LASTEXITCODE -ne 0){throw ('Git read failed: '+($Arguments -join ' '))};return $out}
$root=[IO.Path]::GetFullPath($env:GITHUB_WORKSPACE)
if((Get-Location).Path -cne $root){throw 'Admission must run in the exact checkout.'}
if([string](Git -Arguments @('rev-parse','HEAD')) -cne $env:GITHUB_SHA){throw 'Actual checkout SHA mismatch.'}
if($env:GITHUB_WORKFLOW_SHA -cne $env:GITHUB_SHA){throw 'Workflow must come from this same actual source commit.'}
$parents=([string](Git -Arguments @('rev-list','--parents','-n','1','HEAD'))).Split(' ')
if($parents.Length -ne 2 -or $parents[0] -cne $env:GITHUB_SHA -or $parents[1] -cne $ExpectedParent){throw 'Expected the reviewed sole parent source0784.'}
if([string](Git -Arguments @('status','--porcelain=v1','--untracked-files=all')) -ne ''){throw 'Source checkout is not clean; overlays are forbidden.'}
if(-not [IO.Path]::IsPathRooted($Evidence)){throw 'Evidence must be absolute.'}
$temporary=[IO.Path]::GetFullPath($env:RUNNER_TEMP).TrimEnd('\')
$evidencePath=[IO.Path]::GetFullPath($Evidence)
$prefix=$temporary+'\'
if(-not $evidencePath.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase) -or $evidencePath.Substring($prefix.Length).Contains('\')){throw 'Evidence must be a direct owned RUNNER_TEMP child.'}
if($Phase -eq 'before'){[IO.Directory]::CreateDirectory($evidencePath)|Out-Null}
$at=$evidencePath
while($at.Length -ge $temporary.Length){$item=Get-Item -LiteralPath $at;if(($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Evidence ancestors cannot be links.'};if($at -eq $temporary){break};$at=[IO.Path]::GetDirectoryName($at)}
$manifestRelative='products/rea-studio/experiments/backup-native-keys/source-admission.json'
function Physical([string]$Relative){
  if(-not $Relative -or $Relative.Contains('\') -or $Relative.Contains(':') -or $Relative.Contains([char]0) -or $Relative.StartsWith('/') -or @($Relative.Split('/')|Where-Object {$_ -in @('','.','..')}).Count){throw 'Invalid canonical source path.'}
  $current=$root;foreach($part in $Relative.Split('/')){$current=Join-Path $current $part;$item=Get-Item -LiteralPath $current;if(($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw ('Source link refused: '+$Relative)}}
  $item=Get-Item -LiteralPath $current;if($item.PSIsContainer -or $item.Length -gt 8*1024*1024){throw ('Nonordinary or oversized source: '+$Relative)};return $current
}
function Authenticate([string]$Relative,$Pin){
  $file=Physical $Relative;$bytes=[IO.File]::ReadAllBytes($file);$hash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
  if($null -ne $Pin -and ($bytes.Length -ne $Pin.bytes -or $hash -cne $Pin.sha256)){throw ('Frozen raw source pin changed: '+$Relative)}
  $tree=[string](Git -Arguments @('ls-tree','HEAD','--',$Relative));if(-not $tree.StartsWith('100644 blob ',[StringComparison]::Ordinal)){throw ('Expected ordinary Git blob: '+$Relative)}
  $expectedBlob=[string](Git -Arguments @('rev-parse',('HEAD:'+$Relative)));$actualBlob=[string](Git -Arguments @('hash-object','--no-filters','--',$Relative));if($expectedBlob -cne $actualBlob){throw ('Physical source differs from actual Git blob: '+$Relative)}
  return @{path=$Relative;bytes=$bytes.Length;sha256=$hash;gitBlob=$actualBlob}
}
$manifestPin=Authenticate $manifestRelative $null
if($manifestPin.sha256 -cne $ExpectedManifestSHA256){throw 'Source manifest is not the reviewed fixed raw identity.'}
$manifest=Get-Content -LiteralPath (Physical $manifestRelative) -Raw|ConvertFrom-Json -AsHashtable -DateKind String
if($manifest.schema -cne 'rea-backup-native-keys-source-admission/v1' -or $manifest.parent -cne $ExpectedParent -or $manifest.files.Count -lt 40 -or $manifest.files.Count -gt 2048){throw 'Invalid source admission contract.'}
$unique=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$rows=@();$total=[long]0
foreach($pin in $manifest.files){if(-not $unique.Add([string]$pin.path) -or $pin.path -in @($manifestRelative,'.github/workflows/backup-native-keys-cloud.yml')){throw 'Duplicate/cyclic source admission row.'};if($pin.sha256 -cnotmatch '^[0-9a-f]{64}$' -or $pin.bytes -lt 0 -or $pin.bytes -gt 8*1024*1024){throw 'Invalid frozen source pin.'};$row=Authenticate $pin.path $pin;$total+=$row.bytes;if($total -gt 32*1024*1024){throw 'Source capture byte bound exceeded.'};$rows+=$row}
# The allowlist must cover the whole eligible dependency closure, not just the
# changed files. A newly added Backup module/test cannot silently be omitted.
$closure=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
function Collect([string]$Relative,[int]$Depth=0){if($Depth -gt 32){throw 'Source closure depth bound exceeded.'};$directory=Join-Path $root $Relative;$item=Get-Item -LiteralPath $directory;if(-not $item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Source closure directory is not ordinary.'};foreach($child in Get-ChildItem -LiteralPath $directory){if(($child.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Source closure link refused.'};if($child.PSIsContainer){if($child.Name -notin @('results','.local','node_modules')){Collect ($Relative+'/'+$child.Name) ($Depth+1)}}else{[void]$closure.Add($Relative+'/'+$child.Name);if($closure.Count -gt 2048){throw 'Source closure file bound exceeded.'}}}}
foreach($directory in @('products/rea-studio/apps/backup','products/rea-studio/lib','products/rea-studio/public','products/rea-studio/browser-tests')){Collect $directory}
foreach($fixed in @('products/rea-studio/server.mjs','products/rea-studio/catalog.mjs','products/rea-studio/package.json','products/rea-studio/scripts/verify-cloud-browser.mjs','products/rea-studio/scripts/verify-backup-native-keys-cloud.mjs','products/rea-studio/scripts/run-backup-native-keys-tests.mjs','products/rea-studio/scripts/backup-native-keys-source-admission.ps1','products/rea-studio/experiments/backup-native-keys/finite-roster.json','products/rea-studio/apps/backup/results/compression-source-study/legacy/restic.mjs.snapshot','projects/09-restic/artifact-manifest.json','.gitattributes')){[void]$closure.Add($fixed)}
if($closure.Count -ne $unique.Count){throw 'Frozen allowlist is not the exact consumed dependency closure.'};foreach($name in $closure){if(-not $unique.Contains($name)){throw ('Unadmitted dependency: '+$name)}}
$workflow=Authenticate '.github/workflows/backup-native-keys-cloud.yml' $null
$recordPath=Join-Path $evidencePath ('source-'+$Phase+'.json');if(Test-Path -LiteralPath $recordPath){throw 'Do not overwrite an earlier source observation.'}
$snapshot=Join-Path $evidencePath ('source-'+$Phase);if(Test-Path -LiteralPath $snapshot){throw 'Do not reuse source snapshot directory.'};[IO.Directory]::CreateDirectory($snapshot)|Out-Null
foreach($row in @($rows)+@($manifestPin,$workflow)){$destination=Join-Path $snapshot $row.path;[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination))|Out-Null;[IO.File]::Copy((Physical $row.path),$destination,$false);if((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant() -cne $row.sha256){throw 'Raw source snapshot readback failed.'}}
$execution=@{};foreach($key in @('GITHUB_SHA','GITHUB_REPOSITORY','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_JOB','GITHUB_WORKFLOW_SHA','RUNNER_ENVIRONMENT','RUNNER_OS','RUNNER_ARCH')){$execution[$key]=[Environment]::GetEnvironmentVariable($key)}
$record=@{schema='rea-backup-native-keys-source-check/v1';phase=$Phase;status='authenticated';atUtc=[DateTime]::UtcNow.ToString('o');execution=$execution;soleParent=$ExpectedParent;manifest=$manifestPin;workflow=$workflow;sourceFiles=$rows;sourceFilesCount=$rows.Count;sourceBytes=$total;sourceOverlay=$false;historicalReceiptsRebound=$false;productExecutionsByAdmission=0}
if($Phase -eq 'after'){$before=Get-Content -LiteralPath (Join-Path $evidencePath 'source-before.json') -Raw|ConvertFrom-Json -AsHashtable -DateKind String;if($before.status -cne 'authenticated' -or $before.execution.GITHUB_SHA -cne $env:GITHUB_SHA -or $before.execution.GITHUB_RUN_ID -cne $env:GITHUB_RUN_ID -or $before.execution.GITHUB_RUN_ATTEMPT -cne $env:GITHUB_RUN_ATTEMPT -or $before.execution.GITHUB_JOB -cne $env:GITHUB_JOB -or $before.manifest.sha256 -cne $manifestPin.sha256){throw 'Source-before receipt belongs to a different attempt.'}}
$record|ConvertTo-Json -Depth 10|Set-Content -LiteralPath $recordPath -Encoding utf8
Write-Output ('Authenticated '+$rows.Count+' source blobs, '+$total+' raw bytes; phase '+$Phase+'.')
