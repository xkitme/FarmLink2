import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams, parseJson } from '../../utils/page.js'
import { answerQuestion } from '../ai/services/ask.service.js'

// ── 三级政策推送 ────────────────────────────

/** 政策列表 */
export async function list(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = { status: 1 }
  if (req.query.level) where.level = req.query.level
  if (req.query.category) where.category = req.query.category
  if (req.query.keyword) where.OR = [
    { title: { contains: req.query.keyword } },
    { summary: { contains: req.query.keyword } },
  ]
  const [rows, total] = await Promise.all([
    prisma.policy.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take,
      select: { id: true, title: true, level: true, category: true, summary: true, publishOrg: true, viewCount: true, createdAt: true },
    }),
    prisma.policy.count({ where }),
  ])
  okPage(res, { records: rows, total, pageNum, pageSize })
}

/** 政策详情（浏览量 +1） */
export async function detail(req, res) {
  const id = Number(req.params.id)
  const policy = await prisma.policy.findUnique({ where: { id } })
  if (!policy) throw errors.notFound('政策不存在')
  await prisma.policy.update({ where: { id }, data: { viewCount: { increment: 1 } } })
  ok(res, { ...policy, attachments: parseJson(policy.attachments, []) })
}

// ── 补贴申请引导 ────────────────────────────

/** 提交补贴申请 */
export async function subsidyApply(req, res) {
  const { policyId, materials } = req.body
  if (!policyId) throw errors.param('请指定要申请的政策')
  const policy = await prisma.policy.findUnique({ where: { id: Number(policyId) } })
  if (!policy) throw errors.notFound('政策不存在')

  const app = await prisma.subsidyApplication.create({
    data: {
      userId: req.user.id,
      policyId: Number(policyId),
      materials: materials ? JSON.stringify(materials) : null,
      status: 'SUBMITTED',
    },
  })
  ok(res, {
    ...app,
    guide: policy.applyGuide || '请按政策要求准备申请材料，提交后由乡镇审核公示。',
  }, '补贴申请已提交')
}

/** 我的补贴申请记录 */
export async function subsidyList(req, res) {
  const rows = await prisma.subsidyApplication.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  })
  const policyIds = [...new Set(rows.map((r) => r.policyId))]
  const policies = await prisma.policy.findMany({
    where: { id: { in: policyIds } },
    select: { id: true, title: true, category: true },
  })
  const pmap = Object.fromEntries(policies.map((p) => [p.id, p]))
  ok(res, rows.map((r) => ({
    ...r,
    materials: parseJson(r.materials, []),
    policy: pmap[r.policyId] || null,
  })))
}

// ── 政策 AI 问答（P11：SQLite RAG + Ollama + 规则引擎） ──

export async function aiAsk(req, res) {
  const { question } = req.body
  if (!question || !question.trim()) throw errors.param('请输入你的问题')
  const result = await answerQuestion({ userId: req.user.id, scene: 'POLICY', question })
  ok(res, result)
}

// ── 法律援助咨询（P11：AI 编排） ──

export async function legalAsk(req, res) {
  const { question } = req.body
  if (!question || !question.trim()) throw errors.param('请输入你的法律问题')
  const result = await answerQuestion({ userId: req.user.id, scene: 'LEGAL', question })
  ok(res, result)
}
