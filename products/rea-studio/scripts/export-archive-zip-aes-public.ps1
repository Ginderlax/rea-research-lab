param(
  [Parameter(Mandatory=$true)][string]$Inputs,
  [Parameter(Mandatory=$true)][string]$Evidence,
  [Parameter(Mandatory=$true)][string]$ExpectedInputsSHA256
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$repo='Ginderlax/rea-research-lab'
$parent='482575f6232981cfeca05b89ba6b7e0b4cb81e30'
$branch='refs/heads/evidence/archive-zip-aes-public-export-20261021'
$maxMember=8MB; $maxOuter=16MB; $maxInner=15MB; $maxExpanded=128MB
$maxCount=10000; $maxEvidenceBytes=128MB
$utf8=[Text.UTF8Encoding]::new($false,$true)
$emptyHash='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
$script:stage='admission'
$script:apiCalls=0; $script:downloadCalls=0; $script:expandedBytes=0L
$script:memberReads=0; $script:exportReads=0
$script:stagedRetainedBytes=0L

function Require([bool]$Condition,[string]$Code){if(-not $Condition){throw ('PUBLIC_EXPORT_'+$Code)}}
function Hash-Bytes([byte[]]$Bytes){Require ($null -ne $Bytes) 'NONNULL_BYTE_BUFFER';[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Bytes)).ToLowerInvariant()}
function Hash-File([string]$Path){(Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()}
function Has-Keys($Object,[string[]]$Keys){
  Require ($Object -is [System.Collections.IDictionary]) 'OBJECT_REQUIRED'
  $actual=@($Object.Keys|Sort-Object); $expected=@($Keys|Sort-Object)
  Require (($actual.Count -eq $expected.Count) -and (($actual -join "`n") -ceq ($expected -join "`n"))) 'OBJECT_KEYS'
}
function Assert-Plain([string]$Path,[bool]$Directory=$false){
  $full=[IO.Path]::GetFullPath($Path); $cursor=$full
  while($cursor){
    $item=Get-Item -LiteralPath $cursor -Force
    Require (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) 'REPARSE_POINT'
    $next=[IO.Path]::GetDirectoryName($cursor)
    if($next -ceq $cursor){break}; $cursor=$next
  }
  $leaf=Get-Item -LiteralPath $full -Force
  Require ($leaf.PSIsContainer -eq $Directory) 'ORDINARY_PATH_TYPE'
  return $full
}
function Child-Path([string]$Root,[string]$Relative){
  Assert-MemberName $Relative $false
  $rootFull=[IO.Path]::GetFullPath($Root).TrimEnd([char[]]@('\','/'))
  $child=[IO.Path]::GetFullPath((Join-Path $rootFull $Relative.Replace('/',[IO.Path]::DirectorySeparatorChar)))
  Require ($child.StartsWith($rootFull+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) 'CONFINEMENT'
  return $child
}
function New-Directory([string]$Path){
  Require (-not (Test-Path -LiteralPath $Path)) 'EXCLUSIVE_DIRECTORY'
  [IO.Directory]::CreateDirectory($Path)|Out-Null
  Assert-Plain $Path $true|Out-Null
}
function Ensure-Parents([string]$Root,[string]$File){
  $parentPath=[IO.Path]::GetDirectoryName($File)
  $relative=[IO.Path]::GetRelativePath($Root,$parentPath)
  $cursor=$Root
  if($relative -cne '.'){
    foreach($part in $relative.Split([IO.Path]::DirectorySeparatorChar)){
      Require ($part -cne '..') 'PARENT_CONFINEMENT'
      $cursor=Join-Path $cursor $part
      if(-not (Test-Path -LiteralPath $cursor)){[IO.Directory]::CreateDirectory($cursor)|Out-Null}
      Assert-Plain $cursor $true|Out-Null
    }
  }
}
function Write-NewBytes([string]$Path,[byte[]]$Bytes){
  Require ($null -ne $Bytes) 'NONNULL_WRITE_BUFFER'
  Require ($Bytes.LongLength -le $maxMember) 'WRITE_MEMBER_BOUND'
  $stream=[IO.File]::Open($Path,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try{$stream.Write($Bytes,0,$Bytes.Length);$stream.Flush($true)}finally{$stream.Dispose()}
  Assert-Plain $Path $false|Out-Null
  Require (((Get-Item -LiteralPath $Path).Length -eq $Bytes.LongLength) -and ((Hash-File $Path) -ceq (Hash-Bytes $Bytes))) 'WRITE_READBACK'
}
function Write-NewJSON([string]$Path,$Value){
  $bytes=$utf8.GetBytes(($Value|ConvertTo-Json -Depth 80)+"`n")
  Write-NewBytes $Path $bytes
}
function Assert-MemberName([string]$Name,[bool]$Directory){
  Require ($Name.Length -gt 0 -and $Name.Length -le 1024) 'MEMBER_NAME_BOUND'
  Require (-not [IO.Path]::IsPathRooted($Name)) 'ABSOLUTE_MEMBER'
  Require ($Name -cnotmatch '[\\:\x00-\x1f\x7f]') 'MEMBER_SEPARATOR_OR_CONTROL'
  Require ($Name.EndsWith('/') -eq $Directory) 'DIRECTORY_NAME'
  $trim=if($Directory){$Name.Substring(0,$Name.Length-1)}else{$Name}
  Require ($trim.Length -gt 0) 'ROOT_ENTRY'
  foreach($part in $trim.Split('/')){
    Require ($part.Length -gt 0 -and $part -cne '.' -and $part -cne '..') 'MEMBER_COMPONENT'
    Require ($part -cnotmatch '[<>"|?*]' -and -not $part.EndsWith('.') -and -not $part.EndsWith(' ')) 'WINDOWS_MEMBER'
    Require ($part -notmatch '^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)') 'RESERVED_MEMBER'
  }
}
function Add-Name($Names,[string]$Name,[bool]$Directory){
  Assert-MemberName $Name $Directory
  $key=$Name.TrimEnd('/').Normalize([Text.NormalizationForm]::FormC)
  Require ($Names.Add($key)) 'CASE_OR_NORMALIZATION_COLLISION'
}
function Get-U16([byte[]]$Bytes,[long]$At){Require ($At -ge 0 -and $At+2 -le $Bytes.LongLength) 'ZIP_HEADER_BOUND';[BitConverter]::ToUInt16($Bytes,[int]$At)}
function Get-U32([byte[]]$Bytes,[long]$At){Require ($At -ge 0 -and $At+4 -le $Bytes.LongLength) 'ZIP_HEADER_BOUND';[BitConverter]::ToUInt32($Bytes,[int]$At)}
function Inspect-ZipHeaders([byte[]]$Bytes,[long]$Maximum){
  Require ($Bytes.LongLength -ge 22 -and $Bytes.LongLength -le $Maximum) 'ZIP_BYTE_BOUND'
  $end=-1L
  for($at=$Bytes.Length-22;$at -ge [Math]::Max(0,$Bytes.Length-65557);$at--){
    if((Get-U32 $Bytes $at) -eq 0x06054b50 -and $at+22+(Get-U16 $Bytes ($at+20)) -eq $Bytes.LongLength){$end=$at;break}
  }
  Require ($end -ge 0) 'ZIP_END'
  $count=Get-U16 $Bytes ($end+10); $start=[long](Get-U32 $Bytes ($end+16));$size=[long](Get-U32 $Bytes ($end+12))
  Require ((Get-U16 $Bytes ($end+4)) -eq 0 -and (Get-U16 $Bytes ($end+6)) -eq 0 -and (Get-U16 $Bytes ($end+8)) -eq $count) 'SINGLE_DISK_ZIP'
  Require ($count -le $maxCount -and $count -ne 65535 -and $start -ne [uint32]::MaxValue -and $size -ne [uint32]::MaxValue) 'CLASSIC_ZIP_BOUND'
  Require ($start+$size -eq $end -and ($count -eq 0 -or (Get-U32 $Bytes 0) -eq 0x04034b50)) 'ZIP_LAYOUT'
  $headers=[Collections.Generic.List[object]]::new();$at=$start
  for($i=0;$i -lt $count;$i++){
    Require ((Get-U32 $Bytes $at) -eq 0x02014b50) 'ZIP_CENTRAL_HEADER'
    $flags=Get-U16 $Bytes ($at+8);$method=Get-U16 $Bytes ($at+10)
    Require (($flags -band 1) -eq 0 -and ($flags -band (0xffff -bxor 0x080e)) -eq 0) 'ZIP_ENCRYPTION_OR_FLAGS'
    Require ($method -eq 0 -or $method -eq 8) 'ZIP_STORAGE_METHOD'
    $compressed=[long](Get-U32 $Bytes ($at+20));$length=[long](Get-U32 $Bytes ($at+24))
    $nameBytes=Get-U16 $Bytes ($at+28);$extraBytes=Get-U16 $Bytes ($at+30);$commentBytes=Get-U16 $Bytes ($at+32)
    $local=[long](Get-U32 $Bytes ($at+42));$next=$at+46+$nameBytes+$extraBytes+$commentBytes
    Require ($next -le $end -and $length -le $maxMember -and $compressed -le $Maximum -and (Get-U16 $Bytes ($at+34)) -eq 0) 'ZIP_ENTRY_BOUND'
    Require ($local -lt $start -and (Get-U32 $Bytes $local) -eq 0x04034b50) 'ZIP_LOCAL_HEADER'
    Require ((Get-U16 $Bytes ($local+6)) -eq $flags -and (Get-U16 $Bytes ($local+8)) -eq $method) 'ZIP_LOCAL_IDENTITY'
    $dataAt=$local+30+(Get-U16 $Bytes ($local+26))+(Get-U16 $Bytes ($local+28))
    Require ($dataAt -le $start -and $dataAt+$compressed -le $start) 'ZIP_PAYLOAD_BOUND'
    $external=[long](Get-U32 $Bytes ($at+38));$kind=($external -shr 16) -band 0xf000
    Require ($kind -eq 0 -or $kind -eq 0x8000 -or $kind -eq 0x4000) 'ZIP_SPECIAL_ENTRY'
    Require (($external -band 0x400) -eq 0) 'ZIP_REPARSE_ENTRY'
    $headers.Add([ordered]@{method=[int]$method;flags=[int]$flags;bytes=$length;compressedBytes=$compressed;storedCRC32=('{0:x8}' -f (Get-U32 $Bytes ($at+16)))})
    $at=$next
  }
  Require ($at -eq $end) 'ZIP_CENTRAL_TRAILING_BYTES'
  return ,$headers.ToArray()
}
function Read-ZipMember($Entry,[long]$Maximum){
  Require ($Entry.Length -ge 0 -and $Entry.Length -le $Maximum) 'READ_MEMBER_BOUND'
  $stream=$Entry.Open();$memory=[IO.MemoryStream]::new();$buffer=[byte[]]::new(65536)
  try{
    while(($got=$stream.Read($buffer,0,$buffer.Length)) -gt 0){
      Require ($memory.Length+$got -le $Maximum) 'READ_STREAM_BOUND'
      $memory.Write($buffer,0,$got)
    }
    Require ($memory.Length -eq $Entry.Length) 'READ_DECLARED_LENGTH'
    return ,$memory.ToArray()
  }finally{$stream.Dispose();$memory.Dispose()}
}
function Scan-ProfilePath([byte[]]$Bytes,[string]$Member,[string]$Role){
  # This is a generic frozen-corpus privacy filter, not a universal secret detector.
  # Text is strict UTF with BOM awareness; opaque bytes get Latin1 and NUL-free scan views.
  $textLike=$Member -match '\.(json|jsonl|txt|md|mjs|js|ps1|yml|yaml|html|h|hpp|c|cpp|css|svg|xml|toml|csv)$'
  $view=$null
  if($Bytes.Length -ge 4 -and $Bytes[0] -eq 0xff -and $Bytes[1] -eq 0xfe -and $Bytes[2] -eq 0 -and $Bytes[3] -eq 0){$view=[Text.UTF32Encoding]::new($false,$true,$true).GetString($Bytes,4,$Bytes.Length-4)}
  elseif($Bytes.Length -ge 4 -and $Bytes[0] -eq 0 -and $Bytes[1] -eq 0 -and $Bytes[2] -eq 0xfe -and $Bytes[3] -eq 0xff){$view=[Text.UTF32Encoding]::new($true,$true,$true).GetString($Bytes,4,$Bytes.Length-4)}
  elseif($Bytes.Length -ge 2 -and $Bytes[0] -eq 0xff -and $Bytes[1] -eq 0xfe){$view=[Text.UnicodeEncoding]::new($false,$true,$true).GetString($Bytes,2,$Bytes.Length-2)}
  elseif($Bytes.Length -ge 2 -and $Bytes[0] -eq 0xfe -and $Bytes[1] -eq 0xff){$view=[Text.UnicodeEncoding]::new($true,$true,$true).GetString($Bytes,2,$Bytes.Length-2)}
  elseif($textLike){$offset=if($Bytes.Length -ge 3 -and $Bytes[0] -eq 0xef -and $Bytes[1] -eq 0xbb -and $Bytes[2] -eq 0xbf){3}else{0};$view=$utf8.GetString($Bytes,$offset,$Bytes.Length-$offset);Require (-not $view.Contains([char]0)) 'TEXT_ENCODING_NUL'}
  else{$view=[Text.Encoding]::Latin1.GetString($Bytes).Replace([string][char]0,'')}
  # Collapse escaped slash/backslash runs in a scan view only. Kept bytes are never edited.
  $view=[regex]::Replace($view.Replace('\','/'),'/+','/')
  $pattern='(?i)(?:(?<drive>[a-z]):/Users/|(?<![a-z0-9:])/(?:home|Users)/)(?<principal>[^/\s"''<>:{}\[\],;|?*]+)'
  $matches=[regex]::Matches($view,$pattern)
  foreach($match in $matches){
    # Only the runner exception gets this boundary guard; generic matches remain detected.
    # ASCII47/34 are slash and double quote. Whitespace and apostrophe fail closed.
    $profileEnd=$match.Index+$match.Length
    $allowBoundary=($profileEnd -eq $view.Length)
    if($profileEnd -lt $view.Length){$allowBoundary=([int]$view[$profileEnd] -in @(47,34))}
    $allow=($Role -ceq 'finite' -and $Member -ceq 'archive-finite.stdout.txt' -and $match.Groups['drive'].Value -ieq 'C' -and $match.Groups['principal'].Value -imatch '^(runneradmin|RUNNER~1)$' -and $allowBoundary)
    if(-not $allow){return $true}
  }
  return $false
}
function Http-Bytes($Client,[string]$URL,[long]$Maximum,[int]$Seconds,[bool]$API=$false){
  $uri=[uri]$URL
  Require ($uri.Scheme -ceq 'https' -and $uri.Port -eq 443 -and $uri.UserInfo -ceq '') 'HTTPS_URL'
  if($API){Require ($uri.Host -ceq 'api.github.com' -and $uri.AbsolutePath.StartsWith('/repos/'+$repo+'/')) 'API_ORIGIN';$script:apiCalls++}
  else{Require ($uri.Host -cmatch '^productionresultssa[0-9]+\.blob\.core\.windows\.net$') 'ARTIFACT_HOST';$script:downloadCalls++}
  $cts=[Threading.CancellationTokenSource]::new([TimeSpan]::FromSeconds($Seconds));$response=$null;$stream=$null;$memory=[IO.MemoryStream]::new()
  try{
    $response=$Client.GetAsync($uri,[Net.Http.HttpCompletionOption]::ResponseHeadersRead,$cts.Token).GetAwaiter().GetResult()
    Require ([int]$response.StatusCode -eq 200) 'HTTP_STATUS'
    $declaredLength=$response.Content.Headers.ContentLength
    if($null -ne $declaredLength){Require ($declaredLength -le $Maximum) 'HTTP_DECLARED_BOUND'}
    $stream=$response.Content.ReadAsStreamAsync($cts.Token).GetAwaiter().GetResult();$buffer=[byte[]]::new(65536)
    while(($got=$stream.ReadAsync($buffer,0,$buffer.Length,$cts.Token).GetAwaiter().GetResult()) -gt 0){Require ($memory.Length+$got -le $Maximum) 'HTTP_STREAM_BOUND';$memory.Write($buffer,0,$got)}
    return ,$memory.ToArray()
  }finally{if($stream){$stream.Dispose()};if($response){$response.Dispose()};$memory.Dispose();$cts.Dispose()}
}
function API-JSON([string]$Path){$bytes=Http-Bytes $script:apiClient ('https://api.github.com/repos/'+$repo+'/'+$Path) 2MB 30 $true;return ($utf8.GetString($bytes)|ConvertFrom-Json -AsHashtable -Depth 80)}
function Download-Artifact([string]$ID){
  $url='https://api.github.com/repos/'+$repo+'/actions/artifacts/'+$ID+'/zip'
  $cts=[Threading.CancellationTokenSource]::new([TimeSpan]::FromSeconds(30));$response=$null
  try{
    $script:apiCalls++
    $response=$script:apiClient.GetAsync($url,[Net.Http.HttpCompletionOption]::ResponseHeadersRead,$cts.Token).GetAwaiter().GetResult()
    Require ([int]$response.StatusCode -eq 302) 'ARTIFACT_REDIRECT_STATUS'
    $location=$response.Headers.Location
    Require ($null -ne $location -and $location.IsAbsoluteUri -and $location.Scheme -ceq 'https' -and $location.Port -eq 443 -and $location.UserInfo -ceq '' -and $location.Host -cmatch '^productionresultssa[0-9]+\.blob\.core\.windows\.net$') 'ARTIFACT_REDIRECT_ORIGIN'
    # The second client has no token. Never persist the signed path or query.
    return ,(Http-Bytes $script:downloadClient $location.AbsoluteUri $maxOuter 120 $false)
  }finally{if($response){$response.Dispose()};$cts.Dispose()}
}

Require ($env:GITHUB_REPOSITORY -ceq $repo -and $env:GITHUB_REF -ceq $branch) 'REPOSITORY_BRANCH'
Require ($env:GITHUB_SHA -cmatch '^[0-9a-f]{40}$' -and $env:GITHUB_WORKFLOW_SHA -ceq $env:GITHUB_SHA) 'ACTUAL_WORKFLOW_SOURCE'
Require ($env:RUNNER_ENVIRONMENT -ceq 'github-hosted' -and $env:RUNNER_OS -ceq 'Windows' -and $env:RUNNER_ARCH -ceq 'X64') 'HOSTED_RUNTIME'
Require ($env:GITHUB_RUN_ID -cmatch '^[0-9]+$' -and $env:GITHUB_RUN_ATTEMPT -cmatch '^[1-9][0-9]*$' -and $env:GITHUB_JOB -ceq 'export') 'RUN_IDENTITY'
Require ($env:GH_TOKEN -and $env:GH_TOKEN.Length -ge 20) 'EPHEMERAL_TOKEN'
Require ($ExpectedInputsSHA256 -cmatch '^[0-9a-f]{64}$') 'INPUT_PIN_FORMAT'
$inputPath=Assert-Plain $Inputs $false
Require ((Get-Item -LiteralPath $inputPath).Length -le 2MB -and (Hash-File $inputPath) -ceq $ExpectedInputsSHA256) 'INPUT_PIN'
$document=Get-Content -LiteralPath $inputPath -Raw -Encoding utf8|ConvertFrom-Json -AsHashtable -Depth 80
Has-Keys $document @('schema','repository','publicationParent','privacyRuleID','artifacts')
Require ($document.schema -ceq 'rea-archive-zip-aes-public-export-inputs/v1' -and $document.repository -ceq $repo -and $document.publicationParent -ceq $parent -and $document.privacyRuleID -ceq 'absolute-user-profile-path-whole-member-v1') 'INPUT_SCHEMA'
Require (@($document.artifacts).Count -eq 6) 'SIX_INPUTS'
$runnerTemp=Assert-Plain $env:RUNNER_TEMP $true
$evidencePath=[IO.Path]::GetFullPath($Evidence)
Require ([IO.Path]::GetDirectoryName($evidencePath) -ieq $runnerTemp.TrimEnd([char[]]@('\','/')) -and [IO.Path]::GetFileName($evidencePath) -ceq ('rea-archive-zip-aes-public-export-'+$env:GITHUB_RUN_ID+'-'+$env:GITHUB_RUN_ATTEMPT)) 'EVIDENCE_LOCATION'
Assert-Plain $evidencePath $true|Out-Null
Require (Test-Path -LiteralPath (Join-Path $evidencePath 'source-before.json')) 'BEFORE_ADMISSION_REQUIRED'
foreach($name in @('exports','trees','manifests')){New-Directory (Join-Path $evidencePath $name)}
$handler=[Net.Http.HttpClientHandler]::new();$handler.AllowAutoRedirect=$false
$script:apiClient=[Net.Http.HttpClient]::new($handler);$script:apiClient.Timeout=[TimeSpan]::FromSeconds(150)
$script:apiClient.DefaultRequestHeaders.UserAgent.ParseAdd('rea-archive-zip-aes-public-export/1')
$script:apiClient.DefaultRequestHeaders.Accept.ParseAdd('application/vnd.github+json')
$script:apiClient.DefaultRequestHeaders.Add('X-GitHub-Api-Version','2022-11-28')
$script:apiClient.DefaultRequestHeaders.Authorization=[Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer',$env:GH_TOKEN)
$downloadHandler=[Net.Http.HttpClientHandler]::new();$downloadHandler.AllowAutoRedirect=$false
$script:downloadClient=[Net.Http.HttpClient]::new($downloadHandler);$script:downloadClient.Timeout=[TimeSpan]::FromSeconds(150)
$allRetained=[Collections.Generic.List[object]]::new();$allOmitted=[Collections.Generic.List[object]]::new();$provenance=[Collections.Generic.List[object]]::new()
$validated=[Collections.Generic.List[object]]::new()
$success=$false
try{
  $script:stage='export-host-api-identity'
  $currentRun=API-JSON ('actions/runs/'+$env:GITHUB_RUN_ID)
  Require ([string]$currentRun.id -ceq $env:GITHUB_RUN_ID -and [string]$currentRun.run_attempt -ceq $env:GITHUB_RUN_ATTEMPT -and $currentRun.head_sha -ceq $env:GITHUB_SHA -and $currentRun.path -ceq '.github/workflows/archive-zip-aes-public-export.yml') 'CURRENT_RUN_API'
  $jobs=API-JSON ('actions/runs/'+$env:GITHUB_RUN_ID+'/attempts/'+$env:GITHUB_RUN_ATTEMPT+'/jobs?per_page=100')
  Require ($jobs.total_count -eq 1 -and @($jobs.jobs).Count -eq 1) 'ONE_CURRENT_JOB'
  $currentJob=$jobs.jobs[0]
  Require ($currentJob.name -ceq 'Archive ZIP AES public export' -and $currentJob.head_sha -ceq $env:GITHUB_SHA -and [string]$currentJob.run_id -ceq $env:GITHUB_RUN_ID -and [string]$currentJob.run_attempt -ceq $env:GITHUB_RUN_ATTEMPT) 'CURRENT_JOB_IDENTITY'
  Require ($currentJob.runner_group_name -ceq 'GitHub Actions' -and $currentJob.runner_name -cmatch '^GitHub Actions [0-9]+$' -and @($currentJob.labels).Count -eq 1 -and $currentJob.labels[0] -ceq 'windows-2022') 'CURRENT_JOB_HOSTED_RUNNER'
  $seenArtifacts=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $seenRoles=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $totalMembers=0;$totalOriginalBytes=0L;$totalOmittedBytes=0L
  foreach($artifact in $document.artifacts){
    $script:stage='input-contract'
    Has-Keys $artifact @('source','soleParent','runID','runAttempt','role','jobID','artifactID','artifactName','apiSizeInBytes','apiDigest','outer','inner','members','expectedOmissions','exportName')
    Require ($artifact.source -cin @('25c8ddea51bab236ee7e21218bc532afcc797fd6',$parent) -and $artifact.role -cin @('finite','browser','zip-original')) 'INPUT_SOURCE_ROLE'
    $isRepaired=$artifact.source -ceq $parent
    $expectedRun=if($isRepaired){'39517385265'}else{'39516207677'}
    $expectedParent=if($isRepaired){'25c8ddea51bab236ee7e21218bc532afcc797fd6'}else{'7f71cb5bbee54c1bc96611235cf905585994a6ea'}
    Require ($artifact.soleParent -ceq $expectedParent -and [string]$artifact.runID -ceq $expectedRun -and $artifact.runAttempt -eq 1) 'ORIGINAL_RUN_BINDING'
    Require ($artifact.artifactID -cmatch '^[0-9]+$' -and $artifact.jobID -cmatch '^[0-9]+$' -and $seenArtifacts.Add($artifact.artifactID) -and $seenRoles.Add($artifact.source+':'+$artifact.role)) 'DISTINCT_ARTIFACT_ROLE'
    Require ($artifact.artifactName -ceq ('archive-zip-aes-'+$artifact.role+'-'+$artifact.runID+'-1')) 'ORIGINAL_ARTIFACT_NAME'
    Require ($artifact.exportName -ceq ($artifact.source.Substring(0,12)+'-'+$artifact.role+'-privacy-filtered.zip')) 'FILTERED_EXPORT_NAME'
    Has-Keys $artifact.outer @('bytes','sha256');Has-Keys $artifact.inner @('path','bytes','sha256')
    Require ($artifact.outer.bytes -gt 0 -and $artifact.outer.bytes -le $maxOuter -and $artifact.inner.bytes -gt 0 -and $artifact.inner.bytes -le $maxInner -and $artifact.outer.sha256 -cmatch '^[0-9a-f]{64}$' -and $artifact.inner.sha256 -cmatch '^[0-9a-f]{64}$') 'ORIGINAL_ZIP_PINS'
    Require ($artifact.apiSizeInBytes -eq $artifact.outer.bytes -and $artifact.apiDigest -ceq ('sha256:'+$artifact.outer.sha256)) 'ORIGINAL_API_PIN'
    Assert-MemberName $artifact.inner.path $false
    $expected=@{};$omissions=@{};$names=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    Require (@($artifact.members).Count -gt 0 -and @($artifact.members).Count -le $maxCount) 'INPUT_MEMBER_COUNT'
    foreach($member in $artifact.members){
      Has-Keys $member @('path','bytes','sha256','isDirectory')
      Require ($member.isDirectory -is [bool] -and $member.bytes -ge 0 -and $member.bytes -le $maxMember -and $member.sha256 -cmatch '^[0-9a-f]{64}$') 'INPUT_MEMBER_ROW'
      Add-Name $names $member.path $member.isDirectory
      if($member.isDirectory){Require ($member.bytes -eq 0 -and $member.sha256 -ceq $emptyHash) 'INPUT_DIRECTORY_IDENTITY'}
      $expected.Add($member.path,$member);$totalMembers++;$totalOriginalBytes+=$member.bytes
    }
    foreach($omitted in $artifact.expectedOmissions){
      Has-Keys $omitted @('path','bytes','sha256','reasonCode')
      Require ($expected.ContainsKey($omitted.path) -and -not $expected[$omitted.path].isDirectory -and $omitted.bytes -eq $expected[$omitted.path].bytes -and $omitted.sha256 -ceq $expected[$omitted.path].sha256 -and $omitted.reasonCode -ceq 'absolute-user-profile-path' -and -not $omissions.ContainsKey($omitted.path)) 'EXPECTED_OMISSION_IDENTITY'
      $omissions.Add($omitted.path,$omitted)
    }
    Require ($omissions.Count -eq 12) 'TWELVE_EXPECTED_OMISSIONS'
    $script:stage='original-control-plane'
    $apiArtifact=API-JSON ('actions/artifacts/'+$artifact.artifactID)
    $apiRun=API-JSON ('actions/runs/'+$artifact.runID)
    $apiJob=API-JSON ('actions/jobs/'+$artifact.jobID)
    Require ([string]$apiArtifact.id -ceq $artifact.artifactID -and $apiArtifact.name -ceq $artifact.artifactName -and $apiArtifact.size_in_bytes -eq $artifact.apiSizeInBytes -and $apiArtifact.digest -ceq $artifact.apiDigest -and -not $apiArtifact.expired) 'API_ARTIFACT_IDENTITY'
    Require ([string]$apiArtifact.workflow_run.id -ceq $artifact.runID -and $apiArtifact.workflow_run.head_sha -ceq $artifact.source) 'API_ARTIFACT_SOURCE'
    $conclusion=if(-not $isRepaired -and $artifact.role -ceq 'zip-original'){'failure'}else{'success'}
    $runConclusion=if($isRepaired){'success'}else{'failure'}
    Require ([string]$apiRun.id -ceq $artifact.runID -and $apiRun.run_attempt -eq 1 -and $apiRun.head_sha -ceq $artifact.source -and $apiRun.status -ceq 'completed' -and $apiRun.conclusion -ceq $runConclusion -and $apiRun.path -ceq '.github/workflows/archive-zip-aes-cloud.yml') 'API_ORIGINAL_RUN'
    Require ([string]$apiJob.id -ceq $artifact.jobID -and [string]$apiJob.run_id -ceq $artifact.runID -and $apiJob.run_attempt -eq 1 -and $apiJob.head_sha -ceq $artifact.source -and $apiJob.name -ceq ('Archive ZIP AES / '+$artifact.role) -and $apiJob.status -ceq 'completed' -and $apiJob.conclusion -ceq $conclusion) 'API_ORIGINAL_JOB'
    Require ($apiJob.runner_group_name -ceq 'GitHub Actions' -and $apiJob.runner_name -cmatch '^GitHub Actions [0-9]+$' -and @($apiJob.labels).Count -eq 1 -and $apiJob.labels[0] -ceq 'windows-2022') 'API_ORIGINAL_RUNNER'
    $script:stage='original-outer-authentication'
    $outer=Download-Artifact $artifact.artifactID
    Require ($outer.LongLength -eq $artifact.outer.bytes -and (Hash-Bytes $outer) -ceq $artifact.outer.sha256) 'DOWNLOADED_OUTER_IDENTITY'
    $outerHeaders=Inspect-ZipHeaders $outer $maxOuter
    Require ($outerHeaders.Count -eq 1) 'ONE_ORIGINAL_INNER'
    $outerStream=[IO.MemoryStream]::new($outer,$false);$outerZip=[IO.Compression.ZipArchive]::new($outerStream,[IO.Compression.ZipArchiveMode]::Read,$false)
    try{
      Require ($outerZip.Entries.Count -eq 1 -and $outerZip.Entries[0].FullName -ceq $artifact.inner.path -and $outerZip.Entries[0].Length -eq $artifact.inner.bytes) 'ORIGINAL_INNER_ENTRY'
      $inner=Read-ZipMember $outerZip.Entries[0] $maxInner
    }finally{$outerZip.Dispose();$outerStream.Dispose()}
    Require ($inner.LongLength -eq $artifact.inner.bytes -and (Hash-Bytes $inner) -ceq $artifact.inner.sha256) 'ORIGINAL_INNER_IDENTITY'
    $script:stage='original-member-authentication-and-filter'
    $headers=Inspect-ZipHeaders $inner $maxInner
    $innerStream=[IO.MemoryStream]::new($inner,$false);$innerZip=[IO.Compression.ZipArchive]::new($innerStream,[IO.Compression.ZipArchiveMode]::Read,$false)
    $retained=[Collections.Generic.List[object]]::new();$omittedRows=[Collections.Generic.List[object]]::new();$observed=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    $retainedData=@{}
    try{
      Require ($innerZip.Entries.Count -eq $expected.Count -and $headers.Count -eq $expected.Count) 'EXACT_ORIGINAL_MEMBER_COUNT'
      for($index=0;$index -lt $innerZip.Entries.Count;$index++){
        $entry=$innerZip.Entries[$index];$directory=$entry.FullName.EndsWith('/')
        Add-Name $observed $entry.FullName $directory
        Require ($expected.ContainsKey($entry.FullName)) 'UNEXPECTED_ORIGINAL_MEMBER'
        $row=$expected[$entry.FullName];$header=$headers[$index]
        Require ($directory -eq $row.isDirectory -and $entry.Length -eq $row.bytes -and $header.bytes -eq $row.bytes -and $entry.CompressedLength -eq $header.compressedBytes) 'ORIGINAL_MEMBER_METADATA'
        [byte[]]$bytes=Read-ZipMember $entry $maxMember;$script:memberReads++;$script:expandedBytes+=$bytes.LongLength
        Require ($null -ne $bytes) 'PRESERVED_EMPTY_ORIGINAL_BUFFER'
        Require ($script:expandedBytes -le $maxExpanded -and (Hash-Bytes $bytes) -ceq $row.sha256) 'ORIGINAL_MEMBER_SHA256'
        $omit=if($directory){$false}else{Scan-ProfilePath $bytes $entry.FullName $artifact.role}
        Require ($omit -eq $omissions.ContainsKey($entry.FullName)) 'EXACT_COMPUTED_OMISSION_SET'
        $identity=[ordered]@{artifactID=$artifact.artifactID;source=$artifact.source;role=$artifact.role;member=$entry.FullName;bytes=$row.bytes;sha256=$row.sha256;isDirectory=$directory}
        if($omit){
          $item=[ordered]@{};foreach($key in $identity.Keys){$item[$key]=$identity[$key]};$item.decision='omitted-whole-member';$item.reasonCode='absolute-user-profile-path'
          $omittedRows.Add($item);$allOmitted.Add($item);$totalOmittedBytes+=$row.bytes
        }else{
          $item=[ordered]@{};foreach($key in $identity.Keys){$item[$key]=$identity[$key]};$item.decision='retained-byte-exact';$item.storedOriginalCRC32=$header.storedCRC32
          $retained.Add($item);$allRetained.Add($item)
          $script:stagedRetainedBytes+=$bytes.LongLength
          Require ($script:stagedRetainedBytes -le 32MB) 'RETAINED_MEMORY_BOUND'
          $retainedData.Add($entry.FullName,[byte[]]$bytes)
        }
      }
      Require ($observed.Count -eq $expected.Count -and $omittedRows.Count -eq 12) 'ALL_ORIGINAL_MEMBERS_DECIDED'
    }finally{$innerZip.Dispose();$innerStream.Dispose()}
    $validated.Add([ordered]@{artifact=$artifact;retained=$retained.ToArray();retainedData=$retainedData;omittedRows=$omittedRows.ToArray();conclusion=$conclusion;runnerName=$apiJob.runner_name;runnerGroup=$apiJob.runner_group_name;runnerLabels=@($apiJob.labels)})
    $outer=$null;$inner=$null
  }
  $script:stage='complete-six-input-admission-before-any-member-copy'
  Require ($totalMembers -eq 2452 -and $totalOriginalBytes -eq 26064306 -and $allOmitted.Count -eq 72 -and $totalOmittedBytes -eq 1395804 -and $allRetained.Count -eq 2380) 'FROZEN_CORPUS_TOTALS'
  Require ($seenRoles.Count -eq 6 -and $script:downloadCalls -eq 6 -and $validated.Count -eq 6) 'SIX_DOWNLOADS_AND_ROLES'
  foreach($admitted in $validated){
    $artifact=$admitted.artifact;$retained=@($admitted.retained);$omittedRows=@($admitted.omittedRows);$retainedData=$admitted.retainedData
    $script:stage='copy-fully-admitted-permitted-tree'
    $tree=Join-Path (Join-Path $evidencePath 'trees') $artifact.exportName.Substring(0,$artifact.exportName.Length-4)
    New-Directory $tree
    foreach($item in $retained){
      $target=Child-Path $tree $item.member.TrimEnd('/')
      if($item.isDirectory){if(-not (Test-Path -LiteralPath $target)){[IO.Directory]::CreateDirectory($target)|Out-Null};Assert-Plain $target $true|Out-Null}
      else{Ensure-Parents $tree $target;Write-NewBytes $target ([byte[]]$retainedData[$item.member])}
    }
    $script:stage='create-new-filtered-export'
    $exportPath=Join-Path (Join-Path $evidencePath 'exports') $artifact.exportName
    $outStream=[IO.File]::Open($exportPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
    $outZip=[IO.Compression.ZipArchive]::new($outStream,[IO.Compression.ZipArchiveMode]::Create,$true)
    try{
      foreach($item in $retained){
        $created=$outZip.CreateEntry($item.member,[IO.Compression.CompressionLevel]::Optimal)
        $created.LastWriteTime=[DateTimeOffset]::new(2000,1,1,0,0,0,[TimeSpan]::Zero)
        $created.ExternalAttributes=if($item.isDirectory){16}else{0}
        if(-not $item.isDirectory){
          $saved=Child-Path $tree $item.member;Assert-Plain $saved $false|Out-Null
          Require ((Get-Item -LiteralPath $saved).Length -eq $item.bytes -and (Hash-File $saved) -ceq $item.sha256) 'TREE_PREEXPORT_IDENTITY'
          $file=[IO.File]::OpenRead($saved);$entryStream=$created.Open()
          try{$file.CopyTo($entryStream,65536)}finally{$entryStream.Dispose();$file.Dispose()}
        }
      }
    }finally{$outZip.Dispose();$outStream.Flush($true);$outStream.Dispose()}
    $script:stage='reopen-new-filtered-export'
    Assert-Plain $exportPath $false|Out-Null
    Require ((Get-Item -LiteralPath $exportPath).Length -le $maxInner) 'FILTERED_ZIP_BOUND'
    $newBytes=[IO.File]::ReadAllBytes($exportPath);$newHeaders=Inspect-ZipHeaders $newBytes $maxInner
    $newStream=[IO.MemoryStream]::new($newBytes,$false);$newZip=[IO.Compression.ZipArchive]::new($newStream,[IO.Compression.ZipArchiveMode]::Read,$false)
    $newNames=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase);$keptByName=@{}
    foreach($item in $retained){$keptByName.Add($item.member,$item)}
    try{
      Require ($newZip.Entries.Count -eq $retained.Count -and $newHeaders.Count -eq $retained.Count) 'FILTERED_EXACT_MEMBER_COUNT'
      for($index=0;$index -lt $newZip.Entries.Count;$index++){
        $entry=$newZip.Entries[$index];$directory=$entry.FullName.EndsWith('/');Add-Name $newNames $entry.FullName $directory
        Require ($keptByName.ContainsKey($entry.FullName) -and -not $omissions.ContainsKey($entry.FullName)) 'FILTERED_EXACT_MEMBER_SET'
        $kept=$keptByName[$entry.FullName];[byte[]]$bytes=Read-ZipMember $entry $maxMember;$script:exportReads++
        Require ($null -ne $bytes) 'PRESERVED_EMPTY_EXPORTED_BUFFER'
        Require ($directory -eq $kept.isDirectory -and $bytes.LongLength -eq $kept.bytes -and (Hash-Bytes $bytes) -ceq $kept.sha256) 'FILTERED_MEMBER_READBACK'
        Require ($newHeaders[$index].storedCRC32 -ceq $kept.storedOriginalCRC32) 'FILTERED_STORED_CRC_AGREEMENT'
        Require ($directory -or -not (Scan-ProfilePath $bytes $entry.FullName $artifact.role)) 'FILTERED_PROFILE_RESCAN'
      }
      Require ($newNames.Count -eq $retained.Count) 'FILTERED_DISTINCT_MEMBERS'
    }finally{$newZip.Dispose();$newStream.Dispose()}
    $provenance.Add([ordered]@{
      source=$artifact.source;soleParent=$artifact.soleParent;runID=$artifact.runID;runAttempt=1;role=$artifact.role;jobID=$artifact.jobID;jobConclusion=$admitted.conclusion
      originalArtifact=[ordered]@{id=$artifact.artifactID;name=$artifact.artifactName;apiSizeInBytes=$artifact.apiSizeInBytes;apiDigest=$artifact.apiDigest;outer=$artifact.outer;inner=$artifact.inner;expired=$false}
      originalRunner=[ordered]@{name=$admitted.runnerName;group=$admitted.runnerGroup;labels=@($admitted.runnerLabels)}
      derivedExport=[ordered]@{path=('exports/'+$artifact.exportName);bytes=$newBytes.LongLength;sha256=(Hash-Bytes $newBytes);members=$retained.Count;ordinaryTree=('trees/'+[IO.Path]::GetFileNameWithoutExtension($artifact.exportName));wholeMemberOmissions=$omittedRows.Count;reopenedAndMemberSHA256Verified=$true}
      representation='privacy-filtered-derived-export';rawCompleteArchive=$false;originalBytesChanged=$false;sourceSnapshotsComplete=$false
    })
    $retainedData.Clear();$newBytes=$null
  }
  $script:stage='final-manifests'
  Write-NewJSON (Join-Path $evidencePath 'manifests/omissions.json') ([ordered]@{schema='rea-archive-zip-aes-whole-member-omissions/v1';ruleID=$document.privacyRuleID;members=$allOmitted.Count;bytes=$totalOmittedBytes;matchedValuesOrSnippetsRetained=$false;rows=$allOmitted.ToArray()})
  Write-NewJSON (Join-Path $evidencePath 'manifests/unchanged-members.json') ([ordered]@{schema='rea-archive-zip-aes-retained-members/v1';members=$allRetained.Count;bytes=($totalOriginalBytes-$totalOmittedBytes);rows=$allRetained.ToArray();allBytesUnchanged=$true})
  Write-NewJSON (Join-Path $evidencePath 'export-provenance.json') ([ordered]@{
    schema='rea-archive-zip-aes-privacy-filtered-public-export/v1';status='COMPLETE_FILTERED_EXPORT_NOT_RAW_COMPLETE_EVIDENCE'
    source=$env:GITHUB_SHA;soleParent=$parent;runID=$env:GITHUB_RUN_ID;runAttempt=$env:GITHUB_RUN_ATTEMPT;jobID=[string]$currentJob.id
    hostedRunner=[ordered]@{name=$currentJob.runner_name;group=$currentJob.runner_group_name;labels=@($currentJob.labels);os=$env:RUNNER_OS;arch=$env:RUNNER_ARCH;environment=$env:RUNNER_ENVIRONMENT;Node='24.16.0'}
    inputManifest=[ordered]@{path='products/rea-studio/experiments/archive-zip-aes-public-export/inputs.json';sha256=$ExpectedInputsSHA256}
    originalMembers=2452;originalMemberBytes=26064306;omittedMembers=72;omittedBytes=1395804;retainedMembers=2380;retainedBytes=24668502
    originalMemberReads=$script:memberReads;filteredMemberReads=$script:exportReads;originalArchiveDownloads=$script:downloadCalls;apiCalls=$script:apiCalls
    allSixOriginalMemberAndOmissionSetsAuthenticatedBeforeAnyMemberCopy=$true
    admittedRetainedMemoryBytes=$script:stagedRetainedBytes;retainedMemoryLimitBytes=32MB
    archives=$provenance.ToArray();rawCompletePublicEvidence=$false;publicSourceSnapshotsComplete=$false;sourceReceiptsRebound=$false;productTestsRerun=$false;productBuilds=0;capturedSourceImports=0;productCryptoExecutions=0
    validationScope=@('Exact original API/container/plaintext SHA256 identities and bounded .NET ZIP streams','Prior original CRC/method/encryption/path qualification is associated through immutable outer/inner hashes; no captured/custom product CRC code or independent CRC recomputation is invoked; framework ZIP writing emits its own CRC fields','New filtered exports are reopened and checked against permitted member SHA256/size/set plus stored original CRC field agreement','Byte-exact permitted ordinary trees retained separately for future readable backup without nested export reopening')
    privacyLimits=@('Generic absolute-profile rule for this frozen corpus, not a universal secret detector','Whole files are omitted; omitted values and snippets are never recorded','Only the exact finite stdout path admits the two exact GitHub runner profile components','Synthetic encrypted archives and CAS objects are retained as opaque bytes; no decryption or product parser is used')
  })
  $success=$true
}catch{
  # Deliberately do not serialize exception messages or matched text into public evidence.
  $safeCode=if($_.Exception.Message -cmatch '^PUBLIC_EXPORT_[A-Z0-9_]+$'){$_.Exception.Message}else{'UNCLASSIFIED_EXPORT_SUPPORT_FAILURE'}
  $failure=[ordered]@{schema='rea-archive-zip-aes-export-failure/v1';status='failed';stage=$script:stage;safeCode=$safeCode;exceptionType=$_.Exception.GetType().FullName;hresult=$_.Exception.HResult;completePublicExport=$false;rawCompletePublicEvidence=$false;productAcceptance=$false;source=$env:GITHUB_SHA;runID=$env:GITHUB_RUN_ID;runAttempt=$env:GITHUB_RUN_ATTEMPT}
  $failurePath=Join-Path $evidencePath 'export-failure.json'
  if(-not (Test-Path -LiteralPath $failurePath)){Write-NewJSON $failurePath $failure}
  throw 'PUBLIC_EXPORT_FAILED_CLOSED_SEE_SANITIZED_STAGE'
}finally{
  $script:apiClient.DefaultRequestHeaders.Authorization=$null
  $script:apiClient.Dispose();$script:downloadClient.Dispose();$handler.Dispose();$downloadHandler.Dispose()
}
Require $success 'NO_EXPORT_SUCCESS'
$files=@(Get-ChildItem -LiteralPath $evidencePath -Recurse -File -Force)
Require ($files.Count -le $maxCount -and ($files|Measure-Object Length -Sum).Sum -le $maxEvidenceBytes -and @($files|Where-Object{$_.Length -gt $maxMember}).Count -eq 0) 'FINAL_EVIDENCE_BOUND'
foreach($file in $files){Assert-Plain $file.FullName $false|Out-Null}
Write-Output ('COMPLETE_FILTERED_EXPORT six archives; 2380 retained members; 72 whole-member omissions; no product execution.')
