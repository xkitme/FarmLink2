import { prisma } from '../db.js'

export async function cleanDefaultPwdChangedAt() {
  try {
    const [totalUsers, users] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        where: { passwordChangedAt: { not: null } },
        select: { id: true, passwordChangedAt: true },
      }),
    ])
    if (totalUsers === 0 || users.length === 0) return 0

    const groups = new Map()
    for (const user of users) {
      const changedAt = user.passwordChangedAt
      if (!changedAt) continue
      const minute = Math.floor(changedAt.getTime() / 60000)
      groups.set(minute, (groups.get(minute) || 0) + 1)
    }
    if (groups.size === 0) return 0

    let dominantMinute = null
    let maxBucket = 0
    for (const [minute, count] of groups.entries()) {
      if (count > maxBucket) {
        dominantMinute = minute
        maxBucket = count
      }
    }
    if (dominantMinute == null || maxBucket / totalUsers < 0.8) return 0

    const start = new Date(dominantMinute * 60000)
    const end = new Date(start.getTime() + 60000)
    const result = await prisma.user.updateMany({
      where: {
        passwordChangedAt: {
          gte: start,
          lt: end,
        },
      },
      data: { passwordChangedAt: null },
    })
    return result.count
  } catch (e) {
    console.warn('清理 passwordChangedAt 残留失败:', e.message)
    return 0
  }
}
