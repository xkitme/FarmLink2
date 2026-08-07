import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from './config/index.js'
import { registerRoutes } from './routes/index.js'
import { traceMiddleware, notFoundHandler, errorHandler } from './middleware/error.js'
import { optionalAuth } from './middleware/auth.js'
import { apiSwitchMiddleware, operationLogMiddleware, rateLimitMiddleware } from './middleware/apiControl.js'
import { originGuard, isOriginAllowed } from './middleware/originGuard.js'
import { csrfGuard } from './middleware/csrf.js'
import { ok } from './utils/response.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

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

app.get('/admin/*', (req, res, next) => {
  res.sendFile(path.join(adminDist, 'index.html'), (err) => {
    if (err) next()
  })
})

// 404 + 全局异常
app.use(notFoundHandler)
app.use(errorHandler)

export default app
