# 分段 14 — 管理面板：各业务数据增删改查页面

> 状态：✅ 完成  
> 执行时间：2026-05-21  
> 执行原则：继续现有项目，不清空、不覆盖旧 `docs` 记录。

## 本次任务目标

把 P13 的管理台占位页升级为可操作的数据管理页：

- 后端提供管理员通用资源 CRUD 接口。
- 前端用统一页面渲染表格、搜索、新增、查看、编辑、删除。
- 覆盖平台基础、农业生产、流通销售、农机共享、灾害应急、政策党建、乡村生活、数据管理、AI 记录。
- 不开放任意 Prisma 模型，只通过白名单配置暴露管理资源。

## 后端实现

### 1. 资源白名单配置

新增：

```text
backend/src/modules/platform/resource.config.js
```

核心内容：

- `RESOURCE_GROUPS`：资源分组。
- `RESOURCE_CONFIGS`：每个资源的模型、标题、可搜索字段、列表字段、表单字段。
- `getResourceConfig()`：按资源 key 获取配置。
- `listResourceConfigs()`：返回资源清单给管理台。

### 2. 通用资源控制器

新增：

```text
backend/src/modules/platform/resource.controller.js
```

能力：

- 资源索引
- 字段配置
- 分页列表
- 详情
- 新增
- 更新
- 删除

用户表做了特殊处理：

- 不返回 `passwordHash`。
- 新增用户时支持 `password` 字段，不填默认 `123456`。
- 更新用户时如果传入 `password`，会重新 hash 写入。

### 3. 新增管理员接口

在 `backend/src/modules/platform/platform.routes.js` 注册：

```text
GET    /api/v1/admin/resource/index
GET    /api/v1/admin/resource/:resource/config
GET    /api/v1/admin/resource/:resource/list
GET    /api/v1/admin/resource/:resource/:id
POST   /api/v1/admin/resource/:resource
PUT    /api/v1/admin/resource/:resource/:id
DELETE /api/v1/admin/resource/:resource/:id
```

所有接口均要求：

```text
requireAuth + requireRole('ADMIN')
```

## 已接入资源

合计 35 个资源：

| 分组 | 资源 |
|---|---|
| 平台基础 | `user`、`notification`、`feedback` |
| 农业生产 | `landPlot`、`farmRecord`、`diseaseKnowledge`、`aiDetectRecord`、`yieldPrediction` |
| 流通销售 | `marketPrice`、`product`、`order`、`traceRecord`、`buyer` |
| 农机共享 | `machinery`、`machineryBooking`、`landTransfer` |
| 灾害应急 | `disasterReport`、`weatherAlert`、`emergencyGuide`、`insuranceClaim` |
| 政策党建 | `policy`、`partyLesson`、`villageAffair`、`honorRecord`、`trainingCourse` |
| 生活服务 | `jobInfo`、`tourismSpot`、`secondhandItem`、`helpRequest`、`envReport`、`loanProduct` |
| 数据管理 | `annualReport`、`statReport`、`syncLog` |
| AI 记录 | `aiQaRecord`、`aiDetectRecord` |

## 前端实现

### 1. 资源分组

新增：

```text
backend/admin/src/resourceGroups.js
```

管理台按路由分组：

```text
/users
/agri
/market
/machinery
/disaster
/policy
/life
/data
/ai
```

每个路由内部用 Tabs 展示多张业务表。

### 2. 通用 CRUD 页面

新增：

```text
backend/admin/src/pages/ResourcePage.jsx
```

能力：

- 拉取后端资源字段配置。
- 生成标签页。
- 生成表格列。
- 搜索、分页、刷新。
- 新增记录。
- 查看详情抽屉。
- 编辑记录。
- 删除记录确认。
- 支持字段类型：
  - `string`
  - `textarea`
  - `json`
  - `int`
  - `float`
  - `boolean`
  - `select`
  - `date`
  - `password`

### 3. 路由替换

修改：

```text
backend/admin/src/App.jsx
```

把 P13 的占位路由替换为 `ResourcePage`：

- 用户与角色
- 农业生产
- 流通销售
- 农机共享
- 灾害应急
- 政策党建
- 生活服务
- 数据管理
- AI 能力

`/api-switch`、`/api-debug`、`/logs` 留给 P15。

### 4. 样式补充

修改：

```text
backend/admin/src/styles.css
```

新增：

- 资源表单两列布局。
- 大字段自动占满整行。
- 详情 JSON/长文本展示样式。
- 移动端单列适配。

## 验证结果

### 语法与构建

执行：

```bash
node --check src/modules/platform/resource.config.js
node --check src/modules/platform/resource.controller.js
node --check src/modules/platform/platform.routes.js
npm run build --prefix admin
```

结果全部通过。

Vite 仍有 Ant Design 首包体积提示，不影响运行。

### 后端 CRUD 冒烟

使用 `admin / 123456` 登录后验证：

| 步骤 | 结果 |
|---|---|
| `GET /api/v1/admin/resource/index` | 200 |
| `GET /api/v1/admin/resource/buyer/config` | 200 |
| `GET /api/v1/admin/resource/buyer/list` | 200 |
| `POST /api/v1/admin/resource/buyer` | 200 |
| `GET /api/v1/admin/resource/buyer/:id` | 200 |
| `PUT /api/v1/admin/resource/buyer/:id` | 200 |
| `DELETE /api/v1/admin/resource/buyer/:id` | 200 |

随后批量扫描所有资源列表：

```json
{
  "total": 35,
  "failed": 0
}
```

测试期间创建的临时收购站和操作日志已清理。

### 浏览器验证

访问：

```text
http://localhost:8000/admin/agri
```

验证结果：

- 页面标题：农业生产数据。
- 标签页正常显示：地块管理、农事记录、病害知识库、AI 识别记录、产量预测。
- 地块管理表格正常渲染。
- 搜索框、新增、刷新、查看、编辑、删除按钮可见。
- 浏览器控制台无 error/warning。

## 产出文件

- `backend/src/modules/platform/resource.config.js`
- `backend/src/modules/platform/resource.controller.js`
- `backend/src/modules/platform/platform.routes.js`
- `backend/admin/src/resourceGroups.js`
- `backend/admin/src/pages/ResourcePage.jsx`
- `backend/admin/src/App.jsx`
- `backend/admin/src/styles.css`
- `docs/14-管理面板业务CRUD.md`
- `docs/进度总览.md`

## 下一步

分段 15：管理面板 API 开关管理 + API 在线调试器。

重点目标：

- 把 `/api-switch` 从占位页升级成开关管理页。
- 把 `/logs` 从占位页升级成操作日志页。
- 实现 `/api-debug` 在线调试器，可选择方法、路径、请求体并显示响应。

## 2026-06-09 补充修复

- 修复管理台业务数据分组切换后复用 `ResourcePage` 状态，导致旧 activeKey 不属于新分组、内容区不刷新或短暂空白的问题。
- 修复通用资源详情抽屉只使用表格行快照的问题；点击“查看”时会重新请求 `GET /admin/resource/:resource/:id`，并用请求序号避免快速关闭或连续点击时旧响应覆盖新详情。
- 验证：`npm run build --prefix admin` 通过；Vite 仍仅提示首包体积较大，不影响运行。
