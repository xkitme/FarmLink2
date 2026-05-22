# 分段 23 — Flutter App 农业生产板块界面

> 状态：✅ 完成

## 任务目标

补齐板块一「AI 农业生产」的 App 界面（病虫害识别已在 ai 页，本段补其余）。

## 执行内容

### 新增 `lib/pages/agri/agri_page.dart`
农业生产聚合页，覆盖：

| 功能 | 后端接口 | 界面形式 |
|---|---|---|
| 地块管理（GIS） | GET /agri/plot/list、POST /agri/plot | 地块列表 + 添加表单 |
| 农事记录本 | GET /agri/record/list、POST /agri/record | 记录列表 + 记一笔表单 |
| 作物长势监测 | POST /agri/crop/monitor | 拍照/相册 → 上传 → 结果弹层 |
| 杂草识别 | POST /agri/weed/detect | 同上 |
| 种子质量鉴别 | POST /agri/seed/detect | 同上 |
| 智能施肥配方 | POST /agri/fertilizer/advise | 表单 → NPK 配方弹层 |
| 灌溉计划助手 | POST /agri/irrigation/plan | 表单 → 灌溉计划弹层 |
| 产量预测 | POST /agri/yield/predict | 选地块 → 预测结果弹层 |
| 农事日历 | GET /agri/calendar | 当月农事提醒弹层 |
| 农药安全查询 | GET /agri/pesticide/list | 农药信息弹层 |
| 农业碳汇计算 | POST /agri/carbon/calc | 表单 → 固碳量弹层 |

### 接入与交互
- 进入并发拉取地块 / 农事记录 / 当月农事日历
- 三类图像识别复用 `image_picker`：拍照或相册 → `ApiClient.upload`
- 离线缓存（地块/记录）+ 同步队列（地块、农事记录写操作）
- 下拉刷新；后端不可用且无缓存时显示重试

### 路由与入口
- `router.dart` 新增 `/agri` 路由
- 首页「核心服务」网格：「AI 农业生产」→ `/agri`，「AI 助手」→ `/ai`（拆分）

## 验证

`flutter analyze`：0 错误。web 构建通过。

## 进度

App 界面覆盖：约 22 → 约 31 个模块（农业生产 9 项补齐）。

## 下一步

分段 24 — 流通销售 / 农机 / 政策 / 乡村生活等板块继续补齐
