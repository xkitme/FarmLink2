// 116d characterization: 交易（B1–B6）
import { closeSync, mkdtempSync, openSync, rmSync } from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'

// ── 精确路径守卫 ──
const backendRoot = path.resolve(import.meta.dirname, '..')
const prismaDir = path.resolve(backendRoot, 'prisma')
const testRoot = mkdtempSync(path.join(prismaDir, '.test-116d-market-'))
const testBase = path.basename(testRoot)
const expectedPrefix = '.test-116d-market-'
const dbFile = path.join(testRoot, 'market.db')
const expectedDbUrl = `file:./${testBase}/market.db`

assert.equal(path.dirname(path.resolve(testRoot)), prismaDir, 'testRoot 父目录必须是 backend/prisma')
assert.ok(testBase.startsWith(expectedPrefix) && testBase.length > expectedPrefix.length, `testRoot basename 必须以 ${expectedPrefix} 开头`)
assert.equal(path.resolve(dbFile), dbFile, 'dbFile 必须已解析')
assert.ok(path.resolve(dbFile).startsWith(path.resolve(testRoot) + path.sep), 'dbFile 必须在 testRoot 内')

// ── 环境变量（在任何 app/db/Prisma import 前） ──
closeSync(openSync(dbFile, 'w'))
process.env.DATABASE_URL = expectedDbUrl
process.env.APP_ENV = 'dev'

// fail-closed：必须等于预期值
assert.equal(process.env.DATABASE_URL, expectedDbUrl, 'DATABASE_URL 必须精确等于 expectedDbUrl')

// ── 临时库 migrate + db push ──
let prismaCli, prismaOpts, setupErr
try {
  prismaCli = path.join(backendRoot, 'node_modules', 'prisma', 'build', 'index.js')
  prismaOpts = { cwd: backendRoot, env: process.env, stdio: 'pipe' }
  const { execFileSync } = await import('node:child_process')
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], prismaOpts)
  // 对齐当前 runtime schema（migration history 缺 threadId 等字段，116d 已知风险）
  execFileSync(process.execPath, [prismaCli, 'db', 'push', '--skip-generate', '--schema', 'prisma/schema.prisma'], prismaOpts)
} catch (e) {
  setupErr = e
}

// 守卫 rm：fail-closed —— 多重验证通过才允许递归删除
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

// ── 动态 import（顺序：先 db 立即赋 prisma，再其余；失败时 disconnect+rm） ──
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
const NATIVE_HEADERS = { 'User-Agent': 'capacitor://localhost', 'X-Device-Name': '116d-market-test' }
let server, baseUrl
let buyer, seller, seller2
let productA, productB, productInactive, productSeller2nd

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

// ── before / after ──
before(async () => {
  const hash = await bcrypt.hash('test116d', 4)
  buyer = await prisma.user.create({ data: { username: '116d-buyer', nickname: '买家李四', passwordHash: hash, phone: '13900001161', role: 'FARMER', regionCode: '440100123', status: 1 } })
  seller = await prisma.user.create({ data: { username: '116d-seller', nickname: '卖家王五', passwordHash: hash, phone: '13900001162', role: 'FARMER', regionCode: '440100456', villageName: '王村', status: 1 } })
  seller2 = await prisma.user.create({ data: { username: '116d-seller2', nickname: '卖家赵六', passwordHash: hash, phone: '13900001163', role: 'FARMER', regionCode: '440100789', villageName: '赵庄', status: 1 } })

  productSeller2nd = await prisma.product.create({ data: { sellerId: seller.id, title: '新鲜大米', category: '粮油', price: 4.0, unit: '斤', stock: 200, soldCount: 0, regionCode: '440100456', status: 1, createdAt: new Date('2026-08-01T00:00:00.000Z') } })
  productA = await prisma.product.create({ data: { sellerId: seller.id, title: '测试高山玉米', category: '蔬菜', price: 5.5, unit: '斤', stock: 100, soldCount: 0, images: '["/uploads/corn1.jpg","/uploads/corn2.jpg"]', regionCode: '440100456', status: 1, createdAt: new Date('2026-08-01T00:00:01.000Z') } })
  productB = await prisma.product.create({ data: { sellerId: seller2.id, title: '有机红薯', category: '蔬菜', price: 3.0, unit: '斤', stock: 50, soldCount: 0, images: '["/uploads/potato.jpg"]', regionCode: '440100789', status: 1, createdAt: new Date('2026-08-01T00:00:02.000Z') } })
  productInactive = await prisma.product.create({ data: { sellerId: seller.id, title: '隐藏商品', category: '蔬菜', price: 1, unit: '斤', stock: 0, soldCount: 0, status: 0, createdAt: new Date('2026-08-01T00:00:03.000Z') } })

  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => { await cleanup() })

// ═══════════════ B1 商品列表 ═══════════════
describe('B1 GET /market/product/list', () => {
  it('status=1 仅含 3 个在售，createdAt 降序，分页精确', async () => {
    const { status, payload } = await api('GET', '/market/product/list?pageNum=1&pageSize=10')
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.equal(payload.msg, 'success')
    const { records, total, pageNum, pageSize, pages } = payload.data
    assert.equal(total, 3); assert.equal(pageNum, 1); assert.equal(pageSize, 10); assert.equal(pages, 1)
    assert.deepEqual(records.map((r) => r.id), [productB.id, productA.id, productSeller2nd.id])
    for (const r of records) assert.equal(r.status, 1)
    assert.deepEqual(records.find((r) => r.id === productA.id).images, ['/uploads/corn1.jpg', '/uploads/corn2.jpg'])
    assert.deepEqual(records.find((r) => r.id === productB.id).images, ['/uploads/potato.jpg'])
    assert.equal(records.find((r) => r.id === productB.id).sellerId, seller2.id)
    assert.equal(records.find((r) => r.id === productA.id).sellerId, seller.id)
  })
  it('category=粮油 精确命中 1 条', async () => {
    const { status, payload } = await api('GET', '/market/product/list?category=粮油&pageNum=1&pageSize=10')
    assert.equal(status, 200); assert.equal(payload.code, 200); assert.equal(payload.msg, 'success')
    assert.equal(payload.data.total, 1); assert.equal(payload.data.pageNum, 1); assert.equal(payload.data.pageSize, 10); assert.equal(payload.data.pages, 1)
    assert.deepEqual(payload.data.records.map((r) => r.id), [productSeller2nd.id])
    assert.equal(payload.data.records[0].category, '粮油'); assert.equal(payload.data.records[0].sellerId, seller.id)
  })
  it('keyword=玉米 精确命中 1 条', async () => {
    const { status, payload } = await api('GET', '/market/product/list?keyword=玉米&pageNum=1&pageSize=10')
    assert.equal(status, 200); assert.equal(payload.code, 200); assert.equal(payload.msg, 'success')
    assert.equal(payload.data.total, 1); assert.equal(payload.data.pageNum, 1); assert.equal(payload.data.pageSize, 10); assert.equal(payload.data.pages, 1)
    assert.deepEqual(payload.data.records.map((r) => r.id), [productA.id])
    assert.equal(payload.data.records[0].title, '测试高山玉米'); assert.equal(payload.data.records[0].sellerId, seller.id)
  })
})

// ═══════════════ B2 商品详情 ═══════════════
describe('B2 GET /market/product/:id', () => {
  it('返回完整详情含 seller 精确字段', async () => {
    const { status, payload } = await api('GET', `/market/product/${productA.id}`)
    assert.equal(status, 200); assert.equal(payload.code, 200); assert.equal(payload.msg, 'success')
    const d = payload.data
    assert.equal(d.id, productA.id); assert.equal(d.title, '测试高山玉米'); assert.equal(d.price, 5.5); assert.equal(d.unit, '斤')
    assert.deepEqual(d.images, ['/uploads/corn1.jpg', '/uploads/corn2.jpg'])
    assert.deepEqual(d.seller, { id: seller.id, nickname: '卖家王五', villageName: '王村', phone: '13900001162' })
  })
  it('不存在 → 404, code=40401, msg=商品不存在, data=null', async () => {
    const { status, payload } = await api('GET', '/market/product/99999')
    assert.equal(status, 404); assert.equal(payload.code, 40401); assert.equal(payload.msg, '商品不存在'); assert.equal(payload.data, null)
  })
})

// ═══════════════ B3 本人商品 ═══════════════
describe('B3 GET /market/product/mine', () => {
  let sellerToken
  before(async () => { const s = await issueSession(seller, { deviceName: '116d-market-test' }); sellerToken = s.token })
  it('已认证 seller 返回全部（含 status=0），createdAt 降序', async () => {
    const { status, payload } = await api('GET', '/market/product/mine', null, sellerToken)
    assert.equal(status, 200); assert.equal(payload.code, 200); assert.equal(payload.msg, 'success')
    assert.deepEqual(payload.data.map((p) => p.id), [productInactive.id, productA.id, productSeller2nd.id])
    for (const p of payload.data) assert.equal(p.sellerId, seller.id)
    assert.equal(payload.data.find((p) => p.id === productInactive.id).status, 0)
    assert.equal(payload.data.find((p) => p.id === productA.id).status, 1)
    assert.deepEqual(payload.data.find((p) => p.id === productA.id).images, ['/uploads/corn1.jpg', '/uploads/corn2.jpg'])
  })
  it('未认证 → 401, code=40101, msg=未登录或登录已失效, data=null', async () => {
    const { status, payload } = await api('GET', '/market/product/mine')
    assert.equal(status, 401); assert.equal(payload.code, 40101)
    assert.equal(payload.msg, '未登录或登录已失效'); assert.equal(payload.data, null)
  })
})

// ═══════════════ B4 订单列表（独立 fixture：status=0 产品不污染 B1） ═══════════════
describe('B4 GET /market/order/list', () => {
  let b4Buyer, b4Seller, b4Seller2, b4Product1, b4Product2
  let buyerToken, sellerToken
  let ordBuyer2, ordBuyer1, ordSeller

  before(async () => {
    const hash = await bcrypt.hash('test116d', 4)
    b4Buyer = await prisma.user.create({ data: { username: '116d-b4-buyer', nickname: 'B4买家', passwordHash: hash, phone: '13900101601', role: 'FARMER', regionCode: '440100123', status: 1 } })
    b4Seller = await prisma.user.create({ data: { username: '116d-b4-seller', nickname: 'B4卖家', passwordHash: hash, phone: '13900101602', role: 'FARMER', regionCode: '440100456', villageName: 'B4村', status: 1 } })
    b4Seller2 = await prisma.user.create({ data: { username: '116d-b4-seller2', nickname: 'B4卖家2', passwordHash: hash, phone: '13900101603', role: 'FARMER', regionCode: '440100789', villageName: 'B4庄', status: 1 } })
    // 均 status=0，不污染 B1 在售 total=3
    b4Product1 = await prisma.product.create({ data: { sellerId: b4Seller.id, title: 'B4测试商品1', category: '蔬菜', price: 10, unit: '斤', stock: 50, soldCount: 0, regionCode: '440100456', status: 0, createdAt: new Date('2026-08-01T00:00:05.000Z') } })
    b4Product2 = await prisma.product.create({ data: { sellerId: b4Seller2.id, title: 'B4测试商品2', category: '蔬菜', price: 3, unit: '斤', stock: 30, soldCount: 0, regionCode: '440100789', status: 0, createdAt: new Date('2026-08-01T00:00:06.000Z') } })
    ;[{ token: buyerToken }] = [await issueSession(b4Buyer, { deviceName: '116d-market-test' })]
    ;[{ token: sellerToken }] = [await issueSession(b4Seller, { deviceName: '116d-market-test' })]
    ordBuyer1 = await prisma.order.create({ data: { orderNo: 'OD116D-B4-01', buyerId: b4Buyer.id, sellerId: b4Seller.id, productId: b4Product1.id, quantity: 2, totalAmount: 20, status: 'PENDING', receiverInfo: '{"name":"B4李","phone":"13900101601","address":"B4地址1"}', createdAt: new Date('2026-08-01T02:00:00.000Z') } })
    ordBuyer2 = await prisma.order.create({ data: { orderNo: 'OD116D-B4-02', buyerId: b4Buyer.id, sellerId: b4Seller2.id, productId: b4Product2.id, quantity: 1, totalAmount: 3, status: 'PAID', receiverInfo: '{"name":"B4李","phone":"13900101601","address":"B4地址2"}', createdAt: new Date('2026-08-01T02:00:01.000Z') } })
    ordSeller = await prisma.order.create({ data: { orderNo: 'OD116D-B4-03', buyerId: b4Seller2.id, sellerId: b4Seller.id, productId: b4Product1.id, quantity: 1, totalAmount: 10, status: 'PAID', createdAt: new Date('2026-08-01T02:00:02.000Z') } })
  })

  it('role=buyer 精确返回买家 2 单，降序', async () => {
    const { status, payload } = await api('GET', '/market/order/list?role=buyer', null, buyerToken)
    assert.equal(status, 200); assert.equal(payload.code, 200); assert.equal(payload.msg, 'success')
    const { records, total, pageNum, pageSize, pages } = payload.data
    assert.equal(total, 2); assert.equal(pageNum, 1); assert.equal(pageSize, 10); assert.equal(pages, 1)
    assert.deepEqual(records.map((r) => r.id), [ordBuyer2.id, ordBuyer1.id])
    // ordBuyer1
    const r1 = records.find((r) => r.id === ordBuyer1.id)
    assert.equal(r1.orderNo, 'OD116D-B4-01'); assert.equal(r1.buyerId, b4Buyer.id); assert.equal(r1.sellerId, b4Seller.id); assert.equal(r1.productId, b4Product1.id)
    assert.equal(r1.quantity, 2); assert.equal(r1.totalAmount, 20); assert.equal(r1.status, 'PENDING')
    assert.deepEqual(r1.receiverInfo, { name: 'B4李', phone: '13900101601', address: 'B4地址1' })
    assert.deepEqual(r1.product, { id: b4Product1.id, title: 'B4测试商品1', unit: '斤' })
    // ordBuyer2
    const r2 = records.find((r) => r.id === ordBuyer2.id)
    assert.equal(r2.orderNo, 'OD116D-B4-02'); assert.equal(r2.buyerId, b4Buyer.id); assert.equal(r2.sellerId, b4Seller2.id); assert.equal(r2.productId, b4Product2.id)
    assert.equal(r2.quantity, 1); assert.equal(r2.totalAmount, 3); assert.equal(r2.status, 'PAID')
    assert.deepEqual(r2.receiverInfo, { name: 'B4李', phone: '13900101601', address: 'B4地址2' })
    assert.deepEqual(r2.product, { id: b4Product2.id, title: 'B4测试商品2', unit: '斤' })
  })

  it('role=seller 精确返回卖家 2 单，降序', async () => {
    const { status, payload } = await api('GET', '/market/order/list?role=seller', null, sellerToken)
    assert.equal(status, 200); assert.equal(payload.code, 200); assert.equal(payload.msg, 'success')
    const { records, total, pageNum, pageSize, pages } = payload.data
    assert.equal(total, 2); assert.equal(pageNum, 1); assert.equal(pageSize, 10); assert.equal(pages, 1)
    assert.deepEqual(records.map((r) => r.id), [ordSeller.id, ordBuyer1.id])
    // ordSeller
    const rs = records.find((r) => r.id === ordSeller.id)
    assert.equal(rs.orderNo, 'OD116D-B4-03'); assert.equal(rs.buyerId, b4Seller2.id); assert.equal(rs.sellerId, b4Seller.id); assert.equal(rs.productId, b4Product1.id)
    assert.equal(rs.quantity, 1); assert.equal(rs.totalAmount, 10); assert.equal(rs.status, 'PAID')
    assert.equal(rs.receiverInfo, null)
    assert.deepEqual(rs.product, { id: b4Product1.id, title: 'B4测试商品1', unit: '斤' })
    // ordBuyer1 (seller view)
    const sb = records.find((r) => r.id === ordBuyer1.id)
    assert.equal(sb.orderNo, 'OD116D-B4-01'); assert.equal(sb.buyerId, b4Buyer.id); assert.equal(sb.sellerId, b4Seller.id); assert.equal(sb.productId, b4Product1.id)
    assert.equal(sb.quantity, 2); assert.equal(sb.totalAmount, 20); assert.equal(sb.status, 'PENDING')
    assert.deepEqual(sb.receiverInfo, { name: 'B4李', phone: '13900101601', address: 'B4地址1' })
    assert.deepEqual(sb.product, { id: b4Product1.id, title: 'B4测试商品1', unit: '斤' })
  })

  it('无 token → 401, code=40101, msg=未登录或登录已失效, data=null', async () => {
    const { status, payload } = await api('GET', '/market/order/list')
    assert.equal(status, 401); assert.equal(payload.code, 40101)
    assert.equal(payload.msg, '未登录或登录已失效'); assert.equal(payload.data, null)
  })
})

// ═══════════════ B5 订单详情 ═══════════════
describe('B5 GET /market/order/:id', () => {
  let buyerToken, sellerToken, seller2Token
  let order

  before(async () => {
    ;[{ token: buyerToken }, { token: sellerToken }, { token: seller2Token }] = await Promise.all([
      issueSession(buyer, { deviceName: '116d-market-test' }),
      issueSession(seller, { deviceName: '116d-market-test' }),
      issueSession(seller2, { deviceName: '116d-market-test' }),
    ])
    order = await prisma.order.create({ data: { orderNo: 'OD116D-DETAIL-A', buyerId: buyer.id, sellerId: seller.id, productId: productA.id, quantity: 3, totalAmount: 16.5, status: 'PENDING', receiverInfo: '{"name":"买家A","phone":"13900001161","address":"收货A"}' } })
  })

  it('buyer 完整详情', async () => {
    const { status, payload } = await api('GET', `/market/order/${order.id}`, null, buyerToken)
    assert.equal(status, 200); assert.equal(payload.code, 200); assert.equal(payload.msg, 'success')
    const d = payload.data
    assert.equal(d.id, order.id); assert.equal(d.orderNo, 'OD116D-DETAIL-A'); assert.equal(d.buyerId, buyer.id); assert.equal(d.sellerId, seller.id); assert.equal(d.productId, productA.id); assert.equal(d.quantity, 3); assert.equal(d.totalAmount, 16.5); assert.equal(d.status, 'PENDING')
    assert.deepEqual(d.receiverInfo, { name: '买家A', phone: '13900001161', address: '收货A' })
    assert.deepEqual({ id: d.product.id, title: d.product.title, unit: d.product.unit }, { id: productA.id, title: '测试高山玉米', unit: '斤' })
  })

  it('seller 同样完整详情（含 buyerId/product/receiverInfo）', async () => {
    const { status, payload } = await api('GET', `/market/order/${order.id}`, null, sellerToken)
    assert.equal(status, 200); assert.equal(payload.code, 200); assert.equal(payload.msg, 'success')
    const d = payload.data
    assert.equal(d.id, order.id); assert.equal(d.orderNo, 'OD116D-DETAIL-A'); assert.equal(d.buyerId, buyer.id); assert.equal(d.sellerId, seller.id); assert.equal(d.productId, productA.id); assert.equal(d.quantity, 3); assert.equal(d.totalAmount, 16.5); assert.equal(d.status, 'PENDING')
    assert.deepEqual(d.receiverInfo, { name: '买家A', phone: '13900001161', address: '收货A' })
    assert.deepEqual({ id: d.product.id, title: d.product.title, unit: d.product.unit }, { id: productA.id, title: '测试高山玉米', unit: '斤' })
  })

  it('跨用户 → 403, code=40301, msg=无权查看该订单, data=null', async () => {
    const { status, payload } = await api('GET', `/market/order/${order.id}`, null, seller2Token)
    assert.equal(status, 403); assert.equal(payload.code, 40301); assert.equal(payload.msg, '无权查看该订单'); assert.equal(payload.data, null)
  })

  it('不存在 → 404, code=40401, msg=订单不存在, data=null', async () => {
    const { status, payload } = await api('GET', '/market/order/99999', null, buyerToken)
    assert.equal(status, 404); assert.equal(payload.code, 40401); assert.equal(payload.msg, '订单不存在'); assert.equal(payload.data, null)
  })
})

// ═══════════════ B6 订单状态变更（每 test 独立 status=0 产品+独立订单基线） ═══════════════
describe('B6 PUT /market/order/:id/status', () => {
  let buyerToken, sellerToken, seller2Token

  before(async () => {
    ;[{ token: buyerToken }, { token: sellerToken }, { token: seller2Token }] = await Promise.all([
      issueSession(buyer, { deviceName: '116d-market-test' }),
      issueSession(seller, { deviceName: '116d-market-test' }),
      issueSession(seller2, { deviceName: '116d-market-test' }),
    ])
  })

  it('PENDING→PAID 首次+重复都 200，stock/soldCount 不变', async () => {
    clearRateLimits()
    const b6Product = await prisma.product.create({ data: { sellerId: seller.id, title: 'B6专属产品-01', category: '蔬菜', price: 10, unit: '斤', stock: 200, soldCount: 0, regionCode: '440100456', status: 0, createdAt: new Date('2026-08-08T01:00:00.000Z') } })
    const order = await prisma.order.create({ data: { orderNo: 'OD116D-B6-01', buyerId: buyer.id, sellerId: seller.id, productId: b6Product.id, quantity: 5, totalAmount: 50, status: 'PENDING' } })
    const prodBaseline = await prisma.product.findUnique({ where: { id: b6Product.id } })

    // 首次 PENDING→PAID
    const r1 = await api('PUT', `/market/order/${order.id}/status`, { status: 'PAID' }, buyerToken)
    assert.equal(r1.status, 200); assert.equal(r1.payload.code, 200); assert.equal(r1.payload.msg, '订单状态已更新')
    assert.equal(r1.payload.data.id, order.id); assert.equal(r1.payload.data.orderNo, 'OD116D-B6-01')
    assert.equal(r1.payload.data.buyerId, buyer.id); assert.equal(r1.payload.data.sellerId, seller.id); assert.equal(r1.payload.data.productId, b6Product.id)
    assert.equal(r1.payload.data.quantity, 5); assert.equal(r1.payload.data.totalAmount, 50); assert.equal(r1.payload.data.status, 'PAID')

    // DB 验证 + 产品 stock/soldCount 不变
    assert.equal((await prisma.order.findUnique({ where: { id: order.id } })).status, 'PAID')
    assert.equal((await prisma.product.findUnique({ where: { id: b6Product.id } })).stock, prodBaseline.stock)
    assert.equal((await prisma.product.findUnique({ where: { id: b6Product.id } })).soldCount, prodBaseline.soldCount)

    // 重复 PAID（幂等）
    const r2 = await api('PUT', `/market/order/${order.id}/status`, { status: 'PAID' }, buyerToken)
    assert.equal(r2.status, 200); assert.equal(r2.payload.code, 200); assert.equal(r2.payload.msg, '订单状态已更新')
    assert.equal(r2.payload.data.id, order.id); assert.equal(r2.payload.data.status, 'PAID')
    assert.equal(r2.payload.data.orderNo, 'OD116D-B6-01'); assert.equal(r2.payload.data.buyerId, buyer.id); assert.equal(r2.payload.data.sellerId, seller.id); assert.equal(r2.payload.data.productId, b6Product.id)
    assert.equal(r2.payload.data.quantity, 5); assert.equal(r2.payload.data.totalAmount, 50)

    assert.equal((await prisma.order.findUnique({ where: { id: order.id } })).status, 'PAID')
    assert.equal((await prisma.product.findUnique({ where: { id: b6Product.id } })).stock, prodBaseline.stock)
    assert.equal((await prisma.product.findUnique({ where: { id: b6Product.id } })).soldCount, prodBaseline.soldCount)
  })

  it('非法状态 → 400, code=40001, msg=订单状态不合法, data=null, DB 未变', async () => {
    clearRateLimits()
    const b6Product = await prisma.product.create({ data: { sellerId: seller.id, title: 'B6专属产品-02', category: '蔬菜', price: 10, unit: '斤', stock: 200, soldCount: 0, regionCode: '440100456', status: 0, createdAt: new Date('2026-08-08T02:00:00.000Z') } })
    const order = await prisma.order.create({ data: { orderNo: 'OD116D-B6-02', buyerId: buyer.id, sellerId: seller.id, productId: b6Product.id, quantity: 1, totalAmount: 10, status: 'PENDING' } })
    const prodBaseline = await prisma.product.findUnique({ where: { id: b6Product.id } })

    const { status, payload } = await api('PUT', `/market/order/${order.id}/status`, { status: 'BAD' }, buyerToken)
    assert.equal(status, 400); assert.equal(payload.code, 40001); assert.equal(payload.msg, '订单状态不合法'); assert.equal(payload.data, null)

    assert.equal((await prisma.order.findUnique({ where: { id: order.id } })).status, 'PENDING')
    assert.equal((await prisma.product.findUnique({ where: { id: b6Product.id } })).stock, prodBaseline.stock)
    assert.equal((await prisma.product.findUnique({ where: { id: b6Product.id } })).soldCount, prodBaseline.soldCount)
  })

  it('非本人 → 403, code=40301, msg=无权操作该订单, data=null, DB 未变', async () => {
    clearRateLimits()
    const b6Product = await prisma.product.create({ data: { sellerId: seller.id, title: 'B6专属产品-03', category: '蔬菜', price: 10, unit: '斤', stock: 200, soldCount: 0, regionCode: '440100456', status: 0, createdAt: new Date('2026-08-08T03:00:00.000Z') } })
    const order = await prisma.order.create({ data: { orderNo: 'OD116D-B6-03', buyerId: buyer.id, sellerId: seller.id, productId: b6Product.id, quantity: 1, totalAmount: 10, status: 'PENDING' } })
    const prodBaseline = await prisma.product.findUnique({ where: { id: b6Product.id } })

    const { status, payload } = await api('PUT', `/market/order/${order.id}/status`, { status: 'PAID' }, seller2Token)
    assert.equal(status, 403); assert.equal(payload.code, 40301); assert.equal(payload.msg, '无权操作该订单'); assert.equal(payload.data, null)

    assert.equal((await prisma.order.findUnique({ where: { id: order.id } })).status, 'PENDING')
    assert.equal((await prisma.product.findUnique({ where: { id: b6Product.id } })).stock, prodBaseline.stock)
    assert.equal((await prisma.product.findUnique({ where: { id: b6Product.id } })).soldCount, prodBaseline.soldCount)
  })

  it('非法流转 PENDING→DONE → 400, msg=订单状态流转不合法, DB 未变', async () => {
    clearRateLimits()
    const b6Product = await prisma.product.create({ data: { sellerId: seller.id, title: 'B6专属产品-04', category: '蔬菜', price: 10, unit: '斤', stock: 200, soldCount: 0, regionCode: '440100456', status: 0, createdAt: new Date('2026-08-08T04:00:00.000Z') } })
    const order = await prisma.order.create({ data: { orderNo: 'OD116D-B6-04', buyerId: buyer.id, sellerId: seller.id, productId: b6Product.id, quantity: 1, totalAmount: 10, status: 'PENDING' } })

    const { status, payload } = await api('PUT', `/market/order/${order.id}/status`, { status: 'DONE' }, buyerToken)
    assert.equal(status, 400)
    assert.equal(payload.code, 40001)
    assert.equal(payload.msg, '订单状态流转不合法')
    assert.equal(payload.data, null)
    assert.equal((await prisma.order.findUnique({ where: { id: order.id } })).status, 'PENDING')
  })

  it('角色动作收窄：买家不能发货，卖家不能代支付，DB 未变', async () => {
    clearRateLimits()
    const b6Product = await prisma.product.create({ data: { sellerId: seller.id, title: 'B6专属产品-05', category: '蔬菜', price: 10, unit: '斤', stock: 200, soldCount: 0, regionCode: '440100456', status: 0, createdAt: new Date('2026-08-08T05:00:00.000Z') } })
    const paid = await prisma.order.create({ data: { orderNo: 'OD116D-B6-05A', buyerId: buyer.id, sellerId: seller.id, productId: b6Product.id, quantity: 1, totalAmount: 10, status: 'PAID' } })
    const pending = await prisma.order.create({ data: { orderNo: 'OD116D-B6-05B', buyerId: buyer.id, sellerId: seller.id, productId: b6Product.id, quantity: 1, totalAmount: 10, status: 'PENDING' } })

    const buyerShip = await api('PUT', `/market/order/${paid.id}/status`, { status: 'SHIPPED' }, buyerToken)
    assert.equal(buyerShip.status, 403)
    assert.equal(buyerShip.payload.code, 40301)
    assert.equal(buyerShip.payload.msg, '无权执行该订单状态变更')
    assert.equal((await prisma.order.findUnique({ where: { id: paid.id } })).status, 'PAID')

    const sellerPay = await api('PUT', `/market/order/${pending.id}/status`, { status: 'PAID' }, sellerToken)
    assert.equal(sellerPay.status, 403)
    assert.equal(sellerPay.payload.code, 40301)
    assert.equal(sellerPay.payload.msg, '无权执行该订单状态变更')
    assert.equal((await prisma.order.findUnique({ where: { id: pending.id } })).status, 'PENDING')
  })

  it('卖家发货后买家确认完成，DONE 终态不得回退', async () => {
    clearRateLimits()
    const b6Product = await prisma.product.create({ data: { sellerId: seller.id, title: 'B6专属产品-06', category: '蔬菜', price: 10, unit: '斤', stock: 200, soldCount: 0, regionCode: '440100456', status: 0, createdAt: new Date('2026-08-08T06:00:00.000Z') } })
    const order = await prisma.order.create({ data: { orderNo: 'OD116D-B6-06', buyerId: buyer.id, sellerId: seller.id, productId: b6Product.id, quantity: 1, totalAmount: 10, status: 'PAID' } })

    const shipped = await api('PUT', `/market/order/${order.id}/status`, { status: 'SHIPPED' }, sellerToken)
    assert.equal(shipped.status, 200)
    assert.equal(shipped.payload.data.status, 'SHIPPED')
    assert.ok(shipped.payload.data.logisticsNo)

    const done = await api('PUT', `/market/order/${order.id}/status`, { status: 'DONE' }, buyerToken)
    assert.equal(done.status, 200)
    assert.equal(done.payload.data.status, 'DONE')

    const rollback = await api('PUT', `/market/order/${order.id}/status`, { status: 'PAID' }, buyerToken)
    assert.equal(rollback.status, 400)
    assert.equal(rollback.payload.msg, '订单状态流转不合法')
    assert.equal((await prisma.order.findUnique({ where: { id: order.id } })).status, 'DONE')
  })
})
