# 分段 19 — Flutter 离线队列 + 发布演示闭环

> 执行日期：2026-05-22  
> 本分段开始前已阅读：`docs/进度总览.md`、`docs/设计参考.md`、`docs/18-Flutter业务联调.md`

## 本次调整

用户补充：本项目是比赛用成品，不是真正投入使用的生产项目，因此本分段不再追求复杂的联网/断网边界处理，而是优先保证现场演示顺畅、逻辑能讲清、数据能进入本机后端。

本分段定位为：**比赛演示版离线优先发布中心**。

## 已完成内容

### 1. Flutter 本地同步队列

- 新增 `app/lib/core/offline_sync_queue.dart`
- 使用 `SharedPreferences` 保存本地队列。
- 队列字段包含：
  - `tableName`
  - `operation`
  - `localUuid`
  - `payload`
  - `path`
  - `status`
  - `retryCount`
  - `lastError`
- 支持：
  - 入队
  - 立即尝试同步
  - 手动同步全部队列
  - 清空演示队列

### 2. 真实回放到后端

对后端已支持的核心表，走统一同步接口：

- `farm_record` → `POST /api/v1/data/sync`
- `disaster_report` → `POST /api/v1/data/sync`

对比赛演示补充项，走直接业务接口：

- `env_report` → `POST /api/v1/life/env/report`

说明：这不是生产级同步器，而是比赛现场可演示的“本地暂存 + 一键同步到 SQLite 后端”能力。

### 3. 发布页重构

- 重写 `app/lib/pages/publish/publish_page.dart`
- 顶部改为“比赛演示发布中心”。
- 提供三类发布表单：
  - 农事记录
  - 灾情上报
  - 环境举报
- 保留 `Agro-Modernist Tech` 设计：
  - 叶绿色主按钮
  - 白底卡片
  - 16px 圆角
  - 大触控区域
  - 轻量环境阴影
- 页面展示本地同步队列：
  - 当前队列数量
  - 每条队列所属业务
  - 同步状态
  - 错误摘要
- 支持“同步”和“清空”演示操作。

### 4. 保留乡村动态演示内容

发布页下半部分保留乡村动态流，用于现场讲解“乡村生活服务”和“社区信息流”场景。

## 验证记录

已执行：

```powershell
C:\dev\flutter\bin\dart.bat format lib\core\offline_sync_queue.dart lib\pages\publish\publish_page.dart
C:\dev\flutter\bin\flutter.bat analyze lib
C:\dev\flutter\bin\flutter.bat build web --pwa-strategy=none
node --check src/modules/data/sync.controller.js
node --check src/modules/life/community.controller.js
node --check src/modules/agri/record.controller.js
node --check src/modules/disaster/report.controller.js
```

结果：

- Flutter `analyze lib`：No issues found
- Flutter Web 构建成功
- 后端相关控制器语法检查通过

接口烟测：

- `POST /api/v1/data/sync`
  - 同步 `farm_record` 成功
  - 同步 `disaster_report` 成功
- `POST /api/v1/life/env/report`
  - 环境举报写入成功
  - 返回状态 `REPORTED`

浏览器检查：

- 打开 `http://localhost:5000/#/publish`
- 已看到新版“比赛演示发布中心”页面。
- 控制台无 error/warning。
- 本地 Flutter Web 曾受旧 service worker 缓存影响显示旧页面；验证时已清理缓存，并使用 `--pwa-strategy=none` 构建，适合比赛本地演示。

## 当前注意事项

- 这是比赛演示版，不做生产级网络状态判断。
- 演示前建议使用 `flutter build web --pwa-strategy=none` 构建，减少 Flutter Web 缓存旧资源的概率。
- 如果浏览器仍显示旧页面，清理站点缓存或换新标签页打开即可。
- P20 可以继续做：数据看板页、消息/通知联调、个人中心同步状态入口、APK 打包前演示脚本。
