# 分段 21 — APK 打包与本机运行

> 执行日期：2026-05-22  
> 本分段开始前已阅读：`docs/进度总览.md`、`docs/设计参考.md`、`docs/20-Flutter数据看板消息与个人中心.md`

## 本次目标

把 Flutter App 从 Web 预览推进到可生成 Android APK，并补齐本机运行脚本：

- APK 构建时可指定后端地址。
- Android 构建链路适配本机 SDK / JDK。
- 后端与移动端 Web 预览可一键启动。
- README 与进度文档同步更新。

## 已完成内容

### 1. Flutter API 地址可配置

- 修改 `app/lib/core/constants.dart`
- `kBaseUrl` 支持通过编译参数指定：

```powershell
--dart-define=FARMLINK_API_BASE_URL=http://localhost:8000
```

说明：

- Web 本机预览默认使用 `http://localhost:8000`。
- Android 真机安装时，应改为电脑在局域网内的 IP，例如 `http://192.168.1.10:8000`。

### 2. Android 构建配置适配

- 修改 `app/android/app/build.gradle.kts`
  - `targetSdk = 36`
  - `buildToolsVersion = "36.1.0"`
- 修改 `app/android/build.gradle.kts`
  - 对所有 Android application / library 子项目统一设置：
    - `compileSdkVersion(36)`
    - `buildToolsVersion("36.1.0")`
- 保留 Android 主清单中的：
  - `INTERNET`
  - `usesCleartextTraffic="true"`
  - 相机与图片读取权限

### 3. APK 构建脚本

新增 `scripts/build-apk.ps1`：

```powershell
.\scripts\build-apk.ps1 -ApiBaseUrl "http://localhost:8000" -Mode release
```

能力：

- 自动设置 JDK 17。
- 支持 `debug` / `release` 两种模式。
- 自动向 Flutter 传入 `FARMLINK_API_BASE_URL`。
- 自动复制 APK 到 `dist/FarmLink.apk`。
- 支持本地便携 CMake / Ninja 工具目录：
  - `.tools/cmake-3.22.1-windows-x86_64`
  - `.tools/ninja-win`

### 4. 本机启动脚本

新增 `scripts/start-local.ps1`：

```powershell
.\scripts\start-local.ps1
```

能力：

- 启动后端服务：`http://localhost:8000/api/v1`
- 构建并启动 Flutter Web：`http://localhost:5000`
- 输出局域网 API 地址，便于 APK 构建时填写。
- 运行日志写入 `.runtime/`，不进入 Git。

### 5. 文档与忽略规则

- README 已补充本机运行与 APK 构建方式。
- 新增根 `.gitignore`，忽略：
  - `.runtime/`
  - `.tools/`
  - `dist/`

## 验证记录

已执行：

```powershell
C:\dev\flutter\bin\flutter.bat analyze lib
C:\dev\flutter\bin\flutter.bat build web --pwa-strategy=none
node --check backend/src/server.js
node --check backend/src/modules/data/dashboard.controller.js
node --check backend/src/modules/data/sync.controller.js
node --check backend/src/modules/ai/ai.controller.js
node --check backend/src/middleware/apiControl.js
.\scripts\build-apk.ps1 -ApiBaseUrl "http://localhost:8000" -Mode release
.\scripts\start-local.ps1 -SkipWebBuild
```

结果：

- Flutter `analyze lib`：No issues found
- Flutter Web 构建成功
- 后端相关文件语法检查通过
- APK 构建成功：
  - `dist/FarmLink.apk`
  - 大小约 56 MB
- 本机启动脚本可启动：
  - 后端端口 `8000`
  - 移动端 Web 端口 `5000`

接口烟测：

- `POST /api/v1/auth/login` 登录成功
- `GET /api/v1/data/dashboard` 返回 200

## 当前注意事项

- `dist/FarmLink.apk` 为构建产物，不进入 Git。
- `.tools/` 为本机便携构建工具目录，不进入 Git。
- 真机安装 APK 前，需要让手机和电脑处在同一网络下，并使用局域网 IP 构建：

```powershell
.\scripts\build-apk.ps1 -ApiBaseUrl "http://电脑局域网IP:8000" -Mode release
```

- 如果本机已安装 Android SDK CMake / Ninja，也可以通过脚本参数指定：

```powershell
.\scripts\build-apk.ps1 -CMakeDir "C:\path\to\cmake" -NinjaDir "C:\path\to\ninja" -ApiBaseUrl "http://localhost:8000"
```
