import { verifyToken } from '../utils/jwt.js'
import { unauthorized } from '../utils/response.js'

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return unauthorized(res)

  try {
    req.user = verifyToken(header.slice(7))
    next()
  } catch {
    unauthorized(res)
  }
}

export const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyToken(header.slice(7))
    } catch {}
  }
  next()
}
