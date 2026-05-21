import NodeCache from 'node-cache'

/** 内存缓存（AI 限流计数等） */
const cache = new NodeCache()
export default cache

// ── AI 调用计数（按用户按小时） ───────────────
export function incrAiCall(userId) {
  const hour = new Date().toISOString().slice(0, 13)
  const key = `ai:${userId}:${hour}`
  const cur = (cache.get(key) || 0) + 1
  cache.set(key, cur, 3600)
  return cur
}
export function getAiCall(userId) {
  const hour = new Date().toISOString().slice(0, 13)
  return cache.get(`ai:${userId}:${hour}`) || 0
}
