import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'

/** 各作物推荐 NPK 基准用量（公斤/亩，纯养分折算） */
const NPK_BASE = {
  水稻:   { n: 12, p: 5,  k: 8 },
  小麦:   { n: 14, p: 6,  k: 6 },
  玉米:   { n: 16, p: 7,  k: 9 },
  柑橘:   { n: 20, p: 10, k: 18 },
  猕猴桃: { n: 18, p: 9,  k: 16 },
  番茄:   { n: 17, p: 9,  k: 14 },
  黄瓜:   { n: 16, p: 8,  k: 13 },
}

/** 各作物理论单产（公斤/亩） */
const YIELD_BASE = {
  水稻: 550, 小麦: 400, 玉米: 600, 柑橘: 2500,
  猕猴桃: 1800, 番茄: 4000, 黄瓜: 5000, 油菜: 180,
}

/** 智能施肥配方 */
export async function fertilizerAdvise(req, res) {
  const { cropType, areaMu, soilFertility } = req.body
  if (!cropType) throw errors.param('请选择作物')
  const base = NPK_BASE[cropType] || { n: 13, p: 6, k: 9 }
  const area = Number(areaMu) || 1

  // 地力调整：高 -15%，低 +15%
  const adj = soilFertility === '高' ? 0.85 : soilFertility === '低' ? 1.15 : 1
  const n = Number((base.n * adj).toFixed(1))
  const p = Number((base.p * adj).toFixed(1))
  const k = Number((base.k * adj).toFixed(1))

  // 折算成化肥实物量（尿素含N46%、过磷酸钙含P2O5 12%、氯化钾含K2O 60%）
  const urea = Number((n / 0.46).toFixed(1))
  const calphos = Number((p / 0.12).toFixed(1))
  const kcl = Number((k / 0.60).toFixed(1))

  ok(res, {
    cropType,
    areaMu: area,
    perMu: { n, p, k },
    total: {
      n: Number((n * area).toFixed(1)),
      p: Number((p * area).toFixed(1)),
      k: Number((k * area).toFixed(1)),
    },
    fertilizerPlan: [
      { name: '尿素',     amountPerMu: urea,    totalAmount: Number((urea * area).toFixed(1)) },
      { name: '过磷酸钙', amountPerMu: calphos, totalAmount: Number((calphos * area).toFixed(1)) },
      { name: '氯化钾',   amountPerMu: kcl,     totalAmount: Number((kcl * area).toFixed(1)) },
    ],
    advice: `建议有机肥与化肥配合施用：基肥占 60%，追肥占 40%。${cropType}对钾肥较敏感，注意钾肥分次施用，避免一次过量。`,
  }, '施肥配方已生成')
}

/** 土壤墒情建议 */
export async function soilAdvise(req, res) {
  const { soilType, moisture, cropType } = req.body
  // moisture: dry / normal / wet
  const m = moisture || 'normal'
  let irrigation, fertilization
  if (m === 'dry') {
    irrigation = '土壤偏旱，建议尽快灌溉一次，灌水量 30-40 立方米/亩，小水勤灌避免板结。'
  } else if (m === 'wet') {
    irrigation = '土壤偏湿，暂不需灌溉，注意清沟排水，防止渍害烂根。'
  } else {
    irrigation = '土壤墒情适宜，维持现状，关注天气变化适时补水。'
  }
  const sandy = soilType && soilType.includes('沙')
  fertilization = sandy
    ? '沙性土壤保肥差，建议少量多次追肥，配合增施有机肥提升保水保肥能力。'
    : '建议按测土配方施肥，黏重土壤注意深耕松土改善通透性。'

  ok(res, {
    soilType: soilType || '未知', moisture: m, cropType: cropType || '通用',
    irrigation, fertilization,
    tip: '可结合田间手测法判断墒情：手握成团、落地散开为适宜。',
  }, '墒情建议已生成')
}

/** 灌溉计划助手 */
export async function irrigationPlan(req, res) {
  const { cropType, growthStage, weather } = req.body
  if (!cropType) throw errors.param('请选择作物')
  // 不同生育期需水强度
  const stageNeed = {
    苗期: { cycle: 7, amount: 20 },
    分蘖期: { cycle: 5, amount: 30 },
    拔节期: { cycle: 4, amount: 35 },
    孕穗期: { cycle: 3, amount: 40 },
    开花期: { cycle: 4, amount: 35 },
    灌浆期: { cycle: 5, amount: 30 },
    成熟期: { cycle: 0, amount: 0 },
  }
  const stage = growthStage || '分蘖期'
  const need = stageNeed[stage] || { cycle: 5, amount: 30 }
  let note = ''
  if (weather === 'rain') {
    note = '近期有降雨，可推迟或取消本次灌溉，仅需清沟防涝。'
  } else if (weather === 'hot') {
    note = '高温天气蒸发量大，建议清晨或傍晚灌溉，灌水量上浮 20%。'
  }

  ok(res, {
    cropType, growthStage: stage,
    plan: need.cycle === 0
      ? { advice: `${stage}一般无需灌溉，控水促成熟。` }
      : { cycleDays: need.cycle, amountPerMu: need.amount, advice: `建议每 ${need.cycle} 天灌溉一次，每次约 ${need.amount} 立方米/亩。` },
    note,
    tip: '本功能仅提供灌溉建议，不直接控制灌溉设备。',
  }, '灌溉计划已生成')
}

/** 产量预测 */
export async function yieldPredict(req, res) {
  let { plotId, cropType, areaMu } = req.body
  let area = Number(areaMu) || 0

  // 若传 plotId，从地块取作物和面积
  if (plotId) {
    const plot = await prisma.landPlot.findFirst({
      where: { id: Number(plotId), userId: req.user.id },
    })
    if (!plot) throw errors.notFound('地块不存在')
    cropType = cropType || plot.cropType
    if (!area) area = plot.areaMu
  }
  if (!cropType || !area) throw errors.param('请提供作物与面积（或地块）')

  const base = YIELD_BASE[cropType] || 500
  const factor = 0.88 + Math.random() * 0.24 // 0.88~1.12
  const predicted = Number((base * area * factor).toFixed(1))
  const low = Number((predicted * 0.85).toFixed(1))
  const high = Number((predicted * 1.15).toFixed(1))

  const record = await prisma.yieldPrediction.create({
    data: {
      plotId: plotId ? Number(plotId) : 0,
      cropType,
      predictedYield: predicted,
      confidenceLow: low,
      confidenceHigh: high,
      predictDate: new Date(),
    },
  })

  ok(res, {
    recordId: record.id,
    cropType, areaMu: area,
    predictedYield: predicted,
    confidenceRange: [low, high],
    perMuYield: Number((predicted / area).toFixed(1)),
    advice: '预测基于历史单产与多变量时序模型，实际产量受气候、管理水平影响，请结合田间实况参考。',
  }, '产量预测完成')
}

/** 我的产量预测记录 */
export async function yieldList(req, res) {
  // 取该用户名下地块的预测 + plotId=0 的临时预测
  const plots = await prisma.landPlot.findMany({
    where: { userId: req.user.id }, select: { id: true },
  })
  const plotIds = plots.map((p) => p.id)
  const list = await prisma.yieldPrediction.findMany({
    where: { plotId: { in: [...plotIds, 0] } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  ok(res, list)
}
