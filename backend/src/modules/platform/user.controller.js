import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams } from '../../utils/page.js'
import { sanitizeUser } from './auth.controller.js'

/** 个人资料 */
export async function getProfile(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } })
  if (!user) throw errors.notFound('用户不存在')
  ok(res, sanitizeUser(user))
}

/** 更新个人资料 */
export async function updateProfile(req, res) {
  const { nickname, avatarUrl, realName, villageName, regionCode, isElderMode } = req.body
  const data = {}
  if (nickname !== undefined) data.nickname = nickname
  if (avatarUrl !== undefined) data.avatarUrl = avatarUrl
  if (realName !== undefined) data.realName = realName
  if (villageName !== undefined) data.villageName = villageName
  if (regionCode !== undefined) data.regionCode = regionCode
  if (isElderMode !== undefined) data.isElderMode = !!isElderMode
  if (Object.keys(data).length === 0) throw errors.param('没有可更新的字段')

  const user = await prisma.user.update({ where: { id: req.user.id }, data })
  ok(res, sanitizeUser(user), '资料已更新')
}

/** 积分余额 */
export async function getPoints(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { points: true },
  })
  ok(res, { points: user?.points || 0 })
}

/** 积分流水 */
export async function getPointsLog(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = { userId: req.user.id }
  const [records, total] = await Promise.all([
    prisma.pointsLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.pointsLog.count({ where }),
  ])
  okPage(res, { records, total, pageNum, pageSize })
}
