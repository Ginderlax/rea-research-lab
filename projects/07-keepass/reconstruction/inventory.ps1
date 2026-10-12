param([string]$AssemblyPath)
$a=[Reflection.Assembly]::LoadFrom($AssemblyPath)
$a.GetTypes() | Where-Object { $_.FullName -match 'Otp|Hotp|Totp|MemUtil|StrUtil' } | ForEach-Object { $_.FullName; $_.GetMethods([Reflection.BindingFlags]'Public,NonPublic,Static,DeclaredOnly') | ForEach-Object { '  '+$_.ToString() } }
