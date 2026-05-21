import { prisma } from '../app.js'
import { ok } from '../utils/response.js'

export async function listAll(req, res) {
  const all = await prisma.achievement.findMany({ orderBy: { category: 'asc' } })
  ok(res, all)
}

export async function myAchievements(req, res) {
  const mine = await prisma.userAchievement.findMany({
    where: { userId: req.user.id },
    include: { achievement: true },
    orderBy: { unlockedAt: 'desc' },
  })
  ok(res, mine)
}

export async function leaderboard(req, res) {
  const { type = 'all' } = req.query

  const users = await prisma.user.findMany({
    orderBy: { expPoints: 'desc' },
    take: 50,
    select: { id: true, nickname: true, avatarPath: true, level: true, expPoints: true },
  })

  ok(res, users.map((u, i) => ({ rank: i + 1, ...u })))
}
