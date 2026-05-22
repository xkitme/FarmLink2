# 分段 12 — API 开关系统 + 全局限流

> 状态：✅ 完成  
> 执行时间：2026-05-21  
> 执行原则：继续现有项目，不清空、不覆盖旧 `docs` 记录。

## 本次任务目标

为后续 Ant Design Pro 管理后台补齐平台治理能力：

- 管理员可查看、新增、修改、删除、启停 API 功能开关。
- 请求进入业务路由前先经过 API 开关拦截。
- 本机离线部署下使用内存限流，不依赖 Redis。
- 自动记录非 GET 请求操作日志，供管理台审计。
- 提供限流计数快照接口，便于管理台展示。

## 执行内容

### 1. 新增全局治理中间件

新增 `backend/src/middleware/apiControl.js`，包含三类中间件：

```text
rateLimitMiddleware      全局限流
apiSwitchMiddleware      API 功能开关拦截
operationLogMiddleware   操作日志记录
```

并在 `backend/src/app.js` 中按顺序挂载：

```text
traceMiddleware
rateLimitMiddleware
apiSwitchMiddleware
operationLogMiddleware
业务路由
```

### 2. 全局限流策略

限流使用 `node-cache` 内存计数，适合单机离线部署。

| 策略 | 限制 | 范围 |
|---|---:|---|
| `global` | 100 次/分钟 | IP |
| `auth-login` | 10 次/分钟 | IP |
| `sms` | 5 次/小时 | IP |
| `ai` | 20 次/小时 | 用户，未登录时按 IP |
| `upload` | 30 次/小时 | 用户，未登录时按 IP |

响应头会返回：

```text
X-RateLimit-Policy
X-RateLimit-Limit
X-RateLimit-Remaining
X-RateLimit-Reset
```

超过限制时返回统一错误码：

```json
{
  "code": 42901,
  "msg": "请求过于频繁，请稍后再试"
}
```

### 3. API 开关规则

API 开关读取 `t_api_switch` 表。开关缺失时默认放行，避免开发阶段新增接口导致本地运行不可用。

当前已接入的开关规则包括：

| 开关键 | 覆盖接口 |
|---|---|
| `user_register` | `POST /auth/register` |
| `ai_disease_detect` | `POST /agri/disease/detect` |
| `ai_weed_detect` | `POST /agri/weed/detect` |
| `ai_seed_detect` | `POST /agri/seed/detect` |
| `ai_yield_predict` | `POST /agri/yield/predict` |
| `ai_policy_qa` | `POST /policy/ai/ask`、`POST /ai/policy/ask` |
| `ai_chat` | `POST /ai/chat`、`POST /ai/agri/ask`、`POST /ai/legal/ask` |
| `ai_voice` | `POST /ai/voice/recognize` |
| `ai_grade_detect` | `POST /market/grade/detect` |
| `ai_fault_diagnose` | `POST /machinery/fault/diagnose` |
| `ai_claim_assess` | `POST /disaster/claim/assess` |
| `ai_copywriting` | 包装/直播/旅游文案生成 |
| `ai_annual_report` | `POST /data/annual-report/generate` |
| `market_order` | `POST /market/order` |
| `machinery_booking` | `POST /machinery/booking` |
| `disaster_report` | `POST /disaster/report` |
| `subsidy_apply` | `POST /policy/subsidy/apply` |
| `community_post` | 互助、二手、环境举报、民俗、旅游发布 |
| `media_upload` | 上传/识别/分析类接口 |
| `offline_sync` | `POST /data/sync` |

开关缓存 10 秒，管理员修改后会立即清理缓存。

### 4. 管理员接口

新增 `backend/src/modules/platform/admin.controller.js`，并在 `platform.routes.js` 注册：

```text
GET    /api/v1/admin/api-switch/list
GET    /api/v1/admin/api-switch/categories
POST   /api/v1/admin/api-switch
PUT    /api/v1/admin/api-switch/:id
PUT    /api/v1/admin/api-switch/:id/toggle
DELETE /api/v1/admin/api-switch/:id
GET    /api/v1/admin/operation-log/list
GET    /api/v1/admin/rate-limit/status
```

所有接口要求：

```text
requireAuth + requireRole('ADMIN')
```

### 5. 操作日志

非 GET API 会写入 `t_operation_log`：

- `userId`
- `module`
- `action`
- `detail`
- `ip`
- `createdAt`

日志 detail 会自动脱敏：

- `password`
- `token`
- `secret`

并截断超长文本，避免日志过大。

## 修改文件

- `backend/src/middleware/apiControl.js`
- `backend/src/modules/platform/admin.controller.js`
- `backend/src/modules/platform/platform.routes.js`
- `backend/src/app.js`
- `docs/12-API开关与限流.md`
- `docs/进度总览.md`

## 验证结果

### 语法检查

以下文件执行 `node --check`，全部通过：

- `src/middleware/apiControl.js`
- `src/modules/platform/admin.controller.js`
- `src/modules/platform/platform.routes.js`
- `src/app.js`

### API 冒烟

启动后端并使用 `admin / 123456` 登录，验证结果：

| 步骤 | 结果 |
|---|---|
| `GET /api/v1/admin/api-switch/list?keyword=ai_chat` | 200 |
| `PUT /api/v1/admin/api-switch/:id/toggle` 关闭 `ai_chat` | 200 |
| `POST /api/v1/ai/chat` | 403，被开关拦截 |
| `PUT /api/v1/admin/api-switch/:id/toggle` 恢复 `ai_chat` | 200 |
| `GET /api/v1/admin/rate-limit/status` | 200 |
| `GET /api/v1/admin/operation-log/list` | 200 |

冒烟后确认：

```json
{
  "switch": { "key": "ai_chat", "enabled": true },
  "operationLogCount": 0
}
```

测试过程中产生的操作日志已清理，`ai_chat` 已恢复开启。

## 下一步

分段 13：Ant Design Pro 管理面板框架 + 登录 + 布局。

重点目标：

- 创建管理面板项目目录。
- 接入后端登录。
- 建立主布局、菜单、路由、请求封装。
- 为后续数据 CRUD、API 开关管理、API 在线调试器打基础。
