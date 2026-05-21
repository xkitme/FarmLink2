import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams, parseJson } from '../../utils/page.js'

const shape = (m) => ({ ...m, images: parseJson(m.images, []) })

/** 农机列表 */
export async function list(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = {}
  if (req.query.machineType) where.machineType = req.query.machineType
  if (req.query.regionCode) where.regionCode = req.query.regionCode
  if (req.query.onlyAvailable === '1') where.status = 1
  const [rows, total] = await Promise.all([
    prisma.machinery.findMany({ where, orderBy: { rating: 'desc' }, skip, take }),
    prisma.machinery.count({ where }),
  ])
  okPage(res, { records: rows.map(shape), total, pageNum, pageSize })
}

/** 我的农机 */
export async function mine(req, res) {
  const rows = await prisma.machinery.findMany({
    where: { ownerId: req.user.id },
    orderBy: { createdAt: 'desc' },
  })
  ok(res, rows.map(shape))
}

/** 农机详情 */
export async function detail(req, res) {
  const m = await prisma.machinery.findUnique({ where: { id: Number(req.params.id) } })
  if (!m) throw errors.notFound('农机不存在')
  const owner = await prisma.user.findUnique({
    where: { id: m.ownerId },
    select: { id: true, nickname: true, villageName: true, phone: true },
  })
  ok(res, { ...shape(m), owner })
}

/** 发布农机 */
export async function create(req, res) {
  const { machineName, machineType, dailyPrice, deposit, images, description, regionCode } = req.body
  if (!machineName) throw errors.param('农机名称必填')
  const m = await prisma.machinery.create({
    data: {
      ownerId: req.user.id,
      machineName,
      machineType: machineType || null,
      dailyPrice: Number(dailyPrice) || 0,
      deposit: Number(deposit) || 0,
      images: images ? JSON.stringify(images) : null,
      description: description || null,
      regionCode: regionCode || req.user.regionCode || null,
    },
  })
  ok(res, shape(m), '农机已发布')
}

/** 修改农机 */
export async function update(req, res) {
  const id = Number(req.params.id)
  const exist = await prisma.machinery.findFirst({ where: { id, ownerId: req.user.id } })
  if (!exist) throw errors.notFound('农机不存在或无权操作')

  const { machineName, machineType, dailyPrice, deposit, images, description, status } = req.body
  const data = {}
  if (machineName !== undefined) data.machineName = machineName
  if (machineType !== undefined) data.machineType = machineType
  if (dailyPrice !== undefined) data.dailyPrice = Number(dailyPrice) || 0
  if (deposit !== undefined) data.deposit = Number(deposit) || 0
  if (images !== undefined) data.images = images ? JSON.stringify(images) : null
  if (description !== undefined) data.description = description
  if (status !== undefined) data.status = Number(status)

  const m = await prisma.machinery.update({ where: { id }, data })
  ok(res, shape(m), '农机已更新')
}

/** 删除农机 */
export async function remove(req, res) {
  const id = Number(req.params.id)
  const exist = await prisma.machinery.findFirst({ where: { id, ownerId: req.user.id } })
  if (!exist) throw errors.notFound('农机不存在或无权操作')
  await prisma.machinery.delete({ where: { id } })
  ok(res, null, '农机已删除')
}
