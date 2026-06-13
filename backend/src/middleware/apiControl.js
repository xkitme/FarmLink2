import jwt from 'jsonwebtoken'
import cache from '../utils/cache.js'
import { prisma } from '../db.js'
import { config, CODES } from '../config/index.js'
import { fail } from '../utils/response.js'

const SWITCH_CACHE_KEY = 'api-switch:map'
const SWITCH_CACHE_TTL = 10
const ADMIN_READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const RATE_LIMITS = {
  global: { windowSec: 60, limit: 100 },
  authLogin: { windowSec: 60, limit: 10 },
  sms: { windowSec: 3600, limit: 5 },
  upload: { windowSec: 3600, limit: 30 },
  adminRead: { windowSec: 60, limit: 600 },
  adminWrite: { windowSec: 60, limit: 120 },
}

const RULES = [
  { key: 'user_register', method: 'POST', pattern: /^\/auth\/register$/ },
  { key: 'ai_disease_detect', method: 'POST', pattern: /^\/agri\/disease\/detect$/ },
  { key: 'ai_weed_detect', method: 'POST', pattern: /^\/agri\/weed\/detect$/ },
  { key: 'ai_seed_detect', method: 'POST', pattern: /^\/agri\/seed\/detect$/ },
  { key: 'ai_yield_predict', method: 'POST', pattern: /^\/agri\/yield\/predict$/ },
  { key: 'ai_policy_qa', method: 'POST', pattern: /^\/policy\/ai\/ask$/ },
  { key: 'ai_policy_qa', method: 'POST', pattern: /^\/ai\/policy\/ask$/ },
  { key: 'ai_chat', method: 'POST', pattern: /^\/ai\/chat$/ },
  { key: 'ai_chat', method: 'POST', pattern: /^\/ai\/agri\/ask$/ },
  { key: 'ai_chat', method: 'POST', pattern: /^\/ai\/legal\/ask$/ },
  { key: 'ai_voice', method: 'POST', pattern: /^\/ai\/voice\/recognize$/ },
  { key: 'ai_grade_detect', method: 'POST', pattern: /^\/market\/grade\/detect$/ },
  { key: 'ai_fault_diagnose', method: 'POST', pattern: /^\/machinery\/fault\/diagnose$/ },
  { key: 'ai_claim_assess', method: 'POST', pattern: /^\/disaster\/claim\/assess$/ },
  { key: 'ai_copywriting', method: 'POST', pattern: /^\/market\/package\/generate$/ },
  { key: 'ai_copywriting', method: 'POST', pattern: /^\/market\/live\/script$/ },
  { key: 'ai_copywriting', method: 'POST', pattern: /^\/life\/tourism\/promote$/ },
  { key: 'ai_annual_report', method: 'POST', pattern: /^\/data\/annual-report\/generate$/ },
  { key: 'market_order', method: 'POST', pattern: /^\/market\/order$/ },
  { key: 'machinery_booking', method: 'POST', pattern: /^\/machinery\/booking$/ },
  { key: 'disaster_report', method: 'POST', pattern: /^\/disaster\/report$/ },
  { key: 'subsidy_apply', method: 'POST', pattern: /^\/policy\/subsidy\/apply$/ },
  { key: 'community_post', method: 'POST', pattern: /^\/life\/(help|secondhand|env\/report|folk|tourism)$/ },
  { key: 'media_upload', method: 'POST', pattern: /^\/(agri|market|ai|disaster)\/.*(detect|analyze|recognize|report|assess)/ },
  { key: 'offline_sync', method: 'POST', pattern: /^\/data\/sync$/ },
]

function clientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || 'unknown'
}

function apiPath(req) {
  const original = req.originalUrl.split('?')[0]
  return original.startsWith(config.apiPrefix) ? original.slice(config.apiPrefix.length) || '/' : original
}

function bearerPayload(req) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : h
  if (!token) return null
  try { return jwt.verify(token, config.jwt.secret) } catch { return null }
}

function ratePlan(req) {
  const path = apiPath(req)
  const method = req.method.toUpperCase()
  if (path.startsWith('/auth/login') || path.startsWith('/auth/reset-password')) {
    return { name: 'auth-login', ...RATE_LIMITS.authLogin, key: `ip:${clientIp(req)}` }
  }
  if (path.startsWith('/auth/sms')) {
    return { name: 'sms', ...RATE_LIMITS.sms, key: `ip:${clientIp(req)}` }
  }

  const payload = req.user || bearerPayload(req)
  const actor = payload?.id ? `user:${payload.id}` : `ip:${clientIp(req)}`
  if (payload?.role === 'ADMIN' && path.startsWith('/admin/')) {
    const plan = ADMIN_READ_METHODS.has(method)
      ? { name: 'admin-read', ...RATE_LIMITS.adminRead }
      : { name: 'admin-write', ...RATE_LIMITS.adminWrite }
    return { ...plan, key: actor }
  }

  const isAi = path.startsWith('/ai/')
    || path === '/policy/ai/ask'
    || path === '/policy/legal/ask'
    || path.includes('/detect')
    || path.includes('/diagnose')
    || path.includes('/assess')
    || path.includes('/generate')
  if (isAi) return { name: 'ai', windowSec: 3600, limit: config.aiRateLimit.perHour, key: actor }

  const isUpload = method === 'POST' && (
    path.includes('/detect')
    || path.includes('/analyze')
    || path.includes('/recognize')
    || path.includes('/report')
  )
  if (isUpload) return { name: 'upload', ...RATE_LIMITS.upload, key: actor }

  return { name: 'global', ...RATE_LIMITS.global, key: `ip:${clientIp(req)}` }
}

function incrRate(plan) {
  const bucket = Math.floor(Date.now() / (plan.windowSec * 1000))
  const key = `ratelimit:${plan.name}:${plan.key}:${bucket}`
  const current = (cache.get(key) || 0) + 1
  cache.set(key, current, plan.windowSec)
  return {
    current,
    remaining: Math.max(0, plan.limit - current),
    resetAt: (bucket + 1) * plan.windowSec * 1000,
  }
}

/** 全局限流：NodeCache 内存计数，适合轻量化运行。 */
export function rateLimitMiddleware(req, res, next) {
  if (!req.originalUrl.startsWith(config.apiPrefix)) return next()
  const plan = ratePlan(req)
  const state = incrRate(plan)
  res.setHeader('X-RateLimit-Policy', plan.name)
  res.setHeader('X-RateLimit-Limit', plan.limit)
  res.setHeader('X-RateLimit-Remaining', state.remaining)
  res.setHeader('X-RateLimit-Reset', state.resetAt)
  if (state.current > plan.limit) {
    return fail(res, CODES.RATE_LIMIT, `请求过于频繁，请稍后再试（${plan.name}）`)
  }
  next()
}

export function invalidateApiSwitchCache() {
  cache.del(SWITCH_CACHE_KEY)
}

export async function loadSwitchMap() {
  const cached = cache.get(SWITCH_CACHE_KEY)
  if (cached) return cached
  const rows = await prisma.apiSwitch.findMany()
  const map = new Map(rows.map((row) => [row.key, row]))
  cache.set(SWITCH_CACHE_KEY, map, SWITCH_CACHE_TTL)
  return map
}

function matchedSwitch(req) {
  const path = apiPath(req)
  const method = req.method.toUpperCase()
  if (path.startsWith('/admin/api-switch')) return null
  return RULES.find((rule) => (!rule.method || rule.method === method) && rule.pattern.test(path))
}

/** API 功能开关：开关缺失时默认放行，便于开发阶段逐步补齐。 */
export async function apiSwitchMiddleware(req, res, next) {
  if (!req.originalUrl.startsWith(config.apiPrefix)) return next()
  const rule = matchedSwitch(req)
  if (!rule) return next()
  try {
    const switches = await loadSwitchMap()
    const sw = switches.get(rule.key)
    req.apiSwitchKey = rule.key
    if (sw && !sw.enabled) {
      return fail(res, CODES.FORBIDDEN, `功能已关闭：${sw.name}`)
    }
  } catch {
    // SQLite 开关读取失败时放行，避免因管理表异常导致全站不可用。
  }
  next()
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body
  const clean = {}
  for (const [key, value] of Object.entries(body)) {
    if (/password|token|secret/i.test(key)) clean[key] = '[FILTERED]'
    else if (typeof value === 'string' && value.length > 300) clean[key] = `${value.slice(0, 300)}...`
    else if (Array.isArray(value)) clean[key] = value.length > 8 ? `[Array(${value.length})]` : value
    else if (value && typeof value === 'object') clean[key] = '[Object]'
    else clean[key] = value
  }
  return clean
}

function moduleName(path) {
  return path.split('/').filter(Boolean)[0] || 'system'
}

/** 操作日志：记录非 GET API，供后续管理台审计。 */
export function operationLogMiddleware(req, res, next) {
  const started = Date.now()
  res.on('finish', () => {
    if (!req.originalUrl.startsWith(config.apiPrefix)) return
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return
    const path = apiPath(req)
    const detail = {
      method: req.method,
      path,
      statusCode: res.statusCode,
      traceId: req.traceId,
      durationMs: Date.now() - started,
      query: req.query || {},
      body: sanitizeBody(req.body),
      apiSwitchKey: req.apiSwitchKey || null,
      rateLimitPolicy: res.getHeader('X-RateLimit-Policy') || null,
    }
    prisma.operationLog.create({
      data: {
        userId: req.user?.id || bearerPayload(req)?.id || null,
        module: moduleName(path),
        action: `${req.method} ${path}`,
        detail: JSON.stringify(detail),
        ip: clientIp(req),
      },
    }).catch(() => {})
  })
  next()
}

export function rateLimitSnapshot() {
  const keys = cache.keys().filter((key) => key.startsWith('ratelimit:'))
  return keys.map((key) => ({
    key,
    count: cache.get(key),
    ttl: cache.getTtl(key) ? Math.max(0, cache.getTtl(key) - Date.now()) : null,
  }))
}

export function rateLimitPolicies() {
  return [
    { name: 'global', ...RATE_LIMITS.global, scope: 'IP' },
    { name: 'auth-login', ...RATE_LIMITS.authLogin, scope: 'IP' },
    { name: 'sms', ...RATE_LIMITS.sms, scope: 'IP' },
    { name: 'ai', windowSec: 3600, limit: config.aiRateLimit.perHour, scope: '用户或IP' },
    { name: 'upload', ...RATE_LIMITS.upload, scope: '用户或IP' },
    { name: 'admin-read', ...RATE_LIMITS.adminRead, scope: '管理员用户' },
    { name: 'admin-write', ...RATE_LIMITS.adminWrite, scope: '管理员用户' },
  ]
}
