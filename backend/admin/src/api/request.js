import { clearSession, getToken } from './auth.js'
import { message } from './feedback.js'

export const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'

export function buildUrl(path, params) {
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

function normalizeDebugPath(path) {
  let value = String(path || '').trim()
  if (!value) value = '/'
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith(API_BASE)) value = value.slice(API_BASE.length) || '/'
  if (!value.startsWith('/')) value = `/${value}`
  return buildUrl(value)
}

export async function rawRequest(path, options = {}) {
  const token = getToken()
  const method = (options.method || 'GET').toUpperCase()
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  }
  if (token && !headers.Authorization) headers.Authorization = token
  if (options.body !== undefined && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const started = performance.now()
  const response = await fetch(normalizeDebugPath(path), {
    method,
    headers,
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
  get: (path, params) => request(path, { method: 'GET', params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
