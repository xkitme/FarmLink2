import { prisma } from '../app.js'
import { ok, created, fail, notFound, forbidden } from '../utils/response.js'
import * as achievementService from '../services/achievement.service.js'

export async function listWorks(req, res) {
  const { type, page = 1, limit = 20 } = req.query
  const where = { isPublic: true }
  if (type) where.workType = type

  const [total, items] = await Promise.all([
    prisma.userWork.count({ where }),
    prisma.userWork.findMany({
      where,
      include: { user: { select: { id: true, nickname: true, avatarPath: true, level: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
  ])
  ok(res, { total, page: parseInt(page), items })
}

export async function createWork(req, res) {
  const { workType, title, content } = req.body
  const mediaPath = req.file?.path

  if (!workType) return fail(res, '缺少 workType')

  const work = await prisma.userWork.create({
    data: { userId: req.user.id, workType, title, content, mediaPath },
  })

  const count = await prisma.userWork.count({ where: { userId: req.user.id } })
  await achievementService.checkAndUnlock(req.user.id, 'create', count)

  created(res, work)
}

export async function getWork(req, res) {
  const work = await prisma.userWork.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { id: true, nickname: true, avatarPath: true, level: true } } },
  })
  if (!work) return notFound(res)
  ok(res, work)
}

export async function deleteWork(req, res) {
  const work = await prisma.userWork.findUnique({ where: { id: req.params.id } })
  if (!work) return notFound(res)
  if (work.userId !== req.user.id) return forbidden(res)

  await prisma.userWork.delete({ where: { id: req.params.id } })
  ok(res)
}

export async function toggleLike(req, res) {
  const workId = req.params.id
  const userId = req.user.id

  const exists = await prisma.like.findUnique({ where: { userId_workId: { userId, workId } } })

  if (exists) {
    await prisma.like.delete({ where: { userId_workId: { userId, workId } } })
    await prisma.userWork.update({ where: { id: workId }, data: { likeCount: { decrement: 1 } } })
    ok(res, { liked: false })
  } else {
    await prisma.like.create({ data: { userId, workId } })
    await prisma.userWork.update({ where: { id: workId }, data: { likeCount: { increment: 1 } } })
    ok(res, { liked: true })
  }
}

export async function listComments(req, res) {
  const comments = await prisma.comment.findMany({
    where: { workId: req.params.id },
    include: { user: { select: { id: true, nickname: true, avatarPath: true } } },
    orderBy: { createdAt: 'asc' },
  })
  ok(res, comments)
}

export async function addComment(req, res) {
  const { content } = req.body
  if (!content?.trim()) return fail(res, '评论内容不能为空')

  const work = await prisma.userWork.findUnique({ where: { id: req.params.id } })
  if (!work) return notFound(res)

  const comment = await prisma.comment.create({
    data: { workId: req.params.id, userId: req.user.id, content: content.trim() },
    include: { user: { select: { id: true, nickname: true, avatarPath: true } } },
  })
  await prisma.userWork.update({ where: { id: req.params.id }, data: { commentCount: { increment: 1 } } })

  created(res, comment)
}

export async function getDailyChallenge(req, res) {
  const date = new Date().toISOString().slice(0, 10)
  const challenge = await prisma.dailyChallenge.findUnique({ where: { date } })
  if (!challenge) return fail(res, '今日挑战尚未发布', 404)

  const { answer, ...safe } = challenge
  ok(res, safe)
}

export async function submitChallenge(req, res) {
  const date = new Date().toISOString().slice(0, 10)
  const userId = req.user.id

  const challenge = await prisma.dailyChallenge.findUnique({ where: { date } })
  if (!challenge) return fail(res, '挑战不存在')

  const exists = await prisma.challengeSubmission.findUnique({
    where: { userId_challengeId: { userId, challengeId: challenge.id } },
  })
  if (exists) return fail(res, '已提交过今日挑战')

  const isCorrect = req.body.answer === challenge.answer

  await prisma.challengeSubmission.create({
    data: { userId, challengeId: challenge.id, answer: req.body.answer, isCorrect },
  })

  if (isCorrect) await achievementService.addExp(userId, 20)

  ok(res, { isCorrect, explanation: challenge.explanation, correctAnswer: challenge.answer })
}

export async function challengeRank(req, res) {
  const date = new Date().toISOString().slice(0, 10)
  const challenge = await prisma.dailyChallenge.findUnique({ where: { date } })
  if (!challenge) return ok(res, [])

  const rank = await prisma.challengeSubmission.findMany({
    where: { challengeId: challenge.id, isCorrect: true },
    include: { user: { select: { id: true, nickname: true, avatarPath: true, level: true } } },
    orderBy: { submittedAt: 'asc' },
    take: 50,
  })
  ok(res, rank)
}
