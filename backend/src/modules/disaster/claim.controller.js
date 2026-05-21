import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'

/**
 * 保险智能理赔。
 * 本段为离线规则版 AI 评估；分段 11 接入视觉模型做灾损图像评估。
 */

function assessLevel(amount) {
  if (amount >= 5000) return { level: '重', ratio: 0.7 }
  if (amount >= 1500) return { level: '中', ratio: 0.5 }
  return { level: '轻', ratio: 0.3 }
}

/** 保险理赔 AI 评估 */
export async function assess(req, res) {
  const { disasterReportId, claimType, estimatedAmount } = req.body
  const amount = Number(estimatedAmount) || 0
  if (!claimType || amount <= 0) throw errors.param('请填写理赔类型与预估损失金额')

  let report = null
  if (disasterReportId) {
    report = await prisma.disasterReport.findUnique({ where: { id: Number(disasterReportId) } })
    if (!report) throw errors.notFound('关联的灾情记录不存在')
  }

  const { level, ratio } = assessLevel(amount)
  const suggestedPayout = Number((amount * ratio).toFixed(2))
  const detail =
    `AI 综合受灾类型与损失金额评估：受灾等级【${level}】。` +
    `参考赔付比例 ${(ratio * 100).toFixed(0)}%，建议理赔金额约 ${suggestedPayout} 元。` +
    `最终赔付以保险机构现场核定为准。`

  const claim = await prisma.insuranceClaim.create({
    data: {
      userId: req.user.id,
      disasterReportId: disasterReportId ? Number(disasterReportId) : null,
      claimType,
      estimatedAmount: amount,
      aiAssessLevel: level,
      assessDetail: detail,
      status: 'ASSESSING',
      insurerContact: '中国人保财险 农险服务专线 95518',
    },
  })
  ok(res, { ...claim, suggestedPayout }, '理赔评估完成，已生成理赔预估单')
}

/** 我的理赔记录 */
export async function list(req, res) {
  const rows = await prisma.insuranceClaim.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  })
  ok(res, rows)
}

/** 理赔详情 */
export async function detail(req, res) {
  const c = await prisma.insuranceClaim.findUnique({ where: { id: Number(req.params.id) } })
  if (!c) throw errors.notFound('理赔记录不存在')
  if (c.userId !== req.user.id && !['ADMIN'].includes(req.user.role)) throw errors.forbidden('无权查看')
  ok(res, c)
}
