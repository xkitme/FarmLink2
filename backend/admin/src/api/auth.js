const TOKEN_KEY = 'farmlink_admin_token'
const REFRESH_KEY = 'farmlink_admin_refresh'
const USER_KEY = 'farmlink_admin_user'

export function saveSession(session) {
  localStorage.setItem(TOKEN_KEY, session.token)
  localStorage.setItem(REFRESH_KEY, session.refreshToken || '')
  localStorage.setItem(USER_KEY, JSON.stringify(session.user || {}))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || '{}')
  } catch {
    return {}
  }
}

export function isLoggedIn() {
  return Boolean(getToken())
}
