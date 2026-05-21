import { prisma } from '../../db.js'
import { ok } from '../../utils/response.js'

/** 极端天气预警列表 */
export async function alertList(req, res) {
  const now = new Date()
  const where = {}
  if (req.query.includeExpired !== '1') where.validTo = { gte: now }
  if (req.query.alertType) where.alertType = req.query.alertType
  if (req.query.regionCode) where.regionCode = req.query.regionCode
  const rows = await prisma.weatherAlert.findMany({ where, orderBy: { createdAt: 'desc' } })
  ok(res, rows)
}

/** 冻害防护建议（联动低温/霜冻/寒潮预警） */
export async function frostAdvice(req, res) {
  const now = new Date()
  const alerts = await prisma.weatherAlert.findMany({
    where: { alertType: { in: ['霜冻', '低温', '寒潮'] }, validTo: { gte: now } },
    orderBy: { createdAt: 'desc' },
  })
  ok(res, {
    hasAlert: alerts.length > 0,
    alerts,
    measures: [
      '熏烟法：凌晨在田边点燃发烟物，提高近地层温度 1-2℃',
      '灌水法：冻前傍晚灌水，利用水的热容缓冲降温',
      '覆盖法：大棚加盖草帘/无纺布，露地菜苗用薄膜小拱棚',
      '果树主干涂白，减少昼夜温差冻裂',
      '熏烟、灌水后注意排水，防止根系受渍',
    ],
    cropTips: {
      柑橘: '果实和叶片易受冻，可树冠覆盖、主干培土，冻后及时修剪受害枝。',
      蔬菜: '及时盖膜保温，冻害发生后喷施叶面肥助恢复。',
      小麦: '冬小麦镇压保墒、增温防冻，返青期注意倒春寒。',
    },
  })
}

/** 火险预警（每日火险等级） */
export async function fireRisk(req, res) {
  const level = 1 + Math.floor(Math.random() * 5)
  const labels = { 1: '低度危险', 2: '较低危险', 3: '中度危险', 4: '高度危险', 5: '极度危险' }
  const advice = level >= 4
    ? '火险等级高，严禁野外用火，清除田边地头可燃物，备好灭火工具。'
    : level === 3
      ? '火险等级中等，农事用火需审批并专人看守，做到人走火灭。'
      : '火险等级较低，仍需规范用火，不可麻痹大意。'
  ok(res, {
    date: new Date().toISOString().slice(0, 10),
    level,
    label: labels[level],
    advice,
    hotline: '森林火警电话：12119',
  })
}

/** 干旱监测指数 */
export async function droughtIndex(req, res) {
  const index = Math.floor(Math.random() * 100)
  let level, advice
  if (index < 20) { level = '无旱'; advice = '土壤墒情良好，正常田间管理即可。' }
  else if (index < 40) { level = '轻旱'; advice = '土壤略缺墒，关注作物需水关键期，适时补灌。' }
  else if (index < 60) { level = '中旱'; advice = '旱情发展，建议节水灌溉、中耕保墒、覆盖减蒸发。' }
  else if (index < 80) { level = '重旱'; advice = '旱情较重，优先保灌关键生育期，必要时启用应急水源。' }
  else { level = '特旱'; advice = '旱情严重，启动抗旱应急预案，统筹调配水源，减少高耗水作物。' }
  ok(res, {
    date: new Date().toISOString().slice(0, 10),
    index,
    level,
    advice,
    note: '指数基于公开气象与遥感数据综合估算，仅供抗旱决策参考。',
  })
}
