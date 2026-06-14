# 启动本地 Kokoro 中文 TTS sidecar（仿 ollama 的本地常驻服务，默认 127.0.0.1:11435）。
# 需先完成 setup（见 README.md）：建 .venv、装依赖、下模型文件到本目录。
# 用法：在 tts/ 目录下  ./start.ps1   （建议先于后端启动）
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here
$env:PYTHONUTF8 = "1"
& "$here\.venv\Scripts\python.exe" "$here\tts_server.py"
