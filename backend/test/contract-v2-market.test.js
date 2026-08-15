/**
 * 116f-C v2 market 只读样板契约测试（独立临时 SQLite，116d §6 策略）。
 *
 * 覆盖（docs/116f-APIv2与能力注册表.md §9 116f-C / §13 C3）：
 * - v1 list 与 v2 list 在同一 fixture/query 下完整 payload 等价（code/msg/data 逐字段 deepEqual）；
 * - 默认列表只返回 status=1；createdAt 排序精确一致；分页五字段精确一致；
 * - category/keyword 过滤等价；images 均为解析后的数组；seller 投影一致；
 * - detail 等价（存在/不存在/边界 id 三态与 v1 完全一致）；
 * - POST/PUT/DELETE 到两个 v2 路径均 404（不暴露写接口，且无写库副作用）；
 * - 注册表口径 v1 242、v2 5、总计 247；ADMIN 安全投影包含新增条目且不泄露内部字段；
 * - ratePlan/switchKey 与对应 v1 能力一致（纯函数直接断言 + X-RateLimit-Policy 头实证）；
 * - GET 不产生 operation log 写日志。
 */

import { execFileSync } from 'node:child_process'
import { closeSync, mkdtempSync, openSync, rmSync } from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import jwt from 'jsonwebtoken'

import { CAPABILITY_REGISTRY } from '../src/contracts/capabilities.js'
import { validateRegistry } from '../src/contracts/registry.js'
import { V2_ROUTE_DEFS } from '../src/routes/v2/index.js'
import {
  v1RateBucket,
  v2RateBucket,
  v1SwitchKeyFor,
  v2SwitchKeyFor,
  resolveV2ApiPolicy,
  resolveV1RatePolicy,
} from '../src/middleware/apiControl.js'
import { config } from '../src/config/index.js'

const backendRoot = path.resolve(import.meta.dirname, '..')
const testRoot = mkdtempSync(path.join(backendRoot, 'prisma', '.test-116f-market-'))
closeSync(openSync(path.join(testRoot, 'market.db'), 'w'))
process.env.DATABASE_URL = `file:./${path.basename(testRoot)}/market.db`
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

let server
let baseUrl
let adminToken
let seller
let products = {}

async function api(method, pathName, opts = {}) {
  const headers = { ...(opts.headers || {}) }
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`
  if (opts.cookie) headers.Cookie = opts.cookie
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    redirect: 'manual',
  })
  let payload = null
  try {
    payload = await response.json()
  } catch {
    /* 非 JSON */
  }
  return { status: response.status, payload, headers: response.headers }
}

async function loginNative(username) {
  const res = await api('POST', '/api/v1/auth/login', {
    body: { username, password: 'test-password' },
    headers: { 'User-Agent': 'Capacitor/5.0' },
  })
  assert.equal(res.status, 200, `login ${username}: ${JSON.stringify(res.payload)}`)
  return res.payload.data.token
}

/** 浏览器 UA 登录，返回 access_token Cookie 键值对（Path=/api 覆盖 /api/v2）。 */
async function browserAccessCookie(username) {
  const res = await api('POST', '/api/v1/auth/login', {
    body: { username, password: 'test-password' },
    headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
  })
  assert.equal(res.status, 200, `browser login ${username}: ${JSON.stringify(res.payload)}`)
  const access = res.headers.getSetCookie().find((c) => c.startsWith('access_token='))
  assert.ok(access, '浏览器登录应设置 access_token cookie')
  return access.split(';')[0]
}

/** v1/v2 响应等价断言：HTTP 状态、code、msg、data 逐字段一致；timestamp/traceId 为结构性字段。 */
function assertEquivalentEnvelope(a, b, label) {
  assert.equal(a.status, b.status, `${label}：HTTP 状态必须一致`)
  assert.equal(a.payload.code, b.payload.code, `${label}：code 必须一致`)
  assert.equal(a.payload.msg, b.payload.msg, `${label}：msg 必须一致`)
  assert.deepEqual(a.payload.data, b.payload.data, `${label}：data 必须逐字段一致`)
  assert.equal(typeof a.payload.timestamp, 'number', `${label}：timestamp 为数字`)
  assert.equal(typeof b.payload.timestamp, 'number')
  assert.equal(typeof a.payload.traceId, 'string', `${label}：traceId 为字符串`)
  assert.equal(typeof b.payload.traceId, 'string')
}

before(async () => {
  const passwordHash = await bcrypt.hash('test-password', 4)
  await prisma.user.createMany({
    data: [
      { username: 'v2m-admin', nickname: 'V2M 管理员', passwordHash, role: 'ADMIN' },
    ],
  })
  seller = await prisma.user.create({
    data: {
      username: 'v2m-seller',
      nickname: '王大叔',
      phone: '13800000001',
      villageName: '青禾村',
      passwordHash,
      role: 'FARMER',
    },
  })
  const make = (data) => prisma.product.create({ data: { sellerId: seller.id, ...data } })
  products.p1 = await make({ title: '有机番茄', category: '蔬菜', price: 5.5, unit: '斤', stock: 100, soldCount: 0, status: 1, images: '["/uploads/tomato1.jpg","/uploads/tomato2.jpg"]', createdAt: new Date('2026-08-01T00:00:01.000Z') })
  products.p2 = await make({ title: '水果玉米', category: '蔬菜', price: 4.0, unit: '斤', stock: 50, soldCount: 0, status: 1, images: '["/uploads/corn.jpg"]', createdAt: new Date('2026-08-01T00:00:02.000Z') })
  products.p3 = await make({ title: '玉米面粉', category: '粮油', price: 12.0, unit: '斤', stock: 30, soldCount: 0, status: 1, images: null, createdAt: new Date('2026-08-01T00:00:03.000Z') })
  products.p4 = await make({ title: '下架商品', category: '蔬菜', price: 1.0, unit: '斤', stock: 0, soldCount: 0, status: 0, createdAt: new Date('2026-08-01T00:00:04.000Z') })

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
  adminToken = await loginNative('v2m-admin')
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await prisma.$disconnect()
  rmSync(testRoot, { recursive: true, force: true })
})

test('116f-C v1/v2 market product 只读样板等价契约', async (t) => {
  clearRateLimits()

  await t.test('v1 list 与 v2 list 默认查询：code/msg/data 完整等价', async () => {
    const v1 = await api('GET', '/api/v1/market/product/list')
    const v2 = await api('GET', '/api/v2/market/products')
    assertEquivalentEnvelope(v1, v2, '默认列表')
    assert.equal(v1.payload.code, 200)
    assert.deepEqual(v1.payload.data.records.map((r) => r.id), [products.p3.id, products.p2.id, products.p1.id])
    assert.equal(v1.payload.data.total, 3)
  })

  await t.test('默认列表只返回 status=1（下架商品不出现）', async () => {
    const v2 = await api('GET', '/api/v2/market/products')
    for (const record of v2.payload.data.records) {
      assert.equal(record.status, 1, `record ${record.id} 必须 status=1`)
      assert.notEqual(record.id, products.p4.id, '下架商品不得出现在默认列表')
    }
  })

  await t.test('createdAt 排序与 v1 精确一致（降序）', async () => {
    const v1 = await api('GET', '/api/v1/market/product/list')
    const v2 = await api('GET', '/api/v2/market/products')
    const v1Times = v1.payload.data.records.map((r) => new Date(r.createdAt).getTime())
    const v2Times = v2.payload.data.records.map((r) => new Date(r.createdAt).getTime())
    assert.deepEqual(v2Times, v1Times, 'v2 与 v1 createdAt 序列必须一致')
    for (let i = 1; i < v2Times.length; i += 1) {
      assert.ok(v2Times[i - 1] >= v2Times[i], 'createdAt 必须降序')
    }
  })

  await t.test('分页五字段精确一致（pageNum=1&pageSize=2）', async () => {
    const v1 = await api('GET', '/api/v1/market/product/list?pageNum=1&pageSize=2')
    const v2 = await api('GET', '/api/v2/market/products?pageNum=1&pageSize=2')
    assertEquivalentEnvelope(v1, v2, '分页')
    assert.deepEqual(v1.payload.data, {
      records: v2.payload.data.records,
      total: 3,
      pageNum: 1,
      pageSize: 2,
      pages: 2,
    })
    assert.equal(v1.payload.data.records.length, 2)
  })

  await t.test('category 过滤等价（?category=蔬菜）', async () => {
    const v1 = await api('GET', '/api/v1/market/product/list?category=' + encodeURIComponent('蔬菜'))
    const v2 = await api('GET', '/api/v2/market/products?category=' + encodeURIComponent('蔬菜'))
    assertEquivalentEnvelope(v1, v2, 'category 过滤')
    assert.deepEqual(
      v1.payload.data.records.map((r) => r.id),
      [products.p2.id, products.p1.id],
      '蔬菜分类只有两个在售商品',
    )
  })

  await t.test('keyword 过滤等价（?keyword=玉米）', async () => {
    const v1 = await api('GET', '/api/v1/market/product/list?keyword=' + encodeURIComponent('玉米'))
    const v2 = await api('GET', '/api/v2/market/products?keyword=' + encodeURIComponent('玉米'))
    assertEquivalentEnvelope(v1, v2, 'keyword 过滤')
    assert.deepEqual(
      v1.payload.data.records.map((r) => r.id),
      [products.p3.id, products.p2.id],
    )
    for (const record of v1.payload.data.records) {
      assert.ok(record.title.includes('玉米'))
    }
  })

  await t.test('images 均为解析后的数组（含 null→[] 的既有语义）', async () => {
    const v2 = await api('GET', '/api/v2/market/products')
    const byId = new Map(v2.payload.data.records.map((r) => [r.id, r]))
    assert.deepEqual(byId.get(products.p1.id).images, ['/uploads/tomato1.jpg', '/uploads/tomato2.jpg'])
    assert.deepEqual(byId.get(products.p2.id).images, ['/uploads/corn.jpg'])
    assert.deepEqual(byId.get(products.p3.id).images, [], 'null images 必须解析为 []（与 v1 parseJson 语义一致）')
    for (const record of v2.payload.data.records) {
      assert.ok(Array.isArray(record.images), `record ${record.id} images 必须是数组`)
    }
  })

  await t.test('v1 detail 与 v2 detail 完整 payload 等价（含 seller 投影）', async () => {
    const v1 = await api('GET', `/api/v1/market/product/${products.p1.id}`)
    const v2 = await api('GET', `/api/v2/market/products/${products.p1.id}`)
    assertEquivalentEnvelope(v1, v2, '详情')
    assert.deepEqual(v1.payload.data.seller, {
      id: seller.id,
      nickname: '王大叔',
      villageName: '青禾村',
      phone: '13800000001',
    })
    assert.deepEqual(v1.payload.data.images, ['/uploads/tomato1.jpg', '/uploads/tomato2.jpg'])
  })

  await t.test('不存在商品：HTTP 状态/code/msg/data 与 v1 完全一致', async () => {
    const v1 = await api('GET', '/api/v1/market/product/999999')
    const v2 = await api('GET', '/api/v2/market/products/999999')
    assertEquivalentEnvelope(v1, v2, '不存在商品')
    assert.equal(v1.status, 404)
    assert.equal(v1.payload.code, 40401)
    assert.equal(v1.payload.msg, '商品不存在')
    assert.equal(v1.payload.data, null)
  })

  await t.test('边界 id（非数字）行为与 v1 完全一致', async () => {
    for (const bad of ['abc', '-1', '0']) {
      const v1 = await api('GET', `/api/v1/market/product/${bad}`)
      const v2 = await api('GET', `/api/v2/market/products/${bad}`)
      assertEquivalentEnvelope(v1, v2, `边界 id ${bad}`)
    }
  })

  await t.test('POST/PUT/DELETE 到两个 v2 路径均 404，且无写库副作用', async () => {
    const countBefore = await prisma.product.count()
    for (const [method, pathName] of [
      ['POST', '/api/v2/market/products'],
      ['POST', '/api/v2/market/products/1'],
      ['PUT', '/api/v2/market/products/1'],
      ['DELETE', '/api/v2/market/products/1'],
    ]) {
      const res = await api(method, pathName, { token: adminToken, headers: { 'User-Agent': 'Capacitor/5.0' }, body: {} })
      assert.equal(res.status, 404, `${method} ${pathName} 必须 404`)
      assert.equal(res.payload.code, 40401)
    }
    assert.equal(await prisma.product.count(), countBefore, '写请求不得产生任何写库副作用')
    const v2Apis = CAPABILITY_REGISTRY.capabilities.flatMap((c) => c.apis).filter((a) => a.version === 'v2')
    assert.ok(!v2Apis.some((a) => a.method !== 'GET'), '注册表不得存在任何非 GET 的 v2 端点')
  })

  await t.test('注册表口径：v1 242、v2 5、总计 247（capabilities + 校验器双口径）', () => {
    const v1Apis = CAPABILITY_REGISTRY.capabilities.flatMap((c) => c.apis).filter((a) => a.version === 'v1')
    const v2Apis = CAPABILITY_REGISTRY.capabilities.flatMap((c) => c.apis).filter((a) => a.version === 'v2')
    assert.equal(v1Apis.length, 242)
    assert.equal(v2Apis.length, 5)
    assert.equal(CAPABILITY_REGISTRY.capabilities.length, 247)
    assert.equal(V2_ROUTE_DEFS.length, 5)

    const audit = validateRegistry({ environment: 'dev', v2Routes: V2_ROUTE_DEFS })
    assert.equal(audit.v1TotalRoutes, 242)
    assert.equal(audit.v1RegisteredCount, 242)
    assert.equal(audit.v2TotalRoutes, 5)
    assert.equal(audit.v2RegisteredCount, 5)
    assert.equal(audit.capabilityCount, 247)
  })

  await t.test('ADMIN 安全投影包含新增条目，且不泄露内部字段', async () => {
    const caps = await api('GET', '/api/v2/capabilities', { token: adminToken })
    assert.equal(caps.status, 200)
    const projected = caps.payload.data.capabilities
      .flatMap((cap) => cap.apis)
      .filter((api) => api.apiId === 'api.v2.market.products' || api.apiId === 'api.v2.market.products.detail')
    assert.equal(projected.length, 2)
    const list = projected.find((api) => api.apiId === 'api.v2.market.products')
    const detail = projected.find((api) => api.apiId === 'api.v2.market.products.detail')
    assert.deepEqual(Object.keys(list).sort(), ['apiId', 'auth', 'deprecated', 'enabled', 'method', 'path', 'roles', 'version'])
    assert.equal(list.method, 'GET')
    assert.equal(list.path, '/market/products')
    assert.equal(list.auth, 'optional')
    assert.equal(list.roles, null)
    assert.equal(list.version, 'v2')
    assert.equal(detail.path, '/market/products/:id')
    assert.equal(detail.auth, 'optional')

    const catalog = await api('GET', '/api/v2/api-catalog', { token: adminToken })
    assert.equal(catalog.status, 200)
    const catalogIds = catalog.payload.data.items.map((item) => item.apiId)
    assert.ok(catalogIds.includes('api.v2.market.products'))
    assert.ok(catalogIds.includes('api.v2.market.products.detail'))
    for (const item of catalog.payload.data.items.filter((x) => x.apiId.startsWith('api.v2.market.'))) {
      assert.equal(item.section, 'market')
      assert.equal(item.method, 'GET')
    }
  })

  await t.test('ratePlan/switchKey 与对应 v1 能力一致（纯函数直接断言，非仅 200）', () => {
    // v2 商品列表/详情与 v1 同名能力同桶同开关语义
    assert.deepEqual(
      v2RateBucket('GET', '/market/products'),
      v1RateBucket('GET', '/market/product/list'),
      'v2 list 与 v1 list 限流桶必须同语义',
    )
    assert.deepEqual(
      v2RateBucket('GET', '/market/products/:id'),
      v1RateBucket('GET', '/market/product/:id'),
      'v2 detail 与 v1 detail 限流桶必须同语义',
    )
    assert.equal(v2RateBucket('GET', '/market/products').name, 'global')
    assert.equal(v2SwitchKeyFor('GET', '/market/products'), null)
    assert.equal(v1SwitchKeyFor('GET', '/market/product/list'), null, 'v1 list 无开关规则（对照）')
    assert.equal(v2SwitchKeyFor('GET', '/market/products/:id'), null)
    assert.equal(v1SwitchKeyFor('GET', '/market/product/:id'), null)
    // v1 既有规则未被动摇（正对照）
    assert.equal(v1SwitchKeyFor('POST', '/market/order'), 'market_order')
    assert.equal(v1RateBucket('POST', '/auth/login').name, 'auth-login')
    assert.equal(v2SwitchKeyFor('POST', '/market/products'), null, 'v2 未登记写端点不得有开关映射')
  })

  await t.test('认证输入七类 v1/v2 等价（optionalAuth 语义：尽力解析，非法/过期凭据忽略不阻断）', async () => {
    clearRateLimits()
    const farmerToken = await loginNative('v2m-seller')
    const cookie = await browserAccessCookie('v2m-seller')
    const expired = jwt.sign(
      { id: seller.id, role: 'FARMER', tokenType: 'access', sid: '00000000-0000-0000-0000-000000000000' },
      config.jwt.secret,
      { expiresIn: -10 },
    )
    const cases = [
      { label: '无 Cookie/Bearer', opts: {} },
      { label: '合法 FARMER Bearer', opts: { token: farmerToken } },
      { label: '合法 Cookie', opts: { cookie } },
      { label: '格式错误 Authorization（非 Bearer 垃圾串）', opts: { headers: { Authorization: 'garbage-token' } } },
      { label: '格式错误 Authorization（Bearer 后空 token）', opts: { headers: { Authorization: 'Bearer ' } } },
      { label: '过期 Bearer', opts: { headers: { Authorization: `Bearer ${expired}` } } },
      { label: '无效认证 Cookie', opts: { cookie: 'access_token=invalid-token-value' } },
    ]
    for (const c of cases) {
      const headers = { ...(c.opts.headers || {}) }
      if (c.opts.token) headers.Authorization = `Bearer ${c.opts.token}`
      if (c.opts.cookie) headers.Cookie = c.opts.cookie
      const v1 = await api('GET', '/api/v1/market/product/list', { headers })
      const v2 = await api('GET', '/api/v2/market/products', { headers })
      assertEquivalentEnvelope(v1, v2, c.label)
      assert.equal(v1.status, 200, `${c.label}：v1 应 200（optionalAuth 语义）`)
      assert.equal(v2.status, 200, `${c.label}：v2 应 200（optionalAuth 语义）`)
      assert.equal(v1.payload.code, 200)
      assert.equal(v2.payload.code, 200)
    }
  })

  await t.test('resolveV2ApiPolicy 命中证据：两个商品能力 matched=true（capabilityId 直接断言）', () => {
    assert.deepEqual(resolveV2ApiPolicy('GET', '/market/products'), {
      matched: true,
      capabilityId: 'cap.v2.market.products',
      apiId: 'api.v2.market.products',
      ratePlan: 'global',
      switchKey: null,
    })
    assert.deepEqual(resolveV2ApiPolicy('GET', '/market/products/123'), {
      matched: true,
      capabilityId: 'cap.v2.market.products.detail',
      apiId: 'api.v2.market.products.detail',
      ratePlan: 'global',
      switchKey: null,
    })
    // middleware 实际到达的路径形态全覆盖
    assert.equal(resolveV2ApiPolicy('GET', '/api/v2/market/products').capabilityId, 'cap.v2.market.products', '完整 /api/v2 前缀路径')
    assert.equal(resolveV2ApiPolicy('GET', '/api/v2/market/products?pageNum=1&pageSize=2').capabilityId, 'cap.v2.market.products', '带 query string')
    assert.equal(resolveV2ApiPolicy('GET', '/market/products/').capabilityId, 'cap.v2.market.products', '尾斜杠')
    assert.equal(resolveV2ApiPolicy('GET', '/api/v2/market/products/123/').capabilityId, 'cap.v2.market.products.detail', '具体 id + 尾斜杠 + 前缀')
    assert.equal(resolveV2ApiPolicy('GET', '/ping').capabilityId, 'cap.v2.system.ping')
  })

  await t.test('未知 v2 路由 matched=false：明确走既有 fallback，不假装已登记', () => {
    assert.deepEqual(resolveV2ApiPolicy('GET', '/market/unknown'), {
      matched: false, capabilityId: null, apiId: null, ratePlan: null, switchKey: null,
    })
    assert.deepEqual(resolveV2ApiPolicy('POST', '/market/products'), {
      matched: false, capabilityId: null, apiId: null, ratePlan: null, switchKey: null,
    }, 'method 不同不得误命中 GET 模板')
    assert.equal(v2RateBucket('GET', '/market/unknown').name, 'global', '未知 v2 明确走既有 fallback global 桶')
    assert.equal(v2SwitchKeyFor('GET', '/market/unknown'), null)
  })

  await t.test('v1 ratePlan/switchKey 硬编码 characterization 表（锁定重构前既有行为，非从 RULES 动态生成）', () => {
    const table = [
      // [method, path, role, {name,windowSec,limit}, switchKey]
      ['POST', '/auth/login', null, { name: 'auth-login', windowSec: 60, limit: 10 }, null],
      ['POST', '/auth/reset-password', null, { name: 'auth-login', windowSec: 60, limit: 10 }, null],
      ['POST', '/auth/sms/send', null, { name: 'sms', windowSec: 3600, limit: 5 }, null],
      ['POST', '/auth/register', null, { name: 'global', windowSec: 60, limit: 100 }, 'user_register'],
      ['POST', '/agri/disease/detect', null, { name: 'ai', windowSec: 3600, limit: 20 }, 'ai_disease_detect'],
      ['POST', '/agri/weed/detect', null, { name: 'ai', windowSec: 3600, limit: 20 }, 'ai_weed_detect'],
      ['POST', '/agri/seed/detect', null, { name: 'ai', windowSec: 3600, limit: 20 }, 'ai_seed_detect'],
      ['POST', '/agri/yield/predict', null, { name: 'global', windowSec: 60, limit: 100 }, 'ai_yield_predict'],
      ['POST', '/policy/ai/ask', null, { name: 'ai', windowSec: 3600, limit: 20 }, 'ai_policy_qa'],
      ['POST', '/ai/policy/ask', null, { name: 'ai', windowSec: 3600, limit: 20 }, 'ai_policy_qa'],
      ['POST', '/ai/chat', null, { name: 'ai', windowSec: 3600, limit: 20 }, 'ai_chat'],
      ['POST', '/ai/agri/ask', null, { name: 'ai', windowSec: 3600, limit: 20 }, 'ai_chat'],
      ['POST', '/ai/legal/ask', null, { name: 'ai', windowSec: 3600, limit: 20 }, 'ai_chat'],
      ['POST', '/ai/voice/recognize', null, { name: 'ai', windowSec: 3600, limit: 20 }, 'ai_voice'],
      ['POST', '/market/grade/detect', null, { name: 'ai', windowSec: 3600, limit: 20 }, 'ai_grade_detect'],
      ['POST', '/machinery/fault/diagnose', null, { name: 'ai', windowSec: 3600, limit: 20 }, 'ai_fault_diagnose'],
      ['POST', '/disaster/claim/assess', null, { name: 'ai', windowSec: 3600, limit: 20 }, 'ai_claim_assess'],
      ['POST', '/market/package/generate', null, { name: 'ai', windowSec: 3600, limit: 20 }, 'ai_copywriting'],
      ['POST', '/market/live/script', null, { name: 'global', windowSec: 60, limit: 100 }, 'ai_copywriting'],
      ['POST', '/life/tourism/promote', null, { name: 'global', windowSec: 60, limit: 100 }, 'ai_copywriting'],
      ['POST', '/data/annual-report/generate', null, { name: 'ai', windowSec: 3600, limit: 20 }, 'ai_annual_report'],
      ['POST', '/market/order', null, { name: 'global', windowSec: 60, limit: 100 }, 'market_order'],
      ['POST', '/machinery/booking', null, { name: 'global', windowSec: 60, limit: 100 }, 'machinery_booking'],
      ['POST', '/disaster/report', null, { name: 'upload', windowSec: 3600, limit: 30 }, 'disaster_report'],
      ['POST', '/policy/subsidy/apply', null, { name: 'global', windowSec: 60, limit: 100 }, 'subsidy_apply'],
      ['POST', '/life/help', null, { name: 'global', windowSec: 60, limit: 100 }, 'community_post'],
      ['POST', '/life/secondhand', null, { name: 'global', windowSec: 60, limit: 100 }, 'community_post'],
      ['POST', '/life/env/report', null, { name: 'upload', windowSec: 3600, limit: 30 }, 'community_post'],
      ['POST', '/life/folk', null, { name: 'global', windowSec: 60, limit: 100 }, 'community_post'],
      ['POST', '/life/tourism', null, { name: 'global', windowSec: 60, limit: 100 }, 'community_post'],
      ['POST', '/data/sync', null, { name: 'global', windowSec: 60, limit: 100 }, 'offline_sync'],
      ['POST', '/ai/tts', null, { name: 'tts', windowSec: 3600, limit: 300 }, null],
      ['GET', '/ai/tts/status', null, { name: 'tts', windowSec: 3600, limit: 300 }, null],
      ['GET', '/market/product/list', null, { name: 'global', windowSec: 60, limit: 100 }, null],
      ['GET', '/market/product/123', null, { name: 'global', windowSec: 60, limit: 100 }, null],
      ['GET', '/unknown/path', null, { name: 'global', windowSec: 60, limit: 100 }, null],
      ['PUT', '/market/order/1/status', null, { name: 'global', windowSec: 60, limit: 100 }, null],
      ['GET', '/admin/api-switch/list', 'ADMIN', { name: 'admin-read', windowSec: 60, limit: 600 }, null],
      ['PUT', '/admin/api-switch/1', 'ADMIN', { name: 'admin-write', windowSec: 60, limit: 120 }, null],
      ['DELETE', '/admin/api-switch/1', 'ADMIN', { name: 'admin-write', windowSec: 60, limit: 120 }, null],
      ['GET', '/admin/api-switch/list', 'FARMER', { name: 'global', windowSec: 60, limit: 100 }, null],
    ]
    for (const [method, path, role, expectedBucket, expectedSwitch] of table) {
      const bucket = resolveV1RatePolicy(method, path, role)
      assert.deepEqual(
        { name: bucket.name, windowSec: bucket.windowSec, limit: bucket.limit },
        expectedBucket,
        `${method} ${path} (role=${role}) 限流桶`,
      )
      assert.equal(v1SwitchKeyFor(method, path), expectedSwitch, `${method} ${path} switchKey`)
    }
  })

  await t.test('HTTP 实证：v2 商品列表走 global 桶（X-RateLimit-Policy 头，非 fallback 盲区）', async () => {
    clearRateLimits()
    const res = await api('GET', '/api/v2/market/products')
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('X-RateLimit-Policy'), 'global')
    assert.equal(res.headers.get('X-RateLimit-Limit'), '100')
    const v1 = await api('GET', '/api/v1/market/product/list')
    assert.equal(v1.headers.get('X-RateLimit-Policy'), 'global', 'v1 同能力同为 global 桶')
  })

  await t.test('GET 不产生 operation log 写日志', async () => {
    clearRateLimits()
    await api('GET', '/api/v2/market/products')
    await api('GET', `/api/v2/market/products/${products.p1.id}`)
    const rows = await prisma.operationLog.findMany({
      where: { action: { startsWith: 'GET /api/v2/market/products' } },
    })
    assert.equal(rows.length, 0, 'v2 商品 GET 不得写入操作日志（写请求另测）')
  })
})
