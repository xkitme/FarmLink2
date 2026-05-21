import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from './config/index.js'
import { registerRoutes } from './routes/index.js'
import { traceMiddleware, notFoundHandler, errorHandler } from './middleware/error.js'
import { ok } from './utils/response.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// 基础中间件
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(traceMiddleware)

// 上传文件静态访问
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')))

// 健康检查
app.get('/health', (req, res) => ok(res, { status: 'ok', env: config.isProd ? 'production' : 'development' }))

// 业务路由
registerRoutes(app, config.apiPrefix)

// 404 + 全局异常
app.use(notFoundHandler)
app.use(errorHandler)

export default app
