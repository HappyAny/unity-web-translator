param([string]$TargetDirectory)
$ErrorActionPreference = 'Stop'
$unitySourceDirectory = Join-Path $PSScriptRoot 'extension'
$unityMetadataPath = Join-Path $PSScriptRoot 'update-files.json'
$unityRememberedPath = Join-Path $PSScriptRoot 'update-target.json'
if (-not (Test-Path -LiteralPath $unityMetadataPath -PathType Leaf)) { throw 'Extract the entire package first; update-files.json is missing.' }
$unityMetadata = Get-Content -LiteralPath $unityMetadataPath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $TargetDirectory -and (Test-Path -LiteralPath $unityRememberedPath -PathType Leaf)) {
    $TargetDirectory = (Get-Content -LiteralPath $unityRememberedPath -Raw -Encoding UTF8 | ConvertFrom-Json).targetDirectory
}
if (-not $TargetDirectory) {
    Add-Type -AssemblyName System.Windows.Forms
    $unityPicker = New-Object System.Windows.Forms.FolderBrowserDialog
    $unityPicker.Description = 'Select the EXISTING Unity Web Translator extension folder containing manifest.json.'
    $unityPicker.ShowNewFolderButton = $false
    try { if ($unityPicker.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { throw 'Update cancelled.' }; $TargetDirectory = $unityPicker.SelectedPath }
    finally { $unityPicker.Dispose() }
}
$unityTargetRoot = (Resolve-Path -LiteralPath $TargetDirectory).ProviderPath.TrimEnd('\')
$unitySourceRoot = (Resolve-Path -LiteralPath $unitySourceDirectory).ProviderPath.TrimEnd('\')
$unityTargetManifestPath = Join-Path $unityTargetRoot 'manifest.json'
if (-not (Test-Path -LiteralPath $unityTargetManifestPath -PathType Leaf)) { throw 'Select the existing installed extension folder, not an empty/new folder.' }
$unityPreviousManifest = Get-Content -LiteralPath $unityTargetManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($unityPreviousManifest.background.service_worker -ne 'background.mjs' -or
    $unityPreviousManifest.options_ui.page -ne 'options.html' -or
    -not (Test-Path -LiteralPath (Join-Path $unityTargetRoot 'engine.mjs')) -or
    -not (Test-Path -LiteralPath (Join-Path $unityTargetRoot 'core.mjs'))) { throw 'The selected folder is not this translator extension.' }
function Get-UnityChildPath([string]$Root, [string]$Relative) {
    if ($Relative -notmatch '^[a-zA-Z0-9_./-]+$' -or $Relative.StartsWith('/') -or ($Relative.Split('/') -contains '..') -or ($Relative.Split('/') -contains '.')) { throw 'Invalid public file path.' }
    $unityChild = [System.IO.Path]::GetFullPath((Join-Path $Root $Relative))
    if (-not $unityChild.StartsWith($Root + '\', [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Update path escaped the selected folder.' }
    $unityAncestor = $unityChild
    while ($unityAncestor.Length -ge $Root.Length) {
        if (Test-Path -LiteralPath $unityAncestor) { if ((Get-Item -LiteralPath $unityAncestor -Force).Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw 'Linked update paths are unsupported. Select a normal extension folder.' } }
        if ($unityAncestor -eq $Root) { break }; $unityAncestor = Split-Path -LiteralPath $unityAncestor
    }
    return $unityChild
}
$unityPublicFiles = @($unityMetadata.files)
function Get-UnityHash([string]$Path) {
    $unityHasher = [System.Security.Cryptography.SHA256]::Create()
    $unityInputStream = [System.IO.File]::OpenRead($Path)
    try { return ([System.BitConverter]::ToString($unityHasher.ComputeHash($unityInputStream))).Replace('-', '').ToLowerInvariant() }
    finally { $unityInputStream.Dispose(); $unityHasher.Dispose() }
}
if ($unityPublicFiles.Count -lt 17 -or @($unityPublicFiles | Where-Object path -eq 'manifest.json').Count -ne 1) { throw 'Invalid update file list.' }
foreach ($unityFile in $unityPublicFiles) {
    $unitySource = Get-UnityChildPath $unitySourceRoot $unityFile.path
    $null = Get-UnityChildPath $unityTargetRoot $unityFile.path
    if (-not (Test-Path -LiteralPath $unitySource -PathType Leaf) -or (Get-UnityHash $unitySource) -ne $unityFile.sha256) { throw ('Public file checksum failed: ' + $unityFile.path) }
}
if ($unityTargetRoot -eq $unitySourceRoot) { Write-Output ('Files already occupy the original folder. Reload extension v' + $unityMetadata.version + ', then refresh the game.'); exit 0 }
$unityBackupRelative = '.unity-update-backups/' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff')
$unityBackupRoot = Get-UnityChildPath $unityTargetRoot $unityBackupRelative
$null = New-Item -ItemType Directory -Path $unityBackupRoot -Force
foreach ($unityFile in $unityPublicFiles) {
    $unityExisting = Get-UnityChildPath $unityTargetRoot $unityFile.path
    if (Test-Path -LiteralPath $unityExisting -PathType Leaf) {
        $unityBackup = Get-UnityChildPath $unityBackupRoot $unityFile.path
        $null = New-Item -ItemType Directory -Path (Split-Path -LiteralPath $unityBackup) -Force
        Copy-Item -LiteralPath $unityExisting -Destination $unityBackup -Force
    }
}
try {
    foreach ($unityFile in ($unityPublicFiles | Sort-Object { $_.path -eq 'manifest.json' })) {
        $unityDestination = Get-UnityChildPath $unityTargetRoot $unityFile.path
        $null = New-Item -ItemType Directory -Path (Split-Path -LiteralPath $unityDestination) -Force
        Copy-Item -LiteralPath (Get-UnityChildPath $unitySourceRoot $unityFile.path) -Destination $unityDestination -Force
    }
    if ($unityPreviousManifest.PSObject.Properties['key']) {
        $unityUpdatedManifest = Get-Content -LiteralPath $unityTargetManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $unityUpdatedManifest | Add-Member -MemberType NoteProperty -Name key -Value $unityPreviousManifest.key -Force
        [System.IO.File]::WriteAllText($unityTargetManifestPath, ($unityUpdatedManifest | ConvertTo-Json -Depth 30), [System.Text.UTF8Encoding]::new($false))
    }
    [System.IO.File]::WriteAllText($unityRememberedPath, (@{ targetDirectory = $unityTargetRoot } | ConvertTo-Json), [System.Text.UTF8Encoding]::new($false))
} catch {
    foreach ($unityFile in $unityPublicFiles) { $unityBackup = Get-UnityChildPath $unityBackupRoot $unityFile.path; if (Test-Path -LiteralPath $unityBackup -PathType Leaf) { Copy-Item -LiteralPath $unityBackup -Destination (Get-UnityChildPath $unityTargetRoot $unityFile.path) -Force } }
    throw
}
Write-Output ('Updated the SAME folder to v' + $unityMetadata.version + '. No new extension was installed.')
Write-Output ('Previous public files backed up at: ' + $unityBackupRoot)
Write-Output 'Reload the existing extension in Chrome/Edge (or use its Reload button), then refresh the game.'
