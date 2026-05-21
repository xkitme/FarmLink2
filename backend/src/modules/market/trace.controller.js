import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'
import { parseJson } from '../../utils/page.js'

/** 生成溯源码（为商品绑定溯源码并写入首条种植记录） */
export async function generate(req, res) {
  const { productId } = req.body
  if (!productId) throw errors.param('请指定商品')
  const product = await prisma.product.findFirst({
    where: { id: Number(productId), sellerId: req.user.id },
  })
  if (!product) throw errors.notFound('商品不存在或无权操作')

  let traceCode = product.traceCode
  if (!traceCode) {
    traceCode = 'TR' + Date.now() + Math.floor(Math.random() * 1000)
    await prisma.product.update({ where: { id: product.id }, data: { traceCode } })
    await prisma.traceRecord.create({
      data: {
        traceCode,
        productId: product.id,
        stage: '种植',
        description: `${product.title} 开始种植，已建立全程溯源档案。`,
        operator: req.user.username,
      },
    })
  }
  ok(res, {
    traceCode,
    qrContent: `farmlink://trace/${traceCode}`,
    tip: '可将溯源码生成二维码印于包装，消费者扫码即可查看全程信息。',
  }, '溯源码已生成')
}

/** 添加溯源环节记录 */
export async function addRecord(req, res) {
  const { code } = req.params
  const { stage, description, images } = req.body
  if (!stage) throw errors.param('请填写溯源环节')
  const product = await prisma.product.findFirst({ where: { traceCode: code } })
  if (!product) throw errors.notFound('溯源码不存在')
  if (product.sellerId !== req.user.id) throw errors.forbidden('无权操作')

  const record = await prisma.traceRecord.create({
    data: {
      traceCode: code,
      productId: product.id,
      stage,
      description: description || null,
      images: images ? JSON.stringify(images) : null,
      operator: req.user.username,
    },
  })
  ok(res, record, '溯源记录已添加')
}

/** 溯源查询（公开） */
export async function query(req, res) {
  const { code } = req.params
  const product = await prisma.product.findFirst({ where: { traceCode: code } })
  if (!product) throw errors.notFound('未查询到该溯源码')
  const records = await prisma.traceRecord.findMany({
    where: { traceCode: code },
    orderBy: { recordTime: 'asc' },
  })
  const seller = await prisma.user.findUnique({
    where: { id: product.sellerId },
    select: { nickname: true, villageName: true },
  })
  ok(res, {
    traceCode: code,
    product: { id: product.id, title: product.title, category: product.category },
    producer: seller,
    records: records.map((r) => ({ ...r, images: parseJson(r.images, []) })),
  })
}
