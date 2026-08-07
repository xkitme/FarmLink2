# C2b: 管理台 HttpOnly Cookie 迁移 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理台 JWT Bearer Token（localStorage）→ HttpOnly Cookie 认证，含 CSRF 保护

**Architecture:** 后端按 User-Agent 分流 cookie/Bearer；login/refresh 响应 Set-Cookie 三个 cookie（access_token/refresh_token/csrf_token）；前端删 localStorage 逻辑，写请求注入 CSRF 头，启动恢复走 /auth/me

**Tech Stack:** Express 4 + cookie-parser + jsonwebtoken + React (Vite) + Ant Design

## Global Constraints

- 管理台 only，Capacitor 原生壳不动（UA 包含 `capacitor`/`ionic`/`cordova` 走 Bearer）
- 不删 `extractToken` / `verifyAuthToken` — Capacitor 路径仍依赖
- 不碰 Prisma schema 不清数据库
- 不要 push（所有改动留在 working copy）
- dev 环境 cookie `Secure=false`，demo/release `Secure=true`
- `SameSite=Strict` 所有环境生效
- access token TTL 改为 15min（环境变量 `JWT_EXPIRES_IN` 可控）

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/package.json` | Modify | +cookie-parser dependency |
| `backend/src/config/index.js` | Modify | +cookie 配置块；JWT expiresIn 默认 15min |
| `backend/src/app.js` | Modify | +cookieParser 中间件；+csrfGuard 挂载 |
| `backend/src/middleware/auth.js` | Modify | requireAuth/optionalAuth 分流 cookie/Bearer |
| `backend/src/middleware/csrf.js` | **Create** | CSRF 签发 + 校验 + 清除 |
| `backend/src/modules/platform/auth.controller.js` | Modify | login/refresh/logout 操作 cookie；+me() |
| `backend/src/modules/platform/auth-session.service.js` | Modify | issueSession 支持 skipRevoke（并发 refresh） |
| `backend/src/modules/platform/platform.routes.js` | Modify | +GET /auth/me |
| `backend/admin/src/api/auth.js` | Modify | 删 localStorage；+fetchUser/isLoggedIn 走 /auth/me |
| `backend/admin/src/api/request.js` | Modify | 删 Authorization 头；+credentials；+X-CSRF-Token |
| `backend/admin/src/App.jsx` | Modify | RequireAuth 异步化 |
| `backend/admin/src/pages/Login.jsx` | Modify | 适配 cookie 响应 |
| `backend/admin/src/layout/AdminLayout.jsx` | Modify | 用户信息从 fetchUser 取；logout 适配 |

---

### Task 1: 基础设施 — cookie-parser + cookie 配置

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/src/config/index.js`
- Modify: `backend/src/app.js`

**Produces:** `config.cookie` 对象可被所有后续任务引用；`req.cookies` 在所有路由可用

- [ ] **Step 1: 安装 cookie-parser**

```bash
cd backend && npm install cookie-parser
```

- [ ] **Step 2: 在 config/index.js 新增 cookie 配置块 + 缩短 access TTL**

在 `config` 对象的 `https` 块之后插入 `cookie` 块：

```js
// Cookie：管理台 HttpOnly 认证
cookie: {
  secure: runtimeEnvironment !== 'dev',
  sameSite: 'Strict',
  accessTokenMaxAge: 15 * 60 * 1000,           // 15 min，与 JWT expiresIn 对齐
  refreshTokenMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
},
```

同时修改 JWT expiresIn 默认值（`jwt` 块中）：

```js
expiresIn: process.env.JWT_EXPIRES_IN || '15m',
```

原来的默认值是 `'2h'`。

- [ ] **Step 3: 在 app.js 挂载 cookieParser**

在 imports 区域增加：

```js
import cookieParser from 'cookie-parser'
```

在 `app.use(express.urlencoded(...))` 之后插入：

```js
app.use(cookieParser())
```

后续也会在此文件挂载 csrfGuard（见 Task 2）。

- [ ] **Step 4: 验证 — 启动后端确认无报错**

```bash
cd backend && timeout 5 npm run dev:backend 2>&1 || true
# 应正常启动，无 import 错误或配置报错
```

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/config/index.js backend/src/app.js
git commit -m "feat(c2b): add cookie-parser + cookie config + 15min access TTL"
```

---

### Task 2: CSRF 中间件

**Files:**
- Create: `backend/src/middleware/csrf.js`
- Modify: `backend/src/app.js`

**Consumes:** `config.cookie` from Task 1；`req.cookies` from cookie-parser
**Produces:** `setCsrfCookie(res)`, `csrfGuard(req,res,next)`, `clearCsrfCookie(res)`

- [ ] **Step 1: 创建 middleware/csrf.js**

```js
import { randomUUID } from 'node:crypto'
import { config } from '../config/index.js'
import { errors } from '../utils/response.js'

const WRITE_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])
const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'x-csrf-token'

const NATIVE_UA = /capacitor|ionic|cordova/i

function isNative(req) {
  return NATIVE_UA.test((req.headers['user-agent'] || '').toLowerCase())
}

/** login 成功后调用：签发 csrf_token cookie（非 HttpOnly，JS 可读） */
export function setCsrfCookie(res) {
  const token = randomUUID()
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/',
  })
  return token
}

/** 登出时清除 csrf cookie */
export function clearCsrfCookie(res) {
  res.clearCookie(CSRF_COOKIE, { path: '/' })
}

/** CSRF 校验中间件：写请求 double-submit cookie 模式 */
export function csrfGuard(req, res, next) {
  if (!WRITE_METHODS.has(req.method)) return next()
  if (isNative(req)) return next()

  const path = (req.originalUrl || req.url || '').split('?')[0]
  // 登录/刷新是 cookie 的"发行方"，自身不需要 CSRF 保护
  if (path.endsWith('/auth/login') || path.endsWith('/auth/refresh')) return next()

  const cookieToken = req.cookies?.[CSRF_COOKIE]
  const headerToken = req.headers[CSRF_HEADER]

  if (!cookieToken || !headerToken) {
    return next(errors.forbidden('CSRF 校验失败：缺少 token'))
  }
  if (cookieToken !== headerToken) {
    return next(errors.forbidden('CSRF 校验失败：token 不匹配'))
  }

  next()
}
```

- [ ] **Step 2: 在 app.js 挂载 csrfGuard**

在 `originGuard` 之后、路由注册之前插入：

```js
import { csrfGuard } from './middleware/csrf.js'
// ...existing imports...

app.use(originGuard)
app.use(csrfGuard)
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/middleware/csrf.js backend/src/app.js
git commit -m "feat(c2b): add CSRF double-submit cookie middleware"
```

---

### Task 3: Auth 中间件 — cookie/Bearer 分流

**Files:**
- Modify: `backend/src/middleware/auth.js`

**Consumes:** `req.cookies` from cookie-parser（Task 1）
**Produces:** `requireAuth` / `optionalAuth` 对管理台读 cookie、Capacitor 读 Bearer

- [ ] **Step 1: 修改 auth.js**

在 `extractToken` 函数之后新增两个辅助函数，然后修改 `requireAuth` 和 `optionalAuth`：

```js
// --- 新增：cookie 读取 + 客户端分流 ---

const NATIVE_UA_RE = /capacitor|ionic|cordova/i

function isNativeClient(req) {
  return NATIVE_UA_RE.test((req.headers['user-agent'] || '').toLowerCase())
}

function extractTokenFromCookie(req) {
  return req.cookies?.access_token || null
}
```

修改 `requireAuth`（仅函数体，签名不变）：

```js
export async function requireAuth(req, res, next) {
  let token = null
  if (isNativeClient(req)) {
    token = extractToken(req)
  } else {
    token = extractTokenFromCookie(req) || extractToken(req)
  }
  if (!token) return next(errors.unauthorized())
  try {
    req.user = await verifyAuthToken(token)
    next()
  } catch (e) {
    next(e)
  }
}
```

修改 `optionalAuth`（同样仅函数体）：

```js
export async function optionalAuth(req, res, next) {
  let token = null
  if (isNativeClient(req)) {
    token = extractToken(req)
  } else {
    token = extractTokenFromCookie(req) || extractToken(req)
  }
  if (token) {
    try { req.user = await verifyAuthToken(token) } catch { /* 忽略 */ }
  }
  next()
}
```

保持 `extractToken`、`verifyAuthToken`、`requireRole` 不变。

- [ ] **Step 2: Commit**

```bash
git add backend/src/middleware/auth.js
git commit -m "feat(c2b): requireAuth cookie/Bearer分流 by User-Agent"
```

---

### Task 4: Auth 控制器 — login/refresh/logout 操作 cookie + /auth/me

**Files:**
- Modify: `backend/src/modules/platform/auth.controller.js`
- Modify: `backend/src/modules/platform/auth-session.service.js`

**Consumes:** `config.cookie`（Task 1）；`setCsrfCookie`/`clearCsrfCookie`（Task 2）；`issueSession`（auth-session.service.js）
**Produces:** `me(req,res)` 端点；login/refresh/logout 操作 Set-Cookie；并发 refresh 降级

- [ ] **Step 1: auth-session.service.js — issueSession 支持 skipRevoke**

修改 `issueSession` 函数，当 `replaceSessionId` 为 `null` 时跳过 revoke 步骤：

在原函数的 `prisma.$transaction` 内部，将 revoke 逻辑包在条件中：

```js
await prisma.$transaction(async (tx) => {
  // 仅当 replaceSessionId 非 null 时执行 revoke
  // null = 并发降级模式：旧 session 已被另一标签 revoke，跳过 revoke 直接新建
  if (replaceSessionId) {
    const revoked = await tx.authSession.updateMany({
      where: {
        id: replaceSessionId,
        userId: user.id,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now, lastUsedAt: now },
    })
    if (revoked.count !== 1) throw errors.unauthorized('会话已失效，请重新登录')
  }

  await tx.authSession.create({
    data: {
      id: sessionId,
      userId: user.id,
      refreshTokenHash: hashOpaqueToken(refreshToken),
      deviceName: metadata.deviceName || null,
      userAgent: metadata.userAgent || null,
      expiresAt: tokenExpiresAt(refreshToken),
      lastUsedAt: now,
    },
  })
})
```

其余函数体不变。`function` 签名改为显式标注 `replaceSessionId = null` 的默认行为不变，`if (replaceSessionId)` 条件即可区分。

- [ ] **Step 2: auth.controller.js — 新增 cookie 工具函数**

在 imports 区域增加：

```js
import { config } from '../../config/index.js'
import { setCsrfCookie, clearCsrfCookie } from '../../middleware/csrf.js'
import { hashOpaqueToken, safeHashEquals } from './auth.security.js'
```

在 `sanitizeUser` 之后新增：

```js
/** 设置认证相关 cookie */
function setAuthCookies(res, token, refreshToken) {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/api',
    maxAge: config.cookie.accessTokenMaxAge,
  })
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/api/v1/auth',
    maxAge: config.cookie.refreshTokenMaxAge,
  })
  setCsrfCookie(res)
}

/** 清除认证相关 cookie */
function clearAuthCookies(res) {
  res.clearCookie('access_token', { path: '/api' })
  res.clearCookie('refresh_token', { path: '/api/v1/auth' })
  clearCsrfCookie(res)
}
```

- [ ] **Step 3: auth.controller.js — 修改 login()**

```js
export async function login(req, res) {
  const { username, password } = req.body
  if (!username || !password) throw errors.param('请输入用户名和密码')

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw errors.param('用户名或密码错误')
  }
  if (user.status !== 1) throw errors.forbidden('账号已被禁用')

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  const session = await issueSession(user, sessionMetadata(req))
  setAuthCookies(res, session.token, session.refreshToken)
  ok(res, { user: sanitizeUser(user) }, '登录成功')
}
```

注意：`buildSession` 不再直接调用——改为直接调用 `issueSession` 然后 `setAuthCookies`。不返回 token 给前端 body。

- [ ] **Step 4: auth.controller.js — 修改 refresh()（含并发降级）**

```js
export async function refresh(req, res) {
  const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken
  if (!refreshToken) throw errors.param('缺少 refreshToken')

  let sessionUser
  try {
    sessionUser = await verifyAuthToken(refreshToken, 'refresh')
  } catch (e) {
    if (e.name === 'BusinessError') throw e
    throw errors.unauthorized('refreshToken 无效或已过期')
  }

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } })
  if (!user) throw errors.unauthorized()

  // 并发 refresh：如果 session 已被另一标签 revoke，验证 hash 匹配后降级为新建
  let replaceId = sessionUser.sessionId
  if (replaceId) {
    const existing = await prisma.authSession.findUnique({ where: { id: replaceId } })
    if (!existing || existing.revokedAt) {
      if (!existing || !safeHashEquals(existing.refreshTokenHash, hashOpaqueToken(refreshToken))) {
        throw errors.unauthorized('refreshToken 已失效')
      }
      replaceId = null // 降级：旧 session 已撤销，跳过 revoke 直接新建
    }
  }

  const session = await issueSession(user, sessionMetadata(req), replaceId)
  setAuthCookies(res, session.token, session.refreshToken)
  ok(res, { user: sanitizeUser(user) })
}
```

- [ ] **Step 5: auth.controller.js — 修改 logout()**

```js
export async function logout(req, res) {
  const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken || ''
  let userId = req.user?.id
  let sessionId = req.user?.sessionId

  if (refreshToken) {
    try {
      const claims = verifyTokenClaims(refreshToken, 'refresh')
      if (!claims.sid || !claims.id) throw errors.unauthorized()
      userId = Number(claims.id)
      sessionId = `${claims.sid}`
    } catch (error) {
      if (!req.user) throw errors.unauthorized('退出凭据无效或已过期')
    }
  }

  if (!userId || !sessionId) throw errors.unauthorized()
  await revokeUserSession(userId, sessionId)
  clearAuthCookies(res)
  ok(res, null, '已退出登录')
}
```

- [ ] **Step 6: auth.controller.js — 新增 me()**

在 `register` 函数之前新增：

```js
/** 当前用户 — 管理台页面恢复从 cookie 读 access_token，requireAuth 已完成校验 */
export async function me(req, res) {
  ok(res, sanitizeUser(req.user))
}
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/platform/auth.controller.js backend/src/modules/platform/auth-session.service.js
git commit -m "feat(c2b): login/refresh/logout set cookies + /auth/me + concurrent refresh"
```

---

### Task 5: 路由注册 — /auth/me

**Files:**
- Modify: `backend/src/modules/platform/platform.routes.js`

**Consumes:** `me` from auth.controller（Task 4）

- [ ] **Step 1: platform.routes.js — 新增 GET /auth/me**

在 `router.get('/auth/sessions', ...)` 之前插入：

```js
router.get('/auth/me', requireAuth, wrap(auth.me))
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/platform/platform.routes.js
git commit -m "feat(c2b): add GET /auth/me route"
```

---

### Task 6: 前端 — api/auth.js 重写

**Files:**
- Modify: `backend/admin/src/api/auth.js`

**Produces:** `fetchUser()`, `isLoggedIn()`, `getCsrfToken()`, `getCurrentUser()`, `setCurrentUser()`, `clearSession()`, `saveSession()` — 全部适配 cookie 模式

- [ ] **Step 1: 重写 api/auth.js**

```js
let _cachedUser = null

function parseCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
  return match ? match[1] : null
}

/** 获取 CSRF token（前端注入 X-CSRF-Token 头用） */
export function getCsrfToken() {
  return parseCsrfToken()
}

/** 缓存用户信息（login/me 成功后调用） */
export function setCurrentUser(user) {
  _cachedUser = user || null
}

/** 获取缓存的用户信息 */
export function getCurrentUser() {
  return _cachedUser || {}
}

/** 从 /auth/me 恢复登录态（页面刷新/新标签页） */
export async function fetchUser() {
  try {
    const resp = await fetch('/api/v1/auth/me', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    const payload = await resp.json()
    if (resp.ok && payload.code === 200) {
      _cachedUser = payload.data || null
      return _cachedUser
    }
    _cachedUser = null
    return null
  } catch {
    _cachedUser = null
    return null
  }
}

/** 检查是否已登录（通过 /auth/me） */
export async function isLoggedIn() {
  const user = await fetchUser()
  return Boolean(user)
}

/** 登录成功回调（缓存 user + CSRF cookie 由服务端 Set-Cookie） */
export function saveSession(user) {
  _cachedUser = user || null
}

/** 清除本地登录态 */
export function clearSession() {
  _cachedUser = null
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/admin/src/api/auth.js
git commit -m "feat(c2b): rewrite auth.js — localStorage → cookie + /auth/me"
```

---

### Task 7: 前端 — api/request.js 适配 cookie

**Files:**
- Modify: `backend/admin/src/api/request.js`

**Consumes:** `getCsrfToken` from auth.js（Task 6）

- [ ] **Step 1: 修改 request.js**

头部的 imports 改为：

```js
import { clearSession, getCsrfToken } from './auth.js'
import { message } from './feedback.js'
```

新增常量：

```js
const WRITE_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])
```

修改 `request()` 函数 — 删 `Authorization` 头逻辑，加 `credentials` + CSRF：

```js
export async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const headers = {
    ...(options.headers || {}),
  }
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'

  // CSRF：写请求注入 X-CSRF-Token
  if (WRITE_METHODS.has(method)) {
    const csrf = getCsrfToken()
    if (csrf) headers['X-CSRF-Token'] = csrf
  }

  const response = await fetch(buildUrl(path, options.params), {
    ...options,
    method,
    headers,
    credentials: 'include',
    body: options.body instanceof FormData
      ? options.body
      : options.body
        ? JSON.stringify(options.body)
        : undefined,
  })
  // ... rest unchanged from original (payload handling, error handling)
```

修改 `rawRequest()` 函数 — 同样删 `Authorization`/`token` 逻辑，加 `credentials` + CSRF：

```js
export async function rawRequest(path, options = {}) {
  const targetUrl = normalizeDebugPath(path)
  const method = (options.method || 'GET').toUpperCase()
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  }
  if (options.body !== undefined && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  // CSRF
  if (WRITE_METHODS.has(method)) {
    const csrf = getCsrfToken()
    if (csrf) headers['X-CSRF-Token'] = csrf
  }

  const started = performance.now()
  const response = await fetch(targetUrl, {
    method,
    headers,
    credentials: 'include',
    body: method === 'GET' || method === 'HEAD'
      ? undefined
      : options.body instanceof FormData
        ? options.body
        : options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
  })
  // ... rest unchanged (responseHeaders, return block)
```

`buildUrl` 函数保持不变。

- [ ] **Step 2: Commit**

```bash
git add backend/admin/src/api/request.js
git commit -m "feat(c2b): request.js — drop Authorization, add credentials+CSRF"
```

---

### Task 8: 前端 — App.jsx RequireAuth 异步化

**Files:**
- Modify: `backend/admin/src/App.jsx`

**Consumes:** `isLoggedIn` async from auth.js（Task 6）

- [ ] **Step 1: 修改 App.jsx**

在 imports 中增加 `useEffect, useState` from react 和 `Spin` from antd：

```jsx
import { useEffect, useState } from 'react'
import { Spin } from 'antd'
```

替换 `RequireAuth` 组件：

```jsx
function RequireAuth({ children }) {
  const [state, setState] = useState('loading') // 'loading' | 'ok' | 'no'

  useEffect(() => {
    isLoggedIn().then(ok => setState(ok ? 'ok' : 'no'))
  }, [])

  if (state === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }
  return state === 'ok' ? children : <Navigate to="/login" replace />
}
```

其余部分（Routes 结构）保持不变。

- [ ] **Step 2: Commit**

```bash
git add backend/admin/src/App.jsx
git commit -m "feat(c2b): RequireAuth async check via /auth/me"
```

---

### Task 9: 前端 — Login.jsx 适配 cookie 响应

**Files:**
- Modify: `backend/admin/src/pages/Login.jsx`

**Consumes:** `setCurrentUser`, `clearSession` from auth.js（Task 6）

- [ ] **Step 1: 修改 Login.jsx**

将 import 从 `saveSession` 改为 `setCurrentUser`：

```jsx
import { setCurrentUser, clearSession } from '../api/auth.js'
```

修改 `onFinish` 函数 — `saveSession` 改名为 `setCurrentUser`，传入 `user` 而非整个 session：

```jsx
async function onFinish(values) {
  const data = await api.post('/auth/login', values)
  // data = { user: {...} }，不含 token/refreshToken
  const user = data.user || data
  if (user.role !== 'ADMIN') {
    setCurrentUser(user)
    try {
      await rawRequest('/auth/logout', { method: 'POST' })
    } catch {
      // 非管理员账号也必须立刻收口
    } finally {
      clearSession()
    }
    message.error('当前账号不是管理员')
    return
  }
  setCurrentUser(user)
  message.success('登录成功')
  navigate('/dashboard', { replace: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/admin/src/pages/Login.jsx
git commit -m "feat(c2b): Login adapts to cookie-based auth response"
```

---

### Task 10: 前端 — AdminLayout.jsx 适配

**Files:**
- Modify: `backend/admin/src/layout/AdminLayout.jsx`

**Consumes:** `fetchUser`, `getCurrentUser`, `clearSession` from auth.js（Task 6）

- [ ] **Step 1: 修改 AdminLayout.jsx**

更新 import：

```jsx
import { clearSession, fetchUser, getCurrentUser } from '../api/auth.js'
```

修改用户状态获取逻辑——从 localStorage 改为内存缓存 + 异步恢复：

```jsx
export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(() => getCurrentUser())
  const [collapsed, setCollapsed] = useState(false)
  const [brandLogo, setBrandLogo] = useState('')

  // 页面恢复：如果内存无 user 则从 /auth/me 拉取
  useEffect(() => {
    if (!user || !user.id) {
      fetchUser().then(u => { if (u) setUser(u) })
    }
  }, [])
  // ... brand logo useEffect 保持不变
```

logout 逻辑保持不变（无需修改——它已经通过 `rawRequest('/auth/logout', { method: 'POST' })` 携带 cookie）。

- [ ] **Step 2: Commit**

```bash
git add backend/admin/src/layout/AdminLayout.jsx
git commit -m "feat(c2b): AdminLayout async user fetch via /auth/me + cookie logout"
```

---

### Task 11: 端到端验证

**Files:** 无新增

- [ ] **Step 1: 运行 C2a 回归测试**

```bash
cd backend && node --test test/auth-security.test.js
```

确认所有 C2a 测试仍通过。

- [ ] **Step 2: 启动开发环境手动验证**

```bash
cd backend && npm run dev
```

浏览器打开 `http://localhost:<port>/admin/login`，验证：
1. 登录成功 → cookie 中 `csrf_token` 可见，`access_token`/`refresh_token` 为 HttpOnly
2. 跳转 dashboard → `/auth/me` 返回用户信息
3. 刷新页面 → 不跳回登录页（cookie 恢复）
4. 写操作（如 API 开关 toggle）→ 请求携带 `X-CSRF-Token` 头
5. 退出登录 → cookie 被清除，跳转登录页

- [ ] **Step 3: 最终 commit**

```bash
git add -A
git commit -m "feat(c2b): admin HttpOnly cookie migration complete

- HttpOnly/Secure/SameSite=Strict cookies for access_token + refresh_token
- CSRF double-submit cookie pattern for state-changing requests
- UA-based split: cookie for admin web, Bearer for Capacitor native
- /auth/me endpoint for page-load session recovery
- Concurrent refresh grace mode: hash-verify on already-rotated sessions

Co-Authored-By: Claude <noreply@anthropic.com>"
```
