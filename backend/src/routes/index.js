import { Router } from 'express'
import { ok } from '../utils/response.js'
import platformRoutes from '../modules/platform/platform.routes.js'

/**
 * 业务路由注册中心。
 * 各业务模块路由在此挂载到统一前缀下。
 */
export function registerRoutes(app, prefix) {
  const router = Router()

  // 健康探针
  router.get('/ping', (req, res) => ok(res, { pong: true }))

  // 板块八 platform：用户/认证/通知/反馈/搜索
  router.use(platformRoutes)

  app.use(prefix, router)
}
