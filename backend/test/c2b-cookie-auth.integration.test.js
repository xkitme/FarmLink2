/**
 * C2b HttpOnly Cookie 认证集成测试
 *
 * 测试范围：
 * - 浏览器 UA 登录 → 3 个 Set-Cookie，token 不出现在 body
 * - Cookie 属性精确校验（HttpOnly / SameSite / Path / Max-Age）
 * - /auth/me 仅凭 cookie 恢复用户
 * - CSRF double-submit：无 token → 403、错误 → 403、正确 → 200
 * - Refresh 从 cookie 读取并轮换认证 cookie，body 不泄露 token
 * - 两标签同 refresh cookie 并发刷新 → 两个均 200 + 第三次旧 token 401
 * - Logout（access 可用 + access 缺失仅 refresh 可用）→ 撤销 + 清 cookie
 * - Capacitor Bearer 回归路径
 */

import { execFileSync } from 'node:child_process'
import { closeSync, mkdtempSync, openSync, rmSync } from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { REFRESH_ROTATION_GRACE_MS } from '../src/modules/platform/auth.security.js'

const backendRoot = path.resolve(import.meta.dirname, '..')
const testRoot = mkdtempSync(path.join(backendRoot, 'prisma', '.test-c2b-'))
closeSync(openSync(path.join(testRoot, 'c2b.db'), 'w'))
process.env.DATABASE_URL = `file:./${path.basename(testRoot)}/c2b.db`
process.env.APP_ENV = 'dev'
process.env.JWT_REFRESH_EXPIRES_IN_BROWSER = '7d'

const prismaCli = path.join(backendRoot, 'node_modules', 'prisma', 'build', 'index.js')
execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], {
  cwd: backendRoot,
  env: process.env,
  stdio: 'pipe',
})

const [{ default: app }, { prisma }, { default: bcrypt }] = await Promise.all([
  import('../src/app.js'),
  import('../src/db.js'),
  import('bcryptjs'),
])

let server
let baseUrl
let requestSequence = 1

// ── cookie jar ──────────────────────────────────

/** 解析 Set-Cookie 头 */
function parseSetCookie(header) {
  if (!header) return null
  const parts = header.split(';').map((s) => s.trim())
  const [nameValue] = parts
  const eq = nameValue.indexOf('=')
  if (eq === -1) return null
  const entry = {
    name: nameValue.slice(0, eq),
    value: nameValue.slice(eq + 1),
    httpOnly: false,
    secure: false,
    sameSite: null,
    path: null,
    maxAge: null,
  }
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i].toLowerCase()
    if (p === 'httponly') entry.httpOnly = true
    else if (p === 'secure') entry.secure = true
    else if (p.startsWith('samesite=')) entry.sameSite = parts[i].slice('samesite='.length)
    else if (p.startsWith('path=')) entry.path = parts[i].slice('path='.length)
    else if (p.startsWith('max-age=')) entry.maxAge = parseInt(parts[i].slice('max-age='.length), 10)
  }
  return entry
}

class CookieJar {
  constructor() { this._jar = new Map() }

  /** 从 Set-Cookie 响应头更新 jar（原地） */
  ingest(headers) {
    const raw = headers.getSetCookie?.() || []
    for (const h of raw) {
      const parsed = parseSetCookie(h)
      if (!parsed) continue
      if (!parsed.value) {
        this._jar.delete(parsed.name)
        continue
      }
      this._jar.set(parsed.name, parsed)
    }
  }

  /** 深度克隆：返回独立 jar，后续操作不互相影响 */
  clone() {
    const c = new CookieJar()
    for (const [k, v] of this._jar) {
      c._jar.set(k, { ...v })
    }
    return c
  }

  /** 读取解析条目 */
  entry(name) { return this._jar.get(name) || null }

  /** 构建 Cookie 请求头（RFC 6265 path-match） */
  header(reqPath = '/') {
    const entries = [...this._jar.values()].filter((e) => {
      const cp = e.path || '/'
      const rp = reqPath || '/'
      // cookie-path 必须是 request-path 的前缀
      if (!rp.startsWith(cp)) return false
      // 匹配：cookie-path 末尾是 /，或 request-path 的下一个字符是 /，或完全相等
      return cp.endsWith('/') || rp.length === cp.length || rp[cp.length] === '/'
    })
    entries.sort((a, b) => (b.path || '/').length - (a.path || '/').length)
    const pairs = entries.map((e) => `${e.name}=${e.value}`)
    return pairs.length ? pairs.join('; ') : null
  }

  /** 取单个 cookie 值 */
  get(name) {
    const e = this._jar.get(name)
    return e ? e.value : null
  }
}

// ── helpers ──────────────────────────────────────

/** 发起请求并收集 Set-Cookie；输入 jar 会被 clone，原 jar 不变 */
async function apiWithJar(method, pathName, opts = {}) {
  const jar = opts.jar ? opts.jar.clone() : new CookieJar()
  const url = `${baseUrl}/api/v1${pathName}`
  const headers = { ...(opts.extraHeaders || {}) }

  if (!(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const reqPath = `/api/v1${pathName}`
  const cookieHeader = jar.header(reqPath)
  if (cookieHeader) headers['Cookie'] = cookieHeader

  const finalHeaders = { ...headers, ...(opts.rawHeaders || {}) }
  // 每个请求唯一 X-Forwarded-For，避免被全局限流聚合
  finalHeaders['X-Forwarded-For'] = `c2b-test-${requestSequence++}`

  const fetchOpts = {
    method,
    headers: finalHeaders,
    body: opts.body
      ? (opts.body instanceof FormData ? opts.body : JSON.stringify(opts.body))
      : undefined,
    redirect: 'manual',
  }

  const response = await fetch(url, fetchOpts)
  jar.ingest(response.headers)
  let payload
  try {
    payload = await response.json()
  } catch {
    payload = null
  }
  return { status: response.status, payload, jar, headers: response.headers }
}

// ── setup / teardown ────────────────────────────

before(async () => {
  const passwordHash = await bcrypt.hash('test-password', 4)
  await prisma.user.createMany({
    data: [
      { username: 'c2b-admin', nickname: 'C2B 管理员', passwordHash, role: 'ADMIN' },
      { username: 'c2b-farmer', nickname: 'C2B 农户', passwordHash, role: 'FARMER' },
    ],
  })
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await prisma.$disconnect()
  rmSync(testRoot, { recursive: true, force: true })
})

// ── tests ────────────────────────────────────────

test('C2b HttpOnly Cookie 认证集成', async (t) => {
  // ================================================================
  // 1. 浏览器登录 → 3 个 Set-Cookie，token 不出现在 body
  // ================================================================
  await t.test('浏览器登录返回 3 个 Set-Cookie，body 不含 token', async () => {
    const { status, payload, jar } = await apiWithJar('POST', '/auth/login', {
      body: { username: 'c2b-admin', password: 'test-password' },
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })

    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.equal(payload.data.token, undefined)
    assert.equal(payload.data.refreshToken, undefined)
    assert.ok(payload.data.user)
    assert.equal(payload.data.user.username, 'c2b-admin')

    const access = jar.entry('access_token')
    const refresh = jar.entry('refresh_token')
    const csrf = jar.entry('csrf_token')
    assert.ok(access, '缺少 access_token cookie')
    assert.ok(refresh, '缺少 refresh_token cookie')
    assert.ok(csrf, '缺少 csrf_token cookie')

    // access_token 属性
    assert.equal(access.httpOnly, true)
    assert.equal(access.sameSite, 'Strict')
    assert.equal(access.path, '/api')
    assert.equal(access.maxAge, 900, 'access_token Max-Age 应为 900s (15 min)')
    assert.equal(access.secure, false, 'dev 环境 Secure=false')

    // refresh_token 属性
    assert.equal(refresh.httpOnly, true)
    assert.equal(refresh.sameSite, 'Strict')
    assert.equal(refresh.path, '/api/v1/auth')
    assert.equal(refresh.maxAge, 604800, 'refresh_token Max-Age 应为 604800s (7d)')

    // csrf_token 属性
    assert.equal(csrf.httpOnly, false, 'csrf_token 必须非 HttpOnly（JS 可读）')
    assert.equal(csrf.sameSite, 'Strict')
    assert.equal(csrf.path, '/')
    assert.equal(csrf.maxAge, 604800, 'csrf_token Max-Age 应为 604800s (7d)')

    // refresh JWT TTL 应为 7d（浏览器路径）
    const { default: jwt } = await import('jsonwebtoken')
    const refreshDecoded = jwt.decode(refresh.value)
    assert.ok(refreshDecoded.exp, 'refresh_token 缺少 exp')
    const ttlSec = refreshDecoded.exp - refreshDecoded.iat
    assert.ok(ttlSec >= 604800 - 5 && ttlSec <= 604800 + 5,
      `浏览器 refresh JWT TTL 应为 ~7d (604800s)，实际 ${ttlSec}s`)
  })

  // ================================================================
  // 2. GET /auth/me 仅凭 cookie 恢复用户
  // ================================================================
  await t.test('GET /auth/me 仅凭 cookie 恢复用户', async () => {
    const login = await apiWithJar('POST', '/auth/login', {
      body: { username: 'c2b-admin', password: 'test-password' },
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(login.status, 200)

    const me = await apiWithJar('GET', '/auth/me', {
      jar: login.jar,
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(me.status, 200)
    assert.equal(me.payload.data.username, 'c2b-admin')
    assert.equal(me.payload.data.role, 'ADMIN')
  })

  await t.test('GET /auth/me 无 cookie → 401', async () => {
    const me = await apiWithJar('GET', '/auth/me', {
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(me.status, 401)
  })

  // ================================================================
  // 3. CSRF double-submit
  // ================================================================
  await t.test('CSRF：写请求无 X-CSRF-Token → 403', async () => {
    const login = await apiWithJar('POST', '/auth/login', {
      body: { username: 'c2b-admin', password: 'test-password' },
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(login.status, 200)

    const resp = await apiWithJar('PUT', '/user/profile', {
      body: { nickname: 'no-csrf' },
      jar: login.jar,
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(resp.status, 403)
  })

  await t.test('CSRF：错误 X-CSRF-Token → 403', async () => {
    const login = await apiWithJar('POST', '/auth/login', {
      body: { username: 'c2b-admin', password: 'test-password' },
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(login.status, 200)

    const resp = await apiWithJar('PUT', '/user/profile', {
      body: { nickname: 'wrong-csrf' },
      jar: login.jar,
      rawHeaders: {
        'User-Agent': 'Mozilla/5.0 Chrome/120',
        'X-CSRF-Token': 'wrong-token-value',
      },
    })
    assert.equal(resp.status, 403)
  })

  await t.test('CSRF：正确 double-submit → 200', async () => {
    const login = await apiWithJar('POST', '/auth/login', {
      body: { username: 'c2b-admin', password: 'test-password' },
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(login.status, 200)
    const csrfToken = login.jar.get('csrf_token')
    assert.ok(csrfToken)

    // ADMIN 修改自己的昵称，不应被 regionCode 保护拦截
    const resp = await apiWithJar('PUT', '/user/profile', {
      body: { nickname: 'csrf-ok' },
      jar: login.jar,
      rawHeaders: {
        'User-Agent': 'Mozilla/5.0 Chrome/120',
        'X-CSRF-Token': csrfToken,
      },
    })
    assert.equal(resp.status, 200, `正确 CSRF 应返回 200，实际 ${resp.status}: ${JSON.stringify(resp.payload)}`)
  })

  await t.test('CSRF：GET 请求免校验', async () => {
    const login = await apiWithJar('POST', '/auth/login', {
      body: { username: 'c2b-admin', password: 'test-password' },
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(login.status, 200)

    const me = await apiWithJar('GET', '/auth/me', {
      jar: login.jar,
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(me.status, 200)
  })

  // ================================================================
  // 4. Refresh 从 cookie 读取并轮换认证 cookie
  // ================================================================
  await t.test('Refresh：从 cookie 读取 refresh_token，轮换后 body 不泄露 token', async () => {
    const login = await apiWithJar('POST', '/auth/login', {
      body: { username: 'c2b-admin', password: 'test-password' },
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(login.status, 200)

    // 冻结旧值（login.jar 不会被 apiWithJar 修改——它 clone 了）
    const oldAccess = login.jar.get('access_token')
    const oldRefresh = login.jar.get('refresh_token')
    assert.ok(oldAccess)
    assert.ok(oldRefresh)

    // refresh 只带 cookie，不带 body
    const refreshResp = await apiWithJar('POST', '/auth/refresh', {
      jar: login.jar,
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(refreshResp.status, 200)

    // body 不泄露 token
    assert.equal(refreshResp.payload.data.token, undefined)
    assert.equal(refreshResp.payload.data.refreshToken, undefined)
    assert.ok(refreshResp.payload.data.user)

    // 新 jar 含轮换后的 cookie
    const newAccess = refreshResp.jar.get('access_token')
    const newRefresh = refreshResp.jar.get('refresh_token')
    assert.ok(newAccess, '轮换后应有新 access_token')
    assert.ok(newRefresh, '轮换后应有新 refresh_token')
    assert.notEqual(newAccess, oldAccess, 'access_token 应被轮换')
    assert.notEqual(newRefresh, oldRefresh, 'refresh_token 应被轮换')

    // login.jar 未变（clone 保护），用旧 access 请求应 401
    const oldJar = login.jar.clone()
    const oldAuth = await apiWithJar('GET', '/user/profile', {
      jar: oldJar,
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(oldAuth.status, 401, '旧 access_token 不应继续有效')
  })

  // ================================================================
  // 5. 两标签并发 refresh → 两个都成功 + 第三次旧 token 401
  // ================================================================
  await t.test('并发 Refresh：两标签同 refresh cookie 并发刷新，两个均 200', async () => {
    const login = await apiWithJar('POST', '/auth/login', {
      body: { username: 'c2b-admin', password: 'test-password' },
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(login.status, 200)
    const oldAccess = login.jar.get('access_token')
    assert.ok(oldAccess)

    // 两个独立 jar（clone），模拟两标签
    const jarA = login.jar.clone()
    const jarB = login.jar.clone()

    const [r1, r2] = await Promise.all([
      apiWithJar('POST', '/auth/refresh', {
        jar: jarA,
        rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
      }),
      apiWithJar('POST', '/auth/refresh', {
        jar: jarB,
        rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
      }),
    ])

    assert.equal(r1.status, 200, `标签 A 并发 refresh 应 200，实际 ${r1.status}: ${JSON.stringify(r1.payload)}`)
    assert.equal(r2.status, 200, `标签 B 并发 refresh 应 200，实际 ${r2.status}: ${JSON.stringify(r2.payload)}`)

    // 两个标签获得不同的新 session
    assert.notEqual(
      r1.jar.get('access_token'),
      r2.jar.get('access_token'),
      '两个并发 refresh 应生成不同的新 session',
    )

    // 每个标签都能用新 cookie 访问 /auth/me
    for (const r of [r1, r2]) {
      const me = await apiWithJar('GET', '/auth/me', {
        jar: r.jar,
        rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
      })
      assert.equal(me.status, 200, `标签应能用新 cookie 访问 /auth/me`)
    }

    // 第三次用旧 refresh cookie → 必须 401（grace 已消费完）
    const third = await apiWithJar('POST', '/auth/refresh', {
      jar: login.jar.clone(),
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(third.status, 401, `第三次旧 refresh 必须 401，实际 ${third.status}`)
  })

  // 5b. 三标签并发 refresh：最多两个成功，其余 401（grace 仅一次性）
  await t.test('并发 Refresh：三标签同 refresh cookie 并发刷新，最多两个 200、其余 401', async () => {
    const login = await apiWithJar('POST', '/auth/login', {
      body: { username: 'c2b-admin', password: 'test-password' },
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(login.status, 200)

    const jarA = login.jar.clone()
    const jarB = login.jar.clone()
    const jarC = login.jar.clone()

    const [r1, r2, r3] = await Promise.all([
      apiWithJar('POST', '/auth/refresh', { jar: jarA, rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' } }),
      apiWithJar('POST', '/auth/refresh', { jar: jarB, rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' } }),
      apiWithJar('POST', '/auth/refresh', { jar: jarC, rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' } }),
    ])

    const successCount = [r1, r2, r3].filter((r) => r.status === 200).length
    const failCount = [r1, r2, r3].filter((r) => r.status === 401).length

    assert.ok(successCount >= 1 && successCount <= 2,
      `三标签并发应 1~2 个成功，实际成功 ${successCount} 个（r1=${r1.status}, r2=${r2.status}, r3=${r3.status})`)
    assert.ok(failCount >= 1 && failCount <= 2,
      `三标签并发应 1~2 个失败，实际失败 ${failCount} 个`)

    // 第四次旧 cookie 必 401
    const fourth = await apiWithJar('POST', '/auth/refresh', {
      jar: login.jar.clone(),
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(fourth.status, 401, `第四次旧 refresh 必须 401，实际 ${fourth.status}`)
  })

  // 5c. rotation 撤销超出 grace 窗口 → 必须 401（直接操作 prisma 回拨时间）
  await t.test('并发 Refresh：rotation 撤销超出 grace 窗口的旧 refresh → 401', async () => {
    const login = await apiWithJar('POST', '/auth/login', {
      body: { username: 'c2b-admin', password: 'test-password' },
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(login.status, 200)

    // 找到 login 创建的 session 并手动设置 rotation 撤销（超出 grace 窗口）
    const refreshValue = login.jar.get('refresh_token')
    assert.ok(refreshValue)
    const { default: jwt } = await import('jsonwebtoken')
    const decoded = jwt.decode(refreshValue)
    const sessionId = decoded.sid
    assert.ok(sessionId)

    const staleTime = new Date(Date.now() - REFRESH_ROTATION_GRACE_MS - 2000)
    await prisma.authSession.update({
      where: { id: sessionId },
      data: { revokedAt: staleTime, lastUsedAt: staleTime },
    })

    // 用旧 refresh cookie 刷新 → 必须 401（超出 grace 窗口）
    const retry = await apiWithJar('POST', '/auth/refresh', {
      jar: login.jar.clone(),
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(retry.status, 401,
      `超出 grace 窗口的旧 refresh 必须 401，实际 ${retry.status}: ${JSON.stringify(retry.payload)}`)
  })

  // ================================================================
  // 6. Logout（均带 CSRF token）
  // ================================================================
  await t.test('Logout：access 可用时撤销会话并清 cookie', async () => {
    const login = await apiWithJar('POST', '/auth/login', {
      body: { username: 'c2b-admin', password: 'test-password' },
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(login.status, 200)
    const csrfToken = login.jar.get('csrf_token')
    assert.ok(csrfToken)

    // 冻结旧 jar 用于后续验证
    const oldJar = login.jar.clone()

    const logout = await apiWithJar('POST', '/auth/logout', {
      jar: login.jar,
      rawHeaders: {
        'User-Agent': 'Mozilla/5.0 Chrome/120',
        'X-CSRF-Token': csrfToken,
      },
    })
    assert.equal(logout.status, 200)

    // cookie 被清除
    assert.equal(logout.jar.get('access_token'), null, 'logout 后 access_token 应为空')
    assert.equal(logout.jar.get('refresh_token'), null, 'logout 后 refresh_token 应为空')
    assert.equal(logout.jar.get('csrf_token'), null, 'logout 后 csrf_token 应为空')

    // 旧 cookie 也无法访问
    const me = await apiWithJar('GET', '/auth/me', {
      jar: oldJar,
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(me.status, 401, 'logout 后原 access 应 401')
  })

  await t.test('Logout：access 缺失/过期时用 refresh cookie + CSRF 撤销', async () => {
    const login = await apiWithJar('POST', '/auth/login', {
      body: { username: 'c2b-admin', password: 'test-password' },
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(login.status, 200)
    const csrfToken = login.jar.get('csrf_token')
    assert.ok(csrfToken)

    // 构造仅含 refresh + csrf（无 access）的 jar
    const refreshOnlyJar = new CookieJar()
    const refEntry = login.jar.entry('refresh_token')
    const csrfEntry = login.jar.entry('csrf_token')
    refreshOnlyJar._jar.set('refresh_token', { ...refEntry })
    refreshOnlyJar._jar.set('csrf_token', { ...csrfEntry })

    // 冻结旧 jar 用于后续验证
    const oldJar = login.jar.clone()

    const logout = await apiWithJar('POST', '/auth/logout', {
      jar: refreshOnlyJar,
      rawHeaders: {
        'User-Agent': 'Mozilla/5.0 Chrome/120',
        'X-CSRF-Token': csrfToken,
      },
    })
    assert.equal(logout.status, 200)

    // 原 access 失效
    const me = await apiWithJar('GET', '/auth/me', {
      jar: oldJar,
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(me.status, 401)

    // 原 refresh 也不可用
    const refreshAfter = await apiWithJar('POST', '/auth/refresh', {
      jar: oldJar,
      rawHeaders: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(refreshAfter.status, 401)
  })

  // ================================================================
  // 7. Capacitor Bearer 回归
  // ================================================================
  await t.test('Capacitor Bearer：登录返回 token 在 body（不设 cookie）', async () => {
    const resp = await apiWithJar('POST', '/auth/login', {
      body: { username: 'c2b-admin', password: 'test-password' },
      rawHeaders: {
        'User-Agent': 'Capacitor/5.0',
        'X-Device-Name': 'capacitor-test-device',
      },
    })
    assert.equal(resp.status, 200)
    assert.ok(resp.payload.data.token, 'Capacitor 登录 body 应包含 token')
    assert.ok(resp.payload.data.refreshToken, 'Capacitor 登录 body 应包含 refreshToken')
    assert.ok(resp.payload.data.user)
    assert.equal(resp.jar.entry('access_token'), null, 'Capacitor 登录不应设 access_token cookie')
  })

  await t.test('Capacitor Bearer：refresh 返回新 token 在 body', async () => {
    const login = await apiWithJar('POST', '/auth/login', {
      body: { username: 'c2b-admin', password: 'test-password' },
      rawHeaders: { 'User-Agent': 'Capacitor/5.0' },
    })
    assert.equal(login.status, 200)

    const refreshResp = await apiWithJar('POST', '/auth/refresh', {
      body: { refreshToken: login.payload.data.refreshToken },
      rawHeaders: { 'User-Agent': 'Capacitor/5.0' },
    })
    assert.equal(refreshResp.status, 200)
    assert.ok(refreshResp.payload.data.token, 'Capacitor refresh body 应包含新 token')
    assert.ok(refreshResp.payload.data.refreshToken)
    assert.equal(refreshResp.jar.entry('access_token'), null)
    assert.equal(refreshResp.jar.entry('refresh_token'), null)
  })

  await t.test('Capacitor Bearer：/auth/me 通过 Authorization 头', async () => {
    const login = await apiWithJar('POST', '/auth/login', {
      body: { username: 'c2b-admin', password: 'test-password' },
      rawHeaders: { 'User-Agent': 'Capacitor/5.0' },
    })
    assert.equal(login.status, 200)

    const me = await apiWithJar('GET', '/auth/me', {
      rawHeaders: {
        'User-Agent': 'Capacitor/5.0',
        'Authorization': `Bearer ${login.payload.data.token}`,
      },
    })
    assert.equal(me.status, 200)
  })

  await t.test('Capacitor Bearer：refresh JWT 保持 30 天（不缩短）', async () => {
    const login = await apiWithJar('POST', '/auth/login', {
      body: { username: 'c2b-farmer', password: 'test-password' },
      rawHeaders: { 'User-Agent': 'Capacitor/5.0' },
    })
    assert.equal(login.status, 200)

    const { default: jwt } = await import('jsonwebtoken')
    const decoded = jwt.decode(login.payload.data.refreshToken)
    const ttlSec = decoded.exp - decoded.iat
    assert.ok(ttlSec > 604800, `Capacitor refresh JWT TTL 应 > 7d，实际 ${ttlSec}s`)
  })

  await t.test('Capacitor Bearer：写请求 CSRF 豁免 → 200', async () => {
    const login = await apiWithJar('POST', '/auth/login', {
      body: { username: 'c2b-admin', password: 'test-password' },
      rawHeaders: { 'User-Agent': 'Capacitor/5.0' },
    })
    assert.equal(login.status, 200)

    // Capacitor 写请求不带 CSRF 头 → 应通过（UA 豁免）
    const resp = await apiWithJar('PUT', '/user/profile', {
      body: { nickname: 'capacitor-ok' },
      rawHeaders: {
        'User-Agent': 'Capacitor/5.0',
        'Authorization': `Bearer ${login.payload.data.token}`,
      },
    })
    assert.equal(resp.status, 200, `Capacitor CSRF 豁免应返回 200，实际 ${resp.status}: ${JSON.stringify(resp.payload)}`)
  })
})
