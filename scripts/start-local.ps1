param(
  [int]$BackendPort = 8000,
  [int]$WebPort = 5000,
  [int]$AdminPort = 5173,
  [int]$TtsPort = 11435,
  [switch]$SkipWebBuild,
  [switch]$SkipAdmin,
  [switch]$SkipMobile,
  [switch]$SkipTts
)

# Force UTF-8 console output for Chinese log compatibility.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 > $null

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $Root 'backend'
$AdminDir = Join-Path $BackendDir 'admin'
$AppDir = Join-Path $Root 'app'
$TtsDir = Join-Path $Root 'tts'
$LogDir = Join-Path $Root '.runtime'
$Flutter = 'C:\dev\flutter\bin\flutter.bat'
if (-not (Test-Path $Flutter)) {
  $Flutter = 'flutter'
}

function Test-Command([string]$Command) {
  return $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
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
  New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
  $out = Join-Path $LogDir "$Name.out.log"
  $err = Join-Path $LogDir "$Name.err.log"
  return Start-Process `
    -FilePath $FilePath `
    -ArgumentList $Arguments `
    -WorkingDirectory $WorkingDirectory `
    -WindowStyle Hidden `
    -RedirectStandardOutput $out `
    -RedirectStandardError $err `
    -PassThru
}

function Wait-Port([int]$Port) {
  for ($i = 0; $i -lt 30; $i++) {
    $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($listening) {
      return $true
    }
    Start-Sleep -Seconds 1
  }
  return $false
}

if (-not (Test-Command 'node')) {
  throw 'Node.js was not found. Please install Node.js 18+ and make sure node is in PATH.'
}
if (-not (Test-Command 'npm.cmd') -and -not (Test-Command 'npm')) {
  throw 'npm was not found. Please install Node.js 18+.'
}
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Stop-PortProcess $BackendPort
if (-not $SkipAdmin) { Stop-PortProcess $AdminPort }
if (-not $SkipMobile) { Stop-PortProcess $WebPort }
if (-not $SkipTts) { Stop-PortProcess $TtsPort }

# Local Chinese TTS sidecar (elder-mode AI answer voice broadcast; see docs/79).
# Requires tts/ setup first (.venv + model files, see tts/README.md); skipped gracefully
# if missing. Backend does not hard-depend on it: when down, /ai/tts errors and the App
# degrades silently.
$ttsProcess = $null
$ttsSkipReason = $null
if (-not $SkipTts) {
  $ttsPython = Join-Path $TtsDir '.venv\Scripts\python.exe'
  $ttsModel = Join-Path $TtsDir 'kokoro-v1.0.onnx'
  if ((Test-Path $ttsPython) -and (Test-Path $ttsModel)) {
    $env:PYTHONUTF8 = '1'
    $env:TTS_PORT = "$TtsPort"
    $ttsProcess = Start-HiddenProcess -FilePath $ttsPython -Arguments @('tts_server.py') -WorkingDirectory $TtsDir -Name 'tts'
  } else {
    $ttsSkipReason = 'tts/.venv or model file missing - run tts/ setup (see tts/README.md)'
  }
}

$env:PORT = "$BackendPort"
$env:FARMLINK_BACKEND_PORT = "$BackendPort"
$backendProcess = Start-HiddenProcess -FilePath 'node' -Arguments @('src/server.js') -WorkingDirectory $BackendDir -Name 'backend'

$adminProcess = $null
if (-not $SkipAdmin) {
  $npm = if (Test-Command 'npm.cmd') { 'npm.cmd' } else { 'npm' }
  $adminProcess = Start-HiddenProcess `
    -FilePath $npm `
    -Arguments @('run', 'dev', '--', '--host', '0.0.0.0', '--port', "$AdminPort") `
    -WorkingDirectory $AdminDir `
    -Name 'admin'
}

$mobileProcess = $null
if (-not $SkipMobile -and -not $SkipWebBuild) {
  Push-Location $AppDir
  try {
    # --no-web-resources-cdn：自托管 canvaskit，离线环境也能渲染（不依赖 gstatic CDN）
    & $Flutter build web --pwa-strategy=none --no-web-resources-cdn --dart-define=FARMLINK_API_BASE_URL=http://localhost:$BackendPort
  } finally {
    Pop-Location
  }
}

if (-not $SkipMobile) {
  $env:PORT = "$WebPort"
  $mobileProcess = Start-HiddenProcess `
    -FilePath 'node' `
    -Arguments @('serve_web.mjs') `
    -WorkingDirectory $AppDir `
    -Name 'mobile-web'
}

$backendReady = Wait-Port $BackendPort
if ($ttsProcess) {
  $ttsReady = Wait-Port $TtsPort
} else {
  $ttsReady = $null
}
if (-not $SkipAdmin) {
  $adminReady = Wait-Port $AdminPort
} else {
  $adminReady = $null
}
if (-not $SkipMobile) {
  $mobileReady = Wait-Port $WebPort
} else {
  $mobileReady = $null
}

$lanIp = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Select-Object -First 1 -ExpandProperty IPAddress

Write-Output ""
Write-Output "FarmLink local services are running."
Write-Output "Backend API:  http://localhost:$BackendPort/api/v1  (PID $($backendProcess.Id), Ready $backendReady)"
if ($ttsProcess) {
  Write-Output "TTS engine:   http://localhost:$TtsPort  (PID $($ttsProcess.Id), Ready $ttsReady)"
} elseif ($ttsSkipReason) {
  Write-Output "TTS engine:   skipped - $ttsSkipReason"
}
if (-not $SkipAdmin) {
  Write-Output "Admin panel:  http://localhost:$AdminPort/admin/  (PID $($adminProcess.Id), Ready $adminReady)"
}
if (-not $SkipMobile) {
  Write-Output "Mobile web:   http://localhost:$WebPort  (PID $($mobileProcess.Id), Ready $mobileReady)"
}
if ($lanIp) {
  Write-Output "LAN API:      http://$lanIp`:$BackendPort/api/v1"
}
Write-Output "Logs:         $LogDir"
Write-Output ""
Write-Output "Run again to restart occupied ports, or stop ports manually if needed."

$summary = @(
  "FarmLink local services are running.",
  "Backend API:  http://localhost:$BackendPort/api/v1  (PID $($backendProcess.Id), Ready $backendReady)",
  $(if ($ttsProcess) { "TTS engine:   http://localhost:$TtsPort  (PID $($ttsProcess.Id), Ready $ttsReady)" }),
  $(if (-not $SkipAdmin) { "Admin panel:  http://localhost:$AdminPort/admin/  (PID $($adminProcess.Id), Ready $adminReady)" }),
  $(if (-not $SkipMobile) { "Mobile web:   http://localhost:$WebPort  (PID $($mobileProcess.Id), Ready $mobileReady)" }),
  $(if ($lanIp) { "LAN API:      http://$lanIp`:$BackendPort/api/v1" }),
  "Logs:         $LogDir"
) | Where-Object { $_ }
$summary | Set-Content -Path (Join-Path $LogDir 'start-summary.txt') -Encoding UTF8
