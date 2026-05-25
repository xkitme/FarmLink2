# 分段 30 — Flutter 数据管理板块服务页补齐

> 数据管理板块原本只在底栏直达「农情数据看板」，可看不可操作。本分段补出
> 「农事年度报告」「统计上报」「离线同步日志」三个交互入口，集中在新的
> `数据管理服务` 页面，保持「按板块分批 · 延续 docs 文化」节奏。

## 范围

| 模块 | 状态 | 说明 |
|---|---|---|
| 农情数据看板 | ✅ 既有 | `data_dashboard_page.dart` |
| 遥感分析 | ✅ 既有 | 看板内 `_remoteCard` |
| GIS 地块管理 | ✅ 既有 | 农业生产板块服务页 |
| **农事年度报告** | ✅ 本分段补齐 | 一键生成 + 历史 + 摘要详情 sheet |
| **统计上报** | ✅ 本分段补齐 | 概览 + 列表 + 新建上报表单 |
| **离线同步日志** | ✅ 本分段补齐 | 状态概览 + 全量日志 sheet + 状态筛选 |

## 实现

### 1. 新增 `app/lib/pages/data/data_service_page.dart`

- AppBar 带返回，标题「数据管理」+ 右上刷新
- Hero 卡 (heroGradient + 3 指标：年度报告数 / 统计上报数 / 同步日志数)
- 「农事年度报告」卡：
  - 一键生成按钮 → 弹年度选择 sheet → `POST /data/annual-report/generate`
  - 历史列表展示 `_annualReports.take(4)`
  - 点条目弹底部 sheet 显示完整 `summary` + `reportContent`
- 「统计上报」卡：
  - 上报按钮 → 弹表单 sheet（statType / year / period / cropType / areaMu / yieldKg）
  - `POST /data/statistics/report` 提交
  - 概览展示 `byType` / `byStatus` 胶囊
  - 列表展示最近 4 条上报
- 「离线同步」卡：
  - 4 个 mini stat：总计 / 成功 / 冲突 / 失败
  - 最近 3 条同步日志
  - 「查看全部」打开 `_SyncLogsSheet`，支持 ALL / SUCCESS / CONFLICT / FAILED 筛选 + 分页 50 条

接口：

| 路径 | 方法 | 用途 |
|---|---|---|
| `/data/annual-report/list` | GET | 年度报告列表 |
| `/data/annual-report/generate` | POST | 生成年度报告 |
| `/data/statistics` | GET | 统计上报列表 |
| `/data/statistics/summary` | GET | 统计上报汇总 |
| `/data/statistics/report` | POST | 创建统计上报 |
| `/data/sync/status` | GET | 同步状态概览 |
| `/data/sync/logs` | GET | 同步日志分页 |

### 2. 离线兜底

- `OfflineCache.saveList('data_annual_report', ...)` / `'data_stat_report'`
  在线请求成功后写缓存；失败时读缓存 + 顶部黄色 banner 提示
- summary 与 sync status 不缓存（数值小、断网时直接展示 0）

### 3. 路由

`app/lib/core/router.dart` 新增：

```dart
GoRoute(path: '/data/service', builder: (_, __) => const DataServicePage()),
```

### 4. 看板跳转入口

`app/lib/pages/data/data_dashboard_page.dart` 顶栏 actions 新增「数据管理服务」按钮，
跳转 `/data/service`，与板块分布命名一致。

## 验证

- `flutter analyze lib/pages/data lib/core/router.dart` → `No issues found!`
- 后端接口已存在（参见 `backend/src/modules/data/data.routes.js`），无需新增路由

## 影响文件

```
A  app/lib/pages/data/data_service_page.dart
M  app/lib/pages/data/data_dashboard_page.dart   （顶栏入口按钮）
M  app/lib/core/router.dart                      （/data/service 路由）
A  docs/30-Flutter数据管理服务页.md
M  docs/进度总览.md                              （状态更新）
```
