import { fail, traceId, BusinessError } from '../utils/response.js'
import { CODES } from '../config/index.js'

/** 为每个请求挂载 traceId */
export function traceMiddleware(req, res, next) {
  req.traceId = traceId()
  res.setHeader('X-Trace-Id', req.traceId)
  next()
}

/** 404 处理 */
export function notFoundHandler(req, res) {
  fail(res, CODES.NOT_FOUND, `接口不存在: ${req.method} ${req.path}`)
}

/** 全局异常处理 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err)

  if (err instanceof BusinessError) {
    return fail(res, err.code, err.message)
  }

  // express-validator / 参数错误
  if (err.type === 'entity.parse.failed') {
    return fail(res, CODES.PARAM_ERROR, '请求体 JSON 格式错误')
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return fail(res, CODES.PARAM_ERROR, '上传文件过大')
  }

  console.error(`[ERROR][${req.traceId}]`, err)
  fail(res, CODES.SERVER_ERROR, '服务器内部错误')
}

/** 异步控制器包装，自动 catch 到 errorHandler */
export function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}
