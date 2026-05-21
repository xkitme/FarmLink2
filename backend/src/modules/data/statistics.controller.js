import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams, parseJson } from '../../utils/page.js'

function scopeWhere(req) {
  const where = {}
  if (req.user.role === 'VILLAGE' && req.user.regionCode) {
    where.regionCode = { startsWith: req.user.regionCode.slice(0, 9) }
  } else if (req.query.regionCode) {
    where.regionCode = String(req.query.regionCode)
  }
  if (req.query.year) where.year = Number(req.query.year)
  if (req.query.statType) where.statType = String(req.query.statType)
  if (req.query.status) where.status = String(req.query.status)
  return where
}

function normalizeReport(row) {
  return { ...row, dataJson: parseJson(row.dataJson, {}) }
}

/** 农业统计数据列表 */
export async function list(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = scopeWhere(req)
  if (!['ADMIN', 'VILLAGE'].includes(req.user.role)) where.reporterId = req.user.id
  const [rows, total] = await Promise.all([
    prisma.statReport.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.statReport.count({ where }),
  ])
  okPage(res, { records: rows.map(normalizeReport), total, pageNum, pageSize })
}

/** 创建统计上报 */
export async function create(req, res) {
  const { regionCode, statType, year, period, dataJson, status } = req.body
  if (!year) throw errors.param('请填写统计年份')
  if (!statType) throw errors.param('请填写统计类型')
  const report = await prisma.statReport.create({
    data: {
      regionCode: regionCode || req.user.regionCode || null,
      reporterId: req.user.id,
      statType,
      year: Number(year),
      period: period || null,
      dataJson: JSON.stringify(dataJson || {}),
      status: status && ['DRAFT', 'SUBMITTED', 'CONFIRMED'].includes(status) ? status : 'SUBMITTED',
    },
  })
  ok(res, normalizeReport(report), '统计数据已上报')
}

/** 更新统计状态 */
export async function updateStatus(req, res) {
  if (!['VILLAGE', 'ADMIN'].includes(req.user.role)) throw errors.forbidden('仅村委或管理员可确认统计数据')
  const id = Number(req.params.id)
  const { status } = req.body
  if (!['DRAFT', 'SUBMITTED', 'CONFIRMED'].includes(status)) throw errors.param('状态不合法')
  const exist = await prisma.statReport.findUnique({ where: { id } })
  if (!exist) throw errors.notFound('统计记录不存在')
  const report = await prisma.statReport.update({ where: { id }, data: { status } })
  ok(res, normalizeReport(report), '统计状态已更新')
}

/** 统计汇总：用于管理台图表 */
export async function summary(req, res) {
  const where = scopeWhere(req)
  const rows = await prisma.statReport.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 })
  const byType = new Map()
  const byStatus = new Map()
  for (const row of rows) {
    const type = row.statType || '其他'
    const status = row.status || 'UNKNOWN'
    byType.set(type, (byType.get(type) || 0) + 1)
    byStatus.set(status, (byStatus.get(status) || 0) + 1)
  }
  ok(res, {
    total: rows.length,
    byType: [...byType.entries()].map(([type, count]) => ({ type, count })),
    byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
    latest: rows.slice(0, 8).map(normalizeReport),
  })
}
