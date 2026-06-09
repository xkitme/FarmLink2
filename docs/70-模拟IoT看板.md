# 70 · 智慧物联设备看板（#19，模拟，Codex 实施）

> **目标**：一个**模拟**物联网设备监测看板——展示型，演示用。离线在控制器内生成
> 模拟传感数据（无真协议、无真硬件、不做告警联动）。对外口径「在线 SaaS 平台」，
> 文案按真实业务写（如「智慧物联 · 设备监测」），**不得出现「模拟/假数据/离线」等字样**。

## 背景
- GitHub issue #19：物联网设备联动。单机离线做不了真 IoT；本批只做**模拟设备看板**作为演示亮点。
- 拍板范围：**只做看板展示**，不做告警联动到灾害板块（后续再说）。

## 后端（新模块，不建数据库表）

1. 新建 `backend/src/modules/iot/iot.controller.js` + `iot.routes.js`，在 `backend/src/routes/index.js` 注册（仿现有 `lifeRoutes` 等的 import + use 写法）。
2. 接口：
   - `GET /iot/devices`：返回 5~6 类设备列表，每个含
     `{ id, name, type, location, online(true), battery, updatedAt, metrics:[{key,label,value,unit,status}] }`。
     设备类型建议：土壤墒情仪、空气温湿度站、虫情测报灯、水位计、光照/气象站。
     **读数在控制器内生成**：每类给一组合理基线（如土壤湿度 60%、气温 26℃…）+ 每次请求 ±小幅随机抖动，模拟"实时"；不持久化、不建表。
   - `GET /iot/devices/:id`：返回该设备详情 + 近 12 个点的读数序列（同样即时生成），供前端画简单趋势。
3. `node --check` 两个新文件通过。

## 前端（新页 + 入口）

1. 新建 `app/lib/pages/iot/iot_page.dart`：设备卡片网格/列表——每卡显示设备名、类型图标、在线状态点、关键读数（数值+单位）、电量；点卡进详情（可复用现有 `/detail/info` 或新建小详情页画 12 点趋势，用手绘/进度条即可，**不引图表依赖**）。
2. `app/lib/core/router.dart` 加路由 `/iot`（仿现有路由写法）。
3. 入口：在**数据管理页** `app/lib/pages/data/data_page.dart`（非脏文件）加一个「智慧物联 / 设备监测」入口卡/按钮 → `context.push('/iot')`。若 data_page 不便，就在 `feature_catalog.dart` + 全部服务墙加一项。
4. `flutter analyze lib` 通过。

## 设计系统约束（硬性，同 docs/67）
- 主绿 `AppColors.primary`、圆角 `R.sm/md/lg`、阴影 `ambientShadow`；**禁** generic 渐变 / 半透明白浮层 / 脉冲光 / 大圆角胶囊。
- 在线/离线/正常/告警状态用克制语义色（参照 disaster/machinery 的等级配色做法），别堆鲜艳色。

## 验收
- 后端：`node --check`；起服务后 `GET /api/v1/iot/devices` 返回设备数组，多次请求读数有小幅变化。
- 前端：`flutter analyze lib` 通过；看板渲染设备卡 + 入口可达 + 详情趋势出图。

## 不在范围内 / 红线
- **不碰用户在改的文件**：`ai_chat_page.dart`、`ai_threads_page.dart`、`disaster_page.dart`、`market_page.dart`、`home/shell_page.dart`、`core/api_client.dart`，`backend/src/modules/ai/*`、`config/index.js`、`ollama.service.js`。
- **不动 Prisma / 不建表 / 不迁移**（纯控制器生成数据）。不做告警联动。
- **不跑任何 git 命令**，改完留给 Claude 审查后提交。

## 实施备注
- 改动文件：`backend/src/modules/iot/iot.controller.js`、`backend/src/modules/iot/iot.routes.js`、`backend/src/routes/index.js`、`app/lib/pages/iot/iot_page.dart`、`app/lib/core/router.dart`、`app/lib/pages/data/data_dashboard_page.dart`。
- 实现内容：新增智慧物联设备接口 `GET /iot/devices`、`GET /iot/devices/:id`，控制器内即时生成 6 类设备读数和 12 点趋势序列；新增 `/iot` 前端页面，展示设备卡、在线状态、电量、关键读数和底部详情趋势；因当前仓库没有 `app/lib/pages/data/data_page.dart`，入口添加到真实 `/data` 页 `data_dashboard_page.dart`。
- 范围确认：未动 Prisma schema / migration，未新增数据库表，未做灾害告警联动，前端未加入图表依赖，页面文案未使用「模拟/假数据/离线」口径。
- 验证：`node --check backend/src/modules/iot/iot.controller.js`、`node --check backend/src/modules/iot/iot.routes.js`、`node --check backend/src/routes/index.js` 均通过；控制器级 smoke 返回 6 台设备、详情 12 点序列且两次请求读数有变化；在 `app` 目录运行 `C:\dev\flutter\bin\flutter.bat analyze lib`，结果为 `No issues found!`。
