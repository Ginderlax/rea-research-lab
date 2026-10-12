param([Parameter(Mandatory=$true)][string]$Config)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding -ArgumentList $false
$cfg = Get-Content -LiteralPath $Config -Raw | ConvertFrom-Json
$oracle = [IO.Path]::GetFullPath($cfg.oracle)
$sha = [Security.Cryptography.SHA256]::Create()
try { $hash = [BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes($oracle))).Replace('-','') } finally { $sha.Dispose() }
if ($hash -ne '04D29636C393F0C1FC99FF739295494BE3ADEFDED93271E44591E8E300225A5A') { throw 'KeePass2.61.1 release SHA256 mismatch before assembly load.' }
[void][Reflection.Assembly]::LoadFrom($oracle)
$key = New-Object KeePassLib.Keys.CompositeKey
$key.AddUserKey((New-Object KeePassLib.Keys.KcpPassword -ArgumentList ([string]$cfg.password)))
$db = New-Object KeePassLib.PwDatabase
$connection = [KeePassLib.Serialization.IOConnectionInfo]::FromPath($cfg.database)
function Utc([string]$s) { return [DateTime]::Parse($s,[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::RoundtripKind).ToUniversalTime() }
function Secret($e,[string]$name,[string]$value,[bool]$protect) { $e.Strings.Set($name,(New-Object KeePassLib.Security.ProtectedString -ArgumentList $protect,$value)) }
function Stamp($e,[string]$value,[bool]$modified) { $e.LastAccessTime=Utc $value; $e.UsageCount=[uint64]($e.UsageCount+1); if($modified){$e.LastModificationTime=Utc $value} }
if ($cfg.mode -eq 'create') {
  $db.New($connection,$key); $db.RootGroup.Name='Root'; $db.RecycleBinEnabled=$false
  $parent=New-Object KeePassLib.PwGroup -ArgumentList $true,$true,'Parent',([KeePassLib.PwIcon]::Folder)
  $child=New-Object KeePassLib.PwGroup -ArgumentList $true,$true,'Child',([KeePassLib.PwIcon]::Folder)
  $db.RootGroup.AddGroup($parent,$true); $parent.AddGroup($child,$true)
  $e=New-Object KeePassLib.PwEntry -ArgumentList $false,$false
  $e.Uuid=New-Object KeePassLib.PwUuid -ArgumentList (,([byte[]](0,0,0,0,0x11,0x11,0x22,0x22,0x33,0x33,0x44,0x44,0x44,0x44,0x44,0x44)))
  $child.AddEntry($e,$true)
  $unicodeNote='Unicode ' + [char]0x3BB + [char]::ConvertFromUtf32(0x1F39B)
  foreach($pair in @(@('Title','Synthetic history'),@('UserName','synthetic-user'),@('Password','synthetic-prior-secret'),@('URL','https://example.invalid/history'),@('Notes',$unicodeNote),@('CustomSecret','secret retained across history'))) { Secret $e $pair[0] $pair[1] ($pair[0] -in @('Password','CustomSecret')) }
  $e.CreationTime=Utc '2024-01-01T00:00:00Z'; $e.LastModificationTime=$e.CreationTime; $e.LastAccessTime=$e.CreationTime; $e.ExpiryTime=Utc '2030-02-03T04:05:06Z'; $e.Expires=$true; $e.UsageCount=[uint64]5; $e.LocationChanged=Utc '2023-12-20T00:00:00Z'; $e.PreviousParentGroup=$parent.Uuid
  $e.IconId=[KeePassLib.PwIcon]::Key; $e.OverrideUrl='cmd://synthetic-preserved'; $e.QualityCheck=$false
  $e.Tags.Add('study'); $e.Tags.Add('lambda' + [char]0x3BB)
  $e.AutoType.DefaultSequence='{USERNAME}{TAB}{PASSWORD}{ENTER}'; $e.AutoType.Enabled=$false
  $e.AutoType.Add((New-Object KeePassLib.Collections.AutoTypeAssociation -ArgumentList 'Synthetic window','{PASSWORD}{ENTER}'))
  $e.CustomData.Set('study.entry','preserved custom metadata'); $e.CustomData.Set('unicode' + [char]::ConvertFromUtf32(0x1F39B),'retained')
  $e.Binaries.Set('synthetic.bin',(New-Object KeePassLib.Security.ProtectedBinary -ArgumentList $true,([byte[]](0,1,2,255,128,64))))
  $e.Binaries.Set('empty.bin',(New-Object KeePassLib.Security.ProtectedBinary -ArgumentList $false,(New-Object byte[] 0)))
  $e.CreateBackup($null)
  Secret $e 'Password' 'synthetic-current-secret' $true; $e.LastModificationTime=Utc '2024-01-02T00:00:00Z'; $e.LastAccessTime=$e.LastModificationTime
  $e.CreationTime=Utc '2020-02-03T04:05:06Z'; $e.ExpiryTime=Utc '2040-02-03T04:05:06Z'; $e.Expires=$false; $e.UsageCount=[uint64]13; $e.LocationChanged=Utc '2024-01-02T08:00:00Z'; $e.PreviousParentGroup=$db.RootGroup.Uuid
  $e.IconId=[KeePassLib.PwIcon]3; $e.OverrideUrl='cmd://current-metadata'; $e.QualityCheck=$true; $e.Tags.Clear(); $e.Tags.Add('current-tag')
  $e.AutoType.DefaultSequence='{PASSWORD}'; $e.AutoType.Enabled=$true; $e.AutoType.Clear(); $e.AutoType.Add((New-Object KeePassLib.Collections.AutoTypeAssociation -ArgumentList 'Current window','{USERNAME}'))
  $e.CustomData.Set('study.entry','current custom metadata'); $e.Binaries.Set('synthetic.bin',(New-Object KeePassLib.Security.ProtectedBinary -ArgumentList $false,([byte[]](9,8,7,6))))
  $engine=New-Object KeePassLib.Cryptography.KeyDerivation.AesKdf; $db.KdfParameters=$engine.GetDefaultParameters(); $db.KdfParameters.SetUInt64('R',[uint64]100)
} else { $db.Open($connection,$key,$null); $e=$db.RootGroup.GetEntries($true).GetAt(0) }
if ($null -ne $cfg.maxItems) { $db.HistoryMaxItems=[int]$cfg.maxItems }
if ($null -ne $cfg.maxSize) { $db.HistoryMaxSize=[long]$cfg.maxSize }
foreach($operation in @($cfg.operations)) {
  if($null -eq $operation){continue}
  if($operation.action -eq 'save') {
    $changed=$false
    foreach($field in @('Title','UserName','Password','URL','Notes','REA.TOTP.Secret')) { if($null -ne $operation.fields.$field -and $e.Strings.ReadSafe($field) -cne [string]$operation.fields.$field){$changed=$true} }
    if($changed){$e.CreateBackup($null)}
    foreach($field in @('Title','UserName','Password','URL','Notes','REA.TOTP.Secret')) { if($null -ne $operation.fields.$field){Secret $e $field ([string]$operation.fields.$field) ($field -in @('Password','REA.TOTP.Secret'))} }
    Stamp $e $operation.now $changed; [void]$e.MaintainBackups($db)
  } elseif($operation.action -eq 'restore') { $e.RestoreFromBackup([uint32]$operation.index,$db); Stamp $e $operation.now $true }
  elseif($operation.action -eq 'maintain') { [void]$e.MaintainBackups($db) }
  elseif($operation.action -eq 'tags') { $e.Tags=[KeePassLib.Utility.StrUtil]::StringToTags([string]$operation.value) }
  else { throw 'Unknown bounded synthetic oracle operation.' }
}
function EntrySnapshot($item) {
  $fields=[ordered]@{}; foreach($p in $item.Strings){$fields[$p.Key]=[ordered]@{value=$p.Value.ReadString(); protected=$p.Value.IsProtected}}
  $binaries=[ordered]@{}; foreach($p in $item.Binaries){$raw=$p.Value.ReadData();$sha=[Security.Cryptography.SHA256]::Create();try{$hash=[BitConverter]::ToString($sha.ComputeHash($raw)).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()};$binaries[$p.Key]=[ordered]@{bytes=$raw.Length;sha256=$hash;protected=$p.Value.IsProtected}}
  $custom=[ordered]@{}; foreach($p in $item.CustomData){$custom[$p.Key]=$p.Value}
  $associations=@(); foreach($a in $item.AutoType.Associations){$associations+=,[ordered]@{window=$a.WindowName;sequence=$a.Sequence}}
  return [ordered]@{uuid=[Convert]::ToBase64String($item.Uuid.UuidBytes);fields=$fields;binaries=$binaries;created=$item.CreationTime.ToUniversalTime().ToString('o');modified=$item.LastModificationTime.ToUniversalTime().ToString('o');accessed=$item.LastAccessTime.ToUniversalTime().ToString('o');expiry=$item.ExpiryTime.ToUniversalTime().ToString('o');expires=$item.Expires;usage=$item.UsageCount;location=$item.LocationChanged.ToUniversalTime().ToString('o');previousParent=[Convert]::ToBase64String($item.PreviousParentGroup.UuidBytes);icon=[int]$item.IconId;customIcon=[Convert]::ToBase64String($item.CustomIconUuid.UuidBytes);foreground=$item.ForegroundColor.ToArgb();background=$item.BackgroundColor.ToArgb();override=$item.OverrideUrl;qualityCheck=$item.QualityCheck;tags=@($item.Tags);custom=$custom;autoType=[ordered]@{enabled=$item.AutoType.Enabled;obfuscation=[int]$item.AutoType.ObfuscationOptions;default=$item.AutoType.DefaultSequence;associations=$associations};size=[long]$item.GetSize();historyCount=$item.History.UCount}
}
$snap=EntrySnapshot $e; $history=@(); foreach($item in $e.History){$history+=,(EntrySnapshot $item)}
if($cfg.output -or $cfg.mode -eq 'create') {
  $target=if($cfg.output){[string]$cfg.output}else{[string]$cfg.database}
  $writer=New-Object KeePassLib.Serialization.KdbxFile -ArgumentList $db
  $writer.GetType().GetField('m_uForceVersion',[Reflection.BindingFlags]'Instance,NonPublic').SetValue($writer,[uint32]0x00040001)
  $stream=[IO.File]::Create($target);try{$writer.Save($stream,$null,[KeePassLib.Serialization.KdbxFormat]::Default,$null)}finally{$stream.Dispose()}
}
$maxItems=$db.HistoryMaxItems; $maxSize=$db.HistoryMaxSize; $db.Close()
[ordered]@{assemblySha256=$hash;mode=$cfg.mode;directMethods=@('CreateBackup','MaintainBackups','RestoreFromBackup','GetSize','KdbxFile.Save/Open');guiExecuted=$false;entry=$snap;history=$history;maxItems=$maxItems;maxSize=$maxSize} | ConvertTo-Json -Depth 30 -Compress
