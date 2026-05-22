# 分段 22 — Flutter App 气象灾害板块界面

> 状态：✅ 完成

## 背景

排查发现：后端 76 模块 API 已全部完成，但移动 App 仅约 15 个模块有界面。
按板块分批补齐 App 界面，本段为第一批 —— 板块四「气象灾害」7 个无界面模块。

## 任务目标

为气象灾害板块建聚合页 `disaster_page.dart`，覆盖 8 项功能，全部接后端。

## 执行内容

### 新增 `lib/pages/disaster/disaster_page.dart`
气象灾害聚合页，一页覆盖：

| 功能 | 后端接口 | 界面形式 |
|---|---|---|
| 极端天气预警 | GET /disaster/alert/list | 顶部红色预警卡列表 |
| 火险预警 | GET /disaster/fire/risk | 风险指数卡（点击看详情） |
| 干旱监测指数 | GET /disaster/drought/index | 风险指数卡（点击看详情） |
| 冻害防护建议 | GET /disaster/frost/advice | 麦金描边 AI 卡，列防护措施 |
| 应急预案查询 | GET /disaster/emergency/guide、:id | 列表 → 详情弹层（分步骤） |
| 灾情快速上报 | POST /disaster/report | 表单弹层（类型/面积/损失/描述） |
| 保险智能理赔 | POST /disaster/claim/assess | 表单弹层 → AI 评估结果弹层 |
| 一键求助联络 | POST /disaster/sos | 表单弹层 → 紧急联系人清单 |
| （我的记录） | GET /disaster/report/list、claim/list | 记录汇总弹层 |

### 接入与交互
- 进入时 `Future.wait` 并发拉取预警/预案/火险/干旱/冻害 5 个接口
- 离线缓存：预警与预案走 `OfflineCache`，断网展示缓存并提示
- 灾情上报 / 求助：离线时写入 `OfflineSyncQueue`，联网自动补交
- 下拉刷新；后端不可用且无缓存时显示重试

### 路由与入口
- `router.dart` 新增 `/disaster` 路由（ShellRoute 内）
- 首页「核心服务」网格点击「气象灾害」→ 跳转 `/disaster`
- 灾害页用带返回箭头的 AppBar，返回首页

## 验证

`flutter analyze`：0 错误（2 条 const 提示）。web 构建通过。

## 进度

App 界面覆盖：约 15 → 约 22 个模块（气象灾害 7 项补齐）。

## 下一步

分段 23 — 下一批板块 App 界面（按用户指定优先级）
