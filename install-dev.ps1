$rf2Path = "D:\SteamLibrary\steamapps\common\rFactor 2"
$packageFile = "net.rfactor2.ui.framework.jar"
$package = "$rf2Path\bin\Bundles\$packageFile"

npm run build

mkdir -Force temp
mkdir -Force temp\new
Copy-Item $package temp
tar -xf "temp\$packageFile" -C temp\new

$mainFile = (Get-ChildItem -File -Filter "temp\new\static\framework\main-*" | Select-Object -First 1)[0].Name
$jsFile = (Get-ChildItem -File -Filter "dist\assets\index*.js" | Select-Object -First 1)[0].Name
$cssFile = (Get-ChildItem -File -Filter "dist\assets\index*.css" | Select-Object -First 1)[0].Name

Write-Host "found main file: $mainFile"
Write-Host "found js file: $jsFile"
Write-Host "found css file: $cssFile"

$hookFileContent = ((Get-Content scripts\hook.js -raw) -replace "<jsFile>", $jsFile -replace "<cssFile>", $cssFile)
$cleanedMainContent = (Get-Content "temp\new\static\framework\$mainFile" -raw) -replace '(?s).*/\*%%%INJECT\*/(?<content>.*)/\*%%%ENDINJECT\*/.*|(?<content>.*)', '${content}'
Set-Content -Path temp\newmain.js -Value ($hookFileContent | ForEach-Object { $_.Replace("//%%%INJECT", "/*%%%INJECT*/$cleanedMainContent/*%%%ENDINJECT*/") })

Copy-Item -Force temp\newmain.js "temp\new\static\framework\$mainFile"
Remove-Item "temp\new\static\framework\better-ui" -Force -Recurse -ErrorAction Ignore
Copy-Item "build\static" -force -recurse "temp\new\static\framework\better-ui"
Copy-Item "build\assets" -force -recurse "temp\new\static\framework\better-ui"

Compress-Archive -Force -Path temp\new\* temp\net.rfactor2.ui.framework.zip

Copy-Item -Force temp\net.rfactor2.ui.framework.zip $package

Remove-Item -Force -Recurse temp

Write-Host "purging cache"

$cachePath = "$rf2Path\bin\Cache"

Get-ChildItem -Path $cachePath -Directory -Recurse | ForEach-Object {
    $revisionFile = Join-Path $_.FullName "bundle.info"

    if (Test-Path $revisionFile) {
        $content = Get-Content $revisionFile -ErrorAction SilentlyContinue

        if ($content -match "ui.framework.jar") {
            Write-Host "Deleting folder: $($_.FullName)"
            Remove-Item -Path $_.FullName -Recurse -Force
        }
    }
}