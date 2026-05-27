import { prisma } from '../../db.js'
import { ok } from '../../utils/response.js'
import { pageParams } from '../../utils/page.js'

/** 通知列表（含个人通知 + 全体广播） */
export async function list(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const type = parseType(req.query.type)
  const isRead = parseRead(req.query.isRead)
  const baseWhere = { OR: [{ userId: req.user.id }, { userId: null }] }
  const where = {
    ...baseWhere,
    ...(type ? { type } : {}),
    ...(isRead == null ? {} : { isRead }),
  }
  const unreadWhere = {
    ...baseWhere,
    ...(type ? { type } : {}),
    isRead: false,
  }
  const [records, total, unread, typeGroups] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: unreadWhere }),
    prisma.notification.groupBy({
      by: ['type'],
      where: baseWhere,
      _count: { _all: true },
    }),
  ])
  ok(res, {
    records,
    total,
    pageNum,
    pageSize,
    pages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
    unread,
    typeCounts: Object.fromEntries(
      typeGroups
        .filter((item) => item.type)
        .map((item) => [item.type, item._count._all]),
    ),
  })
}

/** 未读数量 */
export async function unreadCount(req, res) {
  const count = await prisma.notification.count({
    where: { OR: [{ userId: req.user.id }, { userId: null }], isRead: false },
  })
  ok(res, { unread: count })
}

/** 标记已读 */
export async function markRead(req, res) {
  const id = parseInt(req.params.id)
  await prisma.notification.updateMany({
    where: { id, OR: [{ userId: req.user.id }, { userId: null }] },
    data: { isRead: true },
  })
  ok(res, null, '已标记已读')
}

/** 全部已读 */
export async function markAllRead(req, res) {
  await prisma.notification.updateMany({
    where: { OR: [{ userId: req.user.id }, { userId: null }], isRead: false },
    data: { isRead: true },
  })
  ok(res, null, '全部已读')
}

function parseType(value) {
  const type = `${value ?? ''}`.trim().toUpperCase()
  if (!type || type === 'ALL') return null
  return type
}

function parseRead(value) {
  const text = `${value ?? ''}`.trim().toLowerCase()
  if (['true', '1', 'yes'].includes(text)) return true
  if (['false', '0', 'no'].includes(text)) return false
  return null
}
