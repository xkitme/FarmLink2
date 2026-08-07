import { randomUUID } from 'node:crypto'
import { config } from '../config/index.js'
import { errors } from '../utils/response.js'

const WRITE_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])
const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'x-csrf-token'

const NATIVE_UA = /capacitor|ionic|cordova/i

function isNative(req) {
  return NATIVE_UA.test((req.headers['user-agent'] || '').toLowerCase())
}

/** login 成功后调用：签发 csrf_token cookie（非 HttpOnly，JS 可读） */
export function setCsrfCookie(res) {
  const token = randomUUID()
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/',
  })
  return token
}

/** 登出时清除 csrf cookie */
export function clearCsrfCookie(res) {
  res.clearCookie(CSRF_COOKIE, { path: '/' })
}

/** CSRF 校验中间件：写请求 double-submit cookie 模式 */
export function csrfGuard(req, res, next) {
  if (!WRITE_METHODS.has(req.method)) return next()
  if (isNative(req)) return next()

  const path = (req.originalUrl || req.url || '').split('?')[0]
  // 登录/刷新是 cookie 的"发行方"，自身不需要 CSRF 保护
  if (path.endsWith('/auth/login') || path.endsWith('/auth/refresh')) return next()

  const cookieToken = req.cookies?.[CSRF_COOKIE]
  const headerToken = req.headers[CSRF_HEADER]

  if (!cookieToken || !headerToken) {
    return next(errors.forbidden('CSRF 校验失败：缺少 token'))
  }
  if (cookieToken !== headerToken) {
    return next(errors.forbidden('CSRF 校验失败：token 不匹配'))
  }

  next()
}
