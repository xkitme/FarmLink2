import { Router } from 'express'
import { ok } from '../utils/response.js'

/**
 * 业务路由注册中心。
 * 各业务模块路由将在后续分段逐步挂载到此处。
 */
export function registerRoutes(app, prefix) {
  const router = Router()

  // 占位健康路由（业务路由后续分段补充）
  router.get('/ping', (req, res) => ok(res, { pong: true }))

  app.use(prefix, router)
}
