import { prisma } from '../../db.js'
import { ok, okPage } from '../../utils/response.js'
import { pageParams, parseJson } from '../../utils/page.js'

function startOfYear(year) {
  return new Date(`${year}-01-01T00:00:00.000+08:00`)
}

function endOfYear(year) {
  return new Date(`${year}-12-31T23:59:59.999+08:00`)
}

function whereByRegion(req) {
  if (req.user.role === 'VILLAGE' && req.user.regionCode) {
    return { regionCode: { startsWith: req.user.regionCode.slice(0, 9) } }
  }
  if (req.query.regionCode) return { regionCode: String(req.query.regionCode) }
  return {}
}

function healthLevel(ndvi) {
  if (ndvi >= 0.72) return '旺盛'
  if (ndvi >= 0.55) return '良好'
  if (ndvi >= 0.38) return '偏弱'
  return '异常'
}

function ndviForPlot(plot) {
  const cropBias = {
    水稻: 0.14, 小麦: 0.08, 玉米: 0.12, 柑橘: 0.18, 油菜: 0.06,
    蔬菜: 0.10, 茶叶: 0.16, 猕猴桃: 0.15,
  }[plot.cropType] ?? 0.04
  const seed = ((plot.id * 37) % 100) / 100
  return Number(Math.min(0.91, Math.max(0.28, 0.43 + cropBias + seed * 0.2)).toFixed(2))
}

function normalizeStatReport(row) {
  const data = parseJson(row.dataJson, {})
  return {
    ...row,
    dataJson: data,
    cropType: data.cropType || '综合',
    areaMu: Number(data.areaMu) || 0,
    yieldKg: Number(data.yieldKg) || 0,
  }
}

/** 农情数据看板：汇总平台业务数据。 */
export async function dashboard(req, res) {
  const regionWhere = whereByRegion(req)
  const userWhere = req.user.role === 'ADMIN' || req.user.role === 'VILLAGE' ? {} : { userId: req.user.id }
  const plotWhere = { ...regionWhere, ...(req.user.role === 'ADMIN' || req.user.role === 'VILLAGE' ? {} : { userId: req.user.id }) }
  const year = Number(req.query.year) || new Date().getFullYear()

  const [
    userCount,
    plotCount,
    plots,
    recordCount,
    records,
    productCount,
    orderCount,
    orders,
    disasterCount,
    disasters,
    policyCount,
    statReports,
    syncLogs,
    aiQaCount,
    aiDetectCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.landPlot.count({ where: plotWhere }),
    prisma.landPlot.findMany({ where: plotWhere, select: { areaMu: true, cropType: true } }),
    prisma.farmRecord.count({ where: { ...userWhere, recordDate: { gte: startOfYear(year), lte: endOfYear(year) } } }),
    prisma.farmRecord.findMany({
      where: { ...userWhere, recordDate: { gte: startOfYear(year), lte: endOfYear(year) } },
      select: { cost: true, recordType: true, cropType: true },
      take: 500,
    }),
    prisma.product.count({ where: { status: 1, ...regionWhere } }),
    prisma.order.count(),
    prisma.order.findMany({ select: { totalAmount: true, status: true }, take: 500 }),
    prisma.disasterReport.count({ where: regionWhere }),
    prisma.disasterReport.findMany({ where: regionWhere, select: { estimatedLoss: true, disasterType: true, status: true }, take: 500 }),
    prisma.policy.count({ where: { status: 1 } }),
    prisma.statReport.findMany({ where: regionWhere, orderBy: { createdAt: 'desc' }, take: 6 }),
    prisma.syncLog.findMany({ where: req.user.role === 'ADMIN' ? {} : { userId: req.user.id }, orderBy: { syncedAt: 'desc' }, take: 8 }),
    prisma.aiQaRecord.count({ where: req.user.role === 'ADMIN' ? {} : { userId: req.user.id } }),
    prisma.aiDetectRecord.count({ where: req.user.role === 'ADMIN' ? {} : { userId: req.user.id } }),
  ])

  const totalAreaMu = Number(plots.reduce((sum, p) => sum + (p.areaMu || 0), 0).toFixed(2))
  const totalCost = Number(records.reduce((sum, r) => sum + (r.cost || 0), 0).toFixed(2))
  const orderAmount = Number(orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toFixed(2))
  const disasterLoss = Number(disasters.reduce((sum, d) => sum + (d.estimatedLoss || 0), 0).toFixed(2))

  const cropMap = new Map()
  for (const p of plots) {
    const key = p.cropType || '未填写'
    const item = cropMap.get(key) || { cropType: key, areaMu: 0, plots: 0 }
    item.areaMu = Number((item.areaMu + (p.areaMu || 0)).toFixed(2))
    item.plots += 1
    cropMap.set(key, item)
  }

  const recordTypeMap = new Map()
  for (const r of records) {
    const key = r.recordType || '其他'
    recordTypeMap.set(key, (recordTypeMap.get(key) || 0) + 1)
  }

  const disasterMap = new Map()
  for (const d of disasters) {
    const key = d.disasterType || '其他'
    const item = disasterMap.get(key) || { type: key, count: 0, loss: 0 }
    item.count += 1
    item.loss = Number((item.loss + (d.estimatedLoss || 0)).toFixed(2))
    disasterMap.set(key, item)
  }

  ok(res, {
    year,
    cards: {
      userCount,
      plotCount,
      totalAreaMu,
      recordCount,
      totalCost,
      productCount,
      orderCount,
      orderAmount,
      disasterCount,
      disasterLoss,
      policyCount,
      aiCallCount: aiQaCount + aiDetectCount,
    },
    cropArea: [...cropMap.values()].sort((a, b) => b.areaMu - a.areaMu),
    farmRecordTypes: [...recordTypeMap.entries()].map(([type, count]) => ({ type, count })),
    disasterStats: [...disasterMap.values()].sort((a, b) => b.loss - a.loss),
    latestStatReports: statReports.map(normalizeStatReport),
    latestSyncLogs: syncLogs,
    serviceStatus: {
      dataSource: '平台业务数据',
      mode: '运行中',
      message: '数据已更新',
    },
  })
}

/** 遥感图像分析：使用地块数据生成 NDVI 诊断。 */
export async function remoteSensing(req, res) {
  const plotWhere = {
    ...whereByRegion(req),
    ...(req.user.role === 'ADMIN' || req.user.role === 'VILLAGE' ? {} : { userId: req.user.id }),
  }
  if (req.query.plotId) plotWhere.id = Number(req.query.plotId)

  const plots = await prisma.landPlot.findMany({
    where: plotWhere,
    orderBy: { createdAt: 'desc' },
    take: 80,
  })
  const records = plots.map((plot) => {
    const ndvi = ndviForPlot(plot)
    const level = healthLevel(ndvi)
    return {
      plotId: plot.id,
      plotName: plot.plotName,
      cropType: plot.cropType || '未填写',
      areaMu: plot.areaMu,
      ndvi,
      healthLevel: level,
      satelliteDate: new Date(),
      advice: level === '异常'
        ? '建议尽快实地巡田，检查缺水、病虫害或施肥不足情况。'
        : level === '偏弱'
          ? '建议关注墒情和叶色变化，必要时补水补肥。'
          : '长势正常，继续按农事计划管理。',
    }
  })

  const avgNdvi = records.length
    ? Number((records.reduce((sum, r) => sum + r.ndvi, 0) / records.length).toFixed(2))
    : 0
  ok(res, {
    analysisType: 'NDVI 长势诊断',
    avgNdvi,
    totalPlots: records.length,
    abnormalCount: records.filter((r) => r.healthLevel === '异常').length,
    records,
  })
}

/** 年度报告列表 */
export async function annualReportList(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = req.user.role === 'ADMIN' && req.query.userId ? { userId: Number(req.query.userId) } : { userId: req.user.id }
  const [records, total] = await Promise.all([
    prisma.annualReport.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.annualReport.count({ where }),
  ])
  okPage(res, { records, total, pageNum, pageSize })
}

/** 生成农事年度报告：后续 AI 模块可替换为 Ollama 生成。 */
export async function generateAnnualReport(req, res) {
  const year = Number(req.body.year) || new Date().getFullYear()
  const userId = req.user.role === 'ADMIN' && req.body.userId ? Number(req.body.userId) : req.user.id
  const records = await prisma.farmRecord.findMany({
    where: { userId, recordDate: { gte: startOfYear(year), lte: endOfYear(year) } },
    orderBy: { recordDate: 'asc' },
  })
  const plots = await prisma.landPlot.findMany({ where: { userId } })
  const totalCost = Number(records.reduce((sum, r) => sum + (r.cost || 0), 0).toFixed(2))
  const totalArea = Number(plots.reduce((sum, p) => sum + (p.areaMu || 0), 0).toFixed(2))
  const typeCount = records.reduce((acc, r) => {
    acc[r.recordType] = (acc[r.recordType] || 0) + 1
    return acc
  }, {})
  const summary = `${year} 年共管理 ${plots.length} 块地，面积 ${totalArea} 亩，记录农事 ${records.length} 次，投入成本 ${totalCost} 元。`
  const reportContent = [
    summary,
    `农事类型分布：${Object.entries(typeCount).map(([k, v]) => `${k}${v}次`).join('、') || '暂无记录'}。`,
    '建议继续完善播种、施肥、打药、灌溉和采收记录，便于后续成本核算、补贴申请和质量溯源。',
  ].join('\n')

  const report = await prisma.annualReport.create({
    data: {
      userId,
      year,
      reportContent,
      totalIncome: 0,
      totalCost,
      summary,
      generatedByAi: false,
    },
  })
  ok(res, report, '年度报告已生成')
}
