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

# ── 正式库指纹保护（BEFORE） ──
$VillageDb = Join-Path $BackendDir 'data\village.db'
$dbFingerprintBefore = $null
if (Test-Path -LiteralPath $VillageDb) {
  $dbFingerprintBefore = @{
    Sha256 = (Get-FileHash -LiteralPath $VillageDb -Algorithm SHA256).Hash
    Size = (Get-Item -LiteralPath $VillageDb).Length
    Mtime = (Get-Item -LiteralPath $VillageDb).LastWriteTimeUtc.ToString('o')
  }
  Write-Host "village.db fingerprint (before): SHA256=$($dbFingerprintBefore.Sha256) Size=$($dbFingerprintBefore.Size) Mtime=$($dbFingerprintBefore.Mtime)"
} else {
  Write-Host "WARNING: village.db not found at $VillageDb; fingerprint protection skipped."
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

# node --check: backend/src + backend/test (116d extend)
$backendSrcFiles = Get-ChildItem (Join-Path $BackendDir 'src') -Recurse -File -Filter '*.js'
$backendTestFiles = Get-ChildItem (Join-Path $BackendDir 'test') -Recurse -File -Filter '*.js' -ErrorAction SilentlyContinue
$backendAllFiles = @($backendSrcFiles) + @($backendTestFiles)
if ($backendAllFiles.Count -eq 0) {
  Add-Result -Name 'Backend node --check' -ExitCode 1 -Note 'No backend JavaScript files found.'
} else {
  $nodeFailures = 0
  foreach ($file in $backendAllFiles) {
    node --check $file.FullName
    if ($LASTEXITCODE -ne 0) {
      $nodeFailures++
    }
  }
  Add-Result -Name 'Backend node --check' -ExitCode $(if ($nodeFailures) { 1 } else { 0 }) -Note "$($backendAllFiles.Count) files (src + test)"
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

# Admin build (skippable via -SkipAdminBuild)
if (Test-Path -LiteralPath $AdminDir) {
  if (-not $SkipAdminBuild) {
    Invoke-Step -Name 'Admin build' -Action { npm run build --prefix $AdminDir }
  } else {
    Add-Result -Name 'Admin build' -ExitCode 0 -Note 'Skipped by parameter.'
  }
  # Admin tests are pure Node, no Vite build required — always run
  $adminPackagePath = Join-Path $AdminDir 'package.json'
  $adminPackage = Get-Content -LiteralPath $adminPackagePath -Raw | ConvertFrom-Json
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

# ── 正式库指纹保护（AFTER） ──
if ($dbFingerprintBefore) {
  if (-not (Test-Path -LiteralPath $VillageDb)) {
    Write-Host "ERROR: village.db was removed during verification!" -ForegroundColor Red
    Add-Result -Name 'village.db fingerprint' -ExitCode 1 -Note 'village.db existed before verification but is now missing.'
  } else {
    $dbFingerprintAfter = @{
      Sha256 = (Get-FileHash -LiteralPath $VillageDb -Algorithm SHA256).Hash
      Size = (Get-Item -LiteralPath $VillageDb).Length
      Mtime = (Get-Item -LiteralPath $VillageDb).LastWriteTimeUtc.ToString('o')
    }
    Write-Host "village.db fingerprint (after):  SHA256=$($dbFingerprintAfter.Sha256) Size=$($dbFingerprintAfter.Size) Mtime=$($dbFingerprintAfter.Mtime)"
    $dbTampered = ($dbFingerprintBefore.Sha256 -ne $dbFingerprintAfter.Sha256) -or
                  ($dbFingerprintBefore.Size -ne $dbFingerprintAfter.Size) -or
                  ($dbFingerprintBefore.Mtime -ne $dbFingerprintAfter.Mtime)
    if ($dbTampered) {
      Write-Host "ERROR: village.db tampered!" -ForegroundColor Red
      Write-Host "  Before: SHA256=$($dbFingerprintBefore.Sha256) Size=$($dbFingerprintBefore.Size) Mtime=$($dbFingerprintBefore.Mtime)"
      Write-Host "  After:  SHA256=$($dbFingerprintAfter.Sha256) Size=$($dbFingerprintAfter.Size) Mtime=$($dbFingerprintAfter.Mtime)"
      Add-Result -Name 'village.db fingerprint' -ExitCode 1 -Note 'village.db was modified during test run (tampered).'
    } else {
      Add-Result -Name 'village.db fingerprint' -ExitCode 0 -Note 'SHA256/Size/Mtime unchanged.'
    }
  }
} elseif (Test-Path -LiteralPath $VillageDb) {
  Write-Host "ERROR: village.db appeared during verification!" -ForegroundColor Red
  Add-Result -Name 'village.db fingerprint' -ExitCode 1 -Note 'village.db was absent before verification but appeared during the run.'
} else {
  Add-Result -Name 'village.db fingerprint' -ExitCode 0 -Note 'village.db absent before and after; protection skipped.'
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
