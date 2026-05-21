import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'

/**
 * 全局搜索：跨政策、农技知识、商品、招工、培训课程等模块。
 * 查询参数：keyword（或 q）、type（可选，限定单一类型）
 */
export async function globalSearch(req, res) {
  const kw = String(req.query.keyword || req.query.q || '').trim()
  if (!kw) throw errors.param('请输入搜索关键词')
  const type = req.query.type
  const like = { contains: kw }
  const TAKE = 10

  const tasks = {
    policy: () => prisma.policy.findMany({
      where: { status: 1, OR: [{ title: like }, { summary: like }] },
      select: { id: true, title: true, summary: true, level: true, category: true },
      take: TAKE,
    }),
    disease: () => prisma.diseaseKnowledge.findMany({
      where: { OR: [{ diseaseName: like }, { symptoms: like }, { cropType: like }] },
      select: { id: true, diseaseName: true, cropType: true, category: true },
      take: TAKE,
    }),
    product: () => prisma.product.findMany({
      where: { status: 1, OR: [{ title: like }, { description: like }] },
      select: { id: true, title: true, price: true, unit: true, category: true },
      take: TAKE,
    }),
    job: () => prisma.jobInfo.findMany({
      where: { status: 'OPEN', OR: [{ title: like }, { company: like }] },
      select: { id: true, title: true, company: true, salary: true, jobType: true },
      take: TAKE,
    }),
    course: () => prisma.trainingCourse.findMany({
      where: { OR: [{ title: like }, { content: like }] },
      select: { id: true, title: true, category: true, instructor: true },
      take: TAKE,
    }),
  }

  let result = {}
  if (type && tasks[type]) {
    result[type] = await tasks[type]()
  } else {
    const keys = Object.keys(tasks)
    const values = await Promise.all(keys.map((k) => tasks[k]()))
    keys.forEach((k, i) => { result[k] = values[i] })
  }

  const total = Object.values(result).reduce((sum, arr) => sum + arr.length, 0)
  ok(res, { keyword: kw, total, ...result })
}
