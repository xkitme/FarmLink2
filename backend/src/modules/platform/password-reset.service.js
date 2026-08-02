import bcrypt from 'bcryptjs'
import { prisma } from '../../db.js'
import { errors } from '../../utils/response.js'
import {
  generateResetCode,
  hashResetCode,
  RESET_CODE_MAX_ATTEMPTS,
  RESET_CODE_TTL_MS,
  safeHashEquals,
} from './auth.security.js'

const invalidResetCode = () => errors.param('账号或重置码无效')

export async function createPasswordResetCode(username, createdById) {
  const normalizedUsername = `${username || ''}`.trim()
  if (!normalizedUsername) throw errors.param('请输入需要重置的账号')

  const user = await prisma.user.findUnique({ where: { username: normalizedUsername } })
  if (!user || user.status !== 1) throw errors.notFound('账号不存在或不可用')

  const code = generateResetCode()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + RESET_CODE_TTL_MS)
  await prisma.$transaction([
    prisma.passwordResetCode.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    }),
    prisma.passwordResetCode.create({
      data: {
        userId: user.id,
        codeHash: hashResetCode(user.id, code),
        expiresAt,
        createdById,
      },
    }),
  ])

  return {
    username: user.username,
    nickname: user.nickname,
    resetCode: code,
    expiresAt,
    expiresInSeconds: Math.floor(RESET_CODE_TTL_MS / 1000),
  }
}

async function recordFailedAttempt(record) {
  const nextAttemptCount = record.attemptCount + 1
  await prisma.passwordResetCode.updateMany({
    where: {
      id: record.id,
      usedAt: null,
      attemptCount: record.attemptCount,
    },
    data: {
      attemptCount: { increment: 1 },
      ...(nextAttemptCount >= RESET_CODE_MAX_ATTEMPTS ? { usedAt: new Date() } : {}),
    },
  })
}

export async function resetPasswordWithCode({ username, resetCode, newPassword }) {
  const normalizedUsername = `${username || ''}`.trim()
  const normalizedCode = `${resetCode || ''}`.trim()
  const password = `${newPassword || ''}`
  if (!normalizedUsername || !normalizedCode || !password) {
    throw errors.param('账号、重置码和新密码必填')
  }
  if (!/^\d{6}$/.test(normalizedCode)) throw errors.param('请输入 6 位重置码')
  if (password.length < 8) throw errors.param('新密码至少 8 位')

  const user = await prisma.user.findUnique({ where: { username: normalizedUsername } })
  if (!user || user.status !== 1) throw invalidResetCode()

  const record = await prisma.passwordResetCode.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: 'desc' },
  })
  const now = new Date()
  if (!record || record.expiresAt <= now || record.attemptCount >= RESET_CODE_MAX_ATTEMPTS) {
    if (record && record.usedAt === null) {
      await prisma.passwordResetCode.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: now },
      })
    }
    throw invalidResetCode()
  }

  const expectedHash = hashResetCode(user.id, normalizedCode)
  if (!safeHashEquals(record.codeHash, expectedHash)) {
    await recordFailedAttempt(record)
    throw invalidResetCode()
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetCode.updateMany({
      where: {
        id: record.id,
        usedAt: null,
        attemptCount: record.attemptCount,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    })
    if (claimed.count !== 1) throw invalidResetCode()

    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordChangedAt: now },
    })
    await tx.authSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: now },
    })
  })

  return { userId: user.id }
}
