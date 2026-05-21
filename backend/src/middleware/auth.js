import jwt from 'jsonwebtoken'
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

/** 必须登录 */
export function requireAuth(req, res, next) {
  const token = extractToken(req)
  if (!token) return next(errors.unauthorized())
  try {
    req.user = jwt.verify(token, config.jwt.secret)
    next()
  } catch {
    next(errors.unauthorized())
  }
}

/** 可选登录：有 token 解析，无则跳过 */
export function optionalAuth(req, res, next) {
  const token = extractToken(req)
  if (token) {
    try { req.user = jwt.verify(token, config.jwt.secret) } catch { /* 忽略 */ }
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
