import { randomUUID } from 'crypto'
import { CODES } from '../config/index.js'

/** 生成短 traceId */
export function traceId() {
  return randomUUID().replace(/-/g, '').slice(0, 16)
}

/** 统一响应体 */
function envelope(code, msg, data, req) {
  return {
    code,
    msg,
    data: data ?? null,
    timestamp: Date.now(),
    traceId: req?.traceId || traceId(),
  }
}

/** 成功 */
export function ok(res, data, msg = 'success') {
  res.json(envelope(CODES.OK, msg, data, res.req))
}

/** 分页成功：data = { records, total, pageNum, pageSize, pages } */
export function okPage(res, { records, total, pageNum, pageSize }) {
  const pages = pageSize > 0 ? Math.ceil(total / pageSize) : 0
  res.json(envelope(CODES.OK, 'success', { records, total, pageNum, pageSize, pages }, res.req))
}

/** 失败（自定义业务码） */
export function fail(res, code = CODES.SERVER_ERROR, msg = 'error', httpStatus) {
  const status = httpStatus ?? mapHttpStatus(code)
  res.status(status).json(envelope(code, msg, null, res.req))
}

/** 业务码 → HTTP 状态码 */
function mapHttpStatus(code) {
  if (code === CODES.OK) return 200
  if (code === CODES.PARAM_ERROR) return 400
  if (code === CODES.UNAUTHORIZED) return 401
  if (code === CODES.FORBIDDEN) return 403
  if (code === CODES.NOT_FOUND) return 404
  if (code === CODES.RATE_LIMIT) return 429
  if (code === CODES.AI_BUSY || code === CODES.OFFLINE) return 503
  return 500
}

/** 业务异常类 */
export class BusinessError extends Error {
  constructor(code, msg) {
    super(msg)
    this.code = code
    this.name = 'BusinessError'
  }
}

/** 快捷抛错 */
export const errors = {
  param: (msg = '参数校验失败') => new BusinessError(CODES.PARAM_ERROR, msg),
  unauthorized: (msg = '未登录或登录已失效') => new BusinessError(CODES.UNAUTHORIZED, msg),
  forbidden: (msg = '权限不足') => new BusinessError(CODES.FORBIDDEN, msg),
  notFound: (msg = '资源不存在') => new BusinessError(CODES.NOT_FOUND, msg),
  rateLimit: (msg = '请求过于频繁') => new BusinessError(CODES.RATE_LIMIT, msg),
  aiBusy: (msg = 'AI 服务繁忙') => new BusinessError(CODES.AI_BUSY, msg),
}
