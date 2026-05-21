@echo off
chcp 65001 >nul
echo.
echo  =========================================
echo   墨脉 InkFlow - 一键启动（生产模式）
echo  =========================================
echo.

cd /d "%~dp0"

echo [1/3] 安装依赖...
call npm run install:all

echo [2/3] 构建管理面板...
call npm run build:admin
if errorlevel 1 (
  echo 构建失败，请检查 admin/ 目录
  pause
  exit /b 1
)

echo [3/3] 启动服务...
echo.
echo  访问地址: http://localhost:8000
echo  管理账号: admin / inkflow2025
echo.

call npm run start
pause
