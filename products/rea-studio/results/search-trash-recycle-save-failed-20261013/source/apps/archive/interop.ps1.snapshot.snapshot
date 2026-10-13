param(
    [Parameter(Mandatory = $true)][ValidateSet('verify', 'create')][string]$Mode,
    [Parameter(Mandatory = $true)][string]$ArchivePath,
    [Parameter(Mandatory = $true)][string]$ExpectedPath
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
[object[]]$fixtures = ConvertFrom-Json -InputObject ([System.IO.File]::ReadAllText($ExpectedPath, [System.Text.Encoding]::UTF8))
if ($Mode -eq 'verify') {
    $zip = [System.IO.Compression.ZipFile]::OpenRead($ArchivePath)
    try {
        if ($zip.Entries.Count -ne $fixtures.Count) { throw "Independent ZIP entry count differs: $($zip.Entries.Count) versus $($fixtures.Count)." }
        foreach ($fixture in $fixtures) {
            $entry = $zip.GetEntry($fixture.name)
            if ($null -eq $entry) { throw "Independent reader cannot find $($fixture.name)." }
            $stream = $entry.Open()
            $memory = [System.IO.MemoryStream]::new()
            try {
                $stream.CopyTo($memory)
                if ([Convert]::ToBase64String($memory.ToArray()) -cne $fixture.base64) { throw "Independent reader bytes differ for $($fixture.name)." }
            } finally { $stream.Dispose(); $memory.Dispose() }
        }
    } finally { $zip.Dispose() }
} else {
    $stream = [System.IO.File]::Open($ArchivePath, [System.IO.FileMode]::CreateNew)
    $zip = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create, $false, [System.Text.Encoding]::UTF8)
    try {
        foreach ($fixture in $fixtures) {
            $entry = $zip.CreateEntry($fixture.name, [System.IO.Compression.CompressionLevel]::Optimal)
            $entryStream = $entry.Open()
            try {
                $bytes = [Convert]::FromBase64String($fixture.base64)
                $entryStream.Write($bytes, 0, $bytes.Length)
            } finally { $entryStream.Dispose() }
        }
    } finally { $zip.Dispose(); $stream.Dispose() }
}
Write-Output 'Independent .NET ZIP interoperability passed.'
