import { clearSession, getCsrfToken } from './auth.js'
import { message } from './feedback.js'
import {
  ApiError,
  classifyRequestError,
  isSessionExpired,
  resolveErrorMessage,
  shouldRetryRequest,
} from '../policies/requestErrorPolicy.js'

export const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'

const WRITE_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])
const RETRYABLE_METHODS = new Set(['GET', 'HEAD'])

export function buildUrl(path, params) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin)
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })
  return `${url.pathname}${url.search}`
}

/**
 * 统一请求底座（116g-B 分类版）。
 *
 * 契约：
 * - 所有请求 credentials:'include'；写请求注入 X-CSRF-Token（口径不变）。
 * - 错误按 requestErrorPolicy 精确分类；只有「未认证」清理会话并跳转登录；
 *   403 / CSRF / 429 / 5xx / 断网一律不清会话、不登出。
 * - 写请求绝不自动重试；GET/HEAD 支持调用方显式 { retries, retryDelayMs } 受控重试
 *   （默认 0 次；只对瞬时性失败生效）。
 * - 成功返回 payload.data；失败 reject ApiError（message 与旧 Error 契约兼容）。
 */
export async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const maxRetries = RETRYABLE_METHODS.has(method)
    ? Math.max(0, Math.floor(Number(options.retries) || 0))
    : 0
  const retryDelayMs = Math.max(0, Number(options.retryDelayMs) || 0)

  const headers = {
    ...(options.headers || {}),
  }
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'

  // CSRF：写请求注入 X-CSRF-Token
  if (WRITE_METHODS.has(method)) {
    const csrf = getCsrfToken()
    if (csrf) headers['X-CSRF-Token'] = csrf
  }

  let attempt = 0
  for (;;) {
    let classification = null
    let payload = null
    let status = null
    try {
      const response = await fetch(buildUrl(path, options.params), {
        ...options,
        method,
        headers,
        credentials: 'include',
        body: options.body instanceof FormData
          ? options.body
          : options.body
            ? JSON.stringify(options.body)
            : undefined,
      })
      status = response.status
      payload = await response.json().catch(() => null)
      if (response.ok && payload?.code === 200) return payload.data
      classification = classifyRequestError({ payload, status })
    } catch (error) {
      classification = classifyRequestError({ networkError: error })
    }

    if (shouldRetryRequest({ method, category: classification.category, attempt, maxRetries })) {
      attempt += 1
      if (retryDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
      continue
    }

    const text = resolveErrorMessage(classification.category, payload?.msg)
    if (isSessionExpired(classification.category)) {
      // 只有「未认证」才允许清理会话并跳转登录
      clearSession()
      window.location.replace('/admin/login?reason=expired')
      throw new ApiError(classification.category, text, { code: payload?.code ?? null, status })
    }
    message.error(text)
    throw new ApiError(classification.category, text, { code: payload?.code ?? null, status })
  }
}

function normalizeDebugPath(path) {
  let value = String(path || '').trim()
  if (!value) value = '/'
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith(API_BASE)) value = value.slice(API_BASE.length) || '/'
  if (!value.startsWith('/')) value = `/${value}`
  return buildUrl(value)
}

export async function rawRequest(path, options = {}) {
  const targetUrl = normalizeDebugPath(path)
  const method = (options.method || 'GET').toUpperCase()
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  }
  if (options.body !== undefined && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  // CSRF
  if (WRITE_METHODS.has(method)) {
    const csrf = getCsrfToken()
    if (csrf) headers['X-CSRF-Token'] = csrf
  }

  const started = performance.now()
  const response = await fetch(targetUrl, {
    method,
    headers,
    credentials: 'include',
    body: method === 'GET' || method === 'HEAD'
      ? undefined
      : options.body instanceof FormData
        ? options.body
        : options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
  })
  const rawText = await response.text()
  let data = rawText
  try {
    data = rawText ? JSON.parse(rawText) : null
  } catch {
    data = rawText
  }
  const responseHeaders = {}
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value
  })
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    durationMs: Math.round(performance.now() - started),
    headers: responseHeaders,
    data,
    rawText,
  }
}

export const api = {
  get: (path, params, options) => request(path, { method: 'GET', params, ...(options || {}) }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
