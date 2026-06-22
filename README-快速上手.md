# 田园通 · 快速上手指南

**前端与后端的启动流程**。按照步骤操作即可在本地运行整套系统。

> - 想了解项目定位与功能，请阅读 [`docs/项目介绍.md`](docs/项目介绍.md)。
> - 需要完整的技术文档与故障排查，请阅读 [`README.md`](README.md)。

---

## 一、系统由哪几部分组成

| 组成部分 | 作用 | 运行端口 |
|---|---|---|
| **后端服务** | 系统核心，承载全部业务数据与接口，并负责 AI 能力编排 | 8000 |
| **管理面板** | 网页端后台，用于数据管理、接口开关、在线调试与系统监控 | 5173 |
| **移动端 App** | 农户使用的主应用，可编译为网页预览或打包为 Android APK | 5000（Web 预览） |
| **AI 服务（可选）** | 基于 Ollama 的本地大模型；未安装时自动使用规则引擎 | 11434 |

三者的关系：**后端是中心，移动端 App 与管理面板都通过接口连接后端**。因此运行系统时，应先确保后端服务正常启动。

---

## 二、运行环境要求

- **Node.js 18 及以上**：运行后端与管理面板（必需）
- **Flutter 3.3 及以上**：运行或打包移动端 App（仅在需要时安装）
- **Ollama**：用于 AI 增强能力（可选；未安装时 AI 功能由规则引擎兜底）

---

## 三、首次准备（仅需执行一次）

第一次获取代码后，需要安装依赖并初始化数据库。在项目根目录打开终端：

```powershell
cd backend
copy .env.example .env      # ① 复制环境变量配置（缺少此步会提示 DATABASE_URL not found）
mkdir ..\data               # ② 创建 SQLite 数据库目录
npm run install:all         # ③ 安装后端与管理面板依赖
npm run db:push             # ④ 在 SQLite 中创建数据表结构
npm run db:seed             # ⑤ 写入演示数据（内置账号、商品、农事记录等）
```

> macOS / Linux 环境下：`copy` 改为 `cp`，`mkdir ..\data` 改为 `mkdir -p ../data`。

移动端 App 首次运行前，还需安装其依赖：

```powershell
cd app
flutter pub get
```

完成以上步骤后，本地环境即准备就绪。

---

## 四、启动方式（推荐：一键启动）

回到项目**根目录**，执行一条命令即可启动全部服务：

```powershell
.\start.bat
```

启动完成后，三个服务的访问地址如下：

| 服务 | 访问地址 |
|---|---|
| 后端接口 | http://localhost:8000/api/v1 |
| 管理面板 | http://localhost:5173/admin/ |
| 移动端 Web 预览 | http://localhost:5000 |

运行日志保存在 `.runtime/` 目录。再次执行 `.\start.bat` 会自动清理被占用的端口后重新启动。

常用参数：

```powershell
.\start.bat -SkipWebBuild     # 跳过移动端 Web 重新编译（仅调试后端时可节省时间）
.\start.bat -SkipAdmin        # 不启动管理面板
.\start.bat -SkipMobile       # 不启动移动端 Web 预览
```

---

## 五、启动方式（备选：分项手动启动）

若只需运行其中某一端，或希望在不同终端窗口分别查看日志，可按以下方式分项启动。

### 1. 后端服务（仅 API）

```powershell
cd backend
npm run dev:backend
```

服务监听 `http://localhost:8000/api/v1`。该命令底层为 `nodemon src/server.js`，**修改后端代码后会自动重启**。

### 2. 管理面板（独立运行）

```powershell
cd backend/admin
npm install        # 仅首次需要
npm run dev
```

访问 http://localhost:5173/admin/ ，使用 `admin / 123456` 登录。
**管理面板需要后端先启动，否则页面无法正常调用接口。**

### 3. 后端 + 管理面板（同时启动）

```powershell
cd backend
npm run dev
```

该命令通过 concurrently 同时启动后端（nodemon）与管理面板（Vite），但不启动移动端 Web。

### 4. 移动端 Web 预览

```powershell
cd app
flutter pub get      # 仅首次需要
flutter build web    # 编译 Web 包
node serve_web.mjs   # 启动静态服务器
```

访问 http://localhost:5000 即可查看移动端界面。默认连接 `http://localhost:8000` 的后端服务。

---

## 六、打包 Android APK（可选）

在真机上运行时，后端地址需填写运行后端的电脑在局域网中的 IP（可用 `ipconfig` 查询），且手机与电脑需处于同一局域网：

```powershell
.\scripts\build-apk.ps1 -ApiBaseUrl "http://192.168.1.10:8000" -Mode release
```

构建产物输出至 `dist/FarmLink.apk`。若手机无法连接后端，通常是 Windows 防火墙拦截了 8000 端口的入站请求，放行 Node 进程即可。

---

## 七、内置账号（演示用，密码均为 123456）

| 账号 | 角色 |
|---|---|
| `farmer` | 普通农户 |
| `bigfarmer` | 种植大户 |
| `village` | 村委干部 |
| `merchant` | 收购商 |
| `admin` | 平台管理员（管理面板使用此账号登录） |

---

## 八、启用真实 AI 能力（可选）

未安装 Ollama 时，AI 接口会通过规则引擎返回可用结果。如需启用真实的大模型问答与图像识别：

1. 安装 [Ollama](https://ollama.com)，并拉取所需模型（问答 `qwen2.5`、图像识别 `minicpm-v`）。
2. **先启动 Ollama，再启动后端**——后端在启动时会检测 Ollama，只有 Ollama 在线才会启用大模型。
3. 之后照常执行 `.\start.bat`。

---

## 九、常见问题

1. **提示 `DATABASE_URL not found`**：第三步遗漏了 `copy .env.example .env`，请先复制配置文件。
2. **拉取新代码后接口报 500（`Unknown field xxx`）**：后端代码使用了新字段，但本机数据库尚未同步。请先**停止后端进程**（Windows 上后端运行时 Prisma 会因引擎 DLL 被占用而报 EPERM），再执行 `cd backend && npm run db:push`，然后重启后端。
3. **管理面板页面为空或无法加载数据**：后端未启动，或未运行在 8000 端口。
4. **全新克隆的项目请勿使用 `prisma migrate`**：本项目数据库通过 `db:push` 维护，没有迁移基线，统一使用 `npm run db:push`。
5. **修改后端无需重新打包 APK**：接口未变，App 刷新即可生效；仅当修改移动端代码时才需重新编译或打包。
