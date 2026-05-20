# 墨脉 · InkFlow

> 以 AI 为引擎，让中华传统文化「活」起来

一款融合人工智能的中华传统文化学习 App，支持诗词、书法、国学、历史、节气民俗等多维度内容，通过本地 AI 模型实现智能问答、古文翻译、书法点评、历史人物对话等功能。

---

## 功能亮点

| 模块 | 功能 |
|------|------|
| 诗词歌赋 | 注释赏析、跟读评分、AI 辅助创作律诗词 |
| 书法篆刻 | 作品上传、AI 视觉点评（结构/笔力/章法）|
| 国学经典 | 四书五经精读、AI 哲学问答 |
| 历史典故 | 朝代时间轴、成语溯源、人物图谱 |
| 节气民俗 | 二十四节气动态日历、当日文化推送 |
| AI 文化向导 | 全局智能问答，支持追问和深度解析 |
| 历史人物对话 | 扮演孔子、李白、苏轼等人物沉浸式对话 |
| 古文翻译 | 古文 ↔ 现代文双向翻译，逐句解析 |
| 学习路径 | 个性化计划 + 艾宾浩斯复习调度 |
| 社区广场 | 书法/诗词作品展示、每日挑战排行榜 |
| 成就系统 | 白丁 → 状元十级称号体系 |

---

## 技术架构

```
客户端（Flutter Web）
        ↓ HTTP / SSE
     Nginx（静态托管 + 反向代理）
        ↓
   FastAPI 后端（Python 3.12）
        ↓
┌───────────────────────────────────┐
│  SQLite（主数据库 + FTS5 搜索）   │
│  Redis（会话缓存 + 限流）         │
│  ChromaDB（向量语义搜索）         │
│  Ollama（本地 AI 推理）           │
│    ├── qwen2.5:7b（对话/创作）    │
│    └── minicpm-v（书法视觉点评）  │
└───────────────────────────────────┘
```

### 技术选型

| 层级 | 技术 |
|------|------|
| 前端 | Flutter 3.x（Web 构建） |
| 后端 | FastAPI + SQLAlchemy 2.0（async） |
| 数据库 | SQLite（WAL 模式） |
| 缓存 | Redis 7 |
| 全文搜索 | SQLite FTS5 |
| 向量搜索 | ChromaDB（本地） |
| AI 推理 | Ollama（离线本地） |
| 主模型 | qwen2.5:7b-instruct-q4_K_M |
| 视觉模型 | minicpm-v:8b-2.6-q4_K_M |
| 容器化 | Docker Compose |

---

## 目录结构

```
InkFlow/
├── backend/                   后端（FastAPI）
│   ├── main.py
│   ├── core/                  配置、数据库、安全
│   ├── models/                SQLAlchemy 数据模型
│   ├── routers/               API 路由
│   ├── services/              业务逻辑（AI、学习引擎等）
│   ├── seeds/                 初始文化内容数据
│   ├── data/                  SQLite 文件 + 上传目录
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                  前端（Flutter）
│   ├── lib/
│   └── build/                 构建产物（Nginx 托管）
├── models/                    Ollama 模型文件（离线包）
├── docker-compose.yml
├── nginx.conf
├── start.bat                  Windows 一键启动
└── README.md
```

---

## 快速启动

### 环境要求

- Windows 10/11，64 位
- Docker Desktop（已启用 WSL2）
- NVIDIA GPU + CUDA 驱动（推荐 RTX 系列，8GB+ VRAM）
- NVIDIA Container Toolkit

### 一键启动（离线模式）

```bash
# 克隆项目
git clone https://github.com/hczdngr/InkFlow.git
cd InkFlow

# 启动所有服务
docker compose up -d

# 初始化数据库和文化内容数据
docker compose exec backend python seeds/init_data.py

# 打开应用
start http://localhost:3000
```

或直接运行 Windows 启动脚本：

```
双击 start.bat
```

### 服务端口

| 服务 | 地址 |
|------|------|
| 前端（App） | http://localhost:3000 |
| 后端 API | http://localhost:8000 |
| API 文档 | http://localhost:8000/docs |
| Ollama | http://localhost:11434 |

---

## AI 模型说明

本项目使用 **Ollama** 在本地运行大语言模型，无需联网，完全离线可用。

| 模型 | 用途 | VRAM |
|------|------|------|
| `qwen2.5:7b-instruct-q4_K_M` | 对话/翻译/诗词创作/出题 | ~4.5GB |
| `minicpm-v:8b-2.6-q4_K_M` | 书法作品视觉点评 | ~5GB |
| `nomic-embed-text` | 语义向量搜索 | ~0.3GB |

> 推荐在 RTX 5060 Laptop 及以上 GPU 运行，显存 8GB+。

**模型预下载**（有网络环境时执行一次）：

```bash
ollama pull qwen2.5:7b-instruct-q4_K_M
ollama pull minicpm-v:8b-2.6-q4_K_M
ollama pull nomic-embed-text
```

---

## API 文档

启动后访问 [http://localhost:8000/docs](http://localhost:8000/docs) 查看完整 Swagger 文档。

核心接口分组：

- `/api/auth` — 认证登录
- `/api/contents` — 文化内容
- `/api/ai` — AI 功能（支持 SSE 流式输出）
- `/api/learning` — 学习进度与复习
- `/api/works` — 社区作品
- `/api/achievements` — 成就与排行

---

## 开发

### 后端本地开发

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 前端本地开发

```bash
cd frontend
flutter pub get
flutter run -d chrome
```

### 构建前端

```bash
cd frontend
flutter build web --release
# 产物在 frontend/build/web/，复制到 frontend/build/ 供 Nginx 托管
```

---

## 数据初始化说明

`seeds/init_data.py` 会向 SQLite 写入：

- 诗词内容（唐诗宋词精选）
- 历史典故与成语
- 节气知识库
- 国学经典章节
- 成就定义列表
- 每日挑战题库

---

## 离线部署说明

本项目专为**完全离线环境**设计：

- 所有 AI 推理通过 Ollama 本地执行
- 数据库使用 SQLite，无需额外数据库服务（Redis 除外）
- 前端构建为静态文件，由 Nginx 托管
- Docker 镜像可提前拉取打包，现场无需联网

**完整离线包结构**：
```
InkFlow-offline-package/
├── images/          Docker 镜像（tar 包）
├── models/          Ollama 模型文件
└── InkFlow/         项目源码
```

---

## License

MIT License © 2025 InkFlow Team
