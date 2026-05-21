@echo off
chcp 65001 >nul
echo.
echo  =========================================
echo   墨脉 InkFlow - 开发模式（热更新）
echo  =========================================
echo.
echo  后端 API:  http://localhost:8000
echo  管理面板:  http://localhost:3001
echo.

cd /d "%~dp0"
call npm install
npm run dev
