import { randomUUID } from 'node:crypto'
import { prisma } from '../../db.js'
import { errors } from '../../utils/response.js'
import { signRefreshToken, signToken, tokenExpiresAt } from './auth-token.js'
import { hashOpaqueToken } from './auth.security.js'

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

export async function issueSession(user, metadata = {}, replaceSessionId = null) {
  const sessionId = randomUUID()
  const payload = tokenPayload(user, sessionId)
  const token = signToken(payload)
  const refreshToken = signRefreshToken(payload)
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    // 仅当 replaceSessionId 非 null 时执行 revoke
    // null = 并发降级模式：旧 session 已被另一标签 revoke，跳过 revoke 直接新建
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
      if (revoked.count !== 1) throw errors.unauthorized('会话已失效，请重新登录')
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
