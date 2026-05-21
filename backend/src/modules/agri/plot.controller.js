import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'

/** 我的地块列表 */
export async function list(req, res) {
  const plots = await prisma.landPlot.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  })
  ok(res, plots)
}

/** 地块详情 */
export async function detail(req, res) {
  const plot = await prisma.landPlot.findFirst({
    where: { id: Number(req.params.id), userId: req.user.id },
  })
  if (!plot) throw errors.notFound('地块不存在')
  ok(res, plot)
}

/** 新增地块 */
export async function create(req, res) {
  const { plotName, areaMu, cropType, soilType, boundaryGeojson, regionCode, localUuid } = req.body
  if (!plotName) throw errors.param('地块名称必填')
  const plot = await prisma.landPlot.create({
    data: {
      userId: req.user.id,
      plotName,
      areaMu: Number(areaMu) || 0,
      cropType: cropType || null,
      soilType: soilType || null,
      boundaryGeojson: boundaryGeojson || null,
      regionCode: regionCode || req.user.regionCode || null,
      localUuid: localUuid || null,
    },
  })
  ok(res, plot, '地块已创建')
}

/** 修改地块 */
export async function update(req, res) {
  const id = Number(req.params.id)
  const exist = await prisma.landPlot.findFirst({ where: { id, userId: req.user.id } })
  if (!exist) throw errors.notFound('地块不存在')

  const { plotName, areaMu, cropType, soilType, boundaryGeojson } = req.body
  const data = {}
  if (plotName !== undefined) data.plotName = plotName
  if (areaMu !== undefined) data.areaMu = Number(areaMu) || 0
  if (cropType !== undefined) data.cropType = cropType
  if (soilType !== undefined) data.soilType = soilType
  if (boundaryGeojson !== undefined) data.boundaryGeojson = boundaryGeojson

  const plot = await prisma.landPlot.update({ where: { id }, data })
  ok(res, plot, '地块已更新')
}

/** 删除地块 */
export async function remove(req, res) {
  const id = Number(req.params.id)
  const exist = await prisma.landPlot.findFirst({ where: { id, userId: req.user.id } })
  if (!exist) throw errors.notFound('地块不存在')
  await prisma.landPlot.delete({ where: { id } })
  ok(res, null, '地块已删除')
}
