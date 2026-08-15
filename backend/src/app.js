import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from './config/index.js'
import { registerRoutes } from './routes/index.js'
import v2Routes, { V2_ROUTE_DEFS } from './routes/v2/index.js'
import { validateRegistry } from './contracts/registry.js'
import { traceMiddleware, notFoundHandler, errorHandler } from './middleware/error.js'
import { optionalAuth } from './middleware/auth.js'
import { apiSwitchMiddleware, operationLogMiddleware, rateLimitMiddleware } from './middleware/apiControl.js'
import { originGuard, isOriginAllowed } from './middleware/originGuard.js'
import { csrfGuard } from './middleware/csrf.js'
import { ok } from './utils/response.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// 能力注册表启动校验（D6）：结构错误全环境 fail-fast；
// v1 覆盖缺口 dev/test fail-fast、demo/release 告警；v2 未登记即挂载全环境 fail-fast。
const registryAudit = validateRegistry({
  environment: config.runtime.environment,
  v2Routes: V2_ROUTE_DEFS,
})
if (registryAudit.warnings.length > 0) {
  for (const warning of registryAudit.warnings) console.warn(`⚠ ${warning}`)
}
console.log(`✓ 能力注册表校验通过：v1 ${registryAudit.v1RegisteredCount}/${registryAudit.v1TotalRoutes} 已登记；v2 ${registryAudit.v2RegisteredCount}/${registryAudit.v2TotalRoutes} 已登记；capabilities 共 ${registryAudit.capabilityCount}（${config.runtime.environment}）`)

// 代理信任：必须在任何中间件之前设置
app.set('trust proxy', config.trustProxy)

// 基础中间件
app.use(cors({
  origin: (origin, callback) => {
    const allowed = isOriginAllowed(origin)
    callback(null, allowed || false)
  },
  credentials: config.cors.credentials,
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(traceMiddleware)
app.use(optionalAuth)
app.use(rateLimitMiddleware)
app.use(apiSwitchMiddleware)
app.use(operationLogMiddleware)
app.use(originGuard)
app.use(csrfGuard)

// 上传文件静态访问
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')))

// 管理面板生产构建产物（开发时由 Vite 独立服务承载）
const adminDist = path.resolve(__dirname, '../admin/dist')
app.use('/admin', express.static(adminDist))

// 健康检查
app.get('/health', (req, res) => ok(res, { status: 'ok', env: config.isProd ? 'production' : 'development' }))

// 业务路由
registerRoutes(app, config.apiPrefix)

// API v2 骨架（116f-B）：与 v1 同一位置注册，复用同一条安全链（D9 端点见 routes/v2）
app.use(config.apiPrefixV2, v2Routes)

app.get('/admin/*', (req, res, next) => {
  res.sendFile(path.join(adminDist, 'index.html'), (err) => {
    if (err) next()
  })
})

// 404 + 全局异常
app.use(notFoundHandler)
app.use(errorHandler)

export default app
