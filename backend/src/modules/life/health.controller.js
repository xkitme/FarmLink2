import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'
import { parseJson } from '../../utils/page.js'

// ── 村医在线问诊 ────────────────────────────

/** 村卫生室列表 */
export async function clinicList(req, res) {
  const where = {}
  if (req.query.regionCode) where.regionCode = req.query.regionCode
  const rows = await prisma.clinic.findMany({ where, orderBy: { id: 'asc' } })
  ok(res, rows)
}

/** 发起在线问诊 */
export async function consultCreate(req, res) {
  const { clinicId, symptom, images } = req.body
  if (!symptom || !symptom.trim()) throw errors.param('请描述症状')
  const c = await prisma.consultation.create({
    data: {
      userId: req.user.id,
      clinicId: clinicId ? Number(clinicId) : null,
      symptom: symptom.trim(),
      images: images ? JSON.stringify(images) : null,
      status: 'PENDING',
    },
  })
  ok(res, c, '问诊已提交，村医将尽快回复')
}

/** 我的问诊记录 */
export async function consultList(req, res) {
  const rows = await prisma.consultation.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  })
  ok(res, rows.map((c) => ({ ...c, images: parseJson(c.images, []) })))
}

/** 村医回复问诊（医生/管理员） */
export async function consultReply(req, res) {
  if (!['ADMIN', 'EXPERT'].includes(req.user.role)) throw errors.forbidden('仅村医可回复')
  const id = Number(req.params.id)
  const { doctorReply } = req.body
  if (!doctorReply) throw errors.param('请填写回复内容')
  const c = await prisma.consultation.findUnique({ where: { id } })
  if (!c) throw errors.notFound('问诊记录不存在')
  const updated = await prisma.consultation.update({
    where: { id },
    data: { doctorReply, status: 'REPLIED', replyAt: new Date() },
  })
  ok(res, updated, '回复成功')
}

// ── 养老关爱服务 ────────────────────────────

/** 养老关爱服务清单 */
export async function elderServices(req, res) {
  ok(res, {
    services: [
      { name: '高龄老人补贴', desc: '80 周岁以上老人可申领高龄津贴，到村委登记办理。' },
      { name: '居家养老上门服务', desc: '为失能、半失能老人提供助餐、助洁、助医上门服务。' },
      { name: '日间照料中心', desc: '老人可到村日间照料中心休息、就餐、文娱活动。' },
      { name: '城乡居民养老保险', desc: '按年缴费，到龄后按月领取养老金，多缴多得。' },
      { name: '医养结合签约', desc: '与村卫生室签约，享受定期健康随访与慢病管理。' },
    ],
    hotline: '养老服务咨询：96156',
  })
}

/** 老人健康打卡 */
export async function elderCheckin(req, res) {
  const { mood, bloodPressure, note } = req.body
  ok(res, {
    checkinAt: new Date(),
    mood: mood || '良好',
    bloodPressure: bloodPressure || null,
    note: note || null,
    tip: '已记录今日健康状况。如有不适，请及时联系村卫生室或拨打 120。',
  }, '健康打卡成功')
}
