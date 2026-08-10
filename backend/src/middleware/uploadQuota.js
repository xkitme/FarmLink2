import cache from '../utils/cache.js'
import { clientIp } from '../utils/client-ip.js'
import { errors } from '../utils/response.js'

const DEFAULT_WINDOW_SEC = 3600
const DEFAULT_LIMIT = 30

/**
 * 上传配额中间件工厂。
 * @param {number} [limit=30] - 时间窗口内最大上传次数
 * @param {number} [windowSec=3600] - 时间窗口（秒）
 */
export function uploadQuota(limit = DEFAULT_LIMIT, windowSec = DEFAULT_WINDOW_SEC) {
  return (req, res, next) => {
    const actor = req.user?.id
      ? `user:${req.user.id}`
      : `ip:${clientIp(req)}`

    const bucket = Math.floor(Date.now() / (windowSec * 1000))
    const key = `upload-quota:${actor}:${bucket}`
    const current = (cache.get(key) || 0) + 1
    cache.set(key, current, windowSec)

    res.setHeader('X-Upload-Quota-Limit', limit)
    res.setHeader('X-Upload-Quota-Remaining', Math.max(0, limit - current))
    res.setHeader('X-Upload-Quota-Reset', (bucket + 1) * windowSec * 1000)

    if (current > limit) {
      return next(errors.rateLimit('上传次数已达上限，请稍后再试'))
    }

    next()
  }
}
