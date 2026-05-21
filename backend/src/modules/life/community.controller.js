import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams, parseJson } from '../../utils/page.js'

// ── 邻里互助 ────────────────────────────────

/** 互助信息列表 */
export async function helpList(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = {}
  if (req.query.type) where.type = req.query.type
  if (req.query.status) where.status = req.query.status
  if (req.query.regionCode) where.regionCode = req.query.regionCode
  const [records, total] = await Promise.all([
    prisma.helpRequest.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.helpRequest.count({ where }),
  ])
  okPage(res, { records, total, pageNum, pageSize })
}

/** 发布互助 */
export async function helpCreate(req, res) {
  const { type, title, content, contactPhone } = req.body
  if (!title) throw errors.param('标题必填')
  const h = await prisma.helpRequest.create({
    data: {
      userId: req.user.id,
      type: type || '求助',
      title,
      content: content || null,
      regionCode: req.user.regionCode || null,
      contactPhone: contactPhone || req.user.phone || null,
      status: 'OPEN',
    },
  })
  ok(res, h, '已发布')
}

/** 响应互助（接单/认领） */
export async function helpAccept(req, res) {
  const id = Number(req.params.id)
  const h = await prisma.helpRequest.findUnique({ where: { id } })
  if (!h) throw errors.notFound('互助信息不存在')
  if (h.status !== 'OPEN') throw errors.param('该互助已被响应或已结束')
  if (h.userId === req.user.id) throw errors.param('不能响应自己发布的互助')
  const updated = await prisma.helpRequest.update({
    where: { id }, data: { helperId: req.user.id, status: 'DONE' },
  })
  ok(res, updated, '已响应，请与对方联系')
}

// ── 二手交易市场 ────────────────────────────

/** 二手列表 */
export async function secondhandList(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = {}
  if (req.query.category) where.category = req.query.category
  if (req.query.status) where.status = req.query.status
  else where.status = 'ON_SALE'
  if (req.query.regionCode) where.regionCode = req.query.regionCode
  const [rows, total] = await Promise.all([
    prisma.secondhandItem.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.secondhandItem.count({ where }),
  ])
  okPage(res, {
    records: rows.map((s) => ({ ...s, images: parseJson(s.images, []) })),
    total, pageNum, pageSize,
  })
}

/** 发布二手 */
export async function secondhandCreate(req, res) {
  const { title, category, description, price, images } = req.body
  if (!title || price == null) throw errors.param('标题和价格必填')
  const item = await prisma.secondhandItem.create({
    data: {
      sellerId: req.user.id,
      title,
      category: category || '其他',
      description: description || null,
      price: Number(price) || 0,
      images: images ? JSON.stringify(images) : null,
      regionCode: req.user.regionCode || null,
      status: 'ON_SALE',
    },
  })
  ok(res, item, '二手物品已发布')
}

/** 更新二手（改价/标记售出） */
export async function secondhandUpdate(req, res) {
  const id = Number(req.params.id)
  const exist = await prisma.secondhandItem.findFirst({ where: { id, sellerId: req.user.id } })
  if (!exist) throw errors.notFound('物品不存在或无权操作')
  const { price, description, status } = req.body
  const data = {}
  if (price !== undefined) data.price = Number(price) || 0
  if (description !== undefined) data.description = description
  if (status !== undefined) data.status = status
  const item = await prisma.secondhandItem.update({ where: { id }, data })
  ok(res, item, '已更新')
}

// ── 民俗文化记录 ────────────────────────────

/** 民俗文化列表 */
export async function folkList(req, res) {
  const where = {}
  if (req.query.cultureType) where.cultureType = req.query.cultureType
  if (req.query.regionCode) where.regionCode = req.query.regionCode
  const rows = await prisma.folkCulture.findMany({ where, orderBy: { createdAt: 'desc' } })
  ok(res, rows.map((f) => ({ ...f, images: parseJson(f.images, []) })))
}

/** 民俗文化详情 */
export async function folkDetail(req, res) {
  const f = await prisma.folkCulture.findUnique({ where: { id: Number(req.params.id) } })
  if (!f) throw errors.notFound('记录不存在')
  ok(res, { ...f, images: parseJson(f.images, []) })
}

/** 上传民俗文化记录 */
export async function folkCreate(req, res) {
  const { title, cultureType, content, images, videoUrl } = req.body
  if (!title) throw errors.param('标题必填')
  const f = await prisma.folkCulture.create({
    data: {
      userId: req.user.id,
      title,
      cultureType: cultureType || '民俗',
      regionCode: req.user.regionCode || null,
      content: content || null,
      images: images ? JSON.stringify(images) : null,
      videoUrl: videoUrl || null,
    },
  })
  ok(res, f, '民俗文化记录已保存到数字档案')
}

// ── 环境问题举报 ────────────────────────────

/** 提交环境举报 */
export async function envReport(req, res) {
  const { problemType, description, images, location } = req.body
  if (!description) throw errors.param('请描述环境问题')
  const r = await prisma.envReport.create({
    data: {
      userId: req.user.id,
      problemType: problemType || '其他',
      description,
      images: images ? JSON.stringify(images) : null,
      location: location ? JSON.stringify(location) : null,
      regionCode: req.user.regionCode || null,
      status: 'REPORTED',
    },
  })
  await prisma.notification.create({
    data: { userId: null, type: 'SYSTEM', title: '环境问题举报', content: `有村民举报环境问题：${problemType || '其他'}`, refId: r.id },
  })
  ok(res, r, '举报已提交，相关部门将跟进处理')
}

/** 环境举报列表 */
export async function envList(req, res) {
  const where = {}
  if (!['VILLAGE', 'ADMIN'].includes(req.user.role)) where.userId = req.user.id
  else if (req.query.status) where.status = req.query.status
  const rows = await prisma.envReport.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 })
  ok(res, rows.map((r) => ({ ...r, images: parseJson(r.images, []), location: parseJson(r.location, null) })))
}

/** 处理环境举报（村委/管理员） */
export async function envStatus(req, res) {
  if (!['VILLAGE', 'ADMIN'].includes(req.user.role)) throw errors.forbidden('仅村委可处理')
  const id = Number(req.params.id)
  const { status, handleResult } = req.body
  if (!['REPORTED', 'HANDLING', 'RESOLVED'].includes(status)) throw errors.param('状态不合法')
  const r = await prisma.envReport.findUnique({ where: { id } })
  if (!r) throw errors.notFound('举报记录不存在')
  const updated = await prisma.envReport.update({
    where: { id }, data: { status, handleResult: handleResult || r.handleResult },
  })
  ok(res, updated, '处理状态已更新')
}
