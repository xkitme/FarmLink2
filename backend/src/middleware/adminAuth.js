import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '请先登录管理后台' })
  }
  try {
    const payload = jwt.verify(header.slice(7), config.admin.jwtSecret)
    if (payload.role !== 'admin') throw new Error()
    req.admin = payload
    next()
  } catch {
    res.status(401).json({ code: 401, message: '管理员 Token 无效或已过期' })
  }
}
