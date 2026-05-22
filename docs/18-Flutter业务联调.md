# 分段 18 — Flutter 业务 API 联调 + 离线缓存 + 交互闭环

> 执行日期：2026-05-22  
> 本分段开始前已阅读：`docs/进度总览.md`、`docs/设计参考.md`、`docs/17-Flutter首批业务页面.md`

## 本次目标

把分段 17 的静态 Flutter 业务页面推进到可运行状态：页面优先读取本机 Node.js 后端，失败时使用本地缓存或内置数据兜底；关键操作可以形成“点得动、能返回、可讲清”的闭环。

## 已完成内容

### 1. 通用离线缓存

- 新增 `app/lib/core/offline_cache.dart`
- 基于 `SharedPreferences` 存储列表缓存。
- 支持读取缓存列表、写入缓存列表、读取缓存更新时间。
- 当前用于政策、集市、农机三个业务页的接口失败兜底。

### 2. 政策页面联调

- `app/lib/pages/policy/policy_page.dart`
- 接入 `GET /api/v1/policy/list`
- 政策卡片点击后调用 `GET /api/v1/policy/{id}` 展示详情。
- 接口失败时优先读取 `policy:list` 缓存。
- 页面保留符合设计参考的白底卡片、绿色状态标签和大触控区域。

### 3. 乡村集市页面联调

- `app/lib/pages/market/market_page.dart`
- 接入 `GET /api/v1/market/product/list`
- 支持分类筛选、接口缓存、购物车数量调整。
- 结算调用 `POST /api/v1/market/order`
- 下单成功后会清空购物车并提示。
- 接口失败时按分类读取缓存，保证离线运行时不会直接空白。

### 4. 农机共享页面联调

- `app/lib/pages/machinery/machinery_page.dart`
- 接入 `GET /api/v1/machinery/list`
- 支持农机类型筛选和缓存兜底。
- 预约按钮调用 `POST /api/v1/machinery/booking`
- 地图区域使用可视化点位展示当前农机列表，保持轻量、不依赖外部地图服务。

### 5. AI 页面联调

- `app/lib/pages/ai/ai_page.dart`
- 智能识病接入 `POST /api/v1/agri/disease/detect`
- 支持拍照或上传图片，使用 `image_picker` 读取图片并通过 multipart 上传。
- 识别结果展示病害名称、可信度、防治建议摘要。
- 农技问答接入 `POST /api/v1/ai/chat`
- Ollama 未启动时，后端仍可返回 `local-rule-rag` 兜底答案，适合本机离线运行。

### 6. 后端请求兼容

- `backend/src/app.js`
- 在全局链路中加入 `optionalAuth`，让携带 token 的非强制登录接口也能拿到用户上下文。
- 已有 `/ai`、`/agri` 路由仍保留 `requireAuth`，使用前需要先登录。

### 7. 构建依赖修正

- `app/pubspec.yaml`
- 新增 `cupertino_icons: ^1.0.8`
- 处理 Flutter Web 构建时缺少 CupertinoIcons 字体的提示。

## 验证记录

已执行：

```powershell
C:\dev\flutter\bin\dart.bat format lib
C:\dev\flutter\bin\flutter.bat analyze lib
C:\dev\flutter\bin\flutter.bat build web
node --check src/app.js
node --check src/modules/ai/ai.controller.js
```

结果：

- Flutter `analyze lib`：No issues found
- Flutter `build web`：成功生成 `app/build/web`
- 后端入口与 AI 控制器语法检查：通过

接口烟测：

- `POST /api/v1/auth/login`：成功，测试账号 `admin / 123456`
- `GET /api/v1/policy/list?pageSize=3`：返回 3 条
- `GET /api/v1/market/product/list?pageSize=3`：返回 3 条
- `GET /api/v1/machinery/list?pageSize=3&onlyAvailable=1`：返回 3 条
- `POST /api/v1/ai/chat`：成功，兜底模式 `local-rule-rag`
- `POST /api/v1/agri/disease/detect`：成功，返回 `DISEASE` 识别结果

浏览器检查：

- 已打开 `http://localhost:5000/#/ai`
- 页面可渲染 AI 识病卡片与农技问答卡片。
- 浏览器控制台未发现 error/warning。
- 移动视口截图能力曾出现一次截图超时，但页面 DOM 已 ready，构建与接口均正常。

## 当前注意事项

- Flutter 端真实图片识别需要先登录，否则 `/agri/disease/detect` 会返回未登录。
- 离线运行时，如果 Ollama 没启动，AI 问答会自动进入 SQLite RAG + 本地规则兜底，不会整块废掉。
- 集市下单、农机预约目前使用固定收货信息和预约日期，后续可改成表单。
- P19 可继续补：Flutter 离线同步队列、更多业务板块页面、AI 语音问答、移动端登录态体验优化。
