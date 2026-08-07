# C2b: 管理台 HttpOnly Cookie 迁移 — 设计文档

## 背景

当前管理台使用 JWT Bearer Token（access + refresh）存在 localStorage，前端手动挂 `Authorization` 头。迁移到 HttpOnly Cookie 消除 XSS 窃取 token 风险。

C2a 已交付地基：CORS `credentials: true`、originGuard、HTTPS 配置。

## 核心约束

1. **管理台 only，Capacitor 原生壳不动**：按 User-Agent 分流
2. **不删 `extractToken` / `verifyAuthToken`**：Capacitor 路径仍依赖
3. **不碰 schema 不清数据库**
4. **不要 push**

## Cookie 设计

| Cookie | HttpOnly | Secure | SameSite | Path | MaxAge |
|--------|----------|--------|----------|------|--------|
| `access_token` | ✅ | ✅ | Strict | `/api` | 15min |
| `refresh_token` | ✅ | ✅ | Strict | `/api/v1/auth` | 7d |
| `csrf_token` | ❌ | ✅ | Strict | `/` | session |

- `csrf_token` 非 HttpOnly，前端 JS 可读，用于 double-submit cookie 模式
- dev 环境 `Secure=false`，demo/release `Secure=true`
- `SameSite=Strict` 在所有环境生效（管理台同源请求）

## 分流策略

```
requireAuth(req):
  UA contains "capacitor"|"ionic"|"cordova" → Bearer header（原生壳，不动）
  else → read access_token cookie → HttpOnly 校验（管理台）
```

与 `originGuard.js` 的 UA 豁免列表一致。

## CSRF 保护

Double-submit cookie 模式：
1. `/auth/login` 成功后服务端 Set-Cookie `csrf_token=<random>`
2. 前端读 `csrf_token` cookie，state-changing 请求带 `X-CSRF-Token: <value>` 头
3. CSRF 中间件对 POST/PUT/DELETE/PATCH 比较 cookie 值与 header 值
4. 豁免：Capacitor UA、`/auth/login`、`/auth/refresh`

## 端点变化

| 端点 | 变化 |
|------|------|
| `POST /auth/login` | 成功时 Set-Cookie 三个 cookie；body 不再返回 token |
| `POST /auth/refresh` | 从 cookie 读 refresh_token（fallback body）；Set-Cookie 新 token |
| `POST /auth/logout` | 清 cookie（Set-Cookie 空值 + maxAge=0） |
| `GET /auth/me` | **新增**：从 cookie 读 access_token 返回当前用户，用于页面恢复 |

## 并发 Refresh

两标签同时 refresh 时：`issueSession` 的旧 session 已被第一个标签 revoke，第二个标签的 session revoke 会失败。

**方案**：在 refresh controller 中，若 session 已被 revoke 但 refresh_token hash 匹配，降级为创建全新 session（不执行 revoke 步骤）。保证合法持有者并发 refresh 都能成功，不互相踢。

## 前端改动

- `api/auth.js`：删 localStorage 读写；`isLoggedIn()` 改为调用 `/auth/me`
- `api/request.js`：删 `Authorization` 头手动挂载；写请求自动注入 `X-CSRF-Token`（从 `csrf_token` cookie 读取）
- `Login.jsx`：适配新响应格式（不再从 body 拿 token）
- `App.jsx`：`RequireAuth` 改用异步 `isLoggedIn` 检查
- `AdminLayout.jsx`：logout 适配 cookie 清除

## 测试验证

```bash
cd backend && node --test test/auth-security.test.js  # 确认 C2a 不回退
npm run dev                                          # 浏览器 admin 测试登录/刷新/退出
```
