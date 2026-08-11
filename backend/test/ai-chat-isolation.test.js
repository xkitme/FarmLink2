// 116d characterization: AI 隔离（B7–B9）
import { closeSync, mkdtempSync, openSync, rmSync } from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'

// ── 精确路径守卫 ──
const backendRoot = path.resolve(import.meta.dirname, '..')
const prismaDir = path.resolve(backendRoot, 'prisma')
const testRoot = mkdtempSync(path.join(prismaDir, '.test-116d-ai-'))
const testBase = path.basename(testRoot)
const expectedPrefix = '.test-116d-ai-'
const dbFile = path.join(testRoot, 'ai.db')
const expectedDbUrl = `file:./${testBase}/ai.db`

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

// B7: 强制 Ollama 不可达 → knowledge-rule 回落
process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:1'

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
let app, prisma, bcrypt, issueSession, clearRateLimits, sanitizeAssistantOutput
let loadErr
try {
  const dbModule = await import('../src/db.js')
  prisma = dbModule.prisma
} catch (e) {
  loadErr = e
}
if (!loadErr) {
  try {
    ;[
      { default: app }, { default: bcrypt }, { issueSession }, { clearRateLimits },
      { sanitizeAssistantOutput },
    ] = await Promise.all([
      import('../src/app.js'),
      import('bcryptjs'),
      import('../src/modules/platform/auth-session.service.js'),
      import('../src/middleware/apiControl.js'),
      import('../src/modules/ai/services/assistant.service.js'),
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
const NATIVE_HEADERS = { 'User-Agent': 'capacitor://localhost', 'X-Device-Name': '116d-ai-test' }
let server, baseUrl, policyUser, userA, userB, tokenPolicy, tokenA, tokenB
let fixtureRecA1, fixtureRecA2, fixtureRecB1, fixtureRecB2

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
  policyUser = await prisma.user.create({ data: { username: '116d-policy', nickname: '政策用户', passwordHash: hash, phone: '13900101160', role: 'FARMER', regionCode: '440100123', status: 1 } })
  userA = await prisma.user.create({ data: { username: '116d-ai-a', nickname: 'AI用户A', passwordHash: hash, phone: '13900101161', role: 'FARMER', regionCode: '440100456', status: 1 } })
  userB = await prisma.user.create({ data: { username: '116d-ai-b', nickname: 'AI用户B', passwordHash: hash, phone: '13900101162', role: 'FARMER', regionCode: '440100789', status: 1 } })
  ;[{ token: tokenPolicy }, { token: tokenA }, { token: tokenB }] = await Promise.all([
    issueSession(policyUser, { deviceName: '116d-ai-test' }),
    issueSession(userA, { deviceName: '116d-ai-test' }),
    issueSession(userB, { deviceName: '116d-ai-test' }),
  ])

  // B7: chatProvider=ollama，DeepSeek key 空 → 只用 Ollama
  await prisma.siteSetting.create({
    data: {
      key: 'ai_assistant_config',
      value: JSON.stringify({ chatProvider: 'ollama', deepseekApiKey: '' }),
      description: '116d-test',
    },
  })

  // B8 fixture：固定 createdAt 保证 asc/list 确定性
  fixtureRecA1 = await prisma.aiQaRecord.create({ data: { userId: userA.id, scene: 'AGRI', question: 'A-水稻施肥', answer: '施肥方案A', modelUsed: 'knowledge-rule', isOffline: true, createdAt: new Date('2026-08-01T00:00:00.000Z') } })
  await prisma.aiQaRecord.update({ where: { id: fixtureRecA1.id }, data: { threadId: fixtureRecA1.id } })
  fixtureRecA2 = await prisma.aiQaRecord.create({ data: { userId: userA.id, threadId: fixtureRecA1.id, scene: 'AGRI', question: 'A-虫害防治', answer: '虫害方案A', modelUsed: 'knowledge-rule', isOffline: true, createdAt: new Date('2026-08-01T00:00:01.000Z') } })
  // userB 独立 thread
  fixtureRecB1 = await prisma.aiQaRecord.create({ data: { userId: userB.id, scene: 'POLICY', question: 'B-补贴申请', answer: '补贴答案B', modelUsed: 'knowledge-rule', isOffline: true, createdAt: new Date('2026-08-01T00:00:02.000Z') } })
  await prisma.aiQaRecord.update({ where: { id: fixtureRecB1.id }, data: { threadId: fixtureRecB1.id } })
  fixtureRecB2 = await prisma.aiQaRecord.create({ data: { userId: userB.id, threadId: fixtureRecB1.id, scene: 'POLICY', question: 'B-补贴标准', answer: '标准答案B', modelUsed: 'knowledge-rule', isOffline: true, createdAt: new Date('2026-08-01T00:00:03.000Z') } })

  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => { await cleanup() })

// ═══════════════ B7: 集成 — knowledge-rule 回落 ═══════════════
describe('B7 POST /ai/policy/ask → knowledge-rule 回落', () => {
  it('Ollama 不可达触发 knowledge-rule，回答含政策主题且落库一致', async () => {
    clearRateLimits()
    const { status, payload } = await api('POST', '/ai/policy/ask', {
      question: '种植玉米有没有补贴',
      scene: 'POLICY',
    }, tokenPolicy)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.equal(payload.msg, 'AI 回答完成')
    const d = payload.data
    assert.ok(typeof d.recordId === 'number' && d.recordId > 0)
    assert.ok(typeof d.threadId === 'number' && d.threadId > 0)
    assert.equal(d.recordId, d.threadId, '新 thread 的 recordId===threadId')
    assert.equal(d.scene, 'POLICY')
    assert.equal(d.question, '种植玉米有没有补贴')
    assert.ok(d.answer.includes('### 惠农补贴申请'), `answer 应含标题，实际: ${d.answer.slice(0, 80)}`)
    assert.ok(d.answer.includes('耕地地力保护补贴'), '应含耕地地力保护补贴')
    assert.ok(d.answer.includes('一卡通'), '应含一卡通')
    assert.deepEqual(d.references, [])
    assert.equal(d.serviceMode, '智能问答')
    assert.equal(d.modelUsed, 'knowledge-rule')
    assert.equal(d.serviceStatus, '运行中')
    assert.equal(d.durationMs, null)

    // 落库一致
    const row = await prisma.aiQaRecord.findUnique({ where: { id: d.recordId } })
    assert.ok(row)
    assert.equal(row.userId, policyUser.id)
    assert.equal(row.threadId, d.threadId)
    assert.equal(row.scene, 'POLICY')
    assert.equal(row.question, '种植玉米有没有补贴')
    assert.equal(row.modelUsed, 'knowledge-rule')
    assert.equal(row.isOffline, true)
    assert.equal(row.referencesJson, '[]')
    assert.equal(row.answer, d.answer, 'DB answer 必须 === response answer')
    assert.ok(row.answer.includes('### 惠农补贴申请'))

    // policyUser 仅此一条
    assert.equal(await prisma.aiQaRecord.count({ where: { userId: policyUser.id } }), 1)
  })

  it('空问题 → 400, code=40001, msg=请输入问题, data=null, 不创建新行', async () => {
    clearRateLimits()
    const beforeCount = await prisma.aiQaRecord.count({ where: { userId: policyUser.id } })
    const { status, payload } = await api('POST', '/ai/policy/ask', {
      question: '',
      scene: 'POLICY',
    }, tokenPolicy)
    assert.equal(status, 400)
    assert.equal(payload.code, 40001)
    assert.equal(payload.msg, '请输入问题')
    assert.equal(payload.data, null)
    assert.equal(await prisma.aiQaRecord.count({ where: { userId: policyUser.id } }), beforeCount)
  })
})

// ═══════════════ B8: 对话历史跨线程隔离 ═══════════════
describe('B8 对话历史跨线程隔离', () => {
  let aThreadId, recA1, recA2, recB1

  before(async () => {
    recA1 = await prisma.aiQaRecord.findFirst({ where: { userId: userA.id, question: 'A-水稻施肥' } })
    recA2 = await prisma.aiQaRecord.findFirst({ where: { userId: userA.id, question: 'A-虫害防治' } })
    recB1 = await prisma.aiQaRecord.findFirst({ where: { userId: userB.id, question: 'B-补贴申请' } })
    aThreadId = recA1.threadId
  })

  it('本人 GET /ai/qa/threads/:threadId → msg=success, data keys [records], asc 顺序, 全字段', async () => {
    clearRateLimits()
    const { status, payload } = await api('GET', `/ai/qa/threads/${aThreadId}`, null, tokenA)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.equal(payload.msg, 'success')
    assert.deepEqual(Object.keys(payload.data), ['records'])
    const { records } = payload.data
    assert.equal(records.length, 2)
    // createdAt asc: recA1 first, recA2 second
    assert.equal(records[0].id, recA1.id)
    assert.equal(records[1].id, recA2.id)

    // recA1 全字段投影
    const r0 = records[0]
    assert.equal(r0.id, recA1.id)
    assert.equal(r0.userId, userA.id)
    assert.equal(r0.threadId, aThreadId)
    assert.equal(r0.scene, 'AGRI')
    assert.equal(r0.question, 'A-水稻施肥')
    assert.equal(r0.answer, '施肥方案A')
    assert.equal(r0.modelUsed, 'knowledge-rule')
    assert.equal(r0.isOffline, true)
    assert.equal(r0.referencesJson, null)
    assert.equal(new Date(r0.createdAt).toISOString(), '2026-08-01T00:00:00.000Z')

    // recA2 全字段投影
    const r1 = records[1]
    assert.equal(r1.id, recA2.id)
    assert.equal(r1.userId, userA.id)
    assert.equal(r1.threadId, aThreadId)
    assert.equal(r1.scene, 'AGRI')
    assert.equal(r1.question, 'A-虫害防治')
    assert.equal(r1.answer, '虫害方案A')
    assert.equal(r1.modelUsed, 'knowledge-rule')
    assert.equal(r1.isOffline, true)
    assert.equal(r1.referencesJson, null)
    assert.equal(new Date(r1.createdAt).toISOString(), '2026-08-01T00:00:01.000Z')
  })

  it('他人访问 userA thread → 404, code=40401, msg=对话不存在, data=null', async () => {
    clearRateLimits()
    const { status, payload } = await api('GET', `/ai/qa/threads/${aThreadId}`, null, tokenB)
    assert.equal(status, 404)
    assert.equal(payload.code, 40401)
    assert.equal(payload.msg, '对话不存在')
    assert.equal(payload.data, null)
  })

  it('本人 GET /ai/qa/records → msg=success, 分页精确, userA 1 条 summary, userB absent', async () => {
    clearRateLimits()
    const { status, payload } = await api('GET', '/ai/qa/records?pageNum=1&pageSize=10', null, tokenA)
    assert.equal(status, 200)
    assert.equal(payload.code, 200)
    assert.equal(payload.msg, 'success')
    assert.deepEqual(Object.keys(payload.data).sort(), ['pageNum', 'pageSize', 'pages', 'records', 'total'])
    const { records, total, pageNum, pageSize, pages } = payload.data
    assert.equal(total, 1)
    assert.equal(pageNum, 1)
    assert.equal(pageSize, 10)
    assert.equal(pages, 1)
    assert.equal(records.length, 1)

    const s = records[0]
    assert.equal(s.id, recA1.id)
    assert.equal(s.userId, userA.id)
    assert.equal(s.threadId, aThreadId)
    assert.equal(s.scene, 'AGRI')
    assert.equal(s.question, 'A-水稻施肥')
    assert.equal(s.answer, '施肥方案A')
    assert.equal(s.modelUsed, 'knowledge-rule')
    assert.equal(s.isOffline, true)
    assert.equal(s.referencesJson, null)
    assert.equal(s.messageCount, 2)
    assert.equal(new Date(s.lastMessageAt).toISOString(), '2026-08-01T00:00:01.000Z')
    assert.equal(new Date(s.createdAt).toISOString(), '2026-08-01T00:00:00.000Z')

    // 证明 userB 内容不可见
    for (const r of records) {
      assert.notEqual(r.userId, userB.id)
      assert.notEqual(r.question, 'B-补贴申请')
    }
  })
})

// ═══════════════ B9: sanitizeAssistantOutput 纯函数 ═══════════════
describe('B9 sanitizeAssistantOutput 命令白名单净化（纯函数）', () => {
  const products = [{ id: 1, title: '高山玉米' }, { id: 2, title: '有机红薯' }]

  it('合法命令全部保留', () => {
    const parsed = {
      replyMarkdown: '已为您打开集市。',
      statusText: '浏览集市',
      commands: [
        { type: 'open_page', params: { routeKey: 'market' } },
        { type: 'show_products', params: { productIds: [1, 2] } },
      ],
    }
    const out = sanitizeAssistantOutput(parsed, products)
    assert.equal(out.replyMarkdown, '已为您打开集市。')
    assert.equal(out.speakText, '已为您打开集市。')
    assert.equal(out.statusText, '浏览集市')
    assert.equal(out.commands.length, 2)
    assert.deepEqual(out.commands[0], { type: 'open_page', params: { routeKey: 'market' } })
    assert.deepEqual(out.commands[1], { type: 'show_products', params: { productIds: [1, 2] } })
  })

  it('非法 type 被过滤', () => {
    const out = sanitizeAssistantOutput({
      replyMarkdown: 'ok',
      commands: [{ type: 'open_page', params: { routeKey: 'market' } }, { type: 'bad_cmd', params: {} }],
    }, products)
    assert.equal(out.commands.length, 1)
    assert.equal(out.commands[0].type, 'open_page')
  })

  it('open_page routeKey 不在白名单被过滤', () => {
    const out = sanitizeAssistantOutput({
      replyMarkdown: 'ok',
      commands: [{ type: 'open_page', params: { routeKey: 'evil' } }],
    }, products)
    assert.equal(out.commands.length, 0)
  })

  it('search keyword 非空保留，空过滤', () => {
    const out1 = sanitizeAssistantOutput({
      replyMarkdown: 'ok',
      commands: [{ type: 'search', params: { keyword: '玉米' } }],
    }, products)
    assert.equal(out1.commands.length, 1)
    assert.deepEqual(out1.commands[0], { type: 'search', params: { keyword: '玉米' } })
    const out2 = sanitizeAssistantOutput({
      replyMarkdown: 'ok',
      commands: [{ type: 'search', params: {} }],
    }, products)
    assert.equal(out2.commands.length, 0)
  })

  it('show_products productIds 必须在 available 集合内', () => {
    const out = sanitizeAssistantOutput({
      replyMarkdown: 'ok',
      commands: [{ type: 'show_products', params: { productIds: [1, 999, 2, -1] } }],
    }, products)
    assert.equal(out.commands.length, 1)
    assert.deepEqual(out.commands[0].params.productIds, [1, 2])
  })

  it('commands 超过 5 条截断为 5', () => {
    const out = sanitizeAssistantOutput({
      replyMarkdown: 'ok',
      commands: Array.from({ length: 7 }, (_, i) => ({
        type: 'open_page',
        params: { routeKey: ['home', 'market', 'agri', 'policy', 'data', 'life', 'search'][i] },
      })),
    }, products)
    assert.equal(out.commands.length, 5)
  })

  it('replyMarkdown 空 → 默认文案', () => {
    const out = sanitizeAssistantOutput({}, [])
    assert.equal(out.replyMarkdown, '我听到了，请继续说。')
    assert.equal(out.speakText, '我听到了，请继续说。')
  })

  it('reply / message 作为备选来源', () => {
    assert.equal(sanitizeAssistantOutput({ reply: 'A' }, []).replyMarkdown, 'A')
    assert.equal(sanitizeAssistantOutput({ message: 'B' }, []).replyMarkdown, 'B')
    // reply 优先于 message
    assert.equal(sanitizeAssistantOutput({ reply: 'reply优先', message: 'msg' }, []).replyMarkdown, 'reply优先')
  })

  it('statusText 截断===80，replyMarkdown 截断===1600', () => {
    const out = sanitizeAssistantOutput({ statusText: 'x'.repeat(100), replyMarkdown: 'y'.repeat(2000) }, [])
    assert.equal(out.statusText.length, 80)
    assert.equal(out.replyMarkdown.length, 1600)
  })

  it('返回对象仅含 4 个 key', () => {
    const out = sanitizeAssistantOutput({ replyMarkdown: 'hello' }, [])
    assert.deepEqual(Object.keys(out).sort(), ['commands', 'replyMarkdown', 'speakText', 'statusText'])
  })
})
