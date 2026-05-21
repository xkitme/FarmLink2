import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'

// ── 职业农民培训 ────────────────────────────

/** 培训课程列表 */
export async function courseList(req, res) {
  const where = {}
  if (req.query.category) where.category = req.query.category
  const rows = await prisma.trainingCourse.findMany({ where, orderBy: { enrollCount: 'desc' } })
  ok(res, rows)
}

/** 课程详情 */
export async function courseDetail(req, res) {
  const course = await prisma.trainingCourse.findUnique({ where: { id: Number(req.params.id) } })
  if (!course) throw errors.notFound('课程不存在')
  let enrollment = null
  if (req.user) {
    enrollment = await prisma.courseEnrollment.findFirst({
      where: { userId: req.user.id, courseId: course.id },
    })
  }
  ok(res, { ...course, enrollment })
}

/** 报名课程 */
export async function enroll(req, res) {
  const courseId = Number(req.params.id)
  const course = await prisma.trainingCourse.findUnique({ where: { id: courseId } })
  if (!course) throw errors.notFound('课程不存在')

  const exist = await prisma.courseEnrollment.findFirst({
    where: { userId: req.user.id, courseId },
  })
  if (exist) return ok(res, exist, '你已报名该课程')

  const enrollment = await prisma.courseEnrollment.create({
    data: { userId: req.user.id, courseId, progress: 0, completed: false },
  })
  await prisma.trainingCourse.update({
    where: { id: courseId }, data: { enrollCount: { increment: 1 } },
  })
  ok(res, enrollment, '报名成功')
}

/** 更新学习进度（达 100% 自动结业发证） */
export async function updateProgress(req, res) {
  const courseId = Number(req.params.id)
  const progress = Math.min(100, Math.max(0, Number(req.body.progress) || 0))

  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { userId: req.user.id, courseId },
  })
  if (!enrollment) throw errors.notFound('请先报名该课程')

  const data = { progress }
  if (progress >= 100 && !enrollment.completed) {
    data.completed = true
    data.certNo = 'CERT' + Date.now()
    data.certIssuedAt = new Date()
  }
  const updated = await prisma.courseEnrollment.update({
    where: { id: enrollment.id }, data,
  })
  ok(res, updated, updated.completed ? '恭喜结业，已颁发证书！' : '学习进度已更新')
}

/** 我的培训 */
export async function myTraining(req, res) {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  })
  const courseIds = [...new Set(enrollments.map((e) => e.courseId))]
  const courses = await prisma.trainingCourse.findMany({ where: { id: { in: courseIds } } })
  const cmap = Object.fromEntries(courses.map((c) => [c.id, c]))
  ok(res, enrollments.map((e) => ({ ...e, course: cmap[e.courseId] || null })))
}

// ── 乡村人才库 ──────────────────────────────

/** 人才库列表 */
export async function talentList(req, res) {
  const where = {}
  if (req.query.talentType) where.talentType = req.query.talentType
  if (req.query.regionCode) where.regionCode = req.query.regionCode
  const rows = await prisma.talentProfile.findMany({ where, orderBy: { createdAt: 'desc' } })
  ok(res, rows)
}

/** 申请入库 */
export async function talentApply(req, res) {
  const { name, talentType, skills, description, photo, contactPhone } = req.body
  if (!name || !talentType) throw errors.param('姓名和人才类型必填')
  const talent = await prisma.talentProfile.create({
    data: {
      userId: req.user.id,
      name, talentType,
      skills: skills || null,
      regionCode: req.user.regionCode || null,
      description: description || null,
      photo: photo || null,
      contactPhone: contactPhone || req.user.phone || null,
    },
  })
  ok(res, talent, '已加入乡村人才库')
}
