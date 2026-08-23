import {
  bootstrapDecision,
  classifyRequestError,
  isSessionExpired,
} from '../policies/requestErrorPolicy.js'

let _cachedUser = null

function parseCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
  return match ? match[1] : null
}

/** 获取 CSRF token（前端注入 X-CSRF-Token 头用） */
export function getCsrfToken() {
  return parseCsrfToken()
}

/** 缓存用户信息（login/me 成功后调用） */
export function setCurrentUser(user) {
  _cachedUser = user || null
}

/** 获取缓存的用户信息 */
export function getCurrentUser() {
  return _cachedUser || {}
}

/**
 * 探测 /auth/me 并返回 { user, classification }。
 * 116g-B 契约：只有「未认证」才清理会话缓存；
 * 网络失败 / 5xx / 403 / 429 不代表会话失效，保留缓存，由调用方按分类决策。
 */
async function probeSession() {
  try {
    const resp = await fetch('/api/v1/auth/me', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    const payload = await resp.json().catch(() => null)
    if (resp.ok && payload?.code === 200) {
      _cachedUser = payload.data || null
      return { user: _cachedUser, classification: null }
    }
    const classification = classifyRequestError({ payload, status: resp.status })
    if (isSessionExpired(classification.category)) _cachedUser = null
    return { user: null, classification }
  } catch (error) {
    return { user: null, classification: classifyRequestError({ networkError: error }) }
  }
}

/** 从 /auth/me 恢复登录态（页面刷新/新标签页）。返回 user 或 null。 */
export async function fetchUser() {
  const { user } = await probeSession()
  return user
}

/**
 * 登录引导态（App.jsx RequireAuth 用）：
 * { decision: 'ok' | 'expired' | 'unavailable', user, category }
 * - expired：未认证（probeSession 已清缓存），跳转登录；
 * - unavailable：服务不可用（网络/服务端/限流等），保留会话缓存，可重试。
 */
export async function bootstrapSession() {
  const { user, classification } = await probeSession()
  return {
    decision: bootstrapDecision(user, classification),
    user,
    category: classification?.category ?? null,
  }
}

/** 检查是否已登录（通过 /auth/me） */
export async function isLoggedIn() {
  const user = await fetchUser()
  return Boolean(user)
}

/** 清除本地登录态 */
export function clearSession() {
  _cachedUser = null
}
