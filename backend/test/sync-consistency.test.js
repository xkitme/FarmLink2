// 116g-A sync-consistency: 数据同步一致性规则（sync.policy + sync.controller 接入）
// 覆盖：replay 表白名单 / 非法表拒绝 / localUuid 幂等 / userId/regionCode 服务端所有权强制。
import { closeSync, mkdtempSync, openSync, rmSync } from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'

// ── 精确路径守卫 ──
const backendRoot = path.resolve(import.meta.dirname, '..')
const prismaDir = path.resolve(backendRoot, 'prisma')
const testRoot = mkdtempSync(path.join(prismaDir, '.test-116g-sync-'))
const testBase = path.basename(testRoot)
const expectedPrefix = '.test-116g-sync-'
const dbFile = path.join(testRoot, 'sync.db')
const expectedDbUrl = `file:./${testBase}/sync.db`

assert.equal(path.dirname(path.resolve(testRoot)), prismaDir, 'testRoot 父目录必须是 backend/prisma')
assert.ok(testBase.startsWith(expectedPrefix) && testBase.length > expectedPrefix.length, `testRoot basename 必须以 ${expectedPrefix} 开头`)
assert.equal(path.resolve(dbFile), dbFile, 'dbFile 必须已解析')
assert.ok(path.resolve(dbFile).startsWith(path.resolve(testRoot) + path.sep), 'dbFile 必须在 testRoot 内')

closeSync(openSync(dbFile, 'w'))
process.env.DATABASE_URL = expectedDbUrl
process.env.APP_ENV = 'dev'
assert.equal(process.env.DATABASE_URL, expectedDbUrl, 'DATABASE_URL 必须精确等于 expectedDbUrl')

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
const NATIVE_HEADERS = { 'User-Agent': 'capacitor://localhost', 'X-Device-Name': '116g-sync-test' }
let server, baseUrl
let farmer, farmerB
let farmerToken

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
  farmer = await prisma.user.create({ data: { username: '116g-sync-farmer', nickname: '同步农户', passwordHash: hash, phone: '13901117001', role: 'FARMER', regionCode: '440100123', status: 1 } })
  farmerB = await prisma.user.create({ data: { username: '116g-sync-farmer-b', nickname: '同步农户B', passwordHash: hash, phone: '13901117002', role: 'FARMER', regionCode: '440100456', status: 1 } })
  ;[{ token: farmerToken }] = [await issueSession(farmer, { deviceName: '116g-sync-test' })]

  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => { await cleanup() })

// ═══════════════ S1 白名单表回放 + 所有权强制 ═══════════════
describe('S1 POST /data/sync — replay 表白名单回放与 userId/regionCode 强制', () => {
  it('land_plot 白名单回放 → 200/code=200，DB 归属当前用户（伪造 userId/regionCode 被忽略）', async () => {
    clearRateLimits()
    const localUuid = 'sync-land-' + Date.now()
    const body = {
      items: [
        {
          tableName: 'land_plot',
          operation: 'INSERT',
          localUuid,
          // 普通用户伪造归属字段：必须被服务端所有权覆盖
          userId: farmerB.id,
          regionCode: '999999999',
          payload: {
            plotName: '伪造归属测试地块',
            areaMu: 3.5,
            cropType: '水稻',
            regionCode: '888888888',
            updatedAt: new Date().toISOString(),
          },
        },
      ],
    }
    const { status, payload } = await api('POST', '/data/sync', body, farmerToken)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.equal(payload.data.success, 1)
    assert.equal(payload.data.failed, 0)

    const plot = await prisma.landPlot.findFirst({ where: { localUuid } })
    assert.ok(plot, '回放后地块必须落库')
    assert.equal(plot.userId, farmer.id, 'userId 必须为服务端会话用户，伪造无效')
    assert.equal(plot.regionCode, '440100123', 'regionCode 必须为服务端会话值，伪造无效')
    assert.equal(plot.plotName, '伪造归属测试地块')
  })

  it('farm_record 白名单回放成功且归属当前用户', async () => {
    clearRateLimits()
    const localUuid = 'sync-record-' + Date.now()
    const { status, payload } = await api('POST', '/data/sync', {
      items: [{ tableName: 'farm_record', operation: 'INSERT', localUuid, userId: farmerB.id, payload: { recordType: '施肥', content: '一致性农事', recordDate: '2026-09-01T08:00:00.000Z' } }],
    }, farmerToken)
    assert.equal(status, 200)
    assert.equal(payload.data.success, 1)
    const rec = await prisma.farmRecord.findFirst({ where: { localUuid } })
    assert.ok(rec)
    assert.equal(rec.userId, farmer.id, '伪造 userId 无效')
    assert.equal(rec.recordType, '施肥')
  })
})

// ═══════════════ S2 非法表拒绝 ═══════════════
describe('S2 非法表名 / 非白名单表拒绝（不再静默成功）', () => {
  it('白名单外表（order）→ 整体 200 但该项 FAILED，业务表零写入', async () => {
    clearRateLimits()
    const beforeLog = await prisma.syncLog.count()
    const { status, payload } = await api('POST', '/data/sync', {
      items: [{ tableName: 'order', operation: 'INSERT', localUuid: 'sync-order-1', payload: { totalAmount: 9 } }],
    }, farmerToken)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.equal(payload.data.failed, 1)
    assert.equal(payload.data.success, 0)
    assert.match(payload.data.results[0].detail, /非法同步表/)
    const afterLog = await prisma.syncLog.count()
    assert.equal(afterLog, beforeLog + 1, '拒绝项仍应记 syncLog（FAILED 可审计）')
    assert.equal((await prisma.syncLog.findFirst({ orderBy: { id: 'desc' } })).syncStatus, 'FAILED')
  })

  it('注入式危险表名 → 该项 FAILED，明确拒绝', async () => {
    clearRateLimits()
    const { status, payload } = await api('POST', '/data/sync', {
      items: [{ tableName: 'land_plot; DROP TABLE t_user', operation: 'INSERT', localUuid: 'sync-xss-1', payload: {} }],
    }, farmerToken)
    assert.equal(status, 200)
    assert.equal(payload.data.failed, 1)
    assert.match(payload.data.results[0].detail, /非法同步表/)
  })

  it('空表名 → 该项 FAILED', async () => {
    clearRateLimits()
    const { status, payload } = await api('POST', '/data/sync', {
      items: [{ tableName: '', operation: 'INSERT', localUuid: 'sync-empty-1', payload: {} }],
    }, farmerToken)
    assert.equal(status, 200)
    assert.equal(payload.data.failed, 1)
  })

  it('空队列 → 400/code=40001/msg=同步队列不能为空', async () => {
    clearRateLimits()
    const { status, payload } = await api('POST', '/data/sync', { items: [] }, farmerToken)
    assert.equal(status, 400)
    assert.equal(payload.code, 40001)
    assert.equal(payload.msg, '同步队列不能为空')
  })

  it('未登录 → 401（路由 requireAuth 不变）', async () => {
    const { status, payload } = await api('POST', '/data/sync', { items: [] })
    assert.equal(status, 401)
    assert.equal(payload.code, 40101)
  })
})

// ═══════════════ S3 localUuid 幂等 ═══════════════
describe('S3 localUuid 幂等（重复回放不产生重复业务记录）', () => {
  it('同一 localUuid 重复同步 → 业务表仅 1 条（更新而非新增）', async () => {
    clearRateLimits()
    const localUuid = 'sync-idem-' + Date.now()
    const first = await api('POST', '/data/sync', {
      items: [{ tableName: 'land_plot', operation: 'INSERT', localUuid, payload: { plotName: '幂等地块', areaMu: 1, updatedAt: new Date().toISOString() } }],
    }, farmerToken)
    assert.equal(first.payload.data.success, 1)
    assert.equal(await prisma.landPlot.count({ where: { localUuid } }), 1)

    // 同 localUuid 修改重放：更新而非重复创建
    const second = await api('POST', '/data/sync', {
      items: [{ tableName: 'land_plot', operation: 'UPDATE', localUuid, payload: { plotName: '幂等地块-改名', areaMu: 2, updatedAt: new Date(Date.now() + 5000).toISOString() } }],
    }, farmerToken)
    assert.equal(second.payload.data.success, 1)
    assert.equal(await prisma.landPlot.count({ where: { localUuid } }), 1, '同 localUuid 不得重复建地块')
    const plot = await prisma.landPlot.findFirst({ where: { localUuid } })
    assert.equal(plot.plotName, '幂等地块-改名', '更新回放应覆盖字段')
    assert.equal(plot.areaMu, 2)
  })

  it('DELETE + localUuid 删除仅删本人记录（跨用户 localUuid 不可互删）', async () => {
    clearRateLimits()
    const localUuid = 'sync-del-' + Date.now()
    const ins = await api('POST', '/data/sync', {
      items: [{ tableName: 'land_plot', operation: 'INSERT', localUuid, payload: { plotName: '待删地块', areaMu: 1, updatedAt: new Date().toISOString() } }],
    }, farmerToken)
    assert.equal(ins.payload.data.success, 1)
    assert.equal(await prisma.landPlot.count({ where: { localUuid } }), 1)

    // 另一用户尝试 DELETE 同 localUuid：只按本人 userId 删除 → 目标记录仍在
    const bSession = await issueSession(farmerB, { deviceName: '116g-sync-test' })
    const del = await api('POST', '/data/sync', {
      items: [{ tableName: 'land_plot', operation: 'DELETE', localUuid, payload: {} }],
    }, bSession.token)
    assert.equal(del.payload.data.success, 1)
    assert.equal(await prisma.landPlot.count({ where: { localUuid } }), 1, '跨用户 DELETE 不得删除他人记录')

    // 本人删除生效
    const delMine = await api('POST', '/data/sync', {
      items: [{ tableName: 'land_plot', operation: 'DELETE', localUuid, payload: {} }],
    }, farmerToken)
    assert.equal(delMine.payload.data.success, 1)
    assert.equal(await prisma.landPlot.count({ where: { localUuid } }), 0, '本人 DELETE 应删除记录')
  })
})

// ═══════════════ S4 status/logs 隔离 ═══════════════
describe('S4 同步状态/日志的用户隔离', () => {
  it('普通用户 status 只见本人日志（不含其他用户）', async () => {
    clearRateLimits()
    await api('POST', '/data/sync', {
      items: [{ tableName: 'land_plot', operation: 'INSERT', localUuid: 'sync-iso-' + Date.now(), payload: { plotName: '隔离地块', updatedAt: new Date().toISOString() } }],
    }, farmerToken)
    const bSession = await issueSession(farmerB, { deviceName: '116g-sync-test' })
    const { payload } = await api('GET', '/data/sync/status', null, bSession.token)
    assert.equal(payload.code, 200)
    // farmerB 的日志来自 S3 跨用户 DELETE 尝试（其本人一条 FAILED/SUCCESS 日志）：
    // 断言全部日志均归属 farmerB，绝不包含 farmer 的 sync-iso 条目
    assert.ok(payload.data.total >= 0)
    for (const row of payload.data.latest) assert.equal(row.userId, farmerB.id, 'status 不得泄露他人日志')
    const farmerLog = await prisma.syncLog.findFirst({ where: { userId: farmer.id, localUuid: { startsWith: 'sync-iso-' } } })
    assert.ok(farmerLog, 'farmer 的日志应存在（正向对照）')
    const leaked = payload.data.latest.some((row) => row.localUuid && row.localUuid.startsWith('sync-iso-'))
    assert.equal(leaked, false, 'farmer 的日志不得出现在 farmerB 的 status 中')
  })
})
