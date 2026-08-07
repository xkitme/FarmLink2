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
