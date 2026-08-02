import bcrypt from 'bcryptjs'
import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'
import { signToken, signRefreshToken, verifyAuthToken } from '../../middleware/auth.js'
import { buildPublicRegistrationData } from './auth.policy.js'

/** 去除敏感字段 */
export function sanitizeUser(user) {
  if (!user) return null
  const { passwordHash, passwordChangedAt, ...rest } = user
  return rest
}

/** Token 载荷 */
function tokenPayload(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    regionCode: user.regionCode,
    pwdAt: user.passwordChangedAt ? new Date(user.passwordChangedAt).getTime() : null,
  }
}

/** 构建登录会话返回体 */
export function buildSession(user) {
  const payload = tokenPayload(user)
  return {
    token: signToken(payload),
    refreshToken: signRefreshToken(payload),
    user: sanitizeUser(user),
  }
}

/** 注册 */
export async function register(req, res) {
  const username = `${req.body.username || ''}`.trim()
  const password = `${req.body.password || ''}`
  const phone = `${req.body.phone || ''}`.trim()
  if (!username || !password) throw errors.param('用户名和密码必填')
  if (password.length < 6) throw errors.param('密码至少 6 位')

  if (await prisma.user.findUnique({ where: { username } })) {
    throw errors.param('用户名已存在')
  }
  if (phone && await prisma.user.findUnique({ where: { phone } })) {
    throw errors.param('该手机号已注册')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: buildPublicRegistrationData(req.body, passwordHash),
  })
  ok(res, buildSession(user), '注册成功')
}

/** 登录（账号密码，后端校验） */
export async function login(req, res) {
  const { username, password } = req.body
  if (!username || !password) throw errors.param('请输入用户名和密码')

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw errors.param('用户名或密码错误')
  }
  if (user.status !== 1) throw errors.forbidden('账号已被禁用')

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  ok(res, buildSession(user), '登录成功')
}

/** 忘记密码：用账号 + 绑定手机号校验后重置密码 */
export async function resetPassword(req, res) {
  const username = `${req.body.username || ''}`.trim()
  const phone = `${req.body.phone || ''}`.trim()
  const newPassword = `${req.body.newPassword || ''}`

  if (!username || !phone || !newPassword) throw errors.param('账号、手机号和新密码必填')
  if (!/^1\d{10}$/.test(phone)) throw errors.param('请输入正确的手机号')
  if (newPassword.length < 6) throw errors.param('密码至少 6 位')

  const user = await prisma.user.findUnique({ where: { username } })
  const matchedPhone = user?.phone === phone || (!user?.phone && user?.username === phone)
  if (!user || user.status !== 1 || !matchedPhone) {
    throw errors.param('账号或绑定手机号不匹配')
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
    },
  })
  ok(res, null, '密码已重置，请使用新密码登录')
}

/** 刷新 Token */
export async function refresh(req, res) {
  const { refreshToken } = req.body
  if (!refreshToken) throw errors.param('缺少 refreshToken')
  let sessionUser
  try {
    sessionUser = await verifyAuthToken(refreshToken, 'refresh')
  } catch (e) {
    if (e.name === 'BusinessError') throw e
    throw errors.unauthorized('refreshToken 无效或已过期')
  }
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } })
  if (!user) throw errors.unauthorized()
  ok(res, { token: signToken(tokenPayload(user)) })
}

/** 退出（JWT 无状态，前端清除 Token 即可） */
export async function logout(req, res) {
  ok(res, null, '已退出登录')
}
