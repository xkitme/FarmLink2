import jwt from 'jsonwebtoken'
import { config } from '../../config/index.js'
import { errors } from '../../utils/response.js'

export function signToken(payload) {
  return jwt.sign({ ...payload, tokenType: 'access' }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  })
}

export function signRefreshToken(payload, expiresIn) {
  return jwt.sign({ ...payload, tokenType: 'refresh' }, config.jwt.refreshSecret, {
    expiresIn: expiresIn || config.jwt.refreshExpiresIn,
  })
}

export function verifyTokenClaims(token, expectedTokenType = 'access') {
  const secret = expectedTokenType === 'refresh'
    ? config.jwt.refreshSecret
    : config.jwt.secret
  const decoded = jwt.verify(token, secret)
  if (decoded.tokenType !== expectedTokenType) {
    throw errors.unauthorized('Token 类型无效')
  }
  return decoded
}

export function tokenExpiresAt(token) {
  const decoded = jwt.decode(token)
  if (!decoded?.exp) throw new Error('Token 缺少过期时间')
  return new Date(decoded.exp * 1000)
}
