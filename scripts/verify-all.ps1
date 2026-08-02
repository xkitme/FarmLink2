param(
  [switch]$SkipAdminBuild,
  [switch]$SkipWebBuild
)

$ErrorActionPreference = 'Continue'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$AppDir = Join-Path $ProjectRoot 'app'
$BackendDir = Join-Path $ProjectRoot 'backend'
$AdminDir = Join-Path $BackendDir 'admin'
$Results = [System.Collections.Generic.List[object]]::new()

function Add-Result {
  param(
    [string]$Name,
    [int]$ExitCode,
    [string]$Note = ''
  )
  $Results.Add([pscustomobject]@{
      Check = $Name
      ExitCode = $ExitCode
      Note = $Note
    })
}

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Action
  )
  Write-Host "`n===== $Name =====" -ForegroundColor Cyan
  & $Action
  $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
  Add-Result -Name $Name -ExitCode $exitCode
}

function Resolve-Flutter {
  $candidates = @(
    (Join-Path $env:LOCALAPPDATA 'flutter\bin\flutter.bat'),
    'C:\dev\flutter\bin\flutter.bat',
    'C:\flutter\bin\flutter.bat'
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }
  $command = Get-Command flutter -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }
  return $null
}

$Flutter = Resolve-Flutter
if (-not $Flutter) {
  Add-Result -Name 'toolchain: Flutter' -ExitCode 1 -Note 'Flutter not found; expected C:\dev\flutter or PATH.'
} else {
  Invoke-Step -Name 'toolchain: Flutter version' -Action { & $Flutter --version }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Add-Result -Name 'toolchain: Node.js' -ExitCode 1 -Note 'node not found.'
} else {
  Invoke-Step -Name 'toolchain: Node.js version' -Action { node --version }
}

if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
  Add-Result -Name 'toolchain: Java' -ExitCode 1 -Note 'java not found.'
} else {
  Invoke-Step -Name 'toolchain: Java version' -Action { java -version }
}

if ($Flutter) {
  Push-Location $AppDir
  Invoke-Step -Name 'Flutter pub get (offline)' -Action { & $Flutter pub get --offline }
  Invoke-Step -Name 'Flutter analyze lib' -Action { & $Flutter analyze lib }
  Invoke-Step -Name 'Flutter test' -Action { & $Flutter test }
  if (-not $SkipWebBuild) {
    Invoke-Step -Name 'Flutter build web' -Action { & $Flutter build web --debug --pwa-strategy=none }
  } else {
    Add-Result -Name 'Flutter build web' -ExitCode 0 -Note 'Skipped by parameter.'
  }
  Pop-Location
}

$backendFiles = Get-ChildItem (Join-Path $BackendDir 'src') -Recurse -File -Filter '*.js'
if (-not $backendFiles) {
  Add-Result -Name 'Backend node --check' -ExitCode 1 -Note 'No backend/src JavaScript files found.'
} else {
  $nodeFailures = 0
  foreach ($file in $backendFiles) {
    node --check $file.FullName
    if ($LASTEXITCODE -ne 0) {
      $nodeFailures++
    }
  }
  Add-Result -Name 'Backend node --check' -ExitCode $(if ($nodeFailures) { 1 } else { 0 }) -Note "$($backendFiles.Count) files"
}

$backendPackage = Join-Path $BackendDir 'package.json'
if (Test-Path -LiteralPath $backendPackage) {
  $package = Get-Content -LiteralPath $backendPackage -Raw | ConvertFrom-Json
  if ($package.scripts.PSObject.Properties.Name -contains 'test') {
    Invoke-Step -Name 'Backend tests' -Action { npm test --prefix $BackendDir }
  } else {
    Add-Result -Name 'Backend tests' -ExitCode 0 -Note 'No test script configured; recorded as baseline gap.'
  }
  if ($package.scripts.PSObject.Properties.Name -contains 'lint') {
    Invoke-Step -Name 'Backend lint' -Action { npm run lint --prefix $BackendDir }
  } else {
    Add-Result -Name 'Backend lint' -ExitCode 0 -Note 'No lint script configured; recorded as baseline gap.'
  }
}

if (-not $SkipAdminBuild) {
  if (Test-Path -LiteralPath $AdminDir) {
    $adminPackagePath = Join-Path $AdminDir 'package.json'
    $adminPackage = Get-Content -LiteralPath $adminPackagePath -Raw | ConvertFrom-Json
    Invoke-Step -Name 'Admin build' -Action { npm run build --prefix $AdminDir }
    if ($adminPackage.scripts.PSObject.Properties.Name -contains 'test') {
      Invoke-Step -Name 'Admin tests' -Action { npm test --prefix $AdminDir }
    } else {
      Add-Result -Name 'Admin tests' -ExitCode 0 -Note 'No test script configured; recorded as baseline gap.'
    }
    if ($adminPackage.scripts.PSObject.Properties.Name -contains 'lint') {
      Invoke-Step -Name 'Admin lint' -Action { npm run lint --prefix $AdminDir }
    } else {
      Add-Result -Name 'Admin lint' -ExitCode 0 -Note 'No lint script configured; recorded as baseline gap.'
    }
  } else {
    Add-Result -Name 'Admin build' -ExitCode 1 -Note 'backend/admin not found.'
  }
} else {
  Add-Result -Name 'Admin build' -ExitCode 0 -Note 'Skipped by parameter.'
}

Write-Host "`n===== Verification summary =====" -ForegroundColor Green
$Results | Format-Table -AutoSize
$failures = @($Results | Where-Object { $_.ExitCode -ne 0 })
if ($failures.Count -gt 0) {
  Write-Error "Verification failed: $($failures.Count) check(s) failed."
  exit 1
}
Write-Host 'All configured checks passed.' -ForegroundColor Green
exit 0
