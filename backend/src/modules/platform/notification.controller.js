import { prisma } from '../../db.js'
import { ok, okPage } from '../../utils/response.js'
import { pageParams } from '../../utils/page.js'

/** 通知列表（含个人通知 + 全体广播） */
export async function list(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = { OR: [{ userId: req.user.id }, { userId: null }] }
  const [records, total, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, isRead: false } }),
  ])
  okPage(res, { records, total, pageNum, pageSize })
  // 未读数通过响应头附带
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
