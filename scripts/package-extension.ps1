$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$extension = Join-Path $root 'extension'
$manifest = Get-Content -LiteralPath (Join-Path $extension 'manifest.json') -Raw | ConvertFrom-Json
$release = Get-Content -LiteralPath (Join-Path $extension 'release.json') -Raw | ConvertFrom-Json
if ($manifest.version -ne $release.version -or $manifest.version -notmatch '^\d+\.\d+\.\d+$') {
    throw 'As versões do manifesto e da extensão devem coincidir.'
}

$files = [ordered]@{}
foreach ($name in @('manifest.json', 'popup.html', 'popup.css', 'popup.js', 'web-app.js', 'README.md', 'release.json')) {
    $files[$name] = Join-Path $extension $name
}
foreach ($name in @('index.html', 'app.webmanifest', 'assets/app.css', 'assets/icon.svg')) {
    $files[$name] = Join-Path $root $name
}
foreach ($file in Get-ChildItem -LiteralPath (Join-Path $root 'src') -File -Recurse -Filter '*.js') {
    $entry = [IO.Path]::GetRelativePath($root, $file.FullName).Replace('\', '/')
    $files[$entry] = $file.FullName
}
foreach ($file in $files.Values) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Arquivo ausente: $file" }
}

$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$output = Join-Path $dist "Club-Companion-FC-v$($manifest.version)-chrome.zip"
$temporary = Join-Path $dist ("club-companion-build-" + [guid]::NewGuid().ToString('N') + ".tmp")
try {
    $archive = [IO.Compression.ZipFile]::Open($temporary, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($entry in $files.GetEnumerator()) {
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $archive, $entry.Value, $entry.Key, [IO.Compression.CompressionLevel]::Optimal
            ) | Out-Null
        }
    } finally {
        $archive.Dispose()
    }
    [IO.File]::Move($temporary, $output, $true)
} finally {
    if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary }
}
$output
