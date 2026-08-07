import { config } from '../config/index.js'
import { errors } from '../utils/response.js'

const DEV_ORIGIN_PREFIXES = [
  'http://localhost:',
  'http://127.0.0.1:',
  'capacitor://localhost',
]

const WRITE_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

// 对本地开发 + Capacitor 壳不硬要求 Origin 头
const ORIGIN_OPTIONAL_PREFIXES = [
  'capacitor://',
]

/**
 * 校验请求来源是否在允许范围内。
 * dev 环境宽松匹配 localhost / capacitor；非 dev 仅匹配 CORS_ORIGINS 精确列表。
 */
export function isOriginAllowed(origin) {
  if (!origin) return undefined // 让 cors() 的 origin 函数返回 undefined = 拒绝

  if (config.cors.explicitOrigins.includes(origin)) return origin

  if (config.cors.allowDevOrigins) {
    if (DEV_ORIGIN_PREFIXES.some((prefix) => origin.startsWith(prefix))) return origin
  }

  return undefined
}

function originRequired(req) {
  // Capacitor 等原生壳跨域请求无 Origin 头，视为受信来源
  const ua = (req.headers['user-agent'] || '').toLowerCase()
  if (ua.includes('capacitor') || ua.includes('ionic') || ua.includes('cordova')) {
    return false
  }
  // 同源请求无 Origin 头，配合 SameSite=Strict cookie 已防御 CSRF
  if (!req.headers['origin'] && !req.headers['referer']) {
    return false
  }
  // 其他请求必须带 Origin
  return true
}

/**
 * 对修改类请求校验 Origin，拒绝无 Origin 或非法来源的写操作。
 */
export function originGuard(req, res, next) {
  if (!WRITE_METHODS.has(req.method)) return next()

  const path = req.originalUrl.split('?')[0]
  if (path === '/health' || path.startsWith('/uploads/')) return next()

  const origin = req.headers['origin'] || req.headers['referer']?.split('?')[0]?.replace(/\/$/, '') || ''

  if (!origin) {
    if (!originRequired(req)) return next()
    return next(errors.forbidden('请求缺少来源标识'))
  }

  // 从完整 URL 提取 origin 部分用于比较
  let originBase = origin
  try {
    const u = new URL(origin)
    originBase = `${u.protocol}//${u.host}`
  } catch {
    // referer 可能不完整，直接用原始值比较
  }

  if (!isOriginAllowed(originBase)) {
    return next(errors.forbidden(`来源 ${originBase} 不被允许`))
  }

  next()
}
