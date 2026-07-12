# 116 · APK 前端迁移 Vue 2

## 目标

保留现有 Node.js + Express 后端和 React 管理台，将面向用户的 Flutter 移动端迁移为 Vue 2，并继续交付 Android APK 与本地 Web 预览。

## 背景

用户明确要求更换的是 APK 前端，而非管理台。现有 Flutter 端约 72 个 Dart 文件、2.9 万行代码，并包含相机、图片上传、语音识别、语音合成、偏好存储等原生能力，不能按普通网页换壳处理。

## 技术方案

- Web 框架：Vue 2.7 + Vue Router 3 + Vuex 3。
- 移动组件：Vant 2。
- APK 容器：Capacitor Android；Vue 构建产物打入 WebView，保留相机、存储等原生能力的插件扩展位置。
- 新代码目录：`mobile-vue/`；迁移验收完成前保留 `app/` 作为 Flutter 历史实现，避免破坏性删除。
- 后端接口契约不变：`/api/v1`、统一 `{ code, msg, data, timestamp, traceId }`、Bearer Token、SSE。

## 分批迁移计划

- **P0 基座（本批）**：建立 Vue 2 + Capacitor Android 工程、主题、路由守卫、认证状态、统一请求层和登录→首页冒烟链路。保留 Flutter 为默认正式交付，不提前切入口。
- **P1 低风险只读页**：启动广告、引导、认证、首页、全部服务、搜索、通用详情、个人中心与基础设置；建立视觉基线。
- **P2 读多写少**：政策、数据看板、IoT、消息、AI 历史、集市列表/详情/订单、村级大屏。
- **P3 业务写闭环**：发布、乡村生活、农机、灾害、农业、集市服务；补齐表单、图片上传、离线队列和冲突重试。
- **P4 AI 链路**：SSE 对话、历史删除、图片识别与反馈、语音助手命令契约。
- **P5 原生能力**：Camera/媒体、Android TTS、sherpa-onnx STT 与唤醒 Kotlin 桥、升级数据搬迁、权限和真机性能回归。

每一批独立验收。`app/` Flutter 全程保留；在 P0–P5 全部达到同功能验收之前，不替换默认 APK 构建入口。

## 验收

- `npm run build`：Vue 生产构建通过。
- `npm run android:sync`：Web 产物可同步到 Android 工程。
- P0 Android Debug APK 构建通过；为避免覆盖正式 Flutter 包，产物单独命名为 `dist/FarmLink-Vue-P0.apk`。
- 登录、路由守卫、首页、底栏、业务列表、图片 URL、401 退出与后端联调可用。
- 管理台 `npm run build --prefix backend/admin` 不受影响。

## 不在范围内

- 不更换 Node.js 后端、SQLite、AI 服务或管理台框架。
- 不删除、移动或改写 Flutter 代码；P0 不切换现有 `scripts/build-apk.ps1`。
- 离线 sherpa-onnx 唤醒与识别不能直接运行在 WebView；需后续实现 Capacitor 原生插件后才能达到 Flutter 版同等能力，不能以浏览器语音 API 冒充已迁移完成。

## 实施备注

### P0（2026-07-12）✅ 完成

- 新建 `mobile-vue/`：Vue 2.7.16、Vue Router 3、Vuex 3、Vant 2、Vite 5、Capacitor Android 6。
- 完成 Hash 路由、登录守卫、认证持久化、统一 API 响应/超时/401 退出、图片地址解析和全局主题。
- 完成登录、注册、找回密码、首页、全部服务、个人中心六个 P0 冒烟页面；发布、消息和业务服务仍明确显示迁移占位，不计入完成范围。
- 新增 `scripts/build-vue-apk.ps1`，单独输出 Vue P0 APK，不修改 Flutter 的 `scripts/build-apk.ps1`。
- 产物：`dist/FarmLink-Vue-P0-debug.apk`（模拟器 API：`http://10.0.2.2:8000`）。
- 验证：`npm run build` 通过；`npm run sync` 通过；Gradle `assembleDebug` 通过；React 管理台 `npm run build` 通过。
- 环境备注：本机全局 Gradle 阿里云镜像 TLS 异常，Vue 构建脚本使用项目隔离的 `.gradle-user/`，不修改用户全局 Gradle 配置。

### P1（2026-07-12）✅ 低风险只读页

按 P1 范围补齐「启动广告 / 引导、搜索、通用详情、基础设置」，并抽出可复用数据层，建立视觉基线。P0 六页保持不动。

- **共享数据层**
  - `src/data/features.js`：功能目录（28 项，含 icon/route/section/keywords），全部服务与搜索共用，`AllFeaturesView` 改为消费此源，去掉页内硬编码，避免与搜索双份维护。
  - `src/data/legal.js`：从 Flutter `legal_documents.dart` 移植《服务协议》12 节 +《隐私政策》9 节，启动引导页与关于页共用。
  - `src/data/app.js`：`APP_VERSION=1.8.0` 等对外口径常量。
- **启动广告 / 引导**：`LaunchView` + `LegalDialog`。`/` 改重定向到 `/launch`；拉 `/site/startup-ad`（2s 超时兜底）：已登录→广告图 + 右上倒计时跳过→`targetPath`；未登录→广告图作背景 + 服务协议同意门（同意→登录并记 `farmlink_agreed`，不同意→退出提示）。
- **全局搜索**：`SearchView`（`/search`，支持 `?q=` 进页自动检索）。热门词 + 功能命中（`matchFeatures`）+ `/search?keyword=` 内容分区（政策/农技/商品/招工/课程），含加载 / 空 / 失败态。
- **通用详情**：`InfoDetailView`（`/detail/info`）只读页，入参走新增 `store/modules/ui.js`（Hash 路由不便带对象）或 `?title=&body=` 兜底，支持图片 / 段落 / 条目 / 动作按钮。
- **基础设置**：`SettingsScaffold` + `SettingRow` + `SettingsHomeView`（镜像 Flutter 三组分区，真实用户名 / 脱敏手机号 / 版本号 / 清缓存 / 退出）、`AboutView`、`LegalView`（服务协议 / 隐私政策共用，`meta.doc` 区分）、`HelpView`（FAQ 手风琴 + 联系方式）。写型子页（account/password/push/weather/storage/elder/wake）先落迁移占位，不死链。
- **性能**：`LegalDialog` 遮罩去掉 `backdrop-filter: blur`（全屏大图上叠加连续合成会拖低端 WebView）。P1 新增页在 router 里按需拆包（dynamic import），不拖大首屏 bundle。

验证：`npm run build` 通过（238 模块，新页独立 chunk）；浏览器（375×812，farmer/张大叔登录）实测 `/launch` 协议门、`/search?q=补贴`（功能命中「补贴申请」+ 3 条真实政策）、`/profile/settings`（真实用户/脱敏手机/v1.8.0）、关于/隐私政策/帮助/通用详情、`/all`（重构后 28 项+分区）均正常渲染。

下一批：P2 读多写少（政策 / 数据看板 / IoT / 消息 / AI 历史 / 集市列表·详情·订单 / 村级大屏）。Flutter `app/` 继续作为正式版本和同功能回归基线。

### P2（2026-07-12）✅ 读多写少页

补齐 10 个读页 + 通用二级页脚手架，全部对接真实后端接口。Flutter `app/` 未动，写闭环（下单/发布/AI 对话）仍留 P3/P4 占位。

- **脚手架 / 共享**
  - `src/components/SubPage.vue`：二级页统一脚手架（返回顶栏 + 标题 + `right` 插槽 + `flush` 无内边距模式），政策/看板/集市/详情/IoT/AI 均复用。
  - `src/store/modules/notification.js`：未读计数模块；`AppShell` 底栏「消息」加红点 badge、`created` 时 `notification/refresh`。
- **P2a**
  - 政策 `PolicyView`(`/policy`, `van-list` 分页 + 下拉刷新) + `PolicyDetailView`(`/policy/:id`，含加载/失败态)。
  - 数据看板 `DataDashboardView`(`/data`)：核心卡片 + 种植结构 **SVG 环形图（无图表依赖）** + 灾情横条 + 农事类型 + 最近统计上报叙事；右上入口跳村级大屏。
  - 消息 `MessagesView`(替换 `/messages` 占位)：`typeCounts` 驱动类型筛选 chip + 列表 + 点击 `PUT /notification/:id/read` + 全部已读 + 底栏未读联动。
- **P2b**
  - 集市 `MarketView`(`/market`, 两列商品网格分页 + 订单入口 + 搜索跳 `/search`) + `ProductDetailView`(`/market/product/:id`，图廊/卖家/吸底价；「立即购买」诚实提示下单属后续版本，不伪装可下单) + `OrdersView`(`/market/orders`，中文状态徽章 PENDING/PAID/SHIPPED/DONE/CANCELLED + 收货信息)。
- **P2c**
  - IoT `IotView`(`/iot`)：感知设备卡（在线/电量/指标状态色）+ 联动规则卡（`van-switch` 真调 `POST /iot/linkage/rules/:id/toggle` 乐观更新）+ 联动记录。
  - AI 历史 `AiThreadsView`(`/ai`, `/ai/qa/records` thread 聚合列表) + `AiThreadDetailView`(`/ai/thread/:id`，`/ai/qa/threads/:id` 多轮气泡)。新对话入口指向 `/ai/chat/new`（P4 前落占位）。
  - 村级大屏 `VillageScreenView`(`/data/screen`)：全屏深色驾驶舱，`/data/dashboard` 30s 轮询 + 秒级时钟，KPI/种植结构/灾情/动态滚动。

验证：`npm run build` 通过（新页均独立 chunk）；375×812 浏览器（张大叔登录）逐页 `read_page` 实测——政策列表分页+详情、数据看板环形图、消息类型筛选、集市列表+商品详情+订单中文状态、IoT 设备+规则（开关 toggle 真发 `POST …/toggle` 200）、AI 历史+线程气泡、村级大屏实时时钟+轮询，全部真数据渲染正常。

下一批：P3 业务写闭环（发布 / 乡村生活 / 农机 / 灾害 / 农业 / 集市服务；表单 + 图片上传 + 离线队列）。
