import NodeCache from 'node-cache'

/** 内存缓存（验证码、AI 限流计数等） */
const cache = new NodeCache()
export default cache

// ── 短信验证码 ──────────────────────────────
export function setSmsCode(phone, code) {
  cache.set(`sms:${phone}`, code, 300) // 5 分钟
}
export function getSmsCode(phone) {
  return cache.get(`sms:${phone}`)
}
export function delSmsCode(phone) {
  cache.del(`sms:${phone}`)
}

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
