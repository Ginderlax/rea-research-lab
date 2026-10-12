param([string]$AssemblyPath)
$a=[Reflection.Assembly]::LoadFrom($AssemblyPath)
$t=$a.GetType('KeePassLib.Cryptography.HmacOtp')
$opcodeMap=@{}
[Reflection.Emit.OpCodes].GetFields([Reflection.BindingFlags]'Public,Static') | ForEach-Object { $op=$_.GetValue($null); $opcodeMap[[int]$op.Value-band 65535]=$op }
foreach($m in $t.GetMethods([Reflection.BindingFlags]'Public,NonPublic,Static,DeclaredOnly')) {
'==== '+$m.ToString()+' token='+('0x{0:X8}' -f $m.MetadataToken)
$b=$m.GetMethodBody().GetILAsByteArray(); $i=0
while($i -lt $b.Length) {
$start=$i; $v=[int]$b[$i++]; if($v-eq 254) { $v=65024+[int]$b[$i++] }; $op=$opcodeMap[$v]; $operand=''; $kind=$op.OperandType.ToString()
switch($kind) {
'InlineNone' {}
'ShortInlineI' { $operand=[sbyte]::Parse(([int]$b[$i]-band 127).ToString()); if($b[$i]-ge128){$operand=[int]$b[$i]-256};$i++ }
'ShortInlineVar' {$operand=$b[$i++]}
'InlineVar' {$operand=[BitConverter]::ToUInt16($b,$i);$i+=2}
'InlineI' {$operand=[BitConverter]::ToInt32($b,$i);$i+=4}
'InlineI8' {$operand=[BitConverter]::ToInt64($b,$i);$i+=8}
'ShortInlineBrTarget' {$delta=[int]$b[$i++];if($delta-ge128){$delta-=256};$operand='IL_{0:X4}' -f ($i+$delta)}
'InlineBrTarget' {$delta=[BitConverter]::ToInt32($b,$i);$i+=4;$operand='IL_{0:X4}' -f ($i+$delta)}
'ShortInlineR' {$operand=[BitConverter]::ToSingle($b,$i);$i+=4}
'InlineR' {$operand=[BitConverter]::ToDouble($b,$i);$i+=8}
'InlineSwitch' {$n=[BitConverter]::ToInt32($b,$i);$i+=4;$base=$i+4*$n;$targets=@();for($k=0;$k-lt$n;$k++){$targets+=('IL_{0:X4}' -f ($base+[BitConverter]::ToInt32($b,$i)));$i+=4};$operand=$targets -join ','}
default {$token=[BitConverter]::ToInt32($b,$i);$i+=4;try {if($kind-eq'InlineString'){$operand='"'+$m.Module.ResolveString($token)+'"'}else{$operand=$m.Module.ResolveMember($token).ToString()}}catch{$operand='0x{0:X8}' -f $token}}
}
'IL_{0:X4}: {1,-15} {2}' -f $start,$op.Name,$operand
}
}
'==== Static read-only checksum table'
$t.GetFields([Reflection.BindingFlags]'NonPublic,Static') | ForEach-Object { $_.Name+': '+($_.GetValue($null)-join ',') }

