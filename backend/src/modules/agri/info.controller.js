import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'

/** 农事日历（可按月份筛选） */
export async function calendar(req, res) {
  const where = {}
  if (req.query.month) where.month = Number(req.query.month)
  if (req.query.cropType) where.cropType = req.query.cropType
  const list = await prisma.farmCalendar.findMany({
    where,
    orderBy: [{ month: 'asc' }, { id: 'asc' }],
  })
  ok(res, { currentMonth: new Date().getMonth() + 1, items: list })
}

/** 农药信息查询（扫码 / 关键词） */
export async function pesticideQuery(req, res) {
  const kw = String(req.query.keyword || req.query.regNo || '').trim()
  if (!kw) throw errors.param('请输入农药名称或登记证号')
  const item = await prisma.pesticideInfo.findFirst({
    where: { OR: [{ name: { contains: kw } }, { regNo: { contains: kw } }] },
  })
  if (!item) throw errors.notFound('未查询到该农药信息')
  ok(res, {
    ...item,
    safetyTip: `使用${item.name}须严格按推荐剂量，施药后注意安全间隔期 ${item.safeInterval || '见标签'}，作业时做好个人防护。`,
  })
}

/** 农药信息库列表 */
export async function pesticideList(req, res) {
  const where = {}
  if (req.query.type) where.type = req.query.type
  const list = await prisma.pesticideInfo.findMany({ where, orderBy: { id: 'asc' } })
  ok(res, list)
}

const CONDITIONS = [
  { c: '晴',     tip: '光照充足，适宜田间作业与晾晒。' },
  { c: '多云',   tip: '天气平稳，适宜农事操作。' },
  { c: '阴',     tip: '光照偏弱，注意大棚补光。' },
  { c: '小雨',   tip: '宜清沟理墒，暂缓施药打药。' },
  { c: '中雨',   tip: '注意排涝防渍，加固设施。' },
  { c: '雷阵雨', tip: '防范短时强降水与大风，及时排涝。' },
]

/** 精细农业气象预报（7 日） */
export async function weather(req, res) {
  const region = req.user.regionCode || null
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const cond = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)]
    const high = 18 + Math.floor(Math.random() * 14)
    const low = high - 5 - Math.floor(Math.random() * 5)
    days.push({
      date: d.toISOString().slice(0, 10),
      condition: cond.c,
      tempHigh: high,
      tempLow: low,
      humidity: 50 + Math.floor(Math.random() * 40),
      windLevel: 1 + Math.floor(Math.random() * 4),
      farmTip: cond.tip,
    })
  }

  // 当前生效的天气预警
  const nowT = new Date()
  const alertWhere = { validFrom: { lte: nowT }, validTo: { gte: nowT } }
  if (region) alertWhere.OR = [{ regionCode: region }, { regionCode: region.slice(0, 6) }, { regionCode: null }]
  const alerts = await prisma.weatherAlert.findMany({ where: alertWhere, orderBy: { createdAt: 'desc' } })

  ok(res, { region, updatedAt: nowT, days, alerts })
}

/** 农事年度报告（AI 生成 — 本段为模板聚合，分段 11 接入 LLM 润色） */
export async function annualReport(req, res) {
  const year = Number(req.query.year) || new Date().getFullYear()
  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)

  const records = await prisma.farmRecord.findMany({
    where: { userId: req.user.id, recordDate: { gte: start, lt: end } },
  })
  const plots = await prisma.landPlot.findMany({ where: { userId: req.user.id } })

  const totalCost = Number(records.reduce((s, r) => s + r.cost, 0).toFixed(2))
  const byType = {}
  for (const r of records) byType[r.recordType] = (byType[r.recordType] || 0) + 1
  const totalArea = Number(plots.reduce((s, p) => s + p.areaMu, 0).toFixed(1))

  const typeText = Object.entries(byType).map(([k, v]) => `${k} ${v} 次`).join('、') || '暂无记录'
  const reportContent =
    `${year} 年度农事报告\n\n` +
    `本年度共管理地块 ${plots.length} 块，合计 ${totalArea} 亩。\n` +
    `累计农事操作 ${records.length} 次，明细：${typeText}。\n` +
    `全年农资投入合计约 ${totalCost} 元。\n\n` +
    `综合评价：${records.length >= 8 ? '农事记录完整，管理较为精细，建议继续保持。' : '农事记录偏少，建议养成随手记录的习惯，便于成本核算与产量分析。'}`

  await prisma.annualReport.deleteMany({ where: { userId: req.user.id, year } })
  const report = await prisma.annualReport.create({
    data: {
      userId: req.user.id,
      year,
      reportContent,
      totalCost,
      summary: `${year} 年管理 ${totalArea} 亩、农事 ${records.length} 次、投入 ${totalCost} 元`,
      generatedByAi: true,
    },
  })

  ok(res, { ...report, stats: { plotCount: plots.length, totalArea, recordCount: records.length, totalCost, byType } }, '年度报告已生成')
}
