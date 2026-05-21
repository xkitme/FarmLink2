import { prisma } from '../app.js'
import { nextReviewAt, updateMastery } from '../utils/ebbinghaus.js'

export async function getOrCreateProgress(userId, contentId) {
  return prisma.learningProgress.upsert({
    where: { userId_contentId: { userId, contentId } },
    create: { userId, contentId, status: 1, lastAccessedAt: new Date() },
    update: { status: 1, lastAccessedAt: new Date() },
  })
}

export async function submitQuizResult(userId, contentId, score) {
  const progress = await prisma.learningProgress.findUnique({
    where: { userId_contentId: { userId, contentId } },
  })

  const currentMastery = progress?.masteryLevel ?? 0
  const newMastery = updateMastery(currentMastery, score)
  const reviewAt = nextReviewAt(newMastery, score)

  return prisma.learningProgress.upsert({
    where: { userId_contentId: { userId, contentId } },
    create: {
      userId, contentId,
      status: score >= 60 ? 2 : 1,
      score, masteryLevel: newMastery,
      reviewCount: 1, nextReviewAt: reviewAt,
      lastAccessedAt: new Date(),
    },
    update: {
      score,
      masteryLevel: newMastery,
      nextReviewAt: reviewAt,
      status: score >= 60 ? 2 : 1,
      reviewCount: { increment: 1 },
      lastAccessedAt: new Date(),
    },
  })
}

export async function getDueReviews(userId) {
  return prisma.learningProgress.findMany({
    where: { userId, nextReviewAt: { lte: new Date() } },
    include: { content: true },
    orderBy: { nextReviewAt: 'asc' },
    take: 20,
  })
}

export async function getTodayTasks(userId, limit = 10) {
  // 优先返回待复习 + 未开始的推荐内容
  const reviews = await getDueReviews(userId)
  if (reviews.length >= limit) return reviews.slice(0, limit)

  const started = reviews.map((r) => r.contentId)
  const fresh = await prisma.content.findMany({
    where: { id: { notIn: started }, isPremium: false },
    orderBy: { viewCount: 'desc' },
    take: limit - reviews.length,
  })

  return [...reviews, ...fresh.map((c) => ({ content: c, status: 0 }))]
}

export async function getStats(userId) {
  const [total, completed, avgScore] = await Promise.all([
    prisma.learningProgress.count({ where: { userId } }),
    prisma.learningProgress.count({ where: { userId, status: 2 } }),
    prisma.learningProgress.aggregate({
      where: { userId, score: { not: null } },
      _avg: { score: true },
    }),
  ])

  const streak = await getStreak(userId)

  return {
    total,
    completed,
    avgScore: Math.round(avgScore._avg.score || 0),
    streak,
  }
}

export async function getStreak(userId) {
  const checkins = await prisma.checkin.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 365,
    select: { date: true },
  })

  if (!checkins.length) return 0

  let streak = 0
  const today = new Date().toISOString().slice(0, 10)
  let current = today

  for (const { date } of checkins) {
    if (date === current) {
      streak++
      const d = new Date(current)
      d.setDate(d.getDate() - 1)
      current = d.toISOString().slice(0, 10)
    } else {
      break
    }
  }

  return streak
}
