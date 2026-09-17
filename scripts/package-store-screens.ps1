param(
    [Parameter(Mandatory=$true)][string]$Source,
    [Parameter(Mandatory=$true)][ValidateSet('android','ios')][string]$Platform
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repoRoot = Split-Path $PSScriptRoot -Parent
$sourceRoot = (Resolve-Path -LiteralPath $Source).Path
$destination = Join-Path $repoRoot "release/screenshots/$Platform"
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$names = if ($Platform -eq 'android') {
    @('01-today-offline','03-active','06-result','07-history','09-saved-pattern','10-saved-mix')
} else {
    @('01-today','02-pre','03-session','04-post','05-result','06-history')
}
foreach ($name in $names) {
    $inputFile = Join-Path $sourceRoot "$name.png"
    $original = [System.Drawing.Bitmap]::FromFile($inputFile)
    try {
        if ($Platform -eq 'android' -and ($original.Width -ne 1080 -or $original.Height -ne 1920)) {
            throw "Unexpected Android capture dimensions: $inputFile"
        }
        # Export the entire native capture as 24-bit PNG; no resizing or retouching.
        $bounds = [System.Drawing.Rectangle]::new(0,0,$original.Width,$original.Height)
        $rgb = $original.Clone($bounds, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        try { $rgb.Save((Join-Path $destination "$name.png"), [System.Drawing.Imaging.ImageFormat]::Png) }
        finally { $rgb.Dispose() }
    } finally { $original.Dispose() }
}
Write-Output "Packaged $($names.Count) native captures in $destination"
