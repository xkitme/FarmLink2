import jwt from 'jsonwebtoken'
import { prisma } from '../db.js'
import { config } from '../config/index.js'
import { errors } from '../utils/response.js'

/** 签发用户 Token */
export function signToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn })
}

/** 签发 Refresh Token */
export function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.refreshExpiresIn })
}

/** 解析 Authorization 头 */
function extractToken(req) {
  const h = req.headers['authorization']
  if (!h) return null
  return h.startsWith('Bearer ') ? h.slice(7) : h
}

function tokenChangedBeforePassword(decoded, user) {
  if (!user.passwordChangedAt || !decoded.iat) return false
  return decoded.iat * 1000 < user.passwordChangedAt.getTime() - 1000
}

function tokenPasswordSnapshotStale(decoded, user) {
  if (!user.passwordChangedAt || decoded.pwdAt === undefined || decoded.pwdAt === null) {
    return tokenChangedBeforePassword(decoded, user)
  }
  return Number(decoded.pwdAt) !== user.passwordChangedAt.getTime()
}

/** 校验 JWT 并确保签发时间晚于最近一次改密时间 */
export async function verifyAuthToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.secret)
    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.id) },
      select: {
        id: true,
        username: true,
        phone: true,
        role: true,
        regionCode: true,
        status: true,
        passwordChangedAt: true,
      },
    })
    if (!user || user.status !== 1) throw errors.unauthorized('账号不可用')
    if (tokenPasswordSnapshotStale(decoded, user)) {
      throw errors.unauthorized('密码已修改，请重新登录')
    }
    return {
      id: user.id,
      username: user.username,
      phone: user.phone,
      role: user.role,
      regionCode: user.regionCode,
    }
  } catch (e) {
    if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
      throw errors.unauthorized()
    }
    throw e
  }
}

/** 必须登录 */
export async function requireAuth(req, res, next) {
  const token = extractToken(req)
  if (!token) return next(errors.unauthorized())
  try {
    req.user = await verifyAuthToken(token)
    next()
  } catch (e) {
    next(e)
  }
}

/** 可选登录：有 token 解析，无则跳过 */
export async function optionalAuth(req, res, next) {
  const token = extractToken(req)
  if (token) {
    try { req.user = await verifyAuthToken(token) } catch { /* 忽略 */ }
  }
  next()
}

/** 角色校验（需先 requireAuth） */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(errors.unauthorized())
    if (!roles.includes(req.user.role)) return next(errors.forbidden())
    next()
  }
}
