import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams, parseJson } from '../../utils/page.js'

/** 按损失估算受灾等级 */
function lossLevel(area, loss) {
  const perMu = area > 0 ? loss / area : loss
  if (loss >= 5000 || perMu >= 2000) return '重'
  if (loss >= 1500 || perMu >= 800) return '中'
  return '轻'
}

/** 灾情快速上报 */
export async function create(req, res) {
  const { disasterType, plotId, affectedArea, estimatedLoss, description, images, location, localUuid } = req.body
  if (!disasterType) throw errors.param('请选择灾害类型')
  const area = Number(affectedArea) || 0
  const loss = Number(estimatedLoss) || 0

  const report = await prisma.disasterReport.create({
    data: {
      userId: req.user.id,
      disasterType,
      plotId: plotId ? Number(plotId) : null,
      affectedArea: area,
      estimatedLoss: loss,
      description: description || null,
      images: images ? JSON.stringify(images) : null,
      location: location ? JSON.stringify(location) : null,
      aiLossLevel: lossLevel(area, loss),
      status: 'REPORTED',
      regionCode: req.user.regionCode || null,
      localUuid: localUuid || null,
    },
  })

  // 通知村委（同区域 VILLAGE 角色）
  await prisma.notification.create({
    data: {
      userId: null,
      type: 'ALERT',
      title: '新灾情上报',
      content: `${req.user.regionCode || ''} 上报${disasterType}灾情，受灾约 ${area} 亩，预估损失 ${loss} 元。`,
      refId: report.id,
    },
  })

  ok(res, report, '灾情已上报，村委将尽快核实')
}

/** 灾情记录列表（村委可查本区域全部，普通用户查自己） */
export async function list(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = {}
  if (['VILLAGE', 'ADMIN'].includes(req.user.role)) {
    if (req.user.regionCode && req.user.role === 'VILLAGE') {
      where.regionCode = { startsWith: req.user.regionCode.slice(0, 9) }
    }
    if (req.query.status) where.status = req.query.status
  } else {
    where.userId = req.user.id
  }
  const [rows, total] = await Promise.all([
    prisma.disasterReport.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.disasterReport.count({ where }),
  ])
  const records = rows.map((r) => ({
    ...r,
    images: parseJson(r.images, []),
    location: parseJson(r.location, null),
  }))
  okPage(res, { records, total, pageNum, pageSize })
}

/** 灾情详情 */
export async function detail(req, res) {
  const r = await prisma.disasterReport.findUnique({ where: { id: Number(req.params.id) } })
  if (!r) throw errors.notFound('灾情记录不存在')
  if (r.userId !== req.user.id && !['VILLAGE', 'ADMIN'].includes(req.user.role)) {
    throw errors.forbidden('无权查看')
  }
  ok(res, { ...r, images: parseJson(r.images, []), location: parseJson(r.location, null) })
}

/** 更新灾情处理状态（村委/管理员） */
export async function updateStatus(req, res) {
  if (!['VILLAGE', 'ADMIN'].includes(req.user.role)) throw errors.forbidden('仅村委可处理灾情')
  const id = Number(req.params.id)
  const { status } = req.body
  if (!['REPORTED', 'REVIEWING', 'PROCESSED'].includes(status)) throw errors.param('状态不合法')
  const r = await prisma.disasterReport.findUnique({ where: { id } })
  if (!r) throw errors.notFound('灾情记录不存在')
  const updated = await prisma.disasterReport.update({ where: { id }, data: { status } })
  ok(res, updated, '处理状态已更新')
}
