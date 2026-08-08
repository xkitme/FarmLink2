## 背景

你接手的代码在分支 `codex/refactor-farmlink`，上一轮刚完成 **C2a 安全加固批次**（4 个子项独立交付），文件全部在 working copy 未提交。本轮要交付 **C2b：管理台 HttpOnly Cookie 迁移**。

---

## C2a 已交付（本轮地基）

| # | 子项 | 关键产物 | 对 C2b 影响 |
|---|------|---------|------------|
| 1 | CORS + Origin | `app.js` cors() → `isOriginAllowed` 函数 + `credentials: true`；`originGuard.js` 写请求 Origin 校验 | ✅ `credentials: true` 已铺好，Cookie 跨域前提 |
| 2 | 上传安全 | `upload.js` MIME 白名单 + sharp EXIF 剥离；`uploadQuota.js` 配额 | 无直接影响 |
| 3 | 日志脱敏 | `apiControl.js` `sanitizeBody` 递归 3 层 + query 参数脱敏 | 无直接影响 |
| 4 | HTTPS 策略 | `config/index.js` https 配置块；`server.js` HTTPS 双栈 | Cookie `Secure` flag 前提 |

## C2b 目标：管理台完整 HttpOnly Cookie 迁移

当前认证：JWT Bearer Token（access + refresh）存在客户端（localStorage/内存），前端手动挂 `Authorization` 头。改为：

```
access_token  → HttpOnly / Secure / SameSite=Strict cookie（短 TTL ~15min）
refresh_token → HttpOnly / Secure / SameSite=Strict cookie（长 TTL ~7d）
csrf_token    → 服务端签发，前端读的非 HttpOnly cookie 或 X-CSRF-Token 头
```

### 必须一次性完成

- **cookie auth**：`requireAuth` 从读 `Authorization` 头改为优先读 cookie fallback Bearer；`/auth/refresh` 读 cookie 中 refresh；`/auth/logout` 清 cookie
- **CSRF**：state-changing 请求（POST/PUT/DELETE/PATCH）双重提交 cookie 模式；`/auth/login` 成功后签发 csrf cookie
- **Origin**：利用已有 `originGuard`，和 CSRF 形成双保险不冲突
- **多标签页 rotation**：刷新后通过 cookie 同步新 token（浏览器机制天然解决），但需确认并发 refresh 不互相踢
- **启动恢复**：页面首次加载 `/auth/me` 从 cookie 恢复；refresh 过期静默跳登录

### 关键约束

1. **管理台 only，Capacitor 不动**：原生壳继续走 `Authorization: Bearer`。`requireAuth` 按 User-Agent 或请求来源分流
2. **不删 `extractToken` / `verifyAuthToken`**：Capacitor 路径仍依赖它
3. **不碰 schema 不清数据库**
4. **不要 push**

### 预估改动范围

```
backend/src/middleware/auth.js                  — requireAuth 分流 cookie / Bearer
backend/src/modules/platform/auth.controller.js — login/logout/refresh 操作 cookie
backend/src/modules/platform/auth-token.js      — access token TTL 缩短
backend/src/config/index.js                     — cookie 配置（domain/secure/sameSite/maxAge）
backend/src/middleware/csrf.js                  — 新建：CSRF 签发 + 校验
backend/src/app.js                              — CSRF middleware 挂载点
backend/admin/src/                              — 前端删 localStorage token → cookie + CSRF header
```

## 当前 working copy（C2a 未提交）

```
backend/package.json                   +3  (optionalDependencies: sharp)
backend/src/app.js                     +9  (cors origin + originGuard)
backend/src/config/index.js            +20 (cors + https config)
backend/src/middleware/apiControl.js   +40 (sanitizeBody 递归 + query 脱敏)
backend/src/middleware/upload.js       +85 (MIME filter + sharp sanitize)
backend/src/middleware/originGuard.js   NEW
backend/src/middleware/uploadQuota.js   NEW
backend/src/modules/agri/agri.routes.js         +3 (uploadQuota)
backend/src/modules/ai/ai.routes.js             +3 (uploadQuota)
backend/src/modules/market/market.routes.js     +3 (uploadQuota)
backend/src/modules/platform/platform.routes.js +3 (uploadQuota)
backend/src/server.js                  +57 (HTTPS 双栈)
```

## 验证

```bash
cd backend && node --test test/auth-security.test.js  # 确认 C2a 不回退
npm run dev                                          # 浏览器 admin 测试登录/刷新/退出
```

---

## 实施备注（2026-08-08 Codex 实施）

### I1：提取共享 UA 检测模块

- 新建 `backend/src/utils/client-detect.js`，导出 `NATIVE_UA_RE` 和 `isNativeClient(req)`。
- 四文件统一复用：
  - `middleware/auth.js` — 删除本地 `NATIVE_UA_RE` / `isNativeClient`，改从 `client-detect.js` 导入
  - `middleware/csrf.js` — 同上，`isNative` → `isNativeClient`
  - `modules/platform/auth.controller.js` — 同上
  - `middleware/originGuard.js` — `originRequired()` 中的 inline `.includes()` 检查改为 `isNativeClient(req)` 调用，语义一致（均判断 capacitor/ionic/cordova UA）

### I2：浏览器 UA Cookie 认证集成测试

- 新建 `backend/test/c2b-cookie-auth.integration.test.js`
- 使用真实 Express + 临时 SQLite 数据库 + CookieJar（解析 Set-Cookie → 构建 Cookie 请求头）
- 覆盖：
  1. 浏览器登录 → 3 个 Set-Cookie，body 不含 token
  2. Cookie 属性：HttpOnly / SameSite=Strict / Path / Max-Age 校验
  3. GET /auth/me 仅凭 cookie 恢复用户
  4. CSRF double-submit：无 token → 403、错误 token → 403、正确 → 通过、GET 免校验
  5. Refresh 从 cookie 读取，轮换后 body 不泄露 token
  6. 两标签同 refresh cookie 并发刷新 → CAS grace 机制保证两个均 200，第三标签 replay 旧 refreshToken → 401
  7. Logout（access 可用、access 缺失仅 refresh 可用）→ 撤销会话 + 清 cookie
  8. Capacitor Bearer 回归：登录 body 含 token、refresh body 含 token、/auth/me 通过 Authorization 头、refresh JWT 保持 30 天、CSRF 豁免
- 已纳入 `npm test`（`package.json` scripts.test）

### I3：浏览器 refresh cookie 7 天与 refresh JWT 30 天对齐

- 方案：**不修改全局 `JWT_REFRESH_EXPIRES_IN`（默认 30d）**，新增独立配置：
  - `config.jwt.refreshExpiresInBrowser` = `JWT_REFRESH_EXPIRES_IN_BROWSER` 环境变量，默认 `'7d'`
- 实施链路：
  - `auth-token.js`：`signRefreshToken(payload, expiresIn)` 支持可选 TTL 覆盖
  - `auth-session.service.js`：`issueSession(user, metadata, replaceSessionId, refreshExpiresIn)` 传递给 `signRefreshToken`
  - `auth.controller.js`：`login()` 和 `refresh()` 在 `!isNativeClient(req)` 分支传入 `config.jwt.refreshExpiresInBrowser`
- Capacitor 原生端不受影响：`isNativeClient(req)` 分支不传第四个参数 → 回退到全局 `30d`
- **策略**：管理台浏览器 7 天、原生壳 30 天，由 `JWT_REFRESH_EXPIRES_IN_BROWSER` 环境变量显式控制，测试中锁定

### M1-M3 核查

- **M1**：已 `rg` 确认 `backend/admin/src/api/auth.js` 的 `saveSession` 无引用，已删除导出。
- **M2**：`setCsrfCookie` 原 `return token` 无人使用，已删除 return 语句改为 void，cookie 签发逻辑保留不变。
- **M3**：`buildSession` 仅 `register()` 使用，保留以维持注册 Bearer 返回兼容；注册不设 cookie，行为与之前一致。

### 改动文件清单

| 文件 | 操作 |
|------|------|
| `backend/src/utils/client-detect.js` | **新建** — 共享客户端类型检测 |
| `backend/src/modules/platform/auth.security.js` | 修改 — 新增 `REFRESH_ROTATION_GRACE_MS` 常量 |
| `backend/src/middleware/auth.js` | 修改 — 导入 isNativeClient，删除本地重复；grace 时间窗校验 |
| `backend/src/middleware/csrf.js` | 修改 — isNative→isNativeClient；删除 setCsrfCookie 无用 return |
| `backend/src/middleware/originGuard.js` | 修改 — originRequired 使用 isNativeClient |
| `backend/src/modules/platform/auth.controller.js` | 修改 — 导入共享模块 + 浏览器 refresh TTL + CAS grace 时间窗 |
| `backend/src/modules/platform/auth-token.js` | 修改 — signRefreshToken 支持 expiresIn 参数 |
| `backend/src/modules/platform/auth-session.service.js` | 修改 — issueSession 支持 refreshExpiresIn/allowGrace + grace 时间窗 |
| `backend/src/config/index.js` | 修改 — 新增 refreshExpiresInBrowser 配置 |
| `backend/admin/src/api/auth.js` | 修改 — 删除无引用 saveSession 导出 |
| `backend/package.json` | 修改 — test 脚本加入 c2b 测试 |
| `backend/test/c2b-cookie-auth.integration.test.js` | **新建** — 浏览器 UA Cookie 集成测试（18 项） |

### 仍存风险

1. **并发 refresh CAS grace 窗口**：浏览器并发 refresh 实现双层 CAS grace（controller 层 + issueSession 层），仅当 `revokedAt == lastUsedAt`（rotation 撤销标记）且撤销时间距当前 ≤ `REFRESH_ROTATION_GRACE_MS`（5 秒）时允许消费一次性 grace。logout/admin 强制撤销（只设 revokedAt 不更新 lastUsedAt）不触发 grace。超出 5 秒窗口的旧 rotation token 直接 401，不可重用。每个 session 的 grace 最多被消费 1 次（CAS updateMany 保证），三标签并发时最多 2 个成功、其余 401。
2. **csrf_token cookie 跨浏览器会话持久化**：当前 `maxAge` 与 `refreshTokenMaxAge`（7d）对齐，浏览器重启后仍可用。这是有意设计（减少登录摩擦），但比 session cookie 有更大的 CSRF 窗口。
3. **dev 环境 Secure=false**：本地测试通过的 cookie 属性在生产环境（Secure=true）需额外验证。
4. **未改前端**：管理台前端（`backend/admin/src/`）已按 C2b 计划在之前批次完成适配；本轮仅后端收尾，前端已部署的版本与本轮后端兼容。

### 验证结果（2026-08-08）

- `node --check` 对所有修改文件通过
- `npm test`：35/35 pass（6 项 auth-security 子测试 + 9 项 Phase B 认证/会话/重置码子测试 + 18 项 C2b 浏览器 Cookie 子测试 + 2 项父 suite）
- C2b 测试连续 3 次全绿（含并发竞态、grace 窗口过期拒绝、三标签并发等边界场景）
- `npm run build --prefix admin` 构建成功
