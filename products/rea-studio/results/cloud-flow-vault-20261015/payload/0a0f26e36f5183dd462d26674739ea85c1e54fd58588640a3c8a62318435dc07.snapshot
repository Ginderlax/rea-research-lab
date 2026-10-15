param([Parameter(Mandatory=$true)][string]$Config)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding -ArgumentList $false
$cfg = Get-Content -LiteralPath $Config -Raw | ConvertFrom-Json
$oracle = [IO.Path]::GetFullPath($cfg.oracle)
$hasher = [Security.Cryptography.SHA256]::Create()
try { $hash = [BitConverter]::ToString($hasher.ComputeHash([IO.File]::ReadAllBytes($oracle))).Replace('-','') } finally { $hasher.Dispose() }
if ($hash -ne '04D29636C393F0C1FC99FF739295494BE3ADEFDED93271E44591E8E300225A5A') { throw 'The independently preserved KeePass 2.61.1 oracle hash does not match.' }
$assembly = [Reflection.Assembly]::LoadFrom($oracle)
$key = New-Object KeePassLib.Keys.CompositeKey
if ($cfg.usePassword -ne $false) { $key.AddUserKey((New-Object KeePassLib.Keys.KcpPassword -ArgumentList ([string]$cfg.password))) }
if ($cfg.keyFile) { $key.AddUserKey((New-Object KeePassLib.Keys.KcpKeyFile -ArgumentList ([string]$cfg.keyFile))) }
$db = New-Object KeePassLib.PwDatabase
$connection = [KeePassLib.Serialization.IOConnectionInfo]::FromPath($cfg.database)
if ($cfg.mode -eq 'create') {
  $db.New($connection,$key)
  $db.Name = 'Synthetic interop database'; $db.Description = 'Original KeePass test fixture; no real credentials.'
  $db.RootGroup.Name = 'Root'; $db.RecycleBinEnabled = $false
  $parent = New-Object KeePassLib.PwGroup -ArgumentList $true,$true,'Parent',([KeePassLib.PwIcon]::Folder)
  $child = New-Object KeePassLib.PwGroup -ArgumentList $true,$true,'Child',([KeePassLib.PwIcon]::Folder)
  $parent.Notes = 'Group note retained'; $db.RootGroup.AddGroup($parent,$true); $parent.AddGroup($child,$true)
  $parent.CustomData.Set('study.group','preserve group metadata')
  $entry = New-Object KeePassLib.PwEntry -ArgumentList $true,$true
  $unicodeNote = "Synthetic note`nUnicode: " + [char]0x3BB + ' ' + [char]::ConvertFromUtf32(0x1F39B)
  foreach ($item in @(@('Title','Synthetic account'),@('UserName','synthetic-user'),@('Password','synthetic-secret'),@('URL','https://example.invalid'),@('Notes',$unicodeNote),@('CustomSecret','custom-secret'))) { $entry.Strings.Set($item[0],(New-Object KeePassLib.Security.ProtectedString -ArgumentList ($item[0] -in @('Password','CustomSecret')),$item[1])) }
  $entry.Tags.Add('study'); $entry.AutoType.DefaultSequence = '{USERNAME}{TAB}{PASSWORD}{ENTER}'
  $entry.CustomData.Set('study.entry','preserve entry metadata')
  $entry.Binaries.Set('synthetic.bin',(New-Object KeePassLib.Security.ProtectedBinary -ArgumentList $true,([byte[]](0,1,2,3,255,128,64))))
  if ($cfg.largeAttachmentBytes) {
    if ($cfg.largeAttachmentBytes -gt (12 * 1024 * 1024) -or $cfg.largeAttachmentBytes -lt 1) { throw 'Fixture attachment size is out of bounds.' }
    $large = New-Object byte[] -ArgumentList ([int]$cfg.largeAttachmentBytes)
    $entry.Binaries.Set('large-synthetic.bin',(New-Object KeePassLib.Security.ProtectedBinary -ArgumentList $false,$large))
  }
  if ($cfg.multiAttachmentCount) {
    if ($cfg.multiAttachmentCount -lt 1 -or $cfg.multiAttachmentCount -gt 3 -or $cfg.multiAttachmentBytes -lt 1 -or $cfg.multiAttachmentBytes -gt (4 * 1024 * 1024)) { throw 'Multiple fixture attachment sizes/count are out of bounds.' }
    $entry.Binaries.Clear(); $db.HistoryMaxItems = -1; $db.HistoryMaxSize = -1
    for ($index = 0; $index -lt $cfg.multiAttachmentCount; $index++) {
      $binary = New-Object byte[] -ArgumentList ([int]$cfg.multiAttachmentBytes); $binary[0] = [byte]($index + 1)
      $entry.Binaries.Set(('bounded-' + $index + '.bin'),(New-Object KeePassLib.Security.ProtectedBinary -ArgumentList $false,$binary))
    }
  }
  $entry.CreationTime = [DateTime]::SpecifyKind([DateTime]::Parse('2024-01-02T03:04:05'),[DateTimeKind]::Utc)
  $child.AddEntry($entry,$true); $entry.CreateBackup($db)
  $entry.Strings.Set('Password',(New-Object KeePassLib.Security.ProtectedString -ArgumentList $true,'synthetic-current-secret'))
  $db.CustomData.Set('study.database','preserve database metadata')
  $db.PublicCustomData.SetString('study.public','preserve public header metadata')
  $engine = if ($cfg.kdf -eq 'aes') { New-Object KeePassLib.Cryptography.KeyDerivation.AesKdf } else { $kind = if ($cfg.kdf -eq 'argon2id') { [KeePassLib.Cryptography.KeyDerivation.Argon2Type]::ID } else { [KeePassLib.Cryptography.KeyDerivation.Argon2Type]::D }; New-Object KeePassLib.Cryptography.KeyDerivation.Argon2Kdf -ArgumentList $kind }
  $db.KdfParameters = $engine.GetDefaultParameters()
  if ($cfg.kdf -eq 'aes') { $db.KdfParameters.SetUInt64('R',[uint64]100) }
  else { $db.KdfParameters.SetUInt64('I',[uint64]1); $db.KdfParameters.SetUInt64('M',[uint64](8 * 1024 * 1024)); $db.KdfParameters.SetUInt32('P',[uint32]1) }
  if ($cfg.cipher -eq 'chacha20') { $db.DataCipherUuid = New-Object KeePassLib.PwUuid -ArgumentList (,([byte[]](0xD6,0x03,0x8A,0x2B,0x8B,0x6F,0x4C,0xB5,0xA5,0x24,0x33,0x9A,0x31,0xDB,0xB5,0x9A))) }
  if ($cfg.compression -eq $false) { $db.Compression = [KeePassLib.PwCompressionAlgorithm]::None }
  if ($cfg.version -eq '3.1') { [void]$db.PublicCustomData.Remove('study.public'); [void]$db.CustomData.Remove('study.database'); [void]$parent.CustomData.Remove('study.group'); [void]$entry.CustomData.Remove('study.entry'); [void]$entry.History.GetAt(0).CustomData.Remove('study.entry') }
  if ($cfg.version) {
    $writer = New-Object KeePassLib.Serialization.KdbxFile -ArgumentList $db
    $forced = switch ($cfg.version) { '3.1' { [uint32]0x00030001 } '4.0' { [uint32]0x00040000 } '4.1' { [uint32]0x00040001 } default { throw 'Unknown fixture version.' } }
    $writer.GetType().GetField('m_uForceVersion',[Reflection.BindingFlags]'Instance,NonPublic').SetValue($writer,$forced)
    $stream = [IO.File]::Create($cfg.database)
    try { $writer.Save($stream,$null,[KeePassLib.Serialization.KdbxFormat]::Default,$null) } finally { $stream.Dispose() }
  } else { $db.Save($null) }
} elseif ($cfg.mode -eq 'read') { $db.Open($connection,$key,$null) }
else { throw 'Unknown fixture oracle mode.' }
$output = [ordered]@{ name=$db.Name; description=$db.Description; databaseCustom=$db.CustomData.Get('study.database'); publicCustom=$db.PublicCustomData.GetString('study.public'); groups=@(); entries=@() }
function Read-Group($group,$parentPath,$isRoot) {
  $groupPath = if ($isRoot) { '' } elseif ($parentPath) { $parentPath + '/' + $group.Name } else { $group.Name }
  $output.groups += [ordered]@{ path=$groupPath; uuid=[Convert]::ToBase64String($group.Uuid.UuidBytes); notes=$group.Notes; custom=$group.CustomData.Get('study.group') }
  foreach ($e in $group.Entries) {
    $fields=[ordered]@{}; foreach ($pair in $e.Strings) { $fields[$pair.Key]=$pair.Value.ReadString() }
    $binaries=[ordered]@{}; foreach ($pair in $e.Binaries) {
      $bytes = $pair.Value.ReadData()
      if ($cfg.metadataOnly) { $hasher = [Security.Cryptography.SHA256]::Create(); try { $hash = [BitConverter]::ToString($hasher.ComputeHash($bytes)).Replace('-','').ToLowerInvariant() } finally { $hasher.Dispose() }; $binaries[$pair.Key] = [ordered]@{ bytes=$bytes.Length; sha256=$hash } }
      else { $binaries[$pair.Key]=[Convert]::ToBase64String($bytes) }
    }
    $history=@(); foreach ($h in $e.History) { $history += [ordered]@{ password=$h.Strings.ReadSafe('Password'); customSecret=$h.Strings.ReadSafe('CustomSecret') } }
    $output.entries += [ordered]@{ uuid=[Convert]::ToBase64String($e.Uuid.UuidBytes); group=$groupPath; fields=$fields; binaries=$binaries; tags=@($e.Tags); autoType=$e.AutoType.DefaultSequence; custom=$e.CustomData.Get('study.entry'); history=$history; created=$e.CreationTime.ToUniversalTime().ToString('o') }
  }
  foreach ($g in $group.Groups) { Read-Group $g $groupPath $false }
}
Read-Group $db.RootGroup '' $true
$db.Close()
$output | ConvertTo-Json -Depth 20 -Compress
