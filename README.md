# 田园通 · FarmLink

> 数字乡村助农 App —— 围绕「乡村振兴」战略与「数字乡村」建设方针，
> 服务农户日常生产生活的移动应用。核心理念：**离线优先 + AI 赋能**。

## 项目特点

- **76 个功能模块**，8 大板块：AI 农业生产、流通销售、农机共享、气象灾害、惠农政策、乡村生活、数据管理、平台基础
- **24 个 AI 融合模块**，本地 Ollama 模型离线运行（RTX 5060 Laptop 8GB 可跑）
- **离线优先**：核心功能断网可用，SQLite + 同步队列
- **思政有高度**：惠农政策、党建学习、文明乡风紧扣国家战略
- **完整管理面板**：数据增删改查、API 开关、API 在线调试

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Node.js + Express + Prisma |
| 数据库 | SQLite（轻量、离线、免安装） |
| AI | Ollama 本地模型（qwen2.5 / bge-m3 / minicpm-v） |
| 管理面板 | Ant Design Pro（React + Vite） |
| 移动端 | Flutter（Android APK） |

> 强制离线部署，无 Docker，完整项目包可独立运行。

## 目录结构

```
FarmLink/
├── docs/        开发进度记录
├── backend/     Node.js 后端 + Ant Design Pro 管理面板
├── app/         Flutter 移动端
└── scripts/     本机启动与 APK 构建脚本
```

## 快速开始

```powershell
cd backend
npm run install:all      # 安装后端 + 管理面板依赖
npm run db:migrate       # 初始化数据库
npm run db:seed          # 写入种子数据
npm run dev              # 开发模式（后端 + 管理面板热更新）
```

后端 API：`http://localhost:8000/api/v1`

## 本机运行

```powershell
.\scripts\start-local.ps1
```

该脚本会启动本机后端，并构建/启动 Flutter Web 预览：

- 后端 API：`http://localhost:8000/api/v1`
- 移动端 Web：`http://localhost:5000`

## APK 构建

真机安装时，后端地址需要填写电脑在局域网中的 IP：

```powershell
.\scripts\build-apk.ps1 -ApiBaseUrl "http://192.168.1.10:8000" -Mode release
```

构建产物输出到 `dist/FarmLink.apk`。

## 开发进度

详见 [`docs/进度总览.md`](docs/进度总览.md)。
