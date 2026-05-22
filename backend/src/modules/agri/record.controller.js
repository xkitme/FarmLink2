import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams, parseJson } from '../../utils/page.js'

/** 各作物固碳系数（吨 CO₂ / 亩 / 季，本地估值） */
const CARBON_FACTOR = {
  水稻: 0.45, 小麦: 0.38, 玉米: 0.52, 柑橘: 0.85, 油菜: 0.40,
  蔬菜: 0.25, 茶叶: 0.70, 猕猴桃: 0.78,
}

// ── 农事记录 ────────────────────────────────

/** 农事记录列表（可按地块、类型筛选） */
export async function list(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = { userId: req.user.id }
  if (req.query.plotId) where.plotId = Number(req.query.plotId)
  if (req.query.recordType) where.recordType = req.query.recordType
  const [rows, total] = await Promise.all([
    prisma.farmRecord.findMany({ where, orderBy: { recordDate: 'desc' }, skip, take }),
    prisma.farmRecord.count({ where }),
  ])
  const records = rows.map((r) => ({ ...r, images: parseJson(r.images, []) }))
  okPage(res, { records, total, pageNum, pageSize })
}

/** 新增农事记录 */
export async function create(req, res) {
  const { plotId, recordType, cropType, content, cost, images, recordDate, localUuid } = req.body
  if (!recordType) throw errors.param('请选择农事类型')
  const record = await prisma.farmRecord.create({
    data: {
      userId: req.user.id,
      plotId: plotId ? Number(plotId) : null,
      recordType,
      cropType: cropType || null,
      content: content || null,
      cost: Number(cost) || 0,
      images: images ? JSON.stringify(images) : null,
      recordDate: recordDate ? new Date(recordDate) : new Date(),
      localUuid: localUuid || null,
    },
  })
  ok(res, record, '农事记录已保存')
}

/** 修改农事记录 */
export async function update(req, res) {
  const id = Number(req.params.id)
  const exist = await prisma.farmRecord.findFirst({ where: { id, userId: req.user.id } })
  if (!exist) throw errors.notFound('记录不存在')

  const { recordType, cropType, content, cost, images, recordDate, plotId } = req.body
  const data = {}
  if (recordType !== undefined) data.recordType = recordType
  if (cropType !== undefined) data.cropType = cropType
  if (content !== undefined) data.content = content
  if (cost !== undefined) data.cost = Number(cost) || 0
  if (images !== undefined) data.images = images ? JSON.stringify(images) : null
  if (recordDate !== undefined) data.recordDate = new Date(recordDate)
  if (plotId !== undefined) data.plotId = plotId ? Number(plotId) : null

  const record = await prisma.farmRecord.update({ where: { id }, data })
  ok(res, record, '记录已更新')
}

/** 删除农事记录 */
export async function remove(req, res) {
  const id = Number(req.params.id)
  const exist = await prisma.farmRecord.findFirst({ where: { id, userId: req.user.id } })
  if (!exist) throw errors.notFound('记录不存在')
  await prisma.farmRecord.delete({ where: { id } })
  ok(res, null, '记录已删除')
}

// ── 农业碳汇计算 ─────────────────────────────

/** 碳汇计算并记录 */
export async function carbonCalc(req, res) {
  const { cropType, areaMu, plotId, method } = req.body
  if (!cropType || !areaMu) throw errors.param('请提供作物与面积')
  const factor = CARBON_FACTOR[cropType] ?? 0.35
  const area = Number(areaMu) || 0
  const carbonAmount = Number((factor * area).toFixed(2))

  const record = await prisma.carbonRecord.create({
    data: {
      userId: req.user.id,
      plotId: plotId ? Number(plotId) : null,
      cropType,
      areaMu: area,
      carbonAmount,
      method: method || '系数法估算',
      recordDate: new Date(),
    },
  })
  ok(res, {
    record,
    factor,
    carbonAmount,
    tradeRef: `按碳交易市场参考价 60 元/吨估算，本季约可产生碳汇收益 ${(carbonAmount * 60).toFixed(0)} 元。`,
    tip: '农田固碳量受耕作方式、秸秆还田、有机肥施用等影响，秸秆还田可显著提升固碳能力。',
  }, '碳汇计算完成')
}

/** 我的碳汇记录 */
export async function carbonList(req, res) {
  const rows = await prisma.carbonRecord.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  })
  const totalCarbon = Number(rows.reduce((s, r) => s + r.carbonAmount, 0).toFixed(2))
  ok(res, { records: rows, totalCarbon })
}
