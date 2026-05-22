param(
  [int]$BackendPort = 8000,
  [int]$WebPort = 5000,
  [switch]$SkipWebBuild
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $Root 'backend'
$AppDir = Join-Path $Root 'app'
$Flutter = 'C:\dev\flutter\bin\flutter.bat'
if (-not (Test-Path $Flutter)) {
  $Flutter = 'flutter'
}

function Stop-PortProcess([int]$Port) {
  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($connection in $connections) {
    if ($connection.OwningProcess) {
      Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }
}

function Start-HiddenProcess([string]$FilePath, [string[]]$Arguments, [string]$WorkingDirectory, [string]$Name) {
  $LogDir = Join-Path $Root '.runtime'
  New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
  $out = Join-Path $LogDir "$Name.out.log"
  $err = Join-Path $LogDir "$Name.err.log"
  Start-Process `
    -FilePath $FilePath `
    -ArgumentList $Arguments `
    -WorkingDirectory $WorkingDirectory `
    -WindowStyle Hidden `
    -RedirectStandardOutput $out `
    -RedirectStandardError $err
}

Stop-PortProcess $BackendPort
Stop-PortProcess $WebPort

$env:PORT = "$BackendPort"
Start-HiddenProcess -FilePath 'node' -Arguments @('src/server.js') -WorkingDirectory $BackendDir -Name 'backend'

if (-not $SkipWebBuild) {
  Push-Location $AppDir
  try {
    & $Flutter build web --pwa-strategy=none
  } finally {
    Pop-Location
  }
}

Start-HiddenProcess `
  -FilePath 'python' `
  -Arguments @('-m', 'http.server', "$WebPort", '--directory', 'build/web') `
  -WorkingDirectory $AppDir `
  -Name 'mobile-web'

Start-Sleep -Seconds 3

$lanIp = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Select-Object -First 1 -ExpandProperty IPAddress

Write-Host "FarmLink local services are running."
Write-Host "Backend API: http://localhost:$BackendPort/api/v1"
Write-Host "Mobile web:  http://localhost:$WebPort"
if ($lanIp) {
  Write-Host "LAN API:     http://$lanIp`:$BackendPort/api/v1"
}
