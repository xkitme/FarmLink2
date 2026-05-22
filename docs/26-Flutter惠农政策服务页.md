# 分段 26 — Flutter 惠农政策服务页补齐

> 状态：✅ 完成

## 任务目标

在已有 `PolicyPage` 的政策列表、党建学习、文明乡风三栏基础上，补齐惠农政策板块剩余服务能力，让板块五的主要功能在 Flutter App 内形成可运行闭环。

## 执行内容

### 新增 `lib/pages/policy/policy_service_page.dart`

政策服务聚合页覆盖：

| 功能 | 后端接口 | 界面形式 |
|---|---|---|
| 补贴申请引导 | POST /policy/subsidy/apply、GET /policy/subsidy/list | 选择政策 + 材料说明 + 申请记录 |
| 政策 AI 问答 | POST /policy/ai/ask | 表单提问 → 本地 RAG 答案弹层 |
| 法律援助咨询 | POST /policy/legal/ask | 表单提问 → 法律建议弹层 |
| 乡村振兴积分 | GET /policy/points/rank、/items、POST /points/exchange | 我的积分 + 排行 + 兑换 |
| 村务公开公示 | GET /village/affairs | 村务列表 + 详情弹层 |
| 职业农民培训 | GET /training/course/list、:id、POST :id/enroll | 课程列表 + 详情 + 报名 |
| 乡村人才库 | GET /talent/list、POST /talent | 人才列表 + 入库申请 |

### 路由与入口

- `router.dart` 新增 `/policy/service`。
- `policy_page.dart` 顶栏新增「政策服务」入口图标。

### 离线与交互

- 对政策、补贴、积分、村务、培训、人才数据做本地缓存。
- 对补贴申请、人才入库等写操作接入 `OfflineSyncQueue`，离线时先入队。
- 页面沿用 Agro-Modernist Tech 设计系统：白底顶栏、圆角卡片、绿色主按钮、麦金积分模块。

## 验证

- `C:\dev\flutter\bin\flutter.bat analyze lib`：通过，No issues found。
- `C:\dev\flutter\bin\flutter.bat build web --pwa-strategy=none`：通过，已生成 `app/build/web`。
- `node --check backend\src\server.js`：通过，无语法错误输出。
- 构建产物检查：`app/build/web/main.dart.js` 已包含 `/policy/service` 路由。
- 成品口径文案检查：未发现临时场景相关词。

## 下一步

分段 27 — 继续补齐乡村生活服务板块页面。
