import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams, parseJson } from '../../utils/page.js'

const shape = (p) => ({ ...p, images: parseJson(p.images, []) })

/** 商品列表（分页 + 分类/关键词筛选） */
export async function list(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = { status: 1 }
  if (req.query.category) where.category = req.query.category
  if (req.query.keyword) where.title = { contains: req.query.keyword }
  const [rows, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.product.count({ where }),
  ])
  okPage(res, { records: rows.map(shape), total, pageNum, pageSize })
}

/** 我发布的商品 */
export async function mine(req, res) {
  const rows = await prisma.product.findMany({
    where: { sellerId: req.user.id },
    orderBy: { createdAt: 'desc' },
  })
  ok(res, rows.map(shape))
}

/** 商品详情 */
export async function detail(req, res) {
  const p = await prisma.product.findUnique({ where: { id: Number(req.params.id) } })
  if (!p) throw errors.notFound('商品不存在')
  const seller = await prisma.user.findUnique({
    where: { id: p.sellerId },
    select: { id: true, nickname: true, villageName: true, phone: true },
  })
  ok(res, { ...shape(p), seller })
}

/** 发布商品 */
export async function create(req, res) {
  const { title, category, description, price, unit, stock, images, regionCode } = req.body
  if (!title || price == null) throw errors.param('商品标题和价格必填')
  const product = await prisma.product.create({
    data: {
      sellerId: req.user.id,
      title,
      category: category || '其他',
      description: description || null,
      price: Number(price) || 0,
      unit: unit || '斤',
      stock: Number(stock) || 0,
      images: images ? JSON.stringify(images) : null,
      regionCode: regionCode || req.user.regionCode || null,
    },
  })
  ok(res, shape(product), '商品已发布')
}

/** 修改商品 */
export async function update(req, res) {
  const id = Number(req.params.id)
  const exist = await prisma.product.findFirst({ where: { id, sellerId: req.user.id } })
  if (!exist) throw errors.notFound('商品不存在或无权操作')

  const { title, category, description, price, unit, stock, images, status } = req.body
  const data = {}
  if (title !== undefined) data.title = title
  if (category !== undefined) data.category = category
  if (description !== undefined) data.description = description
  if (price !== undefined) data.price = Number(price) || 0
  if (unit !== undefined) data.unit = unit
  if (stock !== undefined) data.stock = Number(stock) || 0
  if (images !== undefined) data.images = images ? JSON.stringify(images) : null
  if (status !== undefined) data.status = Number(status)

  const product = await prisma.product.update({ where: { id }, data })
  ok(res, shape(product), '商品已更新')
}

/** 删除商品 */
export async function remove(req, res) {
  const id = Number(req.params.id)
  const exist = await prisma.product.findFirst({ where: { id, sellerId: req.user.id } })
  if (!exist) throw errors.notFound('商品不存在或无权操作')
  await prisma.product.delete({ where: { id } })
  ok(res, null, '商品已删除')
}
