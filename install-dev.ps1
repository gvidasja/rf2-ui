$rf2Path="F:\games\steamapps\common\rFactor 2"
$packageFile="net.rfactor2.ui.framework.jar"
$package="$rf2Path\bin\Bundles\$packageFile"

yarn build

mkdir -Force temp
mkdir -Force temp\new
cp $package temp
tar -xf "temp\$packageFile" -C temp\new

$mainFile = (Get-ChildItem -File -Filter "temp\new\static\framework\main-*" | Select-Object -First 1)[0].Name
$jsFile = (Get-ChildItem -File -Filter "build\static\js\*.js" | Select-Object -First 1)[0].Name
$cssFile = (Get-ChildItem -File -Filter "build\static\css\*.css" | Select-Object -First 1)[0].Name

$hookFileContent = ((Get-Content scripts\hook.js -raw) -replace "<jsFile>",$jsFile -replace "<cssFile>",$cssFile)
$cleanedMainContent = (Get-Content "temp\new\static\framework\$mainFile" -raw) -replace '(?s).*/\*%%%INJECT\*/(?<content>.*)/\*%%%ENDINJECT\*/.*|(?<content>.*)','${content}'
Set-Content -Path temp\newmain.js -Value ($hookFileContent | %{$_.Replace("//%%%INJECT", "/*%%%INJECT*/$cleanedMainContent/*%%%ENDINJECT*/")})

Copy-Item -Force temp\newmain.js "temp\new\static\framework\$mainFile"
Remove-Item "temp\new\static\framework\better-ui" -Force -Recurse -ErrorAction Ignore
Copy-Item "build\static" -force -recurse "temp\new\static\framework\better-ui"
Copy-Item "build\assets" -force -recurse "temp\new\static\framework\better-ui"

Compress-Archive -Force -Path temp\new\* temp\net.rfactor2.ui.framework.zip

Copy-Item -Force temp\net.rfactor2.ui.framework.zip $package

Remove-Item -Force -Recurse temp
