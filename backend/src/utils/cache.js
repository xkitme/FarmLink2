import NodeCache from 'node-cache'

// 全局内存缓存，替代 Redis
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 })

export const get = (key) => cache.get(key)

export const set = (key, value, ttl) =>
  ttl ? cache.set(key, value, ttl) : cache.set(key, value)

export const del = (key) => cache.del(key)

export const flush = () => cache.flushAll()

// AI 调用计数（按用户+日期）
export const getAiCount = (userId) => {
  const today = new Date().toISOString().slice(0, 10)
  return cache.get(`ai:${userId}:${today}`) || 0
}

export const incrAiCount = (userId) => {
  const today = new Date().toISOString().slice(0, 10)
  const key = `ai:${userId}:${today}`
  const count = (cache.get(key) || 0) + 1
  // 次日 0 点过期
  const now = new Date()
  const midnight = new Date(now)
  midnight.setDate(midnight.getDate() + 1)
  midnight.setHours(0, 0, 0, 0)
  const ttl = Math.floor((midnight - now) / 1000)
  cache.set(key, count, ttl)
  return count
}
