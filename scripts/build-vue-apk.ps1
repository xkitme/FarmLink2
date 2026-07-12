param(
  [string]$ApiBaseUrl = 'http://10.0.2.2:8000',
  [ValidateSet('debug', 'release')]
  [string]$Mode = 'debug',
  [string]$JdkHome = 'C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot',
  [string]$AndroidSdk = "$env:LOCALAPPDATA\Android\sdk"
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$AppDir = Join-Path $Root 'mobile-vue'
$AndroidDir = Join-Path $AppDir 'android'
$DistDir = Join-Path $Root 'dist'
$GradleHome = Join-Path $AppDir '.gradle-user'
$Npm = if (Get-Command npm.cmd -ErrorAction SilentlyContinue) { 'npm.cmd' } else { 'npm' }

function Invoke-Checked([scriptblock]$Command) {
  & $Command
  if ($LASTEXITCODE -ne 0) { throw "Command failed with exit code $LASTEXITCODE" }
}

if (-not (Test-Path $JdkHome)) { throw "JDK not found: $JdkHome" }
if (-not (Test-Path $AndroidSdk)) { throw "Android SDK not found: $AndroidSdk" }

$env:JAVA_HOME = $JdkHome
$env:PATH = "$JdkHome\bin;$env:PATH"
$env:VITE_API_BASE_URL = $ApiBaseUrl.TrimEnd('/')

$sdkEscaped = $AndroidSdk.Replace('\', '\\')
[System.IO.File]::WriteAllText(
  (Join-Path $AndroidDir 'local.properties'),
  "sdk.dir=$sdkEscaped`n",
  [System.Text.UTF8Encoding]::new($false)
)

Push-Location $AppDir
try {
  Invoke-Checked { & $Npm run sync }
} finally {
  Pop-Location
}

Push-Location $AndroidDir
try {
  $task = if ($Mode -eq 'release') { 'assembleRelease' } else { 'assembleDebug' }
  Invoke-Checked { & '.\gradlew.bat' '--gradle-user-home' $GradleHome $task }
} finally {
  Pop-Location
}

$source = Join-Path $AndroidDir "app\build\outputs\apk\$Mode\app-$Mode.apk"
$target = Join-Path $DistDir "FarmLink-Vue-P0-$Mode.apk"
New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
Copy-Item -LiteralPath $source -Destination $target -Force

Write-Output "Vue P0 APK built: $target"
Write-Output "API base URL: $ApiBaseUrl"
Write-Output 'Flutter app/ and scripts/build-apk.ps1 were not modified.'
