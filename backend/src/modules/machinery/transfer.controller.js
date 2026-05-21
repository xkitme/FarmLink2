import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams } from '../../utils/page.js'

// ── 土地流转 ────────────────────────────────

/** 土地流转信息列表 */
export async function transferList(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = {}
  if (req.query.transferType) where.transferType = req.query.transferType
  if (req.query.regionCode) where.regionCode = req.query.regionCode
  if (req.query.status) where.status = req.query.status
  else where.status = 'OPEN'
  const [records, total] = await Promise.all([
    prisma.landTransfer.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.landTransfer.count({ where }),
  ])
  okPage(res, { records, total, pageNum, pageSize })
}

/** 土地流转详情 */
export async function transferDetail(req, res) {
  const t = await prisma.landTransfer.findUnique({ where: { id: Number(req.params.id) } })
  if (!t) throw errors.notFound('流转信息不存在')
  ok(res, t)
}

/** 发布土地流转 */
export async function transferCreate(req, res) {
  const { title, areaMu, location, transferType, price, priceUnit, duration, description, contactPhone } = req.body
  if (!title || !areaMu) throw errors.param('标题和面积必填')
  const t = await prisma.landTransfer.create({
    data: {
      userId: req.user.id,
      title,
      areaMu: Number(areaMu) || 0,
      regionCode: req.user.regionCode || null,
      location: location || null,
      transferType: transferType || '出租',
      price: Number(price) || 0,
      priceUnit: priceUnit || '元/亩/年',
      duration: duration || null,
      description: description || null,
      contactPhone: contactPhone || null,
      status: 'OPEN',
    },
  })
  ok(res, t, '土地流转信息已发布')
}

/** 修改土地流转（含状态变更） */
export async function transferUpdate(req, res) {
  const id = Number(req.params.id)
  const exist = await prisma.landTransfer.findFirst({ where: { id, userId: req.user.id } })
  if (!exist) throw errors.notFound('流转信息不存在或无权操作')
  const { title, price, description, contactPhone, status } = req.body
  const data = {}
  if (title !== undefined) data.title = title
  if (price !== undefined) data.price = Number(price) || 0
  if (description !== undefined) data.description = description
  if (contactPhone !== undefined) data.contactPhone = contactPhone
  if (status !== undefined) data.status = status
  const t = await prisma.landTransfer.update({ where: { id }, data })
  ok(res, t, '已更新')
}

/** 删除土地流转 */
export async function transferRemove(req, res) {
  const id = Number(req.params.id)
  const exist = await prisma.landTransfer.findFirst({ where: { id, userId: req.user.id } })
  if (!exist) throw errors.notFound('流转信息不存在或无权操作')
  await prisma.landTransfer.delete({ where: { id } })
  ok(res, null, '已删除')
}

// ── 成本核算 ────────────────────────────────

/** 成本核算：聚合农资投入，可算利润率 */
export async function costSummary(req, res) {
  const year = Number(req.query.year) || new Date().getFullYear()
  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)

  const records = await prisma.farmRecord.findMany({
    where: { userId: req.user.id, recordDate: { gte: start, lt: end } },
  })
  const byType = {}
  let totalCost = 0
  for (const r of records) {
    byType[r.recordType] = (byType[r.recordType] || 0) + r.cost
    totalCost += r.cost
  }
  totalCost = Number(totalCost.toFixed(2))

  const result = {
    year,
    recordCount: records.length,
    totalCost,
    costByType: Object.entries(byType).map(([type, cost]) => ({ type, cost: Number(cost.toFixed(2)) })),
  }

  // 传入收入则计算利润
  if (req.query.income != null) {
    const income = Number(req.query.income) || 0
    const profit = Number((income - totalCost).toFixed(2))
    result.income = income
    result.profit = profit
    result.profitRate = income > 0 ? Number(((profit / income) * 100).toFixed(1)) : 0
    result.advice = profit >= 0
      ? `本年度净利润约 ${profit} 元，利润率 ${result.profitRate}%。`
      : `本年度成本超过收入 ${-profit} 元，建议优化农资投入结构、提高单产或售价。`
  }
  ok(res, result)
}
