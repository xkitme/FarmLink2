// 116g-A resource-domain-guard: 平台资源域守卫（resource.policy + resource.controller 接入）
// 覆盖：越权资源 key 拒绝 / 未声明与危险字段不可写 / 系统字段不可写 / 字段白名单 / DB 终态。
import { closeSync, mkdtempSync, openSync, rmSync } from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'

const backendRoot = path.resolve(import.meta.dirname, '..')
const prismaDir = path.resolve(backendRoot, 'prisma')
const testRoot = mkdtempSync(path.join(prismaDir, '.test-116g-resource-'))
const testBase = path.basename(testRoot)
const expectedPrefix = '.test-116g-resource-'
const dbFile = path.join(testRoot, 'resource.db')
const expectedDbUrl = `file:./${testBase}/resource.db`

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

const NATIVE_HEADERS = { 'User-Agent': 'capacitor://localhost', 'X-Device-Name': '116g-resource-test' }
let server, baseUrl
let admin
let adminToken

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
  const hash = await bcrypt.hash('admin116g', 4)
  admin = await prisma.user.create({ data: { username: '116g-res-admin', nickname: '资源管理员', passwordHash: hash, phone: '13901119001', role: 'ADMIN', regionCode: '440100', status: 1 } })
  ;[{ token: adminToken }] = [await issueSession(admin, { deviceName: '116g-resource-test' })]

  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => { await cleanup() })

// ═══════════════ R1 越权资源 key ═══════════════
describe('R1 资源 key 白名单（越权资源名拒绝）', () => {
  it('未登记资源 key → 404/code=40401/msg=管理资源不存在/data=null', async () => {
    clearRateLimits()
    const { status, payload } = await api('GET', '/admin/resource/hackResource/config', null, adminToken)
    assert.equal(status, 404)
    assert.equal(payload.code, 40401)
    assert.equal(payload.msg, '管理资源不存在')
    assert.equal(payload.data, null)
  })

  it('已登记资源 key → 200/code=200（正向对照）', async () => {
    clearRateLimits()
    const { status, payload } = await api('GET', '/admin/resource/notification/config', null, adminToken)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.equal(payload.data.key, 'notification')
    assert.ok(Array.isArray(payload.data.fields))
  })

  it('未登录 → 401；普通用户 → 403（角色门禁不变）', async () => {
    clearRateLimits()
    const anon = await api('GET', '/admin/resource/notification/config')
    assert.equal(anon.status, 401)
    const hash = await bcrypt.hash('farmer116g', 4)
    const farmer = await prisma.user.create({ data: { username: '116g-res-farmer', nickname: '普通农户', passwordHash: hash, phone: '13901119002', role: 'FARMER', status: 1 } })
    const fSession = await issueSession(farmer, { deviceName: '116g-resource-test' })
    const farmerReq = await api('GET', '/admin/resource/notification/config', null, fSession.token)
    assert.equal(farmerReq.status, 403)
    assert.equal(farmerReq.payload.code, 40301)
  })
})

// ═══════════════ R2 危险字段 / 未声明字段不可写 ═══════════════
describe('R2 字段级白名单：危险字段与未声明字段不可写入', () => {
  it('创建 product 时携带 passwordHash/evilField/系统字段 → 均被丢弃，DB 终态干净', async () => {
    clearRateLimits()
    const { status, payload } = await api('POST', '/admin/resource/product', {
      sellerId: admin.id,
      title: '域守卫商品',
      category: '蔬菜',
      price: 3.5,
      unit: '斤',
      status: 1,
      // 危险/未声明/系统字段：一律不得写入
      passwordHash: 'hacked-hash',
      evilField: 'x',
      id: 424242,
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
      lastLoginAt: '2020-01-01T00:00:00.000Z',
    }, adminToken)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    const created = await prisma.product.findUnique({ where: { id: payload.data.id } })
    assert.ok(created)
    assert.notEqual(created.id, 424242, 'id 必须由 DB 自增，客户端伪造 id 无效')
    assert.equal(created.title, '域守卫商品')
    assert.equal(created.sellerId, admin.id)
    assert.equal('passwordHash' in created, false, 'passwordHash 未声明字段不可写（product 模型无此列）')
    assert.equal(created.category, '蔬菜')
    assert.notEqual(created.createdAt.toISOString().slice(0, 10), '2020-01-01', 'createdAt 系统字段不可写')
  })

  it('创建 user 时提交 passwordHash → 服务端以 bcrypt 重新生成（明文 hash 无效）', async () => {
    clearRateLimits()
    const { status, payload } = await api('POST', '/admin/resource/user', {
      username: '116g-res-user-' + Date.now(),
      nickname: '被管理用户',
      password: 'RealPwd!234',
      passwordHash: 'attacker-controlled-hash',
      createdAt: '2020-01-01T00:00:00.000Z',
    }, adminToken)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    const created = await prisma.user.findUnique({ where: { id: payload.data.id } })
    assert.ok(created)
    assert.notEqual(created.passwordHash, 'attacker-controlled-hash', 'passwordHash 必须由服务端 bcrypt 生成')
    assert.equal(await bcrypt.compare('RealPwd!234', created.passwordHash), true, '登录密码应为真实口令')
  })

  it('createOnly 字段（user.password）在编辑模式不直接回写 passwordHash 明文', async () => {
    clearRateLimits()
    const { status, payload } = await api('POST', '/admin/resource/user', {
      username: '116g-res-edit-' + Date.now(),
      nickname: '编辑对象',
      password: 'FirstPwd!1',
    }, adminToken)
    assert.equal(status, 200)
    const uid = payload.data.id

    // 编辑模式：不提交 password → passwordHash 保持不变
    const upd = await api('PUT', `/admin/resource/user/${uid}`, { nickname: '改名用户' }, adminToken)
    assert.equal(upd.status, 200)
    const after = await prisma.user.findUnique({ where: { id: uid } })
    assert.equal(after.nickname, '改名用户')
    assert.equal(await bcrypt.compare('FirstPwd!1', after.passwordHash), true, '未提交新口令时原口令不变')
  })
})

// ═══════════════ R3 列表/详情不泄露危险字段 ═══════════════
describe('R3 响应不泄露 passwordHash（rowForClient 语义不变）', () => {
  it('user 详情响应不含 passwordHash', async () => {
    clearRateLimits()
    const { status, payload } = await api('POST', '/admin/resource/user', {
      username: '116g-res-leak-' + Date.now(),
      nickname: '泄露检查',
      password: 'LeakPwd!1',
    }, adminToken)
    assert.equal(status, 200)
    const uid = payload.data.id
    const detail = await api('GET', `/admin/resource/user/${uid}`, null, adminToken)
    assert.equal(detail.status, 200)
    assert.equal(detail.payload.data.passwordHash, undefined, '响应不得包含 passwordHash')
    assert.ok(detail.payload.data.username.startsWith('116g-res-leak-'), '正向对照：username 可正常读取')
  })
})
