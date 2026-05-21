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
客户端（前端）
      ↓ HTTP / SSE
  Node.js 后端（Express）
      ↓
┌────────────────────────────────────┐
│  SQLite（主数据库，Prisma ORM）    │
│  node-cache（内存缓存）            │
│  Ollama（本地 AI 推理，离线）      │
│    ├── qwen2.5:7b（对话/创作）     │
│    └── minicpm-v（书法视觉点评）   │
└────────────────────────────────────┘
```

### 技术选型

| 层级 | 技术 |
|------|------|
| 后端框架 | Node.js + Express 4 |
| ORM | Prisma 5 |
| 数据库 | SQLite（WAL 模式） |
| 缓存 | node-cache（内存，无需额外服务） |
| AI 推理 | Ollama（离线本地） |
| 主模型 | qwen2.5:7b-instruct-q4_K_M |
| 视觉模型 | minicpm-v:8b-2.6-q4_K_M |
| 认证 | JWT（jsonwebtoken） |

---

## 目录结构

```
InkFlow/
├── backend/
│   ├── src/
│   │   ├── app.js              Express 应用入口
│   │   ├── server.js           启动文件
│   │   ├── config/             环境配置
│   │   ├── routes/             路由（auth/contents/ai/learning/community/...）
│   │   ├── controllers/        控制器
│   │   ├── services/           业务逻辑（AI、学习引擎、成就系统）
│   │   ├── middleware/         JWT 认证、文件上传
│   │   └── utils/              工具函数（JWT、缓存、艾宾浩斯算法）
│   ├── prisma/
│   │   └── schema.prisma       数据库 Schema
│   ├── seeds/                  初始化文化内容数据
│   ├── uploads/                用户上传文件
│   ├── .env.example
│   └── package.json
└── frontend/                   前端（待开发）
```

---

## 快速启动

### 环境要求

- Node.js 18+
- Ollama（用于 AI 功能）
- NVIDIA GPU，8GB+ VRAM（推荐 RTX 5060 Laptop 及以上）

### 启动步骤

```bash
# 1. 克隆项目
git clone https://github.com/hczdngr/InkFlow.git
cd InkFlow/backend

# 2. 安装依赖
npm install

# 3. 复制配置文件
cp .env.example .env

# 4. 初始化数据库
npm run db:migrate

# 5. 写入初始数据
npm run db:seed

# 6. 启动开发服务器
npm run dev
```

### 服务端口

| 服务 | 地址 |
|------|------|
| 后端 API | http://localhost:8000 |
| Ollama | http://localhost:11434 |

---

## AI 模型说明

本项目使用 **Ollama** 在本地运行大语言模型，无需联网，完全离线可用。

| 模型 | 用途 | VRAM |
|------|------|------|
| `qwen2.5:7b-instruct-q4_K_M` | 对话/翻译/诗词创作/出题 | ~4.5GB |
| `minicpm-v:8b-2.6-q4_K_M` | 书法作品视觉点评 | ~5GB |

> 推荐在 RTX 5060 Laptop 及以上 GPU 运行，显存 8GB+。

**模型预下载**（有网络环境时执行一次）：

```bash
ollama pull qwen2.5:7b-instruct-q4_K_M
ollama pull minicpm-v:8b-2.6-q4_K_M
```

---

## API 接口

| 分组 | 路径前缀 | 说明 |
|------|----------|------|
| 认证 | `/api/auth` | 注册、登录、刷新 Token |
| 内容 | `/api/contents` | 诗词、典故、节气等文化内容 |
| AI | `/api/ai` | 对话、翻译、书法点评（SSE 流式） |
| 学习 | `/api/learning` | 进度、复习、打卡、测验 |
| 社区 | `/api/community` | 作品、评论、点赞、挑战 |
| 成就 | `/api/achievements` | 成就解锁、排行榜 |
| 搜索 | `/api/search` | 全文内容搜索 |
| 媒体 | `/api/media` | 文件上传与访问 |

---

## 开发命令

```bash
npm run dev          # 开发模式（nodemon 热重载）
npm run start        # 生产模式
npm run db:migrate   # 执行数据库迁移
npm run db:seed      # 写入初始数据
npm run db:studio    # 打开 Prisma Studio 可视化数据库
npm run db:reset     # 重置数据库
```

---

## License

MIT License © 2025 InkFlow Team
