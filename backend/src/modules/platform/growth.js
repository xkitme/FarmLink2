// 成长值等级体系 —— 后端单一事实来源
//
// 成长值（growth）是累计、只增不减的整数；积分（points）可消费、会减少，两者分离。
// 用户每完成一次有价值的行为（农事建档、学习、公益、识图等）即可累加成长值，
// 跨过阈值即升级。前端 hero / 个人资料页与管理台共用本表，保证等级口径一致。

/** 等级阶梯（农作物成长隐喻，min 为进入该级所需成长值） */
export const GROWTH_LEVELS = [
  { name: '新芽', min: 0 },
  { name: '幼苗', min: 100 },
  { name: '拔节', min: 300 },
  { name: '抽穗', min: 600 },
  { name: '金穗', min: 1000 },
  { name: '丰仓', min: 2000 },
]

/**
 * 由成长值推算等级信息。
 * @param {number} growthRaw 成长值
 * @returns {{
 *   growth:number, level:number, levelName:string, nextLevelName:(string|null),
 *   currentLevelAt:number, nextLevelAt:number, remaining:number,
 *   progress:number, isMax:boolean
 * }}
 */
export function growthInfo(growthRaw) {
  const growth = Math.max(0, Number.parseInt(growthRaw, 10) || 0)
  let idx = 0
  for (let i = 0; i < GROWTH_LEVELS.length; i++) {
    if (growth >= GROWTH_LEVELS[i].min) idx = i
  }
  const current = GROWTH_LEVELS[idx]
  const next = GROWTH_LEVELS[idx + 1] || null
  const isMax = next === null
  const currentLevelAt = current.min
  const nextLevelAt = next ? next.min : current.min
  const remaining = isMax ? 0 : nextLevelAt - growth
  const span = isMax ? 1 : nextLevelAt - currentLevelAt
  const progress = isMax
    ? 1
    : Math.min(1, Math.max(0, (growth - currentLevelAt) / span))
  return {
    growth,
    level: idx + 1,
    levelName: current.name,
    nextLevelName: next ? next.name : null,
    currentLevelAt,
    nextLevelAt,
    remaining,
    progress: Number(progress.toFixed(3)),
    isMax,
  }
}
