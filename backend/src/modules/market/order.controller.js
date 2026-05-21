import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams, parseJson } from '../../utils/page.js'

const STATUS_FLOW = ['PENDING', 'PAID', 'SHIPPED', 'DONE', 'CANCELLED']

/** 下单 */
export async function create(req, res) {
  const { productId, quantity, receiverInfo, remark } = req.body
  const qty = Number(quantity) || 0
  if (!productId || qty <= 0) throw errors.param('请选择商品并填写数量')

  const product = await prisma.product.findUnique({ where: { id: Number(productId) } })
  if (!product || product.status !== 1) throw errors.notFound('商品不存在或已下架')
  if (product.sellerId === req.user.id) throw errors.param('不能购买自己发布的商品')
  if (product.stock < qty) throw errors.param(`库存不足，仅剩 ${product.stock} ${product.unit}`)

  const orderNo = 'OD' + Date.now() + Math.floor(Math.random() * 1000)
  const order = await prisma.order.create({
    data: {
      orderNo,
      buyerId: req.user.id,
      sellerId: product.sellerId,
      productId: product.id,
      quantity: qty,
      totalAmount: Number((product.price * qty).toFixed(2)),
      status: 'PENDING',
      receiverInfo: receiverInfo ? JSON.stringify(receiverInfo) : null,
      remark: remark || null,
    },
  })
  // 扣减库存
  await prisma.product.update({
    where: { id: product.id },
    data: { stock: { decrement: qty }, soldCount: { increment: qty } },
  })
  ok(res, order, '下单成功')
}

/** 订单列表（role=buyer 买家视角 / seller 卖家视角） */
export async function list(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const role = req.query.role === 'seller' ? 'seller' : 'buyer'
  const where = role === 'seller' ? { sellerId: req.user.id } : { buyerId: req.user.id }
  if (req.query.status) where.status = req.query.status

  const [rows, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.order.count({ where }),
  ])
  // 附带商品信息
  const productIds = [...new Set(rows.map((o) => o.productId))]
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } })
  const pmap = Object.fromEntries(products.map((p) => [p.id, p]))
  const records = rows.map((o) => ({
    ...o,
    receiverInfo: parseJson(o.receiverInfo, null),
    product: pmap[o.productId] ? { id: pmap[o.productId].id, title: pmap[o.productId].title, unit: pmap[o.productId].unit } : null,
  }))
  okPage(res, { records, total, pageNum, pageSize })
}

/** 订单详情 */
export async function detail(req, res) {
  const order = await prisma.order.findUnique({ where: { id: Number(req.params.id) } })
  if (!order) throw errors.notFound('订单不存在')
  if (order.buyerId !== req.user.id && order.sellerId !== req.user.id) {
    throw errors.forbidden('无权查看该订单')
  }
  const product = await prisma.product.findUnique({ where: { id: order.productId } })
  ok(res, { ...order, receiverInfo: parseJson(order.receiverInfo, null), product })
}

/** 更新订单状态 */
export async function updateStatus(req, res) {
  const id = Number(req.params.id)
  const { status } = req.body
  if (!STATUS_FLOW.includes(status)) throw errors.param('订单状态不合法')

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) throw errors.notFound('订单不存在')
  if (order.buyerId !== req.user.id && order.sellerId !== req.user.id) {
    throw errors.forbidden('无权操作该订单')
  }

  const data = { status }
  // 发货 → 生成物流单
  if (status === 'SHIPPED' && !order.logisticsNo) {
    const logisticsNo = 'SF' + Date.now()
    data.logisticsNo = logisticsNo
    await prisma.logistics.create({
      data: {
        orderId: order.id,
        logisticsNo,
        company: '顺丰速运',
        status: 'TRANSIT',
        currentLocation: '已揽收，运输中',
        isColdChain: true,
        fee: Number((8 + Math.random() * 12).toFixed(2)),
      },
    })
  }
  // 取消 → 回补库存
  if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
    await prisma.product.update({
      where: { id: order.productId },
      data: { stock: { increment: order.quantity }, soldCount: { decrement: order.quantity } },
    })
  }
  const updated = await prisma.order.update({ where: { id }, data })
  ok(res, updated, '订单状态已更新')
}

/** 物流追踪 */
export async function logistics(req, res) {
  const lg = await prisma.logistics.findFirst({
    where: { logisticsNo: req.params.no },
    orderBy: { createdAt: 'desc' },
  })
  if (!lg) throw errors.notFound('未查询到物流信息')
  ok(res, {
    ...lg,
    traces: [
      { time: lg.createdAt, desc: '快件已揽收' },
      { time: new Date(), desc: lg.currentLocation || '运输中' },
    ],
  })
}
