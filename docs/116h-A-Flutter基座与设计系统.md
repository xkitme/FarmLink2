# 116h-A — Flutter 应用基座与设计系统

> 状态：实施完成，本地 analyze/test 全绿，等待截图验收
> 上位计划：[116-大重构总计划.md](116-大重构总计划.md) 的 M4「Flutter 应用基座与设计系统」
> 分支：`collab/116h-flutter-shell`（lane=flutter，workorder=116h-A）
> 基线：`origin/main` @ `34e207096847f8e2f56c273bd9e7aea7485f3f73`（= Merge PR #5）

## 1. 目标

把散落在各页的「启动组合根、设计 token、五栏壳层、首页入口、状态组件」收敛为统一基座，为后续页面迁移（116i 起）提供稳定壳层。本批不迁移任何业务页面，只建立基座与设计系统。

## 2. 背景

M4 是 M0~M3 之后的 App 基座里程碑。当前 App 已有可用的五栏导航与主题，但存在缺口：

1. 五栏为「首页/AI 农技/发布/消息/我的」，与计划 M4 要求的「首页/集市/发布/小田助手/我的」不一致，且「消息」占底栏、未按计划改为「铃铛」入口。
2. 设计 token 散落在 `constants.dart` 的 `AppColors`/`R`，缺少语义化收敛层。
3. 状态组件只有 Loading/Empty/Error 三种，缺 Unauthorized 与 Offline/ServiceUnavailable 的区分。
4. 依赖组合根内联在 `main.dart` 的 State 里，未显式成 `AppBootstrap`。

## 3. 改动清单（文件级）

### 新增

| 文件 | 内容 |
|---|---|
| `app/lib/design_system/farm_tokens.dart` | 语义 token：`FarmColors`（色）/`FarmSpacing`（间距）/`FarmRadius`（圆角）/`FarmTypography`（字号+常规/适老缩放）/`FarmElevation`（阴影）/`FarmMotion`（动效） |
| `app/lib/design_system/farm_state_views.dart` | 统一五态组件：`FarmViewState` 枚举 + `FarmStateView` 分发器 + `FarmLoading`/`FarmEmpty`/`FarmError`/`FarmUnauthorized`/`FarmOffline` |
| `app/lib/design_system/farm_brand.dart` | `FarmBrand` 品牌标识：官方品牌图（farmlink-mark.png）+「田园通」文字，禁用通用叶子/农机图标替身 |
| `app/test/design_system_test.dart` | token 一致性与五态组件测试（10 项） |
| `app/test/shell_tabs_test.dart` | 五栏配置测试（3 项） |
| `docs/116h-A-Flutter基座与设计系统.md` | 本工作单 |

### 修改

| 文件 | 改动 |
|---|---|
| `app/lib/main.dart` | 抽出 `AppBootstrap` 组合根（AuthState/ElderModeState/VoiceWakeState/router 装配与 init）；适老文本缩放改用 `FarmTypography` token；保持 `FarmLinkApp({credentialStorage})` 公开 API 不变 |
| `app/lib/core/theme.dart` | 改为消费 `FarmColors`/`FarmRadius` 语义 token（行为不变，仍是单一浅色主题，不引入深色） |
| `app/lib/pages/home/shell_page.dart` | 五栏改为 `首页/集市/发布/小田助手/我的`；tab 定义提取为公开 `kShellTabs`；消息不再占底栏 |
| `app/lib/pages/home/home_page.dart` | 顶栏铃铛加未读角标（`NotificationState.unread`）；移除「全部 N 项 →」入口；新增角色可见性（村级经营仅 VILLAGE/ADMIN） |
| `app/lib/widgets/common.dart` | 再导出 `design_system/farm_state_views.dart`，让既有页面从 `widgets/common.dart` 取到全部五态组件 |

## 4. 接口契约

- `kShellTabs`：`List<ShellTab>`，`ShellTab = ({String path, IconData icon, String label})`，五项顺序固定 `['/home','/market','/publish','/ai','/profile']`。
- `FarmViewState`：`{loading, empty, error, unauthorized, offline}`；`FarmStateView(state, message, onRetry, onLogin)` 按状态分发。
- `FarmBrand`：仅用 `assets/images/farmlink-mark.png` 品牌图，不用通用图标。
- 适老模式：不改色板（保持明亮浅色，无深色主题），只抬高文本缩放夹取到 `1.3~1.35`。

## 5. 验收

- `flutter analyze`：0 issue。
- `flutter test`：全绿（基线 34 + 新增 13 = 47）。
- scope-check（`--branch collab/116h-flutter-shell`）：越界 0。
- 截图：411×731、1080×1920、适老模式三视图，无溢出。
- 回滚：删除本批新增文件 + 按 git diff 还原 5 个修改文件即可；无数据库/Prisma/生成产物改动。

## 6. 不在范围内

- 不迁移任何业务页面（market/publish/ai/profile 页体不改）。
- 不修改 `app/lib/core/feature_catalog.dart`（生成产物，硬拒）。
- 不修改 `constants.dart`（`AppColors`/`R` 仍为原始事实源，token 层做语义映射）。
- 不恢复深色模式。
- 不把业务入口藏进「我的」。
- 不改 backend/**、Prisma、数据库。

## 7. 实施备注

> 见提交记录。A/M/D、测试计数闭合、scope-check 结果、截图与回滚方式见提交与 PR body。
