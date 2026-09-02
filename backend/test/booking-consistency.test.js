// 116g-A booking-consistency: 农机预约一致性规则（booking.policy + booking.controller 接入）
// 覆盖：预约资源不存在 / 时间冲突拒绝 / 参与者访问边界 / 状态白名单 / DB 终态。
import { closeSync, mkdtempSync, openSync, rmSync } from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'

const backendRoot = path.resolve(import.meta.dirname, '..')
const prismaDir = path.resolve(backendRoot, 'prisma')
const testRoot = mkdtempSync(path.join(prismaDir, '.test-116g-booking-'))
const testBase = path.basename(testRoot)
const expectedPrefix = '.test-116g-booking-'
const dbFile = path.join(testRoot, 'booking.db')
const expectedDbUrl = `file:./${testBase}/booking.db`

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

const NATIVE_HEADERS = { 'User-Agent': 'capacitor://localhost', 'X-Device-Name': '116g-booking-test' }
let server, baseUrl
let owner, renter, outsider
let machine, machineOff

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
  owner = await prisma.user.create({ data: { username: '116g-bk-owner', nickname: '机主', passwordHash: hash, phone: '13901118001', role: 'FARMER', regionCode: '440100123', villageName: '甲村', status: 1 } })
  renter = await prisma.user.create({ data: { username: '116g-bk-renter', nickname: '承租人', passwordHash: hash, phone: '13901118002', role: 'FARMER', regionCode: '440100456', villageName: '乙村', status: 1 } })
  outsider = await prisma.user.create({ data: { username: '116g-bk-other', nickname: '无关人', passwordHash: hash, phone: '13901118003', role: 'FARMER', regionCode: '440100789', villageName: '丙村', status: 1 } })
  machine = await prisma.machinery.create({ data: { ownerId: owner.id, machineName: '一致性收割机', machineType: '收割机', dailyPrice: 500, deposit: 2000, regionCode: '440100123', status: 1 } })
  machineOff = await prisma.machinery.create({ data: { ownerId: owner.id, machineName: '下架拖拉机', machineType: '拖拉机', dailyPrice: 300, deposit: 1000, regionCode: '440100123', status: 0 } })

  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => { await cleanup() })

async function book(machineId, startDate, endDate, user, remark) {
  const session = await issueSession(user, { deviceName: '116g-booking-test' })
  return api('POST', '/machinery/booking', { machineryId: machineId, startDate, endDate, remark: remark || null }, session.token)
}

// ═══════════════ K1 预约资源不存在 ═══════════════
describe('K1 POST /machinery/booking — 资源不存在/不可租', () => {
  it('农机不存在 → 404/code=40401/msg=农机不存在或不可租/data=null', async () => {
    clearRateLimits()
    const { status, payload } = await book(999999, '2026-10-01', '2026-10-03', renter)
    assert.equal(status, 404)
    assert.equal(payload.code, 40401)
    assert.equal(payload.msg, '农机不存在或不可租')
    assert.equal(payload.data, null)
  })

  it('机器已下架（status=0）→ 404/code=40401', async () => {
    clearRateLimits()
    const { status, payload } = await book(machineOff.id, '2026-10-01', '2026-10-03', renter)
    assert.equal(status, 404)
    assert.equal(payload.code, 40401)
  })

  it('缺起止日期 → 400/code=40001/msg=请选择农机与起止日期', async () => {
    clearRateLimits()
    const session = await issueSession(renter, { deviceName: '116g-booking-test' })
    const { status, payload } = await api('POST', '/machinery/booking', { machineryId: machine.id }, session.token)
    assert.equal(status, 400)
    assert.equal(payload.code, 40001)
    assert.equal(payload.msg, '请选择农机与起止日期')
  })

  it('预约自己的农机 → 400/code=40001/msg=不能预约自己的农机', async () => {
    clearRateLimits()
    const { status, payload } = await book(machine.id, '2026-10-01', '2026-10-03', owner)
    assert.equal(status, 400)
    assert.equal(payload.code, 40001)
    assert.equal(payload.msg, '不能预约自己的农机')
  })
})

// ═══════════════ K2 时间冲突 ═══════════════
describe('K2 同机时间冲突拒绝（防一机双约）', () => {
  it('时段重叠（B 完全落在 A 内）→ 400/code=40001/msg=该时段已有预约，DB 无新增', async () => {
    clearRateLimits()
    const r1 = await book(machine.id, '2026-10-01', '2026-10-05', renter)
    assert.equal(r1.status, 200, `首次预约应成功: ${JSON.stringify(r1.payload)}`)
    const beforeCount = await prisma.machineryBooking.count({ where: { machineryId: machine.id } })

    // 另一用户预约重叠时段
    const { status, payload } = await book(machine.id, '2026-10-02', '2026-10-04', outsider)
    assert.equal(status, 400)
    assert.equal(payload.code, 40001)
    assert.equal(payload.msg, '该时段已有预约，请更换时间')
    assert.equal(await prisma.machineryBooking.count({ where: { machineryId: machine.id } }), beforeCount, '冲突预约不得落库')
  })

  it('时段部分重叠（B 晚于 A 开始、早于 A 结束）→ 拒绝', async () => {
    clearRateLimits()
    const r1 = await book(machine.id, '2026-11-01', '2026-11-05', renter)
    assert.equal(r1.status, 200)
    const { status } = await book(machine.id, '2026-11-04', '2026-11-08', outsider)
    assert.equal(status, 400, '部分重叠必须拒绝')
  })

  it('时段不重叠（B 完全在 A 之后）→ 200 成功', async () => {
    clearRateLimits()
    const r1 = await book(machine.id, '2026-12-01', '2026-12-03', renter)
    assert.equal(r1.status, 200)
    const r2 = await book(machine.id, '2026-12-10', '2026-12-12', outsider)
    assert.equal(r2.status, 200)
    assert.equal(r2.payload.code, 200)
    assert.equal(r2.payload.data.machineryId, machine.id)
    assert.equal(r2.payload.data.status, 'PENDING')
  })

  it('已取消（CANCELLED）的旧预约不占期 → 可再约同段', async () => {
    clearRateLimits()
    const cancelled = await prisma.machineryBooking.create({
      data: {
        machineryId: machine.id, renterId: renter.id,
        startDate: new Date('2026-12-20T00:00:00.000Z'), endDate: new Date('2026-12-22T00:00:00.000Z'),
        totalAmount: 1000, status: 'CANCELLED',
      },
    })
    assert.ok(cancelled.id)
    const r2 = await book(machine.id, '2026-12-20', '2026-12-22', outsider)
    assert.equal(r2.status, 200, 'CANCELLED 不占期，应可重约')
  })
})

// ═══════════════ K3 参与者访问边界 ═══════════════
describe('K3 预约跨用户访问边界', () => {
  let booking
  let renterToken, ownerToken, outsiderToken
  before(async () => {
    const r = await book(machine.id, '2027-01-01', '2027-01-03', renter)
    booking = r.payload.data
    ;[{ token: renterToken }, { token: ownerToken }, { token: outsiderToken }] = await Promise.all([
      issueSession(renter, { deviceName: '116g-booking-test' }),
      issueSession(owner, { deviceName: '116g-booking-test' }),
      issueSession(outsider, { deviceName: '116g-booking-test' }),
    ])
  })

  it('机主确认预约 PENDING→CONFIRMED → 200/code=200，DB 终态 CONFIRMED', async () => {
    clearRateLimits()
    const { status, payload } = await api('PUT', `/machinery/booking/${booking.id}/status`, { status: 'CONFIRMED' }, ownerToken)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.equal(payload.data.status, 'CONFIRMED')
    assert.equal((await prisma.machineryBooking.findUnique({ where: { id: booking.id } })).status, 'CONFIRMED')
  })

  it('承租方不能把已确认预约标记完成 → 403/code=40301，DB 未变', async () => {
    clearRateLimits()
    const { status, payload } = await api('PUT', `/machinery/booking/${booking.id}/status`, { status: 'DONE' }, renterToken)
    assert.equal(status, 403)
    assert.equal(payload.code, 40301)
    assert.equal(payload.msg, '无权执行该预约状态变更')
    assert.equal(payload.data, null)
    assert.equal((await prisma.machineryBooking.findUnique({ where: { id: booking.id } })).status, 'CONFIRMED')
  })

  it('机主可把已确认预约标记完成，DONE 终态不得回退', async () => {
    clearRateLimits()
    const done = await api('PUT', `/machinery/booking/${booking.id}/status`, { status: 'DONE' }, ownerToken)
    assert.equal(done.status, 200)
    assert.equal(done.payload.code, 200)
    assert.equal(done.payload.data.status, 'DONE')

    const rollback = await api('PUT', `/machinery/booking/${booking.id}/status`, { status: 'CONFIRMED' }, ownerToken)
    assert.equal(rollback.status, 400)
    assert.equal(rollback.payload.code, 40001)
    assert.equal(rollback.payload.msg, '预约状态流转不合法')
    assert.equal(rollback.payload.data, null)
    assert.equal((await prisma.machineryBooking.findUnique({ where: { id: booking.id } })).status, 'DONE')
  })

  it('无关第三方改状态 → 403/code=40301/msg=无权操作该预约，DB 未变', async () => {
    clearRateLimits()
    const before = (await prisma.machineryBooking.findUnique({ where: { id: booking.id } })).status
    const { status, payload } = await api('PUT', `/machinery/booking/${booking.id}/status`, { status: 'CANCELLED' }, outsiderToken)
    assert.equal(status, 403)
    assert.equal(payload.code, 40301)
    assert.equal(payload.msg, '无权操作该预约')
    assert.equal(payload.data, null)
    assert.equal((await prisma.machineryBooking.findUnique({ where: { id: booking.id } })).status, before, '越权更新不得落库')
  })

  it('非法状态 → 400/code=40001/msg=状态不合法', async () => {
    clearRateLimits()
    const { status, payload } = await api('PUT', `/machinery/booking/${booking.id}/status`, { status: 'BAD' }, renterToken)
    assert.equal(status, 400)
    assert.equal(payload.code, 40001)
    assert.equal(payload.msg, '状态不合法')
    assert.equal(payload.data, null)
  })

  it('非法流转 PENDING→DONE → 400/code=40001/msg=预约状态流转不合法，DB 未变', async () => {
    clearRateLimits()
    const r = await book(machine.id, '2027-02-01', '2027-02-03', renter)
    assert.equal(r.status, 200)
    const pending = r.payload.data
    const { status, payload } = await api('PUT', `/machinery/booking/${pending.id}/status`, { status: 'DONE' }, ownerToken)
    assert.equal(status, 400)
    assert.equal(payload.code, 40001)
    assert.equal(payload.msg, '预约状态流转不合法')
    assert.equal(payload.data, null)
    assert.equal((await prisma.machineryBooking.findUnique({ where: { id: pending.id } })).status, 'PENDING')
  })

  it('不存在的预约 → 404/code=40401/msg=预约不存在', async () => {
    clearRateLimits()
    const { status, payload } = await api('PUT', '/machinery/booking/999999/status', { status: 'DONE' }, renterToken)
    assert.equal(status, 404)
    assert.equal(payload.code, 40401)
    assert.equal(payload.msg, '预约不存在')
  })
})

// ═══════════════ K4 双视角列表隔离 ═══════════════
describe('K4 预约列表视角隔离（renter/owner）', () => {
  it('renter 视角只见本人预约', async () => {
    clearRateLimits()
    const session = await issueSession(renter, { deviceName: '116g-booking-test' })
    const { status, payload } = await api('GET', '/machinery/booking/list?role=renter&pageNum=1&pageSize=20', null, session.token)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.ok(payload.data.total >= 1)
    for (const r of payload.data.records) assert.equal(r.renterId, renter.id, 'renter 视角不得含他人预约')
  })

  it('owner 视角只见本人机器的预约', async () => {
    clearRateLimits()
    const session = await issueSession(owner, { deviceName: '116g-booking-test' })
    const { status, payload } = await api('GET', '/machinery/booking/list?role=owner&pageNum=1&pageSize=20', null, session.token)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    for (const r of payload.data.records) {
      const m = await prisma.machinery.findUnique({ where: { id: r.machineryId } })
      assert.equal(m.ownerId, owner.id, 'owner 视角不得含他人机器预约')
    }
  })
})
