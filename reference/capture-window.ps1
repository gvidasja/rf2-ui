# Captures the rFactor 2 game window (3D + UI composited) to a PNG.
#   pwsh reference/capture-window.ps1 <out.png>
# Uses PrintWindow(PW_RENDERFULLCONTENT) and falls back to copying the screen area (window must be visible).
param([string]$Out = "$PSScriptRoot\screenshots\game-window.png", [switch]$CropUi)

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
}
"@

$p = Get-Process rFactor2 -ErrorAction Stop | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $p) { throw "rFactor2 window not found" }
$h = $p.MainWindowHandle
if ([Win]::IsIconic($h)) { throw "game window is minimized" }
$r = New-Object Win+RECT
[void][Win]::GetWindowRect($h, [ref]$r)
$w = $r.Right - $r.Left; $hgt = $r.Bottom - $r.Top

$bmp = New-Object System.Drawing.Bitmap $w, $hgt
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
$ok = [Win]::PrintWindow($h, $hdc, 2)
$g.ReleaseHdc($hdc)

# PrintWindow often returns black for DirectX swap chains: detect and fall back to a screen copy.
$sample = 0
foreach ($i in 1..50) { $c = $bmp.GetPixel((Get-Random -Maximum $w), (Get-Random -Maximum $hgt)); $sample += $c.R + $c.G + $c.B }
if (-not $ok -or $sample -eq 0) {
  $g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
  $method = "screen copy"
} else { $method = "PrintWindow" }

$g.Dispose()
New-Item -ItemType Directory -Force (Split-Path $Out) | Out-Null
if ($CropUi -and $w -ge 1920 -and $hgt -ge 1080) {
  # The 1920x1080 UI is centered horizontally and bottom-aligned (title bar on top) in the game window.
  $rect = New-Object System.Drawing.Rectangle ([int](($w - 1920) / 2)), ($hgt - 1080), 1920, 1080
  $crop = $bmp.Clone($rect, $bmp.PixelFormat); $bmp.Dispose(); $bmp = $crop
}
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
"$method ${w}x${hgt} at ($($r.Left),$($r.Top)) -> $Out"
