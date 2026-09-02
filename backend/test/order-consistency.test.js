// 116g-A order-consistency: 订单一致性规则（order.policy + order.controller 接入）
// 覆盖：状态白名单/幂等重复/参与者访问边界/跨用户禁止/非法状态错误码与 DB 终态。
import { closeSync, mkdtempSync, openSync, rmSync } from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'

// ── 精确路径守卫 ──
const backendRoot = path.resolve(import.meta.dirname, '..')
const prismaDir = path.resolve(backendRoot, 'prisma')
const testRoot = mkdtempSync(path.join(prismaDir, '.test-116g-order-'))
const testBase = path.basename(testRoot)
const expectedPrefix = '.test-116g-order-'
const dbFile = path.join(testRoot, 'order.db')
const expectedDbUrl = `file:./${testBase}/order.db`

assert.equal(path.dirname(path.resolve(testRoot)), prismaDir, 'testRoot 父目录必须是 backend/prisma')
assert.ok(testBase.startsWith(expectedPrefix) && testBase.length > expectedPrefix.length, `testRoot basename 必须以 ${expectedPrefix} 开头`)
assert.equal(path.resolve(dbFile), dbFile, 'dbFile 必须已解析')
assert.ok(path.resolve(dbFile).startsWith(path.resolve(testRoot) + path.sep), 'dbFile 必须在 testRoot 内')

// ── 环境变量（在任何 app/db/Prisma import 前） ──
closeSync(openSync(dbFile, 'w'))
process.env.DATABASE_URL = expectedDbUrl
process.env.APP_ENV = 'dev'

assert.equal(process.env.DATABASE_URL, expectedDbUrl, 'DATABASE_URL 必须精确等于 expectedDbUrl')

// ── 临时库 migrate + db push ──
let prismaCli, prismaOpts, setupErr
try {
  prismaCli = path.join(backendRoot, 'node_modules', 'prisma', 'build', 'index.js')
  prismaOpts = { cwd: backendRoot, env: process.env, stdio: 'pipe' }
  const { execFileSync } = await import('node:child_process')
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], prismaOpts)
  execFileSync(process.execPath, [prismaCli, 'db', 'push', '--skip-generate', '--schema', 'prisma/schema.prisma'], prismaOpts)
} catch (e) {
  setupErr = e
}

function guardedRm() {
  const rb = path.basename(testRoot)
  if (
    rb.startsWith(expectedPrefix) && rb.length > expectedPrefix.length &&
    path.dirname(path.resolve(testRoot)) === prismaDir &&
    path.resolve(dbFile).startsWith(path.resolve(testRoot) + path.sep) &&
    process.env.DATABASE_URL === expectedDbUrl
  ) {
    rmSync(testRoot, { recursive: true, force: true })
  } else {
    throw new Error(`refusing rm: testRoot 不匹配 ${expectedPrefix}*: ${testRoot}`)
  }
}
if (setupErr) {
  const errs = []
  try { guardedRm() } catch (e) { errs.push(e) }
  if (errs.length) throw new AggregateError([setupErr, ...errs], 'setup failed')
  throw setupErr
}

let app, prisma, bcrypt, issueSession, clearRateLimits
let loadErr
try {
  const dbModule = await import('../src/db.js')
  prisma = dbModule.prisma
} catch (e) {
  loadErr = e
}
if (!loadErr) {
  try {
    ;[{ default: app }, { default: bcrypt }, { issueSession }, { clearRateLimits }] = await Promise.all([
      import('../src/app.js'),
      import('bcryptjs'),
      import('../src/modules/platform/auth-session.service.js'),
      import('../src/middleware/apiControl.js'),
    ])
  } catch (e) {
    loadErr = e
  }
}
if (loadErr) {
  const errs = []
  if (prisma) { try { await prisma.$disconnect() } catch (e) { errs.push(e) } }
  try { guardedRm() } catch (e) { errs.push(e) }
  if (errs.length) throw new AggregateError([loadErr, ...errs], 'init failed')
  throw loadErr
}

// ── helpers ──
const NATIVE_HEADERS = { 'User-Agent': 'capacitor://localhost', 'X-Device-Name': '116g-order-test' }
let server, baseUrl
let buyer, seller, outsider
let product

async function api(method, pathName, body, token) {
  const headers = { ...NATIVE_HEADERS }
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`
  const resp = await fetch(`${baseUrl}/api/v1${pathName}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const payload = await resp.json().catch(() => null)
  return { status: resp.status, payload }
}

async function cleanup() {
  const errs = []
  if (server) { try { await new Promise((resolve, reject) => { server.close((e) => e ? reject(e) : resolve()) }) } catch (e) { errs.push(e) } }
  if (prisma) { try { await prisma.$disconnect() } catch (e) { errs.push(e) } }
  if (typeof clearRateLimits === 'function') { try { clearRateLimits() } catch (e) { errs.push(e) } }
  try { guardedRm() } catch (e) { errs.push(e) }
  if (errs.length) throw new AggregateError(errs, 'cleanup errors')
}

before(async () => {
  const hash = await bcrypt.hash('test116g', 4)
  buyer = await prisma.user.create({ data: { username: '116g-order-buyer', nickname: '订单买家', passwordHash: hash, phone: '13901116001', role: 'FARMER', regionCode: '440100123', status: 1 } })
  seller = await prisma.user.create({ data: { username: '116g-order-seller', nickname: '订单卖家', passwordHash: hash, phone: '13901116002', role: 'FARMER', regionCode: '440100456', status: 1 } })
  outsider = await prisma.user.create({ data: { username: '116g-order-other', nickname: '无关用户', passwordHash: hash, phone: '13901116003', role: 'FARMER', regionCode: '440100789', status: 1 } })
  product = await prisma.product.create({ data: { sellerId: seller.id, title: '一致性测试玉米', category: '蔬菜', price: 6, unit: '斤', stock: 100, soldCount: 0, regionCode: '440100456', status: 1 } })

  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => { await cleanup() })

async function makeOrder(overrides = {}) {
  return prisma.order.create({
    data: {
      orderNo: 'OD116G-' + Math.floor(Math.random() * 1e9),
      buyerId: buyer.id,
      sellerId: seller.id,
      productId: product.id,
      quantity: 2,
      totalAmount: 12,
      status: 'PENDING',
      ...overrides,
    },
  })
}

// ═══════════════ O1 状态白名单与非法状态 ═══════════════
describe('O1 PUT /market/order/:id/status — 状态白名单与非法状态', () => {
  it('非法状态 BAD → 400/code=40001/msg=订单状态不合法/data=null，DB 未变', async () => {
    clearRateLimits()
    const order = await makeOrder()
    const buyerSession = await issueSession(buyer, { deviceName: '116g-order-test' })
    const { status, payload } = await api('PUT', `/market/order/${order.id}/status`, { status: 'BAD' }, buyerSession.token)
    assert.equal(status, 400)
    assert.equal(payload.code, 40001)
    assert.equal(payload.msg, '订单状态不合法')
    assert.equal(payload.data, null)
    assert.equal((await prisma.order.findUnique({ where: { id: order.id } })).status, 'PENDING', '非法状态不得落库')
  })

  it('白名单状态 PENDING→PAID → 200/code=200/msg=订单状态已更新，DB 终态 PAID', async () => {
    clearRateLimits()
    const order = await makeOrder()
    const buyerSession = await issueSession(buyer, { deviceName: '116g-order-test' })
    const { status, payload } = await api('PUT', `/market/order/${order.id}/status`, { status: 'PAID' }, buyerSession.token)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.equal(payload.msg, '订单状态已更新')
    assert.equal(payload.data.id, order.id)
    assert.equal(payload.data.status, 'PAID')
    assert.equal((await prisma.order.findUnique({ where: { id: order.id } })).status, 'PAID')
  })
})

// ═══════════════ O2 幂等重复 ═══════════════
describe('O2 重复状态更新幂等（同状态不重复副作用）', () => {
  it('CANCELLED 首次回补库存，重复 CANCELLED 不再二次回补', async () => {
    clearRateLimits()
    const prod = await prisma.product.create({ data: { sellerId: seller.id, title: '幂等测试品', category: '蔬菜', price: 5, unit: '斤', stock: 50, soldCount: 10, regionCode: '440100456', status: 1 } })
    const order = await prisma.order.create({
      data: {
        orderNo: 'OD116G-IDEM-' + Math.floor(Math.random() * 1e9),
        buyerId: buyer.id, sellerId: seller.id, productId: prod.id,
        quantity: 3, totalAmount: 15, status: 'PENDING',
      },
    })
    const buyerSession = await issueSession(buyer, { deviceName: '116g-order-test' })

    // 首次 CANCELLED：订单 PENDING → 取消，回补库存恰好一次（stock 50→53，soldCount 10→7）
    const r1 = await api('PUT', `/market/order/${order.id}/status`, { status: 'CANCELLED' }, buyerSession.token)
    assert.equal(r1.status, 200)
    assert.equal(r1.payload.code, 200)
    assert.equal(r1.payload.data.status, 'CANCELLED')
    const prodAfter = await prisma.product.findUnique({ where: { id: prod.id } })
    assert.equal(prodAfter.stock, 53, '首次取消应回补库存 +3')
    assert.equal(prodAfter.soldCount, 7, '首次取消应扣减 soldCount')

    // 重复 CANCELLED：幂等成功，不再二次回补
    const r2 = await api('PUT', `/market/order/${order.id}/status`, { status: 'CANCELLED' }, buyerSession.token)
    assert.equal(r2.status, 200)
    assert.equal(r2.payload.code, 200)
    assert.equal(r2.payload.data.status, 'CANCELLED')
    const prodAfter2 = await prisma.product.findUnique({ where: { id: prod.id } })
    assert.equal(prodAfter2.stock, 53, '重复取消不得二次回补库存')
    assert.equal(prodAfter2.soldCount, 7)
  })

  it('SHIPPED 首次生成物流单，重复 SHIPPED 不重复生成', async () => {
    clearRateLimits()
    const order = await makeOrder({ status: 'PAID' })
    const sellerSession = await issueSession(seller, { deviceName: '116g-order-test' })
    const r1 = await api('PUT', `/market/order/${order.id}/status`, { status: 'SHIPPED' }, sellerSession.token)
    assert.equal(r1.status, 200)
    assert.equal(r1.payload.data.status, 'SHIPPED')
    assert.ok(r1.payload.data.logisticsNo, '发货应生成物流单号')
    const lgCount1 = await prisma.logistics.count({ where: { orderId: order.id } })
    assert.equal(lgCount1, 1, '首次发货恰好一条物流单')

    const r2 = await api('PUT', `/market/order/${order.id}/status`, { status: 'SHIPPED' }, sellerSession.token)
    assert.equal(r2.status, 200)
    assert.equal(r2.payload.data.status, 'SHIPPED')
    const lgCount2 = await prisma.logistics.count({ where: { orderId: order.id } })
    assert.equal(lgCount2, 1, '重复发货不得重复生成物流单')
  })
})

// ═══════════════ O3 参与者访问边界 / 跨用户 ═══════════════
describe('O3 买家/卖家访问边界与跨用户禁止', () => {
  let order
  let buyerToken, sellerToken, outsiderToken
  before(async () => {
    order = await makeOrder()
    ;[{ token: buyerToken }, { token: sellerToken }, { token: outsiderToken }] = await Promise.all([
      issueSession(buyer, { deviceName: '116g-order-test' }),
      issueSession(seller, { deviceName: '116g-order-test' }),
      issueSession(outsider, { deviceName: '116g-order-test' }),
    ])
  })

  it('买家可查看订单（200/code=200）', async () => {
    const { status, payload } = await api('GET', `/market/order/${order.id}`, null, buyerToken)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.equal(payload.data.id, order.id)
  })

  it('卖家可查看订单（200/code=200）', async () => {
    const { status, payload } = await api('GET', `/market/order/${order.id}`, null, sellerToken)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.equal(payload.data.id, order.id)
  })

  it('无关第三方查看 → 403/code=40301/msg=无权查看该订单/data=null', async () => {
    const { status, payload } = await api('GET', `/market/order/${order.id}`, null, outsiderToken)
    assert.equal(status, 403)
    assert.equal(payload.code, 40301)
    assert.equal(payload.msg, '无权查看该订单')
    assert.equal(payload.data, null)
  })

  it('无关第三方改状态 → 403/code=40301/msg=无权操作该订单，DB 未变', async () => {
    const { status, payload } = await api('PUT', `/market/order/${order.id}/status`, { status: 'PAID' }, outsiderToken)
    assert.equal(status, 403)
    assert.equal(payload.code, 40301)
    assert.equal(payload.msg, '无权操作该订单')
    assert.equal(payload.data, null)
    assert.equal((await prisma.order.findUnique({ where: { id: order.id } })).status, 'PENDING', '越权更新不得落库')
  })

  it('未登录 → 401/code=40101/msg=未登录或登录已失效', async () => {
    const { status, payload } = await api('GET', `/market/order/${order.id}`)
    assert.equal(status, 401)
    assert.equal(payload.code, 40101)
    assert.equal(payload.msg, '未登录或登录已失效')
  })

  it('订单不存在 → 404/code=40401/msg=订单不存在/data=null', async () => {
    const { status, payload } = await api('GET', '/market/order/999999', null, buyerToken)
    assert.equal(status, 404)
    assert.equal(payload.code, 40401)
    assert.equal(payload.msg, '订单不存在')
    assert.equal(payload.data, null)
  })
})
