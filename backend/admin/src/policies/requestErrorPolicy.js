/**
 * 116g-B 管理台请求错误分类策略（纯函数，无 DOM / 无副作用）。
 *
 * 事实源（只读，来自后端契约，勿在 Admin 手写镜像）：
 * - 信封 { code, msg, data, timestamp, traceId }（backend/src/utils/response.js）
 * - 业务码：200 / 40001 / 40101 / 40301 / 40401 / 42901 / 50001 / 60001 / 60002
 * - HTTP 映射：40001→400、40101→401、40301→403、40401→404、42901→429、
 *   60001/60002→503、50001→500（backend/src/utils/response.js mapHttpStatus）
 * - CSRF 失败：40301 + msg 含「CSRF 校验失败」（middleware/csrf.js）
 * - API 关闭：40301 + msg 以「功能已关闭」开头（middleware/apiControl.js）
 * - 无权限：40301 + msg「权限不足」（middleware/auth.js requireRole）
 * - 限流：42901（middleware/apiControl.js）
 *
 * 安全语义：只有「未认证」允许清理会话并跳转登录；403/CSRF/429/5xx/断网
 * 一律不清会话、不登出。前端分类只是体验层，后端强制校验以 116e/116f 契约为准。
 */

export const ERROR_CATEGORY = Object.freeze({
  UNAUTHENTICATED: 'unauthenticated',
  FORBIDDEN: 'forbidden',
  CSRF: 'csrf',
  API_DISABLED: 'api-disabled',
  RATE_LIMITED: 'rate-limited',
  NETWORK: 'network',
  SERVER: 'server',
  VALIDATION: 'validation',
  NOT_FOUND: 'not-found',
  UNKNOWN: 'unknown',
})

const BIZ_CODE = Object.freeze({
  OK: 200,
  PARAM_ERROR: 40001,
  UNAUTHORIZED: 40101,
  FORBIDDEN: 40301,
  NOT_FOUND: 40401,
  RATE_LIMIT: 42901,
  SERVER_ERROR: 50001,
  AI_BUSY: 60001,
  OFFLINE: 60002,
})

/** CSRF 失败判定文案标记（与 backend/src/middleware/csrf.js 的 msg 一致）。 */
export const CSRF_MSG_MARKER = 'CSRF 校验失败'

/** API 关闭判定文案前缀（与 backend/src/middleware/apiControl.js 的 msg 一致）。 */
export const SWITCH_OFF_MSG_PREFIX = '功能已关闭'

const DEFAULT_MESSAGES = Object.freeze({
  [ERROR_CATEGORY.UNAUTHENTICATED]: '会话已失效，请重新登录',
  [ERROR_CATEGORY.FORBIDDEN]: '权限不足',
  [ERROR_CATEGORY.CSRF]: 'CSRF 校验失败，请刷新页面后重试',
  [ERROR_CATEGORY.API_DISABLED]: '功能已关闭',
  [ERROR_CATEGORY.RATE_LIMITED]: '请求过于频繁，请稍后再试',
  [ERROR_CATEGORY.NETWORK]: '网络连接失败，请检查网络后重试',
  [ERROR_CATEGORY.SERVER]: '服务端异常，请稍后重试',
  [ERROR_CATEGORY.VALIDATION]: '请求未通过校验',
  [ERROR_CATEGORY.NOT_FOUND]: '资源不存在',
  [ERROR_CATEGORY.UNKNOWN]: '请求失败，请稍后重试',
})

/**
 * 精确分类一次请求失败。
 * @param {object} input
 * @param {object|null} input.payload 已解析的响应信封（不可解析时为 null）
 * @param {number|null} input.status HTTP 状态码（fetch 未返回响应时为 null）
 * @param {Error|null} input.networkError fetch 抛出的网络异常（无则为 null）
 * @returns {{category: string, code: number|null, status: number|null}}
 *   业务码优先；无业务码时按 HTTP 状态兜底；两者皆无 → unknown。
 */
export function classifyRequestError({ payload = null, status = null, networkError = null } = {}) {
  if (networkError) {
    return { category: ERROR_CATEGORY.NETWORK, code: null, status: null }
  }
  const code = payload?.code
  const msg = typeof payload?.msg === 'string' ? payload.msg : ''

  if (code === BIZ_CODE.UNAUTHORIZED) return { category: ERROR_CATEGORY.UNAUTHENTICATED, code, status }
  if (code === BIZ_CODE.FORBIDDEN) {
    if (msg.includes(CSRF_MSG_MARKER)) return { category: ERROR_CATEGORY.CSRF, code, status }
    if (msg.startsWith(SWITCH_OFF_MSG_PREFIX)) return { category: ERROR_CATEGORY.API_DISABLED, code, status }
    return { category: ERROR_CATEGORY.FORBIDDEN, code, status }
  }
  if (code === BIZ_CODE.RATE_LIMIT) return { category: ERROR_CATEGORY.RATE_LIMITED, code, status }
  if (code === BIZ_CODE.SERVER_ERROR || code === BIZ_CODE.AI_BUSY || code === BIZ_CODE.OFFLINE) {
    return { category: ERROR_CATEGORY.SERVER, code, status }
  }
  if (code === BIZ_CODE.PARAM_ERROR) return { category: ERROR_CATEGORY.VALIDATION, code, status }
  if (code === BIZ_CODE.NOT_FOUND) return { category: ERROR_CATEGORY.NOT_FOUND, code, status }
  // 有业务码但不在已知表内（未来新增码）：归 unknown，绝不猜测为登出类。
  if (Number.isFinite(code) && code !== BIZ_CODE.OK) return { category: ERROR_CATEGORY.UNKNOWN, code, status }

  // 无信封业务码：按 HTTP 状态兜底。401 语义即未认证（后端 401 恒伴随 40101）。
  if (status === 401) return { category: ERROR_CATEGORY.UNAUTHENTICATED, code: null, status }
  if (status === 403) return { category: ERROR_CATEGORY.FORBIDDEN, code: null, status }
  if (status === 429) return { category: ERROR_CATEGORY.RATE_LIMITED, code: null, status }
  if (status === 400) return { category: ERROR_CATEGORY.VALIDATION, code: null, status }
  if (status === 404) return { category: ERROR_CATEGORY.NOT_FOUND, code: null, status }
  if (status !== null && status >= 500) return { category: ERROR_CATEGORY.SERVER, code: null, status }
  return { category: ERROR_CATEGORY.UNKNOWN, code: null, status }
}

/** 只有「未认证」视为会话失效（允许清理会话并跳转登录）。 */
export function isSessionExpired(category) {
  return category === ERROR_CATEGORY.UNAUTHENTICATED
}

/** 瞬时性失败（GET/HEAD 受控重试的对象）；写请求与确定性 4xx 一律不重试。 */
export function isTransientFailure(category) {
  return (
    category === ERROR_CATEGORY.NETWORK ||
    category === ERROR_CATEGORY.SERVER ||
    category === ERROR_CATEGORY.RATE_LIMITED
  )
}

/**
 * 受控重试判定：仅幂等方法（GET/HEAD）+ 调用方显式 retries + 瞬时性失败。
 * POST/PUT/PATCH/DELETE 无论传什么 retries 都绝不重试（防重复写）。
 */
export function shouldRetryRequest({ method, category, attempt, maxRetries } = {}) {
  const m = String(method || '').toUpperCase()
  const idempotent = m === 'GET' || m === 'HEAD'
  return (
    idempotent &&
    Number(maxRetries) > 0 &&
    Number(attempt) < Number(maxRetries) &&
    isTransientFailure(category)
  )
}

/** 错误文案：后端 msg 优先；无则用分类默认文案。 */
export function resolveErrorMessage(category, backendMsg) {
  if (typeof backendMsg === 'string' && backendMsg.trim()) return backendMsg
  return DEFAULT_MESSAGES[category] || DEFAULT_MESSAGES[ERROR_CATEGORY.UNKNOWN]
}

/** 分类后的请求错误（request 层 reject 用；message 保持与旧 Error 契约兼容）。 */
export class ApiError extends Error {
  constructor(category, message, options = {}) {
    super(message)
    this.name = 'ApiError'
    this.category = category
    this.code = options.code ?? null
    this.status = options.status ?? null
  }
}

/**
 * 登录引导态决策（App.jsx RequireAuth 用）：
 * - 有用户 → ok；
 * - 未认证 → expired（清理会话并跳登录）；
 * - 网络/服务端/限流/其它 → unavailable（保留会话缓存，展示重试，不跳登录）。
 */
export function bootstrapDecision(user, classification) {
  if (user) return 'ok'
  if (isSessionExpired(classification?.category)) return 'expired'
  return 'unavailable'
}
