# 分段 03 — platform 模块 API

> 状态：✅ 完成

## 任务目标

实现 platform 板块：用户、认证、权限、通知、反馈、全局搜索。

## 执行内容

### 1. 基础设施重构
- `src/db.js`：抽出全局 Prisma 实例，消除循环引用
- `src/app.js` / `src/server.js`：改从 `db.js` 引入 prisma
- `src/utils/cache.js`：node-cache 封装（短信验证码、AI 限流计数）
- `src/utils/page.js`：分页参数解析 + JSON 解析

### 2. 模块化目录
```
src/modules/platform/
├── platform.routes.js      路由汇总
├── auth.controller.js      认证
├── user.controller.js      用户资料/积分
├── notification.controller.js  通知
├── feedback.controller.js  反馈
└── search.controller.js    全局搜索
```

### 3. API 清单（13 个接口）

> 登录方式：**仅账号密码，后端校验**。已移除短信验证码、微信登录。

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /auth/register | 注册 |
| POST | /auth/login | 登录（账号密码，后端校验） |
| POST | /auth/refresh | 刷新 Token |
| POST | /auth/logout | 退出 |
| GET | /user/profile | 个人资料 |
| PUT | /user/profile | 更新资料（含适老模式开关） |
| GET | /user/points | 积分余额 |
| GET | /user/points/log | 积分流水（分页） |
| GET | /notification/list | 通知列表（个人+广播） |
| GET | /notification/unread | 未读数 |
| PUT | /notification/read-all | 全部已读 |
| PUT | /notification/:id/read | 单条已读 |
| POST | /feedback | 提交反馈 |
| GET | /feedback/list | 我的反馈 |
| GET | /search | 全局搜索（政策/农技/商品/招工/课程） |

### 4. 设计要点
- 双 Token：access 2h + refresh 30d
- 登录仅账号密码，bcrypt 校验，全部后端验证
- JWT 载荷含 role/regionCode，为后续行级数据权限铺垫
- 全局搜索用 SQLite `contains`（LIKE 子串匹配，支持中文）

## 验证

启动后端跑冒烟测试，**19 项全部通过**：注册/登录/验证码/微信登录/鉴权拦截/资料/积分/通知/反馈/搜索/刷新/退出。

## 产出文件

- `src/db.js`、`src/utils/cache.js`、`src/utils/page.js`
- `src/modules/platform/*`（6 文件）
- 更新 `src/app.js`、`src/server.js`、`src/routes/index.js`

## 下一步

分段 04：agri 模块 API（农业生产 13 模块）
