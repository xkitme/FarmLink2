# InkFlow Flutter 安装脚本
# 在 PowerShell 中运行：.\setup.ps1

$flutterZip = "C:\dev\flutter.zip"
$flutterDir = "C:\dev\flutter"

Write-Host "=== 墨脉 InkFlow — Flutter 安装 ===" -ForegroundColor Yellow

# 1. 解压
if (Test-Path $flutterZip) {
    Write-Host "[1/3] 解压 Flutter SDK..." -ForegroundColor Cyan
    Expand-Archive -Path $flutterZip -DestinationPath "C:\dev" -Force
    Remove-Item $flutterZip -Force
    Write-Host "      解压完成" -ForegroundColor Green
} else {
    Write-Host "[1/3] 跳过解压（已存在）" -ForegroundColor Gray
}

# 2. 写入 PATH（当前用户永久生效）
Write-Host "[2/3] 配置 PATH..." -ForegroundColor Cyan
$flutterBin = "$flutterDir\bin"
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($currentPath -notlike "*$flutterBin*") {
    [Environment]::SetEnvironmentVariable(
        "PATH",
        "$flutterBin;$currentPath",
        "User"
    )
    $env:PATH = "$flutterBin;$env:PATH"
    Write-Host "      PATH 已更新" -ForegroundColor Green
} else {
    Write-Host "      PATH 已包含 Flutter" -ForegroundColor Gray
}

# 3. 接受 Android 许可
Write-Host "[3/3] 运行 flutter doctor..." -ForegroundColor Cyan
& "$flutterBin\flutter.bat" doctor --android-licenses --no-version-check 2>&1 | Out-Null
& "$flutterBin\flutter.bat" doctor 2>&1

Write-Host ""
Write-Host "=== 完成！现在运行以下命令创建项目 ===" -ForegroundColor Yellow
Write-Host "cd D:\dgitc_project\InkFlow\app" -ForegroundColor White
Write-Host "flutter create . --project-name inkflow --org com.inkflow --platforms android" -ForegroundColor White
Write-Host "flutter pub get" -ForegroundColor White
Write-Host "flutter build apk --release" -ForegroundColor White
