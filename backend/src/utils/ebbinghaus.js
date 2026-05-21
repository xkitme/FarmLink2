// 艾宾浩斯遗忘曲线复习间隔（天）
const INTERVALS = [1, 2, 4, 7, 15, 30]

/**
 * 根据掌握程度和得分计算下次复习时间
 * @param {number} masteryLevel 0-5
 * @param {number} score 0-100
 */
export const nextReviewAt = (masteryLevel, score) => {
  const level = Math.min(masteryLevel, INTERVALS.length - 1)
  let days = INTERVALS[level]

  if (score >= 90) days = Math.round(days * 1.5)
  else if (score < 60) days = Math.max(1, Math.round(days / 2))

  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

/**
 * 根据得分更新掌握程度
 * @param {number} current 当前掌握程度
 * @param {number} score
 */
export const updateMastery = (current, score) => {
  if (score >= 90) return Math.min(current + 1, 5)
  if (score < 60) return Math.max(current - 1, 0)
  return current
}
