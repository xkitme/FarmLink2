import { prisma } from '../app.js'
import * as learningService from '../services/learning.service.js'
import * as achievementService from '../services/achievement.service.js'
import { ok, fail } from '../utils/response.js'

export async function getPath(req, res) {
  const tasks = await learningService.getTodayTasks(req.user.id)
  ok(res, tasks)
}

export async function today(req, res) {
  const tasks = await learningService.getTodayTasks(req.user.id, 10)
  ok(res, tasks)
}

export async function dueReviews(req, res) {
  const reviews = await learningService.getDueReviews(req.user.id)
  ok(res, reviews)
}

export async function updateProgress(req, res) {
  const { contentId, status } = req.body
  if (!contentId) return fail(res, '缺少 contentId')

  const progress = await learningService.getOrCreateProgress(req.user.id, contentId)
  if (status !== undefined) {
    await prisma.learningProgress.update({
      where: { id: progress.id },
      data: { status, lastAccessedAt: new Date() },
    })
  }
  ok(res, progress)
}

export async function submitQuiz(req, res) {
  const { contentId, score } = req.body
  if (!contentId || score === undefined) return fail(res, '缺少参数')
  if (score < 0 || score > 100) return fail(res, 'score 范围 0-100')

  const progress = await learningService.submitQuizResult(req.user.id, contentId, score)

  // 触发成就检查
  const stats = await learningService.getStats(req.user.id)
  const unlocked = await achievementService.checkAndUnlock(req.user.id, 'complete', stats.completed)

  // 答对加经验
  if (score >= 60) await achievementService.addExp(req.user.id, Math.round(score / 10))

  ok(res, { progress, unlockedAchievements: unlocked })
}

export async function stats(req, res) {
  const s = await learningService.getStats(req.user.id)
  ok(res, s)
}

export async function checkin(req, res) {
  const date = new Date().toISOString().slice(0, 10)
  const userId = req.user.id

  const exists = await prisma.checkin.findUnique({ where: { userId_date: { userId, date } } })
  if (exists) return fail(res, '今日已打卡')

  await prisma.checkin.create({ data: { userId, date } })
  const streak = await learningService.getStreak(userId)
  const { expPoints, level, levelName } = await achievementService.addExp(userId, 10)

  const unlocked = await achievementService.checkAndUnlock(userId, 'streak', streak)

  ok(res, { streak, expPoints, level, levelName, unlockedAchievements: unlocked })
}

export async function streakInfo(req, res) {
  const streak = await learningService.getStreak(req.user.id)
  ok(res, { streak })
}
