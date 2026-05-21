import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'
import { parseJson } from '../../utils/page.js'

// ── 应急预案 ────────────────────────────────

/** 应急预案查询 */
export async function guideList(req, res) {
  const where = {}
  if (req.query.disasterType) where.disasterType = req.query.disasterType
  const rows = await prisma.emergencyGuide.findMany({ where, orderBy: { id: 'asc' } })
  ok(res, rows.map((g) => ({ ...g, steps: parseJson(g.steps, []) })))
}

/** 应急预案详情 */
export async function guideDetail(req, res) {
  const g = await prisma.emergencyGuide.findUnique({ where: { id: Number(req.params.id) } })
  if (!g) throw errors.notFound('应急预案不存在')
  ok(res, { ...g, steps: parseJson(g.steps, []) })
}

// ── 一键求助 ────────────────────────────────

/** 紧急联系人（离线常备） */
const SOS_CONTACTS = [
  { name: '村委会值班', phone: '028-88661000' },
  { name: '镇农业服务站', phone: '028-88662000' },
  { name: '农业保险服务专线', phone: '95518' },
  { name: '医疗急救', phone: '120' },
  { name: '消防/森林火警', phone: '119 / 12119' },
]

/** 发起一键求助 */
export async function sosCreate(req, res) {
  const { sosType, location, description, contactPhone } = req.body
  const sos = await prisma.sosRecord.create({
    data: {
      userId: req.user.id,
      sosType: sosType || '灾情',
      location: location ? JSON.stringify(location) : null,
      description: description || null,
      contactPhone: contactPhone || req.user.phone || null,
      status: 'PENDING',
    },
  })
  await prisma.notification.create({
    data: {
      userId: null,
      type: 'ALERT',
      title: '紧急求助',
      content: `有村民发起【${sos.sosType}】求助，请相关人员尽快响应。`,
      refId: sos.id,
    },
  })
  ok(res, { ...sos, contacts: SOS_CONTACTS }, '求助已发出，请同时电话联系紧急联系人')
}

/** 求助记录（村委查全部，普通用户查自己） */
export async function sosList(req, res) {
  const where = {}
  if (!['VILLAGE', 'ADMIN'].includes(req.user.role)) where.userId = req.user.id
  else if (req.query.status) where.status = req.query.status
  const rows = await prisma.sosRecord.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 })
  ok(res, { records: rows.map((s) => ({ ...s, location: parseJson(s.location, null) })), contacts: SOS_CONTACTS })
}

/** 更新求助处理状态 */
export async function sosStatus(req, res) {
  if (!['VILLAGE', 'ADMIN'].includes(req.user.role)) throw errors.forbidden('仅村委可处理求助')
  const id = Number(req.params.id)
  const { status, handledBy } = req.body
  if (!['PENDING', 'HANDLING', 'DONE'].includes(status)) throw errors.param('状态不合法')
  const s = await prisma.sosRecord.findUnique({ where: { id } })
  if (!s) throw errors.notFound('求助记录不存在')
  const updated = await prisma.sosRecord.update({
    where: { id },
    data: { status, handledBy: handledBy || req.user.username },
  })
  ok(res, updated, '处理状态已更新')
}
