$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# Deterministic packaging conversion only: no new artwork, recoloring or cropping.
$assetRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'Assets'))
$sourcePath = Join-Path $assetRoot 'source-icon.ico'
$originalPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\build\icon.ico'))
$expectedHash = '0FF88410C94FB1B0786A89EEE931CF5BAAF92B357583B9C9E9A206C9E36F137D'
foreach ($iconPath in @($sourcePath, $originalPath)) {
  if ((Get-FileHash -LiteralPath $iconPath -Algorithm SHA256).Hash -ne $expectedHash) {
    throw 'Oharu icon source changed. Review provenance before regenerating Store assets.'
  }
}
$sizes = [ordered]@{ 'Square44x44Logo.png' = 44; 'StoreLogo.png' = 50; 'Square150x150Logo.png' = 150 }
# GDI Icon selection can silently choose the 128px frame for an ICO 256px
# directory entry (encoded width=0). Decode the verified 32-bit DIB explicitly.
$sourceBytes = [System.IO.File]::ReadAllBytes($sourcePath)
$frameOffset = -1
for ($i = 0; $i -lt [BitConverter]::ToUInt16($sourceBytes, 4); $i++) {
  $entryOffset = 6 + 16 * $i
  if ($sourceBytes[$entryOffset] -eq 0 -and $sourceBytes[$entryOffset + 1] -eq 0) {
    $frameOffset = [int][BitConverter]::ToUInt32($sourceBytes, $entryOffset + 12)
    break
  }
}
if ($frameOffset -lt 0 -or [BitConverter]::ToUInt32($sourceBytes, $frameOffset) -ne 40 -or
    [BitConverter]::ToInt32($sourceBytes, $frameOffset + 4) -ne 256 -or
    [BitConverter]::ToInt32($sourceBytes, $frameOffset + 8) -ne 512 -or
    [BitConverter]::ToUInt16($sourceBytes, $frameOffset + 14) -ne 32 -or
    [BitConverter]::ToUInt32($sourceBytes, $frameOffset + 16) -ne 0) {
  throw 'Expected the verified 256px uncompressed 32-bit ICO DIB frame.'
}
$sourceBitmap = [System.Drawing.Bitmap]::new(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bits = $sourceBitmap.LockBits([System.Drawing.Rectangle]::new(0,0,256,256), [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
try {
  for ($row = 0; $row -lt 256; $row++) {
    [System.Runtime.InteropServices.Marshal]::Copy($sourceBytes, $frameOffset + 40 + (255-$row)*1024, [IntPtr]::Add($bits.Scan0, $row*$bits.Stride), 1024)
  }
} finally { $sourceBitmap.UnlockBits($bits) }
$outputs = @()
try {
  foreach ($entry in $sizes.GetEnumerator()) {
    $target = Join-Path $assetRoot $entry.Key
    $temporary = $target + '.tmp'
    $bitmap = [System.Drawing.Bitmap]::new($entry.Value, $entry.Value, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $attributes = [System.Drawing.Imaging.ImageAttributes]::new()
    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $attributes.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
      $destination = [System.Drawing.Rectangle]::new(0, 0, $entry.Value, $entry.Value)
      $graphics.DrawImage($sourceBitmap, $destination, 0, 0, 256, 256, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
      $bitmap.Save($temporary, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $attributes.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
    }
    Move-Item -LiteralPath $temporary -Destination $target -Force
    $outputs += [ordered]@{
      file = $entry.Key; width = $entry.Value; height = $entry.Value
      sha256 = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
    }
  }
} finally { $sourceBitmap.Dispose() }

$generatorText = [System.IO.File]::ReadAllText($PSCommandPath).Replace("`r`n", "`n")
$hasher = [System.Security.Cryptography.SHA256]::Create()
try { $generatorHash = [BitConverter]::ToString($hasher.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($generatorText))).Replace('-', '') }
finally { $hasher.Dispose() }
$provenance = [ordered]@{
  source = 'source-icon.ico'; sourceSHA256 = $expectedHash; sourceFrame = '256x256'
  operation = 'Full-frame proportional downscale only; transparent 32bpp ARGB; GDI+ HighQualityBicubic'
  generator = 'generate-assets.ps1'
  generatorSHA256 = $generatorHash
  generatorHashNormalization = 'UTF-8 with LF line endings'
  outputs = $outputs
}
$provenance | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $assetRoot 'provenance.json') -Encoding utf8
$outputs | ConvertTo-Json
