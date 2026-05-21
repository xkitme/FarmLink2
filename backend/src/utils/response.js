export const ok = (res, data = null, message = 'success') =>
  res.json({ code: 0, message, data })

export const created = (res, data = null) =>
  res.status(201).json({ code: 0, message: 'created', data })

export const fail = (res, message = 'error', status = 400) =>
  res.status(status).json({ code: 1, message, data: null })

export const unauthorized = (res, message = '未登录或 Token 已过期') =>
  res.status(401).json({ code: 401, message, data: null })

export const forbidden = (res, message = '无权限') =>
  res.status(403).json({ code: 403, message, data: null })

export const notFound = (res, message = '资源不存在') =>
  res.status(404).json({ code: 404, message, data: null })
