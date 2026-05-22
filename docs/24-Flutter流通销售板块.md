# 分段 24 — Flutter App 流通销售板块界面

> 状态：✅ 完成

## 任务目标

补齐板块二「流通销售」除集市电商外的 11 个模块界面。

## 执行内容

### 新增 `lib/pages/market/market_service_page.dart`
流通服务聚合页，覆盖：

| 功能 | 后端接口 | 界面形式 |
|---|---|---|
| 实时价格行情 | GET /market/price | 行情列表 |
| 价格趋势预测 | GET /market/price/predict | 预测列表弹层 |
| 期货行情参考 | GET /market/futures | 期货行情弹层 |
| 出口合规查询 | GET /market/export | 表单 → 合规信息弹层 |
| 收购站地图 | GET /market/buyer/list | 收购站列表 + 电话 |
| 农资团购拼单 | GET /market/groupbuy/list、POST、:id/join | 团购列表 + 发起 + 参团 |
| AI 质量分级 | POST /market/grade/detect | 拍照上传 → 分级结果 |
| 直播带货话术 | POST /market/live/script | 表单 → 话术弹层 |
| 包装设计文案 | POST /market/package/generate | 表单 → 文案弹层 |
| 溯源查询 | GET /market/trace/:code | 输入溯源码 → 全链路弹层 |
| 冷链物流查询 | GET /market/logistics/:no | 输入单号 → 物流追踪弹层 |

### 接入与交互
- 进入并发拉取行情 / 收购站 / 团购
- 离线缓存（行情、收购站）+ 同步队列（发起团购）
- 下拉刷新；后端不可用且无缓存时显示重试

### 路由与入口
- `router.dart` 新增 `/market/service` 路由
- `market_page` 顶栏新增「流通服务」入口图标 → `/market/service`

## 验证

`flutter analyze`：0 错误。web 构建通过。

## 进度

App 界面覆盖：约 31 → 约 42 个模块（流通销售 11 项补齐）。

## 下一步

分段 25 — 农机共享 / 惠农政策 / 乡村生活等板块继续补齐
