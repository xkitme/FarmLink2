import { Router } from 'express'
import { ok } from '../utils/response.js'
import platformRoutes from '../modules/platform/platform.routes.js'
import agriRoutes from '../modules/agri/agri.routes.js'
import marketRoutes from '../modules/market/market.routes.js'

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
  // 板块一 agri：农业生产
  router.use(agriRoutes)
  // 板块二 market：流通销售
  router.use(marketRoutes)

  app.use(prefix, router)
}
