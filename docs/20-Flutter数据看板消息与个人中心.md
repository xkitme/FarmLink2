# 分段 20 — Flutter 数据看板、消息通知与个人中心

> 执行日期：2026-05-22  
> 本分段开始前已阅读：`docs/进度总览.md`、`docs/设计参考.md`、`docs/19-Flutter离线队列与发布闭环.md`

## 本次目标

把 Flutter App 中尚未落地的“数据管理、消息通知、我的”三块做成可用闭环：

- 首页“数据管理”入口进入真实数据看板。
- 消息页接入后端通知接口，支持未读数与标记已读。
- 个人中心展示用户信息、业务概览与离线同步状态。
- 保持正式成品口径，不暴露临时开发背景。

## 已完成内容

### 1. 数据看板页

- 新增 `app/lib/pages/data/data_dashboard_page.dart`
- 新增 `/data` 路由，并把首页“数据管理”入口接入该路由。
- 接入接口：
  - `GET /api/v1/data/dashboard`
  - `GET /api/v1/data/sync/status`
  - `GET /api/v1/data/remote-sensing`
  - `GET /api/v1/ai/status`
- 页面内容包括：
  - 农情总览卡
  - 用户、地块、商品、订单、成交额、灾情指标
  - 离线同步状态与一键同步
  - 本地 AI 服务状态
  - 作物面积结构、农事类型、灾情统计
  - NDVI 遥感诊断
  - 最近统计上报与同步日志

### 2. 消息通知页

- 重写 `app/lib/pages/messages/messages_page.dart`
- 接入接口：
  - `GET /api/v1/notification/list`
  - `GET /api/v1/notification/unread`
  - `PUT /api/v1/notification/:id/read`
  - `PUT /api/v1/notification/read-all`
- 支持：
  - 未读数展示
  - 消息类型图标与颜色
  - 点击消息查看详情并标记已读
  - 一键全部已读
  - 下拉刷新

### 3. 个人中心页

- 重写 `app/lib/pages/profile/profile_page.dart`
- 接入用户资料、数据看板与同步状态。
- 展示：
  - 用户昵称、角色、村庄、积分
  - 地块、农事、订单、AI 调用概览
  - 本地队列数量、失败数、冲突数
  - 常用服务入口：数据看板、发布中心、消息通知、乡村集市、惠农政策、农机共享
- 支持个人中心内一键同步本地队列。

### 4. 路由与登录态修复

- `app/lib/main.dart` 中将 `GoRouter` 改为稳定实例，避免用户资料刷新时路由回到引导页。
- 应用入口提前初始化 `AuthState`，减少深链接刷新时的登录态竞态。
- `AuthState.init()` 增加幂等保护，避免重复初始化扰动页面。

### 5. 产品口径清理

- 清理后端旧注释与返回文案中的非正式表述。
- 当前活跃 Flutter 与后端代码不再出现临时呈现场景相关措辞。

## 验证记录

已执行：

```powershell
C:\dev\flutter\bin\dart.bat format app\lib
C:\dev\flutter\bin\flutter.bat analyze lib
C:\dev\flutter\bin\flutter.bat build web --pwa-strategy=none
node --check backend/src/modules/data/dashboard.controller.js
node --check backend/src/modules/data/sync.controller.js
node --check backend/src/modules/ai/ai.controller.js
node --check backend/src/middleware/apiControl.js
```

结果：

- Flutter `analyze lib`：No issues found
- Flutter Web 构建成功
- 后端相关文件语法检查通过

接口烟测：

- `GET /api/v1/data/dashboard` 返回 200
- `GET /api/v1/data/sync/status` 返回 200
- `GET /api/v1/notification/list` 返回 200

浏览器检查：

- 使用本机 Flutter Web 构建产物打开页面。
- 已检查：
  - 个人中心 `/profile`
  - 数据看板 `/data`
  - 消息通知 `/messages`
- 控制台无 error/warning。

## 当前注意事项

- 5000 端口如果仍显示旧页面，可清理浏览器缓存后刷新；本分段构建已使用 `--pwa-strategy=none`。
- P21 建议继续做 APK 打包、真机访问地址配置、最终启动脚本与完整运行说明。
