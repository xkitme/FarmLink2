// 116d characterization: 角色数据隔离（B10–B13）
// B10 ADMIN dashboard · B11 VILLAGE dashboard · B12 FARMER statistics · B13 FARMER updateStatus
import { closeSync, mkdtempSync, openSync, rmSync } from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'

// ── 精确路径守卫 ──
const backendRoot = path.resolve(import.meta.dirname, '..')
const prismaDir = path.resolve(backendRoot, 'prisma')
const testRoot = mkdtempSync(path.join(prismaDir, '.test-116d-data-'))
const testBase = path.basename(testRoot)
const expectedPrefix = '.test-116d-data-'
const dbFile = path.join(testRoot, 'data.db')
const expectedDbUrl = `file:./${testBase}/data.db`

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
const NATIVE_HEADERS = { 'User-Agent': 'capacitor://localhost', 'X-Device-Name': '116d-data-test' }
let server, baseUrl
let adminUser, villageUser, farmerA, farmerB
let adminToken, villageToken, farmerAToken, farmerBToken
let plotA1, plotA2, plotV, plotB, prodA, prodV, srA1, srA2, srB

async function api(method, pathName, body, token) {
  const headers = { ...NATIVE_HEADERS }
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`
  const resp = await fetch(`${baseUrl}/api/v1${pathName}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  })
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
  adminUser = await prisma.user.create({ data: { username: '116d-admin', nickname: '管理员', passwordHash: hash, phone: '13900201160', role: 'ADMIN', regionCode: null, status: 1 } })
  villageUser = await prisma.user.create({ data: { username: '116d-village', nickname: '村委', passwordHash: hash, phone: '13900201161', role: 'VILLAGE', regionCode: '440100123456', villageName: '测试村', status: 1 } })
  farmerA = await prisma.user.create({ data: { username: '116d-farmer-a', nickname: '农户A', passwordHash: hash, phone: '13900201162', role: 'FARMER', regionCode: '440100123001', status: 1 } })
  farmerB = await prisma.user.create({ data: { username: '116d-farmer-b', nickname: '农户B', passwordHash: hash, phone: '13900201163', role: 'FARMER', regionCode: '440100789001', status: 1 } })
  ;[{ token: adminToken }, { token: villageToken }, { token: farmerAToken }, { token: farmerBToken }] = await Promise.all([
    issueSession(adminUser, { deviceName: '116d-data-test' }),
    issueSession(villageUser, { deviceName: '116d-data-test' }),
    issueSession(farmerA, { deviceName: '116d-data-test' }),
    issueSession(farmerB, { deviceName: '116d-data-test' }),
  ])

  // 地块
  plotA1 = await prisma.landPlot.create({ data: { userId: farmerA.id, plotName: 'A的田1', areaMu: 10, cropType: '水稻', regionCode: '440100123001' } })
  plotA2 = await prisma.landPlot.create({ data: { userId: farmerA.id, plotName: 'A的田2', areaMu: 5, cropType: '玉米', regionCode: '440100123002' } })
  plotV = await prisma.landPlot.create({ data: { userId: villageUser.id, plotName: '村委地块', areaMu: 8, cropType: '蔬菜', regionCode: '440100123456' } })
  plotB = await prisma.landPlot.create({ data: { userId: farmerB.id, plotName: 'B的田', areaMu: 3, cropType: '水稻', regionCode: '440100789001' } })

  // 商品
  prodA = await prisma.product.create({ data: { sellerId: farmerA.id, title: 'A的玉米', category: '蔬菜', price: 5, unit: '斤', stock: 100, regionCode: '440100123001', status: 1 } })
  prodV = await prisma.product.create({ data: { sellerId: villageUser.id, title: '村委红薯', category: '蔬菜', price: 3, unit: '斤', stock: 50, regionCode: '440100123456', status: 1 } })

  // 订单
  await prisma.order.create({ data: { orderNo: 'OD116D-DATA-01', buyerId: farmerA.id, sellerId: farmerB.id, productId: prodA.id, quantity: 2, totalAmount: 10, status: 'PAID' } })
  await prisma.order.create({ data: { orderNo: 'OD116D-DATA-02', buyerId: farmerB.id, sellerId: farmerA.id, productId: prodV.id, quantity: 1, totalAmount: 3, status: 'PENDING' } })

  // 统计上报：固定 createdAt 保证 latestStatReports 确定性
  srA1 = await prisma.statReport.create({ data: { reporterId: farmerA.id, regionCode: '440100123001', statType: '产量', year: 2026, period: 'Q1', dataJson: '{"cropType":"水稻","yieldKg":5000,"areaMu":10}', status: 'SUBMITTED', createdAt: new Date('2026-08-01T00:00:00.000Z') } })
  srA2 = await prisma.statReport.create({ data: { reporterId: farmerA.id, regionCode: '440100123001', statType: '面积', year: 2026, period: 'Q2', dataJson: '{"cropType":"玉米","areaMu":5}', status: 'DRAFT', createdAt: new Date('2026-08-01T00:00:01.000Z') } })
  srB = await prisma.statReport.create({ data: { reporterId: farmerB.id, regionCode: '440100789001', statType: '产量', year: 2026, period: 'Q1', dataJson: '{"cropType":"水稻","yieldKg":3000,"areaMu":3}', status: 'SUBMITTED', createdAt: new Date('2026-08-01T00:00:02.000Z') } })

  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => { await cleanup() })

// ═══════════════ B10: ADMIN dashboard ═══════════════
describe('B10 GET /data/dashboard (ADMIN)', () => {
  const SVC = { dataSource: '平台业务数据', mode: '运行中', message: '数据已更新' }

  it('ADMIN ?year=2026 → 200, code=200, msg=success, 完整 cards+platformStats+latestStatReports 精确', async () => {
    clearRateLimits()
    const { status, payload } = await api('GET', '/data/dashboard?year=2026', null, adminToken)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.equal(payload.msg, 'success')

    // payload.data 键集合
    assert.deepEqual(Object.keys(payload.data).sort(), [
      'cards', 'cropArea', 'disasterStats', 'farmRecordTypes',
      'latestStatReports', 'latestSyncLogs', 'platformStats',
      'serviceStatus', 'upcomingPolicyDeadline', 'year',
    ])
    assert.equal(payload.data.year, 2026)

    // cards 整对象精确
    assert.deepEqual(payload.data.cards, {
      userCount: 4, plotCount: 4, totalAreaMu: 26, recordCount: 0,
      totalCost: 0, productCount: 2, orderCount: 2, orderAmount: 13,
      disasterCount: 0, disasterLoss: 0, policyCount: 0, aiCallCount: 0,
    })

    // platformStats 整对象精确
    assert.deepEqual(payload.data.platformStats, {
      farmerCount: 4, totalAreaMu: 26, cropTypeCount: 3,
      aiServiceCount: 0, orderCount: 2,
    })

    // cropArea 精确
    assert.deepEqual(payload.data.cropArea, [
      { cropType: '水稻', areaMu: 13, plots: 2 },
      { cropType: '蔬菜', areaMu: 8, plots: 1 },
      { cropType: '玉米', areaMu: 5, plots: 1 },
    ])

    // 空数组
    assert.deepEqual(payload.data.farmRecordTypes, [])
    assert.deepEqual(payload.data.disasterStats, [])
    assert.deepEqual(payload.data.latestSyncLogs, [])

    // latestStatReports IDs 降序：srB(latest) → srA2 → srA1
    const lsr = payload.data.latestStatReports
    assert.equal(lsr.length, 3)
    assert.deepEqual(lsr.map((r) => r.id), [srB.id, srA2.id, srA1.id])
    assert.equal(lsr[0].reporterId, farmerB.id)
    assert.equal(lsr[1].reporterId, farmerA.id)
    assert.equal(lsr[2].reporterId, farmerA.id)

    assert.equal(payload.data.upcomingPolicyDeadline, null)
    assert.deepEqual(payload.data.serviceStatus, SVC)
  })

  it('ADMIN ?year=2026&regionCode=440100123001 → HTTP/code/msg 精确, cards 整对象, srB 不在 latestStatReports', async () => {
    clearRateLimits()
    const { status, payload } = await api('GET', '/data/dashboard?year=2026&regionCode=440100123001', null, adminToken)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.equal(payload.msg, 'success')

    // cards 整对象（regionCode 过滤仅影响 plot/product/disaster/statReport；user/order/policy 全局）
    assert.deepEqual(payload.data.cards, {
      userCount: 4, plotCount: 1, totalAreaMu: 10, recordCount: 0,
      totalCost: 0, productCount: 1, orderCount: 2, orderAmount: 13,
      disasterCount: 0, disasterLoss: 0, policyCount: 0, aiCallCount: 0,
    })

    // platformStats 仍全局精确
    assert.deepEqual(payload.data.platformStats, {
      farmerCount: 4, totalAreaMu: 26, cropTypeCount: 3,
      aiServiceCount: 0, orderCount: 2,
    })

    // cropArea 仅水稻10/1
    assert.deepEqual(payload.data.cropArea, [
      { cropType: '水稻', areaMu: 10, plots: 1 },
    ])

    // latestStatReports 仅 srA2, srA1（不含 srB）
    const lsr = payload.data.latestStatReports
    assert.equal(lsr.length, 2)
    assert.deepEqual(lsr.map((r) => r.id), [srA2.id, srA1.id])
    assert.equal(lsr[0].reporterId, farmerA.id)
    assert.equal(lsr[1].reporterId, farmerA.id)
    // 显式不含 srB
    assert.ok(!lsr.some((r) => r.id === srB.id), 'srB 不应出现在 regionCode=440100123001 的 latestStatReports')
  })

  it('无 token → 401, code=40101, msg=未登录或登录已失效, data=null', async () => {
    const { status, payload } = await api('GET', '/data/dashboard?year=2026')
    assert.equal(status, 401)
    assert.equal(payload.code, 40101)
    assert.equal(payload.msg, '未登录或登录已失效')
    assert.equal(payload.data, null)
  })
})

// ═══════════════ B11: VILLAGE dashboard ═══════════════
describe('B11 GET /data/dashboard + /data/statistics (VILLAGE)', () => {
  const SVC = { dataSource: '平台业务数据', mode: '运行中', message: '数据已更新' }

  it('VILLAGE ?year=2026 → 200/code=200/msg=success, 完整 cards+platformStats=null+cropArea 精确, srB 不在 latestStatReports', async () => {
    clearRateLimits()
    const { status, payload } = await api('GET', '/data/dashboard?year=2026', null, villageToken)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.equal(payload.msg, 'success')

    // payload.data 键集合（与 B10 ADMIN 相同 10 键）
    assert.deepEqual(Object.keys(payload.data).sort(), [
      'cards', 'cropArea', 'disasterStats', 'farmRecordTypes',
      'latestStatReports', 'latestSyncLogs', 'platformStats',
      'serviceStatus', 'upcomingPolicyDeadline', 'year',
    ])
    assert.equal(payload.data.year, 2026)

    // cards 整对象（VILLAGE region startsWith '440100123' → 3 plots 23亩）
    assert.deepEqual(payload.data.cards, {
      userCount: 4, plotCount: 3, totalAreaMu: 23, recordCount: 0,
      totalCost: 0, productCount: 2, orderCount: 2, orderAmount: 13,
      disasterCount: 0, disasterLoss: 0, policyCount: 0, aiCallCount: 0,
    })

    assert.equal(payload.data.platformStats, null)

    // cropArea 精确
    assert.deepEqual(payload.data.cropArea, [
      { cropType: '水稻', areaMu: 10, plots: 1 },
      { cropType: '蔬菜', areaMu: 8, plots: 1 },
      { cropType: '玉米', areaMu: 5, plots: 1 },
    ])

    // latestStatReports IDs [srA2, srA1]，不含 srB
    const lsr = payload.data.latestStatReports
    assert.equal(lsr.length, 2)
    assert.deepEqual(lsr.map((r) => r.id), [srA2.id, srA1.id])
    assert.ok(!lsr.some((r) => r.id === srB.id))

    assert.deepEqual(payload.data.farmRecordTypes, [])
    assert.deepEqual(payload.data.disasterStats, [])
    assert.deepEqual(payload.data.latestSyncLogs, [])
    assert.equal(payload.data.upcomingPolicyDeadline, null)
    assert.deepEqual(payload.data.serviceStatus, SVC)
  })

  it('VILLAGE 显式传 ?regionCode=440100789001 → 仍忽略外部参数，结果同无参数', async () => {
    clearRateLimits()
    const { status, payload } = await api('GET', '/data/dashboard?year=2026&regionCode=440100789001', null, villageToken)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.equal(payload.msg, 'success')

    // cards 与之前完全一致（外部 region 被忽略）
    assert.deepEqual(payload.data.cards, {
      userCount: 4, plotCount: 3, totalAreaMu: 23, recordCount: 0,
      totalCost: 0, productCount: 2, orderCount: 2, orderAmount: 13,
      disasterCount: 0, disasterLoss: 0, policyCount: 0, aiCallCount: 0,
    })
    assert.equal(payload.data.platformStats, null)

    assert.deepEqual(payload.data.cropArea, [
      { cropType: '水稻', areaMu: 10, plots: 1 },
      { cropType: '蔬菜', areaMu: 8, plots: 1 },
      { cropType: '玉米', areaMu: 5, plots: 1 },
    ])

    const lsr = payload.data.latestStatReports
    assert.equal(lsr.length, 2)
    assert.deepEqual(lsr.map((r) => r.id), [srA2.id, srA1.id])
    assert.ok(!lsr.some((r) => r.id === srB.id))
  })

  it('VILLAGE /data/statistics?regionCode=440100789001 → 外部 region 被忽略, total=2, IDs [srA2,srA1], 全字段精确, 不含 srB', async () => {
    clearRateLimits()
    const { status, payload } = await api('GET', '/data/statistics?pageNum=1&pageSize=10&regionCode=440100789001', null, villageToken)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.equal(payload.msg, 'success')

    assert.deepEqual(Object.keys(payload.data).sort(), ['pageNum', 'pageSize', 'pages', 'records', 'total'])
    const { records, total, pageNum, pageSize, pages } = payload.data
    assert.equal(total, 2)
    assert.equal(pageNum, 1)
    assert.equal(pageSize, 10)
    assert.equal(pages, 1)
    assert.equal(records.length, 2)

    // createdAt desc: srA2 → srA1
    assert.deepEqual(records.map((r) => r.id), [srA2.id, srA1.id])

    // srA2 全字段（normalizeReport 仅展开 dataJson，无 cropType/areaMu/yieldKg）
    const r2 = records.find((r) => r.id === srA2.id)
    assert.equal(r2.id, srA2.id)
    assert.deepEqual(Object.keys(r2).sort(), ['createdAt', 'dataJson', 'id', 'period', 'regionCode', 'reporterId', 'statType', 'status', 'year'])
    assert.equal(r2.regionCode, '440100123001')
    assert.equal(r2.reporterId, farmerA.id)
    assert.equal(r2.statType, '面积')
    assert.equal(r2.year, 2026)
    assert.equal(r2.period, 'Q2')
    assert.deepEqual(r2.dataJson, { cropType: '玉米', areaMu: 5 })
    assert.equal(r2.status, 'DRAFT')
    assert.equal(new Date(r2.createdAt).toISOString(), '2026-08-01T00:00:01.000Z')

    // srA1 全字段
    const r1 = records.find((r) => r.id === srA1.id)
    assert.equal(r1.id, srA1.id)
    assert.deepEqual(Object.keys(r1).sort(), ['createdAt', 'dataJson', 'id', 'period', 'regionCode', 'reporterId', 'statType', 'status', 'year'])
    assert.equal(r1.regionCode, '440100123001')
    assert.equal(r1.reporterId, farmerA.id)
    assert.equal(r1.statType, '产量')
    assert.equal(r1.year, 2026)
    assert.equal(r1.period, 'Q1')
    assert.deepEqual(r1.dataJson, { cropType: '水稻', yieldKg: 5000, areaMu: 10 })
    assert.equal(r1.status, 'SUBMITTED')
    assert.equal(new Date(r1.createdAt).toISOString(), '2026-08-01T00:00:00.000Z')

    // 显式不含 srB / farmerB
    assert.ok(!records.some((r) => r.id === srB.id), 'srB 不应在 VILLAGE 统计结果')
    assert.ok(!records.some((r) => r.reporterId === farmerB.id), 'farmerB 的记录不应可见')
  })
})

// ═══════════════ B12: FARMER statistics ═══════════════
describe('B12 GET /data/statistics (FARMER)', () => {
  it('FARMER A → 200/code=200/msg=success, 分页精确, IDs [srA2,srA1], 全字段精确, 不含 srB', async () => {
    clearRateLimits()
    const { status, payload } = await api('GET', '/data/statistics?pageNum=1&pageSize=10', null, farmerAToken)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.equal(payload.msg, 'success')

    assert.deepEqual(Object.keys(payload.data).sort(), ['pageNum', 'pageSize', 'pages', 'records', 'total'])
    const { records, total, pageNum, pageSize, pages } = payload.data
    assert.equal(total, 2)
    assert.equal(pageNum, 1)
    assert.equal(pageSize, 10)
    assert.equal(pages, 1)
    assert.equal(records.length, 2)

    // createdAt desc: srA2 → srA1
    assert.deepEqual(records.map((r) => r.id), [srA2.id, srA1.id])

    // srA2 全字段（normalizeReport 仅展开 dataJson）
    const r2 = records.find((r) => r.id === srA2.id)
    assert.equal(r2.id, srA2.id)
    assert.deepEqual(Object.keys(r2).sort(), ['createdAt', 'dataJson', 'id', 'period', 'regionCode', 'reporterId', 'statType', 'status', 'year'])
    assert.equal(r2.regionCode, '440100123001')
    assert.equal(r2.reporterId, farmerA.id)
    assert.equal(r2.statType, '面积')
    assert.equal(r2.year, 2026)
    assert.equal(r2.period, 'Q2')
    assert.deepEqual(r2.dataJson, { cropType: '玉米', areaMu: 5 })
    assert.equal(r2.status, 'DRAFT')
    assert.equal(new Date(r2.createdAt).toISOString(), '2026-08-01T00:00:01.000Z')

    // srA1 全字段
    const r1 = records.find((r) => r.id === srA1.id)
    assert.equal(r1.id, srA1.id)
    assert.deepEqual(Object.keys(r1).sort(), ['createdAt', 'dataJson', 'id', 'period', 'regionCode', 'reporterId', 'statType', 'status', 'year'])
    assert.equal(r1.regionCode, '440100123001')
    assert.equal(r1.reporterId, farmerA.id)
    assert.equal(r1.statType, '产量')
    assert.equal(r1.year, 2026)
    assert.equal(r1.period, 'Q1')
    assert.deepEqual(r1.dataJson, { cropType: '水稻', yieldKg: 5000, areaMu: 10 })
    assert.equal(r1.status, 'SUBMITTED')
    assert.equal(new Date(r1.createdAt).toISOString(), '2026-08-01T00:00:00.000Z')

    // 显式不含 srB / farmerB
    assert.ok(!records.some((r) => r.id === srB.id), 'srB 不应在 FARMER A 统计结果')
    assert.ok(!records.some((r) => r.reporterId === farmerB.id), 'farmerB 的记录不应可见')
  })

  it('无 token → 401, code=40101, msg=未登录或登录已失效, data=null', async () => {
    const { status, payload } = await api('GET', '/data/statistics')
    assert.equal(status, 401)
    assert.equal(payload.code, 40101)
    assert.equal(payload.msg, '未登录或登录已失效')
    assert.equal(payload.data, null)
  })
})

// ═══════════════ B13: FARMER updateStatus ═══════════════
describe('B13 PUT /data/statistics/:id/status (非 VILLAGE/ADMIN 拒绝)', () => {
  it('FARMER A 更新 srA1 → 403, code=40301, msg=仅村委或管理员可确认统计数据, data=null, DB 严格未变', async () => {
    clearRateLimits()
    const dbBefore = await prisma.statReport.findUnique({ where: { id: srA1.id } })
    const { status, payload } = await api('PUT', `/data/statistics/${srA1.id}/status`, { status: 'CONFIRMED' }, farmerAToken)
    assert.equal(status, 403)
    assert.equal(payload.code, 40301)
    assert.equal(payload.msg, '仅村委或管理员可确认统计数据')
    assert.equal(payload.data, null)
    const dbAfter = await prisma.statReport.findUnique({ where: { id: srA1.id } })
    assert.deepEqual(dbAfter, dbBefore, 'FARMER 无权更新，DB 行须完全未变')
  })

  it('ADMIN 更新不存在 ID → 404, code=40401, msg=统计记录不存在, data=null, 三 fixture 状态未变', async () => {
    clearRateLimits()
    const maxId = (await prisma.statReport.aggregate({ _max: { id: true } }))._max.id || 0
    const ghostId = maxId + 1000

    // 记录三 fixture 状态
    const db1Before = await prisma.statReport.findUnique({ where: { id: srA1.id } })
    const db2Before = await prisma.statReport.findUnique({ where: { id: srA2.id } })
    const db3Before = await prisma.statReport.findUnique({ where: { id: srB.id } })

    const { status, payload } = await api('PUT', `/data/statistics/${ghostId}/status`, { status: 'CONFIRMED' }, adminToken)
    assert.equal(status, 404)
    assert.equal(payload.code, 40401)
    assert.equal(payload.msg, '统计记录不存在')
    assert.equal(payload.data, null)

    // 总数与三 fixture 状态未变
    assert.equal(await prisma.statReport.count(), 3)
    assert.deepEqual(await prisma.statReport.findUnique({ where: { id: srA1.id } }), db1Before)
    assert.deepEqual(await prisma.statReport.findUnique({ where: { id: srA2.id } }), db2Before)
    assert.deepEqual(await prisma.statReport.findUnique({ where: { id: srB.id } }), db3Before)
  })
})
