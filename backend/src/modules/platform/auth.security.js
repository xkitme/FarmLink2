import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { config } from '../../config/index.js'

export const RESET_CODE_TTL_MS = 5 * 60 * 1000
export const RESET_CODE_MAX_ATTEMPTS = 5
/** refresh rotation CAS grace 窗口：从 revokedAt 起最多 5 秒内允许并发消费一次性 grace */
export const REFRESH_ROTATION_GRACE_MS = 5000

export function hashOpaqueToken(value) {
  return createHash('sha256').update(`${value}`).digest('hex')
}

export function hashResetCode(userId, code) {
  return createHmac('sha256', config.jwt.refreshSecret)
    .update(`password-reset:${userId}:${code}`)
    .digest('hex')
}

export function safeHashEquals(left, right) {
  if (!left || !right) return false
  const leftBuffer = Buffer.from(left, 'hex')
  const rightBuffer = Buffer.from(right, 'hex')
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

export function generateResetCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}
