import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams, parseJson } from '../../utils/page.js'

/** 提取问题中的 2~3 字中文 n-gram，用于政策检索 */
function ngrams(text) {
  const clean = String(text).replace(/[^一-龥]/g, '')
  const set = new Set()
  for (const n of [3, 2]) {
    for (let i = 0; i + n <= clean.length; i++) set.add(clean.slice(i, i + n))
  }
  return [...set].slice(0, 20)
}

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

// ── 政策 AI 问答（规则版 RAG，分段 11 接入 Ollama LLM） ──

export async function aiAsk(req, res) {
  const { question } = req.body
  if (!question || !question.trim()) throw errors.param('请输入你的问题')

  const grams = ngrams(question)
  let chunks = []
  if (grams.length) {
    chunks = await prisma.policyChunk.findMany({
      where: { OR: grams.map((g) => ({ chunkContent: { contains: g } })) },
      take: 40,
    })
  }
  const scored = chunks
    .map((c) => ({ c, score: grams.filter((g) => c.chunkContent.includes(g)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
  const top = scored.map((s) => s.c)

  const policyIds = [...new Set(top.map((c) => c.policyId))]
  const policies = await prisma.policy.findMany({
    where: { id: { in: policyIds } },
    select: { id: true, title: true },
  })

  const answer = top.length
    ? '根据相关惠农政策，为你整理如下：\n' +
      top.map((c, i) => `${i + 1}. ${c.chunkContent}`).join('\n') +
      '\n\n如需进一步了解，建议查阅完整政策原文或咨询当地农业部门。'
    : '暂未检索到直接相关的政策条款，建议换个说法提问，或直接咨询村委、乡镇农业服务站。'

  await prisma.aiQaRecord.create({
    data: {
      userId: req.user.id, scene: 'POLICY', question, answer,
      modelUsed: 'rule-rag', isOffline: true,
      referencesJson: JSON.stringify(policyIds),
    },
  })
  ok(res, { question, answer, references: policies, mode: 'rule-rag' })
}

// ── 法律援助咨询（规则版，分段 11 接入 LLM） ──

const LEGAL_TOPICS = [
  { keys: ['土地', '承包', '流转', '耕地', '宅基地'],
    advice: '土地承包经营权受法律保护，承包期内发包方不得违法调整收回。土地流转应签订书面合同，明确面积、期限、价款并向村集体备案。发生纠纷可申请村调解委员会调解，或向乡镇农村土地承包仲裁机构申请仲裁。' },
  { keys: ['工资', '欠薪', '劳务', '打工', '务工', '工钱'],
    advice: '用人单位应按时足额支付劳动报酬。被拖欠工资可先与用工方协商，协商不成可向劳动保障监察机构投诉或申请劳动仲裁；农民工欠薪可拨打根治欠薪专线维权。' },
  { keys: ['合同', '买卖', '农资', '假种子', '假化肥', '假农药'],
    advice: '购买农资务必索取正规发票并留存样品包装。因假冒伪劣农资造成损失，可向市场监管或农业执法部门投诉，并依据《农产品质量安全法》《消费者权益保护法》主张赔偿。' },
  { keys: ['赡养', '继承', '婚姻', '家庭', '抚养'],
    advice: '成年子女对父母有赡养扶助义务。涉及财产继承、婚姻家庭纠纷，可先由村调解委员会调解，调解不成可向人民法院起诉，符合条件的可申请法律援助。' },
  { keys: ['补偿', '征收', '征地', '拆迁'],
    advice: '土地征收应依法给予公平合理补偿，包括土地补偿费、安置补助费、地上附着物和青苗补偿费。对补偿安置有异议的，可申请行政复议或提起行政诉讼。' },
]

export async function legalAsk(req, res) {
  const { question } = req.body
  if (!question || !question.trim()) throw errors.param('请输入你的法律问题')

  const hit = LEGAL_TOPICS.find((t) => t.keys.some((k) => question.includes(k)))
  const answer = (hit ? hit.advice : '你的问题较为综合，建议携带相关材料咨询专业法律人士。') +
    '\n\n如需法律援助，可拨打全国公共法律服务热线 12348，或前往乡镇司法所、法律援助中心寻求帮助。'

  await prisma.aiQaRecord.create({
    data: { userId: req.user.id, scene: 'LEGAL', question, answer, modelUsed: 'rule', isOffline: true },
  })
  ok(res, { question, answer, mode: 'rule', matched: !!hit })
}
