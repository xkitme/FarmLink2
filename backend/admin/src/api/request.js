import { message } from 'antd'
import { clearSession, getToken } from './auth.js'

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'

function buildUrl(path, params) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin)
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })
  return `${url.pathname}${url.search}`
}

export async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    ...(options.headers || {}),
  }
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = token

  const response = await fetch(buildUrl(path, options.params), {
    ...options,
    headers,
    body: options.body instanceof FormData
      ? options.body
      : options.body
        ? JSON.stringify(options.body)
        : undefined,
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.code !== 200) {
    const text = payload?.msg || `请求失败：${response.status}`
    if (payload?.code === 40101) {
      clearSession()
      window.location.href = '/admin/login'
      return Promise.reject(new Error(text))
    }
    message.error(text)
    return Promise.reject(new Error(text))
  }
  return payload.data
}

export const api = {
  get: (path, params) => request(path, { method: 'GET', params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
