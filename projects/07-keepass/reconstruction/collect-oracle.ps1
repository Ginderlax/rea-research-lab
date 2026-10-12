param([string]$AssemblyPath=(Join-Path $PSScriptRoot '../artifacts/portable/KeePass.exe'),[string]$CasesPath=(Join-Path $PSScriptRoot '../evidence/test-cases.json'),[string]$OutputPath=(Join-Path $PSScriptRoot '../evidence/oracle-results.json'))
$ErrorActionPreference='Stop'
$sha=[Security.Cryptography.SHA256]::Create();$digest=[BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes([IO.Path]::GetFullPath($AssemblyPath)))).Replace('-','').ToLowerInvariant();$sha.Dispose()
Import-Module Microsoft.PowerShell.Utility
$a=[Reflection.Assembly]::LoadFrom([IO.Path]::GetFullPath($AssemblyPath))
$t=$a.GetType('KeePassLib.Cryptography.HmacOtp')
$method=$t.GetMethods([Reflection.BindingFlags]'Public,NonPublic,Static') | Where-Object {$_.Name-eq'Generate'-and$_.GetParameters().Length-eq6}
$totp=$t.GetMethod('GenerateTimeOtp',[Reflection.BindingFlags]'Public,NonPublic,Static')
$cases=Get-Content -LiteralPath $CasesPath -Raw | ConvertFrom-Json
$rows=@()
foreach($c in $cases) {
    $key=$null; if($null-ne$c.secret_hex) { $key=[byte[]]::new($c.secret_hex.Length/2);for($k=0;$k-lt$key.Length;$k++){$key[$k]=[Convert]::ToByte($c.secret_hex.Substring(2*$k,2),16)} }
    try {
        if($c.kind-eq'totp') {
            $utc=([DateTime]'1970-01-01T00:00:00Z').ToUniversalTime().AddSeconds([double]$c.seconds)
            $value=$totp.Invoke($null,([object[]]@($key,[Nullable[DateTime]]$utc,[uint32]$c.step,[uint32]$c.digits,$c.algorithm)))
        } else {
            $value=$method.Invoke($null,([object[]]@($key,[uint64]::Parse($c.counter),[uint32]$c.digits,[bool]$c.checksum,[int]$c.offset,$c.algorithm)))
        }
        $rows+=[ordered]@{id=$c.id;value=$value;error=$null}
    } catch {$rows+=[ordered]@{id=$c.id;value=$null;error=$_.Exception.ToString()}}
}
[ordered]@{assembly_sha256=$digest;method_token='0x0600222a';rows=$rows;execution_scope='released assembly pure OTP functions; synthetic keys; no vault data'} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $OutputPath


