import bcrypt from 'bcryptjs'
import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams } from '../../utils/page.js'
import { sanitizeUser } from './auth.controller.js'
import { growthInfo } from './growth.js'

/** 个人资料（附带成长值/等级信息，前端 hero 与个人资料页共用） */
export async function getProfile(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } })
  if (!user) throw errors.notFound('用户不存在')
  ok(res, { ...sanitizeUser(user), growthInfo: growthInfo(user.growth) })
}

/** 成长值与等级（独立端点，供 hero / 个人资料页按需拉取） */
export async function getGrowth(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { growth: true },
  })
  if (!user) throw errors.notFound('用户不存在')
  ok(res, growthInfo(user.growth))
}

/** 更新个人资料 */
export async function updateProfile(req, res) {
  const { nickname, avatarUrl, realName, phone, villageName, regionCode, isElderMode } = req.body
  const data = {}
  if (nickname !== undefined) data.nickname = nickname
  if (avatarUrl !== undefined) data.avatarUrl = avatarUrl
  if (realName !== undefined) data.realName = realName
  if (villageName !== undefined) data.villageName = villageName
  if (regionCode !== undefined) data.regionCode = regionCode
  if (isElderMode !== undefined) data.isElderMode = !!isElderMode
  if (phone !== undefined) {
    const trimmed = (phone || '').trim()
    if (trimmed === '') {
      data.phone = null
    } else {
      if (!/^1\d{10}$/.test(trimmed)) throw errors.param('请输入有效的 11 位手机号')
      const exists = await prisma.user.findUnique({ where: { phone: trimmed } })
      if (exists && exists.id !== req.user.id) throw errors.param('该手机号已被其他账号绑定')
      data.phone = trimmed
    }
  }
  if (Object.keys(data).length === 0) throw errors.param('没有可更新的字段')

  const user = await prisma.user.update({ where: { id: req.user.id }, data })
  ok(res, sanitizeUser(user), '资料已更新')
}

/** 修改密码 */
export async function updatePassword(req, res) {
  const { oldPassword, newPassword } = req.body
  if (!oldPassword || !newPassword) {
    throw errors.param('请填写当前密码与新密码')
  }
  if (newPassword.length < 8) {
    throw errors.param('新密码至少 8 位')
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } })
  if (!user) throw errors.notFound('用户不存在')

  const isOk = await bcrypt.compare(oldPassword, user.passwordHash)
  if (!isOk) throw errors.param('当前密码不正确')

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
    },
  })

  ok(res, { ok: true }, '密码已修改，请重新登录')
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
