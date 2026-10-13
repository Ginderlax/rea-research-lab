# Synthetic finite KeePass2.61.1 group contract verification only.
# Source-composed MainForm orchestration; GPL-2.0-or-later upstream contracts.
param([Parameter(Mandatory=$true)][string]$Config)
$ErrorActionPreference='Stop';[Console]::OutputEncoding=New-Object Text.UTF8Encoding -ArgumentList $false
$cfg=Get-Content -LiteralPath $Config -Raw|ConvertFrom-Json;$oracle=[IO.Path]::GetFullPath($cfg.oracle)
$sha=[Security.Cryptography.SHA256]::Create();try{$digest=[BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes($oracle))).Replace('-','')}finally{$sha.Dispose()}
if($digest -ne '04D29636C393F0C1FC99FF739295494BE3ADEFDED93271E44591E8E300225A5A'){throw 'Pinned release mismatch.'}
[void][Reflection.Assembly]::LoadFrom($oracle);[Console]::Error.WriteLine('REA_GROUP_ASSEMBLY_LOADED_2_61_1')
function Id([string]$value){$hex=$value.Replace('-','');if($hex -notmatch '^[0-9a-f]{32}$'){throw 'Canonical synthetic UUID required.'};$bytes=New-Object byte[] 16;for($i=0;$i -lt 16;$i++){$bytes[$i]=[Convert]::ToByte($hex.Substring($i*2,2),16)};return New-Object KeePassLib.PwUuid -ArgumentList (,$bytes)}
function IdText($id){$s=[BitConverter]::ToString($id.UuidBytes).Replace('-','').ToLowerInvariant();return $s.Substring(0,8)+'-'+$s.Substring(8,4)+'-'+$s.Substring(12,4)+'-'+$s.Substring(16,4)+'-'+$s.Substring(20)}
function Utc([string]$v){return [DateTime]::Parse($v,[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::RoundtripKind).ToUniversalTime()}
function Iso($v){return $v.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ',[Globalization.CultureInfo]::InvariantCulture)}
$key=New-Object KeePassLib.Keys.CompositeKey;$key.AddUserKey((New-Object KeePassLib.Keys.KcpPassword -ArgumentList ([string]$cfg.password)));$db=New-Object KeePassLib.PwDatabase;$db.Open([KeePassLib.Serialization.IOConnectionInfo]::FromPath([string]$cfg.database),$key,$null)
$calls=[ordered]@{assemblyLoads=1;openDatabase=1;privateEnsureBin=0;privatePreviousParentGuard=0;sourceComposedDelete=0;sourceComposedRestore=0;addGroup=0;removeGroup=0;touch=0;deleteAllObjects=0;tombstoneConstructor=0;clockAssignments=0;uuidAssignments=0;saveDatabase=0;binaryRead=0;originalGUI=0;originalProgram=0};$operations=@()
foreach($op in @($cfg.operations)){
 if($null -eq $op){continue};$g=$db.RootGroup.FindGroup((Id ([string]$op.id)),$true);if($null -eq $g){throw 'Synthetic group absent.'};$parent=$g.ParentGroup;$stamp=Utc $op.now;$bin=$db.RootGroup.FindGroup($db.RecycleBinUuid,$true)
 if($op.action -eq 'delete'){
  $calls.sourceComposedDelete++;if($null -eq $parent){$operations+=@([ordered]@{action='delete';id=$op.id;refused=$true;reason='root'});continue}
  $purge=(!$db.RecycleBinEnabled -or [bool]$op.permanent -or ($null -ne $bin -and ($g -eq $bin -or $g.IsContainedIn($bin) -or $bin.IsContainedIn($g))))
  if(!$parent.Groups.Remove($g)){throw 'Original group remove failed.'};$calls.removeGroup++
  if($purge){$start=$db.DeletedObjects.UCount;$g.DeleteAllObjects($db);$calls.deleteAllObjects++;$db.DeletedObjects.Add((New-Object KeePassLib.PwDeletedObject -ArgumentList $g.Uuid,$stamp));$calls.tombstoneConstructor++;for($i=$start;$i -lt $db.DeletedObjects.UCount;$i++){$db.DeletedObjects.GetAt([uint32]$i).DeletionTime=$stamp;$calls.clockAssignments++}}
  else{
   if($null -eq $bin){$method=[KeePass.Forms.MainForm].GetMethod('EnsureRecycleBin',[Reflection.BindingFlags]'NonPublic,Static');$arguments=[object[]]@($null,$db.PSObject.BaseObject,$false);[void]$method.Invoke($null,$arguments);$bin=$arguments[0];$calls.privateEnsureBin++;$bin.Uuid=Id $cfg.binId;$db.RecycleBinUuid=$bin.Uuid;$calls.uuidAssignments+=2;foreach($property in @('CreationTime','LastModificationTime','LastAccessTime','LocationChanged','ExpiryTime')){$bin.$property=$stamp;$calls.clockAssignments++}}
   $bin.AddGroup($g,$true,$true);$calls.addGroup++;$g.PreviousParentGroup=$parent.Uuid;$g.Touch($false);$calls.touch++;$g.LocationChanged=$stamp;$g.LastAccessTime=$stamp;$calls.clockAssignments+=2;$p=$bin;while($null -ne $p){$p.LastAccessTime=$stamp;$calls.clockAssignments++;$p=$p.ParentGroup}
  }
  $operations+=@([ordered]@{action='delete';id=$op.id;refused=$false;permanent=$purge})
 }elseif($op.action -eq 'restore'){
  $calls.sourceComposedRestore++;$method=[KeePass.Forms.MainForm].GetMethod('GetPreviousParentGroupSafe',[Reflection.BindingFlags]'NonPublic,Static',$null,[Type[]]@([KeePassLib.PwGroup],[KeePassLib.PwGroup]),$null);$prev=$method.Invoke($null,[object[]]@($g.PSObject.BaseObject,$db.RootGroup));$calls.privatePreviousParentGuard++
  if($null -eq $prev){$operations+=@([ordered]@{action='restore';id=$op.id;refused=$true;reason='previous-parent'});continue}
  if(!$parent.Groups.Remove($g)){throw 'Original restore remove failed.'};$calls.removeGroup++;$prev.AddGroup($g,$true,$true);$calls.addGroup++;$g.PreviousParentGroup=$parent.Uuid;$g.LocationChanged=$stamp;$calls.clockAssignments++;$operations+=@([ordered]@{action='restore';id=$op.id;refused=$false;groupId=IdText $prev.Uuid})
 }else{throw 'Unknown synthetic operation.'}
}
if($cfg.save -eq $true){$db.Save($null);$calls.saveDatabase++;$db.Close();$db=New-Object KeePassLib.PwDatabase;$db.Open([KeePassLib.Serialization.IOConnectionInfo]::FromPath([string]$cfg.database),$key,$null);$calls.openDatabase++}
function GroupRows($g){$rows=@([ordered]@{id=IdText $g.Uuid;parent=if($null -ne $g.ParentGroup){IdText $g.ParentGroup.Uuid}else{$null};previous=IdText $g.PreviousParentGroup;name=$g.Name;notes=$g.Notes;access=Iso $g.LastAccessTime;modified=Iso $g.LastModificationTime;location=Iso $g.LocationChanged;usage=[string]$g.UsageCount});foreach($child in $g.Groups){$rows+=@(GroupRows $child)};return $rows}
$entries=@();foreach($e in $db.RootGroup.GetEntries($true)){$history=@();foreach($h in $e.History){$history+=@([ordered]@{title=$h.Strings.ReadSafe('Title');password=$h.Strings.ReadSafe('Password');modified=Iso $h.LastModificationTime})};$binaries=@();foreach($pair in $e.Binaries){$binaries+=@([ordered]@{name=$pair.Key;base64=[Convert]::ToBase64String($pair.Value.ReadData());protected=$pair.Value.IsProtected});$calls.binaryRead++};$entries+=@([ordered]@{id=IdText $e.Uuid;parent=IdText $e.ParentGroup.Uuid;previous=IdText $e.PreviousParentGroup;title=$e.Strings.ReadSafe('Title');password=$e.Strings.ReadSafe('Password');access=Iso $e.LastAccessTime;modified=Iso $e.LastModificationTime;location=Iso $e.LocationChanged;usage=[string]$e.UsageCount;history=$history;binaries=$binaries})}
$deleted=@();foreach($d in $db.DeletedObjects){$deleted+=@([ordered]@{id=IdText $d.Uuid;time=Iso $d.DeletionTime})};$version=[BitConverter]::ToUInt32([IO.File]::ReadAllBytes([string]$cfg.database),8);$value=[ordered]@{release='2.61.1';version=$version;binUuid=IdText $db.RecycleBinUuid;groups=@(GroupRows $db.RootGroup);entries=$entries;deleted=$deleted;operations=$operations;calls=$calls;scope='Actual released managed library/private helpers with source-composed group command orchestration, bounded synthetic fixture UUID/clock adapters. No original GUI/full program.'};$db.Close();$value|ConvertTo-Json -Depth 32 -Compress
