# 分段 10 — data 模块 API

> 状态：✅ 完成  
> 执行时间：2026-05-21  
> 执行原则：继续现有项目，不清空、不覆盖旧 `docs` 记录。

## 本次任务背景

用户确认新的离线部署约束：

- 继续使用当前项目，不清空仓库。
- 后端与管理面板优先，移动端后续使用 Flutter，但本阶段不开发移动端。
- 数据库只使用 SQLite。
- 运行环境不能联网，所有后端和 AI 能力必须能在本机离线可用。
- 管理面板后续使用 Ant Design Pro，需要支持数据管理、API 开关、API 在线调试、AI 配置、日志和种子数据管理。

## 执行内容

### 1. 新增 data 模块路由

新增 `backend/src/modules/data/data.routes.js`，挂载到统一 `/api/v1` 前缀下：

```text
GET  /api/v1/data/dashboard
GET  /api/v1/data/remote-sensing
GET  /api/v1/data/annual-report/list
POST /api/v1/data/annual-report/generate
GET  /api/v1/data/statistics
GET  /api/v1/data/statistics/summary
POST /api/v1/data/statistics/report
PUT  /api/v1/data/statistics/:id/status
POST /api/v1/data/sync
GET  /api/v1/data/sync/status
GET  /api/v1/data/sync/logs
```

并在 `backend/src/routes/index.js` 注册该模块。

### 2. 农情数据看板

新增 `backend/src/modules/data/dashboard.controller.js`：

- 从本机 SQLite 汇总用户、地块、农事记录、商品、订单、灾情、政策、AI 调用数据。
- 输出管理台可直接使用的卡片指标、作物面积分布、农事类型分布、灾情损失统计。
- 村委角色按 `regionCode` 做区域范围过滤，普通用户只看自己的农事与地块。
- 明确返回 `offlineReady`，说明看板数据来自本地 SQLite，可断网运行。

### 3. 遥感图像分析离线版

在无法联网获取遥感服务的运行环境下，先用地块数据生成离线 NDVI 诊断：

- 根据地块作物、面积、ID 生成稳定的 NDVI 参考值。
- 返回长势等级：旺盛、良好、偏弱、异常。
- 给出本地农技建议。
- 模式标识为 `offline-simulated-ndvi`，后续可替换为真实遥感服务或本地影像模型。

### 4. 农业统计上报

新增 `backend/src/modules/data/statistics.controller.js`：

- 支持统计记录分页查询。
- 支持村委/管理员确认统计状态。
- 支持统计汇总，供管理台图表使用。
- `dataJson` 继续遵守 SQLite 约定：数据库存 JSON 字符串，接口返回对象。

### 5. 离线数据同步

新增 `backend/src/modules/data/sync.controller.js`：

- `POST /data/sync` 支持同步队列数组。
- 核心表真实回放：
  - `land_plot`
  - `farm_record`
  - `disaster_report`
- 其他表先按日志模式处理，保证 API 可跑、管理台可观察。
- 所有同步均写入 `t_sync_log`。
- 支持查看同步状态与同步日志分页。

## 验证结果

### 语法检查

对新增文件执行 `node --check`，全部通过：

- `src/modules/data/data.routes.js`
- `src/modules/data/dashboard.controller.js`
- `src/modules/data/statistics.controller.js`
- `src/modules/data/sync.controller.js`
- `src/routes/index.js`

### API 冒烟

启动后端并使用 `admin / 123456` 登录，验证结果：

| 接口 | 结果 |
|---|---|
| `POST /api/v1/auth/login` | 200 |
| `GET /api/v1/data/dashboard` | 200 |
| `GET /api/v1/data/remote-sensing` | 200 |
| `GET /api/v1/data/statistics/summary` | 200 |
| `POST /api/v1/data/statistics/report` | 200 |
| `POST /api/v1/data/sync` | 200 |
| `GET /api/v1/data/sync/status` | 200 |

冒烟测试产生的临时统计、临时农事记录和临时同步日志已清理。

## 产出文件

- `backend/src/modules/data/data.routes.js`
- `backend/src/modules/data/dashboard.controller.js`
- `backend/src/modules/data/statistics.controller.js`
- `backend/src/modules/data/sync.controller.js`
- `backend/src/routes/index.js`
- `docs/10-data模块.md`

## 下一步

分段 11：本地 AI 模块。

重点目标：

- 接入 Ollama 本地文本模型，提供完全离线 AI 问答。
- 政策 RAG、农技问答、法律问答从规则版升级为本地 LLM 增强。
- 提供 AI 状态、模型配置、问答记录、图像识别接口。
- 为后续 Ant Design Pro 管理面板提供 AI 配置和调试能力。
