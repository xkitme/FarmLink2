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

/** 从 /auth/me 恢复登录态（页面刷新/新标签页） */
export async function fetchUser() {
  try {
    const resp = await fetch('/api/v1/auth/me', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    const payload = await resp.json()
    if (resp.ok && payload.code === 200) {
      _cachedUser = payload.data || null
      return _cachedUser
    }
    _cachedUser = null
    return null
  } catch {
    _cachedUser = null
    return null
  }
}

/** 检查是否已登录（通过 /auth/me） */
export async function isLoggedIn() {
  const user = await fetchUser()
  return Boolean(user)
}

/** 登录成功回调（缓存 user + CSRF cookie 由服务端 Set-Cookie） */
export function saveSession(user) {
  _cachedUser = user || null
}

/** 清除本地登录态 */
export function clearSession() {
  _cachedUser = null
}
