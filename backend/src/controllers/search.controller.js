import { prisma } from '../app.js'
import { ok } from '../utils/response.js'

export async function search(req, res) {
  const { q, category, dynasty, difficulty, page = 1, limit = 20 } = req.query
  if (!q?.trim()) return ok(res, { total: 0, items: [] })

  const where = {}
  if (category) where.category = category
  if (dynasty) where.dynasty = dynasty
  if (difficulty) where.difficulty = parseInt(difficulty)

  // Prisma SQLite 支持 contains 做简单全文匹配
  where.OR = [
    { title: { contains: q } },
    { body: { contains: q } },
    { author: { contains: q } },
    { tags: { contains: q } },
  ]

  const [total, items] = await Promise.all([
    prisma.content.count({ where }),
    prisma.content.findMany({
      where,
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      select: { id: true, category: true, title: true, author: true, dynasty: true, difficulty: true },
    }),
  ])

  ok(res, { total, page: parseInt(page), items })
}

export async function suggest(req, res) {
  const { q } = req.query
  if (!q?.trim()) return ok(res, [])

  const items = await prisma.content.findMany({
    where: { OR: [{ title: { contains: q } }, { author: { contains: q } }] },
    take: 8,
    select: { id: true, title: true, author: true, category: true },
  })
  ok(res, items)
}
