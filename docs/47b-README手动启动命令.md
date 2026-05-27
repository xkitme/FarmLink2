# 分段 47b — README 补手动启动命令（GitHub issue #2）

> 工作单（Codex 实施）。所属批次：[47-GitHub-issues处理](47-GitHub-issues处理.md)。
> 解决 GitHub issue #2「readme 文件缺少手动启动命令」（作者 yzk225）。
>
> 完成后关闭 issue #2。

## 一、现状

`README.md` 第六节「快速开始」只有一键 `start.bat` / `start-local.ps1`，没有分项手动命令。
用户要分别启动后端 / 管理台 / Flutter 时不知道用哪条命令。

## 二、改动清单

### `README.md` 第六节「快速开始」修订

在「2. 一键启动全部服务」之后、「3. 构建 Android APK」之前，**新增一节** `### 2.1 手动分项启动`：

```markdown
### 2.1 手动分项启动

如果只想跑单端，或要在不同终端窗口分别看日志，可分项启动：

#### 后端（仅 API）

```powershell
cd backend
npm run dev:backend
```

后端会在 `http://localhost:8000/api/v1` 监听。日志直接在窗口里。
等价于 `nodemon src/server.js`，文件改动自动重启。

#### 管理面板（独立 Vite）

```powershell
cd backend/admin
npm install        # 首次需要
npm run dev
```

管理面板会在 `http://localhost:5173/admin/` 打开。需要后端先跑起来才能调接口。

#### 后端 + 管理面板（双进程并行）

如果想一条命令并行，但不要 Flutter，跑：

```powershell
cd backend
npm run dev
```

会用 `concurrently` 同时启动 nodemon（后端）+ vite（管理面板）。

#### Flutter 移动端 Web 预览

```powershell
cd app
flutter pub get      # 首次需要
flutter build web    # 编译 web bundle
node serve_web.mjs   # 启静态服务器
```

打开 `http://localhost:5000` 看移动端 UI。
后端默认按 `http://localhost:8000` 调用，可通过 `--dart-define=FARMLINK_API_BASE_URL=http://x.x.x.x:8000` 改远程地址。

#### Flutter 移动端 APK

参见下面 [3. 构建 Android APK](#3-构建-android-apk)。
```

### 关于 `npm run dev:backend`

当前 `backend/package.json` 只有 `dev`（并行后端+管理台），没有单独的 `dev:backend`。
本工作单**顺手在 `backend/package.json` 加一条**：

```json
"dev:backend": "nodemon src/server.js",
```

`scripts` 块结构示例（保留原有项，**只新增 dev:backend 一行**）：

```json
{
  "scripts": {
    "dev":         "concurrently -n backend,admin -c bgBlue,bgGreen \"nodemon src/server.js\" \"npm run dev --prefix admin\"",
    "dev:backend": "nodemon src/server.js",
    "start":       "npm run build:admin && cross-env NODE_ENV=production node src/server.js",
    ...
  }
}
```

> 如果新增 script 在 `dev:backend` 让 README 示例的 `npm run dev:backend` 命令能跑通。

### 关于环境要求段补充

`README.md` 第六节「环境要求」补一条：

```markdown
- Git Bash / Windows Terminal（推荐，避免 cmd 中文乱码；旧版 cmd 也可用，已在脚本里 `chcp 65001`）
```

> 该条与 47a 修复呼应。

## 三、验收

1. 阅读修订后的 `README.md`，按「2.1 手动分项启动」逐条复制命令到 PowerShell 跑：
   - `cd backend && npm run dev:backend` → 后端单独启动，监听 8000
   - 另一窗口 `cd backend/admin && npm run dev` → 管理面板单独启动
   - 第三窗口 `cd app && flutter build web && node serve_web.mjs` → Web 预览
   - 全部通过 = 验收过
2. Codex 完成后关 issue：
   ```powershell
   & "C:\Program Files\GitHub CLI\gh.exe" issue close 2 --repo xkitme/FarmLink --comment "已在 README 第六节新增「2.1 手动分项启动」章节，并补 backend dev:backend script。详见 docs/47b-README手动启动命令.md。"
   ```

## 四、不在范围内

- 不重写整个 README 的结构
- 不动 Flutter 项目自身的 build 配置
- 不增加 npm scripts 之外的工具链改动

## 五、关联

- 总览：[47-GitHub-issues处理.md](47-GitHub-issues处理.md)
- 关联 47a：cmd 乱码修复（README 顺手提一句）
- GitHub issue：https://github.com/xkitme/FarmLink/issues/2

## 六、实施备注（Codex 完成后填写）

- `README.md` 第六节「环境要求」已补 Git Bash / Windows Terminal 推荐项，并说明旧版 cmd 可通过启动脚本 UTF-8 设置正常使用。
- `README.md` 已新增「2.1 手动分项启动」，覆盖后端单独启动、管理面板单独启动、后端 + 管理面板并行、Flutter Web 预览与 APK 指引。
- `backend/package.json` 中已确认存在 `dev:backend: nodemon src/server.js`，无需重复修改。
- 验证：`npm --prefix backend run dev:backend -- --help` 能调用 nodemon；`npm --prefix backend/admin run dev -- --help` 能调用 Vite；`node --check app/serve_web.mjs` 通过。
