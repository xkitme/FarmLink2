import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'

// ── 党建学习打卡 ────────────────────────────

/** 党建学习内容列表 */
export async function lessonList(req, res) {
  const where = {}
  if (req.query.type) where.type = req.query.type
  const rows = await prisma.partyLesson.findMany({ where, orderBy: { publishDate: 'desc' } })
  // 标记本人是否已学
  const logs = await prisma.partyLearnLog.findMany({
    where: { userId: req.user.id, lessonId: { in: rows.map((r) => r.id) } },
    select: { lessonId: true },
  })
  const done = new Set(logs.map((l) => l.lessonId))
  ok(res, rows.map((r) => ({ ...r, learned: done.has(r.id) })))
}

/** 党建学习详情 */
export async function lessonDetail(req, res) {
  const lesson = await prisma.partyLesson.findUnique({ where: { id: Number(req.params.id) } })
  if (!lesson) throw errors.notFound('学习内容不存在')
  ok(res, lesson)
}

/** 完成学习打卡（首次完成奖励积分） */
export async function lessonFinish(req, res) {
  const lessonId = Number(req.params.id)
  const lesson = await prisma.partyLesson.findUnique({ where: { id: lessonId } })
  if (!lesson) throw errors.notFound('学习内容不存在')

  const exist = await prisma.partyLearnLog.findFirst({
    where: { userId: req.user.id, lessonId },
  })
  if (exist) return ok(res, { learned: true, awarded: 0 }, '今日已学习过该内容')

  const points = lesson.pointsReward || 0
  await prisma.partyLearnLog.create({
    data: { userId: req.user.id, lessonId, points, learnDate: new Date() },
  })
  if (points > 0) {
    await prisma.user.update({ where: { id: req.user.id }, data: { points: { increment: points } } })
    await prisma.pointsLog.create({
      data: { userId: req.user.id, points, type: 'LEARN', remark: `党建学习：${lesson.title}`, refId: lessonId },
    })
  }
  ok(res, { learned: true, awarded: points }, `学习打卡成功，获得 ${points} 积分`)
}

/** 我的学习记录 */
export async function learnLog(req, res) {
  const logs = await prisma.partyLearnLog.findMany({
    where: { userId: req.user.id },
    orderBy: { learnDate: 'desc' },
  })
  const lessonIds = [...new Set(logs.map((l) => l.lessonId))]
  const lessons = await prisma.partyLesson.findMany({
    where: { id: { in: lessonIds } },
    select: { id: true, title: true, type: true },
  })
  const lmap = Object.fromEntries(lessons.map((l) => [l.id, l]))
  const totalPoints = logs.reduce((s, l) => s + l.points, 0)
  ok(res, {
    totalLessons: logs.length,
    totalPoints,
    records: logs.map((l) => ({ ...l, lesson: lmap[l.lessonId] || null })),
  })
}

// ── 乡村振兴积分 ────────────────────────────

/** 积分排行榜 */
export async function pointsRank(req, res) {
  const top = await prisma.user.findMany({
    where: { status: 1 },
    orderBy: { points: 'desc' },
    take: 20,
    select: { id: true, nickname: true, villageName: true, points: true, role: true },
  })
  const me = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, nickname: true, points: true },
  })
  const myRank = (await prisma.user.count({ where: { points: { gt: me.points }, status: 1 } })) + 1
  ok(res, {
    rank: top.map((u, i) => ({ ...u, rank: i + 1 })),
    me: { ...me, rank: myRank },
  })
}

/** 积分兑换商品目录 */
const EXCHANGE_ITEMS = [
  { id: 1, name: '有机复合肥一袋', cost: 200 },
  { id: 2, name: '优质稻种 2 公斤', cost: 150 },
  { id: 3, name: '农技培训优先名额', cost: 100 },
  { id: 4, name: '生活日用品大礼包', cost: 300 },
  { id: 5, name: '话费充值 20 元', cost: 120 },
]

export async function exchangeItems(req, res) {
  ok(res, EXCHANGE_ITEMS)
}

/** 积分兑换 */
export async function pointsExchange(req, res) {
  const item = EXCHANGE_ITEMS.find((i) => i.id === Number(req.body.itemId))
  if (!item) throw errors.param('兑换商品不存在')
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { points: true } })
  if (user.points < item.cost) throw errors.param(`积分不足，兑换需 ${item.cost} 分，当前 ${user.points} 分`)

  await prisma.user.update({ where: { id: req.user.id }, data: { points: { decrement: item.cost } } })
  await prisma.pointsLog.create({
    data: { userId: req.user.id, points: -item.cost, type: 'EXCHANGE', remark: `兑换：${item.name}`, refId: item.id },
  })
  ok(res, { item, remainPoints: user.points - item.cost }, `兑换成功：${item.name}`)
}
