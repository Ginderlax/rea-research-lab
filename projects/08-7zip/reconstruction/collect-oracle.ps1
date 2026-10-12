param([string]$DllPath=(Join-Path $PSScriptRoot '../artifacts/extra/x64/7za.dll'),[string]$OutputPath=(Join-Path $PSScriptRoot '../evidence/native-oracle.json'))
$ErrorActionPreference='Stop'
Import-Module Microsoft.PowerShell.Utility
$sha=[Security.Cryptography.SHA256]::Create();$digest=[BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes([IO.Path]::GetFullPath($DllPath)))).Replace('-','').ToLowerInvariant();$sha.Dispose()
Add-Type -Path (Join-Path $PSScriptRoot 'NativeOracle.cs')
$oracle=New-Object NativeOracle ([IO.Path]::GetFullPath($DllPath))
try {
    $n=$oracle.Count();$rows=@()
    $indices=@(); for($i=0;$i-lt$n;$i++){$indices+=[uint32]$i}; $indices+=[uint32]$n; $indices+=[uint32]::MaxValue
    foreach($i in $indices){foreach($id in (0..14)+@([uint32]::MaxValue)){$rows+=$oracle.Read($i,[uint32]$id)}}
    [ordered]@{format_count=$n;rows=$rows;assembly_sha256=$digest;execution_scope='released DLL export calls in local process; synthetic inputs; no archives or user data'} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutputPath
} finally {$oracle.Dispose()}
