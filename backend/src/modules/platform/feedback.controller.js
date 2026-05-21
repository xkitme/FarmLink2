import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams } from '../../utils/page.js'

/** 提交反馈 */
export async function create(req, res) {
  const { category, content, contact, images } = req.body
  if (!content || !content.trim()) throw errors.param('反馈内容不能为空')
  const fb = await prisma.feedback.create({
    data: {
      userId: req.user?.id || null,
      category: category || '建议',
      content: content.trim(),
      contact: contact || null,
      images: images ? JSON.stringify(images) : null,
    },
  })
  ok(res, fb, '反馈已提交，感谢你的建议')
}

/** 我的反馈记录 */
export async function listMine(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = { userId: req.user.id }
  const [records, total] = await Promise.all([
    prisma.feedback.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.feedback.count({ where }),
  ])
  okPage(res, { records, total, pageNum, pageSize })
}
