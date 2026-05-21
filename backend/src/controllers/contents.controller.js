import { prisma } from '../app.js'
import * as cache from '../utils/cache.js'
import { ok, notFound, fail } from '../utils/response.js'

export async function list(req, res) {
  const { category, dynasty, difficulty, page = 1, limit = 20 } = req.query
  const where = {}
  if (category) where.category = category
  if (dynasty) where.dynasty = dynasty
  if (difficulty) where.difficulty = parseInt(difficulty)

  const [total, items] = await Promise.all([
    prisma.content.count({ where }),
    prisma.content.findMany({
      where,
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: { id: true, category: true, title: true, author: true, dynasty: true, difficulty: true, tags: true, viewCount: true },
    }),
  ])

  ok(res, { total, page: parseInt(page), items })
}

export async function detail(req, res) {
  const cacheKey = `content:${req.params.id}`
  const cached = cache.get(cacheKey)
  if (cached) return ok(res, cached)

  const content = await prisma.content.findUnique({ where: { id: req.params.id } })
  if (!content) return notFound(res)

  cache.set(cacheKey, content, 3600)
  ok(res, content)
}

export async function daily(req, res) {
  const cacheKey = 'daily:recommend'
  const cached = cache.get(cacheKey)
  if (cached) return ok(res, cached)

  const items = await prisma.content.findMany({
    where: { isPremium: false },
    orderBy: { viewCount: 'desc' },
    take: 10,
    select: { id: true, category: true, title: true, author: true, dynasty: true, difficulty: true },
  })

  const midnight = new Date()
  midnight.setDate(midnight.getDate() + 1)
  midnight.setHours(0, 0, 0, 0)
  cache.set(cacheKey, items, Math.floor((midnight - Date.now()) / 1000))

  ok(res, items)
}

export async function seasonContent(req, res) {
  const month = new Date().getMonth() + 1
  const seasonMap = {
    1: '立春', 2: '雨水', 3: '惊蛰', 4: '春分', 5: '清明', 6: '谷雨',
    7: '立夏', 8: '小满', 9: '芒种', 10: '夏至', 11: '小暑', 12: '大暑',
  }
  const season = seasonMap[month] || '节气'

  const items = await prisma.content.findMany({
    where: { category: 'season', tags: { contains: season } },
    take: 5,
  })
  ok(res, { season, items })
}

export async function recordView(req, res) {
  await prisma.content.update({
    where: { id: req.params.id },
    data: { viewCount: { increment: 1 } },
  })
  cache.del(`content:${req.params.id}`)
  ok(res)
}

export async function toggleFavorite(req, res) {
  const { id: contentId } = req.params
  const { id: userId } = req.user

  const exists = await prisma.favorite.findUnique({
    where: { userId_contentId: { userId, contentId } },
  })

  if (exists) {
    await prisma.favorite.delete({ where: { userId_contentId: { userId, contentId } } })
    ok(res, { favorited: false })
  } else {
    await prisma.favorite.create({ data: { userId, contentId } })
    ok(res, { favorited: true })
  }
}

export async function myFavorites(req, res) {
  const items = await prisma.favorite.findMany({
    where: { userId: req.user.id },
    include: { content: true },
    orderBy: { createdAt: 'desc' },
  })
  ok(res, items.map((f) => f.content))
}
