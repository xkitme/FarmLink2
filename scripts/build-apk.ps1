param(
  [string]$ApiBaseUrl = 'http://localhost:8000',
  [ValidateSet('debug', 'release')]
  [string]$Mode = 'release',
  [string]$JdkHome = 'C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot',
  [string]$CMakeDir = '',
  [string]$NinjaDir = '',
  [switch]$Clean
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$AppDir = Join-Path $Root 'app'
$DistDir = Join-Path $Root 'dist'
$Flutter = 'C:\dev\flutter\bin\flutter.bat'
$AndroidLocalProperties = Join-Path $AppDir 'android\local.properties'

if (-not (Test-Path $Flutter)) {
  $Flutter = 'flutter'
}

function Invoke-Checked([scriptblock]$Command) {
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code $LASTEXITCODE"
  }
}

function Set-LocalProperty([string]$Name, [string]$Value) {
  $escaped = $Value.Replace('\', '\\')
  $lines = @()
  if (Test-Path $AndroidLocalProperties) {
    $lines = Get-Content -Encoding UTF8 $AndroidLocalProperties
  }
  $next = "$Name=$escaped"
  $updated = $false
  $lines = $lines | ForEach-Object {
    if ($_ -match "^$([Regex]::Escape($Name))=") {
      $updated = $true
      $next
    } else {
      $_
    }
  }
  if (-not $updated) {
    $lines += $next
  }
  [System.IO.File]::WriteAllLines(
    $AndroidLocalProperties,
    [string[]]$lines,
    [System.Text.UTF8Encoding]::new($false)
  )
}

if (-not $CMakeDir) {
  $candidate = Join-Path $Root '.tools\cmake-3.22.1-windows-x86_64'
  if (Test-Path (Join-Path $candidate 'bin\cmake.exe')) {
    $CMakeDir = $candidate
  }
}
if (-not $NinjaDir) {
  $candidate = Join-Path $Root '.tools\ninja-win'
  if (Test-Path (Join-Path $candidate 'ninja.exe')) {
    $NinjaDir = $candidate
  }
}

Push-Location $AppDir
try {
  if (Test-Path $JdkHome) {
    Invoke-Checked { & $Flutter config "--jdk-dir=$JdkHome" }
  }
  if ($CMakeDir -and (Test-Path (Join-Path $CMakeDir 'bin\cmake.exe'))) {
    Set-LocalProperty -Name 'cmake.dir' -Value $CMakeDir
    $env:PATH = "$(Join-Path $CMakeDir 'bin');$env:PATH"
  }
  if ($NinjaDir -and (Test-Path (Join-Path $NinjaDir 'ninja.exe'))) {
    $env:PATH = "$NinjaDir;$env:PATH"
  }

  if ($Clean) {
    Invoke-Checked { & $Flutter clean }
  }

  Invoke-Checked { & $Flutter pub get }
  Invoke-Checked { & $Flutter build apk "--$Mode" "--dart-define=FARMLINK_API_BASE_URL=$ApiBaseUrl" }

  New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
  $source = Join-Path $AppDir "build\app\outputs\flutter-apk\app-$Mode.apk"
  $target = Join-Path $DistDir 'FarmLink.apk'
  Copy-Item -LiteralPath $source -Destination $target -Force

  Write-Host "APK built: $target"
  Write-Host "API base URL: $ApiBaseUrl"
} finally {
  Pop-Location
}
