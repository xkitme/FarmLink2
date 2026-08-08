import { randomUUID } from 'node:crypto'
import { prisma } from '../../db.js'
import { errors } from '../../utils/response.js'
import { signRefreshToken, signToken, tokenExpiresAt } from './auth-token.js'
import { hashOpaqueToken, REFRESH_ROTATION_GRACE_MS } from './auth.security.js'

function cleanMeta(value, maxLength) {
  const text = `${value || ''}`.trim()
  return text ? text.slice(0, maxLength) : null
}

export function sessionMetadata(req) {
  return {
    deviceName: cleanMeta(req.body?.deviceName || req.headers['x-device-name'], 80),
    userAgent: cleanMeta(req.headers['user-agent'], 240),
  }
}

function tokenPayload(user, sessionId) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    regionCode: user.regionCode,
    pwdAt: user.passwordChangedAt ? new Date(user.passwordChangedAt).getTime() : null,
    sid: sessionId,
  }
}

export async function issueSession(user, metadata = {}, replaceSessionId = null, refreshExpiresIn = null, allowGrace = false) {
  const sessionId = randomUUID()
  const payload = tokenPayload(user, sessionId)
  const token = signToken(payload)
  const refreshToken = signRefreshToken(payload, refreshExpiresIn)
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    // 标准路径：主动 revoke 旧 session 后创建新 session
    if (replaceSessionId) {
      const revoked = await tx.authSession.updateMany({
        where: {
          id: replaceSessionId,
          userId: user.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now, lastUsedAt: now },
      })
      if (revoked.count !== 1) {
        if (!allowGrace) throw errors.unauthorized('会话已失效，请重新登录')
        // 并发降级：旧 session 已被另一个 refresh 并发 revoke，尝试 CAS 消费一次性 grace
        // 只有 rotation 撤销（revokedAt == lastUsedAt）才允许 grace；
        // logout / admin 强制撤销只设 revokedAt 不更新 lastUsedAt，不满足条件
        const session = await tx.authSession.findUnique({ where: { id: replaceSessionId } })
        if (
          !session
          || session.userId !== user.id
          || !session.revokedAt
          || session.expiresAt <= now
          || session.revokedAt.getTime() !== session.lastUsedAt.getTime()
          || Math.abs(now.getTime() - session.revokedAt.getTime()) > REFRESH_ROTATION_GRACE_MS
        ) {
          throw errors.unauthorized('会话已失效，请重新登录')
        }
        // CAS：仅当 revokedAt/lastUsedAt 仍处于 rotation 状态时消费 grace
        const graceConsumed = await tx.authSession.updateMany({
          where: {
            id: replaceSessionId,
            revokedAt: session.revokedAt,
            lastUsedAt: session.lastUsedAt,
          },
          data: { lastUsedAt: new Date(now.getTime() + 1000) },
        })
        if (graceConsumed.count !== 1) {
          throw errors.unauthorized('会话已失效，请重新登录')
        }
        // grace 已消费 → 继续创建新 session
      }
    }

    await tx.authSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: hashOpaqueToken(refreshToken),
        deviceName: metadata.deviceName || null,
        userAgent: metadata.userAgent || null,
        expiresAt: tokenExpiresAt(refreshToken),
        lastUsedAt: now,
      },
    })
  })

  return { token, refreshToken, sessionId }
}

export async function revokeSession(userId, sessionId) {
  if (!sessionId) return 0
  const result = await prisma.authSession.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  return result.count
}

export async function revokeAllUserSessions(userId, exceptSessionId = null) {
  const where = { userId, revokedAt: null }
  if (exceptSessionId) where.id = { not: exceptSessionId }
  const result = await prisma.authSession.updateMany({
    where,
    data: { revokedAt: new Date() },
  })
  return result.count
}

export async function listUserSessions(userId, currentSessionId) {
  const now = new Date()
  const rows = await prisma.authSession.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { lastUsedAt: 'desc' },
    select: {
      id: true,
      deviceName: true,
      userAgent: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
    },
  })
  return rows.map((row) => ({ ...row, current: row.id === currentSessionId }))
}
