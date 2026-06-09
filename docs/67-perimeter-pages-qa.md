# 67 · 外围板块页面 QA 扫修（Codex 实施）

> **目标**：对用户当前没有在改的几个板块页面做一轮视觉/数据 bug 扫修，
> 与用户并行、零文件重叠。对外口径仍是「在线 SaaS 平台」（见 `docs/产品呈现口径.md`）。

## 背景

用户正同时手改这 6 个文件（**Codex 绝对不要碰**）：
- `app/lib/core/api_client.dart`
- `app/lib/pages/ai/ai_chat_page.dart`
- `app/lib/pages/ai/ai_threads_page.dart`
- `app/lib/pages/disaster/disaster_page.dart`（用户在加 `_alertColor` 按等级配色）
- `app/lib/pages/home/shell_page.dart`
- `app/lib/pages/market/market_page.dart`（用户在加 `_imageFor` 跳过肖像占位图）

Claude 同时在收尾管理台（backend/admin），也不要碰。

## 文件范围（只允许改这些）

仅限以下文件，**不得新建/修改范围外的任何文件**：
- `app/lib/pages/agri/agri_page.dart`
- `app/lib/pages/agri/photo_flow_page.dart`
- `app/lib/pages/machinery/machinery_page.dart`
- `app/lib/pages/machinery/machinery_service_page.dart`
- `app/lib/pages/policy/policy_page.dart`
- `app/lib/pages/policy/policy_service_page.dart`
- `app/lib/pages/life/life_page.dart`

如果某个 bug 的根因在范围外的共享文件（如 `widgets/`、`core/`、`theme.dart`），
**不要改它**，只在本文件末尾「实施备注」里记下根因和建议，留给 Claude。

## 要扫的 bug 类别（参照用户正在 market/disaster 做的同类修复）

1. **状态/等级标签未按语义配色**：列表/卡片里的状态徽章如果不分等级一律同色，
   补一个 `level/status → Color` 映射（参照 disaster 的做法，红=error/橙/黄/蓝），
   用 `AppColors` 里已有色；没有合适色就用克制的语义色，别引入鲜艳新色。
2. **占位图/假数据明显错位**：硬编码图片列表循环复用、把人物肖像当实体图、
   `index % n` 取图导致驴唇不对马嘴等。能用真实 `json` 字段就用真实字段兜底。
3. **状态文案未中文化**：界面直接显示 `PENDING`/`APPROVED`/`ON_SALE` 等英文枚举，
   按项目既有中文映射改成中文。
4. **布局问题**：明显的文字溢出、`Row` 不换行被裁、空数据没有空态提示。

> 不确定是不是 bug 的、纯主观审美的、需要产品拍板的——**不要擅改**，记到「实施备注」。

## 设计系统约束（硬性）

- 主绿 `AppColors.primary`、圆角 `R.sm=8/md=16/lg=32`、阴影 `AppColors.ambientShadow`。
- **禁** generic 渐变 / 半透明白浮层 / 脉冲光 / 大圆角胶囊。输入框要利落方正小圆角。
- 文案禁离线类术语（离线优先/断网可用/本地 AI/本地兜底/单机部署）。

## 验收

- `cd app && C:\dev\flutter\bin\flutter.bat analyze lib` → **必须 `No issues found`**。
- 在本文件末尾追加「## 实施备注」：列改了哪些文件、每个 bug 的现象与修法、
  哪些根因在范围外没改（给 Claude 的清单）。

## 不在范围内（划死线）

- **不要碰**上面列的 6 个用户在改的文件，以及 `backend/`、`widgets/`、`core/`、`theme.dart`、`router.dart`。
- **不要跑任何 git 命令**（不 add / 不 commit / 不 push / 不 stash）。改完留给 Claude 审查后统一提交。
- 不重构、不扩大范围、不改业务逻辑契约，只修上面四类 bug。

## 实施备注

- `app/lib/pages/policy/policy_page.dart`：政策/党建/文明乡风列表原先用 `i % 3` 轮换本地图片，容易出现内容与配图错位；改为优先读取接口里的封面/图片字段，按板块使用固定语义兜底图，并把标签圆角和长文本截断收敛到页面内。
- `app/lib/pages/machinery/machinery_page.dart`：农机列表原先所有接口数据固定用同一张本地农机图；改为优先读取接口图片字段，列表与详情支持网络图/本地图兜底，并让押金与距离信息在窄屏下单行省略，避免 Row 溢出。
- `app/lib/pages/machinery/machinery_service_page.dart`：维保提醒只把 `DUE` 标红，其它等级没有语义标签；补了页面内 `level -> 中文标签/Color` 映射，列表和提醒弹层统一显示 `已逾期/待保养/临近保养/状态正常/待确认`。
- `app/lib/pages/agri/agri_page.dart`：检测结果里的 `status` 可能直出英文枚举；补了健康状态中文映射，未知英文收敛为 `待确认`。
- `app/lib/pages/agri/photo_flow_page.dart`：诊断报告徽章原先显示 `VERIFIED`；改为 `已验证` 并使用主绿色。
- `app/lib/pages/policy/policy_service_page.dart`：补贴状态未知英文枚举原先可能原样显示；默认分支改为中文 `处理中`，已是中文的后端文案保持原样。
- `app/lib/pages/life/life_page.dart`：生活服务 hero 去掉通用渐变和半透明白指标底；乡村旅游卡片优先读取真实图片字段；邻里互助和快递查询状态改为中文标签与语义颜色，不再直出 `DONE`/`PENDING` 等后端枚举。
- 范围外根因：本轮未发现必须修改 `widgets/`、`core/`、`backend/`、`theme.dart` 或 `router.dart` 才能闭合的根因；没有触碰用户正在编辑的 6 个文件。
- 验收：已在 `app/` 目录执行 `C:\dev\flutter\bin\flutter.bat analyze lib`，结果为 `No issues found!`。
