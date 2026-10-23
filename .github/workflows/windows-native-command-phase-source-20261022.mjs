// Uninvoked source-only R8 candidate; independent review and root publication approval required.
// Four byte-identical original controls and ten separately pinned phase diagnostics.
// No product imports, native/product acceptance, expected-positive outcome or causal conclusion.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const PARENT='13eb681da3ea83e12560f2a2a0321b23bc28edb4';
const PARENT_PARENT='0c191480269db106c6c1b0a3f9d719de4a754bc2';
const BRANCH='refs/heads/experiment/windows-native-command-phase-probe-20261022-r8';
const SCRIPT_PATH='.github/workflows/windows-native-command-phase-source-20261022.mjs';
const WORKFLOW_PATH='.github/workflows/windows-native-command-phase-probe.yml';
const METADATA_TIMEOUT=15000, NET_TIMEOUT=20000;
const METADATA_BUFFER=64*1024*1024, NET_BUFFER=1024*1024, RESULT_CAP=131072;
const MARKER_CAP=64, MARKER_INSPECTION_CAP=65536;
const LOG_PREFIX='REA_NATIVE_COMMAND_PHASE_REPORT_V1=';
const MARKER_PREFIX='REA_NATIVE_COMMAND_PHASE_V1|';
const BODIES={
  "M-O": "\n$ErrorActionPreference = 'Stop'\n$ProgressPreference = 'SilentlyContinue'\n[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)\n[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)\n$culture = [Globalization.CultureInfo]::InvariantCulture\nfunction Stamp($date) {\n  $utc = $date.ToUniversalTime()\n  $milliseconds = ([decimal]$utc.Ticks - [decimal]621355968000000000) / [decimal]10000\n  return @{ utc = $utc.ToString(\"yyyy-MM-dd'T'HH:mm:ss.fffffff'Z'\", $culture); ms = $milliseconds.ToString('0.0000', $culture) }\n}\ntry {\n  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json -ErrorAction Stop\n  if ($request.version -ne 1 -or $null -eq $request.sources -or @($request.sources).Count -gt 10000) { throw 'request' }\n  $root = [IO.Path]::GetFullPath([string]$request.root)\n  $volume = [IO.Path]::GetPathRoot($root)\n  while ($root.Length -gt $volume.Length -and $root.EndsWith([IO.Path]::DirectorySeparatorChar)) { $root = $root.Substring(0, $root.Length - 1) }\n  if (([IO.File]::GetAttributes($root) -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'link' }\n  $prefix = $root\n  if (-not $prefix.EndsWith([IO.Path]::DirectorySeparatorChar)) { $prefix += [IO.Path]::DirectorySeparatorChar }\n  $rows = New-Object 'System.Collections.Generic.List[object]'\n  $index = 0\n  foreach ($source in @($request.sources)) {\n    $full = [IO.Path]::GetFullPath([string]$source.path)\n    if (-not $full.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'outside' }\n    # Check each current ancestor as well as the target. This supplements, rather\n    # than replaces, the application's original root-confined no-link walk.\n    $checked = $full\n    while ($true) {\n      if (([IO.File]::GetAttributes($checked) -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'link' }\n      if ([string]::Equals($checked, $root, [StringComparison]::OrdinalIgnoreCase)) { break }\n      $checked = [IO.Path]::GetDirectoryName($checked)\n      if ([string]::IsNullOrEmpty($checked)) { throw 'outside' }\n    }\n    $item = Get-Item -LiteralPath $full -Force -ErrorAction Stop\n    $item.Refresh()\n    if (-not $item.Exists -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'missing' }\n    $directory = $item -is [IO.DirectoryInfo]\n    if (-not $directory -and -not ($item -is [IO.FileInfo])) { throw 'type' }\n    if ($directory -ne [bool]$source.directory) { throw 'type' }\n    $modified = Stamp $item.LastWriteTimeUtc\n    $accessed = Stamp $item.LastAccessTimeUtc\n    $created = Stamp $item.CreationTimeUtc\n    # Both GetFullPath and FullName can expand a valid DOS short-path alias.\n    # Echo the submitted transport identity only after all native path checks.\n    $rows.Add(@{ index = $index; path = [string]$source.path; normalizedPath = $full; directory = $directory;\n      modifiedAtUtc = $modified.utc; modifiedAtMs = $modified.ms;\n      accessedAtUtc = $accessed.utc; accessedAtMs = $accessed.ms;\n      createdAtUtc = $created.utc; createdAtMs = $created.ms })\n    $index += 1\n  }\n  $response = @{ version = 1; items = @($rows.ToArray()) } | ConvertTo-Json -Compress -Depth 5\n  [Console]::Out.Write($response)\n} catch {\n  [Console]::Error.WriteLine('Native Windows source metadata failed.')\n  exit 1\n}\n",
  "N-O": "$ErrorActionPreference='Stop'\nAdd-Type -AssemblyName System.IO.Compression\nAdd-Type -AssemblyName System.IO.Compression.FileSystem\n$archivePath=Join-Path $env:REA_ZIP_TEST_DIR 'workspace/dotnet.zip'\n$localDate=[DateTime]::new(2012,3,4,0,6,8,[DateTimeKind]::Unspecified)\n$entryDate=[DateTimeOffset]::new($localDate,[TimeZoneInfo]::Local.GetUtcOffset($localDate))\n$stream=[System.IO.File]::Open($archivePath,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::ReadWrite)\n$archive=[System.IO.Compression.ZipArchive]::new($stream,[System.IO.Compression.ZipArchiveMode]::Create)\ntry{$entry=$archive.CreateEntry('a.txt');$entry.LastWriteTime=$entryDate;$writer=[System.IO.StreamWriter]::new($entry.Open());try{$writer.Write('dates')}finally{$writer.Dispose()}}finally{$archive.Dispose()}\n$destination=Join-Path $env:REA_ZIP_TEST_DIR 'dotnet-restored'\n[System.IO.Compression.ZipFile]::ExtractToDirectory($archivePath,$destination)\n@{expected=$entryDate.UtcDateTime.ToString('o');restored=(Get-Item -LiteralPath (Join-Path $destination 'a.txt')).LastWriteTimeUtc.ToString('o')}|ConvertTo-Json -Compress",
  "M-T": "$script:REA_NATIVE_PHASE_CLOCK = [Diagnostics.Stopwatch]::StartNew()\nfunction REA_NATIVE_PHASE_MARK([string]$phase) {\n  $phaseMilliseconds = [Math]::Round($script:REA_NATIVE_PHASE_CLOCK.Elapsed.TotalMilliseconds, 3).ToString('F3', [Globalization.CultureInfo]::InvariantCulture)\n  [Console]::Error.WriteLine('REA_NATIVE_COMMAND_PHASE_V1|' + $phase + '|' + $phaseMilliseconds)\n  [Console]::Error.Flush()\n}\nREA_NATIVE_PHASE_MARK 'M_BODY_ENTRY'\n\n$ErrorActionPreference = 'Stop'\n$ProgressPreference = 'SilentlyContinue'\nREA_NATIVE_PHASE_MARK 'M_INPUT_ENCODING_BEFORE'\n[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)\nREA_NATIVE_PHASE_MARK 'M_INPUT_ENCODING_AFTER'\nREA_NATIVE_PHASE_MARK 'M_OUTPUT_ENCODING_BEFORE'\n[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)\nREA_NATIVE_PHASE_MARK 'M_OUTPUT_ENCODING_AFTER'\n$culture = [Globalization.CultureInfo]::InvariantCulture\nfunction Stamp($date) {\n  $utc = $date.ToUniversalTime()\n  $milliseconds = ([decimal]$utc.Ticks - [decimal]621355968000000000) / [decimal]10000\n  return @{ utc = $utc.ToString(\"yyyy-MM-dd'T'HH:mm:ss.fffffff'Z'\", $culture); ms = $milliseconds.ToString('0.0000', $culture) }\n}\ntry {\nREA_NATIVE_PHASE_MARK 'M_STDIN_JSON_BEFORE'\n  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json -ErrorAction Stop\nREA_NATIVE_PHASE_MARK 'M_STDIN_JSON_AFTER'\n  if ($request.version -ne 1 -or $null -eq $request.sources -or @($request.sources).Count -gt 10000) { throw 'request' }\nREA_NATIVE_PHASE_MARK 'M_ROOT_PREPARATION_BEFORE'\n  $root = [IO.Path]::GetFullPath([string]$request.root)\n  $volume = [IO.Path]::GetPathRoot($root)\n  while ($root.Length -gt $volume.Length -and $root.EndsWith([IO.Path]::DirectorySeparatorChar)) { $root = $root.Substring(0, $root.Length - 1) }\n  if (([IO.File]::GetAttributes($root) -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'link' }\n  $prefix = $root\n  if (-not $prefix.EndsWith([IO.Path]::DirectorySeparatorChar)) { $prefix += [IO.Path]::DirectorySeparatorChar }\nREA_NATIVE_PHASE_MARK 'M_ROOT_PREPARATION_AFTER'\nREA_NATIVE_PHASE_MARK 'M_ROW_LIST_BEFORE'\n  $rows = New-Object 'System.Collections.Generic.List[object]'\nREA_NATIVE_PHASE_MARK 'M_ROW_LIST_AFTER'\n  $index = 0\n  foreach ($source in @($request.sources)) {\nREA_NATIVE_PHASE_MARK 'M_ITEM_PATH_BEFORE'\n    $full = [IO.Path]::GetFullPath([string]$source.path)\n    if (-not $full.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'outside' }\n    # Check each current ancestor as well as the target. This supplements, rather\n    # than replaces, the application's original root-confined no-link walk.\n    $checked = $full\n    while ($true) {\n      if (([IO.File]::GetAttributes($checked) -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'link' }\n      if ([string]::Equals($checked, $root, [StringComparison]::OrdinalIgnoreCase)) { break }\n      $checked = [IO.Path]::GetDirectoryName($checked)\n      if ([string]::IsNullOrEmpty($checked)) { throw 'outside' }\n    }\nREA_NATIVE_PHASE_MARK 'M_GET_ITEM_BEFORE'\n    $item = Get-Item -LiteralPath $full -Force -ErrorAction Stop\nREA_NATIVE_PHASE_MARK 'M_GET_ITEM_AFTER'\n    $item.Refresh()\nREA_NATIVE_PHASE_MARK 'M_REFRESH_AFTER'\n    if (-not $item.Exists -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'missing' }\n    $directory = $item -is [IO.DirectoryInfo]\n    if (-not $directory -and -not ($item -is [IO.FileInfo])) { throw 'type' }\n    if ($directory -ne [bool]$source.directory) { throw 'type' }\n    $modified = Stamp $item.LastWriteTimeUtc\n    $accessed = Stamp $item.LastAccessTimeUtc\n    $created = Stamp $item.CreationTimeUtc\nREA_NATIVE_PHASE_MARK 'M_STAMPS_AFTER'\n    # Both GetFullPath and FullName can expand a valid DOS short-path alias.\n    # Echo the submitted transport identity only after all native path checks.\n    $rows.Add(@{ index = $index; path = [string]$source.path; normalizedPath = $full; directory = $directory;\n      modifiedAtUtc = $modified.utc; modifiedAtMs = $modified.ms;\n      accessedAtUtc = $accessed.utc; accessedAtMs = $accessed.ms;\n      createdAtUtc = $created.utc; createdAtMs = $created.ms })\nREA_NATIVE_PHASE_MARK 'M_ROW_ADD_AFTER'\n    $index += 1\n  }\nREA_NATIVE_PHASE_MARK 'M_JSON_OUTPUT_BEFORE'\n  $response = @{ version = 1; items = @($rows.ToArray()) } | ConvertTo-Json -Compress -Depth 5\nREA_NATIVE_PHASE_MARK 'M_JSON_OUTPUT_AFTER'\n  [Console]::Out.Write($response)\nREA_NATIVE_PHASE_MARK 'M_STDOUT_WRITE_AFTER'\n} catch {\nREA_NATIVE_PHASE_MARK 'M_CATCH_ENTERED'\n  [Console]::Error.WriteLine('Native Windows source metadata failed.')\n  exit 1\n}\n",
  "N-T": "$script:REA_NATIVE_PHASE_CLOCK = [Diagnostics.Stopwatch]::StartNew()\nfunction REA_NATIVE_PHASE_MARK([string]$phase) {\n  $phaseMilliseconds = [Math]::Round($script:REA_NATIVE_PHASE_CLOCK.Elapsed.TotalMilliseconds, 3).ToString('F3', [Globalization.CultureInfo]::InvariantCulture)\n  [Console]::Error.WriteLine('REA_NATIVE_COMMAND_PHASE_V1|' + $phase + '|' + $phaseMilliseconds)\n  [Console]::Error.Flush()\n}\nREA_NATIVE_PHASE_MARK 'N_BODY_ENTRY'\n$ErrorActionPreference='Stop'\nREA_NATIVE_PHASE_MARK 'N_COMPRESSION_ASSEMBLY_BEFORE'\nAdd-Type -AssemblyName System.IO.Compression\nREA_NATIVE_PHASE_MARK 'N_COMPRESSION_ASSEMBLY_AFTER'\nREA_NATIVE_PHASE_MARK 'N_FILESYSTEM_ASSEMBLY_BEFORE'\nAdd-Type -AssemblyName System.IO.Compression.FileSystem\nREA_NATIVE_PHASE_MARK 'N_FILESYSTEM_ASSEMBLY_AFTER'\nREA_NATIVE_PHASE_MARK 'N_PATH_DATE_PREPARATION_BEFORE'\n$archivePath=Join-Path $env:REA_ZIP_TEST_DIR 'workspace/dotnet.zip'\n$localDate=[DateTime]::new(2012,3,4,0,6,8,[DateTimeKind]::Unspecified)\n$entryDate=[DateTimeOffset]::new($localDate,[TimeZoneInfo]::Local.GetUtcOffset($localDate))\nREA_NATIVE_PHASE_MARK 'N_PATH_DATE_PREPARATION_AFTER'\nREA_NATIVE_PHASE_MARK 'N_SYNTHETIC_ZIP_BEFORE'\n$stream=[System.IO.File]::Open($archivePath,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::ReadWrite)\n$archive=[System.IO.Compression.ZipArchive]::new($stream,[System.IO.Compression.ZipArchiveMode]::Create)\ntry{$entry=$archive.CreateEntry('a.txt');$entry.LastWriteTime=$entryDate;$writer=[System.IO.StreamWriter]::new($entry.Open());try{$writer.Write('dates')}finally{$writer.Dispose()}}finally{$archive.Dispose()}\nREA_NATIVE_PHASE_MARK 'N_SYNTHETIC_ZIP_AFTER'\n$destination=Join-Path $env:REA_ZIP_TEST_DIR 'dotnet-restored'\nREA_NATIVE_PHASE_MARK 'N_EXTRACTION_BEFORE'\n[System.IO.Compression.ZipFile]::ExtractToDirectory($archivePath,$destination)\nREA_NATIVE_PHASE_MARK 'N_EXTRACTION_AFTER'\nREA_NATIVE_PHASE_MARK 'N_FINAL_ITEM_JSON_BEFORE'\n@{expected=$entryDate.UtcDateTime.ToString('o');restored=(Get-Item -LiteralPath (Join-Path $destination 'a.txt')).LastWriteTimeUtc.ToString('o')}|ConvertTo-Json -Compress\nREA_NATIVE_PHASE_MARK 'N_FINAL_ITEM_JSON_AFTER'\n",
  "N-Q": "$script:REA_NATIVE_PHASE_CLOCK = [Diagnostics.Stopwatch]::StartNew()\nfunction REA_NATIVE_PHASE_MARK([string]$phase) {\n  $phaseMilliseconds = [Math]::Round($script:REA_NATIVE_PHASE_CLOCK.Elapsed.TotalMilliseconds, 3).ToString('F3', [Globalization.CultureInfo]::InvariantCulture)\n  [Console]::Error.WriteLine('REA_NATIVE_COMMAND_PHASE_V1|' + $phase + '|' + $phaseMilliseconds)\n  [Console]::Error.Flush()\n}\nREA_NATIVE_PHASE_MARK 'N_BODY_ENTRY'\n$ErrorActionPreference='Stop'\nREA_NATIVE_PHASE_MARK 'N_COMPRESSION_ASSEMBLY_BEFORE'\nMicrosoft.PowerShell.Utility\\Add-Type -AssemblyName System.IO.Compression\nREA_NATIVE_PHASE_MARK 'N_COMPRESSION_ASSEMBLY_AFTER'\nREA_NATIVE_PHASE_MARK 'N_FILESYSTEM_ASSEMBLY_BEFORE'\nMicrosoft.PowerShell.Utility\\Add-Type -AssemblyName System.IO.Compression.FileSystem\nREA_NATIVE_PHASE_MARK 'N_FILESYSTEM_ASSEMBLY_AFTER'\nREA_NATIVE_PHASE_MARK 'N_PATH_DATE_PREPARATION_BEFORE'\n$archivePath=Join-Path $env:REA_ZIP_TEST_DIR 'workspace/dotnet.zip'\n$localDate=[DateTime]::new(2012,3,4,0,6,8,[DateTimeKind]::Unspecified)\n$entryDate=[DateTimeOffset]::new($localDate,[TimeZoneInfo]::Local.GetUtcOffset($localDate))\nREA_NATIVE_PHASE_MARK 'N_PATH_DATE_PREPARATION_AFTER'\nREA_NATIVE_PHASE_MARK 'N_SYNTHETIC_ZIP_BEFORE'\n$stream=[System.IO.File]::Open($archivePath,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::ReadWrite)\n$archive=[System.IO.Compression.ZipArchive]::new($stream,[System.IO.Compression.ZipArchiveMode]::Create)\ntry{$entry=$archive.CreateEntry('a.txt');$entry.LastWriteTime=$entryDate;$writer=[System.IO.StreamWriter]::new($entry.Open());try{$writer.Write('dates')}finally{$writer.Dispose()}}finally{$archive.Dispose()}\nREA_NATIVE_PHASE_MARK 'N_SYNTHETIC_ZIP_AFTER'\n$destination=Join-Path $env:REA_ZIP_TEST_DIR 'dotnet-restored'\nREA_NATIVE_PHASE_MARK 'N_EXTRACTION_BEFORE'\n[System.IO.Compression.ZipFile]::ExtractToDirectory($archivePath,$destination)\nREA_NATIVE_PHASE_MARK 'N_EXTRACTION_AFTER'\nREA_NATIVE_PHASE_MARK 'N_FINAL_ITEM_JSON_BEFORE'\n@{expected=$entryDate.UtcDateTime.ToString('o');restored=(Get-Item -LiteralPath (Join-Path $destination 'a.txt')).LastWriteTimeUtc.ToString('o')}|ConvertTo-Json -Compress\nREA_NATIVE_PHASE_MARK 'N_FINAL_ITEM_JSON_AFTER'\n",
  "M-I": "$script:REA_NATIVE_PHASE_CLOCK = [Diagnostics.Stopwatch]::StartNew()\nfunction REA_NATIVE_PHASE_MARK([string]$phase) {\n  $phaseMilliseconds = [Math]::Round($script:REA_NATIVE_PHASE_CLOCK.Elapsed.TotalMilliseconds, 3).ToString('F3', [Globalization.CultureInfo]::InvariantCulture)\n  [Console]::Error.WriteLine('REA_NATIVE_COMMAND_PHASE_V1|' + $phase + '|' + $phaseMilliseconds)\n  [Console]::Error.Flush()\n}\nREA_NATIVE_PHASE_MARK 'I_PREFIX_ENTRY'\nREA_NATIVE_PHASE_MARK 'I_UTILITY_IMPORT_BEFORE'\n$REA_NATIVE_PHASE_UTILITY_MANIFEST = $env:SystemRoot + '\\System32\\WindowsPowerShell\\v1.0\\Modules\\Microsoft.PowerShell.Utility\\Microsoft.PowerShell.Utility.psd1'\nMicrosoft.PowerShell.Core\\Import-Module -Name $REA_NATIVE_PHASE_UTILITY_MANIFEST -ErrorAction Stop\nREA_NATIVE_PHASE_MARK 'I_UTILITY_IMPORT_AFTER'\n\n$ErrorActionPreference = 'Stop'\n$ProgressPreference = 'SilentlyContinue'\n[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)\n[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)\n$culture = [Globalization.CultureInfo]::InvariantCulture\nfunction Stamp($date) {\n  $utc = $date.ToUniversalTime()\n  $milliseconds = ([decimal]$utc.Ticks - [decimal]621355968000000000) / [decimal]10000\n  return @{ utc = $utc.ToString(\"yyyy-MM-dd'T'HH:mm:ss.fffffff'Z'\", $culture); ms = $milliseconds.ToString('0.0000', $culture) }\n}\ntry {\n  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json -ErrorAction Stop\n  if ($request.version -ne 1 -or $null -eq $request.sources -or @($request.sources).Count -gt 10000) { throw 'request' }\n  $root = [IO.Path]::GetFullPath([string]$request.root)\n  $volume = [IO.Path]::GetPathRoot($root)\n  while ($root.Length -gt $volume.Length -and $root.EndsWith([IO.Path]::DirectorySeparatorChar)) { $root = $root.Substring(0, $root.Length - 1) }\n  if (([IO.File]::GetAttributes($root) -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'link' }\n  $prefix = $root\n  if (-not $prefix.EndsWith([IO.Path]::DirectorySeparatorChar)) { $prefix += [IO.Path]::DirectorySeparatorChar }\n  $rows = New-Object 'System.Collections.Generic.List[object]'\n  $index = 0\n  foreach ($source in @($request.sources)) {\n    $full = [IO.Path]::GetFullPath([string]$source.path)\n    if (-not $full.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'outside' }\n    # Check each current ancestor as well as the target. This supplements, rather\n    # than replaces, the application's original root-confined no-link walk.\n    $checked = $full\n    while ($true) {\n      if (([IO.File]::GetAttributes($checked) -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'link' }\n      if ([string]::Equals($checked, $root, [StringComparison]::OrdinalIgnoreCase)) { break }\n      $checked = [IO.Path]::GetDirectoryName($checked)\n      if ([string]::IsNullOrEmpty($checked)) { throw 'outside' }\n    }\n    $item = Get-Item -LiteralPath $full -Force -ErrorAction Stop\n    $item.Refresh()\n    if (-not $item.Exists -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'missing' }\n    $directory = $item -is [IO.DirectoryInfo]\n    if (-not $directory -and -not ($item -is [IO.FileInfo])) { throw 'type' }\n    if ($directory -ne [bool]$source.directory) { throw 'type' }\n    $modified = Stamp $item.LastWriteTimeUtc\n    $accessed = Stamp $item.LastAccessTimeUtc\n    $created = Stamp $item.CreationTimeUtc\n    # Both GetFullPath and FullName can expand a valid DOS short-path alias.\n    # Echo the submitted transport identity only after all native path checks.\n    $rows.Add(@{ index = $index; path = [string]$source.path; normalizedPath = $full; directory = $directory;\n      modifiedAtUtc = $modified.utc; modifiedAtMs = $modified.ms;\n      accessedAtUtc = $accessed.utc; accessedAtMs = $accessed.ms;\n      createdAtUtc = $created.utc; createdAtMs = $created.ms })\n    $index += 1\n  }\n  $response = @{ version = 1; items = @($rows.ToArray()) } | ConvertTo-Json -Compress -Depth 5\n  [Console]::Out.Write($response)\n} catch {\n  [Console]::Error.WriteLine('Native Windows source metadata failed.')\n  exit 1\n}\n",
  "N-I": "$script:REA_NATIVE_PHASE_CLOCK = [Diagnostics.Stopwatch]::StartNew()\nfunction REA_NATIVE_PHASE_MARK([string]$phase) {\n  $phaseMilliseconds = [Math]::Round($script:REA_NATIVE_PHASE_CLOCK.Elapsed.TotalMilliseconds, 3).ToString('F3', [Globalization.CultureInfo]::InvariantCulture)\n  [Console]::Error.WriteLine('REA_NATIVE_COMMAND_PHASE_V1|' + $phase + '|' + $phaseMilliseconds)\n  [Console]::Error.Flush()\n}\nREA_NATIVE_PHASE_MARK 'I_PREFIX_ENTRY'\nREA_NATIVE_PHASE_MARK 'I_UTILITY_IMPORT_BEFORE'\n$REA_NATIVE_PHASE_UTILITY_MANIFEST = $env:SystemRoot + '\\System32\\WindowsPowerShell\\v1.0\\Modules\\Microsoft.PowerShell.Utility\\Microsoft.PowerShell.Utility.psd1'\nMicrosoft.PowerShell.Core\\Import-Module -Name $REA_NATIVE_PHASE_UTILITY_MANIFEST -ErrorAction Stop\nREA_NATIVE_PHASE_MARK 'I_UTILITY_IMPORT_AFTER'\n$ErrorActionPreference='Stop'\nAdd-Type -AssemblyName System.IO.Compression\nAdd-Type -AssemblyName System.IO.Compression.FileSystem\n$archivePath=Join-Path $env:REA_ZIP_TEST_DIR 'workspace/dotnet.zip'\n$localDate=[DateTime]::new(2012,3,4,0,6,8,[DateTimeKind]::Unspecified)\n$entryDate=[DateTimeOffset]::new($localDate,[TimeZoneInfo]::Local.GetUtcOffset($localDate))\n$stream=[System.IO.File]::Open($archivePath,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::ReadWrite)\n$archive=[System.IO.Compression.ZipArchive]::new($stream,[System.IO.Compression.ZipArchiveMode]::Create)\ntry{$entry=$archive.CreateEntry('a.txt');$entry.LastWriteTime=$entryDate;$writer=[System.IO.StreamWriter]::new($entry.Open());try{$writer.Write('dates')}finally{$writer.Dispose()}}finally{$archive.Dispose()}\n$destination=Join-Path $env:REA_ZIP_TEST_DIR 'dotnet-restored'\n[System.IO.Compression.ZipFile]::ExtractToDirectory($archivePath,$destination)\n@{expected=$entryDate.UtcDateTime.ToString('o');restored=(Get-Item -LiteralPath (Join-Path $destination 'a.txt')).LastWriteTimeUtc.ToString('o')}|ConvertTo-Json -Compress"
};
const EXPECTED_COMMAND_PINS={
  "M-O": {
    "utf8Bytes": 3265,
    "utf8SHA256": "7ef3cb16cbfffdab05aecd026cf69b805802b80c43949ac0774c3ff64d0e8dc0",
    "utf16LEBytes": 6530,
    "utf16LESHA256": "76e3ac8e0aeb8b1fa42fbc84ec6956e2e2d044502f5de5e5552e8538f5f4b615"
  },
  "N-O": {
    "utf8Bytes": 1098,
    "utf8SHA256": "5ce72a18da339b99648beb9db7744243b50b8eee25932883c5a6a0adee855baa",
    "utf16LEBytes": 2196,
    "utf16LESHA256": "76af0fb7e15f71324cbf5865cb6a51d6a388ce9d45dc4bec3ec9922aac2d8408"
  },
  "M-T": {
    "utf8Bytes": 4586,
    "utf8SHA256": "414c16a297760ec0de53059d53668a147a24a36bf899e52bd4464828a7bb2b44",
    "utf16LEBytes": 9172,
    "utf16LESHA256": "6c11c49e98ad57d6a1d1684e63d3b72d1bd0f6add537a4b6b7aeaeaa646d0080"
  },
  "N-T": {
    "utf8Bytes": 2138,
    "utf8SHA256": "ba590ea7b537e1306df6109f8cb79dde6a817b4db532e409238b51f4cf95ddb8",
    "utf16LEBytes": 4276,
    "utf16LESHA256": "7a9b2c3fd695d4f535d594978f6dbed1823d3f95aa6961852cdd3b4384789ae5"
  },
  "N-Q": {
    "utf8Bytes": 2196,
    "utf8SHA256": "8f9dce2e45dcb938e540471a564f7564c2cabb9d103f78099ad801e72e677404",
    "utf16LEBytes": 4392,
    "utf16LESHA256": "b4a280c0dc149dff4e10531f6e7de05444d95c876719915e38418d7e1d11d599"
  },
  "M-I": {
    "utf8Bytes": 4063,
    "utf8SHA256": "ff31bc2e4be5e48f009d3c2dabbcc0e2d48897e0fa3c44df1d9e30651d224235",
    "utf16LEBytes": 8126,
    "utf16LESHA256": "afe3fa01b6a06c00f24e3d61eb2bef24a9fff962c07280fc53354e43c8d3b080"
  },
  "N-I": {
    "utf8Bytes": 1896,
    "utf8SHA256": "fec1827457c16bb8914fde5a85d11095e2365a64126eb960a08fe54b627ad7d2",
    "utf16LEBytes": 3792,
    "utf16LESHA256": "fa1aee4ea23ec79400baf722ed4965ef78305951e09fd46aff6ed69cf864ee93"
  }
};
const CASE_PLAN=[
  {
    "order": 1,
    "id": "M-O-forward",
    "body": "M-O",
    "command": "metadata",
    "variant": "O",
    "originalControl": true,
    "timeoutMs": 15000
  },
  {
    "order": 2,
    "id": "M-T-forward",
    "body": "M-T",
    "command": "metadata",
    "variant": "T",
    "originalControl": false,
    "timeoutMs": 15000
  },
  {
    "order": 3,
    "id": "M-T-reverse",
    "body": "M-T",
    "command": "metadata",
    "variant": "T",
    "originalControl": false,
    "timeoutMs": 15000
  },
  {
    "order": 4,
    "id": "M-O-reverse",
    "body": "M-O",
    "command": "metadata",
    "variant": "O",
    "originalControl": true,
    "timeoutMs": 15000
  },
  {
    "order": 5,
    "id": "N-O-forward",
    "body": "N-O",
    "command": "original-NET",
    "variant": "O",
    "originalControl": true,
    "timeoutMs": 20000
  },
  {
    "order": 6,
    "id": "N-T-forward",
    "body": "N-T",
    "command": "original-NET",
    "variant": "T",
    "originalControl": false,
    "timeoutMs": 20000
  },
  {
    "order": 7,
    "id": "N-T-reverse",
    "body": "N-T",
    "command": "original-NET",
    "variant": "T",
    "originalControl": false,
    "timeoutMs": 20000
  },
  {
    "order": 8,
    "id": "N-O-reverse",
    "body": "N-O",
    "command": "original-NET",
    "variant": "O",
    "originalControl": true,
    "timeoutMs": 20000
  },
  {
    "order": 9,
    "id": "M-I-forward",
    "body": "M-I",
    "command": "metadata",
    "variant": "I",
    "originalControl": false,
    "timeoutMs": 15000
  },
  {
    "order": 10,
    "id": "N-Q-forward",
    "body": "N-Q",
    "command": "original-NET",
    "variant": "Q",
    "originalControl": false,
    "timeoutMs": 20000
  },
  {
    "order": 11,
    "id": "N-I-forward",
    "body": "N-I",
    "command": "original-NET",
    "variant": "I",
    "originalControl": false,
    "timeoutMs": 20000
  },
  {
    "order": 12,
    "id": "N-I-reverse",
    "body": "N-I",
    "command": "original-NET",
    "variant": "I",
    "originalControl": false,
    "timeoutMs": 20000
  },
  {
    "order": 13,
    "id": "N-Q-reverse",
    "body": "N-Q",
    "command": "original-NET",
    "variant": "Q",
    "originalControl": false,
    "timeoutMs": 20000
  },
  {
    "order": 14,
    "id": "M-I-reverse",
    "body": "M-I",
    "command": "metadata",
    "variant": "I",
    "originalControl": false,
    "timeoutMs": 15000
  }
];
const EXPECTED_PHASES={
  "M-O": [],
  "N-O": [],
  "M-T": [
    "M_BODY_ENTRY",
    "M_INPUT_ENCODING_BEFORE",
    "M_INPUT_ENCODING_AFTER",
    "M_OUTPUT_ENCODING_BEFORE",
    "M_OUTPUT_ENCODING_AFTER",
    "M_STDIN_JSON_BEFORE",
    "M_STDIN_JSON_AFTER",
    "M_ROOT_PREPARATION_BEFORE",
    "M_ROOT_PREPARATION_AFTER",
    "M_ROW_LIST_BEFORE",
    "M_ROW_LIST_AFTER",
    "M_ITEM_PATH_BEFORE",
    "M_GET_ITEM_BEFORE",
    "M_GET_ITEM_AFTER",
    "M_REFRESH_AFTER",
    "M_STAMPS_AFTER",
    "M_ROW_ADD_AFTER",
    "M_ITEM_PATH_BEFORE",
    "M_GET_ITEM_BEFORE",
    "M_GET_ITEM_AFTER",
    "M_REFRESH_AFTER",
    "M_STAMPS_AFTER",
    "M_ROW_ADD_AFTER",
    "M_JSON_OUTPUT_BEFORE",
    "M_JSON_OUTPUT_AFTER",
    "M_STDOUT_WRITE_AFTER"
  ],
  "N-T": [
    "N_BODY_ENTRY",
    "N_COMPRESSION_ASSEMBLY_BEFORE",
    "N_COMPRESSION_ASSEMBLY_AFTER",
    "N_FILESYSTEM_ASSEMBLY_BEFORE",
    "N_FILESYSTEM_ASSEMBLY_AFTER",
    "N_PATH_DATE_PREPARATION_BEFORE",
    "N_PATH_DATE_PREPARATION_AFTER",
    "N_SYNTHETIC_ZIP_BEFORE",
    "N_SYNTHETIC_ZIP_AFTER",
    "N_EXTRACTION_BEFORE",
    "N_EXTRACTION_AFTER",
    "N_FINAL_ITEM_JSON_BEFORE",
    "N_FINAL_ITEM_JSON_AFTER"
  ],
  "N-Q": [
    "N_BODY_ENTRY",
    "N_COMPRESSION_ASSEMBLY_BEFORE",
    "N_COMPRESSION_ASSEMBLY_AFTER",
    "N_FILESYSTEM_ASSEMBLY_BEFORE",
    "N_FILESYSTEM_ASSEMBLY_AFTER",
    "N_PATH_DATE_PREPARATION_BEFORE",
    "N_PATH_DATE_PREPARATION_AFTER",
    "N_SYNTHETIC_ZIP_BEFORE",
    "N_SYNTHETIC_ZIP_AFTER",
    "N_EXTRACTION_BEFORE",
    "N_EXTRACTION_AFTER",
    "N_FINAL_ITEM_JSON_BEFORE",
    "N_FINAL_ITEM_JSON_AFTER"
  ],
  "M-I": [
    "I_PREFIX_ENTRY",
    "I_UTILITY_IMPORT_BEFORE",
    "I_UTILITY_IMPORT_AFTER"
  ],
  "N-I": [
    "I_PREFIX_ENTRY",
    "I_UTILITY_IMPORT_BEFORE",
    "I_UTILITY_IMPORT_AFTER"
  ]
};
const COLLECTOR_KEYS = new Set(['PATH','PATHEXT','SYSTEMROOT','COMSPEC','TEMP','TMP','USERPROFILE','HOMEDRIVE','HOMEPATH','LOCALAPPDATA','APPDATA','CI','GITHUB_ACTIONS','RUNNER_ENVIRONMENT','RUNNER_OS','RUNNER_ARCH','RUNNER_TEMP','GITHUB_SHA','GITHUB_REF','GITHUB_EVENT_NAME','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_REPOSITORY','GITHUB_JOB','GITHUB_SERVER_URL','GITHUB_WORKFLOW']);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const utf8=text=>Buffer.from(text,'utf8');
const commandPin=text=>({utf8Bytes:utf8(text).length,utf8SHA256:sha(utf8(text)),utf16LEBytes:Buffer.byteLength(text,'utf16le'),utf16LESHA256:sha(Buffer.from(text,'utf16le'))});
const exactKeys=(value,names)=>value && typeof value==='object' && !Array.isArray(value) && JSON.stringify(Object.keys(value).sort())===JSON.stringify([...names].sort());
let outputFile=null,outputRoot=null,validatedSystemRoot=null,systemModules=null,guardStage='HOST_AND_SOURCE',completedCases=[];
function nativeErrorCode(error) {
  if (!error) return null;
  if (typeof error.code === 'number' && Number.isInteger(error.code)) return 'NUMERIC_EXIT';
  return ['ETIMEDOUT','ENOENT','EACCES','EINVAL','EPERM','ERR_CHILD_PROCESS_STDIO_MAXBUFFER'].includes(error.code) ? error.code : 'OTHER_PROCESS_ERROR';
}
function safeSignal(signal) {
  return signal === null || signal === undefined ? null : ['SIGTERM','SIGKILL','SIGINT','SIGBREAK'].includes(signal) ? signal : 'OTHER_SIGNAL';
}
function observation({id,form,timeoutMs,started,error,status,signal,stdout,stderr,deadlineObserved,killed,stdinClosed}) {
  const out = utf8(typeof stdout === 'string' ? stdout : ''), err = utf8(typeof stderr === 'string' ? stderr : '');
  const code = nativeErrorCode(error);
  let category = error ? 'NATIVE_PROCESS_ERROR' : status === 0 ? 'NATIVE_EXIT_ZERO' : 'NATIVE_NONZERO';
  if (code === 'ETIMEDOUT') category = 'NATIVE_TIMEOUT_REPORTED';
  else if (code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') category = 'OUTPUT_LIMIT';
  else if (['ENOENT','EACCES','EINVAL','EPERM'].includes(code)) category = 'LAUNCH_ERROR';
  else if (error && deadlineObserved && killed) category = 'DEADLINE_OBSERVED_PROCESS_FAILURE';
  return {id,form,timeoutMs,elapsedMs:Math.round(performance.now()-started),nativeExitCode:Number.isInteger(status)?status:null,nativeErrorCode:code,signal:safeSignal(signal),processKilled:killed===true,deadlineObserved:deadlineObserved===true,stdinExplicitlyClosed:stdinClosed,category,stdoutDecodedUTF8Bytes:out.length,stdoutDecodedUTF8SHA256:sha(out),stderrDecodedUTF8Bytes:err.length,stderrDecodedUTF8SHA256:sha(err),rawStdoutPublished:false,rawStderrPublished:false,environmentValuesPublished:false};
}
async function encodedCommand({id,env,script,input='',timeoutMs=METADATA_TIMEOUT,maxBuffer=METADATA_BUFFER}) {
  const systemRoot = validatedSystemRoot;
  assert(path.win32.isAbsolute(systemRoot) && !systemRoot.includes('\0'));
  const executable = path.win32.join(systemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe');
  const args = ['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')];
  const started = performance.now();
  let deadlineObserved = false;
  const watcher = setTimeout(() => { deadlineObserved = true; },timeoutMs);
  return await new Promise(resolve => {
    const child = execFile(executable,args,{env,encoding:'utf8',timeout:timeoutMs,maxBuffer,windowsHide:true,shell:false},(error,stdout,stderr) => {
      clearTimeout(watcher);
      child.stdin.destroy();
      const record = observation({id,form:'execFile-absolute-encoded',timeoutMs,started,error,status:error?(Number.isInteger(error.code)?error.code:null):0,signal:error?.signal,stdout,stderr,deadlineObserved,killed:error?.killed,stdinClosed:true});
      record.stdinPolicy='execFile-stdin-ended-utf8';
      resolve({record,stdout:typeof stdout==='string'?stdout:'',stderr:typeof stderr==='string'?stderr:''});
    });
    child.stdin.on('error',() => {});
    child.stdin.end(input,'utf8');
  });
}
function originalNET({id,env,fixtureRoot,script}) {
  const started = performance.now();
  const result = spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{env:{...env,REA_ZIP_TEST_DIR:fixtureRoot},encoding:'utf8',windowsHide:true,timeout:NET_TIMEOUT,maxBuffer:NET_BUFFER,shell:false});
  const record = observation({id,form:'spawnSync-by-name-command',timeoutMs:NET_TIMEOUT,started,error:result.error,status:result.status,signal:result.signal,stdout:result.stdout,stderr:result.stderr,deadlineObserved:result.error?.code==='ETIMEDOUT',killed:result.error?.code==='ETIMEDOUT',stdinClosed:null});
  record.stdinPolicy='spawnSync-default-no-input';
  let agreement = false;
  try {
    const value = JSON.parse(result.stdout);
    agreement = exactKeys(value,['expected','restored']) && typeof value.expected==='string' && typeof value.restored==='string' && Number.isFinite(Date.parse(value.expected)) && new Date(value.expected).toISOString()===new Date(value.restored).toISOString();
  } catch {}
  record.nativeOnlyNETRoundTripAgreement = result.status===0 && !result.error && agreement;
  record.productComparisonPerformed = false;
  return {record,stdout:typeof result.stdout==='string'?result.stdout:'',stderr:typeof result.stderr==='string'?result.stderr:''};
}
function validDate(utc,milliseconds) {
  if (typeof utc!=='string' || !/^(?!0000)\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z$/.test(utc) || typeof milliseconds!=='string' || !/^-?\d{1,15}\.\d{4}$/.test(milliseconds)) return false;
  const value=Date.parse(utc),normalized=new Date(value);
  if (!Number.isSafeInteger(value) || normalized.toISOString()!==utc.slice(0,23)+'Z') return false;
  const negative=milliseconds.startsWith('-'),[whole,fraction]=milliseconds.replace(/^-/,'').split('.');
  return (BigInt(whole)*10000n+BigInt(fraction))*(negative?-1n:1n)===BigInt(value)*10000n+BigInt(utc.slice(23,27));
}
function validMetadata(stdout,request) {
  try {
    const value=JSON.parse(stdout);
    if (!exactKeys(value,['version','items']) || value.version!==1 || !Array.isArray(value.items) || value.items.length!==request.sources.length) return false;
    return value.items.every((row,index) => exactKeys(row,['index','path','normalizedPath','directory','modifiedAtUtc','modifiedAtMs','accessedAtUtc','accessedAtMs','createdAtUtc','createdAtMs']) && row.index===index && row.path===request.sources[index].path && row.directory===request.sources[index].directory && typeof row.normalizedPath==='string' && path.win32.normalize(row.normalizedPath).toLowerCase()===path.win32.normalize(row.path).toLowerCase() && ['modifiedAt','accessedAt','createdAt'].every(key=>validDate(row[key+'Utc'],row[key+'Ms'])));
  } catch { return false; }
}

function oneEnvironmentValue(name) {
  const matches=Object.entries(process.env).filter(([key])=>key.toUpperCase()===name);
  assert.equal(matches.length,1);
  assert(typeof matches[0][1]==='string' && matches[0][1].length>0 && matches[0][1].length<=32767);
  return matches[0][1];
}
function ordinaryDirectory(directory) {
  assert(/^[A-Za-z]:\\/.test(directory) && !directory.includes('\0') && !directory.includes(';'));
  assert.equal(path.win32.normalize(directory),directory);
  let at=path.win32.parse(directory).root;
  assert(fs.lstatSync(at).isDirectory() && !fs.lstatSync(at).isSymbolicLink());
  for(const component of directory.slice(at.length).split('\\').filter(Boolean)) {
    at=path.win32.join(at,component);
    const stat=fs.lstatSync(at);
    assert(stat.isDirectory() && !stat.isSymbolicLink());
  }
  assert.equal(fs.realpathSync(directory).toLowerCase(),directory.toLowerCase());
  return directory;
}
function canonicalUtilityPreflight() {
  validatedSystemRoot=oneEnvironmentValue('SYSTEMROOT');
  assert(!/[\\/]$/.test(validatedSystemRoot));
  ordinaryDirectory(validatedSystemRoot);
  systemModules=ordinaryDirectory(path.win32.join(validatedSystemRoot,'System32','WindowsPowerShell','v1.0','Modules'));
  const directory=ordinaryDirectory(path.win32.join(systemModules,'Microsoft.PowerShell.Utility'));
  const manifest=path.win32.join(directory,'Microsoft.PowerShell.Utility.psd1');
  const stat=fs.lstatSync(manifest);
  assert(stat.isFile() && !stat.isSymbolicLink());
  assert.equal(fs.realpathSync(manifest).toLowerCase(),manifest.toLowerCase());
  // Serviced OS files can be hardlinked; nlink>1 alone is not a redirect.
  // No manifest contents, DLLs, unknown entries or inherited module paths are read.
  return {systemRootAndKnownAncestorsOrdinary:true,systemModulesOrdinary:true,utilityManifestOrdinary:true,canonicalRealpathsVerified:true,hardLinkCountUsedAsRejectionRule:false,manifestContentsRead:false};
}
function closedEnvironment() {
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>COLLECTOR_KEYS.has(key.toUpperCase())));
  assert(!Object.keys(env).some(key=>key.toUpperCase()==='PSMODULEPATH'));
  assert.equal(Object.entries(env).filter(([key])=>key.toUpperCase()==='SYSTEMROOT').length,1);
  assert.equal(Object.entries(env).find(([key])=>key.toUpperCase()==='SYSTEMROOT')[1],validatedSystemRoot);
  env.PSModulePath=systemModules;
  assert(Object.keys(env).every(key=>COLLECTOR_KEYS.has(key.toUpperCase()) || key==='PSModulePath'));
  return env;
}
function ownedFixture(name) {
  assert(/^case-[0-9]{2}$/.test(name));
  const root=path.join(outputRoot,'fixtures',name);
  fs.mkdirSync(path.join(root,'workspace'),{recursive:true});
  fs.mkdirSync(path.join(root,'nested'));
  fs.writeFileSync(path.join(root,'owned.txt'),'Owned Windows native metadata phase fixture.\n',{flag:'wx'});
  const canonical=fs.realpathSync(root);
  assert(path.relative(outputRoot,canonical).startsWith('fixtures'+path.sep) && !fs.lstatSync(canonical).isSymbolicLink());
  return canonical;
}
function phaseObservation(body,stderr,nativeResponseValid) {
  const bytes=utf8(stderr),expected=EXPECTED_PHASES[body],markers=[],other=[];
  let malformedMarker=false,sequenceValid=true,clockValid=true,inspectionLimitExceeded=bytes.length>MARKER_INSPECTION_CAP,catchSeen=false;
  if(!inspectionLimitExceeded) {
    for(const line of stderr.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
      const trimmed=line.replace(/\r?\n$/,'');
      if(!trimmed.startsWith(MARKER_PREFIX)) {
        if(!line.endsWith('\n') && trimmed.length>0 && MARKER_PREFIX.startsWith(trimmed)) malformedMarker=true;
        other.push(line);continue;
      }
      const match=/^REA_NATIVE_COMMAND_PHASE_V1\|([A-Z][A-Z0-9_]{0,63})\|([0-9]{1,5}\.[0-9]{3})$/.exec(trimmed);
      if(!match || !line.endsWith('\n') || markers.length>=MARKER_CAP) {malformedMarker=true;continue;}
      const phase=match[1],elapsedMs=Number(match[2]);
      if(elapsedMs>60000 || (markers.length>0 && elapsedMs<markers.at(-1).elapsedMs)) clockValid=false;
      const catchPhase=body==='M-T' && phase==='M_CATCH_ENTERED' && !catchSeen;
      if(catchPhase) {
        if(markers.length<6 || markers.length>=expected.length) sequenceValid=false;
        catchSeen=true;
      }
      else if(catchSeen || phase!==expected[markers.length]) sequenceValid=false;
      // Only approved fixed enums are exposed. Unknown strings never enter the report.
      if(!expected.includes(phase) && !catchPhase) {malformedMarker=true;continue;}
      markers.push({phase,elapsedMs});
    }
  }
  const complete=!catchSeen && markers.length===expected.length && sequenceValid;
  const markerParserValid=!inspectionLimitExceeded && !malformedMarker && sequenceValid && clockValid;
  const phaseInstrumentationValid=markerParserValid && (!nativeResponseValid || complete);
  const nonmarker=inspectionLimitExceeded?bytes:utf8(other.join(''));
  return {expectedMarkerCount:expected.length,observedMarkerCount:markers.length,markers,lastObservedPhase:markers.at(-1)?.phase ?? null,observedChildClockMs:markers.at(-1)?.elapsedMs ?? null,observedClockIsWholeChildDuration:false,markerParserValid,phaseInstrumentationValid,expectedSequenceCompleted:complete,catchMarkerObserved:catchSeen,malformedMarkerObserved:malformedMarker,markerOrderValid:sequenceValid,markerClockValid:clockValid,markerInspectionLimitExceeded:inspectionLimitExceeded,nonmarkerStderrDecodedUTF8Bytes:nonmarker.length,nonmarkerStderrDecodedUTF8SHA256:sha(nonmarker),nonmarkerStderrIsWholeStreamOnInspectionLimit:inspectionLimitExceeded,importSuffixInternalPhaseLocalized:false};
}
function readGit(args,repository) {
  assert(['rev-parse','rev-list','diff','ls-tree','status','cat-file'].includes(args[0]));
  if(args[0]==='cat-file') assert.deepEqual(args,['cat-file','-p',PARENT]);
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!/^GIT_/i.test(key)));
  Object.assign(env,{GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never',GIT_CONFIG_COUNT:'0'});
  const result=spawnSync('C:/Program Files/Git/cmd/git.exe',['--no-replace-objects','-c','core.fsmonitor=false','-c','core.hooksPath=NUL','-c','protocol.allow=never',...args],{cwd:repository,env,shell:false,windowsHide:true,encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
  assert(!result.error && result.status===0 && result.signal===null);
  return result.stdout.trim();
}
function sourceGuards(repository) {
  assert.equal(readGit(['rev-parse','HEAD'],repository),process.env.GITHUB_SHA);
  assert.equal(readGit(['rev-list','--parents','-n','1','HEAD'],repository),process.env.GITHUB_SHA+' '+PARENT);
  // Depth2 makes PARENT shallow; read its existing commit header, never a source body.
  const parentHeader=readGit(['cat-file','-p',PARENT],repository).split('\n\n',1)[0].split('\n');
  assert.deepEqual(parentHeader.filter(line=>line.startsWith('parent ')),['parent '+PARENT_PARENT]);
  assert.equal(readGit(['diff','--no-ext-diff','--no-textconv','--no-renames','--name-status',PARENT,'HEAD'],repository),'A\t'+WORKFLOW_PATH+'\nA\t'+SCRIPT_PATH);
  for(const sourcePath of [WORKFLOW_PATH,SCRIPT_PATH]) {
    assert.equal(readGit(['ls-tree',PARENT,'--',sourcePath],repository),'');
    const row=readGit(['ls-tree','HEAD','--',sourcePath],repository).split('\t');
    assert.equal(row.length,2);assert.equal(row[1],sourcePath);assert(/^100644 blob [0-9a-f]{40}$/.test(row[0]));
  }
  const oldRows=readGit(['ls-tree','-r',PARENT,'--','.github/workflows'],repository).split('\n').filter(Boolean);
  const newRows=readGit(['ls-tree','-r','HEAD','--','.github/workflows'],repository).split('\n').filter(Boolean);
  assert.equal(oldRows.length,28);assert.equal(newRows.length,30);
  assert(newRows.every(row=>/^100644 blob [0-9a-f]{40}\t/.test(row)));
  assert.deepEqual(newRows.filter(row=>!row.endsWith('\t'+WORKFLOW_PATH)&&!row.endsWith('\t'+SCRIPT_PATH)),oldRows);
  assert.equal(oldRows.filter(row=>/\.(?:yml|yaml)$/.test(row)).length,28);
  assert.equal(newRows.filter(row=>/\.(?:yml|yaml)$/.test(row)).length,29);
  assert.equal(readGit(['status','--porcelain=v1','--untracked-files=all'],repository),'');
}
function publish(report) {
  const bytes=utf8(JSON.stringify(report,null,2)+'\n');
  assert(bytes.length<=RESULT_CAP);
  if(outputFile) {
    fs.writeFileSync(outputFile,bytes,{flag:'wx'});
    assert(fs.readFileSync(outputFile).equals(bytes));
  }
  console.log(LOG_PREFIX+JSON.stringify(report));
}

async function main() {
  assert.equal(process.argv.length,2);
  assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.version,'v24.16.0');
  for(const [key,value] of Object.entries({CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab',GITHUB_SERVER_URL:'https://github.com',GITHUB_REF:BRANCH,GITHUB_EVENT_NAME:'push',GITHUB_JOB:'native-command-phase-probe',REA_NATIVE_COMMAND_PHASE_SAFE_METADATA_ONLY:'true',ImageOS:'win22'})) assert.equal(process.env[key],value);
  assert(/^10\.0\.20348(?:\.|$)/.test(os.release()));
  for(const key of ['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT']) assert(/^[1-9][0-9]*$/.test(process.env[key]));
  assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA));
  const repository=fs.realpathSync(process.env.GITHUB_WORKSPACE);
  assert.equal(fs.realpathSync(fileURLToPath(import.meta.url)),path.join(repository,...SCRIPT_PATH.split('/')));
  sourceGuards(repository);
  guardStage='OUTPUT_ROOT';
  const temporary=fs.realpathSync(process.env.RUNNER_TEMP);
  assert(fs.lstatSync(temporary).isDirectory() && !fs.lstatSync(temporary).isSymbolicLink());
  outputRoot=path.join(temporary,'rea-windows-native-command-phase-probe-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT);
  fs.mkdirSync(outputRoot);assert(!fs.lstatSync(outputRoot).isSymbolicLink());
  fs.mkdirSync(path.join(outputRoot,'reports'));
  outputFile=path.join(outputRoot,'reports','windows-native-command-phase-probe.json');
  guardStage='CANONICAL_UTILITY_PREFLIGHT';
  const canonicalPreflight=canonicalUtilityPreflight();
  guardStage='COMMAND_AND_PLAN_PINS';
  for(const [id,body] of Object.entries(BODIES)) assert.deepEqual(commandPin(body),EXPECTED_COMMAND_PINS[id]);
  assert.equal(Object.keys(BODIES).length,7);
  assert.equal(CASE_PLAN.length,14);assert.equal(new Set(CASE_PLAN.map(row=>row.id)).size,14);
  assert.deepEqual(CASE_PLAN.map(row=>row.order),Array.from({length:14},(_,i)=>i+1));
  assert.equal(CASE_PLAN.filter(row=>row.command==='metadata').length,6);
  assert.equal(CASE_PLAN.filter(row=>row.command==='original-NET').length,8);
  assert.equal(CASE_PLAN.filter(row=>row.originalControl).length,4);
  assert.equal(CASE_PLAN.reduce((total,row)=>total+row.timeoutMs,0),250000);
  const report={schema:'rea-windows-native-command-phase-probe/v1',status:'diagnostic-running',experiment:'R8-fixed-C-native-command-phase-localization',source:process.env.GITHUB_SHA,parent:PARENT,parentParent:PARENT_PARENT,branch:BRANCH,runID:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,hostedWindows2022X64Node2416GuardVerified:true,exactlyTwoNew100644SourcePathsVerified:true,old28WorkflowsUnchangedNew29Verified:true,commands:EXPECTED_COMMAND_PINS,predeclaredCasePlan:CASE_PLAN,cases:completedCases,requiredCases:14,metadataCases:6,originalNETCases:8,originalControlCases:4,changedDiagnosticCases:10,nominalNativeTimeoutBudgetMs:250000,metadataTimeoutMs:METADATA_TIMEOUT,originalNETTimeoutMs:NET_TIMEOUT,metadataMaxBufferBytes:METADATA_BUFFER,originalNETMaxBufferBytes:NET_BUFFER,resultCapBytes:RESULT_CAP,markerCountCap:MARKER_CAP,markerInspectionCapBytes:MARKER_INSPECTION_CAP,canonicalPreflight,childEnvironmentProfile:'C-closed-collector-plus-canonical-WinPS-system-Modules-only',inheritedModulePathRead:false,inheritedUserOrPS7PathsForwarded:false,extraSystemEnvironmentKeysAdded:false,originalNETFixtureEnvironmentKeyOnly:'REA_ZIP_TEST_DIR',rawStdoutPublished:false,rawStderrPublished:false,environmentValuesPublished:false,existingOrMappedArchivesAccessed:0,syntheticNativeNETArchivesNeverUploaded:true,productImportsOrExecution:0,testsOrProductThresholdsChanged:false,productAcceptance:false,runtimeAcceptance:false,semanticAcceptance:false,fullParity:false,allTenComplete:false,provenRootCause:false,environmentCausalityProven:false,moduleResolutionCausalityProven:false,coldStartOrderAndInstrumentationConfoundingExcluded:false};
  for(const specification of CASE_PLAN) {
    guardStage='PREDECLARED_NATIVE_CASE';
    const env=closedEnvironment(),root=ownedFixture('case-'+String(specification.order).padStart(2,'0')),script=BODIES[specification.body];
    let native,metadataValid=null,NETValid=null;
    if(specification.command==='metadata') {
      const request={version:1,root,sources:[{index:0,path:path.join(root,'owned.txt'),directory:false},{index:1,path:path.join(root,'nested'),directory:true}]};
      native=await encodedCommand({id:specification.id,env,script,input:JSON.stringify(request)});
      metadataValid=native.record.nativeExitCode===0 && native.record.nativeErrorCode===null && validMetadata(native.stdout,request);
    } else {
      assert.equal(specification.command,'original-NET');
      native=originalNET({id:specification.id,env,fixtureRoot:root,script});
      NETValid=native.record.nativeOnlyNETRoundTripAgreement;
      delete native.record.nativeOnlyNETRoundTripAgreement;
      delete native.record.productComparisonPerformed;
    }
    const nativeResponseValid=metadataValid===true || NETValid===true;
    completedCases.push({...native.record,predeclaredOrder:specification.order,command:specification.command,body:specification.body,variant:specification.variant,originalControl:specification.originalControl,commandPin:EXPECTED_COMMAND_PINS[specification.body],metadataResponseValid:metadataValid,nativeOnlyNETRoundTripAgreement:NETValid,nativeResponseValid,phase:phaseObservation(specification.body,native.stderr,nativeResponseValid)});
  }
  guardStage='FINAL_CLOSED_REPORT';
  assert.equal(completedCases.length,14);
  assert.deepEqual(completedCases.map(row=>row.id),CASE_PLAN.map(row=>row.id));
  report.casesRetained=14;
  report.nativeNegativeCases=completedCases.filter(row=>!row.nativeResponseValid).length;
  report.originalControlNegativeCases=completedCases.filter(row=>row.originalControl && !row.nativeResponseValid).length;
  report.changedDiagnosticNegativeCases=completedCases.filter(row=>!row.originalControl && !row.nativeResponseValid).length;
  report.phaseInstrumentationNegativeCases=completedCases.filter(row=>!row.phase.phaseInstrumentationValid).length;
  report.status=report.phaseInstrumentationNegativeCases?'diagnostic-completed-with-instrumentation-negatives':report.nativeNegativeCases?'diagnostic-completed-with-native-negatives':'diagnostic-completed-no-native-negative-observed';
  report.fixedCaseOrderAndCountsVerified=true;
  report.interpretation='Only observed fixed phase regions and original-versus-changed associations are reported. Import variants have an internally unmarked original suffix; no T-internal phase is assigned to I. Mirrors do not exclude order/cache/instrumentation effects. Missing first marker and partial clocks do not prove startup cause or whole-child duration. Native negatives are retained and approve no product or environment fix.';
  publish(report);
  if(report.phaseInstrumentationNegativeCases>0) process.exitCode=1;
}
main().catch(()=>{
  const report={schema:'rea-windows-native-command-phase-probe-guard/v1',status:'guard-or-harness-failure',stage:guardStage,source:/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA??'')?process.env.GITHUB_SHA:null,parent:PARENT,branch:BRANCH,runID:/^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ID??'')?process.env.GITHUB_RUN_ID:null,attempt:/^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ATTEMPT??'')?process.env.GITHUB_RUN_ATTEMPT:null,requiredCases:14,casesRetained:completedCases.length,cases:completedCases,rawErrorPublished:false,rawStdoutPublished:false,rawStderrPublished:false,environmentValuesPublished:false,productAcceptance:false,runtimeAcceptance:false,provenRootCause:false,environmentCausalityProven:false};
  try {publish(report);} catch {console.log(LOG_PREFIX+JSON.stringify({schema:'rea-windows-native-command-phase-probe-publication-failure/v1',status:'closed-report-publication-failure',rawErrorPublished:false,productAcceptance:false,runtimeAcceptance:false,provenRootCause:false}));}
  process.exitCode=1;
});
