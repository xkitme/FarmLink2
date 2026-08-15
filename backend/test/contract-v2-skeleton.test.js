/**
 * 116f-B v2 骨架集成契约测试（独立临时 SQLite，116d §6 策略）。
 *
 * 覆盖（docs/116f-APIv2与能力注册表.md §13 C2 + D9 + §5.6/§12）：
 * - GET /v2/ping 公开、最小健康信息、不查询数据库（断开 Prisma 后仍 200）；
 * - 生产路由表证据：POST /api/v2/ping 精确 404（生产 v2 只有 5 个 GET，见 contract-registry.test.js 注册表断言）；
 * - GET /v2/capabilities、GET /v2/api-catalog：requireAuth + ADMIN 权限矩阵（401/403/200 envelope 精确断言）；
 * - 外部响应敏感字段缺失（controller 路径/内部正则/密钥/限流细节/安全配置）；
 * - api-catalog 与能力注册表可验证一致 + 稳定排序；
 * - v1 不回归抽查；
 * - operationLog：v1 写仍记录（行为不变）；v2 写记录正确 path/method/user/IP ——
 *   通过**测试专用 middleware harness**（POST /api/v2/__contract/write）验证，
 *   该路径不挂载进生产 app、不进入正式注册表；GET 不记录；伪造 X-Forwarded-For 被既有可信代理策略忽略。
 */

import { execFileSync } from 'node:child_process'
import { closeSync, mkdtempSync, openSync, rmSync } from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import express from 'express'

import { operationLogMiddleware } from '../src/middleware/apiControl.js'
import { config } from '../src/config/index.js'

const backendRoot = path.resolve(import.meta.dirname, '..')
const testRoot = mkdtempSync(path.join(backendRoot, 'prisma', '.test-116f-'))
closeSync(openSync(path.join(testRoot, '116f.db'), 'w'))
process.env.DATABASE_URL = `file:./${path.basename(testRoot)}/116f.db`
process.env.APP_ENV = 'dev'
process.env.TRUST_PROXY = 'false'

const prismaCli = path.join(backendRoot, 'node_modules', 'prisma', 'build', 'index.js')
execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], {
  cwd: backendRoot,
  env: process.env,
  stdio: 'pipe',
})

const [{ default: app }, { prisma }, { default: bcrypt }, { clearRateLimits }] = await Promise.all([
  import('../src/app.js'),
  import('../src/db.js'),
  import('bcryptjs'),
  import('../src/middleware/apiControl.js'),
])

const LOOPBACK_IPS = new Set(['127.0.0.1', '::ffff:127.0.0.1', '::1'])
const FORBIDDEN_RESPONSE_KEYS = new Set([
  'routesFile', 'line', 'controller', 'controllers', 'switchKey', 'ratePlan',
  'pattern', 'regex', 'secret', 'jwtSecret', 'refreshSecret', 'apiKey',
  'trustProxy', 'cors', 'cookie', 'https', 'rateLimits', 'v1',
])

let server
let baseUrl
let harnessServer
let harnessUrl
let adminId
let farmerId

async function api(method, pathName, opts = {}) {
  const headers = { ...(opts.headers || {}) }
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`
  if (opts.cookie) headers.Cookie = opts.cookie
  if (opts.body !== undefined && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers,
    body: opts.body === undefined
      ? undefined
      : (opts.body instanceof FormData ? opts.body : JSON.stringify(opts.body)),
    redirect: 'manual',
  })
  let payload = null
  try {
    payload = await response.json()
  } catch {
    /* 非 JSON 响应 */
  }
  return { status: response.status, payload, headers: response.headers }
}

/** 测试专用 middleware harness 请求（路径 /api/v2/__contract/* 仅存在于本测试 app）。 */
async function harnessApi(method, pathName, opts = {}) {
  const response = await fetch(`${harnessUrl}${pathName}`, {
    method,
    headers: { ...(opts.headers || {}) },
    redirect: 'manual',
  })
  return { status: response.status }
}

async function loginNative(username) {
  const res = await api('POST', '/api/v1/auth/login', {
    body: { username, password: 'test-password' },
    headers: { 'User-Agent': 'Capacitor/5.0' },
  })
  assert.equal(res.status, 200, `login ${username} 应 200: ${JSON.stringify(res.payload)}`)
  assert.ok(res.payload.data.token, 'Capacitor 登录应返回 token')
  return res.payload.data.token
}

/** 轮询等待操作日志落库（operationLog 在 res.finish 后异步写入；不依赖固定 sleep）。 */
async function waitForLog(where, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const rows = await prisma.operationLog.findMany({ where, orderBy: { id: 'asc' } })
    if (rows.length > 0) return rows
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  return []
}

async function maxLogId() {
  const last = await prisma.operationLog.findFirst({ orderBy: { id: 'desc' } })
  return last ? last.id : 0
}

/** 递归收集对象全部 key，用于敏感字段缺失断言。 */
function collectKeys(value, out = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, out)
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      out.add(key)
      collectKeys(item, out)
    }
  }
  return out
}

before(async () => {
  const passwordHash = await bcrypt.hash('test-password', 4)
  await prisma.user.createMany({
    data: [
      { username: 'v2-admin', nickname: 'V2 管理员', passwordHash, role: 'ADMIN' },
      { username: 'v2-farmer', nickname: 'V2 农户', passwordHash, role: 'FARMER' },
    ],
  })
  const users = await prisma.user.findMany({ where: { username: { in: ['v2-admin', 'v2-farmer'] } } })
  adminId = users.find((u) => u.username === 'v2-admin').id
  farmerId = users.find((u) => u.username === 'v2-farmer').id

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`

  // 测试专用 middleware harness：只为契约测试 operationLogMiddleware 的 v1/v2 前缀行为。
  // /api/v2/__contract/write 不挂载进生产 app、不进入正式注册表（生产 v2 只有 3 个 GET）。
  const operationLogHarness = express()
  operationLogHarness.set('trust proxy', config.trustProxy) // 与生产 app 一致的代理信任策略
  operationLogHarness.use((req, res, next) => {
    req.traceId = 'contract-harness'
    req.user = { id: adminId } // 注入 optionalAuth 等价产物（中间件契约测试，非生产认证路径）
    next()
  })
  operationLogHarness.use(operationLogMiddleware)
  operationLogHarness.all('/api/v2/__contract/write', (req, res) => res.status(204).end())
  await new Promise((resolve) => {
    harnessServer = operationLogHarness.listen(0, '127.0.0.1', resolve)
  })
  harnessUrl = `http://127.0.0.1:${harnessServer.address().port}`
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await new Promise((resolve) => harnessServer.close(resolve))
  await prisma.$disconnect()
  rmSync(testRoot, { recursive: true, force: true })
})

test('116f-B v2 骨架与操作日志契约', async (t) => {
  clearRateLimits()

  // ── 1. ping：公开、最小、稳定、精确 ─────────────────────────
  await t.test('GET /v2/ping 公开：精确 200 envelope，data 仅 {status:ok}，不泄露内部信息', async () => {
    const res = await api('GET', '/api/v2/ping')
    assert.equal(res.status, 200)
    assert.equal(res.payload.code, 200)
    assert.equal(res.payload.msg, 'success')
    assert.deepEqual(res.payload.data, { status: 'ok' })
    assert.equal(typeof res.payload.timestamp, 'number')
    assert.equal(typeof res.payload.traceId, 'string')
    assert.equal(res.payload.traceId.length, 16)
  })

  await t.test('GET /v2/ping 携带无效 token 仍 200（optionalAuth 容忍）', async () => {
    const res = await api('GET', '/api/v2/ping', { token: 'garbage-token' })
    assert.equal(res.status, 200)
    assert.deepEqual(res.payload.data, { status: 'ok' })
  })

  // ── 2. capabilities：D9 权限矩阵 ────────────────────────────
  await t.test('GET /v2/capabilities 未登录 → 精确 401 envelope', async () => {
    const res = await api('GET', '/api/v2/capabilities')
    assert.equal(res.status, 401)
    assert.equal(res.payload.code, 40101)
    assert.equal(res.payload.msg, '未登录或登录已失效')
    assert.equal(res.payload.data, null)
    assert.equal(typeof res.payload.timestamp, 'number')
    assert.equal(typeof res.payload.traceId, 'string')
  })

  await t.test('GET /v2/capabilities 非 ADMIN → 精确 403 envelope', async () => {
    const token = await loginNative('v2-farmer')
    const res = await api('GET', '/api/v2/capabilities', { token })
    assert.equal(res.status, 403)
    assert.equal(res.payload.code, 40301)
    assert.equal(res.payload.msg, '权限不足')
    assert.equal(res.payload.data, null)
  })

  await t.test('GET /v2/api-catalog 未登录 401 / 非 ADMIN 403', async () => {
    const noAuth = await api('GET', '/api/v2/api-catalog')
    assert.equal(noAuth.status, 401)
    assert.equal(noAuth.payload.code, 40101)

    const farmerToken = await loginNative('v2-farmer')
    const denied = await api('GET', '/api/v2/api-catalog', { token: farmerToken })
    assert.equal(denied.status, 403)
    assert.equal(denied.payload.code, 40301)
  })

  // ── 3. ADMIN 安全投影与一致性 ──────────────────────────────
  let capabilitiesPayload
  let catalogPayload

  await t.test('ADMIN 获取 capabilities：结构稳定、排序确定、v2 三端点与 v1 全量在场', async () => {
    const token = await loginNative('v2-admin')
    const res = await api('GET', '/api/v2/capabilities', { token })
    assert.equal(res.status, 200)
    const data = res.payload.data
    assert.equal(data.schemaVersion, 1)
    assert.deepEqual(data.apiVersions, ['v1', 'v2'])
    assert.ok(data.sections && typeof data.sections === 'object')
    assert.equal(data.total, 247, 'capability 总数必须为 247 = 242(v1) + 5(v2)')
    assert.equal(data.total, data.capabilities.length)

    const ids = data.capabilities.map((cap) => cap.id)
    assert.deepEqual(ids, [...ids].sort(), 'capabilities 必须按 id 确定排序')

    const apiIds = data.capabilities.flatMap((cap) => cap.apis.map((api) => api.apiId))
    assert.equal(new Set(apiIds).size, apiIds.length, 'apiId 必须全局唯一')

    const v2Paths = data.capabilities
      .flatMap((cap) => cap.apis)
      .filter((api) => api.version === 'v2')
      .map((api) => `${api.method} ${api.path}`)
      .sort()
    assert.deepEqual(v2Paths, [
      'GET /api-catalog',
      'GET /capabilities',
      'GET /market/products',
      'GET /market/products/:id',
      'GET /ping',
    ])

    const v1Paths = data.capabilities
      .flatMap((cap) => cap.apis)
      .filter((api) => api.version === 'v1')
      .map((api) => `${api.method} ${api.path}`)
    assert.equal(v1Paths.length, 242, 'v1 全量 242 条必须在目录中')
    assert.ok(v1Paths.includes('GET /market/product/list'))
    assert.ok(v1Paths.includes('POST /market/order'))

    for (const cap of data.capabilities) {
      assert.equal(typeof cap.id, 'string')
      assert.equal(typeof cap.name, 'string')
      assert.equal(typeof cap.section, 'string')
      for (const api of cap.apis) {
        assert.ok(['v1', 'v2'].includes(api.version))
        assert.ok(typeof api.method === 'string' && api.method.length > 0)
        assert.ok(typeof api.path === 'string' && api.path.startsWith('/'))
        assert.ok(['optional', 'required'].includes(api.auth))
        assert.ok(api.roles === null || Array.isArray(api.roles))
      }
    }
    capabilitiesPayload = data
  })

  await t.test('ADMIN 获取 api-catalog：稳定排序 + 与注册表可验证一致', async () => {
    const token = await loginNative('v2-admin')
    const res = await api('GET', '/api/v2/api-catalog', { token })
    assert.equal(res.status, 200)
    const data = res.payload.data
    assert.equal(data.schemaVersion, 1)
    assert.equal(data.total, data.items.length)

    // 排序：按 (section, method, path, apiId) 确定
    const expectedOrder = [...data.items].sort((a, b) => (
      a.section < b.section ? -1 : a.section > b.section ? 1
        : a.method < b.method ? -1 : a.method > b.method ? 1
          : a.path < b.path ? -1 : a.path > b.path ? 1
            : a.apiId < b.apiId ? -1 : a.apiId > b.apiId ? 1 : 0
    ))
    assert.deepEqual(data.items, expectedOrder, 'api-catalog 必须确定性排序')

    // 与 capabilities 目录同源一致：apiId 集合完全相同（两目录排序规则不同，按集合比对）
    const catalogIds = data.items.map((item) => item.apiId).sort()
    const capabilityIds = capabilitiesPayload.capabilities
      .flatMap((cap) => cap.apis.map((api) => api.apiId))
      .sort()
    assert.deepEqual(catalogIds, capabilityIds, 'api-catalog 与 capabilities 的 apiId 集合必须一致')
    assert.equal(new Set(catalogIds).size, catalogIds.length, 'apiId 必须全局唯一')

    for (const item of data.items) {
      assert.equal(typeof item.capabilityId, 'string')
      assert.equal(typeof item.section, 'string')
      assert.equal(typeof item.name, 'string')
    }
    catalogPayload = data
  })

  await t.test('外部响应不暴露 controller 路径/内部正则/密钥/限流细节/安全配置', () => {
    const capsKeys = collectKeys(capabilitiesPayload)
    const catalogKeys = collectKeys(catalogPayload)
    for (const forbidden of FORBIDDEN_RESPONSE_KEYS) {
      assert.ok(!capsKeys.has(forbidden), `capabilities 响应不得包含敏感字段: ${forbidden}`)
      assert.ok(!catalogKeys.has(forbidden), `api-catalog 响应不得包含敏感字段: ${forbidden}`)
    }
    // 允许的键位精确白名单（capability 与 api 投影）
    for (const cap of capabilitiesPayload.capabilities) {
      assert.deepEqual(
        Object.keys(cap).sort(),
        ['apis', 'deprecated', 'enabled', 'id', 'name', 'section'],
      )
      for (const api of cap.apis) {
        assert.deepEqual(
          Object.keys(api).sort(),
          ['apiId', 'auth', 'deprecated', 'enabled', 'method', 'path', 'roles', 'version'],
        )
      }
    }
    for (const item of catalogPayload.items) {
      assert.deepEqual(
        Object.keys(item).sort(),
        ['apiId', 'auth', 'capabilityId', 'deprecated', 'enabled', 'method', 'name', 'path', 'roles', 'section', 'version'],
      )
    }
  })

  // ── 4. v1 不回归抽查 ───────────────────────────────────────
  await t.test('v1 行为不变：GET /api/v1/ping 与 /api/v1/market/product/list', async () => {
    const ping = await api('GET', '/api/v1/ping')
    assert.equal(ping.status, 200)
    assert.equal(ping.payload.code, 200)
    assert.deepEqual(ping.payload.data, { pong: true })

    const products = await api('GET', '/api/v1/market/product/list')
    assert.equal(products.status, 200)
    assert.equal(products.payload.code, 200)
    assert.ok(Array.isArray(products.payload.data.records))
  })

  // ── 5. Cookie 认证路径兼容 /api/v2 ─────────────────────────
  await t.test('浏览器 Cookie（Path=/api）可访问 v2 管理端点', async () => {
    const login = await api('POST', '/api/v1/auth/login', {
      body: { username: 'v2-admin', password: 'test-password' },
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    })
    assert.equal(login.status, 200)
    const setCookies = login.headers.getSetCookie()
    const access = setCookies.find((c) => c.startsWith('access_token='))
    assert.ok(access, '浏览器登录应设置 access_token cookie')
    const cookie = access.split(';')[0]

    const res = await api('GET', '/api/v2/capabilities', { cookie })
    assert.equal(res.status, 200, `cookie 应覆盖 /api/v2 路径：${JSON.stringify(res.payload)}`)
    assert.equal(res.payload.code, 200)
  })

  // ── 6. operationLog：v1 不变 + v2 覆盖 ─────────────────────
  await t.test('v1 写请求仍记录：PUT /user/profile → 模块归属不变（user）、action 精确、userId、ip', async () => {
    clearRateLimits()
    const token = await loginNative('v2-admin')
    const startId = await maxLogId()
    const res = await api('PUT', '/api/v1/user/profile', {
      token,
      headers: { 'User-Agent': 'Capacitor/5.0' },
      body: { nickname: 'oplog-v1' },
    })
    assert.equal(res.status, 200)

    const rows = await waitForLog({ action: 'PUT /user/profile', id: { gt: startId } })
    assert.ok(rows.length > 0, 'v1 写请求必须产生操作日志')
    const row = rows[0]
    // v1 既有语义：module = 去前缀路径首段（/user/profile → user），本轮不得改变
    assert.equal(row.module, 'user')
    assert.equal(row.userId, adminId)
    assert.ok(LOOPBACK_IPS.has(row.ip), `ip 应为直连回环地址，实际 ${row.ip}`)
    const detail = JSON.parse(row.detail)
    assert.equal(detail.method, 'PUT')
    assert.equal(detail.path, '/user/profile')
    assert.equal(detail.statusCode, 200)
  })

  await t.test('生产路由表证据：POST /api/v2/ping → 精确 404（生产 v2 无此方法）', async () => {
    clearRateLimits()
    const token = await loginNative('v2-admin')
    const res = await api('POST', '/api/v2/ping', {
      token,
      headers: { 'User-Agent': 'Capacitor/5.0' },
    })
    assert.equal(res.status, 404)
    assert.equal(res.payload.code, 40401)
    assert.match(res.payload.msg, /接口不存在: POST \/api\/v2\/ping/)
  })

  await t.test('v2 写请求记录正确 path/method/user/IP（测试专用 middleware harness，非生产 API）', async () => {
    clearRateLimits()
    const startId = await maxLogId()
    const res = await harnessApi('POST', '/api/v2/__contract/write')
    assert.equal(res.status, 204)

    const rows = await waitForLog({ action: 'POST /api/v2/__contract/write', id: { gt: startId } })
    assert.ok(rows.length > 0, 'v2 写请求必须产生操作日志')
    const row = rows[0]
    assert.equal(row.module, 'system', '未知首段路径归一为 system 模块')
    assert.equal(row.userId, adminId, 'v2 写请求必须记录用户 id')
    assert.ok(LOOPBACK_IPS.has(row.ip), `v2 ip 应为直连回环地址，实际 ${row.ip}`)
    const detail = JSON.parse(row.detail)
    assert.equal(detail.method, 'POST')
    assert.equal(detail.path, '/api/v2/__contract/write', 'v2 路径必须带版本前缀记录')
    assert.equal(detail.statusCode, 204)
  })

  await t.test('GET 不被误记：真实 app 与 harness 的 GET 均不产生操作日志', async () => {
    clearRateLimits()
    const token = await loginNative('v2-admin')
    const res = await api('GET', '/api/v2/capabilities', { token })
    assert.equal(res.status, 200)
    assert.equal(await prisma.operationLog.count({ where: { action: 'GET /api/v2/capabilities' } }), 0)

    await harnessApi('GET', '/api/v2/__contract/write')
    assert.equal(await prisma.operationLog.count({ where: { action: 'GET /api/v2/__contract/write' } }), 0)
  })

  await t.test('伪造 X-Forwarded-For 被既有可信代理策略忽略（harness，ip 仍为直连来源）', async () => {
    clearRateLimits()
    const startId = await maxLogId()
    const res = await harnessApi('PUT', '/api/v2/__contract/write', {
      headers: {
        'X-Forwarded-For': '203.0.113.7',
        'X-Real-IP': '203.0.113.7',
      },
    })
    assert.equal(res.status, 204)
    const rows = await waitForLog({ action: 'PUT /api/v2/__contract/write', id: { gt: startId } })
    assert.ok(rows.length > 0)
    const row = rows[0]
    assert.ok(LOOPBACK_IPS.has(row.ip), `伪造 XFF 不得改变审计来源，实际 ${row.ip}`)
    assert.notEqual(row.ip, '203.0.113.7')
  })

  // ── 7. ping 不查询数据库：断开 Prisma 后仍 200（最后执行） ──
  await t.test('断开数据库连接后 GET /v2/ping 仍 200（证明不查库）', async () => {
    await prisma.$disconnect()
    const res = await api('GET', '/api/v2/ping')
    assert.equal(res.status, 200)
    assert.deepEqual(res.payload.data, { status: 'ok' })
  })
})
