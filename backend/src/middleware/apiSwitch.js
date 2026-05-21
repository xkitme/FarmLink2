import { checkRequest } from '../config/apiSwitches.js'

export function apiSwitchMiddleware(req, res, next) {
  // 跳过管理接口和健康检查
  if (req.path.startsWith('/admin') || req.path === '/health') return next()

  const { blocked, feature } = checkRequest(req.method, req.path)
  if (blocked) {
    return res.status(503).json({
      code: 503,
      message: `「${feature.name}」功能当前已关闭，请联系管理员`,
      data: null,
    })
  }
  next()
}
