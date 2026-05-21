import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams } from '../../utils/page.js'

// ── 就业信息平台 ────────────────────────────

/** 就业信息列表 */
export async function jobList(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = { status: 'OPEN' }
  if (req.query.jobType) where.jobType = req.query.jobType
  if (req.query.regionCode) where.regionCode = req.query.regionCode
  if (req.query.keyword) where.title = { contains: req.query.keyword }
  const [records, total] = await Promise.all([
    prisma.jobInfo.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.jobInfo.count({ where }),
  ])
  okPage(res, { records, total, pageNum, pageSize })
}

/** 发布招工信息 */
export async function jobCreate(req, res) {
  const { title, jobType, company, location, salary, headcount, requirement, contactPhone } = req.body
  if (!title) throw errors.param('岗位标题必填')
  const job = await prisma.jobInfo.create({
    data: {
      publisherId: req.user.id,
      title,
      jobType: jobType || '本地用工',
      company: company || null,
      location: location || null,
      salary: salary || null,
      headcount: Number(headcount) || 1,
      requirement: requirement || null,
      contactPhone: contactPhone || req.user.phone || null,
      regionCode: req.user.regionCode || null,
      status: 'OPEN',
    },
  })
  ok(res, job, '招工信息已发布')
}

/** AI 岗位智能匹配 */
export async function jobMatch(req, res) {
  const skills = String(req.body.skills || req.query.skills || '').trim()
  if (!skills) throw errors.param('请填写你的技能或意向')
  const tokens = skills.split(/[,，、\s]+/).filter((t) => t.length >= 2)

  const jobs = await prisma.jobInfo.findMany({ where: { status: 'OPEN' }, take: 100 })
  const scored = jobs.map((j) => {
    const text = `${j.title} ${j.company || ''} ${j.requirement || ''} ${j.jobType || ''}`
    const score = tokens.filter((t) => text.includes(t)).length
    return { job: j, score }
  })
  const matched = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 10)
  const result = (matched.length ? matched : scored.slice(0, 5)).map((s) => ({ ...s.job, matchScore: s.score }))
  ok(res, {
    skills,
    matched: result,
    tip: matched.length ? `为你匹配到 ${matched.length} 个相关岗位。` : '未找到高度匹配岗位，以下为近期热门招工。',
  })
}

// ── 农业贷款服务 ────────────────────────────

/** 贷款产品列表 */
export async function loanProducts(req, res) {
  const rows = await prisma.loanProduct.findMany({ orderBy: { interestRate: 'asc' } })
  ok(res, rows)
}

/** 贷款资质 AI 预评估 */
export async function loanAssess(req, res) {
  const { loanProductId, amount, purpose } = req.body
  if (!loanProductId || !amount) throw errors.param('请选择贷款产品并填写额度')
  const product = await prisma.loanProduct.findUnique({ where: { id: Number(loanProductId) } })
  if (!product) throw errors.notFound('贷款产品不存在')
  if (Number(amount) > product.maxAmount) {
    throw errors.param(`申请额度超过该产品上限 ${product.maxAmount} 元`)
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { points: true, createdAt: true } })
  // 规则评分：基础分 + 积分加成 + 注册时长加成
  const base = 62
  const pointBonus = Math.min(20, Math.floor(user.points / 10))
  const tenureBonus = Math.min(8, Math.floor((Date.now() - new Date(user.createdAt)) / (90 * 86400000)))
  const score = Math.min(98, base + pointBonus + tenureBonus + Math.floor(Math.random() * 8))
  const result = score >= 78 ? '资质良好，建议受理' : score >= 65 ? '资质基本符合，可补充材料后受理' : '资质偏弱，建议先积累信用记录'

  const app = await prisma.loanApplication.create({
    data: {
      userId: req.user.id,
      loanProductId: Number(loanProductId),
      amount: Number(amount),
      purpose: purpose || null,
      aiCreditScore: score,
      aiAssessResult: result,
      status: 'ASSESSING',
    },
  })
  ok(res, {
    ...app,
    product: { bankName: product.bankName, productName: product.productName, interestRate: product.interestRate },
    tip: '本评估为离线规则版，仅供参考，最终以银行审核为准。',
  }, '贷款资质评估完成')
}

/** 我的贷款申请 */
export async function loanApplications(req, res) {
  const rows = await prisma.loanApplication.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  })
  ok(res, rows)
}

// ── 子女教育辅导（AI 答疑） ──────────────────

export async function eduAsk(req, res) {
  const { question, subject, grade } = req.body
  if (!question || !question.trim()) throw errors.param('请输入要请教的问题')

  const answer =
    `关于「${question}」：\n` +
    `这道${subject || ''}题的思路是——先理解题目要求，找出已知条件与所求，再分步骤推导。\n` +
    `建议：① 不要直接看答案，先独立思考；② 把不会的知识点记下来，回头复习；③ 同类题目多练几道巩固。\n` +
    `家长可鼓励孩子讲出解题过程，培养表达与逻辑能力。`

  await prisma.aiQaRecord.create({
    data: { userId: req.user.id, scene: 'EDU', question, answer, modelUsed: 'rule', isOffline: true },
  })
  ok(res, { question, subject: subject || null, grade: grade || null, answer, mode: 'rule' })
}
