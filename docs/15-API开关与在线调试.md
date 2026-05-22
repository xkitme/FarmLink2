# 分段 15 — 管理面板：API 开关管理 + API 在线调试器

> 状态：✅ 完成  
> 执行时间：2026-05-21  
> 执行原则：继续当前项目，不清空、不覆盖旧 `docs` 记录。

## 本次任务目标

把 P13/P14 中仍是占位页的系统治理能力补成完整页面：

- `/admin/api-switch`：API 开关管理，支持查询、筛选、新增、编辑、删除和快速启停。
- `/admin/logs`：系统操作日志，支持按模块、用户、动作关键词筛选，并查看审计详情。
- `/admin/api-debug`：API 在线调试器，内置常用接口模板，展示“需要传什么”、请求体、响应、Trace ID。

## 前端实现

### 1. API 开关管理页

新增：

```text
backend/admin/src/pages/ApiSwitchPage.jsx
```

能力：

- 开关总数、当前页开启数、关闭数、分类数统计。
- 按关键词、分类、状态筛选。
- 列表展示 `key`、名称、分类、状态、说明、更新时间。
- 通过 Switch 直接启停开关。
- 支持新增、编辑、删除开关。
- 展示限流策略和当前限流计数快照。

对接接口：

```text
GET    /api/v1/admin/api-switch/list
GET    /api/v1/admin/api-switch/categories
POST   /api/v1/admin/api-switch
PUT    /api/v1/admin/api-switch/:id
PUT    /api/v1/admin/api-switch/:id/toggle
DELETE /api/v1/admin/api-switch/:id
GET    /api/v1/admin/rate-limit/status
```

### 2. 操作日志页

新增：

```text
backend/admin/src/pages/OperationLogPage.jsx
```

能力：

- 按模块、用户 ID、动作关键词筛选。
- 展示模块、动作、状态码、耗时、用户、IP、创建时间。
- 抽屉查看详情，包括 Trace ID、请求路径、请求方法、状态码、请求体、查询参数、API 开关 Key、限流策略。

对接接口：

```text
GET /api/v1/admin/operation-log/list
```

### 3. API 在线调试器

新增：

```text
backend/admin/src/pages/ApiDebugPage.jsx
backend/admin/src/apiCatalog.js
```

能力：

- 内置接口模板分组：
  - 系统与驾驶舱
  - 农业生产
  - 流通销售
  - 政策党建与 AI
  - 灾害应急与数据
  - 后台治理
- 每个模板说明：
  - 请求方法
  - 请求路径
  - 是否需要鉴权
  - 需要传什么
  - 示例 JSON 请求体
- 支持手动修改 method、path、headers、body。
- 发送请求后展示：
  - HTTP 状态
  - 业务码
  - 耗时
  - Trace ID
  - 格式化响应 JSON
  - 响应头

### 4. 请求层补充

修改：

```text
backend/admin/src/api/request.js
```

新增：

- `API_BASE`
- `buildUrl`
- `rawRequest`

`rawRequest` 专门供在线调试器使用，不强制弹出全局错误提示，保留原始 HTTP 状态、响应头、响应体和耗时。

### 5. 路由替换

修改：

```text
backend/admin/src/App.jsx
```

替换 P13 的占位页：

```text
/api-switch -> ApiSwitchPage
/api-debug  -> ApiDebugPage
/logs       -> OperationLogPage
```

### 6. 样式补充

修改：

```text
backend/admin/src/styles.css
```

新增：

- 过滤器宽度控制。
- 在线调试器请求配置区域。
- 响应 JSON 深色代码块。
- 移动端筛选控件适配。

## 验证结果

### 构建验证

执行：

```bash
node --check backend/admin/src/apiCatalog.js
npm run build --prefix admin
```

结果：

- 语法检查通过。
- 管理面板生产构建通过。
- Vite 仍提示首包体积超过 500 kB，这是 Ant Design 依赖带来的构建提示，不影响运行。

### 浏览器验证

启动本机后端：

```bash
node src/server.js
```

访问并验证：

```text
http://localhost:8000/admin/api-switch
http://localhost:8000/admin/logs
http://localhost:8000/admin/api-debug
```

结果：

| 页面 | 验证结果 |
|---|---|
| API 开关管理 | 正常展示统计卡、开关列表、启停 Switch、限流策略、限流计数 |
| 系统操作日志 | 正常展示日志筛选区和日志表格，无日志时显示空状态 |
| API 在线调试 | 正常展示接口模板、请求配置、接口总览 |

在线调试器点击“发送请求”，默认模板请求：

```text
GET /api/v1/data/dashboard
```

返回：

```text
HTTP 200
业务码 200
Trace ID 正常展示
响应 JSON 正常格式化
```

浏览器控制台：

```text
error/warning：0
```

## 产出文件

- `backend/admin/src/apiCatalog.js`
- `backend/admin/src/pages/ApiSwitchPage.jsx`
- `backend/admin/src/pages/ApiDebugPage.jsx`
- `backend/admin/src/pages/OperationLogPage.jsx`
- `backend/admin/src/api/request.js`
- `backend/admin/src/App.jsx`
- `backend/admin/src/styles.css`
- `docs/15-API开关与在线调试.md`
- `docs/进度总览.md`

## 下一步

分段 16：Flutter App 骨架 + 主题 + 路由。

重点目标：

- 创建 Flutter 工程结构。
- 对齐当前 Node.js 后端接口。
- 搭建登录、首页、8 大板块入口和本地离线配置骨架。
