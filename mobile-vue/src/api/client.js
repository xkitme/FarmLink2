const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://10.0.2.2:8000').replace(/\/+$/, '')
const API_PREFIX = '/api/v1'
const DEFAULT_TIMEOUT = 15000

let unauthorizedHandler = null

export class ApiError extends Error {
  constructor(message, code = 50000, status = 0, payload = null) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.payload = payload
  }
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null
}

function getToken() {
  return localStorage.getItem('farmlink_token')
}

function buildUrl(path, query) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${API_BASE_URL}${API_PREFIX}${normalizedPath}`)
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  return url.toString()
}

export function resolveImageUrl(value) {
  const source = String(value || '').trim()
  if (!source || /^(https?:|data:|blob:)/i.test(source)) return source
  return `${API_BASE_URL}${source.startsWith('/') ? '' : '/'}${source}`
}

export async function request(path, options = {}) {
  const { method = 'GET', query, body, headers = {}, timeout = DEFAULT_TIMEOUT } = options
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeout)
  const token = getToken()

  try {
    const response = await fetch(buildUrl(path, query), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })

    let envelope
    try {
      envelope = await response.json()
    } catch (_) {
      throw new ApiError('服务器响应异常', response.status, response.status)
    }

    const code = Number(envelope.code ?? response.status)
    if (code === 40101 || response.status === 401) {
      await unauthorizedHandler?.()
    }
    if (!response.ok || code !== 200) {
      const message = code === 60002 ? '服务暂时不可用，请稍后重试' : (envelope.msg || '请求失败')
      throw new ApiError(message, code, response.status, envelope)
    }
    return envelope.data
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError('请求超时，请稍后重试', 50000, 0)
    }
    if (error instanceof ApiError) throw error
    throw new ApiError('服务暂时不可用，请稍后重试', 60002, 0)
  } finally {
    window.clearTimeout(timer)
  }
}

export async function uploadImage(file, { timeout = 30000 } = {}) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeout)
  const token = getToken()
  const form = new FormData()
  form.append('image', file)
  try {
    // 不手动设 Content-Type，交给浏览器补 multipart boundary。
    const response = await fetch(buildUrl('/upload/image'), {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: form,
      signal: controller.signal,
    })
    let envelope
    try {
      envelope = await response.json()
    } catch (_) {
      throw new ApiError('上传失败，请稍后重试', response.status, response.status)
    }
    const code = Number(envelope.code ?? response.status)
    if (code === 40101 || response.status === 401) await unauthorizedHandler?.()
    if (!response.ok || code !== 200) throw new ApiError(envelope.msg || '上传失败', code, response.status, envelope)
    return envelope.data
  } catch (error) {
    if (error?.name === 'AbortError') throw new ApiError('上传超时，请重试', 50000, 0)
    if (error instanceof ApiError) throw error
    throw new ApiError('上传失败，请稍后重试', 60002, 0)
  } finally {
    window.clearTimeout(timer)
  }
}

export const api = {
  get: (path, query, options = {}) => request(path, { ...options, method: 'GET', query }),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
  uploadImage,
  resolveImageUrl,
}
