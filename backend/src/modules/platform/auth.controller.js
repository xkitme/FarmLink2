import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../db.js'
import { config, ROLES } from '../../config/index.js'
import { ok, errors } from '../../utils/response.js'
import { signToken, signRefreshToken } from '../../middleware/auth.js'
import { setSmsCode, getSmsCode, delSmsCode } from '../../utils/cache.js'

/** 去除敏感字段 */
export function sanitizeUser(user) {
  if (!user) return null
  const { passwordHash, ...rest } = user
  return rest
}

/** Token 载荷 */
function tokenPayload(user) {
  return { id: user.id, username: user.username, role: user.role, regionCode: user.regionCode }
}

/** 构建登录会话返回体 */
export function buildSession(user) {
  return {
    token: signToken(tokenPayload(user)),
    refreshToken: signRefreshToken({ id: user.id }),
    user: sanitizeUser(user),
  }
}

/** 注册 */
export async function register(req, res) {
  const { username, password, nickname, phone, role, regionCode, villageName } = req.body
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
    data: {
      username,
      passwordHash,
      nickname: nickname || username,
      phone: phone || null,
      role: role && ROLES[role] ? role : ROLES.FARMER,
      regionCode: regionCode || null,
      villageName: villageName || null,
    },
  })
  ok(res, buildSession(user), '注册成功')
}

/** 登录（账号密码 或 手机验证码） */
export async function login(req, res) {
  const { username, phone, password, smsCode } = req.body
  let user

  if (username && password) {
    user = await prisma.user.findUnique({ where: { username } })
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw errors.param('用户名或密码错误')
    }
  } else if (phone && smsCode) {
    const real = getSmsCode(phone)
    if (!real || real !== String(smsCode)) throw errors.param('验证码错误或已过期')
    user = await prisma.user.findUnique({ where: { phone } })
    if (!user) throw errors.notFound('该手机号未注册')
    delSmsCode(phone)
  } else {
    throw errors.param('请提供账号密码或手机验证码')
  }

  if (user.status !== 1) throw errors.forbidden('账号已被禁用')
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  ok(res, buildSession(user), '登录成功')
}

/** 发送短信验证码（离线环境直接返回验证码） */
export async function sendSms(req, res) {
  const { phone } = req.body
  if (!phone || !/^1\d{10}$/.test(phone)) throw errors.param('手机号格式不正确')
  const code = String(Math.floor(100000 + Math.random() * 900000))
  setSmsCode(phone, code)
  ok(res, { phone, code, tip: '离线演示环境，验证码直接返回，5 分钟内有效' })
}

/** 微信登录（离线 mock：按 openId 自动注册/登录） */
export async function wechatLogin(req, res) {
  const { openId, nickname } = req.body
  if (!openId) throw errors.param('缺少 openId')

  const oauth = await prisma.userOauth.findUnique({
    where: { platform_openId: { platform: 'wechat', openId } },
  })
  let user
  if (oauth) {
    user = await prisma.user.findUnique({ where: { id: oauth.userId } })
  } else {
    user = await prisma.user.create({
      data: {
        username: `wx_${openId.slice(0, 16)}`,
        passwordHash: '-',
        nickname: nickname || '微信用户',
        role: ROLES.FARMER,
      },
    })
    await prisma.userOauth.create({ data: { userId: user.id, platform: 'wechat', openId } })
  }
  ok(res, buildSession(user), '登录成功')
}

/** 刷新 Token */
export async function refresh(req, res) {
  const { refreshToken } = req.body
  if (!refreshToken) throw errors.param('缺少 refreshToken')
  let payload
  try {
    payload = jwt.verify(refreshToken, config.jwt.secret)
  } catch {
    throw errors.unauthorized('refreshToken 无效或已过期')
  }
  const user = await prisma.user.findUnique({ where: { id: payload.id } })
  if (!user) throw errors.unauthorized()
  ok(res, { token: signToken(tokenPayload(user)) })
}

/** 退出（JWT 无状态，前端清除 Token 即可） */
export async function logout(req, res) {
  ok(res, null, '已退出登录')
}
