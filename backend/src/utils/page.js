/**
 * 解析分页参数。
 * 约定：pageNum 从 1 开始，pageSize 默认 10、上限 100。
 */
export function pageParams(query) {
  const pageNum = Math.max(1, parseInt(query.pageNum) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 10))
  return { pageNum, pageSize, skip: (pageNum - 1) * pageSize, take: pageSize }
}

/** 解析 JSON 字符串字段，失败返回 fallback */
export function parseJson(str, fallback = null) {
  if (str == null) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}
