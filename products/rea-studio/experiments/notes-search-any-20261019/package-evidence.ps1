param([Parameter(Mandatory=$true)][string]$Evidence)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$limits=@{files=5000;rawBytes=96*1024*1024;memberBytes=8*1024*1024;zipBytes=15*1024*1024;depth=32}
foreach($pair in @{CI='true';GITHUB_ACTIONS='true';RUNNER_ENVIRONMENT='github-hosted';RUNNER_OS='Windows';RUNNER_ARCH='X64';GITHUB_REPOSITORY='Ginderlax/rea-research-lab';GITHUB_REF='refs/heads/experiment/notes-search-any-20261019';GITHUB_JOB='notes-any-observed-values';GITHUB_EVENT_NAME='push';GITHUB_SERVER_URL='https://github.com'}.GetEnumerator()) {
  if([Environment]::GetEnvironmentVariable($pair.Key) -cne $pair.Value){throw ('Hosted packaging identity differs: '+$pair.Key)}
}
foreach($key in @('GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT')){if([Environment]::GetEnvironmentVariable($key) -notmatch '^[1-9][0-9]*$'){throw 'Invalid attempt identity'}}
if($env:GITHUB_SHA -notmatch '^[0-9a-f]{40}$'){throw 'Invalid source identity'}
function Assert-NoLinks([string]$Filename) {
  $current=[IO.Path]::GetFullPath($Filename)
  for(;;){$item=Get-Item -LiteralPath $current -Force;if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Linked evidence ancestor'};$parent=[IO.Directory]::GetParent($current);if($null -eq $parent){break};$current=$parent.FullName}
}
function Assert-Name([string]$Name) {
  if(-not $Name -or $Name.Length -gt 2048 -or $Name.StartsWith('/') -or $Name -match '[\\:\x00-\x1f\x7f<>"|?*]'){throw 'Unsafe evidence member name'}
  $parts=$Name.Split('/');if($parts.Count -gt $limits.depth){throw 'Evidence depth exceeded'}
  foreach($part in $parts){if(-not $part -or $part -eq '.' -or $part -eq '..' -or $part -match '[ .]$' -or $part -match '^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)'){throw 'Unsafe evidence path component'}}
}
function Get-Identity([string]$Filename) {Assert-NoLinks $Filename;$item=Get-Item -LiteralPath $Filename -Force;if($item.PSIsContainer -or $item.Length -gt $limits.memberBytes){throw 'Evidence member bound'};@{bytes=[long]$item.Length;sha256=(Get-FileHash -LiteralPath $Filename -Algorithm SHA256).Hash.ToLowerInvariant()}}
function Get-Members([string]$Directory) {
  Assert-NoLinks $Directory
  $rows=[Collections.Generic.List[object]]::new();$queue=[Collections.Generic.Queue[object]]::new();$queue.Enqueue(@{path=$Directory;depth=0})
  $folded=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase);[long]$raw=0
  while($queue.Count){$next=$queue.Dequeue();if($next.depth -gt $limits.depth){throw 'Evidence depth exceeded'}
    foreach($item in ([IO.DirectoryInfo]::new($next.path)).GetFileSystemInfos()) {
      if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Linked evidence rejected'}
      $name=[IO.Path]::GetRelativePath($Directory,$item.FullName).Replace('\','/');Assert-Name $name
      if(-not $folded.Add($name)){throw 'Case-colliding evidence path'}
      if($item.Attributes -band [IO.FileAttributes]::Directory){$queue.Enqueue(@{path=$item.FullName;depth=$next.depth+1});continue}
      if($item.Length -gt $limits.memberBytes){throw 'Evidence member bound'};$raw+=$item.Length
      if($rows.Count -ge $limits.files -or $raw -gt $limits.rawBytes){throw 'Evidence aggregate bound'}
      Assert-NoLinks $item.FullName;$identity=Get-Identity $item.FullName;$rows.Add(@{path=$name;fullPath=$item.FullName;bytes=$identity.bytes;sha256=$identity.sha256})
    }
  }
  return ,@($rows|Sort-Object -Property path -CaseSensitive)
}
function Write-ExclusiveJSON([string]$Filename,$Value) {
  $bytes=[Text.UTF8Encoding]::new($false).GetBytes(($Value|ConvertTo-Json -Depth 20)+"`n")
  if($bytes.Length -gt $limits.memberBytes){throw 'JSON output exceeds member bound'}
  $stream=[IO.File]::Open($Filename,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try{$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
  $expectedHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant();$actual=Get-Identity $Filename
  if($actual.bytes -ne $bytes.Length -or $actual.sha256 -cne $expectedHash){throw 'JSON output readback differs'}
}
function New-VerifiedArchive([string]$Directory,[string]$Archive) {
  if(Test-Path -LiteralPath $Archive){throw 'Archive already exists'}
  $members=Get-Members $Directory
  # Archive every file from the closed inventory. Empty working directories
  # carry no file contents and are not emitted as extra ZIP member records.
  $target=[IO.File]::Open($Archive,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  $writer=[IO.Compression.ZipArchive]::new($target,[IO.Compression.ZipArchiveMode]::Create,$false)
  try{foreach($row in $members){Assert-NoLinks $row.fullPath;$input=[IO.File]::Open($row.fullPath,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read);$entry=$writer.CreateEntry($row.path,[IO.Compression.CompressionLevel]::Optimal);$output=$entry.Open()
    try{[long]$copied=0;$buffer=[byte[]]::new(65536);while(($n=$input.Read($buffer,0,$buffer.Length)) -gt 0){$copied+=$n;if($copied -gt $row.bytes){throw 'Evidence changed during archive write'};$output.Write($buffer,0,$n)};if($copied -ne $row.bytes){throw 'Evidence truncated during archive write'}}finally{$output.Dispose();$input.Dispose()}
  }}finally{$writer.Dispose();$target.Dispose()}
  $physical=Get-Item -LiteralPath $Archive -Force;if($physical.Length -gt $limits.zipBytes){throw 'Stored ZIP exceeds fixed15MiB bound'}
  $expected=[Collections.Generic.Dictionary[string,object]]::new([StringComparer]::Ordinal)
  foreach($row in $members){$expected.Add($row.path,$row)}
  $seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  $archiveRead=[IO.Compression.ZipFile]::OpenRead($Archive)
  try {
    if($archiveRead.Entries.Count -ne $members.Count){throw 'Stored ZIP member count differs'}
    foreach($entry in $archiveRead.Entries){Assert-Name $entry.FullName;if(-not $seen.Add($entry.FullName) -or -not $expected.ContainsKey($entry.FullName)){throw 'Stored ZIP member roster differs'}
      $row=$expected[$entry.FullName];if($entry.Length -ne $row.bytes -or $entry.Length -gt $limits.memberBytes){throw 'Stored ZIP member size differs'}
      $reader=$entry.Open();$hash=[Security.Cryptography.SHA256]::Create();[long]$count=0
      try{$buffer=[byte[]]::new(65536);while(($n=$reader.Read($buffer,0,$buffer.Length)) -gt 0){$count+=$n;if($count -gt $row.bytes){throw 'Stored ZIP stream overrun'};[void]$hash.TransformBlock($buffer,0,$n,$buffer,0)};[void]$hash.TransformFinalBlock([byte[]]::new(0),0,0);$digest=[Convert]::ToHexString($hash.Hash).ToLowerInvariant()}finally{$hash.Dispose();$reader.Dispose()}
      if($count -ne $row.bytes -or $digest -cne $row.sha256){throw 'Stored ZIP content readback differs'}
      $now=Get-Identity $row.fullPath;if($now.bytes -ne $row.bytes -or $now.sha256 -cne $row.sha256){throw 'Evidence source changed during packaging'}
    }
  }finally{$archiveRead.Dispose()}
  $again=Get-Members $Directory
  if((@($again|ForEach-Object {$_.path+' '+$_.bytes+' '+$_.sha256}) -join "`n") -cne (@($members|ForEach-Object {$_.path+' '+$_.bytes+' '+$_.sha256}) -join "`n")){throw 'Evidence closure changed during packaging'}
  [long]$raw=0;foreach($row in $members){$raw+=[long]$row.bytes}
  return @{path=$Archive;bytes=$physical.Length;sha256=(Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash.ToLowerInvariant();files=$members.Count;rawBytes=$raw;completeMemberReadback=$true}
}
$temporary=[IO.Path]::GetFullPath($env:RUNNER_TEMP)
$expected=[IO.Path]::Combine($temporary,('rea-notes-search-any-'+$env:GITHUB_RUN_ID+'-'+$env:GITHUB_RUN_ATTEMPT))
if([IO.Path]::GetFullPath($Evidence) -ine $expected){throw 'Evidence is not the exact owned attempt directory'}
Assert-NoLinks $temporary
if(-not (Test-Path -LiteralPath $expected)){[void][IO.Directory]::CreateDirectory($expected)}
Assert-NoLinks $expected
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive=[IO.Path]::Combine($temporary,('rea-notes-search-any-'+$env:GITHUB_RUN_ID+'-'+$env:GITHUB_RUN_ATTEMPT+'.zip'))
try {
  $members=Get-Members $expected
  Write-ExclusiveJSON ([IO.Path]::Combine($expected,'packaging-manifest.json')) @{schema='rea-notes-search-any-package-manifest/v1';sourceCommit=$env:GITHUB_SHA;parentCommit='ab26bf14bc1a55a723566bbafb3ca391c3ef671c';runId=$env:GITHUB_RUN_ID;runAttempt=$env:GITHUB_RUN_ATTEMPT;job=$env:GITHUB_JOB;limits=$limits;filesBeforeThisManifest=$members.Count;members=@($members|ForEach-Object {@{path=$_.path;bytes=$_.bytes;sha256=$_.sha256}});thisManifestSelfHashExcluded=$true;acceptanceClaimed=$false;historicalReceiptsRebound=$false}
  $result=New-VerifiedArchive $expected $archive
  'artifact_path='+$archive|Out-File -LiteralPath $env:GITHUB_OUTPUT -Encoding utf8 -Append
  $result|ConvertTo-Json -Depth 8|Write-Output
}catch {
  $failure=$_
  $fallback=[IO.Path]::Combine($temporary,('rea-notes-search-any-incomplete-'+$env:GITHUB_RUN_ID+'-'+$env:GITHUB_RUN_ATTEMPT))
  if(Test-Path -LiteralPath $fallback){throw 'Fallback already exists'}
  [void][IO.Directory]::CreateDirectory($fallback);Assert-NoLinks $fallback
  foreach($item in ([IO.DirectoryInfo]::new($expected)).GetFiles()) {if(-not($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -and $item.Length -le 1024*1024 -and $item.Extension -in @('.json','.txt')){[IO.File]::Copy($item.FullName,[IO.Path]::Combine($fallback,$item.Name),$false)}}
  Write-ExclusiveJSON ([IO.Path]::Combine($fallback,'storage-failure.json')) @{schema='rea-cloud-evidence-storage-failure/v1';status='failed';sourceCommit=$env:GITHUB_SHA;runId=$env:GITHUB_RUN_ID;runAttempt=$env:GITHUB_RUN_ATTEMPT;job=$env:GITHUB_JOB;completeEvidenceUploaded=$false;sourceSnapshotsUploaded=$false;rawLogsComplete=$false;limits=$limits;failureName=$failure.Exception.GetType().FullName;message=$failure.Exception.Message;reason='Complete bounded evidence could not be preserved. This fallback cannot qualify the experiment.'}
  $fallbackArchive=$fallback+'.zip';$result=New-VerifiedArchive $fallback $fallbackArchive
  'artifact_path='+$fallbackArchive|Out-File -LiteralPath $env:GITHUB_OUTPUT -Encoding utf8 -Append
  throw $failure
}
