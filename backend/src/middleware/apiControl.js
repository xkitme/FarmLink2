import jwt from 'jsonwebtoken'
import cache from '../utils/cache.js'
import { clientIp } from '../utils/client-ip.js'
import { prisma } from '../db.js'
import { config, CODES } from '../config/index.js'
import { fail } from '../utils/response.js'
import { CAPABILITY_REGISTRY } from '../contracts/capabilities.js'

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

export const RULES = [
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

function apiOriginalPath(req) {
  return req.originalUrl.split('?')[0]
}

/** 是否为 API 请求：/api/v1 或 /api/v2（116f-B：v2 复用同一条安全链）。 */
function isApiRequest(req) {
  const original = apiOriginalPath(req)
  return original.startsWith(config.apiPrefix) || original.startsWith(config.apiPrefixV2)
}

function apiPath(req) {
  const original = apiOriginalPath(req)
  for (const prefix of [config.apiPrefixV2, config.apiPrefix]) {
    if (original.startsWith(prefix)) return original.slice(prefix.length) || '/'
  }
  return original
}

/**
 * v2 注册表索引（116f-C）：v2 请求的 ratePlan/switchKey 由注册表元数据驱动
 * （docs/116f-APIv2与能力注册表.md §5.4），v1 的 regex 分类逻辑保持不动。
 * capabilities.js 为零依赖纯数据模块，此处构建索引无循环依赖。
 * 索引值为 { api, capabilityId }，供 resolveV2ApiPolicy 返回命中证据。
 */
const V2_API_INDEX = new Map()
for (const cap of CAPABILITY_REGISTRY.capabilities) {
  for (const api of cap.apis) {
    if (api.version === 'v2') V2_API_INDEX.set(`${api.method} ${api.path}`, { api, capabilityId: cap.id })
  }
}

/** 模板路径匹配：'/market/products/:id' 命中 '/market/products/123'（':seg' 通配单段，段数必须相等）。 */
function templatePathMatches(concrete, template) {
  const a = concrete.split('/').filter(Boolean)
  const b = template.split('/').filter(Boolean)
  if (a.length !== b.length) return false
  return b.every((seg, i) => seg.startsWith(':') || seg === a[i])
}

/**
 * v2 请求策略解析（纯函数，无副作用；生产中间件与测试共用同一实现）。
 *
 * 接受的 path 形态（middleware 实际到达的形态 + 直接调用形态）：
 * - mount-relative：'/market/products'、'/market/products/123'；
 * - 完整路径：'/api/v2/market/products'（自动剥离 apiPrefixV2）；
 * - 带 query string：'...?pageNum=1'（剥离 '?...'）；
 * - 参数路径：具体 id 与模板 ':id' 双向命中；
 * - 尾斜杠：'/market/products/' 与 '/market/products' 等价（与 Express 非严格路由一致）。
 *
 * @returns {{matched:boolean, capabilityId:string|null, apiId:string|null, ratePlan:string|null, switchKey:string|null}}
 * matched=false 表示未命中注册表——明确走既有 fallback（global 桶 / 无开关），绝不假装已登记。
 */
export function resolveV2ApiPolicy(method, path) {
  const raw = `${path || ''}`.split('?')[0]
  let relative = raw
  if (relative.startsWith(config.apiPrefixV2)) {
    relative = relative.slice(config.apiPrefixV2.length) || '/'
  }
  const methodKey = `${method}`.toUpperCase()

  const exact = V2_API_INDEX.get(`${methodKey} ${relative}`)
  if (exact) {
    return {
      matched: true,
      capabilityId: exact.capabilityId,
      apiId: exact.api.apiId,
      ratePlan: exact.api.ratePlan,
      switchKey: exact.api.switchKey,
    }
  }
  for (const [key, entry] of V2_API_INDEX) {
    const [m, template] = key.split(' ')
    if (m === methodKey && templatePathMatches(relative, template)) {
      return {
        matched: true,
        capabilityId: entry.capabilityId,
        apiId: entry.api.apiId,
        ratePlan: entry.api.ratePlan,
        switchKey: entry.api.switchKey,
      }
    }
  }
  return { matched: false, capabilityId: null, apiId: null, ratePlan: null, switchKey: null }
}

/** v1 限流桶纯解析（既有 ratePlan 分类逻辑的纯函数形态，供中间件与测试共用，不改行为）。 */
export function v1RateBucket(method, path) {
  if (path.startsWith('/auth/login') || path.startsWith('/auth/reset-password')) {
    return { name: 'auth-login', ...RATE_LIMITS.authLogin }
  }
  if (path.startsWith('/auth/sms')) {
    return { name: 'sms', ...RATE_LIMITS.sms }
  }
  if (path.startsWith('/ai/tts')) {
    return { name: 'tts', windowSec: 3600, limit: 300 }
  }
  const isAi = path.startsWith('/ai/')
    || path === '/policy/ai/ask'
    || path === '/policy/legal/ask'
    || path.includes('/detect')
    || path.includes('/diagnose')
    || path.includes('/assess')
    || path.includes('/generate')
  if (isAi) return { name: 'ai', windowSec: 3600, limit: config.aiRateLimit.perHour }

  const isUpload = method === 'POST' && (
    path.includes('/detect')
    || path.includes('/analyze')
    || path.includes('/recognize')
    || path.includes('/report')
  )
  if (isUpload) return { name: 'upload', ...RATE_LIMITS.upload }

  return { name: 'global', ...RATE_LIMITS.global }
}

/** v2 限流桶纯解析：注册表 ratePlan 元数据驱动；未登记/缺省 → global（与 v1 缺省语义一致）。 */
export function v2RateBucket(method, path) {
  const policy = resolveV2ApiPolicy(method, path)
  const name = policy.matched && policy.ratePlan ? policy.ratePlan : 'global'
  if (name === 'authLogin' || name === 'sms' || name === 'upload' || name === 'adminRead' || name === 'adminWrite') {
    return { name, ...RATE_LIMITS[name] }
  }
  if (name === 'tts') return { name, windowSec: 3600, limit: 300 }
  if (name === 'ai') return { name, windowSec: 3600, limit: config.aiRateLimit.perHour }
  return { name: 'global', ...RATE_LIMITS.global }
}

/** v1 开关 key 纯解析（RULES method+regex，行为与 116f-B 之前完全一致）。 */
export function v1SwitchKeyFor(method, path) {
  for (const rule of RULES) {
    if ((!rule.method || rule.method === method) && rule.pattern.test(path)) return rule.key
  }
  return null
}

/**
 * v1 限流策略纯解析（含 ADMIN 分桶；116f-C 提取重构，行为与重构前逐项一致）。
 * ratePlan() 与测试共用本函数，ADMIN 分支保持「先于普通分类」的既有优先级。
 */
export function resolveV1RatePolicy(method, path, role) {
  if (role === 'ADMIN' && path.startsWith('/admin/')) {
    const plan = ADMIN_READ_METHODS.has(method)
      ? { name: 'admin-read', ...RATE_LIMITS.adminRead }
      : { name: 'admin-write', ...RATE_LIMITS.adminWrite }
    return plan
  }
  return v1RateBucket(method, path)
}

/** v2 开关 key 纯解析：注册表 switchKey 元数据驱动；未登记 → null（与 v1 未命中一致）。 */
export function v2SwitchKeyFor(method, path) {
  const policy = resolveV2ApiPolicy(method, path)
  return policy.matched ? policy.switchKey : null
}

/** 限流桶 key 语义：auth-login/sms/global 按 IP；其余按用户（无用户回落 IP）。 */
function bucketKey(bucket, payload, req) {
  const actor = payload?.id ? `user:${payload.id}` : `ip:${clientIp(req)}`
  if (bucket.name === 'auth-login' || bucket.name === 'sms' || bucket.name === 'global') {
    return `ip:${clientIp(req)}`
  }
  return actor
}

function bearerPayload(req) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : h
  if (!token) return null
  try { return jwt.verify(token, config.jwt.secret) } catch { return null }
}

function ratePlan(req) {
  const original = apiOriginalPath(req)
  const method = req.method.toUpperCase()
  const path = apiPath(req)

  // 116f-C：v2 请求的限流桶由注册表 ratePlan 元数据确定（v1 regex 分类逻辑保持不动）
  if (original.startsWith(config.apiPrefixV2)) {
    const bucket = v2RateBucket(method, path)
    const payload = req.user || bearerPayload(req)
    return { ...bucket, key: bucketKey(bucket, payload, req) }
  }

  // v1：既有行为逐项保留（ADMIN 分桶在前，其余走纯分类器；与 resolveV1RatePolicy 同一实现）
  const payload = req.user || bearerPayload(req)
  const bucket = resolveV1RatePolicy(method, path, payload?.role)
  const actor = payload?.id ? `user:${payload.id}` : `ip:${clientIp(req)}`
  if (bucket.name === 'admin-read' || bucket.name === 'admin-write') {
    return { ...bucket, key: actor }
  }
  return { ...bucket, key: bucketKey(bucket, payload, req) }
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
  if (!isApiRequest(req)) return next()
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
  const original = apiOriginalPath(req)
  // v2 由注册表 switchKey 元数据驱动；v1 沿用 RULES method+regex（行为不变）
  const key = original.startsWith(config.apiPrefixV2)
    ? v2SwitchKeyFor(method, path)
    : v1SwitchKeyFor(method, path)
  return key ? { key } : null
}

/** API 功能开关：开关缺失时默认放行，便于开发阶段逐步补齐。 */
export async function apiSwitchMiddleware(req, res, next) {
  if (!isApiRequest(req)) return next()
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

const SENSITIVE_KEY_PATTERN = /password|token|secret|resetCode|verificationCode|otp|passwd|api[_-]?key|credential|auth|sign(?:ature)?/i
const MAX_SANITIZE_DEPTH = 3

/**
 * 递归脱敏对象，防止密码/token/密钥等写入审计日志。
 * @param {*} value
 * @param {number} depth 当前递归深度
 * @returns {*}
 */
export function sanitizeBody(value, depth = 0) {
  if (value == null) return value
  if (typeof value !== 'object') {
    if (typeof value === 'string' && value.length > 300) {
      return `${value.slice(0, 300)}...`
    }
    return value
  }
  if (depth >= MAX_SANITIZE_DEPTH) return '[Nested]'

  if (Array.isArray(value)) {
    if (value.length > 8) return `[Array(${value.length})]`
    return value.map((item) => sanitizeBody(item, depth + 1))
  }

  const clean = {}
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      clean[key] = '[FILTERED]'
    } else {
      clean[key] = sanitizeBody(val, depth + 1)
    }
  }
  return clean
}

function moduleName(path) {
  return path.split('/').filter(Boolean)[0] || 'system'
}

const KNOWN_MODULE_SEGMENTS = new Set(['platform', 'agri', 'market', 'machinery', 'disaster', 'policy', 'life', 'data', 'iot', 'ai'])

/** v2 路径的模块归属：去掉版本前缀后按首段归类，未知归 system（与 v1 的 moduleName 语义对齐但不改变 v1 行为）。 */
function v2ModuleName(strippedPath) {
  const seg = strippedPath.split('/').filter(Boolean)[0]
  return seg && KNOWN_MODULE_SEGMENTS.has(seg) ? seg : 'system'
}

/** 操作日志：记录非 GET API（同时覆盖 /api/v1 与 /api/v2），供后续管理台审计。 */
export function operationLogMiddleware(req, res, next) {
  const started = Date.now()
  res.on('finish', () => {
    if (!isApiRequest(req)) return
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return
    const original = apiOriginalPath(req)
    const isV2 = original.startsWith(config.apiPrefixV2)
    // v1 行为不变：记录去掉 /api/v1 前缀后的路径；
    // v2 记录带版本前缀的完整路径（如 /api/v2/ping），审计可区分版本。
    const stripped = isV2 ? original.slice(config.apiPrefixV2.length) || '/' : apiPath(req)
    const path = isV2 ? config.apiPrefixV2 + stripped : stripped
    const module = isV2 ? v2ModuleName(stripped) : moduleName(path)
    const detail = {
      method: req.method,
      path,
      statusCode: res.statusCode,
      traceId: req.traceId,
      durationMs: Date.now() - started,
      query: sanitizeBody(req.query || {}),
      body: sanitizeBody(req.body),
      apiSwitchKey: req.apiSwitchKey || null,
      rateLimitPolicy: res.getHeader('X-RateLimit-Policy') || null,
    }
    prisma.operationLog.create({
      data: {
        userId: req.user?.id || bearerPayload(req)?.id || null,
        module,
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

/**
 * 清空所有内存限流计数器。
 * 仅供测试隔离使用，不得暴露为生产 API 端点。
 */
export function clearRateLimits() {
  const keys = cache.keys().filter((k) => k.startsWith('ratelimit:'))
  for (const k of keys) cache.del(k)
  return keys.length
}
