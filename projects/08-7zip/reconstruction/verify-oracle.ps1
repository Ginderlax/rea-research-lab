param([string]$DllPath=(Join-Path $PSScriptRoot '../artifacts/extra/x64/7za.dll'),[string]$CasesPath=(Join-Path $PSScriptRoot '../evidence/heldout-cases.json'),[string]$OutputPath=(Join-Path $PSScriptRoot '../evidence/heldout-oracle.json'))
$ErrorActionPreference='Stop'
Import-Module Microsoft.PowerShell.Utility
$sha=[Security.Cryptography.SHA256]::Create();$digest=[BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes([IO.Path]::GetFullPath($DllPath)))).Replace('-','').ToLowerInvariant();$sha.Dispose()
Add-Type -Path (Join-Path $PSScriptRoot 'NativeOracle.cs')
$oracle=New-Object NativeOracle ([IO.Path]::GetFullPath($DllPath))
try {
    $cases=Get-Content -LiteralPath $CasesPath -Raw | ConvertFrom-Json
    $rows=@();foreach($c in $cases){$rows+=$oracle.Read([uint32]$c.index,[uint32]$c.property)}
    [ordered]@{format_count=$oracle.Count();rows=$rows;assembly_sha256=$digest} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $OutputPath
} finally {$oracle.Dispose()}
