@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo Starting FarmLink local services...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local.ps1" %*
if errorlevel 1 (
  echo FarmLink startup failed. Check .runtime logs for details.
  exit /b %errorlevel%
)
echo.
echo FarmLink local services are running.
echo Backend API:  http://localhost:8000/api/v1
echo Admin panel:  http://localhost:5173/admin/
echo Mobile web:   http://localhost:5000
echo Logs:         %~dp0.runtime
