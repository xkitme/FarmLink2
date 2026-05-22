import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'

/** 收购站地图（带坐标，缺失坐标则在区域中心附近生成默认坐标） */
export async function buyerMap(req, res) {
  const where = {}
  if (req.query.regionCode) where.regionCode = { startsWith: req.query.regionCode.slice(0, 6) }
  const rows = await prisma.buyer.findMany({ where })
  // 蒲江县中心约 (103.50, 30.20)
  const list = rows.map((b, i) => ({
    ...b,
    lat: b.lat ?? Number((30.20 + (Math.random() - 0.5) * 0.15).toFixed(5)),
    lng: b.lng ?? Number((103.50 + (Math.random() - 0.5) * 0.15).toFixed(5)),
  }))
  ok(res, list)
}

/** 收购站列表 */
export async function buyerList(req, res) {
  const rows = await prisma.buyer.findMany({ orderBy: { id: 'asc' } })
  ok(res, rows)
}

/** 农资团购列表 */
export async function groupBuyList(req, res) {
  const where = {}
  if (req.query.status) where.status = req.query.status
  const rows = await prisma.groupBuy.findMany({ orderBy: { createdAt: 'desc' } })
  ok(res, rows.map((g) => ({
    ...g,
    progress: g.targetCount > 0 ? Math.min(100, Math.round((g.currentCount / g.targetCount) * 100)) : 0,
  })))
}

/** 发起农资团购 */
export async function groupBuyCreate(req, res) {
  const { title, itemName, category, unitPrice, targetCount, deadline } = req.body
  if (!title || !itemName || unitPrice == null) throw errors.param('团购标题、品名、单价必填')
  const gb = await prisma.groupBuy.create({
    data: {
      initiatorId: req.user.id,
      title,
      itemName,
      category: category || '化肥',
      unitPrice: Number(unitPrice) || 0,
      targetCount: Number(targetCount) || 0,
      currentCount: 0,
      regionCode: req.user.regionCode || null,
      deadline: deadline ? new Date(deadline) : new Date(Date.now() + 7 * 86400000),
      status: 'OPEN',
    },
  })
  ok(res, gb, '团购已发起')
}

/** 参与团购 */
export async function groupBuyJoin(req, res) {
  const id = Number(req.params.id)
  const gb = await prisma.groupBuy.findUnique({ where: { id } })
  if (!gb) throw errors.notFound('团购不存在')
  if (gb.status !== 'OPEN') throw errors.param('该团购已结束')

  const count = Number(req.body.count) || 1
  const updated = await prisma.groupBuy.update({
    where: { id },
    data: {
      currentCount: { increment: count },
      status: gb.currentCount + count >= gb.targetCount ? 'SUCCESS' : 'OPEN',
    },
  })
  ok(res, updated, updated.status === 'SUCCESS' ? '参团成功，团购已成团！' : '参团成功')
}
