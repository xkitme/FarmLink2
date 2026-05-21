import { prisma } from '../../db.js'
import { ok, okPage, errors } from '../../utils/response.js'
import { pageParams, parseJson } from '../../utils/page.js'

// ── 村务公开公示 ────────────────────────────

/** 村务公开列表 */
export async function affairList(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = {}
  if (req.query.category) where.category = req.query.category
  if (req.query.regionCode) where.regionCode = req.query.regionCode
  const [rows, total] = await Promise.all([
    prisma.villageAffair.findMany({ where, orderBy: { publishDate: 'desc' }, skip, take }),
    prisma.villageAffair.count({ where }),
  ])
  okPage(res, {
    records: rows.map((r) => ({ ...r, attachments: parseJson(r.attachments, []) })),
    total, pageNum, pageSize,
  })
}

/** 发布村务公开（村委/管理员） */
export async function affairCreate(req, res) {
  if (!['VILLAGE', 'ADMIN'].includes(req.user.role)) throw errors.forbidden('仅村委可发布村务公开')
  const { category, title, content, attachments } = req.body
  if (!category || !title) throw errors.param('类别和标题必填')
  const affair = await prisma.villageAffair.create({
    data: {
      regionCode: req.user.regionCode || null,
      category, title,
      content: content || null,
      attachments: attachments ? JSON.stringify(attachments) : null,
      publishOrg: `${req.user.villageName || ''}村委会`,
      publishDate: new Date(),
    },
  })
  ok(res, affair, '村务公开已发布')
}

// ── 文明乡风榜 ──────────────────────────────

/** 文明乡风榜列表 */
export async function honorList(req, res) {
  const where = { status: 'PUBLISHED' }
  if (req.query.regionCode) where.regionCode = req.query.regionCode
  if (req.query.honorType) where.honorType = req.query.honorType
  if (req.query.all === '1' && ['VILLAGE', 'ADMIN'].includes(req.user?.role)) delete where.status
  const rows = await prisma.honorRecord.findMany({ where, orderBy: { votes: 'desc' } })
  ok(res, rows.map((r) => ({ ...r, images: parseJson(r.images, []) })))
}

/** 上报好人好事 */
export async function honorCreate(req, res) {
  const { honoreeName, honorType, deed, images } = req.body
  if (!honoreeName || !deed) throw errors.param('受表彰人和事迹必填')
  const record = await prisma.honorRecord.create({
    data: {
      regionCode: req.user.regionCode || null,
      honoreeName,
      honorType: honorType || '好人好事',
      deed,
      images: images ? JSON.stringify(images) : null,
      votes: 0,
      // 村委直接发布，普通用户需审核
      status: ['VILLAGE', 'ADMIN'].includes(req.user.role) ? 'PUBLISHED' : 'PENDING',
    },
  })
  ok(res, record, record.status === 'PUBLISHED' ? '已发布到文明乡风榜' : '已提交，待村委审核')
}

/** 为好人好事点赞 */
export async function honorVote(req, res) {
  const id = Number(req.params.id)
  const record = await prisma.honorRecord.findUnique({ where: { id } })
  if (!record) throw errors.notFound('记录不存在')
  const updated = await prisma.honorRecord.update({
    where: { id }, data: { votes: { increment: 1 } },
  })
  ok(res, { id, votes: updated.votes }, '点赞成功')
}
