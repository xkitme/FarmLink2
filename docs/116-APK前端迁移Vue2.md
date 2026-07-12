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

下一批：P1 低风险只读页。Flutter `app/` 继续作为正式版本和同功能回归基线。
