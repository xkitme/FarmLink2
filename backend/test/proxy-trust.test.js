/**
 * 116e-C2c 代理来源信任测试
 *
 * 覆盖：
 * - 配置校验：resolveTrustProxy fail-fast（含非法 CIDR 边界：空前缀、+1、空格）
 * - 默认直连：伪造 XFF 被忽略，精确断言限流键为 loopback + count=3
 * - 同一 IP 伪造不同 XFF 不能绕过限流
 * - 审计日志 OperationLog 端到端（traceId 轮询，非固定 sleep + findFirst）
 * - clearRateLimits() 测试隔离
 * - uploadQuota 真 HTTP 集成测试（独立 Express 应用，XFF 绕过失败 → 429）
 * - 可信代理穿过主 App 消费链：4 种信任模式精确断言限流键
 * - 可信代理 + 默认直连 OperationLog 端到端断言
 *
 * 顶部只能静态导入 Node 内置模块 + express；
 * 所有 FarmLink 模块在 DATABASE_URL/TRUST_PROXY 设置后动态 import。
 */

import { execFileSync } from 'node:child_process'
import { closeSync, mkdtempSync, openSync, rmSync } from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import express from 'express'

// ── 环境设置（必须在任何 FarmLink 模块导入前） ──────────

const backendRoot = path.resolve(import.meta.dirname, '..')
const testRoot = mkdtempSync(path.join(backendRoot, 'prisma', '.test-proxy-'))
closeSync(openSync(path.join(testRoot, 'proxy.db'), 'w'))

const SAVED = {
  TRUST_PROXY: process.env.TRUST_PROXY,
  DATABASE_URL: process.env.DATABASE_URL,
  APP_ENV: process.env.APP_ENV,
}
process.env.TRUST_PROXY = 'false'
process.env.DATABASE_URL = `file:./${path.basename(testRoot)}/proxy.db`
process.env.APP_ENV = 'dev'

const prismaCli = path.join(backendRoot, 'node_modules', 'prisma', 'build', 'index.js')
execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], {
  cwd: backendRoot,
  env: process.env,
  stdio: 'pipe',
})

// ── 动态导入 FarmLink 模块（环境已就绪） ──────────

const [
  { resolveTrustProxy },
  { default: app },
  { prisma },
  { clearRateLimits, rateLimitSnapshot },
] = await Promise.all([
  import('../src/config/index.js'),
  import('../src/app.js'),
  import('../src/db.js'),
  import('../src/middleware/apiControl.js'),
])

// 验证默认 trust proxy 配置
assert.strictEqual(app.get('trust proxy'), false,
  'app.get("trust proxy") 应为 false（默认直连）')

// ── 辅助函数 ─────────────────────────────────────

/** 轮询查找包含指定 traceId 的 OperationLog，超时返回 null */
async function findOpLogByTraceId(traceId, timeoutMs = 3000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const logs = await prisma.operationLog.findMany({
      where: { detail: { contains: traceId } },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })
    if (logs.length > 0) return logs[0]
    await new Promise((r) => setTimeout(r, 80))
  }
  return null
}

/** 发送 login POST 并返回 { status, traceId } */
async function loginPost(base, { xff, username = 'x', password = 'x' } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (xff !== undefined) headers['X-Forwarded-For'] = xff
  const resp = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ username, password }),
  })
  return { status: resp.status, traceId: resp.headers.get('X-Trace-Id') }
}

// ── 启动主应用服务器 ─────────────────────────────

let server, baseUrl

before(async () => {
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await prisma.$disconnect()
  rmSync(testRoot, { recursive: true, force: true })
  for (const [k, v] of Object.entries(SAVED)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

// ═══════════════════════════════════════════════════
// 分区 1：resolveTrustProxy 配置校验
// ═══════════════════════════════════════════════════

test('resolveTrustProxy 配置校验', async (t) => {
  await t.test('未设置 / false / 0 → false（安全默认）', () => {
    assert.equal(resolveTrustProxy({}), false)
    assert.equal(resolveTrustProxy({ TRUST_PROXY: '' }), false)
    assert.equal(resolveTrustProxy({ TRUST_PROXY: 'false' }), false)
    assert.equal(resolveTrustProxy({ TRUST_PROXY: '0' }), false)
    assert.equal(resolveTrustProxy({ TRUST_PROXY: '  false  ' }), false)
  })

  await t.test('true / 1 → 拒绝启动', () => {
    assert.throws(() => resolveTrustProxy({ TRUST_PROXY: 'true' }), /TRUST_PROXY=true/)
    assert.throws(() => resolveTrustProxy({ TRUST_PROXY: '1' }), /TRUST_PROXY=true/)
  })

  await t.test('loopback → 信任本机回环地址', () => {
    assert.deepEqual(resolveTrustProxy({ TRUST_PROXY: 'loopback' }), ['loopback'])
  })

  await t.test('合法 IPv4/CIDR 通过校验', () => {
    assert.deepEqual(resolveTrustProxy({ TRUST_PROXY: '10.0.0.1' }), ['10.0.0.1'])
    assert.deepEqual(resolveTrustProxy({ TRUST_PROXY: '172.16.0.0/12' }), ['172.16.0.0/12'])
    assert.deepEqual(resolveTrustProxy({ TRUST_PROXY: '192.168.1.1,10.0.0.0/8' }),
      ['192.168.1.1', '10.0.0.0/8'])
  })

  await t.test('合法 IPv6/CIDR 通过校验', () => {
    assert.deepEqual(resolveTrustProxy({ TRUST_PROXY: '::1' }), ['::1'])
    assert.deepEqual(resolveTrustProxy({ TRUST_PROXY: '2001:db8::1' }), ['2001:db8::1'])
    assert.deepEqual(resolveTrustProxy({ TRUST_PROXY: '2001:db8::/32' }), ['2001:db8::/32'])
  })

  await t.test('非法 IPv4 地址 → 拒绝 (999.999.999.999)', () => {
    assert.throws(
      () => resolveTrustProxy({ TRUST_PROXY: '999.999.999.999' }),
      /无法识别/,
    )
  })

  await t.test('非法 CIDR 前缀 → 拒绝 (10.0.0.1/99, IPv6/999)', () => {
    assert.throws(
      () => resolveTrustProxy({ TRUST_PROXY: '10.0.0.1/99' }),
      /前缀 99 超出 IPv4 最大/,
    )
    assert.throws(
      () => resolveTrustProxy({ TRUST_PROXY: '2001:db8::/999' }),
      /前缀 999 超出 IPv6 最大/,
    )
  })

  await t.test('非法格式 → 拒绝 (::::, not-an-ip)', () => {
    assert.throws(
      () => resolveTrustProxy({ TRUST_PROXY: '::::' }),
      /无法识别/,
    )
    assert.throws(
      () => resolveTrustProxy({ TRUST_PROXY: 'not-an-ip' }),
      /无法识别/,
    )
  })

  await t.test('CIDR 前缀非整数 → 拒绝 (10.0.0.1/abc)', () => {
    assert.throws(
      () => resolveTrustProxy({ TRUST_PROXY: '10.0.0.1/abc' }),
      /前缀必须是/,
    )
  })

  // ── 新增：严格纯数字前缀校验 ──

  await t.test('CIDR 空前缀 → 拒绝 (10.0.0.1/)', () => {
    assert.throws(
      () => resolveTrustProxy({ TRUST_PROXY: '10.0.0.1/' }),
      /前缀必须是/,
    )
  })

  await t.test('CIDR 带符号前缀 → 拒绝 (10.0.0.1/+1)', () => {
    assert.throws(
      () => resolveTrustProxy({ TRUST_PROXY: '10.0.0.1/+1' }),
      /前缀必须是/,
    )
  })

  await t.test('CIDR 空格前缀 → 拒绝 (10.0.0.1/ 1)', () => {
    assert.throws(
      () => resolveTrustProxy({ TRUST_PROXY: '10.0.0.1/ 1' }),
      /前缀必须是/,
    )
  })

  // ── 空段：显式配置不能静默降级 ──

  await t.test('空段 → 拒绝 (仅逗号)', () => {
    assert.throws(
      () => resolveTrustProxy({ TRUST_PROXY: ',' }),
      /含空段/,
    )
  })

  await t.test('空段 → 拒绝 (尾逗号 10.0.0.1,)', () => {
    assert.throws(
      () => resolveTrustProxy({ TRUST_PROXY: '10.0.0.1,' }),
      /含空段/,
    )
  })

  await t.test('空段 → 拒绝 (双逗号 10.0.0.1,,192.168.1.1)', () => {
    assert.throws(
      () => resolveTrustProxy({ TRUST_PROXY: '10.0.0.1,,192.168.1.1' }),
      /含空段/,
    )
  })

  await t.test('dev 环境默认 TRUST_PROXY 为 false', () => {
    assert.strictEqual(resolveTrustProxy({}), false)
  })
})

// ═══════════════════════════════════════════════════
// 分区 2：默认直连（trust proxy = false）— 主 App
// ═══════════════════════════════════════════════════

test('默认直连（trust proxy = false）来源 IP 行为', async (t) => {
  await t.test('伪造 XFF 被忽略，限流键精确为 loopback 直连 IP', async () => {
    clearRateLimits()

    for (let i = 0; i < 3; i++) {
      await loginPost(baseUrl, { xff: `10.${i}.${i}.${i}` })
    }

    const snap = rateLimitSnapshot()
    assert.ok(snap.length > 0, '受保护 API 应产生限流计数')

    // 精确断言：必须存在 key 包含 loopback 地址且 count=3 的 auth-login 桶
    const loopbackKey = snap.find((s) =>
      s.key.includes('auth-login') && (
        s.key.includes('127.0.0.1') ||
        s.key.includes('::ffff:127.0.0.1') ||
        s.key.includes('::1')
      )
    )
    assert.ok(loopbackKey, `应存在 loopback 直连限流键。实际键: ${snap.map((s) => s.key).join(', ')}`)
    assert.equal(loopbackKey.count, 3,
      `loopback 键 count 应为 3，实际 count=${loopbackKey.count}。键: ${loopbackKey.key}`)

    // 排除式断言：不应包含伪造的 10.x.x.x
    const forged = snap.filter((s) =>
      s.key.includes('10.0.0.0') || s.key.includes('10.1.1.1') || s.key.includes('10.2.2.2')
    )
    assert.equal(forged.length, 0,
      `限流键不应包含伪造 XFF IP。伪造键: ${forged.map((s) => s.key).join(', ')}`)
  })

  await t.test('同一 IP 伪造不同 XFF 不能绕过限流', async () => {
    clearRateLimits()

    const results = []
    for (let i = 0; i < 12; i++) {
      const { status } = await loginPost(baseUrl, {
        xff: `fake-${i}.${i}.${i}.${i}`,
        username: 'nobody',
        password: `attempt-${i}`,
      })
      results.push(status)
    }

    const rateLimited = results.filter((s) => s === 429)
    assert.ok(rateLimited.length > 0,
      `伪造不同 XFF 应触发限流，实际状态: ${results.join(', ')}`)
  })

  await t.test('审计日志 ip 字段不受 XFF 伪造影响（traceId 轮询）', async () => {
    clearRateLimits()

    // 发送登录请求（会触发 operationLog 写入）
    const { traceId } = await loginPost(baseUrl, { xff: 'evil.attacker.ip' })
    assert.ok(traceId, '响应应有 X-Trace-Id')

    // 轮询 OperationLog（不是固定 sleep + findFirst latest）
    const log = await findOpLogByTraceId(traceId)
    assert.ok(log, `应在超时前找到 traceId=${traceId} 的 OperationLog`)

    // ip 不应为伪造值
    assert.notEqual(log.ip, 'evil.attacker.ip',
      `审计日志 ip 不应为伪造 XFF，实际 ip=${log.ip}`)
    // ip 应为直连地址
    assert.ok(
      log.ip === '127.0.0.1' || log.ip === '::ffff:127.0.0.1' || log.ip === '::1',
      `审计日志 ip 应为直连地址，实际 ip=${log.ip}`,
    )
  })
})

// ═══════════════════════════════════════════════════
// 分区 3：clearRateLimits 测试隔离
// ═══════════════════════════════════════════════════

test('clearRateLimits 测试隔离（仅供测试使用，非 HTTP 端点）', async (t) => {
  await t.test('clearRateLimits 清空所有限流计数器', async () => {
    clearRateLimits()
    // 制造计数
    await loginPost(baseUrl, { username: 'a', password: 'b' })

    const before = rateLimitSnapshot()
    assert.ok(before.length > 0, '应有至少一个限流计数')

    const cleared = clearRateLimits()
    assert.ok(cleared > 0, '应清空至少一个计数器')

    const after = rateLimitSnapshot()
    assert.equal(after.length, 0, '清空后应无计数器')
  })
})

// ═══════════════════════════════════════════════════
// 分区 4：uploadQuota 真 HTTP 集成测试
// ═══════════════════════════════════════════════════

test('uploadQuota 真 HTTP 集成测试（独立 Express 应用）', async (t) => {
  await t.test('默认 trust proxy=false 时伪造 XFF 无法绕过上传配额', async () => {
    // 动态导入 uploadQuota（仅在需要时）
    const { uploadQuota } = await import('../src/middleware/uploadQuota.js')

    const qApp = express()
    qApp.set('trust proxy', false)
    qApp.use(express.json())

    // 挂 uploadQuota：窗口 60 秒，限额 2 次
    qApp.post('/test-upload', uploadQuota(2, 60), (req, res) => {
      res.json({ ok: true })
    })

    // 错误中间件：BusinessError → 对应 HTTP 状态
    qApp.use((err, _req, res, _next) => {
      if (err && typeof err.code === 'number') {
        return res.status(err.code === 42901 ? 429 : 400).json({ code: err.code, msg: err.message })
      }
      res.status(500).json({ msg: 'internal' })
    })

    let qServer, qUrl
    await new Promise((r) => { qServer = qApp.listen(0, '127.0.0.1', r) })
    qUrl = `http://127.0.0.1:${qServer.address().port}`

    try {
      const results = []
      for (let i = 0; i < 3; i++) {
        const resp = await fetch(`${qUrl}/test-upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': `evil-${i}.${i}.${i}.${i}`,
          },
          body: JSON.stringify({ test: i }),
        })
        results.push(resp.status)
      }

      assert.deepEqual(results, [200, 200, 429],
        `前两次应 200，第三次应 429（配额用尽）。实际: ${results.join(', ')}`)
    } finally {
      await new Promise((r) => qServer.close(r))
    }
  })
})

// ═══════════════════════════════════════════════════
// 分区 5：可信代理穿过主 App 消费链
// ═══════════════════════════════════════════════════

test('可信代理穿过主 App（/api/v1/auth/login → rateLimitSnapshot 精确键 + OperationLog）', async (t) => {
  const savedTrustProxy = app.get('trust proxy')

  after(async () => {
    // 恢复默认
    app.set('trust proxy', savedTrustProxy)
  })

  // ── a) loopback 受信 + XFF 客户端 → 键为客户端 IP ──

  await t.test('a) loopback 受信 → XFF 客户端 IP 成为限流键', async () => {
    clearRateLimits()
    app.set('trust proxy', resolveTrustProxy({ TRUST_PROXY: 'loopback' }))

    await loginPost(baseUrl, { xff: '198.51.100.10' })

    const snap = rateLimitSnapshot()
    const clientKey = snap.find((s) =>
      s.key.includes('auth-login') && s.key.includes('198.51.100.10')
    )
    assert.ok(clientKey,
      `应存在 198.51.100.10 客户端 IP 限流键。实际: ${snap.map((s) => s.key).join(', ')}`)

    // 不应存在 loopback 键（因为 req.ip 已是客户端 IP）
    const loopbackKey = snap.find((s) =>
      s.key.includes('auth-login') && (
        s.key.includes('127.0.0.1') || s.key.includes('::1')
      )
    )
    assert.equal(loopbackKey, undefined,
      `loopback 键不应出现（req.ip 应为客户端 IP）。实际存在: ${loopbackKey?.key}`)
  })

  // ── b) 仅信任 10.0.0.1，直连来自 loopback → XFF 不生效 ──

  await t.test('b) 仅信任 10.0.0.1（直连 loopback 不受信）→ XFF 不生效', async () => {
    clearRateLimits()
    app.set('trust proxy', resolveTrustProxy({ TRUST_PROXY: '10.0.0.1' }))

    await loginPost(baseUrl, { xff: '203.0.113.5' })

    const snap = rateLimitSnapshot()
    // 直连 127.0.0.1 不在受信列表，XFF 被忽略，req.ip = 直连 IP
    const loopbackKey = snap.find((s) =>
      s.key.includes('auth-login') && (
        s.key.includes('127.0.0.1') ||
        s.key.includes('::ffff:127.0.0.1') ||
        s.key.includes('::1')
      )
    )
    assert.ok(loopbackKey,
      `直连不在受信列表，限流键应为 loopback。实际: ${snap.map((s) => s.key).join(', ')}`)

    const forgedKey = snap.find((s) => s.key.includes('203.0.113.5'))
    assert.equal(forgedKey, undefined,
      `不应出现伪造 XFF 键 203.0.113.5。实际存在: ${forgedKey?.key}`)
  })

  // ── c) loopback,10.0.0.0/8 + 混合链 → 非可信跳截断 ──

  await t.test('c) loopback+10.0.0.0/8 → 在非可信 203.0.113.20 截断', async () => {
    clearRateLimits()
    app.set('trust proxy', resolveTrustProxy({ TRUST_PROXY: 'loopback,10.0.0.0/8' }))

    // XFF: [客户端 198.51.100.10, 中间 203.0.113.20, 代理 10.0.0.2]
    // Express 从右向左：直连(127.0.0.1=loopback✓) → 10.0.0.2(在10.0.0.0/8✓) →
    //   203.0.113.20(✗ 非受信) → 截断，req.ip=203.0.113.20
    await loginPost(baseUrl, { xff: '198.51.100.10, 203.0.113.20, 10.0.0.2' })

    const snap = rateLimitSnapshot()
    // 应在 203.0.113.20 截断，不能取到最左 198.51.100.10
    const cutoffKey = snap.find((s) =>
      s.key.includes('auth-login') && s.key.includes('203.0.113.20')
    )
    assert.ok(cutoffKey,
      `应在非受信跳 203.0.113.20 截断。实际: ${snap.map((s) => s.key).join(', ')}`)

    const leftmostKey = snap.find((s) => s.key.includes('198.51.100.10'))
    assert.equal(leftmostKey, undefined,
      `不应取到最左客户端 198.51.100.10（有非受信中间跳）。实际存在: ${leftmostKey?.key}`)
  })

  // ── d) loopback,10.0.0.0/8,192.168.0.0/16 + 全受信链 → 最左客户端 ──

  await t.test('d) 全受信代理链 → 取最左客户端 198.51.100.10', async () => {
    clearRateLimits()
    app.set('trust proxy', resolveTrustProxy({ TRUST_PROXY: 'loopback,10.0.0.0/8,192.168.0.0/16' }))

    // XFF: [客户端 198.51.100.10, 代理2 10.0.0.2, 代理1 192.168.1.1]
    // 全部受信：直连(127.0.0.1=loopback✓) → 192.168.1.1(192.168.0.0/16✓) →
    //   10.0.0.2(10.0.0.0/8✓) → 198.51.100.10(非受信=客户端)
    await loginPost(baseUrl, { xff: '198.51.100.10, 10.0.0.2, 192.168.1.1' })

    const snap = rateLimitSnapshot()
    const clientKey = snap.find((s) =>
      s.key.includes('auth-login') && s.key.includes('198.51.100.10')
    )
    assert.ok(clientKey,
      `全受信链应取最左客户端 198.51.100.10。实际: ${snap.map((s) => s.key).join(', ')}`)
  })

  // ── OperationLog 端到端：loopback 受信 + traceId 轮询 ──

  await t.test('e) loopback 受信 → OperationLog 记录真实客户端 IP（traceId 轮询）', async () => {
    clearRateLimits()
    app.set('trust proxy', resolveTrustProxy({ TRUST_PROXY: 'loopback' }))

    const { traceId } = await loginPost(baseUrl, { xff: '203.0.113.77' })
    assert.ok(traceId, '响应应有 X-Trace-Id')

    const log = await findOpLogByTraceId(traceId)
    assert.ok(log, `应在超时前找到 traceId=${traceId} 的 OperationLog`)

    assert.equal(log.ip, '203.0.113.77',
      `loopback 受信时 OperationLog.ip 应为 XFF 客户端 203.0.113.77，实际 ip=${log.ip}`)
  })

  // ── OperationLog 端到端：非受信代理 → ip 为直连 ──

  await t.test('f) 非受信代理 → OperationLog 记录直连 IP（非伪造 XFF）', async () => {
    clearRateLimits()
    app.set('trust proxy', resolveTrustProxy({ TRUST_PROXY: '10.0.0.1' }))

    const { traceId } = await loginPost(baseUrl, { xff: '6.6.6.6' })
    assert.ok(traceId, '响应应有 X-Trace-Id')

    const log = await findOpLogByTraceId(traceId)
    assert.ok(log, `应在超时前找到 traceId=${traceId} 的 OperationLog`)

    // 直连不在 10.0.0.1 受信列表，XFF 被忽略，ip 为 loopback
    assert.notEqual(log.ip, '6.6.6.6',
      `非受信代理时 ip 不应为伪造 XFF 6.6.6.6，实际 ip=${log.ip}`)
    assert.ok(
      log.ip === '127.0.0.1' || log.ip === '::ffff:127.0.0.1' || log.ip === '::1',
      `非受信代理时 ip 应为直连 loopback，实际 ip=${log.ip}`,
    )
  })
})

// ═══════════════════════════════════════════════════
// 分区 6：清理后安全性回归
// ═══════════════════════════════════════════════════

test('恢复默认 trust proxy=false 后行为正常', async (t) => {
  await t.test('恢复 false 后 XFF 再次被忽略', async () => {
    // trust proxy 已在分区 5 的 after() 中恢复为 false
    assert.strictEqual(app.get('trust proxy'), false)
    clearRateLimits()

    await loginPost(baseUrl, { xff: '99.99.99.99' })

    const snap = rateLimitSnapshot()
    const loopbackKey = snap.find((s) =>
      s.key.includes('auth-login') && (
        s.key.includes('127.0.0.1') ||
        s.key.includes('::ffff:127.0.0.1') ||
        s.key.includes('::1')
      )
    )
    assert.ok(loopbackKey, '恢复 false 后 XFF 应被忽略，限流键应为 loopback')

    const forged = snap.find((s) => s.key.includes('99.99.99.99'))
    assert.equal(forged, undefined, '恢复 false 后不应出现伪造 XFF 键')
  })
})
